// src/services/likesApi.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";

/* ---------------- HTTP helper ---------------- */
async function http(path, { method = "GET", body, headers } = {}) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}${path}`, {
    method,
    headers: {
      ...(body instanceof FormData ? {} : { "Content-Type": "application/json" }),
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...(headers || {}),
    },
    body: body instanceof FormData ? body : body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) throw new Error((await res.text()) || `Error ${res.status}`);
  return res.json();
}

/* ---------------- MOCKS (opcional) ---------------- */
const mockPeople = [
  { id: "u1", name: "Hermione", avatar: "https://i.pravatar.cc/100?img=47" },
  { id: "u2", name: "Dobby",    avatar: "https://i.pravatar.cc/100?img=11" },
  { id: "u3", name: "Tom",      avatar: "https://i.pravatar.cc/100?img=15" },
];

function mockListMine() {
  return Promise.resolve({
    items: [
      {
        id: crypto.randomUUID(),
        type: "person",
        person: { ...mockPeople[0], last: "Hola, claro" },
        note: "Nuevo match",
        created_at: new Date().toISOString(),
      },
      {
        id: crypto.randomUUID(),
        type: "product",
        product: {
          id: "p123",
          title: "Calculadora científica",
          cover:
            "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
        },
        owner: mockPeople[1],
        note: "Intercambio por cuaderno",
        created_at: new Date().toISOString(),
      },
    ],
  });
}

function mockCreate(productId) {
  const owner = mockPeople[Math.floor(Math.random() * mockPeople.length)];
  return Promise.resolve({
    id: crypto.randomUUID(),
    type: "product",
    product: {
      id: String(productId),
      title: `Producto ${productId}`,
      cover:
        "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
    },
    owner,
    note: "Nuevo match",
    created_at: new Date().toISOString(),
  });
}

/* ---------------- API real ---------------- */
export const likesApi = {
  // GET /likes/mine  -> { items: [...] }
  async listMine() {
    if (USE_MOCK) return mockListMine();
    return http(`/likes/mine`, { method: "GET" });
  },

  // POST /likes  -> body: { product_id }  -> { item }
  async create(productId) {
    if (USE_MOCK) return mockCreate(productId);
    return http(`/likes`, {
      method: "POST",
      body: { product_id: productId },
    });
  },
};
