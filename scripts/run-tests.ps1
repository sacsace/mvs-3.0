# MVS 3.0 테스트 실행 스크립트 (Windows PowerShell)

param(
    [Parameter(Position=0)]
    [ValidateSet("unit", "integration", "e2e", "performance", "all")]
    [string]$TestType = "all"
)

# 색상 정의
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# 함수 정의
function Write-Header {
    param([string]$Message)
    Write-Host "=================================" -ForegroundColor $Blue
    Write-Host $Message -ForegroundColor $Blue
    Write-Host "=================================" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "✅ $Message" -ForegroundColor $Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "❌ $Message" -ForegroundColor $Red
}

function Write-Warning {
    param([string]$Message)
    Write-Host "⚠️  $Message" -ForegroundColor $Yellow
}

# 환경 확인
function Test-Environment {
    Write-Header "환경 확인"
    
    # Node.js 버전 확인
    try {
        $NodeVersion = node --version
        Write-Success "Node.js: $NodeVersion"
    }
    catch {
        Write-Error "Node.js가 설치되지 않았습니다."
        exit 1
    }
    
    # npm 버전 확인
    try {
        $NpmVersion = npm --version
        Write-Success "npm: $NpmVersion"
    }
    catch {
        Write-Error "npm이 설치되지 않았습니다."
        exit 1
    }
    
    # Docker 확인
    try {
        $DockerVersion = docker --version
        Write-Success "Docker: $DockerVersion"
    }
    catch {
        Write-Warning "Docker가 설치되지 않았습니다. 일부 테스트가 제한될 수 있습니다."
    }
}

# 의존성 설치
function Install-Dependencies {
    Write-Header "의존성 설치"
    
    # 백엔드 의존성 설치
    Write-Host "백엔드 의존성 설치 중..."
    Set-Location msv-server
    try {
        npm ci
        Write-Success "백엔드 의존성 설치 완료"
    }
    catch {
        Write-Error "백엔드 의존성 설치 실패"
        exit 1
    }
    
    # 프론트엔드 의존성 설치
    Write-Host "프론트엔드 의존성 설치 중..."
    Set-Location ../msv-frontend
    try {
        npm ci
        Write-Success "프론트엔드 의존성 설치 완료"
    }
    catch {
        Write-Error "프론트엔드 의존성 설치 실패"
        exit 1
    }
    
    Set-Location ..
}

# 데이터베이스 설정
function Setup-Database {
    Write-Header "데이터베이스 설정"
    
    # Docker로 데이터베이스 실행
    Write-Host "PostgreSQL과 Redis 시작 중..."
    try {
        docker-compose up postgres redis -d
        Write-Success "데이터베이스 시작 완료"
        
        # 데이터베이스 연결 대기
        Write-Host "데이터베이스 연결 대기 중..."
        Start-Sleep -Seconds 10
        
        # 마이그레이션 실행
        Write-Host "데이터베이스 마이그레이션 실행 중..."
        Set-Location msv-server
        try {
            npm run db:migrate
            Write-Success "마이그레이션 완료"
        }
        catch {
            Write-Warning "마이그레이션 실패 (테스트 계속 진행)"
        }
        Set-Location ..
    }
    catch {
        Write-Warning "Docker로 데이터베이스 시작 실패. 테스트 계속 진행..."
    }
}

# 단위 테스트 실행
function Test-Unit {
    Write-Header "단위 테스트 실행"
    
    # 백엔드 단위 테스트
    Write-Host "백엔드 단위 테스트 실행 중..."
    Set-Location msv-server
    try {
        npm test
        Write-Success "백엔드 단위 테스트 통과"
    }
    catch {
        Write-Error "백엔드 단위 테스트 실패"
        $script:TestFailed = $true
    }
    Set-Location ..
    
    # 프론트엔드 단위 테스트
    Write-Host "프론트엔드 단위 테스트 실행 중..."
    Set-Location msv-frontend
    try {
        npm test -- --watchAll=false
        Write-Success "프론트엔드 단위 테스트 통과"
    }
    catch {
        Write-Error "프론트엔드 단위 테스트 실패"
        $script:TestFailed = $true
    }
    Set-Location ..
}

# 통합 테스트 실행
function Test-Integration {
    Write-Header "통합 테스트 실행"
    
    # 백엔드 서버 시작
    Write-Host "백엔드 서버 시작 중..."
    Set-Location msv-server
    $BackendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; npm run dev }
    Set-Location ..
    
    # 서버 시작 대기
    Write-Host "서버 시작 대기 중..."
    Start-Sleep -Seconds 15
    
    # 통합 테스트 실행
    Write-Host "통합 테스트 실행 중..."
    Set-Location msv-server
    try {
        npm run test:integration
        Write-Success "통합 테스트 통과"
    }
    catch {
        Write-Error "통합 테스트 실패"
        $script:TestFailed = $true
    }
    Set-Location ..
    
    # 서버 종료
    Stop-Job $BackendJob
    Remove-Job $BackendJob
}

# E2E 테스트 실행
function Test-E2E {
    Write-Header "E2E 테스트 실행"
    
    # 백엔드 서버 시작
    Write-Host "백엔드 서버 시작 중..."
    Set-Location msv-server
    $BackendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; npm run dev }
    Set-Location ..
    
    # 프론트엔드 서버 시작
    Write-Host "프론트엔드 서버 시작 중..."
    Set-Location msv-frontend
    $FrontendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; npm start }
    Set-Location ..
    
    # 서버 시작 대기
    Write-Host "서버 시작 대기 중..."
    Start-Sleep -Seconds 30
    
    # E2E 테스트 실행
    Write-Host "E2E 테스트 실행 중..."
    try {
        npm run test:e2e
        Write-Success "E2E 테스트 통과"
    }
    catch {
        Write-Error "E2E 테스트 실패"
        $script:TestFailed = $true
    }
    
    # 서버 종료
    Stop-Job $BackendJob, $FrontendJob
    Remove-Job $BackendJob, $FrontendJob
}

# 성능 테스트 실행
function Test-Performance {
    Write-Header "성능 테스트 실행"
    
    # 백엔드 서버 시작
    Write-Host "백엔드 서버 시작 중..."
    Set-Location msv-server
    $BackendJob = Start-Job -ScriptBlock { Set-Location $using:PWD; npm run dev }
    Set-Location ..
    
    # 서버 시작 대기
    Write-Host "서버 시작 대기 중..."
    Start-Sleep -Seconds 15
    
    # 성능 테스트 실행
    Write-Host "성능 테스트 실행 중..."
    try {
        npm run test:performance
        Write-Success "성능 테스트 통과"
    }
    catch {
        Write-Error "성능 테스트 실패"
        $script:TestFailed = $true
    }
    
    # 서버 종료
    Stop-Job $BackendJob
    Remove-Job $BackendJob
}

# 테스트 결과 요약
function Show-Summary {
    Write-Header "테스트 결과 요약"
    
    if ($TestFailed) {
        Write-Error "일부 테스트가 실패했습니다."
        Write-Host "자세한 내용은 위의 로그를 확인하세요."
        exit 1
    }
    else {
        Write-Success "모든 테스트가 성공적으로 완료되었습니다!"
        Write-Host "🎉 MVS 3.0 시스템이 정상적으로 작동합니다."
    }
}

# 정리 작업
function Invoke-Cleanup {
    Write-Header "정리 작업"
    
    # Docker 컨테이너 정지
    Write-Host "Docker 컨테이너 정지 중..."
    try {
        docker-compose down
    }
    catch {
        Write-Warning "Docker 컨테이너 정지 실패"
    }
    
    # 실행 중인 프로세스 정리
    Write-Host "실행 중인 프로세스 정리 중..."
    Get-Process | Where-Object { $_.ProcessName -like "*node*" } | Stop-Process -Force -ErrorAction SilentlyContinue
    
    Write-Success "정리 작업 완료"
}

# 메인 실행
function Main {
    # 전역 변수 초기화
    $script:TestFailed = $false
    
    # 트랩 설정 (Ctrl+C 시 정리 작업 실행)
    try {
        # 테스트 실행
        Test-Environment
        Install-Dependencies
        Setup-Database
        
        # 테스트 타입별 실행
        switch ($TestType) {
            "unit" { Test-Unit }
            "integration" { Test-Integration }
            "e2e" { Test-E2E }
            "performance" { Test-Performance }
            "all" {
                Test-Unit
                Test-Integration
                Test-E2E
                Test-Performance
            }
        }
        
        Show-Summary
    }
    finally {
        Invoke-Cleanup
    }
}

# 스크립트 실행
Main