$ErrorActionPreference = 'Stop'
Set-Location -LiteralPath $PSScriptRoot

if (-not (Get-Command npm -ErrorAction SilentlyContinue)) {
    throw 'Node.js e npm não foram encontrados. Instale Node.js 22 ou mais recente e execute este script novamente.'
}

if (-not (Test-Path -LiteralPath '.env')) {
    Copy-Item -LiteralPath '.env.example' -Destination '.env'
}

Write-Host 'Instalando dependências do projeto sem solicitar chaves administrativas...'
npm ci
if ($LASTEXITCODE -ne 0) { throw 'A instalação das dependências falhou.' }

Write-Host 'O catálogo e as imagens já estão sincronizados com o Supabase.'

Write-Host 'Abrindo a loja local em http://127.0.0.1:5180'
npm run dev -- --host 127.0.0.1 --port 5180
