"""
Workflow designer integration service for ACSO API Gateway.
"""

import asyncio
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple
from collections import defaultdict

from ..models.workflow import (
    WorkflowDefinition, WorkflowNode, WorkflowEdge, WorkflowVariable,
    WorkflowValidationResult, WorkflowCreateRequest, WorkflowNodeType,
    WorkflowTrigger, WorkflowNodeConfig, WorkflowNodePosition
)
from ..websocket.manager import websocket_manager


class DesignSession:
    """Represents an active workflow design session."""
    
    def __init__(self, workflow_id: str, user_id: str):
        self.workflow_id = workflow_id
        self.owner_id = user_id
        self.collaborators: Set[str] = set()
        self.created_at = datetime.utcnow()
        self.last_activity = datetime.utcnow()
        self.is_active = True
        self.changes_buffer: List[Dict[str, Any]] = []
        self.cursor_positions: Dict[str, Dict[str, Any]] = {}  # user_id -> cursor info
        self.selected_elements: Dict[str, List[str]] = defaultdict(list)  # user_id -> element_ids
        self.version = 1
        self.auto_save_enabled = True
        self.last_save = datetime.utcnow()


class WorkflowDesignerService:
    """Service for workflow designer integration and real-time collaboration."""
    
    def __init__(self):
        self.active_sessions: Dict[str, DesignSession] = {}  # workflow_id -> session
        self.user_sessions: Dict[str, Set[str]] = defaultdict(set)  # user_id -> workflow_ids
        self.workflow_locks: Dict[str, str] = {}  # workflow_id -> user_id (exclusive locks)
        self.change_history: Dict[str, List[Dict[str, Any]]] = defaultdict(list)
        self.validation_cache: Dict[str, WorkflowValidationResult] = {}
        
        # Start background cleanup task
        self.cleanup_task = asyncio.create_task(self._cleanup_inactive_sessions())
    
    async def start_design_session(
        self,
        workflow_id: str,
        user_id: str,
        workflow_data: Optional[WorkflowDefinition] = None
    ) -> DesignSession:
        """Start a new design session or join existing one."""
        if workflow_id in self.active_sessions:
            session = self.active_sessions[workflow_id]
            # Add user as collaborator
            session.collaborators.add(user_id)
            session.last_activity = datetime.utcnow()
        else:
            # Create new session
            session = DesignSession(workflow_id, user_id)
            self.active_sessions[workflow_id] = session
        
        # Track user sessions
        self.user_sessions[user_id].add(workflow_id)
        
        # Notify other collaborators about new user
        await self._broadcast_session_event(
            workflow_id,
            "user_joined",
            {
                "user_id": user_id,
                "collaborators": list(session.collaborators | {session.owner_id}),
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )
        
        return session
    
    async def end_design_session(self, workflow_id: str, user_id: str):
        """End a design session for a user."""
        if workflow_id not in self.active_sessions:
            return
        
        session = self.active_sessions[workflow_id]
        
        # Remove user from session
        session.collaborators.discard(user_id)
        self.user_sessions[user_id].discard(workflow_id)
        
        # Clean up user-specific data
        if user_id in session.cursor_positions:
            del session.cursor_positions[user_id]
        if user_id in session.selected_elements:
            del session.selected_elements[user_id]
        
        # Notify other collaborators
        await self._broadcast_session_event(
            workflow_id,
            "user_left",
            {
                "user_id": user_id,
                "collaborators": list(session.collaborators | {session.owner_id}),
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )
        
        # Remove session if no active users
        if session.owner_id == user_id and not session.collaborators:
            del self.active_sessions[workflow_id]
            if workflow_id in self.workflow_locks:
                del self.workflow_locks[workflow_id]
    
    async def apply_workflow_change(
        self,
        workflow_id: str,
        user_id: str,
        change_type: str,
        change_data: Dict[str, Any],
        broadcast: bool = True
    ) -> Dict[str, Any]:
        """Apply a change to the workflow and broadcast to collaborators."""
        if workflow_id not in self.active_sessions:
            raise ValueError("No active design session")
        
        session = self.active_sessions[workflow_id]
        
        # Check if user has permission to make changes
        if user_id not in (session.collaborators | {session.owner_id}):
            raise ValueError("User not authorized to modify workflow")
        
        # Create change record
        change_record = {
            "id": str(uuid.uuid4()),
            "type": change_type,
            "data": change_data,
            "user_id": user_id,
            "timestamp": datetime.utcnow(),
            "version": session.version
        }
        
        # Add to changes buffer
        session.changes_buffer.append(change_record)
        session.last_activity = datetime.utcnow()
        session.version += 1
        
        # Store in change history
        self.change_history[workflow_id].append(change_record)
        
        # Broadcast change to collaborators
        if broadcast:
            await self._broadcast_session_event(
                workflow_id,
                "workflow_change",
                {
                    "change": change_record,
                    "version": session.version
                },
                exclude_user=user_id
            )
        
        # Auto-save if enabled
        if session.auto_save_enabled:
            time_since_save = datetime.utcnow() - session.last_save
            if time_since_save.total_seconds() > 30:  # Auto-save every 30 seconds
                await self._auto_save_workflow(workflow_id)
        
        return change_record
    
    async def update_cursor_position(
        self,
        workflow_id: str,
        user_id: str,
        position: Dict[str, Any]
    ):
        """Update user's cursor position in the designer."""
        if workflow_id not in self.active_sessions:
            return
        
        session = self.active_sessions[workflow_id]
        session.cursor_positions[user_id] = {
            **position,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast cursor update
        await self._broadcast_session_event(
            workflow_id,
            "cursor_update",
            {
                "user_id": user_id,
                "position": position
            },
            exclude_user=user_id
        )
    
    async def update_selection(
        self,
        workflow_id: str,
        user_id: str,
        selected_elements: List[str]
    ):
        """Update user's selected elements in the designer."""
        if workflow_id not in self.active_sessions:
            return
        
        session = self.active_sessions[workflow_id]
        session.selected_elements[user_id] = selected_elements
        
        # Broadcast selection update
        await self._broadcast_session_event(
            workflow_id,
            "selection_update",
            {
                "user_id": user_id,
                "selected_elements": selected_elements
            },
            exclude_user=user_id
        )
    
    async def validate_workflow_realtime(
        self,
        workflow_id: str,
        workflow_data: WorkflowCreateRequest
    ) -> WorkflowValidationResult:
        """Perform real-time validation of workflow."""
        from .workflow_service import WorkflowService
        
        workflow_service = WorkflowService()
        validation_result = await workflow_service.validate_workflow_definition(workflow_data)
        
        # Cache validation result
        self.validation_cache[workflow_id] = validation_result
        
        # Broadcast validation result to all session participants
        if workflow_id in self.active_sessions:
            await self._broadcast_session_event(
                workflow_id,
                "validation_update",
                {
                    "validation_result": {
                        "valid": validation_result.valid,
                        "errors": validation_result.errors,
                        "warnings": validation_result.warnings,
                        "suggestions": validation_result.suggestions
                    },
                    "timestamp": datetime.utcnow().isoformat()
                }
            )
        
        return validation_result
    
    async def test_workflow_node(
        self,
        workflow_id: str,
        node_id: str,
        test_data: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """Test a single workflow node with sample data."""
        if workflow_id not in self.active_sessions:
            raise ValueError("No active design session")
        
        # Simulate node execution
        test_result = {
            "node_id": node_id,
            "test_id": str(uuid.uuid4()),
            "status": "success",
            "execution_time": 1.5,  # Simulated
            "input_data": test_data,
            "output_data": {
                "result": "success",
                "message": "Node test completed successfully",
                "test_mode": True
            },
            "logs": [
                f"Starting test for node {node_id}",
                "Processing input data...",
                "Test completed successfully"
            ],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast test result
        await self._broadcast_session_event(
            workflow_id,
            "node_test_result",
            {
                "test_result": test_result,
                "tested_by": user_id
            }
        )
        
        return test_result
    
    async def debug_workflow_path(
        self,
        workflow_id: str,
        start_node_id: str,
        input_data: Dict[str, Any],
        user_id: str
    ) -> Dict[str, Any]:
        """Debug a workflow execution path from a specific node."""
        if workflow_id not in self.active_sessions:
            raise ValueError("No active design session")
        
        # Simulate path debugging
        debug_result = {
            "debug_id": str(uuid.uuid4()),
            "start_node_id": start_node_id,
            "input_data": input_data,
            "execution_path": [
                {
                    "node_id": start_node_id,
                    "step": 1,
                    "status": "completed",
                    "duration": 0.5,
                    "output": {"step_result": "success"}
                },
                {
                    "node_id": "next_node",
                    "step": 2,
                    "status": "completed",
                    "duration": 0.8,
                    "output": {"step_result": "success"}
                }
            ],
            "total_duration": 1.3,
            "status": "completed",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Broadcast debug result
        await self._broadcast_session_event(
            workflow_id,
            "debug_result",
            {
                "debug_result": debug_result,
                "debugged_by": user_id
            }
        )
        
        return debug_result
    
    async def get_node_suggestions(
        self,
        workflow_id: str,
        context: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Get intelligent node suggestions based on context."""
        suggestions = []
        
        # Analyze context to provide relevant suggestions
        if context.get("previous_node_type") == "start":
            suggestions.extend([
                {
                    "type": "task",
                    "name": "Data Validation",
                    "description": "Validate input data before processing",
                    "category": "data",
                    "confidence": 0.9
                },
                {
                    "type": "decision",
                    "name": "Condition Check",
                    "description": "Add conditional logic to your workflow",
                    "category": "logic",
                    "confidence": 0.8
                }
            ])
        elif context.get("previous_node_type") == "task":
            suggestions.extend([
                {
                    "type": "notification",
                    "name": "Send Alert",
                    "description": "Notify users about task completion",
                    "category": "communication",
                    "confidence": 0.7
                },
                {
                    "type": "approval",
                    "name": "Require Approval",
                    "description": "Add human approval step",
                    "category": "governance",
                    "confidence": 0.6
                }
            ])
        
        # Add common suggestions
        suggestions.extend([
            {
                "type": "end",
                "name": "End Workflow",
                "description": "Complete the workflow execution",
                "category": "control",
                "confidence": 0.5
            }
        ])
        
        return suggestions
    
    async def get_session_info(self, workflow_id: str) -> Optional[Dict[str, Any]]:
        """Get information about an active design session."""
        if workflow_id not in self.active_sessions:
            return None
        
        session = self.active_sessions[workflow_id]
        
        return {
            "workflow_id": workflow_id,
            "owner_id": session.owner_id,
            "collaborators": list(session.collaborators),
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "version": session.version,
            "auto_save_enabled": session.auto_save_enabled,
            "last_save": session.last_save.isoformat(),
            "cursor_positions": session.cursor_positions,
            "selected_elements": dict(session.selected_elements),
            "pending_changes": len(session.changes_buffer),
            "is_locked": workflow_id in self.workflow_locks
        }
    
    async def get_change_history(
        self,
        workflow_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> List[Dict[str, Any]]:
        """Get change history for a workflow."""
        changes = self.change_history.get(workflow_id, [])
        
        # Sort by timestamp (newest first)
        sorted_changes = sorted(changes, key=lambda x: x["timestamp"], reverse=True)
        
        # Apply pagination
        paginated_changes = sorted_changes[offset:offset + limit]
        
        # Convert to serializable format
        serializable_changes = []
        for change in paginated_changes:
            serializable_changes.append({
                "id": change["id"],
                "type": change["type"],
                "data": change["data"],
                "user_id": change["user_id"],
                "timestamp": change["timestamp"].isoformat(),
                "version": change["version"]
            })
        
        return serializable_changes
    
    async def revert_to_version(
        self,
        workflow_id: str,
        target_version: int,
        user_id: str
    ) -> bool:
        """Revert workflow to a specific version."""
        if workflow_id not in self.active_sessions:
            return False
        
        session = self.active_sessions[workflow_id]
        
        # Check permissions
        if user_id != session.owner_id:
            return False
        
        # Find changes to revert
        changes_to_revert = [
            change for change in self.change_history[workflow_id]
            if change["version"] > target_version
        ]
        
        # Apply revert
        revert_change = await self.apply_workflow_change(
            workflow_id,
            user_id,
            "revert",
            {
                "target_version": target_version,
                "reverted_changes": len(changes_to_revert)
            }
        )
        
        return True
    
    async def lock_workflow(self, workflow_id: str, user_id: str) -> bool:
        """Lock workflow for exclusive editing."""
        if workflow_id in self.workflow_locks:
            return self.workflow_locks[workflow_id] == user_id
        
        self.workflow_locks[workflow_id] = user_id
        
        # Notify other users about lock
        await self._broadcast_session_event(
            workflow_id,
            "workflow_locked",
            {
                "locked_by": user_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )
        
        return True
    
    async def unlock_workflow(self, workflow_id: str, user_id: str) -> bool:
        """Unlock workflow."""
        if workflow_id not in self.workflow_locks:
            return True
        
        if self.workflow_locks[workflow_id] != user_id:
            return False
        
        del self.workflow_locks[workflow_id]
        
        # Notify other users about unlock
        await self._broadcast_session_event(
            workflow_id,
            "workflow_unlocked",
            {
                "unlocked_by": user_id,
                "timestamp": datetime.utcnow().isoformat()
            },
            exclude_user=user_id
        )
        
        return True
    
    async def _broadcast_session_event(
        self,
        workflow_id: str,
        event_type: str,
        event_data: Dict[str, Any],
        exclude_user: Optional[str] = None
    ):
        """Broadcast an event to all session participants."""
        if workflow_id not in self.active_sessions:
            return
        
        session = self.active_sessions[workflow_id]
        participants = session.collaborators | {session.owner_id}
        
        if exclude_user:
            participants.discard(exclude_user)
        
        if participants:
            message = {
                "type": event_type,
                "workflow_id": workflow_id,
                **event_data
            }
            
            await websocket_manager.broadcast_to_users(
                list(participants),
                message
            )
    
    async def _auto_save_workflow(self, workflow_id: str):
        """Auto-save workflow changes."""
        if workflow_id not in self.active_sessions:
            return
        
        session = self.active_sessions[workflow_id]
        
        if not session.changes_buffer:
            return
        
        # Mark as saved
        session.last_save = datetime.utcnow()
        session.changes_buffer.clear()
        
        # Notify participants about auto-save
        await self._broadcast_session_event(
            workflow_id,
            "auto_saved",
            {
                "timestamp": session.last_save.isoformat(),
                "version": session.version
            }
        )
    
    async def _cleanup_inactive_sessions(self):
        """Background task to clean up inactive sessions."""
        try:
            while True:
                await asyncio.sleep(300)  # Check every 5 minutes
                
                current_time = datetime.utcnow()
                inactive_sessions = []
                
                for workflow_id, session in self.active_sessions.items():
                    # Consider session inactive after 30 minutes of no activity
                    if (current_time - session.last_activity).total_seconds() > 1800:
                        inactive_sessions.append(workflow_id)
                
                # Clean up inactive sessions
                for workflow_id in inactive_sessions:
                    session = self.active_sessions[workflow_id]
                    
                    # Auto-save before cleanup
                    if session.changes_buffer:
                        await self._auto_save_workflow(workflow_id)
                    
                    # Remove session
                    del self.active_sessions[workflow_id]
                    
                    # Clean up user sessions
                    for user_id in session.collaborators | {session.owner_id}:
                        self.user_sessions[user_id].discard(workflow_id)
                    
                    # Remove lock if exists
                    if workflow_id in self.workflow_locks:
                        del self.workflow_locks[workflow_id]
        
        except asyncio.CancelledError:
            pass
        except Exception as e:
            print(f"Error in session cleanup: {e}")
    
    async def cleanup(self):
        """Cleanup designer service resources."""
        if hasattr(self, 'cleanup_task'):
            self.cleanup_task.cancel()
        
        # Clear all data
        self.active_sessions.clear()
        self.user_sessions.clear()
        self.workflow_locks.clear()
        self.change_history.clear()
        self.validation_cache.clear()


# Global designer service instance
designer_service = WorkflowDesignerService()