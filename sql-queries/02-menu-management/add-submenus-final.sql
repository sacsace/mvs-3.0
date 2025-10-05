-- 하위 메뉴 추가 (올바른 부모 ID 사용)

-- 기본정보관리 하위 메뉴 (부모 ID: 78)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 78, '회사 정보 관리', 'Company Information Management', '/basic-info/company', 'business', 1, 2, true, '회사 정보 관리', NOW(), NOW()),
(1, 78, '파트너 업체 관리', 'Partner Company Management', '/basic-info/partners', 'business', 2, 2, true, '파트너 업체 관리', NOW(), NOW()),
(1, 78, '조직도 관리', 'Organization Chart Management', '/basic-info/organization', 'account_tree', 3, 2, true, '조직도 관리', NOW(), NOW()),
(1, 78, '메뉴권한관리', 'Menu Permission Management', '/basic-info/menu-permissions', 'lock', 4, 2, true, '메뉴 권한 관리', NOW(), NOW()),
(1, 78, '시스템 설정', 'System Settings', '/basic-info/system-settings', 'settings', 5, 2, true, '시스템 설정', NOW(), NOW());

-- 인사관리 하위 메뉴 (부모 ID: 79)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 79, '사용자 관리', 'User Management', '/hr/users', 'people', 1, 2, true, '사용자 관리', NOW(), NOW()),
(1, 79, '근태 관리', 'Attendance Management', '/hr/attendance', 'schedule', 2, 2, true, '근태 관리', NOW(), NOW()),
(1, 79, '급여 관리', 'Payroll Management', '/hr/payroll', 'payments', 3, 2, true, '급여 관리', NOW(), NOW()),
(1, 79, '휴가 관리', 'Leave Management', '/hr/leave', 'event', 4, 2, true, '휴가 관리', NOW(), NOW()),
(1, 79, '성과 관리', 'Performance Management', '/hr/performance', 'trending_up', 5, 2, true, '성과 관리', NOW(), NOW());

-- 업무관리 하위 메뉴 (부모 ID: 80)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 80, '프로젝트 관리', 'Project Management', '/work/projects', 'work', 1, 2, true, '프로젝트 관리', NOW(), NOW()),
(1, 80, '업무 통계', 'Task Statistics', '/work/statistics', 'bar_chart', 2, 2, true, '업무 통계', NOW(), NOW()),
(1, 80, '전자결재', 'Electronic Approval', '/work/approval', 'approval', 3, 2, true, '전자결재', NOW(), NOW()),
(1, 80, '견적서 관리', 'Quotation Management', '/work/quotation', 'description', 4, 2, true, '견적서 관리', NOW(), NOW()),
(1, 80, '회의실 예약', 'Meeting Room Reservation', '/work/meeting-room', 'meeting_room', 5, 2, true, '회의실 예약', NOW(), NOW()),
(1, 80, '객실 예약 관리', 'Room Reservation Management', '/work/room-reservation', 'hotel', 6, 2, true, '객실 예약 관리', NOW(), NOW()),
(1, 80, '업무 보고서', 'Work Report', '/work/reports', 'description', 7, 2, true, '업무 보고서', NOW(), NOW());

-- 회계관리 하위 메뉴 (부모 ID: 81)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 81, 'E-Invoice', 'E-Invoice', '/accounting/e-invoice', 'receipt_long', 1, 2, true, 'E-Invoice', NOW(), NOW()),
(1, 81, '일반 인보이스', 'General Invoice', '/accounting/invoice', 'receipt', 2, 2, true, '일반 인보이스', NOW(), NOW()),
(1, 81, '지출결의서', 'Expense Report', '/accounting/expense', 'money_off', 3, 2, true, '지출결의서', NOW(), NOW()),
(1, 81, '예산 관리', 'Budget Management', '/accounting/budget', 'account_balance', 4, 2, true, '예산 관리', NOW(), NOW()),
(1, 81, '자산 관리', 'Asset Management', '/accounting/assets', 'account_balance', 5, 2, true, '자산 관리', NOW(), NOW()),
(1, 81, '회계 통계', 'Accounting Statistics', '/accounting/statistics', 'assessment', 6, 2, true, '회계 통계', NOW(), NOW());

-- 재고관리 하위 메뉴 (부모 ID: 82)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 82, '기초재고 등록', 'Basic Inventory Registration', '/inventory/basic', 'inventory_2', 1, 2, true, '기초재고 등록', NOW(), NOW()),
(1, 82, '재고 현황 확인', 'Check Inventory Status', '/inventory/status', 'inventory_2', 2, 2, true, '재고 현황 확인', NOW(), NOW()),
(1, 82, '입출고 관리', 'In/Outbound Management', '/inventory/transaction', 'swap_horiz', 3, 2, true, '입출고 관리', NOW(), NOW()),
(1, 82, '재고 이동 및 조정', 'Inventory Movement and Adjustment', '/inventory/movement', 'inventory_2', 4, 2, true, '재고 이동 및 조정', NOW(), NOW()),
(1, 82, '재고 보고서', 'Inventory Report', '/inventory/report', 'assessment', 5, 2, true, '재고 보고서', NOW(), NOW());

-- 고객관리 하위 메뉴 (부모 ID: 83)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 83, '고객 정보', 'Customer Information', '/customers/info', 'people', 1, 2, true, '고객 정보', NOW(), NOW()),
(1, 83, '영업 기회', 'Sales Opportunity', '/customers/sales', 'trending_up', 2, 2, true, '영업 기회', NOW(), NOW()),
(1, 83, '계약 관리', 'Contract Management', '/customers/contracts', 'description', 3, 2, true, '계약 관리', NOW(), NOW()),
(1, 83, '고객 지원', 'Customer Support', '/customers/support', 'support_agent', 4, 2, true, '고객 지원', NOW(), NOW());

-- 새로 추가된 하위 메뉴들에 대한 사용자 권한 생성
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 1, id, true, true, true, true, NOW(), NOW() FROM menus WHERE tenant_id = 1 AND level = 2;
