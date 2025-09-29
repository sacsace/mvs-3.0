-- MVS 3.0 기본 사용자 생성 스크립트

-- 기본 사용자 생성 (root 사용자)
INSERT INTO "user" (
    tenant_id,
    company_id,
    userid,
    username,
    email,
    password,
    role,
    department,
    position,
    status,
    first_name,
    last_name,
    is_root,
    is_audit,
    is_admin,
    is_user
) VALUES (
    1,
    1,
    'root',
    'Root User',
    'root@mvs.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8K8K8', -- password: admin123
    'root',
    'IT',
    'System Administrator',
    'active',
    'Root',
    'User',
    true,
    false,
    false,
    false
);

-- 기본 사용자 생성 (admin 사용자)
INSERT INTO "user" (
    tenant_id,
    company_id,
    userid,
    username,
    email,
    password,
    role,
    department,
    position,
    status,
    first_name,
    last_name,
    is_root,
    is_audit,
    is_admin,
    is_user
) VALUES (
    1,
    1,
    'admin',
    'Admin User',
    'admin@mvs.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8K8K8', -- password: admin123
    'admin',
    'Management',
    'Administrator',
    'active',
    'Admin',
    'User',
    false,
    false,
    true,
    false
);

-- 기본 사용자 생성 (일반 사용자)
INSERT INTO "user" (
    tenant_id,
    company_id,
    userid,
    username,
    email,
    password,
    role,
    department,
    position,
    status,
    first_name,
    last_name,
    is_root,
    is_audit,
    is_admin,
    is_user
) VALUES (
    1,
    1,
    'user1',
    'Test User',
    'user@mvs.com',
    '$2a$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/8K8K8K8', -- password: admin123
    'user',
    'Sales',
    'Sales Representative',
    'active',
    'Test',
    'User',
    false,
    false,
    false,
    true
);

-- 기본 채팅방 생성 (사용자 생성 후)
INSERT INTO chat_room (tenant_id, company_id, name, description, room_type, created_by, is_active) VALUES
(1, 1, 'General Chat', 'General chat room for all employees', 'group', 1, true),
(1, 1, 'Announcements', 'Important announcements chat room', 'group', 1, true);

-- 사용자 메뉴 권한 설정 (root 사용자에게 모든 권한 부여)
INSERT INTO user_menu_permission (user_id, menu_id, can_read, can_create, can_update, can_delete)
SELECT 1, id, true, true, true, true
FROM menu
WHERE tenant_id = 1;

-- 사용자 메뉴 권한 설정 (admin 사용자에게 읽기/생성/수정 권한 부여)
INSERT INTO user_menu_permission (user_id, menu_id, can_read, can_create, can_update, can_delete)
SELECT 2, id, true, true, true, false
FROM menu
WHERE tenant_id = 1;

-- 사용자 메뉴 권한 설정 (일반 사용자에게 읽기 권한만 부여)
INSERT INTO user_menu_permission (user_id, menu_id, can_read, can_create, can_update, can_delete)
SELECT 3, id, true, false, false, false
FROM menu
WHERE tenant_id = 1;
