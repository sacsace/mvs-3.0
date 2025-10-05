# MVS 3.0 개발 스크립트 가이드

## 🚀 개발 서버 시작 스크립트들

### 1. **start-dev-servers.ps1** (권장)
```powershell
.\start-dev-servers.ps1
```
- **용도**: 하이브리드 개발 환경
- **데이터베이스**: Docker (PostgreSQL + Redis)
- **애플리케이션**: 로컬 (Node.js + React)
- **장점**: 빠른 개발, Hot Reload, 쉬운 디버깅

### 2. **start-docker-servers.ps1**
```powershell
.\start-docker-servers.ps1
```
- **용도**: 프로덕션 환경 테스트
- **모든 서비스**: Docker 컨테이너
- **장점**: 프로덕션과 동일한 환경

### 3. **start-database-only.ps1**
```powershell
.\start-database-only.ps1
```
- **용도**: 데이터베이스만 Docker로 실행
- **애플리케이션**: 수동으로 로컬에서 실행
- **장점**: 세밀한 제어 가능

### 4. **stop-servers.ps1**
```powershell
.\stop-servers.ps1
```
- **용도**: 모든 서버 중지
- **기능**: 로컬 프로세스 + Docker 컨테이너 모두 중지

## 📋 사용법

### **일반적인 개발 워크플로우**
1. **개발 시작**: `.\start-dev-servers.ps1`
2. **코드 수정**: 자동으로 서버 재시작됨
3. **브라우저 확인**: `http://localhost:3000`
4. **개발 완료**: `.\stop-servers.ps1`

### **프로덕션 테스트**
1. **Docker 환경**: `.\start-docker-servers.ps1`
2. **브라우저 확인**: `http://localhost`
3. **테스트 완료**: `.\stop-servers.ps1`

## 🔧 스크립트 기능

### **자동 처리 사항**
- ✅ 포트 충돌 확인 및 해결
- ✅ Docker 컨테이너 상태 확인
- ✅ 데이터베이스 연결 테스트
- ✅ 브라우저 자동 열기
- ✅ 컬러풀한 로그 출력
- ✅ UTF-8 인코딩 설정

### **서버 정보**
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:5000
- **데이터베이스**: PostgreSQL (Docker)
- **캐시**: Redis (Docker)

## 🛠️ 문제 해결

### **포트 충돌**
- 스크립트가 자동으로 해결합니다
- 수동 해결: `netstat -ano | findstr :3000`

### **Docker 오류**
- 컨테이너 재시작: `docker-compose restart`
- 완전 재시작: `docker-compose down && docker-compose up -d`

### **권한 오류**
- PowerShell 실행 정책: `Set-ExecutionPolicy -ExecutionPolicy RemoteSigned -Scope CurrentUser`

## 💡 팁

1. **개발 중**: `start-dev-servers.ps1` 사용
2. **배포 전**: `start-docker-servers.ps1`로 테스트
3. **디버깅**: 로컬 서버가 더 편리
4. **성능 테스트**: Docker 환경 사용
