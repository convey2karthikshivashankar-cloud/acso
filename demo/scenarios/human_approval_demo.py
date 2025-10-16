#!/usr/bin/env python3
"""
ACSO Human Approval Demo Scenario

Demonstrates the human-in-the-loop approval workflows and
expert escalation capabilities of the ACSO system.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any

from src.shared.models import ApprovalRequest, AgentMessage
from demo.utils.demo_data import DemoDataGenerator
from demo.utils.presentation import DemoPresentation


class HumanApprovalDemo:
    """Human approval workflow demonstration."""
    
    def __init__(self):
        self.message_bus = None
        self.workflow_coordinator = None
        self.human_interface = None
        self.agents = {}
        self.data_generator = DemoDataGenerator()
        self.presentation = DemoPresentation()
        
    async def initialize(self, message_bus, workflow_coordinator, human_interface, agents):
        """Initialize the demo scenario."""
        self.message_bus = message_bus
        self.workflow_coordinator = workflow_coordinator
        self.human_interface = human_interface
        self.agents = agents
        
    async def run_demo(self, automated: bool = False):
        """Run the human approval demonstration."""
        await self.presentation.show_title("👥 Human-in-the-Loop Workflows Demo")
        
        if not automated:
            await self.presentation.show_intro(
                "This demo showcases ACSO's human-AI collaboration capabilities.",
                [
                    "Intelligent approval routing and escalation",
                    "Expert consultation for complex decisions",
                    "Multi-stage approval workflows",
                    "Learning from human decisions"
                ]
            )
            input("Press Enter to start the demo...")
        
        # Demo scenarios
        await self._demo_approval_workflow()
        await asyncio.sleep(2)
        
        await self._demo_expert_escalation()
        await asyncio.sleep(2)
        
        await self._demo_multi_stage_approval()
        
        if not automated:
            await self.presentation.show_summary(
                "Human Approval Demo Complete",
                [
                    "✅ Intelligent approval routing implemented",
                    "✅ Expert escalation procedures validated",
                    "✅ Multi-stakeholder approval workflows",
                    "✅ Human-AI collaboration optimized"
                ]
            )
            
    async def _demo_approval_workflow(self):
        """Demonstrate standard approval workflow."""
        await self.presentation.show_scenario_header(
            "Scenario 1: Intelligent Approval Routing",
            "High-risk incident response requiring human approval"
        )
        
        # Generate approval scenario
        approval_data = self.data_generator.generate_approval_scenario()
        
        print("🚨 High-Risk Incident Detected:")
        print(f"   Incident Type: {approval_data['incident_type']}")
        print(f"   Risk Level: {approval_data['risk_level']}")
        print(f"   Potential Impact: {approval_data['potential_impact']}")
        print(f"   Affected Systems: {approval_data['affected_systems']}")
        print(f"   Recommended Action: {approval_data['recommended_action']}")
        
        print("\n🤖 AI Risk Assessment:")
        await asyncio.sleep(1)
        print(f"   Confidence Level: {approval_data['confidence_level']}%")
        print(f"   Business Impact Score: {approval_data['business_impact']}/10")
        print(f"   Technical Complexity: {approval_data['complexity']}/10")
        print(f"   Approval Required: YES (confidence < 90%)")
        
        print("\n📋 Approval Request Generation:")
        await asyncio.sleep(1)
        print("   ✅ Risk assessment completed")
        print("   ✅ Business impact calculated")
        print("   ✅ Stakeholders identified")
        print("   ✅ Approval request formatted")
        
        print("\n👥 Intelligent Routing:")
        await asyncio.sleep(1)
        
        # Show routing logic
        routing_factors = [
            ("Risk Level", approval_data['risk_level'], "Security Manager"),
            ("Business Impact", f"{approval_data['business_impact']}/10", "Operations Director"),
            ("Technical Complexity", f"{approval_data['complexity']}/10", "Senior Engineer"),
            ("Time Sensitivity", "HIGH", "On-call Manager")
        ]
        
        print("   🎯 Routing Analysis:")
        for factor, value, approver in routing_factors:
            print(f"      {factor}: {value} → {approver}")
            
        selected_approver = "Security Manager (Primary)"
        print(f"\n   ✅ Selected Approver: {selected_approver}")
        print(f"   📱 Notification sent via: Slack, Email, SMS")
        print(f"   ⏰ Response deadline: 15 minutes")
        
        print("\n⏱️ Approval Process:")
        await asyncio.sleep(1)
        
        approval_steps = [
            ("Request received by Security Manager", "30 seconds"),
            ("Context and risk assessment reviewed", "2 minutes"),
            ("Additional stakeholders consulted", "3 minutes"),
            ("Decision made and documented", "1 minute"),
            ("Approval response submitted", "15 seconds")
        ]
        
        for step, duration in approval_steps:
            print(f"   🔄 {step}...")
            await asyncio.sleep(0.6)
            print(f"   ✅ {step} - COMPLETED ({duration})")
            
        print("\n✅ Approval Decision:")
        print("   Decision: APPROVED with conditions")
        print("   Approver: Sarah Chen (Security Manager)")
        print("   Conditions:")
        print("      • Monitor system performance during action")
        print("      • Prepare immediate rollback plan")
        print("      • Notify affected users proactively")
        print("   Total approval time: 6 minutes 45 seconds")
        
    async def _demo_expert_escalation(self):
        """Demonstrate expert escalation for complex scenarios."""
        await self.presentation.show_scenario_header(
            "Scenario 2: Expert Escalation",
            "Complex security threat requiring specialized expertise"
        )
        
        # Generate escalation scenario
        escalation_data = self.data_generator.generate_escalation_scenario()
        
        print("🔍 Complex Threat Analysis:")
        print(f"   Threat Pattern: {escalation_data['threat_pattern']}")
        print(f"   Attack Sophistication: {escalation_data['sophistication']}")
        print(f"   AI Confidence: {escalation_data['ai_confidence']}%")
        print(f"   Similar Incidents: {escalation_data['similar_incidents']}")
        print(f"   Potential Attribution: {escalation_data['attribution']}")
        
        print("\n⚠️ Escalation Triggers:")
        await asyncio.sleep(1)
        
        triggers = [
            "AI confidence below threshold (< 70%)",
            "Novel attack pattern detected",
            "Potential nation-state involvement",
            "Critical infrastructure targeted",
            "Multi-vector attack coordination"
        ]
        
        for trigger in triggers:
            print(f"   🚨 {trigger}")
            
        print("\n🧠 Expert Consultation Process:")
        await asyncio.sleep(1)
        
        print("   📋 Expert Selection Criteria:")
        print("      • Threat intelligence specialization")
        print("      • APT investigation experience")
        print("      • Current availability status")
        print("      • Security clearance level")
        
        print("\n   👨‍💻 Selected Expert: Dr. Michael Rodriguez")
        print("      Specialization: Advanced Persistent Threats")
        print("      Experience: 15 years, 200+ APT investigations")
        print("      Availability: Available (on-call rotation)")
        print("      Response time: 8 minutes")
        
        print("\n🔬 Expert Analysis Process:")
        await asyncio.sleep(1)
        
        analysis_steps = [
            "Reviewing AI-generated threat assessment",
            "Analyzing attack vectors and TTPs",
            "Correlating with global threat intelligence",
            "Identifying attribution indicators",
            "Developing response strategy"
        ]
        
        for step in analysis_steps:
            print(f"   🔍 {step}...")
            await asyncio.sleep(0.8)
            print(f"   ✅ {step} - COMPLETED")
            
        print("\n📊 Expert Assessment Results:")
        print("   🎯 Threat Classification: APT-40 (Leviathan)")
        print("   🌍 Attribution: State-sponsored (85% confidence)")
        print("   🎯 Objective: Intellectual property theft")
        print("   ⚡ Recommended Response: Coordinated containment")
        print("   📈 Confidence Level: 92% (expert validated)")
        
        print("\n🤝 Human-AI Collaboration:")
        print("   💡 AI provided initial analysis and data correlation")
        print("   🧠 Human expert provided context and attribution")
        print("   🎯 Combined assessment: High confidence, actionable")
        print("   📚 Learning: AI model updated with expert insights")
        
    async def _demo_multi_stage_approval(self):
        """Demonstrate multi-stage approval workflow."""
        await self.presentation.show_scenario_header(
            "Scenario 3: Multi-Stage Approval Workflow",
            "Major infrastructure change requiring multiple stakeholder approvals"
        )
        
        # Generate multi-stage scenario
        multistage_data = self.data_generator.generate_multistage_scenario()
        
        print("🏗️ Major Infrastructure Change Request:")
        print(f"   Change Type: {multistage_data['change_type']}")
        print(f"   Scope: {multistage_data['scope']}")
        print(f"   Business Impact: {multistage_data['business_impact']}")
        print(f"   Estimated Cost: ${multistage_data['estimated_cost']:,}")
        print(f"   Implementation Time: {multistage_data['implementation_time']}")
        
        print("\n📋 Multi-Stage Approval Process:")
        await asyncio.sleep(1)
        
        approval_stages = [
            {
                "stage": "Technical Review",
                "approver": "Senior Technical Architect",
                "focus": "Technical feasibility and architecture",
                "duration": "45 minutes",
                "status": "pending"
            },
            {
                "stage": "Security Assessment", 
                "approver": "Chief Security Officer",
                "focus": "Security implications and compliance",
                "duration": "30 minutes",
                "status": "pending"
            },
            {
                "stage": "Business Impact Review",
                "approver": "Operations Director",
                "focus": "Business continuity and SLA impact",
                "duration": "25 minutes", 
                "status": "pending"
            },
            {
                "stage": "Financial Approval",
                "approver": "Chief Financial Officer",
                "focus": "Budget impact and ROI justification",
                "duration": "20 minutes",
                "status": "pending"
            },
            {
                "stage": "Executive Sign-off",
                "approver": "Chief Technology Officer",
                "focus": "Strategic alignment and final approval",
                "duration": "15 minutes",
                "status": "pending"
            }
        ]
        
        # Simulate approval process
        for i, stage in enumerate(approval_stages, 1):
            print(f"\n   Stage {i}: {stage['stage']}")
            print(f"      Approver: {stage['approver']}")
            print(f"      Focus: {stage['focus']}")
            print(f"      Processing...")
            
            await asyncio.sleep(1)
            
            # Simulate approval decision
            if i <= 4:  # First 4 stages approved
                stage['status'] = 'approved'
                print(f"      ✅ APPROVED ({stage['duration']})")
                
                # Show approval conditions for some stages
                if i == 1:  # Technical review
                    print("         Conditions: Implement monitoring and rollback plan")
                elif i == 2:  # Security assessment
                    print("         Conditions: Complete security scan before deployment")
                elif i == 3:  # Business impact
                    print("         Conditions: Schedule during maintenance window")
                    
            else:  # Final stage - executive approval
                stage['status'] = 'approved'
                print(f"      ✅ APPROVED ({stage['duration']})")
                print("         Final authorization granted")
                
        print("\n📊 Approval Workflow Summary:")
        total_time = sum(int(stage['duration'].split()[0]) for stage in approval_stages)
        print(f"   ✅ All stages completed successfully")
        print(f"   ⏰ Total approval time: {total_time} minutes")
        print(f"   👥 Stakeholders involved: {len(approval_stages)}")
        print(f"   📋 Conditions to fulfill: 3")
        print(f"   🚀 Ready for implementation")
        
        print("\n🎯 Approval Analytics:")
        print("   📊 Average approval time: 27 minutes per stage")
        print("   📈 Approval success rate: 100%")
        print("   ⚡ Process efficiency: 15% faster than manual")
        print("   🤖 AI assistance: Context preparation, routing optimization")
        
    async def cleanup(self):
        """Clean up demo resources."""
        # Clean up any demo-specific resources
        pass