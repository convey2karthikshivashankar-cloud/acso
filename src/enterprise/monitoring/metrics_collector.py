"""
Metrics collector for ACSO Enterprise.
Collects and aggregates metrics from agents and infrastructure.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import prometheus_client
from prometheus_client import CollectorRegistry, Counter, Gauge, Histogram, Summary


@dataclass
class MetricPoint:
    """A single metric data point."""
    name: str
    value: float
    timestamp: datetime
    labels: Dict[str, str]
    metric_type: str  # counter, gauge, histogram, summary


class MetricsCollector:
    """Collects and manages metrics for ACSO Enterprise."""
    
    def __init__(self, registry: Optional[CollectorRegistry] = None):
        self.registry = registry or prometheus_client.REGISTRY
        self.logger = logging.getLogger(__name__)
        
        # Metric storage
        self.metrics: Dict[str, Any] = {}
        self.metric_history: Dict[str, List[MetricPoint]] = {}
        
        # Collection settings
        self.collection_interval = 30  # seconds
        self.history_retention = timedelta(hours=24)
        self.running = False
        self.collection_task: Optional[asyncio.Task] = None
        
        # Initialize core metrics
        self._initialize_core_metrics()
    
    def _initialize_core_metrics(self):
        """Initialize core Prometheus metrics."""
        
        # Agent lifecycle metrics
        self.agent_lifecycle_events = Counter(
            'acso_agent_lifecycle_events_total',
            'Total number of agent lifecycle events',
            ['agent_type', 'tenant_id', 'event_type'],
            registry=self.registry
        )
        
        self.agent_uptime = Gauge(
            'acso_agent_uptime_seconds',
            'Agent uptime in seconds',
            ['agent_id', 'agent_type', 'tenant_id'],
            registry=self.registry
        )
        
        self.agent_restart_count = Counter(
            'acso_agent_restarts_total',
            'Total number of agent restarts',
            ['agent_id', 'agent_type', 'tenant_id'],
            registry=self.registry
        )
        
        # Recovery metrics
        self.recovery_attempts = Counter(
            'acso_recovery_attempts_total',
            'Total number of recovery attempts',
            ['agent_type', 'tenant_id', 'recovery_type', 'success'],
            registry=self.registry
        )
        
        self.recovery_duration = Histogram(
            'acso_recovery_duration_seconds',
            'Time taken for recovery operations',
            ['agent_type', 'recovery_type'],
            registry=self.registry
        )
        
        # Workload metrics
        self.workload_distribution = Gauge(
            'acso_agent_workload_items',
            'Number of workload items per agent',
            ['agent_id', 'agent_type', 'tenant_id'],
            registry=self.registry
        )
        
        self.workload_redistributions = Counter(
            'acso_workload_redistributions_total',
            'Total number of workload redistributions',
            ['agent_type', 'tenant_id'],
            registry=self.registry
        )
        
        # Performance metrics
        self.agent_cpu_usage = Gauge(
            'acso_agent_cpu_usage_percent',
            'Agent CPU usage percentage',
            ['agent_id', 'agent_type', 'tenant_id'],
            registry=self.registry
        )
        
        self.agent_memory_usage = Gauge(
            'acso_agent_memory_usage_bytes',
            'Agent memory usage in bytes',
            ['agent_id', 'agent_type', 'tenant_id'],
            registry=self.registry
        )
        
        self.agent_network_io = Counter(
            'acso_agent_network_io_bytes_total',
            'Agent network I/O in bytes',
            ['agent_id', 'agent_type', 'tenant_id', 'direction'],
            registry=self.registry
        )
        
        # System metrics
        self.cluster_nodes = Gauge(
            'acso_cluster_nodes_total',
            'Total number of cluster nodes',
            ['status'],
            registry=self.registry
        )
        
        self.cluster_pods = Gauge(
            'acso_cluster_pods_total',
            'Total number of pods in cluster',
            ['namespace', 'status'],
            registry=self.registry
        )
        
        # Business metrics
        self.tenant_count = Gauge(
            'acso_tenants_total',
            'Total number of tenants',
            ['tier'],
            registry=self.registry
        )
        
        self.cost_savings = Counter(
            'acso_cost_savings_total',
            'Total cost savings achieved',
            ['tenant_id', 'category'],
            registry=self.registry
        )
        
        self.incidents_processed = Counter(
            'acso_incidents_processed_total',
            'Total number of incidents processed',
            ['tenant_id', 'severity', 'status'],
            registry=self.registry
        )
    
    async def start_collection(self):
        """Start metrics collection."""
        try:
            self.running = True
            self.collection_task = asyncio.create_task(self._collection_loop())
            self.logger.info("Metrics collection started")
            
        except Exception as e:
            self.logger.error(f"Failed to start metrics collection: {e}")
    
    async def stop_collection(self):
        """Stop metrics collection."""
        try:
            self.running = False
            
            if self.collection_task:
                self.collection_task.cancel()
                try:
                    await self.collection_task
                except asyncio.CancelledError:
                    pass
            
            self.logger.info("Metrics collection stopped")
            
        except Exception as e:
            self.logger.error(f"Error stopping metrics collection: {e}")
    
    async def _collection_loop(self):
        """Main metrics collection loop."""
        while self.running:
            try:
                await self._collect_system_metrics()
                await self._collect_agent_metrics()
                await self._collect_business_metrics()
                await self._cleanup_old_metrics()
                
                await asyncio.sleep(self.collection_interval)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Metrics collection error: {e}")
                await asyncio.sleep(60)  # Wait before retrying
    
    async def _collect_system_metrics(self):
        """Collect system-level metrics."""
        try:
            # This would collect actual system metrics
            # For now, we'll simulate some basic metrics
            
            # Simulate cluster node metrics
            self.cluster_nodes.labels(status="ready").set(3)
            self.cluster_nodes.labels(status="not_ready").set(0)
            
            # Simulate pod metrics
            self.cluster_pods.labels(namespace="acso-system", status="running").set(15)
            self.cluster_pods.labels(namespace="acso-tenants", status="running").set(45)
            
        except Exception as e:
            self.logger.error(f"System metrics collection failed: {e}")
    
    async def _collect_agent_metrics(self):
        """Collect agent-specific metrics."""
        try:
            # This would collect actual agent metrics from Kubernetes API
            # For now, we'll update existing metrics based on current state
            pass
            
        except Exception as e:
            self.logger.error(f"Agent metrics collection failed: {e}")
    
    async def _collect_business_metrics(self):
        """Collect business-level metrics."""
        try:
            # This would collect business metrics from various sources
            # For now, we'll simulate some basic metrics
            
            # Simulate tenant metrics
            self.tenant_count.labels(tier="enterprise").set(5)
            self.tenant_count.labels(tier="professional").set(15)
            self.tenant_count.labels(tier="standard").set(30)
            
        except Exception as e:
            self.logger.error(f"Business metrics collection failed: {e}")
    
    async def _cleanup_old_metrics(self):
        """Clean up old metric history."""
        try:
            cutoff_time = datetime.utcnow() - self.history_retention
            
            for metric_name, history in self.metric_history.items():
                # Remove old metric points
                self.metric_history[metric_name] = [
                    point for point in history
                    if point.timestamp > cutoff_time
                ]
            
        except Exception as e:
            self.logger.error(f"Metrics cleanup failed: {e}")
    
    def record_metric(self, name: str, value: float, labels: Optional[Dict[str, str]] = None,
                     metric_type: str = "gauge"):
        """Record a custom metric."""
        try:
            labels = labels or {}
            
            # Create metric point
            metric_point = MetricPoint(
                name=name,
                value=value,
                timestamp=datetime.utcnow(),
                labels=labels,
                metric_type=metric_type
            )
            
            # Store in history
            if name not in self.metric_history:
                self.metric_history[name] = []
            
            self.metric_history[name].append(metric_point)
            
            # Update current value
            self.metrics[name] = metric_point
            
        except Exception as e:
            self.logger.error(f"Failed to record metric {name}: {e}")
    
    def get_metric_history(self, name: str, duration: Optional[timedelta] = None) -> List[MetricPoint]:
        """Get metric history for a specific metric."""
        try:
            if name not in self.metric_history:
                return []
            
            history = self.metric_history[name]
            
            if duration:
                cutoff_time = datetime.utcnow() - duration
                history = [point for point in history if point.timestamp > cutoff_time]
            
            return sorted(history, key=lambda x: x.timestamp)
            
        except Exception as e:
            self.logger.error(f"Failed to get metric history for {name}: {e}")
            return []
    
    def get_current_metrics(self) -> Dict[str, MetricPoint]:
        """Get current metric values."""
        return self.metrics.copy()
    
    def get_metric_summary(self, name: str, duration: timedelta) -> Dict[str, float]:
        """Get summary statistics for a metric over a time period."""
        try:
            history = self.get_metric_history(name, duration)
            
            if not history:
                return {}
            
            values = [point.value for point in history]
            
            return {
                "count": len(values),
                "min": min(values),
                "max": max(values),
                "avg": sum(values) / len(values),
                "latest": values[-1] if values else 0
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get metric summary for {name}: {e}")
            return {}
    
    # Convenience methods for common metrics
    
    def record_agent_lifecycle_event(self, agent_type: str, tenant_id: str, event_type: str):
        """Record an agent lifecycle event."""
        self.agent_lifecycle_events.labels(
            agent_type=agent_type,
            tenant_id=tenant_id,
            event_type=event_type
        ).inc()
    
    def update_agent_uptime(self, agent_id: str, agent_type: str, tenant_id: str, uptime_seconds: float):
        """Update agent uptime metric."""
        self.agent_uptime.labels(
            agent_id=agent_id,
            agent_type=agent_type,
            tenant_id=tenant_id
        ).set(uptime_seconds)
    
    def record_recovery_attempt(self, agent_type: str, tenant_id: str, recovery_type: str, 
                              success: bool, duration_seconds: float):
        """Record a recovery attempt."""
        self.recovery_attempts.labels(
            agent_type=agent_type,
            tenant_id=tenant_id,
            recovery_type=recovery_type,
            success=str(success)
        ).inc()
        
        self.recovery_duration.labels(
            agent_type=agent_type,
            recovery_type=recovery_type
        ).observe(duration_seconds)
    
    def update_workload_distribution(self, agent_id: str, agent_type: str, tenant_id: str, 
                                   workload_count: int):
        """Update workload distribution metric."""
        self.workload_distribution.labels(
            agent_id=agent_id,
            agent_type=agent_type,
            tenant_id=tenant_id
        ).set(workload_count)
    
    def record_workload_redistribution(self, agent_type: str, tenant_id: str):
        """Record a workload redistribution event."""
        self.workload_redistributions.labels(
            agent_type=agent_type,
            tenant_id=tenant_id
        ).inc()
    
    def update_agent_performance(self, agent_id: str, agent_type: str, tenant_id: str,
                               cpu_percent: float, memory_bytes: int):
        """Update agent performance metrics."""
        self.agent_cpu_usage.labels(
            agent_id=agent_id,
            agent_type=agent_type,
            tenant_id=tenant_id
        ).set(cpu_percent)
        
        self.agent_memory_usage.labels(
            agent_id=agent_id,
            agent_type=agent_type,
            tenant_id=tenant_id
        ).set(memory_bytes)
    
    def record_network_io(self, agent_id: str, agent_type: str, tenant_id: str,
                         bytes_count: int, direction: str):
        """Record network I/O metrics."""
        self.agent_network_io.labels(
            agent_id=agent_id,
            agent_type=agent_type,
            tenant_id=tenant_id,
            direction=direction
        ).inc(bytes_count)
    
    def record_cost_savings(self, tenant_id: str, category: str, amount: float):
        """Record cost savings."""
        self.cost_savings.labels(
            tenant_id=tenant_id,
            category=category
        ).inc(amount)
    
    def record_incident_processed(self, tenant_id: str, severity: str, status: str):
        """Record processed incident."""
        self.incidents_processed.labels(
            tenant_id=tenant_id,
            severity=severity,
            status=status
        ).inc()
    
    async def export_metrics(self, format_type: str = "prometheus") -> str:
        """Export metrics in specified format."""
        try:
            if format_type == "prometheus":
                return prometheus_client.generate_latest(self.registry).decode('utf-8')
            else:
                raise ValueError(f"Unsupported export format: {format_type}")
                
        except Exception as e:
            self.logger.error(f"Metrics export failed: {e}")
            return ""