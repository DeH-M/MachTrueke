from fastapi import APIRouter
from sqlalchemy import text
from app.core.db import SessionLocal  # ← usa tu módulo real

router = APIRouter(prefix="/api/health", tags=["health"])

@router.get("/db")
def health_db():
    # Abrimos/cerramos la sesión local sin depender de get_db
    with SessionLocal() as db:
        row = db.execute(text("SELECT 1")).scalar()
        return {"db_ok": (row == 1)}
