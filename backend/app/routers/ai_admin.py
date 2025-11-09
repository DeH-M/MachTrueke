# /backend/app/routers/ai_admin.py
from fastapi import APIRouter, Header, HTTPException, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text
import os

from app.deps import get_db
from app.ai.embeddings import build_or_refresh_product_embeddings

router = APIRouter()


# ============================================================
# Función auxiliar para validar clave administrativa
# ============================================================
def _require_admin(x_admin_key_value: str | None) -> None:
    """
    Verifica que el header 'x-admin-key' coincida con la clave esperada.
    """
    expected = os.getenv("AI_ADMIN_KEY", "mach-ai-admin")  # valor por defecto en desarrollo
    if not x_admin_key_value or x_admin_key_value != expected:
        raise HTTPException(status_code=401, detail="Unauthorized")


# ============================================================
# Endpoint: estado general de embeddings
# ============================================================
@router.get("/status")
def ai_status(db: Session = Depends(get_db)):
    """
    Devuelve conteos simples:
    - número total de productos
    - número de embeddings generados
    - cuántos faltan
    """
    n_prod = db.execute(text("SELECT COUNT(*) FROM public.products")).scalar() or 0
    n_vec = db.execute(text("SELECT COUNT(*) FROM public.product_embeddings")).scalar() or 0
    return {
        "products_total": n_prod,
        "embeddings_total": n_vec,
        "missing": max(n_prod - n_vec, 0),
        "ok": n_vec >= n_prod,
    }


# ============================================================
# Endpoint: regenerar embeddings (manual o forzado)
# ============================================================
@router.post("/rebuild_embeddings")
def rebuild_embeddings(
    db: Session = Depends(get_db),
    x_admin_key: str | None = Header(default=None, alias="x-admin-key"),
    limit: int = Query(1000, ge=1, le=5000),
    force: bool = Query(False, description="Si True, recalcula TODOS los embeddings (hasta 'limit')"),
):
    """
    Recalcula o refresca embeddings de productos.

    Header requerido:
      - x-admin-key: clave de administración

    Parámetros:
      - limit: cuántos productos máximo procesar (default=1000)
      - force: si True, fuerza recalcular todos los productos (aunque ya tengan embedding)
    """
    _require_admin(x_admin_key)

    try:
        processed = build_or_refresh_product_embeddings(batch_limit=limit, force=force)
        return {
            "ok": True,
            "processed": processed,
            "force": force,
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# ============================================================
# Endpoint opcional: listar productos sin embedding
# ============================================================
@router.get("/missing")
def ai_missing(
    db: Session = Depends(get_db),
    x_admin_key: str | None = Header(default=None, alias="x-admin-key"),
    limit: int = Query(50, ge=1, le=500),
):
    """
    Lista productos que aún no tienen embedding (para inspección).
    """
    _require_admin(x_admin_key)

    rows = db.execute(text("""
        SELECT p.id, p.title, p.description
        FROM public.products p
        LEFT JOIN public.product_embeddings e ON e.product_id = p.id
        WHERE e.product_id IS NULL
        ORDER BY p.id DESC
        LIMIT :lim
    """), {"lim": limit}).mappings().all()

    return {"missing": len(rows), "items": rows}
