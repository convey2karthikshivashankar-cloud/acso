"""
Workflow execution monitoring service for ACSO API Gateway.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from collections import defaultdict, deque
import uuid

from ..models.workflow import (
    WorkflowExecution, WorkflowExecutionStatus, WorkflowNodeExecution,
    WorkflowDefinition, WorkflowNode
)
from ..websocket.manager import websocket_manager

logger = logging.getLogger(__name__)


class ExecutionMetrics:
    """Metrics for workflow execution monitoring."""
    
    def __init__(self):
        self.total_executions = 0
        self.running_executions = 0
        self.completed_executions = 0
        self.failed_executions = 0
        self.average_execution_time = 0.0
        self.execution_history = deque(maxlen=1000)  # Keep last 1000 executions
        self.node_performance = defaultdict(list)  # node_type -> [execution_times]
        self.error_patterns = defaultdict(int)  # error_message -> count
        
    def record_execution_start(self, execution: WorkflowExecution):
        """Record the start of an execution."""
        self.total_executions += 1
        self.running_executions += 1
        
    def record_execution_completion(self, execution: WorkflowExecution):
        """Record the completion of an execution."""
        self.running_executions = max(0, self.running_executions - 1)
        
        if execution.status == WorkflowExecutionStatus.COMPLETED:
            self.completed_executions += 1
        elif execution.status == WorkflowExecutionStatus.FAILED:
            self.failed_executions += 1
            
            # Track error patterns
            if execution.error_message:
                error_key = execution.error_message[:100]  # Truncate long messages
                self.error_patterns[error_key] += 1
        
        # Update execution history
        if execution.duration_seconds:
            self.execution_history.append({
                "execution_id": execution.id,
                "workflow_id": execution.workflow_id,
                "duration": execution.duration_seconds,
                "status": execution.status.value,
                "timestamp": execution.completed_at.isoformat() if execution.completed_at else None
            })
            
            # Update average execution time
            completed_times = [
                h["duration"] for h in self.execution_history 
                if h["status"] == "completed" and h["duration"]
            ]
            if completed_times:
                self.average_execution_time = sum(completed_times) / len(completed_times)
        
        # Record node performance metrics
        for node_execution in execution.node_executions:
            if node_execution.duration_seconds and node_execution.status == WorkflowExecutionStatus.COMPLETED:
                # We'd need the node type from the workflow definition
                self.node_performance["generic"].append(node_execution.duration_seconds)
    
    def get_metrics_summary(self) -> Dict[str, Any]:
        """Get a summary of execution metrics."""
        success_rate = 0.0
        if self.total_executions > 0:
            success_rate = self.completed_executions / self.total_executions
        
        return {
            "total_executions": self.total_executions,
            "running_executions": self.running_executions,
            "completed_executions": self.completed_executions,
            "failed_executions": self.failed_executions,
            "success_rate": success_rate,
            "average_execution_time": self.average_execution_time,
            "recent_executions": list(self.execution_history)[-10:],  # Last 10 executions
            "top_errors": dict(sorted(self.error_patterns.items(), key=lambda x: x[1], reverse=True)[:5])
        }


class WorkflowExecutionMonitor:
    """Service for monitoring workflow executions in real-time."""
    
    def __init__(self):
        self.active_executions: Dict[str, WorkflowExecution] = {}
        self.execution_subscribers: Dict[str, Set[str]] = defaultdict(set)  # execution_id -> user_ids
        self.workflow_subscribers: Dict[str, Set[str]] = defaultdict(set)  # workflow_id -> user_ids
        self.global_subscribers: Set[str] = set()  # Users subscribed to all executions
        self.metrics = ExecutionMetrics()
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}
        self.execution_alerts: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        
        # Start background monitoring task
        self.background_monitor_task = asyncio.create_task(self._background_monitor())
    
    async def start_monitoring_execution(
        self,
        execution: WorkflowExecution,
        workflow: WorkflowDefinition
    ):
        """Start monitoring a workflow execution."""
        execution_id = execution.id
        
        # Store execution for monitoring
        self.active_executions[execution_id] = execution
        
        # Record metrics
        self.metrics.record_execution_start(execution)
        
        # Create monitoring task for this execution
        monitor_task = asyncio.create_task(
            self._monitor_execution(execution, workflow)
        )
        self.monitoring_tasks[execution_id] = monitor_task
        
        # Notify global subscribers
        await self._broadcast_execution_event(
            execution_id,
            "execution_started",
            {
                "execution_id": execution_id,
                "workflow_id": execution.workflow_id,
                "workflow_name": workflow.name,
                "started_by": execution.triggered_by,
                "trigger_type": execution.trigger_type.value
            }
        )
        
        logger.info(f"Started monitoring execution {execution_id}")
    
    async def stop_monitoring_execution(self, execution_id: str):
        """Stop monitoring a workflow execution."""
        if execution_id in self.active_executions:
            execution = self.active_executions[execution_id]
            
            # Record completion metrics
            self.metrics.record_execution_completion(execution)
            
            # Cancel monitoring task
            if execution_id in self.monitoring_tasks:
                self.monitoring_tasks[execution_id].cancel()
                del self.monitoring_tasks[execution_id]
            
            # Clean up
            del self.active_executions[execution_id]
            if execution_id in self.execution_subscribers:
                del self.execution_subscribers[execution_id]
            if execution_id in self.execution_alerts:
                del self.execution_alerts[execution_id]
            
            # Notify subscribers
            await self._broadcast_execution_event(
                execution_id,
                "execution_completed",
                {
                    "execution_id": execution_id,
                    "workflow_id": execution.workflow_id,
                    "status": execution.status.value,
                    "duration": execution.duration_seconds,
                    "error_message": execution.error_message
                }
            )
            
            logger.info(f"Stopped monitoring execution {execution_id}")
    
    async def subscribe_to_execution(self, execution_id: str, user_id: str):
        """Subscribe a user to execution updates."""
        self.execution_subscribers[execution_id].add(user_id)
        
        # Send current execution state
        if execution_id in self.active_executions:
            execution = self.active_executions[execution_id]
            await websocket_manager.broadcast_to_user(
                user_id,
                {
                    "type": "execution_state",
                    "execution_id": execution_id,
                    "status": execution.status.value,
                    "progress": execution.progress_percentage,
                    "node_executions": [
                        {
                            "node_id": ne.node_id,
                            "status": ne.status.value,
                            "started_at": ne.started_at.isoformat() if ne.started_at else None,
                            "completed_at": ne.completed_at.isoformat() if ne.completed_at else None,
                            "duration": ne.duration_seconds,
                            "error": ne.error_message
                        }
                        for ne in execution.node_executions
                    ]
                }
            )
    
    async def unsubscribe_from_execution(self, execution_id: str, user_id: str):
        """Unsubscribe a user from execution updates."""
        if execution_id in self.execution_subscribers:
            self.execution_subscribers[execution_id].discard(user_id)
    
    async def subscribe_to_workflow_executions(self, workflow_id: str, user_id: str):
        """Subscribe a user to all executions of a workflow."""
        self.workflow_subscribers[workflow_id].add(user_id)
    
    async def unsubscribe_from_workflow_executions(self, workflow_id: str, user_id: str):
        """Unsubscribe a user from workflow execution updates."""
        if workflow_id in self.workflow_subscribers:
            self.workflow_subscribers[workflow_id].discard(user_id)
    
    async def subscribe_to_all_executions(self, user_id: str):
        """Subscribe a user to all execution updates."""
        self.global_subscribers.add(user_id)
    
    async def unsubscribe_from_all_executions(self, user_id: str):
        """Unsubscribe a user from all execution updates."""
        self.global_subscribers.discard(user_id)
    
    async def get_execution_status(self, execution_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of an execution."""
        if execution_id not in self.active_executions:
            return None
        
        execution = self.active_executions[execution_id]
        
        return {
            "execution_id": execution_id,
            "workflow_id": execution.workflow_id,
            "status": execution.status.value,
            "progress": execution.progress_percentage,
            "started_at": execution.started_at.isoformat(),
            "duration": execution.duration_seconds,
            "error_message": execution.error_message,
            "node_count": len(execution.node_executions),
            "completed_nodes": len([
                ne for ne in execution.node_executions 
                if ne.status == WorkflowExecutionStatus.COMPLETED
            ]),
            "failed_nodes": len([
                ne for ne in execution.node_executions 
                if ne.status == WorkflowExecutionStatus.FAILED
            ]),
            "alerts": self.execution_alerts.get(execution_id, [])
        }
    
    async def get_active_executions(self) -> List[Dict[str, Any]]:
        """Get list of all active executions."""
        active_list = []
        
        for execution_id, execution in self.active_executions.items():
            status = await self.get_execution_status(execution_id)
            if status:
                active_list.append(status)
        
        return active_list
    
    async def get_execution_metrics(self) -> Dict[str, Any]:
        """Get execution metrics and statistics."""
        return self.metrics.get_metrics_summary()
    
    async def add_execution_alert(
        self,
        execution_id: str,
        alert_type: str,
        message: str,
        severity: str = "info"
    ):
        """Add an alert for an execution."""
        alert = {
            "id": str(uuid.uuid4()),
            "type": alert_type,
            "message": message,
            "severity": severity,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        self.execution_alerts[execution_id].append(alert)
        
        # Broadcast alert to subscribers
        await self._broadcast_execution_event(
            execution_id,
            "execution_alert",
            {
                "execution_id": execution_id,
                "alert": alert
            }
        )
    
    async def _monitor_execution(
        self,
        execution: WorkflowExecution,
        workflow: WorkflowDefinition
    ):
        """Monitor a single execution for progress and issues."""
        execution_id = execution.id
        last_progress = 0.0
        stalled_count = 0
        
        try:
            while execution.status in [
                WorkflowExecutionStatus.RUNNING,
                WorkflowExecutionStatus.WAITING_APPROVAL
            ]:
                await asyncio.sleep(5)  # Check every 5 seconds
                
                # Check for progress
                current_progress = execution.progress_percentage
                if current_progress == last_progress:
                    stalled_count += 1
                else:
                    stalled_count = 0
                    last_progress = current_progress
                
                # Alert if execution appears stalled
                if stalled_count >= 12:  # 1 minute of no progress
                    await self.add_execution_alert(
                        execution_id,
                        "stalled_execution",
                        f"Execution has not made progress for {stalled_count * 5} seconds",
                        "warning"
                    )
                    stalled_count = 0  # Reset to avoid spam
                
                # Check for long-running nodes
                for node_execution in execution.node_executions:
                    if (node_execution.status == WorkflowExecutionStatus.RUNNING and
                        node_execution.started_at):
                        
                        duration = (datetime.utcnow() - node_execution.started_at).total_seconds()
                        
                        # Find the node configuration
                        node = next(
                            (n for n in workflow.nodes if n.id == node_execution.node_id),
                            None
                        )
                        
                        if node and duration > node.config.timeout_seconds:
                            await self.add_execution_alert(
                                execution_id,
                                "node_timeout",
                                f"Node {node.name} has exceeded timeout ({duration:.1f}s > {node.config.timeout_seconds}s)",
                                "error"
                            )
                
                # Broadcast progress update
                await self._broadcast_execution_event(
                    execution_id,
                    "execution_progress",
                    {
                        "execution_id": execution_id,
                        "progress": current_progress,
                        "status": execution.status.value,
                        "node_executions": [
                            {
                                "node_id": ne.node_id,
                                "status": ne.status.value,
                                "duration": ne.duration_seconds
                            }
                            for ne in execution.node_executions
                        ]
                    }
                )
        
        except asyncio.CancelledError:
            logger.info(f"Monitoring cancelled for execution {execution_id}")
        except Exception as e:
            logger.error(f"Error monitoring execution {execution_id}: {e}")
            await self.add_execution_alert(
                execution_id,
                "monitoring_error",
                f"Monitoring error: {str(e)}",
                "error"
            )
    
    async def _background_monitor(self):
        """Background task for system-wide monitoring."""
        try:
            while True:
                await asyncio.sleep(30)  # Run every 30 seconds
                
                # Check for zombie executions (running too long)
                current_time = datetime.utcnow()
                
                for execution_id, execution in list(self.active_executions.items()):
                    execution_duration = (current_time - execution.started_at).total_seconds()
                    
                    # Alert for very long-running executions (over 1 hour)
                    if execution_duration > 3600:
                        await self.add_execution_alert(
                            execution_id,
                            "long_running_execution",
                            f"Execution has been running for {execution_duration/3600:.1f} hours",
                            "warning"
                        )
                
                # Broadcast system metrics to global subscribers
                if self.global_subscribers:
                    metrics = await self.get_execution_metrics()
                    await websocket_manager.broadcast_to_users(
                        list(self.global_subscribers),
                        {
                            "type": "system_metrics",
                            "metrics": metrics,
                            "timestamp": current_time.isoformat()
                        }
                    )
        
        except asyncio.CancelledError:
            logger.info("Background monitoring task cancelled")
        except Exception as e:
            logger.error(f"Background monitoring error: {e}")
    
    async def _broadcast_execution_event(
        self,
        execution_id: str,
        event_type: str,
        event_data: Dict[str, Any]
    ):
        """Broadcast an execution event to all relevant subscribers."""
        message = {
            "type": event_type,
            **event_data,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Get all subscribers for this execution
        subscribers = set()
        
        # Direct execution subscribers
        subscribers.update(self.execution_subscribers.get(execution_id, set()))
        
        # Workflow subscribers
        if execution_id in self.active_executions:
            workflow_id = self.active_executions[execution_id].workflow_id
            subscribers.update(self.workflow_subscribers.get(workflow_id, set()))
        
        # Global subscribers
        subscribers.update(self.global_subscribers)
        
        # Broadcast to all subscribers
        if subscribers:
            await websocket_manager.broadcast_to_users(
                list(subscribers),
                message
            )
    
    async def cleanup(self):
        """Cleanup monitoring resources."""
        # Cancel all monitoring tasks
        for task in self.monitoring_tasks.values():
            task.cancel()
        
        # Cancel background monitor
        if hasattr(self, 'background_monitor_task'):
            self.background_monitor_task.cancel()
        
        # Clear all data
        self.active_executions.clear()
        self.execution_subscribers.clear()
        self.workflow_subscribers.clear()
        self.global_subscribers.clear()
        self.monitoring_tasks.clear()
        self.execution_alerts.clear()


# Global monitor instance
execution_monitor = WorkflowExecutionMonitor()