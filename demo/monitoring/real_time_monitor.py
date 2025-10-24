"""
Real-time demo monitoring system for ACSO Phase 5 demonstrations.
Provides WebSocket-based real-time updates, metrics collection, and performance monitoring.
"""

import asyncio
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
import logging

logger = logging.getLogger(__name__)


class MetricType(str, Enum):
    """Types of metrics that can be collected."""
    PERFORMANCE = "performance"
    AGENT_ACTIVITY = "agent_activity"
    SCENARIO_PROGRESS = "scenario_progress"
    USER_INTERACTION = "user_interaction"
    SYSTEM_HEALTH = "system_health"
    BUSINESS_IMPACT = "business_impact"


class AlertLevel(str, Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


@dataclass
class DemoMetric:
    """Represents a demo metric data point."""
    metric_id: str
    metric_type: MetricType
    name: str
    value: float
    unit: str
    timestamp: datetime
    session_id: str
    scenario_id: Optional[str] = None
    agent_id: Optional[str] = None
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert metric to dictionary for JSON serialization."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class DemoAlert:
    """Represents a demo system alert."""
    alert_id: str
    level: AlertLevel
    title: str
    message: str
    timestamp: datetime
    session_id: str
    scenario_id: Optional[str] = None
    resolved: bool = False
    metadata: Optional[Dict[str, Any]] = None

    def to_dict(self) -> Dict[str, Any]:
        """Convert alert to dictionary for JSON serialization."""
        data = asdict(self)
        data['timestamp'] = self.timestamp.isoformat()
        return data


@dataclass
class SessionRecording:
    """Represents a demo session recording."""
    recording_id: str
    session_id: str
    start_time: datetime
    end_time: Optional[datetime]
    events: List[Dict[str, Any]]
    metadata: Dict[str, Any]

    def to_dict(self) -> Dict[str, Any]:
        """Convert recording to dictionary for JSON serialization."""
        data = asdict(self)
        data['start_time'] = self.start_time.isoformat()
        if self.end_time:
            data['end_time'] = self.end_time.isoformat()
        return data


class WebSocketManager:
    """Manages WebSocket connections for real-time updates."""
    
    def __init__(self):
        self.connections: Dict[str, Set[Any]] = {}  # session_id -> set of websockets
        self.connection_metadata: Dict[Any, Dict[str, Any]] = {}
        
    async def add_connection(self, websocket: Any, session_id: str, user_id: str = None):
        """Add a WebSocket connection for a demo session."""
        if session_id not in self.connections:
            self.connections[session_id] = set()
            
        self.connections[session_id].add(websocket)
        self.connection_metadata[websocket] = {
            'session_id': session_id,
            'user_id': user_id,
            'connected_at': datetime.utcnow(),
            'last_ping': datetime.utcnow()
        }
        
        logger.info(f"WebSocket connection added for session {session_id}")
        
    async def remove_connection(self, websocket: Any):
        """Remove a WebSocket connection."""
        if websocket in self.connection_metadata:
            metadata = self.connection_metadata[websocket]
            session_id = metadata['session_id']
            
            if session_id in self.connections:
                self.connections[session_id].discard(websocket)
                if not self.connections[session_id]:
                    del self.connections[session_id]
                    
            del self.connection_metadata[websocket]
            logger.info(f"WebSocket connection removed for session {session_id}")
            
    async def broadcast_to_session(self, session_id: str, message: Dict[str, Any]):
        """Broadcast a message to all connections in a session."""
        if session_id not in self.connections:
            return
            
        message_json = json.dumps(message)
        disconnected = set()
        
        for websocket in self.connections[session_id]:
            try:
                await websocket.send(message_json)
            except Exception as e:
                logger.warning(f"Failed to send message to WebSocket: {e}")
                disconnected.add(websocket)
                
        # Clean up disconnected websockets
        for websocket in disconnected:
            await self.remove_connection(websocket)
            
    async def broadcast_to_all(self, message: Dict[str, Any]):
        """Broadcast a message to all connected sessions."""
        for session_id in list(self.connections.keys()):
            await self.broadcast_to_session(session_id, message)
            
    def get_session_connections(self, session_id: str) -> int:
        """Get the number of active connections for a session."""
        return len(self.connections.get(session_id, set()))
        
    def get_total_connections(self) -> int:
        """Get the total number of active connections."""
        return sum(len(connections) for connections in self.connections.values())


class MetricsCollector:
    """Collects and manages demo metrics."""
    
    def __init__(self, max_metrics_per_session: int = 10000):
        self.metrics: Dict[str, List[DemoMetric]] = {}  # session_id -> metrics
        self.max_metrics_per_session = max_metrics_per_session
        self.metric_aggregates: Dict[str, Dict[str, Any]] = {}
        
    async def collect_metric(self, metric: DemoMetric):
        """Collect a demo metric."""
        session_id = metric.session_id
        
        if session_id not in self.metrics:
            self.metrics[session_id] = []
            
        self.metrics[session_id].append(metric)
        
        # Maintain size limit
        if len(self.metrics[session_id]) > self.max_metrics_per_session:
            self.metrics[session_id] = self.metrics[session_id][-self.max_metrics_per_session:]
            
        # Update aggregates
        await self._update_aggregates(metric)
        
        logger.debug(f"Collected metric: {metric.name} = {metric.value} for session {session_id}")
        
    async def _update_aggregates(self, metric: DemoMetric):
        """Update metric aggregates for real-time dashboards."""
        session_id = metric.session_id
        
        if session_id not in self.metric_aggregates:
            self.metric_aggregates[session_id] = {}
            
        aggregates = self.metric_aggregates[session_id]
        metric_key = f"{metric.metric_type}_{metric.name}"
        
        if metric_key not in aggregates:
            aggregates[metric_key] = {
                'count': 0,
                'sum': 0,
                'min': float('inf'),
                'max': float('-inf'),
                'avg': 0,
                'last_value': 0,
                'last_timestamp': None
            }
            
        agg = aggregates[metric_key]
        agg['count'] += 1
        agg['sum'] += metric.value
        agg['min'] = min(agg['min'], metric.value)
        agg['max'] = max(agg['max'], metric.value)
        agg['avg'] = agg['sum'] / agg['count']
        agg['last_value'] = metric.value
        agg['last_timestamp'] = metric.timestamp.isoformat()
        
    def get_session_metrics(self, session_id: str, 
                          metric_type: Optional[MetricType] = None,
                          since: Optional[datetime] = None,
                          limit: Optional[int] = None) -> List[DemoMetric]:
        """Get metrics for a session with optional filtering."""
        if session_id not in self.metrics:
            return []
            
        metrics = self.metrics[session_id]
        
        # Filter by type
        if metric_type:
            metrics = [m for m in metrics if m.metric_type == metric_type]
            
        # Filter by time
        if since:
            metrics = [m for m in metrics if m.timestamp >= since]
            
        # Apply limit
        if limit:
            metrics = metrics[-limit:]
            
        return metrics
        
    def get_session_aggregates(self, session_id: str) -> Dict[str, Any]:
        """Get aggregated metrics for a session."""
        return self.metric_aggregates.get(session_id, {})
        
    def get_real_time_stats(self, session_id: str) -> Dict[str, Any]:
        """Get real-time statistics for a session."""
        metrics = self.metrics.get(session_id, [])
        aggregates = self.metric_aggregates.get(session_id, {})
        
        # Calculate recent activity (last 5 minutes)
        recent_cutoff = datetime.utcnow() - timedelta(minutes=5)
        recent_metrics = [m for m in metrics if m.timestamp >= recent_cutoff]
        
        return {
            'total_metrics': len(metrics),
            'recent_metrics': len(recent_metrics),
            'metric_types': list(set(m.metric_type for m in metrics)),
            'aggregates': aggregates,
            'last_update': metrics[-1].timestamp.isoformat() if metrics else None
        }


class PerformanceMonitor:
    """Monitors demo system performance."""
    
    def __init__(self):
        self.performance_data: Dict[str, List[Dict[str, Any]]] = {}
        self.alert_thresholds = {
            'response_time_ms': 5000,  # 5 seconds
            'memory_usage_mb': 1000,   # 1GB
            'cpu_usage_percent': 80,   # 80%
            'error_rate_percent': 5    # 5%
        }
        
    async def record_performance(self, session_id: str, component: str, 
                               metrics: Dict[str, float]):
        """Record performance metrics for a component."""
        if session_id not in self.performance_data:
            self.performance_data[session_id] = []
            
        performance_record = {
            'timestamp': datetime.utcnow().isoformat(),
            'component': component,
            'metrics': metrics
        }
        
        self.performance_data[session_id].append(performance_record)
        
        # Check for performance alerts
        await self._check_performance_alerts(session_id, component, metrics)
        
    async def _check_performance_alerts(self, session_id: str, component: str, 
                                      metrics: Dict[str, float]) -> List[DemoAlert]:
        """Check performance metrics against thresholds and generate alerts."""
        alerts = []
        
        for metric_name, value in metrics.items():
            if metric_name in self.alert_thresholds:
                threshold = self.alert_thresholds[metric_name]
                
                if value > threshold:
                    alert = DemoAlert(
                        alert_id=str(uuid.uuid4()),
                        level=AlertLevel.WARNING,
                        title=f"Performance Alert: {component}",
                        message=f"{metric_name} is {value}, exceeding threshold of {threshold}",
                        timestamp=datetime.utcnow(),
                        session_id=session_id,
                        metadata={
                            'component': component,
                            'metric_name': metric_name,
                            'value': value,
                            'threshold': threshold
                        }
                    )
                    alerts.append(alert)
                    
        return alerts
        
    def get_performance_summary(self, session_id: str) -> Dict[str, Any]:
        """Get performance summary for a session."""
        if session_id not in self.performance_data:
            return {}
            
        data = self.performance_data[session_id]
        
        # Calculate averages and trends
        components = set(record['component'] for record in data)
        summary = {}
        
        for component in components:
            component_data = [r for r in data if r['component'] == component]
            
            if component_data:
                latest = component_data[-1]
                summary[component] = {
                    'latest_metrics': latest['metrics'],
                    'record_count': len(component_data),
                    'last_update': latest['timestamp']
                }
                
        return summary


class SessionRecorder:
    """Records demo sessions for playback and analysis."""
    
    def __init__(self):
        self.recordings: Dict[str, SessionRecording] = {}
        self.active_recordings: Set[str] = set()
        
    async def start_recording(self, session_id: str, metadata: Dict[str, Any] = None):
        """Start recording a demo session."""
        recording_id = str(uuid.uuid4())
        
        recording = SessionRecording(
            recording_id=recording_id,
            session_id=session_id,
            start_time=datetime.utcnow(),
            end_time=None,
            events=[],
            metadata=metadata or {}
        )
        
        self.recordings[session_id] = recording
        self.active_recordings.add(session_id)
        
        logger.info(f"Started recording session {session_id}")
        return recording_id
        
    async def record_event(self, session_id: str, event_type: str, 
                         event_data: Dict[str, Any]):
        """Record an event in the session."""
        if session_id not in self.recordings:
            return
            
        event = {
            'timestamp': datetime.utcnow().isoformat(),
            'event_type': event_type,
            'data': event_data
        }
        
        self.recordings[session_id].events.append(event)
        
    async def stop_recording(self, session_id: str):
        """Stop recording a demo session."""
        if session_id in self.recordings:
            self.recordings[session_id].end_time = datetime.utcnow()
            self.active_recordings.discard(session_id)
            
            logger.info(f"Stopped recording session {session_id}")
            
    def get_recording(self, session_id: str) -> Optional[SessionRecording]:
        """Get a session recording."""
        return self.recordings.get(session_id)
        
    def get_recording_summary(self, session_id: str) -> Dict[str, Any]:
        """Get a summary of a session recording."""
        recording = self.recordings.get(session_id)
        if not recording:
            return {}
            
        duration = None
        if recording.end_time:
            duration = (recording.end_time - recording.start_time).total_seconds()
            
        event_types = set(event['event_type'] for event in recording.events)
        
        return {
            'recording_id': recording.recording_id,
            'session_id': recording.session_id,
            'start_time': recording.start_time.isoformat(),
            'end_time': recording.end_time.isoformat() if recording.end_time else None,
            'duration_seconds': duration,
            'event_count': len(recording.events),
            'event_types': list(event_types),
            'is_active': session_id in self.active_recordings
        }


class RealTimeDemoMonitor:
    """Main real-time demo monitoring system."""
    
    def __init__(self):
        self.websocket_manager = WebSocketManager()
        self.metrics_collector = MetricsCollector()
        self.performance_monitor = PerformanceMonitor()
        self.session_recorder = SessionRecorder()
        self.alerts: Dict[str, List[DemoAlert]] = {}
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}
        
    async def start_session_monitoring(self, session_id: str, 
                                     recording_enabled: bool = True):
        """Start monitoring a demo session."""
        logger.info(f"Starting monitoring for session {session_id}")
        
        # Start recording if enabled
        if recording_enabled:
            await self.session_recorder.start_recording(session_id)
            
        # Start monitoring task
        task = asyncio.create_task(self._monitor_session(session_id))
        self.monitoring_tasks[session_id] = task
        
        # Initialize alerts list
        self.alerts[session_id] = []
        
    async def stop_session_monitoring(self, session_id: str):
        """Stop monitoring a demo session."""
        logger.info(f"Stopping monitoring for session {session_id}")
        
        # Stop recording
        await self.session_recorder.stop_recording(session_id)
        
        # Cancel monitoring task
        if session_id in self.monitoring_tasks:
            self.monitoring_tasks[session_id].cancel()
            del self.monitoring_tasks[session_id]
            
    async def _monitor_session(self, session_id: str):
        """Background monitoring task for a session."""
        try:
            while True:
                # Collect system metrics
                await self._collect_system_metrics(session_id)
                
                # Check for alerts
                await self._check_alerts(session_id)
                
                # Broadcast updates
                await self._broadcast_updates(session_id)
                
                # Wait before next iteration
                await asyncio.sleep(1)  # 1 second monitoring interval
                
        except asyncio.CancelledError:
            logger.info(f"Monitoring cancelled for session {session_id}")
        except Exception as e:
            logger.error(f"Error in session monitoring: {e}")
            
    async def _collect_system_metrics(self, session_id: str):
        """Collect system-level metrics."""
        import psutil
        
        # CPU usage
        cpu_metric = DemoMetric(
            metric_id=str(uuid.uuid4()),
            metric_type=MetricType.SYSTEM_HEALTH,
            name="cpu_usage_percent",
            value=psutil.cpu_percent(),
            unit="percent",
            timestamp=datetime.utcnow(),
            session_id=session_id
        )
        await self.metrics_collector.collect_metric(cpu_metric)
        
        # Memory usage
        memory = psutil.virtual_memory()
        memory_metric = DemoMetric(
            metric_id=str(uuid.uuid4()),
            metric_type=MetricType.SYSTEM_HEALTH,
            name="memory_usage_percent",
            value=memory.percent,
            unit="percent",
            timestamp=datetime.utcnow(),
            session_id=session_id
        )
        await self.metrics_collector.collect_metric(memory_metric)
        
    async def _check_alerts(self, session_id: str):
        """Check for system alerts."""
        # Get recent metrics
        recent_metrics = self.metrics_collector.get_session_metrics(
            session_id, 
            since=datetime.utcnow() - timedelta(minutes=1)
        )
        
        # Check for alert conditions
        for metric in recent_metrics:
            if metric.metric_type == MetricType.SYSTEM_HEALTH:
                if metric.name == "cpu_usage_percent" and metric.value > 90:
                    alert = DemoAlert(
                        alert_id=str(uuid.uuid4()),
                        level=AlertLevel.WARNING,
                        title="High CPU Usage",
                        message=f"CPU usage is {metric.value}%",
                        timestamp=datetime.utcnow(),
                        session_id=session_id
                    )
                    await self.add_alert(alert)
                    
    async def _broadcast_updates(self, session_id: str):
        """Broadcast real-time updates to connected clients."""
        # Get current stats
        stats = self.metrics_collector.get_real_time_stats(session_id)
        performance = self.performance_monitor.get_performance_summary(session_id)
        recording = self.session_recorder.get_recording_summary(session_id)
        
        # Recent alerts
        recent_alerts = [
            alert.to_dict() for alert in self.alerts.get(session_id, [])
            if not alert.resolved and 
            (datetime.utcnow() - alert.timestamp).total_seconds() < 300  # Last 5 minutes
        ]
        
        update_message = {
            'type': 'monitoring_update',
            'session_id': session_id,
            'timestamp': datetime.utcnow().isoformat(),
            'data': {
                'metrics_stats': stats,
                'performance_summary': performance,
                'recording_summary': recording,
                'recent_alerts': recent_alerts,
                'connections': self.websocket_manager.get_session_connections(session_id)
            }
        }
        
        await self.websocket_manager.broadcast_to_session(session_id, update_message)
        
    async def add_metric(self, metric: DemoMetric):
        """Add a metric to the monitoring system."""
        await self.metrics_collector.collect_metric(metric)
        
        # Record in session if recording is active
        await self.session_recorder.record_event(
            metric.session_id,
            'metric_collected',
            metric.to_dict()
        )
        
    async def add_alert(self, alert: DemoAlert):
        """Add an alert to the monitoring system."""
        session_id = alert.session_id
        
        if session_id not in self.alerts:
            self.alerts[session_id] = []
            
        self.alerts[session_id].append(alert)
        
        # Record in session if recording is active
        await self.session_recorder.record_event(
            session_id,
            'alert_generated',
            alert.to_dict()
        )
        
        # Broadcast alert immediately
        alert_message = {
            'type': 'alert',
            'session_id': session_id,
            'alert': alert.to_dict()
        }
        await self.websocket_manager.broadcast_to_session(session_id, alert_message)
        
        logger.warning(f"Alert generated for session {session_id}: {alert.title}")
        
    async def record_performance(self, session_id: str, component: str, 
                               metrics: Dict[str, float]):
        """Record performance metrics."""
        await self.performance_monitor.record_performance(session_id, component, metrics)
        
        # Record in session if recording is active
        await self.session_recorder.record_event(
            session_id,
            'performance_recorded',
            {
                'component': component,
                'metrics': metrics
            }
        )
        
    def get_session_status(self, session_id: str) -> Dict[str, Any]:
        """Get comprehensive status for a demo session."""
        return {
            'session_id': session_id,
            'monitoring_active': session_id in self.monitoring_tasks,
            'connections': self.websocket_manager.get_session_connections(session_id),
            'metrics_stats': self.metrics_collector.get_real_time_stats(session_id),
            'performance_summary': self.performance_monitor.get_performance_summary(session_id),
            'recording_summary': self.session_recorder.get_recording_summary(session_id),
            'alert_count': len(self.alerts.get(session_id, [])),
            'unresolved_alerts': len([
                a for a in self.alerts.get(session_id, []) if not a.resolved
            ])
        }
        
    def get_system_status(self) -> Dict[str, Any]:
        """Get overall system monitoring status."""
        return {
            'total_sessions': len(self.monitoring_tasks),
            'active_sessions': list(self.monitoring_tasks.keys()),
            'total_connections': self.websocket_manager.get_total_connections(),
            'total_alerts': sum(len(alerts) for alerts in self.alerts.values()),
            'system_health': 'healthy'  # Could be enhanced with actual health checks
        }


# Global monitor instance
real_time_monitor = RealTimeDemoMonitor()