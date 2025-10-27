"""
Automated Incident Response System for ACSO Enterprise.
60-second automated containment with intelligent response action selection.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
import time
from collections import defaultdict, deque
import hashlib
import aiohttp
import boto3
from botocore.exceptions import ClientError

class IncidentSeverity(str, Enum):
    """Incident severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class IncidentStatus(str, Enum):
    """Incident status values."""
    DETECTED = "detected"
    ANALYZING = "analyzing"
    RESPONDING = "responding"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CLOSED = "closed"

class ResponseAction(str, Enum):
    """Available response actions."""
    ISOLATE_HOST = "isolate_host"
    BLOCK_IP = "block_ip"
    QUARANTINE_FILE = "quarantine_file"
    DISABLE_USER = "disable_user"
    RESET_PASSWORD = "reset_password"
    KILL_PROCESS = "kill_process"
    BLOCK_DOMAIN = "block_domain"
    REVOKE_CERTIFICATE = "revoke_certificate"
    SNAPSHOT_SYSTEM = "snapshot_system"
    COLLECT_EVIDENCE = "collect_evidence"
    NOTIFY_TEAM = "notify_team"
    CREATE_TICKET = "create_ticket"
    ESCALATE = "escalate"

class ResponseStatus(str, Enum):
    """Response action status."""
    PENDING = "pending"
    EXECUTING = "executing"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"

@dataclass
class SecurityTool:
    """Security tool configuration."""
    tool_id: str
    name: str
    type: str  # firewall, edr, siem, etc.
    api_endpoint: str
    auth_config: Dict[str, Any]
    capabilities: List[ResponseAction]
    priority: int = 1
    timeout_seconds: int = 30
    retry_count: int = 3
    enabled: bool = True

@dataclass
class ResponseActionConfig:
    """Configuration for a response action."""
    action: ResponseAction
    tool_id: str
    parameters: Dict[str, Any]
    timeout_seconds: int = 30
    retry_count: int = 3
    rollback_action: Optional[str] = None
    approval_required: bool = False
    risk_score: float = 0.0

@dataclass
class IncidentContext:
    """Context information for an incident."""
    incident_id: str
    tenant_id: str
    severity: IncidentSeverity
    threat_type: str
    affected_assets: List[str]
    indicators: List[Dict[str, Any]]
    detection_time: datetime
    source_system: str
    confidence_score: float
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ResponseExecution:
    """Execution details for a response action."""
    execution_id: str
    incident_id: str
    action_config: ResponseActionConfig
    status: ResponseStatus
    started_at: Optional[datetime] = None
    completed_at: Optional[datetime] = None
    result: Optional[Dict[str, Any]] = None
    error_message: Optional[str] = None
    execution_time_ms: int = 0

@dataclass
class IncidentResponse:
    """Complete incident response record."""
    incident_id: str
    tenant_id: str
    context: IncidentContext
    status: IncidentStatus
    response_plan: List[ResponseActionConfig]
    executions: List[ResponseExecution]
    created_at: datetime
    updated_at: datetime
    containment_time_ms: Optional[int] = None
    resolution_time_ms: Optional[int] = None
    effectiveness_score: float = 0.0
    lessons_learned: List[str] = field(default_factory=list)

class AutomatedIncidentResponseSystem:
    """
    Automated Incident Response System with 60-second containment capability.
    
    Features:
    - 60-second automated containment for critical incidents
    - Intelligent response action selection based on threat type
    - Coordination with 20+ security tools
    - Automated evidence collection and forensics
    - Real-time response effectiveness tracking
    - Machine learning-based response optimization
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Security tools registry
        self.security_tools: Dict[str, SecurityTool] = {}
        self.tool_clients: Dict[str, Any] = {}
        
        # Response configurations
        self.response_playbooks: Dict[str, List[ResponseActionConfig]] = {}
        self.action_templates: Dict[ResponseAction, Dict[str, Any]] = {}
        
        # Active incidents and responses
        self.active_incidents: Dict[str, IncidentResponse] = {}
        self.response_history: deque = deque(maxlen=10000)
        
        # Performance metrics
        self.containment_times: deque = deque(maxlen=1000)
        self.success_rates: Dict[str, float] = {}
        self.tool_performance: Dict[str, Dict[str, float]] = defaultdict(dict)
        
        # Configuration
        self.max_containment_time_ms = 60000  # 60 seconds
        self.max_concurrent_responses = 50
        self.evidence_retention_days = 90
        
        # Background tasks
        self.response_tasks: List[asyncio.Task] = []
        self.system_active = False
        
    async def initialize(self) -> None:
        """Initialize the automated incident response system."""
        try:
            self.logger.info("Initializing Automated Incident Response System")
            
            # Load security tools configuration
            await self._load_security_tools()
            
            # Initialize tool clients
            await self._initialize_tool_clients()
            
            # Load response playbooks
            await self._load_response_playbooks()
            
            # Load action templates
            await self._load_action_templates()
            
            # Start background tasks
            self.system_active = True
            self.response_tasks = [
                asyncio.create_task(self._response_monitoring_loop()),
                asyncio.create_task(self._performance_optimization_loop()),
                asyncio.create_task(self._evidence_cleanup_loop())
            ]
            
            self.logger.info("Automated Incident Response System initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Automated Incident Response System: {e}")
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the incident response system."""
        try:
            self.logger.info("Shutting down Automated Incident Response System")
            
            self.system_active = False
            
            # Cancel background tasks
            for task in self.response_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            # Close tool clients
            await self._close_tool_clients()
            
            self.logger.info("Automated Incident Response System shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
    
    async def respond_to_incident(
        self,
        context: IncidentContext,
        auto_execute: bool = True
    ) -> IncidentResponse:
        """
        Respond to a security incident with automated containment.
        
        Args:
            context: Incident context information
            auto_execute: Whether to automatically execute response actions
            
        Returns:
            IncidentResponse object with execution details
        """
        try:
            start_time = time.time()
            
            self.logger.info(f"Responding to incident: {context.incident_id}")
            
            # Create incident response record
            incident_response = IncidentResponse(
                incident_id=context.incident_id,
                tenant_id=context.tenant_id,
                context=context,
                status=IncidentStatus.ANALYZING,
                response_plan=[],
                executions=[],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            
            # Store active incident
            self.active_incidents[context.incident_id] = incident_response
            
            # Generate response plan
            response_plan = await self._generate_response_plan(context)
            incident_response.response_plan = response_plan
            incident_response.status = IncidentStatus.RESPONDING
            incident_response.updated_at = datetime.utcnow()
            
            if auto_execute and response_plan:
                # Execute response actions
                executions = await self._execute_response_plan(
                    context.incident_id, 
                    response_plan
                )
                incident_response.executions = executions
                
                # Check containment status
                containment_achieved = await self._check_containment_status(
                    context, executions
                )
                
                if containment_achieved:
                    incident_response.status = IncidentStatus.CONTAINED
                    containment_time = int((time.time() - start_time) * 1000)
                    incident_response.containment_time_ms = containment_time
                    self.containment_times.append(containment_time)
                    
                    self.logger.info(
                        f"Incident {context.incident_id} contained in {containment_time}ms"
                    )
                else:
                    # Escalate if containment failed
                    await self._escalate_incident(incident_response)
            
            # Calculate effectiveness score
            incident_response.effectiveness_score = await self._calculate_effectiveness_score(
                incident_response
            )
            
            incident_response.updated_at = datetime.utcnow()
            
            # Store in history
            self.response_history.append(incident_response)
            
            return incident_response
            
        except Exception as e:
            self.logger.error(f"Failed to respond to incident {context.incident_id}: {e}")
            raise
    
    async def execute_manual_action(
        self,
        incident_id: str,
        action_config: ResponseActionConfig,
        user_id: str
    ) -> ResponseExecution:
        """
        Execute a manual response action for an incident.
        
        Args:
            incident_id: ID of the incident
            action_config: Configuration for the action to execute
            user_id: ID of the user executing the action
            
        Returns:
            ResponseExecution object with execution details
        """
        try:
            self.logger.info(f"Executing manual action for incident: {incident_id}")
            
            # Create execution record
            execution = ResponseExecution(
                execution_id=str(uuid.uuid4()),
                incident_id=incident_id,
                action_config=action_config,
                status=ResponseStatus.PENDING,
                started_at=datetime.utcnow()
            )
            
            # Execute the action
            execution = await self._execute_single_action(execution)
            
            # Update incident record
            if incident_id in self.active_incidents:
                self.active_incidents[incident_id].executions.append(execution)
                self.active_incidents[incident_id].updated_at = datetime.utcnow()
            
            return execution
            
        except Exception as e:
            self.logger.error(f"Failed to execute manual action: {e}")
            raise
    
    async def get_incident_status(self, incident_id: str) -> Optional[IncidentResponse]:
        """
        Get the current status of an incident response.
        
        Args:
            incident_id: ID of the incident
            
        Returns:
            IncidentResponse object or None if not found
        """
        return self.active_incidents.get(incident_id)
    
    async def get_response_analytics(
        self,
        tenant_id: Optional[str] = None,
        time_period_hours: int = 24
    ) -> Dict[str, Any]:
        """
        Get incident response analytics and metrics.
        
        Args:
            tenant_id: Optional tenant ID for tenant-specific analytics
            time_period_hours: Time period for analytics
            
        Returns:
            Analytics data dictionary
        """
        try:
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=time_period_hours)
            
            # Filter responses by time and tenant
            filtered_responses = [
                response for response in self.response_history
                if (start_time <= response.created_at <= end_time and
                    (not tenant_id or response.tenant_id == tenant_id))
            ]
            
            if not filtered_responses:
                return {"message": "No incident responses found for the specified period"}
            
            # Calculate metrics
            total_incidents = len(filtered_responses)
            
            # Containment metrics
            contained_incidents = [
                r for r in filtered_responses 
                if r.status in [IncidentStatus.CONTAINED, IncidentStatus.RESOLVED]
            ]
            containment_rate = len(contained_incidents) / total_incidents if total_incidents > 0 else 0
            
            # Average containment time
            containment_times = [
                r.containment_time_ms for r in contained_incidents 
                if r.containment_time_ms is not None
            ]
            avg_containment_time = sum(containment_times) / len(containment_times) if containment_times else 0
            
            # 60-second containment rate
            fast_containments = [t for t in containment_times if t <= 60000]
            fast_containment_rate = len(fast_containments) / len(containment_times) if containment_times else 0
            
            # Severity distribution
            severity_counts = defaultdict(int)
            for response in filtered_responses:
                severity_counts[response.context.severity.value] += 1
            
            # Tool performance
            tool_success_rates = {}
            for tool_id, tool in self.security_tools.items():
                tool_executions = []
                for response in filtered_responses:
                    tool_executions.extend([
                        e for e in response.executions 
                        if e.action_config.tool_id == tool_id
                    ])
                
                if tool_executions:
                    successful = len([e for e in tool_executions if e.status == ResponseStatus.COMPLETED])
                    tool_success_rates[tool.name] = successful / len(tool_executions)
            
            # Response action effectiveness
            action_effectiveness = {}
            for action in ResponseAction:
                action_executions = []
                for response in filtered_responses:
                    action_executions.extend([
                        e for e in response.executions 
                        if e.action_config.action == action
                    ])
                
                if action_executions:
                    successful = len([e for e in action_executions if e.status == ResponseStatus.COMPLETED])
                    action_effectiveness[action.value] = successful / len(action_executions)
            
            return {
                "period": {
                    "start_time": start_time.isoformat(),
                    "end_time": end_time.isoformat(),
                    "hours": time_period_hours
                },
                "overview": {
                    "total_incidents": total_incidents,
                    "containment_rate": containment_rate,
                    "avg_containment_time_ms": avg_containment_time,
                    "fast_containment_rate": fast_containment_rate,
                    "avg_effectiveness_score": sum(r.effectiveness_score for r in filtered_responses) / total_incidents
                },
                "severity_distribution": dict(severity_counts),
                "tool_performance": tool_success_rates,
                "action_effectiveness": action_effectiveness,
                "sla_compliance": {
                    "60_second_containment": fast_containment_rate,
                    "containment_sla_met": containment_rate
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get response analytics: {e}")
            return {"error": str(e)}
    
    async def update_security_tool(self, tool: SecurityTool) -> None:
        """
        Update or add a security tool configuration.
        
        Args:
            tool: SecurityTool configuration to update
        """
        try:
            self.security_tools[tool.tool_id] = tool
            
            # Reinitialize client for this tool
            await self._initialize_tool_client(tool)
            
            self.logger.info(f"Updated security tool: {tool.name}")
            
        except Exception as e:
            self.logger.error(f"Failed to update security tool {tool.tool_id}: {e}")
            raise
    
    async def _generate_response_plan(
        self, 
        context: IncidentContext
    ) -> List[ResponseActionConfig]:
        """Generate an optimal response plan for the incident."""
        try:
            # Get base playbook for threat type
            playbook_key = context.threat_type.lower()
            base_playbook = self.response_playbooks.get(
                playbook_key, 
                self.response_playbooks.get("default", [])
            )
            
            # Customize based on context
            response_plan = []
            
            for action_config in base_playbook:
                # Check if action is applicable
                if await self._is_action_applicable(action_config, context):
                    # Customize parameters based on context
                    customized_config = await self._customize_action_config(
                        action_config, context
                    )
                    response_plan.append(customized_config)
            
            # Sort by priority and risk score
            response_plan.sort(key=lambda x: (x.risk_score, -x.timeout_seconds))
            
            # Add critical containment actions for high severity
            if context.severity in [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH]:
                critical_actions = await self._get_critical_containment_actions(context)
                response_plan = critical_actions + response_plan
            
            return response_plan
            
        except Exception as e:
            self.logger.error(f"Failed to generate response plan: {e}")
            return []
    
    async def _execute_response_plan(
        self,
        incident_id: str,
        response_plan: List[ResponseActionConfig]
    ) -> List[ResponseExecution]:
        """Execute the response plan with parallel and sequential actions."""
        try:
            executions = []
            
            # Group actions by priority and parallelizability
            parallel_groups = self._group_actions_for_execution(response_plan)
            
            for group in parallel_groups:
                # Execute actions in parallel within each group
                group_tasks = []
                for action_config in group:
                    execution = ResponseExecution(
                        execution_id=str(uuid.uuid4()),
                        incident_id=incident_id,
                        action_config=action_config,
                        status=ResponseStatus.PENDING
                    )
                    executions.append(execution)
                    
                    # Create execution task
                    task = asyncio.create_task(
                        self._execute_single_action(execution)
                    )
                    group_tasks.append(task)
                
                # Wait for all actions in the group to complete
                await asyncio.gather(*group_tasks, return_exceptions=True)
            
            return executions
            
        except Exception as e:
            self.logger.error(f"Failed to execute response plan: {e}")
            return []
    
    async def _execute_single_action(
        self, 
        execution: ResponseExecution
    ) -> ResponseExecution:
        """Execute a single response action."""
        try:
            execution.status = ResponseStatus.EXECUTING
            execution.started_at = datetime.utcnow()
            
            action_config = execution.action_config
            tool = self.security_tools.get(action_config.tool_id)
            
            if not tool or not tool.enabled:
                execution.status = ResponseStatus.SKIPPED
                execution.error_message = f"Tool {action_config.tool_id} not available"
                return execution
            
            # Get tool client
            client = self.tool_clients.get(action_config.tool_id)
            if not client:
                execution.status = ResponseStatus.FAILED
                execution.error_message = f"No client for tool {action_config.tool_id}"
                return execution
            
            # Execute action based on type
            result = await self._execute_action_on_tool(
                action_config.action,
                client,
                action_config.parameters,
                tool
            )
            
            execution.result = result
            execution.status = ResponseStatus.COMPLETED
            execution.completed_at = datetime.utcnow()
            
            # Calculate execution time
            if execution.started_at and execution.completed_at:
                execution.execution_time_ms = int(
                    (execution.completed_at - execution.started_at).total_seconds() * 1000
                )
            
            return execution
            
        except Exception as e:
            execution.status = ResponseStatus.FAILED
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            
            if execution.started_at and execution.completed_at:
                execution.execution_time_ms = int(
                    (execution.completed_at - execution.started_at).total_seconds() * 1000
                )
            
            self.logger.error(f"Failed to execute action {execution.execution_id}: {e}")
            return execution
    
    async def _execute_action_on_tool(
        self,
        action: ResponseAction,
        client: Any,
        parameters: Dict[str, Any],
        tool: SecurityTool
    ) -> Dict[str, Any]:
        """Execute a specific action on a security tool."""
        try:
            if action == ResponseAction.ISOLATE_HOST:
                return await self._isolate_host(client, parameters, tool)
            elif action == ResponseAction.BLOCK_IP:
                return await self._block_ip(client, parameters, tool)
            elif action == ResponseAction.QUARANTINE_FILE:
                return await self._quarantine_file(client, parameters, tool)
            elif action == ResponseAction.DISABLE_USER:
                return await self._disable_user(client, parameters, tool)
            elif action == ResponseAction.RESET_PASSWORD:
                return await self._reset_password(client, parameters, tool)
            elif action == ResponseAction.KILL_PROCESS:
                return await self._kill_process(client, parameters, tool)
            elif action == ResponseAction.BLOCK_DOMAIN:
                return await self._block_domain(client, parameters, tool)
            elif action == ResponseAction.COLLECT_EVIDENCE:
                return await self._collect_evidence(client, parameters, tool)
            elif action == ResponseAction.CREATE_TICKET:
                return await self._create_ticket(client, parameters, tool)
            elif action == ResponseAction.NOTIFY_TEAM:
                return await self._notify_team(client, parameters, tool)
            else:
                raise ValueError(f"Unsupported action: {action}")
                
        except Exception as e:
            self.logger.error(f"Failed to execute {action} on {tool.name}: {e}")
            raise
    
    # Security tool action implementations
    async def _isolate_host(
        self, 
        client: Any, 
        parameters: Dict[str, Any], 
        tool: SecurityTool
    ) -> Dict[str, Any]:
        """Isolate a host from the network."""
        try:
            host_id = parameters.get("host_id")
            ip_address = parameters.get("ip_address")
            
            if tool.type == "edr":
                # EDR-specific isolation
                response = await self._call_tool_api(
                    client,
                    "POST",
                    f"/hosts/{host_id}/isolate",
                    {"reason": "Automated incident response"}
                )
            elif tool.type == "firewall":
                # Firewall-based isolation
                response = await self._call_tool_api(
                    client,
                    "POST",
                    "/rules",
                    {
                        "action": "deny",
                        "source": ip_address,
                        "destination": "any",
                        "description": "Automated isolation"
                    }
                )
            else:
                raise ValueError(f"Host isolation not supported for tool type: {tool.type}")
            
            return {
                "action": "isolate_host",
                "host_id": host_id,
                "ip_address": ip_address,
                "response": response,
                "success": True
            }
            
        except Exception as e:
            self.logger.error(f"Failed to isolate host: {e}")
            raise
    
    async def _block_ip(
        self, 
        client: Any, 
        parameters: Dict[str, Any], 
        tool: SecurityTool
    ) -> Dict[str, Any]:
        """Block an IP address."""
        try:
            ip_address = parameters.get("ip_address")
            duration = parameters.get("duration_hours", 24)
            
            if tool.type == "firewall":
                response = await self._call_tool_api(
                    client,
                    "POST",
                    "/blocked-ips",
                    {
                        "ip_address": ip_address,
                        "duration_hours": duration,
                        "reason": "Automated incident response"
                    }
                )
            elif tool.type == "proxy":
                response = await self._call_tool_api(
                    client,
                    "POST",
                    "/blacklist",
                    {
                        "ip": ip_address,
                        "ttl": duration * 3600
                    }
                )
            else:
                raise ValueError(f"IP blocking not supported for tool type: {tool.type}")
            
            return {
                "action": "block_ip",
                "ip_address": ip_address,
                "duration_hours": duration,
                "response": response,
                "success": True
            }
            
        except Exception as e:
            self.logger.error(f"Failed to block IP: {e}")
            raise
    
    async def _quarantine_file(
        self, 
        client: Any, 
        parameters: Dict[str, Any], 
        tool: SecurityTool
    ) -> Dict[str, Any]:
        """Quarantine a malicious file."""
        try:
            file_hash = parameters.get("file_hash")
            file_path = parameters.get("file_path")
            host_id = parameters.get("host_id")
            
            if tool.type == "edr":
                response = await self._call_tool_api(
                    client,
                    "POST",
                    f"/hosts/{host_id}/quarantine",
                    {
                        "file_hash": file_hash,
                        "file_path": file_path,
                        "reason": "Automated incident response"
                    }
                )
            else:
                raise ValueError(f"File quarantine not supported for tool type: {tool.type}")
            
            return {
                "action": "quarantine_file",
                "file_hash": file_hash,
                "file_path": file_path,
                "host_id": host_id,
                "response": response,
                "success": True
            }
            
        except Exception as e:
            self.logger.error(f"Failed to quarantine file: {e}")
            raise
    
    async def _disable_user(
        self, 
        client: Any, 
        parameters: Dict[str, Any], 
        tool: SecurityTool
    ) -> Dict[str, Any]:
        """Disable a user account."""
        try:
            username = parameters.get("username")
            user_id = parameters.get("user_id")
            
            if tool.type == "identity":
                response = await self._call_tool_api(
                    client,
                    "POST",
                    f"/users/{user_id}/disable",
                    {"reason": "Automated incident response"}
                )
            elif tool.type == "directory":
                response = await self._call_tool_api(
                    client,
                    "PATCH",
                    f"/users/{username}",
                    {"enabled": False}
                )
            else:
                raise ValueError(f"User disable not supported for tool type: {tool.type}")
            
            return {
                "action": "disable_user",
                "username": username,
                "user_id": user_id,
                "response": response,
                "success": True
            }
            
        except Exception as e:
            self.logger.error(f"Failed to disable user: {e}")
            raise
    
    async def _collect_evidence(
        self, 
        client: Any, 
        parameters: Dict[str, Any], 
        tool: SecurityTool
    ) -> Dict[str, Any]:
        """Collect forensic evidence."""
        try:
            host_id = parameters.get("host_id")
            evidence_types = parameters.get("evidence_types", ["memory", "disk", "network"])
            
            if tool.type == "forensics":
                response = await self._call_tool_api(
                    client,
                    "POST",
                    f"/hosts/{host_id}/collect",
                    {
                        "evidence_types": evidence_types,
                        "priority": "high"
                    }
                )
            else:
                raise ValueError(f"Evidence collection not supported for tool type: {tool.type}")
            
            return {
                "action": "collect_evidence",
                "host_id": host_id,
                "evidence_types": evidence_types,
                "response": response,
                "success": True
            }
            
        except Exception as e:
            self.logger.error(f"Failed to collect evidence: {e}")
            raise
    
    async def _create_ticket(
        self, 
        client: Any, 
        parameters: Dict[str, Any], 
        tool: SecurityTool
    ) -> Dict[str, Any]:
        """Create an incident ticket."""
        try:
            title = parameters.get("title")
            description = parameters.get("description")
            priority = parameters.get("priority", "high")
            
            if tool.type == "ticketing":
                response = await self._call_tool_api(
                    client,
                    "POST",
                    "/tickets",
                    {
                        "title": title,
                        "description": description,
                        "priority": priority,
                        "category": "security_incident"
                    }
                )
            else:
                raise ValueError(f"Ticket creation not supported for tool type: {tool.type}")
            
            return {
                "action": "create_ticket",
                "title": title,
                "priority": priority,
                "response": response,
                "success": True
            }
            
        except Exception as e:
            self.logger.error(f"Failed to create ticket: {e}")
            raise
    
    async def _notify_team(
        self, 
        client: Any, 
        parameters: Dict[str, Any], 
        tool: SecurityTool
    ) -> Dict[str, Any]:
        """Send notification to security team."""
        try:
            message = parameters.get("message")
            channels = parameters.get("channels", ["email", "slack"])
            urgency = parameters.get("urgency", "high")
            
            if tool.type == "notification":
                response = await self._call_tool_api(
                    client,
                    "POST",
                    "/notifications",
                    {
                        "message": message,
                        "channels": channels,
                        "urgency": urgency
                    }
                )
            else:
                raise ValueError(f"Notification not supported for tool type: {tool.type}")
            
            return {
                "action": "notify_team",
                "message": message,
                "channels": channels,
                "response": response,
                "success": True
            }
            
        except Exception as e:
            self.logger.error(f"Failed to notify team: {e}")
            raise</parameter>
</invoke>