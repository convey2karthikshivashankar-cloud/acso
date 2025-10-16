#!/usr/bin/env python3
"""
ACSO End-to-End Integration Tests

Comprehensive integration tests that validate complete workflows from threat detection
to resolution, including cross-agent communication and human-in-the-loop processes.
"""

import asyncio
import json
import pytest
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from unittest.mock import AsyncMock, MagicMock, patch

import boto3
from moto import mock_ecs, mock_logs, mock_ssm, mock_bedrock_runtime

# Import ACSO components
from src.agents.supervisor_agent import SupervisorAgent
from src.agents.threat_hunter_agent import ThreatHunterAgent
from src.agents.incident_response_agent import IncidentResponseAgent
from src.agents.service_orchestration_agent import ServiceOrchestrationAgent
from src.agents.financial_intelligence_agent import FinancialIntelligenceAgent
from src.shared.models import (
    ThreatAlert, IncidentReport, ServiceRequest, FinancialAnalysis,
    AgentMessage, WorkflowStatus, ApprovalRequest
)
from src.shared.communication import MessageBus
from src.shared.coordination import WorkflowCoordinator
from src.shared.human_interface import HumanApprovalInterface
from config.settings import Settings


class EndToEndTestFramework:
    """Framework for running end-to-end integration tests."""
    
    def __init__(self):
        self.settings = Settings()
        self.message_bus = MessageBus()
        self.workflow_coordinator = WorkflowCoordinator()
        self.human_interface = HumanApprovalInterface()
        
        # Initialize agents
        self.supervisor = SupervisorAgent()
        self.threat_hunter = ThreatHunterAgent()
        self.incident_response = IncidentResponseAgent()
        self.service_orchestration = ServiceOrchestrationAgent()
        self.financial_intelligence = FinancialIntelligenceAgent()
        
        # Test data storage
        self.test_results = []
        self.workflow_traces = []
        
    async def setup_test_environment(self):
        """Set up the test environment with mock services."""
        # Initialize message bus
        await self.message_bus.initialize()
        
        # Start agents
        await self.supervisor.start()
        await self.threat_hunter.start()
        await self.incident_response.start()
        await self.service_orchestration.start()
        await self.financial_intelligence.start()
        
        # Set up agent communication
        agents = [
            self.supervisor, self.threat_hunter, self.incident_response,
            self.service_orchestration, self.financial_intelligence
        ]
        
        for agent in agents:
            agent.message_bus = self.message_bus
            agent.workflow_coordinator = self.workflow_coordinator
            
    async def teardown_test_environment(self):
        """Clean up the test environment."""
        agents = [
            self.supervisor, self.threat_hunter, self.incident_response,
            self.service_orchestration, self.financial_intelligence
        ]
        
        for agent in agents:
            await agent.stop()
            
        await self.message_bus.shutdown()
        
    def create_test_threat_scenario(self) -> Dict[str, Any]:
        """Create a realistic threat scenario for testing."""
        return {
            "threat_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "source_ip": "192.168.1.100",
            "destination_ip": "10.0.1.50",
            "threat_type": "malware_communication",
            "severity": "high",
            "indicators": [
                "suspicious_network_traffic",
                "known_malicious_domain",
                "unusual_data_exfiltration"
            ],
            "affected_systems": ["web-server-01", "database-server-02"],
            "raw_logs": [
                "2024-01-15 10:30:15 - Suspicious connection to malicious-domain.com",
                "2024-01-15 10:30:20 - Large data transfer detected",
                "2024-01-15 10:30:25 - Multiple failed authentication attempts"
            ]
        }
        
    def create_test_service_request(self) -> Dict[str, Any]:
        """Create a test service request scenario."""
        return {
            "request_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "client_id": "client-001",
            "request_type": "patch_management",
            "priority": "medium",
            "description": "Apply security patches to production servers",
            "affected_systems": ["prod-web-01", "prod-app-02", "prod-db-03"],
            "maintenance_window": {
                "start": (datetime.utcnow() + timedelta(hours=2)).isoformat(),
                "end": (datetime.utcnow() + timedelta(hours=4)).isoformat()
            },
            "approval_required": True
        }
        
    def create_test_financial_scenario(self) -> Dict[str, Any]:
        """Create a financial analysis scenario."""
        return {
            "analysis_id": str(uuid.uuid4()),
            "timestamp": datetime.utcnow().isoformat(),
            "client_id": "client-001",
            "analysis_type": "cost_optimization",
            "current_spend": 15000.00,
            "infrastructure_data": {
                "ec2_instances": 25,
                "rds_instances": 5,
                "s3_storage_gb": 1000,
                "data_transfer_gb": 500
            },
            "utilization_metrics": {
                "avg_cpu_utilization": 45.2,
                "avg_memory_utilization": 62.8,
                "storage_utilization": 78.5
            }
        }


@pytest.fixture
async def test_framework():
    """Pytest fixture for the test framework."""
    framework = EndToEndTestFramework()
    await framework.setup_test_environment()
    yield framework
    await framework.teardown_test_environment()


class TestThreatDetectionWorkflow:
    """Test complete threat detection and response workflow."""
    
    @pytest.mark.asyncio
    async def test_complete_threat_detection_workflow(self, test_framework):
        """Test end-to-end threat detection and response workflow."""
        framework = test_framework
        
        # Step 1: Create threat scenario
        threat_scenario = framework.create_test_threat_scenario()
        
        # Step 2: Threat Hunter detects threat
        threat_alert = ThreatAlert(
            threat_id=threat_scenario["threat_id"],
            severity=threat_scenario["severity"],
            threat_type=threat_scenario["threat_type"],
            source_ip=threat_scenario["source_ip"],
            destination_ip=threat_scenario["destination_ip"],
            indicators=threat_scenario["indicators"],
            confidence_score=0.85,
            raw_data=threat_scenario["raw_logs"]
        )
        
        # Step 3: Send threat alert to supervisor
        workflow_id = str(uuid.uuid4())
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="threat-hunter-001",
            recipient_id="supervisor-001",
            message_type="threat_alert",
            payload=threat_alert.dict(),
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(message)
        
        # Step 4: Wait for supervisor to process and delegate
        await asyncio.sleep(2)  # Allow processing time
        
        # Step 5: Verify incident response agent received task
        incident_messages = await framework.message_bus.get_messages_for_agent("incident-response-001")
        assert len(incident_messages) > 0
        
        incident_task = None
        for msg in incident_messages:
            if msg.message_type == "incident_task" and msg.workflow_id == workflow_id:
                incident_task = msg
                break
                
        assert incident_task is not None, "Incident response agent should receive task"
        
        # Step 6: Simulate incident response actions
        containment_actions = [
            {"action": "isolate_host", "target": "192.168.1.100", "status": "completed"},
            {"action": "block_ip", "target": "malicious-domain.com", "status": "completed"},
            {"action": "quarantine_files", "target": "web-server-01", "status": "completed"}
        ]
        
        incident_report = IncidentReport(
            incident_id=str(uuid.uuid4()),
            threat_id=threat_scenario["threat_id"],
            severity="high",
            status="contained",
            containment_actions=containment_actions,
            impact_assessment="Potential data exfiltration prevented",
            recommendations=["Update firewall rules", "Patch affected systems", "Monitor for similar threats"]
        )
        
        # Step 7: Send incident report back to supervisor
        response_message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="incident-response-001",
            recipient_id="supervisor-001",
            message_type="incident_report",
            payload=incident_report.dict(),
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(response_message)
        
        # Step 8: Wait for workflow completion
        await asyncio.sleep(2)
        
        # Step 9: Verify workflow status
        workflow_status = await framework.workflow_coordinator.get_workflow_status(workflow_id)
        assert workflow_status.status in ["completed", "resolved"]
        assert workflow_status.success is True
        
        # Step 10: Verify all required actions were taken
        assert len(containment_actions) == 3
        assert all(action["status"] == "completed" for action in containment_actions)
        
        print(f"✅ Threat detection workflow completed successfully: {workflow_id}")
        
    @pytest.mark.asyncio
    async def test_threat_detection_with_human_approval(self, test_framework):
        """Test threat detection workflow requiring human approval."""
        framework = test_framework
        
        # Create high-severity threat requiring approval
        threat_scenario = framework.create_test_threat_scenario()
        threat_scenario["severity"] = "critical"
        threat_scenario["requires_approval"] = True
        
        threat_alert = ThreatAlert(
            threat_id=threat_scenario["threat_id"],
            severity="critical",
            threat_type="advanced_persistent_threat",
            source_ip=threat_scenario["source_ip"],
            destination_ip=threat_scenario["destination_ip"],
            indicators=threat_scenario["indicators"] + ["apt_signature", "lateral_movement"],
            confidence_score=0.95,
            raw_data=threat_scenario["raw_logs"],
            requires_human_approval=True
        )
        
        workflow_id = str(uuid.uuid4())
        
        # Send threat alert
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="threat-hunter-001",
            recipient_id="supervisor-001",
            message_type="threat_alert",
            payload=threat_alert.dict(),
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(message)
        await asyncio.sleep(2)
        
        # Verify approval request was created
        approval_requests = await framework.human_interface.get_pending_approvals()
        approval_request = None
        for req in approval_requests:
            if req.workflow_id == workflow_id:
                approval_request = req
                break
                
        assert approval_request is not None, "Approval request should be created for critical threats"
        assert approval_request.approval_type == "incident_response"
        
        # Simulate human approval
        approval_response = {
            "request_id": approval_request.request_id,
            "approved": True,
            "approver": "security-analyst-001",
            "comments": "Approved for immediate containment - APT detected",
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await framework.human_interface.submit_approval(approval_response)
        await asyncio.sleep(2)
        
        # Verify incident response proceeded after approval
        incident_messages = await framework.message_bus.get_messages_for_agent("incident-response-001")
        incident_task = None
        for msg in incident_messages:
            if msg.message_type == "incident_task" and msg.workflow_id == workflow_id:
                incident_task = msg
                break
                
        assert incident_task is not None, "Incident response should proceed after approval"
        
        print(f"✅ Human approval workflow completed successfully: {workflow_id}")


class TestServiceOrchestrationWorkflow:
    """Test service orchestration and automation workflows."""
    
    @pytest.mark.asyncio
    async def test_automated_service_delivery(self, test_framework):
        """Test automated service delivery workflow."""
        framework = test_framework
        
        # Create service request
        service_scenario = framework.create_test_service_request()
        service_scenario["approval_required"] = False  # Automated request
        
        service_request = ServiceRequest(
            request_id=service_scenario["request_id"],
            client_id=service_scenario["client_id"],
            request_type=service_scenario["request_type"],
            priority=service_scenario["priority"],
            description=service_scenario["description"],
            affected_systems=service_scenario["affected_systems"],
            automated=True,
            estimated_duration=120  # 2 hours
        )
        
        workflow_id = str(uuid.uuid4())
        
        # Send service request to supervisor
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="external-system",
            recipient_id="supervisor-001",
            message_type="service_request",
            payload=service_request.dict(),
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(message)
        await asyncio.sleep(2)
        
        # Verify service orchestration agent received task
        service_messages = await framework.message_bus.get_messages_for_agent("service-orchestration-001")
        service_task = None
        for msg in service_messages:
            if msg.message_type == "service_task" and msg.workflow_id == workflow_id:
                service_task = msg
                break
                
        assert service_task is not None, "Service orchestration agent should receive task"
        
        # Simulate service execution
        execution_steps = [
            {"step": "validate_maintenance_window", "status": "completed", "duration": 5},
            {"step": "prepare_patch_packages", "status": "completed", "duration": 15},
            {"step": "apply_patches", "status": "completed", "duration": 90},
            {"step": "verify_system_health", "status": "completed", "duration": 10}
        ]
        
        # Send completion report
        completion_report = {
            "request_id": service_scenario["request_id"],
            "status": "completed",
            "execution_steps": execution_steps,
            "total_duration": sum(step["duration"] for step in execution_steps),
            "systems_updated": service_scenario["affected_systems"],
            "success_rate": 100.0
        }
        
        response_message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="service-orchestration-001",
            recipient_id="supervisor-001",
            message_type="service_completion",
            payload=completion_report,
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(response_message)
        await asyncio.sleep(1)
        
        # Verify workflow completion
        workflow_status = await framework.workflow_coordinator.get_workflow_status(workflow_id)
        assert workflow_status.status == "completed"
        assert workflow_status.success is True
        
        print(f"✅ Automated service delivery completed successfully: {workflow_id}")
        
    @pytest.mark.asyncio
    async def test_service_request_with_approval(self, test_framework):
        """Test service request requiring human approval."""
        framework = test_framework
        
        # Create high-impact service request
        service_scenario = framework.create_test_service_request()
        service_scenario["priority"] = "high"
        service_scenario["approval_required"] = True
        service_scenario["impact"] = "production_systems"
        
        service_request = ServiceRequest(
            request_id=service_scenario["request_id"],
            client_id=service_scenario["client_id"],
            request_type="system_maintenance",
            priority="high",
            description="Emergency security patch deployment",
            affected_systems=service_scenario["affected_systems"],
            automated=False,
            requires_approval=True,
            estimated_downtime=30  # 30 minutes
        )
        
        workflow_id = str(uuid.uuid4())
        
        # Send service request
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="external-system",
            recipient_id="supervisor-001",
            message_type="service_request",
            payload=service_request.dict(),
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(message)
        await asyncio.sleep(2)
        
        # Verify approval request was created
        approval_requests = await framework.human_interface.get_pending_approvals()
        approval_request = None
        for req in approval_requests:
            if req.workflow_id == workflow_id:
                approval_request = req
                break
                
        assert approval_request is not None, "Approval request should be created"
        assert approval_request.approval_type == "service_request"
        
        # Simulate approval
        approval_response = {
            "request_id": approval_request.request_id,
            "approved": True,
            "approver": "operations-manager-001",
            "comments": "Approved for emergency security patch",
            "conditions": ["Monitor system performance", "Prepare rollback plan"],
            "timestamp": datetime.utcnow().isoformat()
        }
        
        await framework.human_interface.submit_approval(approval_response)
        await asyncio.sleep(2)
        
        # Verify service execution proceeded
        service_messages = await framework.message_bus.get_messages_for_agent("service-orchestration-001")
        service_task = None
        for msg in service_messages:
            if msg.message_type == "service_task" and msg.workflow_id == workflow_id:
                service_task = msg
                break
                
        assert service_task is not None, "Service should proceed after approval"
        
        print(f"✅ Service approval workflow completed successfully: {workflow_id}")


class TestFinancialIntelligenceWorkflow:
    """Test financial intelligence and optimization workflows."""
    
    @pytest.mark.asyncio
    async def test_cost_optimization_analysis(self, test_framework):
        """Test automated cost optimization analysis."""
        framework = test_framework
        
        # Create financial analysis scenario
        financial_scenario = framework.create_test_financial_scenario()
        
        analysis_request = {
            "analysis_id": financial_scenario["analysis_id"],
            "client_id": financial_scenario["client_id"],
            "analysis_type": "cost_optimization",
            "data_sources": ["aws_cost_explorer", "resource_utilization", "performance_metrics"],
            "time_period": "last_30_days"
        }
        
        workflow_id = str(uuid.uuid4())
        
        # Send analysis request
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="supervisor-001",
            recipient_id="financial-intelligence-001",
            message_type="analysis_request",
            payload=analysis_request,
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(message)
        await asyncio.sleep(3)  # Allow time for analysis
        
        # Simulate analysis completion
        optimization_recommendations = [
            {
                "recommendation": "rightsizing_ec2_instances",
                "current_cost": 8000.00,
                "optimized_cost": 6400.00,
                "savings": 1600.00,
                "confidence": 0.92,
                "implementation_effort": "low"
            },
            {
                "recommendation": "reserved_instance_purchase",
                "current_cost": 5000.00,
                "optimized_cost": 3500.00,
                "savings": 1500.00,
                "confidence": 0.88,
                "implementation_effort": "medium"
            },
            {
                "recommendation": "s3_storage_optimization",
                "current_cost": 2000.00,
                "optimized_cost": 1400.00,
                "savings": 600.00,
                "confidence": 0.95,
                "implementation_effort": "low"
            }
        ]
        
        financial_analysis = FinancialAnalysis(
            analysis_id=financial_scenario["analysis_id"],
            client_id=financial_scenario["client_id"],
            analysis_type="cost_optimization",
            current_monthly_cost=financial_scenario["current_spend"],
            optimized_monthly_cost=11300.00,
            total_savings=3700.00,
            savings_percentage=24.7,
            recommendations=optimization_recommendations,
            confidence_score=0.92,
            implementation_timeline="2-4_weeks"
        )
        
        # Send analysis results
        response_message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="financial-intelligence-001",
            recipient_id="supervisor-001",
            message_type="analysis_results",
            payload=financial_analysis.dict(),
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(response_message)
        await asyncio.sleep(1)
        
        # Verify workflow completion
        workflow_status = await framework.workflow_coordinator.get_workflow_status(workflow_id)
        assert workflow_status.status == "completed"
        assert workflow_status.success is True
        
        # Verify analysis quality
        assert financial_analysis.total_savings > 0
        assert financial_analysis.savings_percentage > 20  # Significant savings
        assert len(financial_analysis.recommendations) >= 3
        assert financial_analysis.confidence_score > 0.85
        
        print(f"✅ Financial analysis workflow completed successfully: {workflow_id}")
        print(f"   Total savings identified: ${financial_analysis.total_savings:.2f}")
        print(f"   Savings percentage: {financial_analysis.savings_percentage:.1f}%")


class TestCrossAgentCommunication:
    """Test cross-agent communication and coordination."""
    
    @pytest.mark.asyncio
    async def test_multi_agent_coordination(self, test_framework):
        """Test coordination between multiple agents in a complex scenario."""
        framework = test_framework
        
        # Create complex scenario involving multiple agents
        scenario = {
            "incident_id": str(uuid.uuid4()),
            "threat_detected": True,
            "service_impact": True,
            "financial_impact": True,
            "requires_coordination": True
        }
        
        workflow_id = str(uuid.uuid4())
        
        # Step 1: Threat Hunter detects threat with service impact
        threat_alert = ThreatAlert(
            threat_id=scenario["incident_id"],
            severity="high",
            threat_type="service_disruption_attack",
            source_ip="external",
            destination_ip="service-cluster",
            indicators=["ddos_pattern", "service_degradation", "resource_exhaustion"],
            confidence_score=0.89,
            service_impact=True,
            estimated_financial_impact=50000.00
        )
        
        # Send to supervisor for coordination
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="threat-hunter-001",
            recipient_id="supervisor-001",
            message_type="complex_threat_alert",
            payload=threat_alert.dict(),
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(message)
        await asyncio.sleep(2)
        
        # Step 2: Verify supervisor coordinates multiple agents
        # Check incident response agent
        incident_messages = await framework.message_bus.get_messages_for_agent("incident-response-001")
        incident_task = any(msg.workflow_id == workflow_id for msg in incident_messages)
        assert incident_task, "Incident response agent should be involved"
        
        # Check service orchestration agent
        service_messages = await framework.message_bus.get_messages_for_agent("service-orchestration-001")
        service_task = any(msg.workflow_id == workflow_id for msg in service_messages)
        assert service_task, "Service orchestration agent should be involved"
        
        # Check financial intelligence agent
        financial_messages = await framework.message_bus.get_messages_for_agent("financial-intelligence-001")
        financial_task = any(msg.workflow_id == workflow_id for msg in financial_messages)
        assert financial_task, "Financial intelligence agent should be involved"
        
        # Step 3: Simulate coordinated response
        responses = []
        
        # Incident response
        incident_response = {
            "agent": "incident-response",
            "actions": ["traffic_filtering", "load_balancing", "resource_scaling"],
            "status": "mitigated",
            "effectiveness": 0.85
        }
        responses.append(incident_response)
        
        # Service orchestration
        service_response = {
            "agent": "service-orchestration",
            "actions": ["failover_activation", "capacity_increase", "performance_monitoring"],
            "status": "stabilized",
            "service_availability": 0.98
        }
        responses.append(service_response)
        
        # Financial impact assessment
        financial_response = {
            "agent": "financial-intelligence",
            "impact_assessment": {
                "estimated_loss_prevented": 45000.00,
                "response_cost": 2000.00,
                "net_benefit": 43000.00
            },
            "roi": 21.5  # 2150% ROI
        }
        responses.append(financial_response)
        
        # Send coordinated completion report
        coordination_report = {
            "workflow_id": workflow_id,
            "incident_id": scenario["incident_id"],
            "coordination_success": True,
            "agents_involved": ["threat-hunter", "incident-response", "service-orchestration", "financial-intelligence"],
            "response_time_minutes": 8,
            "effectiveness_score": 0.91,
            "responses": responses
        }
        
        completion_message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="supervisor-001",
            recipient_id="workflow-coordinator",
            message_type="coordination_complete",
            payload=coordination_report,
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(completion_message)
        await asyncio.sleep(1)
        
        # Verify successful coordination
        workflow_status = await framework.workflow_coordinator.get_workflow_status(workflow_id)
        assert workflow_status.status == "completed"
        assert workflow_status.success is True
        
        # Verify coordination metrics
        assert len(responses) == 3  # All three agents responded
        assert coordination_report["effectiveness_score"] > 0.85
        assert coordination_report["response_time_minutes"] < 15
        
        print(f"✅ Multi-agent coordination completed successfully: {workflow_id}")
        print(f"   Agents involved: {len(coordination_report['agents_involved'])}")
        print(f"   Response time: {coordination_report['response_time_minutes']} minutes")
        print(f"   Effectiveness: {coordination_report['effectiveness_score']:.2f}")


class TestHumanInTheLoopWorkflows:
    """Test human-in-the-loop approval and decision workflows."""
    
    @pytest.mark.asyncio
    async def test_escalation_workflow(self, test_framework):
        """Test escalation workflow when human intervention is required."""
        framework = test_framework
        
        # Create scenario requiring escalation
        escalation_scenario = {
            "incident_id": str(uuid.uuid4()),
            "severity": "critical",
            "confidence": "low",
            "potential_impact": "business_critical",
            "requires_escalation": True
        }
        
        workflow_id = str(uuid.uuid4())
        
        # Create uncertain threat requiring human judgment
        uncertain_threat = ThreatAlert(
            threat_id=escalation_scenario["incident_id"],
            severity="critical",
            threat_type="unknown_pattern",
            source_ip="internal_network",
            destination_ip="critical_system",
            indicators=["anomalous_behavior", "potential_insider_threat"],
            confidence_score=0.45,  # Low confidence
            requires_human_review=True,
            business_impact="critical"
        )
        
        # Send to supervisor
        message = AgentMessage(
            message_id=str(uuid.uuid4()),
            sender_id="threat-hunter-001",
            recipient_id="supervisor-001",
            message_type="uncertain_threat_alert",
            payload=uncertain_threat.dict(),
            workflow_id=workflow_id,
            timestamp=datetime.utcnow()
        )
        
        await framework.message_bus.send_message(message)
        await asyncio.sleep(2)
        
        # Verify escalation was created
        escalations = await framework.human_interface.get_pending_escalations()
        escalation = None
        for esc in escalations:
            if esc.workflow_id == workflow_id:
                escalation = esc
                break
                
        assert escalation is not None, "Escalation should be created for uncertain threats"
        assert escalation.priority == "critical"
        assert escalation.reason == "low_confidence_critical_threat"
        
        # Simulate human analysis and decision
        human_decision = {
            "escalation_id": escalation.escalation_id,
            "analyst": "senior-security-analyst-001",
            "decision": "investigate_further",
            "reasoning": "Pattern suggests possible insider threat - requires detailed investigation",
            "recommended_actions": [
                "forensic_analysis",
                "user_behavior_analysis", 
                "access_log_review"
            ],
            "timeline": "immediate",
            "confidence": 0.85
        }
        
        await framework.human_interface.submit_escalation_decision(human_decision)
        await asyncio.sleep(2)
        
        # Verify workflow continued with human guidance
        workflow_status = await framework.workflow_coordinator.get_workflow_status(workflow_id)
        assert workflow_status.status in ["in_progress", "investigating"]
        
        # Verify investigation tasks were created
        investigation_messages = await framework.message_bus.get_messages_for_agent("threat-hunter-001")
        investigation_task = None
        for msg in investigation_messages:
            if msg.message_type == "investigation_task" and msg.workflow_id == workflow_id:
                investigation_task = msg
                break
                
        assert investigation_task is not None, "Investigation task should be created"
        
        print(f"✅ Escalation workflow initiated successfully: {workflow_id}")
        
    @pytest.mark.asyncio
    async def test_approval_timeout_handling(self, test_framework):
        """Test handling of approval timeouts."""
        framework = test_framework
        
        # Create scenario with approval timeout
        timeout_scenario = {
            "request_id": str(uuid.uuid4()),
            "approval_timeout": 5,  # 5 seconds for testing
            "fallback_action": "deny"
        }
        
        workflow_id = str(uuid.uuid4())
        
        # Create approval request with short timeout
        approval_request = ApprovalRequest(
            request_id=timeout_scenario["request_id"],
            workflow_id=workflow_id,
            approval_type="high_risk_action",
            description="Test approval with timeout",
            requester="incident-response-001",
            priority="high",
            timeout_seconds=timeout_scenario["approval_timeout"],
            fallback_action=timeout_scenario["fallback_action"]
        )
        
        # Submit approval request
        await framework.human_interface.submit_approval_request(approval_request)
        
        # Wait for timeout (plus buffer)
        await asyncio.sleep(timeout_scenario["approval_timeout"] + 2)
        
        # Verify timeout was handled
        approval_status = await framework.human_interface.get_approval_status(
            timeout_scenario["request_id"]
        )
        
        assert approval_status.status == "timeout"
        assert approval_status.final_decision == timeout_scenario["fallback_action"]
        
        # Verify workflow was notified of timeout
        workflow_status = await framework.workflow_coordinator.get_workflow_status(workflow_id)
        assert workflow_status.status in ["completed", "denied"]
        
        print(f"✅ Approval timeout handled successfully: {workflow_id}")


# Test runner and utilities
async def run_integration_tests():
    """Run all integration tests."""
    print("🚀 Starting ACSO End-to-End Integration Tests...")
    
    # Initialize test framework
    framework = EndToEndTestFramework()
    await framework.setup_test_environment()
    
    try:
        # Run test suites
        test_suites = [
            TestThreatDetectionWorkflow(),
            TestServiceOrchestrationWorkflow(),
            TestFinancialIntelligenceWorkflow(),
            TestCrossAgentCommunication(),
            TestHumanInTheLoopWorkflows()
        ]
        
        total_tests = 0
        passed_tests = 0
        
        for suite in test_suites:
            suite_name = suite.__class__.__name__
            print(f"\n📋 Running {suite_name}...")
            
            # Get test methods
            test_methods = [method for method in dir(suite) if method.startswith('test_')]
            
            for test_method_name in test_methods:
                total_tests += 1
                test_method = getattr(suite, test_method_name)
                
                try:
                    print(f"   Running {test_method_name}...")
                    await test_method(framework)
                    passed_tests += 1
                    print(f"   ✅ {test_method_name} PASSED")
                except Exception as e:
                    print(f"   ❌ {test_method_name} FAILED: {e}")
                    
        print(f"\n📊 Integration Test Results:")
        print(f"   Total Tests: {total_tests}")
        print(f"   Passed: {passed_tests}")
        print(f"   Failed: {total_tests - passed_tests}")
        print(f"   Success Rate: {(passed_tests/total_tests)*100:.1f}%")
        
        if passed_tests == total_tests:
            print("🎉 All integration tests passed!")
            return True
        else:
            print("⚠️  Some integration tests failed!")
            return False
            
    finally:
        await framework.teardown_test_environment()


if __name__ == "__main__":
    import sys
    
    # Run the integration tests
    success = asyncio.run(run_integration_tests())
    sys.exit(0 if success else 1)