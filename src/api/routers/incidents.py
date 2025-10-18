"""
Incident management API endpoints.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse
import json
import io

from ..models.incident import (
    Incident, IncidentCreateRequest, IncidentUpdateRequest, IncidentAssignRequest,
    IncidentEscalateRequest, IncidentCommentRequest, IncidentEvidenceRequest,
    IncidentListFilters, IncidentSummary, IncidentStatistics, IncidentReport,
    IncidentBulkAction, IncidentTemplate, IncidentStatus, IncidentSeverity,
    IncidentPriority, IncidentCategory, IncidentComment, IncidentEvidence,
    IncidentTimelineEntry
)
from ..models.responses import APIResponse, PaginatedResponse
from ..dependencies import get_current_user, get_pagination_params, PaginationParams
from ..services.incident_service import incident_service
from ..websocket.manager import websocket_manager

router = APIRouter()

# Incident CRUD Operations

@router.get("/", response_model=APIResponse[PaginatedResponse[IncidentSummary]])
async def get_incidents(
    status: Optional[List[IncidentStatus]] = Query(None, description="Filter by incident status"),
    severity: Optional[List[IncidentSeverity]] = Query(None, description="Filter by severity"),
    priority: Optional[List[IncidentPriority]] = Query(None, description="Filter by priority"),
    category: Optional[List[IncidentCategory]] = Query(None, description="Filter by category"),
    assigned_to: Optional[str] = Query(None, description="Filter by assignee"),
    reporter_id: Optional[str] = Query(None, description="Filter by reporter"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    created_after: Optional[datetime] = Query(None, description="Filter by creation date"),
    created_before: Optional[datetime] = Query(None, description="Filter by creation date"),
    text_search: Optional[str] = Query(None, description="Text search in title/description"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get list of incidents with comprehensive filtering and pagination."""
    try:
        filters = IncidentListFilters(
            status=status,
            severity=severity,
            priority=priority,
            category=category,
            assigned_to=assigned_to,
            reporter_id=reporter_id,
            tags=tags,
            created_after=created_after,
            created_before=created_before,
            text_search=text_search
        )
        
        incidents, total = await incident_service.get_incidents(
            filters=filters,
            limit=pagination.size,
            offset=pagination.offset,
            user_id=current_user["user_id"]
        )
        
        paginated_response = PaginatedResponse(
            items=incidents,
            total=total,
            page=pagination.page,
            size=pagination.size,
            pages=(total + pagination.size - 1) // pagination.size
        )
        
        return APIResponse(
            success=True,
            data=paginated_response,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{incident_id}", response_model=APIResponse[Incident])
async def get_incident(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get detailed information about a specific incident."""
    try:
        incident = await incident_service.get_incident(incident_id, current_user["user_id"])
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        return APIResponse(
            success=True,
            data=incident,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=APIResponse[Incident])
async def create_incident(
    incident_data: IncidentCreateRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new incident."""
    try:
        incident = await incident_service.create_incident(
            incident_data,
            current_user["user_id"]
        )
        
        # Notify relevant users about new incident
        background_tasks.add_task(
            incident_service.notify_incident_created,
            incident.id,
            current_user["user_id"]
        )
        
        # Broadcast to connected clients
        await websocket_manager.broadcast_to_topic(
            "incidents",
            {
                "type": "incident_created",
                "incident_id": incident.id,
                "incident_title": incident.title,
                "severity": incident.severity.value,
                "created_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=incident,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{incident_id}", response_model=APIResponse[Incident])
async def update_incident(
    incident_id: str,
    incident_data: IncidentUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing incident."""
    try:
        incident = await incident_service.update_incident(
            incident_id,
            incident_data,
            current_user["user_id"]
        )
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Broadcast update to connected clients
        await websocket_manager.broadcast_to_topic(
            f"incident_{incident_id}",
            {
                "type": "incident_updated",
                "incident_id": incident_id,
                "updated_by": current_user["user_id"],
                "changes": incident_data.dict(exclude_unset=True)
            }
        )
        
        return APIResponse(
            success=True,
            data=incident,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Response Actions and Workflows

@router.get("/{incident_id}/actions", response_model=APIResponse[List[Dict[str, Any]]])
async def get_incident_actions(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get available response actions for an incident."""
    try:
        actions = await incident_service.get_available_actions(incident_id, current_user["user_id"])
        
        return APIResponse(
            success=True,
            data=actions,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{incident_id}/actions/{action_id}/execute", response_model=APIResponse[Dict[str, Any]])
async def execute_incident_action(
    incident_id: str,
    action_id: str,
    params: Optional[Dict[str, Any]] = None,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Execute a response action for an incident."""
    try:
        result = await incident_service.execute_action(
            incident_id,
            action_id,
            params or {},
            current_user["user_id"]
        )
        
        # Execute action in background if it's long-running
        if result.get("async_execution"):
            background_tasks.add_task(
                incident_service.monitor_action_execution,
                incident_id,
                action_id,
                result["execution_id"]
            )
        
        return APIResponse(
            success=True,
            data=result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{incident_id}/workflows/{workflow_id}/trigger", response_model=APIResponse[Dict[str, Any]])
async def trigger_incident_workflow(
    incident_id: str,
    workflow_id: str,
    workflow_params: Optional[Dict[str, Any]] = None,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Trigger a workflow for an incident."""
    try:
        result = await incident_service.trigger_workflow(
            incident_id,
            workflow_id,
            workflow_params or {},
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))@
router.delete("/{incident_id}", response_model=APIResponse[Dict[str, str]])
async def delete_incident(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete an incident."""
    try:
        success = await incident_service.delete_incident(incident_id, current_user["user_id"])
        if not success:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Broadcast deletion to connected clients
        await websocket_manager.broadcast_to_topic(
            "incidents",
            {
                "type": "incident_deleted",
                "incident_id": incident_id,
                "deleted_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data={"message": f"Incident {incident_id} deleted successfully"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Incident Assignment and Escalation

@router.post("/{incident_id}/assign", response_model=APIResponse[Incident])
async def assign_incident(
    incident_id: str,
    assign_request: IncidentAssignRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Assign an incident to a user."""
    try:
        incident = await incident_service.assign_incident(
            incident_id,
            assign_request,
            current_user["user_id"]
        )
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Notify assigned user
        await websocket_manager.broadcast_to_user(
            assign_request.assigned_to,
            {
                "type": "incident_assigned",
                "incident_id": incident_id,
                "incident_title": incident.title,
                "assigned_by": current_user["user_id"],
                "role": assign_request.role
            }
        )
        
        return APIResponse(
            success=True,
            data=incident,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{incident_id}/escalate", response_model=APIResponse[Incident])
async def escalate_incident(
    incident_id: str,
    escalate_request: IncidentEscalateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Escalate an incident."""
    try:
        incident = await incident_service.escalate_incident(
            incident_id,
            escalate_request,
            current_user["user_id"]
        )
        
        if not incident:
            raise HTTPException(status_code=404, detail="Incident not found")
        
        # Notify escalated user/team
        await websocket_manager.broadcast_to_user(
            escalate_request.escalated_to,
            {
                "type": "incident_escalated",
                "incident_id": incident_id,
                "incident_title": incident.title,
                "escalated_by": current_user["user_id"],
                "reason": escalate_request.reason
            }
        )
        
        return APIResponse(
            success=True,
            data=incident,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Comments and Timeline

@router.get("/{incident_id}/timeline", response_model=APIResponse[List[IncidentTimelineEntry]])
async def get_incident_timeline(
    incident_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get timeline events for an incident."""
    try:
        timeline = await incident_service.get_incident_timeline(incident_id, current_user["user_id"])
        
        return APIResponse(
            success=True,
            data=timeline,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{incident_id}/comments", response_model=APIResponse[IncidentComment])
async def add_incident_comment(
    incident_id: str,
    comment_request: IncidentCommentRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Add a comment to an incident."""
    try:
        comment = await incident_service.add_comment(
            incident_id,
            comment_request,
            current_user["user_id"]
        )
        
        # Broadcast comment to incident subscribers
        await websocket_manager.broadcast_to_topic(
            f"incident_{incident_id}",
            {
                "type": "comment_added",
                "incident_id": incident_id,
                "comment": {
                    "id": comment.id,
                    "content": comment.content,
                    "author_id": comment.author_id,
                    "created_at": comment.created_at.isoformat(),
                    "is_internal": comment.is_internal
                }
            }
        )
        
        # Notify mentioned users
        if comment_request.mentions:
            for user_id in comment_request.mentions:
                await websocket_manager.broadcast_to_user(
                    user_id,
                    {
                        "type": "mentioned_in_comment",
                        "incident_id": incident_id,
                        "comment_id": comment.id,
                        "mentioned_by": current_user["user_id"]
                    }
                )
        
        return APIResponse(
            success=True,
            data=comment,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{incident_id}/comments", response_model=APIResponse[List[IncidentComment]])
async def get_incident_comments(
    incident_id: str,
    include_internal: bool = Query(True, description="Include internal comments"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get comments for an incident."""
    try:
        comments = await incident_service.get_comments(
            incident_id,
            include_internal,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=comments,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Evidence Management

@router.post("/{incident_id}/evidence", response_model=APIResponse[IncidentEvidence])
async def add_incident_evidence(
    incident_id: str,
    evidence_request: IncidentEvidenceRequest,
    file: Optional[UploadFile] = File(None),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Add evidence to an incident."""
    try:
        evidence = await incident_service.add_evidence(
            incident_id,
            evidence_request,
            file,
            current_user["user_id"]
        )
        
        # Broadcast evidence addition
        await websocket_manager.broadcast_to_topic(
            f"incident_{incident_id}",
            {
                "type": "evidence_added",
                "incident_id": incident_id,
                "evidence_id": evidence.id,
                "evidence_type": evidence.type.value,
                "added_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=evidence,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{incident_id}/evidence", response_model=APIResponse[List[IncidentEvidence]])
async def get_incident_evidence(
    incident_id: str,
    evidence_type: Optional[str] = Query(None, description="Filter by evidence type"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get evidence for an incident."""
    try:
        evidence = await incident_service.get_evidence(
            incident_id,
            evidence_type,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=evidence,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{incident_id}/evidence/{evidence_id}", response_model=APIResponse[Dict[str, str]])
async def delete_incident_evidence(
    incident_id: str,
    evidence_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete evidence from an incident."""
    try:
        success = await incident_service.delete_evidence(
            incident_id,
            evidence_id,
            current_user["user_id"]
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Evidence not found")
        
        return APIResponse(
            success=True,
            data={"message": "Evidence deleted successfully"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Statistics and Reporting

@router.get("/statistics/overview", response_model=APIResponse[IncidentStatistics])
async def get_incident_statistics(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get incident system statistics."""
    try:
        statistics = await incident_service.get_statistics(current_user["user_id"])
        
        return APIResponse(
            success=True,
            data=statistics,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reports/generate", response_model=APIResponse[IncidentReport])
async def generate_incident_report(
    period_start: datetime = Query(..., description="Report period start"),
    period_end: datetime = Query(..., description="Report period end"),
    title: str = Query("Incident Report", description="Report title"),
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate an incident report."""
    try:
        report = await incident_service.generate_report(
            period_start,
            period_end,
            title,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=report,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Bulk Operations

@router.post("/bulk-action", response_model=APIResponse[Dict[str, Any]])
async def perform_bulk_action(
    bulk_action: IncidentBulkAction,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Perform bulk action on multiple incidents."""
    try:
        result = await incident_service.perform_bulk_action(
            bulk_action,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Templates

@router.get("/templates/", response_model=APIResponse[List[IncidentTemplate]])
async def get_incident_templates(
    category: Optional[IncidentCategory] = Query(None, description="Filter by category"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get incident templates."""
    try:
        templates = await incident_service.get_templates(category, current_user["user_id"])
        
        return APIResponse(
            success=True,
            data=templates,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/{template_id}/use", response_model=APIResponse[Incident])
async def create_incident_from_template(
    template_id: str,
    template_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create an incident from a template."""
    try:
        incident = await incident_service.create_from_template(
            template_id,
            template_data,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=incident,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))