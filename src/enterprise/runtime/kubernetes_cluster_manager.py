"""
Enterprise Kubernetes Cluster Manager for ACSO Agent Runtime.
Provides multi-node agent deployment, scaling, and lifecycle management.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import yaml
import json

from kubernetes import client, config, watch
from kubernetes.client.rest import ApiException
import prometheus_client

from ..models.agent_runtime import AgentSpec, FleetDeployment, ScalingPolicy, ScalingResult
from ..monitoring.metrics_collector import MetricsCollector
from ..security.rbac_manager import RBACManager


class DeploymentStrategy(str, Enum):
    """Agent deployment strategies."""
    ROLLING_UPDATE = "rolling_update"
    BLUE_GREEN = "blue_green"
    CANARY = "canary"
    RECREATE = "recreate"


class NodeAffinityType(str, Enum):
    """Node affinity types for agent placement."""
    REQUIRED = "required"
    PREFERRED = "preferred"
    ANTI_AFFINITY = "anti_affinity"


@dataclass
class AgentDeploymentConfig:
    """Configuration for agent deployment."""
    replicas: int
    cpu_request: str
    cpu_limit: str
    memory_request: str
    memory_limit: str
    node_selector: Dict[str, str]
    tolerations: List[Dict[str, Any]]
    affinity_rules: Dict[str, Any]
    environment_variables: Dict[str, str]
    secrets: List[str]
    config_maps: List[str]
    persistent_volumes: List[Dict[str, Any]]
    service_account: str
    security_context: Dict[str, Any]


class KubernetesClusterManager:
    """Enterprise-grade Kubernetes cluster manager for ACSO agents."""
    
    def __init__(self, namespace: str = "acso-enterprise"):
        self.namespace = namespace
        self.logger = logging.getLogger(__name__)
        self.metrics_collector = MetricsCollector()
        self.rbac_manager = RBACManager()
        
        # Initialize Kubernetes clients
        try:
            config.load_incluster_config()  # For in-cluster deployment
        except config.ConfigException:
            config.load_kube_config()  # For local development
            
        self.k8s_apps_v1 = client.AppsV1Api()
        self.k8s_core_v1 = client.CoreV1Api()
        self.k8s_rbac_v1 = client.RbacAuthorizationV1Api()
        self.k8s_autoscaling_v2 = client.AutoscalingV2Api()
        self.k8s_networking_v1 = client.NetworkingV1Api()
        
        # Deployment tracking
        self.active_deployments: Dict[str, Dict[str, Any]] = {}
        self.scaling_policies: Dict[str, ScalingPolicy] = {}
        
        # Monitoring
        self.deployment_metrics = prometheus_client.Gauge(
            'acso_agent_deployments_total',
            'Total number of agent deployments',
            ['namespace', 'agent_type', 'status']
        )
        
        self.pod_metrics = prometheus_client.Gauge(
            'acso_agent_pods_total',
            'Total number of agent pods',
            ['namespace', 'agent_type', 'phase']
        )
        
    async def initialize_cluster(self) -> bool:
        """Initialize the cluster for ACSO operations."""
        try:
            self.logger.info(f"Initializing ACSO cluster in namespace: {self.namespace}")
            
            # Create namespace if it doesn't exist
            await self._ensure_namespace_exists()
            
            # Set up RBAC
            await self._setup_rbac()
            
            # Create network policies
            await self._setup_network_policies()
            
            # Initialize monitoring
            await self._setup_monitoring()
            
            # Start background tasks
            asyncio.create_task(self._monitor_deployments())
            asyncio.create_task(self._cleanup_failed_pods())
            
            self.logger.info("Cluster initialization completed successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Cluster initialization failed: {e}")
            return False
    
    async def deploy_agent_fleet(self, agent_specs: List[AgentSpec]) -> FleetDeployment:
        """Deploy and manage a fleet of agents across the cluster."""
        fleet_id = f"fleet-{datetime.utcnow().strftime('%Y%m%d-%H%M%S')}"
        deployment_results = []
        
        try:
            self.logger.info(f"Deploying agent fleet {fleet_id} with {len(agent_specs)} agents")
            
            for agent_spec in agent_specs:
                deployment_result = await self._deploy_single_agent(agent_spec, fleet_id)
                deployment_results.append(deployment_result)
                
                # Update metrics
                self.deployment_metrics.labels(
                    namespace=self.namespace,
                    agent_type=agent_spec.agent_type,
                    status=deployment_result.status
                ).inc()
            
            # Create fleet-level services and ingress
            await self._create_fleet_services(fleet_id, agent_specs)
            
            fleet_deployment = FleetDeployment(
                fleet_id=fleet_id,
                agent_specs=agent_specs,
                deployment_results=deployment_results,
                status="deployed" if all(r.success for r in deployment_results) else "partial",
                created_at=datetime.utcnow(),
                namespace=self.namespace
            )
            
            self.active_deployments[fleet_id] = {
                "deployment": fleet_deployment,
                "last_updated": datetime.utcnow()
            }
            
            return fleet_deployment
            
        except Exception as e:
            self.logger.error(f"Fleet deployment failed: {e}")
            return FleetDeployment(
                fleet_id=fleet_id,
                agent_specs=agent_specs,
                deployment_results=deployment_results,
                status="failed",
                created_at=datetime.utcnow(),
                namespace=self.namespace,
                error=str(e)
            )
    
    async def scale_agents(self, scaling_policy: ScalingPolicy) -> ScalingResult:
        """Dynamically scale agent instances based on demand."""
        try:
            self.logger.info(f"Scaling agents with policy: {scaling_policy.policy_name}")
            
            # Store scaling policy
            self.scaling_policies[scaling_policy.target_deployment] = scaling_policy
            
            # Get current deployment
            deployment = await self._get_deployment(scaling_policy.target_deployment)
            if not deployment:
                raise ValueError(f"Deployment {scaling_policy.target_deployment} not found")
            
            current_replicas = deployment.spec.replicas
            target_replicas = await self._calculate_target_replicas(scaling_policy, current_replicas)
            
            if target_replicas == current_replicas:
                return ScalingResult(
                    success=True,
                    previous_replicas=current_replicas,
                    target_replicas=target_replicas,
                    actual_replicas=current_replicas,
                    scaling_reason="No scaling needed"
                )
            
            # Perform scaling
            deployment.spec.replicas = target_replicas
            await self._update_deployment(deployment)
            
            # Wait for scaling to complete
            actual_replicas = await self._wait_for_scaling_completion(
                scaling_policy.target_deployment, target_replicas
            )
            
            scaling_result = ScalingResult(
                success=True,
                previous_replicas=current_replicas,
                target_replicas=target_replicas,
                actual_replicas=actual_replicas,
                scaling_reason=f"Scaled based on {scaling_policy.scaling_metric}"
            )
            
            self.logger.info(f"Scaling completed: {current_replicas} -> {actual_replicas}")
            return scaling_result
            
        except Exception as e:
            self.logger.error(f"Scaling failed: {e}")
            return ScalingResult(
                success=False,
                error=str(e)
            )
    
    async def _deploy_single_agent(self, agent_spec: AgentSpec, fleet_id: str) -> Dict[str, Any]:
        """Deploy a single agent with enterprise-grade configuration."""
        deployment_name = f"{agent_spec.agent_type}-{agent_spec.agent_id}"
        
        try:
            # Create deployment configuration
            deployment_config = self._create_deployment_config(agent_spec, fleet_id)
            
            # Apply deployment
            deployment = await self._create_deployment(deployment_config)
            
            # Create service
            service = await self._create_service(agent_spec, deployment_name)
            
            # Create horizontal pod autoscaler if specified
            if agent_spec.auto_scaling_enabled:
                hpa = await self._create_hpa(agent_spec, deployment_name)
            
            # Create network policy
            network_policy = await self._create_network_policy(agent_spec, deployment_name)
            
            return {
                "success": True,
                "deployment_name": deployment_name,
                "deployment": deployment,
                "service": service,
                "agent_spec": agent_spec
            }
            
        except Exception as e:
            self.logger.error(f"Failed to deploy agent {agent_spec.agent_id}: {e}")
            return {
                "success": False,
                "deployment_name": deployment_name,
                "error": str(e),
                "agent_spec": agent_spec
            }
    
    def _create_deployment_config(self, agent_spec: AgentSpec, fleet_id: str) -> client.V1Deployment:
        """Create Kubernetes deployment configuration for an agent."""
        deployment_name = f"{agent_spec.agent_type}-{agent_spec.agent_id}"
        
        # Container configuration
        container = client.V1Container(
            name=agent_spec.agent_type,
            image=f"acso/{agent_spec.agent_type}:enterprise",
            image_pull_policy="Always",
            resources=client.V1ResourceRequirements(
                requests={
                    "cpu": agent_spec.resources.cpu_request,
                    "memory": agent_spec.resources.memory_request
                },
                limits={
                    "cpu": agent_spec.resources.cpu_limit,
                    "memory": agent_spec.resources.memory_limit
                }
            ),
            env=[
                client.V1EnvVar(name="AGENT_ID", value=agent_spec.agent_id),
                client.V1EnvVar(name="AGENT_TYPE", value=agent_spec.agent_type),
                client.V1EnvVar(name="FLEET_ID", value=fleet_id),
                client.V1EnvVar(name="NAMESPACE", value=self.namespace),
                client.V1EnvVar(name="CLUSTER_MODE", value="enterprise"),
                client.V1EnvVar(name="TENANT_ID", value=agent_spec.tenant_id),
            ] + [
                client.V1EnvVar(name=k, value=v) 
                for k, v in agent_spec.environment_variables.items()
            ],
            ports=[
                client.V1ContainerPort(container_port=8080, name="http"),
                client.V1ContainerPort(container_port=9090, name="metrics"),
                client.V1ContainerPort(container_port=8081, name="health")
            ],
            liveness_probe=client.V1Probe(
                http_get=client.V1HTTPGetAction(path="/health", port=8081),
                initial_delay_seconds=30,
                period_seconds=10,
                timeout_seconds=5,
                failure_threshold=3
            ),
            readiness_probe=client.V1Probe(
                http_get=client.V1HTTPGetAction(path="/ready", port=8081),
                initial_delay_seconds=10,
                period_seconds=5,
                timeout_seconds=3,
                failure_threshold=3
            ),
            security_context=client.V1SecurityContext(
                run_as_non_root=True,
                run_as_user=1000,
                read_only_root_filesystem=True,
                allow_privilege_escalation=False,
                capabilities=client.V1Capabilities(drop=["ALL"])
            )
        )
        
        # Pod template
        pod_template = client.V1PodTemplateSpec(
            metadata=client.V1ObjectMeta(
                labels={
                    "app": "acso-agent",
                    "agent-type": agent_spec.agent_type,
                    "agent-id": agent_spec.agent_id,
                    "fleet-id": fleet_id,
                    "tenant-id": agent_spec.tenant_id,
                    "version": "enterprise"
                },
                annotations={
                    "prometheus.io/scrape": "true",
                    "prometheus.io/port": "9090",
                    "prometheus.io/path": "/metrics"
                }
            ),
            spec=client.V1PodSpec(
                containers=[container],
                service_account_name=f"acso-agent-{agent_spec.tenant_id}",
                security_context=client.V1PodSecurityContext(
                    fs_group=2000,
                    run_as_group=3000,
                    run_as_non_root=True,
                    run_as_user=1000
                ),
                node_selector=agent_spec.node_selector,
                tolerations=[
                    client.V1Toleration(**toleration) 
                    for toleration in agent_spec.tolerations
                ],
                affinity=self._create_affinity_rules(agent_spec),
                restart_policy="Always",
                termination_grace_period_seconds=30
            )
        )
        
        # Deployment specification
        deployment_spec = client.V1DeploymentSpec(
            replicas=agent_spec.initial_replicas,
            selector=client.V1LabelSelector(
                match_labels={
                    "app": "acso-agent",
                    "agent-type": agent_spec.agent_type,
                    "agent-id": agent_spec.agent_id
                }
            ),
            template=pod_template,
            strategy=client.V1DeploymentStrategy(
                type="RollingUpdate",
                rolling_update=client.V1RollingUpdateDeployment(
                    max_surge="25%",
                    max_unavailable="25%"
                )
            )
        )
        
        # Complete deployment
        deployment = client.V1Deployment(
            api_version="apps/v1",
            kind="Deployment",
            metadata=client.V1ObjectMeta(
                name=deployment_name,
                namespace=self.namespace,
                labels={
                    "app": "acso-agent",
                    "agent-type": agent_spec.agent_type,
                    "fleet-id": fleet_id,
                    "tenant-id": agent_spec.tenant_id
                }
            ),
            spec=deployment_spec
        )
        
        return deployment
    
    def _create_affinity_rules(self, agent_spec: AgentSpec) -> client.V1Affinity:
        """Create pod affinity and anti-affinity rules."""
        affinity = client.V1Affinity()
        
        # Pod anti-affinity to spread agents across nodes
        if agent_spec.spread_across_nodes:
            affinity.pod_anti_affinity = client.V1PodAntiAffinity(
                preferred_during_scheduling_ignored_during_execution=[
                    client.V1WeightedPodAffinityTerm(
                        weight=100,
                        pod_affinity_term=client.V1PodAffinityTerm(
                            label_selector=client.V1LabelSelector(
                                match_expressions=[
                                    client.V1LabelSelectorRequirement(
                                        key="agent-type",
                                        operator="In",
                                        values=[agent_spec.agent_type]
                                    )
                                ]
                            ),
                            topology_key="kubernetes.io/hostname"
                        )
                    )
                ]
            )
        
        # Node affinity for specific node types
        if agent_spec.preferred_node_types:
            affinity.node_affinity = client.V1NodeAffinity(
                preferred_during_scheduling_ignored_during_execution=[
                    client.V1PreferredSchedulingTerm(
                        weight=50,
                        preference=client.V1NodeSelectorTerm(
                            match_expressions=[
                                client.V1NodeSelectorRequirement(
                                    key="node-type",
                                    operator="In",
                                    values=agent_spec.preferred_node_types
                                )
                            ]
                        )
                    )
                ]
            )
        
        return affinity
    
    async def _create_deployment(self, deployment_config: client.V1Deployment) -> client.V1Deployment:
        """Create Kubernetes deployment."""
        try:
            deployment = self.k8s_apps_v1.create_namespaced_deployment(
                namespace=self.namespace,
                body=deployment_config
            )
            self.logger.info(f"Created deployment: {deployment.metadata.name}")
            return deployment
        except ApiException as e:
            if e.status == 409:  # Conflict - deployment already exists
                self.logger.info(f"Deployment {deployment_config.metadata.name} already exists, updating...")
                return self.k8s_apps_v1.patch_namespaced_deployment(
                    name=deployment_config.metadata.name,
                    namespace=self.namespace,
                    body=deployment_config
                )
            raise
    
    async def _ensure_namespace_exists(self):
        """Ensure the ACSO namespace exists."""
        try:
            self.k8s_core_v1.read_namespace(name=self.namespace)
        except ApiException as e:
            if e.status == 404:
                namespace = client.V1Namespace(
                    metadata=client.V1ObjectMeta(
                        name=self.namespace,
                        labels={
                            "app": "acso",
                            "tier": "enterprise"
                        }
                    )
                )
                self.k8s_core_v1.create_namespace(body=namespace)
                self.logger.info(f"Created namespace: {self.namespace}")
            else:
                raise
    
    async def _monitor_deployments(self):
        """Monitor deployment health and performance."""
        while True:
            try:
                await asyncio.sleep(30)  # Check every 30 seconds
                
                deployments = self.k8s_apps_v1.list_namespaced_deployment(
                    namespace=self.namespace,
                    label_selector="app=acso-agent"
                )
                
                for deployment in deployments.items:
                    await self._update_deployment_metrics(deployment)
                    
            except Exception as e:
                self.logger.error(f"Deployment monitoring error: {e}")
                await asyncio.sleep(60)  # Wait longer on error
    
    async def _update_deployment_metrics(self, deployment: client.V1Deployment):
        """Update Prometheus metrics for a deployment."""
        try:
            # Get pods for this deployment
            pods = self.k8s_core_v1.list_namespaced_pod(
                namespace=self.namespace,
                label_selector=f"app=acso-agent,agent-type={deployment.metadata.labels.get('agent-type')}"
            )
            
            # Count pods by phase
            pod_phases = {}
            for pod in pods.items:
                phase = pod.status.phase
                pod_phases[phase] = pod_phases.get(phase, 0) + 1
            
            # Update metrics
            agent_type = deployment.metadata.labels.get('agent-type', 'unknown')
            for phase, count in pod_phases.items():
                self.pod_metrics.labels(
                    namespace=self.namespace,
                    agent_type=agent_type,
                    phase=phase.lower()
                ).set(count)
                
        except Exception as e:
            self.logger.error(f"Failed to update metrics for deployment {deployment.metadata.name}: {e}")    
async def _setup_rbac(self):
        """Set up Role-Based Access Control for ACSO agents."""
        await self.rbac_manager.create_service_accounts(self.namespace)
        await self.rbac_manager.create_cluster_roles()
        await self.rbac_manager.create_role_bindings(self.namespace)
    
    async def _setup_network_policies(self):
        """Set up network policies for tenant isolation."""
        network_policy = client.V1NetworkPolicy(
            metadata=client.V1ObjectMeta(
                name="acso-agent-network-policy",
                namespace=self.namespace
            ),
            spec=client.V1NetworkPolicySpec(
                pod_selector=client.V1LabelSelector(
                    match_labels={"app": "acso-agent"}
                ),
                policy_types=["Ingress", "Egress"],
                ingress=[
                    client.V1NetworkPolicyIngressRule(
                        from_=[
                            client.V1NetworkPolicyPeer(
                                namespace_selector=client.V1LabelSelector(
                                    match_labels={"app": "acso"}
                                )
                            )
                        ],
                        ports=[
                            client.V1NetworkPolicyPort(port=8080, protocol="TCP"),
                            client.V1NetworkPolicyPort(port=9090, protocol="TCP")
                        ]
                    )
                ],
                egress=[
                    client.V1NetworkPolicyEgressRule(
                        to=[
                            client.V1NetworkPolicyPeer(
                                namespace_selector=client.V1LabelSelector(
                                    match_labels={"app": "acso"}
                                )
                            )
                        ]
                    )
                ]
            )
        )
        
        try:
            self.k8s_networking_v1.create_namespaced_network_policy(
                namespace=self.namespace,
                body=network_policy
            )
        except ApiException as e:
            if e.status != 409:  # Ignore if already exists
                raise
    
    async def _setup_monitoring(self):
        """Set up monitoring and observability."""
        # Create ServiceMonitor for Prometheus
        service_monitor = {
            "apiVersion": "monitoring.coreos.com/v1",
            "kind": "ServiceMonitor",
            "metadata": {
                "name": "acso-agent-metrics",
                "namespace": self.namespace,
                "labels": {"app": "acso-agent"}
            },
            "spec": {
                "selector": {
                    "matchLabels": {"app": "acso-agent"}
                },
                "endpoints": [
                    {
                        "port": "metrics",
                        "interval": "30s",
                        "path": "/metrics"
                    }
                ]
            }
        }
        
        # Apply ServiceMonitor (would need custom resource definition)
        self.logger.info("Monitoring setup completed")
    
    async def _create_service(self, agent_spec: AgentSpec, deployment_name: str) -> client.V1Service:
        """Create Kubernetes service for an agent."""
        service = client.V1Service(
            metadata=client.V1ObjectMeta(
                name=f"{deployment_name}-service",
                namespace=self.namespace,
                labels={
                    "app": "acso-agent",
                    "agent-type": agent_spec.agent_type,
                    "agent-id": agent_spec.agent_id
                }
            ),
            spec=client.V1ServiceSpec(
                selector={
                    "app": "acso-agent",
                    "agent-id": agent_spec.agent_id
                },
                ports=[
                    client.V1ServicePort(name="http", port=80, target_port=8080),
                    client.V1ServicePort(name="metrics", port=9090, target_port=9090),
                    client.V1ServicePort(name="health", port=8081, target_port=8081)
                ],
                type="ClusterIP"
            )
        )
        
        return self.k8s_core_v1.create_namespaced_service(
            namespace=self.namespace,
            body=service
        )
    
    async def _create_hpa(self, agent_spec: AgentSpec, deployment_name: str) -> client.V2HorizontalPodAutoscaler:
        """Create Horizontal Pod Autoscaler for an agent."""
        hpa = client.V2HorizontalPodAutoscaler(
            metadata=client.V1ObjectMeta(
                name=f"{deployment_name}-hpa",
                namespace=self.namespace
            ),
            spec=client.V2HorizontalPodAutoscalerSpec(
                scale_target_ref=client.V2CrossVersionObjectReference(
                    api_version="apps/v1",
                    kind="Deployment",
                    name=deployment_name
                ),
                min_replicas=agent_spec.min_replicas,
                max_replicas=agent_spec.max_replicas,
                metrics=[
                    client.V2MetricSpec(
                        type="Resource",
                        resource=client.V2ResourceMetricSource(
                            name="cpu",
                            target=client.V2MetricTarget(
                                type="Utilization",
                                average_utilization=70
                            )
                        )
                    ),
                    client.V2MetricSpec(
                        type="Resource",
                        resource=client.V2ResourceMetricSource(
                            name="memory",
                            target=client.V2MetricTarget(
                                type="Utilization",
                                average_utilization=80
                            )
                        )
                    )
                ]
            )
        )
        
        return self.k8s_autoscaling_v2.create_namespaced_horizontal_pod_autoscaler(
            namespace=self.namespace,
            body=hpa
        )
    
    async def _create_network_policy(self, agent_spec: AgentSpec, deployment_name: str) -> client.V1NetworkPolicy:
        """Create network policy for agent isolation."""
        network_policy = client.V1NetworkPolicy(
            metadata=client.V1ObjectMeta(
                name=f"{deployment_name}-network-policy",
                namespace=self.namespace
            ),
            spec=client.V1NetworkPolicySpec(
                pod_selector=client.V1LabelSelector(
                    match_labels={
                        "app": "acso-agent",
                        "agent-id": agent_spec.agent_id
                    }
                ),
                policy_types=["Ingress", "Egress"],
                ingress=[
                    client.V1NetworkPolicyIngressRule(
                        from_=[
                            client.V1NetworkPolicyPeer(
                                pod_selector=client.V1LabelSelector(
                                    match_labels={"app": "acso-agent"}
                                )
                            )
                        ]
                    )
                ]
            )
        )
        
        return self.k8s_networking_v1.create_namespaced_network_policy(
            namespace=self.namespace,
            body=network_policy
        )
    
    async def _create_fleet_services(self, fleet_id: str, agent_specs: List[AgentSpec]):
        """Create fleet-level services and load balancers."""
        # Create fleet service for load balancing
        fleet_service = client.V1Service(
            metadata=client.V1ObjectMeta(
                name=f"fleet-{fleet_id}-service",
                namespace=self.namespace,
                labels={
                    "app": "acso-fleet",
                    "fleet-id": fleet_id
                }
            ),
            spec=client.V1ServiceSpec(
                selector={"fleet-id": fleet_id},
                ports=[
                    client.V1ServicePort(name="http", port=80, target_port=8080)
                ],
                type="LoadBalancer"
            )
        )
        
        self.k8s_core_v1.create_namespaced_service(
            namespace=self.namespace,
            body=fleet_service
        )
    
    async def _get_deployment(self, deployment_name: str) -> Optional[client.V1Deployment]:
        """Get deployment by name."""
        try:
            return self.k8s_apps_v1.read_namespaced_deployment(
                name=deployment_name,
                namespace=self.namespace
            )
        except ApiException as e:
            if e.status == 404:
                return None
            raise
    
    async def _update_deployment(self, deployment: client.V1Deployment):
        """Update an existing deployment."""
        self.k8s_apps_v1.patch_namespaced_deployment(
            name=deployment.metadata.name,
            namespace=self.namespace,
            body=deployment
        )
    
    async def _calculate_target_replicas(self, scaling_policy: ScalingPolicy, current_replicas: int) -> int:
        """Calculate target replica count based on scaling policy."""
        # Get current metrics
        metrics = await self.metrics_collector.get_deployment_metrics(scaling_policy.target_deployment)
        
        if scaling_policy.scaling_metric == "cpu_utilization":
            cpu_usage = metrics.get("cpu_utilization", 0)
            if cpu_usage > scaling_policy.target_value:
                return min(current_replicas + scaling_policy.scale_up_step, scaling_policy.max_replicas)
            elif cpu_usage < scaling_policy.target_value * 0.7:
                return max(current_replicas - scaling_policy.scale_down_step, scaling_policy.min_replicas)
        
        return current_replicas
    
    async def _wait_for_scaling_completion(self, deployment_name: str, target_replicas: int, timeout: int = 300) -> int:
        """Wait for scaling operation to complete."""
        start_time = datetime.utcnow()
        
        while (datetime.utcnow() - start_time).seconds < timeout:
            deployment = await self._get_deployment(deployment_name)
            if deployment and deployment.status.ready_replicas == target_replicas:
                return deployment.status.ready_replicas
            
            await asyncio.sleep(10)
        
        # Return current replica count if timeout
        deployment = await self._get_deployment(deployment_name)
        return deployment.status.ready_replicas if deployment else 0
    
    async def _cleanup_failed_pods(self):
        """Clean up failed pods periodically."""
        while True:
            try:
                await asyncio.sleep(300)  # Check every 5 minutes
                
                pods = self.k8s_core_v1.list_namespaced_pod(
                    namespace=self.namespace,
                    label_selector="app=acso-agent"
                )
                
                for pod in pods.items:
                    if pod.status.phase == "Failed":
                        # Delete failed pods older than 1 hour
                        if pod.metadata.creation_timestamp:
                            age = datetime.utcnow() - pod.metadata.creation_timestamp.replace(tzinfo=None)
                            if age > timedelta(hours=1):
                                self.k8s_core_v1.delete_namespaced_pod(
                                    name=pod.metadata.name,
                                    namespace=self.namespace
                                )
                                self.logger.info(f"Cleaned up failed pod: {pod.metadata.name}")
                                
            except Exception as e:
                self.logger.error(f"Pod cleanup error: {e}")
                await asyncio.sleep(300)
    
    async def get_cluster_health(self) -> Dict[str, Any]:
        """Get comprehensive cluster health status."""
        try:
            # Get node status
            nodes = self.k8s_core_v1.list_node()
            node_status = {
                "total": len(nodes.items),
                "ready": len([n for n in nodes.items if self._is_node_ready(n)]),
                "not_ready": len([n for n in nodes.items if not self._is_node_ready(n)])
            }
            
            # Get pod status
            pods = self.k8s_core_v1.list_namespaced_pod(namespace=self.namespace)
            pod_status = {
                "total": len(pods.items),
                "running": len([p for p in pods.items if p.status.phase == "Running"]),
                "pending": len([p for p in pods.items if p.status.phase == "Pending"]),
                "failed": len([p for p in pods.items if p.status.phase == "Failed"])
            }
            
            # Get deployment status
            deployments = self.k8s_apps_v1.list_namespaced_deployment(namespace=self.namespace)
            deployment_status = {
                "total": len(deployments.items),
                "available": len([d for d in deployments.items if d.status.available_replicas]),
                "unavailable": len([d for d in deployments.items if not d.status.available_replicas])
            }
            
            return {
                "cluster_healthy": node_status["not_ready"] == 0 and pod_status["failed"] == 0,
                "nodes": node_status,
                "pods": pod_status,
                "deployments": deployment_status,
                "namespace": self.namespace,
                "timestamp": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get cluster health: {e}")
            return {
                "cluster_healthy": False,
                "error": str(e),
                "timestamp": datetime.utcnow().isoformat()
            }
    
    def _is_node_ready(self, node: client.V1Node) -> bool:
        """Check if a node is ready."""
        for condition in node.status.conditions or []:
            if condition.type == "Ready":
                return condition.status == "True"
        return False