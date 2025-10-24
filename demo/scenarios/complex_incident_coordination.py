"""
Complex Incident Coordination Scenario for ACSO Phase 5 Agentic Demonstrations.

This module creates multi-system outage simulations with cross-agent task coordination,
dynamic priority and resource management, and escalation and delegation workflows.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, field
import json
import logging

logger = logging.getLogger(__name__)


class IncidentSeverity(str, Enum):
    """Incident severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"
    EMERGENCY = "emergency"


class SystemStatus(str, Enum):
    """System status levels."""
    OPERATIONAL = "operational"
    DEGRADED = "degraded"
    PARTIAL_OUTAGE = "partial_outage"
    MAJOR_OUTAGE = "major_outage"
    COMPLETE_OUTAGE = "complete_outage"


class AgentCapability(str, Enum):
    """Agent capabilities for task assignment."""
    NETWORK_ANALYSIS = "network_analysis"
    DATABASE_RECOVERY = "database_recovery"
    APPLICATION_RESTART = "application_restart"
    SECURITY_INVESTIGATION = "security_investigation"
    PERFORMANCE_OPTIMIZATION = "performance_optimization"
    COMMUNICATION_MANAGEMENT = "communication_management"
    RESOURCE_PROVISIONING = "resource_provisioning"
    BACKUP_RESTORATION = "backup_restoration"


@dataclass
class SystemComponent:
    """Represents a system component in the infrastructure."""
    component_id: str
    name: str
    component_type: str
    status: SystemStatus
    dependencies: List[str]
    health_score: float
    last_check: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "component_id": self.component_id,
            "name": self.name,
            "component_type": self.component_type,
            "status": self.status.value,
            "dependencies": self.dependencies,
            "health_score": self.health_score,
            "last_check": self.last_check.isoformat(),
            "metadata": self.metadata
        }


@dataclass
class CoordinationTask:
    """Represents a coordination task assigned to an agent."""
    task_id: str
    title: str
    description: str
    assigned_agent: str
    required_capabilities: List[AgentCapability]
    priority: int
    estimated_duration_minutes: int
    dependencies: List[str]
    status: str
    created_at: datetime
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    progress_percentage: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "task_id": self.task_id,
            "title": self.title,
            "description": self.description,
            "assigned_agent": self.assigned_agent,
            "required_capabilities": [cap.value for cap in self.required_capabilities],
            "priority": self.priority,
            "estimated_duration_minutes": self.estimated_duration_minutes,
            "dependencies": self.dependencies,
            "status": self.status,
            "created_at": self.created_at.isoformat(),
            "started_at": self.started_at.isoformat() if self.started_at else None,
            "completed_at": self.completed_at.isoformat() if self.completed_at else None,
            "progress_percentage": self.progress_percentage,
            "metadata": self.metadata
        }


@dataclass
class ComplexIncident:
    """Represents a complex multi-system incident."""
    incident_id: str
    title: str
    description: str
    severity: IncidentSeverity
    affected_systems: List[SystemComponent]
    coordination_tasks: List[CoordinationTask]
    start_time: datetime
    estimated_resolution_time: Optional[datetime]
    actual_resolution_time: Optional[datetime]
    status: str
    escalation_level: int
    coordination_events: List[Dict[str, Any]]
    resource_allocation: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "incident_id": self.incident_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity.value,
            "affected_systems": [sys.to_dict() for sys in self.affected_systems],
            "coordination_tasks": [task.to_dict() for task in self.coordination_tasks],
            "start_time": self.start_time.isoformat(),
            "estimated_resolution_time": self.estimated_resolution_time.isoformat() if self.estimated_resolution_time else None,
            "actual_resolution_time": self.actual_resolution_time.isoformat() if self.actual_resolution_time else None,
            "status": self.status,
            "escalation_level": self.escalation_level,
            "coordination_events": self.coordination_events,
            "resource_allocation": self.resource_allocation,
            "metadata": self.metadata
        }

class ComplexIncidentCoordinator:
    """
    Coordinator for complex multi-system incident scenarios.
    
    This coordinator manages:
    - Multi-system outage simulations
    - Cross-agent task coordination
    - Dynamic priority and resource management
    - Escalation and delegation workflows
    """
    
    def __init__(self):
        self.coordinator_id = str(uuid.uuid4())
        self.active_incidents: Dict[str, ComplexIncident] = {}
        self.incident_history: List[ComplexIncident] = []
        self.agent_capabilities = self._initialize_agent_capabilities()
        self.system_topology = self._initialize_system_topology()
        
        # Configuration
        self.config = {
            "max_concurrent_incidents": 3,
            "escalation_timeout_minutes": 30,
            "resource_allocation_threshold": 0.8,
            "coordination_check_interval": 60,
            "auto_escalation_enabled": True
        }
        
    def _initialize_agent_capabilities(self) -> Dict[str, List[AgentCapability]]:
        """Initialize agent capabilities mapping."""
        return {
            "network_specialist": [
                AgentCapability.NETWORK_ANALYSIS,
                AgentCapability.PERFORMANCE_OPTIMIZATION,
                AgentCapability.RESOURCE_PROVISIONING
            ],
            "database_specialist": [
                AgentCapability.DATABASE_RECOVERY,
                AgentCapability.BACKUP_RESTORATION,
                AgentCapability.PERFORMANCE_OPTIMIZATION
            ],
            "application_specialist": [
                AgentCapability.APPLICATION_RESTART,
                AgentCapability.PERFORMANCE_OPTIMIZATION,
                AgentCapability.RESOURCE_PROVISIONING
            ],
            "security_specialist": [
                AgentCapability.SECURITY_INVESTIGATION,
                AgentCapability.NETWORK_ANALYSIS,
                AgentCapability.COMMUNICATION_MANAGEMENT
            ],
            "incident_commander": [
                AgentCapability.COMMUNICATION_MANAGEMENT,
                AgentCapability.RESOURCE_PROVISIONING,
                AgentCapability.PERFORMANCE_OPTIMIZATION
            ]
        }
        
    def _initialize_system_topology(self) -> List[SystemComponent]:
        """Initialize system topology with dependencies."""
        components = [
            SystemComponent(
                component_id="load_balancer",
                name="Primary Load Balancer",
                component_type="network",
                status=SystemStatus.OPERATIONAL,
                dependencies=[],
                health_score=0.95,
                last_check=datetime.utcnow()
            ),
            SystemComponent(
                component_id="web_servers",
                name="Web Server Cluster",
                component_type="application",
                status=SystemStatus.OPERATIONAL,
                dependencies=["load_balancer"],
                health_score=0.92,
                last_check=datetime.utcnow()
            ),
            SystemComponent(
                component_id="api_gateway",
                name="API Gateway",
                component_type="application",
                status=SystemStatus.OPERATIONAL,
                dependencies=["load_balancer"],
                health_score=0.88,
                last_check=datetime.utcnow()
            ),
            SystemComponent(
                component_id="database_primary",
                name="Primary Database",
                component_type="database",
                status=SystemStatus.OPERATIONAL,
                dependencies=[],
                health_score=0.90,
                last_check=datetime.utcnow()
            ),
            SystemComponent(
                component_id="database_replica",
                name="Database Replica",
                component_type="database",
                status=SystemStatus.OPERATIONAL,
                dependencies=["database_primary"],
                health_score=0.85,
                last_check=datetime.utcnow()
            ),
            SystemComponent(
                component_id="cache_cluster",
                name="Redis Cache Cluster",
                component_type="cache",
                status=SystemStatus.OPERATIONAL,
                dependencies=[],
                health_score=0.93,
                last_check=datetime.utcnow()
            ),
            SystemComponent(
                component_id="message_queue",
                name="Message Queue System",
                component_type="messaging",
                status=SystemStatus.OPERATIONAL,
                dependencies=[],
                health_score=0.87,
                last_check=datetime.utcnow()
            )
        ]
        
        return components    asy
nc def create_complex_incident(self, incident_config: Dict[str, Any]) -> ComplexIncident:
        """Create a complex multi-system incident scenario."""
        incident_id = str(uuid.uuid4())
        
        # Determine incident characteristics
        severity = IncidentSeverity(incident_config.get("severity", "high"))
        incident_type = incident_config.get("type", "cascading_failure")
        
        # Generate affected systems based on incident type
        affected_systems = await self._generate_affected_systems(incident_type, severity)
        
        # Create coordination tasks
        coordination_tasks = await self._generate_coordination_tasks(affected_systems, severity)
        
        # Calculate estimated resolution time
        estimated_resolution = self._calculate_estimated_resolution(coordination_tasks, severity)
        
        incident = ComplexIncident(
            incident_id=incident_id,
            title=incident_config.get("title", f"Complex {incident_type.title()} Incident"),
            description=f"Multi-system incident affecting {len(affected_systems)} components",
            severity=severity,
            affected_systems=affected_systems,
            coordination_tasks=coordination_tasks,
            start_time=datetime.utcnow(),
            estimated_resolution_time=estimated_resolution,
            actual_resolution_time=None,
            status="active",
            escalation_level=1,
            coordination_events=[],
            resource_allocation={
                "agents_assigned": len(set(task.assigned_agent for task in coordination_tasks)),
                "total_tasks": len(coordination_tasks),
                "priority_tasks": len([t for t in coordination_tasks if t.priority >= 8])
            },
            metadata={
                "incident_type": incident_type,
                "auto_generated": True,
                "coordination_complexity": "high"
            }
        )
        
        self.active_incidents[incident_id] = incident
        
        # Start incident coordination
        asyncio.create_task(self._coordinate_incident_response(incident))
        
        logger.info(f"Created complex incident: {incident_id}")
        return incident
        
    async def _generate_affected_systems(self, incident_type: str, severity: IncidentSeverity) -> List[SystemComponent]:
        """Generate affected systems based on incident type and severity."""
        affected_systems = []
        
        if incident_type == "cascading_failure":
            # Start with a primary failure and cascade
            primary_failure = random.choice(self.system_topology)
            affected_systems.append(self._create_affected_system(primary_failure, SystemStatus.MAJOR_OUTAGE))
            
            # Add dependent systems
            for system in self.system_topology:
                if primary_failure.component_id in system.dependencies:
                    status = SystemStatus.DEGRADED if severity == IncidentSeverity.MEDIUM else SystemStatus.PARTIAL_OUTAGE
                    affected_systems.append(self._create_affected_system(system, status))
                    
        elif incident_type == "network_partition":
            # Affect network-related components
            network_components = [s for s in self.system_topology if s.component_type in ["network", "application"]]
            for component in network_components[:3]:
                status = SystemStatus.PARTIAL_OUTAGE if component.component_type == "network" else SystemStatus.DEGRADED
                affected_systems.append(self._create_affected_system(component, status))
                
        elif incident_type == "database_corruption":
            # Affect database components
            db_components = [s for s in self.system_topology if s.component_type == "database"]
            for component in db_components:
                status = SystemStatus.COMPLETE_OUTAGE if "primary" in component.name.lower() else SystemStatus.DEGRADED
                affected_systems.append(self._create_affected_system(component, status))
                
        else:  # general_outage
            # Affect multiple random systems
            num_affected = min(len(self.system_topology), random.randint(2, 5))
            selected_systems = random.sample(self.system_topology, num_affected)
            
            for system in selected_systems:
                status = random.choice([SystemStatus.DEGRADED, SystemStatus.PARTIAL_OUTAGE, SystemStatus.MAJOR_OUTAGE])
                affected_systems.append(self._create_affected_system(system, status))
                
        return affected_systems
        
    def _create_affected_system(self, original_system: SystemComponent, new_status: SystemStatus) -> SystemComponent:
        """Create an affected system component with updated status."""
        health_impact = {
            SystemStatus.DEGRADED: 0.3,
            SystemStatus.PARTIAL_OUTAGE: 0.6,
            SystemStatus.MAJOR_OUTAGE: 0.8,
            SystemStatus.COMPLETE_OUTAGE: 1.0
        }
        
        impact = health_impact.get(new_status, 0.5)
        new_health = max(0.0, original_system.health_score - impact)
        
        return SystemComponent(
            component_id=original_system.component_id,
            name=original_system.name,
            component_type=original_system.component_type,
            status=new_status,
            dependencies=original_system.dependencies,
            health_score=new_health,
            last_check=datetime.utcnow(),
            metadata={
                "original_status": original_system.status.value,
                "original_health": original_system.health_score,
                "impact_level": impact
            }
        ) 
   async def _generate_coordination_tasks(self, affected_systems: List[SystemComponent], 
                                          severity: IncidentSeverity) -> List[CoordinationTask]:
        """Generate coordination tasks based on affected systems."""
        tasks = []
        task_priority_base = {"emergency": 10, "critical": 9, "high": 8, "medium": 6, "low": 4}
        base_priority = task_priority_base.get(severity.value, 6)
        
        for system in affected_systems:
            # Generate system-specific tasks
            system_tasks = self._generate_system_tasks(system, base_priority)
            tasks.extend(system_tasks)
            
        # Add coordination and communication tasks
        coordination_tasks = self._generate_meta_coordination_tasks(affected_systems, base_priority)
        tasks.extend(coordination_tasks)
        
        # Assign tasks to agents
        for task in tasks:
            task.assigned_agent = self._assign_task_to_agent(task)
            
        return tasks
        
    def _generate_system_tasks(self, system: SystemComponent, base_priority: int) -> List[CoordinationTask]:
        """Generate tasks specific to a system component."""
        tasks = []
        
        if system.component_type == "network":
            tasks.extend([
                CoordinationTask(
                    task_id=str(uuid.uuid4()),
                    title=f"Analyze {system.name} Network Issues",
                    description=f"Investigate network connectivity and performance issues in {system.name}",
                    assigned_agent="",  # Will be assigned later
                    required_capabilities=[AgentCapability.NETWORK_ANALYSIS],
                    priority=base_priority,
                    estimated_duration_minutes=30,
                    dependencies=[],
                    status="pending",
                    created_at=datetime.utcnow(),
                    metadata={"system_id": system.component_id, "task_type": "investigation"}
                ),
                CoordinationTask(
                    task_id=str(uuid.uuid4()),
                    title=f"Restore {system.name} Connectivity",
                    description=f"Implement fixes to restore network connectivity for {system.name}",
                    assigned_agent="",
                    required_capabilities=[AgentCapability.NETWORK_ANALYSIS, AgentCapability.RESOURCE_PROVISIONING],
                    priority=base_priority + 1,
                    estimated_duration_minutes=45,
                    dependencies=[],
                    status="pending",
                    created_at=datetime.utcnow(),
                    metadata={"system_id": system.component_id, "task_type": "remediation"}
                )
            ])
            
        elif system.component_type == "database":
            tasks.extend([
                CoordinationTask(
                    task_id=str(uuid.uuid4()),
                    title=f"Assess {system.name} Database Health",
                    description=f"Evaluate database integrity and performance for {system.name}",
                    assigned_agent="",
                    required_capabilities=[AgentCapability.DATABASE_RECOVERY],
                    priority=base_priority + 2,  # Database issues are critical
                    estimated_duration_minutes=20,
                    dependencies=[],
                    status="pending",
                    created_at=datetime.utcnow(),
                    metadata={"system_id": system.component_id, "task_type": "assessment"}
                ),
                CoordinationTask(
                    task_id=str(uuid.uuid4()),
                    title=f"Recover {system.name} Database",
                    description=f"Execute database recovery procedures for {system.name}",
                    assigned_agent="",
                    required_capabilities=[AgentCapability.DATABASE_RECOVERY, AgentCapability.BACKUP_RESTORATION],
                    priority=base_priority + 3,
                    estimated_duration_minutes=60,
                    dependencies=[],
                    status="pending",
                    created_at=datetime.utcnow(),
                    metadata={"system_id": system.component_id, "task_type": "recovery"}
                )
            ])
            
        elif system.component_type == "application":
            tasks.extend([
                CoordinationTask(
                    task_id=str(uuid.uuid4()),
                    title=f"Restart {system.name} Services",
                    description=f"Restart and validate application services for {system.name}",
                    assigned_agent="",
                    required_capabilities=[AgentCapability.APPLICATION_RESTART],
                    priority=base_priority,
                    estimated_duration_minutes=15,
                    dependencies=[],
                    status="pending",
                    created_at=datetime.utcnow(),
                    metadata={"system_id": system.component_id, "task_type": "restart"}
                ),
                CoordinationTask(
                    task_id=str(uuid.uuid4()),
                    title=f"Optimize {system.name} Performance",
                    description=f"Tune performance parameters for {system.name}",
                    assigned_agent="",
                    required_capabilities=[AgentCapability.PERFORMANCE_OPTIMIZATION],
                    priority=base_priority - 1,
                    estimated_duration_minutes=25,
                    dependencies=[],
                    status="pending",
                    created_at=datetime.utcnow(),
                    metadata={"system_id": system.component_id, "task_type": "optimization"}
                )
            ])
            
        return tasks    def _
generate_meta_coordination_tasks(self, affected_systems: List[SystemComponent], 
                                         base_priority: int) -> List[CoordinationTask]:
        """Generate meta-coordination tasks for incident management."""
        return [
            CoordinationTask(
                task_id=str(uuid.uuid4()),
                title="Establish Incident Command Center",
                description="Set up coordination center and communication channels",
                assigned_agent="",
                required_capabilities=[AgentCapability.COMMUNICATION_MANAGEMENT],
                priority=base_priority + 2,
                estimated_duration_minutes=10,
                dependencies=[],
                status="pending",
                created_at=datetime.utcnow(),
                metadata={"task_type": "coordination", "critical": True}
            ),
            CoordinationTask(
                task_id=str(uuid.uuid4()),
                title="Notify Stakeholders",
                description="Inform relevant stakeholders about the incident status",
                assigned_agent="",
                required_capabilities=[AgentCapability.COMMUNICATION_MANAGEMENT],
                priority=base_priority + 1,
                estimated_duration_minutes=15,
                dependencies=[],
                status="pending",
                created_at=datetime.utcnow(),
                metadata={"task_type": "communication"}
            ),
            CoordinationTask(
                task_id=str(uuid.uuid4()),
                title="Coordinate Resource Allocation",
                description="Manage and allocate resources across recovery teams",
                assigned_agent="",
                required_capabilities=[AgentCapability.RESOURCE_PROVISIONING],
                priority=base_priority,
                estimated_duration_minutes=20,
                dependencies=[],
                status="pending",
                created_at=datetime.utcnow(),
                metadata={"task_type": "resource_management"}
            ),
            CoordinationTask(
                task_id=str(uuid.uuid4()),
                title="Monitor Recovery Progress",
                description="Track and coordinate recovery progress across all systems",
                assigned_agent="",
                required_capabilities=[AgentCapability.COMMUNICATION_MANAGEMENT, AgentCapability.PERFORMANCE_OPTIMIZATION],
                priority=base_priority,
                estimated_duration_minutes=0,  # Ongoing task
                dependencies=[],
                status="pending",
                created_at=datetime.utcnow(),
                metadata={"task_type": "monitoring", "ongoing": True}
            )
        ]
        
    def _assign_task_to_agent(self, task: CoordinationTask) -> str:
        """Assign a task to the most suitable agent based on capabilities."""
        suitable_agents = []
        
        for agent_id, capabilities in self.agent_capabilities.items():
            # Check if agent has required capabilities
            if all(cap in capabilities for cap in task.required_capabilities):
                suitable_agents.append(agent_id)
                
        if not suitable_agents:
            # Fallback to incident commander if no specific match
            return "incident_commander"
            
        # For demo purposes, randomly select from suitable agents
        # In real implementation, would consider current workload, availability, etc.
        return random.choice(suitable_agents)
        
    def _calculate_estimated_resolution(self, tasks: List[CoordinationTask], 
                                      severity: IncidentSeverity) -> datetime:
        """Calculate estimated resolution time based on tasks and severity."""
        # Calculate critical path duration
        max_duration = max((task.estimated_duration_minutes for task in tasks), default=60)
        
        # Add buffer based on severity
        severity_multipliers = {
            IncidentSeverity.LOW: 1.2,
            IncidentSeverity.MEDIUM: 1.5,
            IncidentSeverity.HIGH: 2.0,
            IncidentSeverity.CRITICAL: 2.5,
            IncidentSeverity.EMERGENCY: 3.0
        }
        
        multiplier = severity_multipliers.get(severity, 2.0)
        estimated_minutes = max_duration * multiplier
        
        return datetime.utcnow() + timedelta(minutes=estimated_minutes)
        
    async def _coordinate_incident_response(self, incident: ComplexIncident):
        """Coordinate the complete incident response process."""
        try:
            # Phase 1: Initial assessment and task prioritization
            await self._initial_assessment(incident)
            
            # Phase 2: Execute coordination tasks
            await self._execute_coordination_tasks(incident)
            
            # Phase 3: Monitor progress and handle escalations
            await self._monitor_and_escalate(incident)
            
            # Phase 4: Resolution and post-incident activities
            await self._finalize_incident(incident)
            
        except Exception as e:
            logger.error(f"Error coordinating incident {incident.incident_id}: {e}")
            await self._handle_coordination_failure(incident, str(e))
            
    async def _initial_assessment(self, incident: ComplexIncident):
        """Perform initial incident assessment and setup."""
        # Log initial assessment
        incident.coordination_events.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "initial_assessment",
            "data": {
                "affected_systems_count": len(incident.affected_systems),
                "total_tasks": len(incident.coordination_tasks),
                "severity": incident.severity.value,
                "estimated_resolution": incident.estimated_resolution_time.isoformat() if incident.estimated_resolution_time else None
            }
        })
        
        # Simulate assessment time
        await asyncio.sleep(2)
        
        logger.info(f"Completed initial assessment for incident: {incident.incident_id}")
        
    async def _execute_coordination_tasks(self, incident: ComplexIncident):
        """Execute coordination tasks with proper sequencing and dependencies."""
        # Sort tasks by priority (highest first)
        sorted_tasks = sorted(incident.coordination_tasks, key=lambda t: t.priority, reverse=True)
        
        # Execute high-priority tasks first
        high_priority_tasks = [t for t in sorted_tasks if t.priority >= 8]
        medium_priority_tasks = [t for t in sorted_tasks if 6 <= t.priority < 8]
        low_priority_tasks = [t for t in sorted_tasks if t.priority < 6]
        
        # Execute in phases
        await self._execute_task_batch(incident, high_priority_tasks, "high_priority")
        await self._execute_task_batch(incident, medium_priority_tasks, "medium_priority")
        await self._execute_task_batch(incident, low_priority_tasks, "low_priority")
        
    async def _execute_task_batch(self, incident: ComplexIncident, tasks: List[CoordinationTask], batch_name: str):
        """Execute a batch of tasks concurrently."""
        if not tasks:
            return
            
        # Start all tasks in the batch
        task_executions = []
        for task in tasks:
            task_executions.append(self._execute_single_task(incident, task))
            
        # Wait for all tasks to complete
        await asyncio.gather(*task_executions)
        
        # Log batch completion
        incident.coordination_events.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "task_batch_completed",
            "data": {
                "batch_name": batch_name,
                "tasks_completed": len(tasks),
                "agents_involved": list(set(task.assigned_agent for task in tasks))
            }
        })
        
    async def _execute_single_task(self, incident: ComplexIncident, task: CoordinationTask):
        """Execute a single coordination task."""
        task.status = "in_progress"
        task.started_at = datetime.utcnow()
        
        # Simulate task execution time
        execution_time = task.estimated_duration_minutes / 10  # Scale down for demo
        await asyncio.sleep(execution_time)
        
        # Simulate task progress
        for progress in [25, 50, 75, 100]:
            task.progress_percentage = progress
            await asyncio.sleep(execution_time / 4)
            
        # Complete task
        task.status = "completed"
        task.completed_at = datetime.utcnow()
        task.progress_percentage = 100.0
        
        # Log task completion
        incident.coordination_events.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "task_completed",
            "data": {
                "task_id": task.task_id,
                "task_title": task.title,
                "assigned_agent": task.assigned_agent,
                "duration_minutes": (task.completed_at - task.started_at).total_seconds() / 60,
                "success": True
            }
        })    a
sync def _monitor_and_escalate(self, incident: ComplexIncident):
        """Monitor incident progress and handle escalations."""
        monitoring_duration = 300  # 5 minutes of monitoring
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).total_seconds() < monitoring_duration:
            # Check if escalation is needed
            if await self._should_escalate(incident):
                await self._escalate_incident(incident)
                
            # Update system health scores
            await self._update_system_health(incident)
            
            # Check for task failures or delays
            await self._handle_task_issues(incident)
            
            await asyncio.sleep(30)  # Check every 30 seconds
            
    async def _should_escalate(self, incident: ComplexIncident) -> bool:
        """Determine if incident should be escalated."""
        current_time = datetime.utcnow()
        
        # Check if we're past estimated resolution time
        if (incident.estimated_resolution_time and 
            current_time > incident.estimated_resolution_time):
            return True
            
        # Check if critical tasks are failing
        critical_tasks = [t for t in incident.coordination_tasks if t.priority >= 9]
        failed_critical_tasks = [t for t in critical_tasks if t.status == "failed"]
        
        if len(failed_critical_tasks) > 0:
            return True
            
        # Check if too many systems are still affected
        degraded_systems = [s for s in incident.affected_systems 
                          if s.status in [SystemStatus.MAJOR_OUTAGE, SystemStatus.COMPLETE_OUTAGE]]
        
        if len(degraded_systems) > len(incident.affected_systems) * 0.5:
            return True
            
        return False
        
    async def _escalate_incident(self, incident: ComplexIncident):
        """Escalate the incident to higher management level."""
        incident.escalation_level += 1
        
        # Add additional resources
        additional_tasks = await self._generate_escalation_tasks(incident)
        incident.coordination_tasks.extend(additional_tasks)
        
        # Update resource allocation
        incident.resource_allocation["escalation_level"] = incident.escalation_level
        incident.resource_allocation["additional_resources"] = len(additional_tasks)
        
        # Log escalation
        incident.coordination_events.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "incident_escalated",
            "data": {
                "new_escalation_level": incident.escalation_level,
                "reason": "Resolution time exceeded or critical failures detected",
                "additional_tasks": len(additional_tasks)
            }
        })
        
        logger.warning(f"Escalated incident {incident.incident_id} to level {incident.escalation_level}")
        
    async def _generate_escalation_tasks(self, incident: ComplexIncident) -> List[CoordinationTask]:
        """Generate additional tasks for escalated incidents."""
        escalation_tasks = [
            CoordinationTask(
                task_id=str(uuid.uuid4()),
                title="Engage Senior Technical Leadership",
                description="Bring in senior technical experts for complex problem resolution",
                assigned_agent="incident_commander",
                required_capabilities=[AgentCapability.COMMUNICATION_MANAGEMENT],
                priority=10,
                estimated_duration_minutes=15,
                dependencies=[],
                status="pending",
                created_at=datetime.utcnow(),
                metadata={"task_type": "escalation", "escalation_level": incident.escalation_level}
            ),
            CoordinationTask(
                task_id=str(uuid.uuid4()),
                title="Implement Emergency Procedures",
                description="Execute emergency response procedures for critical systems",
                assigned_agent="network_specialist",
                required_capabilities=[AgentCapability.RESOURCE_PROVISIONING, AgentCapability.NETWORK_ANALYSIS],
                priority=10,
                estimated_duration_minutes=30,
                dependencies=[],
                status="pending",
                created_at=datetime.utcnow(),
                metadata={"task_type": "emergency_response", "escalation_level": incident.escalation_level}
            )
        ]
        
        return escalation_tasks
        
    async def _update_system_health(self, incident: ComplexIncident):
        """Update system health scores based on recovery progress."""
        for system in incident.affected_systems:
            # Simulate gradual recovery
            if system.status != SystemStatus.OPERATIONAL:
                # Check if related tasks are completed
                related_tasks = [t for t in incident.coordination_tasks 
                               if t.metadata.get("system_id") == system.component_id and t.status == "completed"]
                
                if related_tasks:
                    # Improve health based on completed tasks
                    improvement = len(related_tasks) * 0.1
                    system.health_score = min(1.0, system.health_score + improvement)
                    
                    # Update status based on health
                    if system.health_score > 0.9:
                        system.status = SystemStatus.OPERATIONAL
                    elif system.health_score > 0.7:
                        system.status = SystemStatus.DEGRADED
                    elif system.health_score > 0.5:
                        system.status = SystemStatus.PARTIAL_OUTAGE
                        
                system.last_check = datetime.utcnow()
                
    async def _handle_task_issues(self, incident: ComplexIncident):
        """Handle task failures and delays."""
        current_time = datetime.utcnow()
        
        for task in incident.coordination_tasks:
            if task.status == "in_progress" and task.started_at:
                # Check for task timeout
                elapsed_minutes = (current_time - task.started_at).total_seconds() / 60
                if elapsed_minutes > task.estimated_duration_minutes * 2:  # 2x timeout
                    # Mark task as failed and reassign
                    task.status = "failed"
                    
                    # Create replacement task
                    replacement_task = CoordinationTask(
                        task_id=str(uuid.uuid4()),
                        title=f"RETRY: {task.title}",
                        description=f"Retry failed task: {task.description}",
                        assigned_agent=self._assign_task_to_agent(task),
                        required_capabilities=task.required_capabilities,
                        priority=task.priority + 1,  # Higher priority for retry
                        estimated_duration_minutes=task.estimated_duration_minutes,
                        dependencies=task.dependencies,
                        status="pending",
                        created_at=datetime.utcnow(),
                        metadata={**task.metadata, "retry_of": task.task_id}
                    )
                    
                    incident.coordination_tasks.append(replacement_task)
                    
                    # Log task failure and retry
                    incident.coordination_events.append({
                        "timestamp": datetime.utcnow().isoformat(),
                        "event_type": "task_failed_and_retried",
                        "data": {
                            "failed_task_id": task.task_id,
                            "retry_task_id": replacement_task.task_id,
                            "reason": "timeout",
                            "new_agent": replacement_task.assigned_agent
                        }
                    })
                    
    async def _finalize_incident(self, incident: ComplexIncident):
        """Finalize incident resolution and cleanup."""
        # Check if all systems are operational
        all_operational = all(system.status == SystemStatus.OPERATIONAL for system in incident.affected_systems)
        
        if all_operational:
            incident.status = "resolved"
            incident.actual_resolution_time = datetime.utcnow()
            
            # Calculate resolution metrics
            resolution_duration = (incident.actual_resolution_time - incident.start_time).total_seconds() / 60
            estimated_duration = (incident.estimated_resolution_time - incident.start_time).total_seconds() / 60 if incident.estimated_resolution_time else 0
            
            incident.metadata.update({
                "resolution_duration_minutes": resolution_duration,
                "estimated_duration_minutes": estimated_duration,
                "resolution_efficiency": min(1.0, estimated_duration / resolution_duration) if resolution_duration > 0 else 1.0,
                "tasks_completed": len([t for t in incident.coordination_tasks if t.status == "completed"]),
                "tasks_failed": len([t for t in incident.coordination_tasks if t.status == "failed"]),
                "final_escalation_level": incident.escalation_level
            })
            
            # Log resolution
            incident.coordination_events.append({
                "timestamp": datetime.utcnow().isoformat(),
                "event_type": "incident_resolved",
                "data": {
                    "resolution_duration_minutes": resolution_duration,
                    "tasks_completed": incident.metadata["tasks_completed"],
                    "escalation_level": incident.escalation_level,
                    "efficiency_score": incident.metadata["resolution_efficiency"]
                }
            })
            
            # Move to history
            self.incident_history.append(incident)
            del self.active_incidents[incident.incident_id]
            
            logger.info(f"Resolved incident: {incident.incident_id}")
        else:
            # Continue monitoring if not fully resolved
            await asyncio.sleep(60)
            await self._monitor_and_escalate(incident)
            
    async def _handle_coordination_failure(self, incident: ComplexIncident, error_message: str):
        """Handle coordination failures."""
        incident.status = "failed"
        incident.coordination_events.append({
            "timestamp": datetime.utcnow().isoformat(),
            "event_type": "coordination_failed",
            "data": {
                "error_message": error_message,
                "escalation_level": incident.escalation_level
            }
        })
        
    async def get_incident_status(self, incident_id: str) -> Optional[Dict[str, Any]]:
        """Get current status of an incident."""
        incident = self.active_incidents.get(incident_id)
        if not incident:
            # Check history
            incident = next((i for i in self.incident_history if i.incident_id == incident_id), None)
            
        if incident:
            completed_tasks = len([t for t in incident.coordination_tasks if t.status == "completed"])
            total_tasks = len(incident.coordination_tasks)
            
            return {
                "incident_id": incident_id,
                "title": incident.title,
                "status": incident.status,
                "severity": incident.severity.value,
                "escalation_level": incident.escalation_level,
                "affected_systems": len(incident.affected_systems),
                "tasks_completed": completed_tasks,
                "total_tasks": total_tasks,
                "progress_percentage": (completed_tasks / total_tasks * 100) if total_tasks > 0 else 0,
                "coordination_events": len(incident.coordination_events),
                "elapsed_time_minutes": (datetime.utcnow() - incident.start_time).total_seconds() / 60
            }
        return None
        
    async def get_coordinator_summary(self) -> Dict[str, Any]:
        """Get coordinator summary."""
        return {
            "coordinator_id": self.coordinator_id,
            "active_incidents": len(self.active_incidents),
            "resolved_incidents": len(self.incident_history),
            "total_coordination_events": sum(len(i.coordination_events) for i in list(self.active_incidents.values()) + self.incident_history),
            "agent_capabilities": {agent: len(caps) for agent, caps in self.agent_capabilities.items()},
            "system_topology_size": len(self.system_topology),
            "configuration": self.config
        }


# Global complex incident coordinator instance
complex_incident_coordinator = ComplexIncidentCoordinator()