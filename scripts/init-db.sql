-- MVS 3.0 데이터베이스 초기화 스크립트
-- PostgreSQL 15+ 호환

-- 데이터베이스 생성 (필요시)
-- CREATE DATABASE mvs_db;
-- CREATE USER mvs_user WITH PASSWORD 'mvs_password';
-- GRANT ALL PRIVILEGES ON DATABASE mvs_db TO mvs_user;

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 기본 테넌트 생성
INSERT INTO tenant (tenant_code, name, domain, plan, status, settings) 
VALUES ('default', 'Default Tenant', 'localhost', 'enterprise', 'active', '{}')
ON CONFLICT (tenant_code) DO NOTHING;

-- 기본 회사 생성
INSERT INTO company (
    tenant_id, 
    name, 
    business_number, 
    ceo_name, 
    address, 
    phone, 
    email, 
    website, 
    industry, 
    employee_count, 
    subscription_plan, 
    subscription_status,
    settings
) 
VALUES (
    1, 
    'MVS Company', 
    '123-45-67890', 
    'CEO Name', 
    'Company Address', 
    '02-1234-5678', 
    'info@mvs.com', 
    'https://mvs.com', 
    'Technology', 
    0, 
    'enterprise', 
    'active',
    '{}'
)
ON CONFLICT (business_number) DO NOTHING;

-- 기본 메뉴 구조 생성
INSERT INTO menu (tenant_id, parent_id, code, name_ko, name_en, icon, route, component, order_num, level, is_active, is_visible, permissions, metadata) VALUES
-- 1단계 메뉴
(1, NULL, 'dashboard', '대시보드', 'Dashboard', 'dashboard', '/dashboard', 'Dashboard', 1, 1, true, true, '["dashboard:read"]', '{}'),
(1, NULL, 'user-management', '사용자 관리', 'User Management', 'people', '/users', 'UserManagement', 2, 1, true, true, '["user:read", "user:create", "user:update", "user:delete"]', '{}'),
(1, NULL, 'company-management', '회사 관리', 'Company Management', 'business', '/companies', 'CompanyManagement', 3, 1, true, true, '["company:read", "company:create", "company:update", "company:delete"]', '{}'),
(1, NULL, 'project-management', '프로젝트 관리', 'Project Management', 'folder', '/projects', 'ProjectManagement', 4, 1, true, true, '["project:read", "project:create", "project:update", "project:delete"]', '{}'),
(1, NULL, 'accounting', '회계 관리', 'Accounting', 'account_balance', '/accounting', 'Accounting', 5, 1, true, true, '["accounting:read", "accounting:create", "accounting:update", "accounting:delete"]', '{}'),
(1, NULL, 'inventory', '재고 관리', 'Inventory', 'inventory', '/inventory', 'Inventory', 6, 1, true, true, '["inventory:read", "inventory:create", "inventory:update", "inventory:delete"]', '{}'),
(1, NULL, 'customer', '고객 관리', 'Customer Management', 'person', '/customers', 'CustomerManagement', 7, 1, true, true, '["customer:read", "customer:create", "customer:update", "customer:delete"]', '{}'),
(1, NULL, 'reports', '보고서', 'Reports', 'assessment', '/reports', 'Reports', 8, 1, true, true, '["report:read"]', '{}'),
(1, NULL, 'settings', '설정', 'Settings', 'settings', '/settings', 'Settings', 9, 1, true, true, '["settings:read", "settings:update"]', '{}'),

-- 2단계 메뉴 (회계 관리 하위)
(1, 5, 'e-invoice', 'E-Invoice', 'E-Invoice', 'receipt', '/accounting/e-invoice', 'EInvoice', 1, 2, true, true, '["e-invoice:read", "e-invoice:create", "e-invoice:update", "e-invoice:delete"]', '{}'),
(1, 5, 'eway-bill', 'E-Way Bill', 'E-Way Bill', 'local_shipping', '/accounting/eway-bill', 'EWayBill', 2, 2, true, true, '["eway-bill:read", "eway-bill:create", "eway-bill:update", "eway-bill:delete"]', '{}'),
(1, 5, 'invoice', '일반 인보이스', 'Regular Invoice', 'description', '/accounting/invoice', 'Invoice', 3, 2, true, true, '["invoice:read", "invoice:create", "invoice:update", "invoice:delete"]', '{}'),
(1, 5, 'quotation', '견적서', 'Quotation', 'request_quote', '/accounting/quotation', 'Quotation', 4, 2, true, true, '["quotation:read", "quotation:create", "quotation:update", "quotation:delete"]', '{}'),
(1, 5, 'expense', '지출결의서', 'Expense', 'money_off', '/accounting/expense', 'Expense', 5, 2, true, true, '["expense:read", "expense:create", "expense:update", "expense:delete"]', '{}'),

-- 2단계 메뉴 (재고 관리 하위)
(1, 6, 'inventory-status', '재고 현황', 'Inventory Status', 'inventory_2', '/inventory/status', 'InventoryStatus', 1, 2, true, true, '["inventory:read"]', '{}'),
(1, 6, 'inventory-transaction', '입출고 이력', 'Inventory Transaction', 'swap_horiz', '/inventory/transaction', 'InventoryTransaction', 2, 2, true, true, '["inventory:read", "inventory:create"]', '{}'),

-- 2단계 메뉴 (보고서 하위)
(1, 8, 'financial-report', '재무 보고서', 'Financial Report', 'trending_up', '/reports/financial', 'FinancialReport', 1, 2, true, true, '["report:read"]', '{}'),
(1, 8, 'sales-report', '매출 보고서', 'Sales Report', 'bar_chart', '/reports/sales', 'SalesReport', 2, 2, true, true, '["report:read"]', '{}'),
(1, 8, 'inventory-report', '재고 보고서', 'Inventory Report', 'pie_chart', '/reports/inventory', 'InventoryReport', 3, 2, true, true, '["report:read"]', '{}');

-- 기본 시스템 설정
INSERT INTO system_settings (tenant_id, company_id, setting_key, setting_value, setting_type, description, is_encrypted) VALUES
(1, 1, 'company_name', 'MVS Company', 'string', '회사명', false),
(1, 1, 'company_address', 'Company Address', 'string', '회사 주소', false),
(1, 1, 'company_phone', '02-1234-5678', 'string', '회사 전화번호', false),
(1, 1, 'company_email', 'info@mvs.com', 'string', '회사 이메일', false),
(1, 1, 'default_currency', 'KRW', 'string', '기본 통화', false),
(1, 1, 'default_language', 'ko', 'string', '기본 언어', false),
(1, 1, 'timezone', 'Asia/Seoul', 'string', '시간대', false),
(1, 1, 'date_format', 'YYYY-MM-DD', 'string', '날짜 형식', false),
(1, 1, 'time_format', 'HH:mm:ss', 'string', '시간 형식', false),
(1, 1, 'max_file_size', '10485760', 'number', '최대 파일 크기 (바이트)', false),
(1, 1, 'allowed_file_types', 'image/jpeg,image/png,image/gif,application/pdf', 'string', '허용된 파일 타입', false);

-- 기본 채팅방 생성
INSERT INTO chat_room (tenant_id, company_id, name, description, room_type, created_by, is_active) VALUES
(1, 1, '일반 채팅', '전체 직원을 위한 일반 채팅방', 'group', 1, true),
(1, 1, '공지사항', '중요한 공지사항을 위한 채팅방', 'group', 1, true);

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_user ON "user" (tenant_id, company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_menu ON menu (tenant_id, company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_notification ON notification (tenant_id, company_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_chat_room ON chat_room (tenant_id, company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_chat_message ON chat_message (tenant_id, company_id, room_id);

-- 통계 정보 업데이트
ANALYZE;
