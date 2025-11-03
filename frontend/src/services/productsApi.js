// src/services/productsApi.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";

/* ---------------- helpers HTTP ---------------- */
async function httpGet(path) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) {
    const txt = await res.text();
    throw new Error(txt || `Error ${res.status}`);
  }
  return res.json();
}

/* Igual que httpGet pero:
   - añade token
   - NO impone Content-Type si el body es FormData/URLSearchParams
   - parsea errores del backend (detail) */
async function baseFetch(path, options = {}) {
  const token = localStorage.getItem("token");

  const isMultipart =
    typeof FormData !== "undefined" && options.body instanceof FormData;
  const isFormUrlEncoded =
    typeof URLSearchParams !== "undefined" &&
    options.body instanceof URLSearchParams;

  const headers = {
    ...(isMultipart || isFormUrlEncoded ? {} : { "Content-Type": "application/json" }),
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };

  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text().catch(() => "");

  if (!res.ok) {
    let msg = text || `HTTP ${res.status}`;
    try {
      const j = text ? JSON.parse(text) : null;
      if (j?.detail) msg = typeof j.detail === "string" ? j.detail : JSON.stringify(j.detail);
    } catch {}
    const err = new Error(msg);
    err.status = res.status;
    throw err;
  }

  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

/* ---------------- Mock simple (se mantiene) ---------------- */
function mockListMine() {
  const items = Array.from({ length: 8 }).map((_, i) => ({
    id: "p" + (i + 1),
    title: `Producto ${i + 1}`,
    description: "Descripción breve del producto",
    images: [
      "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
    ],
    visible: Math.random() > 0.2,
  }));
  return new Promise((resolve) =>
    setTimeout(() => resolve({ items }), 600)
  );
}

/* ---------------- API pública ---------------- */
export const productsApi = {
  async listMine() {
    if (USE_MOCK) return mockListMine();
    // Swagger: GET /products/me/mine
    const rows = await baseFetch("/products/me/mine");
    // normalizar a { items: [...] } para no romper tu UI
    return Array.isArray(rows) ? { items: rows } : rows;
  },

  // Crear metadata del producto (sin imágenes)
  async create({ title, description }) {
    return baseFetch("/products", {
      method: "POST",
      body: JSON.stringify({ title, description }),
    });
  },

  // Subir imágenes a un producto (multipart). Campo: "images"
  async addImages(productId, files) {
    const fd = new FormData();
    (files || []).forEach((f) => fd.append("images", f));
    return baseFetch(`/products/${productId}/images`, {
      method: "POST",
      body: fd,
    });
  },

  // Obtener un producto
  async get(id) {
    return baseFetch(`/products/${id}`);
  },

  // Actualizar parcialmente (título, descripción, visible, etc.)
  async update(id, partial) {
    return baseFetch(`/products/${id}`, {
      method: "PATCH",
      body: JSON.stringify(partial),
    });
  },

  // Eliminar producto
  async remove(id) {
    return baseFetch(`/products/${id}`, { method: "DELETE" });
  },

  // Eliminar una imagen específica
  async deleteImage(productId, imageId) {
    return baseFetch(`/products/${productId}/images/${imageId}`, {
      method: "DELETE",
    });
  },
};
