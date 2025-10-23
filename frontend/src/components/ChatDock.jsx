// src/components/ChatDock.jsx
import { useEffect, useRef, useState } from "react";

// --- MOCK de contactos/hilos (reemplaza por tu data real cuando conectes backend) ---
const seed = [
  {
    id: "u1",
    name: "Hermione",
    avatar: "https://i.pravatar.cc/100?img=47",
    lastMessage: "Hola, claro",
    messages: [
      { id: 1, from: "them", type: "text", text: "Hola 👋", at: "09:18" },
      { id: 2, from: "me",   type: "text", text: "Me interesa tu producto", at: "09:20" },
      { id: 3, from: "them", type: "text", text: "Claro :)", at: "09:22" },
    ],
  },
  { id: "u2", name: "Dobby", avatar: "https://i.pravatar.cc/100?img=11", lastMessage: "Te mando fotos", messages: [] },
  { id: "u3", name: "Tom",   avatar: "https://i.pravatar.cc/100?img=15", lastMessage: "Gracias",        messages: [] },
  { id: "u4", name: "Ron",   avatar: "https://i.pravatar.cc/100?img=59", lastMessage: "Va!",            messages: [] },
  { id: "u5", name: "Harry", avatar: "https://i.pravatar.cc/100?img=22", lastMessage: "¿Cuándo nos vemos?", messages: [] },
];

export default function ChatDock() {
  const [threads, setThreads] = useState(seed);
  const [listOpen, setListOpen] = useState(false);
  const [docked, setDocked] = useState([]);   // ids de chats abiertos en ventanitas
  const [inputs, setInputs] = useState({});   // texto por chatId
  const fileInputRefs = useRef({});           // <input type="file"> por chatId

  const now = () => new Date().toLocaleTimeString().slice(0, 5);

  const openChat = (id) => {
    // Abre hasta 3 mini-chats. Si hay >3, descarta el más antiguo.
    setDocked((d) => (d.includes(id) ? d : [...d.slice(-2), id]));
    setListOpen(false);
  };

  const closeChat = (id) => setDocked((d) => d.filter((x) => x !== id));
  const threadById = (id) => threads.find((t) => t.id === id);

  const send = (id) => {
    const val = (inputs[id] || "").trim();
    if (!val) return;
    setThreads((prev) =>
      prev.map((t) =>
        t.id === id
          ? {
              ...t,
              lastMessage: val,
              messages: [...t.messages, { id: Date.now(), from: "me", type: "text", text: val, at: now() }],
            }
          : t
      )
    );
    setInputs((s) => ({ ...s, [id]: "" }));
  };

  const attachImage = (id, e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    setThreads((prev) =>
      prev.map((t) => {
        if (t.id !== id) return t;
        const imgs = files.map((f) => ({
          id: `${Date.now()}-${f.name}`,
          from: "me",
          type: "image",
          url: URL.createObjectURL(f), // reemplaza con URL del backend cuando subas el archivo
          name: f.name,
          at: now(),
        }));
        return { ...t, lastMessage: "📷 Imagen", messages: [...t.messages, ...imgs] };
      })
    );
    e.target.value = "";
  };

  // 🔔 MODIFICACIÓN: escucha eventos globales para abrir chats desde otras páginas
  useEffect(() => {
    const handler = (e) => {
      const id = e.detail?.id;
      if (id) openChat(id);
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, []);

  return (
    <>
      {/* Botón flotante: abre/cierra la lista */}
      <button
        onClick={() => setListOpen((o) => !o)}
        className="fixed left-4 bottom-4 z-50 rounded-full bg-blue-600 text-white w-12 h-12 grid place-items-center shadow-lg hover:bg-blue-700"
        title="Abrir chats"
        aria-label="Abrir chats"
      >
        {/* Icono chat (B/N por currentColor) */}
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
        </svg>
      </button>

      {/* Lista compacta de chats */}
      {listOpen && (
        <div className="fixed left-4 bottom-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-xl overflow-hidden">
          <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
            <span className="font-semibold">Chats</span>
            <button className="text-white/90" onClick={() => setListOpen(false)} title="Cerrar">✕</button>
          </div>

          <div className="p-3">
            <input
              placeholder="Buscar..."
              className="w-full text-sm rounded-xl ring-1 ring-black/5 border-0 px-3 py-2 bg-[#f5f2e9] outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <ul className="max-h-80 overflow-y-auto divide-y divide-neutral-200/60">
            {threads.map((t) => (
              <li key={t.id}>
                <button
                  onClick={() => openChat(t.id)}
                  className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50/80"
                >
                  <img src={t.avatar} alt={t.name} className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5" />
                  <div className="min-w-0 text-left">
                    <p className="text-sm font-semibold truncate">{t.name}</p>
                    <p className="text-[11px] text-neutral-500 truncate">{t.lastMessage || "…"}</p>
                  </div>
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Ventanitas (dock) */}
      <div className="fixed left-20 bottom-4 z-50 flex gap-3 flex-wrap">
        {docked.map((id) => (
          <MiniChat
            key={id}
            thread={threadById(id)}
            onClose={() => closeChat(id)}
            text={inputs[id] || ""}
            setText={(v) => setInputs((s) => ({ ...s, [id]: v }))}
            onSend={() => send(id)}
            onPickFiles={() => {
              if (!fileInputRefs.current[id]) fileInputRefs.current[id] = document.createElement("input");
              const input = fileInputRefs.current[id];
              input.type = "file";
              input.accept = "image/*";
              input.multiple = true;
              input.onchange = (e) => attachImage(id, e);
              input.click();
            }}
          />
        ))}
      </div>
    </>
  );
}

function MiniChat({ thread, onClose, text, setText, onSend, onPickFiles }) {
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [thread?.messages]);

  if (!thread) return null;

  return (
    <div className="w-72 max-w-[90vw] rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-200/60 bg-white/70 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <img src={thread.avatar} alt={thread.name} className="h-6 w-6 rounded-full object-cover ring-1 ring-black/5" />
          <p className="text-sm font-semibold truncate">{thread.name}</p>
        </div>
        <button className="text-neutral-500 hover:text-neutral-700" onClick={onClose} title="Cerrar">✕</button>
      </div>

      {/* Mensajes */}
      <div ref={listRef} className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 260 }}>
        {thread.messages.map((m) =>
          m.type === "image" ? (
            <Bubble key={m.id} mine={m.from === "me"}>
              <img src={m.url} alt={m.name || "imagen"} className="max-h-40 rounded-lg object-cover" />
              <Time mine={m.from === "me"}>{m.at}</Time>
            </Bubble>
          ) : (
            <Bubble key={m.id} mine={m.from === "me"}>
              {m.text}
              <Time mine={m.from === "me"}>{m.at}</Time>
            </Bubble>
          )
        )}
      </div>

      {/* Input */}
      <div className="px-2 pb-2">
        <div className="flex items-end gap-2">
          {/* icono galería (B/N) */}
          <button
            onClick={onPickFiles}
            className="px-2 py-2 rounded-lg ring-1 ring-black/5 bg-neutral-100 hover:bg-neutral-200 text-neutral-800"
            title="Adjuntar imagen"
            aria-label="Adjuntar imagen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <circle cx="8.5" cy="8.5" r="2.5"/>
              <path d="M21 15l-4.5-4.5L9 18"/>
            </svg>
          </button>

          <textarea
            rows={1}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Aa"
            className="flex-1 min-h-[38px] max-h-24 resize-y rounded-xl ring-1 ring-neutral-300 border-0 px-3 py-2 bg-[#f5f2e9] outline-none focus:ring-2 focus:ring-blue-500"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); onSend(); }
            }}
          />
          <button
            onClick={onSend}
            className="px-3 py-2 rounded-xl bg-blue-600 text-white font-semibold hover:bg-blue-700"
            title="Enviar"
          >
            ➤
          </button>
        </div>
      </div>
    </div>
  );
}

function Bubble({ mine, children }) {
  return (
    <div className={`flex ${mine ? "justify-end" : "justify-start"}`}>
      <div
        className={`max-w-[85%] rounded-2xl px-3 py-2 text-sm shadow-sm ring-1 ring-black/5 overflow-hidden ${
          mine ? "bg-blue-600 text-white rounded-br-sm" : "bg-neutral-200/80 text-neutral-900 rounded-bl-sm"
        }`}
      >
        <div className="whitespace-pre-wrap break-words">{children}</div>
      </div>
    </div>
  );
}

function Time({ mine, children }) {
  return (
    <div className={`text-[10px] mt-1 ${mine ? "text-white/80" : "text-neutral-600"}`}>{children}</div>
  );
}
