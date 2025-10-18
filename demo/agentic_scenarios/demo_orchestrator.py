"""
ACSO Demo Orchestrator

Central system for managing and coordinating agentic AI demonstration scenarios.
Provides real-time control, monitoring, and analytics for ACSO demonstrations.
"""

import asyncio
import uuid
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from enum import Enum
from dataclasses import dataclass, asdict
import logging

logger = logging.getLogger(__name__)


class ScenarioStatus(Enum):
    """Scenario execution status."""
    CREATED = "created"
    RUNNING = "running"
    PAUSED = "paused"
    COMPLETED = "completed"
    FAILED = "failed"
    STOPPED = "stopped"


class AgentAction(Enum):
    """Types of agent actions in demonstrations."""
    DETECT = "detect"
    ANALYZE = "analyze"
    DECIDE = "decide"
    EXECUTE = "execute"
    COORDINATE = "coordinate"
    LEARN = "learn"
    ESCALATE = "escalate"
    APPROVE = "approve"


@dataclass
class DemoEvent:
    """Represents a single event in a demonstration scenario."""
    id: str
    timestamp: datetime
    agent_id: str
    action: AgentAction
    description: str
    data: Dict[str, Any]
    confidence: float
    duration_ms: int
    success: bool
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        result = asdict(self)
        result['timestamp'] = self.timestamp.isoformat()
        result['action'] = self.action.value
        return result


@dataclass
class ScenarioConfig:
    """Configuration for a demonstration scenario."""
    id: str
    name: str
    description: str
    duration_minutes: int
    complexity_level: str  # "basic", "intermediate", "advanced"
    agents_involved: List[str]
    parameters: Dict[str, Any]
    success_criteria: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return asdict(self)