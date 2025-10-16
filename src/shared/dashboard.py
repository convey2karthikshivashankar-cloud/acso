"""
Monitoring dashboard and visualization system for ACSO.
"""

import asyncio
import json
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from enum import Enum

from .monitoring import (
    metrics_collector, alert_manager, performance_tracker,
    MetricType, AlertSeverity, LogLevel
)


class DashboardType(str, Enum):
    """Types of monitoring dashboards."""
    SYSTEM_OVERVIEW = "system_overview"
    AGENT_PERFORMANCE = "agent_performance"
    TASK_MONITORING = "task_monitoring"
    SECURITY_DASHBOARD = "security_dashboard"
    FINANCIAL_METRICS = "financial_metrics"
    OPERATIONAL_HEALTH = "operational_health"


class VisualizationType(str, Enum):
    """Types of data visualizations."""
    LINE_CHART = "line_chart"
    BAR_CHART = "bar_chart"
    PIE_CHART = "pie_chart"
    GAUGE = "gauge"
    TABLE = "table"
    HEATMAP = "heatmap"
    SCATTER_PLOT = "scatter_plot"


class MonitoringDashboard:
    """Main monitoring dashboard for ACSO system."""
    
    def __init__(self):
        self.dashboard_configs = self._initialize_dashboard_configs()
        self.widget_cache = {}
        self.cache_ttl = 30  # seconds
        
    def _initialize_dashboard_configs(self) -> Dict[str, Dict[str, Any]]:
        """Initialize dashboard configurations."""
        return {
            "system_overview": {
                "title": "ACSO System Overview",
                "description": "High-level system health and performance metrics",
                "refresh_interval": 30,
                "widgets": [
                    {
                        "id": "system_health",
                        "title": "System Health Score",
                        "type": VisualizationType.GAUGE,
                        "data_source": "system_health_score",
                        "size": "medium"
                    },
                    {
                        "id": "active_agents",
                        "title": "Active Agents",
                        "type": VisualizationType.BAR_CHART,
                        "data_source": "agent_status_summary",
                        "size": "large"
                    },
                    {
                        "id": "task_throughput",
                        "title": "Task Throughput",
                        "type": VisualizationType.LINE_CHART,
                        "data_source": "task_throughput_trend",
                        "size": "large"
                    },
                    {
                        "id": "resource_usage",
                        "title": "Resource Usage",
                        "type": VisualizationType.PIE_CHART,
                        "data_source": "resource_utilization",
                        "size": "medium"
                    },
                    {
                        "id": "recent_alerts",
                        "title": "Recent Alerts",
                        "type": VisualizationType.TABLE,
                        "data_source": "recent_alerts",
                        "size": "large"
                    }
                ]
            },
            "agent_performance": {
                "title": "Agent Performance Dashboard",
                "description": "Detailed performance metrics for all agents",
                "refresh_interval": 60,
                "widgets": [
                    {
                        "id": "agent_health_matrix",
                        "title": "Agent Health Matrix",
                        "type": VisualizationType.HEATMAP,
                        "data_source": "agent_health_matrix",
                        "size": "large"
                    },
                    {
                        "id": "task_success_rates",
                        "title": "Task Success Rates by Agent",
                        "type": VisualizationType.BAR_CHART,
                        "data_source": "agent_success_rates",
                        "size": "large"
                    },
                    {
                        "id": "response_times",
                        "title": "Average Response Times",
                        "type": VisualizationType.LINE_CHART,
                        "data_source": "agent_response_times",
                        "size": "large"
                    },
                    {
                        "id": "workload_distribution",
                        "title": "Workload Distribution",
                        "type": VisualizationType.PIE_CHART,
                        "data_source": "agent_workload_distribution",
                        "size": "medium"
                    }
                ]
            },
            "security_dashboard": {
                "title": "Security Monitoring Dashboard",
                "description": "Security events, threats, and incident response metrics",
                "refresh_interval": 15,
                "widgets": [
                    {
                        "id": "threat_detection_rate",
                        "title": "Threat Detection Rate",
                        "type": VisualizationType.LINE_CHART,
                        "data_source": "threat_detection_metrics",
                        "size": "large"
                    },
                    {
                        "id": "incident_status",
                        "title": "Active Incidents",
                        "type": VisualizationType.TABLE,
                        "data_source": "active_incidents",
                        "size": "large"
                    },
                    {
                        "id": "security_score",
                        "title": "Security Posture Score",
                        "type": VisualizationType.GAUGE,
                        "data_source": "security_posture_score",
                        "size": "medium"
                    },
                    {
                        "id": "threat_types",
                        "title": "Threat Types Distribution",
                        "type": VisualizationType.PIE_CHART,
                        "data_source": "threat_types_distribution",
                        "size": "medium"
                    }
                ]
            }
        }
        
    async def get_dashboard_data(self, dashboard_type: DashboardType) -> Dict[str, Any]:
        """Get complete dashboard data."""
        try:
            config = self.dashboard_configs.get(dashboard_type.value, {})
            
            if not config:
                return {"error": f"Dashboard type {dashboard_type} not found"}
                
            dashboard_data = {
                "dashboard_id": dashboard_type.value,
                "title": config.get("title", ""),
                "description": config.get("description", ""),
                "refresh_interval": config.get("refresh_interval", 60),
                "generated_at": datetime.utcnow().isoformat(),
                "widgets": []
            }
            
            # Generate data for each widget
            for widget_config in config.get("widgets", []):
                widget_data = await self._generate_widget_data(widget_config)
                dashboard_data["widgets"].append(widget_data)
                
            return dashboard_data
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _generate_widget_data(self, widget_config: Dict[str, Any]) -> Dict[str, Any]:
        """Generate data for a specific widget."""
        try:
            widget_id = widget_config["id"]
            data_source = widget_config["data_source"]
            
            # Check cache first
            cache_key = f"{widget_id}_{data_source}"
            if cache_key in self.widget_cache:
                cached_data, timestamp = self.widget_cache[cache_key]
                if (datetime.utcnow() - timestamp).total_seconds() < self.cache_ttl:
                    return cached_data
                    
            # Generate fresh data
            widget_data = {
                "id": widget_id,
                "title": widget_config["title"],
                "type": widget_config["type"],
                "size": widget_config.get("size", "medium"),
                "data": await self._get_data_source(data_source),
                "generated_at": datetime.utcnow().isoformat()
            }
            
            # Cache the data
            self.widget_cache[cache_key] = (widget_data, datetime.utcnow())
            
            return widget_data
            
        except Exception as e:
            return {
                "id": widget_config.get("id", "unknown"),
                "error": str(e)
            }
            
    async def _get_data_source(self, data_source: str) -> Dict[str, Any]:
        """Get data from various sources."""
        try:
            if data_source == "system_health_score":
                return await self._get_system_health_score()
            elif data_source == "agent_status_summary":
                return await self._get_agent_status_summary()
            elif data_source == "task_throughput_trend":
                return await self._get_task_throughput_trend()
            elif data_source == "resource_utilization":
                return await self._get_resource_utilization()
            elif data_source == "recent_alerts":
                return await self._get_recent_alerts()
            elif data_source == "agent_health_matrix":
                return await self._get_agent_health_matrix()
            elif data_source == "agent_success_rates":
                return await self._get_agent_success_rates()
            elif data_source == "agent_response_times":
                return await self._get_agent_response_times()
            elif data_source == "threat_detection_metrics":
                return await self._get_threat_detection_metrics()
            elif data_source == "active_incidents":
                return await self._get_active_incidents()
            elif data_source == "security_posture_score":
                return await self._get_security_posture_score()
            else:
                return {"error": f"Unknown data source: {data_source}"}
                
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_system_health_score(self) -> Dict[str, Any]:
        """Calculate overall system health score."""
        try:
            # Get recent metrics
            cpu_metric = metrics_collector.get_latest_metric("system.cpu.usage")
            memory_metric = metrics_collector.get_latest_metric("system.memory.usage")
            
            # Calculate health score (0-100)
            cpu_health = max(0, 100 - (cpu_metric.value if cpu_metric else 50))
            memory_health = max(0, 100 - (memory_metric.value if memory_metric else 50))
            
            # Get agent health
            agent_metrics = metrics_collector.get_metrics("agent.health.score")
            recent_agent_metrics = [m for m in agent_metrics if 
                                  (datetime.utcnow() - m.timestamp).seconds < 300]
            
            if recent_agent_metrics:
                avg_agent_health = sum(m.value for m in recent_agent_metrics) / len(recent_agent_metrics)
            else:
                avg_agent_health = 85  # Default
                
            # Overall health score
            overall_health = (cpu_health * 0.3 + memory_health * 0.3 + avg_agent_health * 0.4)
            
            return {
                "value": round(overall_health, 1),
                "max_value": 100,
                "unit": "score",
                "status": "healthy" if overall_health > 80 else "warning" if overall_health > 60 else "critical",
                "components": {
                    "cpu_health": round(cpu_health, 1),
                    "memory_health": round(memory_health, 1),
                    "agent_health": round(avg_agent_health, 1)
                }
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_agent_status_summary(self) -> Dict[str, Any]:
        """Get agent status summary."""
        try:
            agent_types = ["supervisor", "threat-hunter", "incident-response", 
                          "service-orchestration", "financial-intelligence"]
            
            agent_data = []
            
            for agent_type in agent_types:
                # Get latest health metric for this agent type
                health_metrics = metrics_collector.get_metrics("agent.health.score")
                agent_health_metrics = [m for m in health_metrics if 
                                      m.labels.get("agent_type") == agent_type and
                                      (datetime.utcnow() - m.timestamp).seconds < 300]
                
                if agent_health_metrics:
                    latest_health = agent_health_metrics[-1].value
                    status = "healthy" if latest_health > 80 else "warning" if latest_health > 60 else "critical"
                else:
                    latest_health = 85  # Default
                    status = "healthy"
                    
                agent_data.append({
                    "agent_type": agent_type,
                    "health_score": latest_health,
                    "status": status
                })
                
            return {
                "agents": agent_data,
                "total_agents": len(agent_data),
                "healthy_agents": len([a for a in agent_data if a["status"] == "healthy"]),
                "warning_agents": len([a for a in agent_data if a["status"] == "warning"]),
                "critical_agents": len([a for a in agent_data if a["status"] == "critical"])
            }
            
        except Exception as e:
            return {"error": str(e)}  
  async def _get_task_throughput_trend(self) -> Dict[str, Any]:
        """Get task throughput trend data."""
        try:
            # Get task metrics for the last hour
            now = datetime.utcnow()
            time_points = []
            throughput_data = []
            
            # Generate data points for the last hour (every 5 minutes)
            for i in range(12):
                time_point = now - timedelta(minutes=i * 5)
                time_points.append(time_point.strftime("%H:%M"))
                
                # Simulate throughput data
                import random
                throughput = random.randint(15, 45)
                throughput_data.append(throughput)
                
            # Reverse to show chronological order
            time_points.reverse()
            throughput_data.reverse()
            
            return {
                "labels": time_points,
                "datasets": [
                    {
                        "label": "Tasks per 5min",
                        "data": throughput_data,
                        "color": "#2E86AB"
                    }
                ],
                "total_tasks": sum(throughput_data),
                "avg_throughput": sum(throughput_data) / len(throughput_data)
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_resource_utilization(self) -> Dict[str, Any]:
        """Get resource utilization data."""
        try:
            cpu_metric = metrics_collector.get_latest_metric("system.cpu.usage")
            memory_metric = metrics_collector.get_latest_metric("system.memory.usage")
            disk_metric = metrics_collector.get_latest_metric("system.disk.usage")
            
            cpu_usage = cpu_metric.value if cpu_metric else 45
            memory_usage = memory_metric.value if memory_metric else 60
            disk_usage = disk_metric.value if disk_metric else 35
            
            return {
                "labels": ["CPU", "Memory", "Disk", "Available"],
                "datasets": [
                    {
                        "data": [cpu_usage, memory_usage, disk_usage, 100 - max(cpu_usage, memory_usage, disk_usage)],
                        "colors": ["#FF6B6B", "#4ECDC4", "#45B7D1", "#96CEB4"]
                    }
                ],
                "details": {
                    "cpu_usage": cpu_usage,
                    "memory_usage": memory_usage,
                    "disk_usage": disk_usage
                }
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_recent_alerts(self) -> Dict[str, Any]:
        """Get recent alerts data."""
        try:
            active_alerts = alert_manager.get_active_alerts()
            
            # Sort by triggered time (most recent first)
            active_alerts.sort(key=lambda a: a.triggered_at, reverse=True)
            
            alert_data = []
            for alert in active_alerts[:10]:  # Show last 10 alerts
                alert_data.append({
                    "id": alert.alert_id,
                    "name": alert.name,
                    "severity": alert.severity.value,
                    "description": alert.description,
                    "component": alert.component,
                    "triggered_at": alert.triggered_at.strftime("%Y-%m-%d %H:%M:%S"),
                    "status": alert.status
                })
                
            return {
                "alerts": alert_data,
                "total_active": len(active_alerts),
                "critical_count": len([a for a in active_alerts if a.severity == AlertSeverity.CRITICAL]),
                "high_count": len([a for a in active_alerts if a.severity == AlertSeverity.HIGH]),
                "medium_count": len([a for a in active_alerts if a.severity == AlertSeverity.MEDIUM])
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_agent_health_matrix(self) -> Dict[str, Any]:
        """Get agent health matrix for heatmap visualization."""
        try:
            agent_types = ["supervisor", "threat-hunter", "incident-response", 
                          "service-orchestration", "financial-intelligence"]
            
            # Generate time series data for the last 24 hours
            now = datetime.utcnow()
            time_labels = []
            
            # Create hourly time labels
            for i in range(24):
                time_point = now - timedelta(hours=i)
                time_labels.append(time_point.strftime("%H:00"))
                
            time_labels.reverse()
            
            # Generate health matrix data
            matrix_data = []
            
            for agent_type in agent_types:
                agent_row = {
                    "agent_type": agent_type,
                    "health_values": []
                }
                
                # Generate health values for each time point
                import random
                base_health = 85 + (hash(agent_type) % 20)  # Consistent base per agent
                
                for i in range(24):
                    # Add some variation
                    variation = random.uniform(-10, 10)
                    health_value = max(50, min(100, base_health + variation))
                    agent_row["health_values"].append(round(health_value, 1))
                    
                matrix_data.append(agent_row)
                
            return {
                "time_labels": time_labels,
                "agent_data": matrix_data,
                "color_scale": {
                    "min": 50,
                    "max": 100,
                    "colors": ["#FF4444", "#FFAA44", "#44AA44"]
                }
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_agent_success_rates(self) -> Dict[str, Any]:
        """Get agent success rates."""
        try:
            agent_types = ["supervisor", "threat-hunter", "incident-response", 
                          "service-orchestration", "financial-intelligence"]
            
            success_data = []
            
            for agent_type in agent_types:
                # Get performance summary for last 24 hours
                summary = performance_tracker.get_agent_performance_summary(
                    f"{agent_type}-001", timedelta(hours=24)
                )
                
                if "error" not in summary:
                    success_rate = summary.get("success_rate", 0) * 100
                else:
                    # Simulate success rate
                    import random
                    success_rate = random.uniform(85, 98)
                    
                success_data.append({
                    "agent_type": agent_type,
                    "success_rate": round(success_rate, 1)
                })
                
            return {
                "labels": [d["agent_type"] for d in success_data],
                "datasets": [
                    {
                        "label": "Success Rate (%)",
                        "data": [d["success_rate"] for d in success_data],
                        "color": "#2E86AB"
                    }
                ],
                "average_success_rate": sum(d["success_rate"] for d in success_data) / len(success_data)
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_agent_response_times(self) -> Dict[str, Any]:
        """Get agent response times trend."""
        try:
            # Generate response time trend for the last 2 hours
            now = datetime.utcnow()
            time_points = []
            response_times = []
            
            for i in range(24):  # Every 5 minutes for 2 hours
                time_point = now - timedelta(minutes=i * 5)
                time_points.append(time_point.strftime("%H:%M"))
                
                # Simulate response time (in seconds)
                import random
                response_time = random.uniform(1.5, 8.0)
                response_times.append(round(response_time, 2))
                
            time_points.reverse()
            response_times.reverse()
            
            return {
                "labels": time_points,
                "datasets": [
                    {
                        "label": "Avg Response Time (s)",
                        "data": response_times,
                        "color": "#4ECDC4"
                    }
                ],
                "average_response_time": sum(response_times) / len(response_times),
                "max_response_time": max(response_times),
                "min_response_time": min(response_times)
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_threat_detection_metrics(self) -> Dict[str, Any]:
        """Get threat detection metrics."""
        try:
            # Generate threat detection trend
            now = datetime.utcnow()
            time_points = []
            threats_detected = []
            false_positives = []
            
            for i in range(12):  # Last 6 hours, every 30 minutes
                time_point = now - timedelta(minutes=i * 30)
                time_points.append(time_point.strftime("%H:%M"))
                
                # Simulate threat detection data
                import random
                threats = random.randint(0, 8)
                false_pos = random.randint(0, 3)
                
                threats_detected.append(threats)
                false_positives.append(false_pos)
                
            time_points.reverse()
            threats_detected.reverse()
            false_positives.reverse()
            
            return {
                "labels": time_points,
                "datasets": [
                    {
                        "label": "Threats Detected",
                        "data": threats_detected,
                        "color": "#FF6B6B"
                    },
                    {
                        "label": "False Positives",
                        "data": false_positives,
                        "color": "#FFAA44"
                    }
                ],
                "total_threats": sum(threats_detected),
                "total_false_positives": sum(false_positives),
                "accuracy_rate": ((sum(threats_detected) - sum(false_positives)) / 
                                max(1, sum(threats_detected))) * 100 if sum(threats_detected) > 0 else 100
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_active_incidents(self) -> Dict[str, Any]:
        """Get active security incidents."""
        try:
            # Simulate active incidents
            import random
            
            incidents = []
            incident_types = ["malware", "intrusion", "data_breach", "policy_violation"]
            severities = ["low", "medium", "high", "critical"]
            
            num_incidents = random.randint(0, 5)
            
            for i in range(num_incidents):
                incident = {
                    "id": f"INC-{random.randint(1000, 9999)}",
                    "type": random.choice(incident_types),
                    "severity": random.choice(severities),
                    "description": f"Security incident detected in system component",
                    "detected_at": (datetime.utcnow() - timedelta(minutes=random.randint(5, 180))).strftime("%Y-%m-%d %H:%M:%S"),
                    "status": random.choice(["investigating", "containing", "resolving"]),
                    "assigned_to": "incident-response-001"
                }
                incidents.append(incident)
                
            return {
                "incidents": incidents,
                "total_active": len(incidents),
                "critical_incidents": len([i for i in incidents if i["severity"] == "critical"]),
                "high_incidents": len([i for i in incidents if i["severity"] == "high"])
            }
            
        except Exception as e:
            return {"error": str(e)}
            
    async def _get_security_posture_score(self) -> Dict[str, Any]:
        """Get overall security posture score."""
        try:
            # Calculate security posture based on various factors
            
            # Threat detection accuracy
            threat_metrics = await self._get_threat_detection_metrics()
            detection_score = threat_metrics.get("accuracy_rate", 90)
            
            # Incident response time
            active_incidents = await self._get_active_incidents()
            incident_count = active_incidents.get("total_active", 0)
            incident_score = max(70, 100 - (incident_count * 10))
            
            # System vulnerabilities (simulated)
            import random
            vulnerability_score = random.uniform(85, 95)
            
            # Overall security score
            security_score = (detection_score * 0.4 + incident_score * 0.3 + vulnerability_score * 0.3)
            
            return {
                "value": round(security_score, 1),
                "max_value": 100,
                "unit": "score",
                "status": "excellent" if security_score > 90 else "good" if security_score > 80 else "needs_attention",
                "components": {
                    "threat_detection": round(detection_score, 1),
                    "incident_response": round(incident_score, 1),
                    "vulnerability_management": round(vulnerability_score, 1)
                }
            }
            
        except Exception as e:
            return {"error": str(e)}


class AlertNotificationSystem:
    """Advanced alert notification and escalation system."""
    
    def __init__(self):
        self.notification_channels = self._initialize_notification_channels()
        self.escalation_rules = self._initialize_escalation_rules()
        
    def _initialize_notification_channels(self) -> Dict[str, Dict[str, Any]]:
        """Initialize notification channels."""
        return {
            "console": {
                "type": "console",
                "enabled": True,
                "handler": self._console_notification
            },
            "email": {
                "type": "email",
                "enabled": False,  # Disabled for prototype
                "handler": self._email_notification,
                "config": {
                    "smtp_server": "smtp.company.com",
                    "recipients": ["ops-team@company.com", "security@company.com"]
                }
            },
            "slack": {
                "type": "slack",
                "enabled": False,  # Disabled for prototype
                "handler": self._slack_notification,
                "config": {
                    "webhook_url": "https://hooks.slack.com/services/...",
                    "channel": "#alerts"
                }
            },
            "dashboard": {
                "type": "dashboard",
                "enabled": True,
                "handler": self._dashboard_notification
            }
        }
        
    def _initialize_escalation_rules(self) -> List[Dict[str, Any]]:
        """Initialize alert escalation rules."""
        return [
            {
                "rule_id": "critical_immediate",
                "conditions": {
                    "severity": AlertSeverity.CRITICAL
                },
                "escalation_delay": 0,  # Immediate
                "channels": ["console", "dashboard", "email", "slack"]
            },
            {
                "rule_id": "high_severity_escalation",
                "conditions": {
                    "severity": AlertSeverity.HIGH,
                    "unresolved_duration": 300  # 5 minutes
                },
                "escalation_delay": 300,
                "channels": ["console", "dashboard", "email"]
            },
            {
                "rule_id": "medium_severity_notification",
                "conditions": {
                    "severity": AlertSeverity.MEDIUM
                },
                "escalation_delay": 0,
                "channels": ["console", "dashboard"]
            }
        ]
        
    async def process_alert_notification(self, alert) -> None:
        """Process alert notification through appropriate channels."""
        try:
            # Find applicable escalation rules
            applicable_rules = []
            
            for rule in self.escalation_rules:
                if self._matches_escalation_conditions(alert, rule["conditions"]):
                    applicable_rules.append(rule)
                    
            # Process notifications for each applicable rule
            for rule in applicable_rules:
                await self._execute_notification_rule(alert, rule)
                
        except Exception as e:
            print(f"Alert notification processing failed: {e}")
            
    def _matches_escalation_conditions(self, alert, conditions: Dict[str, Any]) -> bool:
        """Check if alert matches escalation conditions."""
        try:
            # Check severity
            if "severity" in conditions:
                if alert.severity != conditions["severity"]:
                    return False
                    
            # Check unresolved duration
            if "unresolved_duration" in conditions:
                if alert.resolved_at is not None:
                    return False
                    
                duration = (datetime.utcnow() - alert.triggered_at).total_seconds()
                if duration < conditions["unresolved_duration"]:
                    return False
                    
            return True
            
        except Exception:
            return False
            
    async def _execute_notification_rule(self, alert, rule: Dict[str, Any]) -> None:
        """Execute notification rule for an alert."""
        try:
            channels = rule.get("channels", [])
            escalation_delay = rule.get("escalation_delay", 0)
            
            # Apply escalation delay if needed
            if escalation_delay > 0:
                await asyncio.sleep(escalation_delay)
                
            # Send notifications through specified channels
            for channel_name in channels:
                channel = self.notification_channels.get(channel_name)
                
                if channel and channel.get("enabled", False):
                    handler = channel.get("handler")
                    if handler:
                        await handler(alert, channel.get("config", {}))
                        
        except Exception as e:
            print(f"Notification rule execution failed: {e}")
            
    async def _console_notification(self, alert, config: Dict[str, Any]) -> None:
        """Send console notification."""
        severity_colors = {
            AlertSeverity.CRITICAL: "\033[91m",  # Red
            AlertSeverity.HIGH: "\033[93m",      # Yellow
            AlertSeverity.MEDIUM: "\033[94m",    # Blue
            AlertSeverity.LOW: "\033[92m"        # Green
        }
        
        color = severity_colors.get(alert.severity, "")
        reset_color = "\033[0m"
        
        print(f"{color}[ALERT {alert.severity.value.upper()}]{reset_color} "
              f"{alert.name}: {alert.description} "
              f"(Component: {alert.component}, Time: {alert.triggered_at.strftime('%H:%M:%S')})")
              
    async def _email_notification(self, alert, config: Dict[str, Any]) -> None:
        """Send email notification (simulated)."""
        print(f"EMAIL NOTIFICATION: Alert {alert.name} sent to {config.get('recipients', [])}")
        
    async def _slack_notification(self, alert, config: Dict[str, Any]) -> None:
        """Send Slack notification (simulated)."""
        print(f"SLACK NOTIFICATION: Alert {alert.name} sent to {config.get('channel', '#alerts')}")
        
    async def _dashboard_notification(self, alert, config: Dict[str, Any]) -> None:
        """Update dashboard with alert notification."""
        # This would update the dashboard's alert widget in real-time
        print(f"DASHBOARD UPDATE: Alert {alert.name} added to dashboard")


# Global dashboard instance
monitoring_dashboard = MonitoringDashboard()
alert_notification_system = AlertNotificationSystem()


async def initialize_dashboard_system() -> None:
    """Initialize the dashboard and notification system."""
    try:
        # Register alert notification handler
        alert_manager.add_notification_handler(
            alert_notification_system.process_alert_notification
        )
        
        print("Dashboard and notification system initialized")
        
    except Exception as e:
        print(f"Dashboard system initialization failed: {e}")


async def get_dashboard_json(dashboard_type: DashboardType) -> str:
    """Get dashboard data as JSON string."""
    try:
        dashboard_data = await monitoring_dashboard.get_dashboard_data(dashboard_type)
        return json.dumps(dashboard_data, indent=2)
    except Exception as e:
        return json.dumps({"error": str(e)})