// /frontend/src/services/eventsApi.js
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

function authHeaders() {
  const token = localStorage.getItem("token");
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export const eventsApi = {
  /**
   * Registra un evento de interacción con producto.
   * @param {number} product_id
   * @param {"view"|"like"|"dismiss"|"match"} event_type
   * @returns {Promise<{ok: boolean}>}
   */
  async send(product_id, event_type) {
    const res = await fetch(`${API_URL}/api/events`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...authHeaders(),
      },
      body: JSON.stringify({ product_id, event_type }),
    });

    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(txt || `Error ${res.status} al registrar evento`);
    }

    return res.json(); // { ok: true }
  },
};
