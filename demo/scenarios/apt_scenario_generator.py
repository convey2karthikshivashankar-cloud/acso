"""
Advanced Persistent Threat (APT) Scenario Generator for ACSO Phase 5 Agentic Demonstrations.

This module creates realistic multi-stage APT attack scenarios with evidence trails,
attack progression, and randomization for compelling demonstrations.
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


class APTStage(str, Enum):
    """Stages of an APT attack."""
    RECONNAISSANCE = "reconnaissance"
    INITIAL_ACCESS = "initial_access"
    PERSISTENCE = "persistence"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DEFENSE_EVASION = "defense_evasion"
    CREDENTIAL_ACCESS = "credential_access"
    DISCOVERY = "discovery"
    LATERAL_MOVEMENT = "lateral_movement"
    COLLECTION = "collection"
    COMMAND_CONTROL = "command_control"
    EXFILTRATION = "exfiltration"
    IMPACT = "impact"


class AttackVector(str, Enum):
    """Attack vectors used in APT campaigns."""
    SPEAR_PHISHING = "spear_phishing"
    WATERING_HOLE = "watering_hole"
    SUPPLY_CHAIN = "supply_chain"
    REMOTE_EXPLOIT = "remote_exploit"
    INSIDER_THREAT = "insider_threat"
    PHYSICAL_ACCESS = "physical_access"


class TTPCategory(str, Enum):
    """MITRE ATT&CK TTP categories."""
    INITIAL_ACCESS = "initial_access"
    EXECUTION = "execution"
    PERSISTENCE = "persistence"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    DEFENSE_EVASION = "defense_evasion"
    CREDENTIAL_ACCESS = "credential_access"
    DISCOVERY = "discovery"
    LATERAL_MOVEMENT = "lateral_movement"
    COLLECTION = "collection"
    COMMAND_AND_CONTROL = "command_and_control"
    EXFILTRATION = "exfiltration"
    IMPACT = "impact"


@dataclass
class APTTechnique:
    """Represents a specific APT technique."""
    technique_id: str
    name: str
    category: TTPCategory
    description: str
    indicators: List[str]
    detection_difficulty: float  # 0.0 to 1.0
    success_probability: float  # 0.0 to 1.0
    prerequisites: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "technique_id": self.technique_id,
            "name": self.name,
            "category": self.category.value,
            "description": self.description,
            "indicators": self.indicators,
            "detection_difficulty": self.detection_difficulty,
            "success_probability": self.success_probability,
            "prerequisites": self.prerequisites,
            "metadata": self.metadata
        }


@dataclass
class APTStageExecution:
    """Represents the execution of an APT stage."""
    stage_id: str
    stage: APTStage
    techniques: List[APTTechnique]
    start_time: datetime
    end_time: datetime
    success: bool
    evidence_generated: List[str]
    assets_compromised: List[str]
    data_accessed: List[str]
    persistence_mechanisms: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "stage_id": self.stage_id,
            "stage": self.stage.value,
            "techniques": [t.to_dict() for t in self.techniques],
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat(),
            "success": self.success,
            "evidence_generated": self.evidence_generated,
            "assets_compromised": self.assets_compromised,
            "data_accessed": self.data_accessed,
            "persistence_mechanisms": self.persistence_mechanisms,
            "metadata": self.metadata
        }


@dataclass
class APTCampaign:
    """Represents a complete APT campaign."""
    campaign_id: str
    name: str
    threat_actor: str
    attack_vector: AttackVector
    target_description: str
    objectives: List[str]
    stages: List[APTStageExecution]
    start_time: datetime
    end_time: Optional[datetime]
    status: str
    detection_timeline: List[Dict[str, Any]]
    impact_assessment: Dict[str, Any]
    attribution_confidence: float
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "campaign_id": self.campaign_id,
            "name": self.name,
            "threat_actor": self.threat_actor,
            "attack_vector": self.attack_vector.value,
            "target_description": self.target_description,
            "objectives": self.objectives,
            "stages": [s.to_dict() for s in self.stages],
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "status": self.status,
            "detection_timeline": self.detection_timeline,
            "impact_assessment": self.impact_assessment,
            "attribution_confidence": self.attribution_confidence,
            "metadata": self.metadata
        }


class APTScenarioGenerator:
    """Generates realistic APT attack scenarios."""
    
    def __init__(self):
        self.config = {
            "campaign_duration_days": (30, 180),
            "stage_duration_hours": (1, 72),
            "detection_delay_hours": (0, 168),  # 0 to 1 week
            "success_rate_variation": 0.2
        }
        
        self.apt_groups = [
            {"name": "APT1", "origin": "China", "sophistication": "high"},
            {"name": "APT28", "origin": "Russia", "sophistication": "very_high"},
            {"name": "APT29", "origin": "Russia", "sophistication": "very_high"},
            {"name": "Lazarus Group", "origin": "North Korea", "sophistication": "high"},
            {"name": "APT40", "origin": "China", "sophistication": "high"},
            {"name": "Carbanak", "origin": "Unknown", "sophistication": "high"},
            {"name": "FIN7", "origin": "Unknown", "sophistication": "medium"},
            {"name": "Equation Group", "origin": "Unknown", "sophistication": "very_high"}
        ]
        
        self.attack_objectives = [
            "Intellectual Property Theft",
            "Financial Gain",
            "Espionage",
            "Sabotage",
            "Ransomware Deployment",
            "Supply Chain Compromise",
            "Critical Infrastructure Disruption",
            "Political Intelligence"
        ]
        
        # Initialize technique library
        self.technique_library = self._initialize_technique_library()
        
    def _initialize_technique_library(self) -> Dict[TTPCategory, List[APTTechnique]]:
        """Initialize the MITRE ATT&CK technique library."""
        library = {}
        
        # Initial Access techniques
        library[TTPCategory.INITIAL_ACCESS] = [
            APTTechnique(
                technique_id="T1566.001",
                name="Spearphishing Attachment",
                category=TTPCategory.INITIAL_ACCESS,
                description="Adversaries may send spearphishing emails with malicious attachments",
                indicators=["suspicious_email_attachment", "macro_execution", "process_creation"],
                detection_difficulty=0.3,
                success_probability=0.7
            ),
            APTTechnique(
                technique_id="T1566.002",
                name="Spearphishing Link",
                category=TTPCategory.INITIAL_ACCESS,
                description="Adversaries may send spearphishing emails with malicious links",
                indicators=["suspicious_url_click", "browser_redirect", "credential_harvesting"],
                detection_difficulty=0.4,
                success_probability=0.6
            ),
            APTTechnique(
                technique_id="T1190",
                name="Exploit Public-Facing Application",
                category=TTPCategory.INITIAL_ACCESS,
                description="Adversaries may exploit vulnerabilities in public-facing applications",
                indicators=["exploit_attempt", "unusual_web_traffic", "process_injection"],
                detection_difficulty=0.5,
                success_probability=0.8
            )
        ]
        
        # Execution techniques
        library[TTPCategory.EXECUTION] = [
            APTTechnique(
                technique_id="T1059.001",
                name="PowerShell",
                category=TTPCategory.EXECUTION,
                description="Adversaries may abuse PowerShell commands and scripts",
                indicators=["powershell_execution", "encoded_command", "script_block_logging"],
                detection_difficulty=0.2,
                success_probability=0.9
            ),
            APTTechnique(
                technique_id="T1059.003",
                name="Windows Command Shell",
                category=TTPCategory.EXECUTION,
                description="Adversaries may abuse the Windows command shell",
                indicators=["cmd_execution", "batch_file", "command_line_logging"],
                detection_difficulty=0.1,
                success_probability=0.95
            )
        ]
        
        # Persistence techniques
        library[TTPCategory.PERSISTENCE] = [
            APTTechnique(
                technique_id="T1547.001",
                name="Registry Run Keys / Startup Folder",
                category=TTPCategory.PERSISTENCE,
                description="Adversaries may achieve persistence by adding programs to startup folders",
                indicators=["registry_modification", "startup_folder_change", "autorun_entry"],
                detection_difficulty=0.2,
                success_probability=0.8
            ),
            APTTechnique(
                technique_id="T1053.005",
                name="Scheduled Task",
                category=TTPCategory.PERSISTENCE,
                description="Adversaries may abuse the Windows Task Scheduler",
                indicators=["scheduled_task_creation", "schtasks_execution", "task_scheduler_logs"],
                detection_difficulty=0.3,
                success_probability=0.7
            )
        ]
        
        # Add more techniques for other categories...
        library[TTPCategory.PRIVILEGE_ESCALATION] = [
            APTTechnique(
                technique_id="T1055",
                name="Process Injection",
                category=TTPCategory.PRIVILEGE_ESCALATION,
                description="Adversaries may inject code into processes",
                indicators=["process_hollowing", "dll_injection", "memory_anomaly"],
                detection_difficulty=0.7,
                success_probability=0.6
            )
        ]
        
        library[TTPCategory.DEFENSE_EVASION] = [
            APTTechnique(
                technique_id="T1027",
                name="Obfuscated Files or Information",
                category=TTPCategory.DEFENSE_EVASION,
                description="Adversaries may obfuscate files or information",
                indicators=["encoded_payload", "packed_executable", "string_obfuscation"],
                detection_difficulty=0.8,
                success_probability=0.7
            )
        ]
        
        library[TTPCategory.CREDENTIAL_ACCESS] = [
            APTTechnique(
                technique_id="T1003.001",
                name="LSASS Memory",
                category=TTPCategory.CREDENTIAL_ACCESS,
                description="Adversaries may dump credentials from LSASS memory",
                indicators=["lsass_access", "mimikatz_usage", "credential_dumping"],
                detection_difficulty=0.4,
                success_probability=0.8
            )
        ]
        
        library[TTPCategory.DISCOVERY] = [
            APTTechnique(
                technique_id="T1083",
                name="File and Directory Discovery",
                category=TTPCategory.DISCOVERY,
                description="Adversaries may enumerate files and directories",
                indicators=["file_enumeration", "directory_listing", "find_command"],
                detection_difficulty=0.1,
                success_probability=0.95
            )
        ]
        
        library[TTPCategory.LATERAL_MOVEMENT] = [
            APTTechnique(
                technique_id="T1021.001",
                name="Remote Desktop Protocol",
                category=TTPCategory.LATERAL_MOVEMENT,
                description="Adversaries may use RDP to move laterally",
                indicators=["rdp_connection", "remote_logon", "network_authentication"],
                detection_difficulty=0.2,
                success_probability=0.8
            )
        ]
        
        library[TTPCategory.COLLECTION] = [
            APTTechnique(
                technique_id="T1005",
                name="Data from Local System",
                category=TTPCategory.COLLECTION,
                description="Adversaries may search local systems for data",
                indicators=["file_access", "data_staging", "compression_activity"],
                detection_difficulty=0.3,
                success_probability=0.9
            )
        ]
        
        library[TTPCategory.COMMAND_AND_CONTROL] = [
            APTTechnique(
                technique_id="T1071.001",
                name="Web Protocols",
                category=TTPCategory.COMMAND_AND_CONTROL,
                description="Adversaries may communicate using web protocols",
                indicators=["http_beaconing", "dns_tunneling", "encrypted_traffic"],
                detection_difficulty=0.6,
                success_probability=0.8
            )
        ]
        
        library[TTPCategory.EXFILTRATION] = [
            APTTechnique(
                technique_id="T1041",
                name="Exfiltration Over C2 Channel",
                category=TTPCategory.EXFILTRATION,
                description="Adversaries may steal data over their C2 channel",
                indicators=["data_upload", "large_outbound_transfer", "encrypted_exfiltration"],
                detection_difficulty=0.5,
                success_probability=0.7
            )
        ]
        
        library[TTPCategory.IMPACT] = [
            APTTechnique(
                technique_id="T1486",
                name="Data Encrypted for Impact",
                category=TTPCategory.IMPACT,
                description="Adversaries may encrypt data to impact availability",
                indicators=["file_encryption", "ransom_note", "crypto_activity"],
                detection_difficulty=0.1,
                success_probability=0.9
            )
        ]
        
        return library
        
    async def generate_apt_campaign(self, campaign_config: Optional[Dict[str, Any]] = None) -> APTCampaign:
        """Generate a complete APT campaign scenario."""
        config = campaign_config or {}
        
        # Select threat actor
        threat_actor = config.get("threat_actor") or random.choice(self.apt_groups)
        
        # Generate campaign details
        campaign_id = str(uuid.uuid4())
        campaign_name = f"Operation {random.choice(['Stealth', 'Shadow', 'Silent', 'Ghost', 'Phantom'])} {random.choice(['Dragon', 'Bear', 'Tiger', 'Wolf', 'Eagle'])}"
        
        attack_vector = config.get("attack_vector") or random.choice(list(AttackVector))
        objectives = config.get("objectives") or random.sample(self.attack_objectives, random.randint(1, 3))
        
        # Generate timeline
        start_time = config.get("start_time") or (datetime.utcnow() - timedelta(
            days=random.randint(*self.config["campaign_duration_days"])
        ))
        
        # Generate campaign stages
        stages = await self._generate_campaign_stages(start_time, threat_actor, attack_vector)
        
        # Determine campaign end time
        if stages:
            end_time = max(stage.end_time for stage in stages)
            status = "completed" if random.random() > 0.3 else "ongoing"
        else:
            end_time = None
            status = "failed"
            
        # Generate detection timeline
        detection_timeline = await self._generate_detection_timeline(stages)
        
        # Generate impact assessment
        impact_assessment = await self._generate_impact_assessment(stages, objectives)
        
        campaign = APTCampaign(
            campaign_id=campaign_id,
            name=campaign_name,
            threat_actor=threat_actor["name"],
            attack_vector=attack_vector,
            target_description=config.get("target", "Enterprise network infrastructure"),
            objectives=objectives,
            stages=stages,
            start_time=start_time,
            end_time=end_time,
            status=status,
            detection_timeline=detection_timeline,
            impact_assessment=impact_assessment,
            attribution_confidence=random.uniform(0.6, 0.95),
            metadata={
                "sophistication": threat_actor["sophistication"],
                "origin": threat_actor["origin"],
                "campaign_type": "targeted_attack",
                "industry_target": config.get("industry", "technology"),
                "estimated_cost": random.randint(100000, 5000000)
            }
        )
        
        return campaign
        
    async def _generate_campaign_stages(self, start_time: datetime, threat_actor: Dict[str, Any], 
                                      attack_vector: AttackVector) -> List[APTStageExecution]:
        """Generate the stages of an APT campaign."""
        stages = []
        current_time = start_time
        
        # Define stage progression based on attack vector
        stage_progression = self._get_stage_progression(attack_vector)
        
        compromised_assets = []
        collected_credentials = []
        
        for stage_type in stage_progression:
            # Determine if stage should be executed
            if not self._should_execute_stage(stage_type, stages, threat_actor):
                continue
                
            stage_execution = await self._generate_stage_execution(
                stage_type, current_time, threat_actor, compromised_assets, collected_credentials
            )
            
            if stage_execution:
                stages.append(stage_execution)
                current_time = stage_execution.end_time
                
                # Update campaign state
                compromised_assets.extend(stage_execution.assets_compromised)
                if stage_type == APTStage.CREDENTIAL_ACCESS:
                    collected_credentials.extend(stage_execution.data_accessed)
                    
        return stages
        
    def _get_stage_progression(self, attack_vector: AttackVector) -> List[APTStage]:
        """Get the typical stage progression for an attack vector."""
        base_progression = [
            APTStage.RECONNAISSANCE,
            APTStage.INITIAL_ACCESS,
            APTStage.EXECUTION,
            APTStage.PERSISTENCE,
            APTStage.PRIVILEGE_ESCALATION,
            APTStage.DEFENSE_EVASION,
            APTStage.CREDENTIAL_ACCESS,
            APTStage.DISCOVERY,
            APTStage.LATERAL_MOVEMENT,
            APTStage.COLLECTION,
            APTStage.COMMAND_CONTROL,
            APTStage.EXFILTRATION
        ]
        
        # Modify progression based on attack vector
        if attack_vector == AttackVector.INSIDER_THREAT:
            # Insider threats may skip initial access
            base_progression.remove(APTStage.INITIAL_ACCESS)
        elif attack_vector == AttackVector.SUPPLY_CHAIN:
            # Supply chain attacks may have persistence from the start
            base_progression.insert(1, APTStage.PERSISTENCE)
            
        # Randomly include impact stage
        if random.random() < 0.3:
            base_progression.append(APTStage.IMPACT)
            
        return base_progression
        
    def _should_execute_stage(self, stage_type: APTStage, completed_stages: List[APTStageExecution], 
                            threat_actor: Dict[str, Any]) -> bool:
        """Determine if a stage should be executed."""
        # Base probability based on threat actor sophistication
        sophistication_multiplier = {
            "low": 0.6,
            "medium": 0.7,
            "high": 0.8,
            "very_high": 0.9
        }.get(threat_actor["sophistication"], 0.7)
        
        # Stage-specific probabilities
        stage_probabilities = {
            APTStage.RECONNAISSANCE: 0.9,
            APTStage.INITIAL_ACCESS: 0.95,
            APTStage.PERSISTENCE: 0.8,
            APTStage.PRIVILEGE_ESCALATION: 0.7,
            APTStage.DEFENSE_EVASION: 0.6,
            APTStage.CREDENTIAL_ACCESS: 0.8,
            APTStage.DISCOVERY: 0.9,
            APTStage.LATERAL_MOVEMENT: 0.7,
            APTStage.COLLECTION: 0.8,
            APTStage.COMMAND_CONTROL: 0.9,
            APTStage.EXFILTRATION: 0.6,
            APTStage.IMPACT: 0.3
        }
        
        base_probability = stage_probabilities.get(stage_type, 0.5)
        final_probability = base_probability * sophistication_multiplier
        
        return random.random() < final_probability
        
    async def _generate_stage_execution(self, stage_type: APTStage, start_time: datetime,
                                      threat_actor: Dict[str, Any], compromised_assets: List[str],
                                      collected_credentials: List[str]) -> Optional[APTStageExecution]:
        """Generate execution details for a specific stage."""
        # Select techniques for this stage
        category_map = {
            APTStage.INITIAL_ACCESS: TTPCategory.INITIAL_ACCESS,
            APTStage.PERSISTENCE: TTPCategory.PERSISTENCE,
            APTStage.PRIVILEGE_ESCALATION: TTPCategory.PRIVILEGE_ESCALATION,
            APTStage.DEFENSE_EVASION: TTPCategory.DEFENSE_EVASION,
            APTStage.CREDENTIAL_ACCESS: TTPCategory.CREDENTIAL_ACCESS,
            APTStage.DISCOVERY: TTPCategory.DISCOVERY,
            APTStage.LATERAL_MOVEMENT: TTPCategory.LATERAL_MOVEMENT,
            APTStage.COLLECTION: TTPCategory.COLLECTION,
            APTStage.COMMAND_CONTROL: TTPCategory.COMMAND_AND_CONTROL,
            APTStage.EXFILTRATION: TTPCategory.EXFILTRATION,
            APTStage.IMPACT: TTPCategory.IMPACT
        }
        
        if stage_type == APTStage.RECONNAISSANCE:
            techniques = self._generate_reconnaissance_techniques()
        else:
            category = category_map.get(stage_type)
            if category and category in self.technique_library:
                available_techniques = self.technique_library[category]
                techniques = random.sample(available_techniques, 
                                         min(len(available_techniques), random.randint(1, 3)))
            else:
                techniques = []
                
        if not techniques:
            return None
            
        # Calculate stage duration
        duration_hours = random.randint(*self.config["stage_duration_hours"])
        end_time = start_time + timedelta(hours=duration_hours)
        
        # Determine stage success
        success_probability = min(technique.success_probability for technique in techniques)
        success = random.random() < success_probability
        
        # Generate stage-specific outputs
        evidence_generated = self._generate_stage_evidence(stage_type, techniques, success)
        assets_compromised = self._generate_compromised_assets(stage_type, success, compromised_assets)
        data_accessed = self._generate_accessed_data(stage_type, success)
        persistence_mechanisms = self._generate_persistence_mechanisms(stage_type, success)
        
        stage_execution = APTStageExecution(
            stage_id=str(uuid.uuid4()),
            stage=stage_type,
            techniques=techniques,
            start_time=start_time,
            end_time=end_time,
            success=success,
            evidence_generated=evidence_generated,
            assets_compromised=assets_compromised,
            data_accessed=data_accessed,
            persistence_mechanisms=persistence_mechanisms,
            metadata={
                "detection_probability": 1.0 - min(t.detection_difficulty for t in techniques),
                "impact_level": self._calculate_stage_impact(stage_type, success),
                "resources_used": random.randint(1, 10)
            }
        )
        
        return stage_execution
        
    def _generate_reconnaissance_techniques(self) -> List[APTTechnique]:
        """Generate reconnaissance techniques."""
        recon_techniques = [
            APTTechnique(
                technique_id="T1595.001",
                name="Scanning IP Blocks",
                category=TTPCategory.INITIAL_ACCESS,
                description="Adversaries may scan victim IP blocks",
                indicators=["port_scan", "network_enumeration", "service_discovery"],
                detection_difficulty=0.2,
                success_probability=0.9
            ),
            APTTechnique(
                technique_id="T1589.001",
                name="Credentials",
                category=TTPCategory.INITIAL_ACCESS,
                description="Adversaries may gather credentials via OSINT",
                indicators=["credential_harvesting", "data_breach_monitoring", "social_media_analysis"],
                detection_difficulty=0.8,
                success_probability=0.6
            )
        ]
        
        return random.sample(recon_techniques, random.randint(1, len(recon_techniques)))
        
    def _generate_stage_evidence(self, stage_type: APTStage, techniques: List[APTTechnique], 
                                success: bool) -> List[str]:
        """Generate evidence for a stage execution."""
        evidence = []
        
        for technique in techniques:
            if success or random.random() < 0.3:  # Some evidence even on failure
                evidence.extend(technique.indicators)
                
        # Add stage-specific evidence
        stage_evidence = {
            APTStage.RECONNAISSANCE: ["dns_queries", "whois_lookups", "social_engineering_attempts"],
            APTStage.INITIAL_ACCESS: ["malicious_email", "exploit_payload", "callback_traffic"],
            APTStage.PERSISTENCE: ["registry_changes", "scheduled_tasks", "service_installation"],
            APTStage.LATERAL_MOVEMENT: ["lateral_authentication", "remote_execution", "credential_reuse"],
            APTStage.EXFILTRATION: ["data_compression", "encrypted_uploads", "staging_directories"]
        }
        
        if stage_type in stage_evidence:
            evidence.extend(random.sample(stage_evidence[stage_type], 
                                        random.randint(1, len(stage_evidence[stage_type]))))
            
        return list(set(evidence))  # Remove duplicates
        
    def _generate_compromised_assets(self, stage_type: APTStage, success: bool, 
                                   existing_assets: List[str]) -> List[str]:
        """Generate list of newly compromised assets."""
        if not success:
            return []
            
        asset_types = ["workstation", "server", "database", "domain_controller", "web_server"]
        
        if stage_type == APTStage.INITIAL_ACCESS:
            return [f"{random.choice(asset_types)}_{random.randint(1, 100)}"]
        elif stage_type == APTStage.LATERAL_MOVEMENT:
            return [f"{random.choice(asset_types)}_{random.randint(1, 100)}" 
                   for _ in range(random.randint(1, 3))]
        elif stage_type == APTStage.PRIVILEGE_ESCALATION and existing_assets:
            # Escalate on existing assets
            return random.sample(existing_assets, min(len(existing_assets), random.randint(1, 2)))
            
        return []
        
    def _generate_accessed_data(self, stage_type: APTStage, success: bool) -> List[str]:
        """Generate list of accessed data."""
        if not success:
            return []
            
        data_types = {
            APTStage.CREDENTIAL_ACCESS: ["user_credentials", "service_accounts", "certificates"],
            APTStage.DISCOVERY: ["network_topology", "user_accounts", "system_configuration"],
            APTStage.COLLECTION: ["financial_data", "customer_records", "intellectual_property"],
            APTStage.EXFILTRATION: ["sensitive_documents", "database_exports", "source_code"]
        }
        
        if stage_type in data_types:
            available_data = data_types[stage_type]
            return random.sample(available_data, random.randint(1, len(available_data)))
            
        return []
        
    def _generate_persistence_mechanisms(self, stage_type: APTStage, success: bool) -> List[str]:
        """Generate persistence mechanisms established."""
        if stage_type != APTStage.PERSISTENCE or not success:
            return []
            
        mechanisms = [
            "registry_autorun",
            "scheduled_task",
            "service_installation",
            "dll_hijacking",
            "wmi_subscription",
            "startup_folder"
        ]
        
        return random.sample(mechanisms, random.randint(1, 3))
        
    def _calculate_stage_impact(self, stage_type: APTStage, success: bool) -> str:
        """Calculate the impact level of a stage."""
        if not success:
            return "none"
            
        impact_levels = {
            APTStage.RECONNAISSANCE: "low",
            APTStage.INITIAL_ACCESS: "medium",
            APTStage.PERSISTENCE: "medium",
            APTStage.PRIVILEGE_ESCALATION: "high",
            APTStage.LATERAL_MOVEMENT: "high",
            APTStage.EXFILTRATION: "critical",
            APTStage.IMPACT: "critical"
        }
        
        return impact_levels.get(stage_type, "low")
        
    async def _generate_detection_timeline(self, stages: List[APTStageExecution]) -> List[Dict[str, Any]]:
        """Generate detection timeline for the campaign."""
        detections = []
        
        for stage in stages:
            # Determine if stage was detected
            detection_probability = stage.metadata.get("detection_probability", 0.5)
            
            if random.random() < detection_probability:
                # Add detection delay
                delay_hours = random.randint(*self.config["detection_delay_hours"])
                detection_time = stage.start_time + timedelta(hours=delay_hours)
                
                detection = {
                    "detection_id": str(uuid.uuid4()),
                    "detection_time": detection_time.isoformat(),
                    "stage_detected": stage.stage.value,
                    "detection_method": random.choice([
                        "SIEM Alert", "EDR Detection", "Network Monitoring", 
                        "User Report", "Threat Hunting", "External Intelligence"
                    ]),
                    "confidence": random.uniform(0.6, 0.95),
                    "indicators": random.sample(stage.evidence_generated, 
                                               min(len(stage.evidence_generated), 3)),
                    "response_actions": self._generate_response_actions(stage.stage)
                }
                
                detections.append(detection)
                
        return sorted(detections, key=lambda x: x["detection_time"])
        
    def _generate_response_actions(self, stage: APTStage) -> List[str]:
        """Generate response actions for detected stage."""
        base_actions = ["alert_generated", "analyst_assigned", "investigation_started"]
        
        stage_actions = {
            APTStage.INITIAL_ACCESS: ["email_quarantine", "user_notification", "endpoint_isolation"],
            APTStage.PERSISTENCE: ["registry_cleanup", "task_removal", "service_analysis"],
            APTStage.LATERAL_MOVEMENT: ["network_segmentation", "credential_reset", "access_review"],
            APTStage.EXFILTRATION: ["network_blocking", "data_classification", "legal_notification"]
        }
        
        actions = base_actions.copy()
        if stage in stage_actions:
            actions.extend(random.sample(stage_actions[stage], 
                                       random.randint(1, len(stage_actions[stage]))))
            
        return actions
        
    async def _generate_impact_assessment(self, stages: List[APTStageExecution], 
                                        objectives: List[str]) -> Dict[str, Any]:
        """Generate impact assessment for the campaign."""
        successful_stages = [s for s in stages if s.success]
        
        # Calculate various impact metrics
        data_compromised = sum(len(s.data_accessed) for s in successful_stages)
        assets_affected = len(set(asset for s in successful_stages for asset in s.assets_compromised))
        
        # Estimate financial impact
        base_cost = 50000  # Base incident cost
        cost_per_asset = 10000
        cost_per_data_type = 25000
        
        estimated_cost = base_cost + (assets_affected * cost_per_asset) + (data_compromised * cost_per_data_type)
        
        # Add objective-based costs
        objective_costs = {
            "Intellectual Property Theft": 500000,
            "Financial Gain": 200000,
            "Ransomware Deployment": 1000000,
            "Critical Infrastructure Disruption": 2000000
        }
        
        for objective in objectives:
            estimated_cost += objective_costs.get(objective, 100000)
            
        impact_assessment = {
            "overall_severity": self._calculate_overall_severity(successful_stages),
            "assets_compromised": assets_affected,
            "data_types_accessed": data_compromised,
            "estimated_financial_impact": estimated_cost,
            "business_disruption": random.choice(["minimal", "moderate", "significant", "severe"]),
            "regulatory_implications": len(objectives) > 2,
            "reputation_damage": random.choice(["low", "medium", "high"]),
            "recovery_time_estimate": f"{random.randint(1, 12)} weeks",
            "lessons_learned": self._generate_lessons_learned(stages)
        }
        
        return impact_assessment
        
    def _calculate_overall_severity(self, successful_stages: List[APTStageExecution]) -> str:
        """Calculate overall campaign severity."""
        if not successful_stages:
            return "low"
            
        critical_stages = [APTStage.EXFILTRATION, APTStage.IMPACT, APTStage.LATERAL_MOVEMENT]
        
        if any(s.stage in critical_stages for s in successful_stages):
            return "critical"
        elif len(successful_stages) > 5:
            return "high"
        elif len(successful_stages) > 2:
            return "medium"
        else:
            return "low"
            
    def _generate_lessons_learned(self, stages: List[APTStageExecution]) -> List[str]:
        """Generate lessons learned from the campaign."""
        lessons = [
            "Implement additional email security controls",
            "Enhance endpoint detection and response capabilities",
            "Improve network segmentation",
            "Strengthen privileged access management",
            "Increase security awareness training frequency"
        ]
        
        # Add stage-specific lessons
        stage_lessons = {
            APTStage.INITIAL_ACCESS: "Review and update email filtering rules",
            APTStage.PERSISTENCE: "Implement application whitelisting",
            APTStage.LATERAL_MOVEMENT: "Deploy network access control solutions",
            APTStage.EXFILTRATION: "Implement data loss prevention controls"
        }
        
        for stage in stages:
            if stage.stage in stage_lessons and stage.success:
                lessons.append(stage_lessons[stage.stage])
                
        return random.sample(lessons, min(len(lessons), 5))
        
    async def generate_multiple_campaigns(self, count: int = 3) -> List[APTCampaign]:
        """Generate multiple APT campaigns for demonstration."""
        campaigns = []
        
        for i in range(count):
            # Vary campaign characteristics
            config = {
                "threat_actor": random.choice(self.apt_groups),
                "attack_vector": random.choice(list(AttackVector)),
                "objectives": random.sample(self.attack_objectives, random.randint(1, 2)),
                "industry": random.choice(["technology", "finance", "healthcare", "government"])
            }
            
            campaign = await self.generate_apt_campaign(config)
            campaigns.append(campaign)
            
        return campaigns


# Global APT scenario generator instance
apt_scenario_generator = APTScenarioGenerator()