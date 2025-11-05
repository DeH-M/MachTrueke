# app/models/product.py

from sqlalchemy import Column, Integer, String, Text, Boolean, ForeignKey, DateTime, func
from sqlalchemy.orm import relationship
from ..core.db import Base


class Product(Base):
    __tablename__ = "products"

    id = Column(Integer, primary_key=True, index=True)
    title = Column(String(120), nullable=False, index=True)
    description = Column(Text, nullable=False)

    # Si borran el usuario, se borran sus productos (nivel BD)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())

    # Relaciones
    # passive_deletes=True: deja que la BD haga la cascada sin cargar hijos
    owner = relationship("User", back_populates="products", passive_deletes=True)

    # Imágenes: se eliminan al borrar el producto
    images = relationship(
        "ProductImage",
        cascade="all, delete-orphan",
        back_populates="product",
        lazy="joined",
        passive_deletes=True,
    )

    # Likes: se eliminan al borrar el producto (requiere ondelete="CASCADE" en ProductLike.product_id)
    likes = relationship(
        "ProductLike",
        cascade="all, delete-orphan",
        back_populates="product",
        passive_deletes=True,
    )


class ProductImage(Base):
    __tablename__ = "product_images"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="CASCADE"), index=True, nullable=False)
    url = Column(String(300), nullable=False)  # ruta/URL pública de la imagen

    product = relationship("Product", back_populates="images", passive_deletes=True)
