# app/schemas/like.py
from __future__ import annotations

from datetime import datetime
from typing import List, Optional

from pydantic import BaseModel

# Importa el esquema de producto que ya tienes
# (asegúrate que existe app/schemas/product.py con ProductRead y ProductImageRead)
from app.schemas.product import ProductRead


class ProductLikeCreate(BaseModel):
    """
    Payload opcional para crear/actualizar un like (nota opcional).
    Cuando haces POST /likes con body { product_id, note? }, el note llega aquí.
    """
    note: Optional[str] = None


class ProductLikeRead(BaseModel):
    """
    Respuesta de un like individual que devuelve el backend.
    Contiene el producto 'expandido' usando ProductRead.
    """
    id: int
    note: Optional[str] = None
    created_at: datetime
    product: ProductRead

    class Config:
        from_attributes = True  # pydantic v2: antes 'orm_mode = True'


class LikesMeRead(BaseModel):
    """
    Respuesta "original" de /api/likes/me que tu backend usa en otra ruta:
    - people: por ahora una lista vacía (placeholder)
    - products: lista de ProductLikeRead
    """
    people: List[dict] = []
    products: List[ProductLikeRead] = []

    class Config:
        from_attributes = True
