-- MVS 3.0 완전한 메뉴 시스템 구축

-- 기존 메뉴 삭제
DELETE FROM user_permissions;
DELETE FROM menus;

-- 메인 메뉴들 생성
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
-- 1. 대시보드
(1, NULL, '대시보드', 'Dashboard', '/dashboard', 'dashboard', 1, 0, true, '시스템 현황 및 통계 대시보드', NOW(), NOW()),

-- 2. 재고 관리
(1, NULL, '재고 관리', 'Inventory Management', '/inventory', 'inventory', 2, 0, true, '재고 입출고 및 재고 현황 관리', NOW(), NOW()),

-- 3. 견적서 관리
(1, NULL, '견적서 관리', 'Quotation Management', '/quotation', 'description', 3, 0, true, '견적서 작성 및 관리', NOW(), NOW()),

-- 4. 프로포마 인보이스
(1, NULL, '프로포마 인보이스', 'Proforma Invoice', '/proforma', 'receipt_long', 4, 0, true, '프로포마 인보이스 관리', NOW(), NOW()),

-- 5. 일반 인보이스
(1, NULL, '일반 인보이스', 'Regular Invoice', '/invoice', 'receipt', 5, 0, true, '일반 인보이스 관리', NOW(), NOW()),

-- 6. E-인보이스
(1, NULL, 'E-인보이스', 'E-Invoice', '/e-invoice', 'receipt_long', 6, 0, true, '전자 인보이스 관리', NOW(), NOW()),

-- 7. E-Way Bill
(1, NULL, 'E-Way Bill', 'E-Way Bill', '/eway-bill', 'local_shipping', 7, 0, true, 'E-Way Bill 관리', NOW(), NOW()),

-- 8. 고객 관리
(1, NULL, '고객 관리', 'Customer Management', '/customers', 'people', 8, 0, true, '고객 정보 및 관계 관리', NOW(), NOW()),

-- 9. 회계 관리
(1, NULL, '회계 관리', 'Accounting', '/accounting', 'account_balance', 9, 0, true, '회계 및 재무 관리', NOW(), NOW()),

-- 10. 보고서
(1, NULL, '보고서', 'Reports', '/reports', 'assessment', 10, 0, true, '다양한 비즈니스 보고서', NOW(), NOW()),

-- 11. 사용자 관리
(1, NULL, '사용자 관리', 'User Management', '/users', 'person', 11, 0, true, '사용자 계정 및 권한 관리', NOW(), NOW()),

-- 12. 시스템 설정
(1, NULL, '시스템 설정', 'System Settings', '/settings', 'settings', 12, 0, true, '시스템 전반 설정', NOW(), NOW()),

-- 13. 알림
(1, NULL, '알림', 'Notifications', '/notifications', 'notifications', 13, 0, true, '시스템 알림 관리', NOW(), NOW()),

-- 14. AI 분석
(1, NULL, 'AI 분석', 'AI Analytics', '/ai', 'psychology', 14, 0, true, 'AI 기반 데이터 분석', NOW(), NOW()),

-- 15. 채팅
(1, NULL, '채팅', 'Chat', '/chat', 'chat', 15, 0, true, '실시간 채팅 시스템', NOW(), NOW());
