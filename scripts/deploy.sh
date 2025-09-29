#!/bin/bash

# MVS 3.0 배포 스크립트

set -e

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 로그 함수
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 환경 변수 설정
NAMESPACE="mvs-system"
DOCKER_REGISTRY="your-registry.com"
VERSION=${1:-latest}

log_info "MVS 3.0 배포 시작 - 버전: $VERSION"

# 1. Docker 이미지 빌드
log_info "Docker 이미지 빌드 중..."

# 백엔드 이미지 빌드
log_info "백엔드 이미지 빌드 중..."
docker build -t $DOCKER_REGISTRY/mvs-backend:$VERSION ./msv-server
docker build -t $DOCKER_REGISTRY/mvs-backend:latest ./msv-server

# 프론트엔드 이미지 빌드
log_info "프론트엔드 이미지 빌드 중..."
docker build -t $DOCKER_REGISTRY/mvs-frontend:$VERSION ./msv-frontend
docker build -t $DOCKER_REGISTRY/mvs-frontend:latest ./msv-frontend

log_success "Docker 이미지 빌드 완료"

# 2. 이미지 푸시 (선택사항)
if [ "$2" = "push" ]; then
    log_info "Docker 이미지 푸시 중..."
    docker push $DOCKER_REGISTRY/mvs-backend:$VERSION
    docker push $DOCKER_REGISTRY/mvs-backend:latest
    docker push $DOCKER_REGISTRY/mvs-frontend:$VERSION
    docker push $DOCKER_REGISTRY/mvs-frontend:latest
    log_success "Docker 이미지 푸시 완료"
fi

# 3. Kubernetes 네임스페이스 생성
log_info "Kubernetes 네임스페이스 생성 중..."
kubectl apply -f k8s/namespace.yaml

# 4. 데이터베이스 배포
log_info "PostgreSQL 배포 중..."
kubectl apply -f k8s/postgres-config.yaml

# 5. Redis 배포
log_info "Redis 배포 중..."
kubectl apply -f k8s/redis-config.yaml

# 6. 백엔드 배포
log_info "백엔드 서버 배포 중..."
kubectl apply -f k8s/backend-deployment.yaml

# 7. 프론트엔드 배포
log_info "프론트엔드 서버 배포 중..."
kubectl apply -f k8s/frontend-deployment.yaml

# 8. Ingress 배포
log_info "Ingress 배포 중..."
kubectl apply -f k8s/ingress.yaml

# 9. 배포 상태 확인
log_info "배포 상태 확인 중..."
kubectl get pods -n $NAMESPACE
kubectl get services -n $NAMESPACE
kubectl get ingress -n $NAMESPACE

log_success "MVS 3.0 배포 완료!"

# 10. 접속 정보 출력
log_info "접속 정보:"
echo "Frontend: http://mvs.local"
echo "API: http://api.mvs.local"
echo "Dashboard: kubectl get pods -n $NAMESPACE"

# 11. 포트 포워딩 (로컬 테스트용)
if [ "$3" = "port-forward" ]; then
    log_info "포트 포워딩 시작..."
    kubectl port-forward -n $NAMESPACE service/mvs-frontend-service 3000:80 &
    kubectl port-forward -n $NAMESPACE service/mvs-backend-service 5000:5000 &
    log_success "포트 포워딩 완료 - Frontend: http://localhost:3000, Backend: http://localhost:5000"
fi
