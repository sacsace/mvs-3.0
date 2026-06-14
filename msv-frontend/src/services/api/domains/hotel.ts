import { api, API_BASE_URL, getAuthTokenFromStorage } from '../client';

export const roomBookingService = {
  getRoomBookings: async (params?: { room_id?: number; user_id?: number; status?: string; check_in_date?: string; check_out_date?: string }) => {
    try {
      const response = await api.get('/work/room-bookings', { params });
      return response.data;
    } catch (error) {
      console.error('객실 ?�약 목록 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�의???�약 ?�세 조회
  getRoomBooking: async (id: number) => {
    try {
      const response = await api.get(`/work/room-bookings/${id}`);
      return response.data;
    } catch (error) {
      console.error('객실 ?�약 ?�세 조회 ?�류:', error);
      throw error;
    }
  },

  // ?�의???�약 ?�성
  createRoomBooking: async (data: any) => {
    try {
      const response = await api.post('/work/room-bookings', data);
      return response.data;
    } catch (error) {
      console.error('객실 ?�약 ?�성 ?�류:', error);
      throw error;
    }
  },

  // ?�의???�약 ?�정
  updateRoomBooking: async (id: number, data: any) => {
    try {
      const response = await api.put(`/work/room-bookings/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('객실 ?�약 ?�정 ?�류:', error);
      throw error;
    }
  },

  // ?�의???�약 ??��
  deleteRoomBooking: async (id: number) => {
    try {
      const response = await api.delete(`/work/room-bookings/${id}`);
      return response.data;
    } catch (error) {
      console.error('객실 ?�약 ??�� ?�류:', error);
      throw error;
    }
  },

  // ?�의???�약 ?�인
  confirmRoomBooking: async (id: number) => {
    try {
      const response = await api.post(`/work/room-bookings/${id}/confirm`);
      return response.data;
    } catch (error) {
      console.error('객실 ?�약 ?�인 ?�류:', error);
      throw error;
    }
  },

  // ?�의???�약 취소
  cancelRoomBooking: async (id: number) => {
    try {
      const response = await api.post(`/work/room-bookings/${id}/cancel`);
      return response.data;
    } catch (error) {
      console.error('객실 ?�약 취소 ?�류:', error);
      throw error;
    }
  }
};

// 객실 ?�형 API ?�비??
export const roomTypeService = {
  getRoomTypes: async (params?: { status?: string }) => {
    try {
      const response = await api.get('/work/room-types', { params });
      return response.data;
    } catch (error) {
      console.error('객실 ?�형 목록 조회 ?�류:', error);
      throw error;
    }
  },
  createRoomType: async (data: any) => {
    try {
      const response = await api.post('/work/room-types', data);
      return response.data;
    } catch (error) {
      console.error('객실 ?�형 ?�성 ?�류:', error);
      throw error;
    }
  },
  updateRoomType: async (id: number, data: any) => {
    try {
      const response = await api.put(`/work/room-types/${id}`, data);
      return response.data;
    } catch (error) {
      console.error('객실 ?�형 ?�정 ?�류:', error);
      throw error;
    }
  },
  deleteRoomType: async (id: number) => {
    try {
      const response = await api.delete(`/work/room-types/${id}`);
      return response.data;
    } catch (error) {
      console.error('객실 ?�형 ??�� ?�류:', error);
      throw error;
    }
  },
};

export const roomTypeRoomService = {
  getRoomTypeRooms: async (params?: { room_type_id?: number }) => {
    try {
      const response = await api.get('/work/room-type-rooms', { params });
      return response.data;
    } catch (error) {
      console.error('객실 ?�실�?목록 조회 ?�류:', error);
      throw error;
    }
  },
  upsertRoomTypeRoom: async (data: { room_type_id: number; room_number: string; room_name?: string }) => {
    try {
      const response = await api.put('/work/room-type-rooms', data);
      return response.data;
    } catch (error) {
      console.error('객실 ?�실�??�???�류:', error);
      throw error;
    }
  },
};

// ?�무 보고??API ?�비??