"""
Enterprise Tenant Manager

Manages complete tenant lifecycle including provisioning, isolation,
resource management, and billing integration.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import uuid

from .tenant_provisioner import TenantProvisioner
from .resource_quota_manager import ResourceQuotaManager
from .tenant_database_manager import TenantDatabaseManager
from ..models.tenancy import (
    TenantConfig, TenantEnvironment, TenantStatus,
    ResourceLimits, BillingInfo, ComplianceSettings
)


class TenantTier(str, Enum):
    """Tenant subscription tiers."""
    STARTER = "starter"
    PROFESSIONAL = "professional"
    ENTERPRISE = "enterprise"
    CUSTOM = "custom"


@dataclass
class TenantMetrics:
    """Tenant usage metrics."""
    tenant_id: str
    active_agents: int
    total_tasks_executed: int
    cpu_usage_hours: float
    memory_usage_gb_hours: float
    storage_usage_gb: float
    api_requests: int
    data_transfer_gb: float
    last_updated: datetime


class TenantManager:
    """
    Enterprise-grade multi-tenant management system.
    
    Provides complete tenant lifecycle management including:
    - Tenant provisioning and deprovisioning
    - Resource isolation and quota management
    - Billing and usage tracking
    - Compliance and security enforcement
    """
    
    def __init__(self):
        self.provisioner = TenantProvisioner()
        self.quota_manager = ResourceQuotaManager()
        self.database_manager = TenantDatabaseManager()
        
        # Tenant tracking
        self.tenants: Dict[str, TenantConfig] = {}
        self.tenant_environments: Dict[str, TenantEnvironment] = {}
        self.tenant_metrics: Dict[str, TenantMetrics] = {}
        
        # Background tasks
        self.monitoring_tasks: Dict[str, asyncio.Task] = {}
        
        self.logger = logging.getLogger(__name__)
        
    async def initialize(self) -> None:
        """Initialize the tenant manager and its components."""
        try:
            self.logger.info("Initializing Tenant Manager")
            
            # Initialize components
            await self.provisioner.initialize()
            await self.quota_manager.initialize()
            await self.database_manager.initialize()
            
            # Start background monitoring
            self.monitoring_tasks['usage_monitor'] = asyncio.create_task(
                self._monitor_tenant_usage()
            )
            self.monitoring_tasks['quota_enforcer'] = asyncio.create_task(
                self._enforce_resource_quotas()
            )
            self.monitoring_tasks['billing_tracker'] = asyncio.create_task(
                self._track_billing_metrics()
            )
            
            self.logger.info("Tenant Manager initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Tenant Manager: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the tenant manager."""
        try:
            self.logger.info("Shutting down Tenant Manager")
            
            # Cancel monitoring tasks
            for task_name, task in self.monitoring_tasks.items():
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                        
            # Shutdown components
            await self.database_manager.shutdown()
            await self.quota_manager.shutdown()
            await self.provisioner.shutdown()
            
            self.logger.info("Tenant Manager shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    async def provision_tenant(self, tenant_config: TenantConfig) -> TenantEnvironment:
        """
        Provision a complete isolated environment for a new tenant.
        
        Args:
            tenant_config: Configuration for the new tenant
            
        Returns:
            Provisioned tenant environment
        """
        try:
            tenant_id = tenant_config.tenant_id
            self.logger.info(f"Provisioning tenant: {tenant_id}")
            
            # Validate tenant configuration
            await self._validate_tenant_config(tenant_config)
            
            # Create tenant environment
            environment = await self.provisioner.provision_environment(tenant_config)
            
            # Set up database isolation
            database_config = await self.database_manager.create_tenant_database(tenant_id)
            environment.database_config = database_config
            
            # Configure resource quotas
            await self.quota_manager.set_tenant_quotas(tenant_id, tenant_config.resource_limits)
            
            # Store tenant configuration
            self.tenants[tenant_id] = tenant_config
            self.tenant_environments[tenant_id] = environment
            
            # Initialize metrics tracking
            self.tenant_metrics[tenant_id] = TenantMetrics(
                tenant_id=tenant_id,
                active_agents=0,
                total_tasks_executed=0,
                cpu_usage_hours=0.0,
                memory_usage_gb_hours=0.0,
                storage_usage_gb=0.0,
                api_requests=0,
                data_transfer_gb=0.0,
                last_updated=datetime.utcnow()
            )
            
            # Update tenant status
            tenant_config.status = TenantStatus.ACTIVE
            tenant_config.provisioned_at = datetime.utcnow()
            
            self.logger.info(f"Successfully provisioned tenant: {tenant_id}")
            
            return environment
            
        except Exception as e:
            self.logger.error(f"Failed to provision tenant {tenant_config.tenant_id}: {e}")
            # Cleanup on failure
            await self._cleanup_failed_provisioning(tenant_config.tenant_id)
            raise
            
    async def deprovision_tenant(self, tenant_id: str) -> Dict[str, Any]:
        """
        Deprovision a tenant and clean up all resources.
        
        Args:
            tenant_id: ID of the tenant to deprovision
            
        Returns:
            Deprovisioning result
        """
        try:
            if tenant_id not in self.tenants:
                raise ValueError(f"Tenant {tenant_id} not found")
                
            self.logger.info(f"Deprovisioning tenant: {tenant_id}")
            
            tenant_config = self.tenants[tenant_id]
            tenant_config.status = TenantStatus.DEPROVISIONING
            
            # Remove resource quotas
            await self.quota_manager.remove_tenant_quotas(tenant_id)
            
            # Clean up database
            await self.database_manager.delete_tenant_database(tenant_id)
            
            # Deprovision environment
            deprovision_result = await self.provisioner.deprovision_environment(tenant_id)
            
            # Clean up tracking data
            if tenant_id in self.tenants:
                del self.tenants[tenant_id]
            if tenant_id in self.tenant_environments:
                del self.tenant_environments[tenant_id]
            if tenant_id in self.tenant_metrics:
                del self.tenant_metrics[tenant_id]
                
            self.logger.info(f"Successfully deprovisioned tenant: {tenant_id}")
            
            return {
                'success': True,
                'tenant_id': tenant_id,
                'deprovisioned_at': datetime.utcnow().isoformat(),
                'cleanup_results': deprovision_result
            }
            
        except Exception as e:
            self.logger.error(f"Failed to deprovision tenant {tenant_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'tenant_id': tenant_id
            }
            
    async def get_tenant_status(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get comprehensive status information for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            
        Returns:
            Tenant status information
        """
        try:
            if tenant_id not in self.tenants:
                raise ValueError(f"Tenant {tenant_id} not found")
                
            tenant_config = self.tenants[tenant_id]
            environment = self.tenant_environments.get(tenant_id)
            metrics = self.tenant_metrics.get(tenant_id)
            
            # Get resource usage
            resource_usage = await self.quota_manager.get_tenant_usage(tenant_id)
            
            # Get environment health
            environment_health = await self.provisioner.check_environment_health(tenant_id)
            
            return {
                'tenant_id': tenant_id,
                'status': tenant_config.status.value,
                'tier': tenant_config.tier.value,
                'created_at': tenant_config.created_at.isoformat(),
                'provisioned_at': tenant_config.provisioned_at.isoformat() if tenant_config.provisioned_at else None,
                'environment': {
                    'namespace': environment.namespace if environment else None,
                    'endpoints': environment.endpoints if environment else {},
                    'health': environment_health
                },
                'resource_usage': resource_usage,
                'metrics': {
                    'active_agents': metrics.active_agents if metrics else 0,
                    'total_tasks_executed': metrics.total_tasks_executed if metrics else 0,
                    'cpu_usage_hours': metrics.cpu_usage_hours if metrics else 0.0,
                    'memory_usage_gb_hours': metrics.memory_usage_gb_hours if metrics else 0.0,
                    'storage_usage_gb': metrics.storage_usage_gb if metrics else 0.0,
                    'api_requests': metrics.api_requests if metrics else 0,
                    'data_transfer_gb': metrics.data_transfer_gb if metrics else 0.0,
                    'last_updated': metrics.last_updated.isoformat() if metrics else None
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get tenant status for {tenant_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'tenant_id': tenant_id
            }
            
    async def update_tenant_tier(self, tenant_id: str, new_tier: TenantTier) -> Dict[str, Any]:
        """
        Update a tenant's subscription tier and adjust resources accordingly.
        
        Args:
            tenant_id: ID of the tenant
            new_tier: New subscription tier
            
        Returns:
            Update result
        """
        try:
            if tenant_id not in self.tenants:
                raise ValueError(f"Tenant {tenant_id} not found")
                
            tenant_config = self.tenants[tenant_id]
            old_tier = tenant_config.tier
            
            self.logger.info(f"Updating tenant {tenant_id} from {old_tier} to {new_tier}")
            
            # Get new resource limits for the tier
            new_limits = self._get_tier_resource_limits(new_tier)
            
            # Update resource quotas
            await self.quota_manager.update_tenant_quotas(tenant_id, new_limits)
            
            # Update tenant configuration
            tenant_config.tier = new_tier
            tenant_config.resource_limits = new_limits
            tenant_config.updated_at = datetime.utcnow()
            
            # Update environment if needed
            if self._requires_environment_update(old_tier, new_tier):
                await self.provisioner.update_environment(tenant_id, tenant_config)
                
            self.logger.info(f"Successfully updated tenant {tenant_id} to {new_tier}")
            
            return {
                'success': True,
                'tenant_id': tenant_id,
                'old_tier': old_tier.value,
                'new_tier': new_tier.value,
                'updated_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to update tenant tier for {tenant_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'tenant_id': tenant_id
            }
            
    async def enforce_resource_limits(self, tenant_id: str, limits: ResourceLimits) -> None:
        """
        Enforce resource limits for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            limits: Resource limits to enforce
        """
        try:
            if tenant_id not in self.tenants:
                raise ValueError(f"Tenant {tenant_id} not found")
                
            # Update quota manager
            await self.quota_manager.enforce_limits(tenant_id, limits)
            
            # Update tenant configuration
            self.tenants[tenant_id].resource_limits = limits
            
            self.logger.info(f"Enforced resource limits for tenant {tenant_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to enforce resource limits for {tenant_id}: {e}")
            raise
            
    async def get_tenant_billing_data(self, tenant_id: str, period_days: int = 30) -> Dict[str, Any]:
        """
        Get billing data for a tenant over a specified period.
        
        Args:
            tenant_id: ID of the tenant
            period_days: Number of days to include in billing data
            
        Returns:
            Billing data and usage metrics
        """
        try:
            if tenant_id not in self.tenants:
                raise ValueError(f"Tenant {tenant_id} not found")
                
            tenant_config = self.tenants[tenant_id]
            metrics = self.tenant_metrics.get(tenant_id)
            
            # Calculate billing period
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=period_days)
            
            # Get detailed usage data
            usage_data = await self.quota_manager.get_usage_history(tenant_id, start_date, end_date)
            
            # Calculate costs based on tier
            cost_calculation = self._calculate_tenant_costs(tenant_config.tier, usage_data)
            
            return {
                'tenant_id': tenant_id,
                'billing_period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': period_days
                },
                'tier': tenant_config.tier.value,
                'usage_summary': {
                    'active_agents': metrics.active_agents if metrics else 0,
                    'total_tasks_executed': metrics.total_tasks_executed if metrics else 0,
                    'cpu_usage_hours': metrics.cpu_usage_hours if metrics else 0.0,
                    'memory_usage_gb_hours': metrics.memory_usage_gb_hours if metrics else 0.0,
                    'storage_usage_gb': metrics.storage_usage_gb if metrics else 0.0,
                    'api_requests': metrics.api_requests if metrics else 0,
                    'data_transfer_gb': metrics.data_transfer_gb if metrics else 0.0
                },
                'cost_breakdown': cost_calculation,
                'detailed_usage': usage_data
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get billing data for {tenant_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'tenant_id': tenant_id
            }
            
    async def list_tenants(
        self,
        status_filter: Optional[TenantStatus] = None,
        tier_filter: Optional[TenantTier] = None
    ) -> List[Dict[str, Any]]:
        """
        List all tenants with optional filtering.
        
        Args:
            status_filter: Optional status filter
            tier_filter: Optional tier filter
            
        Returns:
            List of tenant summaries
        """
        try:
            tenant_summaries = []
            
            for tenant_id, tenant_config in self.tenants.items():
                # Apply filters
                if status_filter and tenant_config.status != status_filter:
                    continue
                if tier_filter and tenant_config.tier != tier_filter:
                    continue
                    
                metrics = self.tenant_metrics.get(tenant_id)
                
                summary = {
                    'tenant_id': tenant_id,
                    'name': tenant_config.name,
                    'status': tenant_config.status.value,
                    'tier': tenant_config.tier.value,
                    'created_at': tenant_config.created_at.isoformat(),
                    'active_agents': metrics.active_agents if metrics else 0,
                    'total_tasks_executed': metrics.total_tasks_executed if metrics else 0,
                    'last_activity': metrics.last_updated.isoformat() if metrics else None
                }
                
                tenant_summaries.append(summary)
                
            return tenant_summaries
            
        except Exception as e:
            self.logger.error(f"Failed to list tenants: {e}")
            return []
            
    async def _validate_tenant_config(self, config: TenantConfig) -> None:
        """Validate tenant configuration."""
        if not config.tenant_id:
            raise ValueError("Tenant ID is required")
        if not config.name:
            raise ValueError("Tenant name is required")
        if config.tenant_id in self.tenants:
            raise ValueError(f"Tenant {config.tenant_id} already exists")
            
    async def _cleanup_failed_provisioning(self, tenant_id: str) -> None:
        """Clean up resources after failed provisioning."""
        try:
            # Remove from tracking
            if tenant_id in self.tenants:
                del self.tenants[tenant_id]
            if tenant_id in self.tenant_environments:
                del self.tenant_environments[tenant_id]
            if tenant_id in self.tenant_metrics:
                del self.tenant_metrics[tenant_id]
                
            # Clean up provisioned resources
            await self.provisioner.cleanup_failed_provisioning(tenant_id)
            await self.database_manager.cleanup_failed_database(tenant_id)
            await self.quota_manager.cleanup_failed_quotas(tenant_id)
            
        except Exception as e:
            self.logger.error(f"Error during cleanup of failed provisioning for {tenant_id}: {e}")
            
    def _get_tier_resource_limits(self, tier: TenantTier) -> ResourceLimits:
        """Get resource limits for a subscription tier."""
        tier_limits = {
            TenantTier.STARTER: ResourceLimits(
                max_agents=10,
                max_cpu_cores=4,
                max_memory_gb=8,
                max_storage_gb=50,
                max_api_requests_per_hour=1000,
                max_data_transfer_gb_per_month=10
            ),
            TenantTier.PROFESSIONAL: ResourceLimits(
                max_agents=100,
                max_cpu_cores=20,
                max_memory_gb=40,
                max_storage_gb=500,
                max_api_requests_per_hour=10000,
                max_data_transfer_gb_per_month=100
            ),
            TenantTier.ENTERPRISE: ResourceLimits(
                max_agents=1000,
                max_cpu_cores=100,
                max_memory_gb=200,
                max_storage_gb=5000,
                max_api_requests_per_hour=100000,
                max_data_transfer_gb_per_month=1000
            )
        }
        
        return tier_limits.get(tier, tier_limits[TenantTier.STARTER])
        
    def _requires_environment_update(self, old_tier: TenantTier, new_tier: TenantTier) -> bool:
        """Check if environment update is required for tier change."""
        # Upgrade from Starter to Professional/Enterprise requires environment update
        if old_tier == TenantTier.STARTER and new_tier in [TenantTier.PROFESSIONAL, TenantTier.ENTERPRISE]:
            return True
        # Upgrade to Enterprise always requires update
        if new_tier == TenantTier.ENTERPRISE:
            return True
        return False
        
    def _calculate_tenant_costs(self, tier: TenantTier, usage_data: Dict[str, Any]) -> Dict[str, float]:
        """Calculate costs for a tenant based on usage."""
        # Simplified cost calculation
        # In production, this would use complex pricing models
        
        base_costs = {
            TenantTier.STARTER: 50.0,
            TenantTier.PROFESSIONAL: 150.0,
            TenantTier.ENTERPRISE: 300.0
        }
        
        base_cost = base_costs.get(tier, 50.0)
        
        # Usage-based costs (simplified)
        cpu_cost = usage_data.get('cpu_usage_hours', 0) * 0.10
        memory_cost = usage_data.get('memory_usage_gb_hours', 0) * 0.05
        storage_cost = usage_data.get('storage_usage_gb', 0) * 0.02
        transfer_cost = usage_data.get('data_transfer_gb', 0) * 0.01
        
        total_cost = base_cost + cpu_cost + memory_cost + storage_cost + transfer_cost
        
        return {
            'base_cost': base_cost,
            'cpu_cost': cpu_cost,
            'memory_cost': memory_cost,
            'storage_cost': storage_cost,
            'transfer_cost': transfer_cost,
            'total_cost': total_cost
        }
        
    async def _monitor_tenant_usage(self) -> None:
        """Background task to monitor tenant usage."""
        while True:
            try:
                for tenant_id in self.tenants.keys():
                    # Update usage metrics
                    await self._update_tenant_metrics(tenant_id)
                    
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"Error in tenant usage monitoring: {e}")
                await asyncio.sleep(60)
                
    async def _enforce_resource_quotas(self) -> None:
        """Background task to enforce resource quotas."""
        while True:
            try:
                for tenant_id, tenant_config in self.tenants.items():
                    # Check and enforce quotas
                    await self.quota_manager.check_and_enforce_quotas(tenant_id)
                    
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Error in quota enforcement: {e}")
                await asyncio.sleep(120)
                
    async def _track_billing_metrics(self) -> None:
        """Background task to track billing metrics."""
        while True:
            try:
                for tenant_id in self.tenants.keys():
                    # Update billing metrics
                    await self._update_billing_metrics(tenant_id)
                    
                await asyncio.sleep(3600)  # Update every hour
                
            except Exception as e:
                self.logger.error(f"Error in billing metrics tracking: {e}")
                await asyncio.sleep(1800)
                
    async def _update_tenant_metrics(self, tenant_id: str) -> None:
        """Update usage metrics for a tenant."""
        try:
            if tenant_id not in self.tenant_metrics:
                return
                
            # Get current usage from quota manager
            current_usage = await self.quota_manager.get_current_usage(tenant_id)
            
            # Update metrics
            metrics = self.tenant_metrics[tenant_id]
            metrics.active_agents = current_usage.get('active_agents', 0)
            metrics.cpu_usage_hours += current_usage.get('cpu_usage_delta', 0)
            metrics.memory_usage_gb_hours += current_usage.get('memory_usage_delta', 0)
            metrics.storage_usage_gb = current_usage.get('storage_usage_gb', 0)
            metrics.api_requests += current_usage.get('api_requests_delta', 0)
            metrics.data_transfer_gb += current_usage.get('data_transfer_delta', 0)
            metrics.last_updated = datetime.utcnow()
            
        except Exception as e:
            self.logger.error(f"Error updating metrics for tenant {tenant_id}: {e}")
            
    async def _update_billing_metrics(self, tenant_id: str) -> None:
        """Update billing metrics for a tenant."""
        try:
            # This would integrate with billing systems
            # For now, just log the update
            self.logger.debug(f"Updated billing metrics for tenant {tenant_id}")
            
        except Exception as e:
            self.logger.error(f"Error updating billing metrics for tenant {tenant_id}: {e}")