# backend/app/main.py
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.staticfiles import StaticFiles           # 👈 NUEVO
from pathlib import Path                                 # 👈 NUEVO
from app.routers import chats            # 👈 import


# importa tus routers
from app.routers import auth, users, products

app = FastAPI(title="MachTrueke API", version="1.0.0")

# (opcional) CORS para pruebas local/frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# === STATIC: crea carpetas y monta /static ===
BASE_DIR = Path(__file__).resolve().parents[1]          # .../backend
STATIC_DIR = BASE_DIR / "static"
(STATIC_DIR / "uploads" / "avatars").mkdir(parents=True, exist_ok=True)
app.mount("/static", StaticFiles(directory=STATIC_DIR), name="static")
# =============================================

# monta routers SIN prefix extra (auth ya trae prefix="/auth")
app.include_router(auth.router)
app.include_router(users.router)
app.include_router(products.router)
app.include_router(chats.router)

@app.get("/")
def root():
    return {"ok": True}
