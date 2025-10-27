"""
Tenant Provisioner for ACSO Enterprise.
Handles provisioning and deprovisioning of isolated tenant environments.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import yaml

from kubernetes import client, config
from kubernetes.client.rest import ApiException

from ..models.tenancy import TenantConfig, TenantEnvironment, TenantStatus


@dataclass
class ProvisioningResult:
    """Result of a provisioning operation."""
    success: bool
    tenant_id: str
    namespace: str
    endpoints: Dict[str, str]
    error_message: Optional[str] = None
    provisioned_resources: List[str] = None


class TenantProvisioner:
    """
    Kubernetes-native tenant provisioner.
    
    Creates isolated namespaces and resources for each tenant with:
    - Network policies for isolation
    - Resource quotas and limits
    - Service accounts and RBAC
    - Ingress and load balancer configuration
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.k8s_core_v1 = None
        self.k8s_apps_v1 = None
        self.k8s_networking_v1 = None
        self.k8s_rbac_v1 = None
        
        # Provisioned environments tracking
        self.provisioned_environments: Dict[str, TenantEnvironment] = {}
        
    async def initialize(self) -> None:
        """Initialize the Kubernetes clients."""
        try:
            # Load Kubernetes configuration
            try:
                config.load_incluster_config()
                self.logger.info("Loaded in-cluster Kubernetes configuration")
            except config.ConfigException:
                config.load_kube_config()
                self.logger.info("Loaded local Kubernetes configuration")
            
            # Initialize API clients
            self.k8s_core_v1 = client.CoreV1Api()
            self.k8s_apps_v1 = client.AppsV1Api()
            self.k8s_networking_v1 = client.NetworkingV1Api()
            self.k8s_rbac_v1 = client.RbacAuthorizationV1Api()
            
            self.logger.info("Tenant Provisioner initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Tenant Provisioner: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the provisioner."""
        self.logger.info("Tenant Provisioner shutdown complete")
        
    async def provision_environment(self, tenant_config: TenantConfig) -> TenantEnvironment:
        """
        Provision a complete isolated environment for a tenant.
        
        Args:
            tenant_config: Configuration for the tenant
            
        Returns:
            Provisioned tenant environment
        """
        try:
            tenant_id = tenant_config.tenant_id
            self.logger.info(f"Provisioning environment for tenant: {tenant_id}")
            
            # Create namespace
            namespace = await self._create_tenant_namespace(tenant_id, tenant_config)
            
            # Create service account and RBAC
            service_account = await self._create_tenant_service_account(tenant_id, namespace)
            
            # Create resource quotas
            await self._create_resource_quotas(tenant_id, namespace, tenant_config.resource_limits)
            
            # Create network policies for isolation
            await self._create_network_policies(tenant_id, namespace)
            
            # Create tenant-specific services
            services = await self._create_tenant_services(tenant_id, namespace, tenant_config)
            
            # Create ingress configuration
            ingress_endpoints = await self._create_tenant_ingress(tenant_id, namespace, tenant_config)
            
            # Create monitoring and logging configuration
            await self._create_monitoring_config(tenant_id, namespace)
            
            # Create tenant environment object
            environment = TenantEnvironment(
                tenant_id=tenant_id,
                namespace=namespace,
                service_account=service_account,
                endpoints=ingress_endpoints,
                services=services,
                created_at=datetime.utcnow(),
                status="active"
            )
            
            # Store environment
            self.provisioned_environments[tenant_id] = environment
            
            self.logger.info(f"Successfully provisioned environment for tenant: {tenant_id}")
            return environment
            
        except Exception as e:
            self.logger.error(f"Failed to provision environment for tenant {tenant_id}: {e}")
            # Cleanup on failure
            await self.cleanup_failed_provisioning(tenant_id)
            raise
            
    async def deprovision_environment(self, tenant_id: str) -> Dict[str, Any]:
        """
        Deprovision a tenant environment and clean up all resources.
        
        Args:
            tenant_id: ID of the tenant to deprovision
            
        Returns:
            Deprovisioning result
        """
        try:
            self.logger.info(f"Deprovisioning environment for tenant: {tenant_id}")
            
            namespace = f"tenant-{tenant_id}"
            cleanup_results = []
            
            # Delete namespace (this will delete all resources within it)
            try:
                await self._delete_namespace(namespace)
                cleanup_results.append(f"Deleted namespace: {namespace}")
            except Exception as e:
                cleanup_results.append(f"Failed to delete namespace {namespace}: {e}")
            
            # Clean up any cluster-wide resources
            try:
                await self._cleanup_cluster_resources(tenant_id)
                cleanup_results.append("Cleaned up cluster-wide resources")
            except Exception as e:
                cleanup_results.append(f"Failed to cleanup cluster resources: {e}")
            
            # Remove from tracking
            if tenant_id in self.provisioned_environments:
                del self.provisioned_environments[tenant_id]
            
            self.logger.info(f"Successfully deprovisioned environment for tenant: {tenant_id}")
            
            return {
                'success': True,
                'tenant_id': tenant_id,
                'cleanup_results': cleanup_results,
                'deprovisioned_at': datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to deprovision environment for tenant {tenant_id}: {e}")
            return {
                'success': False,
                'error': str(e),
                'tenant_id': tenant_id
            }
            
    async def update_environment(self, tenant_id: str, tenant_config: TenantConfig) -> bool:
        """
        Update a tenant environment with new configuration.
        
        Args:
            tenant_id: ID of the tenant
            tenant_config: Updated tenant configuration
            
        Returns:
            True if successful
        """
        try:
            self.logger.info(f"Updating environment for tenant: {tenant_id}")
            
            namespace = f"tenant-{tenant_id}"
            
            # Update resource quotas
            await self._update_resource_quotas(tenant_id, namespace, tenant_config.resource_limits)
            
            # Update services if needed
            await self._update_tenant_services(tenant_id, namespace, tenant_config)
            
            # Update ingress configuration
            await self._update_tenant_ingress(tenant_id, namespace, tenant_config)
            
            # Update environment tracking
            if tenant_id in self.provisioned_environments:
                environment = self.provisioned_environments[tenant_id]
                environment.updated_at = datetime.utcnow()
            
            self.logger.info(f"Successfully updated environment for tenant: {tenant_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to update environment for tenant {tenant_id}: {e}")
            return False
            
    async def check_environment_health(self, tenant_id: str) -> Dict[str, Any]:
        """
        Check the health of a tenant environment.
        
        Args:
            tenant_id: ID of the tenant
            
        Returns:
            Health status information
        """
        try:
            namespace = f"tenant-{tenant_id}"
            health_status = {
                'overall_status': 'healthy',
                'namespace_status': 'unknown',
                'services_status': 'unknown',
                'pods_status': 'unknown',
                'resource_usage': {},
                'issues': []
            }
            
            # Check namespace exists
            try:
                await self._get_namespace(namespace)
                health_status['namespace_status'] = 'healthy'
            except ApiException as e:
                if e.status == 404:
                    health_status['namespace_status'] = 'missing'
                    health_status['overall_status'] = 'unhealthy'
                    health_status['issues'].append(f"Namespace {namespace} not found")
                else:
                    health_status['namespace_status'] = 'error'
                    health_status['overall_status'] = 'unhealthy'
                    health_status['issues'].append(f"Error checking namespace: {e}")
            
            # Check pods status
            try:
                pods = await self._list_namespace_pods(namespace)
                running_pods = sum(1 for pod in pods.items if pod.status.phase == 'Running')
                total_pods = len(pods.items)
                
                if total_pods == 0:
                    health_status['pods_status'] = 'no_pods'
                elif running_pods == total_pods:
                    health_status['pods_status'] = 'healthy'
                else:
                    health_status['pods_status'] = 'degraded'
                    health_status['overall_status'] = 'degraded'
                    health_status['issues'].append(f"Only {running_pods}/{total_pods} pods running")
                    
            except Exception as e:
                health_status['pods_status'] = 'error'
                health_status['issues'].append(f"Error checking pods: {e}")
            
            # Check services status
            try:
                services = await self._list_namespace_services(namespace)
                health_status['services_status'] = 'healthy' if services.items else 'no_services'
            except Exception as e:
                health_status['services_status'] = 'error'
                health_status['issues'].append(f"Error checking services: {e}")
            
            return health_status
            
        except Exception as e:
            self.logger.error(f"Failed to check environment health for tenant {tenant_id}: {e}")
            return {
                'overall_status': 'error',
                'error': str(e)
            }
            
    async def cleanup_failed_provisioning(self, tenant_id: str) -> None:
        """Clean up resources after failed provisioning."""
        try:
            self.logger.info(f"Cleaning up failed provisioning for tenant: {tenant_id}")
            
            namespace = f"tenant-{tenant_id}"
            
            # Try to delete namespace if it exists
            try:
                await self._delete_namespace(namespace)
            except ApiException as e:
                if e.status != 404:  # Ignore if namespace doesn't exist
                    self.logger.warning(f"Failed to delete namespace during cleanup: {e}")
            
            # Clean up any cluster-wide resources
            await self._cleanup_cluster_resources(tenant_id)
            
            # Remove from tracking
            if tenant_id in self.provisioned_environments:
                del self.provisioned_environments[tenant_id]
                
        except Exception as e:
            self.logger.error(f"Error during cleanup of failed provisioning for {tenant_id}: {e}")
            
    async def _create_tenant_namespace(self, tenant_id: str, tenant_config: TenantConfig) -> str:
        """Create a namespace for the tenant."""
        namespace_name = f"tenant-{tenant_id}"
        
        namespace = client.V1Namespace(
            metadata=client.V1ObjectMeta(
                name=namespace_name,
                labels={
                    'acso.tenant.id': tenant_id,
                    'acso.tenant.name': tenant_config.name,
                    'acso.tenant.tier': tenant_config.tier.value,
                    'acso.managed': 'true'
                },
                annotations={
                    'acso.tenant.created-at': datetime.utcnow().isoformat(),
                    'acso.tenant.created-by': 'acso-tenant-provisioner'
                }
            )
        )
        
        try:
            self.k8s_core_v1.create_namespace(namespace)
            self.logger.info(f"Created namespace: {namespace_name}")
            return namespace_name
        except ApiException as e:
            if e.status == 409:  # Already exists
                self.logger.warning(f"Namespace {namespace_name} already exists")
                return namespace_name
            raise
            
    async def _create_tenant_service_account(self, tenant_id: str, namespace: str) -> str:
        """Create a service account for the tenant."""
        service_account_name = f"tenant-{tenant_id}-sa"
        
        service_account = client.V1ServiceAccount(
            metadata=client.V1ObjectMeta(
                name=service_account_name,
                namespace=namespace,
                labels={
                    'acso.tenant.id': tenant_id,
                    'acso.managed': 'true'
                }
            )
        )
        
        try:
            self.k8s_core_v1.create_namespaced_service_account(namespace, service_account)
            self.logger.info(f"Created service account: {service_account_name}")
            
            # Create role and role binding for the service account
            await self._create_tenant_rbac(tenant_id, namespace, service_account_name)
            
            return service_account_name
        except ApiException as e:
            if e.status == 409:  # Already exists
                self.logger.warning(f"Service account {service_account_name} already exists")
                return service_account_name
            raise
            
    async def _create_tenant_rbac(self, tenant_id: str, namespace: str, service_account_name: str) -> None:
        """Create RBAC rules for the tenant."""
        role_name = f"tenant-{tenant_id}-role"
        role_binding_name = f"tenant-{tenant_id}-binding"
        
        # Create role with necessary permissions
        role = client.V1Role(
            metadata=client.V1ObjectMeta(
                name=role_name,
                namespace=namespace,
                labels={
                    'acso.tenant.id': tenant_id,
                    'acso.managed': 'true'
                }
            ),
            rules=[
                client.V1PolicyRule(
                    api_groups=[''],
                    resources=['pods', 'services', 'configmaps', 'secrets'],
                    verbs=['get', 'list', 'create', 'update', 'patch', 'delete']
                ),
                client.V1PolicyRule(
                    api_groups=['apps'],
                    resources=['deployments', 'replicasets'],
                    verbs=['get', 'list', 'create', 'update', 'patch', 'delete']
                )
            ]
        )
        
        # Create role binding
        role_binding = client.V1RoleBinding(
            metadata=client.V1ObjectMeta(
                name=role_binding_name,
                namespace=namespace,
                labels={
                    'acso.tenant.id': tenant_id,
                    'acso.managed': 'true'
                }
            ),
            subjects=[
                client.V1Subject(
                    kind='ServiceAccount',
                    name=service_account_name,
                    namespace=namespace
                )
            ],
            role_ref=client.V1RoleRef(
                api_group='rbac.authorization.k8s.io',
                kind='Role',
                name=role_name
            )
        )
        
        try:
            self.k8s_rbac_v1.create_namespaced_role(namespace, role)
            self.k8s_rbac_v1.create_namespaced_role_binding(namespace, role_binding)
            self.logger.info(f"Created RBAC for tenant: {tenant_id}")
        except ApiException as e:
            if e.status != 409:  # Ignore if already exists
                raise
                
    async def _create_resource_quotas(self, tenant_id: str, namespace: str, resource_limits) -> None:
        """Create resource quotas for the tenant."""
        quota_name = f"tenant-{tenant_id}-quota"
        
        resource_quota = client.V1ResourceQuota(
            metadata=client.V1ObjectMeta(
                name=quota_name,
                namespace=namespace,
                labels={
                    'acso.tenant.id': tenant_id,
                    'acso.managed': 'true'
                }
            ),
            spec=client.V1ResourceQuotaSpec(
                hard={
                    'requests.cpu': f"{resource_limits.max_cpu_cores}",
                    'requests.memory': f"{resource_limits.max_memory_gb}Gi",
                    'persistentvolumeclaims': str(resource_limits.max_storage_gb // 10),  # Assume 10GB per PVC
                    'pods': str(resource_limits.max_agents * 2),  # Allow 2 pods per agent
                    'services': '20',
                    'secrets': '50',
                    'configmaps': '50'
                }
            )
        )
        
        try:
            self.k8s_core_v1.create_namespaced_resource_quota(namespace, resource_quota)
            self.logger.info(f"Created resource quota: {quota_name}")
        except ApiException as e:
            if e.status != 409:  # Ignore if already exists
                raise
                
    async def _create_network_policies(self, tenant_id: str, namespace: str) -> None:
        """Create network policies for tenant isolation."""
        policy_name = f"tenant-{tenant_id}-isolation"
        
        # Create network policy that isolates the tenant namespace
        network_policy = client.V1NetworkPolicy(
            metadata=client.V1ObjectMeta(
                name=policy_name,
                namespace=namespace,
                labels={
                    'acso.tenant.id': tenant_id,
                    'acso.managed': 'true'
                }
            ),
            spec=client.V1NetworkPolicySpec(
                pod_selector=client.V1LabelSelector(),  # Apply to all pods in namespace
                policy_types=['Ingress', 'Egress'],
                ingress=[
                    # Allow ingress from same namespace
                    client.V1NetworkPolicyIngressRule(
                        _from=[
                            client.V1NetworkPolicyPeer(
                                namespace_selector=client.V1LabelSelector(
                                    match_labels={'name': namespace}
                                )
                            )
                        ]
                    ),
                    # Allow ingress from system namespaces
                    client.V1NetworkPolicyIngressRule(
                        _from=[
                            client.V1NetworkPolicyPeer(
                                namespace_selector=client.V1LabelSelector(
                                    match_labels={'name': 'kube-system'}
                                )
                            )
                        ]
                    )
                ],
                egress=[
                    # Allow egress to same namespace
                    client.V1NetworkPolicyEgressRule(
                        to=[
                            client.V1NetworkPolicyPeer(
                                namespace_selector=client.V1LabelSelector(
                                    match_labels={'name': namespace}
                                )
                            )
                        ]
                    ),
                    # Allow egress to internet (for external APIs)
                    client.V1NetworkPolicyEgressRule(
                        to=[],  # Empty means all destinations
                        ports=[
                            client.V1NetworkPolicyPort(port=80, protocol='TCP'),
                            client.V1NetworkPolicyPort(port=443, protocol='TCP'),
                            client.V1NetworkPolicyPort(port=53, protocol='UDP')  # DNS
                        ]
                    )
                ]
            )
        )
        
        try:
            self.k8s_networking_v1.create_namespaced_network_policy(namespace, network_policy)
            self.logger.info(f"Created network policy: {policy_name}")
        except ApiException as e:
            if e.status != 409:  # Ignore if already exists
                raise
                
    async def _create_tenant_services(self, tenant_id: str, namespace: str, tenant_config: TenantConfig) -> Dict[str, str]:
        """Create tenant-specific services."""
        services = {}
        
        # Create API service
        api_service_name = f"tenant-{tenant_id}-api"
        api_service = client.V1Service(
            metadata=client.V1ObjectMeta(
                name=api_service_name,
                namespace=namespace,
                labels={
                    'acso.tenant.id': tenant_id,
                    'acso.service.type': 'api',
                    'acso.managed': 'true'
                }
            ),
            spec=client.V1ServiceSpec(
                selector={'acso.tenant.id': tenant_id, 'acso.component': 'api'},
                ports=[
                    client.V1ServicePort(
                        name='http',
                        port=80,
                        target_port=8000,
                        protocol='TCP'
                    )
                ],
                type='ClusterIP'
            )
        )
        
        try:
            self.k8s_core_v1.create_namespaced_service(namespace, api_service)
            services['api'] = api_service_name
            self.logger.info(f"Created API service: {api_service_name}")
        except ApiException as e:
            if e.status != 409:  # Ignore if already exists
                services['api'] = api_service_name
        
        return services
        
    async def _create_tenant_ingress(self, tenant_id: str, namespace: str, tenant_config: TenantConfig) -> Dict[str, str]:
        """Create ingress configuration for the tenant."""
        endpoints = {}
        
        # Create ingress for API access
        ingress_name = f"tenant-{tenant_id}-ingress"
        host = f"{tenant_id}.acso.local"  # In production, use real domain
        
        ingress = client.V1Ingress(
            metadata=client.V1ObjectMeta(
                name=ingress_name,
                namespace=namespace,
                labels={
                    'acso.tenant.id': tenant_id,
                    'acso.managed': 'true'
                },
                annotations={
                    'nginx.ingress.kubernetes.io/rewrite-target': '/',
                    'nginx.ingress.kubernetes.io/ssl-redirect': 'true'
                }
            ),
            spec=client.V1IngressSpec(
                rules=[
                    client.V1IngressRule(
                        host=host,
                        http=client.V1HTTPIngressRuleValue(
                            paths=[
                                client.V1HTTPIngressPath(
                                    path='/',
                                    path_type='Prefix',
                                    backend=client.V1IngressBackend(
                                        service=client.V1IngressServiceBackend(
                                            name=f"tenant-{tenant_id}-api",
                                            port=client.V1ServiceBackendPort(number=80)
                                        )
                                    )
                                )
                            ]
                        )
                    )
                ]
            )
        )
        
        try:
            self.k8s_networking_v1.create_namespaced_ingress(namespace, ingress)
            endpoints['api'] = f"https://{host}"
            self.logger.info(f"Created ingress: {ingress_name}")
        except ApiException as e:
            if e.status != 409:  # Ignore if already exists
                endpoints['api'] = f"https://{host}"
        
        return endpoints
        
    async def _create_monitoring_config(self, tenant_id: str, namespace: str) -> None:
        """Create monitoring and logging configuration for the tenant."""
        # Create ConfigMap for monitoring configuration
        config_name = f"tenant-{tenant_id}-monitoring"
        
        monitoring_config = client.V1ConfigMap(
            metadata=client.V1ObjectMeta(
                name=config_name,
                namespace=namespace,
                labels={
                    'acso.tenant.id': tenant_id,
                    'acso.managed': 'true'
                }
            ),
            data={
                'prometheus.yml': yaml.dump({
                    'global': {
                        'scrape_interval': '15s'
                    },
                    'scrape_configs': [
                        {
                            'job_name': f'tenant-{tenant_id}',
                            'kubernetes_sd_configs': [
                                {
                                    'role': 'pod',
                                    'namespaces': {
                                        'names': [namespace]
                                    }
                                }
                            ]
                        }
                    ]
                })
            }
        )
        
        try:
            self.k8s_core_v1.create_namespaced_config_map(namespace, monitoring_config)
            self.logger.info(f"Created monitoring config: {config_name}")
        except ApiException as e:
            if e.status != 409:  # Ignore if already exists
                pass
                
    async def _update_resource_quotas(self, tenant_id: str, namespace: str, resource_limits) -> None:
        """Update resource quotas for the tenant."""
        quota_name = f"tenant-{tenant_id}-quota"
        
        # Get existing quota
        try:
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
            self.logger.info(f"Updated resource quota: {quota_name}")
            
        except ApiException as e:
            if e.status == 404:
                # Create new quota if it doesn't exist
                await self._create_resource_quotas(tenant_id, namespace, resource_limits)
            else:
                raise
                
    async def _update_tenant_services(self, tenant_id: str, namespace: str, tenant_config: TenantConfig) -> None:
        """Update tenant services if needed."""
        # For now, services don't need updates based on tier changes
        # This could be extended to add/remove services based on tier
        pass
        
    async def _update_tenant_ingress(self, tenant_id: str, namespace: str, tenant_config: TenantConfig) -> None:
        """Update tenant ingress configuration if needed."""
        # For now, ingress doesn't need updates based on tier changes
        # This could be extended to add custom domains for enterprise tiers
        pass
        
    async def _delete_namespace(self, namespace: str) -> None:
        """Delete a namespace."""
        try:
            self.k8s_core_v1.delete_namespace(namespace)
            self.logger.info(f"Deleted namespace: {namespace}")
        except ApiException as e:
            if e.status != 404:  # Ignore if namespace doesn't exist
                raise
                
    async def _cleanup_cluster_resources(self, tenant_id: str) -> None:
        """Clean up any cluster-wide resources for the tenant."""
        # Clean up cluster roles, cluster role bindings, etc. if any were created
        # For now, we only create namespaced resources, so nothing to clean up
        pass
        
    async def _get_namespace(self, namespace: str):
        """Get namespace information."""
        return self.k8s_core_v1.read_namespace(namespace)
        
    async def _list_namespace_pods(self, namespace: str):
        """List pods in a namespace."""
        return self.k8s_core_v1.list_namespaced_pod(namespace)
        
    async def _list_namespace_services(self, namespace: str):
        """List services in a namespace."""
        return self.k8s_core_v1.list_namespaced_service(namespace)