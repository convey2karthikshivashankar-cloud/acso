"""
ACSO Enterprise Framework - Dynamic UI Customization Engine

This module implements dynamic theme and UI customization capabilities that allow
real-time preview and modification of branding elements without requiring
application restarts or deployments.

Key Features:
- Real-time theme preview and validation
- Component-level customization
- Dynamic CSS generation and injection
- Multi-brand management with instant switching
- Theme inheritance and overrides
- Performance-optimized asset delivery
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union, Callable
from dataclasses import dataclass, field
from enum import Enum
from abc import ABC, abstractmethod
import json
import uuid
import hashlib
import base64
from concurrent.futures import ThreadPoolExecutor
import websockets
import boto3
from botocore.exceptions import ClientError

logger = logging.getLogger(__name__)

class CustomizationScope(Enum):
    """Scope of UI customization."""
    GLOBAL = "global"
    TENANT = "tenant"
    USER = "user"
    SESSION = "session"

class ComponentType(Enum):
    """Types of UI components that can be customized."""
    HEADER = "header"
    SIDEBAR = "sidebar"
    FOOTER = "footer"
    BUTTON = "button"
    CARD = "card"
    TABLE = "table"
    FORM = "form"
    MODAL = "modal"
    NAVIGATION = "navigation"
    DASHBOARD = "dashboard"
    CHART = "chart"
    NOTIFICATION = "notification"

class PreviewMode(Enum):
    """Theme preview modes."""
    LIVE = "live"
    STAGED = "staged"
    COMPARISON = "comparison"

@dataclass
class ComponentCustomization:
    """Customization settings for a specific component."""
    component_id: str
    component_type: ComponentType
    styles: Dict[str, Any]
    layout: Dict[str, Any] = field(default_factory=dict)
    behavior: Dict[str, Any] = field(default_factory=dict)
    content: Dict[str, Any] = field(default_factory=dict)
    visibility: Dict[str, bool] = field(default_factory=dict)
    permissions: List[str] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

@dataclass
class ThemeOverride:
    """Theme override configuration."""
    override_id: str
    base_theme_id: str
    scope: CustomizationScope
    target_id: str  # tenant_id, user_id, or session_id
    overrides: Dict[str, Any]
    component_customizations: Dict[str, ComponentCustomization] = field(default_factory=dict)
    priority: int = 0
    expires_at: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)
    is_active: bool = True

@dataclass
class PreviewSession:
    """Theme preview session."""
    session_id: str
    user_id: str
    theme_id: str
    customizations: Dict[str, Any]
    preview_mode: PreviewMode
    websocket_connections: List[Any] = field(default_factory=list)
    created_at: datetime = field(default_factory=datetime.now)
    expires_at: datetime = field(default_factory=lambda: datetime.now() + timedelta(hours=2))
    is_active: bool = True

class CSSProcessor:
    """Processes and optimizes CSS for dynamic themes."""
    
    def __init__(self):
        """Initialize CSS processor."""
        self.cache = {}
        self.minify_enabled = True
    
    def process_dynamic_css(
        self,
        base_css: str,
        overrides: Dict[str, Any],
        component_customizations: Dict[str, ComponentCustomization]
    ) -> str:
        """Process CSS with dynamic overrides."""
        try:
            # Create cache key
            cache_key = self._generate_cache_key(base_css, overrides, component_customizations)
            
            if cache_key in self.cache:
                return self.cache[cache_key]
            
            # Start with base CSS
            processed_css = base_css
            
            # Apply global overrides
            if 'colors' in overrides:
                processed_css = self._apply_color_overrides(processed_css, overrides['colors'])
            
            if 'typography' in overrides:
                processed_css = self._apply_typography_overrides(processed_css, overrides['typography'])
            
            if 'spacing' in overrides:
                processed_css = self._apply_spacing_overrides(processed_css, overrides['spacing'])
            
            # Apply component customizations
            for comp_id, customization in component_customizations.items():
                processed_css = self._apply_component_customization(processed_css, customization)
            
            # Add custom CSS if provided
            if 'custom_css' in overrides:
                processed_css += f"\\n/* Custom CSS */\\n{overrides['custom_css']}"
            
            # Minify if enabled
            if self.minify_enabled:
                processed_css = self._minify_css(processed_css)
            
            # Cache result
            self.cache[cache_key] = processed_css
            
            return processed_css
            
        except Exception as e:
            logger.error(f"Failed to process dynamic CSS: {e}")
            return base_css
    
    def _apply_color_overrides(self, css: str, color_overrides: Dict[str, str]) -> str:
        """Apply color overrides to CSS."""
        for color_var, color_value in color_overrides.items():
            # Replace CSS custom properties
            css = css.replace(f"var(--color-{color_var})", color_value)
            css = css.replace(f"--color-{color_var}: #", f"--color-{color_var}: {color_value.lstrip('#')}")
        
        return css
    
    def _apply_typography_overrides(self, css: str, typography_overrides: Dict[str, Any]) -> str:
        """Apply typography overrides to CSS."""
        for typo_var, typo_value in typography_overrides.items():
            css = css.replace(f"var(--{typo_var})", str(typo_value))
            css = css.replace(f"--{typo_var}:", f"--{typo_var}: {typo_value};")
        
        return css
    
    def _apply_spacing_overrides(self, css: str, spacing_overrides: Dict[str, str]) -> str:
        """Apply spacing overrides to CSS."""
        for spacing_var, spacing_value in spacing_overrides.items():
            css = css.replace(f"var(--spacing-{spacing_var})", spacing_value)
            css = css.replace(f"--spacing-{spacing_var}:", f"--spacing-{spacing_var}: {spacing_value};")
        
        return css
    
    def _apply_component_customization(self, css: str, customization: ComponentCustomization) -> str:
        """Apply component-specific customizations."""
        component_css = f"\\n/* {customization.component_type.value} customization */\\n"
        
        # Generate component-specific CSS
        selector = f".{customization.component_type.value}-{customization.component_id}"
        
        if customization.styles:
            component_css += f"{selector} {{\\n"
            for property_name, property_value in customization.styles.items():
                # Convert camelCase to kebab-case
                css_property = self._camel_to_kebab(property_name)
                component_css += f"  {css_property}: {property_value};\\n"
            component_css += "}\\n"
        
        # Add layout customizations
        if customization.layout:
            component_css += f"{selector} {{\\n"
            for layout_prop, layout_value in customization.layout.items():
                css_property = self._camel_to_kebab(layout_prop)
                component_css += f"  {css_property}: {layout_value};\\n"
            component_css += "}\\n"
        
        # Add visibility rules
        if customization.visibility:
            for breakpoint, is_visible in customization.visibility.items():
                if not is_visible:
                    if breakpoint == "mobile":
                        component_css += f"@media (max-width: 768px) {{ {selector} {{ display: none; }} }}\\n"
                    elif breakpoint == "tablet":
                        component_css += f"@media (min-width: 769px) and (max-width: 1024px) {{ {selector} {{ display: none; }} }}\\n"
                    elif breakpoint == "desktop":
                        component_css += f"@media (min-width: 1025px) {{ {selector} {{ display: none; }} }}\\n"
        
        return css + component_css
    
    def _camel_to_kebab(self, camel_str: str) -> str:
        """Convert camelCase to kebab-case."""
        import re
        return re.sub(r'(?<!^)(?=[A-Z])', '-', camel_str).lower()
    
    def _minify_css(self, css: str) -> str:
        """Basic CSS minification."""
        import re
        
        # Remove comments
        css = re.sub(r'/\\*.*?\\*/', '', css, flags=re.DOTALL)
        
        # Remove extra whitespace
        css = re.sub(r'\\s+', ' ', css)
        
        # Remove whitespace around certain characters
        css = re.sub(r'\\s*([{}:;,>+~])\\s*', r'\\1', css)
        
        # Remove trailing semicolons
        css = re.sub(r';\\s*}', '}', css)
        
        return css.strip()
    
    def _generate_cache_key(
        self,
        base_css: str,
        overrides: Dict[str, Any],
        component_customizations: Dict[str, ComponentCustomization]
    ) -> str:
        """Generate cache key for CSS processing."""
        content = f"{base_css}{json.dumps(overrides, sort_keys=True)}"
        for comp_id, customization in component_customizations.items():
            content += f"{comp_id}{customization.styles}{customization.layout}"
        
        return hashlib.md5(content.encode()).hexdigest()

class RealTimePreviewManager:
    """Manages real-time theme preview sessions."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize preview manager."""
        self.config = config
        self.active_sessions: Dict[str, PreviewSession] = {}
        self.css_processor = CSSProcessor()
        self.websocket_server = None
        self.executor = ThreadPoolExecutor(max_workers=10)
    
    async def start_preview_session(
        self,
        user_id: str,
        theme_id: str,
        customizations: Dict[str, Any],
        preview_mode: PreviewMode = PreviewMode.LIVE
    ) -> Dict[str, Any]:
        """Start a new theme preview session."""
        try:
            session_id = str(uuid.uuid4())
            
            session = PreviewSession(
                session_id=session_id,
                user_id=user_id,
                theme_id=theme_id,
                customizations=customizations,
                preview_mode=preview_mode
            )
            
            self.active_sessions[session_id] = session
            
            # Generate initial CSS
            css_content = await self._generate_preview_css(session)
            
            # Start WebSocket server if not already running
            if not self.websocket_server:
                await self._start_websocket_server()
            
            logger.info(f"Started preview session: {session_id}")
            
            return {
                'success': True,
                'session_id': session_id,
                'css_content': css_content,
                'websocket_url': f"ws://localhost:{self.config.get('websocket_port', 8765)}/preview/{session_id}"
            }
            
        except Exception as e:
            logger.error(f"Failed to start preview session: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def update_preview(
        self,
        session_id: str,
        customizations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Update an active preview session."""
        try:
            if session_id not in self.active_sessions:
                return {
                    'success': False,
                    'error': 'Preview session not found'
                }
            
            session = self.active_sessions[session_id]
            session.customizations.update(customizations)
            session.updated_at = datetime.now()
            
            # Generate updated CSS
            css_content = await self._generate_preview_css(session)
            
            # Broadcast to connected WebSocket clients
            await self._broadcast_to_session(session_id, {
                'type': 'css_update',
                'css_content': css_content,
                'timestamp': datetime.now().isoformat()
            })
            
            return {
                'success': True,
                'css_content': css_content
            }
            
        except Exception as e:
            logger.error(f"Failed to update preview: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def end_preview_session(self, session_id: str) -> Dict[str, Any]:
        """End a preview session."""
        try:
            if session_id in self.active_sessions:
                session = self.active_sessions[session_id]
                
                # Close WebSocket connections
                for ws in session.websocket_connections:
                    try:
                        await ws.close()
                    except:
                        pass
                
                # Remove session
                del self.active_sessions[session_id]
                
                logger.info(f"Ended preview session: {session_id}")
                
                return {
                    'success': True,
                    'message': 'Preview session ended'
                }
            else:
                return {
                    'success': False,
                    'error': 'Preview session not found'
                }
                
        except Exception as e:
            logger.error(f"Failed to end preview session: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _generate_preview_css(self, session: PreviewSession) -> str:
        """Generate CSS for preview session."""
        try:
            # Get base theme CSS (would load from storage in real implementation)
            base_css = await self._get_base_theme_css(session.theme_id)
            
            # Convert customizations to component customizations
            component_customizations = self._convert_to_component_customizations(
                session.customizations.get('components', {})
            )
            
            # Process CSS with customizations
            processed_css = self.css_processor.process_dynamic_css(
                base_css,
                session.customizations,
                component_customizations
            )
            
            return processed_css
            
        except Exception as e:
            logger.error(f"Failed to generate preview CSS: {e}")
            return ""
    
    async def _get_base_theme_css(self, theme_id: str) -> str:
        """Get base theme CSS (placeholder implementation)."""
        # This would load from storage in a real implementation
        return """
        :root {
            --color-primary: #007bff;
            --color-secondary: #6c757d;
            --color-background: #ffffff;
            --color-text-primary: #212529;
            --font-family-primary: Inter, sans-serif;
            --font-size-base: 16px;
            --spacing-sm: 0.5rem;
            --spacing-md: 1rem;
            --spacing-lg: 1.5rem;
        }
        
        body {
            font-family: var(--font-family-primary);
            font-size: var(--font-size-base);
            color: var(--color-text-primary);
            background-color: var(--color-background);
        }
        
        .btn-primary {
            background-color: var(--color-primary);
            color: white;
            padding: var(--spacing-sm) var(--spacing-md);
            border: none;
            border-radius: 0.375rem;
        }
        """
    
    def _convert_to_component_customizations(
        self,
        components_config: Dict[str, Any]
    ) -> Dict[str, ComponentCustomization]:
        """Convert component configuration to ComponentCustomization objects."""
        customizations = {}
        
        for comp_id, config in components_config.items():
            component_type = ComponentType(config.get('type', 'button'))
            
            customization = ComponentCustomization(
                component_id=comp_id,
                component_type=component_type,
                styles=config.get('styles', {}),
                layout=config.get('layout', {}),
                behavior=config.get('behavior', {}),
                content=config.get('content', {}),
                visibility=config.get('visibility', {}),
                permissions=config.get('permissions', [])
            )
            
            customizations[comp_id] = customization
        
        return customizations
    
    async def _start_websocket_server(self):
        """Start WebSocket server for real-time updates."""
        try:
            port = self.config.get('websocket_port', 8765)
            
            async def handle_websocket(websocket, path):
                try:
                    # Extract session ID from path
                    session_id = path.split('/')[-1]
                    
                    if session_id in self.active_sessions:
                        session = self.active_sessions[session_id]
                        session.websocket_connections.append(websocket)
                        
                        logger.info(f"WebSocket connected to session: {session_id}")
                        
                        # Keep connection alive
                        async for message in websocket:
                            # Handle incoming messages if needed
                            pass
                    else:
                        await websocket.close(code=4004, reason="Session not found")
                        
                except websockets.exceptions.ConnectionClosed:
                    pass
                except Exception as e:
                    logger.error(f"WebSocket error: {e}")
                finally:
                    # Remove from session connections
                    for session in self.active_sessions.values():
                        if websocket in session.websocket_connections:
                            session.websocket_connections.remove(websocket)
            
            self.websocket_server = await websockets.serve(
                handle_websocket,
                "localhost",
                port
            )
            
            logger.info(f"WebSocket server started on port {port}")
            
        except Exception as e:
            logger.error(f"Failed to start WebSocket server: {e}")
    
    async def _broadcast_to_session(self, session_id: str, message: Dict[str, Any]):
        """Broadcast message to all WebSocket connections in a session."""
        if session_id not in self.active_sessions:
            return
        
        session = self.active_sessions[session_id]
        message_json = json.dumps(message)
        
        # Send to all connected clients
        disconnected = []
        for ws in session.websocket_connections:
            try:
                await ws.send(message_json)
            except websockets.exceptions.ConnectionClosed:
                disconnected.append(ws)
            except Exception as e:
                logger.error(f"Failed to send WebSocket message: {e}")
                disconnected.append(ws)
        
        # Remove disconnected clients
        for ws in disconnected:
            session.websocket_connections.remove(ws)

class MultiBrandManager:
    """Manages multiple brand configurations and switching."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize multi-brand manager."""
        self.config = config
        self.brand_cache: Dict[str, Any] = {}
        self.theme_overrides: Dict[str, ThemeOverride] = {}
        self.cache_ttl = timedelta(minutes=30)
    
    async def get_effective_theme(
        self,
        base_theme_id: str,
        tenant_id: Optional[str] = None,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Get effective theme with all applicable overrides."""
        try:
            # Get base theme
            base_theme = await self._get_theme_from_cache(base_theme_id)
            if not base_theme:
                return {
                    'success': False,
                    'error': 'Base theme not found'
                }
            
            # Collect applicable overrides in priority order
            overrides = []
            
            # Global overrides (lowest priority)
            global_overrides = await self._get_overrides_by_scope(CustomizationScope.GLOBAL)
            overrides.extend(global_overrides)
            
            # Tenant overrides
            if tenant_id:
                tenant_overrides = await self._get_overrides_by_scope(
                    CustomizationScope.TENANT, tenant_id
                )
                overrides.extend(tenant_overrides)
            
            # User overrides
            if user_id:
                user_overrides = await self._get_overrides_by_scope(
                    CustomizationScope.USER, user_id
                )
                overrides.extend(user_overrides)
            
            # Session overrides (highest priority)
            if session_id:
                session_overrides = await self._get_overrides_by_scope(
                    CustomizationScope.SESSION, session_id
                )
                overrides.extend(session_overrides)
            
            # Sort by priority
            overrides.sort(key=lambda x: x.priority)
            
            # Apply overrides to base theme
            effective_theme = self._apply_theme_overrides(base_theme, overrides)
            
            return {
                'success': True,
                'theme': effective_theme,
                'applied_overrides': [o.override_id for o in overrides]
            }
            
        except Exception as e:
            logger.error(f"Failed to get effective theme: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def create_theme_override(
        self,
        base_theme_id: str,
        scope: CustomizationScope,
        target_id: str,
        overrides: Dict[str, Any],
        priority: int = 0,
        expires_at: Optional[datetime] = None
    ) -> Dict[str, Any]:
        """Create a new theme override."""
        try:
            override_id = str(uuid.uuid4())
            
            theme_override = ThemeOverride(
                override_id=override_id,
                base_theme_id=base_theme_id,
                scope=scope,
                target_id=target_id,
                overrides=overrides,
                priority=priority,
                expires_at=expires_at
            )
            
            # Convert component overrides
            if 'components' in overrides:
                for comp_id, comp_config in overrides['components'].items():
                    component_type = ComponentType(comp_config.get('type', 'button'))
                    
                    customization = ComponentCustomization(
                        component_id=comp_id,
                        component_type=component_type,
                        styles=comp_config.get('styles', {}),
                        layout=comp_config.get('layout', {}),
                        behavior=comp_config.get('behavior', {}),
                        content=comp_config.get('content', {}),
                        visibility=comp_config.get('visibility', {}),
                        permissions=comp_config.get('permissions', [])
                    )
                    
                    theme_override.component_customizations[comp_id] = customization
            
            # Store override
            self.theme_overrides[override_id] = theme_override
            
            # Save to persistent storage (implementation would save to database)
            await self._save_theme_override(theme_override)
            
            logger.info(f"Created theme override: {override_id}")
            
            return {
                'success': True,
                'override_id': override_id
            }
            
        except Exception as e:
            logger.error(f"Failed to create theme override: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def switch_brand_context(
        self,
        session_id: str,
        brand_id: str,
        theme_id: Optional[str] = None
    ) -> Dict[str, Any]:
        """Switch brand context for a session."""
        try:
            # Get brand configuration
            brand_config = await self._get_brand_configuration(brand_id)
            if not brand_config:
                return {
                    'success': False,
                    'error': 'Brand configuration not found'
                }
            
            # Use provided theme or brand's primary theme
            effective_theme_id = theme_id or brand_config.get('primary_theme')
            
            # Create session override for brand switching
            override_result = await self.create_theme_override(
                base_theme_id=effective_theme_id,
                scope=CustomizationScope.SESSION,
                target_id=session_id,
                overrides={
                    'brand_context': {
                        'brand_id': brand_id,
                        'brand_name': brand_config.get('brand_name'),
                        'company_name': brand_config.get('company_name'),
                        'custom_domain': brand_config.get('custom_domain')
                    }
                },
                priority=1000,  # High priority for brand switching
                expires_at=datetime.now() + timedelta(hours=24)
            )
            
            if not override_result['success']:
                return override_result
            
            return {
                'success': True,
                'brand_id': brand_id,
                'theme_id': effective_theme_id,
                'override_id': override_result['override_id']
            }
            
        except Exception as e:
            logger.error(f"Failed to switch brand context: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def _get_theme_from_cache(self, theme_id: str) -> Optional[Dict[str, Any]]:
        """Get theme from cache or storage."""
        cache_key = f"theme_{theme_id}"
        
        if cache_key in self.brand_cache:
            cached_item = self.brand_cache[cache_key]
            if datetime.now() - cached_item['cached_at'] < self.cache_ttl:
                return cached_item['data']
        
        # Load from storage (placeholder implementation)
        theme_data = await self._load_theme_from_storage(theme_id)
        
        if theme_data:
            self.brand_cache[cache_key] = {
                'data': theme_data,
                'cached_at': datetime.now()
            }
        
        return theme_data
    
    async def _load_theme_from_storage(self, theme_id: str) -> Optional[Dict[str, Any]]:
        """Load theme from storage (placeholder implementation)."""
        # This would load from database in real implementation
        return {
            'theme_id': theme_id,
            'name': 'Default Theme',
            'colors': {
                'primary': '#007bff',
                'secondary': '#6c757d',
                'background': '#ffffff',
                'text_primary': '#212529'
            },
            'typography': {
                'font_family_primary': 'Inter, sans-serif',
                'font_size_base': '16px'
            }
        }
    
    async def _get_overrides_by_scope(
        self,
        scope: CustomizationScope,
        target_id: Optional[str] = None
    ) -> List[ThemeOverride]:
        """Get theme overrides by scope."""
        overrides = []
        
        for override in self.theme_overrides.values():
            if override.scope == scope and override.is_active:
                if scope == CustomizationScope.GLOBAL or override.target_id == target_id:
                    # Check if override has expired
                    if override.expires_at and datetime.now() > override.expires_at:
                        override.is_active = False
                        continue
                    
                    overrides.append(override)
        
        return overrides
    
    def _apply_theme_overrides(
        self,
        base_theme: Dict[str, Any],
        overrides: List[ThemeOverride]
    ) -> Dict[str, Any]:
        """Apply theme overrides to base theme."""
        effective_theme = base_theme.copy()
        
        for override in overrides:
            # Deep merge overrides
            effective_theme = self._deep_merge(effective_theme, override.overrides)
        
        return effective_theme
    
    def _deep_merge(self, base: Dict[str, Any], override: Dict[str, Any]) -> Dict[str, Any]:
        """Deep merge two dictionaries."""
        result = base.copy()
        
        for key, value in override.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self._deep_merge(result[key], value)
            else:
                result[key] = value
        
        return result
    
    async def _get_brand_configuration(self, brand_id: str) -> Optional[Dict[str, Any]]:
        """Get brand configuration (placeholder implementation)."""
        # This would load from database in real implementation
        return {
            'brand_id': brand_id,
            'brand_name': 'Sample Brand',
            'company_name': 'Sample Company',
            'primary_theme': 'default_theme_id',
            'custom_domain': 'sample.example.com'
        }
    
    async def _save_theme_override(self, theme_override: ThemeOverride) -> bool:
        """Save theme override to storage (placeholder implementation)."""
        # This would save to database in real implementation
        logger.info(f"Saved theme override: {theme_override.override_id}")
        return True

class DynamicUICustomizer:
    """Main dynamic UI customization engine."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize dynamic UI customizer."""
        self.config = config
        self.preview_manager = RealTimePreviewManager(config)
        self.multi_brand_manager = MultiBrandManager(config)
        self.css_processor = CSSProcessor()
        
        logger.info("Dynamic UI customizer initialized")
    
    async def start_customization_session(
        self,
        user_id: str,
        brand_id: str,
        theme_id: Optional[str] = None,
        initial_customizations: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Start a new UI customization session."""
        try:
            # Get effective theme
            theme_result = await self.multi_brand_manager.get_effective_theme(
                base_theme_id=theme_id or 'default',
                user_id=user_id
            )
            
            if not theme_result['success']:
                return theme_result
            
            # Start preview session
            preview_result = await self.preview_manager.start_preview_session(
                user_id=user_id,
                theme_id=theme_result['theme']['theme_id'],
                customizations=initial_customizations or {},
                preview_mode=PreviewMode.LIVE
            )
            
            if not preview_result['success']:
                return preview_result
            
            return {
                'success': True,
                'session_id': preview_result['session_id'],
                'websocket_url': preview_result['websocket_url'],
                'initial_css': preview_result['css_content'],
                'base_theme': theme_result['theme']
            }
            
        except Exception as e:
            logger.error(f"Failed to start customization session: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def apply_customizations(
        self,
        session_id: str,
        customizations: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Apply customizations to an active session."""
        return await self.preview_manager.update_preview(session_id, customizations)
    
    async def save_customizations(
        self,
        session_id: str,
        scope: CustomizationScope,
        target_id: str,
        name: str = "Custom Theme"
    ) -> Dict[str, Any]:
        """Save customizations as a permanent theme override."""
        try:
            if session_id not in self.preview_manager.active_sessions:
                return {
                    'success': False,
                    'error': 'Session not found'
                }
            
            session = self.preview_manager.active_sessions[session_id]
            
            # Create theme override
            override_result = await self.multi_brand_manager.create_theme_override(
                base_theme_id=session.theme_id,
                scope=scope,
                target_id=target_id,
                overrides=session.customizations,
                priority=100
            )
            
            if override_result['success']:
                logger.info(f"Saved customizations as override: {override_result['override_id']}")
            
            return override_result
            
        except Exception as e:
            logger.error(f"Failed to save customizations: {e}")
            return {
                'success': False,
                'error': str(e)
            }
    
    async def get_customization_options(self) -> Dict[str, Any]:
        """Get available customization options."""
        return {
            'success': True,
            'options': {
                'colors': {
                    'primary': {'type': 'color', 'label': 'Primary Color'},
                    'secondary': {'type': 'color', 'label': 'Secondary Color'},
                    'accent': {'type': 'color', 'label': 'Accent Color'},
                    'background': {'type': 'color', 'label': 'Background Color'},
                    'text_primary': {'type': 'color', 'label': 'Primary Text Color'},
                    'text_secondary': {'type': 'color', 'label': 'Secondary Text Color'}
                },
                'typography': {
                    'font_family_primary': {'type': 'select', 'label': 'Primary Font', 'options': [
                        'Inter, sans-serif',
                        'Roboto, sans-serif',
                        'Open Sans, sans-serif',
                        'Lato, sans-serif'
                    ]},
                    'font_size_base': {'type': 'select', 'label': 'Base Font Size', 'options': [
                        '14px', '16px', '18px', '20px'
                    ]},
                    'font_weight_normal': {'type': 'range', 'label': 'Normal Weight', 'min': 100, 'max': 900, 'step': 100},
                    'font_weight_bold': {'type': 'range', 'label': 'Bold Weight', 'min': 100, 'max': 900, 'step': 100}
                },
                'spacing': {
                    'spacing_sm': {'type': 'text', 'label': 'Small Spacing'},
                    'spacing_md': {'type': 'text', 'label': 'Medium Spacing'},
                    'spacing_lg': {'type': 'text', 'label': 'Large Spacing'}
                },
                'components': {
                    'button': {
                        'border_radius': {'type': 'range', 'label': 'Button Border Radius', 'min': 0, 'max': 20, 'step': 1, 'unit': 'px'},
                        'padding': {'type': 'text', 'label': 'Button Padding'},
                        'font_weight': {'type': 'range', 'label': 'Button Font Weight', 'min': 100, 'max': 900, 'step': 100}
                    },
                    'card': {
                        'border_radius': {'type': 'range', 'label': 'Card Border Radius', 'min': 0, 'max': 20, 'step': 1, 'unit': 'px'},
                        'shadow': {'type': 'select', 'label': 'Card Shadow', 'options': [
                            'none', 'sm', 'md', 'lg', 'xl'
                        ]},
                        'padding': {'type': 'text', 'label': 'Card Padding'}
                    }
                }
            }
        }

# Example usage
if __name__ == "__main__":
    # Example configuration
    config = {
        'websocket_port': 8765,
        'use_s3': False,
        'local_storage_dir': '/tmp/acso-ui-customization'
    }
    
    # Initialize customizer
    customizer = DynamicUICustomizer(config)
    
    # Example usage
    async def example_usage():
        # Start customization session
        session_result = await customizer.start_customization_session(
            user_id="user_123",
            brand_id="brand_456",
            initial_customizations={
                'colors': {
                    'primary': '#1e40af',
                    'secondary': '#64748b'
                },
                'typography': {
                    'font_family_primary': 'Roboto, sans-serif'
                }
            }
        )
        
        if session_result['success']:
            session_id = session_result['session_id']
            print(f"Started customization session: {session_id}")
            
            # Apply more customizations
            await customizer.apply_customizations(session_id, {
                'colors': {
                    'accent': '#059669'
                },
                'components': {
                    'primary_button': {
                        'type': 'button',
                        'styles': {
                            'borderRadius': '8px',
                            'fontWeight': '600'
                        }
                    }
                }
            })
            
            # Save customizations
            save_result = await customizer.save_customizations(
                session_id=session_id,
                scope=CustomizationScope.USER,
                target_id="user_123",
                name="My Custom Theme"
            )
            
            if save_result['success']:
                print(f"Saved customizations: {save_result['override_id']}")
        
        else:
            print(f"Failed to start session: {session_result['error']}")
    
    # Run example
    import asyncio
    asyncio.run(example_usage())