-- MVS 3.0 테이블 생성 스크립트
-- PostgreSQL 15+ 호환

-- 확장 기능 활성화
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm";
CREATE EXTENSION IF NOT EXISTS "btree_gin";

-- 1. 테넌트 테이블
CREATE TABLE IF NOT EXISTS tenant (
    id SERIAL PRIMARY KEY,
    tenant_code VARCHAR(20) UNIQUE NOT NULL,
    name VARCHAR(255) NOT NULL,
    domain VARCHAR(100) UNIQUE,
    plan VARCHAR(50) DEFAULT 'basic',
    status VARCHAR(20) DEFAULT 'active',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 회사 테이블
CREATE TABLE IF NOT EXISTS company (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    business_number VARCHAR(50) UNIQUE NOT NULL,
    ceo_name VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(100),
    website VARCHAR(100),
    industry VARCHAR(100),
    employee_count INTEGER DEFAULT 0,
    subscription_plan VARCHAR(50) DEFAULT 'basic',
    subscription_status VARCHAR(20) DEFAULT 'active',
    company_logo VARCHAR(255),
    company_seal VARCHAR(255),
    ceo_signature VARCHAR(255),
    account_holder_name VARCHAR(255),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(11),
    login_period_start DATE,
    login_period_end DATE,
    login_time_start TIME DEFAULT '09:00:00',
    login_time_end TIME DEFAULT '18:00:00',
    timezone VARCHAR(50) DEFAULT 'Asia/Seoul',
    settings JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE
);

-- 3. 사용자 테이블
CREATE TABLE IF NOT EXISTS "user" (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    userid VARCHAR(50) NOT NULL,
    username VARCHAR(100) NOT NULL,
    email VARCHAR(100) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role VARCHAR(20) NOT NULL DEFAULT 'user',
    department VARCHAR(100),
    position VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    last_login TIMESTAMP WITH TIME ZONE,
    mfa_enabled BOOLEAN DEFAULT false,
    mfa_secret VARCHAR(32),
    preferences JSONB DEFAULT '{}',
    first_name VARCHAR(100),
    last_name VARCHAR(100),
    middle_name VARCHAR(100),
    date_of_birth DATE,
    gender VARCHAR(10),
    nationality VARCHAR(50),
    marital_status VARCHAR(20),
    blood_type VARCHAR(5),
    emergency_contact_name VARCHAR(100),
    emergency_contact_phone VARCHAR(20),
    emergency_contact_relationship VARCHAR(50),
    personal_email VARCHAR(100),
    personal_phone VARCHAR(20),
    personal_address TEXT,
    profile_picture VARCHAR(255),
    bio TEXT,
    skills TEXT[],
    languages TEXT[],
    social_media JSONB DEFAULT '{}',
    account_holder_name VARCHAR(255),
    bank_name VARCHAR(100),
    account_number VARCHAR(50),
    ifsc_code VARCHAR(11),
    is_root BOOLEAN DEFAULT false,
    is_audit BOOLEAN DEFAULT false,
    is_admin BOOLEAN DEFAULT false,
    is_user BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
    UNIQUE(tenant_id, userid),
    UNIQUE(tenant_id, email)
);

-- 4. 메뉴 테이블
CREATE TABLE IF NOT EXISTS menu (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    parent_id INTEGER,
    code VARCHAR(100) NOT NULL,
    name_ko VARCHAR(100) NOT NULL,
    name_en VARCHAR(100) NOT NULL,
    icon VARCHAR(50),
    route VARCHAR(200),
    component VARCHAR(100),
    order_num INTEGER NOT NULL,
    level INTEGER DEFAULT 1,
    is_active BOOLEAN DEFAULT true,
    is_visible BOOLEAN DEFAULT true,
    permissions JSONB DEFAULT '[]',
    metadata JSONB DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    FOREIGN KEY (parent_id) REFERENCES menu(id),
    UNIQUE(tenant_id, code)
);

-- 5. 사용자 메뉴 권한 테이블
CREATE TABLE IF NOT EXISTS user_menu_permission (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    menu_id INTEGER NOT NULL,
    can_read BOOLEAN DEFAULT false,
    can_create BOOLEAN DEFAULT false,
    can_update BOOLEAN DEFAULT false,
    can_delete BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE,
    FOREIGN KEY (menu_id) REFERENCES menu(id) ON DELETE CASCADE,
    UNIQUE(user_id, menu_id)
);

-- 6. 알림 테이블
CREATE TABLE IF NOT EXISTS notification (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    type VARCHAR(50) NOT NULL,
    title VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    data JSONB,
    is_read BOOLEAN DEFAULT false,
    read_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

-- 7. 채팅방 테이블
CREATE TABLE IF NOT EXISTS chat_room (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    room_type VARCHAR(20) DEFAULT 'group',
    created_by INTEGER NOT NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
    FOREIGN KEY (created_by) REFERENCES "user"(id) ON DELETE CASCADE
);

-- 8. 채팅 메시지 테이블
CREATE TABLE IF NOT EXISTS chat_message (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    room_id INTEGER NOT NULL,
    user_id INTEGER NOT NULL,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text',
    metadata JSONB,
    is_edited BOOLEAN DEFAULT false,
    edited_at TIMESTAMP WITH TIME ZONE,
    is_deleted BOOLEAN DEFAULT false,
    deleted_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
    FOREIGN KEY (room_id) REFERENCES chat_room(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE CASCADE
);

-- 9. 시스템 로그 테이블
CREATE TABLE IF NOT EXISTS system_log (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL,
    company_id INTEGER NOT NULL,
    user_id INTEGER,
    log_level VARCHAR(20) NOT NULL,
    category VARCHAR(50) NOT NULL,
    message TEXT NOT NULL,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    FOREIGN KEY (tenant_id) REFERENCES tenant(id) ON DELETE CASCADE,
    FOREIGN KEY (company_id) REFERENCES company(id) ON DELETE CASCADE,
    FOREIGN KEY (user_id) REFERENCES "user"(id) ON DELETE SET NULL
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_tenant_company_user ON "user" (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_tenant_company_menu ON menu (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_tenant_company_notification ON notification (tenant_id, company_id, user_id);
CREATE INDEX IF NOT EXISTS idx_tenant_company_chat_room ON chat_room (tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_tenant_company_chat_message ON chat_message (tenant_id, company_id, room_id);

-- 통계 정보 업데이트
ANALYZE;
