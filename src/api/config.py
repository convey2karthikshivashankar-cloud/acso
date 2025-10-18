"""
Configuration settings for ACSO API Gateway.
"""

import os
from typing import List, Optional
from pydantic import BaseSettings, Field, validator


class DatabaseSettings(BaseSettings):
    """Database configuration."""
    url: str = Field(
        default="postgresql://acso:acso@localhost:5432/acso",
        description="Database connection URL"
    )
    pool_size: int = Field(default=10, description="Connection pool size")
    max_overflow: int = Field(default=20, description="Maximum pool overflow")
    pool_timeout: int = Field(default=30, description="Pool timeout in seconds")
    pool_recycle: int = Field(default=3600, description="Pool recycle time in seconds")
    echo: bool = Field(default=False, description="Enable SQL query logging")
    
    class Config:
        env_prefix = "DATABASE_"


class RedisSettings(BaseSettings):
    """Redis configuration."""
    url: str = Field(
        default="redis://localhost:6379/0",
        description="Redis connection URL"
    )
    max_connections: int = Field(default=20, description="Maximum Redis connections")
    socket_timeout: int = Field(default=5, description="Socket timeout in seconds")
    socket_connect_timeout: int = Field(default=5, description="Socket connect timeout")
    retry_on_timeout: bool = Field(default=True, description="Retry on timeout")
    health_check_interval: int = Field(default=30, description="Health check interval")
    
    class Config:
        env_prefix = "REDIS_"


class SecuritySettings(BaseSettings):
    """Security configuration."""
    secret_key: str = Field(
        default="your-secret-key-change-in-production",
        description="Secret key for JWT tokens"
    )
    algorithm: str = Field(default="HS256", description="JWT algorithm")
    access_token_expire_minutes: int = Field(
        default=30, description="Access token expiration time"
    )
    refresh_token_expire_days: int = Field(
        default=7, description="Refresh token expiration time"
    )
    
    # CORS settings
    cors_origins: List[str] = Field(
        default=[
            "http://localhost:3000",
            "http://localhost:5173",
            "https://acso.example.com"
        ],
        description="Allowed CORS origins"
    )
    cors_allow_credentials: bool = Field(default=True, description="Allow CORS credentials")
    
    # Rate limiting
    rate_limit_calls: int = Field(default=100, description="Rate limit calls per period")
    rate_limit_period: int = Field(default=60, description="Rate limit period in seconds")
    
    # Trusted hosts
    allowed_hosts: List[str] = Field(
        default=["localhost", "127.0.0.1", "acso.example.com"],
        description="Allowed host headers"
    )
    
    @validator('secret_key')
    def validate_secret_key(cls, v):
        if v == "your-secret-key-change-in-production" and os.getenv("ENVIRONMENT") == "production":
            raise ValueError("Secret key must be changed in production")
        return v
    
    class Config:
        env_prefix = "SECURITY_"


class WebSocketSettings(BaseSettings):
    """WebSocket configuration."""
    max_connections: int = Field(default=1000, description="Maximum WebSocket connections")
    heartbeat_interval: int = Field(default=30, description="Heartbeat interval in seconds")
    connection_timeout: int = Field(default=60, description="Connection timeout in seconds")
    message_queue_size: int = Field(default=100, description="Message queue size per connection")
    broadcast_buffer_size: int = Field(default=1000, description="Broadcast buffer size")
    
    class Config:
        env_prefix = "WEBSOCKET_"


class CacheSettings(BaseSettings):
    """Caching configuration."""
    enabled: bool = Field(default=True, description="Enable caching")
    default_ttl: int = Field(default=300, description="Default cache TTL in seconds")
    max_size: int = Field(default=1000, description="Maximum cache size")
    
    # Cache TTL for different data types
    agent_status_ttl: int = Field(default=30, description="Agent status cache TTL")
    metrics_ttl: int = Field(default=60, description="Metrics cache TTL")
    config_ttl: int = Field(default=600, description="Configuration cache TTL")
    
    class Config:
        env_prefix = "CACHE_"


class LoggingSettings(BaseSettings):
    """Logging configuration."""
    level: str = Field(default="INFO", description="Logging level")
    format: str = Field(
        default="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        description="Log format"
    )
    file_enabled: bool = Field(default=True, description="Enable file logging")
    file_path: str = Field(default="logs/acso-api.log", description="Log file path")
    file_max_size: int = Field(default=10485760, description="Max log file size (10MB)")
    file_backup_count: int = Field(default=5, description="Number of backup log files")
    
    # Structured logging
    json_format: bool = Field(default=False, description="Use JSON log format")
    include_request_id: bool = Field(default=True, description="Include request ID in logs")
    
    class Config:
        env_prefix = "LOGGING_"


class MonitoringSettings(BaseSettings):
    """Monitoring configuration."""
    enabled: bool = Field(default=True, description="Enable monitoring")
    metrics_endpoint: str = Field(default="/metrics", description="Metrics endpoint path")
    health_endpoint: str = Field(default="/health", description="Health check endpoint path")
    
    # Performance monitoring
    slow_query_threshold: float = Field(
        default=1.0, description="Slow query threshold in seconds"
    )
    request_timeout: int = Field(default=30, description="Request timeout in seconds")
    
    # Alerting thresholds
    error_rate_threshold: float = Field(
        default=0.05, description="Error rate threshold for alerts"
    )
    response_time_threshold: float = Field(
        default=2.0, description="Response time threshold for alerts"
    )
    
    class Config:
        env_prefix = "MONITORING_"


class APISettings(BaseSettings):
    """Main API configuration."""
    # Application settings
    title: str = Field(default="ACSO API Gateway", description="API title")
    description: str = Field(
        default="Integration API for ACSO Frontend-Backend Communication",
        description="API description"
    )
    version: str = Field(default="1.0.0", description="API version")
    environment: str = Field(
        default="development",
        description="Environment (development, staging, production)"
    )
    debug: bool = Field(default=True, description="Enable debug mode")
    
    # Server settings
    host: str = Field(default="0.0.0.0", description="Server host")
    port: int = Field(default=8000, description="Server port")
    workers: int = Field(default=1, description="Number of worker processes")
    
    # API settings
    api_prefix: str = Field(default="/api/v1", description="API prefix")
    docs_url: Optional[str] = Field(default="/docs", description="Docs URL")
    redoc_url: Optional[str] = Field(default="/redoc", description="ReDoc URL")
    openapi_url: Optional[str] = Field(default="/openapi.json", description="OpenAPI URL")
    
    # Component settings
    database: DatabaseSettings = Field(default_factory=DatabaseSettings)
    redis: RedisSettings = Field(default_factory=RedisSettings)
    security: SecuritySettings = Field(default_factory=SecuritySettings)
    websocket: WebSocketSettings = Field(default_factory=WebSocketSettings)
    cache: CacheSettings = Field(default_factory=CacheSettings)
    logging: LoggingSettings = Field(default_factory=LoggingSettings)
    monitoring: MonitoringSettings = Field(default_factory=MonitoringSettings)
    
    @validator('docs_url', 'redoc_url', 'openapi_url')
    def disable_docs_in_production(cls, v, values):
        if values.get('environment') == 'production':
            return None
        return v
    
    class Config:
        env_file = ".env"
        env_file_encoding = "utf-8"
        case_sensitive = False


# Global settings instance
settings = APISettings()