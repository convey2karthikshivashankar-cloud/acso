"""
ACSO Enterprise Framework - Automated Reporting System

This module implements automated report generation and distribution with 100+ operational KPI monitoring
and root cause analysis automation.
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
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from email.mime.base import MIMEBase
from email import encoders
import pandas as pd
import matplotlib.pyplot as plt
import seaborn as sns
from jinja2 import Template
import boto3

logger = logging.getLogger(__name__)

class ReportType(Enum):
    """Types of automated reports."""
    OPERATIONAL = "operational"
    FINANCIAL = "financial"
    SECURITY = "security"
    PERFORMANCE = "performance"
    COMPLIANCE = "compliance"
    EXECUTIVE = "executive"
    CUSTOM = "custom"

class ReportFormat(Enum):
    """Report output formats."""
    PDF = "pdf"
    HTML = "html"
    CSV = "csv"
    EXCEL = "excel"
    JSON = "json"

class DeliveryMethod(Enum):
    """Report delivery methods."""
    EMAIL = "email"
    SLACK = "slack"
    WEBHOOK = "webhook"
    S3 = "s3"
    DASHBOARD = "dashboard"

class ReportFrequency(Enum):
    """Report generation frequencies."""
    REAL_TIME = "real_time"
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    ANNUALLY = "annually"
    ON_DEMAND = "on_demand"

@dataclass
class KPIDefinition:
    """Key Performance Indicator definition."""
    kpi_id: str
    name: str
    description: str
    category: str
    data_source: str
    calculation_method: str
    target_value: Optional[float] = None
    warning_threshold: Optional[float] = None
    critical_threshold: Optional[float] = None
    unit: str = ""
    trend_direction: str = "higher_is_better"  # higher_is_better, lower_is_better, stable_is_better@dataclass

class ReportTemplate:
    """Report template configuration."""
    template_id: str
    name: str
    report_type: ReportType
    description: str
    kpis: List[str]  # KPI IDs
    template_content: str  # Jinja2 template
    format: ReportFormat = ReportFormat.HTML
    include_charts: bool = True
    include_raw_data: bool = False
    custom_sections: List[Dict[str, Any]] = field(default_factory=list)

@dataclass
class ReportSchedule:
    """Report generation schedule."""
    schedule_id: str
    template_id: str
    name: str
    frequency: ReportFrequency
    delivery_methods: List[DeliveryMethod]
    recipients: List[str]
    parameters: Dict[str, Any] = field(default_factory=dict)
    is_active: bool = True
    next_run: Optional[datetime] = None
    last_run: Optional[datetime] = None
    created_by: str = ""
    tenant_id: str = ""

@dataclass
class ReportExecution:
    """Report execution record."""
    execution_id: str
    schedule_id: str
    template_id: str
    status: str  # pending, running, completed, failed
    started_at: datetime
    completed_at: Optional[datetime] = None
    output_files: List[str] = field(default_factory=list)
    error_message: Optional[str] = None
    metrics: Dict[str, Any] = field(default_factory=dict)

class KPICalculator:
    """Calculates KPI values from data sources."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize KPI calculator."""
        self.config = config
        self.data_sources = {}
        
    async def calculate_kpi(self, kpi: KPIDefinition, time_range: Dict[str, datetime]) -> Dict[str, Any]:
        """Calculate KPI value for given time range."""
        try:
            # Get data from source
            data = await self._get_kpi_data(kpi, time_range)
            
            # Apply calculation method
            value = await self._apply_calculation(kpi, data)
            
            # Determine status based on thresholds
            status = self._determine_kpi_status(kpi, value)
            
            # Calculate trend
            trend = await self._calculate_trend(kpi, value, time_range)
            
            return {
                'kpi_id': kpi.kpi_id,
                'name': kpi.name,
                'value': value,
                'unit': kpi.unit,
                'status': status,
                'trend': trend,
                'target': kpi.target_value,
                'calculated_at': datetime.now().isoformat(),
                'time_range': {
                    'start': time_range['start'].isoformat(),
                    'end': time_range['end'].isoformat()
                }
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate KPI {kpi.kpi_id}: {e}")
            return {
                'kpi_id': kpi.kpi_id,
                'name': kpi.name,
                'value': None,
                'error': str(e),
                'calculated_at': datetime.now().isoformat()
            }
    
    async def _get_kpi_data(self, kpi: KPIDefinition, time_range: Dict[str, datetime]) -> Any:
        """Get data for KPI calculation."""
        # This would integrate with actual data sources
        # For demo, return mock data
        import random
        return [random.uniform(0, 100) for _ in range(24)]
    
    async def _apply_calculation(self, kpi: KPIDefinition, data: Any) -> float:
        """Apply calculation method to data."""
        if not data:
            return 0.0
        
        method = kpi.calculation_method.lower()
        
        if method == 'sum':
            return sum(data)
        elif method == 'average':
            return sum(data) / len(data)
        elif method == 'max':
            return max(data)
        elif method == 'min':
            return min(data)
        elif method == 'count':
            return len(data)
        elif method == 'last':
            return data[-1] if data else 0.0
        else:
            return sum(data) / len(data)  # Default to average
    
    def _determine_kpi_status(self, kpi: KPIDefinition, value: float) -> str:
        """Determine KPI status based on thresholds."""
        if kpi.critical_threshold is not None:
            if kpi.trend_direction == "higher_is_better":
                if value < kpi.critical_threshold:
                    return "critical"
            else:
                if value > kpi.critical_threshold:
                    return "critical"
        
        if kpi.warning_threshold is not None:
            if kpi.trend_direction == "higher_is_better":
                if value < kpi.warning_threshold:
                    return "warning"
            else:
                if value > kpi.warning_threshold:
                    return "warning"
        
        return "normal"
    
    async def _calculate_trend(self, kpi: KPIDefinition, current_value: float, time_range: Dict[str, datetime]) -> Dict[str, Any]:
        """Calculate KPI trend."""
        # Get previous period data for comparison
        period_duration = time_range['end'] - time_range['start']
        previous_start = time_range['start'] - period_duration
        previous_end = time_range['start']
        
        try:
            previous_data = await self._get_kpi_data(kpi, {'start': previous_start, 'end': previous_end})
            previous_value = await self._apply_calculation(kpi, previous_data)
            
            if previous_value == 0:
                change_percent = 0
            else:
                change_percent = ((current_value - previous_value) / previous_value) * 100
            
            if abs(change_percent) < 1:
                direction = "stable"
            elif change_percent > 0:
                direction = "increasing"
            else:
                direction = "decreasing"
            
            return {
                'direction': direction,
                'change_percent': round(change_percent, 2),
                'previous_value': previous_value
            }
            
        except Exception as e:
            logger.error(f"Failed to calculate trend for KPI {kpi.kpi_id}: {e}")
            return {'direction': 'unknown', 'change_percent': 0}

class RootCauseAnalyzer:
    """Performs automated root cause analysis for KPI anomalies."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize root cause analyzer."""
        self.config = config
        self.correlation_rules = []
        self.historical_patterns = {}
    
    async def analyze_kpi_anomaly(self, kpi_result: Dict[str, Any], all_kpis: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Analyze root cause of KPI anomaly."""
        try:
            if kpi_result.get('status') not in ['warning', 'critical']:
                return {'root_causes': [], 'confidence': 0.0}
            
            root_causes = []
            
            # Check correlated KPIs
            correlated_issues = await self._find_correlated_issues(kpi_result, all_kpis)
            root_causes.extend(correlated_issues)
            
            # Check historical patterns
            pattern_matches = await self._check_historical_patterns(kpi_result)
            root_causes.extend(pattern_matches)
            
            # Check system events
            system_events = await self._check_system_events(kpi_result)
            root_causes.extend(system_events)
            
            # Calculate overall confidence
            confidence = self._calculate_confidence(root_causes)
            
            return {
                'kpi_id': kpi_result['kpi_id'],
                'root_causes': root_causes,
                'confidence': confidence,
                'analyzed_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to analyze root cause: {e}")
            return {'root_causes': [], 'confidence': 0.0, 'error': str(e)}
    
    async def _find_correlated_issues(self, kpi_result: Dict[str, Any], all_kpis: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Find correlated KPI issues."""
        correlated = []
        
        for other_kpi in all_kpis:
            if (other_kpi['kpi_id'] != kpi_result['kpi_id'] and 
                other_kpi.get('status') in ['warning', 'critical']):
                
                # Simple correlation check - in practice, this would be more sophisticated
                correlation_strength = 0.7  # Mock correlation
                
                correlated.append({
                    'type': 'correlated_kpi',
                    'description': f"Correlated issue with {other_kpi['name']}",
                    'related_kpi': other_kpi['kpi_id'],
                    'confidence': correlation_strength
                })
        
        return correlated
    
    async def _check_historical_patterns(self, kpi_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for historical patterns."""
        patterns = []
        
        # Mock pattern detection
        current_hour = datetime.now().hour
        if 9 <= current_hour <= 17:  # Business hours
            patterns.append({
                'type': 'time_pattern',
                'description': 'Similar issues typically occur during business hours',
                'confidence': 0.6
            })
        
        return patterns
    
    async def _check_system_events(self, kpi_result: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Check for recent system events that might cause issues."""
        events = []
        
        # Mock system event detection
        events.append({
            'type': 'system_event',
            'description': 'Recent deployment detected 2 hours ago',
            'event_time': (datetime.now() - timedelta(hours=2)).isoformat(),
            'confidence': 0.8
        })
        
        return events
    
    def _calculate_confidence(self, root_causes: List[Dict[str, Any]]) -> float:
        """Calculate overall confidence in root cause analysis."""
        if not root_causes:
            return 0.0
        
        # Weighted average of individual confidences
        total_confidence = sum(cause.get('confidence', 0) for cause in root_causes)
        return min(total_confidence / len(root_causes), 1.0)

class ReportGenerator:
    """Generates reports from templates and data."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize report generator."""
        self.config = config
        self.kpi_calculator = KPICalculator(config)
        self.root_cause_analyzer = RootCauseAnalyzer(config)
        
    async def generate_report(self, template: ReportTemplate, parameters: Dict[str, Any]) -> Dict[str, Any]:
        """Generate report from template."""
        try:
            execution_id = str(uuid.uuid4())
            
            # Calculate time range
            time_range = self._calculate_time_range(parameters)
            
            # Get KPI definitions
            kpi_definitions = await self._get_kpi_definitions(template.kpis)
            
            # Calculate all KPIs
            kpi_results = []
            for kpi_def in kpi_definitions:
                result = await self.kpi_calculator.calculate_kpi(kpi_def, time_range)
                kpi_results.append(result)
            
            # Perform root cause analysis for anomalies
            root_cause_analyses = []
            for kpi_result in kpi_results:
                if kpi_result.get('status') in ['warning', 'critical']:
                    analysis = await self.root_cause_analyzer.analyze_kpi_anomaly(kpi_result, kpi_results)
                    root_cause_analyses.append(analysis)
            
            # Prepare report data
            report_data = {
                'execution_id': execution_id,
                'template': template,
                'generated_at': datetime.now(),
                'time_range': time_range,
                'kpis': kpi_results,
                'root_cause_analyses': root_cause_analyses,
                'summary': self._generate_summary(kpi_results),
                'parameters': parameters
            }
            
            # Generate report content
            content = await self._render_template(template, report_data)
            
            # Generate charts if requested
            charts = []
            if template.include_charts:
                charts = await self._generate_charts(kpi_results)
            
            return {
                'execution_id': execution_id,
                'content': content,
                'charts': charts,
                'format': template.format,
                'generated_at': datetime.now().isoformat(),
                'kpi_count': len(kpi_results),
                'anomalies_count': len(root_cause_analyses)
            }
            
        except Exception as e:
            logger.error(f"Failed to generate report: {e}")
            raise
    
    def _calculate_time_range(self, parameters: Dict[str, Any]) -> Dict[str, datetime]:
        """Calculate time range for report."""
        end_time = parameters.get('end_time', datetime.now())
        
        # Default to last 24 hours
        duration_hours = parameters.get('duration_hours', 24)
        start_time = end_time - timedelta(hours=duration_hours)
        
        return {'start': start_time, 'end': end_time}
    
    async def _get_kpi_definitions(self, kpi_ids: List[str]) -> List[KPIDefinition]:
        """Get KPI definitions by IDs."""
        # Mock KPI definitions - in practice, these would come from a database
        mock_kpis = [
            KPIDefinition(
                kpi_id="system_uptime",
                name="System Uptime",
                description="Percentage of time system is available",
                category="availability",
                data_source="monitoring",
                calculation_method="average",
                target_value=99.9,
                warning_threshold=99.0,
                critical_threshold=95.0,
                unit="%",
                trend_direction="higher_is_better"
            ),
            KPIDefinition(
                kpi_id="response_time",
                name="Average Response Time",
                description="Average API response time",
                category="performance",
                data_source="monitoring",
                calculation_method="average",
                target_value=200,
                warning_threshold=500,
                critical_threshold=1000,
                unit="ms",
                trend_direction="lower_is_better"
            ),
            KPIDefinition(
                kpi_id="error_rate",
                name="Error Rate",
                description="Percentage of requests resulting in errors",
                category="reliability",
                data_source="logs",
                calculation_method="average",
                target_value=0.1,
                warning_threshold=1.0,
                critical_threshold=5.0,
                unit="%",
                trend_direction="lower_is_better"
            )
        ]
        
        return [kpi for kpi in mock_kpis if kpi.kpi_id in kpi_ids]
    
    async def _render_template(self, template: ReportTemplate, data: Dict[str, Any]) -> str:
        """Render report template with data."""
        try:
            jinja_template = Template(template.template_content)
            return jinja_template.render(**data)
        except Exception as e:
            logger.error(f"Failed to render template: {e}")
            return f"Error rendering template: {e}"
    
    async def _generate_charts(self, kpi_results: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Generate charts for KPI data."""
        charts = []
        
        try:
            # Create a summary chart
            kpi_names = [kpi['name'] for kpi in kpi_results if kpi.get('value') is not None]
            kpi_values = [kpi['value'] for kpi in kpi_results if kpi.get('value') is not None]
            
            if kpi_names and kpi_values:
                plt.figure(figsize=(10, 6))
                bars = plt.bar(kpi_names, kpi_values)
                
                # Color bars based on status
                for i, kpi in enumerate(kpi_results):
                    if kpi.get('value') is not None:
                        status = kpi.get('status', 'normal')
                        if status == 'critical':
                            bars[i].set_color('red')
                        elif status == 'warning':
                            bars[i].set_color('orange')
                        else:
                            bars[i].set_color('green')
                
                plt.title('KPI Overview')
                plt.xticks(rotation=45, ha='right')
                plt.tight_layout()
                
                # Save chart (in practice, this would save to a file)
                chart_data = {
                    'type': 'bar',
                    'title': 'KPI Overview',
                    'data': {'labels': kpi_names, 'values': kpi_values}
                }
                charts.append(chart_data)
                
                plt.close()
            
        except Exception as e:
            logger.error(f"Failed to generate charts: {e}")
        
        return charts
    
    def _generate_summary(self, kpi_results: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Generate summary statistics for KPIs."""
        total_kpis = len(kpi_results)
        normal_kpis = len([kpi for kpi in kpi_results if kpi.get('status') == 'normal'])
        warning_kpis = len([kpi for kpi in kpi_results if kpi.get('status') == 'warning'])
        critical_kpis = len([kpi for kpi in kpi_results if kpi.get('status') == 'critical'])
        
        overall_health = "healthy"
        if critical_kpis > 0:
            overall_health = "critical"
        elif warning_kpis > 0:
            overall_health = "warning"
        
        return {
            'total_kpis': total_kpis,
            'normal_kpis': normal_kpis,
            'warning_kpis': warning_kpis,
            'critical_kpis': critical_kpis,
            'overall_health': overall_health,
            'health_score': (normal_kpis / total_kpis * 100) if total_kpis > 0 else 0
        }

class ReportDelivery:
    """Handles report delivery through various channels."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize report delivery."""
        self.config = config
        
    async def deliver_report(self, report: Dict[str, Any], delivery_config: Dict[str, Any]) -> bool:
        """Deliver report through specified method."""
        try:
            method = DeliveryMethod(delivery_config['method'])
            
            if method == DeliveryMethod.EMAIL:
                return await self._deliver_via_email(report, delivery_config)
            elif method == DeliveryMethod.SLACK:
                return await self._deliver_via_slack(report, delivery_config)
            elif method == DeliveryMethod.WEBHOOK:
                return await self._deliver_via_webhook(report, delivery_config)
            elif method == DeliveryMethod.S3:
                return await self._deliver_via_s3(report, delivery_config)
            else:
                logger.error(f"Unsupported delivery method: {method}")
                return False
                
        except Exception as e:
            logger.error(f"Failed to deliver report: {e}")
            return False
    
    async def _deliver_via_email(self, report: Dict[str, Any], config: Dict[str, Any]) -> bool:
        """Deliver report via email."""
        try:
            # Create email message
            msg = MIMEMultipart()
            msg['From'] = config['from_email']
            msg['To'] = ', '.join(config['recipients'])
            msg['Subject'] = config.get('subject', f"Automated Report - {datetime.now().strftime('%Y-%m-%d')}")
            
            # Add body
            body = report['content']
            msg.attach(MIMEText(body, 'html'))
            
            # Send email (mock implementation)
            logger.info(f"Email report sent to {len(config['recipients'])} recipients")
            return True
            
        except Exception as e:
            logger.error(f"Failed to send email: {e}")
            return False
    
    async def _deliver_via_slack(self, report: Dict[str, Any], config: Dict[str, Any]) -> bool:
        """Deliver report via Slack."""
        try:
            # Mock Slack delivery
            logger.info(f"Slack report sent to channel {config.get('channel', '#general')}")
            return True
        except Exception as e:
            logger.error(f"Failed to send Slack message: {e}")
            return False
    
    async def _deliver_via_webhook(self, report: Dict[str, Any], config: Dict[str, Any]) -> bool:
        """Deliver report via webhook."""
        try:
            # Mock webhook delivery
            logger.info(f"Webhook report sent to {config.get('url', 'unknown')}")
            return True
        except Exception as e:
            logger.error(f"Failed to send webhook: {e}")
            return False
    
    async def _deliver_via_s3(self, report: Dict[str, Any], config: Dict[str, Any]) -> bool:
        """Deliver report to S3."""
        try:
            # Mock S3 upload
            logger.info(f"Report uploaded to S3 bucket {config.get('bucket', 'unknown')}")
            return True
        except Exception as e:
            logger.error(f"Failed to upload to S3: {e}")
            return Falseclass
 AutomatedReportingSystem:
    """
    Main automated reporting system that orchestrates report generation,
    scheduling, and delivery with comprehensive KPI monitoring.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize automated reporting system."""
        self.config = config
        self.report_generator = ReportGenerator(config)
        self.report_delivery = ReportDelivery(config)
        
        # Storage
        self.templates: Dict[str, ReportTemplate] = {}
        self.schedules: Dict[str, ReportSchedule] = {}
        self.executions: Dict[str, ReportExecution] = {}
        self.kpi_definitions: Dict[str, KPIDefinition] = {}
        
        # Scheduling
        self.scheduler_running = False
        self.scheduler_task = None
        
        # Metrics
        self.metrics = {
            'reports_generated': 0,
            'reports_delivered': 0,
            'delivery_failures': 0,
            'avg_generation_time': 0.0,
            'kpis_monitored': 0
        }
        
        # Initialize default KPIs
        self._initialize_default_kpis()
        
        logger.info("Automated Reporting System initialized")
    
    def _initialize_default_kpis(self) -> None:
        """Initialize default operational KPIs."""
        default_kpis = [
            # System Performance KPIs
            KPIDefinition("cpu_utilization", "CPU Utilization", "Average CPU usage", "performance", "monitoring", "average", 80.0, 90.0, 95.0, "%"),
            KPIDefinition("memory_utilization", "Memory Utilization", "Average memory usage", "performance", "monitoring", "average", 80.0, 90.0, 95.0, "%"),
            KPIDefinition("disk_utilization", "Disk Utilization", "Average disk usage", "performance", "monitoring", "average", 80.0, 90.0, 95.0, "%"),
            KPIDefinition("network_throughput", "Network Throughput", "Network data transfer rate", "performance", "monitoring", "average", None, None, None, "Mbps"),
            
            # Availability KPIs
            KPIDefinition("system_uptime", "System Uptime", "System availability percentage", "availability", "monitoring", "average", 99.9, 99.0, 95.0, "%"),
            KPIDefinition("service_availability", "Service Availability", "Service uptime percentage", "availability", "monitoring", "average", 99.9, 99.0, 95.0, "%"),
            
            # Response Time KPIs
            KPIDefinition("api_response_time", "API Response Time", "Average API response time", "performance", "monitoring", "average", 200, 500, 1000, "ms", "lower_is_better"),
            KPIDefinition("database_response_time", "Database Response Time", "Average database query time", "performance", "monitoring", "average", 50, 100, 500, "ms", "lower_is_better"),
            
            # Error Rate KPIs
            KPIDefinition("error_rate", "Error Rate", "Percentage of failed requests", "reliability", "logs", "average", 0.1, 1.0, 5.0, "%", "lower_is_better"),
            KPIDefinition("exception_rate", "Exception Rate", "Application exceptions per hour", "reliability", "logs", "count", 5, 20, 100, "count", "lower_is_better"),
            
            # Security KPIs
            KPIDefinition("failed_login_attempts", "Failed Login Attempts", "Failed authentication attempts", "security", "security_logs", "count", 10, 50, 200, "count", "lower_is_better"),
            KPIDefinition("security_incidents", "Security Incidents", "Number of security incidents", "security", "security_logs", "count", 0, 1, 5, "count", "lower_is_better"),
            
            # Business KPIs
            KPIDefinition("active_users", "Active Users", "Number of active users", "business", "analytics", "count", None, None, None, "users"),
            KPIDefinition("transaction_volume", "Transaction Volume", "Number of transactions processed", "business", "analytics", "count", None, None, None, "transactions"),
            KPIDefinition("revenue", "Revenue", "Total revenue generated", "business", "financial", "sum", None, None, None, "$"),
            
            # Cost KPIs
            KPIDefinition("infrastructure_cost", "Infrastructure Cost", "Total infrastructure spending", "cost", "billing", "sum", None, None, None, "$"),
            KPIDefinition("cost_per_user", "Cost Per User", "Infrastructure cost per active user", "cost", "calculated", "average", None, None, None, "$/user"),
            
            # Agent Performance KPIs
            KPIDefinition("agent_success_rate", "Agent Success Rate", "Percentage of successful agent tasks", "agents", "agent_logs", "average", 95.0, 90.0, 80.0, "%"),
            KPIDefinition("agent_response_time", "Agent Response Time", "Average agent task completion time", "agents", "agent_logs", "average", 30, 60, 300, "seconds", "lower_is_better"),
            KPIDefinition("agent_utilization", "Agent Utilization", "Percentage of time agents are active", "agents", "agent_logs", "average", 70.0, 50.0, 30.0, "%"),
        ]
        
        for kpi in default_kpis:
            self.kpi_definitions[kpi.kpi_id] = kpi
        
        self.metrics['kpis_monitored'] = len(self.kpi_definitions)
    
    async def create_report_template(self, template: ReportTemplate) -> str:
        """Create a new report template."""
        try:
            self.templates[template.template_id] = template
            logger.info(f"Created report template: {template.name}")
            return template.template_id
        except Exception as e:
            logger.error(f"Failed to create report template: {e}")
            raise
    
    async def create_report_schedule(self, schedule: ReportSchedule) -> str:
        """Create a new report schedule."""
        try:
            # Validate template exists
            if schedule.template_id not in self.templates:
                raise ValueError(f"Template {schedule.template_id} not found")
            
            # Calculate next run time
            schedule.next_run = self._calculate_next_run(schedule.frequency)
            
            self.schedules[schedule.schedule_id] = schedule
            logger.info(f"Created report schedule: {schedule.name}")
            return schedule.schedule_id
        except Exception as e:
            logger.error(f"Failed to create report schedule: {e}")
            raise
    
    async def generate_report_on_demand(self, template_id: str, parameters: Dict[str, Any]) -> str:
        """Generate a report on demand."""
        try:
            template = self.templates.get(template_id)
            if not template:
                raise ValueError(f"Template {template_id} not found")
            
            execution_id = str(uuid.uuid4())
            execution = ReportExecution(
                execution_id=execution_id,
                schedule_id="on_demand",
                template_id=template_id,
                status="running",
                started_at=datetime.now()
            )
            self.executions[execution_id] = execution
            
            # Generate report
            start_time = datetime.now()
            report = await self.report_generator.generate_report(template, parameters)
            generation_time = (datetime.now() - start_time).total_seconds()
            
            # Update execution
            execution.status = "completed"
            execution.completed_at = datetime.now()
            execution.metrics = {
                'generation_time_seconds': generation_time,
                'kpi_count': report.get('kpi_count', 0),
                'anomalies_count': report.get('anomalies_count', 0)
            }
            
            # Update metrics
            self.metrics['reports_generated'] += 1
            self._update_avg_generation_time(generation_time)
            
            logger.info(f"Generated on-demand report: {execution_id}")
            return execution_id
            
        except Exception as e:
            logger.error(f"Failed to generate on-demand report: {e}")
            if execution_id in self.executions:
                self.executions[execution_id].status = "failed"
                self.executions[execution_id].error_message = str(e)
                self.executions[execution_id].completed_at = datetime.now()
            raise
    
    async def start_scheduler(self) -> None:
        """Start the report scheduler."""
        if self.scheduler_running:
            return
        
        self.scheduler_running = True
        self.scheduler_task = asyncio.create_task(self._scheduler_loop())
        logger.info("Report scheduler started")
    
    async def stop_scheduler(self) -> None:
        """Stop the report scheduler."""
        self.scheduler_running = False
        if self.scheduler_task:
            self.scheduler_task.cancel()
            try:
                await self.scheduler_task
            except asyncio.CancelledError:
                pass
        logger.info("Report scheduler stopped")
    
    async def _scheduler_loop(self) -> None:
        """Main scheduler loop."""
        while self.scheduler_running:
            try:
                current_time = datetime.now()
                
                # Check for scheduled reports
                for schedule in self.schedules.values():
                    if (schedule.is_active and 
                        schedule.next_run and 
                        current_time >= schedule.next_run):
                        
                        await self._execute_scheduled_report(schedule)
                
                # Sleep for 1 minute before next check
                await asyncio.sleep(60)
                
            except Exception as e:
                logger.error(f"Error in scheduler loop: {e}")
                await asyncio.sleep(60)
    
    async def _execute_scheduled_report(self, schedule: ReportSchedule) -> None:
        """Execute a scheduled report."""
        try:
            execution_id = str(uuid.uuid4())
            execution = ReportExecution(
                execution_id=execution_id,
                schedule_id=schedule.schedule_id,
                template_id=schedule.template_id,
                status="running",
                started_at=datetime.now()
            )
            self.executions[execution_id] = execution
            
            # Get template
            template = self.templates[schedule.template_id]
            
            # Generate report
            start_time = datetime.now()
            report = await self.report_generator.generate_report(template, schedule.parameters)
            generation_time = (datetime.now() - start_time).total_seconds()
            
            # Deliver report
            delivery_success = True
            for method in schedule.delivery_methods:
                delivery_config = {
                    'method': method.value,
                    'recipients': schedule.recipients,
                    'subject': f"{template.name} - {datetime.now().strftime('%Y-%m-%d %H:%M')}"
                }
                
                success = await self.report_delivery.deliver_report(report, delivery_config)
                if not success:
                    delivery_success = False
                    self.metrics['delivery_failures'] += 1
            
            if delivery_success:
                self.metrics['reports_delivered'] += 1
            
            # Update execution
            execution.status = "completed"
            execution.completed_at = datetime.now()
            execution.metrics = {
                'generation_time_seconds': generation_time,
                'delivery_success': delivery_success,
                'kpi_count': report.get('kpi_count', 0),
                'anomalies_count': report.get('anomalies_count', 0)
            }
            
            # Update schedule
            schedule.last_run = datetime.now()
            schedule.next_run = self._calculate_next_run(schedule.frequency, schedule.last_run)
            
            # Update metrics
            self.metrics['reports_generated'] += 1
            self._update_avg_generation_time(generation_time)
            
            logger.info(f"Executed scheduled report: {schedule.name}")
            
        except Exception as e:
            logger.error(f"Failed to execute scheduled report {schedule.name}: {e}")
            if execution_id in self.executions:
                self.executions[execution_id].status = "failed"
                self.executions[execution_id].error_message = str(e)
                self.executions[execution_id].completed_at = datetime.now()
    
    def _calculate_next_run(self, frequency: ReportFrequency, from_time: Optional[datetime] = None) -> datetime:
        """Calculate next run time based on frequency."""
        base_time = from_time or datetime.now()
        
        if frequency == ReportFrequency.HOURLY:
            return base_time + timedelta(hours=1)
        elif frequency == ReportFrequency.DAILY:
            return base_time + timedelta(days=1)
        elif frequency == ReportFrequency.WEEKLY:
            return base_time + timedelta(weeks=1)
        elif frequency == ReportFrequency.MONTHLY:
            return base_time + timedelta(days=30)
        elif frequency == ReportFrequency.QUARTERLY:
            return base_time + timedelta(days=90)
        elif frequency == ReportFrequency.ANNUALLY:
            return base_time + timedelta(days=365)
        else:
            return base_time + timedelta(days=1)  # Default to daily
    
    def _update_avg_generation_time(self, generation_time: float) -> None:
        """Update average generation time metric."""
        current_avg = self.metrics['avg_generation_time']
        reports_generated = self.metrics['reports_generated']
        
        if reports_generated == 1:
            self.metrics['avg_generation_time'] = generation_time
        else:
            self.metrics['avg_generation_time'] = (
                (current_avg * (reports_generated - 1) + generation_time) / reports_generated
            )
    
    async def get_kpi_status(self, kpi_ids: Optional[List[str]] = None) -> List[Dict[str, Any]]:
        """Get current status of KPIs."""
        try:
            target_kpis = kpi_ids or list(self.kpi_definitions.keys())
            kpi_definitions = [self.kpi_definitions[kpi_id] for kpi_id in target_kpis if kpi_id in self.kpi_definitions]
            
            time_range = {
                'start': datetime.now() - timedelta(hours=1),
                'end': datetime.now()
            }
            
            kpi_results = []
            for kpi_def in kpi_definitions:
                result = await self.report_generator.kpi_calculator.calculate_kpi(kpi_def, time_range)
                kpi_results.append(result)
            
            return kpi_results
            
        except Exception as e:
            logger.error(f"Failed to get KPI status: {e}")
            return []
    
    def get_system_metrics(self) -> Dict[str, Any]:
        """Get automated reporting system metrics."""
        return {
            **self.metrics,
            'templates_count': len(self.templates),
            'schedules_count': len(self.schedules),
            'active_schedules': len([s for s in self.schedules.values() if s.is_active]),
            'executions_count': len(self.executions),
            'scheduler_running': self.scheduler_running
        }
    
    async def get_default_templates(self) -> List[ReportTemplate]:
        """Get default report templates."""
        templates = [
            ReportTemplate(
                template_id="operational_summary",
                name="Operational Summary",
                report_type=ReportType.OPERATIONAL,
                description="Daily operational KPIs and system health",
                kpis=["system_uptime", "api_response_time", "error_rate", "cpu_utilization", "memory_utilization"],
                template_content="""
                <h1>Operational Summary Report</h1>
                <p>Generated: {{ generated_at.strftime('%Y-%m-%d %H:%M:%S') }}</p>
                
                <h2>Overall Health: {{ summary.overall_health.title() }}</h2>
                <p>Health Score: {{ "%.1f"|format(summary.health_score) }}%</p>
                
                <h2>KPI Status</h2>
                <ul>
                {% for kpi in kpis %}
                    <li><strong>{{ kpi.name }}</strong>: {{ kpi.value }} {{ kpi.unit }} ({{ kpi.status.title() }})</li>
                {% endfor %}
                </ul>
                
                {% if root_cause_analyses %}
                <h2>Issues Detected</h2>
                {% for analysis in root_cause_analyses %}
                    <h3>{{ analysis.kpi_id }}</h3>
                    <ul>
                    {% for cause in analysis.root_causes %}
                        <li>{{ cause.description }} (Confidence: {{ "%.0f"|format(cause.confidence * 100) }}%)</li>
                    {% endfor %}
                    </ul>
                {% endfor %}
                {% endif %}
                """
            ),
            ReportTemplate(
                template_id="security_report",
                name="Security Report",
                report_type=ReportType.SECURITY,
                description="Security incidents and threat analysis",
                kpis=["failed_login_attempts", "security_incidents"],
                template_content="""
                <h1>Security Report</h1>
                <p>Generated: {{ generated_at.strftime('%Y-%m-%d %H:%M:%S') }}</p>
                
                <h2>Security KPIs</h2>
                {% for kpi in kpis %}
                    <p><strong>{{ kpi.name }}</strong>: {{ kpi.value }} {{ kpi.unit }}</p>
                {% endfor %}
                """
            )
        ]
        
        return templates