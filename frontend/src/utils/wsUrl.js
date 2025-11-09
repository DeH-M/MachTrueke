// src/utils/wsUrl.js
// Toma tu VITE_API_URL y lo convierte a ws:// o wss:// automáticamente

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

export function wsUrl(path) {
  // Convierte http:// → ws://   y   https:// → wss://
  const base = API_URL.replace(/^http/i, "ws").replace(/\/+$/, "");
  const clean = path.startsWith("/") ? path : `/${path}`;
  return `${base}${clean}`;
}
