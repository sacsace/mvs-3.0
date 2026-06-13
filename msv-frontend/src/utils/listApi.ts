import type { InternalAxiosRequestConfig } from 'axios';

const NON_LIST_GET_SUFFIX =
  /\/(?:export|sample|download|next-number|today|check-in|check-out|health|status|preview|mail|pdf|chart|stats|summary|inbox|unread-count|me|profile|permissions|refresh)(?:\/|\?|$)/i;

/** 목록 조회용 GET인지 판별 (단건·다운로드·인증 등 제외) */
export const isCollectionListGet = (config?: InternalAxiosRequestConfig | { method?: string; url?: string }) => {
  const method = config?.method?.toLowerCase();
  if (method !== 'get') return false;

  const url = String(config?.url || '').replace(/^\//, '');
  if (!url) return false;
  if (url.startsWith('auth/')) return false;
  if (/\/\d+(?:\?|$)/.test(url)) return false;
  if (NON_LIST_GET_SUFFIX.test(url)) return false;

  return true;
};

export const createEmptyListAxiosResponse = (config: InternalAxiosRequestConfig) => ({
  data: { success: true, data: [] },
  status: 200,
  statusText: 'OK',
  headers: {},
  config,
});
