// src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { useLikes } from "../store/likesStore";
import { likesApi } from "../services/likesApi";

// Cola MOCK de productos (mientras no hay backend)
const MOCK = [
  {
    id: "p100",
    title: "Calculadora científica",
    description: "Casio FX-991EX",
    images: [
      "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1200&auto=format&fit=crop",
    ],
    owner: { id: "u1", name: "Hermione", avatar: "https://i.pravatar.cc/100?img=47" },
  },
  {
    id: "p101",
    title: "Mochila azul",
    description: "Buen estado",
    images: [
      "https://images.unsplash.com/photo-1582582864648-1950e76c9c1b?q=80&w=1200&auto=format&fit=crop",
    ],
    owner: { id: "u2", name: "Dobby", avatar: "https://i.pravatar.cc/100?img=11" },
  },
];

export default function Home() {
  // Cola local (luego la puedes traer desde tu API)
  const [queue, setQueue] = useState(MOCK);
  const [idx, setIdx] = useState(0);
  const card = queue[idx];

  // Animación/gesto
  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  // Likes store
  const { addLocalMatch } = useLikes();

  // Umbral para decidir match/reject
  const THRESHOLD = 100;

  const resetDrag = () => setDragX(0);

  const goNext = () => {
    setIsAnimating(false);
    setDragX(0);
    setIdx((i) => Math.min(i + 1, queue.length));
  };

  const onReject = () => {
    if (!card) return;
    // Aquí puedes notificar rechazo a backend si lo requieren
    // await likesApi.reject(card.id) (si existe)
    // Animación hacia la izquierda
    setIsAnimating(true);
    setDragX(-window.innerWidth); // “sale” a la izquierda
    setTimeout(goNext, 200);
  };

  const onMatch = async () => {
    if (!card) return;
    try {
      const created = await likesApi.create(card.id);
      // Actualiza store local (para Likes)
      addLocalMatch({
        id: created.id || crypto.randomUUID(),
        product: { id: card.id, title: card.title, cover: card.images?.[0] },
        owner: card.owner,
        note: created.note || "Match",
        created_at: created.created_at || new Date().toISOString(),
      });

      // Animación hacia la derecha
      setIsAnimating(true);
      setDragX(window.innerWidth); // “sale” a la derecha
      setTimeout(goNext, 200);
    } catch (e) {
      console.error(e);
      alert("No se pudo crear el match");
      setIsAnimating(false);
      resetDrag();
    }
  };

  // Handlers de swipe (touch y mouse)
  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (isAnimating) return;
      setDragX(e.deltaX); // positivo = derecha, negativo = izquierda
    },
    onSwiped: (e) => {
      if (isAnimating) return;
      const dx = e.deltaX;
      if (dx > THRESHOLD) {
        onMatch();
      } else if (dx < -THRESHOLD) {
        onReject();
      } else {
        // vuelve al centro
        resetDrag();
      }
    },
    trackMouse: true, // permite arrastrar con mouse
    preventScrollOnSwipe: true,
  });

  // Atajos de teclado (← rechazar / → match)
  useEffect(() => {
    const onKey = (ev) => {
      if (!card) return;
      if (ev.key === "ArrowLeft") onReject();
      if (ev.key === "ArrowRight") onMatch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  // Estilos derivados del arrastre
  const rotate = (dragX / 20); // ligero giro
  const opacityYes = Math.min(Math.max(dragX / 120, 0), 1);
  const opacityNo = Math.min(Math.max(-dragX / 120, 0), 1);
  const translate = `translateX(${dragX}px) rotate(${rotate}deg)`;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f5f2e9] px-4 py-6">
      <div className="mx-auto w-full max-w-6xl flex flex-col items-center">
        {!card ? (
          <p className="text-sm text-neutral-600">No hay más productos por ahora.</p>
        ) : (
          <div className="w-full max-w-md">
            {/* Tarjeta con swipe */}
            <div
              {...handlers}
              className="relative select-none will-change-transform"
              style={{
                transform: translate,
                transition: isAnimating ? "transform 200ms ease" : "none",
              }}
            >
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                {/* Imagen */}
                <div className="relative aspect-square bg-neutral-100">
                  <img
                    src={card.images?.[0]}
                    alt={card.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                  />

                  {/* Badges YES/NO */}
                  <span
                    className="absolute top-4 left-4 text-sm font-bold px-3 py-1 rounded-xl ring-1 ring-green-500/40 bg-white/90 text-green-600"
                    style={{ opacity: opacityYes }}
                  >
                    MATCH
                  </span>
                  <span
                    className="absolute top-4 right-4 text-sm font-bold px-3 py-1 rounded-xl ring-1 ring-red-500/40 bg-white/90 text-red-600"
                    style={{ opacity: opacityNo }}
                  >
                    NO
                  </span>
                </div>

                {/* Info */}
                <div className="p-4 space-y-2">
                  <h2 className="text-lg font-bold">{card.title}</h2>
                  <p className="text-sm text-neutral-600">{card.description}</p>

                  <div className="flex items-center gap-2 mt-2">
                    <img
                      src={card.owner.avatar}
                      alt={card.owner.name}
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-black/5"
                    />
                    <span className="text-xs">{card.owner.name}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Botones (fallback desktop) */}
            <div className="mt-4 flex gap-2">
              <button
                onClick={onReject}
                className="flex-1 rounded-xl bg-neutral-200 px-4 py-2 font-semibold hover:bg-neutral-300"
              >
                No
              </button>
              <button
                onClick={onMatch}
                className="flex-1 rounded-xl bg-blue-600 text-white px-4 py-2 font-semibold hover:bg-blue-700"
              >
                Match
              </button>
            </div>

            {/* Pista de uso */}
            <p className="text-[11px] text-neutral-500 mt-2 text-center">
              Desliza a la derecha para hacer match, a la izquierda para rechazar (teclas → / ← también).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
