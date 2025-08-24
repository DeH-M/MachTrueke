from pydantic import BaseModel
from typing import Optional

# Datos que llegan al crear un producto (request)
class ProductCreate(BaseModel):
    title: str
    description: Optional[str] = None

# Datos que regresamos al cliente (response)
class ProductRead(BaseModel):
    id: int
    title: str
    description: Optional[str] = None
    owner_id: int

    class Config:
        # Para que Pydantic pueda leer desde objetos SQLAlchemy
        from_attributes = True  # (en Pydantic v1: orm_mode = True)
