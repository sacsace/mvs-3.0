import { create } from 'zustand';
import { AppNotification } from '../utils/notificationFeed';

interface NotificationState {
  items: AppNotification[];
  mergeFromSources: (incoming: AppNotification[]) => void;
  markRead: (id: string) => void;
  markAllRead: () => void;
  remove: (id: string) => void;
  clearAll: () => void;
}

export const useNotificationStore = create<NotificationState>((set) => ({
  items: [],

  mergeFromSources: (incoming) => {
    set((state) => {
      const map = new Map(state.items.map((item) => [item.id, item]));
      for (const item of incoming) {
        const existing = map.get(item.id);
        map.set(item.id, existing ? { ...item, read: existing.read } : item);
      }
      const merged = Array.from(map.values()).sort(
        (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
      );
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
}));
