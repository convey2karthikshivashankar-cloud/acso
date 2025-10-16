# ACSO Integration Guide

## Overview

This guide provides comprehensive information for integrating external systems with the ACSO (Autonomous Cyber-Security & Service Orchestrator) platform. It covers API specifications, authentication methods, integration patterns, and best practices for connecting your systems with ACSO.

## Table of Contents

1. [Getting Started](#getting-started)
2. [Authentication and Authorization](#authentication-and-authorization)
3. [API Reference](#api-reference)
4. [Integration Patterns](#integration-patterns)
5. [Webhooks and Events](#webhooks-and-events)
6. [SDK and Libraries](#sdk-and-libraries)
7. [Error Handling](#error-handling)
8. [Rate Limiting](#rate-limiting)
9. [Best Practices](#best-practices)
10. [Examples](#examples)

## Getting Started

### Prerequisites

Before integrating with ACSO, ensure you have:

- Valid ACSO account with API access
- API credentials (API key and secret)
- Understanding of your integration requirements
- Development environment with HTTPS support

### Base URL

All API requests should be made to:
```
https://api.acso.your-domain.com/v1
```

### API Versioning

ACSO uses URL-based versioning. The current version is `v1`. Future versions will be introduced as `v2`, `v3`, etc., with backward compatibility maintained for at least 12 months.

## Authentication and Authorization

### API Key Authentication

ACSO uses API key-based authentication for programmatic access:

```http
GET /api/v1/agents/status
Authorization: Bearer YOUR_API_KEY
Content-Type: application/json
```

### OAuth 2.0 (Recommended)

For production integrations, OAuth 2.0 is recommended:

#### 1. Register Your Application

Register your application in the ACSO console to obtain:
- Client ID
- Client Secret
- Redirect URI

#### 2. Authorization Code Flow

```http
GET /oauth/authorize?
  response_type=code&
  client_id=YOUR_CLIENT_ID&
  redirect_uri=YOUR_REDIRECT_URI&
  scope=read:agents write:workflows&
  state=RANDOM_STATE_STRING
```

#### 3. Exchange Code for Token

```http
POST /oauth/token
Content-Type: application/x-www-form-urlencoded

grant_type=authorization_code&
code=AUTHORIZATION_CODE&
client_id=YOUR_CLIENT_ID&
client_secret=YOUR_CLIENT_SECRET&
redirect_uri=YOUR_REDIRECT_URI
```

#### 4. Use Access Token

```http
GET /api/v1/agents/status
Authorization: Bearer ACCESS_TOKEN
```

### Scopes

Available OAuth scopes:

- `read:agents` - Read agent status and configuration
- `write:agents` - Modify agent configuration
- `read:workflows` - Read workflow definitions and status
- `write:workflows` - Create and modify workflows
- `read:incidents` - Read incident data
- `write:incidents` - Create and update incidents
- `read:reports` - Access reports and analytics
- `admin` - Full administrative access

## API Reference

### Agents API

#### Get Agent Status

```http
GET /api/v1/agents/status
```

**Response:**
```json
{
  "agents": [
    {
      "id": "supervisor",
      "name": "Supervisor Agent",
      "status": "active",
      "health": "healthy",
      "last_heartbeat": "2024-01-15T10:30:00Z",
      "metrics": {
        "cpu_usage": 45.2,
        "memory_usage": 67.8,
        "active_workflows": 12
      }
    },
    {
      "id": "threat_hunter",
      "name": "Threat Hunter Agent",
      "status": "active",
      "health": "healthy",
      "last_heartbeat": "2024-01-15T10:30:00Z",
      "metrics": {
        "cpu_usage": 32.1,
        "memory_usage": 54.3,
        "threats_analyzed": 156
      }
    }
  ]
}
```

#### Get Specific Agent

```http
GET /api/v1/agents/{agent_id}
```

**Response:**
```json
{
  "id": "threat_hunter",
  "name": "Threat Hunter Agent",
  "status": "active",
  "health": "healthy",
  "configuration": {
    "analysis_timeout": 60,
    "confidence_threshold": 0.75,
    "max_concurrent_analyses": 10
  },
  "capabilities": [
    "threat_analysis",
    "vulnerability_assessment",
    "risk_scoring"
  ],
  "last_heartbeat": "2024-01-15T10:30:00Z"
}
```

#### Update Agent Configuration

```http
PUT /api/v1/agents/{agent_id}/config
Content-Type: application/json

{
  "analysis_timeout": 90,
  "confidence_threshold": 0.8,
  "max_concurrent_analyses": 15
}
```

### Workflows API

#### List Workflows

```http
GET /api/v1/workflows?status=active&limit=50&offset=0
```

**Response:**
```json
{
  "workflows": [
    {
      "id": "wf_123456",
      "name": "Threat Detection and Response",
      "status": "running",
      "created_at": "2024-01-15T09:00:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "steps": [
        {
          "id": "step_1",
          "name": "Analyze Threat",
          "agent": "threat_hunter",
          "status": "completed"
        },
        {
          "id": "step_2",
          "name": "Assess Risk",
          "agent": "threat_hunter",
          "status": "running"
        }
      ]
    }
  ],
  "pagination": {
    "total": 156,
    "limit": 50,
    "offset": 0,
    "has_more": true
  }
}
```

#### Create Workflow

```http
POST /api/v1/workflows
Content-Type: application/json

{
  "name": "Custom Security Workflow",
  "description": "Custom workflow for security incident response",
  "trigger": {
    "type": "api",
    "conditions": {
      "severity": "high"
    }
  },
  "steps": [
    {
      "name": "Analyze Threat",
      "agent": "threat_hunter",
      "action": "analyze_threat",
      "parameters": {
        "source": "external_feed",
        "timeout": 60
      }
    },
    {
      "name": "Respond to Incident",
      "agent": "incident_response",
      "action": "contain_threat",
      "depends_on": ["step_1"],
      "approval_required": true
    }
  ]
}
```

#### Execute Workflow

```http
POST /api/v1/workflows/{workflow_id}/execute
Content-Type: application/json

{
  "parameters": {
    "threat_source": "192.168.1.100",
    "severity": "high",
    "description": "Suspicious network activity detected"
  },
  "priority": "high",
  "requester": "security_team"
}
```

### Incidents API

#### List Incidents

```http
GET /api/v1/incidents?status=open&severity=high&limit=20
```

**Response:**
```json
{
  "incidents": [
    {
      "id": "inc_789012",
      "title": "Suspicious Network Activity",
      "description": "Unusual traffic patterns detected from external IP",
      "severity": "high",
      "status": "investigating",
      "created_at": "2024-01-15T08:45:00Z",
      "updated_at": "2024-01-15T10:30:00Z",
      "assigned_agent": "incident_response",
      "tags": ["network", "external_threat", "automated"],
      "metadata": {
        "source_ip": "192.168.1.100",
        "destination_ip": "10.0.1.50",
        "protocol": "TCP",
        "port": 443
      }
    }
  ]
}
```

#### Create Incident

```http
POST /api/v1/incidents
Content-Type: application/json

{
  "title": "Security Alert from External System",
  "description": "Malware detected on endpoint",
  "severity": "medium",
  "source": "endpoint_protection",
  "metadata": {
    "hostname": "workstation-001",
    "user": "john.doe",
    "malware_type": "trojan",
    "file_path": "C:\\temp\\suspicious.exe"
  },
  "tags": ["malware", "endpoint", "external"]
}
```

#### Update Incident

```http
PUT /api/v1/incidents/{incident_id}
Content-Type: application/json

{
  "status": "resolved",
  "resolution": "Malware quarantined and system cleaned",
  "resolved_by": "incident_response_agent",
  "resolution_time": "2024-01-15T11:00:00Z"
}
```

### Reports API

#### Get System Reports

```http
GET /api/v1/reports/system?period=7d&format=json
```

**Response:**
```json
{
  "report_id": "rpt_345678",
  "period": "7d",
  "generated_at": "2024-01-15T10:30:00Z",
  "summary": {
    "total_incidents": 45,
    "resolved_incidents": 42,
    "average_resolution_time": "2.5 hours",
    "threats_detected": 156,
    "workflows_executed": 89
  },
  "metrics": {
    "agent_performance": {
      "threat_hunter": {
        "uptime": 99.8,
        "avg_response_time": 1.2,
        "success_rate": 98.5
      }
    },
    "incident_trends": [
      {
        "date": "2024-01-14",
        "incidents": 8,
        "resolved": 7
      }
    ]
  }
}
```

## Integration Patterns

### Real-time Integration

#### WebSocket Connection

For real-time updates, establish a WebSocket connection:

```javascript
const ws = new WebSocket('wss://api.acso.your-domain.com/v1/ws');

ws.onopen = function() {
    // Authenticate
    ws.send(JSON.stringify({
        type: 'auth',
        token: 'YOUR_ACCESS_TOKEN'
    }));
    
    // Subscribe to events
    ws.send(JSON.stringify({
        type: 'subscribe',
        events: ['incident.created', 'workflow.completed']
    }));
};

ws.onmessage = function(event) {
    const data = JSON.parse(event.data);
    console.log('Received event:', data);
};
```

#### Server-Sent Events (SSE)

For one-way real-time updates:

```javascript
const eventSource = new EventSource('/api/v1/events?token=YOUR_ACCESS_TOKEN');

eventSource.addEventListener('incident.created', function(event) {
    const incident = JSON.parse(event.data);
    console.log('New incident:', incident);
});
```

### Batch Integration

#### Bulk Operations

For processing multiple items:

```http
POST /api/v1/incidents/batch
Content-Type: application/json

{
  "operations": [
    {
      "operation": "create",
      "data": {
        "title": "Incident 1",
        "severity": "medium"
      }
    },
    {
      "operation": "update",
      "id": "inc_123",
      "data": {
        "status": "resolved"
      }
    }
  ]
}
```

### Polling Integration

For systems that cannot receive webhooks:

```javascript
async function pollForUpdates() {
    try {
        const response = await fetch('/api/v1/incidents?updated_since=' + lastUpdate);
        const data = await response.json();
        
        data.incidents.forEach(incident => {
            processIncident(incident);
        });
        
        lastUpdate = new Date().toISOString();
    } catch (error) {
        console.error('Polling error:', error);
    }
}

// Poll every 30 seconds
setInterval(pollForUpdates, 30000);
```

## Webhooks and Events

### Webhook Configuration

Configure webhooks in the ACSO console or via API:

```http
POST /api/v1/webhooks
Content-Type: application/json

{
  "url": "https://your-system.com/acso-webhook",
  "events": [
    "incident.created",
    "incident.updated",
    "workflow.completed",
    "agent.status_changed"
  ],
  "secret": "your_webhook_secret",
  "active": true
}
```

### Event Types

Available webhook events:

#### Incident Events
- `incident.created` - New incident created
- `incident.updated` - Incident status or details updated
- `incident.resolved` - Incident marked as resolved
- `incident.escalated` - Incident escalated to higher priority

#### Workflow Events
- `workflow.started` - Workflow execution started
- `workflow.completed` - Workflow execution completed
- `workflow.failed` - Workflow execution failed
- `workflow.approval_required` - Workflow requires human approval

#### Agent Events
- `agent.status_changed` - Agent status changed (active/inactive)
- `agent.health_changed` - Agent health status changed
- `agent.configuration_updated` - Agent configuration modified

### Webhook Payload Format

```json
{
  "event_id": "evt_123456",
  "event_type": "incident.created",
  "timestamp": "2024-01-15T10:30:00Z",
  "data": {
    "incident": {
      "id": "inc_789012",
      "title": "Security Alert",
      "severity": "high",
      "status": "open"
    }
  },
  "metadata": {
    "source": "acso_system",
    "version": "1.0"
  }
}
```

### Webhook Security

#### Signature Verification

Verify webhook signatures to ensure authenticity:

```python
import hmac
import hashlib

def verify_webhook_signature(payload, signature, secret):
    expected_signature = hmac.new(
        secret.encode('utf-8'),
        payload.encode('utf-8'),
        hashlib.sha256
    ).hexdigest()
    
    return hmac.compare_digest(f"sha256={expected_signature}", signature)

# Usage
signature = request.headers.get('X-ACSO-Signature')
if verify_webhook_signature(request.body, signature, webhook_secret):
    # Process webhook
    pass
else:
    # Invalid signature
    return 401
```

## SDK and Libraries

### Python SDK

Install the official Python SDK:

```bash
pip install acso-python-sdk
```

Basic usage:

```python
from acso import AcsoClient

# Initialize client
client = AcsoClient(
    api_key='your_api_key',
    base_url='https://api.acso.your-domain.com/v1'
)

# Get agent status
agents = client.agents.list()
for agent in agents:
    print(f"{agent.name}: {agent.status}")

# Create incident
incident = client.incidents.create(
    title="Security Alert",
    description="Suspicious activity detected",
    severity="medium"
)

# Execute workflow
workflow = client.workflows.execute(
    workflow_id="wf_123456",
    parameters={
        "threat_source": "192.168.1.100",
        "severity": "high"
    }
)
```

### JavaScript/Node.js SDK

Install the JavaScript SDK:

```bash
npm install @acso/javascript-sdk
```

Basic usage:

```javascript
const { AcsoClient } = require('@acso/javascript-sdk');

// Initialize client
const client = new AcsoClient({
    apiKey: 'your_api_key',
    baseUrl: 'https://api.acso.your-domain.com/v1'
});

// Get agent status
const agents = await client.agents.list();
agents.forEach(agent => {
    console.log(`${agent.name}: ${agent.status}`);
});

// Create incident
const incident = await client.incidents.create({
    title: 'Security Alert',
    description: 'Suspicious activity detected',
    severity: 'medium'
});

// Execute workflow
const workflow = await client.workflows.execute('wf_123456', {
    threat_source: '192.168.1.100',
    severity: 'high'
});
```

## Error Handling

### HTTP Status Codes

ACSO uses standard HTTP status codes:

- `200 OK` - Request successful
- `201 Created` - Resource created successfully
- `400 Bad Request` - Invalid request parameters
- `401 Unauthorized` - Authentication required
- `403 Forbidden` - Insufficient permissions
- `404 Not Found` - Resource not found
- `429 Too Many Requests` - Rate limit exceeded
- `500 Internal Server Error` - Server error

### Error Response Format

```json
{
  "error": {
    "code": "INVALID_PARAMETER",
    "message": "The 'severity' parameter must be one of: low, medium, high, critical",
    "details": {
      "parameter": "severity",
      "provided_value": "urgent",
      "allowed_values": ["low", "medium", "high", "critical"]
    },
    "request_id": "req_123456"
  }
}
```

### Common Error Codes

- `AUTHENTICATION_FAILED` - Invalid credentials
- `AUTHORIZATION_FAILED` - Insufficient permissions
- `INVALID_PARAMETER` - Invalid request parameter
- `RESOURCE_NOT_FOUND` - Requested resource not found
- `RATE_LIMIT_EXCEEDED` - Too many requests
- `WORKFLOW_EXECUTION_FAILED` - Workflow execution error
- `AGENT_UNAVAILABLE` - Target agent not available

### Retry Logic

Implement exponential backoff for retries:

```python
import time
import random

def api_call_with_retry(func, max_retries=3):
    for attempt in range(max_retries):
        try:
            return func()
        except Exception as e:
            if attempt == max_retries - 1:
                raise e
            
            # Exponential backoff with jitter
            delay = (2 ** attempt) + random.uniform(0, 1)
            time.sleep(delay)
```

## Rate Limiting

### Rate Limits

Default rate limits per API key:

- **Standard endpoints**: 1000 requests per hour
- **Bulk operations**: 100 requests per hour
- **Webhook endpoints**: 10000 requests per hour
- **Real-time endpoints**: 500 connections per account

### Rate Limit Headers

Response headers indicate current rate limit status:

```http
X-RateLimit-Limit: 1000
X-RateLimit-Remaining: 999
X-RateLimit-Reset: 1642248000
X-RateLimit-Window: 3600
```

### Handling Rate Limits

```python
def handle_rate_limit(response):
    if response.status_code == 429:
        reset_time = int(response.headers.get('X-RateLimit-Reset'))
        current_time = int(time.time())
        sleep_time = reset_time - current_time
        
        if sleep_time > 0:
            time.sleep(sleep_time)
            return True  # Retry the request
    
    return False  # Don't retry
```

## Best Practices

### Authentication

1. **Use OAuth 2.0** for production integrations
2. **Rotate API keys** regularly (every 90 days)
3. **Store credentials securely** (environment variables, key vaults)
4. **Use least privilege** principle for scopes

### API Usage

1. **Implement proper error handling** with retry logic
2. **Use pagination** for large result sets
3. **Cache responses** when appropriate
4. **Monitor rate limits** and implement backoff
5. **Use webhooks** instead of polling when possible

### Security

1. **Validate webhook signatures** to ensure authenticity
2. **Use HTTPS** for all communications
3. **Implement request timeouts** to prevent hanging connections
4. **Log API interactions** for audit purposes
5. **Sanitize input data** before sending to ACSO

### Performance

1. **Use bulk operations** for multiple items
2. **Implement connection pooling** for high-volume integrations
3. **Use compression** for large payloads
4. **Monitor response times** and optimize accordingly
5. **Implement circuit breakers** for fault tolerance

## Examples

### Complete Integration Example

```python
import asyncio
import aiohttp
from datetime import datetime, timedelta

class AcsoIntegration:
    def __init__(self, api_key, base_url):
        self.api_key = api_key
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={'Authorization': f'Bearer {self.api_key}'}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        await self.session.close()
    
    async def create_incident_from_alert(self, alert_data):
        """Create ACSO incident from external alert"""
        incident_data = {
            'title': alert_data['title'],
            'description': alert_data['description'],
            'severity': self.map_severity(alert_data['priority']),
            'source': 'external_monitoring',
            'metadata': {
                'alert_id': alert_data['id'],
                'source_system': alert_data['source'],
                'timestamp': alert_data['timestamp']
            },
            'tags': alert_data.get('tags', [])
        }
        
        async with self.session.post(
            f'{self.base_url}/incidents',
            json=incident_data
        ) as response:
            if response.status == 201:
                incident = await response.json()
                return incident
            else:
                error = await response.json()
                raise Exception(f"Failed to create incident: {error}")
    
    async def monitor_workflow_progress(self, workflow_id):
        """Monitor workflow execution progress"""
        while True:
            async with self.session.get(
                f'{self.base_url}/workflows/{workflow_id}'
            ) as response:
                workflow = await response.json()
                
                if workflow['status'] in ['completed', 'failed']:
                    return workflow
                
                await asyncio.sleep(5)  # Poll every 5 seconds
    
    def map_severity(self, priority):
        """Map external priority to ACSO severity"""
        mapping = {
            'P1': 'critical',
            'P2': 'high',
            'P3': 'medium',
            'P4': 'low'
        }
        return mapping.get(priority, 'medium')

# Usage example
async def main():
    async with AcsoIntegration('your_api_key', 'https://api.acso.your-domain.com/v1') as acso:
        # Create incident from external alert
        alert = {
            'id': 'alert_123',
            'title': 'High CPU Usage',
            'description': 'Server CPU usage exceeded 90%',
            'priority': 'P2',
            'source': 'monitoring_system',
            'timestamp': datetime.now().isoformat(),
            'tags': ['performance', 'server']
        }
        
        incident = await acso.create_incident_from_alert(alert)
        print(f"Created incident: {incident['id']}")
        
        # Execute response workflow
        workflow = await acso.session.post(
            f"{acso.base_url}/workflows/performance_response/execute",
            json={
                'parameters': {
                    'incident_id': incident['id'],
                    'server_id': 'srv_001'
                }
            }
        )
        
        workflow_data = await workflow.json()
        print(f"Started workflow: {workflow_data['id']}")
        
        # Monitor progress
        final_workflow = await acso.monitor_workflow_progress(workflow_data['id'])
        print(f"Workflow completed with status: {final_workflow['status']}")

if __name__ == '__main__':
    asyncio.run(main())
```

### Webhook Handler Example

```python
from flask import Flask, request, jsonify
import hmac
import hashlib
import json

app = Flask(__name__)
WEBHOOK_SECRET = 'your_webhook_secret'

def verify_signature(payload, signature):
    expected_signature = hmac.new(
        WEBHOOK_SECRET.encode('utf-8'),
        payload,
        hashlib.sha256
    ).hexdigest()
    return hmac.compare_digest(f"sha256={expected_signature}", signature)

@app.route('/acso-webhook', methods=['POST'])
def handle_webhook():
    # Verify signature
    signature = request.headers.get('X-ACSO-Signature')
    if not verify_signature(request.data, signature):
        return jsonify({'error': 'Invalid signature'}), 401
    
    # Parse event
    event = request.json
    event_type = event['event_type']
    
    # Handle different event types
    if event_type == 'incident.created':
        handle_incident_created(event['data']['incident'])
    elif event_type == 'workflow.completed':
        handle_workflow_completed(event['data']['workflow'])
    elif event_type == 'agent.status_changed':
        handle_agent_status_changed(event['data']['agent'])
    
    return jsonify({'status': 'processed'}), 200

def handle_incident_created(incident):
    """Handle new incident creation"""
    print(f"New incident created: {incident['title']}")
    
    # Send notification to external system
    if incident['severity'] in ['high', 'critical']:
        send_alert_to_pagerduty(incident)

def handle_workflow_completed(workflow):
    """Handle workflow completion"""
    print(f"Workflow completed: {workflow['name']}")
    
    # Update external ticketing system
    update_ticket_status(workflow['id'], 'completed')

def handle_agent_status_changed(agent):
    """Handle agent status changes"""
    print(f"Agent {agent['name']} status changed to {agent['status']}")
    
    # Alert if agent goes offline
    if agent['status'] == 'inactive':
        send_agent_alert(agent)

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000)
```

## Support and Resources

### Documentation

- [API Reference](api-documentation.md) - Complete API documentation
- [System Architecture](system-architecture.md) - System design and architecture
- [User Manuals](user-manual-administration.md) - Administration and monitoring guides

### Support Channels

- **Documentation**: https://docs.acso.your-domain.com
- **API Status**: https://status.acso.your-domain.com
- **Support Portal**: https://support.acso.your-domain.com
- **Developer Forum**: https://forum.acso.your-domain.com

### Rate Limit Increases

For higher rate limits, contact support with:
- Current usage patterns
- Expected traffic volume
- Business justification
- Integration timeline

---

*This integration guide is regularly updated to reflect API changes and new features. For the latest version, refer to the online documentation portal.*