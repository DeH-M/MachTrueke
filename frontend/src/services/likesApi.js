// src/services/likesApi.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";

async function http(path, options = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    headers: {
      ...(options.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(options.headers || {}),
    },
    ...options,
  });
  if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}`);
  return res.json();
}

// ---------- MOCKS ----------
const mockPeople = [
  { id: "u1", name: "Hermione", avatar: "https://i.pravatar.cc/100?img=47" },
  { id: "u2", name: "Dobby",    avatar: "https://i.pravatar.cc/100?img=11" },
  { id: "u3", name: "Tom",      avatar: "https://i.pravatar.cc/100?img=15" },
];

function mockListMine() {
  // matches vacíos por defecto; se irá llenando con addLocalMatch desde Home
  return Promise.resolve({ items: [] });
}

function mockCreate(productId) {
  // Devuelve un objeto match “realista” solo para pruebas
  const owner = mockPeople[Math.floor(Math.random() * mockPeople.length)];
  return Promise.resolve({
    id: crypto.randomUUID(),
    product: {
      id: productId,
      title: `Producto ${productId}`,
      cover:
        "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
    },
    owner,
    note: "Nuevo match",
    created_at: new Date().toISOString(),
  });
}

// ---------- API ----------
export const likesApi = {
  // GET /likes/mine  -> { items: [...] }
  async listMine() {
    if (USE_MOCK) return mockListMine();
    return http("/api/likes/mine", { method: "GET" });
  },

  // POST /likes  -> body: { productId }  -> { match }
  async create(productId) {
    if (USE_MOCK) return mockCreate(productId);
    return http("/api/likes", {
      method: "POST",
      body: JSON.stringify({ productId }),
    });
  },
};
