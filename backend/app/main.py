from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from .core.db import Base, engine
from .routers import users, products, auth

app = FastAPI(title="MachTrueke API")

# Configuración CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Crear tablas al arrancar
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
app.include_router(auth.router, prefix="/auth", tags=["auth"])
