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

/* ---------------- Normalización UI <-> API ---------------- */
// UI espera:
//  { id: string, title, description, owner_id, visible, images: string[] }
function toUI(apiProduct) {
  if (!apiProduct) return null;

  // apiProduct.images puede ser [{id,url}] o ["url", ...]
  const images = Array.isArray(apiProduct.images)
    ? apiProduct.images.map((img) => (typeof img === "object" && img !== null ? img.url : img)).filter(Boolean)
    : [];

  return {
    id: String(apiProduct.id),
    title: apiProduct.title ?? "",
    description: apiProduct.description ?? "",
    owner_id: apiProduct.owner_id ?? null,
    visible: apiProduct.is_active ?? true,
    images, // solo URLs
  };
}

function toAPI(patchUI) {
  const payload = {};
  if (patchUI.title !== undefined) payload.title = patchUI.title;
  if (patchUI.description !== undefined) payload.description = patchUI.description;
  if (patchUI.visible !== undefined) payload.is_active = !!patchUI.visible;
  return payload;
}

/* ---------------- MOCK ---------------- */
function mockDelay(ms = 400) {
  return new Promise((r) => setTimeout(r, ms));
}

let MOCK = Array.from({ length: 6 }).map((_, i) => ({
  id: i + 1,
  title: `Producto ${i + 1}`,
  description: "Descripción breve del producto",
  is_active: Math.random() > 0.2,
  owner_id: 1,
  images: [
    "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
  ],
}));

/* ---------------- API ---------------- */
export const productsApi = {
  // GET /me/mine
  async listMine() {
    if (USE_MOCK) {
      await mockDelay();
      return { items: MOCK.map(toUI) };
    }
    // Tu backend devuelve una lista simple
    const data = await http(`/me/mine`);
    const items = Array.isArray(data) ? data.map(toUI) : (data.items || []).map(toUI);
    return { items };
  },

  // GET /{product_id}
  async get(id) {
    if (USE_MOCK) {
      await mockDelay();
      const p = MOCK.find((x) => String(x.id) === String(id));
      if (!p) throw new Error("No encontrado");
      return toUI(p);
    }
    const data = await http(`/${id}`);
    return toUI(data);
  },

  // POST /
  // Ahora enviamos FormData (title, description, images? -> campo "images")
  async create({ title, description, files = [] }) {
    if (USE_MOCK) {
      await mockDelay();
      const id = Math.floor(Math.random() * 9000) + 1000;
      const urls = files.map((f) => URL.createObjectURL(f));
      const created = {
        id,
        title,
        description,
        is_active: true,
        owner_id: 1,
        images: urls.length
          ? urls
          : [
              "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
            ],
      };
      MOCK = [created, ...MOCK];
      return toUI(created);
    }

    const fd = new FormData();
    fd.append("title", title);
    fd.append("description", description);
    (files || []).forEach((file) => fd.append("images", file)); // 👈 nombre del campo que espera el backend

    const created = await http(`/`, { method: "POST", body: fd });
    return toUI(created); // el backend ya devuelve ProductRead con URLs absolutas
  },

  // PATCH /{product_id}
  async update(id, patchUI) {
    if (USE_MOCK) {
      await mockDelay();
      const idx = MOCK.findIndex((x) => String(x.id) === String(id));
      if (idx < 0) throw new Error("No encontrado");
      const patch = toAPI(patchUI);
      MOCK[idx] = { ...MOCK[idx], ...patch };
      return toUI(MOCK[idx]);
    }
    const patch = toAPI(patchUI);
    const data = await http(`/${id}`, { method: "PATCH", body: patch });
    return toUI(data);
  },

  // Cambiar visibilidad (is_active)
  async toggleVisibility(id, visible) {
    return this.update(id, { visible: !!visible });
  },

  // DELETE /{product_id}
  async remove(id) {
    if (USE_MOCK) {
      await mockDelay();
      MOCK = MOCK.filter((p) => String(p.id) !== String(id));
      return { ok: true };
    }
    return http(`/${id}`, { method: "DELETE" });
  },

  // POST /{product_id}/images
  // El backend espera FormData con campo "images" (lista). Devuelve el ProductRead completo.
  // Devolvemos la URL recién agregada para que tu UI pueda hacer push fácilmente.
  async addImage(id, file) {
    if (USE_MOCK) {
      await mockDelay();
      const idx = MOCK.findIndex((x) => String(x.id) === String(id));
      if (idx < 0) throw new Error("No encontrado");
      const url = URL.createObjectURL(file);
      MOCK[idx].images = [...MOCK[idx].images, url];
      return { url }; // la UI espera {url}
    }

    const fd = new FormData();
    fd.append("images", file); // 👈 nombre correcto
    const product = await http(`/${id}/images`, { method: "POST", body: fd });
    const ui = toUI(product);
    // asumimos que la última es la recién subida
    const lastUrl = (ui.images || [])[ui.images.length - 1];
    return { url: lastUrl };
  },

  // DELETE /{product_id}/images/{image_id}
  // Si te llega una URL, primero resolvemos el image_id haciendo GET /{id}
  async removeImage(id, imageIdOrUrl) {
    if (USE_MOCK) {
      await mockDelay();
      const idx = MOCK.findIndex((x) => String(x.id) === String(id));
      if (idx < 0) throw new Error("No encontrado");
      MOCK[idx].images = MOCK[idx].images.filter(
        (u) => String(u) !== String(imageIdOrUrl)
      );
      return { ok: true };
    }

    let imageId = imageIdOrUrl;

    // ¿es una URL? (no numérico)
    const isNumeric = /^\d+$/.test(String(imageIdOrUrl));
    if (!isNumeric) {
      // resolver image_id buscando por URL
      const product = await this.get(id);
      // Necesitamos el objeto con ids -> pedimos al backend original (no normalizado) para obtener ids reales
      const raw = await http(`/${id}`);
      const match = Array.isArray(raw.images)
        ? raw.images.find((img) =>
            typeof img === "object" ? img.url === imageIdOrUrl : img === imageIdOrUrl
          )
        : null;

      if (!match || typeof match !== "object" || match.id == null) {
        throw new Error("No se pudo resolver image_id para la URL dada.");
      }
      imageId = match.id;
    }

    await http(`/${id}/images/${imageId}`, { method: "DELETE" });
    return { ok: true };
  },
};
