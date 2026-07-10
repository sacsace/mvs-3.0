import { RequestWithUser } from '../types';

/** root/audit는 query·body의 company_id로 회사 전환, 그 외는 로그인 회사 고정 */
export const resolveCompanyId = (req: RequestWithUser): number => {
  const { company_id, role } = req.user;
  const raw =
    req.query.company_id ??
    req.query.companyId ??
    req.body?.company_id ??
    req.body?.companyId;
  const parsed = raw != null ? parseInt(String(raw), 10) : NaN;
  const hasOverride = Number.isFinite(parsed) && parsed > 0;

  if ((role === 'root' || role === 'audit') && hasOverride) {
    return parsed;
  }
  return company_id;
};

export const resolveCompanyScope = (req: RequestWithUser) => {
  const { tenant_id } = req.user;
  return { tenantId: tenant_id, companyId: resolveCompanyId(req) };
};
