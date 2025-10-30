// frontend/src/App.jsx
import { useEffect } from "react";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import useAuth from "./store/authStore";

// Páginas públicas
import Home from "./pages/Home";
import Login from "./pages/Login";
import Signup from "./pages/Signup";

// Perfil (usa <Outlet/> dentro)
import Profile from "./pages/profile/Profile";
import ProfileSettings from "./pages/profile/ProfileSettings";
import ProfileProducts from "./pages/profile/ProfileProducts";

/* ---------- Rutas de control ---------- */
function PrivateRoute({ children }) {
  const { isAuth, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (!isAuth) return <Navigate to="/login" replace />;
  return children;
}

// Evita entrar a /login o /signup si ya hay sesión activa
function PublicRoute({ children }) {
  const { isAuth, loading } = useAuth();
  if (loading) return <div style={{ padding: 24 }}>Cargando…</div>;
  if (isAuth) return <Navigate to="/profile" replace />;
  return children;
}

/* ---------- App ---------- */
export default function App() {
  const { init, loading } = useAuth();

  // Hidrata el store con /auth/me si hay token
  useEffect(() => {
    init(); // equivalente a useAuth.getState().init()
  }, [init]);

  // Pantalla de carga global mientras hidrata
  if (loading) return <div className="p-6">Cargando…</div>;

  return (
    <BrowserRouter>
      <Routes>
        {/* Públicas */}
        <Route path="/" element={<Home />} />
        <Route
          path="/login"
          element={
            <PublicRoute>
              <Login />
            </PublicRoute>
          }
        />
        <Route
          path="/signup"
          element={
            <PublicRoute>
              <Signup />
            </PublicRoute>
          }
        />

        {/* Perfil (protegido) */}
        <Route
          path="/profile"
          element={
            <PrivateRoute>
              <Profile />
            </PrivateRoute>
          }
        >
          {/* index = /profile → Productos */}
          <Route index element={<ProfileProducts />} />
          <Route path="products" element={<ProfileProducts />} />
          <Route path="settings" element={<ProfileSettings />} />
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

/*
import { useEffect, useState } from "react";
import { api } from "./api/client";
import Login from "./pages/Login"; // Login

export default function App() {
  const [msg, setMsg] = useState("cargando...");
  console [Login, setLogin] = useState(true);

  useEffect(() => {
    api.get("/").then(res => setMsg(res.data.msg)).catch(() => setMsg("error"));
  }, []);

  if (Login) {
    return <Login />;
  }

  return (
    <div style={{ padding: 24 }}>
      <h1>MachTrueke</h1>
      <p>Backend dice: <b>{msg}</b></p>
      <hr />
      <button onClick={async () => {
        const { data } = await api.get("/products");
        alert("Productos demo: " + JSON.stringify(data));
      }}>
        Probar /products
      </button>
    </div>
  );
}
*/