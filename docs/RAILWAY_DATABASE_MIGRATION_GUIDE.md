# Railway 데이터베이스 마이그레이션 가이드

## 📊 현재 상태

### ✅ 완료된 것
- Railway Postgres 서비스 배포 완료
- 데이터베이스 서비스 "Deployment Online"
- 필수 환경 변수 설정 완료

### ⏳ 진행 중
- 데이터베이스 연결 시도 중 ("Attempting to connect...")

### ❌ 아직 안 된 것
- **데이터베이스 마이그레이션 실행** ← 이게 필요합니다!
- **테이블 생성** ← 마이그레이션 후 생성됩니다

---

## 🔍 데이터베이스와 테이블 생성 상태

### Railway Postgres 서비스
- ✅ **Postgres 서비스 자체는 생성됨**
- ✅ **데이터베이스 인스턴스는 Railway가 자동 생성**
- ❌ **애플리케이션 데이터베이스와 테이블은 아직 생성 안 됨**

### 왜 테이블이 없나요?
Railway Postgres는 PostgreSQL 서비스만 제공하고, 실제 애플리케이션에서 사용할:
- 데이터베이스 스키마
- 테이블 구조
- 초기 데이터

이것들은 **마이그레이션을 실행**해야 생성됩니다.

---

## 🚀 마이그레이션 실행 방법

### 방법 1: Railway CLI 사용 (권장)

```bash
# Railway CLI 설치 (아직 안 했다면)
npm install -g @railway/cli

# Railway 로그인
railway login

# 프로젝트 연결
railway link

# 백엔드 서비스에서 마이그레이션 실행
railway run --service mvs-backend npm run db:migrate
```

### 방법 2: Railway 대시보드 터미널 사용

1. Railway 대시보드 → **mvs-backend** 서비스 선택
2. **Deployments** 탭 클릭
3. 최신 배포의 **"..." 메뉴** → **"View Logs"** 또는 **"Open Shell"** 클릭
4. 터미널에서 다음 명령 실행:

```bash
cd /app  # 또는 현재 디렉토리 확인
npm run db:migrate
```

### 방법 3: Railway 대시보드에서 직접 실행

1. Railway 대시보드 → **mvs-backend** 서비스
2. **Settings** → **Deploy** 섹션
3. **"Run Command"** 또는 **"One-off Command"** 옵션 사용
4. 명령어 입력: `npm run db:migrate`

---

## 📋 마이그레이션 실행 순서

### 1단계: 마이그레이션 실행
```bash
npm run db:migrate
```

이 명령은 다음을 수행합니다:
- `migrations/` 폴더의 모든 마이그레이션 파일 실행
- 테이블 생성
- 인덱스 생성
- 외래 키 설정

### 2단계: 초기 데이터 시딩 (선택사항)
```bash
npm run db:seed
```

초기 데이터가 필요하면 실행하세요.

---

## 🔍 마이그레이션 확인 방법

### Railway Postgres Database 탭에서 확인

1. Railway 대시보드 → **Postgres** 서비스
2. **Database** 탭 클릭
3. 연결이 완료되면 SQL 쿼리 실행 가능
4. 다음 쿼리로 테이블 확인:

```sql
-- 모든 테이블 목록 확인
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public'
ORDER BY table_name;

-- 특정 테이블 확인 (예: users)
SELECT * FROM users LIMIT 5;
```

### 백엔드 로그에서 확인

마이그레이션 실행 후 백엔드 로그에서:
```
✅ Database connection successful
```

이 메시지가 보이면 연결 성공입니다.

---

## 📝 마이그레이션 파일 목록

현재 프로젝트에는 다음 마이그레이션 파일들이 있습니다:

1. `20260116090000-create-login-infos-table.js` - 로그인 정보 테이블
2. 기타 17개의 마이그레이션 파일들

이 파일들이 실행되면 다음 테이블들이 생성됩니다:
- users (사용자)
- companies (회사)
- customers (고객)
- invoices (인보이스)
- menus (메뉴)
- 등등...

---

## ⚠️ 주의사항

### 1. 마이그레이션은 한 번만 실행
- 마이그레이션은 `SequelizeMeta` 테이블에 기록됩니다
- 이미 실행된 마이그레이션은 다시 실행되지 않습니다
- 안전하게 여러 번 실행 가능합니다

### 2. 데이터베이스 연결 확인
- 마이그레이션 실행 전에 `DATABASE_URL` 환경 변수가 설정되어 있는지 확인
- Railway가 자동으로 설정하지만 확인하세요

### 3. 마이그레이션 실패 시
- 로그를 확인하여 오류 원인 파악
- 마이그레이션 파일에 문법 오류가 없는지 확인
- 데이터베이스 권한이 충분한지 확인

---

## 🎯 다음 단계

1. ✅ **마이그레이션 실행** (`npm run db:migrate`)
2. ✅ **테이블 생성 확인** (Database 탭에서)
3. ✅ **초기 데이터 시딩** (선택사항, `npm run db:seed`)
4. ✅ **백엔드 재시작** (마이그레이션 후 자동 재시작됨)
5. ✅ **기능 테스트** (로그인, 데이터 조회 등)

---

## 💡 빠른 체크리스트

- [ ] Railway Postgres 서비스 배포 완료 ✅
- [ ] DATABASE_URL 환경 변수 설정 확인 ✅
- [ ] 마이그레이션 실행 (`npm run db:migrate`) ❌ ← **이것을 해야 합니다!**
- [ ] 테이블 생성 확인 ❌
- [ ] 초기 데이터 시딩 (선택사항) ❌

---

## 🆘 문제 해결

### 마이그레이션 실행 오류
1. **"DATABASE_URL not found"**
   - Railway 대시보드에서 `DATABASE_URL` 환경 변수 확인
   - Postgres 서비스가 백엔드 서비스에 연결되어 있는지 확인

2. **"Permission denied"**
   - 데이터베이스 사용자 권한 확인
   - Railway가 자동으로 권한을 설정하지만, 문제가 있으면 Railway 지원팀에 문의

3. **"Table already exists"**
   - 이미 마이그레이션이 실행된 것일 수 있음
   - `SELECT * FROM "SequelizeMeta";` 쿼리로 실행된 마이그레이션 확인

### 데이터베이스 연결 실패
1. Postgres 서비스가 "Online" 상태인지 확인
2. 환경 변수 `DATABASE_URL` 확인
3. 백엔드 서비스 재시작

---

## 📚 참고 자료

- [Sequelize 마이그레이션 가이드](https://sequelize.org/docs/v6/other-topics/migrations/)
- [Railway 데이터베이스 문서](https://docs.railway.app/databases/postgresql)
