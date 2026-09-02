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
  if (trimmed.startsWith('data:') || trimmed.startsWith('blob:')) return trimmed;

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

const fileNameFromUrl = (url: string, fallback = 'image') => {
  try {
    const path = decodeURIComponent(url.split('?')[0] || '');
    const base = path.split('/').pop() || '';
    return base.trim() || fallback;
  } catch {
    return fallback;
  }
};

/** 인증 포함 업로드 파일을 로컬에 저장 */
export const downloadUploadFile = async (pathOrUrl?: string | null, filename?: string) => {
  const url =
    pathOrUrl && (pathOrUrl.startsWith('http') || pathOrUrl.startsWith('blob:') || pathOrUrl.startsWith('data:'))
      ? pathOrUrl
      : getUploadUrl(pathOrUrl);
  if (!url) return;
  const suggested = (filename || fileNameFromUrl(url)).replace(/[\\/:*?"<>|]/g, '_') || 'image';
  try {
    const res = await fetch(url, { credentials: 'include' });
    if (!res.ok) throw new Error('download failed');
    const blob = await res.blob();
    const objectUrl = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = objectUrl;
    a.download = suggested;
    document.body.appendChild(a);
    a.click();
    a.remove();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 1500);
  } catch {
    window.open(url, '_blank', 'noopener,noreferrer');
  }
};

/** 제품 이미지·미디어 경로 — getUploadUrl 별칭 */
export const resolveMediaUrl = getUploadUrl;
