-- MVS 3.0 사용자 권한 설정

-- 관리자 권한 (user_id = 1, 모든 메뉴에 대한 모든 권한)
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete) 
SELECT 1, id, true, true, true, true FROM menus WHERE tenant_id = 1;

-- 일반 사용자 권한 (user_id = 2, 제한된 메뉴에 대한 조회 권한만)
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete) 
SELECT 2, id, true, false, false, false 
FROM menus 
WHERE tenant_id = 1 
AND (name_en IN ('Dashboard', 'Inventory Management', 'Customer Management', 'Reports', 'Notifications', 'Chat')
     OR parent_id IN (36, 37, 43, 45, 48, 50)); -- 대시보드, 재고관리, 고객관리, 보고서, 알림, 채팅
