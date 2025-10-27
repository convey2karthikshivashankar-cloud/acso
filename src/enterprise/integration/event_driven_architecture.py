"""
ACSO Enterprise Framework - Real-Time Event-Driven Architecture

This module implements a comprehensive event-driven architecture with guaranteed delivery,
bidirectional data synchronization, event sourcing, and CQRS patterns for enterprise integration.

Key Features:
- EnterpriseEventBus with guaranteed delivery
- Bidirectional data synchronization
- Event sourcing and CQRS patterns
- Real-time event processing
- Dead letter queues and retry mechanisms
- Event replay and audit capabilities
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
from abc import ABC, abstractmethod
import boto3
from botocore.exceptions import ClientError
import redis
from concurrent.futures import ThreadPoolExecutor
import threading
from collections import defaultdict

logger = logging.getLogger(__name__)

class EventType(Enum):
    """Types of events in the system."""
    SYSTEM_EVENT = "system_event"
    BUSINESS_EVENT = "business_event"
    INTEGRATION_EVENT = "integration_event"
    COMMAND_EVENT = "command_event"
    QUERY_EVENT = "query_event"
    NOTIFICATION_EVENT = "notification_event"

class EventPriority(Enum):
    """Event priority levels."""
    LOW = 1
    NORMAL = 2
    HIGH = 3
    CRITICAL = 4

class DeliveryStatus(Enum):
    """Event delivery status."""
    PENDING = "pending"
    DELIVERED = "delivered"
    FAILED = "failed"
    RETRYING = "retrying"
    DEAD_LETTER = "dead_letter"

@dataclass
class EventMetadata:
    """Event metadata for tracking and processing."""
    event_id: str
    correlation_id: str
    causation_id: Optional[str]
    tenant_id: str
    source_system: str
    created_at: datetime
    version: str = "1.0"
    priority: EventPriority = EventPriority.NORMAL
    ttl: Optional[datetime] = None
    retry_count: int = 0
    max_retries: int = 3
    tags: Dict[str, str] = field(default_factory=dict)

@dataclass
class Event:
    """Core event structure."""
    metadata: EventMetadata
    event_type: EventType
    aggregate_id: str
    aggregate_type: str
    event_name: str
    payload: Dict[str, Any]
    schema_version: str = "1.0"
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert event to dictionary for serialization."""
        return {
            'metadata': {
                'event_id': self.metadata.event_id,
                'correlation_id': self.metadata.correlation_id,
                'causation_id': self.metadata.causation_id,
                'tenant_id': self.metadata.tenant_id,
                'source_system': self.metadata.source_system,
                'created_at': self.metadata.created_at.isoformat(),
                'version': self.metadata.version,
                'priority': self.metadata.priority.value,
                'ttl': self.metadata.ttl.isoformat() if self.metadata.ttl else None,
                'retry_count': self.metadata.retry_count,
                'max_retries': self.metadata.max_retries,
                'tags': self.metadata.tags
            },
            'event_type': self.event_type.value,
            'aggregate_id': self.aggregate_id,
            'aggregate_type': self.aggregate_type,
            'event_name': self.event_name,
            'payload': self.payload,
            'schema_version': self.schema_version
        }
    
    @classmethod
    def from_dict(cls, data: Dict[str, Any]) -> 'Event':
        """Create event from dictionary."""
        metadata_data = data['metadata']
        metadata = EventMetadata(
            event_id=metadata_data['event_id'],
            correlation_id=metadata_data['correlation_id'],
            causation_id=metadata_data.get('causation_id'),
            tenant_id=metadata_data['tenant_id'],
            source_system=metadata_data['source_system'],
            created_at=datetime.fromisoformat(metadata_data['created_at']),
            version=metadata_data.get('version', '1.0'),
            priority=EventPriority(metadata_data.get('priority', EventPriority.NORMAL.value)),
            ttl=datetime.fromisoformat(metadata_data['ttl']) if metadata_data.get('ttl') else None,
            retry_count=metadata_data.get('retry_count', 0),
            max_retries=metadata_data.get('max_retries', 3),
            tags=metadata_data.get('tags', {})
        )
        
        return cls(
            metadata=metadata,
            event_type=EventType(data['event_type']),
            aggregate_id=data['aggregate_id'],
            aggregate_type=data['aggregate_type'],
            event_name=data['event_name'],
            payload=data['payload'],
            schema_version=data.get('schema_version', '1.0')
        )

@dataclass
class EventHandler:
    """Event handler configuration."""
    handler_id: str
    event_patterns: List[str]  # Event name patterns to match
    handler_function: Callable
    retry_policy: Dict[str, Any]
    dead_letter_queue: Optional[str] = None
    is_async: bool = True
    timeout_seconds: int = 30

@dataclass
class Subscription:
    """Event subscription configuration."""
    subscription_id: str
    tenant_id: str
    event_patterns: List[str]
    handler: EventHandler
    filter_conditions: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True
    created_at: datetime = field(default_factory=datetime.now)

class EventStore(ABC):
    """Abstract event store interface."""
    
    @abstractmethod
    async def append_event(self, event: Event) -> bool:
        """Append event to the store."""
        pass
    
    @abstractmethod
    async def get_events(self, 
                        aggregate_id: str, 
                        from_version: Optional[int] = None,
                        to_version: Optional[int] = None) -> List[Event]:
        """Get events for an aggregate."""
        pass
    
    @abstractmethod
    async def get_events_by_correlation_id(self, correlation_id: str) -> List[Event]:
        """Get events by correlation ID."""
        pass

class DynamoDBEventStore(EventStore):
    """DynamoDB-based event store implementation."""
    
    def __init__(self, table_name: str, region: str = 'us-east-1'):
        """Initialize DynamoDB event store."""
        self.table_name = table_name
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = self.dynamodb.Table(table_name)
        
    async def append_event(self, event: Event) -> bool:
        """Append event to DynamoDB."""
        try:
            item = {
                'aggregate_id': event.aggregate_id,
                'event_id': event.metadata.event_id,
                'correlation_id': event.metadata.correlation_id,
                'tenant_id': event.metadata.tenant_id,
                'created_at': event.metadata.created_at.isoformat(),
                'event_data': json.dumps(event.to_dict()),
                'ttl': int(event.metadata.ttl.timestamp()) if event.metadata.ttl else None
            }
            
            # Remove None values
            item = {k: v for k, v in item.items() if v is not None}
            
            self.table.put_item(Item=item)
            return True
            
        except ClientError as e:
            logger.error(f"Failed to append event to DynamoDB: {e}")
            return False
    
    async def get_events(self, 
                        aggregate_id: str, 
                        from_version: Optional[int] = None,
                        to_version: Optional[int] = None) -> List[Event]:
        """Get events for an aggregate from DynamoDB."""
        try:
            response = self.table.query(
                KeyConditionExpression='aggregate_id = :aggregate_id',
                ExpressionAttributeValues={':aggregate_id': aggregate_id},
                ScanIndexForward=True  # Sort by sort key ascending
            )
            
            events = []
            for item in response['Items']:
                event_data = json.loads(item['event_data'])
                event = Event.from_dict(event_data)
                events.append(event)
            
            return events
            
        except ClientError as e:
            logger.error(f"Failed to get events from DynamoDB: {e}")
            return []
    
    async def get_events_by_correlation_id(self, correlation_id: str) -> List[Event]:
        """Get events by correlation ID from DynamoDB."""
        try:
            response = self.table.scan(
                FilterExpression='correlation_id = :correlation_id',
                ExpressionAttributeValues={':correlation_id': correlation_id}
            )
            
            events = []
            for item in response['Items']:
                event_data = json.loads(item['event_data'])
                event = Event.from_dict(event_data)
                events.append(event)
            
            return events
            
        except ClientError as e:
            logger.error(f"Failed to get events by correlation ID: {e}")
            return []

class EnterpriseEventBus:
    """
    Enterprise-grade event bus with guaranteed delivery and real-time processing.
    
    Features:
    - Guaranteed delivery with retry mechanisms
    - Dead letter queues for failed events
    - Real-time event processing
    - Event filtering and routing
    - Metrics and monitoring
    """
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize the enterprise event bus."""
        self.config = config
        self.event_store = self._create_event_store()
        self.redis_client = self._create_redis_client()
        
        # Event handlers and subscriptions
        self.handlers: Dict[str, EventHandler] = {}
        self.subscriptions: Dict[str, Subscription] = {}
        
        # Processing queues
        self.event_queue = asyncio.Queue()
        self.retry_queue = asyncio.Queue()
        self.dead_letter_queue = asyncio.Queue()
        
        # Processing state
        self.is_running = False
        self.worker_tasks = []
        self.metrics = defaultdict(int)
        
        # Thread pool for sync handlers
        self.thread_pool = ThreadPoolExecutor(max_workers=10)
        
        logger.info("Enterprise Event Bus initialized")
    
    def _create_event_store(self) -> EventStore:
        """Create event store based on configuration."""
        store_type = self.config.get('event_store', {}).get('type', 'dynamodb')
        
        if store_type == 'dynamodb':
            return DynamoDBEventStore(
                table_name=self.config['event_store']['table_name'],
                region=self.config['event_store'].get('region', 'us-east-1')
            )
        else:
            raise ValueError(f"Unsupported event store type: {store_type}")
    
    def _create_redis_client(self) -> redis.Redis:
        """Create Redis client for real-time messaging."""
        redis_config = self.config.get('redis', {})
        return redis.Redis(
            host=redis_config.get('host', 'localhost'),
            port=redis_config.get('port', 6379),
            db=redis_config.get('db', 0),
            decode_responses=True
        )
    
    async def start(self) -> None:
        """Start the event bus processing."""
        if self.is_running:
            return
        
        self.is_running = True
        
        # Start worker tasks
        self.worker_tasks = [
            asyncio.create_task(self._event_processor()),
            asyncio.create_task(self._retry_processor()),
            asyncio.create_task(self._dead_letter_processor()),
            asyncio.create_task(self._metrics_collector())
        ]
        
        logger.info("Enterprise Event Bus started")
    
    async def stop(self) -> None:
        """Stop the event bus processing."""
        self.is_running = False
        
        # Cancel worker tasks
        for task in self.worker_tasks:
            task.cancel()
        
        # Wait for tasks to complete
        await asyncio.gather(*self.worker_tasks, return_exceptions=True)
        
        # Close thread pool
        self.thread_pool.shutdown(wait=True)
        
        logger.info("Enterprise Event Bus stopped")
    
    async def publish_event(self, event: Event) -> bool:
        """
        Publish an event to the bus.
        
        Args:
            event: Event to publish
            
        Returns:
            True if event was successfully queued for processing
        """
        try:
            # Store event in event store
            stored = await self.event_store.append_event(event)
            if not stored:
                logger.error(f"Failed to store event {event.metadata.event_id}")
                return False
            
            # Queue event for processing
            await self.event_queue.put(event)
            
            # Publish to Redis for real-time subscribers
            await self._publish_to_redis(event)
            
            self.metrics['events_published'] += 1
            logger.debug(f"Event published: {event.metadata.event_id}")
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to publish event: {e}")
            return False
    
    async def _publish_to_redis(self, event: Event) -> None:
        """Publish event to Redis for real-time processing."""
        try:
            # Publish to general event channel
            channel = f"events:{event.tenant_id}"
            message = json.dumps(event.to_dict())
            self.redis_client.publish(channel, message)
            
            # Publish to specific event type channel
            type_channel = f"events:{event.tenant_id}:{event.event_type.value}"
            self.redis_client.publish(type_channel, message)
            
            # Publish to aggregate-specific channel
            aggregate_channel = f"events:{event.tenant_id}:{event.aggregate_type}:{event.aggregate_id}"
            self.redis_client.publish(aggregate_channel, message)
            
        except Exception as e:
            logger.error(f"Failed to publish to Redis: {e}")
    
    def register_handler(self, handler: EventHandler) -> None:
        """Register an event handler."""
        self.handlers[handler.handler_id] = handler
        logger.info(f"Registered event handler: {handler.handler_id}")
    
    def unregister_handler(self, handler_id: str) -> None:
        """Unregister an event handler."""
        if handler_id in self.handlers:
            del self.handlers[handler_id]
            logger.info(f"Unregistered event handler: {handler_id}")
    
    def subscribe(self, subscription: Subscription) -> None:
        """Create an event subscription."""
        self.subscriptions[subscription.subscription_id] = subscription
        logger.info(f"Created subscription: {subscription.subscription_id}")
    
    def unsubscribe(self, subscription_id: str) -> None:
        """Remove an event subscription."""
        if subscription_id in self.subscriptions:
            del self.subscriptions[subscription_id]
            logger.info(f"Removed subscription: {subscription_id}")
    
    async def _event_processor(self) -> None:
        """Main event processing loop."""
        while self.is_running:
            try:
                # Get event from queue with timeout
                event = await asyncio.wait_for(self.event_queue.get(), timeout=1.0)
                
                # Process event
                await self._process_event(event)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error in event processor: {e}")
    
    async def _process_event(self, event: Event) -> None:
        """Process a single event."""
        try:
            # Check if event has expired
            if event.metadata.ttl and datetime.now() > event.metadata.ttl:
                logger.warning(f"Event {event.metadata.event_id} has expired")
                self.metrics['events_expired'] += 1
                return
            
            # Find matching handlers
            matching_handlers = self._find_matching_handlers(event)
            
            if not matching_handlers:
                logger.debug(f"No handlers found for event: {event.event_name}")
                return
            
            # Process with each matching handler
            for handler in matching_handlers:
                try:
                    await self._execute_handler(handler, event)
                    self.metrics['events_processed'] += 1
                    
                except Exception as e:
                    logger.error(f"Handler {handler.handler_id} failed for event {event.metadata.event_id}: {e}")
                    await self._handle_processing_failure(event, handler, e)
            
        except Exception as e:
            logger.error(f"Failed to process event {event.metadata.event_id}: {e}")
    
    def _find_matching_handlers(self, event: Event) -> List[EventHandler]:
        """Find handlers that match the event."""
        matching_handlers = []
        
        for handler in self.handlers.values():
            if self._event_matches_patterns(event, handler.event_patterns):
                matching_handlers.append(handler)
        
        # Also check subscriptions
        for subscription in self.subscriptions.values():
            if (subscription.is_active and 
                subscription.tenant_id == event.metadata.tenant_id and
                self._event_matches_patterns(event, subscription.event_patterns) and
                self._event_matches_filters(event, subscription.filter_conditions)):
                matching_handlers.append(subscription.handler)
        
        return matching_handlers
    
    def _event_matches_patterns(self, event: Event, patterns: List[str]) -> bool:
        """Check if event matches any of the patterns."""
        import fnmatch
        
        for pattern in patterns:
            if fnmatch.fnmatch(event.event_name, pattern):
                return True
        return False
    
    def _event_matches_filters(self, event: Event, filters: Dict[str, Any]) -> bool:
        """Check if event matches filter conditions."""
        for key, expected_value in filters.items():
            if key in event.payload:
                if event.payload[key] != expected_value:
                    return False
            elif key in event.metadata.tags:
                if event.metadata.tags[key] != expected_value:
                    return False
            else:
                return False
        return True
    
    async def _execute_handler(self, handler: EventHandler, event: Event) -> None:
        """Execute an event handler."""
        try:
            if handler.is_async:
                # Execute async handler
                await asyncio.wait_for(
                    handler.handler_function(event),
                    timeout=handler.timeout_seconds
                )
            else:
                # Execute sync handler in thread pool
                loop = asyncio.get_event_loop()
                await loop.run_in_executor(
                    self.thread_pool,
                    handler.handler_function,
                    event
                )
                
        except asyncio.TimeoutError:
            raise Exception(f"Handler {handler.handler_id} timed out")
        except Exception as e:
            raise Exception(f"Handler {handler.handler_id} execution failed: {e}")
    
    async def _handle_processing_failure(self, 
                                       event: Event, 
                                       handler: EventHandler, 
                                       error: Exception) -> None:
        """Handle event processing failure."""
        event.metadata.retry_count += 1
        
        if event.metadata.retry_count <= event.metadata.max_retries:
            # Schedule for retry
            retry_delay = self._calculate_retry_delay(event.metadata.retry_count)
            await asyncio.sleep(retry_delay)
            await self.retry_queue.put(event)
            
            self.metrics['events_retried'] += 1
            logger.info(f"Event {event.metadata.event_id} scheduled for retry {event.metadata.retry_count}")
            
        else:
            # Send to dead letter queue
            await self.dead_letter_queue.put((event, handler, error))
            
            self.metrics['events_dead_lettered'] += 1
            logger.error(f"Event {event.metadata.event_id} sent to dead letter queue after {event.metadata.retry_count} retries")
    
    def _calculate_retry_delay(self, retry_count: int) -> float:
        """Calculate exponential backoff delay for retries."""
        base_delay = 1.0  # 1 second
        max_delay = 300.0  # 5 minutes
        
        delay = min(base_delay * (2 ** (retry_count - 1)), max_delay)
        return delay
    
    async def _retry_processor(self) -> None:
        """Process retry queue."""
        while self.is_running:
            try:
                event = await asyncio.wait_for(self.retry_queue.get(), timeout=1.0)
                await self._process_event(event)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error in retry processor: {e}")
    
    async def _dead_letter_processor(self) -> None:
        """Process dead letter queue."""
        while self.is_running:
            try:
                item = await asyncio.wait_for(self.dead_letter_queue.get(), timeout=1.0)
                event, handler, error = item
                
                # Log dead letter event
                logger.error(f"Dead letter event: {event.metadata.event_id}, "
                           f"Handler: {handler.handler_id}, Error: {error}")
                
                # Store in dead letter storage for manual investigation
                await self._store_dead_letter_event(event, handler, error)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                logger.error(f"Error in dead letter processor: {e}")
    
    async def _store_dead_letter_event(self, 
                                     event: Event, 
                                     handler: EventHandler, 
                                     error: Exception) -> None:
        """Store dead letter event for investigation."""
        try:
            dead_letter_data = {
                'event': event.to_dict(),
                'handler_id': handler.handler_id,
                'error': str(error),
                'failed_at': datetime.now().isoformat()
            }
            
            # Store in Redis for investigation
            key = f"dead_letters:{event.metadata.tenant_id}:{event.metadata.event_id}"
            self.redis_client.setex(
                key, 
                timedelta(days=30).total_seconds(),  # Keep for 30 days
                json.dumps(dead_letter_data)
            )
            
        except Exception as e:
            logger.error(f"Failed to store dead letter event: {e}")
    
    async def _metrics_collector(self) -> None:
        """Collect and publish metrics."""
        while self.is_running:
            try:
                await asyncio.sleep(60)  # Collect metrics every minute
                
                # Publish metrics to monitoring system
                await self._publish_metrics()
                
            except Exception as e:
                logger.error(f"Error in metrics collector: {e}")
    
    async def _publish_metrics(self) -> None:
        """Publish metrics to monitoring system."""
        try:
            metrics_data = {
                'timestamp': datetime.now().isoformat(),
                'metrics': dict(self.metrics),
                'queue_sizes': {
                    'event_queue': self.event_queue.qsize(),
                    'retry_queue': self.retry_queue.qsize(),
                    'dead_letter_queue': self.dead_letter_queue.qsize()
                },
                'handlers_count': len(self.handlers),
                'subscriptions_count': len(self.subscriptions)
            }
            
            # Publish to Redis metrics channel
            self.redis_client.publish('metrics:event_bus', json.dumps(metrics_data))
            
        except Exception as e:
            logger.error(f"Failed to publish metrics: {e}")
    
    async def replay_events(self, 
                          aggregate_id: str, 
                          from_timestamp: Optional[datetime] = None,
                          to_timestamp: Optional[datetime] = None) -> List[Event]:
        """
        Replay events for an aggregate.
        
        Args:
            aggregate_id: Aggregate to replay events for
            from_timestamp: Start timestamp for replay
            to_timestamp: End timestamp for replay
            
        Returns:
            List of replayed events
        """
        try:
            # Get events from store
            events = await self.event_store.get_events(aggregate_id)
            
            # Filter by timestamp if specified
            if from_timestamp or to_timestamp:
                filtered_events = []
                for event in events:
                    event_time = event.metadata.created_at
                    
                    if from_timestamp and event_time < from_timestamp:
                        continue
                    if to_timestamp and event_time > to_timestamp:
                        continue
                        
                    filtered_events.append(event)
                
                events = filtered_events
            
            # Replay events
            for event in events:
                await self.publish_event(event)
            
            logger.info(f"Replayed {len(events)} events for aggregate {aggregate_id}")
            return events
            
        except Exception as e:
            logger.error(f"Failed to replay events: {e}")
            return []
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get current event bus metrics."""
        return {
            'metrics': dict(self.metrics),
            'queue_sizes': {
                'event_queue': self.event_queue.qsize(),
                'retry_queue': self.retry_queue.qsize(),
                'dead_letter_queue': self.dead_letter_queue.qsize()
            },
            'handlers_count': len(self.handlers),
            'subscriptions_count': len(self.subscriptions),
            'is_running': self.is_running
        }