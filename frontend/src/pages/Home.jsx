import { useEffect, useRef, useState } from "react";
import { useSwipeable } from "react-swipeable";

import useAuth from "../store/authStore";
import { likesApi } from "../services/likesApi";
import { productsApi } from "../services/productsApi";
import { recsApi } from "../services/recsApi";
import { eventsApi } from "../services/eventsApi";

// =====================================
// CONFIG
// =====================================
const API_URL = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000";

// --- utilidades de imagen / URL
const absUrl = (p) => {
  if (!p) return null;
  if (/^https?:\/\//i.test(p) || p.startsWith("blob:")) return p;
  return `${API_URL}${p.startsWith("/") ? "" : "/"}${p}`;
};

// --- util para guardar IDs ocultos localmente
const HIDDEN_KEY = "mt_hidden_ids_v1";
function loadHidden() {
  try {
    return new Set(JSON.parse(localStorage.getItem(HIDDEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}
function saveHidden(set) {
  localStorage.setItem(HIDDEN_KEY, JSON.stringify([...set]));
}

// =====================================
// helpers
// =====================================
function toCard(p) {
  // Acepta p.images, p.product_images o p.image_url (cualquiera que venga)
  const raw =
    (Array.isArray(p.images) && p.images) ||
    (Array.isArray(p.product_images) && p.product_images) ||
    (p.image_url ? [p.image_url] : []);

  const imageUrls = (raw || [])
    .map((img) => (typeof img === "string" ? img : img?.url))
    .filter(Boolean);

  return {
    id: String(p.id),
    title: p.title ?? "",
    description: p.description ?? "",
    images: imageUrls,         // << aquí ya garantizamos strings tipo "/media/..."
    owner: p.owner ?? null,
    owner_id: p.owner_id ?? null,
    sim_score: typeof p.sim_score === "number" ? p.sim_score : undefined,
  };
}

/*
function toCard(p) {
  const imageUrls = Array.isArray(p.images)
    ? p.images.map((img) => (typeof img === "string" ? img : img?.url)).filter(Boolean)
    : [];

  return {
    id: String(p.id),
    title: p.title ?? "",
    description: p.description ?? "",
    images: imageUrls,
    owner: p.owner ?? null,
    owner_id: p.owner_id ?? null,
    sim_score: typeof p.sim_score === "number" ? p.sim_score : undefined,
  };
}*/

// =====================================
// COMPONENTE PRINCIPAL
// =====================================
export default function Home() {
  const { user } = useAuth();

  const [queue, setQueue] = useState([]);
  const [idx, setIdx] = useState(0);
  const card = queue[idx];

  const [dragX, setDragX] = useState(0);
  const [isAnimating, setIsAnimating] = useState(false);
  const [loading, setLoading] = useState(true);
  const [errMsg, setErrMsg] = useState("");
  const [likedIds, setLikedIds] = useState([]);
  const [hiddenIds, setHiddenIds] = useState(loadHidden());
  const THRESHOLD = 100;

  const viewedRef = useRef(new Set());
  const observerRef = useRef(null);

  // =====================================
  // CARGA INICIAL
  // =====================================
  useEffect(() => {
    let alive = true;

    (async () => {
      try {
        setLoading(true);
        setErrMsg("");

        // 1) IA personalizada (excluye like/dismiss/match automáticamente)
        const recs = await recsApi.home({ exclude: "ldm" }).catch(() => ({ items: [] }));
        let items = (recs?.items || []).map(toCard);

        // 2) fallback si IA vacía
        if (!items.length) {
          const { items: raw } = await productsApi
            .listPublic({ page: 1, limit: 50 })
            .catch(() => ({ items: [] }));
          items = (raw || []).map(toCard);
        }

        // 3) traer ids likeados del backend
        const idsResp = await likesApi.myLikedIds().catch(() => ({ product_ids: [] }));
        const liked = idsResp?.product_ids || [];

        if (!alive) return;

        // 4) filtros combinados
        const notMine = user?.id
          ? items.filter(
              (c) => String(c.owner_id ?? c.owner?.id ?? "") !== String(user.id)
            )
          : items;

        const notLiked = liked.length
          ? notMine.filter((c) => !liked.includes(Number(c.id)))
          : notMine;

        const notHidden = notLiked.filter((c) => !hiddenIds.has(Number(c.id)));

        setLikedIds(liked);
        setQueue(notHidden);
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
  }, [user?.id, hiddenIds]);

  // =====================================
  // OBSERVER para registrar 'view'
  // =====================================
  useEffect(() => {
    if (!queue.length) return;

    if (observerRef.current) {
      observerRef.current.disconnect();
      observerRef.current = null;
    }

    const io = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (!e.isIntersecting) return;
          const pid = Number(e.target.getAttribute("data-id"));
          if (!pid || viewedRef.current.has(pid)) return;
          viewedRef.current.add(pid);
          eventsApi.send(pid, "view").catch(() => {});
        });
      },
      { root: null, rootMargin: "0px", threshold: 0.5 }
    );

    observerRef.current = io;
    const nodes = document.querySelectorAll("[data-card=product]");
    nodes.forEach((n) => io.observe(n));

    return () => {
      io.disconnect();
      observerRef.current = null;
    };
  }, [queue, idx]);

  // =====================================
  // Swipe / navegación
  // =====================================
  const resetDrag = () => setDragX(0);
  const goNext = () => {
    setIsAnimating(false);
    setDragX(0);
    setIdx((i) => Math.min(i + 1, queue.length));
  };

  const addHidden = (idNum) => {
    const nextHidden = new Set(hiddenIds);
    nextHidden.add(idNum);
    setHiddenIds(nextHidden);
    saveHidden(nextHidden);
  };

  const onReject = async () => {
    if (!card) return;
    const idNum = Number(card.id);

    eventsApi.send(idNum, "dismiss").catch(() => {});
    addHidden(idNum);

    setIsAnimating(true);
    setDragX(-window.innerWidth);
    setTimeout(goNext, 200);
  };

  const onMatch = async () => {
    if (!card) return;

    if (user?.id && String(card.owner_id ?? card.owner?.id ?? "") === String(user.id)) {
      onReject();
      return;
    }

    const idNum = Number(card.id);
    try {
      eventsApi.send(idNum, "like").catch(() => {});
      await likesApi.create(idNum).catch(() => null);

      addHidden(idNum);
      setLikedIds((prev) => (prev.includes(idNum) ? prev : [...prev, idNum]));

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

  // =====================================
  // SWIPEABLE + teclas
  // =====================================
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

  useEffect(() => {
    const onKey = (ev) => {
      if (!card) return;
      if (ev.key === "ArrowLeft") onReject();
      if (ev.key === "ArrowRight") onMatch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [card]);

  // =====================================
  // render
  // =====================================
  const rotate = dragX / 20;
  const opacityYes = Math.min(Math.max(dragX / 120, 0), 1);
  const opacityNo = Math.min(Math.max(-dragX / 120, 0), 1);
  const translate = `translateX(${dragX}px) rotate(${rotate}deg)`;

  // URL segura de la primera imagen (si no hay, queda null)
const rawFirst = card?.images?.[0];
const firstImgSrc = absUrl(typeof rawFirst === "string" ? rawFirst : rawFirst?.url);

// Si la URL que vino desde /api/recs/home falla, refrescamos desde /api/products/:id
async function fixImageFromProduct(pid) {
  try {
    const detail = await productsApi.getOne(pid); // o productsApi.getById(pid) según tu servicio
    const imgs = Array.isArray(detail?.images)
      ? detail.images
          .map((img) => (typeof img === "string" ? img : img?.url))
          .filter(Boolean)
      : [];

    if (imgs.length) {
      setQueue((q) => {
        const copy = [...q];
        const i = copy.findIndex((c) => String(c.id) === String(pid));
        if (i >= 0) copy[i] = { ...copy[i], images: imgs };
        return copy;
      });
    }
  } catch {
    // opcional: pon un placeholder si también falla
  }
}


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
            <div
              {...handlers}
              className="relative select-none will-change-transform"
              data-card="product"
              data-id={card.id}
              style={{
                transform: translate,
                transition: isAnimating ? "transform 200ms ease" : "none",
              }}
            >
              <div className="bg-white rounded-2xl shadow overflow-hidden">
                <div className="relative aspect-square bg-neutral-100">
                  <img
                    src={absUrl(typeof card.images?.[0] === "string" ? card.images?.[0] : card.images?.[0]?.url) || undefined}
                    alt={card.title}
                    className="w-full h-full object-cover"
                    draggable={false}
                    loading="lazy"
                    onError={(e) => {
                      // Evita loops y pide la imagen buena desde /api/products/:id
                      e.currentTarget.removeAttribute("src");
                      e.currentTarget.style.display = "none"; // oculta el ícono roto
                      fixImageFromProduct(card.id);
                    }}
                  />
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

                <div className="p-4 space-y-2">
                  <h2 className="text-lg font-bold">{card.title}</h2>
                  <p className="text-sm text-neutral-600">{card.description}</p>
                  {typeof card.sim_score === "number" && (
                    <div className="text-[11px] text-neutral-500">
                      score: {card.sim_score.toFixed(3)}
                    </div>
                  )}
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

            {/* Botón de depuración opcional */}
            <button
              onClick={() => {
                const s = new Set();
                setHiddenIds(s);
                saveHidden(s);
              }}
              className="mt-3 text-[11px] underline text-neutral-400"
            >
              Limpiar ocultos (debug)
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
