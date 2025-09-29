-- 현재 메뉴 구조 확인
SELECT id, name_ko, name_en, route, icon, "order", level, parent_id, is_active, description 
FROM menus 
ORDER BY "order", level;
