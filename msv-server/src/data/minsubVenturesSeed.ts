import bcrypt from 'bcryptjs';
import { Op } from 'sequelize';
import sequelize from '../config/database';
import {
  Tenant,
  Company,
  User,
  Menu,
  Customer,
} from '../models';

const TENANT_ID = 1;

export const MINSUB_COMPANY = {
  name: 'Minsub Ventures Private Limited',
  business_number: 'MSV-IN-2025-001',
  ceo_name: 'Minsub Lee',
  address: 'Hyderabad, Telangana, India',
  phone: '+91-40-1234-5678',
  email: 'minsub.lee@gmail.com',
  website: 'https://www.msventures.in',
  industry: 'IT / Software Services',
  employee_count: 25,
  subscription_plan: 'enterprise',
  subscription_status: 'active',
  login_time_start: '09:00:00',
  login_time_end: '18:00:00',
  timezone: 'Asia/Kolkata',
  settings: {},
};

const PARENT_MENUS = [
  { name_ko: '대시보드', name_en: 'Dashboard', route: '/dashboard', icon: 'Dashboard', order: 1 },
  { name_ko: '기본정보', name_en: 'Basic Info', route: '/basic-info', icon: 'Info', order: 2 },
  { name_ko: '인사 관리', name_en: 'HR', route: '/hr', icon: 'People', order: 3 },
  { name_ko: '업무 관리', name_en: 'Work', route: '/work', icon: 'Work', order: 4 },
  { name_ko: '고객 관리', name_en: 'Customers', route: '/customers', icon: 'People', order: 5 },
  { name_ko: '재고 관리', name_en: 'Inventory', route: '/inventory', icon: 'Inventory', order: 6 },
  { name_ko: '회계 관리', name_en: 'Accounting', route: '/accounting', icon: 'AccountBalance', order: 7 },
  { name_ko: '커뮤니케이션', name_en: 'Communication', route: '/communication', icon: 'Forum', order: 8 },
  { name_ko: 'AI 분석', name_en: 'AI', route: '/ai', icon: 'Psychology', order: 9 },
  { name_ko: '보고서', name_en: 'Reports', route: '/reports', icon: 'Assessment', order: 10 },
  { name_ko: '호텔', name_en: 'Hotel', route: '/hotel', icon: 'Hotel', order: 11 },
];

const SUB_MENUS: Record<string, Array<{ name_ko: string; name_en: string; route: string; icon: string; order: number }>> = {
  '/basic-info': [
    { name_ko: '회사 정보 관리', name_en: 'Company Information', route: '/basic-info/company', icon: 'business', order: 1 },
    { name_ko: '파트너 업체 관리', name_en: 'Partners', route: '/basic-info/partners', icon: 'business', order: 2 },
    { name_ko: '조직도 관리', name_en: 'Organization', route: '/basic-info/organization', icon: 'account_tree', order: 3 },
    { name_ko: '메뉴권한관리', name_en: 'Menu Permissions', route: '/basic-info/menu-permissions', icon: 'lock', order: 4 },
    { name_ko: '로그인 정보 관리', name_en: 'Login Info', route: '/basic-info/login-info', icon: 'person', order: 5 },
    { name_ko: '시스템 설정', name_en: 'System Settings', route: '/basic-info/system-settings', icon: 'settings', order: 6 },
    { name_ko: '메일 발송 테스트', name_en: 'Mail Send Test', route: '/basic-info/mail-send-test', icon: 'email', order: 7 },
  ],
  '/hr': [
    { name_ko: '사용자 관리', name_en: 'Users', route: '/hr/users', icon: 'people', order: 1 },
    { name_ko: '전자근로계약', name_en: 'Employment Contracts', route: '/hr/employment-contracts', icon: 'description', order: 2 },
    { name_ko: '근태 관리', name_en: 'Attendance', route: '/hr/attendance', icon: 'schedule', order: 3 },
    { name_ko: '근태 통계', name_en: 'Attendance Statistics', route: '/hr/attendance/statistics', icon: 'assessment', order: 4 },
    { name_ko: '휴가 관리', name_en: 'Leave', route: '/hr/leave', icon: 'event', order: 5 },
    { name_ko: '급여 관리', name_en: 'Payroll', route: '/hr/payroll', icon: 'payments', order: 6 },
  ],
  '/work': [
    { name_ko: '업무 관리', name_en: 'Projects', route: '/work/projects', icon: 'view_kanban', order: 1 },
    { name_ko: '전자결재', name_en: 'Approval', route: '/work/approval', icon: 'approval', order: 2 },
    { name_ko: '업무 통계', name_en: 'Statistics', route: '/work/statistics', icon: 'bar_chart', order: 3 },
    { name_ko: '업무 보고서', name_en: 'Reports', route: '/work/reports', icon: 'assessment', order: 4 },
    { name_ko: '객실 예약 관리', name_en: 'Room Reservation', route: '/work/room-reservation', icon: 'hotel', order: 5 },
    { name_ko: '견적서 관리', name_en: 'Quotation', route: '/work/quotation', icon: 'description', order: 6 },
  ],
  '/customers': [
    { name_ko: '고객 정보', name_en: 'Customer Info', route: '/customers/info', icon: 'people', order: 1 },
    { name_ko: '계약 관리', name_en: 'Contracts', route: '/customers/contracts', icon: 'description', order: 2 },
    { name_ko: '고객 지원', name_en: 'Support', route: '/customers/support', icon: 'support_agent', order: 3 },
  ],
  '/inventory': [
    { name_ko: '기초재고 등록', name_en: 'Basic Inventory', route: '/inventory/basic', icon: 'inventory_2', order: 1 },
    { name_ko: '재고 현황 확인', name_en: 'Inventory Status', route: '/inventory/status', icon: 'inventory_2', order: 2 },
    { name_ko: '입고 관리', name_en: 'Stock In', route: '/inventory/stock-in', icon: 'move_to_inbox', order: 3 },
    { name_ko: '출고 관리', name_en: 'Stock Out', route: '/inventory/stock-out', icon: 'outbox', order: 4 },
    { name_ko: '재고 보고서', name_en: 'Inventory Report', route: '/inventory/report', icon: 'assessment', order: 5 },
  ],
  '/accounting': [
    { name_ko: '회계 기본정보', name_en: 'Accounting Basic Info', route: '/accounting/basic-info', icon: 'info', order: 1 },
    { name_ko: '견적서', name_en: 'Quotation', route: '/accounting/quotation', icon: 'request_quote', order: 2 },
    { name_ko: 'E-Invoice', name_en: 'E-Invoice', route: '/accounting/e-invoice', icon: 'receipt_long', order: 3 },
    { name_ko: '일반 인보이스', name_en: 'Invoice', route: '/accounting/invoice', icon: 'receipt', order: 4 },
    { name_ko: 'E-Way Bill', name_en: 'E-Way Bill', route: '/accounting/eway-bill', icon: 'local_shipping', order: 5 },
    { name_ko: '지출결의서', name_en: 'Expense', route: '/accounting/expense', icon: 'money_off', order: 6 },
    { name_ko: '예산 관리', name_en: 'Budget', route: '/accounting/budget', icon: 'account_balance', order: 7 },
    { name_ko: '자산 관리', name_en: 'Assets', route: '/accounting/assets', icon: 'account_balance', order: 8 },
    { name_ko: '회계 통계', name_en: 'Statistics', route: '/accounting/statistics', icon: 'assessment', order: 9 },
  ],
  '/communication': [
    { name_ko: '공지사항', name_en: 'Notices', route: '/communication/notices', icon: 'campaign', order: 1 },
    { name_ko: '이메일', name_en: 'Email', route: '/communication/email', icon: 'email', order: 2 },
    { name_ko: 'SMS', name_en: 'SMS', route: '/communication/sms', icon: 'sms', order: 3 },
  ],
  '/ai': [
    { name_ko: '비용 분석', name_en: 'Cost Analysis', route: '/ai/cost-analysis', icon: 'analytics', order: 1 },
    { name_ko: '효율 지표', name_en: 'Efficiency Metrics', route: '/ai/efficiency-metrics', icon: 'speed', order: 2 },
    { name_ko: '예측 데이터', name_en: 'Forecasting', route: '/ai/forecasting-data', icon: 'trending_up', order: 3 },
    { name_ko: '추천 엔진', name_en: 'Recommendations', route: '/ai/recommendation-engine', icon: 'psychology', order: 4 },
  ],
  '/reports': [
    { name_ko: '매출 보고서', name_en: 'Sales Report', route: '/reports/sales', icon: 'bar_chart', order: 1 },
    { name_ko: '재고 보고서', name_en: 'Inventory Report', route: '/reports/inventory', icon: 'pie_chart', order: 2 },
    { name_ko: '고객 보고서', name_en: 'Customer Report', route: '/reports/customers', icon: 'people', order: 3 },
    { name_ko: '재무 보고서', name_en: 'Financial Report', route: '/reports/financial', icon: 'account_balance', order: 4 },
    { name_ko: 'AI 보고서', name_en: 'AI Report', route: '/reports/ai', icon: 'psychology', order: 5 },
  ],
  '/hotel': [
    { name_ko: '프론트 데스크', name_en: 'Front Desk', route: '/hotel/front-desk', icon: 'desk', order: 1 },
    { name_ko: '하우스키핑', name_en: 'Housekeeping', route: '/hotel/housekeeping', icon: 'cleaning_services', order: 2 },
    { name_ko: 'F&B', name_en: 'F&B', route: '/hotel/fnb', icon: 'restaurant', order: 3 },
    { name_ko: '예약 관리', name_en: 'Reservations', route: '/hotel/reservations', icon: 'event', order: 4 },
    { name_ko: '객실 타입', name_en: 'Room Types', route: '/hotel/room-types', icon: 'meeting_room', order: 5 },
    { name_ko: '객실 예약', name_en: 'Room Reservation', route: '/hotel/room-reservation', icon: 'hotel', order: 6 },
  ],
};

async function ensureTenant() {
  const [tenant] = await (Tenant as any).findOrCreate({
    where: { subdomain: 'mvs3' },
    defaults: {
      name: 'MVS Solutions',
      domain: 'mvsystem.in',
      subdomain: 'mvs3',
      plan: 'enterprise',
      max_users: 200,
      max_companies: 20,
      features: ['inventory', 'hr', 'accounting', 'ai_analysis', 'hotel'],
      status: 'active',
    },
  });
  return tenant;
}

async function ensureMinsubCompany(tenantId: number) {
  let company = await (Company as any).findOne({
    where: {
      tenant_id: tenantId,
      [Op.or]: [
        { name: { [Op.iLike]: '%Minsub Ventures%' } },
        { business_number: MINSUB_COMPANY.business_number },
      ],
    },
  });

  if (!company) {
    const existingFirst = await (Company as any).findOne({
      where: { tenant_id: tenantId, id: 1 },
    });
    if (existingFirst) {
      await existingFirst.update(MINSUB_COMPANY);
      company = existingFirst;
      console.log('  ✅ 회사 id=1 → Minsub Ventures 로 갱신');
    } else {
      company = await (Company as any).create({
        tenant_id: tenantId,
        ...MINSUB_COMPANY,
      });
      console.log('  ✅ Minsub Ventures 회사 생성');
    }
  } else {
    await company.update(MINSUB_COMPANY);
    console.log(`  ✅ Minsub Ventures 회사 갱신 (id=${company.id})`);
  }

  return company;
}

async function ensureMenus(tenantId: number) {
  const parentIds = new Map<string, number>();

  for (const menu of PARENT_MENUS) {
    const [row, created] = await (Menu as any).findOrCreate({
      where: { tenant_id: tenantId, route: menu.route },
      defaults: {
        tenant_id: tenantId,
        parent_id: null,
        level: 0,
        is_active: true,
        description: menu.name_ko,
        ...menu,
      },
    });
    if (!created) {
      await row.update({
        name_ko: menu.name_ko,
        name_en: menu.name_en,
        icon: menu.icon,
        order: menu.order,
        level: 0,
        is_active: true,
        parent_id: null,
      });
    }
    parentIds.set(menu.route, row.id);
  }

  let submenuCount = 0;
  for (const [parentRoute, children] of Object.entries(SUB_MENUS)) {
    const parentId = parentIds.get(parentRoute);
    if (!parentId) continue;

    for (const submenu of children) {
      const [row, created] = await (Menu as any).findOrCreate({
        where: { tenant_id: tenantId, route: submenu.route },
        defaults: {
          tenant_id: tenantId,
          parent_id: parentId,
          level: 1,
          is_active: true,
          description: submenu.name_ko,
          ...submenu,
        },
      });
      if (!created && row.parent_id !== parentId) {
        await row.update({ parent_id: parentId, level: 1, is_active: true, ...submenu });
      }
      submenuCount++;
    }
  }

  console.log(`  ✅ 메뉴 ${PARENT_MENUS.length}개 + 하위 ${submenuCount}개`);
}

async function ensureUsers(tenantId: number, companyId: number) {
  const passwordHash = await bcrypt.hash('admin123', 10);
  const users = [
    { userid: 'root', username: 'Root User', email: 'root@mvs3.com', role: 'root' as const },
    { userid: 'admin', username: 'Admin User', email: 'admin@mvs3.com', role: 'admin' as const },
    { userid: 'user1', username: 'User One', email: 'user1@mvs3.com', role: 'user' as const },
    { userid: 'developer', username: '김개발', email: 'developer@mvs3.com', role: 'admin' as const },
  ];

  const createdUsers: any[] = [];
  for (const u of users) {
    const [user, created] = await (User as any).findOrCreate({
      where: { tenant_id: tenantId, userid: u.userid },
      defaults: {
        ...u,
        tenant_id: tenantId,
        company_id: companyId,
        password_hash: passwordHash,
        status: 'active',
        department: 'Management',
        position: 'Manager',
      },
    });
    await user.update({ company_id: companyId, password_hash: passwordHash, status: 'active' });
    createdUsers.push(user);
    console.log(`  ✅ 사용자 ${u.userid} (company_id=${companyId})`);
  }
  return createdUsers;
}

/** 구 샘플 데이터 잔존 메뉴 비활성화 (신규 트리와 중복) */
const LEGACY_MENU_ROUTES = ['/system', '/payroll'];

async function cleanupLegacyMenus(tenantId: number) {
  const [result] = await sequelize.query(
    `UPDATE menus SET is_active = false, updated_at = NOW()
     WHERE tenant_id = $1::int AND parent_id IS NULL AND route = ANY($2::varchar[])`,
    { bind: [tenantId, LEGACY_MENU_ROUTES] }
  );
  const rowCount = (result as { rowCount?: number })?.rowCount ?? 0;
  if (rowCount > 0) {
    console.log(`  ✅ 레거시 메뉴 ${rowCount}개 비활성화 (${LEGACY_MENU_ROUTES.join(', ')})`);
  }
}

/** root/admin — 활성 메뉴 전체에 CRUD 권한 동기화 (기본 템플릿) */
async function syncFullMenuPermissions(tenantId: number, userIds: number[]) {
  for (const userId of userIds) {
    await sequelize.query(
      `DELETE FROM user_permissions
       WHERE user_id = $1::int
         AND menu_id NOT IN (SELECT id FROM menus WHERE tenant_id = $2::int AND is_active = true)`,
      { bind: [userId, tenantId] }
    );

    const [menus] = await sequelize.query(
      `SELECT id FROM menus WHERE tenant_id = $1::int AND is_active = true ORDER BY id`,
      { bind: [tenantId] }
    );
    const menuIds = (menus as { id: number }[]).map((m) => m.id);

    for (const menuId of menuIds) {
      const [existing] = await sequelize.query(
        `SELECT id FROM user_permissions WHERE user_id = $1::int AND menu_id = $2::int LIMIT 1`,
        { bind: [userId, menuId] }
      );
      if ((existing as unknown[]).length > 0) {
        await sequelize.query(
          `UPDATE user_permissions SET can_view=true, can_create=true, can_edit=true, can_delete=true, updated_at=NOW()
           WHERE user_id = $1::int AND menu_id = $2::int`,
          { bind: [userId, menuId] }
        );
      } else {
        await sequelize.query(
          `INSERT INTO user_permissions (user_id, menu_id, can_view, can_create, can_edit, can_delete, created_at, updated_at)
           VALUES ($1::int, $2::int, true, true, true, true, NOW(), NOW())`,
          { bind: [userId, menuId] }
        );
      }
    }

    console.log(`  ✅ user_id=${userId} 메뉴 권한 ${menuIds.length}건 동기화 (전체 CRUD)`);
  }
}

async function ensurePermissions(tenantId: number, users: any[]) {
  await cleanupLegacyMenus(tenantId);

  const privileged = users.filter((u) => ['root', 'admin'].includes(u.role));
  const userIds = privileged.map((u) => Number(u.id)).filter((id) => Number.isFinite(id));

  if (userIds.length === 0) {
    console.warn('  ⚠️  root/admin 사용자 없음 — 메뉴 권한 건너뜀');
    return;
  }

  await syncFullMenuPermissions(tenantId, userIds);
}

async function ensureBusinessData(tenantId: number, companyId: number, createdBy: number) {
  try {
  const customers = [
    { name: 'TechNova India Pvt Ltd', business_number: 'CUST-001', email: 'contact@technova.in', phone: '+91-98765-43210' },
    { name: 'Global Trade Partners', business_number: 'CUST-002', email: 'sales@gtp.com', phone: '+91-91234-56789' },
    { name: 'Hyderabad Software Hub', business_number: 'CUST-003', email: 'info@hsh.in', phone: '+91-99887-76655' },
  ];

  const customerRows: any[] = [];
  for (const c of customers) {
    const [row] = await (Customer as any).findOrCreate({
      where: { tenant_id: tenantId, company_id: companyId, business_number: c.business_number },
      defaults: {
        tenant_id: tenantId,
        company_id: companyId,
        status: 'active',
        industry: 'Technology',
        ...c,
      },
    });
    customerRows.push(row);
  }

  const products = [
    { product_code: 'MSV-001', name: 'MVS Enterprise License', category: 'Software', unit_price: 50000, cost_price: 20000, stock_quantity: 50, min_stock_level: 10, unit: 'EA' },
    { product_code: 'MSV-002', name: 'Cloud Hosting Package', category: 'Service', unit_price: 12000, cost_price: 5000, stock_quantity: 5, min_stock_level: 10, unit: 'EA' },
    { product_code: 'MSV-003', name: 'Support Maintenance Kit', category: 'Service', unit_price: 8000, cost_price: 3000, stock_quantity: 25, min_stock_level: 5, unit: 'EA' },
    { product_code: 'MSV-004', name: 'Hardware Integration Module', category: 'Hardware', unit_price: 35000, cost_price: 22000, stock_quantity: 3, min_stock_level: 5, unit: 'EA' },
  ];

  for (const p of products) {
    await sequelize.query(
      `INSERT INTO products (
        tenant_id, company_id, product_code, name, description, category,
        unit_price, cost_price, stock_quantity, min_stock_level, max_stock_level,
        unit, tax_rate, status, created_by, created_at, updated_at
      )
      SELECT $1::int, $2::int, $3::varchar, $4::varchar, $5::text, $6::varchar,
             $7::numeric, $8::numeric, $9::numeric, $10::numeric, $11::numeric,
             $12::varchar, $13::numeric, $14::varchar, $15::int, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM products WHERE product_code = $3::varchar)`,
      {
        bind: [
          tenantId,
          companyId,
          p.product_code,
          p.name,
          p.name,
          p.category,
          p.unit_price,
          p.cost_price,
          p.stock_quantity,
          p.min_stock_level,
          200,
          p.unit,
          18,
          'active',
          createdBy,
        ],
      }
    );
  }

  const now = new Date();
  const invoiceDate = now.toISOString().slice(0, 10);
  const dueDate = new Date(now.getTime() + 30 * 86400000).toISOString().slice(0, 10);

  for (let i = 0; i < customerRows.length; i++) {
    const invNo = `MSV-INV-2025-${String(i + 1).padStart(4, '0')}`;
    const subtotal = 100000 + i * 25000;
    const taxAmount = 18000 + i * 4500;
    const totalAmount = 118000 + i * 29500;
    await sequelize.query(
      `INSERT INTO invoices (
        tenant_id, company_id, customer_id, invoice_number, invoice_date, due_date,
        subtotal, tax_amount, total_amount, status, payment_status, created_by, created_at, updated_at
      )
      SELECT $1::int, $2::int, $3::int, $4::varchar, $5::date, $6::date,
             $7::numeric, $8::numeric, $9::numeric, 'paid', 'paid', $10::int, NOW(), NOW()
      WHERE NOT EXISTS (SELECT 1 FROM invoices WHERE invoice_number = $4::varchar)`,
      {
        bind: [
          tenantId,
          companyId,
          customerRows[i].id,
          invNo,
          invoiceDate,
          dueDate,
          subtotal,
          taxAmount,
          totalAmount,
          createdBy,
        ],
      }
    );
  }

  console.log(`  ✅ 고객 ${customers.length} · 제품 ${products.length} · 인보이스 ${customers.length}`);
  } catch (error: any) {
    console.warn('  ⚠️  샘플 거래 데이터 일부 실패 (회사·메뉴는 적용됨):', error?.message);
  }
}

async function ensureNotices(companyId: number, authorId: number) {
  const [exists] = await sequelize.query(`
    SELECT EXISTS (
      SELECT FROM information_schema.tables
      WHERE table_schema = 'public' AND table_name = 'notices'
    ) AS exists;
  `);
  if (!(exists as any[])[0]?.exists) {
    console.log('  ⏭️  notices 테이블 없음 — 공지 건너뜀');
    return;
  }

  const notices = [
    { title: 'Minsub Ventures 시스템 오픈', content: 'MVS 3.0 프로덕션 환경이 준비되었습니다.', category: 'general', priority: 'high' },
    { title: '월간 재고 점검 안내', content: '매월 마지막 주 금요일 재고 실사를 진행합니다.', category: 'policy', priority: 'medium' },
  ];

  for (const n of notices) {
    try {
      await sequelize.query(
        `INSERT INTO notices (tenant_id, company_id, title, content, category, priority, status, author_id, is_public, is_active, created_at, updated_at)
         SELECT $1::int, $2::int, $3::varchar, $4::text, $5::"enum_notices_category", $6::"enum_notices_priority", 'published'::"enum_notices_status", $7::int, true, true, NOW(), NOW()
         WHERE NOT EXISTS (SELECT 1 FROM notices WHERE company_id = $2::int AND title = $3::varchar)`,
        { bind: [TENANT_ID, companyId, n.title, n.content, n.category, n.priority, authorId] }
      );
    } catch (noticeError: any) {
      console.warn(`  ⚠️  공지 "${n.title}" 건너뜀:`, noticeError?.message);
    }
  }
  console.log(`  ✅ 공지 ${notices.length}건 시도`);
}

export async function seedMinsubVenturesData() {
  console.log('\n🏢 Minsub Ventures 초기 데이터 시드...');

  const tenant = await ensureTenant();
  const company = await ensureMinsubCompany(tenant.id);
  await ensureMenus(tenant.id);
  const users = await ensureUsers(tenant.id, company.id);
  await ensurePermissions(tenant.id, users);

  const rootUser = users.find((u) => u.userid === 'root') || users[0];
  await ensureBusinessData(tenant.id, company.id, rootUser.id);
  await ensureNotices(company.id, rootUser.id);

  console.log('✅ Minsub Ventures 초기 데이터 시드 완료\n');
  return { tenantId: tenant.id, companyId: company.id };
}
