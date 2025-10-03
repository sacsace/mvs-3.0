import axios from 'axios';

const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// 요청 인터셉터
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('mvs-auth-storage');
    if (token) {
      try {
        const authData = JSON.parse(token);
        if (authData.state?.token) {
          config.headers.Authorization = `Bearer ${authData.state.token}`;
        }
      } catch (error) {
        console.error('토큰 파싱 오류:', error);
      }
    }
    return config;
  },
  (error) => {
    return Promise.reject(error);
  }
);

// 응답 인터셉터
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      // 인증 오류 시 로그아웃 처리
      localStorage.removeItem('mvs-auth-storage');
      window.location.href = '/';
    }
    return Promise.reject(error);
  }
);

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

  // 인보이스 삭제
  deleteInvoice: async (id: number) => {
    try {
      const response = await api.delete(`/accounting/invoices/${id}`);
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
  }
};

// 프로젝트 관리 API 서비스
export const projectService = {
  // 프로젝트 목록 조회
  getProjects: async (params?: any) => {
    try {
      const response = await api.get('/projects', { params });
      return response.data;
    } catch (error) {
      console.error('프로젝트 목록 조회 오류:', error);
      throw error;
    }
  },

  // 특정 프로젝트 조회
  getProject: async (id: number) => {
    try {
      const response = await api.get(`/projects/${id}`);
      return response.data;
    } catch (error) {
      console.error('프로젝트 조회 오류:', error);
      throw error;
    }
  },

  // 프로젝트 생성
  createProject: async (projectData: any) => {
    try {
      const response = await api.post('/projects', projectData);
      return response.data;
    } catch (error) {
      console.error('프로젝트 생성 오류:', error);
      throw error;
    }
  },

  // 프로젝트 수정
  updateProject: async (id: number, projectData: any) => {
    try {
      const response = await api.put(`/projects/${id}`, projectData);
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
  },

  // 프로젝트 상태 업데이트
  updateProjectStatus: async (id: number, status: string) => {
    try {
      const response = await api.put(`/projects/${id}/status`, { status });
      return response.data;
    } catch (error) {
      console.error('프로젝트 상태 업데이트 오류:', error);
      throw error;
    }
  }
};

export { api };
