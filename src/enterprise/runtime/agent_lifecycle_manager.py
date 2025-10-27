"""
Fault-Tolerant Agent Lifecycle Manager for ACSO Enterprise.
Handles agent restart, recovery, and workload redistribution.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import pickle
import hashlib

import prometheus_client
from kubernetes import client

from ..models.agent_runtime import AgentSpec, DeploymentResult, AgentMetrics
from ..models.lifecycle import (
    AgentLifecycleState, RecoveryStrategy, WorkloadDistribution,
    StateSnapshot, RecoveryAction, LifecycleEvent, RecoveryType
)
from ..storage.state_persistence import StatePersistenceManager
from ..monitoring.metrics_collector import MetricsCollector
from ..alerting.alert_manager import AlertManager


class AgentLifecycleManager:
    """Enterprise-grade agent lifecycle management with fault tolerance."""
    
    def __init__(self, cluster_manager, state_persistence: StatePersistenceManager, 
                 alert_manager: AlertManager):
        self.cluster_manager = cluster_manager
        self.state_persistence = state_persistence
        self.alert_manager = alert_manager
        self.logger = logging.getLogger(__name__)
        self.metrics_collector = MetricsCollector()
        
        # Lifecycle tracking
        self.agent_states: Dict[str, AgentLifecycleState] = {}
        self.state_snapshots: Dict[str, List[StateSnapshot]] = {}
        self.recovery_strategies: Dict[str, RecoveryStrategy] = {}
        self.workload_distribution: Dict[str, WorkloadDistribution] = {}
        
        # Recovery configuration
        self.default_recovery_strategy = RecoveryStrategy(
            strategy_type=RecoveryType.RESTART_IN_PLACE,
            max_attempts=3,
            backoff_factor=2.0,
            initial_delay_seconds=30
        )
        
        # Monitoring
        self.running = False
        self.monitoring_tasks: List[asyncio.Task] = []
        
        # Prometheus metrics
        self.lifecycle_events_counter = prometheus_client.Counter(
            'acso_agent_lifecycle_events_total',
            'Total number of agent lifecycle events',
            ['agent_type', 'tenant_id', 'event_type']
        )
        
        self.recovery_attempts_counter = prometheus_client.Counter(
            'acso_agent_recovery_attempts_total',
            'Total number of agent recovery attempts',
            ['agent_type', 'tenant_id', 'recovery_type', 'success']
        )
        
        self.agent_uptime_gauge = prometheus_client.Gauge(
            'acso_agent_uptime_seconds',
            'Agent uptime in seconds',
            ['agent_id', 'agent_type', 'tenant_id']
        )
        
        self.state_snapshot_size_gauge = prometheus_client.Gauge(
            'acso_agent_state_snapshot_bytes',
            'Size of agent state snapshots in bytes',
            ['agent_id', 'agent_type']
        )
    
    async def initialize(self) -> bool:
        """Initialize the lifecycle manager."""
        try:
            self.logger.info("Initializing agent lifecycle manager")
            
            # Load existing agent states from persistence
            await self._load_persisted_states()
            
            # Start monitoring tasks
            self.running = True
            self.monitoring_tasks = [
                asyncio.create_task(self._lifecycle_monitor_loop()),
                asyncio.create_task(self._heartbeat_monitor_loop()),
                asyncio.create_task(self._recovery_coordinator_loop()),
                asyncio.create_task(self._state_snapshot_loop()),
                asyncio.create_task(self._workload_rebalancer_loop())
            ]
            
            self.logger.info("Agent lifecycle manager initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize lifecycle manager: {e}")
            return False
    
    async def shutdown(self):
        """Shutdown the lifecycle manager."""
        try:
            self.logger.info("Shutting down agent lifecycle manager")
            
            self.running = False
            
            # Cancel monitoring tasks
            for task in self.monitoring_tasks:
                task.cancel()
            
            # Wait for tasks to complete
            if self.monitoring_tasks:
                await asyncio.gather(*self.monitoring_tasks, return_exceptions=True)
            
            # Persist current states
            await self._persist_all_states()
            
            self.logger.info("Agent lifecycle manager shutdown completed")
            
        except Exception as e:
            self.logger.error(f"Error during lifecycle manager shutdown: {e}")
    
    async def register_agent(self, agent_spec: AgentSpec, deployment_result: DeploymentResult) -> bool:
        """Register a new agent for lifecycle management."""
        try:
            self.logger.info(f"Registering agent for lifecycle management: {agent_spec.agent_id}")
            
            # Create lifecycle state
            lifecycle_state = AgentLifecycleState(
                agent_id=agent_spec.agent_id,
                agent_type=agent_spec.agent_type.value,
                tenant_id=agent_spec.tenant_id,
                current_state=LifecycleEvent.CREATED,
                previous_state=LifecycleEvent.CREATED,
                state_changed_at=datetime.utcnow(),
                deployment_name=deployment_result.deployment_name,
                namespace=deployment_result.namespace,
                metadata={
                    "agent_spec": agent_spec.__dict__,
                    "deployment_result": deployment_result.__dict__
                }
            )
            
            # Store state
            self.agent_states[agent_spec.agent_id] = lifecycle_state
            
            # Set default recovery strategy
            self.recovery_strategies[agent_spec.agent_id] = self.default_recovery_strategy
            
            # Initialize state snapshots list
            self.state_snapshots[agent_spec.agent_id] = []
            
            # Record lifecycle event
            await self._record_lifecycle_event(agent_spec.agent_id, LifecycleEvent.CREATED)
            
            # Persist state
            await self._persist_agent_state(agent_spec.agent_id)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to register agent {agent_spec.agent_id}: {e}")
            return False
    
    async def update_agent_state(self, agent_id: str, new_state: LifecycleEvent, 
                                metadata: Optional[Dict[str, Any]] = None) -> bool:
        """Update agent lifecycle state."""
        try:
            if agent_id not in self.agent_states:
                self.logger.warning(f"Agent {agent_id} not found in lifecycle tracking")
                return False
            
            lifecycle_state = self.agent_states[agent_id]
            
            # Update state
            lifecycle_state.previous_state = lifecycle_state.current_state
            lifecycle_state.current_state = new_state
            lifecycle_state.state_changed_at = datetime.utcnow()
            
            if metadata:
                lifecycle_state.metadata.update(metadata)
            
            # Handle state-specific logic
            await self._handle_state_transition(agent_id, lifecycle_state.previous_state, new_state)
            
            # Record lifecycle event
            await self._record_lifecycle_event(agent_id, new_state)
            
            # Persist state
            await self._persist_agent_state(agent_id)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to update agent state for {agent_id}: {e}")
            return False
    
    async def handle_agent_failure(self, agent_id: str, failure_reason: str) -> bool:
        """Handle agent failure and initiate recovery."""
        try:
            self.logger.warning(f"Handling agent failure: {agent_id} - {failure_reason}")
            
            if agent_id not in self.agent_states:
                self.logger.error(f"Agent {agent_id} not found in lifecycle tracking")
                return False
            
            lifecycle_state = self.agent_states[agent_id]
            lifecycle_state.failure_count += 1
            
            # Update state to failed
            await self.update_agent_state(agent_id, LifecycleEvent.FAILED, {
                "failure_reason": failure_reason,
                "failure_time": datetime.utcnow().isoformat()
            })
            
            # Send alert
            await self.alert_manager.send_alert(
                severity="error",
                title=f"Agent Failure: {agent_id}",
                description=f"Agent {agent_id} failed: {failure_reason}",
                tags={
                    "agent_id": agent_id,
                    "agent_type": lifecycle_state.agent_type,
                    "tenant_id": lifecycle_state.tenant_id,
                    "failure_count": str(lifecycle_state.failure_count)
                }
            )
            
            # Initiate recovery
            await self._initiate_recovery(agent_id, failure_reason)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to handle agent failure for {agent_id}: {e}")
            return False
    
    async def create_state_snapshot(self, agent_id: str, 
                                   state_data: Dict[str, Any],
                                   workload_data: Dict[str, Any]) -> bool:
        """Create a state snapshot for an agent."""
        try:
            if agent_id not in self.agent_states:
                return False
            
            lifecycle_state = self.agent_states[agent_id]
            
            # Create snapshot
            snapshot = StateSnapshot(
                agent_id=agent_id,
                timestamp=datetime.utcnow(),
                state_data=state_data,
                workload_data=workload_data,
                configuration=lifecycle_state.metadata.get("agent_spec", {}),
                metrics={}  # Would be populated with current metrics
            )
            
            # Store snapshot
            if agent_id not in self.state_snapshots:
                self.state_snapshots[agent_id] = []
            
            self.state_snapshots[agent_id].append(snapshot)
            
            # Keep only last 10 snapshots
            if len(self.state_snapshots[agent_id]) > 10:
                self.state_snapshots[agent_id] = self.state_snapshots[agent_id][-10:]
            
            # Persist snapshot
            await self.state_persistence.store_state_snapshot(agent_id, snapshot)
            
            # Update metrics
            snapshot_size = len(pickle.dumps(snapshot))
            self.state_snapshot_size_gauge.labels(
                agent_id=agent_id,
                agent_type=lifecycle_state.agent_type
            ).set(snapshot_size)
            
            self.logger.debug(f"Created state snapshot for agent {agent_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to create state snapshot for {agent_id}: {e}")
            return False
    
    async def restore_agent_from_snapshot(self, agent_id: str, 
                                        snapshot_timestamp: Optional[datetime] = None) -> bool:
        """Restore agent from a state snapshot."""
        try:
            self.logger.info(f"Restoring agent {agent_id} from snapshot")
            
            if agent_id not in self.state_snapshots or not self.state_snapshots[agent_id]:
                self.logger.error(f"No snapshots available for agent {agent_id}")
                return False
            
            # Select snapshot (latest if timestamp not specified)
            snapshots = self.state_snapshots[agent_id]
            if snapshot_timestamp:
                snapshot = next((s for s in snapshots if s.timestamp == snapshot_timestamp), None)
                if not snapshot:
                    self.logger.error(f"Snapshot not found for timestamp {snapshot_timestamp}")
                    return False
            else:
                snapshot = snapshots[-1]  # Latest snapshot
            
            # Verify snapshot integrity
            if not self._verify_snapshot_integrity(snapshot):
                self.logger.error(f"Snapshot integrity check failed for agent {agent_id}")
                return False
            
            # Update agent state to recovering
            await self.update_agent_state(agent_id, LifecycleEvent.RECOVERING, {
                "restore_from_snapshot": snapshot.timestamp.isoformat(),
                "restore_initiated_at": datetime.utcnow().isoformat()
            })
            
            # Restore state and workload
            lifecycle_state = self.agent_states[agent_id]
            lifecycle_state.persistent_state = snapshot.state_data.copy()
            lifecycle_state.current_workload = snapshot.workload_data.copy()
            
            # Recreate agent deployment with restored state
            success = await self._recreate_agent_with_state(agent_id, snapshot)
            
            if success:
                await self.update_agent_state(agent_id, LifecycleEvent.RUNNING, {
                    "restored_successfully": True,
                    "restore_completed_at": datetime.utcnow().isoformat()
                })
                
                self.logger.info(f"Successfully restored agent {agent_id} from snapshot")
            else:
                await self.update_agent_state(agent_id, LifecycleEvent.FAILED, {
                    "restore_failed": True,
                    "restore_error": "Failed to recreate agent deployment"
                })
            
            return success
            
        except Exception as e:
            self.logger.error(f"Failed to restore agent {agent_id} from snapshot: {e}")
            return False
    
    async def redistribute_workload(self, failed_agent_id: str) -> bool:
        """Redistribute workload from a failed agent to healthy agents."""
        try:
            self.logger.info(f"Redistributing workload from failed agent: {failed_agent_id}")
            
            if failed_agent_id not in self.agent_states:
                return False
            
            failed_state = self.agent_states[failed_agent_id]
            workload = failed_state.current_workload
            
            if not workload:
                self.logger.info(f"No workload to redistribute for agent {failed_agent_id}")
                return True
            
            # Find healthy agents of the same type and tenant
            healthy_agents = [
                agent_id for agent_id, state in self.agent_states.items()
                if (state.agent_type == failed_state.agent_type and
                    state.tenant_id == failed_state.tenant_id and
                    state.current_state == LifecycleEvent.RUNNING and
                    agent_id != failed_agent_id)
            ]
            
            if not healthy_agents:
                self.logger.error(f"No healthy agents available for workload redistribution")
                
                # Send alert for manual intervention
                await self.alert_manager.send_alert(
                    severity="critical",
                    title=f"Workload Redistribution Failed: {failed_agent_id}",
                    description=f"No healthy agents available to redistribute workload from {failed_agent_id}",
                    tags={
                        "agent_id": failed_agent_id,
                        "agent_type": failed_state.agent_type,
                        "tenant_id": failed_state.tenant_id,
                        "action_required": "manual_intervention"
                    }
                )
                return False
            
            # Distribute workload among healthy agents
            workload_items = list(workload.items())
            items_per_agent = len(workload_items) // len(healthy_agents)
            remainder = len(workload_items) % len(healthy_agents)
            
            start_idx = 0
            for i, target_agent_id in enumerate(healthy_agents):
                # Calculate items for this agent
                items_count = items_per_agent + (1 if i < remainder else 0)
                end_idx = start_idx + items_count
                
                # Assign workload items
                agent_workload = dict(workload_items[start_idx:end_idx])
                
                if agent_workload:
                    await self._assign_workload_to_agent(target_agent_id, agent_workload)
                
                start_idx = end_idx
            
            # Clear workload from failed agent
            failed_state.current_workload = {}
            
            # Record workload redistribution
            await self._record_workload_redistribution(failed_agent_id, healthy_agents, workload)
            
            self.logger.info(f"Successfully redistributed workload from {failed_agent_id} to {len(healthy_agents)} agents")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to redistribute workload from {failed_agent_id}: {e}")
            return False
    
    async def _initiate_recovery(self, agent_id: str, failure_reason: str):
        """Initiate recovery process for a failed agent."""
        try:
            lifecycle_state = self.agent_states[agent_id]
            recovery_strategy = self.recovery_strategies.get(agent_id, self.default_recovery_strategy)
            
            # Check if we've exceeded max recovery attempts
            if lifecycle_state.recovery_attempts >= recovery_strategy.max_attempts:
                self.logger.error(f"Max recovery attempts exceeded for agent {agent_id}")
                
                await self.alert_manager.send_alert(
                    severity="critical",
                    title=f"Agent Recovery Failed: {agent_id}",
                    description=f"Agent {agent_id} exceeded maximum recovery attempts ({recovery_strategy.max_attempts})",
                    tags={
                        "agent_id": agent_id,
                        "agent_type": lifecycle_state.agent_type,
                        "tenant_id": lifecycle_state.tenant_id,
                        "recovery_attempts": str(lifecycle_state.recovery_attempts),
                        "action_required": "manual_intervention"
                    }
                )
                return
            
            # Calculate backoff delay
            delay = min(
                recovery_strategy.initial_delay_seconds * (recovery_strategy.backoff_factor ** lifecycle_state.recovery_attempts),
                recovery_strategy.max_delay_seconds
            )
            
            self.logger.info(f"Initiating recovery for agent {agent_id} in {delay} seconds (attempt {lifecycle_state.recovery_attempts + 1})")
            
            # Wait for backoff delay
            await asyncio.sleep(delay)
            
            # Update recovery attempt count
            lifecycle_state.recovery_attempts += 1
            lifecycle_state.last_recovery_attempt = datetime.utcnow()
            
            # Execute recovery strategy
            success = await self._execute_recovery_strategy(agent_id, recovery_strategy, failure_reason)
            
            # Record recovery attempt
            self.recovery_attempts_counter.labels(
                agent_type=lifecycle_state.agent_type,
                tenant_id=lifecycle_state.tenant_id,
                recovery_type=recovery_strategy.strategy_type.value,
                success=str(success)
            ).inc()
            
            if success:
                self.logger.info(f"Recovery successful for agent {agent_id}")
                lifecycle_state.recovery_attempts = 0  # Reset on success
            else:
                self.logger.warning(f"Recovery attempt failed for agent {agent_id}")
                # Will retry on next monitoring cycle if under max attempts
            
        except Exception as e:
            self.logger.error(f"Recovery initiation failed for agent {agent_id}: {e}")
    
    async def _execute_recovery_strategy(self, agent_id: str, strategy: RecoveryStrategy, 
                                       failure_reason: str) -> bool:
        """Execute the specified recovery strategy."""
        try:
            if strategy.strategy_type == RecoveryType.RESTART_IN_PLACE:
                return await self._restart_agent_in_place(agent_id)
            elif strategy.strategy_type == RecoveryType.MIGRATE_TO_NEW_NODE:
                return await self._migrate_agent_to_new_node(agent_id)
            elif strategy.strategy_type == RecoveryType.SCALE_REPLACEMENT:
                return await self._scale_replacement_agent(agent_id)
            else:
                self.logger.error(f"Unknown recovery strategy: {strategy.strategy_type}")
                return False
                
        except Exception as e:
            self.logger.error(f"Recovery strategy execution failed for {agent_id}: {e}")
            return False
    
    async def _restart_agent_in_place(self, agent_id: str) -> bool:
        """Restart agent in the same location."""
        try:
            lifecycle_state = self.agent_states[agent_id]
            
            # Delete the current pod to trigger restart
            k8s_core_v1 = client.CoreV1Api()
            
            if lifecycle_state.pod_name:
                try:
                    k8s_core_v1.delete_namespaced_pod(
                        name=lifecycle_state.pod_name,
                        namespace=lifecycle_state.namespace
                    )
                    self.logger.info(f"Deleted pod {lifecycle_state.pod_name} for restart")
                except client.ApiException as e:
                    if e.status != 404:  # Ignore if pod doesn't exist
                        raise
            
            # Wait for new pod to be created and become ready
            await asyncio.sleep(30)  # Give time for restart
            
            # Verify agent is running
            return await self._verify_agent_health(agent_id)
            
        except Exception as e:
            self.logger.error(f"Failed to restart agent {agent_id} in place: {e}")
            return False
    
    async def _migrate_agent_to_new_node(self, agent_id: str) -> bool:
        """Migrate agent to a new node."""
        try:
            # This would implement node migration logic
            # For now, return success as placeholder
            self.logger.info(f"Migrating agent {agent_id} to new node (placeholder)")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to migrate agent {agent_id}: {e}")
            return False
    
    async def _scale_replacement_agent(self, agent_id: str) -> bool:
        """Scale up a replacement agent."""
        try:
            # This would implement scaling replacement logic
            # For now, return success as placeholder
            self.logger.info(f"Scaling replacement for agent {agent_id} (placeholder)")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to scale replacement for agent {agent_id}: {e}")
            return False
    
    async def _verify_agent_health(self, agent_id: str) -> bool:
        """Verify that an agent is healthy after recovery."""
        try:
            # This would implement health verification logic
            # For now, return True as placeholder
            return True
            
        except Exception as e:
            self.logger.error(f"Health verification failed for agent {agent_id}: {e}")
            return False
    
    async def _lifecycle_monitor_loop(self):
        """Monitor agent lifecycle events."""
        while self.running:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Monitor all agents
                for agent_id, lifecycle_state in self.agent_states.items():
                    await self._monitor_agent_lifecycle(agent_id, lifecycle_state)
                    
            except Exception as e:
                self.logger.error(f"Lifecycle monitor loop error: {e}")
                await asyncio.sleep(60)
    
    async def _monitor_agent_lifecycle(self, agent_id: str, lifecycle_state: AgentLifecycleState):
        """Monitor individual agent lifecycle."""
        try:
            # Update uptime metric
            if lifecycle_state.current_state == LifecycleEvent.RUNNING:
                uptime = (datetime.utcnow() - lifecycle_state.state_changed_at).total_seconds()
                self.agent_uptime_gauge.labels(
                    agent_id=agent_id,
                    agent_type=lifecycle_state.agent_type,
                    tenant_id=lifecycle_state.tenant_id
                ).set(uptime)
            
            # Check for stuck states
            time_in_current_state = datetime.utcnow() - lifecycle_state.state_changed_at
            
            if (lifecycle_state.current_state == LifecycleEvent.STARTING and 
                time_in_current_state > timedelta(minutes=5)):
                
                self.logger.warning(f"Agent {agent_id} stuck in STARTING state for {time_in_current_state}")
                await self.handle_agent_failure(agent_id, "Stuck in starting state")
            
            elif (lifecycle_state.current_state == LifecycleEvent.STOPPING and 
                  time_in_current_state > timedelta(minutes=2)):
                
                self.logger.warning(f"Agent {agent_id} stuck in STOPPING state for {time_in_current_state}")
                # Force termination if stuck stopping
                await self._force_terminate_agent(agent_id)
        
        except Exception as e:
            self.logger.error(f"Agent lifecycle monitoring failed for {agent_id}: {e}")
    
    async def _record_lifecycle_event(self, agent_id: str, event: LifecycleEvent):
        """Record a lifecycle event."""
        try:
            lifecycle_state = self.agent_states[agent_id]
            
            # Update Prometheus metrics
            self.lifecycle_events_counter.labels(
                agent_type=lifecycle_state.agent_type,
                tenant_id=lifecycle_state.tenant_id,
                event_type=event.value
            ).inc()
            
            # Store event in persistence layer
            await self.state_persistence.store_lifecycle_event(agent_id, event, {
                "timestamp": datetime.utcnow().isoformat(),
                "previous_state": lifecycle_state.previous_state.value if lifecycle_state.previous_state else None,
                "metadata": lifecycle_state.metadata
            })
            
            self.logger.debug(f"Recorded lifecycle event {event.value} for agent {agent_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to record lifecycle event for {agent_id}: {e}")
    
    async def _heartbeat_monitor_loop(self):
        """Monitor agent heartbeats and detect failures."""
        while self.running:
            try:
                await asyncio.sleep(15)  # Check every 15 seconds
                
                current_time = datetime.utcnow()
                
                for agent_id, lifecycle_state in self.agent_states.items():
                    if lifecycle_state.current_state != LifecycleEvent.RUNNING:
                        continue
                    
                    # Check heartbeat timeout
                    if lifecycle_state.last_heartbeat:
                        time_since_heartbeat = current_time - lifecycle_state.last_heartbeat
                        if time_since_heartbeat > timedelta(minutes=2):
                            self.logger.warning(f"Agent {agent_id} heartbeat timeout: {time_since_heartbeat}")
                            await self.handle_agent_failure(agent_id, f"Heartbeat timeout: {time_since_heartbeat}")
                    
            except Exception as e:
                self.logger.error(f"Heartbeat monitor loop error: {e}")
                await asyncio.sleep(30)
    
    async def _recovery_coordinator_loop(self):
        """Coordinate recovery operations."""
        while self.running:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                current_time = datetime.utcnow()
                
                for agent_id, lifecycle_state in self.agent_states.items():
                    # Check for agents that need recovery retry
                    if (lifecycle_state.current_state == LifecycleEvent.FAILED and
                        lifecycle_state.last_recovery_attempt and
                        current_time - lifecycle_state.last_recovery_attempt > timedelta(minutes=5)):
                        
                        recovery_strategy = self.recovery_strategies.get(agent_id, self.default_recovery_strategy)
                        if lifecycle_state.recovery_attempts < recovery_strategy.max_attempts:
                            await self._initiate_recovery(agent_id, "Scheduled recovery retry")
                    
            except Exception as e:
                self.logger.error(f"Recovery coordinator loop error: {e}")
                await asyncio.sleep(120)
    
    async def _state_snapshot_loop(self):
        """Periodically create state snapshots."""
        while self.running:
            try:
                await asyncio.sleep(300)  # Create snapshots every 5 minutes
                
                for agent_id, lifecycle_state in self.agent_states.items():
                    if lifecycle_state.current_state == LifecycleEvent.RUNNING:
                        # Get current agent state and workload
                        state_data = lifecycle_state.persistent_state.copy()
                        workload_data = lifecycle_state.current_workload.copy()
                        
                        await self.create_state_snapshot(agent_id, state_data, workload_data)
                    
            except Exception as e:
                self.logger.error(f"State snapshot loop error: {e}")
                await asyncio.sleep(600)
    
    async def _workload_rebalancer_loop(self):
        """Monitor and rebalance workloads across agents."""
        while self.running:
            try:
                await asyncio.sleep(120)  # Check every 2 minutes
                
                # Group agents by type and tenant
                agent_groups = {}
                for agent_id, lifecycle_state in self.agent_states.items():
                    key = (lifecycle_state.agent_type, lifecycle_state.tenant_id)
                    if key not in agent_groups:
                        agent_groups[key] = []
                    agent_groups[key].append((agent_id, lifecycle_state))
                
                # Check workload balance within each group
                for (agent_type, tenant_id), agents in agent_groups.items():
                    await self._check_workload_balance(agent_type, tenant_id, agents)
                    
            except Exception as e:
                self.logger.error(f"Workload rebalancer loop error: {e}")
                await asyncio.sleep(300)
    
    async def _check_workload_balance(self, agent_type: str, tenant_id: str, 
                                    agents: List[Tuple[str, AgentLifecycleState]]):
        """Check and rebalance workload within an agent group."""
        try:
            running_agents = [
                (agent_id, state) for agent_id, state in agents
                if state.current_state == LifecycleEvent.RUNNING
            ]
            
            if len(running_agents) < 2:
                return  # Need at least 2 agents for rebalancing
            
            # Calculate workload distribution
            workloads = [len(state.current_workload) for _, state in running_agents]
            avg_workload = sum(workloads) / len(workloads)
            
            # Find overloaded and underloaded agents
            overloaded = []
            underloaded = []
            
            for i, (agent_id, state) in enumerate(running_agents):
                workload_count = workloads[i]
                if workload_count > avg_workload * 1.5:  # 50% above average
                    overloaded.append((agent_id, state, workload_count))
                elif workload_count < avg_workload * 0.5:  # 50% below average
                    underloaded.append((agent_id, state, workload_count))
            
            # Rebalance if needed
            if overloaded and underloaded:
                await self._rebalance_workloads(overloaded, underloaded)
                
        except Exception as e:
            self.logger.error(f"Workload balance check failed for {agent_type}/{tenant_id}: {e}")
    
    async def _rebalance_workloads(self, overloaded: List[Tuple[str, AgentLifecycleState, int]], 
                                 underloaded: List[Tuple[str, AgentLifecycleState, int]]):
        """Rebalance workloads between overloaded and underloaded agents."""
        try:
            for overloaded_agent_id, overloaded_state, overloaded_count in overloaded:
                for underloaded_agent_id, underloaded_state, underloaded_count in underloaded:
                    # Calculate how much to move
                    target_move = min(
                        (overloaded_count - underloaded_count) // 4,  # Move 1/4 of the difference
                        len(overloaded_state.current_workload) // 2   # Don't move more than half
                    )
                    
                    if target_move > 0:
                        # Move workload items
                        workload_items = list(overloaded_state.current_workload.items())
                        items_to_move = dict(workload_items[:target_move])
                        
                        # Remove from overloaded agent
                        for key in items_to_move:
                            del overloaded_state.current_workload[key]
                        
                        # Add to underloaded agent
                        underloaded_state.current_workload.update(items_to_move)
                        
                        # Notify agents of workload changes
                        await self._notify_workload_change(overloaded_agent_id, "removed", items_to_move)
                        await self._notify_workload_change(underloaded_agent_id, "added", items_to_move)
                        
                        self.logger.info(f"Rebalanced {target_move} workload items from {overloaded_agent_id} to {underloaded_agent_id}")
                        
                        break  # Move to next overloaded agent
                        
        except Exception as e:
            self.logger.error(f"Workload rebalancing failed: {e}")
    
    async def _notify_workload_change(self, agent_id: str, change_type: str, workload_items: Dict[str, Any]):
        """Notify an agent of workload changes."""
        try:
            # This would send a message to the agent about workload changes
            # Implementation depends on agent communication protocol
            self.logger.debug(f"Notified agent {agent_id} of workload {change_type}: {len(workload_items)} items")
            
        except Exception as e:
            self.logger.error(f"Failed to notify agent {agent_id} of workload change: {e}")
    
    async def _assign_workload_to_agent(self, agent_id: str, workload: Dict[str, Any]):
        """Assign workload to a specific agent."""
        try:
            if agent_id not in self.agent_states:
                return False
            
            lifecycle_state = self.agent_states[agent_id]
            lifecycle_state.current_workload.update(workload)
            
            # Notify agent of new workload
            await self._notify_workload_change(agent_id, "assigned", workload)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to assign workload to agent {agent_id}: {e}")
            return False
    
    async def _record_workload_redistribution(self, failed_agent_id: str, target_agents: List[str], 
                                            workload: Dict[str, Any]):
        """Record workload redistribution event."""
        try:
            redistribution_event = {
                "timestamp": datetime.utcnow().isoformat(),
                "failed_agent_id": failed_agent_id,
                "target_agents": target_agents,
                "workload_items_count": len(workload),
                "workload_summary": list(workload.keys())[:10]  # First 10 keys for summary
            }
            
            await self.state_persistence.store_workload_redistribution(failed_agent_id, redistribution_event)
            
            self.logger.info(f"Recorded workload redistribution from {failed_agent_id} to {len(target_agents)} agents")
            
        except Exception as e:
            self.logger.error(f"Failed to record workload redistribution: {e}")
    
    async def _handle_state_transition(self, agent_id: str, previous_state: LifecycleEvent, 
                                     new_state: LifecycleEvent):
        """Handle agent state transitions."""
        try:
            lifecycle_state = self.agent_states[agent_id]
            
            # Handle specific state transitions
            if new_state == LifecycleEvent.RUNNING:
                # Reset failure count on successful start
                lifecycle_state.failure_count = 0
                lifecycle_state.recovery_attempts = 0
                lifecycle_state.last_heartbeat = datetime.utcnow()
                
            elif new_state == LifecycleEvent.FAILED:
                # Redistribute workload if agent was running
                if previous_state == LifecycleEvent.RUNNING:
                    await self.redistribute_workload(agent_id)
                    
            elif new_state == LifecycleEvent.TERMINATED:
                # Clean up resources
                await self._cleanup_agent_resources(agent_id)
            
        except Exception as e:
            self.logger.error(f"State transition handling failed for {agent_id}: {e}")
    
    async def _cleanup_agent_resources(self, agent_id: str):
        """Clean up resources for a terminated agent."""
        try:
            # Remove from active tracking
            if agent_id in self.agent_states:
                del self.agent_states[agent_id]
            
            if agent_id in self.recovery_strategies:
                del self.recovery_strategies[agent_id]
            
            if agent_id in self.workload_distribution:
                del self.workload_distribution[agent_id]
            
            # Keep state snapshots for historical purposes
            # They will be cleaned up by a separate retention policy
            
            self.logger.info(f"Cleaned up resources for terminated agent {agent_id}")
            
        except Exception as e:
            self.logger.error(f"Resource cleanup failed for agent {agent_id}: {e}")
    
    async def _force_terminate_agent(self, agent_id: str):
        """Force terminate a stuck agent."""
        try:
            lifecycle_state = self.agent_states[agent_id]
            
            # Force delete Kubernetes resources
            k8s_core_v1 = client.CoreV1Api()
            k8s_apps_v1 = client.AppsV1Api()
            
            # Delete pod with force
            if lifecycle_state.pod_name:
                try:
                    k8s_core_v1.delete_namespaced_pod(
                        name=lifecycle_state.pod_name,
                        namespace=lifecycle_state.namespace,
                        grace_period_seconds=0
                    )
                except client.ApiException as e:
                    if e.status != 404:
                        self.logger.warning(f"Failed to force delete pod {lifecycle_state.pod_name}: {e}")
            
            # Update state
            await self.update_agent_state(agent_id, LifecycleEvent.TERMINATED, {
                "force_terminated": True,
                "termination_reason": "Force terminated due to stuck state"
            })
            
            self.logger.info(f"Force terminated agent {agent_id}")
            
        except Exception as e:
            self.logger.error(f"Force termination failed for agent {agent_id}: {e}")
    
    async def _recreate_agent_with_state(self, agent_id: str, snapshot: StateSnapshot) -> bool:
        """Recreate agent deployment with restored state."""
        try:
            lifecycle_state = self.agent_states[agent_id]
            
            # This would recreate the agent deployment with the restored state
            # Implementation depends on the specific deployment mechanism
            
            # For now, simulate successful recreation
            await asyncio.sleep(2)
            
            # Update pod and node information (would be obtained from actual deployment)
            lifecycle_state.pod_name = f"{agent_id}-restored-{int(datetime.utcnow().timestamp())}"
            lifecycle_state.node_name = "restored-node"
            lifecycle_state.last_heartbeat = datetime.utcnow()
            
            self.logger.info(f"Recreated agent {agent_id} with restored state")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to recreate agent {agent_id} with state: {e}")
            return False
    
    def _verify_snapshot_integrity(self, snapshot: StateSnapshot) -> bool:
        """Verify the integrity of a state snapshot."""
        try:
            # Recalculate checksum
            data_str = json.dumps({
                "state_data": snapshot.state_data,
                "workload_data": snapshot.workload_data,
                "configuration": snapshot.configuration
            }, sort_keys=True)
            calculated_checksum = hashlib.sha256(data_str.encode()).hexdigest()
            
            return calculated_checksum == snapshot.checksum
            
        except Exception as e:
            self.logger.error(f"Snapshot integrity verification failed: {e}")
            return False
    
    async def _load_persisted_states(self):
        """Load persisted agent states on startup."""
        try:
            # Load agent states from persistence
            persisted_states = await self.state_persistence.load_all_agent_states()
            
            for agent_id, state_data in persisted_states.items():
                try:
                    # Reconstruct AgentLifecycleState from persisted data
                    lifecycle_state = AgentLifecycleState(**state_data)
                    self.agent_states[agent_id] = lifecycle_state
                    
                    # Load recovery strategies
                    recovery_data = await self.state_persistence.load_recovery_strategy(agent_id)
                    if recovery_data:
                        self.recovery_strategies[agent_id] = RecoveryStrategy(**recovery_data)
                    
                    # Load state snapshots
                    snapshots = await self.state_persistence.load_state_snapshots(agent_id)
                    self.state_snapshots[agent_id] = snapshots
                    
                except Exception as e:
                    self.logger.error(f"Failed to load persisted state for agent {agent_id}: {e}")
            
            self.logger.info(f"Loaded {len(self.agent_states)} persisted agent states")
            
        except Exception as e:
            self.logger.error(f"Failed to load persisted states: {e}")
    
    async def _persist_agent_state(self, agent_id: str):
        """Persist agent state to storage."""
        try:
            if agent_id not in self.agent_states:
                return
            
            lifecycle_state = self.agent_states[agent_id]
            await self.state_persistence.store_agent_state(agent_id, lifecycle_state.__dict__)
            
            # Also persist recovery strategy
            if agent_id in self.recovery_strategies:
                recovery_strategy = self.recovery_strategies[agent_id]
                await self.state_persistence.store_recovery_strategy(agent_id, recovery_strategy.__dict__)
            
        except Exception as e:
            self.logger.error(f"Failed to persist agent state for {agent_id}: {e}")
    
    async def _persist_all_states(self):
        """Persist all agent states."""
        try:
            for agent_id in self.agent_states:
                await self._persist_agent_state(agent_id)
            
            self.logger.info("Persisted all agent states")
            
        except Exception as e:
            self.logger.error(f"Failed to persist all states: {e}")
    
    # Public API methods for external interaction
    
    async def get_agent_status(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of an agent."""
        if agent_id not in self.agent_states:
            return None
        
        lifecycle_state = self.agent_states[agent_id]
        return {
            "agent_id": agent_id,
            "agent_type": lifecycle_state.agent_type,
            "tenant_id": lifecycle_state.tenant_id,
            "current_state": lifecycle_state.current_state.value,
            "state_changed_at": lifecycle_state.state_changed_at.isoformat(),
            "restart_count": lifecycle_state.restart_count,
            "failure_count": lifecycle_state.failure_count,
            "recovery_attempts": lifecycle_state.recovery_attempts,
            "last_heartbeat": lifecycle_state.last_heartbeat.isoformat() if lifecycle_state.last_heartbeat else None,
            "health_status": lifecycle_state.health_status,
            "workload_count": len(lifecycle_state.current_workload),
            "node_name": lifecycle_state.node_name,
            "pod_name": lifecycle_state.pod_name
        }
    
    async def get_all_agent_statuses(self, tenant_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get status of all agents, optionally filtered by tenant."""
        statuses = []
        
        for agent_id, lifecycle_state in self.agent_states.items():
            if tenant_id and lifecycle_state.tenant_id != tenant_id:
                continue
            
            status = await self.get_agent_status(agent_id)
            if status:
                statuses.append(status)
        
        return statuses
    
    async def update_agent_heartbeat(self, agent_id: str) -> bool:
        """Update agent heartbeat timestamp."""
        if agent_id not in self.agent_states:
            return False
        
        self.agent_states[agent_id].last_heartbeat = datetime.utcnow()
        return True
    
    async def set_recovery_strategy(self, agent_id: str, strategy: RecoveryStrategy) -> bool:
        """Set custom recovery strategy for an agent."""
        if agent_id not in self.agent_states:
            return False
        
        self.recovery_strategies[agent_id] = strategy
        await self._persist_agent_state(agent_id)
        return True
    
    async def trigger_manual_recovery(self, agent_id: str, recovery_type: RecoveryType) -> bool:
        """Manually trigger recovery for an agent."""
        if agent_id not in self.agent_states:
            return False
        
        # Create temporary recovery strategy
        manual_strategy = RecoveryStrategy(
            strategy_type=recovery_type,
            max_attempts=1
        )
        
        return await self._execute_recovery_strategy(agent_id, manual_strategy, "Manual recovery triggered")
    
    async def get_recovery_history(self, agent_id: str) -> List[Dict[str, Any]]:
        """Get recovery history for an agent."""
        try:
            return await self.state_persistence.get_recovery_history(agent_id)
        except Exception as e:
            self.logger.error(f"Failed to get recovery history for {agent_id}: {e}")
            return []
                tenant_id=lifecycle_state.tenant_id,
                event_type=event.value
            ).inc()
            
            # Log event
            self.logger.info(f"Lifecycle event for agent {agent_id}: {event.value}")
            
        except Exception as e:
            self.logger.error(f"Failed to record lifecycle event for {agent_id}: {e}")
    
    # Additional helper methods would be implemented here...        

    async def _scale_up_fleet(self, fleet_id: str, additional_instances: int) -> Dict[str, Any]:
        """Scale up a fleet by adding instances."""
        fleet_config = self.agent_fleets[fleet_id]
        current_count = self._get_fleet_instance_count(fleet_id)
        
        # Create deployment specs for new instances
        new_specs = []
        for i in range(additional_instances):
            spec = AgentDeploymentSpec(
                instance_id=f"{fleet_id}-{current_count + i:04d}",
                fleet_id=fleet_id,
                agent_type=fleet_config.agent_type,
                image=fleet_config.container_image,
                resources=fleet_config.resource_requirements,
                environment=fleet_config.environment_variables,
                labels=fleet_config.labels,
                annotations=fleet_config.annotations
            )
            new_specs.append(spec)
            
        # Deploy new instances
        deployment_results = []
        for spec in new_specs:
            result = await self.cluster_manager.deploy_agent(spec)
            deployment_results.append(result)
            
            if result.get('success'):
                instance = AgentInstance(
                    instance_id=spec.instance_id,
                    agent_type=spec.agent_type,
                    deployment_spec=spec,
                    state=LifecycleState.DEPLOYING,
                    created_at=datetime.utcnow()
                )
                self.agent_instances[instance.instance_id] = instance
                
        return {
            'success': True,
            'action': 'scale_up',
            'added_instances': len([r for r in deployment_results if r.get('success')]),
            'failed_deployments': len([r for r in deployment_results if not r.get('success')]),
            'deployment_results': deployment_results
        }
        
    def _get_fleet_instance_count(self, fleet_id: str) -> int:
        """Get the current number of instances in a fleet."""
        return len([
            instance for instance in self.agent_instances.values()
            if instance.deployment_spec.fleet_id == fleet_id and instance.state != LifecycleState.TERMINATING
        ])          
  try:
                await asyncio.sleep(180)  # Check every 3 minutes
                
                # Monitor workload distribution across agents
                for tenant_id in set(state.tenant_id for state in self.agent_states.values()):
                    await self._rebalance_tenant_workload(tenant_id)
                    
            except Exception as e:
                self.logger.error(f"Workload rebalancer loop error: {e}")
                await asyncio.sleep(300)
    
    async def _rebalance_tenant_workload(self, tenant_id: str):
        """Rebalance workload for a specific tenant."""
        try:
            # Get all running agents for this tenant
            tenant_agents = [
                (agent_id, state) for agent_id, state in self.agent_states.items()
                if state.tenant_id == tenant_id and state.current_state == LifecycleEvent.RUNNING
            ]
            
            if len(tenant_agents) < 2:
                return  # No rebalancing needed with less than 2 agents
            
            # Calculate workload distribution
            total_workload = sum(len(state.current_workload) for _, state in tenant_agents)
            if total_workload == 0:
                return  # No workload to rebalance
            
            target_per_agent = total_workload // len(tenant_agents)
            
            # Identify overloaded and underloaded agents
            overloaded = [(agent_id, state) for agent_id, state in tenant_agents 
                         if len(state.current_workload) > target_per_agent + 1]
            underloaded = [(agent_id, state) for agent_id, state in tenant_agents 
                          if len(state.current_workload) < target_per_agent]
            
            # Rebalance workload
            for overloaded_agent_id, overloaded_state in overloaded:
                excess_items = len(overloaded_state.current_workload) - target_per_agent
                
                if excess_items > 0 and underloaded:
                    # Move excess workload to underloaded agents
                    workload_items = list(overloaded_state.current_workload.items())
                    items_to_move = dict(workload_items[:excess_items])
                    
                    # Find best target agent
                    target_agent_id, target_state = min(underloaded, 
                                                       key=lambda x: len(x[1].current_workload))
                    
                    # Transfer workload
                    await self._transfer_workload(overloaded_agent_id, target_agent_id, items_to_move)
                    
        except Exception as e:
            self.logger.error(f"Workload rebalancing failed for tenant {tenant_id}: {e}")
    
    async def _transfer_workload(self, source_agent_id: str, target_agent_id: str, 
                                workload_items: Dict[str, Any]):
        """Transfer workload between agents."""
        try:
            source_state = self.agent_states[source_agent_id]
            target_state = self.agent_states[target_agent_id]
            
            # Remove from source
            for key in workload_items:
                source_state.current_workload.pop(key, None)
            
            # Add to target
            target_state.current_workload.update(workload_items)
            
            # Notify agents of workload changes
            await self._notify_agent_workload_change(source_agent_id, source_state.current_workload)
            await self._notify_agent_workload_change(target_agent_id, target_state.current_workload)
            
            self.logger.info(f"Transferred {len(workload_items)} workload items from {source_agent_id} to {target_agent_id}")
            
        except Exception as e:
            self.logger.error(f"Workload transfer failed: {e}")
    
    async def _notify_agent_workload_change(self, agent_id: str, new_workload: Dict[str, Any]):
        """Notify an agent of workload changes."""
        try:
            # This would send workload update to the agent
            # Implementation depends on agent communication protocol
            self.logger.debug(f"Notifying agent {agent_id} of workload change")
            
        except Exception as e:
            self.logger.error(f"Failed to notify agent {agent_id} of workload change: {e}")
    
    async def _assign_workload_to_agent(self, agent_id: str, workload: Dict[str, Any]):
        """Assign workload to a specific agent."""
        try:
            if agent_id not in self.agent_states:
                return False
            
            lifecycle_state = self.agent_states[agent_id]
            lifecycle_state.current_workload.update(workload)
            
            # Notify agent of new workload
            await self._notify_agent_workload_change(agent_id, lifecycle_state.current_workload)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to assign workload to agent {agent_id}: {e}")
            return False
    
    async def _record_workload_redistribution(self, failed_agent_id: str, 
                                            target_agents: List[str], 
                                            redistributed_workload: Dict[str, Any]):
        """Record workload redistribution event."""
        try:
            event_data = {
                "failed_agent_id": failed_agent_id,
                "target_agents": target_agents,
                "workload_items_count": len(redistributed_workload),
                "redistribution_time": datetime.utcnow().isoformat()
            }
            
            await self.state_persistence.store_workload_redistribution_event(failed_agent_id, event_data)
            
            self.logger.info(f"Recorded workload redistribution from {failed_agent_id} to {len(target_agents)} agents")
            
        except Exception as e:
            self.logger.error(f"Failed to record workload redistribution: {e}")
    
    async def _handle_state_transition(self, agent_id: str, 
                                     previous_state: LifecycleEvent, 
                                     new_state: LifecycleEvent):
        """Handle agent state transitions."""
        try:
            # State-specific transition logic
            if new_state == LifecycleEvent.RUNNING and previous_state != LifecycleEvent.RUNNING:
                # Agent became healthy
                await self._on_agent_healthy(agent_id)
            elif new_state == LifecycleEvent.FAILED and previous_state == LifecycleEvent.RUNNING:
                # Agent became unhealthy
                await self._on_agent_unhealthy(agent_id)
            elif new_state == LifecycleEvent.STOPPED:
                # Agent stopped
                await self._on_agent_stopped(agent_id)
                
        except Exception as e:
            self.logger.error(f"State transition handling failed for {agent_id}: {e}")
    
    async def _on_agent_healthy(self, agent_id: str):
        """Handle agent becoming healthy."""
        try:
            lifecycle_state = self.agent_states[agent_id]
            
            # Reset failure count on successful recovery
            lifecycle_state.failure_count = 0
            lifecycle_state.recovery_attempts = 0
            
            # Send recovery success alert
            await self.alert_manager.send_alert(
                severity="info",
                title=f"Agent Recovery Successful: {agent_id}",
                description=f"Agent {agent_id} has successfully recovered and is now healthy",
                tags={
                    "agent_id": agent_id,
                    "agent_type": lifecycle_state.agent_type,
                    "tenant_id": lifecycle_state.tenant_id,
                    "recovery_successful": "true"
                }
            )
            
        except Exception as e:
            self.logger.error(f"Failed to handle agent healthy event for {agent_id}: {e}")
    
    async def _on_agent_unhealthy(self, agent_id: str):
        """Handle agent becoming unhealthy."""
        try:
            # This is handled by handle_agent_failure method
            pass
            
        except Exception as e:
            self.logger.error(f"Failed to handle agent unhealthy event for {agent_id}: {e}")
    
    async def _on_agent_stopped(self, agent_id: str):
        """Handle agent being stopped."""
        try:
            # Clean up agent resources
            if agent_id in self.state_snapshots:
                del self.state_snapshots[agent_id]
            
            if agent_id in self.recovery_strategies:
                del self.recovery_strategies[agent_id]
            
            if agent_id in self.workload_distribution:
                del self.workload_distribution[agent_id]
            
            # Remove from agent_states (keep for audit trail)
            # del self.agent_states[agent_id]
            
        except Exception as e:
            self.logger.error(f"Failed to handle agent stopped event for {agent_id}: {e}")
    
    async def _recreate_agent_with_state(self, agent_id: str, snapshot: StateSnapshot) -> bool:
        """Recreate agent deployment with restored state."""
        try:
            # This would recreate the agent deployment with the restored state
            # Implementation depends on the specific agent deployment mechanism
            self.logger.info(f"Recreating agent {agent_id} with restored state")
            
            # For now, return True as placeholder
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to recreate agent {agent_id} with state: {e}")
            return False
    
    def _verify_snapshot_integrity(self, snapshot: StateSnapshot) -> bool:
        """Verify the integrity of a state snapshot."""
        try:
            # Basic integrity checks
            if not snapshot.agent_id or not snapshot.timestamp:
                return False
            
            if not isinstance(snapshot.state_data, dict):
                return False
            
            if not isinstance(snapshot.workload_data, dict):
                return False
            
            # Additional integrity checks could be added here
            return True
            
        except Exception as e:
            self.logger.error(f"Snapshot integrity verification failed: {e}")
            return False
    
    async def _force_terminate_agent(self, agent_id: str):
        """Force terminate an agent that's stuck."""
        try:
            self.logger.warning(f"Force terminating stuck agent: {agent_id}")
            
            lifecycle_state = self.agent_states[agent_id]
            
            # Force delete the pod
            if lifecycle_state.pod_name and lifecycle_state.namespace:
                k8s_core_v1 = client.CoreV1Api()
                try:
                    k8s_core_v1.delete_namespaced_pod(
                        name=lifecycle_state.pod_name,
                        namespace=lifecycle_state.namespace,
                        grace_period_seconds=0  # Force immediate termination
                    )
                except client.ApiException as e:
                    if e.status != 404:  # Ignore if pod doesn't exist
                        self.logger.error(f"Failed to force delete pod: {e}")
            
            # Update state to failed
            await self.update_agent_state(agent_id, LifecycleEvent.FAILED, {
                "force_terminated": True,
                "force_termination_time": datetime.utcnow().isoformat()
            })
            
        except Exception as e:
            self.logger.error(f"Force termination failed for agent {agent_id}: {e}")
    
    async def _load_persisted_states(self):
        """Load persisted agent states on startup."""
        try:
            self.logger.info("Loading persisted agent states")
            
            # Load states from persistence layer
            persisted_states = await self.state_persistence.load_all_agent_states()
            
            for agent_id, state_data in persisted_states.items():
                try:
                    # Reconstruct lifecycle state
                    lifecycle_state = AgentLifecycleState(**state_data)
                    self.agent_states[agent_id] = lifecycle_state
                    
                    # Load state snapshots
                    snapshots = await self.state_persistence.load_state_snapshots(agent_id)
                    self.state_snapshots[agent_id] = snapshots
                    
                except Exception as e:
                    self.logger.error(f"Failed to load state for agent {agent_id}: {e}")
            
            self.logger.info(f"Loaded {len(self.agent_states)} persisted agent states")
            
        except Exception as e:
            self.logger.error(f"Failed to load persisted states: {e}")
    
    async def _persist_agent_state(self, agent_id: str):
        """Persist agent state to storage."""
        try:
            if agent_id not in self.agent_states:
                return
            
            lifecycle_state = self.agent_states[agent_id]
            await self.state_persistence.store_agent_state(agent_id, lifecycle_state.__dict__)
            
        except Exception as e:
            self.logger.error(f"Failed to persist state for agent {agent_id}: {e}")
    
    async def _persist_all_states(self):
        """Persist all agent states."""
        try:
            for agent_id in self.agent_states:
                await self._persist_agent_state(agent_id)
                
        except Exception as e:
            self.logger.error(f"Failed to persist all states: {e}")