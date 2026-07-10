import { api } from '../client';

export const accountingService = {
  // ?�보?�스 목록 조회
  getInvoices: async (params?: any) => {
    try {
      const response = await api.get('/accounting/invoices', { params });
      return response.data;
    } catch (error) {
      console.error('?�보?�스 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�음 ?�보?�스 번호 조회
  getNextInvoiceNumber: async () => {
    try {
      const response = await api.get('/accounting/invoices/next-number');
      return response.data;
    } catch (error) {
      console.error('?�보?�스 번호 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�정 ?�보?�스 조회
  getInvoice: async (id: number) => {
    try {
      const response = await api.get(`/accounting/invoices/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�보?�스 조회 ?�류:', error);
      throw error;
    }
  },

  approveInvoice: async (id: number) => {
    try {
      const response = await api.post(`/accounting/invoices/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('?�보?�스 ?�인 ?�류:', error);
      throw error;
    }
  },

  rejectInvoice: async (id: number) => {
    try {
      const response = await api.post(`/accounting/invoices/${id}/reject`);
      return response.data;
    } catch (error) {
      console.error('?�보?�스 반려 ?�류:', error);
      throw error;
    }
  },

  // ?�보?�스 ?�성
  createInvoice: async (invoiceData: any) => {
    try {
      const response = await api.post('/accounting/invoices', invoiceData);
      return response.data;
    } catch (error) {
      console.error('?�보?�스 ?�성 ?�류:', error);
      throw error;
    }
  },

  /** ?�보?�스 PDF 첨�? 메일 ??본문 ?�?�량·SMTP 지???��??�?�아???�장 (기본 10�?초과 방�?) */
  sendInvoiceEmail: async (id: number, data: { to: string; subject?: string; message?: string; filename?: string }) => {
    try {
      const response = await api.post(`/accounting/invoices/${id}/send-email`, data, {
        timeout: 120000
      });
      return response.data;
    } catch (error) {
      console.error('?�보?�스 ?�메???�송 ?�류:', error);
      throw error;
    }
  },

  // ?�보?�스 ?�정
  updateInvoice: async (id: number, invoiceData: any) => {
    try {
      const response = await api.put(`/accounting/invoices/${id}`, invoiceData);
      return response.data;
    } catch (error) {
      console.error('?�보?�스 ?�정 ?�류:', error);
      throw error;
    }
  },

  // ?�보?�스 ?�태/결제?�태 ?�데?�트
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
      console.error('?�보?�스 ?�태 ?�데?�트 ?�류:', error);
      throw error;
    }
  },

  // ?�보?�스 ??�� ?�인 ?�청 (직접 ??�� ?�님)
  deleteInvoice: async (
    id: number,
    data: { approver_user_id: number; memo?: string }
  ) => {
    try {
      const response = await api.delete(`/accounting/invoices/${id}`, { data });
      return response.data;
    } catch (error) {
      console.error('?�보?�스 ??�� ?�류:', error);
      throw error;
    }
  },

  // ?�계 ?�계 조회
  getAccountingStats: async (params?: any) => {
    try {
      const response = await api.get('/accounting/stats', { params });
      return response.data;
    } catch (error) {
      console.error('?�계 ?�계 조회 ?�류:', error);
      throw error;
    }
  },

  // 지출결?�서 목록 조회
  getExpenseReports: async (params?: any) => {
    try {
      const response = await api.get('/accounting/expenses', { params });
      return response.data;
    } catch (error) {
      console.error('지출결?�서 조회 ?�류:', error);
      throw error;
    }
  },

  // 지출결?�서 ?�세 조회
  getExpenseReport: async (id: number) => {
    try {
      const response = await api.get(`/accounting/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('지출결?�서 ?�세 조회 ?�류:', error);
      throw error;
    }
  },

  // 지출결?�서 ?�성
  createExpenseReport: async (data: any) => {
    try {
      const response = await api.post('/accounting/expenses', data);
      return response.data;
    } catch (error) {
      console.error('지출결?�서 ?�성 ?�류:', error);
      throw error;
    }
  },

  // 지출결?�서 ?�정
  updateExpenseReport: async (id: number, data: any) => {
    try {
      const response = await api.put(`/accounting/expenses/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('지출결?�서 ?�정 ?�류:', error);
      throw error;
    }
  },

  // 지출결?�서 ??��
  deleteExpenseReport: async (id: number) => {
    try {
      const response = await api.delete(`/accounting/expenses/${id}`);
      return response.data;
    } catch (error) {
      console.error('지출결?�서 ??�� ?�류:', error);
      throw error;
    }
  },

  // 지출결?�서 ?�태 변�?
  updateExpenseReportStatus: async (id: number, status: string) => {
    try {
      const response = await api.put(`/accounting/expenses/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('지출결?�서 ?�태 변�??�류:', error);
      throw error;
    }
  },

  // 지출결?�서 ?�수�??�로???�큰 발급
  getReceiptUploadToken: async (id: number) => {
    try {
      const response = await api.get(`/accounting/expenses/${id}/receipt-upload-token`);
      return response.data;
    } catch (error) {
      console.error('?�수�??�로???�큰 발급 ?�류:', error);
      throw error;
    }
  },

  // ?�큰?�로 ?�수�??�로??(?��??�에???�용)
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
      console.error('?�수�??�로???�류:', error);
      throw error;
    }
  },

  // 지출결?�서 ?�수�??�로??(??
  uploadExpenseReceiptById: async (id: number, files: File[]) => {
    try {
      const formData = new FormData();
      files.forEach((file) => formData.append('files', file));
      const response = await api.post(`/accounting/expenses/${id}/upload-receipt`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('?�수�??�로???�류(??:', error);
      throw error;
    }
  },

  // 지출결?�서 결제 ?�청
  requestExpensePayment: async (id: number) => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/request-payment`);
      return response.data;
    } catch (error) {
      console.error('결제 ?�청 ?�류:', error);
      throw error;
    }
  },

  // 지출결?�서 결제 반려
  rejectExpensePayment: async (id: number, reason?: string) => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/reject-payment`, { reason });
      return response.data;
    } catch (error) {
      console.error('결제 반려 ?�류:', error);
      throw error;
    }
  },

  // 지출결?�서 최종 ?�인
  approveExpensePayment: async (id: number, reason?: string) => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/approve-payment`, { reason });
      return response.data;
    } catch (error) {
      console.error('결제 ?�인 ?�류:', error);
      throw error;
    }
  },

  // 지출결?�서 결제 ?�료 처리 + ?�금
  completeExpensePayment: async (id: number, provider?: 'icici' | 'kotak') => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/complete-payment`, { provider });
      return response.data;
    } catch (error) {
      console.error('결제 ?�료 처리 ?�류:', error);
      throw error;
    }
  },

  // ?�???�금 ?�시??
  retryExpenseTransfer: async (id: number, provider?: 'icici' | 'kotak') => {
    try {
      const response = await api.post(`/accounting/expenses/${id}/retry-transfer`, { provider });
      return response.data;
    } catch (error) {
      console.error('?�금 ?�시???�류:', error);
      throw error;
    }
  },

  // ?�산 목록 조회
  getBudgets: async (params?: any) => {
    try {
      const response = await api.get('/accounting/budgets', { params });
      return response.data;
    } catch (error) {
      console.error('?�산 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�산 ?�성
  createBudget: async (data: any) => {
    try {
      const response = await api.post('/accounting/budgets', data);
      return response.data;
    } catch (error) {
      console.error('?�산 ?�성 ?�류:', error);
      throw error;
    }
  },

  // ?�산 ?�정
  updateBudget: async (id: number, data: any) => {
    try {
      const response = await api.put(`/accounting/budgets/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('?�산 ?�정 ?�류:', error);
      throw error;
    }
  },

  // ?�산 ??��
  deleteBudget: async (id: number) => {
    try {
      const response = await api.delete(`/accounting/budgets/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�산 ??�� ?�류:', error);
      throw error;
    }
  },

  // ?�산 목록 조회
  getAssets: async (params?: any) => {
    try {
      const response = await api.get('/accounting/assets', { params });
      return response.data;
    } catch (error) {
      console.error('?�산 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�산 ?�성
  createAsset: async (data: any) => {
    try {
      const response = await api.post('/accounting/assets', data);
      return response.data;
    } catch (error) {
      console.error('?�산 ?�성 ?�류:', error);
      throw error;
    }
  },

  // ?�산 ?�정
  updateAsset: async (id: number, data: any) => {
    try {
      const response = await api.put(`/accounting/assets/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('?�산 ?�정 ?�류:', error);
      throw error;
    }
  },

  // ?�산 ??��
  deleteAsset: async (id: number) => {
    try {
      const response = await api.delete(`/accounting/assets/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�산 ??�� ?�류:', error);
      throw error;
    }
  },

  // AI 자동 전표 목록
  getAutoVouchers: async (params?: { status?: string; sourceDocType?: string; q?: string; company_id?: number }) => {
    try {
      const response = await api.get('/accounting/auto-vouchers', { params });
      return response.data;
    } catch (error) {
      console.error('AI 자동 전표 목록 조회 오류:', error);
      throw error;
    }
  },

  // AI 자동 전표 상세
  getAutoVoucher: async (id: number, companyId?: number) => {
    try {
      const response = await api.get(`/accounting/auto-vouchers/${id}`, {
        params: companyId ? { company_id: companyId } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('AI 자동 전표 상세 조회 오류:', error);
      throw error;
    }
  },

  // AI 자동 전표 업로드 + 초안 생성
  uploadAutoVoucher: async (file: File, sourceDocType: string, companyId?: number) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('sourceDocType', sourceDocType);
      const response = await api.post('/accounting/auto-vouchers/upload', formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
        params: companyId ? { company_id: companyId } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('AI 자동 전표 업로드 오류:', error);
      throw error;
    }
  },

  // AI 자동 전표 수정
  updateAutoVoucher: async (id: number, data: any, companyId?: number) => {
    try {
      const response = await api.put(`/accounting/auto-vouchers/${id}`, data, {
        params: companyId ? { company_id: companyId } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('AI 자동 전표 수정 오류:', error);
      throw error;
    }
  },

  // AI 자동 전표 승인
  approveAutoVoucher: async (id: number, companyId?: number) => {
    try {
      const response = await api.post(`/accounting/auto-vouchers/${id}/approve`, {}, {
        params: companyId ? { company_id: companyId } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('AI 자동 전표 승인 오류:', error);
      throw error;
    }
  },

  // AI 자동 전표 Post
  postAutoVoucher: async (id: number, companyId?: number) => {
    try {
      const response = await api.post(`/accounting/auto-vouchers/${id}/post`, {}, {
        params: companyId ? { company_id: companyId } : undefined,
      });
      return response.data;
    } catch (error) {
      console.error('AI 자동 전표 Post 오류:', error);
      throw error;
    }
  },

  // AI 자동 전표 반려
  rejectAutoVoucher: async (id: number, reason: string, companyId?: number) => {
    try {
      const response = await api.post(
        `/accounting/auto-vouchers/${id}/reject`,
        { reason },
        { params: companyId ? { company_id: companyId } : undefined }
      );
      return response.data;
    } catch (error) {
      console.error('AI 자동 전표 반려 오류:', error);
      throw error;
    }
  },

  // AI 자동 전표 규칙 목록
  getAutoVoucherRules: async () => {
    try {
      const response = await api.get('/accounting/auto-voucher-rules');
      return response.data;
    } catch (error) {
      console.error('AI 자동 전표 규칙 조회 오류:', error);
      throw error;
    }
  },

  // AI 자동 전표 규칙 저장
  upsertAutoVoucherRule: async (data: any) => {
    try {
      const response = await api.post('/accounting/auto-voucher-rules', data);
      return response.data;
    } catch (error) {
      console.error('AI 자동 전표 규칙 저장 오류:', error);
      throw error;
    }
  },

  getGlAccounts: async (params?: { tree?: boolean; ledgerOnly?: boolean; company_id?: number }) => {
    const response = await api.get('/accounting/gl/accounts', {
      params: {
        tree: params?.tree ? 'true' : undefined,
        ledgerOnly: params?.ledgerOnly ? 'true' : undefined,
        company_id: params?.company_id,
      },
    });
    return response.data;
  },

  seedGlAccounts: async (companyId?: number) => {
    const response = await api.post('/accounting/gl/accounts/seed-defaults', {}, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  createGlAccount: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/gl/accounts', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  updateGlAccount: async (id: number, data: any, companyId?: number) => {
    const response = await api.put(`/accounting/gl/accounts/${id}`, data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  deleteGlAccount: async (id: number, companyId?: number) => {
    const response = await api.delete(`/accounting/gl/accounts/${id}`, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  getGlVouchers: async (params?: { status?: string; from?: string; to?: string; company_id?: number }) => {
    const response = await api.get('/accounting/gl/vouchers', { params });
    return response.data;
  },

  getGlVoucher: async (id: number, companyId?: number) => {
    const response = await api.get(`/accounting/gl/vouchers/${id}`, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  createGlVoucher: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/gl/vouchers', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  postGlVoucher: async (id: number, companyId?: number) => {
    const response = await api.post(`/accounting/gl/vouchers/${id}/post`, {}, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  getAccountLedger: async (params: { accountId: number; from?: string; to?: string; company_id?: number }) => {
    const response = await api.get('/accounting/gl/ledger', { params });
    return response.data;
  },

  getTrialBalance: async (params?: { from?: string; to?: string; company_id?: number }) => {
    const response = await api.get('/accounting/gl/trial-balance', { params });
    return response.data;
  },

  getProfitAndLoss: async (params?: { from?: string; to?: string; company_id?: number }) => {
    const response = await api.get('/accounting/gl/profit-and-loss', { params });
    return response.data;
  },

  // ── 직관적 전표 입력 마스터 API ──
  seedAccountingMasters: async (companyId?: number) => {
    const response = await api.post('/accounting/masters/seed', {}, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  getVoucherTypes: async (companyId?: number) => {
    const response = await api.get('/accounting/voucher-types', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  getTransactionItems: async (params?: { search?: string; company_id?: number }) => {
    const response = await api.get('/accounting/transaction-items', { params });
    return response.data;
  },

  getGstCodes: async (params?: { voucherDate?: string; company_id?: number }) => {
    const response = await api.get('/accounting/gst-codes', { params });
    return response.data;
  },

  getTdsCodes: async (companyId?: number) => {
    const response = await api.get('/accounting/tds-codes', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  getBankAccounts: async (companyId?: number) => {
    const response = await api.get('/accounting/bank-accounts', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  getFinancialYears: async (companyId?: number) => {
    const response = await api.get('/accounting/financial-years', {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  searchAccountingParties: async (params?: { search?: string; company_id?: number }) => {
    const response = await api.get('/accounting/parties', { params });
    return response.data;
  },

  searchGlAccounts: async (params?: { search?: string; company_id?: number }) => {
    const response = await api.get('/accounting/accounts/search', { params });
    return response.data;
  },

  previewVoucher: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/vouchers/preview', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  validateVoucherEntry: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/vouchers/validate', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  createEnhancedVoucher: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/vouchers/enhanced', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  getNextVoucherNumber: async (params: { voucherTypeId: number; voucherDate: string; company_id?: number }) => {
    const response = await api.get('/accounting/vouchers/next-number', { params });
    return response.data;
  },

  submitVoucherEntry: async (id: number, companyId?: number) => {
    const response = await api.post(`/accounting/vouchers/${id}/submit`, {}, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  approveVoucherEntry: async (id: number, companyId?: number) => {
    const response = await api.post(`/accounting/vouchers/${id}/approve`, {}, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  rejectVoucherEntry: async (id: number, reason: string, companyId?: number) => {
    const response = await api.post(`/accounting/vouchers/${id}/reject`, { reason }, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  upsertVoucherType: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/voucher-types', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  upsertTransactionItem: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/transaction-items', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  upsertGstCode: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/gst-codes', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  upsertTdsCode: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/tds-codes', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },

  upsertBankAccount: async (data: any, companyId?: number) => {
    const response = await api.post('/accounting/bank-accounts', data, {
      params: companyId ? { company_id: companyId } : undefined,
    });
    return response.data;
  },
};

// ?�사 관�?API ?�비??
export const accountingBasicInfoService = {
  getBasicInfo: async () => {
    try {
      const response = await api.get('/accounting/basic-info');
      return response.data;
    } catch (error) {
      console.error('?�계 기본?�보 조회 ?�류:', error);
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
      console.error('?�계 기본?�보 ?�???�류:', error);
      throw error;
    }
  }
};

// 급여 관�?API ?�비??
export const payrollService = {
  // 급여 목록 조회
  getPayrolls: async (params?: { page?: number; limit?: number; employee_id?: number; period?: string }) => {
    try {
      const response = await api.get('/hr/payrolls', { params });
      return response.data;
    } catch (error) {
      console.error('급여 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // 급여 ?�세 조회
  getPayroll: async (id: number) => {
    try {
      const response = await api.get(`/hr/payrolls/${id}`);
      return response.data;
    } catch (error) {
      console.error('급여 ?�세 조회 ?�류:', error);
      throw error;
    }
  },

  // 급여 ?�성
  createPayroll: async (data: any) => {
    try {
      const response = await api.post('/hr/payrolls', data);
      return response.data;
    } catch (error) {
      console.error('급여 ?�성 ?�류:', error);
      throw error;
    }
  },

  /** ?�정??급여 근무??YYYY-MM) 목록 */
  getPayrollPeriodLocks: async () => {
    try {
      const response = await api.get('/hr/payroll-period-locks');
      return response.data;
    } catch (error) {
      console.error('급여 ???�금 목록 조회 ?�류:', error);
      throw error;
    }
  },

  /** ?�택??근무??급여 ?�정(?�금) ???�반 ?�용?�는 ?�후 ?�당 ???�정 불�? */
  completePayrollPeriod: async (payroll_period: string) => {
    try {
      const response = await api.post('/hr/payroll-periods/complete', { payroll_period });
      return response.data;
    } catch (error) {
      console.error('급여 ???�정 ?�류:', error);
      throw error;
    }
  },

  /** ?�재 ?�사 ?�성 ?�용??기�? 급여 ?�괄 ?�성 (?�도 PF/ESI/PT/TDS ?�션 ?�택 가?? */
  /** ?�괄 ?�성 ?? ?�정·중복·직원�??�당 ??출퇴�?건수 ?�약 */
  previewBulkPayrollGeneration: async (payroll_period: string) => {
    try {
      const response = await api.post('/hr/payrolls/bulk-generate/preview', { payroll_period });
      return response.data;
    } catch (error) {
      console.error('급여 ?�괄 ?�성 미리보기 ?�류:', error);
      throw error;
    }
  },

  bulkGeneratePayrolls: async (
    payroll_period: string,
    opts?: {
      statutory_india?: boolean;
      /** 기본 gross_6pct(참고 ?�트). epf_12pct_half = ?�전 50%×12% EPF??*/
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
      console.error('급여 ?�괄 ?�성 ?�류:', error);
      throw error;
    }
  },

  /** 급여 명세??PDF(base64)�?직원 ?�메?�로 발송 */
  sendPayrollPayslip: async (id: number, pdf_base64: string) => {
    try {
      const response = await api.post(`/hr/payrolls/${id}/send-payslip`, { pdf_base64 });
      return response.data;
    } catch (error) {
      console.error('급여 명세??메일 ?�류:', error);
      throw error;
    }
  },

  // 급여 ?�정
  updatePayroll: async (id: number, data: any) => {
    try {
      const response = await api.put(`/hr/payrolls/${id}`, data);
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

  // 급여 ?�인
  approvePayroll: async (id: number) => {
    try {
      const response = await api.post(`/hr/payrolls/${id}/approve`);
      return response.data;
    } catch (error) {
      console.error('급여 ?�인 ?�류:', error);
      throw error;
    }
  },

  // 급여 지�?
  payPayroll: async (id: number) => {
    try {
      const response = await api.post(`/hr/payrolls/${id}/pay`);
      return response.data;
    } catch (error) {
      console.error('급여 지�??�류:', error);
      throw error;
    }
  }
};

// ?��? 관�?API ?�비??
export const ewayBillService = {
  // E-Way Bill 목록 조회
  getEWayBills: async (params?: { status?: string; invoice_number?: string; start_date?: string; end_date?: string; company_id?: number; page?: number; limit?: number }) => {
    try {
      const response = await api.get('/accounting/eway-bills', { params });
      return response.data;
    } catch (error) {
      console.error('E-Way Bill 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // E-Way Bill ?�세 조회
  getEWayBill: async (id: number) => {
    try {
      const response = await api.get(`/accounting/eway-bills/${id}`);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill ?�세 조회 ?�류:', error);
      throw error;
    }
  },

  // E-Way Bill ?�성
  createEWayBill: async (data: any) => {
    try {
      const response = await api.post('/accounting/eway-bills', data);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill ?�성 ?�류:', error);
      throw error;
    }
  },

  // E-Way Bill ?�정
  updateEWayBill: async (id: number, data: any) => {
    try {
      const response = await api.put(`/accounting/eway-bills/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill ?�정 ?�류:', error);
      throw error;
    }
  },

  // E-Way Bill ?�성 (?�태�?generated�?변�?
  generateEWayBill: async (id: number) => {
    try {
      const response = await api.post(`/accounting/eway-bills/${id}/generate`);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill ?�성 ?�류:', error);
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
      console.error('E-Way Bill 취소 ?�류:', error);
      throw error;
    }
  },

  // E-Way Bill ??��
  deleteEWayBill: async (id: number) => {
    try {
      const response = await api.delete(`/accounting/eway-bills/${id}`);
      return response.data;
    } catch (error) {
      console.error('E-Way Bill ??�� ?�류:', error);
      throw error;
    }
  }
};

