# MVS Database Schema

## Overview
MVS은 다중 테넌트(Multi-tenant) 구조의 SaaS 플랫폼으로, 여러 회사가 독립적으로 사용할 수 있는 통합 관리 시스템입니다.

## Database Architecture

### Core Tables

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Tenants     │    │    Companies    │    │      Users      │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ name            │    │ tenant_id (FK)  │    │ tenant_id (FK)  │
│ domain          │    │ name            │    │ company_id (FK) │
│ subdomain       │    │ business_number │    │ userid          │
│ plan            │    │ ceo_name        │    │ username        │
│ max_users       │    │ address         │    │ email           │
│ max_companies   │    │ phone           │    │ password_hash   │
│ features        │    │ email           │    │ role            │
│ status          │    │ website         │    │ department      │
│ trial_ends_at   │    │ industry        │    │ position        │
│ subscription_id │    │ employee_count  │    │ status          │
│ created_at      │    │ subscription_*  │    │ last_login      │
│ updated_at      │    │ company_logo    │    │ created_at      │
└─────────────────┘    │ company_seal    │    │ updated_at      │
         │             │ ceo_signature   │    └─────────────────┘
         │             │ account_*       │             │
         │             │ login_period_*  │             │
         │             │ login_time_*    │             │
         │             │ timezone        │             │
         │             │ settings        │             │
         │             │ created_at      │             │
         │             │ updated_at      │             │
         │             └─────────────────┘             │
         │                       │                     │
         └───────────────────────┼─────────────────────┘
                                 │
                    ┌─────────────────┐
                    │    Customers    │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ tenant_id (FK)  │
                    │ company_id (FK) │
                    │ name            │
                    │ business_number │
                    │ ceo_name        │
                    │ address         │
                    │ phone           │
                    │ email           │
                    │ website         │
                    │ industry        │
                    │ status          │
                    │ created_at      │
                    │ updated_at      │
                    └─────────────────┘
                                 │
                                 │
                    ┌─────────────────┐
                    │    Products     │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ tenant_id (FK)  │
                    │ company_id (FK) │
                    │ product_code    │
                    │ name            │
                    │ description     │
                    │ category        │
                    │ unit_price      │
                    │ cost_price      │
                    │ stock_quantity  │
                    │ min_stock_level │
                    │ max_stock_level │
                    │ unit            │
                    │ tax_rate        │
                    │ status          │
                    │ created_by (FK) │
                    │ created_at      │
                    │ updated_at      │
                    └─────────────────┘
                                 │
                                 │
                    ┌─────────────────┐
                    │    Invoices     │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ tenant_id (FK)  │
                    │ company_id (FK) │
                    │ customer_id (FK)│
                    │ invoice_number  │
                    │ invoice_date    │
                    │ due_date        │
                    │ subtotal        │
                    │ tax_amount      │
                    │ total_amount    │
                    │ status          │
                    │ payment_status  │
                    │ payment_method  │
                    │ payment_date    │
                    │ notes           │
                    │ created_by (FK) │
                    │ created_at      │
                    │ updated_at      │
                    └─────────────────┘
                                 │
                                 │
                    ┌─────────────────┐
                    │  Invoice Items  │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ invoice_id (FK) │
                    │ item_name       │
                    │ description     │
                    │ quantity        │
                    │ unit_price      │
                    │ total_price     │
                    │ tax_rate        │
                    │ tax_amount      │
                    │ created_at      │
                    │ updated_at      │
                    └─────────────────┘
```

### System Tables

```
┌─────────────────┐    ┌─────────────────┐
│      Menus      │    │ UserPermissions│
├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │
│ tenant_id (FK)  │    │ user_id (FK)    │
│ parent_id (FK)  │    │ menu_id (FK)    │
│ name_ko         │    │ can_view        │
│ name_en         │    │ can_create      │
│ route           │    │ can_edit        │
│ icon            │    │ can_delete      │
│ order           │    │ created_at      │
│ level           │    │ updated_at      │
│ is_active       │    └─────────────────┘
│ description     │
│ created_at      │
│ updated_at      │
└─────────────────┘
```

## Table Relationships

### 1. **Tenants** (Root Entity)
- **Tenants** → **Companies** (One-to-Many)
  - `companies.tenant_id` → `tenants.id`
  - 한 테넌트가 여러 회사 관리

### 2. **Companies** (Core Business Entity)
- **Companies** → **Users** (One-to-Many)
  - `users.company_id` → `companies.id`
  - 한 회사에 여러 사용자
- **Companies** → **Customers** (One-to-Many)
  - `customers.company_id` → `companies.id`
  - 한 회사가 여러 고객 관리
- **Companies** → **Products** (One-to-Many)
  - `products.company_id` → `companies.id`
  - 한 회사가 여러 제품 관리
- **Companies** → **Invoices** (One-to-Many)
  - `invoices.company_id` → `companies.id`
  - 한 회사가 여러 인보이스 관리

### 3. **Users** (Authentication & Authorization)
- **Users** → **Products** (One-to-Many)
  - `products.created_by` → `users.id`
  - 사용자가 제품 생성
- **Users** → **Invoices** (One-to-Many)
  - `invoices.created_by` → `users.id`
  - 사용자가 인보이스 생성
- **Users** → **UserPermissions** (One-to-Many)
  - `user_permissions.user_id` → `users.id`
  - 사용자별 메뉴 권한

### 4. **Customers** (Business Partners)
- **Customers** → **Invoices** (One-to-Many)
  - `invoices.customer_id` → `customers.id`
  - 한 고객이 여러 인보이스

### 5. **Invoices** (Financial Transactions)
- **Invoices** → **InvoiceItems** (One-to-Many)
  - `invoice_items.invoice_id` → `invoices.id`
  - 한 인보이스에 여러 아이템

### 6. **Menus** (System Navigation)
- **Menus** → **Menus** (Self-Reference)
  - `menus.parent_id` → `menus.id`
  - 계층적 메뉴 구조
- **Menus** → **UserPermissions** (One-to-Many)
  - `user_permissions.menu_id` → `menus.id`
  - 메뉴별 사용자 권한

## Key Features

### Multi-Tenant Architecture
- **Tenant Isolation**: 모든 비즈니스 데이터는 `tenant_id`로 분리
- **Company Management**: 한 테넌트 내에서 여러 회사 운영 가능
- **User Management**: 회사별 독립적인 사용자 관리

### Business Management
- **Customer Management**: 고객 정보 및 거래 이력 관리
- **Product Management**: 제품 정보, 재고 관리, 가격 정책
- **Invoice System**: 인보이스 생성, 결제 관리, 세금 계산
- **Inventory Control**: 재고 수량, 최소/최대 재고 레벨 관리

### Security & Permissions
- **Role-Based Access**: root, audit, admin, user 역할 구분
- **Menu Permissions**: 사용자별 메뉴 접근 권한 세분화
- **Data Isolation**: 테넌트별 완전한 데이터 분리

### System Features
- **Multi-Language Support**: 메뉴 한글/영어 지원
- **File Management**: 회사 로고, 인감, 서명 이미지 저장
- **Subscription Management**: 플랜별 기능 제한 및 사용자 수 제한
- **Audit Trail**: 모든 데이터 변경 이력 추적

## Indexes

### Primary Indexes
- `tenants.domain` (UNIQUE)
- `tenants.subdomain` (UNIQUE)
- `companies.business_number` (UNIQUE)
- `users.userid` (UNIQUE)
- `users.email` (UNIQUE)
- `products.product_code` (UNIQUE)
- `invoices.invoice_number` (UNIQUE)

### Performance Indexes
- `tenant_id` (모든 테이블)
- `company_id` (관련 테이블)
- `user_id` (권한 관련)
- `customer_id` (거래 관련)
- `invoice_id` (아이템 관련)
- `parent_id` (메뉴 계층)

## Data Types

### Common Fields
- **ID Fields**: `INTEGER` (Primary Key, Auto Increment)
- **Foreign Keys**: `INTEGER` (References)
- **Timestamps**: `DATE` (created_at, updated_at)
- **Status Fields**: `STRING(20)` (active, inactive, etc.)
- **Amount Fields**: `DECIMAL(15,2)` (금액, 가격)
- **Quantity Fields**: `DECIMAL(10,2)` (수량, 재고)

### Special Fields
- **JSON Fields**: `JSONB` (settings, features)
- **Binary Fields**: `BLOB` (이미지 파일)
- **Text Fields**: `TEXT` (긴 설명)
- **Enum Fields**: `ENUM` (제한된 값 목록)

## Business Rules

### Tenant Management
- 테넌트당 최대 사용자 수 제한
- 테넌트당 최대 회사 수 제한
- 플랜별 기능 활성화/비활성화

### Company Management
- 사업자등록번호 중복 불가
- 로그인 시간 제한 설정
- 회사별 독립적인 설정 관리

### User Management
- 사용자 ID 중복 불가
- 이메일 중복 불가
- 역할별 권한 차등 적용

### Product Management
- 제품 코드 중복 불가
- 재고 수량 실시간 관리
- 최소/최대 재고 레벨 알림

### Invoice Management
- 인보이스 번호 중복 불가
- 세금 자동 계산
- 결제 상태 추적

## Future Enhancements

### Planned Features
- **Soft Delete**: 논리적 삭제를 위한 `deleted_at` 필드
- **UUID Support**: 보안을 위한 UUID 필드
- **Audit Logging**: 상세한 변경 이력 추적
- **File Storage**: 클라우드 파일 저장소 연동
- **API Rate Limiting**: API 호출 제한
- **Real-time Notifications**: 실시간 알림 시스템