// src/pages/profile/ProfileProducts.jsx
import { useEffect, useRef, useState } from "react";
import { productsApi } from "../../services/productsApi";

export default function ProfileProducts() {
  const [products, setProducts] = useState([]); // siempre intentaremos mantenerlo como array
  const [loading, setLoading] = useState(true);

  // ----- EDITAR -----
  const [openEdit, setOpenEdit] = useState(false);
  const [current, setCurrent] = useState(null);

  const mainImage = (p) => (Array.isArray(p.images) ? p.images[0] : undefined);

  // CARGA INICIAL
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const data = await productsApi.listMine();
        // Acepta tanto {items:[...]} como directamente [...]
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

  /* ===================== CREAR ===================== */
  const openCreateModal = () => {
    setCreateForm({ title: "", description: "" });
    setCreateFiles([]);
    setOpenCreate(true);
  };
  const closeCreateModal = () => setOpenCreate(false);

  const onPickCreateFiles = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = "";
    setCreateFiles((prev) => [...prev, ...files]);
  };

  const removeCreateFileAt = (idx) => {
    setCreateFiles((prev) => prev.filter((_, i) => i !== idx));
  };

  const submitCreate = async (e) => {
    e.preventDefault();
    if (!createForm.title.trim()) return alert("Agrega un nombre al producto.");
    try {
      const created = await productsApi.create({
        title: createForm.title.trim(),
        description: createForm.description.trim(),
        files: createFiles,
      });
      setProducts((ps) => [created, ...((Array.isArray(ps) && ps) || [])]); // asegura array
      closeCreateModal();
    } catch (err) {
      console.error(err);
      alert("No se pudo crear el producto.");
    }
  };

  /* ===================== EDITAR ===================== */
  const openEditor = (p) => {
    setCurrent(JSON.parse(JSON.stringify(p)));
    setOpenEdit(true);
  };
  const closeEditor = () => {
    setOpenEdit(false);
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

  // ✅ NUEVO: flujo crear → elegir imágenes → subir
  const handleAddClick = async () => {
    const title = prompt("Título del producto:");
    if (!title) return;
    const description = prompt("Descripción (opcional):") || "";
    // guardamos meta pendiente y abrimos selector de archivos
    pendingNewMetaRef.current = { title: title.trim(), description: description.trim() };
    fileInputRef.current?.click();
  };

  // ✅ NUEVO: al elegir archivos, creamos el producto y subimos imágenes
  const handleFilesChosen = async (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = ""; // reset input
    if (!pendingNewMetaRef.current || creatingRef.current) return;

    creatingRef.current = true;
    try {
      // Paso 1: crear metadata
      const created = await productsApi.create(pendingNewMetaRef.current);
      // Paso 2: subir imágenes (si hay)
      if (files.length > 0) {
        await productsApi.addImages(created.id, files);
      }
      // Refrescar lista
      const { items } = await productsApi.listMine();
      setProducts(items || []);
      alert("Producto publicado ✅");
    } catch (err) {
      console.error(err);
      alert("No se pudo crear el producto");
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

        {/* ✅ NUEVO: input oculto para subir imágenes al crear */}
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          multiple
          className="hidden"
          onChange={handleFilesChosen}
        />

        <button
          onClick={() => alert("Agregar producto (mock)")}
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

      {/* =================== MODAL: CREAR =================== */}
      {openCreate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40" onClick={closeCreateModal} />
          <div className="relative z-10 w-[95vw] max-w-2xl bg-white rounded-2xl shadow-lg p-4 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h3 className="text-lg font-bold">Nuevo producto</h3>
              <button className="text-sm text-neutral-600 hover:underline" onClick={closeCreateModal}>
                Cerrar
              </button>
            </div>

            <form onSubmit={submitCreate} className="grid md:grid-cols-2 gap-4">
              {/* Previews / subida */}
              <div>
                <div className="rounded-xl overflow-hidden bg-neutral-100 aspect-square grid place-items-center">
                  {createFiles.length ? (
                    <img
                      src={URL.createObjectURL(createFiles[0])}
                      alt="preview"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-xs text-neutral-500">Sin imagen principal</span>
                  )}
                </div>

                <div className="mt-2">
                  <input
                    ref={fileRefCreate}
                    type="file"
                    accept="image/*"
                    multiple
                    className="hidden"
                    onChange={onPickCreateFiles}
                  />
                  <button
                    type="button"
                    onClick={() => fileRefCreate.current?.click()}
                    className="text-xs rounded bg-neutral-200 px-3 py-1.5 hover:bg-neutral-300"
                  >
                    Subir imágenes
                  </button>

                  {/* Lista de imágenes seleccionadas */}
                  <ul className="mt-3 max-h-28 overflow-auto space-y-2 pr-1">
                    {createFiles.map((f, idx) => (
                      <li key={idx} className="flex items-center gap-2">
                        <img
                          src={URL.createObjectURL(f)}
                          alt={`f${idx}`}
                          className="h-10 w-10 rounded object-cover"
                        />
                        <span className="flex-1 text-xs truncate">{f.name}</span>
                        <button
                          type="button"
                          onClick={() => removeCreateFileAt(idx)}
                          className="text-xs rounded bg-red-500 text-white px-2 py-1 hover:bg-red-600"
                        >
                          Quitar
                        </button>
                      </li>
                    ))}
                    {!createFiles.length && (
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
                    value={createForm.title}
                    onChange={(e) => setCreateForm((f) => ({ ...f, title: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Ej. Calculadora científica"
                    required
                  />
                </div>

                <div>
                  <label className="block text-sm mb-1">Descripción</label>
                  <textarea
                    rows={6}
                    value={createForm.description}
                    onChange={(e) => setCreateForm((f) => ({ ...f, description: e.target.value }))}
                    className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
                    placeholder="Escribe una descripción breve…"
                  />
                </div>

                <div className="pt-1 flex justify-end gap-2">
                  <button
                    type="button"
                    onClick={closeCreateModal}
                    className="rounded-xl bg-neutral-200 px-4 py-2 text-sm font-semibold hover:bg-neutral-300"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="rounded-xl bg-blue-600 text-white px-4 py-2 text-sm font-semibold hover:bg-blue-700"
                  >
                    Crear
                  </button>
                </div>
              </div>
            </form>
          </div>
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
