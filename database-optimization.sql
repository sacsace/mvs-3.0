-- MVS 3.0 데이터베이스 최적화 스크립트
-- 인덱스 생성 및 성능 최적화

-- 1. 기본 인덱스 (Primary Keys는 자동으로 생성됨)

-- 2. 외래키 인덱스
CREATE INDEX IF NOT EXISTS idx_users_tenant_id ON users(tenant_id);
CREATE INDEX IF NOT EXISTS idx_users_company_id ON users(company_id);
CREATE INDEX IF NOT EXISTS idx_menus_tenant_id ON menus(tenant_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_user_id ON user_permissions(user_id);
CREATE INDEX IF NOT EXISTS idx_user_permissions_menu_id ON user_permissions(menu_id);
CREATE INDEX IF NOT EXISTS idx_companies_tenant_id ON companies(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_id ON customers(tenant_id);
CREATE INDEX IF NOT EXISTS idx_customers_company_id ON customers(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_tenant_id ON sales_opportunities(tenant_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_company_id ON sales_opportunities(company_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_customer_id ON sales_opportunities(customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_assigned_to ON sales_opportunities(assigned_to);
CREATE INDEX IF NOT EXISTS idx_contracts_customer_id ON contracts(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_id ON support_tickets(tenant_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_company_id ON support_tickets(company_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_customer_id ON support_tickets(customer_id);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_to ON support_tickets(assigned_to);
CREATE INDEX IF NOT EXISTS idx_support_responses_ticket_id ON support_responses(ticket_id);
CREATE INDEX IF NOT EXISTS idx_support_responses_user_id ON support_responses(user_id);

-- 3. 새로운 모델 인덱스
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_id ON invoices(tenant_id);
CREATE INDEX IF NOT EXISTS idx_invoices_company_id ON invoices(company_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_id ON invoices(customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON invoices(created_by);
CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status);
CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

CREATE INDEX IF NOT EXISTS idx_products_tenant_id ON products(tenant_id);
CREATE INDEX IF NOT EXISTS idx_products_company_id ON products(company_id);
CREATE INDEX IF NOT EXISTS idx_products_created_by ON products(created_by);
CREATE INDEX IF NOT EXISTS idx_products_category ON products(category);
CREATE INDEX IF NOT EXISTS idx_products_status ON products(status);
CREATE INDEX IF NOT EXISTS idx_products_product_code ON products(product_code);

CREATE INDEX IF NOT EXISTS idx_projects_tenant_id ON projects(tenant_id);
CREATE INDEX IF NOT EXISTS idx_projects_company_id ON projects(company_id);
CREATE INDEX IF NOT EXISTS idx_projects_customer_id ON projects(customer_id);
CREATE INDEX IF NOT EXISTS idx_projects_project_manager ON projects(project_manager);
CREATE INDEX IF NOT EXISTS idx_projects_created_by ON projects(created_by);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_priority ON projects(priority);
CREATE INDEX IF NOT EXISTS idx_projects_start_date ON projects(start_date);

CREATE INDEX IF NOT EXISTS idx_payrolls_tenant_id ON payrolls(tenant_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_company_id ON payrolls(company_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_id ON payrolls(employee_id);
CREATE INDEX IF NOT EXISTS idx_payrolls_created_by ON payrolls(created_by);
CREATE INDEX IF NOT EXISTS idx_payrolls_payroll_period ON payrolls(payroll_period);
CREATE INDEX IF NOT EXISTS idx_payrolls_status ON payrolls(status);

CREATE INDEX IF NOT EXISTS idx_inventory_transactions_tenant_id ON inventory_transactions(tenant_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_company_id ON inventory_transactions(company_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_product_id ON inventory_transactions(product_id);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_created_by ON inventory_transactions(created_by);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_transaction_type ON inventory_transactions(transaction_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference_type ON inventory_transactions(reference_type);
CREATE INDEX IF NOT EXISTS idx_inventory_transactions_reference_id ON inventory_transactions(reference_id);

-- 4. 복합 인덱스 (자주 함께 조회되는 컬럼들)
CREATE INDEX IF NOT EXISTS idx_users_tenant_company ON users(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_customers_tenant_company ON customers(tenant_id, company_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_tenant_customer ON sales_opportunities(tenant_id, customer_id);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_assigned_status ON sales_opportunities(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_tenant_status ON support_tickets(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_support_tickets_assigned_status ON support_tickets(assigned_to, status);
CREATE INDEX IF NOT EXISTS idx_invoices_tenant_status ON invoices(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_invoices_customer_status ON invoices(customer_id, status);
CREATE INDEX IF NOT EXISTS idx_products_tenant_category ON products(tenant_id, category);
CREATE INDEX IF NOT EXISTS idx_projects_tenant_status ON projects(tenant_id, status);
CREATE INDEX IF NOT EXISTS idx_projects_manager_status ON projects(project_manager, status);
CREATE INDEX IF NOT EXISTS idx_payrolls_tenant_period ON payrolls(tenant_id, payroll_period);
CREATE INDEX IF NOT EXISTS idx_payrolls_employee_period ON payrolls(employee_id, payroll_period);

-- 5. 텍스트 검색을 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_customers_name ON customers USING gin(to_tsvector('korean', name));
CREATE INDEX IF NOT EXISTS idx_products_name ON products USING gin(to_tsvector('korean', name));
CREATE INDEX IF NOT EXISTS idx_projects_name ON projects USING gin(to_tsvector('korean', name));

-- 6. 날짜 범위 쿼리를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_invoices_date_range ON invoices(invoice_date, due_date);
CREATE INDEX IF NOT EXISTS idx_projects_date_range ON projects(start_date, end_date);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_close_date ON sales_opportunities(expected_close_date);

-- 7. 통계 쿼리를 위한 인덱스
CREATE INDEX IF NOT EXISTS idx_invoices_amount ON invoices(total_amount);
CREATE INDEX IF NOT EXISTS idx_sales_opportunities_value ON sales_opportunities(value);
CREATE INDEX IF NOT EXISTS idx_payrolls_salary ON payrolls(net_salary);

-- 8. 파티셔닝을 위한 인덱스 (대용량 데이터 처리)
-- 로그 테이블의 경우 날짜별 파티셔닝 고려
CREATE INDEX IF NOT EXISTS idx_system_logs_created_at ON system_logs(created_at);

-- 9. 성능 모니터링을 위한 뷰 생성
CREATE OR REPLACE VIEW v_dashboard_stats AS
SELECT 
    t.id as tenant_id,
    t.name as tenant_name,
    COUNT(DISTINCT u.id) as total_users,
    COUNT(DISTINCT c.id) as total_customers,
    COUNT(DISTINCT so.id) as total_opportunities,
    COUNT(DISTINCT inv.id) as total_invoices,
    COALESCE(SUM(inv.total_amount), 0) as total_revenue,
    COUNT(DISTINCT p.id) as total_projects
FROM tenants t
LEFT JOIN users u ON t.id = u.tenant_id
LEFT JOIN customers c ON t.id = c.tenant_id
LEFT JOIN sales_opportunities so ON t.id = so.tenant_id
LEFT JOIN invoices inv ON t.id = inv.tenant_id
LEFT JOIN projects p ON t.id = p.tenant_id
GROUP BY t.id, t.name;

-- 10. 데이터 무결성을 위한 체크 제약조건
ALTER TABLE invoices ADD CONSTRAINT chk_invoice_amounts CHECK (total_amount >= 0 AND subtotal >= 0 AND tax_amount >= 0);
ALTER TABLE products ADD CONSTRAINT chk_product_prices CHECK (unit_price >= 0 AND cost_price >= 0);
ALTER TABLE payrolls ADD CONSTRAINT chk_payroll_amounts CHECK (net_salary >= 0 AND gross_salary >= 0);
ALTER TABLE inventory_transactions ADD CONSTRAINT chk_inventory_quantity CHECK (quantity != 0);

-- 11. 성능 최적화를 위한 통계 정보 업데이트
ANALYZE;

-- 12. 연결 풀 최적화를 위한 설정 (PostgreSQL 설정 파일에서)
-- max_connections = 200
-- shared_buffers = 256MB
-- effective_cache_size = 1GB
-- work_mem = 4MB
-- maintenance_work_mem = 64MB

COMMENT ON DATABASE mvs_db IS 'MVS 3.0 Enterprise Management System Database - Optimized for Performance';