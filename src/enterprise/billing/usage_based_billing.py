"""
Usage-Based Billing and Analytics System for ACSO Enterprise.
Real-time cost tracking with automated billing integration.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
from decimal import Decimal, ROUND_HALF_UP
from collections import defaultdict, deque
import boto3
from botocore.exceptions import ClientError
import stripe
import pandas as pd
import numpy as np

class BillingModel(str, Enum):
    """Billing model types."""
    PER_AGENT = "per_agent"
    PER_USER = "per_user"
    CONSUMPTION_BASED = "consumption_based"
    HYBRID = "hybrid"
    ENTERPRISE = "enterprise"

class UsageMetricType(str, Enum):
    """Types of usage metrics."""
    AGENT_HOURS = "agent_hours"
    API_CALLS = "api_calls"
    DATA_PROCESSED_GB = "data_processed_gb"
    STORAGE_GB = "storage_gb"
    COMPUTE_HOURS = "compute_hours"
    THREAT_DETECTIONS = "threat_detections"
    INCIDENTS_PROCESSED = "incidents_processed"
    INTEGRATIONS_ACTIVE = "integrations_active"
    USERS_ACTIVE = "users_active"
    BANDWIDTH_GB = "bandwidth_gb"

class BillingPeriod(str, Enum):
    """Billing period types."""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"

class PaymentStatus(str, Enum):
    """Payment status values."""
    PENDING = "pending"
    PROCESSING = "processing"
    PAID = "paid"
    FAILED = "failed"
    REFUNDED = "refunded"
    DISPUTED = "disputed"

@dataclass
class UsageMetric:
    """Usage metric data point."""
    metric_id: str
    tenant_id: str
    metric_type: UsageMetricType
    value: Decimal
    unit: str
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class PricingTier:
    """Pricing tier configuration."""
    tier_id: str
    name: str
    description: str
    metric_type: UsageMetricType
    unit_price: Decimal
    min_units: Decimal
    max_units: Optional[Decimal]
    overage_price: Optional[Decimal]
    included_units: Decimal = Decimal('0')
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class BillingPlan:
    """Billing plan configuration."""
    plan_id: str
    name: str
    description: str
    billing_model: BillingModel
    billing_period: BillingPeriod
    base_price: Decimal
    pricing_tiers: List[PricingTier]
    features: List[str]
    limits: Dict[str, Any]
    trial_period_days: int = 0
    setup_fee: Decimal = Decimal('0')
    metadata: Dict[str, Any] = field(default_factory=dict)

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
    currency: str
    status: PaymentStatus
    due_date: datetime
    created_at: datetime
    paid_at: Optional[datetime]
    line_items: List[Dict[str, Any]]
    usage_summary: Dict[str, Any]
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class TenantSubscription:
    """Tenant subscription information."""
    subscription_id: str
    tenant_id: str
    plan_id: str
    status: str
    started_at: datetime
    current_period_start: datetime
    current_period_end: datetime
    trial_end: Optional[datetime]
    cancel_at_period_end: bool
    canceled_at: Optional[datetime]
    metadata: Dict[str, Any] = field(default_factory=dict)

class StripeIntegration:
    """Stripe payment processing integration."""
    
    def __init__(self, api_key: str, webhook_secret: str):
        stripe.api_key = api_key
        self.webhook_secret = webhook_secret
        self.logger = logging.getLogger(__name__)
    
    async def create_customer(self, tenant_id: str, email: str, name: str) -> str:
        """Create a Stripe customer."""
        try:
            customer = stripe.Customer.create(
                email=email,
                name=name,
                metadata={"tenant_id": tenant_id}
            )
            return customer.id
        except Exception as e:
            self.logger.error(f"Failed to create Stripe customer: {e}")
            raise
    
    async def create_subscription(
        self,
        customer_id: str,
        price_id: str,
        trial_period_days: int = 0
    ) -> str:
        """Create a Stripe subscription."""
        try:
            subscription_data = {
                "customer": customer_id,
                "items": [{"price": price_id}],
                "expand": ["latest_invoice.payment_intent"]
            }
            
            if trial_period_days > 0:
                subscription_data["trial_period_days"] = trial_period_days
            
            subscription = stripe.Subscription.create(**subscription_data)
            return subscription.id
        except Exception as e:
            self.logger.error(f"Failed to create Stripe subscription: {e}")
            raise
    
    async def create_usage_record(
        self,
        subscription_item_id: str,
        quantity: int,
        timestamp: Optional[datetime] = None
    ) -> str:
        """Create a usage record for metered billing."""
        try:
            usage_record_data = {
                "quantity": quantity,
                "action": "increment"
            }
            
            if timestamp:
                usage_record_data["timestamp"] = int(timestamp.timestamp())
            
            usage_record = stripe.SubscriptionItem.create_usage_record(
                subscription_item_id,
                **usage_record_data
            )
            return usage_record.id
        except Exception as e:
            self.logger.error(f"Failed to create usage record: {e}")
            raise
    
    async def create_invoice(self, customer_id: str) -> Dict[str, Any]:
        """Create and finalize an invoice."""
        try:
            # Create invoice
            invoice = stripe.Invoice.create(
                customer=customer_id,
                auto_advance=True
            )
            
            # Finalize invoice
            invoice.finalize_invoice()
            
            return {
                "invoice_id": invoice.id,
                "amount_due": invoice.amount_due,
                "currency": invoice.currency,
                "status": invoice.status,
                "hosted_invoice_url": invoice.hosted_invoice_url
            }
        except Exception as e:
            self.logger.error(f"Failed to create invoice: {e}")
            raise

class AWSBillingIntegration:
    """AWS Cost and Billing integration."""
    
    def __init__(self, region: str = "us-east-1"):
        self.ce_client = boto3.client('ce', region_name=region)
        self.logger = logging.getLogger(__name__)
    
    async def get_cost_and_usage(
        self,
        start_date: datetime,
        end_date: datetime,
        granularity: str = "DAILY",
        group_by: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """Get AWS cost and usage data."""
        try:
            params = {
                "TimePeriod": {
                    "Start": start_date.strftime("%Y-%m-%d"),
                    "End": end_date.strftime("%Y-%m-%d")
                },
                "Granularity": granularity,
                "Metrics": ["BlendedCost", "UsageQuantity"]
            }
            
            if group_by:
                params["GroupBy"] = [{"Type": "DIMENSION", "Key": key} for key in group_by]
            
            response = self.ce_client.get_cost_and_usage(**params)
            return response
        except ClientError as e:
            self.logger.error(f"Failed to get AWS cost and usage: {e}")
            raise
    
    async def get_dimension_values(
        self,
        dimension: str,
        start_date: datetime,
        end_date: datetime
    ) -> List[str]:
        """Get dimension values for cost analysis."""
        try:
            response = self.ce_client.get_dimension_values(
                TimePeriod={
                    "Start": start_date.strftime("%Y-%m-%d"),
                    "End": end_date.strftime("%Y-%m-%d")
                },
                Dimension=dimension
            )
            return [item["Value"] for item in response["DimensionValues"]]
        except ClientError as e:
            self.logger.error(f"Failed to get dimension values: {e}")
            raise

class UsageBasedBillingSystem:
    """
    Comprehensive usage-based billing and analytics system.
    
    Features:
    - Real-time usage tracking and cost calculation
    - Multiple billing models (per-agent, per-user, consumption-based)
    - Automated billing integration with Stripe and AWS
    - Advanced analytics and cost optimization recommendations
    - Flexible pricing tiers and plans
    - Automated invoice generation and payment processing
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Core data stores
        self.usage_metrics: Dict[str, List[UsageMetric]] = defaultdict(list)
        self.billing_plans: Dict[str, BillingPlan] = {}
        self.tenant_subscriptions: Dict[str, TenantSubscription] = {}
        self.invoices: Dict[str, Invoice] = {}
        
        # Real-time usage tracking
        self.usage_buffer: deque = deque(maxlen=10000)
        self.usage_aggregates: Dict[str, Dict[str, Decimal]] = defaultdict(lambda: defaultdict(Decimal))
        
        # Integrations
        self.stripe_integration: Optional[StripeIntegration] = None
        self.aws_billing_integration: Optional[AWSBillingIntegration] = None
        
        # Processing queues
        self.usage_queue: asyncio.Queue = asyncio.Queue()
        self.billing_queue: asyncio.Queue = asyncio.Queue()
        
        # Background tasks
        self.processing_tasks: List[asyncio.Task] = []
        self.system_active = False
    
    async def initialize(
        self,
        stripe_api_key: Optional[str] = None,
        stripe_webhook_secret: Optional[str] = None,
        aws_region: str = "us-east-1"
    ) -> None:
        """Initialize the usage-based billing system."""
        try:
            self.logger.info("Initializing Usage-Based Billing System")
            
            # Initialize integrations
            if stripe_api_key and stripe_webhook_secret:
                self.stripe_integration = StripeIntegration(stripe_api_key, stripe_webhook_secret)
            
            self.aws_billing_integration = AWSBillingIntegration(aws_region)
            
            # Load default billing plans
            await self._load_default_billing_plans()
            
            # Start background processing
            self.system_active = True
            self.processing_tasks = [
                asyncio.create_task(self._usage_processor()),
                asyncio.create_task(self._billing_processor()),
                asyncio.create_task(self._invoice_generator()),
                asyncio.create_task(self._usage_aggregator()),
                asyncio.create_task(self._cost_optimizer())
            ]
            
            self.logger.info("Usage-Based Billing System initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Usage-Based Billing System: {e}")
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the billing system."""
        try:
            self.logger.info("Shutting down Usage-Based Billing System")
            
            self.system_active = False
            
            # Cancel background tasks
            for task in self.processing_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            self.logger.info("Usage-Based Billing System shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
    
    async def record_usage(
        self,
        tenant_id: str,
        metric_type: UsageMetricType,
        value: Union[int, float, Decimal],
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """Record a usage metric."""
        try:
            metric_id = str(uuid.uuid4())
            
            usage_metric = UsageMetric(
                metric_id=metric_id,
                tenant_id=tenant_id,
                metric_type=metric_type,
                value=Decimal(str(value)),
                unit=self._get_metric_unit(metric_type),
                timestamp=datetime.utcnow(),
                metadata=metadata or {}
            )
            
            # Add to buffer for real-time processing
            self.usage_buffer.append(usage_metric)
            
            # Queue for processing
            await self.usage_queue.put(usage_metric)
            
            self.logger.debug(f"Recorded usage: {tenant_id} - {metric_type.value}: {value}")
            return metric_id
            
        except Exception as e:
            self.logger.error(f"Failed to record usage: {e}")
            raise
    
    async def calculate_cost(
        self,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Calculate cost for a tenant over a period."""
        try:
            subscription = self.tenant_subscriptions.get(tenant_id)
            if not subscription:
                raise ValueError(f"No subscription found for tenant: {tenant_id}")
            
            plan = self.billing_plans.get(subscription.plan_id)
            if not plan:
                raise ValueError(f"No billing plan found: {subscription.plan_id}")
            
            # Get usage metrics for the period
            period_usage = await self._get_usage_for_period(tenant_id, start_date, end_date)
            
            # Calculate costs based on billing model
            cost_breakdown = {}
            total_cost = Decimal('0')
            
            if plan.billing_model == BillingModel.PER_AGENT:
                agent_cost = await self._calculate_per_agent_cost(period_usage, plan)
                cost_breakdown["agent_cost"] = agent_cost
                total_cost += agent_cost["total"]
            
            elif plan.billing_model == BillingModel.PER_USER:
                user_cost = await self._calculate_per_user_cost(period_usage, plan)
                cost_breakdown["user_cost"] = user_cost
                total_cost += user_cost["total"]
            
            elif plan.billing_model == BillingModel.CONSUMPTION_BASED:
                consumption_cost = await self._calculate_consumption_cost(period_usage, plan)
                cost_breakdown["consumption_cost"] = consumption_cost
                total_cost += consumption_cost["total"]
            
            elif plan.billing_model == BillingModel.HYBRID:
                # Combine multiple billing models
                base_cost = plan.base_price
                usage_cost = await self._calculate_consumption_cost(period_usage, plan)
                cost_breakdown["base_cost"] = float(base_cost)
                cost_breakdown["usage_cost"] = usage_cost
                total_cost = base_cost + usage_cost["total"]
            
            # Add base price if applicable
            if plan.base_price > 0:
                cost_breakdown["base_price"] = float(plan.base_price)
                total_cost += plan.base_price
            
            return {
                "tenant_id": tenant_id,
                "period": {
                    "start": start_date.isoformat(),
                    "end": end_date.isoformat()
                },
                "plan": {
                    "id": plan.plan_id,
                    "name": plan.name,
                    "billing_model": plan.billing_model.value
                },
                "cost_breakdown": cost_breakdown,
                "total_cost": float(total_cost),
                "currency": "USD",
                "calculated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to calculate cost: {e}")
            return {"error": str(e)}
    
    async def generate_invoice(
        self,
        tenant_id: str,
        billing_period_start: datetime,
        billing_period_end: datetime
    ) -> str:
        """Generate an invoice for a tenant."""
        try:
            # Calculate costs for the period
            cost_data = await self.calculate_cost(tenant_id, billing_period_start, billing_period_end)
            
            if "error" in cost_data:
                raise ValueError(f"Failed to calculate costs: {cost_data['error']}")
            
            # Create invoice
            invoice_id = str(uuid.uuid4())
            subtotal = Decimal(str(cost_data["total_cost"]))
            tax_rate = Decimal('0.08')  # 8% tax rate (configurable)
            tax_amount = (subtotal * tax_rate).quantize(Decimal('0.01'), rounding=ROUND_HALF_UP)
            total_amount = subtotal + tax_amount
            
            # Create line items
            line_items = []
            for item_name, item_data in cost_data["cost_breakdown"].items():
                if isinstance(item_data, dict) and "total" in item_data:
                    line_items.append({
                        "description": item_name.replace("_", " ").title(),
                        "quantity": 1,
                        "unit_price": float(item_data["total"]),
                        "total": float(item_data["total"])
                    })
                elif isinstance(item_data, (int, float)):
                    line_items.append({
                        "description": item_name.replace("_", " ").title(),
                        "quantity": 1,
                        "unit_price": float(item_data),
                        "total": float(item_data)
                    })
            
            invoice = Invoice(
                invoice_id=invoice_id,
                tenant_id=tenant_id,
                billing_period_start=billing_period_start,
                billing_period_end=billing_period_end,
                subtotal=subtotal,
                tax_amount=tax_amount,
                total_amount=total_amount,
                currency="USD",
                status=PaymentStatus.PENDING,
                due_date=datetime.utcnow() + timedelta(days=30),
                created_at=datetime.utcnow(),
                paid_at=None,
                line_items=line_items,
                usage_summary=cost_data
            )
            
            # Store invoice
            self.invoices[invoice_id] = invoice
            
            # Queue for payment processing
            await self.billing_queue.put({
                "type": "invoice_created",
                "invoice_id": invoice_id,
                "tenant_id": tenant_id
            })
            
            self.logger.info(f"Generated invoice {invoice_id} for tenant {tenant_id}")
            return invoice_id
            
        except Exception as e:
            self.logger.error(f"Failed to generate invoice: {e}")
            raise
    
    async def get_usage_analytics(
        self,
        tenant_id: str,
        time_period_days: int = 30,
        granularity: str = "daily"
    ) -> Dict[str, Any]:
        """Get usage analytics for a tenant."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=time_period_days)
            
            # Get usage data for the period
            usage_data = await self._get_usage_for_period(tenant_id, start_date, end_date)
            
            # Aggregate by granularity
            aggregated_data = self._aggregate_usage_by_granularity(usage_data, granularity)
            
            # Calculate trends
            trends = self._calculate_usage_trends(aggregated_data)
            
            # Get cost projections
            projections = await self._calculate_cost_projections(tenant_id, usage_data)
            
            # Usage distribution by metric type
            metric_distribution = defaultdict(Decimal)
            for metrics in usage_data.values():
                for metric in metrics:
                    metric_distribution[metric.metric_type.value] += metric.value
            
            return {
                "tenant_id": tenant_id,
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": time_period_days
                },
                "usage_summary": {
                    metric_type: float(total_value)
                    for metric_type, total_value in metric_distribution.items()
                },
                "time_series": aggregated_data,
                "trends": trends,
                "projections": projections,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get usage analytics: {e}")
            return {"error": str(e)}
    
    async def get_cost_optimization_recommendations(
        self,
        tenant_id: str
    ) -> Dict[str, Any]:
        """Get cost optimization recommendations for a tenant."""
        try:
            # Analyze recent usage patterns
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            
            usage_data = await self._get_usage_for_period(tenant_id, start_date, end_date)
            current_subscription = self.tenant_subscriptions.get(tenant_id)
            
            recommendations = []
            potential_savings = Decimal('0')
            
            if current_subscription:
                current_plan = self.billing_plans.get(current_subscription.plan_id)
                
                # Analyze plan optimization
                plan_recommendations = await self._analyze_plan_optimization(
                    tenant_id, usage_data, current_plan
                )
                recommendations.extend(plan_recommendations["recommendations"])
                potential_savings += plan_recommendations["potential_savings"]
                
                # Analyze usage optimization
                usage_recommendations = await self._analyze_usage_optimization(usage_data)
                recommendations.extend(usage_recommendations["recommendations"])
                potential_savings += usage_recommendations["potential_savings"]
                
                # Analyze resource optimization
                resource_recommendations = await self._analyze_resource_optimization(tenant_id)
                recommendations.extend(resource_recommendations["recommendations"])
                potential_savings += resource_recommendations["potential_savings"]
            
            return {
                "tenant_id": tenant_id,
                "recommendations": recommendations,
                "potential_monthly_savings": float(potential_savings),
                "analysis_period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat()
                },
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get cost optimization recommendations: {e}")
            return {"error": str(e)}</parameter>
</invoke>  
  
    # Private methods
    def _get_metric_unit(self, metric_type: UsageMetricType) -> str:
        """Get the unit for a metric type."""
        unit_map = {
            UsageMetricType.AGENT_HOURS: "hours",
            UsageMetricType.API_CALLS: "calls",
            UsageMetricType.DATA_PROCESSED_GB: "GB",
            UsageMetricType.STORAGE_GB: "GB",
            UsageMetricType.COMPUTE_HOURS: "hours",
            UsageMetricType.THREAT_DETECTIONS: "detections",
            UsageMetricType.INCIDENTS_PROCESSED: "incidents",
            UsageMetricType.INTEGRATIONS_ACTIVE: "integrations",
            UsageMetricType.USERS_ACTIVE: "users",
            UsageMetricType.BANDWIDTH_GB: "GB"
        }
        return unit_map.get(metric_type, "units")
    
    async def _load_default_billing_plans(self) -> None:
        """Load default billing plans."""
        try:
            # Starter Plan - Per Agent
            starter_plan = BillingPlan(
                plan_id="starter_per_agent",
                name="Starter Plan",
                description="Perfect for small teams getting started with ACSO",
                billing_model=BillingModel.PER_AGENT,
                billing_period=BillingPeriod.MONTHLY,
                base_price=Decimal('0'),
                pricing_tiers=[
                    PricingTier(
                        tier_id="agent_tier_1",
                        name="Agent Usage",
                        description="Per agent per month",
                        metric_type=UsageMetricType.AGENT_HOURS,
                        unit_price=Decimal('99.00'),
                        min_units=Decimal('1'),
                        max_units=Decimal('10'),
                        overage_price=Decimal('99.00'),
                        included_units=Decimal('744')  # 24*31 hours per month
                    )
                ],
                features=["Basic threat detection", "Incident response", "Email support"],
                limits={"max_agents": 10, "max_integrations": 5},
                trial_period_days=14
            )
            
            # Professional Plan - Hybrid
            professional_plan = BillingPlan(
                plan_id="professional_hybrid",
                name="Professional Plan",
                description="Advanced features for growing organizations",
                billing_model=BillingModel.HYBRID,
                billing_period=BillingPeriod.MONTHLY,
                base_price=Decimal('499.00'),
                pricing_tiers=[
                    PricingTier(
                        tier_id="api_calls_tier",
                        name="API Calls",
                        description="Per 1000 API calls",
                        metric_type=UsageMetricType.API_CALLS,
                        unit_price=Decimal('0.10'),
                        min_units=Decimal('0'),
                        max_units=None,
                        overage_price=Decimal('0.10'),
                        included_units=Decimal('100000')  # 100k included calls
                    ),
                    PricingTier(
                        tier_id="data_processing_tier",
                        name="Data Processing",
                        description="Per GB processed",
                        metric_type=UsageMetricType.DATA_PROCESSED_GB,
                        unit_price=Decimal('0.50'),
                        min_units=Decimal('0'),
                        max_units=None,
                        overage_price=Decimal('0.50'),
                        included_units=Decimal('1000')  # 1TB included
                    )
                ],
                features=[
                    "Advanced threat detection", "Automated response", "Custom integrations",
                    "Priority support", "Advanced analytics"
                ],
                limits={"max_agents": 100, "max_integrations": 20},
                trial_period_days=30
            )
            
            # Enterprise Plan - Consumption Based
            enterprise_plan = BillingPlan(
                plan_id="enterprise_consumption",
                name="Enterprise Plan",
                description="Full-featured plan for large organizations",
                billing_model=BillingModel.CONSUMPTION_BASED,
                billing_period=BillingPeriod.MONTHLY,
                base_price=Decimal('2499.00'),
                pricing_tiers=[
                    PricingTier(
                        tier_id="compute_hours_tier",
                        name="Compute Hours",
                        description="Per compute hour",
                        metric_type=UsageMetricType.COMPUTE_HOURS,
                        unit_price=Decimal('2.00'),
                        min_units=Decimal('0'),
                        max_units=None,
                        overage_price=Decimal('2.00'),
                        included_units=Decimal('1000')  # 1000 hours included
                    ),
                    PricingTier(
                        tier_id="storage_tier",
                        name="Storage",
                        description="Per GB stored per month",
                        metric_type=UsageMetricType.STORAGE_GB,
                        unit_price=Decimal('0.25'),
                        min_units=Decimal('0'),
                        max_units=None,
                        overage_price=Decimal('0.25'),
                        included_units=Decimal('10000')  # 10TB included
                    ),
                    PricingTier(
                        tier_id="threat_detections_tier",
                        name="Threat Detections",
                        description="Per threat detection",
                        metric_type=UsageMetricType.THREAT_DETECTIONS,
                        unit_price=Decimal('0.01'),
                        min_units=Decimal('0'),
                        max_units=None,
                        overage_price=Decimal('0.01'),
                        included_units=Decimal('1000000')  # 1M included
                    )
                ],
                features=[
                    "All Professional features", "White-label branding", "Custom SLA",
                    "Dedicated support", "Advanced compliance", "Custom development"
                ],
                limits={"max_agents": -1, "max_integrations": -1},  # Unlimited
                trial_period_days=30
            )
            
            # Store plans
            self.billing_plans[starter_plan.plan_id] = starter_plan
            self.billing_plans[professional_plan.plan_id] = professional_plan
            self.billing_plans[enterprise_plan.plan_id] = enterprise_plan
            
            self.logger.info("Loaded default billing plans")
            
        except Exception as e:
            self.logger.error(f"Failed to load default billing plans: {e}")
    
    async def _get_usage_for_period(
        self,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, List[UsageMetric]]:
        """Get usage metrics for a tenant within a time period."""
        try:
            period_usage = defaultdict(list)
            
            # Get metrics from storage
            tenant_metrics = self.usage_metrics.get(tenant_id, [])
            
            for metric in tenant_metrics:
                if start_date <= metric.timestamp <= end_date:
                    period_usage[metric.metric_type.value].append(metric)
            
            return dict(period_usage)
            
        except Exception as e:
            self.logger.error(f"Failed to get usage for period: {e}")
            return {}
    
    async def _calculate_per_agent_cost(
        self,
        usage_data: Dict[str, List[UsageMetric]],
        plan: BillingPlan
    ) -> Dict[str, Any]:
        """Calculate cost for per-agent billing model."""
        try:
            agent_tier = next(
                (tier for tier in plan.pricing_tiers if tier.metric_type == UsageMetricType.AGENT_HOURS),
                None
            )
            
            if not agent_tier:
                return {"total": Decimal('0'), "breakdown": {}}
            
            # Calculate total agent hours
            agent_metrics = usage_data.get(UsageMetricType.AGENT_HOURS.value, [])
            total_hours = sum(metric.value for metric in agent_metrics)
            
            # Calculate number of agents (assuming 744 hours per agent per month)
            hours_per_agent_per_month = Decimal('744')  # 24 * 31
            num_agents = (total_hours / hours_per_agent_per_month).quantize(
                Decimal('1'), rounding=ROUND_HALF_UP
            )
            
            # Apply pricing
            base_cost = min(num_agents, agent_tier.max_units or num_agents) * agent_tier.unit_price
            overage_cost = Decimal('0')
            
            if agent_tier.max_units and num_agents > agent_tier.max_units:
                overage_agents = num_agents - agent_tier.max_units
                overage_cost = overage_agents * (agent_tier.overage_price or agent_tier.unit_price)
            
            total_cost = base_cost + overage_cost
            
            return {
                "total": total_cost,
                "breakdown": {
                    "num_agents": float(num_agents),
                    "total_hours": float(total_hours),
                    "base_cost": float(base_cost),
                    "overage_cost": float(overage_cost),
                    "unit_price": float(agent_tier.unit_price)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to calculate per-agent cost: {e}")
            return {"total": Decimal('0'), "breakdown": {}}
    
    async def _calculate_per_user_cost(
        self,
        usage_data: Dict[str, List[UsageMetric]],
        plan: BillingPlan
    ) -> Dict[str, Any]:
        """Calculate cost for per-user billing model."""
        try:
            user_tier = next(
                (tier for tier in plan.pricing_tiers if tier.metric_type == UsageMetricType.USERS_ACTIVE),
                None
            )
            
            if not user_tier:
                return {"total": Decimal('0'), "breakdown": {}}
            
            # Get unique active users
            user_metrics = usage_data.get(UsageMetricType.USERS_ACTIVE.value, [])
            if not user_metrics:
                return {"total": Decimal('0'), "breakdown": {}}
            
            # Take the maximum number of active users in the period
            max_users = max(metric.value for metric in user_metrics)
            
            # Apply pricing
            base_cost = min(max_users, user_tier.max_units or max_users) * user_tier.unit_price
            overage_cost = Decimal('0')
            
            if user_tier.max_units and max_users > user_tier.max_units:
                overage_users = max_users - user_tier.max_units
                overage_cost = overage_users * (user_tier.overage_price or user_tier.unit_price)
            
            total_cost = base_cost + overage_cost
            
            return {
                "total": total_cost,
                "breakdown": {
                    "max_users": float(max_users),
                    "base_cost": float(base_cost),
                    "overage_cost": float(overage_cost),
                    "unit_price": float(user_tier.unit_price)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to calculate per-user cost: {e}")
            return {"total": Decimal('0'), "breakdown": {}}
    
    async def _calculate_consumption_cost(
        self,
        usage_data: Dict[str, List[UsageMetric]],
        plan: BillingPlan
    ) -> Dict[str, Any]:
        """Calculate cost for consumption-based billing model."""
        try:
            total_cost = Decimal('0')
            breakdown = {}
            
            for tier in plan.pricing_tiers:
                metrics = usage_data.get(tier.metric_type.value, [])
                if not metrics:
                    continue
                
                # Sum total usage for this metric type
                total_usage = sum(metric.value for metric in metrics)
                
                # Calculate billable usage (subtract included units)
                billable_usage = max(Decimal('0'), total_usage - tier.included_units)
                
                # Calculate cost
                tier_cost = billable_usage * tier.unit_price
                total_cost += tier_cost
                
                breakdown[tier.metric_type.value] = {
                    "total_usage": float(total_usage),
                    "included_units": float(tier.included_units),
                    "billable_usage": float(billable_usage),
                    "unit_price": float(tier.unit_price),
                    "tier_cost": float(tier_cost)
                }
            
            return {
                "total": total_cost,
                "breakdown": breakdown
            }
            
        except Exception as e:
            self.logger.error(f"Failed to calculate consumption cost: {e}")
            return {"total": Decimal('0'), "breakdown": {}}
    
    def _aggregate_usage_by_granularity(
        self,
        usage_data: Dict[str, List[UsageMetric]],
        granularity: str
    ) -> Dict[str, Any]:
        """Aggregate usage data by time granularity."""
        try:
            aggregated = defaultdict(lambda: defaultdict(Decimal))
            
            for metric_type, metrics in usage_data.items():
                for metric in metrics:
                    # Determine time bucket based on granularity
                    if granularity == "hourly":
                        time_bucket = metric.timestamp.strftime("%Y-%m-%d %H:00")
                    elif granularity == "daily":
                        time_bucket = metric.timestamp.strftime("%Y-%m-%d")
                    elif granularity == "weekly":
                        # Get Monday of the week
                        monday = metric.timestamp - timedelta(days=metric.timestamp.weekday())
                        time_bucket = monday.strftime("%Y-%m-%d")
                    elif granularity == "monthly":
                        time_bucket = metric.timestamp.strftime("%Y-%m")
                    else:
                        time_bucket = metric.timestamp.strftime("%Y-%m-%d")
                    
                    aggregated[time_bucket][metric_type] += metric.value
            
            # Convert to regular dict with float values
            result = {}
            for time_bucket, metrics in aggregated.items():
                result[time_bucket] = {
                    metric_type: float(value) for metric_type, value in metrics.items()
                }
            
            return result
            
        except Exception as e:
            self.logger.error(f"Failed to aggregate usage by granularity: {e}")
            return {}
    
    def _calculate_usage_trends(self, aggregated_data: Dict[str, Any]) -> Dict[str, Any]:
        """Calculate usage trends from aggregated data."""
        try:
            trends = {}
            
            # Sort time buckets
            sorted_buckets = sorted(aggregated_data.keys())
            
            if len(sorted_buckets) < 2:
                return trends
            
            # Calculate trends for each metric type
            all_metrics = set()
            for bucket_data in aggregated_data.values():
                all_metrics.update(bucket_data.keys())
            
            for metric_type in all_metrics:
                values = []
                for bucket in sorted_buckets:
                    values.append(aggregated_data[bucket].get(metric_type, 0))
                
                if len(values) >= 2:
                    # Calculate simple trend (percentage change from first to last)
                    first_value = values[0] or 0.001  # Avoid division by zero
                    last_value = values[-1]
                    
                    trend_percentage = ((last_value - first_value) / first_value) * 100
                    
                    # Calculate average
                    avg_value = sum(values) / len(values)
                    
                    trends[metric_type] = {
                        "trend_percentage": round(trend_percentage, 2),
                        "average_value": round(avg_value, 2),
                        "min_value": min(values),
                        "max_value": max(values),
                        "data_points": len(values)
                    }
            
            return trends
            
        except Exception as e:
            self.logger.error(f"Failed to calculate usage trends: {e}")
            return {}
    
    async def _calculate_cost_projections(
        self,
        tenant_id: str,
        usage_data: Dict[str, List[UsageMetric]]
    ) -> Dict[str, Any]:
        """Calculate cost projections based on usage trends."""
        try:
            subscription = self.tenant_subscriptions.get(tenant_id)
            if not subscription:
                return {}
            
            plan = self.billing_plans.get(subscription.plan_id)
            if not plan:
                return {}
            
            # Calculate current monthly cost
            current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            current_month_end = datetime.utcnow()
            
            current_cost_data = await self.calculate_cost(tenant_id, current_month_start, current_month_end)
            current_monthly_cost = current_cost_data.get("total_cost", 0)
            
            # Project based on current usage trends
            projections = {}
            
            # Simple projection: assume current trend continues
            days_in_month = 30
            days_elapsed = (current_month_end - current_month_start).days + 1
            
            if days_elapsed > 0:
                daily_average = current_monthly_cost / days_elapsed
                projected_monthly = daily_average * days_in_month
                
                projections["current_month"] = {
                    "projected_total": round(projected_monthly, 2),
                    "current_total": round(current_monthly_cost, 2),
                    "days_elapsed": days_elapsed,
                    "daily_average": round(daily_average, 2)
                }
                
                # Project next 3 months (assuming 10% growth)
                growth_rate = 1.1
                for i in range(1, 4):
                    projected_cost = projected_monthly * (growth_rate ** i)
                    projections[f"month_plus_{i}"] = {
                        "projected_total": round(projected_cost, 2),
                        "growth_assumption": f"{((growth_rate - 1) * 100):.0f}% monthly growth"
                    }
            
            return projections
            
        except Exception as e:
            self.logger.error(f"Failed to calculate cost projections: {e}")
            return {}
    
    async def _analyze_plan_optimization(
        self,
        tenant_id: str,
        usage_data: Dict[str, List[UsageMetric]],
        current_plan: Optional[BillingPlan]
    ) -> Dict[str, Any]:
        """Analyze plan optimization opportunities."""
        try:
            recommendations = []
            potential_savings = Decimal('0')
            
            if not current_plan:
                return {"recommendations": recommendations, "potential_savings": potential_savings}
            
            # Calculate current cost
            current_cost_data = await self._calculate_consumption_cost(usage_data, current_plan)
            current_cost = current_cost_data["total"] + current_plan.base_price
            
            # Test other plans
            for plan_id, plan in self.billing_plans.items():
                if plan_id == current_plan.plan_id:
                    continue
                
                # Calculate cost with this plan
                if plan.billing_model == BillingModel.CONSUMPTION_BASED:
                    test_cost_data = await self._calculate_consumption_cost(usage_data, plan)
                    test_cost = test_cost_data["total"] + plan.base_price
                elif plan.billing_model == BillingModel.PER_AGENT:
                    test_cost_data = await self._calculate_per_agent_cost(usage_data, plan)
                    test_cost = test_cost_data["total"] + plan.base_price
                elif plan.billing_model == BillingModel.PER_USER:
                    test_cost_data = await self._calculate_per_user_cost(usage_data, plan)
                    test_cost = test_cost_data["total"] + plan.base_price
                else:
                    continue
                
                # Check if this plan would be cheaper
                if test_cost < current_cost:
                    savings = current_cost - test_cost
                    if savings > potential_savings:
                        potential_savings = savings
                        
                        recommendations.append({
                            "type": "plan_change",
                            "title": f"Switch to {plan.name}",
                            "description": f"Could save ${float(savings):.2f}/month by switching plans",
                            "current_plan": current_plan.name,
                            "recommended_plan": plan.name,
                            "monthly_savings": float(savings),
                            "priority": "high" if savings > 100 else "medium"
                        })
            
            return {"recommendations": recommendations, "potential_savings": potential_savings}
            
        except Exception as e:
            self.logger.error(f"Failed to analyze plan optimization: {e}")
            return {"recommendations": [], "potential_savings": Decimal('0')}
    
    async def _analyze_usage_optimization(
        self,
        usage_data: Dict[str, List[UsageMetric]]
    ) -> Dict[str, Any]:
        """Analyze usage optimization opportunities."""
        try:
            recommendations = []
            potential_savings = Decimal('0')
            
            # Analyze each metric type for optimization opportunities
            for metric_type, metrics in usage_data.items():
                if not metrics:
                    continue
                
                total_usage = sum(metric.value for metric in metrics)
                avg_usage = total_usage / len(metrics)
                
                # Check for high usage patterns
                if metric_type == UsageMetricType.API_CALLS.value:
                    if avg_usage > 1000:  # High API usage
                        recommendations.append({
                            "type": "usage_optimization",
                            "title": "Optimize API Usage",
                            "description": "High API call volume detected. Consider implementing caching or batching.",
                            "metric_type": metric_type,
                            "current_usage": float(total_usage),
                            "potential_reduction": "20-30%",
                            "priority": "medium"
                        })
                        potential_savings += Decimal('50')  # Estimated savings
                
                elif metric_type == UsageMetricType.STORAGE_GB.value:
                    if total_usage > 5000:  # High storage usage
                        recommendations.append({
                            "type": "usage_optimization",
                            "title": "Optimize Storage Usage",
                            "description": "High storage usage detected. Consider data archiving or compression.",
                            "metric_type": metric_type,
                            "current_usage": float(total_usage),
                            "potential_reduction": "15-25%",
                            "priority": "medium"
                        })
                        potential_savings += Decimal('100')  # Estimated savings
                
                elif metric_type == UsageMetricType.COMPUTE_HOURS.value:
                    if avg_usage > 500:  # High compute usage
                        recommendations.append({
                            "type": "usage_optimization",
                            "title": "Optimize Compute Usage",
                            "description": "High compute usage detected. Consider auto-scaling or resource optimization.",
                            "metric_type": metric_type,
                            "current_usage": float(total_usage),
                            "potential_reduction": "10-20%",
                            "priority": "high"
                        })
                        potential_savings += Decimal('200')  # Estimated savings
            
            return {"recommendations": recommendations, "potential_savings": potential_savings}
            
        except Exception as e:
            self.logger.error(f"Failed to analyze usage optimization: {e}")
            return {"recommendations": [], "potential_savings": Decimal('0')}
    
    async def _analyze_resource_optimization(self, tenant_id: str) -> Dict[str, Any]:
        """Analyze resource optimization opportunities."""
        try:
            recommendations = []
            potential_savings = Decimal('0')
            
            # Get AWS cost data if available
            if self.aws_billing_integration:
                try:
                    end_date = datetime.utcnow()
                    start_date = end_date - timedelta(days=30)
                    
                    cost_data = await self.aws_billing_integration.get_cost_and_usage(
                        start_date, end_date, "DAILY", ["SERVICE"]
                    )
                    
                    # Analyze AWS costs for optimization opportunities
                    for result in cost_data.get("ResultsByTime", []):
                        for group in result.get("Groups", []):
                            service = group["Keys"][0]
                            amount = float(group["Metrics"]["BlendedCost"]["Amount"])
                            
                            # Check for high-cost services
                            if service == "Amazon Elastic Compute Cloud - Compute" and amount > 500:
                                recommendations.append({
                                    "type": "resource_optimization",
                                    "title": "EC2 Cost Optimization",
                                    "description": "High EC2 costs detected. Consider reserved instances or spot instances.",
                                    "service": service,
                                    "monthly_cost": amount,
                                    "potential_reduction": "20-40%",
                                    "priority": "high"
                                })
                                potential_savings += Decimal(str(amount * 0.3))
                            
                            elif service == "Amazon Simple Storage Service" and amount > 200:
                                recommendations.append({
                                    "type": "resource_optimization",
                                    "title": "S3 Cost Optimization",
                                    "description": "High S3 costs detected. Consider lifecycle policies or storage class optimization.",
                                    "service": service,
                                    "monthly_cost": amount,
                                    "potential_reduction": "15-30%",
                                    "priority": "medium"
                                })
                                potential_savings += Decimal(str(amount * 0.2))
                
                except Exception as e:
                    self.logger.warning(f"Failed to get AWS cost data: {e}")
            
            return {"recommendations": recommendations, "potential_savings": potential_savings}
            
        except Exception as e:
            self.logger.error(f"Failed to analyze resource optimization: {e}")
            return {"recommendations": [], "potential_savings": Decimal('0')}
    
    # Background task methods
    async def _usage_processor(self) -> None:
        """Process usage metrics from the queue."""
        while self.system_active:
            try:
                # Get next usage metric from queue
                usage_metric = await asyncio.wait_for(
                    self.usage_queue.get(),
                    timeout=1.0
                )
                
                # Store usage metric
                self.usage_metrics[usage_metric.tenant_id].append(usage_metric)
                
                # Update real-time aggregates
                self.usage_aggregates[usage_metric.tenant_id][usage_metric.metric_type.value] += usage_metric.value
                
                # Send to Stripe if metered billing is enabled
                if self.stripe_integration:
                    await self._send_usage_to_stripe(usage_metric)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error(f"Error in usage processor: {e}")
                await asyncio.sleep(5)
    
    async def _billing_processor(self) -> None:
        """Process billing events from the queue."""
        while self.system_active:
            try:
                # Get next billing event from queue
                billing_event = await asyncio.wait_for(
                    self.billing_queue.get(),
                    timeout=1.0
                )
                
                # Process based on event type
                if billing_event["type"] == "invoice_created":
                    await self._process_invoice_created(billing_event)
                elif billing_event["type"] == "payment_received":
                    await self._process_payment_received(billing_event)
                elif billing_event["type"] == "subscription_updated":
                    await self._process_subscription_updated(billing_event)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error(f"Error in billing processor: {e}")
                await asyncio.sleep(5)
    
    async def _invoice_generator(self) -> None:
        """Generate invoices for active subscriptions."""
        while self.system_active:
            try:
                current_time = datetime.utcnow()
                
                # Check for subscriptions that need invoicing
                for subscription in self.tenant_subscriptions.values():
                    if (subscription.status == "active" and
                        current_time >= subscription.current_period_end):
                        
                        # Generate invoice for the completed period
                        await self.generate_invoice(
                            subscription.tenant_id,
                            subscription.current_period_start,
                            subscription.current_period_end
                        )
                        
                        # Update subscription period
                        if subscription.plan_id in self.billing_plans:
                            plan = self.billing_plans[subscription.plan_id]
                            if plan.billing_period == BillingPeriod.MONTHLY:
                                next_period_end = subscription.current_period_end + timedelta(days=30)
                            elif plan.billing_period == BillingPeriod.QUARTERLY:
                                next_period_end = subscription.current_period_end + timedelta(days=90)
                            elif plan.billing_period == BillingPeriod.ANNUALLY:
                                next_period_end = subscription.current_period_end + timedelta(days=365)
                            else:
                                next_period_end = subscription.current_period_end + timedelta(days=30)
                            
                            subscription.current_period_start = subscription.current_period_end
                            subscription.current_period_end = next_period_end
                
                await asyncio.sleep(3600)  # Check every hour
                
            except Exception as e:
                self.logger.error(f"Error in invoice generator: {e}")
                await asyncio.sleep(1800)
    
    async def _usage_aggregator(self) -> None:
        """Aggregate usage metrics for reporting."""
        while self.system_active:
            try:
                # Clean up old usage metrics (keep last 90 days)
                cutoff_date = datetime.utcnow() - timedelta(days=90)
                
                for tenant_id in list(self.usage_metrics.keys()):
                    self.usage_metrics[tenant_id] = [
                        metric for metric in self.usage_metrics[tenant_id]
                        if metric.timestamp >= cutoff_date
                    ]
                
                await asyncio.sleep(86400)  # Run daily
                
            except Exception as e:
                self.logger.error(f"Error in usage aggregator: {e}")
                await asyncio.sleep(43200)
    
    async def _cost_optimizer(self) -> None:
        """Run cost optimization analysis."""
        while self.system_active:
            try:
                # Run optimization analysis for all tenants
                for tenant_id in self.tenant_subscriptions.keys():
                    recommendations = await self.get_cost_optimization_recommendations(tenant_id)
                    
                    # Log high-priority recommendations
                    for rec in recommendations.get("recommendations", []):
                        if rec.get("priority") == "high":
                            self.logger.info(f"High-priority cost optimization for {tenant_id}: {rec['title']}")
                
                await asyncio.sleep(604800)  # Run weekly
                
            except Exception as e:
                self.logger.error(f"Error in cost optimizer: {e}")
                await asyncio.sleep(86400)
    
    async def _send_usage_to_stripe(self, usage_metric: UsageMetric) -> None:
        """Send usage metric to Stripe for metered billing."""
        try:
            # In production, this would send usage to Stripe
            # For now, just log the action
            self.logger.debug(f"Would send usage to Stripe: {usage_metric.tenant_id} - {usage_metric.metric_type.value}: {usage_metric.value}")
            
        except Exception as e:
            self.logger.error(f"Failed to send usage to Stripe: {e}")
    
    async def _process_invoice_created(self, event: Dict[str, Any]) -> None:
        """Process invoice created event."""
        try:
            # In production, this would handle invoice processing
            self.logger.info(f"Processing invoice created: {event['invoice_id']}")
            
        except Exception as e:
            self.logger.error(f"Failed to process invoice created event: {e}")
    
    async def _process_payment_received(self, event: Dict[str, Any]) -> None:
        """Process payment received event."""
        try:
            # In production, this would handle payment processing
            self.logger.info(f"Processing payment received: {event.get('payment_id')}")
            
        except Exception as e:
            self.logger.error(f"Failed to process payment received event: {e}")
    
    async def _process_subscription_updated(self, event: Dict[str, Any]) -> None:
        """Process subscription updated event."""
        try:
            # In production, this would handle subscription updates
            self.logger.info(f"Processing subscription updated: {event.get('subscription_id')}")
            
        except Exception as e:
            self.logger.error(f"Failed to process subscription updated event: {e}")</parameter>
</invoke>