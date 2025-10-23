// src/pages/profile/ProfileSettings.jsx
import { useEffect, useMemo, useRef, useState } from "react";
import { CAMPUSES } from "../../constants/campuses";

export default function ProfileSettings() {
  // Detectar móvil (para botón de cámara en móviles)
  const isMobile = useMemo(() => {
    if (typeof navigator === "undefined") return false;
    return /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
  }, []);

  // Perfil (simulación; en tu app probablemente venga de tu store)
  const [profile, setProfile] = useState({
    username: "usuario123",
    fullName: "Nombre Apellido Apellido",
    campus: "",
    bio: "",
    email: "correo@alumnos.udg.mx",
    avatar: "",
  });

  // Contraseña
  const [pwd, setPwd] = useState({ current: "", next: "", confirm: "" });

  // Notificaciones
  const [prefs, setPrefs] = useState({
    notifications: true,
    emailNotifications: false,
  });

  // Refs de archivos
  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const onChangeProfile = (e) =>
    setProfile((p) => ({ ...p, [e.target.name]: e.target.value }));

  const onChangePwd = (e) =>
    setPwd((p) => ({ ...p, [e.target.name]: e.target.value }));

  const togglePref = (k) => setPrefs((p) => ({ ...p, [k]: !p[k] }));

  const handleAvatarFile = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const url = URL.createObjectURL(file);
    setProfile((p) => ({ ...p, avatar: url }));
  };

  const triggerPickPhoto = () => fileInputRef.current?.click();

  const saveProfile = (e) => {
    e.preventDefault();
    alert(
      "Perfil guardado (mock):\n" +
        JSON.stringify(
          {
            username: profile.username,
            fullName: profile.fullName,
            campus: profile.campus,
            bio: profile.bio,
            email: profile.email,
          },
          null,
          2
        )
    );
  };

  const savePwd = (e) => {
    e.preventDefault();
    if (!pwd.current || !pwd.next) return alert("Completa los campos de contraseña.");
    if (pwd.next.length < 8) return alert("La nueva contraseña debe tener al menos 8 caracteres.");
    if (pwd.next !== pwd.confirm) return alert("La confirmación no coincide.");
    alert("Contraseña actualizada (mock)");
    setPwd({ current: "", next: "", confirm: "" });
  };

  const savePrefs = (e) => {
    e.preventDefault();
    alert("Preferencias guardadas (mock):\n" + JSON.stringify(prefs, null, 2));
  };

  const deleteAccount = () => {
    if (!confirm("¿Seguro que deseas eliminar tu cuenta? Esta acción es irreversible.")) return;
    alert("Cuenta eliminada (mock). Aquí llamarías a DELETE /me y cerrar sesión.");
  };

  // clases base (sin fondo para cada recuadro como pediste)
  const card = "relative rounded-2xl border border-neutral-300/70 bg-transparent p-4 md:p-5";
  const label = "block text-xs mb-1 text-neutral-700";
  const input =
    "w-full rounded-xl border border-neutral-300 px-3 py-2 outline-none focus:ring-2 focus:ring-blue-500 bg-white";

  return (
    <div className="space-y-5">
      {/* ===== Perfil ===== */}
      <section className={card}>
        <h3 className="font-semibold mb-3">Perfil</h3>

        {/* padding-bottom extra para no tapar inputs con el botón fijo */}
        <form onSubmit={saveProfile} className="space-y-3 pb-16">
          <div className="grid md:grid-cols-3 gap-3">
            {/* Cols 1-2: campos (pero nombre completo y correo son solo lectura) */}
            <div className="md:col-span-2 space-y-3">
              {/* Nombre completo: renglón propio (width completa), solo lectura */}
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

              {/* Usuario (editable si quieres) */}
              <div>
                <label className={label}>Nombre de usuario</label>
                <input
                  name="username"
                  value={profile.username}
                  onChange={onChangeProfile}
                  className={input}
                />
              </div>

              {/* Campus (selector con lista) */}
              <div>
                <label className={label}>Campus</label>
                <select
                  name="campus"
                  value={profile.campus}
                  onChange={onChangeProfile}
                  className={`${input} bg-white`}
                >
                  <option value="">Selecciona tu campus</option>
                  {CAMPUSES.map((c) => (
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
                />
              </div>

              {/* Correo: solo lectura */}
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

            {/* Col 3: Avatar (archivo o cámara) */}
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
                      >
                        Tomar foto
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        className="rounded-xl bg-neutral-800 text-white px-3 py-2 text-xs font-semibold hover:bg-neutral-700"
                      >
                        Elegir de galería
                      </button>
                    </div>
                  ) : (
                    <button
                      type="button"
                      onClick={triggerPickPhoto}
                      className="rounded-xl bg-blue-600 text-white px-3 py-2 text-xs font-semibold hover:bg-blue-700"
                    >
                      Subir imagen
                    </button>
                  )}

                  {profile.avatar && (
                    <div>
                      <button
                        type="button"
                        onClick={() => setProfile((p) => ({ ...p, avatar: "" }))}
                        className="rounded-xl bg-neutral-200 px-3 py-2 text-xs font-semibold hover:bg-neutral-300"
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

          {/* Botón fijo abajo-derecha de la tarjeta */}
          <div className="absolute right-4 bottom-4">
            <button className="rounded-xl bg-blue-600 text-white px-5 py-2 font-semibold hover:bg-blue-700">
              Guardar
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
                />
              </div>
              <button className="rounded-xl bg-blue-600 text-white px-5 py-2 font-semibold hover:bg-blue-700">
                Guardar contraseña
              </button>
            </div>
          </div>
        </form>
      </section>

      {/* ===== Notificaciones + Eliminar cuenta ===== */}
      <section className={card}>
        <h3 className="font-semibold mb-3">Notificaciones</h3>

        <form onSubmit={savePrefs} className="space-y-4">
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
          >
            Eliminar
          </button>
        </div>
      </section>
    </div>
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
