import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { ApiResponse, LoginRequest, LoginResponse, User, UserFormData, Menu, Notification, ChatRoom, ChatMessage } from '../types';

class ApiService {
  private api: AxiosInstance;

  constructor() {
    this.api = axios.create({
      baseURL: process.env.REACT_APP_API_URL || 'http://localhost:5000/api',
      timeout: 10000,
      headers: {
        'Content-Type': 'application/json',
      },
    });

    // Request interceptor
    this.api.interceptors.request.use(
      (config) => {
        const token = localStorage.getItem('access_token');
        if (token) {
          config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
      },
      (error) => {
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.api.interceptors.response.use(
      (response) => response,
      async (error) => {
        const originalRequest = error.config;

        if (error.response?.status === 401 && !originalRequest._retry) {
          originalRequest._retry = true;

          try {
            const refreshToken = localStorage.getItem('refresh_token');
            if (refreshToken) {
              const response = await this.refreshToken(refreshToken);
              const { token } = response.data;
              
              localStorage.setItem('access_token', token);
              originalRequest.headers.Authorization = `Bearer ${token}`;
              
              return this.api(originalRequest);
            }
          } catch (refreshError) {
            localStorage.removeItem('access_token');
            localStorage.removeItem('refresh_token');
            window.location.href = '/login';
          }
        }

        return Promise.reject(error);
      }
    );
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<AxiosResponse<ApiResponse<LoginResponse>>> {
    return this.api.post('/auth/login', credentials);
  }

  async logout(): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.post('/auth/logout');
  }

  async refreshToken(refreshToken: string): Promise<AxiosResponse<ApiResponse<{ token: string }>>> {
    return this.api.post('/auth/refresh', { refresh_token: refreshToken });
  }

  async getProfile(): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.get('/auth/profile');
  }

  // User endpoints
  async getUsers(): Promise<AxiosResponse<ApiResponse<User[]>>> {
    return this.api.get('/users');
  }

  async getUser(id: number): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.get(`/users/${id}`);
  }

  async createUser(userData: UserFormData): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.post('/users', userData);
  }

  async updateUser(id: number, userData: UserFormData): Promise<AxiosResponse<ApiResponse<User>>> {
    return this.api.put(`/users/${id}`, userData);
  }

  async deleteUser(id: number): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.delete(`/users/${id}`);
  }

  // Menu endpoints
  async getMenus(): Promise<AxiosResponse<ApiResponse<Menu[]>>> {
    return this.api.get('/menus');
  }

  async getUserMenus(): Promise<AxiosResponse<ApiResponse<Menu[]>>> {
    return this.api.get('/menus/user');
  }

  // Notification endpoints
  async getNotifications(): Promise<AxiosResponse<ApiResponse<Notification[]>>> {
    return this.api.get('/notifications');
  }

  async markNotificationAsRead(id: number): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.put(`/notifications/${id}/read`);
  }

  async deleteNotification(id: number): Promise<AxiosResponse<ApiResponse<null>>> {
    return this.api.delete(`/notifications/${id}`);
  }

  // Chat endpoints
  async getChatRooms(): Promise<AxiosResponse<ApiResponse<ChatRoom[]>>> {
    return this.api.get('/chat/rooms');
  }

  async getChatMessages(roomId: number): Promise<AxiosResponse<ApiResponse<ChatMessage[]>>> {
    return this.api.get(`/chat/rooms/${roomId}/messages`);
  }

  async sendMessage(roomId: number, message: string): Promise<AxiosResponse<ApiResponse<ChatMessage>>> {
    return this.api.post(`/chat/rooms/${roomId}/messages`, { message });
  }

  // File upload
  async uploadFile(file: File): Promise<AxiosResponse<ApiResponse<{ url: string }>>> {
    const formData = new FormData();
    formData.append('file', file);
    
    return this.api.post('/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  }

  // Generic method for custom requests
  async request<T>(config: AxiosRequestConfig): Promise<AxiosResponse<ApiResponse<T>>> {
    return this.api.request(config);
  }
}

export const apiService = new ApiService();
export default apiService;
