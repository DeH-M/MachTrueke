# /backend/app/routers/events.py
from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from sqlalchemy import text
from app.deps import get_db, get_current_user
from app.models.user_event import UserEvent
from app.schemas.events import EventIn, EventOut

router = APIRouter()

@router.post("", response_model=EventOut)
def add_event(payload: EventIn, db: Session = Depends(get_db), user=Depends(get_current_user)):
    # 1) Validar existencia del producto
    prod = db.execute(
        text("SELECT id, owner_id FROM public.products WHERE id=:pid"),
        {"pid": payload.product_id},
    ).mappings().first()
    if not prod:
        raise HTTPException(status_code=404, detail="Producto no encontrado")

    # 2) Regla de negocio: no permitir self-like/dismiss/match (sí permitimos 'view' en propio)
    if prod["owner_id"] == user.id and payload.event_type != "view":
        raise HTTPException(status_code=400, detail="No puedes interactuar con tu propio producto")

    # 3) Insertar evento
    db.add(UserEvent(user_id=user.id, product_id=payload.product_id, event_type=payload.event_type))
    db.commit()
    return EventOut(ok=True)
