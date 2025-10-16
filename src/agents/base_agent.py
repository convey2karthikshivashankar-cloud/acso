"""
Base agent implementation for ACSO system.
"""

import asyncio
import logging
import uuid
from datetime import datetime
from typing import Dict, Any, Optional, List
from abc import abstractmethod

from ..shared.interfaces import AgentInterface
from ..shared.models import (
    AgentState, AgentType, AgentStatus, Task, TaskStatus, 
    AgentMessage, AgentMemory
)
from ..shared.communication import AgentCommunicationManager
from ..shared.aws_integration import (
    bedrock_client, cloudwatch_logger, cloudwatch_metrics,
    iam_security, kms_encryption
)
from config.settings import settings


class BaseAgent(AgentInterface):
    """Base implementation for all ACSO agents."""
    
    def __init__(self, agent_id: str, agent_type: AgentType):
        self.agent_id = agent_id
        self.agent_type = agent_type
        self.status = AgentStatus.IDLE
        self.current_task: Optional[Task] = None
        self.capabilities: List[str] = []
        self.memory = AgentMemory()
        
        # AWS integration
        self.bedrock_session_id: Optional[str] = None
        
        # Communication
        self.comm_manager = AgentCommunicationManager(agent_id)
        
        # Logging
        self.logger = logging.getLogger(f"acso.agent.{agent_id}")
        
        # Task management
        self.task_queue: asyncio.Queue = asyncio.Queue()
        self.running = False
        
    async def initialize(self) -> None:
        """Initialize the agent and its resources."""
        try:
            self.logger.info(f"Initializing agent {self.agent_id}")
            
            # Initialize communication
            await self.comm_manager.initialize()
            
            # Register message handlers
            self._register_message_handlers()
            
            # Create Bedrock session
            self.bedrock_session_id = await bedrock_client.create_agent_session(self.agent_id)
            
            # Initialize CloudWatch logging
            await cloudwatch_logger.create_log_group_if_not_exists()
            
            # Log initialization
            await self._log_activity("initialization", {"status": "success"})
            
            # Start task processing
            self.running = True
            asyncio.create_task(self._process_tasks())
            
            self.status = AgentStatus.ACTIVE
            self.logger.info(f"Agent {self.agent_id} initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize agent {self.agent_id}: {e}")
            self.status = AgentStatus.ERROR
            raise
            
    async def shutdown(self) -> None:
        """Gracefully shutdown the agent."""
        try:
            self.logger.info(f"Shutting down agent {self.agent_id}")
            
            self.running = False
            self.status = AgentStatus.IDLE
            
            # Complete current task if any
            if self.current_task:
                await self._complete_task(self.current_task, {"status": "interrupted"}, False)
                
            # Shutdown communication
            await self.comm_manager.shutdown()
            
            # Log shutdown
            await self._log_activity("shutdown", {"status": "success"})
            
            self.logger.info(f"Agent {self.agent_id} shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during agent shutdown: {e}")
            
    async def execute_task(self, task: Task) -> Dict[str, Any]:
        """Execute a given task and return results."""
        try:
            self.logger.info(f"Executing task {task.task_id}")
            
            # Validate permissions
            if not await self._validate_task_permissions(task):
                return {
                    "success": False,
                    "error": "Insufficient permissions for task",
                    "task_id": task.task_id
                }
                
            # Update agent state
            self.current_task = task
            self.status = AgentStatus.PROCESSING
            task.status = TaskStatus.IN_PROGRESS
            
            # Log task start
            await self._log_activity("task_start", {
                "task_id": task.task_id,
                "task_type": task.type,
                "priority": task.priority
            })
            
            # Execute the task (implemented by subclasses)
            result = await self._execute_task_implementation(task)
            
            # Complete the task
            success = result.get("success", True)
            await self._complete_task(task, result, success)
            
            return result
            
        except Exception as e:
            self.logger.error(f"Task execution failed: {e}")
            error_result = {
                "success": False,
                "error": str(e),
                "task_id": task.task_id
            }
            await self._complete_task(task, error_result, False)
            return error_result
            
    async def get_state(self) -> AgentState:
        """Get current agent state."""
        return AgentState(
            agent_id=self.agent_id,
            agent_type=self.agent_type,
            status=self.status,
            current_task=self.current_task,
            capabilities=self.capabilities,
            memory=self.memory
        )
        
    async def handle_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Handle incoming message from another agent."""
        try:
            self.logger.debug(f"Handling message {message.message_id} from {message.sender_id}")
            
            # Log message receipt
            await self._log_activity("message_received", {
                "message_id": message.message_id,
                "sender": message.sender_id,
                "type": message.message_type
            })
            
            # Process message based on type
            response = await self._process_message(message)
            
            return response
            
        except Exception as e:
            self.logger.error(f"Message handling failed: {e}")
            return None
            
    @abstractmethod
    async def _execute_task_implementation(self, task: Task) -> Dict[str, Any]:
        """Execute task implementation - must be implemented by subclasses."""
        pass
        
    async def _process_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Process incoming message - can be overridden by subclasses."""
        if message.message_type == "task_assignment":
            # Handle task assignment
            task_data = message.payload.get("task_data", {})
            task = Task(**task_data)
            await self.task_queue.put(task)
            
        elif message.message_type == "status_request":
            # Handle status request
            state = await self.get_state()
            return AgentMessage(
                message_id=str(uuid.uuid4()),
                sender_id=self.agent_id,
                recipient_id=message.sender_id,
                message_type="status_response",
                payload={"state": state.dict()},
                timestamp=datetime.utcnow()
            )
            
        return None
        
    def _register_message_handlers(self) -> None:
        """Register message handlers with communication manager."""
        self.comm_manager.register_handler("task_assignment", self._handle_task_assignment)
        self.comm_manager.register_handler("status_request", self._handle_status_request)
        self.comm_manager.register_handler("shutdown", self._handle_shutdown_message)
        
    async def _handle_task_assignment(self, message: AgentMessage) -> None:
        """Handle task assignment message."""
        task_data = message.payload.get("task_data", {})
        task = Task(**task_data)
        await self.task_queue.put(task)
        
    async def _handle_status_request(self, message: AgentMessage) -> None:
        """Handle status request message."""
        state = await self.get_state()
        response = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id=self.agent_id,
            recipient_id=message.sender_id,
            message_type="status_response",
            payload={"state": state.dict()},
            timestamp=datetime.utcnow()
        )
        await self.comm_manager.send_message(
            response.recipient_id, response.message_type, response.payload
        )
        
    async def _handle_shutdown_message(self, message: AgentMessage) -> None:
        """Handle shutdown message."""
        await self.shutdown()
        
    async def _process_tasks(self) -> None:
        """Process tasks from the task queue."""
        while self.running:
            try:
                # Wait for task with timeout
                task = await asyncio.wait_for(self.task_queue.get(), timeout=1.0)
                
                # Execute task
                result = await self.execute_task(task)
                
                # Send result back to supervisor
                await self.comm_manager.send_message(
                    recipient_id="supervisor-001",  # Default supervisor ID
                    message_type="task_result",
                    payload={
                        "task_id": task.task_id,
                        "result": result,
                        "success": result.get("success", True)
                    }
                )
                
            except asyncio.TimeoutError:
                # No tasks in queue, continue
                continue
            except Exception as e:
                self.logger.error(f"Task processing error: {e}")
                await asyncio.sleep(1)
                
    async def _validate_task_permissions(self, task: Task) -> bool:
        """Validate that the agent has permissions to execute the task."""
        try:
            # Check IAM permissions
            action = f"acso:{task.type}"
            return await iam_security.validate_agent_permissions(self.agent_id, action)
        except Exception as e:
            self.logger.error(f"Permission validation failed: {e}")
            return False
            
    async def _complete_task(self, task: Task, result: Dict[str, Any], success: bool) -> None:
        """Complete a task and update state."""
        try:
            # Update task status
            task.status = TaskStatus.COMPLETED if success else TaskStatus.FAILED
            task.completed_at = datetime.utcnow()
            task.results = result
            
            # Update agent state
            self.current_task = None
            self.status = AgentStatus.ACTIVE
            
            # Log task completion
            await self._log_activity("task_complete", {
                "task_id": task.task_id,
                "success": success,
                "duration": (task.completed_at - task.created_at).total_seconds()
            })
            
            # Update metrics
            await cloudwatch_metrics.put_agent_metrics(self.agent_id, {
                "TasksCompleted": 1.0,
                "TaskSuccess": 1.0 if success else 0.0,
                "TaskDuration": (task.completed_at - task.created_at).total_seconds()
            })
            
        except Exception as e:
            self.logger.error(f"Task completion failed: {e}")
            
    async def _log_activity(self, activity: str, details: Dict[str, Any]) -> None:
        """Log agent activity to CloudWatch."""
        try:
            await cloudwatch_logger.log_agent_activity(self.agent_id, activity, details)
        except Exception as e:
            self.logger.error(f"Activity logging failed: {e}")
            
    async def _store_memory(self, key: str, value: Any, memory_type: str = "short_term") -> None:
        """Store data in agent memory."""
        try:
            if memory_type == "short_term":
                self.memory.short_term[key] = value
            else:
                self.memory.long_term[key] = value
                
            # Encrypt sensitive data if configured
            if settings.security.encryption_enabled:
                encrypted_value = await kms_encryption.encrypt_data(str(value))
                if encrypted_value:
                    if memory_type == "short_term":
                        self.memory.short_term[f"{key}_encrypted"] = encrypted_value
                    else:
                        self.memory.long_term[f"{key}_encrypted"] = encrypted_value
                        
        except Exception as e:
            self.logger.error(f"Memory storage failed: {e}")
            
    async def _retrieve_memory(self, key: str, memory_type: str = "short_term") -> Optional[Any]:
        """Retrieve data from agent memory."""
        try:
            memory_store = self.memory.short_term if memory_type == "short_term" else self.memory.long_term
            
            # Try encrypted version first if encryption is enabled
            if settings.security.encryption_enabled:
                encrypted_key = f"{key}_encrypted"
                if encrypted_key in memory_store:
                    encrypted_value = memory_store[encrypted_key]
                    decrypted_value = await kms_encryption.decrypt_data(encrypted_value)
                    return decrypted_value
                    
            # Return regular value
            return memory_store.get(key)
            
        except Exception as e:
            self.logger.error(f"Memory retrieval failed: {e}")
            return None
            
    async def _invoke_bedrock_agent(self, input_text: str) -> Dict[str, Any]:
        """Invoke Bedrock agent for AI processing."""
        try:
            if not self.bedrock_session_id:
                self.bedrock_session_id = await bedrock_client.create_agent_session(self.agent_id)
                
            result = await bedrock_client.invoke_agent(
                agent_id=self.agent_id,
                session_id=self.bedrock_session_id,
                input_text=input_text
            )
            
            return result
            
        except Exception as e:
            self.logger.error(f"Bedrock agent invocation failed: {e}")
            return {
                "success": False,
                "error": str(e)
            }