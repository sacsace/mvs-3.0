import { create } from 'zustand';
import { AppNotification } from '../utils/notificationFeed';

interface NotificationState {
  items: AppNotification[];
  headerDismissedIds: string[];
  mergeFromSources: (incoming: AppNotification[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
  dismissAllFromHeader: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],
  headerDismissedIds: [],

  mergeFromSources: (incoming) => {
    set((state) => {
      // 소스 목록으로 교체(이전 사용자·만료 인박스 잔존 방지). 읽음만 유지.
      const readMap = new Map(state.items.map((item) => [item.id, item.read]));
      const merged = incoming.map((item) => ({
        ...item,
        read: readMap.has(item.id) ? Boolean(readMap.get(item.id)) : item.read,
      }));
      return { items: merged.slice(0, 200) };
    });
  },

  markRead: (id) => {
    set((state) => ({
      items: state.items.map((item) =>
        item.id === id ? { ...item, read: true } : item
      ),
    }));
  },

  markAllRead: () => {
    set((state) => ({
      items: state.items.map((item) => ({ ...item, read: true })),
    }));
  },

  remove: (id) => {
    set((state) => ({
      items: state.items.filter((item) => item.id !== id),
    }));
  },

  clearAll: () => {
    set({ items: [] });
  },

  dismissAllFromHeader: () => {
    set((state) => ({
      // 헤더 드롭다운에서만 숨기며 알림 관리 히스토리는 유지한다.
      headerDismissedIds: Array.from(
        new Set([...state.headerDismissedIds, ...state.items.map((item) => item.id)])
      ).slice(-1000),
    }));
  },
}));
