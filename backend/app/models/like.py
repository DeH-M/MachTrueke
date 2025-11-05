# app/models/like.py
from datetime import datetime, timedelta
from sqlalchemy import Column, Integer, ForeignKey, DateTime, String, UniqueConstraint, Boolean
from sqlalchemy.orm import relationship
from ..core.db import Base

class ProductLike(Base):
    __tablename__ = "product_likes"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), nullable=False, index=True)
    note = Column(String(200), nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # NUEVOS CAMPOS
    message_sent = Column(Boolean, default=False, nullable=False)  # si ya se abrió una conversación (protege del borrado)
    expires_at = Column(DateTime, nullable=True)  # fecha límite para borrado automático

    __table_args__ = (UniqueConstraint("user_id", "product_id", name="uq_like_user_product"),)

    # 🔁 Relaciones SIN backref para evitar el choque:
    #    - Deben empatar con:
    #        Product.likes = relationship("ProductLike", back_populates="product", ...)
    #        User.product_likes = relationship("ProductLike", back_populates="user", ...)
    user = relationship("User", back_populates="product_likes", passive_deletes=True)
    product = relationship("Product", back_populates="likes", passive_deletes=True)

    def set_expiration(self, days: int = 3):
        self.expires_at = datetime.utcnow() + timedelta(days=days)
