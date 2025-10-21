from __future__ import annotations

from datetime import datetime 
from sqlalchemy import Column, Integer, String, DateTime
from sqlalchemy import String, Text, ForeignKey, Boolean, func
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
from ..core.db import Base

class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    # NUEVO: username (editable, único)
    username: Mapped[str] = mapped_column(String(30), unique=True, index=True)

    # Reutiliza la columna existente "name" pero como atributo full_name (NO rompe tu DB)
    full_name: Mapped[str] = mapped_column("name", String(255), nullable=True)

    # Aumentamos tamaño a 255 (Alembic lo migra). Mantiene nombre y unicidad.
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)

    # Conservamos tu nombre de columna para contraseña
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    # NUEVO: campus (opcional)
    campus_id: Mapped[int | None] = mapped_column(
        ForeignKey("campus.id", ondelete="SET NULL"), nullable=True
    )
    campus = relationship("Campus", back_populates="users", lazy="joined")

    # NUEVOS: para edición de perfil
    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    # Estado y timestamps
    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )

    # Relación existente (no la tocamos)
    products = relationship("Product", back_populates="owner")
