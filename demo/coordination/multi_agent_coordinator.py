"""
Multi-Agent Coordination System for ACSO Phase 5 Agentic Demonstrations.

This module implements supervisor-led coordination, dynamic task allocation,
conflict resolution, and shared context management across multiple agents.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple
from enum import Enum
from dataclasses import dataclass, field
import json
import logging

logger = logging.getLogger(__name__)


class CoordinationMode(str, Enum):
    """Coordination modes for multi-agent systems."""
    CENTRALIZED = "centralized"
    DISTRIBUTED = "distributed"
    HIERARCHICAL = "hierarchical"
    CONSENSUS = "consensus"


class TaskPriority(str, Enum):
    """Task priority levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class AgentRole(str, Enum):
    """Agent roles in coordination."""
    SUPERVISOR = "supervisor"
    SPECIALIST = "specialist"
    COORDINATOR = "coordinator"
    EXECUTOR = "executor"
    MONITOR = "monitor"


class ConflictType(str, Enum):
    """Types of conflicts between agents."""
    RESOURCE_CONFLICT = "resource_conflict"
    PRIORITY_CONFLICT = "priority_conflict"
    DECISION_CONFLICT = "decision_conflict"
    CAPABILITY_CONFLICT = "capability_conflict"
    TIMING_CONFLICT = "timing_conflict"


@dataclass
class AgentCapability:
    """Represents an agent's capabilities."""
    capability_id: str
    name: str
    description: str
    proficiency_level: float  # 0.0 to 1.0
    resource_requirements: List[str]
    estimated_duration: int  # minutes
    success_rate: float
    prerequisites: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class CoordinationTask:
    """Represents a task in the coordination system."""
    task_id: str
    name: str
    description: str
    priority: TaskPriority
    required_capabilities: List[str]
    estimated_duration: int
    deadline: Optional[datetime]
    dependencies: List[str]
    assigned_agents: List[str]
    status: str
    progress: float
    created_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "name": self.name,
            "description": self.description,
            "priority": self.priority.value,
            "required_capabilities": self.required_capabilities,
            "estimated_duration": self.estimated_duration,
            "deadline": self.deadline.isoformat() if self.deadline else None,
            "dependencies": self.dependencies,
            "assigned_agents": self.assigned_agents,
            "status": self.status,
            "progress": self.progress,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata
        }


@dataclass
class AgentProfile:
    """Represents an agent in the coordination system."""
    agent_id: str
    name: str
    role: AgentRole
    capabilities: List[AgentCapability]
    current_load: float  # 0.0 to 1.0
    availability: bool
    performance_metrics: Dict[str, float]
    communication_channels: List[str]
    last_active: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "agent_id": self.agent_id,
            "name": self.name,
            "role": self.role.value,
            "capabilities": [cap.__dict__ for cap in self.capabilities],
            "current_load": self.current_load,
            "availability": self.availability,
            "performance_metrics": self.performance_metrics,
            "communication_channels": self.communication_channels,
            "last_active": self.last_active.isoformat(),
            "metadata": self.metadata
        }


@dataclass
class CoordinationConflict:
    """Represents a conflict between agents."""
    conflict_id: str
    conflict_type: ConflictType
    involved_agents: List[str]
    conflicting_tasks: List[str]
    description: str
    severity: str
    detected_at: datetime
    resolution_strategy: Optional[str] = None
    resolved: bool = False
    resolution_time: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


class MultiAgentCoordinator:
    """Coordinates multiple agents for complex task execution."""
    
    def __init__(self, coordination_mode: CoordinationMode = CoordinationMode.HIERARCHICAL):
        self.coordinator_id = str(uuid.uuid4())
        self.coordination_mode = coordination_mode
        
        # Agent management
        self.registered_agents: Dict[str, AgentProfile] = {}
        self.active_tasks: Dict[str, CoordinationTask] = {}
        self.task_queue: List[CoordinationTask] = []
        self.completed_tasks: List[CoordinationTask] = []
        
        # Conflict management
        self.active_conflicts: Dict[str, CoordinationConflict] = {}
        self.resolved_conflicts: List[CoordinationConflict] = []
        
        # Shared context
        self.shared_context: Dict[str, Any] = {}
        self.communication_log: List[Dict[str, Any]] = []
        
        # Configuration
        self.config = {
            "max_concurrent_tasks": 10,
            "task_timeout_minutes": 60,
            "conflict_resolution_timeout": 30,
            "load_balancing_enabled": True,
            "performance_tracking_enabled": True
        }
        
        # Background tasks
        self._coordination_task: Optional[asyncio.Task] = None
        self._conflict_resolution_task: Optional[asyncio.Task] = None
        
    async def start_coordination(self) -> bool:
        """Start the multi-agent coordination system."""
        try:
            self._coordination_task = asyncio.create_task(self._coordination_loop())
            self._conflict_resolution_task = asyncio.create_task(self._conflict_resolution_loop())
            
            logger.info(f"Multi-agent coordinator {self.coordinator_id} started")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start coordination: {e}")
            return False
            
    async def stop_coordination(self):
        """Stop the coordination system."""
        if self._coordination_task:
            self._coordination_task.cancel()
            try:
                await self._coordination_task
            except asyncio.CancelledError:
                pass
                
        if self._conflict_resolution_task:
            self._conflict_resolution_task.cancel()
            try:
                await self._conflict_resolution_task
            except asyncio.CancelledError:
                pass
                
        logger.info(f"Multi-agent coordinator {self.coordinator_id} stopped")
        
    async def register_agent(self, agent_profile: AgentProfile) -> bool:
        """Register an agent with the coordination system."""
        try:
            self.registered_agents[agent_profile.agent_id] = agent_profile
            
            # Update shared context
            await self._update_shared_context("agent_registered", {
                "agent_id": agent_profile.agent_id,
                "agent_name": agent_profile.name,
                "capabilities": [cap.name for cap in agent_profile.capabilities],
                "timestamp": datetime.utcnow().isoformat()
            })
            
            logger.info(f"Registered agent {agent_profile.name} ({agent_profile.agent_id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to register agent: {e}")
            return False
            
    async def submit_task(self, task: CoordinationTask) -> bool:
        """Submit a task for coordination and execution."""
        try:
            # Validate task
            if not await self._validate_task(task):
                return False
                
            # Add to task queue
            self.task_queue.append(task)
            
            # Attempt immediate assignment if possible
            await self._process_task_queue()
            
            logger.info(f"Submitted task {task.name} ({task.task_id})")
            return True
            
        except Exception as e:
            logger.error(f"Failed to submit task: {e}")
            return False
            
    async def _validate_task(self, task: CoordinationTask) -> bool:
        """Validate a task before submission."""
        # Check if required capabilities are available
        available_capabilities = set()
        for agent in self.registered_agents.values():
            if agent.availability:
                available_capabilities.update(cap.name for cap in agent.capabilities)
                
        required_capabilities = set(task.required_capabilities)
        if not required_capabilities.issubset(available_capabilities):
            logger.warning(f"Task {task.task_id} requires unavailable capabilities")
            return False
            
        # Check dependencies
        for dep_id in task.dependencies:
            if dep_id not in [t.task_id for t in self.completed_tasks]:
                if dep_id not in [t.task_id for t in self.active_tasks.values()]:
                    logger.warning(f"Task {task.task_id} has unresolved dependency: {dep_id}")
                    return False
                    
        return True
        
    async def _process_task_queue(self):
        """Process the task queue and assign tasks to agents."""
        if not self.task_queue:
            return
            
        # Sort tasks by priority and deadline
        self.task_queue.sort(key=lambda t: (
            self._get_priority_weight(t.priority),
            t.deadline or datetime.max
        ))
        
        tasks_to_assign = []
        for task in self.task_queue[:]:
            if len(self.active_tasks) >= self.config["max_concurrent_tasks"]:
                break
                
            # Check if dependencies are satisfied
            if await self._dependencies_satisfied(task):
                tasks_to_assign.append(task)
                self.task_queue.remove(task)
                
        # Assign tasks
        for task in tasks_to_assign:
            await self._assign_task(task)
            
    def _get_priority_weight(self, priority: TaskPriority) -> int:
        """Get numeric weight for priority sorting."""
        weights = {
            TaskPriority.EMERGENCY: 0,
            TaskPriority.CRITICAL: 1,
            TaskPriority.HIGH: 2,
            TaskPriority.MEDIUM: 3,
            TaskPriority.LOW: 4
        }
        return weights.get(priority, 5)
        
    async def _dependencies_satisfied(self, task: CoordinationTask) -> bool:
        """Check if task dependencies are satisfied."""
        for dep_id in task.dependencies:
            # Check if dependency is completed
            if not any(t.task_id == dep_id for t in self.completed_tasks):
                return False
        return True
        
    async def _assign_task(self, task: CoordinationTask):
        """Assign a task to appropriate agents."""
        try:
            # Find suitable agents
            suitable_agents = await self._find_suitable_agents(task)
            
            if not suitable_agents:
                # Put task back in queue
                self.task_queue.append(task)
                logger.warning(f"No suitable agents found for task {task.task_id}")
                return
                
            # Select best agents based on load balancing and capabilities
            selected_agents = await self._select_optimal_agents(task, suitable_agents)
            
            # Assign task
            task.assigned_agents = [agent.agent_id for agent in selected_agents]
            task.status = "assigned"
            self.active_tasks[task.task_id] = task
            
            # Update agent loads
            for agent in selected_agents:
                estimated_load = task.estimated_duration / 60.0  # Convert to hours
                agent.current_load = min(1.0, agent.current_load + estimated_load)
                
            # Notify agents
            await self._notify_agents_of_assignment(task, selected_agents)
            
            logger.info(f"Assigned task {task.task_id} to agents: {[a.name for a in selected_agents]}")
            
        except Exception as e:
            logger.error(f"Failed to assign task {task.task_id}: {e}")
            
    async def _find_suitable_agents(self, task: CoordinationTask) -> List[AgentProfile]:
        """Find agents suitable for a task."""
        suitable_agents = []
        
        for agent in self.registered_agents.values():
            if not agent.availability or agent.current_load >= 0.9:
                continue
                
            # Check if agent has required capabilities
            agent_capabilities = {cap.name for cap in agent.capabilities}
            required_capabilities = set(task.required_capabilities)
            
            if required_capabilities.issubset(agent_capabilities):
                suitable_agents.append(agent)
                
        return suitable_agents
        
    async def _select_optimal_agents(self, task: CoordinationTask, 
                                   candidates: List[AgentProfile]) -> List[AgentProfile]:
        """Select optimal agents from candidates."""
        if not candidates:
            return []
            
        # Score agents based on multiple factors
        agent_scores = []
        
        for agent in candidates:
            score = 0.0
            
            # Capability proficiency
            relevant_caps = [cap for cap in agent.capabilities 
                           if cap.name in task.required_capabilities]
            if relevant_caps:
                avg_proficiency = sum(cap.proficiency_level for cap in relevant_caps) / len(relevant_caps)
                score += avg_proficiency * 0.4
                
            # Load balancing (prefer less loaded agents)
            score += (1.0 - agent.current_load) * 0.3
            
            # Performance metrics
            success_rate = agent.performance_metrics.get("success_rate", 0.5)
            score += success_rate * 0.2
            
            # Availability recency
            time_since_active = (datetime.utcnow() - agent.last_active).total_seconds()
            recency_score = max(0, 1.0 - (time_since_active / 3600))  # Decay over 1 hour
            score += recency_score * 0.1
            
            agent_scores.append((agent, score))
            
        # Sort by score and select top agents
        agent_scores.sort(key=lambda x: x[1], reverse=True)
        
        # Determine how many agents to select
        num_agents_needed = min(len(candidates), self._calculate_agents_needed(task))
        
        return [agent for agent, _ in agent_scores[:num_agents_needed]]
        
    def _calculate_agents_needed(self, task: CoordinationTask) -> int:
        """Calculate how many agents are needed for a task."""
        # Simple heuristic based on task complexity and priority
        base_agents = 1
        
        if task.priority in [TaskPriority.CRITICAL, TaskPriority.EMERGENCY]:
            base_agents += 1
            
        if len(task.required_capabilities) > 3:
            base_agents += 1
            
        return min(base_agents, 3)  # Cap at 3 agents per task
        
    async def _notify_agents_of_assignment(self, task: CoordinationTask, agents: List[AgentProfile]):
        """Notify agents of task assignment."""
        notification = {
            "type": "task_assignment",
            "task_id": task.task_id,
            "task_name": task.name,
            "priority": task.priority.value,
            "deadline": task.deadline.isoformat() if task.deadline else None,
            "assigned_agents": [agent.agent_id for agent in agents],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Log communication
        self.communication_log.append(notification)
        
        # Update shared context
        await self._update_shared_context("task_assigned", notification)
        
    async def _update_shared_context(self, event_type: str, data: Dict[str, Any]):
        """Update the shared context with new information."""
        context_entry = {
            "event_type": event_type,
            "timestamp": datetime.utcnow().isoformat(),
            "data": data
        }
        
        # Add to shared context
        if event_type not in self.shared_context:
            self.shared_context[event_type] = []
            
        self.shared_context[event_type].append(context_entry)
        
        # Keep only recent entries (last 100 per event type)
        self.shared_context[event_type] = self.shared_context[event_type][-100:]
        
    async def detect_conflicts(self) -> List[CoordinationConflict]:
        """Detect conflicts between agents and tasks."""
        conflicts = []
        
        # Resource conflicts
        resource_conflicts = await self._detect_resource_conflicts()
        conflicts.extend(resource_conflicts)
        
        # Priority conflicts
        priority_conflicts = await self._detect_priority_conflicts()
        conflicts.extend(priority_conflicts)
        
        # Timing conflicts
        timing_conflicts = await self._detect_timing_conflicts()
        conflicts.extend(timing_conflicts)
        
        # Store new conflicts
        for conflict in conflicts:
            if conflict.conflict_id not in self.active_conflicts:
                self.active_conflicts[conflict.conflict_id] = conflict
                
        return conflicts
        
    async def _detect_resource_conflicts(self) -> List[CoordinationConflict]:
        """Detect resource conflicts between tasks."""
        conflicts = []
        
        # Check for agents assigned to multiple high-priority tasks
        agent_task_map = {}
        for task in self.active_tasks.values():
            for agent_id in task.assigned_agents:
                if agent_id not in agent_task_map:
                    agent_task_map[agent_id] = []
                agent_task_map[agent_id].append(task)
                
        for agent_id, tasks in agent_task_map.items():
            if len(tasks) > 1:
                high_priority_tasks = [t for t in tasks if t.priority in [TaskPriority.CRITICAL, TaskPriority.EMERGENCY]]
                
                if len(high_priority_tasks) > 1:
                    conflict = CoordinationConflict(
                        conflict_id=str(uuid.uuid4()),
                        conflict_type=ConflictType.RESOURCE_CONFLICT,
                        involved_agents=[agent_id],
                        conflicting_tasks=[t.task_id for t in high_priority_tasks],
                        description=f"Agent {agent_id} assigned to multiple high-priority tasks",
                        severity="high",
                        detected_at=datetime.utcnow()
                    )
                    conflicts.append(conflict)
                    
        return conflicts
        
    async def _detect_priority_conflicts(self) -> List[CoordinationConflict]:
        """Detect priority conflicts between tasks."""
        conflicts = []
        
        # Check for low-priority tasks blocking high-priority ones
        for task in self.active_tasks.values():
            if task.priority in [TaskPriority.CRITICAL, TaskPriority.EMERGENCY]:
                # Check if any lower priority tasks are using needed agents
                for other_task in self.active_tasks.values():
                    if (other_task.task_id != task.task_id and 
                        other_task.priority.value > task.priority.value):
                        
                        # Check for agent overlap
                        shared_agents = set(task.assigned_agents) & set(other_task.assigned_agents)
                        if shared_agents:
                            conflict = CoordinationConflict(
                                conflict_id=str(uuid.uuid4()),
                                conflict_type=ConflictType.PRIORITY_CONFLICT,
                                involved_agents=list(shared_agents),
                                conflicting_tasks=[task.task_id, other_task.task_id],
                                description=f"Priority conflict between tasks {task.task_id} and {other_task.task_id}",
                                severity="medium",
                                detected_at=datetime.utcnow()
                            )
                            conflicts.append(conflict)
                            
        return conflicts
        
    async def _detect_timing_conflicts(self) -> List[CoordinationConflict]:
        """Detect timing conflicts between tasks."""
        conflicts = []
        
        # Check for deadline conflicts
        current_time = datetime.utcnow()
        
        for task in self.active_tasks.values():
            if task.deadline and task.deadline < current_time + timedelta(minutes=30):
                # Task is approaching deadline
                estimated_completion = current_time + timedelta(minutes=task.estimated_duration)
                
                if estimated_completion > task.deadline:
                    conflict = CoordinationConflict(
                        conflict_id=str(uuid.uuid4()),
                        conflict_type=ConflictType.TIMING_CONFLICT,
                        involved_agents=task.assigned_agents,
                        conflicting_tasks=[task.task_id],
                        description=f"Task {task.task_id} unlikely to meet deadline",
                        severity="high" if task.priority in [TaskPriority.CRITICAL, TaskPriority.EMERGENCY] else "medium",
                        detected_at=datetime.utcnow()
                    )
                    conflicts.append(conflict)
                    
        return conflicts
        
    async def resolve_conflict(self, conflict: CoordinationConflict) -> bool:
        """Resolve a coordination conflict."""
        try:
            resolution_strategy = await self._determine_resolution_strategy(conflict)
            
            if resolution_strategy == "reassign_agents":
                success = await self._reassign_conflicting_agents(conflict)
            elif resolution_strategy == "reprioritize_tasks":
                success = await self._reprioritize_conflicting_tasks(conflict)
            elif resolution_strategy == "extend_deadline":
                success = await self._extend_task_deadline(conflict)
            elif resolution_strategy == "split_task":
                success = await self._split_conflicting_task(conflict)
            else:
                success = False
                
            if success:
                conflict.resolved = True
                conflict.resolution_time = datetime.utcnow()
                conflict.resolution_strategy = resolution_strategy
                
                # Move to resolved conflicts
                if conflict.conflict_id in self.active_conflicts:
                    del self.active_conflicts[conflict.conflict_id]
                self.resolved_conflicts.append(conflict)
                
                logger.info(f"Resolved conflict {conflict.conflict_id} using strategy: {resolution_strategy}")
                
            return success
            
        except Exception as e:
            logger.error(f"Failed to resolve conflict {conflict.conflict_id}: {e}")
            return False
            
    async def _determine_resolution_strategy(self, conflict: CoordinationConflict) -> str:
        """Determine the best strategy to resolve a conflict."""
        if conflict.conflict_type == ConflictType.RESOURCE_CONFLICT:
            return "reassign_agents"
        elif conflict.conflict_type == ConflictType.PRIORITY_CONFLICT:
            return "reprioritize_tasks"
        elif conflict.conflict_type == ConflictType.TIMING_CONFLICT:
            return "extend_deadline"
        else:
            return "reassign_agents"
            
    async def _reassign_conflicting_agents(self, conflict: CoordinationConflict) -> bool:
        """Reassign agents to resolve resource conflicts."""
        # Find alternative agents for lower priority tasks
        for task_id in conflict.conflicting_tasks:
            if task_id in self.active_tasks:
                task = self.active_tasks[task_id]
                
                # Find alternative agents
                suitable_agents = await self._find_suitable_agents(task)
                available_agents = [a for a in suitable_agents if a.agent_id not in conflict.involved_agents]
                
                if available_agents:
                    # Reassign to new agents
                    new_agents = await self._select_optimal_agents(task, available_agents)
                    if new_agents:
                        # Update task assignment
                        old_agents = task.assigned_agents.copy()
                        task.assigned_agents = [a.agent_id for a in new_agents]
                        
                        # Update agent loads
                        for agent_id in old_agents:
                            if agent_id in self.registered_agents:
                                self.registered_agents[agent_id].current_load = max(0, 
                                    self.registered_agents[agent_id].current_load - 0.1)
                                    
                        for agent in new_agents:
                            agent.current_load = min(1.0, agent.current_load + 0.1)
                            
                        return True
                        
        return False
        
    async def _reprioritize_conflicting_tasks(self, conflict: CoordinationConflict) -> bool:
        """Reprioritize tasks to resolve priority conflicts."""
        # This is a simplified implementation
        # In practice, this would involve more complex business logic
        return True
        
    async def _extend_task_deadline(self, conflict: CoordinationConflict) -> bool:
        """Extend task deadline to resolve timing conflicts."""
        for task_id in conflict.conflicting_tasks:
            if task_id in self.active_tasks:
                task = self.active_tasks[task_id]
                if task.deadline:
                    # Extend deadline by estimated duration
                    task.deadline = task.deadline + timedelta(minutes=task.estimated_duration)
                    return True
        return False
        
    async def _split_conflicting_task(self, conflict: CoordinationConflict) -> bool:
        """Split a task to resolve conflicts."""
        # This is a placeholder for task splitting logic
        return False
        
    async def _coordination_loop(self):
        """Main coordination loop."""
        try:
            while True:
                await asyncio.sleep(10)  # Check every 10 seconds
                
                # Process task queue
                await self._process_task_queue()
                
                # Update task progress
                await self._update_task_progress()
                
                # Detect and resolve conflicts
                conflicts = await self.detect_conflicts()
                for conflict in conflicts:
                    await self.resolve_conflict(conflict)
                    
                # Clean up completed tasks
                await self._cleanup_completed_tasks()
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Coordination loop error: {e}")
            
    async def _conflict_resolution_loop(self):
        """Background conflict resolution loop."""
        try:
            while True:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Resolve active conflicts
                for conflict in list(self.active_conflicts.values()):
                    if not conflict.resolved:
                        await self.resolve_conflict(conflict)
                        
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Conflict resolution loop error: {e}")
            
    async def _update_task_progress(self):
        """Update progress of active tasks."""
        for task in self.active_tasks.values():
            # Simulate progress updates
            if task.status == "assigned":
                task.status = "in_progress"
                task.progress = 0.1
            elif task.status == "in_progress":
                # Simulate progress
                task.progress = min(1.0, task.progress + random.uniform(0.05, 0.2))
                
                if task.progress >= 1.0:
                    task.status = "completed"
                    
    async def _cleanup_completed_tasks(self):
        """Move completed tasks to history."""
        completed_task_ids = []
        
        for task_id, task in self.active_tasks.items():
            if task.status == "completed":
                completed_task_ids.append(task_id)
                self.completed_tasks.append(task)
                
                # Update agent loads
                for agent_id in task.assigned_agents:
                    if agent_id in self.registered_agents:
                        agent = self.registered_agents[agent_id]
                        agent.current_load = max(0, agent.current_load - 0.1)
                        
        # Remove from active tasks
        for task_id in completed_task_ids:
            del self.active_tasks[task_id]
            
    async def get_coordination_summary(self) -> Dict[str, Any]:
        """Get summary of coordination system status."""
        return {
            "coordinator_id": self.coordinator_id,
            "coordination_mode": self.coordination_mode.value,
            "registered_agents": len(self.registered_agents),
            "active_tasks": len(self.active_tasks),
            "queued_tasks": len(self.task_queue),
            "completed_tasks": len(self.completed_tasks),
            "active_conflicts": len(self.active_conflicts),
            "resolved_conflicts": len(self.resolved_conflicts),
            "system_load": self._calculate_system_load(),
            "coordination_efficiency": self._calculate_coordination_efficiency()
        }
        
    def _calculate_system_load(self) -> float:
        """Calculate overall system load."""
        if not self.registered_agents:
            return 0.0
            
        total_load = sum(agent.current_load for agent in self.registered_agents.values())
        return total_load / len(self.registered_agents)
        
    def _calculate_coordination_efficiency(self) -> float:
        """Calculate coordination efficiency metric."""
        if not self.completed_tasks:
            return 0.0
            
        # Simple efficiency metric based on task completion rate
        total_tasks = len(self.completed_tasks) + len(self.active_tasks) + len(self.task_queue)
        if total_tasks == 0:
            return 1.0
            
        return len(self.completed_tasks) / total_tasks


# Global multi-agent coordinator instance
multi_agent_coordinator = MultiAgentCoordinator()