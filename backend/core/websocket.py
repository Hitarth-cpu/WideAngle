import logging
from fastapi import WebSocket

logger = logging.getLogger(__name__)


class ConnectionManager:
    def __init__(self):
        self._connections: dict[str, list[WebSocket]] = {}

    async def connect(self, session_id: str, websocket: WebSocket):
        await websocket.accept()
        self._connections.setdefault(session_id, []).append(websocket)

    def disconnect(self, session_id: str, websocket: WebSocket | None = None):
        if session_id not in self._connections:
            return
        if websocket is None:
            del self._connections[session_id]
        else:
            conns = self._connections[session_id]
            if websocket in conns:
                conns.remove(websocket)
            if not conns:
                del self._connections[session_id]

    async def send_to_session(self, session_id: str, message: dict):
        conns = self._connections.get(session_id, [])
        dead = []
        for ws in conns:
            try:
                await ws.send_json(message)
            except Exception as e:
                logger.warning(f"WS send failed for session {session_id}: {e}")
                dead.append(ws)
        for ws in dead:
            self.disconnect(session_id, ws)


ws_manager = ConnectionManager()
