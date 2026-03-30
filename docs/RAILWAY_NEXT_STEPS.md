# Railway 배포 다음 단계 실행 가이드

## 🎯 현재 상태
- ✅ mvs-backend: Online
- ✅ mvs-frontend: Online
- ✅ Postgres: Online (연결 시도 중)
- ⏳ 환경 변수 설정 필요
- ⏳ 데이터베이스 마이그레이션 필요

---

## 📋 단계별 실행 가이드

### 1단계: 환경 변수 설정 (필수)

#### 백엔드 (mvs-backend) 환경 변수 추가

Railway 대시보드 → **mvs-backend** → **Variables** → **New Variable**

**1. SESSION_SECRET 추가**
```
Name: SESSION_SECRET
Value: 1595d1dd261b63dfc046d5a40d2ae38629b28855f0c1140c239345912098e655
```

**2. HOST 추가 (권장)**
```
Name: HOST
Value: 0.0.0.0
```

#### 프론트엔드 (mvs-frontend) 환경 변수 추가

Railway 대시보드 → **mvs-frontend** → **Variables** → **New Variable**

**1. REACT_APP_API_URL 추가**

먼저 백엔드 URL을 확인하세요:
- Railway 대시보드 → **mvs-backend** → **Settings**
- "Generate Domain" 클릭 또는 기존 도메인 확인
- 예: `https://mvs-backend-production.up.railway.app`

그 다음 프론트엔드에 추가:
```
Name: REACT_APP_API_URL
Value: https://your-backend-url.railway.app/api
```

또는 Railway 변수 참조 사용 (권장):
```
Name: REACT_APP_API_URL
Value: ${{mvs-backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

---

### 2단계: 데이터베이스 마이그레이션 실행 (필수)

#### 방법 A: Railway CLI 사용 (권장)

터미널에서 실행:

```bash
# Railway CLI 설치 (없다면)
npm install -g @railway/cli

# Railway 로그인
railway login

# 프로젝트 연결 (프로젝트 디렉토리에서)
cd "D:\Software Project\MVS"
railway link

# 마이그레이션 실행
railway run --service mvs-backend npm run db:migrate
```

#### 방법 B: Railway 대시보드 사용

1. Railway 대시보드 → **mvs-backend** 서비스
2. **Deployments** 탭 클릭
3. 최신 배포의 **"..." 메뉴** → **"Open Shell"** 클릭
4. 터미널에서 실행:
   ```bash
   npm run db:migrate
   ```

#### 방법 C: Railway One-off Command

1. Railway 대시보드 → **mvs-backend** 서비스
2. **Settings** → **Deploy** 섹션
3. **"Run Command"** 또는 **"One-off Command"** 옵션 사용
4. 명령어 입력: `npm run db:migrate`

---

### 3단계: 마이그레이션 확인

#### Railway Database 탭에서 확인

1. Railway 대시보드 → **Postgres** 서비스
2. **Database** 탭 클릭
3. 연결 완료 후 SQL 쿼리 실행:

```sql
-- 모든 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 마이그레이션 실행 기록 확인
SELECT * FROM "SequelizeMeta" ORDER BY name;
```

예상 결과: users, companies, customers, invoices 등 여러 테이블이 보여야 합니다.

---

### 4단계: 초기 데이터 시딩 (선택사항)

초기 데이터가 필요하면:

```bash
# Railway CLI 사용
railway run --service mvs-backend npm run db:seed

# 또는 Railway 대시보드 터미널에서
npm run db:seed
```

---

### 5단계: 서비스 재시작 및 테스트

#### 서비스 재시작

환경 변수를 추가한 후:
1. Railway 대시보드에서 각 서비스의 **"Restart"** 버튼 클릭
2. 또는 자동으로 재시작될 수 있음

#### 헬스체크 확인

**백엔드:**
```
https://your-backend-url.railway.app/health
```

예상 응답:
```json
{
  "status": "ok",
  "timestamp": "2024-01-01T00:00:00.000Z",
  "uptime": 123.45,
  "environment": "production"
}
```

**프론트엔드:**
```
https://your-frontend-url.railway.app
```

---

### 6단계: 기능 테스트

#### 필수 테스트 항목

1. **프론트엔드 접속**
   - [ ] 프론트엔드 URL 접속 성공
   - [ ] 로그인 페이지 표시

2. **API 연결 확인**
   - [ ] 브라우저 개발자 도구 → Network 탭
   - [ ] API 호출이 성공하는지 확인
   - [ ] CORS 오류가 없는지 확인

3. **로그인 기능**
   - [ ] 로그인 시도
   - [ ] 데이터베이스 연결 확인

4. **데이터 조회**
   - [ ] 대시보드 데이터 로드
   - [ ] 목록 페이지 데이터 표시

---

## 🚨 문제 해결

### 환경 변수 설정 후에도 작동 안 함
- 서비스 재시작 확인
- 환경 변수 이름 오타 확인
- 값이 올바르게 설정되었는지 확인

### 마이그레이션 실행 오류
- `DATABASE_URL` 환경 변수 확인
- Postgres 서비스가 "Online" 상태인지 확인
- 로그에서 구체적인 오류 메시지 확인

### CORS 오류
- 백엔드 `CORS_ORIGIN`에 프론트엔드 URL 추가
- 백엔드 재시작

### 데이터베이스 연결 실패
- Postgres 서비스 상태 확인
- `DATABASE_URL` 환경 변수 확인
- 백엔드 로그에서 연결 오류 확인

---

## ✅ 체크리스트

### 환경 변수 설정
- [ ] 백엔드: SESSION_SECRET 추가
- [ ] 백엔드: HOST 추가 (권장)
- [ ] 프론트엔드: REACT_APP_API_URL 추가

### 데이터베이스
- [ ] 마이그레이션 실행 (`npm run db:migrate`)
- [ ] 테이블 생성 확인
- [ ] 초기 데이터 시딩 (선택사항)

### 테스트
- [ ] 백엔드 헬스체크 통과
- [ ] 프론트엔드 접속 성공
- [ ] API 연결 성공
- [ ] 로그인 기능 테스트

---

## 📞 다음 단계 완료 후

모든 단계를 완료하면:
1. ✅ 애플리케이션이 정상 작동
2. ✅ 데이터베이스 연결 성공
3. ✅ 프론트엔드-백엔드 통신 성공

추가로 할 수 있는 것들:
- 커스텀 도메인 설정
- 모니터링 설정
- 백업 설정
- 성능 최적화

---

## 💡 빠른 참조

### Railway CLI 명령어
```bash
# 로그인
railway login

# 프로젝트 연결
railway link

# 마이그레이션 실행
railway run --service mvs-backend npm run db:migrate

# 로그 확인
railway logs --service mvs-backend
```

### 중요한 URL
- Railway 대시보드: https://railway.app
- 백엔드 헬스체크: `https://your-backend-url.railway.app/health`
- 프론트엔드: `https://your-frontend-url.railway.app`
