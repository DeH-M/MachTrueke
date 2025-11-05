# app/routers/likes.py
from typing import List, Optional
from datetime import datetime, timedelta

from fastapi import APIRouter, Depends, HTTPException, status, Path as FPath, Request
from pydantic import BaseModel
from sqlalchemy.orm import Session, selectinload

from ..core.db import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.product import Product
from ..models.like import ProductLike
from ..schemas.like import ProductLikeRead, ProductLikeCreate, LikesMeRead
from ..schemas.product import ProductRead, ProductImageRead

router = APIRouter()


# ------------------------ helpers ------------------------
def _abs_url(url: str, request: Request) -> str:
    if not url:
        return url
    if url.startswith("http://") or url.startswith("https://"):
        return url
    base = str(request.base_url).rstrip("/")
    return f"{base}{url}"


def _product_to_read(p: Product, request: Request) -> ProductRead:
    return ProductRead(
        id=p.id,
        title=p.title,
        description=p.description,
        owner_id=p.owner_id,
        is_active=p.is_active,
        images=[
            ProductImageRead(id=img.id, url=_abs_url(img.url, request))
            for img in (p.images or [])
        ],
    )

# 👇 NUEVO: serializar el dueño para el frontend (nombre + avatar absoluto)
def _owner_to_dict(p: Product, request: Request):
    owner = getattr(p, "owner", None)
    if not owner:
        return {
            "id": p.owner_id,
            "name": "Usuario",
            "username": None,  # ← añadido para consistencia
            "avatar": None,
        }
    # ✅ Cambiado: preferimos username; si no hay, caemos a full_name y luego a 'Usuario'
    name = owner.username or owner.full_name or "Usuario"
    avatar = getattr(owner, "avatar_url", None) or getattr(owner, "avatar", None)
    return {
        "id": owner.id,
        "name": name,                             # ← ahora es el username
        "username": owner.username,               # ← extra, no rompe nada
        "avatar": _abs_url(avatar, request) if avatar else None,
    }


# ------------------------------------------------------------------
# RUTAS DE COMPATIBILIDAD PARA EL FRONTEND (NO ROMPEN LO EXISTENTE)
# ------------------------------------------------------------------

# Body que espera el frontend: { product_id, note? }
class _CreateBody(BaseModel):
    product_id: int
    note: Optional[str] = None


# Wrapper que espera el frontend: { items: [...] }
class _LikesMineCompat(BaseModel):
    items: List[ProductLikeRead]


# POST /likes  -> body { product_id, note? }  (compat)
@router.post("", response_model=ProductLikeRead, status_code=status.HTTP_201_CREATED)
def create_like_body(
    request: Request,
    body: _CreateBody,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).get(body.product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # evitar auto-like
    if product.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes hacer like a tu propio producto")

    like = (
        db.query(ProductLike)
        .filter(
            ProductLike.user_id == current_user.id,
            ProductLike.product_id == body.product_id,
        )
        .first()
    )

    if like is None:
        like = ProductLike(
            user_id=current_user.id,
            product_id=body.product_id,
            note=body.note,
        )
        # expira en 3 días si no hay mensaje
        like.set_expiration(days=3)
        db.add(like)
        db.commit()
        db.refresh(like)
    else:
        if body.note is not None:
            like.note = body.note
        if not like.expires_at and not like.message_sent:
            like.set_expiration(days=3)
        db.commit()
        db.refresh(like)

    # 👇 añadimos owner y type para el frontend (sin romper lo existente)
    data = ProductLikeRead(
        id=like.id,
        note=like.note,
        created_at=like.created_at,
        product=_product_to_read(product, request),
    ).model_dump()
    data["type"] = "product"
    data["owner"] = _owner_to_dict(product, request)
    return data


# GET /likes/mine  -> { items: [...] }  (compat + a prueba de recursión)
# ⬇️ NO usamos response_model aquí para evitar RecursionError en serialización
@router.get("/mine")
def list_my_likes_compat(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    likes: List[ProductLike] = (
        db.query(ProductLike)
        .options(
            selectinload(ProductLike.product).selectinload(Product.images),
            selectinload(ProductLike.product).selectinload(Product.owner),  # 👈 NUEVO
        )
        .filter(ProductLike.user_id == current_user.id)
        .order_by(ProductLike.created_at.desc())
        .all()
    )

    items = []
    dirty_ids: List[int] = []
    for l in likes:
        p = l.product
        if not p or not p.is_active:
            dirty_ids.append(l.id)
            continue
        items.append({
            "id": l.id,
            "type": "product",  # 👈 ayuda al front
            "note": l.note,
            "created_at": l.created_at,
            "product": {
                "id": p.id,
                "title": p.title,
                "description": p.description,
                "owner_id": p.owner_id,
                "is_active": p.is_active,
                "images": [
                    {"id": img.id, "url": _abs_url(img.url, request)}
                    for img in (p.images or [])
                ],
            },
            "owner": _owner_to_dict(p, request),  # 👈 nombre (username) + avatar absoluto
        })

    if dirty_ids:
        db.query(ProductLike).filter(ProductLike.id.in_(dirty_ids)).delete(synchronize_session=False)
        db.commit()

    return {"items": items}


# ---------------------------------------------------------
# RUTAS ORIGINALES (SE MANTIENEN TAL CUAL)
# ---------------------------------------------------------

# Crear like por path: POST /api/likes/{product_id}
@router.post("/{product_id}", response_model=ProductLikeRead, status_code=status.HTTP_201_CREATED)
def create_like(
    request: Request,
    product_id: int = FPath(..., ge=1),
    payload: ProductLikeCreate = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    product = db.query(Product).get(product_id)
    if not product or not product.is_active:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # evitar auto-like
    if product.owner_id == current_user.id:
        raise HTTPException(status_code=400, detail="No puedes hacer like a tu propio producto")

    like = (
        db.query(ProductLike)
        .filter(ProductLike.user_id == current_user.id, ProductLike.product_id == product_id)
        .first()
    )
    if like is None:
        like = ProductLike(
            user_id=current_user.id,
            product_id=product_id,
            note=(payload.note if payload else None),
        )
        # fijar expiración a 3 días
        like.set_expiration(days=3)
        db.add(like)
        db.commit()
        db.refresh(like)
    else:
        # si ya existe, actualizamos note/expires si necesario
        if payload and payload.note is not None:
            like.note = payload.note
        # si ya no tiene expires_at lo reiniciamos (opcional)
        if not like.expires_at and not like.message_sent:
            like.set_expiration(days=3)
        db.commit()
        db.refresh(like)

    # 👇 añadimos owner y type para el frontend
    data = ProductLikeRead(
        id=like.id,
        note=like.note,
        created_at=like.created_at,
        product=_product_to_read(product, request),
    ).model_dump()
    data["type"] = "product"
    data["owner"] = _owner_to_dict(product, request)
    return data


# Borrar like: DELETE /api/likes/{product_id}
@router.delete("/{product_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_like(
    product_id: int = FPath(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    like = (
        db.query(ProductLike)
        .filter(ProductLike.user_id == current_user.id, ProductLike.product_id == product_id)
        .first()
    )
    if like:
        db.delete(like)
        db.commit()
    return None


# Marcar mensaje enviado: POST /api/likes/{product_id}/message
@router.post("/{product_id}/message", status_code=status.HTTP_200_OK)
def mark_message_sent(
    product_id: int = FPath(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    like = (
        db.query(ProductLike)
        .filter(ProductLike.user_id == current_user.id, ProductLike.product_id == product_id)
        .first()
    )
    if not like:
        raise HTTPException(status_code=404, detail="Like no encontrado")

    like.message_sent = True
    like.expires_at = None  # si ya mandó mensaje, no expira por inactividad
    db.commit()
    return {"ok": True}


# Lista mis likes (formato original): GET /api/likes/me
@router.get("/me", response_model=LikesMeRead)
def list_my_likes(
    request: Request,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    likes = (
        db.query(ProductLike)
        .options(
            selectinload(ProductLike.product).selectinload(Product.images),
            selectinload(ProductLike.product).selectinload(Product.owner),  # 👈 NUEVO
        )
        .filter(ProductLike.user_id == current_user.id)
        .order_by(ProductLike.created_at.desc())
        .all()
    )

    cleaned_items: List[ProductLikeRead] = []
    dirty_ids: List[int] = []
    for l in likes:
        if not l.product or not l.product.is_active:
            dirty_ids.append(l.id)
            continue
        cleaned_items.append(
            ProductLikeRead(
                id=l.id,
                note=l.note,
                created_at=l.created_at,
                product=_product_to_read(l.product, request),
            )
        )
    if dirty_ids:
        db.query(ProductLike).filter(ProductLike.id.in_(dirty_ids)).delete(synchronize_session=False)
        db.commit()

    # 👇 mantenemos el formato original y añadimos people vacía
    return LikesMeRead(people=[], products=cleaned_items)


# ---------------------------------------------------------
# UTILIDADES PARA EL FEED (NO ROMPEN NADA EXISTENTE)
# ---------------------------------------------------------

# saber si ya likeé un producto (para ocultarlo en el Home)
@router.get("/check/{product_id}")
def has_like_for_product(
    product_id: int = FPath(..., ge=1),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    exists = (
        db.query(ProductLike)
        .filter(
            ProductLike.user_id == current_user.id,
            ProductLike.product_id == product_id,
        )
        .first()
        is not None
    )
    return {"liked": exists}


# obtener todos los product_ids likeados por mí (para filtrar rápido en frontend)
class _IdsResponse(BaseModel):
    product_ids: List[int]

@router.get("/ids", response_model=_IdsResponse)
def liked_product_ids(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    ids = [
        row.product_id
        for row in db.query(ProductLike.product_id)
        .filter(ProductLike.user_id == current_user.id)
        .all()
    ]
    return _IdsResponse(product_ids=ids)
