# MVS 3.0 개발 서버 시작 스크립트
# 데이터베이스는 Docker로, 애플리케이션은 로컬에서 실행

# UTF-8 인코딩 설정
chcp 65001
[Console]::OutputEncoding = [System.Text.Encoding]::UTF8

Write-Host "🚀 MVS 3.0 개발 서버 시작 중..." -ForegroundColor Green
Write-Host ""

# 프로젝트 경로 설정
$projectPath = "D:\Software Project\MVS 3.0"
$backendPath = "$projectPath\msv-server"
$frontendPath = "$projectPath\msv-frontend"

# 포트 확인 및 프로세스 종료
function Kill-ProcessOnPort {
    param ([int]$Port)
    Write-Host "🔍 포트 $Port 확인 중..." -ForegroundColor Yellow
    $process = (netstat -ano | Select-String ":$Port").Split(' ')[-1] | Select-Object -First 1
    if ($process) {
        Write-Host "⚠️  포트 $Port 에서 실행 중인 프로세스 발견 (PID: $process)" -ForegroundColor Red
        try {
            Stop-Process -Id $process -Force -ErrorAction Stop
            Write-Host "✅ 프로세스 종료 완료" -ForegroundColor Green
        } catch {
            Write-Host "❌ 프로세스 종료 실패: $($_.Exception.Message)" -ForegroundColor Red
        }
    } else {
        Write-Host "✅ 포트 $Port 사용 가능" -ForegroundColor Green
    }
}

# Docker 컨테이너 상태 확인
Write-Host "🐳 Docker 컨테이너 상태 확인 중..." -ForegroundColor Cyan
$postgresStatus = docker ps --filter "name=mvs-3.0-postgres" --format "table {{.Status}}" | Select-String "Up"
$redisStatus = docker ps --filter "name=mvs-3.0-redis" --format "table {{.Status}}" | Select-String "Up"

if (-not $postgresStatus) {
    Write-Host "⚠️  PostgreSQL 컨테이너가 실행되지 않음. 시작 중..." -ForegroundColor Yellow
    docker-compose up postgres redis -d
    Start-Sleep 5
}

if (-not $redisStatus) {
    Write-Host "⚠️  Redis 컨테이너가 실행되지 않음. 시작 중..." -ForegroundColor Yellow
    docker-compose up redis -d
    Start-Sleep 3
}

Write-Host "✅ 데이터베이스 컨테이너 준비 완료" -ForegroundColor Green
Write-Host ""

# 포트 정리
Write-Host "🧹 포트 정리 중..." -ForegroundColor Cyan
Kill-ProcessOnPort 5000  # 백엔드 포트
Kill-ProcessOnPort 3000  # 프론트엔드 포트
Write-Host ""

# 백엔드 서버 시작
Write-Host "🔧 백엔드 서버 시작 중..." -ForegroundColor Blue
Write-Host "   경로: $backendPath" -ForegroundColor Gray
Write-Host "   포트: http://localhost:5000" -ForegroundColor Gray
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$backendPath'; Write-Host '🔧 MVS 3.0 Backend Server' -ForegroundColor Blue; Write-Host '포트: http://localhost:5000' -ForegroundColor Gray; Write-Host '데이터베이스: PostgreSQL (Docker)' -ForegroundColor Gray; Write-Host ''; npm run dev`""

# 잠시 대기
Start-Sleep 3

# 프론트엔드 서버 시작
Write-Host "🎨 프론트엔드 서버 시작 중..." -ForegroundColor Magenta
Write-Host "   경로: $frontendPath" -ForegroundColor Gray
Write-Host "   포트: http://localhost:3000" -ForegroundColor Gray
Write-Host ""

Start-Process powershell -ArgumentList "-NoExit -Command `"cd '$frontendPath'; Write-Host '🎨 MVS 3.0 Frontend Server' -ForegroundColor Magenta; Write-Host '포트: http://localhost:3000' -ForegroundColor Gray; Write-Host '브라우저에서 자동으로 열립니다' -ForegroundColor Gray; Write-Host ''; npm start`""

Write-Host ""
Write-Host "🎉 개발 서버 시작 완료!" -ForegroundColor Green
Write-Host ""
Write-Host "📋 서버 정보:" -ForegroundColor Cyan
Write-Host "   🌐 프론트엔드: http://localhost:3000" -ForegroundColor White
Write-Host "   🔧 백엔드 API: http://localhost:5000" -ForegroundColor White
Write-Host "   🗄️  데이터베이스: PostgreSQL (Docker)" -ForegroundColor White
Write-Host "   📊 Redis: Redis (Docker)" -ForegroundColor White
Write-Host ""
Write-Host "💡 팁:" -ForegroundColor Yellow
Write-Host "   - 코드 수정 시 자동으로 서버가 재시작됩니다" -ForegroundColor Gray
Write-Host "   - 브라우저에서 http://localhost:3000 을 열어주세요" -ForegroundColor Gray
Write-Host "   - 서버를 종료하려면 각 터미널에서 Ctrl+C를 누르세요" -ForegroundColor Gray
Write-Host ""
Write-Host "서버 로그를 확인하려면 새로 열린 터미널 창들을 확인하세요." -ForegroundColor Cyan

# 잠시 대기 후 브라우저 열기
Start-Sleep 5
Write-Host "🌐 브라우저에서 애플리케이션을 열고 있습니다..." -ForegroundColor Green
Start-Process "http://localhost:3000"
