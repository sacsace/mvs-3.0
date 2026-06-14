import { create } from 'zustand';

export interface ErrorInfo {
  id: string;
  title: string;
  message: string;
  details?: string;
  timestamp: Date;
  type?: 'error' | 'warning' | 'info';
}

export interface NotificationInfo {
  id: string;
  message: string;
  severity: 'info' | 'warning' | 'success';
  timestamp: Date;
}

interface ErrorState {
  errors: ErrorInfo[];
  notifications: NotificationInfo[];
  showError: (title: string, message: string, details?: string, type?: 'error' | 'warning' | 'info') => void;
  showNotification: (message: string, severity?: 'info' | 'warning' | 'success') => void;
  removeError: (id: string) => void;
  removeNotification: (id: string) => void;
  clearErrors: () => void;
  clearNotifications: () => void;
  removeOldErrors: () => void;
}

export const useErrorStore = create<ErrorState>((set) => ({
  errors: [],
  notifications: [],

  showNotification: (message: string, severity: 'info' | 'warning' | 'success' = 'warning') => {
    const notification: NotificationInfo = {
      id: `notification-${Date.now()}-${Math.random()}`,
      message,
      severity,
      timestamp: new Date()
    };
    set((state) => ({
      notifications: [...state.notifications, notification].slice(-5) // 최대 5개
    }));
  },

  showError: (title: string, message: string, details?: string, type: 'error' | 'warning' | 'info' = 'error') => {
    const error: ErrorInfo = {
      id: `error-${Date.now()}-${Math.random()}`,
      title,
      message,
      details,
      timestamp: new Date(),
      type
    };
    
    set((state) => {
      const dedupeWindowMs = 30 * 1000;
      const now = Date.now();
      const isDuplicate = state.errors.some(
        (existing) =>
          existing.title === title &&
          existing.message === message &&
          now - existing.timestamp.getTime() < dedupeWindowMs
      );
      if (isDuplicate) {
        return state;
      }

      // 최대 100개의 에러만 유지 (오래된 에러는 자동 삭제)
      const maxErrors = 100;
      const newErrors = [...state.errors, error];
      
      // 최대 개수를 초과하면 오래된 에러부터 삭제
      if (newErrors.length > maxErrors) {
        newErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        return { errors: newErrors.slice(0, maxErrors) };
      }
      
      return { errors: newErrors };
    });
  },
  
  removeError: (id: string) => {
    set((state) => ({
      errors: state.errors.filter((error) => error.id !== id)
    }));
  },

  removeNotification: (id: string) => {
    set((state) => ({
      notifications: state.notifications.filter((n) => n.id !== id)
    }));
  },

  clearErrors: () => {
    set({ errors: [] });
  },

  clearNotifications: () => {
    set({ notifications: [] });
  },
  
  removeOldErrors: () => {
    set((state) => {
      const maxErrors = 100;
      const maxAge = 24 * 60 * 60 * 1000; // 24시간
      const now = new Date();
      
      // 오래된 에러 제거 (24시간 이상)
      let filteredErrors = state.errors.filter(
        error => now.getTime() - error.timestamp.getTime() < maxAge
      );
      
      // 최대 개수 제한
      if (filteredErrors.length > maxErrors) {
        filteredErrors.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
        filteredErrors = filteredErrors.slice(0, maxErrors);
      }
      
      return { errors: filteredErrors };
    });
  }
}));


