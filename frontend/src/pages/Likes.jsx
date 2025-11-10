// src/pages/Likes.jsx
import { useEffect, useState } from "react";
import { Link } from "react-router-dom";             // ← agregado
import { likesApi } from "../services/likesApi";

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";
const absUrl = (p) =>
  !p
    ? ""
    : /^https?:\/\//i.test(p) || p.startsWith("blob:")
    ? p
    : `${API_URL}${p.startsWith("/") ? "" : "/"}${p}`;
const firstCover = (images) => {
  if (!Array.isArray(images) || !images.length) return "";
  const u0 = images[0];
  const url = typeof u0 === "string" ? u0 : u0?.url;
  return absUrl(url || "");
};

// Carga mini-perfil público de un usuario (id, name, avatar)
async function fetchUserPublic(userId) {
  const token = localStorage.getItem("token");
  const res = await fetch(`${API_URL}/api/users/${userId}`, {
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });
  if (!res.ok) throw new Error(await res.text());
  const u = await res.json();
  return {
    id: String(u.id ?? userId),
    name: u.full_name || u.fullName || u.username || u.name || "Usuario",
    avatar: absUrl(u.avatar_url || u.avatar || ""),
  };
}

// Normalizador para items del backend
const normalizeLikeItem = (it) => {
  if (it?.product) {
    const p = it.product;
    return {
      ...it,
      type: "product",
      product: {
        id: p.id,
        title: p.title,
        cover: p.cover || firstCover(p.images),
        owner_id: p.owner_id,
      },
      owner: it.owner,
    };
  }
  return it;
};

export default function Likes() {
  const [loading, setLoading] = useState(true);
  const [products, setProducts] = useState([]);

  const openDockChat = (userId) => {
    if (!userId) return;
    window.dispatchEvent(new CustomEvent("open-chat", { detail: { id: userId } }));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { items } = await likesApi.listMine();
        if (!alive) return;

        const normItems = (items || []).map(normalizeLikeItem);

        const missingOwnerIds = Array.from(
          new Set(
            normItems
              .filter(
                (it) => it?.type === "product" && !it.owner && it.product?.owner_id
              )
              .map((it) => String(it.product.owner_id))
          )
        );

        const ownersMap = {};
        for (const uid of missingOwnerIds) {
          try {
            ownersMap[uid] = await fetchUserPublic(uid);
          } catch {
            ownersMap[uid] = {
              id: uid,
              name: "Usuario",
              avatar: "https://i.pravatar.cc/100?img=2",
            };
          }
        }

        const productList = (normItems || [])
          .filter((it) => it?.type === "product" && it.product)
          .map((it) => {
            const ownerId = it.owner?.id || it.product?.owner_id;
            const owner =
              it.owner ||
              (ownerId ? ownersMap[String(ownerId)] : null) || {
                id: "",
                name: "Usuario",
                avatar: "https://i.pravatar.cc/100?img=2",
              };

            return {
              id: String(it.product.id),
              title: it.product.title || "Producto",
              cover:
                it.product.cover ||
                "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
              owner,
              note: it.note || "",
            };
          });

        setProducts(productList);
      } catch (e) {
        console.error(e);
        alert("No se pudieron cargar tus likes/matches.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, []);

  const hasProducts = products.length > 0;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f5f2e9] px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-neutral-200/60 bg-white/70">
            <h2 className="text-lg font-bold">Tus likes / matches</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Productos con los que hiciste match recientemente.
            </p>
          </div>

          <div className="p-5">
            {loading ? (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Productos</h3>
                  <span className="text-[11px] text-neutral-500">—</span>
                </div>
                <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div
                      key={i}
                      className="aspect-square rounded-2xl bg-neutral-200/60 animate-pulse"
                    />
                  ))}
                </div>
              </section>
            ) : hasProducts ? (
              <section>
                <div className="flex items-center justify-between mb-3">
                  <h3 className="text-sm font-semibold">Productos</h3>
                  <span className="text-[11px] text-neutral-500">
                    {products.length}
                  </span>
                </div>

                <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                  {products.map((p) => (
                    <li key={p.id}>
                      <div className="rounded-2xl ring-1 ring-black/5 bg-white/80 overflow-hidden shadow-sm">
                        <div className="relative aspect-square bg-neutral-100">
                          <img
                            src={p.cover}
                            alt={p.title}
                            className="w-full h-full object-cover"
                          />
                          <span className="absolute top-2 left-2 text-[11px] rounded bg-blue-600 text-white px-2 py-0.5">
                            Match
                          </span>
                        </div>
                        <div className="p-3">
                          <p className="text-sm font-semibold line-clamp-1">
                            {p.title}
                          </p>
                          <p className="text-[11px] text-neutral-500 line-clamp-1">
                            {p.note}
                          </p>

                          <div className="mt-2 flex items-center justify-between">
                            {/* ← Enlace al perfil público */}
                            <Link to={`/u/${p.owner.id}`} className="flex items-center gap-2 min-w-0">
                              <img
                                src={p.owner.avatar}
                                alt={p.owner.name}
                                className="h-6 w-6 rounded-full object-cover ring-1 ring-black/5"
                              />
                              <span className="text-xs text-neutral-700 truncate">
                                {p.owner.name}
                              </span>
                            </Link>

                            <button
                              onClick={() => openDockChat(p.owner.id)}
                              className="text-xs rounded-lg bg-blue-600 text-white px-3 py-1 font-semibold hover:bg-blue-700"
                              title={`Chatear con ${p.owner.name}`}
                            >
                              Chatear
                            </button>
                          </div>
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ) : (
              <div className="text-sm text-neutral-500">
                Aún no tienes productos con match.
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
