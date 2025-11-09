# /backend/scripts/smoke_knn.py
import sys
from sqlalchemy import text
from app.core.db import SessionLocal
from app.ai.embeddings import build_or_refresh_product_embeddings
from app.ai.user_profile import user_vector

def _vec_literal(vec):
    # vector literal pgvector: "[v1,v2,...]"
    return "[" + ",".join(f"{float(x):.6f}" for x in vec) + "]"

def main(user_id: int = 9):
    ok = True
    db = SessionLocal()
    try:
        # 1) DB OK?
        db.execute(text("SELECT 1")).scalar()
        print("DB: OK")

        # 2) Embeddings
        n = build_or_refresh_product_embeddings()
        print(f"Embeddings insertados/refrescados (batch): {n}")

        # 3) Otros dueños
        others = db.execute(text("SELECT COUNT(*) FROM public.products WHERE owner_id <> :u"), {"u": user_id}).scalar()
        print(f"Productos de otros dueños: {others}")

        # 4) Vector de usuario
        uvec = user_vector(db, user_id)
        print("User vector:", "OK" if uvec else "VACÍO (usará fallback)")

        # 5) KNN directo (solo si hay vector)
        if uvec:
            uvec_str = _vec_literal(uvec)  # <-- literal de texto
            rows = db.execute(text("""
                SELECT p.id, p.title, (1 - (pe.embedding <=> CAST(:uvec AS vector(384)))) AS score
                FROM public.products p
                JOIN public.product_embeddings pe ON pe.product_id = p.id
                WHERE p.owner_id <> :u
                ORDER BY pe.embedding <-> CAST(:uvec AS vector(384))
                LIMIT 5
            """), {"uvec": uvec_str, "u": user_id}).mappings().all()
            print("Top-5 KNN (id, score):", [(r["id"], float(r["score"])) for r in rows])
        else:
            print("KNN: saltado (no hay vector).")

    except Exception as e:
        ok = False
        print("ERROR:", e)
    finally:
        db.close()

    sys.exit(0 if ok else 1)

if __name__ == "__main__":
    uid = int(sys.argv[1]) if len(sys.argv) > 1 else 9
    main(uid)
