from fastapi import APIRouter, WebSocket, WebSocketDisconnect
from app.core.sockets import manager
import asyncio
import time

router = APIRouter()

@router.websocket("/heartbeat")
async def websocket_endpoint(websocket: WebSocket):
    await manager.connect(websocket)
    try:
        # Enviar confirmación inicial
        await websocket.send_json({
            "type": "connection_established",
            "message": "Vistiéndome Heartbeat Active",
            "timestamp": time.time()
        })
        
        while True:
            # Esperar mensajes del cliente (pings) o simplemente mantener viva la conexión
            data = await websocket.receive_text()
            # Si recibimos un ping, respondemos un pong
            if data == "ping":
                await websocket.send_json({
                    "type": "heartbeat",
                    "status": "alive",
                    "timestamp": time.time()
                })
    except WebSocketDisconnect:
        manager.disconnect(websocket)
    except Exception as e:
        print(f"Error en WebSocket: {e}")
        manager.disconnect(websocket)
