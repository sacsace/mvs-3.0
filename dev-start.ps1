# MVS 3.0 개발 환경 시작 스크립트
# 이 스크립트는 도커 없이 로컬에서 개발 서버를 실행합니다

Write-Host "MVS 3.0 개발 환경 시작" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# 환경 변수 파일 확인
if (-not (Test-Path "msv-server/.env")) {
    Write-Host "⚠️  msv-server/.env 파일이 없습니다. env.development를 복사합니다..." -ForegroundColor Yellow
    Copy-Item "msv-server/env.development" "msv-server/.env"
}

# 백엔드 의존성 설치 확인
Write-Host "📦 백엔드 의존성 확인 중..." -ForegroundColor Blue
Set-Location "msv-server"
if (-not (Test-Path "node_modules")) {
    Write-Host "백엔드 의존성 설치 중..." -ForegroundColor Yellow
    npm install
}
Set-Location ".."

# 프론트엔드 의존성 설치 확인
Write-Host "📦 프론트엔드 의존성 확인 중..." -ForegroundColor Blue
Set-Location "msv-frontend"
if (-not (Test-Path "node_modules")) {
    Write-Host "프론트엔드 의존성 설치 중..." -ForegroundColor Yellow
    npm install
}
Set-Location ".."

Write-Host "의존성 설치 완료" -ForegroundColor Green
Write-Host ""
Write-Host "개발 서버 시작 방법:" -ForegroundColor Cyan
Write-Host "1. 백엔드 서버: cd msv-server && npm run dev" -ForegroundColor White
Write-Host "2. 프론트엔드 서버: cd msv-frontend && npm start" -ForegroundColor White
Write-Host ""
Write-Host "📋 필요한 서비스:" -ForegroundColor Cyan
Write-Host "- PostgreSQL (포트 5432)" -ForegroundColor White
Write-Host "- Redis (포트 6379)" -ForegroundColor White
Write-Host ""
Write-Host "🌐 접속 URL:" -ForegroundColor Cyan
Write-Host "- 프론트엔드: http://localhost:3000" -ForegroundColor White
Write-Host "- 백엔드 API: http://localhost:5000" -ForegroundColor White
Write-Host ""

# 사용자에게 선택권 제공
$choice = Read-Host "지금 바로 개발 서버를 시작하시겠습니까? (y/n)"
if ($choice -eq "y" -or $choice -eq "Y") {
    Write-Host "개발 서버 시작 중..." -ForegroundColor Green
    
    # 백엔드 서버 시작 (백그라운드)
    Write-Host "백엔드 서버 시작 중..." -ForegroundColor Blue
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd msv-server; npm run dev"
    
    # 잠시 대기
    Start-Sleep -Seconds 3
    
    # 프론트엔드 서버 시작 (백그라운드)
    Write-Host "프론트엔드 서버 시작 중..." -ForegroundColor Blue
    Start-Process powershell -ArgumentList "-NoExit", "-Command", "cd msv-frontend; npm start"
    
    Write-Host "개발 서버가 시작되었습니다!" -ForegroundColor Green
    Write-Host "프론트엔드: http://localhost:3000" -ForegroundColor Cyan
    Write-Host "백엔드 API: http://localhost:5000" -ForegroundColor Cyan
} else {
    Write-Host "수동으로 서버를 시작하려면 위의 명령어를 사용하세요." -ForegroundColor Yellow
}
