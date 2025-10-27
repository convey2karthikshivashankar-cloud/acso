"""
Data models for ACSO Enterprise Agent Runtime.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import uuid


class AgentType(str, Enum):
    """Types of ACSO agents."""
    SUPERVISOR = "supervisor"
    THREAT_HUNTER = "threat_hunter"
    INCIDENT_RESPONSE = "incident_response"
    SERVICE_ORCHESTRATION = "service_orchestration"
    FINANCIAL_INTELLIGENCE = "financial_intelligence"


class DeploymentStatus(str, Enum):
    """Deployment status values."""
    PENDING = "pending"
    DEPLOYING = "deploying"
    DEPLOYED = "deployed"
    FAILED = "failed"
    SCALING = "scaling"
    TERMINATING = "terminating"


class ScalingMetric(str, Enum):
    """Metrics used for scaling decisions."""
    CPU_UTILIZATION = "cpu_utilization"
    MEMORY_UTILIZATION = "memory_utilization"
    REQUEST_RATE = "request_rate"
    RESPONSE_TIME = "response_time"
    QUEUE_LENGTH = "queue_length"
    CUSTOM = "custom"


@dataclass
class ResourceRequirements:
    """Resource requirements for an agent."""
    cpu_request: str = "100m"
    cpu_limit: str = "500m"
    memory_request: str = "128Mi"
    memory_limit: str = "512Mi"
    storage_request: str = "1Gi"
    storage_limit: str = "10Gi"
    gpu_request: int = 0


@dataclass
class AgentSpec:
    """Specification for deploying an agent."""
    agent_id: str = field(default_factory=lambda: str(uuid.uuid4()))
    agent_type: AgentType = AgentType.SUPERVISOR
    tenant_id: str = "default"
    initial_replicas: int = 1
    min_replicas: int = 1
    max_replicas: int = 10
    resources: ResourceRequirements = field(default_factory=ResourceRequirements)
    environment_variables: Dict[str, str] = field(default_factory=dict)
    secrets: List[str] = field(default_factory=list)
    config_maps: List[str] = field(default_factory=list)
    node_selector: Dict[str, str] = field(default_factory=dict)
    tolerations: List[Dict[str, Any]] = field(default_factory=list)
    spread_across_nodes: bool = True
    preferred_node_types: List[str] = field(default_factory=list)
    auto_scaling_enabled: bool = True
    scaling_metrics: List[ScalingMetric] = field(default_factory=lambda: [ScalingMetric.CPU_UTILIZATION])
    capabilities: List[str] = field(default_factory=list)
    labels: Dict[str, str] = field(default_factory=dict)
    annotations: Dict[str, str] = field(default_factory=dict)


@dataclass
class DeploymentResult:
    """Result of an agent deployment."""
    agent_id: str
    success: bool
    deployment_name: str
    namespace: str
    status: DeploymentStatus
    message: str = ""
    error: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    endpoints: List[str] = field(default_factory=list)
    resource_usage: Dict[str, Any] = field(default_factory=dict)


@dataclass
class FleetDeployment:
    """Result of deploying a fleet of agents."""
    fleet_id: str
    agent_specs: List[AgentSpec]
    deployment_results: List[DeploymentResult]
    status: str
    created_at: datetime
    namespace: str
    error: Optional[str] = None
    total_agents: int = field(init=False)
    successful_deployments: int = field(init=False)
    failed_deployments: int = field(init=False)
    
    def __post_init__(self):
        self.total_agents = len(self.agent_specs)
        self.successful_deployments = len([r for r in self.deployment_results if r.success])
        self.failed_deployments = self.total_agents - self.successful_deployments


@dataclass
class ScalingPolicy:
    """Policy for automatic scaling of agents."""
    policy_name: str
    target_deployment: str
    scaling_metric: ScalingMetric
    target_value: float
    scale_up_threshold: float
    scale_down_threshold: float
    scale_up_cooldown_seconds: int = 300
    scale_down_cooldown_seconds: int = 600
    min_replicas: int = 1
    max_replicas: int = 100
    scale_up_step: int = 1
    scale_down_step: int = 1
    enabled: bool = True
    custom_metric_query: Optional[str] = None


@dataclass
class ScalingResult:
    """Result of a scaling operation."""
    success: bool
    previous_replicas: int = 0
    target_replicas: int = 0
    actual_replicas: int = 0
    scaling_reason: str = ""
    error: Optional[str] = None
    timestamp: datetime = field(default_factory=datetime.utcnow)


@dataclass
class AgentMetrics:
    """Runtime metrics for an agent."""
    agent_id: str
    timestamp: datetime
    cpu_usage_percent: float
    memory_usage_mb: float
    network_rx_bytes: int
    network_tx_bytes: int
    disk_read_bytes: int
    disk_write_bytes: int
    request_count: int
    error_count: int
    response_time_avg: float
    response_time_p95: float
    response_time_p99: float
    active_connections: int
    queue_length: int
    custom_metrics: Dict[str, float] = field(default_factory=dict)


@dataclass
class ClusterStatus:
    """Overall cluster status."""
    cluster_name: str
    namespace: str
    total_nodes: int
    ready_nodes: int
    total_pods: int
    running_pods: int
    pending_pods: int
    failed_pods: int
    total_agents: int
    healthy_agents: int
    cpu_capacity: str
    memory_capacity: str
    cpu_usage: str
    memory_usage: str
    storage_capacity: str
    storage_usage: str
    last_updated: datetime = field(default_factory=datetime.utcnow)


@dataclass
class NodeInfo:
    """Information about a Kubernetes node."""
    node_name: str
    node_type: str
    status: str
    cpu_capacity: str
    memory_capacity: str
    cpu_usage: str
    memory_usage: str
    pod_count: int
    max_pods: int
    labels: Dict[str, str] = field(default_factory=dict)
    taints: List[Dict[str, Any]] = field(default_factory=list)
    conditions: List[Dict[str, Any]] = field(default_factory=list)
    last_heartbeat: datetime = field(default_factory=datetime.utcnow)


@dataclass
class PodInfo:
    """Information about a Kubernetes pod."""
    pod_name: str
    namespace: str
    node_name: str
    agent_id: str
    agent_type: AgentType
    status: str
    phase: str
    cpu_request: str
    memory_request: str
    cpu_limit: str
    memory_limit: str
    restart_count: int
    created_at: datetime
    started_at: Optional[datetime] = None
    ready: bool = False
    conditions: List[Dict[str, Any]] = field(default_factory=list)
    container_statuses: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class ServiceInfo:
    """Information about a Kubernetes service."""
    service_name: str
    namespace: str
    service_type: str
    cluster_ip: str
    external_ip: Optional[str] = None
    ports: List[Dict[str, Any]] = field(default_factory=list)
    selector: Dict[str, str] = field(default_factory=dict)
    endpoints: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class NetworkPolicy:
    """Network policy configuration."""
    policy_name: str
    namespace: str
    pod_selector: Dict[str, str]
    ingress_rules: List[Dict[str, Any]] = field(default_factory=list)
    egress_rules: List[Dict[str, Any]] = field(default_factory=list)
    policy_types: List[str] = field(default_factory=lambda: ["Ingress", "Egress"])


@dataclass
class HorizontalPodAutoscaler:
    """HPA configuration."""
    hpa_name: str
    namespace: str
    target_deployment: str
    min_replicas: int
    max_replicas: int
    metrics: List[Dict[str, Any]] = field(default_factory=list)
    current_replicas: int = 0
    desired_replicas: int = 0
    last_scale_time: Optional[datetime] = None


@dataclass
class ConfigMapInfo:
    """ConfigMap information."""
    config_map_name: str
    namespace: str
    data: Dict[str, str] = field(default_factory=dict)
    binary_data: Dict[str, bytes] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class SecretInfo:
    """Secret information."""
    secret_name: str
    namespace: str
    secret_type: str
    data_keys: List[str] = field(default_factory=list)  # Don't store actual secret data
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class VolumeInfo:
    """Persistent volume information."""
    volume_name: str
    namespace: str
    storage_class: str
    capacity: str
    access_modes: List[str] = field(default_factory=list)
    status: str = "Available"
    claim_name: Optional[str] = None
    mount_path: str = "/data"
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class IngressInfo:
    """Ingress configuration."""
    ingress_name: str
    namespace: str
    host: str
    paths: List[Dict[str, Any]] = field(default_factory=list)
    tls_enabled: bool = False
    tls_secret_name: Optional[str] = None
    annotations: Dict[str, str] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class RBACInfo:
    """RBAC configuration."""
    service_account_name: str
    namespace: str
    roles: List[str] = field(default_factory=list)
    cluster_roles: List[str] = field(default_factory=list)
    role_bindings: List[str] = field(default_factory=list)
    cluster_role_bindings: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)