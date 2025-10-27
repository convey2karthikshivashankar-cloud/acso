"""
Threat Intelligence Sharing System for ACSO Enterprise.
STIX/TAXII compatible threat intelligence feeds with federated learning.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
import hashlib
import base64
import xml.etree.ElementTree as ET
from collections import defaultdict, deque
import aiohttp
import boto3
from botocore.exceptions import ClientError
import numpy as np
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC

class ThreatIntelligenceType(str, Enum):
    """Types of threat intelligence."""
    IOC = "ioc"  # Indicators of Compromise
    TTP = "ttp"  # Tactics, Techniques, and Procedures
    CAMPAIGN = "campaign"
    ACTOR = "actor"
    MALWARE = "malware"
    VULNERABILITY = "vulnerability"
    SIGNATURE = "signature"
    YARA_RULE = "yara_rule"

class IndicatorType(str, Enum):
    """Types of indicators."""
    IP_ADDRESS = "ip"
    DOMAIN = "domain"
    URL = "url"
    FILE_HASH = "file_hash"
    EMAIL = "email"
    MUTEX = "mutex"
    REGISTRY_KEY = "registry_key"
    PROCESS_NAME = "process_name"
    USER_AGENT = "user_agent"
    CERTIFICATE = "certificate"

class ThreatLevel(str, Enum):
    """Threat levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

class SharingLevel(str, Enum):
    """Data sharing levels."""
    PUBLIC = "public"
    COMMUNITY = "community"
    ORGANIZATION = "organization"
    PRIVATE = "private"

class STIXVersion(str, Enum):
    """STIX versions supported."""
    STIX_2_0 = "2.0"
    STIX_2_1 = "2.1"

@dataclass
class ThreatIndicator:
    """Threat indicator with STIX compatibility."""
    indicator_id: str
    indicator_type: IndicatorType
    value: str
    pattern: str  # STIX pattern
    confidence: float
    threat_level: ThreatLevel
    sharing_level: SharingLevel
    source: str
    created_at: datetime
    updated_at: datetime
    valid_from: datetime
    valid_until: Optional[datetime]
    labels: List[str]
    kill_chain_phases: List[str]
    description: str
    metadata: Dict[str, Any] = field(default_factory=dict)
    stix_object: Optional[Dict[str, Any]] = None

@dataclass
class ThreatCampaign:
    """Threat campaign information."""
    campaign_id: str
    name: str
    description: str
    first_seen: datetime
    last_seen: datetime
    confidence: float
    threat_actors: List[str]
    malware_families: List[str]
    targeted_sectors: List[str]
    targeted_countries: List[str]
    ttps: List[str]
    indicators: List[str]
    sharing_level: SharingLevel
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ThreatActor:
    """Threat actor profile."""
    actor_id: str
    name: str
    aliases: List[str]
    description: str
    sophistication: str
    motivation: List[str]
    resource_level: str
    primary_motivation: str
    goals: List[str]
    first_seen: datetime
    last_seen: datetime
    confidence: float
    sharing_level: SharingLevel
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ThreatIntelligenceFeed:
    """Threat intelligence feed configuration."""
    feed_id: str
    name: str
    description: str
    feed_type: str  # stix, taxii, json, xml, csv
    url: str
    authentication: Dict[str, Any]
    update_frequency: int  # minutes
    enabled: bool
    last_updated: Optional[datetime]
    sharing_level: SharingLevel
    trust_score: float
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class FederatedLearningModel:
    """Federated learning model for threat intelligence."""
    model_id: str
    model_type: str
    version: str
    created_at: datetime
    updated_at: datetime
    participants: List[str]
    performance_metrics: Dict[str, float]
    model_weights: Optional[bytes]
    sharing_level: SharingLevel
    metadata: Dict[str, Any] = field(default_factory=dict)

class STIXGenerator:
    """STIX object generator for threat intelligence."""
    
    def __init__(self, version: STIXVersion = STIXVersion.STIX_2_1):
        self.version = version
        self.namespace = "acso-enterprise"
    
    def create_indicator(self, threat_indicator: ThreatIndicator) -> Dict[str, Any]:
        """Create STIX indicator object."""
        stix_indicator = {
            "type": "indicator",
            "spec_version": self.version.value,
            "id": f"indicator--{threat_indicator.indicator_id}",
            "created": threat_indicator.created_at.isoformat() + "Z",
            "modified": threat_indicator.updated_at.isoformat() + "Z",
            "pattern": threat_indicator.pattern,
            "labels": threat_indicator.labels,
            "confidence": int(threat_indicator.confidence * 100),
            "valid_from": threat_indicator.valid_from.isoformat() + "Z"
        }
        
        if threat_indicator.valid_until:
            stix_indicator["valid_until"] = threat_indicator.valid_until.isoformat() + "Z"
        
        if threat_indicator.description:
            stix_indicator["description"] = threat_indicator.description
        
        if threat_indicator.kill_chain_phases:
            stix_indicator["kill_chain_phases"] = [
                {
                    "kill_chain_name": "mitre-attack",
                    "phase_name": phase
                }
                for phase in threat_indicator.kill_chain_phases
            ]
        
        return stix_indicator
    
    def create_malware(self, name: str, labels: List[str], description: str = "") -> Dict[str, Any]:
        """Create STIX malware object."""
        malware_id = str(uuid.uuid4())
        return {
            "type": "malware",
            "spec_version": self.version.value,
            "id": f"malware--{malware_id}",
            "created": datetime.utcnow().isoformat() + "Z",
            "modified": datetime.utcnow().isoformat() + "Z",
            "name": name,
            "labels": labels,
            "description": description
        }
    
    def create_threat_actor(self, threat_actor: ThreatActor) -> Dict[str, Any]:
        """Create STIX threat actor object."""
        return {
            "type": "threat-actor",
            "spec_version": self.version.value,
            "id": f"threat-actor--{threat_actor.actor_id}",
            "created": threat_actor.first_seen.isoformat() + "Z",
            "modified": threat_actor.last_seen.isoformat() + "Z",
            "name": threat_actor.name,
            "labels": ["hacker"],  # Default label
            "aliases": threat_actor.aliases,
            "description": threat_actor.description,
            "sophistication": threat_actor.sophistication,
            "resource_level": threat_actor.resource_level,
            "primary_motivation": threat_actor.primary_motivation,
            "goals": threat_actor.goals
        }
    
    def create_campaign(self, threat_campaign: ThreatCampaign) -> Dict[str, Any]:
        """Create STIX campaign object."""
        return {
            "type": "campaign",
            "spec_version": self.version.value,
            "id": f"campaign--{threat_campaign.campaign_id}",
            "created": threat_campaign.first_seen.isoformat() + "Z",
            "modified": threat_campaign.last_seen.isoformat() + "Z",
            "name": threat_campaign.name,
            "description": threat_campaign.description,
            "first_seen": threat_campaign.first_seen.isoformat() + "Z",
            "last_seen": threat_campaign.last_seen.isoformat() + "Z"
        }
    
    def create_bundle(self, objects: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Create STIX bundle containing multiple objects."""
        return {
            "type": "bundle",
            "id": f"bundle--{uuid.uuid4()}",
            "spec_version": self.version.value,
            "objects": objects
        }

class TAXIIClient:
    """TAXII 2.1 client for threat intelligence sharing."""
    
    def __init__(self, server_url: str, username: str = None, password: str = None):
        self.server_url = server_url.rstrip('/')
        self.username = username
        self.password = password
        self.session: Optional[aiohttp.ClientSession] = None
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self) -> None:
        """Initialize TAXII client."""
        auth = None
        if self.username and self.password:
            auth = aiohttp.BasicAuth(self.username, self.password)
        
        self.session = aiohttp.ClientSession(
            auth=auth,
            headers={
                "Accept": "application/taxii+json;version=2.1",
                "Content-Type": "application/taxii+json;version=2.1"
            },
            timeout=aiohttp.ClientTimeout(total=30)
        )
    
    async def cleanup(self) -> None:
        """Cleanup TAXII client."""
        if self.session:
            await self.session.close()
    
    async def get_discovery(self) -> Dict[str, Any]:
        """Get TAXII server discovery information."""
        url = f"{self.server_url}/taxii2/"
        async with self.session.get(url) as response:
            if response.status == 200:
                return await response.json()
            else:
                raise Exception(f"TAXII discovery failed: {response.status}")
    
    async def get_api_roots(self) -> List[Dict[str, Any]]:
        """Get available API roots."""
        discovery = await self.get_discovery()
        api_roots = []
        
        for api_root_url in discovery.get("api_roots", []):
            async with self.session.get(api_root_url) as response:
                if response.status == 200:
                    api_roots.append(await response.json())
        
        return api_roots
    
    async def get_collections(self, api_root_url: str) -> List[Dict[str, Any]]:
        """Get collections from an API root."""
        url = f"{api_root_url}/collections/"
        async with self.session.get(url) as response:
            if response.status == 200:
                data = await response.json()
                return data.get("collections", [])
            else:
                raise Exception(f"Failed to get collections: {response.status}")
    
    async def get_objects(
        self,
        api_root_url: str,
        collection_id: str,
        added_after: Optional[datetime] = None,
        limit: int = 100
    ) -> List[Dict[str, Any]]:
        """Get objects from a collection."""
        url = f"{api_root_url}/collections/{collection_id}/objects/"
        params = {"limit": limit}
        
        if added_after:
            params["added_after"] = added_after.isoformat() + "Z"
        
        async with self.session.get(url, params=params) as response:
            if response.status == 200:
                data = await response.json()
                return data.get("objects", [])
            else:
                raise Exception(f"Failed to get objects: {response.status}")
    
    async def add_objects(
        self,
        api_root_url: str,
        collection_id: str,
        objects: List[Dict[str, Any]]
    ) -> Dict[str, Any]:
        """Add objects to a collection."""
        url = f"{api_root_url}/collections/{collection_id}/objects/"
        bundle = {
            "type": "bundle",
            "id": f"bundle--{uuid.uuid4()}",
            "objects": objects
        }
        
        async with self.session.post(url, json=bundle) as response:
            if response.status in [200, 202]:
                return await response.json()
            else:
                raise Exception(f"Failed to add objects: {response.status}")

class ThreatIntelligenceSharingSystem:
    """
    Comprehensive threat intelligence sharing system.
    
    Features:
    - STIX/TAXII 2.1 compatible threat intelligence feeds
    - Federated learning across tenants with privacy preservation
    - Predictive threat modeling using shared intelligence
    - Real-time threat intelligence distribution
    - Privacy-preserving threat intelligence sharing
    - Automated IOC enrichment and validation
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Core components
        self.indicators: Dict[str, ThreatIndicator] = {}
        self.campaigns: Dict[str, ThreatCampaign] = {}
        self.actors: Dict[str, ThreatActor] = {}
        self.feeds: Dict[str, ThreatIntelligenceFeed] = {}
        self.federated_models: Dict[str, FederatedLearningModel] = {}
        
        # STIX/TAXII components
        self.stix_generator = STIXGenerator()
        self.taxii_clients: Dict[str, TAXIIClient] = {}
        
        # Sharing and privacy
        self.encryption_key: Optional[bytes] = None
        self.sharing_policies: Dict[str, Dict[str, Any]] = {}
        self.tenant_permissions: Dict[str, Set[str]] = defaultdict(set)
        
        # Processing queues
        self.intelligence_queue: asyncio.Queue = asyncio.Queue()
        self.sharing_queue: asyncio.Queue = asyncio.Queue()
        self.enrichment_queue: asyncio.Queue = asyncio.Queue()
        
        # Background tasks
        self.processing_tasks: List[asyncio.Task] = []
        self.system_active = False
    
    async def initialize(self) -> None:
        """Initialize the threat intelligence sharing system."""
        try:
            self.logger.info("Initializing Threat Intelligence Sharing System")
            
            # Generate encryption key for privacy-preserving sharing
            self._generate_encryption_key()
            
            # Load default sharing policies
            await self._load_sharing_policies()
            
            # Initialize threat intelligence feeds
            await self._initialize_feeds()
            
            # Start background processing
            self.system_active = True
            self.processing_tasks = [
                asyncio.create_task(self._intelligence_processor()),
                asyncio.create_task(self._sharing_processor()),
                asyncio.create_task(self._enrichment_processor()),
                asyncio.create_task(self._feed_updater()),
                asyncio.create_task(self._federated_learning_coordinator())
            ]
            
            self.logger.info("Threat Intelligence Sharing System initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Threat Intelligence Sharing System: {e}")
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the threat intelligence sharing system."""
        try:
            self.logger.info("Shutting down Threat Intelligence Sharing System")
            
            self.system_active = False
            
            # Cancel background tasks
            for task in self.processing_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            # Cleanup TAXII clients
            for client in self.taxii_clients.values():
                await client.cleanup()
            
            self.logger.info("Threat Intelligence Sharing System shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
    
    async def add_threat_indicator(
        self,
        indicator: ThreatIndicator,
        tenant_id: str,
        auto_share: bool = True
    ) -> str:
        """Add a threat indicator to the system."""
        try:
            # Generate STIX object
            indicator.stix_object = self.stix_generator.create_indicator(indicator)
            
            # Store indicator
            self.indicators[indicator.indicator_id] = indicator
            
            # Queue for enrichment
            await self.enrichment_queue.put({
                "type": "indicator",
                "id": indicator.indicator_id,
                "tenant_id": tenant_id
            })
            
            # Queue for sharing if auto-share is enabled
            if auto_share and self._can_share_indicator(indicator, tenant_id):
                await self.sharing_queue.put({
                    "type": "indicator",
                    "id": indicator.indicator_id,
                    "tenant_id": tenant_id,
                    "sharing_level": indicator.sharing_level.value
                })
            
            self.logger.info(f"Added threat indicator: {indicator.indicator_id}")
            return indicator.indicator_id
            
        except Exception as e:
            self.logger.error(f"Failed to add threat indicator: {e}")
            raise
    
    async def get_threat_intelligence(
        self,
        tenant_id: str,
        indicator_types: Optional[List[IndicatorType]] = None,
        threat_levels: Optional[List[ThreatLevel]] = None,
        since: Optional[datetime] = None,
        limit: int = 1000
    ) -> Dict[str, Any]:
        """Get threat intelligence for a tenant."""
        try:
            # Filter indicators based on permissions and criteria
            filtered_indicators = []
            
            for indicator in self.indicators.values():
                # Check permissions
                if not self._has_access_to_indicator(tenant_id, indicator):
                    continue
                
                # Apply filters
                if indicator_types and indicator.indicator_type not in indicator_types:
                    continue
                
                if threat_levels and indicator.threat_level not in threat_levels:
                    continue
                
                if since and indicator.updated_at < since:
                    continue
                
                filtered_indicators.append(indicator)
            
            # Sort by updated_at descending and limit
            filtered_indicators.sort(key=lambda x: x.updated_at, reverse=True)
            filtered_indicators = filtered_indicators[:limit]
            
            # Convert to STIX format
            stix_objects = []
            for indicator in filtered_indicators:
                if indicator.stix_object:
                    stix_objects.append(indicator.stix_object)
            
            # Create STIX bundle
            bundle = self.stix_generator.create_bundle(stix_objects)
            
            return {
                "bundle": bundle,
                "total_indicators": len(filtered_indicators),
                "tenant_id": tenant_id,
                "generated_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get threat intelligence: {e}")
            return {"error": str(e)}
    
    async def share_intelligence_with_community(
        self,
        tenant_id: str,
        intelligence_ids: List[str],
        sharing_level: SharingLevel = SharingLevel.COMMUNITY
    ) -> Dict[str, Any]:
        """Share threat intelligence with the community."""
        try:
            shared_objects = []
            
            for intel_id in intelligence_ids:
                # Get intelligence object
                indicator = self.indicators.get(intel_id)
                if not indicator:
                    continue
                
                # Check sharing permissions
                if not self._can_share_indicator(indicator, tenant_id):
                    continue
                
                # Update sharing level
                indicator.sharing_level = sharing_level
                indicator.updated_at = datetime.utcnow()
                
                # Add to shared objects
                if indicator.stix_object:
                    shared_objects.append(indicator.stix_object)
            
            # Distribute to TAXII servers
            distribution_results = await self._distribute_to_taxii_servers(shared_objects)
            
            # Update federated learning models
            await self._update_federated_models(shared_objects, tenant_id)
            
            return {
                "shared_objects": len(shared_objects),
                "distribution_results": distribution_results,
                "sharing_level": sharing_level.value,
                "shared_at": datetime.utcnow().isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to share intelligence with community: {e}")
            return {"error": str(e)}
    
    async def get_predictive_threats(
        self,
        tenant_id: str,
        prediction_horizon_days: int = 7,
        confidence_threshold: float = 0.7
    ) -> Dict[str, Any]:
        """Get predictive threat intelligence using federated learning models."""
        try:
            predictions = []
            
            # Get tenant's historical data
            tenant_indicators = [
                indicator for indicator in self.indicators.values()
                if self._has_access_to_indicator(tenant_id, indicator)
            ]
            
            # Use federated learning models for prediction
            for model in self.federated_models.values():
                if model.sharing_level in [SharingLevel.PUBLIC, SharingLevel.COMMUNITY]:
                    # Generate predictions using the model
                    model_predictions = await self._generate_predictions_with_model(
                        model,
                        tenant_indicators,
                        prediction_horizon_days
                    )
                    
                    # Filter by confidence threshold
                    high_confidence_predictions = [
                        pred for pred in model_predictions
                        if pred["confidence"] >= confidence_threshold
                    ]
                    
                    predictions.extend(high_confidence_predictions)
            
            # Deduplicate and rank predictions
            unique_predictions = self._deduplicate_predictions(predictions)
            ranked_predictions = sorted(
                unique_predictions,
                key=lambda x: x["confidence"],
                reverse=True
            )
            
            return {
                "predictions": ranked_predictions[:50],  # Top 50 predictions
                "prediction_horizon_days": prediction_horizon_days,
                "confidence_threshold": confidence_threshold,
                "generated_at": datetime.utcnow().isoformat(),
                "model_count": len(self.federated_models)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get predictive threats: {e}")
            return {"error": str(e)}
    
    async def add_threat_feed(
        self,
        feed_config: ThreatIntelligenceFeed,
        tenant_id: str
    ) -> str:
        """Add a threat intelligence feed."""
        try:
            # Validate feed configuration
            await self._validate_feed_config(feed_config)
            
            # Store feed
            self.feeds[feed_config.feed_id] = feed_config
            
            # Initialize TAXII client if needed
            if feed_config.feed_type == "taxii":
                client = TAXIIClient(
                    feed_config.url,
                    feed_config.authentication.get("username"),
                    feed_config.authentication.get("password")
                )
                await client.initialize()
                self.taxii_clients[feed_config.feed_id] = client
            
            self.logger.info(f"Added threat intelligence feed: {feed_config.name}")
            return feed_config.feed_id
            
        except Exception as e:
            self.logger.error(f"Failed to add threat feed: {e}")
            raise
    
    async def get_sharing_statistics(
        self,
        tenant_id: Optional[str] = None,
        time_period_days: int = 30
    ) -> Dict[str, Any]:
        """Get threat intelligence sharing statistics."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=time_period_days)
            
            # Filter indicators by time period
            period_indicators = [
                indicator for indicator in self.indicators.values()
                if start_date <= indicator.created_at <= end_date
            ]
            
            if tenant_id:
                # Filter by tenant access
                period_indicators = [
                    indicator for indicator in period_indicators
                    if self._has_access_to_indicator(tenant_id, indicator)
                ]
            
            # Calculate statistics
            total_indicators = len(period_indicators)
            
            # Sharing level distribution
            sharing_distribution = defaultdict(int)
            for indicator in period_indicators:
                sharing_distribution[indicator.sharing_level.value] += 1
            
            # Indicator type distribution
            type_distribution = defaultdict(int)
            for indicator in period_indicators:
                type_distribution[indicator.indicator_type.value] += 1
            
            # Threat level distribution
            threat_distribution = defaultdict(int)
            for indicator in period_indicators:
                threat_distribution[indicator.threat_level.value] += 1
            
            # Source distribution
            source_distribution = defaultdict(int)
            for indicator in period_indicators:
                source_distribution[indicator.source] += 1
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": time_period_days
                },
                "overview": {
                    "total_indicators": total_indicators,
                    "active_feeds": len([f for f in self.feeds.values() if f.enabled]),
                    "federated_models": len(self.federated_models),
                    "taxii_connections": len(self.taxii_clients)
                },
                "distributions": {
                    "sharing_levels": dict(sharing_distribution),
                    "indicator_types": dict(type_distribution),
                    "threat_levels": dict(threat_distribution),
                    "sources": dict(source_distribution)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get sharing statistics: {e}")
            return {"error": str(e)}</parameter>
</invoke>    
 
   # Private methods
    def _generate_encryption_key(self) -> None:
        """Generate encryption key for privacy-preserving sharing."""
        try:
            password = b"acso_threat_intelligence_sharing"
            salt = b"acso_salt_2024"
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            self.encryption_key = base64.urlsafe_b64encode(kdf.derive(password))
            
        except Exception as e:
            self.logger.error(f"Failed to generate encryption key: {e}")
    
    async def _load_sharing_policies(self) -> None:
        """Load default sharing policies."""
        try:
            # Default sharing policies
            self.sharing_policies = {
                "default": {
                    "auto_share_public": True,
                    "auto_share_community": False,
                    "require_approval_for_private": True,
                    "max_sharing_level": SharingLevel.COMMUNITY.value,
                    "allowed_indicator_types": [t.value for t in IndicatorType],
                    "retention_days": 365
                },
                "enterprise": {
                    "auto_share_public": True,
                    "auto_share_community": True,
                    "require_approval_for_private": False,
                    "max_sharing_level": SharingLevel.PUBLIC.value,
                    "allowed_indicator_types": [t.value for t in IndicatorType],
                    "retention_days": 730
                }
            }
            
            self.logger.info("Loaded sharing policies")
            
        except Exception as e:
            self.logger.error(f"Failed to load sharing policies: {e}")
    
    async def _initialize_feeds(self) -> None:
        """Initialize default threat intelligence feeds."""
        try:
            # Sample MISP feed
            misp_feed = ThreatIntelligenceFeed(
                feed_id="misp_public",
                name="MISP Public Feed",
                description="Public MISP threat intelligence feed",
                feed_type="json",
                url="https://misp.public.feed/events.json",
                authentication={},
                update_frequency=60,  # 1 hour
                enabled=True,
                last_updated=None,
                sharing_level=SharingLevel.PUBLIC,
                trust_score=0.8
            )
            
            # Sample TAXII feed
            taxii_feed = ThreatIntelligenceFeed(
                feed_id="taxii_community",
                name="Community TAXII Feed",
                description="Community threat intelligence via TAXII",
                feed_type="taxii",
                url="https://taxii.community.feed/taxii2/",
                authentication={
                    "username": "community_user",
                    "password": "community_pass"
                },
                update_frequency=30,  # 30 minutes
                enabled=True,
                last_updated=None,
                sharing_level=SharingLevel.COMMUNITY,
                trust_score=0.9
            )
            
            # Store feeds
            self.feeds[misp_feed.feed_id] = misp_feed
            self.feeds[taxii_feed.feed_id] = taxii_feed
            
            self.logger.info("Initialized default threat intelligence feeds")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize feeds: {e}")
    
    def _can_share_indicator(self, indicator: ThreatIndicator, tenant_id: str) -> bool:
        """Check if an indicator can be shared by a tenant."""
        try:
            # Get tenant's sharing policy
            policy = self.sharing_policies.get(tenant_id, self.sharing_policies["default"])
            
            # Check sharing level permissions
            max_level = SharingLevel(policy["max_sharing_level"])
            sharing_levels_order = [
                SharingLevel.PRIVATE,
                SharingLevel.ORGANIZATION,
                SharingLevel.COMMUNITY,
                SharingLevel.PUBLIC
            ]
            
            if sharing_levels_order.index(indicator.sharing_level) > sharing_levels_order.index(max_level):
                return False
            
            # Check indicator type permissions
            if indicator.indicator_type.value not in policy["allowed_indicator_types"]:
                return False
            
            # Check auto-sharing settings
            if indicator.sharing_level == SharingLevel.PUBLIC and not policy["auto_share_public"]:
                return False
            
            if indicator.sharing_level == SharingLevel.COMMUNITY and not policy["auto_share_community"]:
                return False
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to check sharing permissions: {e}")
            return False
    
    def _has_access_to_indicator(self, tenant_id: str, indicator: ThreatIndicator) -> bool:
        """Check if a tenant has access to an indicator."""
        try:
            # Public indicators are accessible to all
            if indicator.sharing_level == SharingLevel.PUBLIC:
                return True
            
            # Community indicators require community membership
            if indicator.sharing_level == SharingLevel.COMMUNITY:
                return tenant_id in self.tenant_permissions.get("community", set())
            
            # Organization indicators require organization membership
            if indicator.sharing_level == SharingLevel.ORGANIZATION:
                return tenant_id in self.tenant_permissions.get("organization", set())
            
            # Private indicators require explicit permission
            if indicator.sharing_level == SharingLevel.PRIVATE:
                return tenant_id in self.tenant_permissions.get(indicator.indicator_id, set())
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to check indicator access: {e}")
            return False
    
    async def _distribute_to_taxii_servers(self, stix_objects: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Distribute STIX objects to TAXII servers."""
        try:
            results = {}
            
            for feed_id, client in self.taxii_clients.items():
                try:
                    # Get API roots
                    api_roots = await client.get_api_roots()
                    
                    if api_roots:
                        api_root_url = api_roots[0]["url"]  # Use first API root
                        
                        # Get collections
                        collections = await client.get_collections(api_root_url)
                        
                        if collections:
                            collection_id = collections[0]["id"]  # Use first collection
                            
                            # Add objects
                            result = await client.add_objects(api_root_url, collection_id, stix_objects)
                            results[feed_id] = {
                                "success": True,
                                "objects_added": len(stix_objects),
                                "response": result
                            }
                        else:
                            results[feed_id] = {
                                "success": False,
                                "error": "No collections available"
                            }
                    else:
                        results[feed_id] = {
                            "success": False,
                            "error": "No API roots available"
                        }
                        
                except Exception as e:
                    results[feed_id] = {
                        "success": False,
                        "error": str(e)
                    }
            
            return results
            
        except Exception as e:
            self.logger.error(f"Failed to distribute to TAXII servers: {e}")
            return {"error": str(e)}
    
    async def _update_federated_models(self, stix_objects: List[Dict[str, Any]], tenant_id: str) -> None:
        """Update federated learning models with new intelligence."""
        try:
            # Extract features from STIX objects
            features = self._extract_features_from_stix(stix_objects)
            
            if features:
                # Update existing models or create new ones
                for model_type in ["ioc_classifier", "threat_predictor", "campaign_detector"]:
                    model_id = f"{model_type}_federated"
                    
                    if model_id in self.federated_models:
                        # Update existing model
                        await self._update_federated_model(model_id, features, tenant_id)
                    else:
                        # Create new model
                        await self._create_federated_model(model_id, model_type, features, tenant_id)
            
        except Exception as e:
            self.logger.error(f"Failed to update federated models: {e}")
    
    def _extract_features_from_stix(self, stix_objects: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Extract features from STIX objects for machine learning."""
        try:
            features = []
            
            for obj in stix_objects:
                if obj.get("type") == "indicator":
                    feature = {
                        "type": "indicator",
                        "pattern_length": len(obj.get("pattern", "")),
                        "confidence": obj.get("confidence", 0),
                        "labels": obj.get("labels", []),
                        "kill_chain_phases": len(obj.get("kill_chain_phases", [])),
                        "has_description": bool(obj.get("description")),
                        "created_timestamp": obj.get("created", ""),
                        "pattern_complexity": self._calculate_pattern_complexity(obj.get("pattern", ""))
                    }
                    features.append(feature)
                
                elif obj.get("type") == "malware":
                    feature = {
                        "type": "malware",
                        "name_length": len(obj.get("name", "")),
                        "labels": obj.get("labels", []),
                        "has_description": bool(obj.get("description")),
                        "is_family": obj.get("is_family", False)
                    }
                    features.append(feature)
            
            return features
            
        except Exception as e:
            self.logger.error(f"Failed to extract features from STIX: {e}")
            return []
    
    def _calculate_pattern_complexity(self, pattern: str) -> float:
        """Calculate complexity score for a STIX pattern."""
        try:
            if not pattern:
                return 0.0
            
            # Simple complexity metrics
            complexity = 0.0
            
            # Length factor
            complexity += len(pattern) / 1000.0
            
            # Operator count
            operators = ["AND", "OR", "NOT", "LIKE", "MATCHES"]
            for op in operators:
                complexity += pattern.count(op) * 0.1
            
            # Bracket nesting
            complexity += pattern.count("(") * 0.05
            
            return min(complexity, 1.0)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate pattern complexity: {e}")
            return 0.0
    
    async def _generate_predictions_with_model(
        self,
        model: FederatedLearningModel,
        tenant_indicators: List[ThreatIndicator],
        horizon_days: int
    ) -> List[Dict[str, Any]]:
        """Generate predictions using a federated learning model."""
        try:
            predictions = []
            
            # Simple prediction logic (in production, this would use actual ML models)
            current_time = datetime.utcnow()
            
            # Analyze recent trends
            recent_indicators = [
                indicator for indicator in tenant_indicators
                if (current_time - indicator.created_at).days <= 7
            ]
            
            if recent_indicators:
                # Predict based on recent activity patterns
                threat_types = defaultdict(int)
                for indicator in recent_indicators:
                    for label in indicator.labels:
                        threat_types[label] += 1
                
                # Generate predictions for top threat types
                for threat_type, count in threat_types.items():
                    if count >= 2:  # Minimum threshold
                        confidence = min(count / 10.0, 0.95)  # Scale confidence
                        
                        prediction = {
                            "threat_type": threat_type,
                            "confidence": confidence,
                            "predicted_timeframe": f"next_{horizon_days}_days",
                            "indicators_count": count,
                            "model_id": model.model_id,
                            "prediction_date": current_time.isoformat()
                        }
                        predictions.append(prediction)
            
            return predictions
            
        except Exception as e:
            self.logger.error(f"Failed to generate predictions: {e}")
            return []
    
    def _deduplicate_predictions(self, predictions: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Deduplicate and merge similar predictions."""
        try:
            # Group by threat type
            grouped = defaultdict(list)
            for pred in predictions:
                grouped[pred["threat_type"]].append(pred)
            
            # Merge predictions for each threat type
            unique_predictions = []
            for threat_type, preds in grouped.items():
                if len(preds) == 1:
                    unique_predictions.append(preds[0])
                else:
                    # Merge multiple predictions
                    merged = {
                        "threat_type": threat_type,
                        "confidence": max(p["confidence"] for p in preds),
                        "predicted_timeframe": preds[0]["predicted_timeframe"],
                        "indicators_count": sum(p["indicators_count"] for p in preds),
                        "model_count": len(preds),
                        "prediction_date": max(p["prediction_date"] for p in preds)
                    }
                    unique_predictions.append(merged)
            
            return unique_predictions
            
        except Exception as e:
            self.logger.error(f"Failed to deduplicate predictions: {e}")
            return predictions
    
    async def _validate_feed_config(self, feed_config: ThreatIntelligenceFeed) -> None:
        """Validate threat intelligence feed configuration."""
        try:
            # Validate URL
            if not feed_config.url.startswith(("http://", "https://")):
                raise ValueError("Feed URL must be HTTP or HTTPS")
            
            # Validate feed type
            valid_types = ["stix", "taxii", "json", "xml", "csv"]
            if feed_config.feed_type not in valid_types:
                raise ValueError(f"Feed type must be one of: {valid_types}")
            
            # Validate update frequency
            if feed_config.update_frequency < 5:
                raise ValueError("Update frequency must be at least 5 minutes")
            
            # Validate trust score
            if not 0.0 <= feed_config.trust_score <= 1.0:
                raise ValueError("Trust score must be between 0.0 and 1.0")
            
        except Exception as e:
            self.logger.error(f"Feed configuration validation failed: {e}")
            raise
    
    async def _create_federated_model(
        self,
        model_id: str,
        model_type: str,
        initial_features: List[Dict[str, Any]],
        tenant_id: str
    ) -> None:
        """Create a new federated learning model."""
        try:
            model = FederatedLearningModel(
                model_id=model_id,
                model_type=model_type,
                version="1.0",
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                participants=[tenant_id],
                performance_metrics={"accuracy": 0.0, "precision": 0.0, "recall": 0.0},
                model_weights=None,  # Would contain actual model weights
                sharing_level=SharingLevel.COMMUNITY
            )
            
            self.federated_models[model_id] = model
            
            self.logger.info(f"Created federated learning model: {model_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to create federated model: {e}")
    
    async def _update_federated_model(
        self,
        model_id: str,
        features: List[Dict[str, Any]],
        tenant_id: str
    ) -> None:
        """Update an existing federated learning model."""
        try:
            model = self.federated_models.get(model_id)
            if not model:
                return
            
            # Add tenant to participants if not already included
            if tenant_id not in model.participants:
                model.participants.append(tenant_id)
            
            # Update model (simplified - in production would use actual ML algorithms)
            model.updated_at = datetime.utcnow()
            
            # Simulate performance improvement
            current_accuracy = model.performance_metrics.get("accuracy", 0.0)
            improvement = len(features) * 0.001  # Small improvement per feature
            model.performance_metrics["accuracy"] = min(current_accuracy + improvement, 0.99)
            
            self.logger.info(f"Updated federated learning model: {model_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to update federated model: {e}")
    
    # Background task methods
    async def _intelligence_processor(self) -> None:
        """Process incoming threat intelligence."""
        while self.system_active:
            try:
                # Get next intelligence item from queue
                intel_item = await asyncio.wait_for(
                    self.intelligence_queue.get(),
                    timeout=1.0
                )
                
                # Process based on type
                if intel_item["type"] == "indicator":
                    await self._process_indicator(intel_item)
                elif intel_item["type"] == "campaign":
                    await self._process_campaign(intel_item)
                elif intel_item["type"] == "actor":
                    await self._process_actor(intel_item)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error(f"Error in intelligence processor: {e}")
                await asyncio.sleep(5)
    
    async def _sharing_processor(self) -> None:
        """Process threat intelligence sharing requests."""
        while self.system_active:
            try:
                # Get next sharing request from queue
                sharing_item = await asyncio.wait_for(
                    self.sharing_queue.get(),
                    timeout=1.0
                )
                
                # Process sharing request
                await self._process_sharing_request(sharing_item)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error(f"Error in sharing processor: {e}")
                await asyncio.sleep(5)
    
    async def _enrichment_processor(self) -> None:
        """Process threat intelligence enrichment."""
        while self.system_active:
            try:
                # Get next enrichment request from queue
                enrichment_item = await asyncio.wait_for(
                    self.enrichment_queue.get(),
                    timeout=1.0
                )
                
                # Process enrichment
                await self._process_enrichment(enrichment_item)
                
            except asyncio.TimeoutError:
                continue
            except Exception as e:
                self.logger.error(f"Error in enrichment processor: {e}")
                await asyncio.sleep(5)
    
    async def _feed_updater(self) -> None:
        """Update threat intelligence feeds."""
        while self.system_active:
            try:
                current_time = datetime.utcnow()
                
                for feed in self.feeds.values():
                    if not feed.enabled:
                        continue
                    
                    # Check if update is needed
                    if (feed.last_updated is None or
                        (current_time - feed.last_updated).total_seconds() >= feed.update_frequency * 60):
                        
                        await self._update_feed(feed)
                
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                self.logger.error(f"Error in feed updater: {e}")
                await asyncio.sleep(600)
    
    async def _federated_learning_coordinator(self) -> None:
        """Coordinate federated learning across tenants."""
        while self.system_active:
            try:
                # Update federated models periodically
                for model in self.federated_models.values():
                    if len(model.participants) >= 2:  # Minimum participants for federated learning
                        await self._coordinate_federated_training(model)
                
                await asyncio.sleep(3600)  # Coordinate every hour
                
            except Exception as e:
                self.logger.error(f"Error in federated learning coordinator: {e}")
                await asyncio.sleep(1800)
    
    async def _process_indicator(self, intel_item: Dict[str, Any]) -> None:
        """Process a threat indicator."""
        try:
            # In production, this would perform various processing tasks
            self.logger.info(f"Processed indicator: {intel_item['id']}")
            
        except Exception as e:
            self.logger.error(f"Failed to process indicator: {e}")
    
    async def _process_sharing_request(self, sharing_item: Dict[str, Any]) -> None:
        """Process a sharing request."""
        try:
            # In production, this would handle the actual sharing logic
            self.logger.info(f"Processed sharing request for: {sharing_item['id']}")
            
        except Exception as e:
            self.logger.error(f"Failed to process sharing request: {e}")
    
    async def _process_enrichment(self, enrichment_item: Dict[str, Any]) -> None:
        """Process enrichment for threat intelligence."""
        try:
            # In production, this would enrich intelligence with additional context
            self.logger.info(f"Processed enrichment for: {enrichment_item['id']}")
            
        except Exception as e:
            self.logger.error(f"Failed to process enrichment: {e}")
    
    async def _update_feed(self, feed: ThreatIntelligenceFeed) -> None:
        """Update a threat intelligence feed."""
        try:
            if feed.feed_type == "taxii":
                client = self.taxii_clients.get(feed.feed_id)
                if client:
                    # Get new objects from TAXII server
                    api_roots = await client.get_api_roots()
                    if api_roots:
                        # Process new intelligence
                        pass
            
            # Update last updated timestamp
            feed.last_updated = datetime.utcnow()
            
            self.logger.info(f"Updated feed: {feed.name}")
            
        except Exception as e:
            self.logger.error(f"Failed to update feed {feed.name}: {e}")
    
    async def _coordinate_federated_training(self, model: FederatedLearningModel) -> None:
        """Coordinate federated training for a model."""
        try:
            # In production, this would coordinate actual federated learning
            self.logger.info(f"Coordinated federated training for model: {model.model_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to coordinate federated training: {e}")</parameter>
</invoke>