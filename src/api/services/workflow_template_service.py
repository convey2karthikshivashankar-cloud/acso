"""
Workflow template management service for ACSO API Gateway.
"""

import uuid
import json
from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any, Tuple
from collections import defaultdict

from ..models.workflow import (
    WorkflowTemplate, WorkflowDefinition, WorkflowCreateRequest,
    WorkflowNode, WorkflowEdge, WorkflowTrigger, WorkflowVariable
)


class TemplateCategory:
    """Template category management."""
    
    def __init__(self):
        self.categories = {
            "security": {
                "name": "Security & Compliance",
                "description": "Templates for security monitoring, incident response, and compliance",
                "icon": "shield",
                "color": "#dc3545"
            },
            "automation": {
                "name": "Process Automation",
                "description": "Templates for automating routine tasks and processes",
                "icon": "cog",
                "color": "#28a745"
            },
            "monitoring": {
                "name": "System Monitoring",
                "description": "Templates for monitoring systems, services, and infrastructure",
                "icon": "eye",
                "color": "#007bff"
            },
            "deployment": {
                "name": "Deployment & CI/CD",
                "description": "Templates for deployment pipelines and continuous integration",
                "icon": "rocket",
                "color": "#fd7e14"
            },
            "data": {
                "name": "Data Processing",
                "description": "Templates for data collection, processing, and analysis",
                "icon": "database",
                "color": "#6f42c1"
            },
            "notification": {
                "name": "Notifications & Alerts",
                "description": "Templates for sending notifications and managing alerts",
                "icon": "bell",
                "color": "#ffc107"
            },
            "integration": {
                "name": "System Integration",
                "description": "Templates for integrating with external systems and APIs",
                "icon": "link",
                "color": "#20c997"
            },
            "custom": {
                "name": "Custom Templates",
                "description": "User-created custom workflow templates",
                "icon": "puzzle-piece",
                "color": "#6c757d"
            }
        }
    
    def get_categories(self) -> Dict[str, Dict[str, Any]]:
        """Get all template categories."""
        return self.categories
    
    def get_category(self, category_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific category."""
        return self.categories.get(category_id)


class WorkflowTemplateService:
    """Service for managing workflow templates."""
    
    def __init__(self):
        self.templates: Dict[str, WorkflowTemplate] = {}
        self.template_ratings: Dict[str, List[Dict[str, Any]]] = defaultdict(list)  # template_id -> ratings
        self.template_usage_stats: Dict[str, Dict[str, Any]] = defaultdict(lambda: {
            "total_uses": 0,
            "successful_uses": 0,
            "failed_uses": 0,
            "average_rating": 0.0,
            "last_used": None,
            "users": set()
        })
        self.category_manager = TemplateCategory()
        
        # Initialize with some default templates
        self._initialize_default_templates()
    
    def _initialize_default_templates(self):
        """Initialize with default workflow templates."""
        # Security Incident Response Template
        security_template = self._create_security_incident_template()
        self.templates[security_template.id] = security_template
        
        # System Health Check Template
        monitoring_template = self._create_monitoring_template()
        self.templates[monitoring_template.id] = monitoring_template
        
        # Automated Deployment Template
        deployment_template = self._create_deployment_template()
        self.templates[deployment_template.id] = deployment_template
    
    def _create_security_incident_template(self) -> WorkflowTemplate:
        """Create a security incident response template."""
        template_id = str(uuid.uuid4())
        
        # Define nodes for security incident response
        nodes = [
            WorkflowNode(
                id="start_node",
                name="Incident Detected",
                type="start",
                description="Security incident detection trigger",
                position={"x": 100, "y": 100},
                config={
                    "parameters": {},
                    "timeout_seconds": 30,
                    "retry_attempts": 0,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="assess_severity",
                name="Assess Incident Severity",
                type="task",
                description="Analyze and categorize incident severity",
                position={"x": 300, "y": 100},
                config={
                    "agent_id": "threat_hunter_agent",
                    "action": "assess_threat_severity",
                    "parameters": {"auto_classify": True},
                    "timeout_seconds": 300,
                    "retry_attempts": 2,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="notify_team",
                name="Notify Security Team",
                type="notification",
                description="Send alert to security team",
                position={"x": 500, "y": 100},
                config={
                    "parameters": {
                        "channels": ["email", "slack"],
                        "urgency": "high"
                    },
                    "timeout_seconds": 60,
                    "retry_attempts": 3,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="containment_approval",
                name="Approve Containment Actions",
                type="approval",
                description="Get approval for containment measures",
                position={"x": 700, "y": 100},
                config={
                    "parameters": {"timeout_hours": 1},
                    "timeout_seconds": 3600,
                    "retry_attempts": 0,
                    "conditions": {},
                    "approval_required": True,
                    "approvers": ["security_manager", "incident_commander"]
                }
            ),
            WorkflowNode(
                id="execute_containment",
                name="Execute Containment",
                type="task",
                description="Execute approved containment actions",
                position={"x": 900, "y": 100},
                config={
                    "agent_id": "incident_response_agent",
                    "action": "execute_containment",
                    "parameters": {"auto_isolate": True},
                    "timeout_seconds": 600,
                    "retry_attempts": 1,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="end_node",
                name="Incident Contained",
                type="end",
                description="Incident response completed",
                position={"x": 1100, "y": 100},
                config={
                    "parameters": {},
                    "timeout_seconds": 30,
                    "retry_attempts": 0,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            )
        ]
        
        # Define edges
        edges = [
            {"id": "edge1", "source_node_id": "start_node", "target_node_id": "assess_severity", "condition": None, "label": None},
            {"id": "edge2", "source_node_id": "assess_severity", "target_node_id": "notify_team", "condition": None, "label": None},
            {"id": "edge3", "source_node_id": "notify_team", "target_node_id": "containment_approval", "condition": "severity >= high", "label": "High Severity"},
            {"id": "edge4", "source_node_id": "containment_approval", "target_node_id": "execute_containment", "condition": "approved == true", "label": "Approved"},
            {"id": "edge5", "source_node_id": "execute_containment", "target_node_id": "end_node", "condition": None, "label": None}
        ]
        
        # Define variables
        variables = [
            {"name": "incident_id", "type": "string", "default_value": "", "description": "Unique incident identifier", "required": True},
            {"name": "incident_type", "type": "string", "default_value": "unknown", "description": "Type of security incident", "required": False},
            {"name": "severity_level", "type": "string", "default_value": "medium", "description": "Incident severity level", "required": False},
            {"name": "affected_systems", "type": "array", "default_value": [], "description": "List of affected systems", "required": False}
        ]
        
        # Create workflow definition
        workflow_def = WorkflowDefinition(
            id=str(uuid.uuid4()),
            name="Security Incident Response",
            description="Automated security incident response workflow with approval gates",
            version="1.0.0",
            nodes=nodes,
            edges=edges,
            triggers=[],
            variables=variables,
            tags=["security", "incident-response", "automation"],
            created_at=datetime.utcnow(),
            created_by="system",
            status="active"
        )
        
        return WorkflowTemplate(
            id=template_id,
            name="Security Incident Response",
            description="Comprehensive template for handling security incidents with automated assessment, team notification, and controlled containment actions.",
            category="security",
            workflow_definition=workflow_def,
            created_at=datetime.utcnow(),
            created_by="system",
            is_public=True,
            usage_count=0,
            tags=["security", "incident-response", "containment", "approval"]
        )
    
    def _create_monitoring_template(self) -> WorkflowTemplate:
        """Create a system monitoring template."""
        template_id = str(uuid.uuid4())
        
        nodes = [
            WorkflowNode(
                id="start_monitor",
                name="Start Health Check",
                type="start",
                description="Initiate system health monitoring",
                position={"x": 100, "y": 100},
                config={
                    "parameters": {},
                    "timeout_seconds": 30,
                    "retry_attempts": 0,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="check_services",
                name="Check Service Status",
                type="task",
                description="Monitor critical service health",
                position={"x": 300, "y": 100},
                config={
                    "agent_id": "service_orchestration_agent",
                    "action": "check_service_health",
                    "parameters": {"services": ["api", "database", "cache"]},
                    "timeout_seconds": 180,
                    "retry_attempts": 2,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="check_resources",
                name="Check Resource Usage",
                type="task",
                description="Monitor system resource utilization",
                position={"x": 300, "y": 250},
                config={
                    "agent_id": "service_orchestration_agent",
                    "action": "check_resource_usage",
                    "parameters": {"thresholds": {"cpu": 80, "memory": 85, "disk": 90}},
                    "timeout_seconds": 120,
                    "retry_attempts": 2,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="generate_report",
                name="Generate Health Report",
                type="task",
                description="Compile monitoring results into report",
                position={"x": 500, "y": 175},
                config={
                    "parameters": {"format": "json", "include_metrics": True},
                    "timeout_seconds": 60,
                    "retry_attempts": 1,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="end_monitor",
                name="Monitoring Complete",
                type="end",
                description="Health check completed",
                position={"x": 700, "y": 175},
                config={
                    "parameters": {},
                    "timeout_seconds": 30,
                    "retry_attempts": 0,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            )
        ]
        
        edges = [
            {"id": "edge1", "source_node_id": "start_monitor", "target_node_id": "check_services", "condition": None, "label": None},
            {"id": "edge2", "source_node_id": "start_monitor", "target_node_id": "check_resources", "condition": None, "label": None},
            {"id": "edge3", "source_node_id": "check_services", "target_node_id": "generate_report", "condition": None, "label": None},
            {"id": "edge4", "source_node_id": "check_resources", "target_node_id": "generate_report", "condition": None, "label": None},
            {"id": "edge5", "source_node_id": "generate_report", "target_node_id": "end_monitor", "condition": None, "label": None}
        ]
        
        variables = [
            {"name": "check_interval", "type": "integer", "default_value": 300, "description": "Check interval in seconds", "required": False},
            {"name": "alert_threshold", "type": "integer", "default_value": 80, "description": "Alert threshold percentage", "required": False}
        ]
        
        workflow_def = WorkflowDefinition(
            id=str(uuid.uuid4()),
            name="System Health Check",
            description="Automated system health monitoring with parallel checks",
            version="1.0.0",
            nodes=nodes,
            edges=edges,
            triggers=[],
            variables=variables,
            tags=["monitoring", "health-check", "parallel"],
            created_at=datetime.utcnow(),
            created_by="system",
            status="active"
        )
        
        return WorkflowTemplate(
            id=template_id,
            name="System Health Check",
            description="Automated system health monitoring template that checks services and resources in parallel.",
            category="monitoring",
            workflow_definition=workflow_def,
            created_at=datetime.utcnow(),
            created_by="system",
            is_public=True,
            usage_count=0,
            tags=["monitoring", "health-check", "parallel", "automation"]
        )
    
    def _create_deployment_template(self) -> WorkflowTemplate:
        """Create a deployment pipeline template."""
        template_id = str(uuid.uuid4())
        
        nodes = [
            WorkflowNode(
                id="start_deploy",
                name="Start Deployment",
                type="start",
                description="Initiate deployment process",
                position={"x": 100, "y": 100},
                config={
                    "parameters": {},
                    "timeout_seconds": 30,
                    "retry_attempts": 0,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="run_tests",
                name="Run Tests",
                type="task",
                description="Execute test suite",
                position={"x": 300, "y": 100},
                config={
                    "parameters": {"test_types": ["unit", "integration"]},
                    "timeout_seconds": 600,
                    "retry_attempts": 1,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="build_artifact",
                name="Build Artifact",
                type="task",
                description="Build deployment artifact",
                position={"x": 500, "y": 100},
                config={
                    "parameters": {"build_type": "production"},
                    "timeout_seconds": 900,
                    "retry_attempts": 2,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="deploy_staging",
                name="Deploy to Staging",
                type="task",
                description="Deploy to staging environment",
                position={"x": 700, "y": 100},
                config={
                    "parameters": {"environment": "staging"},
                    "timeout_seconds": 300,
                    "retry_attempts": 1,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="production_approval",
                name="Approve Production Deploy",
                type="approval",
                description="Get approval for production deployment",
                position={"x": 900, "y": 100},
                config={
                    "parameters": {"timeout_hours": 24},
                    "timeout_seconds": 86400,
                    "retry_attempts": 0,
                    "conditions": {},
                    "approval_required": True,
                    "approvers": ["tech_lead", "product_manager"]
                }
            ),
            WorkflowNode(
                id="deploy_production",
                name="Deploy to Production",
                type="task",
                description="Deploy to production environment",
                position={"x": 1100, "y": 100},
                config={
                    "parameters": {"environment": "production", "strategy": "blue-green"},
                    "timeout_seconds": 600,
                    "retry_attempts": 1,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            ),
            WorkflowNode(
                id="end_deploy",
                name="Deployment Complete",
                type="end",
                description="Deployment process completed",
                position={"x": 1300, "y": 100},
                config={
                    "parameters": {},
                    "timeout_seconds": 30,
                    "retry_attempts": 0,
                    "conditions": {},
                    "approval_required": False,
                    "approvers": []
                }
            )
        ]
        
        edges = [
            {"id": "edge1", "source_node_id": "start_deploy", "target_node_id": "run_tests", "condition": None, "label": None},
            {"id": "edge2", "source_node_id": "run_tests", "target_node_id": "build_artifact", "condition": "tests_passed == true", "label": "Tests Passed"},
            {"id": "edge3", "source_node_id": "build_artifact", "target_node_id": "deploy_staging", "condition": None, "label": None},
            {"id": "edge4", "source_node_id": "deploy_staging", "target_node_id": "production_approval", "condition": None, "label": None},
            {"id": "edge5", "source_node_id": "production_approval", "target_node_id": "deploy_production", "condition": "approved == true", "label": "Approved"},
            {"id": "edge6", "source_node_id": "deploy_production", "target_node_id": "end_deploy", "condition": None, "label": None}
        ]
        
        variables = [
            {"name": "branch", "type": "string", "default_value": "main", "description": "Git branch to deploy", "required": True},
            {"name": "version", "type": "string", "default_value": "", "description": "Version tag", "required": False},
            {"name": "rollback_enabled", "type": "boolean", "default_value": True, "description": "Enable automatic rollback", "required": False}
        ]
        
        workflow_def = WorkflowDefinition(
            id=str(uuid.uuid4()),
            name="Automated Deployment Pipeline",
            description="Complete CI/CD pipeline with testing, staging, and production deployment",
            version="1.0.0",
            nodes=nodes,
            edges=edges,
            triggers=[],
            variables=variables,
            tags=["deployment", "ci-cd", "automation"],
            created_at=datetime.utcnow(),
            created_by="system",
            status="active"
        )
        
        return WorkflowTemplate(
            id=template_id,
            name="Automated Deployment Pipeline",
            description="Complete CI/CD pipeline template with automated testing, staging deployment, and approval-gated production deployment.",
            category="deployment",
            workflow_definition=workflow_def,
            created_at=datetime.utcnow(),
            created_by="system",
            is_public=True,
            usage_count=0,
            tags=["deployment", "ci-cd", "automation", "approval"]
        )    
    
async def get_templates(
        self,
        category: Optional[str] = None,
        tags: Optional[List[str]] = None,
        is_public: Optional[bool] = None,
        search_query: Optional[str] = None,
        sort_by: str = "usage_count",
        sort_order: str = "desc",
        limit: int = 50,
        offset: int = 0,
        user_id: str = None
    ) -> Tuple[List[WorkflowTemplate], int]:
        """Get workflow templates with filtering and sorting."""
        filtered_templates = []
        
        for template in self.templates.values():
            # Apply filters
            if category and template.category != category:
                continue
            if tags and not any(tag in template.tags for tag in tags):
                continue
            if is_public is not None and template.is_public != is_public:
                continue
            if not template.is_public and template.created_by != user_id:
                continue
            if search_query:
                search_lower = search_query.lower()
                if (search_lower not in template.name.lower() and
                    search_lower not in (template.description or "").lower() and
                    not any(search_lower in tag.lower() for tag in template.tags)):
                    continue
            
            filtered_templates.append(template)
        
        # Sort templates
        reverse_order = sort_order == "desc"
        
        if sort_by == "usage_count":
            filtered_templates.sort(key=lambda t: t.usage_count, reverse=reverse_order)
        elif sort_by == "created_at":
            filtered_templates.sort(key=lambda t: t.created_at, reverse=reverse_order)
        elif sort_by == "name":
            filtered_templates.sort(key=lambda t: t.name.lower(), reverse=reverse_order)
        elif sort_by == "rating":
            # Sort by average rating
            def get_rating(template):
                stats = self.template_usage_stats[template.id]
                return stats.get("average_rating", 0.0)
            filtered_templates.sort(key=get_rating, reverse=reverse_order)
        
        # Apply pagination
        total = len(filtered_templates)
        paginated_templates = filtered_templates[offset:offset + limit]
        
        return paginated_templates, total
    
    async def get_template(self, template_id: str, user_id: str = None) -> Optional[WorkflowTemplate]:
        """Get a specific template by ID."""
        template = self.templates.get(template_id)
        if not template:
            return None
        
        # Check access permissions
        if not template.is_public and template.created_by != user_id:
            return None
        
        return template
    
    async def create_template(
        self,
        name: str,
        description: Optional[str],
        category: str,
        workflow_definition: WorkflowDefinition,
        is_public: bool,
        user_id: str,
        tags: Optional[List[str]] = None
    ) -> WorkflowTemplate:
        """Create a new workflow template."""
        template_id = str(uuid.uuid4())
        
        template = WorkflowTemplate(
            id=template_id,
            name=name,
            description=description,
            category=category,
            workflow_definition=workflow_definition,
            created_at=datetime.utcnow(),
            created_by=user_id,
            is_public=is_public,
            usage_count=0,
            tags=tags or []
        )
        
        self.templates[template_id] = template
        return template
    
    async def update_template(
        self,
        template_id: str,
        name: Optional[str] = None,
        description: Optional[str] = None,
        category: Optional[str] = None,
        is_public: Optional[bool] = None,
        tags: Optional[List[str]] = None,
        user_id: str = None
    ) -> Optional[WorkflowTemplate]:
        """Update an existing template."""
        template = self.templates.get(template_id)
        if not template:
            return None
        
        # Check permissions
        if template.created_by != user_id:
            return None
        
        # Update fields
        if name is not None:
            template.name = name
        if description is not None:
            template.description = description
        if category is not None:
            template.category = category
        if is_public is not None:
            template.is_public = is_public
        if tags is not None:
            template.tags = tags
        
        return template
    
    async def delete_template(self, template_id: str, user_id: str) -> bool:
        """Delete a template."""
        template = self.templates.get(template_id)
        if not template:
            return False
        
        # Check permissions
        if template.created_by != user_id:
            return False
        
        del self.templates[template_id]
        
        # Clean up related data
        if template_id in self.template_ratings:
            del self.template_ratings[template_id]
        if template_id in self.template_usage_stats:
            del self.template_usage_stats[template_id]
        
        return True
    
    async def use_template(
        self,
        template_id: str,
        workflow_name: str,
        user_id: str,
        success: bool = True
    ) -> Optional[WorkflowDefinition]:
        """Record template usage and create workflow from template."""
        template = await self.get_template(template_id, user_id)
        if not template:
            return None
        
        # Update usage statistics
        template.usage_count += 1
        stats = self.template_usage_stats[template_id]
        stats["total_uses"] += 1
        stats["last_used"] = datetime.utcnow()
        stats["users"].add(user_id)
        
        if success:
            stats["successful_uses"] += 1
        else:
            stats["failed_uses"] += 1
        
        # Create new workflow from template
        workflow_id = str(uuid.uuid4())
        workflow = WorkflowDefinition(
            id=workflow_id,
            name=workflow_name,
            description=f"Created from template: {template.name}",
            version="1.0.0",
            nodes=template.workflow_definition.nodes.copy(),
            edges=template.workflow_definition.edges.copy(),
            triggers=template.workflow_definition.triggers.copy(),
            variables=template.workflow_definition.variables.copy(),
            tags=template.workflow_definition.tags.copy(),
            created_at=datetime.utcnow(),
            created_by=user_id,
            status="draft"
        )
        
        return workflow
    
    async def rate_template(
        self,
        template_id: str,
        rating: int,
        comment: Optional[str],
        user_id: str
    ) -> bool:
        """Rate a template."""
        if rating < 1 or rating > 5:
            return False
        
        template = await self.get_template(template_id, user_id)
        if not template:
            return False
        
        # Check if user already rated this template
        existing_rating = None
        for r in self.template_ratings[template_id]:
            if r["user_id"] == user_id:
                existing_rating = r
                break
        
        if existing_rating:
            # Update existing rating
            existing_rating["rating"] = rating
            existing_rating["comment"] = comment
            existing_rating["updated_at"] = datetime.utcnow()
        else:
            # Add new rating
            self.template_ratings[template_id].append({
                "user_id": user_id,
                "rating": rating,
                "comment": comment,
                "created_at": datetime.utcnow(),
                "updated_at": datetime.utcnow()
            })
        
        # Update average rating
        ratings = [r["rating"] for r in self.template_ratings[template_id]]
        self.template_usage_stats[template_id]["average_rating"] = sum(ratings) / len(ratings)
        
        return True
    
    async def get_template_ratings(
        self,
        template_id: str,
        user_id: str = None
    ) -> List[Dict[str, Any]]:
        """Get ratings for a template."""
        template = await self.get_template(template_id, user_id)
        if not template:
            return []
        
        ratings = self.template_ratings.get(template_id, [])
        
        # Remove user_id from public ratings for privacy
        public_ratings = []
        for rating in ratings:
            public_rating = {
                "rating": rating["rating"],
                "comment": rating["comment"],
                "created_at": rating["created_at"].isoformat(),
                "updated_at": rating["updated_at"].isoformat()
            }
            # Only include user_id if it's the requesting user
            if user_id and rating["user_id"] == user_id:
                public_rating["user_id"] = rating["user_id"]
                public_rating["is_own_rating"] = True
            
            public_ratings.append(public_rating)
        
        return public_ratings
    
    async def get_template_statistics(self, template_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Get detailed statistics for a template."""
        template = await self.get_template(template_id, user_id)
        if not template:
            return None
        
        stats = self.template_usage_stats[template_id]
        ratings = self.template_ratings.get(template_id, [])
        
        # Calculate rating distribution
        rating_distribution = {1: 0, 2: 0, 3: 0, 4: 0, 5: 0}
        for rating in ratings:
            rating_distribution[rating["rating"]] += 1
        
        return {
            "template_id": template_id,
            "total_uses": stats["total_uses"],
            "successful_uses": stats["successful_uses"],
            "failed_uses": stats["failed_uses"],
            "success_rate": stats["successful_uses"] / stats["total_uses"] if stats["total_uses"] > 0 else 0.0,
            "unique_users": len(stats["users"]),
            "last_used": stats["last_used"].isoformat() if stats["last_used"] else None,
            "average_rating": stats["average_rating"],
            "total_ratings": len(ratings),
            "rating_distribution": rating_distribution,
            "created_at": template.created_at.isoformat(),
            "is_public": template.is_public,
            "category": template.category,
            "tags": template.tags
        }
    
    async def get_popular_templates(
        self,
        limit: int = 10,
        time_period_days: int = 30,
        user_id: str = None
    ) -> List[Dict[str, Any]]:
        """Get most popular templates in a time period."""
        cutoff_date = datetime.utcnow() - timedelta(days=time_period_days)
        
        template_popularity = []
        
        for template_id, template in self.templates.items():
            if not template.is_public and template.created_by != user_id:
                continue
            
            stats = self.template_usage_stats[template_id]
            
            # Calculate recent usage (simplified - in real implementation, track usage by date)
            recent_usage = stats["total_uses"]  # Simplified
            
            template_popularity.append({
                "template_id": template_id,
                "name": template.name,
                "description": template.description,
                "category": template.category,
                "usage_count": recent_usage,
                "average_rating": stats["average_rating"],
                "total_ratings": len(self.template_ratings.get(template_id, [])),
                "tags": template.tags
            })
        
        # Sort by usage count and rating
        template_popularity.sort(
            key=lambda x: (x["usage_count"], x["average_rating"]),
            reverse=True
        )
        
        return template_popularity[:limit]
    
    async def get_recommended_templates(
        self,
        user_id: str,
        limit: int = 5
    ) -> List[Dict[str, Any]]:
        """Get recommended templates for a user based on their usage patterns."""
        # Simplified recommendation algorithm
        # In a real implementation, this would use more sophisticated ML algorithms
        
        user_categories = set()
        user_tags = set()
        
        # Analyze user's template usage patterns
        for template_id, stats in self.template_usage_stats.items():
            if user_id in stats["users"]:
                template = self.templates.get(template_id)
                if template:
                    user_categories.add(template.category)
                    user_tags.update(template.tags)
        
        # Find templates in similar categories or with similar tags
        recommendations = []
        
        for template_id, template in self.templates.items():
            if not template.is_public and template.created_by != user_id:
                continue
            
            # Skip templates the user has already used
            if user_id in self.template_usage_stats[template_id]["users"]:
                continue
            
            score = 0.0
            
            # Category match
            if template.category in user_categories:
                score += 2.0
            
            # Tag matches
            tag_matches = len(set(template.tags) & user_tags)
            score += tag_matches * 0.5
            
            # Popularity boost
            stats = self.template_usage_stats[template_id]
            score += stats["average_rating"] * 0.3
            score += min(stats["total_uses"] / 10, 1.0) * 0.2
            
            if score > 0:
                recommendations.append({
                    "template_id": template_id,
                    "name": template.name,
                    "description": template.description,
                    "category": template.category,
                    "score": score,
                    "average_rating": stats["average_rating"],
                    "usage_count": stats["total_uses"],
                    "tags": template.tags
                })
        
        # Sort by score and return top recommendations
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        return recommendations[:limit]
    
    async def export_template(self, template_id: str, user_id: str = None) -> Optional[Dict[str, Any]]:
        """Export a template to a portable format."""
        template = await self.get_template(template_id, user_id)
        if not template:
            return None
        
        return {
            "template_metadata": {
                "id": template.id,
                "name": template.name,
                "description": template.description,
                "category": template.category,
                "tags": template.tags,
                "created_at": template.created_at.isoformat(),
                "created_by": template.created_by,
                "is_public": template.is_public,
                "export_version": "1.0"
            },
            "workflow_definition": template.workflow_definition.dict(),
            "statistics": await self.get_template_statistics(template_id, user_id)
        }
    
    async def import_template(
        self,
        template_data: Dict[str, Any],
        user_id: str,
        override_name: Optional[str] = None
    ) -> WorkflowTemplate:
        """Import a template from exported data."""
        metadata = template_data["template_metadata"]
        workflow_def_data = template_data["workflow_definition"]
        
        # Create new template ID to avoid conflicts
        new_template_id = str(uuid.uuid4())
        
        # Reconstruct workflow definition
        workflow_def = WorkflowDefinition(**workflow_def_data)
        workflow_def.id = str(uuid.uuid4())  # New workflow ID
        workflow_def.created_by = user_id
        workflow_def.created_at = datetime.utcnow()
        
        # Create template
        template = WorkflowTemplate(
            id=new_template_id,
            name=override_name or f"{metadata['name']} (Imported)",
            description=metadata.get("description"),
            category=metadata.get("category", "custom"),
            workflow_definition=workflow_def,
            created_at=datetime.utcnow(),
            created_by=user_id,
            is_public=False,  # Imported templates are private by default
            usage_count=0,
            tags=metadata.get("tags", [])
        )
        
        self.templates[new_template_id] = template
        return template
    
    def get_categories(self) -> Dict[str, Dict[str, Any]]:
        """Get all template categories."""
        return self.category_manager.get_categories()
    
    def get_category(self, category_id: str) -> Optional[Dict[str, Any]]:
        """Get a specific category."""
        return self.category_manager.get_category(category_id)
    
    async def get_category_statistics(self) -> Dict[str, Dict[str, Any]]:
        """Get statistics for each category."""
        categories = self.get_categories()
        category_stats = {}
        
        for category_id, category_info in categories.items():
            templates_in_category = [
                t for t in self.templates.values()
                if t.category == category_id and t.is_public
            ]
            
            total_usage = sum(
                self.template_usage_stats[t.id]["total_uses"]
                for t in templates_in_category
            )
            
            avg_rating = 0.0
            if templates_in_category:
                ratings = [
                    self.template_usage_stats[t.id]["average_rating"]
                    for t in templates_in_category
                    if self.template_usage_stats[t.id]["average_rating"] > 0
                ]
                if ratings:
                    avg_rating = sum(ratings) / len(ratings)
            
            category_stats[category_id] = {
                "name": category_info["name"],
                "description": category_info["description"],
                "icon": category_info["icon"],
                "color": category_info["color"],
                "template_count": len(templates_in_category),
                "total_usage": total_usage,
                "average_rating": avg_rating
            }
        
        return category_stats


# Global template service instance
template_service = WorkflowTemplateService()