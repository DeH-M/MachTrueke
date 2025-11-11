// src/services/chatsApi.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function baseFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const isMultipart =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const isFormUrlEncoded =
    typeof URLSearchParams !== "undefined" && options.body instanceof URLSearchParams;

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

  // 🔹 NUEVO: abrir chat indicando el producto de origen
  // Envía peer_id y, si viene definido, product_id (para que el backend inserte el mensaje "viene del producto")
  openFromProduct(peerUserId, productId) {
    const body = {
      peer_id: Number(peerUserId),
      ...(productId != null ? { product_id: Number(productId) } : {}),
    };
    return baseFetch(`/api/chats/open`, {
      method: "POST",
      body: JSON.stringify(body),
    });
  },

  // Lista conversaciones del usuario actual
  listMyConversations() {
    return baseFetch(`/api/chats/me`, { method: "GET" });
  },

  // Lista mensajes de una conversación
  listMessages(chatId) {
    return baseFetch(`/api/chats/${chatId}/messages`, { method: "GET" });
  },

  // 🔹 OPCIONAL (no rompe nada): lista mensajes después de un id concreto
  listMessagesSince(chatId, afterId) {
    const q = afterId ? `?after=${encodeURIComponent(afterId)}` : "";
    return baseFetch(`/api/chats/${chatId}/messages${q}`, { method: "GET" });
  },

  // Envía mensaje de texto
  sendMessage(chatId, text) {
    return baseFetch(`/api/chats/${chatId}/messages`, {
      method: "POST",
      body: JSON.stringify({ text }),
    });
  },

  // 🔹 NUEVO: obtener room_id para WebSocket (tiempo real)
  // Devuelve un string, no el objeto completo.
  async getRoomId(peerUserId) {
    const data = await baseFetch(`/api/chats/room-id?peer_id=${encodeURIComponent(peerUserId)}`, {
      method: "GET",
    });
    return data.room_id; // <- string
  },

  // 🔹 NUEVO: enviar adjuntos (múltiples archivos)
  // 'files' puede ser File[] o FileList del <input type="file" multiple>
  sendAttachments(chatId, files) {
    const fd = new FormData();
    for (const f of Array.from(files || [])) {
      fd.append("files", f); // el backend espera el campo "files"
    }
    return baseFetch(`/api/chats/${chatId}/attachments`, {
      method: "POST",
      body: fd, // baseFetch NO pondrá Content-Type para dejar el boundary correcto
    });
  },

  // Eliminar SOLO para mí
  hideForMe(chatId) {
    return baseFetch(`/api/chats/${chatId}/hide`, { method: "POST" });
  },
};
