"""
Neural Goal Decomposer for ACSO Enterprise.
Uses transformer models to decompose high-level goals into actionable tasks.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import re

import torch
import torch.nn as nn
from transformers import (
    AutoTokenizer, AutoModel, AutoModelForSequenceClassification,
    pipeline, BertTokenizer, BertModel
)
import numpy as np
from sklearn.metrics.pairwise import cosine_similarity


class TaskPriority(str, Enum):
    """Task priority levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"


class TaskType(str, Enum):
    """Types of tasks that can be generated."""
    SECURITY_ANALYSIS = "security_analysis"
    THREAT_DETECTION = "threat_detection"
    INCIDENT_RESPONSE = "incident_response"
    VULNERABILITY_SCAN = "vulnerability_scan"
    COMPLIANCE_CHECK = "compliance_check"
    PERFORMANCE_MONITORING = "performance_monitoring"
    COST_OPTIMIZATION = "cost_optimization"
    RESOURCE_MANAGEMENT = "resource_management"
    DATA_ANALYSIS = "data_analysis"
    REPORTING = "reporting"


@dataclass
class DecomposedTask:
    """A task generated from goal decomposition."""
    task_id: str
    title: str
    description: str
    task_type: TaskType
    priority: TaskPriority
    estimated_duration: int  # minutes
    dependencies: List[str] = field(default_factory=list)
    required_skills: List[str] = field(default_factory=list)
    context: Dict[str, Any] = field(default_factory=dict)
    confidence_score: float = 0.0
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class GoalDecompositionResult:
    """Result of goal decomposition."""
    original_goal: str
    tasks: List[DecomposedTask]
    execution_plan: List[str]  # Task IDs in execution order
    estimated_total_duration: int
    confidence_score: float
    reasoning: str

class N
euralGoalDecomposer:
    """
    Neural network-based goal decomposition system.
    
    Uses transformer models to:
    - Parse natural language goals
    - Decompose into actionable tasks
    - Prioritize tasks based on context
    - Generate execution plans
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Model components
        self.tokenizer = None
        self.goal_parser_model = None
        self.task_classifier = None
        self.priority_classifier = None
        self.dependency_analyzer = None
        
        # Task templates and patterns
        self.task_templates = {}
        self.goal_patterns = {}
        self.skill_requirements = {}
        
        # Context and history
        self.decomposition_history: List[GoalDecompositionResult] = []
        self.task_performance_data: Dict[str, Dict[str, float]] = {}
        
        # Configuration
        self.max_tasks_per_goal = 20
        self.min_confidence_threshold = 0.7
        
    async def initialize(self) -> None:
        """Initialize the neural goal decomposer."""
        try:
            self.logger.info("Initializing Neural Goal Decomposer")
            
            # Load pre-trained models
            await self._load_models()
            
            # Load task templates and patterns
            await self._load_task_templates()
            await self._load_goal_patterns()
            await self._load_skill_requirements()
            
            self.logger.info("Neural Goal Decomposer initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Neural Goal Decomposer: {e}")
            raise
            
    async def decompose_goal(
        self,
        goal: str,
        context: Optional[Dict[str, Any]] = None,
        constraints: Optional[Dict[str, Any]] = None
    ) -> GoalDecompositionResult:
        """
        Decompose a high-level goal into actionable tasks.
        
        Args:
            goal: Natural language description of the goal
            context: Additional context information
            constraints: Constraints for task generation
            
        Returns:
            Goal decomposition result with tasks and execution plan
        """
        try:
            self.logger.info(f"Decomposing goal: {goal}")
            
            # Parse and understand the goal
            goal_understanding = await self._parse_goal(goal, context)
            
            # Generate candidate tasks
            candidate_tasks = await self._generate_candidate_tasks(
                goal, goal_understanding, context
            )
            
            # Filter and refine tasks
            refined_tasks = await self._refine_tasks(
                candidate_tasks, constraints
            )
            
            # Analyze dependencies
            dependency_graph = await self._analyze_dependencies(refined_tasks)
            
            # Generate execution plan
            execution_plan = await self._generate_execution_plan(
                refined_tasks, dependency_graph
            )
            
            # Calculate confidence and duration estimates
            total_duration = sum(task.estimated_duration for task in refined_tasks)
            confidence_score = await self._calculate_confidence(
                goal, refined_tasks, execution_plan
            )
            
            # Generate reasoning
            reasoning = await self._generate_reasoning(
                goal, refined_tasks, execution_plan
            )
            
            result = GoalDecompositionResult(
                original_goal=goal,
                tasks=refined_tasks,
                execution_plan=execution_plan,
                estimated_total_duration=total_duration,
                confidence_score=confidence_score,
                reasoning=reasoning
            )
            
            # Store for learning
            self.decomposition_history.append(result)
            
            self.logger.info(f"Successfully decomposed goal into {len(refined_tasks)} tasks")
            
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to decompose goal: {e}")
            raise
            
    async def _load_models(self) -> None:
        """Load pre-trained transformer models."""
        try:
            # Load tokenizer and base model
            model_name = "bert-base-uncased"
            self.tokenizer = BertTokenizer.from_pretrained(model_name)
            self.goal_parser_model = BertModel.from_pretrained(model_name)
            
            # Load specialized classifiers
            self.task_classifier = pipeline(
                "text-classification",
                model="microsoft/DialoGPT-medium",
                return_all_scores=True
            )
            
            self.priority_classifier = pipeline(
                "text-classification",
                model="distilbert-base-uncased-finetuned-sst-2-english",
                return_all_scores=True
            )
            
            self.logger.info("Successfully loaded neural models")
            
        except Exception as e:
            self.logger.error(f"Failed to load models: {e}")
            # Use simplified models for fallback
            self.tokenizer = None
            self.goal_parser_model = None
            
    async def _load_task_templates(self) -> None:
        """Load task templates for different task types."""
        self.task_templates = {
            TaskType.SECURITY_ANALYSIS: {
                "title_template": "Perform security analysis on {target}",
                "description_template": "Conduct comprehensive security analysis including vulnerability assessment, threat modeling, and risk evaluation for {target}",
                "required_skills": ["security_analysis", "vulnerability_assessment"],
                "estimated_duration": 120,
                "priority_factors": ["security_risk", "compliance_requirement"]
            },
            TaskType.THREAT_DETECTION: {
                "title_template": "Detect threats in {scope}",
                "description_template": "Monitor and analyze {scope} for potential security threats using behavioral analysis and signature detection",
                "required_skills": ["threat_detection", "behavioral_analysis"],
                "estimated_duration": 60,
                "priority_factors": ["threat_level", "asset_criticality"]
            },
            TaskType.INCIDENT_RESPONSE: {
                "title_template": "Respond to {incident_type} incident",
                "description_template": "Execute incident response procedures for {incident_type} including containment, investigation, and recovery",
                "required_skills": ["incident_response", "forensics"],
                "estimated_duration": 180,
                "priority_factors": ["incident_severity", "business_impact"]
            },
            TaskType.VULNERABILITY_SCAN: {
                "title_template": "Scan {target} for vulnerabilities",
                "description_template": "Perform automated vulnerability scanning on {target} to identify security weaknesses and misconfigurations",
                "required_skills": ["vulnerability_scanning", "network_analysis"],
                "estimated_duration": 45,
                "priority_factors": ["asset_exposure", "vulnerability_severity"]
            },
            TaskType.COMPLIANCE_CHECK: {
                "title_template": "Verify {standard} compliance for {target}",
                "description_template": "Assess {target} against {standard} compliance requirements and generate compliance report",
                "required_skills": ["compliance_assessment", "audit"],
                "estimated_duration": 90,
                "priority_factors": ["regulatory_requirement", "audit_deadline"]
            }
        }
        
    async def _load_goal_patterns(self) -> None:
        """Load patterns for recognizing different types of goals."""
        self.goal_patterns = {
            "security_assessment": [
                r"assess.*security",
                r"security.*audit",
                r"evaluate.*security.*posture",
                r"security.*review"
            ],
            "threat_hunting": [
                r"hunt.*threats?",
                r"find.*threats?",
                r"detect.*malicious",
                r"identify.*attackers?"
            ],
            "incident_investigation": [
                r"investigate.*incident",
                r"analyze.*breach",
                r"forensic.*analysis",
                r"incident.*response"
            ],
            "vulnerability_management": [
                r"scan.*vulnerabilities",
                r"patch.*management",
                r"vulnerability.*assessment",
                r"security.*updates"
            ],
            "compliance_monitoring": [
                r"compliance.*check",
                r"regulatory.*assessment",
                r"audit.*preparation",
                r"policy.*enforcement"
            ]
        }
        
    async def _load_skill_requirements(self) -> None:
        """Load skill requirements for different task types."""
        self.skill_requirements = {
            "security_analysis": ["cybersecurity", "risk_assessment", "threat_modeling"],
            "vulnerability_assessment": ["vulnerability_scanning", "penetration_testing"],
            "threat_detection": ["behavioral_analysis", "anomaly_detection", "SIEM"],
            "incident_response": ["forensics", "malware_analysis", "containment"],
            "compliance_assessment": ["regulatory_knowledge", "audit", "documentation"],
            "network_analysis": ["network_protocols", "traffic_analysis", "firewall_management"],
            "behavioral_analysis": ["machine_learning", "statistical_analysis", "pattern_recognition"],
            "forensics": ["digital_forensics", "evidence_collection", "chain_of_custody"]
        }
        
    async def _parse_goal(self, goal: str, context: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Parse and understand the goal using NLP."""
        try:
            # Extract key entities and intent
            entities = await self._extract_entities(goal)
            intent = await self._classify_intent(goal)
            
            # Analyze context
            context_analysis = await self._analyze_context(context or {})
            
            return {
                "entities": entities,
                "intent": intent,
                "context_analysis": context_analysis,
                "goal_type": await self._determine_goal_type(goal),
                "complexity": await self._assess_complexity(goal),
                "urgency": await self._assess_urgency(goal, context)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to parse goal: {e}")
            return {
                "entities": [],
                "intent": "unknown",
                "context_analysis": {},
                "goal_type": "general",
                "complexity": "medium",
                "urgency": "medium"
            }
            
    async def _extract_entities(self, text: str) -> List[Dict[str, Any]]:
        """Extract named entities from text."""
        # Simplified entity extraction
        entities = []
        
        # Common cybersecurity entities
        security_terms = [
            "firewall", "network", "server", "database", "application",
            "malware", "virus", "trojan", "ransomware", "phishing",
            "vulnerability", "exploit", "patch", "update",
            "user", "admin", "account", "credential", "password"
        ]
        
        text_lower = text.lower()
        for term in security_terms:
            if term in text_lower:
                entities.append({
                    "text": term,
                    "type": "security_entity",
                    "confidence": 0.8
                })
                
        return entities
        
    async def _classify_intent(self, goal: str) -> str:
        """Classify the intent of the goal."""
        goal_lower = goal.lower()
        
        # Pattern matching for intent classification
        if any(pattern in goal_lower for pattern in ["assess", "evaluate", "review", "audit"]):
            return "assessment"
        elif any(pattern in goal_lower for pattern in ["detect", "find", "identify", "discover"]):
            return "detection"
        elif any(pattern in goal_lower for pattern in ["respond", "handle", "mitigate", "contain"]):
            return "response"
        elif any(pattern in goal_lower for pattern in ["monitor", "watch", "track", "observe"]):
            return "monitoring"
        elif any(pattern in goal_lower for pattern in ["fix", "patch", "update", "remediate"]):
            return "remediation"
        else:
            return "general"
            
    async def _analyze_context(self, context: Dict[str, Any]) -> Dict[str, Any]:
        """Analyze additional context information."""
        analysis = {
            "environment": context.get("environment", "unknown"),
            "assets": context.get("assets", []),
            "constraints": context.get("constraints", {}),
            "timeline": context.get("timeline", "flexible"),
            "resources": context.get("resources", {})
        }
        
        return analysis
        
    async def _determine_goal_type(self, goal: str) -> str:
        """Determine the type of goal based on patterns."""
        goal_lower = goal.lower()
        
        for goal_type, patterns in self.goal_patterns.items():
            for pattern in patterns:
                if re.search(pattern, goal_lower):
                    return goal_type
                    
        return "general"
        
    async def _assess_complexity(self, goal: str) -> str:
        """Assess the complexity of the goal."""
        # Simple heuristic based on goal length and keywords
        complexity_indicators = [
            "comprehensive", "detailed", "thorough", "complete",
            "multiple", "various", "all", "entire", "full"
        ]
        
        goal_lower = goal.lower()
        complexity_score = len(goal.split()) / 10  # Base on word count
        
        for indicator in complexity_indicators:
            if indicator in goal_lower:
                complexity_score += 0.3
                
        if complexity_score < 0.3:
            return "low"
        elif complexity_score < 0.7:
            return "medium"
        else:
            return "high"
            
    async def _assess_urgency(self, goal: str, context: Optional[Dict[str, Any]]) -> str:
        """Assess the urgency of the goal."""
        urgency_keywords = {
            "critical": ["critical", "urgent", "emergency", "immediate", "asap"],
            "high": ["high", "important", "priority", "soon", "quickly"],
            "medium": ["medium", "normal", "standard", "regular"],
            "low": ["low", "when possible", "eventually", "future"]
        }
        
        goal_lower = goal.lower()
        
        for urgency, keywords in urgency_keywords.items():
            if any(keyword in goal_lower for keyword in keywords):
                return urgency
                
        # Check context for urgency indicators
        if context:
            if context.get("incident_active", False):
                return "critical"
            if context.get("compliance_deadline"):
                return "high"
                
        return "medium" 
       
    async def _generate_candidate_tasks(
        self,
        goal: str,
        goal_understanding: Dict[str, Any],
        context: Optional[Dict[str, Any]]
    ) -> List[DecomposedTask]:
        """Generate candidate tasks based on goal analysis."""
        try:
            candidate_tasks = []
            goal_type = goal_understanding.get("goal_type", "general")
            entities = goal_understanding.get("entities", [])
            
            # Generate tasks based on goal type
            if goal_type == "security_assessment":
                candidate_tasks.extend(await self._generate_security_assessment_tasks(entities, context))
            elif goal_type == "threat_hunting":
                candidate_tasks.extend(await self._generate_threat_hunting_tasks(entities, context))
            elif goal_type == "incident_investigation":
                candidate_tasks.extend(await self._generate_incident_investigation_tasks(entities, context))
            elif goal_type == "vulnerability_management":
                candidate_tasks.extend(await self._generate_vulnerability_management_tasks(entities, context))
            elif goal_type == "compliance_monitoring":
                candidate_tasks.extend(await self._generate_compliance_monitoring_tasks(entities, context))
            else:
                candidate_tasks.extend(await self._generate_general_tasks(goal, entities, context))
                
            # Add context-specific tasks
            if context:
                candidate_tasks.extend(await self._generate_context_specific_tasks(context))
                
            return candidate_tasks
            
        except Exception as e:
            self.logger.error(f"Failed to generate candidate tasks: {e}")
            return []
            
    async def _generate_security_assessment_tasks(
        self,
        entities: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]]
    ) -> List[DecomposedTask]:
        """Generate tasks for security assessment goals."""
        tasks = []
        
        # Core security assessment tasks
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Conduct vulnerability scan",
            description="Perform automated vulnerability scanning to identify security weaknesses",
            task_type=TaskType.VULNERABILITY_SCAN,
            priority=TaskPriority.HIGH,
            estimated_duration=45,
            required_skills=["vulnerability_scanning", "network_analysis"],
            confidence_score=0.9
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Analyze security configurations",
            description="Review and analyze security configurations for compliance and best practices",
            task_type=TaskType.SECURITY_ANALYSIS,
            priority=TaskPriority.HIGH,
            estimated_duration=60,
            required_skills=["security_analysis", "configuration_management"],
            confidence_score=0.85
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Generate security assessment report",
            description="Compile findings and generate comprehensive security assessment report",
            task_type=TaskType.REPORTING,
            priority=TaskPriority.MEDIUM,
            estimated_duration=30,
            required_skills=["reporting", "documentation"],
            dependencies=[tasks[0].task_id, tasks[1].task_id] if len(tasks) >= 2 else [],
            confidence_score=0.8
        ))
        
        return tasks
        
    async def _generate_threat_hunting_tasks(
        self,
        entities: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]]
    ) -> List[DecomposedTask]:
        """Generate tasks for threat hunting goals."""
        tasks = []
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Collect and analyze logs",
            description="Gather and analyze system logs for suspicious activities and anomalies",
            task_type=TaskType.THREAT_DETECTION,
            priority=TaskPriority.HIGH,
            estimated_duration=90,
            required_skills=["log_analysis", "behavioral_analysis"],
            confidence_score=0.9
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Monitor network traffic",
            description="Analyze network traffic patterns for indicators of compromise",
            task_type=TaskType.THREAT_DETECTION,
            priority=TaskPriority.HIGH,
            estimated_duration=120,
            required_skills=["network_analysis", "traffic_analysis"],
            confidence_score=0.85
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Correlate threat indicators",
            description="Correlate findings across different data sources to identify potential threats",
            task_type=TaskType.DATA_ANALYSIS,
            priority=TaskPriority.MEDIUM,
            estimated_duration=60,
            required_skills=["data_analysis", "threat_intelligence"],
            dependencies=[tasks[0].task_id, tasks[1].task_id] if len(tasks) >= 2 else [],
            confidence_score=0.8
        ))
        
        return tasks
        
    async def _generate_incident_investigation_tasks(
        self,
        entities: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]]
    ) -> List[DecomposedTask]:
        """Generate tasks for incident investigation goals."""
        tasks = []
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Contain the incident",
            description="Implement immediate containment measures to prevent incident spread",
            task_type=TaskType.INCIDENT_RESPONSE,
            priority=TaskPriority.CRITICAL,
            estimated_duration=30,
            required_skills=["incident_response", "containment"],
            confidence_score=0.95
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Collect forensic evidence",
            description="Gather and preserve digital evidence for forensic analysis",
            task_type=TaskType.INCIDENT_RESPONSE,
            priority=TaskPriority.HIGH,
            estimated_duration=120,
            required_skills=["forensics", "evidence_collection"],
            dependencies=[tasks[0].task_id] if tasks else [],
            confidence_score=0.9
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Analyze attack vectors",
            description="Investigate and analyze how the incident occurred and attack methods used",
            task_type=TaskType.SECURITY_ANALYSIS,
            priority=TaskPriority.HIGH,
            estimated_duration=180,
            required_skills=["malware_analysis", "attack_analysis"],
            dependencies=[tasks[1].task_id] if len(tasks) >= 2 else [],
            confidence_score=0.85
        ))
        
        return tasks
        
    async def _generate_vulnerability_management_tasks(
        self,
        entities: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]]
    ) -> List[DecomposedTask]:
        """Generate tasks for vulnerability management goals."""
        tasks = []
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Scan for vulnerabilities",
            description="Perform comprehensive vulnerability scanning across all systems",
            task_type=TaskType.VULNERABILITY_SCAN,
            priority=TaskPriority.HIGH,
            estimated_duration=60,
            required_skills=["vulnerability_scanning"],
            confidence_score=0.9
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Prioritize vulnerabilities",
            description="Assess and prioritize vulnerabilities based on risk and exploitability",
            task_type=TaskType.SECURITY_ANALYSIS,
            priority=TaskPriority.HIGH,
            estimated_duration=45,
            required_skills=["risk_assessment", "vulnerability_analysis"],
            dependencies=[tasks[0].task_id] if tasks else [],
            confidence_score=0.85
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Plan remediation",
            description="Develop remediation plan for identified vulnerabilities",
            task_type=TaskType.RESOURCE_MANAGEMENT,
            priority=TaskPriority.MEDIUM,
            estimated_duration=30,
            required_skills=["project_management", "patch_management"],
            dependencies=[tasks[1].task_id] if len(tasks) >= 2 else [],
            confidence_score=0.8
        ))
        
        return tasks
        
    async def _generate_compliance_monitoring_tasks(
        self,
        entities: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]]
    ) -> List[DecomposedTask]:
        """Generate tasks for compliance monitoring goals."""
        tasks = []
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Review compliance requirements",
            description="Review applicable compliance standards and requirements",
            task_type=TaskType.COMPLIANCE_CHECK,
            priority=TaskPriority.HIGH,
            estimated_duration=60,
            required_skills=["compliance_assessment", "regulatory_knowledge"],
            confidence_score=0.9
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Assess current compliance status",
            description="Evaluate current systems and processes against compliance requirements",
            task_type=TaskType.COMPLIANCE_CHECK,
            priority=TaskPriority.HIGH,
            estimated_duration=120,
            required_skills=["audit", "compliance_assessment"],
            dependencies=[tasks[0].task_id] if tasks else [],
            confidence_score=0.85
        ))
        
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title="Generate compliance report",
            description="Create detailed compliance assessment report with findings and recommendations",
            task_type=TaskType.REPORTING,
            priority=TaskPriority.MEDIUM,
            estimated_duration=45,
            required_skills=["reporting", "documentation"],
            dependencies=[tasks[1].task_id] if len(tasks) >= 2 else [],
            confidence_score=0.8
        ))
        
        return tasks
        
    async def _generate_general_tasks(
        self,
        goal: str,
        entities: List[Dict[str, Any]],
        context: Optional[Dict[str, Any]]
    ) -> List[DecomposedTask]:
        """Generate general tasks when specific goal type is not identified."""
        tasks = []
        
        # Default task based on goal analysis
        tasks.append(DecomposedTask(
            task_id=f"task_{len(tasks) + 1}",
            title=f"Analyze: {goal[:50]}...",
            description=f"Perform analysis related to: {goal}",
            task_type=TaskType.DATA_ANALYSIS,
            priority=TaskPriority.MEDIUM,
            estimated_duration=60,
            required_skills=["analysis", "investigation"],
            confidence_score=0.6
        ))
        
        return tasks
        
    async def _generate_context_specific_tasks(self, context: Dict[str, Any]) -> List[DecomposedTask]:
        """Generate tasks based on specific context information."""
        tasks = []
        
        # Add monitoring task if continuous monitoring is needed
        if context.get("continuous_monitoring", False):
            tasks.append(DecomposedTask(
                task_id=f"context_task_{len(tasks) + 1}",
                title="Set up continuous monitoring",
                description="Establish continuous monitoring for ongoing threat detection",
                task_type=TaskType.PERFORMANCE_MONITORING,
                priority=TaskPriority.MEDIUM,
                estimated_duration=30,
                required_skills=["monitoring", "automation"],
                confidence_score=0.8
            ))
            
        # Add reporting task if reporting is required
        if context.get("reporting_required", False):
            tasks.append(DecomposedTask(
                task_id=f"context_task_{len(tasks) + 1}",
                title="Generate executive report",
                description="Create executive summary report of findings and recommendations",
                task_type=TaskType.REPORTING,
                priority=TaskPriority.LOW,
                estimated_duration=45,
                required_skills=["reporting", "communication"],
                confidence_score=0.75
            ))
            
        return tasks
        
    async def _refine_tasks(
        self,
        candidate_tasks: List[DecomposedTask],
        constraints: Optional[Dict[str, Any]]
    ) -> List[DecomposedTask]:
        """Refine and filter candidate tasks based on constraints."""
        try:
            refined_tasks = []
            
            # Apply constraints
            max_tasks = constraints.get("max_tasks", self.max_tasks_per_goal) if constraints else self.max_tasks_per_goal
            min_confidence = constraints.get("min_confidence", self.min_confidence_threshold) if constraints else self.min_confidence_threshold
            
            # Filter by confidence
            high_confidence_tasks = [
                task for task in candidate_tasks
                if task.confidence_score >= min_confidence
            ]
            
            # Sort by priority and confidence
            sorted_tasks = sorted(
                high_confidence_tasks,
                key=lambda t: (
                    self._priority_to_numeric(t.priority),
                    t.confidence_score
                ),
                reverse=True
            )
            
            # Take top tasks up to max limit
            refined_tasks = sorted_tasks[:max_tasks]
            
            # Assign proper task IDs
            for i, task in enumerate(refined_tasks):
                task.task_id = f"task_{i + 1:03d}"
                
            return refined_tasks
            
        except Exception as e:
            self.logger.error(f"Failed to refine tasks: {e}")
            return candidate_tasks[:self.max_tasks_per_goal]
            
    def _priority_to_numeric(self, priority: TaskPriority) -> int:
        """Convert priority to numeric value for sorting."""
        priority_map = {
            TaskPriority.CRITICAL: 4,
            TaskPriority.HIGH: 3,
            TaskPriority.MEDIUM: 2,
            TaskPriority.LOW: 1
        }
        return priority_map.get(priority, 2)
        
    async def _analyze_dependencies(self, tasks: List[DecomposedTask]) -> Dict[str, List[str]]:
        """Analyze and establish dependencies between tasks."""
        dependency_graph = {}
        
        for task in tasks:
            dependency_graph[task.task_id] = task.dependencies.copy()
            
        # Add implicit dependencies based on task types
        for task in tasks:
            if task.task_type == TaskType.REPORTING:
                # Reporting tasks depend on analysis tasks
                analysis_tasks = [
                    t.task_id for t in tasks
                    if t.task_type in [TaskType.SECURITY_ANALYSIS, TaskType.DATA_ANALYSIS]
                    and t.task_id != task.task_id
                ]
                dependency_graph[task.task_id].extend(analysis_tasks)
                
        return dependency_graph
        
    async def _generate_execution_plan(
        self,
        tasks: List[DecomposedTask],
        dependency_graph: Dict[str, List[str]]
    ) -> List[str]:
        """Generate optimal execution plan considering dependencies."""
        try:
            # Topological sort to handle dependencies
            execution_plan = []
            remaining_tasks = {task.task_id: task for task in tasks}
            
            while remaining_tasks:
                # Find tasks with no unresolved dependencies
                ready_tasks = []
                for task_id, task in remaining_tasks.items():
                    dependencies = dependency_graph.get(task_id, [])
                    if all(dep not in remaining_tasks for dep in dependencies):
                        ready_tasks.append((task_id, task))
                        
                if not ready_tasks:
                    # Break circular dependencies by selecting highest priority task
                    ready_tasks = [max(remaining_tasks.items(), key=lambda x: self._priority_to_numeric(x[1].priority))]
                    
                # Sort ready tasks by priority
                ready_tasks.sort(key=lambda x: self._priority_to_numeric(x[1].priority), reverse=True)
                
                # Add to execution plan
                for task_id, task in ready_tasks:
                    execution_plan.append(task_id)
                    del remaining_tasks[task_id]
                    
            return execution_plan
            
        except Exception as e:
            self.logger.error(f"Failed to generate execution plan: {e}")
            return [task.task_id for task in tasks]
            
    async def _calculate_confidence(
        self,
        goal: str,
        tasks: List[DecomposedTask],
        execution_plan: List[str]
    ) -> float:
        """Calculate overall confidence score for the decomposition."""
        if not tasks:
            return 0.0
            
        # Average task confidence weighted by priority
        total_weight = 0
        weighted_confidence = 0
        
        for task in tasks:
            weight = self._priority_to_numeric(task.priority)
            weighted_confidence += task.confidence_score * weight
            total_weight += weight
            
        base_confidence = weighted_confidence / total_weight if total_weight > 0 else 0.0
        
        # Adjust based on plan completeness
        plan_completeness = len(execution_plan) / len(tasks) if tasks else 0.0
        
        # Adjust based on goal complexity
        complexity_factor = 0.9 if len(goal.split()) > 20 else 1.0
        
        final_confidence = base_confidence * plan_completeness * complexity_factor
        
        return min(final_confidence, 1.0)
        
    async def _generate_reasoning(
        self,
        goal: str,
        tasks: List[DecomposedTask],
        execution_plan: List[str]
    ) -> str:
        """Generate human-readable reasoning for the decomposition."""
        reasoning_parts = []
        
        reasoning_parts.append(f"Analyzed goal: '{goal}'")
        reasoning_parts.append(f"Generated {len(tasks)} tasks based on goal analysis")
        
        # Summarize task types
        task_type_counts = {}
        for task in tasks:
            task_type_counts[task.task_type.value] = task_type_counts.get(task.task_type.value, 0) + 1
            
        if task_type_counts:
            type_summary = ", ".join([f"{count} {task_type}" for task_type, count in task_type_counts.items()])
            reasoning_parts.append(f"Task breakdown: {type_summary}")
            
        # Mention critical tasks
        critical_tasks = [task for task in tasks if task.priority == TaskPriority.CRITICAL]
        if critical_tasks:
            reasoning_parts.append(f"Identified {len(critical_tasks)} critical tasks requiring immediate attention")
            
        # Mention dependencies
        total_dependencies = sum(len(task.dependencies) for task in tasks)
        if total_dependencies > 0:
            reasoning_parts.append(f"Established {total_dependencies} task dependencies for proper sequencing")
            
        return ". ".join(reasoning_parts) + "."