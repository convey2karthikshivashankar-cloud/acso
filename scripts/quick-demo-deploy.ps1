# ACSO Quick Demo Deployment Script
# Automates the deployment of ACSO demo environment on AWS Free Tier

param(
    [string]$StackName = "acso-demo",
    [string]$Region = "us-east-1",
    [string]$Environment = "demo",
    [int]$BudgetLimit = 100,
    [string]$BedrockModel = "anthropic.claude-3-haiku-20240307-v1:0",
    [switch]$RestoreFromBackup,
    [switch]$SkipBuild,
    [switch]$Verbose
)

# Set error handling
$ErrorActionPreference = "Stop"

# Enable verbose output if requested
if ($Verbose) {
    $VerbosePreference = "Continue"
}

Write-Host "🚀 Starting ACSO Demo Deployment" -ForegroundColor Green
Write-Host "Stack Name: $StackName" -ForegroundColor Cyan
Write-Host "Region: $Region" -ForegroundColor Cyan
Write-Host "Budget Limit: $BudgetLimit USD" -ForegroundColor Cyan

# Function to check prerequisites
function Test-Prerequisites {
    Write-Host "🔍 Checking prerequisites..." -ForegroundColor Yellow
    
    # Check AWS CLI
    try {
        $awsVersion = aws --version 2>&1
        Write-Verbose "AWS CLI: $awsVersion"
    }
    catch {
        throw "AWS CLI not found. Please install AWS CLI v2.0+"
    }
    
    # Check Docker
    try {
        $dockerVersion = docker --version
        Write-Verbose "Docker: $dockerVersion"
    }
    catch {
        throw "Docker not found. Please install Docker 20.10+"
    }
    
    # Check Node.js
    try {
        $nodeVersion = node --version
        Write-Verbose "Node.js: $nodeVersion"
    }
    catch {
        throw "Node.js not found. Please install Node.js 18+"
    }
    
    # Check Python
    try {
        $pythonVersion = python --version
        Write-Verbose "Python: $pythonVersion"
    }
    catch {
        throw "Python not found. Please install Python 3.8+"
    }
    
    # Check AWS credentials
    try {
        $identity = aws sts get-caller-identity --output json | ConvertFrom-Json
        Write-Host "✅ AWS Identity: $($identity.Arn)" -ForegroundColor Green
    }
    catch {
        throw "AWS credentials not configured. Run 'aws configure'"
    }
    
    Write-Host "✅ All prerequisites met" -ForegroundColor Green
}

# Function to build frontend
function Build-Frontend {
    if ($SkipBuild) {
        Write-Host "⏭️ Skipping frontend build" -ForegroundColor Yellow
        return
    }
    
    Write-Host "🏗️ Building frontend application..." -ForegroundColor Yellow
    
    Push-Location frontend
    try {
        # Install dependencies
        Write-Verbose "Installing npm dependencies..."
        npm install --silent
        
        # Build production bundle
        Write-Verbose "Building production bundle..."
        npm run build
        
        # Verify build
        if (!(Test-Path "dist")) {
            throw "Frontend build failed - dist directory not found"
        }
        
        Write-Host "✅ Frontend build completed" -ForegroundColor Green
    }
    finally {
        Pop-Location
    }
}

# Function to build backend
function Build-Backend {
    if ($SkipBuild) {
        Write-Host "⏭️ Skipping backend build" -ForegroundColor Yellow
        return
    }
    
    Write-Host "🏗️ Building backend services..." -ForegroundColor Yellow
    
    # Install Python dependencies
    Write-Verbose "Installing Python dependencies..."
    pip install -r requirements-api.txt --quiet
    
    # Build Docker images
    Write-Verbose "Building Docker images..."
    docker build -t acso-api:demo -f Dockerfile . --quiet
    docker build -t acso-demo:latest -f demo/Dockerfile.demo demo/ --quiet
    
    Write-Host "✅ Backend build completed" -ForegroundColor Green
}

# Function to deploy infrastructure
function Deploy-Infrastructure {
    Write-Host "🏗️ Deploying AWS infrastructure..." -ForegroundColor Yellow
    
    # Check if CloudFormation template exists
    $templatePath = "infrastructure/cloudformation/acso-demo-infrastructure.yaml"
    if (!(Test-Path $templatePath)) {
        Write-Host "⚠️ CloudFormation template not found, creating minimal template..." -ForegroundColor Yellow
        New-Item -Path "infrastructure/cloudformation" -ItemType Directory -Force | Out-Null
        Create-MinimalCloudFormationTemplate -Path $templatePath
    }
    
    # Deploy CloudFormation stack
    Write-Verbose "Deploying CloudFormation stack..."
    aws cloudformation deploy `
        --template-file $templatePath `
        --stack-name $StackName `
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM `
        --parameter-overrides `
            Environment=$Environment `
            BudgetLimit=$BudgetLimit `
            BedrockModelId=$BedrockModel `
        --region $Region
    
    if ($LASTEXITCODE -ne 0) {
        throw "CloudFormation deployment failed"
    }
    
    # Wait for stack completion
    Write-Verbose "Waiting for stack completion..."
    aws cloudformation wait stack-deploy-complete --stack-name $StackName --region $Region
    
    Write-Host "✅ Infrastructure deployment completed" -ForegroundColor Green
}

# Function to create minimal CloudFormation template
function Create-MinimalCloudFormationTemplate {
    param([string]$Path)
    
    $template = @"
AWSTemplateFormatVersion: '2010-09-09'
Description: 'ACSO Demo Infrastructure - Minimal Free Tier Deployment'

Parameters:
  Environment:
    Type: String
    Default: demo
  BudgetLimit:
    Type: Number
    Default: 100
  BedrockModelId:
    Type: String
    Default: anthropic.claude-3-haiku-20240307-v1:0

Resources:
  # S3 Bucket for frontend hosting
  FrontendBucket:
    Type: AWS::S3::Bucket
    Properties:
      BucketName: !Sub 'acso-demo-frontend-\${AWS::AccountId}'
      WebsiteConfiguration:
        IndexDocument: index.html
        ErrorDocument: error.html
      PublicAccessBlockConfiguration:
        BlockPublicAcls: false
        BlockPublicPolicy: false
        IgnorePublicAcls: false
        RestrictPublicBuckets: false

  # S3 Bucket Policy
  FrontendBucketPolicy:
    Type: AWS::S3::BucketPolicy
    Properties:
      Bucket: !Ref FrontendBucket
      PolicyDocument:
        Statement:
          - Effect: Allow
            Principal: '*'
            Action: s3:GetObject
            Resource: !Sub '\${FrontendBucket}/*'

  # CloudFront Distribution
  CloudFrontDistribution:
    Type: AWS::CloudFront::Distribution
    Properties:
      DistributionConfig:
        Origins:
          - Id: S3Origin
            DomainName: !GetAtt FrontendBucket.DomainName
            S3OriginConfig:
              OriginAccessIdentity: ''
        DefaultCacheBehavior:
          TargetOriginId: S3Origin
          ViewerProtocolPolicy: redirect-to-https
          AllowedMethods: [GET, HEAD]
          CachedMethods: [GET, HEAD]
          ForwardedValues:
            QueryString: false
        Enabled: true
        DefaultRootObject: index.html

  # IAM Role for Bedrock
  BedrockExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub 'AmazonBedrockExecutionRoleForAgents_\${Environment}'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: bedrock.amazonaws.com
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/AmazonBedrockFullAccess

  # Budget for cost control
  DemoBudget:
    Type: AWS::Budgets::Budget
    Properties:
      Budget:
        BudgetName: !Sub 'ACSO-Demo-Budget-\${Environment}'
        BudgetLimit:
          Amount: !Ref BudgetLimit
          Unit: USD
        TimeUnit: MONTHLY
        BudgetType: COST
        CostFilters:
          TagKey:
            - Environment
          TagValue:
            - !Ref Environment

Outputs:
  FrontendUrl:
    Description: CloudFront distribution URL
    Value: !Sub 'https://\${CloudFrontDistribution.DomainName}'
    Export:
      Name: !Sub '\${AWS::StackName}-FrontendUrl'
  
  S3BucketName:
    Description: S3 bucket name for frontend
    Value: !Ref FrontendBucket
    Export:
      Name: !Sub '\${AWS::StackName}-S3BucketName'
  
  CloudFrontDistributionId:
    Description: CloudFront distribution ID
    Value: !Ref CloudFrontDistribution
    Export:
      Name: !Sub '\${AWS::StackName}-CloudFrontDistributionId'
  
  BedrockRoleArn:
    Description: Bedrock execution role ARN
    Value: !GetAtt BedrockExecutionRole.Arn
    Export:
      Name: !Sub '\${AWS::StackName}-BedrockRoleArn'
"@
    
    $template | Out-File -FilePath $Path -Encoding UTF8
}

# Function to deploy frontend
function Deploy-Frontend {
    Write-Host "🌐 Deploying frontend to S3/CloudFront..." -ForegroundColor Yellow
    
    # Get S3 bucket name from CloudFormation outputs
    $bucketName = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" `
        --output text `
        --region $Region
    
    if (!$bucketName -or $bucketName -eq "None") {
        throw "Could not retrieve S3 bucket name from CloudFormation stack"
    }
    
    # Upload frontend build to S3
    Write-Verbose "Uploading frontend to S3 bucket: $bucketName"
    aws s3 sync frontend/dist/ "s3://$bucketName/" --delete --region $Region
    
    if ($LASTEXITCODE -ne 0) {
        throw "Frontend upload to S3 failed"
    }
    
    # Invalidate CloudFront cache
    $distributionId = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" `
        --output text `
        --region $Region
    
    if ($distributionId -and $distributionId -ne "None") {
        Write-Verbose "Invalidating CloudFront cache: $distributionId"
        aws cloudfront create-invalidation --distribution-id $distributionId --paths "/*" --region $Region | Out-Null
    }
    
    Write-Host "✅ Frontend deployment completed" -ForegroundColor Green
}

# Function to setup Bedrock agents
function Setup-BedrockAgents {
    Write-Host "🤖 Setting up Bedrock agents..." -ForegroundColor Yellow
    
    # Get Bedrock role ARN
    $roleArn = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='BedrockRoleArn'].OutputValue" `
        --output text `
        --region $Region
    
    if (!$roleArn -or $roleArn -eq "None") {
        Write-Warning "Could not retrieve Bedrock role ARN, skipping agent setup"
        return
    }
    
    # Create threat detection agent
    Write-Verbose "Creating threat detection agent..."
    try {
        $threatAgent = aws bedrock-agent create-agent `
            --agent-name "acso-threat-detector-$Environment" `
            --foundation-model $BedrockModel `
            --instruction "You are a cybersecurity threat detection agent for the ACSO system. Analyze security events, network traffic, and system logs to identify potential threats, malware, and suspicious activities. Provide detailed threat assessments with risk scores and recommended actions." `
            --agent-resource-role-arn $roleArn `
            --region $Region `
            --output json | ConvertFrom-Json
        
        Write-Host "✅ Threat detection agent created: $($threatAgent.agent.agentId)" -ForegroundColor Green
    }
    catch {
        Write-Warning "Failed to create threat detection agent: $_"
    }
    
    # Create incident response agent
    Write-Verbose "Creating incident response agent..."
    try {
        $incidentAgent = aws bedrock-agent create-agent `
            --agent-name "acso-incident-responder-$Environment" `
            --foundation-model $BedrockModel `
            --instruction "You are an incident response coordination agent for the ACSO system. Coordinate security incident response activities, manage containment procedures, communicate with stakeholders, and provide remediation recommendations. Work collaboratively with other agents to ensure comprehensive incident handling." `
            --agent-resource-role-arn $roleArn `
            --region $Region `
            --output json | ConvertFrom-Json
        
        Write-Host "✅ Incident response agent created: $($incidentAgent.agent.agentId)" -ForegroundColor Green
    }
    catch {
        Write-Warning "Failed to create incident response agent: $_"
    }
}

# Function to run health checks
function Test-Deployment {
    Write-Host "🔍 Running deployment health checks..." -ForegroundColor Yellow
    
    # Get frontend URL
    $frontendUrl = aws cloudformation describe-stacks `
        --stack-name $StackName `
        --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" `
        --output text `
        --region $Region
    
    if ($frontendUrl -and $frontendUrl -ne "None") {
        Write-Verbose "Testing frontend URL: $frontendUrl"
        try {
            $response = Invoke-WebRequest -Uri $frontendUrl -Method Head -TimeoutSec 30
            if ($response.StatusCode -eq 200) {
                Write-Host "✅ Frontend is accessible" -ForegroundColor Green
            }
            else {
                Write-Warning "Frontend returned status code: $($response.StatusCode)"
            }
        }
        catch {
            Write-Warning "Frontend health check failed: $_"
        }
    }
    
    # List Bedrock agents
    try {
        $agents = aws bedrock-agent list-agents --region $Region --output json | ConvertFrom-Json
        $demoAgents = $agents.agentSummaries | Where-Object { $_.agentName -like "*$Environment*" }
        Write-Host "✅ Found $($demoAgents.Count) Bedrock agents" -ForegroundColor Green
    }
    catch {
        Write-Warning "Could not list Bedrock agents: $_"
    }
}

# Function to display deployment summary
function Show-DeploymentSummary {
    Write-Host "`n🎉 ACSO Demo Deployment Complete!" -ForegroundColor Green
    Write-Host "=================================" -ForegroundColor Green
    
    # Get outputs from CloudFormation
    try {
        $outputs = aws cloudformation describe-stacks `
            --stack-name $StackName `
            --query "Stacks[0].Outputs" `
            --output json `
            --region $Region | ConvertFrom-Json
        
        foreach ($output in $outputs) {
            Write-Host "$($output.OutputKey): $($output.OutputValue)" -ForegroundColor Cyan
        }
    }
    catch {
        Write-Warning "Could not retrieve CloudFormation outputs"
    }
    
    Write-Host "`n📋 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Access the demo at the Frontend URL above" -ForegroundColor White
    Write-Host "2. Navigate to 'Agentic AI Demos' section" -ForegroundColor White
    Write-Host "3. Try the threat detection and incident response scenarios" -ForegroundColor White
    Write-Host "4. Monitor costs using: ./scripts/monitor-demo-costs.ps1" -ForegroundColor White
    Write-Host "5. Run health checks using: ./scripts/health-check.ps1" -ForegroundColor White
    
    Write-Host "`n💰 Cost Management:" -ForegroundColor Yellow
    Write-Host "- Budget limit set to: $BudgetLimit USD" -ForegroundColor White
    Write-Host "- Monitor usage in AWS Cost Explorer" -ForegroundColor White
    Write-Host "- Each demo session costs approximately $2-5" -ForegroundColor White
}

# Main execution
try {
    $startTime = Get-Date
    
    Test-Prerequisites
    Build-Frontend
    Build-Backend
    Deploy-Infrastructure
    Deploy-Frontend
    Setup-BedrockAgents
    Test-Deployment
    Show-DeploymentSummary
    
    $endTime = Get-Date
    $duration = $endTime - $startTime
    Write-Host "`n⏱️ Total deployment time: $($duration.ToString('mm\:ss'))" -ForegroundColor Green
}
catch {
    Write-Host "`n❌ Deployment failed: $_" -ForegroundColor Red
    Write-Host "Check the error details above and retry the deployment." -ForegroundColor Red
    exit 1
}