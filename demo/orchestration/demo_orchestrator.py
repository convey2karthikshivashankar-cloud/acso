"""
Demo Orchestration Engine for ACSO Phase 5 Agentic Demonstrations.

This module provides the core orchestration capabilities for managing
and controlling demonstration scenarios.
"""

import asyncio
import json
import uuid
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
import logging
from dataclasses import dataclass, asdict

logger = logging.getLogger(__name__)


class ScenarioState(str, Enum):
    """States of a demo scenario."""
    CREATED = "created"
    INITIALIZING = "initializing"
    RUNNING = "running"
    PAUSED = "paused"
    STOPPING = "stopping"
    STOPPED = "stopped"
    COMPLETED = "completed"
    ERROR = "error"


class ScenarioType(str, Enum):
    """Types of demo scenarios."""
    THREAT_RESPONSE = "threat_response"
    COST_OPTIMIZATION = "cost_optimization"
    MULTI_AGENT_COORDINATION = "multi_agent_coordination"
    REAL_TIME_DECISION = "real_time_decision"
    HUMAN_AI_COLLABORATION = "human_ai_collaboration"
    PERFORMANCE_ANALYTICS = "performance_analytics"


@dataclass
class ScenarioConfig:
    """Configuration for a demo scenario."""
    scenario_id: str
    scenario_type: ScenarioType
    name: str
    description: str
    duration_minutes: int = 10
    parameters: Dict[str, Any] = None
    auto_start: bool = False
    auto_reset: bool = False
    max_iterations: int = 1
    
    def __post_init__(self):
        if self.parameters is None:
            self.parameters = {}


@dataclass
class ScenarioMetrics:
    """Metrics for a demo scenario."""
    scenario_id: str
    start_time: Optional[datetime] = None
    end_time: Optional[datetime] = None
    duration_seconds: float = 0.0
    events_generated: int = 0
    decisions_made: int = 0
    actions_taken: int = 0
    errors_encountered: int = 0
    performance_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        data = asdict(self)
        # Convert datetime objects to ISO strings
        if self.start_time:
            data['start_time'] = self.start_time.isoformat()
        if self.end_time:
            data['end_time'] = self.end_time.isoformat()
        return data


class ScenarioEvent:
    """Represents an event in a demo scenario."""
    
    def __init__(self, event_type: str, data: Dict[str, Any], 
                 timestamp: Optional[datetime] = None):
        self.event_id = str(uuid.uuid4())
        self.event_type = event_type
        self.data = data
        self.timestamp = timestamp or datetime.utcnow()
        
    def to_dict(self) -> Dict[str, Any]:
        return {
            "event_id": self.event_id,
            "event_type": self.event_type,
            "data": self.data,
            "timestamp": self.timestamp.isoformat()
        }


class DemoScenario:
    """Represents a single demo scenario."""
    
    def __init__(self, config: ScenarioConfig):
        self.config = config
        self.state = ScenarioState.CREATED
        self.metrics = ScenarioMetrics(scenario_id=config.scenario_id)
        self.events: List[ScenarioEvent] = []
        self.event_handlers: Dict[str, List[Callable]] = {}
        self.current_iteration = 0
        self.task: Optional[asyncio.Task] = None
        
    async def initialize(self) -> bool:
        """Initialize the scenario."""
        try:
            self.state = ScenarioState.INITIALIZING
            logger.info(f"Initializing scenario {self.config.scenario_id}")
            
            # Emit initialization event
            await self._emit_event("scenario_initializing", {
                "scenario_id": self.config.scenario_id,
                "scenario_type": self.config.scenario_type.value
            })
            
            # Scenario-specific initialization
            await self._initialize_scenario_data()
            
            self.state = ScenarioState.STOPPED
            logger.info(f"Scenario {self.config.scenario_id} initialized successfully")
            return True
            
        except Exception as e:
            logger.error(f"Failed to initialize scenario {self.config.scenario_id}: {e}")
            self.state = ScenarioState.ERROR
            await self._emit_event("scenario_error", {
                "scenario_id": self.config.scenario_id,
                "error": str(e)
            })
            return False
            
    async def start(self) -> bool:
        """Start the scenario."""
        try:
            if self.state not in [ScenarioState.STOPPED, ScenarioState.PAUSED]:
                logger.warning(f"Cannot start scenario {self.config.scenario_id} in state {self.state}")
                return False
                
            self.state = ScenarioState.RUNNING
            self.metrics.start_time = datetime.utcnow()
            self.current_iteration += 1
            
            logger.info(f"Starting scenario {self.config.scenario_id} (iteration {self.current_iteration})")
            
            # Emit start event
            await self._emit_event("scenario_started", {
                "scenario_id": self.config.scenario_id,
                "iteration": self.current_iteration
            })
            
            # Start scenario execution task
            self.task = asyncio.create_task(self._run_scenario())
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to start scenario {self.config.scenario_id}: {e}")
            self.state = ScenarioState.ERROR
            return False
            
    async def pause(self) -> bool:
        """Pause the scenario."""
        try:
            if self.state != ScenarioState.RUNNING:
                logger.warning(f"Cannot pause scenario {self.config.scenario_id} in state {self.state}")
                return False
                
            self.state = ScenarioState.PAUSED
            logger.info(f"Pausing scenario {self.config.scenario_id}")
            
            await self._emit_event("scenario_paused", {
                "scenario_id": self.config.scenario_id
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to pause scenario {self.config.scenario_id}: {e}")
            return False
            
    async def resume(self) -> bool:
        """Resume the scenario."""
        try:
            if self.state != ScenarioState.PAUSED:
                logger.warning(f"Cannot resume scenario {self.config.scenario_id} in state {self.state}")
                return False
                
            self.state = ScenarioState.RUNNING
            logger.info(f"Resuming scenario {self.config.scenario_id}")
            
            await self._emit_event("scenario_resumed", {
                "scenario_id": self.config.scenario_id
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to resume scenario {self.config.scenario_id}: {e}")
            return False
            
    async def stop(self) -> bool:
        """Stop the scenario."""
        try:
            if self.state in [ScenarioState.STOPPED, ScenarioState.COMPLETED]:
                return True
                
            self.state = ScenarioState.STOPPING
            logger.info(f"Stopping scenario {self.config.scenario_id}")
            
            # Cancel running task
            if self.task and not self.task.done():
                self.task.cancel()
                try:
                    await self.task
                except asyncio.CancelledError:
                    pass
                    
            self.state = ScenarioState.STOPPED
            self.metrics.end_time = datetime.utcnow()
            
            if self.metrics.start_time:
                self.metrics.duration_seconds = (
                    self.metrics.end_time - self.metrics.start_time
                ).total_seconds()
                
            await self._emit_event("scenario_stopped", {
                "scenario_id": self.config.scenario_id,
                "metrics": self.metrics.to_dict()
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to stop scenario {self.config.scenario_id}: {e}")
            self.state = ScenarioState.ERROR
            return False
            
    async def reset(self) -> bool:
        """Reset the scenario to initial state."""
        try:
            # Stop if running
            if self.state in [ScenarioState.RUNNING, ScenarioState.PAUSED]:
                await self.stop()
                
            logger.info(f"Resetting scenario {self.config.scenario_id}")
            
            # Reset state and metrics
            self.state = ScenarioState.STOPPED
            self.metrics = ScenarioMetrics(scenario_id=self.config.scenario_id)
            self.events.clear()
            self.current_iteration = 0
            
            # Reinitialize scenario data
            await self._initialize_scenario_data()
            
            await self._emit_event("scenario_reset", {
                "scenario_id": self.config.scenario_id
            })
            
            return True
            
        except Exception as e:
            logger.error(f"Failed to reset scenario {self.config.scenario_id}: {e}")
            self.state = ScenarioState.ERROR
            return False
            
    def add_event_handler(self, event_type: str, handler: Callable):
        """Add an event handler for a specific event type."""
        if event_type not in self.event_handlers:
            self.event_handlers[event_type] = []
        self.event_handlers[event_type].append(handler)
        
    def remove_event_handler(self, event_type: str, handler: Callable):
        """Remove an event handler."""
        if event_type in self.event_handlers:
            try:
                self.event_handlers[event_type].remove(handler)
            except ValueError:
                pass
                
    async def _emit_event(self, event_type: str, data: Dict[str, Any]):
        """Emit an event to all registered handlers."""
        event = ScenarioEvent(event_type, data)
        self.events.append(event)
        
        # Call event handlers
        if event_type in self.event_handlers:
            for handler in self.event_handlers[event_type]:
                try:
                    if asyncio.iscoroutinefunction(handler):
                        await handler(event)
                    else:
                        handler(event)
                except Exception as e:
                    logger.error(f"Event handler error for {event_type}: {e}")
                    
    async def _initialize_scenario_data(self):
        """Initialize scenario-specific data."""
        # This will be overridden by specific scenario implementations
        pass
        
    async def _run_scenario(self):
        """Main scenario execution loop."""
        try:
            duration = timedelta(minutes=self.config.duration_minutes)
            end_time = datetime.utcnow() + duration
            
            while datetime.utcnow() < end_time and self.state == ScenarioState.RUNNING:
                # Execute scenario step
                await self._execute_scenario_step()
                
                # Wait before next step
                await asyncio.sleep(1.0)
                
            # Scenario completed
            if self.state == ScenarioState.RUNNING:
                self.state = ScenarioState.COMPLETED
                self.metrics.end_time = datetime.utcnow()
                
                if self.metrics.start_time:
                    self.metrics.duration_seconds = (
                        self.metrics.end_time - self.metrics.start_time
                    ).total_seconds()
                    
                await self._emit_event("scenario_completed", {
                    "scenario_id": self.config.scenario_id,
                    "metrics": self.metrics.to_dict()
                })
                
                # Auto-reset if configured
                if self.config.auto_reset and self.current_iteration < self.config.max_iterations:
                    await asyncio.sleep(2.0)  # Brief pause
                    await self.reset()
                    if self.config.auto_start:
                        await self.start()
                        
        except asyncio.CancelledError:
            logger.info(f"Scenario {self.config.scenario_id} execution cancelled")
            raise
        except Exception as e:
            logger.error(f"Scenario {self.config.scenario_id} execution error: {e}")
            self.state = ScenarioState.ERROR
            await self._emit_event("scenario_error", {
                "scenario_id": self.config.scenario_id,
                "error": str(e)
            })
            
    async def _execute_scenario_step(self):
        """Execute a single scenario step."""
        # This will be overridden by specific scenario implementations
        self.metrics.events_generated += 1
        
        await self._emit_event("scenario_step", {
            "scenario_id": self.config.scenario_id,
            "step": self.metrics.events_generated
        })


class DemoOrchestrator:
    """Main orchestrator for demo scenarios."""
    
    def __init__(self):
        self.scenarios: Dict[str, DemoScenario] = {}
        self.global_event_handlers: Dict[str, List[Callable]] = {}
        self.metrics_collectors: List[Callable] = []
        self.running = False
        
    async def initialize(self):
        """Initialize the demo orchestrator."""
        logger.info("Initializing Demo Orchestrator")
        self.running = True
        
    async def shutdown(self):
        """Shutdown the demo orchestrator."""
        logger.info("Shutting down Demo Orchestrator")
        
        # Stop all running scenarios
        for scenario in self.scenarios.values():
            if scenario.state in [ScenarioState.RUNNING, ScenarioState.PAUSED]:
                await scenario.stop()
                
        self.running = False
        
    async def create_scenario(self, config: ScenarioConfig) -> bool:
        """Create a new demo scenario."""
        try:
            if config.scenario_id in self.scenarios:
                logger.warning(f"Scenario {config.scenario_id} already exists")
                return False
                
            # Create scenario based on type
            scenario = await self._create_scenario_instance(config)
            
            # Initialize scenario
            if await scenario.initialize():
                self.scenarios[config.scenario_id] = scenario
                
                # Add global event handlers
                for event_type, handlers in self.global_event_handlers.items():
                    for handler in handlers:
                        scenario.add_event_handler(event_type, handler)
                        
                logger.info(f"Created scenario {config.scenario_id}")
                return True
            else:
                logger.error(f"Failed to initialize scenario {config.scenario_id}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to create scenario {config.scenario_id}: {e}")
            return False
            
    async def _create_scenario_instance(self, config: ScenarioConfig) -> DemoScenario:
        """Create a scenario instance based on type."""
        # Import scenario-specific classes
        if config.scenario_type == ScenarioType.THREAT_RESPONSE:
            from .scenarios.threat_response_scenario import ThreatResponseScenario
            return ThreatResponseScenario(config)
        elif config.scenario_type == ScenarioType.COST_OPTIMIZATION:
            from .scenarios.cost_optimization_scenario import CostOptimizationScenario
            return CostOptimizationScenario(config)
        elif config.scenario_type == ScenarioType.MULTI_AGENT_COORDINATION:
            from .scenarios.multi_agent_scenario import MultiAgentCoordinationScenario
            return MultiAgentCoordinationScenario(config)
        else:
            # Default to base scenario
            return DemoScenario(config)
            
    async def start_scenario(self, scenario_id: str) -> bool:
        """Start a demo scenario."""
        if scenario_id not in self.scenarios:
            logger.error(f"Scenario {scenario_id} not found")
            return False
            
        return await self.scenarios[scenario_id].start()
        
    async def pause_scenario(self, scenario_id: str) -> bool:
        """Pause a demo scenario."""
        if scenario_id not in self.scenarios:
            logger.error(f"Scenario {scenario_id} not found")
            return False
            
        return await self.scenarios[scenario_id].pause()
        
    async def resume_scenario(self, scenario_id: str) -> bool:
        """Resume a demo scenario."""
        if scenario_id not in self.scenarios:
            logger.error(f"Scenario {scenario_id} not found")
            return False
            
        return await self.scenarios[scenario_id].resume()
        
    async def stop_scenario(self, scenario_id: str) -> bool:
        """Stop a demo scenario."""
        if scenario_id not in self.scenarios:
            logger.error(f"Scenario {scenario_id} not found")
            return False
            
        return await self.scenarios[scenario_id].stop()
        
    async def reset_scenario(self, scenario_id: str) -> bool:
        """Reset a demo scenario."""
        if scenario_id not in self.scenarios:
            logger.error(f"Scenario {scenario_id} not found")
            return False
            
        return await self.scenarios[scenario_id].reset()
        
    async def delete_scenario(self, scenario_id: str) -> bool:
        """Delete a demo scenario."""
        if scenario_id not in self.scenarios:
            logger.error(f"Scenario {scenario_id} not found")
            return False
            
        scenario = self.scenarios[scenario_id]
        
        # Stop if running
        if scenario.state in [ScenarioState.RUNNING, ScenarioState.PAUSED]:
            await scenario.stop()
            
        del self.scenarios[scenario_id]
        logger.info(f"Deleted scenario {scenario_id}")
        return True
        
    def get_scenario_status(self, scenario_id: str) -> Optional[Dict[str, Any]]:
        """Get the status of a demo scenario."""
        if scenario_id not in self.scenarios:
            return None
            
        scenario = self.scenarios[scenario_id]
        return {
            "scenario_id": scenario_id,
            "state": scenario.state.value,
            "config": asdict(scenario.config),
            "metrics": scenario.metrics.to_dict(),
            "current_iteration": scenario.current_iteration,
            "event_count": len(scenario.events)
        }
        
    def get_all_scenarios_status(self) -> Dict[str, Dict[str, Any]]:
        """Get the status of all scenarios."""
        return {
            scenario_id: self.get_scenario_status(scenario_id)
            for scenario_id in self.scenarios.keys()
        }
        
    def add_global_event_handler(self, event_type: str, handler: Callable):
        """Add a global event handler for all scenarios."""
        if event_type not in self.global_event_handlers:
            self.global_event_handlers[event_type] = []
        self.global_event_handlers[event_type].append(handler)
        
        # Add to existing scenarios
        for scenario in self.scenarios.values():
            scenario.add_event_handler(event_type, handler)
            
    def add_metrics_collector(self, collector: Callable):
        """Add a metrics collector."""
        self.metrics_collectors.append(collector)
        
    async def collect_metrics(self) -> Dict[str, Any]:
        """Collect metrics from all scenarios."""
        metrics = {
            "orchestrator": {
                "running": self.running,
                "total_scenarios": len(self.scenarios),
                "active_scenarios": len([
                    s for s in self.scenarios.values() 
                    if s.state == ScenarioState.RUNNING
                ]),
                "timestamp": datetime.utcnow().isoformat()
            },
            "scenarios": {}
        }
        
        for scenario_id, scenario in self.scenarios.items():
            metrics["scenarios"][scenario_id] = scenario.metrics.to_dict()
            
        # Call custom metrics collectors
        for collector in self.metrics_collectors:
            try:
                if asyncio.iscoroutinefunction(collector):
                    custom_metrics = await collector()
                else:
                    custom_metrics = collector()
                metrics.update(custom_metrics)
            except Exception as e:
                logger.error(f"Metrics collector error: {e}")
                
        return metrics


# Global orchestrator instance
demo_orchestrator = DemoOrchestrator()