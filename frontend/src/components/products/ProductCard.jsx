// src/components/products/ProductCard.jsx
// ✅ 1️⃣ Agregamos API_URL y absUrl justo al inicio
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const absUrl = (u) => (u?.startsWith("http") ? u : `${API_URL}${u || ""}`);

export default function ProductCard({ p, onToggleVisible, onEdit }) {
  // ✅ 2️⃣ Modificamos mainImage para usar absUrl
  const mainImage = (pp) => {
    if (Array.isArray(pp?.images) && pp.images.length) {
      const img = pp.images[0];
      const url = typeof img === "string" ? img : img?.url;
      return absUrl(url);
    }
    return undefined; // React no pone el atributo src si es undefined
  };

  return (
    <div
      onClick={() => onEdit(p)}
      className="bg-white rounded-xl shadow hover:shadow-md transition overflow-hidden cursor-pointer"
      title="Editar producto"
    >
      <div className="relative aspect-square overflow-hidden bg-neutral-100">
        {/* ✅ 3️⃣ Usa la función corregida */}
        <img
          src={mainImage(p)}
          alt={p.title}
          className={`w-full h-full object-cover ${p.visible ? "" : "opacity-60"}`}
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
            onClick={(e) => {
              e.stopPropagation();
              onToggleVisible(p.id);
            }}
            className="text-[11px] rounded bg-neutral-200 px-2 py-1 hover:bg-neutral-300"
          >
            {p.visible ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
