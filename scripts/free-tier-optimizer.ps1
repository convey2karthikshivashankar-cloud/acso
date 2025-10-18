# ACSO AWS Free Tier Optimizer
# This script optimizes the deployment for AWS Free Tier usage

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor Yellow
}

# Free Tier optimized CloudFormation template
function New-FreeTierTemplate {
    Write-Info "Creating Free Tier optimized CloudFormation template..."
    
    $freeTierTemplate = @"
AWSTemplateFormatVersion: '2010-09-09'
Description: 'ACSO Free Tier Optimized Infrastructure'

Parameters:
  Environment:
    Type: String
    Default: 'development'
  ProjectName:
    Type: String
    Default: 'acso'

Resources:
  # Minimal IAM Role
  ACSOExecutionRole:
    Type: AWS::IAM::Role
    Properties:
      RoleName: !Sub '`${ProjectName}-`${Environment}-role'
      AssumeRolePolicyDocument:
        Version: '2012-10-17'
        Statement:
          - Effect: Allow
            Principal:
              Service: [ecs-tasks.amazonaws.com, lambda.amazonaws.com]
            Action: sts:AssumeRole
      ManagedPolicyArns:
        - arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy
      Policies:
        - PolicyName: ACSOMinimalAccess
          PolicyDocument:
            Version: '2012-10-17'
            Statement:
              - Effect: Allow
                Action: [logs:*, cloudwatch:PutMetricData]
                Resource: '*'

  # CloudWatch Log Group (Free Tier: 5GB/month)
  ACSOLogGroup:
    Type: AWS::Logs::LogGroup
    Properties:
      LogGroupName: !Sub '/aws/`${ProjectName}/`${Environment}'
      RetentionInDays: 7

  # Default VPC usage (Free)
  ACSOSecurityGroup:
    Type: AWS::EC2::SecurityGroup
    Properties:
      GroupDescription: 'ACSO Security Group'
      SecurityGroupIngress:
        - IpProtocol: tcp
          FromPort: 80
          ToPort: 80
          CidrIp: 0.0.0.0/0
        - IpProtocol: tcp
          FromPort: 8000
          ToPort: 8000
          CidrIp: 0.0.0.0/0

Outputs:
  ExecutionRoleArn:
    Value: !GetAtt ACSOExecutionRole.Arn
  SecurityGroupId:
    Value: !Ref ACSOSecurityGroup
  LogGroupName:
    Value: !Ref ACSOLogGroup
"@

    $freeTierTemplate | Out-File -FilePath "infrastructure/cloudformation/acso-free-tier.yaml" -Encoding utf8
    Write-Success "Created Free Tier CloudFormation template"
}

# Free Tier optimized task definitions
function New-FreeTierTaskDefinitions {
    Write-Info "Creating Free Tier optimized ECS task definitions..."
    
    # Minimal API server task (Free Tier: 512 CPU units, 1GB memory)
    $apiTaskDef = @{
        family = "acso-api-free-tier"
        networkMode = "bridge"
        requiresCompatibilities = @("EC2")
        cpu = "256"
        memory = "512"
        executionRoleArn = "arn:aws:iam::`${AWS_ACCOUNT_ID}:role/acso-`${ENVIRONMENT}-role"
        containerDefinitions = @(
            @{
                name = "acso-api"
                image = "`${AWS_ACCOUNT_ID}.dkr.ecr.`${AWS_REGION}.amazonaws.com/acso-api-server:latest"
                portMappings = @(
                    @{
                        containerPort = 8000
                        hostPort = 8000
                        protocol = "tcp"
                    }
                )
                essential = $true
                memory = 512
                environment = @(
                    @{ name = "ENVIRONMENT"; value = "`${ENVIRONMENT}" }
                    @{ name = "AWS_REGION"; value = "`${AWS_REGION}" }
                )
                logConfiguration = @{
                    logDriver = "awslogs"
                    options = @{
                        "awslogs-group" = "/aws/acso/`${ENVIRONMENT}"
                        "awslogs-region" = "`${AWS_REGION}"
                        "awslogs-stream-prefix" = "api"
                    }
                }
            }
        )
    }
    
    $apiTaskDef | ConvertTo-Json -Depth 10 | Out-File -FilePath "infrastructure/ecs/task-definitions/api-free-tier.json" -Encoding utf8
    Write-Success "Created Free Tier API task definition"
}

# Free Tier deployment configuration
function New-FreeTierConfig {
    Write-Info "Creating Free Tier deployment configuration..."
    
    $freeTierConfig = @{
        free_tier = @{
            aws_region = "us-east-1"
            instance_type = "t2.micro"  # Free Tier eligible
            
            # Single instance deployment
            api_server = @{
                cpu = 256
                memory = 512
                desired_count = 1
            }
            
            # Combine all agents into single container to save resources
            combined_agents = @{
                cpu = 256
                memory = 512
                desired_count = 1
            }
            
            # Use SQLite instead of RDS (Free)
            database = @{
                type = "sqlite"
                file = "/app/data/acso.db"
            }
            
            # Use in-memory cache instead of Redis (Free)
            cache = @{
                type = "memory"
            }
            
            # Minimal monitoring
            monitoring = @{
                log_retention_days = 7
                enable_detailed_monitoring = $false
            }
        }
    }
    
    $freeTierConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath "config/free-tier.json" -Encoding utf8
    Write-Success "Created Free Tier configuration"
}

# Create combined agent Dockerfile for Free Tier
function New-CombinedAgentDockerfile {
    Write-Info "Creating combined agent Dockerfile for Free Tier..."
    
    $combinedDockerfile = @"
# Combined Agent Dockerfile for Free Tier
FROM python:3.11-slim as free-tier-combined

WORKDIR /app

# Install dependencies
COPY requirements-api.txt .
RUN pip install --no-cache-dir -r requirements-api.txt

# Copy source code
COPY src/ ./src/
COPY config/ ./config/

# Create data directory for SQLite
RUN mkdir -p /app/data

# Combined startup script
COPY scripts/start-combined-agents.py ./start-combined-agents.py

# Expose API port
EXPOSE 8000

# Start all services
CMD ["python", "start-combined-agents.py"]
"@

    $combinedDockerfile | Out-File -FilePath "Dockerfile.free-tier" -Encoding utf8
    Write-Success "Created combined agent Dockerfile"
}

# Create startup script for combined agents
function New-CombinedStartupScript {
    Write-Info "Creating combined agent startup script..."
    
    $startupScript = @"
#!/usr/bin/env python3
"""
Combined agent startup script for Free Tier deployment.
Runs all ACSO components in a single process to minimize resource usage.
"""

import asyncio
import threading
import time
import os
import sys
from concurrent.futures import ThreadPoolExecutor

# Add src to path
sys.path.append('/app/src')

def start_api_server():
    """Start the FastAPI server."""
    import uvicorn
    from api.main import app
    
    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8000,
        log_level="info"
    )

def start_supervisor_agent():
    """Start the supervisor agent."""
    try:
        from agents.supervisor_agent import SupervisorAgent
        agent = SupervisorAgent()
        asyncio.run(agent.run())
    except Exception as e:
        print(f"Supervisor agent error: {e}")

def start_threat_hunter():
    """Start the threat hunter agent."""
    try:
        from agents.threat_hunter_agent import ThreatHunterAgent
        agent = ThreatHunterAgent()
        asyncio.run(agent.run())
    except Exception as e:
        print(f"Threat hunter error: {e}")

def main():
    """Main function to start all services."""
    print("Starting ACSO Free Tier Combined Services...")
    
    # Set environment variables
    os.environ.setdefault('ENVIRONMENT', 'development')
    os.environ.setdefault('DATABASE_TYPE', 'sqlite')
    os.environ.setdefault('DATABASE_URL', 'sqlite:///app/data/acso.db')
    os.environ.setdefault('CACHE_TYPE', 'memory')
    
    # Create thread pool for running services
    with ThreadPoolExecutor(max_workers=4) as executor:
        # Start API server in main thread (required for uvicorn)
        api_future = executor.submit(start_api_server)
        
        # Start agents in separate threads
        supervisor_future = executor.submit(start_supervisor_agent)
        threat_hunter_future = executor.submit(start_threat_hunter)
        
        print("All services started. Press Ctrl+C to stop.")
        
        try:
            # Keep main thread alive
            while True:
                time.sleep(1)
        except KeyboardInterrupt:
            print("Shutting down services...")
            # Services will be terminated when the process exits

if __name__ == "__main__":
    main()
"@

    $startupScript | Out-File -FilePath "scripts/start-combined-agents.py" -Encoding utf8
    Write-Success "Created combined startup script"
}

# Create Free Tier deployment script
function New-FreeTierDeployScript {
    Write-Info "Creating Free Tier deployment script..."
    
    $deployScript = @"
# ACSO Free Tier Deployment Script
param(
    [Parameter(Mandatory=`$false)]
    [string]`$AwsRegion = "us-east-1"
)

`$ErrorActionPreference = "Stop"

Write-Host "Deploying ACSO to AWS Free Tier..." -ForegroundColor Green

# Get AWS account ID
`$accountId = aws sts get-caller-identity --query Account --output text

# Create ECR repository
Write-Host "Creating ECR repository..."
try {
    aws ecr create-repository --repository-name acso-free-tier --region `$AwsRegion
} catch {
    Write-Host "ECR repository may already exist"
}

# Login to ECR
Write-Host "Logging into ECR..."
aws ecr get-login-password --region `$AwsRegion | docker login --username AWS --password-stdin "`$accountId.dkr.ecr.`$AwsRegion.amazonaws.com"

# Build and push image
Write-Host "Building Docker image..."
docker build -f Dockerfile.free-tier -t acso-free-tier:latest .

Write-Host "Tagging and pushing image..."
docker tag acso-free-tier:latest "`$accountId.dkr.ecr.`$AwsRegion.amazonaws.com/acso-free-tier:latest"
docker push "`$accountId.dkr.ecr.`$AwsRegion.amazonaws.com/acso-free-tier:latest"

# Deploy CloudFormation stack
Write-Host "Deploying infrastructure..."
aws cloudformation deploy \
    --template-file infrastructure/cloudformation/acso-free-tier.yaml \
    --stack-name acso-free-tier \
    --capabilities CAPABILITY_NAMED_IAM \
    --region `$AwsRegion

Write-Host "ACSO Free Tier deployment completed!" -ForegroundColor Green
Write-Host "Note: This is a minimal deployment suitable for development and testing only."
"@

    $deployScript | Out-File -FilePath "scripts/deploy-free-tier.ps1" -Encoding utf8
    Write-Success "Created Free Tier deployment script"
}

# Main execution
Write-Info "Optimizing ACSO for AWS Free Tier..."
Write-Warning "This configuration is for development/testing only and has limited functionality."

New-FreeTierTemplate
New-FreeTierTaskDefinitions
New-FreeTierConfig
New-CombinedAgentDockerfile
New-CombinedStartupScript
New-FreeTierDeployScript

Write-Success "Free Tier optimization completed!"
Write-Info "Files created:"
Write-Info "  - infrastructure/cloudformation/acso-free-tier.yaml"
Write-Info "  - infrastructure/ecs/task-definitions/api-free-tier.json"
Write-Info "  - config/free-tier.json"
Write-Info "  - Dockerfile.free-tier"
Write-Info "  - scripts/start-combined-agents.py"
Write-Info "  - scripts/deploy-free-tier.ps1"
Write-Info ""
Write-Info "To deploy to Free Tier, run: .\scripts\deploy-free-tier.ps1"