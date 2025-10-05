-- AI 분석, 커뮤니케이션, 시스템관리 하위 메뉴 추가

-- AI 분석 하위 메뉴 (부모 ID: 84)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 84, '비용 분석', 'Cost Analysis', '/ai/cost-analysis', 'analytics', 1, 2, true, '비용 분석 및 최적화', NOW(), NOW()),
(1, 84, '효율성 지표', 'Efficiency Metrics', '/ai/efficiency-metrics', 'trending_up', 2, 2, true, '업무 효율성 분석', NOW(), NOW()),
(1, 84, '수요 예측', 'Demand Forecasting', '/ai/forecasting-data', 'psychology', 3, 2, true, '수요 예측 및 분석', NOW(), NOW()),
(1, 84, '추천 시스템', 'Recommendation Engine', '/ai/recommendation-engine', 'auto_awesome', 4, 2, true, 'AI 기반 추천 시스템', NOW(), NOW());

-- 커뮤니케이션 하위 메뉴 (부모 ID: 85)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 85, '채팅방', 'Chat Room', '/communication/chat', 'chat', 1, 2, true, '실시간 채팅 시스템', NOW(), NOW()),
(1, 85, '공지사항', 'Notice Board', '/communication/notice', 'campaign', 2, 2, true, '공지사항 관리', NOW(), NOW()),
(1, 85, '이메일 관리', 'Email Management', '/communication/email', 'email', 3, 2, true, '이메일 발송 및 관리', NOW(), NOW()),
(1, 85, 'SMS 관리', 'SMS Management', '/communication/sms', 'sms', 4, 2, true, 'SMS 발송 및 관리', NOW(), NOW());

-- 시스템관리 하위 메뉴 (부모 ID: 86)
INSERT INTO menus (tenant_id, parent_id, name_ko, name_en, route, icon, "order", level, is_active, description, created_at, updated_at) VALUES 
(1, 86, '사용자 관리', 'User Management', '/system/users', 'people', 1, 2, true, '시스템 사용자 관리', NOW(), NOW()),
(1, 86, '로그 관리', 'Log Management', '/system/logs', 'history', 2, 2, true, '시스템 로그 관리', NOW(), NOW()),
(1, 86, '백업 관리', 'Backup Management', '/system/backup', 'backup', 3, 2, true, '데이터 백업 관리', NOW(), NOW()),
(1, 86, '시스템 설정', 'System Settings', '/system/settings', 'settings', 4, 2, true, '시스템 전반 설정', NOW(), NOW()),
(1, 86, '보안 관리', 'Security Management', '/system/security', 'security', 5, 2, true, '보안 설정 및 관리', NOW(), NOW()),
(1, 86, '모니터링', 'System Monitoring', '/system/monitoring', 'monitor', 6, 2, true, '시스템 모니터링', NOW(), NOW());

-- 새로 추가된 하위 메뉴들에 대한 사용자 권한 생성
INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
SELECT 1, id, true, true, true, true, NOW(), NOW() FROM menus WHERE tenant_id = 1 AND level = 2 AND parent_id IN (84, 85, 86);
