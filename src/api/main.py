"""
ACSO API Gateway - Enhanced FastAPI Application
"""

import asyncio
import logging
import time
from contextlib import asynccontextmanager
from typing import Dict, Any

from fastapi import FastAPI, HTTPException, Request
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.middleware.trustedhost import TrustedHostMiddleware
from fastapi.responses import JSONResponse
from fastapi.staticfiles import StaticFiles
import uvicorn

# Import routers
from .routers import agents, workflows, incidents, financial, auth
from .websocket.router import router as websocket_router
from .websocket.connection_manager import connection_manager

# Import middleware
from .middleware import (
    SecurityMiddleware,
    LoggingMiddleware, 
    RateLimitMiddleware,
    ErrorHandlingMiddleware,
    MetricsMiddleware,
    CompressionMiddleware
)

# Import configuration
from .config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.logging.level),
    format=settings.logging.format
)
logger = logging.getLogger(__name__)

# Global metrics middleware instance
metrics_middleware = MetricsMiddleware(None)

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager."""
    logger.info("Starting ACSO API Gateway...")
    
    try:
        # Initialize system components
        logger.info("Initializing system components...")
        
        # TODO: Initialize database connections
        # TODO: Initialize Redis connections
        # TODO: Initialize agent connections
        
        logger.info("ACSO API Gateway started successfully")
        
        yield
        
    except Exception as e:
        logger.error(f"Failed to start ACSO API Gateway: {e}")
        raise
    finally:
        # Cleanup
        logger.info("Shutting down ACSO API Gateway...")
        
        # TODO: Close database connections
        # TODO: Close Redis connections
        # TODO: Cleanup agent connections
        
        logger.info("ACSO API Gateway shutdown complete")

# Create FastAPI application
app = FastAPI(
    title=settings.title,
    description=settings.description,
    version=settings.version,
    docs_url=settings.docs_url,
    redoc_url=settings.redoc_url,
    openapi_url=settings.openapi_url,
    lifespan=lifespan
)

# Add middleware in correct order (last added = first executed)
# 1. Trusted host middleware (security)
app.add_middleware(
    TrustedHostMiddleware,
    allowed_hosts=settings.security.allowed_hosts
)

# 2. CORS middleware
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.security.cors_origins,
    allow_credentials=settings.security.cors_allow_credentials,
    allow_methods=["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
    allow_headers=["*"],
    expose_headers=["X-Request-ID", "X-Process-Time", "X-RateLimit-*"]
)

# 3. Compression middleware
app.add_middleware(GZipMiddleware, minimum_size=1000)
app.add_middleware(CompressionMiddleware)

# 4. Security middleware
app.add_middleware(SecurityMiddleware)

# 5. Error handling middleware
app.add_middleware(ErrorHandlingMiddleware)

# 6. Metrics middleware
app.add_middleware(MetricsMiddleware)

# 7. Rate limiting middleware
app.add_middleware(RateLimitMiddleware)

# 8. Logging middleware (should be last to capture all request data)
app.add_middleware(LoggingMiddleware)

# Include API routers
app.include_router(auth.router, prefix=f"{settings.api_prefix}/auth", tags=["Authentication"])
app.include_router(agents.router, prefix=f"{settings.api_prefix}/agents", tags=["Agents"])
app.include_router(workflows.router, prefix=f"{settings.api_prefix}/workflows", tags=["Workflows"])
app.include_router(incidents.router, prefix=f"{settings.api_prefix}/incidents", tags=["Incidents"])
app.include_router(financial.router, prefix=f"{settings.api_prefix}/financial", tags=["Financial"])

# Include WebSocket router
app.include_router(websocket_router, tags=["WebSocket"])

# Health check endpoints
@app.get(settings.monitoring.health_endpoint)
async def health_check():
    """Health check endpoint for load balancers and monitoring."""
    try:
        current_time = time.time()
        
        # Basic health checks
        health_status = {
            "status": "healthy",
            "timestamp": current_time,
            "version": settings.version,
            "environment": settings.environment,
            "uptime": current_time - app.state.start_time if hasattr(app.state, 'start_time') else 0
        }
        
        # Component health checks
        components = {}
        
        # Check WebSocket manager
        try:
            ws_stats = connection_manager.get_stats()
            components["websocket"] = {
                "status": "healthy",
                "active_connections": ws_stats["active_connections"],
                "total_connections": ws_stats["total_connections"]
            }
        except Exception as e:
            components["websocket"] = {"status": "unhealthy", "error": str(e)}
        
        # TODO: Add database health check
        # TODO: Add Redis health check
        # TODO: Add agent health checks
        
        health_status["components"] = components
        
        # Determine overall health
        unhealthy_components = [
            name for name, comp in components.items() 
            if comp.get("status") != "healthy"
        ]
        
        if unhealthy_components:
            health_status["status"] = "degraded"
            health_status["unhealthy_components"] = unhealthy_components
        
        return health_status
        
    except Exception as e:
        logger.error(f"Health check failed: {e}")
        raise HTTPException(status_code=503, detail="Service unavailable")


@app.get("/ready")
async def readiness_check():
    """Readiness check endpoint for Kubernetes."""
    try:
        # Check if all required services are ready
        # TODO: Check database connectivity
        # TODO: Check Redis connectivity
        # TODO: Check agent connectivity
        
        return {
            "status": "ready",
            "timestamp": time.time(),
            "checks": {
                "database": "ok",  # TODO: Implement actual check
                "redis": "ok",     # TODO: Implement actual check
                "agents": "ok"     # TODO: Implement actual check
            }
        }
    except Exception as e:
        logger.error(f"Readiness check failed: {e}")
        raise HTTPException(status_code=503, detail="Service not ready")


@app.get(settings.monitoring.metrics_endpoint)
async def metrics_endpoint():
    """Metrics endpoint for monitoring systems."""
    try:
        # Get application metrics
        app_metrics = metrics_middleware.get_metrics()
        
        # Get WebSocket metrics
        ws_metrics = connection_manager.get_stats()
        
        # Combine all metrics
        metrics = {
            "timestamp": time.time(),
            "application": app_metrics,
            "websocket": ws_metrics,
            "system": {
                "version": settings.version,
                "environment": settings.environment
            }
        }
        
        return metrics
        
    except Exception as e:
        logger.error(f"Metrics collection failed: {e}")
        raise HTTPException(status_code=500, detail="Metrics unavailable")

# Startup event
@app.on_event("startup")
async def startup_event():
    """Initialize application state on startup."""
    app.state.start_time = time.time()
    logger.info("ACSO API Gateway startup complete")


# Root endpoint
@app.get("/")
async def root():
    """Root endpoint with API information."""
    return {
        "name": settings.title,
        "version": settings.version,
        "description": settings.description,
        "environment": settings.environment,
        "docs_url": settings.docs_url,
        "health_url": settings.monitoring.health_endpoint,
        "metrics_url": settings.monitoring.metrics_endpoint
    }

if __name__ == "__main__":
    uvicorn.run(
        "src.api.main:app",
        host=settings.host,
        port=settings.port,
        reload=settings.debug,
        log_level=settings.logging.level.lower(),
        workers=settings.workers if not settings.debug else 1
    )