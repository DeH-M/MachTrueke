// src/services/authApi.js
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
  try {
    return JSON.parse(text);
  } catch {
    return null;
  }
}

// --- MOCK USERS ---
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

// --- REAL ---
const real = {
  login: (p) => baseFetch("/auth/login", { method: "POST", body: JSON.stringify(p) }),
  signup: (p) => baseFetch("/auth/signup", { method: "POST", body: JSON.stringify(p) }),
  me: () => baseFetch("/auth/me"),
};

// --- EXPORT ---
export const authApi = {
  login: (p) => (USE_MOCK ? mockLogin(p) : real.login(p)),
  signup: (p) => (USE_MOCK ? mockSignup(p) : real.signup(p)),
  me: () => (USE_MOCK ? Promise.resolve(mockUsers[0]) : real.me()),
};





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