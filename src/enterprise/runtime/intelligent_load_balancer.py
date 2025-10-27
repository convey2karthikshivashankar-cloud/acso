"""
Intelligent Load Balancer for ACSO Enterprise Agent Runtime.
Provides predictive scaling and intelligent traffic distribution.
"""

import asyncio
import logging
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass
from enum import Enum
import json

from sklearn.ensemble import RandomForestRegressor
from sklearn.preprocessing import StandardScaler
import prometheus_client

from ..models.load_balancing import LoadBalancingStrategy, TrafficPattern, ScalingDecision
from ..monitoring.metrics_collector import MetricsCollector
from ..ai.predictive_models import TimeSeriesPredictor


class LoadBalancingAlgorithm(str, Enum):
    """Load balancing algorithms."""
    ROUND_ROBIN = "round_robin"
    WEIGHTED_ROUND_ROBIN = "weighted_round_robin"
    LEAST_CONNECTIONS = "least_connections"
    LEAST_RESPONSE_TIME = "least_response_time"
    RESOURCE_BASED = "resource_based"
    AI_OPTIMIZED = "ai_optimized"


class HealthStatus(str, Enum):
    """Agent health status."""
    HEALTHY = "healthy"
    DEGRADED = "degraded"
    UNHEALTHY = "unhealthy"
    UNKNOWN = "unknown"


@dataclass
class AgentEndpoint:
    """Represents an agent endpoint for load balancing."""
    agent_id: str
    agent_type: str
    endpoint_url: str
    current_connections: int
    max_connections: int
    response_time_avg: float
    cpu_usage: float
    memory_usage: float
    health_status: HealthStatus
    weight: float
    last_health_check: datetime
    capabilities: List[str]
    tenant_id: str


@dataclass
class LoadMetrics:
    """Load balancing metrics."""
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time: float
    p95_response_time: float
    p99_response_time: float
    active_connections: int
    queue_length: int
    throughput_per_second: float


class IntelligentLoadBalancer:
    """AI-powered load balancer with predictive scaling capabilities."""
    
    def __init__(self, cluster_manager):
        self.cluster_manager = cluster_manager
        self.logger = logging.getLogger(__name__)
        self.metrics_collector = MetricsCollector()
        self.time_series_predictor = TimeSeriesPredictor()
        
        # Load balancing state
        self.agent_endpoints: Dict[str, AgentEndpoint] = {}
        self.traffic_patterns: Dict[str, List[TrafficPattern]] = {}
        self.load_metrics: Dict[str, LoadMetrics] = {}
        
        # AI models for optimization
        self.scaling_model = RandomForestRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.model_trained = False
        
        # Configuration
        self.health_check_interval = 10  # seconds
        self.prediction_window = 300  # 5 minutes
        self.scaling_cooldown = 180  # 3 minutes
        self.last_scaling_action = {}
        
        # Prometheus metrics
        self.request_counter = prometheus_client.Counter(
            'acso_lb_requests_total',
            'Total number of requests processed',
            ['agent_type', 'tenant_id', 'status']
        )
        
        self.response_time_histogram = prometheus_client.Histogram(
            'acso_lb_response_time_seconds',
            'Response time distribution',
            ['agent_type', 'tenant_id']
        )
        
        self.active_connections_gauge = prometheus_client.Gauge(
            'acso_lb_active_connections',
            'Number of active connections',
            ['agent_type', 'tenant_id']
        )
        
        # Start background tasks
        asyncio.create_task(self._health_check_loop())
        asyncio.create_task(self._predictive_scaling_loop())
        asyncio.create_task(self._traffic_pattern_analysis_loop())
    
    async def register_agent_endpoint(self, endpoint: AgentEndpoint) -> bool:
        """Register a new agent endpoint for load balancing."""
        try:
            self.agent_endpoints[endpoint.agent_id] = endpoint
            self.logger.info(f"Registered agent endpoint: {endpoint.agent_id}")
            
            # Initialize metrics for this endpoint
            self.load_metrics[endpoint.agent_id] = LoadMetrics(
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                average_response_time=0.0,
                p95_response_time=0.0,
                p99_response_time=0.0,
                active_connections=0,
                queue_length=0,
                throughput_per_second=0.0
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to register agent endpoint {endpoint.agent_id}: {e}")
            return False
    
    async def select_agent_for_request(self, 
                                     request_type: str, 
                                     tenant_id: str,
                                     capabilities_required: List[str] = None) -> Optional[AgentEndpoint]:
        """Select the best agent endpoint for a request using AI optimization."""
        try:
            # Filter agents by tenant and capabilities
            candidate_agents = self._filter_candidate_agents(
                request_type, tenant_id, capabilities_required
            )
            
            if not candidate_agents:
                self.logger.warning(f"No available agents for request type: {request_type}")
                return None
            
            # Select agent based on configured algorithm
            selected_agent = await self._select_optimal_agent(candidate_agents, request_type)
            
            if selected_agent:
                # Update connection count
                selected_agent.current_connections += 1
                self.active_connections_gauge.labels(
                    agent_type=selected_agent.agent_type,
                    tenant_id=selected_agent.tenant_id
                ).set(selected_agent.current_connections)
            
            return selected_agent
            
        except Exception as e:
            self.logger.error(f"Agent selection failed: {e}")
            return None
    
    async def release_agent_connection(self, agent_id: str, 
                                     response_time: float, 
                                     success: bool) -> None:
        """Release agent connection and update metrics."""
        try:
            if agent_id not in self.agent_endpoints:
                return
            
            agent = self.agent_endpoints[agent_id]
            agent.current_connections = max(0, agent.current_connections - 1)
            
            # Update metrics
            metrics = self.load_metrics[agent_id]
            metrics.total_requests += 1
            
            if success:
                metrics.successful_requests += 1
                self.request_counter.labels(
                    agent_type=agent.agent_type,
                    tenant_id=agent.tenant_id,
                    status='success'
                ).inc()
            else:
                metrics.failed_requests += 1
                self.request_counter.labels(
                    agent_type=agent.agent_type,
                    tenant_id=agent.tenant_id,
                    status='error'
                ).inc()
            
            # Update response time metrics
            self.response_time_histogram.labels(
                agent_type=agent.agent_type,
                tenant_id=agent.tenant_id
            ).observe(response_time)
            
            # Update connection count
            self.active_connections_gauge.labels(
                agent_type=agent.agent_type,
                tenant_id=agent.tenant_id
            ).set(agent.current_connections)
            
        except Exception as e:
            self.logger.error(f"Failed to release agent connection: {e}")
    
    def _filter_candidate_agents(self, 
                                request_type: str, 
                                tenant_id: str,
                                capabilities_required: List[str] = None) -> List[AgentEndpoint]:
        """Filter agents based on tenant, capabilities, and health."""
        candidates = []
        
        for agent in self.agent_endpoints.values():
            # Check tenant isolation
            if agent.tenant_id != tenant_id:
                continue
            
            # Check health status
            if agent.health_status not in [HealthStatus.HEALTHY, HealthStatus.DEGRADED]:
                continue
            
            # Check capacity
            if agent.current_connections >= agent.max_connections:
                continue
            
            # Check capabilities if specified
            if capabilities_required:
                if not all(cap in agent.capabilities for cap in capabilities_required):
                    continue
            
            candidates.append(agent)
        
        return candidates
    
    async def _select_optimal_agent(self, 
                                   candidates: List[AgentEndpoint], 
                                   request_type: str) -> Optional[AgentEndpoint]:
        """Select optimal agent using AI-based optimization."""
        if not candidates:
            return None
        
        if len(candidates) == 1:
            return candidates[0]
        
        # Use AI model if trained, otherwise fall back to heuristics
        if self.model_trained:
            return await self._ai_based_selection(candidates, request_type)
        else:
            return await self._heuristic_based_selection(candidates)
    
    async def _ai_based_selection(self, 
                                 candidates: List[AgentEndpoint], 
                                 request_type: str) -> AgentEndpoint:
        """AI-based agent selection using trained models."""
        try:
            # Prepare features for each candidate
            features = []
            for agent in candidates:
                feature_vector = [
                    agent.current_connections / max(agent.max_connections, 1),
                    agent.response_time_avg,
                    agent.cpu_usage,
                    agent.memory_usage,
                    agent.weight,
                    len(agent.capabilities),
                    1.0 if agent.health_status == HealthStatus.HEALTHY else 0.5
                ]
                features.append(feature_vector)
            
            # Predict performance scores
            features_scaled = self.scaler.transform(features)
            scores = self.scaling_model.predict(features_scaled)
            
            # Select agent with best predicted performance
            best_idx = np.argmax(scores)
            return candidates[best_idx]
            
        except Exception as e:
            self.logger.error(f"AI-based selection failed, falling back to heuristics: {e}")
            return await self._heuristic_based_selection(candidates)
    
    async def _heuristic_based_selection(self, candidates: List[AgentEndpoint]) -> AgentEndpoint:
        """Heuristic-based agent selection."""
        # Calculate composite score for each agent
        best_agent = None
        best_score = float('-inf')
        
        for agent in candidates:
            # Normalize metrics (lower is better for most metrics)
            connection_ratio = agent.current_connections / max(agent.max_connections, 1)
            cpu_penalty = agent.cpu_usage / 100.0
            memory_penalty = agent.memory_usage / 100.0
            response_time_penalty = min(agent.response_time_avg / 1000.0, 1.0)  # Cap at 1 second
            
            # Health bonus
            health_bonus = 1.0 if agent.health_status == HealthStatus.HEALTHY else 0.5
            
            # Calculate composite score (higher is better)
            score = (
                agent.weight * health_bonus * 
                (1.0 - connection_ratio) * 
                (1.0 - cpu_penalty) * 
                (1.0 - memory_penalty) * 
                (1.0 - response_time_penalty)
            )
            
            if score > best_score:
                best_score = score
                best_agent = agent
        
        return best_agent
    
    async def _health_check_loop(self):
        """Continuously monitor agent health."""
        while True:
            try:
                await asyncio.sleep(self.health_check_interval)
                
                for agent_id, agent in self.agent_endpoints.items():
                    await self._perform_health_check(agent)
                    
            except Exception as e:
                self.logger.error(f"Health check loop error: {e}")
                await asyncio.sleep(30)
    
    async def _perform_health_check(self, agent: AgentEndpoint):
        """Perform health check on a single agent."""
        try:
            # This would typically make an HTTP request to the agent's health endpoint
            # For now, we'll simulate based on current metrics
            
            current_time = datetime.utcnow()
            
            # Check if agent is overloaded
            connection_ratio = agent.current_connections / max(agent.max_connections, 1)
            
            if connection_ratio > 0.9 or agent.cpu_usage > 90 or agent.memory_usage > 90:
                agent.health_status = HealthStatus.DEGRADED
            elif connection_ratio > 0.95 or agent.cpu_usage > 95 or agent.memory_usage > 95:
                agent.health_status = HealthStatus.UNHEALTHY
            else:
                agent.health_status = HealthStatus.HEALTHY
            
            agent.last_health_check = current_time
            
        except Exception as e:
            self.logger.error(f"Health check failed for agent {agent.agent_id}: {e}")
            agent.health_status = HealthStatus.UNKNOWN
    
    async def _predictive_scaling_loop(self):
        """Predictive scaling based on traffic patterns."""
        while True:
            try:
                await asyncio.sleep(60)  # Check every minute
                
                # Analyze traffic patterns and predict scaling needs
                scaling_decisions = await self._analyze_scaling_needs()
                
                for decision in scaling_decisions:
                    await self._execute_scaling_decision(decision)
                    
            except Exception as e:
                self.logger.error(f"Predictive scaling loop error: {e}")
                await asyncio.sleep(120)
    
    async def _analyze_scaling_needs(self) -> List[ScalingDecision]:
        """Analyze current load and predict scaling needs."""
        scaling_decisions = []
        
        try:
            # Group agents by type and tenant
            agent_groups = {}
            for agent in self.agent_endpoints.values():
                key = f"{agent.agent_type}:{agent.tenant_id}"
                if key not in agent_groups:
                    agent_groups[key] = []
                agent_groups[key].append(agent)
            
            # Analyze each group
            for group_key, agents in agent_groups.items():
                agent_type, tenant_id = group_key.split(':')
                
                # Calculate group metrics
                total_connections = sum(a.current_connections for a in agents)
                total_capacity = sum(a.max_connections for a in agents)
                avg_cpu = np.mean([a.cpu_usage for a in agents])
                avg_memory = np.mean([a.memory_usage for a in agents])
                avg_response_time = np.mean([a.response_time_avg for a in agents])
                
                # Check if scaling is needed
                utilization = total_connections / max(total_capacity, 1)
                
                # Scale up conditions
                if (utilization > 0.8 or avg_cpu > 80 or avg_memory > 80 or 
                    avg_response_time > 500):  # 500ms threshold
                    
                    # Check cooldown period
                    last_scaling = self.last_scaling_action.get(group_key, datetime.min)
                    if (datetime.utcnow() - last_scaling).seconds > self.scaling_cooldown:
                        
                        scaling_decisions.append(ScalingDecision(
                            agent_type=agent_type,
                            tenant_id=tenant_id,
                            action="scale_up",
                            target_replicas=len(agents) + max(1, int(len(agents) * 0.5)),
                            reason=f"High utilization: {utilization:.2f}",
                            confidence=0.8
                        ))
                
                # Scale down conditions
                elif (utilization < 0.3 and avg_cpu < 30 and avg_memory < 30 and 
                      len(agents) > 1):  # Don't scale below 1
                    
                    last_scaling = self.last_scaling_action.get(group_key, datetime.min)
                    if (datetime.utcnow() - last_scaling).seconds > self.scaling_cooldown:
                        
                        scaling_decisions.append(ScalingDecision(
                            agent_type=agent_type,
                            tenant_id=tenant_id,
                            action="scale_down",
                            target_replicas=max(1, len(agents) - 1),
                            reason=f"Low utilization: {utilization:.2f}",
                            confidence=0.7
                        ))
        
        except Exception as e:
            self.logger.error(f"Scaling analysis failed: {e}")
        
        return scaling_decisions
    
    async def _execute_scaling_decision(self, decision: ScalingDecision):
        """Execute a scaling decision."""
        try:
            group_key = f"{decision.agent_type}:{decision.tenant_id}"
            
            self.logger.info(f"Executing scaling decision: {decision.action} for {group_key}")
            
            # This would integrate with the cluster manager to actually scale
            # For now, we'll log the decision
            self.last_scaling_action[group_key] = datetime.utcnow()
            
            # In a real implementation, this would call:
            # await self.cluster_manager.scale_deployment(decision)
            
        except Exception as e:
            self.logger.error(f"Failed to execute scaling decision: {e}")
    
    async def _traffic_pattern_analysis_loop(self):
        """Analyze traffic patterns for better predictions."""
        while True:
            try:
                await asyncio.sleep(300)  # Analyze every 5 minutes
                
                # Collect traffic patterns
                await self._collect_traffic_patterns()
                
                # Train/update AI models
                await self._update_ai_models()
                
            except Exception as e:
                self.logger.error(f"Traffic pattern analysis error: {e}")
                await asyncio.sleep(600)
    
    async def _collect_traffic_patterns(self):
        """Collect and store traffic patterns."""
        try:
            current_time = datetime.utcnow()
            
            for agent_id, metrics in self.load_metrics.items():
                if agent_id not in self.agent_endpoints:
                    continue
                
                agent = self.agent_endpoints[agent_id]
                
                pattern = TrafficPattern(
                    timestamp=current_time,
                    agent_type=agent.agent_type,
                    tenant_id=agent.tenant_id,
                    request_rate=metrics.throughput_per_second,
                    response_time=metrics.average_response_time,
                    error_rate=metrics.failed_requests / max(metrics.total_requests, 1),
                    cpu_usage=agent.cpu_usage,
                    memory_usage=agent.memory_usage,
                    active_connections=agent.current_connections
                )
                
                key = f"{agent.agent_type}:{agent.tenant_id}"
                if key not in self.traffic_patterns:
                    self.traffic_patterns[key] = []
                
                self.traffic_patterns[key].append(pattern)
                
                # Keep only last 24 hours of data
                cutoff_time = current_time - timedelta(hours=24)
                self.traffic_patterns[key] = [
                    p for p in self.traffic_patterns[key] 
                    if p.timestamp > cutoff_time
                ]
        
        except Exception as e:
            self.logger.error(f"Traffic pattern collection failed: {e}")
    
    async def _update_ai_models(self):
        """Update AI models with collected data."""
        try:
            # Prepare training data from traffic patterns
            features = []
            targets = []
            
            for patterns in self.traffic_patterns.values():
                if len(patterns) < 10:  # Need minimum data points
                    continue
                
                for i in range(len(patterns) - 1):
                    current = patterns[i]
                    next_pattern = patterns[i + 1]
                    
                    # Features: current state
                    feature_vector = [
                        current.request_rate,
                        current.response_time,
                        current.error_rate,
                        current.cpu_usage,
                        current.memory_usage,
                        current.active_connections,
                        current.timestamp.hour,  # Time of day
                        current.timestamp.weekday()  # Day of week
                    ]
                    
                    # Target: next response time (what we want to optimize)
                    target = next_pattern.response_time
                    
                    features.append(feature_vector)
                    targets.append(target)
            
            if len(features) > 50:  # Minimum training data
                # Train the model
                features_array = np.array(features)
                targets_array = np.array(targets)
                
                # Fit scaler and transform features
                features_scaled = self.scaler.fit_transform(features_array)
                
                # Train the model
                self.scaling_model.fit(features_scaled, targets_array)
                self.model_trained = True
                
                self.logger.info(f"Updated AI model with {len(features)} data points")
        
        except Exception as e:
            self.logger.error(f"AI model update failed: {e}")
    
    async def get_load_balancer_stats(self) -> Dict[str, Any]:
        """Get comprehensive load balancer statistics."""
        try:
            stats = {
                "total_agents": len(self.agent_endpoints),
                "healthy_agents": len([a for a in self.agent_endpoints.values() 
                                     if a.health_status == HealthStatus.HEALTHY]),
                "total_connections": sum(a.current_connections for a in self.agent_endpoints.values()),
                "total_capacity": sum(a.max_connections for a in self.agent_endpoints.values()),
                "average_cpu_usage": np.mean([a.cpu_usage for a in self.agent_endpoints.values()]) if self.agent_endpoints else 0,
                "average_memory_usage": np.mean([a.memory_usage for a in self.agent_endpoints.values()]) if self.agent_endpoints else 0,
                "model_trained": self.model_trained,
                "traffic_patterns_collected": sum(len(patterns) for patterns in self.traffic_patterns.values()),
                "last_health_check": max([a.last_health_check for a in self.agent_endpoints.values()], default=datetime.min),
                "agent_distribution": {}
            }
            
            # Agent distribution by type and tenant
            for agent in self.agent_endpoints.values():
                key = f"{agent.agent_type}:{agent.tenant_id}"
                if key not in stats["agent_distribution"]:
                    stats["agent_distribution"][key] = 0
                stats["agent_distribution"][key] += 1
            
            return stats
            
        except Exception as e:
            self.logger.error(f"Failed to get load balancer stats: {e}")
            return {"error": str(e)}