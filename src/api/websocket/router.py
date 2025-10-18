"""
WebSocket router for ACSO API Gateway.
"""

from fastapi import APIRouter, WebSocket, WebSocketDisconnect, Depends, HTTPException, status, Query
from typing import Dict, List, Optional
import json
import asyncio
import logging

from ..models.responses import APIResponse
from ..models.auth import User, Permission
from ..dependencies import get_current_user, require_permission
from ..services.auth_service import AuthService
from .manager import WebSocketManager

router = APIRouter()
logger = logging.getLogger(__name__)

# Initialize services
auth_service = AuthService()
websocket_manager = WebSocketManager(auth_service)


@router.websocket("/ws")
async def websocket_endpoint(websocket: WebSocket, token: Optional[str] = Query(None)):
    """WebSocket endpoint for real-time communication."""
    connection_id = None
    
    try:
        if not token:
            await websocket.close(code=4001, reason="Authentication token required")
            return
        
        # Connect and authenticate
        connection_id = await websocket_manager.connect(websocket, token)
        
        # Listen for messages
        while True:
            try:
                data = await websocket.receive_text()
                await websocket_manager.handle_message(connection_id, data)
                
            except WebSocketDisconnect:
                break
            except Exception as e:
                logger.error(f"Error handling WebSocket message from {connection_id}: {e}")
                break
                
    except WebSocketDisconnect:
        pass
    except Exception as e:
        logger.error(f"WebSocket connection error: {e}")
    finally:
        if connection_id:
            await websocket_manager.disconnect(connection_id)


# API endpoints for WebSocket management

@router.get("/connections", response_model=APIResponse[Dict])
async def get_active_connections(
    current_user: User = Depends(require_permission(Permission.SYSTEM_MONITOR))
):
    """Get WebSocket connection statistics."""
    stats = websocket_manager.get_connection_stats()
    
    return APIResponse(
        success=True,
        data=stats,
        message="WebSocket connection statistics retrieved"
    )


@router.post("/broadcast", response_model=APIResponse[Dict])
async def broadcast_message(
    message: Dict,
    topic: Optional[str] = None,
    required_permission: Optional[str] = None,
    current_user: User = Depends(require_permission(Permission.SYSTEM_ADMIN))
):
    """Broadcast message to WebSocket connections."""
    try:
        permission = None
        if required_permission:
            try:
                permission = Permission(required_permission)
            except ValueError:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"Invalid permission: {required_permission}"
                )
        
        broadcast_data = {
            "message": message,
            "sender": current_user.username,
            "timestamp": asyncio.get_event_loop().time()
        }
        
        if topic:
            await websocket_manager.broadcast_to_topic(topic, broadcast_data, permission)
            return APIResponse(
                success=True,
                data={"message": f"Message broadcasted to topic: {topic}"},
                message="Broadcast sent successfully"
            )
        else:
            # Broadcast to all connections (not implemented in this version for security)
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Topic is required for broadcasting"
            )
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Broadcast failed: {str(e)}"
        )


@router.post("/send-to-user", response_model=APIResponse[Dict])
async def send_to_user(
    user_id: str,
    message: Dict,
    current_user: User = Depends(require_permission(Permission.SYSTEM_ADMIN))
):
    """Send message to specific user's WebSocket connections."""
    await websocket_manager.send_to_user(user_id, {
        "message": message,
        "sender": current_user.username,
        "timestamp": asyncio.get_event_loop().time()
    })
    
    return APIResponse(
        success=True,
        data={"message": f"Message sent to user: {user_id}"},
        message="Message sent successfully"
    )


@router.post("/send-to-connection", response_model=APIResponse[Dict])
async def send_to_connection(
    connection_id: str,
    message: Dict,
    current_user: User = Depends(require_permission(Permission.SYSTEM_ADMIN))
):
    """Send message to specific WebSocket connection."""
    success = await websocket_manager.send_to_connection(connection_id, {
        "message": message,
        "sender": current_user.username,
        "timestamp": asyncio.get_event_loop().time()
    })
    
    if success:
        return APIResponse(
            success=True,
            data={"message": f"Message sent to connection: {connection_id}"},
            message="Message sent successfully"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found or inactive"
        )


@router.delete("/connections/{connection_id}", response_model=APIResponse[Dict])
async def disconnect_connection(
    connection_id: str,
    current_user: User = Depends(require_permission(Permission.SYSTEM_ADMIN))
):
    """Disconnect a specific WebSocket connection."""
    if connection_id in websocket_manager.connections:
        await websocket_manager.disconnect(connection_id)
        return APIResponse(
            success=True,
            data={"message": f"Connection {connection_id} disconnected"},
            message="Connection disconnected successfully"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Connection not found"
        )


@router.get("/topics", response_model=APIResponse[List[str]])
async def get_active_topics(
    current_user: User = Depends(require_permission(Permission.SYSTEM_MONITOR))
):
    """Get list of active WebSocket topics."""
    topics = list(websocket_manager.topic_subscribers.keys())
    
    return APIResponse(
        success=True,
        data=topics,
        message=f"Retrieved {len(topics)} active topics"
    )


@router.get("/topics/{topic}/subscribers", response_model=APIResponse[List[str]])
async def get_topic_subscribers(
    topic: str,
    current_user: User = Depends(require_permission(Permission.SYSTEM_MONITOR))
):
    """Get subscribers for a specific topic."""
    subscribers = list(websocket_manager.topic_subscribers.get(topic, set()))
    
    return APIResponse(
        success=True,
        data=subscribers,
        message=f"Retrieved {len(subscribers)} subscribers for topic: {topic}"
    )


# Helper functions for other services to use WebSocket manager

def get_websocket_manager() -> WebSocketManager:
    """Get the WebSocket manager instance."""
    return websocket_manager


async def notify_agents_update(agent_data: Dict):
    """Notify about agent updates."""
    await websocket_manager.broadcast_to_topic(
        "agents.status",
        agent_data,
        Permission.AGENTS_VIEW
    )


async def notify_workflow_update(workflow_data: Dict):
    """Notify about workflow updates."""
    await websocket_manager.broadcast_to_topic(
        "workflows.status",
        workflow_data,
        Permission.WORKFLOWS_VIEW
    )


async def notify_incident_update(incident_data: Dict):
    """Notify about incident updates."""
    await websocket_manager.broadcast_to_topic(
        "incidents.status",
        incident_data,
        Permission.INCIDENTS_VIEW
    )


async def notify_system_alert(alert_data: Dict):
    """Notify about system alerts."""
    await websocket_manager.broadcast_to_topic(
        "system.alerts",
        alert_data,
        Permission.SYSTEM_MONITOR
    )