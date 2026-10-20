$ErrorActionPreference = 'Stop'
$ProjectPath = Split-Path -Parent $MyInvocation.MyCommand.Path
$MigrationPath = Join-Path $ProjectPath 'supabase\migrations'

$renames = @(
    @{ Old = '20261020120000_secure_order_stock_direct_writes.sql'; New = '20261020122753_secure_order_stock_direct_writes.sql' },
    @{ Old = '20261020120100_claim_asaas_webhook_events.sql'; New = '20261020122814_claim_asaas_webhook_events.sql' },
    @{ Old = '20261020130000_coupon_percentage_limit.sql'; New = '20261020122840_coupon_percentage_limit.sql' }
)

foreach ($item in $renames) {
    $oldPath = Join-Path $MigrationPath $item.Old
    $newPath = Join-Path $MigrationPath $item.New
    if (-not (Test-Path -LiteralPath $newPath)) {
        throw "Migration remota sincronizada nao encontrada: $($item.New)"
    }
    if (Test-Path -LiteralPath $oldPath) {
        $oldHash = (Get-FileHash -LiteralPath $oldPath -Algorithm SHA256).Hash
        $newHash = (Get-FileHash -LiteralPath $newPath -Algorithm SHA256).Hash
        if ($oldHash -ne $newHash) {
            throw "Conteudo divergente em $($item.Old). Nenhum arquivo antigo foi removido."
        }
        Remove-Item -LiteralPath $oldPath -Force
    }
}

Write-Host 'Migrations locais alinhadas com as versoes registradas no Supabase.' -ForegroundColor Green
Write-Host 'Confira os tres arquivos em supabase\migrations antes de versionar.'
