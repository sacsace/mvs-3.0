import { Request, Response } from 'express';
import jwt from 'jsonwebtoken';
import path from 'path';
import { RequestWithUser } from '../types';
import { Invoice, InvoiceItem, Customer, ExpenseReport, Budget, Asset, Company, Approval, User, RoomBooking } from '../models';
import { Op, Sequelize, QueryTypes } from 'sequelize';
import sequelize from '../config/database';
import nodemailer from 'nodemailer';
import { env } from '../config/env';
import { buildNodemailerTransportOptions, getResolvedMailTransportOptions } from '../utils/mailConfig';
import { transferToBank } from '../services/banking';
import {
  buildBuyerPartyFromCustomer,
  buildNicEInvoicePayload,
  buildSellerPartyFromCompany,
  gstinStateCode,
  isPlausibleGstin,
  linesFromInvoiceRows,
  normalizeTransactionType,
  submitPayloadToIrp,
  type GstTransactionType
} from '../services/gstEInvoiceService';
import { pushNotification } from './notificationController';
import { buildRegularInvoicePdfBuffer } from '../utils/regularInvoiceMailPdf';

const ensureInvoiceColumns = async () => {
  try {
    await sequelize.query(`
      ALTER TABLE "invoices"
      ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "invoice_category" VARCHAR(30) NOT NULL DEFAULT 'regular',
      ADD COLUMN IF NOT EXISTS "gst_irn" VARCHAR(64),
      ADD COLUMN IF NOT EXISTS "gst_ack_no" VARCHAR(50),
      ADD COLUMN IF NOT EXISTS "gst_ack_date" VARCHAR(32),
      ADD COLUMN IF NOT EXISTS "signed_qr_code" TEXT,
      ADD COLUMN IF NOT EXISTS "irp_status" VARCHAR(32) NOT NULL DEFAULT 'draft',
      ADD COLUMN IF NOT EXISTS "irp_last_error" TEXT,
      ADD COLUMN IF NOT EXISTS "irp_submitted_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "transaction_type" VARCHAR(20) NOT NULL DEFAULT 'B2B',
      ADD COLUMN IF NOT EXISTS "gst_einvoice_payload" JSONB,
      ADD COLUMN IF NOT EXISTS "approver_user_id" INTEGER,
      ADD COLUMN IF NOT EXISTS "approved_at" TIMESTAMP WITH TIME ZONE,
      ADD COLUMN IF NOT EXISTS "approval_status" VARCHAR(32);
    `);
  } catch (error) {
    // Runtime 권한(ALTER TABLE) 제약으로 실패해도
    // 기존 컬럼이 이미 있으면 생성/수정 로직은 계속 진행 가능하다.
    console.warn('[accounting] ensureInvoiceColumns skipped:', error);
  }
};

const ensureInvoiceItemColumns = async () => {
  try {
    await sequelize.query(`
      ALTER TABLE "invoice_items"
      ADD COLUMN IF NOT EXISTS "is_active" BOOLEAN NOT NULL DEFAULT true,
      ADD COLUMN IF NOT EXISTS "hsn_sac" VARCHAR(20),
      ADD COLUMN IF NOT EXISTS "cgst_rate" DECIMAL(7, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "sgst_rate" DECIMAL(7, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "igst_rate" DECIMAL(7, 2) NOT NULL DEFAULT 0,
      ADD COLUMN IF NOT EXISTS "cess_rate" DECIMAL(7, 2) NOT NULL DEFAULT 0;
    `);
  } catch (error) {
    console.warn('[accounting] ensureInvoiceItemColumns skipped:', error);
  }
};

const ensureCustomerColumns = async () => {
  try {
    await sequelize.query(`
      ALTER TABLE "customers"
      ALTER COLUMN "business_number" TYPE VARCHAR(50);
    `);
  } catch (error) {
    console.warn('[accounting] ensureCustomerColumns skipped:', error);
  }
};

async function assertUserInCompany(
  userId: number,
  tenantId: number | undefined,
  companyId: number | undefined
): Promise<boolean> {
  const u = await (User as any).findOne({
    where: { id: userId, tenant_id: tenantId, company_id: companyId },
    attributes: ['id']
  });
  return !!u;
}

/** 이메일·IRN 등: 승인 없이 저장된 구 데이터(null) 또는 승인 완료만 허용 */
function isInvoiceApprovalAllowedForActions(inv: { approval_status?: string | null }) {
  const s = inv?.approval_status;
  return s == null || s === '' || s === 'approved';
}

const getIndianFiscalYearSuffix = (date = new Date()) => {
  const year = date.getFullYear();
  const month = date.getMonth(); // 0 = Jan
  if (month >= 3) {
    const start = year % 100;
    const end = (year + 1) % 100;
    return `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`;
  }
  const start = (year - 1) % 100;
  const end = year % 100;
  return `${String(start).padStart(2, '0')}-${String(end).padStart(2, '0')}`;
};

const buildCompanyAbbreviation = (name?: string | null) => {
  const cleaned = (name || '').replace(/[^A-Za-z0-9]/g, '').toUpperCase();
  if (!cleaned) return 'CMP';
  return cleaned.slice(0, 3).padEnd(3, 'X');
};

const getCompanyInvoicePrefix = async (companyId: number) => {
  const company = await (Company as any).findByPk(companyId, {
    attributes: ['name']
  });
  return buildCompanyAbbreviation(company?.name);
};

const isStandardInvoiceNumber = (value?: string | null) => {
  if (!value) return false;
  return /^[A-Z0-9]{3}\/\d{2}-\d{2}\/INV\/\d{4}$/.test(value);
};

const generateInvoiceNumber = async (companyId: number) => {
  const fy = getIndianFiscalYearSuffix();
  const companyPrefix = await getCompanyInvoicePrefix(companyId);
  const prefix = `${companyPrefix}/${fy}/INV/`;
  const rows = await sequelize.query<{ invoice_number: string | null }>(
    `
      SELECT invoice_number
      FROM invoices
      WHERE company_id = :companyId
        AND invoice_number LIKE :prefixLike
    `,
    {
      replacements: {
        companyId,
        prefixLike: `${prefix}%`
      },
      type: QueryTypes.SELECT
    }
  );
  const maxSeq = rows.reduce((max, row) => {
    const invoiceNumber = String(row?.invoice_number || '');
    if (!invoiceNumber.startsWith(prefix)) return max;
    const seqPart = invoiceNumber.slice(prefix.length).trim();
    if (!/^\d+$/.test(seqPart)) return max;
    const seq = Number(seqPart);
    if (!Number.isFinite(seq)) return max;
    return Math.max(max, seq);
  }, 0);
  const nextSeq = String(maxSeq + 1).padStart(4, '0');
  return `${prefix}${nextSeq}`;
};

const resolveCustomerId = async (
  invoiceData: any,
  tenant_id: number,
  company_id: number
) => {
  await ensureCustomerColumns();
  // If a valid customer_id is provided, use it
  if (invoiceData.customer_id) {
    const existing = await (Customer as any).findOne({
      where: { id: invoiceData.customer_id, tenant_id, company_id }
    });
    if (existing) {
      return existing.id;
    }
  }

  const businessNumber = invoiceData.customer_business_number || invoiceData.customer_gst || '';
  const email = invoiceData.customer_email || '';
  const name = invoiceData.customer_name || '';

  let customer = null;
  if (businessNumber) {
    customer = await (Customer as any).findOne({
      where: { tenant_id, company_id, business_number: businessNumber }
    });
  }
  if (!customer && email) {
    customer = await (Customer as any).findOne({
      where: { tenant_id, company_id, email }
    });
  }
  if (!customer && name) {
    customer = await (Customer as any).findOne({
      where: { tenant_id, company_id, name }
    });
  }

  if (customer) {
    await customer.update({
      name,
      email,
      phone: invoiceData.customer_phone || customer.phone,
      address: invoiceData.customer_address || customer.address,
      business_number: businessNumber || customer.business_number
    });
    return customer.id;
  }

  if (!name) {
    return null;
  }

  const created = await (Customer as any).create({
    tenant_id,
    company_id,
    name,
    email,
    phone: invoiceData.customer_phone || null,
    address: invoiceData.customer_address || null,
    business_number: businessNumber || null,
    status: 'active'
  });
  return created.id;
};

// 다음 인보이스 번호 조회 (인도 GST 권장 포맷)
export const getNextInvoiceNumber = async (req: RequestWithUser, res: Response) => {
  try {
    const { company_id } = req.user;
    const invoiceNumber = await generateInvoiceNumber(company_id);
    res.json({ success: true, data: { invoice_number: invoiceNumber } });
  } catch (error) {
    console.error('인보이스 번호 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 목록 조회
export const getInvoices = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    const { tenant_id, company_id } = req.user;
    const { page = 1, limit = 10, status = '', customer_id = '' } = req.query;

    const whereClause: any = { tenant_id, company_id };
    
    if (status) {
      whereClause.status = status;
    }
    
    if (customer_id) {
      whereClause.customer_id = customer_id;
    }

    // 활성화된 인보이스만 조회
    whereClause.is_active = true;
    whereClause[Op.or] = [
      { invoice_category: 'regular' },
      { invoice_category: null }
    ];

    const invoices = await (Invoice as any).findAndCountAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['name', 'email']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'username', 'email'],
          required: false
        }
      ],
      limit: Number(limit),
      offset: (Number(page) - 1) * Number(limit),
      order: [['invoice_date', 'DESC']]
    });

    res.json({
      success: true,
      data: invoices.rows,
      pagination: {
        total: invoices.count,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(invoices.count / Number(limit))
      }
    });
  } catch (error) {
    console.error('인보이스 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 상세 조회
export const getInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id, role } = req.user;

    await ensureInvoiceColumns();
    await ensureInvoiceItemColumns();
    await ensureCustomerColumns();

    const whereClause: any = { id, is_active: true };
    if (role !== 'root' && role !== 'audit') {
      whereClause.tenant_id = tenant_id;
      whereClause.company_id = company_id;
    } else if (tenant_id) {
      whereClause.tenant_id = tenant_id;
    }

    let invoice: any = null;
    try {
      invoice = await (Invoice as any).findOne({
        where: whereClause,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['name', 'email', 'phone', 'address', 'business_number'],
            required: false
          },
          {
            model: User,
            as: 'approver',
            attributes: ['id', 'username', 'email'],
            required: false
          },
          {
            model: InvoiceItem,
            as: 'items',
            attributes: ['id', 'item_name', 'description', 'quantity', 'unit_price', 'total_price', 'tax_rate', 'tax_amount'],
            required: false
          }
        ]
      });
    } catch (queryError: any) {
      console.warn('[accounting] getInvoice include query fallback:', queryError?.message);
      const basic = await (Invoice as any).findOne({ where: whereClause });
      if (basic) {
        const plain = basic.toJSON ? basic.toJSON() : basic;
        let customer: any = null;
        if (plain?.customer_id) {
          customer = await (Customer as any).findOne({
            where: { id: plain.customer_id },
            attributes: ['name', 'email', 'phone', 'address', 'business_number']
          });
        }
        const items = await (InvoiceItem as any).findAll({
          where: { invoice_id: plain.id },
          attributes: ['id', 'item_name', 'description', 'quantity', 'unit_price', 'total_price', 'tax_rate', 'tax_amount']
        });
        invoice = {
          ...plain,
          customer: customer ? (customer.toJSON ? customer.toJSON() : customer) : null,
          items: items || []
        };
      }
    }

    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('인보이스 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

function pickInvoiceCurrencyForMailPdf(inv: any): string {
  const p = inv?.gst_einvoice_payload;
  if (p && typeof p === 'object' && typeof (p as { currency?: string }).currency === 'string') {
    const c = String((p as { currency?: string }).currency).trim();
    if (c) return c;
  }
  return 'INR';
}

// 인보이스 이메일 전송 (PDF는 서버에서 pdfkit으로 생성 — 텍스트·벡터 기반)
export const sendInvoiceEmail = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { to, subject, message, filename } = req.body;

    if (!to) {
      return res.status(400).json({ success: false, message: '수신 이메일 주소가 필요합니다.' });
    }

    const { tenant_id, company_id, id: userId } = req.user;
    const companyRow = await Company.findOne({
      where: { id: company_id, tenant_id }
    });
    const senderRow = await User.findOne({
      where: { id: userId, tenant_id, company_id },
      attributes: ['id', 'settings']
    });
    const mailOpts = getResolvedMailTransportOptions(companyRow, senderRow);
    if (!mailOpts) {
      return res.status(503).json({
        success: false,
        message:
          '메일 서버가 설정되지 않았습니다. 시스템 설정의 보내는 메일 서버를 입력하거나 환경변수(EMAIL_*)를 설정하세요.'
      });
    }

    await ensureInvoiceColumns();
    await ensureInvoiceItemColumns();
    await ensureCustomerColumns();

    const whereClause: any = { id: Number(id), tenant_id, company_id, is_active: true };

    let invoice: any = null;
    try {
      invoice = await (Invoice as any).findOne({
        where: whereClause,
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['name', 'email', 'phone', 'address', 'business_number'],
            required: false
          },
          {
            model: InvoiceItem,
            as: 'items',
            attributes: [
              'id',
              'item_name',
              'description',
              'quantity',
              'unit_price',
              'total_price',
              'tax_rate',
              'tax_amount',
              'is_active'
            ],
            required: false
          }
        ]
      });
    } catch (queryError: any) {
      console.warn('[accounting] sendInvoiceEmail include query fallback:', queryError?.message);
      const basic = await (Invoice as any).findOne({ where: whereClause });
      if (basic) {
        const plain = basic.toJSON ? basic.toJSON() : basic;
        let customer: any = null;
        if (plain?.customer_id) {
          customer = await (Customer as any).findOne({
            where: { id: plain.customer_id },
            attributes: ['name', 'email', 'phone', 'address', 'business_number']
          });
        }
        const items = await (InvoiceItem as any).findAll({
          where: { invoice_id: plain.id },
          attributes: [
            'id',
            'item_name',
            'description',
            'quantity',
            'unit_price',
            'total_price',
            'tax_rate',
            'tax_amount',
            'is_active'
          ]
        });
        invoice = {
          ...plain,
          customer: customer ? (customer.toJSON ? customer.toJSON() : customer) : null,
          items: items || []
        };
      }
    }

    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }

    const invPlain = invoice.toJSON ? invoice.toJSON() : invoice;

    if (!isInvoiceApprovalAllowedForActions(invPlain)) {
      return res.status(403).json({
        success: false,
        message: '승인된 인보이스만 이메일로 PDF를 보낼 수 있습니다.'
      });
    }

    const cust = invPlain.customer || {};
    const customerName = String(cust.name || '').trim() || '—';
    const rawItems = Array.isArray(invPlain.items) ? invPlain.items : [];
    const mailItems = rawItems
      .filter((row: { is_active?: boolean }) => row?.is_active !== false)
      .map((row: any) => ({
        item_name: String(row.item_name ?? ''),
        description: row.description,
        quantity: Number(row.quantity) || 0,
        unit_price: Number(row.unit_price) || 0,
        total_price: Number(row.total_price) || 0,
        tax_rate: row.tax_rate != null ? Number(row.tax_rate) : undefined,
        tax_amount: row.tax_amount != null ? Number(row.tax_amount) : undefined
      }));

    type CompanyRowPlain = { name?: string; address?: string; business_number?: string };
    const compRaw = companyRow ? (companyRow.toJSON ? companyRow.toJSON() : companyRow) : {};
    const comp = compRaw as CompanyRowPlain;
    const pdfBuffer = await buildRegularInvoicePdfBuffer({
      companyName: String(comp.name ?? 'Company'),
      companyAddress: comp.address || undefined,
      companyGstin: comp.business_number || undefined,
      invoice: {
        invoice_number: String(invPlain.invoice_number || ''),
        invoice_date: invPlain.invoice_date,
        due_date: invPlain.due_date,
        subtotal: Number(invPlain.subtotal) || 0,
        tax_amount: Number(invPlain.tax_amount) || 0,
        total_amount: Number(invPlain.total_amount) || 0,
        notes: invPlain.notes || null
      },
      customerName,
      customerEmail: cust.email || undefined,
      customerPhone: cust.phone || undefined,
      customerAddress: cust.address || undefined,
      customerGstin: cust.business_number || undefined,
      items: mailItems,
      currency: pickInvoiceCurrencyForMailPdf(invPlain)
    });

    const MAX_PDF_BYTES = 5 * 1024 * 1024;
    if (pdfBuffer.length > MAX_PDF_BYTES) {
      return res.status(413).json({
        success: false,
        message: `첨부 PDF는 5MB 이하여야 합니다. (현재 약 ${(pdfBuffer.length / (1024 * 1024)).toFixed(2)}MB)`
      });
    }

    const transporter = nodemailer.createTransport({
      ...buildNodemailerTransportOptions(mailOpts),
      connectionTimeout: 120000,
      greetingTimeout: 60000,
      socketTimeout: 120000
    });

    await transporter.sendMail({
      from: mailOpts.from,
      to,
      subject: subject || `Invoice ${invPlain.invoice_number}`,
      text: message || `Invoice ${invPlain.invoice_number} PDF를 첨부합니다.`,
      attachments: [
        {
          filename: (filename || `${invPlain.invoice_number}.pdf`).replace(/[^\w.\-]+/g, '_'),
          content: pdfBuffer,
          contentType: 'application/pdf'
        }
      ]
    });

    res.json({ success: true });
  } catch (error) {
    console.error('인보이스 이메일 전송 오류:', error);
    res.status(500).json({ success: false, message: '이메일 전송에 실패했습니다.' });
  }
};

// 인보이스 생성
export const createInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: user_id } = req.user;
    const { items, approver_user_id, ...invoiceData } = req.body;

    await ensureInvoiceColumns();
    await ensureInvoiceItemColumns();

    if (!approver_user_id) {
      return res.status(400).json({ success: false, message: '승인자를 지정해야 합니다.' });
    }
    const okApprover = await assertUserInCompany(Number(approver_user_id), tenant_id, company_id);
    if (!okApprover) {
      return res.status(400).json({ success: false, message: '승인자를 찾을 수 없거나 같은 회사 소속이 아닙니다.' });
    }

    const resolvedCustomerId = await resolveCustomerId(invoiceData, tenant_id, company_id);
    if (!resolvedCustomerId) {
      return res.status(400).json({ success: false, message: '고객 정보가 올바르지 않습니다.' });
    }
    invoiceData.customer_id = resolvedCustomerId;

    const invoiceNumber = await generateInvoiceNumber(company_id);
    const invoice = await (Invoice as any).create({
      ...invoiceData,
      invoice_number: invoiceNumber,
      invoice_category: 'regular',
      tenant_id,
      company_id,
      created_by: user_id,
      is_active: true,
      approver_user_id: Number(approver_user_id),
      approval_status: 'pending_approval',
      approved_at: null
    });

    // 인보이스 아이템들 생성
    if (items && items.length > 0) {
      const invoiceItems = items.map((item: any) => ({
        ...item,
        invoice_id: invoice.id
      }));
      
      await (InvoiceItem as any).bulkCreate(invoiceItems);
    }

    // 생성된 인보이스와 아이템들을 함께 반환
    const createdInvoice = await (Invoice as any).findOne({
      where: { id: invoice.id },
      include: [
        {
          model: InvoiceItem,
          as: 'items'
        }
      ]
    });

    res.status(201).json({ success: true, data: createdInvoice });
  } catch (error) {
    console.error('인보이스 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 수정
export const updateInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const { items, ...invoiceData } = req.body;
    delete (invoiceData as any).approval_status;
    delete (invoiceData as any).approved_at;

    await ensureInvoiceColumns();
    await ensureInvoiceItemColumns();

    if ((invoiceData as any).approver_user_id != null) {
      const ok = await assertUserInCompany(
        Number((invoiceData as any).approver_user_id),
        tenant_id,
        company_id
      );
      if (!ok) {
        return res.status(400).json({ success: false, message: '승인자를 찾을 수 없거나 같은 회사 소속이 아닙니다.' });
      }
    }

    const resolvedCustomerId = await resolveCustomerId(invoiceData, tenant_id, company_id);
    if (!resolvedCustomerId) {
      return res.status(400).json({ success: false, message: '고객 정보가 올바르지 않습니다.' });
    }
    invoiceData.customer_id = resolvedCustomerId;

    const invoice = await (Invoice as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }

    // 인보이스 정보 업데이트
    await invoice.update(invoiceData);

    // 기존 아이템들 삭제 후 새로 생성
    if (items) {
      await (InvoiceItem as any).destroy({ where: { invoice_id: id } });
      
      const invoiceItems = items.map((item: any) => ({
        ...item,
        invoice_id: id
      }));
      
      await (InvoiceItem as any).bulkCreate(invoiceItems);
    }

    // 업데이트된 인보이스 반환
    const updatedInvoice = await (Invoice as any).findOne({
      where: { id },
      include: [
        {
          model: InvoiceItem,
          as: 'items'
        }
      ]
    });

    res.json({ success: true, data: updatedInvoice });
  } catch (error) {
    console.error('인보이스 수정 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 삭제 → 실제 삭제 없이 승인 요청만 등록 (본문: approver_user_id, memo)
export const deleteInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id, id: user_id, username } = req.user;
    const { approver_user_id: approverRaw, memo } = req.body || {};
    const approver_user_id =
      approverRaw != null && approverRaw !== '' ? Number(approverRaw) : NaN;

    if (!Number.isFinite(approver_user_id) || approver_user_id < 1) {
      return res.status(400).json({ success: false, message: '승인 대상을 선택해주세요.' });
    }

    const okApprover = await assertUserInCompany(approver_user_id, tenant_id, company_id);
    if (!okApprover) {
      return res.status(400).json({
        success: false,
        message: '승인자를 찾을 수 없거나 같은 회사 소속이 아닙니다.'
      });
    }

    await ensureInvoiceColumns();
    await ensureInvoiceItemColumns();

    const invoice = await (Invoice as any).findOne({
      where: { id: Number(id), tenant_id, company_id }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }

    const approvalDocumentId = `INV-DELETE-${tenant_id}-${company_id}-${id}`;
    const existingRequest = await (Approval as any).findOne({
      where: {
        tenant_id,
        company_id,
        document_id: approvalDocumentId,
        status: { [Op.in]: ['draft', 'submitted', 'in_review'] }
      }
    });

    if (existingRequest) {
      return res.status(400).json({
        success: false,
        message: '이미 삭제 승인 요청이 접수되었습니다.'
      });
    }

    const requestedAt = new Date().toISOString();
    const memoTrim = typeof memo === 'string' ? memo.trim() : '';
    const requestLog = [
      {
        action: 'invoice_delete_request_submitted',
        actor_id: user_id,
        actor_name: username || `user-${user_id}`,
        timestamp: requestedAt,
        approver_user_id,
        memo: memoTrim || undefined
      }
    ];

    const baseDesc = `인보이스 ${invoice.invoice_number} 삭제 요청 (승인자 ID: ${approver_user_id})`;
    const description = memoTrim ? `${baseDesc}\n메모: ${memoTrim}` : baseDesc;

    const approvalFlowStep = {
      approverId: approver_user_id,
      status: 'pending',
      order: 1
    };

    await (Approval as any).create({
      tenant_id,
      company_id,
      document_id: approvalDocumentId,
      is_active: true,
      title: `인보이스 삭제 승인 요청 - ${invoice.invoice_number}`,
      type: 'other',
      category: 'invoice_delete',
      amount: Number(invoice.total_amount || 0),
      requester_id: user_id,
      description,
      attachments: null,
      status: 'in_review',
      priority: 'medium',
      current_approver_id: approver_user_id,
      approval_flow: JSON.stringify([approvalFlowStep]),
      due_date: null,
      comments: JSON.stringify(requestLog)
    });

    const noteLine = memoTrim
      ? `[DELETE_REQUEST] ${requestedAt} by ${username || `user-${user_id}`} → approver ${approver_user_id}: ${memoTrim}`
      : `[DELETE_REQUEST] ${requestedAt} by ${username || `user-${user_id}`} → approver ${approver_user_id}`;
    await invoice.update({
      notes: `${invoice.notes || ''}\n${noteLine}`.trim()
    });

    pushNotification({
      title: '인보이스 삭제 승인 요청',
      message: `${invoice.invoice_number} 삭제 승인 요청이 등록되었습니다.`,
      type: 'info',
      target_type: 'tenant',
      tenant_id,
      data: {
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        approval_document_id: approvalDocumentId
      }
    });

    notifyUser(
      req,
      approver_user_id,
      '인보이스 삭제 승인 요청',
      `${username || '사용자'}님이 인보이스 ${invoice.invoice_number} 삭제 승인을 요청했습니다.`,
      'info',
      {
        feature: 'approval',
        invoice_id: invoice.id,
        invoice_number: invoice.invoice_number,
        href: '/work/approval'
      }
    );

    res.json({ success: true, message: '인보이스 삭제 승인 요청이 등록되었습니다.' });
  } catch (error) {
    console.error('인보이스 삭제 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 인보이스 상태 변경
export const updateInvoiceStatus = async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status, payment_status } = req.body;
    const { tenant_id, company_id } = (req as any).user;

    const invoice = await (Invoice as any).findOne({
      where: { id, tenant_id, company_id }
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }

    const updateData: any = {};
    if (status) updateData.status = status;
    if (payment_status) updateData.payment_status = payment_status;

    await invoice.update(updateData);

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('인보이스 상태 변경 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로포마 인보이스 목록 조회
export const getProformaInvoices = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    const { tenant_id, company_id } = req.user;
    const userRole = req.user?.role;
    const { status = '', customer_id = '', company_id: queryCompanyId } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 프로포마 인보이스 조회 가능
    if (userRole === 'root' || userRole === 'audit') {
      if (tenant_id) whereClause.tenant_id = tenant_id;
      if (userRole === 'root' && queryCompanyId) {
        whereClause.company_id = parseInt(queryCompanyId as string);
      }
    } else {
      whereClause.tenant_id = tenant_id;
      whereClause.company_id = company_id;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (customer_id) {
      whereClause.customer_id = customer_id;
    }

    // 활성화된 프로포마 인보이스만 조회 (status가 'draft', 'sent', 'accepted', 'converted', 'cancelled'인 것들)
    whereClause.is_active = true;
    whereClause.invoice_category = 'proforma';

    const invoices = await (Invoice as any).findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address']
        },
        {
          model: InvoiceItem,
          as: 'items',
          attributes: ['id', 'item_name', 'description', 'quantity', 'unit_price', 'total_price', 'tax_rate', 'tax_amount']
        }
      ],
      order: [['invoice_date', 'DESC']]
    });

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('프로포마 인보이스 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로포마 인보이스 생성
export const createProformaInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    const { tenant_id, company_id, id: user_id } = req.user;
    const { items, ...invoiceData } = req.body;

    // 프로포마 인보이스 생성 (status 기본값: 'draft')
    const invoice = await (Invoice as any).create({
      ...invoiceData,
      invoice_category: 'proforma',
      tenant_id,
      company_id,
      created_by: user_id,
      status: invoiceData.status || 'draft',
      is_active: true
    });

    // 인보이스 아이템들 생성
    if (items && items.length > 0) {
      const invoiceItems = items.map((item: any) => ({
        ...item,
        invoice_id: invoice.id
      }));
      
      await (InvoiceItem as any).bulkCreate(invoiceItems);
    }

    // 생성된 프로포마 인보이스와 아이템들을 함께 반환
    const createdInvoice = await (Invoice as any).findOne({
      where: { id: invoice.id },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address']
        },
        {
          model: InvoiceItem,
          as: 'items'
        }
      ]
    });

    res.status(201).json({ success: true, data: createdInvoice });
  } catch (error) {
    console.error('프로포마 인보이스 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로포마 인보이스 상태 업데이트
export const updateProformaInvoiceStatus = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { tenant_id, company_id } = req.user;
    const userRole = req.user?.role;

    const whereClause: any = { id };
    
    // root나 audit 권한이면 모든 프로포마 인보이스 수정 가능
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenant_id;
      whereClause.company_id = company_id;
    }

    const invoice = await (Invoice as any).findOne({
      where: whereClause
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: '프로포마 인보이스를 찾을 수 없습니다.' });
    }

    await invoice.update({ status });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('프로포마 인보이스 상태 업데이트 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 프로포마 인보이스에서 E-Invoice 생성
export const createEInvoiceFromProforma = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    await ensureInvoiceItemColumns();
    const { id } = req.params;
    const { tenant_id, company_id, id: user_id } = req.user;
    const userRole = req.user?.role;
    const {
      issueDate,
      dueDate,
      notes,
      approver_user_id
    } = req.body || {};

    if (!approver_user_id) {
      return res.status(400).json({ success: false, message: '승인자를 지정해야 합니다.' });
    }
    const okApprover = await assertUserInCompany(Number(approver_user_id), tenant_id, company_id);
    if (!okApprover) {
      return res.status(400).json({ success: false, message: '승인자를 찾을 수 없거나 같은 회사 소속이 아닙니다.' });
    }

    const whereClause: any = { id, invoice_category: 'proforma' };
    
    // root나 audit 권한이면 모든 프로포마 인보이스 조회 가능
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenant_id;
      whereClause.company_id = company_id;
    }

    // 프로포마 인보이스 조회
    const proformaInvoice = await (Invoice as any).findOne({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address']
        },
        {
          model: InvoiceItem,
          as: 'items',
          attributes: ['id', 'item_name', 'description', 'quantity', 'unit_price', 'total_price', 'tax_rate', 'tax_amount']
        }
      ]
    });

    if (!proformaInvoice) {
      return res.status(404).json({ success: false, message: '프로포마 인보이스를 찾을 수 없습니다.' });
    }

    // 프로포마 인보이스가 'accepted' 상태인지 확인
    if (proformaInvoice.status !== 'accepted') {
      return res.status(400).json({ 
        success: false, 
        message: '프로포마 인보이스가 승인된 상태가 아닙니다. E-Invoice를 생성하려면 프로포마 인보이스가 승인되어야 합니다.' 
      });
    }

    // E-Invoice 생성 (프로포마 인보이스 데이터를 기반으로)
    const invoiceDate = issueDate || new Date().toISOString().split('T')[0];
    const dueDateValue = dueDate || proformaInvoice.due_date || invoiceDate;
    const notesValue = typeof notes === 'string' ? notes : undefined;

    const txnType = (req.body?.transactionType || req.body?.transaction_type || 'B2B') as string;

    const eInvoice = await (Invoice as any).create({
      tenant_id: proformaInvoice.tenant_id,
      company_id: proformaInvoice.company_id,
      customer_id: proformaInvoice.customer_id,
      invoice_number: await generateInvoiceNumber(proformaInvoice.company_id),
      invoice_category: 'e_invoice',
      invoice_date: invoiceDate,
      due_date: dueDateValue,
      subtotal: proformaInvoice.subtotal,
      tax_amount: proformaInvoice.tax_amount,
      total_amount: proformaInvoice.total_amount,
      status: 'draft',
      payment_status: 'pending',
      notes: notesValue || proformaInvoice.notes || `프로포마 인보이스 ${proformaInvoice.invoice_number}에서 생성됨`,
      created_by: user_id,
      is_active: true,
      transaction_type: txnType,
      irp_status: 'draft',
      approver_user_id: Number(approver_user_id),
      approval_status: 'pending_approval',
      approved_at: null
    });

    // 인보이스 아이템들 복사
    if (proformaInvoice.items && proformaInvoice.items.length > 0) {
      const invoiceItems = proformaInvoice.items.map((item: any) => ({
        invoice_id: eInvoice.id,
        item_name: item.item_name,
        description: item.description,
        quantity: item.quantity,
        unit_price: item.unit_price,
        total_price: item.total_price,
        tax_rate: item.tax_rate,
        tax_amount: item.tax_amount,
        hsn_sac: item.hsn_sac ?? null,
        cgst_rate: item.cgst_rate ?? 0,
        sgst_rate: item.sgst_rate ?? 0,
        igst_rate: item.igst_rate ?? 0,
        cess_rate: item.cess_rate ?? 0,
        is_active: true
      }));

      await (InvoiceItem as any).bulkCreate(invoiceItems);
    }

    // 프로포마 인보이스 상태를 'converted'로 업데이트
    await proformaInvoice.update({ status: 'converted' });

    // 생성된 E-Invoice 반환
    const createdEInvoice = await (Invoice as any).findOne({
      where: { id: eInvoice.id },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address']
        },
        {
          model: InvoiceItem,
          as: 'items'
        }
      ]
    });

    res.status(201).json({ success: true, data: createdEInvoice });
  } catch (error) {
    console.error('프로포마 인보이스에서 E-Invoice 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// E-Invoice 목록 조회
export const getEInvoices = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    await ensureInvoiceItemColumns();
    const { tenant_id, company_id } = req.user;
    const userRole = req.user?.role;
    const { status = '', customer_id = '', company_id: queryCompanyId } = req.query;

    const whereClause: any = {};
    
    // root나 audit 권한이면 모든 E-Invoice 조회 가능
    if (userRole === 'root' || userRole === 'audit') {
      if (tenant_id) whereClause.tenant_id = tenant_id;
      if (userRole === 'root' && queryCompanyId) {
        whereClause.company_id = parseInt(queryCompanyId as string);
      }
    } else {
      whereClause.tenant_id = tenant_id;
      whereClause.company_id = company_id;
    }
    
    if (status) {
      whereClause.status = status;
    }
    
    if (customer_id) {
      whereClause.customer_id = customer_id;
    }

    // 활성화된 E-Invoice만 조회
    whereClause.is_active = true;
    whereClause.invoice_category = 'e_invoice';

    const invoices = await (Invoice as any).findAll({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address']
        },
        {
          model: User,
          as: 'approver',
          attributes: ['id', 'username', 'email'],
          required: false
        },
        {
          model: User,
          as: 'creator',
          attributes: ['id', 'username', 'email'],
          required: false
        },
        {
          model: InvoiceItem,
          as: 'items',
          attributes: [
            'id',
            'item_name',
            'description',
            'quantity',
            'unit_price',
            'total_price',
            'tax_rate',
            'tax_amount',
            'hsn_sac',
            'cgst_rate',
            'sgst_rate',
            'igst_rate',
            'cess_rate'
          ]
        }
      ],
      order: [['invoice_date', 'DESC']]
    });

    res.json({
      success: true,
      data: invoices
    });
  } catch (error) {
    console.error('E-Invoice 목록 조회 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// E-Invoice 생성
export const createEInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    await ensureInvoiceItemColumns();
    const { tenant_id, company_id, id: user_id } = req.user;
    const body = req.body || {};
    const {
      items,
      transaction_type,
      customer_id,
      invoice_number,
      invoice_date,
      due_date,
      subtotal,
      tax_amount,
      total_amount,
      notes,
      status,
      approver_user_id
    } = body;
    const invoiceNumber = isStandardInvoiceNumber(invoice_number)
      ? invoice_number
      : await generateInvoiceNumber(company_id);
    const invDate = invoice_date || new Date().toISOString().split('T')[0];
    const due = due_date || invDate;

    if (!customer_id) {
      return res.status(400).json({ success: false, message: '고객을 선택해주세요.' });
    }

    if (!approver_user_id) {
      return res.status(400).json({ success: false, message: '승인자를 지정해야 합니다.' });
    }
    const okApprover = await assertUserInCompany(Number(approver_user_id), tenant_id, company_id);
    if (!okApprover) {
      return res.status(400).json({ success: false, message: '승인자를 찾을 수 없거나 같은 회사 소속이 아닙니다.' });
    }

    const invoice = await (Invoice as any).create({
      customer_id,
      subtotal: subtotal ?? 0,
      tax_amount: tax_amount ?? 0,
      total_amount: total_amount ?? 0,
      notes: notes ?? null,
      invoice_number: invoiceNumber,
      invoice_category: 'e_invoice',
      invoice_date: invDate,
      due_date: due,
      tenant_id,
      company_id,
      created_by: user_id,
      status: status || 'draft',
      is_active: true,
      transaction_type: transaction_type || 'B2B',
      irp_status: 'draft',
      approver_user_id: Number(approver_user_id),
      approval_status: 'pending_approval',
      approved_at: null
    });

    if (items && items.length > 0) {
      const invoiceItems = items.map((item: any) => ({
        invoice_id: invoice.id,
        item_name: item.item_name || item.name || 'Item',
        description: item.description ?? null,
        quantity: item.quantity ?? 1,
        unit_price: item.unit_price ?? 0,
        total_price: item.total_price ?? 0,
        tax_rate: item.tax_rate ?? 0,
        tax_amount: item.tax_amount ?? 0,
        hsn_sac: item.hsn_sac ?? item.hsnCode ?? null,
        cgst_rate: item.cgst_rate ?? 0,
        sgst_rate: item.sgst_rate ?? 0,
        igst_rate: item.igst_rate ?? 0,
        cess_rate: item.cess_rate ?? 0,
        is_active: true
      }));

      await (InvoiceItem as any).bulkCreate(invoiceItems);
    }

    const createdInvoice = await (Invoice as any).findOne({
      where: { id: invoice.id },
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address', 'business_number']
        },
        {
          model: InvoiceItem,
          as: 'items'
        }
      ]
    });

    res.status(201).json({ success: true, data: createdInvoice });
  } catch (error) {
    console.error('E-Invoice 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// E-Invoice 상태 업데이트
export const updateEInvoiceStatus = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { tenant_id, company_id } = req.user;
    const userRole = req.user?.role;

    const whereClause: any = { id };
    
    // root나 audit 권한이면 모든 E-Invoice 수정 가능
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenant_id;
      whereClause.company_id = company_id;
    }

    const invoice = await (Invoice as any).findOne({
      where: whereClause
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'E-Invoice를 찾을 수 없습니다.' });
    }

    await invoice.update({ status });

    res.json({ success: true, data: invoice });
  } catch (error) {
    console.error('E-Invoice 상태 업데이트 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

/** NIC IRP에 e-invoice JSON 제출 — GST_IRP_MODE=live 시 GSP HTTP, 아니면 NIC 형식 mock IRN */
export const generateEInvoiceIrn = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    await ensureInvoiceItemColumns();
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const userRole = req.user?.role;

    const whereClause: any = { id, invoice_category: 'e_invoice', is_active: true };
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenant_id;
      whereClause.company_id = company_id;
    }

    const invoice = await (Invoice as any).findOne({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address', 'business_number']
        },
        {
          model: InvoiceItem,
          as: 'items',
          required: false
        }
      ]
    });

    if (!invoice) {
      return res.status(404).json({ success: false, message: 'E-Invoice를 찾을 수 없습니다.' });
    }

    if (!isInvoiceApprovalAllowedForActions(invoice)) {
      return res.status(403).json({
        success: false,
        message: '내부 승인이 완료된 전자세금계산서만 IRN을 발급할 수 있습니다.'
      });
    }

    if (invoice.gst_irn) {
      return res.status(400).json({ success: false, message: '이미 IRN이 발급된 인보이스입니다.' });
    }

    const company = await (Company as any).findByPk(invoice.company_id);
    if (!company) {
      return res.status(400).json({ success: false, message: '회사 정보를 찾을 수 없습니다.' });
    }

    const seller = buildSellerPartyFromCompany(company);
    const buyer = buildBuyerPartyFromCustomer(invoice.customer);
    if (!isPlausibleGstin(seller.gstin)) {
      return res.status(400).json({
        success: false,
        message: '공급자 GSTIN(회사 business_number)이 유효한 15자 형식이 아닙니다.'
      });
    }
    if (!isPlausibleGstin(buyer.gstin)) {
      return res.status(400).json({
        success: false,
        message: '수취인 GSTIN(고객 business_number)이 유효한 15자 형식이 아닙니다.'
      });
    }

    const plainItems = (invoice.items || [])
      .map((row: any) => (row.get ? row.get({ plain: true }) : row))
      .filter((p: any) => p.is_active !== false);
    const intra = gstinStateCode(seller.gstin) === gstinStateCode(buyer.gstin);

    const itemRows =
      plainItems.length > 0
        ? plainItems
        : [
            {
              item_name: 'Taxable supply',
              description: 'Aggregate line (add line items for accurate HSN)',
              quantity: 1,
              unit_price: Number(invoice.subtotal),
              total_price: Number(invoice.subtotal),
              tax_rate:
                Number(invoice.subtotal) > 0
                  ? (Number(invoice.tax_amount) / Number(invoice.subtotal)) * 100
                  : 0,
              tax_amount: Number(invoice.tax_amount),
              hsn_sac: null
            }
          ];

    const lines = linesFromInvoiceRows({ items: itemRows as any, intraState: intra });
    const txn = normalizeTransactionType(invoice.transaction_type);

    const payload = buildNicEInvoicePayload({
      seller,
      buyer,
      invoiceNumber: invoice.invoice_number,
      invoiceDateIso: String(invoice.invoice_date),
      transactionType: txn,
      items: lines,
      totals: {
        subtotal: Number(invoice.subtotal),
        taxAmount: Number(invoice.tax_amount),
        totalAmount: Number(invoice.total_amount)
      }
    });

    await invoice.update({
      irp_status: 'submitted',
      irp_submitted_at: new Date(),
      irp_last_error: null
    });

    try {
      const irp = await submitPayloadToIrp(payload);
      await invoice.update({
        gst_irn: irp.Irn,
        gst_ack_no: irp.AckNo,
        gst_ack_date: irp.AckDt,
        signed_qr_code: irp.SignedQRCode,
        irp_status: 'irn_generated',
        status: 'generated',
        gst_einvoice_payload: payload as any,
        irp_last_error: null
      });

      const refreshed = await (Invoice as any).findOne({
        where: { id: invoice.id },
        include: [
          {
            model: Customer,
            as: 'customer',
            attributes: ['id', 'name', 'email', 'phone', 'address', 'business_number']
          },
          { model: InvoiceItem, as: 'items' }
        ]
      });

      res.json({ success: true, data: refreshed });
    } catch (err: any) {
      const msg = err?.message || 'IRP 처리 실패';
      await invoice.update({ irp_status: 'failed', irp_last_error: msg });
      res.status(502).json({ success: false, message: msg });
    }
  } catch (error) {
    console.error('IRN 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// E-Invoice에서 E-Way Bill 생성
export const createEWayBillFromEInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id, id: user_id } = req.user;
    const userRole = req.user?.role;

    const whereClause: any = { id };
    
    // root나 audit 권한이면 모든 E-Invoice 조회 가능
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenant_id;
      whereClause.company_id = company_id;
    }

    // E-Invoice 조회
    const eInvoice = await (Invoice as any).findOne({
      where: whereClause,
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name', 'email', 'phone', 'address']
        },
        {
          model: InvoiceItem,
          as: 'items',
          attributes: ['id', 'item_name', 'description', 'quantity', 'unit_price', 'total_price', 'tax_rate', 'tax_amount']
        }
      ]
    });

    if (!eInvoice) {
      return res.status(404).json({ success: false, message: 'E-Invoice를 찾을 수 없습니다.' });
    }

    if (!eInvoice.gst_irn || eInvoice.irp_status !== 'irn_generated') {
      return res.status(400).json({
        success: false,
        message:
          'E-Way Bill을 생성하려면 먼저 NIC IRP에서 IRN을 발급받아야 합니다. (E-Invoice에서 IRN 생성)'
      });
    }

    // E-Way Bill 생성 로직은 별도 테이블이 필요하므로, 여기서는 기본 응답만 반환
    // 실제 구현 시 eway_bills 테이블에 데이터 저장 필요
    res.status(201).json({ 
      success: true, 
      message: 'E-Way Bill 생성 기능은 구현 중입니다.',
      data: {
        e_invoice_id: eInvoice.id,
        invoice_number: eInvoice.invoice_number
      }
    });
  } catch (error) {
    console.error('E-Invoice에서 E-Way Bill 생성 오류:', error);
    res.status(500).json({ success: false, message: '서버 오류가 발생했습니다.' });
  }
};

// 회계 통계 조회
export const getAccountingStats = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    const { tenant_id, company_id } = req.user;
    const userRole = req.user?.role;
    const { period, year, month, start_date, end_date, company_id: queryCompanyId } = req.query;

    const whereClause: any = {};
    const parsedQueryCompanyId = queryCompanyId ? parseInt(queryCompanyId as string, 10) : NaN;
    const hasQueryCompanyId = Number.isFinite(parsedQueryCompanyId) && parsedQueryCompanyId > 0;
    
    // root/audit는 회사 선택 가능, 그 외는 로그인 회사로 고정
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenant_id;
      whereClause.company_id = company_id;
    } else {
      if (tenant_id) whereClause.tenant_id = tenant_id;
      if (hasQueryCompanyId) {
        whereClause.company_id = parsedQueryCompanyId;
      } else if (company_id) {
        // 회사 파라미터가 없으면 로그인된 회사를 기본값으로 사용
        whereClause.company_id = company_id;
      }
      // root/audit 모두 company_id가 비어 있으면 전체 회사 조회
    }

    // 날짜 필터링
    const dateFilter: any = {};
    if (start_date && end_date) {
      dateFilter.invoice_date = {
        [Op.between]: [start_date, end_date]
      };
    } else if (period && year) {
      // period에 따른 날짜 범위 계산
      const yearNum = parseInt(year as string);
      const monthNum = month ? parseInt(month as string) : null;
      
      let startDate: Date;
      let endDate: Date;
      
      switch (period) {
        case 'day':
          if (monthNum) {
            startDate = new Date(yearNum, monthNum - 1, 1);
            endDate = new Date(yearNum, monthNum, 0);
          } else {
            startDate = new Date(yearNum, 0, 1);
            endDate = new Date(yearNum, 11, 31);
          }
          break;
        case 'week':
          // 주간은 현재 주로 설정 (간단히 월간으로 처리)
          if (monthNum) {
            startDate = new Date(yearNum, monthNum - 1, 1);
            endDate = new Date(yearNum, monthNum, 0);
          } else {
            startDate = new Date(yearNum, 0, 1);
            endDate = new Date(yearNum, 11, 31);
          }
          break;
        case 'month':
          if (monthNum) {
            startDate = new Date(yearNum, monthNum - 1, 1);
            endDate = new Date(yearNum, monthNum, 0);
          } else {
            startDate = new Date(yearNum, 0, 1);
            endDate = new Date(yearNum, 11, 31);
          }
          break;
        case 'quarter':
          // 분기별 처리
          if (monthNum) {
            const quarter = Math.floor((monthNum - 1) / 3);
            startDate = new Date(yearNum, quarter * 3, 1);
            endDate = new Date(yearNum, (quarter + 1) * 3, 0);
          } else {
            startDate = new Date(yearNum, 0, 1);
            endDate = new Date(yearNum, 11, 31);
          }
          break;
        case 'year':
          startDate = new Date(yearNum, 0, 1);
          endDate = new Date(yearNum, 11, 31);
          break;
        default:
          startDate = new Date(yearNum, 0, 1);
          endDate = new Date(yearNum, 11, 31);
      }
      
      dateFilter.invoice_date = {
        [Op.between]: [startDate.toISOString().split('T')[0], endDate.toISOString().split('T')[0]]
      };
    }

    const finalWhereClause = { ...whereClause, ...dateFilter };
    const invoiceWhereClause: any = {
      ...finalWhereClause,
      is_active: true,
      [Op.or]: [
        { invoice_category: 'regular' },
        { invoice_category: 'e_invoice' },
        { invoice_category: null }
      ]
    };

    // 전체 인보이스 통계
    const allInvoices = await (Invoice as any).findAll({
      where: invoiceWhereClause,
      attributes: [
        'id',
        'invoice_number',
        'invoice_date',
        'due_date',
        'subtotal',
        'tax_amount',
        'total_amount',
        'status',
        'payment_status',
        'invoice_category',
        'customer_id'
      ],
      include: [
        {
          model: Customer,
          as: 'customer',
          attributes: ['id', 'name'],
          required: false
        }
      ],
      order: [['invoice_date', 'DESC'], ['id', 'DESC']]
    });

    const roomBookingWhere: any = { ...whereClause, is_active: true };
    if ((dateFilter as any).invoice_date) {
      roomBookingWhere.check_in_date = (dateFilter as any).invoice_date;
    }
    const allRoomBookings = await (RoomBooking as any).findAll({
      where: roomBookingWhere,
      attributes: [
        'id',
        'booking_id',
        'guest_name',
        'room_number',
        'check_in_date',
        'total_amount',
        'payment_status',
        'status'
      ],
      order: [['check_in_date', 'DESC'], ['id', 'DESC']]
    });

    const expenseWhereClause: any = {
      ...whereClause,
      is_active: true
    };
    const expenseDateBetween = (dateFilter as any)?.invoice_date?.[Op.between];
    if (Array.isArray(expenseDateBetween) && expenseDateBetween.length === 2) {
      const [start, end] = expenseDateBetween;
      expenseWhereClause.created_at = {
        [Op.between]: [`${start} 00:00:00`, `${end} 23:59:59`]
      };
    }
    const allExpenses = await (ExpenseReport as any).findAll({
      where: expenseWhereClause,
      attributes: [
        'id',
        'expense_id',
        'title',
        'requester_name',
        'requester_department',
        'total_amount',
        'currency',
        'purpose',
        'status',
        'payment_request_status',
        'created_at'
      ],
      order: [['created_at', 'DESC']]
    });

    // 통계 계산 (매출: 발행/예약 기준, 수금: 결제완료 기준)
    const invoiceSales = allInvoices.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);
    const roomBookingSales = allRoomBookings.reduce((sum: number, booking: any) => sum + Number(booking.total_amount || 0), 0);
    // 총 매출은 인보이스 기준으로 계산 (화면 기대값과 일치)
    const totalRevenue = invoiceSales;
    const combinedRevenue = invoiceSales + roomBookingSales;
    const collectedRevenue = allInvoices
      .filter((inv: any) => inv.payment_status === 'paid' || inv.status === 'paid')
      .reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0)
      ;
    const outstandingRevenue = Math.max(totalRevenue - collectedRevenue, 0);

    const totalExpenses = allExpenses
      .filter((exp: any) => exp.status === 'paid' || exp.payment_request_status === 'paid')
      .reduce((sum: number, exp: any) => sum + Number(exp.total_amount || 0), 0);
    const netProfit = totalRevenue - totalExpenses;
    
    const totalInvoices = allInvoices.length;
    const paidInvoices = allInvoices.filter((inv: any) => inv.payment_status === 'paid' || inv.status === 'paid').length;
    const pendingInvoices = allInvoices.filter((inv: any) => inv.payment_status === 'pending').length;
    const overdueInvoices = allInvoices.filter((inv: any) => {
      if (inv.payment_status === 'pending' && inv.invoice_date) {
        const dueDate = new Date(inv.invoice_date);
        dueDate.setDate(dueDate.getDate() + 30); // 기본 30일 후
        return new Date() > dueDate;
      }
      return false;
    }).length;

    const profitMargin = totalRevenue > 0 ? ((netProfit / totalRevenue) * 100) : 0;
    const averageInvoiceAmount = totalInvoices > 0 ? (totalRevenue / totalInvoices) : 0;

    const trendByDay = new Map<string, number>();
    const trendByMonth = new Map<string, number>();
    const trendByQuarter = new Map<string, number>();
    const expenseByDay = new Map<string, number>();
    const expenseByMonth = new Map<string, number>();
    const expenseByQuarter = new Map<string, number>();

    const addTrendAmount = (
      rawDate: any,
      amount: number,
      dayMap: Map<string, number>,
      monthMap: Map<string, number>,
      quarterMap: Map<string, number>
    ) => {
      const d = new Date(rawDate);
      if (Number.isNaN(d.getTime())) return;
      const year = d.getFullYear();
      const month = d.getMonth() + 1;
      const day = d.getDate();
      const dayKey = `${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
      const monthKey = `${year}-${String(month).padStart(2, '0')}`;
      const quarter = Math.floor((month - 1) / 3) + 1;
      const quarterKey = `${year} Q${quarter}`;
      dayMap.set(dayKey, (dayMap.get(dayKey) || 0) + amount);
      monthMap.set(monthKey, (monthMap.get(monthKey) || 0) + amount);
      quarterMap.set(quarterKey, (quarterMap.get(quarterKey) || 0) + amount);
    };

    allInvoices.forEach((inv: any) => {
      addTrendAmount(inv.invoice_date, Number(inv.total_amount || 0), trendByDay, trendByMonth, trendByQuarter);
    });
    allRoomBookings.forEach((booking: any) => {
      addTrendAmount(booking.check_in_date, Number(booking.total_amount || 0), trendByDay, trendByMonth, trendByQuarter);
    });
    allExpenses.forEach((exp: any) => {
      if (!(exp.status === 'paid' || exp.payment_request_status === 'paid')) return;
      addTrendAmount(exp.created_at, Number(exp.total_amount || 0), expenseByDay, expenseByMonth, expenseByQuarter);
    });

    const toTrendRows = (
      revenueEntries: Array<[string, number]>,
      expenseEntries: Array<[string, number]>,
      keyName: 'day' | 'month' | 'quarter'
    ) => {
      const revenueMap = new Map<string, number>(revenueEntries);
      const expenseMap = new Map<string, number>(expenseEntries);
      const keys = Array.from(new Set<string>([...revenueMap.keys(), ...expenseMap.keys()])).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      return keys.map((key) => {
        const revenue = revenueMap.get(key) || 0;
        const expenses = expenseMap.get(key) || 0;
        return ({
          [keyName]: key,
          revenue,
          expenses,
          profit: revenue - expenses,
          budget: revenue
        });
      });
    };

    const dailyData = toTrendRows(Array.from(trendByDay.entries()), Array.from(expenseByDay.entries()), 'day');
    const monthlyRevenueData = toTrendRows(Array.from(trendByMonth.entries()), Array.from(expenseByMonth.entries()), 'month');
    const quarterlyData = toTrendRows(Array.from(trendByQuarter.entries()), Array.from(expenseByQuarter.entries()), 'quarter');

    const regularRevenue = allInvoices
      .filter((inv: any) => inv.invoice_category === 'regular' || inv.invoice_category === null)
      .reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);
    const eInvoiceRevenue = allInvoices
      .filter((inv: any) => inv.invoice_category === 'e_invoice')
      .reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0);
    const roomBookingAllRevenue = allRoomBookings
      .reduce((sum: number, booking: any) => sum + Number(booking.total_amount || 0), 0);

    const categoryRevenueRaw = [
      { name: '일반세금계산서', value: regularRevenue, color: '#42a5f5' },
      { name: '전자세금계산서', value: eInvoiceRevenue, color: '#7e57c2' },
      { name: '객실예약', value: roomBookingAllRevenue, color: '#26a69a' }
    ].filter((row) => row.value > 0);
    const categoryRevenueTotal = categoryRevenueRaw.reduce((sum, row) => sum + row.value, 0);
    const categoryRevenueData = categoryRevenueRaw.map((row) => ({
      ...row,
      percentage: categoryRevenueTotal > 0 ? Number(((row.value / categoryRevenueTotal) * 100).toFixed(1)) : 0
    }));

    const now = new Date();
    const overdueRows = allInvoices.filter((inv: any) => {
      const paid = inv.payment_status === 'paid' || inv.status === 'paid';
      if (paid) return false;
      const invoiceDate = new Date(inv.invoice_date);
      if (Number.isNaN(invoiceDate.getTime())) return false;
      invoiceDate.setDate(invoiceDate.getDate() + 30);
      return now > invoiceDate;
    });
    const paidRows = allInvoices.filter((inv: any) => inv.payment_status === 'paid' || inv.status === 'paid');
    const pendingRows = allInvoices.filter((inv: any) => !(inv.payment_status === 'paid' || inv.status === 'paid'));
    const invoiceStatusData = [
      {
        status: 'Paid',
        count: paidRows.length,
        amount: paidRows.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0),
        color: '#4caf50'
      },
      {
        status: 'Pending',
        count: pendingRows.length,
        amount: pendingRows.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0),
        color: '#ff9800'
      },
      {
        status: 'Overdue',
        count: overdueRows.length,
        amount: overdueRows.reduce((sum: number, inv: any) => sum + Number(inv.total_amount || 0), 0),
        color: '#f44336'
      }
    ];

    const categoryExpenseData = [
      {
        name: '지출결의서',
        value: totalExpenses,
        percentage: 100,
        color: '#ef5350'
      }
    ].filter((row) => row.value > 0);

    // 이전 기간과 비교 (간단히 0으로 설정, 실제로는 이전 기간 데이터 조회 필요)
    const revenueGrowth = 0;
    const expenseGrowth = 0;

    const mapInvoiceCategoryLabel = (category?: string | null) => {
      if (category === 'e_invoice') return '전자세금계산서';
      return '일반세금계산서';
    };

    const salesList = [
      ...allInvoices.map((inv: any) => ({
        id: inv.id,
        source: 'invoice',
        document_number: inv.invoice_number,
        date: inv.invoice_date,
        counterparty: inv.customer?.name || '-',
        category: mapInvoiceCategoryLabel(inv.invoice_category),
        amount: Number(inv.total_amount || 0),
        tax_amount: Number(inv.tax_amount || 0),
        status: inv.status,
        payment_status: inv.payment_status
      })),
      ...allRoomBookings.map((booking: any) => ({
        id: booking.id,
        source: 'room_booking',
        document_number: booking.booking_id,
        date: booking.check_in_date,
        counterparty: booking.guest_name || '-',
        category: '객실예약',
        amount: Number(booking.total_amount || 0),
        tax_amount: 0,
        status: booking.status,
        payment_status: booking.payment_status
      }))
    ].sort((a, b) => {
      const timeA = new Date(a.date).getTime();
      const timeB = new Date(b.date).getTime();
      if (Number.isNaN(timeA) && Number.isNaN(timeB)) return 0;
      if (Number.isNaN(timeA)) return 1;
      if (Number.isNaN(timeB)) return -1;
      return timeB - timeA;
    });

    const salesTotal = salesList.reduce((sum, row) => sum + row.amount, 0);

    const purchaseList = allExpenses.map((exp: any) => ({
      id: exp.id,
      document_number: exp.expense_id,
      date: exp.created_at,
      title: exp.title,
      requester: exp.requester_name,
      department: exp.requester_department || '-',
      purpose: exp.purpose,
      amount: Number(exp.total_amount || 0),
      currency: exp.currency || 'INR',
      status: exp.status,
      payment_status: exp.payment_request_status || '-'
    }));

    const purchaseTotal = purchaseList.reduce((sum, row) => sum + row.amount, 0);
    const purchasePaidTotal = purchaseList
      .filter((row) => row.status === 'paid' || row.payment_status === 'paid')
      .reduce((sum, row) => sum + row.amount, 0);

    res.json({
      success: true,
      data: {
        totalRevenue,
        combinedRevenue,
        roomBookingRevenue: roomBookingSales,
        collectedRevenue,
        outstandingRevenue,
        totalExpenses,
        netProfit,
        totalInvoices,
        paidInvoices,
        pendingInvoices,
        overdueInvoices,
        profitMargin,
        revenueGrowth,
        expenseGrowth,
        averageInvoiceAmount,
        monthlyRevenueData,
        categoryExpenseData,
        categoryRevenueData,
        invoiceStatusData,
        quarterlyData,
        dailyData,
        salesList,
        salesTotal,
        purchaseList,
        purchaseTotal,
        purchasePaidTotal
      }
    });
  } catch (error: any) {
    console.error('회계 통계 조회 오류:', error);
    res.status(500).json({ 
      success: false, 
      message: '서버 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

// 지출결의서 목록 조회
export const getExpenseReports = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { status = '', priority = '' } = req.query;
    const whereClause: any = { tenant_id, company_id, is_active: true };

    if (status) whereClause.status = status;
    if (priority) whereClause.priority = priority;

    const expenses = await (ExpenseReport as any).findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: expenses });
  } catch (error: any) {
    console.error('지출결의서 조회 오류:', error);
    res.status(500).json({ success: false, message: '지출결의서를 불러오는데 실패했습니다.' });
  }
};

// 지출결의서 상세 조회
export const getExpenseReportById = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }
    res.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('지출결의서 상세 조회 오류:', error);
    res.status(500).json({ success: false, message: '지출결의서 상세 조회에 실패했습니다.' });
  }
};

// 지출결의서 생성
export const createExpenseReport = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, id: requester_id } = req.user;
    const {
      expense_id,
      title,
      requester_name,
      requester_department,
      requester_position,
      total_amount = 0,
      currency = 'KRW',
      purpose,
      items = [],
      status = 'draft',
      priority = 'medium',
      current_approver_id,
      approval_flow = [],
      submitted_at,
      due_date,
      notes,
      attachments = []
    } = req.body;

    const safeTitle = typeof title === 'string' ? title : '';
    const safePurpose = typeof purpose === 'string' ? purpose : '';

    if (status !== 'draft' && (!safeTitle.trim() || !safePurpose.trim())) {
      return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' });
    }

    const generatedId = expense_id || `EXP-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const expense = await (ExpenseReport as any).create({
      tenant_id,
      company_id,
      expense_id: generatedId,
      title: safeTitle,
      requester_id,
      requester_name: requester_name || req.user.username,
      requester_department,
      requester_position,
      total_amount,
      currency,
      purpose: safePurpose,
      items,
      status,
      priority,
      current_approver_id,
      approval_flow,
      submitted_at,
      due_date,
      notes,
      attachments,
      is_active: true
    });

    if (status === 'submitted') {
      notifyExpenseReportSubmitted(req, expense);
    }

    res.status(201).json({ success: true, data: expense });
  } catch (error: any) {
    console.error('지출결의서 생성 오류:', error);
    res.status(500).json({ success: false, message: '지출결의서 생성에 실패했습니다.' });
  }
};

// 지출결의서 수정
export const updateExpenseReport = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }

    const prevStatus = expense.status;
    await expense.update({ ...req.body });
    await expense.reload();

    const nextStatus = expense.status;
    if (nextStatus === 'submitted' && prevStatus !== 'submitted') {
      notifyExpenseReportSubmitted(req, expense);
    }

    res.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('지출결의서 수정 오류:', error);
    res.status(500).json({ success: false, message: '지출결의서 수정에 실패했습니다.' });
  }
};

// 지출결의서 삭제
export const deleteExpenseReport = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }

    await expense.update({ is_active: false });
    res.json({ success: true });
  } catch (error: any) {
    console.error('지출결의서 삭제 오류:', error);
    res.status(500).json({ success: false, message: '지출결의서 삭제에 실패했습니다.' });
  }
};

// 지출결의서 상태 변경
export const updateExpenseReportStatus = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const { tenant_id, company_id } = req.user;
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });

    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }

    const prevStatus = expense.status;
    await expense.update({ status });
    await expense.reload();

    if (status === 'submitted' && prevStatus !== 'submitted') {
      notifyExpenseReportSubmitted(req, expense);
    }

    res.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('지출결의서 상태 변경 오류:', error);
    res.status(500).json({ success: false, message: '지출결의서 상태 변경에 실패했습니다.' });
  }
};

// 지출결의서 영수증 업로드용 토큰 발급 (휴대폰 QR 스캔 후 업로드용)
export const getReceiptUploadToken = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id, id: user_id } = req.user;
    const expense = await (ExpenseReport as any).findOne({
      where: { id: parseInt(id, 10), tenant_id, company_id, is_active: true }
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }
    if (expense.requester_id !== user_id) {
      return res.status(403).json({ success: false, message: '본인이 신청한 결의서만 영수증을 첨부할 수 있습니다.' });
    }
    const token = jwt.sign(
      { expenseId: expense.id, userId: user_id },
      env.JWT_SECRET,
      { expiresIn: '10m' }
    );
    res.json({ success: true, token });
  } catch (error: any) {
    console.error('영수증 업로드 토큰 발급 오류:', error);
    res.status(500).json({ success: false, message: '토큰 발급에 실패했습니다.' });
  }
};

// 토큰으로 영수증 업로드 (휴대폰에서 호출, 인증 없음)
export const uploadExpenseReceiptByToken = async (req: Request, res: Response) => {
  try {
    const token = (req.query.token as string) || (req.body && req.body.token);
    if (!token) {
      return res.status(400).json({ success: false, message: '토큰이 필요합니다.' });
    }
    const file = (req as any).file;
    if (!file || !file.filename) {
      return res.status(400).json({ success: false, message: '파일이 필요합니다.' });
    }
    let decoded: { expenseId: number; userId: number };
    try {
      decoded = jwt.verify(token, env.JWT_SECRET) as { expenseId: number; userId: number };
    } catch {
      return res.status(401).json({ success: false, message: '유효하지 않거나 만료된 토큰입니다.' });
    }
    const expense = await (ExpenseReport as any).findOne({
      where: { id: decoded.expenseId, is_active: true }
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }
    if (expense.requester_id !== decoded.userId) {
      return res.status(403).json({ success: false, message: '권한이 없습니다.' });
    }
    const relativePath = path.join('expense-receipts', file.filename).replace(/\\/g, '/');
    const attachments = Array.isArray(expense.attachments) ? [...expense.attachments] : [];
    attachments.push(relativePath);
    await expense.update({ attachments });
    res.json({ success: true, message: '영수증이 첨부되었습니다.', path: relativePath });
  } catch (error: any) {
    console.error('영수증 업로드 오류:', error);
    res.status(500).json({ success: false, message: '영수증 업로드에 실패했습니다.' });
  }
};

// 인증된 웹 업로드 (PC에서 첨부)
export const uploadExpenseReceiptById = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const files = ((req as any).files || []) as Array<{ filename?: string }>;
    if (!files.length) {
      return res.status(400).json({ success: false, message: '파일이 필요합니다.' });
    }
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }
    const attachments = Array.isArray(expense.attachments) ? [...expense.attachments] : [];
    const newPaths = files
      .filter((file) => file.filename)
      .map((file) => path.join('expense-receipts', file.filename as string).replace(/\\/g, '/'));
    attachments.push(...newPaths);
    await expense.update({ attachments });
    res.json({ success: true, message: '영수증이 첨부되었습니다.', paths: newPaths, data: expense });
  } catch (error: any) {
    console.error('영수증 업로드 오류(웹):', error);
    res.status(500).json({ success: false, message: '영수증 업로드에 실패했습니다.' });
  }
};

const parseExpenseItemsMeta = (itemsValue: any) => {
  if (!itemsValue) return {};
  if (typeof itemsValue === 'string') {
    try {
      const parsed = JSON.parse(itemsValue);
      return parsed?.meta || {};
    } catch {
      return {};
    }
  }
  if (typeof itemsValue === 'object') {
    return itemsValue.meta || {};
  }
  return {};
};

const notifyUser = (
  req: RequestWithUser,
  targetId: number | null | undefined,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  data?: any
) => {
  if (!targetId) return;
  pushNotification(
    {
      title,
      message,
      type,
      target_type: 'user',
      target_id: targetId,
      data,
      tenant_id: req.user.tenant_id,
      company_id: req.user.company_id,
      sender_user_id: req.user.id
    },
    (req as any).socketService
  );
};

const notifyExpenseReportSubmitted = (req: RequestWithUser, expense: any) => {
  const meta = parseExpenseItemsMeta(expense.items);
  const approverId =
    meta.approvedById != null
      ? Number(meta.approvedById)
      : expense.current_approver_id != null
        ? Number(expense.current_approver_id)
        : null;
  if (!approverId || approverId === req.user.id) return;

  const requesterName = expense.requester_name || req.user.username || '작성자';
  const titleShort = String(expense.title || expense.expense_id || '지출결의서').slice(0, 80);
  notifyUser(
    req,
    approverId,
    '지출결의서 제출',
    `${requesterName}님이 "${titleShort}" 지출결의서를 제출했습니다. 검토해 주세요.`,
    'info',
    {
      feature: 'expense_report',
      expense_id: expense.id,
      expense_no: expense.expense_id,
      href: '/accounting/expense'
    }
  );
};

const notifyPaymentOfficers = async (
  req: RequestWithUser,
  title: string,
  message: string,
  type: 'info' | 'success' | 'warning' | 'error' = 'info',
  data?: any
) => {
  const { tenant_id, company_id } = req.user;
  const officers = await (User as any).findAll({
    where: {
      tenant_id,
      company_id,
      is_payment_officer: true,
      status: 'active'
    },
    attributes: ['id']
  });
  for (const officer of officers) {
    notifyUser(req, officer.id, title, message, type, data);
  }
};

const canApproveExpense = (expense: any, user: any) => {
  if (!user) return false;
  if (user.role === 'admin' || user.role === 'root') return true;
  const meta = parseExpenseItemsMeta(expense.items);
  const approvedById = meta.approvedById ? Number(meta.approvedById) : null;
  return approvedById !== null && approvedById === user.id;
};

const buildBankTransferPayload = (expense: any) => {
  const meta = parseExpenseItemsMeta(expense.items);
  return {
    amount: Number(expense.total_amount || 0),
    currency: expense.currency || 'KRW',
    beneficiaryName: meta.acHolder || meta.accountHolder || '',
    beneficiaryAccount: meta.accountNumber || '',
    ifsc: meta.ifsc || '',
    bankName: meta.bank || '',
    reference: expense.expense_id,
    remarks: meta.remarks || ''
  };
};

// 결제 요청 (승인자에게 요청 생성)
export const requestExpensePayment = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id, id: user_id } = req.user;
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }
    if (expense.requester_id !== user_id) {
      return res.status(403).json({ success: false, message: '작성자만 결제 요청을 할 수 있습니다.' });
    }

    const approvalId = expense.approval_id;
    let approvalRecord = null;
    if (approvalId) {
      approvalRecord = await (Approval as any).findByPk(approvalId);
    } else {
      approvalRecord = await (Approval as any).create({
        tenant_id,
        company_id,
        document_id: expense.expense_id,
        title: expense.title || '지출결의서',
        type: 'expense',
        category: 'payment',
        amount: expense.total_amount || 0,
        requester_id: user_id,
        description: expense.purpose || '',
        attachments: expense.attachments || [],
        status: 'submitted',
        priority: expense.priority || 'medium',
        approval_flow: expense.approval_flow || [],
        due_date: expense.due_date || null,
        is_active: true
      });
    }

    await expense.update({
      approval_id: approvalRecord?.id || approvalId,
      payment_request_status: 'requested',
      payment_requested_at: new Date(),
      payment_requested_by: user_id,
      payment_approved_reason: null,
      payment_approved_at: null,
      payment_approved_by: null,
      payment_rejected_reason: null,
      payment_rejected_at: null,
      payment_rejected_by: null,
      status: 'in_review'
    });

    const meta = parseExpenseItemsMeta(expense.items);
    const approverId = meta.approvedById ? Number(meta.approvedById) : null;
    notifyUser(
      req,
      approverId,
      '결제 요청',
      `${expense.requester_name || '작성자'}님이 결제 요청을 보냈습니다.`,
      'info',
      {
        feature: 'expense_report',
        expense_id: expense.id,
        expense_no: expense.expense_id,
        href: '/accounting/expense'
      }
    );

    res.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('결제 요청 오류:', error);
    res.status(500).json({ success: false, message: '결제 요청에 실패했습니다.' });
  }
};

// 결제 요청 반려
export const rejectExpensePayment = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const { reason } = req.body || {};
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }
    if (!canApproveExpense(expense, req.user)) {
      return res.status(403).json({ success: false, message: '반려 권한이 없습니다.' });
    }
    await expense.update({
      payment_request_status: 'rejected',
      payment_rejected_reason: reason || null,
      payment_rejected_at: new Date(),
      payment_rejected_by: req.user.id,
      status: 'rejected'
    });

    notifyUser(
      req,
      expense.requester_id,
      '결제 요청 반려',
      reason ? `결제 요청이 반려되었습니다. 사유: ${reason}` : '결제 요청이 반려되었습니다.',
      'warning',
      { expenseId: expense.id, expenseNo: expense.expense_id }
    );
    res.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('결제 반려 오류:', error);
    res.status(500).json({ success: false, message: '결제 반려에 실패했습니다.' });
  }
};

// 최종 승인
export const approveExpensePayment = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const { reason } = req.body || {};
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }
    if (!canApproveExpense(expense, req.user)) {
      return res.status(403).json({ success: false, message: '승인 권한이 없습니다.' });
    }
    if (expense.payment_request_status !== 'requested') {
      return res.status(400).json({ success: false, message: '결제 요청 상태가 아닙니다.' });
    }
    await expense.update({
      payment_request_status: 'approved',
      payment_approved_reason: reason || null,
      payment_approved_at: new Date(),
      payment_approved_by: req.user.id,
      payment_rejected_reason: null,
      payment_rejected_at: null,
      payment_rejected_by: null,
      status: 'approved'
    });

    notifyUser(
      req,
      expense.requester_id,
      '결제 요청 승인',
      reason ? `결제 요청이 승인되었습니다. 사유: ${reason}` : '결제 요청이 승인되었습니다.',
      'success',
      { expenseId: expense.id, expenseNo: expense.expense_id }
    );
    await notifyPaymentOfficers(
      req,
      '송금 대기',
      `${expense.requester_name || '작성자'}님의 결제 요청이 승인되었습니다. 송금이 필요합니다.`,
      'info',
      { expenseId: expense.id, expenseNo: expense.expense_id }
    );
    res.json({ success: true, data: expense });
  } catch (error: any) {
    console.error('결제 승인 오류:', error);
    res.status(500).json({ success: false, message: '결제 승인에 실패했습니다.' });
  }
};

// 결제 완료 처리 + 은행 송금 실행
export const completeExpensePayment = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id, id: user_id } = req.user;
    const { provider } = req.body || {};
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }
    if (expense.payment_request_status !== 'approved') {
      return res.status(400).json({ success: false, message: '최종 승인 후 결제를 실행할 수 있습니다.' });
    }
    if (!(req.user.role === 'admin' || req.user.role === 'root' || req.user.is_payment_officer)) {
      return res.status(403).json({ success: false, message: '송금 권한이 없습니다.' });
    }

    const transferLogs = Array.isArray(expense.bank_transfer_logs) ? [...expense.bank_transfer_logs] : [];

    await expense.update({
      payment_request_status: 'paid',
      payment_completed_at: new Date(),
      payment_completed_by: user_id,
      status: 'paid'
    });

    const transferProvider = provider || env.DEFAULT_BANK_PROVIDER;
    if (!transferProvider) {
      transferLogs.unshift({
        timestamp: new Date().toISOString(),
        action: 'complete',
        status: 'skipped',
        provider: null,
        payload: null,
        response: null,
        error: '은행 송금 제공자가 설정되지 않았습니다.'
      });
      await expense.update({ bank_transfer_logs: transferLogs });
      notifyUser(
        req,
        expense.requester_id,
        '결제 완료 처리됨',
        '결제는 완료 처리되었으나 은행 송금 제공자가 설정되지 않았습니다.',
        'warning',
        { expenseId: expense.id, expenseNo: expense.expense_id }
      );
      return res.json({ success: true, data: expense, message: '결제 완료 처리됨. 은행 송금 제공자가 설정되지 않았습니다.' });
    }

    const payload = buildBankTransferPayload(expense);
    try {
      const result = await transferToBank(transferProvider, payload);
      transferLogs.unshift({
        timestamp: new Date().toISOString(),
        action: 'complete',
        status: 'success',
        provider: transferProvider,
        payload,
        response: result,
        error: null
      });
      await expense.update({
        bank_transfer_provider: transferProvider,
        bank_transfer_status: 'success',
        bank_transfer_reference: result?.reference || result?.transactionId || null,
        bank_transfer_payload: result,
        bank_transfer_logs: transferLogs,
        bank_transfer_error: null
      });
      notifyUser(
        req,
        expense.requester_id,
        '송금 완료',
        '은행 송금이 완료되었습니다.',
        'success',
        { expenseId: expense.id, expenseNo: expense.expense_id }
      );
      return res.json({ success: true, data: expense, transfer: result });
    } catch (transferError: any) {
      transferLogs.unshift({
        timestamp: new Date().toISOString(),
        action: 'complete',
        status: 'failed',
        provider: transferProvider,
        payload,
        response: null,
        error: transferError?.message || '송금 실패'
      });
      await expense.update({
        bank_transfer_provider: transferProvider,
        bank_transfer_status: 'failed',
        bank_transfer_error: transferError?.message || '송금 실패',
        bank_transfer_payload: payload,
        bank_transfer_logs: transferLogs
      });
      notifyUser(
        req,
        expense.requester_id,
        '송금 실패',
        transferError?.message ? `은행 송금에 실패했습니다. 사유: ${transferError.message}` : '은행 송금에 실패했습니다.',
        'error',
        { expenseId: expense.id, expenseNo: expense.expense_id }
      );
      await notifyPaymentOfficers(
        req,
        '송금 실패',
        `지출결의서 송금에 실패했습니다. 재시도가 필요합니다.`,
        'error',
        { expenseId: expense.id, expenseNo: expense.expense_id }
      );
      return res.status(502).json({ success: false, message: '은행 송금에 실패했습니다.', error: transferError?.message });
    }
  } catch (error: any) {
    console.error('결제 완료 처리 오류:', error);
    res.status(500).json({ success: false, message: '결제 완료 처리에 실패했습니다.' });
  }
};

// 은행 송금 재시도
export const retryExpenseTransfer = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const { provider } = req.body || {};
    const expense = await (ExpenseReport as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });
    if (!expense) {
      return res.status(404).json({ success: false, message: '지출결의서를 찾을 수 없습니다.' });
    }
    if (!(req.user.role === 'admin' || req.user.role === 'root' || req.user.is_payment_officer)) {
      return res.status(403).json({ success: false, message: '송금 권한이 없습니다.' });
    }
    const transferProvider = provider || expense.bank_transfer_provider || env.DEFAULT_BANK_PROVIDER;
    if (!transferProvider) {
      return res.status(400).json({ success: false, message: '은행 송금 제공자가 필요합니다.' });
    }
    const transferLogs = Array.isArray(expense.bank_transfer_logs) ? [...expense.bank_transfer_logs] : [];
    const payload = buildBankTransferPayload(expense);
    const result = await transferToBank(transferProvider, payload);
    transferLogs.unshift({
      timestamp: new Date().toISOString(),
      action: 'retry',
      status: 'success',
      provider: transferProvider,
      payload,
      response: result,
      error: null
    });
    await expense.update({
      bank_transfer_provider: transferProvider,
      bank_transfer_status: 'success',
      bank_transfer_reference: result?.reference || result?.transactionId || null,
      bank_transfer_payload: result,
      bank_transfer_error: null,
      bank_transfer_logs: transferLogs
    });
    notifyUser(
      req,
      expense.requester_id,
      '송금 재시도 성공',
      '은행 송금 재시도가 성공했습니다.',
      'success',
      { expenseId: expense.id, expenseNo: expense.expense_id }
    );
    res.json({ success: true, data: expense, transfer: result });
  } catch (error: any) {
    const transferErrorMessage = error?.message || '송금 재시도 실패';
    try {
      const { id } = req.params;
      const { tenant_id, company_id } = req.user;
      const expense = await (ExpenseReport as any).findOne({
        where: { id, tenant_id, company_id, is_active: true }
      });
      if (expense) {
        const transferLogs = Array.isArray(expense.bank_transfer_logs) ? [...expense.bank_transfer_logs] : [];
        transferLogs.unshift({
          timestamp: new Date().toISOString(),
          action: 'retry',
          status: 'failed',
          provider: req.body?.provider || expense.bank_transfer_provider || env.DEFAULT_BANK_PROVIDER || null,
          payload: buildBankTransferPayload(expense),
          response: null,
          error: transferErrorMessage
        });
        await expense.update({
          bank_transfer_status: 'failed',
          bank_transfer_error: transferErrorMessage,
          bank_transfer_logs: transferLogs
        });
      }
    } catch (logError) {
      console.error('송금 재시도 로그 기록 오류:', logError);
    }
    console.error('은행 송금 재시도 오류:', error);
    await notifyPaymentOfficers(
      req,
      '송금 재시도 실패',
      '은행 송금 재시도에 실패했습니다.',
      'error',
      { expenseId: Number(req.params.id) }
    );
    res.status(502).json({ success: false, message: '은행 송금 재시도에 실패했습니다.', error: transferErrorMessage });
  }
};

// 예산 목록 조회
export const getBudgets = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, role } = req.user;
    const { status = '', type = '', company_id: queryCompanyId } = req.query;
    const whereClause: any = { tenant_id, is_active: true };

    const parsedCompanyId = queryCompanyId ? parseInt(String(queryCompanyId), 10) : NaN;
    const canSelectCompany = role === 'root' || role === 'audit';
    if (canSelectCompany && Number.isFinite(parsedCompanyId) && parsedCompanyId > 0) {
      whereClause.company_id = parsedCompanyId;
    } else if (!canSelectCompany) {
      whereClause.company_id = company_id;
    } else if (company_id) {
      // root/audit 기본값은 로그인 회사
      whereClause.company_id = company_id;
    }

    if (status) whereClause.status = status;
    if (type) whereClause.type = type;

    const budgets = await (Budget as any).findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: budgets });
  } catch (error: any) {
    console.error('예산 조회 오류:', error);
    res.status(500).json({ success: false, message: '예산을 불러오는데 실패했습니다.' });
  }
};

// 예산 생성
export const createBudget = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, role } = req.user;
    const {
      budget_id,
      name,
      type,
      period,
      start_date,
      end_date,
      total_planned = 0,
      total_actual = 0,
      total_variance = 0,
      variance_percentage = 0,
      status = 'draft',
      items = [],
      created_by,
      notes
    } = req.body;

    if (!name || !type || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' });
    }

    const generatedId = budget_id || `BUD-${new Date().getFullYear()}-${String(Date.now()).slice(-6)}`;

    const requestedCompanyId = req.body?.company_id ? Number(req.body.company_id) : null;
    const targetCompanyId =
      (role === 'root' || role === 'audit') && requestedCompanyId && Number.isFinite(requestedCompanyId)
        ? requestedCompanyId
        : company_id;

    const budget = await (Budget as any).create({
      tenant_id,
      company_id: targetCompanyId,
      budget_id: generatedId,
      name,
      type,
      period,
      start_date,
      end_date,
      total_planned,
      total_actual,
      total_variance,
      variance_percentage,
      status,
      items,
      created_by,
      notes,
      is_active: true
    });

    res.status(201).json({ success: true, data: budget });
  } catch (error: any) {
    console.error('예산 생성 오류:', error);
    res.status(500).json({ success: false, message: '예산 생성에 실패했습니다.' });
  }
};

// 예산 수정
export const updateBudget = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id, role } = req.user;
    const whereClause: any = { id, tenant_id, is_active: true };
    if (role !== 'root' && role !== 'audit') {
      whereClause.company_id = company_id;
    }
    const budget = await (Budget as any).findOne({ where: whereClause });

    if (!budget) {
      return res.status(404).json({ success: false, message: '예산을 찾을 수 없습니다.' });
    }

    await budget.update({ ...req.body });
    res.json({ success: true, data: budget });
  } catch (error: any) {
    console.error('예산 수정 오류:', error);
    res.status(500).json({ success: false, message: '예산 수정에 실패했습니다.' });
  }
};

// 예산 삭제
export const deleteBudget = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id, role } = req.user;
    const whereClause: any = { id, tenant_id, is_active: true };
    if (role !== 'root' && role !== 'audit') {
      whereClause.company_id = company_id;
    }
    const budget = await (Budget as any).findOne({ where: whereClause });

    if (!budget) {
      return res.status(404).json({ success: false, message: '예산을 찾을 수 없습니다.' });
    }

    await budget.update({ is_active: false });
    res.json({ success: true });
  } catch (error: any) {
    console.error('예산 삭제 오류:', error);
    res.status(500).json({ success: false, message: '예산 삭제에 실패했습니다.' });
  }
};

// 자산 목록 조회
export const getAssets = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { status = '', category = '' } = req.query;
    const whereClause: any = { tenant_id, company_id, is_active: true };
    if (status) whereClause.status = status;
    if (category) whereClause.category = category;

    const assets = await (Asset as any).findAll({
      where: whereClause,
      order: [['created_at', 'DESC']]
    });

    res.json({ success: true, data: assets });
  } catch (error: any) {
    console.error('자산 조회 오류:', error);
    res.status(500).json({ success: false, message: '자산을 불러오는데 실패했습니다.' });
  }
};

// 자산 생성
export const createAsset = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;
    const { asset_code, name, category } = req.body;

    if (!asset_code || !name || !category) {
      return res.status(400).json({ success: false, message: '필수 항목이 누락되었습니다.' });
    }

    const asset = await (Asset as any).create({
      tenant_id,
      company_id,
      ...req.body,
      is_active: true
    });

    res.status(201).json({ success: true, data: asset });
  } catch (error: any) {
    console.error('자산 생성 오류:', error);
    res.status(500).json({ success: false, message: '자산 생성에 실패했습니다.' });
  }
};

// 자산 수정
export const updateAsset = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const asset = await (Asset as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: '자산을 찾을 수 없습니다.' });
    }

    await asset.update({ ...req.body });
    res.json({ success: true, data: asset });
  } catch (error: any) {
    console.error('자산 수정 오류:', error);
    res.status(500).json({ success: false, message: '자산 수정에 실패했습니다.' });
  }
};

// 자산 삭제
export const deleteAsset = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenant_id, company_id } = req.user;
    const asset = await (Asset as any).findOne({
      where: { id, tenant_id, company_id, is_active: true }
    });

    if (!asset) {
      return res.status(404).json({ success: false, message: '자산을 찾을 수 없습니다.' });
    }

    await asset.update({ is_active: false });
    res.json({ success: true });
  } catch (error: any) {
    console.error('자산 삭제 오류:', error);
    res.status(500).json({ success: false, message: '자산 삭제에 실패했습니다.' });
  }
};

/** 일반·전자 세금계산서 공통: 내부 승인 */
export const approveInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const whereClause: any = { id, is_active: true };
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const invoice = await (Invoice as any).findOne({ where: whereClause });
    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }
    if (invoice.approval_status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: '승인 대기 상태의 인보이스만 승인할 수 있습니다.' });
    }
    const isApprover = Number(invoice.approver_user_id) === Number(userId);
    const isAdmin = userRole === 'root' || userRole === 'admin';
    if (!isApprover && !isAdmin) {
      return res.status(403).json({ success: false, message: '지정된 승인자만 승인할 수 있습니다.' });
    }

    await invoice.update({
      approval_status: 'approved',
      approved_at: new Date()
    });

    const fresh = await (Invoice as any).findByPk(invoice.id, {
      include: [
        { model: Customer, as: 'customer', required: false },
        { model: User, as: 'approver', attributes: ['id', 'username', 'email'], required: false },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'], required: false }
      ]
    });
    res.json({ success: true, data: fresh });
  } catch (error: any) {
    console.error('인보이스 승인 오류:', error);
    res.status(500).json({ success: false, message: '인보이스 승인 중 오류가 발생했습니다.' });
  }
};

export const rejectInvoice = async (req: RequestWithUser, res: Response) => {
  try {
    await ensureInvoiceColumns();
    const { id } = req.params;
    const tenantId = req.user?.tenant_id;
    const companyId = req.user?.company_id;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const whereClause: any = { id, is_active: true };
    if (userRole !== 'root' && userRole !== 'audit') {
      whereClause.tenant_id = tenantId;
      whereClause.company_id = companyId;
    }

    const invoice = await (Invoice as any).findOne({ where: whereClause });
    if (!invoice) {
      return res.status(404).json({ success: false, message: '인보이스를 찾을 수 없습니다.' });
    }
    if (invoice.approval_status !== 'pending_approval') {
      return res.status(400).json({ success: false, message: '승인 대기 상태의 인보이스만 반려할 수 있습니다.' });
    }
    const isApprover = Number(invoice.approver_user_id) === Number(userId);
    const isAdmin = userRole === 'root' || userRole === 'admin';
    if (!isApprover && !isAdmin) {
      return res.status(403).json({ success: false, message: '지정된 승인자만 반려할 수 있습니다.' });
    }

    await invoice.update({
      approval_status: 'rejected',
      approved_at: null
    });

    const fresh = await (Invoice as any).findByPk(invoice.id, {
      include: [
        { model: Customer, as: 'customer', required: false },
        { model: User, as: 'approver', attributes: ['id', 'username', 'email'], required: false },
        { model: User, as: 'creator', attributes: ['id', 'username', 'email'], required: false }
      ]
    });
    res.json({ success: true, data: fresh });
  } catch (error: any) {
    console.error('인보이스 반려 오류:', error);
    res.status(500).json({ success: false, message: '인보이스 반려 중 오류가 발생했습니다.' });
  }
};

export const getAccountingBasicInfo = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id } = req.user;

    const company = await Company.findOne({
      where: {
        id: company_id,
        tenant_id
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    const settings: any = company.settings || {};
    const basicInfo = settings.accountingBasicInfo || {
      accountCategories: [],
      expenseCategories: [],
      taxCodes: [],
      paymentMethods: []
    };

    res.json({
      success: true,
      data: basicInfo
    });
  } catch (error: any) {
    console.error('회계 기본정보 조회 오류:', error);
    res.status(500).json({
      success: false,
      message: '회계 기본정보 조회 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};

export const updateAccountingBasicInfo = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenant_id, company_id, role } = req.user;

    if (role !== 'admin' && role !== 'root') {
      return res.status(403).json({
        success: false,
        message: '권한이 없습니다.'
      });
    }

    const company = await Company.findOne({
      where: {
        id: company_id,
        tenant_id
      }
    });

    if (!company) {
      return res.status(404).json({
        success: false,
        message: '회사를 찾을 수 없습니다.'
      });
    }

    const currentSettings: any = company.settings || {};
    const {
      accountCategories = [],
      expenseCategories = [],
      taxCodes = [],
      paymentMethods = []
    } = req.body || {};

    const updatedSettings = {
      ...currentSettings,
      accountingBasicInfo: {
        accountCategories,
        expenseCategories,
        taxCodes,
        paymentMethods
      }
    };

    await company.update({
      settings: updatedSettings
    });

    res.json({
      success: true,
      message: '회계 기본정보가 저장되었습니다.',
      data: updatedSettings.accountingBasicInfo
    });
  } catch (error: any) {
    console.error('회계 기본정보 저장 오류:', error);
    res.status(500).json({
      success: false,
      message: '회계 기본정보 저장 중 오류가 발생했습니다.',
      error: process.env.NODE_ENV === 'development' ? error.message : undefined
    });
  }
};
