# backend/app/routers/public_profiles.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from ..deps import get_db
from ..models.user import User
from ..models.product import Product  # ajusta si tu modelo está en otro path


router = APIRouter(prefix="/api/public", tags=["public"])

@router.get("/profile/{user_id}")
def get_public_profile(user_id: int, db: Session = Depends(get_db)):
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="Usuario no encontrado")

    products = (
        db.query(Product)
        .filter(Product.owner_id == user_id, Product.is_active == True)
        .order_by(Product.id.desc())
        .all()
    )
    return {"user": user, "products": products}
