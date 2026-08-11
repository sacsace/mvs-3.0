import { api, getAuthTokenFromStorage } from '../client';

export const systemSettingsService = {
  // ?�스???�정 조회
  getSettings: async () => {
    const response = await api.get('/system-settings');
    return response.data;
  },

  // ?�스???�정 ?�??
  saveSettings: async (settings: any) => {
    const response = await api.put('/system-settings', settings);
    return response.data;
  },

  // 로고 ?�로??
  uploadLogo: async (logo: string) => {
    const response = await api.post('/system-settings/logo', { logo });
    return response.data;
  },

  // 백업 ?�행
  runBackup: async () => {
    const response = await api.post('/system-settings/backup');
    return response.data;
  },

  listBackups: async () => {
    const response = await api.get('/system-settings/backups');
    return response.data;
  },

  downloadBackup: async (filename: string) => {
    const token = getAuthTokenFromStorage();
    const response = await api.get(`/system-settings/backups/${encodeURIComponent(filename)}/download`, {
      responseType: 'blob',
      headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    });
    return response;
  },

  /** SMTP ?�스??메일 (관리자 ?�용) */
  sendTestMail: async (body: { to: string; subject?: string }) => {
    const response = await api.post('/system-settings/test-mail', body);
    return response.data;
  }
};

export const officeLocationService = {
  getOfficeLocation: async () => {
    const response = await api.get('/system-settings/office-location');
    return response.data;
  }
};

// 근태 관�?API ?�비??
export const heresnowIntegrationService = {
  getStatus: async () => {
    const response = await api.get('/hr/attendances/heresnow/status');
    return response.data;
  },
  sync: async (payload?: { since?: string }) => {
    const response = await api.post('/hr/attendances/heresnow/sync', payload || {});
    return response.data;
  },
  preview: async (payload?: { since?: string }) => {
    const response = await api.post('/hr/attendances/heresnow/preview', payload || {});
    return response.data;
  },
  testConnection: async () => {
    const response = await api.post('/hr/attendances/heresnow/test', {});
    return response.data;
  },
  updateSettings: async (payload: { enabled?: boolean; companyId?: string; externalCompanyId?: string; apiKey?: string }) => {
    const response = await api.put('/hr/attendances/heresnow/settings', payload);
    return response.data;
  }
};

export const noticeService = {
  // 공�??�항 목록 조회
  getNotices: async (params?: any) => {
    const response = await api.get('/communication/notices', { params });
    return response.data;
  },

  // 공�??�항 ?�세 조회
  getNotice: async (id: number) => {
    const response = await api.get(`/communication/notices/${id}`);
    return response.data;
  },

  // 공�??�항 ?�성
  createNotice: async (data: any) => {
    const response = await api.post('/communication/notices', data);
    return response.data;
  },

  // 공�??�항 ?�정
  updateNotice: async (id: number, data: any) => {
    const response = await api.put(`/communication/notices/${id}`, data);
    return response.data;
  },

  // 공�??�항 ??��
  deleteNotice: async (id: number) => {
    const response = await api.delete(`/communication/notices/${id}`);
    return response.data;
  },

  // 공�??�항 게시
  publishNotice: async (id: number) => {
    const response = await api.post(`/communication/notices/${id}/publish`);
    return response.data;
  },

  // 공지사항 보관
  archiveNotice: async (id: number) => {
    const response = await api.post(`/communication/notices/${id}/archive`);
    return response.data;
  },
};

export type CompanyCalendarScheduleItem = {
  id: number;
  scheduleDate: string;
  title: string;
  isHoliday: boolean;
  createdBy?: number | null;
  updatedBy?: number | null;
  createdAt?: string;
  updatedAt?: string;
};

export type PublicPersonalCalendarScheduleItem = {
  id: string;
  scheduleDate: string;
  title: string;
  isHoliday: boolean;
  ownerId: number;
  ownerName: string;
  isPublic: true;
  source: 'personal_public';
};

export const companyCalendarScheduleService = {
  list: async (params?: { from?: string; to?: string }) => {
    const response = await api.get('/communication/company-calendar-schedules', { params });
    return response.data;
  },
  create: async (data: { scheduleDate: string; title: string; isHoliday?: boolean }) => {
    const response = await api.post('/communication/company-calendar-schedules', data);
    return response.data;
  },
  update: async (
    id: number,
    data: Partial<{ scheduleDate: string; title: string; isHoliday: boolean }>
  ) => {
    const response = await api.put(`/communication/company-calendar-schedules/${id}`, data);
    return response.data;
  },
  remove: async (id: number) => {
    const response = await api.delete(`/communication/company-calendar-schedules/${id}`);
    return response.data;
  },
  listPublicPersonal: async (params?: { from?: string; to?: string }) => {
    const response = await api.get('/communication/public-personal-calendar-schedules', { params });
    return response.data;
  },
};
