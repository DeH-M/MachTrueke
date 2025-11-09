# app/routers/ws_chat.py
from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from collections import defaultdict

router = APIRouter()

class ConnectionManager:
    """
    Mantiene conexiones agrupadas por chat_id (salas).
    Decisión: usamos memoria del proceso para simplicidad;
    si escalas a múltiples instancias, migras a Redis Pub/Sub.
    """
    def __init__(self):
        self.rooms = defaultdict(set)  # chat_id -> set(WebSocket)

    async def connect(self, chat_id: str, ws: WebSocket):
        await ws.accept()
        self.rooms[chat_id].add(ws)

    def disconnect(self, chat_id: str, ws: WebSocket):
        self.rooms[chat_id].discard(ws)

    async def broadcast(self, chat_id: str, message: str):
        # Enviar a todos los sockets conectados a la sala
        muertos = []
        for ws in list(self.rooms[chat_id]):
            try:
                await ws.send_text(message)
            except Exception:
                muertos.append(ws)
        # Limpiar desconectados
        for ws in muertos:
            self.disconnect(chat_id, ws)

manager = ConnectionManager()

@router.websocket("/ws/chats/{chat_id}")
async def ws_chat(ws: WebSocket, chat_id: str):
    """
    Un cliente se conecta a la sala (chat_id). Si envía algo, lo ignoramos,
    porque los mensajes "reales" se originan en el POST REST (después de guardar en DB).
    """
    await manager.connect(chat_id, ws)
    try:
        while True:
            # Mantener viva la conexión; si llega algo, lo leemos y lo descartamos.
            await ws.receive_text()
    except WebSocketDisconnect:
        manager.disconnect(chat_id, ws)
