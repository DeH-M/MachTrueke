// src/components/products/EditProductModal.jsx
import { useEffect, useRef, useState } from "react";
import { productsApi } from "../../services/productsApi";

const urlOf = (x) => (typeof x === "string" ? x : x?.url || "");

export default function EditProductModal({ open, product, onClose, onUpdated, onDeleted }) {
  // Hooks SIEMPRE al tope (sin returns antes)
  const [current, setCurrent] = useState(() =>
    product ? { ...product, images: Array.isArray(product.images) ? [...product.images] : [] } : null
  );
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  // Sincroniza cuando cambian las props
  useEffect(() => {
    setCurrent(product ? { ...product, images: Array.isArray(product.images) ? [...product.images] : [] } : null);
  }, [product]);

  // Cierra con Escape
  useEffect(() => {
    if (!open) return;
    const onKey = (ev) => ev.key === "Escape" && onClose?.();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const addImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !current) return;
    try {
      const resp = await productsApi.addImage(current.id, file);
      let newUrl = resp?.url;
      if (!newUrl && Array.isArray(resp?.images) && resp.images.length) {
        newUrl = urlOf(resp.images.at(-1));
      }
      if (!newUrl) return;

      setCurrent((c) => ({ ...c, images: [...(c?.images || []), newUrl] }));
      onUpdated?.((p) => (p.id === current.id ? { ...p, images: [...(p.images || []), newUrl] } : p));
    } catch (err) {
      console.error(err);
      alert("No se pudo subir la imagen.");
    }
  };

  const removeImage = async (idx) => {
    if (!current) return;
    const url = urlOf(current.images?.[idx]);
    if (!url) return;
    try {
      await productsApi.removeImage(current.id, url);
      const imgs = (current.images || []).filter((_, i) => i !== idx);
      setCurrent((c) => ({ ...c, images: imgs }));
      onUpdated?.((p) => (p.id === current.id ? { ...p, images: imgs } : p));
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la imagen.");
    }
  };

  const save = async () => {
    if (!current) return;
    setSaving(true);
    try {
      const updated = await productsApi.update(current.id, {
        title: current.title,
        description: current.description,
      });
      setCurrent(updated);
      onUpdated?.(updated);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar el producto.");
    } finally {
      setSaving(false);
    }
  };

  const removeProduct = async () => {
    if (!current) return;
    if (!confirm("¿Eliminar este producto?")) return;
    setRemoving(true);
    try {
      await productsApi.remove(current.id);
      onDeleted?.(current.id);
      onClose?.();
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar.");
    } finally {
      setRemoving(false);
    }
  };

  // Render controlado: NO retornamos antes (evita “Rendered fewer hooks…”)
  if (!open) return null;

  const mainImg = urlOf(current?.images?.[0]);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[95vw] max-w-2xl bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Editar producto</h3>
          <button className="text-sm text-neutral-600 hover:underline" onClick={onClose}>
            Cerrar
          </button>
        </div>

        {current ? (
          <div className="grid md:grid-cols-2 gap-4">
            {/* Vista principal */}
            <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-square">
              {mainImg ? (
                <img src={mainImg} alt={current.title} className="w-full h-full object-cover" />
              ) : (
                <div className="w-full h-full grid place-items-center text-xs text-neutral-400">
                  Sin imagen
                </div>
              )}
            </div>

            {/* Formulario */}
            <div className="space-y-3">
              <div>
                <label className="block text-sm mb-1">Nombre</label>
                <input
                  value={current.title || ""}
                  onChange={(e) => setCurrent((c) => ({ ...c, title: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              <div>
                <label className="block text-sm mb-1">Descripción</label>
                <textarea
                  rows={4}
                  value={current.description || ""}
                  onChange={(e) => setCurrent((c) => ({ ...c, description: e.target.value }))}
                  className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                />
              </div>

              {/* Imágenes */}
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-sm">Imágenes</label>
                  <div className="flex gap-2">
                    <input
                      ref={fileRef}
                      type="file"
                      accept="image/*"
                      className="hidden"
                      onChange={addImage}
                    />
                    <button
                      type="button"
                      onClick={() => fileRef.current?.click()}
                      className="text-xs rounded bg-neutral-200 px-2 py-1 hover:bg-neutral-300"
                    >
                      Subir
                    </button>
                  </div>
                </div>

                <ul className="space-y-2 max-h-32 overflow-auto pr-1">
                  {(current.images || []).map((img, idx) => {
                    const u = urlOf(img);
                    return (
                      <li key={idx} className="flex items-center gap-2">
                        <img src={u} alt={`img-${idx}`} className="h-10 w-10 rounded object-cover" />
                        <input value={u} readOnly className="flex-1 rounded border px-2 py-1 text-sm" />
                        <button
                          type="button"
                          onClick={() => removeImage(idx)}
                          className="text-xs rounded bg-red-500 text-white px-2 py-1 hover:bg-red-600"
                        >
                          Quitar
                        </button>
                      </li>
                    );
                  })}
                  {(!current.images || current.images.length === 0) && (
                    <li className="text-xs text-neutral-500">Sin imágenes.</li>
                  )}
                </ul>
              </div>

              <div className="pt-1 flex flex-wrap gap-2 justify-end">
                <button
                  onClick={removeProduct}
                  disabled={removing}
                  className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700 disabled:opacity-60"
                >
                  {removing ? "Eliminando…" : "Eliminar"}
                </button>
                <button
                  onClick={save}
                  disabled={saving}
                  className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
                >
                  {saving ? "Guardando…" : "Guardar cambios"}
                </button>
              </div>
            </div>
          </div>
        ) : (
          <div className="text-sm text-neutral-500">Cargando…</div>
        )}
      </div>
    </div>
  );
}
