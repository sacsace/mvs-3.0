# MVS 3.0 테스트 가이드 📋

## 🎯 테스트 전략 개요

MVS 3.0은 다양한 환경에서 철저한 테스트를 통해 품질을 보장합니다.

### 테스트 피라미드
```
        🔺 E2E 테스트 (10%)
       🔺🔺 통합 테스트 (20%)
    🔺🔺🔺 단위 테스트 (70%)
```

---

## 🧪 1. 단위 테스트 (Unit Tests)

### 백엔드 테스트
```bash
# msv-server 디렉토리에서 실행
cd msv-server

# 모든 단위 테스트 실행
npm test

# 특정 파일 테스트
npm test -- --testPathPattern=authController

# 커버리지 포함 테스트
npm run test:coverage

# 감시 모드 (파일 변경 시 자동 실행)
npm run test:watch
```

### 프론트엔드 테스트
```bash
# msv-frontend 디렉토리에서 실행
cd msv-frontend

# React 컴포넌트 테스트
npm test

# 커버리지 포함 테스트
npm run test:coverage

# 감시 모드
npm run test:watch
```

### 테스트 파일 구조
```
msv-server/
├── src/
│   ├── controllers/
│   │   └── __tests__/
│   │       ├── authController.test.ts
│   │       └── userController.test.ts
│   ├── services/
│   │   └── __tests__/
│   │       └── authService.test.ts
│   └── utils/
│       └── __tests__/
│           └── validation.test.ts
└── tests/
    ├── unit/
    ├── integration/
    └── e2e/
```

---

## 🔗 2. 통합 테스트 (Integration Tests)

### API 엔드포인트 테스트
```bash
# 백엔드 서버 실행
cd msv-server
npm run dev

# 새 터미널에서 통합 테스트 실행
npm run test:integration
```

### 데이터베이스 통합 테스트
```bash
# 테스트 데이터베이스 설정
npm run test:db:setup

# 데이터베이스 통합 테스트
npm run test:integration:db

# 테스트 데이터 정리
npm run test:db:cleanup
```

### 테스트 시나리오
```typescript
// 예시: 사용자 인증 통합 테스트
describe('Authentication Integration', () => {
  test('사용자 로그인 전체 플로우', async () => {
    // 1. 사용자 등록
    const user = await createTestUser();
    
    // 2. 로그인 요청
    const response = await request(app)
      .post('/api/auth/login')
      .send({ userid: user.userid, password: 'password123' });
    
    // 3. 응답 검증
    expect(response.status).toBe(200);
    expect(response.body.token).toBeDefined();
  });
});
```

---

## 🌐 3. E2E 테스트 (End-to-End Tests)

### Playwright 설정
```bash
# E2E 테스트 설치
npm install --save-dev @playwright/test

# 브라우저 설치
npx playwright install

# E2E 테스트 실행
npm run test:e2e
```

### E2E 테스트 시나리오
```typescript
// tests/e2e/login.spec.ts
import { test, expect } from '@playwright/test';

test('사용자 로그인 E2E 테스트', async ({ page }) => {
  // 1. 로그인 페이지 접속
  await page.goto('http://localhost:3000/login');
  
  // 2. 로그인 폼 작성
  await page.fill('[data-testid="userid"]', 'admin');
  await page.fill('[data-testid="password"]', 'password123');
  
  // 3. 로그인 버튼 클릭
  await page.click('[data-testid="login-button"]');
  
  // 4. 대시보드 페이지 확인
  await expect(page).toHaveURL('http://localhost:3000/dashboard');
  await expect(page.locator('[data-testid="welcome-message"]')).toBeVisible();
});
```

---

## ⚡ 4. 성능 테스트

### Artillery 부하 테스트
```bash
# Artillery 설치
npm install -g artillery

# 부하 테스트 실행
npm run test:load

# 상세한 부하 테스트
artillery run tests/performance/load-test.yml
```

### K6 성능 테스트
```bash
# K6 설치 (Windows)
winget install k6

# 성능 테스트 실행
npm run test:performance

# 상세한 성능 테스트
k6 run tests/performance/api-performance.js
```

### 성능 테스트 시나리오
```javascript
// tests/performance/api-performance.js
import http from 'k6/http';
import { check, sleep } from 'k6';

export let options = {
  stages: [
    { duration: '2m', target: 100 }, // 2분간 100명까지 증가
    { duration: '5m', target: 100 }, // 5분간 100명 유지
    { duration: '2m', target: 0 },   // 2분간 0명까지 감소
  ],
};

export default function () {
  // API 엔드포인트 테스트
  let response = http.get('http://localhost:5000/api/health');
  check(response, {
    'status is 200': (r) => r.status === 200,
    'response time < 500ms': (r) => r.timings.duration < 500,
  });
  
  sleep(1);
}
```

---

## 🔧 5. 테스트 환경 설정

### 로컬 개발 환경
```bash
# 1. 데이터베이스만 도커 실행
docker-compose up postgres redis -d

# 2. 백엔드 실행
cd msv-server
npm install
npm run dev

# 3. 프론트엔드 실행 (새 터미널)
cd msv-frontend
npm install
npm start

# 4. 테스트 실행
npm run test:all
```

### 테스트 전용 환경
```bash
# 테스트 환경 변수 설정
cp .env.test.example .env.test

# 테스트 데이터베이스 설정
npm run test:db:setup

# 모든 테스트 실행
npm run test:all
```

---

## 📊 6. 테스트 커버리지

### 백엔드 커버리지
```bash
cd msv-server
npm run test:coverage

# 커버리지 리포트 확인
open coverage/lcov-report/index.html
```

### 프론트엔드 커버리지
```bash
cd msv-frontend
npm run test:coverage

# 커버리지 리포트 확인
open coverage/lcov-report/index.html
```

### 커버리지 목표
- **단위 테스트**: 80% 이상
- **통합 테스트**: 70% 이상
- **E2E 테스트**: 주요 플로우 100%

---

## 🚀 7. CI/CD 테스트

### GitHub Actions
```yaml
# .github/workflows/test.yml
name: Test Suite

on: [push, pull_request]

jobs:
  test:
    runs-on: ubuntu-latest
    
    steps:
    - uses: actions/checkout@v3
    
    - name: Setup Node.js
      uses: actions/setup-node@v3
      with:
        node-version: '20'
        
    - name: Install dependencies
      run: |
        cd msv-server && npm ci
        cd ../msv-frontend && npm ci
        
    - name: Run unit tests
      run: |
        cd msv-server && npm test
        cd ../msv-frontend && npm test
        
    - name: Run integration tests
      run: cd msv-server && npm run test:integration
```

---

## 🎯 8. 테스트 실행 명령어

### 전체 테스트 실행
```bash
# 모든 테스트 실행
npm run test:all

# 단위 테스트만
npm run test:unit

# 통합 테스트만
npm run test:integration

# E2E 테스트만
npm run test:e2e

# 성능 테스트만
npm run test:performance
```

### 특정 테스트 실행
```bash
# 특정 파일 테스트
npm test -- --testPathPattern=auth

# 특정 테스트 케이스
npm test -- --testNamePattern="로그인 테스트"

# 디버그 모드
npm test -- --verbose --detectOpenHandles
```

---

## 📋 9. 테스트 체크리스트

### 배포 전 필수 테스트
- [ ] 단위 테스트 통과 (80% 커버리지)
- [ ] 통합 테스트 통과
- [ ] E2E 테스트 통과 (주요 플로우)
- [ ] 성능 테스트 통과 (응답시간 < 500ms)
- [ ] 보안 테스트 통과
- [ ] 접근성 테스트 통과

### 기능별 테스트
- [ ] 사용자 인증 (로그인/로그아웃)
- [ ] 사용자 관리 (CRUD)
- [ ] 메뉴 관리
- [ ] 권한 관리
- [ ] 데이터베이스 연동
- [ ] API 엔드포인트
- [ ] 프론트엔드 컴포넌트

---

## 🔍 10. 테스트 디버깅

### 일반적인 문제 해결
```bash
# 테스트 데이터베이스 연결 문제
npm run test:db:reset

# 포트 충돌 문제
lsof -ti:3000 | xargs kill -9
lsof -ti:5000 | xargs kill -9

# 캐시 문제
npm run test:clean
```

### 로그 확인
```bash
# 상세한 테스트 로그
npm test -- --verbose

# 디버그 모드
DEBUG=* npm test
```

---

## ✅ 테스트 완료 기준

### 성공 기준
- 모든 테스트 통과
- 커버리지 목표 달성
- 성능 기준 충족
- 보안 검사 통과

### 실패 시 대응
1. 실패한 테스트 분석
2. 로그 확인
3. 코드 수정
4. 재테스트 실행
5. 문서 업데이트

---

**MVS 3.0은 철저한 테스트를 통해 안정적이고 신뢰할 수 있는 시스템을 제공합니다!** 🚀
