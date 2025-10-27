import axios from "axios";

export const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL,
  withCredentials: false, // true solo si manejas cookies/sesiones
});

export default api;