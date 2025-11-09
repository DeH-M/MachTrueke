// src/components/products/CreateProductModal.jsx
import { useRef, useState } from "react";
import { productsApi } from "../../services/productsApi";

export default function CreateProductModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ title: "", description: "" });
  const [files, setFiles] = useState([]); // File[]
  const fileRef = useRef(null);
  const [saving, setSaving] = useState(false);

  if (!open) return null;

  const onPick = (e) => {
    const fs = Array.from(e.target.files || []);
    e.target.value = "";
    setFiles((prev) => [...prev, ...fs]);
  };

  const removeAt = (idx) => setFiles((prev) => prev.filter((_, i) => i !== idx));

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) return alert("Agrega un nombre al producto.");
    setSaving(true);
    try {
      const created = await productsApi.create({
        title: form.title.trim(),
        description: form.description.trim(),
        files,
      });
      onCreated?.(created);
      onClose?.();
    } catch (err) {
      console.error(err);
      alert("No se pudo crear el producto.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-[95vw] max-w-2xl bg-white rounded-2xl shadow-lg p-4 md:p-6">
        <div className="flex items-center justify-between mb-3">
          <h3 className="text-lg font-bold">Nuevo producto</h3>
          <button className="text-sm text-neutral-600 hover:underline" onClick={onClose}>
            Cerrar
          </button>
        </div>

        <form onSubmit={submit} className="grid md:grid-cols-2 gap-4">
          {/* Previews / subida */}
          <div>
            <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-square grid place-items-center">
              {files.length ? (
                <img
                  src={URL.createObjectURL(files[0])}
                  alt="preview"
                  className="w-full h-full object-cover"
                />
              ) : (
                <span className="text-xs text-neutral-500">Sin imagen principal</span>
              )}
            </div>

            <div className="mt-2">
              <input
                ref={fileRef}
                type="file"
                accept="image/*"
                multiple
                className="hidden"
                onChange={onPick}
              />
              <button
                type="button"
                onClick={() => fileRef.current?.click()}
                className="text-xs rounded bg-neutral-200 px-3 py-1.5 hover:bg-neutral-300"
              >
                Subir imágenes
              </button>

              {/* Lista de imágenes seleccionadas */}
              <ul className="mt-3 max-h-28 overflow-auto space-y-2 pr-1">
                {files.map((f, idx) => (
                  <li key={idx} className="flex items-center gap-2">
                    <img
                      src={URL.createObjectURL(f)}
                      alt={`f${idx}`}
                      className="h-10 w-10 rounded object-cover"
                    />
                    <span className="flex-1 text-xs truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeAt(idx)}
                      className="text-xs rounded bg-red-500 text-white px-2 py-1 hover:bg-red-600"
                    >
                      Quitar
                    </button>
                  </li>
                ))}
                {!files.length && (
                  <li className="text-[11px] text-neutral-500">Aún no seleccionas imágenes.</li>
                )}
              </ul>
            </div>
          </div>

          {/* Formulario */}
          <div className="space-y-3">
            <div>
              <label className="block text-sm mb-1">Nombre</label>
              <input
                value={form.title}
                onChange={(e) => setForm((f) => ({ ...f, title: e.target.value }))}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Ej. Calculadora científica"
                required
              />
            </div>

            <div>
              <label className="block text-sm mb-1">Descripción</label>
              <textarea
                rows={6}
                value={form.description}
                onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))}
                className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                placeholder="Escribe una descripción breve…"
              />
            </div>

            <div className="pt-1 flex justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl bg-neutral-200 px-4 py-2 text-sm font-semibold hover:bg-neutral-300"
              >
                Cancelar
              </button>
              <button
                type="submit"
                disabled={saving}
                className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700 disabled:opacity-60"
              >
                {saving ? "Creando…" : "Crear"}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
