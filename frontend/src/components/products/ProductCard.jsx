// src/components/products/ProductCard.jsx
import { chatsApi } from "../../services/chatsApi"; // 🔹 AGREGADO
import useAuth from "../../store/authStore";        // 🔹 AGREGADO (para saber mi user.id)

export default function ProductCard({ p, onEdit, onToggleVisible, showChat = false /* (opcional) onOpenChat */ }) {
  if (!p) return null;

  const me = useAuth((s) => s.user); // { id, ... } o null

  // Obtiene la primera imagen (string o {id, url})
  const mainImage =
    Array.isArray(p.images) && p.images.length
      ? typeof p.images[0] === "string"
        ? p.images[0]
        : p.images[0]?.url
      : null;

  const open = () => onEdit && onEdit(p);

  // Resolver IDs de forma robusta (por si cambia la forma en que llega p)
  const productId = p?.id ?? p?.product_id ?? p?.product?.id ?? p?.item?.id;
  const ownerId =
    p?.owner_id ?? p?.owner?.id ?? p?.user_id ?? p?.seller_id ?? p?.ownerId;

  // 🔹 Solo mostrar “Chatear” si así lo piden Y no es mi propio producto
  const canShowChat = Boolean(showChat && ownerId && me?.id && Number(ownerId) !== Number(me.id));

  // 🔹 AGREGADO: handler para abrir chat enviando product_id
  const handleChat = async (e) => {
    e.stopPropagation(); // evita abrir modal al presionar el botón
    if (!ownerId) {
      console.warn("ownerId vacío: no puedo abrir chat");
      return;
    }
    try {
      await chatsApi.openFromProduct(ownerId, productId);
      // Si tu app tiene un dock o store de chat, puedes notificar aquí:
      // onOpenChat?.(chat);
      // window.dispatchEvent(new CustomEvent("chat:opened", { detail: chat }));
    } catch (err) {
      console.error("No se pudo abrir el chat:", err);
    }
  };

  return (
    <div
      className="rounded-2xl ring-1 ring-black/5 bg-white overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
      onClick={open}
      onKeyDown={(e) => (e.key === "Enter" || e.key === " ") && open()}
      role="button"
      tabIndex={0}
      title="Haz clic para editar este producto"
    >
      {/* Imagen principal */}
      <div className="relative aspect-square bg-neutral-100 overflow-hidden">
        {mainImage ? (
          <img
            src={mainImage}
            alt={p.title}
            className={`w-full h-full object-cover transition ${
              p.visible ? "" : "opacity-60"
            }`}
            draggable={false}
          />
        ) : (
          <div className="w-full h-full grid place-items-center text-xs text-neutral-400">
            Sin imagen
          </div>
        )}

        {/* Indicador de visibilidad */}
        {!p.visible && (
          <span className="absolute top-2 left-2 text-[11px] rounded bg-neutral-800/80 text-white px-2 py-0.5">
            No visible
          </span>
        )}
      </div>

      {/* Información */}
      <div className="p-3">
        <p className="text-sm font-semibold line-clamp-1">{p.title}</p>
        <p className="text-[11px] text-neutral-500 line-clamp-2">{p.description}</p>

        <div className="mt-3 flex justify-between items-center gap-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation(); // evita abrir modal al presionar el botón
              onToggleVisible && onToggleVisible(p.id);
            }}
            className="text-[11px] rounded-lg bg-neutral-200 px-3 py-1 font-semibold hover:bg-neutral-300 transition"
          >
            {p.visible ? "Ocultar" : "Mostrar"}
          </button>

          {/* 🔹 AGREGADO: botón Chatear (solo si aplica) */}
          {canShowChat && (
            <button
              type="button"
              onClick={handleChat}
              className="text-[11px] rounded-lg bg-blue-600 text-white px-3 py-1 font-semibold hover:bg-blue-700 transition"
            >
              Chatear
            </button>
          )}
          {/* 🔹 Fin botón agregado */}
        </div>
      </div>
    </div>
  );
}
