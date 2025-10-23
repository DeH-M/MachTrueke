// src/services/productsApi.js
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";

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
  async listMine() {
    if (USE_MOCK) return mockListMine();
    // Ajusta el endpoint según tu backend
    // Ejemplo: GET /api/products/me
    return httpGet("/api/products/me");
  },
};
