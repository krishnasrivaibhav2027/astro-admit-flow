
import socketio
import logging

class SocketManager:
    def __init__(self):
        self.sio = socketio.AsyncServer(
            async_mode='asgi',
            cors_allowed_origins='*'
        )
        self.app = socketio.ASGIApp(self.sio, socketio_path="")

    async def emit(self, event, data, room=None):
        await self.sio.emit(event, data, room=room)

socket_manager = SocketManager()
