// src/pages/Home.jsx
import { useEffect, useMemo, useState } from "react";
import { useSwipeable } from "react-swipeable";
import { useLikes } from "../store/likesStore";
import { likesApi } from "../services/likesApi";
import { productsApi } from "../services/productsApi";
import useAuth from "../store/authStore"; // ✅ para conocer mi user.id

// Fallback estable para desarrollo
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// helper para URLs relativas del backend
const absUrl = (p) => {
  if (!p) return "";
  if (/^https?:\/\//i.test(p) || p.startsWith("blob:")) return p;
  return `${API_URL}${p.startsWith("/") ? "" : "/"}${p}`;
};

/* -------- helper: normaliza ProductRead del backend a la UI de esta tarjeta -------- */
function toCard(p) {
  const imageUrls = Array.isArray(p.images)
    ? p.images
        .map((img) => (typeof img === "string" ? img : img?.url))
        .filter(Boolean)
    : [];

  return {
    id: String(p.id),
    title: p.title ?? "",
    description: p.description ?? "",
    images: imageUrls,
    owner: p.owner ?? null,
    owner_id: p.owner_id ?? null, // ✅ lo guardamos para poder filtrar “mis” productos
  };
}

export default function Home() {
  const { user } = useAuth(); // ✅ necesito user?.id para ocultar mis productos
  const [queue, setQueue] = useState([]); // cola de productos para swipe
  const [idx, setIdx] = useState(0);
  const card = queue[idx];

  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);

  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");

  const [likedIds, setLikedIds] = useState([]); // ✅ ids ya likeados
  const { addLocalMatch } = useLikes();
  const THRESHOLD = 100;

  /* -------------------- Carga inicial desde backend -------------------- */
  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        setLoading(true);
        setErrMsg("");

        // Traemos en paralelo productos e ids likeados
        const [{ items }, idsResp] = await Promise.all([
          productsApi.listPublic({ page: 1, limit: 50 }),
          likesApi.myLikedIds().catch(() => ({ product_ids: [] })), // si falla, continúa
        ]);

        const cards = (items || []).map(toCard);
        const ids = idsResp?.product_ids || [];

        if (!alive) return;

        // ✅ Filtro 1: quita mis productos (usa owner_id o, si no viene, owner.id)
        const notMine = user?.id
          ? cards.filter(
              (c) => String(c.owner_id ?? c.owner?.id ?? "") !== String(user.id)
            )
          : cards;

        // ✅ Filtro 2: quita los ya likeados
        const notLiked = ids.length
          ? notMine.filter((c) => !ids.includes(Number(c.id)))
          : notMine;

        setLikedIds(ids);
        setQueue(notLiked);
        setIdx(0);
      } catch (e) {
        console.error(e);
        if (alive) setErrMsg("No se pudieron cargar los productos.");
      } finally {
        if (alive) setLoading(false);
      }
    })();

    return () => {
      alive = false;
    };
  }, [user?.id]);

  /* -------------------- navegación/animación -------------------- */
  const resetDrag = () => setDragX(0);

  const goNext = () => {
    setIsAnimating(false);
    setDragX(0);
    setIdx((i) => Math.min(i + 1, queue.length));
  };

  const onReject = () => {
    if (!card) return;
    setIsAnimating(true);
    setDragX(-window.innerWidth);
    setTimeout(goNext, 200);
  };

  const onMatch = async () => {
    if (!card) return;

    // 🔒 Seguridad extra en UI: si por cualquier razón el mío pasó el filtro, NO hago match
    if (user?.id && String(card.owner_id ?? card.owner?.id ?? "") === String(user.id)) {
      onReject();
      return;
    }

    try {
      // ✅ aseguro number para el backend
      const created = await likesApi.create(Number(card.id));

      // ✅ actualizo ids likeados locales para que ya no reaparezca
      setLikedIds((prev) => (prev.includes(Number(card.id)) ? prev : [...prev, Number(card.id)]));

      // ✅ refresco store local (para la vista de Likes)
      addLocalMatch({
        id: created.id || crypto.randomUUID(),
        product: { id: card.id, title: card.title, cover: card.images?.[0] },
        owner: card.owner || null,
        note: created.note || "Match",
        created_at: created.created_at || new Date().toISOString(),
      });

      setIsAnimating(true);
      setDragX(window.innerWidth);
      setTimeout(goNext, 200);
    } catch (e) {
      console.error(e);
      alert(e?.message || "No se pudo crear el match");
      setIsAnimating(false);
      resetDrag();
    }
  };

  /* -------------------- Swipe handlers -------------------- */
  const handlers = useSwipeable({
    onSwiping: (e) => {
      if (isAnimating) return;
      setDragX(e.deltaX);
    },
    onSwiped: (e) => {
      if (isAnimating) return;
      const dx = e.deltaX;
      if (dx > THRESHOLD) onMatch();
      else if (dx < -THRESHOLD) onReject();
      else resetDrag();
    },
    trackMouse: true,
    preventScrollOnSwipe: true,
  });

  /* -------------------- Atajos de teclado -------------------- */
  useEffect(() => {
    const onKey = (ev) => {
      if (!card) return;
      if (ev.key === "ArrowLeft") onReject();
      if (ev.key === "ArrowRight") onMatch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  /* -------------------- Estilos derivados del arrastre -------------------- */
  const rotate = dragX / 20;
  const opacityYes = Math.min(Math.max(dragX / 120, 0), 1);
  const opacityNo = Math.min(Math.max(-dragX / 120, 0), 1);
  const translate = `translateX(${dragX}px) rotate(${rotate}deg)`;

  return (
    <div className="min-h-[calc(100vh-56px)] bg-[#f5f2e9] px-4 py-6">
      <div className="mx-auto w-full max-w-6xl flex flex-col items-center">
        {loading ? (
          <p className="text-sm text-neutral-600">Cargando…</p>
        ) : errMsg ? (
          <p className="text-sm text-red-600">{errMsg}</p>
        ) : !card ? (
          <p className="text-sm text-neutral-600">No hay más productos por ahora.</p>
        ) : (
          <div className="w-full max-w-md">
            {/* Tarjeta con swipe */}
            <div
              {...handlers}
              className="relative select-none will-change-transform"
              style={{ transform: translate, transition: isAnimating ? "transform 200ms ease" : "none" }}
            >
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                {/* Imagen */}
                <div className="relative aspect-square bg-neutral-100">
                  <img
                    src={absUrl(card.images?.[0])}
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

                  {/* Sección owner (opcional) */}
                  {card.owner && (
                    <div className="flex items-center gap-2 mt-2">
                      <img
                        src={absUrl(card.owner.avatar)}
                        alt={card.owner.name}
                        className="h-7 w-7 rounded-full object-cover ring-1 ring-black/5"
                      />
                      <span className="text-xs">{card.owner.name}</span>
                    </div>
                  )}
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

            <p className="text-[11px] text-neutral-500 mt-2 text-center">
              Desliza a la derecha para hacer match, a la izquierda para rechazar (teclas → / ← también).
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
