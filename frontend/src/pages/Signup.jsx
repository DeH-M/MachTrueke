import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../store/authStore";
import { CAMPUSES } from "../constants/campuses";
// Cuando conectes backend, descomenta y usa authApi:
// import { authApi } from "../services/authApi";

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
    fullName: "",
    campus: "",
    email: "",
    password: "",
    confirm: "",
  });

  const [errorMsg, setErrorMsg] = useState("");
  const [loading, setLoading] = useState(false);

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const validate = () => {
    if (!form.username.trim()) return "El nombre de usuario es obligatorio.";
    if (!form.fullName.trim()) return "El nombre completo es obligatorio.";
    if (!form.campus) return "Selecciona un campus.";
    if (!form.email.trim()) return "El correo es obligatorio.";
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email))
      return "Correo inválido.";
    if (form.password.length < 8)
      return "La contraseña debe tener al menos 8 caracteres.";
    if (form.password !== form.confirm)
      return "Las contraseñas no coinciden.";
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) return setErrorMsg(msg);
    setLoading(true);
    setErrorMsg("");

    try {
      // 👉 Cuando conectes backend, usa esto:
      /*
      const { access_token, user } = await authApi.signup({
        username: form.username,
        full_name: form.fullName,
        campus: form.campus, // id del campus (ej. "CUCEI")
        email: form.email,
        password: form.password,
      });
      localStorage.setItem("token", access_token);
      login(user);
      */

      // 🔹 MOCK mientras no hay backend:
      const mockUser = {
        id: crypto.randomUUID(),
        username: form.username,
        name: form.fullName,
        campus: form.campus,
        email: form.email,
        avatar: "https://i.pravatar.cc/100?img=13",
      };
      localStorage.setItem("token", "mock-token");
      login(mockUser);

      navigate("/", { replace: true });
    } catch (err) {
      setErrorMsg(err.message || "Ocurrió un error al registrarte.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8">
      <h1 className="text-center text-2xl font-bold mb-6">
        Crea tu cuenta <span className="text-blue-600">MACHTRUEKE</span>
      </h1>

      <form onSubmit={onSubmit} className="space-y-4">
        {/* Nombre de usuario */}
        <div className="space-y-2">
          <label htmlFor="username" className="block text-sm font-medium">
            Nombre de usuario
          </label>
          <input
            id="username"
            name="username"
            type="text"
            placeholder="Nombre de usuario"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={form.username}
            onChange={onChange}
            required
          />
        </div>

        {/* Nombre completo */}
        <div className="space-y-2">
          <label htmlFor="fullName" className="block text-sm font-medium">
            Nombre completo
          </label>
          <input
            id="fullName"
            name="fullName"
            type="text"
            placeholder="Tu nombre y apellidos"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={form.fullName}
            onChange={onChange}
            required
          />
        </div>

        {/* Campus */}
        <div className="space-y-2">
          <label htmlFor="campus" className="block text-sm font-medium">
            Campus
          </label>
          <select
            id="campus"
            name="campus"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white"
            value={form.campus}
            onChange={onChange}
            required
          >
            <option value="">Selecciona tu campus</option>
            {CAMPUSES.map((c) => (
              <option key={c.id} value={c.id}>
                {c.label}
              </option>
            ))}
          </select>
        </div>

        {/* Correo */}
        <div className="space-y-2">
          <label htmlFor="email" className="block text-sm font-medium">
            Correo electrónico
          </label>
          <input
            id="email"
            name="email"
            type="email"
            placeholder="tucorreo@alumnos.udg.mx"
            autoComplete="email"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={form.email}
            onChange={onChange}
            required
          />
        </div>

        {/* Contraseñas */}
        <div className="grid md:grid-cols-2 gap-3">
          <div className="space-y-2">
            <label htmlFor="password" className="block text-sm font-medium">
              Contraseña
            </label>
            <input
              id="password"
              name="password"
              type="password"
              placeholder="•••••••• (mín. 8)"
              autoComplete="new-password"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={form.password}
              onChange={onChange}
              required
            />
          </div>
          <div className="space-y-2">
            <label htmlFor="confirm" className="block text-sm font-medium">
              Confirmar contraseña
            </label>
            <input
              id="confirm"
              name="confirm"
              type="password"
              placeholder="Repite la contraseña"
              autoComplete="new-password"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
              value={form.confirm}
              onChange={onChange}
              required
            />
          </div>
        </div>

        {/* Error */}
        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        {/* Botón */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 text-white py-2 font-semibold disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear cuenta"}
        </button>
      </form>

      <p className="text-center text-sm mt-4">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="text-blue-600 underline">
          Inicia sesión aquí
        </Link>
      </p>
    </div>
  );
}
