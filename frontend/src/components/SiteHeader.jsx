import { NavLink, Link } from "react-router-dom";

// estilos base
const linkBase = "text-sm md:text-base px-3 py-1.5 transition";
const linkActive = "underline underline-offset-4 text-blue-700 font-semibold";

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 bg-white/90 backdrop-blur shadow-md">
      {/* full-bleed: ocupa todo el ancho; padding lateral solamente */}
      <nav className="w-full h-14 flex items-center px-4 sm:px-6 lg:px-10">
        {/* IZQUIERDA: logo + nombre, pegado a la orilla */}
        <div className="flex items-center gap-2">
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
        </div>

        {/* ESPACIADOR: empuja el bloque de la derecha a la orilla */}
        <div className="flex-1" />

        {/* DERECHA: Login / Signup, pegados a la orilla */}
        <div className="flex items-center gap-2">
          <NavLink
            to="/login"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : "text-neutral-700"}`
            }
          >
            Iniciar Sesión
          </NavLink>
          <NavLink
            to="/signup"
            className={({ isActive }) =>
              `${linkBase} ${isActive ? linkActive : "text-neutral-700"}`
            }
          >
            Registrarse
          </NavLink>
        </div>
      </nav>
    </header>
  );
}
