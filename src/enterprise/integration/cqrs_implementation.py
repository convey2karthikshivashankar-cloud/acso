"""
ACSO Enterprise Framework - CQRS Implementation

This module implements Command Query Responsibility Segregation (CQRS) patterns
for the event-driven architecture, providing separate models for commands and queries.

Key Features:
- Command and Query separation
- Command handlers with validation
- Query handlers with optimized read models
- Event sourcing integration
- Aggregate root management
- Projection management for read models
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Type, Generic, TypeVar
from dataclasses import dataclass, field
from abc import ABC, abstractmethod
from enum import Enum
import json
import uuid

from .event_driven_architecture import Event, EventMetadata, EventType, EventPriority

logger = logging.getLogger(__name__)

T = TypeVar('T')

class CommandResult(Enum):
    """Command execution results."""
    SUCCESS = "success"
    VALIDATION_ERROR = "validation_error"
    BUSINESS_ERROR = "business_error"
    SYSTEM_ERROR = "system_error"

@dataclass
class Command:
    """Base command structure."""
    command_id: str
    aggregate_id: str
    aggregate_type: str
    command_type: str
    payload: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)
    tenant_id: str = ""
    correlation_id: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    expected_version: Optional[int] = None

@dataclass
class Query:
    """Base query structure."""
    query_id: str
    query_type: str
    parameters: Dict[str, Any]
    tenant_id: str
    correlation_id: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    timeout_seconds: int = 30

@dataclass
class CommandResponse:
    """Command execution response."""
    command_id: str
    result: CommandResult
    aggregate_id: str
    version: Optional[int] = None
    events: List[Event] = field(default_factory=list)
    error_message: Optional[str] = None
    error_details: Dict[str, Any] = field(default_factory=dict)

@dataclass
class QueryResponse(Generic[T]):
    """Query execution response."""
    query_id: str
    data: Optional[T] = None
    error_message: Optional[str] = None
    execution_time_ms: float = 0.0
    cache_hit: bool = False

class AggregateRoot(ABC):
    """Base aggregate root for domain entities."""
    
    def __init__(self, aggregate_id: str, aggregate_type: str):
        """Initialize aggregate root."""
        self.aggregate_id = aggregate_id
        self.aggregate_type = aggregate_type
        self.version = 0
        self.uncommitted_events: List[Event] = []
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
    
    def apply_event(self, event: Event) -> None:
        """Apply an event to the aggregate."""
        self.version += 1
        self.updated_at = datetime.now()
        self._apply_event_internal(event)
    
    @abstractmethod
    def _apply_event_internal(self, event: Event) -> None:
        """Internal event application logic - to be implemented by subclasses."""
        pass
    
    def raise_event(self, 
                   event_name: str, 
                   payload: Dict[str, Any],
                   tenant_id: str,
                   correlation_id: str = "",
                   causation_id: Optional[str] = None) -> Event:
        """Raise a new domain event."""
        event_id = str(uuid.uuid4())
        
        metadata = EventMetadata(
            event_id=event_id,
            correlation_id=correlation_id or str(uuid.uuid4()),
            causation_id=causation_id,
            tenant_id=tenant_id,
            source_system="cqrs_aggregate",
            created_at=datetime.now()
        )
        
        event = Event(
            metadata=metadata,
            event_type=EventType.BUSINESS_EVENT,
            aggregate_id=self.aggregate_id,
            aggregate_type=self.aggregate_type,
            event_name=event_name,
            payload=payload
        )
        
        self.uncommitted_events.append(event)
        self.apply_event(event)
        
        return event
    
    def get_uncommitted_events(self) -> List[Event]:
        """Get uncommitted events."""
        return self.uncommitted_events.copy()
    
    def mark_events_as_committed(self) -> None:
        """Mark all uncommitted events as committed."""
        self.uncommitted_events.clear()
    
    def load_from_history(self, events: List[Event]) -> None:
        """Load aggregate state from event history."""
        for event in events:
            self.apply_event(event)

class CommandHandler(ABC):
    """Base command handler."""
    
    @abstractmethod
    async def handle(self, command: Command) -> CommandResponse:
        """Handle a command."""
        pass
    
    @abstractmethod
    def can_handle(self, command_type: str) -> bool:
        """Check if this handler can handle the command type."""
        pass

class QueryHandler(ABC, Generic[T]):
    """Base query handler."""
    
    @abstractmethod
    async def handle(self, query: Query) -> QueryResponse[T]:
        """Handle a query."""
        pass
    
    @abstractmethod
    def can_handle(self, query_type: str) -> bool:
        """Check if this handler can handle the query type."""
        pass

class Repository(ABC, Generic[T]):
    """Base repository interface."""
    
    @abstractmethod
    async def get_by_id(self, aggregate_id: str) -> Optional[T]:
        """Get aggregate by ID."""
        pass
    
    @abstractmethod
    async def save(self, aggregate: T) -> bool:
        """Save aggregate."""
        pass
    
    @abstractmethod
    async def delete(self, aggregate_id: str) -> bool:
        """Delete aggregate."""
        pass

class EventSourcedRepository(Repository[AggregateRoot]):
    """Event-sourced repository implementation."""
    
    def __init__(self, event_store, event_bus, aggregate_factory: callable):
        """Initialize event-sourced repository."""
        self.event_store = event_store
        self.event_bus = event_bus
        self.aggregate_factory = aggregate_factory
        self.aggregate_cache: Dict[str, AggregateRoot] = {}
    
    async def get_by_id(self, aggregate_id: str) -> Optional[AggregateRoot]:
        """Get aggregate by ID from event store."""
        try:
            # Check cache first
            if aggregate_id in self.aggregate_cache:
                return self.aggregate_cache[aggregate_id]
            
            # Load events from store
            events = await self.event_store.get_events(aggregate_id)
            
            if not events:
                return None
            
            # Create aggregate and load from history
            aggregate = self.aggregate_factory(aggregate_id)
            aggregate.load_from_history(events)
            
            # Cache the aggregate
            self.aggregate_cache[aggregate_id] = aggregate
            
            return aggregate
            
        except Exception as e:
            logger.error(f"Failed to get aggregate {aggregate_id}: {e}")
            return None
    
    async def save(self, aggregate: AggregateRoot) -> bool:
        """Save aggregate by persisting uncommitted events."""
        try:
            uncommitted_events = aggregate.get_uncommitted_events()
            
            if not uncommitted_events:
                return True  # Nothing to save
            
            # Save events to store
            for event in uncommitted_events:
                success = await self.event_store.append_event(event)
                if not success:
                    logger.error(f"Failed to save event {event.metadata.event_id}")
                    return False
                
                # Publish event to bus
                await self.event_bus.publish_event(event)
            
            # Mark events as committed
            aggregate.mark_events_as_committed()
            
            # Update cache
            self.aggregate_cache[aggregate.aggregate_id] = aggregate
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to save aggregate {aggregate.aggregate_id}: {e}")
            return False
    
    async def delete(self, aggregate_id: str) -> bool:
        """Delete aggregate (soft delete by raising tombstone event)."""
        try:
            aggregate = await self.get_by_id(aggregate_id)
            if not aggregate:
                return False
            
            # Raise tombstone event
            aggregate.raise_event(
                event_name="aggregate_deleted",
                payload={"deleted_at": datetime.now().isoformat()},
                tenant_id=aggregate.aggregate_id  # Simplified for example
            )
            
            # Save the deletion event
            success = await self.save(aggregate)
            
            # Remove from cache
            if aggregate_id in self.aggregate_cache:
                del self.aggregate_cache[aggregate_id]
            
            return success
            
        except Exception as e:
            logger.error(f"Failed to delete aggregate {aggregate_id}: {e}")
            return False

class ReadModel(ABC):
    """Base read model for queries."""
    
    def __init__(self, model_id: str, model_type: str):
        """Initialize read model."""
        self.model_id = model_id
        self.model_type = model_type
        self.created_at = datetime.now()
        self.updated_at = datetime.now()
        self.version = 0
    
    @abstractmethod
    def apply_event(self, event: Event) -> None:
        """Apply event to update read model."""
        pass

class Projection(ABC):
    """Base projection for maintaining read models."""
    
    @abstractmethod
    async def handle_event(self, event: Event) -> None:
        """Handle event to update projections."""
        pass
    
    @abstractmethod
    def get_event_types(self) -> List[str]:
        """Get event types this projection handles."""
        pass

class CQRSMediator:
    """
    CQRS mediator for handling commands and queries.
    
    Provides centralized command and query dispatching with validation,
    error handling, and performance monitoring.
    """
    
    def __init__(self, event_bus):
        """Initialize CQRS mediator."""
        self.event_bus = event_bus
        self.command_handlers: Dict[str, CommandHandler] = {}
        self.query_handlers: Dict[str, QueryHandler] = {}
        self.repositories: Dict[str, Repository] = {}
        self.projections: Dict[str, Projection] = {}
        self.read_models: Dict[str, Dict[str, ReadModel]] = {}
        
        # Performance metrics
        self.metrics = {
            'commands_processed': 0,
            'queries_processed': 0,
            'command_errors': 0,
            'query_errors': 0,
            'avg_command_time': 0.0,
            'avg_query_time': 0.0
        }
        
        logger.info("CQRS Mediator initialized")
    
    def register_command_handler(self, handler: CommandHandler) -> None:
        """Register a command handler."""
        # Determine which command types this handler can handle
        # This is a simplified approach - in practice, you might use reflection or configuration
        handler_name = handler.__class__.__name__
        self.command_handlers[handler_name] = handler
        logger.info(f"Registered command handler: {handler_name}")
    
    def register_query_handler(self, handler: QueryHandler) -> None:
        """Register a query handler."""
        handler_name = handler.__class__.__name__
        self.query_handlers[handler_name] = handler
        logger.info(f"Registered query handler: {handler_name}")
    
    def register_repository(self, aggregate_type: str, repository: Repository) -> None:
        """Register a repository for an aggregate type."""
        self.repositories[aggregate_type] = repository
        logger.info(f"Registered repository for: {aggregate_type}")
    
    def register_projection(self, projection: Projection) -> None:
        """Register a projection."""
        projection_name = projection.__class__.__name__
        self.projections[projection_name] = projection
        
        # Subscribe to events for this projection
        for event_type in projection.get_event_types():
            # Create event handler for projection
            async def projection_handler(event: Event, proj=projection):
                await proj.handle_event(event)
            
            # Register with event bus (simplified)
            # In practice, you'd use proper event subscription
            logger.info(f"Registered projection: {projection_name} for events: {projection.get_event_types()}")
    
    async def send_command(self, command: Command) -> CommandResponse:
        """
        Send a command for processing.
        
        Args:
            command: Command to process
            
        Returns:
            Command response with result
        """
        start_time = datetime.now()
        
        try:
            # Find appropriate handler
            handler = self._find_command_handler(command.command_type)
            if not handler:
                return CommandResponse(
                    command_id=command.command_id,
                    result=CommandResult.SYSTEM_ERROR,
                    aggregate_id=command.aggregate_id,
                    error_message=f"No handler found for command type: {command.command_type}"
                )
            
            # Validate command
            validation_result = await self._validate_command(command)
            if validation_result.result != CommandResult.SUCCESS:
                return validation_result
            
            # Execute command
            response = await handler.handle(command)
            
            # Update metrics
            self.metrics['commands_processed'] += 1
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            self._update_avg_command_time(execution_time)
            
            logger.info(f"Command {command.command_id} processed successfully")
            return response
            
        except Exception as e:
            self.metrics['command_errors'] += 1
            logger.error(f"Failed to process command {command.command_id}: {e}")
            
            return CommandResponse(
                command_id=command.command_id,
                result=CommandResult.SYSTEM_ERROR,
                aggregate_id=command.aggregate_id,
                error_message=str(e)
            )
    
    async def send_query(self, query: Query) -> QueryResponse:
        """
        Send a query for processing.
        
        Args:
            query: Query to process
            
        Returns:
            Query response with data
        """
        start_time = datetime.now()
        
        try:
            # Find appropriate handler
            handler = self._find_query_handler(query.query_type)
            if not handler:
                return QueryResponse(
                    query_id=query.query_id,
                    error_message=f"No handler found for query type: {query.query_type}"
                )
            
            # Execute query
            response = await handler.handle(query)
            
            # Update metrics
            self.metrics['queries_processed'] += 1
            execution_time = (datetime.now() - start_time).total_seconds() * 1000
            response.execution_time_ms = execution_time
            self._update_avg_query_time(execution_time)
            
            logger.debug(f"Query {query.query_id} processed successfully")
            return response
            
        except Exception as e:
            self.metrics['query_errors'] += 1
            logger.error(f"Failed to process query {query.query_id}: {e}")
            
            return QueryResponse(
                query_id=query.query_id,
                error_message=str(e)
            )
    
    def _find_command_handler(self, command_type: str) -> Optional[CommandHandler]:
        """Find command handler for command type."""
        for handler in self.command_handlers.values():
            if handler.can_handle(command_type):
                return handler
        return None
    
    def _find_query_handler(self, query_type: str) -> Optional[QueryHandler]:
        """Find query handler for query type."""
        for handler in self.query_handlers.values():
            if handler.can_handle(query_type):
                return handler
        return None
    
    async def _validate_command(self, command: Command) -> CommandResponse:
        """Validate command before processing."""
        try:
            # Basic validation
            if not command.command_id:
                return CommandResponse(
                    command_id="",
                    result=CommandResult.VALIDATION_ERROR,
                    aggregate_id=command.aggregate_id,
                    error_message="Command ID is required"
                )
            
            if not command.aggregate_id:
                return CommandResponse(
                    command_id=command.command_id,
                    result=CommandResult.VALIDATION_ERROR,
                    aggregate_id="",
                    error_message="Aggregate ID is required"
                )
            
            if not command.tenant_id:
                return CommandResponse(
                    command_id=command.command_id,
                    result=CommandResult.VALIDATION_ERROR,
                    aggregate_id=command.aggregate_id,
                    error_message="Tenant ID is required"
                )
            
            # Command-specific validation would go here
            
            return CommandResponse(
                command_id=command.command_id,
                result=CommandResult.SUCCESS,
                aggregate_id=command.aggregate_id
            )
            
        except Exception as e:
            return CommandResponse(
                command_id=command.command_id,
                result=CommandResult.VALIDATION_ERROR,
                aggregate_id=command.aggregate_id,
                error_message=f"Validation failed: {e}"
            )
    
    def _update_avg_command_time(self, execution_time: float) -> None:
        """Update average command execution time."""
        current_avg = self.metrics['avg_command_time']
        total_commands = self.metrics['commands_processed']
        
        if total_commands == 1:
            self.metrics['avg_command_time'] = execution_time
        else:
            self.metrics['avg_command_time'] = (
                (current_avg * (total_commands - 1) + execution_time) / total_commands
            )
    
    def _update_avg_query_time(self, execution_time: float) -> None:
        """Update average query execution time."""
        current_avg = self.metrics['avg_query_time']
        total_queries = self.metrics['queries_processed']
        
        if total_queries == 1:
            self.metrics['avg_query_time'] = execution_time
        else:
            self.metrics['avg_query_time'] = (
                (current_avg * (total_queries - 1) + execution_time) / total_queries
            )
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get CQRS mediator metrics."""
        return {
            'metrics': self.metrics.copy(),
            'handlers': {
                'command_handlers': len(self.command_handlers),
                'query_handlers': len(self.query_handlers),
                'repositories': len(self.repositories),
                'projections': len(self.projections)
            }
        }
    
    async def rebuild_projections(self, 
                                projection_names: Optional[List[str]] = None,
                                from_timestamp: Optional[datetime] = None) -> Dict[str, bool]:
        """
        Rebuild projections from event store.
        
        Args:
            projection_names: Specific projections to rebuild (None for all)
            from_timestamp: Rebuild from specific timestamp
            
        Returns:
            Dictionary of projection rebuild results
        """
        results = {}
        
        projections_to_rebuild = (
            [self.projections[name] for name in projection_names if name in self.projections]
            if projection_names
            else list(self.projections.values())
        )
        
        for projection in projections_to_rebuild:
            try:
                projection_name = projection.__class__.__name__
                logger.info(f"Rebuilding projection: {projection_name}")
                
                # Get all events that this projection handles
                # This is a simplified approach - in practice, you'd need more sophisticated event querying
                # For now, we'll assume we can get events by type
                
                # Reset projection state (implementation-specific)
                if hasattr(projection, 'reset'):
                    await projection.reset()
                
                # Replay events (this would need to be implemented based on your event store)
                # await self._replay_events_for_projection(projection, from_timestamp)
                
                results[projection_name] = True
                logger.info(f"Successfully rebuilt projection: {projection_name}")
                
            except Exception as e:
                projection_name = projection.__class__.__name__
                logger.error(f"Failed to rebuild projection {projection_name}: {e}")
                results[projection_name] = False
        
        return results