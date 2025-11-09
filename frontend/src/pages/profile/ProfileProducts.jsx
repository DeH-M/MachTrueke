// src/pages/profile/ProfileProducts.jsx
import { useEffect, useRef, useState } from "react";
import { productsApi } from "../../services/productsApi";

export default function ProfileProducts() {
  const [products, setProducts] = useState([]); // mantener como array
  const [loading, setLoading] = useState(true);

  // ----- EDITAR -----
  const [openEdit, setOpenEdit] = useState(false);
  const [current, setCurrent] = useState(null);
  const fileRefEdit = useRef(null);

  // ----- CREAR (flujo con input oculto en header) -----
  const fileInputRef = useRef(null);      // input <file> oculto del header
  const pendingNewMetaRef = useRef(null); // guarda {title, description} temporalmente
  const creatingRef = useRef(false);      // lock para evitar doble creación

  const mainImage = (p) => (Array.isArray(p?.images) ? p.images[0] : undefined);
  const productsSafe = Array.isArray(products) ? products : [];

  // CARGA INICIAL
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await productsApi.listMine();
        const items = Array.isArray(data?.items)
          ? data.items
          : Array.isArray(data)
          ? data
          : [];
        if (!alive) return;
        setProducts(items);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar tus productos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  /* ===================== EDITAR ===================== */
  const openEditor = (p) => {
    setCurrent(JSON.parse(JSON.stringify(p)));
    setOpenEdit(true);
  };

  const closeEditor = () => {
    setOpenEdit(false);
    setCurrent(null);
  };

  const saveProduct = async () => {
    try {
      const updated = await productsApi.update(current.id, {
        title: current.title,
        description: current.description,
      });
      setProducts((ps) =>
        ((Array.isArray(ps) && ps) || []).map((p) => (p.id === updated.id ? updated : p))
      );
      closeEditor();
    } catch (e) {
      console.error(e);
      alert("No se pudo guardar el producto.");
    }
  };

  const deleteProduct = async () => {
    if (!confirm("¿Eliminar este producto?")) return;
    try {
      await productsApi.remove(current.id);
      setProducts((ps) => ((Array.isArray(ps) && ps) || []).filter((p) => p.id !== current.id));
      closeEditor();
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar.");
    }
  };

  const toggleVisible = async (id) => {
    const prev = (Array.isArray(products) && products) || [];
    const next = prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p));
    setProducts(next);
    try {
      const prod = next.find((p) => p.id === id);
      await productsApi.toggleVisibility(id, !!prod.visible);
    } catch (e) {
      console.error(e);
      setProducts(prev);
      alert("No se pudo cambiar visibilidad.");
    }
  };

  const addImageEdit = () => fileRefEdit.current?.click();

  const onPickEditFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !current) return;
    try {
      const { url } = await productsApi.addImage(current.id, file);
      setCurrent((c) => ({
        ...c,
        images: [...(Array.isArray(c.images) ? c.images : []), url],
      }));
      setProducts((ps) =>
        ((Array.isArray(ps) && ps) || []).map((p) =>
          p.id === current.id
            ? { ...p, images: [...(Array.isArray(p.images) ? p.images : []), url] }
            : p
        )
      );
    } catch (err) {
      console.error(err);
      alert("No se pudo subir la imagen.");
    }
  };

  const removeImageEdit = async (idx) => {
    const url = Array.isArray(current?.images) ? current.images[idx] : undefined;
    if (!url) return;
    try {
      await productsApi.removeImage(current.id, url);
      setCurrent((c) => ({
        ...c,
        images: (Array.isArray(c.images) ? c.images : []).filter((_, i) => i !== idx),
      }));
      setProducts((ps) =>
        ((Array.isArray(ps) && ps) || []).map((p) =>
          p.id === current.id
            ? { ...p, images: (Array.isArray(p.images) ? p.images : []).filter((u) => u !== url) }
            : p
        )
      );
    } catch (e) {
      console.error(e);
      alert("No se pudo eliminar la imagen.");
    }
  };

  /* ===================== CREAR (header) ===================== */
  const handleAddClick = () => {
    const title = prompt("Título del producto:");
    if (!title) return;
    const description = prompt("Descripción (opcional):") || "";
    pendingNewMetaRef.current = { title: title.trim(), description: description.trim() };
    fileInputRef.current?.click(); // abre el selector de archivos
  };

  const handleFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // reset input
    if (!pendingNewMetaRef.current || creatingRef.current) return;

    creatingRef.current = true;
    try {
      // 1) Crear producto (solo metadata)
      const created = await productsApi.create(pendingNewMetaRef.current);

      // 2) Subir imágenes (si hay)
      if (files.length > 0) {
        // Soporta ambas APIs: addImages(id, File[]) o addImage(id, File) en loop
        if (typeof productsApi.addImages === "function") {
          await productsApi.addImages(created.id, files);
        } else if (typeof productsApi.addImage === "function") {
          for (const f of files) {
            await productsApi.addImage(created.id, f);
          }
        }
      }

      // 3) Refrescar lista
      const data = await productsApi.listMine();
      const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
      setProducts(items);

      alert("Producto publicado ✅");
    } catch (err) {
      console.error(err);
      alert("No se pudo crear el producto.");
    } finally {
      creatingRef.current = false;
      pendingNewMetaRef.current = null;
    }
  };

  return (
    <>
      {/* Header de la sección */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Tus productos</h2>

        {/* Input oculto para elegir imágenes al CREAR */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesChosen}
        />

        <button
          onClick={handleAddClick}
          className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
        >
          Agregar
        </button>
      </div>

      {/* Grid / Loading / Empty */}
      {loading ? (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="h-40 bg-neutral-200/60 rounded-xl animate-pulse" />
          ))}
        </div>
      ) : productsSafe.length === 0 ? (
        <div className="text-sm text-neutral-600">Aún no has publicado productos.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {productsSafe.map((p) => (
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

      {/* =================== MODAL: EDITAR =================== */}
      {openEdit && current && (
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
              {/* Vista principal */}
              <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-square">
                <img
                  src={Array.isArray(current.images) ? current.images[0] : undefined}
                  alt={current.title}
                  className="w-full h-full object-cover"
                />
              </div>

              {/* Formulario */}
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

                {/* Imágenes */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-sm">Imágenes</label>
                    <div className="flex gap-2">
                      <input
                        ref={fileRefEdit}
                        type="file"
                        accept="image/*"
                        className="hidden"
                        onChange={onPickEditFile}
                      />
                      <button
                        type="button"
                        onClick={addImageEdit}
                        className="text-xs rounded bg-neutral-200 px-2 py-1 hover:bg-neutral-300"
                      >
                        Subir
                      </button>
                    </div>
                  </div>

                  <ul className="space-y-2 max-h-32 overflow-auto pr-1">
                    {(Array.isArray(current.images) ? current.images : []).map((url, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <img src={url} alt={`img-${idx}`} className="h-10 w-10 rounded object-cover" />
                        <input value={url} readOnly className="flex-1 rounded border px-2 py-1 text-sm" />
                        <button
                          type="button"
                          onClick={() => removeImageEdit(idx)}
                          className="text-xs rounded bg-red-500 text-white px-2 py-1 hover:bg-red-600"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                    {(!Array.isArray(current.images) || current.images.length === 0) && (
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
