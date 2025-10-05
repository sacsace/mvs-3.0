-- MVS 3.0 누락된 테이블 생성 스크립트
-- 기존 테이블: tenants, companies, users, menus, user_permissions

-- 1. 인사관리 관련 테이블
CREATE TABLE IF NOT EXISTS departments (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    manager_id INTEGER REFERENCES users(id),
    parent_id INTEGER REFERENCES departments(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS positions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(100) NOT NULL,
    description TEXT,
    level INTEGER DEFAULT 1,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS attendance_records (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    date DATE NOT NULL,
    check_in TIME,
    check_out TIME,
    break_start TIME,
    break_end TIME,
    total_hours DECIMAL(4,2),
    status VARCHAR(20) DEFAULT 'present',
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS leave_requests (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    leave_type VARCHAR(50) NOT NULL,
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    days_requested DECIMAL(4,2) NOT NULL,
    reason TEXT,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS payroll_records (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    pay_period_start DATE NOT NULL,
    pay_period_end DATE NOT NULL,
    basic_salary DECIMAL(12,2) NOT NULL,
    overtime_pay DECIMAL(12,2) DEFAULT 0,
    bonus DECIMAL(12,2) DEFAULT 0,
    deductions DECIMAL(12,2) DEFAULT 0,
    net_salary DECIMAL(12,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    paid_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 2. 업무관리 관련 테이블
CREATE TABLE IF NOT EXISTS projects (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    project_manager_id INTEGER REFERENCES users(id),
    start_date DATE,
    end_date DATE,
    budget DECIMAL(15,2),
    status VARCHAR(20) DEFAULT 'planning',
    priority VARCHAR(20) DEFAULT 'medium',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS tasks (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    project_id INTEGER REFERENCES projects(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    assigned_to INTEGER REFERENCES users(id),
    priority VARCHAR(20) DEFAULT 'medium',
    status VARCHAR(20) DEFAULT 'todo',
    due_date DATE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS work_reports (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    report_date DATE NOT NULL,
    work_content TEXT NOT NULL,
    hours_worked DECIMAL(4,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 3. 회계관리 관련 테이블
CREATE TABLE IF NOT EXISTS invoices (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    invoice_number VARCHAR(50) NOT NULL,
    customer_id INTEGER,
    customer_name VARCHAR(200),
    issue_date DATE NOT NULL,
    due_date DATE NOT NULL,
    subtotal DECIMAL(15,2) NOT NULL,
    tax_amount DECIMAL(15,2) DEFAULT 0,
    total_amount DECIMAL(15,2) NOT NULL,
    status VARCHAR(20) DEFAULT 'draft',
    payment_status VARCHAR(20) DEFAULT 'unpaid',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS invoice_items (
    id SERIAL PRIMARY KEY,
    invoice_id INTEGER NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    description VARCHAR(500) NOT NULL,
    quantity DECIMAL(10,2) NOT NULL,
    unit_price DECIMAL(12,2) NOT NULL,
    total_price DECIMAL(15,2) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS expenses (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    expense_number VARCHAR(50) NOT NULL,
    category VARCHAR(100) NOT NULL,
    amount DECIMAL(12,2) NOT NULL,
    description TEXT,
    expense_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'pending',
    approved_by INTEGER REFERENCES users(id),
    approved_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS budgets (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    category VARCHAR(100) NOT NULL,
    budget_amount DECIMAL(15,2) NOT NULL,
    spent_amount DECIMAL(15,2) DEFAULT 0,
    period_start DATE NOT NULL,
    period_end DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 4. 재고관리 관련 테이블
CREATE TABLE IF NOT EXISTS products (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    sku VARCHAR(100) UNIQUE,
    description TEXT,
    category VARCHAR(100),
    unit_price DECIMAL(12,2),
    cost_price DECIMAL(12,2),
    current_stock INTEGER DEFAULT 0,
    min_stock INTEGER DEFAULT 0,
    max_stock INTEGER,
    unit VARCHAR(50) DEFAULT '개',
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS inventory_transactions (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    product_id INTEGER NOT NULL REFERENCES products(id) ON DELETE CASCADE,
    transaction_type VARCHAR(20) NOT NULL, -- 'in', 'out', 'adjustment'
    quantity INTEGER NOT NULL,
    unit_price DECIMAL(12,2),
    total_value DECIMAL(15,2),
    reference_number VARCHAR(100),
    notes TEXT,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 5. 고객관리 관련 테이블
CREATE TABLE IF NOT EXISTS customers (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    business_number VARCHAR(20),
    ceo_name VARCHAR(100),
    address TEXT,
    phone VARCHAR(20),
    email VARCHAR(255),
    website VARCHAR(255),
    industry VARCHAR(100),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS sales_opportunities (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    value DECIMAL(15,2),
    probability INTEGER DEFAULT 50,
    stage VARCHAR(50) DEFAULT 'prospecting',
    expected_close_date DATE,
    assigned_to INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS contracts (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    customer_id INTEGER REFERENCES customers(id) ON DELETE CASCADE,
    contract_number VARCHAR(50) NOT NULL,
    title VARCHAR(200) NOT NULL,
    description TEXT,
    contract_value DECIMAL(15,2),
    start_date DATE NOT NULL,
    end_date DATE NOT NULL,
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 6. 커뮤니케이션 관련 테이블
CREATE TABLE IF NOT EXISTS chat_rooms (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    name VARCHAR(200) NOT NULL,
    description TEXT,
    room_type VARCHAR(20) DEFAULT 'group', -- 'private', 'group'
    created_by INTEGER REFERENCES users(id),
    status VARCHAR(20) DEFAULT 'active',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id SERIAL PRIMARY KEY,
    room_id INTEGER NOT NULL REFERENCES chat_rooms(id) ON DELETE CASCADE,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    message TEXT NOT NULL,
    message_type VARCHAR(20) DEFAULT 'text', -- 'text', 'image', 'file'
    file_url VARCHAR(500),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS notices (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    title VARCHAR(200) NOT NULL,
    content TEXT NOT NULL,
    priority VARCHAR(20) DEFAULT 'normal', -- 'low', 'normal', 'high', 'urgent'
    status VARCHAR(20) DEFAULT 'active',
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 7. 시스템관리 관련 테이블
CREATE TABLE IF NOT EXISTS system_logs (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    user_id INTEGER REFERENCES users(id),
    action VARCHAR(100) NOT NULL,
    resource VARCHAR(100),
    resource_id INTEGER,
    details JSONB,
    ip_address INET,
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS backups (
    id SERIAL PRIMARY KEY,
    tenant_id INTEGER NOT NULL REFERENCES tenants(id) ON DELETE CASCADE,
    company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
    backup_name VARCHAR(200) NOT NULL,
    backup_type VARCHAR(50) NOT NULL, -- 'full', 'incremental', 'differential'
    file_path VARCHAR(500),
    file_size BIGINT,
    status VARCHAR(20) DEFAULT 'pending', -- 'pending', 'running', 'completed', 'failed'
    started_at TIMESTAMP WITH TIME ZONE,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_by INTEGER REFERENCES users(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- 인덱스 생성
CREATE INDEX IF NOT EXISTS idx_departments_tenant_company ON departments(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_positions_tenant_company ON positions(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_attendance_records_user_date ON attendance_records(user_id, date);
CREATE INDEX IF NOT EXISTS idx_leave_requests_user ON leave_requests(user_id);
CREATE INDEX IF NOT EXISTS idx_payroll_records_user ON payroll_records(user_id);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_company ON projects(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_tasks_project ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_company ON invoices(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_expenses_tenant_company ON expenses(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_budgets_tenant_company ON budgets(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_products_tenant_company ON products(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_company ON customers(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_customer ON sales_opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_contracts_customer ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_chat_messages_room ON chat_messages(room_id);
CREATE INDEX IF NOT EXISTS idx_notices_tenant_company ON notices(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_system_logs_tenant_company ON system_logs(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_backups_tenant_company ON backups(tenant_id, company_id);
