"""
Agent coordination and discovery system for ACSO.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass
from enum import Enum

from .models import AgentType, AgentState, Task, TaskStatus, AgentMessage
from .communication import AgentCommunicationManager
from config.settings import settings


class CoordinationEventType(str, Enum):
    """Types of coordination events."""
    AGENT_REGISTERED = "agent_registered"
    AGENT_UNREGISTERED = "agent_unregistered"
    AGENT_STATUS_CHANGED = "agent_status_changed"
    TASK_DELEGATED = "task_delegated"
    TASK_COMPLETED = "task_completed"
    SYSTEM_ALERT = "system_alert"


@dataclass
class CoordinationEvent:
    """Event in the coordination system."""
    event_id: str
    event_type: CoordinationEventType
    source_agent_id: str
    target_agent_id: Optional[str]
    payload: Dict[str, Any]
    timestamp: datetime


class AgentRegistry:
    """Registry for tracking active agents in the system."""
    
    def __init__(self):
        self.agents: Dict[str, AgentState] = {}
        self.agent_capabilities: Dict[str, List[str]] = {}
        self.agent_last_heartbeat: Dict[str, datetime] = {}
        self.heartbeat_timeout = timedelta(seconds=30)
        
    async def register_agent(self, agent_state: AgentState) -> bool:
        """Register a new agent in the system."""
        try:
            self.agents[agent_state.agent_id] = agent_state
            self.agent_capabilities[agent_state.agent_id] = agent_state.capabilities
            self.agent_last_heartbeat[agent_state.agent_id] = datetime.utcnow()
            
            print(f"Agent {agent_state.agent_id} registered with capabilities: {agent_state.capabilities}")
            return True
            
        except Exception as e:
            print(f"Failed to register agent {agent_state.agent_id}: {e}")
            return False
            
    async def unregister_agent(self, agent_id: str) -> bool:
        """Unregister an agent from the system."""
        try:
            if agent_id in self.agents:
                del self.agents[agent_id]
                del self.agent_capabilities[agent_id]
                del self.agent_last_heartbeat[agent_id]
                
            print(f"Agent {agent_id} unregistered")
            return True
            
        except Exception as e:
            print(f"Failed to unregister agent {agent_id}: {e}")
            return False
            
    async def update_agent_state(self, agent_state: AgentState) -> bool:
        """Update an agent's state in the registry."""
        try:
            if agent_state.agent_id in self.agents:
                self.agents[agent_state.agent_id] = agent_state
                self.agent_last_heartbeat[agent_state.agent_id] = datetime.utcnow()
                return True
            return False
            
        except Exception as e:
            print(f"Failed to update agent state: {e}")
            return False
            
    async def get_agent_state(self, agent_id: str) -> Optional[AgentState]:
        """Get the current state of an agent."""
        return self.agents.get(agent_id)
        
    async def get_agents_by_type(self, agent_type: AgentType) -> List[AgentState]:
        """Get all agents of a specific type."""
        return [
            agent for agent in self.agents.values()
            if agent.agent_type == agent_type
        ]
        
    async def get_agents_by_capability(self, capability: str) -> List[AgentState]:
        """Get all agents with a specific capability."""
        matching_agents = []
        for agent_id, capabilities in self.agent_capabilities.items():
            if capability in capabilities:
                agent_state = self.agents.get(agent_id)
                if agent_state:
                    matching_agents.append(agent_state)
        return matching_agents
        
    async def get_available_agents(self) -> List[AgentState]:
        """Get all agents that are currently available for tasks."""
        available = []
        for agent in self.agents.values():
            if agent.status.value in ["active", "idle"] and agent.current_task is None:
                available.append(agent)
        return available
        
    async def heartbeat(self, agent_id: str) -> bool:
        """Update agent heartbeat timestamp."""
        if agent_id in self.agents:
            self.agent_last_heartbeat[agent_id] = datetime.utcnow()
            return True
        return False
        
    async def check_agent_health(self) -> List[str]:
        """Check for agents that haven't sent heartbeats recently."""
        now = datetime.utcnow()
        unhealthy_agents = []
        
        for agent_id, last_heartbeat in self.agent_last_heartbeat.items():
            if now - last_heartbeat > self.heartbeat_timeout:
                unhealthy_agents.append(agent_id)
                
        return unhealthy_agents
        
    async def get_system_status(self) -> Dict[str, Any]:
        """Get overall system status."""
        total_agents = len(self.agents)
        active_agents = len([a for a in self.agents.values() if a.status.value == "active"])
        busy_agents = len([a for a in self.agents.values() if a.current_task is not None])
        
        return {
            "total_agents": total_agents,
            "active_agents": active_agents,
            "busy_agents": busy_agents,
            "available_agents": total_agents - busy_agents,
            "agent_types": {
                agent_type.value: len(await self.get_agents_by_type(agent_type))
                for agent_type in AgentType
            }
        }


class TaskCoordinationEngine:
    """Engine for coordinating task distribution and execution."""
    
    def __init__(self, agent_registry: AgentRegistry):
        self.agent_registry = agent_registry
        self.pending_tasks: Dict[str, Task] = {}
        self.active_tasks: Dict[str, Task] = {}
        self.completed_tasks: Dict[str, Task] = {}
        self.task_assignments: Dict[str, str] = {}  # task_id -> agent_id
        
    async def assign_task(self, task: Task, preferred_agent_id: Optional[str] = None) -> Optional[str]:
        """Assign a task to an appropriate agent."""
        try:
            # If preferred agent is specified and available, use it
            if preferred_agent_id:
                agent_state = await self.agent_registry.get_agent_state(preferred_agent_id)
                if agent_state and agent_state.current_task is None:
                    return await self._assign_task_to_agent(task, preferred_agent_id)
                    
            # Find best agent for the task
            best_agent = await self._find_best_agent_for_task(task)
            if best_agent:
                return await self._assign_task_to_agent(task, best_agent.agent_id)
                
            # No available agent found
            self.pending_tasks[task.task_id] = task
            print(f"Task {task.task_id} queued - no available agents")
            return None
            
        except Exception as e:
            print(f"Task assignment failed: {e}")
            return None
            
    async def _find_best_agent_for_task(self, task: Task) -> Optional[AgentState]:
        """Find the best agent to handle a specific task."""
        # Get agents by task type
        task_type_mapping = {
            "threat-analysis": AgentType.THREAT_HUNTER,
            "incident-response": AgentType.INCIDENT_RESPONSE,
            "service-delivery": AgentType.SERVICE_ORCHESTRATION,
            "financial-analysis": AgentType.FINANCIAL_INTELLIGENCE
        }
        
        required_agent_type = task_type_mapping.get(task.type.value)
        if not required_agent_type:
            return None
            
        # Get available agents of the required type
        available_agents = await self.agent_registry.get_available_agents()
        suitable_agents = [
            agent for agent in available_agents
            if agent.agent_type == required_agent_type
        ]
        
        if not suitable_agents:
            return None
            
        # For now, return the first available agent
        # In a more sophisticated implementation, this could consider:
        # - Agent workload
        # - Agent performance history
        # - Task priority
        # - Agent specialization
        return suitable_agents[0]
        
    async def _assign_task_to_agent(self, task: Task, agent_id: str) -> str:
        """Assign a specific task to a specific agent."""
        # Update task status
        task.status = TaskStatus.IN_PROGRESS
        task.assigned_agent = agent_id
        
        # Track assignment
        self.task_assignments[task.task_id] = agent_id
        self.active_tasks[task.task_id] = task
        
        # Remove from pending if it was there
        if task.task_id in self.pending_tasks:
            del self.pending_tasks[task.task_id]
            
        print(f"Task {task.task_id} assigned to agent {agent_id}")
        return agent_id
        
    async def complete_task(self, task_id: str, result: Dict[str, Any], success: bool) -> bool:
        """Mark a task as completed."""
        try:
            if task_id in self.active_tasks:
                task = self.active_tasks[task_id]
                task.status = TaskStatus.COMPLETED if success else TaskStatus.FAILED
                task.completed_at = datetime.utcnow()
                task.results = result
                
                # Move to completed tasks
                self.completed_tasks[task_id] = task
                del self.active_tasks[task_id]
                
                # Remove assignment
                if task_id in self.task_assignments:
                    del self.task_assignments[task_id]
                    
                print(f"Task {task_id} completed with success: {success}")
                return True
                
            return False
            
        except Exception as e:
            print(f"Task completion failed: {e}")
            return False
            
    async def get_task_status(self, task_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a specific task."""
        # Check active tasks
        if task_id in self.active_tasks:
            task = self.active_tasks[task_id]
            assigned_agent = self.task_assignments.get(task_id)
            return {
                "task_id": task_id,
                "status": task.status.value,
                "assigned_agent": assigned_agent,
                "created_at": task.created_at.isoformat(),
                "priority": task.priority.value
            }
            
        # Check completed tasks
        if task_id in self.completed_tasks:
            task = self.completed_tasks[task_id]
            return {
                "task_id": task_id,
                "status": task.status.value,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "results": task.results
            }
            
        # Check pending tasks
        if task_id in self.pending_tasks:
            task = self.pending_tasks[task_id]
            return {
                "task_id": task_id,
                "status": "pending",
                "created_at": task.created_at.isoformat(),
                "priority": task.priority.value
            }
            
        return None
        
    async def get_agent_workload(self, agent_id: str) -> Dict[str, Any]:
        """Get the current workload for an agent."""
        active_tasks = [
            task for task_id, task in self.active_tasks.items()
            if self.task_assignments.get(task_id) == agent_id
        ]
        
        return {
            "agent_id": agent_id,
            "active_tasks": len(active_tasks),
            "task_details": [
                {
                    "task_id": task.task_id,
                    "type": task.type.value,
                    "priority": task.priority.value,
                    "created_at": task.created_at.isoformat()
                }
                for task in active_tasks
            ]
        }
        
    async def rebalance_tasks(self) -> Dict[str, Any]:
        """Rebalance tasks across available agents."""
        # This is a placeholder for task rebalancing logic
        # In a full implementation, this would:
        # 1. Analyze current agent workloads
        # 2. Identify overloaded agents
        # 3. Reassign tasks to underutilized agents
        # 4. Handle task migration safely
        
        return {
            "rebalanced": False,
            "reason": "Task rebalancing not implemented in prototype"
        }


class CoordinationEventBus:
    """Event bus for coordination events."""
    
    def __init__(self):
        self.subscribers: Dict[CoordinationEventType, List[callable]] = {}
        self.event_history: List[CoordinationEvent] = []
        self.max_history_size = 1000
        
    def subscribe(self, event_type: CoordinationEventType, callback: callable) -> None:
        """Subscribe to coordination events."""
        if event_type not in self.subscribers:
            self.subscribers[event_type] = []
        self.subscribers[event_type].append(callback)
        
    async def publish_event(self, event: CoordinationEvent) -> None:
        """Publish a coordination event."""
        # Add to history
        self.event_history.append(event)
        if len(self.event_history) > self.max_history_size:
            self.event_history.pop(0)
            
        # Notify subscribers
        subscribers = self.subscribers.get(event.event_type, [])
        for callback in subscribers:
            try:
                await callback(event)
            except Exception as e:
                print(f"Event subscriber error: {e}")
                
    async def get_recent_events(self, limit: int = 50) -> List[CoordinationEvent]:
        """Get recent coordination events."""
        return self.event_history[-limit:]


class SystemCoordinator:
    """Main coordinator for the ACSO system."""
    
    def __init__(self):
        self.agent_registry = AgentRegistry()
        self.task_engine = TaskCoordinationEngine(self.agent_registry)
        self.event_bus = CoordinationEventBus()
        self.running = False
        
    async def initialize(self) -> None:
        """Initialize the coordination system."""
        self.running = True
        
        # Start health monitoring
        asyncio.create_task(self._monitor_agent_health())
        
        # Subscribe to events
        self.event_bus.subscribe(
            CoordinationEventType.AGENT_REGISTERED,
            self._handle_agent_registered
        )
        
        print("System coordinator initialized")
        
    async def shutdown(self) -> None:
        """Shutdown the coordination system."""
        self.running = False
        print("System coordinator shutdown")
        
    async def register_agent(self, agent_state: AgentState) -> bool:
        """Register an agent with the coordinator."""
        success = await self.agent_registry.register_agent(agent_state)
        
        if success:
            event = CoordinationEvent(
                event_id=str(uuid.uuid4()),
                event_type=CoordinationEventType.AGENT_REGISTERED,
                source_agent_id=agent_state.agent_id,
                target_agent_id=None,
                payload={"agent_type": agent_state.agent_type.value},
                timestamp=datetime.utcnow()
            )
            await self.event_bus.publish_event(event)
            
        return success
        
    async def delegate_task(self, task: Task, preferred_agent_id: Optional[str] = None) -> Optional[str]:
        """Delegate a task to an appropriate agent."""
        assigned_agent = await self.task_engine.assign_task(task, preferred_agent_id)
        
        if assigned_agent:
            event = CoordinationEvent(
                event_id=str(uuid.uuid4()),
                event_type=CoordinationEventType.TASK_DELEGATED,
                source_agent_id="system",
                target_agent_id=assigned_agent,
                payload={"task_id": task.task_id, "task_type": task.type.value},
                timestamp=datetime.utcnow()
            )
            await self.event_bus.publish_event(event)
            
        return assigned_agent
        
    async def _monitor_agent_health(self) -> None:
        """Monitor agent health and handle failures."""
        while self.running:
            try:
                unhealthy_agents = await self.agent_registry.check_agent_health()
                
                for agent_id in unhealthy_agents:
                    print(f"Agent {agent_id} appears unhealthy - no recent heartbeat")
                    
                    # In a full implementation, this would:
                    # 1. Try to reconnect to the agent
                    # 2. Reassign its tasks to other agents
                    # 3. Mark it as failed if unrecoverable
                    
                await asyncio.sleep(10)  # Check every 10 seconds
                
            except Exception as e:
                print(f"Health monitoring error: {e}")
                await asyncio.sleep(10)
                
    async def _handle_agent_registered(self, event: CoordinationEvent) -> None:
        """Handle agent registration events."""
        print(f"Agent registration event: {event.source_agent_id}")
        
        # Check if there are pending tasks that this agent can handle
        # This is a simplified implementation
        pass


# Global coordinator instance
system_coordinator = SystemCoordinator()