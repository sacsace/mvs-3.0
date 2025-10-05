# MVS 3.0 데이터베이스 관계형 모델

## 📊 테이블 목록 (30개)

### 핵심 테이블
- **tenants** - 테넌트 (멀티테넌시)
- **companies** - 회사
- **users** - 사용자
- **departments** - 부서
- **positions** - 직책

### 비즈니스 테이블
- **customers** - 고객
- **products** - 제품
- **projects** - 프로젝트
- **contracts** - 계약
- **invoices** - 인보이스
- **invoice_items** - 인보이스 항목

### 영업/마케팅
- **sales_opportunities** - 영업 기회
- **support_tickets** - 지원 티켓
- **support_responses** - 지원 응답

### 인사관리
- **attendance_records** - 출근 기록
- **leave_requests** - 휴가 신청
- **payrolls** - 급여
- **payroll_records** - 급여 기록
- **work_reports** - 업무 보고서

### 재고관리
- **inventory_transactions** - 재고 거래

### 회계
- **expenses** - 지출
- **budgets** - 예산

### 시스템
- **menus** - 메뉴
- **user_permissions** - 사용자 권한
- **notices** - 공지사항
- **system_logs** - 시스템 로그
- **backups** - 백업
- **tasks** - 작업
- **chat_rooms** - 채팅방
- **chat_messages** - 채팅 메시지

## 🔗 주요 관계

### 1. 멀티테넌시 구조
```
tenants (1) ←→ (N) companies
tenants (1) ←→ (N) users
tenants (1) ←→ (N) menus
```

### 2. 회사 중심 구조
```
companies (1) ←→ (N) users
companies (1) ←→ (N) customers
companies (1) ←→ (N) products
companies (1) ←→ (N) projects
companies (1) ←→ (N) contracts
companies (1) ←→ (N) invoices
```

### 3. 사용자 중심 구조
```
users (1) ←→ (N) attendance_records
users (1) ←→ (N) leave_requests
users (1) ←→ (N) payrolls
users (1) ←→ (N) work_reports
users (1) ←→ (N) tasks
users (1) ←→ (N) chat_messages
```

### 4. 프로젝트 중심 구조
```
projects (1) ←→ (N) tasks
projects (1) ←→ (N) contracts
customers (1) ←→ (N) projects
```

### 5. 인보이스 구조
```
invoices (1) ←→ (N) invoice_items
customers (1) ←→ (N) invoices
```

### 6. 지원 시스템
```
support_tickets (1) ←→ (N) support_responses
customers (1) ←→ (N) support_tickets
```

### 7. 채팅 시스템
```
chat_rooms (1) ←→ (N) chat_messages
users (1) ←→ (N) chat_messages
```

## 📈 데이터 흐름

### 영업 프로세스
1. **영업 기회** → **계약** → **프로젝트** → **인보이스**

### 인사 프로세스
1. **출근 기록** → **업무 보고서** → **급여 계산**

### 재고 프로세스
1. **제품 등록** → **재고 거래** → **재고 현황**

### 지원 프로세스
1. **고객 문의** → **지원 티켓** → **응답 처리**

## 🎯 핵심 특징

1. **멀티테넌시**: 모든 테이블이 `tenant_id`를 통해 테넌트별 격리
2. **회사 중심**: `company_id`를 통한 회사별 데이터 관리
3. **사용자 권한**: `user_permissions`를 통한 세밀한 권한 제어
4. **감사 추적**: 모든 주요 테이블에 `created_at`, `updated_at` 포함
5. **상태 관리**: 대부분의 엔티티에 `status` 필드로 상태 관리
6. **계층 구조**: 메뉴, 부서 등에서 `parent_id`를 통한 계층 구조 지원
