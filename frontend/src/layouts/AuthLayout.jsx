import { Outlet } from "react-router-dom";
import SiteHeader from "../components/SiteHeader";

export default function AuthLayout() {
  return (
    <div className="min-h-screen bg-[#f5f2e9] flex flex-col">
      {/* Header público */}
      <SiteHeader />

      {/* Contenedor centrado */}
      <div className="flex-1 flex items-center justify-center">
        <div className="w-full max-w-6xl grid md:grid-cols-2 shadow-md bg-white md:bg-transparent md:shadow-none">
          {/* Panel izquierdo */}
          <section className="hidden md:flex flex-col justify-center bg-blue-600 text-white p-10 rounded-l-2xl">
            <div className="max-w-md space-y-5">
              <h2 className="text-3xl leading-tight font-bold">
                Inicia en <span className="block">MACHTRUEKE</span>
              </h2>
              <p className="text-white/90">
                Plataforma para intercambio de bienes y servicios en la comunidad universitaria.
              </p>
              <button
                type="button"
                className="inline-flex items-center gap-2 rounded-2xl bg-white text-blue-700 px-5 py-2 font-semibold shadow"
              >
                Obtener app móvil
              </button>
            </div>
          </section>

          {/* Panel derecho: login/signup */}
          <section className="flex items-center justify-center p-6 bg-[#f5f2e9] md:bg-white rounded-r-2xl">
            <div className="w-full max-w-md">
              <Outlet />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}