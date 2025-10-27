"""
Rate Limiter for ACSO Enterprise API Gateway.
Implements sliding window and token bucket algorithms.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, Optional, Any
import time
import json

import redis
import aioredis


class RateLimitConfig:
    """Rate limit configuration."""
    
    def __init__(self, requests: int, window: int, burst: Optional[int] = None):
        self.requests = requests  # Max requests
        self.window = window      # Time window in seconds
        self.burst = burst or requests  # Burst capacity


class RateLimiter:
    """
    Advanced rate limiter with multiple algorithms:
    - Sliding window log
    - Token bucket
    - Fixed window counter
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.redis_client: Optional[aioredis.Redis] = None
        
        # Rate limit configurations
        self.configs = {
            'default': RateLimitConfig(1000, 3600),      # 1000/hour
            'premium': RateLimitConfig(5000, 3600),      # 5000/hour  
            'enterprise': RateLimitConfig(20000, 3600),  # 20000/hour
            'burst': RateLimitConfig(100, 60)            # 100/minute burst
        }
        
    async def initialize(self) -> None:
        """Initialize the rate limiter."""
        try:
            self.logger.info("Initializing Rate Limiter")
            
            # Connect to Redis
            self.redis_client = aioredis.from_url(
                "redis://localhost:6379",
                encoding="utf-8",
                decode_responses=True
            )
            
            # Test connection
            await self.redis_client.ping()
            
            self.logger.info("Rate Limiter initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Rate Limiter: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the rate limiter."""
        try:
            if self.redis_client:
                await self.redis_client.close()
            self.logger.info("Rate Limiter shutdown complete")
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    async def check_limit(self, key: str, tier: str, algorithm: str = 'sliding_window') -> bool:
        """
        Check if request is within rate limit.
        
        Args:
            key: Unique identifier for the rate limit (e.g., user:123, tenant:abc)
            tier: Rate limit tier (default, premium, enterprise)
            algorithm: Algorithm to use (sliding_window, token_bucket, fixed_window)
            
        Returns:
            True if request is allowed, False if rate limited
        """
        try:
            if not self.redis_client:
                self.logger.warning("Redis not available, allowing request")
                return True
                
            config = self.configs.get(tier, self.configs['default'])
            
            if algorithm == 'sliding_window':
                return await self._sliding_window_check(key, config)
            elif algorithm == 'token_bucket':
                return await self._token_bucket_check(key, config)
            elif algorithm == 'fixed_window':
                return await self._fixed_window_check(key, config)
            else:
                self.logger.warning(f"Unknown algorithm: {algorithm}, using sliding_window")
                return await self._sliding_window_check(key, config)
                
        except Exception as e:
            self.logger.error(f"Rate limit check error: {e}")
            # Allow request on error
            return True
            
    async def get_remaining_requests(self, key: str, tier: str = 'default') -> int:
        """Get remaining requests for the key."""
        try:
            if not self.redis_client:
                return 1000
                
            config = self.configs.get(tier, self.configs['default'])
            current_count = await self._get_current_count(key, config)
            
            return max(0, config.requests - current_count)
            
        except Exception as e:
            self.logger.error(f"Error getting remaining requests: {e}")
            return 1000
            
    async def reset_limit(self, key: str) -> None:
        """Reset rate limit for a key."""
        try:
            if self.redis_client:
                await self.redis_client.delete(f"rate_limit:{key}")
        except Exception as e:
            self.logger.error(f"Error resetting limit: {e}")
            
    async def _sliding_window_check(self, key: str, config: RateLimitConfig) -> bool:
        """Sliding window log algorithm."""
        try:
            now = time.time()
            window_start = now - config.window
            
            # Redis key for this rate limit
            redis_key = f"rate_limit:sliding:{key}"
            
            # Use Redis pipeline for atomic operations
            pipe = self.redis_client.pipeline()
            
            # Remove old entries
            pipe.zremrangebyscore(redis_key, 0, window_start)
            
            # Count current entries
            pipe.zcard(redis_key)
            
            # Add current request
            pipe.zadd(redis_key, {str(now): now})
            
            # Set expiration
            pipe.expire(redis_key, config.window + 1)
            
            results = await pipe.execute()
            current_count = results[1]
            
            return current_count < config.requests
            
        except Exception as e:
            self.logger.error(f"Sliding window check error: {e}")
            return True
            
    async def _token_bucket_check(self, key: str, config: RateLimitConfig) -> bool:
        """Token bucket algorithm."""
        try:
            now = time.time()
            redis_key = f"rate_limit:bucket:{key}"
            
            # Get current bucket state
            bucket_data = await self.redis_client.get(redis_key)
            
            if bucket_data:
                bucket = json.loads(bucket_data)
                tokens = bucket['tokens']
                last_refill = bucket['last_refill']
            else:
                tokens = config.burst
                last_refill = now
                
            # Calculate tokens to add based on time elapsed
            time_elapsed = now - last_refill
            tokens_to_add = time_elapsed * (config.requests / config.window)
            tokens = min(config.burst, tokens + tokens_to_add)
            
            # Check if we can consume a token
            if tokens >= 1:
                tokens -= 1
                
                # Update bucket state
                bucket_state = {
                    'tokens': tokens,
                    'last_refill': now
                }
                
                await self.redis_client.setex(
                    redis_key,
                    config.window * 2,  # TTL
                    json.dumps(bucket_state)
                )
                
                return True
            else:
                return False
                
        except Exception as e:
            self.logger.error(f"Token bucket check error: {e}")
            return True
            
    async def _fixed_window_check(self, key: str, config: RateLimitConfig) -> bool:
        """Fixed window counter algorithm."""
        try:
            now = time.time()
            window_start = int(now // config.window) * config.window
            
            redis_key = f"rate_limit:fixed:{key}:{window_start}"
            
            # Increment counter
            current_count = await self.redis_client.incr(redis_key)
            
            # Set expiration on first increment
            if current_count == 1:
                await self.redis_client.expire(redis_key, config.window)
                
            return current_count <= config.requests
            
        except Exception as e:
            self.logger.error(f"Fixed window check error: {e}")
            return True
            
    async def _get_current_count(self, key: str, config: RateLimitConfig) -> int:
        """Get current request count for sliding window."""
        try:
            now = time.time()
            window_start = now - config.window
            redis_key = f"rate_limit:sliding:{key}"
            
            # Remove old entries and count current
            await self.redis_client.zremrangebyscore(redis_key, 0, window_start)
            count = await self.redis_client.zcard(redis_key)
            
            return count
            
        except Exception as e:
            self.logger.error(f"Error getting current count: {e}")
            return 0