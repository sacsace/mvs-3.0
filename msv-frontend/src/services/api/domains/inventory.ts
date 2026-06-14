import { api, API_BASE_URL, getAuthTokenFromStorage } from '../client';

export const inventoryService = {
  getProductCategories: async () => {
    try {
      const response = await api.get('/inventory/product-categories');
      return response.data;
    } catch (error) {
      console.error('?�품 카테고리 목록 ?�류:', error);
      throw error;
    }
  },
  createProductCategory: async (name: string) => {
    try {
      const response = await api.post('/inventory/product-categories', { name });
      return response.data;
    } catch (error) {
      console.error('?�품 카테고리 ?�록 ?�류:', error);
      throw error;
    }
  },
  updateProductCategory: async (id: number, name: string) => {
    try {
      const response = await api.put(`/inventory/product-categories/${id}`, { name });
      return response.data;
    } catch (error) {
      console.error('?�품 카테고리 ?�정 ?�류:', error);
      throw error;
    }
  },
  deleteProductCategory: async (id: number) => {
    try {
      const response = await api.delete(`/inventory/product-categories/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�품 카테고리 ??�� ?�류:', error);
      throw error;
    }
  },
  getInventoryLocations: async () => {
    try {
      const response = await api.get('/inventory/inventory-locations');
      return response.data;
    } catch (error) {
      console.error('보�? ?�치 목록 ?�류:', error);
      throw error;
    }
  },
  createInventoryLocation: async (name: string) => {
    try {
      const response = await api.post('/inventory/inventory-locations', { name });
      return response.data;
    } catch (error) {
      console.error('보�? ?�치 ?�록 ?�류:', error);
      throw error;
    }
  },
  updateInventoryLocation: async (id: number, name: string) => {
    try {
      const response = await api.put(`/inventory/inventory-locations/${id}`, { name });
      return response.data;
    } catch (error) {
      console.error('보�? ?�치 ?�정 ?�류:', error);
      throw error;
    }
  },
  deleteInventoryLocation: async (id: number) => {
    try {
      const response = await api.delete(`/inventory/inventory-locations/${id}`);
      return response.data;
    } catch (error) {
      console.error('보�? ?�치 ??�� ?�류:', error);
      throw error;
    }
  },
  getProductUnits: async () => {
    try {
      const response = await api.get('/inventory/product-units');
      return response.data;
    } catch (error) {
      console.error('?�품 ?�위 목록 ?�류:', error);
      throw error;
    }
  },
  createProductUnit: async (name: string) => {
    try {
      const response = await api.post('/inventory/product-units', { name });
      return response.data;
    } catch (error) {
      console.error('?�품 ?�위 ?�록 ?�류:', error);
      throw error;
    }
  },
  updateProductUnit: async (id: number, name: string) => {
    try {
      const response = await api.put(`/inventory/product-units/${id}`, { name });
      return response.data;
    } catch (error) {
      console.error('?�품 ?�위 ?�정 ?�류:', error);
      throw error;
    }
  },
  deleteProductUnit: async (id: number) => {
    try {
      const response = await api.delete(`/inventory/product-units/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�품 ?�위 ??�� ?�류:', error);
      throw error;
    }
  },

  // ?�품 목록 조회
  getProducts: async (params?: any) => {
    try {
      const response = await api.get('/inventory/products', { params });
      return response.data;
    } catch (error) {
      console.error('?�품 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�정 ?�품 조회
  getProduct: async (id: number) => {
    try {
      const response = await api.get(`/inventory/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�품 조회 ?�류:', error);
      throw error;
    }
  },

  /** ?�품 ?�진 ?�로????{ success, data: { url } } */
  uploadProductImage: async (file: File) => {
    try {
      const formData = new FormData();
      formData.append('file', file);
      const response = await api.post('/inventory/products/upload-image', formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });
      return response.data;
    } catch (error) {
      console.error('?�품 ?��?지 ?�로???�류:', error);
      throw error;
    }
  },

  // ?�품 ?�성
  createProduct: async (productData: any) => {
    try {
      const response = await api.post('/inventory/products', productData);
      return response.data;
    } catch (error) {
      console.error('?�품 ?�성 ?�류:', error);
      throw error;
    }
  },

  // ?�품 ?�정
  updateProduct: async (id: number, productData: any) => {
    try {
      const response = await api.put(`/inventory/products/${id}`, productData);
      return response.data;
    } catch (error) {
      console.error('?�품 ?�정 ?�류:', error);
      throw error;
    }
  },

  // ?�품 ??��
  deleteProduct: async (id: number) => {
    try {
      const response = await api.delete(`/inventory/products/${id}`);
      return response.data;
    } catch (error) {
      console.error('?�품 ??�� ?�류:', error);
      throw error;
    }
  },

  // ?�고 보고??조회
  getInventoryReport: async () => {
    try {
      const response = await api.get('/inventory/report');
      return response.data;
    } catch (error) {
      console.error('?�고 보고??조회 ?�류:', error);
      throw error;
    }
  },

  // ?�고 거래 ?�역 조회
  getInventoryTransactions: async (params?: any) => {
    try {
      const response = await api.get('/inventory/transactions', { params });
      return response.data;
    } catch (error) {
      console.error('?�고 거래 ?�역 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�고 ?�고
  stockIn: async (stockData: any) => {
    try {
      const response = await api.post('/inventory/stock-in', stockData);
      return response.data;
    } catch (error) {
      console.error('?�고 ?�고 ?�류:', error);
      throw error;
    }
  },

  // ?�고 출고
  stockOut: async (stockData: any) => {
    try {
      const response = await api.post('/inventory/stock-out', stockData);
      return response.data;
    } catch (error) {
      console.error('?�고 출고 ?�류:', error);
      throw error;
    }
  },

  // ?�고 조정
  adjustStock: async (adjustData: any) => {
    try {
      const response = await api.post('/inventory/adjust-stock', adjustData);
      return response.data;
    } catch (error) {
      console.error('?�고 조정 ?�류:', error);
      throw error;
    }
  },

  /** ?��? ?�괄 반영 ?�식 ?�운로드 */
  downloadProductExcelSample: async (): Promise<Blob> => {
    const response = await api.get('/inventory/products/excel/sample', { responseType: 'blob' });
    return response.data;
  },

  /** ?��? ?�로?�로 ?�품 ?�괄 ?�록·?�정 */
  bulkUpdateProductsFromExcel: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/inventory/products/excel/bulk-update', formData, {
      headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  }
};

// ?�트??관�?API ?�비??