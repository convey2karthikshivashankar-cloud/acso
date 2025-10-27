"""
Integration module for Agent Lifecycle Manager.
Provides a complete fault-tolerant agent lifecycle management system.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass

from .agent_lifecycle_manager import AgentLifecycleManager
from .kubernetes_cluster_manager import KubernetesClusterManager
from .intelligent_load_balancer import IntelligentLoadBalancer
from .distributed_health_monitor import DistributedHealthMonitor
from .fault_tolerance import FaultToleranceManager
from ..storage.state_persistence import StatePersistenceManager
from ..monitoring.metrics_collector import MetricsCollector
from ..alerting.alert_manager import AlertManager
from ..models.agent_runtime import AgentSpec, DeploymentResult
from ..models.lifecycle import AgentLifecycleState, LifecycleEvent


@dataclass
class LifecycleManagerConfig:
    """Configuration for the integrated lifecycle management system."""
    enable_auto_recovery: bool = True
    enable_workload_redistribution: bool = True
    enable_state_persistence: bool = True
    heartbeat_interval_seconds: int = 30
    recovery_timeout_minutes: int = 10
    max_recovery_attempts: int = 3
    state_snapshot_interval_minutes: int = 5


class IntegratedLifecycleManager:
    """
    Integrated fault-tolerant agent lifecycle management system.
    Combines all lifecycle management components into a unified system.
    """
    
    def __init__(self, config: LifecycleManagerConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize core components
        self.cluster_manager = KubernetesClusterManager()
        self.load_balancer = IntelligentLoadBalancer()
        self.health_monitor = DistributedHealthMonitor()
        self.fault_tolerance = FaultToleranceManager()
        self.state_persistence = StatePersistenceManager()
        self.metrics_collector = MetricsCollector()
        self.alert_manager = AlertManager()
        
        # Initialize lifecycle manager
        self.lifecycle_manager = AgentLifecycleManager(
            cluster_manager=self.cluster_manager,
            state_persistence=self.state_persistence,
            alert_manager=self.alert_manager
        )
        
        # Integration state
        self.running = False
        self.integration_tasks: List[asyncio.Task] = []
    
    async def initialize(self) -> bool:
        """Initialize the integrated lifecycle management system."""
        try:
            self.logger.info("Initializing integrated lifecycle management system")
            
            # Initialize all components in order
            components = [
                ("State Persistence", self.state_persistence),
                ("Metrics Collector", self.metrics_collector),
                ("Alert Manager", self.alert_manager),
                ("Cluster Manager", self.cluster_manager),
                ("Load Balancer", self.load_balancer),
                ("Health Monitor", self.health_monitor),
                ("Fault Tolerance", self.fault_tolerance),
                ("Lifecycle Manager", self.lifecycle_manager)
            ]
            
            for name, component in components:
                self.logger.info(f"Initializing {name}")
                if hasattr(component, 'initialize'):
                    success = await component.initialize()
                    if not success:
                        self.logger.error(f"Failed to initialize {name}")
                        return False
            
            # Start integration tasks
            self.running = True
            self.integration_tasks = [
                asyncio.create_task(self._health_integration_loop()),
                asyncio.create_task(self._load_balancing_integration_loop()),
                asyncio.create_task(self._fault_tolerance_integration_loop()),
                asyncio.create_task(self._metrics_integration_loop())
            ]
            
            self.logger.info("Integrated lifecycle management system initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize integrated lifecycle system: {e}")
            return False
    
    async def shutdown(self):
        """Shutdown the integrated lifecycle management system."""
        try:
            self.logger.info("Shutting down integrated lifecycle management system")
            
            self.running = False
            
            # Cancel integration tasks
            for task in self.integration_tasks:
                task.cancel()
            
            # Wait for tasks to complete
            if self.integration_tasks:
                await asyncio.gather(*self.integration_tasks, return_exceptions=True)
            
            # Shutdown components in reverse order
            components = [
                self.lifecycle_manager,
                self.fault_tolerance,
                self.health_monitor,
                self.load_balancer,
                self.cluster_manager,
                self.alert_manager,
                self.metrics_collector,
                self.state_persistence
            ]
            
            for component in components:
                if hasattr(component, 'shutdown'):
                    await component.shutdown()
            
            self.logger.info("Integrated lifecycle management system shutdown completed")
            
        except Exception as e:
            self.logger.error(f"Error during integrated lifecycle system shutdown: {e}")
    
    async def deploy_agent(self, agent_spec: AgentSpec) -> DeploymentResult:
        """Deploy an agent with full lifecycle management integration."""
        try:
            self.logger.info(f"Deploying agent with lifecycle management: {agent_spec.agent_id}")
            
            # Deploy through cluster manager
            deployment_result = await self.cluster_manager.deploy_agent(agent_spec)
            
            if not deployment_result.success:
                self.logger.error(f"Agent deployment failed: {deployment_result.error_message}")
                return deployment_result
            
            # Register with lifecycle manager
            success = await self.lifecycle_manager.register_agent(agent_spec, deployment_result)
            if not success:
                self.logger.error(f"Failed to register agent with lifecycle manager")
                # Cleanup deployment
                await self.cluster_manager.undeploy_agent(agent_spec.agent_id)
                deployment_result.success = False
                deployment_result.error_message = "Failed to register with lifecycle manager"
                return deployment_result
            
            # Register with health monitor
            await self.health_monitor.register_agent(agent_spec.agent_id, {
                "deployment_name": deployment_result.deployment_name,
                "namespace": deployment_result.namespace,
                "agent_type": agent_spec.agent_type.value,
                "tenant_id": agent_spec.tenant_id
            })
            
            # Register with load balancer
            await self.load_balancer.register_agent(agent_spec.agent_id, {
                "capacity": agent_spec.resource_requirements.cpu_cores,
                "agent_type": agent_spec.agent_type.value,
                "tenant_id": agent_spec.tenant_id
            })
            
            # Update lifecycle state to running
            await self.lifecycle_manager.update_agent_state(
                agent_spec.agent_id, 
                LifecycleEvent.RUNNING,
                {"deployment_completed_at": datetime.utcnow().isoformat()}
            )
            
            self.logger.info(f"Agent {agent_spec.agent_id} deployed successfully with lifecycle management")
            return deployment_result
            
        except Exception as e:
            self.logger.error(f"Failed to deploy agent {agent_spec.agent_id}: {e}")
            deployment_result = DeploymentResult(
                success=False,
                agent_id=agent_spec.agent_id,
                error_message=str(e)
            )
            return deployment_result
    
    async def undeploy_agent(self, agent_id: str) -> bool:
        """Undeploy an agent with full lifecycle management integration."""
        try:
            self.logger.info(f"Undeploying agent with lifecycle management: {agent_id}")
            
            # Update lifecycle state to stopping
            await self.lifecycle_manager.update_agent_state(
                agent_id, 
                LifecycleEvent.STOPPING,
                {"undeploy_initiated_at": datetime.utcnow().isoformat()}
            )
            
            # Redistribute workload if needed
            if self.config.enable_workload_redistribution:
                await self.lifecycle_manager.redistribute_workload(agent_id)
            
            # Unregister from components
            await self.health_monitor.unregister_agent(agent_id)
            await self.load_balancer.unregister_agent(agent_id)
            
            # Undeploy from cluster
            success = await self.cluster_manager.undeploy_agent(agent_id)
            
            if success:
                # Update lifecycle state to stopped
                await self.lifecycle_manager.update_agent_state(
                    agent_id, 
                    LifecycleEvent.STOPPED,
                    {"undeploy_completed_at": datetime.utcnow().isoformat()}
                )
            else:
                # Update lifecycle state to failed
                await self.lifecycle_manager.update_agent_state(
                    agent_id, 
                    LifecycleEvent.FAILED,
                    {"undeploy_failed_at": datetime.utcnow().isoformat()}
                )
            
            return success
            
        except Exception as e:
            self.logger.error(f"Failed to undeploy agent {agent_id}: {e}")
            return False
    
    async def handle_agent_failure(self, agent_id: str, failure_reason: str) -> bool:
        """Handle agent failure with integrated recovery."""
        try:
            self.logger.warning(f"Handling agent failure with integrated recovery: {agent_id}")
            
            # Handle failure through lifecycle manager
            await self.lifecycle_manager.handle_agent_failure(agent_id, failure_reason)
            
            # Trigger fault tolerance mechanisms
            if self.config.enable_auto_recovery:
                await self.fault_tolerance.handle_agent_failure(agent_id, failure_reason)
            
            # Update load balancer to remove failed agent
            await self.load_balancer.mark_agent_unhealthy(agent_id)
            
            # Redistribute workload if enabled
            if self.config.enable_workload_redistribution:
                await self.lifecycle_manager.redistribute_workload(agent_id)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to handle agent failure for {agent_id}: {e}")
            return False
    
    async def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get comprehensive agent status from all components."""
        try:
            # Get lifecycle state
            lifecycle_state = self.lifecycle_manager.agent_states.get(agent_id)
            if not lifecycle_state:
                return None
            
            # Get health status
            health_status = await self.health_monitor.get_agent_health(agent_id)
            
            # Get load balancer status
            load_status = await self.load_balancer.get_agent_status(agent_id)
            
            # Get metrics
            metrics = await self.metrics_collector.get_agent_metrics(agent_id)
            
            return {
                "agent_id": agent_id,
                "lifecycle_state": {
                    "current_state": lifecycle_state.current_state.value,
                    "previous_state": lifecycle_state.previous_state.value if lifecycle_state.previous_state else None,
                    "state_changed_at": lifecycle_state.state_changed_at.isoformat(),
                    "failure_count": lifecycle_state.failure_count,
                    "recovery_attempts": lifecycle_state.recovery_attempts
                },
                "health_status": health_status,
                "load_status": load_status,
                "metrics": metrics,
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get agent status for {agent_id}: {e}")
            return None
    
    async def get_system_status(self) -> Dict[str, Any]:
        """Get comprehensive system status."""
        try:
            # Get agent counts by state
            state_counts = {}
            for lifecycle_state in self.lifecycle_manager.agent_states.values():
                state = lifecycle_state.current_state.value
                state_counts[state] = state_counts.get(state, 0) + 1
            
            # Get cluster status
            cluster_status = await self.cluster_manager.get_cluster_status()
            
            # Get load balancer status
            load_balancer_status = await self.load_balancer.get_system_status()
            
            # Get health monitor status
            health_monitor_status = await self.health_monitor.get_system_status()
            
            return {
                "system_status": "healthy" if self.running else "stopped",
                "agent_counts": state_counts,
                "total_agents": len(self.lifecycle_manager.agent_states),
                "cluster_status": cluster_status,
                "load_balancer_status": load_balancer_status,
                "health_monitor_status": health_monitor_status,
                "config": {
                    "auto_recovery_enabled": self.config.enable_auto_recovery,
                    "workload_redistribution_enabled": self.config.enable_workload_redistribution,
                    "state_persistence_enabled": self.config.enable_state_persistence
                },
                "last_updated": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get system status: {e}")
            return {"error": str(e)}
    
    async def _health_integration_loop(self):
        """Integration loop for health monitoring."""
        while self.running:
            try:
                await asyncio.sleep(self.config.heartbeat_interval_seconds)
                
                # Get health updates from health monitor
                health_updates = await self.health_monitor.get_health_updates()
                
                for agent_id, health_data in health_updates.items():
                    if health_data.get("status") == "unhealthy":
                        await self.handle_agent_failure(
                            agent_id, 
                            health_data.get("reason", "Health check failed")
                        )
                    elif health_data.get("status") == "healthy":
                        # Update lifecycle manager with heartbeat
                        if agent_id in self.lifecycle_manager.agent_states:
                            self.lifecycle_manager.agent_states[agent_id].last_heartbeat = datetime.utcnow()
                
            except Exception as e:
                self.logger.error(f"Health integration loop error: {e}")
                await asyncio.sleep(60)
    
    async def _load_balancing_integration_loop(self):
        """Integration loop for load balancing."""
        while self.running:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                # Update load balancer with current agent states
                for agent_id, lifecycle_state in self.lifecycle_manager.agent_states.items():
                    if lifecycle_state.current_state == LifecycleEvent.RUNNING:
                        await self.load_balancer.mark_agent_healthy(agent_id)
                    else:
                        await self.load_balancer.mark_agent_unhealthy(agent_id)
                
            except Exception as e:
                self.logger.error(f"Load balancing integration loop error: {e}")
                await asyncio.sleep(120)
    
    async def _fault_tolerance_integration_loop(self):
        """Integration loop for fault tolerance."""
        while self.running:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Check for agents that need fault tolerance actions
                for agent_id, lifecycle_state in self.lifecycle_manager.agent_states.items():
                    if (lifecycle_state.current_state == LifecycleEvent.FAILED and
                        lifecycle_state.recovery_attempts < self.config.max_recovery_attempts):
                        
                        # Trigger fault tolerance recovery
                        await self.fault_tolerance.initiate_recovery(agent_id)
                
            except Exception as e:
                self.logger.error(f"Fault tolerance integration loop error: {e}")
                await asyncio.sleep(60)
    
    async def _metrics_integration_loop(self):
        """Integration loop for metrics collection."""
        while self.running:
            try:
                await asyncio.sleep(self.config.state_snapshot_interval_minutes * 60)
                
                # Create state snapshots for all running agents
                if self.config.enable_state_persistence:
                    for agent_id, lifecycle_state in self.lifecycle_manager.agent_states.items():
                        if lifecycle_state.current_state == LifecycleEvent.RUNNING:
                            # Get current metrics
                            metrics = await self.metrics_collector.get_agent_metrics(agent_id)
                            
                            # Create state snapshot
                            await self.lifecycle_manager.create_state_snapshot(
                                agent_id,
                                lifecycle_state.persistent_state,
                                lifecycle_state.current_workload
                            )
                
            except Exception as e:
                self.logger.error(f"Metrics integration loop error: {e}")
                await asyncio.sleep(300)  # Wait 5 minutes on error