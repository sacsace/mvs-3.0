#!/bin/bash
# MVS 3.0 테스트 실행 스크립트

echo "🚀 MVS 3.0 테스트 시작..."

# 색상 정의
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# 함수 정의
print_header() {
    echo -e "${BLUE}================================${NC}"
    echo -e "${BLUE}$1${NC}"
    echo -e "${BLUE}================================${NC}"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

# 환경 확인
check_environment() {
    print_header "환경 확인"
    
    # Node.js 버전 확인
    if command -v node &> /dev/null; then
        NODE_VERSION=$(node --version)
        print_success "Node.js: $NODE_VERSION"
    else
        print_error "Node.js가 설치되지 않았습니다."
        exit 1
    fi
    
    # npm 버전 확인
    if command -v npm &> /dev/null; then
        NPM_VERSION=$(npm --version)
        print_success "npm: $NPM_VERSION"
    else
        print_error "npm이 설치되지 않았습니다."
        exit 1
    fi
    
    # Docker 확인
    if command -v docker &> /dev/null; then
        DOCKER_VERSION=$(docker --version)
        print_success "Docker: $DOCKER_VERSION"
    else
        print_warning "Docker가 설치되지 않았습니다. 일부 테스트가 제한될 수 있습니다."
    fi
}

# 의존성 설치
install_dependencies() {
    print_header "의존성 설치"
    
    # 백엔드 의존성 설치
    echo "백엔드 의존성 설치 중..."
    cd msv-server
    if npm ci; then
        print_success "백엔드 의존성 설치 완료"
    else
        print_error "백엔드 의존성 설치 실패"
        exit 1
    fi
    
    # 프론트엔드 의존성 설치
    echo "프론트엔드 의존성 설치 중..."
    cd ../msv-frontend
    if npm ci; then
        print_success "프론트엔드 의존성 설치 완료"
    else
        print_error "프론트엔드 의존성 설치 실패"
        exit 1
    fi
    
    cd ..
}

# 데이터베이스 설정
setup_database() {
    print_header "데이터베이스 설정"
    
    # Docker로 데이터베이스 실행
    echo "PostgreSQL과 Redis 시작 중..."
    if docker-compose up postgres redis -d; then
        print_success "데이터베이스 시작 완료"
        
        # 데이터베이스 연결 대기
        echo "데이터베이스 연결 대기 중..."
        sleep 10
        
        # 마이그레이션 실행
        echo "데이터베이스 마이그레이션 실행 중..."
        cd msv-server
        if npm run db:migrate; then
            print_success "마이그레이션 완료"
        else
            print_warning "마이그레이션 실패 (테스트 계속 진행)"
        fi
        cd ..
    else
        print_warning "Docker로 데이터베이스 시작 실패. 테스트 계속 진행..."
    fi
}

# 단위 테스트 실행
run_unit_tests() {
    print_header "단위 테스트 실행"
    
    # 백엔드 단위 테스트
    echo "백엔드 단위 테스트 실행 중..."
    cd msv-server
    if npm test; then
        print_success "백엔드 단위 테스트 통과"
    else
        print_error "백엔드 단위 테스트 실패"
        TEST_FAILED=true
    fi
    cd ..
    
    # 프론트엔드 단위 테스트
    echo "프론트엔드 단위 테스트 실행 중..."
    cd msv-frontend
    if npm test -- --watchAll=false; then
        print_success "프론트엔드 단위 테스트 통과"
    else
        print_error "프론트엔드 단위 테스트 실패"
        TEST_FAILED=true
    fi
    cd ..
}

# 통합 테스트 실행
run_integration_tests() {
    print_header "통합 테스트 실행"
    
    # 백엔드 서버 시작
    echo "백엔드 서버 시작 중..."
    cd msv-server
    npm run dev &
    SERVER_PID=$!
    cd ..
    
    # 서버 시작 대기
    echo "서버 시작 대기 중..."
    sleep 15
    
    # 통합 테스트 실행
    echo "통합 테스트 실행 중..."
    cd msv-server
    if npm run test:integration; then
        print_success "통합 테스트 통과"
    else
        print_error "통합 테스트 실패"
        TEST_FAILED=true
    fi
    cd ..
    
    # 서버 종료
    kill $SERVER_PID 2>/dev/null
}

# E2E 테스트 실행
run_e2e_tests() {
    print_header "E2E 테스트 실행"
    
    # 백엔드 서버 시작
    echo "백엔드 서버 시작 중..."
    cd msv-server
    npm run dev &
    BACKEND_PID=$!
    cd ..
    
    # 프론트엔드 서버 시작
    echo "프론트엔드 서버 시작 중..."
    cd msv-frontend
    npm start &
    FRONTEND_PID=$!
    cd ..
    
    # 서버 시작 대기
    echo "서버 시작 대기 중..."
    sleep 30
    
    # E2E 테스트 실행
    echo "E2E 테스트 실행 중..."
    if npm run test:e2e; then
        print_success "E2E 테스트 통과"
    else
        print_error "E2E 테스트 실패"
        TEST_FAILED=true
    fi
    
    # 서버 종료
    kill $BACKEND_PID 2>/dev/null
    kill $FRONTEND_PID 2>/dev/null
}

# 성능 테스트 실행
run_performance_tests() {
    print_header "성능 테스트 실행"
    
    # 백엔드 서버 시작
    echo "백엔드 서버 시작 중..."
    cd msv-server
    npm run dev &
    SERVER_PID=$!
    cd ..
    
    # 서버 시작 대기
    echo "서버 시작 대기 중..."
    sleep 15
    
    # 성능 테스트 실행
    echo "성능 테스트 실행 중..."
    if npm run test:performance; then
        print_success "성능 테스트 통과"
    else
        print_error "성능 테스트 실패"
        TEST_FAILED=true
    fi
    
    # 서버 종료
    kill $SERVER_PID 2>/dev/null
}

# 테스트 결과 요약
print_summary() {
    print_header "테스트 결과 요약"
    
    if [ "$TEST_FAILED" = true ]; then
        print_error "일부 테스트가 실패했습니다."
        echo "자세한 내용은 위의 로그를 확인하세요."
        exit 1
    else
        print_success "모든 테스트가 성공적으로 완료되었습니다!"
        echo "🎉 MVS 3.0 시스템이 정상적으로 작동합니다."
    fi
}

# 정리 작업
cleanup() {
    print_header "정리 작업"
    
    # Docker 컨테이너 정지
    echo "Docker 컨테이너 정지 중..."
    docker-compose down
    
    # 실행 중인 프로세스 정리
    echo "실행 중인 프로세스 정리 중..."
    pkill -f "npm run dev" 2>/dev/null
    pkill -f "npm start" 2>/dev/null
    
    print_success "정리 작업 완료"
}

# 메인 실행
main() {
    # 전역 변수 초기화
    TEST_FAILED=false
    
    # 트랩 설정 (Ctrl+C 시 정리 작업 실행)
    trap cleanup EXIT
    
    # 테스트 실행
    check_environment
    install_dependencies
    setup_database
    
    # 테스트 타입 선택
    case "${1:-all}" in
        "unit")
            run_unit_tests
            ;;
        "integration")
            run_integration_tests
            ;;
        "e2e")
            run_e2e_tests
            ;;
        "performance")
            run_performance_tests
            ;;
        "all")
            run_unit_tests
            run_integration_tests
            run_e2e_tests
            run_performance_tests
            ;;
        *)
            echo "사용법: $0 [unit|integration|e2e|performance|all]"
            exit 1
            ;;
    esac
    
    print_summary
}

# 스크립트 실행
main "$@"
