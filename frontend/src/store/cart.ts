import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CartItem } from '../types';

interface CartStore {
  items: CartItem[];
  add: (item: CartItem) => void;
  remove: (chapterId: string) => void;
  clear: () => void;
  has: (chapterId: string) => boolean;
  total: () => number;
}

export const useCart = create<CartStore>()(
  persist(
    (set, get) => ({
      items: [],
      add: (item) =>
        set((s) => s.items.find((i) => i.chapterId === item.chapterId)
          ? s
          : { items: [...s.items, item] }),
      remove: (chapterId) =>
        set((s) => ({ items: s.items.filter((i) => i.chapterId !== chapterId) })),
      clear: () => set({ items: [] }),
      has: (chapterId) => !!get().items.find((i) => i.chapterId === chapterId),
      total: () => get().items.reduce((sum, i) => sum + i.price, 0),
    }),
    { name: 'cart' }
  )
);
