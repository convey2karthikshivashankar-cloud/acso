"""
ACSO Enterprise Framework - Bidirectional Data Synchronization

This module implements bidirectional data synchronization between ACSO and external systems,
ensuring data consistency across multiple platforms with conflict resolution and recovery.

Key Features:
- Real-time bidirectional synchronization
- Conflict detection and resolution
- Change tracking and versioning
- Sync state management
- Recovery and reconciliation
- Performance optimization
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Set
from dataclasses import dataclass, field
from enum import Enum
import json
import hashlib
from abc import ABC, abstractmethod
import uuid

from .event_driven_architecture import Event, EventMetadata, EventType, EnterpriseEventBus

logger = logging.getLogger(__name__)

class SyncDirection(Enum):
    """Synchronization direction."""
    INBOUND = "inbound"   # External system -> ACSO
    OUTBOUND = "outbound"  # ACSO -> External system
    BIDIRECTIONAL = "bidirectional"

class SyncStatus(Enum):
    """Synchronization status."""
    ACTIVE = "active"
    PAUSED = "paused"
    ERROR = "error"
    STOPPED = "stopped"

class ConflictResolutionStrategy(Enum):
    """Conflict resolution strategies."""
    LAST_WRITE_WINS = "last_write_wins"
    FIRST_WRITE_WINS = "first_write_wins"
    MANUAL_RESOLUTION = "manual_resolution"
    CUSTOM_LOGIC = "custom_logic"
    MERGE_FIELDS = "merge_fields"

class ChangeType(Enum):
    """Types of data changes."""
    CREATE = "create"
    UPDATE = "update"
    DELETE = "delete"
    RESTORE = "restore"

@dataclass
class DataChange:
    """Represents a data change for synchronization."""
    change_id: str
    entity_type: str
    entity_id: str
    change_type: ChangeType
    data: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    timestamp: datetime = field(default_factory=datetime.now)
    version: int = 1
    checksum: str = ""
    source_system: str = ""
    tenant_id: str = ""
    
    def __post_init__(self):
        """Calculate checksum after initialization."""
        if not self.checksum:
            self.checksum = self._calculate_checksum()
    
    def _calculate_checksum(self) -> str:
        """Calculate checksum for data integrity."""
        data_str = json.dumps(self.data, sort_keys=True)
        return hashlib.sha256(data_str.encode()).hexdigest()

@dataclass
class SyncConflict:
    """Represents a synchronization conflict."""
    conflict_id: str
    entity_type: str
    entity_id: str
    local_change: DataChange
    remote_change: DataChange
    conflict_type: str
    detected_at: datetime = field(default_factory=datetime.now)
    resolution_strategy: Optional[ConflictResolutionStrategy] = None
    resolved_at: Optional[datetime] = None
    resolved_by: Optional[str] = None
    resolution_data: Optional[Dict[str, Any]] = None

@dataclass
class SyncConfiguration:
    """Synchronization configuration."""
    sync_id: str
    name: str
    source_system: str
    target_system: str
    direction: SyncDirection
    entity_types: List[str]
    sync_interval_seconds: int = 300  # 5 minutes
    batch_size: int = 100
    conflict_resolution: ConflictResolutionStrategy = ConflictResolutionStrategy.LAST_WRITE_WINS
    field_mappings: Dict[str, str] = field(default_factory=dict)
    filters: Dict[str, Any] = field(default_factory=dict)
    transformations: List[Dict[str, Any]] = field(default_factory=list)
    is_active: bool = True
    tenant_id: str = ""

@dataclass
class SyncState:
    """Synchronization state tracking."""
    sync_id: str
    last_sync_timestamp: Optional[datetime] = None
    last_successful_sync: Optional[datetime] = None
    status: SyncStatus = SyncStatus.ACTIVE
    error_count: int = 0
    total_synced: int = 0
    pending_changes: int = 0
    conflicts_count: int = 0
    performance_metrics: Dict[str, float] = field(default_factory=dict)

class DataConnector(ABC):
    """Abstract data connector for external systems."""
    
    @abstractmethod
    async def get_changes(self, 
                         since: Optional[datetime] = None,
                         entity_types: Optional[List[str]] = None,
                         batch_size: int = 100) -> List[DataChange]:
        """Get changes from external system."""
        pass
    
    @abstractmethod
    async def apply_change(self, change: DataChange) -> bool:
        """Apply change to external system."""
        pass
    
    @abstractmethod
    async def get_entity(self, entity_type: str, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get entity from external system."""
        pass
    
    @abstractmethod
    async def health_check(self) -> bool:
        """Check if connector is healthy."""
        pass

class ConflictResolver:
    """Handles conflict resolution between systems."""
    
    def __init__(self):
        """Initialize conflict resolver."""
        self.resolution_strategies = {
            ConflictResolutionStrategy.LAST_WRITE_WINS: self._last_write_wins,
            ConflictResolutionStrategy.FIRST_WRITE_WINS: self._first_write_wins,
            ConflictResolutionStrategy.MERGE_FIELDS: self._merge_fields,
        }
    
    async def resolve_conflict(self, conflict: SyncConflict) -> Optional[DataChange]:
        """
        Resolve a synchronization conflict.
        
        Args:
            conflict: Conflict to resolve
            
        Returns:
            Resolved data change or None if manual resolution required
        """
        try:
            strategy = conflict.resolution_strategy or ConflictResolutionStrategy.LAST_WRITE_WINS
            
            if strategy in self.resolution_strategies:
                resolver = self.resolution_strategies[strategy]
                resolved_change = await resolver(conflict)
                
                if resolved_change:
                    conflict.resolved_at = datetime.now()
                    conflict.resolution_data = resolved_change.data
                    
                return resolved_change
            
            elif strategy == ConflictResolutionStrategy.MANUAL_RESOLUTION:
                # Store conflict for manual resolution
                logger.info(f"Conflict {conflict.conflict_id} requires manual resolution")
                return None
            
            elif strategy == ConflictResolutionStrategy.CUSTOM_LOGIC:
                # Custom logic would be implemented here
                return await self._custom_resolution(conflict)
            
            else:
                logger.error(f"Unknown conflict resolution strategy: {strategy}")
                return None
                
        except Exception as e:
            logger.error(f"Failed to resolve conflict {conflict.conflict_id}: {e}")
            return None
    
    async def _last_write_wins(self, conflict: SyncConflict) -> DataChange:
        """Last write wins resolution strategy."""
        if conflict.local_change.timestamp > conflict.remote_change.timestamp:
            return conflict.local_change
        else:
            return conflict.remote_change
    
    async def _first_write_wins(self, conflict: SyncConflict) -> DataChange:
        """First write wins resolution strategy."""
        if conflict.local_change.timestamp < conflict.remote_change.timestamp:
            return conflict.local_change
        else:
            return conflict.remote_change
    
    async def _merge_fields(self, conflict: SyncConflict) -> DataChange:
        """Merge fields from both changes."""
        # Start with the newer change as base
        base_change = (conflict.local_change 
                      if conflict.local_change.timestamp > conflict.remote_change.timestamp
                      else conflict.remote_change)
        
        other_change = (conflict.remote_change 
                       if base_change == conflict.local_change
                       else conflict.local_change)
        
        # Merge data fields
        merged_data = base_change.data.copy()
        
        # Add non-conflicting fields from other change
        for key, value in other_change.data.items():
            if key not in merged_data:
                merged_data[key] = value
        
        # Create new change with merged data
        merged_change = DataChange(
            change_id=str(uuid.uuid4()),
            entity_type=conflict.entity_type,
            entity_id=conflict.entity_id,
            change_type=base_change.change_type,
            data=merged_data,
            metadata={
                'merged_from': [base_change.change_id, other_change.change_id],
                'resolution_strategy': 'merge_fields'
            },
            source_system='conflict_resolver',
            tenant_id=base_change.tenant_id
        )
        
        return merged_change
    
    async def _custom_resolution(self, conflict: SyncConflict) -> Optional[DataChange]:
        """Custom conflict resolution logic."""
        # Implement custom business logic here
        # For now, fall back to last write wins
        return await self._last_write_wins(conflict)

class BidirectionalSyncEngine:
    """
    Main bidirectional synchronization engine.
    
    Manages synchronization between ACSO and external systems with
    conflict resolution, performance optimization, and error handling.
    """
    
    def __init__(self, event_bus: EnterpriseEventBus, config: Dict[str, Any]):
        """Initialize bidirectional sync engine."""
        self.event_bus = event_bus
        self.config = config
        
        # Core components
        self.conflict_resolver = ConflictResolver()
        self.connectors: Dict[str, DataConnector] = {}
        self.sync_configurations: Dict[str, SyncConfiguration] = {}
        self.sync_states: Dict[str, SyncState] = {}
        
        # Change tracking
        self.pending_changes: Dict[str, List[DataChange]] = {}
        self.conflicts: Dict[str, SyncConflict] = {}
        
        # Processing state
        self.is_running = False
        self.sync_tasks: Dict[str, asyncio.Task] = {}
        
        # Performance metrics
        self.metrics = {
            'total_syncs': 0,
            'successful_syncs': 0,
            'failed_syncs': 0,
            'conflicts_detected': 0,
            'conflicts_resolved': 0,
            'avg_sync_time': 0.0,
            'data_throughput': 0.0
        }
        
        logger.info("Bidirectional Sync Engine initialized")
    
    def register_connector(self, system_name: str, connector: DataConnector) -> None:
        """Register a data connector for an external system."""
        self.connectors[system_name] = connector
        logger.info(f"Registered connector for system: {system_name}")
    
    def add_sync_configuration(self, config: SyncConfiguration) -> None:
        """Add a synchronization configuration."""
        self.sync_configurations[config.sync_id] = config
        self.sync_states[config.sync_id] = SyncState(sync_id=config.sync_id)
        self.pending_changes[config.sync_id] = []
        
        logger.info(f"Added sync configuration: {config.name}")
    
    async def start_sync(self, sync_id: Optional[str] = None) -> None:
        """Start synchronization for specific sync or all syncs."""
        if not self.is_running:
            self.is_running = True
        
        if sync_id:
            if sync_id in self.sync_configurations:
                await self._start_sync_task(sync_id)
        else:
            # Start all active sync configurations
            for config in self.sync_configurations.values():
                if config.is_active:
                    await self._start_sync_task(config.sync_id)
        
        logger.info(f"Started synchronization: {sync_id or 'all'}")
    
    async def stop_sync(self, sync_id: Optional[str] = None) -> None:
        """Stop synchronization for specific sync or all syncs."""
        if sync_id:
            if sync_id in self.sync_tasks:
                self.sync_tasks[sync_id].cancel()
                del self.sync_tasks[sync_id]
                self.sync_states[sync_id].status = SyncStatus.STOPPED
        else:
            # Stop all sync tasks
            for task in self.sync_tasks.values():
                task.cancel()
            self.sync_tasks.clear()
            
            for state in self.sync_states.values():
                state.status = SyncStatus.STOPPED
            
            self.is_running = False
        
        logger.info(f"Stopped synchronization: {sync_id or 'all'}")
    
    async def _start_sync_task(self, sync_id: str) -> None:
        """Start synchronization task for a specific configuration."""
        if sync_id in self.sync_tasks:
            # Task already running
            return
        
        config = self.sync_configurations[sync_id]
        task = asyncio.create_task(self._sync_loop(config))
        self.sync_tasks[sync_id] = task
        
        self.sync_states[sync_id].status = SyncStatus.ACTIVE
    
    async def _sync_loop(self, config: SyncConfiguration) -> None:
        """Main synchronization loop for a configuration."""
        sync_state = self.sync_states[config.sync_id]
        
        while self.is_running and config.is_active:
            try:
                start_time = datetime.now()
                
                # Perform synchronization
                await self._perform_sync(config)
                
                # Update metrics
                sync_time = (datetime.now() - start_time).total_seconds()
                self._update_sync_metrics(sync_time, True)
                
                sync_state.last_successful_sync = datetime.now()
                sync_state.error_count = 0
                
                # Wait for next sync interval
                await asyncio.sleep(config.sync_interval_seconds)
                
            except Exception as e:
                logger.error(f"Sync error for {config.sync_id}: {e}")
                
                sync_state.error_count += 1
                sync_state.status = SyncStatus.ERROR
                self._update_sync_metrics(0, False)
                
                # Exponential backoff on errors
                backoff_time = min(300, 30 * (2 ** min(sync_state.error_count, 5)))
                await asyncio.sleep(backoff_time)
    
    async def _perform_sync(self, config: SyncConfiguration) -> None:
        """Perform synchronization for a configuration."""
        sync_state = self.sync_states[config.sync_id]
        
        try:
            # Get connectors
            source_connector = self.connectors.get(config.source_system)
            target_connector = self.connectors.get(config.target_system)
            
            if not source_connector or not target_connector:
                raise ValueError(f"Missing connectors for sync {config.sync_id}")
            
            # Health check connectors
            if not await source_connector.health_check() or not await target_connector.health_check():
                raise ValueError(f"Connector health check failed for sync {config.sync_id}")
            
            # Perform bidirectional sync based on direction
            if config.direction in [SyncDirection.OUTBOUND, SyncDirection.BIDIRECTIONAL]:
                await self._sync_direction(
                    config, source_connector, target_connector, 
                    sync_state, "outbound"
                )
            
            if config.direction in [SyncDirection.INBOUND, SyncDirection.BIDIRECTIONAL]:
                await self._sync_direction(
                    config, target_connector, source_connector, 
                    sync_state, "inbound"
                )
            
            sync_state.last_sync_timestamp = datetime.now()
            
        except Exception as e:
            logger.error(f"Failed to perform sync for {config.sync_id}: {e}")
            raise
    
    async def _sync_direction(self, 
                            config: SyncConfiguration,
                            source_connector: DataConnector,
                            target_connector: DataConnector,
                            sync_state: SyncState,
                            direction: str) -> None:
        """Synchronize in one direction."""
        try:
            # Get changes from source
            changes = await source_connector.get_changes(
                since=sync_state.last_sync_timestamp,
                entity_types=config.entity_types,
                batch_size=config.batch_size
            )
            
            if not changes:
                return
            
            logger.info(f"Processing {len(changes)} changes for sync {config.sync_id} ({direction})")
            
            # Process changes in batches
            for i in range(0, len(changes), config.batch_size):
                batch = changes[i:i + config.batch_size]
                await self._process_change_batch(config, batch, target_connector, sync_state)
            
        except Exception as e:
            logger.error(f"Failed to sync direction {direction} for {config.sync_id}: {e}")
            raise
    
    async def _process_change_batch(self, 
                                  config: SyncConfiguration,
                                  changes: List[DataChange],
                                  target_connector: DataConnector,
                                  sync_state: SyncState) -> None:
        """Process a batch of changes."""
        for change in changes:
            try:
                # Apply field mappings and transformations
                transformed_change = await self._transform_change(change, config)
                
                # Check for conflicts
                conflict = await self._detect_conflict(transformed_change, target_connector)
                
                if conflict:
                    # Handle conflict
                    resolved_change = await self.conflict_resolver.resolve_conflict(conflict)
                    
                    if resolved_change:
                        # Apply resolved change
                        success = await target_connector.apply_change(resolved_change)
                        if success:
                            sync_state.total_synced += 1
                            self.metrics['conflicts_resolved'] += 1
                        
                        # Publish conflict resolution event
                        await self._publish_conflict_event(conflict, resolved_change)
                    else:
                        # Store for manual resolution
                        self.conflicts[conflict.conflict_id] = conflict
                        self.metrics['conflicts_detected'] += 1
                        
                        # Publish conflict detection event
                        await self._publish_conflict_event(conflict, None)
                else:
                    # No conflict, apply change directly
                    success = await target_connector.apply_change(transformed_change)
                    if success:
                        sync_state.total_synced += 1
                
                # Publish sync event
                await self._publish_sync_event(config, transformed_change, success)
                
            except Exception as e:
                logger.error(f"Failed to process change {change.change_id}: {e}")
                sync_state.error_count += 1
    
    async def _transform_change(self, 
                              change: DataChange, 
                              config: SyncConfiguration) -> DataChange:
        """Apply field mappings and transformations to a change."""
        transformed_data = change.data.copy()
        
        # Apply field mappings
        if config.field_mappings:
            mapped_data = {}
            for source_field, target_field in config.field_mappings.items():
                if source_field in transformed_data:
                    mapped_data[target_field] = transformed_data[source_field]
                    if target_field != source_field:
                        del transformed_data[source_field]
            transformed_data.update(mapped_data)
        
        # Apply transformations
        for transformation in config.transformations:
            # Implement transformation logic based on configuration
            # This is a simplified example
            if transformation.get('type') == 'format_date':
                field = transformation.get('field')
                if field in transformed_data:
                    # Apply date formatting
                    pass
        
        # Create transformed change
        transformed_change = DataChange(
            change_id=change.change_id,
            entity_type=change.entity_type,
            entity_id=change.entity_id,
            change_type=change.change_type,
            data=transformed_data,
            metadata=change.metadata.copy(),
            timestamp=change.timestamp,
            version=change.version,
            source_system=change.source_system,
            tenant_id=change.tenant_id
        )
        
        return transformed_change
    
    async def _detect_conflict(self, 
                             change: DataChange, 
                             target_connector: DataConnector) -> Optional[SyncConflict]:
        """Detect conflicts with existing data."""
        try:
            # Get current entity from target system
            current_entity = await target_connector.get_entity(
                change.entity_type, 
                change.entity_id
            )
            
            if not current_entity:
                # No existing entity, no conflict
                return None
            
            # Check if there's a version conflict
            current_version = current_entity.get('version', 1)
            if change.version <= current_version:
                # Create conflict
                current_change = DataChange(
                    change_id=str(uuid.uuid4()),
                    entity_type=change.entity_type,
                    entity_id=change.entity_id,
                    change_type=ChangeType.UPDATE,
                    data=current_entity,
                    version=current_version,
                    source_system="target_system",
                    tenant_id=change.tenant_id
                )
                
                conflict = SyncConflict(
                    conflict_id=str(uuid.uuid4()),
                    entity_type=change.entity_type,
                    entity_id=change.entity_id,
                    local_change=change,
                    remote_change=current_change,
                    conflict_type="version_conflict"
                )
                
                return conflict
            
            return None
            
        except Exception as e:
            logger.error(f"Failed to detect conflict for change {change.change_id}: {e}")
            return None
    
    async def _publish_sync_event(self, 
                                config: SyncConfiguration,
                                change: DataChange,
                                success: bool) -> None:
        """Publish synchronization event."""
        try:
            event_name = "sync_completed" if success else "sync_failed"
            
            metadata = EventMetadata(
                event_id=str(uuid.uuid4()),
                correlation_id=change.change_id,
                tenant_id=config.tenant_id,
                source_system="bidirectional_sync",
                created_at=datetime.now()
            )
            
            event = Event(
                metadata=metadata,
                event_type=EventType.INTEGRATION_EVENT,
                aggregate_id=config.sync_id,
                aggregate_type="sync_configuration",
                event_name=event_name,
                payload={
                    'sync_id': config.sync_id,
                    'change_id': change.change_id,
                    'entity_type': change.entity_type,
                    'entity_id': change.entity_id,
                    'change_type': change.change_type.value,
                    'success': success,
                    'timestamp': datetime.now().isoformat()
                }
            )
            
            await self.event_bus.publish_event(event)
            
        except Exception as e:
            logger.error(f"Failed to publish sync event: {e}")
    
    async def _publish_conflict_event(self, 
                                    conflict: SyncConflict,
                                    resolution: Optional[DataChange]) -> None:
        """Publish conflict event."""
        try:
            event_name = "conflict_resolved" if resolution else "conflict_detected"
            
            metadata = EventMetadata(
                event_id=str(uuid.uuid4()),
                correlation_id=conflict.conflict_id,
                tenant_id=conflict.local_change.tenant_id,
                source_system="bidirectional_sync",
                created_at=datetime.now()
            )
            
            payload = {
                'conflict_id': conflict.conflict_id,
                'entity_type': conflict.entity_type,
                'entity_id': conflict.entity_id,
                'conflict_type': conflict.conflict_type,
                'detected_at': conflict.detected_at.isoformat()
            }
            
            if resolution:
                payload['resolved_at'] = conflict.resolved_at.isoformat()
                payload['resolution_strategy'] = conflict.resolution_strategy.value if conflict.resolution_strategy else None
            
            event = Event(
                metadata=metadata,
                event_type=EventType.INTEGRATION_EVENT,
                aggregate_id=conflict.entity_id,
                aggregate_type=conflict.entity_type,
                event_name=event_name,
                payload=payload
            )
            
            await self.event_bus.publish_event(event)
            
        except Exception as e:
            logger.error(f"Failed to publish conflict event: {e}")
    
    def _update_sync_metrics(self, sync_time: float, success: bool) -> None:
        """Update synchronization metrics."""
        self.metrics['total_syncs'] += 1
        
        if success:
            self.metrics['successful_syncs'] += 1
            
            # Update average sync time
            current_avg = self.metrics['avg_sync_time']
            total_successful = self.metrics['successful_syncs']
            
            if total_successful == 1:
                self.metrics['avg_sync_time'] = sync_time
            else:
                self.metrics['avg_sync_time'] = (
                    (current_avg * (total_successful - 1) + sync_time) / total_successful
                )
        else:
            self.metrics['failed_syncs'] += 1
    
    def get_sync_status(self, sync_id: Optional[str] = None) -> Dict[str, Any]:
        """Get synchronization status."""
        if sync_id:
            if sync_id in self.sync_states:
                state = self.sync_states[sync_id]
                config = self.sync_configurations[sync_id]
                
                return {
                    'sync_id': sync_id,
                    'name': config.name,
                    'status': state.status.value,
                    'last_sync': state.last_sync_timestamp.isoformat() if state.last_sync_timestamp else None,
                    'last_successful_sync': state.last_successful_sync.isoformat() if state.last_successful_sync else None,
                    'total_synced': state.total_synced,
                    'error_count': state.error_count,
                    'pending_changes': len(self.pending_changes.get(sync_id, [])),
                    'conflicts': len([c for c in self.conflicts.values() if c.entity_type in config.entity_types])
                }
            else:
                return {'error': f'Sync configuration {sync_id} not found'}
        else:
            # Return status for all syncs
            return {
                'syncs': [
                    self.get_sync_status(sid) 
                    for sid in self.sync_configurations.keys()
                ],
                'metrics': self.metrics.copy(),
                'total_conflicts': len(self.conflicts)
            }
    
    async def resolve_conflict_manually(self, 
                                      conflict_id: str, 
                                      resolution_data: Dict[str, Any],
                                      resolved_by: str) -> bool:
        """Manually resolve a conflict."""
        try:
            if conflict_id not in self.conflicts:
                logger.error(f"Conflict {conflict_id} not found")
                return False
            
            conflict = self.conflicts[conflict_id]
            
            # Create resolved change
            resolved_change = DataChange(
                change_id=str(uuid.uuid4()),
                entity_type=conflict.entity_type,
                entity_id=conflict.entity_id,
                change_type=conflict.local_change.change_type,
                data=resolution_data,
                metadata={
                    'manual_resolution': True,
                    'resolved_by': resolved_by,
                    'original_conflict': conflict_id
                },
                source_system='manual_resolution',
                tenant_id=conflict.local_change.tenant_id
            )
            
            # Update conflict
            conflict.resolved_at = datetime.now()
            conflict.resolved_by = resolved_by
            conflict.resolution_data = resolution_data
            conflict.resolution_strategy = ConflictResolutionStrategy.MANUAL_RESOLUTION
            
            # Remove from pending conflicts
            del self.conflicts[conflict_id]
            
            # Publish resolution event
            await self._publish_conflict_event(conflict, resolved_change)
            
            logger.info(f"Manually resolved conflict {conflict_id}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to manually resolve conflict {conflict_id}: {e}")
            return False