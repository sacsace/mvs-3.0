# MVS 3.0 운영 환경 배포 스크립트

param(
    [string]$Version = "prod-$(Get-Date -Format 'yyyyMMdd-HHmmss')",
    [switch]$Build,
    [switch]$Push,
    [switch]$Rollback,
    [string]$PreviousVersion = ""
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
$Environment = "production"
$Namespace = "mvs-system"
$DockerRegistry = "your-registry.com"

Write-Info "MVS 3.0 운영 환경 배포 시작 - 버전: $Version"

try {
    # 롤백 모드
    if ($Rollback) {
        if ([string]::IsNullOrEmpty($PreviousVersion)) {
            Write-Error "롤백을 위해 이전 버전을 지정해주세요."
            exit 1
        }
        
        Write-Warning "롤백 모드: $PreviousVersion으로 롤백합니다."
        $Version = $PreviousVersion
    }

    # 1. 사전 배포 검사
    Write-Info "사전 배포 검사 중..."
    
    # Kubernetes 클러스터 연결 확인
    $kubectlStatus = kubectl cluster-info 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Error "Kubernetes 클러스터에 연결할 수 없습니다."
        exit 1
    }

    # 네임스페이스 존재 확인
    $namespaceExists = kubectl get namespace $Namespace 2>$null
    if ($LASTEXITCODE -ne 0) {
        Write-Info "네임스페이스 생성 중..."
        kubectl apply -f k8s/namespace.yaml
    }

    # 2. Docker 이미지 빌드 (선택사항)
    if ($Build) {
        Write-Info "Docker 이미지 빌드 중..."
        
        # 백엔드 이미지 빌드
        Write-Info "백엔드 이미지 빌드 중..."
        docker build -t "$DockerRegistry/mvs-backend:$Version" ./msv-server
        docker build -t "$DockerRegistry/mvs-backend:latest" ./msv-server

        # 프론트엔드 이미지 빌드
        Write-Info "프론트엔드 이미지 빌드 중..."
        docker build -t "$DockerRegistry/mvs-frontend:$Version" ./msv-frontend
        docker build -t "$DockerRegistry/mvs-frontend:latest" ./msv-frontend

        Write-Success "Docker 이미지 빌드 완료"

        # 3. 이미지 푸시 (선택사항)
        if ($Push) {
            Write-Info "Docker 이미지 푸시 중..."
            docker push "$DockerRegistry/mvs-backend:$Version"
            docker push "$DockerRegistry/mvs-backend:latest"
            docker push "$DockerRegistry/mvs-frontend:$Version"
            docker push "$DockerRegistry/mvs-frontend:latest"
            Write-Success "Docker 이미지 푸시 완료"
        }
    }

    # 4. 환경 변수 설정
    Write-Info "환경 변수 설정 중..."
    Copy-Item -Path "msv-server/env.production" -Destination "msv-server/.env" -Force
    Copy-Item -Path "msv-frontend/env.production" -Destination "msv-frontend/.env" -Force

    # 5. 데이터베이스 배포
    Write-Info "PostgreSQL 배포 중..."
    kubectl apply -f k8s/postgres-config.yaml

    # 6. Redis 배포
    Write-Info "Redis 배포 중..."
    kubectl apply -f k8s/redis-config.yaml

    # 7. 백엔드 배포
    Write-Info "백엔드 서비스 배포 중..."
    kubectl apply -f k8s/backend-deployment.yaml

    # 8. 프론트엔드 배포
    Write-Info "프론트엔드 서비스 배포 중..."
    kubectl apply -f k8s/frontend-deployment.yaml

    # 9. Ingress 배포
    Write-Info "Ingress 배포 중..."
    kubectl apply -f k8s/ingress.yaml

    # 10. 배포 상태 확인
    Write-Info "배포 상태 확인 중..."
    kubectl get pods -n $Namespace
    kubectl get services -n $Namespace
    kubectl get ingress -n $Namespace

    # 11. 롤링 업데이트 확인
    Write-Info "롤링 업데이트 확인 중..."
    $maxRetries = 60
    $retryCount = 0

    do {
        $pods = kubectl get pods -n $Namespace -o json | ConvertFrom-Json
        $runningPods = ($pods.items | Where-Object { $_.status.phase -eq "Running" }).Count
        $totalPods = $pods.items.Count

        Write-Info "실행 중인 Pod: $runningPods/$totalPods"

        if ($runningPods -eq $totalPods) {
            Write-Success "모든 Pod가 정상적으로 실행 중입니다!"
            break
        }

        $retryCount++
        Write-Warning "Pod 시작 대기 중 ($retryCount/$maxRetries). 10초 후 재확인..."
        Start-Sleep -Seconds 10
    } while ($retryCount -lt $maxRetries)

    if ($retryCount -eq $maxRetries) {
        Write-Error "Pod 시작 실패. 로그를 확인하세요."
        kubectl describe pods -n $Namespace
        exit 1
    }

    # 12. 헬스체크
    Write-Info "헬스체크 실행 중..."
    $maxRetries = 30
    $retryCount = 0

    do {
        try {
            # Ingress를 통한 헬스체크
            $backendHealth = Invoke-RestMethod -Uri "https://api.mvs.local/health" -Method Get -TimeoutSec 10
            $frontendHealth = Invoke-RestMethod -Uri "https://mvs.local" -Method Get -TimeoutSec 10
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
        Write-Error "헬스체크 실패. 서비스 상태를 확인하세요."
        kubectl logs -n $Namespace -l app=mvs-backend --tail=50
        exit 1
    }

    # 13. 배포 완료
    Write-Success "MVS 3.0 운영 환경 배포 완료!"
    Write-Host ""
    Write-Info "접속 정보:"
    Write-Host "Frontend: https://mvs.local"
    Write-Host "API: https://api.mvs.local"
    Write-Host "API Documentation: https://api.mvs.local/api-docs"
    Write-Host ""
    Write-Info "모니터링:"
    Write-Host "Pod 상태: kubectl get pods -n $Namespace"
    Write-Host "서비스 상태: kubectl get services -n $Namespace"
    Write-Host "로그 확인: kubectl logs -n $Namespace -l app=mvs-backend"
    Write-Host ""
    Write-Info "배포 버전: $Version"
    Write-Info "배포 시간: $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')"

}
catch {
    Write-Error "배포 중 오류 발생: $($_.Exception.Message)"
    Write-Info "오류 디버깅 정보:"
    kubectl describe pods -n $Namespace
    kubectl logs -n $Namespace -l app=mvs-backend --tail=50
    exit 1
}
