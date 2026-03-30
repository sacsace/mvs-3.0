# Railway 배포 크래시 분석 (빌드 성공 후)

## 🔍 로그 분석

**로그 내용:**
```
=== Successfully Built! ===
Build time: 235.60 seconds
Deploy complete
Deploy crashed
```

**의미:**
- ✅ **빌드는 성공** - "Successfully Built!" 메시지
- ✅ **배포 완료** - "Deploy complete" 메시지
- ❌ **시작 실패** - "Deploy crashed" 메시지

**문제:**
- 빌드는 성공했지만 **시작 명령(startCommand)**이 실패
- 서비스가 시작되자마자 즉시 종료

---

## 🔴 가능한 원인

### 1. 시작 명령 오류 (가장 가능성 높음)

**문제:**
- `npm run start:railway` 명령이 실패
- `npx serve -s build`가 `build` 폴더를 찾지 못함
- 포트 바인딩 실패

**확인:**
배포 로그(Deploy Logs)에서 시작 단계 확인:
```
[start]
Error: ENOENT: no such file or directory, open 'build/index.html'
또는
Error: Cannot find module 'serve'
또는
Error: listen EADDRINUSE
```

---

### 2. 빌드 폴더 경로 문제

**문제:**
- 빌드는 성공했지만 `build` 폴더가 다른 위치에 생성됨
- 시작 명령이 `build` 폴더를 찾지 못함

**확인:**
- 빌드 로그에서 `build` 폴더 생성 위치 확인
- 시작 명령이 올바른 경로를 참조하는지 확인

---

### 3. 포트 바인딩 실패

**문제:**
- `PORT` 환경 변수가 제대로 전달되지 않음
- 포트가 이미 사용 중이거나 바인딩 실패

**확인:**
- `PORT` 환경 변수 확인
- 포트 바인딩 오류 메시지 확인

---

### 4. 의존성 문제

**문제:**
- `serve` 패키지가 설치되지 않음
- 런타임 의존성이 누락됨

**확인:**
- `package.json`에 `serve` 패키지가 있는지 확인
- `npm ci`가 성공했는지 확인

---

## 🔧 해결 방법

### 1. 배포 로그 확인 (가장 중요!)

**Railway 대시보드에서:**
1. **mvs-frontend** 서비스 선택
2. **Deployments** 탭 클릭
3. 최신 배포(CRASHED) 클릭
4. **"Deploy Logs"** 탭 클릭
5. 시작 단계 로그 확인

**확인할 내용:**
- 시작 명령이 실행되었는지
- 구체적인 오류 메시지
- `build` 폴더를 찾았는지
- 포트 바인딩이 성공했는지

---

### 2. 시작 명령 확인

**현재 설정:**
- `railway.toml`: `startCommand = "npm run start:railway"`
- `package.json`: `"start:railway": "npx serve -s build -l ${PORT:-3000}"`

**문제 가능성:**
- npm 스크립트에서 `${PORT:-3000}`가 제대로 해석되지 않을 수 있음
- Railway 환경에서 환경 변수 참조 문제

**해결:**
- `serve` 패키지가 `PORT` 환경 변수를 자동으로 읽도록 수정
- 또는 명시적으로 포트 지정

---

### 3. 빌드 폴더 확인

**확인:**
- 빌드 로그에서 `build` 폴더 생성 확인
- `build/index.html` 파일이 있는지 확인

**문제:**
- 빌드는 성공했지만 `build` 폴더가 다른 위치에 생성됨
- 시작 명령이 올바른 경로를 참조하지 않음

---

## 🚨 일반적인 오류 메시지

### 오류 1: 빌드 폴더 없음
```
Error: ENOENT: no such file or directory, open 'build/index.html'
```

**원인:**
- 빌드 폴더가 생성되지 않았거나 다른 위치에 있음

**해결:**
- 빌드 로그에서 `build` 폴더 생성 확인
- 시작 명령이 올바른 경로를 참조하는지 확인

---

### 오류 2: serve 패키지 없음
```
Error: Cannot find module 'serve'
```

**원인:**
- `serve` 패키지가 설치되지 않음
- `npm ci`가 실패했을 수 있음

**해결:**
- `package.json`에 `serve` 패키지 확인
- `npm ci` 로그 확인

---

### 오류 3: 포트 바인딩 실패
```
Error: listen EADDRINUSE: address already in use :::3000
```

**원인:**
- 포트가 이미 사용 중이거나
- `PORT` 환경 변수가 제대로 전달되지 않음

**해결:**
- `PORT` 환경 변수 확인
- 시작 명령에서 포트 설정 확인

---

## 🔍 단계별 진단

### 1단계: 배포 로그 확인
- Railway 대시보드 → mvs-frontend → Deployments → Deploy Logs
- 시작 단계 로그 확인
- 구체적인 오류 메시지 확인

### 2단계: 빌드 로그 확인
- 빌드가 정상적으로 완료되었는지 확인
- `build` 폴더가 생성되었는지 확인

### 3단계: 시작 명령 확인
- `railway.toml`의 `startCommand` 확인
- `package.json`의 `start:railway` 스크립트 확인
- 환경 변수 참조가 올바른지 확인

---

## 💡 빠른 해결 방법

### 방법 1: 시작 명령 수정

`package.json`의 `start:railway` 스크립트를 수정:

```json
"start:railway": "npx serve -s build"
```

`serve` 패키지는 `PORT` 환경 변수를 자동으로 읽을 수 있습니다.

또는:

```json
"start:railway": "PORT=${PORT:-3000} npx serve -s build -l ${PORT:-3000}"
```

### 방법 2: nixpacks.toml 사용

`railway.toml`의 `startCommand`를 제거하고 `nixpacks.toml`의 `[start] cmd`만 사용:

```toml
# railway.toml
[deploy]
# startCommand 제거
healthcheckPath = "/"
```

```toml
# nixpacks.toml
[start]
cmd = "npx serve -s build -l $PORT"
```

---

## 📝 체크리스트

### 배포 로그 확인
- [ ] Deploy Logs 탭 확인
- [ ] 시작 단계 로그 확인
- [ ] 구체적인 오류 메시지 확인

### 설정 확인
- [ ] `railway.toml`의 `startCommand` 확인
- [ ] `package.json`의 `start:railway` 확인
- [ ] `nixpacks.toml`의 `[start] cmd` 확인

### 빌드 확인
- [ ] 빌드가 성공했는지 확인
- [ ] `build` 폴더가 생성되었는지 확인
- [ ] `build/index.html` 파일이 있는지 확인

---

## 🎯 다음 단계

1. **Railway 배포 로그 확인** (가장 중요!)
   - Deploy Logs 탭에서 시작 단계 로그 확인
   - 구체적인 오류 메시지 확인

2. **오류에 따라 수정**
   - 빌드 폴더 없음 → 빌드 경로 확인
   - serve 패키지 없음 → 의존성 확인
   - 포트 바인딩 실패 → 포트 설정 확인

3. **재배포**
   - 수정 후 자동 재배포 또는 수동 재배포
   - 로그에서 성공 메시지 확인

---

## 💬 로그 확인 후 알려주세요

Railway 대시보드에서 **Deploy Logs**를 확인한 후, 다음을 알려주세요:
- 시작 단계에서 어떤 메시지가 나오는지
- 마지막 오류 메시지가 무엇인지
- `build` 폴더를 찾았는지

이 정보를 바탕으로 정확한 해결 방법을 제시할 수 있습니다.
