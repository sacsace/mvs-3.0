# MVS 3.0 - 차세대 기업용 통합 업무 관리 시스템

## 🚀 프로젝트 개요

MVS 3.0은 React, Node.js, PostgreSQL을 기반으로 한 차세대 기업용 통합 업무 관리 시스템입니다. 모듈화된 아키텍처, 실시간 협업, AI 통합, 클라우드 네이티브 설계를 특징으로 합니다.

## 🏗️ 시스템 아키텍처

### 기술 스택
- **Frontend**: React 18, TypeScript, Material-UI v5, Vite
- **Backend**: Node.js 20, Express, Sequelize ORM, Socket.io
- **Database**: PostgreSQL 15, Redis
- **Infrastructure**: Docker, Kubernetes, Railway, AWS
- **Monitoring**: Prometheus, Grafana, ELK Stack

### 핵심 기능
- 🔐 **다중 테넌트 아키텍처** - 완전한 데이터 격리
- 👥 **사용자 기반 권한 관리** - 세밀한 접근 제어
- 🤖 **AI 통합** - 메뉴 추천, 수요 예측, 챗봇
- 📱 **실시간 협업** - WebSocket 기반 실시간 통신
- 🌐 **다국어 지원** - 한국어/영어 i18n
- 📊 **실시간 모니터링** - Prometheus + Grafana
- 🔒 **엔터프라이즈 보안** - 네트워크 정책, 암호화

## 📁 프로젝트 구조

```
MVS 3.0/
├── msv-server/                 # 백엔드 서버
│   ├── src/
│   │   ├── config/            # 데이터베이스 설정
│   │   ├── migrations/        # DB 마이그레이션
│   │   ├── models/            # Sequelize 모델
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
├── msv-frontend/              # 프론트엔드 앱
│   ├── src/
│   │   ├── components/        # React 컴포넌트
│   │   ├── pages/            # 페이지 컴포넌트
│   │   ├── store/            # Zustand 상태 관리
│   │   ├── services/         # API 서비스
│   │   └── ...
│   ├── Dockerfile
│   └── package.json
├── k8s/                      # Kubernetes 설정
│   ├── namespace.yaml
│   ├── postgres-config.yaml
│   ├── backend-deployment.yaml
│   ├── frontend-deployment.yaml
│   ├── monitoring/           # 모니터링 설정
│   └── security/            # 보안 설정
├── scripts/                  # 배포 및 관리 스크립트
│   ├── deploy-dev.ps1       # 개발 환경 배포
│   ├── deploy-prod.ps1      # 운영 환경 배포
│   ├── health-check.ps1     # 헬스체크
│   └── backup.ps1           # 백업
└── docker-compose.yml       # 개발 환경 Docker Compose
```

## 🚀 빠른 시작

### 1. 개발 환경 설정

```powershell
# 저장소 클론
git clone <repository-url>
cd MVS-3.0

# 개발 환경 시작
.\scripts\deploy-dev.ps1 -Build

# 또는 Docker Compose 사용
docker-compose up -d
```

### 2. 운영 환경 배포

```powershell
# 전체 배포 (권장)
.\scripts\deploy-all.ps1 -Environment production -Build -Push -Monitor -Backup

# 또는 개별 배포
.\scripts\deploy-prod.ps1 -Version v1.0.0 -Build -Push
```

### 3. 접속 정보

- **개발 환경**: http://localhost:3000
- **운영 환경**: https://mvs.local
- **API**: https://api.mvs.local
- **모니터링**: 
  - Prometheus: `kubectl port-forward -n mvs-system service/prometheus-service 9090:9090`
  - Grafana: `kubectl port-forward -n mvs-system service/grafana-service 3000:3000`

## 🔧 개발 가이드

### 백엔드 개발

```powershell
cd msv-server

# 의존성 설치
npm install

# 개발 서버 시작
npm run dev

# 데이터베이스 마이그레이션
npm run db:migrate

# 테스트 실행
npm test
```

### 프론트엔드 개발

```powershell
cd msv-frontend

# 의존성 설치
npm install

# 개발 서버 시작
npm start

# 빌드
npm run build

# 테스트 실행
npm test
```

## 📊 모니터링 및 로깅

### Prometheus 메트릭
- HTTP 요청 수, 응답 시간, 에러율
- 데이터베이스 연결 상태
- Redis 캐시 성능
- Pod 리소스 사용량

### Grafana 대시보드
- 실시간 시스템 상태
- 성능 메트릭 시각화
- 알림 설정

### ELK Stack 로깅
- 애플리케이션 로그 수집
- 중앙화된 로그 관리
- 로그 분석 및 검색

## 🔒 보안

### 네트워크 보안
- Kubernetes Network Policies
- 서비스 간 통신 제한
- 외부 접근 제어

### 데이터 보안
- 데이터베이스 암호화
- JWT 토큰 기반 인증
- 다중 테넌트 데이터 격리

### 모니터링
- 보안 이벤트 로깅
- 비정상 접근 탐지
- 정기 보안 감사

## 🚀 배포

### CI/CD 파이프라인
- GitHub Actions 기반 자동화
- 코드 품질 검사 (ESLint, 테스트)
- Docker 이미지 빌드 및 푸시
- 자동 배포 (개발/운영)

### 환경별 배포
- **Development**: 로컬 개발 환경
- **Staging**: 테스트 환경
- **Production**: 운영 환경

### 롤백 및 복구
- 자동 롤백 기능
- 백업 및 복구 스크립트
- 헬스체크 기반 자동 복구

## 📈 성능 최적화

### 프론트엔드
- 코드 스플리팅
- 지연 로딩
- 이미지 최적화
- 캐싱 전략

### 백엔드
- 데이터베이스 인덱싱
- Redis 캐싱
- API 응답 최적화
- 연결 풀링

### 인프라
- Kubernetes HPA (자동 스케일링)
- 리소스 제한 및 요청
- 네트워크 최적화

## 🛠️ 유지보수

### 정기 작업
```powershell
# 헬스체크
.\scripts\health-check.ps1 -Environment production -Detailed

# 백업
.\scripts\backup.ps1 -All -RetentionDays 30

# 로그 확인
kubectl logs -n mvs-system -l app=mvs-backend --tail=100
```

### 문제 해결
1. **서비스 다운**: `kubectl get pods -n mvs-system`
2. **성능 이슈**: Grafana 대시보드 확인
3. **로그 분석**: Kibana에서 로그 검색
4. **데이터베이스**: `kubectl exec -n mvs-system -it <postgres-pod> -- psql -U mvs_user -d mvs_db`

## 📚 API 문서

### 인증
- JWT 토큰 기반 인증
- 역할 기반 접근 제어 (RBAC)
- 다중 테넌트 지원

### 주요 엔드포인트
- `POST /api/auth/login` - 로그인
- `GET /api/users` - 사용자 목록
- `GET /api/menus` - 메뉴 목록
- `GET /api/health` - 헬스체크

## 🤝 기여하기

1. Fork the Project
2. Create your Feature Branch (`git checkout -b feature/AmazingFeature`)
3. Commit your Changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the Branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 라이선스

이 프로젝트는 MIT 라이선스 하에 배포됩니다. 자세한 내용은 `LICENSE` 파일을 참조하세요.

## 📞 지원

- **문서**: [Wiki](https://github.com/your-repo/wiki)
- **이슈**: [GitHub Issues](https://github.com/your-repo/issues)
- **이메일**: support@mvs.local

## 🎯 로드맵

### v3.1 (예정)
- [ ] AI 기능 확장
- [ ] 모바일 앱 개발
- [ ] 고급 분석 대시보드

### v3.2 (예정)
- [ ] 마이크로서비스 아키텍처
- [ ] 이벤트 소싱
- [ ] CQRS 패턴

---

**MVS 3.0** - 차세대 기업용 통합 업무 관리 시스템으로 비즈니스의 디지털 전환을 가속화하세요! 🚀