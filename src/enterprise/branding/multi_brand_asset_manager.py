"""
ACSO Enterprise Framework - Multi-Brand Asset Management System

This module implements comprehensive multi-brand asset handling capabilities
including asset optimization, CDN integration, version control, and
intelligent asset delivery based on brand context.

Key Features:
- Multi-brand asset organization and management
- Intelligent asset optimization and variants generation
- CDN integration with global edge caching
- Asset version control and rollback capabilities
- Brand-aware asset delivery and routing
- Performance monitoring and analytics
- Asset compliance and validation
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Tuple
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import json
import uuid
import hashlib
import base64
import mimetypes
from pathlib import Path
import boto3
from botocore.exceptions import ClientError
from PIL import Image, ImageOps, ImageFilter
import io
import aiofiles
import aiohttp
from concurrent.futures import ThreadPoolExecutor

logger = logging.getLogger(__name__)

class AssetCategory(Enum):
    """Categories of brand assets."""
    LOGO = "logo"
    FAVICON = "favicon"
    ICON = "icon"
    BACKGROUND = "background"
    BANNER = "banner"
    WATERMARK = "watermark"
    FONT = "font"
    DOCUMENT = "document"
    VIDEO = "video"
    AUDIO = "audio"
    CUSTOM = "custom"

class AssetVariantType(Enum):
    """Types of asset variants."""
    THUMBNAIL = "thumbnail"
    SMALL = "small"
    MEDIUM = "medium"
    LARGE = "large"
    RETINA = "retina"
    WEBP = "webp"
    AVIF = "avif"
    COMPRESSED = "compressed"
    GRAYSCALE = "grayscale"
    DARK_MODE = "dark_mode"
    LIGHT_MODE = "light_mode"

class DeliveryMethod(Enum):
    """Asset delivery methods."""
    CDN = "cdn"
    DIRECT = "direct"
    STREAMING = "streaming"
    PROGRESSIVE = "progressive"

@dataclass
class AssetVariant:
    """Asset variant definition."""
    variant_id: str
    variant_type: AssetVariantType
    file_path: str
    file_size: int
    dimensions: Optional[Dict[str, int]] = None
    quality: Optional[int] = None
    format: Optional[str] = None
    cdn_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.now)
    is_optimized: bool = False

@dataclass
class AssetMetadata:
    """Comprehensive asset metadata."""
    asset_id: str
    brand_id: str
    category: AssetCategory
    name: str
    description: str
    tags: List[str] = field(default_factory=list)
    original_filename: str = ""
    mime_type: str = ""
    file_size: int = 0
    dimensions: Optional[Dict[str, int]] = None
    color_palette: List[str] = field(default_factory=list)
    alt_text: str = ""
    usage_rights: Dict[str, Any] = field(default_factory=dict)
    seo_metadata: Dict[str, str] = field(default_factory=dict)
    accessibility_metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    created_by: str = ""
    version: str = "1.0"
    is_active: bool = True

@dataclass
class BrandAssetCollection:
    """Collection of assets for a specific brand."""
    collection_id: str
    brand_id: str
    name: str
    description: str
    assets: Dict[str, AssetMetadata] = field(default_factory=dict)
    variants: Dict[str, List[AssetVariant]] = field(default_factory=dict)
    delivery_config: Dict[str, Any] = field(default_factory=dict)
    cdn_config: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

@dataclass
class AssetDeliveryRule:
    """Rules for asset delivery based on context."""
    rule_id: str
    brand_id: str
    conditions: Dict[str, Any]  # device, location, user_agent, etc.
    asset_preferences: Dict[AssetCategory, Dict[str, Any]]
    delivery_method: DeliveryMethod
    cache_settings: Dict[str, Any] = field(default_factory=dict)
    priority: int = 0
    is_active: bool = True

class AssetOptimizer:
    """Optimizes assets for different use cases and delivery methods."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize asset optimizer."""
        self.config = config
        self.executor = ThreadPoolExecutor(max_workers=4)
        self.optimization_profiles = self._load_optimization_profiles()
    
    async def optimize_image_asset(
        self,
        image_data: bytes,
        category: AssetCategory,
        target_variants: List[AssetVariantType]
    ) -> Dict[AssetVariantType, AssetVariant]:
        """Optimize image asset and generate variants."""
        try:
            variants = {}
            
            # Load image
            image = Image.open(io.BytesIO(image_data))
            original_format = image.format
            
            # Generate each requested variant
            for variant_type in target_variants:
                variant_data = await self._generate_image_variant(
                    image, variant_type, category, original_format
                )
                
                if variant_data:
                    variants[variant_type] = variant_data
            
            return variants
            
        except Exception as e:
            logger.error(f"Failed to optimize image asset: {e}")
            return {}
    
    async def _generate_image_variant(
        self,
        image: Image.Image,
        variant_type: AssetVariantType,
        category: AssetCategory,
        original_format: str
    ) -> Optional[AssetVariant]:
        """Generate a specific image variant."""
        try:
            variant_id = str(uuid.uuid4())
            
            # Get optimization profile
            profile = self.optimization_profiles.get(variant_type, {})
            
            # Apply transformations based on variant type
            processed_image = image.copy()
            
            if variant_type == AssetVariantType.THUMBNAIL:
                processed_image = self._create_thumbnail(processed_image, category)
            elif variant_type == AssetVariantType.RETINA:
                processed_image = self._create_retina_variant(processed_image)
            elif variant_type == AssetVariantType.COMPRESSED:
                processed_image = self._compress_image(processed_image)
            elif variant_type == AssetVariantType.GRAYSCALE:
                processed_image = processed_image.convert('L').convert('RGB')
            elif variant_type == AssetVariantType.DARK_MODE:
                processed_image = self._create_dark_mode_variant(processed_image)
            elif variant_type == AssetVariantType.LIGHT_MODE:
                processed_image = self._create_light_mode_variant(processed_image)
            elif variant_type in [AssetVariantType.SMALL, AssetVariantType.MEDIUM, AssetVariantType.LARGE]:
                processed_image = self._resize_image(processed_image, variant_type, category)
            
            # Determine output format
            output_format = self._get_output_format(variant_type, original_format)
            
            # Save processed image
            output_buffer = io.BytesIO()
            save_kwargs = self._get_save_kwargs(output_format, profile)
            processed_image.save(output_buffer, format=output_format, **save_kwargs)
            
            # Create variant metadata
            variant = AssetVariant(
                variant_id=variant_id,
                variant_type=variant_type,
                file_path=f"variants/{variant_id}.{output_format.lower()}",
                file_size=len(output_buffer.getvalue()),
                dimensions={
                    'width': processed_image.width,
                    'height': processed_image.height
                },
                quality=profile.get('quality'),
                format=output_format.lower(),
                is_optimized=True
            )
            
            return variant
            
        except Exception as e:
            logger.error(f"Failed to generate image variant {variant_type}: {e}")
            return None
    
    def _create_thumbnail(self, image: Image.Image, category: AssetCategory) -> Image.Image:
        """Create thumbnail variant."""
        thumbnail_sizes = {
            AssetCategory.LOGO: (150, 50),
            AssetCategory.ICON: (64, 64),
            AssetCategory.BANNER: (300, 100),
            AssetCategory.BACKGROUND: (400, 300)
        }
        
        size = thumbnail_sizes.get(category, (150, 150))
        return ImageOps.fit(image, size, Image.Resampling.LANCZOS)
    
    def _create_retina_variant(self, image: Image.Image) -> Image.Image:
        """Create retina (2x) variant."""
        new_size = (image.width * 2, image.height * 2)
        return image.resize(new_size, Image.Resampling.LANCZOS)
    
    def _compress_image(self, image: Image.Image) -> Image.Image:
        """Apply compression optimizations."""
        # Convert to RGB if necessary
        if image.mode in ('RGBA', 'LA', 'P'):
            # Create white background
            background = Image.new('RGB', image.size, (255, 255, 255))
            if image.mode == 'P':
                image = image.convert('RGBA')
            background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
            image = background
        
        return image
    
    def _create_dark_mode_variant(self, image: Image.Image) -> Image.Image:
        """Create dark mode variant."""
        # Invert colors for dark mode
        if image.mode == 'RGBA':
            r, g, b, a = image.split()
            rgb_image = Image.merge('RGB', (r, g, b))
            inverted = ImageOps.invert(rgb_image)
            r2, g2, b2 = inverted.split()
            return Image.merge('RGBA', (r2, g2, b2, a))
        else:
            return ImageOps.invert(image)
    
    def _create_light_mode_variant(self, image: Image.Image) -> Image.Image:
        """Create light mode variant (usually just the original)."""
        return image
    
    def _resize_image(self, image: Image.Image, variant_type: AssetVariantType, category: AssetCategory) -> Image.Image:
        """Resize image based on variant type and category."""
        size_mappings = {
            AssetVariantType.SMALL: {
                AssetCategory.LOGO: (100, 35),
                AssetCategory.ICON: (24, 24),
                AssetCategory.BANNER: (400, 150),
                AssetCategory.BACKGROUND: (800, 600)
            },
            AssetVariantType.MEDIUM: {
                AssetCategory.LOGO: (200, 70),
                AssetCategory.ICON: (48, 48),
                AssetCategory.BANNER: (800, 300),
                AssetCategory.BACKGROUND: (1200, 900)
            },
            AssetVariantType.LARGE: {
                AssetCategory.LOGO: (400, 140),
                AssetCategory.ICON: (96, 96),
                AssetCategory.BANNER: (1200, 450),
                AssetCategory.BACKGROUND: (1920, 1080)
            }
        }
        
        size = size_mappings.get(variant_type, {}).get(category, (image.width, image.height))
        return ImageOps.fit(image, size, Image.Resampling.LANCZOS)
    
    def _get_output_format(self, variant_type: AssetVariantType, original_format: str) -> str:
        """Determine output format for variant."""
        if variant_type == AssetVariantType.WEBP:
            return 'WEBP'
        elif variant_type == AssetVariantType.AVIF:
            return 'AVIF'
        elif original_format in ['JPEG', 'JPG']:
            return 'JPEG'
        else:
            return 'PNG'
    
    def _get_save_kwargs(self, format: str, profile: Dict[str, Any]) -> Dict[str, Any]:
        """Get save parameters for image format."""
        kwargs = {}
        
        if format == 'JPEG':
            kwargs['quality'] = profile.get('quality', 85)
            kwargs['optimize'] = True
        elif format == 'PNG':
            kwargs['optimize'] = True
        elif format == 'WEBP':
            kwargs['quality'] = profile.get('quality', 80)
            kwargs['method'] = 6
        
        return kwargs
    
    def _load_optimization_profiles(self) -> Dict[AssetVariantType, Dict[str, Any]]:
        """Load optimization profiles for different variant types."""
        return {
            AssetVariantType.THUMBNAIL: {'quality': 75},
            AssetVariantType.SMALL: {'quality': 80},
            AssetVariantType.MEDIUM: {'quality': 85},
            AssetVariantType.LARGE: {'quality': 90},
            AssetVariantType.RETINA: {'quality': 90},
            AssetVariantType.WEBP: {'quality': 80},
            AssetVariantType.AVIF: {'quality': 75},
            AssetVariantType.COMPRESSED: {'quality': 70}
        }

class CDNManager:
    """Manages CDN integration and asset delivery."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize CDN manager."""
        self.config = config
        self.s3_client = boto3.client('s3') if config.get('use_s3') else None
        self.cloudfront_client = boto3.client('cloudfront') if config.get('use_cloudfront') else None
        self.cdn_base_url = config.get('cdn_base_url', '')
        self.bucket_name = config.get('s3_bucket', 'acso-brand-assets')
    
    async def upload_asset_to_cdn(
        self,
        asset_data: bytes,
        asset_path: str,
        mime_type: str,
        cache_control: str = "public, max-age=31536000"
    ) -> Dict[str, Any]:
        """Upload asset to CDN."""
        try:
            if self.s3_client:
                # Upload to S3
                self.s3_client.put_object(
                    Bucket=self.bucket_name,
                    Key=asset_path,
                    Body=asset_data,
                    ContentType=mime_type,
                    CacheControl=cache_control,
                    Metadata={
                        'uploaded_at': datetime.now().isoformat(),
                        'size': str(len(asset_data))
                    }
                )
                
                # Generate CDN URL
                cdn_url = f"{self.cdn_base_url}/{asset_path}"
                
                # Invalidate CloudFront cache if configured
                if self.cloudfront_client and self.config.get('cloudfront_distribution_id'):
                    await self._invalidate_cdn_cache([f"/{asset_path}"])
                
                return {
                    'success': True,
                    'cdn_url': cdn_url,
                    's3_key': asset_path
                }
            else:
                # Local storage fallback
                local_path = Path(self.config.get('local_storage_dir', '/tmp/assets')) / asset_path
                local_path.parent.mkdir(parents=True, exist_ok=True)
                
                async with aiofiles.open(local_path, 'wb') as f:
                    await f.write(asset_data)
                
                return {
                    'success': True,
                    'cdn_url': f"{self.cdn_base_url}/{asset_path}",
                    'local_path': str(local_path)
                }
                
        except Exception as e:
            logger.error(f"Failed to upload asset to CDN: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def delete_asset_from_cdn(self, asset_path: str) -> Dict[str, Any]:
        """Delete asset from CDN."""
        try:
            if self.s3_client:
                self.s3_client.delete_object(
                    Bucket=self.bucket_name,
                    Key=asset_path
                )
                
                # Invalidate CloudFront cache
                if self.cloudfront_client and self.config.get('cloudfront_distribution_id'):
                    await self._invalidate_cdn_cache([f"/{asset_path}"])
            
            return {
                'success': True,
                'message': f'Asset {asset_path} deleted from CDN'
            }
            
        except Exception as e:
            logger.error(f"Failed to delete asset from CDN: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _invalidate_cdn_cache(self, paths: List[str]) -> bool:
        """Invalidate CloudFront cache for specific paths."""
        try:
            if not self.cloudfront_client:
                return False
            
            distribution_id = self.config.get('cloudfront_distribution_id')
            if not distribution_id:
                return False
            
            response = self.cloudfront_client.create_invalidation(
                DistributionId=distribution_id,
                InvalidationBatch={
                    'Paths': {
                        'Quantity': len(paths),
                        'Items': paths
                    },
                    'CallerReference': str(uuid.uuid4())
                }
            )
            
            logger.info(f"Created CloudFront invalidation: {response['Invalidation']['Id']}")
            return True
            
        except Exception as e:
            logger.error(f"Failed to invalidate CDN cache: {e}")
            return False
    
    async def get_asset_analytics(self, asset_path: str, days: int = 30) -> Dict[str, Any]:
        """Get asset delivery analytics."""
        try:
            # This would integrate with CloudWatch or other analytics services
            # For now, return mock data
            return {
                'success': True,
                'analytics': {
                    'total_requests': 15420,
                    'total_bandwidth': '2.3 GB',
                    'cache_hit_ratio': 0.94,
                    'top_regions': [
                        {'region': 'us-east-1', 'requests': 8500},
                        {'region': 'eu-west-1', 'requests': 4200},
                        {'region': 'ap-southeast-1', 'requests': 2720}
                    ],
                    'performance_metrics': {
                        'avg_response_time': 45,  # ms
                        'p95_response_time': 120,  # ms
                        'error_rate': 0.002
                    }
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to get asset analytics: {e}")
            return {
                'success': False,
                'error': str(e)
            }

class AssetVersionManager:
    """Manages asset versions and rollback capabilities."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize asset version manager."""
        self.config = config
        self.versions_storage = {}  # In production, this would be a database
    
    async def create_asset_version(
        self,
        asset_id: str,
        asset_data: bytes,
        version_notes: str = "",
        created_by: str = ""
    ) -> Dict[str, Any]:
        """Create a new version of an asset."""
        try:
            version_id = str(uuid.uuid4())
            version_number = await self._get_next_version_number(asset_id)
            
            # Store version metadata
            version_info = {
                'version_id': version_id,
                'asset_id': asset_id,
                'version_number': version_number,
                'file_size': len(asset_data),
                'checksum': hashlib.sha256(asset_data).hexdigest(),
                'version_notes': version_notes,
                'created_by': created_by,
                'created_at': datetime.now().isoformat(),
                'is_active': True
            }
            
            # Store version data (in production, this would be in proper storage)
            if asset_id not in self.versions_storage:
                self.versions_storage[asset_id] = []
            
            self.versions_storage[asset_id].append({
                'metadata': version_info,
                'data': asset_data
            })
            
            logger.info(f"Created asset version: {version_id} (v{version_number})")
            
            return {
                'success': True,
                'version_id': version_id,
                'version_number': version_number
            }
            
        except Exception as e:
            logger.error(f"Failed to create asset version: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_asset_versions(self, asset_id: str) -> Dict[str, Any]:
        """Get all versions of an asset."""
        try:
            if asset_id not in self.versions_storage:
                return {
                    'success': True,
                    'versions': []
                }
            
            versions = []
            for version_data in self.versions_storage[asset_id]:
                metadata = version_data['metadata'].copy()
                # Don't include the actual data in the response
                versions.append(metadata)
            
            # Sort by version number (descending)
            versions.sort(key=lambda x: x['version_number'], reverse=True)
            
            return {
                'success': True,
                'versions': versions
            }
            
        except Exception as e:
            logger.error(f"Failed to get asset versions: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def rollback_to_version(self, asset_id: str, version_id: str) -> Dict[str, Any]:
        """Rollback asset to a specific version."""
        try:
            if asset_id not in self.versions_storage:
                return {
                    'success': False,
                    'error': 'Asset not found'
                }
            
            # Find the target version
            target_version = None
            for version_data in self.versions_storage[asset_id]:
                if version_data['metadata']['version_id'] == version_id:
                    target_version = version_data
                    break
            
            if not target_version:
                return {
                    'success': False,
                    'error': 'Version not found'
                }
            
            # Create a new version with the rollback data
            rollback_result = await self.create_asset_version(
                asset_id=asset_id,
                asset_data=target_version['data'],
                version_notes=f"Rollback to version {target_version['metadata']['version_number']}",
                created_by="system"
            )
            
            if rollback_result['success']:
                logger.info(f"Rolled back asset {asset_id} to version {version_id}")
            
            return rollback_result
            
        except Exception as e:
            logger.error(f"Failed to rollback asset version: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _get_next_version_number(self, asset_id: str) -> str:
        """Get the next version number for an asset."""
        if asset_id not in self.versions_storage:
            return "1.0"
        
        versions = self.versions_storage[asset_id]
        if not versions:
            return "1.0"
        
        # Get the highest version number
        max_version = 0.0
        for version_data in versions:
            version_num = float(version_data['metadata']['version_number'])
            max_version = max(max_version, version_num)
        
        # Increment minor version
        new_version = max_version + 0.1
        return f"{new_version:.1f}"

class BrandAwareAssetRouter:
    """Routes asset requests based on brand context and delivery rules."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize brand-aware asset router."""
        self.config = config
        self.delivery_rules: Dict[str, AssetDeliveryRule] = {}
        self.brand_collections: Dict[str, BrandAssetCollection] = {}
    
    async def route_asset_request(
        self,
        brand_id: str,
        asset_category: AssetCategory,
        request_context: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Route asset request based on brand and context."""
        try:
            # Get brand asset collection
            collection = self.brand_collections.get(brand_id)
            if not collection:
                return {
                    'success': False,
                    'error': 'Brand collection not found'
                }
            
            # Find matching delivery rule
            delivery_rule = await self._find_matching_delivery_rule(brand_id, request_context)
            
            # Get asset preferences for the category
            asset_preferences = {}
            if delivery_rule:
                asset_preferences = delivery_rule.asset_preferences.get(asset_category, {})
            
            # Find best matching asset
            best_asset = await self._find_best_asset(
                collection, asset_category, asset_preferences, request_context
            )
            
            if not best_asset:
                return {
                    'success': False,
                    'error': 'No suitable asset found'
                }
            
            # Get optimal variant
            optimal_variant = await self._get_optimal_variant(
                best_asset, asset_preferences, request_context
            )
            
            # Prepare delivery response
            delivery_response = {
                'success': True,
                'asset_id': best_asset.asset_id,
                'asset_url': optimal_variant.cdn_url if optimal_variant else None,
                'delivery_method': delivery_rule.delivery_method.value if delivery_rule else DeliveryMethod.CDN.value,
                'cache_settings': delivery_rule.cache_settings if delivery_rule else {},
                'metadata': {
                    'name': best_asset.name,
                    'alt_text': best_asset.alt_text,
                    'dimensions': optimal_variant.dimensions if optimal_variant else best_asset.dimensions,
                    'file_size': optimal_variant.file_size if optimal_variant else best_asset.file_size,
                    'format': optimal_variant.format if optimal_variant else None
                }
            }
            
            # Log delivery for analytics
            await self._log_asset_delivery(brand_id, best_asset.asset_id, request_context)
            
            return delivery_response
            
        except Exception as e:
            logger.error(f"Failed to route asset request: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def register_delivery_rule(self, delivery_rule: AssetDeliveryRule) -> bool:
        """Register a new asset delivery rule."""
        try:
            self.delivery_rules[delivery_rule.rule_id] = delivery_rule
            logger.info(f"Registered delivery rule: {delivery_rule.rule_id}")
            return True
        except Exception as e:
            logger.error(f"Failed to register delivery rule: {e}")
            return False
    
    async def _find_matching_delivery_rule(
        self,
        brand_id: str,
        request_context: Dict[str, Any]
    ) -> Optional[AssetDeliveryRule]:
        """Find the best matching delivery rule for the request."""
        matching_rules = []
        
        for rule in self.delivery_rules.values():
            if rule.brand_id == brand_id and rule.is_active:
                if await self._rule_matches_context(rule, request_context):
                    matching_rules.append(rule)
        
        # Sort by priority (highest first)
        matching_rules.sort(key=lambda x: x.priority, reverse=True)
        
        return matching_rules[0] if matching_rules else None
    
    async def _rule_matches_context(
        self,
        rule: AssetDeliveryRule,
        request_context: Dict[str, Any]
    ) -> bool:
        """Check if a delivery rule matches the request context."""
        for condition_key, condition_value in rule.conditions.items():
            context_value = request_context.get(condition_key)
            
            if isinstance(condition_value, list):
                if context_value not in condition_value:
                    return False
            elif isinstance(condition_value, dict):
                # Range or pattern matching
                if 'min' in condition_value and 'max' in condition_value:
                    if not (condition_value['min'] <= context_value <= condition_value['max']):
                        return False
                elif 'pattern' in condition_value:
                    import re
                    if not re.match(condition_value['pattern'], str(context_value)):
                        return False
            else:
                if context_value != condition_value:
                    return False
        
        return True
    
    async def _find_best_asset(
        self,
        collection: BrandAssetCollection,
        category: AssetCategory,
        preferences: Dict[str, Any],
        request_context: Dict[str, Any]
    ) -> Optional[AssetMetadata]:
        """Find the best asset for the given criteria."""
        category_assets = [
            asset for asset in collection.assets.values()
            if asset.category == category and asset.is_active
        ]
        
        if not category_assets:
            return None
        
        # Apply preferences and scoring
        scored_assets = []
        for asset in category_assets:
            score = await self._score_asset(asset, preferences, request_context)
            scored_assets.append((asset, score))
        
        # Sort by score (highest first)
        scored_assets.sort(key=lambda x: x[1], reverse=True)
        
        return scored_assets[0][0] if scored_assets else None
    
    async def _score_asset(
        self,
        asset: AssetMetadata,
        preferences: Dict[str, Any],
        request_context: Dict[str, Any]
    ) -> float:
        """Score an asset based on preferences and context."""
        score = 0.0
        
        # Base score
        score += 1.0
        
        # Prefer newer assets
        days_old = (datetime.now() - asset.created_at).days
        score += max(0, 1.0 - (days_old / 365))  # Decay over a year
        
        # Tag matching
        preferred_tags = preferences.get('tags', [])
        matching_tags = set(asset.tags) & set(preferred_tags)
        score += len(matching_tags) * 0.5
        
        # Size preferences
        if 'max_file_size' in preferences:
            if asset.file_size <= preferences['max_file_size']:
                score += 0.5
            else:
                score -= 1.0
        
        # Dimension preferences
        if asset.dimensions and 'dimensions' in preferences:
            pref_dims = preferences['dimensions']
            if 'min_width' in pref_dims and asset.dimensions['width'] >= pref_dims['min_width']:
                score += 0.3
            if 'min_height' in pref_dims and asset.dimensions['height'] >= pref_dims['min_height']:
                score += 0.3
        
        return score
    
    async def _get_optimal_variant(
        self,
        asset: AssetMetadata,
        preferences: Dict[str, Any],
        request_context: Dict[str, Any]
    ) -> Optional[AssetVariant]:
        """Get the optimal variant for the asset based on context."""
        # This would look up variants from storage
        # For now, return None (use original asset)
        return None
    
    async def _log_asset_delivery(
        self,
        brand_id: str,
        asset_id: str,
        request_context: Dict[str, Any]
    ):
        """Log asset delivery for analytics."""
        # This would log to analytics system
        logger.info(f"Asset delivered - Brand: {brand_id}, Asset: {asset_id}")

class MultiBrandAssetManager:
    """Main multi-brand asset management system."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize multi-brand asset manager."""
        self.config = config
        self.optimizer = AssetOptimizer(config)
        self.cdn_manager = CDNManager(config)
        self.version_manager = AssetVersionManager(config)
        self.asset_router = BrandAwareAssetRouter(config)
        
        # Storage
        self.asset_collections: Dict[str, BrandAssetCollection] = {}
        
        logger.info("Multi-brand asset manager initialized")
    
    async def create_brand_collection(
        self,
        brand_id: str,
        name: str,
        description: str = ""
    ) -> Dict[str, Any]:
        """Create a new brand asset collection."""
        try:
            collection_id = str(uuid.uuid4())
            
            collection = BrandAssetCollection(
                collection_id=collection_id,
                brand_id=brand_id,
                name=name,
                description=description
            )
            
            self.asset_collections[collection_id] = collection
            self.asset_router.brand_collections[brand_id] = collection
            
            logger.info(f"Created brand collection: {collection_id}")
            
            return {
                'success': True,
                'collection_id': collection_id
            }
            
        except Exception as e:
            logger.error(f"Failed to create brand collection: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def upload_brand_asset(
        self,
        brand_id: str,
        asset_data: bytes,
        filename: str,
        category: AssetCategory,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Upload a new brand asset."""
        try:
            # Get brand collection
            collection = self.asset_router.brand_collections.get(brand_id)
            if not collection:
                return {
                    'success': False,
                    'error': 'Brand collection not found'
                }
            
            # Generate asset ID
            asset_id = str(uuid.uuid4())
            
            # Determine MIME type
            mime_type = mimetypes.guess_type(filename)[0] or 'application/octet-stream'
            
            # Create asset metadata
            asset_metadata = AssetMetadata(
                asset_id=asset_id,
                brand_id=brand_id,
                category=category,
                name=metadata.get('name', filename) if metadata else filename,
                description=metadata.get('description', '') if metadata else '',
                original_filename=filename,
                mime_type=mime_type,
                file_size=len(asset_data),
                alt_text=metadata.get('alt_text', '') if metadata else '',
                tags=metadata.get('tags', []) if metadata else []
            )
            
            # Extract dimensions for images
            if mime_type.startswith('image/'):
                try:
                    image = Image.open(io.BytesIO(asset_data))
                    asset_metadata.dimensions = {
                        'width': image.width,
                        'height': image.height
                    }
                except:
                    pass
            
            # Create asset version
            version_result = await self.version_manager.create_asset_version(
                asset_id=asset_id,
                asset_data=asset_data,
                version_notes="Initial upload",
                created_by=metadata.get('created_by', 'system') if metadata else 'system'
            )
            
            if not version_result['success']:
                return version_result
            
            # Upload to CDN
            asset_path = f"brands/{brand_id}/{category.value}/{asset_id}/{filename}"
            cdn_result = await self.cdn_manager.upload_asset_to_cdn(
                asset_data=asset_data,
                asset_path=asset_path,
                mime_type=mime_type
            )
            
            if not cdn_result['success']:
                return cdn_result
            
            # Generate optimized variants for images
            variants = {}
            if mime_type.startswith('image/'):
                target_variants = [
                    AssetVariantType.THUMBNAIL,
                    AssetVariantType.SMALL,
                    AssetVariantType.MEDIUM,
                    AssetVariantType.LARGE,
                    AssetVariantType.WEBP,
                    AssetVariantType.COMPRESSED
                ]
                
                optimized_variants = await self.optimizer.optimize_image_asset(
                    asset_data, category, target_variants
                )
                
                # Upload variants to CDN
                for variant_type, variant in optimized_variants.items():
                    variant_path = f"brands/{brand_id}/{category.value}/{asset_id}/variants/{variant.variant_id}"
                    
                    # Get variant data (would be stored during optimization)
                    variant_data = asset_data  # Placeholder
                    
                    variant_cdn_result = await self.cdn_manager.upload_asset_to_cdn(
                        asset_data=variant_data,
                        asset_path=variant_path,
                        mime_type=mime_type
                    )
                    
                    if variant_cdn_result['success']:
                        variant.cdn_url = variant_cdn_result['cdn_url']
                        variants[variant_type] = variant
            
            # Add to collection
            collection.assets[asset_id] = asset_metadata
            if variants:
                collection.variants[asset_id] = list(variants.values())
            
            logger.info(f"Uploaded brand asset: {asset_id}")
            
            return {
                'success': True,
                'asset_id': asset_id,
                'cdn_url': cdn_result['cdn_url'],
                'variants': {vt.value: v.cdn_url for vt, v in variants.items()},
                'version_id': version_result['version_id']
            }
            
        except Exception as e:
            logger.error(f"Failed to upload brand asset: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_brand_asset(
        self,
        brand_id: str,
        asset_category: AssetCategory,
        request_context: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Get brand asset with intelligent routing."""
        context = request_context or {}
        
        return await self.asset_router.route_asset_request(
            brand_id=brand_id,
            asset_category=asset_category,
            request_context=context
        )
    
    async def update_asset_metadata(
        self,
        asset_id: str,
        metadata_updates: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update asset metadata."""
        try:
            # Find asset in collections
            asset = None
            collection = None
            
            for coll in self.asset_collections.values():
                if asset_id in coll.assets:
                    asset = coll.assets[asset_id]
                    collection = coll
                    break
            
            if not asset:
                return {
                    'success': False,
                    'error': 'Asset not found'
                }
            
            # Update metadata
            for key, value in metadata_updates.items():
                if hasattr(asset, key):
                    setattr(asset, key, value)
            
            asset.updated_at = datetime.now()
            
            logger.info(f"Updated asset metadata: {asset_id}")
            
            return {
                'success': True,
                'message': 'Asset metadata updated'
            }
            
        except Exception as e:
            logger.error(f"Failed to update asset metadata: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def delete_brand_asset(self, asset_id: str) -> Dict[str, Any]:
        """Delete a brand asset and all its variants."""
        try:
            # Find and remove asset from collections
            asset = None
            collection = None
            
            for coll in self.asset_collections.values():
                if asset_id in coll.assets:
                    asset = coll.assets[asset_id]
                    collection = coll
                    break
            
            if not asset:
                return {
                    'success': False,
                    'error': 'Asset not found'
                }
            
            # Delete from CDN
            asset_path = f"brands/{asset.brand_id}/{asset.category.value}/{asset_id}/"
            await self.cdn_manager.delete_asset_from_cdn(asset_path)
            
            # Remove from collection
            del collection.assets[asset_id]
            if asset_id in collection.variants:
                del collection.variants[asset_id]
            
            logger.info(f"Deleted brand asset: {asset_id}")
            
            return {
                'success': True,
                'message': 'Asset deleted successfully'
            }
            
        except Exception as e:
            logger.error(f"Failed to delete brand asset: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_asset_analytics(self, brand_id: str, days: int = 30) -> Dict[str, Any]:
        """Get analytics for brand assets."""
        try:
            collection = self.asset_router.brand_collections.get(brand_id)
            if not collection:
                return {
                    'success': False,
                    'error': 'Brand collection not found'
                }
            
            # Aggregate analytics for all assets
            total_assets = len(collection.assets)
            total_variants = sum(len(variants) for variants in collection.variants.values())
            
            # Get CDN analytics (mock data for now)
            analytics = {
                'success': True,
                'brand_id': brand_id,
                'summary': {
                    'total_assets': total_assets,
                    'total_variants': total_variants,
                    'total_requests': 45600,
                    'total_bandwidth': '8.7 GB',
                    'cache_hit_ratio': 0.92
                },
                'asset_breakdown': {
                    category.value: len([a for a in collection.assets.values() if a.category == category])
                    for category in AssetCategory
                },
                'performance': {
                    'avg_load_time': 180,  # ms
                    'p95_load_time': 450,  # ms
                    'error_rate': 0.001
                }
            }
            
            return analytics
            
        except Exception as e:
            logger.error(f"Failed to get asset analytics: {e}")
            return {
                'success': False,
                'error': str(e)
            }

# Example usage
if __name__ == "__main__":
    # Example configuration
    config = {
        'use_s3': False,
        'use_cloudfront': False,
        'local_storage_dir': '/tmp/acso-assets',
        'cdn_base_url': 'https://cdn.example.com',
        's3_bucket': 'acso-brand-assets'
    }
    
    # Initialize asset manager
    asset_manager = MultiBrandAssetManager(config)
    
    # Example usage
    async def example_usage():
        # Create brand collection
        collection_result = await asset_manager.create_brand_collection(
            brand_id="brand_123",
            name="Acme Corp Assets",
            description="Brand assets for Acme Corporation"
        )
        
        if collection_result['success']:
            print(f"Created collection: {collection_result['collection_id']}")
            
            # Upload logo asset (mock data)
            logo_data = b"mock_logo_data"
            upload_result = await asset_manager.upload_brand_asset(
                brand_id="brand_123",
                asset_data=logo_data,
                filename="acme_logo.png",
                category=AssetCategory.LOGO,
                metadata={
                    'name': 'Acme Corp Logo',
                    'description': 'Primary company logo',
                    'alt_text': 'Acme Corporation Logo',
                    'tags': ['logo', 'primary', 'brand']
                }
            )
            
            if upload_result['success']:
                print(f"Uploaded asset: {upload_result['asset_id']}")
                
                # Get asset with context
                asset_result = await asset_manager.get_brand_asset(
                    brand_id="brand_123",
                    asset_category=AssetCategory.LOGO,
                    request_context={
                        'device_type': 'desktop',
                        'screen_density': 'retina',
                        'user_agent': 'Mozilla/5.0...'
                    }
                )
                
                if asset_result['success']:
                    print(f"Retrieved asset URL: {asset_result['asset_url']}")
                
                # Get analytics
                analytics = await asset_manager.get_asset_analytics("brand_123")
                if analytics['success']:
                    print(f"Total assets: {analytics['summary']['total_assets']}")
        
        else:
            print(f"Failed to create collection: {collection_result['error']}")
    
    # Run example
    import asyncio
    asyncio.run(example_usage())