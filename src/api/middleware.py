"""
Enhanced middleware for ACSO API Gateway.
"""

import time
import uuid
import json
import logging
from typing import Dict, Any, Optional
from fastapi import Request, Response, HTTPException
from fastapi.middleware.base import BaseHTTPMiddleware
from fastapi.responses import JSONResponse
from starlette.middleware.base import RequestResponseEndpoint
from starlette.status import HTTP_429_TOO_MANY_REQUESTS, HTTP_500_INTERNAL_SERVER_ERROR

from .config import settings

logger = logging.getLogger(__name__)

class SecurityMiddleware(BaseHTTPMiddleware):
    """Enhanced security middleware for API requests."""
    
    def __init__(self, app):
        super().__init__(app)
        self.blocked_ips = set()
        self.suspicious_patterns = [
            "script", "javascript:", "vbscript:", "onload", "onerror",
            "../", "..\\", "union", "select", "drop", "delete", "insert"
        ]
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Security checks
        if not await self._security_checks(request):
            return JSONResponse(
                status_code=403,
                content={
                    "success": False,
                    "error": {
                        "code": "SECURITY_VIOLATION",
                        "message": "Request blocked by security policy",
                        "timestamp": time.time()
                    }
                }
            )
        
        # Process request
        response = await call_next(request)
        
        # Add comprehensive security headers
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Strict-Transport-Security": "max-age=31536000; includeSubDomains; preload",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "X-Permitted-Cross-Domain-Policies": "none",
            "X-Download-Options": "noopen",
            "Content-Security-Policy": (
                "default-src 'self'; "
                "script-src 'self' 'unsafe-inline' 'unsafe-eval'; "
                "style-src 'self' 'unsafe-inline'; "
                "img-src 'self' data: https:; "
                "connect-src 'self' ws: wss:; "
                "font-src 'self'; "
                "object-src 'none'; "
                "media-src 'self'; "
                "frame-src 'none'; "
                "base-uri 'self'; "
                "form-action 'self';"
            ),
            "Permissions-Policy": (
                "geolocation=(), microphone=(), camera=(), "
                "payment=(), usb=(), magnetometer=(), gyroscope=(), "
                "accelerometer=(), ambient-light-sensor=()"
            )
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
        
        # Remove server information
        if "server" in response.headers:
            del response.headers["server"]
        
        return response
    
    async def _security_checks(self, request: Request) -> bool:
        """Perform security checks on the request."""
        client_ip = self._get_client_ip(request)
        
        # Check blocked IPs
        if client_ip in self.blocked_ips:
            logger.warning(f"Blocked IP attempted access: {client_ip}")
            return False
        
        # Check for suspicious patterns in URL
        url_path = str(request.url.path).lower()
        query_params = str(request.url.query).lower()
        
        for pattern in self.suspicious_patterns:
            if pattern in url_path or pattern in query_params:
                logger.warning(f"Suspicious pattern detected from {client_ip}: {pattern}")
                self._add_to_blocked_ips(client_ip)
                return False
        
        # Check request size
        content_length = request.headers.get("content-length")
        if content_length and int(content_length) > 10 * 1024 * 1024:  # 10MB limit
            logger.warning(f"Large request blocked from {client_ip}: {content_length} bytes")
            return False
        
        return True
    
    def _get_client_ip(self, request: Request) -> str:
        """Get the real client IP address."""
        # Check for forwarded headers
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _add_to_blocked_ips(self, ip: str):
        """Add IP to blocked list."""
        self.blocked_ips.add(ip)
        logger.info(f"Added {ip} to blocked IPs list")

class LoggingMiddleware(BaseHTTPMiddleware):
    """Enhanced logging middleware for API requests."""
    
    def __init__(self, app):
        super().__init__(app)
        self.sensitive_headers = {
            "authorization", "cookie", "x-api-key", "x-auth-token"
        }
        self.sensitive_params = {
            "password", "token", "secret", "key", "auth"
        }
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Generate request ID
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # Get client information
        client_ip = self._get_client_ip(request)
        user_agent = request.headers.get("user-agent", "unknown")
        
        # Prepare request log data
        request_data = {
            "request_id": request_id,
            "method": request.method,
            "path": request.url.path,
            "query_params": self._sanitize_params(dict(request.query_params)),
            "client_ip": client_ip,
            "user_agent": user_agent,
            "headers": self._sanitize_headers(dict(request.headers)),
            "timestamp": time.time()
        }
        
        # Log request
        start_time = time.time()
        if settings.logging.json_format:
            logger.info(json.dumps({
                "event": "request_started",
                **request_data
            }))
        else:
            logger.info(
                f"Request started: {request.method} {request.url.path} "
                f"[{request_id}] from {client_ip}"
            )
        
        # Process request
        try:
            response = await call_next(request)
            
            # Calculate processing time
            process_time = time.time() - start_time
            
            # Add headers to response
            response.headers["X-Request-ID"] = request_id
            response.headers["X-Process-Time"] = f"{process_time:.3f}"
            
            # Prepare response log data
            response_data = {
                "request_id": request_id,
                "status_code": response.status_code,
                "process_time": process_time,
                "response_size": len(response.body) if hasattr(response, 'body') else 0
            }
            
            # Log response
            if settings.logging.json_format:
                logger.info(json.dumps({
                    "event": "request_completed",
                    **request_data,
                    **response_data
                }))
            else:
                logger.info(
                    f"Request completed: {request.method} {request.url.path} "
                    f"[{request_id}] {response.status_code} in {process_time:.3f}s"
                )
            
            # Log slow requests
            if process_time > settings.monitoring.slow_query_threshold:
                logger.warning(
                    f"Slow request detected: {request.method} {request.url.path} "
                    f"[{request_id}] took {process_time:.3f}s"
                )
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            
            # Log error
            error_data = {
                "request_id": request_id,
                "error": str(e),
                "error_type": type(e).__name__,
                "process_time": process_time
            }
            
            if settings.logging.json_format:
                logger.error(json.dumps({
                    "event": "request_failed",
                    **request_data,
                    **error_data
                }))
            else:
                logger.error(
                    f"Request failed: {request.method} {request.url.path} "
                    f"[{request_id}] {str(e)} in {process_time:.3f}s",
                    exc_info=True
                )
            
            raise
    
    def _get_client_ip(self, request: Request) -> str:
        """Get the real client IP address."""
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return forwarded_for.split(",")[0].strip()
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return real_ip
        
        return request.client.host if request.client else "unknown"
    
    def _sanitize_headers(self, headers: Dict[str, str]) -> Dict[str, str]:
        """Sanitize sensitive headers for logging."""
        sanitized = {}
        for key, value in headers.items():
            if key.lower() in self.sensitive_headers:
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = value
        return sanitized
    
    def _sanitize_params(self, params: Dict[str, str]) -> Dict[str, str]:
        """Sanitize sensitive parameters for logging."""
        sanitized = {}
        for key, value in params.items():
            if any(sensitive in key.lower() for sensitive in self.sensitive_params):
                sanitized[key] = "[REDACTED]"
            else:
                sanitized[key] = value
        return sanitized

class RateLimitMiddleware(BaseHTTPMiddleware):
    """Enhanced rate limiting middleware with sliding window and user-based limits."""
    
    def __init__(self, app):
        super().__init__(app)
        self.clients: Dict[str, Dict[str, Any]] = {}
        self.cleanup_interval = 300  # 5 minutes
        self.last_cleanup = time.time()
        
        # Different limits for different endpoints
        self.endpoint_limits = {
            "/api/auth/login": {"calls": 5, "period": 300},  # 5 calls per 5 minutes
            "/api/auth/register": {"calls": 3, "period": 3600},  # 3 calls per hour
            "/api/agents": {"calls": 200, "period": 60},  # 200 calls per minute
            "default": {"calls": settings.security.rate_limit_calls, "period": settings.security.rate_limit_period}
        }
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Skip rate limiting for certain endpoints
        skip_paths = ["/health", "/metrics", "/docs", "/redoc", "/openapi.json"]
        if any(request.url.path.endswith(path) for path in skip_paths):
            return await call_next(request)
        
        # Get client identifier
        client_id = self._get_client_identifier(request)
        
        # Get rate limit for this endpoint
        limit_config = self._get_limit_config(request.url.path)
        
        # Check rate limit
        if not await self._check_rate_limit(client_id, limit_config):
            return self._create_rate_limit_response(client_id, limit_config)
        
        # Process request
        response = await call_next(request)
        
        # Add rate limit headers
        self._add_rate_limit_headers(response, client_id, limit_config)
        
        # Periodic cleanup
        await self._cleanup_old_entries()
        
        return response
    
    def _get_client_identifier(self, request: Request) -> str:
        """Get client identifier for rate limiting."""
        # Try to get user ID from request state (set by auth middleware)
        if hasattr(request.state, 'user_id'):
            return f"user:{request.state.user_id}"
        
        # Fall back to IP address
        forwarded_for = request.headers.get("x-forwarded-for")
        if forwarded_for:
            return f"ip:{forwarded_for.split(',')[0].strip()}"
        
        real_ip = request.headers.get("x-real-ip")
        if real_ip:
            return f"ip:{real_ip}"
        
        return f"ip:{request.client.host if request.client else 'unknown'}"
    
    def _get_limit_config(self, path: str) -> Dict[str, int]:
        """Get rate limit configuration for the given path."""
        for endpoint, config in self.endpoint_limits.items():
            if endpoint != "default" and path.startswith(endpoint):
                return config
        return self.endpoint_limits["default"]
    
    async def _check_rate_limit(self, client_id: str, limit_config: Dict[str, int]) -> bool:
        """Check if the client has exceeded the rate limit."""
        current_time = time.time()
        calls_limit = limit_config["calls"]
        period = limit_config["period"]
        
        if client_id not in self.clients:
            self.clients[client_id] = {
                "calls": [],
                "blocked_until": 0
            }
        
        client_data = self.clients[client_id]
        
        # Check if client is temporarily blocked
        if current_time < client_data["blocked_until"]:
            return False
        
        # Remove old calls outside the time window
        client_data["calls"] = [
            call_time for call_time in client_data["calls"]
            if current_time - call_time < period
        ]
        
        # Check if limit exceeded
        if len(client_data["calls"]) >= calls_limit:
            # Block client for the remaining period
            oldest_call = min(client_data["calls"])
            client_data["blocked_until"] = oldest_call + period
            
            logger.warning(
                f"Rate limit exceeded for client {client_id}: "
                f"{len(client_data['calls'])} calls in {period}s"
            )
            return False
        
        # Add current call
        client_data["calls"].append(current_time)
        return True
    
    def _create_rate_limit_response(self, client_id: str, limit_config: Dict[str, int]) -> JSONResponse:
        """Create rate limit exceeded response."""
        current_time = time.time()
        client_data = self.clients[client_id]
        
        retry_after = max(0, client_data["blocked_until"] - current_time)
        
        return JSONResponse(
            status_code=HTTP_429_TOO_MANY_REQUESTS,
            content={
                "success": False,
                "error": {
                    "code": "RATE_LIMIT_EXCEEDED",
                    "message": "Too many requests. Please try again later.",
                    "retry_after": int(retry_after),
                    "timestamp": current_time
                }
            },
            headers={
                "X-RateLimit-Limit": str(limit_config["calls"]),
                "X-RateLimit-Remaining": "0",
                "X-RateLimit-Reset": str(int(client_data["blocked_until"])),
                "Retry-After": str(int(retry_after))
            }
        )
    
    def _add_rate_limit_headers(self, response: Response, client_id: str, limit_config: Dict[str, int]):
        """Add rate limit headers to response."""
        if client_id in self.clients:
            client_data = self.clients[client_id]
            remaining = max(0, limit_config["calls"] - len(client_data["calls"]))
            
            response.headers["X-RateLimit-Limit"] = str(limit_config["calls"])
            response.headers["X-RateLimit-Remaining"] = str(remaining)
            
            if client_data["calls"]:
                oldest_call = min(client_data["calls"])
                reset_time = oldest_call + limit_config["period"]
                response.headers["X-RateLimit-Reset"] = str(int(reset_time))
    
    async def _cleanup_old_entries(self):
        """Clean up old rate limit entries."""
        current_time = time.time()
        
        if current_time - self.last_cleanup < self.cleanup_interval:
            return
        
        # Remove entries that are no longer needed
        clients_to_remove = []
        for client_id, client_data in self.clients.items():
            # Remove if no recent calls and not blocked
            if (not client_data["calls"] and 
                current_time > client_data["blocked_until"]):
                clients_to_remove.append(client_id)
        
        for client_id in clients_to_remove:
            del self.clients[client_id]
        
        self.last_cleanup = current_time
        
        if clients_to_remove:
            logger.debug(f"Cleaned up {len(clients_to_remove)} old rate limit entries")

class CacheMiddleware(BaseHTTPMiddleware):
    """Caching middleware for API responses."""
    
    def __init__(self, app, cache_ttl: int = 300):
        super().__init__(app)
        self.cache_ttl = cache_ttl
        self.cache: Dict[str, Dict[str, Any]] = {}
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        # Only cache GET requests
        if request.method != "GET":
            return await call_next(request)
        
        # Skip caching for certain endpoints
        skip_cache_paths = ["/api/health", "/api/auth", "/ws"]
        if any(request.url.path.startswith(path) for path in skip_cache_paths):
            return await call_next(request)
        
        # Generate cache key
        cache_key = f"{request.method}:{request.url.path}:{str(request.query_params)}"
        
        # Check cache
        current_time = time.time()
        if cache_key in self.cache:
            cache_entry = self.cache[cache_key]
            if current_time < cache_entry["expires_at"]:
                logger.debug(f"Cache hit for {cache_key}")
                response = Response(
                    content=cache_entry["content"],
                    status_code=cache_entry["status_code"],
                    headers=cache_entry["headers"]
                )
                response.headers["X-Cache"] = "HIT"
                return response
            else:
                # Cache expired, remove entry
                del self.cache[cache_key]
        
        # Process request
        response = await call_next(request)
        
        # Cache successful responses
        if response.status_code == 200:
            # Read response content
            response_body = b""
            async for chunk in response.body_iterator:
                response_body += chunk
            
            # Store in cache
            self.cache[cache_key] = {
                "content": response_body,
                "status_code": response.status_code,
                "headers": dict(response.headers),
                "expires_at": current_time + self.cache_ttl
            }
            
            # Create new response
            response = Response(
                content=response_body,
                status_code=response.status_code,
                headers=response.headers
            )
            response.headers["X-Cache"] = "MISS"
            
            logger.debug(f"Cached response for {cache_key}")
        
        return response

class ErrorHandlingMiddleware(BaseHTTPMiddleware):
    """Global error handling middleware."""
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        try:
            response = await call_next(request)
            return response
        except HTTPException as e:
            # Handle FastAPI HTTP exceptions
            return JSONResponse(
                status_code=e.status_code,
                content={
                    "success": False,
                    "error": {
                        "code": f"HTTP_{e.status_code}",
                        "message": e.detail,
                        "timestamp": time.time(),
                        "request_id": getattr(request.state, 'request_id', 'unknown')
                    }
                }
            )
        except ValueError as e:
            # Handle validation errors
            logger.error(f"Validation error: {e}", exc_info=True)
            return JSONResponse(
                status_code=400,
                content={
                    "success": False,
                    "error": {
                        "code": "VALIDATION_ERROR",
                        "message": str(e),
                        "timestamp": time.time(),
                        "request_id": getattr(request.state, 'request_id', 'unknown')
                    }
                }
            )
        except Exception as e:
            # Handle unexpected errors
            logger.error(f"Unhandled exception: {e}", exc_info=True)
            return JSONResponse(
                status_code=HTTP_500_INTERNAL_SERVER_ERROR,
                content={
                    "success": False,
                    "error": {
                        "code": "INTERNAL_SERVER_ERROR",
                        "message": "An internal server error occurred" if settings.environment == "production" else str(e),
                        "timestamp": time.time(),
                        "request_id": getattr(request.state, 'request_id', 'unknown')
                    }
                }
            )


class MetricsMiddleware(BaseHTTPMiddleware):
    """Middleware for collecting API metrics."""
    
    def __init__(self, app):
        super().__init__(app)
        self.request_count = {}
        self.response_times = {}
        self.error_count = {}
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        start_time = time.time()
        endpoint = f"{request.method} {request.url.path}"
        
        try:
            response = await call_next(request)
            
            # Record metrics
            process_time = time.time() - start_time
            self._record_request(endpoint, response.status_code, process_time)
            
            # Add metrics headers
            response.headers["X-Response-Time"] = f"{process_time:.3f}"
            
            return response
            
        except Exception as e:
            process_time = time.time() - start_time
            self._record_error(endpoint, str(e), process_time)
            raise
    
    def _record_request(self, endpoint: str, status_code: int, response_time: float):
        """Record request metrics."""
        # Count requests
        if endpoint not in self.request_count:
            self.request_count[endpoint] = {"total": 0, "by_status": {}}
        
        self.request_count[endpoint]["total"] += 1
        
        if status_code not in self.request_count[endpoint]["by_status"]:
            self.request_count[endpoint]["by_status"][status_code] = 0
        self.request_count[endpoint]["by_status"][status_code] += 1
        
        # Record response times
        if endpoint not in self.response_times:
            self.response_times[endpoint] = []
        self.response_times[endpoint].append(response_time)
        
        # Keep only last 1000 response times per endpoint
        if len(self.response_times[endpoint]) > 1000:
            self.response_times[endpoint] = self.response_times[endpoint][-1000:]
    
    def _record_error(self, endpoint: str, error: str, response_time: float):
        """Record error metrics."""
        if endpoint not in self.error_count:
            self.error_count[endpoint] = {}
        
        if error not in self.error_count[endpoint]:
            self.error_count[endpoint][error] = 0
        self.error_count[endpoint][error] += 1
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get collected metrics."""
        metrics = {
            "requests": self.request_count,
            "errors": self.error_count,
            "response_times": {}
        }
        
        # Calculate response time statistics
        for endpoint, times in self.response_times.items():
            if times:
                metrics["response_times"][endpoint] = {
                    "count": len(times),
                    "avg": sum(times) / len(times),
                    "min": min(times),
                    "max": max(times),
                    "p95": sorted(times)[int(len(times) * 0.95)] if len(times) > 20 else max(times)
                }
        
        return metrics


class CompressionMiddleware(BaseHTTPMiddleware):
    """Enhanced compression middleware for API responses."""
    
    def __init__(self, app, minimum_size: int = 1000):
        super().__init__(app)
        self.minimum_size = minimum_size
        self.compressible_types = {
            "application/json",
            "application/javascript",
            "text/html",
            "text/css",
            "text/plain",
            "text/xml",
            "application/xml"
        }
    
    async def dispatch(self, request: Request, call_next: RequestResponseEndpoint) -> Response:
        response = await call_next(request)
        
        # Check if client accepts compression
        accept_encoding = request.headers.get("accept-encoding", "")
        
        # Add compression hints
        content_type = response.headers.get("content-type", "")
        if any(ct in content_type for ct in self.compressible_types):
            response.headers["Vary"] = "Accept-Encoding"
            
            # Estimate response size and add hint
            if hasattr(response, 'body'):
                body_size = len(response.body) if response.body else 0
                if body_size > self.minimum_size:
                    response.headers["X-Compression-Eligible"] = "true"
        
        return response