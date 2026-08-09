import { api } from '../client';

export const companyService = {
  // ?�사 목록 조회
  getCompanies: async () => {
    const response = await api.get('/company');
    return response.data;
  },

  // ?�정 ?�사 조회
  getCompany: async (id: number) => {
    const response = await api.get(`/company/${id}`);
    return response.data;
  },

  // ?�정 ?�사 GST 번호 조회
  getCompanyGstNumbers: async (id: number) => {
    const response = await api.get(`/company/${id}/gst-numbers`);
    return response.data;
  },

  // ?�사 ?�성
  createCompany: async (companyData: any) => {
    const response = await api.post('/company', companyData);
    return response.data;
  },

  // ?�사 ?�정
  updateCompany: async (id: number, companyData: any) => {
    const response = await api.put(`/company/${id}`, companyData);
    return response.data;
  },

  // ?�사 ??��
  deleteCompany: async (id: number) => {
    const response = await api.delete(`/company/${id}`);
    return response.data;
  }
};

// ?�용??API ?�비??
