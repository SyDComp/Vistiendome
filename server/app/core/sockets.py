from typing import List, Dict
from fastapi import WebSocket
import json

class ConnectionManager:
    def __init__(self):
        # Lista de conexiones activas
        self.active_connections: List[WebSocket] = []

    async def connect(self, websocket: WebSocket):
        await websocket.accept()
        self.active_connections.append(websocket)
        print(f"Nueva conexión WebSocket. Total: {len(self.active_connections)}")

    def disconnect(self, websocket: WebSocket):
        if websocket in self.active_connections:
            self.active_connections.remove(websocket)
            print(f"Conexión WebSocket cerrada. Total: {len(self.active_connections)}")

    async def send_personal_message(self, message: str, websocket: WebSocket):
        await websocket.send_text(message)

    async def broadcast(self, message: dict):
        """Envía un mensaje JSON a todos los clientes conectados."""
        for connection in self.active_connections:
            try:
                await connection.send_json(message)
            except Exception as e:
                # Manejar desconexiones silenciosas
                print(f"Error enviando broadcast: {e}")
                self.active_connections.remove(connection)

# Instancia global para ser usada en los routers
manager = ConnectionManager()
