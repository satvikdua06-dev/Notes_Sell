import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../types';

interface CartStore {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (chapterId: string) => void;
  clear: () => void;
  has: (chapterId: string) => boolean;
  hasBundle: (subjectId: string) => boolean;
  total: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => {
          // Deduplicate: bundle items by bundleSubjectId, chapter items by chapterId
          const duplicate = item.bundleSubjectId
            ? s.items.find((i) => i.bundleSubjectId === item.bundleSubjectId)
            : s.items.find((i) => i.chapterId === item.chapterId && !i.bundleSubjectId);
          return duplicate ? s : { items: [...s.items, item] };
        }),
      remove: (chapterId) =>
        set((s) => ({ items: s.items.filter((i) => i.chapterId !== chapterId) })),
      clear: () => set({ items: [] }),
      has: (chapterId) =>
        !!get().items.find((i) => i.chapterId === chapterId && !i.bundleSubjectId),
      hasBundle: (subjectId) =>
        !!get().items.find((i) => i.bundleSubjectId === subjectId),
      total: () => get().items.reduce((sum, i) => sum + i.price, 0),
    }),
    { name: 'cart' }
  )
);
