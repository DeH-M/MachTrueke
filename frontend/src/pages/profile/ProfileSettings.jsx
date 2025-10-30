// src/pages/profile/ProfileSettings.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom"; // ✅ agregado
import useAuth from "../../store/authStore";
import { authApi } from "../../services/authApi";
import { CAMPUSES as CAMPUSES_FALLBACK } from "../../constants/campuses";

export default function ProfileSettings() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate(); // ✅ agregado

  // Detectar móvil (para botón de cámara en móviles)
  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  // Lista de campus (trae del backend; si falla, usa constantes locales)
  const [campuses, setCampuses] = useState(CAMPUSES_FALLBACK);
  useEffect(() => {
    (async () => {
      try {
        const rows = await authApi.listCampuses();
        if (Array.isArray(rows) && rows.length) {
          setCampuses(rows.map((r) => ({ id: r.id, label: `${r.code}: ${r.name}` })));
        }
      } catch {
        // fallback ya está cargado
      }
    })();
  }, []);

  // Perfil (inicializa con el usuario real)
  const [profile, setProfile] = useState({
    username: user?.username || "",
    fullName: user?.full_name || "",
    campus: user?.campus_id ?? "",
    bio: user?.bio ?? "",
    email: user?.email || "",
    avatar: user?.avatar_url || "",
  });

  useEffect(() => {
    // si cambia el user en memoria, rehidratar
    setProfile((p) => ({
      ...p,
      username: user?.username || "",
      fullName: user?.full_name || "",
      campus: user?.campus_id ?? "",
      bio: user?.bio ?? "",
      email: user?.email || "",
      avatar: user?.avatar_url || "",
    }));
  }, [user]);

  // Contraseña
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  // Estado UI
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Refs de archivos
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const onChangeProfile = (e) =>
    setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onChangePwd = (e) =>
    setPwd((p) => ({ ...p, [e.target.name]: e.target.value }));

  const triggerPickPhoto = () => fileInputRef.current?.click();

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Preview inmediata
    const url = URL.createObjectURL(file);
    setProfile((p) => ({ ...p, avatar: url }));

    setUploadingAvatar(true);
    try {
      await authApi.uploadAvatar(file);
      // refrescar /auth/me para tener la URL definitiva servida por el backend
      const fresh = await authApi.me();
      login(fresh);
    } catch (err) {
      alert(getErrText(err, "No se pudo subir la imagen"));
    } finally {
      setUploadingAvatar(false);
      // 🔸 liberar la URL temporal (evita memory leaks)
      try { URL.revokeObjectURL(url); } catch {}
    }
  };

  // Guardar perfil (username, bio, campus)
  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await authApi.updateMe({
        username: profile.username?.trim(),
        bio: profile.bio ?? null,
        campus_id: profile.campus === "" ? null : Number(profile.campus),
        // avatar_url no se envía aquí; el archivo se sube en su endpoint dedicado
      });
      // refrescar store con el user actualizado
      login(updated);
      alert("Perfil actualizado");
    } catch (err) {
      alert(getErrText(err, "No se pudo actualizar el perfil"));
    } finally {
      setSavingProfile(false);
    }
  };

  const savePwd = async (e) => {
    e.preventDefault();
    if (!pwd.current || !pwd.next) return alert("Completa los campos de contraseña.");
    if (pwd.next.length < 8) return alert("La nueva contraseña debe tener al menos 8 caracteres.");
    if (pwd.next !== pwd.confirm) return alert("La confirmación no coincide.");

    setSavingPwd(true);
    try {
      await authApi.changePassword({
        old_password: pwd.current,
        new_password: pwd.next,
        confirm_password: pwd.confirm,
      });
      alert("Contraseña actualizada");
      setPwd({ current: "", next: "", confirm: "" });
    } catch (err) {
      alert(getErrText(err, "No se pudo cambiar la contraseña"));
    } finally {
      setSavingPwd(false);
    }
  };

  const deleteAccount = async () => {
    if (!confirm("¿Seguro que deseas eliminar tu cuenta? Esta acción es irreversible.")) return;
    try {
      await authApi.deleteMe();
      localStorage.removeItem("token");
      logout();
      alert("Cuenta eliminada");
      navigate("/", { replace: true }); // ✅ agregado
    } catch (err) {
      alert(getErrText(err, "No se pudo eliminar la cuenta"));
    }
  };

  // clases base
  const card = "relative rounded-2xl border border-neutral-300/70 bg-transparent p-4 md:p-5";
  const label = "block text-xs mb-1 text-neutral-700";
  const input =
    "w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  // 🔸 Protección suave si aún no hay user (evita parpadeos)
  const disabledAll = !user;

  return (
    <div className="space-y-5">
      {/* ===== Perfil ===== */}
      <section className={card}>
        <h3 className="font-semibold mb-3">Perfil</h3>

        <form onSubmit={saveProfile} className="space-y-3 pb-16">
          <div className="grid md:grid-cols-3 gap-3">
            {/* Cols 1-2 */}
            <div className="md:col-span-2 space-y-3">
              {/* Nombre completo (solo lectura) */}
              <div>
                <label className={label}>Nombre completo</label>
                <input
                  name="fullName"
                  value={profile.fullName}
                  readOnly
                  disabled
                  className={`${input} cursor-not-allowed bg-neutral-100`}
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  Este dato no se puede editar desde aquí.
                </p>
              </div>

              {/* Usuario */}
              <div>
                <label className={label}>Nombre de usuario</label>
                <input
                  name="username"
                  value={profile.username}
                  onChange={onChangeProfile}
                  className={input}
                  disabled={disabledAll}
                />
              </div>

              {/* Campus */}
              <div>
                <label className={label}>Campus</label>
                <select
                  name="campus"
                  value={profile.campus}
                  onChange={onChangeProfile}
                  className={`${input} bg-white`}
                  disabled={disabledAll}
                >
                  <option value="">Selecciona tu campus</option>
                  {campuses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Bio */}
              <div>
                <label className={label}>Descripción</label>
                <textarea
                  name="bio"
                  rows={3}
                  value={profile.bio}
                  onChange={onChangeProfile}
                  className={input}
                  disabled={disabledAll}
                />
              </div>

              {/* Correo (solo lectura) */}
              <div>
                <label className={label}>Correo</label>
                <input
                  type="email"
                  name="email"
                  value={profile.email}
                  readOnly
                  disabled
                  className={`${input} cursor-not-allowed bg-neutral-100`}
                />
                <p className="text-[11px] text-neutral-500 mt-1">
                  El correo no se puede editar desde aquí.
                </p>
              </div>
            </div>

            {/* Col 3: Avatar */}
            <div className="md:col-span-1 space-y-2">
              <label className={label}>Foto de perfil</label>

              {/* Inputs ocultos */}
              <input
                ref={fileInputRef}
                type="file"
                accept="image/*"
                onChange={handleAvatarFile}
                className="hidden"
              />
              <input
                ref={cameraInputRef}
                type="file"
                accept="image/*"
                capture="environment"
                onChange={handleAvatarFile}
                className="hidden"
              />

              <div className="flex items-start gap-3">
                <div className="h-20 w-20 rounded-xl border border-neutral-300 bg-white overflow-hidden shrink-0">
                  {profile.avatar ? (
                    <img src={profile.avatar} alt="avatar" className="w-full h-full object-cover" />
                  ) : (
                    <div className="w-full h-full grid place-items-center text-[10px] text-neutral-400">
                      Sin foto
                    </div>
                  )}
                </div>

                <div className="space-y-2">
                  {isMobile ? (
                    <div className="flex flex-wrap gap-2">
                      <button
                        type="button"
                        onClick={() => cameraInputRef.current?.click()}
                        className="rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-semibold hover:bg-blue-700"
                        disabled={uploadingAvatar || disabledAll}
                      >
                        {uploadingAvatar ? "Subiendo..." : "Tomar foto"}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl bg-neutral-800 text-white px-3 py-2 text-xs font-semibold hover:bg-neutral-700"
                        disabled={uploadingAvatar || disabledAll}
                      >
                        Elegir de galería
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={triggerPickPhoto}
                      className="rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-semibold hover:bg-blue-700"
                      disabled={uploadingAvatar || disabledAll}
                    >
                      {uploadingAvatar ? "Subiendo..." : "Subir imagen"}
                    </button>
                  )}

                  {profile.avatar && (
                    <div>
                      <button
                        type="button"
                        onClick={async () => {
                          // quitar visualmente y borrar en backend
                          setProfile((p) => ({ ...p, avatar: "" }));
                          try {
                            await authApi.deleteAvatar();
                            const fresh = await authApi.me();
                            login(fresh);
                          } catch (err) {
                            alert(getErrText(err, "No se pudo eliminar el avatar"));
                          }
                        }}
                        className="rounded-xl bg-neutral-200 px-3 py-2 text-xs font-semibold hover:bg-neutral-300"
                        disabled={disabledAll}
                      >
                        Quitar
                      </button>
                    </div>
                  )}

                  <p className="text-[11px] text-neutral-500">
                    En móviles puedes tomar foto o elegir de galería. En escritorio se abre el
                    explorador de archivos.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Botón fijo */}
          <div className="absolute right-4 bottom-4">
            <button
              className="rounded-xl bg-blue-600 text-white px-5 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
              disabled={savingProfile || disabledAll}
            >
              {savingProfile ? "Guardando..." : "Guardar"}
            </button>
          </div>
        </form>
      </section>

      {/* ===== Cambiar contraseña ===== */}
      <section className={card}>
        <h3 className="font-semibold mb-3">Cambiar contraseña</h3>

        <form onSubmit={savePwd} className="space-y-3">
          <div className="grid md:grid-cols-3 gap-3">
            <div>
              <input
                type="password"
                name="current"
                placeholder="Contraseña actual"
                value={pwd.current}
                onChange={onChangePwd}
                className={input}
                disabled={disabledAll}
              />
            </div>
            <div>
              <input
                type="password"
                name="next"
                placeholder="Nueva contraseña"
                value={pwd.next}
                onChange={onChangePwd}
                className={input}
                disabled={disabledAll}
              />
            </div>
            <div className="grid grid-cols-[1fr,auto] gap-3 items-end">
              <div>
                <input
                  type="password"
                  name="confirm"
                  placeholder="Confirmar contraseña"
                  value={pwd.confirm}
                  onChange={onChangePwd}
                  className={input}
                  disabled={disabledAll}
                />
              </div>
              <button
                className="rounded-xl bg-blue-600 text-white px-5 py-2 font-semibold hover:bg-blue-700 disabled:opacity-60"
                disabled={savingPwd || disabledAll}
              >
                {savingPwd ? "Guardando..." : "Guardar contraseña"}
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* ===== Notificaciones + Eliminar cuenta ===== */}
      <section className={card}>
        <h3 className="font-semibold mb-3">Notificaciones</h3>

        {/* Este bloque es visual; si luego agregas backend para prefs, reemplaza por llamadas */}
        <DummyNotifications />
        <hr className="my-5 border-neutral-300/70" />

        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-red-600">Eliminar cuenta</p>
            <p className="text-xs text-neutral-600">
              Esta acción es permanente. Se borrarán tus datos y productos.
            </p>
          </div>
          <button
            onClick={deleteAccount}
            className="rounded-xl bg-red-600 text-white px-4 py-2 text-sm font-semibold hover:bg-red-700"
            disabled={disabledAll}
          >
            Eliminar
          </button>
        </div>
      </section>
    </div>
  );
}

function DummyNotifications() {
  const [prefs, setPrefs] = useState({
    notifications: true,
    emailNotifications: false,
  });
  const togglePref = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));
  const label = "text-sm";
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        alert("Preferencias (demo):\n" + JSON.stringify(prefs, null, 2));
      }}
      className="space-y-4"
    >
      <ToggleRow
        label="Notificaciones"
        checked={prefs.notifications}
        onClick={() => togglePref("notifications")}
      />
      <ToggleRow
        label="Notificaciones por correo"
        checked={prefs.emailNotifications}
        onClick={() => togglePref("emailNotifications")}
      />
      <div className="flex justify-end">
        <button className="rounded-xl bg-blue-600 text-white px-5 py-2 font-semibold hover:bg-blue-700">
          Guardar
        </button>
      </div>
    </form>
  );
}

function ToggleRow({ label, checked, onClick }) {
  return (
    <div className="flex items-center justify-between">
      <span className="text-sm">{label}</span>
      <button
        type="button"
        onClick={onClick}
        className={`h-6 w-11 rounded-full transition ${
          checked ? "bg-green-500" : "bg-neutral-300"
        } relative`}
        aria-pressed={checked}
      >
        <span
          className={`absolute top-0.5 left-0.5 h-5 w-5 rounded-full bg-white transition ${
            checked ? "translate-x-5" : ""
          }`}
        />
      </button>
    </div>
  );
}

/* ------- util pequeño para mostrar el error del backend de forma amable ------- */
function getErrText(err, fallback) {
  if (!err) return fallback;
  if (typeof err === "string") return err;
  const m = err?.message;
  if (!m) return fallback;
  try {
    const j = JSON.parse(m);
    if (j?.detail) {
      return Array.isArray(j.detail) ? j.detail[0]?.msg || fallback : j.detail;
    }
  } catch {}
  return m || fallback;
}
