// src/services/wsChat.js
import { wsUrl } from "../utils/wsUrl";

// Abre un WebSocket para un roomId dado
export function openChatSocket(roomId, handlers = {}) {
  const { onOpen, onClose, onEvent, onError } = handlers;

  // Construimos la URL correcta (usa ws:// o wss:// según el entorno)
  const url = wsUrl(`/api/chats/ws/${roomId}`);
  const ws = new WebSocket(url);

  // Eventos de conexión
  ws.onopen = () => {
    if (onOpen) onOpen();
  };

  ws.onclose = () => {
    if (onClose) onClose();
  };

  ws.onerror = (e) => {
    if (onError) onError(e);
  };

  // Evento cuando llega un mensaje desde el backend
  ws.onmessage = (e) => {
    try {
      const evt = JSON.parse(e.data); // { type, chat_id?, message? }
      if (onEvent) onEvent(evt);
    } catch {
      // Si llega texto plano (no JSON), lo ignoramos
    }
  };

  return ws; // Devuelve la instancia del WebSocket (para cerrarlo luego)
}
