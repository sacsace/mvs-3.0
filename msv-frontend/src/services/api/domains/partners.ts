import { api, API_BASE_URL, getAuthTokenFromStorage } from '../client';

export const partnerService = {
  // Excel ?�플 ?�운로드
  downloadExcelSample: async () => {
    const authToken = getAuthTokenFromStorage() || '';

    const response = await fetch(`${API_BASE_URL}/partners/excel/sample`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Excel ?�플 ?�일 ?�운로드???�패?�습?�다.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `?�트???�체_?�력_?�플_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Excel ?�일 ?�보?�기
  exportExcel: async () => {
    const authToken = getAuthTokenFromStorage() || '';

    const response = await fetch(`${API_BASE_URL}/partners/excel/export`, {
      method: 'GET',
      headers: {
        'Authorization': `Bearer ${authToken}`
      }
    });

    if (!response.ok) {
      throw new Error('Excel ?�일 ?�보?�기???�패?�습?�다.');
    }

    const blob = await response.blob();
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `?�트???�체_목록_${new Date().toISOString().split('T')[0]}.xlsx`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
  },

  // Excel ?�일 ?�로??
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

  // ?�트??목록 조회
  getPartners: async () => {
    const response = await api.get('/partners');
    return response.data;
  },

  // ?�정 ?�트??조회
  getPartner: async (id: number) => {
    const response = await api.get(`/partners/${id}`);
    return response.data;
  },

  // ?�트???�성
  createPartner: async (partnerData: any) => {
    const response = await api.post('/partners', partnerData);
    return response.data;
  },

  // ?�트???�정
  updatePartner: async (id: number, partnerData: any) => {
    const response = await api.put(`/partners/${id}`, partnerData);
    return response.data;
  },

  // ?�트????��
  deletePartner: async (id: number) => {
    const response = await api.delete(`/partners/${id}`);
    return response.data;
  }
};

// ?�스???�정 API ?�비??
