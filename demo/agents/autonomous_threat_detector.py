"""
Autonomous Threat Detection Agent for ACSO Phase 5 Agentic Demonstrations.

This module implements an enhanced threat detection agent with real-time analysis,
automatic escalation, and threat intelligence correlation capabilities.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, field
import json
import logging

logger = logging.getLogger(__name__)


class ThreatSeverity(str, Enum):
    """Threat severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class DetectionMethod(str, Enum):
    """Threat detection methods."""
    SIGNATURE_BASED = "signature_based"
    BEHAVIORAL_ANALYSIS = "behavioral_analysis"
    ANOMALY_DETECTION = "anomaly_detection"
    MACHINE_LEARNING = "machine_learning"
    THREAT_INTELLIGENCE = "threat_intelligence"
    HEURISTIC_ANALYSIS = "heuristic_analysis"


class ThreatCategory(str, Enum):
    """Categories of threats."""
    MALWARE = "malware"
    PHISHING = "phishing"
    RANSOMWARE = "ransomware"
    APT = "apt"
    INSIDER_THREAT = "insider_threat"
    DATA_EXFILTRATION = "data_exfiltration"
    LATERAL_MOVEMENT = "lateral_movement"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    COMMAND_CONTROL = "command_control"
    RECONNAISSANCE = "reconnaissance"


@dataclass
class ThreatDetection:
    """Represents a threat detection event."""
    detection_id: str
    timestamp: datetime
    threat_name: str
    category: ThreatCategory
    severity: ThreatSeverity
    confidence: float
    detection_method: DetectionMethod
    affected_assets: List[str]
    indicators: List[str]
    description: str
    remediation_steps: List[str]
    escalated: bool = False
    false_positive_probability: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "detection_id": self.detection_id,
            "timestamp": self.timestamp.isoformat(),
            "threat_name": self.threat_name,
            "category": self.category.value,
            "severity": self.severity.value,
            "confidence": self.confidence,
            "detection_method": self.detection_method.value,
            "affected_assets": self.affected_assets,
            "indicators": self.indicators,
            "description": self.description,
            "remediation_steps": self.remediation_steps,
            "escalated": self.escalated,
            "false_positive_probability": self.false_positive_probability,
            "metadata": self.metadata
        }


@dataclass
class ThreatAnalysis:
    """Represents threat analysis results."""
    analysis_id: str
    detection_id: str
    analysis_timestamp: datetime
    threat_score: float
    risk_assessment: str
    attack_chain: List[str]
    potential_impact: str
    recommended_actions: List[str]
    correlation_results: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "analysis_id": self.analysis_id,
            "detection_id": self.detection_id,
            "analysis_timestamp": self.analysis_timestamp.isoformat(),
            "threat_score": self.threat_score,
            "risk_assessment": self.risk_assessment,
            "attack_chain": self.attack_chain,
            "potential_impact": self.potential_impact,
            "recommended_actions": self.recommended_actions,
            "correlation_results": self.correlation_results,
            "metadata": self.metadata
        }


class AutonomousThreatDetector:
    """Enhanced threat detection agent with autonomous capabilities."""
    
    def __init__(self):
        self.agent_id = str(uuid.uuid4())
        self.agent_name = "Autonomous Threat Detector"
        self.version = "2.0.0"
        
        # Detection state
        self.active_detections: Dict[str, ThreatDetection] = {}
        self.threat_analyses: Dict[str, ThreatAnalysis] = {}
        self.detection_history: List[ThreatDetection] = []
        
        # Configuration
        self.config = {
            "detection_threshold": 0.7,
            "escalation_threshold": 0.8,
            "auto_escalation_enabled": True,
            "correlation_window_hours": 24,
            "max_concurrent_analyses": 10,
            "false_positive_threshold": 0.3
        }
        
        # Threat intelligence database
        self.threat_intelligence = self._initialize_threat_intelligence()
        
        # Detection rules
        self.detection_rules = self._initialize_detection_rules()
        
        # Background tasks
        self._monitoring_task: Optional[asyncio.Task] = None
        self._analysis_task: Optional[asyncio.Task] = None
        
    def _initialize_threat_intelligence(self) -> Dict[str, Any]:
        """Initialize threat intelligence database."""
        return {
            "known_malware": {
                "emotet": {
                    "family": "banking_trojan",
                    "indicators": ["emotet.exe", "powershell -enc", "wscript.exe"],
                    "severity": ThreatSeverity.HIGH,
                    "ttps": ["T1566.001", "T1059.001", "T1055"]
                },
                "trickbot": {
                    "family": "banking_trojan",
                    "indicators": ["trickbot.dll", "svchost.exe", "rundll32.exe"],
                    "severity": ThreatSeverity.HIGH,
                    "ttps": ["T1055", "T1082", "T1083"]
                },
                "ryuk": {
                    "family": "ransomware",
                    "indicators": ["ryuk.exe", ".ryk", "RyukReadMe.txt"],
                    "severity": ThreatSeverity.CRITICAL,
                    "ttps": ["T1486", "T1490", "T1083"]
                }
            },
            "apt_groups": {
                "apt28": {
                    "origin": "russia",
                    "targets": ["government", "military", "aerospace"],
                    "tools": ["x-agent", "seadaddy", "chopstick"],
                    "ttps": ["T1566.001", "T1055", "T1027"]
                },
                "apt29": {
                    "origin": "russia",
                    "targets": ["government", "healthcare", "energy"],
                    "tools": ["cobalt_strike", "powerduke", "hammertoss"],
                    "ttps": ["T1566.002", "T1059.001", "T1071.001"]
                }
            },
            "iocs": {
                "malicious_domains": [
                    "evil-domain.com", "malware-c2.net", "phishing-site.org"
                ],
                "malicious_ips": [
                    "192.168.1.100", "10.0.0.50", "172.16.0.25"
                ],
                "malicious_hashes": [
                    "d41d8cd98f00b204e9800998ecf8427e",
                    "5d41402abc4b2a76b9719d911017c592"
                ]
            }
        }
        
    def _initialize_detection_rules(self) -> List[Dict[str, Any]]:
        """Initialize detection rules."""
        return [
            {
                "rule_id": "suspicious_powershell",
                "name": "Suspicious PowerShell Activity",
                "category": ThreatCategory.MALWARE,
                "severity": ThreatSeverity.MEDIUM,
                "method": DetectionMethod.BEHAVIORAL_ANALYSIS,
                "indicators": ["powershell -enc", "powershell -nop", "invoke-expression"],
                "confidence": 0.8
            },
            {
                "rule_id": "lateral_movement",
                "name": "Lateral Movement Detection",
                "category": ThreatCategory.LATERAL_MOVEMENT,
                "severity": ThreatSeverity.HIGH,
                "method": DetectionMethod.ANOMALY_DETECTION,
                "indicators": ["psexec", "wmic", "remote_logon"],
                "confidence": 0.85
            },
            {
                "rule_id": "data_exfiltration",
                "name": "Data Exfiltration Attempt",
                "category": ThreatCategory.DATA_EXFILTRATION,
                "severity": ThreatSeverity.CRITICAL,
                "method": DetectionMethod.MACHINE_LEARNING,
                "indicators": ["large_upload", "encrypted_traffic", "compression"],
                "confidence": 0.9
            },
            {
                "rule_id": "privilege_escalation",
                "name": "Privilege Escalation",
                "category": ThreatCategory.PRIVILEGE_ESCALATION,
                "severity": ThreatSeverity.HIGH,
                "method": DetectionMethod.HEURISTIC_ANALYSIS,
                "indicators": ["uac_bypass", "token_manipulation", "process_injection"],
                "confidence": 0.75
            }
        ]
        
    async def start_monitoring(self) -> bool:
        """Start autonomous threat monitoring."""
        try:
            self._monitoring_task = asyncio.create_task(self._monitoring_loop())
            self._analysis_task = asyncio.create_task(self._analysis_loop())
            
            logger.info(f"Autonomous threat detector {self.agent_id} started monitoring")
            return True
            
        except Exception as e:
            logger.error(f"Failed to start threat monitoring: {e}")
            return False
            
    async def stop_monitoring(self):
        """Stop autonomous threat monitoring."""
        if self._monitoring_task:
            self._monitoring_task.cancel()
            try:
                await self._monitoring_task
            except asyncio.CancelledError:
                pass
                
        if self._analysis_task:
            self._analysis_task.cancel()
            try:
                await self._analysis_task
            except asyncio.CancelledError:
                pass
                
        logger.info(f"Autonomous threat detector {self.agent_id} stopped monitoring")
        
    async def detect_threats(self, data_sources: Dict[str, Any]) -> List[ThreatDetection]:
        """Detect threats from various data sources."""
        detections = []
        
        try:
            # Process different data sources
            if "network_traffic" in data_sources:
                network_detections = await self._analyze_network_traffic(data_sources["network_traffic"])
                detections.extend(network_detections)
                
            if "endpoint_logs" in data_sources:
                endpoint_detections = await self._analyze_endpoint_logs(data_sources["endpoint_logs"])
                detections.extend(endpoint_detections)
                
            if "email_data" in data_sources:
                email_detections = await self._analyze_email_data(data_sources["email_data"])
                detections.extend(email_detections)
                
            # Store active detections
            for detection in detections:
                self.active_detections[detection.detection_id] = detection
                self.detection_history.append(detection)
                
                # Auto-escalate if needed
                if (detection.confidence >= self.config["escalation_threshold"] and 
                    self.config["auto_escalation_enabled"]):
                    await self._escalate_detection(detection)
                    
            return detections
            
        except Exception as e:
            logger.error(f"Error in threat detection: {e}")
            return []
            
    async def _analyze_network_traffic(self, traffic_data: Dict[str, Any]) -> List[ThreatDetection]:
        """Analyze network traffic for threats."""
        detections = []
        
        # Simulate network traffic analysis
        suspicious_patterns = [
            "dns_tunneling", "beaconing", "large_uploads", "suspicious_domains",
            "port_scanning", "lateral_movement", "c2_communication"
        ]
        
        for pattern in suspicious_patterns:
            if random.random() < 0.3:  # 30% chance of detection
                detection = await self._create_network_detection(pattern, traffic_data)
                if detection:
                    detections.append(detection)
                    
        return detections
        
    async def _analyze_endpoint_logs(self, log_data: Dict[str, Any]) -> List[ThreatDetection]:
        """Analyze endpoint logs for threats."""
        detections = []
        
        # Apply detection rules
        for rule in self.detection_rules:
            if await self._rule_matches(rule, log_data):
                detection = await self._create_rule_detection(rule, log_data)
                if detection:
                    detections.append(detection)
                    
        return detections
        
    async def _analyze_email_data(self, email_data: Dict[str, Any]) -> List[ThreatDetection]:
        """Analyze email data for threats."""
        detections = []
        
        # Check for phishing indicators
        phishing_indicators = [
            "suspicious_sender", "malicious_attachment", "phishing_url",
            "social_engineering", "credential_harvesting"
        ]
        
        for indicator in phishing_indicators:
            if random.random() < 0.2:  # 20% chance of detection
                detection = await self._create_email_detection(indicator, email_data)
                if detection:
                    detections.append(detection)
                    
        return detections
        
    async def _create_network_detection(self, pattern: str, data: Dict[str, Any]) -> Optional[ThreatDetection]:
        """Create a network-based threat detection."""
        pattern_configs = {
            "dns_tunneling": {
                "name": "DNS Tunneling Detected",
                "category": ThreatCategory.COMMAND_CONTROL,
                "severity": ThreatSeverity.HIGH,
                "confidence": 0.85
            },
            "beaconing": {
                "name": "C2 Beaconing Activity",
                "category": ThreatCategory.COMMAND_CONTROL,
                "severity": ThreatSeverity.HIGH,
                "confidence": 0.8
            },
            "large_uploads": {
                "name": "Suspicious Data Upload",
                "category": ThreatCategory.DATA_EXFILTRATION,
                "severity": ThreatSeverity.CRITICAL,
                "confidence": 0.75
            }
        }
        
        config = pattern_configs.get(pattern)
        if not config:
            return None
            
        detection = ThreatDetection(
            detection_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            threat_name=config["name"],
            category=config["category"],
            severity=config["severity"],
            confidence=config["confidence"],
            detection_method=DetectionMethod.ANOMALY_DETECTION,
            affected_assets=[f"asset_{random.randint(1, 100)}"],
            indicators=[pattern, "network_anomaly", "traffic_analysis"],
            description=f"Detected {pattern} indicating potential threat activity",
            remediation_steps=self._get_remediation_steps(config["category"]),
            metadata={
                "source": "network_monitor",
                "pattern": pattern,
                "data_size": random.randint(1000, 100000)
            }
        )
        
        return detection
        
    async def _create_rule_detection(self, rule: Dict[str, Any], data: Dict[str, Any]) -> Optional[ThreatDetection]:
        """Create a rule-based threat detection."""
        detection = ThreatDetection(
            detection_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            threat_name=rule["name"],
            category=rule["category"],
            severity=rule["severity"],
            confidence=rule["confidence"],
            detection_method=rule["method"],
            affected_assets=[f"endpoint_{random.randint(1, 50)}"],
            indicators=rule["indicators"],
            description=f"Rule-based detection: {rule['name']}",
            remediation_steps=self._get_remediation_steps(rule["category"]),
            metadata={
                "rule_id": rule["rule_id"],
                "source": "endpoint_detection",
                "process_id": random.randint(1000, 9999)
            }
        )
        
        return detection
        
    async def _create_email_detection(self, indicator: str, data: Dict[str, Any]) -> Optional[ThreatDetection]:
        """Create an email-based threat detection."""
        indicator_configs = {
            "suspicious_sender": {
                "name": "Suspicious Email Sender",
                "severity": ThreatSeverity.MEDIUM,
                "confidence": 0.7
            },
            "malicious_attachment": {
                "name": "Malicious Email Attachment",
                "severity": ThreatSeverity.HIGH,
                "confidence": 0.9
            },
            "phishing_url": {
                "name": "Phishing URL Detected",
                "severity": ThreatSeverity.HIGH,
                "confidence": 0.85
            }
        }
        
        config = indicator_configs.get(indicator)
        if not config:
            return None
            
        detection = ThreatDetection(
            detection_id=str(uuid.uuid4()),
            timestamp=datetime.utcnow(),
            threat_name=config["name"],
            category=ThreatCategory.PHISHING,
            severity=config["severity"],
            confidence=config["confidence"],
            detection_method=DetectionMethod.SIGNATURE_BASED,
            affected_assets=[f"user_{random.randint(1, 100)}"],
            indicators=[indicator, "email_analysis", "content_inspection"],
            description=f"Email threat detected: {config['name']}",
            remediation_steps=self._get_remediation_steps(ThreatCategory.PHISHING),
            metadata={
                "source": "email_security",
                "indicator": indicator,
                "sender": f"suspicious@{random.choice(['evil.com', 'malware.net', 'phish.org'])}"
            }
        )
        
        return detection
        
    async def _rule_matches(self, rule: Dict[str, Any], data: Dict[str, Any]) -> bool:
        """Check if a detection rule matches the data."""
        # Simulate rule matching logic
        return random.random() < 0.4  # 40% chance of rule match
        
    def _get_remediation_steps(self, category: ThreatCategory) -> List[str]:
        """Get remediation steps for a threat category."""
        remediation_map = {
            ThreatCategory.MALWARE: [
                "Isolate affected systems",
                "Run full antivirus scan",
                "Update security signatures",
                "Monitor for persistence mechanisms"
            ],
            ThreatCategory.PHISHING: [
                "Block sender domain",
                "Remove malicious emails",
                "Notify affected users",
                "Update email filters"
            ],
            ThreatCategory.LATERAL_MOVEMENT: [
                "Segment network access",
                "Reset compromised credentials",
                "Monitor privileged accounts",
                "Review access logs"
            ],
            ThreatCategory.DATA_EXFILTRATION: [
                "Block outbound connections",
                "Identify compromised data",
                "Notify stakeholders",
                "Implement DLP controls"
            ]
        }
        
        return remediation_map.get(category, [
            "Investigate further",
            "Monitor affected systems",
            "Apply security patches",
            "Review security controls"
        ])
        
    async def _escalate_detection(self, detection: ThreatDetection):
        """Escalate a high-confidence detection."""
        detection.escalated = True
        
        # Simulate escalation actions
        escalation_actions = [
            "notify_security_team",
            "create_incident_ticket",
            "trigger_automated_response",
            "alert_management"
        ]
        
        detection.metadata["escalation_actions"] = escalation_actions
        detection.metadata["escalated_at"] = datetime.utcnow().isoformat()
        
        logger.info(f"Escalated detection {detection.detection_id}: {detection.threat_name}")
        
    async def analyze_threat(self, detection_id: str) -> Optional[ThreatAnalysis]:
        """Perform detailed threat analysis."""
        if detection_id not in self.active_detections:
            return None
            
        detection = self.active_detections[detection_id]
        
        # Perform threat intelligence correlation
        correlation_results = await self._correlate_threat_intelligence(detection)
        
        # Calculate threat score
        threat_score = await self._calculate_threat_score(detection, correlation_results)
        
        # Assess risk
        risk_assessment = await self._assess_risk(detection, threat_score)
        
        # Build attack chain
        attack_chain = await self._build_attack_chain(detection, correlation_results)
        
        # Generate recommendations
        recommended_actions = await self._generate_recommendations(detection, threat_score)
        
        analysis = ThreatAnalysis(
            analysis_id=str(uuid.uuid4()),
            detection_id=detection_id,
            analysis_timestamp=datetime.utcnow(),
            threat_score=threat_score,
            risk_assessment=risk_assessment,
            attack_chain=attack_chain,
            potential_impact=self._assess_potential_impact(detection, threat_score),
            recommended_actions=recommended_actions,
            correlation_results=correlation_results,
            metadata={
                "analysis_duration": random.uniform(1.0, 5.0),
                "confidence_level": detection.confidence,
                "analyst": "autonomous_agent"
            }
        )
        
        self.threat_analyses[analysis.analysis_id] = analysis
        return analysis
        
    async def _correlate_threat_intelligence(self, detection: ThreatDetection) -> Dict[str, Any]:
        """Correlate detection with threat intelligence."""
        correlations = {
            "matched_malware": [],
            "matched_apt_groups": [],
            "matched_iocs": [],
            "correlation_score": 0.0
        }
        
        # Check against known malware
        for malware_name, malware_info in self.threat_intelligence["known_malware"].items():
            for indicator in detection.indicators:
                if any(mal_indicator in indicator for mal_indicator in malware_info["indicators"]):
                    correlations["matched_malware"].append({
                        "name": malware_name,
                        "family": malware_info["family"],
                        "confidence": 0.8
                    })
                    
        # Check against APT groups
        for apt_name, apt_info in self.threat_intelligence["apt_groups"].items():
            if detection.category.value in ["apt", "lateral_movement", "data_exfiltration"]:
                correlations["matched_apt_groups"].append({
                    "name": apt_name,
                    "origin": apt_info["origin"],
                    "confidence": 0.6
                })
                
        # Check against IOCs
        iocs = self.threat_intelligence["iocs"]
        for indicator in detection.indicators:
            if indicator in iocs["malicious_domains"] + iocs["malicious_ips"] + iocs["malicious_hashes"]:
                correlations["matched_iocs"].append({
                    "indicator": indicator,
                    "type": "known_malicious",
                    "confidence": 0.9
                })
                
        # Calculate overall correlation score
        correlations["correlation_score"] = min(1.0, 
            len(correlations["matched_malware"]) * 0.3 +
            len(correlations["matched_apt_groups"]) * 0.2 +
            len(correlations["matched_iocs"]) * 0.4
        )
        
        return correlations
        
    async def _calculate_threat_score(self, detection: ThreatDetection, 
                                    correlations: Dict[str, Any]) -> float:
        """Calculate comprehensive threat score."""
        base_score = detection.confidence
        
        # Severity multiplier
        severity_multipliers = {
            ThreatSeverity.LOW: 0.3,
            ThreatSeverity.MEDIUM: 0.6,
            ThreatSeverity.HIGH: 0.8,
            ThreatSeverity.CRITICAL: 1.0
        }
        
        severity_factor = severity_multipliers.get(detection.severity, 0.5)
        
        # Correlation factor
        correlation_factor = correlations["correlation_score"]
        
        # Asset criticality factor (simulated)
        asset_criticality = random.uniform(0.5, 1.0)
        
        # Calculate final score
        threat_score = (base_score * 0.4 + 
                       severity_factor * 0.3 + 
                       correlation_factor * 0.2 + 
                       asset_criticality * 0.1)
        
        return min(1.0, threat_score)
        
    async def _assess_risk(self, detection: ThreatDetection, threat_score: float) -> str:
        """Assess overall risk level."""
        if threat_score >= 0.8:
            return "critical"
        elif threat_score >= 0.6:
            return "high"
        elif threat_score >= 0.4:
            return "medium"
        else:
            return "low"
            
    async def _build_attack_chain(self, detection: ThreatDetection, 
                                correlations: Dict[str, Any]) -> List[str]:
        """Build potential attack chain."""
        chains = {
            ThreatCategory.PHISHING: [
                "Initial Access via Phishing",
                "Credential Harvesting",
                "Lateral Movement",
                "Data Collection",
                "Exfiltration"
            ],
            ThreatCategory.MALWARE: [
                "Malware Execution",
                "Persistence Establishment",
                "Defense Evasion",
                "Discovery",
                "Collection"
            ],
            ThreatCategory.APT: [
                "Reconnaissance",
                "Initial Compromise",
                "Establish Foothold",
                "Escalate Privileges",
                "Move Laterally",
                "Maintain Persistence",
                "Complete Mission"
            ]
        }
        
        return chains.get(detection.category, [
            "Initial Detection",
            "Analysis Required",
            "Response Planning"
        ])
        
    def _assess_potential_impact(self, detection: ThreatDetection, threat_score: float) -> str:
        """Assess potential impact of the threat."""
        if threat_score >= 0.8:
            return "Severe - Critical business operations at risk"
        elif threat_score >= 0.6:
            return "High - Significant operational impact possible"
        elif threat_score >= 0.4:
            return "Medium - Limited operational impact"
        else:
            return "Low - Minimal impact expected"
            
    async def _generate_recommendations(self, detection: ThreatDetection, 
                                      threat_score: float) -> List[str]:
        """Generate action recommendations."""
        base_recommendations = detection.remediation_steps.copy()
        
        if threat_score >= 0.8:
            base_recommendations.extend([
                "Activate incident response team",
                "Consider system shutdown if necessary",
                "Notify executive leadership",
                "Prepare external communications"
            ])
        elif threat_score >= 0.6:
            base_recommendations.extend([
                "Escalate to senior security team",
                "Implement additional monitoring",
                "Review backup systems"
            ])
            
        return base_recommendations
        
    async def _monitoring_loop(self):
        """Main monitoring loop."""
        try:
            while True:
                # Simulate continuous monitoring
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Generate simulated data sources
                data_sources = {
                    "network_traffic": {"flows": random.randint(100, 1000)},
                    "endpoint_logs": {"events": random.randint(50, 500)},
                    "email_data": {"messages": random.randint(10, 100)}
                }
                
                # Detect threats
                detections = await self.detect_threats(data_sources)
                
                if detections:
                    logger.info(f"Detected {len(detections)} potential threats")
                    
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Monitoring loop error: {e}")
            
    async def _analysis_loop(self):
        """Background analysis loop."""
        try:
            while True:
                await asyncio.sleep(60)  # Analyze every minute
                
                # Analyze unanalyzed detections
                for detection_id, detection in self.active_detections.items():
                    if detection_id not in self.threat_analyses:
                        analysis = await self.analyze_threat(detection_id)
                        if analysis:
                            logger.info(f"Completed analysis for detection {detection_id}")
                            
        except asyncio.CancelledError:
            pass
        except Exception as e:
            logger.error(f"Analysis loop error: {e}")
            
    async def get_detection_summary(self) -> Dict[str, Any]:
        """Get summary of current detections."""
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "active_detections": len(self.active_detections),
            "total_detections": len(self.detection_history),
            "analyses_completed": len(self.threat_analyses),
            "escalated_detections": len([d for d in self.active_detections.values() if d.escalated]),
            "detection_by_severity": {
                severity.value: len([d for d in self.active_detections.values() if d.severity == severity])
                for severity in ThreatSeverity
            },
            "detection_by_category": {
                category.value: len([d for d in self.active_detections.values() if d.category == category])
                for category in ThreatCategory
            }
        }


# Global autonomous threat detector instance
autonomous_threat_detector = AutonomousThreatDetector()