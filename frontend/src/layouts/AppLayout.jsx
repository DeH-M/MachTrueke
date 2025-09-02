import { Outlet } from "react-router-dom";
import AppNav from "../components/AppNav";

export default function AppLayout() {
  return (
    <div className="min-h-screen bg-neutral-50">
      <AppNav />

      <main className="max-w-6xl mx-auto px-4 py-6">
        <Outlet />
      </main>

      <footer className="border-t py-4 text-center text-sm text-neutral-500">
        © {new Date().getFullYear()} MachTrueke
      </footer>
    </div>
  );
}
