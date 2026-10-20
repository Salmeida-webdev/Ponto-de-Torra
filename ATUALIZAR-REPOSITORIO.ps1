$ErrorActionPreference = 'Stop'
$origem = $PSScriptRoot
$repositorio = Join-Path $env:USERPROFILE 'Downloads\Ponto-de-Torra-repo'
$urlEsperada = 'https://github.com/Salmeida-webdev/Ponto-de-Torra.git'

function Invoke-Git {
    param([string[]]$Arguments)
    & git @Arguments
    if ($LASTEXITCODE -ne 0) { throw "Falha no Git: git $($Arguments -join ' ')" }
}

if (-not (Get-Command git -ErrorAction SilentlyContinue)) {
    throw 'Git não encontrado. Instale o Git for Windows e execute este script novamente.'
}
if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Node.js/npm não encontrado. Instale Node.js 22 ou superior e execute novamente.'
}

Write-Host 'Instalando dependências e validando o projeto antes do envio...'
Push-Location $origem
try {
    npm ci
    if ($LASTEXITCODE -ne 0) { throw 'npm ci falhou.' }
    npm run check
    if ($LASTEXITCODE -ne 0) { throw 'A validação falhou; nada será enviado ao GitHub.' }
    npm run build
    if ($LASTEXITCODE -ne 0) { throw 'O build falhou; nada será enviado ao GitHub.' }
} finally {
    Pop-Location
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

Write-Host 'Atualizando os arquivos do repositório com a versão aprovada...'
Get-ChildItem -LiteralPath $repositorio -Force |
    Where-Object { $_.Name -ne '.git' } |
    Remove-Item -Recurse -Force
Get-ChildItem -LiteralPath $origem -Force |
    Where-Object { $_.Name -notin @('.git', '.netlify', 'node_modules', '.svelte-kit', 'build', 'dist', '.env', '.env.local') } |
    ForEach-Object { Copy-Item -LiteralPath $_.FullName -Destination $repositorio -Recurse -Force }

Invoke-Git @('-C', $repositorio, 'add', '-A')
& git -C $repositorio diff --cached --quiet
if ($LASTEXITCODE -eq 0) {
    Write-Host 'O repositório já está atualizado; não há commit novo para enviar.'
    exit 0
}
if ($LASTEXITCODE -ne 1) { throw 'Não foi possível conferir as alterações preparadas.' }
Invoke-Git @('-C', $repositorio, 'commit', '-m', 'Atualiza loja Ponto de Torra e checkout')
Invoke-Git @('-C', $repositorio, 'push', 'origin', 'main')
Write-Host ''
Write-Host 'Código enviado para Salmeida-webdev/Ponto-de-Torra na branch main.'
Write-Host 'O Netlify iniciará o deploy automaticamente se a integração do repositório estiver ativa.'
Write-Host 'Acompanhe o resultado na aba Deploys do Netlify.'
