-- 최상위 메뉴 설명 업데이트
UPDATE menus SET description = '시스템 현황 및 동계' WHERE name_ko = '대시보드';
UPDATE menus SET description = '회사 정보 및 기본 설정' WHERE name_ko = '기본정보관리';
UPDATE menus SET description = '사용자 및 인사 관리' WHERE name_ko = '인사관리';
UPDATE menus SET description = '프로젝트 및 업무 관리' WHERE name_ko = '업무관리';
UPDATE menus SET description = '회계 및 재무 관리' WHERE name_ko = '회계관리';
UPDATE menus SET description = '재고 및 물류 관리' WHERE name_ko = '재고관리';
UPDATE menus SET description = '고객 정보 및 영업 관리' WHERE name_ko = '고객관리';
UPDATE menus SET description = 'AI 기반 분석 및 예측' WHERE name_ko = 'AI 분석';
UPDATE menus SET description = '소통 및 협업 도구' WHERE name_ko = '커뮤니케이션';
UPDATE menus SET description = '시스템 관리 및 설정' WHERE name_ko = '시스템관리';