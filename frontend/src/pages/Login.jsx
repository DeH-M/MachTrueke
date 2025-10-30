// frontend/src/pages/Login.jsx
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import useAuth from "../store/authStore";
import { authApi } from "../services/authApi";

export default function Login() {
  const navigate = useNavigate();
  const { login, loginWithToken } = useAuth(); // ⬅️ tomamos loginWithToken si existe
  const [form, setForm] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState("");

  const onChange = (e) =>
    setForm((f) => ({ ...f, [e.target.name]: e.target.value }));

  const onSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg("");
    setLoading(true);
    try {
      // Backend espera OAuth2PasswordRequestForm → ya lo maneja authApi.login
      const { access_token, user } = await authApi.login({
        email: form.email,
        password: form.password,
      });

      if (!access_token) {
        throw new Error("Login sin token. Revisa el backend.");
      }

      // 🔑 Preferencia: hidratar con el método del store (si existe)
      if (typeof loginWithToken === "function") {
        await loginWithToken(access_token);
      } else {
        // Fallback seguro si tu store aún no expone loginWithToken
        localStorage.setItem("token", access_token);
        try {
          const me = await authApi.me();
          login(me || user || null);
        } catch {
          // si /auth/me falla, al menos entra con lo que regresa /login
          login(user || null);
        }
      }

      // Redirige donde prefieras (perfil suele ser lo esperado al iniciar)
      navigate("/profile", { replace: true });
    } catch (err) {
      setErrorMsg(err?.message || "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-white rounded-2xl shadow p-6 md:p-8">
      <h1 className="text-center text-2xl font-bold mb-6">
        Inicia sesión <span className="text-blue-600">MACHTRUEKE</span>
      </h1>

      <form onSubmit={onSubmit} className="space-y-4">
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

        <div className="space-y-2">
          <label htmlFor="password" className="block text-sm font-medium">
            Contraseña
          </label>
          <div className="relative">
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="••••••••"
              autoComplete="current-password"
              className="w-full rounded-xl border border-neutral-300 px-3 py-2 pr-12 outline-none focus:ring-2 focus:ring-blue-500"
              value={form.password}
              onChange={onChange}
              required
            />
            <button
              type="button"
              className="absolute right-2 top-1/2 -translate-y-1/2 text-sm text-blue-600 hover:underline"
              onClick={() => setShowPassword((s) => !s)}
            >
              {showPassword ? "Ocultar" : "Ver"}
            </button>
          </div>
        </div>

        {errorMsg && <p className="text-sm text-red-600">{errorMsg}</p>}

        <button
          type="submit"
          disabled={loading}
          className="w-full rounded-xl bg-blue-600 text-white py-2 font-semibold disabled:opacity-60"
        >
          {loading ? "Entrando..." : "IR"}
        </button>
      </form>

      <p className="text-center text-sm mt-4">
        ¿No tienes cuenta?{" "}
        <Link to="/signup" className="text-blue-600 underline">
          Crea una aquí
        </Link>
      </p>
    </div>
  );
}
