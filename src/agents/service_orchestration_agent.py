"""
Service Orchestration Agent implementation for ACSO system.
Handles intelligent ticket triage and automated service delivery.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from .base_agent import BaseAgent
from ..shared.interfaces import ServiceOrchestrationInterface
from ..shared.models import (
    AgentType, Task, TaskType, TaskPriority, TaskStatus
)
from ..shared.coordination import system_coordinator
from ..shared.aws_integration import bedrock_client, cloudwatch_logger
from config.settings import settings


class TicketPriority(str, Enum):
    """Priority levels for service tickets."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFORMATIONAL = "informational"


class TicketCategory(str, Enum):
    """Categories for service tickets."""
    INCIDENT = "incident"
    SERVICE_REQUEST = "service_request"
    CHANGE_REQUEST = "change_request"
    PROBLEM = "problem"
    KNOWLEDGE_REQUEST = "knowledge_request"
    ACCESS_REQUEST = "access_request"
    HARDWARE_REQUEST = "hardware_request"
    SOFTWARE_REQUEST = "software_request"


class TicketStatus(str, Enum):
    """Status of service tickets."""
    NEW = "new"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    PENDING = "pending"
    RESOLVED = "resolved"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class SLALevel(str, Enum):
    """Service Level Agreement levels."""
    PLATINUM = "platinum"
    GOLD = "gold"
    SILVER = "silver"
    BRONZE = "bronze"
    BASIC = "basic"


class ServiceTicket:
    """Represents a service ticket in the system."""
    
    def __init__(self, ticket_id: str, title: str, description: str,
                 requester: str, created_at: datetime = None):
        self.ticket_id = ticket_id
        self.title = title
        self.description = description
        self.requester = requester
        self.created_at = created_at or datetime.utcnow()
        
        # Classification fields
        self.category: Optional[TicketCategory] = None
        self.priority: Optional[TicketPriority] = None
        self.status: TicketStatus = TicketStatus.NEW
        self.sla_level: Optional[SLALevel] = None
        
        # Assignment fields
        self.assigned_to: Optional[str] = None
        self.assigned_at: Optional[datetime] = None
        self.team: Optional[str] = None
        
        # SLA tracking
        self.sla_due_date: Optional[datetime] = None
        self.first_response_due: Optional[datetime] = None
        self.resolution_due: Optional[datetime] = None
        
        # Metadata
        self.tags: List[str] = []
        self.client_id: Optional[str] = None
        self.urgency_score: float = 0.0
        self.complexity_score: float = 0.0
        self.business_impact_score: float = 0.0
        
        # Tracking
        self.updates: List[Dict[str, Any]] = []
        self.resolution_notes: Optional[str] = None
        self.resolved_at: Optional[datetime] = None
        
    def to_dict(self) -> Dict[str, Any]:
        """Convert ticket to dictionary representation."""
        return {
            "ticket_id": self.ticket_id,
            "title": self.title,
            "description": self.description,
            "requester": self.requester,
            "created_at": self.created_at.isoformat(),
            "category": self.category.value if self.category else None,
            "priority": self.priority.value if self.priority else None,
            "status": self.status.value,
            "sla_level": self.sla_level.value if self.sla_level else None,
            "assigned_to": self.assigned_to,
            "assigned_at": self.assigned_at.isoformat() if self.assigned_at else None,
            "team": self.team,
            "sla_due_date": self.sla_due_date.isoformat() if self.sla_due_date else None,
            "first_response_due": self.first_response_due.isoformat() if self.first_response_due else None,
            "resolution_due": self.resolution_due.isoformat() if self.resolution_due else None,
            "tags": self.tags,
            "client_id": self.client_id,
            "urgency_score": self.urgency_score,
            "complexity_score": self.complexity_score,
            "business_impact_score": self.business_impact_score,
            "updates": self.updates,
            "resolution_notes": self.resolution_notes,
            "resolved_at": self.resolved_at.isoformat() if self.resolved_at else None
        }


class TicketTriageEngine:
    """Core engine for intelligent ticket triage and classification."""
    
    def __init__(self):
        self.classification_rules = self._initialize_classification_rules()
        self.priority_matrix = self._initialize_priority_matrix()
        self.sla_definitions = self._initialize_sla_definitions()
        self.team_assignments = self._initialize_team_assignments()
        
    def _initialize_classification_rules(self) -> Dict[str, Dict[str, Any]]:
        """Initialize ticket classification rules."""
        return {
            "incident_keywords": {
                "keywords": [
                    "down", "outage", "error", "broken", "not working", "failed",
                    "crash", "timeout", "slow", "performance", "unavailable"
                ],
                "category": TicketCategory.INCIDENT,
                "urgency_boost": 0.3
            },
            "service_request_keywords": {
                "keywords": [
                    "request", "need", "setup", "install", "configure", "create",
                    "provision", "enable", "add", "new user", "access"
                ],
                "category": TicketCategory.SERVICE_REQUEST,
                "urgency_boost": 0.0
            },
            "change_request_keywords": {
                "keywords": [
                    "change", "modify", "update", "upgrade", "migrate", "move",
                    "reconfigure", "adjust", "alter"
                ],
                "category": TicketCategory.CHANGE_REQUEST,
                "urgency_boost": 0.1
            },
            "access_request_keywords": {
                "keywords": [
                    "access", "permission", "login", "password", "account",
                    "unlock", "reset", "credentials", "authentication"
                ],
                "category": TicketCategory.ACCESS_REQUEST,
                "urgency_boost": 0.2
            },
            "hardware_keywords": {
                "keywords": [
                    "laptop", "desktop", "server", "printer", "monitor",
                    "keyboard", "mouse", "hardware", "device", "equipment"
                ],
                "category": TicketCategory.HARDWARE_REQUEST,
                "urgency_boost": 0.1
            },
            "software_keywords": {
                "keywords": [
                    "software", "application", "program", "license", "install",
                    "uninstall", "update", "patch", "version"
                ],
                "category": TicketCategory.SOFTWARE_REQUEST,
                "urgency_boost": 0.1
            }
        }
        
    def _initialize_priority_matrix(self) -> Dict[str, Dict[str, Any]]:
        """Initialize priority calculation matrix."""
        return {
            "urgency_factors": {
                "critical_system_down": 0.9,
                "multiple_users_affected": 0.7,
                "single_user_affected": 0.4,
                "enhancement_request": 0.2,
                "information_request": 0.1
            },
            "impact_factors": {
                "business_critical": 0.8,
                "high_visibility": 0.6,
                "normal_operations": 0.4,
                "low_impact": 0.2,
                "no_impact": 0.1
            },
            "time_factors": {
                "immediate": 0.9,
                "same_day": 0.7,
                "next_business_day": 0.5,
                "within_week": 0.3,
                "when_convenient": 0.1
            }
        }
        
    def _initialize_sla_definitions(self) -> Dict[SLALevel, Dict[str, Any]]:
        """Initialize SLA definitions for different service levels."""
        return {
            SLALevel.PLATINUM: {
                "first_response_minutes": {
                    TicketPriority.CRITICAL: 15,
                    TicketPriority.HIGH: 30,
                    TicketPriority.MEDIUM: 60,
                    TicketPriority.LOW: 120
                },
                "resolution_hours": {
                    TicketPriority.CRITICAL: 2,
                    TicketPriority.HIGH: 4,
                    TicketPriority.MEDIUM: 8,
                    TicketPriority.LOW: 24
                }
            },
            SLALevel.GOLD: {
                "first_response_minutes": {
                    TicketPriority.CRITICAL: 30,
                    TicketPriority.HIGH: 60,
                    TicketPriority.MEDIUM: 120,
                    TicketPriority.LOW: 240
                },
                "resolution_hours": {
                    TicketPriority.CRITICAL: 4,
                    TicketPriority.HIGH: 8,
                    TicketPriority.MEDIUM: 16,
                    TicketPriority.LOW: 48
                }
            },
            SLALevel.SILVER: {
                "first_response_minutes": {
                    TicketPriority.CRITICAL: 60,
                    TicketPriority.HIGH: 120,
                    TicketPriority.MEDIUM: 240,
                    TicketPriority.LOW: 480
                },
                "resolution_hours": {
                    TicketPriority.CRITICAL: 8,
                    TicketPriority.HIGH: 16,
                    TicketPriority.MEDIUM: 32,
                    TicketPriority.LOW: 72
                }
            },
            SLALevel.BRONZE: {
                "first_response_minutes": {
                    TicketPriority.CRITICAL: 120,
                    TicketPriority.HIGH: 240,
                    TicketPriority.MEDIUM: 480,
                    TicketPriority.LOW: 960
                },
                "resolution_hours": {
                    TicketPriority.CRITICAL: 16,
                    TicketPriority.HIGH: 32,
                    TicketPriority.MEDIUM: 64,
                    TicketPriority.LOW: 120
                }
            },
            SLALevel.BASIC: {
                "first_response_minutes": {
                    TicketPriority.CRITICAL: 240,
                    TicketPriority.HIGH: 480,
                    TicketPriority.MEDIUM: 960,
                    TicketPriority.LOW: 1440
                },
                "resolution_hours": {
                    TicketPriority.CRITICAL: 24,
                    TicketPriority.HIGH: 48,
                    TicketPriority.MEDIUM: 96,
                    TicketPriority.LOW: 168
                }
            }
        }
        
    def _initialize_team_assignments(self) -> Dict[str, Dict[str, Any]]:
        """Initialize team assignment rules."""
        return {
            "infrastructure_team": {
                "categories": [TicketCategory.INCIDENT, TicketCategory.HARDWARE_REQUEST],
                "keywords": ["server", "network", "infrastructure", "outage", "performance"],
                "skills": ["system_administration", "network_management", "hardware_support"]
            },
            "application_team": {
                "categories": [TicketCategory.SOFTWARE_REQUEST, TicketCategory.CHANGE_REQUEST],
                "keywords": ["application", "software", "bug", "feature", "development"],
                "skills": ["application_support", "software_development", "testing"]
            },
            "security_team": {
                "categories": [TicketCategory.ACCESS_REQUEST, TicketCategory.INCIDENT],
                "keywords": ["security", "access", "permission", "authentication", "breach"],
                "skills": ["security_analysis", "access_management", "incident_response"]
            },
            "service_desk": {
                "categories": [TicketCategory.SERVICE_REQUEST, TicketCategory.KNOWLEDGE_REQUEST],
                "keywords": ["password", "account", "general", "question", "help"],
                "skills": ["customer_service", "general_support", "documentation"]
            }
        }
        
    async def classify_ticket(self, ticket: ServiceTicket) -> Dict[str, Any]:
        """Classify a ticket using AI and rule-based analysis."""
        try:
            # Combine title and description for analysis
            ticket_text = f"{ticket.title} {ticket.description}".lower()
            
            # Rule-based classification
            rule_based_result = await self._rule_based_classification(ticket_text)
            
            # AI-enhanced classification using Bedrock
            ai_result = await self._ai_enhanced_classification(ticket)
            
            # Combine results
            final_classification = await self._combine_classification_results(
                rule_based_result, ai_result, ticket
            )
            
            # Update ticket with classification
            ticket.category = final_classification.get("category")
            ticket.priority = final_classification.get("priority")
            ticket.urgency_score = final_classification.get("urgency_score", 0.0)
            ticket.complexity_score = final_classification.get("complexity_score", 0.0)
            ticket.business_impact_score = final_classification.get("business_impact_score", 0.0)
            ticket.tags = final_classification.get("tags", [])
            
            return final_classification
            
        except Exception as e:
            # Fallback classification
            return {
                "category": TicketCategory.SERVICE_REQUEST,
                "priority": TicketPriority.MEDIUM,
                "urgency_score": 0.5,
                "complexity_score": 0.5,
                "business_impact_score": 0.5,
                "confidence": 0.3,
                "error": str(e)
            }
            
    async def _rule_based_classification(self, ticket_text: str) -> Dict[str, Any]:
        """Perform rule-based ticket classification."""
        classification_scores = {}
        matched_keywords = []
        
        # Check against classification rules
        for rule_name, rule_data in self.classification_rules.items():
            keywords = rule_data["keywords"]
            category = rule_data["category"]
            urgency_boost = rule_data["urgency_boost"]
            
            # Count keyword matches
            matches = sum(1 for keyword in keywords if keyword in ticket_text)
            
            if matches > 0:
                score = matches / len(keywords)  # Normalize by total keywords
                classification_scores[category] = score + urgency_boost
                matched_keywords.extend([kw for kw in keywords if kw in ticket_text])
                
        # Determine best category
        if classification_scores:
            best_category = max(classification_scores.items(), key=lambda x: x[1])
            category = best_category[0]
            confidence = best_category[1]
        else:
            category = TicketCategory.SERVICE_REQUEST
            confidence = 0.3
            
        # Calculate urgency based on keywords
        urgency_score = self._calculate_urgency_from_keywords(ticket_text, matched_keywords)
        
        # Determine priority from urgency
        priority = self._urgency_to_priority(urgency_score)
        
        return {
            "category": category,
            "priority": priority,
            "urgency_score": urgency_score,
            "confidence": confidence,
            "matched_keywords": list(set(matched_keywords)),
            "method": "rule_based"
        }
        
    async def _ai_enhanced_classification(self, ticket: ServiceTicket) -> Dict[str, Any]:
        """Perform AI-enhanced ticket classification using Bedrock."""
        try:
            classification_prompt = f"""
            Analyze this IT service ticket and provide classification:
            
            Title: {ticket.title}
            Description: {ticket.description}
            Requester: {ticket.requester}
            
            Classify the ticket with:
            1. Category (incident, service_request, change_request, problem, access_request, hardware_request, software_request, knowledge_request)
            2. Priority (critical, high, medium, low, informational)
            3. Urgency score (0.0 to 1.0)
            4. Complexity score (0.0 to 1.0) 
            5. Business impact score (0.0 to 1.0)
            6. Relevant tags
            7. Confidence level (0.0 to 1.0)
            
            Consider:
            - Keywords indicating urgency (down, broken, critical, urgent)
            - Business impact (multiple users, critical systems, revenue impact)
            - Technical complexity (integration, custom development, multiple systems)
            - Time sensitivity (deadlines, business hours, dependencies)
            
            Respond in JSON format.
            """
            
            bedrock_result = await bedrock_client.invoke_agent(
                agent_id="classification-agent",
                session_id=str(uuid.uuid4()),
                input_text=classification_prompt
            )
            
            if bedrock_result.get("success"):
                ai_response = bedrock_result.get("result", "{}")
                
                # Parse AI response (simplified for prototype)
                # In a real implementation, this would use proper JSON parsing
                ai_classification = self._parse_ai_classification_response(ai_response)
                ai_classification["method"] = "ai_enhanced"
                
                return ai_classification
            else:
                return {"method": "ai_failed", "error": "Bedrock invocation failed"}
                
        except Exception as e:
            return {"method": "ai_failed", "error": str(e)}
            
    def _parse_ai_classification_response(self, ai_response: str) -> Dict[str, Any]:
        """Parse AI classification response (simplified for prototype)."""
        # Simplified parsing - in a real implementation, this would use proper JSON parsing
        # and handle various response formats
        
        # Default classification with medium confidence
        classification = {
            "category": TicketCategory.SERVICE_REQUEST,
            "priority": TicketPriority.MEDIUM,
            "urgency_score": 0.5,
            "complexity_score": 0.5,
            "business_impact_score": 0.5,
            "tags": [],
            "confidence": 0.6
        }
        
        # Simple keyword-based parsing for prototype
        response_lower = ai_response.lower()
        
        # Category detection
        if "incident" in response_lower:
            classification["category"] = TicketCategory.INCIDENT
            classification["urgency_score"] = 0.7
        elif "access" in response_lower:
            classification["category"] = TicketCategory.ACCESS_REQUEST
            classification["urgency_score"] = 0.6
        elif "hardware" in response_lower:
            classification["category"] = TicketCategory.HARDWARE_REQUEST
        elif "software" in response_lower:
            classification["category"] = TicketCategory.SOFTWARE_REQUEST
        elif "change" in response_lower:
            classification["category"] = TicketCategory.CHANGE_REQUEST
            
        # Priority detection
        if "critical" in response_lower:
            classification["priority"] = TicketPriority.CRITICAL
            classification["urgency_score"] = 0.9
        elif "high" in response_lower:
            classification["priority"] = TicketPriority.HIGH
            classification["urgency_score"] = 0.7
        elif "low" in response_lower:
            classification["priority"] = TicketPriority.LOW
            classification["urgency_score"] = 0.3
            
        return classification
        
    async def _combine_classification_results(self, rule_based: Dict[str, Any], 
                                           ai_result: Dict[str, Any],
                                           ticket: ServiceTicket) -> Dict[str, Any]:
        """Combine rule-based and AI classification results."""
        
        # Weight the results based on confidence
        rule_confidence = rule_based.get("confidence", 0.5)
        ai_confidence = ai_result.get("confidence", 0.5)
        
        # If AI failed, use rule-based result
        if ai_result.get("method") == "ai_failed":
            return rule_based
            
        # Combine based on confidence levels
        if rule_confidence > ai_confidence:
            primary_result = rule_based
            secondary_result = ai_result
            primary_weight = 0.7
        else:
            primary_result = ai_result
            secondary_result = rule_based
            primary_weight = 0.6
            
        # Combine numerical scores
        combined_urgency = (
            primary_result.get("urgency_score", 0.5) * primary_weight +
            secondary_result.get("urgency_score", 0.5) * (1 - primary_weight)
        )
        
        combined_complexity = (
            primary_result.get("complexity_score", 0.5) * primary_weight +
            secondary_result.get("complexity_score", 0.5) * (1 - primary_weight)
        )
        
        combined_business_impact = (
            primary_result.get("business_impact_score", 0.5) * primary_weight +
            secondary_result.get("business_impact_score", 0.5) * (1 - primary_weight)
        )
        
        # Use primary result for categorical fields
        final_result = {
            "category": primary_result.get("category", TicketCategory.SERVICE_REQUEST),
            "priority": primary_result.get("priority", TicketPriority.MEDIUM),
            "urgency_score": combined_urgency,
            "complexity_score": combined_complexity,
            "business_impact_score": combined_business_impact,
            "tags": list(set(
                primary_result.get("tags", []) + 
                secondary_result.get("tags", []) +
                rule_based.get("matched_keywords", [])
            )),
            "confidence": max(rule_confidence, ai_confidence),
            "classification_methods": [
                primary_result.get("method", "unknown"),
                secondary_result.get("method", "unknown")
            ]
        }
        
        return final_result
        
    def _calculate_urgency_from_keywords(self, ticket_text: str, matched_keywords: List[str]) -> float:
        """Calculate urgency score based on matched keywords."""
        urgency_keywords = {
            "critical": 0.9,
            "urgent": 0.8,
            "emergency": 0.9,
            "down": 0.8,
            "outage": 0.8,
            "broken": 0.7,
            "not working": 0.7,
            "failed": 0.6,
            "error": 0.5,
            "slow": 0.4,
            "issue": 0.3
        }
        
        max_urgency = 0.0
        for keyword, urgency in urgency_keywords.items():
            if keyword in ticket_text:
                max_urgency = max(max_urgency, urgency)
                
        # Boost urgency if multiple urgent keywords found
        urgent_count = sum(1 for kw in urgency_keywords.keys() if kw in ticket_text)
        if urgent_count > 1:
            max_urgency = min(1.0, max_urgency + 0.1 * (urgent_count - 1))
            
        return max_urgency
        
    def _urgency_to_priority(self, urgency_score: float) -> TicketPriority:
        """Convert urgency score to priority level."""
        if urgency_score >= 0.8:
            return TicketPriority.CRITICAL
        elif urgency_score >= 0.6:
            return TicketPriority.HIGH
        elif urgency_score >= 0.4:
            return TicketPriority.MEDIUM
        elif urgency_score >= 0.2:
            return TicketPriority.LOW
        else:
            return TicketPriority.INFORMATIONAL
            
    async def assign_sla_level(self, ticket: ServiceTicket, client_data: Dict[str, Any]) -> SLALevel:
        """Assign SLA level based on client data and ticket characteristics."""
        try:
            # Default SLA level
            sla_level = SLALevel.BRONZE
            
            # Check client SLA level
            client_sla = client_data.get("sla_level")
            if client_sla:
                sla_level = SLALevel(client_sla)
            else:
                # Determine SLA based on client tier or contract
                client_tier = client_data.get("tier", "standard").lower()
                
                if client_tier in ["enterprise", "premium"]:
                    sla_level = SLALevel.PLATINUM
                elif client_tier in ["business", "professional"]:
                    sla_level = SLALevel.GOLD
                elif client_tier in ["standard", "regular"]:
                    sla_level = SLALevel.SILVER
                else:
                    sla_level = SLALevel.BRONZE
                    
            # Upgrade SLA for critical incidents
            if ticket.priority == TicketPriority.CRITICAL:
                if sla_level == SLALevel.BRONZE:
                    sla_level = SLALevel.SILVER
                elif sla_level == SLALevel.SILVER:
                    sla_level = SLALevel.GOLD
                    
            return sla_level
            
        except Exception:
            return SLALevel.BRONZE  # Safe default
            
    async def calculate_sla_deadlines(self, ticket: ServiceTicket) -> Dict[str, datetime]:
        """Calculate SLA deadlines for a ticket."""
        try:
            sla_def = self.sla_definitions.get(ticket.sla_level, self.sla_definitions[SLALevel.BRONZE])
            
            # Get response and resolution times
            first_response_minutes = sla_def["first_response_minutes"].get(
                ticket.priority, sla_def["first_response_minutes"][TicketPriority.MEDIUM]
            )
            
            resolution_hours = sla_def["resolution_hours"].get(
                ticket.priority, sla_def["resolution_hours"][TicketPriority.MEDIUM]
            )
            
            # Calculate deadlines from ticket creation time
            first_response_due = ticket.created_at + timedelta(minutes=first_response_minutes)
            resolution_due = ticket.created_at + timedelta(hours=resolution_hours)
            
            # Adjust for business hours if needed (simplified for prototype)
            # In a real implementation, this would account for business hours and holidays
            
            return {
                "first_response_due": first_response_due,
                "resolution_due": resolution_due,
                "first_response_minutes": first_response_minutes,
                "resolution_hours": resolution_hours
            }
            
        except Exception as e:
            # Default deadlines
            return {
                "first_response_due": ticket.created_at + timedelta(hours=4),
                "resolution_due": ticket.created_at + timedelta(hours=24),
                "first_response_minutes": 240,
                "resolution_hours": 24,
                "error": str(e)
            }
            
    async def assign_team(self, ticket: ServiceTicket) -> Dict[str, Any]:
        """Assign appropriate team based on ticket characteristics."""
        try:
            ticket_text = f"{ticket.title} {ticket.description}".lower()
            
            team_scores = {}
            
            # Score teams based on category match
            for team_name, team_data in self.team_assignments.items():
                score = 0.0
                
                # Category match
                if ticket.category in team_data["categories"]:
                    score += 0.5
                    
                # Keyword match
                keywords = team_data["keywords"]
                keyword_matches = sum(1 for kw in keywords if kw in ticket_text)
                if keyword_matches > 0:
                    score += 0.3 * (keyword_matches / len(keywords))
                    
                # Priority boost for specialized teams
                if ticket.priority in [TicketPriority.CRITICAL, TicketPriority.HIGH]:
                    if team_name in ["infrastructure_team", "security_team"]:
                        score += 0.2
                        
                team_scores[team_name] = score
                
            # Select best team
            if team_scores:
                best_team = max(team_scores.items(), key=lambda x: x[1])
                assigned_team = best_team[0]
                confidence = best_team[1]
            else:
                assigned_team = "service_desk"  # Default team
                confidence = 0.3
                
            return {
                "team": assigned_team,
                "confidence": confidence,
                "team_scores": team_scores,
                "skills_required": self.team_assignments[assigned_team]["skills"]
            }
            
        except Exception as e:
            return {
                "team": "service_desk",
                "confidence": 0.2,
                "error": str(e)
            }


class ServiceOrchestrationAgent(BaseAgent, ServiceOrchestrationInterface):
    """Service Orchestration agent that handles ticket triage and service delivery."""
    
    def __init__(self, agent_id: str = "service-orchestration-001"):
        super().__init__(agent_id, AgentType.SERVICE_ORCHESTRATION)
        
        # Service orchestration specific capabilities
        self.capabilities = [
            "ticket_triage",
            "service_delivery",
            "sla_management",
            "team_assignment",
            "workflow_automation",
            "patch_management"
        ]
        
        # Triage engine
        self.triage_engine = TicketTriageEngine()
        
        # Active tickets
        self.active_tickets: Dict[str, ServiceTicket] = {}
        self.ticket_history: List[ServiceTicket] = []
        
        # Service statistics
        self.tickets_processed = 0
        self.average_triage_time = 0.0
        self.sla_compliance_rate = 0.0
        
        # Client database (simplified for prototype)
        self.client_database = self._initialize_client_database()
        
    def _initialize_client_database(self) -> Dict[str, Dict[str, Any]]:
        """Initialize client database with sample data."""
        return {
            "client_001": {
                "name": "Enterprise Corp",
                "tier": "enterprise",
                "sla_level": "platinum",
                "contact": "admin@enterprise.com",
                "priority_multiplier": 1.2
            },
            "client_002": {
                "name": "Business Inc",
                "tier": "business", 
                "sla_level": "gold",
                "contact": "support@business.com",
                "priority_multiplier": 1.0
            },
            "client_003": {
                "name": "Standard LLC",
                "tier": "standard",
                "sla_level": "silver",
                "contact": "help@standard.com",
                "priority_multiplier": 0.8
            }
        }
        
    async def initialize(self) -> None:
        """Initialize the service orchestration agent."""
        await super().initialize()
        
        # Register with system coordinator
        state = await self.get_state()
        await system_coordinator.register_agent(state)
        
        # Register additional message handlers
        self.comm_manager.register_handler("new_ticket", self._handle_new_ticket)
        self.comm_manager.register_handler("ticket_update", self._handle_ticket_update)
        self.comm_manager.register_handler("sla_check", self._handle_sla_check)
        
        # Start SLA monitoring
        asyncio.create_task(self._monitor_sla_compliance())
        
        self.logger.info("Service Orchestration agent initialized and ready for tickets")
        
    async def _execute_task_implementation(self, task: Task) -> Dict[str, Any]:
        """Execute service orchestration specific tasks."""
        try:
            if task.type == TaskType.SERVICE_DELIVERY:
                return await self._handle_service_delivery_task(task)
            else:
                return {
                    "success": False,
                    "error": f"Unsupported task type: {task.type}",
                    "task_id": task.task_id
                }
                
        except Exception as e:
            self.logger.error(f"Service orchestration task execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "task_id": task.task_id
            }
            
    async def triage_ticket(self, ticket_data: Dict[str, Any]) -> Dict[str, Any]:
        """Triage and categorize a service ticket."""
        try:
            start_time = datetime.utcnow()
            
            # Create ticket object
            ticket = ServiceTicket(
                ticket_id=ticket_data.get("ticket_id", str(uuid.uuid4())),
                title=ticket_data.get("title", ""),
                description=ticket_data.get("description", ""),
                requester=ticket_data.get("requester", "unknown")
            )
            
            # Get client data
            client_id = ticket_data.get("client_id")
            client_data = self.client_database.get(client_id, {})
            ticket.client_id = client_id
            
            self.logger.info(f"Triaging ticket {ticket.ticket_id}: {ticket.title}")
            
            # Classify ticket
            classification = await self.triage_engine.classify_ticket(ticket)
            
            # Assign SLA level
            ticket.sla_level = await self.triage_engine.assign_sla_level(ticket, client_data)
            
            # Calculate SLA deadlines
            sla_deadlines = await self.triage_engine.calculate_sla_deadlines(ticket)
            ticket.first_response_due = sla_deadlines["first_response_due"]
            ticket.resolution_due = sla_deadlines["resolution_due"]
            
            # Assign team
            team_assignment = await self.triage_engine.assign_team(ticket)
            ticket.team = team_assignment["team"]
            
            # Store ticket
            self.active_tickets[ticket.ticket_id] = ticket
            
            # Calculate triage time
            triage_time = (datetime.utcnow() - start_time).total_seconds()
            self.tickets_processed += 1
            
            # Update average triage time
            self.average_triage_time = (
                (self.average_triage_time * (self.tickets_processed - 1) + triage_time) /
                self.tickets_processed
            )
            
            # Log triage completion
            await self._log_activity("ticket_triage", {
                "ticket_id": ticket.ticket_id,
                "category": ticket.category.value if ticket.category else None,
                "priority": ticket.priority.value if ticket.priority else None,
                "sla_level": ticket.sla_level.value if ticket.sla_level else None,
                "assigned_team": ticket.team,
                "triage_time_seconds": triage_time
            })
            
            return {
                "success": True,
                "ticket_id": ticket.ticket_id,
                "classification": classification,
                "sla_level": ticket.sla_level.value if ticket.sla_level else None,
                "team_assignment": team_assignment,
                "sla_deadlines": {
                    "first_response_due": ticket.first_response_due.isoformat(),
                    "resolution_due": ticket.resolution_due.isoformat()
                },
                "triage_time_seconds": triage_time,
                "ticket_details": ticket.to_dict()
            }
            
        except Exception as e:
            self.logger.error(f"Ticket triage failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "ticket_id": ticket_data.get("ticket_id", "unknown")
            }
            
    async def execute_service_task(self, task_data: Dict[str, Any]) -> Dict[str, Any]:
        """Execute an automated service task."""
        try:
            task_type = task_data.get("task_type", "unknown")
            ticket_id = task_data.get("ticket_id")
            
            self.logger.info(f"Executing service task: {task_type} for ticket {ticket_id}")
            
            # Route to appropriate service handler
            if task_type == "password_reset":
                return await self._handle_password_reset(task_data)
            elif task_type == "account_creation":
                return await self._handle_account_creation(task_data)
            elif task_type == "software_installation":
                return await self._handle_software_installation(task_data)
            elif task_type == "patch_deployment":
                return await self._handle_patch_deployment(task_data)
            elif task_type == "access_provisioning":
                return await self._handle_access_provisioning(task_data)
            else:
                return await self._handle_generic_service_task(task_data)
                
        except Exception as e:
            self.logger.error(f"Service task execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "task_type": task_data.get("task_type", "unknown")
            }
            
    async def monitor_sla(self, ticket_id: str) -> Dict[str, Any]:
        """Monitor SLA compliance for a ticket."""
        try:
            ticket = self.active_tickets.get(ticket_id)
            if not ticket:
                return {
                    "success": False,
                    "error": "Ticket not found",
                    "ticket_id": ticket_id
                }
                
            now = datetime.utcnow()
            
            # Check first response SLA
            first_response_status = "compliant"
            first_response_breach_minutes = 0
            
            if ticket.first_response_due and now > ticket.first_response_due:
                first_response_status = "breached"
                first_response_breach_minutes = (now - ticket.first_response_due).total_seconds() / 60
                
            # Check resolution SLA
            resolution_status = "compliant"
            resolution_breach_hours = 0
            
            if ticket.resolution_due and now > ticket.resolution_due:
                resolution_status = "breached"
                resolution_breach_hours = (now - ticket.resolution_due).total_seconds() / 3600
                
            # Calculate time remaining
            first_response_remaining = None
            resolution_remaining = None
            
            if ticket.first_response_due:
                first_response_remaining = max(0, (ticket.first_response_due - now).total_seconds() / 60)
                
            if ticket.resolution_due:
                resolution_remaining = max(0, (ticket.resolution_due - now).total_seconds() / 3600)
                
            sla_status = {
                "ticket_id": ticket_id,
                "sla_level": ticket.sla_level.value if ticket.sla_level else None,
                "first_response": {
                    "status": first_response_status,
                    "due_date": ticket.first_response_due.isoformat() if ticket.first_response_due else None,
                    "breach_minutes": first_response_breach_minutes,
                    "remaining_minutes": first_response_remaining
                },
                "resolution": {
                    "status": resolution_status,
                    "due_date": ticket.resolution_due.isoformat() if ticket.resolution_due else None,
                    "breach_hours": resolution_breach_hours,
                    "remaining_hours": resolution_remaining
                },
                "overall_status": "breached" if (first_response_status == "breached" or resolution_status == "breached") else "compliant"
            }
            
            return {
                "success": True,
                "sla_status": sla_status
            }
            
        except Exception as e:
            self.logger.error(f"SLA monitoring failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "ticket_id": ticket_id
            }
            
    async def escalate_ticket(self, ticket_id: str, reason: str) -> None:
        """Escalate a ticket to human technicians."""
        try:
            ticket = self.active_tickets.get(ticket_id)
            if not ticket:
                self.logger.error(f"Cannot escalate - ticket {ticket_id} not found")
                return
                
            self.logger.info(f"Escalating ticket {ticket_id}: {reason}")
            
            # Update ticket status
            ticket.status = TicketStatus.ASSIGNED
            ticket.updates.append({
                "timestamp": datetime.utcnow().isoformat(),
                "type": "escalation",
                "description": f"Escalated to human technician: {reason}",
                "automated": True
            })
            
            # Notify appropriate team
            escalation_message = {
                "ticket_id": ticket_id,
                "ticket_details": ticket.to_dict(),
                "escalation_reason": reason,
                "priority": ticket.priority.value if ticket.priority else "medium",
                "sla_deadline": ticket.resolution_due.isoformat() if ticket.resolution_due else None
            }
            
            # Send to team (simplified for prototype)
            team_id = f"{ticket.team}_lead" if ticket.team else "service_desk_lead"
            
            await self.comm_manager.send_message(
                recipient_id=team_id,
                message_type="ticket_escalation",
                payload=escalation_message
            )
            
            # Log escalation
            await self._log_activity("ticket_escalation", {
                "ticket_id": ticket_id,
                "reason": reason,
                "team": ticket.team,
                "priority": ticket.priority.value if ticket.priority else None
            })
            
        except Exception as e:
            self.logger.error(f"Ticket escalation failed: {e}")
            
    async def _handle_service_delivery_task(self, task: Task) -> Dict[str, Any]:
        """Handle service delivery tasks."""
        try:
            task_description = task.description.lower()
            
            # Determine service type from task description
            if "ticket" in task_description and "triage" in task_description:
                # Simulate ticket triage task
                sample_ticket = {
                    "ticket_id": str(uuid.uuid4()),
                    "title": "Sample ticket for analysis",
                    "description": task.context.get("ticket_description", "General service request"),
                    "requester": "system_user",
                    "client_id": "client_002"
                }
                
                return await self.triage_ticket(sample_ticket)
                
            elif "service" in task_description and "optimize" in task_description:
                # Service optimization task
                return await self._optimize_service_delivery()
                
            else:
                # Generic service task
                return {
                    "success": True,
                    "task_type": "generic_service",
                    "description": "Service delivery task completed",
                    "task_id": task.task_id
                }
                
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "task_id": task.task_id
            }
            
    async def _optimize_service_delivery(self) -> Dict[str, Any]:
        """Optimize service delivery processes."""
        try:
            # Analyze current ticket metrics
            total_tickets = len(self.active_tickets) + len(self.ticket_history)
            
            if total_tickets == 0:
                return {
                    "success": True,
                    "optimization_type": "baseline",
                    "message": "No tickets to analyze yet"
                }
                
            # Calculate metrics
            sla_compliant_tickets = 0
            total_resolution_time = 0
            resolved_tickets = 0
            
            for ticket in self.ticket_history:
                if ticket.resolved_at:
                    resolved_tickets += 1
                    resolution_time = (ticket.resolved_at - ticket.created_at).total_seconds()
                    total_resolution_time += resolution_time
                    
                    # Check SLA compliance (simplified)
                    if ticket.resolution_due and ticket.resolved_at <= ticket.resolution_due:
                        sla_compliant_tickets += 1
                        
            # Calculate optimization recommendations
            recommendations = []
            
            if resolved_tickets > 0:
                avg_resolution_time = total_resolution_time / resolved_tickets / 3600  # Convert to hours
                sla_compliance_rate = sla_compliant_tickets / resolved_tickets
                
                if avg_resolution_time > 24:
                    recommendations.append("Consider automating more routine tasks to reduce resolution time")
                    
                if sla_compliance_rate < 0.8:
                    recommendations.append("Review SLA targets and team assignments to improve compliance")
                    
                if self.average_triage_time > 300:  # 5 minutes
                    recommendations.append("Optimize triage process to reduce classification time")
            else:
                recommendations.append("Insufficient data for optimization analysis")
                
            return {
                "success": True,
                "optimization_type": "service_delivery",
                "metrics": {
                    "total_tickets": total_tickets,
                    "resolved_tickets": resolved_tickets,
                    "average_resolution_hours": total_resolution_time / resolved_tickets / 3600 if resolved_tickets > 0 else 0,
                    "sla_compliance_rate": sla_compliant_tickets / resolved_tickets if resolved_tickets > 0 else 0,
                    "average_triage_time_seconds": self.average_triage_time
                },
                "recommendations": recommendations
            }
            
        except Exception as e:
            return {
                "success": False,
                "error": str(e),
                "optimization_type": "failed"
            }