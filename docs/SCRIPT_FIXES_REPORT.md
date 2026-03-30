# 스크립트 수정 리포트

**작성일**: 2025-01-XX  
**수정 범위**: 데이터베이스 관련 스크립트 파일들

## 📋 수정 사항 요약

### 1. **sampleData.ts** - 샘플 데이터 스크립트 수정

#### 문제점
- `sampleCompanies`에 모델에 없는 `size` 필드 사용
- 모델에 필요한 필드들 누락 (`employee_count`, `subscription_plan`, `subscription_status`, `login_time_start`, `login_time_end`, `timezone`, `settings`)
- `findOrCreate`에서 `where` 조건에 `tenant_id` 누락

#### 수정 내용
- ✅ `size` 필드 제거
- ✅ 모델에 맞는 필드 추가:
  - `employee_count` (INTEGER)
  - `subscription_plan` (STRING)
  - `subscription_status` (STRING)
  - `login_time_start` (TIME)
  - `login_time_end` (TIME)
  - `timezone` (STRING)
  - `settings` (JSONB)
- ✅ `findOrCreate`의 `where` 조건에 `tenant_id` 추가하여 멀티테넌트 지원

### 2. **fix-columns.ts** - 컬럼 수정 스크립트 개선

#### 문제점
- 컬럼 이름 변경 시 오류 처리 부족
- 컬럼 추가 시 중복 오류 처리 부족
- `name_en` 업데이트 시 조건 확인 부족

#### 수정 내용
- ✅ 컬럼 이름 변경 시 try-catch 추가
- ✅ 컬럼 추가 시 중복 오류 무시 처리
- ✅ `name_en` 업데이트 전에 컬럼 존재 여부 확인
- ✅ 각 작업에 대한 성공/실패 로그 추가

### 3. **마이그레이션 파일** - 이미 수정 완료

다음 테이블들의 마이그레이션이 모델과 일치하도록 수정됨:
- ✅ `menus` 테이블
- ✅ `companies` 테이블
- ✅ `products` 테이블
- ✅ `user_permissions` 테이블
- ✅ `projects` 테이블
- ✅ `customers` 테이블
- ✅ `invoices` 테이블
- ✅ `sales_opportunities` 테이블

## ✅ 검증된 스크립트

다음 스크립트들은 이미 올바르게 작성되어 있음:
- ✅ `set-permissions.js` - 올바른 필드명 사용 (`can_view`, `can_create`, `can_edit`, `can_delete`)
- ✅ `add-submenus.ts` - 올바른 필드명 사용 (`name_ko`, `name_en`, `route`)
- ✅ `check-menus.ts` - 올바른 필드명 사용
- ✅ `fix-menu-order.ts` - 올바른 컬럼명 사용
- ✅ `seed-data.ts` - 기본 구조는 올바름

## 🔧 추가 권장 사항

### 1. 스크립트 실행 순서
다음 순서로 스크립트를 실행하는 것을 권장합니다:

```bash
# 1. 데이터베이스 마이그레이션
npm run db:migrate

# 2. 컬럼 수정 (기존 데이터베이스가 있는 경우)
npm run db:fix:columns

# 3. 메뉴 순서 수정 (필요한 경우)
npm run db:fix:menu-order

# 4. 시드 데이터 삽입
npm run db:seed:data

# 5. 서브메뉴 추가
npm run db:add:submenus

# 6. 권한 설정
node scripts/set-permissions.js
```

### 2. 오류 처리 개선
모든 스크립트에 일관된 오류 처리 패턴 적용:
- try-catch 블록 사용
- 상세한 오류 메시지 출력
- 적절한 exit 코드 반환

### 3. 멀티테넌트 지원
모든 데이터 조회/생성 시 `tenant_id` 조건 포함 확인

## 📊 테스트 체크리스트

- [ ] `npm run db:migrate` 실행 성공
- [ ] `npm run db:fix:columns` 실행 성공
- [ ] `npm run db:seed:data` 실행 성공
- [ ] `npm run db:add:submenus` 실행 성공
- [ ] `node scripts/set-permissions.js` 실행 성공
- [ ] 데이터베이스 스키마가 모델과 일치하는지 확인
- [ ] 샘플 데이터가 올바르게 생성되는지 확인

## 🎯 다음 단계

1. 수정된 스크립트 테스트 실행
2. 프로덕션 환경에 배포 전 검증
3. 문서 업데이트 (필요한 경우)

