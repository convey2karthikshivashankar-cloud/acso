"""Interactive Demo Interface for ACSO Agentic Scenarios."""

import asyncio
import json
import time
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional
from dataclasses import dataclass, asdict
import logging

from .demo_orchestrator import DemoOrchestrator
from .sample_data_generator import SampleDataGenerator
from .multi_agent_coordination import MultiAgentCoordinationDemo
from .intelligent_cost_optimization import IntelligentCostOptimizationDemo
from .autonomous_threat_response import AutonomousThreatResponseDemo


@dataclass
class DemoSession:
    """Represents an active demo session."""
    session_id: str
    scenario_type: str
    start_time: datetime
    status: str
    participants: List[str]
    current_step: int
    total_steps: int
    results: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization."""
        return {
            **asdict(self),
            'start_time': self.start_time.isoformat(),
            'duration_minutes': (datetime.utcnow() - self.start_time).total_seconds() / 60
        }


class InteractiveDemoInterface:
    """Interactive interface for running ACSO agentic demonstrations."""
    
    def __init__(self):
        self.orchestrator = DemoOrchestrator()
        self.data_generator = SampleDataGenerator()
        self.active_sessions: Dict[str, DemoSession] = {}
        self.demo_scenarios = {
            'multi_agent_coordination': MultiAgentCoordinationDemo(),
            'intelligent_cost_optimization': IntelligentCostOptimizationDemo(),
            'autonomous_threat_response': AutonomousThreatResponseDemo()
        }
        
        # Setup logging
        logging.basicConfig(level=logging.INFO)
        self.logger = logging.getLogger(__name__)
    
    async def start_demo_session(
        self,
        scenario_type: str,
        participants: List[str],
        configuration: Optional[Dict[str, Any]] = None
    ) -> str:
        """Start a new interactive demo session."""
        if scenario_type not in self.demo_scenarios:
            raise ValueError(f"Unknown scenario type: {scenario_type}")
        
        session_id = f"demo_{int(time.time())}_{scenario_type}"
        
        # Initialize demo session
        session = DemoSession(
            session_id=session_id,
            scenario_type=scenario_type,
            start_time=datetime.utcnow(),
            status="initializing",
            participants=participants,
            current_step=0,
            total_steps=0,
            results={}
        )
        
        self.active_sessions[session_id] = session
        
        try:
            # Generate sample data for the demo
            await self._prepare_demo_data(session_id, scenario_type, configuration)
            
            # Initialize the specific demo scenario
            demo_instance = self.demo_scenarios[scenario_type]
            await demo_instance.initialize(session_id, configuration or {})
            
            session.status = "ready"
            session.total_steps = demo_instance.get_total_steps()
            
            self.logger.info(f"Demo session {session_id} initialized successfully")
            return session_id
            
        except Exception as e:
            session.status = "failed"
            session.results["error"] = str(e)
            self.logger.error(f"Failed to initialize demo session {session_id}: {e}")
            raise
    
    async def execute_demo_step(
        self,
        session_id: str,
        step_number: Optional[int] = None,
        user_input: Optional[Dict[str, Any]] = None
    ) -> Dict[str, Any]:
        """Execute a specific step in the demo."""
        if session_id not in self.active_sessions:
            raise ValueError(f"Demo session {session_id} not found")
        
        session = self.active_sessions[session_id]
        demo_instance = self.demo_scenarios[session.scenario_type]
        
        if step_number is None:
            step_number = session.current_step + 1
        
        try:
            session.status = "running"
            
            # Execute the demo step
            step_result = await demo_instance.execute_step(
                step_number, 
                user_input or {}
            )
            
            # Update session state
            session.current_step = step_number
            session.results[f"step_{step_number}"] = step_result
            
            # Check if demo is complete
            if step_number >= session.total_steps:
                session.status = "completed"
                await self._finalize_demo_session(session_id)
            else:
                session.status = "ready"
            
            return {
                "session_id": session_id,
                "step_number": step_number,
                "step_result": step_result,
                "session_status": session.status,
                "progress": {
                    "current_step": session.current_step,
                    "total_steps": session.total_steps,
                    "percentage": (session.current_step / session.total_steps) * 100
                }
            }
            
        except Exception as e:
            session.status = "error"
            session.results["error"] = str(e)
            self.logger.error(f"Error executing step {step_number} in session {session_id}: {e}")
            raise
    
    async def get_demo_status(self, session_id: str) -> Dict[str, Any]:
        """Get the current status of a demo session."""
        if session_id not in self.active_sessions:
            raise ValueError(f"Demo session {session_id} not found")
        
        session = self.active_sessions[session_id]
        demo_instance = self.demo_scenarios[session.scenario_type]
        
        return {
            "session": session.to_dict(),
            "available_actions": await demo_instance.get_available_actions(session.current_step),
            "agent_states": await self._get_agent_states(session_id),
            "metrics": await self._get_demo_metrics(session_id)
        }
    
    async def pause_demo_session(self, session_id: str) -> bool:
        """Pause an active demo session."""
        if session_id not in self.active_sessions:
            return False
        
        session = self.active_sessions[session_id]
        if session.status == "running":
            session.status = "paused"
            
            # Pause all agents in the demo
            demo_instance = self.demo_scenarios[session.scenario_type]
            await demo_instance.pause()
            
            self.logger.info(f"Demo session {session_id} paused")
            return True
        
        return False
    
    async def resume_demo_session(self, session_id: str) -> bool:
        """Resume a paused demo session."""
        if session_id not in self.active_sessions:
            return False
        
        session = self.active_sessions[session_id]
        if session.status == "paused":
            session.status = "ready"
            
            # Resume all agents in the demo
            demo_instance = self.demo_scenarios[session.scenario_type]
            await demo_instance.resume()
            
            self.logger.info(f"Demo session {session_id} resumed")
            return True
        
        return False
    
    async def stop_demo_session(self, session_id: str) -> bool:
        """Stop and cleanup a demo session."""
        if session_id not in self.active_sessions:
            return False
        
        session = self.active_sessions[session_id]
        session.status = "stopped"
        
        try:
            # Stop the demo scenario
            demo_instance = self.demo_scenarios[session.scenario_type]
            await demo_instance.cleanup()
            
            # Generate final report
            await self._generate_demo_report(session_id)
            
            self.logger.info(f"Demo session {session_id} stopped successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Error stopping demo session {session_id}: {e}")
            return False
    
    async def get_available_scenarios(self) -> List[Dict[str, Any]]:
        """Get list of available demo scenarios."""
        scenarios = []
        
        for scenario_type, demo_instance in self.demo_scenarios.items():
            scenario_info = await demo_instance.get_scenario_info()
            scenarios.append({
                "type": scenario_type,
                "name": scenario_info.get("name", scenario_type.replace("_", " ").title()),
                "description": scenario_info.get("description", ""),
                "duration_minutes": scenario_info.get("duration_minutes", 30),
                "complexity": scenario_info.get("complexity", "medium"),
                "prerequisites": scenario_info.get("prerequisites", []),
                "learning_objectives": scenario_info.get("learning_objectives", [])
            })
        
        return scenarios
    
    async def get_demo_analytics(self, session_id: Optional[str] = None) -> Dict[str, Any]:
        """Get analytics data for demo sessions."""
        if session_id:
            # Analytics for specific session
            if session_id not in self.active_sessions:
                raise ValueError(f"Demo session {session_id} not found")
            
            session = self.active_sessions[session_id]
            return await self._get_session_analytics(session)
        
        else:
            # Overall analytics
            return await self._get_overall_analytics()
    
    async def _prepare_demo_data(
        self,
        session_id: str,
        scenario_type: str,
        configuration: Optional[Dict[str, Any]]
    ):
        """Prepare sample data for the demo scenario."""
        data_config = configuration.get("data_generation", {}) if configuration else {}
        
        # Generate appropriate sample data based on scenario type
        if scenario_type == "multi_agent_coordination":
            await self.data_generator.generate_coordination_scenario_data(
                session_id, data_config
            )
        elif scenario_type == "intelligent_cost_optimization":
            await self.data_generator.generate_cost_optimization_data(
                session_id, data_config
            )
        elif scenario_type == "autonomous_threat_response":
            await self.data_generator.generate_threat_scenario_data(
                session_id, data_config
            )
    
    async def _get_agent_states(self, session_id: str) -> Dict[str, Any]:
        """Get current state of all agents in the demo."""
        demo_instance = self.demo_scenarios[
            self.active_sessions[session_id].scenario_type
        ]
        return await demo_instance.get_agent_states()
    
    async def _get_demo_metrics(self, session_id: str) -> Dict[str, Any]:
        """Get performance metrics for the demo."""
        session = self.active_sessions[session_id]
        demo_instance = self.demo_scenarios[session.scenario_type]
        
        return {
            "execution_time": (datetime.utcnow() - session.start_time).total_seconds(),
            "steps_completed": session.current_step,
            "success_rate": await demo_instance.get_success_rate(),
            "agent_performance": await demo_instance.get_agent_performance_metrics(),
            "resource_utilization": await demo_instance.get_resource_metrics()
        }
    
    async def _finalize_demo_session(self, session_id: str):
        """Finalize a completed demo session."""
        session = self.active_sessions[session_id]
        demo_instance = self.demo_scenarios[session.scenario_type]
        
        # Generate completion summary
        completion_summary = await demo_instance.generate_completion_summary()
        session.results["completion_summary"] = completion_summary
        
        # Calculate final metrics
        final_metrics = await self._get_demo_metrics(session_id)
        session.results["final_metrics"] = final_metrics
        
        self.logger.info(f"Demo session {session_id} finalized successfully")
    
    async def _generate_demo_report(self, session_id: str) -> Dict[str, Any]:
        """Generate a comprehensive report for the demo session."""
        session = self.active_sessions[session_id]
        
        report = {
            "session_info": session.to_dict(),
            "execution_summary": {
                "total_duration": (datetime.utcnow() - session.start_time).total_seconds(),
                "steps_completed": session.current_step,
                "completion_rate": (session.current_step / session.total_steps) * 100,
                "status": session.status
            },
            "results": session.results,
            "recommendations": await self._generate_recommendations(session_id),
            "generated_at": datetime.utcnow().isoformat()
        }
        
        # Store report for later retrieval
        session.results["final_report"] = report
        
        return report
    
    async def _generate_recommendations(self, session_id: str) -> List[str]:
        """Generate recommendations based on demo performance."""
        session = self.active_sessions[session_id]
        demo_instance = self.demo_scenarios[session.scenario_type]
        
        return await demo_instance.generate_recommendations(session.results)
    
    async def _get_session_analytics(self, session: DemoSession) -> Dict[str, Any]:
        """Get analytics for a specific session."""
        return {
            "session_id": session.session_id,
            "scenario_type": session.scenario_type,
            "performance_metrics": session.results.get("final_metrics", {}),
            "user_interactions": len([
                k for k in session.results.keys() 
                if k.startswith("step_")
            ]),
            "completion_rate": (session.current_step / session.total_steps) * 100,
            "duration_minutes": (datetime.utcnow() - session.start_time).total_seconds() / 60
        }
    
    async def _get_overall_analytics(self) -> Dict[str, Any]:
        """Get overall analytics across all demo sessions."""
        total_sessions = len(self.active_sessions)
        completed_sessions = len([
            s for s in self.active_sessions.values() 
            if s.status == "completed"
        ])
        
        scenario_counts = {}
        for session in self.active_sessions.values():
            scenario_counts[session.scenario_type] = scenario_counts.get(
                session.scenario_type, 0
            ) + 1
        
        return {
            "total_sessions": total_sessions,
            "completed_sessions": completed_sessions,
            "completion_rate": (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0,
            "scenario_distribution": scenario_counts,
            "average_session_duration": await self._calculate_average_duration(),
            "most_popular_scenario": max(scenario_counts.items(), key=lambda x: x[1])[0] if scenario_counts else None
        }
    
    async def _calculate_average_duration(self) -> float:
        """Calculate average session duration."""
        if not self.active_sessions:
            return 0.0
        
        total_duration = 0.0
        completed_count = 0
        
        for session in self.active_sessions.values():
            if session.status in ["completed", "stopped"]:
                duration = (datetime.utcnow() - session.start_time).total_seconds() / 60
                total_duration += duration
                completed_count += 1
        
        return total_duration / completed_count if completed_count > 0 else 0.0


# Global demo interface instance
demo_interface = InteractiveDemoInterface()