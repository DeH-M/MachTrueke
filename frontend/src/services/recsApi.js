// /frontend/src/services/recsApi.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const recsApi = {
  /**
   * Obtiene recomendaciones para el Home (IA).
   * @param {{ k?: number }} params - opcional, número de candidatos a solicitar.
   * @returns {Promise<{items: any[]}>}
   */
  async home(params = {}) {
    const qs = new URLSearchParams();
    if (params.k) qs.set("k", String(params.k));

    const url = `${API_URL}/api/recs/home${qs.toString() ? `?${qs}` : ""}`;

    const res = await fetch(url, {
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Error ${res.status} en /api/recs/home`);
    }

    // { items: Product[] }
    return res.json();
  },
};
