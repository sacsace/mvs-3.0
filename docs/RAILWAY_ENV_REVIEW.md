# Railway 환경 변수 설정 검토 결과

## ✅ 백엔드 (mvs-backend) - 10개 변수

### 올바르게 설정된 변수들
1. ✅ `CORS_ORIGIN`: `https://www.mvsystem.in` - 올바름
2. ✅ `DATABASE_URL`: Railway 자동 생성 - 올바름
3. ✅ `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_PORT`: Railway 자동 생성 - 올바름
4. ✅ `JWT_SECRET`: `mvs-super-secret-jwt-key-2025` - 설정됨 (기본값이 아니므로 좋음)
5. ✅ `NODE_ENV`: `production` - 올바름
6. ✅ `SESSION_SECRET`: `1595d1dd261b63dfc046d5a40d2ae38629b28855f0c1140c239345912098e655` - 올바름

### ⚠️ 확인 필요
1. ⚠️ `HOST` 변수가 보이지 않음
   - 기본값 `0.0.0.0`이 있지만 명시적 설정 권장
   - 추가 권장: `HOST=0.0.0.0`

### 🔍 CORS 설정 확인
- 현재: `CORS_ORIGIN=https://www.mvsystem.in`
- 프론트엔드 URL도 추가해야 할 수 있음
- 프론트엔드가 `https://mvs-frontend.railway.app`인 경우:
  ```
  CORS_ORIGIN=https://www.mvsystem.in,https://mvs-frontend.railway.app
  ```

---

## ❌ 프론트엔드 (mvs-frontend) - 4개 변수

### 올바르게 설정된 변수들
1. ✅ `CI`: `false` - 올바름
2. ✅ `NODE_ENV`: `production` - 올바름
3. ⚠️ `HOST`: `0.0.0.0` - 프론트엔드에는 필요 없을 수 있음 (문제는 아님)

### 🔴 심각한 문제 발견!

**`REACT_APP_API_URL`이 잘못 설정되었습니다!**

- ❌ 현재 설정: `https://mvs-frontend.railway.app/api`
- ✅ 올바른 설정: `https://mvs-backend.railway.app/api` (또는 실제 백엔드 URL)

**문제점:**
- 프론트엔드가 자신의 URL로 API를 호출하려고 함
- 백엔드 API가 프론트엔드에 없으므로 모든 API 호출이 실패함
- 로그인, 데이터 조회 등 모든 기능이 작동하지 않음

**해결 방법:**
1. Railway 대시보드 → mvs-backend → Settings에서 백엔드 URL 확인
2. 예: `https://mvs-backend-production.up.railway.app`
3. 프론트엔드 `REACT_APP_API_URL`을 다음으로 변경:
   ```
   https://mvs-backend-production.up.railway.app/api
   ```

**또는 Railway 변수 참조 사용 (권장):**
```
REACT_APP_API_URL=${{mvs-backend.RAILWAY_PUBLIC_DOMAIN}}/api
```

---

## 📊 종합 검토 결과

### ✅ 정상 설정
- 백엔드 보안 변수 (JWT_SECRET, SESSION_SECRET)
- 데이터베이스 연결 변수
- 기본 환경 설정

### ⚠️ 수정 필요
1. **프론트엔드 REACT_APP_API_URL** (긴급)
   - 현재: `https://mvs-frontend.railway.app/api` ❌
   - 변경: `https://mvs-backend.railway.app/api` ✅

2. **백엔드 CORS_ORIGIN** (권장)
   - 프론트엔드 URL 추가 고려

3. **백엔드 HOST** (권장)
   - 명시적 설정 권장

---

## 🚨 우선순위별 수정 사항

### 🔴 긴급 (즉시 수정)
1. **프론트엔드 REACT_APP_API_URL 수정**
   - 현재 값 삭제 후 올바른 백엔드 URL로 변경
   - 또는 Railway 변수 참조 사용

### 🟡 권장 (곧 수정)
2. **백엔드 CORS_ORIGIN에 프론트엔드 URL 추가**
   - 여러 도메인 허용: `https://www.mvsystem.in,https://mvs-frontend.railway.app`

3. **백엔드 HOST 변수 추가**
   - `HOST=0.0.0.0`

---

## 📝 수정 가이드

### 1. 프론트엔드 REACT_APP_API_URL 수정

Railway 대시보드 → mvs-frontend → Variables:

1. 기존 `REACT_APP_API_URL` 변수 찾기
2. "Edit" 클릭
3. 값 변경:
   ```
   https://mvs-backend-production.up.railway.app/api
   ```
   (실제 백엔드 URL로 변경)

4. 또는 Railway 변수 참조 사용:
   ```
   ${{mvs-backend.RAILWAY_PUBLIC_DOMAIN}}/api
   ```

### 2. 백엔드 CORS_ORIGIN 업데이트 (선택사항)

Railway 대시보드 → mvs-backend → Variables:

1. `CORS_ORIGIN` 변수 찾기
2. "Edit" 클릭
3. 값 변경:
   ```
   https://www.mvsystem.in,https://mvs-frontend.railway.app
   ```

### 3. 백엔드 HOST 추가 (선택사항)

Railway 대시보드 → mvs-backend → Variables:

1. "New Variable" 클릭
2. Name: `HOST`
3. Value: `0.0.0.0`

---

## ✅ 수정 후 확인 사항

1. 프론트엔드 재배포 (환경 변수 변경 후 자동 재배포)
2. 브라우저 개발자 도구 → Network 탭에서 API 호출 확인
3. API 호출이 올바른 백엔드 URL로 가는지 확인
4. CORS 오류가 없는지 확인

---

## 🎯 요약

**가장 중요한 문제:**
- ❌ 프론트엔드 `REACT_APP_API_URL`이 잘못 설정됨
- ✅ 즉시 수정 필요 (모든 API 호출이 실패함)

**기타:**
- ✅ 백엔드 설정은 대체로 올바름
- ⚠️ CORS와 HOST는 선택적으로 개선 가능
