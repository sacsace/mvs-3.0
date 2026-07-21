import { Response } from 'express';
import path from 'path';
import fs from 'fs';
import crypto from 'crypto';
import { RequestWithUser } from '../types';
import { ensureUploadSubdir } from '../utils/uploadPath';
import {
  Company,
  EmploymentContract,
  EmploymentContractAuditLog,
  EmploymentContractSignature,
  EmploymentContractTemplate,
  User
} from '../models';

const HR_CONTRACT_MANAGER_ROLES = new Set(['root', 'admin']);
const IMMUTABLE_SIGN_STATUSES = new Set(['awaiting_company_sign', 'awaiting_employee_sign', 'signed']);
const CONTRACT_STATUS_FLOW: Record<string, string[]> = {
  draft: ['draft', 'in_review', 'terminated'],
  in_review: ['in_review', 'awaiting_company_sign', 'terminated'],
  awaiting_company_sign: ['awaiting_company_sign', 'awaiting_employee_sign', 'terminated'],
  awaiting_employee_sign: ['awaiting_employee_sign', 'signed', 'terminated'],
  signed: ['signed', 'active', 'terminated'],
  active: ['active', 'expired', 'terminated'],
  expired: ['expired'],
  terminated: ['terminated']
};

const normalizeStatus = (status?: unknown): string => String(status || '').trim().toLowerCase();

const canManageEmploymentContracts = (req: RequestWithUser): boolean =>
  HR_CONTRACT_MANAGER_ROLES.has(String(req.user?.role || '').toLowerCase());

const sanitizeAuditValue = (value: any): any => {
  if (value === undefined) return undefined;
  if (value === null) return null;
  if (Array.isArray(value)) return value.map(sanitizeAuditValue);
  if (typeof value === 'object') {
    const clone: Record<string, any> = {};
    Object.entries(value).forEach(([key, nestedValue]) => {
      if (['signature_data', 'aadhaar_last4', 'hash_sha256'].includes(key)) {
        clone[key] = '[masked]';
      } else {
        clone[key] = sanitizeAuditValue(nestedValue);
      }
    });
    return clone;
  }
  if (typeof value === 'string' && value.length > 1000) {
    return `${value.slice(0, 1000)}...(truncated)`;
  }
  return value;
};

const buildContractAuditSnapshot = (contractLike: any) => {
  if (!contractLike) return null;
  const source = typeof contractLike.toJSON === 'function' ? contractLike.toJSON() : contractLike;
  return sanitizeAuditValue({
    id: source.id,
    tenant_id: source.tenant_id,
    company_id: source.company_id,
    employee_id: source.employee_id,
    template_id: source.template_id,
    title: source.title,
    contract_type: source.contract_type,
    status: source.status,
    start_date: source.start_date,
    end_date: source.end_date,
    salary: source.salary,
    bonus_type: source.bonus_type,
    bonus_value: source.bonus_value,
    work_location: source.work_location,
    working_days: source.working_days,
    working_hours: source.working_hours,
    probation_months: source.probation_months,
    pdf_url: source.pdf_url,
    company_signed_at: source.company_signed_at,
    employee_signed_at: source.employee_signed_at
  });
};

const extractChangedFields = (beforeValue: Record<string, any> | null, afterValue: Record<string, any> | null): string[] => {
  if (!beforeValue || !afterValue) return [];
  const keys = new Set([...Object.keys(beforeValue), ...Object.keys(afterValue)]);
  return Array.from(keys).filter((key) => JSON.stringify(beforeValue[key]) !== JSON.stringify(afterValue[key]));
};

const assertManagerPermission = (req: RequestWithUser, res: Response, actionLabel: string): boolean => {
  if (canManageEmploymentContracts(req)) return true;
  res.status(403).json({ success: false, message: `${actionLabel} 권한이 없습니다.` });
  return false;
};

const assertRootPermission = (req: RequestWithUser, res: Response, actionLabel: string): boolean => {
  if (String(req.user?.role || '').toLowerCase() === 'root') return true;
  res.status(403).json({ success: false, message: `${actionLabel} 권한이 없습니다.` });
  return false;
};

const renderTemplate = (templateHtml: string, variables: Record<string, string | number | null | undefined>) =>
  templateHtml.replace(/\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g, (_matched, key) => {
    const value = variables[key];
    if (value === undefined || value === null) return '';
    return String(value);
  });

const buildTemplateVariables = (contract: any) => ({
  contract_id: contract.id ?? '',
  title: contract.title ?? '',
  contract_type: contract.contract_type ?? '',
  start_date: contract.start_date ?? '',
  end_date: contract.end_date ?? '',
  salary: contract.salary ?? '',
  annual_ctc: contract.salary ?? '',
  monthly_gross_salary: contract.salary ? Number(contract.salary) / 12 : '',
  net_pay: contract.salary ? Math.round((Number(contract.salary) / 12) * 0.9) : '',
  bonus_type: contract.bonus_type ?? '',
  bonus_value: contract.bonus_value ?? '',
  work_location: contract.work_location ?? '',
  working_days: contract.working_days ?? '',
  working_hours: contract.working_hours ?? '',
  probation_months: contract.probation_months ?? '',
  issue_date: new Date().toISOString().slice(0, 10),
  employee_name: contract.employee?.username ?? '',
  employee_address: '',
  company_name: contract.company?.name ?? '',
  company_signer_name: '',
  company_signer_title: ''
});

const stripHtmlToText = (html: string): string =>
  String(html || '')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<\/li>/gi, '\n')
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/\s+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .replace(/[ \t]{2,}/g, ' ')
    .trim();

const createEmploymentContractPdf = async (
  contract: any,
  signerType: 'company' | 'employee',
  signerId: number
): Promise<{ pdfUrl: string; hashSha256: string }> => {
  const targetDir = ensureUploadSubdir('contracts', 'employment');
  await fs.promises.mkdir(targetDir, { recursive: true });

  const fileName = `employment-contract-${contract.id}-${Date.now()}.pdf`;
  const filePath = path.join(targetDir, fileName);

  // pdfkit is used dynamically to avoid type friction in this codebase.
  // eslint-disable-next-line @typescript-eslint/no-var-requires
  const PDFDocument = require('pdfkit');
  const doc = new PDFDocument({ margin: 40, size: 'A4' });
  const stream = fs.createWriteStream(filePath);
  doc.pipe(stream);

  doc.fontSize(18).text('Employment Contract - Signed Copy', { align: 'center' });
  doc.moveDown();
  doc.fontSize(12).text(`Contract ID: ${contract.id}`);
  doc.text(`Title: ${contract.title || '-'}`);
  doc.text(`Employee ID: ${contract.employee_id || '-'}`);
  doc.text(`Status: ${contract.status || '-'}`);
  doc.text(`Period: ${contract.start_date || '-'} ~ ${contract.end_date || '-'}`);
  doc.text(`Salary: ${contract.salary ?? '-'}`);
  doc.text(`Bonus: ${contract.bonus_type || '-'} ${contract.bonus_value ?? ''}`.trim());
  doc.text(`Working Days: ${contract.working_days || '-'}`);
  doc.text(`Working Hours: ${contract.working_hours || '-'}`);
  doc.text(`Work Location: ${contract.work_location || '-'}`);
  doc.moveDown();
  doc.text(`Company Signed At: ${contract.company_signed_at || '-'}`);
  doc.text(`Employee Signed At: ${contract.employee_signed_at || '-'}`);
  doc.moveDown();
  const bodyText = stripHtmlToText(contract.rendered_content_html || '');
  if (bodyText) {
    doc.fontSize(11).text('Contract Body', { underline: true });
    doc.moveDown(0.5);
    doc.fontSize(10).text(bodyText, { align: 'left' });
    doc.moveDown();
  }
  doc.fontSize(10).text(`Finalized By: ${signerType} (${signerId})`);
  doc.text(`Generated At: ${new Date().toISOString()}`);

  doc.end();
  await new Promise<void>((resolve, reject) => {
    stream.on('finish', () => resolve());
    stream.on('error', reject);
  });

  const pdfBuffer = await fs.promises.readFile(filePath);
  const hashSha256 = crypto.createHash('sha256').update(pdfBuffer).digest('hex');
  const pdfUrl = `/uploads/contracts/employment/${fileName}`;
  return { pdfUrl, hashSha256 };
};

const toIntOrNull = (value: unknown): number | null => {
  if (value === undefined || value === null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  return Math.trunc(parsed);
};

const writeAuditLog = async (
  req: RequestWithUser,
  action: string,
  params: { contractId?: number | null; companyId?: number | null; details?: Record<string, any> } = {}
) => {
  try {
    const tenantId = req.user?.tenant_id || 0;
    if (!tenantId) return;
    await (EmploymentContractAuditLog as any).create({
      contract_id: params.contractId ?? null,
      tenant_id: tenantId,
      company_id: params.companyId ?? req.user?.company_id ?? null,
      actor_id: req.user?.id ?? null,
      actor_role: req.user?.role ?? null,
      action,
      details: params.details ? sanitizeAuditValue(params.details) : null
    });
  } catch (error) {
    console.error('전자근로계약 감사로그 기록 오류:', error);
  }
};

const getScopedCompany = async (req: RequestWithUser, requestedCompanyId?: number | null) => {
  if (req.user.role !== 'root') {
    return {
      tenant_id: req.user.tenant_id,
      company_id: req.user.company_id
    };
  }

  if (!requestedCompanyId) return { tenant_id: null, company_id: null };
  const company = await (Company as any).findByPk(requestedCompanyId, {
    attributes: ['id', 'tenant_id']
  });
  if (!company) return null;
  return { tenant_id: company.tenant_id, company_id: company.id };
};

const requireValidEmployee = async (employeeId: number, companyId?: number | null) => {
  const whereClause: any = { id: employeeId, status: 'active' };
  if (companyId) whereClause.company_id = companyId;
  return (User as any).findOne({ where: whereClause, attributes: ['id', 'tenant_id', 'company_id'] });
};

export const getEmploymentContractTemplates = async (req: RequestWithUser, res: Response) => {
  try {
    const requestedCompanyId = toIntOrNull(req.query.company_id);
    const whereClause: any = { is_active: true };

    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    } else if (requestedCompanyId) {
      const scope = await getScopedCompany(req, requestedCompanyId);
      if (!scope) {
        return res.status(404).json({ success: false, message: '회사를 찾을 수 없습니다.' });
      }
      whereClause.company_id = scope.company_id;
      whereClause.tenant_id = scope.tenant_id;
    }

    const rows = await (EmploymentContractTemplate as any).findAll({
      where: whereClause,
      order: [['updated_at', 'DESC']]
    });

    await writeAuditLog(req, 'template_list_view', {
      details: { requestedCompanyId: requestedCompanyId || null, count: rows.length }
    });

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('전자근로계약 템플릿 조회 오류:', error);
    return res.status(500).json({ success: false, message: '템플릿 조회 중 오류가 발생했습니다.' });
  }
};

export const createEmploymentContractTemplate = async (req: RequestWithUser, res: Response) => {
  try {
    if (!assertManagerPermission(req, res, '템플릿 생성')) return;

    const { name, contract_type = 'regular', content_html, language = 'ko' } = req.body || {};
    if (!name || !String(name).trim() || !content_html || !String(content_html).trim()) {
      return res.status(400).json({ success: false, message: '템플릿명과 본문은 필수입니다.' });
    }

    const requestedCompanyId = toIntOrNull(req.body?.company_id);
    const scope = await getScopedCompany(req, requestedCompanyId);
    if (!scope) {
      return res.status(404).json({ success: false, message: '회사를 찾을 수 없습니다.' });
    }
    if (req.user.role === 'root' && !scope.company_id) {
      return res.status(400).json({ success: false, message: 'root는 company_id를 지정해야 합니다.' });
    }

    const created = await (EmploymentContractTemplate as any).create({
      tenant_id: scope.tenant_id,
      company_id: scope.company_id,
      name: String(name).trim(),
      contract_type: String(contract_type || 'regular'),
      language: language === 'en' ? 'en' : 'ko',
      content_html: String(content_html),
      version: 1,
      is_active: true,
      created_by: req.user.id,
      updated_by: req.user.id
    });

    await writeAuditLog(req, 'template_create', {
      companyId: created.company_id,
      details: { templateId: created.id, name: created.name }
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('전자근로계약 템플릿 생성 오류:', error);
    return res.status(500).json({ success: false, message: '템플릿 생성 중 오류가 발생했습니다.' });
  }
};

export const updateEmploymentContractTemplate = async (req: RequestWithUser, res: Response) => {
  try {
    if (!assertManagerPermission(req, res, '템플릿 수정')) return;

    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '유효하지 않은 템플릿 ID입니다.' });

    const whereClause: any = { id, is_active: true };
    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    }

    const template = await (EmploymentContractTemplate as any).findOne({ where: whereClause });
    if (!template) return res.status(404).json({ success: false, message: '템플릿을 찾을 수 없습니다.' });

    const nextVersion = Number(template.version || 1) + 1;
    const payload: any = {
      updated_by: req.user.id
    };
    if (req.body?.name) payload.name = String(req.body.name).trim();
    if (req.body?.contract_type) payload.contract_type = String(req.body.contract_type);
    if (req.body?.language) payload.language = req.body.language === 'en' ? 'en' : 'ko';
    if (typeof req.body?.content_html === 'string') {
      payload.content_html = req.body.content_html;
      payload.version = nextVersion;
    }
    if (typeof req.body?.is_active === 'boolean') payload.is_active = req.body.is_active;

    await template.update(payload);

    await writeAuditLog(req, 'template_update', {
      companyId: template.company_id,
      details: { templateId: template.id, version: template.version }
    });

    return res.json({ success: true, data: template });
  } catch (error) {
    console.error('전자근로계약 템플릿 수정 오류:', error);
    return res.status(500).json({ success: false, message: '템플릿 수정 중 오류가 발생했습니다.' });
  }
};

export const deleteEmploymentContractTemplate = async (req: RequestWithUser, res: Response) => {
  try {
    if (!assertRootPermission(req, res, '템플릿 삭제')) return;

    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '유효하지 않은 템플릿 ID입니다.' });

    const whereClause: any = { id, is_active: true };
    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    }

    const template = await (EmploymentContractTemplate as any).findOne({ where: whereClause });
    if (!template) {
      return res.status(404).json({ success: false, message: '삭제할 템플릿을 찾을 수 없습니다.' });
    }

    await template.update({
      is_active: false,
      updated_by: req.user.id
    });

    await writeAuditLog(req, 'template_delete', {
      companyId: template.company_id,
      details: { templateId: template.id, name: template.name }
    });

    return res.json({ success: true, message: '템플릿이 삭제되었습니다.' });
  } catch (error) {
    console.error('전자근로계약 템플릿 삭제 오류:', error);
    return res.status(500).json({ success: false, message: '템플릿 삭제 중 오류가 발생했습니다.' });
  }
};

export const getEmploymentContracts = async (req: RequestWithUser, res: Response) => {
  try {
    if (!assertManagerPermission(req, res, '계약 목록 조회')) return;

    const requestedCompanyId = toIntOrNull(req.query.company_id);
    const employeeId = toIntOrNull(req.query.employee_id);
    const status = req.query.status ? String(req.query.status) : '';
    const whereClause: any = {};

    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    } else if (requestedCompanyId) {
      const scope = await getScopedCompany(req, requestedCompanyId);
      if (!scope) return res.status(404).json({ success: false, message: '회사를 찾을 수 없습니다.' });
      whereClause.tenant_id = scope.tenant_id;
      whereClause.company_id = scope.company_id;
    }

    if (employeeId) whereClause.employee_id = employeeId;
    if (status) whereClause.status = status;

    const contracts = await (EmploymentContract as any).findAll({
      where: whereClause,
      include: [
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'userid', 'username', 'department', 'position']
        },
        {
          model: EmploymentContractTemplate,
          as: 'template',
          attributes: ['id', 'name', 'version', 'language']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    await writeAuditLog(req, 'contract_list_view', {
      details: { requestedCompanyId: requestedCompanyId || null, employeeId: employeeId || null, count: contracts.length }
    });

    return res.json({ success: true, data: contracts });
  } catch (error) {
    console.error('전자근로계약 목록 조회 오류:', error);
    return res.status(500).json({ success: false, message: '전자근로계약 목록 조회 중 오류가 발생했습니다.' });
  }
};

export const getEmploymentContract = async (req: RequestWithUser, res: Response) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '유효하지 않은 계약 ID입니다.' });

    const whereClause: any = { id };
    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    }

    const contract = await (EmploymentContract as any).findOne({
      where: whereClause,
      include: [
        {
          model: Company,
          as: 'company',
          attributes: ['id', 'name']
        },
        {
          model: User,
          as: 'employee',
          attributes: ['id', 'userid', 'username', 'department', 'position']
        },
        {
          model: EmploymentContractTemplate,
          as: 'template',
          attributes: ['id', 'name', 'version', 'language', 'contract_type', 'content_html']
        },
        {
          model: EmploymentContractSignature,
          as: 'signatures',
          attributes: ['id', 'signer_type', 'signer_id', 'signed_at', 'sign_method']
        }
      ]
    });

    if (!contract) return res.status(404).json({ success: false, message: '전자근로계약을 찾을 수 없습니다.' });

    if (!canManageEmploymentContracts(req) && Number(contract.employee_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: '해당 계약을 조회할 권한이 없습니다.' });
    }

    await writeAuditLog(req, 'contract_detail_view', {
      contractId: contract.id,
      companyId: contract.company_id
    });

    const contractJson = contract.toJSON();
    const renderedContentHtml = contractJson.template?.content_html
      ? renderTemplate(contractJson.template.content_html, buildTemplateVariables(contractJson))
      : null;

    return res.json({
      success: true,
      data: {
        ...contractJson,
        rendered_content_html: renderedContentHtml
      }
    });
  } catch (error) {
    console.error('전자근로계약 조회 오류:', error);
    return res.status(500).json({ success: false, message: '전자근로계약 조회 중 오류가 발생했습니다.' });
  }
};

export const createEmploymentContract = async (req: RequestWithUser, res: Response) => {
  try {
    if (!assertManagerPermission(req, res, '계약 생성')) return;

    const {
      employee_id,
      template_id,
      title,
      contract_type = 'regular',
      start_date,
      end_date,
      salary,
      bonus_type,
      bonus_value,
      work_location,
      working_days,
      working_hours,
      probation_months,
      pdf_url,
      hash_sha256
    } = req.body || {};

    if (!employee_id || !title || !start_date || !end_date) {
      return res.status(400).json({ success: false, message: 'employee_id, title, start_date, end_date는 필수입니다.' });
    }

    const requestedCompanyId = toIntOrNull(req.body?.company_id);
    const scope = await getScopedCompany(req, requestedCompanyId);
    if (!scope) return res.status(404).json({ success: false, message: '회사를 찾을 수 없습니다.' });
    if (req.user.role === 'root' && !scope.company_id) {
      return res.status(400).json({ success: false, message: 'root는 company_id를 지정해야 합니다.' });
    }

    const employee = await requireValidEmployee(Number(employee_id), scope.company_id);
    if (!employee) return res.status(404).json({ success: false, message: '해당 회사의 직원을 찾을 수 없습니다.' });

    if (template_id) {
      const template = await (EmploymentContractTemplate as any).findOne({
        where: {
          id: Number(template_id),
          tenant_id: scope.tenant_id,
          company_id: scope.company_id,
          is_active: true
        }
      });
      if (!template) {
        return res.status(404).json({ success: false, message: '선택한 템플릿을 찾을 수 없습니다.' });
      }
    }

    const created = await (EmploymentContract as any).create({
      tenant_id: scope.tenant_id,
      company_id: scope.company_id,
      employee_id: Number(employee_id),
      template_id: template_id ? Number(template_id) : null,
      title: String(title).trim(),
      contract_type: String(contract_type || 'regular'),
      status: 'draft',
      start_date: String(start_date),
      end_date: String(end_date),
      salary: salary !== undefined && salary !== null && salary !== '' ? Number(salary) : null,
      bonus_type: bonus_type ? String(bonus_type) : null,
      bonus_value: bonus_value !== undefined && bonus_value !== null && bonus_value !== '' ? Number(bonus_value) : null,
      work_location: work_location ? String(work_location) : null,
      working_days: working_days ? String(working_days) : null,
      working_hours: working_hours ? String(working_hours) : null,
      probation_months: probation_months ? Number(probation_months) : null,
      pdf_url: pdf_url ? String(pdf_url) : null,
      hash_sha256: hash_sha256 ? String(hash_sha256) : null,
      created_by: req.user.id,
      updated_by: req.user.id
    });

    await writeAuditLog(req, 'contract_create', {
      contractId: created.id,
      companyId: created.company_id,
      details: {
        employeeId: created.employee_id,
        templateId: created.template_id || null,
        after: buildContractAuditSnapshot(created)
      }
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error) {
    console.error('전자근로계약 생성 오류:', error);
    return res.status(500).json({ success: false, message: '전자근로계약 생성 중 오류가 발생했습니다.' });
  }
};

export const updateEmploymentContract = async (req: RequestWithUser, res: Response) => {
  try {
    if (!assertManagerPermission(req, res, '계약 수정')) return;

    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '유효하지 않은 계약 ID입니다.' });

    const whereClause: any = { id };
    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    }

    const contract = await (EmploymentContract as any).findOne({ where: whereClause });
    if (!contract) return res.status(404).json({ success: false, message: '전자근로계약을 찾을 수 없습니다.' });
    const beforeSnapshot = buildContractAuditSnapshot(contract);

    const payload: any = { updated_by: req.user.id };
    const allowedFields = [
      'template_id',
      'title',
      'contract_type',
      'status',
      'start_date',
      'end_date',
      'salary',
      'bonus_type',
      'bonus_value',
      'work_location',
      'working_days',
      'working_hours',
      'probation_months',
      'pdf_url',
      'hash_sha256'
    ];
    for (const key of allowedFields) {
      if (Object.prototype.hasOwnProperty.call(req.body, key)) {
        payload[key] = req.body[key];
      }
    }

    if (Object.prototype.hasOwnProperty.call(payload, 'salary')) {
      payload.salary = payload.salary === null || payload.salary === '' ? null : Number(payload.salary);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'bonus_value')) {
      payload.bonus_value = payload.bonus_value === null || payload.bonus_value === '' ? null : Number(payload.bonus_value);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'bonus_type')) {
      const normalizedBonusType =
        payload.bonus_type === null || payload.bonus_type === '' ? null : String(payload.bonus_type);
      if (normalizedBonusType && !['percent', 'fixed'].includes(normalizedBonusType)) {
        return res.status(400).json({ success: false, message: 'bonus_type은 percent 또는 fixed만 가능합니다.' });
      }
      payload.bonus_type = normalizedBonusType;
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'probation_months')) {
      payload.probation_months =
        payload.probation_months === null || payload.probation_months === ''
          ? null
          : Number(payload.probation_months);
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'template_id')) {
      payload.template_id =
        payload.template_id === null || payload.template_id === '' ? null : Number(payload.template_id);
      if (payload.template_id) {
        const template = await (EmploymentContractTemplate as any).findOne({
          where: {
            id: payload.template_id,
            tenant_id: contract.tenant_id,
            company_id: contract.company_id,
            is_active: true
          }
        });
        if (!template) {
          return res.status(404).json({ success: false, message: '선택한 템플릿을 찾을 수 없습니다.' });
        }
      }
    }
    if (Object.prototype.hasOwnProperty.call(payload, 'status')) {
      const currentStatus = normalizeStatus(contract.status);
      const nextStatus = normalizeStatus(payload.status);
      const allowedNext = CONTRACT_STATUS_FLOW[currentStatus] || [currentStatus];
      if (!allowedNext.includes(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: `상태 전이가 허용되지 않습니다. (${currentStatus} -> ${nextStatus})`
        });
      }
      if (IMMUTABLE_SIGN_STATUSES.has(nextStatus)) {
        return res.status(400).json({
          success: false,
          message: '서명 관련 상태 변경은 서명 API를 통해서만 가능합니다.'
        });
      }
      payload.status = nextStatus;
    }

    await contract.update(payload);

    const currentStatus = normalizeStatus(beforeSnapshot?.status);
    const nextStatus = normalizeStatus(contract.status);
    if (currentStatus !== nextStatus && nextStatus === 'active' && !contract.pdf_url) {
      const generated = await createEmploymentContractPdf(contract.toJSON(), 'company', req.user.id);
      await contract.update({
        pdf_url: generated.pdfUrl,
        hash_sha256: generated.hashSha256,
        updated_by: req.user.id
      });
      await writeAuditLog(req, 'contract_auto_pdf_generate_on_active', {
        contractId: contract.id,
        companyId: contract.company_id,
        details: { pdf_url: generated.pdfUrl }
      });
    }
    const afterSnapshot = buildContractAuditSnapshot(contract);

    await writeAuditLog(req, 'contract_update', {
      contractId: contract.id,
      companyId: contract.company_id,
      details: {
        before: beforeSnapshot,
        after: afterSnapshot,
        changed_fields: extractChangedFields(beforeSnapshot, afterSnapshot),
        status_transition:
          normalizeStatus(beforeSnapshot?.status) !== normalizeStatus(afterSnapshot?.status)
            ? {
                from: normalizeStatus(beforeSnapshot?.status),
                to: normalizeStatus(afterSnapshot?.status)
              }
            : null
      }
    });

    return res.json({ success: true, data: contract });
  } catch (error) {
    console.error('전자근로계약 수정 오류:', error);
    return res.status(500).json({ success: false, message: '전자근로계약 수정 중 오류가 발생했습니다.' });
  }
};

export const deleteEmploymentContract = async (req: RequestWithUser, res: Response) => {
  try {
    if (!assertRootPermission(req, res, '계약 삭제')) return;

    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '유효하지 않은 계약 ID입니다.' });

    const whereClause: any = { id };
    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    }

    const contract = await (EmploymentContract as any).findOne({ where: whereClause });
    if (!contract) {
      return res.status(404).json({ success: false, message: '삭제할 계약을 찾을 수 없습니다.' });
    }

    const deletedSnapshot = {
      id: contract.id,
      title: contract.title,
      employee_id: contract.employee_id,
      status: contract.status
    };

    await (EmploymentContract as any).destroy({ where: { id: contract.id } });

    await writeAuditLog(req, 'contract_delete', {
      companyId: contract.company_id,
      details: deletedSnapshot
    });

    return res.json({ success: true, message: '계약이 삭제되었습니다.' });
  } catch (error) {
    console.error('전자근로계약 삭제 오류:', error);
    return res.status(500).json({ success: false, message: '전자근로계약 삭제 중 오류가 발생했습니다.' });
  }
};

export const signEmploymentContract = async (req: RequestWithUser, res: Response) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '유효하지 않은 계약 ID입니다.' });

    const whereClause: any = { id };
    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    }

    const contract = await (EmploymentContract as any).findOne({ where: whereClause });
    if (!contract) return res.status(404).json({ success: false, message: '전자근로계약을 찾을 수 없습니다.' });

    const signerType = req.body?.signer_type === 'company' ? 'company' : 'employee';
    if (signerType === 'employee' && req.user.role !== 'root' && Number(contract.employee_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: '본인 계약서만 직원 서명할 수 있습니다.' });
    }
    if (signerType === 'company' && req.user.role !== 'root' && !['admin'].includes(String(req.user.role))) {
      return res.status(403).json({ success: false, message: '회사 서명 권한이 없습니다.' });
    }

    const contractStatus = normalizeStatus(contract.status);
    if (['terminated', 'expired', 'active'].includes(contractStatus)) {
      return res.status(400).json({ success: false, message: `현재 상태(${contract.status})에서는 서명할 수 없습니다.` });
    }
    if (signerType === 'company' && !['in_review', 'awaiting_company_sign'].includes(contractStatus)) {
      return res.status(400).json({
        success: false,
        message: '회사 서명은 in_review 또는 awaiting_company_sign 상태에서만 가능합니다.'
      });
    }
    if (signerType === 'employee' && contractStatus !== 'awaiting_employee_sign') {
      return res.status(400).json({
        success: false,
        message: '직원 서명은 awaiting_employee_sign 상태에서만 가능합니다.'
      });
    }

    const existing = await (EmploymentContractSignature as any).findOne({
      where: {
        contract_id: contract.id,
        signer_type: signerType,
      }
    });
    if (existing) {
      return res.status(409).json({ success: false, message: `${signerType === 'company' ? '회사' : '직원'} 서명이 이미 완료되었습니다.` });
    }

    const requestedSignMethod = String(req.body?.sign_method || 'internal_ack');
    const signMethod = requestedSignMethod === 'aadhaar_esign' ? 'aadhaar_esign' : 'internal_ack';

    let signatureData: string | null = req.body?.signature_data ? String(req.body.signature_data) : null;
    if (signMethod === 'aadhaar_esign') {
      const aadhaarConsent = req.body?.aadhaar_consent === true || String(req.body?.aadhaar_consent || '') === 'true';
      const aadhaarLast4 = String(req.body?.aadhaar_last4 || '').trim();
      const aadhaarAuthRef = String(req.body?.aadhaar_auth_ref || '').trim();

      if (!aadhaarConsent) {
        return res.status(400).json({ success: false, message: 'Aadhaar eSign 동의가 필요합니다.' });
      }
      if (!/^\d{4}$/.test(aadhaarLast4)) {
        return res.status(400).json({ success: false, message: 'Aadhaar 마지막 4자리를 정확히 입력해 주세요.' });
      }
      if (!aadhaarAuthRef) {
        return res.status(400).json({ success: false, message: 'Aadhaar 인증 참조값이 필요합니다.' });
      }

      signatureData = JSON.stringify({
        provider: 'aadhaar_esign',
        consent: true,
        aadhaar_last4: aadhaarLast4,
        auth_reference: aadhaarAuthRef,
        verified_at: new Date().toISOString()
      });
    }

    const signature = await (EmploymentContractSignature as any).create({
      contract_id: contract.id,
      signer_type: signerType,
      signer_id: req.user.id,
      signed_at: new Date(),
      sign_ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').slice(0, 64) || null,
      sign_method: signMethod,
      signature_data: signatureData
    });

    const updates: any = { updated_by: req.user.id };
    if (signerType === 'company') updates.company_signed_at = new Date();
    if (signerType === 'employee') updates.employee_signed_at = new Date();

    const allSigns = await (EmploymentContractSignature as any).findAll({
      where: { contract_id: contract.id },
      attributes: ['signer_type']
    });
    const hasCompanySign = allSigns.some((row: any) => row.signer_type === 'company') || signerType === 'company';
    const hasEmployeeSign = allSigns.some((row: any) => row.signer_type === 'employee') || signerType === 'employee';
    if (hasCompanySign && hasEmployeeSign) {
      updates.status = 'signed';
    } else if (signerType === 'company') {
      updates.status = 'awaiting_employee_sign';
    } else {
      updates.status = 'awaiting_company_sign';
    }

    if (hasCompanySign && hasEmployeeSign) {
      const fullContract = await (EmploymentContract as any).findOne({
        where: { id: contract.id },
        include: [
          { model: Company, as: 'company', attributes: ['id', 'name'] },
          { model: User, as: 'employee', attributes: ['id', 'userid', 'username', 'department', 'position'] },
          {
            model: EmploymentContractTemplate,
            as: 'template',
            attributes: ['id', 'name', 'version', 'language', 'contract_type', 'content_html']
          }
        ]
      });
      const fullContractJson = fullContract?.toJSON?.() || contract.toJSON();
      const renderedContentHtml = fullContractJson.template?.content_html
        ? renderTemplate(fullContractJson.template.content_html, buildTemplateVariables(fullContractJson))
        : '';
      const nextContractSnapshot = {
        ...fullContractJson,
        ...updates,
        rendered_content_html: renderedContentHtml
      };
      const generated = await createEmploymentContractPdf(nextContractSnapshot, signerType, req.user.id);
      updates.pdf_url = generated.pdfUrl;
      updates.hash_sha256 = generated.hashSha256;
    }

    await contract.update(updates);

    await writeAuditLog(req, 'contract_sign', {
      contractId: contract.id,
      companyId: contract.company_id,
      details: {
        signerType,
        signerId: req.user.id,
        signMethod,
        status_after: contract.status
      }
    });

    return res.json({
      success: true,
      data: {
        contract,
        signature
      }
    });
  } catch (error) {
    console.error('전자근로계약 서명 오류:', error);
    return res.status(500).json({ success: false, message: '전자근로계약 서명 중 오류가 발생했습니다.' });
  }
};

export const sendEmploymentContractToEmployee = async (req: RequestWithUser, res: Response) => {
  try {
    if (!assertManagerPermission(req, res, '계약 발송')) return;

    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '유효하지 않은 계약 ID입니다.' });

    const whereClause: any = { id };
    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    }

    const contract = await (EmploymentContract as any).findOne({ where: whereClause });
    if (!contract) return res.status(404).json({ success: false, message: '전자근로계약을 찾을 수 없습니다.' });

    const contractStatus = normalizeStatus(contract.status);
    if (!['draft', 'in_review'].includes(contractStatus)) {
      return res.status(400).json({
        success: false,
        message: '초안 또는 검토중 상태의 계약만 직원에게 보낼 수 있습니다.'
      });
    }

    const existingCompanySign = await (EmploymentContractSignature as any).findOne({
      where: { contract_id: contract.id, signer_type: 'company' }
    });
    if (!existingCompanySign) {
      await (EmploymentContractSignature as any).create({
        contract_id: contract.id,
        signer_type: 'company',
        signer_id: req.user.id,
        signed_at: new Date(),
        sign_ip: String(req.headers['x-forwarded-for'] || req.socket?.remoteAddress || '').slice(0, 64) || null,
        sign_method: 'internal_ack',
        signature_data: JSON.stringify({
          provider: 'company_send',
          sent_by: req.user.id,
          sent_at: new Date().toISOString()
        })
      });
    }

    await contract.update({
      status: 'awaiting_employee_sign',
      company_signed_at: contract.company_signed_at || new Date(),
      updated_by: req.user.id
    });

    await writeAuditLog(req, 'contract_send_to_employee', {
      contractId: contract.id,
      companyId: contract.company_id,
      details: {
        employee_id: contract.employee_id,
        status_after: 'awaiting_employee_sign'
      }
    });

    return res.json({
      success: true,
      message: '직원에게 계약서가 발송되었습니다.',
      data: contract
    });
  } catch (error) {
    console.error('전자근로계약 발송 오류:', error);
    return res.status(500).json({ success: false, message: '계약 발송 중 오류가 발생했습니다.' });
  }
};

export const getMyEmploymentContracts = async (req: RequestWithUser, res: Response) => {
  try {
    const status = req.query.status ? String(req.query.status) : '';
    const whereClause: any = {
      employee_id: req.user.id
    };

    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    }
    if (status) whereClause.status = status;

    const contracts = await (EmploymentContract as any).findAll({
      where: whereClause,
      include: [
        {
          model: EmploymentContractTemplate,
          as: 'template',
          attributes: ['id', 'name', 'version', 'language']
        }
      ],
      order: [['updated_at', 'DESC']]
    });

    await writeAuditLog(req, 'my_contract_list_view', {
      details: { count: contracts.length, status: status || null }
    });

    return res.json({ success: true, data: contracts });
  } catch (error) {
    console.error('내 전자근로계약 조회 오류:', error);
    return res.status(500).json({ success: false, message: '내 전자근로계약 조회 중 오류가 발생했습니다.' });
  }
};

export const getEmploymentContractAuditLogs = async (req: RequestWithUser, res: Response) => {
  try {
    const id = toIntOrNull(req.params.id);
    if (!id) return res.status(400).json({ success: false, message: '유효하지 않은 계약 ID입니다.' });

    const whereClause: any = { id };
    if (req.user.role !== 'root') {
      whereClause.tenant_id = req.user.tenant_id;
      whereClause.company_id = req.user.company_id;
    }

    const contract = await (EmploymentContract as any).findOne({ where: whereClause, attributes: ['id', 'employee_id', 'company_id'] });
    if (!contract) return res.status(404).json({ success: false, message: '전자근로계약을 찾을 수 없습니다.' });

    if (!canManageEmploymentContracts(req) && Number(contract.employee_id) !== Number(req.user.id)) {
      return res.status(403).json({ success: false, message: '감사로그 조회 권한이 없습니다.' });
    }

    const rawLimit = toIntOrNull(req.query.limit);
    const limit = rawLimit ? Math.min(Math.max(rawLimit, 1), 200) : 100;
    const rows = await (EmploymentContractAuditLog as any).findAll({
      where: { contract_id: contract.id },
      include: [
        {
          model: User,
          as: 'actor',
          attributes: ['id', 'userid', 'username', 'role'],
          required: false
        }
      ],
      order: [['created_at', 'DESC']],
      limit
    });

    await writeAuditLog(req, 'contract_audit_log_view', {
      contractId: contract.id,
      companyId: contract.company_id,
      details: { count: rows.length }
    });

    return res.json({ success: true, data: rows });
  } catch (error) {
    console.error('전자근로계약 감사로그 조회 오류:', error);
    return res.status(500).json({ success: false, message: '감사로그 조회 중 오류가 발생했습니다.' });
  }
};

