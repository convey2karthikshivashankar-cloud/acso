"""
Core interfaces and protocols for ACSO agents.
"""

from abc import ABC, abstractmethod
from typing import Dict, List, Optional, Any, Protocol
from .models import Task, AgentState, AgentMessage, Incident


class AgentInterface(ABC):
    """Base interface for all ACSO agents."""
    
    @abstractmethod
    async def initialize(self) -> None:
        """Initialize the agent and its resources."""
        pass
    
    @abstractmethod
    async def execute_task(self, task: Task) -> Dict[str, Any]:
        """Execute a given task and return results."""
        pass
    
    @abstractmethod
    async def get_state(self) -> AgentState:
        """Get current agent state."""
        pass
    
    @abstractmethod
    async def handle_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Handle incoming message from another agent."""
        pass
    
    @abstractmethod
    async def shutdown(self) -> None:
        """Gracefully shutdown the agent."""
        pass


class SupervisorInterface(AgentInterface):
    """Interface for the supervisor agent."""
    
    @abstractmethod
    async def decompose_goal(self, goal: str) -> List[Task]:
        """Decompose a high-level goal into actionable tasks."""
        pass
    
    @abstractmethod
    async def delegate_task(self, task: Task, agent_id: str) -> bool:
        """Delegate a task to a specific agent."""
        pass
    
    @abstractmethod
    async def aggregate_results(self, task_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate results from multiple sub-tasks."""
        pass
    
    @abstractmethod
    async def handle_agent_failure(self, agent_id: str, task: Task) -> None:
        """Handle failure of an agent and reassign tasks."""
        pass


class ThreatHunterInterface(AgentInterface):
    """Interface for the threat hunter agent."""
    
    @abstractmethod
    async def start_monitoring(self) -> None:
        """Start continuous threat monitoring."""
        pass
    
    @abstractmethod
    async def analyze_logs(self, log_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze log data for threats."""
        pass
    
    @abstractmethod
    async def classify_threat(self, threat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Classify and score a detected threat."""
        pass
    
    @abstractmethod
    async def update_knowledge_base(self, threat_patterns: List[Dict[str, Any]]) -> None:
        """Update threat detection knowledge base."""
        pass


class IncidentResponseInterface(AgentInterface):
    """Interface for the incident response agent."""
    
    @abstractmethod
    async def execute_containment(self, incident: Incident) -> List[Dict[str, Any]]:
        """Execute containment actions for an incident."""
        pass
    
    @abstractmethod
    async def assess_risk(self, action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Assess risk of a containment action."""
        pass
    
    @abstractmethod
    async def request_approval(self, action: str, risk_assessment: Dict[str, Any]) -> bool:
        """Request human approval for high-risk actions."""
        pass
    
    @abstractmethod
    async def generate_incident_report(self, incident: Incident) -> Dict[str, Any]:
        """Generate detailed incident report."""
        pass


class ServiceOrchestrationInterface(AgentInterface):
    """Interface for the service orchestration agent."""
    
    @abstractmethod
    async def triage_ticket(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Triage and categorize a service ticket."""
        pass
    
    @abstractmethod
    async def execute_service_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an automated service task."""
        pass
    
    @abstractmethod
    async def monitor_sla(self, ticket_id: str) -> Dict[str, Any]:
        """Monitor SLA compliance for a ticket."""
        pass
    
    @abstractmethod
    async def escalate_ticket(self, ticket_id: str, reason: str) -> None:
        """Escalate a ticket to human technicians."""
        pass


class FinancialIntelligenceInterface(AgentInterface):
    """Interface for the financial intelligence agent."""
    
    @abstractmethod
    async def analyze_upsell_opportunities(self, client_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze data for upselling opportunities."""
        pass
    
    @abstractmethod
    async def optimize_resources(self, usage_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze resource usage for optimization opportunities."""
        pass
    
    @abstractmethod
    async def generate_financial_report(self, period: str) -> Dict[str, Any]:
        """Generate financial analysis report."""
        pass
    
    @abstractmethod
    async def track_client_profitability(self, client_id: str) -> Dict[str, Any]:
        """Track and analyze client profitability."""
        pass


class CommunicationProtocol(Protocol):
    """Protocol for inter-agent communication."""
    
    async def send_message(self, message: AgentMessage) -> bool:
        """Send a message to another agent."""
        ...
    
    async def receive_message(self) -> Optional[AgentMessage]:
        """Receive a message from another agent."""
        ...
    
    async def broadcast_message(self, message: AgentMessage, recipients: List[str]) -> Dict[str, bool]:
        """Broadcast a message to multiple agents."""
        ...


class MemoryInterface(Protocol):
    """Protocol for agent memory management."""
    
    async def store_memory(self, key: str, value: Any, memory_type: str = "short_term") -> None:
        """Store data in agent memory."""
        ...
    
    async def retrieve_memory(self, key: str, memory_type: str = "short_term") -> Optional[Any]:
        """Retrieve data from agent memory."""
        ...
    
    async def update_memory(self, key: str, value: Any, memory_type: str = "short_term") -> None:
        """Update existing memory data."""
        ...
    
    async def clear_memory(self, memory_type: str = "short_term") -> None:
        """Clear memory of specified type."""
        ...


class SecurityInterface(Protocol):
    """Protocol for security operations."""
    
    async def validate_permissions(self, agent_id: str, action: str) -> bool:
        """Validate agent permissions for an action."""
        ...
    
    async def encrypt_data(self, data: Any) -> str:
        """Encrypt sensitive data."""
        ...
    
    async def decrypt_data(self, encrypted_data: str) -> Any:
        """Decrypt encrypted data."""
        ...
    
    async def audit_log(self, agent_id: str, action: str, details: Dict[str, Any]) -> None:
        """Log action for audit trail."""
        ...