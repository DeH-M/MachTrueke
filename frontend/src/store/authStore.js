import { create } from "zustand";

const useAuth = create((set) => ({
  user: null,
  isAuth: false,
  login: (user) => set({ user, isAuth: true }),
  logout: () => set({ user: null, isAuth: false }),
}));

export default useAuth;