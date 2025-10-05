# MVS 3.0 개발용 데이터베이스 설정 스크립트

Write-Host "🗄️  MVS 3.0 개발용 데이터베이스 설정" -ForegroundColor Green
Write-Host "=====================================" -ForegroundColor Green

# PostgreSQL과 Redis만 도커로 실행
Write-Host "🐳 데이터베이스 서비스 시작 중..." -ForegroundColor Blue
docker-compose -f docker-compose.dev.yml up -d

Write-Host "⏳ 데이터베이스 준비 대기 중..." -ForegroundColor Yellow
Start-Sleep -Seconds 10

# 데이터베이스 연결 확인
Write-Host "🔍 데이터베이스 연결 확인 중..." -ForegroundColor Blue

# PostgreSQL 연결 테스트
$pgTest = docker exec mvs-3.0-postgres-dev pg_isready -U mvs_user -d mvs_db
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ PostgreSQL 연결 성공" -ForegroundColor Green
} else {
    Write-Host "❌ PostgreSQL 연결 실패" -ForegroundColor Red
}

# Redis 연결 테스트
$redisTest = docker exec mvs-3.0-redis-dev redis-cli ping
if ($redisTest -eq "PONG") {
    Write-Host "✅ Redis 연결 성공" -ForegroundColor Green
} else {
    Write-Host "❌ Redis 연결 실패" -ForegroundColor Red
}

Write-Host ""
Write-Host "📋 개발 환경 정보:" -ForegroundColor Cyan
Write-Host "- PostgreSQL: localhost:5432" -ForegroundColor White
Write-Host "- Redis: localhost:6379" -ForegroundColor White
Write-Host ""
Write-Host "🚀 이제 개발 서버를 시작할 수 있습니다:" -ForegroundColor Green
Write-Host "   .\dev-start.ps1" -ForegroundColor White
Write-Host ""
Write-Host "🛑 데이터베이스 서비스 중지:" -ForegroundColor Yellow
Write-Host "   docker-compose -f docker-compose.dev.yml down" -ForegroundColor White
