-- 시스템관리 메뉴 비활성화
-- 기본정보관리의 시스템 설정과 동일한 기능이므로 제거

-- 시스템관리 메뉴 비활성화 (is_active = false)
UPDATE menus 
SET is_active = false, 
    updated_at = NOW()
WHERE name_ko = '시스템관리' 
   OR name_en = 'System Management'
   OR route = '/system';

-- 시스템관리 하위 메뉴들도 비활성화
UPDATE menus 
SET is_active = false, 
    updated_at = NOW()
WHERE parent_id IN (
    SELECT id FROM menus 
    WHERE (name_ko = '시스템관리' OR name_en = 'System Management' OR route = '/system')
      AND parent_id IS NULL
);



