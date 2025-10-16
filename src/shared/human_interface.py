"""
Human-in-the-loop interface and approval system for ACSO.
"""

import asyncio
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass

from .models import Task, Incident, AgentMessage
from config.settings import settings


class ApprovalType(str, Enum):
    """Types of approval requests."""
    HIGH_RISK_ACTION = "high_risk_action"
    CRITICAL_INCIDENT = "critical_incident"
    SYSTEM_CHANGE = "system_change"
    FINANCIAL_DECISION = "financial_decision"
    POLICY_OVERRIDE = "policy_override"


class ApprovalStatus(str, Enum):
    """Status of approval requests."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    ESCALATED = "escalated"


@dataclass
class ApprovalRequest:
    """Represents a human approval request."""
    request_id: str
    approval_type: ApprovalType
    requester_agent_id: str
    action_description: str
    risk_assessment: Dict[str, Any]
    context: Dict[str, Any]
    status: ApprovalStatus
    created_at: datetime
    expires_at: datetime
    approved_by: Optional[str] = None
    approved_at: Optional[datetime] = None
    rejection_reason: Optional[str] = None
    escalation_level: int = 0


class RiskAssessment:
    """Risk assessment for actions requiring approval."""
    
    @staticmethod
    def assess_action_risk(action: str, context: Dict[str, Any]) -> Dict[str, Any]:
        """Assess the risk level of an action."""
        risk_score = 0.0
        risk_factors = []
        
        # Action-based risk scoring
        high_risk_actions = [
            "isolate_production_server",
            "disable_critical_service",
            "modify_security_policy",
            "delete_data",
            "shutdown_system"
        ]
        
        medium_risk_actions = [
            "block_ip_address",
            "disable_user_account",
            "restart_service",
            "apply_patch",
            "modify_configuration"
        ]
        
        action_lower = action.lower()
        
        if any(high_risk in action_lower for high_risk in high_risk_actions):
            risk_score += 0.7
            risk_factors.append("High-impact action detected")
            
        elif any(medium_risk in action_lower for medium_risk in medium_risk_actions):
            risk_score += 0.4
            risk_factors.append("Medium-impact action detected")
            
        # Context-based risk scoring
        affected_systems = context.get("affected_systems", [])
        if len(affected_systems) > 5:
            risk_score += 0.2
            risk_factors.append(f"Multiple systems affected ({len(affected_systems)})")
            
        business_hours = context.get("business_hours", True)
        if business_hours:
            risk_score += 0.1
            risk_factors.append("Action during business hours")
            
        critical_system = context.get("critical_system", False)
        if critical_system:
            risk_score += 0.3
            risk_factors.append("Critical system involved")
            
        # Financial impact
        financial_impact = context.get("financial_impact", 0)
        if financial_impact > 10000:
            risk_score += 0.2
            risk_factors.append(f"High financial impact (${financial_impact})")
            
        # Normalize risk score
        risk_score = min(1.0, risk_score)
        
        # Determine risk level
        if risk_score >= 0.8:
            risk_level = "CRITICAL"
        elif risk_score >= 0.6:
            risk_level = "HIGH"
        elif risk_score >= 0.4:
            risk_level = "MEDIUM"
        else:
            risk_level = "LOW"
            
        return {
            "risk_score": risk_score,
            "risk_level": risk_level,
            "risk_factors": risk_factors,
            "requires_approval": risk_score >= settings.security.high_risk_threshold,
            "requires_escalation": risk_score >= settings.security.critical_risk_threshold
        }


class HumanApprovalInterface:
    """Interface for human approval workflows."""
    
    def __init__(self):
        self.pending_requests: Dict[str, ApprovalRequest] = {}
        self.approval_history: List[ApprovalRequest] = []
        self.approval_callbacks: Dict[str, Callable] = {}
        self.auto_approval_rules: List[Dict[str, Any]] = []
        
        # Default approval timeouts (in minutes)
        self.approval_timeouts = {
            ApprovalType.HIGH_RISK_ACTION: 30,
            ApprovalType.CRITICAL_INCIDENT: 15,
            ApprovalType.SYSTEM_CHANGE: 60,
            ApprovalType.FINANCIAL_DECISION: 120,
            ApprovalType.POLICY_OVERRIDE: 240
        }
        
    async def request_approval(self, 
                             approval_type: ApprovalType,
                             requester_agent_id: str,
                             action_description: str,
                             context: Dict[str, Any]) -> str:
        """Request human approval for an action."""
        
        # Assess risk
        risk_assessment = RiskAssessment.assess_action_risk(action_description, context)
        
        # Check if approval is actually required
        if not risk_assessment.get("requires_approval", False):
            return "auto_approved"
            
        # Check auto-approval rules
        if await self._check_auto_approval_rules(action_description, context, risk_assessment):
            return "auto_approved"
            
        # Create approval request
        request_id = str(uuid.uuid4())
        timeout_minutes = self.approval_timeouts.get(approval_type, 30)
        
        approval_request = ApprovalRequest(
            request_id=request_id,
            approval_type=approval_type,
            requester_agent_id=requester_agent_id,
            action_description=action_description,
            risk_assessment=risk_assessment,
            context=context,
            status=ApprovalStatus.PENDING,
            created_at=datetime.utcnow(),
            expires_at=datetime.utcnow() + timedelta(minutes=timeout_minutes)
        )
        
        self.pending_requests[request_id] = approval_request
        
        # Log approval request
        print(f"APPROVAL REQUIRED: {action_description}")
        print(f"Risk Level: {risk_assessment['risk_level']} (Score: {risk_assessment['risk_score']:.2f})")
        print(f"Request ID: {request_id}")
        print(f"Expires: {approval_request.expires_at}")
        
        # In a real implementation, this would:
        # 1. Send notification to human operators
        # 2. Display in dashboard/UI
        # 3. Send email/SMS alerts
        # 4. Integrate with ticketing system
        
        return request_id
        
    async def provide_approval(self, 
                             request_id: str, 
                             approved: bool, 
                             approver_id: str,
                             reason: Optional[str] = None) -> bool:
        """Provide approval decision for a request."""
        
        if request_id not in self.pending_requests:
            return False
            
        request = self.pending_requests[request_id]
        
        # Check if request has expired
        if datetime.utcnow() > request.expires_at:
            request.status = ApprovalStatus.EXPIRED
            return False
            
        # Update request
        request.status = ApprovalStatus.APPROVED if approved else ApprovalStatus.REJECTED
        request.approved_by = approver_id
        request.approved_at = datetime.utcnow()
        
        if not approved and reason:
            request.rejection_reason = reason
            
        # Move to history
        self.approval_history.append(request)
        del self.pending_requests[request_id]
        
        # Execute callback if registered
        if request_id in self.approval_callbacks:
            callback = self.approval_callbacks[request_id]
            await callback(approved, reason)
            del self.approval_callbacks[request_id]
            
        print(f"Approval decision: {request.status.value} for request {request_id}")
        
        return True
        
    async def register_approval_callback(self, request_id: str, callback: Callable) -> None:
        """Register a callback for approval decision."""
        self.approval_callbacks[request_id] = callback
        
    async def get_pending_approvals(self, approver_id: Optional[str] = None) -> List[ApprovalRequest]:
        """Get pending approval requests."""
        pending = list(self.pending_requests.values())
        
        # Filter expired requests
        now = datetime.utcnow()
        active_pending = []
        
        for request in pending:
            if now > request.expires_at:
                request.status = ApprovalStatus.EXPIRED
                self.approval_history.append(request)
                del self.pending_requests[request.request_id]
            else:
                active_pending.append(request)
                
        return active_pending
        
    async def escalate_approval(self, request_id: str, escalation_reason: str) -> bool:
        """Escalate an approval request to higher authority."""
        
        if request_id not in self.pending_requests:
            return False
            
        request = self.pending_requests[request_id]
        request.escalation_level += 1
        request.status = ApprovalStatus.ESCALATED
        
        # Extend timeout for escalated requests
        request.expires_at = datetime.utcnow() + timedelta(minutes=60)
        
        print(f"Approval request {request_id} escalated (level {request.escalation_level}): {escalation_reason}")
        
        # In a real implementation, this would notify higher-level approvers
        
        return True
        
    async def add_auto_approval_rule(self, rule: Dict[str, Any]) -> None:
        """Add an auto-approval rule."""
        self.auto_approval_rules.append(rule)
        
    async def _check_auto_approval_rules(self, 
                                       action: str, 
                                       context: Dict[str, Any],
                                       risk_assessment: Dict[str, Any]) -> bool:
        """Check if action matches any auto-approval rules."""
        
        for rule in self.auto_approval_rules:
            if await self._matches_rule(action, context, risk_assessment, rule):
                print(f"Auto-approved action '{action}' based on rule: {rule.get('name', 'unnamed')}")
                return True
                
        return False
        
    async def _matches_rule(self, 
                          action: str, 
                          context: Dict[str, Any],
                          risk_assessment: Dict[str, Any],
                          rule: Dict[str, Any]) -> bool:
        """Check if an action matches a specific auto-approval rule."""
        
        # Check risk level constraint
        max_risk = rule.get("max_risk_score", 1.0)
        if risk_assessment["risk_score"] > max_risk:
            return False
            
        # Check action pattern
        action_patterns = rule.get("action_patterns", [])
        if action_patterns:
            action_lower = action.lower()
            if not any(pattern.lower() in action_lower for pattern in action_patterns):
                return False
                
        # Check context constraints
        context_constraints = rule.get("context_constraints", {})
        for key, expected_value in context_constraints.items():
            if context.get(key) != expected_value:
                return False
                
        # Check time constraints
        time_constraints = rule.get("time_constraints", {})
        if time_constraints:
            now = datetime.utcnow()
            
            # Business hours constraint
            if "business_hours_only" in time_constraints:
                business_hours = time_constraints["business_hours_only"]
                is_business_hours = 9 <= now.hour <= 17 and now.weekday() < 5
                
                if business_hours and not is_business_hours:
                    return False
                elif not business_hours and is_business_hours:
                    return False
                    
        return True
        
    async def get_approval_statistics(self) -> Dict[str, Any]:
        """Get approval system statistics."""
        
        total_requests = len(self.approval_history) + len(self.pending_requests)
        approved_requests = len([r for r in self.approval_history if r.status == ApprovalStatus.APPROVED])
        rejected_requests = len([r for r in self.approval_history if r.status == ApprovalStatus.REJECTED])
        expired_requests = len([r for r in self.approval_history if r.status == ApprovalStatus.EXPIRED])
        
        # Calculate average response time
        completed_requests = [r for r in self.approval_history if r.approved_at]
        avg_response_time = 0
        
        if completed_requests:
            total_response_time = sum(
                (r.approved_at - r.created_at).total_seconds() 
                for r in completed_requests
            )
            avg_response_time = total_response_time / len(completed_requests)
            
        return {
            "total_requests": total_requests,
            "pending_requests": len(self.pending_requests),
            "approved_requests": approved_requests,
            "rejected_requests": rejected_requests,
            "expired_requests": expired_requests,
            "approval_rate": approved_requests / max(1, total_requests - len(self.pending_requests)),
            "average_response_time_seconds": avg_response_time,
            "auto_approval_rules": len(self.auto_approval_rules)
        }


class DecisionLearningEngine:
    """Engine for learning from human approval decisions."""
    
    def __init__(self, approval_interface: HumanApprovalInterface):
        self.approval_interface = approval_interface
        self.decision_patterns: List[Dict[str, Any]] = []
        
    async def analyze_approval_patterns(self) -> Dict[str, Any]:
        """Analyze patterns in human approval decisions."""
        
        history = self.approval_interface.approval_history
        
        if len(history) < 10:  # Need minimum data for analysis
            return {"status": "insufficient_data", "message": "Need at least 10 decisions for analysis"}
            
        # Analyze approval patterns by risk level
        risk_level_stats = {}
        for request in history:
            risk_level = request.risk_assessment.get("risk_level", "UNKNOWN")
            
            if risk_level not in risk_level_stats:
                risk_level_stats[risk_level] = {"total": 0, "approved": 0}
                
            risk_level_stats[risk_level]["total"] += 1
            if request.status == ApprovalStatus.APPROVED:
                risk_level_stats[risk_level]["approved"] += 1
                
        # Calculate approval rates by risk level
        for level, stats in risk_level_stats.items():
            stats["approval_rate"] = stats["approved"] / stats["total"]
            
        # Identify potential auto-approval opportunities
        auto_approval_candidates = []
        
        for level, stats in risk_level_stats.items():
            if stats["approval_rate"] > 0.9 and stats["total"] >= 5:
                auto_approval_candidates.append({
                    "risk_level": level,
                    "approval_rate": stats["approval_rate"],
                    "sample_size": stats["total"]
                })
                
        return {
            "status": "success",
            "risk_level_statistics": risk_level_stats,
            "auto_approval_candidates": auto_approval_candidates,
            "total_decisions": len(history)
        }
        
    async def suggest_auto_approval_rules(self) -> List[Dict[str, Any]]:
        """Suggest new auto-approval rules based on decision patterns."""
        
        analysis = await self.analyze_approval_patterns()
        
        if analysis["status"] != "success":
            return []
            
        suggestions = []
        
        # Suggest rules for high-approval-rate, low-risk actions
        for candidate in analysis["auto_approval_candidates"]:
            if candidate["risk_level"] in ["LOW", "MEDIUM"]:
                suggestions.append({
                    "name": f"Auto-approve {candidate['risk_level'].lower()} risk actions",
                    "description": f"Auto-approve actions with {candidate['risk_level']} risk level based on {candidate['approval_rate']:.1%} historical approval rate",
                    "max_risk_score": 0.4 if candidate["risk_level"] == "LOW" else 0.6,
                    "confidence": candidate["approval_rate"],
                    "sample_size": candidate["sample_size"]
                })
                
        return suggestions
        
    async def update_risk_thresholds(self) -> Dict[str, Any]:
        """Suggest updates to risk thresholds based on approval patterns."""
        
        analysis = await self.analyze_approval_patterns()
        
        if analysis["status"] != "success":
            return {"status": "insufficient_data"}
            
        suggestions = {}
        
        # Analyze if current thresholds are appropriate
        risk_stats = analysis["risk_level_statistics"]
        
        # If HIGH risk actions are approved too frequently, suggest raising threshold
        if "HIGH" in risk_stats and risk_stats["HIGH"]["approval_rate"] > 0.8:
            suggestions["high_risk_threshold"] = {
                "current": settings.security.high_risk_threshold,
                "suggested": min(0.9, settings.security.high_risk_threshold + 0.1),
                "reason": f"HIGH risk actions approved {risk_stats['HIGH']['approval_rate']:.1%} of the time"
            }
            
        # If MEDIUM risk actions are rejected frequently, suggest lowering threshold
        if "MEDIUM" in risk_stats and risk_stats["MEDIUM"]["approval_rate"] < 0.5:
            suggestions["high_risk_threshold"] = {
                "current": settings.security.high_risk_threshold,
                "suggested": max(0.5, settings.security.high_risk_threshold - 0.1),
                "reason": f"MEDIUM risk actions only approved {risk_stats['MEDIUM']['approval_rate']:.1%} of the time"
            }
            
        return {
            "status": "success",
            "threshold_suggestions": suggestions
        }


# Global approval interface instance
human_approval_interface = HumanApprovalInterface()
decision_learning_engine = DecisionLearningEngine(human_approval_interface)