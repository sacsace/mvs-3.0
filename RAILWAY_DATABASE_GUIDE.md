# Railway 데이터베이스 배포 가이드

## 🗄️ Railway 데이터베이스 배포 방법

### 방법 1: Railway 내장 PostgreSQL (권장)

#### 장점
- 자동 백업 및 관리
- SSL 연결 자동 제공
- 환경 변수 자동 설정
- 스케일링 자동 처리

#### 설정
```bash
# Railway CLI로 PostgreSQL 추가
railway add --database postgres

# 환경 변수 자동 설정됨:
# DATABASE_URL=postgresql://user:pass@host:port/db
# PGHOST=host
# PGPORT=5432
# PGUSER=user
# PGPASSWORD=pass
# PGDATABASE=db
```

### 방법 2: 외부 데이터베이스 연결

#### 환경 변수 설정
Railway 대시보드에서 수동 설정:
```
DATABASE_URL=postgresql://user:pass@external-host:5432/db
DB_HOST=external-host
DB_PORT=5432
DB_USER=user
DB_PASSWORD=pass
DB_NAME=db
```

### 방법 3: Docker 컨테이너로 데이터베이스

#### docker-compose.yml 사용
```yaml
services:
  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: mvs_db
      POSTGRES_USER: mvs_user
      POSTGRES_PASSWORD: mvs_password
    volumes:
      - postgres_data:/var/lib/postgresql/data
```

## 🚀 배포 프로세스

### 1. 데이터베이스 마이그레이션
```bash
# Railway에서 마이그레이션 실행
railway run npm run db:migrate

# 또는 직접 실행
railway run npx sequelize-cli db:migrate
```

### 2. 시드 데이터 삽입
```bash
# 초기 데이터 삽입
railway run npm run db:seed
```

### 3. 데이터베이스 백업
```bash
# Railway CLI로 백업
railway connect postgres
pg_dump -U $PGUSER -h $PGHOST $PGDATABASE > backup.sql
```

## 🔧 애플리케이션 연결 설정

### Sequelize 설정
```typescript
// src/config/database.ts
const config = {
  development: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
  },
  production: {
    url: process.env.DATABASE_URL,
    dialect: 'postgres',
    logging: false,
    ssl: true,
    dialectOptions: {
      ssl: {
        require: true,
        rejectUnauthorized: false
      }
    }
  }
};
```

## 📊 모니터링 및 관리

### Railway 대시보드
- 데이터베이스 사용량 모니터링
- 연결 상태 확인
- 백업 상태 확인
- 성능 메트릭 확인

### CLI 명령어
```bash
# 데이터베이스 상태 확인
railway status

# 로그 확인
railway logs --service postgres

# 환경 변수 확인
railway variables
```

## ✅ 권장사항

1. **프로덕션**: Railway 내장 PostgreSQL 사용
2. **개발**: 로컬 Docker PostgreSQL 사용
3. **테스트**: Railway 테스트 환경 PostgreSQL 사용
4. **백업**: Railway 자동 백업 + 수동 백업 정책
