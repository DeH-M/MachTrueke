# app/core/ws_manager.py
from typing import Dict, Set
from fastapi import WebSocket

class WSRoomManager:
    """Gestor simple de WebSockets agrupados por 'room' (chat_id o conversation_id)."""

    def __init__(self):
        # room_id -> set(WebSocket)
        self.rooms: Dict[int, Set[WebSocket]] = {}

    async def connect(self, room_id: int, ws: WebSocket):
        """Acepta la conexión y agrega el socket al room."""
        await ws.accept()
        self.rooms.setdefault(room_id, set()).add(ws)

    def disconnect(self, room_id: int, ws: WebSocket):
        """Elimina el socket de un room y limpia si queda vacío."""
        try:
            self.rooms.get(room_id, set()).discard(ws)
            if not self.rooms.get(room_id):
                self.rooms.pop(room_id, None)
        except Exception:
            pass

    async def broadcast(self, room_id: int, data: dict):
        """Envía un mensaje JSON a todos los sockets del mismo room."""
        for ws in list(self.rooms.get(room_id, set())):
            try:
                await ws.send_json(data)
            except Exception:
                self.disconnect(room_id, ws)


# Instancia global (para usar en routers)
manager = WSRoomManager()
