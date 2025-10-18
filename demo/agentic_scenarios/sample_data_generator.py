"""
ACSO Sample Data Generator

Generates realistic sample data for agentic AI demonstrations including
threat scenarios, cost optimization opportunities, and service events.
"""

import asyncio
import json
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import ipaddress


@dataclass
class ThreatEvent:
    """Represents a cybersecurity threat event."""
    id: str
    timestamp: datetime
    source_ip: str
    target_ip: str
    threat_type: str
    severity: str
    description: str
    indicators: List[str]
    attack_vector: str
    confidence_score: float
    status: str = "detected"


@dataclass
class CostScenario:
    """Represents a cost optimization scenario."""
    id: str
    service_name: str
    current_cost: float
    usage_pattern: str
    optimization_opportunity: str
    potential_savings: float
    implementation_effort: str
    risk_level: str
    roi_months: int


@dataclass
class ServiceEvent:
    """Represents a service-related event."""
    id: str
    timestamp: datetime
    service_name: str
    event_type: str
    severity: str
    description: str
    impact_level: str
    affected_users: int
    resolution_time_minutes: Optional[int] = None


@dataclass
class NetworkNode:
    """Represents a network topology node."""
    id: str
    name: str
    ip_address: str
    node_type: str
    os: str
    services: List[str]
    security_level: str
    connections: List[str]


class SampleDataGenerator:
    """Generates realistic sample data for ACSO demonstrations."""
    
    def __init__(self):
        self.threat_types = [
            "Advanced Persistent Threat",
            "Ransomware",
            "Data Exfiltration",
            "Lateral Movement",
            "Privilege Escalation",
            "Command and Control",
            "Malware Infection",
            "Phishing Attack",
            "SQL Injection",
            "Cross-Site Scripting"
        ]
        
        self.attack_vectors = [
            "Email Attachment",
            "Malicious URL",
            "Network Vulnerability",
            "Insider Threat",
            "Supply Chain",
            "Social Engineering",
            "Zero-Day Exploit",
            "Brute Force",
            "Man-in-the-Middle",
            "DNS Poisoning"
        ]
        
        self.services = [
            "Web Server", "Database", "Email Server", "File Server",
            "DNS Server", "Load Balancer", "API Gateway", "Cache Server",
            "Message Queue", "Authentication Service", "Monitoring Service",
            "Backup Service", "CDN", "VPN Gateway", "Firewall"
        ]
        
        self.cost_services = [
            "EC2 Instances", "RDS Databases", "S3 Storage", "CloudFront CDN",
            "Lambda Functions", "ELB Load Balancers", "VPC NAT Gateways",
            "ElastiCache", "Elasticsearch", "Kinesis Streams", "SQS Queues",
            "SNS Topics", "CloudWatch Logs", "Route 53 DNS", "EFS Storage"
        ]
    
    def generate_ip_address(self, private: bool = True) -> str:
        """Generate a realistic IP address."""
        if private:
            # Generate private IP addresses
            networks = [
                ipaddress.IPv4Network('10.0.0.0/8'),
                ipaddress.IPv4Network('172.16.0.0/12'),
                ipaddress.IPv4Network('192.168.0.0/16')
            ]
            network = random.choice(networks)
            return str(network.network_address + random.randint(1, network.num_addresses - 2))
        else:
            # Generate public IP addresses (avoiding private ranges)
            while True:
                ip = f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
                if not ipaddress.IPv4Address(ip).is_private:
                    return ip
    
    def generate_threat_events(self, count: int = 50) -> List[ThreatEvent]:
        """Generate realistic threat events."""
        events = []
        base_time = datetime.utcnow() - timedelta(days=7)
        
        for i in range(count):
            event_time = base_time + timedelta(
                minutes=random.randint(0, 7 * 24 * 60)
            )
            
            threat_type = random.choice(self.threat_types)
            attack_vector = random.choice(self.attack_vectors)
            
            # Generate severity based on threat type
            severity_weights = {
                "Advanced Persistent Threat": ["critical", "high", "medium"],
                "Ransomware": ["critical", "critical", "high"],
                "Data Exfiltration": ["critical", "high", "high"],
                "Lateral Movement": ["high", "medium", "medium"],
                "Privilege Escalation": ["high", "high", "medium"],
                "Command and Control": ["high", "medium", "medium"],
                "Malware Infection": ["medium", "medium", "low"],
                "Phishing Attack": ["medium", "low", "low"],
                "SQL Injection": ["high", "medium", "medium"],
                "Cross-Site Scripting": ["medium", "low", "low"]
            }
            
            severity = random.choice(severity_weights.get(threat_type, ["medium", "low"]))
            
            # Generate indicators based on threat type
            indicators = self._generate_threat_indicators(threat_type, attack_vector)
            
            event = ThreatEvent(
                id=str(uuid.uuid4()),
                timestamp=event_time,
                source_ip=self.generate_ip_address(private=False),
                target_ip=self.generate_ip_address(private=True),
                threat_type=threat_type,
                severity=severity,
                description=self._generate_threat_description(threat_type, attack_vector),
                indicators=indicators,
                attack_vector=attack_vector,
                confidence_score=random.uniform(0.6, 0.95),
                status=random.choice(["detected", "investigating", "contained", "resolved"])
            )
            
            events.append(event)
        
        return events
    
    def _generate_threat_indicators(self, threat_type: str, attack_vector: str) -> List[str]:
        """Generate realistic threat indicators."""
        base_indicators = [
            f"Suspicious network traffic from {self.generate_ip_address(private=False)}",
            f"Unusual process execution: {random.choice(['powershell.exe', 'cmd.exe', 'wscript.exe', 'rundll32.exe'])}",
            f"File hash: {self._generate_hash()}",
            f"Registry modification detected",
            f"Outbound connection to suspicious domain"
        ]
        
        threat_specific = {
            "Advanced Persistent Threat": [
                "Long-term persistence mechanism detected",
                "Covert channel communication",
                "Data staging in temporary directories"
            ],
            "Ransomware": [
                "File encryption activity detected",
                "Ransom note creation",
                "Shadow copy deletion"
            ],
            "Data Exfiltration": [
                "Large data transfer detected",
                "Compression of sensitive files",
                "Unauthorized database access"
            ]
        }
        
        indicators = random.sample(base_indicators, random.randint(2, 4))
        if threat_type in threat_specific:
            indicators.extend(random.sample(threat_specific[threat_type], random.randint(1, 2)))
        
        return indicators
    
    def _generate_threat_description(self, threat_type: str, attack_vector: str) -> str:
        """Generate realistic threat descriptions."""
        descriptions = {
            "Advanced Persistent Threat": f"Sophisticated {attack_vector.lower()} attack with persistence mechanisms",
            "Ransomware": f"Ransomware deployment via {attack_vector.lower()}",
            "Data Exfiltration": f"Unauthorized data access and exfiltration through {attack_vector.lower()}",
            "Lateral Movement": f"Attacker moving laterally through network using {attack_vector.lower()}",
            "Privilege Escalation": f"Privilege escalation attempt via {attack_vector.lower()}",
            "Command and Control": f"C2 communication established through {attack_vector.lower()}",
            "Malware Infection": f"Malware infection detected from {attack_vector.lower()}",
            "Phishing Attack": f"Phishing campaign using {attack_vector.lower()}",
            "SQL Injection": f"SQL injection attack via {attack_vector.lower()}",
            "Cross-Site Scripting": f"XSS attack through {attack_vector.lower()}"
        }
        
        return descriptions.get(threat_type, f"Security incident involving {attack_vector.lower()}")
    
    def _generate_hash(self) -> str:
        """Generate a realistic file hash."""
        return ''.join(random.choices('0123456789abcdef', k=64))
    
    def generate_cost_scenarios(self, count: int = 20) -> List[CostScenario]:
        """Generate realistic cost optimization scenarios."""
        scenarios = []
        
        optimization_opportunities = [
            "Right-size instances based on utilization",
            "Convert to reserved instances",
            "Implement auto-scaling",
            "Use spot instances for batch workloads",
            "Optimize storage tiers",
            "Consolidate underutilized resources",
            "Implement lifecycle policies",
            "Use compression and deduplication",
            "Optimize data transfer costs",
            "Implement caching strategies"
        ]
        
        usage_patterns = [
            "Consistent high usage",
            "Predictable daily peaks",
            "Weekend-only usage",
            "Seasonal variations",
            "Batch processing workloads",
            "Development/testing cycles",
            "Irregular spikes",
            "Declining usage trend"
        ]
        
        for i in range(count):
            service = random.choice(self.cost_services)
            current_cost = random.uniform(500, 15000)
            savings_percentage = random.uniform(0.15, 0.65)
            potential_savings = current_cost * savings_percentage
            
            scenario = CostScenario(
                id=str(uuid.uuid4()),
                service_name=service,
                current_cost=round(current_cost, 2),
                usage_pattern=random.choice(usage_patterns),
                optimization_opportunity=random.choice(optimization_opportunities),
                potential_savings=round(potential_savings, 2),
                implementation_effort=random.choice(["Low", "Medium", "High"]),
                risk_level=random.choice(["Low", "Medium", "High"]),
                roi_months=random.randint(1, 12)
            )
            
            scenarios.append(scenario)
        
        return scenarios    

    def generate_service_events(self, count: int = 30) -> List[ServiceEvent]:
        """Generate realistic service events."""
        events = []
        base_time = datetime.utcnow() - timedelta(days=3)
        
        event_types = [
            "Service Outage", "Performance Degradation", "High CPU Usage",
            "Memory Leak", "Disk Space Warning", "Network Connectivity Issue",
            "Database Connection Timeout", "SSL Certificate Expiry",
            "Load Balancer Failure", "Cache Miss Rate High", "API Rate Limit Exceeded",
            "Backup Failure", "Security Scan Alert", "Configuration Drift"
        ]
        
        for i in range(count):
            event_time = base_time + timedelta(
                minutes=random.randint(0, 3 * 24 * 60)
            )
            
            event_type = random.choice(event_types)
            service = random.choice(self.services)
            
            # Determine severity and impact based on event type
            severity_impact_map = {
                "Service Outage": ("critical", "high", random.randint(100, 5000)),
                "Performance Degradation": ("high", "medium", random.randint(50, 1000)),
                "High CPU Usage": ("medium", "low", random.randint(10, 500)),
                "Memory Leak": ("high", "medium", random.randint(20, 800)),
                "Disk Space Warning": ("medium", "low", random.randint(5, 200)),
                "Network Connectivity Issue": ("high", "high", random.randint(200, 3000)),
                "Database Connection Timeout": ("high", "high", random.randint(100, 2000)),
                "SSL Certificate Expiry": ("critical", "high", random.randint(500, 10000)),
                "Load Balancer Failure": ("critical", "high", random.randint(1000, 8000)),
                "Cache Miss Rate High": ("medium", "medium", random.randint(50, 1500)),
                "API Rate Limit Exceeded": ("medium", "medium", random.randint(20, 800)),
                "Backup Failure": ("high", "low", random.randint(0, 100)),
                "Security Scan Alert": ("medium", "low", random.randint(0, 50)),
                "Configuration Drift": ("low", "low", random.randint(0, 20))
            }
            
            severity, impact, affected_users = severity_impact_map.get(
                event_type, ("medium", "medium", random.randint(10, 500))
            )
            
            # Generate resolution time based on severity
            resolution_time = None
            if random.random() > 0.3:  # 70% of events are resolved
                resolution_times = {
                    "critical": random.randint(5, 60),
                    "high": random.randint(15, 180),
                    "medium": random.randint(30, 360),
                    "low": random.randint(60, 720)
                }
                resolution_time = resolution_times.get(severity, 120)
            
            event = ServiceEvent(
                id=str(uuid.uuid4()),
                timestamp=event_time,
                service_name=service,
                event_type=event_type,
                severity=severity,
                description=self._generate_service_description(event_type, service),
                impact_level=impact,
                affected_users=affected_users,
                resolution_time_minutes=resolution_time
            )
            
            events.append(event)
        
        return events
    
    def _generate_service_description(self, event_type: str, service: str) -> str:
        """Generate realistic service event descriptions."""
        descriptions = {
            "Service Outage": f"{service} is completely unavailable",
            "Performance Degradation": f"{service} response times increased by 300%",
            "High CPU Usage": f"{service} CPU utilization above 90%",
            "Memory Leak": f"{service} memory usage continuously increasing",
            "Disk Space Warning": f"{service} disk usage above 85%",
            "Network Connectivity Issue": f"{service} experiencing intermittent network issues",
            "Database Connection Timeout": f"{service} unable to connect to database",
            "SSL Certificate Expiry": f"{service} SSL certificate expires in 7 days",
            "Load Balancer Failure": f"{service} load balancer health check failing",
            "Cache Miss Rate High": f"{service} cache hit rate below 60%",
            "API Rate Limit Exceeded": f"{service} API requests exceeding rate limits",
            "Backup Failure": f"{service} backup process failed",
            "Security Scan Alert": f"{service} security vulnerability detected",
            "Configuration Drift": f"{service} configuration differs from baseline"
        }
        
        return descriptions.get(event_type, f"{service} experiencing {event_type.lower()}")
    
    def generate_network_topology(self, node_count: int = 25) -> List[NetworkNode]:
        """Generate realistic network topology."""
        nodes = []
        node_types = ["Server", "Workstation", "Router", "Switch", "Firewall", "Load Balancer"]
        operating_systems = ["Windows Server 2019", "Ubuntu 20.04", "CentOS 8", "Windows 10", "macOS", "pfSense"]
        security_levels = ["High", "Medium", "Low"]
        
        # Generate nodes
        for i in range(node_count):
            node_type = random.choice(node_types)
            
            # Assign services based on node type
            if node_type == "Server":
                node_services = random.sample(self.services[:8], random.randint(1, 3))
            elif node_type == "Load Balancer":
                node_services = ["Load Balancing", "Health Checks"]
            elif node_type == "Firewall":
                node_services = ["Packet Filtering", "Intrusion Detection"]
            else:
                node_services = []
            
            node = NetworkNode(
                id=f"node-{i+1:03d}",
                name=f"{node_type}-{i+1:02d}",
                ip_address=self.generate_ip_address(private=True),
                node_type=node_type,
                os=random.choice(operating_systems),
                services=node_services,
                security_level=random.choice(security_levels),
                connections=[]  # Will be populated after all nodes are created
            )
            
            nodes.append(node)
        
        # Generate connections between nodes
        for node in nodes:
            # Each node connects to 1-4 other nodes
            connection_count = random.randint(1, min(4, len(nodes) - 1))
            potential_connections = [n.id for n in nodes if n.id != node.id]
            node.connections = random.sample(potential_connections, connection_count)
        
        return nodes
    
    async def generate_demo_data(self) -> Dict[str, Any]:
        """Generate all sample data for demonstrations."""
        print("🔄 Generating threat events...")
        threats = self.generate_threat_events(50)
        
        print("🔄 Generating cost scenarios...")
        cost_scenarios = self.generate_cost_scenarios(20)
        
        print("🔄 Generating service events...")
        service_events = self.generate_service_events(30)
        
        print("🔄 Generating network topology...")
        network_nodes = self.generate_network_topology(25)
        
        # Save data to files
        data_dir = "demo/sample_data"
        
        # Create directory if it doesn't exist
        import os
        os.makedirs(data_dir, exist_ok=True)
        
        # Save threat events
        with open(f"{data_dir}/threat_events.json", "w") as f:
            json.dump([asdict(threat) for threat in threats], f, indent=2, default=str)
        
        # Save cost scenarios
        with open(f"{data_dir}/cost_scenarios.json", "w") as f:
            json.dump([asdict(scenario) for scenario in cost_scenarios], f, indent=2)
        
        # Save service events
        with open(f"{data_dir}/service_events.json", "w") as f:
            json.dump([asdict(event) for event in service_events], f, indent=2, default=str)
        
        # Save network topology
        with open(f"{data_dir}/network_topology.json", "w") as f:
            json.dump([asdict(node) for node in network_nodes], f, indent=2)
        
        # Generate summary statistics
        stats = {
            "threats": len(threats),
            "cost_scenarios": len(cost_scenarios),
            "service_events": len(service_events),
            "network_nodes": len(network_nodes),
            "generation_time": datetime.utcnow().isoformat(),
            "threat_severity_distribution": self._calculate_severity_distribution(threats),
            "cost_optimization_potential": sum(s.potential_savings for s in cost_scenarios),
            "service_availability": self._calculate_service_availability(service_events)
        }
        
        with open(f"{data_dir}/generation_stats.json", "w") as f:
            json.dump(stats, f, indent=2)
        
        return stats
    
    def _calculate_severity_distribution(self, threats: List[ThreatEvent]) -> Dict[str, int]:
        """Calculate threat severity distribution."""
        distribution = {"critical": 0, "high": 0, "medium": 0, "low": 0}
        for threat in threats:
            distribution[threat.severity] = distribution.get(threat.severity, 0) + 1
        return distribution
    
    def _calculate_service_availability(self, events: List[ServiceEvent]) -> float:
        """Calculate overall service availability percentage."""
        total_downtime = sum(
            event.resolution_time_minutes or 0 
            for event in events 
            if event.severity in ["critical", "high"]
        )
        
        # Assume 3 days of monitoring (4320 minutes)
        total_time = 3 * 24 * 60
        availability = ((total_time - total_downtime) / total_time) * 100
        return round(availability, 2)


# Global instance
sample_data_generator = SampleDataGenerator()


async def generate_demo_data() -> Dict[str, Any]:
    """Convenience function to generate demo data."""
    return await sample_data_generator.generate_demo_data()


if __name__ == "__main__":
    # Generate sample data when run directly
    asyncio.run(generate_demo_data())