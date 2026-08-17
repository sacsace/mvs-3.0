import { useReferenceDataStore } from '../store/referenceDataStore';

/** 서버 `requireRootOrMinsubEmployee` 와 동일: root 또는 Minsub Ventures 소속 */
export function isMinsubCompanyName(name?: string | null): boolean {
  if (!name) return false;
  return name.toLowerCase().includes('minsub ventures');
}

export async function canAccessSystemLoginHistory(user?: {
  role?: string | null;
  company_id?: number | null;
} | null): Promise<boolean> {
  if (!user) return false;
  if (user.role === 'root') return true;
  const companyId = Number(user.company_id);
  if (!Number.isFinite(companyId) || companyId <= 0) return false;
  try {
    const company = await useReferenceDataStore.getState().fetchCompanyById(companyId);
    return isMinsubCompanyName(company?.name);
  } catch {
    return false;
  }
}
