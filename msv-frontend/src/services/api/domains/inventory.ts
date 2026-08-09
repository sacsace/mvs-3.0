import { api } from '../client';

export const inventoryService = {
  getProductCategories: async () => {
    const response = await api.get('/inventory/product-categories');
    return response.data;
  },
  createProductCategory: async (name: string) => {
    const response = await api.post('/inventory/product-categories', { name });
    return response.data;
  },
  updateProductCategory: async (id: number, name: string) => {
    const response = await api.put(`/inventory/product-categories/${id}`, { name });
    return response.data;
  },
  deleteProductCategory: async (id: number) => {
    const response = await api.delete(`/inventory/product-categories/${id}`);
    return response.data;
  },
  getInventoryLocations: async () => {
    const response = await api.get('/inventory/inventory-locations');
    return response.data;
  },
  createInventoryLocation: async (name: string) => {
    const response = await api.post('/inventory/inventory-locations', { name });
    return response.data;
  },
  updateInventoryLocation: async (id: number, name: string) => {
    const response = await api.put(`/inventory/inventory-locations/${id}`, { name });
    return response.data;
  },
  deleteInventoryLocation: async (id: number) => {
    const response = await api.delete(`/inventory/inventory-locations/${id}`);
    return response.data;
  },
  getProductUnits: async () => {
    const response = await api.get('/inventory/product-units');
    return response.data;
  },
  createProductUnit: async (name: string) => {
    const response = await api.post('/inventory/product-units', { name });
    return response.data;
  },
  updateProductUnit: async (id: number, name: string) => {
    const response = await api.put(`/inventory/product-units/${id}`, { name });
    return response.data;
  },
  deleteProductUnit: async (id: number) => {
    const response = await api.delete(`/inventory/product-units/${id}`);
    return response.data;
  },

  // ?�품 목록 조회
  getProducts: async (params?: any) => {
    const response = await api.get('/inventory/products', { params });
    return response.data;
  },

  // ?�정 ?�품 조회
  getProduct: async (id: number) => {
    const response = await api.get(`/inventory/products/${id}`);
    return response.data;
  },

  /** ?�품 ?�진 ?�로????{ success, data: { url } } */
  uploadProductImage: async (file: File) => {
    const formData = new FormData();
    formData.append('file', file);
    const response = await api.post('/inventory/products/upload-image', formData, {
    headers: { 'Content-Type': 'multipart/form-data' }
    });
    return response.data;
  },

  // ?�품 ?�성
  createProduct: async (productData: any) => {
    const response = await api.post('/inventory/products', productData);
    return response.data;
  },

  // ?�품 ?�정
  updateProduct: async (id: number, productData: any) => {
    const response = await api.put(`/inventory/products/${id}`, productData);
    return response.data;
  },

  // ?�품 ??��
  deleteProduct: async (id: number) => {
    const response = await api.delete(`/inventory/products/${id}`);
    return response.data;
  },

  // ?�고 보고??조회
  getInventoryReport: async () => {
    const response = await api.get('/inventory/report');
    return response.data;
  },

  // ?�고 거래 ?�역 조회
  getInventoryTransactions: async (params?: any) => {
    const response = await api.get('/inventory/transactions', { params });
    return response.data;
  },

  // ?�고 ?�고
  stockIn: async (stockData: any) => {
    const response = await api.post('/inventory/stock-in', stockData);
    return response.data;
  },

  // ?�고 출고
  stockOut: async (stockData: any) => {
    const response = await api.post('/inventory/stock-out', stockData);
    return response.data;
  },

  // ?�고 조정
  adjustStock: async (adjustData: any) => {
    const response = await api.post('/inventory/adjust-stock', adjustData);
    return response.data;
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
