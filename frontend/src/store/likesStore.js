// src/store/likesStore.js
import { create } from "zustand";

export const useLikes = create((set, get) => ({
  matches: [],

  // Reemplaza toda la lista (p.ej. al cargar del backend)
  setAll: (items) => set({ matches: items || [] }),

  // Agrega o actualiza un match (por productId)
  addLocalMatch: (item) =>
    set((state) => {
      const existsIdx = state.matches.findIndex((m) => m.product.id === item.product.id);
      if (existsIdx >= 0) {
        const updated = [...state.matches];
        updated[existsIdx] = { ...updated[existsIdx], ...item };
        return { matches: updated };
      }
      return { matches: [item, ...state.matches] };
    }),

  clear: () => set({ matches: [] }),
}));
