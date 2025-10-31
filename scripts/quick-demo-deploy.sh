#!/bin/bash
# ACSO Quick Demo Deployment Script - Bash Version
# Automates the deployment of ACSO demo environment on AWS Free Tier

# Set default values
STACK_NAME="acso-demo"
REGION="us-east-1"
ENVIRONMENT="demo"
BUDGET_LIMIT=100
BEDROCK_MODEL="anthropic.claude-3-haiku-20240307-v1:0"
SKIP_BUILD=false
VERBOSE=false
RESTORE_FROM_BACKUP=false

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# Parse command line arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    --stack-name)
      STACK_NAME="$2"
      shift 2
      ;;
    --region)
      REGION="$2"
      shift 2
      ;;
    --environment)
      ENVIRONMENT="$2"
      shift 2
      ;;
    --budget-limit)
      BUDGET_LIMIT="$2"
      shift 2
      ;;
    --bedrock-model)
      BEDROCK_MODEL="$2"
      shift 2
      ;;
    --skip-build)
      SKIP_BUILD=true
      shift
      ;;
    --verbose)
      VERBOSE=true
      shift
      ;;
    --restore-from-backup)
      RESTORE_FROM_BACKUP=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --stack-name NAME        CloudFormation stack name (default: acso-demo)"
      echo "  --region REGION          AWS region (default: us-east-1)"
      echo "  --environment ENV        Environment name (default: demo)"
      echo "  --budget-limit AMOUNT    Budget limit in USD (default: 100)"
      echo "  --bedrock-model MODEL    Bedrock model ID (default: anthropic.claude-3-haiku-20240307-v1:0)"
      echo "  --skip-build             Skip frontend and backend build steps"
      echo "  --verbose                Enable verbose output"
      echo "  --restore-from-backup    Restore from backup"
      echo "  --help                   Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Logging functions
log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
}

log_step() {
    echo -e "${BLUE}🔧 $1${NC}"
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${NC}   $1${NC}"
    fi
}

# Error handling
set -e
trap 'log_error "Deployment failed at line $LINENO. Exit code: $?"' ERR

# Start deployment
echo -e "${GREEN}🚀 Starting ACSO Demo Deployment${NC}"
log_info "Stack Name: $STACK_NAME"
log_info "Region: $REGION"
log_info "Budget Limit: $BUDGET_LIMIT USD"

# Check if we're in the right directory
if [ ! -d "frontend" ] && [ ! -d "scripts" ] && [ ! -f "README.md" ]; then
    log_warning "It looks like you might not be in the project root directory."
    log_info "Please run this script from the ACSO project root directory:"
    log_info "  cd /path/to/acso"
    log_info "  ./scripts/quick-demo-deploy.sh"
fi

echo

# Function to check prerequisites
check_prerequisites() {
    log_step "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI v2.0+"
        exit 1
    fi
    local aws_version=$(aws --version 2>&1)
    log_verbose "AWS CLI: $aws_version"
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker not found. Please install Docker 20.10+"
        exit 1
    fi
    local docker_version=$(docker --version)
    log_verbose "Docker: $docker_version"
    
    # Check Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js not found. Please install Node.js 18+"
        exit 1
    fi
    local node_version=$(node --version)
    log_verbose "Node.js: $node_version"
    
    # Check Python (skip Windows Store Python)
    local python_cmd=""
    if command -v python3 &> /dev/null; then
        python_cmd="python3"
    elif command -v python &> /dev/null; then
        # Check if it's the Windows Store Python (which doesn't work properly)
        local python_path=$(which python 2>/dev/null || echo "")
        if [[ "$python_path" == *"WindowsApps"* ]]; then
            log_warning "Windows Store Python detected - this may cause issues"
            log_warning "Consider installing Python from python.org"
        else
            python_cmd="python"
        fi
    fi
    
    if [ -n "$python_cmd" ]; then
        local python_version=$($python_cmd --version 2>/dev/null || echo "Unknown")
        log_verbose "Python: $python_version"
    else
        log_warning "Python not found - some features may not work"
        log_warning "Install Python from python.org for full functionality"
    fi
    
    # Check AWS credentials
    log_verbose "Testing AWS credentials..."
    local identity_result
    if identity_result=$(aws sts get-caller-identity --output json 2>&1); then
        local arn=$(echo "$identity_result" | grep -o '"Arn":"[^"]*' | cut -d'"' -f4)
        log_success "AWS Identity: $arn"
    else
        log_error "AWS credentials not configured properly"
        log_error "Error: $identity_result"
        log_info "Please run 'aws configure' and ensure your credentials are valid"
        log_info "You may also need to set AWS_PROFILE if using named profiles"
        exit 1
    fi
    
    log_success "All prerequisites met"
}

# Function to build frontend
build_frontend() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "Skipping frontend build"
        return
    fi
    
    log_step "Building frontend application..."
    
    # Check if we're in the right directory
    local frontend_path=""
    if [ -d "frontend" ]; then
        frontend_path="frontend"
    elif [ -d "../frontend" ]; then
        frontend_path="../frontend"
    elif [ -f "package.json" ] && grep -q "acso-frontend" package.json 2>/dev/null; then
        # We're already in the frontend directory
        frontend_path="."
    else
        log_error "Frontend directory not found. Please run this script from the project root directory."
        log_info "Expected directory structure:"
        log_info "  project-root/"
        log_info "  ├── frontend/"
        log_info "  ├── scripts/"
        log_info "  └── ..."
        exit 1
    fi
    
    local original_dir=$(pwd)
    cd "$frontend_path"
    
    # Check if package.json exists
    if [ ! -f "package.json" ]; then
        log_error "package.json not found in frontend directory"
        cd "$original_dir"
        exit 1
    fi
    
    # Install dependencies
    log_verbose "Installing npm dependencies..."
    if ! npm install --silent; then
        log_error "Failed to install npm dependencies"
        cd "$original_dir"
        exit 1
    fi
    
    # Build production bundle
    log_verbose "Building production bundle..."
    if ! npm run build; then
        log_error "Frontend build failed"
        cd "$original_dir"
        exit 1
    fi
    
    # Verify build
    if [ ! -d "dist" ]; then
        log_error "Frontend build failed - dist directory not found"
        cd "$original_dir"
        exit 1
    fi
    
    cd "$original_dir"
    log_success "Frontend build completed"
}

# Function to build backend
build_backend() {
    if [ "$SKIP_BUILD" = true ]; then
        log_warning "Skipping backend build"
        return
    fi
    
    log_step "Building backend services..."
    
    # Install Python dependencies
    log_verbose "Installing Python dependencies..."
    local python_cmd="python"
    if command -v python3 &> /dev/null; then
        python_cmd="python3"
    fi
    
    local pip_cmd="pip"
    if command -v pip3 &> /dev/null; then
        pip_cmd="pip3"
    fi
    
    if [ -f "requirements-api.txt" ]; then
        $pip_cmd install -r requirements-api.txt --quiet
    fi
    
    # Build Docker images if Docker is available
    if command -v docker &> /dev/null; then
        log_verbose "Building Docker images..."
        if [ -f "Dockerfile" ]; then
            docker build -t acso-api:demo -f Dockerfile . --quiet
        fi
        if [ -f "demo/Dockerfile.demo" ]; then
            docker build -t acso-demo:latest -f demo/Dockerfile.demo demo/ --quiet
        fi
    fi
    
    log_success "Backend build completed"
}

# Function to create CloudFormation template
create_cloudformation_template() {
    local template_path="infrastructure/cloudformation/acso-demo-infrastructure.yaml"
    
    if [ -f "$template_path" ]; then
        log_verbose "CloudFormation template already exists"
        return
    fi
    
    log_verbose "Creating minimal CloudFormation template..."
    mkdir -p "infrastructure/cloudformation"
    
    cat > "$template_path" << 'EOF'
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
      BucketName: !Sub 'acso-demo-frontend-${AWS::AccountId}'
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
            Resource: !Sub '${FrontendBucket}/*'

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
      RoleName: !Sub 'AmazonBedrockExecutionRoleForAgents_${Environment}'
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
        BudgetName: !Sub 'ACSO-Demo-Budget-${Environment}'
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
    Value: !Sub 'https://${CloudFrontDistribution.DomainName}'
    Export:
      Name: !Sub '${AWS::StackName}-FrontendUrl'
  
  S3BucketName:
    Description: S3 bucket name for frontend
    Value: !Ref FrontendBucket
    Export:
      Name: !Sub '${AWS::StackName}-S3BucketName'
  
  CloudFrontDistributionId:
    Description: CloudFront distribution ID
    Value: !Ref CloudFrontDistribution
    Export:
      Name: !Sub '${AWS::StackName}-CloudFrontDistributionId'
  
  BedrockRoleArn:
    Description: Bedrock execution role ARN
    Value: !GetAtt BedrockExecutionRole.Arn
    Export:
      Name: !Sub '${AWS::StackName}-BedrockRoleArn'
EOF
}

# Function to deploy infrastructure
deploy_infrastructure() {
    log_step "Deploying AWS infrastructure..."
    
    create_cloudformation_template
    
    local template_path="infrastructure/cloudformation/acso-demo-infrastructure.yaml"
    
    # Deploy CloudFormation stack
    log_verbose "Deploying CloudFormation stack..."
    if ! aws cloudformation deploy \
        --template-file "$template_path" \
        --stack-name "$STACK_NAME" \
        --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM \
        --parameter-overrides \
            Environment="$ENVIRONMENT" \
            BudgetLimit="$BUDGET_LIMIT" \
            BedrockModelId="$BEDROCK_MODEL" \
        --region "$REGION"; then
        log_error "CloudFormation deployment failed"
        exit 1
    fi
    
    # Wait for stack completion
    log_verbose "Waiting for stack completion..."
    if ! aws cloudformation wait stack-deploy-complete --stack-name "$STACK_NAME" --region "$REGION"; then
        log_error "Stack deployment did not complete successfully"
        exit 1
    fi
    
    log_success "Infrastructure deployment completed"
}

# Function to deploy frontend
deploy_frontend() {
    log_step "Deploying frontend to S3/CloudFront..."
    
    # Get S3 bucket name from CloudFormation outputs
    local bucket_name
    bucket_name=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
        --output text \
        --region "$REGION")
    
    if [ -z "$bucket_name" ] || [ "$bucket_name" = "None" ]; then
        log_error "Could not retrieve S3 bucket name from CloudFormation stack"
        exit 1
    fi
    
    # Find the frontend dist directory
    local dist_path=""
    if [ -d "frontend/dist" ]; then
        dist_path="frontend/dist/"
    elif [ -d "../frontend/dist" ]; then
        dist_path="../frontend/dist/"
    elif [ -d "dist" ]; then
        dist_path="dist/"
    else
        log_error "Frontend dist directory not found. Please run the build step first."
        exit 1
    fi
    
    # Upload frontend build to S3
    log_verbose "Uploading frontend from $dist_path to S3 bucket: $bucket_name"
    if ! aws s3 sync "$dist_path" "s3://$bucket_name/" --delete --region "$REGION"; then
        log_error "Frontend upload to S3 failed"
        exit 1
    fi
    
    # Invalidate CloudFront cache
    local distribution_id
    distribution_id=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
        --output text \
        --region "$REGION")
    
    if [ -n "$distribution_id" ] && [ "$distribution_id" != "None" ]; then
        log_verbose "Invalidating CloudFront cache: $distribution_id"
        aws cloudfront create-invalidation --distribution-id "$distribution_id" --paths "/*" --region "$REGION" > /dev/null
    fi
    
    log_success "Frontend deployment completed"
}

# Function to setup Bedrock agents
setup_bedrock_agents() {
    log_step "Setting up Bedrock agents..."
    
    # Get Bedrock role ARN
    local role_arn
    role_arn=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='BedrockRoleArn'].OutputValue" \
        --output text \
        --region "$REGION")
    
    if [ -z "$role_arn" ] || [ "$role_arn" = "None" ]; then
        log_warning "Could not retrieve Bedrock role ARN, skipping agent setup"
        return
    fi
    
    # Create threat detection agent
    log_verbose "Creating threat detection agent..."
    local threat_agent_result
    if threat_agent_result=$(aws bedrock-agent create-agent \
        --agent-name "acso-threat-detector-$ENVIRONMENT" \
        --foundation-model "$BEDROCK_MODEL" \
        --instruction "You are a cybersecurity threat detection agent for the ACSO system. Analyze security events, network traffic, and system logs to identify potential threats, malware, and suspicious activities. Provide detailed threat assessments with risk scores and recommended actions." \
        --agent-resource-role-arn "$role_arn" \
        --region "$REGION" \
        --output json 2>/dev/null); then
        local threat_agent_id=$(echo "$threat_agent_result" | grep -o '"agentId":"[^"]*' | cut -d'"' -f4)
        log_success "Threat detection agent created: $threat_agent_id"
        export THREAT_AGENT_ID="$threat_agent_id"
    else
        log_warning "Failed to create threat detection agent"
    fi
    
    # Create incident response agent
    log_verbose "Creating incident response agent..."
    local incident_agent_result
    if incident_agent_result=$(aws bedrock-agent create-agent \
        --agent-name "acso-incident-responder-$ENVIRONMENT" \
        --foundation-model "$BEDROCK_MODEL" \
        --instruction "You are an incident response coordination agent for the ACSO system. Coordinate security incident response activities, manage containment procedures, communicate with stakeholders, and provide remediation recommendations. Work collaboratively with other agents to ensure comprehensive incident handling." \
        --agent-resource-role-arn "$role_arn" \
        --region "$REGION" \
        --output json 2>/dev/null); then
        local incident_agent_id=$(echo "$incident_agent_result" | grep -o '"agentId":"[^"]*' | cut -d'"' -f4)
        log_success "Incident response agent created: $incident_agent_id"
        export INCIDENT_AGENT_ID="$incident_agent_id"
    else
        log_warning "Failed to create incident response agent"
    fi
}

# Function to run health checks
run_health_checks() {
    log_step "Running deployment health checks..."
    
    # Get frontend URL
    local frontend_url
    frontend_url=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
        --output text \
        --region "$REGION")
    
    if [ -n "$frontend_url" ] && [ "$frontend_url" != "None" ]; then
        log_verbose "Testing frontend URL: $frontend_url"
        if curl -I "$frontend_url" --max-time 30 --silent --fail > /dev/null 2>&1; then
            log_success "Frontend is accessible"
        else
            log_warning "Frontend health check failed or still propagating"
        fi
    fi
    
    # List Bedrock agents
    local agents_result
    if agents_result=$(aws bedrock-agent list-agents --region "$REGION" --output json 2>/dev/null); then
        local demo_agents_count
        demo_agents_count=$(echo "$agents_result" | grep -c "$ENVIRONMENT" || echo "0")
        log_success "Found $demo_agents_count Bedrock agents"
    else
        log_warning "Could not list Bedrock agents"
    fi
}

# Function to display deployment summary
show_deployment_summary() {
    echo
    log_success "ACSO Demo Deployment Complete!"
    echo "================================="
    
    # Get outputs from CloudFormation
    local outputs
    if outputs=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs" \
        --output json \
        --region "$REGION" 2>/dev/null); then
        
        echo "$outputs" | grep -o '"OutputKey":"[^"]*".*"OutputValue":"[^"]*"' | while read -r line; do
            local key=$(echo "$line" | grep -o '"OutputKey":"[^"]*' | cut -d'"' -f4)
            local value=$(echo "$line" | grep -o '"OutputValue":"[^"]*' | cut -d'"' -f4)
            echo -e "${CYAN}$key: $value${NC}"
        done
    else
        log_warning "Could not retrieve CloudFormation outputs"
    fi
    
    echo
    log_info "Next Steps:"
    echo "1. Access the demo at the Frontend URL above"
    echo "2. Navigate to 'Agentic AI Demos' section"
    echo "3. Try the threat detection and incident response scenarios"
    echo "4. Monitor costs using: ./scripts/monitor-demo-costs.sh"
    echo "5. Run health checks using: ./scripts/health-check.sh"
    
    echo
    log_info "Cost Management:"
    echo "- Budget limit set to: $BUDGET_LIMIT USD"
    echo "- Monitor usage in AWS Cost Explorer"
    echo "- Each demo session costs approximately \$2-5"
}

# Main execution
main() {
    local start_time=$(date +%s)
    
    check_prerequisites
    build_frontend
    build_backend
    deploy_infrastructure
    deploy_frontend
    setup_bedrock_agents
    run_health_checks
    show_deployment_summary
    
    local end_time=$(date +%s)
    local duration=$((end_time - start_time))
    local minutes=$((duration / 60))
    local seconds=$((duration % 60))
    
    echo
    log_success "Total deployment time: ${minutes}m ${seconds}s"
}

# Run main function
main "$@"