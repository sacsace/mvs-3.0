-- MVS 3.0 데이터베이스 상태 확인

-- 사용자 수 확인
SELECT COUNT(*) as user_count FROM "user";

-- 사용자 목록
SELECT userid, username, email, role FROM "user";

-- 테넌트 수 확인
SELECT COUNT(*) as tenant_count FROM tenant;

-- 회사 수 확인
SELECT COUNT(*) as company_count FROM company;

-- 메뉴 수 확인
SELECT COUNT(*) as menu_count FROM menu;

-- 채팅방 수 확인
SELECT COUNT(*) as chat_room_count FROM chat_room;

-- 사용자 메뉴 권한 수 확인
SELECT COUNT(*) as permission_count FROM user_menu_permission;
