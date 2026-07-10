import { create } from 'zustand';
import { companyService, partnerService, userService } from '../services/api';

const CACHE_TTL_MS = 5 * 60 * 1000;

type CacheBucket<T> = {
  data: T;
  fetchedAt: number;
  promise: Promise<T> | null;
};

interface ReferenceDataState {
  companies: CacheBucket<any[]> | null;
  users: CacheBucket<any[]> | null;
  partners: CacheBucket<any[]> | null;
  companyById: Record<number, CacheBucket<any>>;
  fetchCompanies: (force?: boolean) => Promise<any[]>;
  fetchUsers: (params?: { company_id?: number; search?: string }, force?: boolean) => Promise<any[]>;
  fetchPartners: (force?: boolean) => Promise<any[]>;
  fetchCompanyById: (id: number, force?: boolean) => Promise<any | null>;
  invalidate: () => void;
}

const isFresh = <T,>(bucket: CacheBucket<T> | null | undefined) =>
  bucket != null && Date.now() - bucket.fetchedAt < CACHE_TTL_MS;

const usersCacheKey = (params?: { company_id?: number; search?: string }) =>
  JSON.stringify({ company_id: params?.company_id ?? null, search: params?.search ?? '' });

const loadOnce = async <T,>(
  bucket: CacheBucket<T> | null | undefined,
  loader: () => Promise<T>
): Promise<T> => {
  if (bucket?.promise) return bucket.promise;
  return loader();
};

const unwrapList = (res: any): any[] => {
  if (Array.isArray(res?.data)) return res.data;
  if (Array.isArray(res)) return res;
  return [];
};

export const useReferenceDataStore = create<ReferenceDataState>((set, get) => ({
  companies: null,
  users: null,
  partners: null,
  companyById: {},

  fetchCompanies: async (force = false) => {
    const existing = get().companies;
    if (!force && isFresh(existing)) return existing!.data;

    const promise = (async () => {
      const res = await companyService.getCompanies();
      return unwrapList(res);
    })();

    set({
      companies: {
        data: force ? [] : (existing?.data ?? []),
        fetchedAt: Date.now(),
        promise,
      },
    });

    try {
      const data = await promise;
      set({ companies: { data, fetchedAt: Date.now(), promise: null } });
      return data;
    } catch (e) {
      set({ companies: existing?.data ? { ...existing, promise: null } : null });
      throw e;
    }
  },

  fetchUsers: async (params, force = false) => {
    const key = usersCacheKey(params);
    const existing = get().users;
    const sameKey = existing && (existing as any)._key === key;

    if (!force && sameKey && isFresh(existing)) return existing!.data;

    const promise = loadOnce(sameKey ? existing : null, async () => {
      const res = await userService.getUsers(params);
      return unwrapList(res);
    });

    if (!existing?.promise || !sameKey) {
      set({ users: { data: [], fetchedAt: 0, promise, _key: key } as any });
    }

    try {
      const data = await promise;
      set({ users: { data, fetchedAt: Date.now(), promise: null, _key: key } as any });
      return data;
    } catch (e) {
      set({ users: existing?.data && sameKey ? { ...existing, promise: null } : null });
      throw e;
    }
  },

  fetchPartners: async (force = false) => {
    const existing = get().partners;
    if (!force && isFresh(existing)) return existing!.data;

    const promise = (async () => {
      const res = await partnerService.getPartners();
      return unwrapList(res);
    })();

    set({
      partners: {
        data: force ? [] : (existing?.data ?? []),
        fetchedAt: Date.now(),
        promise,
      },
    });

    try {
      const data = await promise;
      set({ partners: { data, fetchedAt: Date.now(), promise: null } });
      return data;
    } catch (e) {
      set({ partners: existing?.data ? { ...existing, promise: null } : null });
      throw e;
    }
  },

  fetchCompanyById: async (id: number, force = false) => {
    if (!Number.isFinite(id) || id <= 0) return null;
    const existing = get().companyById[id];
    if (!force && isFresh(existing)) return existing.data;

    const promise = loadOnce(existing, async () => {
      const res = await companyService.getCompany(id);
      return res?.data ?? res ?? null;
    });

    if (!existing?.promise) {
      set((s) => ({
        companyById: {
          ...s.companyById,
          [id]: { data: null, fetchedAt: 0, promise },
        },
      }));
    }

    try {
      const data = await promise;
      set((s) => ({
        companyById: {
          ...s.companyById,
          [id]: { data, fetchedAt: Date.now(), promise: null },
        },
      }));
      return data;
    } catch (e) {
      set((s) => {
        const prev = s.companyById[id];
        const next = { ...s.companyById };
        if (prev?.data != null) {
          next[id] = { ...prev, promise: null };
        } else {
          delete next[id];
        }
        return { companyById: next };
      });
      throw e;
    }
  },

  invalidate: () => set({ companies: null, users: null, partners: null, companyById: {} }),
}));

/** 회사 목록에서 현재 사용자 회사 또는 첫 회사 정보 추출 */
export async function resolveHeaderCompanyInfo(
  user: { company_id?: number } | null
): Promise<{ name: string; logo: string }> {
  const store = useReferenceDataStore.getState();
  try {
    if (user?.company_id) {
      const company = await store.fetchCompanyById(Number(user.company_id));
      if (company) {
        return { name: company.name || '', logo: company.company_logo || '' };
      }
    }
    const companies = await store.fetchCompanies();
    if (companies.length > 0) {
      const company = companies[0];
      return { name: company.name || '', logo: company.company_logo || '' };
    }
  } catch {
    /* ignore */
  }
  return { name: '', logo: '' };
}

/** 활성 사용자 목록 — 회사·테넌트·본인 제외 필터 */
export function filterActiveCompanyUsers(
  users: any[],
  opts: { companyId?: number; tenantId?: number | null; excludeUserId?: number }
): any[] {
  const { companyId, tenantId, excludeUserId } = opts;
  return users.filter((u) => {
    if (u.status !== 'active') return false;
    if (companyId != null && companyId > 0 && Number(u.company_id) !== companyId) return false;
    if (
      tenantId != null &&
      Number.isInteger(tenantId) &&
      u.tenant_id != null &&
      Number(u.tenant_id) !== tenantId
    ) {
      return false;
    }
    if (excludeUserId != null && Number(u.id) === excludeUserId) return false;
    return true;
  });
}
