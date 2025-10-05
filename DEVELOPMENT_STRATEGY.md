# MVS 3.0 - 개발 환경 가이드

## 🚀 배포 전략

### Railway 배포 (프로덕션)
- **Nixpacks 사용** - 빠르고 간단한 배포
- 도커 불필요 - Railway가 자동 처리

### 로컬 개발
- **선택적 도커 사용** - 데이터베이스/Redis만
- 애플리케이션은 직접 실행

## 📁 파일 구조

```
MVS 3.0/
├── nixpacks.toml          # Railway 배포 설정
├── docker-compose.yml     # 로컬 개발용 (DB/Redis)
├── msv-server/
│   ├── nixpacks.toml      # 백엔드 배포 설정
│   └── Dockerfile         # 백업용 (사용 안함)
└── msv-frontend/
    ├── nixpacks.toml      # 프론트엔드 배포 설정
    └── Dockerfile         # 백업용 (사용 안함)
```

## 🛠️ 개발 명령어

### 로컬 개발 (권장)
```bash
# 데이터베이스만 도커로 실행
docker-compose up postgres redis

# 애플리케이션 직접 실행
cd msv-server && npm run dev
cd msv-frontend && npm start
```

### 전체 도커 개발 (선택사항)
```bash
# 모든 서비스 도커로 실행
docker-compose up
```

### Railway 배포
```bash
# 자동 배포 (Git 푸시 시)
git push origin main

# 수동 배포
railway up
```

## ✅ 결론

- **Railway**: Nixpacks 사용 (도커 불필요)
- **로컬**: 선택적 도커 사용 (편의성)
- **최적화**: 빠른 배포 + 유연한 개발
