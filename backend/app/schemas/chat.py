# backend/app/schemas/chat.py
from __future__ import annotations

from datetime import datetime
from typing import Optional, Literal, List
from pydantic import BaseModel, Field


# =======================
# Inputs (requests)
# =======================
class OpenThreadIn(BaseModel):
    """Abrir/crear un hilo con un usuario (opcionalmente asociado a un producto)."""
    peer_id: int = Field(..., gt=0)
    product_id: Optional[int] = Field(None, gt=0)


class SendTextIn(BaseModel):
    """Enviar mensaje de texto a un hilo existente (el thread/chat va en la URL)."""
    text: str = Field(..., min_length=1, max_length=2000)


# =======================
# Outputs (responses)
# =======================
class UserMini(BaseModel):
    id: int
    name: Optional[str] = None           # <- el front usa "name"
    avatar_url: Optional[str] = None

    class Config:
        from_attributes = True


class MessageRead(BaseModel):
    id: str                               # <- flexible para mocks ("m-123")
    from_me: bool
    type: Literal["text", "image"] = "text"
    text: Optional[str] = None
    url: Optional[str] = None
    name: Optional[str] = None
    at: Optional[datetime] = None

    class Config:
        from_attributes = True


class ChatRead(BaseModel):
    """Resumen de chat (shape plano que usa el front y devuelve tu router)."""
    id: str
    peer: UserMini
    last_message_at: Optional[datetime] = None
    last_message_text: str = ""
    unread_count: int = 0
    product_id: Optional[int] = None
    # hacerlo opcional evita errores mientras migras a un modelo con hilos
    thread: Optional[str] = None

    class Config:
        from_attributes = True


# =======================
# NEW: conversación completa con historial
# =======================
class ConversationRead(BaseModel):
    """Detalle completo de una conversación: participantes + historial."""
    id: int
    participants: List[UserMini] = []
    messages: List[MessageRead] = []
    created_at: Optional[datetime] = None

    class Config:
        from_attributes = True


__all__ = [
    "OpenThreadIn",
    "SendTextIn",
    "UserMini",
    "MessageRead",
    "ChatRead",
    "ConversationRead",  # <- agregado
]
