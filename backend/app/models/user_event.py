# /backend/app/models/user_event.py
from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, func, CheckConstraint
from app.core.db import Base

class UserEvent(Base):
    __tablename__ = "user_events"

    id = Column(Integer, primary_key=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False)
    event_type = Column(String, nullable=False)
    created_at = Column(DateTime, server_default=func.now())

    __table_args__ = (
        CheckConstraint("event_type in ('view','like','dismiss','match')", name="event_type_chk"),
    )
