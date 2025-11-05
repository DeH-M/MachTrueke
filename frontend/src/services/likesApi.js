// src/services/likesApi.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";

/* ---------------- helpers HTTP ---------------- */
async function http(path, { method = "GET", body, headers } = {}) {
  const token = localStorage.getItem("token");

  const isMultipart =
    typeof FormData !== "undefined" && body instanceof FormData;
  const isFormUrlEncoded =
    typeof URLSearchParams !== "undefined" && body instanceof URLSearchParams;

  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(isMultipart || isFormUrlEncoded ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body:
      isMultipart || isFormUrlEncoded
        ? body
        : body
        ? JSON.stringify(body)
        : undefined,
  });

  if (!res.ok) {
    // intenta leer {detail: "..."} del backend
    let msg = `Error ${res.status}`;
    try {
      const maybeJson = await res.json();
      msg = maybeJson?.detail || msg;
    } catch {
      try {
        msg = await res.text();
      } catch {}
    }
    throw new Error(msg);
  }

  // 204 No Content
  if (res.status === 204) return true;

  return res.json();
}

/* ---------------- MOCKS opcionales (ajustados al esquema real) ---------------- */
function mockListMine() {
  return Promise.resolve({
    items: [
      {
        id: Math.floor(Math.random() * 100000),
        note: "Match de prueba",
        created_at: new Date().toISOString(),
        product: {
          id: 123,
          title: "Calculadora científica",
          description: "Casio FX-991EX",
          owner_id: 1,
          is_active: true,
          images: [
            {
              id: 1,
              url: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
            },
          ],
        },
      },
    ],
  });
}

function mockCreate(productId) {
  return Promise.resolve({
    id: Math.floor(Math.random() * 100000),
    note: null,
    created_at: new Date().toISOString(),
    product: {
      id: productId,
      title: `Producto ${productId}`,
      description: "Descripción de prueba",
      owner_id: 999,
      is_active: true,
      images: [
        {
          id: 1,
          url: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
        },
      ],
    },
  });
}

function mockIds() {
  return Promise.resolve({ product_ids: [123, 456] });
}

/* ---------------- API real ---------------- */
export const likesApi = {
  /** GET /likes/mine -> { items: ProductLikeRead[] } */
  async listMine() {
    if (USE_MOCK) return mockListMine();
    return http(`/likes/mine`, { method: "GET" });
  },

  /** POST /likes  body: { product_id, note? } -> ProductLikeRead */
  async create(productId, note = null) {
    if (USE_MOCK) return mockCreate(productId);
    return http(`/likes`, {
      method: "POST",
      body: { product_id: productId, ...(note ? { note } : {}) },
    });
  },

  /** DELETE /api/likes/:product_id  -> 204 true */
  async remove(productId) {
    if (USE_MOCK) return true;
    return http(`/api/likes/${productId}`, { method: "DELETE" });
  },

  /** GET /likes/ids -> { product_ids: number[] } */
  async myLikedIds() {
    if (USE_MOCK) return mockIds();
    // 👇 Mejora NO invasiva: si /likes/ids no existe, caemos a /likes/mine y derivamos los IDs.
    try {
      return await http(`/likes/ids`, { method: "GET" });
    } catch {
      const { items } = await http(`/likes/mine`, { method: "GET" });
      const ids = (items || [])
        .map((it) => it?.product?.id)
        .filter((v) => v !== undefined && v !== null)
        .map((v) => Number(v));
      return { product_ids: Array.from(new Set(ids)) };
    }
  },

  /** GET /likes/check/:product_id -> { liked: boolean }  (opcional) */
  async hasLike(productId) {
    if (USE_MOCK) return { liked: false };
    return http(`/likes/check/${productId}`, { method: "GET" });
  },
};
