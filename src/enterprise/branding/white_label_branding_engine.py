"""
ACSO Enterprise Framework - White-Label Branding Engine

This module implements a comprehensive white-label branding system that allows
enterprise customers to fully customize the ACSO platform with their own branding,
themes, and visual identity.

Key Features:
- Dynamic theme and UI customization
- Multi-brand management and asset handling
- Real-time branding preview and validation
- Brand asset optimization and CDN integration
- Compliance with brand guidelines
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import json
import uuid
import base64
import io
from PIL import Image, ImageOps
import colorsys
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class BrandAssetType(Enum):
    """Types of brand assets."""
    LOGO = "logo"
    FAVICON = "favicon"
    BACKGROUND = "background"
    ICON = "icon"
    BANNER = "banner"
    WATERMARK = "watermark"
    CUSTOM_IMAGE = "custom_image"

class ColorFormat(Enum):
    """Color format types."""
    HEX = "hex"
    RGB = "rgb"
    HSL = "hsl"
    RGBA = "rgba"

class ThemeMode(Enum):
    """Theme modes."""
    LIGHT = "light"
    DARK = "dark"
    AUTO = "auto"

@dataclass
class ColorPalette:
    """Brand color palette definition."""
    primary: str
    secondary: str
    accent: str
    background: str
    surface: str
    text_primary: str
    text_secondary: str
    success: str
    warning: str
    error: str
    info: str
    
    def to_dict(self) -> Dict[str, str]:
        """Convert to dictionary."""
        return {
            'primary': self.primary,
            'secondary': self.secondary,
            'accent': self.accent,
            'background': self.background,
            'surface': self.surface,
            'text_primary': self.text_primary,
            'text_secondary': self.text_secondary,
            'success': self.success,
            'warning': self.warning,
            'error': self.error,
            'info': self.info
        }

@dataclass
class Typography:
    """Typography configuration."""
    font_family_primary: str
    font_family_secondary: str
    font_size_base: str
    font_weight_normal: int
    font_weight_bold: int
    line_height_base: float
    letter_spacing: str
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary."""
        return {
            'font_family_primary': self.font_family_primary,
            'font_family_secondary': self.font_family_secondary,
            'font_size_base': self.font_size_base,
            'font_weight_normal': self.font_weight_normal,
            'font_weight_bold': self.font_weight_bold,
            'line_height_base': self.line_height_base,
            'letter_spacing': self.letter_spacing
        }

@dataclass
class BrandAsset:
    """Brand asset definition."""
    asset_id: str
    asset_type: BrandAssetType
    name: str
    file_path: str
    file_size: int
    mime_type: str
    dimensions: Optional[Dict[str, int]] = None
    alt_text: str = ""
    usage_guidelines: str = ""
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True
    cdn_url: Optional[str] = None
    optimized_variants: Dict[str, str] = field(default_factory=dict)

@dataclass
class BrandTheme:
    """Complete brand theme configuration."""
    theme_id: str
    name: str
    description: str
    mode: ThemeMode
    colors: ColorPalette
    typography: Typography
    assets: Dict[str, str]  # asset_type -> asset_id
    custom_css: str = ""
    component_overrides: Dict[str, Any] = field(default_factory=dict)
    layout_config: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True
    version: str = "1.0"

@dataclass
class BrandConfiguration:
    """Complete brand configuration for a tenant."""
    brand_id: str
    tenant_id: str
    brand_name: str
    company_name: str
    tagline: str
    primary_theme: str  # theme_id
    fallback_theme: str  # theme_id
    custom_domain: Optional[str] = None
    brand_guidelines: Dict[str, Any] = field(default_factory=dict)
    compliance_settings: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

class ColorAnalyzer:
    """Analyzes and validates brand colors."""
    
    @staticmethod
    def hex_to_rgb(hex_color: str) -> tuple:
        """Convert hex color to RGB."""
        hex_color = hex_color.lstrip('#')
        return tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
    
    @staticmethod
    def rgb_to_hex(rgb: tuple) -> str:
        """Convert RGB to hex color."""
        return f"#{rgb[0]:02x}{rgb[1]:02x}{rgb[2]:02x}"
    
    @staticmethod
    def calculate_contrast_ratio(color1: str, color2: str) -> float:
        """Calculate contrast ratio between two colors."""
        def get_luminance(color: str) -> float:
            rgb = ColorAnalyzer.hex_to_rgb(color)
            rgb_normalized = [c / 255.0 for c in rgb]
            
            def gamma_correct(c):
                return c / 12.92 if c <= 0.03928 else ((c + 0.055) / 1.055) ** 2.4
            
            rgb_linear = [gamma_correct(c) for c in rgb_normalized]
            return 0.2126 * rgb_linear[0] + 0.7152 * rgb_linear[1] + 0.0722 * rgb_linear[2]
        
        lum1 = get_luminance(color1)
        lum2 = get_luminance(color2)
        
        lighter = max(lum1, lum2)
        darker = min(lum1, lum2)
        
        return (lighter + 0.05) / (darker + 0.05)
    
    @staticmethod
    def validate_accessibility(foreground: str, background: str) -> Dict[str, Any]:
        """Validate color accessibility compliance."""
        contrast_ratio = ColorAnalyzer.calculate_contrast_ratio(foreground, background)
        
        return {
            'contrast_ratio': contrast_ratio,
            'wcag_aa_normal': contrast_ratio >= 4.5,
            'wcag_aa_large': contrast_ratio >= 3.0,
            'wcag_aaa_normal': contrast_ratio >= 7.0,
            'wcag_aaa_large': contrast_ratio >= 4.5
        }
    
    @staticmethod
    def generate_color_variants(base_color: str, count: int = 5) -> List[str]:
        """Generate color variants (lighter/darker shades)."""
        rgb = ColorAnalyzer.hex_to_rgb(base_color)
        hsl = colorsys.rgb_to_hls(rgb[0]/255, rgb[1]/255, rgb[2]/255)
        
        variants = []
        for i in range(count):
            # Create lighter and darker variants
            lightness_factor = 0.2 + (i * 0.15)
            new_lightness = min(1.0, hsl[1] * lightness_factor)
            
            new_rgb = colorsys.hls_to_rgb(hsl[0], new_lightness, hsl[2])
            new_rgb_int = tuple(int(c * 255) for c in new_rgb)
            variants.append(ColorAnalyzer.rgb_to_hex(new_rgb_int))
        
        return variants

class AssetProcessor:
    """Processes and optimizes brand assets."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize asset processor."""
        self.config = config
        self.s3_client = boto3.client('s3') if config.get('use_s3') else None
        self.cdn_base_url = config.get('cdn_base_url', '')
    
    async def process_asset(self, asset_data: bytes, asset_type: BrandAssetType, filename: str) -> BrandAsset:
        """Process and optimize a brand asset."""
        try:
            asset_id = str(uuid.uuid4())
            
            # Determine MIME type
            mime_type = self._get_mime_type(filename)
            
            # Process image if it's an image asset
            if asset_type in [BrandAssetType.LOGO, BrandAssetType.FAVICON, BrandAssetType.ICON]:
                processed_data, dimensions, variants = await self._process_image(asset_data, asset_type)
            else:
                processed_data = asset_data
                dimensions = None
                variants = {}
            
            # Upload to storage
            file_path = await self._upload_asset(asset_id, processed_data, mime_type)
            
            # Upload variants
            variant_urls = {}
            for variant_name, variant_data in variants.items():
                variant_path = await self._upload_asset(f"{asset_id}_{variant_name}", variant_data, mime_type)
                variant_urls[variant_name] = self._get_cdn_url(variant_path)
            
            # Create asset record
            asset = BrandAsset(
                asset_id=asset_id,
                asset_type=asset_type,
                name=filename,
                file_path=file_path,
                file_size=len(processed_data),
                mime_type=mime_type,
                dimensions=dimensions,
                cdn_url=self._get_cdn_url(file_path),
                optimized_variants=variant_urls
            )
            
            logger.info(f"Processed asset: {asset_id}")
            return asset
            
        except Exception as e:
            logger.error(f"Failed to process asset: {e}")
            raise
    
    async def _process_image(self, image_data: bytes, asset_type: BrandAssetType) -> tuple:
        """Process image asset with optimization."""
        try:
            # Open image
            image = Image.open(io.BytesIO(image_data))
            
            # Get dimensions
            dimensions = {'width': image.width, 'height': image.height}
            
            # Define size requirements based on asset type
            size_configs = {
                BrandAssetType.LOGO: [(200, 60), (400, 120), (800, 240)],
                BrandAssetType.FAVICON: [(16, 16), (32, 32), (64, 64)],
                BrandAssetType.ICON: [(24, 24), (48, 48), (96, 96)]
            }
            
            variants = {}
            
            if asset_type in size_configs:
                for size in size_configs[asset_type]:
                    # Resize image maintaining aspect ratio
                    resized = ImageOps.fit(image, size, Image.Resampling.LANCZOS)
                    
                    # Convert to bytes
                    output = io.BytesIO()
                    resized.save(output, format='PNG', optimize=True)
                    variants[f"{size[0]}x{size[1]}"] = output.getvalue()
            
            # Optimize original image
            optimized = io.BytesIO()
            image.save(optimized, format='PNG', optimize=True, quality=95)
            
            return optimized.getvalue(), dimensions, variants
            
        except Exception as e:
            logger.error(f"Failed to process image: {e}")
            raise
    
    def _get_mime_type(self, filename: str) -> str:
        """Get MIME type from filename."""
        extension = filename.lower().split('.')[-1]
        mime_types = {
            'png': 'image/png',
            'jpg': 'image/jpeg',
            'jpeg': 'image/jpeg',
            'gif': 'image/gif',
            'svg': 'image/svg+xml',
            'ico': 'image/x-icon',
            'css': 'text/css',
            'js': 'application/javascript'
        }
        return mime_types.get(extension, 'application/octet-stream')
    
    async def _upload_asset(self, asset_id: str, data: bytes, mime_type: str) -> str:
        """Upload asset to storage."""
        try:
            if self.s3_client:
                # Upload to S3
                bucket = self.config['s3_bucket']
                key = f"brand-assets/{asset_id}"
                
                self.s3_client.put_object(
                    Bucket=bucket,
                    Key=key,
                    Body=data,
                    ContentType=mime_type,
                    CacheControl='public, max-age=31536000'  # 1 year cache
                )
                
                return f"s3://{bucket}/{key}"
            else:
                # Local storage (for development)
                import os
                storage_dir = self.config.get('local_storage_dir', '/tmp/brand-assets')
                os.makedirs(storage_dir, exist_ok=True)
                
                file_path = os.path.join(storage_dir, asset_id)
                with open(file_path, 'wb') as f:
                    f.write(data)
                
                return file_path
                
        except Exception as e:
            logger.error(f"Failed to upload asset: {e}")
            raise
    
    def _get_cdn_url(self, file_path: str) -> str:
        """Get CDN URL for asset."""
        if file_path.startswith('s3://'):
            # Extract S3 key
            key = file_path.split('/', 3)[-1]
            return f"{self.cdn_base_url}/{key}"
        else:
            # Local file
            filename = file_path.split('/')[-1]
            return f"{self.cdn_base_url}/brand-assets/{filename}"

class ThemeGenerator:
    """Generates CSS themes from brand configuration."""
    
    def __init__(self):
        """Initialize theme generator."""
        self.color_analyzer = ColorAnalyzer()
    
    def generate_css_theme(self, theme: BrandTheme, assets: Dict[str, BrandAsset]) -> str:
        """Generate CSS theme from brand theme configuration."""
        try:
            css_parts = []
            
            # CSS Custom Properties (Variables)
            css_parts.append(":root {")
            
            # Color variables
            colors = theme.colors.to_dict()
            for color_name, color_value in colors.items():
                css_parts.append(f"  --color-{color_name.replace('_', '-')}: {color_value};")
            
            # Typography variables
            typography = theme.typography.to_dict()
            for typo_name, typo_value in typography.items():
                css_parts.append(f"  --{typo_name.replace('_', '-')}: {typo_value};")
            
            # Asset URLs
            for asset_type, asset_id in theme.assets.items():
                if asset_id in assets:
                    asset = assets[asset_id]
                    css_parts.append(f"  --asset-{asset_type.replace('_', '-')}: url('{asset.cdn_url}');")
            
            css_parts.append("}")
            css_parts.append("")
            
            # Base styles
            css_parts.extend(self._generate_base_styles(theme))
            
            # Component styles
            css_parts.extend(self._generate_component_styles(theme))
            
            # Custom CSS
            if theme.custom_css:
                css_parts.append("/* Custom CSS */")
                css_parts.append(theme.custom_css)
            
            return "\n".join(css_parts)
            
        except Exception as e:
            logger.error(f"Failed to generate CSS theme: {e}")
            raise
    
    def _generate_base_styles(self, theme: BrandTheme) -> List[str]:
        """Generate base CSS styles."""
        styles = [
            "/* Base Styles */",
            "body {",
            "  font-family: var(--font-family-primary);",
            "  font-size: var(--font-size-base);",
            "  line-height: var(--line-height-base);",
            "  color: var(--color-text-primary);",
            "  background-color: var(--color-background);",
            "  margin: 0;",
            "  padding: 0;",
            "}",
            "",
            "h1, h2, h3, h4, h5, h6 {",
            "  font-family: var(--font-family-secondary);",
            "  font-weight: var(--font-weight-bold);",
            "  color: var(--color-text-primary);",
            "}",
            "",
            "a {",
            "  color: var(--color-primary);",
            "  text-decoration: none;",
            "}",
            "",
            "a:hover {",
            "  color: var(--color-secondary);",
            "}"
        ]
        
        return styles
    
    def _generate_component_styles(self, theme: BrandTheme) -> List[str]:
        """Generate component-specific styles."""
        styles = [
            "/* Component Styles */",
            ".btn-primary {",
            "  background-color: var(--color-primary);",
            "  color: white;",
            "  border: none;",
            "  padding: 0.75rem 1.5rem;",
            "  border-radius: 0.375rem;",
            "  font-weight: var(--font-weight-bold);",
            "  cursor: pointer;",
            "  transition: background-color 0.2s;",
            "}",
            "",
            ".btn-primary:hover {",
            "  background-color: var(--color-secondary);",
            "}",
            "",
            ".card {",
            "  background-color: var(--color-surface);",
            "  border-radius: 0.5rem;",
            "  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.1);",
            "  padding: 1.5rem;",
            "}",
            "",
            ".navbar {",
            "  background-color: var(--color-primary);",
            "  color: white;",
            "  padding: 1rem;",
            "}",
            "",
            ".logo {",
            "  background-image: var(--asset-logo);",
            "  background-size: contain;",
            "  background-repeat: no-repeat;",
            "  background-position: center;",
            "}"
        ]
        
        return styles