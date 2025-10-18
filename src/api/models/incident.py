"""
Incident management models for ACSO API Gateway.
"""

from datetime import datetime
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum


class IncidentSeverity(str, Enum):
    """Incident severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class IncidentStatus(str, Enum):
    """Incident status values."""
    OPEN = "open"
    INVESTIGATING = "investigating"
    IDENTIFIED = "identified"
    MONITORING = "monitoring"
    RESOLVED = "resolved"
    CLOSED = "closed"


class IncidentPriority(str, Enum):
    """Incident priority levels."""
    P1 = "p1"  # Critical - immediate response
    P2 = "p2"  # High - response within 1 hour
    P3 = "p3"  # Medium - response within 4 hours
    P4 = "p4"  # Low - response within 24 hours


class IncidentCategory(str, Enum):
    """Incident categories."""
    SECURITY = "security"
    PERFORMANCE = "performance"
    AVAILABILITY = "availability"
    DATA = "data"
    NETWORK = "network"
    HARDWARE = "hardware"
    SOFTWARE = "software"
    PROCESS = "process"
    OTHER = "other"


class EvidenceType(str, Enum):
    """Types of incident evidence."""
    LOG = "log"
    SCREENSHOT = "screenshot"
    DOCUMENT = "document"
    NETWORK_CAPTURE = "network_capture"
    MEMORY_DUMP = "memory_dump"
    CONFIGURATION = "configuration"
    METRICS = "metrics"
    OTHER = "other"


class IncidentEvidence(BaseModel):
    """Incident evidence item."""
    id: str = Field(..., description="Evidence unique identifier")
    type: EvidenceType = Field(..., description="Type of evidence")
    name: str = Field(..., description="Evidence name")
    description: Optional[str] = Field(None, description="Evidence description")
    file_path: Optional[str] = Field(None, description="File path if applicable")
    content: Optional[str] = Field(None, description="Text content")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    collected_at: datetime = Field(..., description="When evidence was collected")
    collected_by: str = Field(..., description="Who collected the evidence")
    hash: Optional[str] = Field(None, description="File hash for integrity")
    size_bytes: Optional[int] = Field(None, description="File size in bytes")


class IncidentTimelineEntry(BaseModel):
    """Timeline entry for incident tracking."""
    id: str = Field(..., description="Timeline entry ID")
    timestamp: datetime = Field(..., description="When the event occurred")
    event_type: str = Field(..., description="Type of event")
    title: str = Field(..., description="Event title")
    description: str = Field(..., description="Event description")
    user_id: Optional[str] = Field(None, description="User who created the entry")
    automated: bool = Field(default=False, description="Whether entry was automated")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional event data")


class IncidentAssignment(BaseModel):
    """Incident assignment information."""
    assigned_to: str = Field(..., description="User ID of assignee")
    assigned_by: str = Field(..., description="User ID who made assignment")
    assigned_at: datetime = Field(..., description="Assignment timestamp")
    role: str = Field(..., description="Role in incident (lead, investigator, etc.)")
    active: bool = Field(default=True, description="Whether assignment is active")


class IncidentEscalation(BaseModel):
    """Incident escalation information."""
    id: str = Field(..., description="Escalation ID")
    escalated_to: str = Field(..., description="User/team escalated to")
    escalated_by: str = Field(..., description="User who escalated")
    escalated_at: datetime = Field(..., description="Escalation timestamp")
    reason: str = Field(..., description="Reason for escalation")
    previous_assignee: Optional[str] = Field(None, description="Previous assignee")
    escalation_level: int = Field(..., description="Escalation level (1, 2, 3, etc.)")


class IncidentComment(BaseModel):
    """Comment on an incident."""
    id: str = Field(..., description="Comment ID")
    content: str = Field(..., description="Comment content")
    author_id: str = Field(..., description="Comment author")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    is_internal: bool = Field(default=False, description="Whether comment is internal only")
    mentions: List[str] = Field(default_factory=list, description="Mentioned user IDs")


class IncidentTag(BaseModel):
    """Tag for categorizing incidents."""
    name: str = Field(..., description="Tag name")
    color: Optional[str] = Field(None, description="Tag color")
    description: Optional[str] = Field(None, description="Tag description")


class IncidentMetrics(BaseModel):
    """Metrics related to incident impact."""
    affected_users: Optional[int] = Field(None, description="Number of affected users")
    affected_systems: List[str] = Field(default_factory=list, description="Affected system IDs")
    downtime_minutes: Optional[float] = Field(None, description="Downtime in minutes")
    revenue_impact: Optional[float] = Field(None, description="Revenue impact estimate")
    sla_breach: bool = Field(default=False, description="Whether SLA was breached")
    mttr_minutes: Optional[float] = Field(None, description="Mean time to resolution")


class Incident(BaseModel):
    """Main incident model."""
    id: str = Field(..., description="Incident unique identifier")
    title: str = Field(..., description="Incident title")
    description: str = Field(..., description="Incident description")
    severity: IncidentSeverity = Field(..., description="Incident severity")
    priority: IncidentPriority = Field(..., description="Incident priority")
    status: IncidentStatus = Field(..., description="Current status")
    category: IncidentCategory = Field(..., description="Incident category")
    
    # Timestamps
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    detected_at: Optional[datetime] = Field(None, description="When incident was detected")
    acknowledged_at: Optional[datetime] = Field(None, description="When incident was acknowledged")
    resolved_at: Optional[datetime] = Field(None, description="When incident was resolved")
    closed_at: Optional[datetime] = Field(None, description="When incident was closed")
    
    # People
    reporter_id: str = Field(..., description="User who reported the incident")
    assignments: List[IncidentAssignment] = Field(default_factory=list, description="Current assignments")
    escalations: List[IncidentEscalation] = Field(default_factory=list, description="Escalation history")
    
    # Content
    timeline: List[IncidentTimelineEntry] = Field(default_factory=list, description="Incident timeline")
    comments: List[IncidentComment] = Field(default_factory=list, description="Comments")
    evidence: List[IncidentEvidence] = Field(default_factory=list, description="Evidence items")
    tags: List[IncidentTag] = Field(default_factory=list, description="Tags")
    
    # Metrics and impact
    metrics: Optional[IncidentMetrics] = Field(None, description="Impact metrics")
    
    # Related items
    related_incidents: List[str] = Field(default_factory=list, description="Related incident IDs")
    workflow_ids: List[str] = Field(default_factory=list, description="Associated workflow IDs")
    
    # Metadata
    source: Optional[str] = Field(None, description="How incident was created")
    external_id: Optional[str] = Field(None, description="External system ID")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")


class IncidentCreateRequest(BaseModel):
    """Request to create a new incident."""
    title: str = Field(..., min_length=1, max_length=200, description="Incident title")
    description: str = Field(..., min_length=1, description="Incident description")
    severity: IncidentSeverity = Field(..., description="Incident severity")
    priority: Optional[IncidentPriority] = Field(None, description="Incident priority")
    category: IncidentCategory = Field(..., description="Incident category")
    detected_at: Optional[datetime] = Field(None, description="When incident was detected")
    affected_systems: Optional[List[str]] = Field(None, description="Affected system IDs")
    tags: Optional[List[str]] = Field(None, description="Initial tags")
    source: Optional[str] = Field(None, description="How incident was created")
    external_id: Optional[str] = Field(None, description="External system ID")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class IncidentUpdateRequest(BaseModel):
    """Request to update an incident."""
    title: Optional[str] = Field(None, min_length=1, max_length=200, description="Incident title")
    description: Optional[str] = Field(None, min_length=1, description="Incident description")
    severity: Optional[IncidentSeverity] = Field(None, description="Incident severity")
    priority: Optional[IncidentPriority] = Field(None, description="Incident priority")
    status: Optional[IncidentStatus] = Field(None, description="Incident status")
    category: Optional[IncidentCategory] = Field(None, description="Incident category")
    tags: Optional[List[str]] = Field(None, description="Tags")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class IncidentAssignRequest(BaseModel):
    """Request to assign incident to user."""
    assigned_to: str = Field(..., description="User ID to assign to")
    role: str = Field(default="investigator", description="Role in incident")


class IncidentEscalateRequest(BaseModel):
    """Request to escalate incident."""
    escalated_to: str = Field(..., description="User/team to escalate to")
    reason: str = Field(..., description="Reason for escalation")
    escalation_level: Optional[int] = Field(None, description="Escalation level")


class IncidentCommentRequest(BaseModel):
    """Request to add comment to incident."""
    content: str = Field(..., min_length=1, description="Comment content")
    is_internal: bool = Field(default=False, description="Whether comment is internal only")
    mentions: Optional[List[str]] = Field(None, description="User IDs to mention")


class IncidentEvidenceRequest(BaseModel):
    """Request to add evidence to incident."""
    type: EvidenceType = Field(..., description="Type of evidence")
    name: str = Field(..., description="Evidence name")
    description: Optional[str] = Field(None, description="Evidence description")
    content: Optional[str] = Field(None, description="Text content")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class IncidentListFilters(BaseModel):
    """Filters for incident listing."""
    status: Optional[List[IncidentStatus]] = Field(None, description="Filter by status")
    severity: Optional[List[IncidentSeverity]] = Field(None, description="Filter by severity")
    priority: Optional[List[IncidentPriority]] = Field(None, description="Filter by priority")
    category: Optional[List[IncidentCategory]] = Field(None, description="Filter by category")
    assigned_to: Optional[str] = Field(None, description="Filter by assignee")
    reporter_id: Optional[str] = Field(None, description="Filter by reporter")
    tags: Optional[List[str]] = Field(None, description="Filter by tags")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")
    text_search: Optional[str] = Field(None, description="Text search in title/description")


class IncidentSummary(BaseModel):
    """Incident summary for list views."""
    id: str = Field(..., description="Incident ID")
    title: str = Field(..., description="Incident title")
    severity: IncidentSeverity = Field(..., description="Incident severity")
    priority: IncidentPriority = Field(..., description="Incident priority")
    status: IncidentStatus = Field(..., description="Current status")
    category: IncidentCategory = Field(..., description="Incident category")
    created_at: datetime = Field(..., description="Creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    reporter_id: str = Field(..., description="Reporter user ID")
    current_assignees: List[str] = Field(default_factory=list, description="Current assignee IDs")
    tags: List[str] = Field(default_factory=list, description="Tag names")
    comment_count: int = Field(default=0, description="Number of comments")
    evidence_count: int = Field(default=0, description="Number of evidence items")
    
    class Config:
        use_enum_values = True


class IncidentStatistics(BaseModel):
    """Incident system statistics."""
    total_incidents: int = Field(..., description="Total number of incidents")
    open_incidents: int = Field(..., description="Number of open incidents")
    incidents_by_severity: Dict[str, int] = Field(..., description="Incident count by severity")
    incidents_by_status: Dict[str, int] = Field(..., description="Incident count by status")
    incidents_by_category: Dict[str, int] = Field(..., description="Incident count by category")
    average_resolution_time: float = Field(..., description="Average resolution time in hours")
    incidents_created_today: int = Field(..., description="Incidents created today")
    incidents_resolved_today: int = Field(..., description="Incidents resolved today")
    sla_breach_rate: float = Field(..., description="SLA breach rate (0-1)")


class IncidentReport(BaseModel):
    """Incident report data."""
    report_id: str = Field(..., description="Report ID")
    title: str = Field(..., description="Report title")
    period_start: datetime = Field(..., description="Report period start")
    period_end: datetime = Field(..., description="Report period end")
    generated_at: datetime = Field(..., description="Report generation time")
    generated_by: str = Field(..., description="User who generated report")
    statistics: IncidentStatistics = Field(..., description="Report statistics")
    trends: Dict[str, Any] = Field(..., description="Trend analysis")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations")


class IncidentBulkAction(BaseModel):
    """Bulk action on multiple incidents."""
    incident_ids: List[str] = Field(..., description="Incident IDs to act on")
    action: str = Field(..., description="Action to perform")
    parameters: Dict[str, Any] = Field(default_factory=dict, description="Action parameters")


class IncidentTemplate(BaseModel):
    """Template for creating incidents."""
    id: str = Field(..., description="Template ID")
    name: str = Field(..., description="Template name")
    description: str = Field(..., description="Template description")
    category: IncidentCategory = Field(..., description="Default category")
    severity: IncidentSeverity = Field(..., description="Default severity")
    priority: IncidentPriority = Field(..., description="Default priority")
    title_template: str = Field(..., description="Title template")
    description_template: str = Field(..., description="Description template")
    default_tags: List[str] = Field(default_factory=list, description="Default tags")
    checklist: List[str] = Field(default_factory=list, description="Response checklist")
    created_by: str = Field(..., description="Template creator")
    created_at: datetime = Field(..., description="Creation timestamp")
    usage_count: int = Field(default=0, description="Number of times used")