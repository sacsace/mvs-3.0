# MVS 3.0 개발 프롬프트

## 🎯 **프로젝트 개요**
MVS 3.0은 React + Node.js + PostgreSQL 기반의 **차세대 기업용 통합 업무 관리 시스템**입니다.

## 🏗️ **시스템 아키텍처**

### **핵심 특징**
- **모듈화된 아키텍처**: 독립적인 마이크로서비스 구조
- **실시간 협업**: WebSocket 기반 실시간 알림 및 채팅
- **AI 통합**: 스마트 분석 및 자동화 기능
- **클라우드 네이티브**: Kubernetes 기반 확장 가능한 인프라
- **다중 테넌트**: 여러 회사 독립 운영 지원
- **데이터 격리**: 회사별 완전한 데이터 분리 및 보안
- **사용자별 권한**: 개별 사용자 메뉴 권한 세밀 제어

### **기술 스택**
- **Frontend**: React 18, TypeScript, Material-UI v5, Vite, Zustand
- **Backend**: Node.js 20, Express, Sequelize ORM, Socket.io
- **Database**: PostgreSQL 15, Redis (캐싱)
- **인증**: JWT + OAuth 2.0, Multi-Factor Authentication
- **배포**: Docker, Kubernetes, Railway, AWS
- **모니터링**: Prometheus, Grafana, ELK Stack, Sentry
- **다국어**: i18next (한국어/영어)

## 📋 **개발 가이드라인**

### **1. 코드 스타일**
- **언어**: 모든 주석과 문서는 한국어로 작성
- **네이밍**: camelCase (변수, 함수), PascalCase (컴포넌트, 클래스)
- **타입**: TypeScript strict 모드 사용
- **포맷팅**: Prettier + ESLint 자동 적용

### **2. 프로젝트 구조**
```
MVS 3.0/
├── msv-server/          # 백엔드 API 서버
│   ├── src/
│   │   ├── controllers/ # API 컨트롤러
│   │   ├── models/      # Sequelize 모델
│   │   ├── routes/      # API 라우트
│   │   ├── services/    # 비즈니스 로직
│   │   ├── middleware/  # 미들웨어
│   │   └── utils/       # 유틸리티
│   ├── tests/           # 백엔드 테스트
│   └── Dockerfile
├── msv-frontend/        # 프론트엔드 React 앱
│   ├── src/
│   │   ├── components/  # React 컴포넌트
│   │   ├── pages/       # 페이지 컴포넌트
│   │   ├── hooks/       # 커스텀 훅
│   │   ├── services/    # API 서비스
│   │   ├── store/       # Zustand 스토어
│   │   ├── types/       # TypeScript 타입
│   │   └── utils/       # 유틸리티
│   ├── tests/           # 프론트엔드 테스트
│   └── Dockerfile
├── k8s/                 # Kubernetes 매니페스트
├── scripts/             # 배포 및 유틸리티 스크립트
└── docker-compose.yml   # 로컬 개발 환경
```

### **3. 데이터베이스 설계**
- **멀티 테넌트**: `tenant_id`, `company_id`로 데이터 격리
- **사용자 권한**: `user_menu_permission` 테이블로 세밀한 권한 제어
- **인덱싱**: 성능 최적화를 위한 적절한 인덱스 설정
- **마이그레이션**: Sequelize CLI로 스키마 변경 관리

### **4. API 설계**
- **RESTful**: 표준 HTTP 메서드 사용
- **인증**: JWT 토큰 기반 인증
- **권한**: 미들웨어로 엔드포인트별 권한 검사
- **에러 처리**: 일관된 에러 응답 형식
- **문서화**: Swagger/OpenAPI 자동 생성

### **5. 프론트엔드 설계**
- **컴포넌트**: 재사용 가능한 Material-UI 기반 컴포넌트
- **상태 관리**: Zustand로 전역 상태 관리
- **라우팅**: React Router로 SPA 라우팅
- **다국어**: i18next로 한국어/영어 지원
- **테마**: Material-UI 테마 시스템 활용

## 🔧 **개발 환경 설정**

### **필수 도구**
- Node.js 20+
- Docker & Docker Compose
- PostgreSQL 15
- Redis
- Git

### **개발 서버 실행**
```bash
# 전체 시스템 실행
docker-compose up -d

# 개별 서비스 실행
docker-compose up -d backend
docker-compose up -d frontend
```

### **접속 URL**
- **프론트엔드**: http://localhost:3000
- **백엔드 API**: http://localhost:5000
- **API 문서**: http://localhost:5000/api/health

## 🧪 **테스트 계정**
- **사용자 ID**: testuser
- **비밀번호**: TestPassword123!

## 📝 **개발 규칙**

### **1. 커밋 메시지**
```
feat: 새로운 기능 추가
fix: 버그 수정
docs: 문서 수정
style: 코드 포맷팅
refactor: 코드 리팩토링
test: 테스트 추가
chore: 빌드 설정 변경
```

### **2. 브랜치 전략**
- `main`: 프로덕션 브랜치
- `develop`: 개발 브랜치
- `feature/*`: 기능 개발 브랜치
- `hotfix/*`: 긴급 수정 브랜치

### **3. 코드 리뷰**
- 모든 PR은 최소 1명의 리뷰 필요
- 테스트 코드 포함 필수
- 타입 안전성 검증
- 성능 영향도 검토

## 🚀 **배포 프로세스**

### **개발 환경**
1. 로컬에서 `docker-compose up -d` 실행
2. 기능 개발 및 테스트
3. PR 생성 및 코드 리뷰

### **프로덕션 배포**
1. GitHub Actions로 자동 빌드
2. Docker 이미지 생성 및 푸시
3. Kubernetes 클러스터에 배포
4. 헬스체크 및 모니터링

## 🔍 **모니터링 및 로깅**

### **로그 레벨**
- `error`: 에러 로그
- `warn`: 경고 로그
- `info`: 정보 로그
- `debug`: 디버그 로그

### **모니터링 지표**
- API 응답 시간
- 데이터베이스 연결 상태
- 메모리 사용량
- CPU 사용률
- 에러 발생률

## 🛡️ **보안 가이드라인**

### **인증 및 권한**
- JWT 토큰 만료 시간 설정
- 비밀번호 해싱 (bcrypt)
- API 레이트 리미팅
- CORS 설정

### **데이터 보안**
- SQL 인젝션 방지 (Sequelize ORM)
- XSS 방지 (React 기본 보호)
- CSRF 토큰 사용
- 민감한 데이터 암호화

## 📚 **참고 자료**

### **문서**
- [React 공식 문서](https://react.dev/)
- [Material-UI 문서](https://mui.com/)
- [Express.js 가이드](https://expressjs.com/)
- [Sequelize 문서](https://sequelize.org/)
- [Docker 가이드](https://docs.docker.com/)

### **도구**
- [TypeScript 핸드북](https://www.typescriptlang.org/docs/)
- [Zustand 가이드](https://github.com/pmndrs/zustand)
- [i18next 문서](https://www.i18next.com/)

---

## 🎯 **개발 목표**

MVS 3.0은 **현대적이고 확장 가능한 기업용 통합 업무 관리 시스템**을 목표로 합니다. 

**핵심 가치:**
- **사용자 중심**: 직관적이고 사용하기 쉬운 UI/UX
- **확장성**: 비즈니스 성장에 따른 시스템 확장 지원
- **안정성**: 99.9% 가용성 보장
- **보안**: 엔터프라이즈급 보안 표준 준수
- **성능**: 빠른 응답 시간과 높은 처리량

**개발 원칙:**
- 코드 품질 우선
- 테스트 주도 개발
- 지속적인 개선
- 팀 협업 강화
- 사용자 피드백 반영

---

**MVS 3.0 개발팀과 함께 차세대 기업용 시스템을 만들어가세요!** 🚀
