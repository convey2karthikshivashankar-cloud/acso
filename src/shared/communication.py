"""
Communication protocols and message handling for ACSO agents.
"""

import asyncio
import json
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field

from .models import AgentMessage
from .interfaces import CommunicationProtocol


@dataclass
class MessageHandler:
    """Handler for specific message types."""
    message_type: str
    handler_func: Callable[[AgentMessage], Any]
    agent_id: str


class AgentCommunicationManager:
    """Manages communication between agents in the ACSO system."""
    
    def __init__(self, agent_id: str):
        self.agent_id = agent_id
        self.message_handlers: Dict[str, MessageHandler] = {}
        self.message_queue: asyncio.Queue = asyncio.Queue()
        self.connected_agents: Dict[str, bool] = {}
        self.running = False
        
        # Message routing for multi-agent coordination
        self.message_router: Dict[str, asyncio.Queue] = {}
        self.global_message_bus: Optional[asyncio.Queue] = None
        
    async def initialize(self) -> None:
        """Initialize the communication manager."""
        self.running = True
        
        # Initialize global message bus for coordination
        if not self.global_message_bus:
            self.global_message_bus = asyncio.Queue()
            
        # Register this agent's message queue
        self.message_router[self.agent_id] = self.message_queue
        
        # Start message processing loop
        asyncio.create_task(self._process_messages())
        
        # Start coordination message processing
        asyncio.create_task(self._process_coordination_messages())
        
    async def shutdown(self) -> None:
        """Shutdown the communication manager."""
        self.running = False
        
    def register_handler(self, message_type: str, handler_func: Callable[[AgentMessage], Any]) -> None:
        """Register a handler for a specific message type."""
        self.message_handlers[message_type] = MessageHandler(
            message_type=message_type,
            handler_func=handler_func,
            agent_id=self.agent_id
        )
        
    async def send_message(self, recipient_id: str, message_type: str, payload: Dict[str, Any]) -> bool:
        """Send a message to another agent."""
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id=self.agent_id,
            recipient_id=recipient_id,
            message_type=message_type,
            payload=payload,
            timestamp=datetime.utcnow()
        )
        
        try:
            # In a real implementation, this would use AWS services like SQS or EventBridge
            # For the prototype, we'll simulate message delivery
            await self._deliver_message(message)
            return True
        except Exception as e:
            print(f"Failed to send message: {e}")
            return False
            
    async def broadcast_message(self, message_type: str, payload: Dict[str, Any], recipients: List[str]) -> Dict[str, bool]:
        """Broadcast a message to multiple agents."""
        results = {}
        for recipient_id in recipients:
            success = await self.send_message(recipient_id, message_type, payload)
            results[recipient_id] = success
        return results
        
    async def receive_message(self) -> Optional[AgentMessage]:
        """Receive a message from the queue."""
        try:
            message = await asyncio.wait_for(self.message_queue.get(), timeout=1.0)
            return message
        except asyncio.TimeoutError:
            return None
            
    async def _deliver_message(self, message: AgentMessage) -> None:
        """Deliver a message to the recipient's queue."""
        # Route message to appropriate agent queue
        recipient_queue = self.message_router.get(message.recipient_id)
        if recipient_queue:
            await recipient_queue.put(message)
        else:
            # If recipient not found locally, use global message bus
            if self.global_message_bus:
                await self.global_message_bus.put(message)
            else:
                print(f"Cannot deliver message to {message.recipient_id} - no route found")
        
    async def _process_messages(self) -> None:
        """Process incoming messages."""
        while self.running:
            try:
                message = await self.receive_message()
                if message:
                    await self._handle_message(message)
            except Exception as e:
                print(f"Error processing message: {e}")
                await asyncio.sleep(1)
                
    async def _handle_message(self, message: AgentMessage) -> None:
        """Handle an incoming message."""
        handler = self.message_handlers.get(message.message_type)
        if handler:
            try:
                await handler.handler_func(message)
            except Exception as e:
                print(f"Error handling message {message.message_id}: {e}")
        else:
            print(f"No handler for message type: {message.message_type}")


class TaskCoordinator:
    """Coordinates task distribution and result aggregation."""
    
    def __init__(self, communication_manager: AgentCommunicationManager):
        self.comm_manager = communication_manager
        self.pending_tasks: Dict[str, Dict[str, Any]] = {}
        self.task_results: Dict[str, Dict[str, Any]] = {}
        
    async def delegate_task(self, task_id: str, agent_id: str, task_data: Dict[str, Any]) -> None:
        """Delegate a task to a specific agent."""
        self.pending_tasks[task_id] = {
            "agent_id": agent_id,
            "task_data": task_data,
            "timestamp": datetime.utcnow()
        }
        
        await self.comm_manager.send_message(
            recipient_id=agent_id,
            message_type="task_assignment",
            payload={
                "task_id": task_id,
                "task_data": task_data
            }
        )
        
    async def handle_task_result(self, message: AgentMessage) -> None:
        """Handle task completion results."""
        task_id = message.payload.get("task_id")
        if task_id in self.pending_tasks:
            self.task_results[task_id] = {
                "agent_id": message.sender_id,
                "result": message.payload.get("result"),
                "timestamp": message.timestamp,
                "success": message.payload.get("success", True)
            }
            del self.pending_tasks[task_id]
            
    async def get_task_result(self, task_id: str, timeout: float = 30.0) -> Optional[Dict[str, Any]]:
        """Wait for and retrieve task result."""
        start_time = datetime.utcnow()
        while (datetime.utcnow() - start_time).total_seconds() < timeout:
            if task_id in self.task_results:
                return self.task_results.pop(task_id)
            await asyncio.sleep(0.1)
        return None


class HumanApprovalManager:
    """Manages human-in-the-loop approval workflows."""
    
    def __init__(self, communication_manager: AgentCommunicationManager):
        self.comm_manager = communication_manager
        self.pending_approvals: Dict[str, Dict[str, Any]] = {}
        
    async def request_approval(self, action: str, risk_assessment: Dict[str, Any], context: Dict[str, Any]) -> bool:
        """Request human approval for a high-risk action."""
        approval_id = str(uuid.uuid4())
        
        self.pending_approvals[approval_id] = {
            "action": action,
            "risk_assessment": risk_assessment,
            "context": context,
            "timestamp": datetime.utcnow(),
            "status": "pending"
        }
        
        # In a real implementation, this would integrate with a human interface
        # For the prototype, we'll simulate approval based on risk level
        risk_score = risk_assessment.get("risk_score", 0.0)
        
        # Simulate human approval decision
        if risk_score < 0.7:
            approved = True
        elif risk_score < 0.9:
            # Simulate human review time
            await asyncio.sleep(2)
            approved = True  # Assume approval for demo
        else:
            approved = False  # Auto-reject very high risk
            
        self.pending_approvals[approval_id]["status"] = "approved" if approved else "rejected"
        return approved
        
    async def get_pending_approvals(self) -> List[Dict[str, Any]]:
        """Get list of pending approval requests."""
        return [
            {"approval_id": aid, **data}
            for aid, data in self.pending_approvals.items()
            if data["status"] == "pending"
        ]   
 async def _process_coordination_messages(self) -> None:
        """Process messages from the global coordination bus."""
        while self.running:
            try:
                if self.global_message_bus:
                    message = await asyncio.wait_for(self.global_message_bus.get(), timeout=1.0)
                    
                    # Check if this message is for us
                    if message.recipient_id == self.agent_id:
                        await self.message_queue.put(message)
                    else:
                        # Route to appropriate agent if we know them
                        recipient_queue = self.message_router.get(message.recipient_id)
                        if recipient_queue:
                            await recipient_queue.put(message)
                        else:
                            # Put back on global bus for other agents to handle
                            await self.global_message_bus.put(message)
                            
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                print(f"Coordination message processing error: {e}")
                await asyncio.sleep(1)
                
    def register_agent_queue(self, agent_id: str, queue: asyncio.Queue) -> None:
        """Register another agent's message queue for direct routing."""
        self.message_router[agent_id] = queue
        
    def unregister_agent_queue(self, agent_id: str) -> None:
        """Unregister an agent's message queue."""
        if agent_id in self.message_router:
            del self.message_router[agent_id]
            
    async def discover_agents(self) -> List[str]:
        """Discover other agents in the system."""
        return list(self.message_router.keys())
        
    async def ping_agent(self, agent_id: str) -> bool:
        """Ping another agent to check if it's responsive."""
        try:
            ping_message = AgentMessage(
                message_id=str(uuid.uuid4()),
                sender_id=self.agent_id,
                recipient_id=agent_id,
                message_type="ping",
                payload={"timestamp": datetime.utcnow().isoformat()},
                timestamp=datetime.utcnow()
            )
            
            success = await self.send_message(agent_id, "ping", ping_message.payload)
            return success
            
        except Exception as e:
            print(f"Agent ping failed: {e}")
            return False