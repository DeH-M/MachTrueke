import useAuth from "../store/authStore";

export default function Home() {
  // Aquí podrías traer productos desde backend o mock
  const product = {
    id: "p1",
    title: "Disco Duro",
    description: "Disco de 500 GB",
    image:
      "https://images.unsplash.com/photo-1588345921523-c2dcdb7f1dcd?q=80&w=600&auto=format&fit=crop",
    owner: {
      name: "Luis",
      avatar: "https://i.pravatar.cc/100?img=12",
    },
  };

  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-[#f5f2e9] flex items-center justify-center px-4">
      <div className="bg-white rounded-2xl shadow-lg max-w-md w-full p-4 flex flex-col">
        {/* Imagen del producto */}
        <div className="w-full aspect-square overflow-hidden rounded-xl">
          <img
            src={product.image}
            alt={product.title}
            className="h-full w-full object-cover"
          />
        </div>

        {/* Info producto */}
        <div className="flex items-center gap-3 mt-4">
          <img
            src={product.owner.avatar}
            alt={product.owner.name}
            className="h-10 w-10 rounded-full object-cover border"
          />
          <div>
            <h2 className="text-lg font-bold">{product.title}</h2>
            <p className="text-sm text-neutral-600">{product.description}</p>
          </div>
        </div>

        {/* Botones de acción (modo escritorio) */}
        <div className="flex justify-around mt-6">
          <button className="h-12 w-12 rounded-full bg-red-500 text-white text-xl shadow hover:bg-red-600">
            ✕
          </button>
          <button className="h-12 w-12 rounded-full bg-green-500 text-white text-xl shadow hover:bg-green-600">
            ✓
          </button>
        </div>

        {/* Info extra: usuario logeado */}
        <p className="text-xs text-neutral-500 text-center mt-4">
          Estás logeado como <span className="font-semibold">{user?.email}</span>
        </p>
      </div>
    </div>
  );
}
