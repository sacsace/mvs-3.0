import { api, API_BASE_URL, getAuthTokenFromStorage } from '../client';

export const hrService = {
  // 급여 목록 조회
  getPayrolls: async (params?: any) => {
    try {
      const response = await api.get('/hr/payrolls', { params });
      return response.data;
    } catch (error) {
      console.error('급여 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�정 급여 조회
  getPayroll: async (id: number) => {
    try {
      const response = await api.get(`/hr/payrolls/${id}`);
      return response.data;
    } catch (error) {
      console.error('급여 조회 ?�류:', error);
      throw error;
    }
  },

  // 급여 ?�성
  createPayroll: async (payrollData: any) => {
    try {
      const response = await api.post('/hr/payrolls', payrollData);
      return response.data;
    } catch (error) {
      console.error('급여 ?�성 ?�류:', error);
      throw error;
    }
  },

  // 급여 ?�정
  updatePayroll: async (id: number, payrollData: any) => {
    try {
      const response = await api.put(`/hr/payrolls/${id}`, payrollData);
      return response.data;
    } catch (error) {
      console.error('급여 ?�정 ?�류:', error);
      throw error;
    }
  },

  // 급여 ??��
  deletePayroll: async (id: number) => {
    try {
      const response = await api.delete(`/hr/payrolls/${id}`);
      return response.data;
    } catch (error) {
      console.error('급여 ??�� ?�류:', error);
      throw error;
    }
  },

  // 직원 목록 조회
  getEmployees: async () => {
    try {
      const response = await api.get('/hr/employees');
      return response.data;
    } catch (error) {
      console.error('직원 목록 조회 ?�류:', error);
      throw error;
    }
  }
};

// ?�고 관�?API ?�비??
export const vacationService = {
  // ?��? 목록 조회
  getVacations: async (params?: { user_id?: number; status?: string; vacation_type?: string; start_date?: string; end_date?: string; company_id?: number; approved_by?: number; same_department?: boolean }) => {
    try {
      const response = await api.get('/hr/vacations', { params });
      return response.data;
    } catch (error) {
      console.error('?��? 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // ?��? ?�세 조회
  getVacation: async (id: number) => {
    try {
      const response = await api.get(`/hr/vacations/${id}`);
      return response.data;
    } catch (error) {
      console.error('?��? ?�세 조회 ?�류:', error);
      throw error;
    }
  },

  // ?��? ?�성
  createVacation: async (data: { user_id?: number; vacation_type: string; start_date: string; end_date: string; reason: string; attachments?: string[] }) => {
    try {
      const response = await api.post('/hr/vacations', data);
      return response.data;
    } catch (error) {
      console.error('?��? ?�성 ?�류:', error);
      throw error;
    }
  },

  // ?��? ?�정
  updateVacation: async (id: number, data: { vacation_type?: string; start_date?: string; end_date?: string; reason?: string; attachments?: string[] }) => {
    try {
      const response = await api.put(`/hr/vacations/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('?��? ?�정 ?�류:', error);
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

  // 직원별 휴가 잔여일
  getLeaveBalances: async (params?: { company_id?: number }) => {
    try {
      const response = await api.get('/hr/vacations/leave-balances', { params });
      return response.data;
    } catch (error) {
      console.error('휴가 잔여일 조회 오류:', error);
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

  // ?��? ?�책 ?�??
  updateVacationPolicy: async (data: {
    annualLeaveStartDays?: number;
    annualLeaveEarnDays?: number;
    availableTypes?: string[];
    leaveTypeDays?: Record<string, number>;
  }) => {
    try {
      const response = await api.put('/hr/vacations/policy', data);
      return response.data;
    } catch (error) {
      console.error('?��? ?�책 ?�???�류:', error);
      throw error;
    }
  },

  // ?��? ??��
  deleteVacation: async (id: number) => {
    try {
      const response = await api.delete(`/hr/vacations/${id}`);
      return response.data;
    } catch (error) {
      console.error('?��? ??�� ?�류:', error);
      throw error;
    }
  },

  // ?��? ?�인
  approveVacation: async (id: number) => {
    try {
      const response = await api.post(`/hr/vacations/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('?��? ?�인 ?�류:', error);
      throw error;
    }
  },

  // ?��? 거�?
  rejectVacation: async (id: number, rejection_reason?: string) => {
    try {
      const response = await api.post(`/hr/vacations/${id}/reject`, { rejection_reason });
      return response.data;
    } catch (error) {
      console.error('?��? 거�? ?�류:', error);
      throw error;
    }
  },

  // ?��? ?�이??Excel ?�보?�기
  exportVacationsToExcel: async (params?: { user_id?: number; status?: string; vacation_type?: string; start_date?: string; end_date?: string; approved_by?: number }) => {
    try {
      const response = await api.get('/hr/vacations/excel/export', {
        params,
        responseType: 'blob'
      });
      return response;
    } catch (error) {
      console.error('?��? Excel ?�보?�기 ?�류:', error);
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
      console.error('?�자근로계약 ?�플�?조회 ?�류:', error);
      throw error;
    }
  },
  createTemplate: async (data: any) => {
    try {
      const response = await api.post('/hr/employment-contract-templates', data);
      return response.data;
    } catch (error) {
      console.error('?�자근로계약 ?�플�??�성 ?�류:', error);
      throw error;
    }
  },
  updateTemplate: async (id: number, data: any) => {
    try {
      const response = await api.put(`/hr/employment-contract-templates/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('?�자근로계약 ?�플�??�정 ?�류:', error);
      throw error;
    }
  },
  deleteTemplate: async (id: number) => {
    try {
      const response = await api.delete(`/hr/employment-contract-templates/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�자근로계약 ?�플�???�� ?�류:', error);
      throw error;
    }
  },
  getContracts: async (params?: { company_id?: number; employee_id?: number; status?: string }) => {
    try {
      const response = await api.get('/hr/employment-contracts', { params });
      return response.data;
    } catch (error) {
      console.error('?�자근로계약 목록 조회 ?�류:', error);
      throw error;
    }
  },
  getContract: async (id: number) => {
    try {
      const response = await api.get(`/hr/employment-contracts/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�자근로계약 ?�세 조회 ?�류:', error);
      throw error;
    }
  },
  createContract: async (data: any) => {
    try {
      const response = await api.post('/hr/employment-contracts', data);
      return response.data;
    } catch (error) {
      console.error('?�자근로계약 ?�성 ?�류:', error);
      throw error;
    }
  },
  updateContract: async (id: number, data: any) => {
    try {
      const response = await api.put(`/hr/employment-contracts/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('?�자근로계약 ?�정 ?�류:', error);
      throw error;
    }
  },
  deleteContract: async (id: number) => {
    try {
      const response = await api.delete(`/hr/employment-contracts/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�자근로계약 ??�� ?�류:', error);
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
      console.error('?�자근로계약 ?�명 ?�류:', error);
      throw error;
    }
  },
  sendContractToEmployee: async (id: number) => {
    try {
      const response = await api.post(`/hr/employment-contracts/${id}/send`);
      return response.data;
    } catch (error) {
      console.error('전자근로계약 발송 오류:', error);
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
      console.error('???�자근로계약 조회 ?�류:', error);
      throw error;
    }
  },
  getContractAuditLogs: async (id: number, params?: { limit?: number }) => {
    try {
      const response = await api.get(`/hr/employment-contracts/${id}/audit-logs`, { params });
      return response.data;
    } catch (error) {
      console.error('?�자근로계약 감사로그 조회 ?�류:', error);
      throw error;
    }
  }
};

/** ?�사 ??부??관�?*/

export const departmentService = {
  list: async (includeInactive = false, companyId?: number) => {
    const params: Record<string, string | number> = {};
    if (includeInactive) params.include_inactive = '1';
    if (companyId != null) params.company_id = companyId;
    const response = await api.get('/hr/departments', { params });
    return response.data;
  },
  create: async (data: {
    name: string;
    code?: string;
    sort_order?: number;
    is_active?: boolean;
    company_id?: number;
  }) => {
    const response = await api.post('/hr/departments', data);
    return response.data;
  },
  update: async (
    id: number,
    data: {
      name?: string;
      code?: string | null;
      sort_order?: number;
      is_active?: boolean;
      company_id?: number;
    }
  ) => {
    const response = await api.put(`/hr/departments/${id}`, data);
    return response.data;
  },
  delete: async (id: number, companyId?: number) => {
    const response = await api.delete(`/hr/departments/${id}`, {
      params: companyId != null ? { company_id: companyId } : undefined,
    });
    return response.data;
  },
};

// ?�로?�트 관�?API ?�비??
export const attendanceService = {
  // 근태 목록 조회
  getAttendances: async (params?: { date?: string; start_date?: string; end_date?: string; status?: string }) => {
    try {
      const response = await api.get('/hr/attendances', { params });
      return response.data;
    } catch (error) {
      console.error('근태 목록 조회 ?�류:', error);
      throw error;
    }
  },

  /** ?�사 ?�체 근태 (HR ?�계) ??admin/root/audit �?*/
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
      console.error('?�사 근태 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�늘??근태 조회
  getTodayAttendance: async (clientDate?: string) => {
    try {
      const response = await api.get('/hr/attendances/today', {
        params: clientDate ? { client_date: clientDate } : undefined
      });
      return response.data;
    } catch (error) {
      console.error('?�늘??근태 조회 ?�류:', error);
      throw error;
    }
  },

  // 근태 ?�세 조회
  getAttendance: async (id: number) => {
    try {
      const response = await api.get(`/hr/attendances/${id}`);
      return response.data;
    } catch (error) {
      console.error('근태 ?�세 조회 ?�류:', error);
      throw error;
    }
  },

  // 출근 처리
  checkIn: async (payload?: { latitude?: number; longitude?: number; accuracy?: number; client_time?: string; client_date?: string; use_server_time?: boolean; skip_geo?: boolean }) => {
    try {
      const response = await api.post('/hr/attendances/check-in', payload || {});
      return response.data;
    } catch (error) {
      console.error('출근 처리 ?�류:', error);
      throw error;
    }
  },

  // ?�근 처리
  checkOut: async (payload?: { client_time?: string; client_date?: string; use_server_time?: boolean; skip_geo?: boolean }) => {
    try {
      const response = await api.post('/hr/attendances/check-out', payload || {});
      return response.data;
    } catch (error) {
      console.error('?�근 처리 ?�류:', error);
      throw error;
    }
  },

  // 근태 ?�성
  createAttendance: async (data: { user_id: number; date: string; check_in?: string; check_out?: string; status?: string; notes?: string }) => {
    try {
      const response = await api.post('/hr/attendances', data);
      return response.data;
    } catch (error) {
      console.error('근태 ?�성 ?�류:', error);
      throw error;
    }
  },

  // 근태 ?�정
  updateAttendance: async (id: number, data: { check_in?: string; check_out?: string; status?: string; notes?: string }) => {
    try {
      const response = await api.put(`/hr/attendances/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('근태 ?�정 ?�류:', error);
      throw error;
    }
  },

  // 근태 ??��
  deleteAttendance: async (id: number) => {
    try {
      const response = await api.delete(`/hr/attendances/${id}`);
      return response.data;
    } catch (error) {
      console.error('근태 ??�� ?�류:', error);
      throw error;
    }
  }
};
