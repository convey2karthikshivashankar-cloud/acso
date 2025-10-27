"""
Usage Tracker for ACSO Enterprise.
Tracks detailed usage metrics for billing and analytics.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import json

import prometheus_client
from ..models.tenancy import TenantTier


class UsageEventType(str, Enum):
    """Types of usage events."""
    AGENT_HOUR = "agent_hour"
    CPU_HOUR = "cpu_hour"
    MEMORY_GB_HOUR = "memory_gb_hour"
    STORAGE_GB_HOUR = "storage_gb_hour"
    API_REQUEST = "api_request"
    DATA_TRANSFER_GB = "data_transfer_gb"
    TASK_EXECUTION = "task_execution"
    INCIDENT_RESPONSE = "incident_response"
    THREAT_DETECTION = "threat_detection"


@dataclass
class UsageEvent:
    """Individual usage event."""
    tenant_id: str
    event_type: UsageEventType
    quantity: float
    unit_cost: float
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    @property
    def total_cost(self) -> float:
        return self.quantity * self.unit_cost


@dataclass
class UsageSummary:
    """Usage summary for a period."""
    tenant_id: str
    period_start: datetime
    period_end: datetime
    events: List[UsageEvent]
    
    @property
    def total_cost(self) -> float:
        return sum(event.total_cost for event in self.events)
    
    @property
    def event_counts(self) -> Dict[str, int]:
        counts = {}
        for event in self.events:
            counts[event.event_type.value] = counts.get(event.event_type.value, 0) + 1
        return counts


class UsageTracker:
    """
    Real-time usage tracking system.
    
    Tracks all billable events and provides analytics for:
    - Resource consumption
    - API usage
    - Feature utilization
    - Cost optimization insights
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Usage storage
        self.usage_events: Dict[str, List[UsageEvent]] = {}
        self.usage_summaries: Dict[str, List[UsageSummary]] = {}
        
        # Pricing configuration
        self.pricing_tiers = self._initialize_pricing_tiers()
        
        # Background tasks
        self.tracking_active = False
        self.tracking_tasks: List[asyncio.Task] = []
        
        # Prometheus metrics
        self.usage_events_counter = prometheus_client.Counter(
            'acso_usage_events_total',
            'Total usage events tracked',
            ['tenant_id', 'event_type']
        )
        
        self.usage_cost_gauge = prometheus_client.Gauge(
            'acso_usage_cost_usd',
            'Current usage cost in USD',
            ['tenant_id', 'period']
        )
        
    async def initialize(self) -> None:
        """Initialize the usage tracker."""
        try:
            self.logger.info("Initializing Usage Tracker")
            
            # Start background tasks
            self.tracking_active = True
            self.tracking_tasks = [
                asyncio.create_task(self._aggregate_usage_loop()),
                asyncio.create_task(self._cleanup_old_events_loop())
            ]
            
            self.logger.info("Usage Tracker initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Usage Tracker: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the usage tracker."""
        try:
            self.logger.info("Shutting down Usage Tracker")
            
            self.tracking_active = False
            
            # Cancel background tasks
            for task in self.tracking_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                        
            self.logger.info("Usage Tracker shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    async def track_usage(self, tenant_id: str, event_type: UsageEventType, 
                         quantity: float, metadata: Optional[Dict[str, Any]] = None) -> None:
        """
        Track a usage event.
        
        Args:
            tenant_id: ID of the tenant
            event_type: Type of usage event
            quantity: Quantity of usage
            metadata: Additional event metadata
        """
        try:
            # Get unit cost for the event type and tenant
            unit_cost = await self._get_unit_cost(tenant_id, event_type)
            
            # Create usage event
            event = UsageEvent(
                tenant_id=tenant_id,
                event_type=event_type,
                quantity=quantity,
                unit_cost=unit_cost,
                timestamp=datetime.utcnow(),
                metadata=metadata or {}
            )
            
            # Store event
            if tenant_id not in self.usage_events:
                self.usage_events[tenant_id] = []
            
            self.usage_events[tenant_id].append(event)
            
            # Update Prometheus metrics
            self.usage_events_counter.labels(
                tenant_id=tenant_id,
                event_type=event_type.value
            ).inc()
            
            self.logger.debug(f"Tracked usage event: {tenant_id} - {event_type.value} - {quantity}")
            
        except Exception as e:
            self.logger.error(f"Failed to track usage event: {e}")
            
    async def get_usage_summary(self, tenant_id: str, start_date: datetime, 
                               end_date: datetime) -> UsageSummary:
        """
        Get usage summary for a tenant over a period.
        
        Args:
            tenant_id: ID of the tenant
            start_date: Start of the period
            end_date: End of the period
            
        Returns:
            Usage summary
        """
        try:
            if tenant_id not in self.usage_events:
                return UsageSummary(
                    tenant_id=tenant_id,
                    period_start=start_date,
                    period_end=end_date,
                    events=[]
                )
            
            # Filter events by date range
            filtered_events = [
                event for event in self.usage_events[tenant_id]
                if start_date <= event.timestamp <= end_date
            ]
            
            return UsageSummary(
                tenant_id=tenant_id,
                period_start=start_date,
                period_end=end_date,
                events=filtered_events
            )
            
        except Exception as e:
            self.logger.error(f"Failed to get usage summary for {tenant_id}: {e}")
            return UsageSummary(
                tenant_id=tenant_id,
                period_start=start_date,
                period_end=end_date,
                events=[]
            )
            
    async def get_current_month_usage(self, tenant_id: str) -> Dict[str, Any]:
        """Get current month usage for a tenant."""
        try:
            now = datetime.utcnow()
            start_of_month = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            
            summary = await self.get_usage_summary(tenant_id, start_of_month, now)
            
            # Aggregate by event type
            usage_by_type = {}
            cost_by_type = {}
            
            for event in summary.events:
                event_type = event.event_type.value
                usage_by_type[event_type] = usage_by_type.get(event_type, 0) + event.quantity
                cost_by_type[event_type] = cost_by_type.get(event_type, 0) + event.total_cost
            
            return {
                'tenant_id': tenant_id,
                'period': {
                    'start': start_of_month.isoformat(),
                    'end': now.isoformat()
                },
                'usage_by_type': usage_by_type,
                'cost_by_type': cost_by_type,
                'total_cost': summary.total_cost,
                'total_events': len(summary.events)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get current month usage for {tenant_id}: {e}")
            return {'error': str(e)}
            
    async def get_usage_analytics(self, tenant_id: str, days: int = 30) -> Dict[str, Any]:
        """
        Get usage analytics for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            days: Number of days to analyze
            
        Returns:
            Usage analytics
        """
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=days)
            
            summary = await self.get_usage_summary(tenant_id, start_date, end_date)
            
            # Calculate daily usage
            daily_usage = {}
            daily_costs = {}
            
            for event in summary.events:
                day_key = event.timestamp.date().isoformat()
                
                if day_key not in daily_usage:
                    daily_usage[day_key] = {}
                    daily_costs[day_key] = 0
                
                event_type = event.event_type.value
                daily_usage[day_key][event_type] = daily_usage[day_key].get(event_type, 0) + event.quantity
                daily_costs[day_key] += event.total_cost
            
            # Calculate trends
            cost_trend = self._calculate_cost_trend(daily_costs)
            usage_patterns = self._analyze_usage_patterns(summary.events)
            
            return {
                'tenant_id': tenant_id,
                'analysis_period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat(),
                    'days': days
                },
                'daily_usage': daily_usage,
                'daily_costs': daily_costs,
                'total_cost': summary.total_cost,
                'average_daily_cost': summary.total_cost / days if days > 0 else 0,
                'cost_trend': cost_trend,
                'usage_patterns': usage_patterns,
                'recommendations': await self._generate_cost_recommendations(tenant_id, summary)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get usage analytics for {tenant_id}: {e}")
            return {'error': str(e)}
            
    async def track_agent_usage(self, tenant_id: str, agent_id: str, 
                               cpu_hours: float, memory_gb_hours: float) -> None:
        """Track agent resource usage."""
        await self.track_usage(tenant_id, UsageEventType.AGENT_HOUR, 1.0, {
            'agent_id': agent_id,
            'cpu_hours': cpu_hours,
            'memory_gb_hours': memory_gb_hours
        })
        
        await self.track_usage(tenant_id, UsageEventType.CPU_HOUR, cpu_hours, {
            'agent_id': agent_id
        })
        
        await self.track_usage(tenant_id, UsageEventType.MEMORY_GB_HOUR, memory_gb_hours, {
            'agent_id': agent_id
        })
        
    async def track_api_usage(self, tenant_id: str, endpoint: str, 
                             response_time_ms: float) -> None:
        """Track API usage."""
        await self.track_usage(tenant_id, UsageEventType.API_REQUEST, 1.0, {
            'endpoint': endpoint,
            'response_time_ms': response_time_ms
        })
        
    async def track_data_transfer(self, tenant_id: str, bytes_transferred: int, 
                                 transfer_type: str) -> None:
        """Track data transfer usage."""
        gb_transferred = bytes_transferred / (1024 ** 3)
        await self.track_usage(tenant_id, UsageEventType.DATA_TRANSFER_GB, gb_transferred, {
            'transfer_type': transfer_type,
            'bytes': bytes_transferred
        })
        
    async def track_task_execution(self, tenant_id: str, task_type: str, 
                                  duration_seconds: float, success: bool) -> None:
        """Track task execution."""
        await self.track_usage(tenant_id, UsageEventType.TASK_EXECUTION, 1.0, {
            'task_type': task_type,
            'duration_seconds': duration_seconds,
            'success': success
        })
        
    async def _get_unit_cost(self, tenant_id: str, event_type: UsageEventType) -> float:
        """Get unit cost for an event type based on tenant tier."""
        try:
            # This would typically fetch tenant tier from database
            # For now, assume Professional tier
            tier = TenantTier.PROFESSIONAL
            
            return self.pricing_tiers[tier].get(event_type, 0.0)
            
        except Exception as e:
            self.logger.error(f"Failed to get unit cost: {e}")
            return 0.0
            
    def _initialize_pricing_tiers(self) -> Dict[TenantTier, Dict[UsageEventType, float]]:
        """Initialize pricing tiers."""
        return {
            TenantTier.STARTER: {
                UsageEventType.AGENT_HOUR: 0.10,
                UsageEventType.CPU_HOUR: 0.05,
                UsageEventType.MEMORY_GB_HOUR: 0.02,
                UsageEventType.STORAGE_GB_HOUR: 0.001,
                UsageEventType.API_REQUEST: 0.0001,
                UsageEventType.DATA_TRANSFER_GB: 0.01,
                UsageEventType.TASK_EXECUTION: 0.001,
                UsageEventType.INCIDENT_RESPONSE: 0.50,
                UsageEventType.THREAT_DETECTION: 0.25
            },
            TenantTier.PROFESSIONAL: {
                UsageEventType.AGENT_HOUR: 0.08,
                UsageEventType.CPU_HOUR: 0.04,
                UsageEventType.MEMORY_GB_HOUR: 0.015,
                UsageEventType.STORAGE_GB_HOUR: 0.0008,
                UsageEventType.API_REQUEST: 0.00008,
                UsageEventType.DATA_TRANSFER_GB: 0.008,
                UsageEventType.TASK_EXECUTION: 0.0008,
                UsageEventType.INCIDENT_RESPONSE: 0.40,
                UsageEventType.THREAT_DETECTION: 0.20
            },
            TenantTier.ENTERPRISE: {
                UsageEventType.AGENT_HOUR: 0.06,
                UsageEventType.CPU_HOUR: 0.03,
                UsageEventType.MEMORY_GB_HOUR: 0.01,
                UsageEventType.STORAGE_GB_HOUR: 0.0006,
                UsageEventType.API_REQUEST: 0.00006,
                UsageEventType.DATA_TRANSFER_GB: 0.006,
                UsageEventType.TASK_EXECUTION: 0.0006,
                UsageEventType.INCIDENT_RESPONSE: 0.30,
                UsageEventType.THREAT_DETECTION: 0.15
            }
        }
        
    def _calculate_cost_trend(self, daily_costs: Dict[str, float]) -> Dict[str, Any]:
        """Calculate cost trend over time."""
        try:
            if len(daily_costs) < 2:
                return {'trend': 'insufficient_data'}
            
            costs = list(daily_costs.values())
            
            # Simple linear trend calculation
            n = len(costs)
            x_sum = sum(range(n))
            y_sum = sum(costs)
            xy_sum = sum(i * cost for i, cost in enumerate(costs))
            x2_sum = sum(i * i for i in range(n))
            
            slope = (n * xy_sum - x_sum * y_sum) / (n * x2_sum - x_sum * x_sum)
            
            if slope > 0.01:
                trend = 'increasing'
            elif slope < -0.01:
                trend = 'decreasing'
            else:
                trend = 'stable'
            
            return {
                'trend': trend,
                'slope': slope,
                'average_cost': y_sum / n,
                'total_cost': y_sum
            }
            
        except Exception as e:
            self.logger.error(f"Failed to calculate cost trend: {e}")
            return {'trend': 'error', 'error': str(e)}
            
    def _analyze_usage_patterns(self, events: List[UsageEvent]) -> Dict[str, Any]:
        """Analyze usage patterns."""
        try:
            if not events:
                return {'pattern': 'no_data'}
            
            # Analyze by hour of day
            hourly_usage = {}
            for event in events:
                hour = event.timestamp.hour
                hourly_usage[hour] = hourly_usage.get(hour, 0) + event.total_cost
            
            # Find peak usage hours
            if hourly_usage:
                peak_hour = max(hourly_usage, key=hourly_usage.get)
                low_hour = min(hourly_usage, key=hourly_usage.get)
            else:
                peak_hour = low_hour = 0
            
            # Analyze by event type
            type_distribution = {}
            for event in events:
                event_type = event.event_type.value
                type_distribution[event_type] = type_distribution.get(event_type, 0) + event.total_cost
            
            return {
                'peak_usage_hour': peak_hour,
                'low_usage_hour': low_hour,
                'hourly_distribution': hourly_usage,
                'cost_by_type': type_distribution,
                'total_events': len(events)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to analyze usage patterns: {e}")
            return {'pattern': 'error', 'error': str(e)}
            
    async def _generate_cost_recommendations(self, tenant_id: str, 
                                           summary: UsageSummary) -> List[Dict[str, Any]]:
        """Generate cost optimization recommendations."""
        try:
            recommendations = []
            
            if not summary.events:
                return recommendations
            
            # Analyze cost by event type
            cost_by_type = {}
            for event in summary.events:
                event_type = event.event_type.value
                cost_by_type[event_type] = cost_by_type.get(event_type, 0) + event.total_cost
            
            total_cost = summary.total_cost
            
            # High API usage recommendation
            api_cost = cost_by_type.get(UsageEventType.API_REQUEST.value, 0)
            if api_cost > total_cost * 0.3:
                recommendations.append({
                    'type': 'api_optimization',
                    'priority': 'high',
                    'title': 'High API Usage Detected',
                    'description': 'API requests account for a significant portion of your costs. Consider implementing caching or request batching.',
                    'potential_savings': api_cost * 0.2,
                    'actions': ['Implement response caching', 'Batch API requests', 'Review API usage patterns']
                })
            
            # High storage usage recommendation
            storage_cost = cost_by_type.get(UsageEventType.STORAGE_GB_HOUR.value, 0)
            if storage_cost > total_cost * 0.2:
                recommendations.append({
                    'type': 'storage_optimization',
                    'priority': 'medium',
                    'title': 'Storage Optimization Opportunity',
                    'description': 'Storage costs are significant. Consider data archival or compression.',
                    'potential_savings': storage_cost * 0.15,
                    'actions': ['Archive old data', 'Implement data compression', 'Review retention policies']
                })
            
            # Agent efficiency recommendation
            agent_cost = cost_by_type.get(UsageEventType.AGENT_HOUR.value, 0)
            cpu_cost = cost_by_type.get(UsageEventType.CPU_HOUR.value, 0)
            
            if agent_cost > 0 and cpu_cost > 0:
                efficiency_ratio = cpu_cost / agent_cost
                if efficiency_ratio < 0.5:  # Low CPU utilization
                    recommendations.append({
                        'type': 'agent_efficiency',
                        'priority': 'medium',
                        'title': 'Agent Efficiency Improvement',
                        'description': 'Agents appear to be underutilized. Consider consolidating workloads.',
                        'potential_savings': agent_cost * 0.25,
                        'actions': ['Consolidate agent workloads', 'Optimize agent scheduling', 'Review resource allocation']
                    })
            
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Failed to generate recommendations: {e}")
            return []
            
    async def _aggregate_usage_loop(self) -> None:
        """Background task to aggregate usage data."""
        while self.tracking_active:
            try:
                # Aggregate hourly usage summaries
                await self._create_hourly_summaries()
                
                # Update Prometheus metrics
                await self._update_usage_metrics()
                
                await asyncio.sleep(3600)  # Run every hour
                
            except Exception as e:
                self.logger.error(f"Error in usage aggregation: {e}")
                await asyncio.sleep(1800)
                
    async def _cleanup_old_events_loop(self) -> None:
        """Background task to clean up old usage events."""
        while self.tracking_active:
            try:
                cutoff_date = datetime.utcnow() - timedelta(days=90)
                
                for tenant_id in self.usage_events.keys():
                    # Keep only events from last 90 days
                    self.usage_events[tenant_id] = [
                        event for event in self.usage_events[tenant_id]
                        if event.timestamp > cutoff_date
                    ]
                
                await asyncio.sleep(86400)  # Run daily
                
            except Exception as e:
                self.logger.error(f"Error in usage cleanup: {e}")
                await asyncio.sleep(43200)
                
    async def _create_hourly_summaries(self) -> None:
        """Create hourly usage summaries."""
        try:
            current_hour = datetime.utcnow().replace(minute=0, second=0, microsecond=0)
            previous_hour = current_hour - timedelta(hours=1)
            
            for tenant_id in self.usage_events.keys():
                summary = await self.get_usage_summary(tenant_id, previous_hour, current_hour)
                
                if tenant_id not in self.usage_summaries:
                    self.usage_summaries[tenant_id] = []
                
                self.usage_summaries[tenant_id].append(summary)
                
                # Keep only last 30 days of summaries
                cutoff_date = datetime.utcnow() - timedelta(days=30)
                self.usage_summaries[tenant_id] = [
                    s for s in self.usage_summaries[tenant_id]
                    if s.period_start > cutoff_date
                ]
                
        except Exception as e:
            self.logger.error(f"Failed to create hourly summaries: {e}")
            
    async def _update_usage_metrics(self) -> None:
        """Update Prometheus usage metrics."""
        try:
            for tenant_id in self.usage_events.keys():
                # Get current month usage
                current_month = await self.get_current_month_usage(tenant_id)
                
                if 'total_cost' in current_month:
                    self.usage_cost_gauge.labels(
                        tenant_id=tenant_id,
                        period='current_month'
                    ).set(current_month['total_cost'])
                
        except Exception as e:
            self.logger.error(f"Failed to update usage metrics: {e}")