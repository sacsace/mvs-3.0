# MVS 3.0 개발 환경 배포 스크립트

param(
    [string]$Version = "dev-$(Get-Date -Format 'yyyyMMdd-HHmmss')",
    [switch]$Build,
    [switch]$Clean
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
$Environment = "development"
$ComposeFile = "docker-compose.yml"
$ComposeOverrideFile = "docker-compose.dev.yml"

Write-Info "MVS 3.0 개발 환경 배포 시작 - 버전: $Version"

try {
    # 1. 환경 정리 (선택사항)
    if ($Clean) {
        Write-Info "개발 환경 정리 중..."
        docker-compose -f $ComposeFile down -v
        docker system prune -f
        Write-Success "개발 환경 정리 완료"
    }

    # 2. Docker 이미지 빌드 (선택사항)
    if ($Build) {
        Write-Info "Docker 이미지 빌드 중..."
        
        # 백엔드 이미지 빌드
        Write-Info "백엔드 이미지 빌드 중..."
        docker build -t mvs-backend:$Version ./msv-server
        docker build -t mvs-backend:dev ./msv-server

        # 프론트엔드 이미지 빌드
        Write-Info "프론트엔드 이미지 빌드 중..."
        docker build -t mvs-frontend:$Version ./msv-frontend
        docker build -t mvs-frontend:dev ./msv-frontend

        Write-Success "Docker 이미지 빌드 완료"
    }

    # 3. 환경 변수 파일 복사
    Write-Info "환경 변수 설정 중..."
    Copy-Item -Path "msv-server/env.development" -Destination "msv-server/.env" -Force
    Copy-Item -Path "msv-frontend/env.development" -Destination "msv-frontend/.env" -Force

    # 4. 데이터베이스 초기화
    Write-Info "데이터베이스 초기화 중..."
    docker-compose -f $ComposeFile up -d postgres redis
    
    # 데이터베이스 준비 대기
    Write-Info "데이터베이스 준비 대기 중..."
    Start-Sleep -Seconds 15

    # 5. 데이터베이스 마이그레이션
    Write-Info "데이터베이스 마이그레이션 실행 중..."
    docker-compose -f $ComposeFile exec -T postgres psql -U mvs_user -d mvs_db -f /docker-entrypoint-initdb.d/init-db.sql

    # 6. 백엔드 서비스 시작
    Write-Info "백엔드 서비스 시작 중..."
    docker-compose -f $ComposeFile up -d backend

    # 7. 프론트엔드 서비스 시작
    Write-Info "프론트엔드 서비스 시작 중..."
    docker-compose -f $ComposeFile up -d frontend

    # 8. 서비스 상태 확인
    Write-Info "서비스 상태 확인 중..."
    Start-Sleep -Seconds 10
    docker-compose -f $ComposeFile ps

    # 9. 헬스체크
    Write-Info "헬스체크 실행 중..."
    $maxRetries = 30
    $retryCount = 0
    
    do {
        try {
            $backendHealth = Invoke-RestMethod -Uri "http://localhost:5000/health" -Method Get -TimeoutSec 5
            $frontendHealth = Invoke-RestMethod -Uri "http://localhost:3000" -Method Get -TimeoutSec 5
            Write-Success "모든 서비스가 정상적으로 실행 중입니다!"
            break
        }
        catch {
            $retryCount++
            Write-Warning "헬스체크 실패 ($retryCount/$maxRetries). 10초 후 재시도..."
            Start-Sleep -Seconds 10
        }
    } while ($retryCount -lt $maxRetries)

    if ($retryCount -eq $maxRetries) {
        Write-Error "헬스체크 실패. 서비스 로그를 확인하세요."
        docker-compose -f $ComposeFile logs
        exit 1
    }

    # 10. 접속 정보 출력
    Write-Success "MVS 3.0 개발 환경 배포 완료!"
    Write-Host ""
    Write-Info "접속 정보:"
    Write-Host "Frontend: http://localhost:3000"
    Write-Host "Backend API: http://localhost:5000"
    Write-Host "API Documentation: http://localhost:5000/api-docs"
    Write-Host "PostgreSQL: localhost:5432"
    Write-Host "Redis: localhost:6379"
    Write-Host ""
    Write-Info "유용한 명령어:"
    Write-Host "서비스 상태 확인: docker-compose ps"
    Write-Host "로그 확인: docker-compose logs -f [service]"
    Write-Host "서비스 중지: docker-compose down"
    Write-Host "서비스 재시작: docker-compose restart [service]"

}
catch {
    Write-Error "배포 중 오류 발생: $($_.Exception.Message)"
    Write-Info "서비스 로그 확인:"
    docker-compose -f $ComposeFile logs
    exit 1
}
