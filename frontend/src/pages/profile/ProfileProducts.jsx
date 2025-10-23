import { useEffect, useState } from "react";
import { productsApi } from "../../services/productsApi";

export default function ProfileProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modal de edición (igual que antes)
  const [open, setOpen] = useState(false);
  const [current, setCurrent] = useState(null);

  const mainImage = (p) => p.images?.[0];

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { items } = await productsApi.listMine();
        if (!alive) return;
        setProducts(items || []);
      } catch (e) {
        console.error(e);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => { alive = false; };
  }, []);

  const openEditor = (p) => {
    setCurrent(JSON.parse(JSON.stringify(p)));
    setOpen(true);
  };
  const closeEditor = () => {
    setOpen(false);
    setCurrent(null);
  };
  const saveProduct = () => {
    setProducts((ps) => ps.map((p) => (p.id === current.id ? current : p)));
    closeEditor();
  };
  const deleteProduct = () => {
    if (!confirm("¿Eliminar este producto?")) return;
    setProducts((ps) => ps.filter((p) => p.id !== current.id));
    closeEditor();
  };
  const toggleVisible = (id) =>
    setProducts((ps) => ps.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p)));

  const addImage = () => {
    const url = prompt("URL de imagen:");
    if (url) setCurrent((c) => ({ ...c, images: [...(c.images || []), url] }));
  };
  const removeImage = (idx) =>
    setCurrent((c) => ({ ...c, images: c.images.filter((_, i) => i !== idx) }));

  return (
    <>
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Tus productos</h2>
        <button
          onClick={() => alert("Agregar producto (mock)")}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
        >
          Agregar
        </button>
      </div>

      {/* Loading / Empty / Grid */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 bg-neutral-200/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : products.length === 0 ? (
        <div className="text-sm text-neutral-600">
          Aún no has publicado productos.
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <div
              key={p.id}
              onClick={() => openEditor(p)}
              className="bg-white rounded-xl shadow hover:shadow-md transition overflow-hidden cursor-pointer"
              title="Editar producto"
            >
              <div className="relative aspect-square overflow-hidden bg-neutral-100">
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
                      toggleVisible(p.id);
                    }}
                    className="text-[11px] rounded bg-neutral-200 px-2 py-1 hover:bg-neutral-300"
                  >
                    {p.visible ? "Ocultar" : "Mostrar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* MODAL de edición */}
      {open && current && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeEditor} />
          <div className="relative z-10 w-[95vw] max-w-2xl bg-white rounded-2xl shadow-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Editar producto</h3>
              <button className="text-sm text-neutral-600 hover:underline" onClick={closeEditor}>
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
                    <label className="text-sm">Imágenes (URL)</label>
                    <button
                      type="button"
                      onClick={addImage}
                      className="text-xs rounded bg-neutral-200 px-2 py-1 hover:bg-neutral-300"
                    >
                      Agregar
                    </button>
                  </div>

                  <ul className="space-y-2 max-h-32 overflow-auto pr-1">
                    {current.images?.map((url, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <img src={url} alt={`img-${idx}`} className="h-10 w-10 rounded object-cover" />
                        <input
                          value={url}
                          onChange={(e) =>
                            setCurrent((c) => {
                              const imgs = [...c.images];
                              imgs[idx] = e.target.value;
                              return { ...c, images: imgs };
                            })
                          }
                          className="flex-1 rounded border px-2 py-1 text-sm"
                        />
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
                    onClick={deleteProduct}
                    className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700"
                  >
                    Eliminar
                  </button>
                  <button
                    onClick={saveProduct}
                    className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                  >
                    Guardar cambios
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
