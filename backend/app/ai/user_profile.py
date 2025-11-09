# /backend/app/ai/user_profile.py
from sqlalchemy.orm import Session
from sqlalchemy import text

# ============================================================================
# CONFIGURACIÓN DE PESOS (ajustable)
# view     → vio el producto (señal débil, pero positiva)
# like     → le gustó (fuerte)
# match    → hubo conexión (muy fuerte)
# dismiss  → lo rechazó (negativa)
# ============================================================================
WEIGHTS = {"view": 0.4, "like": 2.5, "match": 4.0, "dismiss": -1.2}


# ============================================================================
# FUNCIONES AUXILIARES
# ============================================================================

def _register_pgvector_if_possible(db: Session):
    """Registra el tipo vector de pgvector si el driver lo soporta."""
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


def _coerce_to_float_list(emb_obj):
    """
    Convierte cualquier forma en la que venga un embedding a list[float].
    Soporta:
      - list, tuple
      - memoryview (psycopg)
      - str tipo "(0.1,0.2,...)" o "[0.1, 0.2, ...]"
      - array('d') o similares
    """
    if isinstance(emb_obj, (list, tuple)):
        return [float(x) for x in emb_obj]

    # memoryview → array de doubles
    try:
        import array
        if isinstance(emb_obj, memoryview):
            try:
                a = array.array("d")
                a.frombytes(emb_obj.tobytes())
                return list(map(float, a))
            except Exception:
                pass
    except Exception:
        pass

    # str "(0.1,0.2,...)" o "[0.1, 0.2, ...]"
    if isinstance(emb_obj, str):
        s = emb_obj.strip().replace("[", "").replace("]", "").replace("(", "").replace(")", "")
        if not s:
            return []
        parts = [p.strip() for p in s.split(",") if p.strip()]
        return [float(p) for p in parts]

    # otros iterables (array('d'), numpy array, etc.)
    try:
        return [float(x) for x in emb_obj]
    except Exception:
        return []


# ============================================================================
# FUNCIÓN PRINCIPAL: construye el vector de usuario
# ============================================================================
def user_vector(db: Session, user_id: int):
    """
    Calcula el vector de usuario como combinación ponderada
    de los embeddings de los productos con los que ha interactuado.
    Retorna una lista de floats (384 dimensiones aprox).
    """
    _register_pgvector_if_possible(db)

    rows = db.execute(text("""
        SELECT pe.embedding, ue.event_type
        FROM public.user_events ue
        JOIN public.product_embeddings pe ON pe.product_id = ue.product_id
        WHERE ue.user_id = :uid
        ORDER BY ue.created_at DESC
        LIMIT 500
    """), {"uid": user_id}).fetchall()

    if not rows:
        return None

    vec, wsum = None, 0.0
    for emb_obj, etype in rows:
        arr = _coerce_to_float_list(emb_obj)
        if not arr:
            continue

        w = float(WEIGHTS.get(etype, 0.5))
        if vec is None:
            vec = [w * x for x in arr]
        else:
            # suma ponderada (se asegura la longitud correcta)
            for i, x in enumerate(arr):
                if i < len(vec):
                    vec[i] += w * x
                else:
                    vec.append(w * x)

        wsum += abs(w)

    if not vec or wsum <= 0:
        return None

    # normalización por la suma de pesos absolutos (mantiene escala estable)
    vec = [x / wsum for x in vec]
    return vec
