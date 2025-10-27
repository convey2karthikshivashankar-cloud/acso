"""
Lifecycle management models for ACSO Enterprise.
"""

from dataclasses import dataclass, field
from datetime import datetime
from typing import Dict, List, Optional, Any
from enum import Enum


class LifecycleEvent(str, Enum):
    """Agent lifecycle events."""
    CREATED = "created"
    STARTING = "starting"
    RUNNING = "running"
    STOPPING = "stopping"
    STOPPED = "stopped"
    FAILED = "failed"
    RECOVERING = "recovering"
    MIGRATING = "migrating"
    TERMINATED = "terminated"


class RecoveryType(str, Enum):
    """Types of recovery actions."""
    RESTART_IN_PLACE = "restart_in_place"
    MIGRATE_TO_NEW_NODE = "migrate_to_new_node"
    SCALE_REPLACEMENT = "scale_replacement"
    MANUAL_INTERVENTION = "manual_intervention"


@dataclass
class RecoveryStrategy:
    """Strategy for agent recovery."""
    strategy_type: RecoveryType
    max_attempts: int = 3
    backoff_factor: float = 2.0
    initial_delay_seconds: int = 30
    max_delay_seconds: int = 300
    timeout_seconds: int = 600
    preserve_state: bool = True
    migrate_workload: bool = True
    notify_dependencies: bool = True
    custom_actions: List[str] = field(default_factory=list)


@dataclass
class WorkloadDistribution:
    """Workload distribution configuration."""
    agent_id: str
    tenant_id: str
    agent_type: str
    current_capacity: int
    max_capacity: int
    workload_items: Dict[str, Any] = field(default_factory=dict)
    load_factor: float = 0.0
    last_updated: datetime = field(default_factory=datetime.utcnow)


@dataclass
class StateSnapshot:
    """Snapshot of agent state for recovery."""
    agent_id: str
    timestamp: datetime
    state_data: Dict[str, Any]
    workload_data: Dict[str, Any]
    configuration: Dict[str, Any]
    metrics: Dict[str, Any]
    checksum: str = ""


@dataclass
class RecoveryAction:
    """Recovery action record."""
    action_id: str
    agent_id: str
    action_type: RecoveryType
    initiated_at: datetime
    completed_at: Optional[datetime] = None
    success: bool = False
    error_message: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class AgentLifecycleState:
    """Complete lifecycle state of an agent."""
    agent_id: str
    agent_type: str
    tenant_id: str
    current_state: LifecycleEvent
    previous_state: LifecycleEvent
    state_changed_at: datetime
    deployment_name: str
    namespace: str
    node_name: Optional[str] = None
    pod_name: Optional[str] = None
    restart_count: int = 0
    failure_count: int = 0
    last_heartbeat: Optional[datetime] = None
    health_status: str = "unknown"
    current_workload: Dict[str, Any] = field(default_factory=dict)
    persistent_state: Dict[str, Any] = field(default_factory=dict)
    recovery_attempts: int = 0
    last_recovery_attempt: Optional[datetime] = None
    recovery_strategy: Optional[RecoveryStrategy] = None
    metadata: Dict[str, Any] = field(default_factory=dict)