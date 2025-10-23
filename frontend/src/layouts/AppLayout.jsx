// src/layouts/AppLayout.jsx
import { Outlet } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";
import useAuth from "../store/authStore";
import ChatDock from "../components/ChatDock"; // 👈 NUEVO

export default function AppLayout() {
  const { logout } = useAuth();
  return (
    <div className="min-h-screen bg-[#f5f2e9]">
      <SiteHeader variant="private" onLogout={logout} />
      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      {/* 👇 Dock flotante, visible en TODA la app protegida */}
      <ChatDock />
    </div>
  );
}
