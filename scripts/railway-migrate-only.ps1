# Railway 운영 DB 마이그레이션만 실행 (bootstrap API)
param(
  [string]$BackendUrl = "https://mvs-backend-production.up.railway.app",
  [string]$BootstrapKey = $env:BOOTSTRAP_DB_KEY
)

$ErrorActionPreference = "Stop"

if (-not $BootstrapKey) {
  Write-Host "BOOTSTRAP_DB_KEY 환경 변수 또는 -BootstrapKey 파라미터가 필요합니다." -ForegroundColor Red
  Write-Host "Railway 대시보드 → mvs-backend → Variables → BOOTSTRAP_DB_KEY 값을 확인하세요."
  exit 1
}

Write-Host "==> 운영 DB 마이그레이션: $BackendUrl"
$headers = @{
  "x-bootstrap-key" = $BootstrapKey
  "x-migrate-only"  = "1"
}

try {
  $r = Invoke-RestMethod -Uri "$BackendUrl/api/system/bootstrap-database" -Method POST -Headers $headers -TimeoutSec 600
  $r | ConvertTo-Json -Compress
  Write-Host "`n✅ 마이그레이션 요청 완료" -ForegroundColor Green
} catch {
  Write-Host "❌ 실패: $($_.Exception.Message)" -ForegroundColor Red
  if ($_.ErrorDetails.Message) { Write-Host $_.ErrorDetails.Message }
  exit 1
}
