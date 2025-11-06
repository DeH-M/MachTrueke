# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pathlib import Path
import asyncio
from datetime import datetime

# Routers
from app.routers import auth, users, products, chats
from app.routers import likes  # likes

# === CREAR APP ===
app = FastAPI(title="MachTrueke API", version="1.0.0")

# === CORS: permitir peticiones desde el frontend local ===
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === BASE PATHS ===
BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend
STATIC_DIR = BASE_DIR / "static"
MEDIA_DIR = BASE_DIR / "media"

# Crear carpetas necesarias (best-effort)
(STATIC_DIR / "uploads" / "avatars").mkdir(parents=True, exist_ok=True)
(MEDIA_DIR / "products").mkdir(parents=True, exist_ok=True)

# === MONTAR ARCHIVOS ESTÁTICOS ===
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# === MONTAR ROUTERS ===
# Nota: auth ya trae prefix="/auth"
app.include_router(auth.router)
app.include_router(users.router)

# productos bajo /api/products
app.include_router(products.router, prefix="/api/products", tags=["products"])

# likes principal y alias de compatibilidad para el frontend
app.include_router(likes.router, prefix="/api/likes", tags=["likes"])
app.include_router(likes.router, prefix="/likes", tags=["likes-compat"])

# chats
app.include_router(chats.router)

# === RUTAS BÁSICAS ===
@app.get("/")
def root():
    return {"ok": True, "message": "MachTrueke API funcionando"}

@app.get("/health")
def health():
    return {"status": "ok"}

# ============================================================
# === LIMPIADOR AUTOMÁTICO DE LIKES CADUCADOS / PRODUCTOS ====
# ============================================================
from sqlalchemy.orm import Session
from app.core.db import SessionLocal
from app.models.like import ProductLike
from app.models.product import Product

async def cleanup_likes_loop(interval_seconds: int = 3600):
    """
    Bucle que se ejecuta cada cierto tiempo (por defecto, cada hora)
    y borra likes expirados o de productos inactivos.
    """
    await asyncio.sleep(5)  # espera breve tras el arranque del servidor
    try:
        while True:
            expired_count = 0
            inactive_count = 0
            now = datetime.utcnow()

            # Usar context manager garantiza cierre de la sesión
            with SessionLocal() as db:
                # 1) Borrar likes expirados (sin mensaje)
                expired_q = db.query(ProductLike).filter(
                    ProductLike.message_sent.is_(False),
                    ProductLike.expires_at != None,
                    ProductLike.expires_at <= now,
                )
                expired_count = expired_q.delete(synchronize_session=False)

                # 2) Borrar likes de productos desactivados
                #    (no se puede delete() con join -> obtener IDs y borrar por IN)
                inactive_like_ids = [
                    pl_id
                    for (pl_id,) in (
                        db.query(ProductLike.id)
                        .join(Product, ProductLike.product_id == Product.id)
                        .filter(Product.is_active.is_(False))
                        .all()
                    )
                ]
                if inactive_like_ids:
                    inactive_count = (
                        db.query(ProductLike)
                        .filter(ProductLike.id.in_(inactive_like_ids))
                        .delete(synchronize_session=False)
                    )

                if expired_count or inactive_count:
                    db.commit()
                    print(
                        f"[CLEANUP] Likes eliminados -> expirados: {expired_count}, inactivos: {inactive_count}"
                    )

            # Espera hasta la siguiente limpieza
            await asyncio.sleep(interval_seconds)
    except asyncio.CancelledError:
        # Salida limpia cuando Uvicorn hace reload o se apaga la app
        print("[CLEANUP] Tarea cancelada de forma segura.")
        return
    except Exception as e:
        # No interrumpir la app por fallos puntuales en el limpiador
        print("[CLEANUP ERROR]", e)

@app.on_event("startup")
async def start_background_tasks():
    """
    Inicia la tarea en segundo plano para limpiar likes expirados
    o de productos eliminados cada hora.
    """
    asyncio.create_task(cleanup_likes_loop(interval_seconds=3600))
