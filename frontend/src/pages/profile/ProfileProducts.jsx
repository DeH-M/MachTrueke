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
    } catch (e) {
      console.error(e);
      setProducts(prev);
      alert("No se pudo cambiar visibilidad.");
    }
  };

  const onCreated = (created) => setProducts((ps) => [created, ...ps]);

  const onUpdated = (updatedOrMapper) => {
    if (typeof updatedOrMapper === "function") {
      // soporte cuando el hijo manda un mapper
      setProducts((ps) => ps.map((p) => (p.id === current?.id ? updatedOrMapper(p) : p)));
    } else {
      setProducts((ps) => ps.map((p) => (p.id === updatedOrMapper.id ? updatedOrMapper : p)));
    }
  };

  const onDeleted = (id) => setProducts((ps) => ps.filter((p) => p.id !== id));

  return (
    <>
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
              onEdit={openEditor}
            />
          ))}
        </div>
      )}

      {/* Modales */}
      <CreateProductModal
        open={openCreate}
        onClose={() => setOpenCreate(false)}
        onCreated={onCreated}
      />

      <EditProductModal
        open={openEdit}
        product={current}
        onClose={() => setOpenEdit(false)}
        onUpdated={onUpdated}
        onDeleted={onDeleted}
      />
    </>
  );
}
