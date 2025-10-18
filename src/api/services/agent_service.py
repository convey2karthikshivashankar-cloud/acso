"""
Agent service for ACSO API Gateway.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from uuid import uuid4

from ..models.agent import (
    AgentInfo, AgentCreateRequest, AgentUpdateRequest, AgentActionRequest,
    AgentActionResponse, AgentSummary, AgentStatistics, AgentListFilters,
    AgentType, AgentStatus, AgentConfiguration, AgentMetrics, AgentHealth,
    AgentLogEntry, AgentTask, DEFAULT_CONFIGURATIONS
)
from ..models.responses import ErrorCode
from ..utils.errors import (
    ResourceNotFoundException, ValidationException, BusinessRuleException
)
from ..websocket.router import notify_agents_update, notify_system_alert
from ...shared.coordination import AgentCoordinator
from ...agents.supervisor_agent import SupervisorAgent
from ...agents.threat_hunter_agent import ThreatHunterAgent
from ...agents.incident_response_agent import IncidentResponseAgent
from ...agents.service_orchestration_agent import ServiceOrchestrationAgent
from ...agents.financial_intelligence_agent import FinancialIntelligenceAgent

logger = logging.getLogger(__name__)


class AgentService:
    """Service for managing ACSO agents with real-time updates."""
    
    def __init__(self):
        self.coordinator = AgentCoordinator()
        self.agents: Dict[str, AgentInfo] = {}
        self.agent_instances: Dict[str, Any] = {}
        self.agent_tasks: Dict[str, List[AgentTask]] = {}
        self.agent_logs: Dict[str, List[AgentLogEntry]] = {}
        
        # Real-time monitoring
        self._monitoring_tasks: Dict[str, asyncio.Task] = {}
        self._status_update_interval = 5  # seconds
        
        # Initialize default agents
        self._initialize_default_agents()
        
        # Start background monitoring
        asyncio.create_task(self._start_monitoring())
    
    def _initialize_default_agents(self):
        """Initialize default system agents."""
        default_agents = [
            {
                "id": "supervisor_001",
                "name": "System Supervisor",
                "type": AgentType.SUPERVISOR,
                "description": "Main system supervisor agent",
                "instance_class": SupervisorAgent
            },
            {
                "id": "threat_hunter_001",
                "name": "Threat Hunter",
                "type": AgentType.THREAT_HUNTER,
                "description": "Primary threat detection agent",
                "instance_class": ThreatHunterAgent
            },
            {
                "id": "incident_response_001",
                "name": "Incident Response",
                "type": AgentType.INCIDENT_RESPONSE,
                "description": "Primary incident response agent",
                "instance_class": IncidentResponseAgent
            },
            {
                "id": "service_orchestration_001",
                "name": "Service Orchestrator",
                "type": AgentType.SERVICE_ORCHESTRATION,
                "description": "Service orchestration agent",
                "instance_class": ServiceOrchestrationAgent
            },
            {
                "id": "financial_intelligence_001",
                "name": "Financial Intelligence",
                "type": AgentType.FINANCIAL_INTELLIGENCE,
                "description": "Financial analysis agent",
                "instance_class": FinancialIntelligenceAgent
            }
        ]
        
        for agent_data in default_agents:
            agent_id = agent_data["id"]
            agent_type = agent_data["type"]
            
            # Create agent info
            agent_info = AgentInfo(
                id=agent_id,
                name=agent_data["name"],
                type=agent_type,
                version="1.0.0",
                description=agent_data["description"],
                status=AgentStatus.STOPPED,
                configuration=DEFAULT_CONFIGURATIONS[agent_type],
                metrics=AgentMetrics(),
                health=AgentHealth(
                    status=AgentStatus.STOPPED,
                    healthy=False,
                    checks={},
                    issues=[]
                ),
                created_at=datetime.utcnow(),
                tags=["system", "default"]
            )
            
            self.agents[agent_id] = agent_info
            
            # Initialize agent instance
            try:
                instance = agent_data["instance_class"]()
                self.agent_instances[agent_id] = instance
                logger.info(f"Initialized agent: {agent_id}")
            except Exception as e:
                logger.error(f"Failed to initialize agent {agent_id}: {e}")
                agent_info.health.issues.append(f"Initialization failed: {e}")
            
            # Initialize empty task and log lists
            self.agent_tasks[agent_id] = []
            self.agent_logs[agent_id] = []
    
    async def _start_monitoring(self):
        """Start background monitoring for all agents."""
        logger.info("Starting agent monitoring service")
        
        while True:
            try:
                await asyncio.sleep(self._status_update_interval)
                await self._monitor_all_agents()
            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(10)  # Wait longer on error
    
    async def _monitor_all_agents(self):
        """Monitor all agents and send real-time updates."""
        for agent_id, agent in self.agents.items():
            try:
                # Update agent metrics
                await self._update_agent_metrics(agent_id)
                
                # Check for status changes
                old_status = agent.status
                old_healthy = agent.health.healthy
                
                # Perform health check
                await self._perform_health_check(agent_id)
                
                # Send real-time updates if status changed
                if (agent.status != old_status or 
                    agent.health.healthy != old_healthy):
                    await self._broadcast_agent_status_update(agent_id)
                
                # Send metrics update periodically
                if agent.status == AgentStatus.RUNNING:
                    await self._broadcast_agent_metrics_update(agent_id)
                    
            except Exception as e:
                logger.error(f"Error monitoring agent {agent_id}: {e}")
    
    async def _broadcast_agent_status_update(self, agent_id: str):
        """Broadcast agent status update via WebSocket."""
        agent = self.agents.get(agent_id)
        if not agent:
            return
        
        update_data = {
            "agent_id": agent_id,
            "status": agent.status.value,
            "healthy": agent.health.healthy,
            "last_heartbeat": agent.health.last_heartbeat.isoformat() if agent.health.last_heartbeat else None,
            "issues": agent.health.issues,
            "uptime": agent.health.uptime,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await notify_agents_update(update_data)
        logger.debug(f"Broadcasted status update for agent {agent_id}: {agent.status}")
    
    async def _broadcast_agent_metrics_update(self, agent_id: str):
        """Broadcast agent metrics update via WebSocket."""
        agent = self.agents.get(agent_id)
        if not agent:
            return
        
        metrics_data = {
            "agent_id": agent_id,
            "metrics": {
                "tasks_completed": agent.metrics.tasks_completed,
                "tasks_failed": agent.metrics.tasks_failed,
                "average_execution_time": agent.metrics.average_execution_time,
                "cpu_usage_percent": agent.metrics.cpu_usage_percent,
                "memory_usage_mb": agent.metrics.memory_usage_mb,
                "error_rate": agent.metrics.error_rate,
                "throughput_per_minute": agent.metrics.throughput_per_minute,
                "last_activity": agent.metrics.last_activity.isoformat() if agent.metrics.last_activity else None,
            },
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await notify_agents_update(metrics_data)
    
    async def _broadcast_agent_log_entry(self, agent_id: str, log_entry: AgentLogEntry):
        """Broadcast new log entry via WebSocket."""
        log_data = {
            "agent_id": agent_id,
            "log_entry": {
                "timestamp": log_entry.timestamp.isoformat(),
                "level": log_entry.level,
                "message": log_entry.message,
                "component": log_entry.component,
                "task_id": log_entry.task_id,
                "metadata": log_entry.metadata,
            }
        }
        
        await notify_agents_update(log_data)
    
    async def _broadcast_agent_task_update(self, agent_id: str, task: AgentTask):
        """Broadcast task update via WebSocket."""
        task_data = {
            "agent_id": agent_id,
            "task": {
                "id": task.id,
                "type": task.type,
                "status": task.status,
                "priority": task.priority,
                "progress": task.progress,
                "created_at": task.created_at.isoformat(),
                "started_at": task.started_at.isoformat() if task.started_at else None,
                "completed_at": task.completed_at.isoformat() if task.completed_at else None,
                "error": task.error,
            }
        }
        
        await notify_agents_update(task_data)
    
    async def list_agents(
        self,
        filters: Optional[AgentListFilters] = None,
        limit: int = 100,
        offset: int = 0
    ) -> Tuple[List[AgentSummary], int]:
        """List agents with optional filtering."""
        agents = list(self.agents.values())
        
        # Apply filters
        if filters:
            if filters.type:
                agents = [a for a in agents if a.type == filters.type]
            if filters.status:
                agents = [a for a in agents if a.status == filters.status]
            if filters.healthy is not None:
                agents = [a for a in agents if a.health.healthy == filters.healthy]
            if filters.name_contains:
                agents = [a for a in agents if filters.name_contains.lower() in a.name.lower()]
            if filters.tags:
                agents = [a for a in agents if any(tag in a.tags for tag in filters.tags)]
        
        total = len(agents)
        
        # Apply pagination
        paginated_agents = agents[offset:offset + limit]
        
        # Convert to summaries
        summaries = [
            AgentSummary(
                id=agent.id,
                name=agent.name,
                type=agent.type,
                status=agent.status,
                healthy=agent.health.healthy,
                tasks_completed=agent.metrics.tasks_completed,
                error_rate=agent.metrics.error_rate,
                uptime=agent.metrics.uptime_seconds,
                last_activity=agent.metrics.last_activity,
                tags=agent.tags
            )
            for agent in paginated_agents
        ]
        
        return summaries, total
    
    async def get_agent(self, agent_id: str) -> AgentInfo:
        """Get detailed agent information."""
        if agent_id not in self.agents:
            raise ResourceNotFoundException("Agent", agent_id)
        
        agent = self.agents[agent_id]
        
        # Update real-time metrics
        await self._update_agent_metrics(agent_id)
        
        return agent
    
    async def create_agent(self, request: AgentCreateRequest, creator_id: str) -> AgentInfo:
        """Create a new agent."""
        # Check if name is already taken
        for existing_agent in self.agents.values():
            if existing_agent.name == request.name:
                raise BusinessRuleException(f"Agent name '{request.name}' already exists")
        
        # Generate unique ID
        agent_id = f"{request.type.value}_{uuid4().hex[:8]}"
        
        # Use default configuration if not provided
        configuration = request.configuration or DEFAULT_CONFIGURATIONS[request.type]
        
        # Create agent info
        agent_info = AgentInfo(
            id=agent_id,
            name=request.name,
            type=request.type,
            version="1.0.0",
            description=request.description,
            status=AgentStatus.STOPPED,
            configuration=configuration,
            metrics=AgentMetrics(),
            health=AgentHealth(
                status=AgentStatus.STOPPED,
                healthy=False,
                checks={},
                issues=[]
            ),
            created_at=datetime.utcnow(),
            tags=request.tags
        )
        
        # Store agent
        self.agents[agent_id] = agent_info
        self.agent_tasks[agent_id] = []
        self.agent_logs[agent_id] = []
        
        # Initialize agent instance
        try:
            instance = self._create_agent_instance(request.type)
            self.agent_instances[agent_id] = instance
            
            # Auto-start if requested
            if request.auto_start:
                await self.start_agent(agent_id)
                
        except Exception as e:
            logger.error(f"Failed to create agent instance {agent_id}: {e}")
            agent_info.health.issues.append(f"Instance creation failed: {e}")
        
        # Broadcast agent creation
        await self._broadcast_agent_status_update(agent_id)
        
        logger.info(f"Created agent: {agent_id} ({request.name})")
        return agent_info
    
    async def start_agent(self, agent_id: str) -> AgentActionResponse:
        """Start an agent with real-time status updates."""
        if agent_id not in self.agents:
            raise ResourceNotFoundException("Agent", agent_id)
        
        agent = self.agents[agent_id]
        
        if agent.status == AgentStatus.RUNNING:
            return AgentActionResponse(
                action="start",
                success=False,
                message="Agent is already running",
                execution_time=0.0
            )
        
        start_time = datetime.utcnow()
        
        try:
            # Update status to starting
            agent.status = AgentStatus.STARTING
            agent.health.status = AgentStatus.STARTING
            await self._broadcast_agent_status_update(agent_id)
            
            # Start agent instance
            if agent_id in self.agent_instances:
                instance = self.agent_instances[agent_id]
                await self._start_agent_instance(instance)
            
            # Update status to running
            agent.status = AgentStatus.RUNNING
            agent.health.status = AgentStatus.RUNNING
            agent.health.healthy = True
            agent.health.last_heartbeat = datetime.utcnow()
            agent.health.issues = []
            
            # Update metrics
            agent.metrics.last_activity = datetime.utcnow()
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            # Log and broadcast
            await self._add_log_entry(agent_id, "INFO", f"Agent {agent.name} started successfully")
            await self._broadcast_agent_status_update(agent_id)
            
            return AgentActionResponse(
                action="start",
                success=True,
                message=f"Agent {agent.name} started successfully",
                execution_time=execution_time
            )
            
        except Exception as e:
            agent.status = AgentStatus.ERROR
            agent.health.status = AgentStatus.ERROR
            agent.health.healthy = False
            agent.health.issues.append(f"Start failed: {str(e)}")
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            await self._add_log_entry(agent_id, "ERROR", f"Failed to start agent {agent.name}: {e}")
            await self._broadcast_agent_status_update(agent_id)
            
            return AgentActionResponse(
                action="start",
                success=False,
                message=f"Failed to start agent: {str(e)}",
                execution_time=execution_time
            )
    
    async def stop_agent(self, agent_id: str) -> AgentActionResponse:
        """Stop an agent with real-time status updates."""
        if agent_id not in self.agents:
            raise ResourceNotFoundException("Agent", agent_id)
        
        agent = self.agents[agent_id]
        
        if agent.status == AgentStatus.STOPPED:
            return AgentActionResponse(
                action="stop",
                success=False,
                message="Agent is already stopped",
                execution_time=0.0
            )
        
        start_time = datetime.utcnow()
        
        try:
            # Update status to stopping
            agent.status = AgentStatus.STOPPING
            agent.health.status = AgentStatus.STOPPING
            await self._broadcast_agent_status_update(agent_id)
            
            # Stop agent instance
            if agent_id in self.agent_instances:
                instance = self.agent_instances[agent_id]
                await self._stop_agent_instance(instance)
            
            # Update status to stopped
            agent.status = AgentStatus.STOPPED
            agent.health.status = AgentStatus.STOPPED
            agent.health.healthy = False
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            await self._add_log_entry(agent_id, "INFO", f"Agent {agent.name} stopped successfully")
            await self._broadcast_agent_status_update(agent_id)
            
            return AgentActionResponse(
                action="stop",
                success=True,
                message=f"Agent {agent.name} stopped successfully",
                execution_time=execution_time
            )
            
        except Exception as e:
            agent.status = AgentStatus.ERROR
            agent.health.status = AgentStatus.ERROR
            agent.health.issues.append(f"Stop failed: {str(e)}")
            
            execution_time = (datetime.utcnow() - start_time).total_seconds()
            
            await self._add_log_entry(agent_id, "ERROR", f"Failed to stop agent {agent.name}: {e}")
            await self._broadcast_agent_status_update(agent_id)
            
            return AgentActionResponse(
                action="stop",
                success=False,
                message=f"Failed to stop agent: {str(e)}",
                execution_time=execution_time
            )
    
    # Helper methods (continuing from previous implementation)
    
    def _create_agent_instance(self, agent_type: AgentType):
        """Create an agent instance based on type."""
        instance_classes = {
            AgentType.SUPERVISOR: SupervisorAgent,
            AgentType.THREAT_HUNTER: ThreatHunterAgent,
            AgentType.INCIDENT_RESPONSE: IncidentResponseAgent,
            AgentType.SERVICE_ORCHESTRATION: ServiceOrchestrationAgent,
            AgentType.FINANCIAL_INTELLIGENCE: FinancialIntelligenceAgent
        }
        
        instance_class = instance_classes.get(agent_type)
        if not instance_class:
            raise BusinessRuleException(f"Unknown agent type: {agent_type}")
        
        return instance_class()
    
    async def _start_agent_instance(self, instance):
        """Start an agent instance."""
        if hasattr(instance, 'start'):
            await instance.start()
    
    async def _stop_agent_instance(self, instance):
        """Stop an agent instance."""
        if hasattr(instance, 'stop'):
            await instance.stop()
    
    async def _update_agent_metrics(self, agent_id: str):
        """Update agent metrics with current values."""
        if agent_id not in self.agents:
            return
        
        agent = self.agents[agent_id]
        
        # Update metrics (placeholder - would get real metrics from agent instance)
        if agent.status == AgentStatus.RUNNING:
            agent.metrics.last_activity = datetime.utcnow()
            agent.health.last_heartbeat = datetime.utcnow()
            
            # Calculate uptime
            if agent.created_at:
                uptime = (datetime.utcnow() - agent.created_at).total_seconds()
                agent.metrics.uptime_seconds = int(uptime)
                agent.health.uptime = int(uptime)
    
    async def _perform_health_check(self, agent_id: str) -> Dict[str, Any]:
        """Perform health check on agent."""
        agent = self.agents[agent_id]
        
        checks = {
            "status": agent.status == AgentStatus.RUNNING,
            "heartbeat": agent.health.last_heartbeat is not None,
            "configuration": len(agent.health.issues) == 0,
            "connectivity": True  # Placeholder
        }
        
        # Update health status
        agent.health.checks = checks
        agent.health.healthy = all(checks.values())
        agent.health.last_heartbeat = datetime.utcnow()
        
        if not agent.health.healthy:
            failed_checks = [check for check, passed in checks.items() if not passed]
            agent.health.issues = [f"Failed health check: {check}" for check in failed_checks]
        else:
            agent.health.issues = []
        
        return {
            "agent_id": agent_id,
            "healthy": agent.health.healthy,
            "checks": checks,
            "issues": agent.health.issues
        }
    
    async def _add_log_entry(self, agent_id: str, level: str, message: str, **metadata):
        """Add a log entry for an agent and broadcast it."""
        if agent_id not in self.agent_logs:
            self.agent_logs[agent_id] = []
        
        log_entry = AgentLogEntry(
            timestamp=datetime.utcnow(),
            level=level,
            message=message,
            component="agent_service",
            metadata=metadata
        )
        
        self.agent_logs[agent_id].append(log_entry)
        
        # Keep only last 1000 log entries per agent
        if len(self.agent_logs[agent_id]) > 1000:
            self.agent_logs[agent_id] = self.agent_logs[agent_id][-1000:]
        
        # Broadcast log entry
        await self._broadcast_agent_log_entry(agent_id, log_entry)