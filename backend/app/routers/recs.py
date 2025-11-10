# /backend/app/routers/recs.py
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session
from sqlalchemy import text

from app.deps import get_db, get_current_user
from app.ai.user_profile import user_vector
from app.ai.knn import knn_products_for_user

router = APIRouter()

def excluded_ids(db: Session, uid: int, mode: str) -> set[int]:
    """
    Determina qué productos excluir del feed.
    mode:
      - 'ldm'  -> excluye like/dismiss/match (RECOMENDADO)
      - 'none' -> no excluye nada (útil en depuración con pocos datos)
    """
    if mode == "none":
        return set()
    rows = db.execute(text("""
        SELECT product_id
        FROM public.user_events
        WHERE user_id = :u
          AND event_type IN ('like','dismiss','match')
    """), {"u": uid}).fetchall()
    return {r[0] for r in rows}

def baseline(db: Session, uid: int, exclude: set[int], limit: int = 200):
    """
    Fallback por recencia de otros dueños, trayendo imágenes agregadas.
    """
    ex_sql = "AND p.id NOT IN :ids" if exclude else ""
    # Agregamos LEFT JOIN a product_images y json_agg para regresar images []
    rows = db.execute(text(f"""
        SELECT
            p.*,
            0.0 AS sim_score,
            COALESCE(
                json_agg(
                    json_build_object('id', i.id, 'url', i.url)
                    ORDER BY i.id
                ) FILTER (WHERE i.id IS NOT NULL),
                '[]'::json
            ) AS images
        FROM public.products p
        LEFT JOIN public.product_images i ON i.product_id = p.id
        WHERE p.owner_id != :uid
        {ex_sql}
        GROUP BY p.id
        ORDER BY p.id DESC
        LIMIT :lim
    """), {
        "uid": uid,
        "ids": tuple(exclude) if exclude else (),
        "lim": limit
    }).mappings().all()
    return rows

def fetch_images_for_ids(db: Session, ids: list[int]) -> dict[int, list[dict]]:
    """
    Obtiene imágenes para un conjunto de product_ids y regresa un mapa: {product_id: [ {id, url}, ... ]}.
    """
    if not ids:
        return {}
    rows = db.execute(text("""
        SELECT
            p.id AS product_id,
            COALESCE(
                json_agg(
                    json_build_object('id', i.id, 'url', i.url)
                    ORDER BY i.id
                ) FILTER (WHERE i.id IS NOT NULL),
                '[]'::json
            ) AS images
        FROM public.products p
        LEFT JOIN public.product_images i ON i.product_id = p.id
        WHERE p.id IN :ids
        GROUP BY p.id
    """), {"ids": tuple(ids)}).mappings().all()
    return {r["product_id"]: r["images"] for r in rows}

def enrich_with_images(db: Session, items: list[dict]) -> list[dict]:
    """
    Si algún item no trae 'images', las busca en batch y se las agrega.
    Mantiene campos existentes (sim_score, etc.).
    """
    need = [int(it.get("id")) for it in items if not it.get("images")]
    if not need:
        return items
    img_map = fetch_images_for_ids(db, need)
    out = []
    for it in items:
        pid = int(it.get("id"))
        if not it.get("images"):
            it = dict(it)  # asegurar mutabilidad si viene como RowMapping
            it["images"] = img_map.get(pid, [])
        out.append(it)
    return out

def simple_dedupe(items, k: int = 30):
    """
    Deduplicación ligera por título para evitar clones seguidos.
    Mantiene el orden recibido (ya sea de KNN o baseline).
    """
    out, seen = [], set()
    for it in items:
        key = (it.get("title") or "").strip().lower()
        if key in seen:
            continue
        seen.add(key)
        out.append(it)
        if len(out) >= k:
            break
    return out

@router.get("/home")
def recs_home(
    db: Session = Depends(get_db),
    user=Depends(get_current_user),
    k: int = Query(200, ge=1, le=500),
    exclude: str = Query("ldm", pattern="^(ldm|none)$"),
):
    """
    Feed de recomendaciones:
      - Si hay vector de usuario → KNN (pgvector coseno).
      - Si no hay o falla → baseline por recencia.
      - Excluye por defecto productos con like/dismiss/match (no repetición).
      - Nunca muestra productos propios.
      - Aplica deduplicación ligera y recorta a 30 items.
    Parámetros:
      - k: tamaño de candidatos (antes de dedupe). 200 recomendado.
      - exclude: 'ldm' (default) o 'none' para depurar con pocos datos.
    """
    # 1) IDs a excluir según el modo
    excl = excluded_ids(db, user.id, mode=exclude)

    # 2) Vector de usuario (None → no hay historial útil)
    uvec = user_vector(db, user.id)

    # 3) KNN si hay vector; si falla o viene vacío, pasamos a baseline
    candidates = []
    if uvec is not None:
        try:
            candidates = knn_products_for_user(
                db,
                uvec,
                user_id=user.id,
                k_neighbors=k,
                exclude_ids=excl,  # ya excluye like/dismiss/match
            )
        except Exception:
            candidates = []

    # 4) Fallback por recencia (mismo criterio de exclusión) con imágenes ya agregadas
    if not candidates:
        candidates = baseline(db, user.id, exclude=excl, limit=k)

    # 5) Última red de seguridad: si aún así quedó vacío, ignora exclusiones
    if not candidates:
        candidates = baseline(db, user.id, exclude=set(), limit=k)

    # 6) Si los candidatos del KNN no traen 'images', los enriquecemos en batch
    candidates = enrich_with_images(db, list(candidates))

    # 7) Deduplicación ligera y top-K final (30 sugerencias)
    ranked = simple_dedupe(candidates, k=30)

    return {"items": ranked}
