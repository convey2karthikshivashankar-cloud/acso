"""
Enterprise API Gateway

High-performance, scalable API gateway with comprehensive enterprise features
including rate limiting, authentication, monitoring, and multi-tenant routing.
"""

import asyncio
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
import json
import hashlib

from fastapi import FastAPI, Request, Response, HTTPException
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse

from .rate_limiter import RateLimiter
from .auth_manager import AuthenticationManager
from .version_manager import APIVersionManager


class RequestPriority(str, Enum):
    """Request priority levels."""
    LOW = "low"
    NORMAL = "normal"
    HIGH = "high"
    CRITICAL = "critical"


class GatewayMetrics:
    """Gateway metrics tracking."""
    
    def __init__(self):
        self.request_count = 0
        self.error_count = 0
        self.total_response_time = 0.0
        self.active_connections = 0
        self.rate_limited_requests = 0
        self.authenticated_requests = 0
        self.tenant_request_counts: Dict[str, int] = {}
        self.endpoint_metrics: Dict[str, Dict[str, Any]] = {}
        
    def record_request(
        self,
        tenant_id: str,
        endpoint: str,
        method: str,
        response_time: float,
        status_code: int
    ):
        """Record request metrics."""
        self.request_count += 1
        self.total_response_time += response_time
        
        if status_code >= 400:
            self.error_count += 1
            
        # Track per-tenant metrics
        if tenant_id not in self.tenant_request_counts:
            self.tenant_request_counts[tenant_id] = 0
        self.tenant_request_counts[tenant_id] += 1
        
        # Track per-endpoint metrics
        endpoint_key = f"{method}:{endpoint}"
        if endpoint_key not in self.endpoint_metrics:
            self.endpoint_metrics[endpoint_key] = {
                'count': 0,
                'total_time': 0.0,
                'error_count': 0
            }
            
        endpoint_metrics = self.endpoint_metrics[endpoint_key]
        endpoint_metrics['count'] += 1
        endpoint_metrics['total_time'] += response_time
        
        if status_code >= 400:
            endpoint_metrics['error_count'] += 1
            
    def get_summary(self) -> Dict[str, Any]:
        """Get metrics summary."""
        avg_response_time = (
            self.total_response_time / self.request_count 
            if self.request_count > 0 else 0.0
        )
        
        error_rate = (
            self.error_count / self.request_count 
            if self.request_count > 0 else 0.0
        )
        
        return {
            'total_requests': self.request_count,
            'error_count': self.error_count,
            'error_rate': error_rate,
            'average_response_time_ms': avg_response_time * 1000,
            'active_connections': self.active_connections,
            'rate_limited_requests': self.rate_limited_requests,
            'authenticated_requests': self.authenticated_requests,
            'tenant_distribution': self.tenant_request_counts,
            'top_endpoints': self._get_top_endpoints()
        }
        
    def _get_top_endpoints(self, limit: int = 10) -> List[Dict[str, Any]]:
        """Get top endpoints by request count."""
        sorted_endpoints = sorted(
            self.endpoint_metrics.items(),
            key=lambda x: x[1]['count'],
            reverse=True
        )
        
        return [
            {
                'endpoint': endpoint,
                'count': metrics['count'],
                'avg_response_time_ms': (metrics['total_time'] / metrics['count']) * 1000,
                'error_rate': metrics['error_count'] / metrics['count']
            }
            for endpoint, metrics in sorted_endpoints[:limit]
        ]


class EnterpriseAPIGateway:
    """
    Enterprise-grade API gateway with comprehensive features.
    
    Provides:
    - Multi-tenant request routing
    - Rate limiting and throttling
    - Authentication and authorization
    - API versioning and backward compatibility
    - Comprehensive monitoring and analytics
    - Circuit breaker and fault tolerance
    """
    
    def __init__(self, app: FastAPI):
        self.app = app
        self.rate_limiter = RateLimiter()
        self.auth_manager = AuthenticationManager()
        self.version_manager = APIVersionManager()
        
        # Gateway state
        self.metrics = GatewayMetrics()
        self.circuit_breakers: Dict[str, Dict[str, Any]] = {}
        self.tenant_routing: Dict[str, str] = {}
        
        # Configuration
        self.max_request_size = 10 * 1024 * 1024  # 10MB
        self.request_timeout = 30.0  # 30 seconds
        self.enable_compression = True
        
        self.logger = logging.getLogger(__name__)
        
    async def initialize(self) -> None:
        """Initialize the API gateway."""
        try:
            self.logger.info("Initializing Enterprise API Gateway")
            
            # Initialize components
            await self.rate_limiter.initialize()
            await self.auth_manager.initialize()
            await self.version_manager.initialize()
            
            # Add middleware to FastAPI app
            self._add_middleware()
            
            # Start background tasks
            asyncio.create_task(self._monitor_circuit_breakers())
            asyncio.create_task(self._cleanup_metrics())
            
            self.logger.info("Enterprise API Gateway initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize API Gateway: {e}")
            raise
            
    def _add_middleware(self) -> None:
        """Add enterprise middleware to the FastAPI application."""
        # Add custom middleware in reverse order (last added = first executed)
        
        # Metrics middleware (last to capture all data)
        self.app.add_middleware(
            BaseHTTPMiddleware,
            dispatch=self._metrics_middleware
        )
        
        # Circuit breaker middleware
        self.app.add_middleware(
            BaseHTTPMiddleware,
            dispatch=self._circuit_breaker_middleware
        )
        
        # Rate limiting middleware
        self.app.add_middleware(
            BaseHTTPMiddleware,
            dispatch=self._rate_limiting_middleware
        )
        
        # Authentication middleware
        self.app.add_middleware(
            BaseHTTPMiddleware,
            dispatch=self._authentication_middleware
        )
        
        # Tenant routing middleware
        self.app.add_middleware(
            BaseHTTPMiddleware,
            dispatch=self._tenant_routing_middleware
        )
        
        # Request validation middleware (first to validate early)
        self.app.add_middleware(
            BaseHTTPMiddleware,
            dispatch=self._request_validation_middleware
        )
        
    async def _request_validation_middleware(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """Validate incoming requests."""
        try:
            # Check request size
            content_length = request.headers.get('content-length')
            if content_length and int(content_length) > self.max_request_size:
                return JSONResponse(
                    status_code=413,
                    content={'error': 'Request too large', 'max_size': self.max_request_size}
                )
                
            # Validate content type for POST/PUT requests
            if request.method in ['POST', 'PUT', 'PATCH']:
                content_type = request.headers.get('content-type', '')
                if not content_type.startswith(('application/json', 'multipart/form-data')):
                    return JSONResponse(
                        status_code=415,
                        content={'error': 'Unsupported media type'}
                    )
                    
            response = await call_next(request)
            return response
            
        except Exception as e:
            self.logger.error(f"Request validation error: {e}")
            return JSONResponse(
                status_code=500,
                content={'error': 'Internal server error'}
            )
            
    async def _tenant_routing_middleware(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """Route requests to appropriate tenant context."""
        try:
            # Extract tenant ID from request
            tenant_id = await self._extract_tenant_id(request)
            
            if tenant_id:
                # Add tenant context to request state
                request.state.tenant_id = tenant_id
                
                # Check if tenant exists and is active
                tenant_valid = await self._validate_tenant(tenant_id)
                if not tenant_valid:
                    return JSONResponse(
                        status_code=404,
                        content={'error': 'Tenant not found or inactive'}
                    )
                    
            response = await call_next(request)
            return response
            
        except Exception as e:
            self.logger.error(f"Tenant routing error: {e}")
            return JSONResponse(
                status_code=500,
                content={'error': 'Routing error'}
            )
            
    async def _authentication_middleware(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """Handle authentication and authorization."""
        try:
            # Skip auth for health checks and public endpoints
            if request.url.path in ['/health', '/ready', '/metrics', '/']:
                response = await call_next(request)
                return response
                
            # Authenticate request
            auth_result = await self.auth_manager.authenticate_request(request)
            
            if not auth_result.get('authenticated', False):
                return JSONResponse(
                    status_code=401,
                    content={'error': 'Authentication required'}
                )
                
            # Add user context to request
            request.state.user_id = auth_result.get('user_id')
            request.state.user_roles = auth_result.get('roles', [])
            request.state.permissions = auth_result.get('permissions', [])
            
            # Track authenticated request
            self.metrics.authenticated_requests += 1
            
            response = await call_next(request)
            return response
            
        except Exception as e:
            self.logger.error(f"Authentication error: {e}")
            return JSONResponse(
                status_code=401,
                content={'error': 'Authentication failed'}
            )
            
    async def _rate_limiting_middleware(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """Apply rate limiting based on tenant and user."""
        try:
            # Get rate limiting key
            tenant_id = getattr(request.state, 'tenant_id', 'default')
            user_id = getattr(request.state, 'user_id', 'anonymous')
            rate_key = f"{tenant_id}:{user_id}"
            
            # Check rate limit
            rate_limit_result = await self.rate_limiter.check_rate_limit(
                rate_key, request.url.path, request.method
            )
            
            if not rate_limit_result.get('allowed', True):
                self.metrics.rate_limited_requests += 1
                
                return JSONResponse(
                    status_code=429,
                    content={
                        'error': 'Rate limit exceeded',
                        'retry_after': rate_limit_result.get('retry_after', 60)
                    },
                    headers={
                        'Retry-After': str(rate_limit_result.get('retry_after', 60)),
                        'X-RateLimit-Limit': str(rate_limit_result.get('limit', 100)),
                        'X-RateLimit-Remaining': str(rate_limit_result.get('remaining', 0)),
                        'X-RateLimit-Reset': str(rate_limit_result.get('reset_time', int(time.time()) + 60))
                    }
                )
                
            response = await call_next(request)
            
            # Add rate limit headers to response
            response.headers['X-RateLimit-Limit'] = str(rate_limit_result.get('limit', 100))
            response.headers['X-RateLimit-Remaining'] = str(rate_limit_result.get('remaining', 0))
            response.headers['X-RateLimit-Reset'] = str(rate_limit_result.get('reset_time', int(time.time()) + 60))
            
            return response
            
        except Exception as e:
            self.logger.error(f"Rate limiting error: {e}")
            response = await call_next(request)
            return response
            
    async def _circuit_breaker_middleware(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """Apply circuit breaker pattern for fault tolerance."""
        try:
            endpoint_key = f"{request.method}:{request.url.path}"
            
            # Check circuit breaker status
            circuit_status = self.circuit_breakers.get(endpoint_key, {
                'state': 'closed',
                'failure_count': 0,
                'last_failure': None,
                'success_count': 0
            })
            
            # If circuit is open, check if we should try again
            if circuit_status['state'] == 'open':
                if self._should_attempt_reset(circuit_status):
                    circuit_status['state'] = 'half_open'
                else:
                    return JSONResponse(
                        status_code=503,
                        content={'error': 'Service temporarily unavailable'}
                    )
                    
            start_time = time.time()
            
            try:
                response = await call_next(request)
                response_time = time.time() - start_time
                
                # Record success
                await self._record_circuit_success(endpoint_key, response_time)
                
                return response
                
            except Exception as e:
                response_time = time.time() - start_time
                
                # Record failure
                await self._record_circuit_failure(endpoint_key, str(e), response_time)
                
                raise
                
        except Exception as e:
            self.logger.error(f"Circuit breaker error: {e}")
            return JSONResponse(
                status_code=500,
                content={'error': 'Internal server error'}
            )
            
    async def _metrics_middleware(
        self,
        request: Request,
        call_next: Callable
    ) -> Response:
        """Collect comprehensive request metrics."""
        start_time = time.time()
        
        try:
            # Increment active connections
            self.metrics.active_connections += 1
            
            # Process request
            response = await call_next(request)
            
            # Calculate response time
            response_time = time.time() - start_time
            
            # Extract context
            tenant_id = getattr(request.state, 'tenant_id', 'default')
            endpoint = request.url.path
            method = request.method
            status_code = response.status_code
            
            # Record metrics
            self.metrics.record_request(
                tenant_id, endpoint, method, response_time, status_code
            )
            
            # Add performance headers
            response.headers['X-Response-Time'] = f"{response_time:.3f}s"
            response.headers['X-Request-ID'] = str(uuid.uuid4())
            
            return response
            
        except Exception as e:
            response_time = time.time() - start_time
            self.logger.error(f"Metrics middleware error: {e}")
            
            # Still record the failed request
            tenant_id = getattr(request.state, 'tenant_id', 'default')
            self.metrics.record_request(
                tenant_id, request.url.path, request.method, response_time, 500
            )
            
            return JSONResponse(
                status_code=500,
                content={'error': 'Internal server error'}
            )
        finally:
            # Decrement active connections
            self.metrics.active_connections -= 1
            
    async def _extract_tenant_id(self, request: Request) -> Optional[str]:
        """Extract tenant ID from request."""
        # Try multiple methods to extract tenant ID
        
        # 1. From subdomain (e.g., tenant1.acso.com)
        host = request.headers.get('host', '')
        if '.' in host:
            subdomain = host.split('.')[0]
            if subdomain != 'www' and subdomain != 'api':
                return subdomain
                
        # 2. From custom header
        tenant_header = request.headers.get('X-Tenant-ID')
        if tenant_header:
            return tenant_header
            
        # 3. From path prefix (e.g., /tenant/tenant1/api/...)
        path_parts = request.url.path.strip('/').split('/')
        if len(path_parts) >= 2 and path_parts[0] == 'tenant':
            return path_parts[1]
            
        # 4. From JWT token
        auth_header = request.headers.get('authorization', '')
        if auth_header.startswith('Bearer '):
            token = auth_header[7:]
            tenant_from_token = await self.auth_manager.extract_tenant_from_token(token)
            if tenant_from_token:
                return tenant_from_token
                
        return None
        
    async def _validate_tenant(self, tenant_id: str) -> bool:
        """Validate that tenant exists and is active."""
        # This would integrate with tenant management system
        # For now, assume all tenants are valid
        return True
        
    def _should_attempt_reset(self, circuit_status: Dict[str, Any]) -> bool:
        """Check if circuit breaker should attempt reset."""
        if not circuit_status.get('last_failure'):
            return True
            
        time_since_failure = time.time() - circuit_status['last_failure']
        return time_since_failure > 60  # 60 second timeout
        
    async def _record_circuit_success(self, endpoint_key: str, response_time: float) -> None:
        """Record successful request for circuit breaker."""
        if endpoint_key not in self.circuit_breakers:
            self.circuit_breakers[endpoint_key] = {
                'state': 'closed',
                'failure_count': 0,
                'last_failure': None,
                'success_count': 0
            }
            
        circuit = self.circuit_breakers[endpoint_key]
        
        if circuit['state'] == 'half_open':
            circuit['success_count'] += 1
            if circuit['success_count'] >= 3:  # 3 successful requests to close
                circuit['state'] = 'closed'
                circuit['failure_count'] = 0
                circuit['success_count'] = 0
        elif circuit['state'] == 'closed':
            circuit['failure_count'] = 0  # Reset failure count on success
            
    async def _record_circuit_failure(self, endpoint_key: str, error: str, response_time: float) -> None:
        """Record failed request for circuit breaker."""
        if endpoint_key not in self.circuit_breakers:
            self.circuit_breakers[endpoint_key] = {
                'state': 'closed',
                'failure_count': 0,
                'last_failure': None,
                'success_count': 0
            }
            
        circuit = self.circuit_breakers[endpoint_key]
        circuit['failure_count'] += 1
        circuit['last_failure'] = time.time()
        
        # Open circuit if failure threshold reached
        if circuit['failure_count'] >= 5:  # 5 failures to open
            circuit['state'] = 'open'
            circuit['success_count'] = 0
            
    async def _monitor_circuit_breakers(self) -> None:
        """Background task to monitor circuit breaker health."""
        while True:
            try:
                current_time = time.time()
                
                # Check for circuits that should be reset
                for endpoint_key, circuit in self.circuit_breakers.items():
                    if (circuit['state'] == 'open' and 
                        circuit.get('last_failure') and
                        current_time - circuit['last_failure'] > 300):  # 5 minutes
                        
                        # Reset circuit to half-open for testing
                        circuit['state'] = 'half_open'
                        circuit['success_count'] = 0
                        
                        self.logger.info(f"Circuit breaker for {endpoint_key} reset to half-open")
                        
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Error in circuit breaker monitoring: {e}")
                await asyncio.sleep(120)
                
    async def _cleanup_metrics(self) -> None:
        """Background task to cleanup old metrics data."""
        while True:
            try:
                # Reset metrics periodically to prevent memory growth
                # In production, this would archive metrics to persistent storage
                
                await asyncio.sleep(3600)  # Run every hour
                
                # Archive current metrics
                await self._archive_metrics()
                
                # Reset counters (keep running totals in persistent storage)
                self.metrics = GatewayMetrics()
                
            except Exception as e:
                self.logger.error(f"Error in metrics cleanup: {e}")
                await asyncio.sleep(1800)
                
    async def _archive_metrics(self) -> None:
        """Archive current metrics to persistent storage."""
        # This would save metrics to database or time-series store
        # For now, just log summary
        summary = self.metrics.get_summary()
        self.logger.info(f"Archiving metrics: {summary}")
        
    async def get_gateway_status(self) -> Dict[str, Any]:
        """Get comprehensive gateway status."""
        return {
            'status': 'healthy',
            'uptime': time.time(),  # Would track actual uptime
            'metrics': self.metrics.get_summary(),
            'circuit_breakers': {
                endpoint: {
                    'state': circuit['state'],
                    'failure_count': circuit['failure_count'],
                    'last_failure': circuit.get('last_failure')
                }
                for endpoint, circuit in self.circuit_breakers.items()
            },
            'components': {
                'rate_limiter': 'healthy',
                'auth_manager': 'healthy',
                'version_manager': 'healthy'
            }
        }
        
    async def configure_tenant_routing(
        self,
        tenant_id: str,
        routing_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Configure custom routing for a tenant."""
        try:
            # Store routing configuration
            self.tenant_routing[tenant_id] = routing_config.get('backend_url', '')
            
            return {
                'success': True,
                'tenant_id': tenant_id,
                'routing_configured': True
            }
            
        except Exception as e:
            self.logger.error(f"Failed to configure routing for tenant {tenant_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'tenant_id': tenant_id
            }