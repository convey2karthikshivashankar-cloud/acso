"""ACSO Enterprise Framework - Trial and Onboarding System

30-day full-feature trial system with guided onboarding, setup wizards,
and usage analytics for expansion conversations.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
from decimal import Decimal

logger = logging.getLogger(__name__)

class TrialStatus(Enum):
    """Trial status."""
    ACTIVE = "active"
    EXPIRED = "expired"
    CONVERTED = "converted"
    CANCELLED = "cancelled"
    EXTENDED = "extended"

class OnboardingStage(Enum):
    """Onboarding stages."""
    REGISTRATION = "registration"
    PROFILE_SETUP = "profile_setup"
    INITIAL_CONFIGURATION = "initial_configuration"
    FIRST_AGENT_SETUP = "first_agent_setup"
    WORKFLOW_CREATION = "workflow_creation"
    INTEGRATION_SETUP = "integration_setup"
    DASHBOARD_CUSTOMIZATION = "dashboard_customization"
    COMPLETED = "completed"

class UserRole(Enum):
    """User roles for onboarding."""
    ADMIN = "admin"
    MANAGER = "manager"
    ANALYST = "analyst"
    DEVELOPER = "developer"
    END_USER = "end_user"

@dataclass
class TrialAccount:
    """Trial account definition."""
    trial_id: str
    user_id: str
    email: str
    company_name: str
    status: TrialStatus
    start_date: datetime
    end_date: datetime
    features_enabled: List[str] = field(default_factory=list)
    usage_metrics: Dict[str, Any] = field(default_factory=dict)
    conversion_score: float = 0.0
    metadata: Dict[str, Any] = field(default_factory=dict)
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

@dataclass
class OnboardingProgress:
    """Onboarding progress tracking."""
    progress_id: str
    trial_id: str
    current_stage: OnboardingStage
    completed_stages: List[OnboardingStage] = field(default_factory=list)
    stage_data: Dict[str, Any] = field(default_factory=dict)
    completion_percentage: float = 0.0
    estimated_completion_time: Optional[datetime] = None
    created_at: datetime = field(default_factory=datetime.now)
    updated_at: datetime = field(default_factory=datetime.now)

@dataclass
class OnboardingTask:
    """Individual onboarding task."""
    task_id: str
    name: str
    description: str
    stage: OnboardingStage
    is_required: bool
    is_completed: bool = False
    completion_time: Optional[datetime] = None
    help_url: str = ""
    video_url: str = ""
    estimated_duration: int = 0  # minutes
    dependencies: List[str] = field(default_factory=list)

class TrialManager:
    """Manages trial accounts and lifecycle."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize trial manager."""
        self.config = config
        self.trial_duration = config.get('trial_duration_days', 30)
        self.trials: Dict[str, TrialAccount] = {}
        self.trial_features = self._get_trial_features()
    
    def _get_trial_features(self) -> List[str]:
        """Get features available in trial."""
        return [
            'basic_agents',
            'workflow_designer',
            'dashboard_customization',
            'api_access',
            'integrations',
            'reporting',
            'email_support',
            'community_access'
        ]
    
    async def create_trial(
        self,
        user_id: str,
        email: str,
        company_name: str,
        additional_info: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Create a new trial account."""
        trial_id = str(uuid.uuid4())
        
        start_date = datetime.now()
        end_date = start_date + timedelta(days=self.trial_duration)
        
        trial_account = TrialAccount(
            trial_id=trial_id,
            user_id=user_id,
            email=email,
            company_name=company_name,
            status=TrialStatus.ACTIVE,
            start_date=start_date,
            end_date=end_date,
            features_enabled=self.trial_features.copy(),
            metadata=additional_info or {}
        )
        
        self.trials[trial_id] = trial_account
        
        # Initialize usage tracking
        await self._initialize_usage_tracking(trial_id)
        
        # Send welcome email
        await self._send_welcome_email(trial_account)
        
        return {
            'success': True,
            'trial_id': trial_id,
            'end_date': end_date,
            'features_enabled': self.trial_features,
            'onboarding_url': f"https://app.acso.ai/onboarding/{trial_id}"
        }
    
    async def _initialize_usage_tracking(self, trial_id: str):
        """Initialize usage tracking for trial."""
        trial = self.trials[trial_id]
        trial.usage_metrics = {
            'agents_created': 0,
            'workflows_created': 0,
            'api_calls': 0,
            'dashboard_views': 0,
            'integrations_configured': 0,
            'reports_generated': 0,
            'login_count': 0,
            'last_login': None,
            'feature_usage': {feature: 0 for feature in self.trial_features}
        }
    
    async def _send_welcome_email(self, trial: TrialAccount):
        """Send welcome email to trial user."""
        # In real implementation, integrate with email service
        logger.info(f"Sending welcome email to {trial.email} for trial {trial.trial_id}")
        
        email_content = {
            'to': trial.email,
            'subject': f'Welcome to ACSO - Your {self.trial_duration}-Day Trial Starts Now!',
            'template': 'trial_welcome',
            'variables': {
                'company_name': trial.company_name,
                'trial_end_date': trial.end_date.strftime('%B %d, %Y'),
                'onboarding_url': f"https://app.acso.ai/onboarding/{trial.trial_id}",
                'support_email': 'support@acso.ai'
            }
        }
        
        # Simulate email sending
        await asyncio.sleep(0.1)
        return email_content
    
    async def track_usage(
        self,
        trial_id: str,
        metric: str,
        value: int = 1,
        metadata: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Track usage metrics for trial."""
        if trial_id not in self.trials:
            return {'success': False, 'error': 'Trial not found'}
        
        trial = self.trials[trial_id]
        
        if metric in trial.usage_metrics:
            trial.usage_metrics[metric] += value
        else:
            trial.usage_metrics[metric] = value
        
        # Update last activity
        trial.usage_metrics['last_activity'] = datetime.now()
        trial.updated_at = datetime.now()
        
        # Update conversion score
        await self._update_conversion_score(trial_id)
        
        return {
            'success': True,
            'metric': metric,
            'new_value': trial.usage_metrics[metric]
        }
    
    async def _update_conversion_score(self, trial_id: str):
        """Update conversion score based on usage patterns."""
        trial = self.trials[trial_id]
        usage = trial.usage_metrics
        
        score = 0.0
        
        # Login frequency (0-20 points)
        login_count = usage.get('login_count', 0)
        score += min(20, login_count * 2)
        
        # Feature adoption (0-30 points)
        features_used = sum(1 for v in usage.get('feature_usage', {}).values() if v > 0)
        score += (features_used / len(self.trial_features)) * 30
        
        # Content creation (0-25 points)
        agents_created = usage.get('agents_created', 0)
        workflows_created = usage.get('workflows_created', 0)
        score += min(25, (agents_created * 5) + (workflows_created * 3))
        
        # Integration setup (0-15 points)
        integrations = usage.get('integrations_configured', 0)
        score += min(15, integrations * 5)
        
        # Engagement depth (0-10 points)
        dashboard_views = usage.get('dashboard_views', 0)
        reports_generated = usage.get('reports_generated', 0)
        score += min(10, (dashboard_views * 0.5) + (reports_generated * 2))
        
        trial.conversion_score = min(100.0, score)
    
    async def extend_trial(
        self,
        trial_id: str,
        additional_days: int,
        reason: str = ""
    ) -> Dict[str, Any]:
        """Extend trial period."""
        if trial_id not in self.trials:
            return {'success': False, 'error': 'Trial not found'}
        
        trial = self.trials[trial_id]
        
        if trial.status != TrialStatus.ACTIVE:
            return {'success': False, 'error': 'Trial is not active'}
        
        old_end_date = trial.end_date
        trial.end_date += timedelta(days=additional_days)
        trial.status = TrialStatus.EXTENDED
        trial.metadata['extension_reason'] = reason
        trial.metadata['extension_date'] = datetime.now()
        trial.updated_at = datetime.now()
        
        return {
            'success': True,
            'old_end_date': old_end_date,
            'new_end_date': trial.end_date,
            'additional_days': additional_days
        }
    
    async def convert_trial(
        self,
        trial_id: str,
        subscription_plan: str,
        payment_info: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Convert trial to paid subscription."""
        if trial_id not in self.trials:
            return {'success': False, 'error': 'Trial not found'}
        
        trial = self.trials[trial_id]
        trial.status = TrialStatus.CONVERTED
        trial.metadata['conversion_date'] = datetime.now()
        trial.metadata['subscription_plan'] = subscription_plan
        trial.updated_at = datetime.now()
        
        # In real implementation, process payment and create subscription
        conversion_result = {
            'trial_id': trial_id,
            'subscription_plan': subscription_plan,
            'conversion_date': datetime.now(),
            'conversion_score': trial.conversion_score
        }
        
        return {
            'success': True,
            'conversion': conversion_result
        }
    
    async def get_trial_status(self, trial_id: str) -> Dict[str, Any]:
        """Get comprehensive trial status."""
        if trial_id not in self.trials:
            return {'success': False, 'error': 'Trial not found'}
        
        trial = self.trials[trial_id]
        
        days_remaining = (trial.end_date - datetime.now()).days
        days_used = (datetime.now() - trial.start_date).days
        
        return {
            'success': True,
            'trial_id': trial_id,
            'status': trial.status.value,
            'days_remaining': max(0, days_remaining),
            'days_used': days_used,
            'total_days': self.trial_duration,
            'usage_percentage': (days_used / self.trial_duration) * 100,
            'conversion_score': trial.conversion_score,
            'features_enabled': trial.features_enabled,
            'usage_metrics': trial.usage_metrics
        }

class OnboardingWizard:
    """Guided onboarding wizard system."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize onboarding wizard."""
        self.config = config
        self.onboarding_progress: Dict[str, OnboardingProgress] = {}
        self.onboarding_tasks = self._initialize_onboarding_tasks()
    
    def _initialize_onboarding_tasks(self) -> Dict[OnboardingStage, List[OnboardingTask]]:
        """Initialize onboarding tasks for each stage."""
        tasks = {
            OnboardingStage.REGISTRATION: [
                OnboardingTask(
                    task_id="verify_email",
                    name="Verify Email Address",
                    description="Verify your email address to secure your account",
                    stage=OnboardingStage.REGISTRATION,
                    is_required=True,
                    estimated_duration=2
                ),
                OnboardingTask(
                    task_id="setup_password",
                    name="Set Strong Password",
                    description="Create a secure password for your account",
                    stage=OnboardingStage.REGISTRATION,
                    is_required=True,
                    estimated_duration=3
                )
            ],
            OnboardingStage.PROFILE_SETUP: [
                OnboardingTask(
                    task_id="company_info",
                    name="Company Information",
                    description="Tell us about your company and use case",
                    stage=OnboardingStage.PROFILE_SETUP,
                    is_required=True,
                    estimated_duration=5
                ),
                OnboardingTask(
                    task_id="role_selection",
                    name="Select Your Role",
                    description="Choose your role to customize your experience",
                    stage=OnboardingStage.PROFILE_SETUP,
                    is_required=True,
                    estimated_duration=2
                ),
                OnboardingTask(
                    task_id="team_size",
                    name="Team Size",
                    description="How many people will be using ACSO?",
                    stage=OnboardingStage.PROFILE_SETUP,
                    is_required=False,
                    estimated_duration=1
                )
            ],
            OnboardingStage.INITIAL_CONFIGURATION: [
                OnboardingTask(
                    task_id="timezone_setup",
                    name="Set Timezone",
                    description="Configure your timezone for accurate scheduling",
                    stage=OnboardingStage.INITIAL_CONFIGURATION,
                    is_required=True,
                    estimated_duration=2
                ),
                OnboardingTask(
                    task_id="notification_preferences",
                    name="Notification Preferences",
                    description="Choose how you want to receive notifications",
                    stage=OnboardingStage.INITIAL_CONFIGURATION,
                    is_required=False,
                    estimated_duration=3
                )
            ],
            OnboardingStage.FIRST_AGENT_SETUP: [
                OnboardingTask(
                    task_id="create_first_agent",
                    name="Create Your First Agent",
                    description="Set up your first AI agent using our guided wizard",
                    stage=OnboardingStage.FIRST_AGENT_SETUP,
                    is_required=True,
                    estimated_duration=10,
                    help_url="https://docs.acso.ai/agents/getting-started",
                    video_url="https://videos.acso.ai/first-agent-setup"
                ),
                OnboardingTask(
                    task_id="test_agent",
                    name="Test Your Agent",
                    description="Run a test to ensure your agent is working correctly",
                    stage=OnboardingStage.FIRST_AGENT_SETUP,
                    is_required=True,
                    estimated_duration=5,
                    dependencies=["create_first_agent"]
                )
            ],
            OnboardingStage.WORKFLOW_CREATION: [
                OnboardingTask(
                    task_id="create_workflow",
                    name="Create a Workflow",
                    description="Build your first automated workflow",
                    stage=OnboardingStage.WORKFLOW_CREATION,
                    is_required=False,
                    estimated_duration=15,
                    help_url="https://docs.acso.ai/workflows/getting-started"
                ),
                OnboardingTask(
                    task_id="workflow_templates",
                    name="Explore Workflow Templates",
                    description="Browse and try pre-built workflow templates",
                    stage=OnboardingStage.WORKFLOW_CREATION,
                    is_required=False,
                    estimated_duration=8
                )
            ],
            OnboardingStage.INTEGRATION_SETUP: [
                OnboardingTask(
                    task_id="connect_first_integration",
                    name="Connect Your First Integration",
                    description="Connect ACSO to your existing tools",
                    stage=OnboardingStage.INTEGRATION_SETUP,
                    is_required=False,
                    estimated_duration=12,
                    help_url="https://docs.acso.ai/integrations"
                ),
                OnboardingTask(
                    task_id="api_key_setup",
                    name="Generate API Keys",
                    description="Create API keys for external integrations",
                    stage=OnboardingStage.INTEGRATION_SETUP,
                    is_required=False,
                    estimated_duration=5
                )
            ],
            OnboardingStage.DASHBOARD_CUSTOMIZATION: [
                OnboardingTask(
                    task_id="customize_dashboard",
                    name="Customize Your Dashboard",
                    description="Arrange widgets and customize your main dashboard",
                    stage=OnboardingStage.DASHBOARD_CUSTOMIZATION,
                    is_required=False,
                    estimated_duration=8
                ),
                OnboardingTask(
                    task_id="setup_alerts",
                    name="Configure Alerts",
                    description="Set up alerts and notifications for important events",
                    stage=OnboardingStage.DASHBOARD_CUSTOMIZATION,
                    is_required=False,
                    estimated_duration=6
                )
            ]
        }
        
        return tasks
    
    async def start_onboarding(self, trial_id: str) -> Dict[str, Any]:
        """Start onboarding process for trial."""
        progress_id = str(uuid.uuid4())
        
        progress = OnboardingProgress(
            progress_id=progress_id,
            trial_id=trial_id,
            current_stage=OnboardingStage.REGISTRATION,
            estimated_completion_time=datetime.now() + timedelta(hours=2)
        )
        
        self.onboarding_progress[progress_id] = progress
        
        # Get first stage tasks
        first_stage_tasks = self.onboarding_tasks[OnboardingStage.REGISTRATION]
        
        return {
            'success': True,
            'progress_id': progress_id,
            'current_stage': OnboardingStage.REGISTRATION.value,
            'tasks': [
                {
                    'task_id': task.task_id,
                    'name': task.name,
                    'description': task.description,
                    'is_required': task.is_required,
                    'estimated_duration': task.estimated_duration,
                    'help_url': task.help_url,
                    'video_url': task.video_url
                }
                for task in first_stage_tasks
            ]
        }
    
    async def complete_task(
        self,
        progress_id: str,
        task_id: str,
        task_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Complete an onboarding task."""
        if progress_id not in self.onboarding_progress:
            return {'success': False, 'error': 'Onboarding progress not found'}
        
        progress = self.onboarding_progress[progress_id]
        current_stage_tasks = self.onboarding_tasks[progress.current_stage]
        
        # Find the task
        task = None
        for t in current_stage_tasks:
            if t.task_id == task_id:
                task = t
                break
        
        if not task:
            return {'success': False, 'error': 'Task not found'}
        
        # Check dependencies
        for dep_task_id in task.dependencies:
            if dep_task_id not in progress.stage_data.get('completed_tasks', []):
                return {'success': False, 'error': f'Dependency {dep_task_id} not completed'}
        
        # Mark task as completed
        task.is_completed = True
        task.completion_time = datetime.now()
        
        # Store task data
        if 'completed_tasks' not in progress.stage_data:
            progress.stage_data['completed_tasks'] = []
        progress.stage_data['completed_tasks'].append(task_id)
        
        if task_data:
            progress.stage_data[task_id] = task_data
        
        # Check if stage is complete
        required_tasks = [t for t in current_stage_tasks if t.is_required]
        completed_required_tasks = [
            t for t in required_tasks 
            if t.task_id in progress.stage_data.get('completed_tasks', [])
        ]
        
        stage_complete = len(completed_required_tasks) == len(required_tasks)
        
        if stage_complete:
            await self._advance_to_next_stage(progress_id)
        
        # Update completion percentage
        await self._update_completion_percentage(progress_id)
        
        return {
            'success': True,
            'task_completed': task_id,
            'stage_complete': stage_complete,
            'completion_percentage': progress.completion_percentage
        }
    
    async def _advance_to_next_stage(self, progress_id: str):
        """Advance to next onboarding stage."""
        progress = self.onboarding_progress[progress_id]
        
        # Add current stage to completed stages
        progress.completed_stages.append(progress.current_stage)
        
        # Determine next stage
        stage_order = list(OnboardingStage)
        current_index = stage_order.index(progress.current_stage)
        
        if current_index < len(stage_order) - 1:
            progress.current_stage = stage_order[current_index + 1]
        else:
            progress.current_stage = OnboardingStage.COMPLETED
        
        progress.updated_at = datetime.now()
    
    async def _update_completion_percentage(self, progress_id: str):
        """Update overall completion percentage."""
        progress = self.onboarding_progress[progress_id]
        
        total_required_tasks = 0
        completed_required_tasks = 0
        
        for stage, tasks in self.onboarding_tasks.items():
            required_tasks = [t for t in tasks if t.is_required]
            total_required_tasks += len(required_tasks)
            
            if stage in progress.completed_stages:
                completed_required_tasks += len(required_tasks)
            elif stage == progress.current_stage:
                stage_completed = len([
                    t for t in required_tasks 
                    if t.task_id in progress.stage_data.get('completed_tasks', [])
                ])
                completed_required_tasks += stage_completed
        
        if total_required_tasks > 0:
            progress.completion_percentage = (completed_required_tasks / total_required_tasks) * 100
        else:
            progress.completion_percentage = 100.0
    
    async def get_onboarding_status(self, progress_id: str) -> Dict[str, Any]:
        """Get current onboarding status."""
        if progress_id not in self.onboarding_progress:
            return {'success': False, 'error': 'Onboarding progress not found'}
        
        progress = self.onboarding_progress[progress_id]
        
        # Get current stage tasks
        current_tasks = []
        if progress.current_stage != OnboardingStage.COMPLETED:
            stage_tasks = self.onboarding_tasks[progress.current_stage]
            current_tasks = [
                {
                    'task_id': task.task_id,
                    'name': task.name,
                    'description': task.description,
                    'is_required': task.is_required,
                    'is_completed': task.task_id in progress.stage_data.get('completed_tasks', []),
                    'estimated_duration': task.estimated_duration,
                    'help_url': task.help_url,
                    'video_url': task.video_url
                }
                for task in stage_tasks
            ]
        
        return {
            'success': True,
            'progress_id': progress_id,
            'current_stage': progress.current_stage.value,
            'completed_stages': [stage.value for stage in progress.completed_stages],
            'completion_percentage': progress.completion_percentage,
            'current_tasks': current_tasks,
            'estimated_completion_time': progress.estimated_completion_time
        }

class UsageAnalytics:
    """Analytics for trial usage and conversion optimization."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize usage analytics."""
        self.config = config
        self.analytics_data: Dict[str, Any] = {}
    
    async def analyze_trial_usage(self, trial_id: str) -> Dict[str, Any]:
        """Analyze trial usage patterns."""
        # Simulate usage analysis
        analysis = {
            'trial_id': trial_id,
            'engagement_score': 75.5,
            'feature_adoption': {
                'agents': {'used': True, 'frequency': 'daily', 'proficiency': 'intermediate'},
                'workflows': {'used': True, 'frequency': 'weekly', 'proficiency': 'beginner'},
                'integrations': {'used': False, 'frequency': 'never', 'proficiency': 'none'},
                'dashboards': {'used': True, 'frequency': 'daily', 'proficiency': 'advanced'}
            },
            'usage_patterns': {
                'peak_hours': ['9-11 AM', '2-4 PM'],
                'most_used_features': ['agent_management', 'dashboard_views'],
                'least_used_features': ['api_access', 'reporting']
            },
            'conversion_indicators': {
                'positive': [
                    'High daily engagement',
                    'Multiple agents created',
                    'Dashboard customization'
                ],
                'negative': [
                    'No integrations configured',
                    'Limited workflow usage'
                ]
            },
            'recommendations': [
                'Schedule integration setup call',
                'Provide workflow templates',
                'Offer extended trial for integration setup'
            ]
        }
        
        return {
            'success': True,
            'analysis': analysis
        }
    
    async def get_conversion_insights(self, trial_id: str) -> Dict[str, Any]:
        """Get insights for conversion optimization."""
        # Simulate conversion insights
        insights = {
            'trial_id': trial_id,
            'conversion_probability': 68.5,
            'key_factors': {
                'positive': [
                    {'factor': 'Daily login streak', 'weight': 0.25, 'score': 85},
                    {'factor': 'Feature exploration', 'weight': 0.20, 'score': 72},
                    {'factor': 'Content creation', 'weight': 0.30, 'score': 90}
                ],
                'negative': [
                    {'factor': 'Integration setup', 'weight': 0.15, 'score': 20},
                    {'factor': 'Team collaboration', 'weight': 0.10, 'score': 35}
                ]
            },
            'optimal_conversion_timing': {
                'recommended_day': 18,
                'confidence': 0.78,
                'reasoning': 'User shows high engagement but may need integration support'
            },
            'personalized_offers': [
                {
                    'type': 'discount',
                    'value': '20% off first year',
                    'condition': 'Convert within 7 days'
                },
                {
                    'type': 'service',
                    'value': 'Free integration setup',
                    'condition': 'Professional plan or higher'
                }
            ]
        }
        
        return {
            'success': True,
            'insights': insights
        }

class TrialOnboardingSystem:
    """Main trial and onboarding system coordinator."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize trial and onboarding system."""
        self.config = config
        self.trial_manager = TrialManager(config.get('trial', {}))
        self.onboarding_wizard = OnboardingWizard(config.get('onboarding', {}))
        self.usage_analytics = UsageAnalytics(config.get('analytics', {}))
        
        logger.info("Trial and onboarding system initialized")
    
    async def start_trial(
        self,
        user_id: str,
        email: str,
        company_name: str,
        additional_info: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Start a new trial with onboarding."""
        # Create trial account
        trial_result = await self.trial_manager.create_trial(
            user_id, email, company_name, additional_info
        )
        
        if not trial_result['success']:
            return trial_result
        
        trial_id = trial_result['trial_id']
        
        # Start onboarding process
        onboarding_result = await self.onboarding_wizard.start_onboarding(trial_id)
        
        return {
            'success': True,
            'trial': trial_result,
            'onboarding': onboarding_result
        }
    
    async def track_activity(
        self,
        trial_id: str,
        activity_type: str,
        activity_data: Dict[str, Any] = None
    ) -> Dict[str, Any]:
        """Track trial user activity."""
        return await self.trial_manager.track_usage(
            trial_id, activity_type, 1, activity_data
        )
    
    async def get_trial_dashboard(self, trial_id: str) -> Dict[str, Any]:
        """Get comprehensive trial dashboard data."""
        # Get trial status
        trial_status = await self.trial_manager.get_trial_status(trial_id)
        if not trial_status['success']:
            return trial_status
        
        # Get onboarding progress
        progress_id = f"progress_{trial_id}"  # Simplified lookup
        onboarding_status = await self.onboarding_wizard.get_onboarding_status(progress_id)
        
        # Get usage analytics
        usage_analysis = await self.usage_analytics.analyze_trial_usage(trial_id)
        
        # Get conversion insights
        conversion_insights = await self.usage_analytics.get_conversion_insights(trial_id)
        
        return {
            'success': True,
            'trial_status': trial_status,
            'onboarding_status': onboarding_status,
            'usage_analysis': usage_analysis,
            'conversion_insights': conversion_insights
        }

# Example usage
if __name__ == "__main__":
    config = {
        'trial': {
            'trial_duration_days': 30
        },
        'onboarding': {
            'auto_advance': True
        },
        'analytics': {
            'track_detailed_usage': True
        }
    }
    
    trial_system = TrialOnboardingSystem(config)
    
    async def example_usage():
        # Start a new trial
        trial_result = await trial_system.start_trial(
            "user-123",
            "john.doe@company.com",
            "Acme Corporation",
            {
                'industry': 'Technology',
                'company_size': '50-100',
                'use_case': 'Security Automation'
            }
        )
        
        if trial_result['success']:
            trial_id = trial_result['trial']['trial_id']
            
            # Simulate some user activities
            await trial_system.track_activity(trial_id, 'login_count')
            await trial_system.track_activity(trial_id, 'agents_created')
            await trial_system.track_activity(trial_id, 'dashboard_views')
            
            # Get trial dashboard
            dashboard_result = await trial_system.get_trial_dashboard(trial_id)
            print(f"Trial Dashboard: {dashboard_result}")
    
    asyncio.run(example_usage())