// src/components/products/EditProductModal.jsx
import { useRef, useState } from "react";
import { productsApi } from "../../services/productsApi";

export default function EditProductModal({ open, product, onClose, onUpdated, onDeleted }) {
  const [current, setCurrent] = useState(product);
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);
  const [removing, setRemoving] = useState(false);

  if (!open || !current) return null;

  const addImage = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file) return;
    try {
      const resp = await productsApi.addImage(current.id, file);
      // Acepta varias formas de respuesta
      let url = null;
      if (resp?.url) url = resp.url;
      else if (Array.isArray(resp?.images) && resp.images.length) {
        const last = resp.images[resp.images.length - 1];
        url = typeof last === "string" ? last : last?.url;
      }
      setCurrent((c) => ({ ...c, images: [...(c.images || []), url].filter(Boolean) }));
      onUpdated?.((p) => (p.id === current.id ? { ...current, images: [...(current.images || []), url].filter(Boolean) } : p));
    } catch (err) {
      console.error(err);
      alert("No se pudo subir la imagen.");
    }
  };

  const removeImage = async (idx) => {
    const url = current.images?.[idx];
    if (!url) return;
    try {
      await productsApi.removeImage(current.id, url); // tu API acepta url o id; ya lo manejaste en productsApi
      const imgs = current.images.filter((_, i) => i !== idx);
      setCurrent((c) => ({ ...c, images: imgs }));
      onUpdated?.((p) => (p.id === current.id ? { ...current, images: imgs } : p));
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la imagen.");
    }
  };

  const save = async () => {
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w/[95vw] max-w-2xl bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Editar producto</h3>
          <button className="text-sm text-neutral-600 hover:underline" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <div className="grid md:grid-cols-2 gap-4">
          <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-square">
            <img
              src={current.images?.[0]}
              alt={current.title}
              className="w-full h-full object-cover"
            />
          </div>

          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <input
                value={current.title}
                onChange={(e) => setCurrent((c) => ({ ...c, title: e.target.value }))}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Descripción</label>
              <textarea
                rows={4}
                value={current.description}
                onChange={(e) => setCurrent((c) => ({ ...c, description: e.target.value }))}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

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
                {(current.images || []).map((url, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <img src={url} alt={`img-${idx}`} className="h-10 w-10 rounded object-cover" />
                    <input value={url} readOnly className="flex-1 rounded border px-2 py-1 text-sm" />
                    <button
                      type="button"
                      onClick={() => removeImage(idx)}
                      className="text-xs rounded bg-red-500 text-white px-2 py-1 hover:bg-red-600"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
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
      </div>
    </div>
  );
}
