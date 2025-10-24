"""
Operational Sample Data Generator for ACSO Phase 5 Agentic Demonstrations.

This module generates realistic operational data including service metrics, performance data,
workflow automation history, user activity patterns, and compliance data.
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


class ServiceStatus(str, Enum):
    """Service status indicators."""
    HEALTHY = "healthy"
    WARNING = "warning"
    CRITICAL = "critical"
    DOWN = "down"
    MAINTENANCE = "maintenance"


class WorkflowStatus(str, Enum):
    """Workflow execution status."""
    PENDING = "pending"
    RUNNING = "running"
    COMPLETED = "completed"
    FAILED = "failed"
    CANCELLED = "cancelled"
    PAUSED = "paused"


class ComplianceStatus(str, Enum):
    """Compliance status indicators."""
    COMPLIANT = "compliant"
    NON_COMPLIANT = "non_compliant"
    PENDING_REVIEW = "pending_review"
    REMEDIATION_REQUIRED = "remediation_required"


@dataclass
class ServiceMetric:
    """Represents a service performance metric."""
    metric_id: str
    service_name: str
    metric_name: str
    value: float
    unit: str
    timestamp: datetime
    status: ServiceStatus
    threshold_warning: float
    threshold_critical: float
    tags: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "metric_id": self.metric_id,
            "service_name": self.service_name,
            "metric_name": self.metric_name,
            "value": self.value,
            "unit": self.unit,
            "timestamp": self.timestamp.isoformat(),
            "status": self.status.value,
            "threshold_warning": self.threshold_warning,
            "threshold_critical": self.threshold_critical,
            "tags": self.tags,
            "metadata": self.metadata
        }


@dataclass
class WorkflowExecution:
    """Represents a workflow execution record."""
    execution_id: str
    workflow_name: str
    workflow_version: str
    status: WorkflowStatus
    start_time: datetime
    end_time: Optional[datetime]
    duration_seconds: Optional[float]
    triggered_by: str
    trigger_type: str
    steps_completed: int
    steps_total: int
    success_rate: float
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "execution_id": self.execution_id,
            "workflow_name": self.workflow_name,
            "workflow_version": self.workflow_version,
            "status": self.status.value,
            "start_time": self.start_time.isoformat(),
            "end_time": self.end_time.isoformat() if self.end_time else None,
            "duration_seconds": self.duration_seconds,
            "triggered_by": self.triggered_by,
            "trigger_type": self.trigger_type,
            "steps_completed": self.steps_completed,
            "steps_total": self.steps_total,
            "success_rate": self.success_rate,
            "error_message": self.error_message,
            "metadata": self.metadata
        }


@dataclass
class UserActivity:
    """Represents user activity data."""
    activity_id: str
    user_id: str
    username: str
    activity_type: str
    resource: str
    action: str
    timestamp: datetime
    source_ip: str
    user_agent: str
    success: bool
    risk_score: float
    location: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "activity_id": self.activity_id,
            "user_id": self.user_id,
            "username": self.username,
            "activity_type": self.activity_type,
            "resource": self.resource,
            "action": self.action,
            "timestamp": self.timestamp.isoformat(),
            "source_ip": self.source_ip,
            "user_agent": self.user_agent,
            "success": self.success,
            "risk_score": self.risk_score,
            "location": self.location,
            "metadata": self.metadata
        }


@dataclass
class ComplianceCheck:
    """Represents a compliance check result."""
    check_id: str
    policy_name: str
    policy_version: str
    resource_type: str
    resource_id: str
    check_name: str
    status: ComplianceStatus
    severity: str
    description: str
    remediation: str
    last_checked: datetime
    next_check: datetime
    evidence: List[str] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "check_id": self.check_id,
            "policy_name": self.policy_name,
            "policy_version": self.policy_version,
            "resource_type": self.resource_type,
            "resource_id": self.resource_id,
            "check_name": self.check_name,
            "status": self.status.value,
            "severity": self.severity,
            "description": self.description,
            "remediation": self.remediation,
            "last_checked": self.last_checked.isoformat(),
            "next_check": self.next_check.isoformat(),
            "evidence": self.evidence,
            "metadata": self.metadata
        }


class OperationalDataGenerator:
    """Generates realistic operational sample data."""
    
    def __init__(self):
        self.config = {
            "service_metrics_count": 500,
            "workflow_executions_count": 200,
            "user_activities_count": 1000,
            "compliance_checks_count": 150,
            "time_range_days": 30
        }
        
        self.sample_data = {
            "services": [
                "Web Server", "Database", "API Gateway", "Load Balancer", "Cache Server",
                "Message Queue", "File Server", "DNS Server", "LDAP Server", "Monitoring System",
                "Backup Service", "Log Aggregator", "Security Scanner", "Firewall", "VPN Gateway"
            ],
            "metrics": [
                {"name": "CPU Usage", "unit": "%", "warning": 80, "critical": 95},
                {"name": "Memory Usage", "unit": "%", "warning": 85, "critical": 95},
                {"name": "Disk Usage", "unit": "%", "warning": 80, "critical": 90},
                {"name": "Response Time", "unit": "ms", "warning": 1000, "critical": 5000},
                {"name": "Throughput", "unit": "req/s", "warning": 100, "critical": 50},
                {"name": "Error Rate", "unit": "%", "warning": 5, "critical": 10},
                {"name": "Connection Count", "unit": "connections", "warning": 1000, "critical": 1500},
                {"name": "Queue Depth", "unit": "messages", "warning": 100, "critical": 500}
            ],
            "workflows": [
                "User Onboarding", "System Backup", "Security Scan", "Patch Deployment",
                "Certificate Renewal", "Log Rotation", "Data Archival", "Health Check",
                "Incident Response", "Compliance Audit", "Performance Optimization",
                "Capacity Planning", "Disaster Recovery", "Configuration Update"
            ],
            "activity_types": [
                "Authentication", "Authorization", "File Access", "System Configuration",
                "Data Export", "Report Generation", "User Management", "System Administration",
                "Security Event", "Audit Log", "API Call", "Database Query"
            ],
            "compliance_policies": [
                "SOX Compliance", "GDPR Data Protection", "HIPAA Security", "PCI DSS",
                "ISO 27001", "NIST Framework", "SOC 2", "FedRAMP", "FISMA", "CIS Controls"
            ],
            "locations": [
                "New York, NY", "San Francisco, CA", "London, UK", "Tokyo, Japan",
                "Sydney, Australia", "Toronto, Canada", "Berlin, Germany", "Singapore",
                "Mumbai, India", "São Paulo, Brazil"
            ],
            "user_agents": [
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
                "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36",
                "Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36",
                "Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)",
                "Mozilla/5.0 (Android 11; Mobile; rv:68.0) Gecko/68.0"
            ]
        }
        
    async def generate_service_metrics(self, count: Optional[int] = None) -> Dict[str, Any]:
        """Generate service performance metrics."""
        count = count or self.config["service_metrics_count"]
        
        metrics = {}
        
        for _ in range(count):
            metric = await self._generate_single_service_metric()
            metrics[metric.metric_id] = metric.to_dict()
            
        return {
            "service_metrics": metrics,
            "generated_at": datetime.utcnow().isoformat(),
            "count": len(metrics),
            "services_monitored": len(set(m["service_name"] for m in metrics.values())),
            "metrics_types": len(set(m["metric_name"] for m in metrics.values()))
        }
        
    async def _generate_single_service_metric(self) -> ServiceMetric:
        """Generate a single service metric."""
        service = random.choice(self.sample_data["services"])
        metric_info = random.choice(self.sample_data["metrics"])
        
        # Generate realistic values based on metric type
        if metric_info["name"] in ["CPU Usage", "Memory Usage", "Disk Usage", "Error Rate"]:
            value = random.uniform(0, 100)
        elif metric_info["name"] == "Response Time":
            value = random.uniform(50, 3000)
        elif metric_info["name"] == "Throughput":
            value = random.uniform(10, 500)
        elif metric_info["name"] == "Connection Count":
            value = random.randint(10, 2000)
        elif metric_info["name"] == "Queue Depth":
            value = random.randint(0, 1000)
        else:
            value = random.uniform(0, 100)
            
        # Determine status based on thresholds
        if value >= metric_info["critical"]:
            status = ServiceStatus.CRITICAL
        elif value >= metric_info["warning"]:
            status = ServiceStatus.WARNING
        else:
            status = ServiceStatus.HEALTHY
            
        # Occasionally set maintenance status
        if random.random() < 0.05:
            status = ServiceStatus.MAINTENANCE
            
        metric = ServiceMetric(
            metric_id=str(uuid.uuid4()),
            service_name=service,
            metric_name=metric_info["name"],
            value=round(value, 2),
            unit=metric_info["unit"],
            timestamp=datetime.utcnow() - timedelta(
                minutes=random.randint(0, 60 * 24 * self.config["time_range_days"])
            ),
            status=status,
            threshold_warning=metric_info["warning"],
            threshold_critical=metric_info["critical"],
            tags=[
                service.lower().replace(" ", "_"),
                metric_info["name"].lower().replace(" ", "_"),
                "production" if random.random() > 0.2 else "staging"
            ],
            metadata={
                "datacenter": random.choice(["DC1", "DC2", "DC3", "Cloud"]),
                "environment": random.choice(["production", "staging", "development"]),
                "collection_method": random.choice(["agent", "snmp", "api", "log_parsing"]),
                "retention_days": random.choice([30, 90, 365])
            }
        )
        
        return metric
        
    async def generate_workflow_executions(self, count: Optional[int] = None) -> Dict[str, Any]:
        """Generate workflow execution history."""
        count = count or self.config["workflow_executions_count"]
        
        executions = {}
        
        for _ in range(count):
            execution = await self._generate_single_workflow_execution()
            executions[execution.execution_id] = execution.to_dict()
            
        return {
            "workflow_executions": executions,
            "generated_at": datetime.utcnow().isoformat(),
            "count": len(executions),
            "unique_workflows": len(set(e["workflow_name"] for e in executions.values())),
            "success_rate": sum(1 for e in executions.values() if e["status"] == "completed") / len(executions) * 100
        }
        
    async def _generate_single_workflow_execution(self) -> WorkflowExecution:
        """Generate a single workflow execution."""
        workflow_name = random.choice(self.sample_data["workflows"])
        status = random.choice(list(WorkflowStatus))
        
        start_time = datetime.utcnow() - timedelta(
            hours=random.randint(0, 24 * self.config["time_range_days"])
        )
        
        # Generate execution details based on status
        if status in [WorkflowStatus.COMPLETED, WorkflowStatus.FAILED, WorkflowStatus.CANCELLED]:
            duration = random.randint(30, 3600)  # 30 seconds to 1 hour
            end_time = start_time + timedelta(seconds=duration)
        else:
            duration = None
            end_time = None
            
        steps_total = random.randint(3, 15)
        
        if status == WorkflowStatus.COMPLETED:
            steps_completed = steps_total
            success_rate = 1.0
            error_message = None
        elif status == WorkflowStatus.FAILED:
            steps_completed = random.randint(1, steps_total - 1)
            success_rate = steps_completed / steps_total
            error_message = random.choice([
                "Connection timeout",
                "Authentication failed",
                "Resource not found",
                "Permission denied",
                "Service unavailable",
                "Configuration error"
            ])
        elif status == WorkflowStatus.RUNNING:
            steps_completed = random.randint(1, steps_total - 1)
            success_rate = steps_completed / steps_total
            error_message = None
        else:
            steps_completed = random.randint(0, steps_total)
            success_rate = steps_completed / steps_total if steps_total > 0 else 0
            error_message = None
            
        execution = WorkflowExecution(
            execution_id=str(uuid.uuid4()),
            workflow_name=workflow_name,
            workflow_version=f"v{random.randint(1, 5)}.{random.randint(0, 9)}",
            status=status,
            start_time=start_time,
            end_time=end_time,
            duration_seconds=duration,
            triggered_by=random.choice([
                "scheduler", "user", "api", "webhook", "event", "manual"
            ]),
            trigger_type=random.choice([
                "scheduled", "manual", "event_driven", "api_call"
            ]),
            steps_completed=steps_completed,
            steps_total=steps_total,
            success_rate=round(success_rate, 2),
            error_message=error_message,
            metadata={
                "priority": random.choice(["low", "medium", "high", "critical"]),
                "retry_count": random.randint(0, 3),
                "resource_usage": {
                    "cpu_seconds": random.randint(1, 300),
                    "memory_mb": random.randint(50, 1000)
                },
                "tags": [workflow_name.lower().replace(" ", "_"), "automated"]
            }
        )
        
        return execution
        
    async def generate_user_activities(self, count: Optional[int] = None) -> Dict[str, Any]:
        """Generate user activity patterns."""
        count = count or self.config["user_activities_count"]
        
        activities = {}
        
        for _ in range(count):
            activity = await self._generate_single_user_activity()
            activities[activity.activity_id] = activity.to_dict()
            
        return {
            "user_activities": activities,
            "generated_at": datetime.utcnow().isoformat(),
            "count": len(activities),
            "unique_users": len(set(a["username"] for a in activities.values())),
            "success_rate": sum(1 for a in activities.values() if a["success"]) / len(activities) * 100,
            "high_risk_activities": sum(1 for a in activities.values() if a["risk_score"] > 7.0)
        }
        
    async def _generate_single_user_activity(self) -> UserActivity:
        """Generate a single user activity."""
        username = f"user{random.randint(1, 100)}"
        activity_type = random.choice(self.sample_data["activity_types"])
        
        # Generate realistic activity patterns
        success = random.random() > 0.05  # 95% success rate
        
        # Risk scoring based on activity type and patterns
        base_risk = {
            "Authentication": 2.0,
            "Authorization": 3.0,
            "File Access": 4.0,
            "System Configuration": 8.0,
            "Data Export": 7.0,
            "User Management": 9.0,
            "System Administration": 9.5
        }.get(activity_type, 3.0)
        
        # Adjust risk based on success and other factors
        risk_score = base_risk
        if not success:
            risk_score += 2.0
        if random.random() < 0.1:  # 10% chance of elevated risk
            risk_score += random.uniform(1.0, 3.0)
            
        risk_score = min(10.0, max(0.0, risk_score))
        
        activity = UserActivity(
            activity_id=str(uuid.uuid4()),
            user_id=str(uuid.uuid4()),
            username=username,
            activity_type=activity_type,
            resource=self._generate_resource_name(activity_type),
            action=self._generate_action_name(activity_type),
            timestamp=datetime.utcnow() - timedelta(
                hours=random.randint(0, 24 * self.config["time_range_days"])
            ),
            source_ip=f"{random.randint(10, 192)}.{random.randint(1, 255)}.{random.randint(1, 255)}.{random.randint(1, 255)}",
            user_agent=random.choice(self.sample_data["user_agents"]),
            success=success,
            risk_score=round(risk_score, 1),
            location=random.choice(self.sample_data["locations"]),
            metadata={
                "session_id": str(uuid.uuid4()),
                "device_type": random.choice(["desktop", "mobile", "tablet"]),
                "os": random.choice(["Windows", "macOS", "Linux", "iOS", "Android"]),
                "browser": random.choice(["Chrome", "Firefox", "Safari", "Edge"]),
                "mfa_used": random.choice([True, False])
            }
        )
        
        return activity
        
    def _generate_resource_name(self, activity_type: str) -> str:
        """Generate resource name based on activity type."""
        resource_map = {
            "Authentication": random.choice(["login_portal", "sso_provider", "ldap_server"]),
            "File Access": f"file_{random.randint(1, 1000)}.{random.choice(['pdf', 'docx', 'xlsx', 'txt'])}",
            "System Configuration": random.choice(["firewall_rules", "user_permissions", "network_settings"]),
            "Data Export": f"dataset_{random.randint(1, 100)}",
            "API Call": f"api/v{random.randint(1, 3)}/{random.choice(['users', 'data', 'reports'])}",
            "Database Query": f"table_{random.choice(['users', 'transactions', 'logs', 'config'])}"
        }
        
        return resource_map.get(activity_type, f"resource_{random.randint(1, 100)}")
        
    def _generate_action_name(self, activity_type: str) -> str:
        """Generate action name based on activity type."""
        action_map = {
            "Authentication": random.choice(["login", "logout", "password_reset"]),
            "File Access": random.choice(["read", "write", "delete", "download"]),
            "System Configuration": random.choice(["create", "update", "delete", "view"]),
            "Data Export": random.choice(["export", "download", "generate"]),
            "API Call": random.choice(["GET", "POST", "PUT", "DELETE"]),
            "Database Query": random.choice(["SELECT", "INSERT", "UPDATE", "DELETE"])
        }
        
        return action_map.get(activity_type, "access")
        
    async def generate_compliance_data(self, count: Optional[int] = None) -> Dict[str, Any]:
        """Generate compliance check results."""
        count = count or self.config["compliance_checks_count"]
        
        checks = {}
        
        for _ in range(count):
            check = await self._generate_single_compliance_check()
            checks[check.check_id] = check.to_dict()
            
        return {
            "compliance_checks": checks,
            "generated_at": datetime.utcnow().isoformat(),
            "count": len(checks),
            "compliance_rate": sum(1 for c in checks.values() if c["status"] == "compliant") / len(checks) * 100,
            "policies_covered": len(set(c["policy_name"] for c in checks.values())),
            "critical_findings": sum(1 for c in checks.values() if c["severity"] == "critical")
        }
        
    async def _generate_single_compliance_check(self) -> ComplianceCheck:
        """Generate a single compliance check."""
        policy = random.choice(self.sample_data["compliance_policies"])
        status = random.choice(list(ComplianceStatus))
        
        # Weight towards compliant status
        if random.random() < 0.7:
            status = ComplianceStatus.COMPLIANT
            
        severity = random.choice(["low", "medium", "high", "critical"])
        
        # Non-compliant items more likely to be higher severity
        if status == ComplianceStatus.NON_COMPLIANT:
            severity = random.choice(["medium", "high", "critical"])
            
        last_checked = datetime.utcnow() - timedelta(
            days=random.randint(0, 30)
        )
        
        next_check = last_checked + timedelta(
            days=random.choice([7, 14, 30, 90])
        )
        
        check = ComplianceCheck(
            check_id=str(uuid.uuid4()),
            policy_name=policy,
            policy_version=f"v{random.randint(1, 3)}.{random.randint(0, 9)}",
            resource_type=random.choice([
                "server", "database", "application", "network_device", 
                "user_account", "configuration", "process"
            ]),
            resource_id=f"resource_{random.randint(1000, 9999)}",
            check_name=self._generate_compliance_check_name(policy),
            status=status,
            severity=severity,
            description=self._generate_compliance_description(policy, status),
            remediation=self._generate_remediation_steps(policy, status),
            last_checked=last_checked,
            next_check=next_check,
            evidence=self._generate_compliance_evidence(status),
            metadata={
                "auditor": random.choice(["System", "Internal Audit", "External Auditor"]),
                "framework": random.choice(["NIST", "ISO", "CIS", "Custom"]),
                "automated": random.choice([True, False]),
                "business_impact": random.choice(["low", "medium", "high"]),
                "remediation_owner": random.choice([
                    "IT Operations", "Security Team", "Compliance Officer", "System Admin"
                ])
            }
        )
        
        return check
        
    def _generate_compliance_check_name(self, policy: str) -> str:
        """Generate compliance check name."""
        check_names = {
            "SOX Compliance": random.choice([
                "Financial Data Access Controls",
                "Change Management Process",
                "Audit Trail Completeness"
            ]),
            "GDPR Data Protection": random.choice([
                "Data Encryption at Rest",
                "Personal Data Access Logging",
                "Data Retention Policy"
            ]),
            "PCI DSS": random.choice([
                "Cardholder Data Encryption",
                "Network Segmentation",
                "Access Control Implementation"
            ]),
            "ISO 27001": random.choice([
                "Information Security Policy",
                "Risk Assessment Process",
                "Incident Response Procedure"
            ])
        }
        
        return check_names.get(policy, "General Compliance Check")
        
    def _generate_compliance_description(self, policy: str, status: ComplianceStatus) -> str:
        """Generate compliance check description."""
        if status == ComplianceStatus.COMPLIANT:
            return f"Resource meets all requirements for {policy} compliance."
        elif status == ComplianceStatus.NON_COMPLIANT:
            return f"Resource fails to meet {policy} requirements and requires immediate attention."
        else:
            return f"Resource compliance with {policy} is under review."
            
    def _generate_remediation_steps(self, policy: str, status: ComplianceStatus) -> str:
        """Generate remediation steps."""
        if status == ComplianceStatus.COMPLIANT:
            return "No action required. Continue monitoring."
        else:
            remediation_steps = {
                "SOX Compliance": "Review access controls and update audit procedures.",
                "GDPR Data Protection": "Implement data encryption and update privacy policies.",
                "PCI DSS": "Enhance network security and update cardholder data protection.",
                "ISO 27001": "Update security policies and conduct risk assessment."
            }
            
            return remediation_steps.get(policy, "Review and update compliance controls.")
            
    def _generate_compliance_evidence(self, status: ComplianceStatus) -> List[str]:
        """Generate compliance evidence."""
        if status == ComplianceStatus.COMPLIANT:
            return [
                "Configuration scan results",
                "Access control verification",
                "Audit log review"
            ]
        else:
            return [
                "Non-compliance findings report",
                "Gap analysis results",
                "Remediation plan required"
            ]
            
    async def generate_complete_dataset(self) -> Dict[str, Any]:
        """Generate a complete operational dataset."""
        logger.info("Generating complete operational dataset...")
        
        dataset = {
            "dataset_id": str(uuid.uuid4()),
            "generated_at": datetime.utcnow().isoformat(),
            "description": "Complete operational demonstration dataset",
            "configuration": self.config
        }
        
        # Generate all data types
        dataset["service_metrics"] = await self.generate_service_metrics()
        dataset["workflow_executions"] = await self.generate_workflow_executions()
        dataset["user_activities"] = await self.generate_user_activities()
        dataset["compliance_checks"] = await self.generate_compliance_data()
        
        logger.info(f"Generated complete operational dataset with ID: {dataset['dataset_id']}")
        
        return dataset


# Global operational data generator instance
operational_generator = OperationalDataGenerator()