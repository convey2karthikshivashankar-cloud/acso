"""
WebSocket connection manager for ACSO API Gateway.
"""

import asyncio
import json
import logging
import time
from typing import Dict, List, Set, Any, Optional
from fastapi import WebSocket, WebSocketDisconnect
from collections import defaultdict

from ..config import settings

logger = logging.getLogger(__name__)


class ConnectionManager:
    """Manages WebSocket connections and message broadcasting."""
    
    def __init__(self):
        # Active connections
        self.active_connections: Dict[str, WebSocket] = {}
        self.user_connections: Dict[str, str] = {}  # user_id -> connection_id
        
        # Subscriptions
        self.subscriptions: Dict[str, Set[str]] = defaultdict(set)  # channel -> connection_ids
        self.user_subscriptions: Dict[str, Set[str]] = defaultdict(set)  # user_id -> channels
        
        # Connection metadata
        self.connection_metadata: Dict[str, Dict[str, Any]] = {}
        
        # Message queues for offline users
        self.message_queues: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        
        # Heartbeat tracking
        self.last_heartbeat: Dict[str, float] = {}
        
        # Statistics
        self.stats = {
            "total_connections": 0,
            "active_connections": 0,
            "messages_sent": 0,
            "messages_received": 0,
            "connection_errors": 0
        }
    
    async def connect(self, websocket: WebSocket, user_id: str) -> str:
        """Accept a new WebSocket connection."""
        try:
            await websocket.accept()
            
            # Generate connection ID
            connection_id = f"{user_id}_{int(time.time() * 1000)}"
            
            # Store connection
            self.active_connections[connection_id] = websocket
            self.user_connections[user_id] = connection_id
            
            # Store metadata
            self.connection_metadata[connection_id] = {
                "user_id": user_id,
                "connected_at": time.time(),
                "last_activity": time.time(),
                "ip_address": websocket.client.host if websocket.client else "unknown"
            }
            
            # Update heartbeat
            self.last_heartbeat[connection_id] = time.time()
            
            # Update statistics
            self.stats["total_connections"] += 1
            self.stats["active_connections"] = len(self.active_connections)
            
            # Send queued messages
            await self._send_queued_messages(user_id, connection_id)
            
            logger.info(f"WebSocket connected: user={user_id}, connection={connection_id}")
            
            # Send connection confirmation
            await self.send_to_connection(connection_id, {
                "type": "connection_established",
                "connection_id": connection_id,
                "timestamp": time.time()
            })
            
            return connection_id
            
        except Exception as e:
            logger.error(f"Failed to establish WebSocket connection for user {user_id}: {e}")
            self.stats["connection_errors"] += 1
            raise
    
    def disconnect(self, connection_id: str):
        """Remove a WebSocket connection."""
        try:
            if connection_id in self.active_connections:
                # Get user ID
                metadata = self.connection_metadata.get(connection_id, {})
                user_id = metadata.get("user_id")
                
                # Remove from active connections
                del self.active_connections[connection_id]
                
                # Remove user connection mapping
                if user_id and user_id in self.user_connections:
                    if self.user_connections[user_id] == connection_id:
                        del self.user_connections[user_id]
                
                # Remove from all subscriptions
                for channel, connection_ids in self.subscriptions.items():
                    connection_ids.discard(connection_id)
                
                # Clean up empty subscriptions
                empty_channels = [
                    channel for channel, connection_ids in self.subscriptions.items()
                    if not connection_ids
                ]
                for channel in empty_channels:
                    del self.subscriptions[channel]
                
                # Remove metadata
                if connection_id in self.connection_metadata:
                    del self.connection_metadata[connection_id]
                
                # Remove heartbeat tracking
                if connection_id in self.last_heartbeat:
                    del self.last_heartbeat[connection_id]
                
                # Update statistics
                self.stats["active_connections"] = len(self.active_connections)
                
                logger.info(f"WebSocket disconnected: user={user_id}, connection={connection_id}")
                
        except Exception as e:
            logger.error(f"Error during WebSocket disconnect for {connection_id}: {e}")
    
    async def send_to_connection(self, connection_id: str, message: Dict[str, Any]):
        """Send a message to a specific connection."""
        if connection_id not in self.active_connections:
            logger.warning(f"Attempted to send message to inactive connection: {connection_id}")
            return False
        
        try:
            websocket = self.active_connections[connection_id]
            await websocket.send_text(json.dumps(message))
            
            # Update activity timestamp
            if connection_id in self.connection_metadata:
                self.connection_metadata[connection_id]["last_activity"] = time.time()
            
            self.stats["messages_sent"] += 1
            return True
            
        except WebSocketDisconnect:
            logger.info(f"WebSocket disconnected during send: {connection_id}")
            self.disconnect(connection_id)
            return False
        except Exception as e:
            logger.error(f"Failed to send message to connection {connection_id}: {e}")
            return False
    
    async def send_to_user(self, user_id: str, message: Dict[str, Any]):
        """Send a message to a specific user."""
        connection_id = self.user_connections.get(user_id)
        
        if connection_id:
            return await self.send_to_connection(connection_id, message)
        else:
            # Queue message for when user connects
            self.message_queues[user_id].append({
                **message,
                "queued_at": time.time()
            })
            
            # Limit queue size
            if len(self.message_queues[user_id]) > settings.websocket.message_queue_size:
                self.message_queues[user_id] = self.message_queues[user_id][-settings.websocket.message_queue_size:]
            
            logger.debug(f"Queued message for offline user: {user_id}")
            return False
    
    async def broadcast_to_channel(self, channel: str, message: Dict[str, Any], exclude_connection: Optional[str] = None):
        """Broadcast a message to all connections subscribed to a channel."""
        if channel not in self.subscriptions:
            logger.debug(f"No subscribers for channel: {channel}")
            return 0
        
        connection_ids = self.subscriptions[channel].copy()
        if exclude_connection:
            connection_ids.discard(exclude_connection)
        
        sent_count = 0
        failed_connections = []
        
        # Send to all subscribers
        for connection_id in connection_ids:
            success = await self.send_to_connection(connection_id, {
                **message,
                "channel": channel
            })
            if success:
                sent_count += 1
            else:
                failed_connections.append(connection_id)
        
        # Clean up failed connections
        for connection_id in failed_connections:
            self.subscriptions[channel].discard(connection_id)
        
        logger.debug(f"Broadcast to channel {channel}: {sent_count} messages sent")
        return sent_count
    
    async def broadcast_to_all(self, message: Dict[str, Any], exclude_connection: Optional[str] = None):
        """Broadcast a message to all active connections."""
        connection_ids = list(self.active_connections.keys())
        if exclude_connection:
            connection_ids = [cid for cid in connection_ids if cid != exclude_connection]
        
        sent_count = 0
        for connection_id in connection_ids:
            success = await self.send_to_connection(connection_id, message)
            if success:
                sent_count += 1
        
        logger.debug(f"Broadcast to all: {sent_count} messages sent")
        return sent_count
    
    async def subscribe_user(self, user_id: str, channels: List[str]):
        """Subscribe a user to channels."""
        connection_id = self.user_connections.get(user_id)
        if not connection_id:
            logger.warning(f"Cannot subscribe user {user_id}: not connected")
            return False
        
        for channel in channels:
            self.subscriptions[channel].add(connection_id)
            self.user_subscriptions[user_id].add(channel)
        
        logger.info(f"User {user_id} subscribed to channels: {channels}")
        return True
    
    async def unsubscribe_user(self, user_id: str, channels: List[str]):
        """Unsubscribe a user from channels."""
        connection_id = self.user_connections.get(user_id)
        if not connection_id:
            return False
        
        for channel in channels:
            self.subscriptions[channel].discard(connection_id)
            self.user_subscriptions[user_id].discard(channel)
            
            # Clean up empty subscriptions
            if not self.subscriptions[channel]:
                del self.subscriptions[channel]
        
        logger.info(f"User {user_id} unsubscribed from channels: {channels}")
        return True
    
    async def handle_message(self, connection_id: str, message: Dict[str, Any]):
        """Handle incoming message from a connection."""
        try:
            self.stats["messages_received"] += 1
            
            # Update heartbeat
            self.last_heartbeat[connection_id] = time.time()
            
            message_type = message.get("type")
            
            if message_type == "ping":
                await self.send_to_connection(connection_id, {"type": "pong"})
                
            elif message_type == "subscribe":
                metadata = self.connection_metadata.get(connection_id, {})
                user_id = metadata.get("user_id")
                if user_id:
                    channels = message.get("channels", [])
                    await self.subscribe_user(user_id, channels)
                    await self.send_to_connection(connection_id, {
                        "type": "subscription_confirmed",
                        "channels": channels
                    })
                    
            elif message_type == "unsubscribe":
                metadata = self.connection_metadata.get(connection_id, {})
                user_id = metadata.get("user_id")
                if user_id:
                    channels = message.get("channels", [])
                    await self.unsubscribe_user(user_id, channels)
                    await self.send_to_connection(connection_id, {
                        "type": "unsubscription_confirmed",
                        "channels": channels
                    })
                    
            else:
                logger.warning(f"Unknown message type from {connection_id}: {message_type}")
                
        except Exception as e:
            logger.error(f"Error handling message from {connection_id}: {e}")
    
    async def _send_queued_messages(self, user_id: str, connection_id: str):
        """Send queued messages to a newly connected user."""
        if user_id not in self.message_queues:
            return
        
        messages = self.message_queues[user_id]
        if not messages:
            return
        
        # Send all queued messages
        sent_count = 0
        for message in messages:
            success = await self.send_to_connection(connection_id, message)
            if success:
                sent_count += 1
        
        # Clear the queue
        del self.message_queues[user_id]
        
        logger.info(f"Sent {sent_count} queued messages to user {user_id}")
    
    async def cleanup_stale_connections(self):
        """Clean up stale connections that haven't sent heartbeat."""
        current_time = time.time()
        stale_connections = []
        
        for connection_id, last_heartbeat in self.last_heartbeat.items():
            if current_time - last_heartbeat > settings.websocket.connection_timeout:
                stale_connections.append(connection_id)
        
        for connection_id in stale_connections:
            logger.info(f"Cleaning up stale connection: {connection_id}")
            self.disconnect(connection_id)
        
        return len(stale_connections)
    
    def get_stats(self) -> Dict[str, Any]:
        """Get connection statistics."""
        return {
            **self.stats,
            "active_connections": len(self.active_connections),
            "total_subscriptions": sum(len(subs) for subs in self.subscriptions.values()),
            "channels": len(self.subscriptions),
            "queued_messages": sum(len(queue) for queue in self.message_queues.values())
        }
    
    def get_user_info(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get information about a connected user."""
        connection_id = self.user_connections.get(user_id)
        if not connection_id:
            return None
        
        metadata = self.connection_metadata.get(connection_id, {})
        subscriptions = list(self.user_subscriptions.get(user_id, set()))
        
        return {
            "user_id": user_id,
            "connection_id": connection_id,
            "connected_at": metadata.get("connected_at"),
            "last_activity": metadata.get("last_activity"),
            "ip_address": metadata.get("ip_address"),
            "subscriptions": subscriptions
        }


# Global connection manager instance
connection_manager = ConnectionManager()