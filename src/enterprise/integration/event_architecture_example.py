"""
ACSO Enterprise Framework - Event-Driven Architecture Example

This module demonstrates the complete event-driven architecture with CQRS,
bidirectional synchronization, and real-time processing capabilities.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json
import uuid

from .event_driven_architecture import (
    EnterpriseEventBus, Event, EventMetadata, EventType, EventPriority,
    EventHandler, Subscription
)
from .cqrs_implementation import (
    CQRSMediator, Command, Query, CommandResponse, QueryResponse,
    AggregateRoot, CommandHandler, QueryHandler, EventSourcedRepository
)
from .bidirectional_sync import (
    BidirectionalSyncEngine, SyncConfiguration, SyncDirection,
    DataConnector, DataChange, ChangeType, ConflictResolutionStrategy
)

logger = logging.getLogger(__name__)

# Example Domain Models

class CustomerAggregate(AggregateRoot):
    """Example customer aggregate for demonstration."""
    
    def __init__(self, aggregate_id: str):
        """Initialize customer aggregate."""
        super().__init__(aggregate_id, "customer")
        self.name = ""
        self.email = ""
        self.status = "active"
        self.created_at = datetime.now()
    
    def _apply_event_internal(self, event: Event) -> None:
        """Apply event to customer aggregate."""
        if event.event_name == "customer_created":
            self.name = event.payload.get("name", "")
            self.email = event.payload.get("email", "")
            self.status = "active"
            self.created_at = datetime.fromisoformat(event.payload.get("created_at", datetime.now().isoformat()))
        
        elif event.event_name == "customer_updated":
            if "name" in event.payload:
                self.name = event.payload["name"]
            if "email" in event.payload:
                self.email = event.payload["email"]
        
        elif event.event_name == "customer_deactivated":
            self.status = "inactive"
    
    def create_customer(self, name: str, email: str, tenant_id: str) -> None:
        """Create a new customer."""
        self.raise_event(
            event_name="customer_created",
            payload={
                "name": name,
                "email": email,
                "created_at": datetime.now().isoformat()
            },
            tenant_id=tenant_id
        )
    
    def update_customer(self, name: Optional[str] = None, email: Optional[str] = None, tenant_id: str = "") -> None:
        """Update customer information."""
        payload = {}
        if name is not None:
            payload["name"] = name
        if email is not None:
            payload["email"] = email
        
        if payload:
            self.raise_event(
                event_name="customer_updated",
                payload=payload,
                tenant_id=tenant_id
            )
    
    def deactivate_customer(self, tenant_id: str) -> None:
        """Deactivate customer."""
        self.raise_event(
            event_name="customer_deactivated",
            payload={"deactivated_at": datetime.now().isoformat()},
            tenant_id=tenant_id
        )

# Example Command Handlers

class CreateCustomerCommandHandler(CommandHandler):
    """Handler for creating customers."""
    
    def __init__(self, repository: EventSourcedRepository):
        """Initialize command handler."""
        self.repository = repository
    
    async def handle(self, command: Command) -> CommandResponse:
        """Handle create customer command."""
        try:
            # Validate command
            if not command.payload.get("name") or not command.payload.get("email"):
                return CommandResponse(
                    command_id=command.command_id,
                    result="validation_error",
                    aggregate_id=command.aggregate_id,
                    error_message="Name and email are required"
                )
            
            # Check if customer already exists
            existing_customer = await self.repository.get_by_id(command.aggregate_id)
            if existing_customer:
                return CommandResponse(
                    command_id=command.command_id,
                    result="business_error",
                    aggregate_id=command.aggregate_id,
                    error_message="Customer already exists"
                )
            
            # Create new customer
            customer = CustomerAggregate(command.aggregate_id)
            customer.create_customer(
                name=command.payload["name"],
                email=command.payload["email"],
                tenant_id=command.tenant_id
            )
            
            # Save customer
            success = await self.repository.save(customer)
            
            if success:
                return CommandResponse(
                    command_id=command.command_id,
                    result="success",
                    aggregate_id=command.aggregate_id,
                    version=customer.version,
                    events=customer.get_uncommitted_events()
                )
            else:
                return CommandResponse(
                    command_id=command.command_id,
                    result="system_error",
                    aggregate_id=command.aggregate_id,
                    error_message="Failed to save customer"
                )
                
        except Exception as e:
            logger.error(f"Failed to handle create customer command: {e}")
            return CommandResponse(
                command_id=command.command_id,
                result="system_error",
                aggregate_id=command.aggregate_id,
                error_message=str(e)
            )
    
    def can_handle(self, command_type: str) -> bool:
        """Check if can handle command type."""
        return command_type == "create_customer"

class UpdateCustomerCommandHandler(CommandHandler):
    """Handler for updating customers."""
    
    def __init__(self, repository: EventSourcedRepository):
        """Initialize command handler."""
        self.repository = repository
    
    async def handle(self, command: Command) -> CommandResponse:
        """Handle update customer command."""
        try:
            # Get existing customer
            customer = await self.repository.get_by_id(command.aggregate_id)
            if not customer:
                return CommandResponse(
                    command_id=command.command_id,
                    result="business_error",
                    aggregate_id=command.aggregate_id,
                    error_message="Customer not found"
                )
            
            # Update customer
            customer.update_customer(
                name=command.payload.get("name"),
                email=command.payload.get("email"),
                tenant_id=command.tenant_id
            )
            
            # Save customer
            success = await self.repository.save(customer)
            
            if success:
                return CommandResponse(
                    command_id=command.command_id,
                    result="success",
                    aggregate_id=command.aggregate_id,
                    version=customer.version,
                    events=customer.get_uncommitted_events()
                )
            else:
                return CommandResponse(
                    command_id=command.command_id,
                    result="system_error",
                    aggregate_id=command.aggregate_id,
                    error_message="Failed to save customer"
                )
                
        except Exception as e:
            logger.error(f"Failed to handle update customer command: {e}")
            return CommandResponse(
                command_id=command.command_id,
                result="system_error",
                aggregate_id=command.aggregate_id,
                error_message=str(e)
            )
    
    def can_handle(self, command_type: str) -> bool:
        """Check if can handle command type."""
        return command_type == "update_customer"

# Example Query Handlers

class GetCustomerQueryHandler(QueryHandler):
    """Handler for getting customer information."""
    
    def __init__(self, repository: EventSourcedRepository):
        """Initialize query handler."""
        self.repository = repository
    
    async def handle(self, query: Query) -> QueryResponse:
        """Handle get customer query."""
        try:
            customer_id = query.parameters.get("customer_id")
            if not customer_id:
                return QueryResponse(
                    query_id=query.query_id,
                    error_message="Customer ID is required"
                )
            
            # Get customer from repository
            customer = await self.repository.get_by_id(customer_id)
            
            if customer:
                customer_data = {
                    "customer_id": customer.aggregate_id,
                    "name": customer.name,
                    "email": customer.email,
                    "status": customer.status,
                    "created_at": customer.created_at.isoformat(),
                    "version": customer.version
                }
                
                return QueryResponse(
                    query_id=query.query_id,
                    data=customer_data
                )
            else:
                return QueryResponse(
                    query_id=query.query_id,
                    error_message="Customer not found"
                )
                
        except Exception as e:
            logger.error(f"Failed to handle get customer query: {e}")
            return QueryResponse(
                query_id=query.query_id,
                error_message=str(e)
            )
    
    def can_handle(self, query_type: str) -> bool:
        """Check if can handle query type."""
        return query_type == "get_customer"

# Example Data Connector

class MockCRMConnector(DataConnector):
    """Mock CRM connector for demonstration."""
    
    def __init__(self):
        """Initialize mock CRM connector."""
        self.customers = {}
        self.changes = []
        self.last_change_id = 0
    
    async def get_changes(self, 
                         since: Optional[datetime] = None,
                         entity_types: Optional[List[str]] = None,
                         batch_size: int = 100) -> List[DataChange]:
        """Get changes from mock CRM."""
        # Filter changes by timestamp if provided
        filtered_changes = []
        
        for change in self.changes:
            if since and change.timestamp <= since:
                continue
            if entity_types and change.entity_type not in entity_types:
                continue
            filtered_changes.append(change)
        
        # Return up to batch_size changes
        return filtered_changes[:batch_size]
    
    async def apply_change(self, change: DataChange) -> bool:
        """Apply change to mock CRM."""
        try:
            if change.change_type == ChangeType.CREATE:
                self.customers[change.entity_id] = change.data
            elif change.change_type == ChangeType.UPDATE:
                if change.entity_id in self.customers:
                    self.customers[change.entity_id].update(change.data)
                else:
                    self.customers[change.entity_id] = change.data
            elif change.change_type == ChangeType.DELETE:
                if change.entity_id in self.customers:
                    del self.customers[change.entity_id]
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to apply change to mock CRM: {e}")
            return False
    
    async def get_entity(self, entity_type: str, entity_id: str) -> Optional[Dict[str, Any]]:
        """Get entity from mock CRM."""
        if entity_type == "customer":
            return self.customers.get(entity_id)
        return None
    
    async def health_check(self) -> bool:
        """Check if connector is healthy."""
        return True
    
    def add_mock_change(self, entity_type: str, entity_id: str, change_type: ChangeType, data: Dict[str, Any]) -> None:
        """Add a mock change for testing."""
        self.last_change_id += 1
        change = DataChange(
            change_id=str(self.last_change_id),
            entity_type=entity_type,
            entity_id=entity_id,
            change_type=change_type,
            data=data,
            source_system="mock_crm",
            tenant_id="demo_tenant"
        )
        self.changes.append(change)

# Demo Class

class EventArchitectureDemo:
    """Comprehensive demonstration of event-driven architecture."""
    
    def __init__(self):
        """Initialize the demo."""
        self.config = {
            'event_store': {
                'type': 'dynamodb',
                'table_name': 'acso_events_demo',
                'region': 'us-east-1'
            },
            'redis': {
                'host': 'localhost',
                'port': 6379,
                'db': 0
            }
        }
        
        # Initialize components
        self.event_bus = None
        self.cqrs_mediator = None
        self.sync_engine = None
        self.repository = None
        
        # Mock connectors
        self.crm_connector = MockCRMConnector()
        self.acso_connector = MockCRMConnector()  # Simplified for demo
    
    async def initialize(self) -> None:
        """Initialize all components."""
        try:
            # Initialize event bus
            self.event_bus = EnterpriseEventBus(self.config)
            await self.event_bus.start()
            
            # Initialize CQRS mediator
            self.cqrs_mediator = CQRSMediator(self.event_bus)
            
            # Create repository
            def customer_factory(aggregate_id: str) -> CustomerAggregate:
                return CustomerAggregate(aggregate_id)
            
            self.repository = EventSourcedRepository(
                event_store=self.event_bus.event_store,
                event_bus=self.event_bus,
                aggregate_factory=customer_factory
            )
            
            # Register command handlers
            create_handler = CreateCustomerCommandHandler(self.repository)
            update_handler = UpdateCustomerCommandHandler(self.repository)
            
            self.cqrs_mediator.register_command_handler(create_handler)
            self.cqrs_mediator.register_command_handler(update_handler)
            
            # Register query handlers
            get_handler = GetCustomerQueryHandler(self.repository)
            self.cqrs_mediator.register_query_handler(get_handler)
            
            # Initialize sync engine
            self.sync_engine = BidirectionalSyncEngine(self.event_bus, {})
            
            # Register connectors
            self.sync_engine.register_connector("crm_system", self.crm_connector)
            self.sync_engine.register_connector("acso_system", self.acso_connector)
            
            # Add sync configuration
            sync_config = SyncConfiguration(
                sync_id="crm_acso_sync",
                name="CRM to ACSO Customer Sync",
                source_system="crm_system",
                target_system="acso_system",
                direction=SyncDirection.BIDIRECTIONAL,
                entity_types=["customer"],
                sync_interval_seconds=30,
                conflict_resolution=ConflictResolutionStrategy.LAST_WRITE_WINS,
                tenant_id="demo_tenant"
            )
            
            self.sync_engine.add_sync_configuration(sync_config)
            
            logger.info("Event architecture demo initialized successfully")
            
        except Exception as e:
            logger.error(f"Failed to initialize demo: {e}")
            raise
    
    async def run_demo(self) -> Dict[str, Any]:
        """Run the complete demonstration."""
        try:
            logger.info("Starting Event-Driven Architecture demonstration")
            
            # Initialize components
            await self.initialize()
            
            # Demo results
            results = {
                'demo_timestamp': datetime.now().isoformat(),
                'cqrs_demo': {},
                'event_sourcing_demo': {},
                'sync_demo': {},
                'performance_metrics': {}
            }
            
            # 1. CQRS Demonstration
            logger.info("Demonstrating CQRS patterns...")
            results['cqrs_demo'] = await self._demo_cqrs()
            
            # 2. Event Sourcing Demonstration
            logger.info("Demonstrating Event Sourcing...")
            results['event_sourcing_demo'] = await self._demo_event_sourcing()
            
            # 3. Bidirectional Sync Demonstration
            logger.info("Demonstrating Bidirectional Sync...")
            results['sync_demo'] = await self._demo_bidirectional_sync()
            
            # 4. Performance Metrics
            results['performance_metrics'] = await self._collect_performance_metrics()
            
            logger.info("Event-Driven Architecture demonstration completed successfully")
            return results
            
        except Exception as e:
            logger.error(f"Demo failed: {e}")
            raise
        finally:
            await self.cleanup()
    
    async def _demo_cqrs(self) -> Dict[str, Any]:
        """Demonstrate CQRS patterns."""
        results = {
            'commands_executed': 0,
            'queries_executed': 0,
            'command_results': [],
            'query_results': []
        }
        
        try:
            # Create customer command
            create_command = Command(
                command_id=str(uuid.uuid4()),
                aggregate_id="customer_001",
                aggregate_type="customer",
                command_type="create_customer",
                payload={
                    "name": "John Doe",
                    "email": "john.doe@example.com"
                },
                tenant_id="demo_tenant"
            )
            
            create_response = await self.cqrs_mediator.send_command(create_command)
            results['command_results'].append({
                'command': 'create_customer',
                'result': create_response.result.value,
                'success': create_response.result.value == 'success'
            })
            results['commands_executed'] += 1
            
            # Update customer command
            update_command = Command(
                command_id=str(uuid.uuid4()),
                aggregate_id="customer_001",
                aggregate_type="customer",
                command_type="update_customer",
                payload={
                    "name": "John Smith",
                    "email": "john.smith@example.com"
                },
                tenant_id="demo_tenant"
            )
            
            update_response = await self.cqrs_mediator.send_command(update_command)
            results['command_results'].append({
                'command': 'update_customer',
                'result': update_response.result.value,
                'success': update_response.result.value == 'success'
            })
            results['commands_executed'] += 1
            
            # Query customer
            get_query = Query(
                query_id=str(uuid.uuid4()),
                query_type="get_customer",
                parameters={"customer_id": "customer_001"},
                tenant_id="demo_tenant"
            )
            
            query_response = await self.cqrs_mediator.send_query(get_query)
            results['query_results'].append({
                'query': 'get_customer',
                'success': query_response.data is not None,
                'data': query_response.data,
                'execution_time_ms': query_response.execution_time_ms
            })
            results['queries_executed'] += 1
            
        except Exception as e:
            logger.error(f"CQRS demo failed: {e}")
            results['error'] = str(e)
        
        return results
    
    async def _demo_event_sourcing(self) -> Dict[str, Any]:
        """Demonstrate event sourcing capabilities."""
        results = {
            'events_generated': 0,
            'aggregate_version': 0,
            'event_replay_success': False
        }
        
        try:
            # Get customer aggregate
            customer = await self.repository.get_by_id("customer_001")
            
            if customer:
                results['aggregate_version'] = customer.version
                results['events_generated'] = len(customer.get_uncommitted_events())
                
                # Demonstrate event replay
                events = await self.event_bus.event_store.get_events("customer_001")
                if events:
                    # Create new aggregate and replay events
                    new_customer = CustomerAggregate("customer_001")
                    new_customer.load_from_history(events)
                    
                    # Verify state matches
                    results['event_replay_success'] = (
                        new_customer.name == customer.name and
                        new_customer.email == customer.email and
                        new_customer.version == customer.version
                    )
            
        except Exception as e:
            logger.error(f"Event sourcing demo failed: {e}")
            results['error'] = str(e)
        
        return results
    
    async def _demo_bidirectional_sync(self) -> Dict[str, Any]:
        """Demonstrate bidirectional synchronization."""
        results = {
            'sync_started': False,
            'changes_synced': 0,
            'conflicts_detected': 0,
            'sync_status': {}
        }
        
        try:
            # Add some mock changes to CRM
            self.crm_connector.add_mock_change(
                "customer", "customer_002", ChangeType.CREATE,
                {"name": "Jane Doe", "email": "jane.doe@example.com"}
            )
            
            self.crm_connector.add_mock_change(
                "customer", "customer_003", ChangeType.CREATE,
                {"name": "Bob Wilson", "email": "bob.wilson@example.com"}
            )
            
            # Start synchronization
            await self.sync_engine.start_sync("crm_acso_sync")
            results['sync_started'] = True
            
            # Wait for sync to process
            await asyncio.sleep(5)
            
            # Get sync status
            sync_status = self.sync_engine.get_sync_status("crm_acso_sync")
            results['sync_status'] = sync_status
            results['changes_synced'] = sync_status.get('total_synced', 0)
            
            # Stop sync
            await self.sync_engine.stop_sync("crm_acso_sync")
            
        except Exception as e:
            logger.error(f"Bidirectional sync demo failed: {e}")
            results['error'] = str(e)
        
        return results
    
    async def _collect_performance_metrics(self) -> Dict[str, Any]:
        """Collect performance metrics from all components."""
        metrics = {}
        
        try:
            # Event bus metrics
            if self.event_bus:
                metrics['event_bus'] = self.event_bus.get_metrics()
            
            # CQRS metrics
            if self.cqrs_mediator:
                metrics['cqrs'] = self.cqrs_mediator.get_metrics()
            
            # Sync engine metrics
            if self.sync_engine:
                metrics['sync_engine'] = self.sync_engine.get_sync_status()
            
        except Exception as e:
            logger.error(f"Failed to collect performance metrics: {e}")
            metrics['error'] = str(e)
        
        return metrics
    
    async def cleanup(self) -> None:
        """Clean up demo resources."""
        try:
            if self.sync_engine:
                await self.sync_engine.stop_sync()
            
            if self.event_bus:
                await self.event_bus.stop()
            
            logger.info("Demo cleanup completed")
            
        except Exception as e:
            logger.error(f"Failed to cleanup demo: {e}")

async def run_event_architecture_demo():
    """Run the complete event-driven architecture demonstration."""
    demo = EventArchitectureDemo()
    results = await demo.run_demo()
    
    # Pretty print results
    print("\n" + "="*80)
    print("ACSO ENTERPRISE FRAMEWORK - EVENT-DRIVEN ARCHITECTURE DEMO")
    print("="*80)
    
    print(f"\nDemo completed at: {results['demo_timestamp']}")
    
    # CQRS Results
    cqrs_results = results['cqrs_demo']
    print(f"\n🏗️  CQRS DEMONSTRATION:")
    print(f"  • Commands Executed: {cqrs_results.get('commands_executed', 0)}")
    print(f"  • Queries Executed: {cqrs_results.get('queries_executed', 0)}")
    
    for cmd_result in cqrs_results.get('command_results', []):
        status = "✅" if cmd_result['success'] else "❌"
        print(f"  {status} {cmd_result['command']}: {cmd_result['result']}")
    
    for query_result in cqrs_results.get('query_results', []):
        status = "✅" if query_result['success'] else "❌"
        print(f"  {status} {query_result['query']}: {query_result.get('execution_time_ms', 0):.2f}ms")
    
    # Event Sourcing Results
    es_results = results['event_sourcing_demo']
    print(f"\n📚 EVENT SOURCING DEMONSTRATION:")
    print(f"  • Aggregate Version: {es_results.get('aggregate_version', 0)}")
    print(f"  • Events Generated: {es_results.get('events_generated', 0)}")
    replay_status = "✅" if es_results.get('event_replay_success', False) else "❌"
    print(f"  {replay_status} Event Replay: {'Success' if es_results.get('event_replay_success', False) else 'Failed'}")
    
    # Sync Results
    sync_results = results['sync_demo']
    print(f"\n🔄 BIDIRECTIONAL SYNC DEMONSTRATION:")
    sync_status = "✅" if sync_results.get('sync_started', False) else "❌"
    print(f"  {sync_status} Sync Started: {'Yes' if sync_results.get('sync_started', False) else 'No'}")
    print(f"  • Changes Synced: {sync_results.get('changes_synced', 0)}")
    print(f"  • Conflicts Detected: {sync_results.get('conflicts_detected', 0)}")
    
    # Performance Metrics
    perf_metrics = results['performance_metrics']
    print(f"\n📊 PERFORMANCE METRICS:")
    
    if 'event_bus' in perf_metrics:
        eb_metrics = perf_metrics['event_bus']['metrics']
        print(f"  Event Bus:")
        print(f"    • Events Published: {eb_metrics.get('events_published', 0)}")
        print(f"    • Events Processed: {eb_metrics.get('events_processed', 0)}")
        print(f"    • Events Retried: {eb_metrics.get('events_retried', 0)}")
    
    if 'cqrs' in perf_metrics:
        cqrs_metrics = perf_metrics['cqrs']['metrics']
        print(f"  CQRS Mediator:")
        print(f"    • Commands Processed: {cqrs_metrics.get('commands_processed', 0)}")
        print(f"    • Queries Processed: {cqrs_metrics.get('queries_processed', 0)}")
        print(f"    • Avg Command Time: {cqrs_metrics.get('avg_command_time', 0):.2f}ms")
        print(f"    • Avg Query Time: {cqrs_metrics.get('avg_query_time', 0):.2f}ms")
    
    print("\n" + "="*80)
    print("Event-Driven Architecture demonstration completed! 🎉")
    print("="*80)
    
    return results

if __name__ == "__main__":
    # Run the demo
    asyncio.run(run_event_architecture_demo())