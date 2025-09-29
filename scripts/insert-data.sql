-- MVS 3.0 초기 데이터 삽입 스크립트

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
(1, NULL, 'dashboard', 'Dashboard', 'Dashboard', 'dashboard', '/dashboard', 'Dashboard', 1, 1, true, true, '["dashboard:read"]', '{}'),
(1, NULL, 'user-management', 'User Management', 'User Management', 'people', '/users', 'UserManagement', 2, 1, true, true, '["user:read", "user:create", "user:update", "user:delete"]', '{}'),
(1, NULL, 'company-management', 'Company Management', 'Company Management', 'business', '/companies', 'CompanyManagement', 3, 1, true, true, '["company:read", "company:create", "company:update", "company:delete"]', '{}'),
(1, NULL, 'project-management', 'Project Management', 'Project Management', 'folder', '/projects', 'ProjectManagement', 4, 1, true, true, '["project:read", "project:create", "project:update", "project:delete"]', '{}'),
(1, NULL, 'accounting', 'Accounting', 'Accounting', 'account_balance', '/accounting', 'Accounting', 5, 1, true, true, '["accounting:read", "accounting:create", "accounting:update", "accounting:delete"]', '{}'),
(1, NULL, 'inventory', 'Inventory', 'Inventory', 'inventory', '/inventory', 'Inventory', 6, 1, true, true, '["inventory:read", "inventory:create", "inventory:update", "inventory:delete"]', '{}'),
(1, NULL, 'customer', 'Customer Management', 'Customer Management', 'person', '/customers', 'CustomerManagement', 7, 1, true, true, '["customer:read", "customer:create", "customer:update", "customer:delete"]', '{}'),
(1, NULL, 'reports', 'Reports', 'Reports', 'assessment', '/reports', 'Reports', 8, 1, true, true, '["report:read"]', '{}'),
(1, NULL, 'settings', 'Settings', 'Settings', 'settings', '/settings', 'Settings', 9, 1, true, true, '["settings:read", "settings:update"]', '{}'),

-- 2단계 메뉴 (회계 관리 하위)
(1, 5, 'e-invoice', 'E-Invoice', 'E-Invoice', 'receipt', '/accounting/e-invoice', 'EInvoice', 1, 2, true, true, '["e-invoice:read", "e-invoice:create", "e-invoice:update", "e-invoice:delete"]', '{}'),
(1, 5, 'eway-bill', 'E-Way Bill', 'E-Way Bill', 'local_shipping', '/accounting/eway-bill', 'EWayBill', 2, 2, true, true, '["eway-bill:read", "eway-bill:create", "eway-bill:update", "eway-bill:delete"]', '{}'),
(1, 5, 'invoice', 'Regular Invoice', 'Regular Invoice', 'description', '/accounting/invoice', 'Invoice', 3, 2, true, true, '["invoice:read", "invoice:create", "invoice:update", "invoice:delete"]', '{}'),
(1, 5, 'quotation', 'Quotation', 'Quotation', 'request_quote', '/accounting/quotation', 'Quotation', 4, 2, true, true, '["quotation:read", "quotation:create", "quotation:update", "quotation:delete"]', '{}'),
(1, 5, 'expense', 'Expense', 'Expense', 'money_off', '/accounting/expense', 'Expense', 5, 2, true, true, '["expense:read", "expense:create", "expense:update", "expense:delete"]', '{}'),

-- 2단계 메뉴 (재고 관리 하위)
(1, 6, 'inventory-status', 'Inventory Status', 'Inventory Status', 'inventory_2', '/inventory/status', 'InventoryStatus', 1, 2, true, true, '["inventory:read"]', '{}'),
(1, 6, 'inventory-transaction', 'Inventory Transaction', 'Inventory Transaction', 'swap_horiz', '/inventory/transaction', 'InventoryTransaction', 2, 2, true, true, '["inventory:read", "inventory:create"]', '{}'),

-- 2단계 메뉴 (보고서 하위)
(1, 8, 'financial-report', 'Financial Report', 'Financial Report', 'trending_up', '/reports/financial', 'FinancialReport', 1, 2, true, true, '["report:read"]', '{}'),
(1, 8, 'sales-report', 'Sales Report', 'Sales Report', 'bar_chart', '/reports/sales', 'SalesReport', 2, 2, true, true, '["report:read"]', '{}'),
(1, 8, 'inventory-report', 'Inventory Report', 'Inventory Report', 'pie_chart', '/reports/inventory', 'InventoryReport', 3, 2, true, true, '["report:read"]', '{}');

-- 기본 채팅방 생성
INSERT INTO chat_room (tenant_id, company_id, name, description, room_type, created_by, is_active) VALUES
(1, 1, 'General Chat', 'General chat room for all employees', 'group', 1, true),
(1, 1, 'Announcements', 'Important announcements chat room', 'group', 1, true);

-- 성능 최적화를 위한 인덱스 생성
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_user ON "user" (tenant_id, company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_menu ON menu (tenant_id, company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_notification ON notification (tenant_id, company_id, user_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_chat_room ON chat_room (tenant_id, company_id);
CREATE INDEX CONCURRENTLY IF NOT EXISTS idx_tenant_company_chat_message ON chat_message (tenant_id, company_id, room_id);

-- 통계 정보 업데이트
ANALYZE;
