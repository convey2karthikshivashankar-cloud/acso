# ACSO - Autonomous Cyber-Security & Service Orchestrator

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Python 3.8+](https://img.shields.io/badge/python-3.8+-blue.svg)](https://www.python.org/downloads/)
[![AWS](https://img.shields.io/badge/AWS-Bedrock%20AgentCore-orange.svg)](https://aws.amazon.com/bedrock/)

## Overview

ACSO is a multi-agent system designed to provide proactive IT management and security through coordinated AI agents. It transforms IT operations from reactive "firefighting" to proactive, intelligent automation using Amazon Bedrock AgentCore.

### Key Features

- **🛡️ Proactive Threat Hunting**: Autonomous detection and analysis of security threats
- **⚡ Incident Response**: Automated containment and response actions
- **🔧 Service Orchestration**: Intelligent IT service management and automation
- **💰 Financial Intelligence**: Cost optimization and revenue analysis
- **🤖 Multi-Agent Coordination**: Specialized AI agents working together seamlessly

## Architecture

ACSO implements a supervisor-agent pattern with five specialized agents:

1. **Supervisor Agent** - Orchestrates workflows and coordinates other agents
2. **Threat Hunter Agent** - Proactive threat detection and analysis
3. **Incident Response Agent** - Automated incident containment and response
4. **Service Orchestration Agent** - IT service management and automation
5. **Financial Intelligence Agent** - Cost optimization and financial analysis

## Quick Start

### Prerequisites

- Python 3.8 or higher
- AWS Account with Bedrock access
- Docker (for containerized deployment)

### Installation

1. **Clone the repository**
   ```bash
   git clone https://github.com/your-org/acso.git
   cd acso
   ```

2. **Install dependencies**
   ```bash
   pip install -r requirements.txt
   ```

3. **Configure AWS credentials**
   ```bash
   aws configure
   ```

4. **Set up configuration**
   ```bash
   cp config/settings.py.example config/settings.py
   # Edit config/settings.py with your specific settings
   ```

5. **Deploy infrastructure**
   ```bash
   # Using AWS CDK
   cd infrastructure/cdk
   cdk deploy

   # Or using CloudFormation
   aws cloudformation create-stack \
     --stack-name acso-infrastructure \
     --template-body file://infrastructure/cloudformation/acso-infrastructure.yaml
   ```

6. **Run the system**
   ```bash
   python -m src.main
   ```

### Docker Deployment

```bash
# Build the image
docker build -t acso:latest .

# Run with docker-compose
docker-compose up -d
```

## Documentation

Comprehensive documentation is available in the [`docs/`](docs/) directory:

- **[System Architecture](docs/system-architecture.md)** - Detailed system design and architecture
- **[Deployment Guide](docs/deployment-guide.md)** - Complete deployment instructions
- **[API Documentation](docs/api-documentation.md)** - REST API reference
- **[Integration Guide](docs/integration-guide.md)** - External system integration
- **[User Manuals](docs/user-manual-administration.md)** - Administration and monitoring guides
- **[Operational Runbooks](docs/operational-runbooks.md)** - Day-to-day operations procedures

## Demo

Experience ACSO's capabilities with the included demonstration scenarios:

```bash
cd demo
python run_demo.py --scenario threat_detection
```

Available demo scenarios:
- `threat_detection` - Threat hunting and analysis
- `incident_response` - Automated incident containment
- `service_orchestration` - IT service automation
- `financial_intelligence` - Cost optimization analysis
- `multi_agent_coordination` - Cross-agent workflow coordination

## Testing

Run the comprehensive test suite:

```bash
# Unit tests
pytest tests/

# Integration tests
python tests/integration/run_integration_tests.py

# Performance tests
python tests/performance/run_performance_tests.py
```

## Configuration

Key configuration options in `config/settings.py`:

```python
# AWS Configuration
AWS_REGION = "us-east-1"
BEDROCK_AGENT_CORE_ENDPOINT = "https://bedrock-agent-core.us-east-1.amazonaws.com"

# Agent Configuration
SUPERVISOR_AGENT_CONFIG = {
    "max_concurrent_workflows": 100,
    "decision_timeout_seconds": 30,
    "escalation_threshold": 0.7
}

# Security Configuration
ENCRYPTION_KEY_ID = "arn:aws:kms:us-east-1:123456789012:key/12345678-1234-1234-1234-123456789012"
```

## API Usage

ACSO provides a comprehensive REST API for integration:

```python
import requests

# Get agent status
response = requests.get(
    "https://api.acso.your-domain.com/v1/agents/status",
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)

# Create incident
incident = requests.post(
    "https://api.acso.your-domain.com/v1/incidents",
    json={
        "title": "Security Alert",
        "severity": "high",
        "description": "Suspicious activity detected"
    },
    headers={"Authorization": "Bearer YOUR_API_KEY"}
)
```

## Contributing

We welcome contributions! Please see our [Contributing Guidelines](CONTRIBUTING.md) for details.

### Development Setup

1. Fork the repository
2. Create a feature branch: `git checkout -b feature/amazing-feature`
3. Make your changes and add tests
4. Run the test suite: `pytest`
5. Commit your changes: `git commit -m 'Add amazing feature'`
6. Push to the branch: `git push origin feature/amazing-feature`
7. Open a Pull Request

## Deployment

### Production Deployment

For production deployment, use the provided infrastructure as code:

```bash
# AWS CDK (Recommended)
cd infrastructure/cdk
cdk deploy --profile production

# Terraform
cd infrastructure/terraform
terraform init
terraform plan
terraform apply
```

### CI/CD Pipeline

The project includes GitHub Actions workflows for automated testing and deployment:

- **CI Pipeline**: Runs tests, security scans, and builds containers
- **CD Pipeline**: Deploys to staging and production environments
- **Security Pipeline**: Performs vulnerability scanning and compliance checks

## Monitoring

ACSO includes comprehensive monitoring and observability:

- **CloudWatch Integration**: Metrics, logs, and alarms
- **Custom Dashboards**: Real-time system health and performance
- **Alerting**: Automated notifications for critical events
- **Audit Logging**: Complete audit trail for compliance

## Security

Security is built into every aspect of ACSO:

- **Encryption**: Data encrypted at rest and in transit
- **IAM Integration**: Fine-grained access control
- **Network Security**: VPC isolation and security groups
- **Compliance**: SOC 2, ISO 27001, and GDPR ready

## License

This project is licensed under the MIT License - see the [LICENSE](LICENSE) file for details.

## Support

- **Documentation**: [docs/](docs/)
- **Issues**: [GitHub Issues](https://github.com/your-org/acso/issues)
- **Discussions**: [GitHub Discussions](https://github.com/your-org/acso/discussions)

## Roadmap

- [ ] Enhanced ML models for threat detection
- [ ] Multi-region deployment support
- [ ] Advanced workflow orchestration
- [ ] Integration with additional security tools
- [ ] Mobile dashboard application

## Acknowledgments

- Built on [Amazon Bedrock AgentCore](https://aws.amazon.com/bedrock/)
- Inspired by modern DevSecOps practices
- Community feedback and contributions

---

**ACSO** - Transforming IT operations through intelligent automation.