#!/usr/bin/env python3
"""
ACSO Cross-Agent Communication Integration Tests

Tests for validating communication protocols, message routing, and coordination
between different ACSO agents in various scenarios.
"""

import asyncio
import json
import pytest
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from unittest.mock import AsyncMock, MagicMock, patch

from src.shared.communication import MessageBus, MessageRouter, MessageQueue
from src.shared.coordination import WorkflowCoordinator, TaskDistributor
from src.shared.models import AgentMessage, WorkflowStatus, TaskAssignment
from src.agents.base_agent import BaseAgent
from config.settings import Settings


class MockAgent(BaseAgent):
    """Mock agent for testing communication."""
    
    def __init__(self, agent_id: str, agent_type: str):
        super().__init__(agent_id, agent_type)
        self.received_messages = []
        self.sent_messages = []
        
    async def handle_message(self, message: AgentMessage) -> Optional[AgentMessage]:
        """Handle incoming messages."""
        self.received_messages.append(message)
        
        # Echo back for testing
        if message.message_type == "ping":
            response = AgentMessage(
                message_id=str(uuid.uuid4()),
                sender_id=self.agent_id,
                recipient_id=message.sender_id,
                message_type="pong",
                payload={"original_message_id": message.message_id},
                workflow_id=message.workflow_id,
                timestamp=datetime.utcnow()
            )
            return response
            
        return None
        
    async def send_message(self, message: AgentMessage):
        """Send message through message bus."""
        self.sent_messages.append(message)
        if self.message_bus:
            await self.message_bus.send_message(message)


class TestMessageBusOperations:
    """Test message bus core operations."""
    
    @pytest.fixture
    async def message_bus(self):
        """Create message bus for testing."""
        bus = MessageBus()
        await bus.initialize()
        yield bus
        await bus.shutdown()
        
    @pytest.mark.asyncio
    async def test_basic_message_sending(self, message_bus):
        """Test basic message sending and receiving."""
        # Create test agents
        agent1 = MockAgent("agent-001", "test-agent")
        agent2 = MockAgent("agent-002", "test-agent")
        
        # Register agents with message bus
        await message_bus.register_agent(agent1)
        await message_bus.register_agent(agent2)
        
        # Create test message
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="agent-001",
            recipient_id="agent-002",
            message_type="test_message",
            payload={"test_data": "hello world"},
            workflow_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow()
        )
        
        # Send message
        await message_bus.send_message(message)
        await asyncio.sleep(0.1)  # Allow processing
        
        # Verify message was received
        assert len(agent2.received_messages) == 1
        received_message = agent2.received_messages[0]
        assert received_message.message_id == message.message_id
        assert received_message.sender_id == "agent-001"
        assert received_message.payload["test_data"] == "hello world"
        
    @pytest.mark.asyncio
    async def test_broadcast_messaging(self, message_bus):
        """Test broadcasting messages to multiple agents."""
        # Create multiple test agents
        agents = []
        for i in range(3):
            agent = MockAgent(f"agent-{i:03d}", "test-agent")
            agents.append(agent)
            await message_bus.register_agent(agent)
            
        # Create broadcast message
        broadcast_message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="supervisor-001",
            recipient_id="*",  # Broadcast to all
            message_type="broadcast_alert",
            payload={"alert": "system maintenance in 30 minutes"},
            workflow_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow()
        )
        
        # Send broadcast
        await message_bus.broadcast_message(broadcast_message)
        await asyncio.sleep(0.1)
        
        # Verify all agents received the message
        for agent in agents:
            assert len(agent.received_messages) == 1
            received = agent.received_messages[0]
            assert received.message_type == "broadcast_alert"
            assert received.payload["alert"] == "system maintenance in 30 minutes"
            
    @pytest.mark.asyncio
    async def test_message_routing_with_filters(self, message_bus):
        """Test message routing with type and priority filters."""
        # Create specialized agents
        threat_agent = MockAgent("threat-hunter-001", "threat-hunter")
        incident_agent = MockAgent("incident-response-001", "incident-response")
        service_agent = MockAgent("service-orchestration-001", "service-orchestration")
        
        agents = [threat_agent, incident_agent, service_agent]
        for agent in agents:
            await message_bus.register_agent(agent)
            
        # Set up routing rules
        routing_rules = {
            "threat_alert": ["threat-hunter", "incident-response"],
            "service_request": ["service-orchestration"],
            "system_status": ["*"]  # All agents
        }
        
        await message_bus.configure_routing_rules(routing_rules)
        
        # Send threat alert
        threat_message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="external-system",
            recipient_id="auto-route",
            message_type="threat_alert",
            payload={"threat_level": "high"},
            workflow_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow()
        )
        
        await message_bus.route_message(threat_message)
        await asyncio.sleep(0.1)
        
        # Verify routing
        assert len(threat_agent.received_messages) == 1
        assert len(incident_agent.received_messages) == 1
        assert len(service_agent.received_messages) == 0  # Should not receive threat alerts
        
        # Clear messages
        for agent in agents:
            agent.received_messages.clear()
            
        # Send service request
        service_message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="external-system",
            recipient_id="auto-route",
            message_type="service_request",
            payload={"request_type": "patch_deployment"},
            workflow_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow()
        )
        
        await message_bus.route_message(service_message)
        await asyncio.sleep(0.1)
        
        # Verify only service agent received it
        assert len(threat_agent.received_messages) == 0
        assert len(incident_agent.received_messages) == 0
        assert len(service_agent.received_messages) == 1
        
    @pytest.mark.asyncio
    async def test_message_persistence_and_replay(self, message_bus):
        """Test message persistence and replay capabilities."""
        # Enable message persistence
        await message_bus.enable_persistence()
        
        # Create test agent
        agent = MockAgent("agent-001", "test-agent")
        await message_bus.register_agent(agent)
        
        # Send multiple messages
        workflow_id = str(uuid.uuid4())
        messages = []
        
        for i in range(5):
            message = AgentMessage(
                message_id=str(uuid.uuid4()),
                sender_id="test-sender",
                recipient_id="agent-001",
                message_type="sequence_test",
                payload={"sequence": i, "data": f"message_{i}"},
                workflow_id=workflow_id,
                timestamp=datetime.utcnow()
            )
            messages.append(message)
            await message_bus.send_message(message)
            await asyncio.sleep(0.05)
            
        # Verify all messages received
        assert len(agent.received_messages) == 5
        
        # Test message replay
        replayed_messages = await message_bus.replay_messages(workflow_id)
        assert len(replayed_messages) == 5
        
        # Verify message order preserved
        for i, msg in enumerate(replayed_messages):
            assert msg.payload["sequence"] == i
            
    @pytest.mark.asyncio
    async def test_message_acknowledgment_and_retry(self, message_bus):
        """Test message acknowledgment and retry mechanisms."""
        # Create agent that sometimes fails to process messages
        class UnreliableAgent(MockAgent):
            def __init__(self, agent_id: str):
                super().__init__(agent_id, "unreliable-agent")
                self.failure_count = 0
                
            async def handle_message(self, message: AgentMessage) -> Optional[AgentMessage]:
                self.received_messages.append(message)
                
                # Fail first two attempts
                if self.failure_count < 2:
                    self.failure_count += 1
                    raise Exception("Simulated processing failure")
                    
                # Succeed on third attempt
                return AgentMessage(
                    message_id=str(uuid.uuid4()),
                    sender_id=self.agent_id,
                    recipient_id=message.sender_id,
                    message_type="ack",
                    payload={"acknowledged": True},
                    workflow_id=message.workflow_id,
                    timestamp=datetime.utcnow()
                )
                
        unreliable_agent = UnreliableAgent("unreliable-001")
        await message_bus.register_agent(unreliable_agent)
        
        # Configure retry policy
        retry_config = {
            "max_retries": 3,
            "retry_delay": 0.1,
            "exponential_backoff": True
        }
        await message_bus.configure_retry_policy(retry_config)
        
        # Send message that will initially fail
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="test-sender",
            recipient_id="unreliable-001",
            message_type="retry_test",
            payload={"test": "retry_mechanism"},
            workflow_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            requires_ack=True
        )
        
        # Send message and wait for retries
        await message_bus.send_message(message)
        await asyncio.sleep(1)  # Allow time for retries
        
        # Verify message was eventually processed
        assert len(unreliable_agent.received_messages) == 3  # 1 initial + 2 retries
        assert unreliable_agent.failure_count == 2
        
        # Verify acknowledgment was received
        ack_status = await message_bus.get_acknowledgment_status(message.message_id)
        assert ack_status.acknowledged is True


class TestWorkflowCoordination:
    """Test workflow coordination between agents."""
    
    @pytest.fixture
    async def coordination_setup(self):
        """Set up coordination test environment."""
        message_bus = MessageBus()
        await message_bus.initialize()
        
        coordinator = WorkflowCoordinator()
        await coordinator.initialize(message_bus)
        
        # Create test agents
        supervisor = MockAgent("supervisor-001", "supervisor")
        threat_hunter = MockAgent("threat-hunter-001", "threat-hunter")
        incident_response = MockAgent("incident-response-001", "incident-response")
        
        agents = [supervisor, threat_hunter, incident_response]
        for agent in agents:
            agent.message_bus = message_bus
            await message_bus.register_agent(agent)
            
        yield {
            "message_bus": message_bus,
            "coordinator": coordinator,
            "agents": {
                "supervisor": supervisor,
                "threat_hunter": threat_hunter,
                "incident_response": incident_response
            }
        }
        
        await message_bus.shutdown()
        
    @pytest.mark.asyncio
    async def test_workflow_orchestration(self, coordination_setup):
        """Test complete workflow orchestration."""
        setup = coordination_setup
        coordinator = setup["coordinator"]
        agents = setup["agents"]
        
        # Define workflow steps
        workflow_definition = {
            "workflow_id": str(uuid.uuid4()),
            "name": "threat_response_workflow",
            "steps": [
                {
                    "step_id": "detect_threat",
                    "agent": "threat-hunter-001",
                    "action": "analyze_threat",
                    "timeout": 30
                },
                {
                    "step_id": "assess_impact",
                    "agent": "threat-hunter-001", 
                    "action": "assess_impact",
                    "depends_on": ["detect_threat"],
                    "timeout": 20
                },
                {
                    "step_id": "contain_threat",
                    "agent": "incident-response-001",
                    "action": "contain_threat",
                    "depends_on": ["assess_impact"],
                    "timeout": 60
                }
            ]
        }
        
        # Start workflow
        workflow_id = workflow_definition["workflow_id"]
        await coordinator.start_workflow(workflow_definition)
        
        # Simulate step completions
        # Step 1: Threat detection
        detection_result = {
            "step_id": "detect_threat",
            "status": "completed",
            "result": {
                "threat_detected": True,
                "threat_type": "malware",
                "confidence": 0.92
            }
        }
        await coordinator.complete_workflow_step(workflow_id, detection_result)
        
        # Step 2: Impact assessment
        assessment_result = {
            "step_id": "assess_impact",
            "status": "completed", 
            "result": {
                "impact_level": "high",
                "affected_systems": ["web-server-01", "database-02"],
                "estimated_damage": "moderate"
            }
        }
        await coordinator.complete_workflow_step(workflow_id, assessment_result)
        
        # Step 3: Containment
        containment_result = {
            "step_id": "contain_threat",
            "status": "completed",
            "result": {
                "containment_successful": True,
                "actions_taken": ["isolate_host", "block_traffic", "quarantine_files"],
                "threat_neutralized": True
            }
        }
        await coordinator.complete_workflow_step(workflow_id, containment_result)
        
        # Verify workflow completion
        workflow_status = await coordinator.get_workflow_status(workflow_id)
        assert workflow_status.status == "completed"
        assert workflow_status.success is True
        assert len(workflow_status.completed_steps) == 3
        
    @pytest.mark.asyncio
    async def test_parallel_workflow_execution(self, coordination_setup):
        """Test parallel execution of workflow steps."""
        setup = coordination_setup
        coordinator = setup["coordinator"]
        
        # Define workflow with parallel steps
        workflow_definition = {
            "workflow_id": str(uuid.uuid4()),
            "name": "parallel_analysis_workflow",
            "steps": [
                {
                    "step_id": "initial_detection",
                    "agent": "threat-hunter-001",
                    "action": "detect_threat",
                    "timeout": 30
                },
                {
                    "step_id": "threat_analysis",
                    "agent": "threat-hunter-001",
                    "action": "analyze_threat",
                    "depends_on": ["initial_detection"],
                    "timeout": 45
                },
                {
                    "step_id": "impact_assessment", 
                    "agent": "incident-response-001",
                    "action": "assess_impact",
                    "depends_on": ["initial_detection"],  # Parallel with threat_analysis
                    "timeout": 40
                },
                {
                    "step_id": "coordinate_response",
                    "agent": "supervisor-001",
                    "action": "coordinate",
                    "depends_on": ["threat_analysis", "impact_assessment"],  # Wait for both
                    "timeout": 20
                }
            ]
        }
        
        workflow_id = workflow_definition["workflow_id"]
        start_time = time.time()
        
        # Start workflow
        await coordinator.start_workflow(workflow_definition)
        
        # Complete initial detection
        await coordinator.complete_workflow_step(workflow_id, {
            "step_id": "initial_detection",
            "status": "completed",
            "result": {"threat_detected": True}
        })
        
        # Complete parallel steps (simulate concurrent execution)
        await asyncio.gather(
            coordinator.complete_workflow_step(workflow_id, {
                "step_id": "threat_analysis",
                "status": "completed",
                "result": {"analysis_complete": True}
            }),
            coordinator.complete_workflow_step(workflow_id, {
                "step_id": "impact_assessment", 
                "status": "completed",
                "result": {"impact_assessed": True}
            })
        )
        
        # Complete final coordination step
        await coordinator.complete_workflow_step(workflow_id, {
            "step_id": "coordinate_response",
            "status": "completed",
            "result": {"coordination_complete": True}
        })
        
        end_time = time.time()
        execution_time = end_time - start_time
        
        # Verify workflow completed and parallel execution was efficient
        workflow_status = await coordinator.get_workflow_status(workflow_id)
        assert workflow_status.status == "completed"
        assert execution_time < 2.0  # Should complete quickly due to parallel execution
        
    @pytest.mark.asyncio
    async def test_workflow_error_handling(self, coordination_setup):
        """Test workflow error handling and recovery."""
        setup = coordination_setup
        coordinator = setup["coordinator"]
        
        # Define workflow that will encounter errors
        workflow_definition = {
            "workflow_id": str(uuid.uuid4()),
            "name": "error_handling_workflow",
            "steps": [
                {
                    "step_id": "step_1",
                    "agent": "threat-hunter-001",
                    "action": "analyze",
                    "timeout": 30,
                    "retry_on_failure": True,
                    "max_retries": 2
                },
                {
                    "step_id": "step_2",
                    "agent": "incident-response-001",
                    "action": "respond",
                    "depends_on": ["step_1"],
                    "timeout": 30
                }
            ]
        }
        
        workflow_id = workflow_definition["workflow_id"]
        await coordinator.start_workflow(workflow_definition)
        
        # Simulate step failure
        failure_result = {
            "step_id": "step_1",
            "status": "failed",
            "error": "Analysis service unavailable",
            "retry_count": 0
        }
        await coordinator.handle_workflow_step_failure(workflow_id, failure_result)
        
        # Simulate retry success
        retry_result = {
            "step_id": "step_1", 
            "status": "completed",
            "result": {"analysis_complete": True},
            "retry_count": 1
        }
        await coordinator.complete_workflow_step(workflow_id, retry_result)
        
        # Complete second step
        await coordinator.complete_workflow_step(workflow_id, {
            "step_id": "step_2",
            "status": "completed",
            "result": {"response_complete": True}
        })
        
        # Verify workflow recovered and completed
        workflow_status = await coordinator.get_workflow_status(workflow_id)
        assert workflow_status.status == "completed"
        assert workflow_status.retry_count > 0
        assert workflow_status.success is True


class TestMessageQueueOperations:
    """Test message queue operations and reliability."""
    
    @pytest.mark.asyncio
    async def test_message_queue_ordering(self):
        """Test message queue maintains proper ordering."""
        queue = MessageQueue("test-queue")
        
        # Add messages with different priorities
        messages = []
        for i in range(10):
            message = AgentMessage(
                message_id=str(uuid.uuid4()),
                sender_id="sender",
                recipient_id="recipient",
                message_type="test",
                payload={"sequence": i},
                priority=i % 3,  # Priorities 0, 1, 2
                workflow_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow()
            )
            messages.append(message)
            await queue.enqueue(message)
            
        # Dequeue messages and verify priority ordering
        dequeued = []
        while not queue.is_empty():
            message = await queue.dequeue()
            dequeued.append(message)
            
        # Verify higher priority messages came first
        priorities = [msg.priority for msg in dequeued]
        for i in range(len(priorities) - 1):
            assert priorities[i] >= priorities[i + 1], "Messages should be ordered by priority"
            
    @pytest.mark.asyncio
    async def test_message_queue_persistence(self):
        """Test message queue persistence across restarts."""
        queue_name = "persistent-test-queue"
        
        # Create queue and add messages
        queue1 = MessageQueue(queue_name, persistent=True)
        
        original_messages = []
        for i in range(5):
            message = AgentMessage(
                message_id=str(uuid.uuid4()),
                sender_id="sender",
                recipient_id="recipient", 
                message_type="persistent_test",
                payload={"data": f"message_{i}"},
                workflow_id=str(uuid.uuid4()),
                timestamp=datetime.utcnow()
            )
            original_messages.append(message)
            await queue1.enqueue(message)
            
        # Simulate restart by creating new queue instance
        queue2 = MessageQueue(queue_name, persistent=True)
        await queue2.load_from_persistence()
        
        # Verify messages were restored
        assert queue2.size() == 5
        
        restored_messages = []
        while not queue2.is_empty():
            message = await queue2.dequeue()
            restored_messages.append(message)
            
        # Verify message content matches
        assert len(restored_messages) == len(original_messages)
        for orig, restored in zip(original_messages, restored_messages):
            assert orig.message_id == restored.message_id
            assert orig.payload == restored.payload


# Test utilities and runners
async def run_communication_tests():
    """Run all cross-agent communication tests."""
    print("🔄 Starting Cross-Agent Communication Tests...")
    
    test_classes = [
        TestMessageBusOperations,
        TestWorkflowCoordination, 
        TestMessageQueueOperations
    ]
    
    total_tests = 0
    passed_tests = 0
    
    for test_class in test_classes:
        print(f"\n📋 Running {test_class.__name__}...")
        
        # Create test instance
        test_instance = test_class()
        
        # Get test methods
        test_methods = [method for method in dir(test_instance) if method.startswith('test_')]
        
        for test_method_name in test_methods:
            total_tests += 1
            test_method = getattr(test_instance, test_method_name)
            
            try:
                print(f"   Running {test_method_name}...")
                
                # Handle pytest fixtures manually for standalone execution
                if hasattr(test_instance, test_method_name.replace('test_', '') + '_fixture'):
                    # This is a simplified approach - in real pytest, fixtures are handled automatically
                    pass
                    
                await test_method()
                passed_tests += 1
                print(f"   ✅ {test_method_name} PASSED")
            except Exception as e:
                print(f"   ❌ {test_method_name} FAILED: {e}")
                
    print(f"\n📊 Communication Test Results:")
    print(f"   Total Tests: {total_tests}")
    print(f"   Passed: {passed_tests}")
    print(f"   Failed: {total_tests - passed_tests}")
    print(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
    
    return passed_tests == total_tests


if __name__ == "__main__":
    import sys
    
    # Run the communication tests
    success = asyncio.run(run_communication_tests())
    sys.exit(0 if success else 1)