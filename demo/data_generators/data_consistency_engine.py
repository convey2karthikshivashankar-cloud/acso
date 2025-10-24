"""
Data Relationship and Consistency Engine for ACSO Phase 5 Agentic Demonstrations.

This module ensures cross-domain data relationships, temporal consistency,
data validation, and quality checks across all generated demo data.
"""

import asyncio
import random
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Tuple, Callable
from enum import Enum
from dataclasses import dataclass, field
import json
import logging
from collections import defaultdict

from .cybersecurity_data_generator import cybersecurity_generator
from .financial_data_generator import financial_generator
from .operational_data_generator import operational_generator

logger = logging.getLogger(__name__)


class RelationshipType(str, Enum):
    """Types of data relationships."""
    ONE_TO_ONE = "one_to_one"
    ONE_TO_MANY = "one_to_many"
    MANY_TO_MANY = "many_to_many"
    TEMPORAL = "temporal"
    HIERARCHICAL = "hierarchical"


class ConsistencyLevel(str, Enum):
    """Data consistency levels."""
    STRICT = "strict"
    EVENTUAL = "eventual"
    WEAK = "weak"


@dataclass
class DataRelationship:
    """Represents a relationship between data entities."""
    relationship_id: str
    source_type: str
    source_id: str
    target_type: str
    target_id: str
    relationship_type: RelationshipType
    strength: float  # 0.0 to 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "relationship_id": self.relationship_id,
            "source_type": self.source_type,
            "source_id": self.source_id,
            "target_type": self.target_type,
            "target_id": self.target_id,
            "relationship_type": self.relationship_type.value,
            "strength": self.strength,
            "metadata": self.metadata
        }


@dataclass
class ConsistencyRule:
    """Represents a data consistency rule."""
    rule_id: str
    name: str
    description: str
    data_types: List[str]
    consistency_level: ConsistencyLevel
    validation_function: str
    auto_fix: bool
    priority: int
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "rule_id": self.rule_id,
            "name": self.name,
            "description": self.description,
            "data_types": self.data_types,
            "consistency_level": self.consistency_level.value,
            "validation_function": self.validation_function,
            "auto_fix": self.auto_fix,
            "priority": self.priority,
            "metadata": self.metadata
        }


@dataclass
class ValidationResult:
    """Represents a data validation result."""
    validation_id: str
    rule_id: str
    data_type: str
    data_id: str
    is_valid: bool
    issues: List[str]
    severity: str
    auto_fixed: bool
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "validation_id": self.validation_id,
            "rule_id": self.rule_id,
            "data_type": self.data_type,
            "data_id": self.data_id,
            "is_valid": self.is_valid,
            "issues": self.issues,
            "severity": self.severity,
            "auto_fixed": self.auto_fixed,
            "timestamp": self.timestamp.isoformat(),
            "metadata": self.metadata
        }


class DataConsistencyEngine:
    """Manages data relationships and ensures consistency across domains."""
    
    def __init__(self):
        self.relationships: Dict[str, DataRelationship] = {}
        self.consistency_rules: Dict[str, ConsistencyRule] = {}
        self.validation_results: List[ValidationResult] = []
        self.data_cache: Dict[str, Dict[str, Any]] = {}
        
        # Configuration
        self.config = {
            "max_relationship_strength": 1.0,
            "min_relationship_strength": 0.1,
            "temporal_window_hours": 24,
            "validation_batch_size": 100,
            "auto_fix_enabled": True
        }
        
        # Initialize built-in consistency rules
        self._initialize_consistency_rules()
        
    def _initialize_consistency_rules(self):
        """Initialize built-in consistency rules."""
        rules = [
            ConsistencyRule(
                rule_id="temporal_consistency",
                name="Temporal Consistency",
                description="Ensure timestamps are logically consistent across related data",
                data_types=["incidents", "threats", "metrics", "activities"],
                consistency_level=ConsistencyLevel.STRICT,
                validation_function="validate_temporal_consistency",
                auto_fix=True,
                priority=1
            ),
            ConsistencyRule(
                rule_id="asset_reference_integrity",
                name="Asset Reference Integrity",
                description="Ensure all asset references point to valid assets",
                data_types=["incidents", "threats", "vulnerabilities", "metrics"],
                consistency_level=ConsistencyLevel.STRICT,
                validation_function="validate_asset_references",
                auto_fix=False,
                priority=2
            ),
            ConsistencyRule(
                rule_id="financial_cost_alignment",
                name="Financial Cost Alignment",
                description="Ensure costs align with actual resource usage",
                data_types=["costs", "metrics", "assets"],
                consistency_level=ConsistencyLevel.EVENTUAL,
                validation_function="validate_cost_alignment",
                auto_fix=True,
                priority=3
            ),
            ConsistencyRule(
                rule_id="user_activity_correlation",
                name="User Activity Correlation",
                description="Ensure user activities correlate with system events",
                data_types=["activities", "workflows", "incidents"],
                consistency_level=ConsistencyLevel.WEAK,
                validation_function="validate_user_correlation",
                auto_fix=False,
                priority=4
            )
        ]
        
        for rule in rules:
            self.consistency_rules[rule.rule_id] = rule
            
    async def generate_consistent_dataset(self) -> Dict[str, Any]:
        """Generate a complete, consistent dataset across all domains."""
        logger.info("Generating consistent cross-domain dataset...")
        
        # Generate base datasets
        cybersecurity_data = await cybersecurity_generator.generate_complete_dataset()
        financial_data = await financial_generator.generate_complete_dataset()
        operational_data = await operational_generator.generate_complete_dataset()
        
        # Cache data for relationship building
        self.data_cache = {
            "cybersecurity": cybersecurity_data,
            "financial": financial_data,
            "operational": operational_data
        }
        
        # Build relationships between datasets
        await self._build_cross_domain_relationships()
        
        # Apply consistency rules
        await self._apply_consistency_rules()
        
        # Validate and fix inconsistencies
        validation_results = await self._validate_dataset()
        
        # Create unified dataset
        unified_dataset = {
            "dataset_id": str(uuid.uuid4()),
            "generated_at": datetime.utcnow().isoformat(),
            "description": "Unified consistent dataset across all domains",
            "domains": {
                "cybersecurity": cybersecurity_data,
                "financial": financial_data,
                "operational": operational_data
            },
            "relationships": {
                rel_id: rel.to_dict() for rel_id, rel in self.relationships.items()
            },
            "consistency_validation": {
                "total_validations": len(validation_results),
                "passed_validations": len([v for v in validation_results if v.is_valid]),
                "failed_validations": len([v for v in validation_results if not v.is_valid]),
                "auto_fixed_issues": len([v for v in validation_results if v.auto_fixed]),
                "results": [v.to_dict() for v in validation_results]
            },
            "statistics": await self._calculate_dataset_statistics()
        }
        
        logger.info(f"Generated unified dataset with {len(self.relationships)} relationships")
        
        return unified_dataset
        
    async def _build_cross_domain_relationships(self):
        """Build relationships between different data domains."""
        logger.info("Building cross-domain relationships...")
        
        # Asset-based relationships
        await self._build_asset_relationships()
        
        # Temporal relationships
        await self._build_temporal_relationships()
        
        # Cost-resource relationships
        await self._build_cost_relationships()
        
        # User-activity relationships
        await self._build_user_relationships()
        
        # Incident-workflow relationships
        await self._build_incident_workflow_relationships()
        
    async def _build_asset_relationships(self):
        """Build relationships based on network assets."""
        cybersec_data = self.data_cache["cybersecurity"]
        operational_data = self.data_cache["operational"]
        financial_data = self.data_cache["financial"]
        
        # Get network assets
        network_assets = cybersec_data.get("network_topology", {}).get("assets", {})
        
        for asset_id, asset_data in network_assets.items():
            # Link assets to service metrics
            service_metrics = operational_data.get("service_metrics", {}).get("service_metrics", {})
            for metric_id, metric_data in service_metrics.items():
                if self._assets_match(asset_data, metric_data):
                    relationship = DataRelationship(
                        relationship_id=str(uuid.uuid4()),
                        source_type="network_asset",
                        source_id=asset_id,
                        target_type="service_metric",
                        target_id=metric_id,
                        relationship_type=RelationshipType.ONE_TO_MANY,
                        strength=0.8,
                        metadata={"correlation": "asset_monitoring"}
                    )
                    self.relationships[relationship.relationship_id] = relationship
                    
            # Link assets to costs
            cost_data = financial_data.get("cost_data", {}).get("cost_data", {})
            for cost_id, cost_item in cost_data.items():
                if self._asset_cost_match(asset_data, cost_item):
                    relationship = DataRelationship(
                        relationship_id=str(uuid.uuid4()),
                        source_type="network_asset",
                        source_id=asset_id,
                        target_type="cost_item",
                        target_id=cost_id,
                        relationship_type=RelationshipType.ONE_TO_ONE,
                        strength=0.9,
                        metadata={"correlation": "asset_cost"}
                    )
                    self.relationships[relationship.relationship_id] = relationship
                    
    async def _build_temporal_relationships(self):
        """Build temporal relationships between events."""
        # Link incidents to user activities
        cybersec_data = self.data_cache["cybersecurity"]
        operational_data = self.data_cache["operational"]
        
        incidents = cybersec_data.get("security_incidents", {}).get("security_incidents", {})
        activities = operational_data.get("user_activities", {}).get("user_activities", {})
        
        for incident_id, incident_data in incidents.items():
            incident_time = datetime.fromisoformat(incident_data["created_at"])
            
            # Find activities within temporal window
            for activity_id, activity_data in activities.items():
                activity_time = datetime.fromisoformat(activity_data["timestamp"])
                time_diff = abs((incident_time - activity_time).total_seconds())
                
                if time_diff <= self.config["temporal_window_hours"] * 3600:
                    strength = max(0.1, 1.0 - (time_diff / (self.config["temporal_window_hours"] * 3600)))
                    
                    relationship = DataRelationship(
                        relationship_id=str(uuid.uuid4()),
                        source_type="security_incident",
                        source_id=incident_id,
                        target_type="user_activity",
                        target_id=activity_id,
                        relationship_type=RelationshipType.TEMPORAL,
                        strength=strength,
                        metadata={
                            "time_difference_seconds": time_diff,
                            "correlation": "temporal_proximity"
                        }
                    )
                    self.relationships[relationship.relationship_id] = relationship
                    
    async def _build_cost_relationships(self):
        """Build relationships between costs and resources."""
        financial_data = self.data_cache["financial"]
        operational_data = self.data_cache["operational"]
        
        costs = financial_data.get("cost_data", {}).get("cost_data", {})
        metrics = operational_data.get("service_metrics", {}).get("service_metrics", {})
        
        for cost_id, cost_data in costs.items():
            # Link infrastructure costs to service metrics
            if cost_data["category"] == "infrastructure":
                for metric_id, metric_data in metrics.items():
                    if self._cost_metric_correlation(cost_data, metric_data):
                        relationship = DataRelationship(
                            relationship_id=str(uuid.uuid4()),
                            source_type="cost_item",
                            source_id=cost_id,
                            target_type="service_metric",
                            target_id=metric_id,
                            relationship_type=RelationshipType.ONE_TO_MANY,
                            strength=0.7,
                            metadata={"correlation": "cost_performance"}
                        )
                        self.relationships[relationship.relationship_id] = relationship
                        
    async def _build_user_relationships(self):
        """Build relationships between users and their activities."""
        operational_data = self.data_cache["operational"]
        
        activities = operational_data.get("user_activities", {}).get("user_activities", {})
        workflows = operational_data.get("workflow_executions", {}).get("workflow_executions", {})
        
        # Group activities by user
        user_activities = defaultdict(list)
        for activity_id, activity_data in activities.items():
            user_activities[activity_data["username"]].append((activity_id, activity_data))
            
        # Link user activities to workflow executions
        for workflow_id, workflow_data in workflows.items():
            if workflow_data["triggered_by"] == "user":
                # Find user activities around workflow execution time
                workflow_time = datetime.fromisoformat(workflow_data["start_time"])
                
                for username, user_activity_list in user_activities.items():
                    for activity_id, activity_data in user_activity_list:
                        activity_time = datetime.fromisoformat(activity_data["timestamp"])
                        time_diff = abs((workflow_time - activity_time).total_seconds())
                        
                        if time_diff <= 3600:  # Within 1 hour
                            relationship = DataRelationship(
                                relationship_id=str(uuid.uuid4()),
                                source_type="user_activity",
                                source_id=activity_id,
                                target_type="workflow_execution",
                                target_id=workflow_id,
                                relationship_type=RelationshipType.ONE_TO_ONE,
                                strength=0.8,
                                metadata={"correlation": "user_workflow_trigger"}
                            )
                            self.relationships[relationship.relationship_id] = relationship
                            
    async def _build_incident_workflow_relationships(self):
        """Build relationships between incidents and response workflows."""
        cybersec_data = self.data_cache["cybersecurity"]
        operational_data = self.data_cache["operational"]
        
        incidents = cybersec_data.get("security_incidents", {}).get("security_incidents", {})
        workflows = operational_data.get("workflow_executions", {}).get("workflow_executions", {})
        
        for incident_id, incident_data in incidents.items():
            incident_time = datetime.fromisoformat(incident_data["created_at"])
            
            # Find incident response workflows
            for workflow_id, workflow_data in workflows.items():
                if "incident" in workflow_data["workflow_name"].lower() or "response" in workflow_data["workflow_name"].lower():
                    workflow_time = datetime.fromisoformat(workflow_data["start_time"])
                    time_diff = (workflow_time - incident_time).total_seconds()
                    
                    # Workflow should start after incident
                    if 0 <= time_diff <= 7200:  # Within 2 hours after incident
                        strength = max(0.3, 1.0 - (time_diff / 7200))
                        
                        relationship = DataRelationship(
                            relationship_id=str(uuid.uuid4()),
                            source_type="security_incident",
                            source_id=incident_id,
                            target_type="workflow_execution",
                            target_id=workflow_id,
                            relationship_type=RelationshipType.ONE_TO_ONE,
                            strength=strength,
                            metadata={"correlation": "incident_response"}
                        )
                        self.relationships[relationship.relationship_id] = relationship
                        
    def _assets_match(self, asset_data: Dict[str, Any], metric_data: Dict[str, Any]) -> bool:
        """Check if asset and metric data match."""
        # Simple matching based on service name and asset type
        asset_type = asset_data.get("asset_type", "").lower()
        service_name = metric_data.get("service_name", "").lower()
        
        type_service_map = {
            "web_server": "web server",
            "database": "database",
            "server": "server",
            "router": "router",
            "switch": "switch"
        }
        
        expected_service = type_service_map.get(asset_type, "")
        return expected_service in service_name
        
    def _asset_cost_match(self, asset_data: Dict[str, Any], cost_data: Dict[str, Any]) -> bool:
        """Check if asset and cost data match."""
        asset_type = asset_data.get("asset_type", "").lower()
        cost_category = cost_data.get("category", "").lower()
        
        # Map asset types to cost categories
        if asset_type in ["server", "database", "web_server"]:
            return cost_category in ["infrastructure", "hardware"]
        elif asset_type in ["router", "switch", "firewall"]:
            return cost_category in ["infrastructure", "hardware", "security_tools"]
        
        return False
        
    def _cost_metric_correlation(self, cost_data: Dict[str, Any], metric_data: Dict[str, Any]) -> bool:
        """Check if cost and metric data are correlated."""
        cost_category = cost_data.get("category", "").lower()
        service_name = metric_data.get("service_name", "").lower()
        
        # Infrastructure costs correlate with service metrics
        if cost_category == "infrastructure":
            return any(keyword in service_name for keyword in ["server", "database", "web"])
            
        return False
        
    async def _apply_consistency_rules(self):
        """Apply consistency rules to ensure data coherence."""
        logger.info("Applying consistency rules...")
        
        for rule_id, rule in self.consistency_rules.items():
            if rule.consistency_level == ConsistencyLevel.STRICT:
                await self._apply_strict_consistency(rule)
            elif rule.consistency_level == ConsistencyLevel.EVENTUAL:
                await self._apply_eventual_consistency(rule)
                
    async def _apply_strict_consistency(self, rule: ConsistencyRule):
        """Apply strict consistency rules."""
        if rule.validation_function == "validate_temporal_consistency":
            await self._fix_temporal_inconsistencies()
        elif rule.validation_function == "validate_asset_references":
            await self._fix_asset_reference_inconsistencies()
            
    async def _apply_eventual_consistency(self, rule: ConsistencyRule):
        """Apply eventual consistency rules."""
        if rule.validation_function == "validate_cost_alignment":
            await self._align_costs_with_usage()
            
    async def _fix_temporal_inconsistencies(self):
        """Fix temporal inconsistencies in the data."""
        # Ensure incident response times are logical
        cybersec_data = self.data_cache["cybersecurity"]
        incidents = cybersec_data.get("security_incidents", {}).get("security_incidents", {})
        
        for incident_id, incident_data in incidents.items():
            created_time = datetime.fromisoformat(incident_data["created_at"])
            updated_time = datetime.fromisoformat(incident_data["updated_at"])
            
            # Ensure updated_time is after created_time
            if updated_time <= created_time:
                incident_data["updated_at"] = (created_time + timedelta(minutes=random.randint(5, 60))).isoformat()
                
            # Fix timeline events
            timeline = incident_data.get("timeline", [])
            last_time = created_time
            
            for event in timeline:
                event_time = datetime.fromisoformat(event["timestamp"])
                if event_time <= last_time:
                    event["timestamp"] = (last_time + timedelta(minutes=random.randint(1, 30))).isoformat()
                    last_time = datetime.fromisoformat(event["timestamp"])
                else:
                    last_time = event_time
                    
    async def _fix_asset_reference_inconsistencies(self):
        """Fix asset reference inconsistencies."""
        # Ensure all asset references point to valid assets
        cybersec_data = self.data_cache["cybersecurity"]
        valid_assets = set(cybersec_data.get("network_topology", {}).get("assets", {}).keys())
        
        # Fix incident asset references
        incidents = cybersec_data.get("security_incidents", {}).get("security_incidents", {})
        for incident_data in incidents.values():
            affected_assets = incident_data.get("affected_assets", [])
            # Replace invalid asset references with valid ones
            incident_data["affected_assets"] = [
                asset_id if asset_id in valid_assets else random.choice(list(valid_assets))
                for asset_id in affected_assets
            ]
            
    async def _align_costs_with_usage(self):
        """Align costs with actual resource usage."""
        financial_data = self.data_cache["financial"]
        operational_data = self.data_cache["operational"]
        
        costs = financial_data.get("cost_data", {}).get("cost_data", {})
        metrics = operational_data.get("service_metrics", {}).get("service_metrics", {})
        
        # Adjust costs based on service utilization
        for cost_id, cost_data in costs.items():
            if cost_data["category"] == "cloud_services":
                # Find related metrics
                related_metrics = [
                    m for m in metrics.values()
                    if self._cost_metric_correlation(cost_data, m)
                ]
                
                if related_metrics:
                    # Adjust cost based on average utilization
                    avg_utilization = sum(m["value"] for m in related_metrics) / len(related_metrics)
                    utilization_factor = avg_utilization / 100.0  # Assuming percentage metrics
                    
                    # Adjust cost (higher utilization = higher cost)
                    original_amount = cost_data["amount"]
                    cost_data["amount"] = round(original_amount * (0.5 + 0.5 * utilization_factor), 2)
                    
    async def _validate_dataset(self) -> List[ValidationResult]:
        """Validate the entire dataset for consistency."""
        logger.info("Validating dataset consistency...")
        
        validation_results = []
        
        for rule_id, rule in self.consistency_rules.items():
            results = await self._validate_rule(rule)
            validation_results.extend(results)
            
        self.validation_results = validation_results
        return validation_results
        
    async def _validate_rule(self, rule: ConsistencyRule) -> List[ValidationResult]:
        """Validate a specific consistency rule."""
        results = []
        
        if rule.validation_function == "validate_temporal_consistency":
            results.extend(await self._validate_temporal_consistency())
        elif rule.validation_function == "validate_asset_references":
            results.extend(await self._validate_asset_references())
        elif rule.validation_function == "validate_cost_alignment":
            results.extend(await self._validate_cost_alignment())
        elif rule.validation_function == "validate_user_correlation":
            results.extend(await self._validate_user_correlation())
            
        return results
        
    async def _validate_temporal_consistency(self) -> List[ValidationResult]:
        """Validate temporal consistency."""
        results = []
        
        cybersec_data = self.data_cache["cybersecurity"]
        incidents = cybersec_data.get("security_incidents", {}).get("security_incidents", {})
        
        for incident_id, incident_data in incidents.items():
            issues = []
            
            created_time = datetime.fromisoformat(incident_data["created_at"])
            updated_time = datetime.fromisoformat(incident_data["updated_at"])
            
            if updated_time <= created_time:
                issues.append("Updated time is not after created time")
                
            # Check timeline consistency
            timeline = incident_data.get("timeline", [])
            last_time = created_time
            
            for i, event in enumerate(timeline):
                event_time = datetime.fromisoformat(event["timestamp"])
                if event_time <= last_time:
                    issues.append(f"Timeline event {i} timestamp is not sequential")
                last_time = event_time
                
            result = ValidationResult(
                validation_id=str(uuid.uuid4()),
                rule_id="temporal_consistency",
                data_type="security_incident",
                data_id=incident_id,
                is_valid=len(issues) == 0,
                issues=issues,
                severity="high" if issues else "none",
                auto_fixed=False,
                timestamp=datetime.utcnow()
            )
            
            results.append(result)
            
        return results
        
    async def _validate_asset_references(self) -> List[ValidationResult]:
        """Validate asset reference integrity."""
        results = []
        
        cybersec_data = self.data_cache["cybersecurity"]
        valid_assets = set(cybersec_data.get("network_topology", {}).get("assets", {}).keys())
        incidents = cybersec_data.get("security_incidents", {}).get("security_incidents", {})
        
        for incident_id, incident_data in incidents.items():
            issues = []
            affected_assets = incident_data.get("affected_assets", [])
            
            for asset_id in affected_assets:
                if asset_id not in valid_assets:
                    issues.append(f"Invalid asset reference: {asset_id}")
                    
            result = ValidationResult(
                validation_id=str(uuid.uuid4()),
                rule_id="asset_reference_integrity",
                data_type="security_incident",
                data_id=incident_id,
                is_valid=len(issues) == 0,
                issues=issues,
                severity="medium" if issues else "none",
                auto_fixed=False,
                timestamp=datetime.utcnow()
            )
            
            results.append(result)
            
        return results
        
    async def _validate_cost_alignment(self) -> List[ValidationResult]:
        """Validate cost alignment with usage."""
        results = []
        
        financial_data = self.data_cache["financial"]
        costs = financial_data.get("cost_data", {}).get("cost_data", {})
        
        for cost_id, cost_data in costs.items():
            issues = []
            
            # Check if cost amount is reasonable
            amount = cost_data["amount"]
            category = cost_data["category"]
            
            # Define reasonable ranges for different categories
            reasonable_ranges = {
                "infrastructure": (1000, 100000),
                "software_licenses": (100, 50000),
                "cloud_services": (500, 50000),
                "hardware": (1000, 200000)
            }
            
            if category in reasonable_ranges:
                min_amount, max_amount = reasonable_ranges[category]
                if amount < min_amount or amount > max_amount:
                    issues.append(f"Cost amount {amount} outside reasonable range for {category}")
                    
            result = ValidationResult(
                validation_id=str(uuid.uuid4()),
                rule_id="financial_cost_alignment",
                data_type="cost_item",
                data_id=cost_id,
                is_valid=len(issues) == 0,
                issues=issues,
                severity="low" if issues else "none",
                auto_fixed=False,
                timestamp=datetime.utcnow()
            )
            
            results.append(result)
            
        return results
        
    async def _validate_user_correlation(self) -> List[ValidationResult]:
        """Validate user activity correlation."""
        results = []
        
        operational_data = self.data_cache["operational"]
        activities = operational_data.get("user_activities", {}).get("user_activities", {})
        
        # Group activities by user
        user_activity_counts = defaultdict(int)
        for activity_data in activities.values():
            user_activity_counts[activity_data["username"]] += 1
            
        # Check for users with suspicious activity patterns
        for activity_id, activity_data in activities.items():
            issues = []
            username = activity_data["username"]
            
            # Check for users with too many activities (potential bot)
            if user_activity_counts[username] > 100:
                issues.append(f"User {username} has unusually high activity count")
                
            # Check for high-risk activities
            if activity_data["risk_score"] > 8.0 and activity_data["success"]:
                issues.append("High-risk activity succeeded without additional verification")
                
            result = ValidationResult(
                validation_id=str(uuid.uuid4()),
                rule_id="user_activity_correlation",
                data_type="user_activity",
                data_id=activity_id,
                is_valid=len(issues) == 0,
                issues=issues,
                severity="medium" if issues else "none",
                auto_fixed=False,
                timestamp=datetime.utcnow()
            )
            
            results.append(result)
            
        return results
        
    async def _calculate_dataset_statistics(self) -> Dict[str, Any]:
        """Calculate comprehensive dataset statistics."""
        stats = {
            "total_relationships": len(self.relationships),
            "relationship_types": {},
            "domain_coverage": {},
            "consistency_score": 0.0
        }
        
        # Count relationship types
        for relationship in self.relationships.values():
            rel_type = relationship.relationship_type.value
            stats["relationship_types"][rel_type] = stats["relationship_types"].get(rel_type, 0) + 1
            
        # Calculate domain coverage
        for domain, data in self.data_cache.items():
            domain_stats = {}
            for data_type, type_data in data.items():
                if isinstance(type_data, dict) and "count" in type_data:
                    domain_stats[data_type] = type_data["count"]
                elif isinstance(type_data, dict):
                    domain_stats[data_type] = len(type_data)
                    
            stats["domain_coverage"][domain] = domain_stats
            
        # Calculate consistency score
        if self.validation_results:
            valid_count = sum(1 for v in self.validation_results if v.is_valid)
            stats["consistency_score"] = valid_count / len(self.validation_results)
        else:
            stats["consistency_score"] = 1.0
            
        return stats


# Global data consistency engine instance
consistency_engine = DataConsistencyEngine()