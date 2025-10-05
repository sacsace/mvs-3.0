# MVS 3.0 Docker 전체 서버 시작 스크립트
# 모든 서비스를 Docker로 실행 (프로덕션 환경과 동일)

# UTF-8 인코딩 설정
chcp 65001
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🐳 MVS 3.0 Docker 서버 시작 중..." -ForegroundColor Green
Write-Host ""

# 프로젝트 경로 설정
$projectPath = "D:\Software Project\MVS 3.0"

# 기존 컨테이너 정리
Write-Host "🧹 기존 컨테이너 정리 중..." -ForegroundColor Yellow
docker-compose down

# Docker 이미지 빌드 및 시작
Write-Host "🔨 Docker 이미지 빌드 중..." -ForegroundColor Cyan
Write-Host "   이 과정은 처음 실행 시 몇 분 소요될 수 있습니다..." -ForegroundColor Gray
Write-Host ""

docker-compose build --no-cache

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Docker 빌드 실패!" -ForegroundColor Red
    Write-Host "   오류를 확인하고 다시 시도해주세요." -ForegroundColor Gray
    exit 1
}

Write-Host "✅ Docker 이미지 빌드 완료" -ForegroundColor Green
Write-Host ""

# 컨테이너 시작
Write-Host "🚀 컨테이너 시작 중..." -ForegroundColor Blue
docker-compose up -d

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ 컨테이너 시작 실패!" -ForegroundColor Red
    exit 1
}

# 컨테이너 상태 확인
Write-Host ""
Write-Host "📊 컨테이너 상태 확인 중..." -ForegroundColor Cyan
Start-Sleep 5

docker-compose ps

Write-Host ""
Write-Host "🎉 Docker 서버 시작 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 서버 정보:" -ForegroundColor Cyan
Write-Host "   🌐 웹 애플리케이션: http://localhost" -ForegroundColor White
Write-Host "   🔧 백엔드 API: http://localhost:5000" -ForegroundColor White
Write-Host "   🗄️  데이터베이스: PostgreSQL (Docker)" -ForegroundColor White
Write-Host "   📊 Redis: Redis (Docker)" -ForegroundColor White
Write-Host "   🔒 Nginx: 리버스 프록시" -ForegroundColor White
Write-Host ""
Write-Host "💡 관리 명령어:" -ForegroundColor Yellow
Write-Host "   - 로그 확인: docker-compose logs -f" -ForegroundColor Gray
Write-Host "   - 서버 중지: docker-compose down" -ForegroundColor Gray
Write-Host "   - 서버 재시작: docker-compose restart" -ForegroundColor Gray
Write-Host "   - 컨테이너 상태: docker-compose ps" -ForegroundColor Gray
Write-Host ""

# 잠시 대기 후 브라우저 열기
Start-Sleep 3
Write-Host "🌐 브라우저에서 애플리케이션을 열고 있습니다..." -ForegroundColor Green
Start-Process "http://localhost"
