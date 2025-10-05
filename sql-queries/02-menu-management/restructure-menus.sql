-- MVS 3.0 메뉴 구조 재구성 (이미지와 일치)

-- 기존 데이터 삭제
DELETE FROM user_permissions;
DELETE FROM menus;

-- 1단계 메뉴 (이미지와 일치)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, NULL, '대시보드', 'Dashboard', '/dashboard', 'dashboard', 1, 1, true, '시스템 현황 및 통계', NOW(), NOW()),
(1, NULL, '기본정보관리', 'Basic Information Management', '/basic-info', 'business', 2, 1, true, '회사 정보 및 기본 설정', NOW(), NOW()),
(1, NULL, '인사관리', 'HR Management', '/hr', 'people', 3, 1, true, '사용자 및 인사 관리', NOW(), NOW()),
(1, NULL, '업무관리', 'Task Management', '/work', 'work', 4, 1, true, '프로젝트 및 업무 관리', NOW(), NOW()),
(1, NULL, '회계관리', 'Accounting Management', '/accounting', 'account_balance', 5, 1, true, '회계 및 재무 관리', NOW(), NOW()),
(1, NULL, '재고관리', 'Inventory Management', '/inventory', 'inventory', 6, 1, true, '재고 및 물류 관리', NOW(), NOW()),
(1, NULL, '고객관리', 'Customer Management', '/customers', 'people', 7, 1, true, '고객 정보 및 영업 관리', NOW(), NOW()),
(1, NULL, 'AI 분석', 'AI Analysis', '/ai', 'psychology', 8, 1, true, 'AI 기반 분석 및 예측', NOW(), NOW()),
(1, NULL, '커뮤니케이션', 'Communication', '/communication', 'chat', 9, 1, true, '소통 및 협업 도구', NOW(), NOW()),
(1, NULL, '시스템관리', 'System Management', '/system', 'settings', 10, 1, true, '시스템 관리 및 설정', NOW(), NOW());

-- 기본정보관리 하위 메뉴
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 2, '회사 정보 관리', 'Company Information Management', '/basic-info/company', 'business', 1, 2, true, '회사 정보 관리', NOW(), NOW()),
(1, 2, '파트너 업체 관리', 'Partner Company Management', '/basic-info/partners', 'business', 2, 2, true, '파트너 업체 관리', NOW(), NOW()),
(1, 2, '조직도 관리', 'Organization Chart Management', '/basic-info/organization', 'account_tree', 3, 2, true, '조직도 관리', NOW(), NOW()),
(1, 2, '메뉴권한관리', 'Menu Permission Management', '/basic-info/menu-permissions', 'lock', 4, 2, true, '메뉴 권한 관리', NOW(), NOW()),
(1, 2, '시스템 설정', 'System Settings', '/basic-info/system-settings', 'settings', 5, 2, true, '시스템 설정', NOW(), NOW());

-- 인사관리 하위 메뉴
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 3, '사용자 관리', 'User Management', '/hr/users', 'people', 1, 2, true, '사용자 관리', NOW(), NOW()),
(1, 3, '근태 관리', 'Attendance Management', '/hr/attendance', 'schedule', 2, 2, true, '근태 관리', NOW(), NOW()),
(1, 3, '급여 관리', 'Payroll Management', '/hr/payroll', 'payments', 3, 2, true, '급여 관리', NOW(), NOW()),
(1, 3, '휴가 관리', 'Leave Management', '/hr/leave', 'event', 4, 2, true, '휴가 관리', NOW(), NOW()),
(1, 3, '성과 관리', 'Performance Management', '/hr/performance', 'trending_up', 5, 2, true, '성과 관리', NOW(), NOW());

-- 업무관리 하위 메뉴
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 4, '프로젝트 관리', 'Project Management', '/work/projects', 'work', 1, 2, true, '프로젝트 관리', NOW(), NOW()),
(1, 4, '업무 통계', 'Task Statistics', '/work/statistics', 'bar_chart', 2, 2, true, '업무 통계', NOW(), NOW()),
(1, 4, '전자결재', 'Electronic Approval', '/work/approval', 'approval', 3, 2, true, '전자결재', NOW(), NOW()),
(1, 4, '견적서 관리', 'Quotation Management', '/work/quotation', 'description', 4, 2, true, '견적서 관리', NOW(), NOW()),
(1, 4, '회의실 예약', 'Meeting Room Reservation', '/work/meeting-room', 'meeting_room', 5, 2, true, '회의실 예약', NOW(), NOW()),
(1, 4, '객실 예약 관리', 'Room Reservation Management', '/work/room-reservation', 'hotel', 6, 2, true, '객실 예약 관리', NOW(), NOW()),
(1, 4, '업무 보고서', 'Work Report', '/work/reports', 'description', 7, 2, true, '업무 보고서', NOW(), NOW());

-- 회계관리 하위 메뉴
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 5, 'E-Invoice', 'E-Invoice', '/accounting/e-invoice', 'receipt_long', 1, 2, true, 'E-Invoice', NOW(), NOW()),
(1, 5, '일반 인보이스', 'General Invoice', '/accounting/invoice', 'receipt', 2, 2, true, '일반 인보이스', NOW(), NOW()),
(1, 5, '지출결의서', 'Expense Report', '/accounting/expense', 'money_off', 3, 2, true, '지출결의서', NOW(), NOW()),
(1, 5, '예산 관리', 'Budget Management', '/accounting/budget', 'account_balance', 4, 2, true, '예산 관리', NOW(), NOW()),
(1, 5, '자산 관리', 'Asset Management', '/accounting/assets', 'account_balance', 5, 2, true, '자산 관리', NOW(), NOW()),
(1, 5, '회계 통계', 'Accounting Statistics', '/accounting/statistics', 'assessment', 6, 2, true, '회계 통계', NOW(), NOW());

-- 재고관리 하위 메뉴
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 6, '기초재고 등록', 'Basic Inventory Registration', '/inventory/basic', 'inventory_2', 1, 2, true, '기초재고 등록', NOW(), NOW()),
(1, 6, '재고 현황 확인', 'Check Inventory Status', '/inventory/status', 'inventory_2', 2, 2, true, '재고 현황 확인', NOW(), NOW()),
(1, 6, '입출고 관리', 'In/Outbound Management', '/inventory/transaction', 'swap_horiz', 3, 2, true, '입출고 관리', NOW(), NOW()),
(1, 6, '재고 이동 및 조정', 'Inventory Movement and Adjustment', '/inventory/movement', 'inventory_2', 4, 2, true, '재고 이동 및 조정', NOW(), NOW()),
(1, 6, '재고 보고서', 'Inventory Report', '/inventory/report', 'assessment', 5, 2, true, '재고 보고서', NOW(), NOW());

-- 고객관리 하위 메뉴
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 7, '고객 정보', 'Customer Information', '/customers/info', 'people', 1, 2, true, '고객 정보', NOW(), NOW()),
(1, 7, '영업 기회', 'Sales Opportunity', '/customers/sales', 'trending_up', 2, 2, true, '영업 기회', NOW(), NOW()),
(1, 7, '계약 관리', 'Contract Management', '/customers/contracts', 'description', 3, 2, true, '계약 관리', NOW(), NOW()),
(1, 7, '고객 지원', 'Customer Support', '/customers/support', 'support_agent', 4, 2, true, '고객 지원', NOW(), NOW());

-- 사용자 권한 생성 (모든 메뉴에 대해)
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 1, id, true, true, true, true, NOW(), NOW() FROM menus WHERE tenant_id = 1;
