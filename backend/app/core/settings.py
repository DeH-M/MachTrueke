from pathlib import Path
from dotenv import load_dotenv
import os

# Carga .env desde la carpeta backend/
BASE_DIR = Path(__file__).resolve().parents[2]  # .../backend
load_dotenv(BASE_DIR / ".env")

# Variables disponibles en todo el proyecto
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./app.db")
CORS_ORIGINS = [
    o.strip() for o in os.getenv(
        "CORS_ORIGINS",
        "http://localhost:5173,http://127.0.0.1:5173"
    ).split(",") if o.strip()
]

SECRET_KEY = os.getenv("SECRET_KEY", "devsecret")
ALGORITHM = os.getenv("ALGORITHM", "HS256")
ACCESS_TOKEN_EXPIRE_MINUTES = int(os.getenv("ACCESS_TOKEN_EXPIRE_MINUTES", "60"))
