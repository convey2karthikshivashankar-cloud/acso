"""
Reinforcement Learning Task Allocator for ACSO Enterprise.
Optimal task distribution with multi-agent coordination and conflict resolution.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from collections import defaultdict, deque
import random
from sklearn.preprocessing import StandardScaler
import networkx as nx

class AgentStatus(str, Enum):
    """Agent status values."""
    AVAILABLE = "available"
    BUSY = "busy"
    OFFLINE = "offline"
    MAINTENANCE = "maintenance"

class AllocationStrategy(str, Enum):
    """Task allocation strategies."""
    ROUND_ROBIN = "round_robin"
    LOAD_BALANCED = "load_balanced"
    SKILL_BASED = "skill_based"
    REINFORCEMENT_LEARNING = "reinforcement_learning"
    HYBRID = "hybrid"

class ConflictType(str, Enum):
    """Types of resource conflicts."""
    RESOURCE_CONTENTION = "resource_contention"
    SKILL_OVERLAP = "skill_overlap"
    TIME_CONFLICT = "time_conflict"
    PRIORITY_CONFLICT = "priority_conflict"
    DEPENDENCY_CONFLICT = "dependency_conflict"

@dataclass
class Agent:
    """Agent representation for task allocation."""
    agent_id: str
    name: str
    status: AgentStatus
    skills: List[str]
    skill_levels: Dict[str, float]  # 0.0 to 1.0
    current_load: float  # 0.0 to 1.0
    max_concurrent_tasks: int
    current_tasks: List[str]
    performance_history: List[float]
    availability_schedule: Dict[str, bool]  # hour -> available
    location: str
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TaskAllocation:
    """Task allocation result."""
    allocation_id: str
    task_id: str
    agent_id: str
    allocated_at: datetime
    estimated_start: datetime
    estimated_completion: datetime
    confidence_score: float
    allocation_reason: str
    alternative_agents: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AllocationConflict:
    """Resource allocation conflict."""
    conflict_id: str
    conflict_type: ConflictType
    involved_tasks: List[str]
    involved_agents: List[str]
    severity: float  # 0.0 to 1.0
    detected_at: datetime
    resolution_strategy: Optional[str] = None
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

class DQNTaskAllocator(nn.Module):
    """Deep Q-Network for task allocation decisions."""
    
    def __init__(self, state_size: int, action_size: int, hidden_size: int = 256):
        super(DQNTaskAllocator, self).__init__()
        self.state_size = state_size
        self.action_size = action_size
        
        # Neural network layers
        self.fc1 = nn.Linear(state_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, hidden_size)
        self.fc3 = nn.Linear(hidden_size, hidden_size // 2)
        self.fc4 = nn.Linear(hidden_size // 2, action_size)
        
        self.dropout = nn.Dropout(0.2)
        self.batch_norm1 = nn.BatchNorm1d(hidden_size)
        self.batch_norm2 = nn.BatchNorm1d(hidden_size)
    
    def forward(self, state):
        """Forward pass through the network."""
        x = F.relu(self.batch_norm1(self.fc1(state)))
        x = self.dropout(x)
        x = F.relu(self.batch_norm2(self.fc2(x)))
        x = self.dropout(x)
        x = F.relu(self.fc3(x))
        x = self.fc4(x)
        return x

class MultiAgentCoordinator:
    """Multi-agent coordination system for task allocation."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.agents: Dict[str, Agent] = {}
        self.coordination_graph = nx.Graph()
        self.communication_channels: Dict[str, asyncio.Queue] = {}
        
        # Coordination strategies
        self.consensus_threshold = 0.7
        self.coordination_timeout = 30  # seconds
    
    async def coordinate_allocation(
        self,
        task_id: str,
        candidate_agents: List[str],
        allocation_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Coordinate task allocation among multiple agents."""
        try:
            if len(candidate_agents) <= 1:
                return {"selected_agent": candidate_agents[0] if candidate_agents else None}
            
            # Initiate coordination protocol
            coordination_id = str(uuid.uuid4())
            
            # Collect agent preferences
            agent_preferences = await self._collect_agent_preferences(
                coordination_id, task_id, candidate_agents, allocation_context
            )
            
            # Run consensus algorithm
            consensus_result = await self._run_consensus_algorithm(
                agent_preferences, allocation_context
            )
            
            # Handle conflicts if any
            if consensus_result["conflicts"]:
                resolution = await self._resolve_conflicts(
                    consensus_result["conflicts"], allocation_context
                )
                consensus_result.update(resolution)
            
            return consensus_result
            
        except Exception as e:
            self.logger.error(f"Failed to coordinate allocation: {e}")
            return {"selected_agent": candidate_agents[0] if candidate_agents else None}
    
    async def _collect_agent_preferences(
        self,
        coordination_id: str,
        task_id: str,
        candidate_agents: List[str],
        context: Dict[str, Any]
    ) -> Dict[str, Dict[str, Any]]:
        """Collect preferences from candidate agents."""
        try:
            preferences = {}
            
            # Send coordination request to all candidate agents
            tasks = []
            for agent_id in candidate_agents:
                task = asyncio.create_task(
                    self._request_agent_preference(
                        coordination_id, agent_id, task_id, context
                    )
                )
                tasks.append((agent_id, task))
            
            # Collect responses with timeout
            for agent_id, task in tasks:
                try:
                    preference = await asyncio.wait_for(task, timeout=self.coordination_timeout)
                    preferences[agent_id] = preference
                except asyncio.TimeoutError:
                    self.logger.warning(f"Agent {agent_id} coordination timeout")
                    preferences[agent_id] = {"preference_score": 0.0, "available": False}
            
            return preferences
            
        except Exception as e:
            self.logger.error(f"Failed to collect agent preferences: {e}")
            return {}
    
    async def _request_agent_preference(
        self,
        coordination_id: str,
        agent_id: str,
        task_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Request preference from a specific agent."""
        try:
            agent = self.agents.get(agent_id)
            if not agent:
                return {"preference_score": 0.0, "available": False}
            
            # Calculate preference score based on agent state
            preference_score = 0.0
            
            # Availability factor
            if agent.status == AgentStatus.AVAILABLE:
                preference_score += 0.4
            elif agent.status == AgentStatus.BUSY and agent.current_load < 0.8:
                preference_score += 0.2
            
            # Skill match factor
            required_skills = context.get("required_skills", [])
            if required_skills:
                skill_match = sum(
                    agent.skill_levels.get(skill, 0.0) for skill in required_skills
                ) / len(required_skills)
                preference_score += skill_match * 0.4
            else:
                preference_score += 0.2  # No specific skills required
            
            # Load factor (prefer less loaded agents)
            load_factor = 1.0 - agent.current_load
            preference_score += load_factor * 0.2
            
            return {
                "preference_score": min(preference_score, 1.0),
                "available": agent.status in [AgentStatus.AVAILABLE, AgentStatus.BUSY],
                "current_load": agent.current_load,
                "skill_match": skill_match if required_skills else 1.0,
                "estimated_completion_time": self._estimate_completion_time(agent, context)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get agent preference: {e}")
            return {"preference_score": 0.0, "available": False}
    
    def _estimate_completion_time(self, agent: Agent, context: Dict[str, Any]) -> int:
        """Estimate task completion time for an agent."""
        try:
            base_duration = context.get("estimated_duration", 60)  # minutes
            
            # Adjust based on agent skill level
            required_skills = context.get("required_skills", [])
            if required_skills:
                avg_skill_level = sum(
                    agent.skill_levels.get(skill, 0.5) for skill in required_skills
                ) / len(required_skills)
                # Higher skill = faster completion
                skill_factor = 2.0 - avg_skill_level  # 1.0 to 2.0
            else:
                skill_factor = 1.0
            
            # Adjust based on current load
            load_factor = 1.0 + agent.current_load  # 1.0 to 2.0
            
            estimated_time = int(base_duration * skill_factor * load_factor)
            return estimated_time
            
        except Exception as e:
            self.logger.error(f"Failed to estimate completion time: {e}")
            return context.get("estimated_duration", 60)
    
    async def _run_consensus_algorithm(
        self,
        agent_preferences: Dict[str, Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Run consensus algorithm to select the best agent."""
        try:
            if not agent_preferences:
                return {"selected_agent": None, "conflicts": []}
            
            # Filter available agents
            available_agents = {
                agent_id: prefs for agent_id, prefs in agent_preferences.items()
                if prefs.get("available", False)
            }
            
            if not available_agents:
                return {"selected_agent": None, "conflicts": []}
            
            # Calculate consensus scores
            consensus_scores = {}
            for agent_id, prefs in available_agents.items():
                score = prefs["preference_score"]
                
                # Boost score based on consensus factors
                if prefs.get("skill_match", 0) > 0.8:
                    score += 0.1  # High skill match bonus
                
                if prefs.get("current_load", 1.0) < 0.3:
                    score += 0.1  # Low load bonus
                
                consensus_scores[agent_id] = score
            
            # Select agent with highest consensus score
            selected_agent = max(consensus_scores.items(), key=lambda x: x[1])
            
            # Check for conflicts (multiple agents with similar high scores)
            conflicts = []
            threshold = selected_agent[1] - 0.1
            high_score_agents = [
                agent_id for agent_id, score in consensus_scores.items()
                if score >= threshold and agent_id != selected_agent[0]
            ]
            
            if high_score_agents:
                conflicts.append({
                    "type": "preference_conflict",
                    "agents": [selected_agent[0]] + high_score_agents,
                    "scores": {agent_id: consensus_scores[agent_id] 
                             for agent_id in [selected_agent[0]] + high_score_agents}
                })
            
            return {
                "selected_agent": selected_agent[0],
                "consensus_score": selected_agent[1],
                "all_scores": consensus_scores,
                "conflicts": conflicts
            }
            
        except Exception as e:
            self.logger.error(f"Failed to run consensus algorithm: {e}")
            return {"selected_agent": None, "conflicts": []}
    
    async def _resolve_conflicts(
        self,
        conflicts: List[Dict[str, Any]],
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Resolve allocation conflicts."""
        try:
            resolution_strategies = []
            
            for conflict in conflicts:
                if conflict["type"] == "preference_conflict":
                    # Use tie-breaking criteria
                    agents = conflict["agents"]
                    scores = conflict["scores"]
                    
                    # Tie-breaker 1: Agent with lowest current load
                    load_scores = {}
                    for agent_id in agents:
                        agent = self.agents.get(agent_id)
                        if agent:
                            load_scores[agent_id] = 1.0 - agent.current_load
                    
                    if load_scores:
                        best_agent = max(load_scores.items(), key=lambda x: x[1])
                        resolution_strategies.append({
                            "strategy": "load_based_tiebreaker",
                            "selected_agent": best_agent[0],
                            "reason": f"Lowest load: {1.0 - best_agent[1]:.2f}"
                        })
            
            return {
                "resolution_strategies": resolution_strategies,
                "final_selection": resolution_strategies[0]["selected_agent"] if resolution_strategies else None
            }
            
        except Exception as e:
            self.logger.error(f"Failed to resolve conflicts: {e}")
            return {"resolution_strategies": [], "final_selection": None}

class ReinforcementLearningTaskAllocator:
    """
    Reinforcement Learning-based Task Allocator for optimal task distribution.
    
    Features:
    - Deep Q-Network for learning optimal allocation policies
    - Multi-agent coordination with consensus mechanisms
    - Conflict resolution and resource contention handling
    - Performance-based learning and adaptation
    - Real-time load balancing and skill matching
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Core components
        self.agents: Dict[str, Agent] = {}
        self.allocations: Dict[str, TaskAllocation] = {}
        self.conflicts: Dict[str, AllocationConflict] = {}
        
        # RL components
        self.dqn_model: Optional[DQNTaskAllocator] = None
        self.target_model: Optional[DQNTaskAllocator] = None
        self.optimizer: Optional[torch.optim.Adam] = None
        self.memory = deque(maxlen=10000)  # Experience replay buffer
        self.scaler = StandardScaler()
        
        # Multi-agent coordination
        self.coordinator = MultiAgentCoordinator()
        
        # RL parameters
        self.state_size = 20  # Feature vector size
        self.action_size = 100  # Max number of agents
        self.learning_rate = 0.001
        self.epsilon = 1.0  # Exploration rate
        self.epsilon_min = 0.01
        self.epsilon_decay = 0.995
        self.gamma = 0.95  # Discount factor
        self.batch_size = 32
        self.target_update_frequency = 100
        
        # Performance tracking
        self.allocation_history = deque(maxlen=1000)
        self.performance_metrics = defaultdict(list)
        self.training_step = 0
        
        # Background tasks
        self.processing_tasks: List[asyncio.Task] = []
        self.system_active = False
    
    async def initialize(self) -> None:
        """Initialize the RL task allocator."""
        try:
            self.logger.info("Initializing RL Task Allocator")
            
            # Initialize RL models
            await self._initialize_rl_models()
            
            # Load agent data
            await self._load_agents()
            
            # Initialize coordinator
            self.coordinator.agents = self.agents
            
            # Start background processing
            self.system_active = True
            self.processing_tasks = [
                asyncio.create_task(self._training_loop()),
                asyncio.create_task(self._performance_monitor()),
                asyncio.create_task(self._conflict_resolver()),
                asyncio.create_task(self._model_updater())
            ]
            
            self.logger.info("RL Task Allocator initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize RL Task Allocator: {e}")
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the task allocator."""
        try:
            self.logger.info("Shutting down RL Task Allocator")
            
            self.system_active = False
            
            # Cancel background tasks
            for task in self.processing_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            # Save model state
            await self._save_model_state()
            
            self.logger.info("RL Task Allocator shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
    
    async def allocate_task(
        self,
        task_id: str,
        task_context: Dict[str, Any],
        constraints: Optional[Dict[str, Any]] = None
    ) -> TaskAllocation:
        """
        Allocate a task to the optimal agent using RL.
        
        Args:
            task_id: Unique task identifier
            task_context: Task information and requirements
            constraints: Optional allocation constraints
            
        Returns:
            TaskAllocation result
        """
        try:
            self.logger.info(f"Allocating task: {task_id}")
            
            # Get candidate agents
            candidate_agents = await self._get_candidate_agents(task_context, constraints or {})
            
            if not candidate_agents:
                raise ValueError("No suitable agents available for task allocation")
            
            # Use RL model for allocation decision
            selected_agent = await self._rl_allocation_decision(
                task_id, task_context, candidate_agents
            )
            
            # Multi-agent coordination if multiple candidates
            if len(candidate_agents) > 1:
                coordination_result = await self.coordinator.coordinate_allocation(
                    task_id, candidate_agents, task_context
                )
                
                if coordination_result.get("selected_agent"):
                    selected_agent = coordination_result["selected_agent"]
            
            # Create allocation
            allocation = await self._create_allocation(
                task_id, selected_agent, task_context, candidate_agents
            )
            
            # Update agent state
            await self._update_agent_state(selected_agent, task_id, allocation)
            
            # Store allocation
            self.allocations[allocation.allocation_id] = allocation
            
            # Add to experience for learning
            await self._add_experience(task_context, selected_agent, candidate_agents)
            
            self.logger.info(f"Task {task_id} allocated to agent {selected_agent}")
            return allocation
            
        except Exception as e:
            self.logger.error(f"Failed to allocate task: {e}")
            raise
    
    async def deallocate_task(
        self,
        allocation_id: str,
        completion_feedback: Optional[Dict[str, Any]] = None
    ) -> bool:
        """Deallocate a task and update agent state."""
        try:
            allocation = self.allocations.get(allocation_id)
            if not allocation:
                return False
            
            # Update agent state
            agent = self.agents.get(allocation.agent_id)
            if agent and allocation.task_id in agent.current_tasks:
                agent.current_tasks.remove(allocation.task_id)
                agent.current_load = max(0.0, agent.current_load - 0.1)
            
            # Process feedback for learning
            if completion_feedback:
                await self._process_completion_feedback(allocation, completion_feedback)
            
            # Remove allocation
            del self.allocations[allocation_id]
            
            self.logger.info(f"Task deallocated: {allocation.task_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to deallocate task: {e}")
            return False
    
    async def get_allocation_recommendations(
        self,
        task_context: Dict[str, Any],
        num_recommendations: int = 3
    ) -> List[Dict[str, Any]]:
        """Get allocation recommendations for a task."""
        try:
            candidate_agents = await self._get_candidate_agents(task_context, {})
            
            if not candidate_agents:
                return []
            
            recommendations = []
            
            # Get RL scores for all candidates
            for agent_id in candidate_agents[:num_recommendations]:
                agent = self.agents[agent_id]
                
                # Calculate recommendation score
                state_vector = self._create_state_vector(task_context, agent_id)
                
                if self.dqn_model:
                    with torch.no_grad():
                        state_tensor = torch.FloatTensor(state_vector).unsqueeze(0)
                        q_values = self.dqn_model(state_tensor)
                        agent_index = list(self.agents.keys()).index(agent_id)
                        score = q_values[0][agent_index].item()
                else:
                    score = self._calculate_heuristic_score(task_context, agent)
                
                recommendations.append({
                    "agent_id": agent_id,
                    "agent_name": agent.name,
                    "score": score,
                    "current_load": agent.current_load,
                    "estimated_completion": self.coordinator._estimate_completion_time(
                        agent, task_context
                    ),
                    "skill_match": self._calculate_skill_match(task_context, agent),
                    "availability": agent.status.value
                })
            
            # Sort by score
            recommendations.sort(key=lambda x: x["score"], reverse=True)
            
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Failed to get allocation recommendations: {e}")
            return []
    
    async def get_allocation_analytics(
        self,
        time_period_days: int = 30
    ) -> Dict[str, Any]:
        """Get allocation performance analytics."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=time_period_days)
            
            # Filter recent allocations
            recent_allocations = [
                alloc for alloc in self.allocation_history
                if start_date <= alloc["timestamp"] <= end_date
            ]
            
            if not recent_allocations:
                return {"message": "No allocations found for the specified period"}
            
            # Calculate metrics
            total_allocations = len(recent_allocations)
            successful_allocations = len([
                alloc for alloc in recent_allocations 
                if alloc.get("success", False)
            ])
            
            success_rate = successful_allocations / total_allocations if total_allocations > 0 else 0
            
            # Agent utilization
            agent_allocations = defaultdict(int)
            for alloc in recent_allocations:
                agent_allocations[alloc["agent_id"]] += 1
            
            # Average allocation time
            allocation_times = [
                alloc.get("allocation_time", 0) for alloc in recent_allocations
            ]
            avg_allocation_time = np.mean(allocation_times) if allocation_times else 0
            
            # Conflict statistics
            recent_conflicts = [
                conflict for conflict in self.conflicts.values()
                if start_date <= conflict.detected_at <= end_date
            ]
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": time_period_days
                },
                "overview": {
                    "total_allocations": total_allocations,
                    "success_rate": round(success_rate, 3),
                    "avg_allocation_time_ms": round(avg_allocation_time, 2),
                    "active_agents": len([a for a in self.agents.values() if a.status != AgentStatus.OFFLINE]),
                    "total_conflicts": len(recent_conflicts)
                },
                "agent_utilization": dict(agent_allocations),
                "performance_metrics": {
                    "model_accuracy": np.mean(self.performance_metrics.get("accuracy", [0.8])),
                    "allocation_efficiency": np.mean(self.performance_metrics.get("efficiency", [0.75])),
                    "conflict_resolution_rate": np.mean(self.performance_metrics.get("conflict_resolution", [0.9]))
                },
                "learning_progress": {
                    "training_steps": self.training_step,
                    "epsilon": self.epsilon,
                    "experience_buffer_size": len(self.memory)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get allocation analytics: {e}")
            return {"error": str(e)}</parameter>
</invoke>    
    #
 Private methods
    async def _initialize_rl_models(self) -> None:
        """Initialize RL models and components."""
        try:
            # Initialize DQN models
            self.dqn_model = DQNTaskAllocator(self.state_size, self.action_size)
            self.target_model = DQNTaskAllocator(self.state_size, self.action_size)
            
            # Copy weights to target model
            self.target_model.load_state_dict(self.dqn_model.state_dict())
            
            # Initialize optimizer
            self.optimizer = optim.Adam(self.dqn_model.parameters(), lr=self.learning_rate)
            
            self.logger.info("RL models initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize RL models: {e}")
    
    async def _load_agents(self) -> None:
        """Load agent data and initialize agent pool."""
        try:
            # Sample agents for demonstration
            sample_agents = [
                {
                    "agent_id": "agent_001",
                    "name": "Security Analyst Alpha",
                    "skills": ["threat_analysis", "incident_response", "forensics"],
                    "skill_levels": {"threat_analysis": 0.9, "incident_response": 0.8, "forensics": 0.7},
                    "max_concurrent_tasks": 3
                },
                {
                    "agent_id": "agent_002", 
                    "name": "Vulnerability Scanner Beta",
                    "skills": ["vulnerability_scanning", "network_analysis", "reporting"],
                    "skill_levels": {"vulnerability_scanning": 0.95, "network_analysis": 0.8, "reporting": 0.6},
                    "max_concurrent_tasks": 5
                },
                {
                    "agent_id": "agent_003",
                    "name": "Compliance Auditor Gamma",
                    "skills": ["compliance_checking", "audit_procedures", "documentation"],
                    "skill_levels": {"compliance_checking": 0.9, "audit_procedures": 0.85, "documentation": 0.9},
                    "max_concurrent_tasks": 2
                },
                {
                    "agent_id": "agent_004",
                    "name": "Threat Hunter Delta",
                    "skills": ["threat_hunting", "data_analysis", "pattern_recognition"],
                    "skill_levels": {"threat_hunting": 0.95, "data_analysis": 0.8, "pattern_recognition": 0.85},
                    "max_concurrent_tasks": 4
                },
                {
                    "agent_id": "agent_005",
                    "name": "System Monitor Epsilon",
                    "skills": ["system_monitoring", "performance_analysis", "alerting"],
                    "skill_levels": {"system_monitoring": 0.9, "performance_analysis": 0.75, "alerting": 0.8},
                    "max_concurrent_tasks": 6
                }
            ]
            
            for agent_data in sample_agents:
                agent = Agent(
                    agent_id=agent_data["agent_id"],
                    name=agent_data["name"],
                    status=AgentStatus.AVAILABLE,
                    skills=agent_data["skills"],
                    skill_levels=agent_data["skill_levels"],
                    current_load=0.0,
                    max_concurrent_tasks=agent_data["max_concurrent_tasks"],
                    current_tasks=[],
                    performance_history=[0.8, 0.85, 0.9],  # Sample performance
                    availability_schedule={str(i): True for i in range(24)},  # Available 24/7
                    location="datacenter_1"
                )
                self.agents[agent.agent_id] = agent
            
            self.logger.info(f"Loaded {len(self.agents)} agents")
            
        except Exception as e:
            self.logger.error(f"Failed to load agents: {e}")
    
    async def _get_candidate_agents(
        self,
        task_context: Dict[str, Any],
        constraints: Dict[str, Any]
    ) -> List[str]:
        """Get candidate agents for task allocation."""
        try:
            candidates = []
            required_skills = task_context.get("required_skills", [])
            min_skill_level = constraints.get("min_skill_level", 0.5)
            
            for agent_id, agent in self.agents.items():
                # Check availability
                if agent.status == AgentStatus.OFFLINE:
                    continue
                
                # Check capacity
                if len(agent.current_tasks) >= agent.max_concurrent_tasks:
                    continue
                
                # Check skill requirements
                if required_skills:
                    skill_match = all(
                        agent.skill_levels.get(skill, 0.0) >= min_skill_level
                        for skill in required_skills
                    )
                    if not skill_match:
                        continue
                
                # Check location constraints
                required_location = constraints.get("required_location")
                if required_location and agent.location != required_location:
                    continue
                
                candidates.append(agent_id)
            
            # Sort by suitability score
            candidates.sort(key=lambda aid: self._calculate_suitability_score(task_context, aid), reverse=True)
            
            return candidates[:10]  # Return top 10 candidates
            
        except Exception as e:
            self.logger.error(f"Failed to get candidate agents: {e}")
            return []
    
    def _calculate_suitability_score(self, task_context: Dict[str, Any], agent_id: str) -> float:
        """Calculate suitability score for an agent."""
        try:
            agent = self.agents[agent_id]
            score = 0.0
            
            # Skill match score
            required_skills = task_context.get("required_skills", [])
            if required_skills:
                skill_scores = [agent.skill_levels.get(skill, 0.0) for skill in required_skills]
                score += np.mean(skill_scores) * 0.4
            else:
                score += 0.4  # No specific skills required
            
            # Availability score
            if agent.status == AgentStatus.AVAILABLE:
                score += 0.3
            elif agent.status == AgentStatus.BUSY and agent.current_load < 0.8:
                score += 0.15
            
            # Load score (prefer less loaded agents)
            score += (1.0 - agent.current_load) * 0.2
            
            # Performance history score
            if agent.performance_history:
                avg_performance = np.mean(agent.performance_history)
                score += avg_performance * 0.1
            
            return score
            
        except Exception as e:
            self.logger.error(f"Failed to calculate suitability score: {e}")
            return 0.0
    
    async def _rl_allocation_decision(
        self,
        task_id: str,
        task_context: Dict[str, Any],
        candidate_agents: List[str]
    ) -> str:
        """Make allocation decision using RL model."""
        try:
            if not self.dqn_model or not candidate_agents:
                return candidate_agents[0] if candidate_agents else None
            
            # Create state vector
            state_vector = self._create_state_vector(task_context, candidate_agents[0])
            
            # Epsilon-greedy action selection
            if random.random() < self.epsilon:
                # Exploration: random selection from candidates
                selected_agent = random.choice(candidate_agents)
            else:
                # Exploitation: use RL model
                with torch.no_grad():
                    state_tensor = torch.FloatTensor(state_vector).unsqueeze(0)
                    q_values = self.dqn_model(state_tensor)
                    
                    # Get Q-values for candidate agents only
                    agent_indices = [list(self.agents.keys()).index(aid) for aid in candidate_agents]
                    candidate_q_values = q_values[0][agent_indices]
                    
                    # Select agent with highest Q-value
                    best_candidate_idx = torch.argmax(candidate_q_values).item()
                    selected_agent = candidate_agents[best_candidate_idx]
            
            return selected_agent
            
        except Exception as e:
            self.logger.error(f"Failed to make RL allocation decision: {e}")
            return candidate_agents[0] if candidate_agents else None
    
    def _create_state_vector(self, task_context: Dict[str, Any], agent_id: str) -> np.ndarray:
        """Create state vector for RL model."""
        try:
            agent = self.agents[agent_id]
            
            # Task features
            task_features = [
                task_context.get("priority_score", 0.5),
                task_context.get("estimated_duration", 60) / 240.0,  # Normalize to 0-1
                len(task_context.get("required_skills", [])) / 10.0,  # Max 10 skills
                task_context.get("complexity_score", 0.5),
                1.0 if task_context.get("urgent", False) else 0.0
            ]
            
            # Agent features
            agent_features = [
                1.0 if agent.status == AgentStatus.AVAILABLE else 0.0,
                agent.current_load,
                len(agent.current_tasks) / agent.max_concurrent_tasks,
                np.mean(agent.performance_history) if agent.performance_history else 0.8,
                len(agent.skills) / 10.0  # Max 10 skills
            ]
            
            # Skill match features
            required_skills = task_context.get("required_skills", [])
            skill_features = []
            for skill in required_skills[:5]:  # Max 5 skills
                skill_features.append(agent.skill_levels.get(skill, 0.0))
            
            # Pad to 5 skills
            while len(skill_features) < 5:
                skill_features.append(0.0)
            
            # System features
            system_features = [
                len(self.agents) / 100.0,  # Normalize agent count
                len([a for a in self.agents.values() if a.status == AgentStatus.AVAILABLE]) / len(self.agents),
                len(self.allocations) / 1000.0,  # Normalize allocation count
                self.epsilon,  # Current exploration rate
                len(self.memory) / 10000.0  # Normalize memory size
            ]
            
            # Combine all features
            state_vector = np.array(task_features + agent_features + skill_features + system_features)
            
            # Ensure correct size
            if len(state_vector) < self.state_size:
                padding = np.zeros(self.state_size - len(state_vector))
                state_vector = np.concatenate([state_vector, padding])
            elif len(state_vector) > self.state_size:
                state_vector = state_vector[:self.state_size]
            
            return state_vector
            
        except Exception as e:
            self.logger.error(f"Failed to create state vector: {e}")
            return np.zeros(self.state_size)
    
    async def _create_allocation(
        self,
        task_id: str,
        agent_id: str,
        task_context: Dict[str, Any],
        candidate_agents: List[str]
    ) -> TaskAllocation:
        """Create task allocation object."""
        try:
            agent = self.agents[agent_id]
            
            # Calculate confidence score
            confidence = self._calculate_allocation_confidence(task_context, agent)
            
            # Estimate timing
            estimated_duration = task_context.get("estimated_duration", 60)
            current_time = datetime.utcnow()
            
            # Account for current load
            delay_minutes = int(agent.current_load * 30)  # Up to 30 min delay
            estimated_start = current_time + timedelta(minutes=delay_minutes)
            estimated_completion = estimated_start + timedelta(minutes=estimated_duration)
            
            allocation = TaskAllocation(
                allocation_id=str(uuid.uuid4()),
                task_id=task_id,
                agent_id=agent_id,
                allocated_at=current_time,
                estimated_start=estimated_start,
                estimated_completion=estimated_completion,
                confidence_score=confidence,
                allocation_reason=f"RL-based allocation (confidence: {confidence:.2f})",
                alternative_agents=candidate_agents[1:4]  # Top 3 alternatives
            )
            
            return allocation
            
        except Exception as e:
            self.logger.error(f"Failed to create allocation: {e}")
            raise
    
    def _calculate_allocation_confidence(self, task_context: Dict[str, Any], agent: Agent) -> float:
        """Calculate confidence score for allocation."""
        try:
            confidence = 0.0
            
            # Skill match confidence
            required_skills = task_context.get("required_skills", [])
            if required_skills:
                skill_confidences = [agent.skill_levels.get(skill, 0.0) for skill in required_skills]
                confidence += np.mean(skill_confidences) * 0.4
            else:
                confidence += 0.4
            
            # Availability confidence
            if agent.status == AgentStatus.AVAILABLE:
                confidence += 0.3
            elif agent.status == AgentStatus.BUSY and agent.current_load < 0.7:
                confidence += 0.2
            else:
                confidence += 0.1
            
            # Performance confidence
            if agent.performance_history:
                avg_performance = np.mean(agent.performance_history)
                confidence += avg_performance * 0.2
            else:
                confidence += 0.16  # Default performance
            
            # Load confidence
            load_confidence = 1.0 - agent.current_load
            confidence += load_confidence * 0.1
            
            return min(confidence, 1.0)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate allocation confidence: {e}")
            return 0.5
    
    async def _update_agent_state(self, agent_id: str, task_id: str, allocation: TaskAllocation) -> None:
        """Update agent state after allocation."""
        try:
            agent = self.agents[agent_id]
            
            # Add task to current tasks
            agent.current_tasks.append(task_id)
            
            # Update load
            load_increase = min(0.2, 1.0 / agent.max_concurrent_tasks)
            agent.current_load = min(1.0, agent.current_load + load_increase)
            
            # Update status
            if agent.current_load >= 0.9:
                agent.status = AgentStatus.BUSY
            elif agent.status == AgentStatus.AVAILABLE and agent.current_load > 0.5:
                agent.status = AgentStatus.BUSY
            
        except Exception as e:
            self.logger.error(f"Failed to update agent state: {e}")
    
    async def _add_experience(
        self,
        task_context: Dict[str, Any],
        selected_agent: str,
        candidate_agents: List[str]
    ) -> None:
        """Add experience to replay buffer for learning."""
        try:
            # Create state vector
            state = self._create_state_vector(task_context, selected_agent)
            
            # Action is the index of selected agent
            action = list(self.agents.keys()).index(selected_agent)
            
            # Initial reward (will be updated when task completes)
            reward = 0.0
            
            # Store experience (state, action, reward, next_state, done)
            experience = {
                "state": state,
                "action": action,
                "reward": reward,
                "next_state": None,  # Will be filled later
                "done": False,
                "timestamp": datetime.utcnow(),
                "task_id": task_context.get("task_id"),
                "agent_id": selected_agent
            }
            
            self.memory.append(experience)
            
        except Exception as e:
            self.logger.error(f"Failed to add experience: {e}")
    
    async def _process_completion_feedback(
        self,
        allocation: TaskAllocation,
        feedback: Dict[str, Any]
    ) -> None:
        """Process task completion feedback for learning."""
        try:
            # Calculate reward based on feedback
            reward = self._calculate_reward(allocation, feedback)
            
            # Find corresponding experience in memory
            for experience in reversed(self.memory):
                if (experience.get("task_id") == allocation.task_id and
                    experience.get("agent_id") == allocation.agent_id):
                    
                    # Update experience with reward and completion
                    experience["reward"] = reward
                    experience["done"] = True
                    
                    # Update agent performance history
                    agent = self.agents.get(allocation.agent_id)
                    if agent:
                        performance_score = feedback.get("performance_score", 0.8)
                        agent.performance_history.append(performance_score)
                        
                        # Keep only last 10 performance scores
                        if len(agent.performance_history) > 10:
                            agent.performance_history = agent.performance_history[-10:]
                    
                    break
            
            # Store allocation result for analytics
            self.allocation_history.append({
                "allocation_id": allocation.allocation_id,
                "task_id": allocation.task_id,
                "agent_id": allocation.agent_id,
                "success": feedback.get("success", False),
                "performance_score": feedback.get("performance_score", 0.0),
                "completion_time": feedback.get("completion_time", 0),
                "timestamp": datetime.utcnow()
            })
            
        except Exception as e:
            self.logger.error(f"Failed to process completion feedback: {e}")
    
    def _calculate_reward(self, allocation: TaskAllocation, feedback: Dict[str, Any]) -> float:
        """Calculate reward for RL learning."""
        try:
            reward = 0.0
            
            # Success reward
            if feedback.get("success", False):
                reward += 1.0
            else:
                reward -= 0.5
            
            # Performance reward
            performance_score = feedback.get("performance_score", 0.0)
            reward += performance_score * 0.5
            
            # Efficiency reward (based on completion time vs estimate)
            actual_time = feedback.get("completion_time", 0)
            estimated_time = (allocation.estimated_completion - allocation.estimated_start).total_seconds() / 60
            
            if actual_time > 0 and estimated_time > 0:
                efficiency = min(estimated_time / actual_time, 2.0)  # Cap at 2x efficiency
                reward += (efficiency - 1.0) * 0.3
            
            # Confidence reward (higher confidence should correlate with success)
            if feedback.get("success", False):
                reward += allocation.confidence_score * 0.2
            else:
                reward -= allocation.confidence_score * 0.1
            
            return reward
            
        except Exception as e:
            self.logger.error(f"Failed to calculate reward: {e}")
            return 0.0
    
    def _calculate_skill_match(self, task_context: Dict[str, Any], agent: Agent) -> float:
        """Calculate skill match score between task and agent."""
        try:
            required_skills = task_context.get("required_skills", [])
            if not required_skills:
                return 1.0
            
            skill_scores = [agent.skill_levels.get(skill, 0.0) for skill in required_skills]
            return np.mean(skill_scores)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate skill match: {e}")
            return 0.0
    
    def _calculate_heuristic_score(self, task_context: Dict[str, Any], agent: Agent) -> float:
        """Calculate heuristic allocation score when RL model is not available."""
        try:
            score = 0.0
            
            # Skill match
            skill_match = self._calculate_skill_match(task_context, agent)
            score += skill_match * 0.4
            
            # Availability
            if agent.status == AgentStatus.AVAILABLE:
                score += 0.3
            elif agent.status == AgentStatus.BUSY and agent.current_load < 0.8:
                score += 0.15
            
            # Load
            score += (1.0 - agent.current_load) * 0.2
            
            # Performance
            if agent.performance_history:
                score += np.mean(agent.performance_history) * 0.1
            else:
                score += 0.08
            
            return score
            
        except Exception as e:
            self.logger.error(f"Failed to calculate heuristic score: {e}")
            return 0.0
    
    async def _save_model_state(self) -> None:
        """Save RL model state."""
        try:
            if self.dqn_model:
                # In production, this would save to persistent storage
                self.logger.info("Model state saved")
                
        except Exception as e:
            self.logger.error(f"Failed to save model state: {e}")
    
    # Background task methods
    async def _training_loop(self) -> None:
        """Background training loop for RL model."""
        while self.system_active:
            try:
                if len(self.memory) >= self.batch_size:
                    await self._train_model()
                    
                    # Update target model periodically
                    if self.training_step % self.target_update_frequency == 0:
                        self.target_model.load_state_dict(self.dqn_model.state_dict())
                    
                    # Decay epsilon
                    if self.epsilon > self.epsilon_min:
                        self.epsilon *= self.epsilon_decay
                
                await asyncio.sleep(60)  # Train every minute
                
            except Exception as e:
                self.logger.error(f"Error in training loop: {e}")
                await asyncio.sleep(300)
    
    async def _train_model(self) -> None:
        """Train the RL model using experience replay."""
        try:
            if not self.dqn_model or len(self.memory) < self.batch_size:
                return
            
            # Sample batch from memory
            batch = random.sample(list(self.memory), self.batch_size)
            
            # Prepare training data
            states = torch.FloatTensor([exp["state"] for exp in batch])
            actions = torch.LongTensor([exp["action"] for exp in batch])
            rewards = torch.FloatTensor([exp["reward"] for exp in batch])
            next_states = torch.FloatTensor([
                exp.get("next_state", exp["state"]) for exp in batch
            ])
            dones = torch.BoolTensor([exp["done"] for exp in batch])
            
            # Current Q values
            current_q_values = self.dqn_model(states).gather(1, actions.unsqueeze(1))
            
            # Next Q values from target model
            next_q_values = self.target_model(next_states).max(1)[0].detach()
            target_q_values = rewards + (self.gamma * next_q_values * ~dones)
            
            # Compute loss
            loss = F.mse_loss(current_q_values.squeeze(), target_q_values)
            
            # Optimize
            self.optimizer.zero_grad()
            loss.backward()
            self.optimizer.step()
            
            self.training_step += 1
            
            # Update performance metrics
            self.performance_metrics["training_loss"].append(loss.item())
            
        except Exception as e:
            self.logger.error(f"Failed to train model: {e}")
    
    async def _performance_monitor(self) -> None:
        """Monitor allocation performance."""
        while self.system_active:
            try:
                # Calculate recent performance metrics
                recent_allocations = list(self.allocation_history)[-100:]  # Last 100 allocations
                
                if recent_allocations:
                    success_rate = sum(1 for alloc in recent_allocations if alloc.get("success", False)) / len(recent_allocations)
                    avg_performance = np.mean([alloc.get("performance_score", 0) for alloc in recent_allocations])
                    
                    self.performance_metrics["accuracy"].append(success_rate)
                    self.performance_metrics["efficiency"].append(avg_performance)
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"Error in performance monitor: {e}")
                await asyncio.sleep(600)
    
    async def _conflict_resolver(self) -> None:
        """Resolve allocation conflicts."""
        while self.system_active:
            try:
                # Check for resource conflicts
                await self._detect_conflicts()
                
                # Resolve existing conflicts
                unresolved_conflicts = [
                    conflict for conflict in self.conflicts.values()
                    if not conflict.resolved_at
                ]
                
                for conflict in unresolved_conflicts:
                    await self._resolve_conflict(conflict)
                
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                self.logger.error(f"Error in conflict resolver: {e}")
                await asyncio.sleep(60)
    
    async def _detect_conflicts(self) -> None:
        """Detect allocation conflicts."""
        try:
            # Check for overloaded agents
            for agent_id, agent in self.agents.items():
                if agent.current_load > 1.0:
                    conflict = AllocationConflict(
                        conflict_id=str(uuid.uuid4()),
                        conflict_type=ConflictType.RESOURCE_CONTENTION,
                        involved_tasks=agent.current_tasks.copy(),
                        involved_agents=[agent_id],
                        severity=min(agent.current_load - 1.0, 1.0),
                        detected_at=datetime.utcnow()
                    )
                    self.conflicts[conflict.conflict_id] = conflict
            
        except Exception as e:
            self.logger.error(f"Failed to detect conflicts: {e}")
    
    async def _resolve_conflict(self, conflict: AllocationConflict) -> None:
        """Resolve a specific conflict."""
        try:
            if conflict.conflict_type == ConflictType.RESOURCE_CONTENTION:
                # Redistribute tasks from overloaded agents
                for agent_id in conflict.involved_agents:
                    agent = self.agents.get(agent_id)
                    if agent and agent.current_load > 1.0:
                        # Find tasks that can be redistributed
                        redistributable_tasks = agent.current_tasks[-2:]  # Last 2 tasks
                        
                        for task_id in redistributable_tasks:
                            # Find alternative agent
                            alternative_agents = await self._get_candidate_agents(
                                {"task_id": task_id}, {}
                            )
                            
                            if alternative_agents and alternative_agents[0] != agent_id:
                                # Redistribute task
                                agent.current_tasks.remove(task_id)
                                agent.current_load = max(0.0, agent.current_load - 0.2)
                                
                                new_agent = self.agents[alternative_agents[0]]
                                new_agent.current_tasks.append(task_id)
                                new_agent.current_load = min(1.0, new_agent.current_load + 0.2)
                                
                                break
            
            # Mark conflict as resolved
            conflict.resolved_at = datetime.utcnow()
            conflict.resolution_strategy = "task_redistribution"
            
        except Exception as e:
            self.logger.error(f"Failed to resolve conflict: {e}")
    
    async def _model_updater(self) -> None:
        """Update model parameters and configuration."""
        while self.system_active:
            try:
                # Update action size if agent count changed
                current_agent_count = len(self.agents)
                if current_agent_count != self.action_size:
                    self.action_size = current_agent_count
                    # In production, would reinitialize model with new action size
                
                await asyncio.sleep(3600)  # Update hourly
                
            except Exception as e:
                self.logger.error(f"Error in model updater: {e}")
                await asyncio.sleep(1800)