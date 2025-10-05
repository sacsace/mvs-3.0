# MVS 3.0 개발 가이드

## 🚀 빠른 시작 (도커 없이)

### 1. 개발 환경 설정
```powershell
# 개발용 데이터베이스만 도커로 실행
.\setup-dev-db.ps1

# 개발 서버 시작
.\dev-start.ps1
```

### 2. 수동 실행
```powershell
# 백엔드 서버 (Hot Reload)
cd msv-server
npm run dev

# 프론트엔드 서버 (Hot Reload)
cd msv-frontend
npm start
```

## 🔧 개발 환경 구성

### 필요한 서비스
- **PostgreSQL**: 포트 5432
- **Redis**: 포트 6379
- **Node.js**: 20.x 이상

### 접속 URL
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:5000

## 📁 프로젝트 구조

```
MVS 3.0/
├── msv-server/          # 백엔드 API 서버
│   ├── src/             # 소스 코드
│   ├── package.json     # 의존성 및 스크립트
│   └── env.development  # 개발용 환경 변수
├── msv-frontend/        # 프론트엔드 React 앱
│   ├── src/             # 소스 코드
│   └── package.json     # 의존성 및 스크립트
├── docker-compose.dev.yml # 개발용 도커 설정
├── dev-start.ps1        # 개발 서버 시작 스크립트
└── setup-dev-db.ps1     # 데이터베이스 설정 스크립트
```

## 🛠️ 개발 워크플로우

### 1. 코드 변경 시
- **백엔드**: `nodemon`이 자동으로 서버 재시작
- **프론트엔드**: React의 Hot Reload로 즉시 반영

### 2. 데이터베이스 변경 시
```powershell
cd msv-server
npm run db:migrate
npm run db:seed
```

### 3. 의존성 추가 시
```powershell
# 백엔드
cd msv-server
npm install package-name

# 프론트엔드
cd msv-frontend
npm install package-name
```

## 🐳 도커 사용 (선택사항)

### 전체 애플리케이션 도커 실행
```powershell
docker-compose up --build
```

### 데이터베이스만 도커 실행 (권장)
```powershell
docker-compose -f docker-compose.dev.yml up -d
```

## 🔍 디버깅

### 백엔드 디버깅
- VS Code에서 `F5`로 디버깅 시작
- 브레이크포인트 설정 가능
- 콘솔 로그 확인

### 프론트엔드 디버깅
- 브라우저 개발자 도구 사용
- React DevTools 확장 프로그램 권장
- 네트워크 탭에서 API 호출 확인

## 📝 테스트

### 백엔드 테스트
```powershell
cd msv-server
npm test              # 단일 실행
npm run test:watch    # 감시 모드
npm run test:coverage # 커버리지 포함
```

### 프론트엔드 테스트
```powershell
cd msv-frontend
npm test
```

## 🚀 배포

### 프로덕션 빌드
```powershell
# 백엔드
cd msv-server
npm run build

# 프론트엔드
cd msv-frontend
npm run build
```

### 도커 배포
```powershell
docker-compose up --build
```

## 💡 개발 팁

1. **Hot Reload 활용**: 코드 변경 시 자동 재시작으로 빠른 개발
2. **환경 변수**: `.env` 파일로 설정 관리
3. **데이터베이스**: 개발용으로는 도커 사용 권장
4. **API 테스트**: Postman 또는 브라우저 개발자 도구 활용
5. **코드 품질**: ESLint와 Prettier 설정 활용

## 🆘 문제 해결

### 포트 충돌
```powershell
# 포트 사용 중인 프로세스 확인
netstat -ano | findstr :3000
netstat -ano | findstr :5000

# 프로세스 종료
taskkill /PID <PID> /F
```

### 데이터베이스 연결 실패
```powershell
# 도커 컨테이너 상태 확인
docker ps

# 로그 확인
docker logs mvs-3.0-postgres-dev
docker logs mvs-3.0-redis-dev
```

### 의존성 문제
```powershell
# node_modules 삭제 후 재설치
Remove-Item -Recurse -Force node_modules
npm install
```
