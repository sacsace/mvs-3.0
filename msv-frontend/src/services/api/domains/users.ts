import { api, API_BASE_URL, getAuthTokenFromStorage } from '../client';

export const userService = {
  getUsers: async (params?: { search?: string; company_id?: number }) => {
    try {
      const response = await api.get('/users', { params });
      return response.data;
    } catch (error) {
      console.error('?�용??목록 조회 ?�류:', error);
      throw error;
    }
  },

  getNextEmployeeNumber: async (companyId?: number) => {
    try {
      const params = companyId != null ? { company_id: companyId } : undefined;
      const response = await api.get('/users/next-employee-number', { params });
      return response.data;
    } catch (error) {
      console.error('?�원번호 미리보기 ?�류:', error);
      throw error;
    }
  }
};

// 로그???�보 관�?API ?�비??
export const loginInfoService = {
  getLoginInfoTabs: async (companyId: number) => {
    try {
      const response = await api.get('/login-info/tabs', { params: { company_id: companyId } });
      return response.data;
    } catch (error) {
      console.error('로그???�보 ??조회 ?�류:', error);
      throw error;
    }
  },

  createLoginInfoTab: async (data: { company_id: number; name: string }) => {
    try {
      const response = await api.post('/login-info/tabs', data);
      return response.data;
    } catch (error) {
      console.error('로그???�보 ??추�? ?�류:', error);
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
      console.error('로그???�보 ???�정 ?�류:', error);
      throw error;
    }
  },

  deleteLoginInfoTab: async (tabId: number) => {
    try {
      const response = await api.delete(`/login-info/tabs/${tabId}`);
      return response.data;
    } catch (error) {
      console.error('로그???�보 ????�� ?�류:', error);
      throw error;
    }
  },

  // 로그???�보 목록 조회 (company_id + tab_id ?�수)
  getLoginInfos: async (params: { company_id: number; tab_id: number }) => {
    try {
      const response = await api.get('/login-info', { params });
      return response.data;
    } catch (error) {
      console.error('로그???�보 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // 로그??로그 목록 조회
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
      console.error('로그??로그 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // 로그???�보 ?�성
  createLoginInfo: async (data: any) => {
    try {
      const response = await api.post('/login-info', data);
      return response.data;
    } catch (error) {
      console.error('로그???�보 ?�성 ?�류:', error);
      throw error;
    }
  },

  // 로그???�보 ?�정
  updateLoginInfo: async (id: number, data: any) => {
    try {
      const response = await api.put(`/login-info/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('로그???�보 ?�정 ?�류:', error);
      throw error;
    }
  },

  // 로그???�보 ??��
  deleteLoginInfo: async (id: number) => {
    try {
      const response = await api.delete(`/login-info/${id}`);
      return response.data;
    } catch (error) {
      console.error('로그???�보 ??�� ?�류:', error);
      throw error;
    }
  },

  // ?��? 가?�오�?
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
      console.error('로그???�보 ?��? 가?�오�??�류:', error);
      throw error;
    }
  }
};

// ?�계 관�?API ?�비??
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
  notificationSettings?: {
    realtime?: boolean;
    email?: boolean;
    browser?: boolean;
    system?: boolean;
    approval?: boolean;
    vacation?: boolean;
    expense?: boolean;
    workReport?: boolean;
    emailDigest?: 'immediate' | 'daily' | 'weekly';
  };
  notificationTemplates?: Array<{
    id: string;
    name: string;
    title: string;
    message: string;
    type: 'info' | 'success' | 'warning' | 'error';
  }>;
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

// 공�??�항 ?�비??