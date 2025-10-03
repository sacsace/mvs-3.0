-- MVS 3.0 초기 데이터 시드 스크립트

-- 테넌트 데이터 (이미 존재한다면 무시)
INSERT INTO tenants (id, name, domain, subdomain, plan, status, created_at, updated_at) 
VALUES (1, 'Default Tenant', 'localhost', 'default', 'enterprise', 'active', NOW(), NOW())
ON CONFLICT (id) DO NOTHING;

-- 회사 데이터
INSERT INTO companies (tenant_id, name, business_number, ceo_name, address, phone, email, industry, size, status, created_at, updated_at)
VALUES (1, 'Minsub Ventures', '123-45-67890', 'Minsub Lee', 'Seoul, Korea', '02-1234-5678', 'minsub.lee@gmail.com', 'IT', 'medium', 'active', NOW(), NOW())
ON CONFLICT (business_number) DO NOTHING;

-- 메뉴 데이터
INSERT INTO menus (tenant_id, name_ko, name_en, route, icon, "order", level, is_active, created_at, updated_at) VALUES 
(1, 'Dashboard', 'Dashboard', '/dashboard', 'Dashboard', 1, 1, true, NOW(), NOW()),
(1, 'User Management', 'User Management', '/users', 'People', 2, 1, true, NOW(), NOW()),
(1, 'Company Management', 'Company Management', '/company', 'Business', 3, 1, true, NOW(), NOW()),
(1, 'Inventory Management', 'Inventory Management', '/inventory', 'Inventory', 4, 1, true, NOW(), NOW()),
(1, 'Accounting', 'Accounting', '/accounting', 'AccountBalance', 5, 1, true, NOW(), NOW()),
(1, 'HR Management', 'HR Management', '/hr', 'Work', 6, 1, true, NOW(), NOW()),
(1, 'AI Analysis', 'AI Analysis', '/ai', 'Analytics', 7, 1, true, NOW(), NOW()),
(1, 'System Settings', 'System Settings', '/system', 'Settings', 8, 1, true, NOW(), NOW())
ON CONFLICT (tenant_id, "order") DO NOTHING;

-- 사용자 권한 데이터
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 1, id, true, true, true, true, NOW(), NOW() FROM menus WHERE tenant_id = 1
ON CONFLICT (user_id, menu_id) DO NOTHING;
