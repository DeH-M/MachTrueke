import { create } from "zustand";
import { authApi } from "../services/authApi";

const useAuth = create((set) => ({
  user: null,
  isAuth: false,
  loading: true, // evita parpadeos mientras hidratamos la sesión

  async init() {
    try {
      const token = localStorage.getItem("token");
      if (!token) return set({ loading: false });
      const me = await authApi.me(); // requiere /auth/me en backend
      set({ user: me, isAuth: true, loading: false });
    } catch {
      localStorage.removeItem("token");
      set({ user: null, isAuth: false, loading: false });
    }
  },

  login(user) { set({ user, isAuth: true }); },
  logout() {
    localStorage.removeItem("token");
    set({ user: null, isAuth: false });
  },
}));

export default useAuth;
