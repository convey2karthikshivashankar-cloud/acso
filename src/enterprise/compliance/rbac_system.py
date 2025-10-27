"""
ACSO Enterprise Framework - Fine-Grained RBAC System

This module implements role-based access control with fine-grained permissions,
policy engine with approval workflows, and compliance violation detection.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Union
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import json
import uuid

logger = logging.getLogger(__name__)

class PermissionType(Enum):
    """Types of permissions."""
    READ = "read"
    WRITE = "write"
    DELETE = "delete"
    EXECUTE = "execute"
    ADMIN = "admin"
    APPROVE = "approve"
    AUDIT = "audit"

class ResourceType(Enum):
    """Types of resources that can be protected."""
    DASHBOARD = "dashboard"
    AGENT = "agent"
    WORKFLOW = "workflow"
    DATA = "data"
    CONFIGURATION = "configuration"
    USER = "user"
    TENANT = "tenant"
    REPORT = "report"
    API = "api"
    SYSTEM = "system"

class ApprovalStatus(Enum):
    """Approval workflow status."""
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"
    EXPIRED = "expired"

@dataclass
class Permission:
    """Individual permission definition."""
    permission_id: str
    name: str
    description: str
    resource_type: ResourceType
    permission_type: PermissionType
    conditions: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Role:
    """Role definition with permissions."""
    role_id: str
    name: str
    description: str
    permissions: List[str]  # Permission IDs
    parent_roles: List[str] = field(default_factory=list)  # Role inheritance
    conditions: Dict[str, Any] = field(default_factory=dict)
    is_system_role: bool = False
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

@dataclass
class User:
    """User with role assignments."""
    user_id: str
    username: str
    email: str
    roles: List[str]  # Role IDs
    direct_permissions: List[str] = field(default_factory=list)  # Direct permission grants
    tenant_id: str = ""
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)
    last_login: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ApprovalRequest:
    """Approval request for sensitive operations."""
    request_id: str
    requester_id: str
    operation: str
    resource_type: ResourceType
    resource_id: str
    justification: str
    approvers: List[str]  # Required approver user IDs
    status: ApprovalStatus = ApprovalStatus.PENDING
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: Optional[datetime] = None
    approved_by: List[str] = field(default_factory=list)
    rejected_by: List[str] = field(default_factory=list)
    approval_comments: Dict[str, str] = field(default_factory=dict)

@dataclass
class PolicyRule:
    """Policy rule for access control."""
    rule_id: str
    name: str
    description: str
    conditions: Dict[str, Any]
    effect: str  # ALLOW, DENY
    priority: int = 100
    is_active: bool = True
    compliance_frameworks: List[str] = field(default_factory=list)

class PolicyEngine:
    """Policy engine for evaluating access control rules."""
    
    def __init__(self):
        """Initialize policy engine."""
        self.policies: Dict[str, PolicyRule] = {}
        self.evaluation_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = 300  # 5 minutes
    
    def add_policy(self, policy: PolicyRule) -> None:
        """Add a policy rule."""
        self.policies[policy.rule_id] = policy
        self._clear_cache()
        logger.info(f"Added policy rule: {policy.name}")
    
    def remove_policy(self, rule_id: str) -> bool:
        """Remove a policy rule."""
        if rule_id in self.policies:
            del self.policies[rule_id]
            self._clear_cache()
            logger.info(f"Removed policy rule: {rule_id}")
            return True
        return False
    
    async def evaluate_access(self, 
                            user_id: str,
                            resource_type: ResourceType,
                            resource_id: str,
                            permission_type: PermissionType,
                            context: Dict[str, Any]) -> Dict[str, Any]:
        """Evaluate access based on policies."""
        try:
            # Check cache first
            cache_key = f"{user_id}:{resource_type.value}:{resource_id}:{permission_type.value}"
            
            if cache_key in self.evaluation_cache:
                cached_result = self.evaluation_cache[cache_key]
                if datetime.now() - datetime.fromisoformat(cached_result['cached_at']) < timedelta(seconds=self.cache_ttl):
                    return cached_result['result']
            
            # Evaluate policies
            applicable_policies = self._get_applicable_policies(resource_type, permission_type)
            
            # Sort by priority (lower number = higher priority)
            applicable_policies.sort(key=lambda p: p.priority)
            
            # Default to DENY
            decision = "DENY"
            applied_policies = []
            
            for policy in applicable_policies:
                if not policy.is_active:
                    continue
                
                if self._evaluate_policy_conditions(policy, context):
                    applied_policies.append(policy.rule_id)
                    
                    if policy.effect == "ALLOW":
                        decision = "ALLOW"
                    elif policy.effect == "DENY":
                        decision = "DENY"
                        break  # DENY takes precedence
            
            result = {
                'decision': decision,
                'applied_policies': applied_policies,
                'evaluation_time': datetime.now().isoformat(),
                'context': context
            }
            
            # Cache result
            self.evaluation_cache[cache_key] = {
                'result': result,
                'cached_at': datetime.now().isoformat()
            }
            
            return result
            
        except Exception as e:
            logger.error(f"Failed to evaluate access: {e}")
            return {'decision': 'DENY', 'error': str(e)}
    
    def _get_applicable_policies(self, resource_type: ResourceType, permission_type: PermissionType) -> List[PolicyRule]:
        """Get policies applicable to the resource and permission type."""
        applicable = []
        
        for policy in self.policies.values():
            conditions = policy.conditions
            
            # Check if policy applies to this resource type
            if 'resource_types' in conditions:
                if resource_type.value not in conditions['resource_types']:
                    continue
            
            # Check if policy applies to this permission type
            if 'permission_types' in conditions:
                if permission_type.value not in conditions['permission_types']:
                    continue
            
            applicable.append(policy)
        
        return applicable
    
    def _evaluate_policy_conditions(self, policy: PolicyRule, context: Dict[str, Any]) -> bool:
        """Evaluate if policy conditions are met."""
        conditions = policy.conditions
        
        # Time-based conditions
        if 'time_range' in conditions:
            current_hour = datetime.now().hour
            time_range = conditions['time_range']
            if not (time_range['start'] <= current_hour <= time_range['end']):
                return False
        
        # IP-based conditions
        if 'allowed_ips' in conditions:
            source_ip = context.get('source_ip', '')
            if source_ip not in conditions['allowed_ips']:
                return False
        
        # User-based conditions
        if 'users' in conditions:
            user_id = context.get('user_id', '')
            if user_id not in conditions['users']:
                return False
        
        # Role-based conditions
        if 'roles' in conditions:
            user_roles = context.get('user_roles', [])
            if not any(role in conditions['roles'] for role in user_roles):
                return False
        
        # Tenant-based conditions
        if 'tenants' in conditions:
            tenant_id = context.get('tenant_id', '')
            if tenant_id not in conditions['tenants']:
                return False
        
        return True
    
    def _clear_cache(self) -> None:
        """Clear evaluation cache."""
        self.evaluation_cache.clear()

class ApprovalWorkflow:
    """Manages approval workflows for sensitive operations."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize approval workflow."""
        self.config = config
        self.requests: Dict[str, ApprovalRequest] = {}
        self.approval_rules: Dict[str, Dict[str, Any]] = {}
        
    def add_approval_rule(self, operation: str, rule: Dict[str, Any]) -> None:
        """Add approval rule for an operation."""
        self.approval_rules[operation] = rule
        logger.info(f"Added approval rule for operation: {operation}")
    
    async def create_approval_request(self, 
                                    requester_id: str,
                                    operation: str,
                                    resource_type: ResourceType,
                                    resource_id: str,
                                    justification: str) -> str:
        """Create a new approval request."""
        try:
            # Get approval rule for operation
            rule = self.approval_rules.get(operation, {})
            required_approvers = rule.get('approvers', [])
            expiry_hours = rule.get('expiry_hours', 24)
            
            request = ApprovalRequest(
                request_id=str(uuid.uuid4()),
                requester_id=requester_id,
                operation=operation,
                resource_type=resource_type,
                resource_id=resource_id,
                justification=justification,
                approvers=required_approvers,
                expires_at=datetime.now() + timedelta(hours=expiry_hours)
            )
            
            self.requests[request.request_id] = request
            
            # Notify approvers (implementation would send notifications)
            await self._notify_approvers(request)
            
            logger.info(f"Created approval request: {request.request_id}")
            return request.request_id
            
        except Exception as e:
            logger.error(f"Failed to create approval request: {e}")
            raise
    
    async def approve_request(self, request_id: str, approver_id: str, comment: str = "") -> bool:
        """Approve a request."""
        try:
            request = self.requests.get(request_id)
            if not request:
                return False
            
            # Check if approver is authorized
            if approver_id not in request.approvers:
                logger.warning(f"Unauthorized approval attempt by {approver_id}")
                return False
            
            # Check if request has expired
            if request.expires_at and datetime.now() > request.expires_at:
                request.status = ApprovalStatus.EXPIRED
                return False
            
            # Add approval
            if approver_id not in request.approved_by:
                request.approved_by.append(approver_id)
                request.approval_comments[approver_id] = comment
            
            # Check if all required approvals are received
            if len(request.approved_by) >= len(request.approvers):
                request.status = ApprovalStatus.APPROVED
                await self._notify_approval_completion(request)
            
            logger.info(f"Request {request_id} approved by {approver_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to approve request: {e}")
            return False
    
    async def reject_request(self, request_id: str, approver_id: str, comment: str = "") -> bool:
        """Reject a request."""
        try:
            request = self.requests.get(request_id)
            if not request:
                return False
            
            # Check if approver is authorized
            if approver_id not in request.approvers:
                return False
            
            # Add rejection
            request.rejected_by.append(approver_id)
            request.approval_comments[approver_id] = comment
            request.status = ApprovalStatus.REJECTED
            
            await self._notify_approval_completion(request)
            
            logger.info(f"Request {request_id} rejected by {approver_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to reject request: {e}")
            return False
    
    async def _notify_approvers(self, request: ApprovalRequest) -> None:
        """Notify approvers of new request."""
        # Implementation would send actual notifications
        logger.info(f"Notified {len(request.approvers)} approvers for request {request.request_id}")
    
    async def _notify_approval_completion(self, request: ApprovalRequest) -> None:
        """Notify requester of approval completion."""
        logger.info(f"Approval completed for request {request.request_id}: {request.status.value}")

class RBACSystem:
    """
    Fine-grained Role-Based Access Control system.
    
    Provides comprehensive access control with role inheritance,
    policy-based permissions, and approval workflows.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize RBAC system."""
        self.config = config
        self.permissions: Dict[str, Permission] = {}
        self.roles: Dict[str, Role] = {}
        self.users: Dict[str, User] = {}
        self.policy_engine = PolicyEngine()
        self.approval_workflow = ApprovalWorkflow(config.get('approval', {}))
        
        # Caching
        self.permission_cache: Dict[str, Set[str]] = {}
        self.cache_ttl = 300  # 5 minutes
        
        # Metrics
        self.metrics = {
            'access_checks': 0,
            'access_granted': 0,
            'access_denied': 0,
            'approval_requests': 0,
            'policy_violations': 0
        }
        
        # Initialize default permissions and roles
        self._initialize_default_permissions()
        self._initialize_default_roles()
        
        logger.info("RBAC System initialized")
    
    def _initialize_default_permissions(self) -> None:
        """Initialize default system permissions."""
        default_permissions = [
            # Dashboard permissions
            Permission("dashboard_read", "Read Dashboard", "View dashboards", ResourceType.DASHBOARD, PermissionType.READ),
            Permission("dashboard_write", "Write Dashboard", "Create/edit dashboards", ResourceType.DASHBOARD, PermissionType.WRITE),
            Permission("dashboard_delete", "Delete Dashboard", "Delete dashboards", ResourceType.DASHBOARD, PermissionType.DELETE),
            
            # Agent permissions
            Permission("agent_read", "Read Agent", "View agent status", ResourceType.AGENT, PermissionType.READ),
            Permission("agent_execute", "Execute Agent", "Run agent tasks", ResourceType.AGENT, PermissionType.EXECUTE),
            Permission("agent_admin", "Admin Agent", "Configure agents", ResourceType.AGENT, PermissionType.ADMIN),
            
            # User management permissions
            Permission("user_read", "Read User", "View user information", ResourceType.USER, PermissionType.READ),
            Permission("user_write", "Write User", "Create/edit users", ResourceType.USER, PermissionType.WRITE),
            Permission("user_delete", "Delete User", "Delete users", ResourceType.USER, PermissionType.DELETE),
            
            # System permissions
            Permission("system_admin", "System Admin", "Full system administration", ResourceType.SYSTEM, PermissionType.ADMIN),
            Permission("system_audit", "System Audit", "Access audit logs", ResourceType.SYSTEM, PermissionType.AUDIT),
            
            # Data permissions
            Permission("data_read", "Read Data", "Access data", ResourceType.DATA, PermissionType.READ),
            Permission("data_write", "Write Data", "Modify data", ResourceType.DATA, PermissionType.WRITE),
            Permission("data_delete", "Delete Data", "Delete data", ResourceType.DATA, PermissionType.DELETE),
        ]
        
        for permission in default_permissions:
            self.permissions[permission.permission_id] = permission
    
    def _initialize_default_roles(self) -> None:
        """Initialize default system roles."""
        default_roles = [
            Role(
                role_id="super_admin",
                name="Super Administrator",
                description="Full system access",
                permissions=list(self.permissions.keys()),
                is_system_role=True
            ),
            Role(
                role_id="tenant_admin",
                name="Tenant Administrator",
                description="Full access within tenant",
                permissions=[
                    "dashboard_read", "dashboard_write", "dashboard_delete",
                    "agent_read", "agent_execute", "agent_admin",
                    "user_read", "user_write",
                    "data_read", "data_write"
                ]
            ),
            Role(
                role_id="operator",
                name="Operator",
                description="Operational access to agents and dashboards",
                permissions=[
                    "dashboard_read", "dashboard_write",
                    "agent_read", "agent_execute",
                    "data_read"
                ]
            ),
            Role(
                role_id="viewer",
                name="Viewer",
                description="Read-only access",
                permissions=[
                    "dashboard_read",
                    "agent_read",
                    "data_read"
                ]
            ),
            Role(
                role_id="auditor",
                name="Auditor",
                description="Audit and compliance access",
                permissions=[
                    "dashboard_read",
                    "system_audit",
                    "data_read"
                ]
            )
        ]
        
        for role in default_roles:
            self.roles[role.role_id] = role
    
    async def create_user(self, user: User) -> str:
        """Create a new user."""
        try:
            # Validate roles exist
            for role_id in user.roles:
                if role_id not in self.roles:
                    raise ValueError(f"Role {role_id} does not exist")
            
            self.users[user.user_id] = user
            self._clear_user_cache(user.user_id)
            
            logger.info(f"Created user: {user.username}")
            return user.user_id
            
        except Exception as e:
            logger.error(f"Failed to create user: {e}")
            raise
    
    async def assign_role(self, user_id: str, role_id: str) -> bool:
        """Assign a role to a user."""
        try:
            user = self.users.get(user_id)
            role = self.roles.get(role_id)
            
            if not user or not role:
                return False
            
            if role_id not in user.roles:
                user.roles.append(role_id)
                self._clear_user_cache(user_id)
                
                logger.info(f"Assigned role {role_id} to user {user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to assign role: {e}")
            return False
    
    async def revoke_role(self, user_id: str, role_id: str) -> bool:
        """Revoke a role from a user."""
        try:
            user = self.users.get(user_id)
            
            if not user:
                return False
            
            if role_id in user.roles:
                user.roles.remove(role_id)
                self._clear_user_cache(user_id)
                
                logger.info(f"Revoked role {role_id} from user {user_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to revoke role: {e}")
            return False
    
    async def check_permission(self, 
                             user_id: str,
                             resource_type: ResourceType,
                             resource_id: str,
                             permission_type: PermissionType,
                             context: Optional[Dict[str, Any]] = None) -> bool:
        """Check if user has permission for a specific action."""
        try:
            self.metrics['access_checks'] += 1
            
            context = context or {}
            context.update({
                'user_id': user_id,
                'resource_type': resource_type.value,
                'resource_id': resource_id,
                'permission_type': permission_type.value,
                'timestamp': datetime.now().isoformat()
            })
            
            # Get user
            user = self.users.get(user_id)
            if not user or not user.is_active:
                self.metrics['access_denied'] += 1
                return False
            
            # Add user context
            context['user_roles'] = user.roles
            context['tenant_id'] = user.tenant_id
            
            # Check direct permissions first
            user_permissions = await self._get_user_permissions(user_id)
            required_permission = f"{resource_type.value}_{permission_type.value}"
            
            if required_permission in user_permissions:
                # Evaluate policies
                policy_result = await self.policy_engine.evaluate_access(
                    user_id, resource_type, resource_id, permission_type, context
                )
                
                if policy_result['decision'] == 'ALLOW':
                    self.metrics['access_granted'] += 1
                    return True
                else:
                    self.metrics['access_denied'] += 1
                    self.metrics['policy_violations'] += 1
                    return False
            
            self.metrics['access_denied'] += 1
            return False
            
        except Exception as e:
            logger.error(f"Failed to check permission: {e}")
            self.metrics['access_denied'] += 1
            return False
    
    async def _get_user_permissions(self, user_id: str) -> Set[str]:
        """Get all permissions for a user (including inherited from roles)."""
        # Check cache first
        if user_id in self.permission_cache:
            return self.permission_cache[user_id]
        
        user = self.users.get(user_id)
        if not user:
            return set()
        
        permissions = set()
        
        # Add direct permissions
        permissions.update(user.direct_permissions)
        
        # Add permissions from roles (including inheritance)
        for role_id in user.roles:
            role_permissions = await self._get_role_permissions(role_id)
            permissions.update(role_permissions)
        
        # Cache permissions
        self.permission_cache[user_id] = permissions
        
        return permissions
    
    async def _get_role_permissions(self, role_id: str, visited: Optional[Set[str]] = None) -> Set[str]:
        """Get all permissions for a role (including inherited)."""
        if visited is None:
            visited = set()
        
        if role_id in visited:
            return set()  # Prevent circular inheritance
        
        visited.add(role_id)
        
        role = self.roles.get(role_id)
        if not role:
            return set()
        
        permissions = set(role.permissions)
        
        # Add permissions from parent roles
        for parent_role_id in role.parent_roles:
            parent_permissions = await self._get_role_permissions(parent_role_id, visited)
            permissions.update(parent_permissions)
        
        return permissions
    
    def _clear_user_cache(self, user_id: str) -> None:
        """Clear cached permissions for a user."""
        if user_id in self.permission_cache:
            del self.permission_cache[user_id]
    
    async def request_sensitive_operation(self, 
                                        user_id: str,
                                        operation: str,
                                        resource_type: ResourceType,
                                        resource_id: str,
                                        justification: str) -> str:
        """Request approval for sensitive operation."""
        try:
            request_id = await self.approval_workflow.create_approval_request(
                requester_id=user_id,
                operation=operation,
                resource_type=resource_type,
                resource_id=resource_id,
                justification=justification
            )
            
            self.metrics['approval_requests'] += 1
            return request_id
            
        except Exception as e:
            logger.error(f"Failed to request sensitive operation: {e}")
            raise
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get RBAC system metrics."""
        return {
            **self.metrics,
            'total_users': len(self.users),
            'total_roles': len(self.roles),
            'total_permissions': len(self.permissions),
            'active_users': len([u for u in self.users.values() if u.is_active]),
            'cached_permissions': len(self.permission_cache),
            'pending_approvals': len([r for r in self.approval_workflow.requests.values() if r.status == ApprovalStatus.PENDING])
        }