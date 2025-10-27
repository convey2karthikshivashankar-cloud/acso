"""
Fault Tolerance and Recovery System

Provides enterprise-grade fault tolerance mechanisms including circuit breakers,
bulkheads, automatic recovery, and workload redistribution.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
import time
import random


class CircuitState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class RecoveryStrategy(str, Enum):
    """Recovery strategy types."""
    RESTART = "restart"
    REPLACE = "replace"
    MIGRATE = "migrate"
    SCALE_OUT = "scale_out"


@dataclass
class FailurePattern:
    """Represents a failure pattern for analysis."""
    failure_type: str
    frequency: int
    last_occurrence: datetime
    affected_instances: List[str]
    recovery_success_rate: float


@dataclass
class RecoveryAction:
    """Represents a recovery action to be executed."""
    action_id: str
    strategy: RecoveryStrategy
    target_instance: str
    parameters: Dict[str, Any]
    priority: int
    estimated_duration: int  # seconds
    dependencies: List[str]


class CircuitBreaker:
    """
    Circuit breaker implementation for fault tolerance.
    
    Prevents cascading failures by temporarily blocking requests
    to failing services and allowing them time to recover.
    """
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        success_threshold: int = 3
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.success_threshold = success_threshold
        
        self.failure_count = 0
        self.success_count = 0
        self.last_failure_time = None
        self.state = CircuitState.CLOSED
        
        self.logger = logging.getLogger(f"{__name__}.CircuitBreaker")
        
    async def call(self, func: Callable, *args, **kwargs) -> Any:
        """Execute function with circuit breaker protection."""
        if self.state == CircuitState.OPEN:
            if self._should_attempt_reset():
                self.state = CircuitState.HALF_OPEN
                self.logger.info("Circuit breaker transitioning to HALF_OPEN")
            else:
                raise CircuitBreakerOpenException("Circuit breaker is OPEN")
                
        try:
            result = await func(*args, **kwargs)
            await self._on_success()
            return result
        except Exception as e:
            await self._on_failure(e)
            raise
            
    def _should_attempt_reset(self) -> bool:
        """Check if enough time has passed to attempt reset."""
        if self.last_failure_time is None:
            return True
        return (datetime.utcnow() - self.last_failure_time).total_seconds() > self.recovery_timeout
        
    async def _on_success(self) -> None:
        """Handle successful execution."""
        if self.state == CircuitState.HALF_OPEN:
            self.success_count += 1
            if self.success_count >= self.success_threshold:
                self.state = CircuitState.CLOSED
                self.failure_count = 0
                self.success_count = 0
                self.logger.info("Circuit breaker reset to CLOSED")
        elif self.state == CircuitState.CLOSED:
            self.failure_count = 0
            
    async def _on_failure(self, exception: Exception) -> None:
        """Handle failed execution."""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.state == CircuitState.HALF_OPEN:
            self.state = CircuitState.OPEN
            self.success_count = 0
            self.logger.warning("Circuit breaker opened from HALF_OPEN")
        elif self.state == CircuitState.CLOSED and self.failure_count >= self.failure_threshold:
            self.state = CircuitState.OPEN
            self.logger.warning(f"Circuit breaker opened after {self.failure_count} failures")


class BulkheadIsolation:
    """
    Bulkhead pattern implementation for resource isolation.
    
    Isolates different types of operations to prevent failures
    in one area from affecting others.
    """
    
    def __init__(self, max_concurrent_operations: int = 10):
        self.max_concurrent_operations = max_concurrent_operations
        self.active_operations = 0
        self.semaphore = asyncio.Semaphore(max_concurrent_operations)
        self.operation_queue = asyncio.Queue()
        
        self.logger = logging.getLogger(f"{__name__}.BulkheadIsolation")
        
    async def execute_isolated(self, operation: Callable, *args, **kwargs) -> Any:
        """Execute operation with bulkhead isolation."""
        async with self.semaphore:
            self.active_operations += 1
            try:
                self.logger.debug(f"Executing isolated operation ({self.active_operations}/{self.max_concurrent_operations})")
                result = await operation(*args, **kwargs)
                return result
            finally:
                self.active_operations -= 1
                
    def get_utilization(self) -> float:
        """Get current utilization percentage."""
        return (self.active_operations / self.max_concurrent_operations) * 100


class AutoRecoveryEngine:
    """
    Automatic recovery engine for failed agent instances.
    
    Analyzes failure patterns and executes appropriate recovery strategies
    to maintain system availability and performance.
    """
    
    def __init__(self):
        self.failure_patterns: Dict[str, FailurePattern] = {}
        self.recovery_actions: Dict[str, RecoveryAction] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.bulkheads: Dict[str, BulkheadIsolation] = {}
        
        # Recovery configuration
        self.max_concurrent_recoveries = 5
        self.recovery_semaphore = asyncio.Semaphore(self.max_concurrent_recoveries)
        self.recovery_queue = asyncio.Queue()
        
        # Background tasks
        self.recovery_tasks: Dict[str, asyncio.Task] = {}
        self.monitoring_task: Optional[asyncio.Task] = None
        
        self.logger = logging.getLogger(__name__)
        
    async def initialize(self) -> None:
        """Initialize the auto-recovery engine."""
        self.logger.info("Initializing Auto-Recovery Engine")
        
        # Start background monitoring
        self.monitoring_task = asyncio.create_task(self._monitor_recovery_queue())
        
        self.logger.info("Auto-Recovery Engine initialized")
        
    async def shutdown(self) -> None:
        """Shutdown the auto-recovery engine."""
        self.logger.info("Shutting down Auto-Recovery Engine")
        
        # Cancel monitoring task
        if self.monitoring_task and not self.monitoring_task.done():
            self.monitoring_task.cancel()
            try:
                await self.monitoring_task
            except asyncio.CancelledError:
                pass
                
        # Cancel all recovery tasks
        for action_id, task in self.recovery_tasks.items():
            if not task.done():
                task.cancel()
                try:
                    await task
                except asyncio.CancelledError:
                    pass
                    
        self.logger.info("Auto-Recovery Engine shutdown complete")
        
    async def handle_instance_failure(
        self,
        instance_id: str,
        failure_type: str,
        failure_details: Dict[str, Any]
    ) -> Dict[str, Any]:
        """
        Handle failure of an agent instance.
        
        Args:
            instance_id: ID of the failed instance
            failure_type: Type of failure (e.g., 'crash', 'timeout', 'resource_exhaustion')
            failure_details: Additional details about the failure
            
        Returns:
            Recovery action result
        """
        try:
            self.logger.info(f"Handling failure for instance {instance_id}: {failure_type}")
            
            # Update failure patterns
            await self._update_failure_pattern(instance_id, failure_type)
            
            # Determine recovery strategy
            recovery_strategy = await self._determine_recovery_strategy(
                instance_id, failure_type, failure_details
            )
            
            # Create recovery action
            recovery_action = RecoveryAction(
                action_id=f"recovery-{instance_id}-{int(time.time())}",
                strategy=recovery_strategy,
                target_instance=instance_id,
                parameters=failure_details,
                priority=self._calculate_recovery_priority(failure_type, failure_details),
                estimated_duration=self._estimate_recovery_duration(recovery_strategy),
                dependencies=[]
            )
            
            # Queue recovery action
            await self.recovery_queue.put(recovery_action)
            self.recovery_actions[recovery_action.action_id] = recovery_action
            
            return {
                'success': True,
                'recovery_action_id': recovery_action.action_id,
                'strategy': recovery_strategy.value,
                'estimated_duration': recovery_action.estimated_duration
            }
            
        except Exception as e:
            self.logger.error(f"Failed to handle instance failure {instance_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'instance_id': instance_id
            }
            
    async def get_circuit_breaker(self, service_name: str) -> CircuitBreaker:
        """Get or create circuit breaker for a service."""
        if service_name not in self.circuit_breakers:
            self.circuit_breakers[service_name] = CircuitBreaker()
        return self.circuit_breakers[service_name]
        
    async def get_bulkhead(self, operation_type: str, max_concurrent: int = 10) -> BulkheadIsolation:
        """Get or create bulkhead for an operation type."""
        if operation_type not in self.bulkheads:
            self.bulkheads[operation_type] = BulkheadIsolation(max_concurrent)
        return self.bulkheads[operation_type]
        
    async def redistribute_workload(
        self,
        failed_instance_id: str,
        available_instances: List[str]
    ) -> Dict[str, Any]:
        """
        Redistribute workload from failed instance to available instances.
        
        Args:
            failed_instance_id: ID of the failed instance
            available_instances: List of available instance IDs
            
        Returns:
            Redistribution result
        """
        try:
            self.logger.info(f"Redistributing workload from {failed_instance_id}")
            
            if not available_instances:
                return {
                    'success': False,
                    'error': 'No available instances for workload redistribution'
                }
                
            # Get workload from failed instance (placeholder implementation)
            workload = await self._get_instance_workload(failed_instance_id)
            
            # Distribute workload across available instances
            redistribution_plan = await self._create_redistribution_plan(workload, available_instances)
            
            # Execute redistribution
            redistribution_results = []
            for target_instance, assigned_workload in redistribution_plan.items():
                result = await self._assign_workload_to_instance(target_instance, assigned_workload)
                redistribution_results.append({
                    'target_instance': target_instance,
                    'workload_count': len(assigned_workload),
                    'success': result.get('success', False)
                })
                
            successful_redistributions = len([r for r in redistribution_results if r['success']])
            
            return {
                'success': successful_redistributions > 0,
                'redistributed_instances': successful_redistributions,
                'total_workload_items': len(workload),
                'redistribution_results': redistribution_results
            }
            
        except Exception as e:
            self.logger.error(f"Failed to redistribute workload from {failed_instance_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'failed_instance_id': failed_instance_id
            }
            
    async def _monitor_recovery_queue(self) -> None:
        """Background task to process recovery actions."""
        while True:
            try:
                # Get next recovery action
                recovery_action = await self.recovery_queue.get()
                
                # Execute recovery action
                self.recovery_tasks[recovery_action.action_id] = asyncio.create_task(
                    self._execute_recovery_action(recovery_action)
                )
                
            except Exception as e:
                self.logger.error(f"Error in recovery queue monitoring: {e}")
                await asyncio.sleep(5)
                
    async def _execute_recovery_action(self, action: RecoveryAction) -> None:
        """Execute a recovery action."""
        async with self.recovery_semaphore:
            try:
                self.logger.info(f"Executing recovery action {action.action_id} for {action.target_instance}")
                
                start_time = time.time()
                
                if action.strategy == RecoveryStrategy.RESTART:
                    result = await self._restart_instance(action.target_instance, action.parameters)
                elif action.strategy == RecoveryStrategy.REPLACE:
                    result = await self._replace_instance(action.target_instance, action.parameters)
                elif action.strategy == RecoveryStrategy.MIGRATE:
                    result = await self._migrate_instance(action.target_instance, action.parameters)
                elif action.strategy == RecoveryStrategy.SCALE_OUT:
                    result = await self._scale_out_fleet(action.target_instance, action.parameters)
                else:
                    result = {'success': False, 'error': f'Unknown recovery strategy: {action.strategy}'}
                    
                execution_time = time.time() - start_time
                
                if result.get('success'):
                    self.logger.info(f"Recovery action {action.action_id} completed successfully in {execution_time:.2f}s")
                else:
                    self.logger.error(f"Recovery action {action.action_id} failed: {result.get('error')}")
                    
            except Exception as e:
                self.logger.error(f"Error executing recovery action {action.action_id}: {e}")
            finally:
                # Clean up
                if action.action_id in self.recovery_actions:
                    del self.recovery_actions[action.action_id]
                if action.action_id in self.recovery_tasks:
                    del self.recovery_tasks[action.action_id]
                    
    async def _update_failure_pattern(self, instance_id: str, failure_type: str) -> None:
        """Update failure pattern tracking."""
        pattern_key = f"{instance_id}:{failure_type}"
        
        if pattern_key in self.failure_patterns:
            pattern = self.failure_patterns[pattern_key]
            pattern.frequency += 1
            pattern.last_occurrence = datetime.utcnow()
            if instance_id not in pattern.affected_instances:
                pattern.affected_instances.append(instance_id)
        else:
            self.failure_patterns[pattern_key] = FailurePattern(
                failure_type=failure_type,
                frequency=1,
                last_occurrence=datetime.utcnow(),
                affected_instances=[instance_id],
                recovery_success_rate=0.0
            )
            
    async def _determine_recovery_strategy(
        self,
        instance_id: str,
        failure_type: str,
        failure_details: Dict[str, Any]
    ) -> RecoveryStrategy:
        """Determine the best recovery strategy based on failure analysis."""
        # Simple rule-based strategy selection
        # In production, this would use ML models and historical data
        
        pattern_key = f"{instance_id}:{failure_type}"
        pattern = self.failure_patterns.get(pattern_key)
        
        # High-frequency failures suggest replacement
        if pattern and pattern.frequency > 3:
            return RecoveryStrategy.REPLACE
            
        # Resource exhaustion suggests scaling out
        if failure_type in ['memory_exhaustion', 'cpu_overload']:
            return RecoveryStrategy.SCALE_OUT
            
        # Network or connectivity issues suggest migration
        if failure_type in ['network_timeout', 'connectivity_loss']:
            return RecoveryStrategy.MIGRATE
            
        # Default to restart for most failures
        return RecoveryStrategy.RESTART
        
    def _calculate_recovery_priority(self, failure_type: str, failure_details: Dict[str, Any]) -> int:
        """Calculate priority for recovery action (1-10, higher is more urgent)."""
        base_priority = {
            'crash': 8,
            'memory_exhaustion': 7,
            'cpu_overload': 6,
            'network_timeout': 5,
            'connectivity_loss': 5,
            'disk_full': 9,
            'security_breach': 10
        }.get(failure_type, 5)
        
        # Adjust based on impact
        impact_multiplier = failure_details.get('impact_score', 1.0)
        return min(10, int(base_priority * impact_multiplier))
        
    def _estimate_recovery_duration(self, strategy: RecoveryStrategy) -> int:
        """Estimate recovery duration in seconds."""
        return {
            RecoveryStrategy.RESTART: 30,
            RecoveryStrategy.REPLACE: 120,
            RecoveryStrategy.MIGRATE: 180,
            RecoveryStrategy.SCALE_OUT: 300
        }.get(strategy, 60)
        
    async def _restart_instance(self, instance_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Restart a failed instance."""
        # Placeholder implementation
        await asyncio.sleep(2)  # Simulate restart time
        return {'success': True, 'action': 'restart', 'instance_id': instance_id}
        
    async def _replace_instance(self, instance_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Replace a failed instance with a new one."""
        # Placeholder implementation
        await asyncio.sleep(5)  # Simulate replacement time
        return {'success': True, 'action': 'replace', 'instance_id': instance_id}
        
    async def _migrate_instance(self, instance_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Migrate an instance to a different node."""
        # Placeholder implementation
        await asyncio.sleep(8)  # Simulate migration time
        return {'success': True, 'action': 'migrate', 'instance_id': instance_id}
        
    async def _scale_out_fleet(self, instance_id: str, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Scale out the fleet to handle increased load."""
        # Placeholder implementation
        await asyncio.sleep(10)  # Simulate scale-out time
        return {'success': True, 'action': 'scale_out', 'instance_id': instance_id}
        
    async def _get_instance_workload(self, instance_id: str) -> List[Dict[str, Any]]:
        """Get workload from a failed instance."""
        # Placeholder implementation
        return [
            {'task_id': f'task-{i}', 'priority': random.randint(1, 10)}
            for i in range(random.randint(5, 20))
        ]
        
    async def _create_redistribution_plan(
        self,
        workload: List[Dict[str, Any]],
        available_instances: List[str]
    ) -> Dict[str, List[Dict[str, Any]]]:
        """Create a plan for redistributing workload."""
        plan = {instance_id: [] for instance_id in available_instances}
        
        # Simple round-robin distribution
        for i, task in enumerate(workload):
            target_instance = available_instances[i % len(available_instances)]
            plan[target_instance].append(task)
            
        return plan
        
    async def _assign_workload_to_instance(
        self,
        instance_id: str,
        workload: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Assign workload to a specific instance."""
        # Placeholder implementation
        await asyncio.sleep(0.1)  # Simulate assignment time
        return {'success': True, 'assigned_tasks': len(workload)}


class CircuitBreakerOpenException(Exception):
    """Exception raised when circuit breaker is open."""
    pass