import axios from 'axios';
import { useErrorStore } from '../store/errorStore';

// API Base URL 동적 설정
// - 프로덕션(Railway 등): 빌드 시 주입된 REACT_APP_API_URL 최우선. 없으면 동일 오리진 /api (리버스 프록시·같은 서비스용).
// - 개발: LAN IPv4 / 단일 호스트명은 REACT_APP_API_URL보다 우선(백엔드 :5000).
// - 그다음 REACT_APP_API_URL, localhost:5000/api
const getApiBaseUrl = (): string => {
  const normalizeApiUrl = (raw: string) => {
    const trimmed = raw.trim().replace(/\/+$/, '');
    return trimmed.endsWith('/api') ? trimmed : `${trimmed}/api`;
  };

  // 프로덕션: API가 별도 Railway 서비스인 경우 빌드 변수 필수에 가깝게 처리
  if (process.env.NODE_ENV === 'production') {
    const fromEnv = process.env.REACT_APP_API_URL?.trim();
    if (fromEnv) {
      return normalizeApiUrl(fromEnv);
    }
    if (typeof window !== 'undefined' && window.location?.origin) {
      console.warn(
        '[MVS] REACT_APP_API_URL이 없습니다. 동일 오리진의 /api 로 요청합니다. API가 다른 호스트면 Railway 빌드에 REACT_APP_API_URL을 설정하세요.'
      );
      return `${window.location.origin.replace(/\/+$/, '')}/api`;
    }
  }

  if (typeof window !== 'undefined') {
    const { hostname } = window.location;

    // 1) IPv4 (예: 192.168.x.x) — env의 localhost보다 항상 먼저
    if (hostname.match(/^\d+\.\d+\.\d+\.\d+$/)) {
      return `http://${hostname}:5000/api`;
    }

    // 2) 개발: http://PC이름:3000 형태 (점 없는 단일 호스트명)
    if (process.env.NODE_ENV === 'development' && !hostname.includes('.')) {
      if (hostname !== 'localhost' && hostname !== '::1') {
        return `http://${hostname}:5000/api`;
      }
    }
  }

  if (process.env.REACT_APP_API_URL) {
    const envApiUrl = process.env.REACT_APP_API_URL.trim();
    const localhostMatch = envApiUrl.match(/^https?:\/\/(localhost|127\.0\.0\.1)(?::(\d+))?(\/api)?\/?$/);
    const envPort = localhostMatch?.[2];

    if (envPort && envPort !== '5000') {
      console.warn('⚠️ REACT_APP_API_URL가 프론트 포트로 설정됨. 5000으로 보정합니다:', envApiUrl);
      return 'http://localhost:5000/api';
    }

    return normalizeApiUrl(envApiUrl);
  }

  if (typeof window !== 'undefined') {
    const { protocol, hostname, port } = window.location;

    if (hostname === 'localhost' || hostname === '127.0.0.1' || hostname === '::1') {
      return 'http://localhost:5000/api';
    }

    const apiPort = port ? `:${port}` : '';
    return `${protocol}//${hostname}${apiPort}/api`;
  }

  return 'http://localhost:5000/api';
};

const API_BASE_URL = getApiBaseUrl();
const AUTH_STORAGE_KEY = 'mvs-auth-storage';

/** 인증 스냅샷은 localStorage 대신 sessionStorage (탭 단위, 서버 데이터와 혼동 방지) */
const authStorage = {
  getItem: (key: string) => (typeof window !== 'undefined' ? window.sessionStorage.getItem(key) : null),
  setItem: (key: string, value: string) => {
    if (typeof window !== 'undefined') window.sessionStorage.setItem(key, value);
  },
  removeItem: (key: string) => {
    if (typeof window !== 'undefined') window.sessionStorage.removeItem(key);
  }
};
const SESSION_WARNING_MS = 30 * 1000; // 30초
const SESSION_CHECK_INTERVAL_MS = 5 * 1000; // 5초
const REFRESH_COOLDOWN_MS = 10 * 1000; // 10초
const ACTIVITY_REFRESH_WINDOW_MS = 2 * 60 * 1000; // 만료 2분 전부터 활동 기반 연장
const ACTIVITY_RECENT_WINDOW_MS = 5 * 60 * 1000; // 최근 5분 활동은 "사용 중"으로 간주
const ACTIVE_SESSION_REFRESH_COOLDOWN_MS = 3 * 60 * 1000; // 사용 중일 때 3분마다 선제 갱신
const CRITICAL_REFRESH_WINDOW_MS = SESSION_WARNING_MS; // 만료 임계 구간(30초)에서는 쿨다운 무시

// API Base URL을 export하여 다른 컴포넌트에서도 사용 가능하도록 함
export { getApiBaseUrl, API_BASE_URL };

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

let expiryWarningShownForToken: string | null = null;
let refreshPromise: Promise<string | null> | null = null;
let lastRefreshAt = 0;
let lastUserActivityAt = Date.now();
const isUserRecentlyActive = () => Date.now() - lastUserActivityAt <= ACTIVITY_RECENT_WINDOW_MS;

const readStoredAuthToken = (): { raw: string; parsed: any; token: string } | null => {
  try {
    const raw = authStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw);
    const token = parsed?.state?.token;
    if (!token || typeof token !== 'string') return null;
    return { raw, parsed, token };
  } catch (error) {
    console.error('저장된 인증 정보 파싱 오류:', error);
    return null;
  }
};

export const getAuthTokenFromStorage = (): string | null => readStoredAuthToken()?.token ?? null;

const updateStoredAuthToken = (token: string) => {
  try {
    const raw = authStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return;
    const parsed = JSON.parse(raw);
    if (!parsed?.state) return;
    parsed.state.token = token;
    authStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(parsed));
  } catch (error) {
    console.error('저장된 인증 정보 갱신 오류:', error);
  }
};

const clearAuthAndRedirectLogin = () => {
  authStorage.removeItem(AUTH_STORAGE_KEY);
  if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
    window.location.href = '/login';
  }
};

const isAuthBypassEndpoint = (url?: string) => {
  if (!url) return false;
  return (
    url.includes('/auth/login') ||
    url.includes('/auth/register') ||
    url.includes('/auth/signup/payment-order') ||
    url.includes('/auth/refresh')
  );
};

const showSessionExpiryWarning = (token: string) => {
  // 사용자가 최근에 활동 중이면 경고 대신 자동 연장 흐름에 맡긴다.
  if (isUserRecentlyActive()) return;
  if (expiryWarningShownForToken === token) return;
  expiryWarningShownForToken = token;
  const errorStore = useErrorStore.getState();
  errorStore.showNotification('세션이 30초 후 만료됩니다. 작업을 계속하면 자동으로 연장됩니다.', 'warning');
};

const shouldSkipSessionRefresh = (config: any) =>
  config?.headers?.['x-skip-session-refresh'] === 'true';

const requestSessionRefresh = async (currentToken: string): Promise<string | null> => {
  if (refreshPromise) return refreshPromise;

  refreshPromise = (async () => {
    try {
      const response = await api.post(
        '/auth/refresh',
        {},
        {
          headers: {
            Authorization: `Bearer ${currentToken}`,
            'x-skip-session-refresh': 'true',
            'x-skip-error-popup': 'true'
          }
        }
      );
      const refreshedToken = response?.data?.data?.token;
      if (typeof refreshedToken === 'string' && refreshedToken.length > 0) {
        updateStoredAuthToken(refreshedToken);
        expiryWarningShownForToken = null;
        return refreshedToken;
      }
      return null;
    } catch (error) {
      console.warn('세션 자동 연장 실패:', error);
      return null;
    } finally {
      lastRefreshAt = Date.now();
      refreshPromise = null;
    }
  })();

  return refreshPromise;
};

const markUserActivity = () => {
  lastUserActivityAt = Date.now();
};

const maybeRefreshSessionByActivity = async () => {
  const storedAuth = readStoredAuthToken();
  if (!storedAuth?.token) return;

  const expirationTime = getTokenExpiration(storedAuth.token);
  if (!expirationTime) return;

  const now = Date.now();
  const remainingTime = expirationTime - now;
  if (remainingTime <= 0) {
    clearAuthAndRedirectLogin();
    return;
  }

  const isNearExpiry = remainingTime <= ACTIVITY_REFRESH_WINDOW_MS;
  const isRecentlyActive = now - lastUserActivityAt <= ACTIVITY_RECENT_WINDOW_MS;
  const nearExpiryRefreshTooSoon = now - lastRefreshAt < REFRESH_COOLDOWN_MS;
  const activeSessionRefreshTooSoon = now - lastRefreshAt < ACTIVE_SESSION_REFRESH_COOLDOWN_MS;

  // 1) 만료 임박: 빠르게 연장 시도
  // 2) 사용 중: 만료 임박이 아니어도 주기적으로 선제 연장
  if (isNearExpiry) {
    const isCriticalExpiry = remainingTime <= CRITICAL_REFRESH_WINDOW_MS;
    if (!isCriticalExpiry && nearExpiryRefreshTooSoon) return;
  } else {
    if (!isRecentlyActive || activeSessionRefreshTooSoon) return;
  }

  const refreshedToken = await requestSessionRefresh(storedAuth.token);
  if (!refreshedToken && remainingTime <= SESSION_WARNING_MS) {
    showSessionExpiryWarning(storedAuth.token);
  }
};

// 요청 인터셉터
api.interceptors.request.use(
  async (config) => {
    const storedAuth = readStoredAuthToken();
    if (storedAuth?.token) {
      let activeToken = storedAuth.token;
      const skipRefresh = shouldSkipSessionRefresh(config);
      const expirationTime = getTokenExpiration(activeToken);

      if (expirationTime) {
        const remainingTime = expirationTime - Date.now();
        if (remainingTime <= 0) {
          clearAuthAndRedirectLogin();
          return Promise.reject(new Error('세션이 만료되었습니다.'));
        }

        if (remainingTime <= SESSION_WARNING_MS && !isUserRecentlyActive()) {
          showSessionExpiryWarning(activeToken);
        } else {
          expiryWarningShownForToken = null;
        }

        const isCriticalExpiry = remainingTime <= CRITICAL_REFRESH_WINDOW_MS;
        const shouldRefresh =
          !skipRefresh &&
          !isAuthBypassEndpoint(config.url) &&
          (isCriticalExpiry || Date.now() - lastRefreshAt >= REFRESH_COOLDOWN_MS);

        if (shouldRefresh) {
          const refreshedToken = await requestSessionRefresh(activeToken);
          if (refreshedToken) {
            activeToken = refreshedToken;
          }
        }
      }

      config.headers.Authorization = `Bearer ${activeToken}`;
    } else {
      console.warn('⚠️ [API 요청] sessionStorage에 토큰 없음:', config.url);
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

const decodeJwtPayload = (token: string): any | null => {
  try {
    const parts = token.split('.');
    if (parts.length < 2) return null;
    const payloadPart = parts[1];
    const normalized = payloadPart.replace(/-/g, '+').replace(/_/g, '/');
    const padded = normalized + '='.repeat((4 - (normalized.length % 4)) % 4);
    const decoded = atob(padded);
    return JSON.parse(decoded);
  } catch (error) {
    console.error('토큰 파싱 오류:', error);
    return null;
  }
};

// JWT 토큰 만료 시간 추출 함수
const getTokenExpiration = (token: string): number | null => {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return null;
  return payload.exp * 1000; // exp는 초 단위이므로 밀리초로 변환
};

// 세션 타임아웃 체크 및 자동 로그아웃
const checkSessionTimeout = () => {
  try {
    const storedAuth = readStoredAuthToken();
    if (!storedAuth?.token) return;

    const expirationTime = getTokenExpiration(storedAuth.token);
    if (!expirationTime) return;

    const timeUntilExpiry = expirationTime - Date.now();

    if (timeUntilExpiry <= 0) {
      console.warn('⚠️ 세션이 만료되었습니다. 자동 로그아웃합니다.');
      clearAuthAndRedirectLogin();
      return;
    }

    if (timeUntilExpiry <= SESSION_WARNING_MS) {
      if (!isUserRecentlyActive()) {
        showSessionExpiryWarning(storedAuth.token);
      } else {
        expiryWarningShownForToken = null;
      }
      // API 호출이 없는 화면에서도 "실사용 중"이면 세션을 자동 연장
      if (isUserRecentlyActive()) {
        void maybeRefreshSessionByActivity();
      }
    } else {
      expiryWarningShownForToken = null;
    }
  } catch (error) {
    console.error('세션 타임아웃 체크 오류:', error);
  }
};

// 주기적으로 세션 타임아웃 체크 (5초마다)
setInterval(checkSessionTimeout, SESSION_CHECK_INTERVAL_MS);

if (typeof window !== 'undefined') {
  const activityEvents: Array<keyof WindowEventMap> = [
    'click',
    'keydown',
    'mousemove',
    'scroll',
    'touchstart',
    'focus'
  ];

  const onActivity = () => {
    markUserActivity();
    void maybeRefreshSessionByActivity();
  };

  activityEvents.forEach((eventName) => {
    window.addEventListener(eventName, onActivity, { passive: true });
  });

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      onActivity();
    }
  });
}

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    return response;
  },
  async (error) => {
    // 에러 로깅 (개발용)
    console.error('❌ [API 응답] 오류:', {
      status: error.response?.status,
      message: error.response?.data?.message || error.message,
      url: error.config?.url,
      method: error.config?.method
    });

    const skipErrorPopup =
      error.config?.headers?.['x-skip-error-popup'] === 'true' ||
      (typeof error.config?.url === 'string' && /\/hr\/attendances\/(today|check-in|check-out)/.test(error.config.url));

    // 인증 오류 처리 (401, 403)
    // 로그인 API 호출 시에는 리다이렉트하지 않음 (로그인 페이지에서 오류 메시지 표시)
    const isLoginEndpoint = error.config?.url?.includes('/auth/login');
    
    if (error.response?.status === 401 || error.response?.status === 403) {
      // 로그인 API가 아닌 경우에만 리다이렉트 처리
      if (!isLoginEndpoint) {
        const isUnauthorized = error.response?.status === 401;
        const canRetryWithRefresh =
          isUnauthorized &&
          !shouldSkipSessionRefresh(error.config) &&
          !isAuthBypassEndpoint(error.config?.url) &&
          !error.config?._retry;

        if (canRetryWithRefresh) {
          const storedAuth = readStoredAuthToken();
          if (storedAuth?.token) {
            const refreshedToken = await requestSessionRefresh(storedAuth.token);
            if (refreshedToken) {
              error.config._retry = true;
              error.config.headers = {
                ...(error.config.headers || {}),
                Authorization: `Bearer ${refreshedToken}`
              };
              return api.request(error.config);
            }
          }
        }

        // 403 (유효하지 않은 토큰) 또는 401 (인증 필요) 오류 시
        if (error.response?.data?.message === '유효하지 않은 토큰입니다.' || 
            error.response?.status === 401) {
          // 로그아웃 처리
          authStorage.removeItem('mvs-auth-storage');
          // 로그인 페이지로 리다이렉트
          if (window.location.pathname !== '/login' && window.location.pathname !== '/') {
            window.location.href = '/login';
          }
          return Promise.reject(error);
        }
      }
    }

    // 일반 에러 처리 - 팝업으로 표시
    // 인증 오류가 아니고, 로그인 API가 아닌 경우에만 팝업 표시
    // 로그인 API는 로그인 페이지에서 직접 오류 메시지를 표시하므로 팝업을 표시하지 않음
    // 429 Rate Limit 오류는 특별 처리 (재시도 안내)
    if (!skipErrorPopup && error.response?.status === 429) {
      const errorStore = useErrorStore.getState();
      errorStore.showError(
        '요청 한도 초과',
        '너무 많은 요청이 발생했습니다. 잠시 후 다시 시도해주세요.',
        undefined,
        'warning'
      );
      return Promise.reject(error);
    }
    
    if (!skipErrorPopup && error.response?.status !== 401 && error.response?.status !== 403 && !isLoginEndpoint) {
      const errorStore = useErrorStore.getState();
      const errorMessage = error.response?.data?.message || error.message || '알 수 없는 오류가 발생했습니다.';
      const errorTitle = getErrorTitle(error.response?.status);
      const status = error.response?.status;

      // 400 검증 오류(중복 휴가 등)는 모달 대신 알림(Snackbar)으로 표시
      if (status === 400) {
        errorStore.showNotification(errorMessage, 'warning');
      } else {
        errorStore.showError(
          errorTitle,
          errorMessage,
          process.env.NODE_ENV === 'development' ? getErrorDetails(error) : undefined,
          getErrorType(status)
        );
      }
    }

    return Promise.reject(error);
  }
);

// 에러 상태 코드에 따른 제목 반환
function getErrorTitle(status?: number): string {
  switch (status) {
    case 400:
      return '요청 오류';
    case 404:
      return '찾을 수 없음';
    case 500:
    case 502:
    case 503:
      return '서버 오류';
    case 504:
      return '시간 초과';
    default:
      return '오류 발생';
  }
}

// 에러 상태 코드에 따른 타입 반환
function getErrorType(status?: number): 'error' | 'warning' | 'info' {
  if (!status) return 'error';
  if (status >= 500) return 'error';
  if (status >= 400) return 'warning';
  return 'info';
}

// 개발 환경에서만 상세 정보 반환
function getErrorDetails(error: any): string {
  const details: string[] = [];
  
  if (error.config) {
    details.push(`URL: ${error.config.method?.toUpperCase()} ${error.config.url}`);
  }
  
  if (error.response) {
    details.push(`Status: ${error.response.status}`);
    if (error.response.data) {
      details.push(`Response: ${JSON.stringify(error.response.data, null, 2)}`);
    }
  }
  
  if (error.stack) {
    details.push(`Stack: ${error.stack}`);
  }
  
  return details.join('\n\n');
}

// 회사 정보 API 서비스
export const companyService = {
  // 회사 목록 조회
  getCompanies: async () => {
    try {
      const response = await api.get('/company');
      return response.data;
    } catch (error) {
      console.error('회사 정보 로드 오류:', error);
      throw error;
    }
  },

  // 특정 회사 조회
  getCompany: async (id: number) => {
    try {
      const response = await api.get(`/company/${id}`);
      return response.data;
    } catch (error) {
      console.error('회사 정보 로드 오류:', error);
      throw error;
    }
  },

  // 특정 회사 GST 번호 조회
  getCompanyGstNumbers: async (id: number) => {
    try {
      const response = await api.get(`/company/${id}/gst-numbers`);
      return response.data;
    } catch (error) {
      console.error('회사 GST 번호 로드 오류:', error);
      throw error;
    }
  },

  // 회사 생성
  createCompany: async (companyData: any) => {
    try {
      const response = await api.post('/company', companyData);
      return response.data;
    } catch (error) {
      console.error('회사 생성 오류:', error);
      throw error;
    }
  },

  // 회사 수정
  updateCompany: async (id: number, companyData: any) => {
    try {
      const response = await api.put(`/company/${id}`, companyData);
      return response.data;
    } catch (error) {
      console.error('회사 수정 오류:', error);
      throw error;
    }
  },

  // 회사 삭제
  deleteCompany: async (id: number) => {
    try {
      const response = await api.delete(`/company/${id}`);
      return response.data;
    } catch (error) {
      console.error('회사 삭제 오류:', error);
      throw error;
    }
  }
};

// 사용자 API 서비스
export const userService = {
  getUsers: async (params?: { search?: string; company_id?: number }) => {
    try {
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      console.error('사용자 목록 조회 오류:', error);
      throw error;
    }
  }
};

// 로그인 정보 관리 API 서비스
export const loginInfoService = {
  getLoginInfoTabs: async (companyId: number) => {
    try {
      const response = await api.get('/login-info/tabs', { params: { company_id: companyId } });
      return response.data;
    } catch (error) {
      console.error('로그인 정보 탭 조회 오류:', error);
      throw error;
    }
  },

  createLoginInfoTab: async (data: { company_id: number; name: string }) => {
    try {
      const response = await api.post('/login-info/tabs', data);
      return response.data;
    } catch (error) {
      console.error('로그인 정보 탭 추가 오류:', error);
      throw error;
    }
  },

  updateLoginInfoTab: async (
    tabId: number,
    data: {
      name?: string;
      column_headers?: Record<string, string> | null;
      column_hidden?: string[] | null;
      column_schema?: {
        columns: Array<
          | { kind: 'builtin'; key: string }
          | { kind: 'custom'; id: string; label: string }
        >;
      } | null;
    }
  ) => {
    try {
      const response = await api.put(`/login-info/tabs/${tabId}`, data);
      return response.data;
    } catch (error) {
      console.error('로그인 정보 탭 수정 오류:', error);
      throw error;
    }
  },

  deleteLoginInfoTab: async (tabId: number) => {
    try {
      const response = await api.delete(`/login-info/tabs/${tabId}`);
      return response.data;
    } catch (error) {
      console.error('로그인 정보 탭 삭제 오류:', error);
      throw error;
    }
  },

  // 로그인 정보 목록 조회 (company_id + tab_id 필수)
  getLoginInfos: async (params: { company_id: number; tab_id: number }) => {
    try {
      const response = await api.get('/login-info', { params });
      return response.data;
    } catch (error) {
      console.error('로그인 정보 목록 조회 오류:', error);
      throw error;
    }
  },

  // 로그인 로그 목록 조회
  getLoginLogs: async (params?: {
    company_id?: number;
    status?: 'success' | 'failure' | '';
    userid?: string;
    start_date?: string;
    end_date?: string;
    limit?: number;
  }) => {
    try {
      const response = await api.get('/login-info/logs', { params });
      return response.data;
    } catch (error) {
      console.error('로그인 로그 목록 조회 오류:', error);
      throw error;
    }
  },

  // 로그인 정보 생성
  createLoginInfo: async (data: any) => {
    try {
      const response = await api.post('/login-info', data);
      return response.data;
    } catch (error) {
      console.error('로그인 정보 생성 오류:', error);
      throw error;
    }
  },

  // 로그인 정보 수정
  updateLoginInfo: async (id: number, data: any) => {
    try {
      const response = await api.put(`/login-info/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('로그인 정보 수정 오류:', error);
      throw error;
    }
  },

  // 로그인 정보 삭제
  deleteLoginInfo: async (id: number) => {
    try {
      const response = await api.delete(`/login-info/${id}`);
      return response.data;
    } catch (error) {
      console.error('로그인 정보 삭제 오류:', error);
      throw error;
    }
  },

  // 엑셀 가져오기
  importExcel: async (file: File, companyId: number, tabId: number) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('company_id', String(companyId));
      formData.append('tab_id', String(tabId));
      const response = await api.post('/login-info/import', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('로그인 정보 엑셀 가져오기 오류:', error);
      throw error;
    }
  }
};

// 회계 관리 API 서비스
export const accountingService = {
  // 인보이스 목록 조회
  getInvoices: async (params?: any) => {
    try {
      const response = await api.get('/accounting/invoices', { params });
      return response.data;
    } catch (error) {
      console.error('인보이스 목록 조회 오류:', error);
      throw error;
    }
  },

  // 다음 인보이스 번호 조회
  getNextInvoiceNumber: async () => {
    try {
      const response = await api.get('/accounting/invoices/next-number');
      return response.data;
    } catch (error) {
      console.error('인보이스 번호 조회 오류:', error);
      throw error;
    }
  },

  // 특정 인보이스 조회
  getInvoice: async (id: number) => {
    try {
      const response = await api.get(`/accounting/invoices/${id}`);
      return response.data;
    } catch (error) {
      console.error('인보이스 조회 오류:', error);
      throw error;
    }
  },

  approveInvoice: async (id: number) => {
    try {
      const response = await api.post(`/accounting/invoices/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('인보이스 승인 오류:', error);
      throw error;
    }
  },

  rejectInvoice: async (id: number) => {
    try {
      const response = await api.post(`/accounting/invoices/${id}/reject`);
      return response.data;
    } catch (error) {
      console.error('인보이스 반려 오류:', error);
      throw error;
    }
  },

  // 인보이스 생성
  createInvoice: async (invoiceData: any) => {
    try {
      const response = await api.post('/accounting/invoices', invoiceData);
      return response.data;
    } catch (error) {
      console.error('인보이스 생성 오류:', error);
      throw error;
    }
  },

  /** 인보이스 PDF 첨부 메일 — 본문 대용량·SMTP 지연 대비 타임아웃 연장 (기본 10초 초과 방지) */
  sendInvoiceEmail: async (id: number, data: { to: string; subject?: string; message?: string; filename?: string }) => {
    try {
      const response = await api.post(`/accounting/invoices/${id}/send-email`, data, {
        timeout: 120000
      });
      return response.data;
    } catch (error) {
      console.error('인보이스 이메일 전송 오류:', error);
      throw error;
    }
  },

  // 인보이스 수정
  updateInvoice: async (id: number, invoiceData: any) => {
    try {
      const response = await api.put(`/accounting/invoices/${id}`, invoiceData);
      return response.data;
    } catch (error) {
      console.error('인보이스 수정 오류:', error);
      throw error;
    }
  },

  // 인보이스 상태/결제상태 업데이트
  updateInvoiceStatus: async (
    id: number,
    data: {
      status?: string;
      payment_status?: string;
      payment_method?: string;
      payment_date?: string;
    }
  ) => {
    try {
      const response = await api.put(`/accounting/invoices/${id}/status`, data);
      return response.data;
    } catch (error) {
      console.error('인보이스 상태 업데이트 오류:', error);
      throw error;
    }
  },

  // 인보이스 삭제 승인 요청 (직접 삭제 아님)
  deleteInvoice: async (
    id: number,
    data: { approver_user_id: number; memo?: string }
  ) => {
    try {
      const response = await api.delete(`/accounting/invoices/${id}`, { data });
      return response.data;
    } catch (error) {
      console.error('인보이스 삭제 오류:', error);
      throw error;
    }
  },

  // 회계 통계 조회
  getAccountingStats: async (params?: any) => {
    try {
      const response = await api.get('/accounting/stats', { params });
      return response.data;
    } catch (error) {
      console.error('회계 통계 조회 오류:', error);
      throw error;
    }
  },

  // 지출결의서 목록 조회
  getExpenseReports: async (params?: any) => {
    try {
      const response = await api.get('/accounting/expenses', { params });
      return response.data;
    } catch (error) {
      console.error('지출결의서 조회 오류:', error);
      throw error;
    }
  },

  // 지출결의서 상세 조회
  getExpenseReport: async (id: number) => {
    try {
      const response = await api.get(`/accounting/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('지출결의서 상세 조회 오류:', error);
      throw error;
    }
  },

  // 지출결의서 생성
  createExpenseReport: async (data: any) => {
    try {
      const response = await api.post('/accounting/expenses', data);
      return response.data;
    } catch (error) {
      console.error('지출결의서 생성 오류:', error);
      throw error;
    }
  },

  // 지출결의서 수정
  updateExpenseReport: async (id: number, data: any) => {
    try {
      const response = await api.put(`/accounting/expenses/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('지출결의서 수정 오류:', error);
      throw error;
    }
  },

  // 지출결의서 삭제
  deleteExpenseReport: async (id: number) => {
    try {
      const response = await api.delete(`/accounting/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('지출결의서 삭제 오류:', error);
      throw error;
    }
  },

  // 지출결의서 상태 변경
  updateExpenseReportStatus: async (id: number, status: string) => {
    try {
      const response = await api.put(`/accounting/expenses/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('지출결의서 상태 변경 오류:', error);
      throw error;
    }
  },

  // 지출결의서 영수증 업로드 토큰 발급
  getReceiptUploadToken: async (id: number) => {
    try {
      const response = await api.get(`/accounting/expenses/${id}/receipt-upload-token`);
      return response.data;
    } catch (error) {
      console.error('영수증 업로드 토큰 발급 오류:', error);
      throw error;
    }
  },

  // 토큰으로 영수증 업로드 (휴대폰에서 사용)
  uploadExpenseReceipt: async (token: string, file: File) => {
    try {
      const formData = new FormData();
      formData.append('token', token);
      formData.append('file', file);
      const response = await api.post('/accounting/expenses/upload-receipt', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('영수증 업로드 오류:', error);
      throw error;
    }
  },

  // 지출결의서 영수증 업로드 (웹)
  uploadExpenseReceiptById: async (id: number, files: File[]) => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const response = await api.post(`/accounting/expenses/${id}/upload-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('영수증 업로드 오류(웹):', error);
      throw error;
    }
  },

  // 지출결의서 결제 요청
  requestExpensePayment: async (id: number) => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/request-payment`);
      return response.data;
    } catch (error) {
      console.error('결제 요청 오류:', error);
      throw error;
    }
  },

  // 지출결의서 결제 반려
  rejectExpensePayment: async (id: number, reason?: string) => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/reject-payment`, { reason });
      return response.data;
    } catch (error) {
      console.error('결제 반려 오류:', error);
      throw error;
    }
  },

  // 지출결의서 최종 승인
  approveExpensePayment: async (id: number, reason?: string) => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/approve-payment`, { reason });
      return response.data;
    } catch (error) {
      console.error('결제 승인 오류:', error);
      throw error;
    }
  },

  // 지출결의서 결제 완료 처리 + 송금
  completeExpensePayment: async (id: number, provider?: 'icici' | 'kotak') => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/complete-payment`, { provider });
      return response.data;
    } catch (error) {
      console.error('결제 완료 처리 오류:', error);
      throw error;
    }
  },

  // 은행 송금 재시도
  retryExpenseTransfer: async (id: number, provider?: 'icici' | 'kotak') => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/retry-transfer`, { provider });
      return response.data;
    } catch (error) {
      console.error('송금 재시도 오류:', error);
      throw error;
    }
  },

  // 예산 목록 조회
  getBudgets: async (params?: any) => {
    try {
      const response = await api.get('/accounting/budgets', { params });
      return response.data;
    } catch (error) {
      console.error('예산 조회 오류:', error);
      throw error;
    }
  },

  // 예산 생성
  createBudget: async (data: any) => {
    try {
      const response = await api.post('/accounting/budgets', data);
      return response.data;
    } catch (error) {
      console.error('예산 생성 오류:', error);
      throw error;
    }
  },

  // 예산 수정
  updateBudget: async (id: number, data: any) => {
    try {
      const response = await api.put(`/accounting/budgets/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('예산 수정 오류:', error);
      throw error;
    }
  },

  // 예산 삭제
  deleteBudget: async (id: number) => {
    try {
      const response = await api.delete(`/accounting/budgets/${id}`);
      return response.data;
    } catch (error) {
      console.error('예산 삭제 오류:', error);
      throw error;
    }
  },

  // 자산 목록 조회
  getAssets: async (params?: any) => {
    try {
      const response = await api.get('/accounting/assets', { params });
      return response.data;
    } catch (error) {
      console.error('자산 조회 오류:', error);
      throw error;
    }
  },

  // 자산 생성
  createAsset: async (data: any) => {
    try {
      const response = await api.post('/accounting/assets', data);
      return response.data;
    } catch (error) {
      console.error('자산 생성 오류:', error);
      throw error;
    }
  },

  // 자산 수정
  updateAsset: async (id: number, data: any) => {
    try {
      const response = await api.put(`/accounting/assets/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('자산 수정 오류:', error);
      throw error;
    }
  },

  // 자산 삭제
  deleteAsset: async (id: number) => {
    try {
      const response = await api.delete(`/accounting/assets/${id}`);
      return response.data;
    } catch (error) {
      console.error('자산 삭제 오류:', error);
      throw error;
    }
  }
};

// 인사 관리 API 서비스
export const hrService = {
  // 급여 목록 조회
  getPayrolls: async (params?: any) => {
    try {
      const response = await api.get('/hr/payrolls', { params });
      return response.data;
    } catch (error) {
      console.error('급여 목록 조회 오류:', error);
      throw error;
    }
  },

  // 특정 급여 조회
  getPayroll: async (id: number) => {
    try {
      const response = await api.get(`/hr/payrolls/${id}`);
      return response.data;
    } catch (error) {
      console.error('급여 조회 오류:', error);
      throw error;
    }
  },

  // 급여 생성
  createPayroll: async (payrollData: any) => {
    try {
      const response = await api.post('/hr/payrolls', payrollData);
      return response.data;
    } catch (error) {
      console.error('급여 생성 오류:', error);
      throw error;
    }
  },

  // 급여 수정
  updatePayroll: async (id: number, payrollData: any) => {
    try {
      const response = await api.put(`/hr/payrolls/${id}`, payrollData);
      return response.data;
    } catch (error) {
      console.error('급여 수정 오류:', error);
      throw error;
    }
  },

  // 급여 삭제
  deletePayroll: async (id: number) => {
    try {
      const response = await api.delete(`/hr/payrolls/${id}`);
      return response.data;
    } catch (error) {
      console.error('급여 삭제 오류:', error);
      throw error;
    }
  },

  // 직원 목록 조회
  getEmployees: async () => {
    try {
      const response = await api.get('/hr/employees');
      return response.data;
    } catch (error) {
      console.error('직원 목록 조회 오류:', error);
      throw error;
    }
  }
};

// 재고 관리 API 서비스
export const inventoryService = {
  getProductCategories: async () => {
    try {
      const response = await api.get('/inventory/product-categories');
      return response.data;
    } catch (error) {
      console.error('제품 카테고리 목록 오류:', error);
      throw error;
    }
  },
  createProductCategory: async (name: string) => {
    try {
      const response = await api.post('/inventory/product-categories', { name });
      return response.data;
    } catch (error) {
      console.error('제품 카테고리 등록 오류:', error);
      throw error;
    }
  },
  updateProductCategory: async (id: number, name: string) => {
    try {
      const response = await api.put(`/inventory/product-categories/${id}`, { name });
      return response.data;
    } catch (error) {
      console.error('제품 카테고리 수정 오류:', error);
      throw error;
    }
  },
  deleteProductCategory: async (id: number) => {
    try {
      const response = await api.delete(`/inventory/product-categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('제품 카테고리 삭제 오류:', error);
      throw error;
    }
  },
  getInventoryLocations: async () => {
    try {
      const response = await api.get('/inventory/inventory-locations');
      return response.data;
    } catch (error) {
      console.error('보관 위치 목록 오류:', error);
      throw error;
    }
  },
  createInventoryLocation: async (name: string) => {
    try {
      const response = await api.post('/inventory/inventory-locations', { name });
      return response.data;
    } catch (error) {
      console.error('보관 위치 등록 오류:', error);
      throw error;
    }
  },
  updateInventoryLocation: async (id: number, name: string) => {
    try {
      const response = await api.put(`/inventory/inventory-locations/${id}`, { name });
      return response.data;
    } catch (error) {
      console.error('보관 위치 수정 오류:', error);
      throw error;
    }
  },
  deleteInventoryLocation: async (id: number) => {
    try {
      const response = await api.delete(`/inventory/inventory-locations/${id}`);
      return response.data;
    } catch (error) {
      console.error('보관 위치 삭제 오류:', error);
      throw error;
    }
  },
  getProductUnits: async () => {
    try {
      const response = await api.get('/inventory/product-units');
      return response.data;
    } catch (error) {
      console.error('제품 단위 목록 오류:', error);
      throw error;
    }
  },
  createProductUnit: async (name: string) => {
    try {
      const response = await api.post('/inventory/product-units', { name });
      return response.data;
    } catch (error) {
      console.error('제품 단위 등록 오류:', error);
      throw error;
    }
  },
  updateProductUnit: async (id: number, name: string) => {
    try {
      const response = await api.put(`/inventory/product-units/${id}`, { name });
      return response.data;
    } catch (error) {
      console.error('제품 단위 수정 오류:', error);
      throw error;
    }
  },
  deleteProductUnit: async (id: number) => {
    try {
      const response = await api.delete(`/inventory/product-units/${id}`);
      return response.data;
    } catch (error) {
      console.error('제품 단위 삭제 오류:', error);
      throw error;
    }
  },

  // 제품 목록 조회
  getProducts: async (params?: any) => {
    try {
      const response = await api.get('/inventory/products', { params });
      return response.data;
    } catch (error) {
      console.error('제품 목록 조회 오류:', error);
      throw error;
    }
  },

  // 특정 제품 조회
  getProduct: async (id: number) => {
    try {
      const response = await api.get(`/inventory/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('제품 조회 오류:', error);
      throw error;
    }
  },

  /** 제품 사진 업로드 → { success, data: { url } } */
  uploadProductImage: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/inventory/products/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('제품 이미지 업로드 오류:', error);
      throw error;
    }
  },

  // 제품 생성
  createProduct: async (productData: any) => {
    try {
      const response = await api.post('/inventory/products', productData);
      return response.data;
    } catch (error) {
      console.error('제품 생성 오류:', error);
      throw error;
    }
  },

  // 제품 수정
  updateProduct: async (id: number, productData: any) => {
    try {
      const response = await api.put(`/inventory/products/${id}`, productData);
      return response.data;
    } catch (error) {
      console.error('제품 수정 오류:', error);
      throw error;
    }
  },

  // 제품 삭제
  deleteProduct: async (id: number) => {
    try {
      const response = await api.delete(`/inventory/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('제품 삭제 오류:', error);
      throw error;
    }
  },

  // 재고 보고서 조회
  getInventoryReport: async () => {
    try {
      const response = await api.get('/inventory/report');
      return response.data;
    } catch (error) {
      console.error('재고 보고서 조회 오류:', error);
      throw error;
    }
  },

  // 재고 거래 내역 조회
  getInventoryTransactions: async (params?: any) => {
    try {
      const response = await api.get('/inventory/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('재고 거래 내역 조회 오류:', error);
      throw error;
    }
  },

  // 재고 입고
  stockIn: async (stockData: any) => {
    try {
      const response = await api.post('/inventory/stock-in', stockData);
      return response.data;
    } catch (error) {
      console.error('재고 입고 오류:', error);
      throw error;
    }
  },

  // 재고 출고
  stockOut: async (stockData: any) => {
    try {
      const response = await api.post('/inventory/stock-out', stockData);
      return response.data;
    } catch (error) {
      console.error('재고 출고 오류:', error);
      throw error;
    }
  },

  // 재고 조정
  adjustStock: async (adjustData: any) => {
    try {
      const response = await api.post('/inventory/adjust-stock', adjustData);
      return response.data;
    } catch (error) {
      console.error('재고 조정 오류:', error);
      throw error;
    }
  },

  /** 엑셀 일괄 반영 양식 다운로드 */
  downloadProductExcelSample: async (): Promise<Blob> => {
    const response = await api.get('/inventory/products/excel/sample', { responseType: 'blob' });
    return response.data;
  },

  /** 엑셀 업로드로 제품 일괄 등록·수정 */
  bulkUpdateProductsFromExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/inventory/products/excel/bulk-update', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

// 파트너 관리 API 서비스
export const partnerService = {
  // Excel 샘플 다운로드
  downloadExcelSample: async () => {
    const authToken = getAuthTokenFromStorage() || '';

    const response = await fetch(`${API_BASE_URL}/partners/excel/sample`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Excel 샘플 파일 다운로드에 실패했습니다.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `파트너_업체_입력_샘플_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Excel 파일 내보내기
  exportExcel: async () => {
    const authToken = getAuthTokenFromStorage() || '';

    const response = await fetch(`${API_BASE_URL}/partners/excel/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Excel 파일 내보내기에 실패했습니다.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `파트너_업체_목록_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Excel 파일 업로드
  importExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);

    const authToken = getAuthTokenFromStorage() || '';

    const response = await api.post('/partners/excel/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
        'Authorization': `Bearer ${authToken}`
      }
    });

    return response.data;
  },

  // 파트너 목록 조회
  getPartners: async () => {
    try {
      const response = await api.get('/partners');
      return response.data;
    } catch (error) {
      console.error('파트너 목록 조회 오류:', error);
      throw error;
    }
  },

  // 특정 파트너 조회
  getPartner: async (id: number) => {
    try {
      const response = await api.get(`/partners/${id}`);
      return response.data;
    } catch (error) {
      console.error('파트너 조회 오류:', error);
      throw error;
    }
  },

  // 파트너 생성
  createPartner: async (partnerData: any) => {
    try {
      const response = await api.post('/partners', partnerData);
      return response.data;
    } catch (error) {
      console.error('파트너 생성 오류:', error);
      throw error;
    }
  },

  // 파트너 수정
  updatePartner: async (id: number, partnerData: any) => {
    try {
      const response = await api.put(`/partners/${id}`, partnerData);
      return response.data;
    } catch (error) {
      console.error('파트너 수정 오류:', error);
      throw error;
    }
  },

  // 파트너 삭제
  deletePartner: async (id: number) => {
    try {
      const response = await api.delete(`/partners/${id}`);
      return response.data;
    } catch (error) {
      console.error('파트너 삭제 오류:', error);
      throw error;
    }
  }
};

// 시스템 설정 API 서비스
export const systemSettingsService = {
  // 시스템 설정 조회
  getSettings: async () => {
    try {
      const response = await api.get('/system-settings');
      return response.data;
    } catch (error) {
      console.error('시스템 설정 조회 오류:', error);
      throw error;
    }
  },

  // 시스템 설정 저장
  saveSettings: async (settings: any) => {
    try {
      const response = await api.put('/system-settings', settings);
      return response.data;
    } catch (error) {
      console.error('시스템 설정 저장 오류:', error);
      throw error;
    }
  },

  // 로고 업로드
  uploadLogo: async (logo: string) => {
    try {
      const response = await api.post('/system-settings/logo', { logo });
      return response.data;
    } catch (error) {
      console.error('로고 업로드 오류:', error);
      throw error;
    }
  },

  // 백업 실행
  runBackup: async () => {
    try {
      const response = await api.post('/system-settings/backup');
      return response.data;
    } catch (error) {
      console.error('백업 실행 오류:', error);
      throw error;
    }
  },

  /** SMTP 테스트 메일 (관리자 전용) */
  sendTestMail: async (body: { to: string; subject?: string }) => {
    try {
      const response = await api.post('/system-settings/test-mail', body);
      return response.data;
    } catch (error) {
      console.error('테스트 메일 발송 오류:', error);
      throw error;
    }
  }
};

export const officeLocationService = {
  getOfficeLocation: async () => {
    try {
      const response = await api.get('/system-settings/office-location');
      return response.data;
    } catch (error) {
      console.error('사무실 위치 조회 오류:', error);
      throw error;
    }
  }
};

// 근태 관리 API 서비스
export const attendanceService = {
  // 근태 목록 조회
  getAttendances: async (params?: { date?: string; start_date?: string; end_date?: string; status?: string }) => {
    try {
      const response = await api.get('/hr/attendances', { params });
      return response.data;
    } catch (error) {
      console.error('근태 목록 조회 오류:', error);
      throw error;
    }
  },

  /** 회사 전체 근태 (HR 통계) — admin/root/audit 만 */
  getCompanyAttendances: async (params?: {
    user_id?: number;
    date?: string;
    start_date?: string;
    end_date?: string;
    department?: string;
    status?: string;
  }) => {
    try {
      const response = await api.get('/hr/attendances/company', { params });
      return response.data;
    } catch (error) {
      console.error('회사 근태 목록 조회 오류:', error);
      throw error;
    }
  },

  // 오늘의 근태 조회
  getTodayAttendance: async (clientDate?: string) => {
    try {
      const response = await api.get('/hr/attendances/today', {
        params: clientDate ? { client_date: clientDate } : undefined
      });
      return response.data;
    } catch (error) {
      console.error('오늘의 근태 조회 오류:', error);
      throw error;
    }
  },

  // 근태 상세 조회
  getAttendance: async (id: number) => {
    try {
      const response = await api.get(`/hr/attendances/${id}`);
      return response.data;
    } catch (error) {
      console.error('근태 상세 조회 오류:', error);
      throw error;
    }
  },

  // 출근 처리
  checkIn: async (payload?: { latitude?: number; longitude?: number; accuracy?: number; client_time?: string; client_date?: string; use_server_time?: boolean; skip_geo?: boolean }) => {
    try {
      const response = await api.post('/hr/attendances/check-in', payload || {});
      return response.data;
    } catch (error) {
      console.error('출근 처리 오류:', error);
      throw error;
    }
  },

  // 퇴근 처리
  checkOut: async (payload?: { client_time?: string; client_date?: string; use_server_time?: boolean; skip_geo?: boolean }) => {
    try {
      const response = await api.post('/hr/attendances/check-out', payload || {});
      return response.data;
    } catch (error) {
      console.error('퇴근 처리 오류:', error);
      throw error;
    }
  },

  // 근태 생성
  createAttendance: async (data: { user_id: number; date: string; check_in?: string; check_out?: string; status?: string; notes?: string }) => {
    try {
      const response = await api.post('/hr/attendances', data);
      return response.data;
    } catch (error) {
      console.error('근태 생성 오류:', error);
      throw error;
    }
  },

  // 근태 수정
  updateAttendance: async (id: number, data: { check_in?: string; check_out?: string; status?: string; notes?: string }) => {
    try {
      const response = await api.put(`/hr/attendances/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('근태 수정 오류:', error);
      throw error;
    }
  },

  // 근태 삭제
  deleteAttendance: async (id: number) => {
    try {
      const response = await api.delete(`/hr/attendances/${id}`);
      return response.data;
    } catch (error) {
      console.error('근태 삭제 오류:', error);
      throw error;
    }
  }
};

export const heresnowIntegrationService = {
  getStatus: async () => {
    const response = await api.get('/hr/attendances/heresnow/status');
    return response.data;
  },
  sync: async (payload?: { since?: string }) => {
    const response = await api.post('/hr/attendances/heresnow/sync', payload || {});
    return response.data;
  },
  updateSettings: async (payload: { enabled?: boolean; externalCompanyId?: string }) => {
    const response = await api.put('/hr/attendances/heresnow/settings', payload);
    return response.data;
  }
};

export const accountingBasicInfoService = {
  getBasicInfo: async () => {
    try {
      const response = await api.get('/accounting/basic-info');
      return response.data;
    } catch (error) {
      console.error('회계 기본정보 조회 오류:', error);
      throw error;
    }
  },
  updateBasicInfo: async (data: {
    accountCategories: string[];
    expenseCategories: string[];
    taxCodes: string[];
    paymentMethods: string[];
  }) => {
    try {
      const response = await api.put('/accounting/basic-info', data);
      return response.data;
    } catch (error) {
      console.error('회계 기본정보 저장 오류:', error);
      throw error;
    }
  }
};

// 급여 관리 API 서비스
export const payrollService = {
  // 급여 목록 조회
  getPayrolls: async (params?: { page?: number; limit?: number; employee_id?: number; period?: string }) => {
    try {
      const response = await api.get('/hr/payrolls', { params });
      return response.data;
    } catch (error) {
      console.error('급여 목록 조회 오류:', error);
      throw error;
    }
  },

  // 급여 상세 조회
  getPayroll: async (id: number) => {
    try {
      const response = await api.get(`/hr/payrolls/${id}`);
      return response.data;
    } catch (error) {
      console.error('급여 상세 조회 오류:', error);
      throw error;
    }
  },

  // 급여 생성
  createPayroll: async (data: any) => {
    try {
      const response = await api.post('/hr/payrolls', data);
      return response.data;
    } catch (error) {
      console.error('급여 생성 오류:', error);
      throw error;
    }
  },

  /** 확정된 급여 근무월(YYYY-MM) 목록 */
  getPayrollPeriodLocks: async () => {
    try {
      const response = await api.get('/hr/payroll-period-locks');
      return response.data;
    } catch (error) {
      console.error('급여 월 잠금 목록 조회 오류:', error);
      throw error;
    }
  },

  /** 선택한 근무월 급여 확정(잠금) — 일반 사용자는 이후 해당 월 수정 불가 */
  completePayrollPeriod: async (payroll_period: string) => {
    try {
      const response = await api.post('/hr/payroll-periods/complete', { payroll_period });
      return response.data;
    } catch (error) {
      console.error('급여 월 확정 오류:', error);
      throw error;
    }
  },

  /** 현재 회사 활성 사용자 기준 급여 일괄 생성 (인도 PF/ESI/PT/TDS 옵션 선택 가능) */
  /** 일괄 생성 전: 확정·중복·직원별 해당 월 출퇴근 건수 요약 */
  previewBulkPayrollGeneration: async (payroll_period: string) => {
    try {
      const response = await api.post('/hr/payrolls/bulk-generate/preview', { payroll_period });
      return response.data;
    } catch (error) {
      console.error('급여 일괄 생성 미리보기 오류:', error);
      throw error;
    }
  },

  bulkGeneratePayrolls: async (
    payroll_period: string,
    opts?: {
      statutory_india?: boolean;
      /** 기본 gross_6pct(참고 시트). epf_12pct_half = 예전 50%×12% EPF식 */
      pf_mode?: 'gross_6pct' | 'epf_12pct_half';
      pf_cap_1800?: boolean;
      estimate_tds?: boolean;
    }
  ) => {
    try {
      const response = await api.post('/hr/payrolls/bulk-generate', {
        payroll_period,
        ...opts
      });
      return response.data;
    } catch (error) {
      console.error('급여 일괄 생성 오류:', error);
      throw error;
    }
  },

  /** 급여 명세서 PDF(base64)를 직원 이메일로 발송 */
  sendPayrollPayslip: async (id: number, pdf_base64: string) => {
    try {
      const response = await api.post(`/hr/payrolls/${id}/send-payslip`, { pdf_base64 });
      return response.data;
    } catch (error) {
      console.error('급여 명세서 메일 오류:', error);
      throw error;
    }
  },

  // 급여 수정
  updatePayroll: async (id: number, data: any) => {
    try {
      const response = await api.put(`/hr/payrolls/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('급여 수정 오류:', error);
      throw error;
    }
  },

  // 급여 삭제
  deletePayroll: async (id: number) => {
    try {
      const response = await api.delete(`/hr/payrolls/${id}`);
      return response.data;
    } catch (error) {
      console.error('급여 삭제 오류:', error);
      throw error;
    }
  },

  // 급여 승인
  approvePayroll: async (id: number) => {
    try {
      const response = await api.post(`/hr/payrolls/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('급여 승인 오류:', error);
      throw error;
    }
  },

  // 급여 지급
  payPayroll: async (id: number) => {
    try {
      const response = await api.post(`/hr/payrolls/${id}/pay`);
      return response.data;
    } catch (error) {
      console.error('급여 지급 오류:', error);
      throw error;
    }
  }
};

// 휴가 관리 API 서비스
export const vacationService = {
  // 휴가 목록 조회
  getVacations: async (params?: { user_id?: number; status?: string; vacation_type?: string; start_date?: string; end_date?: string; approved_by?: number; same_department?: boolean }) => {
    try {
      const response = await api.get('/hr/vacations', { params });
      return response.data;
    } catch (error) {
      console.error('휴가 목록 조회 오류:', error);
      throw error;
    }
  },

  // 휴가 상세 조회
  getVacation: async (id: number) => {
    try {
      const response = await api.get(`/hr/vacations/${id}`);
      return response.data;
    } catch (error) {
      console.error('휴가 상세 조회 오류:', error);
      throw error;
    }
  },

  // 휴가 생성
  createVacation: async (data: { user_id?: number; vacation_type: string; start_date: string; end_date: string; reason: string; attachments?: string[] }) => {
    try {
      const response = await api.post('/hr/vacations', data);
      return response.data;
    } catch (error) {
      console.error('휴가 생성 오류:', error);
      throw error;
    }
  },

  // 휴가 수정
  updateVacation: async (id: number, data: { vacation_type?: string; start_date?: string; end_date?: string; reason?: string; attachments?: string[] }) => {
    try {
      const response = await api.put(`/hr/vacations/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('휴가 수정 오류:', error);
      throw error;
    }
  },

  // 연차 정보 조회
  getAnnualLeaveInfo: async (userId?: number) => {
    try {
      const params = userId ? { user_id: userId } : {};
      const response = await api.get('/hr/vacations/annual-leave', { params });
      return response.data;
    } catch (error) {
      console.error('연차 정보 조회 오류:', error);
      throw error;
    }
  },

  // 휴가 정책 조회
  getVacationPolicy: async () => {
    try {
      const response = await api.get('/hr/vacations/policy');
      return response.data;
    } catch (error) {
      console.error('휴가 정책 조회 오류:', error);
      throw error;
    }
  },

  // 휴가 정책 저장
  updateVacationPolicy: async (data: { annualLeaveStartDays: number; annualLeaveEarnDays?: number; availableTypes?: string[] }) => {
    try {
      const response = await api.put('/hr/vacations/policy', data);
      return response.data;
    } catch (error) {
      console.error('휴가 정책 저장 오류:', error);
      throw error;
    }
  },

  // 휴가 삭제
  deleteVacation: async (id: number) => {
    try {
      const response = await api.delete(`/hr/vacations/${id}`);
      return response.data;
    } catch (error) {
      console.error('휴가 삭제 오류:', error);
      throw error;
    }
  },

  // 휴가 승인
  approveVacation: async (id: number) => {
    try {
      const response = await api.post(`/hr/vacations/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('휴가 승인 오류:', error);
      throw error;
    }
  },

  // 휴가 거부
  rejectVacation: async (id: number, rejection_reason?: string) => {
    try {
      const response = await api.post(`/hr/vacations/${id}/reject`, { rejection_reason });
      return response.data;
    } catch (error) {
      console.error('휴가 거부 오류:', error);
      throw error;
    }
  },

  // 휴가 데이터 Excel 내보내기
  exportVacationsToExcel: async (params?: { user_id?: number; status?: string; vacation_type?: string; start_date?: string; end_date?: string; approved_by?: number }) => {
    try {
      const response = await api.get('/hr/vacations/excel/export', {
        params,
        responseType: 'blob'
      });
      // response 객체 전체를 반환하여 headers에 접근 가능하도록 함
      return response;
    } catch (error) {
      console.error('휴가 Excel 내보내기 오류:', error);
      throw error;
    }
  }
};

export const employmentContractService = {
  getTemplates: async (company_id?: number) => {
    try {
      const response = await api.get('/hr/employment-contract-templates', {
        params: company_id ? { company_id } : undefined
      });
      return response.data;
    } catch (error) {
      console.error('전자근로계약 템플릿 조회 오류:', error);
      throw error;
    }
  },
  createTemplate: async (data: any) => {
    try {
      const response = await api.post('/hr/employment-contract-templates', data);
      return response.data;
    } catch (error) {
      console.error('전자근로계약 템플릿 생성 오류:', error);
      throw error;
    }
  },
  updateTemplate: async (id: number, data: any) => {
    try {
      const response = await api.put(`/hr/employment-contract-templates/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('전자근로계약 템플릿 수정 오류:', error);
      throw error;
    }
  },
  deleteTemplate: async (id: number) => {
    try {
      const response = await api.delete(`/hr/employment-contract-templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('전자근로계약 템플릿 삭제 오류:', error);
      throw error;
    }
  },
  getContracts: async (params?: { company_id?: number; employee_id?: number; status?: string }) => {
    try {
      const response = await api.get('/hr/employment-contracts', { params });
      return response.data;
    } catch (error) {
      console.error('전자근로계약 목록 조회 오류:', error);
      throw error;
    }
  },
  getContract: async (id: number) => {
    try {
      const response = await api.get(`/hr/employment-contracts/${id}`);
      return response.data;
    } catch (error) {
      console.error('전자근로계약 상세 조회 오류:', error);
      throw error;
    }
  },
  createContract: async (data: any) => {
    try {
      const response = await api.post('/hr/employment-contracts', data);
      return response.data;
    } catch (error) {
      console.error('전자근로계약 생성 오류:', error);
      throw error;
    }
  },
  updateContract: async (id: number, data: any) => {
    try {
      const response = await api.put(`/hr/employment-contracts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('전자근로계약 수정 오류:', error);
      throw error;
    }
  },
  deleteContract: async (id: number) => {
    try {
      const response = await api.delete(`/hr/employment-contracts/${id}`);
      return response.data;
    } catch (error) {
      console.error('전자근로계약 삭제 오류:', error);
      throw error;
    }
  },
  signContract: async (
    id: number,
    signer_type: 'company' | 'employee',
    sign_method: 'internal_ack' | 'aadhaar_esign' = 'internal_ack',
    extra?: { aadhaar_consent?: boolean; aadhaar_last4?: string; aadhaar_auth_ref?: string; signature_data?: string }
  ) => {
    try {
      const response = await api.post(`/hr/employment-contracts/${id}/sign`, {
        signer_type,
        sign_method,
        ...(extra || {})
      });
      return response.data;
    } catch (error) {
      console.error('전자근로계약 서명 오류:', error);
      throw error;
    }
  },
  getMyContracts: async (status?: string) => {
    try {
      const response = await api.get('/hr/my/employment-contracts', {
        params: status ? { status } : undefined
      });
      return response.data;
    } catch (error) {
      console.error('내 전자근로계약 조회 오류:', error);
      throw error;
    }
  },
  getContractAuditLogs: async (id: number, params?: { limit?: number }) => {
    try {
      const response = await api.get(`/hr/employment-contracts/${id}/audit-logs`, { params });
      return response.data;
    } catch (error) {
      console.error('전자근로계약 감사로그 조회 오류:', error);
      throw error;
    }
  }
};

/** 인사 — 부서 관리 */
export const departmentService = {
  list: async (includeInactive = false) => {
    const response = await api.get('/hr/departments', {
      params: includeInactive ? { include_inactive: '1' } : undefined
    });
    return response.data;
  },
  create: async (data: { name: string; code?: string; sort_order?: number; is_active?: boolean }) => {
    const response = await api.post('/hr/departments', data);
    return response.data;
  },
  update: async (
    id: number,
    data: { name?: string; code?: string | null; sort_order?: number; is_active?: boolean }
  ) => {
    const response = await api.put(`/hr/departments/${id}`, data);
    return response.data;
  },
  delete: async (id: number) => {
    const response = await api.delete(`/hr/departments/${id}`);
    return response.data;
  }
};

// 프로젝트 관리 API 서비스
export const projectService = {
  // 프로젝트 목록 조회
  getProjects: async (params?: { page?: number; limit?: number; status?: string; manager_id?: number }) => {
    try {
      const response = await api.get('/projects', { params });
      return response.data;
    } catch (error) {
      console.error('프로젝트 목록 조회 오류:', error);
      throw error;
    }
  },

  // 프로젝트 상세 조회
  getProject: async (id: number) => {
    try {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error('프로젝트 상세 조회 오류:', error);
      throw error;
    }
  },

  // 프로젝트 생성
  createProject: async (data: any) => {
    try {
      const response = await api.post('/projects', data);
      return response.data;
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      throw error;
    }
  },

  // 프로젝트 수정
  updateProject: async (id: number, data: any) => {
    try {
      const response = await api.put(`/projects/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('프로젝트 수정 오류:', error);
      throw error;
    }
  },

  // 프로젝트 삭제
  deleteProject: async (id: number) => {
    try {
      const response = await api.delete(`/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error('프로젝트 삭제 오류:', error);
      throw error;
    }
  }
};

/** 트렐로형 작업 보드 (/api/work/boards) */
export const workBoardService = {
  getBoards: async (params?: { company_id?: number }) => {
    const response = await api.get('/work/boards', { params });
    return response.data;
  },
  createBoard: async (data: { name: string; description?: string; board_color?: string }) => {
    const response = await api.post('/work/boards', data);
    return response.data;
  },
  getBoard: async (boardId: number) => {
    const response = await api.get(`/work/boards/${boardId}`);
    return response.data;
  },
  updateBoard: async (boardId: number, data: { name?: string; description?: string | null; board_color?: string | null }) => {
    const response = await api.put(`/work/boards/${boardId}`, data);
    return response.data;
  },
  moveBoard: async (boardId: number, index: number) => {
    const response = await api.post(`/work/boards/${boardId}/move`, { index });
    return response.data;
  },
  deleteBoard: async (boardId: number) => {
    const response = await api.delete(`/work/boards/${boardId}`);
    return response.data;
  },
  createList: async (boardId: number, data: { title: string }) => {
    const response = await api.post(`/work/boards/${boardId}/lists`, data);
    return response.data;
  },
  updateList: async (boardId: number, listId: number, data: { title?: string }) => {
    const response = await api.put(`/work/boards/${boardId}/lists/${listId}`, data);
    return response.data;
  },
  moveList: async (boardId: number, listId: number, index: number) => {
    const response = await api.post(`/work/boards/${boardId}/lists/${listId}/move`, { index });
    return response.data;
  },
  deleteList: async (boardId: number, listId: number) => {
    const response = await api.delete(`/work/boards/${boardId}/lists/${listId}`);
    return response.data;
  },
  createCard: async (boardId: number, listId: number, data: Record<string, unknown>) => {
    const response = await api.post(`/work/boards/${boardId}/lists/${listId}/cards`, data);
    return response.data;
  },
  updateCard: async (boardId: number, cardId: number, data: Record<string, unknown>) => {
    const response = await api.put(`/work/boards/${boardId}/cards/${cardId}`, data);
    return response.data;
  },
  moveCard: async (boardId: number, cardId: number, list_id: number, index: number) => {
    const response = await api.post(`/work/boards/${boardId}/cards/${cardId}/move`, { list_id, index });
    return response.data;
  },
  deleteCard: async (boardId: number, cardId: number) => {
    const response = await api.delete(`/work/boards/${boardId}/cards/${cardId}`);
    return response.data;
  },
  getCardComments: async (boardId: number, cardId: number) => {
    const response = await api.get(`/work/boards/${boardId}/cards/${cardId}/comments`);
    return response.data;
  },
  createCardComment: async (
    boardId: number,
    cardId: number,
    content: string,
    mention_user_ids?: number[],
    parent_id?: number | null
  ) => {
    const payload: any = { content };
    if (Array.isArray(mention_user_ids) && mention_user_ids.length > 0) {
      payload.mention_user_ids = mention_user_ids;
    }
    if (parent_id != null && Number.isInteger(parent_id) && parent_id > 0) {
      payload.parent_id = parent_id;
    }
    const response = await api.post(`/work/boards/${boardId}/cards/${cardId}/comments`, payload);
    return response.data;
  },
  deleteCardComment: async (boardId: number, cardId: number, commentId: number) => {
    const response = await api.delete(`/work/boards/${boardId}/cards/${cardId}/comments/${commentId}`);
    return response.data;
  },
  getMembers: async (boardId: number) => {
    const response = await api.get(`/work/boards/${boardId}/members`);
    return response.data;
  },
  inviteMember: async (boardId: number, user_id: number) => {
    const response = await api.post(`/work/boards/${boardId}/members`, { user_id });
    return response.data;
  },
  updateMemberRole: async (boardId: number, userId: number, role: 'owner' | 'member') => {
    const response = await api.put(`/work/boards/${boardId}/members/${userId}`, { role });
    return response.data;
  },
  removeMember: async (boardId: number, userId: number) => {
    const response = await api.delete(`/work/boards/${boardId}/members/${userId}`);
    return response.data;
  }
};

// 업무 통계 API 서비스
export const workStatisticService = {
  // 업무 통계 목록 조회
  getWorkStatistics: async (params?: { user_id?: number; period?: string; start_period?: string; end_period?: string }) => {
    try {
      const response = await api.get('/work/statistics', { params });
      return response.data;
    } catch (error) {
      console.error('업무 통계 목록 조회 오류:', error);
      throw error;
    }
  },

  // 업무 통계 상세 조회
  getWorkStatistic: async (id: number) => {
    try {
      const response = await api.get(`/work/statistics/${id}`);
      return response.data;
    } catch (error) {
      console.error('업무 통계 상세 조회 오류:', error);
      throw error;
    }
  },

  // 업무 통계 생성
  createWorkStatistic: async (data: any) => {
    try {
      const response = await api.post('/work/statistics', data);
      return response.data;
    } catch (error) {
      console.error('업무 통계 생성 오류:', error);
      throw error;
    }
  },

  // 업무 통계 수정
  updateWorkStatistic: async (id: number, data: any) => {
    try {
      const response = await api.put(`/work/statistics/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('업무 통계 수정 오류:', error);
      throw error;
    }
  },

  // 업무 통계 삭제
  deleteWorkStatistic: async (id: number) => {
    try {
      const response = await api.delete(`/work/statistics/${id}`);
      return response.data;
    } catch (error) {
      console.error('업무 통계 삭제 오류:', error);
      throw error;
    }
  }
};

// 전자 결제 API 서비스
export const approvalService = {
  // 전자 결제 목록 조회
  getApprovals: async (params?: {
    requester_id?: number;
    current_approver_id?: number;
    status?: string;
    type?: string;
    priority?: string;
  }) => {
    try {
      const response = await api.get('/work/approvals', { params });
      return response.data;
    } catch (error) {
      console.error('전자 결제 목록 조회 오류:', error);
      throw error;
    }
  },

  // 전자 결제 상세 조회
  getApproval: async (id: number) => {
    try {
      const response = await api.get(`/work/approvals/${id}`);
      return response.data;
    } catch (error) {
      console.error('전자 결제 상세 조회 오류:', error);
      throw error;
    }
  },

  // 전자 결제 생성
  createApproval: async (data: any) => {
    try {
      const response = await api.post('/work/approvals', data);
      return response.data;
    } catch (error) {
      console.error('전자 결제 생성 오류:', error);
      throw error;
    }
  },

  // 전자 결제 수정
  updateApproval: async (id: number, data: any) => {
    try {
      const response = await api.put(`/work/approvals/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('전자 결제 수정 오류:', error);
      throw error;
    }
  },

  // 전자 결제 삭제
  deleteApproval: async (id: number) => {
    try {
      const response = await api.delete(`/work/approvals/${id}`);
      return response.data;
    } catch (error) {
      console.error('전자 결제 삭제 오류:', error);
      throw error;
    }
  },

  // 전자 결제 제출
  submitApproval: async (id: number) => {
    try {
      const response = await api.post(`/work/approvals/${id}/submit`);
      return response.data;
    } catch (error) {
      console.error('전자 결제 제출 오류:', error);
      throw error;
    }
  },

  // 전자 결제 승인
  approveApproval: async (id: number, comment?: string, signature?: string) => {
    try {
      const response = await api.post(`/work/approvals/${id}/approve`, { comment, signature });
      return response.data;
    } catch (error) {
      console.error('전자 결제 승인 오류:', error);
      throw error;
    }
  },

  // 전자 결제 거부
  rejectApproval: async (id: number, comment?: string) => {
    try {
      const response = await api.post(`/work/approvals/${id}/reject`, { comment });
      return response.data;
    } catch (error) {
      console.error('전자 결제 거부 오류:', error);
      throw error;
    }
  },

  // 전자 결제 에스컬레이션
  escalateApproval: async (id: number, data: { next_approver_id: number; comment?: string }) => {
    try {
      const response = await api.post(`/work/approvals/${id}/escalate`, data);
      return response.data;
    } catch (error) {
      console.error('전자 결제 에스컬레이션 오류:', error);
      throw error;
    }
  }
};

// 견적서 관리 API 서비스
export const quotationService = {
  // 견적서 목록 조회
  getQuotations: async (params?: { customer_id?: number; status?: string; start_date?: string; end_date?: string }) => {
    try {
      const response = await api.get('/quotations', { params });
      return response.data;
    } catch (error) {
      console.error('견적서 목록 조회 오류:', error);
      throw error;
    }
  },

  /** DB 기준 다음 견적 번호(비활성 건 포함) — 중복 방지 */
  suggestNextQuotationNumber: async (params?: { year?: number }) => {
    try {
      const response = await api.get('/quotations/next-number', {
        params: params?.year != null ? { year: params.year } : undefined
      });
      return response.data;
    } catch (error) {
      console.error('견적서 번호 채번 오류:', error);
      throw error;
    }
  },

  // 견적서 상세 조회
  getQuotation: async (id: number) => {
    try {
      const response = await api.get(`/quotations/${id}`);
      return response.data;
    } catch (error) {
      console.error('견적서 상세 조회 오류:', error);
      throw error;
    }
  },

  // 견적서 생성
  createQuotation: async (data: any) => {
    try {
      const response = await api.post('/quotations', data);
      return response.data;
    } catch (error) {
      console.error('견적서 생성 오류:', error);
      throw error;
    }
  },

  // 견적서 수정
  updateQuotation: async (id: number, data: any) => {
    try {
      const response = await api.put(`/quotations/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('견적서 수정 오류:', error);
      throw error;
    }
  },

  // 견적서 삭제
  deleteQuotation: async (id: number) => {
    try {
      const response = await api.delete(`/quotations/${id}`);
      return response.data;
    } catch (error) {
      console.error('견적서 삭제 오류:', error);
      throw error;
    }
  },

  // 견적서 전송 (pdfBase64: 화면 캡처 PDF — 없으면 서버에서 단순 PDF 생성). 대용량 base64·SMTP 전송에 시간이 걸릴 수 있음
  sendQuotation: async (id: number, body?: { pdfBase64?: string }) => {
    try {
      const response = await api.post(`/quotations/${id}/send`, body ?? {}, { timeout: 120000 });
      return response.data;
    } catch (error) {
      console.error('견적서 전송 오류:', error);
      throw error;
    }
  },

  approveQuotation: async (id: number) => {
    try {
      const response = await api.post(`/quotations/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('견적서 승인 오류:', error);
      throw error;
    }
  },

  rejectQuotation: async (id: number, payload: { reason: string }) => {
    try {
      const response = await api.post(`/quotations/${id}/reject`, payload);
      return response.data;
    } catch (error) {
      console.error('견적서 반려 오류:', error);
      throw error;
    }
  },

  /** 관리자: 작성자별 견적 집계(반려·승인 등) — 역량 평가 참고 */
  getQuotationCreatorMetrics: async (params?: { company_id?: number }) => {
    try {
      const response = await api.get('/quotations/metrics/by-creator', { params });
      return response.data;
    } catch (error) {
      console.error('견적 집계 조회 오류:', error);
      throw error;
    }
  }
};

/** 객실 예약 API (호텔 프론트·객실 예약 관리 페이지용; `/work/room-bookings`) */
export const roomBookingService = {
  getRoomBookings: async (params?: { room_id?: number; user_id?: number; status?: string; check_in_date?: string; check_out_date?: string }) => {
    try {
      const response = await api.get('/work/room-bookings', { params });
      return response.data;
    } catch (error) {
      console.error('객실 예약 목록 조회 오류:', error);
      throw error;
    }
  },

  // 회의실 예약 상세 조회
  getRoomBooking: async (id: number) => {
    try {
      const response = await api.get(`/work/room-bookings/${id}`);
      return response.data;
    } catch (error) {
      console.error('객실 예약 상세 조회 오류:', error);
      throw error;
    }
  },

  // 회의실 예약 생성
  createRoomBooking: async (data: any) => {
    try {
      const response = await api.post('/work/room-bookings', data);
      return response.data;
    } catch (error) {
      console.error('객실 예약 생성 오류:', error);
      throw error;
    }
  },

  // 회의실 예약 수정
  updateRoomBooking: async (id: number, data: any) => {
    try {
      const response = await api.put(`/work/room-bookings/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('객실 예약 수정 오류:', error);
      throw error;
    }
  },

  // 회의실 예약 삭제
  deleteRoomBooking: async (id: number) => {
    try {
      const response = await api.delete(`/work/room-bookings/${id}`);
      return response.data;
    } catch (error) {
      console.error('객실 예약 삭제 오류:', error);
      throw error;
    }
  },

  // 회의실 예약 확인
  confirmRoomBooking: async (id: number) => {
    try {
      const response = await api.post(`/work/room-bookings/${id}/confirm`);
      return response.data;
    } catch (error) {
      console.error('객실 예약 확인 오류:', error);
      throw error;
    }
  },

  // 회의실 예약 취소
  cancelRoomBooking: async (id: number) => {
    try {
      const response = await api.post(`/work/room-bookings/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('객실 예약 취소 오류:', error);
      throw error;
    }
  }
};

// 객실 유형 API 서비스
export const roomTypeService = {
  getRoomTypes: async (params?: { status?: string }) => {
    try {
      const response = await api.get('/work/room-types', { params });
      return response.data;
    } catch (error) {
      console.error('객실 유형 목록 조회 오류:', error);
      throw error;
    }
  },
  createRoomType: async (data: any) => {
    try {
      const response = await api.post('/work/room-types', data);
      return response.data;
    } catch (error) {
      console.error('객실 유형 생성 오류:', error);
      throw error;
    }
  },
  updateRoomType: async (id: number, data: any) => {
    try {
      const response = await api.put(`/work/room-types/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('객실 유형 수정 오류:', error);
      throw error;
    }
  },
  deleteRoomType: async (id: number) => {
    try {
      const response = await api.delete(`/work/room-types/${id}`);
      return response.data;
    } catch (error) {
      console.error('객실 유형 삭제 오류:', error);
      throw error;
    }
  },
};

export const roomTypeRoomService = {
  getRoomTypeRooms: async (params?: { room_type_id?: number }) => {
    try {
      const response = await api.get('/work/room-type-rooms', { params });
      return response.data;
    } catch (error) {
      console.error('객실 호실명 목록 조회 오류:', error);
      throw error;
    }
  },
  upsertRoomTypeRoom: async (data: { room_type_id: number; room_number: string; room_name?: string }) => {
    try {
      const response = await api.put('/work/room-type-rooms', data);
      return response.data;
    } catch (error) {
      console.error('객실 호실명 저장 오류:', error);
      throw error;
    }
  },
};

// 업무 보고서 API 서비스
export const workReportService = {
  // 업무 보고서 목록 조회
  getWorkReports: async (params?: {
    author_id?: number;
    status?: string;
    type?: string;
    priority?: string;
    start_date?: string;
    end_date?: string;
    /** `cc`는 서버에서 받은 보고서와 동일하게 처리(예전 클라이언트 호환) */
    scope?: 'authored' | 'received' | 'cc';
  }) => {
    try {
      const response = await api.get('/work/reports', { params });
      return response.data;
    } catch (error) {
      console.error('업무 보고서 목록 조회 오류:', error);
      throw error;
    }
  },

  // 업무 보고서 상세 조회
  getWorkReport: async (id: number) => {
    try {
      const response = await api.get(`/work/reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('업무 보고서 상세 조회 오류:', error);
      throw error;
    }
  },

  // 업무 보고서 생성
  createWorkReport: async (data: any) => {
    try {
      const response = await api.post('/work/reports', data);
      return response.data;
    } catch (error) {
      console.error('업무 보고서 생성 오류:', error);
      throw error;
    }
  },

  // 업무 보고서 수정
  updateWorkReport: async (id: number, data: any) => {
    try {
      const response = await api.put(`/work/reports/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('업무 보고서 수정 오류:', error);
      throw error;
    }
  },

  // 업무 보고서 삭제
  deleteWorkReport: async (id: number) => {
    try {
      const response = await api.delete(`/work/reports/${id}`);
      return response.data;
    } catch (error) {
      console.error('업무 보고서 삭제 오류:', error);
      throw error;
    }
  },

  // 업무 보고서 제출
  submitWorkReport: async (id: number) => {
    try {
      const response = await api.post(`/work/reports/${id}/submit`);
      return response.data;
    } catch (error) {
      console.error('업무 보고서 제출 오류:', error);
      throw error;
    }
  },

  // 업무 보고서 검토 (승인/거부)
  reviewWorkReport: async (id: number, status: 'approved' | 'rejected', review_comment?: string) => {
    try {
      const response = await api.post(`/work/reports/${id}/review`, { status, review_comment });
      return response.data;
    } catch (error) {
      console.error('업무 보고서 검토 오류:', error);
      throw error;
    }
  }
};

export const ewayBillService = {
  // E-Way Bill 목록 조회
  getEWayBills: async (params?: { status?: string; invoice_number?: string; start_date?: string; end_date?: string; company_id?: number; page?: number; limit?: number }) => {
    try {
      const response = await api.get('/accounting/eway-bills', { params });
      return response.data;
    } catch (error) {
      console.error('E-Way Bill 목록 조회 오류:', error);
      throw error;
    }
  },

  // E-Way Bill 상세 조회
  getEWayBill: async (id: number) => {
    try {
      const response = await api.get(`/accounting/eway-bills/${id}`);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill 상세 조회 오류:', error);
      throw error;
    }
  },

  // E-Way Bill 생성
  createEWayBill: async (data: any) => {
    try {
      const response = await api.post('/accounting/eway-bills', data);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill 생성 오류:', error);
      throw error;
    }
  },

  // E-Way Bill 수정
  updateEWayBill: async (id: number, data: any) => {
    try {
      const response = await api.put(`/accounting/eway-bills/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill 수정 오류:', error);
      throw error;
    }
  },

  // E-Way Bill 생성 (상태를 generated로 변경)
  generateEWayBill: async (id: number) => {
    try {
      const response = await api.post(`/accounting/eway-bills/${id}/generate`);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill 생성 오류:', error);
      throw error;
    }
  },

  // E-Way Bill 취소
  cancelEWayBill: async (id: number, cancellationReason?: string) => {
    try {
      const response = await api.post(`/accounting/eway-bills/${id}/cancel`, {
        cancellation_reason: cancellationReason
      });
      return response.data;
    } catch (error) {
      console.error('E-Way Bill 취소 오류:', error);
      throw error;
    }
  },

  // E-Way Bill 삭제
  deleteEWayBill: async (id: number) => {
    try {
      const response = await api.delete(`/accounting/eway-bills/${id}`);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill 삭제 오류:', error);
      throw error;
    }
  }
};

/** users.settings.ui — DB 저장 (localStorage 사용 안 함) */
export type UserUiCalendarScheduleItem = {
  id: string;
  title: string;
  type?: 'normal' | 'company_holiday';
};

export type UserUiPreferencesData = {
  calendarSchedules?: Record<string, UserUiCalendarScheduleItem[]>;
  dashboardCards?: string[];
  quickActionRoutes?: string[];
  sidebarWidth?: number;
  sidebarAutoCollapse?: boolean;
  language?: 'ko' | 'en';
  companyHolidayReminderShown?: Record<string, string>;
  roomInvoiceTaxSnapshot?: Record<string, unknown>;
};

export const userUiPreferencesService = {
  get: async (): Promise<UserUiPreferencesData> => {
    const response = await api.get('/users/me/ui-preferences');
    return response.data?.data || {};
  },
  patch: async (patch: Partial<UserUiPreferencesData>): Promise<UserUiPreferencesData> => {
    const response = await api.patch('/users/me/ui-preferences', patch);
    return response.data?.data || {};
  }
};

// 공지사항 서비스
export const noticeService = {
  // 공지사항 목록 조회
  getNotices: async (params?: any) => {
    try {
      const response = await api.get('/communication/notices', { params });
      return response.data;
    } catch (error) {
      console.error('공지사항 목록 조회 오류:', error);
      throw error;
    }
  },

  // 공지사항 상세 조회
  getNotice: async (id: number) => {
    try {
      const response = await api.get(`/communication/notices/${id}`);
      return response.data;
    } catch (error) {
      console.error('공지사항 상세 조회 오류:', error);
      throw error;
    }
  },

  // 공지사항 생성
  createNotice: async (data: any) => {
    try {
      const response = await api.post('/communication/notices', data);
      return response.data;
    } catch (error) {
      console.error('공지사항 생성 오류:', error);
      throw error;
    }
  },

  // 공지사항 수정
  updateNotice: async (id: number, data: any) => {
    try {
      const response = await api.put(`/communication/notices/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('공지사항 수정 오류:', error);
      throw error;
    }
  },

  // 공지사항 삭제
  deleteNotice: async (id: number) => {
    try {
      const response = await api.delete(`/communication/notices/${id}`);
      return response.data;
    } catch (error) {
      console.error('공지사항 삭제 오류:', error);
      throw error;
    }
  },

  // 공지사항 게시
  publishNotice: async (id: number) => {
    try {
      const response = await api.post(`/communication/notices/${id}/publish`);
      return response.data;
    } catch (error) {
      console.error('공지사항 게시 오류:', error);
      throw error;
    }
  },

  // 공지사항 보관
  archiveNotice: async (id: number) => {
    try {
      const response = await api.post(`/communication/notices/${id}/archive`);
      return response.data;
    } catch (error) {
      console.error('공지사항 보관 오류:', error);
      throw error;
    }
  },
};

export { api };
