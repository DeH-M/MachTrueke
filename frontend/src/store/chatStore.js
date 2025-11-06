import { create } from "zustand";
import { chatsApi } from "../services/chatsApi";

export const useChat = create((set, get) => ({
  isOpen: false,
  conversations: [], // [{id, peer:{id,name,avatar_url}, last_message, unread_count}]
  activeChatId: null,
  messages: {}, // { [chatId]: [{id,text,author_id,created_at}] }
  loading: false,
  error: "",

  openDock() { set({ isOpen: true }); },
  closeDock() { set({ isOpen: false, activeChatId: null }); },

  async refreshConversations() {
    try {
      const items = await chatsApi.listMyConversations();
      set({ conversations: items, error: "" });
    } catch (e) {
      set({ error: e.message || "No se pudieron cargar tus chats" });
    }
  },

  async openWithUser(peerUser) {
    // peerUser puede ser: number (id) o { id, name, avatar_url }
    const id = typeof peerUser === "number" ? peerUser : peerUser.id;
    const chat = await chatsApi.openOrCreateWithUser(id);
    set(state => {
      const exists = state.conversations.some(c => c.id === chat.id);
      return {
        isOpen: true,
        conversations: exists ? state.conversations : [chat, ...state.conversations],
        activeChatId: chat.id,
      };
    });
    await get().loadMessages(chat.id);
  },

  async loadMessages(chatId) {
    const msgs = await chatsApi.listMessages(chatId);
    set(state => ({ messages: { ...state.messages, [chatId]: msgs } }));
  },

  async send(chatId, text) {
    if (!text.trim()) return;
    const msg = await chatsApi.sendMessage(chatId, text.trim());
    set(state => ({
      messages: {
        ...state.messages,
        [chatId]: [ ...(state.messages[chatId] || []), msg ],
      },
    }));
  },

  async hideForMe(chatId) {
    await chatsApi.hideForMe(chatId);
    set(state => ({
      conversations: state.conversations.filter(c => c.id !== chatId),
      activeChatId: state.activeChatId === chatId ? null : state.activeChatId,
    }));
  },
}));
