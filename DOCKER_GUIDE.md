# MVS 3.0 - Docker Compose 전용 가이드

## 🐳 **Docker Compose 전용 실행**

MVS 3.0은 이제 **Docker Compose만 사용**합니다. 다른 실행 방법들은 모두 비활성화되었습니다.

## 🚀 **빠른 시작**

### 1. 시스템 시작
```bash
# 전체 시스템 시작
npm start
# 또는
docker-compose up -d

# 상태 확인
npm run status
# 또는
docker-compose ps
```

### 2. 접속 정보
- **프론트엔드**: https://localhost:3000
- **백엔드 API**: https://localhost:5000
- **PostgreSQL**: localhost:5432
- **Redis**: localhost:6379

## 📋 **사용 가능한 명령어**

### 기본 명령어
```bash
npm start          # 시스템 시작
npm run stop       # 시스템 중지
npm run restart    # 시스템 재시작
npm run build      # 이미지 빌드
npm run logs       # 로그 확인
npm run status     # 상태 확인
npm run clean      # 환경 정리
```

### 데이터베이스 명령어
```bash
npm run db:migrate # 마이그레이션 실행
npm run db:seed    # 시드 데이터 삽입
npm run backup     # 데이터베이스 백업
```

### 테스트 명령어
```bash
npm test           # 백엔드 테스트
npm run test:all   # 전체 테스트
```

## 🔧 **Docker Compose 직접 명령어**

### 서비스 관리
```bash
# 전체 시작
docker-compose up -d

# 특정 서비스만 시작
docker-compose up -d postgres redis
docker-compose up -d backend
docker-compose up -d frontend

# 서비스 중지
docker-compose down

# 서비스 재시작
docker-compose restart backend
docker-compose restart frontend
```

### 로그 확인
```bash
# 전체 로그
docker-compose logs -f

# 특정 서비스 로그
docker-compose logs -f backend
docker-compose logs -f frontend
docker-compose logs -f postgres
```

### 컨테이너 내부 접근
```bash
# 백엔드 컨테이너 접근
docker-compose exec backend bash

# 프론트엔드 컨테이너 접근
docker-compose exec frontend sh

# 데이터베이스 접근
docker-compose exec postgres psql -U mvs_user -d mvs_db
```

## 🏗️ **서비스 구성**

### 1. PostgreSQL (데이터베이스)
- **컨테이너**: mvs-3.0-postgres
- **포트**: 5432
- **데이터베이스**: mvs_db
- **사용자**: mvs_user

### 2. Redis (캐시)
- **컨테이너**: mvs-3.0-redis
- **포트**: 6379

### 3. Backend (API 서버)
- **컨테이너**: mvs-3.0-backend
- **포트**: 5000
- **환경**: production
- **의존성**: PostgreSQL, Redis

### 4. Frontend (웹 애플리케이션)
- **컨테이너**: mvs-3.0-frontend
- **포트**: 3000 (내부 80)
- **의존성**: Backend

### 5. Nginx (리버스 프록시)
- **컨테이너**: mvs-3.0-nginx
- **포트**: 80, 443
- **HTTPS**: 활성화

## 🔍 **문제 해결**

### 서비스가 시작되지 않는 경우
```bash
# 로그 확인
docker-compose logs [서비스명]

# 컨테이너 상태 확인
docker-compose ps

# 이미지 재빌드
docker-compose build --no-cache
docker-compose up -d
```

### 데이터베이스 연결 문제
```bash
# PostgreSQL 상태 확인
docker-compose exec postgres pg_isready -U mvs_user

# 데이터베이스 접속 테스트
docker-compose exec postgres psql -U mvs_user -d mvs_db -c "SELECT version();"
```

### 포트 충돌 문제
```bash
# 사용 중인 포트 확인
netstat -ano | findstr :3000
netstat -ano | findstr :5000
netstat -ano | findstr :5432

# 프로세스 종료 후 재시작
docker-compose down
docker-compose up -d
```

## 🧹 **환경 정리**

### 완전 정리
```bash
# 모든 컨테이너와 볼륨 삭제
npm run clean
# 또는
docker-compose down -v
docker system prune -f
```

### 데이터 보존 정리
```bash
# 컨테이너만 삭제 (데이터 보존)
docker-compose down
docker system prune -f
```

## 📊 **모니터링**

### 헬스체크
```bash
# 서비스 상태 확인
docker-compose ps

# 헬스체크 로그
docker inspect mvs-3.0-backend | grep -A 10 Health
```

### 리소스 사용량
```bash
# 컨테이너 리소스 사용량
docker stats
```

## 🔒 **보안 설정**

### SSL 인증서
- SSL 인증서는 `./ssl/` 디렉토리에 저장
- Nginx에서 자동으로 HTTPS 처리
- 개발용 자체 서명 인증서 사용

### 환경 변수
- 민감한 정보는 Docker Compose 환경변수로 관리
- `.env` 파일 사용 가능

## 📝 **개발 팁**

### 코드 변경 시
```bash
# 백엔드 코드 변경 후
docker-compose restart backend

# 프론트엔드 코드 변경 후
docker-compose restart frontend
```

### 데이터베이스 스키마 변경
```bash
# 마이그레이션 실행
docker-compose exec backend npm run db:migrate

# 시드 데이터 삽입
docker-compose exec backend npm run db:seed
```

---

## ⚠️ **중요 사항**

1. **Docker Compose만 사용**: 다른 실행 방법은 모두 비활성화됨
2. **HTTPS 기본 활성화**: 모든 통신은 HTTPS로 암호화
3. **자동 재시작**: 컨테이너는 자동으로 재시작됨
4. **데이터 영속성**: PostgreSQL 데이터는 볼륨에 저장됨

**MVS 3.0을 Docker Compose로 안전하고 효율적으로 실행하세요!** 🚀
