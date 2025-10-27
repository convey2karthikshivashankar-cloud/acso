"""ACSO Enterprise Framework - Flexible Licensing System

Per-agent, per-user, and consumption-based pricing with license enforcement,
usage tracking, and automated scaling and billing.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
from decimal import Decimal
import hashlib
import hmac
import base64

logger = logging.getLogger(__name__)

class LicenseType(Enum):
    """License types."""
    PER_AGENT = "per_agent"
    PER_USER = "per_user"
    CONSUMPTION_BASED = "consumption_based"
    ENTERPRISE = "enterprise"
    TRIAL = "trial"

class LicenseStatus(Enum):
    """License status."""
    ACTIVE = "active"
    EXPIRED = "expired"
    SUSPENDED = "suspended"
    REVOKED = "revoked"
    TRIAL = "trial"

class UsageMetricType(Enum):
    """Usage metric types."""
    AGENT_HOURS = "agent_hours"
    API_CALLS = "api_calls"
    DATA_PROCESSED = "data_processed"
    STORAGE_USED = "storage_used"
    COMPUTE_UNITS = "compute_units"
    TRANSACTIONS = "transactions"
    USERS = "users"

@dataclass
class LicenseFeature:
    """License feature definition."""
    feature_id: str
    name: str
    description: str
    is_enabled: bool = True
    limits: Dict[str, Any] = field(default_factory=dict)
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class UsageMetric:
    """Usage metric definition."""
    metric_id: str
    metric_type: UsageMetricType
    value: Decimal
    unit: str
    timestamp: datetime
    tenant_id: str
    resource_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class LicenseDefinition:
    """License definition."""
    license_id: str
    name: str
    license_type: LicenseType
    tenant_id: str
    features: Dict[str, LicenseFeature] = field(default_factory=dict)
    limits: Dict[str, Any] = field(default_factory=dict)
    pricing: Dict[str, Any] = field(default_factory=dict)
    status: LicenseStatus = LicenseStatus.ACTIVE
    valid_from: datetime = field(default_factory=datetime.now)
    valid_until: Optional[datetime] = None
    usage_metrics: List[UsageMetric] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

@dataclass
class LicenseUsage:
    """License usage tracking."""
    usage_id: str
    license_id: str
    tenant_id: str
    period_start: datetime
    period_end: datetime
    metrics: Dict[str, Decimal] = field(default_factory=dict)
    costs: Dict[str, Decimal] = field(default_factory=dict)
    total_cost: Decimal = Decimal('0.00')
    is_billable: bool = True
    billing_status: str = "pending"
    created_at: datetime = field(default_factory=datetime.now)

class LicenseValidator:
    """Validates license usage and enforces limits."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize license validator."""
        self.config = config
        self.validation_cache: Dict[str, Dict[str, Any]] = {}
        self.cache_ttl = config.get('cache_ttl', 300)  # 5 minutes
    
    async def validate_license(
        self,
        license_def: LicenseDefinition,
        requested_usage: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate license against requested usage."""
        validation_result = {
            'is_valid': True,
            'license_id': license_def.license_id,
            'status': license_def.status.value,
            'violations': [],
            'warnings': [],
            'remaining_quota': {},
            'expires_at': license_def.valid_until
        }
        
        try:
            # Check license status
            if license_def.status != LicenseStatus.ACTIVE:
                validation_result['is_valid'] = False
                validation_result['violations'].append(f"License status is {license_def.status.value}")
                return validation_result
            
            # Check expiration
            if license_def.valid_until and datetime.now() > license_def.valid_until:
                validation_result['is_valid'] = False
                validation_result['violations'].append("License has expired")
                return validation_result
            
            # Validate feature access
            await self._validate_features(license_def, requested_usage, validation_result)
            
            # Validate usage limits
            await self._validate_limits(license_def, requested_usage, validation_result)
            
            # Calculate remaining quota
            await self._calculate_remaining_quota(license_def, validation_result)
            
        except Exception as e:
            validation_result['is_valid'] = False
            validation_result['violations'].append(f"Validation error: {str(e)}")
            logger.error(f"License validation failed: {e}")
        
        return validation_result
    
    async def _validate_features(
        self,
        license_def: LicenseDefinition,
        requested_usage: Dict[str, Any],
        result: Dict[str, Any]
    ):
        """Validate feature access."""
        requested_features = requested_usage.get('features', [])
        
        for feature_name in requested_features:
            if feature_name not in license_def.features:
                result['violations'].append(f"Feature '{feature_name}' not included in license")
                result['is_valid'] = False
            elif not license_def.features[feature_name].is_enabled:
                result['violations'].append(f"Feature '{feature_name}' is disabled")
                result['is_valid'] = False
    
    async def _validate_limits(
        self,
        license_def: LicenseDefinition,
        requested_usage: Dict[str, Any],
        result: Dict[str, Any]
    ):
        """Validate usage limits."""
        current_usage = await self._get_current_usage(license_def.license_id)
        
        for limit_name, limit_value in license_def.limits.items():
            current_value = current_usage.get(limit_name, 0)
            requested_value = requested_usage.get(limit_name, 0)
            total_usage = current_value + requested_value
            
            if total_usage > limit_value:
                result['violations'].append(
                    f"Usage limit exceeded for '{limit_name}': {total_usage} > {limit_value}"
                )
                result['is_valid'] = False
            elif total_usage > limit_value * 0.8:  # 80% threshold warning
                result['warnings'].append(
                    f"Usage approaching limit for '{limit_name}': {total_usage}/{limit_value}"
                )
    
    async def _calculate_remaining_quota(
        self,
        license_def: LicenseDefinition,
        result: Dict[str, Any]
    ):
        """Calculate remaining quota for each limit."""
        current_usage = await self._get_current_usage(license_def.license_id)
        
        for limit_name, limit_value in license_def.limits.items():
            current_value = current_usage.get(limit_name, 0)
            remaining = max(0, limit_value - current_value)
            result['remaining_quota'][limit_name] = remaining
    
    async def _get_current_usage(self, license_id: str) -> Dict[str, Any]:
        """Get current usage for license."""
        # Check cache first
        cache_key = f"usage_{license_id}"
        if cache_key in self.validation_cache:
            cache_entry = self.validation_cache[cache_key]
            if datetime.now() - cache_entry['timestamp'] < timedelta(seconds=self.cache_ttl):
                return cache_entry['data']
        
        # Simulate usage retrieval (in real implementation, query database)
        usage_data = {
            'agents': 5,
            'users': 25,
            'api_calls': 10000,
            'storage_gb': 50,
            'compute_hours': 100
        }
        
        # Cache the result
        self.validation_cache[cache_key] = {
            'data': usage_data,
            'timestamp': datetime.now()
        }
        
        return usage_data

class UsageTracker:
    """Tracks usage metrics for licensing."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize usage tracker."""
        self.config = config
        self.usage_buffer: List[UsageMetric] = []
        self.buffer_size = config.get('buffer_size', 1000)
        self.flush_interval = config.get('flush_interval', 60)  # seconds
        
        # Start background flush task
        asyncio.create_task(self._flush_usage_periodically())
    
    async def record_usage(
        self,
        tenant_id: str,
        metric_type: UsageMetricType,
        value: Decimal,
        unit: str,
        resource_id: Optional[str] = None,
        metadata: Dict[str, Any] = None
    ) -> str:
        """Record a usage metric."""
        metric_id = str(uuid.uuid4())
        
        usage_metric = UsageMetric(
            metric_id=metric_id,
            metric_type=metric_type,
            value=value,
            unit=unit,
            timestamp=datetime.now(),
            tenant_id=tenant_id,
            resource_id=resource_id,
            metadata=metadata or {}
        )
        
        self.usage_buffer.append(usage_metric)
        
        # Flush if buffer is full
        if len(self.usage_buffer) >= self.buffer_size:
            await self._flush_usage_buffer()
        
        return metric_id
    
    async def get_usage_summary(
        self,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime,
        metric_types: List[UsageMetricType] = None
    ) -> Dict[str, Any]:
        """Get usage summary for a tenant."""
        # Simulate usage aggregation
        summary = {
            'tenant_id': tenant_id,
            'period_start': start_date,
            'period_end': end_date,
            'metrics': {},
            'total_cost': Decimal('0.00')
        }
        
        # Sample usage data
        if not metric_types or UsageMetricType.AGENT_HOURS in metric_types:
            summary['metrics']['agent_hours'] = {
                'value': Decimal('240.5'),
                'unit': 'hours',
                'cost': Decimal('1202.50')
            }
        
        if not metric_types or UsageMetricType.API_CALLS in metric_types:
            summary['metrics']['api_calls'] = {
                'value': Decimal('50000'),
                'unit': 'calls',
                'cost': Decimal('25.00')
            }
        
        if not metric_types or UsageMetricType.DATA_PROCESSED in metric_types:
            summary['metrics']['data_processed'] = {
                'value': Decimal('1024.0'),
                'unit': 'GB',
                'cost': Decimal('102.40')
            }
        
        # Calculate total cost
        summary['total_cost'] = sum(
            metric['cost'] for metric in summary['metrics'].values()
        )
        
        return summary
    
    async def _flush_usage_buffer(self):
        """Flush usage buffer to persistent storage."""
        if not self.usage_buffer:
            return
        
        try:
            # In real implementation, batch insert to database
            logger.info(f"Flushing {len(self.usage_buffer)} usage metrics")
            
            # Simulate database write
            await asyncio.sleep(0.1)
            
            self.usage_buffer.clear()
            
        except Exception as e:
            logger.error(f"Failed to flush usage buffer: {e}")
    
    async def _flush_usage_periodically(self):
        """Periodically flush usage buffer."""
        while True:
            try:
                await asyncio.sleep(self.flush_interval)
                await self._flush_usage_buffer()
            except Exception as e:
                logger.error(f"Periodic flush failed: {e}")

class LicenseEnforcement:
    """Enforces license restrictions and limits."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize license enforcement."""
        self.config = config
        self.validator = LicenseValidator(config.get('validation', {}))
        self.enforcement_actions: Dict[str, callable] = {
            'block': self._block_action,
            'throttle': self._throttle_action,
            'warn': self._warn_action,
            'charge': self._charge_action
        }
    
    async def enforce_license(
        self,
        license_def: LicenseDefinition,
        requested_action: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enforce license restrictions for requested action."""
        enforcement_result = {
            'allowed': True,
            'action_taken': None,
            'message': None,
            'retry_after': None,
            'additional_cost': Decimal('0.00')
        }
        
        try:
            # Validate license
            validation_result = await self.validator.validate_license(
                license_def, requested_action
            )
            
            if not validation_result['is_valid']:
                # Determine enforcement action
                enforcement_policy = license_def.metadata.get('enforcement_policy', 'block')
                action_handler = self.enforcement_actions.get(enforcement_policy, self._block_action)
                
                enforcement_result = await action_handler(
                    license_def, requested_action, validation_result, enforcement_result
                )
            
        except Exception as e:
            enforcement_result['allowed'] = False
            enforcement_result['message'] = f"Enforcement error: {str(e)}"
            logger.error(f"License enforcement failed: {e}")
        
        return enforcement_result
    
    async def _block_action(
        self,
        license_def: LicenseDefinition,
        requested_action: Dict[str, Any],
        validation_result: Dict[str, Any],
        enforcement_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Block the requested action."""
        enforcement_result['allowed'] = False
        enforcement_result['action_taken'] = 'blocked'
        enforcement_result['message'] = f"Action blocked: {', '.join(validation_result['violations'])}"
        return enforcement_result
    
    async def _throttle_action(
        self,
        license_def: LicenseDefinition,
        requested_action: Dict[str, Any],
        validation_result: Dict[str, Any],
        enforcement_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Throttle the requested action."""
        enforcement_result['allowed'] = True
        enforcement_result['action_taken'] = 'throttled'
        enforcement_result['message'] = "Action throttled due to license limits"
        enforcement_result['retry_after'] = 60  # seconds
        return enforcement_result
    
    async def _warn_action(
        self,
        license_def: LicenseDefinition,
        requested_action: Dict[str, Any],
        validation_result: Dict[str, Any],
        enforcement_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Allow action but issue warning."""
        enforcement_result['allowed'] = True
        enforcement_result['action_taken'] = 'warned'
        enforcement_result['message'] = f"Warning: {', '.join(validation_result['violations'])}"
        return enforcement_result
    
    async def _charge_action(
        self,
        license_def: LicenseDefinition,
        requested_action: Dict[str, Any],
        validation_result: Dict[str, Any],
        enforcement_result: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Allow action with additional charges."""
        enforcement_result['allowed'] = True
        enforcement_result['action_taken'] = 'charged'
        enforcement_result['message'] = "Action allowed with overage charges"
        
        # Calculate overage cost
        overage_rate = license_def.pricing.get('overage_rate', Decimal('0.10'))
        enforcement_result['additional_cost'] = overage_rate
        
        return enforcement_result

class AutomatedScaling:
    """Automated license scaling based on usage patterns."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize automated scaling."""
        self.config = config
        self.scaling_policies: Dict[str, Dict[str, Any]] = {}
        self.scaling_history: List[Dict[str, Any]] = []
    
    async def create_scaling_policy(
        self,
        policy_id: str,
        license_id: str,
        metric_type: UsageMetricType,
        scale_up_threshold: float,
        scale_down_threshold: float,
        scaling_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create an automated scaling policy."""
        policy = {
            'policy_id': policy_id,
            'license_id': license_id,
            'metric_type': metric_type,
            'scale_up_threshold': scale_up_threshold,
            'scale_down_threshold': scale_down_threshold,
            'scaling_config': scaling_config,
            'is_active': True,
            'created_at': datetime.now(),
            'last_triggered': None
        }
        
        self.scaling_policies[policy_id] = policy
        
        return {
            'success': True,
            'policy_id': policy_id,
            'policy': policy
        }
    
    async def evaluate_scaling_policies(self, license_id: str) -> List[Dict[str, Any]]:
        """Evaluate scaling policies for a license."""
        scaling_actions = []
        
        # Find policies for this license
        relevant_policies = [
            policy for policy in self.scaling_policies.values()
            if policy['license_id'] == license_id and policy['is_active']
        ]
        
        for policy in relevant_policies:
            try:
                # Get current usage
                current_usage = await self._get_current_usage_percentage(
                    license_id, policy['metric_type']
                )
                
                action = None
                if current_usage >= policy['scale_up_threshold']:
                    action = await self._create_scale_up_action(policy, current_usage)
                elif current_usage <= policy['scale_down_threshold']:
                    action = await self._create_scale_down_action(policy, current_usage)
                
                if action:
                    scaling_actions.append(action)
                    policy['last_triggered'] = datetime.now()
                    self.scaling_history.append(action)
                
            except Exception as e:
                logger.error(f"Failed to evaluate scaling policy {policy['policy_id']}: {e}")
        
        return scaling_actions
    
    async def _get_current_usage_percentage(
        self,
        license_id: str,
        metric_type: UsageMetricType
    ) -> float:
        """Get current usage as percentage of limit."""
        # Simulate usage percentage calculation
        usage_percentages = {
            UsageMetricType.AGENT_HOURS: 85.0,
            UsageMetricType.API_CALLS: 92.0,
            UsageMetricType.DATA_PROCESSED: 78.0,
            UsageMetricType.USERS: 95.0
        }
        
        return usage_percentages.get(metric_type, 50.0)
    
    async def _create_scale_up_action(
        self,
        policy: Dict[str, Any],
        current_usage: float
    ) -> Dict[str, Any]:
        """Create scale-up action."""
        scaling_config = policy['scaling_config']
        scale_factor = scaling_config.get('scale_up_factor', 1.5)
        
        return {
            'action_id': str(uuid.uuid4()),
            'policy_id': policy['policy_id'],
            'license_id': policy['license_id'],
            'action_type': 'scale_up',
            'metric_type': policy['metric_type'].value,
            'current_usage': current_usage,
            'scale_factor': scale_factor,
            'timestamp': datetime.now(),
            'status': 'pending'
        }
    
    async def _create_scale_down_action(
        self,
        policy: Dict[str, Any],
        current_usage: float
    ) -> Dict[str, Any]:
        """Create scale-down action."""
        scaling_config = policy['scaling_config']
        scale_factor = scaling_config.get('scale_down_factor', 0.8)
        
        return {
            'action_id': str(uuid.uuid4()),
            'policy_id': policy['policy_id'],
            'license_id': policy['license_id'],
            'action_type': 'scale_down',
            'metric_type': policy['metric_type'].value,
            'current_usage': current_usage,
            'scale_factor': scale_factor,
            'timestamp': datetime.now(),
            'status': 'pending'
        }

class FlexibleLicensingSystem:
    """Main flexible licensing system coordinator."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize flexible licensing system."""
        self.config = config
        self.validator = LicenseValidator(config.get('validation', {}))
        self.usage_tracker = UsageTracker(config.get('usage_tracking', {}))
        self.enforcement = LicenseEnforcement(config.get('enforcement', {}))
        self.auto_scaling = AutomatedScaling(config.get('auto_scaling', {}))
        self.licenses: Dict[str, LicenseDefinition] = {}
        self.license_templates: Dict[str, Dict[str, Any]] = {}
        
        # Initialize license templates
        self._initialize_license_templates()
        
        logger.info("Flexible licensing system initialized")
    
    def _initialize_license_templates(self):
        """Initialize predefined license templates."""
        self.license_templates = {
            'starter': {
                'name': 'Starter Plan',
                'license_type': LicenseType.PER_USER,
                'features': {
                    'basic_agents': {'name': 'Basic Agents', 'is_enabled': True},
                    'api_access': {'name': 'API Access', 'is_enabled': True},
                    'email_support': {'name': 'Email Support', 'is_enabled': True}
                },
                'limits': {
                    'users': 10,
                    'agents': 5,
                    'api_calls': 10000,
                    'storage_gb': 10
                },
                'pricing': {
                    'base_price': Decimal('29.99'),
                    'per_user_price': Decimal('9.99'),
                    'billing_cycle': 'monthly'
                }
            },
            'professional': {
                'name': 'Professional Plan',
                'license_type': LicenseType.PER_AGENT,
                'features': {
                    'advanced_agents': {'name': 'Advanced Agents', 'is_enabled': True},
                    'workflow_designer': {'name': 'Workflow Designer', 'is_enabled': True},
                    'analytics': {'name': 'Analytics Dashboard', 'is_enabled': True},
                    'priority_support': {'name': 'Priority Support', 'is_enabled': True}
                },
                'limits': {
                    'users': 50,
                    'agents': 25,
                    'api_calls': 100000,
                    'storage_gb': 100
                },
                'pricing': {
                    'base_price': Decimal('99.99'),
                    'per_agent_price': Decimal('19.99'),
                    'billing_cycle': 'monthly'
                }
            },
            'enterprise': {
                'name': 'Enterprise Plan',
                'license_type': LicenseType.ENTERPRISE,
                'features': {
                    'all_features': {'name': 'All Features', 'is_enabled': True},
                    'custom_integrations': {'name': 'Custom Integrations', 'is_enabled': True},
                    'dedicated_support': {'name': 'Dedicated Support', 'is_enabled': True},
                    'sla_guarantee': {'name': 'SLA Guarantee', 'is_enabled': True}
                },
                'limits': {
                    'users': -1,  # Unlimited
                    'agents': -1,  # Unlimited
                    'api_calls': -1,  # Unlimited
                    'storage_gb': -1  # Unlimited
                },
                'pricing': {
                    'base_price': Decimal('999.99'),
                    'billing_cycle': 'monthly',
                    'custom_pricing': True
                }
            }
        }
    
    async def create_license(
        self,
        tenant_id: str,
        template_id: str,
        custom_config: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a new license from template."""
        if template_id not in self.license_templates:
            return {'success': False, 'error': f'Template {template_id} not found'}
        
        template = self.license_templates[template_id]
        license_id = str(uuid.uuid4())
        
        # Create license features
        features = {}
        for feature_id, feature_config in template['features'].items():
            features[feature_id] = LicenseFeature(
                feature_id=feature_id,
                name=feature_config['name'],
                description=feature_config.get('description', ''),
                is_enabled=feature_config.get('is_enabled', True)
            )
        
        # Apply custom configuration if provided
        if custom_config:
            # Override limits
            limits = template['limits'].copy()
            limits.update(custom_config.get('limits', {}))
            
            # Override pricing
            pricing = template['pricing'].copy()
            pricing.update(custom_config.get('pricing', {}))
        else:
            limits = template['limits']
            pricing = template['pricing']
        
        # Create license definition
        license_def = LicenseDefinition(
            license_id=license_id,
            name=template['name'],
            license_type=LicenseType(template['license_type']),
            tenant_id=tenant_id,
            features=features,
            limits=limits,
            pricing=pricing,
            valid_until=custom_config.get('valid_until') if custom_config else None
        )
        
        self.licenses[license_id] = license_def
        
        return {
            'success': True,
            'license_id': license_id,
            'license': license_def
        }
    
    async def validate_usage(
        self,
        license_id: str,
        requested_usage: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Validate usage against license."""
        if license_id not in self.licenses:
            return {'success': False, 'error': 'License not found'}
        
        license_def = self.licenses[license_id]
        validation_result = await self.validator.validate_license(license_def, requested_usage)
        
        return {
            'success': True,
            'validation_result': validation_result
        }
    
    async def enforce_license(
        self,
        license_id: str,
        requested_action: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Enforce license restrictions."""
        if license_id not in self.licenses:
            return {'success': False, 'error': 'License not found'}
        
        license_def = self.licenses[license_id]
        enforcement_result = await self.enforcement.enforce_license(license_def, requested_action)
        
        return {
            'success': True,
            'enforcement_result': enforcement_result
        }
    
    async def record_usage(
        self,
        tenant_id: str,
        metric_type: UsageMetricType,
        value: Decimal,
        unit: str,
        resource_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Record usage metric."""
        metric_id = await self.usage_tracker.record_usage(
            tenant_id, metric_type, value, unit, resource_id
        )
        
        return {
            'success': True,
            'metric_id': metric_id
        }
    
    async def get_usage_summary(
        self,
        tenant_id: str,
        start_date: datetime,
        end_date: datetime
    ) -> Dict[str, Any]:
        """Get usage summary for tenant."""
        usage_summary = await self.usage_tracker.get_usage_summary(
            tenant_id, start_date, end_date
        )
        
        return {
            'success': True,
            'usage_summary': usage_summary
        }
    
    async def create_scaling_policy(
        self,
        license_id: str,
        metric_type: UsageMetricType,
        scale_up_threshold: float,
        scale_down_threshold: float,
        scaling_config: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Create automated scaling policy."""
        policy_id = str(uuid.uuid4())
        
        result = await self.auto_scaling.create_scaling_policy(
            policy_id, license_id, metric_type,
            scale_up_threshold, scale_down_threshold, scaling_config
        )
        
        return result
    
    async def evaluate_scaling(self, license_id: str) -> Dict[str, Any]:
        """Evaluate scaling policies for license."""
        scaling_actions = await self.auto_scaling.evaluate_scaling_policies(license_id)
        
        return {
            'success': True,
            'scaling_actions': scaling_actions
        }
    
    async def get_license_status(self, license_id: str) -> Dict[str, Any]:
        """Get comprehensive license status."""
        if license_id not in self.licenses:
            return {'success': False, 'error': 'License not found'}
        
        license_def = self.licenses[license_id]
        
        # Get current usage
        current_usage = await self.validator._get_current_usage(license_id)
        
        # Calculate utilization
        utilization = {}
        for limit_name, limit_value in license_def.limits.items():
            if limit_value > 0:  # Skip unlimited (-1) limits
                current_value = current_usage.get(limit_name, 0)
                utilization[limit_name] = {
                    'current': current_value,
                    'limit': limit_value,
                    'percentage': (current_value / limit_value) * 100
                }
        
        return {
            'success': True,
            'license_id': license_id,
            'status': license_def.status.value,
            'license_type': license_def.license_type.value,
            'valid_until': license_def.valid_until,
            'features': {
                feature_id: {
                    'name': feature.name,
                    'enabled': feature.is_enabled
                }
                for feature_id, feature in license_def.features.items()
            },
            'utilization': utilization,
            'current_usage': current_usage
        }

# Example usage
if __name__ == "__main__":
    config = {
        'validation': {
            'cache_ttl': 300
        },
        'usage_tracking': {
            'buffer_size': 1000,
            'flush_interval': 60
        },
        'enforcement': {
            'default_policy': 'block'
        },
        'auto_scaling': {
            'enabled': True
        }
    }
    
    licensing_system = FlexibleLicensingSystem(config)
    
    async def example_usage():
        # Create a professional license
        license_result = await licensing_system.create_license(
            "tenant-123",
            "professional",
            {
                'limits': {'agents': 30},  # Override default limit
                'valid_until': datetime.now() + timedelta(days=365)
            }
        )
        
        if license_result['success']:
            license_id = license_result['license_id']
            
            # Record some usage
            await licensing_system.record_usage(
                "tenant-123",
                UsageMetricType.AGENT_HOURS,
                Decimal('10.5'),
                "hours"
            )
            
            # Validate usage
            validation_result = await licensing_system.validate_usage(
                license_id,
                {'agents': 5, 'features': ['advanced_agents', 'workflow_designer']}
            )
            print(f"Validation Result: {validation_result}")
            
            # Create scaling policy
            scaling_result = await licensing_system.create_scaling_policy(
                license_id,
                UsageMetricType.AGENT_HOURS,
                80.0,  # Scale up at 80%
                30.0,  # Scale down at 30%
                {'scale_up_factor': 1.5, 'scale_down_factor': 0.8}
            )
            print(f"Scaling Policy: {scaling_result}")
            
            # Get license status
            status_result = await licensing_system.get_license_status(license_id)
            print(f"License Status: {status_result}")
    
    asyncio.run(example_usage())