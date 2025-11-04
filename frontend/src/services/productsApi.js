// src/services/productsApi.js
// Rutas (sin prefijo) según tu backend actual:
//  POST    /                      -> crear producto (FormData: title, description, images?)
//  GET     /{product_id}          -> detalle producto
//  PATCH   /{product_id}          -> actualizar (title, description, is_active)
//  DELETE  /{product_id}          -> eliminar (soft)
//  GET     /me/mine               -> mis productos
//  POST    /{product_id}/images   -> agregar imágenes (FormData: images) -> devuelve ProductRead
//  DELETE  /{product_id}/images/{image_id} -> borrar imagen

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";

/* ---------------- Helpers HTTP ---------------- */
function authHeaders(extra = {}) {
  const token = localStorage.getItem("token");
  return { ...(extra || {}), ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function http(path, { method = "GET", body, headers } = {}) {
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...authHeaders(headers),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const txt = await res.text().catch(() => "");
    throw new Error(txt || `Error ${res.status}`);
  }
  return res.status === 204 ? null : res.json();
}

// Mock simple
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

export const productsApi = {
  // GET /me/mine
  async listMine() {
    if (USE_MOCK) return mockListMine();
    // Ajusta el endpoint según tu backend
    // Ejemplo: GET /api/products/me
    return httpGet("/api/products/me");
  },
};
