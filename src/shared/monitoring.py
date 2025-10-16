"""
Comprehensive monitoring and observability system for ACSO.
"""

import asyncio
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass, field

from config.settings import settings


class MetricType(str, Enum):
    """Types of metrics collected."""
    COUNTER = "counter"
    GAUGE = "gauge"
    HISTOGRAM = "histogram"
    TIMER = "timer"


class LogLevel(str, Enum):
    """Log levels for structured logging."""
    DEBUG = "debug"
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class Metric:
    """Represents a system metric."""
    name: str
    value: float
    metric_type: MetricType
    timestamp: datetime = field(default_factory=datetime.utcnow)
    labels: Dict[str, str] = field(default_factory=dict)
    unit: str = ""
    description: str = ""


@dataclass
class LogEntry:
    """Represents a structured log entry."""
    timestamp: datetime
    level: LogLevel
    message: str
    component: str
    agent_id: Optional[str] = None
    task_id: Optional[str] = None
    correlation_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "timestamp": self.timestamp.isoformat(),
            "level": self.level.value,
            "message": self.message,
            "component": self.component,
            "agent_id": self.agent_id,
            "task_id": self.task_id,
            "correlation_id": self.correlation_id,
            "metadata": self.metadata
        }


@dataclass
class Alert:
    """Represents a system alert."""
    alert_id: str
    name: str
    description: str
    severity: AlertSeverity
    component: str
    triggered_at: datetime
    resolved_at: Optional[datetime] = None
    status: str = "active"
    metadata: Dict[str, Any] = field(default_factory=dict)


class MetricsCollector:
    """Collects and manages system metrics."""
    
    def __init__(self):
        self.metrics: Dict[str, List[Metric]] = {}
        self.metric_callbacks: Dict[str, List[Callable]] = {}
        self.collection_interval = 30  # seconds
        self.running = False
        
    async def initialize(self) -> None:
        """Initialize the metrics collector."""
        self.running = True
        asyncio.create_task(self._collect_system_metrics())
        
    async def shutdown(self) -> None:
        """Shutdown the metrics collector."""
        self.running = False
        
    def record_metric(self, name: str, value: float, metric_type: MetricType,
                     labels: Dict[str, str] = None, unit: str = "",
                     description: str = "") -> None:
        """Record a metric value."""
        try:
            metric = Metric(
                name=name,
                value=value,
                metric_type=metric_type,
                labels=labels or {},
                unit=unit,
                description=description
            )
            
            if name not in self.metrics:
                self.metrics[name] = []
                
            self.metrics[name].append(metric)
            
            # Keep only recent metrics (last 1000 entries per metric)
            if len(self.metrics[name]) > 1000:
                self.metrics[name] = self.metrics[name][-1000:]
                
            # Trigger callbacks
            if name in self.metric_callbacks:
                for callback in self.metric_callbacks[name]:
                    try:
                        callback(metric)
                    except Exception as e:
                        print(f"Metric callback error: {e}")
                        
        except Exception as e:
            print(f"Failed to record metric {name}: {e}")
            
    def register_metric_callback(self, metric_name: str, callback: Callable[[Metric], None]) -> None:
        """Register a callback for metric updates."""
        if metric_name not in self.metric_callbacks:
            self.metric_callbacks[metric_name] = []
        self.metric_callbacks[metric_name].append(callback)
        
    def get_metrics(self, name: str, since: Optional[datetime] = None) -> List[Metric]:
        """Get metrics for a specific name."""
        if name not in self.metrics:
            return []
            
        metrics = self.metrics[name]
        
        if since:
            metrics = [m for m in metrics if m.timestamp >= since]
            
        return metrics
        
    def get_latest_metric(self, name: str) -> Optional[Metric]:
        """Get the latest metric value."""
        metrics = self.get_metrics(name)
        return metrics[-1] if metrics else None
        
    def get_metric_summary(self, name: str, duration: timedelta) -> Dict[str, Any]:
        """Get metric summary over a time period."""
        since = datetime.utcnow() - duration
        metrics = self.get_metrics(name, since)
        
        if not metrics:
            return {"count": 0}
            
        values = [m.value for m in metrics]
        
        return {
            "count": len(values),
            "min": min(values),
            "max": max(values),
            "avg": sum(values) / len(values),
            "latest": values[-1],
            "first": values[0]
        }
        
    async def _collect_system_metrics(self) -> None:
        """Collect system-level metrics periodically."""
        while self.running:
            try:
                # Collect system metrics
                await self._collect_performance_metrics()
                await self._collect_agent_metrics()
                await self._collect_task_metrics()
                
                await asyncio.sleep(self.collection_interval)
                
            except Exception as e:
                print(f"System metrics collection error: {e}")
                await asyncio.sleep(self.collection_interval)
                
    async def _collect_performance_metrics(self) -> None:
        """Collect system performance metrics."""
        try:
            import psutil
            
            # CPU metrics
            cpu_percent = psutil.cpu_percent(interval=1)
            self.record_metric("system.cpu.usage", cpu_percent, MetricType.GAUGE, unit="%")
            
            # Memory metrics
            memory = psutil.virtual_memory()
            self.record_metric("system.memory.usage", memory.percent, MetricType.GAUGE, unit="%")
            self.record_metric("system.memory.available", memory.available, MetricType.GAUGE, unit="bytes")
            
            # Disk metrics
            disk = psutil.disk_usage('/')
            disk_percent = (disk.used / disk.total) * 100
            self.record_metric("system.disk.usage", disk_percent, MetricType.GAUGE, unit="%")
            
        except ImportError:
            # Simulate metrics if psutil not available
            import random
            self.record_metric("system.cpu.usage", random.uniform(10, 80), MetricType.GAUGE, unit="%")
            self.record_metric("system.memory.usage", random.uniform(30, 70), MetricType.GAUGE, unit="%")
            self.record_metric("system.disk.usage", random.uniform(20, 60), MetricType.GAUGE, unit="%")
        except Exception as e:
            print(f"Performance metrics collection failed: {e}")
            
    async def _collect_agent_metrics(self) -> None:
        """Collect agent-specific metrics."""
        try:
            # These would be collected from the actual agents
            # For prototype, we'll simulate some metrics
            
            agent_types = ["supervisor", "threat-hunter", "incident-response", 
                          "service-orchestration", "financial-intelligence"]
            
            for agent_type in agent_types:
                # Simulate agent health
                health_score = 95.0 + (5.0 * (hash(agent_type) % 10) / 10)
                self.record_metric(
                    "agent.health.score", 
                    health_score, 
                    MetricType.GAUGE,
                    labels={"agent_type": agent_type},
                    unit="score"
                )
                
                # Simulate task processing
                tasks_processed = hash(agent_type + str(int(time.time()))) % 20
                self.record_metric(
                    "agent.tasks.processed",
                    tasks_processed,
                    MetricType.COUNTER,
                    labels={"agent_type": agent_type},
                    unit="count"
                )
                
        except Exception as e:
            print(f"Agent metrics collection failed: {e}")
            
    async def _collect_task_metrics(self) -> None:
        """Collect task execution metrics."""
        try:
            # Simulate task metrics
            import random
            
            # Task completion rate
            completion_rate = random.uniform(85, 98)
            self.record_metric("tasks.completion_rate", completion_rate, MetricType.GAUGE, unit="%")
            
            # Average task duration
            avg_duration = random.uniform(30, 300)
            self.record_metric("tasks.avg_duration", avg_duration, MetricType.GAUGE, unit="seconds")
            
            # Task queue size
            queue_size = random.randint(0, 25)
            self.record_metric("tasks.queue_size", queue_size, MetricType.GAUGE, unit="count")
            
        except Exception as e:
            print(f"Task metrics collection failed: {e}")


class StructuredLogger:
    """Structured logging system for ACSO components."""
    
    def __init__(self, component: str):
        self.component = component
        self.log_entries: List[LogEntry] = []
        self.log_handlers: List[Callable[[LogEntry], None]] = []
        self.max_entries = 10000
        
    def add_handler(self, handler: Callable[[LogEntry], None]) -> None:
        """Add a log handler."""
        self.log_handlers.append(handler)
        
    def log(self, level: LogLevel, message: str, agent_id: Optional[str] = None,
            task_id: Optional[str] = None, correlation_id: Optional[str] = None,
            **metadata) -> None:
        """Log a structured message."""
        try:
            entry = LogEntry(
                timestamp=datetime.utcnow(),
                level=level,
                message=message,
                component=self.component,
                agent_id=agent_id,
                task_id=task_id,
                correlation_id=correlation_id,
                metadata=metadata
            )
            
            # Store entry
            self.log_entries.append(entry)
            
            # Maintain size limit
            if len(self.log_entries) > self.max_entries:
                self.log_entries = self.log_entries[-self.max_entries:]
                
            # Send to handlers
            for handler in self.log_handlers:
                try:
                    handler(entry)
                except Exception as e:
                    print(f"Log handler error: {e}")
                    
        except Exception as e:
            print(f"Logging failed: {e}")
            
    def debug(self, message: str, **kwargs) -> None:
        """Log debug message."""
        self.log(LogLevel.DEBUG, message, **kwargs)
        
    def info(self, message: str, **kwargs) -> None:
        """Log info message."""
        self.log(LogLevel.INFO, message, **kwargs)
        
    def warning(self, message: str, **kwargs) -> None:
        """Log warning message."""
        self.log(LogLevel.WARNING, message, **kwargs)
        
    def error(self, message: str, **kwargs) -> None:
        """Log error message."""
        self.log(LogLevel.ERROR, message, **kwargs)
        
    def critical(self, message: str, **kwargs) -> None:
        """Log critical message."""
        self.log(LogLevel.CRITICAL, message, **kwargs)
        
    def get_logs(self, level: Optional[LogLevel] = None, 
                component: Optional[str] = None,
                since: Optional[datetime] = None,
                limit: int = 100) -> List[LogEntry]:
        """Get filtered log entries."""
        logs = self.log_entries
        
        if level:
            logs = [log for log in logs if log.level == level]
            
        if component:
            logs = [log for log in logs if log.component == component]
            
        if since:
            logs = [log for log in logs if log.timestamp >= since]
            
        return logs[-limit:]c
lass AlertManager:
    """Manages system alerts and notifications."""
    
    def __init__(self):
        self.alerts: Dict[str, Alert] = {}
        self.alert_rules: List[Dict[str, Any]] = []
        self.notification_handlers: List[Callable[[Alert], None]] = []
        self.running = False
        
    async def initialize(self) -> None:
        """Initialize the alert manager."""
        self.running = True
        self._initialize_alert_rules()
        asyncio.create_task(self._process_alerts())
        
    async def shutdown(self) -> None:
        """Shutdown the alert manager."""
        self.running = False
        
    def _initialize_alert_rules(self) -> None:
        """Initialize alert rules."""
        self.alert_rules = [
            {
                "name": "high_cpu_usage",
                "condition": "system.cpu.usage > 90",
                "severity": AlertSeverity.HIGH,
                "description": "CPU usage is critically high",
                "cooldown": 300  # 5 minutes
            },
            {
                "name": "high_memory_usage",
                "condition": "system.memory.usage > 85",
                "severity": AlertSeverity.MEDIUM,
                "description": "Memory usage is high",
                "cooldown": 300
            },
            {
                "name": "agent_failure",
                "condition": "agent.health.score < 50",
                "severity": AlertSeverity.CRITICAL,
                "description": "Agent health score is critically low",
                "cooldown": 60
            },
            {
                "name": "task_queue_buildup",
                "condition": "tasks.queue_size > 50",
                "severity": AlertSeverity.MEDIUM,
                "description": "Task queue is building up",
                "cooldown": 180
            },
            {
                "name": "low_task_completion_rate",
                "condition": "tasks.completion_rate < 80",
                "severity": AlertSeverity.HIGH,
                "description": "Task completion rate is low",
                "cooldown": 600
            }
        ]
        
    def add_notification_handler(self, handler: Callable[[Alert], None]) -> None:
        """Add a notification handler for alerts."""
        self.notification_handlers.append(handler)
        
    def trigger_alert(self, name: str, description: str, severity: AlertSeverity,
                     component: str, metadata: Dict[str, Any] = None) -> str:
        """Manually trigger an alert."""
        alert_id = str(uuid.uuid4())
        
        alert = Alert(
            alert_id=alert_id,
            name=name,
            description=description,
            severity=severity,
            component=component,
            triggered_at=datetime.utcnow(),
            metadata=metadata or {}
        )
        
        self.alerts[alert_id] = alert
        
        # Send notifications
        for handler in self.notification_handlers:
            try:
                handler(alert)
            except Exception as e:
                print(f"Alert notification failed: {e}")
                
        return alert_id
        
    def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an active alert."""
        if alert_id in self.alerts:
            alert = self.alerts[alert_id]
            alert.resolved_at = datetime.utcnow()
            alert.status = "resolved"
            return True
        return False
        
    def get_active_alerts(self) -> List[Alert]:
        """Get all active alerts."""
        return [alert for alert in self.alerts.values() if alert.status == "active"]
        
    def get_alerts_by_severity(self, severity: AlertSeverity) -> List[Alert]:
        """Get alerts by severity level."""
        return [alert for alert in self.alerts.values() if alert.severity == severity]
        
    async def _process_alerts(self) -> None:
        """Process alert rules periodically."""
        while self.running:
            try:
                await self._evaluate_alert_rules()
                await asyncio.sleep(30)  # Check every 30 seconds
            except Exception as e:
                print(f"Alert processing error: {e}")
                await asyncio.sleep(30)
                
    async def _evaluate_alert_rules(self) -> None:
        """Evaluate alert rules against current metrics."""
        try:
            for rule in self.alert_rules:
                # Check if alert should be triggered
                should_trigger = await self._evaluate_alert_condition(rule)
                
                if should_trigger:
                    # Check cooldown
                    if not self._is_in_cooldown(rule):
                        self.trigger_alert(
                            name=rule["name"],
                            description=rule["description"],
                            severity=rule["severity"],
                            component="system",
                            metadata={"rule": rule["name"]}
                        )
                        
        except Exception as e:
            print(f"Alert rule evaluation failed: {e}")
            
    async def _evaluate_alert_condition(self, rule: Dict[str, Any]) -> bool:
        """Evaluate if an alert condition is met."""
        try:
            condition = rule["condition"]
            
            # Simple condition parsing (in real implementation, use proper parser)
            if "system.cpu.usage > 90" in condition:
                # Get latest CPU metric
                latest_cpu = metrics_collector.get_latest_metric("system.cpu.usage")
                return latest_cpu and latest_cpu.value > 90
                
            elif "system.memory.usage > 85" in condition:
                latest_memory = metrics_collector.get_latest_metric("system.memory.usage")
                return latest_memory and latest_memory.value > 85
                
            elif "agent.health.score < 50" in condition:
                # Check any agent with low health
                agent_metrics = metrics_collector.get_metrics("agent.health.score")
                recent_metrics = [m for m in agent_metrics if 
                                (datetime.utcnow() - m.timestamp).seconds < 300]
                return any(m.value < 50 for m in recent_metrics)
                
            elif "tasks.queue_size > 50" in condition:
                latest_queue = metrics_collector.get_latest_metric("tasks.queue_size")
                return latest_queue and latest_queue.value > 50
                
            elif "tasks.completion_rate < 80" in condition:
                latest_rate = metrics_collector.get_latest_metric("tasks.completion_rate")
                return latest_rate and latest_rate.value < 80
                
            return False
            
        except Exception as e:
            print(f"Condition evaluation failed: {e}")
            return False
            
    def _is_in_cooldown(self, rule: Dict[str, Any]) -> bool:
        """Check if alert rule is in cooldown period."""
        try:
            rule_name = rule["name"]
            cooldown_seconds = rule.get("cooldown", 300)
            
            # Find most recent alert for this rule
            recent_alerts = [
                alert for alert in self.alerts.values()
                if alert.name == rule_name and alert.status == "active"
            ]
            
            if recent_alerts:
                latest_alert = max(recent_alerts, key=lambda a: a.triggered_at)
                time_since = (datetime.utcnow() - latest_alert.triggered_at).total_seconds()
                return time_since < cooldown_seconds
                
            return False
            
        except Exception:
            return False


class PerformanceTracker:
    """Tracks performance metrics for agents and tasks."""
    
    def __init__(self):
        self.performance_data: Dict[str, List[Dict[str, Any]]] = {}
        
    def track_task_performance(self, task_id: str, agent_id: str, 
                             start_time: datetime, end_time: datetime,
                             success: bool, metadata: Dict[str, Any] = None) -> None:
        """Track task performance metrics."""
        try:
            duration = (end_time - start_time).total_seconds()
            
            performance_record = {
                "task_id": task_id,
                "agent_id": agent_id,
                "start_time": start_time.isoformat(),
                "end_time": end_time.isoformat(),
                "duration": duration,
                "success": success,
                "metadata": metadata or {},
                "timestamp": datetime.utcnow().isoformat()
            }
            
            if agent_id not in self.performance_data:
                self.performance_data[agent_id] = []
                
            self.performance_data[agent_id].append(performance_record)
            
            # Keep only recent records (last 1000 per agent)
            if len(self.performance_data[agent_id]) > 1000:
                self.performance_data[agent_id] = self.performance_data[agent_id][-1000:]
                
            # Record metrics
            metrics_collector.record_metric(
                "task.duration",
                duration,
                MetricType.HISTOGRAM,
                labels={"agent_id": agent_id, "success": str(success)},
                unit="seconds"
            )
            
            metrics_collector.record_metric(
                "task.success_rate",
                1.0 if success else 0.0,
                MetricType.GAUGE,
                labels={"agent_id": agent_id},
                unit="rate"
            )
            
        except Exception as e:
            print(f"Performance tracking failed: {e}")
            
    def get_agent_performance_summary(self, agent_id: str, 
                                    duration: timedelta) -> Dict[str, Any]:
        """Get performance summary for an agent."""
        try:
            if agent_id not in self.performance_data:
                return {"error": "No performance data available"}
                
            since = datetime.utcnow() - duration
            recent_records = [
                record for record in self.performance_data[agent_id]
                if datetime.fromisoformat(record["timestamp"]) >= since
            ]
            
            if not recent_records:
                return {"error": "No recent performance data"}
                
            total_tasks = len(recent_records)
            successful_tasks = len([r for r in recent_records if r["success"]])
            failed_tasks = total_tasks - successful_tasks
            
            durations = [r["duration"] for r in recent_records]
            avg_duration = sum(durations) / len(durations)
            min_duration = min(durations)
            max_duration = max(durations)
            
            return {
                "agent_id": agent_id,
                "period": str(duration),
                "total_tasks": total_tasks,
                "successful_tasks": successful_tasks,
                "failed_tasks": failed_tasks,
                "success_rate": successful_tasks / total_tasks if total_tasks > 0 else 0,
                "avg_duration": avg_duration,
                "min_duration": min_duration,
                "max_duration": max_duration,
                "tasks_per_hour": total_tasks / (duration.total_seconds() / 3600)
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    def get_system_performance_summary(self) -> Dict[str, Any]:
        """Get overall system performance summary."""
        try:
            all_agents = list(self.performance_data.keys())
            
            if not all_agents:
                return {"error": "No performance data available"}
                
            # Get last 24 hours of data
            duration = timedelta(hours=24)
            agent_summaries = {}
            
            total_system_tasks = 0
            total_system_successful = 0
            total_system_duration = 0
            
            for agent_id in all_agents:
                summary = self.get_agent_performance_summary(agent_id, duration)
                if "error" not in summary:
                    agent_summaries[agent_id] = summary
                    total_system_tasks += summary["total_tasks"]
                    total_system_successful += summary["successful_tasks"]
                    total_system_duration += summary["avg_duration"] * summary["total_tasks"]
                    
            system_success_rate = (total_system_successful / total_system_tasks 
                                 if total_system_tasks > 0 else 0)
            system_avg_duration = (total_system_duration / total_system_tasks 
                                 if total_system_tasks > 0 else 0)
            
            return {
                "system_summary": {
                    "total_tasks": total_system_tasks,
                    "successful_tasks": total_system_successful,
                    "system_success_rate": system_success_rate,
                    "system_avg_duration": system_avg_duration,
                    "active_agents": len(agent_summaries)
                },
                "agent_summaries": agent_summaries,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            return {"error": str(e)}


# Global instances
metrics_collector = MetricsCollector()
alert_manager = AlertManager()
performance_tracker = PerformanceTracker()


def get_system_logger(component: str) -> StructuredLogger:
    """Get a structured logger for a component."""
    return StructuredLogger(component)


async def initialize_monitoring_system() -> None:
    """Initialize the complete monitoring system."""
    try:
        await metrics_collector.initialize()
        await alert_manager.initialize()
        
        # Add console notification handler for alerts
        def console_alert_handler(alert: Alert):
            print(f"ALERT [{alert.severity.value.upper()}] {alert.name}: {alert.description}")
            
        alert_manager.add_notification_handler(console_alert_handler)
        
        print("Monitoring system initialized successfully")
        
    except Exception as e:
        print(f"Failed to initialize monitoring system: {e}")


async def shutdown_monitoring_system() -> None:
    """Shutdown the monitoring system."""
    try:
        await metrics_collector.shutdown()
        await alert_manager.shutdown()
        print("Monitoring system shutdown complete")
    except Exception as e:
        print(f"Monitoring system shutdown error: {e}")