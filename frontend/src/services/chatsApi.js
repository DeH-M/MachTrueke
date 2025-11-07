const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function baseFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const isMultipart = typeof FormData !== "undefined" && options.body instanceof FormData;
  const isFormUrlEncoded = typeof URLSearchParams !== "undefined" && options.body instanceof URLSearchParams;

  const headers = {
    ...(isMultipart || isFormUrlEncoded ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  if (!res.ok) {
    let err = await res.text().catch(() => "");
    try { const j = JSON.parse(err); err = j.detail || err; } catch {}
    throw new Error(err || `HTTP ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

export const chatsApi = {
  // Obtiene (o crea si no existe) una conversación con ese usuario
  openOrCreateWithUser(peerUserId) {
    return baseFetch(`/api/chats/open-with/${peerUserId}`, { method: "POST" });
  },
  // Lista conversaciones del usuario actual
  listMyConversations() {
    return baseFetch(`/api/chats/me`, { method: "GET" });
  },
  // Lista mensajes de una conversación
  listMessages(chatId) {
    return baseFetch(`/api/chats/${chatId}/messages`, { method: "GET" });
  },
  // Envía mensaje
  sendMessage(chatId, text) {
    return baseFetch(`/api/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },
  // Eliminar SOLO para mí
  hideForMe(chatId) {
    return baseFetch(`/api/chats/${chatId}/hide`, { method: "POST" });
  },
};
