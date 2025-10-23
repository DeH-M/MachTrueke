// src/pages/Likes.jsx
// Lista de matches (personas y productos). Abre mini-chat del dock con window.dispatchEvent.
const people = [
  { id: "u1", name: "Hermione", avatar: "https://i.pravatar.cc/100?img=47", last: "Hola, claro" },
  { id: "u2", name: "Dobby",    avatar: "https://i.pravatar.cc/100?img=11", last: "Te mando fotos" },
  { id: "u3", name: "Tom",      avatar: "https://i.pravatar.cc/100?img=15", last: "Gracias" },
];

const products = [
  {
    id: "p1",
    title: "Calculadora científica",
    cover: "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1000&auto=format&fit=crop",
    owner: { id: "u1", name: "Hermione", avatar: "https://i.pravatar.cc/100?img=47" },
    note: "Intercambio por cuaderno",
  },
  {
    id: "p2",
    title: "Mochila azul",
    cover: "https://images.unsplash.com/photo-1582582864648-1950e76c9c1b9?q=80&w=1200&auto=format&fit=crop",
    owner: { id: "u2", name: "Dobby", avatar: "https://i.pravatar.cc/100?img=11" },
    note: "Buen estado",
  },
  {
    id: "p3",
    title: "Audífonos",
    cover: "https://images.unsplash.com/photo-1518449007433-68d0d2c1b4c2?q=80&w=1200&auto=format&fit=crop",
    owner: { id: "u3", name: "Tom", avatar: "https://i.pravatar.cc/100?img=15" },
    note: "Como nuevos",
  },
];

export default function Likes() {
  const hasPeople = people.length > 0;
  const hasProducts = products.length > 0;

  const openDockChat = (userId) => {
    window.dispatchEvent(new CustomEvent("open-chat", { detail: { id: userId } }));
  };

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
            {/* Personas */}
            <section className="mb-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold">Personas</h3>
                {hasPeople && <span className="text-[11px] text-neutral-500">{people.length}</span>}
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
                {hasProducts && <span className="text-[11px] text-neutral-500">{products.length}</span>}
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
                              <span className="text-xs text-neutral-700 truncate">{p.owner.name}</span>
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
          </div>
        </div>
      </div>
    </div>
  );
}
