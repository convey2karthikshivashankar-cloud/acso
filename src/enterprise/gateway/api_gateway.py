"""
Enterprise API Gateway for ACSO.
Provides rate limiting, authentication, versioning, and routing.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass
from enum import Enum
import json
import time
import hashlib

from fastapi import FastAPI, Request, Response, HTTPException, Depends
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import redis
import prometheus_client

from .rate_limiter import RateLimiter
from .auth_middleware import AuthMiddleware
from .version_manager import APIVersionManager
from ..auth.auth_service import AuthService


class APIGatewayConfig:
    """Configuration for the API Gateway."""
    
    def __init__(self):
        self.rate_limits = {
            'default': {'requests': 1000, 'window': 3600},  # 1000 req/hour
            'premium': {'requests': 5000, 'window': 3600},   # 5000 req/hour
            'enterprise': {'requests': 20000, 'window': 3600} # 20000 req/hour
        }
        
        self.cors_origins = [
            "https://*.acso.com",
            "https://localhost:3000",
            "https://localhost:8000"
        ]
        
        self.trusted_hosts = [
            "*.acso.com",
            "localhost",
            "127.0.0.1"
        ]
        
        self.api_versions = ['v1', 'v2']
        self.default_version = 'v2'


class EnterpriseAPIGateway:
    """
    Enterprise-grade API Gateway with comprehensive features:
    - Rate limiting per tenant/user
    - Authentication and authorization
    - API versioning and backward compatibility
    - Request/response transformation
    - Monitoring and analytics
    - Circuit breaker patterns
    """
    
    def __init__(self, config: APIGatewayConfig):
        self.config = config
        self.logger = logging.getLogger(__name__)
        
        # Initialize components
        self.rate_limiter = RateLimiter()
        self.auth_middleware = AuthMiddleware()
        self.version_manager = APIVersionManager()
        self.auth_service = AuthService()
        
        # FastAPI app
        self.app = FastAPI(
            title="ACSO Enterprise API Gateway",
            description="Enterprise-grade API Gateway for ACSO",
            version="2.0.0"
        )
        
        # Middleware setup
        self._setup_middleware()
        
        # Route handlers
        self.route_handlers: Dict[str, Callable] = {}
        
        # Metrics
        self._setup_metrics()
        
    async def initialize(self) -> None:
        """Initialize the API Gateway."""
        try:
            self.logger.info("Initializing Enterprise API Gateway")
            
            await self.rate_limiter.initialize()
            await self.auth_middleware.initialize()
            await self.version_manager.initialize()
            await self.auth_service.initialize()
            
            self._setup_routes()
            
            self.logger.info("Enterprise API Gateway initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize API Gateway: {e}")
            raise       
     
    async def shutdown(self) -> None:
        """Shutdown the API Gateway."""
        try:
            self.logger.info("Shutting down Enterprise API Gateway")
            
            await self.auth_service.shutdown()
            await self.version_manager.shutdown()
            await self.auth_middleware.shutdown()
            await self.rate_limiter.shutdown()
            
            self.logger.info("Enterprise API Gateway shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    def _setup_middleware(self) -> None:
        """Setup middleware stack."""
        # CORS middleware
        self.app.add_middleware(
            CORSMiddleware,
            allow_origins=self.config.cors_origins,
            allow_credentials=True,
            allow_methods=["*"],
            allow_headers=["*"],
        )
        
        # Trusted host middleware
        self.app.add_middleware(
            TrustedHostMiddleware,
            allowed_hosts=self.config.trusted_hosts
        )
        
        # Custom middleware
        self.app.middleware("http")(self._request_middleware)
        
    async def _request_middleware(self, request: Request, call_next):
        """Main request processing middleware."""
        start_time = time.time()
        
        try:
            # Extract tenant/user info
            tenant_id = await self._extract_tenant_id(request)
            user_id = await self._extract_user_id(request)
            
            # Rate limiting
            await self._check_rate_limits(request, tenant_id, user_id)
            
            # Authentication
            auth_result = await self._authenticate_request(request)
            
            # Authorization
            await self._authorize_request(request, auth_result)
            
            # API versioning
            version = await self._determine_api_version(request)
            request.state.api_version = version
            
            # Process request
            response = await call_next(request)
            
            # Response transformation
            response = await self._transform_response(request, response)
            
            # Metrics
            self._record_metrics(request, response, time.time() - start_time)
            
            return response
            
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Request processing error: {e}")
            raise HTTPException(status_code=500, detail="Internal server error")
            
    def _setup_routes(self) -> None:
        """Setup API routes."""
        
        @self.app.get("/health")
        async def health_check():
            """Health check endpoint."""
            return {"status": "healthy", "timestamp": datetime.utcnow().isoformat()}
            
        @self.app.get("/metrics")
        async def metrics():
            """Prometheus metrics endpoint."""
            return Response(
                prometheus_client.generate_latest(),
                media_type="text/plain"
            )
            
        @self.app.get("/api/{version}/status")
        async def api_status(version: str, request: Request):
            """API status endpoint."""
            return {
                "version": version,
                "status": "operational",
                "features": await self._get_version_features(version)
            }
            
    def _setup_metrics(self) -> None:
        """Setup Prometheus metrics."""
        self.request_counter = prometheus_client.Counter(
            'acso_api_requests_total',
            'Total API requests',
            ['method', 'endpoint', 'status_code', 'tenant_id']
        )
        
        self.request_duration = prometheus_client.Histogram(
            'acso_api_request_duration_seconds',
            'API request duration',
            ['method', 'endpoint', 'tenant_id']
        )
        
        self.rate_limit_counter = prometheus_client.Counter(
            'acso_api_rate_limits_total',
            'Total rate limit violations',
            ['tenant_id', 'limit_type']
        )
        
    async def _extract_tenant_id(self, request: Request) -> Optional[str]:
        """Extract tenant ID from request."""
        # Check header
        tenant_id = request.headers.get('X-Tenant-ID')
        if tenant_id:
            return tenant_id
            
        # Check subdomain
        host = request.headers.get('host', '')
        if '.' in host:
            subdomain = host.split('.')[0]
            if subdomain != 'api' and subdomain != 'www':
                return subdomain
                
        return None
        
    async def _extract_user_id(self, request: Request) -> Optional[str]:
        """Extract user ID from request."""
        auth_header = request.headers.get('Authorization')
        if auth_header and auth_header.startswith('Bearer '):
            token = auth_header[7:]
            # Decode token to get user ID
            user_info = await self.auth_service.decode_token(token)
            return user_info.get('user_id') if user_info else None
            
        return None
        
    async def _check_rate_limits(self, request: Request, tenant_id: Optional[str], user_id: Optional[str]) -> None:
        """Check rate limits for the request."""
        try:
            # Determine rate limit tier
            tier = await self._get_rate_limit_tier(tenant_id)
            
            # Check tenant-level rate limit
            if tenant_id:
                tenant_key = f"tenant:{tenant_id}"
                if not await self.rate_limiter.check_limit(tenant_key, tier):
                    self.rate_limit_counter.labels(
                        tenant_id=tenant_id or 'unknown',
                        limit_type='tenant'
                    ).inc()
                    raise HTTPException(status_code=429, detail="Tenant rate limit exceeded")
            
            # Check user-level rate limit
            if user_id:
                user_key = f"user:{user_id}"
                user_tier = self._get_user_rate_limit_tier(tier)
                if not await self.rate_limiter.check_limit(user_key, user_tier):
                    self.rate_limit_counter.labels(
                        tenant_id=tenant_id or 'unknown',
                        limit_type='user'
                    ).inc()
                    raise HTTPException(status_code=429, detail="User rate limit exceeded")
                    
        except HTTPException:
            raise
        except Exception as e:
            self.logger.error(f"Rate limit check error: {e}")
            # Allow request on rate limit check failure
            
    async def _authenticate_request(self, request: Request) -> Dict[str, Any]:
        """Authenticate the request."""
        try:
            return await self.auth_middleware.authenticate(request)
        except Exception as e:
            self.logger.error(f"Authentication error: {e}")
            raise HTTPException(status_code=401, detail="Authentication failed")
            
    async def _authorize_request(self, request: Request, auth_result: Dict[str, Any]) -> None:
        """Authorize the request."""
        try:
            await self.auth_middleware.authorize(request, auth_result)
        except Exception as e:
            self.logger.error(f"Authorization error: {e}")
            raise HTTPException(status_code=403, detail="Authorization failed")
            
    async def _determine_api_version(self, request: Request) -> str:
        """Determine API version for the request."""
        # Check header
        version = request.headers.get('X-API-Version')
        if version and version in self.config.api_versions:
            return version
            
        # Check path
        path_parts = request.url.path.split('/')
        if len(path_parts) >= 3 and path_parts[1] == 'api':
            version = path_parts[2]
            if version in self.config.api_versions:
                return version
                
        return self.config.default_version
        
    async def _transform_response(self, request: Request, response: Response) -> Response:
        """Transform response based on API version and other factors."""
        version = getattr(request.state, 'api_version', self.config.default_version)
        
        # Apply version-specific transformations
        if hasattr(response, 'body') and response.body:
            try:
                body = json.loads(response.body)
                transformed_body = await self.version_manager.transform_response(body, version)
                response.body = json.dumps(transformed_body).encode()
            except (json.JSONDecodeError, AttributeError):
                # Skip transformation for non-JSON responses
                pass
                
        # Add standard headers
        response.headers['X-API-Version'] = version
        response.headers['X-Request-ID'] = request.headers.get('X-Request-ID', 'unknown')
        response.headers['X-RateLimit-Remaining'] = str(await self._get_remaining_requests(request))
        
        return response
        
    def _record_metrics(self, request: Request, response: Response, duration: float) -> None:
        """Record request metrics."""
        try:
            tenant_id = getattr(request.state, 'tenant_id', 'unknown')
            
            self.request_counter.labels(
                method=request.method,
                endpoint=request.url.path,
                status_code=response.status_code,
                tenant_id=tenant_id
            ).inc()
            
            self.request_duration.labels(
                method=request.method,
                endpoint=request.url.path,
                tenant_id=tenant_id
            ).observe(duration)
            
        except Exception as e:
            self.logger.error(f"Metrics recording error: {e}")
            
    async def _get_rate_limit_tier(self, tenant_id: Optional[str]) -> str:
        """Get rate limit tier for tenant."""
        if not tenant_id:
            return 'default'
            
        # This would query tenant configuration
        # For now, return default
        return 'default'
        
    def _get_user_rate_limit_tier(self, tenant_tier: str) -> str:
        """Get user rate limit tier based on tenant tier."""
        # User limits are typically lower than tenant limits
        user_limits = {
            'default': 'default',
            'premium': 'default', 
            'enterprise': 'premium'
        }
        return user_limits.get(tenant_tier, 'default')
        
    async def _get_version_features(self, version: str) -> List[str]:
        """Get available features for API version."""
        return await self.version_manager.get_version_features(version)
        
    async def _get_remaining_requests(self, request: Request) -> int:
        """Get remaining requests for rate limit."""
        tenant_id = getattr(request.state, 'tenant_id', None)
        if tenant_id:
            return await self.rate_limiter.get_remaining_requests(f"tenant:{tenant_id}")
        return 1000  # Default
        
    def register_route_handler(self, path: str, handler: Callable) -> None:
        """Register a route handler."""
        self.route_handlers[path] = handler
        
    def get_app(self) -> FastAPI:
        """Get the FastAPI application."""
        return self.app