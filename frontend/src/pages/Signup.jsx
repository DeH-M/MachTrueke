import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../store/authStore";

export default function Signup() {
  const navigate = useNavigate();
  const { login } = useAuth();

  const [form, setForm] = useState({
    username: "",
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
    if (!form.email.trim()) return "El correo es obligatorio.";
    if (form.password.length < 6)
      return "La contraseña debe tener al menos 6 caracteres.";
    if (form.password !== form.confirm)
      return "Las contraseñas no coinciden.";
    return "";
  };

  const onSubmit = async (e) => {
    e.preventDefault();
    const msg = validate();
    if (msg) {
      setErrorMsg(msg);
      return;
    }
    setLoading(true);
    setErrorMsg("");
    try {
      // TODO: llamar a tu backend FastAPI para crear cuenta
      // Simulación de éxito:
      await new Promise((r) => setTimeout(r, 600));
      login({ email: form.email, username: form.username });
      navigate("/", { replace: true });
    } catch (err) {
      setErrorMsg("Error al crear la cuenta.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8">
      {/* Encabezado */}
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

        {/* Contraseña */}
        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Contraseña
          </label>
          <input
            id="password"
            name="password"
            type="password"
            placeholder="Contraseña"
            autoComplete="new-password"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={form.password}
            onChange={onChange}
            required
          />
        </div>

        {/* Confirmar contraseña */}
        <div className="space-y-2">
          <label htmlFor="confirm" className="block text-sm font-medium">
            Confirmar contraseña
          </label>
          <input
            id="confirm"
            name="confirm"
            type="password"
            placeholder="Confirma contraseña"
            autoComplete="new-password"
            className="w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500"
            value={form.confirm}
            onChange={onChange}
            required
          />
        </div>

        {/* Error */}
        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        {/* Botón */}
        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 text-white py-2 font-semibold disabled:opacity-60"
        >
          {loading ? "Creando..." : "Crear"}
        </button>
      </form>

      {/* Link a Login */}
      <p className="text-center text-sm mt-4">
        ¿Ya tienes cuenta?{" "}
        <Link to="/login" className="text-blue-600 underline">
          Inicia sesión aquí
        </Link>
      </p>
    </div>
  );
}
