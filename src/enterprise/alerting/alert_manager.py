"""
Alert manager for ACSO Enterprise.
Handles alert generation, routing, and notification delivery.
"""

import asyncio
import json
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, field
from enum import Enum
import aiohttp
import smtplib
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart


class AlertSeverity(str, Enum):
    """Alert severity levels."""
    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class AlertStatus(str, Enum):
    """Alert status."""
    ACTIVE = "active"
    RESOLVED = "resolved"
    SUPPRESSED = "suppressed"
    ACKNOWLEDGED = "acknowledged"


@dataclass
class Alert:
    """Alert data structure."""
    alert_id: str
    severity: AlertSeverity
    title: str
    description: str
    source: str
    timestamp: datetime
    tags: Dict[str, str] = field(default_factory=dict)
    status: AlertStatus = AlertStatus.ACTIVE
    acknowledged_by: Optional[str] = None
    acknowledged_at: Optional[datetime] = None
    resolved_at: Optional[datetime] = None
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class NotificationChannel:
    """Notification channel configuration."""
    channel_id: str
    channel_type: str  # email, slack, webhook, pagerduty
    config: Dict[str, Any]
    enabled: bool = True
    severity_filter: List[AlertSeverity] = field(default_factory=list)
    tag_filters: Dict[str, str] = field(default_factory=dict)


@dataclass
class AlertRule:
    """Alert rule configuration."""
    rule_id: str
    name: str
    condition: str  # Expression to evaluate
    severity: AlertSeverity
    description: str
    enabled: bool = True
    cooldown_minutes: int = 5
    tags: Dict[str, str] = field(default_factory=dict)
    notification_channels: List[str] = field(default_factory=list)


class AlertManager:
    """Manages alerts and notifications for ACSO Enterprise."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Alert storage
        self.active_alerts: Dict[str, Alert] = {}
        self.alert_history: List[Alert] = []
        self.notification_channels: Dict[str, NotificationChannel] = {}
        self.alert_rules: Dict[str, AlertRule] = {}
        
        # Processing
        self.running = False
        self.processing_task: Optional[asyncio.Task] = None
        self.alert_queue: asyncio.Queue = asyncio.Queue()
        
        # Configuration
        self.max_history_size = 10000
        self.history_retention_days = 30
        self.batch_size = 10
        self.processing_interval = 5  # seconds
        
        # Notification handlers
        self.notification_handlers: Dict[str, Callable] = {
            "email": self._send_email_notification,
            "slack": self._send_slack_notification,
            "webhook": self._send_webhook_notification,
            "pagerduty": self._send_pagerduty_notification
        }
    
    async def initialize(self) -> bool:
        """Initialize the alert manager."""
        try:
            # Start alert processing
            self.running = True
            self.processing_task = asyncio.create_task(self._processing_loop())
            
            # Set up default notification channels
            await self._setup_default_channels()
            
            self.logger.info("Alert manager initialized successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to initialize alert manager: {e}")
            return False
    
    async def shutdown(self):
        """Shutdown the alert manager."""
        try:
            self.running = False
            
            if self.processing_task:
                self.processing_task.cancel()
                try:
                    await self.processing_task
                except asyncio.CancelledError:
                    pass
            
            self.logger.info("Alert manager shutdown completed")
            
        except Exception as e:
            self.logger.error(f"Error during alert manager shutdown: {e}")
    
    async def send_alert(self, severity: str, title: str, description: str,
                        source: str = "acso", tags: Optional[Dict[str, str]] = None,
                        metadata: Optional[Dict[str, Any]] = None) -> str:
        """Send an alert."""
        try:
            # Generate alert ID
            alert_id = f"alert_{int(datetime.utcnow().timestamp() * 1000)}"
            
            # Create alert
            alert = Alert(
                alert_id=alert_id,
                severity=AlertSeverity(severity),
                title=title,
                description=description,
                source=source,
                timestamp=datetime.utcnow(),
                tags=tags or {},
                metadata=metadata or {}
            )
            
            # Queue for processing
            await self.alert_queue.put(alert)
            
            self.logger.info(f"Alert queued: {alert_id} - {title}")
            return alert_id
            
        except Exception as e:
            self.logger.error(f"Failed to send alert: {e}")
            return ""
    
    async def acknowledge_alert(self, alert_id: str, acknowledged_by: str) -> bool:
        """Acknowledge an alert."""
        try:
            if alert_id not in self.active_alerts:
                return False
            
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.ACKNOWLEDGED
            alert.acknowledged_by = acknowledged_by
            alert.acknowledged_at = datetime.utcnow()
            
            self.logger.info(f"Alert acknowledged: {alert_id} by {acknowledged_by}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to acknowledge alert {alert_id}: {e}")
            return False
    
    async def resolve_alert(self, alert_id: str) -> bool:
        """Resolve an alert."""
        try:
            if alert_id not in self.active_alerts:
                return False
            
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.RESOLVED
            alert.resolved_at = datetime.utcnow()
            
            # Move to history
            self.alert_history.append(alert)
            del self.active_alerts[alert_id]
            
            # Cleanup history if needed
            await self._cleanup_history()
            
            self.logger.info(f"Alert resolved: {alert_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to resolve alert {alert_id}: {e}")
            return False
    
    async def suppress_alert(self, alert_id: str, duration_minutes: int = 60) -> bool:
        """Suppress an alert for a specified duration."""
        try:
            if alert_id not in self.active_alerts:
                return False
            
            alert = self.active_alerts[alert_id]
            alert.status = AlertStatus.SUPPRESSED
            alert.metadata["suppressed_until"] = (
                datetime.utcnow() + timedelta(minutes=duration_minutes)
            ).isoformat()
            
            self.logger.info(f"Alert suppressed: {alert_id} for {duration_minutes} minutes")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to suppress alert {alert_id}: {e}")
            return False
    
    async def add_notification_channel(self, channel: NotificationChannel) -> bool:
        """Add a notification channel."""
        try:
            self.notification_channels[channel.channel_id] = channel
            self.logger.info(f"Added notification channel: {channel.channel_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to add notification channel: {e}")
            return False
    
    async def remove_notification_channel(self, channel_id: str) -> bool:
        """Remove a notification channel."""
        try:
            if channel_id in self.notification_channels:
                del self.notification_channels[channel_id]
                self.logger.info(f"Removed notification channel: {channel_id}")
                return True
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to remove notification channel {channel_id}: {e}")
            return False
    
    async def add_alert_rule(self, rule: AlertRule) -> bool:
        """Add an alert rule."""
        try:
            self.alert_rules[rule.rule_id] = rule
            self.logger.info(f"Added alert rule: {rule.rule_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to add alert rule: {e}")
            return False
    
    async def _processing_loop(self):
        """Main alert processing loop."""
        while self.running:
            try:
                # Process alerts in batches
                alerts_to_process = []
                
                # Collect alerts from queue
                for _ in range(self.batch_size):
                    try:
                        alert = await asyncio.wait_for(
                            self.alert_queue.get(), 
                            timeout=self.processing_interval
                        )
                        alerts_to_process.append(alert)
                    except asyncio.TimeoutError:
                        break
                
                # Process collected alerts
                for alert in alerts_to_process:
                    await self._process_alert(alert)
                
                # Check for suppression expiry
                await self._check_suppression_expiry()
                
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Alert processing error: {e}")
                await asyncio.sleep(10)
    
    async def _process_alert(self, alert: Alert):
        """Process a single alert."""
        try:
            # Check for duplicate alerts
            duplicate_id = await self._check_for_duplicate(alert)
            if duplicate_id:
                self.logger.debug(f"Duplicate alert detected, updating: {duplicate_id}")
                self.active_alerts[duplicate_id].timestamp = alert.timestamp
                return
            
            # Add to active alerts
            self.active_alerts[alert.alert_id] = alert
            
            # Find matching notification channels
            channels = await self._find_matching_channels(alert)
            
            # Send notifications
            for channel in channels:
                await self._send_notification(alert, channel)
            
            self.logger.info(f"Processed alert: {alert.alert_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to process alert {alert.alert_id}: {e}")
    
    async def _check_for_duplicate(self, alert: Alert) -> Optional[str]:
        """Check for duplicate alerts based on title and tags."""
        try:
            for existing_id, existing_alert in self.active_alerts.items():
                if (existing_alert.title == alert.title and
                    existing_alert.tags == alert.tags and
                    existing_alert.status == AlertStatus.ACTIVE):
                    return existing_id
            return None
            
        except Exception as e:
            self.logger.error(f"Duplicate check failed: {e}")
            return None
    
    async def _find_matching_channels(self, alert: Alert) -> List[NotificationChannel]:
        """Find notification channels that match the alert criteria."""
        try:
            matching_channels = []
            
            for channel in self.notification_channels.values():
                if not channel.enabled:
                    continue
                
                # Check severity filter
                if channel.severity_filter and alert.severity not in channel.severity_filter:
                    continue
                
                # Check tag filters
                if channel.tag_filters:
                    match = True
                    for key, value in channel.tag_filters.items():
                        if key not in alert.tags or alert.tags[key] != value:
                            match = False
                            break
                    if not match:
                        continue
                
                matching_channels.append(channel)
            
            return matching_channels
            
        except Exception as e:
            self.logger.error(f"Channel matching failed: {e}")
            return []
    
    async def _send_notification(self, alert: Alert, channel: NotificationChannel):
        """Send notification through a specific channel."""
        try:
            handler = self.notification_handlers.get(channel.channel_type)
            if handler:
                await handler(alert, channel)
            else:
                self.logger.warning(f"No handler for channel type: {channel.channel_type}")
                
        except Exception as e:
            self.logger.error(f"Notification sending failed for channel {channel.channel_id}: {e}")
    
    async def _send_email_notification(self, alert: Alert, channel: NotificationChannel):
        """Send email notification."""
        try:
            config = channel.config
            
            # Create message
            msg = MIMEMultipart()
            msg['From'] = config.get('from_email', 'acso@example.com')
            msg['To'] = config.get('to_email')
            msg['Subject'] = f"[ACSO Alert] {alert.severity.upper()}: {alert.title}"
            
            # Create body
            body = f"""
Alert Details:
- Severity: {alert.severity.upper()}
- Title: {alert.title}
- Description: {alert.description}
- Source: {alert.source}
- Timestamp: {alert.timestamp.isoformat()}
- Tags: {json.dumps(alert.tags, indent=2)}

Alert ID: {alert.alert_id}
            """
            
            msg.attach(MIMEText(body, 'plain'))
            
            # Send email (would need actual SMTP configuration)
            self.logger.info(f"Email notification sent for alert {alert.alert_id}")
            
        except Exception as e:
            self.logger.error(f"Email notification failed: {e}")
    
    async def _send_slack_notification(self, alert: Alert, channel: NotificationChannel):
        """Send Slack notification."""
        try:
            config = channel.config
            webhook_url = config.get('webhook_url')
            
            if not webhook_url:
                self.logger.error("Slack webhook URL not configured")
                return
            
            # Create Slack message
            color_map = {
                AlertSeverity.INFO: "good",
                AlertSeverity.WARNING: "warning",
                AlertSeverity.ERROR: "danger",
                AlertSeverity.CRITICAL: "danger"
            }
            
            payload = {
                "attachments": [{
                    "color": color_map.get(alert.severity, "warning"),
                    "title": f"{alert.severity.upper()}: {alert.title}",
                    "text": alert.description,
                    "fields": [
                        {"title": "Source", "value": alert.source, "short": True},
                        {"title": "Alert ID", "value": alert.alert_id, "short": True},
                        {"title": "Timestamp", "value": alert.timestamp.isoformat(), "short": True}
                    ]
                }]
            }
            
            # Send to Slack
            async with aiohttp.ClientSession() as session:
                async with session.post(webhook_url, json=payload) as response:
                    if response.status == 200:
                        self.logger.info(f"Slack notification sent for alert {alert.alert_id}")
                    else:
                        self.logger.error(f"Slack notification failed: {response.status}")
            
        except Exception as e:
            self.logger.error(f"Slack notification failed: {e}")
    
    async def _send_webhook_notification(self, alert: Alert, channel: NotificationChannel):
        """Send webhook notification."""
        try:
            config = channel.config
            webhook_url = config.get('url')
            
            if not webhook_url:
                self.logger.error("Webhook URL not configured")
                return
            
            # Create payload
            payload = {
                "alert_id": alert.alert_id,
                "severity": alert.severity.value,
                "title": alert.title,
                "description": alert.description,
                "source": alert.source,
                "timestamp": alert.timestamp.isoformat(),
                "tags": alert.tags,
                "metadata": alert.metadata
            }
            
            # Send webhook
            async with aiohttp.ClientSession() as session:
                headers = config.get('headers', {})
                async with session.post(webhook_url, json=payload, headers=headers) as response:
                    if response.status < 400:
                        self.logger.info(f"Webhook notification sent for alert {alert.alert_id}")
                    else:
                        self.logger.error(f"Webhook notification failed: {response.status}")
            
        except Exception as e:
            self.logger.error(f"Webhook notification failed: {e}")
    
    async def _send_pagerduty_notification(self, alert: Alert, channel: NotificationChannel):
        """Send PagerDuty notification."""
        try:
            config = channel.config
            integration_key = config.get('integration_key')
            
            if not integration_key:
                self.logger.error("PagerDuty integration key not configured")
                return
            
            # Create PagerDuty event
            payload = {
                "routing_key": integration_key,
                "event_action": "trigger",
                "dedup_key": alert.alert_id,
                "payload": {
                    "summary": f"{alert.severity.upper()}: {alert.title}",
                    "source": alert.source,
                    "severity": alert.severity.value,
                    "timestamp": alert.timestamp.isoformat(),
                    "custom_details": {
                        "description": alert.description,
                        "tags": alert.tags,
                        "alert_id": alert.alert_id
                    }
                }
            }
            
            # Send to PagerDuty
            async with aiohttp.ClientSession() as session:
                async with session.post(
                    "https://events.pagerduty.com/v2/enqueue",
                    json=payload
                ) as response:
                    if response.status == 202:
                        self.logger.info(f"PagerDuty notification sent for alert {alert.alert_id}")
                    else:
                        self.logger.error(f"PagerDuty notification failed: {response.status}")
            
        except Exception as e:
            self.logger.error(f"PagerDuty notification failed: {e}")
    
    async def _check_suppression_expiry(self):
        """Check for expired suppressions."""
        try:
            current_time = datetime.utcnow()
            
            for alert in self.active_alerts.values():
                if alert.status == AlertStatus.SUPPRESSED:
                    suppressed_until_str = alert.metadata.get("suppressed_until")
                    if suppressed_until_str:
                        suppressed_until = datetime.fromisoformat(suppressed_until_str)
                        if current_time > suppressed_until:
                            alert.status = AlertStatus.ACTIVE
                            del alert.metadata["suppressed_until"]
                            self.logger.info(f"Alert suppression expired: {alert.alert_id}")
            
        except Exception as e:
            self.logger.error(f"Suppression expiry check failed: {e}")
    
    async def _cleanup_history(self):
        """Clean up old alert history."""
        try:
            if len(self.alert_history) > self.max_history_size:
                # Keep only the most recent alerts
                self.alert_history = self.alert_history[-self.max_history_size:]
            
            # Remove alerts older than retention period
            cutoff_date = datetime.utcnow() - timedelta(days=self.history_retention_days)
            self.alert_history = [
                alert for alert in self.alert_history
                if alert.timestamp > cutoff_date
            ]
            
        except Exception as e:
            self.logger.error(f"History cleanup failed: {e}")
    
    async def _setup_default_channels(self):
        """Set up default notification channels."""
        try:
            # Default email channel for critical alerts
            default_email = NotificationChannel(
                channel_id="default_email",
                channel_type="email",
                config={
                    "from_email": "acso-alerts@example.com",
                    "to_email": "admin@example.com"
                },
                severity_filter=[AlertSeverity.CRITICAL, AlertSeverity.ERROR]
            )
            
            await self.add_notification_channel(default_email)
            
        except Exception as e:
            self.logger.error(f"Default channel setup failed: {e}")
    
    # Public API methods
    
    def get_active_alerts(self, severity: Optional[AlertSeverity] = None) -> List[Alert]:
        """Get active alerts, optionally filtered by severity."""
        alerts = list(self.active_alerts.values())
        
        if severity:
            alerts = [alert for alert in alerts if alert.severity == severity]
        
        return sorted(alerts, key=lambda x: x.timestamp, reverse=True)
    
    def get_alert_history(self, limit: int = 100) -> List[Alert]:
        """Get alert history."""
        return sorted(self.alert_history, key=lambda x: x.timestamp, reverse=True)[:limit]
    
    def get_alert_stats(self) -> Dict[str, Any]:
        """Get alert statistics."""
        active_by_severity = {}
        for severity in AlertSeverity:
            active_by_severity[severity.value] = len([
                alert for alert in self.active_alerts.values()
                if alert.severity == severity
            ])
        
        return {
            "active_alerts": len(self.active_alerts),
            "total_history": len(self.alert_history),
            "active_by_severity": active_by_severity,
            "notification_channels": len(self.notification_channels),
            "alert_rules": len(self.alert_rules)
        }