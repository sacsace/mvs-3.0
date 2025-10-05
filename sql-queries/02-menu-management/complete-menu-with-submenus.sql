-- MVS 3.0 완전한 메뉴 구조 (하위 메뉴 포함)

-- 기존 데이터 삭제
DELETE FROM user_permissions;
DELETE FROM menus;

-- 1단계 메뉴 (상위 메뉴)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, NULL, 'Dashboard', 'Dashboard', '/dashboard', 'dashboard', 1, 1, true, 'System dashboard and statistics', NOW(), NOW()),
(1, NULL, 'User Management', 'User Management', '/users', 'people', 2, 1, true, 'User account and permission management', NOW(), NOW()),
(1, NULL, 'Company Management', 'Company Management', '/companies', 'business', 3, 1, true, 'Company information and settings management', NOW(), NOW()),
(1, NULL, 'Project Management', 'Project Management', '/projects', 'folder', 4, 1, true, 'Project management', NOW(), NOW()),
(1, NULL, 'Accounting', 'Accounting', '/accounting', 'account_balance', 5, 1, true, 'Accounting and financial management', NOW(), NOW()),
(1, NULL, 'Inventory', 'Inventory', '/inventory', 'inventory', 6, 1, true, 'Inventory management', NOW(), NOW()),
(1, NULL, 'Customer Management', 'Customer Management', '/customers', 'person', 7, 1, true, 'Customer information and relationship management', NOW(), NOW()),
(1, NULL, 'Reports', 'Reports', '/reports', 'assessment', 8, 1, true, 'Various business reports', NOW(), NOW()),
(1, NULL, 'Settings', 'Settings', '/settings', 'settings', 9, 1, true, 'System-wide settings', NOW(), NOW());

-- 2단계 메뉴 (회계 관리 하위)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 5, 'E-Invoice', 'E-Invoice', '/accounting/e-invoice', 'receipt', 1, 2, true, 'Electronic invoice management', NOW(), NOW()),
(1, 5, 'E-Way Bill', 'E-Way Bill', '/accounting/eway-bill', 'local_shipping', 2, 2, true, 'E-Way Bill management', NOW(), NOW()),
(1, 5, 'Regular Invoice', 'Regular Invoice', '/accounting/invoice', 'description', 3, 2, true, 'Regular invoice management', NOW(), NOW()),
(1, 5, 'Quotation', 'Quotation', '/accounting/quotation', 'request_quote', 4, 2, true, 'Quotation management', NOW(), NOW()),
(1, 5, 'Expense Report', 'Expense Report', '/accounting/expense', 'money_off', 5, 2, true, 'Expense report management', NOW(), NOW()),
(1, 5, 'Budget Management', 'Budget Management', '/accounting/budget', 'account_balance', 6, 2, true, 'Budget management', NOW(), NOW()),
(1, 5, 'Asset Management', 'Asset Management', '/accounting/assets', 'account_balance', 7, 2, true, 'Asset management', NOW(), NOW()),
(1, 5, 'Accounting Statistics', 'Accounting Statistics', '/accounting/statistics', 'assessment', 8, 2, true, 'Accounting statistics', NOW(), NOW());

-- 2단계 메뉴 (재고 관리 하위)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 6, 'Basic Inventory Registration', 'Basic Inventory Registration', '/inventory/basic', 'inventory_2', 1, 2, true, 'Basic inventory registration', NOW(), NOW()),
(1, 6, 'Inventory Status Check', 'Inventory Status Check', '/inventory/status', 'inventory_2', 2, 2, true, 'Check inventory status', NOW(), NOW()),
(1, 6, 'In/Outbound Management', 'In/Outbound Management', '/inventory/transaction', 'swap_horiz', 3, 2, true, 'Inbound and outbound management', NOW(), NOW()),
(1, 6, 'Inventory Movement and Adjustment', 'Inventory Movement and Adjustment', '/inventory/movement', 'inventory_2', 4, 2, true, 'Inventory movement and adjustment', NOW(), NOW()),
(1, 6, 'Inventory Report', 'Inventory Report', '/inventory/report', 'assessment', 5, 2, true, 'Inventory report', NOW(), NOW());

-- 2단계 메뉴 (고객 관리 하위)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 7, 'Customer Information', 'Customer Information', '/customers/info', 'person', 1, 2, true, 'Customer information management', NOW(), NOW()),
(1, 7, 'Sales Opportunity', 'Sales Opportunity', '/customers/sales', 'trending_up', 2, 2, true, 'Sales opportunity management', NOW(), NOW()),
(1, 7, 'Contract Management', 'Contract Management', '/customers/contracts', 'description', 3, 2, true, 'Contract management', NOW(), NOW()),
(1, 7, 'Customer Support', 'Customer Support', '/customers/support', 'support_agent', 4, 2, true, 'Customer support', NOW(), NOW());

-- 사용자 권한 생성 (모든 메뉴에 대해)
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 1, id, true, true, true, true, NOW(), NOW() FROM menus WHERE tenant_id = 1;
