import { API_BASE_URL, getAuthTokenFromStorage } from '../services/api/client';

/** API 베이스에서 /api 접미사 제거 (정적 파일 호스트) */
export const getApiOrigin = (): string => API_BASE_URL.replace(/\/api\/?$/, '');

/**
 * 인증이 필요한 /uploads URL 생성 (img·a 태그용 access_token 쿼리)
 * @param path `/uploads/...` 또는 `product-images/foo.jpg`
 */
export const getUploadUrl = (path?: string | null): string => {
  if (!path || typeof path !== 'string') return '';
  const trimmed = path.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('data:')) return trimmed;

  const normalized = trimmed.startsWith('http')
    ? trimmed
    : trimmed.startsWith('/uploads/')
      ? trimmed
      : `/uploads/${trimmed.replace(/^\/+/, '')}`;

  if (normalized.startsWith('http')) return normalized;

  const origin = getApiOrigin();
  const base = `${origin}${normalized}`;
  const token = getAuthTokenFromStorage();
  if (!token) return base;

  const sep = base.includes('?') ? '&' : '?';
  return `${base}${sep}access_token=${encodeURIComponent(token)}`;
};

/** 제품 이미지·미디어 경로 — getUploadUrl 별칭 */
export const resolveMediaUrl = getUploadUrl;
