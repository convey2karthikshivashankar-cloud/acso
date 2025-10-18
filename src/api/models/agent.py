"""
Agent models for ACSO API Gateway.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class AgentType(str, Enum):
    """Agent types in the system."""
    SUPERVISOR = "supervisor"
    THREAT_HUNTER = "threat_hunter"
    INCIDENT_RESPONSE = "incident_response"
    SERVICE_ORCHESTRATION = "service_orchestration"
    FINANCIAL_INTELLIGENCE = "financial_intelligence"


class AgentStatus(str, Enum):
    """Agent status enumeration."""
    RUNNING = "running"
    STOPPED = "stopped"
    STARTING = "starting"
    STOPPING = "stopping"
    ERROR = "error"
    MAINTENANCE = "maintenance"


class AgentCapability(BaseModel):
    """Agent capability definition."""
    name: str = Field(..., description="Capability name")
    description: str = Field(..., description="Capability description")
    enabled: bool = Field(default=True, description="Whether capability is enabled")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Capability parameters")


class AgentConfiguration(BaseModel):
    """Agent configuration model."""
    max_concurrent_tasks: int = Field(default=5, ge=1, le=100, description="Maximum concurrent tasks")
    timeout_seconds: int = Field(default=300, ge=1, le=3600, description="Task timeout in seconds")
    retry_attempts: int = Field(default=3, ge=0, le=10, description="Number of retry attempts")
    log_level: str = Field(default="INFO", description="Logging level")
    capabilities: List[AgentCapability] = Field(default_factory=list, description="Agent capabilities")
    custom_settings: Dict[str, Any] = Field(default_factory=dict, description="Custom agent settings")
    
    @validator('log_level')
    def validate_log_level(cls, v):
        valid_levels = ['DEBUG', 'INFO', 'WARNING', 'ERROR', 'CRITICAL']
        if v.upper() not in valid_levels:
            raise ValueError(f'Log level must be one of: {valid_levels}')
        return v.upper()


class ConfigurationVersion(BaseModel):
    """Configuration version model."""
    version: int = Field(..., description="Version number")
    configuration: AgentConfiguration = Field(..., description="Configuration data")
    created_at: datetime = Field(..., description="Creation timestamp")
    created_by: str = Field(..., description="User who created this version")
    description: Optional[str] = Field(None, description="Version description")
    is_active: bool = Field(default=False, description="Whether this is the active version")
    tags: List[str] = Field(default_factory=list, description="Version tags")


class ConfigurationTemplate(BaseModel):
    """Configuration template model."""
    id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    agent_type: AgentType = Field(..., description="Target agent type")
    configuration: AgentConfiguration = Field(..., description="Template configuration")
    created_at: datetime = Field(..., description="Creation timestamp")
    created_by: str = Field(..., description="Template creator")
    is_default: bool = Field(default=False, description="Whether this is a default template")
    tags: List[str] = Field(default_factory=list, description="Template tags")


class ConfigurationValidationResult(BaseModel):
    """Configuration validation result."""
    valid: bool = Field(..., description="Whether configuration is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")


class ConfigurationDiff(BaseModel):
    """Configuration difference model."""
    field: str = Field(..., description="Field name")
    old_value: Any = Field(..., description="Old value")
    new_value: Any = Field(..., description="New value")
    change_type: str = Field(..., description="Type of change (added, removed, modified)")


class ConfigurationComparison(BaseModel):
    """Configuration comparison result."""
    version_a: int = Field(..., description="First version number")
    version_b: int = Field(..., description="Second version number")
    differences: List[ConfigurationDiff] = Field(..., description="List of differences")
    summary: Dict[str, int] = Field(..., description="Summary of changes")


class BulkConfigurationRequest(BaseModel):
    """Bulk configuration update request."""
    agent_ids: List[str] = Field(..., description="List of agent IDs to update")
    configuration: AgentConfiguration = Field(..., description="New configuration")
    description: Optional[str] = Field(None, description="Update description")
    apply_immediately: bool = Field(default=False, description="Apply configuration immediately")
    backup_current: bool = Field(default=True, description="Backup current configurations")


class BulkConfigurationResult(BaseModel):
    """Bulk configuration update result."""
    total_agents: int = Field(..., description="Total number of agents")
    successful_updates: int = Field(..., description="Number of successful updates")
    failed_updates: int = Field(..., description="Number of failed updates")
    results: Dict[str, Dict[str, Any]] = Field(..., description="Per-agent results")
    backup_id: Optional[str] = Field(None, description="Backup ID if created")


class AgentMetrics(BaseModel):
    """Agent performance metrics."""
    tasks_completed: int = Field(default=0, description="Total tasks completed")
    tasks_failed: int = Field(default=0, description="Total tasks failed")
    average_execution_time: float = Field(default=0.0, description="Average task execution time")
    cpu_usage_percent: float = Field(default=0.0, ge=0, le=100, description="CPU usage percentage")
    memory_usage_mb: float = Field(default=0.0, ge=0, description="Memory usage in MB")
    uptime_seconds: int = Field(default=0, ge=0, description="Agent uptime in seconds")
    last_activity: Optional[datetime] = Field(None, description="Last activity timestamp")
    error_rate: float = Field(default=0.0, ge=0, le=1, description="Error rate (0-1)")
    throughput_per_minute: float = Field(default=0.0, ge=0, description="Tasks per minute")


class AgentHealth(BaseModel):
    """Agent health status."""
    status: AgentStatus = Field(..., description="Current agent status")
    healthy: bool = Field(..., description="Overall health status")
    last_heartbeat: Optional[datetime] = Field(None, description="Last heartbeat timestamp")
    checks: Dict[str, bool] = Field(default_factory=dict, description="Health check results")
    issues: List[str] = Field(default_factory=list, description="Current health issues")
    uptime: int = Field(default=0, ge=0, description="Uptime in seconds")


class AgentInfo(BaseModel):
    """Complete agent information."""
    id: str = Field(..., description="Agent unique identifier")
    name: str = Field(..., description="Agent display name")
    type: AgentType = Field(..., description="Agent type")
    version: str = Field(..., description="Agent version")
    description: Optional[str] = Field(None, description="Agent description")
    status: AgentStatus = Field(..., description="Current status")
    configuration: AgentConfiguration = Field(..., description="Agent configuration")
    metrics: AgentMetrics = Field(..., description="Performance metrics")
    health: AgentHealth = Field(..., description="Health status")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    tags: List[str] = Field(default_factory=list, description="Agent tags")
    
    class Config:
        use_enum_values = True


class AgentCreateRequest(BaseModel):
    """Agent creation request."""
    name: str = Field(..., min_length=1, max_length=100, description="Agent name")
    type: AgentType = Field(..., description="Agent type")
    description: Optional[str] = Field(None, max_length=500, description="Agent description")
    configuration: Optional[AgentConfiguration] = Field(None, description="Initial configuration")
    tags: List[str] = Field(default_factory=list, description="Agent tags")
    auto_start: bool = Field(default=False, description="Auto-start agent after creation")


class AgentUpdateRequest(BaseModel):
    """Agent update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Agent name")
    description: Optional[str] = Field(None, max_length=500, description="Agent description")
    configuration: Optional[AgentConfiguration] = Field(None, description="Updated configuration")
    tags: Optional[List[str]] = Field(None, description="Updated tags")


class AgentActionRequest(BaseModel):
    """Agent action request."""
    action: str = Field(..., description="Action to perform")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action parameters")
    timeout: Optional[int] = Field(None, ge=1, le=3600, description="Action timeout in seconds")


class AgentActionResponse(BaseModel):
    """Agent action response."""
    action: str = Field(..., description="Action performed")
    success: bool = Field(..., description="Whether action succeeded")
    message: str = Field(..., description="Action result message")
    data: Optional[Dict[str, Any]] = Field(None, description="Action result data")
    execution_time: float = Field(..., description="Execution time in seconds")
    timestamp: datetime = Field(default_factory=datetime.utcnow, description="Action timestamp")


class AgentLogEntry(BaseModel):
    """Agent log entry."""
    timestamp: datetime = Field(..., description="Log timestamp")
    level: str = Field(..., description="Log level")
    message: str = Field(..., description="Log message")
    component: Optional[str] = Field(None, description="Component that generated the log")
    task_id: Optional[str] = Field(None, description="Associated task ID")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class AgentTask(BaseModel):
    """Agent task information."""
    id: str = Field(..., description="Task unique identifier")
    agent_id: str = Field(..., description="Agent ID")
    type: str = Field(..., description="Task type")
    status: str = Field(..., description="Task status")
    priority: int = Field(default=5, ge=1, le=10, description="Task priority (1-10)")
    created_at: datetime = Field(..., description="Task creation time")
    started_at: Optional[datetime] = Field(None, description="Task start time")
    completed_at: Optional[datetime] = Field(None, description="Task completion time")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Task parameters")
    result: Optional[Dict[str, Any]] = Field(None, description="Task result")
    error: Optional[str] = Field(None, description="Error message if failed")
    progress: float = Field(default=0.0, ge=0, le=100, description="Task progress percentage")


class AgentListFilters(BaseModel):
    """Filters for agent listing."""
    type: Optional[AgentType] = Field(None, description="Filter by agent type")
    status: Optional[AgentStatus] = Field(None, description="Filter by status")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    healthy: Optional[bool] = Field(None, description="Filter by health status")
    name_contains: Optional[str] = Field(None, description="Filter by name containing text")


class AgentSummary(BaseModel):
    """Agent summary for list views."""
    id: str = Field(..., description="Agent ID")
    name: str = Field(..., description="Agent name")
    type: AgentType = Field(..., description="Agent type")
    status: AgentStatus = Field(..., description="Current status")
    healthy: bool = Field(..., description="Health status")
    tasks_completed: int = Field(..., description="Total completed tasks")
    error_rate: float = Field(..., description="Current error rate")
    uptime: int = Field(..., description="Uptime in seconds")
    last_activity: Optional[datetime] = Field(None, description="Last activity")
    tags: List[str] = Field(default_factory=list, description="Agent tags")
    
    class Config:
        use_enum_values = True


class AgentStatistics(BaseModel):
    """System-wide agent statistics."""
    total_agents: int = Field(..., description="Total number of agents")
    running_agents: int = Field(..., description="Number of running agents")
    healthy_agents: int = Field(..., description="Number of healthy agents")
    agents_by_type: Dict[str, int] = Field(..., description="Agent count by type")
    agents_by_status: Dict[str, int] = Field(..., description="Agent count by status")
    total_tasks_completed: int = Field(..., description="Total tasks completed")
    average_error_rate: float = Field(..., description="Average error rate across all agents")
    system_uptime: int = Field(..., description="System uptime in seconds")


# Default configurations for different agent types
DEFAULT_CONFIGURATIONS = {
    AgentType.SUPERVISOR: AgentConfiguration(
        max_concurrent_tasks=10,
        timeout_seconds=600,
        retry_attempts=2,
        log_level="INFO",
        capabilities=[
            AgentCapability(
                name="coordination",
                description="Coordinate other agents",
                enabled=True
            ),
            AgentCapability(
                name="monitoring",
                description="Monitor system health",
                enabled=True
            )
        ]
    ),
    AgentType.THREAT_HUNTER: AgentConfiguration(
        max_concurrent_tasks=5,
        timeout_seconds=1800,
        retry_attempts=3,
        log_level="INFO",
        capabilities=[
            AgentCapability(
                name="threat_detection",
                description="Detect security threats",
                enabled=True
            ),
            AgentCapability(
                name="log_analysis",
                description="Analyze security logs",
                enabled=True
            )
        ]
    ),
    AgentType.INCIDENT_RESPONSE: AgentConfiguration(
        max_concurrent_tasks=3,
        timeout_seconds=3600,
        retry_attempts=2,
        log_level="INFO",
        capabilities=[
            AgentCapability(
                name="incident_handling",
                description="Handle security incidents",
                enabled=True
            ),
            AgentCapability(
                name="containment",
                description="Contain security threats",
                enabled=True
            )
        ]
    ),
    AgentType.SERVICE_ORCHESTRATION: AgentConfiguration(
        max_concurrent_tasks=8,
        timeout_seconds=900,
        retry_attempts=3,
        log_level="INFO",
        capabilities=[
            AgentCapability(
                name="service_management",
                description="Manage system services",
                enabled=True
            ),
            AgentCapability(
                name="automation",
                description="Automate operational tasks",
                enabled=True
            )
        ]
    ),
    AgentType.FINANCIAL_INTELLIGENCE: AgentConfiguration(
        max_concurrent_tasks=4,
        timeout_seconds=1200,
        retry_attempts=2,
        log_level="INFO",
        capabilities=[
            AgentCapability(
                name="cost_analysis",
                description="Analyze system costs",
                enabled=True
            ),
            AgentCapability(
                name="roi_calculation",
                description="Calculate return on investment",
                enabled=True
            )
        ]
    )
}