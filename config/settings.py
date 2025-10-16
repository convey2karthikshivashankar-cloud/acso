"""
Configuration settings for the ACSO system.
"""

from typing import Dict, List, Optional
from pydantic import BaseSettings, Field


class AWSSettings(BaseSettings):
    """AWS service configuration."""
    region: str = Field(default="us-east-1", description="AWS region")
    bedrock_model_id: str = Field(default="anthropic.claude-3-sonnet-20240229-v1:0", description="Bedrock model ID")
    bedrock_agent_runtime_endpoint: Optional[str] = Field(None, description="Bedrock AgentCore runtime endpoint")
    
    # IAM and Security
    agent_execution_role_arn: Optional[str] = Field(None, description="IAM role for agent execution")
    kms_key_id: Optional[str] = Field(None, description="KMS key for encryption")
    
    # CloudWatch and Monitoring
    cloudwatch_log_group: str = Field(default="/aws/acso/agents", description="CloudWatch log group")
    metrics_namespace: str = Field(default="ACSO/Agents", description="CloudWatch metrics namespace")
    
    class Config:
        env_prefix = "AWS_"


class AgentSettings(BaseSettings):
    """Agent-specific configuration."""
    supervisor_agent_id: str = Field(default="supervisor-001", description="Supervisor agent ID")
    max_concurrent_tasks: int = Field(default=10, description="Maximum concurrent tasks per agent")
    task_timeout_seconds: int = Field(default=300, description="Task execution timeout")
    memory_retention_days: int = Field(default=30, description="Memory retention period")
    
    # Agent capabilities
    threat_hunter_enabled: bool = Field(default=True, description="Enable threat hunter agent")
    incident_response_enabled: bool = Field(default=True, description="Enable incident response agent")
    service_orchestration_enabled: bool = Field(default=True, description="Enable service orchestration agent")
    financial_intelligence_enabled: bool = Field(default=True, description="Enable financial intelligence agent")
    
    class Config:
        env_prefix = "AGENT_"


class SecuritySettings(BaseSettings):
    """Security configuration."""
    encryption_enabled: bool = Field(default=True, description="Enable data encryption")
    audit_logging_enabled: bool = Field(default=True, description="Enable audit logging")
    human_approval_required_for_high_risk: bool = Field(default=True, description="Require human approval for high-risk actions")
    
    # Risk thresholds
    high_risk_threshold: float = Field(default=0.8, description="Threshold for high-risk actions")
    critical_risk_threshold: float = Field(default=0.9, description="Threshold for critical-risk actions")
    
    # Access control
    allowed_containment_actions: List[str] = Field(
        default=["isolate_host", "block_ip", "disable_user", "quarantine_file"],
        description="Allowed containment actions"
    )
    
    class Config:
        env_prefix = "SECURITY_"


class MonitoringSettings(BaseSettings):
    """Monitoring and observability configuration."""
    metrics_enabled: bool = Field(default=True, description="Enable metrics collection")
    logging_level: str = Field(default="INFO", description="Logging level")
    dashboard_enabled: bool = Field(default=True, description="Enable monitoring dashboard")
    
    # Alert thresholds
    agent_failure_threshold: int = Field(default=3, description="Agent failure threshold for alerts")
    task_queue_threshold: int = Field(default=50, description="Task queue threshold for alerts")
    response_time_threshold_ms: int = Field(default=5000, description="Response time threshold for alerts")
    
    class Config:
        env_prefix = "MONITORING_"


class IntegrationSettings(BaseSettings):
    """External system integration configuration."""
    # SIEM Integration
    siem_enabled: bool = Field(default=False, description="Enable SIEM integration")
    siem_endpoint: Optional[str] = Field(None, description="SIEM system endpoint")
    siem_api_key: Optional[str] = Field(None, description="SIEM API key")
    
    # Ticketing System Integration
    ticketing_enabled: bool = Field(default=False, description="Enable ticketing system integration")
    ticketing_endpoint: Optional[str] = Field(None, description="Ticketing system endpoint")
    ticketing_api_key: Optional[str] = Field(None, description="Ticketing API key")
    
    # CRM Integration
    crm_enabled: bool = Field(default=False, description="Enable CRM integration")
    crm_endpoint: Optional[str] = Field(None, description="CRM system endpoint")
    crm_api_key: Optional[str] = Field(None, description="CRM API key")
    
    class Config:
        env_prefix = "INTEGRATION_"


class ACSOSettings(BaseSettings):
    """Main ACSO configuration combining all settings."""
    aws: AWSSettings = Field(default_factory=AWSSettings)
    agents: AgentSettings = Field(default_factory=AgentSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    monitoring: MonitoringSettings = Field(default_factory=MonitoringSettings)
    integrations: IntegrationSettings = Field(default_factory=IntegrationSettings)
    
    # System-wide settings
    system_name: str = Field(default="ACSO", description="System name")
    version: str = Field(default="0.1.0", description="System version")
    environment: str = Field(default="development", description="Environment (development, staging, production)")
    debug: bool = Field(default=True, description="Enable debug mode")
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"


# Global settings instance
settings = ACSOSettings()