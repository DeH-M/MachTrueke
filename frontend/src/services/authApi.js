// src/services/authApi.js
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/**
 * Fetch base:
 * - Incluye Bearer <token> si existe.
 * - Solo pone Content-Type: application/json cuando el body NO es
 *   FormData ni URLSearchParams (para dejar que el navegador ponga
 *   el boundary o el x-www-form-urlencoded correcto).
 */
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
    const err = new Error(
      (text && (() => { try { return JSON.parse(text).detail; } catch { return text; } })()) ||
      `HTTP ${res.status}`
    );
    err.status = res.status;
    throw err;
  }

  try { return text ? JSON.parse(text) : null; } catch { return null; }
}

// (Opcional) mocks apagados por defecto
async function mockSignup() { throw new Error("Mock desactivado"); }
async function mockLogin() { throw new Error("Mock desactivado"); }

/* ---- Mocks añadidos ---- */
async function mockChangePassword(p) {
  if (!p?.old_password || !p?.new_password) {
    throw new Error("Campos incompletos");
  }
  if (p.new_password.length < 8) {
    throw new Error("La nueva contraseña debe tener al menos 8 caracteres.");
  }
  return { message: "Contraseña actualizada (mock)" };
}

async function mockDeleteMe() {
  localStorage.removeItem("token");
  return { message: "Cuenta eliminada (mock)" };
}

const real = {
  // ---------- LO QUE YA TENÍAS ----------
  // Registro (JSON)
  signup: (p) =>
    baseFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({
        username: p.username,
        full_name: p.full_name,
        email: p.email,
        password: p.password,
        confirm_password: p.confirm_password,
        campus_id: Number(p.campus_id),
      }),
    }),

  // Login (OAuth2PasswordRequestForm → x-www-form-urlencoded)
  login: (p) => {
    const form = new URLSearchParams();
    form.append("username", p.email);   // backend espera "username" = email
    form.append("password", p.password);

    return baseFetch("/auth/login", {
      method: "POST",
      body: form, // NO poner Content-Type manual
    });
  },

  // Usuario actual
  me: () => baseFetch("/auth/me"),

  // ---------- PERFIL / AVATAR / CAMPUS ----------
  // Editar perfil  ✅ (FIX: sin avatar_url y campus_id numérico/null)
  updateMe: (p) =>
    baseFetch("/auth/me", {
      method: "PUT",
      body: JSON.stringify({
        username: p.username?.trim(),
        bio: p.bio ?? null,
        campus_id:
          p.campus_id === "" || p.campus_id == null ? null : Number(p.campus_id),
      }),
    }),

  // Cambiar contraseña (backend usa old_password y new_password)
  changePassword: (p) =>
    baseFetch("/auth/me/change-password", {
      method: "POST",
      body: JSON.stringify({
        old_password: p.old_password,
        new_password: p.new_password,
      }),
    }),

  // Eliminar cuenta
  deleteMe: () =>
    baseFetch("/auth/me", { method: "DELETE" }),

  // Subir avatar (FormData)
  uploadAvatar: (file) => {
    const fd = new FormData();
    fd.append("file", file);
    return baseFetch("/auth/me/avatar", {
      method: "POST",
      body: fd, // baseFetch detecta FormData y no pone Content-Type
    });
  },

  // Borrar avatar
  deleteAvatar: () =>
    baseFetch("/auth/me/avatar", { method: "DELETE" }),

  // Listar campuses (para el combo)
  listCampuses: (q) =>
    baseFetch(`/auth/campuses${q ? `?q=${encodeURIComponent(q)}` : ""}`),
};

export const authApi = {
  // ---------- LO QUE YA TENÍAS ----------
  signup: (p) => (USE_MOCK ? mockSignup(p) : real.signup(p)),
  login:  (p) => (USE_MOCK ? mockLogin(p)  : real.login(p)),
  me:     ()  => real.me(),

  // ---------- EXPORTS ----------
  updateMe: (p) => real.updateMe(p),
  changePassword: (p) => (USE_MOCK ? mockChangePassword(p) : real.changePassword(p)),
  deleteMe: () => (USE_MOCK ? mockDeleteMe() : real.deleteMe()),
  uploadAvatar: (f) => real.uploadAvatar(f),
  deleteAvatar: () => real.deleteAvatar(),
  listCampuses: (q) => real.listCampuses(q),
};


