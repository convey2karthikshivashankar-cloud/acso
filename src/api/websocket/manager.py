"""
WebSocket manager for ACSO API Gateway.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Set, Optional, Any, Callable
from uuid import uuid4
from fastapi import WebSocket, WebSocketDisconnect
from pydantic import BaseModel, ValidationError

from ..models.auth import User, Permission
from ..services.auth_service import AuthService
from ..utils.errors import AuthenticationException, AuthorizationException

logger = logging.getLogger(__name__)


class WebSocketMessage(BaseModel):
    """WebSocket message format."""
    type: str
    data: Dict[str, Any]
    timestamp: Optional[datetime] = None
    source: Optional[str] = None
    target: Optional[str] = None
    request_id: Optional[str] = None


class WebSocketSubscription(BaseModel):
    """WebSocket subscription."""
    topic: str
    filters: Dict[str, Any] = {}
    permissions: List[Permission] = []


class WebSocketConnection:
    """WebSocket connection wrapper."""
    
    def __init__(self, websocket: WebSocket, user: User, connection_id: str):
        self.websocket = websocket
        self.user = user
        self.connection_id = connection_id
        self.subscriptions: Dict[str, WebSocketSubscription] = {}
        self.connected_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.message_count = 0
        self.is_active = True
    
    async def send_message(self, message: WebSocketMessage):
        """Send message to client."""
        try:
            if not self.is_active:
                return False
            
            # Add timestamp if not present
            if not message.timestamp:
                message.timestamp = datetime.utcnow()
            
            await self.websocket.send_text(message.json())
            self.last_activity = datetime.utcnow()
            self.message_count += 1
            return True
            
        except Exception as e:
            logger.error(f"Failed to send message to {self.connection_id}: {e}")
            self.is_active = False
            return False
    
    async def send_error(self, error_message: str, error_code: str = "WEBSOCKET_ERROR"):
        """Send error message to client."""
        error_msg = WebSocketMessage(
            type="error",
            data={
                "code": error_code,
                "message": error_message,
                "timestamp": datetime.utcnow().isoformat()
            }
        )
        await self.send_message(error_msg)
    
    def has_permission(self, required_permission: Permission) -> bool:
        """Check if user has required permission."""
        return required_permission in self.user.permissions
    
    def is_subscribed_to(self, topic: str) -> bool:
        """Check if connection is subscribed to topic."""
        return topic in self.subscriptions
    
    def matches_filters(self, topic: str, data: Dict[str, Any]) -> bool:
        """Check if message matches subscription filters."""
        if topic not in self.subscriptions:
            return False
        
        subscription = self.subscriptions[topic]
        
        # Check filters
        for filter_key, filter_value in subscription.filters.items():
            if filter_key not in data or data[filter_key] != filter_value:
                return False
        
        return True


class WebSocketManager:
    """WebSocket connection manager."""
    
    def __init__(self, auth_service: AuthService):
        self.auth_service = auth_service
        self.connections: Dict[str, WebSocketConnection] = {}
        self.topic_subscribers: Dict[str, Set[str]] = {}  # topic -> connection_ids
        self.user_connections: Dict[str, Set[str]] = {}  # user_id -> connection_ids
        self.message_handlers: Dict[str, Callable] = {}
        self.heartbeat_interval = 30  # seconds
        self.max_connections_per_user = 10
        
        # Register default message handlers
        self._register_default_handlers()
        
        # Start background tasks
        asyncio.create_task(self._heartbeat_task())
        asyncio.create_task(self._cleanup_task())
    
    def _register_default_handlers(self):
        """Register default message handlers."""
        self.message_handlers.update({
            "ping": self._handle_ping,
            "subscribe": self._handle_subscribe,
            "unsubscribe": self._handle_unsubscribe,
            "get_subscriptions": self._handle_get_subscriptions,
            "get_connection_info": self._handle_get_connection_info
        })
    
    async def connect(self, websocket: WebSocket, token: str) -> str:
        """Accept WebSocket connection and authenticate user."""
        try:
            # Authenticate user
            token_payload = await self.auth_service.verify_token(token)
            user = self.auth_service.users.get(token_payload.sub)
            
            if not user or user.status.value != "active":
                await websocket.close(code=4001, reason="Authentication failed")
                raise AuthenticationException("Invalid or inactive user")
            
            # Check connection limits
            user_connection_count = len(self.user_connections.get(user.id, set()))
            if user_connection_count >= self.max_connections_per_user:
                await websocket.close(code=4003, reason="Too many connections")
                raise AuthorizationException("Maximum connections exceeded")
            
            # Accept connection
            await websocket.accept()
            
            # Create connection
            connection_id = str(uuid4())
            connection = WebSocketConnection(websocket, user, connection_id)
            
            # Store connection
            self.connections[connection_id] = connection
            
            # Track user connections
            if user.id not in self.user_connections:
                self.user_connections[user.id] = set()
            self.user_connections[user.id].add(connection_id)
            
            # Send welcome message
            welcome_msg = WebSocketMessage(
                type="connected",
                data={
                    "connection_id": connection_id,
                    "user_id": user.id,
                    "username": user.username,
                    "connected_at": connection.connected_at.isoformat(),
                    "server_time": datetime.utcnow().isoformat()
                }
            )
            await connection.send_message(welcome_msg)
            
            logger.info(f"WebSocket connected: {connection_id} (user: {user.username})")
            return connection_id
            
        except Exception as e:
            logger.error(f"WebSocket connection failed: {e}")
            await websocket.close(code=4000, reason=str(e))
            raise
    
    async def disconnect(self, connection_id: str):
        """Disconnect WebSocket connection."""
        if connection_id not in self.connections:
            return
        
        connection = self.connections[connection_id]
        
        # Remove from topic subscriptions
        for topic in list(connection.subscriptions.keys()):
            await self._unsubscribe_from_topic(connection_id, topic)
        
        # Remove from user connections
        if connection.user.id in self.user_connections:
            self.user_connections[connection.user.id].discard(connection_id)
            if not self.user_connections[connection.user.id]:
                del self.user_connections[connection.user.id]
        
        # Remove connection
        del self.connections[connection_id]
        
        logger.info(f"WebSocket disconnected: {connection_id} (user: {connection.user.username})")
    
    async def handle_message(self, connection_id: str, message_data: str):
        """Handle incoming WebSocket message."""
        if connection_id not in self.connections:
            return
        
        connection = self.connections[connection_id]
        
        try:
            # Parse message
            message_dict = json.loads(message_data)
            message = WebSocketMessage(**message_dict)
            
            # Update activity
            connection.last_activity = datetime.utcnow()
            
            # Handle message
            handler = self.message_handlers.get(message.type)
            if handler:
                await handler(connection, message)
            else:
                await connection.send_error(f"Unknown message type: {message.type}", "UNKNOWN_MESSAGE_TYPE")
                
        except ValidationError as e:
            await connection.send_error(f"Invalid message format: {e}", "INVALID_MESSAGE_FORMAT")
        except json.JSONDecodeError:
            await connection.send_error("Invalid JSON format", "INVALID_JSON")
        except Exception as e:
            logger.error(f"Error handling message from {connection_id}: {e}")
            await connection.send_error("Internal server error", "INTERNAL_ERROR")
    
    async def broadcast_to_topic(
        self, 
        topic: str, 
        message_data: Dict[str, Any],
        required_permission: Optional[Permission] = None,
        filters: Optional[Dict[str, Any]] = None
    ):
        """Broadcast message to all subscribers of a topic."""
        if topic not in self.topic_subscribers:
            return
        
        message = WebSocketMessage(
            type="broadcast",
            data={
                "topic": topic,
                "payload": message_data,
                **filters if filters else {}
            },
            source="server"
        )
        
        # Get subscribers
        subscriber_ids = self.topic_subscribers[topic].copy()
        
        # Send to each subscriber
        for connection_id in subscriber_ids:
            if connection_id not in self.connections:
                continue
            
            connection = self.connections[connection_id]
            
            # Check permissions
            if required_permission and not connection.has_permission(required_permission):
                continue
            
            # Check filters
            if not connection.matches_filters(topic, message_data):
                continue
            
            await connection.send_message(message)
    
    async def send_to_user(self, user_id: str, message_data: Dict[str, Any]):
        """Send message to all connections of a specific user."""
        if user_id not in self.user_connections:
            return
        
        message = WebSocketMessage(
            type="user_message",
            data=message_data,
            target=user_id,
            source="server"
        )
        
        connection_ids = self.user_connections[user_id].copy()
        
        for connection_id in connection_ids:
            if connection_id in self.connections:
                await self.connections[connection_id].send_message(message)
    
    async def send_to_connection(self, connection_id: str, message_data: Dict[str, Any]):
        """Send message to specific connection."""
        if connection_id not in self.connections:
            return False
        
        message = WebSocketMessage(
            type="direct_message",
            data=message_data,
            target=connection_id,
            source="server"
        )
        
        return await self.connections[connection_id].send_message(message)
    
    # Message handlers
    
    async def _handle_ping(self, connection: WebSocketConnection, message: WebSocketMessage):
        """Handle ping message."""
        pong_msg = WebSocketMessage(
            type="pong",
            data={
                "timestamp": datetime.utcnow().isoformat(),
                "request_id": message.request_id
            }
        )
        await connection.send_message(pong_msg)
    
    async def _handle_subscribe(self, connection: WebSocketConnection, message: WebSocketMessage):
        """Handle subscription request."""
        try:
            topic = message.data.get("topic")
            filters = message.data.get("filters", {})
            required_permissions = message.data.get("permissions", [])
            
            if not topic:
                await connection.send_error("Topic is required", "MISSING_TOPIC")
                return
            
            # Check permissions
            for perm_str in required_permissions:
                try:
                    permission = Permission(perm_str)
                    if not connection.has_permission(permission):
                        await connection.send_error(
                            f"Permission required: {perm_str}", 
                            "INSUFFICIENT_PERMISSIONS"
                        )
                        return
                except ValueError:
                    await connection.send_error(
                        f"Invalid permission: {perm_str}", 
                        "INVALID_PERMISSION"
                    )
                    return
            
            # Create subscription
            subscription = WebSocketSubscription(
                topic=topic,
                filters=filters,
                permissions=[Permission(p) for p in required_permissions]
            )
            
            # Add to connection subscriptions
            connection.subscriptions[topic] = subscription
            
            # Add to topic subscribers
            if topic not in self.topic_subscribers:
                self.topic_subscribers[topic] = set()
            self.topic_subscribers[topic].add(connection.connection_id)
            
            # Send confirmation
            response_msg = WebSocketMessage(
                type="subscribed",
                data={
                    "topic": topic,
                    "filters": filters,
                    "request_id": message.request_id
                }
            )
            await connection.send_message(response_msg)
            
            logger.info(f"Connection {connection.connection_id} subscribed to topic: {topic}")
            
        except Exception as e:
            await connection.send_error(f"Subscription failed: {e}", "SUBSCRIPTION_FAILED")
    
    async def _handle_unsubscribe(self, connection: WebSocketConnection, message: WebSocketMessage):
        """Handle unsubscription request."""
        try:
            topic = message.data.get("topic")
            
            if not topic:
                await connection.send_error("Topic is required", "MISSING_TOPIC")
                return
            
            await self._unsubscribe_from_topic(connection.connection_id, topic)
            
            # Send confirmation
            response_msg = WebSocketMessage(
                type="unsubscribed",
                data={
                    "topic": topic,
                    "request_id": message.request_id
                }
            )
            await connection.send_message(response_msg)
            
        except Exception as e:
            await connection.send_error(f"Unsubscription failed: {e}", "UNSUBSCRIPTION_FAILED")
    
    async def _handle_get_subscriptions(self, connection: WebSocketConnection, message: WebSocketMessage):
        """Handle get subscriptions request."""
        subscriptions = [
            {
                "topic": topic,
                "filters": sub.filters,
                "permissions": [p.value for p in sub.permissions]
            }
            for topic, sub in connection.subscriptions.items()
        ]
        
        response_msg = WebSocketMessage(
            type="subscriptions",
            data={
                "subscriptions": subscriptions,
                "request_id": message.request_id
            }
        )
        await connection.send_message(response_msg)
    
    async def _handle_get_connection_info(self, connection: WebSocketConnection, message: WebSocketMessage):
        """Handle get connection info request."""
        info = {
            "connection_id": connection.connection_id,
            "user_id": connection.user.id,
            "username": connection.user.username,
            "connected_at": connection.connected_at.isoformat(),
            "last_activity": connection.last_activity.isoformat(),
            "message_count": connection.message_count,
            "subscription_count": len(connection.subscriptions)
        }
        
        response_msg = WebSocketMessage(
            type="connection_info",
            data={
                "info": info,
                "request_id": message.request_id
            }
        )
        await connection.send_message(response_msg)
    
    # Helper methods
    
    async def _unsubscribe_from_topic(self, connection_id: str, topic: str):
        """Remove connection from topic subscription."""
        if connection_id in self.connections:
            connection = self.connections[connection_id]
            if topic in connection.subscriptions:
                del connection.subscriptions[topic]
        
        if topic in self.topic_subscribers:
            self.topic_subscribers[topic].discard(connection_id)
            if not self.topic_subscribers[topic]:
                del self.topic_subscribers[topic]
    
    async def _heartbeat_task(self):
        """Background task to send heartbeat messages."""
        while True:
            try:
                await asyncio.sleep(self.heartbeat_interval)
                
                heartbeat_msg = WebSocketMessage(
                    type="heartbeat",
                    data={
                        "timestamp": datetime.utcnow().isoformat(),
                        "server_time": datetime.utcnow().isoformat()
                    }
                )
                
                # Send heartbeat to all connections
                for connection in list(self.connections.values()):
                    if connection.is_active:
                        await connection.send_message(heartbeat_msg)
                        
            except Exception as e:
                logger.error(f"Heartbeat task error: {e}")
    
    async def _cleanup_task(self):
        """Background task to clean up inactive connections."""
        while True:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                current_time = datetime.utcnow()
                inactive_connections = []
                
                for connection_id, connection in self.connections.items():
                    # Check if connection is inactive (no activity for 5 minutes)
                    if (current_time - connection.last_activity).total_seconds() > 300:
                        inactive_connections.append(connection_id)
                
                # Disconnect inactive connections
                for connection_id in inactive_connections:
                    logger.info(f"Cleaning up inactive connection: {connection_id}")
                    await self.disconnect(connection_id)
                    
            except Exception as e:
                logger.error(f"Cleanup task error: {e}")
    
    def get_connection_stats(self) -> Dict[str, Any]:
        """Get WebSocket connection statistics."""
        return {
            "total_connections": len(self.connections),
            "active_connections": len([c for c in self.connections.values() if c.is_active]),
            "total_topics": len(self.topic_subscribers),
            "total_users": len(self.user_connections),
            "connections_by_user": {
                user_id: len(conn_ids) 
                for user_id, conn_ids in self.user_connections.items()
            },
            "subscribers_by_topic": {
                topic: len(conn_ids) 
                for topic, conn_ids in self.topic_subscribers.items()
            }
        }
    
    def register_message_handler(self, message_type: str, handler: Callable):
        """Register custom message handler."""
        self.message_handlers[message_type] = handler
    
    def unregister_message_handler(self, message_type: str):
        """Unregister message handler."""
        if message_type in self.message_handlers:
            del self.message_handlers[message_type]