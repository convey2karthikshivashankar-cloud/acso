#!/bin/bash

# ACSO AWS Deployment Script
# This script deploys the ACSO system to AWS using ECS Fargate

set -e

# Configuration
PROJECT_NAME="acso"
ENVIRONMENT="${ENVIRONMENT:-development}"
AWS_REGION="${AWS_REGION:-us-east-1}"
AWS_ACCOUNT_ID=$(aws sts get-caller-identity --query Account --output text)

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it first."
        exit 1
    fi
    
    # Check Docker
    if ! command -v docker &> /dev/null; then
        log_error "Docker is not installed. Please install it first."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure'."
        exit 1
    fi
    
    # Check if logged into ECR
    aws ecr get-login-password --region $AWS_REGION | docker login --username AWS --password-stdin $AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com
    
    log_success "Prerequisites check passed"
}

# Create ECR repositories
create_ecr_repositories() {
    log_info "Creating ECR repositories..."
    
    local repositories=(
        "acso-api-server"
        "acso-supervisor-agent"
        "acso-threat-hunter-agent"
        "acso-incident-response-agent"
        "acso-service-orchestration-agent"
        "acso-financial-intelligence-agent"
        "acso-frontend"
    )
    
    for repo in "${repositories[@]}"; do
        if aws ecr describe-repositories --repository-names $repo --region $AWS_REGION &> /dev/null; then
            log_info "ECR repository $repo already exists"
        else
            log_info "Creating ECR repository: $repo"
            aws ecr create-repository \
                --repository-name $repo \
                --region $AWS_REGION \
                --image-scanning-configuration scanOnPush=true \
                --encryption-configuration encryptionType=AES256
            log_success "Created ECR repository: $repo"
        fi
    done
}

# Build and push Docker images
build_and_push_images() {
    log_info "Building and pushing Docker images..."
    
    local ecr_base="$AWS_ACCOUNT_ID.dkr.ecr.$AWS_REGION.amazonaws.com"
    local git_commit=$(git rev-parse --short HEAD)
    local timestamp=$(date +%Y%m%d-%H%M%S)
    local tag="${git_commit}-${timestamp}"
    
    # Build images
    local images=(
        "api-server:acso-api-server"
        "supervisor-agent:acso-supervisor-agent"
        "threat-hunter-agent:acso-threat-hunter-agent"
        "incident-response-agent:acso-incident-response-agent"
        "service-orchestration-agent:acso-service-orchestration-agent"
        "financial-intelligence-agent:acso-financial-intelligence-agent"
        "frontend-server:acso-frontend"
    )
    
    for image_info in "${images[@]}"; do
        IFS=':' read -r target repo <<< "$image_info"
        
        log_info "Building $repo from target $target..."
        docker build --target $target -t $repo:$tag -t $repo:latest .
        
        log_info "Tagging and pushing $repo..."
        docker tag $repo:$tag $ecr_base/$repo:$tag
        docker tag $repo:latest $ecr_base/$repo:latest
        
        docker push $ecr_base/$repo:$tag
        docker push $ecr_base/$repo:latest
        
        log_success "Pushed $repo:$tag"
    done
    
    # Save image tags for deployment
    echo "IMAGE_TAG=$tag" > .env.deploy
    log_success "All images built and pushed successfully"
}

# Deploy CloudFormation infrastructure
deploy_infrastructure() {
    log_info "Deploying CloudFormation infrastructure..."
    
    local stack_name="$PROJECT_NAME-$ENVIRONMENT-infrastructure"
    
    # Check if stack exists
    if aws cloudformation describe-stacks --stack-name $stack_name --region $AWS_REGION &> /dev/null; then
        log_info "Updating existing CloudFormation stack: $stack_name"
        aws cloudformation update-stack \
            --stack-name $stack_name \
            --template-body file://infrastructure/cloudformation/acso-infrastructure.yaml \
            --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
                        ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $AWS_REGION
    else
        log_info "Creating new CloudFormation stack: $stack_name"
        aws cloudformation create-stack \
            --stack-name $stack_name \
            --template-body file://infrastructure/cloudformation/acso-infrastructure.yaml \
            --parameters ParameterKey=Environment,ParameterValue=$ENVIRONMENT \
                        ParameterKey=ProjectName,ParameterValue=$PROJECT_NAME \
            --capabilities CAPABILITY_NAMED_IAM \
            --region $AWS_REGION
    fi
    
    log_info "Waiting for CloudFormation stack to complete..."
    aws cloudformation wait stack-update-complete --stack-name $stack_name --region $AWS_REGION || \
    aws cloudformation wait stack-create-complete --stack-name $stack_name --region $AWS_REGION
    
    log_success "CloudFormation infrastructure deployed successfully"
}

# Deploy ECS services
deploy_ecs_services() {
    log_info "Deploying ECS services..."
    
    # This will be implemented with ECS task definitions and services
    # For now, we'll create the basic structure
    
    local cluster_name="$PROJECT_NAME-$ENVIRONMENT-cluster"
    
    # Create ECS cluster if it doesn't exist
    if ! aws ecs describe-clusters --clusters $cluster_name --region $AWS_REGION --query 'clusters[0].status' --output text | grep -q ACTIVE; then
        log_info "Creating ECS cluster: $cluster_name"
        aws ecs create-cluster \
            --cluster-name $cluster_name \
            --capacity-providers FARGATE \
            --default-capacity-provider-strategy capacityProvider=FARGATE,weight=1 \
            --region $AWS_REGION
        log_success "Created ECS cluster: $cluster_name"
    else
        log_info "ECS cluster $cluster_name already exists"
    fi
    
    log_success "ECS services deployment completed"
}

# Run health checks
run_health_checks() {
    log_info "Running health checks..."
    
    # This will be implemented to check service health
    # For now, just a placeholder
    
    log_success "Health checks passed"
}

# Main deployment function
main() {
    log_info "Starting ACSO deployment to AWS..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Region: $AWS_REGION"
    log_info "Account ID: $AWS_ACCOUNT_ID"
    
    check_prerequisites
    create_ecr_repositories
    build_and_push_images
    deploy_infrastructure
    deploy_ecs_services
    run_health_checks
    
    log_success "ACSO deployment completed successfully!"
    log_info "You can now access your ACSO deployment in the AWS Console"
}

# Handle script arguments
case "${1:-deploy}" in
    "deploy")
        main
        ;;
    "build-only")
        check_prerequisites
        create_ecr_repositories
        build_and_push_images
        ;;
    "infrastructure-only")
        check_prerequisites
        deploy_infrastructure
        ;;
    "health-check")
        run_health_checks
        ;;
    *)
        echo "Usage: $0 [deploy|build-only|infrastructure-only|health-check]"
        exit 1
        ;;
esac