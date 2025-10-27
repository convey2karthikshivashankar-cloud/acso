# ACSO AWS Free Tier Demo Deployment Guide

## Overview

This guide provides step-by-step instructions to deploy the ACSO agentic AI demonstration system on AWS Free Tier with a $100 generative AI budget. The deployment showcases key agentic capabilities through interactive frontend demos backed by AWS Bedrock agents.

## Prerequisites

### Required Tools
- **AWS CLI** (v2.0+) - `aws --version`
- **Docker** (20.10+) - `docker --version`
- **Node.js** (18+) - `node --version`
- **Python** (3.8+) - `python --version`
- **Git** - `git --version`

### AWS Account Setup
1. **AWS Account** with Free Tier eligibility
2. **AWS CLI configured** with appropriate permissions
3. **$100 generative AI credits** allocated
4. **Region selection**: us-east-1 (recommended for Bedrock availability)

## Phase 1: Pre-Deployment Setup (15 minutes)

### Step 1.1: Verify AWS Configuration
```powershell
# Check AWS configuration
aws sts get-caller-identity
aws configure list

# Set region if not configured
aws configure set region us-east-1
```

### Step 1.2: Enable Required AWS Services
```powershell
# Enable Bedrock model access (one-time setup)
aws bedrock list-foundation-models --region us-east-1

# Request access to Claude 3 Haiku (cost-effective for demos)
# Go to AWS Console > Bedrock > Model Access > Request Access
```

### Step 1.3: Create Demo Environment Variables
```powershell
# Create .env file for demo deployment
cp .env.example .env.demo

# Edit .env.demo with your settings
$env:AWS_REGION="us-east-1"
$env:DEMO_STACK_NAME="acso-demo"
$env:BEDROCK_MODEL_ID="anthropic.claude-3-haiku-20240307-v1:0"
$env:DEMO_BUDGET_LIMIT="100"
```

## Phase 2: Build and Package (20 minutes)

### Step 2.1: Build Frontend Application
```powershell
# Navigate to frontend directory
cd frontend

# Install dependencies
npm install

# Build production bundle
npm run build

# Verify build
ls dist/
```

### Step 2.2: Package Backend Services
```powershell
# Return to root directory
cd ..

# Install Python dependencies
pip install -r requirements-api.txt

# Create deployment package
python scripts/create-deployment-package.py
```

### Step 2.3: Build Docker Images
```powershell
# Build API server image
docker build -t acso-api:demo -f Dockerfile .

# Build demo orchestrator image
docker build -t acso-demo:latest -f demo/Dockerfile.demo demo/

# Verify images
docker images | grep acso
```

## Phase 3: AWS Infrastructure Deployment (25 minutes)

### Step 3.1: Deploy Core Infrastructure
```powershell
# Deploy CloudFormation stack
aws cloudformation deploy `
  --template-file infrastructure/cloudformation/acso-demo-infrastructure.yaml `
  --stack-name acso-demo `
  --capabilities CAPABILITY_IAM `
  --parameter-overrides `
    Environment=demo `
    BudgetLimit=100 `
    BedrockModelId=anthropic.claude-3-haiku-20240307-v1:0

# Wait for stack completion
aws cloudformation wait stack-create-complete --stack-name acso-demo
```

### Step 3.2: Deploy Application Services
```powershell
# Get infrastructure outputs
$VPC_ID = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='VPCId'].OutputValue" --output text
$SUBNET_IDS = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='SubnetIds'].OutputValue" --output text

# Deploy ECS services
aws ecs create-service `
  --cluster acso-demo-cluster `
  --service-name acso-api `
  --task-definition acso-api:1 `
  --desired-count 1 `
  --launch-type FARGATE `
  --network-configuration "awsvpcConfiguration={subnets=[$SUBNET_IDS],securityGroups=[sg-demo],assignPublicIp=ENABLED}"
```

### Step 3.3: Deploy Frontend to S3/CloudFront
```powershell
# Get S3 bucket name
$BUCKET_NAME = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text

# Upload frontend build
aws s3 sync frontend/dist/ s3://$BUCKET_NAME/ --delete

# Invalidate CloudFront cache
$DISTRIBUTION_ID = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"
```

## Phase 4: Configure Bedrock Agents (15 minutes)

### Step 4.1: Create Bedrock Agent for Threat Detection
```powershell
# Create threat detection agent
aws bedrock-agent create-agent `
  --agent-name "acso-threat-detector" `
  --foundation-model "anthropic.claude-3-haiku-20240307-v1:0" `
  --instruction "You are a cybersecurity threat detection agent. Analyze security events and identify potential threats." `
  --agent-resource-role-arn "arn:aws:iam::ACCOUNT:role/AmazonBedrockExecutionRoleForAgents_acso"

# Get agent ID
$THREAT_AGENT_ID = aws bedrock-agent list-agents --query "agentSummaries[?agentName=='acso-threat-detector'].agentId" --output text
```

### Step 4.2: Create Bedrock Agent for Incident Response
```powershell
# Create incident response agent
aws bedrock-agent create-agent `
  --agent-name "acso-incident-responder" `
  --foundation-model "anthropic.claude-3-haiku-20240307-v1:0" `
  --instruction "You are an incident response agent. Coordinate response actions and provide remediation recommendations." `
  --agent-resource-role-arn "arn:aws:iam::ACCOUNT:role/AmazonBedrockExecutionRoleForAgents_acso"

# Get agent ID
$INCIDENT_AGENT_ID = aws bedrock-agent list-agents --query "agentSummaries[?agentName=='acso-incident-responder'].agentId" --output text
```

### Step 4.3: Update Application Configuration
```powershell
# Update ECS task definition with agent IDs
aws ecs register-task-definition `
  --family acso-api `
  --task-role-arn "arn:aws:iam::ACCOUNT:role/ecsTaskRole" `
  --execution-role-arn "arn:aws:iam::ACCOUNT:role/ecsTaskExecutionRole" `
  --network-mode awsvpc `
  --requires-compatibilities FARGATE `
  --cpu 256 `
  --memory 512 `
  --container-definitions '[{
    "name": "acso-api",
    "image": "ACCOUNT.dkr.ecr.us-east-1.amazonaws.com/acso-api:demo",
    "environment": [
      {"name": "THREAT_AGENT_ID", "value": "'$THREAT_AGENT_ID'"},
      {"name": "INCIDENT_AGENT_ID", "value": "'$INCIDENT_AGENT_ID'"}
    ],
    "portMappings": [{"containerPort": 8000}]
  }]'
```

## Phase 5: Deploy and Test Demo Scenarios (20 minutes)

### Step 5.1: Deploy Demo Data and Scenarios
```powershell
# Run demo data generator
python demo/run_phase5_demo.py --setup-data

# Upload demo scenarios to S3
aws s3 cp demo/scenarios/ s3://$BUCKET_NAME/demo-data/ --recursive

# Trigger demo orchestrator
python demo/agentic_scenarios/demo_orchestrator.py --initialize
```

### Step 5.2: Verify Deployment Health
```powershell
# Check ECS service status
aws ecs describe-services --cluster acso-demo-cluster --services acso-api

# Check application health
$API_ENDPOINT = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='ApiEndpoint'].OutputValue" --output text
curl "$API_ENDPOINT/health"

# Check frontend availability
$FRONTEND_URL = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text
curl -I $FRONTEND_URL
```

### Step 5.3: Test Key Demo Scenarios
```powershell
# Test threat detection scenario
curl -X POST "$API_ENDPOINT/demo/threat-detection" -H "Content-Type: application/json" -d '{"scenario": "apt_attack"}'

# Test incident response scenario
curl -X POST "$API_ENDPOINT/demo/incident-response" -H "Content-Type: application/json" -d '{"incident_id": "demo-001"}'

# Test multi-agent coordination
curl -X POST "$API_ENDPOINT/demo/multi-agent" -H "Content-Type: application/json" -d '{"scenario": "coordinated_response"}'
```

## Phase 6: Demo Execution and Monitoring (Ongoing)

### Step 6.1: Access Demo Interface
1. **Frontend URL**: Open the CloudFront distribution URL
2. **Navigate to Demo Page**: Click "Agentic AI Demos" in navigation
3. **Select Scenario**: Choose from available demo scenarios
4. **Monitor Execution**: Watch real-time agent interactions

### Step 6.2: Key Demo Scenarios to Showcase

#### Scenario 1: Autonomous Threat Detection
- **Duration**: 3-5 minutes
- **Showcase**: AI agent analyzing network traffic, identifying APT patterns
- **Key Features**: Real-time analysis, threat scoring, automated alerting

#### Scenario 2: Intelligent Incident Response
- **Duration**: 5-7 minutes  
- **Showcase**: Multi-agent coordination for incident containment
- **Key Features**: Agent communication, decision-making, human approval workflows

#### Scenario 3: Financial Impact Analysis
- **Duration**: 2-3 minutes
- **Showcase**: Cost analysis and ROI calculations for security investments
- **Key Features**: Predictive modeling, budget optimization, executive reporting

### Step 6.3: Monitor Costs and Usage
```powershell
# Check current costs
aws ce get-cost-and-usage `
  --time-period Start=2024-01-01,End=2024-01-31 `
  --granularity MONTHLY `
  --metrics BlendedCost `
  --group-by Type=DIMENSION,Key=SERVICE

# Monitor Bedrock usage
aws bedrock get-model-invocation-logging-configuration

# Check budget alerts
aws budgets describe-budgets --account-id ACCOUNT_ID
```

## Phase 7: Customer Demo Preparation

### Step 7.1: Demo Script Preparation
1. **Opening** (2 min): ACSO overview and value proposition
2. **Threat Detection Demo** (5 min): Show autonomous threat identification
3. **Incident Response Demo** (7 min): Multi-agent coordination showcase
4. **Financial Analysis Demo** (3 min): ROI and cost optimization
5. **Q&A and Discussion** (8 min): Address customer questions

### Step 7.2: Demo Environment Validation
```powershell
# Run comprehensive health check
./scripts/health-check.ps1

# Validate all demo scenarios
./scripts/automated-verification.ps1

# Check performance metrics
./scripts/monitor-demo-costs.ps1
```

### Step 7.3: Backup and Recovery Preparation
```powershell
# Create demo state backup
aws s3 sync s3://$BUCKET_NAME/demo-data/ ./demo-backup/

# Test rapid recovery
./scripts/quick-demo-deploy.ps1 --restore-from-backup
```

## Cost Optimization Tips

### Free Tier Resources Used
- **EC2**: t2.micro instances (750 hours/month free)
- **S3**: 5GB storage, 20,000 GET requests (free)
- **CloudFront**: 50GB data transfer (free)
- **Lambda**: 1M requests, 400,000 GB-seconds (free)

### Bedrock Cost Management ($100 budget)
- **Claude 3 Haiku**: ~$0.25 per 1K input tokens, ~$1.25 per 1K output tokens
- **Estimated Usage**: ~40,000 tokens per demo session
- **Cost per Demo**: ~$2-5 depending on complexity
- **Total Demos Possible**: 20-50 full demonstrations

### Cost Monitoring Commands
```powershell
# Set up cost alerts
aws budgets create-budget --account-id ACCOUNT_ID --budget file://budget-config.json

# Monitor real-time costs
aws ce get-dimension-values --dimension SERVICE --time-period Start=2024-01-01,End=2024-01-31
```

## Troubleshooting Guide

### Common Issues and Solutions

#### Issue 1: Bedrock Access Denied
```powershell
# Solution: Request model access in AWS Console
# Go to Bedrock > Model Access > Request Access for Claude 3 Haiku
```

#### Issue 2: ECS Task Fails to Start
```powershell
# Check task logs
aws logs describe-log-streams --log-group-name /ecs/acso-api
aws logs get-log-events --log-group-name /ecs/acso-api --log-stream-name STREAM_NAME
```

#### Issue 3: Frontend Not Loading
```powershell
# Check CloudFront distribution status
aws cloudfront get-distribution --id $DISTRIBUTION_ID

# Verify S3 bucket policy
aws s3api get-bucket-policy --bucket $BUCKET_NAME
```

#### Issue 4: High Costs
```powershell
# Check cost breakdown
aws ce get-cost-and-usage --time-period Start=2024-01-01,End=2024-01-31 --granularity DAILY --metrics BlendedCost

# Stop non-essential services
aws ecs update-service --cluster acso-demo-cluster --service acso-api --desired-count 0
```

## Cleanup Instructions

### Complete Environment Cleanup
```powershell
# Delete CloudFormation stack (removes most resources)
aws cloudformation delete-stack --stack-name acso-demo

# Delete Bedrock agents
aws bedrock-agent delete-agent --agent-id $THREAT_AGENT_ID
aws bedrock-agent delete-agent --agent-id $INCIDENT_AGENT_ID

# Empty and delete S3 bucket
aws s3 rm s3://$BUCKET_NAME --recursive
aws s3api delete-bucket --bucket $BUCKET_NAME

# Delete ECR repositories
aws ecr delete-repository --repository-name acso-api --force
aws ecr delete-repository --repository-name acso-demo --force
```

## Success Metrics

### Technical Metrics
- **Deployment Time**: < 60 minutes total
- **Demo Response Time**: < 2 seconds for UI interactions
- **Agent Response Time**: < 10 seconds for complex scenarios
- **Uptime**: > 99% during demo periods

### Business Metrics
- **Cost Efficiency**: Stay within $100 budget for 20+ demos
- **Demo Success Rate**: > 95% successful demo executions
- **Customer Engagement**: Interactive scenarios showcase agentic capabilities
- **Value Demonstration**: Clear ROI and operational benefits shown

## Next Steps

After successful demo deployment:
1. **Schedule Customer Demos**: Book demonstration sessions
2. **Gather Feedback**: Collect customer requirements and feedback
3. **Iterate on Scenarios**: Enhance demos based on customer interests
4. **Plan Production Deployment**: Use Phase 5 Production Readiness spec
5. **Scale Infrastructure**: Move to production-grade deployment when ready

This guide ensures you can successfully deploy and demonstrate ACSO's agentic AI capabilities within your budget constraints while providing a compelling customer experience.