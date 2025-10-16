# ACSO Deployment Guide for Amazon Bedrock AgentCore

## Overview

This guide provides comprehensive instructions for deploying the Autonomous Cyber-Security & Service Orchestrator (ACSO) system using Amazon Bedrock AgentCore runtime. ACSO is a multi-agent system designed for proactive IT management and security operations.

## Prerequisites

### AWS Account Requirements

- AWS Account with appropriate permissions
- Amazon Bedrock access enabled in your region
- Amazon Bedrock AgentCore access (preview/GA)
- ECS, ECR, CloudWatch, IAM, and VPC permissions

### Local Development Environment

- Python 3.11 or higher
- AWS CLI v2 configured
- Docker Desktop (for local testing)
- Git for version control

### Required AWS Services

- **Amazon Bedrock AgentCore**: Core runtime for agent execution
- **Amazon ECS**: Container orchestration
- **Amazon ECR**: Container registry
- **Amazon CloudWatch**: Logging and monitoring
- **AWS IAM**: Identity and access management
- **Amazon VPC**: Network isolation
- **AWS Systems Manager**: Remote management capabilities

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│                    Amazon Bedrock AgentCore                 │
├─────────────────────────────────────────────────────────────┤
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐        │
│  │ Supervisor  │  │   Threat    │  │  Incident   │        │
│  │   Agent     │  │   Hunter    │  │  Response   │        │
│  └─────────────┘  └─────────────┘  └─────────────┘        │
│                                                             │
│  ┌─────────────┐  ┌─────────────┐                         │
│  │  Service    │  │ Financial   │                         │
│  │Orchestration│  │Intelligence │                         │
│  └─────────────┘  └─────────────┘                         │
├─────────────────────────────────────────────────────────────┤
│                    Amazon ECS Fargate                      │
├─────────────────────────────────────────────────────────────┤
│              AWS Infrastructure (VPC, IAM, etc.)           │
└─────────────────────────────────────────────────────────────┘
```

## Pre-Deployment Setup

### 1. Enable Amazon Bedrock Services

```bash
# Check Bedrock availability in your region
aws bedrock list-foundation-models --region us-east-1

# Enable Bedrock AgentCore (if not already enabled)
# This may require AWS Support ticket for preview access
```

### 2. Configure AWS CLI

```bash
# Configure AWS credentials
aws configure

# Verify access
aws sts get-caller-identity
```

### 3. Set Environment Variables

```bash
export AWS_REGION=us-east-1
export ENVIRONMENT=development  # or staging, production
export PROJECT_NAME=acso
```

## Infrastructure Deployment

### Option 1: AWS CDK (Recommended)

```bash
# Install CDK if not already installed
npm install -g aws-cdk

# Navigate to CDK directory
cd infrastructure/cdk

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy infrastructure
cdk deploy AcsoStack --parameters Environment=development
```

### Option 2: CloudFormation

```bash
# Deploy using CloudFormation template
aws cloudformation create-stack \
  --stack-name acso-development-infrastructure \
  --template-body file://infrastructure/cloudformation/acso-infrastructure.yaml \
  --parameters ParameterKey=Environment,ParameterValue=development \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

### Option 3: Terraform

```bash
# Navigate to Terraform directory
cd infrastructure/terraform

# Initialize Terraform
terraform init

# Plan deployment
terraform plan -var="environment=development"

# Apply infrastructure
terraform apply -var="environment=development"
```

## Application Deployment

### 1. Build and Push Container Images

```bash
# Build all agent images
./scripts/build-images.sh

# Or build individual agents
docker build -t acso-supervisor --target supervisor-agent .
docker build -t acso-threat-hunter --target threat-hunter-agent .
# ... etc for other agents
```

### 2. Deploy to ECS

```bash
# Deploy using deployment script
ENVIRONMENT=development ./scripts/deploy-to-ecs.sh

# Check deployment status
./scripts/deploy-to-ecs.sh status
```

### 3. Verify Deployment

```bash
# Run smoke tests
python scripts/smoke-tests.py --environment development

# Check service health
aws ecs describe-services \
  --cluster acso-development-cluster \
  --services acso-development-supervisor
```

## Environment-Specific Deployments

### Development Environment

```bash
# Quick development deployment
git checkout develop
git push origin develop

# Manual deployment
ENVIRONMENT=development ./scripts/deploy-to-ecs.sh
```

### Staging Environment

```bash
# Deploy to staging
git checkout main
git push origin main

# Verify staging deployment
python scripts/integration-tests.py --environment staging
```

### Production Environment

```bash
# Create release for production deployment
git tag -a v1.0.0 -m "Release version 1.0.0"
git push origin v1.0.0

# Create GitHub release (triggers production deployment)
# Or manual deployment:
ENVIRONMENT=production VERSION=v1.0.0 ./scripts/deploy-to-ecs.sh

# Validate production deployment
python scripts/production-validation.py --environment production
```

## Configuration Management

### Environment Variables

Each agent requires the following environment variables:

```bash
# Core configuration
ENVIRONMENT=production
AWS_REGION=us-east-1
AGENT_TYPE=supervisor
AGENT_ID=supervisor-001

# Bedrock configuration
BEDROCK_AGENT_CORE_ENDPOINT=https://bedrock-agent-core.us-east-1.amazonaws.com
BEDROCK_MODEL_ID=anthropic.claude-3-sonnet-20240229-v1:0

# Logging configuration
LOG_LEVEL=INFO
CLOUDWATCH_LOG_GROUP=/aws/acso/production/agents
```

### Secrets Management

Sensitive configuration is managed through AWS Systems Manager Parameter Store:

```bash
# Store database credentials
aws ssm put-parameter \
  --name "/acso/production/database/password" \
  --value "your-secure-password" \
  --type "SecureString"

# Store API keys
aws ssm put-parameter \
  --name "/acso/production/external-api/key" \
  --value "your-api-key" \
  --type "SecureString"
```

## Monitoring Setup

### CloudWatch Configuration

```bash
# Create log groups
aws logs create-log-group \
  --log-group-name "/aws/acso/production/agents"

# Set retention policy
aws logs put-retention-policy \
  --log-group-name "/aws/acso/production/agents" \
  --retention-in-days 30
```

### Metrics and Alarms

```bash
# Create CPU utilization alarm
aws cloudwatch put-metric-alarm \
  --alarm-name "ACSO-HighCPU" \
  --alarm-description "High CPU utilization" \
  --metric-name CPUUtilization \
  --namespace AWS/ECS \
  --statistic Average \
  --period 300 \
  --threshold 80 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 2
```

## Security Configuration

### IAM Roles and Policies

The deployment creates several IAM roles:

- `acso-{environment}-execution-role`: ECS task execution
- `acso-{environment}-task-role`: Agent runtime permissions
- `acso-{environment}-bedrock-role`: Bedrock AgentCore access

### Network Security

```bash
# Verify security group configuration
aws ec2 describe-security-groups \
  --filters "Name=group-name,Values=acso-*"

# Check VPC configuration
aws ec2 describe-vpcs \
  --filters "Name=tag:Name,Values=acso-*-vpc"
```

## Scaling Configuration

### Auto Scaling

```bash
# Create auto scaling target
aws application-autoscaling register-scalable-target \
  --service-namespace ecs \
  --resource-id service/acso-production-cluster/acso-production-supervisor \
  --scalable-dimension ecs:service:DesiredCount \
  --min-capacity 2 \
  --max-capacity 10

# Create scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/acso-production-cluster/acso-production-supervisor \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name acso-supervisor-scaling-policy \
  --policy-type TargetTrackingScaling \
  --target-tracking-scaling-policy-configuration file://scaling-policy.json
```

## Backup and Recovery

### Data Backup

```bash
# Backup configuration
aws ssm get-parameters-by-path \
  --path "/acso/production" \
  --recursive > acso-config-backup.json

# Backup CloudWatch logs
aws logs create-export-task \
  --log-group-name "/aws/acso/production/agents" \
  --from 1640995200000 \
  --to 1641081600000 \
  --destination "acso-logs-backup-bucket"
```

### Disaster Recovery

```bash
# Create cross-region backup
aws s3 sync s3://acso-production-backups s3://acso-dr-backups --region us-west-2

# Deploy to DR region
AWS_REGION=us-west-2 ENVIRONMENT=production ./scripts/deploy-to-ecs.sh
```

## Troubleshooting Common Issues

### Deployment Failures

```bash
# Check ECS service events
aws ecs describe-services \
  --cluster acso-production-cluster \
  --services acso-production-supervisor \
  --query 'services[0].events'

# Check task definition
aws ecs describe-task-definition \
  --task-definition acso-production-supervisor
```

### Agent Communication Issues

```bash
# Check agent logs
aws logs filter-log-events \
  --log-group-name "/aws/acso/production/agents" \
  --filter-pattern "ERROR"

# Test Bedrock connectivity
aws bedrock-runtime invoke-model \
  --model-id anthropic.claude-3-sonnet-20240229-v1:0 \
  --body '{"prompt":"Hello","max_tokens":10}' \
  --content-type application/json \
  output.json
```

### Performance Issues

```bash
# Check resource utilization
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=acso-production-supervisor \
  --start-time 2024-01-01T00:00:00Z \
  --end-time 2024-01-01T01:00:00Z \
  --period 300 \
  --statistics Average
```

## Maintenance Procedures

### Regular Maintenance

1. **Weekly**: Review CloudWatch logs and metrics
2. **Monthly**: Update container images and dependencies
3. **Quarterly**: Review and update IAM policies
4. **Annually**: Disaster recovery testing

### Updates and Patches

```bash
# Update application
git pull origin main
./scripts/deploy-to-ecs.sh

# Update infrastructure
cd infrastructure/cdk
cdk diff
cdk deploy
```

## Support and Escalation

### Log Collection

```bash
# Collect all relevant logs
./scripts/collect-logs.sh --environment production --hours 24

# Generate support bundle
./scripts/generate-support-bundle.sh
```

### Emergency Contacts

- **Development Team**: dev-team@company.com
- **AWS Support**: [AWS Support Case]
- **On-call Engineer**: [PagerDuty/Slack]

## Appendices

### A. Required AWS Permissions

See `docs/aws-permissions.md` for detailed IAM policy requirements.

### B. Network Architecture

See `docs/network-architecture.md` for VPC and security group details.

### C. Monitoring Dashboards

See `docs/monitoring-dashboards.md` for CloudWatch dashboard configurations.

---

*This deployment guide should be reviewed and updated with each major release of the ACSO system.*