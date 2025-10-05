-- 하위 메뉴 추가 (올바른 부모 ID 사용)

-- 2단계 메뉴 (회계 관리 하위) - Accounting ID: 38
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 38, 'E-Invoice', 'E-Invoice', '/accounting/e-invoice', 'receipt', 1, 2, true, 'Electronic invoice management', NOW(), NOW()),
(1, 38, 'E-Way Bill', 'E-Way Bill', '/accounting/eway-bill', 'local_shipping', 2, 2, true, 'E-Way Bill management', NOW(), NOW()),
(1, 38, 'Regular Invoice', 'Regular Invoice', '/accounting/invoice', 'description', 3, 2, true, 'Regular invoice management', NOW(), NOW()),
(1, 38, 'Quotation', 'Quotation', '/accounting/quotation', 'request_quote', 4, 2, true, 'Quotation management', NOW(), NOW()),
(1, 38, 'Expense Report', 'Expense Report', '/accounting/expense', 'money_off', 5, 2, true, 'Expense report management', NOW(), NOW()),
(1, 38, 'Budget Management', 'Budget Management', '/accounting/budget', 'account_balance', 6, 2, true, 'Budget management', NOW(), NOW()),
(1, 38, 'Asset Management', 'Asset Management', '/accounting/assets', 'account_balance', 7, 2, true, 'Asset management', NOW(), NOW()),
(1, 38, 'Accounting Statistics', 'Accounting Statistics', '/accounting/statistics', 'assessment', 8, 2, true, 'Accounting statistics', NOW(), NOW());

-- 2단계 메뉴 (재고 관리 하위) - Inventory ID: 39
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 39, 'Basic Inventory Registration', 'Basic Inventory Registration', '/inventory/basic', 'inventory_2', 1, 2, true, 'Basic inventory registration', NOW(), NOW()),
(1, 39, 'Inventory Status Check', 'Inventory Status Check', '/inventory/status', 'inventory_2', 2, 2, true, 'Check inventory status', NOW(), NOW()),
(1, 39, 'In/Outbound Management', 'In/Outbound Management', '/inventory/transaction', 'swap_horiz', 3, 2, true, 'Inbound and outbound management', NOW(), NOW()),
(1, 39, 'Inventory Movement and Adjustment', 'Inventory Movement and Adjustment', '/inventory/movement', 'inventory_2', 4, 2, true, 'Inventory movement and adjustment', NOW(), NOW()),
(1, 39, 'Inventory Report', 'Inventory Report', '/inventory/report', 'assessment', 5, 2, true, 'Inventory report', NOW(), NOW());

-- 2단계 메뉴 (고객 관리 하위) - Customer Management ID: 40
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 40, 'Customer Information', 'Customer Information', '/customers/info', 'person', 1, 2, true, 'Customer information management', NOW(), NOW()),
(1, 40, 'Sales Opportunity', 'Sales Opportunity', '/customers/sales', 'trending_up', 2, 2, true, 'Sales opportunity management', NOW(), NOW()),
(1, 40, 'Contract Management', 'Contract Management', '/customers/contracts', 'description', 3, 2, true, 'Contract management', NOW(), NOW()),
(1, 40, 'Customer Support', 'Customer Support', '/customers/support', 'support_agent', 4, 2, true, 'Customer support', NOW(), NOW());

-- 새로 추가된 하위 메뉴들에 대한 사용자 권한 생성
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 1, id, true, true, true, true, NOW(), NOW() FROM menus WHERE parent_id IS NOT NULL;
