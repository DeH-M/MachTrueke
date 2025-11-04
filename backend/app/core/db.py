# backend/app/core/db.py
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker, declarative_base
from dotenv import load_dotenv

# Cargar variables de entorno desde backend/.env
load_dotenv()

DATABASE_URL = os.getenv("DATABASE_URL")
if not DATABASE_URL or not isinstance(DATABASE_URL, str):
    raise RuntimeError("DATABASE_URL no está definida o es inválida. Revisa backend/.env")

# Solo aplica a SQLite; para Postgres queda vacío
connect_args = {"check_same_thread": False} if DATABASE_URL.startswith("sqlite") else {}

# Crea engine y sesión
engine = create_engine(DATABASE_URL, connect_args=connect_args, future=True)
SessionLocal = sessionmaker(bind=engine, autocommit=False, autoflush=False)

Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()
