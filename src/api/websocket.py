"""
WebSocket manager for real-time communication with frontend.
"""

import asyncio
import json
import logging
from typing import Dict, List, Set, Optional, Any
from datetime import datetime
from fastapi import WebSocket, WebSocketDisconnect
from fastapi.applications import FastAPI

from .models import WebSocketMessage
from ..shared.coordination import system_coordinator
from ..shared.monitoring import system_monitor

logger = logging.getLogger(__name__)

class ConnectionManager:
    """Manages WebSocket connections."""
    
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, Set[str]] = {}
        self.subscriptions: Dict[str, Set[str]] = {}
        
    async def connect(self, websocket: WebSocket, connection_id: str, user_id: str):
        """Accept a new WebSocket connection."""
        await websocket.accept()
        self.active_connections[connection_id] = websocket
        
        if user_id not in self.user_connections:
            self.user_connections[user_id] = set()
        self.user_connections[user_id].add(connection_id)
        
        logger.info(f"WebSocket connection established: {connection_id} for user {user_id}")
    
    def disconnect(self, connection_id: str, user_id: str):
        """Remove a WebSocket connection."""
        if connection_id in self.active_connections:
            del self.active_connections[connection_id]
        
        if user_id in self.user_connections:
            self.user_connections[user_id].discard(connection_id)
            if not self.user_connections[user_id]:
                del self.user_connections[user_id]
        
        # Remove from all subscriptions
        for topic in list(self.subscriptions.keys()):
            self.subscriptions[topic].discard(connection_id)
            if not self.subscriptions[topic]:
                del self.subscriptions[topic]
        
        logger.info(f"WebSocket connection closed: {connection_id}")
    
    async def send_personal_message(self, message: str, connection_id: str):
        """Send a message to a specific connection."""
        if connection_id in self.active_connections:
            try:
                await self.active_connections[connection_id].send_text(message)
            except Exception as e:
                logger.error(f"Error sending message to {connection_id}: {e}")
                # Connection might be dead, remove it
                self.disconnect(connection_id, "unknown")
    
    async def send_to_user(self, message: str, user_id: str):
        """Send a message to all connections of a user."""
        if user_id in self.user_connections:
            for connection_id in list(self.user_connections[user_id]):
                await self.send_personal_message(message, connection_id)
    
    async def broadcast(self, message: str):
        """Broadcast a message to all connections."""
        for connection_id in list(self.active_connections.keys()):
            await self.send_personal_message(message, connection_id)
    
    async def send_to_subscribers(self, topic: str, message: str):
        """Send a message to all subscribers of a topic."""
        if topic in self.subscriptions:
            for connection_id in list(self.subscriptions[topic]):
                await self.send_personal_message(message, connection_id)
    
    def subscribe(self, connection_id: str, topic: str):
        """Subscribe a connection to a topic."""
        if topic not in self.subscriptions:
            self.subscriptions[topic] = set()
        self.subscriptions[topic].add(connection_id)
        logger.info(f"Connection {connection_id} subscribed to {topic}")
    
    def unsubscribe(self, connection_id: str, topic: str):
        """Unsubscribe a connection from a topic."""
        if topic in self.subscriptions:
            self.subscriptions[topic].discard(connection_id)
            if not self.subscriptions[topic]:
                del self.subscriptions[topic]
        logger.info(f"Connection {connection_id} unsubscribed from {topic}")

class WebSocketManager:
    """Main WebSocket manager for ACSO system."""
    
    def __init__(self):
        self.manager = ConnectionManager()
        self.app = FastAPI()
        self.running = False
        self.setup_routes()
    
    def setup_routes(self):
        """Setup WebSocket routes."""
        
        @self.app.websocket("/agents/{agent_id}/status")
        async def agent_status_endpoint(websocket: WebSocket, agent_id: str):
            """WebSocket endpoint for agent status updates."""
            connection_id = f"agent_status_{agent_id}_{datetime.utcnow().timestamp()}"
            user_id = "system"  # This would come from authentication
            
            await self.manager.connect(websocket, connection_id, user_id)
            self.manager.subscribe(connection_id, f"agent_status_{agent_id}")
            
            try:
                while True:
                    # Keep connection alive and handle incoming messages
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    if message.get("type") == "ping":
                        await websocket.send_text(json.dumps({
                            "type": "pong",
                            "timestamp": datetime.utcnow().isoformat()
                        }))
                    
            except WebSocketDisconnect:
                self.manager.disconnect(connection_id, user_id)
        
        @self.app.websocket("/system/events")
        async def system_events_endpoint(websocket: WebSocket):
            """WebSocket endpoint for system-wide events."""
            connection_id = f"system_events_{datetime.utcnow().timestamp()}"
            user_id = "system"  # This would come from authentication
            
            await self.manager.connect(websocket, connection_id, user_id)
            self.manager.subscribe(connection_id, "system_events")
            
            try:
                while True:
                    data = await websocket.receive_text()
                    message = json.loads(data)
                    
                    if message.get("type") == "subscribe":
                        topics = message.get("topics", [])
                        for topic in topics:
                            self.manager.subscribe(connection_id, topic)
                    
                    elif message.get("type") == "unsubscribe":
                        topics = message.get("topics", [])
                        for topic in topics:
                            self.manager.unsubscribe(connection_id, topic)
                    
            except WebSocketDisconnect:
                self.manager.disconnect(connection_id, user_id)
        
        @self.app.websocket("/logs/{agent_id}")
        async def agent_logs_endpoint(websocket: WebSocket, agent_id: str):
            """WebSocket endpoint for streaming agent logs."""
            connection_id = f"agent_logs_{agent_id}_{datetime.utcnow().timestamp()}"
            user_id = "system"  # This would come from authentication
            
            await self.manager.connect(websocket, connection_id, user_id)
            
            try:
                # Start streaming logs
                async for log_entry in system_monitor.stream_agent_logs(agent_id):
                    await websocket.send_text(json.dumps({
                        "type": "log_entry",
                        "data": log_entry.dict(),
                        "timestamp": datetime.utcnow().isoformat()
                    }))
                    
            except WebSocketDisconnect:
                self.manager.disconnect(connection_id, user_id)
    
    async def initialize(self):
        """Initialize the WebSocket manager."""
        self.running = True
        
        # Start background tasks for system events
        asyncio.create_task(self._agent_status_broadcaster())
        asyncio.create_task(self._system_events_broadcaster())
        
        logger.info("WebSocket manager initialized")
    
    async def shutdown(self):
        """Shutdown the WebSocket manager."""
        self.running = False
        
        # Close all connections
        for connection_id in list(self.manager.active_connections.keys()):
            try:
                await self.manager.active_connections[connection_id].close()
            except Exception as e:
                logger.error(f"Error closing connection {connection_id}: {e}")
        
        logger.info("WebSocket manager shutdown")
    
    def is_healthy(self) -> bool:
        """Check if WebSocket manager is healthy."""
        return self.running
    
    async def _agent_status_broadcaster(self):
        """Background task to broadcast agent status updates."""
        while self.running:
            try:
                # Get agent status updates
                agents = await system_coordinator.get_all_agents()
                
                for agent in agents:
                    topic = f"agent_status_{agent.agent_id}"
                    message = WebSocketMessage(
                        type="agent_status_update",
                        data={
                            "agent_id": agent.agent_id,
                            "status": agent.status,
                            "current_task": agent.current_task,
                            "metrics": agent.metrics
                        }
                    )
                    
                    await self.manager.send_to_subscribers(
                        topic,
                        message.json()
                    )
                
                await asyncio.sleep(5)  # Update every 5 seconds
                
            except Exception as e:
                logger.error(f"Error in agent status broadcaster: {e}")
                await asyncio.sleep(10)
    
    async def _system_events_broadcaster(self):
        """Background task to broadcast system events."""
        while self.running:
            try:
                # Get system events
                events = await system_monitor.get_recent_events()
                
                for event in events:
                    message = WebSocketMessage(
                        type="system_event",
                        data=event
                    )
                    
                    await self.manager.send_to_subscribers(
                        "system_events",
                        message.json()
                    )
                
                await asyncio.sleep(2)  # Update every 2 seconds
                
            except Exception as e:
                logger.error(f"Error in system events broadcaster: {e}")
                await asyncio.sleep(5)
    
    async def send_notification(self, user_id: str, notification: Dict[str, Any]):
        """Send a notification to a specific user."""
        message = WebSocketMessage(
            type="notification",
            data=notification
        )
        
        await self.manager.send_to_user(message.json(), user_id)
    
    async def broadcast_system_alert(self, alert: Dict[str, Any]):
        """Broadcast a system alert to all connected users."""
        message = WebSocketMessage(
            type="system_alert",
            data=alert
        )
        
        await self.manager.broadcast(message.json())

# Global WebSocket manager instance
websocket_manager = WebSocketManager()