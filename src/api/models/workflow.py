"""
Workflow models for ACSO API Gateway.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class WorkflowStatus(str, Enum):
    """Workflow execution status."""
    DRAFT = "draft"
    ACTIVE = "active"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    ARCHIVED = "archived"


class WorkflowNodeType(str, Enum):
    """Workflow node types."""
    START = "start"
    END = "end"
    TASK = "task"
    DECISION = "decision"
    PARALLEL = "parallel"
    MERGE = "merge"
    DELAY = "delay"
    WEBHOOK = "webhook"
    SCRIPT = "script"
    APPROVAL = "approval"
    NOTIFICATION = "notification"


class WorkflowTriggerType(str, Enum):
    """Workflow trigger types."""
    MANUAL = "manual"
    SCHEDULED = "scheduled"
    EVENT = "event"
    WEBHOOK = "webhook"
    API = "api"


class WorkflowNodePosition(BaseModel):
    """Node position in workflow designer."""
    x: float = Field(..., description="X coordinate")
    y: float = Field(..., description="Y coordinate")


class WorkflowNodeConfig(BaseModel):
    """Workflow node configuration."""
    agent_id: Optional[str] = Field(None, description="Target agent ID")
    action: Optional[str] = Field(None, description="Action to perform")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Node parameters")
    timeout_seconds: int = Field(default=300, ge=1, le=3600, description="Node timeout")
    retry_attempts: int = Field(default=3, ge=0, le=10, description="Retry attempts")
    conditions: Dict[str, Any] = Field(default_factory=dict, description="Execution conditions")
    approval_required: bool = Field(default=False, description="Requires human approval")
    approvers: List[str] = Field(default_factory=list, description="List of approver user IDs")


class WorkflowNode(BaseModel):
    """Workflow node definition."""
    id: str = Field(..., description="Node unique identifier")
    name: str = Field(..., description="Node display name")
    type: WorkflowNodeType = Field(..., description="Node type")
    description: Optional[str] = Field(None, description="Node description")
    position: WorkflowNodePosition = Field(..., description="Node position")
    config: WorkflowNodeConfig = Field(..., description="Node configuration")
    enabled: bool = Field(default=True, description="Whether node is enabled")


class WorkflowEdge(BaseModel):
    """Workflow edge (connection between nodes)."""
    id: str = Field(..., description="Edge unique identifier")
    source_node_id: str = Field(..., description="Source node ID")
    target_node_id: str = Field(..., description="Target node ID")
    condition: Optional[str] = Field(None, description="Edge condition")
    label: Optional[str] = Field(None, description="Edge label")


class WorkflowTrigger(BaseModel):
    """Workflow trigger configuration."""
    type: WorkflowTriggerType = Field(..., description="Trigger type")
    config: Dict[str, Any] = Field(default_factory=dict, description="Trigger configuration")
    enabled: bool = Field(default=True, description="Whether trigger is enabled")


class WorkflowVariable(BaseModel):
    """Workflow variable definition."""
    name: str = Field(..., description="Variable name")
    type: str = Field(..., description="Variable type")
    default_value: Any = Field(None, description="Default value")
    description: Optional[str] = Field(None, description="Variable description")
    required: bool = Field(default=False, description="Whether variable is required")


class WorkflowDefinition(BaseModel):
    """Complete workflow definition."""
    id: str = Field(..., description="Workflow unique identifier")
    name: str = Field(..., description="Workflow name")
    description: Optional[str] = Field(None, description="Workflow description")
    version: str = Field(default="1.0.0", description="Workflow version")
    nodes: List[WorkflowNode] = Field(..., description="Workflow nodes")
    edges: List[WorkflowEdge] = Field(..., description="Workflow edges")
    triggers: List[WorkflowTrigger] = Field(default_factory=list, description="Workflow triggers")
    variables: List[WorkflowVariable] = Field(default_factory=list, description="Workflow variables")
    tags: List[str] = Field(default_factory=list, description="Workflow tags")
    created_at: datetime = Field(..., description="Creation timestamp")
    created_by: str = Field(..., description="Creator user ID")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    updated_by: Optional[str] = Field(None, description="Last updater user ID")
    status: WorkflowStatus = Field(default=WorkflowStatus.DRAFT, description="Workflow status")


class WorkflowExecutionStatus(str, Enum):
    """Workflow execution status."""
    PENDING = "pending"
    RUNNING = "running"
    WAITING_APPROVAL = "waiting_approval"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    TIMEOUT = "timeout"


class WorkflowNodeExecution(BaseModel):
    """Workflow node execution information."""
    node_id: str = Field(..., description="Node ID")
    status: WorkflowExecutionStatus = Field(..., description="Execution status")
    started_at: Optional[datetime] = Field(None, description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    duration_seconds: Optional[float] = Field(None, description="Execution duration")
    input_data: Dict[str, Any] = Field(default_factory=dict, description="Node input data")
    output_data: Dict[str, Any] = Field(default_factory=dict, description="Node output data")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    retry_count: int = Field(default=0, description="Number of retries attempted")
    logs: List[str] = Field(default_factory=list, description="Execution logs")


class WorkflowExecution(BaseModel):
    """Workflow execution instance."""
    id: str = Field(..., description="Execution unique identifier")
    workflow_id: str = Field(..., description="Workflow ID")
    workflow_version: str = Field(..., description="Workflow version")
    status: WorkflowExecutionStatus = Field(..., description="Execution status")
    started_at: datetime = Field(..., description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    duration_seconds: Optional[float] = Field(None, description="Total execution duration")
    triggered_by: str = Field(..., description="User or system that triggered execution")
    trigger_type: WorkflowTriggerType = Field(..., description="Trigger type")
    input_variables: Dict[str, Any] = Field(default_factory=dict, description="Input variables")
    output_variables: Dict[str, Any] = Field(default_factory=dict, description="Output variables")
    node_executions: List[WorkflowNodeExecution] = Field(default_factory=list, description="Node executions")
    error_message: Optional[str] = Field(None, description="Error message if failed")
    progress_percentage: float = Field(default=0.0, ge=0, le=100, description="Execution progress")


class WorkflowTemplate(BaseModel):
    """Workflow template."""
    id: str = Field(..., description="Template unique identifier")
    name: str = Field(..., description="Template name")
    description: Optional[str] = Field(None, description="Template description")
    category: str = Field(..., description="Template category")
    workflow_definition: WorkflowDefinition = Field(..., description="Template workflow")
    created_at: datetime = Field(..., description="Creation timestamp")
    created_by: str = Field(..., description="Creator user ID")
    is_public: bool = Field(default=False, description="Whether template is public")
    usage_count: int = Field(default=0, description="Number of times used")
    tags: List[str] = Field(default_factory=list, description="Template tags")


class WorkflowCreateRequest(BaseModel):
    """Workflow creation request."""
    name: str = Field(..., min_length=1, max_length=100, description="Workflow name")
    description: Optional[str] = Field(None, max_length=500, description="Workflow description")
    nodes: List[WorkflowNode] = Field(..., description="Workflow nodes")
    edges: List[WorkflowEdge] = Field(..., description="Workflow edges")
    triggers: List[WorkflowTrigger] = Field(default_factory=list, description="Workflow triggers")
    variables: List[WorkflowVariable] = Field(default_factory=list, description="Workflow variables")
    tags: List[str] = Field(default_factory=list, description="Workflow tags")
    template_id: Optional[str] = Field(None, description="Template ID if created from template")


class WorkflowUpdateRequest(BaseModel):
    """Workflow update request."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Workflow name")
    description: Optional[str] = Field(None, max_length=500, description="Workflow description")
    nodes: Optional[List[WorkflowNode]] = Field(None, description="Workflow nodes")
    edges: Optional[List[WorkflowEdge]] = Field(None, description="Workflow edges")
    triggers: Optional[List[WorkflowTrigger]] = Field(None, description="Workflow triggers")
    variables: Optional[List[WorkflowVariable]] = Field(None, description="Workflow variables")
    tags: Optional[List[str]] = Field(None, description="Workflow tags")
    status: Optional[WorkflowStatus] = Field(None, description="Workflow status")


class WorkflowExecutionRequest(BaseModel):
    """Workflow execution request."""
    input_variables: Dict[str, Any] = Field(default_factory=dict, description="Input variables")
    trigger_type: WorkflowTriggerType = Field(default=WorkflowTriggerType.MANUAL, description="Trigger type")
    priority: int = Field(default=5, ge=1, le=10, description="Execution priority")
    timeout_seconds: Optional[int] = Field(None, ge=1, le=86400, description="Execution timeout")


class WorkflowValidationResult(BaseModel):
    """Workflow validation result."""
    valid: bool = Field(..., description="Whether workflow is valid")
    errors: List[str] = Field(default_factory=list, description="Validation errors")
    warnings: List[str] = Field(default_factory=list, description="Validation warnings")
    suggestions: List[str] = Field(default_factory=list, description="Improvement suggestions")


class WorkflowListFilters(BaseModel):
    """Filters for workflow listing."""
    status: Optional[WorkflowStatus] = Field(None, description="Filter by status")
    created_by: Optional[str] = Field(None, description="Filter by creator")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    name_contains: Optional[str] = Field(None, description="Filter by name containing text")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")


class WorkflowSummary(BaseModel):
    """Workflow summary for list views."""
    id: str = Field(..., description="Workflow ID")
    name: str = Field(..., description="Workflow name")
    description: Optional[str] = Field(None, description="Workflow description")
    status: WorkflowStatus = Field(..., description="Workflow status")
    version: str = Field(..., description="Workflow version")
    created_at: datetime = Field(..., description="Creation timestamp")
    created_by: str = Field(..., description="Creator user ID")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    node_count: int = Field(..., description="Number of nodes")
    execution_count: int = Field(default=0, description="Number of executions")
    last_execution: Optional[datetime] = Field(None, description="Last execution timestamp")
    tags: List[str] = Field(default_factory=list, description="Workflow tags")
    
    class Config:
        use_enum_values = True


class WorkflowExecutionSummary(BaseModel):
    """Workflow execution summary for list views."""
    id: str = Field(..., description="Execution ID")
    workflow_id: str = Field(..., description="Workflow ID")
    workflow_name: str = Field(..., description="Workflow name")
    status: WorkflowExecutionStatus = Field(..., description="Execution status")
    started_at: datetime = Field(..., description="Start timestamp")
    completed_at: Optional[datetime] = Field(None, description="Completion timestamp")
    duration_seconds: Optional[float] = Field(None, description="Execution duration")
    triggered_by: str = Field(..., description="User who triggered execution")
    trigger_type: WorkflowTriggerType = Field(..., description="Trigger type")
    progress_percentage: float = Field(..., description="Execution progress")
    
    class Config:
        use_enum_values = True


class WorkflowStatistics(BaseModel):
    """Workflow system statistics."""
    total_workflows: int = Field(..., description="Total number of workflows")
    active_workflows: int = Field(..., description="Number of active workflows")
    running_executions: int = Field(..., description="Number of running executions")
    workflows_by_status: Dict[str, int] = Field(..., description="Workflow count by status")
    executions_by_status: Dict[str, int] = Field(..., description="Execution count by status")
    total_executions_today: int = Field(..., description="Total executions today")
    average_execution_time: float = Field(..., description="Average execution time in seconds")
    success_rate: float = Field(..., description="Success rate (0-1)")


class WorkflowApprovalRequest(BaseModel):
    """Workflow approval request."""
    execution_id: str = Field(..., description="Execution ID")
    node_id: str = Field(..., description="Node ID requiring approval")
    approved: bool = Field(..., description="Whether approved")
    comment: Optional[str] = Field(None, description="Approval comment")


class WorkflowApproval(BaseModel):
    """Workflow approval record."""
    id: str = Field(..., description="Approval ID")
    execution_id: str = Field(..., description="Execution ID")
    node_id: str = Field(..., description="Node ID")
    requested_at: datetime = Field(..., description="Request timestamp")
    requested_by: str = Field(..., description="User who requested approval")
    approved_at: Optional[datetime] = Field(None, description="Approval timestamp")
    approved_by: Optional[str] = Field(None, description="User who approved")
    approved: Optional[bool] = Field(None, description="Approval decision")
    comment: Optional[str] = Field(None, description="Approval comment")
    timeout_at: Optional[datetime] = Field(None, description="Approval timeout")


class WorkflowImportRequest(BaseModel):
    """Workflow import request."""
    workflow_data: Dict[str, Any] = Field(..., description="Workflow data to import")
    name_override: Optional[str] = Field(None, description="Override workflow name")
    import_executions: bool = Field(default=False, description="Import execution history")
    merge_strategy: str = Field(default="replace", description="Merge strategy (replace, merge)")


class WorkflowExportRequest(BaseModel):
    """Workflow export request."""
    workflow_ids: List[str] = Field(..., description="Workflow IDs to export")
    include_executions: bool = Field(default=False, description="Include execution history")
    include_templates: bool = Field(default=False, description="Include as templates")
    format: str = Field(default="json", description="Export format")


class WorkflowShareRequest(BaseModel):
    """Workflow sharing request."""
    workflow_id: str = Field(..., description="Workflow ID to share")
    user_ids: List[str] = Field(..., description="User IDs to share with")
    permissions: List[str] = Field(..., description="Permissions to grant")
    message: Optional[str] = Field(None, description="Sharing message")