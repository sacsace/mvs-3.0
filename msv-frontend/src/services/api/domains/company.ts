import { api, API_BASE_URL, getAuthTokenFromStorage } from '../client';

export const companyService = {
  // ?�사 목록 조회
  getCompanies: async () => {
    try {
      const response = await api.get('/company');
      return response.data;
    } catch (error) {
      console.error('?�사 ?�보 로드 ?�류:', error);
      throw error;
    }
  },

  // ?�정 ?�사 조회
  getCompany: async (id: number) => {
    try {
      const response = await api.get(`/company/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�사 ?�보 로드 ?�류:', error);
      throw error;
    }
  },

  // ?�정 ?�사 GST 번호 조회
  getCompanyGstNumbers: async (id: number) => {
    try {
      const response = await api.get(`/company/${id}/gst-numbers`);
      return response.data;
    } catch (error) {
      console.error('?�사 GST 번호 로드 ?�류:', error);
      throw error;
    }
  },

  // ?�사 ?�성
  createCompany: async (companyData: any) => {
    try {
      const response = await api.post('/company', companyData);
      return response.data;
    } catch (error) {
      console.error('?�사 ?�성 ?�류:', error);
      throw error;
    }
  },

  // ?�사 ?�정
  updateCompany: async (id: number, companyData: any) => {
    try {
      const response = await api.put(`/company/${id}`, companyData);
      return response.data;
    } catch (error) {
      console.error('?�사 ?�정 ?�류:', error);
      throw error;
    }
  },

  // ?�사 ??��
  deleteCompany: async (id: number) => {
    try {
      const response = await api.delete(`/company/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�사 ??�� ?�류:', error);
      throw error;
    }
  }
};

// ?�용??API ?�비??