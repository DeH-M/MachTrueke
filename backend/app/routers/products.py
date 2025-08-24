from typing import List
from fastapi import APIRouter, Depends, status
from sqlalchemy.orm import Session
from ..core.db import get_db
from ..core.security import get_current_user
from ..models.product import Product
from ..models.user import User
from ..schemas.product import ProductCreate, ProductRead

router = APIRouter()

@router.get("/", response_model=List[ProductRead])
def list_products(db: Session = Depends(get_db)):
    return db.query(Product).order_by(Product.id.desc()).all()

@router.post("/", response_model=ProductRead, status_code=status.HTTP_201_CREATED)
def create_product(
    payload: ProductCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)   # <-- IMPORTANTE
):
    product = Product(
        title=payload.title,
        description=payload.description,
        owner_id=current_user.id
    )
    db.add(product)
    db.commit()
    db.refresh(product)
    return product
