#!/usr/bin/env python3
"""
ACSO Demo Data Generator

Generates realistic demo data for ACSO demonstration scenarios.
"""

import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import numpy as np


class DemoDataGenerator:
    """Generates realistic demo data for ACSO scenarios."""
    
    def __init__(self):
        self.threat_types = [
            "malware_communication", "data_exfiltration", "ddos_attack",
            "insider_threat", "advanced_persistent_threat", "brute_force_attack",
            "privilege_escalation", "lateral_movement", "ransomware", "phishing"
        ]
        
        self.company_names = [
            "TechCorp Industries", "Global Solutions Inc", "DataFlow Systems",
            "SecureNet Ltd", "CloudFirst Technologies", "InnovateTech Corp"
        ]
        
        self.system_names = [
            "web-server", "database-server", "app-server", "file-server",
            "mail-server", "backup-server", "monitoring-server", "proxy-server"
        ]
        
    def generate_malware_threat(self) -> Dict[str, Any]:
        """Generate realistic malware threat data."""
        return {
            "threat_id": str(uuid.uuid4()),
            "threat_type": "malware_communication",
            "source_ip": f"192.168.{random.randint(1, 255)}.{random.randint(1, 255)}",
            "destination_ip": f"10.0.{random.randint(1, 255)}.{random.randint(1, 255)}",
            "malicious_domain": random.choice([
                "malicious-c2.darkweb.com", "evil-command.badactor.net",
                "trojan-control.cybercrime.org", "backdoor-comm.threat.zone"
            ]),
            "confidence_score": random.uniform(0.85, 0.98),
            "indicators": [
                "suspicious_network_traffic", "known_malicious_signature",
                "behavioral_anomaly", "c2_communication_pattern"
            ],
            "raw_logs": [
                f"2024-01-15 10:30:{15+i:02d} - Connection to suspicious domain detected"
                for i in range(8)
            ]
        }
        
    def generate_data_exfiltration_threat(self) -> Dict[str, Any]:
        """Generate data exfiltration scenario."""
        return {
            "source_system": "prod-database-01",
            "data_volume_gb": random.uniform(8.5, 15.2),
            "transfer_rate": random.uniform(45, 85),
            "external_ip": f"{random.randint(185, 195)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
            "detection_time": "2024-01-15 02:15:33 UTC",
            "baseline_volume": 0.8,
            "anomaly_factor": 12.5
        }
        
    def generate_apt_threat(self) -> Dict[str, Any]:
        """Generate Advanced Persistent Threat scenario."""
        return {
            "attack_vector": "spear_phishing_email",
            "lateral_movement": ["credential_harvesting", "privilege_escalation", "network_reconnaissance"],
            "persistence_methods": ["scheduled_tasks", "registry_modification", "service_installation"],
            "c2_servers": ["apt-c2-primary.onion", "backup-command.darknet"],
            "attack_duration": random.randint(15, 45),
            "sophistication": "nation_state_level",
            "attribution_confidence": 0.87
        }
        
    def generate_patch_scenario(self) -> Dict[str, Any]:
        """Generate patch management scenario."""
        return {
            "patch_type": "Critical Security Update",
            "severity": "HIGH",
            "affected_count": random.randint(45, 85),
            "maintenance_window": "Sunday 02:00-06:00 UTC",
            "cve_numbers": ["CVE-2024-0001", "CVE-2024-0002"],
            "vendor": "Microsoft",
            "estimated_downtime": random.randint(30, 90)
        }
        
    def generate_service_requests(self, count: int) -> List[Dict[str, Any]]:
        """Generate multiple service request scenarios."""
        request_types = [
            ("Emergency security patch deployment", "high", 85, True),
            ("Database performance optimization", "medium", 65, True),
            ("New user account provisioning", "low", 95, True),
            ("Server hardware replacement", "high", 45, False),
            ("Network configuration change", "medium", 70, False)
        ]
        
        requests = []
        for i in range(count):
            title, priority, auto_score, can_auto = random.choice(request_types)
            
            request = {
                "request_id": str(uuid.uuid4()),
                "title": f"{title} #{i+1001}",
                "priority": priority,
                "intelligent_priority": auto_score + random.randint(-10, 10),
                "can_automate": can_auto,
                "estimated_duration": random.randint(15, 120),
                "actual_duration": random.randint(10, 90),
                "client_id": f"client-{random.randint(1, 50):03d}",
                "assigned_team": random.choice(["Infrastructure", "Security", "Applications"]),
                "required_skills": random.sample(["Linux", "Windows", "Networking", "Security", "Database"], 2),
                "sla_hours": random.choice([4, 8, 24, 48]),
                "execution_steps": [
                    "Validate request parameters",
                    "Check system dependencies", 
                    "Execute automated procedures",
                    "Verify successful completion",
                    "Update documentation"
                ]
            }
            requests.append(request)
            
        return requests
        
    def generate_capacity_scenario(self) -> Dict[str, Any]:
        """Generate capacity optimization scenario."""
        return {
            "total_servers": random.randint(45, 85),
            "avg_cpu": random.uniform(65, 85),
            "avg_memory": random.uniform(70, 88),
            "network_throughput": random.uniform(8.5, 15.2),
            "monthly_cost": random.randint(18000, 35000),
            "growth_30d": random.uniform(8, 15),
            "growth_90d": random.uniform(25, 40),
            "peak_growth": random.uniform(60, 120),
            "bottlenecks": [
                {"resource": "Database CPU", "utilization": 89, "threshold": 80},
                {"resource": "Web Server Memory", "utilization": 94, "threshold": 85},
                {"resource": "Network Bandwidth", "utilization": 78, "threshold": 75}
            ]
        }
        
    def generate_cost_analysis_scenario(self) -> Dict[str, Any]:
        """Generate cost analysis scenario."""
        monthly_spend = random.randint(180000, 280000)
        return {
            "monthly_spend": monthly_spend,
            "annual_budget": monthly_spend * 12,
            "budget_utilization": random.uniform(85, 105),
            "cost_per_employee": monthly_spend // random.randint(150, 300),
            "cost_breakdown": {
                "Cloud Infrastructure": int(monthly_spend * 0.45),
                "Software Licenses": int(monthly_spend * 0.25),
                "Network Services": int(monthly_spend * 0.15),
                "Security Tools": int(monthly_spend * 0.10),
                "Other": int(monthly_spend * 0.05)
            }
        }
        
    def generate_revenue_analysis_scenario(self) -> Dict[str, Any]:
        """Generate revenue analysis scenario."""
        mrr = random.randint(450000, 750000)
        return {
            "mrr": mrr,
            "arr": mrr * 12,
            "avg_customer_value": random.randint(8000, 15000),
            "retention_rate": random.uniform(92, 98),
            "customer_segments": [
                {
                    "name": "Enterprise Clients",
                    "count": random.randint(15, 25),
                    "avg_spend": random.randint(18000, 35000),
                    "growth_rate": random.uniform(5, 12),
                    "satisfaction": random.uniform(8.2, 9.5)
                },
                {
                    "name": "Mid-Market",
                    "count": random.randint(35, 55),
                    "avg_spend": random.randint(8000, 18000),
                    "growth_rate": random.uniform(8, 18),
                    "satisfaction": random.uniform(7.8, 9.2)
                },
                {
                    "name": "Small Business",
                    "count": random.randint(85, 125),
                    "avg_spend": random.randint(2000, 8000),
                    "growth_rate": random.uniform(12, 25),
                    "satisfaction": random.uniform(7.5, 8.8)
                }
            ]
        }
        
    def generate_roi_scenario(self) -> Dict[str, Any]:
        """Generate ROI analysis scenario."""
        initial_investment = random.randint(450000, 750000)
        return {
            "initial_investment": initial_investment,
            "annual_operating_cost": random.randint(180000, 280000),
            "implementation_months": random.randint(6, 12),
            "analysis_years": 5,
            "annual_benefits": [
                {
                    "category": "Operational Cost Reduction",
                    "amount": random.randint(280000, 420000),
                    "description": "Reduced manual labor and improved efficiency"
                },
                {
                    "category": "Revenue Enhancement",
                    "amount": random.randint(180000, 320000),
                    "description": "Faster service delivery and upselling opportunities"
                },
                {
                    "category": "Risk Mitigation",
                    "amount": random.randint(120000, 200000),
                    "description": "Reduced security incidents and compliance costs"
                }
            ],
            "training_cost": random.randint(25000, 45000),
            "maintenance_cost": random.randint(35000, 55000)
        }
        
    def generate_approval_scenario(self) -> Dict[str, Any]:
        """Generate approval workflow scenario."""
        return {
            "incident_type": "Critical Infrastructure Compromise",
            "risk_level": "HIGH",
            "potential_impact": "$2.5M+ (regulatory fines, data breach)",
            "affected_systems": ["Customer Database", "Payment Processing", "User Authentication"],
            "recommended_action": "Immediate system isolation and forensic preservation",
            "confidence_level": random.randint(65, 85),
            "business_impact": random.randint(7, 9),
            "complexity": random.randint(6, 9),
            "time_sensitivity": "CRITICAL"
        }
        
    def generate_escalation_scenario(self) -> Dict[str, Any]:
        """Generate expert escalation scenario."""
        return {
            "threat_pattern": "Novel multi-stage attack with custom tooling",
            "sophistication": "Nation-state level",
            "ai_confidence": random.randint(35, 65),
            "similar_incidents": random.randint(0, 3),
            "attribution": "Potential APT-40 (Leviathan) involvement"
        }
        
    def generate_multistage_scenario(self) -> Dict[str, Any]:
        """Generate multi-stage approval scenario."""
        return {
            "change_type": "Major Infrastructure Upgrade",
            "scope": "Production environment migration to new data center",
            "business_impact": "24-hour service window required",
            "estimated_cost": random.randint(850000, 1500000),
            "implementation_time": "6-8 weeks"
        }
        
    def generate_complex_incident(self) -> Dict[str, Any]:
        """Generate complex multi-vector incident."""
        return {
            "attack_type": "Coordinated Multi-Vector Cyber Attack",
            "attack_vectors": ["Email Phishing", "Network Intrusion", "Insider Threat", "Supply Chain"],
            "affected_systems": random.randint(15, 35),
            "estimated_impact": "$5M+ potential damage",
            "sophistication": "Advanced Persistent Threat (APT)"
        }
        
    def generate_resource_optimization_scenario(self) -> Dict[str, Any]:
        """Generate resource optimization scenario."""
        return {
            "current_cost": random.randint(250000, 450000),
            "performance_issues": "Response time degradation, capacity constraints",
            "capacity_utilization": random.randint(65, 85),
            "sla_status": "At risk (95.2% vs 99% target)",
            "optimization_target": "20% cost reduction, 40% performance improvement"
        }
        
    def generate_business_crisis_scenario(self) -> Dict[str, Any]:
        """Generate business crisis scenario."""
        return {
            "client_name": random.choice(self.company_names),
            "issue_type": "Critical Service Outage with Data Integrity Concerns",
            "severity": "CRITICAL",
            "revenue_at_risk": random.randint(850000, 2500000),
            "sla_breach_risk": "HIGH (99.9% SLA at risk)",
            "client_satisfaction": random.randint(3, 6)
        }