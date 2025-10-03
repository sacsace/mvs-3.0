import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Menu, UserPermission } from '../services/menuService';

export interface User {
  id: number;
  userid: string;
  username: string;
  email: string;
  role: string;
  tenant_id: number;
  company_id: number;
}

interface AuthState {
  isAuthenticated: boolean;
  token: string | null;
  user: User | null;
  login: (token: string, user: User) => void;
  logout: () => void;
  updateUser: (user: Partial<User>) => void;
}

interface MenuState {
  menus: Menu[];
  userPermissions: UserPermission[];
  loading: boolean;
  error: string | null;
  language: 'ko' | 'en';
  setMenus: (menus: Menu[]) => void;
  setUserPermissions: (permissions: UserPermission[]) => void;
  setLoading: (loading: boolean) => void;
  setError: (error: string | null) => void;
  setLanguage: (language: 'ko' | 'en') => void;
  hasMenuPermission: (menuId: number, action: 'view' | 'create' | 'edit' | 'delete') => boolean;
  getMenuByRoute: (route: string) => Menu | undefined;
  getMenusByLevel: (level: number) => Menu[];
}

export const useStore = create<AuthState>()(
  persist(
    (set, get) => ({
      isAuthenticated: false,
      token: null,
      user: null,
      login: (token: string, user: User) => {
        set({
          isAuthenticated: true,
          token,
          user
        });
      },
      logout: () => {
        set({
          isAuthenticated: false,
          token: null,
          user: null
        });
      },
      updateUser: (userData: Partial<User>) => {
        const currentUser = get().user;
        if (currentUser) {
          set({
            user: { ...currentUser, ...userData }
          });
        }
      }
    }),
    {
      name: 'mvs-auth-storage',
      partialize: (state) => ({
        isAuthenticated: state.isAuthenticated,
        token: state.token,
        user: state.user
      })
    }
  )
);

export const useMenuStore = create<MenuState>()((set, get) => ({
  menus: [],
  userPermissions: [],
  loading: false,
  error: null,
  language: 'ko',
  
  setMenus: (menus: Menu[]) => set({ menus }),
  setUserPermissions: (permissions: UserPermission[]) => set({ userPermissions: permissions }),
  setLoading: (loading: boolean) => set({ loading }),
  setError: (error: string | null) => set({ error }),
  setLanguage: (language: 'ko' | 'en') => set({ language }),
  
  hasMenuPermission: (menuId: number, action: 'view' | 'create' | 'edit' | 'delete') => {
    const { userPermissions } = get();
    const permission = userPermissions.find(p => p.menu_id === menuId);
    if (!permission) return false;
    
    switch (action) {
      case 'view':
        return permission.can_view;
      case 'create':
        return permission.can_create;
      case 'edit':
        return permission.can_edit;
      case 'delete':
        return permission.can_delete;
      default:
        return false;
    }
  },
  
  getMenuByRoute: (route: string) => {
    const { menus } = get();
    const findMenuByRoute = (menuList: Menu[]): Menu | undefined => {
      for (const menu of menuList) {
        if (menu.route === route) return menu;
        if (menu.children) {
          const found = findMenuByRoute(menu.children);
          if (found) return found;
        }
      }
      return undefined;
    };
    return findMenuByRoute(menus);
  },
  
  getMenusByLevel: (level: number) => {
    const { menus } = get();
    const getMenusAtLevel = (menuList: Menu[], currentLevel: number = 0): Menu[] => {
      if (currentLevel === level) return menuList;
      
      const result: Menu[] = [];
      menuList.forEach(menu => {
        if (menu.children) {
          result.push(...getMenusAtLevel(menu.children, currentLevel + 1));
        }
      });
      return result;
    };
    return getMenusAtLevel(menus);
  }
}));
