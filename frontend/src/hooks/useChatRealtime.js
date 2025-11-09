// src/hooks/useChatRealtime.js
import { useEffect, useRef } from "react";
import { openChatSocket } from "../services/wsChat";

/**
 * roomId, chatId, meId, addMessage, hasMessage
 */
export function useChatRealtime({ roomId, chatId, meId, addMessage, hasMessage }) {
  const wsRef = useRef(null);

  useEffect(() => {
    if (!roomId) return;

    wsRef.current = openChatSocket(roomId, {
      onOpen: () => console.log("WS abierto:", roomId, "meId=", meId),
      onEvent: (evt) => {
        // Esperamos: { type:"message.created", chat_id, message:{ ... } }
        if (!evt || evt.type !== "message.created") return;
        if (String(evt.chat_id) !== String(chatId)) return;

        const raw = evt.message || {};

        // ⚠️ Ignora cualquier 'from_me' que venga del backend
        const sid = Number(
          raw.sender_id ?? raw.user_id ?? raw.sender ?? -1
        );

        const normalized = {
          id: String(raw.id),
          sender_id: sid,
          from_me: sid === Number(meId),  // 👈 Aquí se decide el lado SIEMPRE
          type: raw.type || "text",
          text: raw.text ?? "",
          url: raw.url ?? null,
          name: raw.name ?? null,
          at: raw.at || raw.created_at || new Date().toISOString(),
        };

        console.log("[WS] normalizado:", normalized); // debug clave

        if (!normalized.id) return;
        if (!hasMessage?.(normalized.id)) addMessage(normalized);
      },
      onError: (e) => console.error("WS error:", e),
    });

    return () => {
      try { wsRef.current?.close(); } catch {}
      wsRef.current = null;
    };
  }, [roomId, chatId, meId, addMessage, hasMessage]);
}
