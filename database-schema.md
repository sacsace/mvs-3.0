# MVS 3.0 데이터베이스 스키마

## 관계형 데이터베이스 다이어그램

```
┌─────────────────┐    ┌─────────────────┐    ┌─────────────────┐
│     Users       │    │    Companies    │    │    Customers    │
├─────────────────┤    ├─────────────────┤    ├─────────────────┤
│ id (PK)         │    │ id (PK)         │    │ id (PK)         │
│ username        │    │ name            │    │ name            │
│ email           │    │ business_number │    │ email           │
│ password_hash   │    │ address         │    │ phone           │
│ role            │    │ phone           │    │ address         │
│ tenant_id (FK)  │    │ email           │    │ tenant_id (FK)  │
│ created_at      │    │ tenant_id (FK)  │    │ created_at      │
│ updated_at      │    │ created_at      │    │ updated_at      │
└─────────────────┘    │ updated_at      │    └─────────────────┘
         │              └─────────────────┘             │
         │                       │                      │
         │                       │                      │
         └───────────────────────┼──────────────────────┘
                                 │
                                 │
                    ┌─────────────────┐
                    │    Products     │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ name            │
                    │ description     │
                    │ price           │
                    │ stock_quantity  │
                    │ tenant_id (FK)  │
                    │ created_at      │
                    │ updated_at      │
                    └─────────────────┘
                                 │
                                 │
                    ┌─────────────────┐
                    │    Invoices     │
                    ├─────────────────┤
                    │ id (PK)         │
                    │ invoice_number  │
                    │ customer_id (FK)│
                    │ total_amount    │
                    │ status          │
                    │ tenant_id (FK)  │
                    │ created_at      │
                    │ updated_at      │
                    └─────────────────┘
```

## 테이블 관계

1. **Users** ↔ **Companies** (Many-to-One)
   - `users.tenant_id` → `companies.id`
   - 한 회사에 여러 사용자

2. **Companies** ↔ **Customers** (One-to-Many)
   - `customers.tenant_id` → `companies.id`
   - 한 회사가 여러 고객 관리

3. **Companies** ↔ **Products** (One-to-Many)
   - `products.tenant_id` → `companies.id`
   - 한 회사가 여러 제품 관리

4. **Companies** ↔ **Invoices** (One-to-Many)
   - `invoices.tenant_id` → `companies.id`
   - 한 회사가 여러 인보이스 관리

5. **Customers** ↔ **Invoices** (One-to-Many)
   - `invoices.customer_id` → `customers.id`
   - 한 고객이 여러 인보이스

## 주요 특징

- **Multi-tenant 구조**: 모든 테이블에 `tenant_id` 필드로 테넌트 분리
- **Audit Trail**: `created_at`, `updated_at` 필드로 변경 이력 추적
- **Soft Delete**: 논리적 삭제를 위한 `deleted_at` 필드 (향후 추가)
- **UUID 지원**: 보안을 위한 UUID 필드 (향후 추가)

## 인덱스

- `users.username` (UNIQUE)
- `users.email` (UNIQUE)
- `companies.business_number` (UNIQUE)
- `customers.email` (UNIQUE)
- `invoices.invoice_number` (UNIQUE)
- `tenant_id` (모든 테이블)
