import { Response } from 'express';
import { Op } from 'sequelize';
import { AuthRequest } from '../types';
import { CompanyPolicy, CompanyPolicyRevision, User } from '../models';
import {
  COMPANY_POLICY_KEYS,
  getCompanyPolicyDefault,
  isCompanyPolicyKey,
  type CompanyPolicyKey,
} from '../constants/companyPolicyDefaults';

const canEditCompanyPolicy = (role?: string) => role === 'admin' || role === 'root';

const resolveCompanyId = (req: AuthRequest): number | null => {
  const fromQuery = Number(req.query.company_id || req.query.companyId || 0);
  if (Number.isFinite(fromQuery) && fromQuery > 0 && req.user?.role === 'root') {
    return fromQuery;
  }
  const fromUser = Number(req.user?.company_id || 0);
  return Number.isFinite(fromUser) && fromUser > 0 ? fromUser : null;
};

const serializePolicy = (row: any, canEdit: boolean) => {
  const plain = row?.toJSON ? row.toJSON() : row;
  return {
    id: plain.id,
    policy_key: plain.policy_key,
    title_ko: plain.title_ko,
    title_en: plain.title_en,
    content_ko: plain.content_ko,
    content_en: plain.content_en,
    version: plain.version,
    updated_by: plain.updated_by ?? null,
    updated_by_name: plain.updater?.username || plain.updated_by_name || null,
    updated_at: plain.updated_at,
    created_at: plain.created_at,
    can_edit: canEdit,
  };
};

const ensureCompanyPolicies = async (tenantId: number, companyId: number, actorId?: number) => {
  const existing = await CompanyPolicy.findAll({
    where: { tenant_id: tenantId, company_id: companyId, is_active: true },
  });
  const byKey = new Map(existing.map((row) => [row.policy_key, row]));
  const created: CompanyPolicy[] = [];

  for (const key of COMPANY_POLICY_KEYS) {
    if (byKey.has(key)) continue;
    const seed = getCompanyPolicyDefault(key);
    const row = await CompanyPolicy.create({
      tenant_id: tenantId,
      company_id: companyId,
      policy_key: seed.key,
      title_ko: seed.title_ko,
      title_en: seed.title_en,
      content_ko: seed.content_ko,
      content_en: seed.content_en,
      version: 1,
      updated_by: actorId ?? null,
      is_active: true,
    });
    await CompanyPolicyRevision.create({
      tenant_id: tenantId,
      company_id: companyId,
      policy_id: row.id,
      policy_key: row.policy_key,
      version: 1,
      title_ko: row.title_ko,
      title_en: row.title_en,
      content_ko: row.content_ko,
      content_en: row.content_en,
      change_summary: 'Initial policy',
      changed_by: actorId || null,
    });
    created.push(row);
    byKey.set(key, row);
  }

  return { byKey, created };
};

/** GET /api/company-policies */
export const listCompanyPolicies = async (req: AuthRequest, res: Response) => {
  try {
    const tenantId = Number(req.user?.tenant_id);
    const companyId = resolveCompanyId(req);
    if (!tenantId || !companyId) {
      return res.status(400).json({ success: false, message: '회사 정보가 없습니다.' });
    }

    await ensureCompanyPolicies(tenantId, companyId, req.user?.id);
    const rows = await CompanyPolicy.findAll({
      where: {
        tenant_id: tenantId,
        company_id: companyId,
        is_active: true,
        policy_key: { [Op.in]: [...COMPANY_POLICY_KEYS] },
      },
      include: [
        {
          model: User,
          as: 'updater',
          attributes: ['id', 'username'],
          required: false,
        },
      ],
      order: [['id', 'ASC']],
    });

    const orderIndex = new Map(COMPANY_POLICY_KEYS.map((k, i) => [k, i]));
    rows.sort(
      (a, b) => (orderIndex.get(a.policy_key as CompanyPolicyKey) ?? 99) - (orderIndex.get(b.policy_key as CompanyPolicyKey) ?? 99)
    );

    const canEdit = canEditCompanyPolicy(req.user?.role);
    return res.json({
      success: true,
      data: rows.map((row) => serializePolicy(row, canEdit)),
      meta: { can_edit: canEdit, keys: COMPANY_POLICY_KEYS },
    });
  } catch (error: any) {
    console.error('[company-policies] list error:', error);
    return res.status(500).json({ success: false, message: '회사 정책을 불러오지 못했습니다.' });
  }
};

/** GET /api/company-policies/:key */
export const getCompanyPolicy = async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key || '');
    if (!isCompanyPolicyKey(key)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 정책 키입니다.' });
    }
    const tenantId = Number(req.user?.tenant_id);
    const companyId = resolveCompanyId(req);
    if (!tenantId || !companyId) {
      return res.status(400).json({ success: false, message: '회사 정보가 없습니다.' });
    }

    await ensureCompanyPolicies(tenantId, companyId, req.user?.id);
    const row = await CompanyPolicy.findOne({
      where: { tenant_id: tenantId, company_id: companyId, policy_key: key, is_active: true },
      include: [{ model: User, as: 'updater', attributes: ['id', 'username'], required: false }],
    });
    if (!row) {
      return res.status(404).json({ success: false, message: '정책을 찾을 수 없습니다.' });
    }
    return res.json({
      success: true,
      data: serializePolicy(row, canEditCompanyPolicy(req.user?.role)),
    });
  } catch (error: any) {
    console.error('[company-policies] get error:', error);
    return res.status(500).json({ success: false, message: '회사 정책을 불러오지 못했습니다.' });
  }
};

/** PUT /api/company-policies/:key — admin/root */
export const updateCompanyPolicy = async (req: AuthRequest, res: Response) => {
  try {
    if (!canEditCompanyPolicy(req.user?.role)) {
      return res.status(403).json({ success: false, message: '회사 관리자만 수정할 수 있습니다.' });
    }
    const key = String(req.params.key || '');
    if (!isCompanyPolicyKey(key)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 정책 키입니다.' });
    }
    const tenantId = Number(req.user?.tenant_id);
    const companyId = resolveCompanyId(req);
    const userId = Number(req.user?.id || 0);
    if (!tenantId || !companyId || !userId) {
      return res.status(400).json({ success: false, message: '회사 정보가 없습니다.' });
    }

    await ensureCompanyPolicies(tenantId, companyId, userId);
    const row = await CompanyPolicy.findOne({
      where: { tenant_id: tenantId, company_id: companyId, policy_key: key, is_active: true },
    });
    if (!row) {
      return res.status(404).json({ success: false, message: '정책을 찾을 수 없습니다.' });
    }

    const titleKo = String(req.body?.title_ko ?? row.title_ko).trim();
    const titleEn = String(req.body?.title_en ?? row.title_en).trim();
    const contentKo = String(req.body?.content_ko ?? row.content_ko);
    const contentEn = String(req.body?.content_en ?? row.content_en);
    const changeSummary = String(req.body?.change_summary || '').trim().slice(0, 500) || null;

    if (!titleKo || !titleEn) {
      return res.status(400).json({ success: false, message: '제목(한국어/영어)은 필수입니다.' });
    }

    const nextVersion = Number(row.version || 1) + 1;
    await row.update({
      title_ko: titleKo.slice(0, 200),
      title_en: titleEn.slice(0, 200),
      content_ko: contentKo,
      content_en: contentEn,
      version: nextVersion,
      updated_by: userId,
    });

    await CompanyPolicyRevision.create({
      tenant_id: tenantId,
      company_id: companyId,
      policy_id: row.id,
      policy_key: row.policy_key,
      version: nextVersion,
      title_ko: row.title_ko,
      title_en: row.title_en,
      content_ko: row.content_ko,
      content_en: row.content_en,
      change_summary: changeSummary,
      changed_by: userId,
    });

    await row.reload({
      include: [{ model: User, as: 'updater', attributes: ['id', 'username'], required: false }],
    });

    return res.json({
      success: true,
      message: '회사 정책이 저장되었습니다.',
      data: serializePolicy(row, true),
    });
  } catch (error: any) {
    console.error('[company-policies] update error:', error);
    return res.status(500).json({ success: false, message: '회사 정책 저장에 실패했습니다.' });
  }
};

/** GET /api/company-policies/:key/history */
export const listCompanyPolicyHistory = async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key || '');
    if (!isCompanyPolicyKey(key)) {
      return res.status(400).json({ success: false, message: '유효하지 않은 정책 키입니다.' });
    }
    const tenantId = Number(req.user?.tenant_id);
    const companyId = resolveCompanyId(req);
    if (!tenantId || !companyId) {
      return res.status(400).json({ success: false, message: '회사 정보가 없습니다.' });
    }

    const rows = await CompanyPolicyRevision.findAll({
      where: { tenant_id: tenantId, company_id: companyId, policy_key: key },
      include: [{ model: User, as: 'editor', attributes: ['id', 'username'], required: false }],
      order: [['version', 'DESC']],
      limit: 100,
    });

    return res.json({
      success: true,
      data: rows.map((row) => {
        const plain: any = row.toJSON();
        return {
          id: plain.id,
          policy_key: plain.policy_key,
          version: plain.version,
          title_ko: plain.title_ko,
          title_en: plain.title_en,
          change_summary: plain.change_summary,
          changed_by: plain.changed_by,
          changed_by_name: plain.editor?.username || null,
          created_at: plain.created_at,
        };
      }),
    });
  } catch (error: any) {
    console.error('[company-policies] history error:', error);
    return res.status(500).json({ success: false, message: '변경 이력을 불러오지 못했습니다.' });
  }
};

/** GET /api/company-policies/:key/history/:version */
export const getCompanyPolicyRevision = async (req: AuthRequest, res: Response) => {
  try {
    const key = String(req.params.key || '');
    const version = Number(req.params.version);
    if (!isCompanyPolicyKey(key) || !Number.isFinite(version) || version < 1) {
      return res.status(400).json({ success: false, message: '유효하지 않은 요청입니다.' });
    }
    const tenantId = Number(req.user?.tenant_id);
    const companyId = resolveCompanyId(req);
    if (!tenantId || !companyId) {
      return res.status(400).json({ success: false, message: '회사 정보가 없습니다.' });
    }

    const row = await CompanyPolicyRevision.findOne({
      where: { tenant_id: tenantId, company_id: companyId, policy_key: key, version },
      include: [{ model: User, as: 'editor', attributes: ['id', 'username'], required: false }],
    });
    if (!row) {
      return res.status(404).json({ success: false, message: '해당 버전을 찾을 수 없습니다.' });
    }
    const plain: any = row.toJSON();
    return res.json({
      success: true,
      data: {
        id: plain.id,
        policy_key: plain.policy_key,
        version: plain.version,
        title_ko: plain.title_ko,
        title_en: plain.title_en,
        content_ko: plain.content_ko,
        content_en: plain.content_en,
        change_summary: plain.change_summary,
        changed_by: plain.changed_by,
        changed_by_name: plain.editor?.username || null,
        created_at: plain.created_at,
      },
    });
  } catch (error: any) {
    console.error('[company-policies] revision error:', error);
    return res.status(500).json({ success: false, message: '변경 이력을 불러오지 못했습니다.' });
  }
};
