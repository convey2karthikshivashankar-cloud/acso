"""
Cybersecurity Sample Data Generator for ACSO Phase 5 Agentic Demonstrations.

This module generates realistic cybersecurity data including network topologies,
threat intelligence, attack scenarios, vulnerability data, and incident histories.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, field
import ipaddress
import json
import logging

logger = logging.getLogger(__name__)


class ThreatLevel(str, Enum):
    """Threat severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class AttackType(str, Enum):
    """Types of cyber attacks."""
    MALWARE = "malware"
    PHISHING = "phishing"
    RANSOMWARE = "ransomware"
    DDoS = "ddos"
    SQL_INJECTION = "sql_injection"
    XSS = "xss"
    BRUTE_FORCE = "brute_force"
    INSIDER_THREAT = "insider_threat"
    APT = "apt"
    ZERO_DAY = "zero_day"


class AssetType(str, Enum):
    """Types of network assets."""
    SERVER = "server"
    WORKSTATION = "workstation"
    ROUTER = "router"
    SWITCH = "switch"
    FIREWALL = "firewall"
    DATABASE = "database"
    WEB_SERVER = "web_server"
    EMAIL_SERVER = "email_server"
    DNS_SERVER = "dns_server"
    LOAD_BALANCER = "load_balancer"


@dataclass
class NetworkAsset:
    """Represents a network asset."""
    asset_id: str
    name: str
    asset_type: AssetType
    ip_address: str
    mac_address: str
    operating_system: str
    version: str
    location: str
    criticality: ThreatLevel
    last_seen: datetime
    vulnerabilities: List[str] = field(default_factory=list)
    services: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "asset_id": self.asset_id,
            "name": self.name,
            "asset_type": self.asset_type.value,
            "ip_address": self.ip_address,
            "mac_address": self.mac_address,
            "operating_system": self.operating_system,
            "version": self.version,
            "location": self.location,
            "criticality": self.criticality.value,
            "last_seen": self.last_seen.isoformat(),
            "vulnerabilities": self.vulnerabilities,
            "services": self.services,
            "metadata": self.metadata
        }


@dataclass
class ThreatIntelligence:
    """Represents threat intelligence data."""
    threat_id: str
    name: str
    threat_type: AttackType
    severity: ThreatLevel
    description: str
    indicators: List[str]
    ttps: List[str]  # Tactics, Techniques, and Procedures
    affected_assets: List[str]
    first_seen: datetime
    last_seen: datetime
    confidence: float
    source: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "threat_id": self.threat_id,
            "name": self.name,
            "threat_type": self.threat_type.value,
            "severity": self.severity.value,
            "description": self.description,
            "indicators": self.indicators,
            "ttps": self.ttps,
            "affected_assets": self.affected_assets,
            "first_seen": self.first_seen.isoformat(),
            "last_seen": self.last_seen.isoformat(),
            "confidence": self.confidence,
            "source": self.source,
            "metadata": self.metadata
        }


@dataclass
class SecurityIncident:
    """Represents a security incident."""
    incident_id: str
    title: str
    description: str
    severity: ThreatLevel
    status: str
    attack_type: AttackType
    affected_assets: List[str]
    indicators: List[str]
    timeline: List[Dict[str, Any]]
    response_actions: List[Dict[str, Any]]
    created_at: datetime
    updated_at: datetime
    resolved_at: Optional[datetime] = None
    assigned_to: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "incident_id": self.incident_id,
            "title": self.title,
            "description": self.description,
            "severity": self.severity.value,
            "status": self.status,
            "attack_type": self.attack_type.value,
            "affected_assets": self.affected_assets,
            "indicators": self.indicators,
            "timeline": self.timeline,
            "response_actions": self.response_actions,
            "created_at": self.created_at.isoformat(),
            "updated_at": self.updated_at.isoformat(),
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None,
            "assigned_to": self.assigned_to,
            "metadata": self.metadata
        }


class CybersecurityDataGenerator:
    """Generates realistic cybersecurity sample data."""
    
    def __init__(self):
        self.config = {
            "network_size": 100,
            "threat_count": 50,
            "incident_count": 25,
            "vulnerability_count": 200,
            "time_range_days": 30
        }
        
        # Sample data for realistic generation
        self.sample_data = {
            "operating_systems": [
                "Windows 10", "Windows 11", "Windows Server 2019", "Windows Server 2022",
                "Ubuntu 20.04", "Ubuntu 22.04", "CentOS 7", "CentOS 8", "RHEL 8", "RHEL 9",
                "macOS Monterey", "macOS Ventura", "Debian 11", "Debian 12"
            ],
            "locations": [
                "Headquarters", "Branch Office", "Data Center", "Cloud", "Remote Office",
                "Manufacturing Floor", "R&D Lab", "Executive Suite", "IT Department", "DMZ"
            ],
            "threat_names": [
                "Stealthy Panda", "Silent Cobra", "Lazarus Group", "APT29", "APT28",
                "Carbanak", "FIN7", "Emotet", "TrickBot", "Ryuk", "Conti", "REvil",
                "DarkSide", "BlackMatter", "LockBit", "Maze", "Sodinokibi"
            ],
            "vulnerability_types": [
                "Buffer Overflow", "SQL Injection", "Cross-Site Scripting", "CSRF",
                "Remote Code Execution", "Privilege Escalation", "Information Disclosure",
                "Denial of Service", "Authentication Bypass", "Directory Traversal"
            ],
            "services": [
                {"name": "HTTP", "port": 80, "protocol": "TCP"},
                {"name": "HTTPS", "port": 443, "protocol": "TCP"},
                {"name": "SSH", "port": 22, "protocol": "TCP"},
                {"name": "FTP", "port": 21, "protocol": "TCP"},
                {"name": "SMTP", "port": 25, "protocol": "TCP"},
                {"name": "DNS", "port": 53, "protocol": "UDP"},
                {"name": "DHCP", "port": 67, "protocol": "UDP"},
                {"name": "SNMP", "port": 161, "protocol": "UDP"},
                {"name": "RDP", "port": 3389, "protocol": "TCP"},
                {"name": "MySQL", "port": 3306, "protocol": "TCP"}
            ]
        }
        
    async def generate_network_topology(self, size: Optional[int] = None) -> Dict[str, Any]:
        """Generate a realistic network topology."""
        size = size or self.config["network_size"]
        
        topology = {
            "network_id": str(uuid.uuid4()),
            "name": "Corporate Network",
            "description": "Simulated corporate network topology",
            "created_at": datetime.utcnow().isoformat(),
            "subnets": [],
            "assets": {},
            "connections": [],
            "security_zones": []
        }
        
        # Generate subnets
        subnets = [
            {"name": "DMZ", "cidr": "10.0.1.0/24", "zone": "dmz"},
            {"name": "Internal", "cidr": "10.0.2.0/24", "zone": "internal"},
            {"name": "Servers", "cidr": "10.0.3.0/24", "zone": "servers"},
            {"name": "Management", "cidr": "10.0.4.0/24", "zone": "management"},
            {"name": "Guest", "cidr": "10.0.5.0/24", "zone": "guest"}
        ]\n        \n        topology[\"subnets\"] = subnets\n        \n        # Generate assets\n        asset_count = 0\n        for subnet in subnets:\n            subnet_size = size // len(subnets)\n            network = ipaddress.IPv4Network(subnet[\"cidr\"])\n            \n            for i, ip in enumerate(network.hosts()):\n                if asset_count >= size:\n                    break\n                    \n                asset = await self._generate_network_asset(\n                    str(ip), subnet[\"zone\"], subnet[\"name\"]\n                )\n                topology[\"assets\"][asset.asset_id] = asset.to_dict()\n                asset_count += 1\n                \n                if asset_count >= subnet_size:\n                    break\n                    \n        # Generate connections\n        asset_ids = list(topology[\"assets\"].keys())\n        for _ in range(len(asset_ids) // 2):\n            source = random.choice(asset_ids)\n            target = random.choice(asset_ids)\n            \n            if source != target:\n                connection = {\n                    "connection_id": str(uuid.uuid4()),\n                    "source": source,\n                    "target": target,\n                    "protocol": random.choice(["TCP", "UDP"]),\n                    "port": random.choice([80, 443, 22, 3389, 1433, 3306]),\n                    "status": random.choice(["active", "inactive"]),\n                    "last_seen": (datetime.utcnow() - timedelta(\n                        minutes=random.randint(1, 1440)\n                    )).isoformat()\n                }\n                topology[\"connections\"].append(connection)\n                \n        # Generate security zones\n        topology[\"security_zones\"] = [\n            {\n                "zone_id": str(uuid.uuid4()),\n                "name": "DMZ",\n                "description": "Demilitarized zone for public-facing services",\n                "trust_level": "low",\n                "assets": [aid for aid, asset in topology[\"assets\"].items() \n                          if "dmz" in asset.get("location", "").lower()]\n            },\n            {\n                "zone_id": str(uuid.uuid4()),\n                "name": "Internal",\n                "description": "Internal corporate network",\n                "trust_level": "high",\n                "assets": [aid for aid, asset in topology[\"assets\"].items() \n                          if "internal" in asset.get("location", "").lower()]\n            },\n            {\n                "zone_id": str(uuid.uuid4()),\n                "name": "Servers",\n                "description": "Critical server infrastructure",\n                "trust_level": "critical",\n                "assets": [aid for aid, asset in topology[\"assets\"].items() \n                          if "server" in asset.get("location", "").lower()]\n            }\n        ]\n        \n        return topology\n        \n    async def _generate_network_asset(self, ip_address: str, zone: str, subnet_name: str) -> NetworkAsset:\n        \"\"\"Generate a single network asset.\"\"\"\n        asset_type = self._choose_asset_type_for_zone(zone)\n        \n        asset = NetworkAsset(\n            asset_id=str(uuid.uuid4()),\n            name=f\"{asset_type.value}-{ip_address.split('.')[-1]}\",\n            asset_type=asset_type,\n            ip_address=ip_address,\n            mac_address=self._generate_mac_address(),\n            operating_system=random.choice(self.sample_data[\"operating_systems\"]),\n            version=f\"{random.randint(1, 10)}.{random.randint(0, 9)}\",\n            location=f\"{subnet_name} - {random.choice(self.sample_data['locations'])}\",\n            criticality=self._determine_asset_criticality(asset_type),\n            last_seen=datetime.utcnow() - timedelta(minutes=random.randint(1, 60)),\n            vulnerabilities=[],\n            services=[],\n            metadata={\n                \"zone\": zone,\n                \"subnet\": subnet_name,\n                \"uptime\": random.randint(1, 365),\n                \"patch_level\": random.choice([\"current\", \"outdated\", \"critical\"])\n            }\n        )\n        \n        # Add services based on asset type\n        asset.services = self._generate_asset_services(asset_type)\n        \n        # Add vulnerabilities\n        vuln_count = random.randint(0, 5)\n        for _ in range(vuln_count):\n            asset.vulnerabilities.append(f\"CVE-{random.randint(2020, 2024)}-{random.randint(1000, 9999)}\")\n            \n        return asset\n        \n    def _choose_asset_type_for_zone(self, zone: str) -> AssetType:\n        \"\"\"Choose appropriate asset type for network zone.\"\"\"\n        zone_assets = {\n            \"dmz\": [AssetType.WEB_SERVER, AssetType.EMAIL_SERVER, AssetType.DNS_SERVER, AssetType.LOAD_BALANCER],\n            \"internal\": [AssetType.WORKSTATION, AssetType.SERVER, AssetType.DATABASE],\n            \"servers\": [AssetType.SERVER, AssetType.DATABASE, AssetType.WEB_SERVER, AssetType.EMAIL_SERVER],\n            \"management\": [AssetType.ROUTER, AssetType.SWITCH, AssetType.FIREWALL, AssetType.SERVER],\n            \"guest\": [AssetType.WORKSTATION]\n        }\n        \n        return random.choice(zone_assets.get(zone, list(AssetType)))\n        \n    def _determine_asset_criticality(self, asset_type: AssetType) -> ThreatLevel:\n        \"\"\"Determine asset criticality based on type.\"\"\"\n        criticality_map = {\n            AssetType.DATABASE: ThreatLevel.CRITICAL,\n            AssetType.SERVER: ThreatLevel.HIGH,\n            AssetType.FIREWALL: ThreatLevel.CRITICAL,\n            AssetType.ROUTER: ThreatLevel.HIGH,\n            AssetType.SWITCH: ThreatLevel.MEDIUM,\n            AssetType.WEB_SERVER: ThreatLevel.HIGH,\n            AssetType.EMAIL_SERVER: ThreatLevel.HIGH,\n            AssetType.DNS_SERVER: ThreatLevel.HIGH,\n            AssetType.LOAD_BALANCER: ThreatLevel.MEDIUM,\n            AssetType.WORKSTATION: ThreatLevel.LOW\n        }\n        \n        return criticality_map.get(asset_type, ThreatLevel.MEDIUM)\n        \n    def _generate_asset_services(self, asset_type: AssetType) -> List[Dict[str, Any]]:\n        \"\"\"Generate services for an asset based on its type.\"\"\"\n        service_map = {\n            AssetType.WEB_SERVER: [\"HTTP\", \"HTTPS\", \"SSH\"],\n            AssetType.DATABASE: [\"MySQL\", \"SSH\"],\n            AssetType.EMAIL_SERVER: [\"SMTP\", \"HTTPS\", \"SSH\"],\n            AssetType.DNS_SERVER: [\"DNS\", \"SSH\"],\n            AssetType.WORKSTATION: [\"RDP\", \"SSH\"],\n            AssetType.SERVER: [\"SSH\", \"HTTPS\", \"SNMP\"],\n            AssetType.ROUTER: [\"SSH\", \"SNMP\"],\n            AssetType.SWITCH: [\"SSH\", \"SNMP\"],\n            AssetType.FIREWALL: [\"SSH\", \"HTTPS\"],\n            AssetType.LOAD_BALANCER: [\"HTTPS\", \"SSH\"]\n        }\n        \n        service_names = service_map.get(asset_type, [\"SSH\"])\n        services = []\n        \n        for service_name in service_names:\n            service_info = next(\n                (s for s in self.sample_data[\"services\"] if s[\"name\"] == service_name),\n                {\"name\": service_name, \"port\": 22, \"protocol\": \"TCP\"}\n            )\n            \n            services.append({\n                **service_info,\n                \"status\": random.choice([\"running\", \"stopped\", \"error\"]),\n                \"version\": f\"{random.randint(1, 5)}.{random.randint(0, 9)}\"\n            })\n            \n        return services\n        \n    def _generate_mac_address(self) -> str:\n        \"\"\"Generate a random MAC address.\"\"\"\n        return \":\".join([f\"{random.randint(0, 255):02x}\" for _ in range(6)])\n        \n    async def generate_threat_intelligence(self, count: Optional[int] = None) -> Dict[str, Any]:\n        \"\"\"Generate threat intelligence data.\"\"\"\n        count = count or self.config[\"threat_count\"]\n        \n        threats = {}\n        \n        for _ in range(count):\n            threat = await self._generate_single_threat()\n            threats[threat.threat_id] = threat.to_dict()\n            \n        return {\n            \"threat_intelligence\": threats,\n            \"generated_at\": datetime.utcnow().isoformat(),\n            \"count\": len(threats)\n        }\n        \n    async def _generate_single_threat(self) -> ThreatIntelligence:\n        \"\"\"Generate a single threat intelligence entry.\"\"\"\n        attack_type = random.choice(list(AttackType))\n        threat_name = random.choice(self.sample_data[\"threat_names\"])\n        \n        # Generate realistic indicators based on attack type\n        indicators = self._generate_threat_indicators(attack_type)\n        \n        # Generate TTPs\n        ttps = self._generate_threat_ttps(attack_type)\n        \n        first_seen = datetime.utcnow() - timedelta(\n            days=random.randint(1, self.config[\"time_range_days\"])\n        )\n        last_seen = first_seen + timedelta(\n            days=random.randint(0, (datetime.utcnow() - first_seen).days)\n        )\n        \n        threat = ThreatIntelligence(\n            threat_id=str(uuid.uuid4()),\n            name=f\"{threat_name} - {attack_type.value.title()} Campaign\",\n            threat_type=attack_type,\n            severity=random.choice(list(ThreatLevel)),\n            description=self._generate_threat_description(attack_type, threat_name),\n            indicators=indicators,\n            ttps=ttps,\n            affected_assets=[str(uuid.uuid4()) for _ in range(random.randint(1, 5))],\n            first_seen=first_seen,\n            last_seen=last_seen,\n            confidence=random.uniform(0.6, 1.0),\n            source=random.choice([\"Internal SOC\", \"Threat Intel Feed\", \"OSINT\", \"Partner Share\"]),\n            metadata={\n                \"campaign_id\": str(uuid.uuid4()),\n                \"attribution\": random.choice([\"Nation State\", \"Cybercriminal\", \"Hacktivist\", \"Unknown\"]),\n                \"target_sectors\": random.sample([\"Finance\", \"Healthcare\", \"Government\", \"Technology\", \"Energy\"], \n                                               random.randint(1, 3))\n            }\n        )\n        \n        return threat\n        \n    def _generate_threat_indicators(self, attack_type: AttackType) -> List[str]:\n        \"\"\"Generate realistic threat indicators.\"\"\"\n        indicators = []\n        \n        # IP addresses\n        for _ in range(random.randint(1, 3)):\n            indicators.append(f\"{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}\")\n            \n        # Domain names\n        for _ in range(random.randint(1, 2)):\n            domain = f\"{random.choice(['malicious', 'evil', 'bad', 'fake'])}-{random.choice(['site', 'domain', 'server'])}.{random.choice(['com', 'net', 'org'])}\"\n            indicators.append(domain)\n            \n        # File hashes\n        for _ in range(random.randint(1, 2)):\n            hash_value = ''.join(random.choices('0123456789abcdef', k=64))\n            indicators.append(f\"SHA256:{hash_value}\")\n            \n        # URLs (for web-based attacks)\n        if attack_type in [AttackType.PHISHING, AttackType.XSS, AttackType.SQL_INJECTION]:\n            for _ in range(random.randint(1, 2)):\n                url = f\"http://{random.choice(indicators[:2] if len(indicators) >= 2 else ['malicious.com'])}/malicious-path\"\n                indicators.append(url)\n                \n        return indicators\n        \n    def _generate_threat_ttps(self, attack_type: AttackType) -> List[str]:\n        \"\"\"Generate tactics, techniques, and procedures.\"\"\"\n        ttp_map = {\n            AttackType.MALWARE: [\n                \"T1566.001 - Spearphishing Attachment\",\n                \"T1055 - Process Injection\",\n                \"T1083 - File and Directory Discovery\"\n            ],\n            AttackType.PHISHING: [\n                \"T1566.002 - Spearphishing Link\",\n                \"T1204.002 - Malicious File\",\n                \"T1056.001 - Keylogging\"\n            ],\n            AttackType.RANSOMWARE: [\n                \"T1486 - Data Encrypted for Impact\",\n                \"T1490 - Inhibit System Recovery\",\n                \"T1082 - System Information Discovery\"\n            ],\n            AttackType.APT: [\n                \"T1078 - Valid Accounts\",\n                \"T1021.001 - Remote Desktop Protocol\",\n                \"T1027 - Obfuscated Files or Information\"\n            ]\n        }\n        \n        return ttp_map.get(attack_type, [\n            \"T1059 - Command and Scripting Interpreter\",\n            \"T1082 - System Information Discovery\"\n        ])\n        \n    def _generate_threat_description(self, attack_type: AttackType, threat_name: str) -> str:\n        \"\"\"Generate a realistic threat description.\"\"\"\n        descriptions = {\n            AttackType.MALWARE: f\"{threat_name} is distributing malware through compromised websites and email attachments, targeting corporate networks.\",\n            AttackType.PHISHING: f\"{threat_name} is conducting sophisticated phishing campaigns targeting executives and IT personnel.\",\n            AttackType.RANSOMWARE: f\"{threat_name} is deploying ransomware across multiple organizations, demanding cryptocurrency payments.\",\n            AttackType.APT: f\"{threat_name} is conducting advanced persistent threat operations with focus on data exfiltration.\",\n            AttackType.DDoS: f\"{threat_name} is launching distributed denial of service attacks against critical infrastructure.\"\n        }\n        \n        return descriptions.get(attack_type, f\"{threat_name} is conducting cyber attacks against various targets.\")\n        \n    async def generate_security_incidents(self, count: Optional[int] = None) -> Dict[str, Any]:\n        \"\"\"Generate security incident data.\"\"\"\n        count = count or self.config[\"incident_count\"]\n        \n        incidents = {}\n        \n        for _ in range(count):\n            incident = await self._generate_single_incident()\n            incidents[incident.incident_id] = incident.to_dict()\n            \n        return {\n            \"security_incidents\": incidents,\n            \"generated_at\": datetime.utcnow().isoformat(),\n            \"count\": len(incidents)\n        }\n        \n    async def _generate_single_incident(self) -> SecurityIncident:\n        \"\"\"Generate a single security incident.\"\"\"\n        attack_type = random.choice(list(AttackType))\n        severity = random.choice(list(ThreatLevel))\n        \n        created_at = datetime.utcnow() - timedelta(\n            days=random.randint(0, self.config[\"time_range_days\"])\n        )\n        \n        status = random.choice([\"open\", \"investigating\", \"contained\", \"resolved\", \"closed\"])\n        \n        # Generate timeline\n        timeline = await self._generate_incident_timeline(created_at, status)\n        \n        # Generate response actions\n        response_actions = await self._generate_response_actions(attack_type, severity)\n        \n        incident = SecurityIncident(\n            incident_id=f\"INC-{random.randint(1000, 9999)}\",\n            title=f\"{attack_type.value.title()} Attack Detected\",\n            description=self._generate_incident_description(attack_type, severity),\n            severity=severity,\n            status=status,\n            attack_type=attack_type,\n            affected_assets=[str(uuid.uuid4()) for _ in range(random.randint(1, 10))],\n            indicators=self._generate_threat_indicators(attack_type),\n            timeline=timeline,\n            response_actions=response_actions,\n            created_at=created_at,\n            updated_at=created_at + timedelta(hours=random.randint(1, 48)),\n            resolved_at=created_at + timedelta(days=random.randint(1, 7)) if status == \"resolved\" else None,\n            assigned_to=random.choice([\"SOC Analyst 1\", \"SOC Analyst 2\", \"Senior Analyst\", \"Incident Manager\"]),\n            metadata={\n                \"source\": random.choice([\"SIEM Alert\", \"User Report\", \"Automated Detection\", \"Threat Hunt\"]),\n                \"priority\": random.choice([\"P1\", \"P2\", \"P3\", \"P4\"]),\n                \"category\": random.choice([\"Security Incident\", \"Policy Violation\", \"System Compromise\"])\n            }\n        )\n        \n        return incident\n        \n    async def _generate_incident_timeline(self, start_time: datetime, status: str) -> List[Dict[str, Any]]:\n        \"\"\"Generate incident timeline events.\"\"\"\n        timeline = []\n        current_time = start_time\n        \n        # Initial detection\n        timeline.append({\n            \"timestamp\": current_time.isoformat(),\n            \"event\": \"Incident Detected\",\n            \"description\": \"Suspicious activity detected by monitoring systems\",\n            \"actor\": \"Automated System\"\n        })\n        \n        # Investigation started\n        current_time += timedelta(minutes=random.randint(5, 30))\n        timeline.append({\n            \"timestamp\": current_time.isoformat(),\n            \"event\": \"Investigation Started\",\n            \"description\": \"SOC analyst assigned to investigate the incident\",\n            \"actor\": \"SOC Analyst\"\n        })\n        \n        # Additional events based on status\n        if status in [\"contained\", \"resolved\", \"closed\"]:\n            current_time += timedelta(hours=random.randint(1, 6))\n            timeline.append({\n                \"timestamp\": current_time.isoformat(),\n                \"event\": \"Threat Contained\",\n                \"description\": \"Immediate containment actions implemented\",\n                \"actor\": \"Incident Response Team\"\n            })\n            \n        if status in [\"resolved\", \"closed\"]:\n            current_time += timedelta(hours=random.randint(2, 24))\n            timeline.append({\n                \"timestamp\": current_time.isoformat(),\n                \"event\": \"Incident Resolved\",\n                \"description\": \"All threats neutralized and systems restored\",\n                \"actor\": \"Incident Manager\"\n            })\n            \n        return timeline\n        \n    async def _generate_response_actions(self, attack_type: AttackType, severity: ThreatLevel) -> List[Dict[str, Any]]:\n        \"\"\"Generate incident response actions.\"\"\"\n        actions = []\n        \n        # Common actions\n        actions.extend([\n            {\n                \"action_id\": str(uuid.uuid4()),\n                \"action\": \"Isolate Affected Systems\",\n                \"description\": \"Network isolation of compromised assets\",\n                \"status\": \"completed\",\n                \"assigned_to\": \"Network Team\"\n            },\n            {\n                \"action_id\": str(uuid.uuid4()),\n                \"action\": \"Collect Evidence\",\n                \"description\": \"Forensic data collection from affected systems\",\n                \"status\": \"in_progress\",\n                \"assigned_to\": \"Forensics Team\"\n            }\n        ])\n        \n        # Attack-specific actions\n        if attack_type == AttackType.MALWARE:\n            actions.append({\n                \"action_id\": str(uuid.uuid4()),\n                \"action\": \"Malware Analysis\",\n                \"description\": \"Reverse engineering of malware samples\",\n                \"status\": \"pending\",\n                \"assigned_to\": \"Malware Analyst\"\n            })\n            \n        elif attack_type == AttackType.RANSOMWARE:\n            actions.append({\n                \"action_id\": str(uuid.uuid4()),\n                \"action\": \"Backup Restoration\",\n                \"description\": \"Restore systems from clean backups\",\n                \"status\": \"in_progress\",\n                \"assigned_to\": \"Backup Team\"\n            })\n            \n        # Severity-based actions\n        if severity in [ThreatLevel.HIGH, ThreatLevel.CRITICAL]:\n            actions.append({\n                \"action_id\": str(uuid.uuid4()),\n                \"action\": \"Executive Notification\",\n                \"description\": \"Notify executive leadership of critical incident\",\n                \"status\": \"completed\",\n                \"assigned_to\": \"Incident Manager\"\n            })\n            \n        return actions\n        \n    def _generate_incident_description(self, attack_type: AttackType, severity: ThreatLevel) -> str:\n        \"\"\"Generate incident description.\"\"\"\n        descriptions = {\n            AttackType.MALWARE: \"Malicious software detected on multiple endpoints, potentially compromising sensitive data.\",\n            AttackType.PHISHING: \"Sophisticated phishing campaign targeting employee credentials and sensitive information.\",\n            AttackType.RANSOMWARE: \"Ransomware deployment detected, encrypting critical business systems and data.\",\n            AttackType.DDoS: \"Distributed denial of service attack overwhelming network infrastructure.\",\n            AttackType.APT: \"Advanced persistent threat activity detected with signs of data exfiltration.\"\n        }\n        \n        base_description = descriptions.get(attack_type, \"Security incident requiring immediate attention.\")\n        \n        if severity == ThreatLevel.CRITICAL:\n            return f\"CRITICAL: {base_description} Immediate executive notification required.\"\n        elif severity == ThreatLevel.HIGH:\n            return f\"HIGH PRIORITY: {base_description} Escalation to senior management recommended.\"\n        else:\n            return base_description\n            \n    async def generate_vulnerability_data(self, count: Optional[int] = None) -> Dict[str, Any]:\n        \"\"\"Generate vulnerability assessment data.\"\"\"\n        count = count or self.config[\"vulnerability_count\"]\n        \n        vulnerabilities = {}\n        \n        for _ in range(count):\n            vuln_id = f\"CVE-{random.randint(2020, 2024)}-{random.randint(1000, 9999)}\"\n            \n            vulnerability = {\n                \"vulnerability_id\": vuln_id,\n                \"title\": f\"{random.choice(self.sample_data['vulnerability_types'])} in {random.choice(['Apache', 'Nginx', 'Windows', 'Linux', 'MySQL'])}\",\n                \"description\": \"A vulnerability has been identified that could allow an attacker to compromise system security.\",\n                \"severity\": random.choice(list(ThreatLevel)).value,\n                \"cvss_score\": round(random.uniform(1.0, 10.0), 1),\n                \"affected_assets\": [str(uuid.uuid4()) for _ in range(random.randint(1, 20))],\n                \"discovery_date\": (datetime.utcnow() - timedelta(days=random.randint(1, 365))).isoformat(),\n                \"patch_available\": random.choice([True, False]),\n                \"exploited\": random.choice([True, False]),\n                \"remediation\": random.choice([\n                    \"Apply security patch\",\n                    \"Update to latest version\",\n                    \"Implement workaround\",\n                    \"Replace vulnerable component\"\n                ]),\n                \"references\": [\n                    f\"https://nvd.nist.gov/vuln/detail/{vuln_id}\",\n                    \"https://example.com/security-advisory\"\n                ]\n            }\n            \n            vulnerabilities[vuln_id] = vulnerability\n            \n        return {\n            \"vulnerabilities\": vulnerabilities,\n            \"generated_at\": datetime.utcnow().isoformat(),\n            \"count\": len(vulnerabilities)\n        }\n        \n    async def generate_complete_dataset(self) -> Dict[str, Any]:\n        \"\"\"Generate a complete cybersecurity dataset.\"\"\"\n        logger.info(\"Generating complete cybersecurity dataset...\")\n        \n        dataset = {\n            \"dataset_id\": str(uuid.uuid4()),\n            \"generated_at\": datetime.utcnow().isoformat(),\n            \"description\": \"Complete cybersecurity demonstration dataset\",\n            \"configuration\": self.config\n        }\n        \n        # Generate all data types\n        dataset[\"network_topology\"] = await self.generate_network_topology()\n        dataset[\"threat_intelligence\"] = await self.generate_threat_intelligence()\n        dataset[\"security_incidents\"] = await self.generate_security_incidents()\n        dataset[\"vulnerabilities\"] = await self.generate_vulnerability_data()\n        \n        logger.info(f\"Generated complete dataset with ID: {dataset['dataset_id']}\")\n        \n        return dataset\n\n\n# Global cybersecurity data generator instance\ncybersecurity_generator = CybersecurityDataGenerator()"
c
lass NetworkTopologyGenerator:
    """Generates realistic network topology data."""
    
    def __init__(self):
        self.network_segments = [
            "DMZ", "Internal", "Management", "Guest", "IoT", "Production", "Development"
        ]
        self.device_types = [
            "Server", "Workstation", "Router", "Switch", "Firewall", "Load Balancer",
            "Database", "Web Server", "Application Server", "Storage", "Printer", "IoT Device"
        ]
        
    def generate_network_topology(self, size: str = "medium") -> Dict[str, Any]:
        """Generate a realistic network topology."""
        size_configs = {
            "small": {"subnets": 3, "devices_per_subnet": 15},
            "medium": {"subnets": 5, "devices_per_subnet": 25},
            "large": {"subnets": 8, "devices_per_subnet": 40}
        }
        
        config = size_configs.get(size, size_configs["medium"])
        topology = {
            "topology_id": str(uuid.uuid4()),
            "name": f"Corporate Network - {size.title()}",
            "subnets": [],
            "connections": [],
            "security_zones": [],
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # Generate subnets
        for i in range(config["subnets"]):
            subnet = self._generate_subnet(i, config["devices_per_subnet"])
            topology["subnets"].append(subnet)
            
        # Generate inter-subnet connections
        topology["connections"] = self._generate_connections(topology["subnets"])
        
        # Generate security zones
        topology["security_zones"] = self._generate_security_zones(topology["subnets"])
        
        return topology
        
    def _generate_subnet(self, subnet_index: int, device_count: int) -> Dict[str, Any]:
        """Generate a single subnet with devices."""
        segment = random.choice(self.network_segments)
        base_ip = f"10.{subnet_index + 1}.0"
        
        subnet = {
            "subnet_id": str(uuid.uuid4()),
            "name": f"{segment} Subnet",
            "cidr": f"{base_ip}.0/24",
            "segment": segment,
            "devices": [],
            "vlan_id": 100 + subnet_index,
            "security_level": random.choice(["High", "Medium", "Low"])
        }
        
        # Generate devices in subnet
        for i in range(device_count):
            device = self._generate_device(f"{base_ip}.{i + 10}", subnet["segment"])
            subnet["devices"].append(device)
            
        return subnet
        
    def _generate_device(self, ip_address: str, segment: str) -> Dict[str, Any]:
        """Generate a single network device."""
        device_type = random.choice(self.device_types)
        
        # Adjust device type based on segment
        if segment == "DMZ":
            device_type = random.choice(["Web Server", "Load Balancer", "Firewall"])
        elif segment == "Management":
            device_type = random.choice(["Server", "Workstation", "Switch"])
        elif segment == "IoT":
            device_type = "IoT Device"
            
        device = {
            "device_id": str(uuid.uuid4()),
            "hostname": f"{device_type.lower().replace(' ', '-')}-{random.randint(1000, 9999)}",
            "ip_address": ip_address,
            "device_type": device_type,
            "os": self._generate_os(device_type),
            "status": random.choice(["Online", "Online", "Online", "Offline"]),  # 75% online
            "last_seen": (datetime.utcnow() - timedelta(minutes=random.randint(0, 1440))).isoformat(),
            "ports": self._generate_open_ports(device_type),
            "services": self._generate_services(device_type),
            "vulnerabilities": self._generate_vulnerabilities(),
            "security_score": random.uniform(6.0, 9.5),
            "patch_level": random.choice(["Current", "1 Month Behind", "3 Months Behind", "Critical"])
        }
        
        return device
        
    def _generate_os(self, device_type: str) -> str:
        """Generate OS based on device type."""
        os_mapping = {
            "Server": random.choice(["Windows Server 2019", "Windows Server 2022", "Ubuntu 20.04", "CentOS 8", "RHEL 8"]),
            "Workstation": random.choice(["Windows 10", "Windows 11", "macOS Monterey", "Ubuntu 22.04"]),
            "Router": random.choice(["Cisco IOS 15.x", "Juniper JUNOS", "pfSense"]),
            "Switch": random.choice(["Cisco IOS", "HP ProCurve", "Arista EOS"]),
            "Firewall": random.choice(["pfSense", "Fortinet FortiOS", "Palo Alto PAN-OS"]),
            "IoT Device": random.choice(["Embedded Linux", "FreeRTOS", "Custom Firmware"])
        }
        
        return os_mapping.get(device_type, "Unknown OS")
        
    def _generate_open_ports(self, device_type: str) -> List[int]:
        """Generate realistic open ports for device type."""
        common_ports = {
            "Server": [22, 80, 443, 3389, 5985, 5986],
            "Workstation": [135, 139, 445, 3389],
            "Web Server": [80, 443, 8080, 8443],
            "Database": [1433, 3306, 5432, 1521, 27017],
            "Router": [22, 23, 80, 443, 161],
            "Switch": [22, 23, 80, 443, 161],
            "Firewall": [22, 80, 443, 161],
            "IoT Device": [80, 443, 8080, 23]
        }
        
        base_ports = common_ports.get(device_type, [22, 80, 443])
        # Add some random additional ports
        additional_ports = random.sample(range(1024, 65535), random.randint(0, 3))
        
        return sorted(list(set(base_ports + additional_ports)))
        
    def _generate_services(self, device_type: str) -> List[str]:
        """Generate services running on device."""
        service_mapping = {
            "Server": ["IIS", "Apache", "SSH", "RDP", "DNS", "DHCP"],
            "Workstation": ["Windows Services", "Antivirus", "Office Suite"],
            "Web Server": ["Apache", "Nginx", "IIS", "Tomcat"],
            "Database": ["MySQL", "PostgreSQL", "SQL Server", "MongoDB", "Oracle"],
            "Router": ["OSPF", "BGP", "SNMP", "SSH"],
            "Switch": ["STP", "VLAN", "SNMP", "SSH"],
            "Firewall": ["iptables", "pfSense", "FortiGate"],
            "IoT Device": ["HTTP Server", "MQTT", "CoAP"]
        }
        
        services = service_mapping.get(device_type, ["Unknown Service"])
        return random.sample(services, min(len(services), random.randint(1, 4)))
        
    def _generate_vulnerabilities(self) -> List[Dict[str, Any]]:
        """Generate realistic vulnerabilities for device."""
        vulnerability_templates = [
            {"cve": "CVE-2021-44228", "severity": "Critical", "description": "Log4j Remote Code Execution"},
            {"cve": "CVE-2021-34527", "severity": "Critical", "description": "Windows Print Spooler RCE"},
            {"cve": "CVE-2021-26855", "severity": "Critical", "description": "Microsoft Exchange Server RCE"},
            {"cve": "CVE-2020-1472", "severity": "Critical", "description": "Netlogon Elevation of Privilege"},
            {"cve": "CVE-2019-0708", "severity": "Critical", "description": "BlueKeep RDP RCE"},
            {"cve": "CVE-2021-40444", "severity": "High", "description": "Microsoft Office RCE"},
            {"cve": "CVE-2021-31207", "severity": "High", "description": "Microsoft Exchange Server Elevation"},
            {"cve": "CVE-2020-0796", "severity": "High", "description": "SMBv3 Compression RCE"}
        ]
        
        # 30% chance of having vulnerabilities
        if random.random() < 0.3:
            num_vulns = random.randint(1, 3)
            return random.sample(vulnerability_templates, min(num_vulns, len(vulnerability_templates)))
        
        return []
        
    def _generate_connections(self, subnets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate inter-subnet connections."""
        connections = []
        
        for i, subnet1 in enumerate(subnets):
            for j, subnet2 in enumerate(subnets[i+1:], i+1):
                # 70% chance of connection between subnets
                if random.random() < 0.7:
                    connection = {
                        "connection_id": str(uuid.uuid4()),
                        "source_subnet": subnet1["subnet_id"],
                        "destination_subnet": subnet2["subnet_id"],
                        "connection_type": random.choice(["Routed", "Switched", "VPN", "Firewall"]),
                        "bandwidth": random.choice(["1Gbps", "10Gbps", "100Mbps", "1Gbps"]),
                        "latency_ms": random.uniform(0.1, 5.0),
                        "security_rules": self._generate_security_rules()
                    }
                    connections.append(connection)
                    
        return connections
        
    def _generate_security_rules(self) -> List[Dict[str, Any]]:
        """Generate security rules for connections."""
        rules = []
        
        for _ in range(random.randint(2, 5)):
            rule = {
                "rule_id": str(uuid.uuid4()),
                "action": random.choice(["Allow", "Deny", "Log"]),
                "protocol": random.choice(["TCP", "UDP", "ICMP", "Any"]),
                "source_port": random.choice(["Any", "80", "443", "22", "3389"]),
                "destination_port": random.choice(["Any", "80", "443", "22", "3389"]),
                "priority": random.randint(1, 100)
            }
            rules.append(rule)
            
        return rules
        
    def _generate_security_zones(self, subnets: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate security zones."""
        zones = []
        
        zone_types = ["Trusted", "Untrusted", "DMZ", "Management", "Guest"]
        
        for zone_type in zone_types:
            # Find subnets that belong to this zone
            zone_subnets = [s for s in subnets if s["segment"].lower() in zone_type.lower() or 
                           (zone_type == "Trusted" and s["segment"] in ["Internal", "Production"])]
            
            if zone_subnets:
                zone = {
                    "zone_id": str(uuid.uuid4()),
                    "name": f"{zone_type} Zone",
                    "zone_type": zone_type,
                    "security_level": self._get_zone_security_level(zone_type),
                    "subnets": [s["subnet_id"] for s in zone_subnets],
                    "policies": self._generate_zone_policies(zone_type)
                }
                zones.append(zone)
                
        return zones
        
    def _get_zone_security_level(self, zone_type: str) -> str:
        """Get security level for zone type."""
        level_mapping = {
            "Trusted": "High",
            "Untrusted": "Low", 
            "DMZ": "Medium",
            "Management": "High",
            "Guest": "Low"
        }
        return level_mapping.get(zone_type, "Medium")
        
    def _generate_zone_policies(self, zone_type: str) -> List[str]:
        """Generate security policies for zone."""
        policy_templates = {
            "Trusted": ["Allow internal communication", "Require authentication", "Monitor all traffic"],
            "Untrusted": ["Deny by default", "Log all connections", "Deep packet inspection"],
            "DMZ": ["Allow web traffic", "Restrict internal access", "Monitor for threats"],
            "Management": ["Require VPN", "Multi-factor authentication", "Audit all access"],
            "Guest": ["Internet only", "No internal access", "Time-limited sessions"]
        }
        
        return policy_templates.get(zone_type, ["Default security policy"])


class ThreatIntelligenceGenerator:
    """Generates realistic threat intelligence data."""
    
    def __init__(self):
        self.threat_actors = [
            "APT1", "APT28", "APT29", "Lazarus Group", "FIN7", "Carbanak", "Equation Group",
            "Turla", "Fancy Bear", "Cozy Bear", "Dark Halo", "UNC2452", "HAFNIUM"
        ]
        
        self.attack_vectors = [
            "Spear Phishing", "Watering Hole", "Supply Chain", "Zero-Day Exploit",
            "Credential Stuffing", "SQL Injection", "Remote Code Execution", "Privilege Escalation"
        ]
        
        self.malware_families = [
            "Emotet", "TrickBot", "Ryuk", "Conti", "Maze", "Sodinokibi", "Dridex",
            "IcedID", "Qbot", "BazarLoader", "Cobalt Strike", "Mimikatz"
        ]
        
    def generate_threat_intelligence_feed(self, days_back: int = 30) -> List[Dict[str, Any]]:
        """Generate threat intelligence indicators."""
        indicators = []
        
        # Generate indicators for the past N days
        for day in range(days_back):
            date = datetime.utcnow() - timedelta(days=day)
            
            # Generate 5-15 indicators per day
            daily_indicators = random.randint(5, 15)
            
            for _ in range(daily_indicators):
                indicator = self._generate_threat_indicator(date)
                indicators.append(indicator)
                
        return sorted(indicators, key=lambda x: x["first_seen"], reverse=True)
        
    def _generate_threat_indicator(self, date: datetime) -> Dict[str, Any]:
        """Generate a single threat indicator."""
        indicator_types = ["IP", "Domain", "URL", "File Hash", "Email", "Registry Key"]
        indicator_type = random.choice(indicator_types)
        
        indicator = {
            "indicator_id": str(uuid.uuid4()),
            "type": indicator_type,
            "value": self._generate_indicator_value(indicator_type),
            "threat_actor": random.choice(self.threat_actors) if random.random() < 0.6 else None,
            "malware_family": random.choice(self.malware_families) if random.random() < 0.7 else None,
            "attack_vector": random.choice(self.attack_vectors),
            "confidence": random.uniform(0.6, 0.95),
            "severity": random.choice(["Low", "Medium", "High", "Critical"]),
            "first_seen": date.isoformat(),
            "last_seen": (date + timedelta(hours=random.randint(1, 48))).isoformat(),
            "tags": self._generate_threat_tags(),
            "description": self._generate_threat_description(indicator_type),
            "sources": random.sample(["VirusTotal", "AlienVault", "ThreatConnect", "MISP", "Internal"], 
                                   random.randint(1, 3))
        }
        
        return indicator
        
    def _generate_indicator_value(self, indicator_type: str) -> str:
        """Generate realistic indicator values."""
        if indicator_type == "IP":
            return f"{random.randint(1, 223)}.{random.randint(0, 255)}.{random.randint(0, 255)}.{random.randint(1, 254)}"
        elif indicator_type == "Domain":
            domains = ["malicious-site.com", "phishing-bank.net", "fake-update.org", 
                      "suspicious-download.info", "threat-actor.biz"]
            return random.choice(domains)
        elif indicator_type == "URL":
            return f"http://{self._generate_indicator_value('Domain')}/malicious/path"
        elif indicator_type == "File Hash":
            return ''.join(random.choices('abcdef0123456789', k=64))  # SHA256
        elif indicator_type == "Email":
            return f"attacker{random.randint(1, 999)}@malicious-domain.com"
        elif indicator_type == "Registry Key":
            keys = [
                "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\Malware",
                "HKCU\\Software\\Classes\\exefile\\shell\\open\\command",
                "HKLM\\SYSTEM\\CurrentControlSet\\Services\\MaliciousService"
            ]
            return random.choice(keys)
        
        return "Unknown Indicator"
        
    def _generate_threat_tags(self) -> List[str]:
        """Generate threat tags."""
        tag_pool = [
            "malware", "phishing", "c2", "exfiltration", "ransomware", "apt", "trojan",
            "backdoor", "keylogger", "botnet", "cryptocurrency", "banking", "targeted"
        ]
        
        return random.sample(tag_pool, random.randint(1, 4))
        
    def _generate_threat_description(self, indicator_type: str) -> str:
        """Generate threat description."""
        descriptions = {
            "IP": "Malicious IP address associated with command and control infrastructure",
            "Domain": "Suspicious domain used for phishing or malware distribution",
            "URL": "Malicious URL hosting exploit kit or malware payload",
            "File Hash": "Hash of known malicious file or malware sample",
            "Email": "Email address used in phishing or social engineering campaigns",
            "Registry Key": "Registry modification associated with malware persistence"
        }
        
        return descriptions.get(indicator_type, "Suspicious indicator detected in threat intelligence")


class SecurityEventGenerator:
    """Generates realistic security events and logs."""
    
    def __init__(self):
        self.event_types = [
            "Authentication Failure", "Privilege Escalation", "Malware Detection",
            "Network Intrusion", "Data Exfiltration", "Suspicious Process", "File Modification",
            "Registry Change", "Network Connection", "DNS Query", "HTTP Request"
        ]
        
        self.log_sources = [
            "Windows Event Log", "Syslog", "Firewall", "IDS/IPS", "Antivirus",
            "Web Server", "Database", "Network Device", "Endpoint Agent", "SIEM"
        ]
        
    def generate_security_events(self, hours_back: int = 24, events_per_hour: int = 50) -> List[Dict[str, Any]]:
        """Generate realistic security events."""
        events = []
        
        for hour in range(hours_back):
            hour_start = datetime.utcnow() - timedelta(hours=hour)
            
            # Generate events for this hour
            for _ in range(random.randint(events_per_hour // 2, events_per_hour * 2)):
                event_time = hour_start + timedelta(minutes=random.randint(0, 59),
                                                  seconds=random.randint(0, 59))
                event = self._generate_security_event(event_time)
                events.append(event)
                
        return sorted(events, key=lambda x: x["timestamp"], reverse=True)
        
    def _generate_security_event(self, timestamp: datetime) -> Dict[str, Any]:
        """Generate a single security event."""
        event_type = random.choice(self.event_types)
        
        event = {
            "event_id": str(uuid.uuid4()),
            "timestamp": timestamp.isoformat(),
            "event_type": event_type,
            "severity": self._get_event_severity(event_type),
            "source": random.choice(self.log_sources),
            "source_ip": f"{random.randint(10, 192)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 254)}",
            "destination_ip": f"{random.randint(10, 192)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 254)}",
            "user": self._generate_username(),
            "process": self._generate_process_name(event_type),
            "command_line": self._generate_command_line(event_type),
            "file_path": self._generate_file_path(event_type),
            "registry_key": self._generate_registry_key() if "Registry" in event_type else None,
            "network_protocol": random.choice(["TCP", "UDP", "ICMP", "HTTP", "HTTPS"]),
            "port": random.randint(1, 65535),
            "bytes_transferred": random.randint(100, 1000000) if "Network" in event_type else None,
            "description": self._generate_event_description(event_type),
            "raw_log": self._generate_raw_log(event_type),
            "tags": self._generate_event_tags(event_type)
        }
        
        return event
        
    def _get_event_severity(self, event_type: str) -> str:
        """Get severity based on event type."""
        severity_mapping = {
            "Authentication Failure": random.choice(["Low", "Medium"]),
            "Privilege Escalation": random.choice(["High", "Critical"]),
            "Malware Detection": random.choice(["High", "Critical"]),
            "Network Intrusion": random.choice(["Medium", "High"]),
            "Data Exfiltration": "Critical",
            "Suspicious Process": random.choice(["Medium", "High"]),
            "File Modification": random.choice(["Low", "Medium"]),
            "Registry Change": random.choice(["Medium", "High"]),
            "Network Connection": "Low",
            "DNS Query": "Low",
            "HTTP Request": "Low"
        }
        
        return severity_mapping.get(event_type, "Medium")
        
    def _generate_username(self) -> str:
        """Generate realistic username."""
        usernames = [
            "admin", "administrator", "user", "guest", "service", "system",
            "john.doe", "jane.smith", "bob.wilson", "alice.johnson", "mike.brown"
        ]
        return random.choice(usernames)
        
    def _generate_process_name(self, event_type: str) -> str:
        """Generate process name based on event type."""
        process_mapping = {
            "Authentication Failure": random.choice(["winlogon.exe", "lsass.exe", "sshd"]),
            "Privilege Escalation": random.choice(["cmd.exe", "powershell.exe", "sudo"]),
            "Malware Detection": random.choice(["malware.exe", "trojan.exe", "suspicious.exe"]),
            "Suspicious Process": random.choice(["cmd.exe", "powershell.exe", "wscript.exe", "cscript.exe"]),
            "File Modification": random.choice(["explorer.exe", "notepad.exe", "word.exe"]),
            "Registry Change": random.choice(["regedit.exe", "reg.exe", "powershell.exe"])
        }
        
        return process_mapping.get(event_type, "unknown.exe")
        
    def _generate_command_line(self, event_type: str) -> str:
        """Generate command line based on event type."""
        if event_type == "Privilege Escalation":
            return random.choice([
                "powershell.exe -ExecutionPolicy Bypass -Command \"whoami /priv\"",
                "cmd.exe /c net user administrator password123 /add",
                "sudo su -"
            ])
        elif event_type == "Suspicious Process":
            return random.choice([
                "powershell.exe -EncodedCommand <base64>",
                "cmd.exe /c ping -n 1 malicious-site.com",
                "wscript.exe malicious-script.vbs"
            ])
        
        return f"{self._generate_process_name(event_type)} [arguments]"
        
    def _generate_file_path(self, event_type: str) -> str:
        """Generate file path based on event type."""
        if "Windows" in random.choice(self.log_sources):
            paths = [
                "C:\\Windows\\System32\\malware.exe",
                "C:\\Users\\Public\\suspicious.exe",
                "C:\\Temp\\downloaded_file.exe",
                "C:\\Windows\\Temp\\temp_file.tmp"
            ]
        else:
            paths = [
                "/tmp/malware",
                "/var/log/suspicious.log",
                "/home/user/downloaded_file",
                "/usr/bin/suspicious_binary"
            ]
        
        return random.choice(paths)
        
    def _generate_registry_key(self) -> str:
        """Generate registry key."""
        keys = [
            "HKLM\\SOFTWARE\\Microsoft\\Windows\\CurrentVersion\\Run\\Malware",
            "HKCU\\Software\\Microsoft\\Windows\\CurrentVersion\\Run\\Startup",
            "HKLM\\SYSTEM\\CurrentControlSet\\Services\\MaliciousService"
        ]
        return random.choice(keys)
        
    def _generate_event_description(self, event_type: str) -> str:
        """Generate event description."""
        descriptions = {
            "Authentication Failure": "Failed login attempt detected",
            "Privilege Escalation": "Attempt to escalate privileges detected",
            "Malware Detection": "Malicious software detected and quarantined",
            "Network Intrusion": "Suspicious network activity detected",
            "Data Exfiltration": "Large data transfer to external destination",
            "Suspicious Process": "Suspicious process execution detected",
            "File Modification": "Critical system file modified",
            "Registry Change": "Registry modification detected",
            "Network Connection": "Network connection established",
            "DNS Query": "DNS query performed",
            "HTTP Request": "HTTP request made"
        }
        
        return descriptions.get(event_type, "Security event detected")
        
    def _generate_raw_log(self, event_type: str) -> str:
        """Generate raw log entry."""
        timestamp = datetime.utcnow().strftime("%Y-%m-%d %H:%M:%S")
        
        if event_type == "Authentication Failure":
            return f"{timestamp} [ERROR] Authentication failed for user {self._generate_username()}"
        elif event_type == "Malware Detection":
            return f"{timestamp} [ALERT] Malware detected: {self._generate_file_path(event_type)}"
        
        return f"{timestamp} [INFO] {event_type} event occurred"
        
    def _generate_event_tags(self, event_type: str) -> List[str]:
        """Generate event tags."""
        tag_mapping = {
            "Authentication Failure": ["authentication", "failure", "security"],
            "Privilege Escalation": ["privilege", "escalation", "security", "critical"],
            "Malware Detection": ["malware", "detection", "security", "threat"],
            "Network Intrusion": ["network", "intrusion", "security", "threat"],
            "Data Exfiltration": ["data", "exfiltration", "security", "critical"],
            "Suspicious Process": ["process", "suspicious", "security"],
            "File Modification": ["file", "modification", "system"],
            "Registry Change": ["registry", "modification", "system"],
            "Network Connection": ["network", "connection"],
            "DNS Query": ["dns", "query", "network"],
            "HTTP Request": ["http", "request", "network"]
        }
        
        return tag_mapping.get(event_type, ["security", "event"])


# Global cybersecurity data generator instance
cybersecurity_data_generator = CybersecurityDataGenerator()