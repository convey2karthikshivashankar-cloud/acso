"""
Incident Response Agent implementation for ACSO system.
Handles automated incident response and containment actions.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from .base_agent import BaseAgent
from ..shared.interfaces import IncidentResponseInterface
from ..shared.models import (
    AgentType, Task, TaskType, TaskPriority, TaskStatus,
    Incident, IncidentSeverity, IncidentType, IncidentStatus,
    ContainmentAction
)
from ..shared.coordination import system_coordinator
from ..shared.human_interface import (
    human_approval_interface, ApprovalType, RiskAssessment
)
from ..shared.aws_integration import (
    bedrock_client, cloudwatch_logger, iam_security
)
from config.settings import settings


class ContainmentActionType(str, Enum):
    """Types of containment actions."""
    ISOLATE_HOST = "isolate_host"
    BLOCK_IP_ADDRESS = "block_ip_address"
    DISABLE_USER_ACCOUNT = "disable_user_account"
    QUARANTINE_FILE = "quarantine_file"
    TERMINATE_PROCESS = "terminate_process"
    REVOKE_CREDENTIALS = "revoke_credentials"
    SHUTDOWN_SERVICE = "shutdown_service"
    NETWORK_SEGMENTATION = "network_segmentation"
    BACKUP_ISOLATION = "backup_isolation"
    FORENSIC_IMAGING = "forensic_imaging"


class ResponsePriority(str, Enum):
    """Priority levels for incident response."""
    IMMEDIATE = "immediate"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    DEFERRED = "deferred"


class ContainmentStrategy:
    """Represents a containment strategy for different incident types."""
    
    def __init__(self, strategy_id: str, name: str, description: str,
                 applicable_incidents: List[str], actions: List[Dict[str, Any]],
                 risk_level: str = "medium"):
        self.strategy_id = strategy_id
        self.name = name
        self.description = description
        self.applicable_incidents = applicable_incidents
        self.actions = actions
        self.risk_level = risk_level
        self.success_rate = 0.0
        self.execution_count = 0
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategy_id": self.strategy_id,
            "name": self.name,
            "description": self.description,
            "applicable_incidents": self.applicable_incidents,
            "actions": self.actions,
            "risk_level": self.risk_level,
            "success_rate": self.success_rate,
            "execution_count": self.execution_count
        }


class ContainmentEngine:
    """Core engine for incident containment and response."""
    
    def __init__(self):
        self.containment_strategies = self._initialize_containment_strategies()
        self.action_executors = self._initialize_action_executors()
        self.execution_history = []
        
    def _initialize_containment_strategies(self) -> Dict[str, ContainmentStrategy]:
        """Initialize predefined containment strategies."""
        strategies = {}
        
        # Malware containment strategy
        strategies["malware_containment"] = ContainmentStrategy(
            strategy_id="malware_containment",
            name="Malware Containment",
            description="Isolate infected systems and prevent malware spread",
            applicable_incidents=["malware", "suspicious_activity"],
            actions=[
                {
                    "action_type": ContainmentActionType.ISOLATE_HOST,
                    "priority": 1,
                    "description": "Isolate infected host from network",
                    "parameters": {"isolation_type": "network"}
                },
                {
                    "action_type": ContainmentActionType.QUARANTINE_FILE,
                    "priority": 2,
                    "description": "Quarantine malicious files",
                    "parameters": {"quarantine_location": "secure_vault"}
                },
                {
                    "action_type": ContainmentActionType.TERMINATE_PROCESS,
                    "priority": 3,
                    "description": "Terminate malicious processes",
                    "parameters": {"force_termination": True}
                }
            ],
            risk_level="high"
        )
        
        # Intrusion containment strategy
        strategies["intrusion_containment"] = ContainmentStrategy(
            strategy_id="intrusion_containment",
            name="Intrusion Containment",
            description="Contain unauthorized access and prevent lateral movement",
            applicable_incidents=["intrusion", "privilege_escalation"],
            actions=[
                {
                    "action_type": ContainmentActionType.DISABLE_USER_ACCOUNT,
                    "priority": 1,
                    "description": "Disable compromised user account",
                    "parameters": {"disable_type": "immediate"}
                },
                {
                    "action_type": ContainmentActionType.REVOKE_CREDENTIALS,
                    "priority": 2,
                    "description": "Revoke all active sessions and credentials",
                    "parameters": {"scope": "all_sessions"}
                },
                {
                    "action_type": ContainmentActionType.BLOCK_IP_ADDRESS,
                    "priority": 3,
                    "description": "Block source IP address",
                    "parameters": {"block_duration": "24h"}
                }
            ],
            risk_level="medium"
        )
        
        # Data exfiltration containment strategy
        strategies["data_exfiltration_containment"] = ContainmentStrategy(
            strategy_id="data_exfiltration_containment",
            name="Data Exfiltration Containment",
            description="Prevent data theft and secure sensitive information",
            applicable_incidents=["data_exfiltration", "suspicious_activity"],
            actions=[
                {
                    "action_type": ContainmentActionType.NETWORK_SEGMENTATION,
                    "priority": 1,
                    "description": "Implement network segmentation",
                    "parameters": {"segment_type": "data_isolation"}
                },
                {
                    "action_type": ContainmentActionType.DISABLE_USER_ACCOUNT,
                    "priority": 2,
                    "description": "Disable accounts with data access",
                    "parameters": {"scope": "data_access_accounts"}
                },
                {
                    "action_type": ContainmentActionType.BACKUP_ISOLATION,
                    "priority": 3,
                    "description": "Isolate and secure backups",
                    "parameters": {"isolation_level": "complete"}
                }
            ],
            risk_level="high"
        )
        
        return strategies
        
    def _initialize_action_executors(self) -> Dict[str, callable]:
        """Initialize action executor functions."""
        return {
            ContainmentActionType.ISOLATE_HOST: self._execute_host_isolation,
            ContainmentActionType.BLOCK_IP_ADDRESS: self._execute_ip_blocking,
            ContainmentActionType.DISABLE_USER_ACCOUNT: self._execute_user_disable,
            ContainmentActionType.QUARANTINE_FILE: self._execute_file_quarantine,
            ContainmentActionType.TERMINATE_PROCESS: self._execute_process_termination,
            ContainmentActionType.REVOKE_CREDENTIALS: self._execute_credential_revocation,
            ContainmentActionType.SHUTDOWN_SERVICE: self._execute_service_shutdown,
            ContainmentActionType.NETWORK_SEGMENTATION: self._execute_network_segmentation,
            ContainmentActionType.BACKUP_ISOLATION: self._execute_backup_isolation,
            ContainmentActionType.FORENSIC_IMAGING: self._execute_forensic_imaging
        }
        
    async def select_containment_strategy(self, incident: Dict[str, Any]) -> Optional[ContainmentStrategy]:
        """Select appropriate containment strategy for an incident."""
        try:
            incident_type = incident.get("type", "").lower()
            incident_severity = incident.get("severity", IncidentSeverity.MEDIUM)
            
            # Find applicable strategies
            applicable_strategies = []
            for strategy in self.containment_strategies.values():
                if any(inc_type in incident_type for inc_type in strategy.applicable_incidents):
                    applicable_strategies.append(strategy)
                    
            if not applicable_strategies:
                return None
                
            # Select best strategy based on success rate and severity
            best_strategy = None
            best_score = -1
            
            for strategy in applicable_strategies:
                # Calculate strategy score
                score = strategy.success_rate
                
                # Adjust for incident severity
                if incident_severity == IncidentSeverity.CRITICAL:
                    score += 0.2 if strategy.risk_level == "high" else 0.0
                elif incident_severity == IncidentSeverity.HIGH:
                    score += 0.1 if strategy.risk_level in ["high", "medium"] else 0.0
                    
                # Prefer strategies with execution history
                if strategy.execution_count > 0:
                    score += 0.1
                    
                if score > best_score:
                    best_score = score
                    best_strategy = strategy
                    
            return best_strategy
            
        except Exception as e:
            print(f"Strategy selection failed: {e}")
            return None
            
    async def execute_containment_action(self, action: Dict[str, Any], 
                                       incident_context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a specific containment action."""
        try:
            action_type = ContainmentActionType(action["action_type"])
            executor = self.action_executors.get(action_type)
            
            if not executor:
                return {
                    "success": False,
                    "error": f"No executor found for action type: {action_type}",
                    "action_type": action_type
                }
                
            # Execute the action
            result = await executor(action, incident_context)
            
            # Record execution
            execution_record = {
                "action_type": action_type,
                "action_details": action,
                "incident_context": incident_context,
                "result": result,
                "timestamp": datetime.utcnow().isoformat(),
                "execution_id": str(uuid.uuid4())
            }
            
            self.execution_history.append(execution_record)
            
            return result
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action_type": action.get("action_type", "unknown")
            }
            
    async def _execute_host_isolation(self, action: Dict[str, Any], 
                                    context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute host isolation action."""
        try:
            host_id = context.get("affected_systems", ["unknown"])[0]
            isolation_type = action.get("parameters", {}).get("isolation_type", "network")
            
            # Simulate host isolation using AWS Systems Manager or EC2 APIs
            # In a real implementation, this would:
            # 1. Modify security groups to block traffic
            # 2. Update NACLs for network isolation
            # 3. Stop/isolate EC2 instances if needed
            
            print(f"Isolating host {host_id} with {isolation_type} isolation")
            
            # Simulate API calls
            await asyncio.sleep(2)  # Simulate execution time
            
            return {
                "success": True,
                "action": "host_isolation",
                "host_id": host_id,
                "isolation_type": isolation_type,
                "message": f"Host {host_id} successfully isolated",
                "isolation_rules": [
                    "Blocked all inbound traffic",
                    "Blocked all outbound traffic except management",
                    "Maintained monitoring access"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "host_isolation"
            }
            
    async def _execute_ip_blocking(self, action: Dict[str, Any], 
                                 context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute IP address blocking action."""
        try:
            # Extract IP from incident data
            ip_address = context.get("source_ip", "unknown")
            block_duration = action.get("parameters", {}).get("block_duration", "1h")
            
            # Simulate IP blocking using AWS WAF or Security Groups
            print(f"Blocking IP address {ip_address} for {block_duration}")
            
            await asyncio.sleep(1)  # Simulate execution time
            
            return {
                "success": True,
                "action": "ip_blocking",
                "ip_address": ip_address,
                "block_duration": block_duration,
                "message": f"IP {ip_address} blocked for {block_duration}",
                "blocking_rules": [
                    f"Added {ip_address} to WAF block list",
                    f"Updated security group rules",
                    f"Set expiration for {block_duration}"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "ip_blocking"
            }
            
    async def _execute_user_disable(self, action: Dict[str, Any], 
                                  context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute user account disable action."""
        try:
            user_id = context.get("user_identity", {}).get("userName", "unknown")
            disable_type = action.get("parameters", {}).get("disable_type", "immediate")
            
            # Simulate user account disabling using AWS IAM
            print(f"Disabling user account {user_id} with {disable_type} disable")
            
            await asyncio.sleep(1)  # Simulate execution time
            
            return {
                "success": True,
                "action": "user_disable",
                "user_id": user_id,
                "disable_type": disable_type,
                "message": f"User {user_id} account disabled",
                "actions_taken": [
                    "Disabled IAM user account",
                    "Revoked active access keys",
                    "Terminated active sessions",
                    "Added to security watch list"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "user_disable"
            }
            
    async def _execute_file_quarantine(self, action: Dict[str, Any], 
                                     context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute file quarantine action."""
        try:
            file_path = context.get("file_path", "unknown")
            quarantine_location = action.get("parameters", {}).get("quarantine_location", "secure_vault")
            
            print(f"Quarantining file {file_path} to {quarantine_location}")
            
            await asyncio.sleep(1)  # Simulate execution time
            
            return {
                "success": True,
                "action": "file_quarantine",
                "file_path": file_path,
                "quarantine_location": quarantine_location,
                "message": f"File {file_path} quarantined successfully",
                "quarantine_details": [
                    f"Moved file to {quarantine_location}",
                    "Applied encryption to quarantined file",
                    "Updated file access permissions",
                    "Created forensic hash"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "file_quarantine"
            }
            
    async def _execute_process_termination(self, action: Dict[str, Any], 
                                         context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute process termination action."""
        try:
            process_id = context.get("process_id", "unknown")
            force_termination = action.get("parameters", {}).get("force_termination", False)
            
            print(f"Terminating process {process_id} (force: {force_termination})")
            
            await asyncio.sleep(1)  # Simulate execution time
            
            return {
                "success": True,
                "action": "process_termination",
                "process_id": process_id,
                "force_termination": force_termination,
                "message": f"Process {process_id} terminated successfully",
                "termination_details": [
                    f"Terminated process {process_id}",
                    "Cleaned up process resources",
                    "Verified process termination",
                    "Logged termination event"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "process_termination"
            }
            
    async def _execute_credential_revocation(self, action: Dict[str, Any], 
                                           context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute credential revocation action."""
        try:
            user_id = context.get("user_identity", {}).get("userName", "unknown")
            scope = action.get("parameters", {}).get("scope", "all_sessions")
            
            print(f"Revoking credentials for {user_id} (scope: {scope})")
            
            await asyncio.sleep(2)  # Simulate execution time
            
            return {
                "success": True,
                "action": "credential_revocation",
                "user_id": user_id,
                "scope": scope,
                "message": f"Credentials revoked for {user_id}",
                "revocation_details": [
                    "Revoked all access keys",
                    "Invalidated active sessions",
                    "Disabled temporary credentials",
                    "Updated credential policies"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "credential_revocation"
            }
            
    async def _execute_service_shutdown(self, action: Dict[str, Any], 
                                      context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute service shutdown action."""
        try:
            service_name = context.get("service_name", "unknown")
            
            print(f"Shutting down service {service_name}")
            
            await asyncio.sleep(3)  # Simulate execution time
            
            return {
                "success": True,
                "action": "service_shutdown",
                "service_name": service_name,
                "message": f"Service {service_name} shut down successfully",
                "shutdown_details": [
                    f"Stopped {service_name} service",
                    "Gracefully terminated connections",
                    "Preserved service state",
                    "Notified dependent services"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "service_shutdown"
            }
            
    async def _execute_network_segmentation(self, action: Dict[str, Any], 
                                          context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute network segmentation action."""
        try:
            segment_type = action.get("parameters", {}).get("segment_type", "isolation")
            
            print(f"Implementing network segmentation: {segment_type}")
            
            await asyncio.sleep(2)  # Simulate execution time
            
            return {
                "success": True,
                "action": "network_segmentation",
                "segment_type": segment_type,
                "message": f"Network segmentation implemented: {segment_type}",
                "segmentation_details": [
                    "Created isolated network segment",
                    "Updated routing tables",
                    "Applied firewall rules",
                    "Configured monitoring"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "network_segmentation"
            }
            
    async def _execute_backup_isolation(self, action: Dict[str, Any], 
                                      context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute backup isolation action."""
        try:
            isolation_level = action.get("parameters", {}).get("isolation_level", "standard")
            
            print(f"Isolating backups with {isolation_level} isolation")
            
            await asyncio.sleep(2)  # Simulate execution time
            
            return {
                "success": True,
                "action": "backup_isolation",
                "isolation_level": isolation_level,
                "message": f"Backups isolated with {isolation_level} level",
                "isolation_details": [
                    "Moved backups to isolated storage",
                    "Applied additional encryption",
                    "Restricted access permissions",
                    "Enabled immutable storage"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "backup_isolation"
            }
            
    async def _execute_forensic_imaging(self, action: Dict[str, Any], 
                                      context: Dict[str, Any]) -> Dict[str, Any]:
        """Execute forensic imaging action."""
        try:
            target_system = context.get("affected_systems", ["unknown"])[0]
            
            print(f"Creating forensic image of {target_system}")
            
            await asyncio.sleep(5)  # Simulate execution time
            
            return {
                "success": True,
                "action": "forensic_imaging",
                "target_system": target_system,
                "message": f"Forensic image created for {target_system}",
                "imaging_details": [
                    "Created bit-for-bit disk image",
                    "Generated cryptographic hashes",
                    "Preserved metadata",
                    "Stored in secure location"
                ]
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "action": "forensic_imaging"
            }


class IncidentResponseAgent(BaseAgent, IncidentResponseInterface):
    """Incident Response agent that handles automated containment and response."""
    
    def __init__(self, agent_id: str = "incident-response-001"):
        super().__init__(agent_id, AgentType.INCIDENT_RESPONSE)
        
        # Incident response specific capabilities
        self.capabilities = [
            "incident_containment",
            "automated_response",
            "threat_mitigation",
            "forensic_analysis",
            "system_isolation",
            "credential_management"
        ]
        
        # Containment engine
        self.containment_engine = ContainmentEngine()
        
        # Active incidents
        self.active_incidents: Dict[str, Dict[str, Any]] = {}
        self.incident_history: List[Dict[str, Any]] = []
        
        # Response statistics
        self.incidents_handled = 0
        self.containment_actions_executed = 0
        self.average_response_time = 0.0
        
    async def initialize(self) -> None:
        """Initialize the incident response agent."""
        await super().initialize()
        
        # Register with system coordinator
        state = await self.get_state()
        await system_coordinator.register_agent(state)
        
        # Register additional message handlers
        self.comm_manager.register_handler("new_incident", self._handle_new_incident)
        self.comm_manager.register_handler("incident_update", self._handle_incident_update)
        self.comm_manager.register_handler("containment_request", self._handle_containment_request)
        
        self.logger.info("Incident Response agent initialized and ready for incidents")
        
    async def _execute_task_implementation(self, task: Task) -> Dict[str, Any]:
        """Execute incident response specific tasks."""
        try:
            if task.type == TaskType.INCIDENT_RESPONSE:
                return await self._handle_incident_response_task(task)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported task type: {task.type}",
                    "task_id": task.task_id
                }
                
        except Exception as e:
            self.logger.error(f"Incident response task execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "task_id": task.task_id
            }
            
    async def execute_containment(self, incident: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Execute containment actions for an incident."""
        try:
            incident_id = incident.get("incident_id", str(uuid.uuid4()))
            self.logger.info(f"Executing containment for incident {incident_id}")
            
            # Select containment strategy
            strategy = await self.containment_engine.select_containment_strategy(incident)
            
            if not strategy:
                return [{
                    "success": False,
                    "error": "No suitable containment strategy found",
                    "incident_id": incident_id
                }]
                
            containment_results = []
            
            # Execute containment actions in priority order
            sorted_actions = sorted(strategy.actions, key=lambda x: x.get("priority", 999))
            
            for action in sorted_actions:
                # Assess risk of this action
                risk_assessment = await self.assess_risk(
                    action["description"], 
                    {"incident": incident, "action": action}
                )
                
                # Check if human approval is required
                if risk_assessment.get("requires_approval", False):
                    approved = await self.request_approval(
                        action["description"],
                        risk_assessment
                    )
                    
                    if not approved:
                        containment_results.append({
                            "success": False,
                            "action": action["action_type"],
                            "error": "Human approval denied",
                            "risk_assessment": risk_assessment
                        })
                        continue
                        
                # Execute the containment action
                result = await self.containment_engine.execute_containment_action(
                    action, incident
                )
                
                containment_results.append(result)
                self.containment_actions_executed += 1
                
                # Log containment action
                await self._log_activity("containment_action", {
                    "incident_id": incident_id,
                    "action_type": action["action_type"],
                    "success": result.get("success", False),
                    "risk_level": risk_assessment.get("risk_level", "unknown")
                })
                
                # If action failed and is critical, consider escalation
                if not result.get("success", False) and action.get("priority", 999) <= 2:
                    self.logger.warning(f"Critical containment action failed: {action['action_type']}")
                    
            # Update strategy success rate
            successful_actions = len([r for r in containment_results if r.get("success", False)])
            strategy.execution_count += 1
            strategy.success_rate = (
                (strategy.success_rate * (strategy.execution_count - 1) + 
                 (successful_actions / len(containment_results))) / strategy.execution_count
            )
            
            return containment_results
            
        except Exception as e:
            self.logger.error(f"Containment execution failed: {e}")
            return [{
                "success": False,
                "error": str(e),
                "incident_id": incident.get("incident_id", "unknown")
            }]
            
    async def assess_risk(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Assess risk of a containment action."""
        try:
            # Use the risk assessment from human interface
            risk_assessment = RiskAssessment.assess_action_risk(action, context)
            
            # Enhance with incident-specific risk factors
            incident = context.get("incident", {})
            incident_severity = incident.get("severity", IncidentSeverity.MEDIUM)
            
            # Adjust risk based on incident severity
            if incident_severity == IncidentSeverity.CRITICAL:
                risk_assessment["risk_score"] = min(1.0, risk_assessment["risk_score"] + 0.1)
                risk_assessment["risk_factors"].append("Critical incident severity")
                
            # Add incident response specific factors
            affected_systems = incident.get("affected_systems", [])
            if len(affected_systems) > 1:
                risk_assessment["risk_score"] = min(1.0, risk_assessment["risk_score"] + 0.1)
                risk_assessment["risk_factors"].append(f"Multiple systems affected ({len(affected_systems)})")
                
            # Check for production systems
            if any("prod" in system.lower() for system in affected_systems):
                risk_assessment["risk_score"] = min(1.0, risk_assessment["risk_score"] + 0.2)
                risk_assessment["risk_factors"].append("Production systems involved")
                
            return risk_assessment
            
        except Exception as e:
            self.logger.error(f"Risk assessment failed: {e}")
            return {
                "risk_score": 0.8,  # Default to high risk if assessment fails
                "risk_level": "HIGH",
                "risk_factors": ["Risk assessment failed"],
                "requires_approval": True
            }
            
    async def request_approval(self, action: str, risk_assessment: Dict[str, Any]) -> bool:
        """Request human approval for high-risk actions."""
        try:
            if not settings.security.human_approval_required_for_high_risk:
                return True
                
            # Request approval through human interface
            request_id = await human_approval_interface.request_approval(
                approval_type=ApprovalType.HIGH_RISK_ACTION,
                requester_agent_id=self.agent_id,
                action_description=action,
                context={
                    "risk_assessment": risk_assessment,
                    "agent_type": "incident_response",
                    "urgency": "high"
                }
            )
            
            if request_id == "auto_approved":
                return True
                
            # Wait for approval with timeout
            approval_timeout = 300  # 5 minutes for incident response
            start_time = datetime.utcnow()
            
            while (datetime.utcnow() - start_time).total_seconds() < approval_timeout:
                # Check if approval has been provided
                pending_approvals = await human_approval_interface.get_pending_approvals()
                
                for approval in pending_approvals:
                    if approval.request_id == request_id:
                        if approval.status.value == "approved":
                            return True
                        elif approval.status.value == "rejected":
                            return False
                            
                await asyncio.sleep(5)  # Check every 5 seconds
                
            # Timeout - default to rejection for safety
            self.logger.warning(f"Approval request timed out for action: {action}")
            return False
            
        except Exception as e:
            self.logger.error(f"Approval request failed: {e}")
            return False  # Default to rejection on error
            
    async def generate_incident_report(self, incident: Dict[str, Any]) -> Dict[str, Any]:
        """Generate detailed incident report."""
        try:
            incident_id = incident.get("incident_id")
            self.logger.info(f"Generating incident report for {incident_id}")
            
            # Collect incident data
            containment_actions = incident.get("containment_actions", [])
            timeline = incident.get("timeline", [])
            
            # Use Bedrock for report generation
            report_prompt = f"""
            Generate a comprehensive incident response report:
            
            Incident Details: {json.dumps(incident, indent=2)}
            Containment Actions: {json.dumps(containment_actions, indent=2)}
            
            Include:
            1. Executive Summary
            2. Incident Timeline
            3. Containment Actions Taken
            4. Impact Assessment
            5. Root Cause Analysis
            6. Lessons Learned
            7. Recommendations for Prevention
            """
            
            bedrock_result = await self._invoke_bedrock_agent(report_prompt)
            
            # Base report structure
            report = {
                "incident_id": incident_id,
                "report_generated_at": datetime.utcnow().isoformat(),
                "generated_by": self.agent_id,
                "incident_summary": {
                    "severity": incident.get("severity"),
                    "type": incident.get("type"),
                    "detection_time": incident.get("detection_time"),
                    "resolution_time": incident.get("resolution_time"),
                    "affected_systems": incident.get("affected_systems", [])
                },
                "containment_summary": {
                    "total_actions": len(containment_actions),
                    "successful_actions": len([a for a in containment_actions if a.get("success", False)]),
                    "actions_requiring_approval": len([a for a in containment_actions if a.get("required_approval", False)])
                },
                "metrics": {
                    "response_time_minutes": self._calculate_response_time(incident),
                    "containment_effectiveness": self._calculate_containment_effectiveness(containment_actions)
                }
            }
            
            # Add AI-generated analysis if available
            if bedrock_result.get("success"):
                report["ai_analysis"] = bedrock_result.get("result", "")
                report["enhanced_report"] = True
            else:
                report["enhanced_report"] = False
                
            # Add recommendations
            report["recommendations"] = await self._generate_recommendations(incident, containment_actions)
            
            return report
            
        except Exception as e:
            self.logger.error(f"Incident report generation failed: {e}")
            return {
                "incident_id": incident.get("incident_id", "unknown"),
                "error": str(e),
                "report_generated_at": datetime.utcnow().isoformat()
            }
            
    def _calculate_response_time(self, incident: Dict[str, Any]) -> float:
        """Calculate incident response time in minutes."""
        try:
            detection_time = datetime.fromisoformat(incident.get("detection_time", datetime.utcnow().isoformat()))
            
            # Use first containment action time or current time
            containment_actions = incident.get("containment_actions", [])
            if containment_actions:
                first_action_time = datetime.fromisoformat(containment_actions[0].get("timestamp", datetime.utcnow().isoformat()))
            else:
                first_action_time = datetime.utcnow()
                
            response_time = (first_action_time - detection_time).total_seconds() / 60
            return max(0, response_time)
            
        except Exception:
            return 0.0
            
    def _calculate_containment_effectiveness(self, containment_actions: List[Dict[str, Any]]) -> float:
        """Calculate containment effectiveness percentage."""
        try:
            if not containment_actions:
                return 0.0
                
            successful_actions = len([a for a in containment_actions if a.get("success", False)])
            return (successful_actions / len(containment_actions)) * 100
            
        except Exception:
            return 0.0
            
    async def _generate_recommendations(self, incident: Dict[str, Any], 
                                      containment_actions: List[Dict[str, Any]]) -> List[str]:
        """Generate recommendations based on incident analysis."""
        recommendations = []
        
        try:
            # Analyze failed containment actions
            failed_actions = [a for a in containment_actions if not a.get("success", False)]
            if failed_actions:
                recommendations.append("Review and improve containment procedures for failed actions")
                
            # Check response time
            response_time = self._calculate_response_time(incident)
            if response_time > 30:  # More than 30 minutes
                recommendations.append("Improve incident detection and response time")
                
            # Analyze incident type for prevention
            incident_type = incident.get("type", "").lower()
            if "intrusion" in incident_type:
                recommendations.extend([
                    "Review and strengthen access controls",
                    "Implement additional monitoring for authentication events",
                    "Consider multi-factor authentication for sensitive systems"
                ])
            elif "malware" in incident_type:
                recommendations.extend([
                    "Update antivirus signatures and scanning policies",
                    "Review email security and web filtering",
                    "Implement application whitelisting where appropriate"
                ])
            elif "data_exfiltration" in incident_type:
                recommendations.extend([
                    "Implement data loss prevention (DLP) controls",
                    "Review data access permissions and monitoring",
                    "Consider data encryption for sensitive information"
                ])
                
            # General recommendations
            recommendations.extend([
                "Conduct post-incident review with stakeholders",
                "Update incident response procedures based on lessons learned",
                "Provide additional training on incident response procedures"
            ])
            
        except Exception as e:
            self.logger.error(f"Recommendation generation failed: {e}")
            recommendations.append("Conduct thorough post-incident analysis")
            
        return recommendations
        
    async def _handle_incident_response_task(self, task: Task) -> Dict[str, Any]:
        """Handle incident response task."""
        try:
            incident_data = task.context.get("incident", {})
            response_type = task.context.get("response_type", "full_response")
            
            self.logger.info(f"Handling incident response task: {response_type}")
            
            # Execute containment
            containment_results = await self.execute_containment(incident_data)
            
            # Generate incident report
            incident_report = await self.generate_incident_report({
                **incident_data,
                "containment_actions": containment_results,
                "resolution_time": datetime.utcnow().isoformat()
            })
            
            # Update statistics
            self.incidents_handled += 1
            response_time = self._calculate_response_time(incident_data)
            self.average_response_time = (
                (self.average_response_time * (self.incidents_handled - 1) + response_time) / 
                self.incidents_handled
            )
            
            return {
                "success": True,
                "incident_id": incident_data.get("incident_id"),
                "containment_results": containment_results,
                "incident_report": incident_report,
                "response_time_minutes": response_time,
                "task_id": task.task_id
            }
            
        except Exception as e:
            self.logger.error(f"Incident response task failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "task_id": task.task_id
            }
            
    async def _handle_new_incident(self, message) -> None:
        """Handle new incident notification."""
        try:
            incident = message.payload.get("incident", {})
            incident_id = incident.get("incident_id")
            
            self.logger.info(f"Received new incident: {incident_id}")
            
            # Add to active incidents
            self.active_incidents[incident_id] = incident
            
            # Determine response priority
            severity = incident.get("severity", IncidentSeverity.MEDIUM)
            if severity in [IncidentSeverity.CRITICAL, IncidentSeverity.HIGH]:
                # Immediate response for high severity incidents
                containment_results = await self.execute_containment(incident)
                
                # Update incident with containment results
                incident["containment_actions"] = containment_results
                incident["status"] = IncidentStatus.CONTAINED
                
                # Generate report
                report = await self.generate_incident_report(incident)
                
                # Move to history
                self.incident_history.append(incident)
                del self.active_incidents[incident_id]
                
                # Notify supervisor of completion
                await self.comm_manager.send_message(
                    recipient_id="supervisor-001",
                    message_type="incident_resolved",
                    payload={
                        "incident_id": incident_id,
                        "containment_results": containment_results,
                        "report": report
                    }
                )
                
        except Exception as e:
            self.logger.error(f"New incident handling failed: {e}")
            
    async def _handle_incident_update(self, message) -> None:
        """Handle incident update notification."""
        try:
            incident_id = message.payload.get("incident_id")
            updates = message.payload.get("updates", {})
            
            if incident_id in self.active_incidents:
                self.active_incidents[incident_id].update(updates)
                self.logger.info(f"Updated incident {incident_id}")
                
        except Exception as e:
            self.logger.error(f"Incident update handling failed: {e}")
            
    async def _handle_containment_request(self, message) -> None:
        """Handle containment request."""
        try:
            incident = message.payload.get("incident", {})
            containment_results = await self.execute_containment(incident)
            
            # Send results back
            await self.comm_manager.send_message(
                recipient_id=message.sender_id,
                message_type="containment_result",
                payload={
                    "incident_id": incident.get("incident_id"),
                    "containment_results": containment_results
                }
            )
            
        except Exception as e:
            self.logger.error(f"Containment request handling failed: {e}")