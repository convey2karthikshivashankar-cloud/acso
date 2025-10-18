#!/usr/bin/env python3
"""
ACSO API Gateway startup script.
"""

import os
import sys
import logging
from pathlib import Path

# Add the project root to Python path
project_root = Path(__file__).parent.parent.parent
sys.path.insert(0, str(project_root))

import uvicorn
from src.api.config import settings

# Configure logging
logging.basicConfig(
    level=getattr(logging, settings.logging.level),
    format=settings.logging.format
)

logger = logging.getLogger(__name__)


def main():
    """Main entry point for the API server."""
    logger.info(f"Starting ACSO API Gateway...")
    logger.info(f"Environment: {settings.environment}")
    logger.info(f"Debug mode: {settings.debug}")
    logger.info(f"Host: {settings.host}:{settings.port}")
    
    # Set environment variables if not already set
    if not os.getenv("DATABASE_URL"):
        os.environ["DATABASE_URL"] = settings.database.url
    
    if not os.getenv("REDIS_URL"):
        os.environ["REDIS_URL"] = settings.redis.url
    
    try:
        uvicorn.run(
            "src.api.main:app",
            host=settings.host,
            port=settings.port,
            reload=settings.debug,
            log_level=settings.logging.level.lower(),
            workers=settings.workers if not settings.debug else 1,
            access_log=True,
            use_colors=True
        )
    except KeyboardInterrupt:
        logger.info("Shutting down ACSO API Gateway...")
    except Exception as e:
        logger.error(f"Failed to start ACSO API Gateway: {e}")
        sys.exit(1)


if __name__ == "__main__":
    main()