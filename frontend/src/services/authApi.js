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

const real = {
  // Registro: el backend espera JSON → dejamos JSON
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

  // Login: el backend usa OAuth2PasswordRequestForm → x-www-form-urlencoded
  login: (p) => {
    const form = new URLSearchParams();
    form.append("username", p.email);   // OJO: el backend espera "username" = email
    form.append("password", p.password);

    return baseFetch("/auth/login", {
      method: "POST",
      body: form, // NO pongas Content-Type manualmente
    });
  },

  // Datos del usuario autenticado
  me: () => baseFetch("/auth/me"),
};

export const authApi = {
  signup: (p) => (USE_MOCK ? mockSignup(p) : real.signup(p)),
  login:  (p) => (USE_MOCK ? mockLogin(p)  : real.login(p)),
  me:     ()  => real.me(),
};


/* src/services/authApi.js
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

async function baseFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const err = new Error(text || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  try { return JSON.parse(text); } catch { return null; }
}

// (Opcional) mocks apagados por defecto
async function mockSignup() { throw new Error("Mock desactivado"); }
async function mockLogin() { throw new Error("Mock desactivado"); }

const real = {
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
  login: (p) =>
    baseFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: p.email, password: p.password }),
    }),
  me: () => baseFetch("/auth/me"), // cambia a /users/me si tu backend lo usa así
};

export const authApi = {
  signup: (p) => (USE_MOCK ? mockSignup(p) : real.signup(p)),
  login: (p) => (USE_MOCK ? mockLogin(p) : real.login(p)),
  me: () => real.me(),
};

/* src/services/auth.js   (puedes conservar el nombre que ya usas)
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// ---------- BASE FETCH ----------
async function baseFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const err = new Error(text || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// ---------- MOCK ----------
let mockUsers = [
  {
    id: "u1",
    username: "andrea",
    email: "andrea@alumnos.udg.mx",
    password: "12345678",
    name: "Andrea",
    avatar: "https://i.pravatar.cc/100?img=12",
  },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function mockLogin({ email, password }) {
  await sleep(300);
  const u = mockUsers.find((x) => x.email === email && x.password === password);
  if (!u) {
    const e = new Error("Credenciales inválidas");
    e.status = 401;
    throw e;
  }
  return { access_token: "mock-" + u.id, token_type: "bearer", user: u };
}

async function mockSignup({ username, email, password }) {
  await sleep(400);
  if (mockUsers.some((x) => x.email === email || x.username === username)) {
    const e = new Error("Ese usuario o correo ya existe");
    e.status = 409;
    throw e;
  }
  const u = { id: "u" + (mockUsers.length + 1), username, email, password, name: username };
  mockUsers.push(u);
  return { access_token: "mock-" + u.id, token_type: "bearer", user: u };
}

// ---------- REAL API ----------
// IMPORTANTE:
// - Registro real: POST /auth/register  { email, password, full_name? }
// - Login real:    POST /auth/login     { email, password }
// - Me (JWT):      GET  /auth/me  (o /users/me según tu backend)
// Ajusta la ruta de "me" abajo si tu backend usa /users/me
const real = {
  login: (p) =>
    baseFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email: p.email, password: p.password }),
    }),

  // ⬇️ AQUI EL CAMBIO CLAVE: usar /auth/register y mapear full_name
  signup: async (p) => {
    // p puede venir con username o name desde tu form; el backend espera full_name (opcional)
    const payload = {
      email: p.email,
      password: p.password,
      full_name: p.full_name || p.username || p.name || null,
    };

    // 1) Registrar
    const user = await baseFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify(payload),
    });

    // 2) (Opcional) Auto-login tras registro
    try {
      const auth = await real.login({ email: p.email, password: p.password });
      // si tu backend devuelve {access_token, token_type, user?}, guarda el token aquí si quieres:
      if (auth?.access_token) localStorage.setItem("token", auth.access_token);
      return { ...auth, user: auth?.user || user };
    } catch {
      // si aún no tienes login con token, al menos devuelve el user del registro
      return { user };
    }
  },

  // Si tu backend expone /users/me en lugar de /auth/me, cambia la ruta aquí:
  me: () => baseFetch("/auth/me"),
};

// ---------- EXPORT ----------
export const authApi = {
  login: (p) => (USE_MOCK ? mockLogin(p) : real.login(p)),
  signup: (p) => (USE_MOCK ? mockSignup(p) : real.signup(p)),
  me: () => (USE_MOCK ? Promise.resolve(mockUsers[0]) : real.me()),
};
*/




/*
const USE_MOCK = import.meta.env.VITE_USE_MOCK === "1";
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

async function baseFetch(path, options = {}) {
  const token = localStorage.getItem("token");
  const headers = {
    "Content-Type": "application/json",
    ...(options.headers || {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
  const res = await fetch(`${API_URL}${path}`, { ...options, headers });
  const text = await res.text().catch(() => "");
  if (!res.ok) {
    const err = new Error(text || `HTTP ${res.status}`);
    err.status = res.status;
    throw err;
  }
  try { return JSON.parse(text); } catch { return null; }
}

// MOCK opcional (si VITE_USE_MOCK=1)
const sleep = (ms) => new Promise(r => setTimeout(r, ms));
let mockUsers = [
  { id: "u1", username: "andrea", email: "andrea@alumnos.udg.mx", password: "12345678", name: "Andrea" },
];
async function mockLogin({ email, password }) {
  await sleep(300);
  const u = mockUsers.find(x => x.email === email && x.password === password);
  if (!u) { const e = new Error("Credenciales inválidas"); e.status = 401; throw e; }
  return { access_token: "mock-" + u.id, token_type: "bearer", user: u };
}
async function mockSignup({ username, email, password }) {
  await sleep(400);
  if (mockUsers.some(x => x.email === email || x.username === username)) {
    const e = new Error("Ese usuario o correo ya existe"); e.status = 409; throw e;
  }
  const u = { id: "u" + (mockUsers.length + 1), username, email, password, name: username };
  mockUsers.push(u);
  return { access_token: "mock-" + u.id, token_type: "bearer", user: u };
}

// REAL
const real = {
  login:  (p) => baseFetch("/auth/login",  { method: "POST", body: JSON.stringify(p) }),
  signup: (p) => baseFetch("/auth/signup", { method: "POST", body: JSON.stringify(p) }),
  me:     ()  => baseFetch("/auth/me",     { method: "GET" }),
};

export const authApi = {
  login:  (p) => (USE_MOCK ? mockLogin(p)  : real.login(p)),
  signup: (p) => (USE_MOCK ? mockSignup(p) : real.signup(p)),
  me:     ()  => real.me(),
};

*/