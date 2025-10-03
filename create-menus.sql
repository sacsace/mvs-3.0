-- 메뉴 데이터 생성
INSERT INTO menus (tenant_id, name_ko, name_en, route, icon, "order", level, is_active, created_at, updated_at) VALUES 
(1, 'Dashboard', 'Dashboard', '/dashboard', 'Dashboard', 1, 1, true, NOW(), NOW()),
(1, 'User Management', 'User Management', '/users', 'People', 2, 1, true, NOW(), NOW()),
(1, 'Company Management', 'Company Management', '/company', 'Business', 3, 1, true, NOW(), NOW()),
(1, 'Inventory Management', 'Inventory Management', '/inventory', 'Inventory', 4, 1, true, NOW(), NOW()),
(1, 'Accounting', 'Accounting', '/accounting', 'AccountBalance', 5, 1, true, NOW(), NOW()),
(1, 'HR Management', 'HR Management', '/hr', 'Work', 6, 1, true, NOW(), NOW()),
(1, 'AI Analysis', 'AI Analysis', '/ai', 'Analytics', 7, 1, true, NOW(), NOW()),
(1, 'System Settings', 'System Settings', '/system', 'Settings', 8, 1, true, NOW(), NOW());

-- 사용자 권한 생성
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 1, id, true, true, true, true, NOW(), NOW() FROM menus WHERE tenant_id = 1;
