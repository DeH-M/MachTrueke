// src/components/ProductCard.jsx
import { useState } from "react";
import { productsApi } from "../services/productsApi";

/**
 * Muestra una tarjeta de producto con:
 * - portada (primera imagen)
 * - título y descripción
 * - botón "Ocultar/Mostrar" que cambia is_active
 *
 * Espera un objeto product con forma:
 * {
 *   id, title, description, is_active, images: [{ id, url }, ...]
 * }
 */
export default function ProductCard({ product, onChanged }) {
  const [loading, setLoading] = useState(false);

  // La API ya te devuelve URLs absolutas; si alguna llegara relativa, la resolvemos.
  const resolveUrl = (u) => {
    if (!u) return "";
    if (/^https?:\/\//i.test(u)) return u;
    const base = window.location.origin; // p.ej. http://127.0.0.1:8000
    return `${base}${u.startsWith("/") ? "" : "/"}${u}`;
  };

  const cover =
    (product?.images && product.images[0] && resolveUrl(product.images[0].url)) ||
    ""; // si no hay, se verá el fondo vacío

  const toggleActive = async () => {
    try {
      setLoading(true);
      const next = !product.is_active;
      await productsApi.update(product.id, { is_active: next });
      onChanged?.(); // recargar lista en el padre
    } catch (e) {
      alert("No se pudo actualizar el estado del producto");
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="w-72 rounded-2xl shadow-sm bg-white overflow-hidden border border-black/10">
      {/* Portada */}
      <div className="w-full h-48 bg-gray-100 flex items-center justify-center">
        {cover ? (
          <img
            src={cover}
            alt={product.title}
            className="w-full h-full object-cover"
            loading="lazy"
          />
        ) : (
          <span className="text-gray-400 text-sm">Sin imagen</span>
        )}
      </div>

      {/* Cuerpo */}
      <div className="p-4">
        <div className="font-semibold leading-tight">{product.title}</div>
        <div className="text-xs text-gray-500 mt-1 line-clamp-2">
          {product.description}
        </div>

        <div className="mt-3 flex items-center justify-between">
          <span
            className={`text-[11px] px-2 py-0.5 rounded-full ${
              product.is_active
                ? "bg-green-50 text-green-700 border border-green-200"
                : "bg-yellow-50 text-yellow-700 border border-yellow-200"
            }`}
          >
            {product.is_active ? "Activo" : "Oculto"}
          </span>

          <button
            onClick={toggleActive}
            disabled={loading}
            className="text-xs px-3 py-1 rounded-lg bg-black text-white disabled:opacity-50"
          >
            {product.is_active ? "Ocultar" : "Mostrar"}
          </button>
        </div>
      </div>
    </div>
  );
}
