import { RequestWithUser } from '../types';

/** root/audit는 테넌트 내 다른 회사 데이터를 조회할 수 있다 */
export const canSelectOtherCompany = (role?: string | null): boolean =>
  role === 'root' || role === 'audit';

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

  if (canSelectOtherCompany(role) && hasOverride) {
    return parsed;
  }
  return company_id;
};

export const resolveCompanyScope = (req: RequestWithUser) => {
  const { tenant_id } = req.user;
  return { tenantId: tenant_id, companyId: resolveCompanyId(req) };
};
