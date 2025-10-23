import React, { useEffect } from "react";
import ReactDOM from "react-dom/client";
import { RouterProvider } from "react-router-dom";
import { router } from "./routes/AppRouter";
import "./styles/globals.css";
import useAuth from "./store/authStore";

function AppInit() {
  const { init, loading } = useAuth();
  useEffect(() => { init(); }, [init]);

  if (loading) {
    return (
      <div className="min-h-screen grid place-items-center bg-[#f5f2e9]">
        <div className="animate-pulse text-neutral-600">Cargando…</div>
      </div>
    );
  }
  return <RouterProvider router={router} />;
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <AppInit />
  </React.StrictMode>
);
