from __future__ import annotations

from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Text, ForeignKey, Boolean
from sqlalchemy.orm import Mapped, mapped_column, relationship
from sqlalchemy.sql import func
from ..core.db import Base


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True, index=True)

    username: Mapped[str] = mapped_column(String(30), unique=True, index=True)
    full_name: Mapped[str] = mapped_column("name", String(255), nullable=True)
    email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
    hashed_password: Mapped[str] = mapped_column(String(255), nullable=False)

    campus_id: Mapped[int | None] = mapped_column(
        ForeignKey("campus.id", ondelete="SET NULL"), nullable=True
    )
    campus = relationship("Campus", back_populates="users", lazy="joined")

    bio: Mapped[str | None] = mapped_column(Text, nullable=True)
    avatar_url: Mapped[str | None] = mapped_column(String(255), nullable=True)

    is_active: Mapped[bool] = mapped_column(Boolean, default=True, server_default="true")
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    # 👇 IMPORTANTE: evitar cargas recursivas por defecto
    products = relationship(
        "Product",
        back_populates="owner",
        lazy="noload",
    )

    product_likes: Mapped[list["ProductLike"]] = relationship(
        "ProductLike",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="noload",
    )

    conversations = relationship(
        "ConversationParticipant",
        back_populates="user",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="noload",
    )

    messages_sent = relationship(
        "Message",
        back_populates="sender",
        cascade="all, delete-orphan",
        passive_deletes=True,
        lazy="noload",
    )
