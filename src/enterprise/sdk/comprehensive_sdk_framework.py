"""
ACSO Enterprise Framework - Comprehensive SDK Framework

Multi-language SDK framework for Python, Java, Go, and JavaScript with
agent development templates, scaffolding, and comprehensive API documentation.
"""

import asyncio
import logging
from datetime import datetime
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
from pathlib import Path
import subprocess
import tempfile
import shutil

logger = logging.getLogger(__name__)

class SDKLanguage(Enum):
    """Supported SDK languages."""
    PYTHON = "python"
    JAVA = "java"
    GO = "go"
    JAVASCRIPT = "javascript"
    TYPESCRIPT = "typescript"

class TemplateType(Enum):
    """Agent template types."""
    BASIC_AGENT = "basic_agent"
    THREAT_DETECTION = "threat_detection"
    FINANCIAL_ANALYSIS = "financial_analysis"
    WORKFLOW_AUTOMATION = "workflow_automation"
    CUSTOM_INTEGRATION = "custom_integration"

@dataclass
class SDKConfiguration:
    """SDK configuration for a specific language."""
    language: SDKLanguage
    version: str
    api_base_url: str
    authentication_method: str
    timeout_seconds: int = 30
    retry_attempts: int = 3
    enable_logging: bool = True
    log_level: str = "INFO"

@dataclass
class AgentTemplate:
    """Agent development template."""
    template_id: str
    name: str
    description: str
    template_type: TemplateType
    language: SDKLanguage
    files: Dict[str, str] = field(default_factory=dict)  # filename -> content
    dependencies: List[str] = field(default_factory=list)
    configuration: Dict[str, Any] = field(default_factory=dict)
    documentation: str = ""
    created_at: datetime = field(default_factory=datetime.now)

class SDKGenerator:
    """Generates SDK code for different languages."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize SDK generator."""
        self.config = config
        self.api_spec = self._load_api_specification()
    
    async def generate_sdk(self, language: SDKLanguage, output_dir: str) -> bool:
        """Generate SDK for specified language."""
        try:
            if language == SDKLanguage.PYTHON:
                return await self._generate_python_sdk(output_dir)
            elif language == SDKLanguage.JAVA:
                return await self._generate_java_sdk(output_dir)
            elif language == SDKLanguage.GO:
                return await self._generate_go_sdk(output_dir)
            elif language == SDKLanguage.JAVASCRIPT:
                return await self._generate_javascript_sdk(output_dir)
            elif language == SDKLanguage.TYPESCRIPT:
                return await self._generate_typescript_sdk(output_dir)
            else:
                logger.error(f"Unsupported language: {language}")
                return False
                
        except Exception as e:
            logger.error(f"SDK generation failed for {language}: {e}")
            return False
    
    async def _generate_python_sdk(self, output_dir: str) -> bool:
        """Generate Python SDK."""
        try:
            sdk_dir = Path(output_dir) / "acso-python-sdk"
            sdk_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate main client
            client_code = '''"""ACSO Python SDK - Main Client"""
import asyncio
import aiohttp
import logging
from typing import Dict, List, Optional, Any
from dataclasses import dataclass

class AcsoClient:
    """Main ACSO API client."""
    
    def __init__(self, api_key: str, base_url: str = "https://api.acso.com"):
        self.api_key = api_key
        self.base_url = base_url
        self.session = None
    
    async def __aenter__(self):
        self.session = aiohttp.ClientSession(
            headers={"Authorization": f"Bearer {self.api_key}"}
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        if self.session:
            await self.session.close()
    
    async def create_agent(self, agent_config: Dict[str, Any]) -> Dict[str, Any]:
        """Create a new agent."""
        async with self.session.post(f"{self.base_url}/agents", json=agent_config) as resp:
            return await resp.json()
    
    async def get_agent(self, agent_id: str) -> Dict[str, Any]:
        """Get agent information."""
        async with self.session.get(f"{self.base_url}/agents/{agent_id}") as resp:
            return await resp.json()
    
    async def execute_workflow(self, workflow_id: str, params: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a workflow."""
        async with self.session.post(
            f"{self.base_url}/workflows/{workflow_id}/execute", 
            json=params
        ) as resp:
            return await resp.json()
'''
            
            (sdk_dir / "acso_client.py").write_text(client_code)
            
            # Generate setup.py
            setup_code = '''from setuptools import setup, find_packages

setup(
    name="acso-sdk",
    version="1.0.0",
    description="ACSO Enterprise Framework Python SDK",
    packages=find_packages(),
    install_requires=[
        "aiohttp>=3.8.0",
        "pydantic>=1.10.0"
    ],
    python_requires=">=3.8"
)'''
            (sdk_dir / "setup.py").write_text(setup_code)
            
            logger.info(f"Generated Python SDK in {sdk_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Python SDK generation failed: {e}")
            return False
    
    async def _generate_java_sdk(self, output_dir: str) -> bool:
        """Generate Java SDK."""
        try:
            sdk_dir = Path(output_dir) / "acso-java-sdk"
            src_dir = sdk_dir / "src" / "main" / "java" / "com" / "acso" / "sdk"
            src_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate main client
            client_code = '''package com.acso.sdk;

import java.net.http.HttpClient;
import java.net.http.HttpRequest;
import java.net.http.HttpResponse;
import java.net.URI;
import java.util.Map;
import java.util.concurrent.CompletableFuture;
import com.fasterxml.jackson.databind.ObjectMapper;

public class AcsoClient {
    private final String apiKey;
    private final String baseUrl;
    private final HttpClient httpClient;
    private final ObjectMapper objectMapper;
    
    public AcsoClient(String apiKey, String baseUrl) {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl != null ? baseUrl : "https://api.acso.com";
        this.httpClient = HttpClient.newHttpClient();
        this.objectMapper = new ObjectMapper();
    }
    
    public CompletableFuture<Map<String, Object>> createAgent(Map<String, Object> agentConfig) {
        return sendRequest("POST", "/agents", agentConfig);
    }
    
    public CompletableFuture<Map<String, Object>> getAgent(String agentId) {
        return sendRequest("GET", "/agents/" + agentId, null);
    }
    
    private CompletableFuture<Map<String, Object>> sendRequest(String method, String path, Object body) {
        // Implementation would handle HTTP requests
        return CompletableFuture.completedFuture(Map.of("status", "success"));
    }
}'''
            
            (src_dir / "AcsoClient.java").write_text(client_code)
            
            # Generate pom.xml
            pom_xml = '''<?xml version="1.0" encoding="UTF-8"?>
<project xmlns="http://maven.apache.org/POM/4.0.0">
    <modelVersion>4.0.0</modelVersion>
    <groupId>com.acso</groupId>
    <artifactId>acso-sdk</artifactId>
    <version>1.0.0</version>
    <packaging>jar</packaging>
    
    <properties>
        <maven.compiler.source>11</maven.compiler.source>
        <maven.compiler.target>11</maven.compiler.target>
    </properties>
    
    <dependencies>
        <dependency>
            <groupId>com.fasterxml.jackson.core</groupId>
            <artifactId>jackson-databind</artifactId>
            <version>2.15.2</version>
        </dependency>
    </dependencies>
</project>'''
            
            (sdk_dir / "pom.xml").write_text(pom_xml)
            
            logger.info(f"Generated Java SDK in {sdk_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Java SDK generation failed: {e}")
            return False
    
    async def _generate_go_sdk(self, output_dir: str) -> bool:
        """Generate Go SDK."""
        try:
            sdk_dir = Path(output_dir) / "acso-go-sdk"
            sdk_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate main client
            client_code = '''package acso

import (
    "bytes"
    "encoding/json"
    "fmt"
    "net/http"
    "time"
)

type Client struct {
    APIKey  string
    BaseURL string
    HTTPClient *http.Client
}

func NewClient(apiKey, baseURL string) *Client {
    if baseURL == "" {
        baseURL = "https://api.acso.com"
    }
    
    return &Client{
        APIKey:  apiKey,
        BaseURL: baseURL,
        HTTPClient: &http.Client{Timeout: 30 * time.Second},
    }
}

func (c *Client) CreateAgent(agentConfig map[string]interface{}) (map[string]interface{}, error) {
    return c.sendRequest("POST", "/agents", agentConfig)
}

func (c *Client) GetAgent(agentID string) (map[string]interface{}, error) {
    return c.sendRequest("GET", fmt.Sprintf("/agents/%s", agentID), nil)
}

func (c *Client) sendRequest(method, path string, body interface{}) (map[string]interface{}, error) {
    // Implementation would handle HTTP requests
    return map[string]interface{}{"status": "success"}, nil
}'''
            
            (sdk_dir / "client.go").write_text(client_code)
            
            # Generate go.mod
            go_mod = '''module github.com/acso/acso-go-sdk

go 1.19

require (
    github.com/go-resty/resty/v2 v2.7.0
)'''
            
            (sdk_dir / "go.mod").write_text(go_mod)
            
            logger.info(f"Generated Go SDK in {sdk_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Go SDK generation failed: {e}")
            return False
    
    async def _generate_javascript_sdk(self, output_dir: str) -> bool:
        """Generate JavaScript SDK."""
        try:
            sdk_dir = Path(output_dir) / "acso-js-sdk"
            sdk_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate main client
            client_code = '''/**
 * ACSO JavaScript SDK - Main Client
 */
class AcsoClient {
    constructor(apiKey, baseUrl = 'https://api.acso.com') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    
    async createAgent(agentConfig) {
        return this.sendRequest('POST', '/agents', agentConfig);
    }
    
    async getAgent(agentId) {
        return this.sendRequest('GET', `/agents/${agentId}`);
    }
    
    async executeWorkflow(workflowId, params) {
        return this.sendRequest('POST', `/workflows/${workflowId}/execute`, params);
    }
    
    async sendRequest(method, path, body = null) {
        const url = `${this.baseUrl}${path}`;
        const options = {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        const response = await fetch(url, options);
        return response.json();
    }
}

module.exports = AcsoClient;'''
            
            (sdk_dir / "index.js").write_text(client_code)
            
            # Generate package.json
            package_json = '''{
    "name": "acso-sdk",
    "version": "1.0.0",
    "description": "ACSO Enterprise Framework JavaScript SDK",
    "main": "index.js",
    "scripts": {
        "test": "jest"
    },
    "dependencies": {
        "node-fetch": "^3.3.0"
    },
    "devDependencies": {
        "jest": "^29.0.0"
    }
}'''
            
            (sdk_dir / "package.json").write_text(package_json)
            
            logger.info(f"Generated JavaScript SDK in {sdk_dir}")
            return True
            
        except Exception as e:
            logger.error(f"JavaScript SDK generation failed: {e}")
            return False
    
    async def _generate_typescript_sdk(self, output_dir: str) -> bool:
        """Generate TypeScript SDK."""
        try:
            sdk_dir = Path(output_dir) / "acso-ts-sdk"
            src_dir = sdk_dir / "src"
            src_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate main client
            client_code = '''/**
 * ACSO TypeScript SDK - Main Client
 */

export interface AgentConfig {
    name: string;
    type: string;
    configuration: Record<string, any>;
}

export interface WorkflowParams {
    [key: string]: any;
}

export interface ApiResponse<T = any> {
    success: boolean;
    data?: T;
    error?: string;
}

export class AcsoClient {
    private apiKey: string;
    private baseUrl: string;
    
    constructor(apiKey: string, baseUrl: string = 'https://api.acso.com') {
        this.apiKey = apiKey;
        this.baseUrl = baseUrl;
    }
    
    async createAgent(agentConfig: AgentConfig): Promise<ApiResponse> {
        return this.sendRequest('POST', '/agents', agentConfig);
    }
    
    async getAgent(agentId: string): Promise<ApiResponse> {
        return this.sendRequest('GET', `/agents/${agentId}`);
    }
    
    async executeWorkflow(workflowId: string, params: WorkflowParams): Promise<ApiResponse> {
        return this.sendRequest('POST', `/workflows/${workflowId}/execute`, params);
    }
    
    private async sendRequest(method: string, path: string, body?: any): Promise<ApiResponse> {
        const url = `${this.baseUrl}${path}`;
        const options: RequestInit = {
            method,
            headers: {
                'Authorization': `Bearer ${this.apiKey}`,
                'Content-Type': 'application/json'
            }
        };
        
        if (body) {
            options.body = JSON.stringify(body);
        }
        
        try {
            const response = await fetch(url, options);
            const data = await response.json();
            return { success: response.ok, data };
        } catch (error) {
            return { success: false, error: error.message };
        }
    }
}'''
            
            (src_dir / "index.ts").write_text(client_code)
            
            # Generate tsconfig.json
            tsconfig = '''{
    "compilerOptions": {
        "target": "ES2020",
        "module": "commonjs",
        "lib": ["ES2020"],
        "outDir": "./dist",
        "rootDir": "./src",
        "strict": true,
        "esModuleInterop": true,
        "skipLibCheck": true,
        "forceConsistentCasingInFileNames": true,
        "declaration": true,
        "declarationMap": true,
        "sourceMap": true
    },
    "include": ["src/**/*"],
    "exclude": ["node_modules", "dist"]
}'''
            
            (sdk_dir / "tsconfig.json").write_text(tsconfig)
            
            logger.info(f"Generated TypeScript SDK in {sdk_dir}")
            return True
            
        except Exception as e:
            logger.error(f"TypeScript SDK generation failed: {e}")
            return False
    
    def _load_api_specification(self) -> Dict[str, Any]:
        """Load API specification for SDK generation."""
        return {
            "version": "1.0.0",
            "endpoints": {
                "agents": {
                    "create": {"method": "POST", "path": "/agents"},
                    "get": {"method": "GET", "path": "/agents/{id}"},
                    "update": {"method": "PUT", "path": "/agents/{id}"},
                    "delete": {"method": "DELETE", "path": "/agents/{id}"}
                },
                "workflows": {
                    "execute": {"method": "POST", "path": "/workflows/{id}/execute"},
                    "get_status": {"method": "GET", "path": "/workflows/{id}/status"}
                }
            }
        }

class AgentScaffoldingEngine:
    """Generates agent development scaffolding and templates."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize agent scaffolding engine."""
        self.config = config
        self.templates: Dict[str, AgentTemplate] = {}
        self._initialize_templates()
    
    def _initialize_templates(self):
        """Initialize built-in agent templates."""
        # Basic Agent Template (Python)
        basic_agent_python = AgentTemplate(
            template_id=str(uuid.uuid4()),
            name="Basic Agent",
            description="Basic agent template with core functionality",
            template_type=TemplateType.BASIC_AGENT,
            language=SDKLanguage.PYTHON,
            files={
                "agent.py": '''"""Basic ACSO Agent Template"""
import asyncio
import logging
from acso_sdk import AcsoClient
from typing import Dict, Any

class BasicAgent:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.client = AcsoClient(config['api_key'])
        self.logger = logging.getLogger(__name__)
    
    async def initialize(self):
        """Initialize agent."""
        self.logger.info("Agent initializing...")
        # Add initialization logic here
    
    async def execute_task(self, task: Dict[str, Any]) -> Dict[str, Any]:
        """Execute a task."""
        self.logger.info(f"Executing task: {task.get('name')}")
        # Add task execution logic here
        return {"status": "completed", "result": "Task executed successfully"}
    
    async def shutdown(self):
        """Shutdown agent gracefully."""
        self.logger.info("Agent shutting down...")
        # Add cleanup logic here

if __name__ == "__main__":
    config = {
        "api_key": "your_api_key_here",
        "agent_name": "basic_agent"
    }
    
    agent = BasicAgent(config)
    asyncio.run(agent.initialize())''',
                "config.yaml": '''# Basic Agent Configuration
agent:
  name: "basic_agent"
  type: "basic"
  version: "1.0.0"

api:
  base_url: "https://api.acso.com"
  timeout: 30
  retry_attempts: 3

logging:
  level: "INFO"
  format: "%(asctime)s - %(name)s - %(levelname)s - %(message)s"''',
                "requirements.txt": '''acso-sdk>=1.0.0
pyyaml>=6.0
asyncio>=3.4.3'''
            },
            dependencies=["acso-sdk", "pyyaml", "asyncio"],
            documentation="Basic agent template for getting started with ACSO development"
        )
        
        self.templates[basic_agent_python.template_id] = basic_agent_python
        
        # Threat Detection Agent Template
        threat_detection_python = AgentTemplate(
            template_id=str(uuid.uuid4()),
            name="Threat Detection Agent",
            description="Specialized agent for threat detection and response",
            template_type=TemplateType.THREAT_DETECTION,
            language=SDKLanguage.PYTHON,
            files={
                "threat_agent.py": '''"""Threat Detection Agent Template"""
import asyncio
import logging
from acso_sdk import AcsoClient
from typing import Dict, Any, List

class ThreatDetectionAgent:
    def __init__(self, config: Dict[str, Any]):
        self.config = config
        self.client = AcsoClient(config['api_key'])
        self.logger = logging.getLogger(__name__)
        self.threat_indicators = []
    
    async def scan_for_threats(self, scan_config: Dict[str, Any]) -> List[Dict[str, Any]]:
        """Scan for security threats."""
        self.logger.info("Starting threat scan...")
        
        # Implement threat scanning logic
        threats = []
        
        # Example threat detection
        if scan_config.get('check_network_anomalies'):
            network_threats = await self._detect_network_anomalies()
            threats.extend(network_threats)
        
        if scan_config.get('check_file_integrity'):
            file_threats = await self._check_file_integrity()
            threats.extend(file_threats)
        
        return threats
    
    async def _detect_network_anomalies(self) -> List[Dict[str, Any]]:
        """Detect network anomalies."""
        # Implement network anomaly detection
        return []
    
    async def _check_file_integrity(self) -> List[Dict[str, Any]]:
        """Check file integrity."""
        # Implement file integrity checking
        return []
    
    async def respond_to_threat(self, threat: Dict[str, Any]) -> Dict[str, Any]:
        """Respond to detected threat."""
        self.logger.warning(f"Responding to threat: {threat.get('type')}")
        
        # Implement threat response logic
        response_actions = []
        
        if threat.get('severity') == 'high':
            response_actions.append('isolate_affected_systems')
            response_actions.append('notify_security_team')
        
        return {
            "threat_id": threat.get('id'),
            "actions_taken": response_actions,
            "status": "contained"
        }'''
            },
            dependencies=["acso-sdk", "scapy", "psutil"],
            documentation="Threat detection agent with automated response capabilities"
        )
        
        self.templates[threat_detection_python.template_id] = threat_detection_python
    
    async def generate_agent_scaffold(
        self,
        template_type: TemplateType,
        language: SDKLanguage,
        output_dir: str,
        agent_name: str
    ) -> bool:
        """Generate agent scaffolding from template."""
        try:
            # Find matching template
            template = None
            for t in self.templates.values():
                if t.template_type == template_type and t.language == language:
                    template = t
                    break
            
            if not template:
                logger.error(f"Template not found: {template_type} for {language}")
                return False
            
            # Create output directory
            agent_dir = Path(output_dir) / agent_name
            agent_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate files from template
            for filename, content in template.files.items():
                # Replace placeholders
                processed_content = content.replace("{{agent_name}}", agent_name)
                processed_content = processed_content.replace("{{template_name}}", template.name)
                
                (agent_dir / filename).write_text(processed_content)
            
            # Generate README
            readme_content = f'''# {agent_name}

{template.description}

## Installation

```bash
pip install -r requirements.txt
```

## Configuration

Edit `config.yaml` to configure your agent settings.

## Usage

```bash
python agent.py
```

## Documentation

{template.documentation}
'''
            
            (agent_dir / "README.md").write_text(readme_content)
            
            logger.info(f"Generated agent scaffold: {agent_name}")
            return True
            
        except Exception as e:
            logger.error(f"Agent scaffolding failed: {e}")
            return False

class ComprehensiveSDKFramework:
    """Main SDK framework coordinator."""
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize comprehensive SDK framework."""
        self.config = config
        self.sdk_generator = SDKGenerator(config)
        self.scaffolding_engine = AgentScaffoldingEngine(config)
        
        logger.info("Comprehensive SDK framework initialized")
    
    async def generate_all_sdks(self, output_dir: str) -> Dict[SDKLanguage, bool]:
        """Generate SDKs for all supported languages."""
        results = {}
        
        for language in SDKLanguage:
            try:
                success = await self.sdk_generator.generate_sdk(language, output_dir)
                results[language] = success
                logger.info(f"SDK generation for {language.value}: {'Success' if success else 'Failed'}")
            except Exception as e:
                logger.error(f"Failed to generate {language.value} SDK: {e}")
                results[language] = False
        
        return results
    
    async def create_agent_project(
        self,
        agent_name: str,
        template_type: TemplateType,
        language: SDKLanguage,
        output_dir: str
    ) -> bool:
        """Create a complete agent project from template."""
        try:
            success = await self.scaffolding_engine.generate_agent_scaffold(
                template_type=template_type,
                language=language,
                output_dir=output_dir,
                agent_name=agent_name
            )
            
            if success:
                logger.info(f"Created agent project: {agent_name}")
            
            return success
            
        except Exception as e:
            logger.error(f"Agent project creation failed: {e}")
            return False
    
    async def generate_documentation(self, output_dir: str) -> bool:
        """Generate comprehensive API documentation."""
        try:
            docs_dir = Path(output_dir) / "documentation"
            docs_dir.mkdir(parents=True, exist_ok=True)
            
            # Generate API reference
            api_docs = '''# ACSO Enterprise Framework API Reference

## Overview

The ACSO Enterprise Framework provides a comprehensive API for managing
autonomous agents, workflows, and enterprise integrations.

## Authentication

All API requests require authentication using an API key:

```
Authorization: Bearer YOUR_API_KEY
```

## Endpoints

### Agents

#### Create Agent
```
POST /agents
```

Create a new agent with the specified configuration.

#### Get Agent
```
GET /agents/{agent_id}
```

Retrieve information about a specific agent.

### Workflows

#### Execute Workflow
```
POST /workflows/{workflow_id}/execute
```

Execute a workflow with the provided parameters.

## SDKs

SDKs are available for the following languages:
- Python
- Java
- Go
- JavaScript/TypeScript

## Examples

### Python
```python
from acso_sdk import AcsoClient

async with AcsoClient("your_api_key") as client:
    agent = await client.create_agent({
        "name": "my_agent",
        "type": "threat_detection"
    })
    print(f"Created agent: {agent['id']}")
```

### JavaScript
```javascript
const AcsoClient = require('acso-sdk');

const client = new AcsoClient('your_api_key');
const agent = await client.createAgent({
    name: 'my_agent',
    type: 'threat_detection'
});
console.log(`Created agent: ${agent.id}`);
```
'''
            
            (docs_dir / "api_reference.md").write_text(api_docs)
            
            # Generate getting started guide
            getting_started = '''# Getting Started with ACSO Enterprise Framework

## Quick Start

1. **Get API Key**: Contact your administrator for an API key
2. **Install SDK**: Choose your preferred language SDK
3. **Create Agent**: Use templates to create your first agent
4. **Deploy**: Deploy your agent to the ACSO platform

## Installation

### Python
```bash
pip install acso-sdk
```

### Java
```xml
<dependency>
    <groupId>com.acso</groupId>
    <artifactId>acso-sdk</artifactId>
    <version>1.0.0</version>
</dependency>
```

### Go
```bash
go get github.com/acso/acso-go-sdk
```

### JavaScript
```bash
npm install acso-sdk
```

## Your First Agent

Follow these steps to create your first agent:

1. Choose a template type
2. Generate scaffolding
3. Customize agent logic
4. Test locally
5. Deploy to platform

## Support

- Documentation: https://docs.acso.com
- Community: https://community.acso.com
- Support: support@acso.com
'''
            
            (docs_dir / "getting_started.md").write_text(getting_started)
            
            logger.info(f"Generated documentation in {docs_dir}")
            return True
            
        except Exception as e:
            logger.error(f"Documentation generation failed: {e}")
            return False

# Example usage
if __name__ == "__main__":
    config = {
        'api_base_url': 'https://api.acso.com',
        'sdk_version': '1.0.0'
    }
    
    sdk_framework = ComprehensiveSDKFramework(config)
    
    async def example_usage():
        # Generate all SDKs
        results = await sdk_framework.generate_all_sdks('/tmp/acso-sdks')
        print(f"SDK Generation Results: {results}")
        
        # Create agent project
        success = await sdk_framework.create_agent_project(
            agent_name="my_threat_detector",
            template_type=TemplateType.THREAT_DETECTION,
            language=SDKLanguage.PYTHON,
            output_dir="/tmp/acso-agents"
        )
        print(f"Agent project created: {success}")
        
        # Generate documentation
        docs_success = await sdk_framework.generate_documentation('/tmp/acso-docs')
        print(f"Documentation generated: {docs_success}")
    
    asyncio.run(example_usage())