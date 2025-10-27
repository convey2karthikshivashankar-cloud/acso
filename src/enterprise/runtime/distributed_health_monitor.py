"""
Distributed Health Monitor with Circuit Breaker Patterns for ACSO Enterprise.
Provides comprehensive health monitoring and fault tolerance mechanisms.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import aiohttp
import time

import prometheus_client
from circuit_breaker import CircuitBreaker, CircuitBreakerError

from ..models.health_monitoring import HealthCheck, HealthStatus, CircuitBreakerState
from ..monitoring.metrics_collector import MetricsCollector
from ..alerting.alert_manager import AlertManager


class HealthCheckType(str, Enum):
    """Types of health checks."""
    HTTP = "http"
    TCP = "tcp"
    GRPC = "grpc"
    DATABASE = "database"
    REDIS = "redis"
    CUSTOM = "custom"


class CircuitBreakerPolicy(str, Enum):
    """Circuit breaker policies."""
    FAIL_FAST = "fail_fast"
    FAIL_SAFE = "fail_safe"
    RETRY_WITH_BACKOFF = "retry_with_backoff"


@dataclass
class HealthCheckConfig:
    """Configuration for a health check."""
    name: str
    check_type: HealthCheckType
    endpoint: str
    interval_seconds: int = 30
    timeout_seconds: int = 5
    failure_threshold: int = 3
    success_threshold: int = 2
    retry_attempts: int = 3
    retry_delay_seconds: int = 1
    expected_status_codes: List[int] = field(default_factory=lambda: [200])
    expected_response_time_ms: int = 1000
    custom_headers: Dict[str, str] = field(default_factory=dict)
    custom_validator: Optional[Callable] = None


@dataclass
class CircuitBreakerConfig:
    """Configuration for circuit breaker."""
    failure_threshold: int = 5
    recovery_timeout_seconds: int = 60
    expected_exception: type = Exception
    fallback_function: Optional[Callable] = None
    policy: CircuitBreakerPolicy = CircuitBreakerPolicy.FAIL_FAST


@dataclass
class HealthMetrics:
    """Health metrics for an endpoint."""
    total_checks: int = 0
    successful_checks: int = 0
    failed_checks: int = 0
    average_response_time: float = 0.0
    last_success: Optional[datetime] = None
    last_failure: Optional[datetime] = None
    consecutive_failures: int = 0
    consecutive_successes: int = 0
    uptime_percentage: float = 100.0
    current_status: HealthStatus = HealthStatus.UNKNOWN


class DistributedHealthMonitor:
    """Enterprise-grade distributed health monitoring system."""
    
    def __init__(self, cluster_manager, alert_manager: AlertManager):
        self.cluster_manager = cluster_manager
        self.alert_manager = alert_manager
        self.logger = logging.getLogger(__name__)
        self.metrics_collector = MetricsCollector()
        
        # Health monitoring state
        self.health_checks: Dict[str, HealthCheckConfig] = {}
        self.health_metrics: Dict[str, HealthMetrics] = {}
        self.circuit_breakers: Dict[str, CircuitBreaker] = {}
        self.circuit_breaker_configs: Dict[str, CircuitBreakerConfig] = {}
        
        # Monitoring tasks
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}
        self.running = False
        
        # HTTP session for health checks
        self.http_session: Optional[aiohttp.ClientSession] = None
        
        # Prometheus metrics
        self.health_check_counter = prometheus_client.Counter(
            'acso_health_checks_total',
            'Total number of health checks performed',
            ['endpoint', 'status']
        )
        
        self.health_check_duration = prometheus_client.Histogram(
            'acso_health_check_duration_seconds',
            'Health check duration',
            ['endpoint']
        )
        
        self.circuit_breaker_state = prometheus_client.Gauge(
            'acso_circuit_breaker_state',
            'Circuit breaker state (0=closed, 1=open, 2=half-open)',
            ['endpoint']
        )
        
        self.uptime_gauge = prometheus_client.Gauge(
            'acso_endpoint_uptime_percentage',
            'Endpoint uptime percentage',
            ['endpoint']
        )
    
    async def initialize(self) -> bool:
        """Initialize the health monitoring system."""
        try:
            self.logger.info("Initializing distributed health monitor")
            
            # Create HTTP session with appropriate timeouts
            timeout = aiohttp.ClientTimeout(total=30, connect=10)
            self.http_session = aiohttp.ClientSession(timeout=timeout)
            
            self.running = True
            
            # Start background monitoring task
            asyncio.create_task(self._monitoring_coordinator())
            
            self.logger.info("Distributed health monitor initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize health monitor: {e}")
            return False
    
    async def shutdown(self):
        """Shutdown the health monitoring system."""
        try:
            self.logger.info("Shutting down distributed health monitor")
            
            self.running = False
            
            # Cancel all monitoring tasks
            for task in self.monitoring_tasks.values():
                task.cancel()
            
            # Wait for tasks to complete
            if self.monitoring_tasks:
                await asyncio.gather(*self.monitoring_tasks.values(), return_exceptions=True)
            
            # Close HTTP session
            if self.http_session:
                await self.http_session.close()
            
            self.logger.info("Health monitor shutdown completed")
            
        except Exception as e:
            self.logger.error(f"Error during health monitor shutdown: {e}")
    
    async def register_health_check(self, config: HealthCheckConfig) -> bool:
        """Register a new health check."""
        try:
            self.logger.info(f"Registering health check: {config.name}")
            
            # Store configuration
            self.health_checks[config.name] = config
            
            # Initialize metrics
            self.health_metrics[config.name] = HealthMetrics()
            
            # Create circuit breaker if needed
            if config.failure_threshold > 0:
                cb_config = CircuitBreakerConfig(
                    failure_threshold=config.failure_threshold,
                    recovery_timeout_seconds=config.interval_seconds * 2
                )
                await self._create_circuit_breaker(config.name, cb_config)
            
            # Start monitoring task
            task = asyncio.create_task(self._monitor_endpoint(config))
            self.monitoring_tasks[config.name] = task
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to register health check {config.name}: {e}")
            return False
    
    async def unregister_health_check(self, name: str) -> bool:
        """Unregister a health check."""
        try:
            self.logger.info(f"Unregistering health check: {name}")
            
            # Cancel monitoring task
            if name in self.monitoring_tasks:
                self.monitoring_tasks[name].cancel()
                del self.monitoring_tasks[name]
            
            # Remove from tracking
            self.health_checks.pop(name, None)
            self.health_metrics.pop(name, None)
            self.circuit_breakers.pop(name, None)
            self.circuit_breaker_configs.pop(name, None)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to unregister health check {name}: {e}")
            return False
    
    async def _create_circuit_breaker(self, name: str, config: CircuitBreakerConfig):
        """Create a circuit breaker for an endpoint."""
        try:
            circuit_breaker = CircuitBreaker(
                failure_threshold=config.failure_threshold,
                recovery_timeout=config.recovery_timeout_seconds,
                expected_exception=config.expected_exception
            )
            
            self.circuit_breakers[name] = circuit_breaker
            self.circuit_breaker_configs[name] = config
            
            # Set up circuit breaker callbacks
            circuit_breaker.add_success_listener(
                lambda: self._on_circuit_breaker_success(name)
            )
            circuit_breaker.add_failure_listener(
                lambda exception: self._on_circuit_breaker_failure(name, exception)
            )
            
        except Exception as e:
            self.logger.error(f"Failed to create circuit breaker for {name}: {e}")
    
    def _on_circuit_breaker_success(self, name: str):
        """Handle circuit breaker success event."""
        self.logger.debug(f"Circuit breaker success for {name}")
        self.circuit_breaker_state.labels(endpoint=name).set(0)  # Closed
    
    def _on_circuit_breaker_failure(self, name: str, exception: Exception):
        """Handle circuit breaker failure event."""
        self.logger.warning(f"Circuit breaker failure for {name}: {exception}")
        self.circuit_breaker_state.labels(endpoint=name).set(1)  # Open
        
        # Send alert
        asyncio.create_task(self.alert_manager.send_alert(
            severity="warning",
            title=f"Circuit Breaker Opened: {name}",
            description=f"Circuit breaker opened for {name} due to: {exception}",
            tags={"endpoint": name, "type": "circuit_breaker"}
        ))
    
    async def _monitor_endpoint(self, config: HealthCheckConfig):
        """Monitor a single endpoint continuously."""
        while self.running:
            try:
                # Perform health check
                start_time = time.time()
                health_result = await self._perform_health_check(config)
                duration = time.time() - start_time
                
                # Update metrics
                await self._update_health_metrics(config.name, health_result, duration)
                
                # Record Prometheus metrics
                self.health_check_counter.labels(
                    endpoint=config.name,
                    status='success' if health_result.healthy else 'failure'
                ).inc()
                
                self.health_check_duration.labels(
                    endpoint=config.name
                ).observe(duration)
                
                # Wait for next check
                await asyncio.sleep(config.interval_seconds)
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Error monitoring endpoint {config.name}: {e}")
                await asyncio.sleep(config.interval_seconds)
    
    async def _perform_health_check(self, config: HealthCheckConfig) -> HealthCheck:
        """Perform a single health check."""
        try:
            if config.check_type == HealthCheckType.HTTP:
                return await self._http_health_check(config)
            elif config.check_type == HealthCheckType.TCP:
                return await self._tcp_health_check(config)
            elif config.check_type == HealthCheckType.DATABASE:
                return await self._database_health_check(config)
            elif config.check_type == HealthCheckType.REDIS:
                return await self._redis_health_check(config)
            elif config.check_type == HealthCheckType.CUSTOM:
                return await self._custom_health_check(config)
            else:
                raise ValueError(f"Unsupported health check type: {config.check_type}")
                
        except Exception as e:
            return HealthCheck(
                endpoint=config.name,
                healthy=False,
                response_time_ms=0,
                error_message=str(e),
                timestamp=datetime.utcnow(),
                details={"error": str(e)}
            )
    
    async def _http_health_check(self, config: HealthCheckConfig) -> HealthCheck:
        """Perform HTTP health check."""
        start_time = time.time()
        
        try:
            # Use circuit breaker if configured
            if config.name in self.circuit_breakers:
                circuit_breaker = self.circuit_breakers[config.name]
                
                async def make_request():
                    async with self.http_session.get(
                        config.endpoint,
                        headers=config.custom_headers,
                        timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)
                    ) as response:
                        response_time_ms = (time.time() - start_time) * 1000
                        response_text = await response.text()
                        
                        # Check status code
                        if response.status not in config.expected_status_codes:
                            raise Exception(f"Unexpected status code: {response.status}")
                        
                        # Check response time
                        if response_time_ms > config.expected_response_time_ms:
                            raise Exception(f"Response time too high: {response_time_ms}ms")
                        
                        return HealthCheck(
                            endpoint=config.name,
                            healthy=True,
                            response_time_ms=response_time_ms,
                            timestamp=datetime.utcnow(),
                            details={
                                "status_code": response.status,
                                "response_size": len(response_text),
                                "headers": dict(response.headers)
                            }
                        )
                
                # Execute with circuit breaker protection
                return await circuit_breaker.call(make_request)
            
            else:
                # Direct request without circuit breaker
                async with self.http_session.get(
                    config.endpoint,
                    headers=config.custom_headers,
                    timeout=aiohttp.ClientTimeout(total=config.timeout_seconds)
                ) as response:
                    response_time_ms = (time.time() - start_time) * 1000
                    response_text = await response.text()
                    
                    healthy = (
                        response.status in config.expected_status_codes and
                        response_time_ms <= config.expected_response_time_ms
                    )
                    
                    return HealthCheck(
                        endpoint=config.name,
                        healthy=healthy,
                        response_time_ms=response_time_ms,
                        timestamp=datetime.utcnow(),
                        details={
                            "status_code": response.status,
                            "response_size": len(response_text),
                            "headers": dict(response.headers)
                        }
                    )
        
        except CircuitBreakerError:
            return HealthCheck(
                endpoint=config.name,
                healthy=False,
                response_time_ms=0,
                error_message="Circuit breaker is open",
                timestamp=datetime.utcnow(),
                details={"circuit_breaker": "open"}
            )
        
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            return HealthCheck(
                endpoint=config.name,
                healthy=False,
                response_time_ms=response_time_ms,
                error_message=str(e),
                timestamp=datetime.utcnow(),
                details={"error": str(e)}
            )
    
    async def _tcp_health_check(self, config: HealthCheckConfig) -> HealthCheck:
        """Perform TCP health check."""
        start_time = time.time()
        
        try:
            # Parse endpoint
            if '://' in config.endpoint:
                # Remove protocol if present
                endpoint = config.endpoint.split('://', 1)[1]
            else:
                endpoint = config.endpoint
            
            host, port = endpoint.split(':')
            port = int(port)
            
            # Attempt TCP connection
            reader, writer = await asyncio.wait_for(
                asyncio.open_connection(host, port),
                timeout=config.timeout_seconds
            )
            
            response_time_ms = (time.time() - start_time) * 1000
            
            # Close connection
            writer.close()
            await writer.wait_closed()
            
            return HealthCheck(
                endpoint=config.name,
                healthy=True,
                response_time_ms=response_time_ms,
                timestamp=datetime.utcnow(),
                details={"host": host, "port": port}
            )
            
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            return HealthCheck(
                endpoint=config.name,
                healthy=False,
                response_time_ms=response_time_ms,
                error_message=str(e),
                timestamp=datetime.utcnow(),
                details={"error": str(e)}
            )
    
    async def _database_health_check(self, config: HealthCheckConfig) -> HealthCheck:
        """Perform database health check."""
        # This would implement database-specific health checks
        # For now, return a placeholder
        return HealthCheck(
            endpoint=config.name,
            healthy=True,
            response_time_ms=10.0,
            timestamp=datetime.utcnow(),
            details={"type": "database", "status": "placeholder"}
        )
    
    async def _redis_health_check(self, config: HealthCheckConfig) -> HealthCheck:
        """Perform Redis health check."""
        # This would implement Redis-specific health checks
        # For now, return a placeholder
        return HealthCheck(
            endpoint=config.name,
            healthy=True,
            response_time_ms=5.0,
            timestamp=datetime.utcnow(),
            details={"type": "redis", "status": "placeholder"}
        )
    
    async def _custom_health_check(self, config: HealthCheckConfig) -> HealthCheck:
        """Perform custom health check using provided validator."""
        start_time = time.time()
        
        try:
            if config.custom_validator:
                result = await config.custom_validator(config)
                response_time_ms = (time.time() - start_time) * 1000
                
                if isinstance(result, bool):
                    return HealthCheck(
                        endpoint=config.name,
                        healthy=result,
                        response_time_ms=response_time_ms,
                        timestamp=datetime.utcnow(),
                        details={"type": "custom"}
                    )
                elif isinstance(result, dict):
                    return HealthCheck(
                        endpoint=config.name,
                        healthy=result.get('healthy', False),
                        response_time_ms=response_time_ms,
                        timestamp=datetime.utcnow(),
                        details=result
                    )
            
            raise ValueError("No custom validator provided")
            
        except Exception as e:
            response_time_ms = (time.time() - start_time) * 1000
            return HealthCheck(
                endpoint=config.name,
                healthy=False,
                response_time_ms=response_time_ms,
                error_message=str(e),
                timestamp=datetime.utcnow(),
                details={"error": str(e)}
            )
    
    async def _update_health_metrics(self, name: str, health_result: HealthCheck, duration: float):
        """Update health metrics for an endpoint."""
        try:
            metrics = self.health_metrics[name]
            
            # Update counters
            metrics.total_checks += 1
            
            if health_result.healthy:
                metrics.successful_checks += 1
                metrics.consecutive_successes += 1
                metrics.consecutive_failures = 0
                metrics.last_success = health_result.timestamp
                metrics.current_status = HealthStatus.HEALTHY
            else:
                metrics.failed_checks += 1
                metrics.consecutive_failures += 1
                metrics.consecutive_successes = 0
                metrics.last_failure = health_result.timestamp
                
                # Determine status based on consecutive failures
                config = self.health_checks[name]
                if metrics.consecutive_failures >= config.failure_threshold:
                    metrics.current_status = HealthStatus.UNHEALTHY
                else:
                    metrics.current_status = HealthStatus.DEGRADED
            
            # Update response time (exponential moving average)
            if metrics.average_response_time == 0:
                metrics.average_response_time = health_result.response_time_ms
            else:
                alpha = 0.1  # Smoothing factor
                metrics.average_response_time = (
                    alpha * health_result.response_time_ms + 
                    (1 - alpha) * metrics.average_response_time
                )
            
            # Calculate uptime percentage
            if metrics.total_checks > 0:
                metrics.uptime_percentage = (metrics.successful_checks / metrics.total_checks) * 100
            
            # Update Prometheus metrics
            self.uptime_gauge.labels(endpoint=name).set(metrics.uptime_percentage)
            
            # Send alerts if needed
            await self._check_alert_conditions(name, metrics, health_result)
            
        except Exception as e:
            self.logger.error(f"Failed to update health metrics for {name}: {e}")
    
    async def _check_alert_conditions(self, name: str, metrics: HealthMetrics, health_result: HealthCheck):
        """Check if alert conditions are met."""
        try:
            config = self.health_checks[name]
            
            # Alert on status change to unhealthy
            if (metrics.current_status == HealthStatus.UNHEALTHY and 
                metrics.consecutive_failures == config.failure_threshold):
                
                await self.alert_manager.send_alert(
                    severity="critical",
                    title=f"Endpoint Unhealthy: {name}",
                    description=f"Endpoint {name} has failed {metrics.consecutive_failures} consecutive health checks",
                    tags={
                        "endpoint": name,
                        "type": "health_check",
                        "consecutive_failures": str(metrics.consecutive_failures)
                    }
                )
            
            # Alert on recovery
            elif (metrics.current_status == HealthStatus.HEALTHY and 
                  metrics.consecutive_successes == config.success_threshold and
                  metrics.last_failure and 
                  (datetime.utcnow() - metrics.last_failure).seconds < 300):  # Recent failure
                
                await self.alert_manager.send_alert(
                    severity="info",
                    title=f"Endpoint Recovered: {name}",
                    description=f"Endpoint {name} has recovered after {config.success_threshold} consecutive successful checks",
                    tags={
                        "endpoint": name,
                        "type": "health_check_recovery",
                        "consecutive_successes": str(metrics.consecutive_successes)
                    }
                )
            
            # Alert on high response time
            if health_result.response_time_ms > config.expected_response_time_ms * 2:
                await self.alert_manager.send_alert(
                    severity="warning",
                    title=f"High Response Time: {name}",
                    description=f"Endpoint {name} response time is {health_result.response_time_ms}ms (expected < {config.expected_response_time_ms}ms)",
                    tags={
                        "endpoint": name,
                        "type": "high_response_time",
                        "response_time": str(health_result.response_time_ms)
                    }
                )
        
        except Exception as e:
            self.logger.error(f"Failed to check alert conditions for {name}: {e}")
    
    async def _monitoring_coordinator(self):
        """Coordinate overall monitoring activities."""
        while self.running:
            try:
                await asyncio.sleep(60)  # Run every minute
                
                # Cleanup old metrics
                await self._cleanup_old_metrics()
                
                # Update circuit breaker states
                await self._update_circuit_breaker_metrics()
                
                # Generate health summary
                await self._generate_health_summary()
                
            except Exception as e:
                self.logger.error(f"Monitoring coordinator error: {e}")
                await asyncio.sleep(60)
    
    async def _cleanup_old_metrics(self):
        """Clean up old metrics and data."""
        try:
            # This would implement cleanup of old metric data
            # For now, just log
            self.logger.debug("Performing metrics cleanup")
        except Exception as e:
            self.logger.error(f"Metrics cleanup failed: {e}")
    
    async def _update_circuit_breaker_metrics(self):
        """Update circuit breaker metrics."""
        try:
            for name, circuit_breaker in self.circuit_breakers.items():
                if circuit_breaker.current_state == 'closed':
                    state_value = 0
                elif circuit_breaker.current_state == 'open':
                    state_value = 1
                else:  # half-open
                    state_value = 2
                
                self.circuit_breaker_state.labels(endpoint=name).set(state_value)
        
        except Exception as e:
            self.logger.error(f"Circuit breaker metrics update failed: {e}")
    
    async def _generate_health_summary(self):
        """Generate overall health summary."""
        try:
            total_endpoints = len(self.health_metrics)
            healthy_endpoints = len([m for m in self.health_metrics.values() 
                                   if m.current_status == HealthStatus.HEALTHY])
            
            overall_health_percentage = (healthy_endpoints / total_endpoints * 100) if total_endpoints > 0 else 100
            
            self.logger.debug(f"Health summary: {healthy_endpoints}/{total_endpoints} endpoints healthy ({overall_health_percentage:.1f}%)")
            
        except Exception as e:
            self.logger.error(f"Health summary generation failed: {e}")
    
    async def get_health_status(self, endpoint_name: Optional[str] = None) -> Dict[str, Any]:
        """Get health status for specific endpoint or all endpoints."""
        try:
            if endpoint_name:
                if endpoint_name not in self.health_metrics:
                    return {"error": f"Endpoint {endpoint_name} not found"}
                
                metrics = self.health_metrics[endpoint_name]
                return {
                    "endpoint": endpoint_name,
                    "status": metrics.current_status.value,
                    "uptime_percentage": metrics.uptime_percentage,
                    "total_checks": metrics.total_checks,
                    "successful_checks": metrics.successful_checks,
                    "failed_checks": metrics.failed_checks,
                    "average_response_time": metrics.average_response_time,
                    "consecutive_failures": metrics.consecutive_failures,
                    "consecutive_successes": metrics.consecutive_successes,
                    "last_success": metrics.last_success.isoformat() if metrics.last_success else None,
                    "last_failure": metrics.last_failure.isoformat() if metrics.last_failure else None
                }
            
            else:
                # Return summary for all endpoints
                summary = {
                    "total_endpoints": len(self.health_metrics),
                    "healthy_endpoints": 0,
                    "degraded_endpoints": 0,
                    "unhealthy_endpoints": 0,
                    "endpoints": {}
                }
                
                for name, metrics in self.health_metrics.items():
                    if metrics.current_status == HealthStatus.HEALTHY:
                        summary["healthy_endpoints"] += 1
                    elif metrics.current_status == HealthStatus.DEGRADED:
                        summary["degraded_endpoints"] += 1
                    elif metrics.current_status == HealthStatus.UNHEALTHY:
                        summary["unhealthy_endpoints"] += 1
                    
                    summary["endpoints"][name] = {
                        "status": metrics.current_status.value,
                        "uptime_percentage": metrics.uptime_percentage,
                        "average_response_time": metrics.average_response_time
                    }
                
                return summary
        
        except Exception as e:
            self.logger.error(f"Failed to get health status: {e}")
            return {"error": str(e)}