// src/pages/profile/ProfileProducts.jsx
import { useEffect, useState } from "react";
import { productsApi } from "../../services/productsApi";
import ProductCard from "../../components/products/ProductCard";
import CreateProductModal from "../../components/products/CreateProductModal";
import EditProductModal from "../../components/products/EditProductModal";

export default function ProfileProducts() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  // Modales
  const [openCreate, setOpenCreate] = useState(false);
  const [openEdit, setOpenEdit] = useState(false);
  const [current, setCurrent] = useState(null);

  // Banner (centrado arriba)
  const [banner, setBanner] = useState({ open: false, text: "", tone: "success" });
  const showBanner = (text, tone = "success") => {
    setBanner({ open: true, text, tone });
    window.clearTimeout(showBanner._t);
    showBanner._t = window.setTimeout(() => setBanner((b) => ({ ...b, open: false })), 2200);
  };

  // Carga inicial
  useEffect(() => {
    (async () => {
      try {
        setLoading(true);
        const data = await productsApi.listMine();
        const items = Array.isArray(data?.items) ? data.items : Array.isArray(data) ? data : [];
        setProducts(items);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar tus productos.");
      } finally {
        setLoading(false);
      }
    })();
  }, []);

  // Handlers
  const openEditor = (p) => {
    setCurrent(p);
    setOpenEdit(true);
  };

  const onToggleVisible = async (id) => {
    const prev = products;
    const next = prev.map((p) => (p.id === id ? { ...p, visible: !p.visible } : p));
    setProducts(next);
    try {
      const prod = next.find((p) => p.id === id);
      await productsApi.toggleVisibility(id, !!prod.visible);
      showBanner("Visibilidad actualizada");
    } catch (e) {
      console.error(e);
      setProducts(prev);
      alert("No se pudo cambiar visibilidad.");
    }
  };

  const onCreated = (created) => {
    setProducts((ps) => [created, ...ps]);
    showBanner("Producto publicado");
  };

  // Soporta que el modal envíe el objeto actualizado o un mapper
  const onUpdated = (updatedOrMapper) => {
    if (typeof updatedOrMapper === "function") {
      setProducts((ps) => ps.map((p) => (p.id === current?.id ? updatedOrMapper(p) : p)));
    } else {
      setProducts((ps) => ps.map((p) => (p.id === updatedOrMapper.id ? updatedOrMapper : p)));
    }
    showBanner("Producto actualizado");
  };

  const onDeleted = (id) => {
    setProducts((ps) => ps.filter((p) => p.id !== id));
    setOpenEdit(false);
    setCurrent(null);
    showBanner("Producto eliminado");
  };

  return (
    <>
      {/* Banner centrado superior */}
      {banner.open && (
        <div className="fixed top-6 left-1/2 -translate-x-1/2 z-[100]">
          <div
            className={`px-4 py-2 rounded-xl shadow-md ring-1 ${
              banner.tone === "success"
                ? "bg-green-100 text-green-800 ring-green-200"
                : "bg-neutral-100 text-neutral-800 ring-neutral-200"
            }`}
          >
            <span className="text-sm font-semibold">{banner.text}</span>
          </div>
        </div>
      )}

      {/* Header */}
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-lg font-bold">Tus productos</h2>
        <button
          onClick={() => setOpenCreate(true)}
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
      ) : products.length === 0 ? (
        <div className="text-sm text-neutral-600">Aún no has publicado productos.</div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {products.map((p) => (
            <ProductCard
              key={p.id}
              p={p}
              onToggleVisible={onToggleVisible}
              onEdit={openEditor}  // ✅ abrir modal al hacer clic
            />
          ))}
        </div>
      )}

      {/* Modales */}
      <CreateProductModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={onCreated} // ✅ muestra banner al crear
      />

      <EditProductModal
        open={openEdit}
        product={current}
        onClose={() => setOpenEdit(false)}
        onUpdated={onUpdated} // muestra banner al actualizar
        onDeleted={onDeleted} // muestra banner al eliminar
      />
    </>
  );
}
