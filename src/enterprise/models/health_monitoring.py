"""
Data models for ACSO Enterprise Health Monitoring.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum


class HealthStatus(str, Enum):
    """Health status values."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"
    MAINTENANCE = "maintenance"


class CircuitBreakerState(str, Enum):
    """Circuit breaker states."""
    CLOSED = "closed"
    OPEN = "open"
    HALF_OPEN = "half_open"


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class CheckType(str, Enum):
    """Types of health checks."""
    HTTP = "http"
    HTTPS = "https"
    TCP = "tcp"
    UDP = "udp"
    GRPC = "grpc"
    DATABASE = "database"
    REDIS = "redis"
    ELASTICSEARCH = "elasticsearch"
    KAFKA = "kafka"
    CUSTOM = "custom"


@dataclass
class HealthCheck:
    """Result of a health check."""
    endpoint: str
    healthy: bool
    response_time_ms: float
    timestamp: datetime
    error_message: Optional[str] = None
    status_code: Optional[int] = None
    details: Dict[str, Any] = field(default_factory=dict)
    check_type: CheckType = CheckType.HTTP
    check_id: str = ""


@dataclass
class HealthThreshold:
    """Thresholds for health determination."""
    response_time_warning_ms: int = 1000
    response_time_critical_ms: int = 5000
    error_rate_warning: float = 0.05  # 5%
    error_rate_critical: float = 0.10  # 10%
    availability_warning: float = 0.95  # 95%
    availability_critical: float = 0.90  # 90%
    consecutive_failures_warning: int = 3
    consecutive_failures_critical: int = 5


@dataclass
class HealthCheckResult:
    """Comprehensive health check result."""
    check_id: str
    endpoint_name: str
    endpoint_url: str
    check_type: CheckType
    status: HealthStatus
    response_time_ms: float
    timestamp: datetime
    success: bool
    error_message: Optional[str] = None
    status_code: Optional[int] = None
    response_body: Optional[str] = None
    response_headers: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    tags: Dict[str, str] = field(default_factory=dict)


@dataclass
class EndpointHealth:
    """Overall health status of an endpoint."""
    endpoint_name: str
    endpoint_url: str
    current_status: HealthStatus
    last_check: datetime
    uptime_percentage: float
    average_response_time: float
    total_checks: int
    successful_checks: int
    failed_checks: int
    consecutive_failures: int
    consecutive_successes: int
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    error_rate: float = 0.0
    availability_24h: float = 100.0
    availability_7d: float = 100.0
    availability_30d: float = 100.0
    response_time_p50: float = 0.0
    response_time_p95: float = 0.0
    response_time_p99: float = 0.0
    tags: Dict[str, str] = field(default_factory=dict)
    alerts: List[str] = field(default_factory=list)


@dataclass
class CircuitBreakerMetrics:
    """Metrics for circuit breaker."""
    circuit_breaker_id: str
    endpoint_name: str
    current_state: CircuitBreakerState
    failure_count: int
    success_count: int
    last_failure_time: Optional[datetime] = None
    last_success_time: Optional[datetime] = None
    state_changed_time: datetime = field(default_factory=datetime.utcnow)
    total_requests: int = 0
    failed_requests: int = 0
    rejected_requests: int = 0
    timeout_count: int = 0
    half_open_success_count: int = 0
    half_open_failure_count: int = 0


@dataclass
class HealthAlert:
    """Health monitoring alert."""
    alert_id: str
    endpoint_name: str
    alert_type: str
    severity: AlertSeverity
    title: str
    description: str
    timestamp: datetime
    resolved: bool = False
    resolved_at: Optional[datetime] = None
    acknowledged: bool = False
    acknowledged_at: Optional[datetime] = None
    acknowledged_by: Optional[str] = None
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    notification_sent: bool = False
    escalated: bool = False
    escalation_level: int = 0


@dataclass
class HealthTrend:
    """Health trend data."""
    endpoint_name: str
    time_period: str  # 1h, 24h, 7d, 30d
    data_points: List[Dict[str, Any]] = field(default_factory=list)
    average_response_time: float = 0.0
    min_response_time: float = 0.0
    max_response_time: float = 0.0
    availability_percentage: float = 100.0
    error_rate: float = 0.0
    total_requests: int = 0
    successful_requests: int = 0
    failed_requests: int = 0
    trend_direction: str = "stable"  # improving, degrading, stable
    anomalies_detected: List[Dict[str, Any]] = field(default_factory=list)


@dataclass
class HealthDashboard:
    """Health dashboard configuration."""
    dashboard_id: str
    name: str
    description: str
    endpoints: List[str] = field(default_factory=list)
    refresh_interval: int = 30
    time_range: str = "24h"
    widgets: List[Dict[str, Any]] = field(default_factory=list)
    filters: Dict[str, Any] = field(default_factory=dict)
    alerts_enabled: bool = True
    public: bool = False
    created_by: str = "system"
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class HealthCheckSchedule:
    """Schedule for health checks."""
    schedule_id: str
    endpoint_name: str
    check_type: CheckType
    interval_seconds: int
    timeout_seconds: int
    enabled: bool = True
    retry_attempts: int = 3
    retry_delay_seconds: int = 1
    failure_threshold: int = 3
    success_threshold: int = 2
    maintenance_windows: List[Dict[str, Any]] = field(default_factory=list)
    notification_settings: Dict[str, Any] = field(default_factory=dict)
    custom_headers: Dict[str, str] = field(default_factory=dict)
    expected_status_codes: List[int] = field(default_factory=lambda: [200])
    expected_response_time_ms: int = 5000
    custom_validator: Optional[str] = None  # Function name or script


@dataclass
class MaintenanceWindow:
    """Maintenance window configuration."""
    window_id: str
    name: str
    description: str
    start_time: datetime
    end_time: datetime
    affected_endpoints: List[str] = field(default_factory=list)
    recurring: bool = False
    recurrence_pattern: Optional[str] = None  # cron expression
    suppress_alerts: bool = True
    notification_before_minutes: int = 30
    created_by: str = "system"
    approved_by: Optional[str] = None
    status: str = "scheduled"  # scheduled, active, completed, cancelled


@dataclass
class HealthMetricsAggregation:
    """Aggregated health metrics."""
    time_bucket: datetime
    bucket_size_minutes: int
    endpoint_name: str
    total_checks: int
    successful_checks: int
    failed_checks: int
    average_response_time: float
    min_response_time: float
    max_response_time: float
    p50_response_time: float
    p95_response_time: float
    p99_response_time: float
    error_rate: float
    availability_percentage: float
    unique_errors: List[str] = field(default_factory=list)
    status_code_distribution: Dict[int, int] = field(default_factory=dict)


@dataclass
class HealthCheckConfiguration:
    """Complete health check configuration."""
    config_id: str
    endpoint_name: str
    endpoint_url: str
    check_type: CheckType
    enabled: bool = True
    schedule: HealthCheckSchedule = field(default_factory=lambda: HealthCheckSchedule("", "", CheckType.HTTP, 30, 5))
    thresholds: HealthThreshold = field(default_factory=HealthThreshold)
    circuit_breaker_enabled: bool = True
    circuit_breaker_config: Dict[str, Any] = field(default_factory=dict)
    alert_rules: List[Dict[str, Any]] = field(default_factory=list)
    tags: Dict[str, str] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)
    dependencies: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class HealthReport:
    """Comprehensive health report."""
    report_id: str
    report_type: str  # summary, detailed, trend
    time_period: str
    generated_at: datetime
    endpoints_summary: Dict[str, Any] = field(default_factory=dict)
    overall_health_score: float = 100.0
    total_endpoints: int = 0
    healthy_endpoints: int = 0
    degraded_endpoints: int = 0
    unhealthy_endpoints: int = 0
    average_availability: float = 100.0
    average_response_time: float = 0.0
    total_incidents: int = 0
    resolved_incidents: int = 0
    open_incidents: int = 0
    top_issues: List[Dict[str, Any]] = field(default_factory=list)
    recommendations: List[str] = field(default_factory=list)
    trends: List[HealthTrend] = field(default_factory=list)
    sla_compliance: Dict[str, float] = field(default_factory=dict)


@dataclass
class SLATarget:
    """Service Level Agreement target."""
    sla_id: str
    endpoint_name: str
    metric_name: str  # availability, response_time, error_rate
    target_value: float
    measurement_period: str  # monthly, weekly, daily
    warning_threshold: float
    breach_threshold: float
    current_value: float = 0.0
    compliance_percentage: float = 100.0
    breaches_count: int = 0
    last_breach: Optional[datetime] = None
    status: str = "compliant"  # compliant, warning, breach
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class HealthIncident:
    """Health monitoring incident."""
    incident_id: str
    endpoint_name: str
    title: str
    description: str
    severity: AlertSeverity
    status: str  # open, investigating, resolved, closed
    created_at: datetime
    detected_at: datetime
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    closed_at: Optional[datetime] = None
    assigned_to: Optional[str] = None
    root_cause: Optional[str] = None
    resolution_notes: Optional[str] = None
    affected_services: List[str] = field(default_factory=list)
    timeline: List[Dict[str, Any]] = field(default_factory=list)
    tags: Dict[str, str] = field(default_factory=dict)
    external_ticket_id: Optional[str] = None
    escalation_level: int = 0
    customer_impact: str = "none"  # none, low, medium, high, critical


@dataclass
class HealthNotification:
    """Health monitoring notification."""
    notification_id: str
    endpoint_name: str
    notification_type: str  # alert, recovery, maintenance
    channel: str  # email, slack, webhook, sms
    recipient: str
    subject: str
    message: str
    sent_at: datetime
    delivered: bool = False
    delivery_status: str = "pending"
    retry_count: int = 0
    max_retries: int = 3
    metadata: Dict[str, Any] = field(default_factory=dict)
    template_id: Optional[str] = None
    priority: str = "normal"  # low, normal, high, urgent