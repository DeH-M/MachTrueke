// src/pages/profile/ProfileSettings.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router-dom";
import useAuth from "../../store/authStore";
import { authApi } from "../../services/authApi";
import { CAMPUSES as CAMPUSES_FALLBACK } from "../../constants/campuses";

/* --- Toast centrado arriba ------------------------------------------------------- */
function Toast({ show, kind = "success", children }) {
  if (!show) return null;
  const base =
    "fixed top-6 left-1/2 -translate-x-1/2 z-[60] px-6 py-3 rounded-xl text-sm font-semibold shadow ring-1 transition-all duration-500";
  const styles =
    kind === "success"
      ? "bg-green-50 text-green-700 ring-green-200"
      : "bg-red-50 text-red-700 ring-red-200";
  return <div className={`${base} ${styles}`}>{children}</div>;
}

export default function ProfileSettings() {
  const { user, login, logout } = useAuth();
  const navigate = useNavigate();

  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  // Lista de campus
  const [campuses, setCampuses] = useState(CAMPUSES_FALLBACK);
  useEffect(() => {
    (async () => {
      try {
        const rows = await authApi.listCampuses();
        if (Array.isArray(rows) && rows.length) {
          setCampuses(rows.map((r) => ({ id: r.id, label: `${r.code}: ${r.name}` })));
        }
      } catch {
        /* fallback local */
      }
    })();
  }, []);

  // Perfil inicial
  const [profile, setProfile] = useState({
    username: user?.username || "",
    fullName: user?.full_name || "",
    campus: user?.campus_id ?? "",
    bio: user?.bio ?? "",
    email: user?.email || "",
    avatar: user?.avatar_url || "",
  });

  useEffect(() => {
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

  // Estado UI
  const [savingProfile, setSavingProfile] = useState(false);
  const [savingPwd, setSavingPwd] = useState(false);
  const [uploadingAvatar, setUploadingAvatar] = useState(false);

  // Toast
  const [toast, setToast] = useState({ show: false, kind: "success", text: "" });
  const showToast = (text, kind = "success", ms = 2200) => {
    setToast({ show: true, kind, text });
    window.clearTimeout(showToast._t);
    showToast._t = window.setTimeout(() => setToast((t) => ({ ...t, show: false })), ms);
  };

  // Refs para archivos
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const onChangeProfile = (e) => setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });
  const onChangePwd = (e) => setPwd((p) => ({ ...p, [e.target.name]: e.target.value }));

  const triggerPickPhoto = () => fileInputRef.current?.click();

  const handleAvatarFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingAvatar(true);
    try {
      await authApi.uploadAvatar(file);
      const fresh = await authApi.me();
      login(fresh);
      showToast("Avatar actualizado");
    } catch (err) {
      showToast(getErrText(err, "No se pudo subir la imagen"), "error", 2800);
    } finally {
      setUploadingAvatar(false);
    }
  };

  // Guardar perfil
  const saveProfile = async (e) => {
    e.preventDefault();
    setSavingProfile(true);
    try {
      const updated = await authApi.updateMe({
        username: profile.username?.trim(),
        bio: profile.bio ?? null,
        campus_id: profile.campus === "" ? null : Number(profile.campus),
      });
      login(updated);
      showToast("Cambios guardados");
    } catch (err) {
      showToast(getErrText(err, "No se pudo actualizar el perfil"), "error", 3000);
    } finally {
      setSavingProfile(false);
    }
  };

  // Cambiar contraseña
  const savePwd = async (e) => {
    e.preventDefault();
    if (!pwd.current || !pwd.next) return showToast("Completa los campos de contraseña.", "error");
    if (pwd.next.length < 8) return showToast("La nueva contraseña debe tener al menos 8 caracteres.", "error");
    if (pwd.next !== pwd.confirm) return showToast("La confirmación no coincide.", "error");

    setSavingPwd(true);
    try {
      await authApi.changePassword({
        old_password: pwd.current,
        new_password: pwd.next,
        confirm_password: pwd.confirm,
      });
      setPwd({ current: "", next: "", confirm: "" });
      showToast("Contraseña actualizada");
    } catch (err) {
      showToast(getErrText(err, "No se pudo cambiar la contraseña"), "error", 3000);
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
      navigate("/", { replace: true });
    } catch (err) {
      showToast(getErrText(err, "No se pudo eliminar la cuenta"), "error", 3000);
    }
  };

  const card = "relative rounded-2xl border border-neutral-300/70 bg-transparent p-4 md:p-5";
  const label = "block text-xs mb-1 text-neutral-700";
  const input =
    "w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white";
  const disabledAll = !user;

  return (
    <div className="space-y-5">
      {/* Toast centrado arriba */}
      <Toast show={toast.show} kind={toast.kind}>{toast.text}</Toast>

      {/* ===== Perfil ===== */}
      <section className={card}>
        <h3 className="font-semibold mb-3">Perfil</h3>

        <form onSubmit={saveProfile} className="space-y-3 pb-16">
          <div className="grid md:grid-cols-3 gap-3">
            {/* Campos principales */}
            <div className="md:col-span-2 space-y-3">
              <div>
                <label className={label}>Nombre completo</label>
                <input
                  name="fullName"
                  value={profile.fullName}
                  readOnly
                  disabled
                  className={`${input} cursor-not-allowed bg-neutral-100`}
                />
                <p className="text-[11px] text-neutral-500 mt-1">Este dato no se puede editar.</p>
              </div>

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
              </div>
            </div>

            {/* Controles de avatar (sin recuadro) */}
            <div className="md:col-span-1 space-y-2">
              <label className={label}>Foto de perfil</label>

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
                        setProfile((p) => ({ ...p, avatar: "" }));
                        try {
                          await authApi.deleteAvatar();
                          const fresh = await authApi.me();
                          login(fresh);
                          showToast("Avatar eliminado");
                        } catch (err) {
                          showToast(getErrText(err, "No se pudo eliminar el avatar"), "error", 3000);
                        }
                      }}
                      className="rounded-xl bg-neutral-200 px-3 py-2 text-xs font-semibold hover:bg-neutral-300"
                      disabled={disabledAll}
                    >
                      Quitar
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>

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

      {/* ===== Eliminar cuenta ===== */}
      <section className={card}>
        <h3 className="font-semibold mb-3">Eliminar cuenta</h3>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm text-neutral-700">
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

/* ------- util pequeño para mostrar el error del backend ------- */
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
