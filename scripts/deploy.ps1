# MVS 3.0 배포 스크립트 (PowerShell)

param(
    [string]$Version = "latest",
    [switch]$Push,
    [switch]$PortForward
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
$Namespace = "mvs-system"
$DockerRegistry = "your-registry.com"

Write-Info "MVS 3.0 배포 시작 - 버전: $Version"

try {
    # 1. Docker 이미지 빌드
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

    # 2. 이미지 푸시 (선택사항)
    if ($Push) {
        Write-Info "Docker 이미지 푸시 중..."
        docker push "$DockerRegistry/mvs-backend:$Version"
        docker push "$DockerRegistry/mvs-backend:latest"
        docker push "$DockerRegistry/mvs-frontend:$Version"
        docker push "$DockerRegistry/mvs-frontend:latest"
        Write-Success "Docker 이미지 푸시 완료"
    }

    # 3. Kubernetes 네임스페이스 생성
    Write-Info "Kubernetes 네임스페이스 생성 중..."
    kubectl apply -f k8s/namespace.yaml

    # 4. 데이터베이스 배포
    Write-Info "PostgreSQL 배포 중..."
    kubectl apply -f k8s/postgres-config.yaml

    # 5. Redis 배포
    Write-Info "Redis 배포 중..."
    kubectl apply -f k8s/redis-config.yaml

    # 6. 백엔드 배포
    Write-Info "백엔드 서버 배포 중..."
    kubectl apply -f k8s/backend-deployment.yaml

    # 7. 프론트엔드 배포
    Write-Info "프론트엔드 서버 배포 중..."
    kubectl apply -f k8s/frontend-deployment.yaml

    # 8. Ingress 배포
    Write-Info "Ingress 배포 중..."
    kubectl apply -f k8s/ingress.yaml

    # 9. 배포 상태 확인
    Write-Info "배포 상태 확인 중..."
    kubectl get pods -n $Namespace
    kubectl get services -n $Namespace
    kubectl get ingress -n $Namespace

    Write-Success "MVS 3.0 배포 완료!"

    # 10. 접속 정보 출력
    Write-Info "접속 정보:"
    Write-Host "Frontend: http://mvs.local"
    Write-Host "API: http://api.mvs.local"
    Write-Host "Dashboard: kubectl get pods -n $Namespace"

    # 11. 포트 포워딩 (로컬 테스트용)
    if ($PortForward) {
        Write-Info "포트 포워딩 시작..."
        Start-Process -NoNewWindow -FilePath "kubectl" -ArgumentList "port-forward", "-n", $Namespace, "service/mvs-frontend-service", "3000:80"
        Start-Process -NoNewWindow -FilePath "kubectl" -ArgumentList "port-forward", "-n", $Namespace, "service/mvs-backend-service", "5000:5000"
        Write-Success "포트 포워딩 완료 - Frontend: http://localhost:3000, Backend: http://localhost:5000"
    }
}
catch {
    Write-Error "배포 중 오류 발생: $($_.Exception.Message)"
    exit 1
}
