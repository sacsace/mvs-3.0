-- MVS 3.0 원래 기초 메뉴 데이터 복원

-- 기존 데이터 삭제
DELETE FROM user_permissions;
DELETE FROM menus;

-- 원래 기초 메뉴 데이터 삽입
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

-- 사용자 권한 생성
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 1, id, true, true, true, true, NOW(), NOW() FROM menus WHERE tenant_id = 1;
