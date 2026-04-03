from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from backend.core.websocket import ws_manager

router = APIRouter(tags=["WebSocket"])


@router.websocket("/ws/sessions/{session_id}")
async def websocket_endpoint(websocket: WebSocket, session_id: str):
    await ws_manager.connect(session_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except WebSocketDisconnect:
        ws_manager.disconnect(session_id)
