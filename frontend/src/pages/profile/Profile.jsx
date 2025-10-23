import { NavLink, Outlet, Link, useLocation } from "react-router-dom";
import useAuth from "../../store/authStore";

const linkBase =
  "block w-full text-left px-4 py-2 rounded-lg hover:bg-white/10 transition";
const linkActive = "bg-white/15";

export default function Profile() {
  const { user } = useAuth();
  const { pathname } = useLocation();

  // Activo si estás en /profile o en /profile/products
  const isProductsActive =
    pathname === "/profile" || pathname.startsWith("/profile/products");

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f5f2e9] px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid md:grid-cols-12 gap-0 rounded-2xl overflow-hidden">
          {/* IZQUIERDA */}
          <aside className="hidden md:flex md:col-span-3 flex-col bg-blue-600 text-white p-6 md:p-8 rounded-l-2xl">
            {/* Usuario */}
            <div className="flex items-center gap-3 mb-5">
              <img
                src={user?.avatar || "https://i.pravatar.cc/100?img=13"}
                alt={user?.username || "Usuario"}
                className="h-12 w-12 rounded-full border border-white/50 object-cover"
              />
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold leading-tight truncate">
                  {user?.name || user?.username || "User1"}
                </h2>
                <p className="text-xs text-white/80 truncate">
                  {user?.email || "correo@ejemplo.com"}
                </p>
              </div>
            </div>

            {/* Info básica */}
            <div className="space-y-2 text-sm mb-6">
              <p className="text-white/90">
                <span className="font-semibold">Campus:</span>{" "}
                {user?.campus || "CUCEI"}
              </p>
              <p className="text-white/90">
                Estudio ingeniería en sistemas y me gustan los perritos.
              </p>
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
