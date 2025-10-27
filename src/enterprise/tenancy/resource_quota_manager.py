"""
Resource Quota Manager for ACSO Enterprise.
Manages and enforces resource quotas and limits for tenants.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json

import prometheus_client
from kubernetes import client
from kubernetes.client.rest import ApiException

from ..models.tenancy import ResourceLimits


@dataclass
class ResourceUsage:
    """Current resource usage for a tenant."""
    tenant_id: str
    cpu_cores_used: float
    memory_gb_used: float
    storage_gb_used: float
    active_agents: int
    api_requests_per_hour: int
    data_transfer_gb_per_hour: float
    timestamp: datetime


@dataclass
class QuotaViolation:
    """Resource quota violation."""
    tenant_id: str
    resource_type: str
    current_usage: float
    quota_limit: float
    violation_percentage: float
    timestamp: datetime
    action_taken: str


class ResourceQuotaManager:
    """
    Kubernetes-native resource quota management.
    
    Provides:
    - Real-time resource usage monitoring
    - Quota enforcement and violation detection
    - Usage history tracking
    - Automated scaling and throttling
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.k8s_core_v1 = None
        self.k8s_metrics = None
        
        # Quota tracking
        self.tenant_quotas: Dict[str, ResourceLimits] = {}
        self.current_usage: Dict[str, ResourceUsage] = {}
        self.usage_history: Dict[str, List[ResourceUsage]] = {}
        self.quota_violations: Dict[str, List[QuotaViolation]] = {}
        
        # Monitoring
        self.monitoring_active = False
        self.monitoring_tasks: List[asyncio.Task] = []
        
        # Prometheus metrics
        self.resource_usage_gauge = prometheus_client.Gauge(
            'acso_tenant_resource_usage',
            'Current resource usage by tenant',
            ['tenant_id', 'resource_type']
        )
        
        self.quota_utilization_gauge = prometheus_client.Gauge(
            'acso_tenant_quota_utilization',
            'Quota utilization percentage by tenant',
            ['tenant_id', 'resource_type']
        )
        
        self.quota_violations_counter = prometheus_client.Counter(
            'acso_tenant_quota_violations_total',
            'Total number of quota violations',
            ['tenant_id', 'resource_type', 'action']
        )
        
    async def initialize(self) -> None:
        """Initialize the resource quota manager."""
        try:
            self.logger.info("Initializing Resource Quota Manager")
            
            # Initialize Kubernetes client
            self.k8s_core_v1 = client.CoreV1Api()
            
            # Start monitoring
            self.monitoring_active = True
            self.monitoring_tasks = [
                asyncio.create_task(self._monitor_resource_usage()),
                asyncio.create_task(self._enforce_quotas_loop()),
                asyncio.create_task(self._cleanup_old_data())
            ]
            
            self.logger.info("Resource Quota Manager initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Resource Quota Manager: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the resource quota manager."""
        try:
            self.logger.info("Shutting down Resource Quota Manager")
            
            self.monitoring_active = False
            
            # Cancel monitoring tasks
            for task in self.monitoring_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                        
            self.logger.info("Resource Quota Manager shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    async def set_tenant_quotas(self, tenant_id: str, resource_limits: ResourceLimits) -> None:
        """
        Set resource quotas for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            resource_limits: Resource limits to set
        """
        try:
            self.logger.info(f"Setting quotas for tenant: {tenant_id}")
            
            # Store quota configuration
            self.tenant_quotas[tenant_id] = resource_limits
            
            # Initialize usage tracking
            if tenant_id not in self.current_usage:
                self.current_usage[tenant_id] = ResourceUsage(
                    tenant_id=tenant_id,
                    cpu_cores_used=0.0,
                    memory_gb_used=0.0,
                    storage_gb_used=0.0,
                    active_agents=0,
                    api_requests_per_hour=0,
                    data_transfer_gb_per_hour=0.0,
                    timestamp=datetime.utcnow()
                )
            
            if tenant_id not in self.usage_history:
                self.usage_history[tenant_id] = []
                
            if tenant_id not in self.quota_violations:
                self.quota_violations[tenant_id] = []
            
            self.logger.info(f"Successfully set quotas for tenant: {tenant_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to set quotas for tenant {tenant_id}: {e}")
            raise
            
    async def update_tenant_quotas(self, tenant_id: str, resource_limits: ResourceLimits) -> None:
        """
        Update resource quotas for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            resource_limits: Updated resource limits
        """
        try:
            self.logger.info(f"Updating quotas for tenant: {tenant_id}")
            
            # Update quota configuration
            self.tenant_quotas[tenant_id] = resource_limits
            
            # Update Kubernetes resource quota
            namespace = f"tenant-{tenant_id}"
            quota_name = f"tenant-{tenant_id}-quota"
            
            try:
                # Get existing quota
                existing_quota = self.k8s_core_v1.read_namespaced_resource_quota(quota_name, namespace)
                
                # Update the quota
                existing_quota.spec.hard = {
                    'requests.cpu': f"{resource_limits.max_cpu_cores}",
                    'requests.memory': f"{resource_limits.max_memory_gb}Gi",
                    'persistentvolumeclaims': str(resource_limits.max_storage_gb // 10),
                    'pods': str(resource_limits.max_agents * 2),
                    'services': '20',
                    'secrets': '50',
                    'configmaps': '50'
                }
                
                self.k8s_core_v1.patch_namespaced_resource_quota(quota_name, namespace, existing_quota)
                
            except ApiException as e:
                if e.status != 404:  # Ignore if quota doesn't exist
                    raise
            
            self.logger.info(f"Successfully updated quotas for tenant: {tenant_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to update quotas for tenant {tenant_id}: {e}")
            raise
            
    async def remove_tenant_quotas(self, tenant_id: str) -> None:
        """
        Remove resource quotas for a tenant.
        
        Args:
            tenant_id: ID of the tenant
        """
        try:
            self.logger.info(f"Removing quotas for tenant: {tenant_id}")
            
            # Remove from tracking
            if tenant_id in self.tenant_quotas:
                del self.tenant_quotas[tenant_id]
            if tenant_id in self.current_usage:
                del self.current_usage[tenant_id]
            if tenant_id in self.usage_history:
                del self.usage_history[tenant_id]
            if tenant_id in self.quota_violations:
                del self.quota_violations[tenant_id]
            
            self.logger.info(f"Successfully removed quotas for tenant: {tenant_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to remove quotas for tenant {tenant_id}: {e}")
            
    async def get_tenant_usage(self, tenant_id: str) -> Dict[str, Any]:
        """
        Get current resource usage for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            
        Returns:
            Current usage information
        """
        try:
            if tenant_id not in self.current_usage:
                return {'error': f'No usage data for tenant {tenant_id}'}
            
            usage = self.current_usage[tenant_id]
            quota = self.tenant_quotas.get(tenant_id)
            
            usage_data = {
                'tenant_id': tenant_id,
                'timestamp': usage.timestamp.isoformat(),
                'current_usage': {
                    'cpu_cores': usage.cpu_cores_used,
                    'memory_gb': usage.memory_gb_used,
                    'storage_gb': usage.storage_gb_used,
                    'active_agents': usage.active_agents,
                    'api_requests_per_hour': usage.api_requests_per_hour,
                    'data_transfer_gb_per_hour': usage.data_transfer_gb_per_hour
                }
            }
            
            if quota:
                usage_data['quota_limits'] = {
                    'max_cpu_cores': quota.max_cpu_cores,
                    'max_memory_gb': quota.max_memory_gb,
                    'max_storage_gb': quota.max_storage_gb,
                    'max_agents': quota.max_agents,
                    'max_api_requests_per_hour': quota.max_api_requests_per_hour,
                    'max_data_transfer_gb_per_month': quota.max_data_transfer_gb_per_month
                }
                
                usage_data['utilization'] = {
                    'cpu_percentage': (usage.cpu_cores_used / quota.max_cpu_cores) * 100 if quota.max_cpu_cores > 0 else 0,
                    'memory_percentage': (usage.memory_gb_used / quota.max_memory_gb) * 100 if quota.max_memory_gb > 0 else 0,
                    'storage_percentage': (usage.storage_gb_used / quota.max_storage_gb) * 100 if quota.max_storage_gb > 0 else 0,
                    'agents_percentage': (usage.active_agents / quota.max_agents) * 100 if quota.max_agents > 0 else 0
                }
            
            return usage_data
            
        except Exception as e:
            self.logger.error(f"Failed to get usage for tenant {tenant_id}: {e}")
            return {'error': str(e)}
            
    async def get_usage_history(self, tenant_id: str, start_date: datetime, end_date: datetime) -> Dict[str, Any]:
        """
        Get usage history for a tenant over a time period.
        
        Args:
            tenant_id: ID of the tenant
            start_date: Start of the period
            end_date: End of the period
            
        Returns:
            Historical usage data
        """
        try:
            if tenant_id not in self.usage_history:
                return {'error': f'No usage history for tenant {tenant_id}'}
            
            # Filter history by date range
            history = self.usage_history[tenant_id]
            filtered_history = [
                usage for usage in history
                if start_date <= usage.timestamp <= end_date
            ]
            
            if not filtered_history:
                return {
                    'tenant_id': tenant_id,
                    'period': {
                        'start_date': start_date.isoformat(),
                        'end_date': end_date.isoformat()
                    },
                    'usage_data': [],
                    'summary': {
                        'avg_cpu_usage': 0.0,
                        'avg_memory_usage': 0.0,
                        'avg_storage_usage': 0.0,
                        'total_api_requests': 0,
                        'total_data_transfer': 0.0
                    }
                }
            
            # Calculate summary statistics
            total_records = len(filtered_history)
            avg_cpu = sum(usage.cpu_cores_used for usage in filtered_history) / total_records
            avg_memory = sum(usage.memory_gb_used for usage in filtered_history) / total_records
            avg_storage = sum(usage.storage_gb_used for usage in filtered_history) / total_records
            total_api_requests = sum(usage.api_requests_per_hour for usage in filtered_history)
            total_data_transfer = sum(usage.data_transfer_gb_per_hour for usage in filtered_history)
            
            return {
                'tenant_id': tenant_id,
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat()
                },
                'usage_data': [
                    {
                        'timestamp': usage.timestamp.isoformat(),
                        'cpu_cores_used': usage.cpu_cores_used,
                        'memory_gb_used': usage.memory_gb_used,
                        'storage_gb_used': usage.storage_gb_used,
                        'active_agents': usage.active_agents,
                        'api_requests_per_hour': usage.api_requests_per_hour,
                        'data_transfer_gb_per_hour': usage.data_transfer_gb_per_hour
                    }
                    for usage in filtered_history
                ],
                'summary': {
                    'avg_cpu_usage': avg_cpu,
                    'avg_memory_usage': avg_memory,
                    'avg_storage_usage': avg_storage,
                    'total_api_requests': total_api_requests,
                    'total_data_transfer': total_data_transfer
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get usage history for tenant {tenant_id}: {e}")
            return {'error': str(e)}
            
    async def check_and_enforce_quotas(self, tenant_id: str) -> List[QuotaViolation]:
        """
        Check and enforce quotas for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            
        Returns:
            List of quota violations found
        """
        try:
            if tenant_id not in self.tenant_quotas or tenant_id not in self.current_usage:
                return []
            
            quota = self.tenant_quotas[tenant_id]
            usage = self.current_usage[tenant_id]
            violations = []
            
            # Check CPU quota
            if usage.cpu_cores_used > quota.max_cpu_cores:
                violation = QuotaViolation(
                    tenant_id=tenant_id,
                    resource_type='cpu',
                    current_usage=usage.cpu_cores_used,
                    quota_limit=quota.max_cpu_cores,
                    violation_percentage=((usage.cpu_cores_used - quota.max_cpu_cores) / quota.max_cpu_cores) * 100,
                    timestamp=datetime.utcnow(),
                    action_taken='throttle_cpu'
                )
                violations.append(violation)
                await self._enforce_cpu_limit(tenant_id, quota.max_cpu_cores)
            
            # Check memory quota
            if usage.memory_gb_used > quota.max_memory_gb:
                violation = QuotaViolation(
                    tenant_id=tenant_id,
                    resource_type='memory',
                    current_usage=usage.memory_gb_used,
                    quota_limit=quota.max_memory_gb,
                    violation_percentage=((usage.memory_gb_used - quota.max_memory_gb) / quota.max_memory_gb) * 100,
                    timestamp=datetime.utcnow(),
                    action_taken='scale_down_agents'
                )
                violations.append(violation)
                await self._enforce_memory_limit(tenant_id, quota.max_memory_gb)
            
            # Check storage quota
            if usage.storage_gb_used > quota.max_storage_gb:
                violation = QuotaViolation(
                    tenant_id=tenant_id,
                    resource_type='storage',
                    current_usage=usage.storage_gb_used,
                    quota_limit=quota.max_storage_gb,
                    violation_percentage=((usage.storage_gb_used - quota.max_storage_gb) / quota.max_storage_gb) * 100,
                    timestamp=datetime.utcnow(),
                    action_taken='cleanup_old_data'
                )
                violations.append(violation)
                await self._enforce_storage_limit(tenant_id, quota.max_storage_gb)
            
            # Check agent count
            if usage.active_agents > quota.max_agents:
                violation = QuotaViolation(
                    tenant_id=tenant_id,
                    resource_type='agents',
                    current_usage=usage.active_agents,
                    quota_limit=quota.max_agents,
                    violation_percentage=((usage.active_agents - quota.max_agents) / quota.max_agents) * 100,
                    timestamp=datetime.utcnow(),
                    action_taken='terminate_excess_agents'
                )
                violations.append(violation)
                await self._enforce_agent_limit(tenant_id, quota.max_agents)
            
            # Check API request rate
            if usage.api_requests_per_hour > quota.max_api_requests_per_hour:
                violation = QuotaViolation(
                    tenant_id=tenant_id,
                    resource_type='api_requests',
                    current_usage=usage.api_requests_per_hour,
                    quota_limit=quota.max_api_requests_per_hour,
                    violation_percentage=((usage.api_requests_per_hour - quota.max_api_requests_per_hour) / quota.max_api_requests_per_hour) * 100,
                    timestamp=datetime.utcnow(),
                    action_taken='rate_limit_api'
                )
                violations.append(violation)
                await self._enforce_api_rate_limit(tenant_id, quota.max_api_requests_per_hour)
            
            # Store violations
            if violations:
                self.quota_violations[tenant_id].extend(violations)
                
                # Update Prometheus metrics
                for violation in violations:
                    self.quota_violations_counter.labels(
                        tenant_id=tenant_id,
                        resource_type=violation.resource_type,
                        action=violation.action_taken
                    ).inc()
            
            return violations
            
        except Exception as e:
            self.logger.error(f"Failed to check quotas for tenant {tenant_id}: {e}")
            return []
            
    async def get_current_usage(self, tenant_id: str) -> Dict[str, Any]:
        """Get current usage metrics for a tenant."""
        try:
            if tenant_id not in self.current_usage:
                return {}
            
            usage = self.current_usage[tenant_id]
            
            # Calculate deltas since last update (for billing)
            return {
                'active_agents': usage.active_agents,
                'cpu_usage_delta': 0.1,  # Simplified - would calculate actual delta
                'memory_usage_delta': 0.05,
                'storage_usage_gb': usage.storage_gb_used,
                'api_requests_delta': 10,
                'data_transfer_delta': 0.01
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get current usage for tenant {tenant_id}: {e}")
            return {}
            
    async def cleanup_failed_quotas(self, tenant_id: str) -> None:
        """Clean up quotas after failed tenant provisioning."""
        try:
            await self.remove_tenant_quotas(tenant_id)
        except Exception as e:
            self.logger.error(f"Error cleaning up quotas for {tenant_id}: {e}")
            
    async def _monitor_resource_usage(self) -> None:
        """Background task to monitor resource usage."""
        while self.monitoring_active:
            try:
                for tenant_id in self.tenant_quotas.keys():
                    await self._update_tenant_usage(tenant_id)
                    
                await asyncio.sleep(60)  # Update every minute
                
            except Exception as e:
                self.logger.error(f"Error in resource usage monitoring: {e}")
                await asyncio.sleep(120)
                
    async def _enforce_quotas_loop(self) -> None:
        """Background task to enforce quotas."""
        while self.monitoring_active:
            try:
                for tenant_id in self.tenant_quotas.keys():
                    violations = await self.check_and_enforce_quotas(tenant_id)
                    if violations:
                        self.logger.warning(f"Quota violations for tenant {tenant_id}: {len(violations)} violations")
                        
                await asyncio.sleep(30)  # Check every 30 seconds
                
            except Exception as e:
                self.logger.error(f"Error in quota enforcement: {e}")
                await asyncio.sleep(60)
                
    async def _cleanup_old_data(self) -> None:
        """Background task to clean up old usage data."""
        while self.monitoring_active:
            try:
                cutoff_date = datetime.utcnow() - timedelta(days=90)  # Keep 90 days of history
                
                for tenant_id in self.usage_history.keys():
                    # Remove old usage history
                    self.usage_history[tenant_id] = [
                        usage for usage in self.usage_history[tenant_id]
                        if usage.timestamp > cutoff_date
                    ]
                    
                    # Remove old violations
                    self.quota_violations[tenant_id] = [
                        violation for violation in self.quota_violations[tenant_id]
                        if violation.timestamp > cutoff_date
                    ]
                    
                await asyncio.sleep(3600)  # Clean up every hour
                
            except Exception as e:
                self.logger.error(f"Error in data cleanup: {e}")
                await asyncio.sleep(1800)
                
    async def _update_tenant_usage(self, tenant_id: str) -> None:
        """Update usage metrics for a tenant."""
        try:
            namespace = f"tenant-{tenant_id}"
            
            # Get resource usage from Kubernetes
            cpu_usage, memory_usage = await self._get_namespace_resource_usage(namespace)
            storage_usage = await self._get_namespace_storage_usage(namespace)
            active_agents = await self._get_active_agent_count(namespace)
            
            # Update current usage
            usage = ResourceUsage(
                tenant_id=tenant_id,
                cpu_cores_used=cpu_usage,
                memory_gb_used=memory_usage,
                storage_gb_used=storage_usage,
                active_agents=active_agents,
                api_requests_per_hour=0,  # Would be tracked separately
                data_transfer_gb_per_hour=0.0,  # Would be tracked separately
                timestamp=datetime.utcnow()
            )
            
            self.current_usage[tenant_id] = usage
            
            # Add to history
            self.usage_history[tenant_id].append(usage)
            
            # Update Prometheus metrics
            quota = self.tenant_quotas.get(tenant_id)
            if quota:
                self.resource_usage_gauge.labels(tenant_id=tenant_id, resource_type='cpu').set(cpu_usage)
                self.resource_usage_gauge.labels(tenant_id=tenant_id, resource_type='memory').set(memory_usage)
                self.resource_usage_gauge.labels(tenant_id=tenant_id, resource_type='storage').set(storage_usage)
                self.resource_usage_gauge.labels(tenant_id=tenant_id, resource_type='agents').set(active_agents)
                
                self.quota_utilization_gauge.labels(tenant_id=tenant_id, resource_type='cpu').set(
                    (cpu_usage / quota.max_cpu_cores) * 100 if quota.max_cpu_cores > 0 else 0
                )
                self.quota_utilization_gauge.labels(tenant_id=tenant_id, resource_type='memory').set(
                    (memory_usage / quota.max_memory_gb) * 100 if quota.max_memory_gb > 0 else 0
                )
                self.quota_utilization_gauge.labels(tenant_id=tenant_id, resource_type='storage').set(
                    (storage_usage / quota.max_storage_gb) * 100 if quota.max_storage_gb > 0 else 0
                )
                self.quota_utilization_gauge.labels(tenant_id=tenant_id, resource_type='agents').set(
                    (active_agents / quota.max_agents) * 100 if quota.max_agents > 0 else 0
                )
            
        except Exception as e:
            self.logger.error(f"Failed to update usage for tenant {tenant_id}: {e}")
            
    async def _get_namespace_resource_usage(self, namespace: str) -> tuple[float, float]:
        """Get CPU and memory usage for a namespace."""
        try:
            # This would integrate with Kubernetes metrics server
            # For now, return simulated values
            return 1.5, 2.0  # CPU cores, Memory GB
        except Exception as e:
            self.logger.error(f"Failed to get resource usage for namespace {namespace}: {e}")
            return 0.0, 0.0
            
    async def _get_namespace_storage_usage(self, namespace: str) -> float:
        """Get storage usage for a namespace."""
        try:
            # This would check PVC usage
            # For now, return simulated value
            return 10.0  # GB
        except Exception as e:
            self.logger.error(f"Failed to get storage usage for namespace {namespace}: {e}")
            return 0.0
            
    async def _get_active_agent_count(self, namespace: str) -> int:
        """Get count of active agents in a namespace."""
        try:
            # Count pods with agent labels
            pods = self.k8s_core_v1.list_namespaced_pod(
                namespace,
                label_selector="acso.component=agent"
            )
            
            running_pods = sum(1 for pod in pods.items if pod.status.phase == 'Running')
            return running_pods
            
        except Exception as e:
            self.logger.error(f"Failed to get agent count for namespace {namespace}: {e}")
            return 0
            
    async def _enforce_cpu_limit(self, tenant_id: str, max_cpu: float) -> None:
        """Enforce CPU limit for a tenant."""
        try:
            self.logger.warning(f"Enforcing CPU limit for tenant {tenant_id}: {max_cpu} cores")
            # Implementation would throttle CPU usage
        except Exception as e:
            self.logger.error(f"Failed to enforce CPU limit for tenant {tenant_id}: {e}")
            
    async def _enforce_memory_limit(self, tenant_id: str, max_memory: float) -> None:
        """Enforce memory limit for a tenant."""
        try:
            self.logger.warning(f"Enforcing memory limit for tenant {tenant_id}: {max_memory} GB")
            # Implementation would scale down agents or restart pods
        except Exception as e:
            self.logger.error(f"Failed to enforce memory limit for tenant {tenant_id}: {e}")
            
    async def _enforce_storage_limit(self, tenant_id: str, max_storage: float) -> None:
        """Enforce storage limit for a tenant."""
        try:
            self.logger.warning(f"Enforcing storage limit for tenant {tenant_id}: {max_storage} GB")
            # Implementation would clean up old data
        except Exception as e:
            self.logger.error(f"Failed to enforce storage limit for tenant {tenant_id}: {e}")
            
    async def _enforce_agent_limit(self, tenant_id: str, max_agents: int) -> None:
        """Enforce agent count limit for a tenant."""
        try:
            self.logger.warning(f"Enforcing agent limit for tenant {tenant_id}: {max_agents} agents")
            # Implementation would terminate excess agents
        except Exception as e:
            self.logger.error(f"Failed to enforce agent limit for tenant {tenant_id}: {e}")
            
    async def _enforce_api_rate_limit(self, tenant_id: str, max_requests: int) -> None:
        """Enforce API rate limit for a tenant."""
        try:
            self.logger.warning(f"Enforcing API rate limit for tenant {tenant_id}: {max_requests} req/hour")
            # Implementation would apply rate limiting
        except Exception as e:
            self.logger.error(f"Failed to enforce API rate limit for tenant {tenant_id}: {e}")