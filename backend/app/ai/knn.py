# /backend/app/ai/knn.py
from sqlalchemy.orm import Session
from sqlalchemy import text

def _register_pgvector_if_possible(db: Session):
    try:
        raw = db.connection().connection
        try:
            from pgvector.psycopg import register_vector  # psycopg3
            register_vector(raw)
            return
        except Exception:
            pass
        try:
            from pgvector.psycopg2 import register_vector  # psycopg2
            register_vector(raw)
            return
        except Exception:
            pass
    except Exception:
        pass

def _vec_literal(vec):
    # pgvector literal: "[v1,v2,...]"
    return "[" + ",".join(f"{float(x):.6f}" for x in vec) + "]"

def knn_products_for_user(
    db: Session,
    uvec,
    user_id: int,
    k_neighbors: int = 200,
    exclude_ids: set[int] | None = None,
):
    _register_pgvector_if_possible(db)

    uvec_str = _vec_literal(uvec)  # <-- enviamos texto y CAST en SQL
    ex = "AND p.id NOT IN :ids" if exclude_ids else ""

    rows = db.execute(
        text(
            f"""
            SELECT p.*,
                   (1 - (pe.embedding <=> CAST(:uvec AS vector(384)))) AS sim_score
            FROM public.products p
            JOIN public.product_embeddings pe ON pe.product_id = p.id
            WHERE p.owner_id != :uid
              {ex}
            ORDER BY pe.embedding <-> CAST(:uvec AS vector(384))
            LIMIT :k
            """
        ),
        {
            "uvec": uvec_str,
            "uid": user_id,
            "ids": tuple(exclude_ids) if exclude_ids else (),
            "k": k_neighbors,
        },
    ).mappings().all()
    return rows
