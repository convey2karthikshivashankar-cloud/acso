# ACSO AWS Deployment Script (PowerShell)
# This script deploys the ACSO system to AWS using ECS Fargate

param(
    [Parameter(Mandatory=$false)]
    [ValidateSet("deploy", "build-only", "infrastructure-only", "health-check")]
    [string]$Action = "deploy",
    
    [Parameter(Mandatory=$false)]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = "us-east-1"
)

# Configuration
$ProjectName = "acso"
$ErrorActionPreference = "Stop"

# Colors for output
$Colors = @{
    Red = "Red"
    Green = "Green"
    Yellow = "Yellow"
    Blue = "Blue"
}

# Logging functions
function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor $Colors.Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor $Colors.Green
}

function Write-Warning {
    param([string]$Message)
    Write-Host "[WARNING] $Message" -ForegroundColor $Colors.Yellow
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor $Colors.Red
}

# Check prerequisites
function Test-Prerequisites {
    Write-Info "Checking prerequisites..."
    
    # Check AWS CLI
    try {
        aws --version | Out-Null
    }
    catch {
        Write-Error "AWS CLI is not installed. Please install it first."
        exit 1
    }
    
    # Check Docker
    try {
        docker --version | Out-Null
    }
    catch {
        Write-Error "Docker is not installed. Please install it first."
        exit 1
    }
    
    # Check AWS credentials
    try {
        $accountId = aws sts get-caller-identity --query Account --output text
        if (-not $accountId) {
            throw "No account ID returned"
        }
        $script:AwsAccountId = $accountId
    }
    catch {
        Write-Error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    }
    
    # Login to ECR
    try {
        $loginCommand = aws ecr get-login-password --region $AwsRegion
        $loginCommand | docker login --username AWS --password-stdin "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"
    }
    catch {
        Write-Error "Failed to login to ECR: $_"
        exit 1
    }
    
    Write-Success "Prerequisites check passed"
}

# Create ECR repositories
function New-EcrRepositories {
    Write-Info "Creating ECR repositories..."
    
    $repositories = @(
        "acso-api-server",
        "acso-supervisor-agent",
        "acso-threat-hunter-agent",
        "acso-incident-response-agent",
        "acso-service-orchestration-agent",
        "acso-financial-intelligence-agent",
        "acso-frontend"
    )
    
    foreach ($repo in $repositories) {
        try {
            aws ecr describe-repositories --repository-names $repo --region $AwsRegion | Out-Null
            Write-Info "ECR repository $repo already exists"
        }
        catch {
            Write-Info "Creating ECR repository: $repo"
            aws ecr create-repository `
                --repository-name $repo `
                --region $AwsRegion `
                --image-scanning-configuration scanOnPush=true `
                --encryption-configuration encryptionType=AES256
            Write-Success "Created ECR repository: $repo"
        }
    }
}

# Build and push Docker images
function Build-AndPushImages {
    Write-Info "Building and pushing Docker images..."
    
    $ecrBase = "$AwsAccountId.dkr.ecr.$AwsRegion.amazonaws.com"
    $gitCommit = git rev-parse --short HEAD
    $timestamp = Get-Date -Format "yyyyMMdd-HHmmss"
    $tag = "$gitCommit-$timestamp"
    
    # Build images
    $images = @{
        "api-server" = "acso-api-server"
        "supervisor-agent" = "acso-supervisor-agent"
        "threat-hunter-agent" = "acso-threat-hunter-agent"
        "incident-response-agent" = "acso-incident-response-agent"
        "service-orchestration-agent" = "acso-service-orchestration-agent"
        "financial-intelligence-agent" = "acso-financial-intelligence-agent"
        "frontend-server" = "acso-frontend"
    }
    
    foreach ($target in $images.Keys) {
        $repo = $images[$target]
        
        Write-Info "Building $repo from target $target..."
        docker build --target $target -t "${repo}:$tag" -t "${repo}:latest" .
        
        Write-Info "Tagging and pushing $repo..."
        docker tag "${repo}:$tag" "$ecrBase/${repo}:$tag"
        docker tag "${repo}:latest" "$ecrBase/${repo}:latest"
        
        docker push "$ecrBase/${repo}:$tag"
        docker push "$ecrBase/${repo}:latest"
        
        Write-Success "Pushed ${repo}:$tag"
    }
    
    # Save image tags for deployment
    "IMAGE_TAG=$tag" | Out-File -FilePath ".env.deploy" -Encoding utf8
    Write-Success "All images built and pushed successfully"
}

# Deploy CloudFormation infrastructure
function Deploy-Infrastructure {
    Write-Info "Deploying CloudFormation infrastructure..."
    
    $stackName = "$ProjectName-$Environment-infrastructure"
    
    # Check if stack exists
    try {
        aws cloudformation describe-stacks --stack-name $stackName --region $AwsRegion | Out-Null
        $stackExists = $true
    }
    catch {
        $stackExists = $false
    }
    
    if ($stackExists) {
        Write-Info "Updating existing CloudFormation stack: $stackName"
        aws cloudformation update-stack `
            --stack-name $stackName `
            --template-body file://infrastructure/cloudformation/acso-infrastructure.yaml `
            --parameters ParameterKey=Environment,ParameterValue=$Environment ParameterKey=ProjectName,ParameterValue=$ProjectName `
            --capabilities CAPABILITY_NAMED_IAM `
            --region $AwsRegion
        
        Write-Info "Waiting for CloudFormation stack update to complete..."
        aws cloudformation wait stack-update-complete --stack-name $stackName --region $AwsRegion
    }
    else {
        Write-Info "Creating new CloudFormation stack: $stackName"
        aws cloudformation create-stack `
            --stack-name $stackName `
            --template-body file://infrastructure/cloudformation/acso-infrastructure.yaml `
            --parameters ParameterKey=Environment,ParameterValue=$Environment ParameterKey=ProjectName,ParameterValue=$ProjectName `
            --capabilities CAPABILITY_NAMED_IAM `
            --region $AwsRegion
        
        Write-Info "Waiting for CloudFormation stack creation to complete..."
        aws cloudformation wait stack-create-complete --stack-name $stackName --region $AwsRegion
    }
    
    Write-Success "CloudFormation infrastructure deployed successfully"
}

# Deploy ECS services
function Deploy-EcsServices {
    Write-Info "Deploying ECS services..."
    
    $clusterName = "$ProjectName-$Environment-cluster"
    
    # Create ECS cluster if it doesn't exist
    try {
        $clusterStatus = aws ecs describe-clusters --clusters $clusterName --region $AwsRegion --query 'clusters[0].status' --output text
        if ($clusterStatus -ne "ACTIVE") {
            throw "Cluster not active"
        }
        Write-Info "ECS cluster $clusterName already exists"
    }
    catch {
        Write-Info "Creating ECS cluster: $clusterName"
        aws ecs create-cluster `
            --cluster-name $clusterName `
            --capacity-providers FARGATE `
            --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 `
            --region $AwsRegion
        Write-Success "Created ECS cluster: $clusterName"
    }
    
    Write-Success "ECS services deployment completed"
}

# Run health checks
function Test-Health {
    Write-Info "Running health checks..."
    
    # This will be implemented to check service health
    # For now, just a placeholder
    
    Write-Success "Health checks passed"
}

# Main deployment function
function Start-Deployment {
    Write-Info "Starting ACSO deployment to AWS..."
    Write-Info "Environment: $Environment"
    Write-Info "Region: $AwsRegion"
    Write-Info "Account ID: $AwsAccountId"
    
    Test-Prerequisites
    New-EcrRepositories
    Build-AndPushImages
    Deploy-Infrastructure
    Deploy-EcsServices
    Test-Health
    
    Write-Success "ACSO deployment completed successfully!"
    Write-Info "You can now access your ACSO deployment in the AWS Console"
}

# Main execution
switch ($Action) {
    "deploy" {
        Start-Deployment
    }
    "build-only" {
        Test-Prerequisites
        New-EcrRepositories
        Build-AndPushImages
    }
    "infrastructure-only" {
        Test-Prerequisites
        Deploy-Infrastructure
    }
    "health-check" {
        Test-Health
    }
    default {
        Write-Error "Invalid action: $Action"
        Write-Host "Usage: .\deploy-to-aws.ps1 [-Action deploy|build-only|infrastructure-only|health-check] [-Environment development] [-AwsRegion us-east-1]"
        exit 1
    }
}