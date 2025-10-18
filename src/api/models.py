"""
API models for request/response serialization.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Generic, TypeVar
from pydantic import BaseModel, Field
from enum import Enum

# Generic type for API responses
T = TypeVar('T')

class APIResponse(BaseModel, Generic[T]):
    """Standard API response wrapper."""
    success: bool = Field(..., description="Whether the request was successful")
    data: Optional[T] = Field(None, description="Response data")
    error: Optional[Dict[str, Any]] = Field(None, description="Error information if request failed")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Response timestamp")
    request_id: Optional[str] = Field(None, description="Request ID for tracking")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }

class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response wrapper."""
    items: List[T] = Field(..., description="List of items")
    total: int = Field(..., description="Total number of items")
    page: int = Field(..., description="Current page number")
    size: int = Field(..., description="Page size")
    pages: int = Field(..., description="Total number of pages")

# Agent-related models
class AgentStatus(str, Enum):
    """Agent status enumeration."""
    ACTIVE = "active"
    IDLE = "idle"
    PROCESSING = "processing"
    ERROR = "error"
    OFFLINE = "offline"

class AgentType(str, Enum):
    """Agent type enumeration."""
    SUPERVISOR = "supervisor"
    THREAT_HUNTER = "threat-hunter"
    INCIDENT_RESPONSE = "incident-response"
    SERVICE_ORCHESTRATION = "service-orchestration"
    FINANCIAL_INTELLIGENCE = "financial-intelligence"

class Agent(BaseModel):
    """Agent information model."""
    agent_id: str = Field(..., description="Unique agent identifier")
    agent_type: AgentType = Field(..., description="Type of agent")
    status: AgentStatus = Field(..., description="Current agent status")
    name: str = Field(..., description="Human-readable agent name")
    description: str = Field(..., description="Agent description")
    capabilities: List[str] = Field(default_factory=list, description="Agent capabilities")
    current_task: Optional[str] = Field(None, description="Currently executing task ID")
    last_activity: datetime = Field(..., description="Last activity timestamp")
    metrics: Dict[str, Any] = Field(default_factory=dict, description="Agent metrics")

class AgentConfiguration(BaseModel):
    """Agent configuration model."""
    agent_id: str = Field(..., description="Agent identifier")
    config: Dict[str, Any] = Field(..., description="Configuration parameters")
    version: str = Field(..., description="Configuration version")
    updated_by: str = Field(..., description="User who updated the configuration")
    updated_at: datetime = Field(default_factory=datetime.utcnow, description="Update timestamp")

class AgentMetrics(BaseModel):
    """Agent metrics model."""
    agent_id: str = Field(..., description="Agent identifier")
    timestamp: datetime = Field(..., description="Metrics timestamp")
    cpu_usage: float = Field(..., description="CPU usage percentage")
    memory_usage: float = Field(..., description="Memory usage percentage")
    task_count: int = Field(..., description="Number of tasks processed")
    success_rate: float = Field(..., description="Task success rate")
    avg_response_time: float = Field(..., description="Average response time in milliseconds")

# Task and Workflow models
class TaskStatus(str, Enum):
    """Task status enumeration."""
    PENDING = "pending"
    IN_PROGRESS = "in-progress"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"

class TaskPriority(str, Enum):
    """Task priority enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class Task(BaseModel):
    """Task model."""
    task_id: str = Field(..., description="Unique task identifier")
    type: str = Field(..., description="Task type")
    description: str = Field(..., description="Task description")
    priority: TaskPriority = Field(..., description="Task priority")
    status: TaskStatus = Field(..., description="Current task status")
    assigned_agent: Optional[str] = Field(None, description="Assigned agent ID")
    context: Dict[str, Any] = Field(default_factory=dict, description="Task context")
    results: Dict[str, Any] = Field(default_factory=dict, description="Task results")
    created_at: datetime = Field(..., description="Creation timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")

class WorkflowStatus(str, Enum):
    """Workflow status enumeration."""
    DRAFT = "draft"
    ACTIVE = "active"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"

class WorkflowNode(BaseModel):
    """Workflow node model."""
    node_id: str = Field(..., description="Node identifier")
    type: str = Field(..., description="Node type")
    name: str = Field(..., description="Node name")
    config: Dict[str, Any] = Field(default_factory=dict, description="Node configuration")
    position: Dict[str, float] = Field(..., description="Node position in workflow designer")

class WorkflowEdge(BaseModel):
    """Workflow edge model."""
    edge_id: str = Field(..., description="Edge identifier")
    source: str = Field(..., description="Source node ID")
    target: str = Field(..., description="Target node ID")
    condition: Optional[str] = Field(None, description="Edge condition")

class Workflow(BaseModel):
    """Workflow model."""
    workflow_id: str = Field(..., description="Unique workflow identifier")
    name: str = Field(..., description="Workflow name")
    description: str = Field(..., description="Workflow description")
    status: WorkflowStatus = Field(..., description="Workflow status")
    nodes: List[WorkflowNode] = Field(..., description="Workflow nodes")
    edges: List[WorkflowEdge] = Field(..., description="Workflow edges")
    created_by: str = Field(..., description="Creator user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    tags: List[str] = Field(default_factory=list, description="Workflow tags")

class WorkflowExecution(BaseModel):
    """Workflow execution model."""
    execution_id: str = Field(..., description="Execution identifier")
    workflow_id: str = Field(..., description="Workflow identifier")
    status: TaskStatus = Field(..., description="Execution status")
    started_at: datetime = Field(..., description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    results: Dict[str, Any] = Field(default_factory=dict, description="Execution results")
    error: Optional[str] = Field(None, description="Error message if failed")

# Incident models
class IncidentSeverity(str, Enum):
    """Incident severity enumeration."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class IncidentStatus(str, Enum):
    """Incident status enumeration."""
    OPEN = "open"
    INVESTIGATING = "investigating"
    CONTAINED = "contained"
    RESOLVED = "resolved"
    CLOSED = "closed"

class Incident(BaseModel):
    """Incident model."""
    incident_id: str = Field(..., description="Unique incident identifier")
    title: str = Field(..., description="Incident title")
    description: str = Field(..., description="Incident description")
    severity: IncidentSeverity = Field(..., description="Incident severity")
    status: IncidentStatus = Field(..., description="Incident status")
    category: str = Field(..., description="Incident category")
    source: str = Field(..., description="Detection source")
    assigned_to: Optional[str] = Field(None, description="Assigned user ID")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: datetime = Field(..., description="Last update timestamp")
    resolved_at: Optional[datetime] = Field(None, description="Resolution timestamp")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    tags: List[str] = Field(default_factory=list, description="Incident tags")

class TimelineEvent(BaseModel):
    """Timeline event model."""
    event_id: str = Field(..., description="Event identifier")
    incident_id: str = Field(..., description="Related incident ID")
    type: str = Field(..., description="Event type")
    description: str = Field(..., description="Event description")
    timestamp: datetime = Field(..., description="Event timestamp")
    user_id: Optional[str] = Field(None, description="User who triggered the event")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Event metadata")

class ResponseAction(BaseModel):
    """Response action model."""
    action_id: str = Field(..., description="Action identifier")
    incident_id: str = Field(..., description="Related incident ID")
    name: str = Field(..., description="Action name")
    description: str = Field(..., description="Action description")
    status: TaskStatus = Field(..., description="Action status")
    executed_by: Optional[str] = Field(None, description="Executor ID")
    executed_at: Optional[datetime] = Field(None, description="Execution timestamp")
    results: Dict[str, Any] = Field(default_factory=dict, description="Action results")

# Financial models
class CostData(BaseModel):
    """Cost data model."""
    date: datetime = Field(..., description="Date of cost data")
    service: str = Field(..., description="Service name")
    cost: float = Field(..., description="Cost amount")
    currency: str = Field(default="USD", description="Currency code")
    region: Optional[str] = Field(None, description="AWS region")
    tags: Dict[str, str] = Field(default_factory=dict, description="Cost allocation tags")

class CostBreakdown(BaseModel):
    """Cost breakdown model."""
    dimension: str = Field(..., description="Breakdown dimension")
    value: str = Field(..., description="Dimension value")
    cost: float = Field(..., description="Cost amount")
    percentage: float = Field(..., description="Percentage of total cost")

class ROICalculation(BaseModel):
    """ROI calculation input model."""
    investment: float = Field(..., description="Investment amount")
    benefits: List[float] = Field(..., description="Expected benefits over time")
    time_period: int = Field(..., description="Time period in months")
    discount_rate: float = Field(default=0.1, description="Discount rate")

class ROIResults(BaseModel):
    """ROI calculation results model."""
    roi_percentage: float = Field(..., description="ROI percentage")
    npv: float = Field(..., description="Net Present Value")
    payback_period: float = Field(..., description="Payback period in months")
    irr: float = Field(..., description="Internal Rate of Return")

# Search models
class SearchQuery(BaseModel):
    """Search query model."""
    query: str = Field(..., description="Search query string")
    filters: Dict[str, Any] = Field(default_factory=dict, description="Search filters")
    sort: Optional[str] = Field(None, description="Sort field")
    order: str = Field(default="desc", description="Sort order")
    limit: int = Field(default=20, description="Result limit")
    offset: int = Field(default=0, description="Result offset")

class SearchResult(BaseModel, Generic[T]):
    """Search result model."""
    items: List[T] = Field(..., description="Search result items")
    total: int = Field(..., description="Total number of results")
    query: str = Field(..., description="Original query")
    took: int = Field(..., description="Search time in milliseconds")
    facets: Dict[str, Any] = Field(default_factory=dict, description="Search facets")

# Authentication models
class LoginRequest(BaseModel):
    """Login request model."""
    username: str = Field(..., description="Username")
    password: str = Field(..., description="Password")
    remember_me: bool = Field(default=False, description="Remember login")

class LoginResponse(BaseModel):
    """Login response model."""
    access_token: str = Field(..., description="Access token")
    refresh_token: str = Field(..., description="Refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration in seconds")
    user: Dict[str, Any] = Field(..., description="User information")

class User(BaseModel):
    """User model."""
    user_id: str = Field(..., description="User identifier")
    username: str = Field(..., description="Username")
    email: str = Field(..., description="Email address")
    full_name: str = Field(..., description="Full name")
    roles: List[str] = Field(..., description="User roles")
    permissions: List[str] = Field(..., description="User permissions")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    created_at: datetime = Field(..., description="Account creation timestamp")

# WebSocket models
class WebSocketMessage(BaseModel):
    """WebSocket message model."""
    type: str = Field(..., description="Message type")
    data: Dict[str, Any] = Field(..., description="Message data")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Message timestamp")
    source: Optional[str] = Field(None, description="Message source")

# Request models for API endpoints
class CreateWorkflowRequest(BaseModel):
    """Create workflow request model."""
    name: str = Field(..., description="Workflow name")
    description: str = Field(..., description="Workflow description")
    nodes: List[WorkflowNode] = Field(..., description="Workflow nodes")
    edges: List[WorkflowEdge] = Field(..., description="Workflow edges")
    tags: List[str] = Field(default_factory=list, description="Workflow tags")

class UpdateWorkflowRequest(BaseModel):
    """Update workflow request model."""
    name: Optional[str] = Field(None, description="Workflow name")
    description: Optional[str] = Field(None, description="Workflow description")
    nodes: Optional[List[WorkflowNode]] = Field(None, description="Workflow nodes")
    edges: Optional[List[WorkflowEdge]] = Field(None, description="Workflow edges")
    tags: Optional[List[str]] = Field(None, description="Workflow tags")

class CreateIncidentRequest(BaseModel):
    """Create incident request model."""
    title: str = Field(..., description="Incident title")
    description: str = Field(..., description="Incident description")
    severity: IncidentSeverity = Field(..., description="Incident severity")
    category: str = Field(..., description="Incident category")
    source: str = Field(..., description="Detection source")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    tags: List[str] = Field(default_factory=list, description="Incident tags")

class UpdateIncidentRequest(BaseModel):
    """Update incident request model."""
    title: Optional[str] = Field(None, description="Incident title")
    description: Optional[str] = Field(None, description="Incident description")
    severity: Optional[IncidentSeverity] = Field(None, description="Incident severity")
    status: Optional[IncidentStatus] = Field(None, description="Incident status")
    category: Optional[str] = Field(None, description="Incident category")
    assigned_to: Optional[str] = Field(None, description="Assigned user ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    tags: Optional[List[str]] = Field(None, description="Incident tags")