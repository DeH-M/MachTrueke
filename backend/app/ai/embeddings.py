# /backend/app/ai/embeddings.py
import os
from typing import List

from sentence_transformers import SentenceTransformer
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.core.db import SessionLocal

# ---------------------------------------------------------------------
# Config
# ---------------------------------------------------------------------
MODEL_NAME = os.getenv("EMB_MODEL", "sentence-transformers/all-MiniLM-L6-v2")
EMB_DIM = 384  # MiniLM-L6-v2 → 384 dims
_model = None


def _model_once() -> SentenceTransformer:
    """Carga perezosa del modelo de embeddings (una sola instancia)."""
    global _model
    if _model is None:
        # device="cpu" garantiza que corra sin GPU; quítalo si usas CUDA.
        _model = SentenceTransformer(MODEL_NAME, device="cpu")
    return _model


def _text_of(row: dict) -> str:
    """Texto base para el embedding: título + descripción."""
    title = (row.get("title") or "").strip()
    desc = (row.get("description") or "").strip()
    return f"{title} | {desc}".strip(" |")


def _register_pgvector_if_possible(db_session: Session) -> None:
    """Registra caster pgvector si el driver lo soporta (no falla si no está)."""
    try:
        raw = db_session.connection().connection  # SQLAlchemy → psycopg conn
        try:
            from pgvector.psycopg import register_vector  # psycopg3
            register_vector(raw)
        except Exception:
            try:
                from pgvector.psycopg2 import register_vector  # psycopg2
                register_vector(raw)
            except Exception:
                pass
    except Exception:
        pass


def _to_vector_literal(vec: List[float]) -> str:
    """
    Convierte la lista de floats a un literal compatible con pgvector:
      "[0.123456,-0.001234,...]"
    Usamos 6 decimales por tamaño de payload y estabilidad.
    """
    return "[" + ",".join(f"{x:.6f}" for x in vec) + "]"


def build_or_refresh_product_embeddings(
    batch_limit: int = 500,
    force: bool = False,
) -> int:
    """
    Genera o actualiza embeddings de productos.

    Parámetros:
      - batch_limit: cantidad máxima a procesar en esta llamada
      - force=False: si True, recalcula para TODOS los productos (hasta batch_limit);
                     si False, solo los que NO tienen embedding o están desactualizados.

    Retorna:
      - número de productos procesados (insertados/actualizados)
    """
    db: Session = SessionLocal()
    try:
        _register_pgvector_if_possible(db)

        if force:
            # Recalcular para TODOS los productos (cuidado si hay muchos)
            rows = db.execute(text(f"""
                SELECT p.id, p.title, COALESCE(p.description, '') AS description
                FROM public.products p
                ORDER BY p.id DESC
                LIMIT :lim
            """), {"lim": batch_limit}).mappings().all()
        else:
            # Recalcular solo faltantes o desactualizados
            rows = db.execute(text(f"""
                SELECT p.id, p.title, COALESCE(p.description, '') AS description
                FROM public.products p
                LEFT JOIN public.product_embeddings e ON e.product_id = p.id
                WHERE e.product_id IS NULL
                   OR (p.updated_at IS NOT NULL AND e.updated_at IS NOT NULL AND p.updated_at > e.updated_at)
                   OR (p.updated_at IS NOT NULL AND e.updated_at IS NULL)
                ORDER BY p.id DESC
                LIMIT :lim
            """), {"lim": batch_limit}).mappings().all()

        if not rows:
            return 0

        model = _model_once()
        texts = [_text_of(r) for r in rows]
        # normalizamos para usar métrica coseno de forma estable
        embs = model.encode(texts, normalize_embeddings=True)

        processed = 0
        for r, emb in zip(rows, embs):
            vec_literal = _to_vector_literal(emb.tolist())
            # UPSERT con cast explícito a vector(384) y modelo persistido
            db.execute(text(f"""
                INSERT INTO public.product_embeddings (product_id, model, embedding, updated_at)
                VALUES (:pid, :model, CAST(:vec AS vector({EMB_DIM})), NOW())
                ON CONFLICT (product_id)
                DO UPDATE SET
                    model = EXCLUDED.model,
                    embedding = EXCLUDED.embedding,
                    updated_at = NOW()
            """), {"pid": r["id"], "model": MODEL_NAME, "vec": vec_literal})
            processed += 1

        db.commit()

        # Mantener estadísticas frescas para el planificador / índice IVF
        db.execute(text("ANALYZE public.product_embeddings;"))
        db.commit()

        return processed
    finally:
        db.close()
