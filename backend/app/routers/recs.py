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

    rows = db.execute(
        text(
            """
            SELECT product_id
            FROM public.user_events
            WHERE user_id = :u
              AND event_type IN ('like','dismiss','match')
            """
        ),
        {"u": uid},
    ).fetchall()
    return {int(r[0]) for r in rows}


def baseline(db: Session, uid: int, exclude: set[int], limit: int = 200):
    """
    Fallback por recencia de otros dueños. Útil cuando no hay perfil o KNN no trae nada.
    Devuelve RowMapping (lo convertiremos a dict más adelante).
    """
    ex_sql = "AND p.id NOT IN :ids" if exclude else ""
    rows = (
        db.execute(
            text(
                f"""
                SELECT p.*, 0.0 AS sim_score
                FROM public.products p
                WHERE p.owner_id != :uid
                {ex_sql}
                ORDER BY p.id DESC
                LIMIT :lim
                """
            ),
            {
                "uid": uid,
                "ids": tuple(exclude) if exclude else (),
                "lim": limit,
            },
        )
        .mappings()
        .all()
    )
    return rows


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


def _hydrate_images(db: Session, items: list[dict]) -> None:
    """
    Adjunta images: [{id, url}, ...] a cada item in-place.
    'items' debe contener dicts con clave 'id'.
    """
    if not items:
        return

    ids = [int(it["id"]) for it in items if "id" in it]
    if not ids:
        return

    # Únicos preservando orden
    ids = list(dict.fromkeys(ids))

    rows = (
        db.execute(
            text(
                """
                SELECT id, product_id, url
                FROM public.product_images
                WHERE product_id IN :ids
                ORDER BY id
                """
            ),
            {"ids": tuple(ids)},
        )
        .mappings()
        .all()
    )

    by_pid: dict[int, list[dict]] = {}
    for r in rows:
        by_pid.setdefault(int(r["product_id"]), []).append(
            {"id": int(r["id"]), "url": r["url"]}
        )

    for it in items:
        pid = int(it["id"])
        it["images"] = by_pid.get(pid, [])


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

    # 4) Fallback por recencia (mismo criterio de exclusión)
    if not candidates:
        candidates = baseline(db, user.id, exclude=excl, limit=k)

    # 5) Última red de seguridad: si aún así quedó vacío, ignora exclusiones
    if not candidates:
        candidates = baseline(db, user.id, exclude=set(), limit=k)

    # 6) Deduplicación y top-K final (30)
    ranked = simple_dedupe(candidates, k=30)

    # 7) Convertimos a dict (si vienen RowMapping) para poder mutarlos
    ranked = [dict(r) for r in ranked]

    # 8) 🔹 Adjuntamos imágenes al feed
    _hydrate_images(db, ranked)

    return {"items": ranked}
