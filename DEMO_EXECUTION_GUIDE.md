# ACSO Demo Execution Guide - Step by Step

## 🎯 Quick Start (30 minutes to live demo)

### Prerequisites Check (5 minutes)
```powershell
# 1. Verify all tools are installed
aws --version          # Should be 2.0+
docker --version       # Should be 20.10+
node --version         # Should be 18+
python --version       # Should be 3.8+

# 2. Check AWS credentials
aws sts get-caller-identity

# 3. Set region (important for Bedrock availability)
aws configure set region us-east-1
```

### One-Command Deployment (20 minutes)
```powershell
# Deploy everything with one command
./scripts/quick-demo-deploy.ps1 -Verbose

# If you encounter issues, run with specific parameters:
./scripts/quick-demo-deploy.ps1 -StackName "acso-demo" -Region "us-east-1" -BudgetLimit 100 -Verbose
```

### Verification (5 minutes)
```powershell
# Check deployment health
./scripts/health-check.ps1

# Monitor initial costs
./scripts/monitor-demo-costs.ps1

# Get demo URLs
aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs"
```

## 📋 Detailed Step-by-Step Process

### Phase 1: Environment Setup (10 minutes)

#### Step 1.1: AWS Account Preparation
```powershell
# Ensure you're in the correct region
$env:AWS_DEFAULT_REGION = "us-east-1"

# Check free tier eligibility
aws support describe-trusted-advisor-checks --language en --query "checks[?name=='Service Limits']"
```

#### Step 1.2: Enable Bedrock Access
1. **Go to AWS Console** → Bedrock → Model Access
2. **Request Access** to Claude 3 Haiku model
3. **Wait for approval** (usually instant for Haiku)
4. **Verify access**:
```powershell
aws bedrock list-foundation-models --region us-east-1 --query "modelSummaries[?modelId=='anthropic.claude-3-haiku-20240307-v1:0']"
```

#### Step 1.3: Project Setup
```powershell
# Ensure you're in the project root
cd C:\code\acso\acso

# Verify project structure
ls .kiro/specs/
ls frontend/
ls src/
ls demo/
```

### Phase 2: Build Process (15 minutes)

#### Step 2.1: Frontend Build
```powershell
cd frontend

# Install dependencies (first time only)
npm install

# Build for production
npm run build

# Verify build output
ls dist/
# Should see: index.html, assets/, etc.

cd ..
```

#### Step 2.2: Backend Preparation
```powershell
# Install Python dependencies
pip install -r requirements-api.txt

# Verify key dependencies
python -c "import boto3, fastapi, uvicorn; print('Dependencies OK')"
```

#### Step 2.3: Docker Images (Optional - for ECS deployment)
```powershell
# Build API image
docker build -t acso-api:demo -f Dockerfile .

# Build demo orchestrator image  
docker build -t acso-demo:latest -f demo/Dockerfile.demo demo/

# Verify images
docker images | grep acso
```

### Phase 3: AWS Infrastructure (15 minutes)

#### Step 3.1: Deploy Core Infrastructure
```powershell
# Deploy CloudFormation stack
aws cloudformation deploy `
  --template-file infrastructure/cloudformation/acso-demo-infrastructure.yaml `
  --stack-name acso-demo `
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
  --parameter-overrides `
    Environment=demo `
    BudgetLimit=100 `
    BedrockModelId=anthropic.claude-3-haiku-20240307-v1:0

# Monitor deployment progress
aws cloudformation describe-stack-events --stack-name acso-demo --query "StackEvents[0:5].[Timestamp,ResourceStatus,ResourceType,LogicalResourceId]" --output table
```

#### Step 3.2: Verify Infrastructure
```powershell
# Check stack status
aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].StackStatus"

# Get important outputs
aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text
aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text
```

### Phase 4: Application Deployment (10 minutes)

#### Step 4.1: Deploy Frontend
```powershell
# Get S3 bucket name
$BUCKET_NAME = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text

# Upload frontend files
aws s3 sync frontend/dist/ "s3://$BUCKET_NAME/" --delete

# Verify upload
aws s3 ls "s3://$BUCKET_NAME/" --recursive
```

#### Step 4.2: Configure CloudFront
```powershell
# Get CloudFront distribution ID
$DISTRIBUTION_ID = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" --output text

# Create cache invalidation
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

# Check invalidation status
aws cloudfront list-invalidations --distribution-id $DISTRIBUTION_ID
```

### Phase 5: Bedrock Agents Setup (10 minutes)

#### Step 5.1: Create Threat Detection Agent
```powershell
# Get Bedrock execution role ARN
$ROLE_ARN = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='BedrockRoleArn'].OutputValue" --output text

# Create threat detection agent
$THREAT_AGENT = aws bedrock-agent create-agent `
  --agent-name "acso-threat-detector-demo" `
  --foundation-model "anthropic.claude-3-haiku-20240307-v1:0" `
  --instruction "You are a cybersecurity threat detection agent for the ACSO system. Analyze security events, network traffic, and system logs to identify potential threats, malware, and suspicious activities. Provide detailed threat assessments with risk scores and recommended actions." `
  --agent-resource-role-arn $ROLE_ARN `
  --output json | ConvertFrom-Json

Write-Host "Threat Agent ID: $($THREAT_AGENT.agent.agentId)"
```

#### Step 5.2: Create Incident Response Agent
```powershell
# Create incident response agent
$INCIDENT_AGENT = aws bedrock-agent create-agent `
  --agent-name "acso-incident-responder-demo" `
  --foundation-model "anthropic.claude-3-haiku-20240307-v1:0" `
  --instruction "You are an incident response coordination agent for the ACSO system. Coordinate security incident response activities, manage containment procedures, communicate with stakeholders, and provide remediation recommendations. Work collaboratively with other agents to ensure comprehensive incident handling." `
  --agent-resource-role-arn $ROLE_ARN `
  --output json | ConvertFrom-Json

Write-Host "Incident Agent ID: $($INCIDENT_AGENT.agent.agentId)"
```

#### Step 5.3: Prepare and Alias Agents
```powershell
# Prepare agents (required before use)
aws bedrock-agent prepare-agent --agent-id $THREAT_AGENT.agent.agentId
aws bedrock-agent prepare-agent --agent-id $INCIDENT_AGENT.agent.agentId

# Create aliases for stable endpoints
aws bedrock-agent create-agent-alias --agent-id $THREAT_AGENT.agent.agentId --agent-alias-name "DRAFT"
aws bedrock-agent create-agent-alias --agent-id $INCIDENT_AGENT.agent.agentId --agent-alias-name "DRAFT"
```

### Phase 6: Demo Data Setup (5 minutes)

#### Step 6.1: Generate Demo Data
```powershell
# Run demo data generator
python demo/run_phase5_demo.py --setup-data

# Upload demo scenarios to S3
aws s3 cp demo/scenarios/ "s3://$BUCKET_NAME/demo-data/" --recursive

# Verify demo data
aws s3 ls "s3://$BUCKET_NAME/demo-data/" --recursive
```

#### Step 6.2: Initialize Demo Orchestrator
```powershell
# Set environment variables for demo
$env:THREAT_AGENT_ID = $THREAT_AGENT.agent.agentId
$env:INCIDENT_AGENT_ID = $INCIDENT_AGENT.agent.agentId
$env:AWS_REGION = "us-east-1"

# Initialize demo orchestrator
python demo/agentic_scenarios/demo_orchestrator.py --initialize
```

### Phase 7: Testing and Verification (10 minutes)

#### Step 7.1: Health Checks
```powershell
# Run comprehensive health check
./scripts/health-check.ps1

# Check specific components
$FRONTEND_URL = aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text

# Test frontend accessibility
curl -I $FRONTEND_URL

# Test if demo page loads
curl "$FRONTEND_URL/demo" -o demo-page.html
```

#### Step 7.2: Test Bedrock Agents
```powershell
# Test threat detection agent
aws bedrock-agent-runtime invoke-agent `
  --agent-id $THREAT_AGENT.agent.agentId `
  --agent-alias-id "DRAFT" `
  --session-id "test-session-1" `
  --input-text "Analyze this suspicious network activity: Multiple failed login attempts from IP 192.168.1.100" `
  --output-file threat-test-response.txt

# Check response
Get-Content threat-test-response.txt

# Test incident response agent
aws bedrock-agent-runtime invoke-agent `
  --agent-id $INCIDENT_AGENT.agent.agentId `
  --agent-alias-id "DRAFT" `
  --session-id "test-session-2" `
  --input-text "We have detected a potential data breach. What are the immediate containment steps?" `
  --output-file incident-test-response.txt

# Check response
Get-Content incident-test-response.txt
```

#### Step 7.3: Cost Verification
```powershell
# Check initial costs
./scripts/monitor-demo-costs.ps1 -ShowDetails

# Verify budget is set up
aws budgets describe-budgets --account-id $(aws sts get-caller-identity --query Account --output text)
```

## 🎬 Demo Execution

### Pre-Demo Checklist (5 minutes before customer)
```powershell
# 1. Verify all services are running
./scripts/health-check.ps1

# 2. Check costs are within budget
./scripts/monitor-demo-costs.ps1 -AlertsOnly

# 3. Test key demo scenarios
curl "$FRONTEND_URL/demo" -I

# 4. Have backup plan ready
./scripts/quick-demo-deploy.ps1 -RestoreFromBackup
```

### Demo Script (25 minutes total)

#### Opening (2 minutes)
1. **Navigate to frontend URL**
2. **Show ACSO dashboard overview**
3. **Explain agentic AI concept**

#### Scenario 1: Autonomous Threat Detection (8 minutes)
1. **Navigate to Demo → Threat Detection**
2. **Select "APT Attack Simulation"**
3. **Show real-time agent analysis**
4. **Highlight autonomous decision-making**
5. **Display threat scoring and recommendations**

#### Scenario 2: Multi-Agent Incident Response (10 minutes)
1. **Navigate to Demo → Incident Response**
2. **Trigger "Data Breach Scenario"**
3. **Show agent coordination**
4. **Demonstrate human-in-the-loop approval**
5. **Display automated containment actions**

#### Scenario 3: Financial Intelligence (5 minutes)
1. **Navigate to Demo → Financial Analysis**
2. **Show cost impact analysis**
3. **Display ROI calculations**
4. **Demonstrate budget optimization**

### Post-Demo Actions
```powershell
# 1. Check costs immediately after demo
./scripts/monitor-demo-costs.ps1

# 2. Clean up demo session data (optional)
aws s3 rm "s3://$BUCKET_NAME/demo-sessions/" --recursive

# 3. Scale down if not doing more demos
aws ecs update-service --cluster acso-demo-cluster --service acso-api --desired-count 0
```

## 🚨 Troubleshooting

### Common Issues and Quick Fixes

#### Issue: Frontend not loading
```powershell
# Check CloudFront distribution status
aws cloudfront get-distribution --id $DISTRIBUTION_ID --query "Distribution.Status"

# Force cache invalidation
aws cloudfront create-invalidation --distribution-id $DISTRIBUTION_ID --paths "/*"

# Check S3 bucket contents
aws s3 ls "s3://$BUCKET_NAME/" --recursive
```

#### Issue: Bedrock agents not responding
```powershell
# Check agent status
aws bedrock-agent get-agent --agent-id $THREAT_AGENT.agent.agentId --query "agent.agentStatus"

# Re-prepare agent if needed
aws bedrock-agent prepare-agent --agent-id $THREAT_AGENT.agent.agentId
```

#### Issue: High costs
```powershell
# Check detailed cost breakdown
./scripts/monitor-demo-costs.ps1 -ShowDetails

# Stop all services immediately
aws ecs update-service --cluster acso-demo-cluster --service acso-api --desired-count 0

# Delete expensive resources
aws bedrock-agent delete-agent --agent-id $THREAT_AGENT.agent.agentId
aws bedrock-agent delete-agent --agent-id $INCIDENT_AGENT.agent.agentId
```

#### Issue: Demo scenarios failing
```powershell
# Check demo orchestrator logs
python demo/agentic_scenarios/demo_orchestrator.py --check-health

# Regenerate demo data
python demo/run_phase5_demo.py --setup-data --force

# Reset demo state
aws s3 rm "s3://$BUCKET_NAME/demo-state/" --recursive
```

## 🧹 Cleanup After Demo

### Immediate Cleanup (keep infrastructure)
```powershell
# Scale down services
aws ecs update-service --cluster acso-demo-cluster --service acso-api --desired-count 0

# Delete Bedrock agents (main cost driver)
aws bedrock-agent delete-agent --agent-id $THREAT_AGENT.agent.agentId
aws bedrock-agent delete-agent --agent-id $INCIDENT_AGENT.agent.agentId

# Clear demo session data
aws s3 rm "s3://$BUCKET_NAME/demo-sessions/" --recursive
```

### Complete Cleanup (remove everything)
```powershell
# Delete entire CloudFormation stack
aws cloudformation delete-stack --stack-name acso-demo

# Wait for deletion to complete
aws cloudformation wait stack-delete-complete --stack-name acso-demo

# Verify cleanup
aws cloudformation describe-stacks --stack-name acso-demo
# Should return error: Stack does not exist
```

## 📊 Success Metrics

### Technical Success
- ✅ Deployment completes in < 60 minutes
- ✅ All health checks pass
- ✅ Demo scenarios execute successfully
- ✅ Response times < 10 seconds for agent interactions
- ✅ No service failures during demo

### Cost Success
- ✅ Total costs stay within $100 budget
- ✅ Cost per demo session < $5
- ✅ No unexpected cost spikes
- ✅ Budget alerts working correctly

### Demo Success
- ✅ Customer can see agentic AI in action
- ✅ Multi-agent coordination is visible
- ✅ Business value is clearly demonstrated
- ✅ Technical capabilities are showcased
- ✅ Questions are answered effectively

This guide ensures you can reliably deploy and demonstrate ACSO's agentic capabilities to customers while staying within budget and technical constraints.