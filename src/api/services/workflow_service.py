"""
Workflow management service for ACSO API Gateway.
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
import json

from ..models.workflow import (
    WorkflowDefinition, WorkflowExecution, WorkflowCreateRequest, WorkflowUpdateRequest,
    WorkflowExecutionRequest, WorkflowValidationResult, WorkflowListFilters,
    WorkflowSummary, WorkflowExecutionSummary, WorkflowStatistics, WorkflowTemplate,
    WorkflowApprovalRequest, WorkflowApproval, WorkflowImportRequest, WorkflowExportRequest,
    WorkflowShareRequest, WorkflowStatus, WorkflowExecutionStatus, WorkflowTriggerType,
    WorkflowNode, WorkflowEdge, WorkflowNodeExecution
)
from ..websocket.manager import websocket_manager
from ...shared.coordination import system_coordinator


class WorkflowService:
    """Service for managing workflows and executions."""
    
    def __init__(self):
        self.workflows: Dict[str, WorkflowDefinition] = {}
        self.executions: Dict[str, WorkflowExecution] = {}
        self.templates: Dict[str, WorkflowTemplate] = {}
        self.approvals: Dict[str, WorkflowApproval] = {}
        self.collaborators: Dict[str, List[str]] = {}  # workflow_id -> user_ids
        
    async def get_workflows(
        self,
        filters: WorkflowListFilters,
        limit: int = 50,
        offset: int = 0,
        user_id: str = None
    ) -> Tuple[List[WorkflowSummary], int]:
        """Get list of workflows with filtering and pagination."""
        # Filter workflows based on criteria
        filtered_workflows = []
        
        for workflow in self.workflows.values():
            # Apply filters
            if filters.status and workflow.status != filters.status:
                continue
            if filters.created_by and workflow.created_by != filters.created_by:
                continue
            if filters.tags and not any(tag in workflow.tags for tag in filters.tags):
                continue
            if filters.name_contains and filters.name_contains.lower() not in workflow.name.lower():
                continue
            if filters.created_after and workflow.created_at < filters.created_after:
                continue
            if filters.created_before and workflow.created_at > filters.created_before:
                continue
                
            # Check user access
            if not await self._has_workflow_access(workflow.id, user_id):
                continue
                
            # Convert to summary
            summary = WorkflowSummary(
                id=workflow.id,
                name=workflow.name,
                description=workflow.description,
                status=workflow.status,
                version=workflow.version,
                created_at=workflow.created_at,
                created_by=workflow.created_by,
                updated_at=workflow.updated_at,
                node_count=len(workflow.nodes),
                execution_count=len([e for e in self.executions.values() if e.workflow_id == workflow.id]),
                last_execution=max(
                    [e.started_at for e in self.executions.values() if e.workflow_id == workflow.id],
                    default=None
                ),
                tags=workflow.tags
            )
            filtered_workflows.append(summary)
        
        # Sort by creation date (newest first)
        filtered_workflows.sort(key=lambda w: w.created_at, reverse=True)
        
        # Apply pagination
        total = len(filtered_workflows)
        paginated_workflows = filtered_workflows[offset:offset + limit]
        
        return paginated_workflows, total
    
    async def get_workflow(self, workflow_id: str, user_id: str) -> Optional[WorkflowDefinition]:
        """Get a specific workflow by ID."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            return None
            
        if not await self._has_workflow_access(workflow_id, user_id):
            return None
            
        return workflow
    
    async def create_workflow(
        self,
        workflow_data: WorkflowCreateRequest,
        user_id: str
    ) -> WorkflowDefinition:
        """Create a new workflow."""
        workflow_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        workflow = WorkflowDefinition(
            id=workflow_id,
            name=workflow_data.name,
            description=workflow_data.description,
            version="1.0.0",
            nodes=workflow_data.nodes,
            edges=workflow_data.edges,
            triggers=workflow_data.triggers,
            variables=workflow_data.variables,
            tags=workflow_data.tags,
            created_at=now,
            created_by=user_id,
            status=WorkflowStatus.DRAFT
        )
        
        # Validate workflow
        validation_result = await self.validate_workflow_definition(workflow_data)
        if not validation_result.valid:
            raise ValueError(f"Invalid workflow: {', '.join(validation_result.errors)}")
        
        self.workflows[workflow_id] = workflow
        
        # If created from template, increment usage count
        if workflow_data.template_id and workflow_data.template_id in self.templates:
            self.templates[workflow_data.template_id].usage_count += 1
        
        return workflow
    
    async def update_workflow(
        self,
        workflow_id: str,
        workflow_data: WorkflowUpdateRequest,
        user_id: str
    ) -> Optional[WorkflowDefinition]:
        """Update an existing workflow."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            return None
            
        if not await self._has_workflow_access(workflow_id, user_id, "write"):
            return None
        
        # Update fields
        update_data = workflow_data.dict(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(workflow, field):
                setattr(workflow, field, value)
        
        workflow.updated_at = datetime.utcnow()
        workflow.updated_by = user_id
        
        # Increment version if nodes or edges changed
        if workflow_data.nodes is not None or workflow_data.edges is not None:
            version_parts = workflow.version.split('.')
            version_parts[1] = str(int(version_parts[1]) + 1)
            workflow.version = '.'.join(version_parts)
        
        return workflow
    
    async def delete_workflow(self, workflow_id: str, user_id: str) -> bool:
        """Delete a workflow."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            return False
            
        if not await self._has_workflow_access(workflow_id, user_id, "admin"):
            return False
        
        # Check if workflow has running executions
        running_executions = [
            e for e in self.executions.values()
            if e.workflow_id == workflow_id and e.status == WorkflowExecutionStatus.RUNNING
        ]
        
        if running_executions:
            raise ValueError("Cannot delete workflow with running executions")
        
        del self.workflows[workflow_id]
        
        # Clean up collaborators
        if workflow_id in self.collaborators:
            del self.collaborators[workflow_id]
        
        return True
    
    async def validate_workflow_definition(
        self,
        workflow_data: WorkflowCreateRequest
    ) -> WorkflowValidationResult:
        """Validate a workflow definition."""
        errors = []
        warnings = []
        suggestions = []
        
        # Check for required nodes
        if not workflow_data.nodes:
            errors.append("Workflow must have at least one node")
        
        # Check for start and end nodes
        start_nodes = [n for n in workflow_data.nodes if n.type.value == "start"]
        end_nodes = [n for n in workflow_data.nodes if n.type.value == "end"]
        
        if not start_nodes:
            errors.append("Workflow must have at least one start node")
        if not end_nodes:
            warnings.append("Workflow should have at least one end node")
        
        # Check node connectivity
        node_ids = {n.id for n in workflow_data.nodes}
        for edge in workflow_data.edges:
            if edge.source_node_id not in node_ids:
                errors.append(f"Edge references non-existent source node: {edge.source_node_id}")
            if edge.target_node_id not in node_ids:
                errors.append(f"Edge references non-existent target node: {edge.target_node_id}")
        
        # Check for orphaned nodes
        connected_nodes = set()
        for edge in workflow_data.edges:
            connected_nodes.add(edge.source_node_id)
            connected_nodes.add(edge.target_node_id)
        
        orphaned_nodes = node_ids - connected_nodes - {n.id for n in start_nodes}
        if orphaned_nodes:
            warnings.extend([f"Node {node_id} is not connected" for node_id in orphaned_nodes])
        
        # Check for cycles (simplified check)
        if self._has_cycles(workflow_data.nodes, workflow_data.edges):
            warnings.append("Workflow may contain cycles")
        
        # Performance suggestions
        if len(workflow_data.nodes) > 50:
            suggestions.append("Consider breaking large workflows into smaller sub-workflows")
        
        return WorkflowValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions
        )
    
    async def validate_workflow(
        self,
        workflow_id: str,
        user_id: str
    ) -> WorkflowValidationResult:
        """Validate an existing workflow."""
        workflow = await self.get_workflow(workflow_id, user_id)
        if not workflow:
            return WorkflowValidationResult(
                valid=False,
                errors=["Workflow not found"],
                warnings=[],
                suggestions=[]
            )
        
        # Convert to create request format for validation
        workflow_data = WorkflowCreateRequest(
            name=workflow.name,
            description=workflow.description,
            nodes=workflow.nodes,
            edges=workflow.edges,
            triggers=workflow.triggers,
            variables=workflow.variables,
            tags=workflow.tags
        )
        
        return await self.validate_workflow_definition(workflow_data)    

    async def execute_workflow(
        self,
        workflow_id: str,
        execution_request: WorkflowExecutionRequest,
        user_id: str
    ) -> WorkflowExecution:
        """Execute a workflow."""
        workflow = await self.get_workflow(workflow_id, user_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        if workflow.status != WorkflowStatus.ACTIVE:
            raise ValueError("Workflow is not active")
        
        execution_id = str(uuid.uuid4())
        now = datetime.utcnow()
        
        execution = WorkflowExecution(
            id=execution_id,
            workflow_id=workflow_id,
            workflow_version=workflow.version,
            status=WorkflowExecutionStatus.PENDING,
            started_at=now,
            triggered_by=user_id,
            trigger_type=execution_request.trigger_type,
            input_variables=execution_request.input_variables,
            node_executions=[],
            progress_percentage=0.0
        )
        
        self.executions[execution_id] = execution
        
        # Start monitoring
        from .workflow_execution_monitor import execution_monitor
        await execution_monitor.start_monitoring_execution(execution, workflow)
        
        # Start execution in background
        asyncio.create_task(self._execute_workflow_async(execution))
        
        return execution
    
    async def _execute_workflow_async(self, execution: WorkflowExecution):
        """Execute workflow asynchronously."""
        try:
            execution.status = WorkflowExecutionStatus.RUNNING
            
            # Notify clients about execution start
            await websocket_manager.broadcast_to_topic(
                f"workflow_execution_{execution.id}",
                {
                    "type": "execution_status_changed",
                    "execution_id": execution.id,
                    "status": execution.status.value,
                    "progress": execution.progress_percentage
                }
            )
            
            workflow = self.workflows[execution.workflow_id]
            
            # Find start nodes
            start_nodes = [n for n in workflow.nodes if n.type.value == "start"]
            
            # Execute nodes starting from start nodes
            for start_node in start_nodes:
                await self._execute_node(execution, start_node, workflow)
            
            # Check if execution completed successfully
            failed_nodes = [
                ne for ne in execution.node_executions
                if ne.status == WorkflowExecutionStatus.FAILED
            ]
            
            if failed_nodes:
                execution.status = WorkflowExecutionStatus.FAILED
                execution.error_message = f"Failed nodes: {', '.join([ne.node_id for ne in failed_nodes])}"
            else:
                execution.status = WorkflowExecutionStatus.COMPLETED
                execution.progress_percentage = 100.0
            
            execution.completed_at = datetime.utcnow()
            execution.duration_seconds = (execution.completed_at - execution.started_at).total_seconds()
            
            # Stop monitoring
            from .workflow_execution_monitor import execution_monitor
            await execution_monitor.stop_monitoring_execution(execution.id)
            
            # Notify clients about execution completion
            await websocket_manager.broadcast_to_topic(
                f"workflow_execution_{execution.id}",
                {
                    "type": "execution_completed",
                    "execution_id": execution.id,
                    "status": execution.status.value,
                    "duration": execution.duration_seconds
                }
            )
            
        except Exception as e:
            execution.status = WorkflowExecutionStatus.FAILED
            execution.error_message = str(e)
            execution.completed_at = datetime.utcnow()
            execution.duration_seconds = (execution.completed_at - execution.started_at).total_seconds()
            
            # Stop monitoring
            from .workflow_execution_monitor import execution_monitor
            await execution_monitor.stop_monitoring_execution(execution.id)
            
            # Notify clients about execution failure
            await websocket_manager.broadcast_to_topic(
                f"workflow_execution_{execution.id}",
                {
                    "type": "execution_failed",
                    "execution_id": execution.id,
                    "error": execution.error_message
                }
            )
    
    async def _execute_node(
        self,
        execution: WorkflowExecution,
        node: WorkflowNode,
        workflow: WorkflowDefinition
    ):
        """Execute a single workflow node."""
        node_execution = WorkflowNodeExecution(
            node_id=node.id,
            status=WorkflowExecutionStatus.RUNNING,
            started_at=datetime.utcnow(),
            input_data=execution.input_variables.copy()
        )
        
        execution.node_executions.append(node_execution)
        
        try:
            # Simulate node execution based on type
            if node.type.value == "task":
                # Execute agent task
                if node.config.agent_id:
                    result = await system_coordinator.execute_agent_action(
                        node.config.agent_id,
                        node.config.action,
                        node.config.parameters
                    )
                    node_execution.output_data = result
                else:
                    # Generic task execution
                    await asyncio.sleep(1)  # Simulate work
                    node_execution.output_data = {"result": "success"}
            
            elif node.type.value == "approval":
                # Create approval request
                approval_id = str(uuid.uuid4())
                approval = WorkflowApproval(
                    id=approval_id,
                    execution_id=execution.id,
                    node_id=node.id,
                    requested_at=datetime.utcnow(),
                    requested_by=execution.triggered_by,
                    timeout_at=datetime.utcnow() + timedelta(hours=24)
                )
                
                self.approvals[approval_id] = approval
                node_execution.status = WorkflowExecutionStatus.WAITING_APPROVAL
                
                # Notify approvers
                for approver_id in node.config.approvers:
                    await websocket_manager.broadcast_to_user(
                        approver_id,
                        {
                            "type": "approval_requested",
                            "approval_id": approval_id,
                            "execution_id": execution.id,
                            "node_id": node.id,
                            "workflow_name": workflow.name
                        }
                    )
                
                # Wait for approval (simplified - in real implementation, this would be event-driven)
                return  # Node will be completed when approval is received
            
            elif node.type.value == "delay":
                # Delay execution
                delay_seconds = node.config.parameters.get("delay_seconds", 5)
                await asyncio.sleep(delay_seconds)
                node_execution.output_data = {"delayed": delay_seconds}
            
            else:
                # Default node execution
                await asyncio.sleep(0.5)  # Simulate work
                node_execution.output_data = {"result": "completed"}
            
            node_execution.status = WorkflowExecutionStatus.COMPLETED
            node_execution.completed_at = datetime.utcnow()
            node_execution.duration_seconds = (
                node_execution.completed_at - node_execution.started_at
            ).total_seconds()
            
            # Update execution progress
            completed_nodes = len([
                ne for ne in execution.node_executions
                if ne.status == WorkflowExecutionStatus.COMPLETED
            ])
            execution.progress_percentage = (completed_nodes / len(workflow.nodes)) * 100
            
            # Notify clients about node completion
            await websocket_manager.broadcast_to_topic(
                f"workflow_execution_{execution.id}",
                {
                    "type": "node_completed",
                    "execution_id": execution.id,
                    "node_id": node.id,
                    "progress": execution.progress_percentage
                }
            )
            
            # Execute next nodes
            next_edges = [e for e in workflow.edges if e.source_node_id == node.id]
            for edge in next_edges:
                next_node = next(n for n in workflow.nodes if n.id == edge.target_node_id)
                await self._execute_node(execution, next_node, workflow)
            
        except Exception as e:
            node_execution.status = WorkflowExecutionStatus.FAILED
            node_execution.error_message = str(e)
            node_execution.completed_at = datetime.utcnow()
            node_execution.duration_seconds = (
                node_execution.completed_at - node_execution.started_at
            ).total_seconds()
            
            # Notify clients about node failure
            await websocket_manager.broadcast_to_topic(
                f"workflow_execution_{execution.id}",
                {
                    "type": "node_failed",
                    "execution_id": execution.id,
                    "node_id": node.id,
                    "error": node_execution.error_message
                }
            )
    
    async def get_workflow_executions(
        self,
        workflow_id: str,
        status: Optional[WorkflowExecutionStatus] = None,
        started_after: Optional[datetime] = None,
        started_before: Optional[datetime] = None,
        limit: int = 50,
        offset: int = 0,
        user_id: str = None
    ) -> Tuple[List[WorkflowExecutionSummary], int]:
        """Get execution history for a workflow."""
        if not await self._has_workflow_access(workflow_id, user_id):
            return [], 0
        
        # Filter executions
        filtered_executions = []
        
        for execution in self.executions.values():
            if execution.workflow_id != workflow_id:
                continue
            if status and execution.status != status:
                continue
            if started_after and execution.started_at < started_after:
                continue
            if started_before and execution.started_at > started_before:
                continue
            
            workflow = self.workflows.get(workflow_id)
            summary = WorkflowExecutionSummary(
                id=execution.id,
                workflow_id=execution.workflow_id,
                workflow_name=workflow.name if workflow else "Unknown",
                status=execution.status,
                started_at=execution.started_at,
                completed_at=execution.completed_at,
                duration_seconds=execution.duration_seconds,
                triggered_by=execution.triggered_by,
                trigger_type=execution.trigger_type,
                progress_percentage=execution.progress_percentage
            )
            filtered_executions.append(summary)
        
        # Sort by start time (newest first)
        filtered_executions.sort(key=lambda e: e.started_at, reverse=True)
        
        # Apply pagination
        total = len(filtered_executions)
        paginated_executions = filtered_executions[offset:offset + limit]
        
        return paginated_executions, total
    
    async def get_workflow_execution(
        self,
        execution_id: str,
        user_id: str
    ) -> Optional[WorkflowExecution]:
        """Get a specific workflow execution."""
        execution = self.executions.get(execution_id)
        if not execution:
            return None
        
        if not await self._has_workflow_access(execution.workflow_id, user_id):
            return None
        
        return execution 
   
    async def pause_execution(
        self,
        execution_id: str,
        user_id: str
    ) -> Optional[WorkflowExecution]:
        """Pause a workflow execution."""
        execution = self.executions.get(execution_id)
        if not execution:
            return None
        
        if not await self._has_workflow_access(execution.workflow_id, user_id):
            return None
        
        if execution.status == WorkflowExecutionStatus.RUNNING:
            execution.status = WorkflowExecutionStatus.PAUSED
        
        return execution
    
    async def resume_execution(
        self,
        execution_id: str,
        user_id: str
    ) -> Optional[WorkflowExecution]:
        """Resume a paused workflow execution."""
        execution = self.executions.get(execution_id)
        if not execution:
            return None
        
        if not await self._has_workflow_access(execution.workflow_id, user_id):
            return None
        
        if execution.status == WorkflowExecutionStatus.PAUSED:
            execution.status = WorkflowExecutionStatus.RUNNING
            # Resume execution in background
            asyncio.create_task(self._execute_workflow_async(execution))
        
        return execution
    
    async def cancel_execution(
        self,
        execution_id: str,
        user_id: str
    ) -> Optional[WorkflowExecution]:
        """Cancel a workflow execution."""
        execution = self.executions.get(execution_id)
        if not execution:
            return None
        
        if not await self._has_workflow_access(execution.workflow_id, user_id):
            return None
        
        if execution.status in [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.PAUSED]:
            execution.status = WorkflowExecutionStatus.CANCELLED
            execution.completed_at = datetime.utcnow()
            execution.duration_seconds = (execution.completed_at - execution.started_at).total_seconds()
        
        return execution
    
    async def monitor_execution(self, execution_id: str):
        """Monitor workflow execution and send updates."""
        execution = self.executions.get(execution_id)
        if not execution:
            return
        
        while execution.status in [WorkflowExecutionStatus.RUNNING, WorkflowExecutionStatus.PAUSED]:
            await websocket_manager.broadcast_to_topic(
                f"workflow_execution_{execution_id}",
                {
                    "type": "execution_progress",
                    "execution_id": execution_id,
                    "status": execution.status.value,
                    "progress": execution.progress_percentage,
                    "node_executions": [
                        {
                            "node_id": ne.node_id,
                            "status": ne.status.value,
                            "duration": ne.duration_seconds
                        }
                        for ne in execution.node_executions
                    ]
                }
            )
            
            await asyncio.sleep(5)  # Send updates every 5 seconds
    
    async def get_workflow_templates(
        self,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_public: Optional[bool] = None,
        limit: int = 50,
        offset: int = 0,
        user_id: str = None
    ) -> Tuple[List[WorkflowTemplate], int]:
        """Get workflow templates."""
        from .workflow_template_service import template_service
        return await template_service.get_templates(
            category=category,
            tags=tags,
            is_public=is_public,
            limit=limit,
            offset=offset,
            user_id=user_id
        )
    
    async def create_workflow_template(
        self,
        workflow_id: str,
        name: str,
        description: Optional[str],
        category: str,
        is_public: bool,
        user_id: str
    ) -> WorkflowTemplate:
        """Create a template from an existing workflow."""
        workflow = await self.get_workflow(workflow_id, user_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        from .workflow_template_service import template_service
        return await template_service.create_template(
            name=name,
            description=description,
            category=category,
            workflow_definition=workflow,
            is_public=is_public,
            user_id=user_id,
            tags=workflow.tags
        )
    
    async def create_workflow_from_template(
        self,
        template_id: str,
        name: str,
        user_id: str
    ) -> WorkflowDefinition:
        """Create a new workflow from a template."""
        from .workflow_template_service import template_service
        
        # Use template service to create workflow and track usage
        workflow_def = await template_service.use_template(
            template_id,
            name,
            user_id,
            success=True
        )
        
        if not workflow_def:
            raise ValueError("Template not found or not accessible")
        
        # Store the workflow in our service
        self.workflows[workflow_def.id] = workflow_def
        
        return workflow_def
    
    async def get_workflow_statistics(self, user_id: str) -> WorkflowStatistics:
        """Get workflow system statistics."""
        # Filter workflows accessible to user
        accessible_workflows = []
        for workflow in self.workflows.values():
            if await self._has_workflow_access(workflow.id, user_id):
                accessible_workflows.append(workflow)
        
        # Filter executions for accessible workflows
        accessible_executions = []
        workflow_ids = {w.id for w in accessible_workflows}
        for execution in self.executions.values():
            if execution.workflow_id in workflow_ids:
                accessible_executions.append(execution)
        
        # Calculate statistics
        total_workflows = len(accessible_workflows)
        active_workflows = len([w for w in accessible_workflows if w.status == WorkflowStatus.ACTIVE])
        running_executions = len([e for e in accessible_executions if e.status == WorkflowExecutionStatus.RUNNING])
        
        workflows_by_status = {}
        for status in WorkflowStatus:
            workflows_by_status[status.value] = len([w for w in accessible_workflows if w.status == status])
        
        executions_by_status = {}
        for status in WorkflowExecutionStatus:
            executions_by_status[status.value] = len([e for e in accessible_executions if e.status == status])
        
        # Today's executions
        today = datetime.utcnow().date()
        total_executions_today = len([
            e for e in accessible_executions
            if e.started_at.date() == today
        ])
        
        # Average execution time
        completed_executions = [
            e for e in accessible_executions
            if e.status == WorkflowExecutionStatus.COMPLETED and e.duration_seconds
        ]
        average_execution_time = (
            sum(e.duration_seconds for e in completed_executions) / len(completed_executions)
            if completed_executions else 0.0
        )
        
        # Success rate
        finished_executions = [
            e for e in accessible_executions
            if e.status in [WorkflowExecutionStatus.COMPLETED, WorkflowExecutionStatus.FAILED]
        ]
        success_rate = (
            len([e for e in finished_executions if e.status == WorkflowExecutionStatus.COMPLETED]) /
            len(finished_executions)
            if finished_executions else 0.0
        )
        
        return WorkflowStatistics(
            total_workflows=total_workflows,
            active_workflows=active_workflows,
            running_executions=running_executions,
            workflows_by_status=workflows_by_status,
            executions_by_status=executions_by_status,
            total_executions_today=total_executions_today,
            average_execution_time=average_execution_time,
            success_rate=success_rate
        )    
    a
sync def get_workflow_analytics(
        self,
        workflow_id: str,
        days: int,
        user_id: str
    ) -> Dict[str, Any]:
        """Get analytics for a specific workflow."""
        if not await self._has_workflow_access(workflow_id, user_id):
            raise ValueError("Workflow not accessible")
        
        # Get executions for the specified period
        cutoff_date = datetime.utcnow() - timedelta(days=days)
        executions = [
            e for e in self.executions.values()
            if e.workflow_id == workflow_id and e.started_at >= cutoff_date
        ]
        
        # Calculate analytics
        total_executions = len(executions)
        successful_executions = len([e for e in executions if e.status == WorkflowExecutionStatus.COMPLETED])
        failed_executions = len([e for e in executions if e.status == WorkflowExecutionStatus.FAILED])
        
        # Execution times
        completed_executions = [e for e in executions if e.duration_seconds]
        avg_execution_time = (
            sum(e.duration_seconds for e in completed_executions) / len(completed_executions)
            if completed_executions else 0.0
        )
        
        # Daily execution counts
        daily_counts = {}
        for i in range(days):
            date = (datetime.utcnow() - timedelta(days=i)).date()
            daily_counts[date.isoformat()] = len([
                e for e in executions if e.started_at.date() == date
            ])
        
        # Most common failure reasons
        failure_reasons = {}
        for execution in executions:
            if execution.status == WorkflowExecutionStatus.FAILED and execution.error_message:
                reason = execution.error_message[:100]  # Truncate long messages
                failure_reasons[reason] = failure_reasons.get(reason, 0) + 1
        
        return {
            "total_executions": total_executions,
            "successful_executions": successful_executions,
            "failed_executions": failed_executions,
            "success_rate": successful_executions / total_executions if total_executions > 0 else 0.0,
            "average_execution_time": avg_execution_time,
            "daily_execution_counts": daily_counts,
            "common_failure_reasons": dict(sorted(failure_reasons.items(), key=lambda x: x[1], reverse=True)[:5])
        }
    
    async def get_pending_approvals(
        self,
        user_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[WorkflowApproval], int]:
        """Get pending approvals for a user."""
        pending_approvals = []
        
        for approval in self.approvals.values():
            if approval.approved is not None:  # Already responded
                continue
            if approval.timeout_at and approval.timeout_at < datetime.utcnow():  # Timed out
                continue
            
            # Check if user is an approver
            execution = self.executions.get(approval.execution_id)
            if not execution:
                continue
            
            workflow = self.workflows.get(execution.workflow_id)
            if not workflow:
                continue
            
            # Find the node requiring approval
            approval_node = next((n for n in workflow.nodes if n.id == approval.node_id), None)
            if not approval_node or user_id not in approval_node.config.approvers:
                continue
            
            pending_approvals.append(approval)
        
        # Sort by request time (oldest first)
        pending_approvals.sort(key=lambda a: a.requested_at)
        
        # Apply pagination
        total = len(pending_approvals)
        paginated_approvals = pending_approvals[offset:offset + limit]
        
        return paginated_approvals, total
    
    async def respond_to_approval(
        self,
        approval_id: str,
        approval_request: WorkflowApprovalRequest,
        user_id: str
    ) -> WorkflowApproval:
        """Respond to a workflow approval request."""
        approval = self.approvals.get(approval_id)
        if not approval:
            raise ValueError("Approval not found")
        
        if approval.approved is not None:
            raise ValueError("Approval already responded to")
        
        if approval.timeout_at and approval.timeout_at < datetime.utcnow():
            raise ValueError("Approval has timed out")
        
        # Verify user is authorized to approve
        execution = self.executions.get(approval.execution_id)
        if not execution:
            raise ValueError("Execution not found")
        
        workflow = self.workflows.get(execution.workflow_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        approval_node = next((n for n in workflow.nodes if n.id == approval.node_id), None)
        if not approval_node or user_id not in approval_node.config.approvers:
            raise ValueError("User not authorized to approve this request")
        
        # Update approval
        approval.approved = approval_request.approved
        approval.approved_by = user_id
        approval.approved_at = datetime.utcnow()
        approval.comment = approval_request.comment
        
        # Update node execution status
        node_execution = next(
            (ne for ne in execution.node_executions if ne.node_id == approval.node_id),
            None
        )
        
        if node_execution:
            if approval_request.approved:
                node_execution.status = WorkflowExecutionStatus.COMPLETED
                node_execution.completed_at = datetime.utcnow()
                node_execution.duration_seconds = (
                    node_execution.completed_at - node_execution.started_at
                ).total_seconds()
                node_execution.output_data = {"approved": True, "comment": approval_request.comment}
                
                # Continue workflow execution
                asyncio.create_task(self._continue_workflow_after_approval(execution, approval_node))
            else:
                node_execution.status = WorkflowExecutionStatus.FAILED
                node_execution.error_message = f"Approval denied: {approval_request.comment}"
                node_execution.completed_at = datetime.utcnow()
                node_execution.duration_seconds = (
                    node_execution.completed_at - node_execution.started_at
                ).total_seconds()
                
                # Fail the entire execution
                execution.status = WorkflowExecutionStatus.FAILED
                execution.error_message = f"Approval denied for node {approval_node.name}"
                execution.completed_at = datetime.utcnow()
                execution.duration_seconds = (execution.completed_at - execution.started_at).total_seconds()
        
        return approval
    
    async def _continue_workflow_after_approval(
        self,
        execution: WorkflowExecution,
        approved_node: WorkflowNode
    ):
        """Continue workflow execution after approval."""
        workflow = self.workflows[execution.workflow_id]
        
        # Find and execute next nodes
        next_edges = [e for e in workflow.edges if e.source_node_id == approved_node.id]
        for edge in next_edges:
            next_node = next(n for n in workflow.nodes if n.id == edge.target_node_id)
            await self._execute_node(execution, next_node, workflow)
    
    async def import_workflows(
        self,
        import_request: WorkflowImportRequest,
        user_id: str
    ) -> List[WorkflowDefinition]:
        """Import workflows from data."""
        imported_workflows = []
        
        # Handle different import formats
        if isinstance(import_request.workflow_data, list):
            workflows_data = import_request.workflow_data
        else:
            workflows_data = [import_request.workflow_data]
        
        for workflow_data in workflows_data:
            try:
                # Create workflow request from imported data
                create_request = WorkflowCreateRequest(
                    name=import_request.name_override or workflow_data.get("name", "Imported Workflow"),
                    description=workflow_data.get("description"),
                    nodes=[WorkflowNode(**node) for node in workflow_data.get("nodes", [])],
                    edges=[WorkflowEdge(**edge) for edge in workflow_data.get("edges", [])],
                    triggers=[WorkflowTrigger(**trigger) for trigger in workflow_data.get("triggers", [])],
                    variables=[WorkflowVariable(**var) for var in workflow_data.get("variables", [])],
                    tags=workflow_data.get("tags", [])
                )
                
                workflow = await self.create_workflow(create_request, user_id)
                imported_workflows.append(workflow)
                
            except Exception as e:
                # Log error but continue with other workflows
                print(f"Failed to import workflow: {e}")
                continue
        
        return imported_workflows
    
    async def export_workflows(
        self,
        export_request: WorkflowExportRequest,
        user_id: str
    ) -> Dict[str, Any]:
        """Export workflows to data."""
        exported_workflows = []
        
        for workflow_id in export_request.workflow_ids:
            workflow = await self.get_workflow(workflow_id, user_id)
            if not workflow:
                continue
            
            workflow_data = workflow.dict()
            
            # Include executions if requested
            if export_request.include_executions:
                executions = [
                    e.dict() for e in self.executions.values()
                    if e.workflow_id == workflow_id
                ]
                workflow_data["executions"] = executions
            
            exported_workflows.append(workflow_data)
        
        return {
            "workflows": exported_workflows,
            "export_timestamp": datetime.utcnow().isoformat(),
            "exported_by": user_id,
            "format_version": "1.0"
        }    

    async def share_workflow(
        self,
        workflow_id: str,
        share_request: WorkflowShareRequest,
        user_id: str
    ) -> Dict[str, str]:
        """Share a workflow with other users."""
        workflow = await self.get_workflow(workflow_id, user_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        if not await self._has_workflow_access(workflow_id, user_id, "admin"):
            raise ValueError("Insufficient permissions to share workflow")
        
        # Add users to collaborators
        if workflow_id not in self.collaborators:
            self.collaborators[workflow_id] = []
        
        for shared_user_id in share_request.user_ids:
            if shared_user_id not in self.collaborators[workflow_id]:
                self.collaborators[workflow_id].append(shared_user_id)
        
        return {"message": f"Workflow shared with {len(share_request.user_ids)} users"}
    
    async def get_workflow_collaborators(
        self,
        workflow_id: str,
        user_id: str
    ) -> List[Dict[str, Any]]:
        """Get list of workflow collaborators."""
        if not await self._has_workflow_access(workflow_id, user_id):
            raise ValueError("Workflow not accessible")
        
        collaborator_ids = self.collaborators.get(workflow_id, [])
        
        # In a real implementation, you would fetch user details from a user service
        collaborators = []
        for collaborator_id in collaborator_ids:
            collaborators.append({
                "user_id": collaborator_id,
                "permissions": ["read", "write"],  # Simplified permissions
                "added_at": datetime.utcnow().isoformat()  # Simplified timestamp
            })
        
        return collaborators
    
    async def remove_workflow_collaborator(
        self,
        workflow_id: str,
        collaborator_user_id: str,
        user_id: str
    ) -> Dict[str, str]:
        """Remove a collaborator from a workflow."""
        if not await self._has_workflow_access(workflow_id, user_id, "admin"):
            raise ValueError("Insufficient permissions to remove collaborator")
        
        if workflow_id in self.collaborators:
            if collaborator_user_id in self.collaborators[workflow_id]:
                self.collaborators[workflow_id].remove(collaborator_user_id)
        
        return {"message": f"Collaborator {collaborator_user_id} removed from workflow"}
    
    async def test_workflow(
        self,
        workflow_id: str,
        test_data: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """Test a workflow with sample data."""
        workflow = await self.get_workflow(workflow_id, user_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        # Validate workflow first
        validation_result = await self.validate_workflow(workflow_id, user_id)
        if not validation_result.valid:
            return {
                "test_result": "failed",
                "reason": "Workflow validation failed",
                "validation_errors": validation_result.errors
            }
        
        # Simulate workflow execution with test data
        test_execution_id = f"test_{uuid.uuid4()}"
        
        # Create a test execution (not stored in main executions)
        test_execution = WorkflowExecution(
            id=test_execution_id,
            workflow_id=workflow_id,
            workflow_version=workflow.version,
            status=WorkflowExecutionStatus.RUNNING,
            started_at=datetime.utcnow(),
            triggered_by=user_id,
            trigger_type=WorkflowTriggerType.MANUAL,
            input_variables=test_data,
            node_executions=[],
            progress_percentage=0.0
        )
        
        # Simulate node executions
        simulated_results = []
        for node in workflow.nodes:
            node_result = {
                "node_id": node.id,
                "node_name": node.name,
                "node_type": node.type.value,
                "simulated_duration": 1.0,  # Simulated execution time
                "simulated_output": {"result": "success", "test_mode": True}
            }
            
            # Add specific simulation based on node type
            if node.type.value == "approval":
                node_result["simulated_output"]["requires_approval"] = True
                node_result["simulated_output"]["approvers"] = node.config.approvers
            elif node.type.value == "task" and node.config.agent_id:
                node_result["simulated_output"]["agent_id"] = node.config.agent_id
                node_result["simulated_output"]["action"] = node.config.action
            
            simulated_results.append(node_result)
        
        test_execution.status = WorkflowExecutionStatus.COMPLETED
        test_execution.completed_at = datetime.utcnow()
        test_execution.duration_seconds = len(workflow.nodes) * 1.0  # Simulated total time
        test_execution.progress_percentage = 100.0
        
        return {
            "test_result": "success",
            "test_execution_id": test_execution_id,
            "simulated_duration": test_execution.duration_seconds,
            "node_results": simulated_results,
            "input_data": test_data,
            "validation_warnings": validation_result.warnings if validation_result.warnings else []
        }
    
    async def get_execution_debug_info(
        self,
        execution_id: str,
        user_id: str
    ) -> Dict[str, Any]:
        """Get debug information for a workflow execution."""
        execution = await self.get_workflow_execution(execution_id, user_id)
        if not execution:
            raise ValueError("Execution not found")
        
        workflow = self.workflows.get(execution.workflow_id)
        if not workflow:
            raise ValueError("Workflow not found")
        
        # Collect debug information
        debug_info = {
            "execution_id": execution_id,
            "workflow_id": execution.workflow_id,
            "workflow_name": workflow.name,
            "execution_status": execution.status.value,
            "started_at": execution.started_at.isoformat(),
            "duration_seconds": execution.duration_seconds,
            "input_variables": execution.input_variables,
            "output_variables": execution.output_variables,
            "error_message": execution.error_message,
            "node_executions": []
        }
        
        # Add detailed node execution information
        for node_execution in execution.node_executions:
            node = next((n for n in workflow.nodes if n.id == node_execution.node_id), None)
            
            node_debug = {
                "node_id": node_execution.node_id,
                "node_name": node.name if node else "Unknown",
                "node_type": node.type.value if node else "Unknown",
                "status": node_execution.status.value,
                "started_at": node_execution.started_at.isoformat() if node_execution.started_at else None,
                "completed_at": node_execution.completed_at.isoformat() if node_execution.completed_at else None,
                "duration_seconds": node_execution.duration_seconds,
                "retry_count": node_execution.retry_count,
                "input_data": node_execution.input_data,
                "output_data": node_execution.output_data,
                "error_message": node_execution.error_message,
                "logs": node_execution.logs
            }
            
            # Add node configuration for debugging
            if node:
                node_debug["node_config"] = {
                    "agent_id": node.config.agent_id,
                    "action": node.config.action,
                    "parameters": node.config.parameters,
                    "timeout_seconds": node.config.timeout_seconds,
                    "retry_attempts": node.config.retry_attempts,
                    "approval_required": node.config.approval_required
                }
            
            debug_info["node_executions"].append(node_debug)
        
        # Add workflow structure for context
        debug_info["workflow_structure"] = {
            "total_nodes": len(workflow.nodes),
            "total_edges": len(workflow.edges),
            "node_types": list(set(n.type.value for n in workflow.nodes)),
            "has_approvals": any(n.config.approval_required for n in workflow.nodes),
            "has_parallel_paths": len(workflow.edges) > len(workflow.nodes) - 1
        }
        
        return debug_info
    
    # Helper methods
    
    async def _has_workflow_access(
        self,
        workflow_id: str,
        user_id: str,
        permission: str = "read"
    ) -> bool:
        """Check if user has access to workflow."""
        workflow = self.workflows.get(workflow_id)
        if not workflow:
            return False
        
        # Owner has full access
        if workflow.created_by == user_id:
            return True
        
        # Check collaborator access
        collaborators = self.collaborators.get(workflow_id, [])
        if user_id in collaborators:
            # In a real implementation, you would check specific permissions
            return True
        
        return False
    
    def _has_cycles(self, nodes: List[WorkflowNode], edges: List[WorkflowEdge]) -> bool:
        """Check if workflow has cycles (simplified implementation)."""
        # Build adjacency list
        graph = {}
        for node in nodes:
            graph[node.id] = []
        
        for edge in edges:
            if edge.source_node_id in graph:
                graph[edge.source_node_id].append(edge.target_node_id)
        
        # Simple cycle detection using DFS
        visited = set()
        rec_stack = set()
        
        def has_cycle_util(node_id):
            visited.add(node_id)
            rec_stack.add(node_id)
            
            for neighbor in graph.get(node_id, []):
                if neighbor not in visited:
                    if has_cycle_util(neighbor):
                        return True
                elif neighbor in rec_stack:
                    return True
            
            rec_stack.remove(node_id)
            return False
        
        for node_id in graph:
            if node_id not in visited:
                if has_cycle_util(node_id):
                    return True
        
        return False