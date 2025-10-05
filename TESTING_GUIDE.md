# MVS 3.0 테스트 가이드

## 🧪 테스트 환경별 가이드

### 1. 로컬 개발 테스트 (권장)

#### 데이터베이스만 도커 사용
```bash
# PostgreSQL과 Redis만 도커로 실행
docker-compose up postgres redis -d

# 백엔드 직접 실행
cd msv-server
npm install
npm run dev

# 프론트엔드 직접 실행 (새 터미널)
cd msv-frontend
npm install
npm start
```

#### 테스트 명령어
```bash
# API 테스트
curl http://localhost:5000/health
curl http://localhost:5000/api/auth/login

# 프론트엔드 테스트
# 브라우저에서 http://localhost:3000 접속
```

### 2. 전체 도커 테스트 (선택사항)

```bash
# 모든 서비스 도커로 실행
docker-compose up

# 테스트
curl http://localhost:5000/health
# 브라우저에서 http://localhost:3000 접속
```

### 3. Railway 프로덕션 테스트

#### 배포 후 테스트
```bash
# Railway URL 확인
railway status

# API 테스트
curl https://mvs30.railway.com/health
curl https://mvs30.railway.com/api/auth/login

# 프론트엔드 테스트
# 브라우저에서 https://mvs30.railway.com 접속
```

## 🔧 테스트 시나리오

### 기본 기능 테스트
1. **헬스체크**: `/health` 엔드포인트
2. **로그인**: 사용자 인증 기능
3. **API 연결**: 프론트엔드-백엔드 통신
4. **데이터베이스**: CRUD 작업

### 성능 테스트
```bash
# Artillery로 부하 테스트
npm run test:load

# K6로 성능 테스트
npm run test:performance
```

### E2E 테스트
```bash
# Playwright로 전체 플로우 테스트
npm run test:e2e
```

## 🐳 도커 사용 전략

### Railway 배포
- ❌ **도커 사용 안함**: Nixpacks 사용
- ✅ **자동 배포**: Git 푸시 시 자동 배포

### 로컬 개발
- ✅ **선택적 도커**: DB/Redis만 도커 사용
- ✅ **직접 실행**: 애플리케이션은 npm으로 실행
- ⚡ **빠른 개발**: 핫 리로드와 디버깅 지원

### 팀 협업
- ✅ **도커 권장**: 환경 일관성 보장
- 📦 **docker-compose.yml**: 표준 개발 환경

## 🚀 권장 개발 워크플로우

### 1. 로컬 개발 (빠른 개발)
```bash
# DB만 도커 실행
docker-compose up postgres redis -d

# 애플리케이션 직접 실행
cd msv-server && npm run dev
cd msv-frontend && npm start
```

### 2. 테스트
```bash
# 단위 테스트
npm test

# 통합 테스트
npm run test:integration

# E2E 테스트
npm run test:e2e
```

### 3. 배포
```bash
# Railway 자동 배포
git push origin main

# 수동 배포 (필요시)
railway up
```

### 4. 프로덕션 테스트
```bash
# 배포된 애플리케이션 테스트
curl https://mvs30.railway.com/health
```

## ✅ 결론

- **Railway**: 도커 없이 Nixpacks 사용
- **로컬**: 선택적 도커 사용 (DB/Redis만)
- **테스트**: 다양한 환경에서 단계별 테스트
- **개발**: 빠르고 효율적인 워크플로우
