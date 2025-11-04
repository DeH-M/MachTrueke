# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles
from pathlib import Path

# Routers
from app.routers import auth, users, products, chats

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
# __file__ => .../backend/app/main.py
# parents[1] => .../backend
BASE_DIR = Path(__file__).resolve().parents[1]
STATIC_DIR = BASE_DIR / "static"
MEDIA_DIR = BASE_DIR / "media"

# Crear carpetas necesarias (best-effort)
(STATIC_DIR / "uploads" / "avatars").mkdir(parents=True, exist_ok=True)
(MEDIA_DIR / "products").mkdir(parents=True, exist_ok=True)

# === MONTAR ARCHIVOS ESTÁTICOS ===
# /static -> archivos internos (avatares, logos, etc.)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
# /media -> archivos subidos por usuarios (productos, imágenes, etc.)
app.mount("/media", StaticFiles(directory=MEDIA_DIR), name="media")

# === MONTAR ROUTERS ===
# Nota: auth ya trae prefix="/auth"
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(chats.router)

# === RUTA BASE ===
@app.get("/")
def root():
    return {"ok": True, "message": "MachTrueke API funcionando"}
