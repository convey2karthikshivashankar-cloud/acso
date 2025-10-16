"""
Data models for the ACSO system based on the design specification.
"""

from datetime import datetime
from enum import Enum
from typing import Dict, List, Optional, Any
from pydantic import BaseModel, Field


class AgentType(str, Enum):
    """Types of agents in the ACSO system."""
    SUPERVISOR = "supervisor"
    THREAT_HUNTER = "threat-hunter"
    INCIDENT_RESPONSE = "incident-response"
    SERVICE_ORCHESTRATION = "service-orchestration"
    FINANCIAL_INTELLIGENCE = "financial-intelligence"


class AgentStatus(str, Enum):
    """Status of an agent."""
    ACTIVE = "active"
    IDLE = "idle"
    PROCESSING = "processing"
    ERROR = "error"


class TaskPriority(str, Enum):
    """Priority levels for tasks."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class TaskStatus(str, Enum):
    """Status of a task."""
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    FAILED = "failed"


class TaskType(str, Enum):
    """Types of tasks in the system."""
    THREAT_ANALYSIS = "threat-analysis"
    INCIDENT_RESPONSE = "incident-response"
    SERVICE_DELIVERY = "service-delivery"
    FINANCIAL_ANALYSIS = "financial-analysis"


class ApprovalStatus(str, Enum):
    """Status of human approval requests."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"


class IncidentSeverity(str, Enum):
    """Severity levels for incidents."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentType(str, Enum):
    """Types of incidents."""
    SECURITY = "security"
    PERFORMANCE = "performance"
    AVAILABILITY = "availability"
    COMPLIANCE = "compliance"


class IncidentStatus(str, Enum):
    """Status of incidents."""
    OPEN = "open"
    INVESTIGATING = "investigating"
    CONTAINED = "contained"
    RESOLVED = "resolved"


class Task(BaseModel):
    """Task model for agent coordination."""
    task_id: str = Field(..., description="Unique identifier for the task")
    type: TaskType = Field(..., description="Type of task")
    description: str = Field(..., description="Human-readable task description")
    priority: TaskPriority = Field(..., description="Task priority level")
    status: TaskStatus = Field(default=TaskStatus.PENDING, description="Current task status")
    assigned_agent: Optional[str] = Field(None, description="ID of assigned agent")
    required_approval: bool = Field(default=False, description="Whether human approval is required")
    approval_status: Optional[ApprovalStatus] = Field(None, description="Status of approval if required")
    context: Dict[str, Any] = Field(default_factory=dict, description="Task context and parameters")
    results: Dict[str, Any] = Field(default_factory=dict, description="Task execution results")
    created_at: datetime = Field(default_factory=datetime.utcnow, description="Task creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Task completion timestamp")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AgentMemory(BaseModel):
    """Memory structure for agents."""
    short_term: Dict[str, Any] = Field(default_factory=dict, description="Short-term memory")
    long_term: Dict[str, Any] = Field(default_factory=dict, description="Long-term memory")


class AgentState(BaseModel):
    """State model for agents."""
    agent_id: str = Field(..., description="Unique identifier for the agent")
    agent_type: AgentType = Field(..., description="Type of agent")
    status: AgentStatus = Field(default=AgentStatus.IDLE, description="Current agent status")
    current_task: Optional[Task] = Field(None, description="Currently executing task")
    capabilities: List[str] = Field(default_factory=list, description="Agent capabilities")
    memory: AgentMemory = Field(default_factory=AgentMemory, description="Agent memory")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ContainmentAction(BaseModel):
    """Model for incident containment actions."""
    action: str = Field(..., description="Description of the containment action")
    executed_by: str = Field(..., description="ID of agent that executed the action")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Execution timestamp")
    result: str = Field(..., description="Result of the action")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class Incident(BaseModel):
    """Incident model for security and operational events."""
    incident_id: str = Field(..., description="Unique identifier for the incident")
    severity: IncidentSeverity = Field(..., description="Incident severity level")
    type: IncidentType = Field(..., description="Type of incident")
    description: str = Field(..., description="Incident description")
    affected_systems: List[str] = Field(default_factory=list, description="List of affected systems")
    detected_by: str = Field(..., description="ID of agent that detected the incident")
    detection_time: datetime = Field(default_factory=datetime.utcnow, description="Detection timestamp")
    containment_actions: List[ContainmentAction] = Field(default_factory=list, description="Containment actions taken")
    status: IncidentStatus = Field(default=IncidentStatus.OPEN, description="Current incident status")
    human_involvement: bool = Field(default=False, description="Whether human intervention was required")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AgentMessage(BaseModel):
    """Message model for inter-agent communication."""
    message_id: str = Field(..., description="Unique message identifier")
    sender_id: str = Field(..., description="ID of sending agent")
    recipient_id: str = Field(..., description="ID of receiving agent")
    message_type: str = Field(..., description="Type of message")
    payload: Dict[str, Any] = Field(default_factory=dict, description="Message payload")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }