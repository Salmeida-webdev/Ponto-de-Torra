$ErrorActionPreference = 'Stop'
$origem = $PSScriptRoot
$repositorio = Join-Path $env:USERPROFILE 'Downloads\Ponto-de-Torra-repo'
$urlEsperada = 'https://github.com/Salmeida-webdev/Ponto-de-Torra.git'

function Invoke-Git {
    param([string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falha no Git: git $($Arguments -join ' ')" }
}

if (-not (Test-Path (Join-Path $origem 'package.json'))) {
    throw "O ZIP não contém o projeto na raiz esperada: $origem"
}
if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git não encontrado. Instale o Git for Windows e execute este script novamente.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Node.js/npm não encontrado. Instale Node.js 22 ou superior e execute novamente.'
}

# Usa apenas as duas configurações públicas do exemplo local para validar o build.
# As chaves privadas continuam nos secrets do Supabase e nunca entram neste ZIP.
$envExample = Join-Path $origem '.env.example'
if (-not (Test-Path $envExample)) { throw 'O arquivo .env.example está ausente.' }
$publicSettings = @{}
foreach ($line in Get-Content -LiteralPath $envExample) {
    if ($line -match '^(PUBLIC_[A-Z0-9_]+)=(.*)$') { $publicSettings[$Matches[1]] = $Matches[2] }
}
foreach ($name in @('PUBLIC_SUPABASE_URL', 'PUBLIC_SUPABASE_PUBLISHABLE_KEY')) {
    if (-not $publicSettings.ContainsKey($name) -or [string]::IsNullOrWhiteSpace($publicSettings[$name])) {
        throw "A configuração $name está ausente de .env.example."
    }
}
$oldUrl = $env:PUBLIC_SUPABASE_URL
$oldKey = $env:PUBLIC_SUPABASE_PUBLISHABLE_KEY
$env:PUBLIC_SUPABASE_URL = $publicSettings['PUBLIC_SUPABASE_URL']
$env:PUBLIC_SUPABASE_PUBLISHABLE_KEY = $publicSettings['PUBLIC_SUPABASE_PUBLISHABLE_KEY']

Write-Host 'Instalando dependências e validando o projeto antes do envio...'
Push-Location $origem
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou.' }
    npm run check
    if ($LASTEXITCODE -ne 0) { throw 'A validação falhou; nada será enviado ao GitHub.' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'O build falhou; nada será enviado ao GitHub.' }
    npm audit --audit-level=high
    if ($LASTEXITCODE -ne 0) { throw 'A auditoria de dependências falhou; nada será enviado ao GitHub.' }
} finally {
    Pop-Location
    $env:PUBLIC_SUPABASE_URL = $oldUrl
    $env:PUBLIC_SUPABASE_PUBLISHABLE_KEY = $oldKey
}

if (-not (Test-Path (Join-Path $repositorio '.git'))) {
    if (Test-Path $repositorio) {
        $itens = @(Get-ChildItem -LiteralPath $repositorio -Force)
        if ($itens.Count -gt 0) { throw "A pasta $repositorio existe e não é um clone Git. Renomeie-a antes de continuar." }
    }
    Write-Host 'Clonando o repositório oficial...'
    Invoke-Git @('clone', $urlEsperada, $repositorio)
}

$remoto = (& git -C $repositorio remote get-url origin).Trim()
if ($LASTEXITCODE -ne 0 -or $remoto -notmatch 'github\.com[:/]Salmeida-webdev/Ponto-de-Torra(?:\.git)?$') {
    throw "O clone em $repositorio não aponta para Salmeida-webdev/Ponto-de-Torra. Nenhuma alteração foi enviada."
}

$branch = (& git -C $repositorio branch --show-current).Trim()
if ($branch -ne 'main') { Invoke-Git @('-C', $repositorio, 'checkout', 'main') }
$pendencias = @(& git -C $repositorio status --porcelain)
if ($LASTEXITCODE -ne 0) { throw 'Não foi possível conferir o estado local do repositório.' }
if ($pendencias.Count -gt 0) { throw "O clone contém alterações locais. Revise-as em $repositorio antes de sincronizar." }
Invoke-Git @('-C', $repositorio, 'pull', '--ff-only', 'origin', 'main')

Write-Host 'Copiando a versão validada para o clone limpo...'
Get-ChildItem -LiteralPath $origem -Force |
    Where-Object {
        $_.Name -notin @('.git', '.netlify', 'node_modules', '.svelte-kit', 'build', 'dist', 'coverage') -and
        ($_.Name -notlike '.env*' -or $_.Name -eq '.env.example')
    } |
    ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $repositorio -Recurse -Force }

Invoke-Git @('-C', $repositorio, 'add', '-A')
& git -C $repositorio diff --cached --check
if ($LASTEXITCODE -ne 0) { throw 'Há erros de formatação nas alterações preparadas. Nada foi enviado.' }
& git -C $repositorio diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host 'O repositório já está atualizado; não há commit novo para enviar.'
    exit 0
}
if ($LASTEXITCODE -ne 1) { throw 'Não foi possível conferir as alterações preparadas.' }
Invoke-Git @('-C', $repositorio, 'commit', '-m', 'Corrige catálogo Supabase e valida loja antes do deploy final')
Invoke-Git @('-C', $repositorio, 'push', 'origin', 'main')
Write-Host ''
Write-Host 'Código enviado para Salmeida-webdev/Ponto-de-Torra na branch main.'
Write-Host 'O Netlify iniciará um único deploy automático se estiver conectado a esse repositório e branch.'
Write-Host 'Acompanhe o deploy no Netlify; não execute novamente enquanto ele estiver em andamento.'
