import { Response } from 'express';
import { Op } from 'sequelize';
import { GlAccount, GlVoucher, GlVoucherLine } from '../models';
import { RequestWithUser } from '../types';
import {
  assertBalanced,
  computeTotals,
  createGlVoucherWithLines,
  ensureDefaultChartOfAccounts,
  postVoucherToLedger,
} from '../services/glPostingService';
import { resolveCompanyScope } from '../utils/companyScope';

const parseAmount = (value: unknown) => {
  if (value == null) return 0;
  const parsed = Number(String(value).replace(/,/g, ''));
  return Number.isFinite(parsed) ? parsed : 0;
};

const buildAccountTree = (rows: any[]) => {
  const map = new Map<number, any>();
  rows.forEach((row) => map.set(row.id, { ...row.toJSON(), children: [] }));
  const roots: any[] = [];
  map.forEach((node) => {
    if (node.parent_id && map.has(node.parent_id)) {
      map.get(node.parent_id).children.push(node);
    } else {
      roots.push(node);
    }
  });
  return roots;
};

export const seedGlAccounts = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const { id: userId } = req.user;
    const result = await ensureDefaultChartOfAccounts({
      tenantId,
      companyId,
      userId,
    });
    return res.json({
      success: true,
      data: result,
      message: result.created > 0 ? '기본 계정과목이 생성되었습니다.' : '이미 계정과목이 존재합니다.',
    });
  } catch (error: any) {
    console.error('계정과목 시드 오류:', error);
    return res.status(500).json({ success: false, message: error.message || '계정과목 생성에 실패했습니다.' });
  }
};

export const getGlAccounts = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const tree = String(req.query.tree || '') === 'true';
    const ledgerOnly = String(req.query.ledgerOnly || '') === 'true';

    await ensureDefaultChartOfAccounts({ tenantId, companyId, userId: req.user.id });

    const where: any = { tenant_id: tenantId, company_id: companyId, is_active: true };
    if (ledgerOnly) where.account_type = 'ledger';

    const rows = await (GlAccount as any).findAll({
      where,
      order: [
        ['code', 'ASC'],
        ['id', 'ASC'],
      ],
    });

    return res.json({
      success: true,
      data: tree ? buildAccountTree(rows) : rows,
    });
  } catch (error: any) {
    console.error('계정과목 조회 오류:', error);
    return res.status(500).json({ success: false, message: '계정과목 조회에 실패했습니다.' });
  }
};

export const createGlAccount = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const { id: userId, role } = req.user;
    if (!(role === 'root' || role === 'admin')) {
      return res.status(403).json({ success: false, message: '계정과목 등록 권한이 없습니다.' });
    }

    const code = String(req.body?.code || '').trim();
    const name = String(req.body?.name || '').trim();
    if (!code || !name) {
      return res.status(400).json({ success: false, message: '계정코드와 계정명은 필수입니다.' });
    }

    const created = await (GlAccount as any).create({
      tenant_id: tenantId,
      company_id: companyId,
      parent_id: req.body?.parentId ?? null,
      code,
      name,
      name_en: req.body?.nameEn ? String(req.body.nameEn) : null,
      account_type: req.body?.accountType === 'group' ? 'group' : 'ledger',
      nature: req.body?.nature || 'expense',
      opening_balance: parseAmount(req.body?.openingBalance),
      current_balance: parseAmount(req.body?.openingBalance),
      is_system: false,
      is_active: true,
      created_by: userId,
      updated_by: userId,
    });

    return res.status(201).json({ success: true, data: created });
  } catch (error: any) {
    console.error('계정과목 생성 오류:', error);
    const status = String(error.message || '').includes('unique') ? 409 : 500;
    return res.status(status).json({ success: false, message: error.message || '계정과목 생성에 실패했습니다.' });
  }
};

export const updateGlAccount = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, companyId } = resolveCompanyScope(req);
    const { id: userId, role } = req.user;
    if (!(role === 'root' || role === 'admin')) {
      return res.status(403).json({ success: false, message: '계정과목 수정 권한이 없습니다.' });
    }

    const row = await (GlAccount as any).findOne({
      where: { id, tenant_id: tenantId, company_id: companyId, is_active: true },
    });
    if (!row) return res.status(404).json({ success: false, message: '계정과목을 찾을 수 없습니다.' });

    const opening = req.body?.openingBalance != null ? parseAmount(req.body.openingBalance) : parseAmount(row.opening_balance);
    await row.update({
      parent_id: req.body?.parentId ?? row.parent_id,
      code: req.body?.code != null ? String(req.body.code).trim() : row.code,
      name: req.body?.name != null ? String(req.body.name).trim() : row.name,
      name_en: req.body?.nameEn != null ? String(req.body.nameEn) : row.name_en,
      account_type: req.body?.accountType === 'group' ? 'group' : row.account_type,
      nature: req.body?.nature || row.nature,
      opening_balance: opening,
      current_balance: req.body?.openingBalance != null ? opening : row.current_balance,
      updated_by: userId,
    });

    return res.json({ success: true, data: row });
  } catch (error: any) {
    console.error('계정과목 수정 오류:', error);
    return res.status(500).json({ success: false, message: error.message || '계정과목 수정에 실패했습니다.' });
  }
};

export const deleteGlAccount = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, companyId } = resolveCompanyScope(req);
    const { id: userId, role } = req.user;
    if (!(role === 'root' || role === 'admin')) {
      return res.status(403).json({ success: false, message: '계정과목 삭제 권한이 없습니다.' });
    }

    const row = await (GlAccount as any).findOne({
      where: { id, tenant_id: tenantId, company_id: companyId, is_active: true },
    });
    if (!row) return res.status(404).json({ success: false, message: '계정과목을 찾을 수 없습니다.' });
    if (row.is_system) {
      return res.status(400).json({ success: false, message: '시스템 기본 계정과목은 삭제할 수 없습니다.' });
    }

    const childCount = await (GlAccount as any).count({
      where: { parent_id: row.id, tenant_id: tenantId, company_id: companyId, is_active: true },
    });
    if (childCount > 0) {
      return res.status(400).json({ success: false, message: '하위 계정이 있어 삭제할 수 없습니다.' });
    }

    const lineCount = await (GlVoucherLine as any).count({
      where: { account_id: row.id },
    });
    if (lineCount > 0) {
      return res.status(400).json({ success: false, message: '전표에 사용된 계정과목은 삭제할 수 없습니다.' });
    }

    await row.update({ is_active: false, updated_by: userId });
    return res.json({ success: true, message: '계정과목이 삭제되었습니다.' });
  } catch (error: any) {
    console.error('계정과목 삭제 오류:', error);
    return res.status(500).json({ success: false, message: error.message || '계정과목 삭제에 실패했습니다.' });
  }
};

export const getGlVouchers = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const status = req.query.status ? String(req.query.status) : undefined;
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;

    const where: any = { tenant_id: tenantId, company_id: companyId, is_active: true };
    if (status) where.status = status;
    if (from || to) {
      where.voucher_date = {};
      if (from) where.voucher_date[Op.gte] = from;
      if (to) where.voucher_date[Op.lte] = to;
    }

    const rows = await (GlVoucher as any).findAll({
      where,
      order: [
        ['voucher_date', 'DESC'],
        ['id', 'DESC'],
      ],
      limit: Math.min(Number(req.query.limit) || 200, 500),
    });

    return res.json({ success: true, data: rows });
  } catch (error: any) {
    console.error('전표 목록 조회 오류:', error);
    return res.status(500).json({ success: false, message: '전표 목록 조회에 실패했습니다.' });
  }
};

export const getGlVoucherById = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, companyId } = resolveCompanyScope(req);
    const row = await (GlVoucher as any).findOne({
      where: { id, tenant_id: tenantId, company_id: companyId, is_active: true },
      include: [
        {
          model: GlVoucherLine,
          as: 'lines',
          required: false,
        },
      ],
      order: [[{ model: GlVoucherLine, as: 'lines' }, 'line_no', 'ASC']],
    });
    if (!row) return res.status(404).json({ success: false, message: '전표를 찾을 수 없습니다.' });
    return res.json({ success: true, data: row });
  } catch (error: any) {
    console.error('전표 상세 조회 오류:', error);
    return res.status(500).json({ success: false, message: '전표 상세 조회에 실패했습니다.' });
  }
};

export const createGlVoucher = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const { id: userId } = req.user;
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
    if (!lines.length) {
      return res.status(400).json({ success: false, message: '전표 라인이 필요합니다.' });
    }

    const voucher = await createGlVoucherWithLines({
      tenantId,
      companyId,
      userId,
      voucherType: req.body?.voucherType,
      voucherDate: req.body?.voucherDate || new Date().toISOString().slice(0, 10),
      narration: req.body?.narration,
      lines,
      sourceType: 'manual',
      postImmediately: Boolean(req.body?.postImmediately),
    });

    const detail = await (GlVoucher as any).findOne({
      where: { id: voucher.id },
      include: [{ model: GlVoucherLine, as: 'lines' }],
    });

    return res.status(201).json({ success: true, data: detail });
  } catch (error: any) {
    console.error('전표 생성 오류:', error);
    const statusCode = String(error.message || '').includes('복식부기') ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message || '전표 생성에 실패했습니다.' });
  }
};

export const postGlVoucher = async (req: RequestWithUser, res: Response) => {
  try {
    const { id } = req.params;
    const { tenantId, companyId } = resolveCompanyScope(req);
    const { id: userId, role } = req.user;
    if (!(role === 'root' || role === 'admin')) {
      return res.status(403).json({ success: false, message: '장부 반영 권한이 없습니다.' });
    }

    await postVoucherToLedger({ voucherId: Number(id), tenantId, companyId, userId });
    const detail = await (GlVoucher as any).findOne({
      where: { id, tenant_id: tenantId, company_id: companyId },
      include: [{ model: GlVoucherLine, as: 'lines' }],
    });
    return res.json({ success: true, data: detail, message: '장부에 반영되었습니다.' });
  } catch (error: any) {
    console.error('전표 장부 반영 오류:', error);
    const statusCode = String(error.message || '').includes('이미') ? 400 : 500;
    return res.status(statusCode).json({ success: false, message: error.message || '장부 반영에 실패했습니다.' });
  }
};

export const getAccountLedger = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const accountId = Number(req.query.accountId);
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;

    if (!accountId) {
      return res.status(400).json({ success: false, message: 'accountId가 필요합니다.' });
    }

    const account = await (GlAccount as any).findOne({
      where: { id: accountId, tenant_id: tenantId, company_id: companyId, is_active: true },
    });
    if (!account) return res.status(404).json({ success: false, message: '계정과목을 찾을 수 없습니다.' });

    const voucherWhere: any = {
      tenant_id: tenantId,
      company_id: companyId,
      status: 'posted',
      is_active: true,
    };
    if (from || to) {
      voucherWhere.voucher_date = {};
      if (from) voucherWhere.voucher_date[Op.gte] = from;
      if (to) voucherWhere.voucher_date[Op.lte] = to;
    }

    const lines = await (GlVoucherLine as any).findAll({
      where: { account_id: accountId },
      include: [
        {
          model: GlVoucher,
          as: 'voucher',
          required: true,
          where: voucherWhere,
        },
      ],
      order: [
        [{ model: GlVoucher, as: 'voucher' }, 'voucher_date', 'ASC'],
        [{ model: GlVoucher, as: 'voucher' }, 'id', 'ASC'],
        ['line_no', 'ASC'],
      ],
    });

    let running = parseAmount(account.opening_balance);
    const entries = lines.map((line: any) => {
      const debit = parseAmount(line.debit);
      const credit = parseAmount(line.credit);
      const delta =
        account.nature === 'asset' || account.nature === 'expense' ? debit - credit : credit - debit;
      running = Number((running + delta).toFixed(2));
      return {
        id: line.id,
        voucherId: line.voucher_id,
        voucherNo: line.voucher?.voucher_no,
        voucherDate: line.voucher?.voucher_date,
        narration: line.narration || line.voucher?.narration,
        debit,
        credit,
        runningBalance: running,
      };
    });

    return res.json({
      success: true,
      data: {
        account,
        openingBalance: parseAmount(account.opening_balance),
        currentBalance: parseAmount(account.current_balance),
        entries,
        closingBalance: running,
      },
    });
  } catch (error: any) {
    console.error('장부 조회 오류:', error);
    return res.status(500).json({ success: false, message: '장부 조회에 실패했습니다.' });
  }
};

export const getTrialBalance = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;

    await ensureDefaultChartOfAccounts({ tenantId, companyId, userId: req.user.id });

    const accounts = await (GlAccount as any).findAll({
      where: { tenant_id: tenantId, company_id: companyId, is_active: true, account_type: 'ledger' },
      order: [['code', 'ASC']],
    });

    const voucherWhere: any = { tenant_id: tenantId, company_id: companyId, status: 'posted', is_active: true };
    if (from || to) {
      voucherWhere.voucher_date = {};
      if (from) voucherWhere.voucher_date[Op.gte] = from;
      if (to) voucherWhere.voucher_date[Op.lte] = to;
    }

    const rows = [];
    let totalDebit = 0;
    let totalCredit = 0;

    for (const account of accounts) {
      const lines = await (GlVoucherLine as any).findAll({
        where: { account_id: account.id },
        include: [{ model: GlVoucher, as: 'voucher', required: true, where: voucherWhere }],
      });
      const debit = lines.reduce((sum: number, line: any) => sum + parseAmount(line.debit), 0);
      const credit = lines.reduce((sum: number, line: any) => sum + parseAmount(line.credit), 0);
      if (debit === 0 && credit === 0 && parseAmount(account.current_balance) === 0) continue;
      totalDebit += debit;
      totalCredit += credit;
      rows.push({
        accountId: account.id,
        code: account.code,
        name: account.name,
        nature: account.nature,
        debit: Number(debit.toFixed(2)),
        credit: Number(credit.toFixed(2)),
        balance: Number(parseAmount(account.current_balance).toFixed(2)),
      });
    }

    return res.json({
      success: true,
      data: {
        rows,
        totalDebit: Number(totalDebit.toFixed(2)),
        totalCredit: Number(totalCredit.toFixed(2)),
      },
    });
  } catch (error: any) {
    console.error('시산표 조회 오류:', error);
    return res.status(500).json({ success: false, message: '시산표 조회에 실패했습니다.' });
  }
};

/** 손익계산서 — 기간 내 수익·비용 계정 집계 */
export const getProfitAndLoss = async (req: RequestWithUser, res: Response) => {
  try {
    const { tenantId, companyId } = resolveCompanyScope(req);
    const from = req.query.from ? String(req.query.from) : undefined;
    const to = req.query.to ? String(req.query.to) : undefined;

    await ensureDefaultChartOfAccounts({ tenantId, companyId, userId: req.user.id });

    const accounts = await (GlAccount as any).findAll({
      where: {
        tenant_id: tenantId,
        company_id: companyId,
        is_active: true,
        account_type: 'ledger',
        nature: { [Op.in]: ['income', 'expense'] },
      },
      order: [['code', 'ASC']],
    });

    const voucherWhere: any = { tenant_id: tenantId, company_id: companyId, status: 'posted', is_active: true };
    if (from || to) {
      voucherWhere.voucher_date = {};
      if (from) voucherWhere.voucher_date[Op.gte] = from;
      if (to) voucherWhere.voucher_date[Op.lte] = to;
    }

    const incomeRows: any[] = [];
    const expenseRows: any[] = [];
    let totalIncome = 0;
    let totalExpense = 0;

    for (const account of accounts) {
      const lines = await (GlVoucherLine as any).findAll({
        where: { account_id: account.id },
        include: [{ model: GlVoucher, as: 'voucher', required: true, where: voucherWhere }],
      });
      const debit = lines.reduce((sum: number, line: any) => sum + parseAmount(line.debit), 0);
      const credit = lines.reduce((sum: number, line: any) => sum + parseAmount(line.credit), 0);

      const row = {
        accountId: account.id,
        code: account.code,
        name: account.name,
        nameEn: account.name_en,
        nature: account.nature,
        debit: Number(debit.toFixed(2)),
        credit: Number(credit.toFixed(2)),
      };

      if (account.nature === 'income') {
        const amount = Number((credit - debit).toFixed(2));
        if (amount === 0) continue;
        totalIncome += amount;
        incomeRows.push({ ...row, amount });
      } else {
        const amount = Number((debit - credit).toFixed(2));
        if (amount === 0) continue;
        totalExpense += amount;
        expenseRows.push({ ...row, amount });
      }
    }

    totalIncome = Number(totalIncome.toFixed(2));
    totalExpense = Number(totalExpense.toFixed(2));
    const netProfit = Number((totalIncome - totalExpense).toFixed(2));

    return res.json({
      success: true,
      data: {
        from: from || null,
        to: to || null,
        incomeRows,
        expenseRows,
        totalIncome,
        totalExpense,
        netProfit,
        grossProfit: totalIncome,
      },
    });
  } catch (error: any) {
    console.error('손익계산서 조회 오류:', error);
    return res.status(500).json({ success: false, message: '손익계산서 조회에 실패했습니다.' });
  }
};

export const validateGlVoucherLines = async (req: RequestWithUser, res: Response) => {
  try {
    const lines = Array.isArray(req.body?.lines) ? req.body.lines : [];
    const totals = assertBalanced(lines);
    return res.json({ success: true, data: totals });
  } catch (error: any) {
    return res.status(400).json({ success: false, message: error.message });
  }
};
