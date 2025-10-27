"""
Data models for ACSO Enterprise Load Balancing.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class LoadBalancingStrategy(str, Enum):
    """Load balancing strategies."""
    ROUND_ROBIN = "round_robin"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    LEAST_CONNECTIONS = "least_connections"
    LEAST_RESPONSE_TIME = "least_response_time"
    RESOURCE_BASED = "resource_based"
    AI_OPTIMIZED = "ai_optimized"
    GEOGRAPHIC = "geographic"
    TENANT_AWARE = "tenant_aware"


class TrafficType(str, Enum):
    """Types of traffic patterns."""
    STEADY = "steady"
    BURSTY = "bursty"
    PERIODIC = "periodic"
    RANDOM = "random"
    SEASONAL = "seasonal"


class ScalingDirection(str, Enum):
    """Scaling directions."""
    SCALE_UP = "scale_up"
    SCALE_DOWN = "scale_down"
    NO_CHANGE = "no_change"


@dataclass
class TrafficPattern:
    """Traffic pattern data point."""
    timestamp: datetime
    agent_type: str
    tenant_id: str
    request_rate: float
    response_time: float
    error_rate: float
    cpu_usage: float
    memory_usage: float
    active_connections: int
    queue_length: int = 0
    throughput: float = 0.0
    geographic_region: str = "unknown"
    traffic_type: TrafficType = TrafficType.STEADY


@dataclass
class LoadBalancingConfig:
    """Configuration for load balancing."""
    strategy: LoadBalancingStrategy = LoadBalancingStrategy.AI_OPTIMIZED
    health_check_interval: int = 10
    unhealthy_threshold: int = 3
    healthy_threshold: int = 2
    connection_timeout: int = 30
    request_timeout: int = 60
    max_retries: int = 3
    retry_backoff_factor: float = 1.5
    circuit_breaker_enabled: bool = True
    circuit_breaker_threshold: int = 5
    circuit_breaker_timeout: int = 60
    sticky_sessions: bool = False
    session_affinity_timeout: int = 3600
    geographic_routing: bool = False
    tenant_isolation: bool = True
    custom_headers: Dict[str, str] = field(default_factory=dict)


@dataclass
class EndpointWeight:
    """Weight configuration for an endpoint."""
    endpoint_id: str
    weight: float = 1.0
    max_connections: int = 1000
    priority: int = 1
    backup: bool = False
    drain: bool = False
    maintenance_mode: bool = False
    geographic_region: str = "default"
    capabilities: List[str] = field(default_factory=list)


@dataclass
class RoutingRule:
    """Routing rule for traffic distribution."""
    rule_id: str
    name: str
    priority: int
    conditions: List[Dict[str, Any]] = field(default_factory=list)
    actions: List[Dict[str, Any]] = field(default_factory=list)
    enabled: bool = True
    tenant_id: Optional[str] = None
    agent_type: Optional[str] = None
    geographic_region: Optional[str] = None
    time_based: bool = False
    time_ranges: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class SessionAffinity:
    """Session affinity configuration."""
    enabled: bool = False
    method: str = "cookie"  # cookie, ip_hash, header
    cookie_name: str = "ACSO_SESSION"
    cookie_ttl: int = 3600
    header_name: Optional[str] = None
    hash_key: Optional[str] = None
    fallback_strategy: LoadBalancingStrategy = LoadBalancingStrategy.ROUND_ROBIN


@dataclass
class RateLimitConfig:
    """Rate limiting configuration."""
    enabled: bool = True
    requests_per_second: int = 100
    burst_size: int = 200
    window_size: int = 60
    key_generator: str = "ip"  # ip, tenant, user, custom
    custom_key_header: Optional[str] = None
    rate_limit_response_code: int = 429
    rate_limit_response_message: str = "Rate limit exceeded"


@dataclass
class ScalingDecision:
    """Decision for scaling operations."""
    agent_type: str
    tenant_id: str
    action: str  # scale_up, scale_down, no_change
    current_replicas: int = 0
    target_replicas: int = 0
    reason: str = ""
    confidence: float = 0.0
    metrics: Dict[str, float] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.utcnow)
    predicted_load: Optional[float] = None
    cost_impact: Optional[float] = None


@dataclass
class LoadBalancerMetrics:
    """Metrics for load balancer performance."""
    timestamp: datetime
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time: float
    p50_response_time: float
    p95_response_time: float
    p99_response_time: float
    active_connections: int
    total_connections: int
    bytes_sent: int
    bytes_received: int
    error_rate: float
    throughput_rps: float
    backend_errors: int
    timeout_errors: int
    circuit_breaker_trips: int
    rate_limit_hits: int


@dataclass
class BackendHealth:
    """Health status of a backend endpoint."""
    endpoint_id: str
    healthy: bool
    response_time: float
    error_count: int
    success_count: int
    last_check: datetime
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    health_score: float = 1.0
    status_message: str = ""
    check_details: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ConnectionPool:
    """Connection pool configuration."""
    max_connections: int = 100
    max_idle_connections: int = 10
    idle_timeout: int = 300
    connection_timeout: int = 30
    keep_alive_timeout: int = 60
    max_requests_per_connection: int = 1000
    tcp_no_delay: bool = True
    tcp_keep_alive: bool = True
    buffer_size: int = 8192


@dataclass
class RetryPolicy:
    """Retry policy configuration."""
    max_retries: int = 3
    retry_timeout: int = 30
    backoff_strategy: str = "exponential"  # linear, exponential, fixed
    base_delay: float = 1.0
    max_delay: float = 60.0
    jitter: bool = True
    retry_on_status_codes: List[int] = field(default_factory=lambda: [502, 503, 504])
    retry_on_exceptions: List[str] = field(default_factory=lambda: ["ConnectionError", "TimeoutError"])


@dataclass
class LoadBalancerState:
    """Current state of the load balancer."""
    active_backends: int
    healthy_backends: int
    total_backends: int
    current_strategy: LoadBalancingStrategy
    total_requests_handled: int
    current_rps: float
    average_response_time: float
    error_rate: float
    circuit_breakers_open: int
    last_scaling_action: Optional[datetime] = None
    last_health_check: datetime = field(default_factory=datetime.utcnow)
    configuration_version: str = "1.0"
    uptime: float = 0.0


@dataclass
class GeographicRouting:
    """Geographic routing configuration."""
    enabled: bool = False
    default_region: str = "us-east-1"
    region_mapping: Dict[str, List[str]] = field(default_factory=dict)  # region -> endpoints
    latency_threshold_ms: int = 100
    failover_enabled: bool = True
    cross_region_fallback: bool = True
    geo_header_name: str = "X-Forwarded-For"
    geo_database_path: Optional[str] = None


@dataclass
class TenantIsolation:
    """Tenant isolation configuration."""
    enabled: bool = True
    strict_isolation: bool = True
    tenant_header_name: str = "X-Tenant-ID"
    default_tenant: str = "default"
    tenant_routing_rules: Dict[str, List[str]] = field(default_factory=dict)  # tenant -> endpoints
    resource_quotas: Dict[str, Dict[str, Any]] = field(default_factory=dict)  # tenant -> quotas
    priority_mapping: Dict[str, int] = field(default_factory=dict)  # tenant -> priority


@dataclass
class HealthCheckConfig:
    """Health check configuration for backends."""
    enabled: bool = True
    interval: int = 10
    timeout: int = 5
    healthy_threshold: int = 2
    unhealthy_threshold: int = 3
    path: str = "/health"
    method: str = "GET"
    expected_status: List[int] = field(default_factory=lambda: [200])
    expected_body: Optional[str] = None
    headers: Dict[str, str] = field(default_factory=dict)
    follow_redirects: bool = False
    verify_ssl: bool = True


@dataclass
class LoadBalancingRule:
    """Advanced load balancing rule."""
    rule_id: str
    name: str
    description: str
    priority: int
    enabled: bool = True
    conditions: List[Dict[str, Any]] = field(default_factory=list)
    actions: List[Dict[str, Any]] = field(default_factory=list)
    match_all_conditions: bool = True
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)
    created_by: str = "system"


@dataclass
class TrafficShaping:
    """Traffic shaping configuration."""
    enabled: bool = False
    bandwidth_limit_mbps: Optional[int] = None
    packet_loss_rate: float = 0.0
    latency_ms: int = 0
    jitter_ms: int = 0
    queue_size: int = 1000
    priority_queues: Dict[str, int] = field(default_factory=dict)
    traffic_classes: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class LoadBalancerAlert:
    """Alert configuration for load balancer."""
    alert_id: str
    name: str
    description: str
    severity: str  # info, warning, error, critical
    condition: str
    threshold: float
    duration: int
    enabled: bool = True
    notification_channels: List[str] = field(default_factory=list)
    cooldown_period: int = 300
    auto_resolve: bool = True
    tags: Dict[str, str] = field(default_factory=dict)