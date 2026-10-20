$ErrorActionPreference = 'Stop'

$ProjectUrl = 'https://ujmjeizvektvctfrlgia.supabase.co'
$SecureKey = Read-Host 'Cole a chave service_role do Supabase (entrada oculta)' -AsSecureString
$KeyPointer = [Runtime.InteropServices.Marshal]::SecureStringToBSTR($SecureKey)

try {
    $env:SUPABASE_URL = $ProjectUrl
    $env:SUPABASE_SERVICE_ROLE_KEY = [Runtime.InteropServices.Marshal]::PtrToStringBSTR($KeyPointer)
    npm run seed:catalog
    if ($LASTEXITCODE -ne 0) {
        throw 'A carga do catálogo falhou. Confira a mensagem acima e tente novamente.'
    }
}
finally {
    Remove-Item Env:SUPABASE_URL -ErrorAction SilentlyContinue
    Remove-Item Env:SUPABASE_SERVICE_ROLE_KEY -ErrorAction SilentlyContinue
    [Runtime.InteropServices.Marshal]::ZeroFreeBSTR($KeyPointer)
}
