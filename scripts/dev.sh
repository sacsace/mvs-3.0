#!/bin/bash

# MVS 3.0 개발 환경 스크립트

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
COMPOSE_FILE="docker-compose.yml"

# 함수 정의
start_services() {
    log_info "MVS 3.0 개발 환경 시작 중..."
    
    # Docker Compose로 서비스 시작
    docker-compose -f $COMPOSE_FILE up -d postgres redis
    
    # 데이터베이스 초기화 대기
    log_info "데이터베이스 초기화 대기 중..."
    sleep 10
    
    # 백엔드 서비스 시작
    log_info "백엔드 서비스 시작 중..."
    docker-compose -f $COMPOSE_FILE up -d backend
    
    # 프론트엔드 서비스 시작
    log_info "프론트엔드 서비스 시작 중..."
    docker-compose -f $COMPOSE_FILE up -d frontend
    
    log_success "개발 환경 시작 완료!"
    show_status
}

stop_services() {
    log_info "MVS 3.0 개발 환경 중지 중..."
    docker-compose -f $COMPOSE_FILE down
    log_success "개발 환경 중지 완료!"
}

restart_services() {
    log_info "MVS 3.0 개발 환경 재시작 중..."
    stop_services
    sleep 5
    start_services
}

show_status() {
    log_info "서비스 상태 확인:"
    docker-compose -f $COMPOSE_FILE ps
    
    echo ""
    log_info "접속 정보:"
    echo "Frontend: http://localhost:3000"
    echo "Backend API: http://localhost:5000"
    echo "PostgreSQL: localhost:5432"
    echo "Redis: localhost:6379"
}

show_logs() {
    local service=${1:-""}
    if [ -z "$service" ]; then
        docker-compose -f $COMPOSE_FILE logs -f
    else
        docker-compose -f $COMPOSE_FILE logs -f $service
    fi
}

build_images() {
    log_info "Docker 이미지 빌드 중..."
    docker-compose -f $COMPOSE_FILE build
    log_success "Docker 이미지 빌드 완료!"
}

clean_environment() {
    log_warning "개발 환경 정리 중..."
    docker-compose -f $COMPOSE_FILE down -v
    docker system prune -f
    log_success "개발 환경 정리 완료!"
}

# 메인 로직
case "${1:-start}" in
    start)
        start_services
        ;;
    stop)
        stop_services
        ;;
    restart)
        restart_services
        ;;
    status)
        show_status
        ;;
    logs)
        show_logs $2
        ;;
    build)
        build_images
        ;;
    clean)
        clean_environment
        ;;
    help|--help|-h)
        echo "MVS 3.0 개발 환경 스크립트"
        echo ""
        echo "사용법: $0 [명령어]"
        echo ""
        echo "명령어:"
        echo "  start     - 개발 환경 시작 (기본값)"
        echo "  stop      - 개발 환경 중지"
        echo "  restart   - 개발 환경 재시작"
        echo "  status    - 서비스 상태 확인"
        echo "  logs      - 로그 확인 (서비스명 선택사항)"
        echo "  build     - Docker 이미지 빌드"
        echo "  clean     - 개발 환경 정리"
        echo "  help      - 도움말 표시"
        echo ""
        echo "예시:"
        echo "  $0 start"
        echo "  $0 logs backend"
        echo "  $0 restart"
        ;;
    *)
        log_error "알 수 없는 명령어: $1"
        echo "사용법: $0 help"
        exit 1
        ;;
esac
