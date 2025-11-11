// src/pages/public/SellerProfile.jsx
import { useEffect, useMemo, useState } from "react";
import { useParams } from "react-router-dom";

const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

/* Helpers consistentes con tu app */
const absUrl = (p) => {
  if (!p) return "";
  if (/^https?:\/\//i.test(p) || p.startsWith("blob:")) return p;
  return `${API_URL}${p.startsWith("/") ? "" : "/"}${p}`;
};
const imgUrl = (x) => (typeof x === "string" ? x : x?.url || "");
const firstCover = (images) =>
  Array.isArray(images) && images.length ? absUrl(imgUrl(images[0])) : "";

const FALLBACK_AVATAR = "/static/uploads/avatars/avatar-placeholder.png";
const FALLBACK_COVER =
  "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop";

export default function SellerProfile() {
  const { id } = useParams();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const meId = useMemo(() => Number(localStorage.getItem("user_id") || 0), []);

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const res = await fetch(`${API_URL}/api/public/profile/${id}`);
        const json = res.ok ? await res.json() : null;
        if (alive) setData(json);
      } catch {
        if (alive) setData(null);
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [id]);

  const openDockChat = (userId) => {
  if (!userId) return;
  window.dispatchEvent(
    new CustomEvent("open-chat", {
      detail: { peer: { id: String(userId) } },
    })
  );
};

  /* Skeleton */
  if (loading) {
    return (
      <div className="min-h-[calc(100vh-56px)] bg-[#f5f2e9] px-4 py-6">
        <div className="mx-auto w-full max-w-6xl grid md:grid-cols-12 gap-0 rounded-2xl overflow-hidden">
          <aside className="hidden md:flex md:col-span-3 flex-col bg-blue-600 text-white p-6 md:p-8 rounded-l-2xl">
            <div className="flex items-center gap-3 mb-5">
              <div className="h-12 w-12 rounded-full bg-blue-500 animate-pulse" />
              <div className="space-y-2">
                <div className="h-3 w-28 bg-blue-500 rounded animate-pulse" />
                <div className="h-3 w-20 bg-blue-500 rounded animate-pulse" />
              </div>
            </div>
            <div className="h-3 w-40 bg-blue-500 rounded animate-pulse mb-6" />
            <div className="space-y-2">
              <div className="h-8 bg-blue-500/60 rounded-lg animate-pulse" />
              <div className="h-8 bg-blue-500/40 rounded-lg animate-pulse" />
            </div>
          </aside>
          <section className="md:col-span-9 bg-white rounded-r-2xl">
            <div className="h-[calc(100vh-56px-64px)] overflow-y-auto overscroll-contain p-4 md:p-6">
              <div className="h-6 w-64 bg-neutral-200 rounded animate-pulse mb-4" />
              <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                {Array.from({ length: 8 }).map((_, i) => (
                  <div key={i} className="h-40 bg-neutral-200/60 rounded-xl animate-pulse" />
                ))}
              </div>
            </div>
          </section>
        </div>
      </div>
    );
  }

  if (!data) return <div className="p-6">Perfil no disponible.</div>;

  /* Normalización */
  const user = data.user || {};
  const rawProducts = Array.isArray(data.products) ? data.products : [];

  const avatar = absUrl(user?.avatar_url || user?.avatar || FALLBACK_AVATAR);
  const displayName =
    user?.username || user?.full_name || user?.fullName || user?.name || "Usuario";
  const campusLabel =
    typeof user?.campus === "string"
      ? user.campus
      : user?.campus?.name || user?.campus?.code || user?.campus_name || "";
  const bio = user?.bio || user?.tagline || "";

  const products = rawProducts.map((p) => {
    const cover =
      p.cover ||
      firstCover(p.images) ||
      (Array.isArray(p.images) && typeof p.images[0] === "string" ? p.images[0] : "") ||
      FALLBACK_COVER;

    const visible =
      typeof p.visible === "boolean"
        ? p.visible
        : p.is_active !== false;

    return {
      id: p.id,
      title: p.title || "Producto",
      description: p.description || "",
      cover,
      visible,
    };
  });

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f5f2e9] px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="grid md:grid-cols-12 gap-0 rounded-2xl overflow-hidden">
          {/* IZQUIERDA (sticky en desktop para mejor UX) */}
          <aside className="hidden md:flex md:col-span-3 flex-col bg-blue-600 text-white p-6 md:p-8 rounded-l-2xl md:sticky md:top-[72px] md:h-[calc(100vh-56px-32px)]">
            <div className="flex items-center gap-3 mb-5">
              {avatar ? (
                <img
                  src={avatar}
                  alt={displayName}
                  className="h-12 w-12 rounded-full border border-white/50 object-cover"
                />
              ) : (
                <div className="h-12 w-12 rounded-full border border-white/50 grid place-items-center text-[10px] text-white/70">
                  Sin foto
                </div>
              )}

              <div className="min-w-0">
                <h2 className="text-lg font-extrabold leading-tight truncate">
                  {displayName}
                </h2>
                {campusLabel ? (
                  <p className="text-xs text-white/80 truncate">Campus: {campusLabel}</p>
                ) : (
                  <p className="text-xs text-white/60 truncate">&nbsp;</p>
                )}
              </div>
            </div>

            <div className="space-y-2 text-sm mb-6">
              {bio ? (
                <p className="text-white/90">{bio}</p>
              ) : (
                <p className="text-white/60 italic">Sin descripción</p>
              )}
            </div>

            <nav className="space-y-2 text-sm font-semibold tracking-wide">
              <span className="block w-full text-left px-4 py-2 rounded-lg bg-white/15">
                PRODUCTOS
              </span>
            </nav>

            {Number(id) !== Number(meId) && (
              <button
                onClick={() => openDockChat(Number(id))}
                className="mt-auto rounded-xl bg-white text-blue-700 px-4 py-2 text-sm font-semibold hover:bg-blue-50 transition"
              >
                Chatear
              </button>
            )}
          </aside>

          {/* HEADER MÓVIL (cuando el aside está oculto) */}
          <div className="md:hidden bg-blue-600 text-white p-4 rounded-t-2xl">
            <div className="flex items-center gap-3">
              <img
                src={avatar}
                alt={displayName}
                className="h-12 w-12 rounded-full border border-white/50 object-cover"
              />
              <div className="min-w-0">
                <h2 className="text-lg font-extrabold leading-tight truncate">
                  {displayName}
                </h2>
                {campusLabel && (
                  <p className="text-xs text-white/80 truncate">Campus: {campusLabel}</p>
                )}
              </div>
              {Number(id) !== Number(meId) && (
                <button
                  onClick={() => openDockChat(Number(id))}
                  className="ml-auto rounded-lg bg-white text-blue-700 px-3 py-1.5 text-xs font-semibold hover:bg-blue-50 transition"
                >
                  Chatear
                </button>
              )}
            </div>
            {bio && <p className="mt-2 text-sm text-white/90">{bio}</p>}
          </div>

          {/* DERECHA con SCROLL PROPIO y responsive grid */}
          <section className="md:col-span-9 bg-white rounded-r-2xl">
            <div
              className="
                h-[calc(100vh-56px-64px)]
                overflow-y-auto overscroll-contain
                p-4 md:p-6
              "
            >
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-bold">Productos de {displayName}</h2>
                <span className="text-[11px] text-neutral-500">{products.length}</span>
              </div>

              {products.length === 0 ? (
                <div className="text-sm text-neutral-600">
                  Este usuario aún no ha publicado productos.
                </div>
              ) : (
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {products.map((p) => (
                    <div
                      key={p.id}
                      className="rounded-2xl ring-1 ring-black/5 bg-white overflow-hidden shadow-sm hover:shadow-md transition"
                    >
                      <div className="relative aspect-square bg-neutral-100 overflow-hidden">
                        {p.cover ? (
                          <img
                            src={p.cover}
                            alt={p.title}
                            className={`w-full h-full object-cover transition ${
                              p.visible ? "" : "opacity-60"
                            }`}
                            loading="lazy"
                            draggable={false}
                          />
                        ) : (
                          <div className="w-full h-full grid place-items-center text-xs text-neutral-400">
                            Sin imagen
                          </div>
                        )}

                        {!p.visible && (
                          <span className="absolute top-2 left-2 text-[11px] rounded bg-neutral-800/80 text-white px-2 py-0.5">
                            No visible
                          </span>
                        )}
                      </div>

                      <div className="p-3">
                        <p className="text-sm font-semibold line-clamp-1">{p.title}</p>
                        <p className="text-[11px] text-neutral-500 line-clamp-2">
                          {p.description}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* espacio final para que el último card no quede pegado al borde inferior */}
              <div className="h-2" />
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
