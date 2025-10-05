# MVS 3.0 데이터베이스만 시작 스크립트
# PostgreSQL과 Redis만 Docker로 실행 (하이브리드 개발용)

# UTF-8 인코딩 설정
chcp 65001
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🗄️ MVS 3.0 데이터베이스 시작 중..." -ForegroundColor Green
Write-Host ""

# 기존 데이터베이스 컨테이너 정리
Write-Host "🧹 기존 데이터베이스 컨테이너 정리 중..." -ForegroundColor Yellow
docker-compose down postgres redis

# 데이터베이스 컨테이너 시작
Write-Host "🚀 PostgreSQL 및 Redis 컨테이너 시작 중..." -ForegroundColor Blue
docker-compose up postgres redis -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 데이터베이스 컨테이너 시작 실패!" -ForegroundColor Red
    exit 1
}

# 컨테이너 상태 확인
Write-Host ""
Write-Host "📊 데이터베이스 컨테이너 상태 확인 중..." -ForegroundColor Cyan
Start-Sleep 5

$postgresStatus = docker ps --filter "name=mvs-3.0-postgres" --format "table {{.Status}}" | Select-String "Up"
$redisStatus = docker ps --filter "name=mvs-3.0-redis" --format "table {{.Status}}" | Select-String "Up"

if ($postgresStatus) {
    Write-Host "✅ PostgreSQL 컨테이너 실행 중" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL 컨테이너 실행 실패" -ForegroundColor Red
}

if ($redisStatus) {
    Write-Host "✅ Redis 컨테이너 실행 중" -ForegroundColor Green
} else {
    Write-Host "❌ Redis 컨테이너 실행 실패" -ForegroundColor Red
}

Write-Host ""
Write-Host "🎉 데이터베이스 시작 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 데이터베이스 정보:" -ForegroundColor Cyan
Write-Host "   🗄️  PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "   📊 Redis: localhost:6379" -ForegroundColor White
Write-Host "   🏢 데이터베이스: mvs_db" -ForegroundColor White
Write-Host "   👤 사용자: mvs_user" -ForegroundColor White
Write-Host ""
Write-Host "💡 다음 단계:" -ForegroundColor Yellow
Write-Host "   - 백엔드 서버: cd msv-server && npm run dev" -ForegroundColor Gray
Write-Host "   - 프론트엔드 서버: cd msv-frontend && npm start" -ForegroundColor Gray
Write-Host "   - 또는 전체 개발 서버: .\start-dev-servers.ps1" -ForegroundColor Gray
Write-Host ""

# 데이터베이스 연결 테스트
Write-Host "🔍 데이터베이스 연결 테스트 중..." -ForegroundColor Cyan
$testResult = docker exec mvs-3.0-postgres psql -U mvs_user -d mvs_db -c "SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = 'public';" 2>$null

if ($testResult -and $testResult -match "table_count") {
    Write-Host "✅ 데이터베이스 연결 성공" -ForegroundColor Green
    Write-Host "   📊 테이블 수: $($testResult.Split()[2])" -ForegroundColor Gray
} else {
    Write-Host "⚠️  데이터베이스 연결 테스트 실패" -ForegroundColor Yellow
    Write-Host "   컨테이너가 완전히 시작될 때까지 잠시 기다려주세요." -ForegroundColor Gray
}

Write-Host ""
