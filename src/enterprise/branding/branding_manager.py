"""
Enterprise Branding Manager for ACSO.
Manages white-label branding and tenant customization.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import json
import base64
import hashlib

import io
from PIL import Image, ImageOps
import boto3
from botocore.exceptions import ClientError

from ..models.tenancy import TenantCustomization
from .theme_engine import ThemeEngine


class AssetType(str, Enum):
    """Types of branding assets."""
    LOGO = "logo"
    FAVICON = "favicon"
    BACKGROUND = "background"
    ICON = "icon"
    BANNER = "banner"


@dataclass
class BrandingAsset:
    """Branding asset information."""
    asset_id: str
    tenant_id: str
    asset_type: AssetType
    filename: str
    file_size: int
    mime_type: str
    url: str
    cdn_url: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class BrandingTheme:
    """Complete branding theme for a tenant."""
    tenant_id: str
    theme_name: str
    primary_color: str
    secondary_color: str
    accent_color: str
    background_color: str
    text_color: str
    font_family: str
    logo_url: Optional[str] = None
    favicon_url: Optional[str] = None
    custom_css: Optional[str] = None
    custom_js: Optional[str] = None
    created_at: datetime = field(default_factory=datetime.utcnow)
    updated_at: Optional[datetime] = None


class EnterpriseBrandingManager:
    """
    Enterprise-grade branding and customization system.
    
    Features:
    - Multi-tenant branding isolation
    - Asset management and CDN integration
    - Theme customization and validation
    - Custom CSS/JS injection
    - Brand compliance checking
    - Asset optimization and resizing
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Branding storage
        self.tenant_themes: Dict[str, BrandingTheme] = {}
        self.branding_assets: Dict[str, BrandingAsset] = {}
        
        # Theme engine
        self.theme_engine = ThemeEngine()
        
        # AWS S3 client for asset storage
        self.s3_client = None
        self.s3_bucket = "acso-branding-assets"
        self.cdn_domain = "cdn.acso.com"
        
        # Asset processing
        self.supported_formats = {
            AssetType.LOGO: ['png', 'jpg', 'jpeg', 'svg'],
            AssetType.FAVICON: ['ico', 'png'],
            AssetType.BACKGROUND: ['png', 'jpg', 'jpeg'],
            AssetType.ICON: ['png', 'svg'],
            AssetType.BANNER: ['png', 'jpg', 'jpeg']
        }
        
        self.asset_constraints = {
            AssetType.LOGO: {'max_size': 2 * 1024 * 1024, 'max_width': 2000, 'max_height': 1000},
            AssetType.FAVICON: {'max_size': 512 * 1024, 'max_width': 256, 'max_height': 256},
            AssetType.BACKGROUND: {'max_size': 5 * 1024 * 1024, 'max_width': 4000, 'max_height': 3000},
            AssetType.ICON: {'max_size': 1 * 1024 * 1024, 'max_width': 512, 'max_height': 512},
            AssetType.BANNER: {'max_size': 3 * 1024 * 1024, 'max_width': 3000, 'max_height': 1000}
        }
        
        # Background tasks
        self.branding_tasks: List[asyncio.Task] = []
        self.branding_active = False
        
    async def initialize(self) -> None:
        """Initialize the branding manager."""
        try:
            self.logger.info("Initializing Enterprise Branding Manager")
            
            # Initialize AWS S3 client
            self.s3_client = boto3.client('s3')
            
            # Initialize theme engine
            await self.theme_engine.initialize()
            
            # Create S3 bucket if it doesn't exist
            await self._ensure_s3_bucket()
            
            # Start background tasks
            self.branding_active = True
            self.branding_tasks = [
                asyncio.create_task(self._cleanup_expired_assets()),
                asyncio.create_task(self._optimize_assets_background()),
                asyncio.create_task(self._sync_cdn_cache())
            ]
            
            self.logger.info("Enterprise Branding Manager initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Enterprise Branding Manager: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the branding manager."""
        try:
            self.logger.info("Shutting down Enterprise Branding Manager")
            
            self.branding_active = False
            
            # Cancel background tasks
            for task in self.branding_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                        
            # Shutdown theme engine
            await self.theme_engine.shutdown()
            
            self.logger.info("Enterprise Branding Manager shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    async def create_tenant_theme(
        self,
        tenant_id: str,
        theme_name: str,
        theme_config: Dict[str, Any]
    ) -> BrandingTheme:
        """
        Create a new branding theme for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            theme_name: Name of the theme
            theme_config: Theme configuration data
            
        Returns:
            Created branding theme
        """
        try:
            self.logger.info(f"Creating branding theme '{theme_name}' for tenant {tenant_id}")
            
            # Validate theme configuration
            await self._validate_theme_config(theme_config)
            
            # Create branding theme
            theme = BrandingTheme(
                tenant_id=tenant_id,
                theme_name=theme_name,
                primary_color=theme_config.get('primary_color', '#3B82F6'),
                secondary_color=theme_config.get('secondary_color', '#64748B'),
                accent_color=theme_config.get('accent_color', '#10B981'),
                background_color=theme_config.get('background_color', '#FFFFFF'),
                text_color=theme_config.get('text_color', '#1F2937'),
                font_family=theme_config.get('font_family', 'Inter, sans-serif'),
                logo_url=theme_config.get('logo_url'),
                favicon_url=theme_config.get('favicon_url'),
                custom_css=theme_config.get('custom_css'),
                custom_js=theme_config.get('custom_js')
            )
            
            # Store theme
            self.tenant_themes[tenant_id] = theme
            
            # Generate CSS and compile theme
            await self._compile_theme_css(tenant_id)
            
            self.logger.info(f"Successfully created branding theme for tenant {tenant_id}")
            
            return theme
            
        except Exception as e:
            self.logger.error(f"Failed to create branding theme for {tenant_id}: {e}")
            raise
            
    async def update_tenant_theme(
        self,
        tenant_id: str,
        updates: Dict[str, Any]
    ) -> BrandingTheme:
        """
        Update branding theme for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            updates: Theme updates
            
        Returns:
            Updated branding theme
        """
        try:
            if tenant_id not in self.tenant_themes:
                raise ValueError(f"Branding theme not found for tenant {tenant_id}")
                
            theme = self.tenant_themes[tenant_id]
            
            self.logger.info(f"Updating branding theme for tenant {tenant_id}")
            
            # Validate updates
            await self._validate_theme_config(updates)
            
            # Apply updates
            for key, value in updates.items():
                if hasattr(theme, key):
                    setattr(theme, key, value)
                    
            theme.updated_at = datetime.utcnow()
            
            # Recompile theme CSS
            await self._compile_theme_css(tenant_id)
            
            self.logger.info(f"Successfully updated branding theme for tenant {tenant_id}")
            
            return theme
            
        except Exception as e:
            self.logger.error(f"Failed to update branding theme for {tenant_id}: {e}")
            raise
            
    async def upload_asset(
        self,
        tenant_id: str,
        asset_type: AssetType,
        file_data: bytes,
        filename: str,
        mime_type: str
    ) -> BrandingAsset:
        """
        Upload a branding asset for a tenant.
        
        Args:
            tenant_id: ID of the tenant
            asset_type: Type of asset
            file_data: Binary file data
            filename: Original filename
            mime_type: MIME type of the file
            
        Returns:
            Created branding asset
        """
        try:
            self.logger.info(f"Uploading {asset_type.value} asset for tenant {tenant_id}")
            
            # Validate asset
            await self._validate_asset(asset_type, file_data, filename, mime_type)
            
            # Generate asset ID
            asset_id = f"asset_{tenant_id}_{asset_type.value}_{hashlib.md5(file_data).hexdigest()[:16]}"
            
            # Process and optimize asset
            processed_data = await self._process_asset(asset_type, file_data)
            
            # Upload to S3
            s3_key = f"tenants/{tenant_id}/assets/{asset_type.value}/{asset_id}"
            
            try:
                self.s3_client.put_object(
                    Bucket=self.s3_bucket,
                    Key=s3_key,
                    Body=processed_data,
                    ContentType=mime_type,
                    Metadata={
                        'tenant_id': tenant_id,
                        'asset_type': asset_type.value,
                        'original_filename': filename
                    }
                )
            except ClientError as e:
                raise Exception(f"Failed to upload asset to S3: {e}")
            
            # Generate URLs
            url = f"https://{self.s3_bucket}.s3.amazonaws.com/{s3_key}"
            cdn_url = f"https://{self.cdn_domain}/{s3_key}"
            
            # Create asset record
            asset = BrandingAsset(
                asset_id=asset_id,
                tenant_id=tenant_id,
                asset_type=asset_type,
                filename=filename,
                file_size=len(processed_data),
                mime_type=mime_type,
                url=url,
                cdn_url=cdn_url,
                metadata={
                    'original_size': len(file_data),
                    'processed_size': len(processed_data),
                    'optimization_ratio': len(processed_data) / len(file_data)
                }
            )
            
            # Store asset
            self.branding_assets[asset_id] = asset
            
            # Update tenant theme if applicable
            if tenant_id in self.tenant_themes:
                theme = self.tenant_themes[tenant_id]
                if asset_type == AssetType.LOGO:
                    theme.logo_url = cdn_url
                elif asset_type == AssetType.FAVICON:
                    theme.favicon_url = cdn_url
                theme.updated_at = datetime.utcnow()
                
                # Recompile theme
                await self._compile_theme_css(tenant_id)
            
            self.logger.info(f"Successfully uploaded {asset_type.value} asset for tenant {tenant_id}")
            
            return asset
            
        except Exception as e:
            self.logger.error(f"Failed to upload asset for {tenant_id}: {e}")
            raise
            
    asy
nc def get_tenant_theme(self, tenant_id: str) -> Optional[BrandingTheme]:
        """Get branding theme for a tenant."""
        return self.tenant_themes.get(tenant_id)
        
    async def get_asset(self, asset_id: str) -> Optional[BrandingAsset]:
        """Get branding asset by ID."""
        return self.branding_assets.get(asset_id)
        
    async def list_tenant_assets(self, tenant_id: str) -> List[BrandingAsset]:
        """List all assets for a tenant."""
        return [
            asset for asset in self.branding_assets.values()
            if asset.tenant_id == tenant_id
        ]
        
    async def delete_asset(self, asset_id: str) -> bool:
        """Delete a branding asset."""
        try:
            if asset_id not in self.branding_assets:
                return False
                
            asset = self.branding_assets[asset_id]
            
            # Delete from S3
            s3_key = f"tenants/{asset.tenant_id}/assets/{asset.asset_type.value}/{asset_id}"
            
            try:
                self.s3_client.delete_object(Bucket=self.s3_bucket, Key=s3_key)
            except ClientError as e:
                self.logger.warning(f"Failed to delete asset from S3: {e}")
            
            # Remove from storage
            del self.branding_assets[asset_id]
            
            # Update tenant theme if needed
            if asset.tenant_id in self.tenant_themes:
                theme = self.tenant_themes[asset.tenant_id]
                if asset.asset_type == AssetType.LOGO and theme.logo_url == asset.cdn_url:
                    theme.logo_url = None
                elif asset.asset_type == AssetType.FAVICON and theme.favicon_url == asset.cdn_url:
                    theme.favicon_url = None
                theme.updated_at = datetime.utcnow()
                
                await self._compile_theme_css(asset.tenant_id)
            
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to delete asset {asset_id}: {e}")
            return False
            
    async def delete_tenant_branding(self, tenant_id: str) -> bool:
        """Delete all branding data for a tenant."""
        try:
            self.logger.info(f"Deleting branding data for tenant {tenant_id}")
            
            # Delete all assets
            tenant_assets = await self.list_tenant_assets(tenant_id)
            for asset in tenant_assets:
                await self.delete_asset(asset.asset_id)
            
            # Delete theme
            if tenant_id in self.tenant_themes:
                del self.tenant_themes[tenant_id]
            
            self.logger.info(f"Successfully deleted branding data for tenant {tenant_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to delete branding data for {tenant_id}: {e}")
            return False
            
    async def generate_theme_css(self, tenant_id: str) -> str:
        """Generate CSS for a tenant's theme."""
        try:
            if tenant_id not in self.tenant_themes:
                return await self.theme_engine.get_default_css()
                
            theme = self.tenant_themes[tenant_id]
            return await self.theme_engine.generate_css(theme)
            
        except Exception as e:
            self.logger.error(f"Failed to generate CSS for {tenant_id}: {e}")
            return await self.theme_engine.get_default_css()
            
    async def _validate_theme_config(self, config: Dict[str, Any]) -> None:
        """Validate theme configuration."""
        required_fields = ['primary_color', 'secondary_color', 'accent_color']
        
        for field in required_fields:
            if field not in config:
                raise ValueError(f"Missing required field: {field}")
                
        # Validate color formats
        color_fields = ['primary_color', 'secondary_color', 'accent_color', 'background_color', 'text_color']
        for field in color_fields:
            if field in config:
                color = config[field]
                if not (color.startswith('#') and len(color) in [4, 7]):
                    raise ValueError(f"Invalid color format for {field}: {color}")
                    
    async def _validate_asset(self, asset_type: AssetType, file_data: bytes, filename: str, mime_type: str) -> None:
        """Validate asset upload."""
        # Check file size
        constraints = self.asset_constraints.get(asset_type)
        if constraints and len(file_data) > constraints['max_size']:
            raise ValueError(f"File size exceeds limit for {asset_type.value}")
            
        # Check file format
        supported = self.supported_formats.get(asset_type, [])
        file_ext = filename.lower().split('.')[-1]
        if file_ext not in supported:
            raise ValueError(f"Unsupported file format for {asset_type.value}: {file_ext}")
            
        # Validate image dimensions for image assets
        if asset_type in [AssetType.LOGO, AssetType.FAVICON, AssetType.BACKGROUND, AssetType.ICON, AssetType.BANNER]:
            try:
                image = Image.open(io.BytesIO(file_data))
                width, height = image.size
                
                if constraints:
                    if width > constraints.get('max_width', float('inf')):
                        raise ValueError(f"Image width exceeds limit for {asset_type.value}")
                    if height > constraints.get('max_height', float('inf')):
                        raise ValueError(f"Image height exceeds limit for {asset_type.value}")
                        
            except Exception as e:
                if "cannot identify image file" in str(e):
                    raise ValueError(f"Invalid image file for {asset_type.value}")
                raise
                
    async def _process_asset(self, asset_type: AssetType, file_data: bytes) -> bytes:
        """Process and optimize asset."""
        try:
            # For non-image assets, return as-is
            if asset_type not in [AssetType.LOGO, AssetType.FAVICON, AssetType.BACKGROUND, AssetType.ICON, AssetType.BANNER]:
                return file_data
                
            # Process image
            image = Image.open(io.BytesIO(file_data))
            
            # Convert to RGB if necessary
            if image.mode in ('RGBA', 'LA', 'P'):
                background = Image.new('RGB', image.size, (255, 255, 255))
                if image.mode == 'P':
                    image = image.convert('RGBA')
                background.paste(image, mask=image.split()[-1] if image.mode == 'RGBA' else None)
                image = background
            elif image.mode != 'RGB':
                image = image.convert('RGB')
                
            # Resize if needed
            constraints = self.asset_constraints.get(asset_type)
            if constraints:
                max_width = constraints.get('max_width')
                max_height = constraints.get('max_height')
                
                if max_width and max_height:
                    image.thumbnail((max_width, max_height), Image.Resampling.LANCZOS)
                    
            # Optimize and save
            output = io.BytesIO()
            
            # Use appropriate format and quality
            if asset_type == AssetType.FAVICON:
                image.save(output, format='PNG', optimize=True)
            else:
                image.save(output, format='JPEG', quality=85, optimize=True)
                
            return output.getvalue()
            
        except Exception as e:
            self.logger.error(f"Failed to process asset: {e}")
            return file_data  # Return original on error
            
    async def _compile_theme_css(self, tenant_id: str) -> None:
        """Compile CSS for a tenant's theme."""
        try:
            if tenant_id not in self.tenant_themes:
                return
                
            theme = self.tenant_themes[tenant_id]
            await self.theme_engine.compile_theme_css(theme)
            
        except Exception as e:
            self.logger.error(f"Failed to compile theme CSS for {tenant_id}: {e}")
            
    async def _ensure_s3_bucket(self) -> None:
        """Ensure S3 bucket exists."""
        try:
            self.s3_client.head_bucket(Bucket=self.s3_bucket)
        except ClientError as e:
            if e.response['Error']['Code'] == '404':
                # Bucket doesn't exist, create it
                try:
                    self.s3_client.create_bucket(Bucket=self.s3_bucket)
                    self.logger.info(f"Created S3 bucket: {self.s3_bucket}")
                except ClientError as create_error:
                    self.logger.error(f"Failed to create S3 bucket: {create_error}")
                    raise
            else:
                raise
                
    async def _cleanup_expired_assets(self) -> None:
        """Background task to clean up expired assets."""
        while self.branding_active:
            try:
                # Clean up assets older than 90 days that are not referenced
                cutoff_date = datetime.utcnow() - timedelta(days=90)
                
                expired_assets = []
                for asset_id, asset in self.branding_assets.items():
                    if asset.created_at < cutoff_date:
                        # Check if asset is still referenced
                        is_referenced = False
                        for theme in self.tenant_themes.values():
                            if (theme.logo_url == asset.cdn_url or 
                                theme.favicon_url == asset.cdn_url):
                                is_referenced = True
                                break
                                
                        if not is_referenced:
                            expired_assets.append(asset_id)
                            
                # Delete expired assets
                for asset_id in expired_assets:
                    await self.delete_asset(asset_id)
                    
                if expired_assets:
                    self.logger.info(f"Cleaned up {len(expired_assets)} expired assets")
                    
                await asyncio.sleep(86400)  # Check daily
                
            except Exception as e:
                self.logger.error(f"Error in asset cleanup task: {e}")
                await asyncio.sleep(3600)  # Wait 1 hour on error
                
    async def _optimize_assets_background(self) -> None:
        """Background task to optimize assets."""
        while self.branding_active:
            try:
                # Re-optimize assets periodically
                for asset_id, asset in self.branding_assets.items():
                    if asset.asset_type in [AssetType.LOGO, AssetType.BACKGROUND]:
                        # Check if asset needs re-optimization
                        optimization_ratio = asset.metadata.get('optimization_ratio', 1.0)
                        if optimization_ratio > 0.8:  # If not well optimized
                            # Re-process asset (implementation would fetch and re-optimize)
                            pass
                            
                await asyncio.sleep(7200)  # Check every 2 hours
                
            except Exception as e:
                self.logger.error(f"Error in asset optimization task: {e}")
                await asyncio.sleep(3600)
                
    async def _sync_cdn_cache(self) -> None:
        """Background task to sync CDN cache."""
        while self.branding_active:
            try:
                # Invalidate CDN cache for updated assets
                # Implementation would integrate with CloudFront or other CDN
                
                await asyncio.sleep(1800)  # Check every 30 minutes
                
            except Exception as e:
                self.logger.error(f"Error in CDN sync task: {e}")
                await asyncio.sleep(3600)