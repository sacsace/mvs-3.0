# 프론트엔드 API URL 오류 해결 가이드

## 🔴 문제 발견

**에러 메시지:**
```
네트워크 오류: 백엔드 서버 (http://localhost:3001)에 연결할 수 없습니다. 
서버가 실행 중인지 확인해주세요.
```

**의미:**
- 프론트엔드가 `localhost:3001`로 API를 호출하려고 함
- Railway 배포 환경에서는 실제 백엔드 URL을 사용해야 함
- 빌드 시점에 `REACT_APP_API_URL` 환경 변수가 설정되지 않았음

---

## 🔍 원인 분석

### React 환경 변수 동작 방식

1. **빌드 시점에 번들에 포함됨**
   - `REACT_APP_*` 환경 변수는 빌드 시점에 JavaScript 번들에 포함됨
   - 런타임에 변경할 수 없음
   - 따라서 빌드 시점에 올바른 값이 설정되어 있어야 함

2. **현재 문제**
   - `nixpacks.toml`의 `[env]` 섹션은 런타임 환경 변수만 설정
   - 빌드 시점에 `REACT_APP_API_URL`이 설정되지 않음
   - 코드가 기본값인 `localhost:5000/api` 또는 `localhost:3001`을 사용

3. **에러 메시지의 `localhost:3001`**
   - 코드에서 `localhost:5000`을 사용하도록 되어 있지만
   - 다른 곳에서 `localhost:3001`을 사용하고 있을 수 있음
   - 또는 브라우저가 자동으로 포트를 변경했을 수 있음

---

## ✅ 해결 방법

### 방법 1: nixpacks.toml 수정 (빌드 시점 환경 변수 설정)

**수정된 `nixpacks.toml`:**
```toml
[phases.build]
cmds = [
  "unset CI",
  "export CI=false",
  "export GENERATE_SOURCEMAP=false",
  "export REACT_APP_API_URL=${REACT_APP_API_URL:-https://mvs-backend-production.up.railway.app/api}",
  "npm run build"
]
```

**의미:**
- 빌드 시점에 `REACT_APP_API_URL` 환경 변수를 export
- Railway 환경 변수가 있으면 사용, 없으면 기본값 사용
- 기본값은 백엔드 URL (실제 백엔드 URL로 변경 필요)

---

### 방법 2: Railway 대시보드에서 환경 변수 설정 (필수)

**Railway 대시보드에서:**
1. **mvs-frontend** 서비스 선택
2. **Variables** 탭 클릭
3. **New Variable** 클릭
4. 다음 설정 추가:

```
Name: REACT_APP_API_URL
Value: https://your-backend-url.railway.app/api
```

**백엔드 URL 확인 방법:**
1. Railway 대시보드 → **mvs-backend** 서비스 선택
2. **Settings** 탭 클릭
3. **"Generate Domain"** 클릭 또는 기존 도메인 확인
4. 예: `https://mvs-backend-production.up.railway.app`
5. API URL: `https://mvs-backend-production.up.railway.app/api`

---

### 방법 3: Railway 변수 참조 사용 (권장)

**Railway 대시보드에서:**
```
Name: REACT_APP_API_URL
Value: ${{mvs-backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

**장점:**
- 백엔드 URL이 변경되어도 자동으로 업데이트됨
- 수동으로 URL을 관리할 필요 없음

---

## 🔧 단계별 해결 가이드

### 1단계: 백엔드 URL 확인

1. Railway 대시보드 접속
2. **mvs-backend** 서비스 선택
3. **Settings** 탭 클릭
4. 도메인 확인 또는 생성
5. 백엔드 URL 기록
   - 예: `https://mvs-backend-production.up.railway.app`
   - API URL: `https://mvs-backend-production.up.railway.app/api`

---

### 2단계: 프론트엔드 환경 변수 설정

1. Railway 대시보드 → **mvs-frontend** 서비스 선택
2. **Variables** 탭 클릭
3. **New Variable** 클릭
4. 다음 설정:

```
Name: REACT_APP_API_URL
Value: https://mvs-backend-production.up.railway.app/api
```

(실제 백엔드 URL로 변경)

5. **Save** 클릭

---

### 3단계: nixpacks.toml 수정 (이미 완료됨)

`nixpacks.toml`의 빌드 명령에 `REACT_APP_API_URL` 환경 변수 추가됨

---

### 4단계: 재배포

1. Railway 대시보드에서 **mvs-frontend** 서비스 선택
2. **Deployments** 탭 클릭
3. **"Redeploy"** 클릭
4. 배포 완료 대기

---

### 5단계: 확인

1. 브라우저에서 프론트엔드 URL 접속
2. 개발자 도구 (F12) → **Console** 탭 열기
3. 다음 메시지 확인:
   ```
   🔧 환경 변수에서 API URL 사용: https://mvs-backend-production.up.railway.app/api
   ```
4. 로그인 시도
5. 에러 메시지가 사라졌는지 확인

---

## 📊 확인 방법

### 브라우저 개발자 도구에서 확인

**Console 탭:**
```javascript
// 다음 메시지가 보여야 함:
🔧 환경 변수에서 API URL 사용: https://your-backend-url.railway.app/api
```

**Network 탭:**
- API 호출이 올바른 백엔드 URL로 가는지 확인
- `localhost`가 아닌 실제 Railway URL인지 확인

---

## 🎯 체크리스트

### Railway 대시보드 설정
- [ ] 백엔드 URL 확인 (`mvs-backend` → Settings)
- [ ] 프론트엔드 환경 변수 추가 (`mvs-frontend` → Variables)
- [ ] `REACT_APP_API_URL` 설정
- [ ] 값이 올바른 백엔드 URL인지 확인

### 코드 수정
- [x] `nixpacks.toml` 빌드 명령 수정 (완료)
- [ ] 재배포

### 확인
- [ ] 재배포 완료
- [ ] 브라우저에서 프론트엔드 접속
- [ ] Console에서 올바른 API URL 확인
- [ ] 로그인 시도
- [ ] 에러 메시지가 사라졌는지 확인

---

## 💡 참고사항

### React 환경 변수 규칙

1. **`REACT_APP_*` 접두사 필수**
   - `REACT_APP_API_URL` ✅
   - `API_URL` ❌ (무시됨)

2. **빌드 시점에 번들에 포함**
   - 런타임에 변경 불가
   - 빌드 시점에 올바른 값 설정 필수

3. **환경 변수 확인 방법**
   ```javascript
   console.log('REACT_APP_API_URL:', process.env.REACT_APP_API_URL);
   ```

---

## 🚨 주의사항

### 백엔드 URL 형식

**올바른 형식:**
```
https://mvs-backend-production.up.railway.app/api
```

**잘못된 형식:**
```
https://mvs-backend-production.up.railway.app/api/  (끝에 슬래시)
http://mvs-backend-production.up.railway.app/api   (http 사용)
mvs-backend-production.up.railway.app/api          (프로토콜 없음)
```

### CORS 설정 확인

백엔드의 `CORS_ORIGIN` 환경 변수에 프론트엔드 URL이 포함되어 있는지 확인:
```
CORS_ORIGIN=https://mvs-frontend-production.up.railway.app
```

또는 여러 도메인:
```
CORS_ORIGIN=https://mvs-frontend-production.up.railway.app,https://www.mvsystem.in
```

---

## 📝 요약

**문제:**
- 프론트엔드가 `localhost:3001`로 API 호출
- 빌드 시점에 `REACT_APP_API_URL` 환경 변수가 설정되지 않음

**해결:**
1. ✅ `nixpacks.toml` 빌드 명령 수정 (완료)
2. ⏳ Railway 대시보드에서 `REACT_APP_API_URL` 환경 변수 설정
3. ⏳ 재배포
4. ⏳ 확인

**다음 단계:**
1. Railway 대시보드에서 백엔드 URL 확인
2. 프론트엔드에 `REACT_APP_API_URL` 환경 변수 추가
3. 재배포
4. 브라우저에서 확인
