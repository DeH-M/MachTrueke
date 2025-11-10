// --- URLs absolutas para imágenes
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const absUrl = (u) => {
  if (!u) return "";
  if (u.startsWith("http") || u.startsWith("blob:")) return u;
  return `${API_URL}${u.startsWith("/") ? "" : "/"}${u}`;
};

export default function ProductCard({ p, onToggleVisible, onEdit }) {
  if (!p) return null;

  // abrir editor
  const open = () => onEdit?.(p);

  // primera imagen (string o {url}) → absoluta
  const mainImage = (pp) => {
    if (!Array.isArray(pp?.images) || pp.images.length === 0) return undefined;
    const img = pp.images[0];
    const url = typeof img === "string" ? img : img?.url;
    return absUrl(url);
  };

  const src0 = mainImage(p);                    // podría ser undefined
  const bust = p.updated_at || p.image_version || p.id; // para romper caché
  const src = src0 ? `${src0}?v=${bust}` : "/placeholder.png";

  return (
    <div
      className="rounded-2xl ring-1 ring-black/5 bg-white overflow-hidden shadow-sm hover:shadow-md transition cursor-pointer"
      onClick={open}
      onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") open(); }}
      role="button"
      tabIndex={0}
      title="Haz clic para editar este producto"
    >
      {/* Contenedor fijo para evitar colapsos de layout */}
      <div className="relative aspect-[4/5] overflow-hidden bg-neutral-100 rounded-t-2xl">
        <img
          src={src}
          alt={p.title}
          className={`absolute inset-0 w-full h-full object-cover ${p.visible ? "" : "opacity-60"}`}
          draggable={false}
          onError={(e) => {
            // Si falla la carga, usa placeholder y evita bucle
            e.currentTarget.onerror = null;
            e.currentTarget.src = "/placeholder.png";
          }}
        />

        {!p.visible && (
          <span className="absolute top-2 left-2 text-[11px] rounded bg-neutral-800/80 text-white px-2 py-0.5">
            No visible
          </span>
        )}
      </div>

      <div className="px-2 py-2">
        <p className="text-xs font-semibold line-clamp-1">{p.title}</p>
        <p className="text-[11px] text-neutral-500 line-clamp-1">{p.description}</p>

        <div className="mt-2">
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible?.(p.id);
            }}
            className="text-[11px] rounded-lg bg-neutral-200 px-3 py-1 font-semibold hover:bg-neutral-300 transition"
          >
            {p.visible ? "Ocultar" : "Mostrar"}
          </button>
          {/* 🔹 Se eliminó el texto de ID */}
        </div>
      </div>
    </div>
  );
}
