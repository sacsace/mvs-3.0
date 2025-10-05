# MVS 3.0 개발 서버 시작 스크립트
# 포트 충돌 자동 해결 및 서버 시작

Write-Host "🚀 MVS 3.0 개발 서버 시작 중..." -ForegroundColor Green

# 1. 기존 프로세스 종료
Write-Host "📋 기존 프로세스 정리 중..." -ForegroundColor Yellow
Get-Process | Where-Object {$_.ProcessName -like "*node*"} | Stop-Process -Force -ErrorAction SilentlyContinue

# 2. 포트 사용 프로세스 강제 종료
Write-Host "🔌 포트 사용 프로세스 정리 중..." -ForegroundColor Yellow
$ports = @(3000, 5000, 3001)
foreach ($port in $ports) {
    $processes = netstat -ano | findstr ":$port" | ForEach-Object { 
        $parts = $_ -split '\s+'
        if ($parts.Length -gt 4) { $parts[-1] }
    }
    foreach ($pid in $processes) {
        if ($pid -match '^\d+$') {
            try {
                Stop-Process -Id $pid -Force -ErrorAction SilentlyContinue
                Write-Host "✅ 포트 $port 사용 프로세스 $pid 종료됨" -ForegroundColor Green
            } catch {
                Write-Host "⚠️ 포트 $port 프로세스 $pid 종료 실패" -ForegroundColor Red
            }
        }
    }
}

# 3. 환경 변수 설정
Write-Host "⚙️ 환경 변수 설정 중..." -ForegroundColor Yellow
$env:PORT = "5000"
$env:NODE_ENV = "development"

# 4. Docker 컨테이너 상태 확인
Write-Host "🐳 Docker 컨테이너 상태 확인 중..." -ForegroundColor Yellow
$postgresStatus = docker ps | findstr "mvs-3.0-postgres"
if (-not $postgresStatus) {
    Write-Host "❌ PostgreSQL 컨테이너가 실행되지 않았습니다. Docker Compose를 시작합니다..." -ForegroundColor Red
    docker-compose up -d postgres redis
    Start-Sleep 10
}

# 5. 백엔드 서버 시작
Write-Host "🔧 백엔드 서버 시작 중..." -ForegroundColor Cyan
Set-Location "D:\Software Project\MVS 3.0\msv-server"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm run dev" -WindowStyle Normal

# 6. 잠시 대기
Start-Sleep 5

# 7. 프론트엔드 서버 시작
Write-Host "🎨 프론트엔드 서버 시작 중..." -ForegroundColor Cyan
Set-Location "D:\Software Project\MVS 3.0\msv-frontend"
Start-Process powershell -ArgumentList "-NoExit", "-Command", "npm start" -WindowStyle Normal

# 8. 서버 상태 확인
Write-Host "🔍 서버 상태 확인 중..." -ForegroundColor Yellow
Start-Sleep 15

# 9. API 테스트
Write-Host "🧪 API 연결 테스트 중..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri "http://localhost:5000/api/health" -Method GET -TimeoutSec 5
    Write-Host "✅ 백엔드 서버 정상 작동 (포트 5000)" -ForegroundColor Green
} catch {
    Write-Host "❌ 백엔드 서버 연결 실패" -ForegroundColor Red
}

try {
    $response = Invoke-WebRequest -Uri "http://localhost:3000" -Method GET -TimeoutSec 5
    Write-Host "✅ 프론트엔드 서버 정상 작동 (포트 3000)" -ForegroundColor Green
} catch {
    Write-Host "❌ 프론트엔드 서버 연결 실패" -ForegroundColor Red
}

Write-Host "🎉 개발 서버 시작 완료!" -ForegroundColor Green
Write-Host "📱 프론트엔드: http://localhost:3000" -ForegroundColor Cyan
Write-Host "🔧 백엔드 API: http://localhost:5000/api" -ForegroundColor Cyan
Write-Host "📊 헬스체크: http://localhost:5000/api/health" -ForegroundColor Cyan
