from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from .core.settings import CORS_ORIGINS
from .core.db import Base, engine

app = FastAPI(title="MachTrueke API")

# Permitir al frontend llamar a la API
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

@app.get("/")
def root():
    return {"ok": True, "msg": "MachTrueke API lista"}
