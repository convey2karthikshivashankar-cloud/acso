#!/bin/bash

# ACSO ECS Deployment Script

set -e

# Configuration
PROJECT_NAME="acso"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-development}"
CLUSTER_NAME="${CLUSTER_NAME:-${PROJECT_NAME}-${ENVIRONMENT}-cluster}"
ECR_REGISTRY="${ECR_REGISTRY:-}"
VERSION="${VERSION:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Logging functions
log_info() {
    echo -e "${GREEN}[INFO]${NC} $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

log_debug() {
    echo -e "${BLUE}[DEBUG]${NC} $1"
}

# Check prerequisites
check_prerequisites() {
    log_info "Checking prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI is not installed. Please install it and try again."
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Please run 'aws configure' and try again."
        exit 1
    fi
    
    # Check jq
    if ! command -v jq &> /dev/null; then
        log_error "jq is not installed. Please install it and try again."
        exit 1
    fi
    
    log_info "Prerequisites check passed"
}

# Get ECR registry URL
get_ecr_registry() {
    if [ -z "$ECR_REGISTRY" ]; then
        local account_id=$(aws sts get-caller-identity --query Account --output text)
        ECR_REGISTRY="${account_id}.dkr.ecr.${AWS_REGION}.amazonaws.com"
        log_info "Using ECR registry: $ECR_REGISTRY"
    fi
}

# Create ECS task definitions
create_task_definitions() {
    log_info "Creating ECS task definitions..."
    
    local agents=("supervisor" "threat-hunter" "incident-response" "service-orchestration" "financial-intelligence")
    
    for agent in "${agents[@]}"; do
        log_info "Creating task definition for ${agent} agent..."
        
        # Create task definition JSON
        cat > "/tmp/${agent}-task-definition.json" << EOF
{
    "family": "${PROJECT_NAME}-${ENVIRONMENT}-${agent}",
    "networkMode": "awsvpc",
    "requiresCompatibilities": ["FARGATE"],
    "cpu": "512",
    "memory": "1024",
    "executionRoleArn": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/${PROJECT_NAME}-${ENVIRONMENT}-execution-role",
    "taskRoleArn": "arn:aws:iam::$(aws sts get-caller-identity --query Account --output text):role/${PROJECT_NAME}-${ENVIRONMENT}-execution-role",
    "containerDefinitions": [
        {
            "name": "${agent}-agent",
            "image": "${ECR_REGISTRY}/${PROJECT_NAME}-${agent}:${VERSION}",
            "essential": true,
            "portMappings": [
                {
                    "containerPort": 8000,
                    "protocol": "tcp"
                }
            ],
            "environment": [
                {
                    "name": "ENVIRONMENT",
                    "value": "${ENVIRONMENT}"
                },
                {
                    "name": "AWS_REGION",
                    "value": "${AWS_REGION}"
                },
                {
                    "name": "AGENT_TYPE",
                    "value": "${agent}"
                },
                {
                    "name": "AGENT_ID",
                    "value": "${agent}-001"
                }
            ],
            "logConfiguration": {
                "logDriver": "awslogs",
                "options": {
                    "awslogs-group": "/aws/${PROJECT_NAME}/${ENVIRONMENT}/agents",
                    "awslogs-region": "${AWS_REGION}",
                    "awslogs-stream-prefix": "${agent}"
                }
            },
            "healthCheck": {
                "command": [
                    "CMD-SHELL",
                    "curl -f http://localhost:8000/health || exit 1"
                ],
                "interval": 30,
                "timeout": 5,
                "retries": 3,
                "startPeriod": 60
            }
        }
    ]
}
EOF
        
        # Register task definition
        aws ecs register-task-definition \
            --cli-input-json "file:///tmp/${agent}-task-definition.json" \
            --region "$AWS_REGION" > /dev/null
        
        log_info "Task definition for ${agent} agent created successfully"
    done
}

# Create ECS services
create_services() {
    log_info "Creating ECS services..."
    
    # Get VPC and subnet information
    local vpc_id=$(aws ec2 describe-vpcs \
        --filters "Name=tag:Name,Values=${PROJECT_NAME}-${ENVIRONMENT}-vpc" \
        --query "Vpcs[0].VpcId" \
        --output text \
        --region "$AWS_REGION")
    
    local subnet_ids=$(aws ec2 describe-subnets \
        --filters "Name=vpc-id,Values=${vpc_id}" "Name=tag:Name,Values=*private*" \
        --query "Subnets[].SubnetId" \
        --output text \
        --region "$AWS_REGION")
    
    local security_group_id=$(aws ec2 describe-security-groups \
        --filters "Name=vpc-id,Values=${vpc_id}" "Name=group-name,Values=*${PROJECT_NAME}*" \
        --query "SecurityGroups[0].GroupId" \
        --output text \
        --region "$AWS_REGION")
    
    log_debug "VPC ID: $vpc_id"
    log_debug "Subnet IDs: $subnet_ids"
    log_debug "Security Group ID: $security_group_id"
    
    local agents=("supervisor" "threat-hunter" "incident-response" "service-orchestration" "financial-intelligence")
    
    for agent in "${agents[@]}"; do
        log_info "Creating service for ${agent} agent..."
        
        # Create service
        aws ecs create-service \
            --cluster "$CLUSTER_NAME" \
            --service-name "${PROJECT_NAME}-${ENVIRONMENT}-${agent}" \
            --task-definition "${PROJECT_NAME}-${ENVIRONMENT}-${agent}" \
            --desired-count 1 \
            --launch-type "FARGATE" \
            --network-configuration "awsvpcConfiguration={subnets=[${subnet_ids// /,}],securityGroups=[${security_group_id}],assignPublicIp=DISABLED}" \
            --region "$AWS_REGION" > /dev/null
        
        log_info "Service for ${agent} agent created successfully"
    done
}

# Update existing services
update_services() {
    log_info "Updating existing ECS services..."
    
    local agents=("supervisor" "threat-hunter" "incident-response" "service-orchestration" "financial-intelligence")
    
    for agent in "${agents[@]}"; do
        local service_name="${PROJECT_NAME}-${ENVIRONMENT}-${agent}"
        
        # Check if service exists
        if aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$service_name" \
            --region "$AWS_REGION" \
            --query "services[0].serviceName" \
            --output text 2>/dev/null | grep -q "$service_name"; then
            
            log_info "Updating service for ${agent} agent..."
            
            # Update service
            aws ecs update-service \
                --cluster "$CLUSTER_NAME" \
                --service "$service_name" \
                --task-definition "${PROJECT_NAME}-${ENVIRONMENT}-${agent}" \
                --region "$AWS_REGION" > /dev/null
            
            log_info "Service for ${agent} agent updated successfully"
        else
            log_warn "Service ${service_name} does not exist, skipping update"
        fi
    done
}

# Wait for services to be stable
wait_for_services() {
    log_info "Waiting for services to stabilize..."
    
    local agents=("supervisor" "threat-hunter" "incident-response" "service-orchestration" "financial-intelligence")
    
    for agent in "${agents[@]}"; do
        local service_name="${PROJECT_NAME}-${ENVIRONMENT}-${agent}"
        
        log_info "Waiting for ${agent} service to be stable..."
        
        aws ecs wait services-stable \
            --cluster "$CLUSTER_NAME" \
            --services "$service_name" \
            --region "$AWS_REGION"
        
        log_info "${agent} service is now stable"
    done
}

# Get service status
get_service_status() {
    log_info "Getting service status..."
    
    local agents=("supervisor" "threat-hunter" "incident-response" "service-orchestration" "financial-intelligence")
    
    echo -e "\n${BLUE}Service Status:${NC}"
    printf "%-25s %-15s %-10s %-10s\n" "SERVICE" "STATUS" "RUNNING" "DESIRED"
    printf "%-25s %-15s %-10s %-10s\n" "-------" "------" "-------" "-------"
    
    for agent in "${agents[@]}"; do
        local service_name="${PROJECT_NAME}-${ENVIRONMENT}-${agent}"
        
        local service_info=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$service_name" \
            --region "$AWS_REGION" \
            --query "services[0].[status,runningCount,desiredCount]" \
            --output text 2>/dev/null || echo "NOT_FOUND 0 0")
        
        read -r status running desired <<< "$service_info"
        
        printf "%-25s %-15s %-10s %-10s\n" "$service_name" "$status" "$running" "$desired"
    done
    
    echo ""
}

# Rollback deployment
rollback_deployment() {
    log_warn "Rolling back deployment..."
    
    local agents=("supervisor" "threat-hunter" "incident-response" "service-orchestration" "financial-intelligence")
    
    for agent in "${agents[@]}"; do
        local service_name="${PROJECT_NAME}-${ENVIRONMENT}-${agent}"
        
        # Get previous task definition
        local previous_task_def=$(aws ecs describe-services \
            --cluster "$CLUSTER_NAME" \
            --services "$service_name" \
            --region "$AWS_REGION" \
            --query "services[0].deployments[1].taskDefinition" \
            --output text 2>/dev/null)
        
        if [ "$previous_task_def" != "None" ] && [ -n "$previous_task_def" ]; then
            log_info "Rolling back ${agent} to previous task definition: $previous_task_def"
            
            aws ecs update-service \
                --cluster "$CLUSTER_NAME" \
                --service "$service_name" \
                --task-definition "$previous_task_def" \
                --region "$AWS_REGION" > /dev/null
        else
            log_warn "No previous task definition found for ${agent}, skipping rollback"
        fi
    done
    
    wait_for_services
    log_info "Rollback completed"
}

# Main deployment function
deploy() {
    log_info "Starting ACSO deployment to ECS..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Cluster: $CLUSTER_NAME"
    log_info "Version: $VERSION"
    
    check_prerequisites
    get_ecr_registry
    
    # Create task definitions
    create_task_definitions
    
    # Check if this is initial deployment or update
    if aws ecs describe-clusters --clusters "$CLUSTER_NAME" --region "$AWS_REGION" --query "clusters[0].clusterName" --output text 2>/dev/null | grep -q "$CLUSTER_NAME"; then
        log_info "Cluster exists, updating services..."
        update_services
    else
        log_error "Cluster $CLUSTER_NAME does not exist. Please create infrastructure first."
        exit 1
    fi
    
    # Wait for deployment to complete
    wait_for_services
    
    # Show final status
    get_service_status
    
    log_info "ACSO deployment completed successfully!"
}

# Help function
show_help() {
    cat << EOF
ACSO ECS Deployment Script

Usage: $0 [COMMAND] [OPTIONS]

Commands:
  deploy              Deploy ACSO to ECS (default)
  status              Show service status
  rollback            Rollback to previous deployment
  help                Show this help message

Environment Variables:
  AWS_REGION         AWS region (default: us-east-1)
  ENVIRONMENT        Environment (development/staging/production, default: development)
  CLUSTER_NAME       ECS cluster name (default: acso-{environment}-cluster)
  ECR_REGISTRY       ECR registry URL (auto-detected if not provided)
  VERSION            Image version to deploy (default: latest)

Examples:
  # Deploy to development
  ./scripts/deploy-to-ecs.sh

  # Deploy specific version to production
  ENVIRONMENT=production VERSION=v1.0.0 ./scripts/deploy-to-ecs.sh

  # Check deployment status
  ./scripts/deploy-to-ecs.sh status

  # Rollback deployment
  ./scripts/deploy-to-ecs.sh rollback
EOF
}

# Parse command line arguments
case "${1:-deploy}" in
    deploy)
        deploy
        ;;
    status)
        check_prerequisites
        get_service_status
        ;;
    rollback)
        check_prerequisites
        rollback_deployment
        ;;
    help|--help|-h)
        show_help
        ;;
    *)
        log_error "Unknown command: $1"
        show_help
        exit 1
        ;;
esac