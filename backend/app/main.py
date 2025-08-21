from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Config y DB
from .core.settings import CORS_ORIGINS
from .core.db import Base, engine

# Routers
from .routers import users, products

app = FastAPI(title="MachTrueke API")

# CORS para permitir al frontend (Vite) llamar a la API
app.add_middleware(
    CORSMiddleware,
    allow_origins=CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas cuando arranca (cuando definamos modelos)
@app.on_event("startup")
def on_startup():
    Base.metadata.create_all(bind=engine)

# Endpoint raíz
@app.get("/")
def root():
    return {"ok": True, "msg": "MachTrueke API lista"}

# Montar routers
app.include_router(users.router, prefix="/users", tags=["users"])
app.include_router(products.router, prefix="/products", tags=["products"])
