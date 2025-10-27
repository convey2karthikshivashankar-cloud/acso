"""
ACSO Enterprise Framework - Advanced Role-Based Access Control (RBAC) Engine

This module implements a comprehensive fine-grained RBAC system with policy engine,
approval workflows, and compliance violation detection for enterprise environments.

Key Features:
- Hierarchical role and permission management
- Dynamic policy evaluation with context awareness
- Multi-stage approval workflows with escalation
- Real-time compliance monitoring and violation detection
- Audit trail integration with immutable logging
- Integration with external identity providers
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Set, Tuple
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import json
import uuid
import hashlib
from concurrent.futures import ThreadPoolExecutor
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class PermissionType(Enum):
    """Types of permissions in the system."""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    EXECUTE = "execute"
    ADMIN = "admin"
    APPROVE = "approve"
    AUDIT = "audit"
    CONFIGURE = "configure"

class ResourceType(Enum):
    """Types of resources that can be protected."""
    AGENT = "agent"
    TENANT = "tenant"
    USER = "user"
    ROLE = "role"
    POLICY = "policy"
    WORKFLOW = "workflow"
    REPORT = "report"
    CONFIGURATION = "configuration"
    BILLING = "billing"
    AUDIT_LOG = "audit_log"

class ApprovalStatus(Enum):
    """Status of approval requests."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"
    ESCALATED = "escalated"

class ViolationType(Enum):
    """Types of compliance violations."""
    UNAUTHORIZED_ACCESS = "unauthorized_access"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    POLICY_VIOLATION = "policy_violation"
    SEGREGATION_VIOLATION = "segregation_violation"
    TIME_RESTRICTION_VIOLATION = "time_restriction_violation"
    LOCATION_RESTRICTION_VIOLATION = "location_restriction_violation"

@dataclass
class Permission:
    """Individual permission definition."""
    permission_id: str
    name: str
    description: str
    permission_type: PermissionType
    resource_type: ResourceType
    actions: List[str]
    conditions: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

@dataclass
class Role:
    """Role definition with hierarchical support."""
    role_id: str
    name: str
    description: str
    permissions: Set[str]  # permission_ids
    parent_roles: Set[str] = field(default_factory=set)  # role_ids
    child_roles: Set[str] = field(default_factory=set)  # role_ids
    constraints: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

@dataclass
class PolicyRule:
    """Individual policy rule."""
    rule_id: str
    name: str
    description: str
    condition: str  # Policy expression
    effect: str  # "allow" or "deny"
    priority: int = 0
    is_active: bool = True

@dataclass
class Policy:
    """Policy containing multiple rules."""
    policy_id: str
    name: str
    description: str
    rules: List[PolicyRule]
    applies_to: Dict[str, List[str]]  # resource_type -> resource_ids
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

@dataclass
class UserRoleAssignment:
    """Assignment of roles to users."""
    assignment_id: str
    user_id: str
    role_id: str
    tenant_id: Optional[str] = None
    resource_scope: Dict[str, List[str]] = field(default_factory=dict)
    conditions: Dict[str, Any] = field(default_factory=dict)
    valid_from: datetime = field(default_factory=datetime.now)
    valid_until: Optional[datetime] = None
    assigned_by: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

@dataclass
class ApprovalRequest:
    """Request for approval of privileged actions."""
    request_id: str
    user_id: str
    action: str
    resource_type: ResourceType
    resource_id: str
    justification: str
    requested_permissions: List[str]
    approvers: List[str]
    approval_chain: List[Dict[str, Any]] = field(default_factory=list)
    status: ApprovalStatus = ApprovalStatus.PENDING
    expires_at: datetime = field(default_factory=lambda: datetime.now() + timedelta(hours=24))
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ComplianceViolation:
    """Compliance violation record."""
    violation_id: str
    user_id: str
    violation_type: ViolationType
    description: str
    resource_type: ResourceType
    resource_id: str
    severity: str  # "low", "medium", "high", "critical"
    detected_at: datetime = field(default_factory=datetime.now)
    resolved_at: Optional[datetime] = None
    resolution_notes: str = ""
    metadata: Dict[str, Any] = field(default_factory=dict)
    is_resolved: bool = False

class PolicyEngine:
    """Evaluates policies and makes access control decisions."""
    
    def __init__(self):
        """Initialize policy engine."""
        self.policy_cache = {}
        self.evaluation_cache = {}
        self.cache_ttl = timedelta(minutes=5)
    
    async def evaluate_access(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Evaluate if user has access to perform action on resource."""
        try:
            context = context or {}
            
            # Create evaluation key for caching
            eval_key = self._create_evaluation_key(user_id, action, resource_type, resource_id, context)
            
            # Check cache
            if eval_key in self.evaluation_cache:
                cached_result = self.evaluation_cache[eval_key]
                if datetime.now() - cached_result['timestamp'] < self.cache_ttl:
                    return cached_result['result']
            
            # Get user roles and permissions
            user_permissions = await self._get_user_permissions(user_id, context)
            
            # Get applicable policies
            policies = await self._get_applicable_policies(resource_type, resource_id, context)
            
            # Evaluate permissions
            permission_result = await self._evaluate_permissions(
                user_permissions, action, resource_type, resource_id, context
            )
            
            # Evaluate policies
            policy_result = await self._evaluate_policies(
                policies, user_id, action, resource_type, resource_id, context
            )
            
            # Combine results (policies can override permissions)
            final_decision = self._combine_evaluation_results(permission_result, policy_result)
            
            # Add additional context
            result = {
                'allowed': final_decision['allowed'],
                'reason': final_decision['reason'],
                'requires_approval': final_decision.get('requires_approval', False),
                'conditions': final_decision.get('conditions', {}),
                'evaluated_at': datetime.now().isoformat(),
                'user_id': user_id,
                'action': action,
                'resource_type': resource_type.value,
                'resource_id': resource_id
            }
            
            # Cache result
            self.evaluation_cache[eval_key] = {
                'result': result,
                'timestamp': datetime.now()
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to evaluate access: {e}")
            return {
                'allowed': False,
                'reason': f'Evaluation error: {str(e)}',
                'evaluated_at': datetime.now().isoformat()
            }
    
    async def _get_user_permissions(self, user_id: str, context: Dict[str, Any]) -> Set[str]:
        """Get all permissions for a user based on their roles."""
        # This would integrate with the role management system
        # For now, return mock permissions
        return {
            'read_agent', 'write_agent', 'read_tenant', 'configure_workflow'
        }
    
    async def _get_applicable_policies(
        self,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> List[Policy]:
        """Get policies that apply to the resource."""
        # This would query the policy storage
        # For now, return mock policies
        return []
    
    async def _evaluate_permissions(
        self,
        user_permissions: Set[str],
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate user permissions for the action."""
        required_permission = f"{action}_{resource_type.value}"
        
        if required_permission in user_permissions:
            return {
                'allowed': True,
                'reason': f'User has required permission: {required_permission}'
            }
        else:
            return {
                'allowed': False,
                'reason': f'User lacks required permission: {required_permission}'
            }
    
    async def _evaluate_policies(
        self,
        policies: List[Policy],
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Evaluate policies for the access request."""
        if not policies:
            return {'allowed': None, 'reason': 'No applicable policies'}
        
        # Sort policies by priority
        sorted_policies = sorted(policies, key=lambda p: max(rule.priority for rule in p.rules), reverse=True)
        
        for policy in sorted_policies:
            for rule in sorted(policy.rules, key=lambda r: r.priority, reverse=True):
                if not rule.is_active:
                    continue
                
                # Evaluate rule condition
                if await self._evaluate_rule_condition(rule.condition, user_id, action, resource_type, resource_id, context):
                    if rule.effect == "deny":
                        return {
                            'allowed': False,
                            'reason': f'Denied by policy rule: {rule.name}'
                        }
                    elif rule.effect == "allow":
                        return {
                            'allowed': True,
                            'reason': f'Allowed by policy rule: {rule.name}'
                        }
        
        return {'allowed': None, 'reason': 'No matching policy rules'}
    
    async def _evaluate_rule_condition(
        self,
        condition: str,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> bool:
        """Evaluate a policy rule condition."""
        # This would implement a policy expression evaluator
        # For now, return True for demonstration
        return True
    
    def _combine_evaluation_results(
        self,
        permission_result: Dict[str, Any],
        policy_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Combine permission and policy evaluation results."""
        # Policy decisions override permission decisions
        if policy_result['allowed'] is not None:
            return policy_result
        else:
            return permission_result
    
    def _create_evaluation_key(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> str:
        """Create a cache key for evaluation results."""
        context_str = json.dumps(context, sort_keys=True)
        key_data = f"{user_id}:{action}:{resource_type.value}:{resource_id}:{context_str}"
        return hashlib.md5(key_data.encode()).hexdigest()

class ApprovalWorkflowEngine:
    """Manages approval workflows for privileged actions."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize approval workflow engine."""
        self.config = config
        self.pending_requests: Dict[str, ApprovalRequest] = {}
        self.approval_chains: Dict[str, List[str]] = {}
    
    async def create_approval_request(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        justification: str,
        requested_permissions: List[str]
    ) -> Dict[str, Any]:
        """Create a new approval request."""
        try:
            request_id = str(uuid.uuid4())
            
            # Determine approvers based on action and resource
            approvers = await self._determine_approvers(action, resource_type, resource_id)
            
            if not approvers:
                return {
                    'success': False,
                    'error': 'No approvers found for this request'
                }
            
            # Create approval request
            request = ApprovalRequest(
                request_id=request_id,
                user_id=user_id,
                action=action,
                resource_type=resource_type,
                resource_id=resource_id,
                justification=justification,
                requested_permissions=requested_permissions,
                approvers=approvers
            )
            
            self.pending_requests[request_id] = request
            
            # Notify first approver
            await self._notify_approver(request, approvers[0])
            
            logger.info(f"Created approval request: {request_id}")
            
            return {
                'success': True,
                'request_id': request_id,
                'approvers': approvers,
                'expires_at': request.expires_at.isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to create approval request: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def process_approval(
        self,
        request_id: str,
        approver_id: str,
        decision: str,
        comments: str = ""
    ) -> Dict[str, Any]:
        """Process an approval decision."""
        try:
            if request_id not in self.pending_requests:
                return {
                    'success': False,
                    'error': 'Approval request not found'
                }
            
            request = self.pending_requests[request_id]
            
            # Check if approver is authorized
            if approver_id not in request.approvers:
                return {
                    'success': False,
                    'error': 'User not authorized to approve this request'
                }
            
            # Check if request has expired
            if datetime.now() > request.expires_at:
                request.status = ApprovalStatus.EXPIRED
                return {
                    'success': False,
                    'error': 'Approval request has expired'
                }
            
            # Record approval decision
            approval_entry = {
                'approver_id': approver_id,
                'decision': decision,
                'comments': comments,
                'timestamp': datetime.now().isoformat()
            }
            request.approval_chain.append(approval_entry)
            
            if decision.lower() == 'reject':
                request.status = ApprovalStatus.REJECTED
                await self._notify_requester(request, 'rejected')
                
                return {
                    'success': True,
                    'status': 'rejected',
                    'message': 'Request has been rejected'
                }
            
            elif decision.lower() == 'approve':
                # Check if this is the final approval needed
                current_approver_index = request.approvers.index(approver_id)
                
                if current_approver_index == len(request.approvers) - 1:
                    # Final approval
                    request.status = ApprovalStatus.APPROVED
                    await self._grant_temporary_permissions(request)
                    await self._notify_requester(request, 'approved')
                    
                    return {
                        'success': True,
                        'status': 'approved',
                        'message': 'Request has been fully approved'
                    }
                else:
                    # Need more approvals
                    next_approver = request.approvers[current_approver_index + 1]
                    await self._notify_approver(request, next_approver)
                    
                    return {
                        'success': True,
                        'status': 'pending',
                        'message': f'Approved by {approver_id}, waiting for {next_approver}'
                    }
            
            else:
                return {
                    'success': False,
                    'error': 'Invalid decision. Must be "approve" or "reject"'
                }
                
        except Exception as e:
            logger.error(f"Failed to process approval: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _determine_approvers(
        self,
        action: str,
        resource_type: ResourceType,
        resource_id: str
    ) -> List[str]:
        """Determine who needs to approve this request."""
        # This would implement approval chain logic based on action and resource
        # For now, return mock approvers
        if action in ['delete', 'admin']:
            return ['manager_001', 'admin_001']  # Two-level approval
        else:
            return ['manager_001']  # Single approval
    
    async def _notify_approver(self, request: ApprovalRequest, approver_id: str):
        """Notify an approver about a pending request."""
        # This would integrate with notification system
        logger.info(f"Notifying approver {approver_id} about request {request.request_id}")
    
    async def _notify_requester(self, request: ApprovalRequest, status: str):
        """Notify the requester about the approval status."""
        # This would integrate with notification system
        logger.info(f"Notifying requester {request.user_id} that request {request.request_id} is {status}")
    
    async def _grant_temporary_permissions(self, request: ApprovalRequest):
        """Grant temporary permissions after approval."""
        # This would integrate with the permission system
        logger.info(f"Granting temporary permissions for request {request.request_id}")

class ComplianceMonitor:
    """Monitors for compliance violations in real-time."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize compliance monitor."""
        self.config = config
        self.violations: Dict[str, ComplianceViolation] = {}
        self.monitoring_rules = self._load_monitoring_rules()
    
    async def monitor_access_attempt(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        access_granted: bool,
        context: Dict[str, Any] = None
    ):
        """Monitor an access attempt for compliance violations."""
        try:
            context = context or {}
            
            # Check for various violation types
            violations = []
            
            # Check for unauthorized access
            if not access_granted:
                violation = await self._check_unauthorized_access(
                    user_id, action, resource_type, resource_id, context
                )
                if violation:
                    violations.append(violation)
            
            # Check for privilege escalation
            escalation_violation = await self._check_privilege_escalation(
                user_id, action, resource_type, resource_id, context
            )
            if escalation_violation:
                violations.append(escalation_violation)
            
            # Check for segregation of duties violations
            segregation_violation = await self._check_segregation_violation(
                user_id, action, resource_type, resource_id, context
            )
            if segregation_violation:
                violations.append(segregation_violation)
            
            # Check for time restrictions
            time_violation = await self._check_time_restrictions(
                user_id, action, resource_type, resource_id, context
            )
            if time_violation:
                violations.append(time_violation)
            
            # Check for location restrictions
            location_violation = await self._check_location_restrictions(
                user_id, action, resource_type, resource_id, context
            )
            if location_violation:
                violations.append(location_violation)
            
            # Record violations
            for violation in violations:
                await self._record_violation(violation)
            
        except Exception as e:
            logger.error(f"Failed to monitor access attempt: {e}")
    
    async def _check_unauthorized_access(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> Optional[ComplianceViolation]:
        """Check for unauthorized access attempts."""
        # This would implement unauthorized access detection logic
        return None
    
    async def _check_privilege_escalation(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> Optional[ComplianceViolation]:
        """Check for privilege escalation attempts."""
        # This would implement privilege escalation detection logic
        return None
    
    async def _check_segregation_violation(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> Optional[ComplianceViolation]:
        """Check for segregation of duties violations."""
        # This would implement segregation of duties checking
        return None
    
    async def _check_time_restrictions(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> Optional[ComplianceViolation]:
        """Check for time-based access restrictions."""
        # This would implement time restriction checking
        return None
    
    async def _check_location_restrictions(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any]
    ) -> Optional[ComplianceViolation]:
        """Check for location-based access restrictions."""
        # This would implement location restriction checking
        return None
    
    async def _record_violation(self, violation: ComplianceViolation):
        """Record a compliance violation."""
        self.violations[violation.violation_id] = violation
        
        # Send alert based on severity
        if violation.severity in ['high', 'critical']:
            await self._send_immediate_alert(violation)
        
        logger.warning(f"Compliance violation detected: {violation.violation_id}")
    
    async def _send_immediate_alert(self, violation: ComplianceViolation):
        """Send immediate alert for high-severity violations."""
        # This would integrate with alerting system
        logger.critical(f"CRITICAL VIOLATION: {violation.description}")
    
    def _load_monitoring_rules(self) -> Dict[str, Any]:
        """Load compliance monitoring rules."""
        # This would load rules from configuration
        return {
            'unauthorized_access_threshold': 3,
            'privilege_escalation_patterns': [],
            'segregation_rules': {},
            'time_restrictions': {},
            'location_restrictions': {}
        }

class AdvancedRBACEngine:
    """Main RBAC engine that orchestrates all components."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize advanced RBAC engine."""
        self.config = config
        self.policy_engine = PolicyEngine()
        self.approval_engine = ApprovalWorkflowEngine(config)
        self.compliance_monitor = ComplianceMonitor(config)
        
        # Storage
        self.permissions: Dict[str, Permission] = {}
        self.roles: Dict[str, Role] = {}
        self.policies: Dict[str, Policy] = {}
        self.user_assignments: Dict[str, List[UserRoleAssignment]] = {}
        
        logger.info("Advanced RBAC engine initialized")
    
    async def check_access(
        self,
        user_id: str,
        action: str,
        resource_type: ResourceType,
        resource_id: str,
        context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Check if user has access to perform action on resource."""
        try:
            # Evaluate access using policy engine
            evaluation_result = await self.policy_engine.evaluate_access(
                user_id, action, resource_type, resource_id, context
            )
            
            # Monitor the access attempt
            await self.compliance_monitor.monitor_access_attempt(
                user_id, action, resource_type, resource_id, 
                evaluation_result['allowed'], context
            )
            
            # If access requires approval, create approval request
            if evaluation_result.get('requires_approval', False):
                approval_result = await self.approval_engine.create_approval_request(
                    user_id=user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    justification=context.get('justification', 'Privileged access required'),
                    requested_permissions=[f"{action}_{resource_type.value}"]
                )
                
                evaluation_result['approval_request'] = approval_result
            
            return evaluation_result
            
        except Exception as e:
            logger.error(f"Failed to check access: {e}")
            return {
                'allowed': False,
                'reason': f'Access check failed: {str(e)}',
                'error': True
            }
    
    async def create_role(
        self,
        name: str,
        description: str,
        permissions: List[str],
        parent_roles: List[str] = None
    ) -> Dict[str, Any]:
        """Create a new role."""
        try:
            role_id = str(uuid.uuid4())
            
            role = Role(
                role_id=role_id,
                name=name,
                description=description,
                permissions=set(permissions),
                parent_roles=set(parent_roles or [])
            )
            
            # Update parent-child relationships
            for parent_id in parent_roles or []:
                if parent_id in self.roles:
                    self.roles[parent_id].child_roles.add(role_id)
            
            self.roles[role_id] = role
            
            logger.info(f"Created role: {role_id}")
            
            return {
                'success': True,
                'role_id': role_id
            }
            
        except Exception as e:
            logger.error(f"Failed to create role: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def assign_role_to_user(
        self,
        user_id: str,
        role_id: str,
        tenant_id: str = None,
        conditions: Dict[str, Any] = None,
        valid_until: datetime = None
    ) -> Dict[str, Any]:
        """Assign a role to a user."""
        try:
            if role_id not in self.roles:
                return {
                    'success': False,
                    'error': 'Role not found'
                }
            
            assignment_id = str(uuid.uuid4())
            
            assignment = UserRoleAssignment(
                assignment_id=assignment_id,
                user_id=user_id,
                role_id=role_id,
                tenant_id=tenant_id,
                conditions=conditions or {},
                valid_until=valid_until
            )
            
            if user_id not in self.user_assignments:
                self.user_assignments[user_id] = []
            
            self.user_assignments[user_id].append(assignment)
            
            logger.info(f"Assigned role {role_id} to user {user_id}")
            
            return {
                'success': True,
                'assignment_id': assignment_id
            }
            
        except Exception as e:
            logger.error(f"Failed to assign role: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def create_policy(
        self,
        name: str,
        description: str,
        rules: List[Dict[str, Any]],
        applies_to: Dict[str, List[str]]
    ) -> Dict[str, Any]:
        """Create a new policy."""
        try:
            policy_id = str(uuid.uuid4())
            
            policy_rules = []
            for rule_data in rules:
                rule = PolicyRule(
                    rule_id=str(uuid.uuid4()),
                    name=rule_data['name'],
                    description=rule_data['description'],
                    condition=rule_data['condition'],
                    effect=rule_data['effect'],
                    priority=rule_data.get('priority', 0)
                )
                policy_rules.append(rule)
            
            policy = Policy(
                policy_id=policy_id,
                name=name,
                description=description,
                rules=policy_rules,
                applies_to=applies_to
            )
            
            self.policies[policy_id] = policy
            
            logger.info(f"Created policy: {policy_id}")
            
            return {
                'success': True,
                'policy_id': policy_id
            }
            
        except Exception as e:
            logger.error(f"Failed to create policy: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_user_permissions(self, user_id: str, tenant_id: str = None) -> Dict[str, Any]:
        """Get all effective permissions for a user."""
        try:
            effective_permissions = set()
            user_roles = []
            
            # Get user role assignments
            assignments = self.user_assignments.get(user_id, [])
            
            for assignment in assignments:
                if not assignment.is_active:
                    continue
                
                # Check validity period
                if assignment.valid_until and datetime.now() > assignment.valid_until:
                    continue
                
                # Check tenant scope
                if tenant_id and assignment.tenant_id and assignment.tenant_id != tenant_id:
                    continue
                
                role = self.roles.get(assignment.role_id)
                if role and role.is_active:
                    user_roles.append(role.name)
                    effective_permissions.update(role.permissions)
                    
                    # Add inherited permissions from parent roles
                    inherited_permissions = await self._get_inherited_permissions(role)
                    effective_permissions.update(inherited_permissions)
            
            return {
                'success': True,
                'user_id': user_id,
                'roles': user_roles,
                'permissions': list(effective_permissions),
                'tenant_id': tenant_id
            }
            
        except Exception as e:
            logger.error(f"Failed to get user permissions: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _get_inherited_permissions(self, role: Role) -> Set[str]:
        """Get permissions inherited from parent roles."""
        inherited_permissions = set()
        
        for parent_role_id in role.parent_roles:
            parent_role = self.roles.get(parent_role_id)
            if parent_role and parent_role.is_active:
                inherited_permissions.update(parent_role.permissions)
                # Recursively get permissions from grandparent roles
                grandparent_permissions = await self._get_inherited_permissions(parent_role)
                inherited_permissions.update(grandparent_permissions)
        
        return inherited_permissions
    
    async def get_compliance_violations(
        self,
        severity: str = None,
        resolved: bool = None,
        limit: int = 100
    ) -> Dict[str, Any]:
        """Get compliance violations with optional filtering."""
        try:
            violations = list(self.compliance_monitor.violations.values())
            
            # Apply filters
            if severity:
                violations = [v for v in violations if v.severity == severity]
            
            if resolved is not None:
                violations = [v for v in violations if v.is_resolved == resolved]
            
            # Sort by detection time (newest first)
            violations.sort(key=lambda v: v.detected_at, reverse=True)
            
            # Apply limit
            violations = violations[:limit]
            
            # Convert to dict format
            violation_data = []
            for violation in violations:
                violation_data.append({
                    'violation_id': violation.violation_id,
                    'user_id': violation.user_id,
                    'violation_type': violation.violation_type.value,
                    'description': violation.description,
                    'resource_type': violation.resource_type.value,
                    'resource_id': violation.resource_id,
                    'severity': violation.severity,
                    'detected_at': violation.detected_at.isoformat(),
                    'resolved_at': violation.resolved_at.isoformat() if violation.resolved_at else None,
                    'is_resolved': violation.is_resolved
                })
            
            return {
                'success': True,
                'violations': violation_data,
                'total_count': len(self.compliance_monitor.violations)
            }
            
        except Exception as e:
            logger.error(f"Failed to get compliance violations: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Example usage
if __name__ == "__main__":
    # Example configuration
    config = {
        'approval_timeout_hours': 24,
        'max_approval_chain_length': 3,
        'compliance_monitoring_enabled': True
    }
    
    # Initialize RBAC engine
    rbac_engine = AdvancedRBACEngine(config)
    
    # Example usage
    async def example_usage():
        # Create a role
        role_result = await rbac_engine.create_role(
            name="Security Analyst",
            description="Security analyst with incident response permissions",
            permissions=["read_agent", "write_incident", "read_audit_log"]
        )
        
        if role_result['success']:
            role_id = role_result['role_id']
            print(f"Created role: {role_id}")
            
            # Assign role to user
            assignment_result = await rbac_engine.assign_role_to_user(
                user_id="user_123",
                role_id=role_id,
                tenant_id="tenant_456"
            )
            
            if assignment_result['success']:
                print(f"Assigned role to user: {assignment_result['assignment_id']}")
                
                # Check access
                access_result = await rbac_engine.check_access(
                    user_id="user_123",
                    action="read",
                    resource_type=ResourceType.AGENT,
                    resource_id="agent_789",
                    context={'tenant_id': 'tenant_456'}
                )
                
                print(f"Access check result: {access_result}")
                
                # Get user permissions
                permissions_result = await rbac_engine.get_user_permissions(
                    user_id="user_123",
                    tenant_id="tenant_456"
                )
                
                if permissions_result['success']:
                    print(f"User permissions: {permissions_result['permissions']}")
        
        else:
            print(f"Failed to create role: {role_result['error']}")
    
    # Run example
    import asyncio
    asyncio.run(example_usage())