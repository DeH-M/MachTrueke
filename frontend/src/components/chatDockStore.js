// src/components/chatDockStore.js
import { create } from "zustand";
import { chatsApi } from "../services/chatsApi"; // ← ruta relativa correcta en tu estructura

export const useChatDock = create((set, get) => ({
  isOpen: false,
  chatId: null,
  peer: null,

  // 🔹 Abre el dock desde un producto y crea el chat
  async openFromProduct(peerId, productId) {
    try {
      const chat = await chatsApi.openFromProduct(peerId, productId);
      set({ isOpen: true, chatId: chat.id, peer: chat.peer });
      console.log("✅ Chat abierto desde producto:", chat);
    } catch (err) {
      console.error("❌ Error abriendo chat desde producto:", err);
    }
  },

  // 🔹 (Puedes agregar más funciones si ya tienes otras)
  closeDock() {
    set({ isOpen: false, chatId: null, peer: null });
  },
}));
