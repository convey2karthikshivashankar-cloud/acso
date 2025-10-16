#!/usr/bin/env python3
"""
ACSO Threat Detection Demonstration Scenario

Interactive demonstration of ACSO's threat detection and response capabilities.
Shows end-to-end workflow from threat identification to automated containment.
"""

import asyncio
import json
import time
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

# Import ACSO components
from src.agents.supervisor_agent import SupervisorAgent
from src.agents.threat_hunter_agent import ThreatHunterAgent
from src.agents.incident_response_agent import IncidentResponseAgent
from src.shared.models import ThreatAlert, IncidentReport, AgentMessage
from src.shared.communication import MessageBus
from src.shared.coordination import WorkflowCoordinator
from src.shared.human_interface import HumanApprovalInterface


@dataclass
class DemoStep:
    """Demonstration step data structure."""
    step_number: int
    title: str
    description: str
    duration: float
    automated: bool
    user_interaction: bool
    expected_outcome: str


class ThreatDetectionDemo:
    """Interactive threat detection demonstration."""
    
    def __init__(self):
        self.demo_name = "Advanced Persistent Threat Detection & Response"
        self.scenario_id = str(uuid.uuid4())
        
        # Initialize ACSO components
        self.message_bus = MessageBus()
        self.workflow_coordinator = WorkflowCoordinator()
        self.human_interface = HumanApprovalInterface()
        
        # Initialize agents
        self.supervisor = SupervisorAgent()
        self.threat_hunter = ThreatHunterAgent()
        self.incident_response = IncidentResponseAgent()
        
        # Demo state
        self.demo_steps = []
        self.current_step = 0
        self.demo_data = {}
        self.presentation_mode = True
        
    async def setup_demo_environment(self):
        """Set up the demonstration environment."""
        print("🎬 Setting up ACSO Threat Detection Demo Environment...")
        
        # Initialize message bus
        await self.message_bus.initialize()
        
        # Initialize workflow coordinator
        await self.workflow_coordinator.initialize(self.message_bus)
        
        # Initialize human interface
        await self.human_interface.initialize()
        
        # Start agents
        agents = [self.supervisor, self.threat_hunter, self.incident_response]
        for agent in agents:
            agent.message_bus = self.message_bus
            agent.workflow_coordinator = self.workflow_coordinator
            agent.human_interface = self.human_interface
            await agent.start()
            
        # Load demo data
        await self._load_demo_data()
        
        # Define demo steps
        self._define_demo_steps()
        
        print("✅ Demo environment ready!")
        
    async def _load_demo_data(self):
        """Load demonstration data and scenarios."""
        self.demo_data = {
            "company_profile": {
                "name": "TechCorp Industries",
                "industry": "Technology",
                "employees": 2500,
                "annual_revenue": "$500M",
                "security_maturity": "Advanced"
            },
            "network_topology": {
                "public_subnets": ["10.0.1.0/24", "10.0.2.0/24"],
                "private_subnets": ["10.0.10.0/24", "10.0.20.0/24"],
                "critical_systems": [
                    {"name": "prod-web-01", "ip": "10.0.1.10", "role": "web_server"},
                    {"name": "prod-db-01", "ip": "10.0.10.15", "role": "database"},
                    {"name": "prod-app-01", "ip": "10.0.10.20", "role": "application"},
                    {"name": "backup-srv-01", "ip": "10.0.20.5", "role": "backup"}
                ]
            },
            "threat_scenario": {
                "threat_type": "advanced_persistent_threat",
                "attack_vector": "spear_phishing",
                "target": "financial_data",
                "sophistication": "high",
                "attribution": "nation_state_actor",
                "timeline": {
                    "initial_compromise": "2024-01-15 09:30:00",
                    "lateral_movement": "2024-01-15 14:20:00",
                    "data_exfiltration": "2024-01-15 18:45:00",
                    "detection": "2024-01-15 19:12:00"
                }
            },
            "attack_indicators": [
                {
                    "type": "network_anomaly",
                    "description": "Unusual outbound traffic to suspicious domain",
                    "severity": "medium",
                    "confidence": 0.75,
                    "source": "prod-web-01",
                    "destination": "malicious-c2.example.com"
                },
                {
                    "type": "file_modification",
                    "description": "Unauthorized access to financial database",
                    "severity": "high", 
                    "confidence": 0.89,
                    "affected_system": "prod-db-01",
                    "files_accessed": ["customer_data.db", "financial_records.db"]
                },
                {
                    "type": "privilege_escalation",
                    "description": "Service account privilege escalation detected",
                    "severity": "critical",
                    "confidence": 0.92,
                    "user_account": "svc_backup",
                    "escalated_privileges": ["admin", "backup_operator"]
                }
            ]
        }
        
    def _define_demo_steps(self):
        """Define the demonstration steps."""
        self.demo_steps = [
            DemoStep(
                step_number=1,
                title="Initial Threat Detection",
                description="ACSO Threat Hunter detects suspicious network activity",
                duration=15.0,
                automated=True,
                user_interaction=False,
                expected_outcome="Threat alert generated with medium confidence"
            ),
            DemoStep(
                step_number=2,
                title="Threat Analysis & Correlation",
                description="AI analyzes multiple indicators and correlates attack patterns",
                duration=20.0,
                automated=True,
                user_interaction=False,
                expected_outcome="Threat confidence elevated to high, APT pattern identified"
            ),
            DemoStep(
                step_number=3,
                title="Human Expert Consultation",
                description="System requests human approval for high-impact containment actions",
                duration=30.0,
                automated=False,
                user_interaction=True,
                expected_outcome="Security analyst approves immediate containment"
            ),
            DemoStep(
                step_number=4,
                title="Automated Incident Response",
                description="ACSO executes coordinated containment and remediation actions",
                duration=25.0,
                automated=True,
                user_interaction=False,
                expected_outcome="Threat contained, systems isolated, evidence preserved"
            ),
            DemoStep(
                step_number=5,
                title="Impact Assessment & Reporting",
                description="System generates comprehensive incident report and recommendations",
                duration=10.0,
                automated=True,
                user_interaction=False,
                expected_outcome="Detailed incident report with lessons learned"
            )
        ]
        
    async def run_interactive_demo(self):
        """Run the interactive demonstration."""
        print(f"\n🎭 Welcome to the {self.demo_name} Demonstration")
        print("=" * 70)
        print(f"Scenario: {self.demo_data['company_profile']['name']} - APT Detection & Response")
        print(f"Demo ID: {self.scenario_id}")
        print("=" * 70)
        
        # Introduction
        await self._show_introduction()
        
        # Run each demo step
        for step in self.demo_steps:
            await self._execute_demo_step(step)
            
        # Conclusion
        await self._show_conclusion()
        
    async def _show_introduction(self):
        """Show demonstration introduction."""
        print("\n📋 SCENARIO OVERVIEW")
        print("-" * 30)
        
        company = self.demo_data['company_profile']
        threat = self.demo_data['threat_scenario']
        
        print(f"Company: {company['name']} ({company['industry']})")
        print(f"Employees: {company['employees']}")
        print(f"Revenue: {company['annual_revenue']}")
        print(f"Security Maturity: {company['security_maturity']}")
        
        print(f"\nThreat Type: {threat['threat_type'].replace('_', ' ').title()}")
        print(f"Attack Vector: {threat['attack_vector'].replace('_', ' ').title()}")
        print(f"Sophistication: {threat['sophistication'].title()}")
        print(f"Target: {threat['target'].replace('_', ' ').title()}")
        
        if self.presentation_mode:
            input("\n🎬 Press Enter to begin the demonstration...")
            
    async def _execute_demo_step(self, step: DemoStep):
        """Execute a single demonstration step."""
        print(f"\n🎯 STEP {step.step_number}: {step.title}")
        print("-" * 50)
        print(f"📝 {step.description}")
        
        if self.presentation_mode:
            input(f"\n▶️  Press Enter to execute Step {step.step_number}...")
            
        start_time = time.time()
        
        # Execute step based on type
        if step.step_number == 1:
            await self._demo_initial_detection()
        elif step.step_number == 2:
            await self._demo_threat_analysis()
        elif step.step_number == 3:
            await self._demo_human_consultation()
        elif step.step_number == 4:
            await self._demo_automated_response()
        elif step.step_number == 5:
            await self._demo_impact_assessment()
            
        # Simulate processing time
        elapsed = time.time() - start_time
        remaining = max(0, step.duration - elapsed)
        if remaining > 0:
            await self._simulate_processing(remaining)
            
        print(f"✅ {step.expected_outcome}")
        
        if self.presentation_mode and step.step_number < len(self.demo_steps):
            input("\n⏸️  Press Enter to continue to next step...")
            
    async def _demo_initial_detection(self):
        """Demonstrate initial threat detection."""
        print("🔍 Threat Hunter Agent analyzing network traffic...")
        
        # Simulate threat detection
        indicators = self.demo_data['attack_indicators']
        
        for i, indicator in enumerate(indicators[:1], 1):  # Show first indicator
            await asyncio.sleep(2)
            print(f"   📊 Analyzing indicator {i}: {indicator['type']}")
            print(f"      Description: {indicator['description']}")
            print(f"      Severity: {indicator['severity']}")
            print(f"      Confidence: {indicator['confidence']:.2f}")
            
        # Create threat alert
        threat_alert = ThreatAlert(
            threat_id=str(uuid.uuid4()),
            severity="medium",
            threat_type="network_anomaly",
            source_ip="10.0.1.10",
            destination_ip="external",
            indicators=["unusual_outbound_traffic", "suspicious_domain"],
            confidence_score=0.75,
            raw_data=["Network log entries..."]
        )
        
        print(f"   🚨 Threat Alert Generated: {threat_alert.threat_id[:8]}...")
        
    async def _demo_threat_analysis(self):
        """Demonstrate threat analysis and correlation."""
        print("🧠 AI Engine correlating multiple threat indicators...")
        
        indicators = self.demo_data['attack_indicators']
        
        # Show correlation analysis
        await asyncio.sleep(3)
        print("   🔗 Correlating network anomaly with file access patterns...")
        
        await asyncio.sleep(2)
        print("   🔗 Analyzing privilege escalation in context...")
        
        await asyncio.sleep(3)
        print("   🎯 Pattern Recognition: Advanced Persistent Threat (APT)")
        print("   📈 Confidence Score: 0.89 → 0.94 (High)")
        print("   🏷️  Classification: Nation-State Actor Profile")
        
        # Show threat intelligence correlation
        print("\n   🌐 Threat Intelligence Correlation:")
        print("      • Similar attack patterns observed in financial sector")
        print("      • C2 domain matches known APT infrastructure")
        print("      • TTPs consistent with previous campaigns")
        
    async def _demo_human_consultation(self):
        """Demonstrate human expert consultation."""
        print("👤 Requesting human approval for high-impact containment actions...")
        
        # Show approval request
        await asyncio.sleep(2)
        print("\n   📋 APPROVAL REQUEST")
        print("   " + "=" * 30)
        print("   Request Type: Critical Incident Response")
        print("   Threat Level: High (APT Detected)")
        print("   Proposed Actions:")
        print("     • Isolate affected systems (prod-web-01, prod-db-01)")
        print("     • Block external C2 communication")
        print("     • Preserve forensic evidence")
        print("     • Initiate incident response protocol")
        print("   Business Impact: Temporary service disruption (15-30 min)")
        print("   Risk if Delayed: Potential data exfiltration")
        
        if self.presentation_mode:
            print("\n   ⏳ Waiting for security analyst approval...")
            approval = input("   👨‍💼 Security Analyst Decision (approve/deny): ").lower().strip()
            
            if approval in ['approve', 'approved', 'yes', 'y']:
                print("   ✅ APPROVED by Security Analyst")
                print("   💬 Comment: 'Immediate containment authorized - APT threat confirmed'")
            else:
                print("   ❌ Action denied - alternative measures required")
        else:
            await asyncio.sleep(5)
            print("   ✅ APPROVED by Security Analyst")
            print("   💬 Comment: 'Immediate containment authorized - APT threat confirmed'")
            
    async def _demo_automated_response(self):
        """Demonstrate automated incident response."""
        print("🤖 Incident Response Agent executing containment actions...")
        
        # Show coordinated response actions
        actions = [
            ("Network Isolation", "Isolating prod-web-01 from network", 3),
            ("Traffic Blocking", "Blocking C2 communication to malicious-c2.example.com", 2),
            ("System Quarantine", "Quarantining affected database server", 4),
            ("Evidence Preservation", "Creating forensic snapshots", 3),
            ("User Notification", "Alerting security team and stakeholders", 2),
            ("Backup Verification", "Verifying backup integrity", 3)
        ]
        
        for action_name, action_desc, duration in actions:
            print(f"   🔧 {action_name}: {action_desc}")
            await asyncio.sleep(duration)
            print(f"      ✅ {action_name} completed successfully")
            
        # Show containment results
        print("\n   📊 CONTAINMENT SUMMARY")
        print("   " + "=" * 25)
        print("   • Threat neutralized: ✅")
        print("   • Systems isolated: ✅")
        print("   • Data protected: ✅")
        print("   • Evidence preserved: ✅")
        print("   • Stakeholders notified: ✅")
        
    async def _demo_impact_assessment(self):
        """Demonstrate impact assessment and reporting."""
        print("📊 Generating comprehensive incident report...")
        
        await asyncio.sleep(3)
        
        # Show incident report
        print("\n   📄 INCIDENT REPORT SUMMARY")
        print("   " + "=" * 30)
        print(f"   Incident ID: INC-{self.scenario_id[:8]}")
        print("   Classification: Advanced Persistent Threat (APT)")
        print("   Severity: Critical")
        print("   Status: Contained")
        print("   Detection Time: 19:12 UTC")
        print("   Containment Time: 19:47 UTC")
        print("   Response Duration: 35 minutes")
        
        print("\n   💰 BUSINESS IMPACT")
        print("   • Service Downtime: 15 minutes")
        print("   • Data Loss: None (prevented)")
        print("   • Estimated Loss Prevented: $2.3M")
        print("   • Response Cost: $15K")
        print("   • ROI: 15,233%")
        
        print("\n   🎯 KEY ACHIEVEMENTS")
        print("   • 0 minutes of undetected dwell time")
        print("   • 100% data protection maintained")
        print("   • 35-minute response time (vs. industry avg 200 days)")
        print("   • Automated containment prevented escalation")
        
        print("\n   📋 RECOMMENDATIONS")
        print("   • Update email security policies")
        print("   • Enhance user security training")
        print("   • Review backup access controls")
        print("   • Implement additional network segmentation")
        
    async def _simulate_processing(self, duration: float):
        """Simulate processing time with progress indication."""
        steps = int(duration)
        for i in range(steps):
            await asyncio.sleep(1)
            print("   ⏳ Processing" + "." * ((i % 3) + 1), end="\r")
        print("   " + " " * 20, end="\r")  # Clear progress line
        
    async def _show_conclusion(self):
        """Show demonstration conclusion."""
        print("\n🎉 DEMONSTRATION COMPLETE")
        print("=" * 40)
        
        print("\n📈 ACSO CAPABILITIES DEMONSTRATED:")
        print("✅ Autonomous threat detection and analysis")
        print("✅ AI-powered threat correlation and classification")
        print("✅ Human-in-the-loop decision making")
        print("✅ Coordinated automated incident response")
        print("✅ Comprehensive impact assessment and reporting")
        
        print("\n🎯 KEY BENEFITS SHOWCASED:")
        print("• 99.7% faster threat response (35 min vs 200 days)")
        print("• $2.3M in prevented losses")
        print("• Zero data loss through proactive containment")
        print("• Seamless human-AI collaboration")
        print("• Complete audit trail and compliance reporting")
        
        print("\n💡 NEXT STEPS:")
        print("• Schedule technical deep-dive session")
        print("• Discuss integration requirements")
        print("• Plan pilot deployment strategy")
        print("• Review pricing and licensing options")
        
        if self.presentation_mode:
            input("\n🎬 Press Enter to end demonstration...")
            
    async def cleanup_demo_environment(self):
        """Clean up the demonstration environment."""
        print("\n🧹 Cleaning up demo environment...")
        
        # Stop agents
        agents = [self.supervisor, self.threat_hunter, self.incident_response]
        for agent in agents:
            await agent.stop()
            
        # Shutdown components
        await self.workflow_coordinator.shutdown()
        await self.human_interface.shutdown()
        await self.message_bus.shutdown()
        
        print("✅ Demo environment cleaned up!")
        
    def generate_demo_report(self) -> Dict[str, Any]:
        """Generate demonstration report."""
        return {
            "demo_metadata": {
                "demo_name": self.demo_name,
                "scenario_id": self.scenario_id,
                "timestamp": datetime.utcnow().isoformat(),
                "duration": sum(step.duration for step in self.demo_steps)
            },
            "scenario_data": self.demo_data,
            "demo_steps": [
                {
                    "step_number": step.step_number,
                    "title": step.title,
                    "description": step.description,
                    "duration": step.duration,
                    "automated": step.automated,
                    "expected_outcome": step.expected_outcome
                }
                for step in self.demo_steps
            ],
            "key_metrics": {
                "response_time_minutes": 35,
                "data_loss_prevented": True,
                "estimated_savings": 2300000,
                "response_cost": 15000,
                "roi_percentage": 15233
            }
        }


async def run_threat_detection_demo():
    """Run the threat detection demonstration."""
    demo = ThreatDetectionDemo()
    
    try:
        await demo.setup_demo_environment()
        await demo.run_interactive_demo()
        
        # Generate report
        report = demo.generate_demo_report()
        
        # Save report
        with open(f"demo_report_{demo.scenario_id[:8]}.json", 'w') as f:
            json.dump(report, f, indent=2)
            
        print(f"\n📄 Demo report saved: demo_report_{demo.scenario_id[:8]}.json")
        
    finally:
        await demo.cleanup_demo_environment()


if __name__ == "__main__":
    asyncio.run(run_threat_detection_demo())