// frontend/src/store/authStore.js
import { create } from "zustand";
import { authApi } from "../services/authApi";

const useAuth = create((set, get) => ({
  user: null,
  isAuth: false,
  loading: true, // evita parpadeos mientras hidratamos la sesión

  // Se llama una vez al arrancar la app (App.jsx) para hidratar si hay token
  async init() {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        set({ loading: false });
        return;
      }
      const me = await authApi.me();      // requiere /auth/me en backend
      set({ user: me, isAuth: true, loading: false });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, isAuth: false, loading: false });
    }
  },

  // Para setear user cuando YA lo tienes (p.ej. un /me que devolviste elsewhere)
  login(user) {
    set({ user, isAuth: true });
  },

  // ✅ CLAVE: guardar token y de inmediato hidratar con /auth/me
  async loginWithToken(token) {
    localStorage.setItem("token", token);
    set({ loading: true });
    try {
      const me = await authApi.me();
      set({ user: me, isAuth: true, loading: false });
      return me;
    } catch (e) {
      localStorage.removeItem("token");
      set({ user: null, isAuth: false, loading: false });
      throw e;
    }
  },

  // Útil cuando cambias datos del perfil y quieres refrescar
  async refreshMe() {
    const me = await authApi.me();
    set({ user: me, isAuth: true });
    return me;
  },

  logout() {
    localStorage.removeItem("token");
    set({ user: null, isAuth: false });
  },
}));

export default useAuth;
