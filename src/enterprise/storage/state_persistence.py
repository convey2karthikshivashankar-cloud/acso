"""
State persistence manager for ACSO Enterprise.
Handles persistent storage of agent states and recovery data.
"""

import asyncio
import json
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
import aioredis
import pickle
import gzip

from ..models.lifecycle import StateSnapshot, RecoveryStrategy


class StatePersistenceManager:
    """Manages persistent storage of agent lifecycle states."""
    
    def __init__(self, redis_url: str = "redis://localhost:6379", 
                 compression_enabled: bool = True):
        self.redis_url = redis_url
        self.compression_enabled = compression_enabled
        self.logger = logging.getLogger(__name__)
        self.redis_client: Optional[aioredis.Redis] = None
        
        # Key prefixes for different data types
        self.AGENT_STATE_PREFIX = "acso:agent:state:"
        self.RECOVERY_STRATEGY_PREFIX = "acso:agent:recovery:"
        self.STATE_SNAPSHOT_PREFIX = "acso:agent:snapshot:"
        self.LIFECYCLE_EVENT_PREFIX = "acso:agent:event:"
        self.WORKLOAD_REDISTRIBUTION_PREFIX = "acso:agent:workload:"
        self.RECOVERY_HISTORY_PREFIX = "acso:agent:recovery_history:"
    
    async def initialize(self) -> bool:
        """Initialize the persistence manager."""
        try:
            self.redis_client = await aioredis.from_url(
                self.redis_url,
                encoding="utf-8",
                decode_responses=False  # We handle encoding ourselves for binary data
            )
            
            # Test connection
            await self.redis_client.ping()
            
            self.logger.info("State persistence manager initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize state persistence manager: {e}")
            return False
    
    async def shutdown(self):
        """Shutdown the persistence manager."""
        try:
            if self.redis_client:
                await self.redis_client.close()
            self.logger.info("State persistence manager shutdown completed")
            
        except Exception as e:
            self.logger.error(f"Error during persistence manager shutdown: {e}")
    
    def _serialize_data(self, data: Any) -> bytes:
        """Serialize data with optional compression."""
        try:
            serialized = pickle.dumps(data)
            
            if self.compression_enabled:
                serialized = gzip.compress(serialized)
            
            return serialized
            
        except Exception as e:
            self.logger.error(f"Data serialization failed: {e}")
            raise
    
    def _deserialize_data(self, data: bytes) -> Any:
        """Deserialize data with optional decompression."""
        try:
            if self.compression_enabled:
                data = gzip.decompress(data)
            
            return pickle.loads(data)
            
        except Exception as e:
            self.logger.error(f"Data deserialization failed: {e}")
            raise
    
    async def store_agent_state(self, agent_id: str, state_data: Dict[str, Any]) -> bool:
        """Store agent lifecycle state."""
        try:
            if not self.redis_client:
                return False
            
            key = f"{self.AGENT_STATE_PREFIX}{agent_id}"
            serialized_data = self._serialize_data(state_data)
            
            await self.redis_client.set(key, serialized_data)
            
            # Set expiration (30 days)
            await self.redis_client.expire(key, 30 * 24 * 3600)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to store agent state for {agent_id}: {e}")
            return False
    
    async def load_agent_state(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Load agent lifecycle state."""
        try:
            if not self.redis_client:
                return None
            
            key = f"{self.AGENT_STATE_PREFIX}{agent_id}"
            serialized_data = await self.redis_client.get(key)
            
            if serialized_data:
                return self._deserialize_data(serialized_data)
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to load agent state for {agent_id}: {e}")
            return None
    
    async def load_all_agent_states(self) -> Dict[str, Dict[str, Any]]:
        """Load all agent lifecycle states."""
        try:
            if not self.redis_client:
                return {}
            
            pattern = f"{self.AGENT_STATE_PREFIX}*"
            keys = await self.redis_client.keys(pattern)
            
            states = {}
            for key in keys:
                agent_id = key.decode('utf-8').replace(self.AGENT_STATE_PREFIX, '')
                state_data = await self.load_agent_state(agent_id)
                if state_data:
                    states[agent_id] = state_data
            
            return states
            
        except Exception as e:
            self.logger.error(f"Failed to load all agent states: {e}")
            return {}
    
    async def store_recovery_strategy(self, agent_id: str, strategy_data: Dict[str, Any]) -> bool:
        """Store recovery strategy for an agent."""
        try:
            if not self.redis_client:
                return False
            
            key = f"{self.RECOVERY_STRATEGY_PREFIX}{agent_id}"
            serialized_data = self._serialize_data(strategy_data)
            
            await self.redis_client.set(key, serialized_data)
            await self.redis_client.expire(key, 30 * 24 * 3600)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to store recovery strategy for {agent_id}: {e}")
            return False
    
    async def load_recovery_strategy(self, agent_id: str) -> Optional[Dict[str, Any]]:
        """Load recovery strategy for an agent."""
        try:
            if not self.redis_client:
                return None
            
            key = f"{self.RECOVERY_STRATEGY_PREFIX}{agent_id}"
            serialized_data = await self.redis_client.get(key)
            
            if serialized_data:
                return self._deserialize_data(serialized_data)
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to load recovery strategy for {agent_id}: {e}")
            return None
    
    async def store_state_snapshot(self, agent_id: str, snapshot: StateSnapshot) -> bool:
        """Store a state snapshot."""
        try:
            if not self.redis_client:
                return False
            
            timestamp_str = snapshot.timestamp.isoformat()
            key = f"{self.STATE_SNAPSHOT_PREFIX}{agent_id}:{timestamp_str}"
            
            serialized_data = self._serialize_data(snapshot.__dict__)
            
            await self.redis_client.set(key, serialized_data)
            await self.redis_client.expire(key, 7 * 24 * 3600)  # 7 days retention
            
            # Add to sorted set for easy retrieval
            list_key = f"{self.STATE_SNAPSHOT_PREFIX}{agent_id}:list"
            await self.redis_client.zadd(list_key, {key: snapshot.timestamp.timestamp()})
            await self.redis_client.expire(list_key, 7 * 24 * 3600)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to store state snapshot for {agent_id}: {e}")
            return False
    
    async def load_state_snapshots(self, agent_id: str, limit: int = 10) -> List[StateSnapshot]:
        """Load state snapshots for an agent."""
        try:
            if not self.redis_client:
                return []
            
            list_key = f"{self.STATE_SNAPSHOT_PREFIX}{agent_id}:list"
            
            # Get most recent snapshots
            snapshot_keys = await self.redis_client.zrevrange(list_key, 0, limit - 1)
            
            snapshots = []
            for key in snapshot_keys:
                serialized_data = await self.redis_client.get(key)
                if serialized_data:
                    snapshot_data = self._deserialize_data(serialized_data)
                    snapshot = StateSnapshot(**snapshot_data)
                    snapshots.append(snapshot)
            
            return snapshots
            
        except Exception as e:
            self.logger.error(f"Failed to load state snapshots for {agent_id}: {e}")
            return []
    
    async def store_lifecycle_event(self, agent_id: str, event: str, event_data: Dict[str, Any]) -> bool:
        """Store a lifecycle event."""
        try:
            if not self.redis_client:
                return False
            
            timestamp = datetime.utcnow()
            key = f"{self.LIFECYCLE_EVENT_PREFIX}{agent_id}:{timestamp.isoformat()}"
            
            event_record = {
                "agent_id": agent_id,
                "event": event,
                "timestamp": timestamp.isoformat(),
                "data": event_data
            }
            
            serialized_data = self._serialize_data(event_record)
            
            await self.redis_client.set(key, serialized_data)
            await self.redis_client.expire(key, 30 * 24 * 3600)  # 30 days retention
            
            # Add to sorted set for easy retrieval
            list_key = f"{self.LIFECYCLE_EVENT_PREFIX}{agent_id}:list"
            await self.redis_client.zadd(list_key, {key: timestamp.timestamp()})
            await self.redis_client.expire(list_key, 30 * 24 * 3600)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to store lifecycle event for {agent_id}: {e}")
            return False
    
    async def store_workload_redistribution(self, agent_id: str, redistribution_data: Dict[str, Any]) -> bool:
        """Store workload redistribution event."""
        try:
            if not self.redis_client:
                return False
            
            timestamp = datetime.utcnow()
            key = f"{self.WORKLOAD_REDISTRIBUTION_PREFIX}{agent_id}:{timestamp.isoformat()}"
            
            serialized_data = self._serialize_data(redistribution_data)
            
            await self.redis_client.set(key, serialized_data)
            await self.redis_client.expire(key, 30 * 24 * 3600)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to store workload redistribution for {agent_id}: {e}")
            return False
    
    async def get_recovery_history(self, agent_id: str, limit: int = 50) -> List[Dict[str, Any]]:
        """Get recovery history for an agent."""
        try:
            if not self.redis_client:
                return []
            
            # Get lifecycle events related to recovery
            list_key = f"{self.LIFECYCLE_EVENT_PREFIX}{agent_id}:list"
            event_keys = await self.redis_client.zrevrange(list_key, 0, limit - 1)
            
            recovery_events = []
            for key in event_keys:
                serialized_data = await self.redis_client.get(key)
                if serialized_data:
                    event_data = self._deserialize_data(serialized_data)
                    
                    # Filter for recovery-related events
                    if event_data.get("event") in ["failed", "recovering", "running"]:
                        recovery_events.append(event_data)
            
            return recovery_events
            
        except Exception as e:
            self.logger.error(f"Failed to get recovery history for {agent_id}: {e}")
            return []
    
    async def cleanup_expired_data(self) -> bool:
        """Clean up expired data (Redis handles this automatically with TTL)."""
        try:
            # Redis automatically handles TTL cleanup
            # This method can be used for additional cleanup logic if needed
            self.logger.info("Cleanup completed (handled by Redis TTL)")
            return True
            
        except Exception as e:
            self.logger.error(f"Cleanup failed: {e}")
            return False
    
    async def get_storage_stats(self) -> Dict[str, Any]:
        """Get storage statistics."""
        try:
            if not self.redis_client:
                return {}
            
            info = await self.redis_client.info()
            
            # Count keys by type
            agent_states = len(await self.redis_client.keys(f"{self.AGENT_STATE_PREFIX}*"))
            recovery_strategies = len(await self.redis_client.keys(f"{self.RECOVERY_STRATEGY_PREFIX}*"))
            snapshots = len(await self.redis_client.keys(f"{self.STATE_SNAPSHOT_PREFIX}*"))
            events = len(await self.redis_client.keys(f"{self.LIFECYCLE_EVENT_PREFIX}*"))
            
            return {
                "redis_info": {
                    "used_memory": info.get("used_memory_human", "unknown"),
                    "connected_clients": info.get("connected_clients", 0),
                    "total_commands_processed": info.get("total_commands_processed", 0)
                },
                "key_counts": {
                    "agent_states": agent_states,
                    "recovery_strategies": recovery_strategies,
                    "snapshots": snapshots,
                    "events": events
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get storage stats: {e}")
            return {}