# backend/app/main.py
from pathlib import Path
from datetime import datetime
import asyncio

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles

# ─────────────────────────────────────────────────────────────
# IMPORTAR MODELOS TEMPRANO (asegura que SQLAlchemy conozca todo)
# ─────────────────────────────────────────────────────────────
import app.models.user        # noqa: F401
import app.models.product     # noqa: F401
import app.models.like        # noqa: F401
import app.models.chat        # noqa: F401
#import app.models.user_event  # <-- NUEVO: eventos del usuario para IA (view/like/dismiss/match)
#from .routers import ws_chat

# Routers
from app.routers import auth, users, products, likes, chats, ai_admin
from app.routers import events as events_router    # <-- NUEVO
from app.routers import recs as recs_router        # <-- NUEVO
from app.routers import health as health_router    # <-- NUEVO (/api/health/db)

# ─────────────────────────────────────────────────────────────
# Crear app
# ─────────────────────────────────────────────────────────────
app = FastAPI(title="MachTrueke API", version="1.0.0")

# CORS (frontend local)
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

# ─────────────────────────────────────────────────────────────
# Rutas estáticas
# ─────────────────────────────────────────────────────────────
BASE_DIR = Path(__file__).resolve().parents[1]  # .../backend
STATIC_DIR = BASE_DIR / "static"
MEDIA_DIR = BASE_DIR / "media"

# Crear carpetas necesarias (best-effort)
(STATIC_DIR / "uploads" / "avatars").mkdir(parents=True, exist_ok=True)
(STATIC_DIR / "uploads" / "chat").mkdir(parents=True, exist_ok=True)     # adjuntos de chat
(MEDIA_DIR / "products").mkdir(parents=True, exist_ok=True)
(MEDIA_DIR / "chat").mkdir(parents=True, exist_ok=True)  # 👈 AGREGADO: carpeta para /media/chat/<conversation_id>

app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# ─────────────────────────────────────────────────────────────
# Routers (orden explícito)
# ─────────────────────────────────────────────────────────────
# auth ya trae su propio prefix (e.g. /auth)
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)

# Likes bajo /api/likes (y compat opcional /likes)
app.include_router(likes.router, prefix="/api/likes", tags=["likes"])
app.include_router(likes.router, prefix="/likes", tags=["likes-compat"])

#app.include_router(ws_chat.router)
# Chats bajo /api/chats  (el router ya tiene prefix, pero repetirlo aquí es válido y explícito)
app.include_router(chats.router, prefix="/api/chats", tags=["chats"])


# (expone /api/ai/rebuild_embeddings)
app.include_router(ai_admin.router, prefix="/api/ai", tags=["ai"])

# IA: eventos de usuario y recomendaciones
app.include_router(events_router.router, prefix="/api/events", tags=["events"])  # POST /api/events
app.include_router(recs_router.router, prefix="/api/recs", tags=["recs"])        # GET  /api/recs/home

# Health adicional para DB (suma a /health simple que ya expones)
app.include_router(health_router.router)  # expone /api/health/db

# ─────────────────────────────────────────────────────────────
# Health, ping & root (tus endpoints existentes)
# ─────────────────────────────────────────────────────────────
@app.get("/")
def root():
    return {"ok": True, "message": "MachTrueke API funcionando"}

@app.get("/health")
def health():
    return {"status": "ok"}

@app.get("/api/ping")
def api_ping():
    return {"pong": True}

# ─────────────────────────────────────────────────────────────
# Limpieza periódica de likes expirados / productos inactivos
# ─────────────────────────────────────────────────────────────
from app.core.db import SessionLocal
from app.models.like import ProductLike
from app.models.product import Product

_cleanup_task: asyncio.Task | None = None

async def cleanup_likes_loop(interval_seconds: int = 3600):
    """
    Borra likes expirados o asociados a productos inactivos cada X tiempo.
    """
    # pequeña espera tras arrancar para que la app esté estable
    await asyncio.sleep(5)
    try:
        while True:
            expired_count = 0
            inactive_count = 0
            now = datetime.utcnow()

            with SessionLocal() as db:
                # 1) Expirados sin mensaje enviado
                expired_q = db.query(ProductLike).filter(
                    ProductLike.message_sent.is_(False),
                    ProductLike.expires_at.isnot(None),
                    ProductLike.expires_at <= now,
                )
                expired_count = expired_q.delete(synchronize_session=False)

                # 2) Likes de productos inactivos
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

            await asyncio.sleep(interval_seconds)
    except asyncio.CancelledError:
        # Salida limpia cuando Uvicorn hace reload o se apaga la app
        print("[CLEANUP] Tarea cancelada de forma segura.")
    except Exception as e:
         # No tumbar la app si falla puntualmente
        print("[CLEANUP ERROR]", e)

@app.on_event("startup")
async def start_background_tasks():
    global _cleanup_task
    _cleanup_task = asyncio.create_task(cleanup_likes_loop(interval_seconds=3600))

@app.on_event("shutdown")
async def stop_background_tasks():
    global _cleanup_task
    if _cleanup_task and not _cleanup_task.done():
        _cleanup_task.cancel()
        try:
            await _cleanup_task
        except asyncio.CancelledError:
            pass
