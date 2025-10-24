"""
Scenario Management System for ACSO Demo Orchestration.

This module provides scenario lifecycle management, configuration,
and parameter control capabilities.
"""

import asyncio
import json
import yaml
from pathlib import Path
from typing import Dict, List, Optional, Any, Union
from datetime import datetime
import logging
from dataclasses import dataclass, asdict

from .demo_orchestrator import (
    DemoOrchestrator, ScenarioConfig, ScenarioType, ScenarioState,
    demo_orchestrator
)

logger = logging.getLogger(__name__)


@dataclass
class ScenarioTemplate:
    """Template for creating demo scenarios."""
    template_id: str
    name: str
    description: str
    scenario_type: ScenarioType
    default_duration_minutes: int = 10
    default_parameters: Dict[str, Any] = None
    parameter_schema: Dict[str, Any] = None
    tags: List[str] = None
    
    def __post_init__(self):
        if self.default_parameters is None:
            self.default_parameters = {}
        if self.parameter_schema is None:
            self.parameter_schema = {}
        if self.tags is None:
            self.tags = []


class ScenarioParameterValidator:
    """Validates scenario parameters against schema."""
    
    @staticmethod
    def validate_parameters(parameters: Dict[str, Any], 
                          schema: Dict[str, Any]) -> tuple[bool, List[str]]:
        """Validate parameters against schema."""
        errors = []
        
        try:
            # Check required parameters
            required = schema.get("required", [])
            for param in required:
                if param not in parameters:
                    errors.append(f"Required parameter '{param}' is missing")
                    
            # Validate parameter types and values
            properties = schema.get("properties", {})
            for param_name, param_value in parameters.items():
                if param_name in properties:
                    param_schema = properties[param_name]
                    
                    # Type validation
                    expected_type = param_schema.get("type")
                    if expected_type:
                        if not ScenarioParameterValidator._validate_type(
                            param_value, expected_type
                        ):
                            errors.append(
                                f"Parameter '{param_name}' should be of type {expected_type}"
                            )
                            
                    # Range validation
                    if "minimum" in param_schema and param_value < param_schema["minimum"]:
                        errors.append(
                            f"Parameter '{param_name}' should be >= {param_schema['minimum']}"
                        )
                    if "maximum" in param_schema and param_value > param_schema["maximum"]:
                        errors.append(
                            f"Parameter '{param_name}' should be <= {param_schema['maximum']}"
                        )
                        
                    # Enum validation
                    if "enum" in param_schema and param_value not in param_schema["enum"]:
                        errors.append(
                            f"Parameter '{param_name}' should be one of {param_schema['enum']}"
                        )
                        
        except Exception as e:
            errors.append(f"Validation error: {str(e)}")
            
        return len(errors) == 0, errors
        
    @staticmethod
    def _validate_type(value: Any, expected_type: str) -> bool:
        """Validate value type."""
        type_mapping = {
            "string": str,
            "integer": int,
            "number": (int, float),
            "boolean": bool,
            "array": list,
            "object": dict
        }
        
        expected_python_type = type_mapping.get(expected_type)
        if expected_python_type:
            return isinstance(value, expected_python_type)
        return True


class ScenarioManager:
    """Manages demo scenario templates, configurations, and lifecycle."""
    
    def __init__(self, orchestrator: DemoOrchestrator):
        self.orchestrator = orchestrator
        self.templates: Dict[str, ScenarioTemplate] = {}
        self.scenario_configs: Dict[str, ScenarioConfig] = {}
        self.templates_directory = Path("demo/templates")
        self.configs_directory = Path("demo/configs")
        
    async def initialize(self):
        """Initialize the scenario manager."""
        logger.info("Initializing Scenario Manager")
        
        # Create directories if they don't exist
        self.templates_directory.mkdir(parents=True, exist_ok=True)
        self.configs_directory.mkdir(parents=True, exist_ok=True)
        
        # Load built-in templates
        await self._load_builtin_templates()
        
        # Load templates from files
        await self._load_template_files()
        
        # Load saved configurations
        await self._load_config_files()
        
    async def _load_builtin_templates(self):
        """Load built-in scenario templates."""
        builtin_templates = [
            ScenarioTemplate(
                template_id="threat_response_basic",
                name="Basic Threat Response",
                description="Demonstrates autonomous threat detection and response",
                scenario_type=ScenarioType.THREAT_RESPONSE,
                default_duration_minutes=8,
                default_parameters={
                    "threat_type": "malware",
                    "network_size": "medium",
                    "complexity": "moderate",
                    "auto_escalate": True
                },
                parameter_schema={
                    "type": "object",
                    "properties": {
                        "threat_type": {
                            "type": "string",
                            "enum": ["malware", "intrusion", "data_exfiltration", "apt"],
                            "description": "Type of threat to simulate"
                        },
                        "network_size": {
                            "type": "string",
                            "enum": ["small", "medium", "large"],
                            "description": "Size of the network topology"
                        },
                        "complexity": {
                            "type": "string",
                            "enum": ["simple", "moderate", "complex"],
                            "description": "Complexity level of the scenario"
                        },
                        "auto_escalate": {
                            "type": "boolean",
                            "description": "Automatically escalate high-severity threats"
                        }
                    },
                    "required": ["threat_type", "network_size"]
                },
                tags=["security", "autonomous", "basic"]
            ),
            ScenarioTemplate(
                template_id="cost_optimization_basic",
                name="Basic Cost Optimization",
                description="Demonstrates AI-driven cost analysis and optimization",
                scenario_type=ScenarioType.COST_OPTIMIZATION,
                default_duration_minutes=12,
                default_parameters={
                    "analysis_scope": "infrastructure",
                    "optimization_target": 0.25,
                    "risk_tolerance": "medium",
                    "auto_implement": False
                },
                parameter_schema={
                    "type": "object",
                    "properties": {
                        "analysis_scope": {
                            "type": "string",
                            "enum": ["infrastructure", "services", "licensing", "all"],
                            "description": "Scope of cost analysis"
                        },
                        "optimization_target": {
                            "type": "number",
                            "minimum": 0.1,
                            "maximum": 0.5,
                            "description": "Target cost reduction percentage"
                        },
                        "risk_tolerance": {
                            "type": "string",
                            "enum": ["low", "medium", "high"],
                            "description": "Risk tolerance for optimization actions"
                        },
                        "auto_implement": {
                            "type": "boolean",
                            "description": "Automatically implement low-risk optimizations"
                        }
                    },
                    "required": ["analysis_scope", "optimization_target"]
                },
                tags=["financial", "optimization", "basic"]
            ),
            ScenarioTemplate(
                template_id="multi_agent_coordination",
                name="Multi-Agent Coordination",
                description="Demonstrates complex multi-agent coordination scenarios",
                scenario_type=ScenarioType.MULTI_AGENT_COORDINATION,
                default_duration_minutes=15,
                default_parameters={
                    "agent_count": 5,
                    "coordination_complexity": "high",
                    "conflict_scenarios": True,
                    "performance_tracking": True
                },
                parameter_schema={
                    "type": "object",
                    "properties": {
                        "agent_count": {
                            "type": "integer",
                            "minimum": 3,
                            "maximum": 10,
                            "description": "Number of agents to coordinate"
                        },
                        "coordination_complexity": {
                            "type": "string",
                            "enum": ["low", "medium", "high"],
                            "description": "Complexity of coordination scenarios"
                        },
                        "conflict_scenarios": {
                            "type": "boolean",
                            "description": "Include conflict resolution scenarios"
                        },
                        "performance_tracking": {
                            "type": "boolean",
                            "description": "Enable detailed performance tracking"
                        }
                    },
                    "required": ["agent_count", "coordination_complexity"]
                },
                tags=["coordination", "multi-agent", "advanced"]
            )
        ]
        
        for template in builtin_templates:
            self.templates[template.template_id] = template
            logger.info(f"Loaded built-in template: {template.template_id}")
            
    async def _load_template_files(self):
        """Load scenario templates from files."""
        try:
            for template_file in self.templates_directory.glob("*.yaml"):
                with open(template_file, 'r') as f:
                    template_data = yaml.safe_load(f)
                    
                template = ScenarioTemplate(**template_data)
                self.templates[template.template_id] = template
                logger.info(f"Loaded template from file: {template.template_id}")
                
        except Exception as e:
            logger.error(f"Error loading template files: {e}")
            
    async def _load_config_files(self):
        """Load scenario configurations from files."""
        try:
            for config_file in self.configs_directory.glob("*.json"):
                with open(config_file, 'r') as f:
                    config_data = json.load(f)
                    
                config = ScenarioConfig(**config_data)
                self.scenario_configs[config.scenario_id] = config
                logger.info(f"Loaded config from file: {config.scenario_id}")
                
        except Exception as e:
            logger.error(f"Error loading config files: {e}")
            
    def get_templates(self, scenario_type: Optional[ScenarioType] = None,
                     tags: Optional[List[str]] = None) -> List[ScenarioTemplate]:
        """Get scenario templates with optional filtering."""
        templates = list(self.templates.values())
        
        if scenario_type:
            templates = [t for t in templates if t.scenario_type == scenario_type]
            
        if tags:
            templates = [
                t for t in templates 
                if any(tag in t.tags for tag in tags)
            ]
            
        return templates
        
    def get_template(self, template_id: str) -> Optional[ScenarioTemplate]:
        """Get a specific scenario template."""
        return self.templates.get(template_id)
        
    async def create_scenario_from_template(self, 
                                          template_id: str,
                                          scenario_id: Optional[str] = None,
                                          parameters: Optional[Dict[str, Any]] = None,
                                          duration_minutes: Optional[int] = None) -> Optional[str]:
        """Create a scenario from a template."""
        try:
            template = self.get_template(template_id)
            if not template:
                logger.error(f"Template {template_id} not found")
                return None
                
            # Generate scenario ID if not provided
            if not scenario_id:
                scenario_id = f"{template_id}_{datetime.utcnow().strftime('%Y%m%d_%H%M%S')}"
                
            # Merge parameters with defaults
            final_parameters = template.default_parameters.copy()
            if parameters:
                final_parameters.update(parameters)
                
            # Validate parameters
            is_valid, errors = ScenarioParameterValidator.validate_parameters(
                final_parameters, template.parameter_schema
            )
            
            if not is_valid:
                logger.error(f"Parameter validation failed for {scenario_id}: {errors}")
                return None
                
            # Create scenario configuration
            config = ScenarioConfig(
                scenario_id=scenario_id,
                scenario_type=template.scenario_type,
                name=template.name,
                description=template.description,
                duration_minutes=duration_minutes or template.default_duration_minutes,
                parameters=final_parameters
            )
            
            # Create scenario in orchestrator
            if await self.orchestrator.create_scenario(config):
                self.scenario_configs[scenario_id] = config
                logger.info(f"Created scenario {scenario_id} from template {template_id}")
                return scenario_id
            else:
                logger.error(f"Failed to create scenario {scenario_id}")
                return None
                
        except Exception as e:
            logger.error(f"Error creating scenario from template {template_id}: {e}")
            return None
            
    async def save_template(self, template: ScenarioTemplate) -> bool:
        """Save a scenario template to file."""
        try:
            template_file = self.templates_directory / f"{template.template_id}.yaml"
            
            with open(template_file, 'w') as f:
                yaml.dump(asdict(template), f, default_flow_style=False)
                
            self.templates[template.template_id] = template
            logger.info(f"Saved template {template.template_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving template {template.template_id}: {e}")
            return False
            
    async def save_config(self, config: ScenarioConfig) -> bool:
        """Save a scenario configuration to file."""
        try:
            config_file = self.configs_directory / f"{config.scenario_id}.json"
            
            with open(config_file, 'w') as f:
                json.dump(asdict(config), f, indent=2, default=str)
                
            self.scenario_configs[config.scenario_id] = config
            logger.info(f"Saved config {config.scenario_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error saving config {config.scenario_id}: {e}")
            return False
            
    async def delete_template(self, template_id: str) -> bool:
        """Delete a scenario template."""
        try:
            if template_id in self.templates:
                del self.templates[template_id]
                
                # Delete file if it exists
                template_file = self.templates_directory / f"{template_id}.yaml"
                if template_file.exists():
                    template_file.unlink()
                    
                logger.info(f"Deleted template {template_id}")
                return True
            else:
                logger.warning(f"Template {template_id} not found")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting template {template_id}: {e}")
            return False
            
    async def delete_config(self, scenario_id: str) -> bool:
        """Delete a scenario configuration."""
        try:
            if scenario_id in self.scenario_configs:
                del self.scenario_configs[scenario_id]
                
                # Delete file if it exists
                config_file = self.configs_directory / f"{scenario_id}.json"
                if config_file.exists():
                    config_file.unlink()
                    
                logger.info(f"Deleted config {scenario_id}")
                return True
            else:
                logger.warning(f"Config {scenario_id} not found")
                return False
                
        except Exception as e:
            logger.error(f"Error deleting config {scenario_id}: {e}")
            return False
            
    def get_scenario_configs(self) -> List[ScenarioConfig]:
        """Get all scenario configurations."""
        return list(self.scenario_configs.values())
        
    def get_scenario_config(self, scenario_id: str) -> Optional[ScenarioConfig]:
        """Get a specific scenario configuration."""
        return self.scenario_configs.get(scenario_id)
        
    async def update_scenario_parameters(self, scenario_id: str, 
                                       parameters: Dict[str, Any]) -> bool:
        """Update parameters for a scenario."""
        try:
            # Get scenario from orchestrator
            scenario_status = self.orchestrator.get_scenario_status(scenario_id)
            if not scenario_status:
                logger.error(f"Scenario {scenario_id} not found in orchestrator")
                return False
                
            # Get template for validation
            config = self.scenario_configs.get(scenario_id)
            if not config:
                logger.error(f"Config for scenario {scenario_id} not found")
                return False
                
            template = self.get_template(config.scenario_type.value)
            if template:
                # Validate new parameters
                is_valid, errors = ScenarioParameterValidator.validate_parameters(
                    parameters, template.parameter_schema
                )
                
                if not is_valid:
                    logger.error(f"Parameter validation failed: {errors}")
                    return False
                    
            # Update configuration
            config.parameters.update(parameters)
            
            # Save updated configuration
            await self.save_config(config)
            
            logger.info(f"Updated parameters for scenario {scenario_id}")
            return True
            
        except Exception as e:
            logger.error(f"Error updating scenario parameters: {e}")
            return False
            
    def get_scenario_statistics(self) -> Dict[str, Any]:
        """Get statistics about scenarios and templates."""
        return {
            "templates": {
                "total": len(self.templates),
                "by_type": {
                    scenario_type.value: len([
                        t for t in self.templates.values() 
                        if t.scenario_type == scenario_type
                    ])
                    for scenario_type in ScenarioType
                }
            },
            "configurations": {
                "total": len(self.scenario_configs),
                "by_type": {
                    scenario_type.value: len([
                        c for c in self.scenario_configs.values() 
                        if c.scenario_type == scenario_type
                    ])
                    for scenario_type in ScenarioType
                }
            },
            "orchestrator": self.orchestrator.get_all_scenarios_status()
        }


# Global scenario manager instance
scenario_manager = ScenarioManager(demo_orchestrator)