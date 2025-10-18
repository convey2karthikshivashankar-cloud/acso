"""
Agent management API endpoints with configuration management.
"""

from typing import List, Optional
from datetime import datetime, timedelta
from fastapi import APIRouter, HTTPException, Depends, Query
from fastapi.responses import StreamingResponse

from ..models.responses import APIResponse
from ..models.agent import (
    AgentInfo, AgentCreateRequest, AgentUpdateRequest, AgentActionRequest,
    AgentActionResponse, AgentSummary, AgentStatistics, AgentListFilters,
    AgentType, AgentStatus, AgentConfiguration, AgentMetrics, AgentHealth,
    AgentLogEntry, AgentTask, ConfigurationVersion, ConfigurationTemplate,
    ConfigurationValidationResult, ConfigurationComparison, BulkConfigurationRequest,
    BulkConfigurationResult
)
from ..services.agent_service import AgentService
from ..services.configuration_service import ConfigurationService
from ..dependencies import get_current_user, require_permission
from ..models.auth import Permission

router = APIRouter()

# Initialize services
agent_service = AgentService()
config_service = ConfigurationService()


# Agent CRUD endpoints
@router.get("/", response_model=APIResponse[List[AgentSummary]])
async def get_agents(
    type: Optional[str] = Query(None, description="Filter by agent type"),
    status: Optional[str] = Query(None, description="Filter by status"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    healthy: Optional[bool] = Query(None, description="Filter by health status"),
    name_contains: Optional[str] = Query(None, description="Filter by name containing text"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of agents to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user = Depends(require_permission(Permission.AGENTS_VIEW))
):
    """Get list of agents with optional filtering."""
    try:
        filters = AgentListFilters(
            type=AgentType(type) if type else None,
            status=AgentStatus(status) if status else None,
            tags=tags,
            healthy=healthy,
            name_contains=name_contains
        )
        
        agents, total = await agent_service.list_agents(filters, limit, offset)
        
        return APIResponse(
            success=True,
            data=agents,
            message=f"Retrieved {len(agents)} agents",
            metadata={"total": total, "limit": limit, "offset": offset}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}", response_model=APIResponse[AgentInfo])
async def get_agent(
    agent_id: str,
    current_user = Depends(require_permission(Permission.AGENTS_VIEW))
):
    """Get detailed information about a specific agent."""
    try:
        agent = await agent_service.get_agent(agent_id)
        return APIResponse(
            success=True,
            data=agent,
            message="Agent retrieved successfully"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/", response_model=APIResponse[AgentInfo])
async def create_agent(
    agent_request: AgentCreateRequest,
    current_user = Depends(require_permission(Permission.AGENTS_MANAGE))
):
    """Create a new agent."""
    try:
        agent = await agent_service.create_agent(agent_request, current_user.id)
        return APIResponse(
            success=True,
            data=agent,
            message="Agent created successfully"
        )
    except Exception as e:
        if "already exists" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{agent_id}", response_model=APIResponse[AgentInfo])
async def update_agent(
    agent_id: str,
    agent_request: AgentUpdateRequest,
    current_user = Depends(require_permission(Permission.AGENTS_MANAGE))
):
    """Update an existing agent."""
    try:
        agent = await agent_service.update_agent(agent_id, agent_request, current_user.id)
        return APIResponse(
            success=True,
            data=agent,
            message="Agent updated successfully"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/{agent_id}", response_model=APIResponse[dict])
async def delete_agent(
    agent_id: str,
    current_user = Depends(require_permission(Permission.AGENTS_MANAGE))
):
    """Delete an agent."""
    try:
        success = await agent_service.delete_agent(agent_id)
        return APIResponse(
            success=True,
            data={"message": "Agent deleted successfully"},
            message="Agent deleted successfully"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        if "cannot delete" in str(e).lower():
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# Agent control endpoints
@router.post("/{agent_id}/start", response_model=APIResponse[AgentActionResponse])
async def start_agent(
    agent_id: str,
    current_user = Depends(require_permission(Permission.AGENTS_MANAGE))
):
    """Start an agent."""
    try:
        result = await agent_service.start_agent(agent_id)
        return APIResponse(
            success=True,
            data=result,
            message="Agent start command executed"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{agent_id}/stop", response_model=APIResponse[AgentActionResponse])
async def stop_agent(
    agent_id: str,
    current_user = Depends(require_permission(Permission.AGENTS_MANAGE))
):
    """Stop an agent."""
    try:
        result = await agent_service.stop_agent(agent_id)
        return APIResponse(
            success=True,
            data=result,
            message="Agent stop command executed"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{agent_id}/restart", response_model=APIResponse[AgentActionResponse])
async def restart_agent(
    agent_id: str,
    current_user = Depends(require_permission(Permission.AGENTS_MANAGE))
):
    """Restart an agent."""
    try:
        result = await agent_service.restart_agent(agent_id)
        return APIResponse(
            success=True,
            data=result,
            message="Agent restart command executed"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{agent_id}/actions", response_model=APIResponse[AgentActionResponse])
async def execute_agent_action(
    agent_id: str,
    action_request: AgentActionRequest,
    current_user = Depends(require_permission(Permission.AGENTS_MANAGE))
):
    """Execute a custom action on an agent."""
    try:
        result = await agent_service.execute_agent_action(agent_id, action_request)
        return APIResponse(
            success=True,
            data=result,
            message="Agent action executed"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# Agent logs and tasks
@router.get("/{agent_id}/logs", response_model=APIResponse[List[AgentLogEntry]])
async def get_agent_logs(
    agent_id: str,
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of logs to return"),
    level: Optional[str] = Query(None, description="Log level filter"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    current_user = Depends(require_permission(Permission.AGENTS_LOGS))
):
    """Get agent logs with optional filtering."""
    try:
        logs = await agent_service.get_agent_logs(
            agent_id, limit, level, start_time, end_time
        )
        return APIResponse(
            success=True,
            data=logs,
            message=f"Retrieved {len(logs)} log entries"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}/logs/stream")
async def stream_agent_logs(
    agent_id: str,
    level: Optional[str] = Query(None, description="Log level filter"),
    component: Optional[str] = Query(None, description="Component filter"),
    task_id: Optional[str] = Query(None, description="Task ID filter"),
    include_buffered: bool = Query(True, description="Include buffered logs"),
    current_user = Depends(require_permission(Permission.AGENTS_LOGS))
):
    """Stream agent logs in real-time via Server-Sent Events."""
    from ..services.log_streaming_service import LogStreamingService
    from fastapi.responses import StreamingResponse
    
    log_service = LogStreamingService()
    
    try:
        # Create filters
        filters = {}
        if level:
            filters["level"] = level
        if component:
            filters["component"] = component
        if task_id:
            filters["task_id"] = task_id
        
        # Create log stream
        stream_id = await log_service.create_log_stream(agent_id, filters)
        
        async def event_generator():
            try:
                async for log_data in log_service.stream_logs(stream_id, include_buffered):
                    yield f"data: {json.dumps(log_data, default=str)}\n\n"
            except Exception as e:
                yield f"data: {json.dumps({'type': 'error', 'error': str(e)})}\n\n"
            finally:
                await log_service.close_log_stream(stream_id)
        
        return StreamingResponse(
            event_generator(),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"
            }
        )
        
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}/logs/search", response_model=APIResponse[List[Dict[str, Any]]])
async def search_agent_logs(
    agent_id: str,
    query: str = Query(..., description="Search query"),
    level: Optional[str] = Query(None, description="Log level filter"),
    component: Optional[str] = Query(None, description="Component filter"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of results"),
    current_user = Depends(require_permission(Permission.AGENTS_LOGS))
):
    """Search agent logs."""
    from ..services.log_streaming_service import LogStreamingService
    
    log_service = LogStreamingService()
    
    try:
        # Create filters
        filters = {}
        if level:
            filters["level"] = level
        if component:
            filters["component"] = component
        
        # Search logs
        results = await log_service.search_logs(agent_id, query, filters, limit)
        
        return APIResponse(
            success=True,
            data=results,
            message=f"Found {len(results)} matching log entries"
        )
        
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}/logs/export")
async def export_agent_logs(
    agent_id: str,
    format: str = Query("json", description="Export format (json, csv, text)"),
    start_time: Optional[datetime] = Query(None, description="Start time filter"),
    end_time: Optional[datetime] = Query(None, description="End time filter"),
    level: Optional[str] = Query(None, description="Log level filter"),
    component: Optional[str] = Query(None, description="Component filter"),
    current_user = Depends(require_permission(Permission.AGENTS_LOGS))
):
    """Export agent logs in specified format."""
    from ..services.log_streaming_service import LogStreamingService
    from fastapi.responses import Response
    
    log_service = LogStreamingService()
    
    try:
        # Create filters
        filters = {}
        if level:
            filters["level"] = level
        if component:
            filters["component"] = component
        
        # Export logs
        exported_data = await log_service.export_logs(
            agent_id, start_time, end_time, filters, format
        )
        
        # Determine content type and filename
        if format.lower() == "json":
            media_type = "application/json"
            filename = f"agent_{agent_id}_logs.json"
        elif format.lower() == "csv":
            media_type = "text/csv"
            filename = f"agent_{agent_id}_logs.csv"
        elif format.lower() == "text":
            media_type = "text/plain"
            filename = f"agent_{agent_id}_logs.txt"
        else:
            raise HTTPException(status_code=400, detail=f"Unsupported format: {format}")
        
        return Response(
            content=exported_data,
            media_type=media_type,
            headers={
                "Content-Disposition": f"attachment; filename={filename}"
            }
        )
        
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        if "unsupported" in str(e).lower():
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}/logs/statistics", response_model=APIResponse[Dict[str, Any]])
async def get_agent_log_statistics(
    agent_id: str,
    current_user = Depends(require_permission(Permission.AGENTS_LOGS))
):
    """Get log statistics for an agent."""
    from ..services.log_streaming_service import LogStreamingService
    
    log_service = LogStreamingService()
    
    try:
        stats = await log_service.get_log_statistics(agent_id)
        return APIResponse(
            success=True,
            data=stats,
            message="Log statistics retrieved successfully"
        )
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}/tasks", response_model=APIResponse[List[AgentTask]])
async def get_agent_tasks(
    agent_id: str,
    status: Optional[str] = Query(None, description="Filter by task status"),
    limit: int = Query(100, ge=1, le=1000, description="Maximum number of tasks to return"),
    current_user = Depends(require_permission(Permission.AGENTS_VIEW))
):
    """Get tasks assigned to an agent."""
    try:
        tasks = await agent_service.get_agent_tasks(agent_id, status, limit)
        return APIResponse(
            success=True,
            data=tasks,
            message=f"Retrieved {len(tasks)} tasks"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# System statistics
@router.get("/statistics", response_model=APIResponse[AgentStatistics])
async def get_agent_statistics(
    current_user = Depends(require_permission(Permission.SYSTEM_MONITOR))
):
    """Get system-wide agent statistics."""
    try:
        stats = await agent_service.get_system_statistics()
        return APIResponse(
            success=True,
            data=stats,
            message="Agent statistics retrieved successfully"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


# Configuration management endpoints
@router.get("/{agent_id}/configuration/versions", response_model=APIResponse[List[ConfigurationVersion]])
async def get_agent_configuration_versions(
    agent_id: str,
    limit: int = Query(50, ge=1, le=100, description="Maximum number of versions to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user = Depends(require_permission(Permission.AGENTS_CONFIGURE))
):
    """Get configuration versions for an agent."""
    try:
        versions, total = await config_service.get_agent_configuration_versions(
            agent_id, limit, offset
        )
        return APIResponse(
            success=True,
            data=versions,
            message=f"Retrieved {len(versions)} configuration versions",
            metadata={"total": total, "limit": limit, "offset": offset}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/{agent_id}/configuration", response_model=APIResponse[ConfigurationVersion])
async def create_agent_configuration_version(
    agent_id: str,
    configuration: AgentConfiguration,
    description: Optional[str] = Query(None, description="Version description"),
    tags: Optional[List[str]] = Query(None, description="Version tags"),
    current_user = Depends(require_permission(Permission.AGENTS_CONFIGURE))
):
    """Create a new configuration version for an agent."""
    try:
        version = await config_service.create_configuration_version(
            agent_id, configuration, current_user.id, description, tags
        )
        return APIResponse(
            success=True,
            data=version,
            message="Configuration version created successfully"
        )
    except Exception as e:
        if "invalid configuration" in str(e).lower():
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.put("/{agent_id}/configuration/versions/{version}/activate", response_model=APIResponse[ConfigurationVersion])
async def activate_configuration_version(
    agent_id: str,
    version: int,
    current_user = Depends(require_permission(Permission.AGENTS_CONFIGURE))
):
    """Activate a specific configuration version."""
    try:
        activated_version = await config_service.activate_configuration_version(
            agent_id, version, current_user.id
        )
        return APIResponse(
            success=True,
            data=activated_version,
            message=f"Configuration version {version} activated successfully"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/{agent_id}/configuration/versions/{version_a}/compare/{version_b}", 
           response_model=APIResponse[ConfigurationComparison])
async def compare_configuration_versions(
    agent_id: str,
    version_a: int,
    version_b: int,
    current_user = Depends(require_permission(Permission.AGENTS_CONFIGURE))
):
    """Compare two configuration versions."""
    try:
        comparison = await config_service.compare_configuration_versions(
            agent_id, version_a, version_b
        )
        return APIResponse(
            success=True,
            data=comparison,
            message=f"Configuration versions {version_a} and {version_b} compared successfully"
        )
    except Exception as e:
        if "not found" in str(e).lower():
            raise HTTPException(status_code=404, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configuration/validate", response_model=APIResponse[ConfigurationValidationResult])
async def validate_configuration(
    configuration: AgentConfiguration,
    current_user = Depends(require_permission(Permission.AGENTS_CONFIGURE))
):
    """Validate an agent configuration."""
    try:
        result = await config_service.validate_configuration(configuration)
        return APIResponse(
            success=True,
            data=result,
            message="Configuration validation completed"
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configuration/bulk-update", response_model=APIResponse[BulkConfigurationResult])
async def bulk_update_configuration(
    request: BulkConfigurationRequest,
    current_user = Depends(require_permission(Permission.AGENTS_CONFIGURE))
):
    """Apply configuration to multiple agents."""
    try:
        result = await config_service.apply_bulk_configuration(request, current_user.id)
        return APIResponse(
            success=True,
            data=result,
            message=f"Bulk configuration applied to {result.total_agents} agents"
        )
    except Exception as e:
        if "invalid configuration" in str(e).lower():
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))


# Configuration templates
@router.get("/configuration/templates", response_model=APIResponse[List[ConfigurationTemplate]])
async def get_configuration_templates(
    agent_type: Optional[str] = Query(None, description="Filter by agent type"),
    tags: Optional[List[str]] = Query(None, description="Filter by tags"),
    limit: int = Query(50, ge=1, le=100, description="Maximum number of templates to return"),
    offset: int = Query(0, ge=0, description="Offset for pagination"),
    current_user = Depends(require_permission(Permission.AGENTS_CONFIGURE))
):
    """Get configuration templates."""
    try:
        templates, total = await config_service.get_configuration_templates(
            AgentType(agent_type) if agent_type else None,
            tags,
            limit,
            offset
        )
        return APIResponse(
            success=True,
            data=templates,
            message=f"Retrieved {len(templates)} configuration templates",
            metadata={"total": total, "limit": limit, "offset": offset}
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/configuration/templates", response_model=APIResponse[ConfigurationTemplate])
async def create_configuration_template(
    name: str,
    agent_type: AgentType,
    configuration: AgentConfiguration,
    description: Optional[str] = None,
    tags: Optional[List[str]] = None,
    current_user = Depends(require_permission(Permission.AGENTS_CONFIGURE))
):
    """Create a configuration template."""
    try:
        template = await config_service.create_configuration_template(
            name, agent_type, configuration, current_user.id, description, tags
        )
        return APIResponse(
            success=True,
            data=template,
            message="Configuration template created successfully"
        )
    except Exception as e:
        if "already exists" in str(e).lower():
            raise HTTPException(status_code=409, detail=str(e))
        if "invalid configuration" in str(e).lower():
            raise HTTPException(status_code=400, detail=str(e))
        raise HTTPException(status_code=500, detail=str(e))
# Import
 json for log streaming
import json
from typing import Dict