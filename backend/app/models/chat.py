from __future__ import annotations
from datetime import datetime

from sqlalchemy import (
    Column, Integer, ForeignKey, Text, DateTime, Boolean, UniqueConstraint
)
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from ..core.db import Base


class Conversation(Base):
    __tablename__ = "conversations"

    id = Column(Integer, primary_key=True)
    product_id = Column(Integer, ForeignKey("products.id", ondelete="SET NULL"), nullable=True)

    user1_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)
    user2_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False, index=True)

    hidden_for_user1 = Column(Boolean, default=False, nullable=False)
    hidden_for_user2 = Column(Boolean, default=False, nullable=False)

    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now(), nullable=False)

    __table_args__ = (
        UniqueConstraint("product_id", "user1_id", "user2_id", name="uq_conversation_uniqueness"),
    )

    product = relationship("Product")
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    messages = relationship("Message", back_populates="conversation", cascade="all, delete-orphan")


class Message(Base):
    __tablename__ = "messages"

    id = Column(Integer, primary_key=True)
    conversation_id = Column(Integer, ForeignKey("conversations.id", ondelete="CASCADE"), index=True, nullable=False)
    sender_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), index=True, nullable=False)

    body = Column(Text, nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False)
    read_at = Column(DateTime(timezone=True), nullable=True)
    is_deleted_by_sender = Column(Boolean, default=False, nullable=False)

    conversation = relationship("Conversation", back_populates="messages")
    sender = relationship("User")
