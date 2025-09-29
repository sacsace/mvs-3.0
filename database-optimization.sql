-- MVS 3.0 데이터베이스 최적화 스크립트

-- 1. 사용자 테이블 최적화
-- 로그인 성능을 위한 복합 인덱스
CREATE INDEX IF NOT EXISTS idx_users_login ON users(tenant_id, userid, status);

-- 역할별 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_users_role ON users(tenant_id, role, status);

-- 마지막 로그인 시간 기반 조회
CREATE INDEX IF NOT EXISTS idx_users_last_login ON users(last_login DESC) WHERE last_login IS NOT NULL;

-- 2. 메뉴 테이블 최적화
-- 계층 구조 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_menus_hierarchy ON menus(tenant_id, parent_id, level, "order");

-- 활성 메뉴 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_menus_active ON menus(tenant_id, is_active, "order") WHERE is_active = true;

-- 3. 사용자 권한 테이블 최적화
-- 권한 조회를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_user_permissions_lookup ON user_permissions(user_id, menu_id);

-- 4. 알림 테이블 최적화 (있다면)
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_notifications_tenant ON notifications(tenant_id, created_at DESC);

-- 5. 통계 쿼리를 위한 인덱스
-- 사용자 통계
CREATE INDEX IF NOT EXISTS idx_users_stats ON users(tenant_id, created_at, status);

-- 6. 외래키 제약조건 검증
-- 잘못된 외래키 참조 확인
DO $$
BEGIN
    -- menus 테이블의 tenant_id가 users.id를 참조하는 것은 잘못됨
    -- tenant_id는 tenants 테이블을 참조해야 함
    IF EXISTS (
        SELECT 1 FROM information_schema.table_constraints 
        WHERE constraint_name = 'menus_tenant_id_fkey' 
        AND table_name = 'menus'
    ) THEN
        ALTER TABLE menus DROP CONSTRAINT menus_tenant_id_fkey;
        ALTER TABLE menus ADD CONSTRAINT menus_tenant_id_fkey 
        FOREIGN KEY (tenant_id) REFERENCES tenants(id) ON UPDATE CASCADE ON DELETE CASCADE;
    END IF;
END $$;

-- 7. 테이블 통계 업데이트
ANALYZE users;
ANALYZE menus;
ANALYZE user_permissions;
ANALYZE notifications;
ANALYZE tenants;
ANALYZE companies;
ANALYZE system_settings;
