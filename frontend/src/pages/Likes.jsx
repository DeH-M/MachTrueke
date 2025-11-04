// src/pages/Likes.jsx
import { useEffect, useState } from "react";
import { likesApi } from "../services/likesApi";

/**
 * Este componente:
 * - Carga tus matches desde el backend (GET /likes/mine).
 * - Separa en dos listas: personas y productos.
 * - Abre el mini-chat del dock con window.dispatchEvent("open-chat", { id }).
 *
 * Estructura esperada (ejemplo de cada item):
 *   {
 *     id: "match_123",
 *     type: "person" | "product",
 *     person?: { id, name, avatar, last? },
 *     product?: { id, title, cover },
 *     owner?: { id, name, avatar },     // dueño del producto si aplica
 *     note?: "texto opcional",
 *     created_at?: "ISO"
 *   }
 */

export default function Likes() {
  const [loading, setLoading] = useState(true);
  const [people, setPeople] = useState([]);     // [{ id, name, avatar, last }]
  const [products, setProducts] = useState([]); // [{ id, title, cover, owner:{id,name,avatar}, note }]

  const openDockChat = (userId) => {
    if (!userId) return;
    window.dispatchEvent(new CustomEvent("open-chat", { detail: { id: userId } }));
  };

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        const { items } = await likesApi.listMine(); // { items: [] }
        if (!alive) return;

        const peopleList = [];
        const productList = [];

        (items || []).forEach((it) => {
          if (it?.type === "person" && it.person) {
            peopleList.push({
              id: String(it.person.id),
              name: it.person.name || "Usuario",
              avatar: it.person.avatar || "https://i.pravatar.cc/100?img=1",
              last: it.person.last || it.note || "",
            });
          } else if (it?.type === "product" && it.product) {
            productList.push({
              id: String(it.product.id),
              title: it.product.title || "Producto",
              cover:
                it.product.cover ||
                "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
              owner: {
                id: it.owner?.id ? String(it.owner.id) : "",
                name: it.owner?.name || "Usuario",
                avatar: it.owner?.avatar || "https://i.pravatar.cc/100?img=2",
              },
              note: it.note || "",
            });
          }
        });

        setPeople(peopleList);
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

  const hasPeople = people.length > 0;
  const hasProducts = products.length > 0;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f5f2e9] px-4 py-6">
      <div className="mx-auto w-full max-w-6xl">
        <div className="rounded-2xl ring-1 ring-black/5 shadow-sm overflow-hidden bg-white/80 backdrop-blur-sm">
          <div className="px-5 py-4 border-b border-neutral-200/60 bg-white/70">
            <h2 className="text-lg font-bold">Tus likes / matches</h2>
            <p className="text-xs text-neutral-500 mt-1">
              Personas y productos con los que hiciste match recientemente.
            </p>
          </div>

          <div className="p-5">
            {loading ? (
              <div className="space-y-6">
                {/* Skeleton personas */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Personas</h3>
                    <span className="text-[11px] text-neutral-500">—</span>
                  </div>
                  <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                    {Array.from({ length: 6 }).map((_, i) => (
                      <div key={i} className="h-16 rounded-2xl bg-neutral-200/60 animate-pulse" />
                    ))}
                  </div>
                </section>

                {/* Skeleton productos */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Productos</h3>
                    <span className="text-[11px] text-neutral-500">—</span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                    {Array.from({ length: 8 }).map((_, i) => (
                      <div key={i} className="aspect-square rounded-2xl bg-neutral-200/60 animate-pulse" />
                    ))}
                  </div>
                </section>
              </div>
            ) : (
              <>
                {/* Personas */}
                <section className="mb-6">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Personas</h3>
                    {hasPeople && (
                      <span className="text-[11px] text-neutral-500">{people.length}</span>
                    )}
                  </div>

                  {hasPeople ? (
                    <ul className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {people.map((p) => (
                        <li key={p.id}>
                          <button
                            onClick={() => openDockChat(p.id)}
                            className="w-full text-left rounded-2xl ring-1 ring-black/5 bg-white/80 hover:bg-neutral-50/80 transition shadow-sm p-3 flex items-center gap-3"
                            title={`Chatear con ${p.name}`}
                          >
                            <img
                              src={p.avatar}
                              alt={p.name}
                              className="h-10 w-10 rounded-full object-cover ring-1 ring-black/5"
                            />
                            <div className="min-w-0">
                              <p className="text-sm font-semibold truncate">{p.name}</p>
                              <p className="text-[11px] text-neutral-500 truncate">{p.last}</p>
                            </div>
                          </button>
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <div className="text-sm text-neutral-500">Aún no tienes matches con personas.</div>
                  )}
                </section>

                {/* Productos */}
                <section>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold">Productos</h3>
                    {hasProducts && (
                      <span className="text-[11px] text-neutral-500">{products.length}</span>
                    )}
                  </div>

                  {hasProducts ? (
                    <ul className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
                      {products.map((p) => (
                        <li key={p.id}>
                          <div className="rounded-2xl ring-1 ring-black/5 bg-white/80 overflow-hidden shadow-sm">
                            <div className="relative aspect-square bg-neutral-100">
                              <img src={p.cover} alt={p.title} className="w-full h-full object-cover" />
                              <span className="absolute top-2 left-2 text-[11px] rounded bg-blue-600 text-white px-2 py-0.5">
                                Match
                              </span>
                            </div>
                            <div className="p-3">
                              <p className="text-sm font-semibold line-clamp-1">{p.title}</p>
                              <p className="text-[11px] text-neutral-500 line-clamp-1">{p.note}</p>

                              <div className="mt-2 flex items-center justify-between">
                                <div className="flex items-center gap-2 min-w-0">
                                  <img
                                    src={p.owner.avatar}
                                    alt={p.owner.name}
                                    className="h-6 w-6 rounded-full object-cover ring-1 ring-black/5"
                                  />
                                  <span className="text-xs text-neutral-700 truncate">
                                    {p.owner.name}
                                  </span>
                                </div>

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
                  ) : (
                    <div className="text-sm text-neutral-500">Aún no tienes productos con match.</div>
                  )}
                </section>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
