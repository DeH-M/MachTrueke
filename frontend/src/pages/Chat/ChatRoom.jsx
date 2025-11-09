// src/pages/chat/ChatRoom.jsx
import { useCallback, useEffect, useMemo, useState } from "react";
import { useChatRealtime } from "../../hooks/useChatRealtime";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export default function ChatRoom({ chatId, peerId }) {
  const [messages, setMessages] = useState([]);
  const [roomId, setRoomId] = useState("");

  // 👤 Id del usuario actual (guardado en localStorage al hacer login)
  const meId = useMemo(() => Number(localStorage.getItem("user_id") || 0), []);

  // ===== Helpers de estado =====
  const addMessage = useCallback((m) => {
    setMessages((prev) =>
      prev.some((x) => String(x.id) === String(m.id)) ? prev : [...prev, m]
    );
  }, []);

  const hasMessage = useCallback(
    (id) => messages.some((x) => String(x.id) === String(id)),
    [messages]
  );

  // ===== Obtener room_id =====
  useEffect(() => {
    let alive = true;
    if (!peerId) return;
    (async () => {
      try {
        const res = await fetch(`${API_URL}/api/chats/room-id?peer_id=${peerId}`, {
          headers: {
            Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
          },
        });
        if (!res.ok) throw new Error(await res.text());
        const { room_id } = await res.json();
        if (alive) setRoomId(room_id);
      } catch (e) {
        console.error("room-id error:", e);
      }
    })();
    return () => {
      alive = false;
    };
  }, [peerId]);

  // ===== Activar WebSocket en tiempo real =====
  useChatRealtime({ roomId, chatId, meId, addMessage, hasMessage });

  // ===== Enviar mensaje =====
  async function handleSend(text) {
    const res = await fetch(`${API_URL}/api/chats/${chatId}/messages`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${localStorage.getItem("token") || ""}`,
      },
      body: JSON.stringify({ text }),
    });

    if (!res.ok) {
      console.error(await res.text());
      return;
    }

    const msg = await res.json();
    if (!hasMessage(String(msg.id))) addMessage(msg);
  }

  // ===== Render =====
  return (
    <div className="p-4">
      <div className="mb-3 text-sm text-gray-500">
        roomId: {roomId || "(cargando...)"} · meId: {meId || "-"}
      </div>

      <div className="space-y-2">
        {messages.map((m) => {
          // 👇 SOLO usamos sender_id (o user_id como respaldo). Ignoramos cualquier from_me externo.
          const fromMe = Number(m.sender_id ?? m.user_id) === Number(meId);

          return (
            <div
              key={m.id}
              className={`max-w-[75%] rounded-lg px-3 py-2 border shadow-sm ${
                fromMe
                  ? "ml-auto bg-blue-600 text-white"
                  : "mr-auto bg-white text-gray-800"
              }`}
            >
              {m.type === "image" ? (
                <img
                  src={m.url}
                  alt={m.name || ""}
                  className="max-w-xs rounded"
                />
              ) : (
                <span>{m.text}</span>
              )}
              <div
                className={`text-[11px] mt-1 ${
                  fromMe ? "text-blue-100" : "text-gray-500"
                }`}
              >
                {m.at
                  ? new Date(m.at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })
                  : ""}
              </div>
            </div>
          );
        })}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          const text = e.currentTarget.msg.value.trim();
          if (text) handleSend(text);
          e.currentTarget.reset();
        }}
      >
        <input
          name="msg"
          className="flex-1 border rounded px-3 py-2 focus:outline-none focus:ring-1 focus:ring-blue-400"
          placeholder="Escribe un mensaje..."
        />
        <button
          type="submit"
          className="bg-blue-600 text-white rounded px-4 hover:bg-blue-700"
        >
          Enviar
        </button>
      </form>
    </div>
  );
}
