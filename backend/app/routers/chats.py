from __future__ import annotations
from typing import List, Optional

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy import or_, and_, desc
from sqlalchemy.orm import Session

from ..core.db import get_db
from ..core.security import get_current_user
from ..models.user import User
from ..models.chat import Conversation, Message
from ..models.product import Product
from ..schemas.chat import (
    ConversationStart, ConversationRead,
    MessageCreate, MessageRead
)

router = APIRouter(prefix="/chats", tags=["chats"])


def _order_pair(a: int, b: int) -> tuple[int, int]:
    return (a, b) if a < b else (b, a)


@router.post("/start", response_model=ConversationRead)
def start_conversation(
    payload: ConversationStart,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    if payload.other_user_id == me.id:
        raise HTTPException(400, "No puedes chatear contigo mismo")

    product_id = None
    if payload.product_id is not None:
        product = db.get(Product, payload.product_id)
        if not product:
            raise HTTPException(404, "Producto no encontrado")
        product_id = product.id

    u1, u2 = _order_pair(me.id, payload.other_user_id)

    conv = (
        db.query(Conversation)
        .filter(
            Conversation.user1_id == u1,
            Conversation.user2_id == u2,
            Conversation.product_id.is_(product_id),
        )
        .first()
    )
    if not conv:
        conv = Conversation(user1_id=u1, user2_id=u2, product_id=product_id)
        db.add(conv)
        db.commit()
        db.refresh(conv)

    if me.id == conv.user1_id and conv.hidden_for_user1:
        conv.hidden_for_user1 = False
        db.commit()
    elif me.id == conv.user2_id and conv.hidden_for_user2:
        conv.hidden_for_user2 = False
        db.commit()

    return _conversation_for_read(db, conv, me.id)


@router.get("", response_model=List[ConversationRead])
def list_my_conversations(
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
    limit: int = Query(20, ge=1, le=100),
    offset: int = Query(0, ge=0),
):
    base = db.query(Conversation).filter(
        or_(Conversation.user1_id == me.id, Conversation.user2_id == me.id)
    )

    base = base.filter(
        or_(
            and_(Conversation.user1_id == me.id, Conversation.hidden_for_user1.is_(False)),
            and_(Conversation.user2_id == me.id, Conversation.hidden_for_user2.is_(False)),
        )
    ).order_by(desc(Conversation.updated_at)).offset(offset).limit(limit)

    conversations = base.all()
    return [_conversation_for_read(db, c, me.id) for c in conversations]


@router.get("/{conversation_id}/messages", response_model=List[MessageRead])
def get_messages(
    conversation_id: int,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    conv = db.get(Conversation, conversation_id)
    if not conv or (me.id not in (conv.user1_id, conv.user2_id)):
        raise HTTPException(404, "Conversación no encontrada")

    rows = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id, Message.is_deleted_by_sender.is_(False))
        .order_by(Message.id)
        .all()
    )

    # marcar como leídos
    for m in rows:
        if m.sender_id != me.id and m.read_at is None:
            m.read_at = m.created_at
    db.commit()
    return rows


@router.post("/{conversation_id}/messages", response_model=MessageRead, status_code=201)
def send_message(
    conversation_id: int,
    payload: MessageCreate,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    conv = db.get(Conversation, conversation_id)
    if not conv or (me.id not in (conv.user1_id, conv.user2_id)):
        raise HTTPException(404, "Conversación no encontrada")

    msg = Message(conversation_id=conv.id, sender_id=me.id, body=payload.body)
    db.add(msg)
    conv.updated_at = None
    db.commit()
    db.refresh(msg)
    return msg


@router.delete("/{conversation_id}", status_code=204)
def hide_conversation(
    conversation_id: int,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    conv = db.get(Conversation, conversation_id)
    if not conv or (me.id not in (conv.user1_id, conv.user2_id)):
        raise HTTPException(404, "Conversación no encontrada")

    if me.id == conv.user1_id:
        conv.hidden_for_user1 = True
    else:
        conv.hidden_for_user2 = True

    db.commit()
    return None


def _conversation_for_read(db: Session, conv: Conversation, viewer_id: int) -> ConversationRead:
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id, Message.is_deleted_by_sender.is_(False))
        .order_by(desc(Message.id))
        .first()
    )
    unread = (
        db.query(Message)
        .filter(
            Message.conversation_id == conv.id,
            Message.sender_id != viewer_id,
            Message.read_at.is_(None),
            Message.is_deleted_by_sender.is_(False),
        )
        .count()
    )
    from ..schemas.chat import ConversationRead
    return ConversationRead(
        id=conv.id,
        product_id=conv.product_id,
        user1_id=conv.user1_id,
        user2_id=conv.user2_id,
        last_message=last_msg,
        unread_count=unread,
    )
