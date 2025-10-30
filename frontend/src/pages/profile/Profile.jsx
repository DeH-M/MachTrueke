// src/pages/profile/Profile.jsx
import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import { useEffect, useMemo, useState } from "react";
import useAuth from "../../store/authStore";
import { CAMPUSES as CAMPUSES_FALLBACK } from "../../constants/campuses";
import { authApi } from "../../services/authApi";

const linkBase =
  "block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition";
const linkActive = "bg-white/15";

/* 👉 NUEVO: helper para resolver URLs relativas del backend */
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";
const absUrl = (p) => {
  if (!p) return "";
  if (/^https?:\/\//i.test(p) || p.startsWith("blob:")) return p;
  return `${API_URL}${p.startsWith("/") ? "" : "/"}${p}`;
};

/* ---------------- helpers para mapear campus ------------------ */
function buildCampusNameMap(rows) {
  const map = new Map();
  (rows || []).forEach((r) => {
    const label =
      r?.name ||
      r?.label ||
      (r?.code ? `${r.code}${r?.name ? `: ${r.name}` : ""}` : "") ||
      String(r?.id ?? "");
    if (r?.id != null) map.set(Number(r.id), label);
  });
  return map;
}

function buildCampusShortMap(rows) {
  const map = new Map();
  (rows || []).forEach((r) => {
    let short =
      r?.code ||
      r?.short ||
      (typeof r?.label === "string" && r.label.includes(":")
        ? r.label.split(":")[0].trim()
        : undefined) ||
      (typeof r?.name === "string" && r.name.includes(":")
        ? r.name.split(":")[0].trim()
        : undefined);

    if (!short && (r?.label || r?.name)) {
      const base = r?.label || r?.name;
      const m = String(base).match(/^[A-ZÁÉÍÓÚÜ0-9\-]+/);
      if (m) short = m[0];
    }

    if (r?.id != null && short) map.set(Number(r.id), short);
  });
  return map;
}

export default function Profile() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Activo si estás en /profile o en /profile/products
  const isProductsActive =
    pathname === "/profile" || pathname.startsWith("/profile/products");

  /* ---------- Campus resolvers (nombre y short) ---------- */
  const [campusMap, setCampusMap] = useState(() =>
    buildCampusNameMap(CAMPUSES_FALLBACK)
  );
  const [campusShortMap, setCampusShortMap] = useState(() =>
    buildCampusShortMap(CAMPUSES_FALLBACK)
  );

  // 1) intenta leer cache local si existe
  useEffect(() => {
    try {
      const cached = localStorage.getItem("campusesCache");
      if (cached) {
        const rows = JSON.parse(cached);
        if (Array.isArray(rows) && rows.length) {
          setCampusMap(buildCampusNameMap(rows));
          setCampusShortMap(buildCampusShortMap(rows));
        }
      }
    } catch {}
  }, []);

  // 2) si no hay cache decente, intenta una carga rápida del backend y cachea
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const rows = await authApi.listCampuses(); // [{id, code, name}, ...]
        if (alive && Array.isArray(rows) && rows.length) {
          setCampusMap(buildCampusNameMap(rows));
          setCampusShortMap(buildCampusShortMap(rows));
          localStorage.setItem("campusesCache", JSON.stringify(rows));
        }
      } catch {
        // sin drama: ya tenemos fallback de constants
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  // 3) calcula el nombre del campus del usuario
  const campusName = useMemo(() => {
    if (user?.campus?.name) return user.campus.name;
    if (typeof user?.campus === "string") return user.campus;
    if (user?.campus_name) return user.campus_name;

    if (user?.campus_id != null) {
      const n = campusMap.get(Number(user.campus_id));
      if (n) return n;
    }
    return "";
  }, [user, campusMap]);

  // 4) calcula el código corto del campus (CUCS, CUCEI, etc.)
  const campusShort = useMemo(() => {
    if (user?.campus?.code) return user.campus.code;

    if (user?.campus_id != null) {
      const short = campusShortMap.get(Number(user.campus_id));
      if (short) return short;
    }

    if (campusName && campusName.includes(":")) {
      return campusName.split(":")[0].trim();
    }
    return "";
  }, [user, campusShortMap, campusName]);

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f5f2e9] px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid md:grid-cols-12 gap-0 rounded-2xl overflow-hidden">
          {/* IZQUIERDA */}
          <aside className="hidden md:flex md:col-span-3 flex-col bg-blue-600 text-white p-6 md:p-8 rounded-l-2xl">
            {/* Usuario */}
            <div className="flex items-center gap-3 mb-5">
              {/* Avatar: si no hay, muestra “Sin foto” */}
              {user?.avatar_url ? (
                <img
                  src={absUrl(user.avatar_url)}  
                  alt={user?.username || "Usuario"}
                  className="h-12 w-12 rounded-full border border-white/50 object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full border border-white/50 grid place-items-center text-[10px] text-white/70">
                  Sin foto
                </div>
              )}

              <div className="min-w-0">
                <h2 className="text-lg font-extrabold leading-tight truncate">
                  {user?.username || user?.full_name || "Usuario"}
                </h2>
                <p className="text-xs text-white/80 truncate">
                  {user?.email || ""}
                </p>
              </div>
            </div>

            {/* Info básica */}
            <div className="space-y-2 text-sm mb-6">
              <p className="text-white/90">
                <span className="font-semibold">Campus:</span>{" "}
                {campusShort || campusName || "—"}
              </p>
              {user?.bio ? (
                <p className="text-white/90">{user.bio}</p>
              ) : (
                <p className="text-white/60 italic">Sin descripción</p>
              )}
            </div>

            {/* Dos opciones */}
            <nav className="space-y-2 text-sm font-semibold tracking-wide">
              {/* PRODUCTOS activo también en /profile */}
              <Link
                to="/profile/products"
                className={`${linkBase} ${isProductsActive ? linkActive : ""}`}
              >
                PRODUCTOS
              </Link>

              <NavLink
                to="/profile/settings"
                className={({ isActive }) =>
                  `${linkBase} ${isActive ? linkActive : ""}`
                }
              >
                CONFIGURACIÓN
              </NavLink>
            </nav>
          </aside>

          {/* DERECHA */}
          <section className="md:col-span-9 bg-white rounded-r-2xl">
            <div className="h-[calc(100vh-56px-64px)] overflow-y-auto overscroll-contain p-4 md:p-6">
              <Outlet />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
