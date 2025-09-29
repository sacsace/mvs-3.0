-- MVS 3.0 하위 메뉴 생성 (올바른 ID 사용)

-- 대시보드 하위 메뉴 (parent_id = 36)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 36, '통계', 'Statistics', '/dashboard/stats', 'analytics', 1, 1, true, '시스템 통계 정보', NOW(), NOW()),
(1, 36, '차트', 'Charts', '/dashboard/charts', 'bar_chart', 2, 1, true, '데이터 시각화 차트', NOW(), NOW()),
(1, 36, '실시간 모니터링', 'Real-time Monitoring', '/dashboard/monitoring', 'monitor', 3, 1, true, '실시간 시스템 모니터링', NOW(), NOW());

-- 재고 관리 하위 메뉴 (parent_id = 37)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 37, '재고 현황', 'Inventory Status', '/inventory/status', 'inventory_2', 1, 1, true, '현재 재고 현황 조회', NOW(), NOW()),
(1, 37, '입고 관리', 'Stock In', '/inventory/stock-in', 'add_box', 2, 1, true, '재고 입고 처리', NOW(), NOW()),
(1, 37, '출고 관리', 'Stock Out', '/inventory/stock-out', 'remove_box', 3, 1, true, '재고 출고 처리', NOW(), NOW()),
(1, 37, '재고 조정', 'Stock Adjustment', '/inventory/adjustment', 'tune', 4, 1, true, '재고 수량 조정', NOW(), NOW()),
(1, 37, '재고 이력', 'Stock History', '/inventory/history', 'history', 5, 1, true, '재고 입출고 이력', NOW(), NOW());

-- 견적서 관리 하위 메뉴 (parent_id = 38)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 38, '견적서 목록', 'Quotation List', '/quotation/list', 'list', 1, 1, true, '견적서 목록 조회', NOW(), NOW()),
(1, 38, '견적서 작성', 'Create Quotation', '/quotation/create', 'add', 2, 1, true, '새 견적서 작성', NOW(), NOW()),
(1, 38, '견적서 승인', 'Quotation Approval', '/quotation/approval', 'check_circle', 3, 1, true, '견적서 승인 처리', NOW(), NOW()),
(1, 38, '견적서 템플릿', 'Quotation Templates', '/quotation/templates', 'description', 4, 1, true, '견적서 템플릿 관리', NOW(), NOW());

-- 프로포마 인보이스 하위 메뉴 (parent_id = 39)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 39, '프로포마 목록', 'Proforma List', '/proforma/list', 'list', 1, 1, true, '프로포마 인보이스 목록', NOW(), NOW()),
(1, 39, '프로포마 작성', 'Create Proforma', '/proforma/create', 'add', 2, 1, true, '새 프로포마 인보이스 작성', NOW(), NOW()),
(1, 39, '프로포마 승인', 'Proforma Approval', '/proforma/approval', 'check_circle', 3, 1, true, '프로포마 인보이스 승인', NOW(), NOW()),
(1, 39, '인보이스 변환', 'Convert to Invoice', '/proforma/convert', 'transform', 4, 1, true, '프로포마를 일반 인보이스로 변환', NOW(), NOW());

-- 일반 인보이스 하위 메뉴 (parent_id = 40)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 40, '인보이스 목록', 'Invoice List', '/invoice/list', 'list', 1, 1, true, '일반 인보이스 목록', NOW(), NOW()),
(1, 40, '인보이스 작성', 'Create Invoice', '/invoice/create', 'add', 2, 1, true, '새 인보이스 작성', NOW(), NOW()),
(1, 40, '인보이스 승인', 'Invoice Approval', '/invoice/approval', 'check_circle', 3, 1, true, '인보이스 승인 처리', NOW(), NOW()),
(1, 40, '인보이스 발송', 'Invoice Dispatch', '/invoice/dispatch', 'send', 4, 1, true, '인보이스 발송 관리', NOW(), NOW());

-- E-인보이스 하위 메뉴 (parent_id = 41)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 41, 'E-인보이스 목록', 'E-Invoice List', '/e-invoice/list', 'list', 1, 1, true, '전자 인보이스 목록', NOW(), NOW()),
(1, 41, 'E-인보이스 생성', 'Create E-Invoice', '/e-invoice/create', 'add', 2, 1, true, '새 E-인보이스 생성', NOW(), NOW()),
(1, 41, 'E-인보이스 전송', 'Send E-Invoice', '/e-invoice/send', 'send', 3, 1, true, 'E-인보이스 전송', NOW(), NOW()),
(1, 41, 'E-인보이스 상태', 'E-Invoice Status', '/e-invoice/status', 'visibility', 4, 1, true, 'E-인보이스 상태 조회', NOW(), NOW());

-- E-Way Bill 하위 메뉴 (parent_id = 42)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 42, 'E-Way Bill 목록', 'E-Way Bill List', '/eway-bill/list', 'list', 1, 1, true, 'E-Way Bill 목록', NOW(), NOW()),
(1, 42, 'E-Way Bill 생성', 'Create E-Way Bill', '/eway-bill/create', 'add', 2, 1, true, '새 E-Way Bill 생성', NOW(), NOW()),
(1, 42, 'E-Way Bill 전송', 'Send E-Way Bill', '/eway-bill/send', 'send', 3, 1, true, 'E-Way Bill 전송', NOW(), NOW()),
(1, 42, 'E-Way Bill 추적', 'Track E-Way Bill', '/eway-bill/track', 'track_changes', 4, 1, true, 'E-Way Bill 추적', NOW(), NOW());

-- 고객 관리 하위 메뉴 (parent_id = 43)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 43, '고객 목록', 'Customer List', '/customers/list', 'list', 1, 1, true, '고객 목록 조회', NOW(), NOW()),
(1, 43, '고객 등록', 'Register Customer', '/customers/register', 'person_add', 2, 1, true, '새 고객 등록', NOW(), NOW()),
(1, 43, '고객 상세', 'Customer Details', '/customers/details', 'person', 3, 1, true, '고객 상세 정보', NOW(), NOW()),
(1, 43, '고객 통계', 'Customer Statistics', '/customers/stats', 'analytics', 4, 1, true, '고객 관련 통계', NOW(), NOW());

-- 회계 관리 하위 메뉴 (parent_id = 44)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 44, '수입 관리', 'Income Management', '/accounting/income', 'trending_up', 1, 1, true, '수입 관리', NOW(), NOW()),
(1, 44, '지출 관리', 'Expense Management', '/accounting/expense', 'trending_down', 2, 1, true, '지출 관리', NOW(), NOW()),
(1, 44, '자산 관리', 'Asset Management', '/accounting/assets', 'account_balance', 3, 1, true, '자산 관리', NOW(), NOW()),
(1, 44, '예산 관리', 'Budget Management', '/accounting/budget', 'savings', 4, 1, true, '예산 관리', NOW(), NOW()),
(1, 44, '재무 보고서', 'Financial Reports', '/accounting/reports', 'assessment', 5, 1, true, '재무 보고서', NOW(), NOW());

-- 보고서 하위 메뉴 (parent_id = 45)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 45, '매출 보고서', 'Sales Reports', '/reports/sales', 'trending_up', 1, 1, true, '매출 관련 보고서', NOW(), NOW()),
(1, 45, '재고 보고서', 'Inventory Reports', '/reports/inventory', 'inventory', 2, 1, true, '재고 관련 보고서', NOW(), NOW()),
(1, 45, '고객 보고서', 'Customer Reports', '/reports/customers', 'people', 3, 1, true, '고객 관련 보고서', NOW(), NOW()),
(1, 45, '재무 보고서', 'Financial Reports', '/reports/financial', 'account_balance', 4, 1, true, '재무 관련 보고서', NOW(), NOW()),
(1, 45, 'AI 분석 보고서', 'AI Analytics Reports', '/reports/ai', 'psychology', 5, 1, true, 'AI 분석 보고서', NOW(), NOW());

-- 사용자 관리 하위 메뉴 (parent_id = 46)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 46, '사용자 목록', 'User List', '/users/list', 'list', 1, 1, true, '사용자 목록 조회', NOW(), NOW()),
(1, 46, '사용자 등록', 'Register User', '/users/register', 'person_add', 2, 1, true, '새 사용자 등록', NOW(), NOW()),
(1, 46, '권한 관리', 'Permission Management', '/users/permissions', 'security', 3, 1, true, '사용자 권한 관리', NOW(), NOW()),
(1, 46, '역할 관리', 'Role Management', '/users/roles', 'admin_panel_settings', 4, 1, true, '사용자 역할 관리', NOW(), NOW());

-- 시스템 설정 하위 메뉴 (parent_id = 47)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 47, '일반 설정', 'General Settings', '/settings/general', 'settings', 1, 1, true, '일반 시스템 설정', NOW(), NOW()),
(1, 47, '회사 정보', 'Company Information', '/settings/company', 'business', 2, 1, true, '회사 정보 관리', NOW(), NOW()),
(1, 47, 'GST 설정', 'GST Settings', '/settings/gst', 'receipt', 3, 1, true, 'GST 번호 설정', NOW(), NOW()),
(1, 47, '보안 설정', 'Security Settings', '/settings/security', 'lock', 4, 1, true, '보안 관련 설정', NOW(), NOW()),
(1, 47, '통합 설정', 'Integration Settings', '/settings/integration', 'integration_instructions', 5, 1, true, '외부 시스템 통합 설정', NOW(), NOW());

-- AI 분석 하위 메뉴 (parent_id = 49)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 49, '비용 분석', 'Cost Analysis', '/ai/cost-analysis', 'analytics', 1, 1, true, 'AI 기반 비용 분석', NOW(), NOW()),
(1, 49, '효율성 지표', 'Efficiency Metrics', '/ai/efficiency', 'speed', 2, 1, true, '업무 효율성 분석', NOW(), NOW()),
(1, 49, '예측 분석', 'Forecasting', '/ai/forecasting', 'trending_up', 3, 1, true, 'AI 예측 분석', NOW(), NOW()),
(1, 49, '추천 시스템', 'Recommendations', '/ai/recommendations', 'recommend', 4, 1, true, 'AI 추천 시스템', NOW(), NOW());
