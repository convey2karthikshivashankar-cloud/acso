"""
Enterprise Billing Manager

Manages comprehensive usage-based billing including real-time cost tracking,
subscription management, automated invoicing, and revenue analytics.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
from decimal import Decimal
import uuid

from .usage_tracker import UsageTracker
from .analytics_engine import AnalyticsEngine
from .subscription_manager import SubscriptionManager


class BillingCycle(str, Enum):
    """Billing cycle options."""
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"


class PricingModel(str, Enum):
    """Pricing model types."""
    FLAT_RATE = "flat_rate"
    USAGE_BASED = "usage_based"
    TIERED = "tiered"
    HYBRID = "hybrid"


class InvoiceStatus(str, Enum):
    """Invoice status options."""
    DRAFT = "draft"
    PENDING = "pending"
    PAID = "paid"
    OVERDUE = "overdue"
    CANCELLED = "cancelled"


@dataclass
class PricingTier:
    """Pricing tier configuration."""
    name: str
    base_price: Decimal
    included_agents: int
    included_cpu_hours: float
    included_memory_gb_hours: float
    included_storage_gb: float
    included_api_requests: int
    overage_rates: Dict[str, Decimal]


@dataclass
class UsageMetrics:
    """Usage metrics for billing calculation."""
    tenant_id: str
    period_start: datetime
    period_end: datetime
    active_agents: int
    cpu_hours: float
    memory_gb_hours: float
    storage_gb: float
    api_requests: int
    data_transfer_gb: float
    custom_metrics: Dict[str, float]


@dataclass
class Invoice:
    """Invoice data structure."""
    invoice_id: str
    tenant_id: str
    billing_period_start: datetime
    billing_period_end: datetime
    subtotal: Decimal
    tax_amount: Decimal
    total_amount: Decimal
    status: InvoiceStatus
    line_items: List[Dict[str, Any]]
    created_at: datetime
    due_date: datetime
    paid_at: Optional[datetime] = None


class BillingManager:
    """
    Enterprise-grade usage-based billing management system.
    
    Provides comprehensive billing capabilities including:
    - Real-time usage tracking and cost calculation
    - Flexible pricing models (flat-rate, usage-based, tiered)
    - Automated invoice generation and payment processing
    - Revenue analytics and forecasting
    - Subscription lifecycle management
    """
    
    def __init__(self):
        self.usage_tracker = UsageTracker()
        self.analytics_engine = AnalyticsEngine()
        self.subscription_manager = SubscriptionManager()
        
        # Billing configurations
        self.pricing_tiers: Dict[str, PricingTier] = {}
        self.tenant_subscriptions: Dict[str, Dict[str, Any]] = {}
        
        # Invoice and payment tracking
        self.invoices: Dict[str, Invoice] = {}
        self.payment_history: Dict[str, List[Dict[str, Any]]] = {}
        
        # Background tasks
        self.billing_tasks: Dict[str, asyncio.Task] = {}
        
        self.logger = logging.getLogger(__name__)
        
    async def initialize(self) -> None:
        """Initialize the billing manager and its components."""
        try:
            self.logger.info("Initializing Billing Manager")
            
            # Initialize components
            await self.usage_tracker.initialize()
            await self.analytics_engine.initialize()
            await self.subscription_manager.initialize()
            
            # Load pricing tiers
            await self._load_pricing_tiers()
            
            # Start background billing tasks
            self.billing_tasks['usage_aggregation'] = asyncio.create_task(
                self._aggregate_usage_metrics()
            )
            self.billing_tasks['invoice_generation'] = asyncio.create_task(
                self._generate_periodic_invoices()
            )
            self.billing_tasks['payment_processing'] = asyncio.create_task(
                self._process_pending_payments()
            )
            
            self.logger.info("Billing Manager initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Billing Manager: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the billing manager."""
        try:
            self.logger.info("Shutting down Billing Manager")
            
            # Cancel background tasks
            for task_name, task in self.billing_tasks.items():
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                        
            # Shutdown components
            await self.subscription_manager.shutdown()
            await self.analytics_engine.shutdown()
            await self.usage_tracker.shutdown()
            
            self.logger.info("Billing Manager shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    async def create_subscription(
        self,
        tenant_id: str,
        pricing_tier: str,
        billing_cycle: BillingCycle,
        custom_pricing: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """
        Create a new subscription for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            pricing_tier: Name of the pricing tier
            billing_cycle: Billing cycle frequency
            custom_pricing: Optional custom pricing overrides
            
        Returns:
            Subscription creation result
        """
        try:
            self.logger.info(f"Creating subscription for tenant: {tenant_id}")
            
            # Validate pricing tier
            if pricing_tier not in self.pricing_tiers:
                raise ValueError(f"Invalid pricing tier: {pricing_tier}")
                
            tier_config = self.pricing_tiers[pricing_tier]
            
            # Create subscription configuration
            subscription_config = {
                'tenant_id': tenant_id,
                'pricing_tier': pricing_tier,
                'billing_cycle': billing_cycle,
                'base_price': float(tier_config.base_price),
                'included_limits': {
                    'agents': tier_config.included_agents,
                    'cpu_hours': tier_config.included_cpu_hours,
                    'memory_gb_hours': tier_config.included_memory_gb_hours,
                    'storage_gb': tier_config.included_storage_gb,
                    'api_requests': tier_config.included_api_requests
                },
                'overage_rates': {k: float(v) for k, v in tier_config.overage_rates.items()},
                'custom_pricing': custom_pricing or {},
                'status': 'active',
                'created_at': datetime.utcnow(),
                'next_billing_date': self._calculate_next_billing_date(billing_cycle)
            }
            
            # Apply custom pricing if provided
            if custom_pricing:
                subscription_config.update(custom_pricing)
                
            # Store subscription
            self.tenant_subscriptions[tenant_id] = subscription_config
            
            # Initialize usage tracking for tenant
            await self.usage_tracker.initialize_tenant_tracking(tenant_id)
            
            # Initialize payment history
            self.payment_history[tenant_id] = []
            
            self.logger.info(f"Successfully created subscription for tenant: {tenant_id}")
            
            return {
                'success': True,
                'tenant_id': tenant_id,
                'subscription_id': f"sub_{tenant_id}_{int(datetime.utcnow().timestamp())}",
                'pricing_tier': pricing_tier,
                'billing_cycle': billing_cycle.value,
                'next_billing_date': subscription_config['next_billing_date'].isoformat(),
                'created_at': subscription_config['created_at'].isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to create subscription for tenant {tenant_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'tenant_id': tenant_id
            }
            
    async def calculate_usage_cost(
        self,
        tenant_id: str,
        usage_metrics: UsageMetrics
    ) -> Dict[str, Any]:
        """
        Calculate cost for usage metrics based on tenant's pricing tier.
        
        Args:
            tenant_id: ID of the tenant
            usage_metrics: Usage metrics for the period
            
        Returns:
            Cost calculation breakdown
        """
        try:
            if tenant_id not in self.tenant_subscriptions:
                raise ValueError(f"No subscription found for tenant {tenant_id}")
                
            subscription = self.tenant_subscriptions[tenant_id]
            tier_name = subscription['pricing_tier']
            tier_config = self.pricing_tiers[tier_name]
            
            # Calculate base cost
            base_cost = Decimal(str(subscription['base_price']))
            
            # Calculate overage costs
            overage_costs = {}
            total_overage = Decimal('0')
            
            # Agent overage
            if usage_metrics.active_agents > tier_config.included_agents:
                agent_overage = usage_metrics.active_agents - tier_config.included_agents
                agent_cost = Decimal(str(agent_overage)) * tier_config.overage_rates.get('agents', Decimal('0'))
                overage_costs['agents'] = {
                    'usage': usage_metrics.active_agents,
                    'included': tier_config.included_agents,
                    'overage': agent_overage,
                    'rate': float(tier_config.overage_rates.get('agents', Decimal('0'))),
                    'cost': float(agent_cost)
                }
                total_overage += agent_cost
                
            # CPU overage
            if usage_metrics.cpu_hours > tier_config.included_cpu_hours:
                cpu_overage = usage_metrics.cpu_hours - tier_config.included_cpu_hours
                cpu_cost = Decimal(str(cpu_overage)) * tier_config.overage_rates.get('cpu_hours', Decimal('0'))
                overage_costs['cpu_hours'] = {
                    'usage': usage_metrics.cpu_hours,
                    'included': tier_config.included_cpu_hours,
                    'overage': cpu_overage,
                    'rate': float(tier_config.overage_rates.get('cpu_hours', Decimal('0'))),
                    'cost': float(cpu_cost)
                }
                total_overage += cpu_cost
                
            # Memory overage
            if usage_metrics.memory_gb_hours > tier_config.included_memory_gb_hours:
                memory_overage = usage_metrics.memory_gb_hours - tier_config.included_memory_gb_hours
                memory_cost = Decimal(str(memory_overage)) * tier_config.overage_rates.get('memory_gb_hours', Decimal('0'))
                overage_costs['memory_gb_hours'] = {
                    'usage': usage_metrics.memory_gb_hours,
                    'included': tier_config.included_memory_gb_hours,
                    'overage': memory_overage,
                    'rate': float(tier_config.overage_rates.get('memory_gb_hours', Decimal('0'))),
                    'cost': float(memory_cost)
                }
                total_overage += memory_cost
                
            # Storage overage
            if usage_metrics.storage_gb > tier_config.included_storage_gb:
                storage_overage = usage_metrics.storage_gb - tier_config.included_storage_gb
                storage_cost = Decimal(str(storage_overage)) * tier_config.overage_rates.get('storage_gb', Decimal('0'))
                overage_costs['storage_gb'] = {
                    'usage': usage_metrics.storage_gb,
                    'included': tier_config.included_storage_gb,
                    'overage': storage_overage,
                    'rate': float(tier_config.overage_rates.get('storage_gb', Decimal('0'))),
                    'cost': float(storage_cost)
                }
                total_overage += storage_cost
                
            # API requests overage
            if usage_metrics.api_requests > tier_config.included_api_requests:
                api_overage = usage_metrics.api_requests - tier_config.included_api_requests
                api_cost = Decimal(str(api_overage)) * tier_config.overage_rates.get('api_requests', Decimal('0'))
                overage_costs['api_requests'] = {
                    'usage': usage_metrics.api_requests,
                    'included': tier_config.included_api_requests,
                    'overage': api_overage,
                    'rate': float(tier_config.overage_rates.get('api_requests', Decimal('0'))),
                    'cost': float(api_cost)
                }
                total_overage += api_cost
                
            # Data transfer cost (always usage-based)
            data_transfer_cost = Decimal(str(usage_metrics.data_transfer_gb)) * tier_config.overage_rates.get('data_transfer_gb', Decimal('0'))
            
            # Calculate totals
            subtotal = base_cost + total_overage + data_transfer_cost
            tax_rate = Decimal('0.08')  # 8% tax rate (configurable)
            tax_amount = subtotal * tax_rate
            total_cost = subtotal + tax_amount
            
            return {
                'tenant_id': tenant_id,
                'pricing_tier': tier_name,
                'period': {
                    'start': usage_metrics.period_start.isoformat(),
                    'end': usage_metrics.period_end.isoformat()
                },
                'costs': {
                    'base_cost': float(base_cost),
                    'overage_costs': overage_costs,
                    'data_transfer_cost': float(data_transfer_cost),
                    'subtotal': float(subtotal),
                    'tax_amount': float(tax_amount),
                    'total': float(total_cost)
                },
                'usage_summary': {
                    'active_agents': usage_metrics.active_agents,
                    'cpu_hours': usage_metrics.cpu_hours,
                    'memory_gb_hours': usage_metrics.memory_gb_hours,
                    'storage_gb': usage_metrics.storage_gb,
                    'api_requests': usage_metrics.api_requests,
                    'data_transfer_gb': usage_metrics.data_transfer_gb
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to calculate usage cost for tenant {tenant_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'tenant_id': tenant_id
            }
            
    async def generate_invoice(
        self,
        tenant_id: str,
        billing_period_start: datetime,
        billing_period_end: datetime
    ) -> Dict[str, Any]:
        """
        Generate an invoice for a tenant's usage during a billing period.
        
        Args:
            tenant_id: ID of the tenant
            billing_period_start: Start of billing period
            billing_period_end: End of billing period
            
        Returns:
            Generated invoice
        """
        try:
            self.logger.info(f"Generating invoice for tenant {tenant_id}")
            
            # Get usage metrics for the period
            usage_metrics = await self.usage_tracker.get_usage_metrics(
                tenant_id, billing_period_start, billing_period_end
            )
            
            # Calculate costs
            cost_calculation = await self.calculate_usage_cost(tenant_id, usage_metrics)
            
            if not cost_calculation.get('success', True):
                return cost_calculation
                
            # Generate invoice ID
            invoice_id = f"inv_{tenant_id}_{int(billing_period_start.timestamp())}"
            
            # Create line items
            line_items = []
            
            # Base subscription line item
            subscription = self.tenant_subscriptions[tenant_id]
            line_items.append({
                'description': f"{subscription['pricing_tier'].title()} Plan",
                'quantity': 1,
                'unit_price': cost_calculation['costs']['base_cost'],
                'total': cost_calculation['costs']['base_cost']
            })
            
            # Overage line items
            for resource, overage_info in cost_calculation['costs']['overage_costs'].items():
                if overage_info['cost'] > 0:
                    line_items.append({
                        'description': f"{resource.replace('_', ' ').title()} Overage",
                        'quantity': overage_info['overage'],
                        'unit_price': overage_info['rate'],
                        'total': overage_info['cost']
                    })
                    
            # Data transfer line item
            if cost_calculation['costs']['data_transfer_cost'] > 0:
                line_items.append({
                    'description': 'Data Transfer',
                    'quantity': usage_metrics.data_transfer_gb,
                    'unit_price': float(self.pricing_tiers[subscription['pricing_tier']].overage_rates.get('data_transfer_gb', Decimal('0'))),
                    'total': cost_calculation['costs']['data_transfer_cost']
                })
                
            # Create invoice
            invoice = Invoice(
                invoice_id=invoice_id,
                tenant_id=tenant_id,
                billing_period_start=billing_period_start,
                billing_period_end=billing_period_end,
                subtotal=Decimal(str(cost_calculation['costs']['subtotal'])),
                tax_amount=Decimal(str(cost_calculation['costs']['tax_amount'])),
                total_amount=Decimal(str(cost_calculation['costs']['total'])),
                status=InvoiceStatus.PENDING,
                line_items=line_items,
                created_at=datetime.utcnow(),
                due_date=datetime.utcnow() + timedelta(days=30)
            )
            
            # Store invoice
            self.invoices[invoice_id] = invoice
            
            self.logger.info(f"Successfully generated invoice {invoice_id} for tenant {tenant_id}")
            
            return {
                'success': True,
                'invoice_id': invoice_id,
                'tenant_id': tenant_id,
                'total_amount': float(invoice.total_amount),
                'due_date': invoice.due_date.isoformat(),
                'line_items': line_items,
                'usage_period': {
                    'start': billing_period_start.isoformat(),
                    'end': billing_period_end.isoformat()
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to generate invoice for tenant {tenant_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'tenant_id': tenant_id
            }
            
    async def get_billing_analytics(
        self,
        tenant_id: Optional[str] = None,
        start_date: Optional[datetime] = None,
        end_date: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """
        Get comprehensive billing analytics.
        
        Args:
            tenant_id: Optional tenant ID for tenant-specific analytics
            start_date: Optional start date for analytics period
            end_date: Optional end date for analytics period
            
        Returns:
            Billing analytics data
        """
        try:
            # Set default date range if not provided
            if not end_date:
                end_date = datetime.utcnow()
            if not start_date:
                start_date = end_date - timedelta(days=30)
                
            # Get analytics from analytics engine
            analytics_data = await self.analytics_engine.generate_billing_analytics(
                tenant_id, start_date, end_date
            )
            
            # Add revenue metrics
            revenue_metrics = await self._calculate_revenue_metrics(tenant_id, start_date, end_date)
            analytics_data['revenue'] = revenue_metrics
            
            # Add subscription metrics
            subscription_metrics = await self._calculate_subscription_metrics(tenant_id)
            analytics_data['subscriptions'] = subscription_metrics
            
            return {
                'success': True,
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'analytics': analytics_data
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get billing analytics: {e}")
            return {
                'success': False,
                'error': str(e)
            }
            
    async def _load_pricing_tiers(self) -> None:
        """Load pricing tier configurations."""
        # Define standard pricing tiers
        self.pricing_tiers = {
            'starter': PricingTier(
                name='Starter',
                base_price=Decimal('50.00'),
                included_agents=10,
                included_cpu_hours=100.0,
                included_memory_gb_hours=200.0,
                included_storage_gb=50.0,
                included_api_requests=10000,
                overage_rates={
                    'agents': Decimal('5.00'),
                    'cpu_hours': Decimal('0.10'),
                    'memory_gb_hours': Decimal('0.05'),
                    'storage_gb': Decimal('0.02'),
                    'api_requests': Decimal('0.001'),
                    'data_transfer_gb': Decimal('0.01')
                }
            ),
            'professional': PricingTier(
                name='Professional',
                base_price=Decimal('150.00'),
                included_agents=100,
                included_cpu_hours=500.0,
                included_memory_gb_hours=1000.0,
                included_storage_gb=500.0,
                included_api_requests=100000,
                overage_rates={
                    'agents': Decimal('4.00'),
                    'cpu_hours': Decimal('0.08'),
                    'memory_gb_hours': Decimal('0.04'),
                    'storage_gb': Decimal('0.015'),
                    'api_requests': Decimal('0.0008'),
                    'data_transfer_gb': Decimal('0.008')
                }
            ),
            'enterprise': PricingTier(
                name='Enterprise',
                base_price=Decimal('300.00'),
                included_agents=1000,
                included_cpu_hours=2000.0,
                included_memory_gb_hours=4000.0,
                included_storage_gb=5000.0,
                included_api_requests=1000000,
                overage_rates={
                    'agents': Decimal('3.00'),
                    'cpu_hours': Decimal('0.06'),
                    'memory_gb_hours': Decimal('0.03'),
                    'storage_gb': Decimal('0.01'),
                    'api_requests': Decimal('0.0005'),
                    'data_transfer_gb': Decimal('0.005')
                }
            )
        }
        
    def _calculate_next_billing_date(self, billing_cycle: BillingCycle) -> datetime:
        """Calculate next billing date based on cycle."""
        now = datetime.utcnow()
        
        if billing_cycle == BillingCycle.MONTHLY:
            return now + timedelta(days=30)
        elif billing_cycle == BillingCycle.QUARTERLY:
            return now + timedelta(days=90)
        elif billing_cycle == BillingCycle.ANNUALLY:
            return now + timedelta(days=365)
        else:
            return now + timedelta(days=30)
            
    async def _aggregate_usage_metrics(self) -> None:
        """Background task to aggregate usage metrics."""
        while True:
            try:
                # Aggregate usage for all tenants
                for tenant_id in self.tenant_subscriptions.keys():
                    await self.usage_tracker.aggregate_tenant_usage(tenant_id)
                    
                await asyncio.sleep(3600)  # Run every hour
                
            except Exception as e:
                self.logger.error(f"Error in usage aggregation: {e}")
                await asyncio.sleep(1800)  # Wait 30 minutes on error
                
    async def _generate_periodic_invoices(self) -> None:
        """Background task to generate periodic invoices."""
        while True:
            try:
                now = datetime.utcnow()
                
                # Check each tenant's billing schedule
                for tenant_id, subscription in self.tenant_subscriptions.items():
                    next_billing = subscription['next_billing_date']
                    
                    if now >= next_billing:
                        # Generate invoice for the billing period
                        period_start = next_billing - timedelta(days=30)  # Simplified
                        period_end = next_billing
                        
                        await self.generate_invoice(tenant_id, period_start, period_end)
                        
                        # Update next billing date
                        subscription['next_billing_date'] = self._calculate_next_billing_date(
                            BillingCycle(subscription['billing_cycle'])
                        )
                        
                await asyncio.sleep(3600)  # Check every hour
                
            except Exception as e:
                self.logger.error(f"Error in invoice generation: {e}")
                await asyncio.sleep(1800)
                
    async def _process_pending_payments(self) -> None:
        """Background task to process pending payments."""
        while True:
            try:
                # Process pending invoices
                for invoice_id, invoice in self.invoices.items():
                    if invoice.status == InvoiceStatus.PENDING:
                        # This would integrate with payment processors
                        # For now, just log
                        self.logger.debug(f"Processing payment for invoice {invoice_id}")
                        
                await asyncio.sleep(1800)  # Check every 30 minutes
                
            except Exception as e:
                self.logger.error(f"Error in payment processing: {e}")
                await asyncio.sleep(3600)
                
    async def _calculate_revenue_metrics(
        self,
        tenant_id: Optional[str],
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate revenue metrics for the period."""
        # Simplified implementation
        return {
            'total_revenue': 0.0,
            'recurring_revenue': 0.0,
            'usage_revenue': 0.0,
            'growth_rate': 0.0
        }
        
    async def _calculate_subscription_metrics(self, tenant_id: Optional[str]) -> Dict[str, Any]:
        """Calculate subscription metrics."""
        if tenant_id:
            subscriptions = [self.tenant_subscriptions.get(tenant_id)]
        else:
            subscriptions = list(self.tenant_subscriptions.values())
            
        active_subscriptions = len([s for s in subscriptions if s and s['status'] == 'active'])
        
        return {
            'total_subscriptions': len(subscriptions),
            'active_subscriptions': active_subscriptions,
            'churn_rate': 0.0,  # Would calculate based on historical data
            'average_revenue_per_user': 0.0  # Would calculate based on revenue data
        }