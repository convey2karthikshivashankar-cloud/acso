"""
Supervisor Agent implementation for ACSO system.
The supervisor orchestrates all other agents and manages complex workflows.
"""

import asyncio
import uuid
from datetime import datetime
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum

from .base_agent import BaseAgent
from ..shared.interfaces import SupervisorInterface
from ..shared.models import (
    AgentType, Task, TaskType, TaskPriority, TaskStatus,
    AgentMessage, AgentState
)
from ..shared.coordination import system_coordinator
from ..shared.communication import TaskCoordinator, HumanApprovalManager
from ..shared.human_interface import (
    human_approval_interface, decision_learning_engine,
    ApprovalType, RiskAssessment
)
from config.settings import settings


class GoalType(str, Enum):
    """Types of high-level goals the supervisor can handle."""
    SECURITY_ASSESSMENT = "security_assessment"
    INCIDENT_RESPONSE = "incident_response"
    SERVICE_OPTIMIZATION = "service_optimization"
    FINANCIAL_ANALYSIS = "financial_analysis"
    SYSTEM_MAINTENANCE = "system_maintenance"
    THREAT_INVESTIGATION = "threat_investigation"


class WorkflowStep:
    """Represents a step in a workflow."""
    def __init__(self, step_id: str, task_type: TaskType, description: str, 
                 dependencies: List[str] = None, priority: TaskPriority = TaskPriority.MEDIUM):
        self.step_id = step_id
        self.task_type = task_type
        self.description = description
        self.dependencies = dependencies or []
        self.priority = priority
        self.completed = False
        self.result: Optional[Dict[str, Any]] = None


class SupervisorAgent(BaseAgent, SupervisorInterface):
    """Supervisor agent that orchestrates all ACSO operations."""
    
    def __init__(self, agent_id: str = "supervisor-001"):
        super().__init__(agent_id, AgentType.SUPERVISOR)
        
        # Supervisor-specific capabilities
        self.capabilities = [
            "goal_decomposition",
            "task_orchestration", 
            "workflow_management",
            "agent_coordination",
            "decision_making",
            "human_interaction"
        ]
        
        # Workflow management
        self.active_workflows: Dict[str, List[WorkflowStep]] = {}
        self.workflow_results: Dict[str, Dict[str, Any]] = {}
        
        # Task coordination
        self.task_coordinator = TaskCoordinator(self.comm_manager)
        self.approval_manager = HumanApprovalManager(self.comm_manager)
        
        # Human-in-the-loop integration
        self.human_interface = human_approval_interface
        self.learning_engine = decision_learning_engine
        
        # Agent management
        self.managed_agents: Dict[str, AgentState] = {}
        self.agent_workloads: Dict[str, int] = {}
        
    async def initialize(self) -> None:
        """Initialize the supervisor agent."""
        await super().initialize()
        
        # Register with system coordinator
        state = await self.get_state()
        await system_coordinator.register_agent(state)
        
        # Register additional message handlers
        self.comm_manager.register_handler("workflow_request", self._handle_workflow_request)
        self.comm_manager.register_handler("agent_registration", self._handle_agent_registration)
        self.comm_manager.register_handler("task_result", self._handle_task_result)
        
        self.logger.info("Supervisor agent initialized and ready for coordination")
        
    async def _execute_task_implementation(self, task: Task) -> Dict[str, Any]:
        """Execute supervisor-specific tasks."""
        try:
            if task.type == TaskType.THREAT_ANALYSIS:
                return await self._handle_security_goal(task)
            elif task.type == TaskType.SERVICE_DELIVERY:
                return await self._handle_service_goal(task)
            elif task.type == TaskType.FINANCIAL_ANALYSIS:
                return await self._handle_financial_goal(task)
            else:
                # Generic goal handling
                return await self._handle_generic_goal(task)
                
        except Exception as e:
            self.logger.error(f"Supervisor task execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "task_id": task.task_id
            }
            
    async def decompose_goal(self, goal: str) -> List[Task]:
        """Decompose a high-level goal into actionable tasks."""
        try:
            self.logger.info(f"Decomposing goal: {goal}")
            
            # Analyze goal using Bedrock
            analysis_prompt = f"""
            Analyze this IT management goal and break it down into specific, actionable tasks:
            Goal: {goal}
            
            Consider these agent types and their capabilities:
            - Threat Hunter: Security monitoring, log analysis, threat detection
            - Incident Response: Containment actions, system isolation, remediation
            - Service Orchestration: Ticket management, patch deployment, service delivery
            - Financial Intelligence: Cost analysis, revenue optimization, resource planning
            
            Return a structured breakdown of tasks with priorities and dependencies.
            """
            
            bedrock_result = await self._invoke_bedrock_agent(analysis_prompt)
            
            if bedrock_result.get("success"):
                # Parse Bedrock response and create tasks
                tasks = await self._parse_goal_analysis(bedrock_result.get("result", ""), goal)
            else:
                # Fallback to rule-based decomposition
                tasks = await self._rule_based_decomposition(goal)
                
            self.logger.info(f"Decomposed goal into {len(tasks)} tasks")
            return tasks
            
        except Exception as e:
            self.logger.error(f"Goal decomposition failed: {e}")
            return []
            
    async def _parse_goal_analysis(self, analysis: str, original_goal: str) -> List[Task]:
        """Parse Bedrock analysis into concrete tasks."""
        tasks = []
        
        # This is a simplified parser - in a real implementation, 
        # this would use more sophisticated NLP parsing
        lines = analysis.split('\n')
        
        for i, line in enumerate(lines):
            line = line.strip()
            if line and not line.startswith('#'):
                # Create task from line
                task_id = str(uuid.uuid4())
                
                # Determine task type based on keywords
                task_type = self._determine_task_type(line)
                priority = self._determine_priority(line)
                
                task = Task(
                    task_id=task_id,
                    type=task_type,
                    description=line,
                    priority=priority,
                    context={
                        "original_goal": original_goal,
                        "analysis_source": "bedrock",
                        "step_number": i + 1
                    }
                )
                tasks.append(task)
                
        return tasks
        
    async def _rule_based_decomposition(self, goal: str) -> List[Task]:
        """Fallback rule-based goal decomposition."""
        tasks = []
        goal_lower = goal.lower()
        
        # Security-related goals
        if any(keyword in goal_lower for keyword in ["security", "threat", "breach", "attack"]):
            tasks.extend(await self._create_security_workflow(goal))
            
        # Service-related goals  
        elif any(keyword in goal_lower for keyword in ["service", "ticket", "maintenance", "patch"]):
            tasks.extend(await self._create_service_workflow(goal))
            
        # Financial-related goals
        elif any(keyword in goal_lower for keyword in ["cost", "revenue", "financial", "budget"]):
            tasks.extend(await self._create_financial_workflow(goal))
            
        # Generic workflow
        else:
            tasks.extend(await self._create_generic_workflow(goal))
            
        return tasks
        
    async def _create_security_workflow(self, goal: str) -> List[Task]:
        """Create security-focused task workflow."""
        workflow_id = str(uuid.uuid4())
        
        tasks = [
            Task(
                task_id=str(uuid.uuid4()),
                type=TaskType.THREAT_ANALYSIS,
                description="Perform comprehensive threat assessment",
                priority=TaskPriority.HIGH,
                context={"workflow_id": workflow_id, "goal": goal}
            ),
            Task(
                task_id=str(uuid.uuid4()),
                type=TaskType.INCIDENT_RESPONSE,
                description="Prepare incident response procedures",
                priority=TaskPriority.MEDIUM,
                context={"workflow_id": workflow_id, "goal": goal}
            )
        ]
        
        return tasks
        
    async def _create_service_workflow(self, goal: str) -> List[Task]:
        """Create service-focused task workflow."""
        workflow_id = str(uuid.uuid4())
        
        tasks = [
            Task(
                task_id=str(uuid.uuid4()),
                type=TaskType.SERVICE_DELIVERY,
                description="Analyze current service delivery metrics",
                priority=TaskPriority.MEDIUM,
                context={"workflow_id": workflow_id, "goal": goal}
            ),
            Task(
                task_id=str(uuid.uuid4()),
                type=TaskType.SERVICE_DELIVERY,
                description="Optimize service delivery processes",
                priority=TaskPriority.MEDIUM,
                context={"workflow_id": workflow_id, "goal": goal}
            )
        ]
        
        return tasks
        
    async def _create_financial_workflow(self, goal: str) -> List[Task]:
        """Create financial-focused task workflow."""
        workflow_id = str(uuid.uuid4())
        
        tasks = [
            Task(
                task_id=str(uuid.uuid4()),
                type=TaskType.FINANCIAL_ANALYSIS,
                description="Analyze current financial metrics and trends",
                priority=TaskPriority.MEDIUM,
                context={"workflow_id": workflow_id, "goal": goal}
            )
        ]
        
        return tasks
        
    async def _create_generic_workflow(self, goal: str) -> List[Task]:
        """Create generic task workflow."""
        workflow_id = str(uuid.uuid4())
        
        tasks = [
            Task(
                task_id=str(uuid.uuid4()),
                type=TaskType.SERVICE_DELIVERY,
                description=f"Execute goal: {goal}",
                priority=TaskPriority.MEDIUM,
                context={"workflow_id": workflow_id, "goal": goal}
            )
        ]
        
        return tasks
        
    def _determine_task_type(self, description: str) -> TaskType:
        """Determine task type from description."""
        desc_lower = description.lower()
        
        if any(keyword in desc_lower for keyword in ["threat", "security", "monitor", "detect"]):
            return TaskType.THREAT_ANALYSIS
        elif any(keyword in desc_lower for keyword in ["respond", "contain", "isolate", "block"]):
            return TaskType.INCIDENT_RESPONSE
        elif any(keyword in desc_lower for keyword in ["service", "ticket", "patch", "deploy"]):
            return TaskType.SERVICE_DELIVERY
        elif any(keyword in desc_lower for keyword in ["financial", "cost", "revenue", "budget"]):
            return TaskType.FINANCIAL_ANALYSIS
        else:
            return TaskType.SERVICE_DELIVERY  # Default
            
    def _determine_priority(self, description: str) -> TaskPriority:
        """Determine task priority from description."""
        desc_lower = description.lower()
        
        if any(keyword in desc_lower for keyword in ["critical", "urgent", "emergency", "immediate"]):
            return TaskPriority.CRITICAL
        elif any(keyword in desc_lower for keyword in ["high", "important", "priority"]):
            return TaskPriority.HIGH
        elif any(keyword in desc_lower for keyword in ["low", "minor", "optional"]):
            return TaskPriority.LOW
        else:
            return TaskPriority.MEDIUM
            
    async def delegate_task(self, task: Task, agent_id: str) -> bool:
        """Delegate a task to a specific agent."""
        try:
            self.logger.info(f"Delegating task {task.task_id} to agent {agent_id}")
            
            # Use system coordinator for task delegation
            assigned_agent = await system_coordinator.delegate_task(task, agent_id)
            
            if assigned_agent:
                # Send task assignment message
                await self.comm_manager.send_message(
                    recipient_id=agent_id,
                    message_type="task_assignment",
                    payload={
                        "task_id": task.task_id,
                        "task_data": task.dict()
                    }
                )
                
                # Track delegation
                await self._store_memory(f"delegated_task_{task.task_id}", {
                    "agent_id": agent_id,
                    "timestamp": datetime.utcnow().isoformat(),
                    "task_type": task.type.value
                })
                
                return True
                
            return False
            
        except Exception as e:
            self.logger.error(f"Task delegation failed: {e}")
            return False
            
    async def aggregate_results(self, task_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Aggregate results from multiple sub-tasks."""
        try:
            self.logger.info(f"Aggregating results from {len(task_results)} tasks")
            
            # Basic aggregation logic
            aggregated = {
                "total_tasks": len(task_results),
                "successful_tasks": len([r for r in task_results if r.get("success", False)]),
                "failed_tasks": len([r for r in task_results if not r.get("success", False)]),
                "results": task_results,
                "summary": "",
                "recommendations": []
            }
            
            # Generate summary using Bedrock
            summary_prompt = f"""
            Analyze these task results and provide a comprehensive summary:
            
            Results: {task_results}
            
            Provide:
            1. Executive summary of outcomes
            2. Key findings and insights
            3. Recommendations for next steps
            4. Risk assessment if applicable
            """
            
            bedrock_result = await self._invoke_bedrock_agent(summary_prompt)
            
            if bedrock_result.get("success"):
                aggregated["summary"] = bedrock_result.get("result", "")
                
            return aggregated
            
        except Exception as e:
            self.logger.error(f"Result aggregation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "results": task_results
            }
            
    async def handle_agent_failure(self, agent_id: str, task: Task) -> None:
        """Handle failure of an agent and reassign tasks."""
        try:
            self.logger.warning(f"Handling failure of agent {agent_id} for task {task.task_id}")
            
            # Mark agent as failed
            if agent_id in self.managed_agents:
                self.managed_agents[agent_id].status = "error"
                
            # Find alternative agent for the task
            alternative_agent = await self._find_alternative_agent(task, agent_id)
            
            if alternative_agent:
                self.logger.info(f"Reassigning task {task.task_id} to agent {alternative_agent}")
                await self.delegate_task(task, alternative_agent)
            else:
                self.logger.error(f"No alternative agent found for task {task.task_id}")
                
                # Request human intervention
                await self.approval_manager.request_approval(
                    action=f"Manual intervention required for task {task.task_id}",
                    risk_assessment={"risk_score": 0.8, "reason": "No available agents"},
                    context={"failed_agent": agent_id, "task": task.dict()}
                )
                
        except Exception as e:
            self.logger.error(f"Agent failure handling failed: {e}")
            
    async def _find_alternative_agent(self, task: Task, failed_agent_id: str) -> Optional[str]:
        """Find an alternative agent to handle a task."""
        try:
            # Get agents by task type
            task_type_mapping = {
                TaskType.THREAT_ANALYSIS: AgentType.THREAT_HUNTER,
                TaskType.INCIDENT_RESPONSE: AgentType.INCIDENT_RESPONSE,
                TaskType.SERVICE_DELIVERY: AgentType.SERVICE_ORCHESTRATION,
                TaskType.FINANCIAL_ANALYSIS: AgentType.FINANCIAL_INTELLIGENCE
            }
            
            required_agent_type = task_type_mapping.get(task.type)
            if not required_agent_type:
                return None
                
            # Get available agents from system coordinator
            available_agents = await system_coordinator.agent_registry.get_available_agents()
            
            # Filter by type and exclude failed agent
            suitable_agents = [
                agent for agent in available_agents
                if agent.agent_type == required_agent_type and agent.agent_id != failed_agent_id
            ]
            
            if suitable_agents:
                # Return agent with lowest workload
                workloads = [(agent.agent_id, self.agent_workloads.get(agent.agent_id, 0)) 
                           for agent in suitable_agents]
                workloads.sort(key=lambda x: x[1])
                return workloads[0][0]
                
            return None
            
        except Exception as e:
            self.logger.error(f"Alternative agent search failed: {e}")
            return None
            
    async def _handle_workflow_request(self, message: AgentMessage) -> None:
        """Handle workflow execution requests."""
        try:
            goal = message.payload.get("goal", "")
            workflow_id = message.payload.get("workflow_id", str(uuid.uuid4()))
            
            self.logger.info(f"Processing workflow request: {goal}")
            
            # Decompose goal into tasks
            tasks = await self.decompose_goal(goal)
            
            # Execute workflow
            results = await self._execute_workflow(workflow_id, tasks)
            
            # Send results back
            await self.comm_manager.send_message(
                recipient_id=message.sender_id,
                message_type="workflow_result",
                payload={
                    "workflow_id": workflow_id,
                    "results": results,
                    "success": True
                }
            )
            
        except Exception as e:
            self.logger.error(f"Workflow request handling failed: {e}")
            
    async def _handle_agent_registration(self, message: AgentMessage) -> None:
        """Handle agent registration messages."""
        try:
            agent_data = message.payload.get("agent_state", {})
            agent_state = AgentState(**agent_data)
            
            self.managed_agents[agent_state.agent_id] = agent_state
            self.agent_workloads[agent_state.agent_id] = 0
            
            self.logger.info(f"Registered agent: {agent_state.agent_id}")
            
        except Exception as e:
            self.logger.error(f"Agent registration failed: {e}")
            
    async def _handle_task_result(self, message: AgentMessage) -> None:
        """Handle task completion results."""
        try:
            task_id = message.payload.get("task_id")
            result = message.payload.get("result", {})
            success = message.payload.get("success", False)
            
            self.logger.info(f"Received task result for {task_id}: success={success}")
            
            # Store result
            await self._store_memory(f"task_result_{task_id}", {
                "result": result,
                "success": success,
                "agent_id": message.sender_id,
                "timestamp": datetime.utcnow().isoformat()
            })
            
            # Update agent workload
            if message.sender_id in self.agent_workloads:
                self.agent_workloads[message.sender_id] = max(0, 
                    self.agent_workloads[message.sender_id] - 1)
                
        except Exception as e:
            self.logger.error(f"Task result handling failed: {e}")
            
    async def _execute_workflow(self, workflow_id: str, tasks: List[Task]) -> Dict[str, Any]:
        """Execute a workflow of tasks."""
        try:
            self.logger.info(f"Executing workflow {workflow_id} with {len(tasks)} tasks")
            
            workflow_results = []
            
            for task in tasks:
                # Find appropriate agent for task
                agent_id = await self._select_agent_for_task(task)
                
                if agent_id:
                    # Delegate task
                    success = await self.delegate_task(task, agent_id)
                    
                    if success:
                        # Wait for result (simplified for prototype)
                        result = await self.task_coordinator.get_task_result(task.task_id, timeout=30.0)
                        
                        if result:
                            workflow_results.append(result)
                        else:
                            workflow_results.append({
                                "task_id": task.task_id,
                                "success": False,
                                "error": "Task timeout"
                            })
                    else:
                        workflow_results.append({
                            "task_id": task.task_id,
                            "success": False,
                            "error": "Delegation failed"
                        })
                else:
                    workflow_results.append({
                        "task_id": task.task_id,
                        "success": False,
                        "error": "No suitable agent found"
                    })
                    
            # Aggregate results
            final_result = await self.aggregate_results(workflow_results)
            
            return final_result
            
        except Exception as e:
            self.logger.error(f"Workflow execution failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "workflow_id": workflow_id
            }
            
    async def _select_agent_for_task(self, task: Task) -> Optional[str]:
        """Select the best agent for a specific task."""
        try:
            # Get available agents from system coordinator
            available_agents = await system_coordinator.agent_registry.get_available_agents()
            
            # Task type to agent type mapping
            task_type_mapping = {
                TaskType.THREAT_ANALYSIS: AgentType.THREAT_HUNTER,
                TaskType.INCIDENT_RESPONSE: AgentType.INCIDENT_RESPONSE,
                TaskType.SERVICE_DELIVERY: AgentType.SERVICE_ORCHESTRATION,
                TaskType.FINANCIAL_ANALYSIS: AgentType.FINANCIAL_INTELLIGENCE
            }
            
            required_agent_type = task_type_mapping.get(task.type)
            if not required_agent_type:
                return None
                
            # Filter by type
            suitable_agents = [
                agent for agent in available_agents
                if agent.agent_type == required_agent_type
            ]
            
            if not suitable_agents:
                return None
                
            # Select agent with lowest workload
            best_agent = min(suitable_agents, 
                           key=lambda a: self.agent_workloads.get(a.agent_id, 0))
            
            # Update workload tracking
            self.agent_workloads[best_agent.agent_id] = \
                self.agent_workloads.get(best_agent.agent_id, 0) + 1
                
            return best_agent.agent_id
            
        except Exception as e:
            self.logger.error(f"Agent selection failed: {e}")
            return None
            
    async def _handle_security_goal(self, task: Task) -> Dict[str, Any]:
        """Handle security-related goals."""
        goal = task.context.get("goal", task.description)
        
        # Create security workflow
        security_tasks = await self._create_security_workflow(goal)
        
        # Execute workflow
        workflow_id = str(uuid.uuid4())
        results = await self._execute_workflow(workflow_id, security_tasks)
        
        return {
            "success": True,
            "goal_type": "security",
            "workflow_results": results,
            "task_id": task.task_id
        }
        
    async def _handle_service_goal(self, task: Task) -> Dict[str, Any]:
        """Handle service-related goals."""
        goal = task.context.get("goal", task.description)
        
        # Create service workflow
        service_tasks = await self._create_service_workflow(goal)
        
        # Execute workflow
        workflow_id = str(uuid.uuid4())
        results = await self._execute_workflow(workflow_id, service_tasks)
        
        return {
            "success": True,
            "goal_type": "service",
            "workflow_results": results,
            "task_id": task.task_id
        }
        
    async def _handle_financial_goal(self, task: Task) -> Dict[str, Any]:
        """Handle financial-related goals."""
        goal = task.context.get("goal", task.description)
        
        # Create financial workflow
        financial_tasks = await self._create_financial_workflow(goal)
        
        # Execute workflow
        workflow_id = str(uuid.uuid4())
        results = await self._execute_workflow(workflow_id, financial_tasks)
        
        return {
            "success": True,
            "goal_type": "financial",
            "workflow_results": results,
            "task_id": task.task_id
        }
        
    async def _handle_generic_goal(self, task: Task) -> Dict[str, Any]:
        """Handle generic goals."""
        goal = task.context.get("goal", task.description)
        
        # Create generic workflow
        generic_tasks = await self._create_generic_workflow(goal)
        
        # Execute workflow
        workflow_id = str(uuid.uuid4())
        results = await self._execute_workflow(workflow_id, generic_tasks)
        
        return {
            "success": True,
            "goal_type": "generic",
            "workflow_results": results,
            "task_id": task.task_id
        }    a
sync def request_human_approval(self, 
                                   action: str, 
                                   context: Dict[str, Any],
                                   approval_type: ApprovalType = ApprovalType.HIGH_RISK_ACTION) -> bool:
        """Request human approval for a high-risk action."""
        try:
            self.logger.info(f"Requesting human approval for action: {action}")
            
            # Request approval through human interface
            request_id = await self.human_interface.request_approval(
                approval_type=approval_type,
                requester_agent_id=self.agent_id,
                action_description=action,
                context=context
            )
            
            if request_id == "auto_approved":
                self.logger.info(f"Action auto-approved: {action}")
                return True
                
            # Wait for approval decision
            approval_received = asyncio.Event()
            approval_result = {"approved": False, "reason": None}
            
            async def approval_callback(approved: bool, reason: Optional[str]):
                approval_result["approved"] = approved
                approval_result["reason"] = reason
                approval_received.set()
                
            # Register callback
            await self.human_interface.register_approval_callback(request_id, approval_callback)
            
            # Wait for approval with timeout
            try:
                await asyncio.wait_for(approval_received.wait(), timeout=1800)  # 30 minutes
                
                approved = approval_result["approved"]
                reason = approval_result["reason"]
                
                if approved:
                    self.logger.info(f"Action approved by human: {action}")
                    
                    # Learn from approval decision
                    await self._learn_from_approval_decision(action, context, True, reason)
                    
                    return True
                else:
                    self.logger.warning(f"Action rejected by human: {action} - Reason: {reason}")
                    
                    # Learn from rejection
                    await self._learn_from_approval_decision(action, context, False, reason)
                    
                    return False
                    
            except asyncio.TimeoutError:
                self.logger.error(f"Approval request timed out for action: {action}")
                return False
                
        except Exception as e:
            self.logger.error(f"Human approval request failed: {e}")
            return False
            
    async def _learn_from_approval_decision(self, 
                                          action: str, 
                                          context: Dict[str, Any],
                                          approved: bool, 
                                          reason: Optional[str]) -> None:
        """Learn from human approval decisions to improve future automation."""
        try:
            # Store decision in memory for learning
            decision_data = {
                "action": action,
                "context": context,
                "approved": approved,
                "reason": reason,
                "timestamp": datetime.utcnow().isoformat(),
                "risk_assessment": RiskAssessment.assess_action_risk(action, context)
            }
            
            await self._store_memory(f"approval_decision_{uuid.uuid4()}", decision_data, "long_term")
            
            # Analyze patterns and suggest improvements
            if len(self.human_interface.approval_history) % 10 == 0:  # Every 10 decisions
                await self._analyze_and_improve_automation()
                
        except Exception as e:
            self.logger.error(f"Learning from approval decision failed: {e}")
            
    async def _analyze_and_improve_automation(self) -> None:
        """Analyze approval patterns and improve automation."""
        try:
            self.logger.info("Analyzing approval patterns for automation improvements")
            
            # Get pattern analysis
            analysis = await self.learning_engine.analyze_approval_patterns()
            
            if analysis["status"] == "success":
                # Get auto-approval rule suggestions
                suggestions = await self.learning_engine.suggest_auto_approval_rules()
                
                if suggestions:
                    self.logger.info(f"Found {len(suggestions)} auto-approval rule suggestions")
                    
                    # For the prototype, we'll automatically add high-confidence rules
                    for suggestion in suggestions:
                        if suggestion["confidence"] > 0.95 and suggestion["sample_size"] >= 10:
                            rule = {
                                "name": suggestion["name"],
                                "max_risk_score": suggestion["max_risk_score"],
                                "action_patterns": [],  # Would be populated based on analysis
                                "context_constraints": {},
                                "confidence": suggestion["confidence"]
                            }
                            
                            await self.human_interface.add_auto_approval_rule(rule)
                            self.logger.info(f"Added auto-approval rule: {rule['name']}")
                            
                # Get threshold suggestions
                threshold_analysis = await self.learning_engine.update_risk_thresholds()
                
                if threshold_analysis["status"] == "success":
                    suggestions = threshold_analysis.get("threshold_suggestions", {})
                    
                    for threshold_type, suggestion in suggestions.items():
                        self.logger.info(f"Threshold suggestion for {threshold_type}: "
                                       f"{suggestion['current']} -> {suggestion['suggested']} "
                                       f"({suggestion['reason']})")
                        
        except Exception as e:
            self.logger.error(f"Automation improvement analysis failed: {e}")
            
    async def get_approval_dashboard_data(self) -> Dict[str, Any]:
        """Get data for human approval dashboard."""
        try:
            # Get pending approvals
            pending_approvals = await self.human_interface.get_pending_approvals()
            
            # Get approval statistics
            stats = await self.human_interface.get_approval_statistics()
            
            # Get recent decisions
            recent_decisions = self.human_interface.approval_history[-10:]
            
            # Get system status
            system_status = await system_coordinator.agent_registry.get_system_status()
            
            return {
                "pending_approvals": [
                    {
                        "request_id": req.request_id,
                        "action": req.action_description,
                        "risk_level": req.risk_assessment.get("risk_level", "UNKNOWN"),
                        "risk_score": req.risk_assessment.get("risk_score", 0.0),
                        "requester": req.requester_agent_id,
                        "created_at": req.created_at.isoformat(),
                        "expires_at": req.expires_at.isoformat(),
                        "type": req.approval_type.value
                    }
                    for req in pending_approvals
                ],
                "statistics": stats,
                "recent_decisions": [
                    {
                        "action": req.action_description,
                        "status": req.status.value,
                        "risk_level": req.risk_assessment.get("risk_level", "UNKNOWN"),
                        "approved_by": req.approved_by,
                        "approved_at": req.approved_at.isoformat() if req.approved_at else None
                    }
                    for req in recent_decisions
                ],
                "system_status": system_status
            }
            
        except Exception as e:
            self.logger.error(f"Dashboard data retrieval failed: {e}")
            return {
                "error": str(e),
                "pending_approvals": [],
                "statistics": {},
                "recent_decisions": [],
                "system_status": {}
            }
            
    async def handle_approval_decision(self, 
                                     request_id: str, 
                                     approved: bool, 
                                     approver_id: str,
                                     reason: Optional[str] = None) -> bool:
        """Handle approval decision from human operator."""
        try:
            success = await self.human_interface.provide_approval(
                request_id=request_id,
                approved=approved,
                approver_id=approver_id,
                reason=reason
            )
            
            if success:
                self.logger.info(f"Approval decision processed: {request_id} - {'Approved' if approved else 'Rejected'}")
                
                # Log the decision for audit
                await self._log_activity("approval_decision", {
                    "request_id": request_id,
                    "approved": approved,
                    "approver_id": approver_id,
                    "reason": reason
                })
                
            return success
            
        except Exception as e:
            self.logger.error(f"Approval decision handling failed: {e}")
            return False