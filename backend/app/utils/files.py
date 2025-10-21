# backend/app/utils/files.py
from __future__ import annotations
from fastapi import UploadFile, HTTPException
from pathlib import Path
from uuid import uuid4

ALLOWED_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp"}
MAX_IMAGE_MB = 5

def _static_root() -> Path:
    # .../backend
    return Path(__file__).resolve().parents[2] / "static"

async def save_image(file: UploadFile, subdir: str) -> str:
    # Validar tipo
    if file.content_type not in ALLOWED_IMAGE_TYPES:
        raise HTTPException(status_code=400, detail="Formato no permitido (JPG/PNG/WEBP)")

    # Leer y validar tamaño
    data = await file.read()
    if len(data) > MAX_IMAGE_MB * 1024 * 1024:
        raise HTTPException(status_code=400, detail=f"Imagen supera {MAX_IMAGE_MB}MB")

    # Nombre único + extensión
    ext = Path(file.filename).suffix.lower() or ".jpg"
    name = f"{uuid4().hex}{ext}"

    # Guardar en /static/uploads/<subdir>/
    target_dir = _static_root() / "uploads" / subdir
    target_dir.mkdir(parents=True, exist_ok=True)
    (target_dir / name).write_bytes(data)

    # URL pública servida por /static
    return f"/static/uploads/{subdir}/{name}"

def delete_local_file_if_inside_static(url: str | None) -> None:
    # (lo usaremos después para eliminar/reemplazar)
    if not url or not url.startswith("/static/uploads/"):
        return
    target_path = _static_root() / url.replace("/static/", "")
    try:
        if target_path.is_file():
            target_path.unlink()
    except Exception:
        pass
