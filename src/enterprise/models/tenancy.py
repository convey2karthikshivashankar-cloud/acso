"""
Tenancy models for ACSO Enterprise.
Defines data structures for multi-tenant architecture.
"""

from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum


class TenantStatus(str, Enum):
    """Tenant status enumeration."""
    PENDING = "pending"
    PROVISIONING = "provisioning"
    ACTIVE = "active"
    SUSPENDED = "suspended"
    DEPROVISIONING = "deprovisioning"
    DELETED = "deleted"


class TenantTier(str, Enum):
    """Tenant subscription tiers."""
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


class ComplianceLevel(str, Enum):
    """Compliance levels for tenants."""
    BASIC = "basic"
    HIPAA = "hipaa"
    SOX = "sox"
    GDPR = "gdpr"
    PCI_DSS = "pci_dss"
    CUSTOM = "custom"


@dataclass
class ResourceLimits:
    """Resource limits for a tenant."""
    max_agents: int
    max_cpu_cores: float
    max_memory_gb: float
    max_storage_gb: float
    max_api_requests_per_hour: int
    max_data_transfer_gb_per_month: float
    max_concurrent_tasks: int = 100
    max_retention_days: int = 90


@dataclass
class BillingInfo:
    """Billing information for a tenant."""
    billing_email: str
    billing_address: Dict[str, str]
    payment_method: str
    billing_cycle: str  # monthly, yearly
    currency: str = "USD"
    tax_id: Optional[str] = None
    purchase_order: Optional[str] = None


@dataclass
class ComplianceSettings:
    """Compliance settings for a tenant."""
    compliance_level: ComplianceLevel
    data_residency_region: str
    encryption_at_rest: bool = True
    encryption_in_transit: bool = True
    audit_logging: bool = True
    data_retention_days: int = 2555  # 7 years default
    anonymization_enabled: bool = False
    gdpr_compliant: bool = False
    hipaa_compliant: bool = False


@dataclass
class TenantConfig:
    """Complete tenant configuration."""
    tenant_id: str
    name: str
    tier: TenantTier
    status: TenantStatus = TenantStatus.PENDING
    
    # Contact information
    admin_email: str = ""
    admin_name: str = ""
    organization: str = ""
    
    # Resource configuration
    resource_limits: ResourceLimits = field(default_factory=lambda: ResourceLimits(
        max_agents=10,
        max_cpu_cores=4,
        max_memory_gb=8,
        max_storage_gb=50,
        max_api_requests_per_hour=1000,
        max_data_transfer_gb_per_month=10
    ))
    
    # Billing configuration
    billing_info: Optional[BillingInfo] = None
    
    # Compliance configuration
    compliance_settings: ComplianceSettings = field(default_factory=lambda: ComplianceSettings(
        compliance_level=ComplianceLevel.BASIC,
        data_residency_region="us-east-1"
    ))
    
    # Custom configuration
    custom_config: Dict[str, Any] = field(default_factory=dict)
    
    # Timestamps
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    provisioned_at: Optional[datetime] = None
    
    # Metadata
    tags: Dict[str, str] = field(default_factory=dict)
    labels: Dict[str, str] = field(default_factory=dict)


@dataclass
class DatabaseConfig:
    """Database configuration for a tenant."""
    tenant_id: str
    database_name: str
    connection_string: str
    schema_name: str
    created_at: datetime
    backup_enabled: bool = True
    backup_retention_days: int = 30
    encryption_enabled: bool = True


@dataclass
class TenantEnvironment:
    """Tenant environment configuration."""
    tenant_id: str
    namespace: str
    service_account: str
    endpoints: Dict[str, str]
    services: Dict[str, str]
    created_at: datetime
    updated_at: Optional[datetime] = None
    status: str = "active"
    
    # Database configuration
    database_config: Optional[DatabaseConfig] = None
    
    # Network configuration
    network_policies: List[str] = field(default_factory=list)
    ingress_rules: List[str] = field(default_factory=list)
    
    # Security configuration
    tls_enabled: bool = True
    certificate_arn: Optional[str] = None
    
    # Monitoring configuration
    monitoring_enabled: bool = True
    logging_enabled: bool = True
    metrics_retention_days: int = 30


@dataclass
class TenantMetrics:
    """Tenant usage metrics."""
    tenant_id: str
    timestamp: datetime
    
    # Resource usage
    cpu_cores_used: float
    memory_gb_used: float
    storage_gb_used: float
    network_gb_transferred: float
    
    # Agent metrics
    active_agents: int
    total_tasks_executed: int
    failed_tasks: int
    avg_task_duration_seconds: float
    
    # API metrics
    api_requests_count: int
    api_errors_count: int
    avg_response_time_ms: float
    
    # Cost metrics
    estimated_cost_usd: float
    
    # Performance metrics
    uptime_percentage: float
    availability_percentage: float


@dataclass
class TenantAlert:
    """Tenant alert configuration."""
    tenant_id: str
    alert_type: str
    severity: str
    threshold: float
    enabled: bool = True
    notification_channels: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class TenantAuditLog:
    """Tenant audit log entry."""
    tenant_id: str
    timestamp: datetime
    user_id: str
    action: str
    resource_type: str
    resource_id: str
    details: Dict[str, Any]
    ip_address: str
    user_agent: str
    success: bool = True
    error_message: Optional[str] = None


@dataclass
class TenantBackup:
    """Tenant backup information."""
    tenant_id: str
    backup_id: str
    backup_type: str  # full, incremental, differential
    created_at: datetime
    size_bytes: int
    status: str  # pending, in_progress, completed, failed
    retention_until: datetime
    storage_location: str
    encryption_enabled: bool = True
    checksum: Optional[str] = None


@dataclass
class TenantQuota:
    """Tenant resource quota."""
    tenant_id: str
    resource_type: str
    limit: float
    used: float
    unit: str
    period: str  # hourly, daily, monthly
    last_updated: datetime
    
    @property
    def utilization_percentage(self) -> float:
        """Calculate utilization percentage."""
        if self.limit == 0:
            return 0.0
        return (self.used / self.limit) * 100
    
    @property
    def is_exceeded(self) -> bool:
        """Check if quota is exceeded."""
        return self.used > self.limit


@dataclass
class TenantNotification:
    """Tenant notification."""
    tenant_id: str
    notification_id: str
    type: str
    title: str
    message: str
    severity: str
    created_at: datetime
    read_at: Optional[datetime] = None
    acknowledged_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class TenantIntegration:
    """Tenant integration configuration."""
    tenant_id: str
    integration_type: str
    integration_name: str
    enabled: bool
    configuration: Dict[str, Any]
    credentials: Dict[str, str]  # Encrypted
    created_at: datetime
    updated_at: Optional[datetime] = None
    last_sync_at: Optional[datetime] = None
    sync_status: str = "pending"


@dataclass
class TenantCustomization:
    """Tenant UI/UX customization settings."""
    tenant_id: str
    
    # Branding
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    primary_color: str = "#1976d2"
    secondary_color: str = "#dc004e"
    background_color: str = "#ffffff"
    
    # Domain
    custom_domain: Optional[str] = None
    ssl_certificate_arn: Optional[str] = None
    
    # UI Configuration
    theme: str = "light"  # light, dark, auto
    language: str = "en"
    timezone: str = "UTC"
    date_format: str = "YYYY-MM-DD"
    time_format: str = "24h"
    
    # Feature flags
    features_enabled: Dict[str, bool] = field(default_factory=dict)
    
    # Custom CSS/JS
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    
    # Updated timestamp
    updated_at: datetime = field(default_factory=datetime.utcnow)


@dataclass
class TenantSLA:
    """Tenant Service Level Agreement."""
    tenant_id: str
    sla_tier: str
    
    # Availability commitments
    uptime_percentage: float = 99.9
    response_time_ms: int = 500
    resolution_time_hours: int = 24
    
    # Support commitments
    support_channels: List[str] = field(default_factory=lambda: ["email", "chat"])
    support_hours: str = "business_hours"  # 24x7, business_hours, custom
    escalation_levels: int = 3
    
    # Performance commitments
    max_latency_ms: int = 1000
    throughput_requests_per_second: int = 100
    
    # Data commitments
    backup_frequency: str = "daily"
    backup_retention_days: int = 30
    disaster_recovery_rto_hours: int = 4
    disaster_recovery_rpo_hours: int = 1
    
    # Penalties and credits
    sla_credits_enabled: bool = True
    penalty_percentage: float = 5.0
    
    # Effective dates
    effective_from: datetime = field(default_factory=datetime.utcnow)
    effective_until: Optional[datetime] = None


# Utility functions for tenant management

def get_default_resource_limits(tier: TenantTier) -> ResourceLimits:
    """Get default resource limits for a tenant tier."""
    limits_by_tier = {
        TenantTier.STARTER: ResourceLimits(
            max_agents=10,
            max_cpu_cores=4,
            max_memory_gb=8,
            max_storage_gb=50,
            max_api_requests_per_hour=1000,
            max_data_transfer_gb_per_month=10
        ),
        TenantTier.PROFESSIONAL: ResourceLimits(
            max_agents=100,
            max_cpu_cores=20,
            max_memory_gb=40,
            max_storage_gb=500,
            max_api_requests_per_hour=10000,
            max_data_transfer_gb_per_month=100
        ),
        TenantTier.ENTERPRISE: ResourceLimits(
            max_agents=1000,
            max_cpu_cores=100,
            max_memory_gb=200,
            max_storage_gb=5000,
            max_api_requests_per_hour=100000,
            max_data_transfer_gb_per_month=1000
        ),
        TenantTier.CUSTOM: ResourceLimits(
            max_agents=10000,
            max_cpu_cores=1000,
            max_memory_gb=2000,
            max_storage_gb=50000,
            max_api_requests_per_hour=1000000,
            max_data_transfer_gb_per_month=10000
        )
    }
    
    return limits_by_tier.get(tier, limits_by_tier[TenantTier.STARTER])


def get_default_compliance_settings(tier: TenantTier) -> ComplianceSettings:
    """Get default compliance settings for a tenant tier."""
    if tier == TenantTier.ENTERPRISE:
        return ComplianceSettings(
            compliance_level=ComplianceLevel.GDPR,
            data_residency_region="us-east-1",
            encryption_at_rest=True,
            encryption_in_transit=True,
            audit_logging=True,
            data_retention_days=2555,  # 7 years
            anonymization_enabled=True,
            gdpr_compliant=True,
            hipaa_compliant=False
        )
    else:
        return ComplianceSettings(
            compliance_level=ComplianceLevel.BASIC,
            data_residency_region="us-east-1",
            encryption_at_rest=True,
            encryption_in_transit=True,
            audit_logging=True,
            data_retention_days=365,  # 1 year
            anonymization_enabled=False,
            gdpr_compliant=False,
            hipaa_compliant=False
        )


def validate_tenant_config(config: TenantConfig) -> List[str]:
    """Validate tenant configuration and return list of errors."""
    errors = []
    
    if not config.tenant_id:
        errors.append("Tenant ID is required")
    
    if not config.name:
        errors.append("Tenant name is required")
    
    if not config.admin_email:
        errors.append("Admin email is required")
    
    if config.resource_limits.max_agents <= 0:
        errors.append("Max agents must be greater than 0")
    
    if config.resource_limits.max_cpu_cores <= 0:
        errors.append("Max CPU cores must be greater than 0")
    
    if config.resource_limits.max_memory_gb <= 0:
        errors.append("Max memory must be greater than 0")
    
    if config.resource_limits.max_storage_gb <= 0:
        errors.append("Max storage must be greater than 0")
    
    return errors