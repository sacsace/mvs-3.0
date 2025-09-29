# MVS 3.0 개발 환경 스크립트 (PowerShell)

param(
    [string]$Command = "start",
    [string]$Service = ""
)

# 색상 정의
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Blue"

# 로그 함수
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Red
}

# 환경 변수 설정
$ComposeFile = "docker-compose.yml"

# 함수 정의
function Start-Services {
    Write-Info "MVS 3.0 개발 환경 시작 중..."
    
    # Docker Compose로 서비스 시작
    docker-compose -f $ComposeFile up -d postgres redis
    
    # 데이터베이스 초기화 대기
    Write-Info "데이터베이스 초기화 대기 중..."
    Start-Sleep -Seconds 10
    
    # 백엔드 서비스 시작
    Write-Info "백엔드 서비스 시작 중..."
    docker-compose -f $ComposeFile up -d backend
    
    # 프론트엔드 서비스 시작
    Write-Info "프론트엔드 서비스 시작 중..."
    docker-compose -f $ComposeFile up -d frontend
    
    Write-Success "개발 환경 시작 완료!"
    Show-Status
}

function Stop-Services {
    Write-Info "MVS 3.0 개발 환경 중지 중..."
    docker-compose -f $ComposeFile down
    Write-Success "개발 환경 중지 완료!"
}

function Restart-Services {
    Write-Info "MVS 3.0 개발 환경 재시작 중..."
    Stop-Services
    Start-Sleep -Seconds 5
    Start-Services
}

function Show-Status {
    Write-Info "서비스 상태 확인:"
    docker-compose -f $ComposeFile ps
    
    Write-Host ""
    Write-Info "접속 정보:"
    Write-Host "Frontend: http://localhost:3000"
    Write-Host "Backend API: http://localhost:5000"
    Write-Host "PostgreSQL: localhost:5432"
    Write-Host "Redis: localhost:6379"
}

function Show-Logs {
    param([string]$ServiceName = "")
    if ([string]::IsNullOrEmpty($ServiceName)) {
        docker-compose -f $ComposeFile logs -f
    } else {
        docker-compose -f $ComposeFile logs -f $ServiceName
    }
}

function Build-Images {
    Write-Info "Docker 이미지 빌드 중..."
    docker-compose -f $ComposeFile build
    Write-Success "Docker 이미지 빌드 완료!"
}

function Clean-Environment {
    Write-Warning "개발 환경 정리 중..."
    docker-compose -f $ComposeFile down -v
    docker system prune -f
    Write-Success "개발 환경 정리 완료!"
}

function Show-Help {
    Write-Host "MVS 3.0 개발 환경 스크립트"
    Write-Host ""
    Write-Host "사용법: .\dev.ps1 [명령어] [서비스명]"
    Write-Host ""
    Write-Host "명령어:"
    Write-Host "  start     - 개발 환경 시작 (기본값)"
    Write-Host "  stop      - 개발 환경 중지"
    Write-Host "  restart   - 개발 환경 재시작"
    Write-Host "  status    - 서비스 상태 확인"
    Write-Host "  logs      - 로그 확인 (서비스명 선택사항)"
    Write-Host "  build     - Docker 이미지 빌드"
    Write-Host "  clean     - 개발 환경 정리"
    Write-Host "  help      - 도움말 표시"
    Write-Host ""
    Write-Host "예시:"
    Write-Host "  .\dev.ps1 start"
    Write-Host "  .\dev.ps1 logs backend"
    Write-Host "  .\dev.ps1 restart"
}

# 메인 로직
try {
    switch ($Command.ToLower()) {
        "start" {
            Start-Services
        }
        "stop" {
            Stop-Services
        }
        "restart" {
            Restart-Services
        }
        "status" {
            Show-Status
        }
        "logs" {
            Show-Logs -ServiceName $Service
        }
        "build" {
            Build-Images
        }
        "clean" {
            Clean-Environment
        }
        "help" {
            Show-Help
        }
        default {
            Write-Error "알 수 없는 명령어: $Command"
            Write-Host "사용법: .\dev.ps1 help"
            exit 1
        }
    }
}
catch {
    Write-Error "명령 실행 중 오류 발생: $($_.Exception.Message)"
    exit 1
}
