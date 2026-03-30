# Railway 환경 변수 설정 체크리스트

## 📋 현재 설정 상태

### mvs-backend (백엔드) - 현재 9개 변수 설정됨

#### ✅ 이미 설정된 변수들
1. `CORS_ORIGIN` - CORS 허용 도메인
2. `DATABASE_URL` - PostgreSQL 연결 URL (Railway 자동 생성)
3. `DB_HOST` - 데이터베이스 호스트
4. `DB_NAME` - 데이터베이스 이름
5. `DB_PASSWORD` - 데이터베이스 비밀번호
6. `DB_PORT` - 데이터베이스 포트
7. `DB_USER` - 데이터베이스 사용자
8. `JWT_SECRET` - JWT 토큰 서명 키 ✅
9. `NODE_ENV` - 환경 설정 (production)

#### ❌ 추가로 필요한 변수들

##### 🔴 필수 (즉시 추가 필요)
1. **`SESSION_SECRET`** 
   - 값: `1595d1dd261b63dfc046d5a40d2ae38629b28855f0c1140c239345912098e655`
   - 용도: 세션 쿠키 암호화
   - 중요도: ⭐⭐⭐⭐⭐ (보안 필수)

##### 🟡 권장 (선택사항이지만 설정 권장)
2. **`HOST`**
   - 값: `0.0.0.0`
   - 용도: 서버 바인딩 주소
   - 중요도: ⭐⭐⭐ (기본값 있지만 명시적 설정 권장)

3. **`LOG_LEVEL`**
   - 값: `info` (프로덕션) 또는 `error` (최소 로깅)
   - 용도: 로그 레벨 설정
   - 중요도: ⭐⭐

##### 🟢 선택사항 (필요시에만 추가)
4. `EMAIL_HOST` - 이메일 서버 (이메일 기능 사용 시)
5. `EMAIL_USER` - 이메일 사용자명
6. `EMAIL_PASS` - 이메일 비밀번호
7. `OPENAI_API_KEY` - AI 기능 사용 시
8. `SMS_API_KEY` - SMS 기능 사용 시
9. `SMS_API_SECRET` - SMS 기능 사용 시

---

### mvs-frontend (프론트엔드) - 확인 필요

#### 🔴 필수 변수
1. **`REACT_APP_API_URL`**
   - 값: `https://your-backend-url.railway.app/api`
   - 예시: `https://mvs-backend-production.up.railway.app/api`
   - 용도: 백엔드 API URL
   - 중요도: ⭐⭐⭐⭐⭐

#### 🟡 권장 변수
2. **`NODE_ENV`**
   - 값: `production`
   - 중요도: ⭐⭐⭐

3. **`CI`**
   - 값: `false`
   - 용도: 빌드 시 경고를 오류로 처리하지 않음
   - 중요도: ⭐⭐

---

## 🚀 설정 방법

### 1. SESSION_SECRET 추가 (필수)

Railway 대시보드 → mvs-backend → Variables → New Variable

```
Name: SESSION_SECRET
Value: 1595d1dd261b63dfc046d5a40d2ae38629b28855f0c1140c239345912098e655
```

### 2. HOST 추가 (권장)

```
Name: HOST
Value: 0.0.0.0
```

### 3. 프론트엔드 REACT_APP_API_URL 설정

Railway 대시보드 → mvs-frontend → Variables → New Variable

```
Name: REACT_APP_API_URL
Value: https://your-backend-url.railway.app/api
```

**백엔드 URL 확인 방법:**
1. Railway 대시보드 → mvs-backend → Settings
2. "Generate Domain" 클릭 또는 기존 도메인 확인
3. 예: `https://mvs-backend-production.up.railway.app`
4. API URL: `https://mvs-backend-production.up.railway.app/api`

---

## ✅ 설정 완료 체크리스트

### 백엔드 (mvs-backend)
- [x] CORS_ORIGIN
- [x] DATABASE_URL
- [x] DB_HOST, DB_NAME, DB_USER, DB_PASSWORD, DB_PORT
- [x] JWT_SECRET
- [x] NODE_ENV
- [ ] **SESSION_SECRET** ← 추가 필요!
- [ ] HOST (권장)

### 프론트엔드 (mvs-frontend)
- [ ] **REACT_APP_API_URL** ← 추가 필요!
- [ ] NODE_ENV (권장)
- [ ] CI (권장)

---

## 🔒 보안 확인 사항

### ✅ 확인해야 할 것들
1. **JWT_SECRET**이 기본값(`mvs-jwt-secret`)이 아닌지 확인
   - 현재 설정된 값이 64자 hex 문자열인지 확인
   
2. **SESSION_SECRET**이 설정되어 있는지 확인
   - 기본값 사용 시 보안 취약

3. **CORS_ORIGIN**이 올바른 도메인으로 설정되어 있는지 확인
   - 와일드카드(`*`) 사용 시 보안 취약

---

## 🎯 우선순위

### 즉시 설정 (필수)
1. ✅ **SESSION_SECRET** - 백엔드
2. ✅ **REACT_APP_API_URL** - 프론트엔드

### 곧 설정 (권장)
3. ✅ **HOST** - 백엔드
4. ✅ **NODE_ENV** - 프론트엔드
5. ✅ **CI** - 프론트엔드

### 나중에 설정 (선택)
6. 이메일 관련 변수들
7. AI/SMS 관련 변수들

---

## 📝 참고사항

### Railway 자동 생성 변수
다음 변수들은 Railway가 자동으로 생성하므로 수동 설정 불필요:
- `PORT` - Railway가 자동 설정
- `RAILWAY_ENVIRONMENT` - Railway가 자동 설정
- `RAILWAY_PUBLIC_DOMAIN` - Railway가 자동 설정
- PostgreSQL 관련 변수들 (`PGHOST`, `PGPORT`, `PGDATABASE`, `PGUSER`, `PGPASSWORD`)

### 변수 참조 방법
Railway에서는 다른 서비스의 변수를 참조할 수 있습니다:
```
REACT_APP_API_URL=${{mvs-backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

이 방법을 사용하면 백엔드 URL이 변경되어도 자동으로 업데이트됩니다.
