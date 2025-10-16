"""
Threat Hunter Agent implementation for ACSO system.
Proactively hunts for security threats and anomalies.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from .base_agent import BaseAgent
from ..shared.interfaces import ThreatHunterInterface
from ..shared.models import (
    AgentType, Task, TaskType, TaskPriority, TaskStatus,
    Incident, IncidentSeverity, IncidentType, IncidentStatus
)
from ..shared.coordination import system_coordinator
from ..shared.aws_integration import bedrock_client, cloudwatch_logger
from config.settings import settings


class ThreatType(str, Enum):
    """Types of threats that can be detected."""
    MALWARE = "malware"
    INTRUSION = "intrusion"
    DATA_EXFILTRATION = "data_exfiltration"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    LATERAL_MOVEMENT = "lateral_movement"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    POLICY_VIOLATION = "policy_violation"
    ANOMALOUS_BEHAVIOR = "anomalous_behavior"


class ThreatSeverity(str, Enum):
    """Severity levels for detected threats."""
    INFO = "info"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class LogSource(str, Enum):
    """Sources of log data for analysis."""
    CLOUDTRAIL = "cloudtrail"
    GUARDDUTY = "guardduty"
    VPC_FLOW_LOGS = "vpc_flow_logs"
    APPLICATION_LOGS = "application_logs"
    SYSTEM_LOGS = "system_logs"
    SECURITY_LOGS = "security_logs"


class ThreatIndicator:
    """Represents a threat indicator or IOC (Indicator of Compromise)."""
    
    def __init__(self, indicator_type: str, value: str, confidence: float, 
                 source: str, description: str = ""):
        self.indicator_type = indicator_type  # ip, domain, hash, etc.
        self.value = value
        self.confidence = confidence  # 0.0 to 1.0
        self.source = source
        self.description = description
        self.created_at = datetime.utcnow()
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "type": self.indicator_type,
            "value": self.value,
            "confidence": self.confidence,
            "source": self.source,
            "description": self.description,
            "created_at": self.created_at.isoformat()
        }


class ThreatDetectionEngine:
    """Core engine for threat detection and analysis."""
    
    def __init__(self):
        self.threat_patterns = self._initialize_threat_patterns()
        self.baseline_behaviors = {}
        self.threat_indicators = []
        self.detection_rules = self._initialize_detection_rules()
        
    def _initialize_threat_patterns(self) -> Dict[str, Dict[str, Any]]:
        """Initialize known threat patterns."""
        return {
            "suspicious_login": {
                "pattern": "multiple_failed_logins",
                "threshold": 5,
                "timeframe": 300,  # 5 minutes
                "severity": ThreatSeverity.MEDIUM,
                "description": "Multiple failed login attempts detected"
            },
            "unusual_data_access": {
                "pattern": "large_data_download",
                "threshold": 1000000,  # 1MB
                "timeframe": 3600,  # 1 hour
                "severity": ThreatSeverity.HIGH,
                "description": "Unusually large data access detected"
            },
            "privilege_escalation": {
                "pattern": "admin_privilege_granted",
                "threshold": 1,
                "timeframe": 86400,  # 24 hours
                "severity": ThreatSeverity.HIGH,
                "description": "Administrative privileges granted"
            },
            "off_hours_activity": {
                "pattern": "activity_outside_business_hours",
                "threshold": 10,
                "timeframe": 3600,
                "severity": ThreatSeverity.MEDIUM,
                "description": "Significant activity outside business hours"
            }
        }
        
    def _initialize_detection_rules(self) -> List[Dict[str, Any]]:
        """Initialize threat detection rules."""
        return [
            {
                "rule_id": "failed_login_brute_force",
                "name": "Brute Force Login Detection",
                "description": "Detect brute force login attempts",
                "conditions": {
                    "event_type": "authentication_failure",
                    "count_threshold": 5,
                    "time_window": 300
                },
                "severity": ThreatSeverity.HIGH,
                "enabled": True
            },
            {
                "rule_id": "suspicious_ip_activity",
                "name": "Suspicious IP Activity",
                "description": "Detect activity from known malicious IPs",
                "conditions": {
                    "source_ip_reputation": "malicious",
                    "count_threshold": 1,
                    "time_window": 3600
                },
                "severity": ThreatSeverity.CRITICAL,
                "enabled": True
            },
            {
                "rule_id": "data_exfiltration_pattern",
                "name": "Data Exfiltration Detection",
                "description": "Detect potential data exfiltration patterns",
                "conditions": {
                    "data_transfer_size": ">10MB",
                    "destination": "external",
                    "time_pattern": "unusual"
                },
                "severity": ThreatSeverity.HIGH,
                "enabled": True
            }
        ]
        
    async def analyze_log_entry(self, log_entry: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze a single log entry for threats."""
        threats = []
        
        try:
            # Apply detection rules
            for rule in self.detection_rules:
                if not rule.get("enabled", True):
                    continue
                    
                threat = await self._apply_detection_rule(log_entry, rule)
                if threat:
                    threats.append(threat)
                    
            # Check against known threat patterns
            pattern_threats = await self._check_threat_patterns(log_entry)
            threats.extend(pattern_threats)
            
            # Perform behavioral analysis
            behavioral_threats = await self._analyze_behavioral_anomalies(log_entry)
            threats.extend(behavioral_threats)
            
        except Exception as e:
            print(f"Log analysis error: {e}")
            
        return threats
        
    async def _apply_detection_rule(self, log_entry: Dict[str, Any], rule: Dict[str, Any]) -> Optional[Dict[str, Any]]:
        """Apply a detection rule to a log entry."""
        try:
            conditions = rule.get("conditions", {})
            
            # Simple rule matching (in a real implementation, this would be more sophisticated)
            matches = True
            
            for condition_key, condition_value in conditions.items():
                if condition_key == "event_type":
                    if log_entry.get("eventName", "").lower() != condition_value:
                        matches = False
                        break
                elif condition_key == "source_ip_reputation":
                    # Check IP reputation (simplified)
                    source_ip = log_entry.get("sourceIPAddress", "")
                    if condition_value == "malicious" and not self._is_malicious_ip(source_ip):
                        matches = False
                        break
                        
            if matches:
                return {
                    "rule_id": rule["rule_id"],
                    "rule_name": rule["name"],
                    "severity": rule["severity"],
                    "description": rule["description"],
                    "log_entry": log_entry,
                    "detected_at": datetime.utcnow().isoformat()
                }
                
        except Exception as e:
            print(f"Rule application error: {e}")
            
        return None
        
    async def _check_threat_patterns(self, log_entry: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check log entry against known threat patterns."""
        threats = []
        
        try:
            event_name = log_entry.get("eventName", "").lower()
            source_ip = log_entry.get("sourceIPAddress", "")
            user_identity = log_entry.get("userIdentity", {})
            
            # Check for suspicious login patterns
            if "signin" in event_name or "login" in event_name:
                if log_entry.get("errorCode") or log_entry.get("errorMessage"):
                    threats.append({
                        "pattern": "failed_login",
                        "severity": ThreatSeverity.MEDIUM,
                        "description": f"Failed login attempt from {source_ip}",
                        "indicators": [source_ip, user_identity.get("userName", "unknown")]
                    })
                    
            # Check for privilege escalation
            if any(action in event_name for action in ["attachuserpolicy", "putuserpolicy", "createrole"]):
                threats.append({
                    "pattern": "privilege_escalation",
                    "severity": ThreatSeverity.HIGH,
                    "description": f"Privilege escalation activity: {event_name}",
                    "indicators": [user_identity.get("userName", "unknown")]
                })
                
            # Check for data access patterns
            if any(action in event_name for action in ["getobject", "listobjects", "downloadfile"]):
                # Simplified data access analysis
                threats.append({
                    "pattern": "data_access",
                    "severity": ThreatSeverity.LOW,
                    "description": f"Data access activity: {event_name}",
                    "indicators": [source_ip]
                })
                
        except Exception as e:
            print(f"Pattern checking error: {e}")
            
        return threats
        
    async def _analyze_behavioral_anomalies(self, log_entry: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze log entry for behavioral anomalies."""
        anomalies = []
        
        try:
            # Time-based anomaly detection
            event_time = datetime.fromisoformat(log_entry.get("eventTime", datetime.utcnow().isoformat()).replace('Z', '+00:00'))
            
            # Check if activity is outside business hours
            if event_time.hour < 8 or event_time.hour > 18 or event_time.weekday() > 4:
                anomalies.append({
                    "anomaly_type": "off_hours_activity",
                    "severity": ThreatSeverity.MEDIUM,
                    "description": f"Activity detected outside business hours at {event_time}",
                    "confidence": 0.6
                })
                
            # Geographic anomaly detection (simplified)
            source_ip = log_entry.get("sourceIPAddress", "")
            if self._is_unusual_geographic_location(source_ip):
                anomalies.append({
                    "anomaly_type": "geographic_anomaly",
                    "severity": ThreatSeverity.HIGH,
                    "description": f"Activity from unusual geographic location: {source_ip}",
                    "confidence": 0.8
                })
                
        except Exception as e:
            print(f"Behavioral analysis error: {e}")
            
        return anomalies
        
    def _is_malicious_ip(self, ip_address: str) -> bool:
        """Check if IP address is known to be malicious."""
        # Simplified malicious IP check
        # In a real implementation, this would check against threat intelligence feeds
        malicious_ips = [
            "192.168.1.100",  # Example malicious IP for testing
            "10.0.0.50"
        ]
        return ip_address in malicious_ips
        
    def _is_unusual_geographic_location(self, ip_address: str) -> bool:
        """Check if IP address is from an unusual geographic location."""
        # Simplified geographic check
        # In a real implementation, this would use GeoIP databases
        unusual_countries = ["CN", "RU", "KP"]  # Example countries
        # For prototype, we'll just flag certain IP ranges
        return ip_address.startswith("192.168.2.")  # Example unusual range
        
    async def update_baseline_behavior(self, user_id: str, behavior_data: Dict[str, Any]) -> None:
        """Update baseline behavior patterns for a user."""
        if user_id not in self.baseline_behaviors:
            self.baseline_behaviors[user_id] = {
                "login_times": [],
                "access_patterns": [],
                "geographic_locations": [],
                "last_updated": datetime.utcnow()
            }
            
        baseline = self.baseline_behaviors[user_id]
        
        # Update login times
        if "login_time" in behavior_data:
            baseline["login_times"].append(behavior_data["login_time"])
            # Keep only last 30 days
            cutoff = datetime.utcnow() - timedelta(days=30)
            baseline["login_times"] = [
                t for t in baseline["login_times"] 
                if datetime.fromisoformat(t) > cutoff
            ]
            
        # Update access patterns
        if "accessed_resources" in behavior_data:
            baseline["access_patterns"].extend(behavior_data["accessed_resources"])
            # Keep only unique resources from last 30 days
            baseline["access_patterns"] = list(set(baseline["access_patterns"][-1000:]))
            
        baseline["last_updated"] = datetime.utcnow()


class ThreatHunterAgent(BaseAgent, ThreatHunterInterface):
    """Threat Hunter agent that proactively searches for security threats."""
    
    def __init__(self, agent_id: str = "threat-hunter-001"):
        super().__init__(agent_id, AgentType.THREAT_HUNTER)
        
        # Threat hunter specific capabilities
        self.capabilities = [
            "threat_detection",
            "log_analysis",
            "behavioral_analysis",
            "threat_intelligence",
            "anomaly_detection",
            "pattern_recognition"
        ]
        
        # Detection engine
        self.detection_engine = ThreatDetectionEngine()
        
        # Monitoring state
        self.monitoring_active = False
        self.monitored_sources = []
        self.threat_queue = asyncio.Queue()
        
        # Statistics
        self.threats_detected = 0
        self.logs_analyzed = 0
        self.false_positives = 0
        
    async def initialize(self) -> None:
        """Initialize the threat hunter agent."""
        await super().initialize()
        
        # Register with system coordinator
        state = await self.get_state()
        await system_coordinator.register_agent(state)
        
        # Register additional message handlers
        self.comm_manager.register_handler("start_monitoring", self._handle_start_monitoring)
        self.comm_manager.register_handler("stop_monitoring", self._handle_stop_monitoring)
        self.comm_manager.register_handler("analyze_logs", self._handle_analyze_logs)
        
        self.logger.info("Threat Hunter agent initialized and ready for monitoring")
        
    async def _execute_task_implementation(self, task: Task) -> Dict[str, Any]:
        """Execute threat hunter specific tasks."""
        try:
            if task.type == TaskType.THREAT_ANALYSIS:
                return await self._perform_threat_analysis(task)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported task type: {task.type}",
                    "task_id": task.task_id
                }
                
        except Exception as e:
            self.logger.error(f"Threat hunter task execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "task_id": task.task_id
            }
            
    async def start_monitoring(self) -> None:
        """Start continuous threat monitoring."""
        try:
            if self.monitoring_active:
                self.logger.warning("Monitoring already active")
                return
                
            self.monitoring_active = True
            self.logger.info("Starting continuous threat monitoring")
            
            # Start monitoring tasks
            asyncio.create_task(self._monitor_cloudtrail_logs())
            asyncio.create_task(self._monitor_guardduty_findings())
            asyncio.create_task(self._process_threat_queue())
            
            # Log monitoring start
            await self._log_activity("monitoring_started", {
                "sources": [source.value for source in LogSource],
                "detection_rules": len(self.detection_engine.detection_rules)
            })
            
        except Exception as e:
            self.logger.error(f"Failed to start monitoring: {e}")
            self.monitoring_active = False
            
    async def analyze_logs(self, log_data: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Analyze log data for threats."""
        try:
            self.logger.debug(f"Analyzing log data from source: {log_data.get('source', 'unknown')}")
            
            threats = []
            log_entries = log_data.get("entries", [])
            
            for entry in log_entries:
                # Analyze individual log entry
                entry_threats = await self.detection_engine.analyze_log_entry(entry)
                threats.extend(entry_threats)
                
                # Update statistics
                self.logs_analyzed += 1
                
            # Update threat count
            self.threats_detected += len(threats)
            
            # Log analysis results
            await self._log_activity("log_analysis", {
                "entries_analyzed": len(log_entries),
                "threats_detected": len(threats),
                "source": log_data.get("source", "unknown")
            })
            
            return threats
            
        except Exception as e:
            self.logger.error(f"Log analysis failed: {e}")
            return []
            
    async def classify_threat(self, threat_data: Dict[str, Any]) -> Dict[str, Any]:
        """Classify and score a detected threat."""
        try:
            self.logger.debug(f"Classifying threat: {threat_data.get('rule_name', 'unknown')}")
            
            # Use Bedrock for advanced threat classification
            classification_prompt = f"""
            Analyze this security threat and provide classification:
            
            Threat Data: {json.dumps(threat_data, indent=2)}
            
            Provide:
            1. Threat type classification
            2. Severity assessment (1-10 scale)
            3. Confidence level (0-1)
            4. Recommended actions
            5. Potential impact assessment
            """
            
            bedrock_result = await self._invoke_bedrock_agent(classification_prompt)
            
            # Base classification
            classification = {
                "threat_id": str(uuid.uuid4()),
                "threat_type": self._determine_threat_type(threat_data),
                "severity": self._calculate_threat_severity(threat_data),
                "confidence": self._calculate_confidence(threat_data),
                "classification_time": datetime.utcnow().isoformat(),
                "original_data": threat_data
            }
            
            # Enhance with Bedrock analysis if available
            if bedrock_result.get("success"):
                ai_analysis = bedrock_result.get("result", "")
                classification["ai_analysis"] = ai_analysis
                classification["enhanced"] = True
            else:
                classification["enhanced"] = False
                
            # Add recommended actions
            classification["recommended_actions"] = self._get_recommended_actions(classification)
            
            return classification
            
        except Exception as e:
            self.logger.error(f"Threat classification failed: {e}")
            return {
                "threat_id": str(uuid.uuid4()),
                "error": str(e),
                "original_data": threat_data
            }
            
    async def update_knowledge_base(self, threat_patterns: List[Dict[str, Any]]) -> None:
        """Update threat detection knowledge base."""
        try:
            self.logger.info(f"Updating knowledge base with {len(threat_patterns)} patterns")
            
            for pattern in threat_patterns:
                # Add new detection rules
                if pattern.get("type") == "detection_rule":
                    self.detection_engine.detection_rules.append(pattern["rule"])
                    
                # Add threat indicators
                elif pattern.get("type") == "indicator":
                    indicator = ThreatIndicator(
                        indicator_type=pattern["indicator_type"],
                        value=pattern["value"],
                        confidence=pattern.get("confidence", 0.5),
                        source=pattern.get("source", "manual"),
                        description=pattern.get("description", "")
                    )
                    self.detection_engine.threat_indicators.append(indicator)
                    
                # Update threat patterns
                elif pattern.get("type") == "pattern":
                    pattern_name = pattern["name"]
                    self.detection_engine.threat_patterns[pattern_name] = pattern["definition"]
                    
            # Store updated knowledge base in memory
            await self._store_memory("knowledge_base_update", {
                "patterns_added": len(threat_patterns),
                "timestamp": datetime.utcnow().isoformat(),
                "total_rules": len(self.detection_engine.detection_rules),
                "total_indicators": len(self.detection_engine.threat_indicators)
            }, "long_term")
            
            self.logger.info("Knowledge base updated successfully")
            
        except Exception as e:
            self.logger.error(f"Knowledge base update failed: {e}")
            
    async def _perform_threat_analysis(self, task: Task) -> Dict[str, Any]:
        """Perform comprehensive threat analysis."""
        try:
            analysis_type = task.context.get("analysis_type", "general")
            target_systems = task.context.get("target_systems", [])
            time_range = task.context.get("time_range", "1h")
            
            self.logger.info(f"Performing {analysis_type} threat analysis for {len(target_systems)} systems")
            
            # Simulate log collection and analysis
            log_data = await self._collect_logs(target_systems, time_range)
            
            # Analyze collected logs
            threats = await self.analyze_logs(log_data)
            
            # Classify detected threats
            classified_threats = []
            for threat in threats:
                classification = await self.classify_threat(threat)
                classified_threats.append(classification)
                
            # Generate analysis summary
            summary = await self._generate_analysis_summary(classified_threats, analysis_type)
            
            # Create incidents for high-severity threats
            incidents = []
            for threat in classified_threats:
                if threat.get("severity", ThreatSeverity.LOW) in [ThreatSeverity.HIGH, ThreatSeverity.CRITICAL]:
                    incident = await self._create_incident_from_threat(threat)
                    incidents.append(incident)
                    
            return {
                "success": True,
                "analysis_type": analysis_type,
                "threats_detected": len(classified_threats),
                "high_severity_threats": len([t for t in classified_threats if t.get("severity") in [ThreatSeverity.HIGH, ThreatSeverity.CRITICAL]]),
                "incidents_created": len(incidents),
                "threats": classified_threats,
                "incidents": incidents,
                "summary": summary,
                "task_id": task.task_id
            }
            
        except Exception as e:
            self.logger.error(f"Threat analysis failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "task_id": task.task_id
            }
            
    async def _collect_logs(self, target_systems: List[str], time_range: str) -> Dict[str, Any]:
        """Collect logs from target systems."""
        # Simulate log collection
        # In a real implementation, this would integrate with AWS CloudTrail, GuardDuty, etc.
        
        sample_logs = [
            {
                "eventTime": datetime.utcnow().isoformat(),
                "eventName": "ConsoleLogin",
                "sourceIPAddress": "192.168.1.100",
                "userIdentity": {"userName": "testuser"},
                "errorCode": "SigninFailure"
            },
            {
                "eventTime": datetime.utcnow().isoformat(),
                "eventName": "GetObject",
                "sourceIPAddress": "10.0.1.50",
                "userIdentity": {"userName": "admin"},
                "resources": [{"type": "S3Bucket", "name": "sensitive-data"}]
            }
        ]
        
        return {
            "source": "simulated",
            "time_range": time_range,
            "target_systems": target_systems,
            "entries": sample_logs
        }
        
    def _determine_threat_type(self, threat_data: Dict[str, Any]) -> ThreatType:
        """Determine threat type from threat data."""
        rule_name = threat_data.get("rule_name", "").lower()
        pattern = threat_data.get("pattern", "").lower()
        
        if "login" in rule_name or "authentication" in rule_name:
            return ThreatType.INTRUSION
        elif "privilege" in rule_name or "escalation" in pattern:
            return ThreatType.PRIVILEGE_ESCALATION
        elif "data" in rule_name or "exfiltration" in pattern:
            return ThreatType.DATA_EXFILTRATION
        elif "malware" in rule_name:
            return ThreatType.MALWARE
        else:
            return ThreatType.SUSPICIOUS_ACTIVITY
            
    def _calculate_threat_severity(self, threat_data: Dict[str, Any]) -> ThreatSeverity:
        """Calculate threat severity."""
        # Use existing severity if available
        if "severity" in threat_data:
            return threat_data["severity"]
            
        # Calculate based on indicators
        severity_score = 0
        
        # Check for high-risk indicators
        if threat_data.get("rule_id") == "suspicious_ip_activity":
            severity_score += 8
        elif "failed_login" in threat_data.get("pattern", ""):
            severity_score += 5
        elif "privilege_escalation" in threat_data.get("pattern", ""):
            severity_score += 7
            
        # Convert score to severity
        if severity_score >= 8:
            return ThreatSeverity.CRITICAL
        elif severity_score >= 6:
            return ThreatSeverity.HIGH
        elif severity_score >= 4:
            return ThreatSeverity.MEDIUM
        elif severity_score >= 2:
            return ThreatSeverity.LOW
        else:
            return ThreatSeverity.INFO
            
    def _calculate_confidence(self, threat_data: Dict[str, Any]) -> float:
        """Calculate confidence level for threat detection."""
        confidence = 0.5  # Base confidence
        
        # Increase confidence based on multiple indicators
        if "rule_id" in threat_data:
            confidence += 0.2
        if "pattern" in threat_data:
            confidence += 0.1
        if "indicators" in threat_data and len(threat_data["indicators"]) > 1:
            confidence += 0.2
            
        return min(1.0, confidence)
        
    def _get_recommended_actions(self, classification: Dict[str, Any]) -> List[str]:
        """Get recommended actions for a classified threat."""
        actions = []
        
        threat_type = classification.get("threat_type", ThreatType.SUSPICIOUS_ACTIVITY)
        severity = classification.get("severity", ThreatSeverity.LOW)
        
        # Base actions for all threats
        actions.append("Monitor for additional indicators")
        actions.append("Document in security log")
        
        # Severity-based actions
        if severity in [ThreatSeverity.HIGH, ThreatSeverity.CRITICAL]:
            actions.append("Escalate to incident response team")
            actions.append("Consider containment actions")
            
        # Threat-type specific actions
        if threat_type == ThreatType.INTRUSION:
            actions.extend([
                "Review authentication logs",
                "Check for lateral movement",
                "Consider blocking source IP"
            ])
        elif threat_type == ThreatType.DATA_EXFILTRATION:
            actions.extend([
                "Review data access patterns",
                "Check network traffic",
                "Assess data sensitivity"
            ])
        elif threat_type == ThreatType.PRIVILEGE_ESCALATION:
            actions.extend([
                "Review privilege changes",
                "Audit administrative actions",
                "Check for unauthorized access"
            ])
            
        return actions
        
    async def _generate_analysis_summary(self, threats: List[Dict[str, Any]], analysis_type: str) -> str:
        """Generate a summary of threat analysis results."""
        try:
            total_threats = len(threats)
            high_severity = len([t for t in threats if t.get("severity") in [ThreatSeverity.HIGH, ThreatSeverity.CRITICAL]])
            
            # Use Bedrock for summary generation
            summary_prompt = f"""
            Generate a concise security analysis summary:
            
            Analysis Type: {analysis_type}
            Total Threats Detected: {total_threats}
            High Severity Threats: {high_severity}
            
            Threat Details: {json.dumps(threats[:5], indent=2)}  # First 5 threats
            
            Provide:
            1. Executive summary
            2. Key findings
            3. Risk assessment
            4. Recommended next steps
            """
            
            bedrock_result = await self._invoke_bedrock_agent(summary_prompt)
            
            if bedrock_result.get("success"):
                return bedrock_result.get("result", "Analysis completed successfully")
            else:
                # Fallback summary
                return f"Threat analysis completed. {total_threats} threats detected, {high_severity} high severity. Review recommended actions for each threat."
                
        except Exception as e:
            self.logger.error(f"Summary generation failed: {e}")
            return f"Analysis completed with {len(threats)} threats detected."
            
    async def _create_incident_from_threat(self, threat: Dict[str, Any]) -> Dict[str, Any]:
        """Create an incident from a high-severity threat."""
        try:
            incident_id = str(uuid.uuid4())
            
            # Map threat severity to incident severity
            severity_mapping = {
                ThreatSeverity.CRITICAL: IncidentSeverity.CRITICAL,
                ThreatSeverity.HIGH: IncidentSeverity.HIGH,
                ThreatSeverity.MEDIUM: IncidentSeverity.MEDIUM,
                ThreatSeverity.LOW: IncidentSeverity.LOW
            }
            
            incident = {
                "incident_id": incident_id,
                "severity": severity_mapping.get(threat.get("severity"), IncidentSeverity.MEDIUM),
                "type": IncidentType.SECURITY,
                "description": f"Security threat detected: {threat.get('threat_type', 'Unknown')}",
                "detected_by": self.agent_id,
                "detection_time": datetime.utcnow().isoformat(),
                "status": IncidentStatus.OPEN,
                "threat_data": threat,
                "recommended_actions": threat.get("recommended_actions", [])
            }
            
            # Notify incident response agent
            await self.comm_manager.send_message(
                recipient_id="incident-response-001",  # Default incident response agent
                message_type="new_incident",
                payload={"incident": incident}
            )
            
            self.logger.info(f"Created incident {incident_id} for threat {threat.get('threat_id')}")
            
            return incident
            
        except Exception as e:
            self.logger.error(f"Incident creation failed: {e}")
            return {}
            
    async def _monitor_cloudtrail_logs(self) -> None:
        """Monitor CloudTrail logs for threats."""
        while self.monitoring_active:
            try:
                # Simulate CloudTrail log monitoring
                # In a real implementation, this would use AWS CloudTrail APIs
                await asyncio.sleep(30)  # Check every 30 seconds
                
                # Simulate receiving log data
                log_data = await self._collect_logs(["cloudtrail"], "5m")
                threats = await self.analyze_logs(log_data)
                
                # Queue threats for processing
                for threat in threats:
                    await self.threat_queue.put(threat)
                    
            except Exception as e:
                self.logger.error(f"CloudTrail monitoring error: {e}")
                await asyncio.sleep(60)
                
    async def _monitor_guardduty_findings(self) -> None:
        """Monitor GuardDuty findings."""
        while self.monitoring_active:
            try:
                # Simulate GuardDuty monitoring
                # In a real implementation, this would use AWS GuardDuty APIs
                await asyncio.sleep(60)  # Check every minute
                
                # Process would fetch and analyze GuardDuty findings
                
            except Exception as e:
                self.logger.error(f"GuardDuty monitoring error: {e}")
                await asyncio.sleep(120)
                
    async def _process_threat_queue(self) -> None:
        """Process detected threats from the queue."""
        while self.monitoring_active:
            try:
                # Wait for threats in queue
                threat = await asyncio.wait_for(self.threat_queue.get(), timeout=10.0)
                
                # Classify threat
                classification = await self.classify_threat(threat)
                
                # Create incident if high severity
                if classification.get("severity") in [ThreatSeverity.HIGH, ThreatSeverity.CRITICAL]:
                    await self._create_incident_from_threat(classification)
                    
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error(f"Threat processing error: {e}")
                await asyncio.sleep(5)
                
    async def _handle_start_monitoring(self, message) -> None:
        """Handle start monitoring message."""
        await self.start_monitoring()
        
    async def _handle_stop_monitoring(self, message) -> None:
        """Handle stop monitoring message."""
        self.monitoring_active = False
        self.logger.info("Monitoring stopped")
        
    async def _handle_analyze_logs(self, message) -> None:
        """Handle log analysis request."""
        log_data = message.payload.get("log_data", {})
        threats = await self.analyze_logs(log_data)
        
        # Send results back
        await self.comm_manager.send_message(
            recipient_id=message.sender_id,
            message_type="log_analysis_result",
            payload={
                "threats": threats,
                "analysis_id": message.payload.get("analysis_id")
            }
        )
clas
s ThreatLearningEngine:
    """Engine for learning from threat detection patterns and improving accuracy."""
    
    def __init__(self, threat_hunter_agent):
        self.agent = threat_hunter_agent
        self.learning_data = {
            "threat_patterns": {},
            "false_positives": [],
            "confirmed_threats": [],
            "behavioral_baselines": {},
            "detection_accuracy": {}
        }
        self.learning_enabled = True
        
    async def learn_from_detection(self, threat_data: Dict[str, Any], 
                                 feedback: Dict[str, Any]) -> None:
        """Learn from threat detection and human feedback."""
        try:
            threat_id = threat_data.get("threat_id")
            is_true_positive = feedback.get("is_true_positive", True)
            confidence = threat_data.get("confidence", 0.5)
            
            if is_true_positive:
                # Add to confirmed threats
                self.learning_data["confirmed_threats"].append({
                    "threat_data": threat_data,
                    "feedback": feedback,
                    "timestamp": datetime.utcnow().isoformat(),
                    "confidence": confidence
                })
                
                # Update detection patterns
                await self._update_detection_patterns(threat_data, True)
                
            else:
                # Add to false positives
                self.learning_data["false_positives"].append({
                    "threat_data": threat_data,
                    "feedback": feedback,
                    "timestamp": datetime.utcnow().isoformat(),
                    "confidence": confidence
                })
                
                # Update detection patterns to reduce false positives
                await self._update_detection_patterns(threat_data, False)
                
            # Update accuracy metrics
            await self._update_accuracy_metrics(threat_data, is_true_positive)
            
            # Store learning data in persistent memory
            await self.agent._store_memory("learning_data", self.learning_data, "long_term")
            
            self.agent.logger.info(f"Learned from detection {threat_id}: {'TP' if is_true_positive else 'FP'}")
            
        except Exception as e:
            self.agent.logger.error(f"Learning from detection failed: {e}")
            
    async def _update_detection_patterns(self, threat_data: Dict[str, Any], 
                                       is_true_positive: bool) -> None:
        """Update detection patterns based on feedback."""
        try:
            threat_type = threat_data.get("threat_type")
            rule_id = threat_data.get("rule_id")
            
            if not threat_type or not rule_id:
                return
                
            # Initialize pattern data if not exists
            if threat_type not in self.learning_data["threat_patterns"]:
                self.learning_data["threat_patterns"][threat_type] = {
                    "true_positives": 0,
                    "false_positives": 0,
                    "accuracy": 0.0,
                    "confidence_adjustments": {},
                    "pattern_refinements": []
                }
                
            pattern_data = self.learning_data["threat_patterns"][threat_type]
            
            if is_true_positive:
                pattern_data["true_positives"] += 1
                
                # Strengthen detection patterns for true positives
                await self._strengthen_detection_rule(rule_id, threat_data)
                
            else:
                pattern_data["false_positives"] += 1
                
                # Weaken or refine detection patterns for false positives
                await self._refine_detection_rule(rule_id, threat_data)
                
            # Update accuracy
            total_detections = pattern_data["true_positives"] + pattern_data["false_positives"]
            if total_detections > 0:
                pattern_data["accuracy"] = pattern_data["true_positives"] / total_detections
                
        except Exception as e:
            self.agent.logger.error(f"Pattern update failed: {e}")
            
    async def _strengthen_detection_rule(self, rule_id: str, threat_data: Dict[str, Any]) -> None:
        """Strengthen a detection rule based on true positive."""
        try:
            # Find the rule in detection engine
            for rule in self.agent.detection_engine.detection_rules:
                if rule.get("rule_id") == rule_id:
                    # Increase confidence or lower thresholds for this rule
                    conditions = rule.get("conditions", {})
                    
                    # Adjust thresholds to be more sensitive
                    if "count_threshold" in conditions:
                        current_threshold = conditions["count_threshold"]
                        # Slightly lower threshold to catch similar patterns
                        new_threshold = max(1, int(current_threshold * 0.9))
                        conditions["count_threshold"] = new_threshold
                        
                    # Add pattern refinements
                    pattern_key = f"{rule_id}_strengthened"
                    if threat_data.get("threat_type") in self.learning_data["threat_patterns"]:
                        pattern_data = self.learning_data["threat_patterns"][threat_data["threat_type"]]
                        pattern_data["pattern_refinements"].append({
                            "type": "strengthen",
                            "rule_id": rule_id,
                            "adjustment": "lowered_threshold",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        
                    break
                    
        except Exception as e:
            self.agent.logger.error(f"Rule strengthening failed: {e}")
            
    async def _refine_detection_rule(self, rule_id: str, threat_data: Dict[str, Any]) -> None:
        """Refine a detection rule to reduce false positives."""
        try:
            # Find the rule in detection engine
            for rule in self.agent.detection_engine.detection_rules:
                if rule.get("rule_id") == rule_id:
                    # Increase thresholds or add exclusions to reduce false positives
                    conditions = rule.get("conditions", {})
                    
                    # Adjust thresholds to be less sensitive
                    if "count_threshold" in conditions:
                        current_threshold = conditions["count_threshold"]
                        # Slightly raise threshold to reduce false positives
                        new_threshold = int(current_threshold * 1.1)
                        conditions["count_threshold"] = new_threshold
                        
                    # Add exclusion patterns based on false positive characteristics
                    exclusions = rule.get("exclusions", [])
                    
                    # Analyze false positive for exclusion patterns
                    fp_source_ip = threat_data.get("original_data", {}).get("log_entry", {}).get("sourceIPAddress")
                    if fp_source_ip and self._is_internal_ip(fp_source_ip):
                        exclusions.append({"source_ip_range": "internal"})
                        
                    rule["exclusions"] = exclusions
                    
                    # Record refinement
                    pattern_key = f"{rule_id}_refined"
                    if threat_data.get("threat_type") in self.learning_data["threat_patterns"]:
                        pattern_data = self.learning_data["threat_patterns"][threat_data["threat_type"]]
                        pattern_data["pattern_refinements"].append({
                            "type": "refine",
                            "rule_id": rule_id,
                            "adjustment": "raised_threshold_added_exclusions",
                            "timestamp": datetime.utcnow().isoformat()
                        })
                        
                    break
                    
        except Exception as e:
            self.agent.logger.error(f"Rule refinement failed: {e}")
            
    def _is_internal_ip(self, ip_address: str) -> bool:
        """Check if IP address is internal/private."""
        # Simplified internal IP check
        return (ip_address.startswith("192.168.") or 
                ip_address.startswith("10.") or 
                ip_address.startswith("172."))
                
    async def _update_accuracy_metrics(self, threat_data: Dict[str, Any], 
                                     is_true_positive: bool) -> None:
        """Update detection accuracy metrics."""
        try:
            rule_id = threat_data.get("rule_id", "unknown")
            
            if rule_id not in self.learning_data["detection_accuracy"]:
                self.learning_data["detection_accuracy"][rule_id] = {
                    "total_detections": 0,
                    "true_positives": 0,
                    "false_positives": 0,
                    "accuracy": 0.0,
                    "precision": 0.0
                }
                
            accuracy_data = self.learning_data["detection_accuracy"][rule_id]
            accuracy_data["total_detections"] += 1
            
            if is_true_positive:
                accuracy_data["true_positives"] += 1
            else:
                accuracy_data["false_positives"] += 1
                
            # Calculate metrics
            total = accuracy_data["total_detections"]
            tp = accuracy_data["true_positives"]
            fp = accuracy_data["false_positives"]
            
            accuracy_data["accuracy"] = tp / total if total > 0 else 0.0
            accuracy_data["precision"] = tp / (tp + fp) if (tp + fp) > 0 else 0.0
            
        except Exception as e:
            self.agent.logger.error(f"Accuracy metrics update failed: {e}")
            
    async def learn_behavioral_baseline(self, user_id: str, 
                                      activity_data: Dict[str, Any]) -> None:
        """Learn and update behavioral baselines for users."""
        try:
            if user_id not in self.learning_data["behavioral_baselines"]:
                self.learning_data["behavioral_baselines"][user_id] = {
                    "login_patterns": {
                        "typical_hours": [],
                        "typical_days": [],
                        "typical_locations": []
                    },
                    "access_patterns": {
                        "typical_resources": [],
                        "access_frequency": {},
                        "data_volume_patterns": []
                    },
                    "last_updated": datetime.utcnow().isoformat(),
                    "sample_count": 0
                }
                
            baseline = self.learning_data["behavioral_baselines"][user_id]
            baseline["sample_count"] += 1
            
            # Update login patterns
            if "login_time" in activity_data:
                login_time = datetime.fromisoformat(activity_data["login_time"])
                baseline["login_patterns"]["typical_hours"].append(login_time.hour)
                baseline["login_patterns"]["typical_days"].append(login_time.weekday())
                
                # Keep only recent patterns (last 100 samples)
                for pattern_list in baseline["login_patterns"].values():
                    if isinstance(pattern_list, list) and len(pattern_list) > 100:
                        pattern_list[:] = pattern_list[-100:]
                        
            # Update access patterns
            if "accessed_resources" in activity_data:
                resources = activity_data["accessed_resources"]
                baseline["access_patterns"]["typical_resources"].extend(resources)
                
                # Update access frequency
                for resource in resources:
                    freq = baseline["access_patterns"]["access_frequency"]
                    freq[resource] = freq.get(resource, 0) + 1
                    
            # Update data volume patterns
            if "data_volume" in activity_data:
                volume = activity_data["data_volume"]
                baseline["access_patterns"]["data_volume_patterns"].append(volume)
                
                # Keep only recent patterns
                if len(baseline["access_patterns"]["data_volume_patterns"]) > 100:
                    baseline["access_patterns"]["data_volume_patterns"] = \
                        baseline["access_patterns"]["data_volume_patterns"][-100:]
                        
            baseline["last_updated"] = datetime.utcnow().isoformat()
            
            # Update detection engine baseline
            await self.agent.detection_engine.update_baseline_behavior(user_id, activity_data)
            
            # Store updated baseline
            await self.agent._store_memory(f"behavioral_baseline_{user_id}", baseline, "long_term")
            
        except Exception as e:
            self.agent.logger.error(f"Behavioral baseline learning failed: {e}")
            
    async def detect_behavioral_anomalies(self, user_id: str, 
                                        current_activity: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Detect anomalies based on learned behavioral baselines."""
        anomalies = []
        
        try:
            if user_id not in self.learning_data["behavioral_baselines"]:
                # No baseline yet, everything is potentially anomalous
                return [{
                    "anomaly_type": "no_baseline",
                    "severity": "info",
                    "description": f"No behavioral baseline established for user {user_id}",
                    "confidence": 0.3
                }]
                
            baseline = self.learning_data["behavioral_baselines"][user_id]
            
            # Check login time anomalies
            if "login_time" in current_activity:
                login_time = datetime.fromisoformat(current_activity["login_time"])
                typical_hours = baseline["login_patterns"]["typical_hours"]
                
                if typical_hours and login_time.hour not in typical_hours:
                    # Calculate how unusual this hour is
                    hour_frequency = typical_hours.count(login_time.hour) / len(typical_hours)
                    if hour_frequency < 0.1:  # Less than 10% of typical logins
                        anomalies.append({
                            "anomaly_type": "unusual_login_time",
                            "severity": "medium",
                            "description": f"Login at unusual hour: {login_time.hour}:00",
                            "confidence": 0.8,
                            "baseline_hours": list(set(typical_hours))
                        })
                        
            # Check access pattern anomalies
            if "accessed_resources" in current_activity:
                current_resources = set(current_activity["accessed_resources"])
                typical_resources = set(baseline["access_patterns"]["typical_resources"])
                
                # Check for access to unusual resources
                unusual_resources = current_resources - typical_resources
                if unusual_resources:
                    anomalies.append({
                        "anomaly_type": "unusual_resource_access",
                        "severity": "high",
                        "description": f"Access to unusual resources: {list(unusual_resources)}",
                        "confidence": 0.9,
                        "unusual_resources": list(unusual_resources)
                    })
                    
            # Check data volume anomalies
            if "data_volume" in current_activity:
                current_volume = current_activity["data_volume"]
                volume_patterns = baseline["access_patterns"]["data_volume_patterns"]
                
                if volume_patterns:
                    avg_volume = sum(volume_patterns) / len(volume_patterns)
                    std_dev = (sum((x - avg_volume) ** 2 for x in volume_patterns) / len(volume_patterns)) ** 0.5
                    
                    # Check if current volume is more than 3 standard deviations from mean
                    if abs(current_volume - avg_volume) > 3 * std_dev:
                        anomalies.append({
                            "anomaly_type": "unusual_data_volume",
                            "severity": "high",
                            "description": f"Unusual data volume: {current_volume} (avg: {avg_volume:.2f})",
                            "confidence": 0.85,
                            "current_volume": current_volume,
                            "average_volume": avg_volume
                        })
                        
        except Exception as e:
            self.agent.logger.error(f"Behavioral anomaly detection failed: {e}")
            
        return anomalies
        
    async def get_learning_statistics(self) -> Dict[str, Any]:
        """Get statistics about the learning engine."""
        try:
            stats = {
                "learning_enabled": self.learning_enabled,
                "total_confirmed_threats": len(self.learning_data["confirmed_threats"]),
                "total_false_positives": len(self.learning_data["false_positives"]),
                "behavioral_baselines_count": len(self.learning_data["behavioral_baselines"]),
                "threat_patterns_learned": len(self.learning_data["threat_patterns"]),
                "detection_accuracy": {}
            }
            
            # Calculate overall accuracy
            total_tp = sum(data["true_positives"] for data in self.learning_data["detection_accuracy"].values())
            total_fp = sum(data["false_positives"] for data in self.learning_data["detection_accuracy"].values())
            total_detections = total_tp + total_fp
            
            if total_detections > 0:
                stats["overall_accuracy"] = total_tp / total_detections
                stats["overall_precision"] = total_tp / (total_tp + total_fp) if (total_tp + total_fp) > 0 else 0.0
            else:
                stats["overall_accuracy"] = 0.0
                stats["overall_precision"] = 0.0
                
            # Rule-specific accuracy
            for rule_id, accuracy_data in self.learning_data["detection_accuracy"].items():
                stats["detection_accuracy"][rule_id] = {
                    "accuracy": accuracy_data["accuracy"],
                    "precision": accuracy_data["precision"],
                    "total_detections": accuracy_data["total_detections"]
                }
                
            return stats
            
        except Exception as e:
            self.agent.logger.error(f"Learning statistics failed: {e}")
            return {"error": str(e)}
            
    async def export_learned_patterns(self) -> Dict[str, Any]:
        """Export learned patterns for sharing with other agents."""
        try:
            export_data = {
                "export_timestamp": datetime.utcnow().isoformat(),
                "agent_id": self.agent.agent_id,
                "threat_patterns": {},
                "detection_rules": [],
                "behavioral_insights": {}
            }
            
            # Export refined threat patterns
            for threat_type, pattern_data in self.learning_data["threat_patterns"].items():
                if pattern_data["accuracy"] > 0.8:  # Only export high-accuracy patterns
                    export_data["threat_patterns"][threat_type] = {
                        "accuracy": pattern_data["accuracy"],
                        "refinements": pattern_data["pattern_refinements"][-5:],  # Last 5 refinements
                        "confidence_level": "high" if pattern_data["accuracy"] > 0.9 else "medium"
                    }
                    
            # Export improved detection rules
            for rule in self.agent.detection_engine.detection_rules:
                rule_id = rule.get("rule_id")
                if rule_id in self.learning_data["detection_accuracy"]:
                    accuracy_data = self.learning_data["detection_accuracy"][rule_id]
                    if accuracy_data["accuracy"] > 0.8 and accuracy_data["total_detections"] >= 10:
                        export_data["detection_rules"].append({
                            "rule": rule,
                            "performance": accuracy_data
                        })
                        
            # Export behavioral insights (anonymized)
            baseline_count = len(self.learning_data["behavioral_baselines"])
            if baseline_count > 0:
                export_data["behavioral_insights"] = {
                    "total_users_profiled": baseline_count,
                    "common_anomaly_patterns": self._get_common_anomaly_patterns(),
                    "baseline_quality": "high" if baseline_count > 50 else "medium"
                }
                
            return export_data
            
        except Exception as e:
            self.agent.logger.error(f"Pattern export failed: {e}")
            return {"error": str(e)}
            
    def _get_common_anomaly_patterns(self) -> List[Dict[str, Any]]:
        """Get common anomaly patterns from behavioral analysis."""
        # Analyze common patterns across all baselines
        common_patterns = []
        
        try:
            all_anomalies = []
            
            # This would analyze historical anomaly data
            # For now, return common pattern types
            common_patterns = [
                {
                    "pattern_type": "off_hours_access",
                    "frequency": "common",
                    "typical_severity": "medium"
                },
                {
                    "pattern_type": "unusual_resource_access",
                    "frequency": "moderate", 
                    "typical_severity": "high"
                },
                {
                    "pattern_type": "data_volume_spike",
                    "frequency": "rare",
                    "typical_severity": "high"
                }
            ]
            
        except Exception as e:
            self.agent.logger.error(f"Common pattern analysis failed: {e}")
            
        return common_patterns


# Add learning engine to ThreatHunterAgent
def _add_learning_capabilities(self):
    """Add learning capabilities to the threat hunter agent."""
    # Initialize learning engine
    self.learning_engine = ThreatLearningEngine(self)
    
    # Add learning-related capabilities
    self.capabilities.extend([
        "pattern_learning",
        "behavioral_analysis", 
        "accuracy_improvement",
        "false_positive_reduction"
    ])

# Monkey patch the learning capabilities into ThreatHunterAgent
ThreatHunterAgent._add_learning_capabilities = _add_learning_capabilities

# Update the ThreatHunterAgent initialization to include learning
original_init = ThreatHunterAgent.__init__

def enhanced_init(self, agent_id: str = "threat-hunter-001"):
    original_init(self, agent_id)
    self._add_learning_capabilities()

ThreatHunterAgent.__init__ = enhanced_init