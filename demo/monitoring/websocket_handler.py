"""
WebSocket handler for real-time demo monitoring.
Provides WebSocket endpoints and message handling for demo monitoring.
"""

import asyncio
import json
import logging
from typing import Dict, Any, Optional
from datetime import datetime

from .real_time_monitor import real_time_monitor, DemoMetric, DemoAlert, MetricType, AlertLevel

logger = logging.getLogger(__name__)


class DemoWebSocketHandler:
    """Handles WebSocket connections for demo monitoring."""
    
    def __init__(self):
        self.active_connections: Dict[str, Any] = {}  # connection_id -> websocket
        
    async def connect(self, websocket: Any, session_id: str, user_id: str = None) -> str:
        """Handle new WebSocket connection."""
        connection_id = f"{session_id}_{datetime.utcnow().timestamp()}"
        
        try:
            # Add connection to monitor
            await real_time_monitor.websocket_manager.add_connection(
                websocket, session_id, user_id
            )
            
            self.active_connections[connection_id] = websocket
            
            # Send initial status
            status = real_time_monitor.get_session_status(session_id)
            await self.send_message(websocket, {
                'type': 'connection_established',
                'connection_id': connection_id,
                'session_status': status
            })
            
            logger.info(f"WebSocket connected: {connection_id} for session {session_id}")
            return connection_id
            
        except Exception as e:
            logger.error(f"Error connecting WebSocket: {e}")
            raise
            
    async def disconnect(self, websocket: Any, connection_id: str = None):
        """Handle WebSocket disconnection."""
        try:
            await real_time_monitor.websocket_manager.remove_connection(websocket)
            
            if connection_id and connection_id in self.active_connections:
                del self.active_connections[connection_id]
                
            logger.info(f"WebSocket disconnected: {connection_id}")
            
        except Exception as e:
            logger.error(f"Error disconnecting WebSocket: {e}")
            
    async def handle_message(self, websocket: Any, message: str, session_id: str):
        """Handle incoming WebSocket message."""
        try:
            data = json.loads(message)
            message_type = data.get('type')
            
            if message_type == 'ping':
                await self.handle_ping(websocket, data)
            elif message_type == 'subscribe':
                await self.handle_subscribe(websocket, data, session_id)
            elif message_type == 'unsubscribe':
                await self.handle_unsubscribe(websocket, data, session_id)
            elif message_type == 'get_metrics':
                await self.handle_get_metrics(websocket, data, session_id)
            elif message_type == 'get_alerts':
                await self.handle_get_alerts(websocket, data, session_id)
            elif message_type == 'resolve_alert':
                await self.handle_resolve_alert(websocket, data, session_id)
            elif message_type == 'get_recording':
                await self.handle_get_recording(websocket, data, session_id)
            else:
                await self.send_error(websocket, f"Unknown message type: {message_type}")
                
        except json.JSONDecodeError:
            await self.send_error(websocket, "Invalid JSON message")
        except Exception as e:
            logger.error(f"Error handling WebSocket message: {e}")
            await self.send_error(websocket, f"Internal error: {str(e)}")
            
    async def handle_ping(self, websocket: Any, data: Dict[str, Any]):
        """Handle ping message."""
        await self.send_message(websocket, {
            'type': 'pong',
            'timestamp': datetime.utcnow().isoformat()
        })
        
    async def handle_subscribe(self, websocket: Any, data: Dict[str, Any], session_id: str):
        """Handle subscription to monitoring updates."""
        subscription_types = data.get('subscription_types', ['all'])
        
        # Store subscription preferences (could be enhanced)
        await self.send_message(websocket, {
            'type': 'subscription_confirmed',
            'subscription_types': subscription_types,
            'session_id': session_id
        })
        
    async def handle_unsubscribe(self, websocket: Any, data: Dict[str, Any], session_id: str):
        """Handle unsubscription from monitoring updates."""
        subscription_types = data.get('subscription_types', ['all'])
        
        await self.send_message(websocket, {
            'type': 'unsubscription_confirmed',
            'subscription_types': subscription_types,
            'session_id': session_id
        })
        
    async def handle_get_metrics(self, websocket: Any, data: Dict[str, Any], session_id: str):
        """Handle request for metrics data."""
        metric_type = data.get('metric_type')
        limit = data.get('limit', 100)
        
        # Convert string to enum if provided
        if metric_type:
            try:
                metric_type = MetricType(metric_type)
            except ValueError:
                await self.send_error(websocket, f"Invalid metric type: {metric_type}")
                return
                
        metrics = real_time_monitor.metrics_collector.get_session_metrics(
            session_id, metric_type, limit=limit
        )
        
        await self.send_message(websocket, {
            'type': 'metrics_data',
            'session_id': session_id,
            'metrics': [metric.to_dict() for metric in metrics],
            'count': len(metrics)
        })
        
    async def handle_get_alerts(self, websocket: Any, data: Dict[str, Any], session_id: str):
        """Handle request for alerts data."""
        include_resolved = data.get('include_resolved', False)
        
        alerts = real_time_monitor.alerts.get(session_id, [])
        
        if not include_resolved:
            alerts = [alert for alert in alerts if not alert.resolved]
            
        await self.send_message(websocket, {
            'type': 'alerts_data',
            'session_id': session_id,
            'alerts': [alert.to_dict() for alert in alerts],
            'count': len(alerts)
        })
        
    async def handle_resolve_alert(self, websocket: Any, data: Dict[str, Any], session_id: str):
        """Handle alert resolution request."""
        alert_id = data.get('alert_id')
        
        if not alert_id:
            await self.send_error(websocket, "Missing alert_id")
            return
            
        # Find and resolve alert
        alerts = real_time_monitor.alerts.get(session_id, [])
        for alert in alerts:
            if alert.alert_id == alert_id:
                alert.resolved = True
                
                await self.send_message(websocket, {
                    'type': 'alert_resolved',
                    'session_id': session_id,
                    'alert_id': alert_id
                })
                
                # Broadcast to all session connections
                await real_time_monitor.websocket_manager.broadcast_to_session(
                    session_id,
                    {
                        'type': 'alert_resolved',
                        'alert_id': alert_id
                    }
                )
                return
                
        await self.send_error(websocket, f"Alert not found: {alert_id}")
        
    async def handle_get_recording(self, websocket: Any, data: Dict[str, Any], session_id: str):
        """Handle request for session recording data."""
        include_events = data.get('include_events', False)
        
        if include_events:
            recording = real_time_monitor.session_recorder.get_recording(session_id)
            if recording:
                await self.send_message(websocket, {
                    'type': 'recording_data',
                    'session_id': session_id,
                    'recording': recording.to_dict()
                })
            else:
                await self.send_error(websocket, "Recording not found")
        else:
            summary = real_time_monitor.session_recorder.get_recording_summary(session_id)
            await self.send_message(websocket, {
                'type': 'recording_summary',
                'session_id': session_id,
                'summary': summary
            })
            
    async def send_message(self, websocket: Any, message: Dict[str, Any]):
        """Send a message to a WebSocket connection."""
        try:
            await websocket.send(json.dumps(message))
        except Exception as e:
            logger.error(f"Error sending WebSocket message: {e}")
            
    async def send_error(self, websocket: Any, error_message: str):
        """Send an error message to a WebSocket connection."""
        await self.send_message(websocket, {
            'type': 'error',
            'message': error_message,
            'timestamp': datetime.utcnow().isoformat()
        })


# FastAPI WebSocket endpoint integration
async def websocket_endpoint(websocket, session_id: str, user_id: str = None):
    """FastAPI WebSocket endpoint for demo monitoring."""
    handler = DemoWebSocketHandler()
    
    await websocket.accept()
    connection_id = await handler.connect(websocket, session_id, user_id)
    
    try:
        while True:
            # Wait for message
            message = await websocket.receive_text()
            await handler.handle_message(websocket, message, session_id)
            
    except Exception as e:
        logger.error(f"WebSocket error: {e}")
    finally:
        await handler.disconnect(websocket, connection_id)


# Utility functions for metric collection
async def collect_agent_metric(session_id: str, agent_id: str, 
                             metric_name: str, value: float, unit: str = "count"):
    """Utility function to collect agent metrics."""
    metric = DemoMetric(
        metric_id=f"{agent_id}_{metric_name}_{datetime.utcnow().timestamp()}",
        metric_type=MetricType.AGENT_ACTIVITY,
        name=metric_name,
        value=value,
        unit=unit,
        timestamp=datetime.utcnow(),
        session_id=session_id,
        agent_id=agent_id
    )
    
    await real_time_monitor.add_metric(metric)


async def collect_scenario_metric(session_id: str, scenario_id: str,
                                metric_name: str, value: float, unit: str = "count"):
    """Utility function to collect scenario metrics."""
    metric = DemoMetric(
        metric_id=f"{scenario_id}_{metric_name}_{datetime.utcnow().timestamp()}",
        metric_type=MetricType.SCENARIO_PROGRESS,
        name=metric_name,
        value=value,
        unit=unit,
        timestamp=datetime.utcnow(),
        session_id=session_id,
        scenario_id=scenario_id
    )
    
    await real_time_monitor.add_metric(metric)


async def collect_performance_metric(session_id: str, component: str,
                                   metric_name: str, value: float, unit: str = "ms"):
    """Utility function to collect performance metrics."""
    metric = DemoMetric(
        metric_id=f"{component}_{metric_name}_{datetime.utcnow().timestamp()}",
        metric_type=MetricType.PERFORMANCE,
        name=metric_name,
        value=value,
        unit=unit,
        timestamp=datetime.utcnow(),
        session_id=session_id,
        metadata={'component': component}
    )
    
    await real_time_monitor.add_metric(metric)


async def generate_alert(session_id: str, level: AlertLevel, title: str, 
                       message: str, scenario_id: str = None, 
                       metadata: Dict[str, Any] = None):
    """Utility function to generate alerts."""
    alert = DemoAlert(
        alert_id=f"alert_{datetime.utcnow().timestamp()}",
        level=level,
        title=title,
        message=message,
        timestamp=datetime.utcnow(),
        session_id=session_id,
        scenario_id=scenario_id,
        metadata=metadata
    )
    
    await real_time_monitor.add_alert(alert)


# Global handler instance
websocket_handler = DemoWebSocketHandler()