"""
Workflow management API endpoints.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime
from fastapi import APIRouter, HTTPException, Depends, Query, BackgroundTasks, UploadFile, File
from fastapi.responses import StreamingResponse
import json
import io

from ..models.workflow import (
    WorkflowDefinition, WorkflowExecution, WorkflowCreateRequest, WorkflowUpdateRequest,
    WorkflowExecutionRequest, WorkflowValidationResult, WorkflowListFilters,
    WorkflowSummary, WorkflowExecutionSummary, WorkflowStatistics, WorkflowTemplate,
    WorkflowApprovalRequest, WorkflowApproval, WorkflowImportRequest, WorkflowExportRequest,
    WorkflowShareRequest, WorkflowStatus, WorkflowExecutionStatus, WorkflowTriggerType
)
from ..models.responses import APIResponse, PaginatedResponse
from ..dependencies import get_current_user, get_pagination_params, PaginationParams
from ..services.workflow_service import WorkflowService
from ..websocket.manager import websocket_manager

router = APIRouter()
workflow_service = WorkflowService()

# Workflow CRUD Operations

@router.get("/", response_model=APIResponse[PaginatedResponse[WorkflowSummary]])
async def get_workflows(
    status: Optional[WorkflowStatus] = Query(None, description="Filter by workflow status"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    created_by: Optional[str] = Query(None, description="Filter by creator"),
    name_contains: Optional[str] = Query(None, description="Filter by name containing text"),
    created_after: Optional[datetime] = Query(None, description="Filter by creation date"),
    created_before: Optional[datetime] = Query(None, description="Filter by creation date"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get list of workflows with optional filtering and pagination."""
    try:
        filters = WorkflowListFilters(
            status=status,
            created_by=created_by,
            tags=tags,
            name_contains=name_contains,
            created_after=created_after,
            created_before=created_before
        )
        
        workflows, total = await workflow_service.get_workflows(
            filters=filters,
            limit=pagination.size,
            offset=pagination.offset,
            user_id=current_user["user_id"]
        )
        
        paginated_response = PaginatedResponse(
            items=workflows,
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

@router.get("/{workflow_id}", response_model=APIResponse[WorkflowDefinition])
async def get_workflow(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get detailed information about a specific workflow."""
    try:
        workflow = await workflow_service.get_workflow(workflow_id, current_user["user_id"])
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        return APIResponse(
            success=True,
            data=workflow,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/", response_model=APIResponse[WorkflowDefinition])
async def create_workflow(
    workflow_data: WorkflowCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new workflow."""
    try:
        workflow = await workflow_service.create_workflow(
            workflow_data,
            current_user["user_id"]
        )
        
        # Notify connected clients about new workflow
        await websocket_manager.broadcast_to_topic(
            "workflows",
            {
                "type": "workflow_created",
                "workflow_id": workflow.id,
                "workflow_name": workflow.name,
                "created_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=workflow,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/{workflow_id}", response_model=APIResponse[WorkflowDefinition])
async def update_workflow(
    workflow_id: str,
    workflow_data: WorkflowUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing workflow."""
    try:
        workflow = await workflow_service.update_workflow(
            workflow_id,
            workflow_data,
            current_user["user_id"]
        )
        
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Notify connected clients about workflow update
        await websocket_manager.broadcast_to_topic(
            "workflows",
            {
                "type": "workflow_updated",
                "workflow_id": workflow.id,
                "workflow_name": workflow.name,
                "updated_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=workflow,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{workflow_id}", response_model=APIResponse[Dict[str, str]])
async def delete_workflow(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a workflow."""
    try:
        success = await workflow_service.delete_workflow(workflow_id, current_user["user_id"])
        if not success:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        # Notify connected clients about workflow deletion
        await websocket_manager.broadcast_to_topic(
            "workflows",
            {
                "type": "workflow_deleted",
                "workflow_id": workflow_id,
                "deleted_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data={"message": f"Workflow {workflow_id} deleted successfully"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Workflow Validation

@router.post("/{workflow_id}/validate", response_model=APIResponse[WorkflowValidationResult])
async def validate_workflow(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Validate a workflow definition."""
    try:
        validation_result = await workflow_service.validate_workflow(workflow_id, current_user["user_id"])
        
        return APIResponse(
            success=True,
            data=validation_result,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/validate", response_model=APIResponse[WorkflowValidationResult])
async def validate_workflow_definition(
    workflow_data: WorkflowCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Validate a workflow definition without saving it."""
    try:
        validation_result = await workflow_service.validate_workflow_definition(workflow_data)
        
        return APIResponse(
            success=True,
            data=validation_result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Workflow Execution Management

@router.post("/{workflow_id}/execute", response_model=APIResponse[WorkflowExecution])
async def execute_workflow(
    workflow_id: str,
    execution_request: WorkflowExecutionRequest,
    background_tasks: BackgroundTasks,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Execute a workflow."""
    try:
        execution = await workflow_service.execute_workflow(
            workflow_id,
            execution_request,
            current_user["user_id"]
        )
        
        # Start background execution monitoring
        background_tasks.add_task(
            workflow_service.monitor_execution,
            execution.id
        )
        
        # Notify connected clients about new execution
        await websocket_manager.broadcast_to_topic(
            f"workflow_executions_{workflow_id}",
            {
                "type": "execution_started",
                "execution_id": execution.id,
                "workflow_id": workflow_id,
                "started_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=execution,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}/executions", response_model=APIResponse[PaginatedResponse[WorkflowExecutionSummary]])
async def get_workflow_executions(
    workflow_id: str,
    status: Optional[WorkflowExecutionStatus] = Query(None, description="Filter by execution status"),
    started_after: Optional[datetime] = Query(None, description="Filter by start date"),
    started_before: Optional[datetime] = Query(None, description="Filter by start date"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get execution history for a workflow."""
    try:
        executions, total = await workflow_service.get_workflow_executions(
            workflow_id,
            status=status,
            started_after=started_after,
            started_before=started_before,
            limit=pagination.size,
            offset=pagination.offset,
            user_id=current_user["user_id"]
        )
        
        paginated_response = PaginatedResponse(
            items=executions,
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

@router.get("/executions/{execution_id}", response_model=APIResponse[WorkflowExecution])
async def get_workflow_execution(
    execution_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get detailed information about a workflow execution."""
    try:
        execution = await workflow_service.get_workflow_execution(execution_id, current_user["user_id"])
        if not execution:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        return APIResponse(
            success=True,
            data=execution,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/executions/{execution_id}/pause", response_model=APIResponse[WorkflowExecution])
async def pause_workflow_execution(
    execution_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Pause a running workflow execution."""
    try:
        execution = await workflow_service.pause_execution(execution_id, current_user["user_id"])
        if not execution:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        # Notify connected clients about execution pause
        await websocket_manager.broadcast_to_topic(
            f"workflow_execution_{execution_id}",
            {
                "type": "execution_paused",
                "execution_id": execution_id,
                "paused_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=execution,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/executions/{execution_id}/resume", response_model=APIResponse[WorkflowExecution])
async def resume_workflow_execution(
    execution_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Resume a paused workflow execution."""
    try:
        execution = await workflow_service.resume_execution(execution_id, current_user["user_id"])
        if not execution:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        # Notify connected clients about execution resume
        await websocket_manager.broadcast_to_topic(
            f"workflow_execution_{execution_id}",
            {
                "type": "execution_resumed",
                "execution_id": execution_id,
                "resumed_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=execution,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/executions/{execution_id}/cancel", response_model=APIResponse[WorkflowExecution])
async def cancel_workflow_execution(
    execution_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Cancel a workflow execution."""
    try:
        execution = await workflow_service.cancel_execution(execution_id, current_user["user_id"])
        if not execution:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        # Notify connected clients about execution cancellation
        await websocket_manager.broadcast_to_topic(
            f"workflow_execution_{execution_id}",
            {
                "type": "execution_cancelled",
                "execution_id": execution_id,
                "cancelled_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=execution,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# Work
flow Templates

@router.get("/templates/", response_model=APIResponse[PaginatedResponse[WorkflowTemplate]])
async def get_workflow_templates(
    category: Optional[str] = Query(None, description="Filter by category"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    is_public: Optional[bool] = Query(None, description="Filter by public status"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get list of workflow templates."""
    try:
        templates, total = await workflow_service.get_workflow_templates(
            category=category,
            tags=tags,
            is_public=is_public,
            limit=pagination.size,
            offset=pagination.offset,
            user_id=current_user["user_id"]
        )
        
        paginated_response = PaginatedResponse(
            items=templates,
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

@router.post("/{workflow_id}/create-template", response_model=APIResponse[WorkflowTemplate])
async def create_workflow_template(
    workflow_id: str,
    name: str = Query(..., description="Template name"),
    description: Optional[str] = Query(None, description="Template description"),
    category: str = Query(..., description="Template category"),
    is_public: bool = Query(False, description="Make template public"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a template from an existing workflow."""
    try:
        template = await workflow_service.create_workflow_template(
            workflow_id,
            name,
            description,
            category,
            is_public,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=template,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/{template_id}/use", response_model=APIResponse[WorkflowDefinition])
async def create_workflow_from_template(
    template_id: str,
    name: str = Query(..., description="New workflow name"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new workflow from a template."""
    try:
        workflow = await workflow_service.create_workflow_from_template(
            template_id,
            name,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=workflow,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Workflow Statistics and Analytics

@router.get("/statistics", response_model=APIResponse[WorkflowStatistics])
async def get_workflow_statistics(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get workflow system statistics."""
    try:
        statistics = await workflow_service.get_workflow_statistics(current_user["user_id"])
        
        return APIResponse(
            success=True,
            data=statistics,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}/statistics", response_model=APIResponse[Dict[str, Any]])
async def get_workflow_analytics(
    workflow_id: str,
    days: int = Query(30, ge=1, le=365, description="Number of days for analytics"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get analytics for a specific workflow."""
    try:
        analytics = await workflow_service.get_workflow_analytics(
            workflow_id,
            days,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=analytics,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Workflow Approval Management

@router.get("/approvals/pending", response_model=APIResponse[PaginatedResponse[WorkflowApproval]])
async def get_pending_approvals(
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get pending workflow approvals for the current user."""
    try:
        approvals, total = await workflow_service.get_pending_approvals(
            current_user["user_id"],
            limit=pagination.size,
            offset=pagination.offset
        )
        
        paginated_response = PaginatedResponse(
            items=approvals,
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

@router.post("/approvals/{approval_id}/respond", response_model=APIResponse[WorkflowApproval])
async def respond_to_approval(
    approval_id: str,
    approval_request: WorkflowApprovalRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Respond to a workflow approval request."""
    try:
        approval = await workflow_service.respond_to_approval(
            approval_id,
            approval_request,
            current_user["user_id"]
        )
        
        # Notify connected clients about approval response
        await websocket_manager.broadcast_to_topic(
            f"workflow_execution_{approval_request.execution_id}",
            {
                "type": "approval_responded",
                "approval_id": approval_id,
                "execution_id": approval_request.execution_id,
                "approved": approval_request.approved,
                "responded_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=approval,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))# Workflo
w Import/Export

@router.post("/import", response_model=APIResponse[List[WorkflowDefinition]])
async def import_workflows(
    file: UploadFile = File(..., description="Workflow file to import"),
    import_request: WorkflowImportRequest = Depends(),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Import workflows from a file."""
    try:
        content = await file.read()
        workflow_data = json.loads(content.decode('utf-8'))
        
        import_request.workflow_data = workflow_data
        workflows = await workflow_service.import_workflows(
            import_request,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=workflows,
            timestamp=datetime.utcnow()
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/export", response_class=StreamingResponse)
async def export_workflows(
    export_request: WorkflowExportRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Export workflows to a file."""
    try:
        export_data = await workflow_service.export_workflows(
            export_request,
            current_user["user_id"]
        )
        
        # Create file stream
        json_str = json.dumps(export_data, indent=2, default=str)
        file_stream = io.StringIO(json_str)
        
        return StreamingResponse(
            io.BytesIO(file_stream.getvalue().encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": "attachment; filename=workflows_export.json"}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Workflow Sharing and Collaboration

@router.post("/{workflow_id}/share", response_model=APIResponse[Dict[str, str]])
async def share_workflow(
    workflow_id: str,
    share_request: WorkflowShareRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Share a workflow with other users."""
    try:
        result = await workflow_service.share_workflow(
            workflow_id,
            share_request,
            current_user["user_id"]
        )
        
        # Notify shared users
        for user_id in share_request.user_ids:
            await websocket_manager.broadcast_to_user(
                user_id,
                {
                    "type": "workflow_shared",
                    "workflow_id": workflow_id,
                    "shared_by": current_user["user_id"],
                    "permissions": share_request.permissions,
                    "message": share_request.message
                }
            )
        
        return APIResponse(
            success=True,
            data=result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}/collaborators", response_model=APIResponse[List[Dict[str, Any]]])
async def get_workflow_collaborators(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get list of workflow collaborators."""
    try:
        collaborators = await workflow_service.get_workflow_collaborators(
            workflow_id,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=collaborators,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/{workflow_id}/collaborators/{user_id}", response_model=APIResponse[Dict[str, str]])
async def remove_workflow_collaborator(
    workflow_id: str,
    user_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Remove a collaborator from a workflow."""
    try:
        result = await workflow_service.remove_workflow_collaborator(
            workflow_id,
            user_id,
            current_user["user_id"]
        )
        
        # Notify removed user
        await websocket_manager.broadcast_to_user(
            user_id,
            {
                "type": "workflow_access_removed",
                "workflow_id": workflow_id,
                "removed_by": current_user["user_id"]
            }
        )
        
        return APIResponse(
            success=True,
            data=result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

# Workflow Testing and Debugging

@router.post("/{workflow_id}/test", response_model=APIResponse[Dict[str, Any]])
async def test_workflow(
    workflow_id: str,
    test_data: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Test a workflow with sample data."""
    try:
        test_result = await workflow_service.test_workflow(
            workflow_id,
            test_data,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=test_result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/executions/{execution_id}/debug", response_model=APIResponse[Dict[str, Any]])
async def get_execution_debug_info(
    execution_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get debug information for a workflow execution."""
    try:
        debug_info = await workflow_service.get_execution_debug_info(
            execution_id,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=debug_info,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))# Workflow
 Execution Monitoring Endpoints

from ..services.workflow_execution_monitor import execution_monitor

@router.get("/executions/active", response_model=APIResponse[List[Dict[str, Any]]])
async def get_active_executions(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get list of all active workflow executions."""
    try:
        active_executions = await execution_monitor.get_active_executions()
        
        # Filter executions based on user access
        accessible_executions = []
        for execution in active_executions:
            if await workflow_service._has_workflow_access(
                execution["workflow_id"], 
                current_user["user_id"]
            ):
                accessible_executions.append(execution)
        
        return APIResponse(
            success=True,
            data=accessible_executions,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/executions/metrics", response_model=APIResponse[Dict[str, Any]])
async def get_execution_metrics(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get workflow execution metrics and statistics."""
    try:
        metrics = await execution_monitor.get_execution_metrics()
        
        return APIResponse(
            success=True,
            data=metrics,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/executions/{execution_id}/status", response_model=APIResponse[Dict[str, Any]])
async def get_execution_real_time_status(
    execution_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get real-time status of a workflow execution."""
    try:
        # Check if execution exists and user has access
        execution = await workflow_service.get_workflow_execution(execution_id, current_user["user_id"])
        if not execution:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        status = await execution_monitor.get_execution_status(execution_id)
        if not status:
            # Execution not actively monitored, return stored data
            status = {
                "execution_id": execution_id,
                "workflow_id": execution.workflow_id,
                "status": execution.status.value,
                "progress": execution.progress_percentage,
                "started_at": execution.started_at.isoformat(),
                "duration": execution.duration_seconds,
                "error_message": execution.error_message,
                "node_count": len(execution.node_executions),
                "completed_nodes": len([
                    ne for ne in execution.node_executions 
                    if ne.status == WorkflowExecutionStatus.COMPLETED
                ]),
                "failed_nodes": len([
                    ne for ne in execution.node_executions 
                    if ne.status == WorkflowExecutionStatus.FAILED
                ]),
                "alerts": []
            }
        
        return APIResponse(
            success=True,
            data=status,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/executions/{execution_id}/subscribe", response_model=APIResponse[Dict[str, str]])
async def subscribe_to_execution_updates(
    execution_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Subscribe to real-time updates for a workflow execution."""
    try:
        # Verify execution exists and user has access
        execution = await workflow_service.get_workflow_execution(execution_id, current_user["user_id"])
        if not execution:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        await execution_monitor.subscribe_to_execution(execution_id, current_user["user_id"])
        
        return APIResponse(
            success=True,
            data={"message": f"Subscribed to execution {execution_id} updates"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/executions/{execution_id}/unsubscribe", response_model=APIResponse[Dict[str, str]])
async def unsubscribe_from_execution_updates(
    execution_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Unsubscribe from real-time updates for a workflow execution."""
    try:
        await execution_monitor.unsubscribe_from_execution(execution_id, current_user["user_id"])
        
        return APIResponse(
            success=True,
            data={"message": f"Unsubscribed from execution {execution_id} updates"},
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/subscribe-executions", response_model=APIResponse[Dict[str, str]])
async def subscribe_to_workflow_executions(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Subscribe to real-time updates for all executions of a workflow."""
    try:
        # Verify workflow exists and user has access
        workflow = await workflow_service.get_workflow(workflow_id, current_user["user_id"])
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        await execution_monitor.subscribe_to_workflow_executions(workflow_id, current_user["user_id"])
        
        return APIResponse(
            success=True,
            data={"message": f"Subscribed to workflow {workflow_id} execution updates"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/unsubscribe-executions", response_model=APIResponse[Dict[str, str]])
async def unsubscribe_from_workflow_executions(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Unsubscribe from real-time updates for workflow executions."""
    try:
        await execution_monitor.unsubscribe_from_workflow_executions(workflow_id, current_user["user_id"])
        
        return APIResponse(
            success=True,
            data={"message": f"Unsubscribed from workflow {workflow_id} execution updates"},
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/executions/subscribe-all", response_model=APIResponse[Dict[str, str]])
async def subscribe_to_all_execution_updates(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Subscribe to real-time updates for all workflow executions."""
    try:
        await execution_monitor.subscribe_to_all_executions(current_user["user_id"])
        
        return APIResponse(
            success=True,
            data={"message": "Subscribed to all execution updates"},
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/executions/unsubscribe-all", response_model=APIResponse[Dict[str, str]])
async def unsubscribe_from_all_execution_updates(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Unsubscribe from real-time updates for all workflow executions."""
    try:
        await execution_monitor.unsubscribe_from_all_executions(current_user["user_id"])
        
        return APIResponse(
            success=True,
            data={"message": "Unsubscribed from all execution updates"},
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/executions/{execution_id}/history", response_model=APIResponse[List[Dict[str, Any]]])
async def get_execution_history(
    execution_id: str,
    include_logs: bool = Query(False, description="Include detailed logs"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get detailed execution history and timeline."""
    try:
        execution = await workflow_service.get_workflow_execution(execution_id, current_user["user_id"])
        if not execution:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        # Build execution timeline
        timeline = []
        
        # Add execution start event
        timeline.append({
            "timestamp": execution.started_at.isoformat(),
            "event_type": "execution_started",
            "description": f"Execution started by {execution.triggered_by}",
            "details": {
                "trigger_type": execution.trigger_type.value,
                "input_variables": execution.input_variables
            }
        })
        
        # Add node execution events
        for node_execution in execution.node_executions:
            if node_execution.started_at:
                timeline.append({
                    "timestamp": node_execution.started_at.isoformat(),
                    "event_type": "node_started",
                    "description": f"Node {node_execution.node_id} started",
                    "details": {
                        "node_id": node_execution.node_id,
                        "input_data": node_execution.input_data if include_logs else {}
                    }
                })
            
            if node_execution.completed_at:
                timeline.append({
                    "timestamp": node_execution.completed_at.isoformat(),
                    "event_type": "node_completed" if node_execution.status == WorkflowExecutionStatus.COMPLETED else "node_failed",
                    "description": f"Node {node_execution.node_id} {node_execution.status.value}",
                    "details": {
                        "node_id": node_execution.node_id,
                        "status": node_execution.status.value,
                        "duration": node_execution.duration_seconds,
                        "output_data": node_execution.output_data if include_logs else {},
                        "error_message": node_execution.error_message,
                        "logs": node_execution.logs if include_logs else []
                    }
                })
        
        # Add execution completion event
        if execution.completed_at:
            timeline.append({
                "timestamp": execution.completed_at.isoformat(),
                "event_type": "execution_completed",
                "description": f"Execution {execution.status.value}",
                "details": {
                    "status": execution.status.value,
                    "duration": execution.duration_seconds,
                    "error_message": execution.error_message,
                    "output_variables": execution.output_variables
                }
            })
        
        # Sort timeline by timestamp
        timeline.sort(key=lambda x: x["timestamp"])
        
        return APIResponse(
            success=True,
            data=timeline,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/executions/{execution_id}/performance", response_model=APIResponse[Dict[str, Any]])
async def get_execution_performance_analysis(
    execution_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get performance analysis for a workflow execution."""
    try:
        execution = await workflow_service.get_workflow_execution(execution_id, current_user["user_id"])
        if not execution:
            raise HTTPException(status_code=404, detail="Workflow execution not found")
        
        # Analyze performance
        analysis = {
            "execution_id": execution_id,
            "total_duration": execution.duration_seconds,
            "node_performance": [],
            "bottlenecks": [],
            "efficiency_score": 0.0,
            "recommendations": []
        }
        
        # Analyze each node
        total_node_time = 0.0
        slowest_node = None
        slowest_duration = 0.0
        
        for node_execution in execution.node_executions:
            if node_execution.duration_seconds:
                total_node_time += node_execution.duration_seconds
                
                node_perf = {
                    "node_id": node_execution.node_id,
                    "duration": node_execution.duration_seconds,
                    "status": node_execution.status.value,
                    "retry_count": node_execution.retry_count,
                    "efficiency": "good"  # Default
                }
                
                # Identify slow nodes
                if node_execution.duration_seconds > slowest_duration:
                    slowest_duration = node_execution.duration_seconds
                    slowest_node = node_execution.node_id
                
                # Mark inefficient nodes
                if node_execution.retry_count > 0:
                    node_perf["efficiency"] = "poor"
                    analysis["bottlenecks"].append({
                        "node_id": node_execution.node_id,
                        "issue": "multiple_retries",
                        "impact": "high"
                    })
                elif node_execution.duration_seconds > 60:  # Over 1 minute
                    node_perf["efficiency"] = "fair"
                    analysis["bottlenecks"].append({
                        "node_id": node_execution.node_id,
                        "issue": "long_execution_time",
                        "impact": "medium"
                    })
                
                analysis["node_performance"].append(node_perf)
        
        # Calculate efficiency score
        if execution.duration_seconds and total_node_time > 0:
            parallel_efficiency = total_node_time / execution.duration_seconds
            analysis["efficiency_score"] = min(parallel_efficiency, 1.0)
        
        # Generate recommendations
        if slowest_node:
            analysis["recommendations"].append(
                f"Consider optimizing node {slowest_node} which took {slowest_duration:.1f}s"
            )
        
        if analysis["efficiency_score"] < 0.5:
            analysis["recommendations"].append(
                "Low efficiency detected. Consider parallelizing independent nodes."
            )
        
        failed_nodes = [ne for ne in execution.node_executions if ne.status == WorkflowExecutionStatus.FAILED]
        if failed_nodes:
            analysis["recommendations"].append(
                f"Address failures in {len(failed_nodes)} node(s) to improve reliability"
            )
        
        return APIResponse(
            success=True,
            data=analysis,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))# Enh
anced Workflow Template Management Endpoints

from ..services.workflow_template_service import template_service

@router.get("/templates/categories", response_model=APIResponse[Dict[str, Dict[str, Any]]])
async def get_template_categories(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get all template categories with statistics."""
    try:
        categories = template_service.get_categories()
        category_stats = await template_service.get_category_statistics()
        
        # Merge category info with statistics
        result = {}
        for category_id, category_info in categories.items():
            result[category_id] = {
                **category_info,
                **category_stats.get(category_id, {
                    "template_count": 0,
                    "total_usage": 0,
                    "average_rating": 0.0
                })
            }
        
        return APIResponse(
            success=True,
            data=result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/popular", response_model=APIResponse[List[Dict[str, Any]]])
async def get_popular_templates(
    limit: int = Query(10, ge=1, le=50, description="Number of templates to return"),
    days: int = Query(30, ge=1, le=365, description="Time period in days"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get most popular workflow templates."""
    try:
        popular_templates = await template_service.get_popular_templates(
            limit=limit,
            time_period_days=days,
            user_id=current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=popular_templates,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/recommended", response_model=APIResponse[List[Dict[str, Any]]])
async def get_recommended_templates(
    limit: int = Query(5, ge=1, le=20, description="Number of recommendations"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get personalized template recommendations."""
    try:
        recommendations = await template_service.get_recommended_templates(
            user_id=current_user["user_id"],
            limit=limit
        )
        
        return APIResponse(
            success=True,
            data=recommendations,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/{template_id}/statistics", response_model=APIResponse[Dict[str, Any]])
async def get_template_statistics(
    template_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get detailed statistics for a template."""
    try:
        statistics = await template_service.get_template_statistics(
            template_id,
            current_user["user_id"]
        )
        
        if not statistics:
            raise HTTPException(status_code=404, detail="Template not found")
        
        return APIResponse(
            success=True,
            data=statistics,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/{template_id}/rate", response_model=APIResponse[Dict[str, str]])
async def rate_template(
    template_id: str,
    rating: int = Query(..., ge=1, le=5, description="Rating from 1 to 5"),
    comment: Optional[str] = Query(None, description="Optional comment"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Rate a workflow template."""
    try:
        success = await template_service.rate_template(
            template_id,
            rating,
            comment,
            current_user["user_id"]
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to rate template")
        
        return APIResponse(
            success=True,
            data={"message": f"Template rated {rating} stars"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/{template_id}/ratings", response_model=APIResponse[List[Dict[str, Any]]])
async def get_template_ratings(
    template_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get ratings and reviews for a template."""
    try:
        ratings = await template_service.get_template_ratings(
            template_id,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=ratings,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/{template_id}/export", response_class=StreamingResponse)
async def export_template(
    template_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Export a template to a portable format."""
    try:
        template_data = await template_service.export_template(
            template_id,
            current_user["user_id"]
        )
        
        if not template_data:
            raise HTTPException(status_code=404, detail="Template not found")
        
        # Create file stream
        json_str = json.dumps(template_data, indent=2, default=str)
        file_stream = io.StringIO(json_str)
        
        template_name = template_data["template_metadata"]["name"].replace(" ", "_")
        filename = f"workflow_template_{template_name}.json"
        
        return StreamingResponse(
            io.BytesIO(file_stream.getvalue().encode('utf-8')),
            media_type="application/json",
            headers={"Content-Disposition": f"attachment; filename={filename}"}
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/templates/import", response_model=APIResponse[WorkflowTemplate])
async def import_template(
    file: UploadFile = File(..., description="Template file to import"),
    name_override: Optional[str] = Query(None, description="Override template name"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Import a template from a file."""
    try:
        content = await file.read()
        template_data = json.loads(content.decode('utf-8'))
        
        template = await template_service.import_template(
            template_data,
            current_user["user_id"],
            name_override
        )
        
        return APIResponse(
            success=True,
            data=template,
            timestamp=datetime.utcnow()
        )
    except json.JSONDecodeError:
        raise HTTPException(status_code=400, detail="Invalid JSON file")
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/templates/{template_id}", response_model=APIResponse[WorkflowTemplate])
async def update_template(
    template_id: str,
    name: Optional[str] = Query(None, description="Template name"),
    description: Optional[str] = Query(None, description="Template description"),
    category: Optional[str] = Query(None, description="Template category"),
    is_public: Optional[bool] = Query(None, description="Make template public"),
    tags: Optional[List[str]] = Query(None, description="Template tags"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update a workflow template."""
    try:
        template = await template_service.update_template(
            template_id,
            name=name,
            description=description,
            category=category,
            is_public=is_public,
            tags=tags,
            user_id=current_user["user_id"]
        )
        
        if not template:
            raise HTTPException(status_code=404, detail="Template not found or access denied")
        
        return APIResponse(
            success=True,
            data=template,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.delete("/templates/{template_id}", response_model=APIResponse[Dict[str, str]])
async def delete_template(
    template_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a workflow template."""
    try:
        success = await template_service.delete_template(
            template_id,
            current_user["user_id"]
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Template not found or access denied")
        
        return APIResponse(
            success=True,
            data={"message": f"Template {template_id} deleted successfully"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/templates/search", response_model=APIResponse[PaginatedResponse[WorkflowTemplate]])
async def search_templates(
    q: str = Query(..., description="Search query"),
    category: Optional[str] = Query(None, description="Filter by category"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    sort_by: str = Query("usage_count", description="Sort field"),
    sort_order: str = Query("desc", description="Sort order (asc/desc)"),
    pagination: PaginationParams = Depends(get_pagination_params),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Search workflow templates."""
    try:
        templates, total = await template_service.get_templates(
            category=category,
            tags=tags,
            search_query=q,
            sort_by=sort_by,
            sort_order=sort_order,
            limit=pagination.size,
            offset=pagination.offset,
            user_id=current_user["user_id"]
        )
        
        paginated_response = PaginatedResponse(
            items=templates,
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
        raise HTTPException(status_code=500, detail=str(e))# Workflow
 Designer Integration Endpoints

from ..services.workflow_designer_service import designer_service

@router.post("/{workflow_id}/design/start", response_model=APIResponse[Dict[str, Any]])
async def start_design_session(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Start a workflow design session."""
    try:
        # Verify workflow exists and user has access
        workflow = await workflow_service.get_workflow(workflow_id, current_user["user_id"])
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        session = await designer_service.start_design_session(
            workflow_id,
            current_user["user_id"],
            workflow
        )
        
        session_info = await designer_service.get_session_info(workflow_id)
        
        return APIResponse(
            success=True,
            data=session_info,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/end", response_model=APIResponse[Dict[str, str]])
async def end_design_session(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """End a workflow design session."""
    try:
        await designer_service.end_design_session(workflow_id, current_user["user_id"])
        
        return APIResponse(
            success=True,
            data={"message": "Design session ended"},
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}/design/session", response_model=APIResponse[Dict[str, Any]])
async def get_design_session_info(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get information about an active design session."""
    try:
        session_info = await designer_service.get_session_info(workflow_id)
        
        if not session_info:
            raise HTTPException(status_code=404, detail="No active design session")
        
        return APIResponse(
            success=True,
            data=session_info,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/change", response_model=APIResponse[Dict[str, Any]])
async def apply_design_change(
    workflow_id: str,
    change_type: str = Query(..., description="Type of change"),
    change_data: Dict[str, Any] = {},
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Apply a change to the workflow design."""
    try:
        change_record = await designer_service.apply_workflow_change(
            workflow_id,
            current_user["user_id"],
            change_type,
            change_data
        )
        
        return APIResponse(
            success=True,
            data={
                "change_id": change_record["id"],
                "version": change_record["version"],
                "timestamp": change_record["timestamp"].isoformat()
            },
            timestamp=datetime.utcnow()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/cursor", response_model=APIResponse[Dict[str, str]])
async def update_cursor_position(
    workflow_id: str,
    position: Dict[str, Any],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update user's cursor position in the designer."""
    try:
        await designer_service.update_cursor_position(
            workflow_id,
            current_user["user_id"],
            position
        )
        
        return APIResponse(
            success=True,
            data={"message": "Cursor position updated"},
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/selection", response_model=APIResponse[Dict[str, str]])
async def update_selection(
    workflow_id: str,
    selected_elements: List[str],
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update user's selected elements in the designer."""
    try:
        await designer_service.update_selection(
            workflow_id,
            current_user["user_id"],
            selected_elements
        )
        
        return APIResponse(
            success=True,
            data={"message": "Selection updated"},
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/validate", response_model=APIResponse[WorkflowValidationResult])
async def validate_workflow_design(
    workflow_id: str,
    workflow_data: WorkflowCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Validate workflow design in real-time."""
    try:
        validation_result = await designer_service.validate_workflow_realtime(
            workflow_id,
            workflow_data
        )
        
        return APIResponse(
            success=True,
            data=validation_result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/test-node", response_model=APIResponse[Dict[str, Any]])
async def test_workflow_node(
    workflow_id: str,
    node_id: str = Query(..., description="Node ID to test"),
    test_data: Dict[str, Any] = {},
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Test a single workflow node with sample data."""
    try:
        test_result = await designer_service.test_workflow_node(
            workflow_id,
            node_id,
            test_data,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=test_result,
            timestamp=datetime.utcnow()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/debug-path", response_model=APIResponse[Dict[str, Any]])
async def debug_workflow_path(
    workflow_id: str,
    start_node_id: str = Query(..., description="Starting node ID"),
    input_data: Dict[str, Any] = {},
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Debug a workflow execution path from a specific node."""
    try:
        debug_result = await designer_service.debug_workflow_path(
            workflow_id,
            start_node_id,
            input_data,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=debug_result,
            timestamp=datetime.utcnow()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}/design/suggestions", response_model=APIResponse[List[Dict[str, Any]]])
async def get_node_suggestions(
    workflow_id: str,
    previous_node_type: Optional[str] = Query(None, description="Previous node type for context"),
    position: Optional[str] = Query(None, description="Position context"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get intelligent node suggestions based on context."""
    try:
        context = {}
        if previous_node_type:
            context["previous_node_type"] = previous_node_type
        if position:
            context["position"] = position
        
        suggestions = await designer_service.get_node_suggestions(workflow_id, context)
        
        return APIResponse(
            success=True,
            data=suggestions,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/{workflow_id}/design/history", response_model=APIResponse[List[Dict[str, Any]]])
async def get_design_change_history(
    workflow_id: str,
    limit: int = Query(50, ge=1, le=200, description="Number of changes to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get change history for workflow design."""
    try:
        # Verify user has access to workflow
        workflow = await workflow_service.get_workflow(workflow_id, current_user["user_id"])
        if not workflow:
            raise HTTPException(status_code=404, detail="Workflow not found")
        
        change_history = await designer_service.get_change_history(
            workflow_id,
            limit=limit,
            offset=offset
        )
        
        return APIResponse(
            success=True,
            data=change_history,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/revert", response_model=APIResponse[Dict[str, str]])
async def revert_to_version(
    workflow_id: str,
    target_version: int = Query(..., description="Target version to revert to"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Revert workflow to a specific version."""
    try:
        success = await designer_service.revert_to_version(
            workflow_id,
            target_version,
            current_user["user_id"]
        )
        
        if not success:
            raise HTTPException(status_code=400, detail="Failed to revert workflow")
        
        return APIResponse(
            success=True,
            data={"message": f"Workflow reverted to version {target_version}"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/lock", response_model=APIResponse[Dict[str, str]])
async def lock_workflow_for_editing(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Lock workflow for exclusive editing."""
    try:
        success = await designer_service.lock_workflow(workflow_id, current_user["user_id"])
        
        if not success:
            raise HTTPException(status_code=409, detail="Workflow is already locked by another user")
        
        return APIResponse(
            success=True,
            data={"message": "Workflow locked for exclusive editing"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/{workflow_id}/design/unlock", response_model=APIResponse[Dict[str, str]])
async def unlock_workflow(
    workflow_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Unlock workflow."""
    try:
        success = await designer_service.unlock_workflow(workflow_id, current_user["user_id"])
        
        if not success:
            raise HTTPException(status_code=400, detail="Cannot unlock workflow")
        
        return APIResponse(
            success=True,
            data={"message": "Workflow unlocked"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/design/node-types", response_model=APIResponse[List[Dict[str, Any]]])
async def get_available_node_types(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get available workflow node types and their configurations."""
    try:
        node_types = [
            {
                "type": "start",
                "name": "Start Node",
                "description": "Workflow entry point",
                "category": "control",
                "icon": "play-circle",
                "color": "#28a745",
                "max_inputs": 0,
                "max_outputs": -1,
                "configurable_properties": []
            },
            {
                "type": "end",
                "name": "End Node", 
                "description": "Workflow completion point",
                "category": "control",
                "icon": "stop-circle",
                "color": "#dc3545",
                "max_inputs": -1,
                "max_outputs": 0,
                "configurable_properties": []
            },
            {
                "type": "task",
                "name": "Task Node",
                "description": "Execute an action or task",
                "category": "action",
                "icon": "cog",
                "color": "#007bff",
                "max_inputs": -1,
                "max_outputs": -1,
                "configurable_properties": [
                    "agent_id", "action", "parameters", "timeout_seconds", "retry_attempts"
                ]
            },
            {
                "type": "decision",
                "name": "Decision Node",
                "description": "Conditional branching logic",
                "category": "logic",
                "icon": "code-branch",
                "color": "#ffc107",
                "max_inputs": 1,
                "max_outputs": -1,
                "configurable_properties": ["conditions"]
            },
            {
                "type": "parallel",
                "name": "Parallel Node",
                "description": "Execute multiple paths simultaneously",
                "category": "control",
                "icon": "arrows-alt-h",
                "color": "#6f42c1",
                "max_inputs": 1,
                "max_outputs": -1,
                "configurable_properties": []
            },
            {
                "type": "merge",
                "name": "Merge Node",
                "description": "Combine multiple execution paths",
                "category": "control",
                "icon": "compress-arrows-alt",
                "color": "#20c997",
                "max_inputs": -1,
                "max_outputs": 1,
                "configurable_properties": []
            },
            {
                "type": "delay",
                "name": "Delay Node",
                "description": "Add time delay to workflow",
                "category": "utility",
                "icon": "clock",
                "color": "#6c757d",
                "max_inputs": 1,
                "max_outputs": 1,
                "configurable_properties": ["delay_seconds"]
            },
            {
                "type": "webhook",
                "name": "Webhook Node",
                "description": "Send HTTP webhook request",
                "category": "integration",
                "icon": "globe",
                "color": "#fd7e14",
                "max_inputs": 1,
                "max_outputs": 1,
                "configurable_properties": ["url", "method", "headers", "payload"]
            },
            {
                "type": "script",
                "name": "Script Node",
                "description": "Execute custom script",
                "category": "action",
                "icon": "code",
                "color": "#e83e8c",
                "max_inputs": 1,
                "max_outputs": 1,
                "configurable_properties": ["script_language", "script_content"]
            },
            {
                "type": "approval",
                "name": "Approval Node",
                "description": "Require human approval",
                "category": "governance",
                "icon": "user-check",
                "color": "#17a2b8",
                "max_inputs": 1,
                "max_outputs": 1,
                "configurable_properties": ["approvers", "timeout_hours"]
            },
            {
                "type": "notification",
                "name": "Notification Node",
                "description": "Send notifications to users",
                "category": "communication",
                "icon": "bell",
                "color": "#f8f9fa",
                "max_inputs": 1,
                "max_outputs": 1,
                "configurable_properties": ["channels", "recipients", "message_template"]
            }
        ]
        
        return APIResponse(
            success=True,
            data=node_types,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))