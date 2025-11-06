// src/components/ChatDock.jsx
import { useEffect, useMemo, useRef, useState } from "react";

/* ===========================
   Helpers HTTP (con token)
=========================== */
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function baseFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const isMultipart =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const isUrlEncoded =
    typeof URLSearchParams !== "undefined" &&
    options.body instanceof URLSearchParams;

  const headers = {
    ...(isMultipart || isUrlEncoded ? {} : { "Content-Type": "application/json" }),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
    ...(options.headers || {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  // Para 204 no hay body
  if (res.status === 204) return { ok: true };
  const txt = await res.text();
  let data = null;
  try {
    data = txt ? JSON.parse(txt) : null;
  } catch {
    data = txt || null;
  }
  if (!res.ok) {
    const msg = data?.detail || data?.message || `Error ${res.status}`;
    throw new Error(msg);
  }
  return data;
}

/* ===========================
   API Chats (ajusta paths si tu backend difiere)
=========================== */
const chatsApi = {
  // Lista hilos visibles para el usuario actual
  listThreads() {
    return baseFetch("/api/chats", { method: "GET" });
  },
  // Garantiza/abre un hilo con el peer (y opcional product_id)
  openThread({ peer_id, product_id }) {
    return baseFetch("/api/chats/open", {
      method: "POST",
      body: JSON.stringify({ peer_id, product_id }),
    });
  },
  // Trae mensajes (usa ?after=iso para polling incremental)
  listMessages(threadId, { after } = {}) {
    const q = after ? `?after=${encodeURIComponent(after)}` : "";
    return baseFetch(`/api/chats/${threadId}/messages${q}`, { method: "GET" });
  },
  // Enviar texto
  sendText(threadId, text) {
    return baseFetch(`/api/chats/${threadId}/messages`, {
      method: "POST",
      body: JSON.stringify({ type: "text", text }),
    });
  },
  // Enviar archivos (imágenes)
  sendFiles(threadId, files) {
    const fd = new FormData();
    for (const f of files) fd.append("files", f);
    return baseFetch(`/api/chats/${threadId}/attachments`, {
      method: "POST",
      body: fd,
    });
  },
  // Ocultar (solo para mí)
  hideThread(threadId) {
    // adapta si en tu backend es PATCH/DELETE y/o la ruta exacta
    return baseFetch(`/api/chats/${threadId}/hide`, {
      method: "PATCH",
      body: JSON.stringify({ hidden: true }),
    });
  },
};

/* ===========================
   Tipos de datos esperados
   Thread: {
     id, peer: { id, name, avatar_url }, last_message_at, last_message_text,
     unread_count, product_id?
   }
   Message: { id, from_me:boolean, type:"text"|"image", text?, url?, name?, at: iso }
=========================== */

const fallbackAvatar = "https://i.pravatar.cc/100?img=12";

export default function ChatDock() {
  const [threads, setThreads] = useState([]);         // lista de hilos
  const [docked, setDocked] = useState([]);           // ids de chats abiertos en ventanitas
  const [listOpen, setListOpen] = useState(false);    // panel de lista
  const [inputs, setInputs] = useState({});           // texto por threadId
  const fileInputRefs = useRef({});                   // inputs file por threadId
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState("");

  // Mapa de mensajes por hilo
  const [msgsByThread, setMsgsByThread] = useState({}); // { [threadId]: Message[] }
  const lastIsoByThread = useRef({}); // control de polling incremental

  const nowIso = () => new Date().toISOString();

  /* -------- Cargar hilos al montar -------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      setLoading(true);
      setErr("");
      try {
        const data = await chatsApi.listThreads();
        if (!alive) return;
        setThreads(normalizeThreads(data));
      } catch (e) {
        if (!alive) return;
        setErr(e.message || "No se pudieron cargar tus chats.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  function normalizeThreads(data) {
    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return arr.map((t) => ({
      id: String(t.id),
      peer: {
        id: String(t.peer?.id ?? t.peer_id ?? t.user_id ?? ""),
        name: t.peer?.name ?? t.peer_name ?? "Usuario",
        avatar_url: t.peer?.avatar_url ?? t.avatar_url ?? fallbackAvatar,
      },
      last_message_at: t.last_message_at ?? t.updated_at ?? nowIso(),
      last_message_text: t.last_message_text ?? "",
      unread_count: t.unread_count ?? 0,
      product_id: t.product_id ?? null,
    }));
  }

  /* -------- Abrir/cerrar mini ventanas -------- */
  const openChat = (threadId) => {
    setDocked((d) => (d.includes(threadId) ? d : [...d.slice(-2), threadId])); // máximo 3
    setListOpen(false);
  };
  const closeChat = (threadId) => setDocked((d) => d.filter((x) => x !== threadId));

  const threadById = (id) => threads.find((t) => t.id === id);

  /* -------- Cargar mensajes cuando abrimos un hilo -------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const id of docked) {
        if (msgsByThread[id]) continue; // ya cargado
        try {
          const data = await chatsApi.listMessages(id);
          if (!alive) return;
          setMsgsByThread((m) => ({ ...m, [id]: normalizeMessages(data) }));
          // set last seen timestamp para polling
          const last = getLastIso(data);
          if (last) lastIsoByThread.current[id] = last;
        } catch (e) {
          // silencioso en primer fetch por UX
          console.error("load messages error:", e);
        }
      }
    })();
    return () => { alive = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [docked]);

  function normalizeMessages(data) {
    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    return arr.map((m) => ({
      id: String(m.id),
      from_me: !!(m.from_me ?? m.from === "me" ?? m.mine),
      type: m.type ?? (m.url ? "image" : "text"),
      text: m.text ?? "",
      url: m.url ?? null,
      name: m.name ?? null,
      at: m.at ?? m.created_at ?? nowIso(),
    }));
  }
  const getLastIso = (data) => {
    const arr = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
    if (!arr.length) return null;
    const last = arr[arr.length - 1];
    return last.at ?? last.created_at ?? null;
  };

  /* -------- Polling de mensajes nuevos en hilos abiertos -------- */
  useEffect(() => {
    const iv = setInterval(async () => {
      for (const id of docked) {
        const after = lastIsoByThread.current[id];
        try {
          const data = await chatsApi.listMessages(id, { after });
          const news = normalizeMessages(data);
          if (news.length) {
            setMsgsByThread((m) => ({ ...m, [id]: [...(m[id] || []), ...news] }));
            const last = getLastIso(data);
            if (last) lastIsoByThread.current[id] = last;
          }
        } catch {
          // ignoramos errores de polling
        }
      }
    }, 5000);
    return () => clearInterval(iv);
  }, [docked]);

  /* -------- Enviar texto -------- */
  const send = async (threadId) => {
    const val = (inputs[threadId] || "").trim();
    if (!val) return;
    setInputs((s) => ({ ...s, [threadId]: "" }));

    // Optimista
    const temp = {
      id: `tmp-${Date.now()}`,
      from_me: true,
      type: "text",
      text: val,
      at: nowIso(),
    };
    setMsgsByThread((m) => ({ ...m, [threadId]: [...(m[threadId] || []), temp] }));

    try {
      const saved = await chatsApi.sendText(threadId, val);
      const normalized = normalizeMessages([saved])[0] || temp;
      // Reemplazar temporal por saved
      setMsgsByThread((m) => ({
        ...m,
        [threadId]: (m[threadId] || []).map((msg) => (msg.id === temp.id ? normalized : msg)),
      }));
      lastIsoByThread.current[threadId] = normalized.at;
    } catch (e) {
      // revertir optimista si falla
      setMsgsByThread((m) => ({
        ...m,
        [threadId]: (m[threadId] || []).filter((msg) => msg.id !== temp.id),
      }));
      alert(e.message || "No se pudo enviar el mensaje.");
    }
  };

  /* -------- Enviar imágenes -------- */
  const attachImage = async (threadId, files) => {
    if (!files?.length) return;
    // Optimista (múltiples)
    const temps = Array.from(files).map((f) => ({
      id: `tmp-${Date.now()}-${f.name}`,
      from_me: true,
      type: "image",
      url: URL.createObjectURL(f),
      name: f.name,
      at: nowIso(),
    }));
    setMsgsByThread((m) => ({ ...m, [threadId]: [...(m[threadId] || []), ...temps] }));

    try {
      const saved = await chatsApi.sendFiles(threadId, files);
      const arr = normalizeMessages(saved);
      // Reemplazo simple: quito temps y agrego server
      setMsgsByThread((m) => ({
        ...m,
        [threadId]: [...(m[threadId] || []).filter((msg) => !temps.some((t) => t.id === msg.id)), ...arr],
      }));
      const last = arr.length ? arr[arr.length - 1].at : null;
      if (last) lastIsoByThread.current[threadId] = last;
    } catch (e) {
      // revertir optimista
      setMsgsByThread((m) => ({
        ...m,
        [threadId]: (m[threadId] || []).filter((msg) => !temps.some((t) => t.id === msg.id)),
      }));
      alert(e.message || "No se pudo subir la imagen.");
    }
  };

  /* -------- Crear/abrir hilo desde otras vistas --------
     window.dispatchEvent(new CustomEvent("open-chat", {
       detail: { peer: { id, name, avatar_url }, product_id }
     }))
  -------------------------------------------------------- */
  useEffect(() => {
    const handler = async (e) => {
      const peer = e.detail?.peer;
      const product_id = e.detail?.product_id ?? null;
      const peerId = peer?.id ?? e.detail?.id;
      if (!peerId) return;

      // ¿Ya existe un hilo con ese peer?
      let thread =
        threads.find((t) => t.peer?.id === String(peerId) && (product_id ? t.product_id === product_id : true));

      // Si no existe, pídeselo al backend
      if (!thread) {
        try {
          const created = await chatsApi.openThread({ peer_id: peerId, product_id });
          const normalized = normalizeThreads([created])[0];
          setThreads((ts) => [normalized, ...ts]);
          thread = normalized;
        } catch (e) {
          alert(e.message || "No se pudo abrir el chat.");
          return;
        }
      }

      openChat(thread.id);
      // si no tenemos aún sus mensajes, los traerá el effect de docked
    };
    window.addEventListener("open-chat", handler);
    return () => window.removeEventListener("open-chat", handler);
  }, [threads]);

  /* -------- Eliminar conversación (solo para mí) -------- */
  const hideForMe = async (threadId) => {
    if (!confirm("¿Ocultar esta conversación? (solo para ti)")) return;
    try {
      await chatsApi.hideThread(threadId);
      setThreads((ts) => ts.filter((t) => t.id !== threadId));
      setDocked((d) => d.filter((x) => x !== threadId));
      setMsgsByThread((m) => {
        const c = { ...m };
        delete c[threadId];
        return c;
      });
    } catch (e) {
      alert(e.message || "No se pudo ocultar la conversación.");
    }
  };

  /* -------- UI -------- */
  return (
    <>
      {/* FAB: abrir lista */}
      <button
        onClick={() => setListOpen((o) => !o)}
        className="fixed left-4 bottom-4 z-50 rounded-full bg-blue-600 text-white w-12 h-12 grid place-items-center shadow-lg hover:bg-blue-700"
        title="Abrir chats"
        aria-label="Abrir chats"
      >
        <svg xmlns="http://www.w3.org/2000/svg" className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" viewBox="0 0 24 24">
          <path d="M21 15a4 4 0 0 1-4 4H7l-4 4V7a4 4 0 0 1 4-4h10a4 4 0 0 1 4 4z"/>
        </svg>
      </button>

      {/* Lista de hilos */}
      {listOpen && (
        <div className="fixed left-4 bottom-20 z-50 w-80 max-w-[calc(100vw-2rem)] rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-xl overflow-hidden">
          <div className="px-4 py-3 bg-blue-600 text-white flex items-center justify-between">
            <span className="font-semibold">Chats</span>
            <button className="text-white/90" onClick={() => setListOpen(false)} title="Cerrar">✕</button>
          </div>

          {err ? (
            <div className="p-4 text-sm text-red-600">{err}</div>
          ) : (
            <>
              {loading && <div className="p-3 text-sm text-neutral-500">Cargando…</div>}
              <ul className="max-h-80 overflow-y-auto divide-y divide-neutral-200/60">
                {threads.map((t) => (
                  <li key={t.id}>
                    <button
                      onClick={() => openChat(t.id)}
                      className="w-full px-4 py-3 flex items-center gap-3 hover:bg-neutral-50/80"
                    >
                      <img
                        src={t.peer?.avatar_url || fallbackAvatar}
                        alt={t.peer?.name || "usuario"}
                        className="h-9 w-9 rounded-full object-cover ring-1 ring-black/5"
                      />
                      <div className="min-w-0 text-left flex-1">
                        <p className="text-sm font-semibold truncate">
                          {t.peer?.name || "Usuario"}
                        </p>
                        <p className="text-[11px] text-neutral-500 truncate">{t.last_message_text || "…"}</p>
                      </div>
                      {!!t.unread_count && (
                        <span className="ml-2 text-[11px] px-2 py-0.5 rounded-full bg-blue-600 text-white">
                          {t.unread_count}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      {/* Ventanas acopladas */}
      <div className="fixed left-20 bottom-4 z-50 flex gap-3 flex-wrap">
        {docked.map((id) => (
          <MiniChat
            key={id}
            thread={threadById(id)}
            messages={msgsByThread[id] || []}
            text={inputs[id] || ""}
            setText={(v) => setInputs((s) => ({ ...s, [id]: v }))}
            onClose={() => closeChat(id)}
            onSend={() => send(id)}
            onPickFiles={() => {
              if (!fileInputRefs.current[id]) fileInputRefs.current[id] = document.createElement("input");
              const input = fileInputRefs.current[id];
              input.type = "file";
              input.accept = "image/*";
              input.multiple = true;
              input.onchange = (e) => attachImage(id, e.target.files);
              input.click();
            }}
            onHide={() => hideForMe(id)}
          />
        ))}
      </div>
    </>
  );
}

/* ===========================
   Subcomponentes UI
=========================== */

function MiniChat({ thread, messages, text, setText, onClose, onSend, onPickFiles, onHide }) {
  const listRef = useRef(null);

  useEffect(() => {
    const el = listRef.current;
    if (el) el.scrollTop = el.scrollHeight;
  }, [messages.length]);

  if (!thread) return null;

  return (
    <div className="w-72 max-w-[90vw] rounded-2xl bg-white/90 backdrop-blur-sm ring-1 ring-black/5 shadow-xl overflow-hidden flex flex-col">
      {/* Header */}
      <div className="px-3 py-2 border-b border-neutral-200/60 bg-white/70 flex items-center justify-between">
        <div className="flex items-center gap-2 min-w-0">
          <img
            src={thread.peer?.avatar_url || fallbackAvatar}
            alt={thread.peer?.name || "usuario"}
            className="h-6 w-6 rounded-full object-cover ring-1 ring-black/5"
          />
          <p className="text-sm font-semibold truncate">{thread.peer?.name || "Usuario"}</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            className="text-[11px] text-neutral-600 hover:text-red-600"
            title="Ocultar conversación (solo para ti)"
            onClick={onHide}
          >
            Ocultar
          </button>
          <button className="text-neutral-500 hover:text-neutral-700" onClick={onClose} title="Cerrar">✕</button>
        </div>
      </div>

      {/* Mensajes */}
      <div ref={listRef} className="p-3 space-y-2 overflow-y-auto" style={{ maxHeight: 260 }}>
        {messages.map((m) =>
          m.type === "image" ? (
            <Bubble key={m.id} mine={m.from_me}>
              <img src={m.url} alt={m.name || "imagen"} className="max-h-40 rounded-lg object-cover" />
              <Time mine={m.from_me}>{fmtTime(m.at)}</Time>
            </Bubble>
          ) : (
            <Bubble key={m.id} mine={m.from_me}>
              {m.text}
              <Time mine={m.from_me}>{fmtTime(m.at)}</Time>
            </Bubble>
          )
        )}
      </div>

      {/* Input */}
      <div className="px-2 pb-2">
        <div className="flex items-end gap-2">
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

function fmtTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  } catch {
    return "";
  }
}
