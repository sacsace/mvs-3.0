import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { GlobalState, User, Tenant, Company, Theme, Language, SidebarState, Notification } from '../types';

interface GlobalStore extends GlobalState {
  // Actions
  setUser: (user: User | null) => void;
  setTenant: (tenant: Tenant | null) => void;
  setCompany: (company: Company | null) => void;
  setTheme: (theme: Theme) => void;
  setLanguage: (language: Language) => void;
  setSidebar: (sidebar: Partial<SidebarState>) => void;
  addNotification: (notification: Notification) => void;
  removeNotification: (id: number) => void;
  markNotificationAsRead: (id: number) => void;
  setAuthenticated: (isAuthenticated: boolean) => void;
  setLoading: (isLoading: boolean) => void;
  logout: () => void;
}

const defaultTheme: Theme = {
  mode: 'light',
  primary: '#1976d2',
  secondary: '#dc004e',
  background: '#ffffff',
  surface: '#f5f5f5',
  text: '#000000',
};

const defaultSidebar: SidebarState = {
  isOpen: true,
  isCollapsed: false,
};

export const useGlobalStore = create<GlobalStore>()(
  persist(
    (set, get) => ({
      // Initial state
      user: null,
      tenant: null,
      company: null,
      theme: defaultTheme,
      language: 'ko',
      sidebar: defaultSidebar,
      notifications: [],
      isAuthenticated: false,
      isLoading: false,

      // Actions
      setUser: (user) => set({ user }),
      
      setTenant: (tenant) => set({ tenant }),
      
      setCompany: (company) => set({ company }),
      
      setTheme: (theme) => set({ theme }),
      
      setLanguage: (language) => set({ language }),
      
      setSidebar: (sidebar) => set((state) => ({
        sidebar: { ...state.sidebar, ...sidebar }
      })),
      
      addNotification: (notification) => set((state) => ({
        notifications: [...state.notifications, notification]
      })),
      
      removeNotification: (id) => set((state) => ({
        notifications: state.notifications.filter(n => n.id !== id)
      })),
      
      markNotificationAsRead: (id) => set((state) => ({
        notifications: state.notifications.map(n => 
          n.id === id ? { ...n, is_read: true } : n
        )
      })),
      
      setAuthenticated: (isAuthenticated) => set({ isAuthenticated }),
      
      setLoading: (isLoading) => set({ isLoading }),
      
      logout: () => set({
        user: null,
        tenant: null,
        company: null,
        notifications: [],
        isAuthenticated: false,
        isLoading: false,
      }),
    }),
    {
      name: 'mvs-storage',
      partialize: (state) => ({
        user: state.user,
        tenant: state.tenant,
        company: state.company,
        theme: state.theme,
        language: state.language,
        sidebar: state.sidebar,
        isAuthenticated: state.isAuthenticated,
      }),
    }
  )
);
