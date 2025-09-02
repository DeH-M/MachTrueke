import { useMemo, useState } from "react";
import { useSwipeable } from "react-swipeable";
import useAuth from "../store/authStore";

/** Productos mock para probar el flujo de match */
const seed = [
  {
    id: "p1",
    title: "Disco Duro",
    description: "Disco de 500 GB",
    image:
      "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=1200&auto=format&fit=crop",
    owner: { name: "Luis", avatar: "https://i.pravatar.cc/100?img=12" },
  },
  {
    id: "p2",
    title: "Calculadora Científica",
    description: "Casio FX-991EX, poco uso",
    image:
      "https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?q=80&w=1200&auto=format&fit=crop",
    owner: { name: "Ana", avatar: "https://i.pravatar.cc/100?img=5" },
  },
  {
    id: "p3",
    title: "Libro Álgebra Lineal",
    description: "Como nuevo, pocas anotaciones",
    image:
      "https://images.unsplash.com/photo-1526318472351-c75fcf070305?q=80&w=1200&auto=format&fit=crop",
    owner: { name: "Mario", avatar: "https://i.pravatar.cc/100?img=25" },
  },
];

export default function Home() {
  const { user } = useAuth();
  const [index, setIndex] = useState(0);
  const [dx, setDx] = useState(0); // desplazamiento para animación
  const [deciding, setDeciding] = useState(null); // "like" | "nope" | null

  const items = useMemo(() => seed, []);
  const item = items[index];

  const decide = (type) => {
    // aquí puedes llamar a tu backend: /match/like o /match/nope
    // console.log(type, item?.id);
    setDeciding(type);
    // animación corta y pasar al siguiente
    setTimeout(() => {
      setDx(0);
      setDeciding(null);
      setIndex((i) => (i + 1) % items.length);
    }, 220);
  };

  const handlers = useSwipeable({
    onSwiping: (e) => setDx(e.deltaX), // arrastrando
    onSwipedLeft: () => decide("nope"),
    onSwipedRight: () => decide("like"),
    trackMouse: true, // permite drag con mouse también
    preventScrollOnSwipe: true,
  });

  if (!item) return null;

  // estilo de la tarjeta al arrastrar: translate + rotate suave
  const dragStyle = {
    transform: `translateX(${dx}px) rotate(${dx * 0.04}deg)`,
    transition: deciding ? "transform 0.2s ease" : "transform 0s",
  };

  return (
    <div className="min-h-screen bg-[#f5f2e9] flex items-center justify-center px-4">
      <div className="relative w-full max-w-md">
        {/* Tarjeta del producto */}
        <div
          {...handlers}
          style={dragStyle}
          className="select-none bg-white rounded-2xl shadow-lg p-4"
        >
          {/* Imagen del producto */}
          <div className="w-full aspect-square overflow-hidden rounded-xl">
            <img
              src={item.image}
              alt={item.title}
              className="h-full w-full object-cover"
              draggable={false}
            />
          </div>

          {/* Info producto */}
          <div className="flex items-center gap-3 mt-4">
            <img
              src={item.owner.avatar}
              alt={item.owner.name}
              className="h-10 w-10 rounded-full object-cover border"
            />
            <div>
              <h2 className="text-lg font-bold">{item.title}</h2>
              <p className="text-sm text-neutral-600">{item.description}</p>
            </div>
          </div>

          {/* Hints de swipe para móvil */}
          <div className="mt-3 flex justify-between md:hidden">
            <span className="text-xs text-neutral-500">Desliza ← para rechazar</span>
            <span className="text-xs text-neutral-500">Desliza → para aceptar</span>
          </div>

          {/* Badges durante la decisión */}
          {deciding === "like" && (
            <span className="absolute top-4 right-4 rounded-full bg-green-500 text-white text-xs px-2 py-1 shadow">
              ✓ Aceptado
            </span>
          )}
          {deciding === "nope" && (
            <span className="absolute top-4 left-4 rounded-full bg-red-500 text-white text-xs px-2 py-1 shadow">
              ✕ Rechazado
            </span>
          )}
        </div>

        {/* Botones (solo escritorio/tablet) */}
        <div className="hidden md:flex justify-center gap-6 mt-6">
          <button
            onClick={() => decide("nope")}
            className="h-12 w-12 rounded-full bg-red-500 text-white text-xl shadow hover:bg-red-600 focus:outline-none"
            aria-label="Rechazar"
            title="Rechazar"
          >
            ✕
          </button>
          <button
            onClick={() => decide("like")}
            className="h-12 w-12 rounded-full bg-green-500 text-white text-xl shadow hover:bg-green-600 focus:outline-none"
            aria-label="Aceptar"
            title="Aceptar"
          >
            ✓
          </button>
        </div>

        {/* Info extra */}
        <p className="text-xs text-neutral-500 text-center mt-4">
          Sesión: <span className="font-medium">{user?.email ?? "demo"}</span>
        </p>
      </div>
    </div>
  );
}
