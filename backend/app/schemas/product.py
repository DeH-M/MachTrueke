from pydantic import BaseModel, Field
from typing import Optional, List

class ProductBase(BaseModel):
    title: str = Field(..., min_length=1, max_length=120)
    description: str = Field(..., min_length=1, max_length=2000)

class ProductCreate(ProductBase):
    # Las imágenes vendrán por multipart (UploadFile), así que aquí no van
    pass

class ProductUpdate(BaseModel):
    title: Optional[str] = Field(None, min_length=1, max_length=120)
    description: Optional[str] = Field(None, min_length=1, max_length=2000)
    is_active: Optional[bool] = None

class ProductImageRead(BaseModel):
    id: int
    url: str
    class Config:
        from_attributes = True

class ProductRead(ProductBase):
    id: int
    owner_id: int
    is_active: bool
    images: List[ProductImageRead] = []
    class Config:
        from_attributes = True
