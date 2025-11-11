# backend/app/routers/chats.py
from typing import Optional, List
from fastapi import APIRouter, Depends, HTTPException, UploadFile, File
from sqlalchemy.orm import Session
from sqlalchemy import func, and_
# 🔹 NUEVO: imports para subqueries select() y fallback SQL
from sqlalchemy import select, text
from sqlalchemy.exc import IntegrityError
import asyncio  # para disparar broadcast async en background
import anyio    # 🔹 AGREGADO: para ejecutar corrutinas desde thread
import json  # ← NUEVO, para serializar el evento

# Deps y usuario actual
from ..deps import get_current_user, get_db
from ..models.user import User

# (Cuando tengas los modelos reales, descomenta y usa)
# from ..models.chat import Chat, ChatParticipant
# from ..models.message import Message

# Esquemas Pydantic para respuestas/entradas
from ..schemas.chat import ChatRead, OpenThreadIn, MessageRead, SendTextIn

# =======================
# NUEVO: WebSocket
# =======================
from fastapi import WebSocket, WebSocketDisconnect
from app.core.ws_manager import manager

# =======================
# NUEVO: Modelos reales
# =======================
from ..models.chat import Conversation, ConversationParticipant, Message

router = APIRouter(prefix="/api/chats", tags=["chats"])


# ===================================================================
# === NUEVO: helpers HTTP + WebSocket para salas (room_id estable) ===
# ===================================================================
def _room_id_for_users(a: int, b: int, product_id: Optional[int]) -> str:
    """
    Genera un room_id estable y simétrico entre dos usuarios.
    Si hay product_id, lo incorpora para hilos por producto.
    (Tu tabla Conversation no tiene product_id; lo incluimos solo en el room_id.)
    """
    u1, u2 = sorted([int(a), int(b)])
    if product_id:
        return f"u{u1}-u{u2}-p{int(product_id)}"
    return f"u{u1}-u{u2}"


@router.get("/room-id")
def get_room_id(
    peer_id: int,
    product_id: Optional[int] = None,
    me: User = Depends(get_current_user),
):
    """
    Devuelve el room_id WS para hablar con 'peer_id' (y opcionalmente por producto).
    Útil para que el frontend construya ws://.../api/chats/ws/{room_id}
    """
    return {"room_id": _room_id_for_users(me.id, peer_id, product_id)}


@router.websocket("/ws/{room_id}")
async def websocket_chat(ws: WebSocket, room_id: str):
    """
    WebSocket simple por sala:
      - Conecta al usuario en la sala `room_id`
      - Reenvía a todos los conectados en esa sala cualquier texto recibido
    El frontend solo necesita abrir: ws://<host>/api/chats/ws/{room_id}
    """
    await manager.connect(room_id, ws)
    try:
        while True:
            data = await ws.receive_text()
            await manager.broadcast(room_id, data)
    except WebSocketDisconnect:
        manager.disconnect(room_id, ws)


# =======================
# NUEVO: helper de persistencia
# =======================
def _get_or_create_conversation(db: Session, me_id: int, peer_id: int) -> Conversation:
    """
    Busca una conversación entre 'me_id' y 'peer_id' (exactamente esos dos).
    Si no existe, la crea con ambos participantes.
    """
    # Conversaciones donde participo yo
    my_conv_ids = (
        db.query(ConversationParticipant.conversation_id)
        .filter(ConversationParticipant.user_id == me_id)
        .subquery()
    )
    # De esas, filtra las que también tenga el peer
    conv = (
        db.query(Conversation)
        .join(ConversationParticipant, Conversation.id == ConversationParticipant.conversation_id)
        .filter(
            # 🔹 select() para evitar SAWarning (IN con subquery)
            Conversation.id.in_(select(my_conv_ids.c.conversation_id)),
            ConversationParticipant.user_id == peer_id,
        )
        .first()
    )

    if conv:
        return conv

    # Crear nueva conversación con ambos participantes
    conv = Conversation()
    db.add(conv)
    try:
        db.flush()  # obtiene conv.id sin cerrar transacción
    except IntegrityError:
        # 🔹 Fallback: tu tabla conversations puede exigir user1_id/user2_id NOT NULL
        db.rollback()
        # Intento 1: con flags hidden_* (si existen y son NOT NULL)
        try:
            conv_id = db.execute(
                text(
                    "insert into conversations (user1_id, user2_id, hidden_for_user1, hidden_for_user2) "
                    "values (:a, :b, false, false) returning id"
                ),
                {"a": me_id, "b": peer_id},
            ).scalar_one()
        except Exception:
            # Intento 2: solo user1_id/user2_id (por si tu tabla no tiene los hidden_*)
            conv_id = db.execute(
                text(
                    "insert into conversations (user1_id, user2_id) "
                    "values (:a, :b) returning id"
                ),
                {"a": me_id, "b": peer_id},
            ).scalar_one()

        conv = db.query(Conversation).get(conv_id)

    db.add_all(
        [
            ConversationParticipant(conversation_id=conv.id, user_id=me_id),
            ConversationParticipant(conversation_id=conv.id, user_id=peer_id),
        ]
    )
    db.commit()
    db.refresh(conv)
    return conv


# =======================
# NUEVO: helper para mensaje de origen de producto (sin tarjeta)
# =======================
def _send_origin_message_if_needed(
    db: Session,
    conv_id: int,
    me_id: int,
    product_id: Optional[int],
):
    """
    Inserta un mensaje de origen cuando el chat se abre desde un producto.
    - SIEMPRE que venga product_id, pero evita duplicados inmediatos
      si el último mensaje ya es el mismo aviso.
    """
    if not product_id:
        return None

    # Trae el título del producto
    row = db.execute(
        text("SELECT title FROM public.products WHERE id = :pid"),
        {"pid": int(product_id)},
    ).mappings().first()
    if not row:
        return None

    text_msg = f"¡Hola! 😊 Me interesa hacer un trueque por: {row['title']}"


    # Anti-duplicado: si el último mensaje ya es idéntico, no lo repitas
    last = (
        db.query(Message)
        .filter(Message.conversation_id == conv_id)
        .order_by(Message.id.desc())
        .first()
    )
    if last and (last.text or "") == text_msg:
        return None

    # Inserta mensaje normal de texto
    m = Message(
        conversation_id=conv_id,
        sender_id=me_id,
        type="text",
        text=text_msg,
        image_url=None,
    )
    db.add(m)
    db.commit()
    db.refresh(m)

    # Broadcast WS (mismo mecanismo que ya usas)
    parts = (
        db.query(ConversationParticipant.user_id)
        .filter(ConversationParticipant.conversation_id == conv_id)
        .all()
    )
    uids = [p.user_id for p in parts]
    peer_id = next((u for u in uids if u != me_id), me_id)
    room_id = _room_id_for_users(me_id, peer_id, product_id=None)

    payload = json.dumps({
        "type": "message.created",
        "chat_id": str(conv_id),
        "message": {
            "id": str(m.id),
            "text": m.text,
            "sender_id": me_id,
            "from_me": True,
            "type": "text",
            "at": m.created_at.isoformat() if m.created_at else None,
        },
    })

    try:
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(room_id, payload))
    except RuntimeError:
        try:
            anyio.from_thread.run(manager.broadcast, room_id, payload)
        except TypeError:
            manager.broadcast(room_id, payload)
    except TypeError:
        manager.broadcast(room_id, payload)

    return m


@router.get("", response_model=List[ChatRead])
def list_threads(
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """
    Lista hilos del usuario autenticado.
    (MOCK por ahora: regresar lista vacía hasta conectar con DB)
    """
    # TODO: Reemplazar por query real de hilos del usuario "me"
    # --------------------- NUEVO: implementación mínima ---------------------
    # Todas las conversaciones donde participa 'me'
    my_convs = (
        db.query(Conversation.id)
        .join(ConversationParticipant)
        .filter(ConversationParticipant.user_id == me.id)
        .subquery()
    )

    # Último mensaje por conversación
    last_msg_sub = (
        db.query(
            Message.conversation_id.label("cid"),
            func.max(Message.id).label("last_id"),
        )
        # 🔹 select() para evitar SAWarning (IN con subquery)
        .filter(Message.conversation_id.in_(select(my_convs.c.id)))
        .group_by(Message.conversation_id)
        .subquery()
    )

    # Trae peer y último mensaje (si existe)
    results = (
        db.query(
            Conversation.id.label("cid"),
            User.id.label("peer_id"),
            User.full_name.label("peer_name"),
            User.username.label("peer_username"),  # ← agregado: username
            User.avatar_url.label("peer_avatar"),
            Message.text.label("last_text"),
            Message.created_at.label("last_at"),
        )
        .join(ConversationParticipant, Conversation.id == ConversationParticipant.conversation_id)
        .join(User, and_(User.id == ConversationParticipant.user_id, User.id != me.id))
        .outerjoin(last_msg_sub, last_msg_sub.c.cid == Conversation.id)
        .outerjoin(Message, and_(Message.id == last_msg_sub.c.last_id))
        # 🔹 select() para evitar SAWarning (IN con subquery)
        .filter(Conversation.id.in_(select(my_convs.c.id)))
        .all()
    )

    items: List[ChatRead] = []
    for r in results:
        items.append(
            ChatRead(
                id=str(r.cid),
                peer={"id": int(r.peer_id), "name": r.peer_username or r.peer_name, "avatar_url": r.peer_avatar},
                last_message_at=r.last_at,
                last_message_text=r.last_text or "",
                unread_count=0,  # pendiente si luego agregas "read_at" por usuario
                product_id=None,
                thread=None,
            )
        )
    return items
    # ------------------- FIN NUEVO -------------------


@router.post("/open", response_model=ChatRead)
def open_thread(
    payload: OpenThreadIn,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """
    Abre (o crea si no existe) un hilo entre 'me' y 'peer_id'.
    Devuelve el hilo (MOCK mínimo mientras conectas con tus modelos).
    """
    peer_id = payload.peer_id
    product_id = payload.product_id

    if not peer_id:
        raise HTTPException(status_code=400, detail="peer_id requerido")
    if peer_id == me.id:
        raise HTTPException(status_code=400, detail="No puedes chatear contigo misma/o")

    # TODO:
    # 1) Buscar si ya existe (me <-> peer_id) y (product_id) si aplica.
    # 2) Si no existe, crear Chat + participantes.
    # 3) Devolver Chat con último mensaje, unread_count, etc.

    # --- NUEVO: busca/crea de verdad ---
    conv = _get_or_create_conversation(db, me.id, peer_id)

    # --- NUEVO: inserta mensaje de origen si viene product_id (sin duplicar último) ---
    _send_origin_message_if_needed(
        db=db,
        conv_id=conv.id,
        me_id=me.id,
        product_id=product_id,
    )

    # Peer (para el resumen)
    peer: User = db.query(User).filter(User.id == peer_id).first()
    # Último mensaje (si hay)
    last_msg = (
        db.query(Message)
        .filter(Message.conversation_id == conv.id)
        .order_by(Message.id.desc())
        .first()
    )

    return ChatRead(
        id=str(conv.id),
        peer={"id": int(peer.id), "name": peer.username if peer else "Usuario", "avatar_url": peer.avatar_url} if peer else {"id": int(peer_id), "name": "Usuario", "avatar_url": None},
        last_message_at=last_msg.created_at if last_msg else None,
        last_message_text=last_msg.text if last_msg else "",
        unread_count=0,
        product_id=product_id,
        thread=None,
    )


@router.get("/{chat_id}/messages", response_model=List[MessageRead])
def list_messages(
    chat_id: str,
    after: Optional[str] = None,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """
    Lista mensajes de un chat. Param 'after' opcional para paginación.
    (MOCK: sin mensajes por ahora)
    """
    # TODO: filtrar por chat_id y 'after', validar que 'me' pertenece al chat
    # --------------------- NUEVO: implementación real ----------------------
    try:
        conv_id = int(chat_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chat no válido")

    # Seguridad básica: pertenezco a la conversación
    belongs = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id == me.id,
        )
        .first()
    )
    if not belongs:
        raise HTTPException(status_code=403, detail="No perteneces a este chat")

    q = db.query(Message).filter(Message.conversation_id == conv_id)
    if after:
        try:
            after_id = int(after)
            q = q.filter(Message.id > after_id)
        except ValueError:
            pass

    msgs = q.order_by(Message.id.asc()).all()

    out: List[MessageRead] = []
    for m in msgs:
        out.append(
            MessageRead(
                id=str(m.id),
                from_me=(m.sender_id == me.id),
                type=m.type or "text",
                text=m.text,
                url=m.image_url,
                name=None,
                at=m.created_at,
            )
        )
    return out
    # ------------------- FIN NUEVO -------------------


@router.post("/{chat_id}/messages", response_model=MessageRead)
def send_text(
    chat_id: str,
    data: SendTextIn,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """
    Envía un mensaje de texto al chat.
    (MOCK: devuelve el mensaje sin persistir)
    """
    if not data.text or not data.text.strip():
        raise HTTPException(status_code=400, detail="texto vacío")

    # TODO: insertar Message real en DB y devolverlo
    # --------------------- NUEVO: persistencia + broadcast ------------------
    try:
        conv_id = int(chat_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chat no válido")

    # seguridad: pertenezco a la conversación
    belongs = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id == me.id,
        )
        .first()
    )
    if not belongs:
        raise HTTPException(status_code=403, detail="No perteneces a este chat")

    m = Message(
        conversation_id=conv_id,
        sender_id=me.id,
        type="text",
        text=data.text.strip(),
        image_url=None,
        #  * Blindaje por si en alguna BD no están bien los defaults
    )

    # 🔹 AGREGADO PARA FUNCIONAR ENVÍO
    # Estas columnas no existen en tu modelo real, por eso causaban error 500.
    # Las eliminamos antes de insertar para que funcione.
    #if not hasattr(Message, "is_deleted_by_sender"):
    #   delattr(m, "is_deleted_by_sender")
    #if not hasattr(Message, "is_deleted_by_receiver"):
    #    delattr(m, "is_deleted_by_receiver")
    # 🔹 FIN AGREGADO

    db.add(m)
    db.commit()
    db.refresh(m)

    # Broadcast WS (opcional pero útil): sala basada en ambos usuarios
    # Descubre el peer para construir el mismo room_id que usa el front
    parts = (
        db.query(ConversationParticipant.user_id)
        .filter(ConversationParticipant.conversation_id == conv_id)
        .all()
    )
    uids = [p.user_id for p in parts]
    peer_id = next((u for u in uids if u != me.id), me.id)
    room_id = _room_id_for_users(me.id, peer_id, product_id=None)

    # Enviar un JSON simple (el front decide cómo renderizar)
    import json
    payload = json.dumps({
        "type": "message.created",
        "chat_id": str(chat_id),
        "message": {
            "id": str(m.id),
            "text": m.text,
            "sender_id": me.id,
            "from_me": True,
            "type": "text",
            "at": m.created_at.isoformat() if m.created_at else None,
        },
    })

    # 🔹 AJUSTE: correr broadcast tanto si hay event loop como si no (endpoint síncrono)
    try:
        # si estamos en un endpoint async con loop activo
        loop = asyncio.get_running_loop()
        loop.create_task(manager.broadcast(room_id, payload))
    except RuntimeError:
        # no hay loop (estamos en thread) → ejecutar corrutina en el loop principal
        try:
            anyio.from_thread.run(manager.broadcast, room_id, payload)
        except TypeError:
            # si manager.broadcast es síncrono
            manager.broadcast(room_id, payload)
    except TypeError:
        # si manager.broadcast es síncrono
        manager.broadcast(room_id, payload)

    return MessageRead(
        id=str(m.id),
        from_me=True,
        type="text",
        text=m.text,
        url=None,
        name=None,
        at=m.created_at,
    )
    # ------------------- FIN NUEVO -------------------


@router.post("/{chat_id}/attachments", response_model=List[MessageRead])
def send_attachments(
    chat_id: str,
    files: List[UploadFile] = File(...),
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """
    Sube adjuntos (imágenes) al chat.
    (Guarda en /media/chat/<chat_id>/ y crea mensajes type='image')
    """
    # --- Validaciones mínimas: pertenezco al chat ---
    try:
        conv_id = int(chat_id)
    except ValueError:
        raise HTTPException(status_code=404, detail="Chat no válido")

    belongs = (
        db.query(ConversationParticipant)
        .filter(
            ConversationParticipant.conversation_id == conv_id,
            ConversationParticipant.user_id == me.id,
        )
        .first()
    )
    if not belongs:
        raise HTTPException(status_code=403, detail="No perteneces a este chat")

    # --- Descubre peer y room_id para broadcast WS (una sola vez) ---
    parts = (
        db.query(ConversationParticipant.user_id)
        .filter(ConversationParticipant.conversation_id == conv_id)
        .all()
    )
    uids = [p.user_id for p in parts]
    peer_id = next((u for u in uids if u != me.id), me.id)
    room_id = _room_id_for_users(me.id, peer_id, product_id=None)

    # --- Carpeta destino: /media/chat/<chat_id>/ ---
    from pathlib import Path
    from uuid import uuid4

    base_media = Path(__file__).resolve().parents[2] / "media"  # .../backend/media
    chat_dir = base_media / "chat" / str(conv_id)
    chat_dir.mkdir(parents=True, exist_ok=True)

    out: List[MessageRead] = []

    for f in files:
        # nombre único conservando extensión
        ext = ""
        if "." in f.filename:
            ext = "." + f.filename.rsplit(".", 1)[-1].lower()
        unique_name = f"{uuid4().hex}{ext}"
        disk_path = chat_dir / unique_name

        # Guardar a disco por chunks
        with open(disk_path, "wb") as fp:
            while True:
                chunk = f.file.read(1024 * 1024)
                if not chunk:
                    break
                fp.write(chunk)

        # URL pública servida por StaticFiles("/media", ...)
        public_url = f"/media/chat/{conv_id}/{unique_name}"

        # IMPORTANTE: text="" (no None) para satisfacer NOT NULL
        m = Message(
            conversation_id=conv_id,
            sender_id=me.id,
            type="image",
            text="",               # <- evita NOT NULL
            image_url=public_url,  # <- guardamos la ruta pública
        )
        db.add(m)
        db.flush()   # obtener m.id y m.created_at en esta transacción

        # Respuesta HTTP (para quien envía)
        out.append(
            MessageRead(
                id=str(m.id),
                from_me=True,
                type="image",
                text=None,
                url=public_url,
                name=f.filename,
                at=m.created_at,
            )
        )

        # --- BROADCAST WS: notificar a todos en la sala ---
        import json
        payload = json.dumps({
            "type": "message.created",
            "chat_id": conv_id,
            "message": {
                "id": str(m.id),
                "sender_id": me.id,          # <- clave para que el front decida from_me
                "type": "image",
                "text": "",                   # así lo guardamos
                "url": public_url,
                "name": f.filename,
                "at": m.created_at.isoformat() if m.created_at else None,
            },
        })

        # Disparar sin bloquear el request
        try:
            loop = asyncio.get_running_loop()
            loop.create_task(manager.broadcast(room_id, payload))
        except RuntimeError:
            # si estamos en thread sync
            try:
                anyio.from_thread.run(manager.broadcast, room_id, payload)
            except TypeError:
                manager.broadcast(room_id, payload)
        except TypeError:
            manager.broadcast(room_id, payload)

    db.commit()
    return out



@router.patch("/{chat_id}/hide")
def hide_thread(
    chat_id: str,
    db: Session = Depends(get_db),
    me: User = Depends(get_current_user),
):
    """
    Oculta un hilo para el usuario actual.
    (MOCK: solo responde ok)
    """
    # TODO: marcar hilo como oculto SOLO para 'me'
    return {"ok": True}
