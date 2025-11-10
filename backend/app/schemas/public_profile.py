from pydantic import BaseModel
from typing import List

class PublicUserRead(BaseModel):
    id: int
    name: str
    email: str | None = None          # si no quieres exponerlo, bórralo
    campus: str | None = None
    avatar_url: str | None = None
    tagline: str | None = None        # “She likes mee…”
    class Config:
        from_attributes = True

class ProductImageRead(BaseModel):
    id: int
    url: str
    class Config:
        from_attributes = True

class ProductRead(BaseModel):
    id: int
    title: str
    description: str
    is_active: bool
    images: List[ProductImageRead] = []
    class Config:
        from_attributes = True

class PublicProfileRead(BaseModel):
    user: PublicUserRead
    products: List[ProductRead]
