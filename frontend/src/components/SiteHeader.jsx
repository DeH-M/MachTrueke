import { Link, NavLink } from "react-router-dom";

const linkBase = "text-sm md:text-base px-3 py-1.5 transition";
const linkActive = "underline underline-offset-4 text-blue-700 font-semibold";

export default function SiteHeader({ variant = "public", onLogout }) {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur shadow-md">
      {/* full width, con padding lateral */}
      <nav className="w-full h-14 flex items-center px-4 sm:px-6 lg:px-10">
        {/* IZQUIERDA: logo + nombre */}
        <Link to="/" className="inline-flex items-center gap-2">
          <span className="inline-flex h-9 w-9 items-center justify-center rounded-xl bg-blue-600 text-white">
            <svg
              viewBox="0 0 24 24"
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M21 10H7" />
              <path d="M21 10l-4-4" />
              <path d="M21 10l-4 4" />
              <path d="M3 14h14" />
              <path d="M3 14l4 4" />
              <path d="M3 14l4-4" />
            </svg>
          </span>
          <span className="font-extrabold tracking-tight text-blue-700 text-2xl md:text-3xl leading-none">
            MachTrueke
          </span>
        </Link>

        {/* ESPACIADOR */}
        <div className="flex-1" />

        {/* DERECHA */}
        {variant === "public" ? (
          <div className="flex items-center gap-2">
            <NavLink
              to="/login"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : "text-neutral-700"}`
              }
            >
              Login
            </NavLink>
            <NavLink
              to="/signup"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : "text-neutral-700"}`
              }
            >
              Signup
            </NavLink>
          </div>
        ) : (
          <div className="flex items-center gap-2">
            <NavLink
              to="/"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : "text-neutral-700"}`
              }
            >
              Inicio
            </NavLink>
            <NavLink
              to="/chat"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : "text-neutral-700"}`
              }
            >
              Likes
            </NavLink>
            <NavLink
              to="/profile"
              className={({ isActive }) =>
                `${linkBase} ${isActive ? linkActive : "text-neutral-700"}`
              }
            >
              Perfil
            </NavLink>

            <span className="hidden sm:inline mx-1 h-5 w-px bg-neutral-200" />

            <button
              onClick={onLogout}
              className="text-sm rounded-lg bg-neutral-900 text-white px-3 py-1.5 hover:bg-black"
              title="Cerrar sesión"
            >
              Salir
            </button>
          </div>
        )}
      </nav>
    </header>
  );
}
