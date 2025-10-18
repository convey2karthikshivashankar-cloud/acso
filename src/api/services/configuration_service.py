"""
Configuration management service for ACSO agents.
"""

import json
import logging
from datetime import datetime
from typing import List, Optional, Dict, Any, Tuple
from uuid import uuid4
from copy import deepcopy

from ..models.agent import (
    AgentConfiguration, ConfigurationVersion, ConfigurationTemplate,
    ConfigurationValidationResult, ConfigurationDiff, ConfigurationComparison,
    BulkConfigurationRequest, BulkConfigurationResult, AgentType,
    DEFAULT_CONFIGURATIONS
)
from ..models.responses import ErrorCode
from ..utils.errors import (
    ResourceNotFoundException, ValidationException, BusinessRuleException
)
from ..websocket.router import notify_agents_update

logger = logging.getLogger(__name__)


class ConfigurationService:
    """Service for managing agent configurations."""
    
    def __init__(self):
        # Configuration versions storage
        self.configuration_versions: Dict[str, List[ConfigurationVersion]] = {}
        
        # Configuration templates storage
        self.configuration_templates: Dict[str, ConfigurationTemplate] = {}
        
        # Configuration backups
        self.configuration_backups: Dict[str, Dict[str, Any]] = {}
        
        # Initialize default templates
        self._initialize_default_templates()
    
    def _initialize_default_templates(self):
        """Initialize default configuration templates."""
        for agent_type, config in DEFAULT_CONFIGURATIONS.items():
            template_id = f"default_{agent_type.value}"
            template = ConfigurationTemplate(
                id=template_id,
                name=f"Default {agent_type.value.replace('_', ' ').title()}",
                description=f"Default configuration template for {agent_type.value} agents",
                agent_type=agent_type,
                configuration=config,
                created_at=datetime.utcnow(),
                created_by="system",
                is_default=True,
                tags=["default", "system"]
            )
            self.configuration_templates[template_id] = template
    
    async def get_agent_configuration_versions(
        self, 
        agent_id: str,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[ConfigurationVersion], int]:
        """Get configuration versions for an agent."""
        if agent_id not in self.configuration_versions:
            return [], 0
        
        versions = self.configuration_versions[agent_id]
        total = len(versions)
        
        # Sort by version number (descending)
        sorted_versions = sorted(versions, key=lambda v: v.version, reverse=True)
        paginated_versions = sorted_versions[offset:offset + limit]
        
        return paginated_versions, total
    
    async def get_configuration_version(
        self, 
        agent_id: str, 
        version: int
    ) -> ConfigurationVersion:
        """Get a specific configuration version."""
        if agent_id not in self.configuration_versions:
            raise ResourceNotFoundException("Agent configuration", agent_id)
        
        versions = self.configuration_versions[agent_id]
        for config_version in versions:
            if config_version.version == version:
                return config_version
        
        raise ResourceNotFoundException("Configuration version", f"{agent_id}:v{version}")
    
    async def create_configuration_version(
        self,
        agent_id: str,
        configuration: AgentConfiguration,
        created_by: str,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> ConfigurationVersion:
        """Create a new configuration version."""
        # Validate configuration
        validation_result = await self.validate_configuration(configuration)
        if not validation_result.valid:
            raise ValidationException(f"Invalid configuration: {', '.join(validation_result.errors)}")
        
        # Initialize versions list if needed
        if agent_id not in self.configuration_versions:
            self.configuration_versions[agent_id] = []
        
        versions = self.configuration_versions[agent_id]
        
        # Determine next version number
        next_version = max([v.version for v in versions], default=0) + 1
        
        # Deactivate current active version
        for version in versions:
            if version.is_active:
                version.is_active = False
        
        # Create new version
        new_version = ConfigurationVersion(
            version=next_version,
            configuration=configuration,
            created_at=datetime.utcnow(),
            created_by=created_by,
            description=description,
            is_active=True,
            tags=tags or []
        )
        
        versions.append(new_version)
        
        # Broadcast configuration update
        await self._broadcast_configuration_update(agent_id, new_version)
        
        logger.info(f"Created configuration version {next_version} for agent {agent_id}")
        return new_version
    
    async def activate_configuration_version(
        self,
        agent_id: str,
        version: int,
        activated_by: str
    ) -> ConfigurationVersion:
        """Activate a specific configuration version."""
        if agent_id not in self.configuration_versions:
            raise ResourceNotFoundException("Agent configuration", agent_id)
        
        versions = self.configuration_versions[agent_id]
        target_version = None
        
        # Find target version and deactivate others
        for config_version in versions:
            if config_version.version == version:
                target_version = config_version
                config_version.is_active = True
            else:
                config_version.is_active = False
        
        if not target_version:
            raise ResourceNotFoundException("Configuration version", f"{agent_id}:v{version}")
        
        # Broadcast configuration update
        await self._broadcast_configuration_update(agent_id, target_version)
        
        logger.info(f"Activated configuration version {version} for agent {agent_id}")
        return target_version
    
    async def compare_configuration_versions(
        self,
        agent_id: str,
        version_a: int,
        version_b: int
    ) -> ConfigurationComparison:
        """Compare two configuration versions."""
        config_a = await self.get_configuration_version(agent_id, version_a)
        config_b = await self.get_configuration_version(agent_id, version_b)
        
        differences = self._calculate_configuration_diff(
            config_a.configuration.dict(),
            config_b.configuration.dict()
        )
        
        # Calculate summary
        summary = {
            "added": len([d for d in differences if d.change_type == "added"]),
            "removed": len([d for d in differences if d.change_type == "removed"]),
            "modified": len([d for d in differences if d.change_type == "modified"])
        }
        
        return ConfigurationComparison(
            version_a=version_a,
            version_b=version_b,
            differences=differences,
            summary=summary
        )
    
    async def validate_configuration(
        self,
        configuration: AgentConfiguration
    ) -> ConfigurationValidationResult:
        """Validate agent configuration."""
        errors = []
        warnings = []
        suggestions = []
        
        # Basic validation
        if configuration.max_concurrent_tasks < 1:
            errors.append("max_concurrent_tasks must be at least 1")
        elif configuration.max_concurrent_tasks > 50:
            warnings.append("max_concurrent_tasks > 50 may impact performance")
        
        if configuration.timeout_seconds < 10:
            errors.append("timeout_seconds must be at least 10")
        elif configuration.timeout_seconds > 3600:
            warnings.append("timeout_seconds > 3600 may cause long waits")
        
        if configuration.retry_attempts > 5:
            warnings.append("retry_attempts > 5 may cause excessive retries")
        
        # Capability validation
        capability_names = [cap.name for cap in configuration.capabilities]
        if len(capability_names) != len(set(capability_names)):
            errors.append("Duplicate capability names found")
        
        # Performance suggestions
        if configuration.max_concurrent_tasks > 20:
            suggestions.append("Consider monitoring resource usage with high concurrency")
        
        if configuration.log_level == "DEBUG":
            suggestions.append("DEBUG logging may impact performance in production")
        
        return ConfigurationValidationResult(
            valid=len(errors) == 0,
            errors=errors,
            warnings=warnings,
            suggestions=suggestions
        )
    
    async def create_configuration_template(
        self,
        name: str,
        agent_type: AgentType,
        configuration: AgentConfiguration,
        created_by: str,
        description: Optional[str] = None,
        tags: Optional[List[str]] = None
    ) -> ConfigurationTemplate:
        """Create a configuration template."""
        # Validate configuration
        validation_result = await self.validate_configuration(configuration)
        if not validation_result.valid:
            raise ValidationException(f"Invalid configuration: {', '.join(validation_result.errors)}")
        
        # Check for duplicate names
        for template in self.configuration_templates.values():
            if template.name == name and template.agent_type == agent_type:
                raise BusinessRuleException(f"Template '{name}' already exists for {agent_type.value}")
        
        template_id = str(uuid4())
        template = ConfigurationTemplate(
            id=template_id,
            name=name,
            description=description,
            agent_type=agent_type,
            configuration=configuration,
            created_at=datetime.utcnow(),
            created_by=created_by,
            is_default=False,
            tags=tags or []
        )
        
        self.configuration_templates[template_id] = template
        
        logger.info(f"Created configuration template: {name} ({template_id})")
        return template
    
    async def get_configuration_templates(
        self,
        agent_type: Optional[AgentType] = None,
        tags: Optional[List[str]] = None,
        limit: int = 50,
        offset: int = 0
    ) -> Tuple[List[ConfigurationTemplate], int]:
        """Get configuration templates with filtering."""
        templates = list(self.configuration_templates.values())
        
        # Apply filters
        if agent_type:
            templates = [t for t in templates if t.agent_type == agent_type]
        
        if tags:
            templates = [t for t in templates if any(tag in t.tags for tag in tags)]
        
        total = len(templates)
        
        # Sort by creation date (newest first)
        sorted_templates = sorted(templates, key=lambda t: t.created_at, reverse=True)
        paginated_templates = sorted_templates[offset:offset + limit]
        
        return paginated_templates, total
    
    async def apply_bulk_configuration(
        self,
        request: BulkConfigurationRequest,
        applied_by: str
    ) -> BulkConfigurationResult:
        """Apply configuration to multiple agents."""
        # Validate configuration
        validation_result = await self.validate_configuration(request.configuration)
        if not validation_result.valid:
            raise ValidationException(f"Invalid configuration: {', '.join(validation_result.errors)}")
        
        results = {}
        successful_updates = 0
        failed_updates = 0
        backup_id = None
        
        # Create backup if requested
        if request.backup_current:
            backup_id = await self._create_configuration_backup(request.agent_ids)
        
        # Apply configuration to each agent
        for agent_id in request.agent_ids:
            try:
                # Create new configuration version
                version = await self.create_configuration_version(
                    agent_id=agent_id,
                    configuration=request.configuration,
                    created_by=applied_by,
                    description=request.description or "Bulk configuration update",
                    tags=["bulk_update"]
                )
                
                results[agent_id] = {
                    "success": True,
                    "version": version.version,
                    "message": "Configuration updated successfully"
                }
                successful_updates += 1
                
            except Exception as e:
                results[agent_id] = {
                    "success": False,
                    "error": str(e),
                    "message": f"Failed to update configuration: {e}"
                }
                failed_updates += 1
                logger.error(f"Failed to update configuration for agent {agent_id}: {e}")
        
        return BulkConfigurationResult(
            total_agents=len(request.agent_ids),
            successful_updates=successful_updates,
            failed_updates=failed_updates,
            results=results,
            backup_id=backup_id
        )
    
    async def restore_configuration_backup(
        self,
        backup_id: str,
        restored_by: str
    ) -> Dict[str, Any]:
        """Restore configuration from backup."""
        if backup_id not in self.configuration_backups:
            raise ResourceNotFoundException("Configuration backup", backup_id)
        
        backup = self.configuration_backups[backup_id]
        results = {}
        
        for agent_id, config_data in backup["configurations"].items():
            try:
                configuration = AgentConfiguration(**config_data)
                version = await self.create_configuration_version(
                    agent_id=agent_id,
                    configuration=configuration,
                    created_by=restored_by,
                    description=f"Restored from backup {backup_id}",
                    tags=["backup_restore"]
                )
                
                results[agent_id] = {
                    "success": True,
                    "version": version.version
                }
                
            except Exception as e:
                results[agent_id] = {
                    "success": False,
                    "error": str(e)
                }
                logger.error(f"Failed to restore configuration for agent {agent_id}: {e}")
        
        return {
            "backup_id": backup_id,
            "restored_at": datetime.utcnow().isoformat(),
            "restored_by": restored_by,
            "results": results
        }
    
    # Helper methods
    
    def _calculate_configuration_diff(
        self,
        config_a: Dict[str, Any],
        config_b: Dict[str, Any],
        prefix: str = ""
    ) -> List[ConfigurationDiff]:
        """Calculate differences between two configurations."""
        differences = []
        
        # Find added and modified fields
        for key, value_b in config_b.items():
            field_name = f"{prefix}.{key}" if prefix else key
            
            if key not in config_a:
                differences.append(ConfigurationDiff(
                    field=field_name,
                    old_value=None,
                    new_value=value_b,
                    change_type="added"
                ))
            elif config_a[key] != value_b:
                if isinstance(value_b, dict) and isinstance(config_a[key], dict):
                    # Recursively compare nested objects
                    nested_diffs = self._calculate_configuration_diff(
                        config_a[key], value_b, field_name
                    )
                    differences.extend(nested_diffs)
                else:
                    differences.append(ConfigurationDiff(
                        field=field_name,
                        old_value=config_a[key],
                        new_value=value_b,
                        change_type="modified"
                    ))
        
        # Find removed fields
        for key, value_a in config_a.items():
            if key not in config_b:
                field_name = f"{prefix}.{key}" if prefix else key
                differences.append(ConfigurationDiff(
                    field=field_name,
                    old_value=value_a,
                    new_value=None,
                    change_type="removed"
                ))
        
        return differences
    
    async def _create_configuration_backup(self, agent_ids: List[str]) -> str:
        """Create a backup of current configurations."""
        backup_id = str(uuid4())
        backup_data = {
            "id": backup_id,
            "created_at": datetime.utcnow().isoformat(),
            "agent_ids": agent_ids,
            "configurations": {}
        }
        
        # Get current active configurations
        for agent_id in agent_ids:
            if agent_id in self.configuration_versions:
                versions = self.configuration_versions[agent_id]
                active_version = next((v for v in versions if v.is_active), None)
                if active_version:
                    backup_data["configurations"][agent_id] = active_version.configuration.dict()
        
        self.configuration_backups[backup_id] = backup_data
        return backup_id
    
    async def _broadcast_configuration_update(
        self,
        agent_id: str,
        version: ConfigurationVersion
    ):
        """Broadcast configuration update via WebSocket."""
        update_data = {
            "agent_id": agent_id,
            "configuration_version": version.version,
            "configuration": version.configuration.dict(),
            "updated_at": version.created_at.isoformat(),
            "updated_by": version.created_by
        }
        
        await notify_agents_update(update_data)