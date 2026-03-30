# 프론트엔드 설정값 문제 분석

## 🔍 현재 설정 확인

### Railway 환경 변수 (정상)
- ✅ `CI`: `false` - 올바름
- ✅ `HOST`: `0.0.0.0` - 문제 없음 (하지만 프론트엔드에는 필요 없을 수 있음)
- ✅ `NODE_ENV`: `production` - 올바름
- ✅ `REACT_APP_API_URL`: `https://mvs-backend-production.up.railway.app/api` - 올바름

### 설정 파일 확인

#### railway.toml
```toml
startCommand = "npm run start:railway"
PORT = "$PORT"
```

#### nixpacks.toml
```toml
[start]
cmd = "npx serve -s build -l $PORT"
```

#### package.json
```json
"start:railway": "npx serve -s build -l ${PORT:-3000}"
```

---

## ⚠️ 발견된 문제점

### 1. 설정 파일 충돌 가능성

**문제:**
- `railway.toml`에 `startCommand = "npm run start:railway"` 설정
- `nixpacks.toml`에 `[start] cmd = "npx serve -s build -l $PORT"` 설정
- 두 설정이 충돌할 수 있음

**Railway 동작:**
- Railway는 `railway.toml`의 `startCommand`를 우선 사용
- 하지만 `nixpacks.toml`의 `[start] cmd`도 있으면 혼란 가능

**해결:**
- `nixpacks.toml`의 `[start] cmd`를 제거하거나
- `railway.toml`의 `startCommand`를 제거하고 `nixpacks.toml`만 사용

---

### 2. HOST 환경 변수 (불필요)

**문제:**
- `HOST: 0.0.0.0`이 설정되어 있음
- `serve` 패키지는 자동으로 `0.0.0.0`에 바인딩
- 프론트엔드에는 필요 없음

**영향:**
- 직접적인 문제는 아니지만 불필요한 설정

---

### 3. 포트 설정 불일치

**문제:**
- `package.json`: `npx serve -s build -l ${PORT:-3000}`
- `nixpacks.toml`: `npx serve -s build -l $PORT`
- Railway 환경 변수: `PORT = "$PORT"`

**확인 필요:**
- Railway가 실제로 `PORT` 환경 변수를 제공하는지
- `$PORT`가 제대로 해석되는지

---

## 🔧 해결 방법

### 방법 1: nixpacks.toml의 [start] cmd 제거 (권장)

Railway가 `railway.toml`의 `startCommand`를 사용하므로, `nixpacks.toml`의 `[start]` 섹션을 제거:

```toml
# nixpacks.toml
[phases.setup]
nixPkgs = ["nodejs", "npm"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["unset CI; export CI=false; export GENERATE_SOURCEMAP=false; npm run build"]

# [start] 섹션 제거 - railway.toml의 startCommand 사용
```

### 방법 2: railway.toml의 startCommand 제거

`nixpacks.toml`의 `[start] cmd`를 사용하려면 `railway.toml`의 `startCommand` 제거:

```toml
# railway.toml
[build]
builder = "nixpacks"

[deploy]
# startCommand 제거 - nixpacks.toml의 [start] cmd 사용
healthcheckPath = "/"
healthcheckTimeout = 300
```

---

## 🎯 가장 가능성 높은 문제

### 빌드 폴더 없음

**설정값 자체는 문제가 아닐 수 있지만:**
- 빌드가 실패했을 가능성
- `build` 폴더가 생성되지 않았을 가능성
- `npx serve -s build`가 `build` 폴더를 찾지 못해 즉시 종료

**확인 방법:**
Railway 배포 로그에서:
1. 빌드 단계 확인
   - "Compiled successfully!" 메시지 확인
   - "Failed to compile" 메시지 확인

2. 시작 단계 확인
   - "Error: ENOENT: no such file or directory, open 'build/index.html'" 확인

---

## ✅ 권장 수정 사항

### 1. nixpacks.toml 수정

`[start]` 섹션을 제거하고 `railway.toml`의 `startCommand`만 사용:

```toml
# nixpacks.toml
[phases.setup]
nixPkgs = ["nodejs", "npm"]

[phases.install]
cmds = ["npm ci"]

[phases.build]
cmds = ["unset CI; export CI=false; export GENERATE_SOURCEMAP=false; npm run build"]

# [start] 섹션 제거
```

### 2. package.json의 start:railway 확인

현재 설정이 올바른지 확인:
```json
"start:railway": "npx serve -s build -l ${PORT:-3000}"
```

### 3. HOST 환경 변수 제거 (선택사항)

프론트엔드에는 필요 없으므로 제거 가능:
- Railway 대시보드 → mvs-frontend → Variables
- `HOST` 변수 삭제

---

## 🔍 확인해야 할 것

### 1. Railway 배포 로그 확인 (가장 중요!)

배포 로그에서 다음을 확인:
- 빌드가 성공했는지
- `build` 폴더가 생성되었는지
- 시작 명령이 실행되었는지
- 구체적인 오류 메시지

### 2. 설정 파일 우선순위 확인

Railway가 어떤 설정 파일을 사용하는지 확인:
- `railway.toml`의 `startCommand`가 우선인지
- `nixpacks.toml`의 `[start] cmd`가 우선인지

---

## 📝 요약

### 설정값 자체의 문제
- ❌ 직접적인 문제는 아님
- ⚠️ 설정 파일 충돌 가능성
- ⚠️ 불필요한 설정 (HOST)

### 실제 문제
- 🔴 **빌드 폴더 없음** (가장 가능성 높음)
- 🔴 **빌드 실패**
- 🔴 **시작 명령 오류**

### 다음 단계
1. **Railway 배포 로그 확인** (가장 중요!)
2. 구체적인 오류 메시지 확인
3. 설정 파일 충돌 해결
4. 재배포

---

## 💡 결론

**설정값 자체는 대부분 올바르지만:**
- 설정 파일 충돌 가능성 있음
- 실제 문제는 빌드 폴더 없음 또는 빌드 실패일 가능성이 높음

**Railway 배포 로그를 확인하여 정확한 원인을 파악하는 것이 가장 중요합니다.**
