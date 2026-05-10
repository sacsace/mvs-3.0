import { Request, Response } from 'express';
import jwt, { SignOptions } from 'jsonwebtoken';
import bcrypt from 'bcrypt';
import crypto from 'crypto';
import axios from 'axios';
import { DataTypes, Op } from 'sequelize';
import { User, Company, LoginLog, Tenant, Menu, UserPermission, CompanyGstNumber, Customer, Invoice, InvoiceItem } from '../models';
import { AuthRequest } from '../types';
import sequelize from '../config/database';

const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return await bcrypt.compare(password, hash);
};

interface LoginRequest extends Request {
  body: {
    userid: string;
    password: string;
  };
}

const getClientIp = (req: Request): string | null => {
  const forwarded = req.headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) {
    return forwarded.split(',')[0].trim();
  }
  if (Array.isArray(forwarded) && forwarded.length > 0) {
    return String(forwarded[0]).trim();
  }
  return req.ip || req.socket?.remoteAddress || null;
};

const DEFAULT_SESSION_TIMEOUT_MINUTES = 30;
const MIN_SESSION_TIMEOUT_MINUTES = 5;
const MAX_SESSION_TIMEOUT_MINUTES = 24 * 60;

const normalizeSessionTimeoutMinutes = (value: unknown): number => {
  const num = Number(value);
  if (!Number.isFinite(num)) return DEFAULT_SESSION_TIMEOUT_MINUTES;
  const rounded = Math.floor(num);
  if (rounded < MIN_SESSION_TIMEOUT_MINUTES) return MIN_SESSION_TIMEOUT_MINUTES;
  if (rounded > MAX_SESSION_TIMEOUT_MINUTES) return MAX_SESSION_TIMEOUT_MINUTES;
  return rounded;
};

let loginLogSchemaEnsured = false;
const ensureLoginLogSchema = async () => {
  if (loginLogSchemaEnsured) return;
  const queryInterface = sequelize.getQueryInterface();
  let table: any = null;
  try {
    table = await queryInterface.describeTable('login_logs');
  } catch (error: any) {
    const message = String(error?.message || '').toLowerCase();
    if (
      message.includes('login_logs') &&
      (message.includes('does not exist') || message.includes('relation') || message.includes('없습니다'))
    ) {
      await queryInterface.createTable('login_logs', {
        id: { type: DataTypes.INTEGER, autoIncrement: true, primaryKey: true, allowNull: false },
        tenant_id: { type: DataTypes.INTEGER, allowNull: true },
        company_id: { type: DataTypes.INTEGER, allowNull: true },
        user_id: { type: DataTypes.INTEGER, allowNull: true },
        userid: { type: DataTypes.STRING(100), allowNull: true },
        status: { type: DataTypes.ENUM('success', 'failure'), allowNull: false },
        reason: { type: DataTypes.STRING(255), allowNull: true },
        ip_address: { type: DataTypes.STRING(64), allowNull: true },
        user_agent: { type: DataTypes.STRING(500), allowNull: true },
        logged_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        created_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW },
        updated_at: { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW }
      });
      loginLogSchemaEnsured = true;
      return;
    }
    throw error;
  }

  const ensureColumn = async (columnName: string, definition: any) => {
    if (!(table as any)[columnName]) {
      await queryInterface.addColumn('login_logs', columnName, definition);
    }
  };

  await ensureColumn('tenant_id', { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn('company_id', { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn('user_id', { type: DataTypes.INTEGER, allowNull: true });
  await ensureColumn('userid', { type: DataTypes.STRING(100), allowNull: true });
  await ensureColumn('status', {
    type: DataTypes.ENUM('success', 'failure'),
    allowNull: false,
    defaultValue: 'success'
  });
  await ensureColumn('reason', { type: DataTypes.STRING(255), allowNull: true });
  await ensureColumn('ip_address', { type: DataTypes.STRING(64), allowNull: true });
  await ensureColumn('user_agent', { type: DataTypes.STRING(500), allowNull: true });
  await ensureColumn('logged_at', { type: DataTypes.DATE, allowNull: false, defaultValue: DataTypes.NOW });

  loginLogSchemaEnsured = true;
};

const writeLoginLog = async ({
  tenant_id,
  company_id,
  user_id,
  userid,
  status,
  reason,
  ip_address,
  user_agent
}: {
  tenant_id?: number | null;
  company_id?: number | null;
  user_id?: number | null;
  userid?: string | null;
  status: 'success' | 'failure';
  reason?: string | null;
  ip_address?: string | null;
  user_agent?: string | null;
}) => {
  try {
    await ensureLoginLogSchema();
    await (LoginLog as any).create({
      tenant_id: tenant_id ?? null,
      company_id: company_id ?? null,
      user_id: user_id ?? null,
      userid: userid ?? null,
      status,
      reason: reason ?? null,
      ip_address: ip_address ?? null,
      user_agent: user_agent ?? null,
      logged_at: new Date()
    });
  } catch (error) {
    // 로그인 자체는 실패하지 않도록 로그 기록 오류는 무시
    console.error('로그인 로그 기록 오류:', error);
  }
};

type BillingPlanKey = 'free_week_7' | 'month_5000' | 'year_50000';

const BILLING_PLAN_CONFIG: Record<BillingPlanKey, { days: number; amount: number; code: string }> = {
  free_week_7: { days: 7, amount: 0, code: 'free_week_7' },
  month_5000: { days: 30, amount: 5000, code: 'month_5000' },
  year_50000: { days: 365, amount: 50000, code: 'year_50000' }
};

/** 구 요금제 키(1일) → 7일 무료로 통일 */
const normalizeBillingPlanKey = (raw: string): BillingPlanKey | null => {
  const p = String(raw || '').trim();
  if (p === 'free_day_1') return 'free_week_7';
  if (p === 'free_week_7' || p === 'month_5000' || p === 'year_50000') return p;
  return null;
};

const FREE_TRIAL_PLAN_CODES = new Set(['free_day_1', 'free_week_7']);
const GST_RATE = 18; // 18%
const RAZORPAY_API_BASE = 'https://api.razorpay.com/v1';

const slugify = (value: string): string =>
  value
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9가-힣]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 40) || 'company';

const toDateOnly = (value?: string): Date | null => {
  if (!value) return null;
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return null;
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate()));
};

const addDays = (base: Date, days: number): Date => {
  const next = new Date(base);
  next.setDate(next.getDate() + days);
  return next;
};

const getDateOnlyString = (date: Date): string => {
  const yyyy = date.getUTCFullYear();
  const mm = String(date.getUTCMonth() + 1).padStart(2, '0');
  const dd = String(date.getUTCDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
};

const generateSubscriptionInvoiceNumber = (billingCompanyName: string) => {
  const now = new Date();
  const yyyy = now.getFullYear();
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const initials = (billingCompanyName || 'MVS')
    .replace(/[^A-Za-z0-9]/g, '')
    .toUpperCase()
    .slice(0, 3)
    .padEnd(3, 'X');
  const seq = `${Date.now()}`.slice(-6);
  return `${initials}/${yyyy}${mm}/SUB/${seq}`;
};

const getRazorpayConfig = () => {
  const keyId = String(process.env.RAZORPAY_KEY_ID || '').trim();
  const keySecret = String(process.env.RAZORPAY_KEY_SECRET || '').trim();
  return { keyId, keySecret, enabled: Boolean(keyId && keySecret) };
};

const verifyRazorpayPayment = async ({
  plan,
  razorpayOrderId,
  razorpayPaymentId,
  razorpaySignature
}: {
  plan: BillingPlanKey;
  razorpayOrderId: string;
  razorpayPaymentId: string;
  razorpaySignature: string;
}) => {
  const { keyId, keySecret, enabled } = getRazorpayConfig();
  if (!enabled) {
    return { ok: false, message: 'Razorpay 환경 변수가 설정되지 않았습니다.' };
  }

  const expectedAmount = BILLING_PLAN_CONFIG[plan].amount * 100;
  const payload = `${razorpayOrderId}|${razorpayPaymentId}`;
  const expectedSignature = crypto
    .createHmac('sha256', keySecret)
    .update(payload)
    .digest('hex');

  const providedBuffer = Buffer.from(razorpaySignature);
  const expectedBuffer = Buffer.from(expectedSignature);
  const signatureMatched =
    providedBuffer.length === expectedBuffer.length &&
    crypto.timingSafeEqual(providedBuffer, expectedBuffer);

  if (!signatureMatched) {
    return { ok: false, message: '결제 서명 검증에 실패했습니다.' };
  }

  try {
    const paymentResponse = await axios.get(`${RAZORPAY_API_BASE}/payments/${encodeURIComponent(razorpayPaymentId)}`, {
      auth: {
        username: keyId,
        password: keySecret
      }
    });
    const payment = paymentResponse.data || {};
    const validStatus = payment.status === 'captured' || payment.status === 'authorized';
    if (!validStatus) {
      return { ok: false, message: '결제 상태가 유효하지 않습니다.' };
    }
    if (String(payment.order_id || '') !== razorpayOrderId) {
      return { ok: false, message: '결제 주문 정보가 일치하지 않습니다.' };
    }
    if (Number(payment.amount || 0) !== expectedAmount) {
      return { ok: false, message: '결제 금액이 요금제 금액과 일치하지 않습니다.' };
    }
    if (String(payment.currency || '').toUpperCase() !== 'INR') {
      return { ok: false, message: '결제 통화가 올바르지 않습니다.' };
    }
    return { ok: true };
  } catch (error) {
    console.error('Razorpay 결제 조회 오류:', error);
    return { ok: false, message: '결제 검증 중 오류가 발생했습니다.' };
  }
};

export const createSignupPaymentOrder = async (req: Request, res: Response) => {
  try {
    const { planType, companyName, businessNumber, adminEmail } = req.body || {};
    const normalizedPlan = normalizeBillingPlanKey(String(planType || ''));

    if (!normalizedPlan || !BILLING_PLAN_CONFIG[normalizedPlan]) {
      return res.status(400).json({
        success: false,
        message: '요금제 값이 올바르지 않습니다.'
      });
    }

    const amount = BILLING_PLAN_CONFIG[normalizedPlan].amount;
    if (amount <= 0) {
      return res.json({
        success: true,
        data: {
          isFreeTrial: true,
          plan: normalizedPlan,
          amount: 0,
          currency: 'INR'
        }
      });
    }

    const { keyId, keySecret, enabled } = getRazorpayConfig();
    if (!enabled) {
      return res.status(500).json({
        success: false,
        message: 'Razorpay 결제를 사용할 수 없습니다. 환경 변수를 확인해주세요.'
      });
    }

    const amountPaise = amount * 100;
    const receipt = `mvs-signup-${Date.now()}`;
    const orderResponse = await axios.post(
      `${RAZORPAY_API_BASE}/orders`,
      {
        amount: amountPaise,
        currency: 'INR',
        receipt,
        notes: {
          purpose: 'mvs_signup',
          plan: normalizedPlan,
          companyName: String(companyName || '').slice(0, 60),
          businessNumber: String(businessNumber || '').slice(0, 30),
          adminEmail: String(adminEmail || '').slice(0, 100)
        }
      },
      {
        auth: {
          username: keyId,
          password: keySecret
        }
      }
    );

    const order = orderResponse.data || {};
    return res.json({
      success: true,
      data: {
        isFreeTrial: false,
        plan: normalizedPlan,
        keyId,
        orderId: order.id,
        amount: order.amount,
        currency: order.currency
      }
    });
  } catch (error: any) {
    console.error('Razorpay 주문 생성 오류:', error?.response?.data || error);
    return res.status(500).json({
      success: false,
      message: '결제 주문 생성 중 오류가 발생했습니다.'
    });
  }
};

export const register = async (req: Request, res: Response) => {
  const transaction = await (User as any).sequelize.transaction();
  try {
    const {
      companyName,
      businessNumber,
      gstNumber,
      adminName,
      adminUserid,
      adminEmail,
      adminPassword,
      planType,
      startDate,
      phone,
      address,
      razorpayOrderId,
      razorpayPaymentId,
      razorpaySignature
    } = req.body || {};

    const normalizedCompanyName = String(companyName || '').trim();
    const normalizedBusinessNumber = String(businessNumber || '').trim();
    const normalizedGstNumber = String(gstNumber || '').trim().toUpperCase();
    const normalizedAdminName = String(adminName || '').trim();
    const normalizedAdminUserid = String(adminUserid || '').trim();
    const normalizedAdminEmail = String(adminEmail || '').trim().toLowerCase();
    const normalizedPlan = normalizeBillingPlanKey(String(planType || ''));
    const normalizedPhone = String(phone || '').trim();
    const normalizedAddress = String(address || '').trim();

    if (!normalizedPlan || !BILLING_PLAN_CONFIG[normalizedPlan]) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '요금제 값이 올바르지 않습니다.'
      });
    }
    if (BILLING_PLAN_CONFIG[normalizedPlan].amount > 0) {
      const normalizedOrderId = String(razorpayOrderId || '').trim();
      const normalizedPaymentId = String(razorpayPaymentId || '').trim();
      const normalizedSignature = String(razorpaySignature || '').trim();
      if (!normalizedOrderId || !normalizedPaymentId || !normalizedSignature) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: '결제 확인 정보가 누락되었습니다. 결제를 먼저 완료해주세요.'
        });
      }
      const verifyResult = await verifyRazorpayPayment({
        plan: normalizedPlan,
        razorpayOrderId: normalizedOrderId,
        razorpayPaymentId: normalizedPaymentId,
        razorpaySignature: normalizedSignature
      });
      if (!verifyResult.ok) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: verifyResult.message || '결제 검증에 실패했습니다.'
        });
      }
    }
    if (!/^[0-9]{2}[A-Z0-9]{13}$/.test(normalizedGstNumber)) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: 'GST 번호 형식이 올바르지 않습니다. (15자리)'
      });
    }

    // 동일 회사(회사명·사업자번호·GST 기준)의 무료 체험은 1회만 허용
    if (normalizedPlan === 'free_week_7') {
      const companiesByName = await (Company as any).findAll({
        where: { name: normalizedCompanyName },
        attributes: ['id', 'subscription_plan', 'settings'],
        transaction
      });
      const companyByBusinessNumber = await (Company as any).findOne({
        where: { business_number: normalizedBusinessNumber },
        attributes: ['id', 'subscription_plan', 'settings'],
        transaction
      });
      const gstRow = await (CompanyGstNumber as any).findOne({
        where: { gst_number: normalizedGstNumber },
        attributes: ['company_id'],
        transaction
      });
      const companyByGst = gstRow
        ? await (Company as any).findByPk(gstRow.company_id, {
            attributes: ['id', 'subscription_plan', 'settings'],
            transaction
          })
        : null;

      const candidates = [...companiesByName];
      if (companyByBusinessNumber) candidates.push(companyByBusinessNumber);
      if (companyByGst) candidates.push(companyByGst);

      const alreadyUsedFreeTrial = candidates.some((company: any) => {
        const settings = company?.settings || {};
        const onboarding = settings?.onboarding || {};
        const plan = company?.subscription_plan;
        return FREE_TRIAL_PLAN_CODES.has(plan) || onboarding?.freeTrialUsed === true;
      });

      if (alreadyUsedFreeTrial) {
        await transaction.rollback();
        return res.status(400).json({
          success: false,
          message: '동일한 회사는 무료 이용(7일)을 1회만 사용할 수 있습니다.'
        });
      }
    }

    const duplicateUserId = await (User as any).findOne({
      where: { userid: normalizedAdminUserid },
      transaction
    });
    if (duplicateUserId) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 관리자 ID입니다.'
      });
    }

    const duplicateEmail = await (User as any).findOne({
      where: { email: normalizedAdminEmail },
      transaction
    });
    if (duplicateEmail) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '이미 사용 중인 이메일입니다.'
      });
    }

    const duplicateBusinessNumber = await (Company as any).findOne({
      where: { business_number: normalizedBusinessNumber },
      transaction
    });
    if (duplicateBusinessNumber) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '이미 등록된 사업자번호입니다.'
      });
    }
    const duplicateGstNumber = await (CompanyGstNumber as any).findOne({
      where: { gst_number: normalizedGstNumber },
      transaction
    });
    if (duplicateGstNumber) {
      await transaction.rollback();
      return res.status(400).json({
        success: false,
        message: '이미 등록된 GST 번호입니다.'
      });
    }

    const now = new Date();
    const usageStartDate = toDateOnly(startDate) || new Date(Date.UTC(now.getFullYear(), now.getMonth(), now.getDate()));
    const usageEndDate = addDays(usageStartDate, BILLING_PLAN_CONFIG[normalizedPlan].days - 1);
    const companySlug = slugify(normalizedCompanyName);
    const uniqueSuffix = `${Date.now().toString(36)}${Math.floor(Math.random() * 1000).toString().padStart(3, '0')}`;
    const subdomain = `${companySlug}-${uniqueSuffix}`.slice(0, 60);
    const domain = `${subdomain}.mvs.local`;

    const tenant = await (Tenant as any).create(
      {
        name: normalizedCompanyName,
        domain,
        subdomain,
        plan: normalizedPlan === 'year_50000' ? 'premium' : 'standard',
        max_users: 100,
        max_companies: 1,
        features: ['all_menus', 'payment_approval', 'work_management', 'analytics'],
        status: 'active',
        trial_ends_at: usageEndDate,
        subscription_id: `${normalizedPlan}-${Date.now()}`
      },
      { transaction }
    );

    const company = await (Company as any).create(
      {
        tenant_id: tenant.id,
        name: normalizedCompanyName,
        business_number: normalizedBusinessNumber,
        ceo_name: normalizedAdminName,
        address: normalizedAddress || '',
        phone: normalizedPhone || '',
        email: normalizedAdminEmail,
        website: '',
        industry: 'General',
        employee_count: 1,
        subscription_plan: BILLING_PLAN_CONFIG[normalizedPlan].code,
        subscription_status: 'active',
        status: 'active',
        account_holder_name: '',
        bank_name: '',
        bank_address: '',
        account_number: '',
        ifsc_code: '',
        swift_code: '',
        msme_number: '',
        iec_number: '',
        pan_number: '',
        login_period_start: usageStartDate,
        login_period_end: usageEndDate,
        login_time_start: '00:00:00',
        login_time_end: '23:59:59',
        timezone: 'Asia/Seoul',
        settings: {
          onboarding: {
            initialized: true,
            planType: normalizedPlan,
            billingAmount: BILLING_PLAN_CONFIG[normalizedPlan].amount,
            freeTrialUsed: normalizedPlan === 'free_week_7'
          }
        }
      },
      { transaction }
    );
    await (CompanyGstNumber as any).create(
      {
        company_id: company.id,
        gst_number: normalizedGstNumber,
        status: 'active'
      },
      { transaction }
    );

    const passwordHash = await bcrypt.hash(String(adminPassword), 10);
    const adminUser = await (User as any).create(
      {
        tenant_id: tenant.id,
        company_id: company.id,
        userid: normalizedAdminUserid,
        username: normalizedAdminName,
        email: normalizedAdminEmail,
        password_hash: passwordHash,
        role: 'admin',
        status: 'active',
        department: '관리',
        position: '관리자',
        is_payment_officer: true
      },
      { transaction }
    );

    const templateMenus = await (Menu as any).findAll({
      where: { tenant_id: 1, is_active: true },
      order: [['level', 'ASC'], ['order', 'ASC'], ['id', 'ASC']],
      transaction
    });

    const createdMenusByOldId = new Map<number, any>();
    const clonedMenus: any[] = [];
    for (const templateMenu of templateMenus) {
      const raw = templateMenu.toJSON ? templateMenu.toJSON() : templateMenu;
      const oldMenuId = Number(raw.id);
      const oldParentId = raw.parent_id ? Number(raw.parent_id) : null;
      const mappedParent = oldParentId ? createdMenusByOldId.get(oldParentId) : null;
      const createdMenu = await (Menu as any).create(
        {
          tenant_id: tenant.id,
          parent_id: mappedParent ? mappedParent.id : null,
          name_ko: raw.name_ko,
          name_en: raw.name_en,
          route: raw.route,
          icon: raw.icon,
          order: raw.order,
          level: raw.level,
          is_active: raw.is_active,
          description: raw.description || null
        },
        { transaction }
      );
      createdMenusByOldId.set(oldMenuId, createdMenu);
      clonedMenus.push(createdMenu);
    }

    if (clonedMenus.length > 0) {
      await (UserPermission as any).bulkCreate(
        clonedMenus.map((menu) => ({
          user_id: adminUser.id,
          menu_id: menu.id,
          can_view: true,
          can_create: true,
          can_edit: true,
          can_delete: true
        })),
        { transaction }
      );
    }

    let revenueInvoice: any = null;
    if (BILLING_PLAN_CONFIG[normalizedPlan].amount > 0) {
      // 가입 매출은 Minsub Ventures의 세금계산서(인보이스) 매출로 기록
      const billingCompanyCandidates = await (Company as any).findAll({
        attributes: ['id', 'tenant_id', 'name'],
        where: {
          status: 'active',
          name: { [Op.like]: '%Minsub Ventures%' }
        },
        transaction,
        limit: 5
      });
      const billingCompany = billingCompanyCandidates[0];
      if (!billingCompany) {
        await transaction.rollback();
        return res.status(500).json({
          success: false,
          message: 'Minsub Ventures 청구 회사 정보가 없어 가입을 완료할 수 없습니다.'
        });
      }

      const billingUser =
        (await (User as any).findOne({
          where: {
            tenant_id: billingCompany.tenant_id,
            company_id: billingCompany.id,
            role: { [Op.in]: ['root', 'admin'] },
            status: 'active'
          },
          order: [['role', 'ASC']],
          transaction
        })) ||
        adminUser;

      let billingCustomer = await (Customer as any).findOne({
        where: {
          tenant_id: billingCompany.tenant_id,
          company_id: billingCompany.id,
          business_number: normalizedBusinessNumber
        },
        transaction
      });
      if (!billingCustomer) {
        billingCustomer = await (Customer as any).create(
          {
            tenant_id: billingCompany.tenant_id,
            company_id: billingCompany.id,
            name: normalizedCompanyName,
            business_number: normalizedBusinessNumber,
            ceo_name: normalizedAdminName,
            address: normalizedAddress || null,
            phone: normalizedPhone || null,
            email: normalizedAdminEmail,
            status: 'active'
          },
          { transaction }
        );
      } else {
        await billingCustomer.update(
          {
            name: normalizedCompanyName,
            ceo_name: normalizedAdminName,
            address: normalizedAddress || billingCustomer.address,
            phone: normalizedPhone || billingCustomer.phone,
            email: normalizedAdminEmail
          },
          { transaction }
        );
      }

      const subtotal = BILLING_PLAN_CONFIG[normalizedPlan].amount;
      const taxAmount = Number(((subtotal * GST_RATE) / 100).toFixed(2));
      const totalAmount = Number((subtotal + taxAmount).toFixed(2));
      const invoiceDate = getDateOnlyString(now);
      const invoiceNumber = generateSubscriptionInvoiceNumber(billingCompany.name);

      revenueInvoice = await (Invoice as any).create(
        {
          tenant_id: billingCompany.tenant_id,
          company_id: billingCompany.id,
          customer_id: billingCustomer.id,
          invoice_number: invoiceNumber,
          invoice_date: invoiceDate,
          due_date: invoiceDate,
          subtotal,
          tax_amount: taxAmount,
          total_amount: totalAmount,
          status: 'issued',
          payment_status: 'paid',
          payment_method: 'online_signup',
          payment_date: invoiceDate,
          notes:
            `신규 가입 결제(${normalizedPlan}) · 가입회사 GST: ${normalizedGstNumber} · tenant_id=${tenant.id}, company_id=${company.id}`,
          created_by: billingUser.id
        },
        { transaction }
      );
      await (InvoiceItem as any).create(
        {
          invoice_id: revenueInvoice.id,
          item_name: normalizedPlan === 'year_50000' ? 'MVS 연간 구독' : 'MVS 월간 구독',
          description: `신규 가입 결제 · 기간 ${getDateOnlyString(usageStartDate)} ~ ${getDateOnlyString(usageEndDate)}`,
          quantity: 1,
          unit_price: subtotal,
          total_price: subtotal,
          tax_rate: GST_RATE,
          tax_amount: taxAmount,
          is_active: true
        },
        { transaction }
      );
    }

    await transaction.commit();

    return res.status(201).json({
      success: true,
      message: '가입이 완료되었습니다.',
      data: {
        tenantId: tenant.id,
        companyId: company.id,
        adminUserId: adminUser.id,
        plan: normalizedPlan,
        billingAmount: BILLING_PLAN_CONFIG[normalizedPlan].amount,
        gstNumber: normalizedGstNumber,
        taxInvoiceNumber: revenueInvoice ? revenueInvoice.invoice_number : null,
        usageStartDate: usageStartDate.toISOString().split('T')[0],
        usageEndDate: usageEndDate.toISOString().split('T')[0]
      }
    });
  } catch (error: any) {
    await transaction.rollback();
    console.error('가입 처리 오류:', error);
    return res.status(500).json({
      success: false,
      message: '가입 처리 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const login = async (req: LoginRequest, res: Response) => {
  try {
    const { userid, password } = req.body;
    const clientIp = getClientIp(req);
    const userAgent = String(req.headers['user-agent'] || '').slice(0, 500) || null;

    if (!userid || !password || typeof userid !== 'string' || typeof password !== 'string') {
      await writeLoginLog({
        userid: typeof userid === 'string' ? userid.trim() : null,
        status: 'failure',
        reason: 'invalid_payload',
        ip_address: clientIp,
        user_agent: userAgent
      });
      return res.status(400).json({
        success: false,
        message: '입력값이 올바르지 않습니다.'
      });
    }

    const normalizedUserId = userid.trim();
    if (normalizedUserId.length < 2 || normalizedUserId.length > 50) {
      await writeLoginLog({
        userid: normalizedUserId,
        status: 'failure',
        reason: 'invalid_userid_length',
        ip_address: clientIp,
        user_agent: userAgent
      });
      return res.status(400).json({
        success: false,
        message: '입력값이 올바르지 않습니다.'
      });
    }
    if (password.length > 128) {
      await writeLoginLog({
        userid: normalizedUserId,
        status: 'failure',
        reason: 'invalid_password_length',
        ip_address: clientIp,
        user_agent: userAgent
      });
      return res.status(400).json({
        success: false,
        message: '입력값이 올바르지 않습니다.'
      });
    }

    // 사용자 조회 (기존 컬럼만 조회하여 마이그레이션 전 호환성 유지)
    const user = await (User as any).findOne({
      where: { userid: normalizedUserId, status: 'active' },
      attributes: [
        'id', 'tenant_id', 'company_id', 'userid', 'username', 'email', 
        'password_hash', 'role', 'department', 'position', 'status', 'last_login', 'is_payment_officer'
      ]
    });

    if (!user) {
      await writeLoginLog({
        userid: normalizedUserId,
        status: 'failure',
        reason: 'user_not_found_or_inactive',
        ip_address: clientIp,
        user_agent: userAgent
      });
      return res.status(401).json({
        success: false,
        message: '사용자 ID 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 비밀번호 확인
    const isValidPassword = await comparePassword(password, user.password_hash);
    if (!isValidPassword) {
      await writeLoginLog({
        tenant_id: user.tenant_id,
        company_id: user.company_id,
        user_id: user.id,
        userid: user.userid,
        status: 'failure',
        reason: 'password_mismatch',
        ip_address: clientIp,
        user_agent: userAgent
      });
      return res.status(401).json({
        success: false,
        message: '사용자 ID 또는 비밀번호가 올바르지 않습니다.'
      });
    }

    // 시스템 설정/사용기간 정보 로드
    let sessionTimeoutMinutes = DEFAULT_SESSION_TIMEOUT_MINUTES;
    let loginPeriodStart: Date | null = null;
    let loginPeriodEnd: Date | null = null;
    let subscriptionStatus: string | null = null;
    try {
      if (user.company_id) {
        const company = await (Company as any).findOne({
          where: { id: user.company_id, tenant_id: user.tenant_id },
          attributes: ['settings', 'login_period_start', 'login_period_end', 'subscription_status']
        });
        if (company && company.settings && company.settings.security) {
          sessionTimeoutMinutes = normalizeSessionTimeoutMinutes(company.settings.security.sessionTimeout);
        }
        if (company) {
          loginPeriodStart = company.login_period_start ? new Date(company.login_period_start) : null;
          loginPeriodEnd = company.login_period_end ? new Date(company.login_period_end) : null;
          subscriptionStatus = company.subscription_status || null;
        }
      }
    } catch (error) {
      console.error('세션 타임아웃 설정 로드 오류:', error);
    }

    const nowDate = new Date();
    const currentDateOnly = new Date(Date.UTC(nowDate.getUTCFullYear(), nowDate.getUTCMonth(), nowDate.getUTCDate()));
    if (subscriptionStatus && ['inactive', 'expired', 'suspended'].includes(String(subscriptionStatus).toLowerCase())) {
      await writeLoginLog({
        tenant_id: user.tenant_id,
        company_id: user.company_id,
        user_id: user.id,
        userid: user.userid,
        status: 'failure',
        reason: `subscription_${String(subscriptionStatus).toLowerCase()}`,
        ip_address: clientIp,
        user_agent: userAgent
      });
      return res.status(403).json({
        success: false,
        message: '이용권 상태가 비활성화되어 로그인할 수 없습니다.'
      });
    }
    if (loginPeriodStart && currentDateOnly < new Date(Date.UTC(loginPeriodStart.getUTCFullYear(), loginPeriodStart.getUTCMonth(), loginPeriodStart.getUTCDate()))) {
      await writeLoginLog({
        tenant_id: user.tenant_id,
        company_id: user.company_id,
        user_id: user.id,
        userid: user.userid,
        status: 'failure',
        reason: 'before_usage_period',
        ip_address: clientIp,
        user_agent: userAgent
      });
      return res.status(403).json({
        success: false,
        message: '아직 이용 기간이 시작되지 않았습니다.'
      });
    }
    if (loginPeriodEnd && currentDateOnly > new Date(Date.UTC(loginPeriodEnd.getUTCFullYear(), loginPeriodEnd.getUTCMonth(), loginPeriodEnd.getUTCDate()))) {
      await writeLoginLog({
        tenant_id: user.tenant_id,
        company_id: user.company_id,
        user_id: user.id,
        userid: user.userid,
        status: 'failure',
        reason: 'usage_period_expired',
        ip_address: clientIp,
        user_agent: userAgent
      });
      return res.status(403).json({
        success: false,
        message: '이용 기간이 만료되었습니다. 결제를 갱신해 주세요.'
      });
    }

    // JWT 토큰 생성 (세션 타임아웃 적용)
    // expiresIn은 숫자(초 단위)로 전달합니다
    const expiresInSeconds = sessionTimeoutMinutes * 60;
    const signOptions: SignOptions = {
      expiresIn: expiresInSeconds
    };
    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: '서버 JWT 설정이 누락되었습니다.'
      });
    }

    const token = jwt.sign(
      { 
        userId: user.id, 
        userid: user.userid, 
        role: user.role,
        tenantId: user.tenant_id,
        companyId: user.company_id
      },
      jwtSecret,
      signOptions
    );

    // 마지막 로그인 시간 업데이트
    await user.update({ last_login: new Date() });
    await writeLoginLog({
      tenant_id: user.tenant_id,
      company_id: user.company_id,
      user_id: user.id,
      userid: user.userid,
      status: 'success',
      reason: null,
      ip_address: clientIp,
      user_agent: userAgent
    });

    res.json({
      success: true,
      data: {
        token,
        user: {
          id: user.id,
          userid: user.userid,
          username: user.username,
          email: user.email,
          role: user.role,
          department: user.department,
          position: user.position,
          tenant_id: user.tenant_id,
          company_id: user.company_id,
          is_payment_officer: user.is_payment_officer
        }
      },
      message: '로그인 성공'
    });
  } catch (error) {
    console.error('로그인 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

export const getProfile = async (req: Request, res: Response) => {
  try {
    const user = (req as any).user;

    res.json({
      success: true,
      data: {
        id: user.id,
        userid: user.userid,
        username: user.username,
        email: user.email,
        role: user.role,
        department: user.department,
        position: user.position,
        last_login: user.last_login,
        is_payment_officer: user.is_payment_officer
      }
    });
  } catch (error) {
    console.error('프로필 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '서버 오류가 발생했습니다.'
    });
  }
};

// 활동 기반 세션 연장을 위한 토큰 재발급
export const refreshToken = async (req: AuthRequest, res: Response) => {
  try {
    const user = req.user;
    if (!user) {
      return res.status(401).json({
        success: false,
        message: '인증이 필요합니다.'
      });
    }

    let sessionTimeoutMinutes = DEFAULT_SESSION_TIMEOUT_MINUTES;
    try {
      if (user.company_id) {
        const company = await (Company as any).findOne({
          where: { id: user.company_id, tenant_id: user.tenant_id },
          attributes: ['settings']
        });
        if (company && company.settings && company.settings.security) {
          sessionTimeoutMinutes = normalizeSessionTimeoutMinutes(company.settings.security.sessionTimeout);
        }
      }
    } catch (error) {
      console.error('세션 타임아웃 설정 로드 오류(리프레시):', error);
    }

    const jwtSecret = process.env.JWT_SECRET;
    if (!jwtSecret) {
      return res.status(500).json({
        success: false,
        message: '서버 JWT 설정이 누락되었습니다.'
      });
    }

    const expiresInSeconds = sessionTimeoutMinutes * 60;
    const signOptions: SignOptions = {
      expiresIn: expiresInSeconds
    };

    const token = jwt.sign(
      {
        userId: user.id,
        userid: user.userid,
        role: user.role,
        tenantId: user.tenant_id,
        companyId: user.company_id
      },
      jwtSecret,
      signOptions
    );

    return res.json({
      success: true,
      data: {
        token,
        expiresInSeconds
      },
      message: '세션이 연장되었습니다.'
    });
  } catch (error) {
    console.error('토큰 리프레시 오류:', error);
    return res.status(500).json({
      success: false,
      message: '토큰 갱신 중 오류가 발생했습니다.'
    });
  }
};
