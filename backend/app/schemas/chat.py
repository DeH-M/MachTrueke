from __future__ import annotations
from typing import Optional, List
from pydantic import BaseModel, Field


class MessageCreate(BaseModel):
    body: str = Field(min_length=1, max_length=2000)


class MessageRead(BaseModel):
    id: int
    conversation_id: int
    sender_id: int
    body: str
    created_at: str
    read_at: Optional[str] = None

    model_config = {"from_attributes": True}


class ConversationStart(BaseModel):
    other_user_id: int
    product_id: Optional[int] = None


class ConversationRead(BaseModel):
    id: int
    product_id: Optional[int] = None
    user1_id: int
    user2_id: int
    last_message: Optional[MessageRead] = None
    unread_count: int

    model_config = {"from_attributes": True}
