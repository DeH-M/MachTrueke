# /backend/app/schemas/events.py
from pydantic import BaseModel, Field

class EventIn(BaseModel):
    product_id: int = Field(..., gt=0)
    event_type: str = Field(..., pattern="^(view|like|dismiss|match)$")

class EventOut(BaseModel):
    ok: bool
