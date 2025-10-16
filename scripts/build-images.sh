#!/bin/bash

# ACSO Docker Image Build Script

set -e

# Configuration
PROJECT_NAME="acso"
REGISTRY_URL="${ECR_REGISTRY_URL:-}"
AWS_REGION="${AWS_REGION:-us-east-1}"
ENVIRONMENT="${ENVIRONMENT:-development}"
VERSION="${VERSION:-latest}"

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
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

# Check if Docker is running
check_docker() {
    if ! docker info > /dev/null 2>&1; then
        log_error "Docker is not running. Please start Docker and try again."
        exit 1
    fi
    log_info "Docker is running"
}

# Build base image
build_base_image() {
    log_info "Building base ACSO image..."
    docker build \
        --target production \
        --tag "${PROJECT_NAME}:${VERSION}" \
        --tag "${PROJECT_NAME}:latest" \
        .
    log_info "Base image built successfully"
}

# Build agent-specific images
build_agent_images() {
    local agents=("supervisor" "threat-hunter" "incident-response" "service-orchestration" "financial-intelligence")
    
    for agent in "${agents[@]}"; do
        log_info "Building ${agent} agent image..."
        docker build \
            --target "${agent}-agent" \
            --tag "${PROJECT_NAME}-${agent}:${VERSION}" \
            --tag "${PROJECT_NAME}-${agent}:latest" \
            .
        log_info "${agent} agent image built successfully"
    done
}

# Tag images for registry
tag_for_registry() {
    if [ -z "$REGISTRY_URL" ]; then
        log_warn "No registry URL provided, skipping registry tagging"
        return
    fi
    
    log_info "Tagging images for registry: $REGISTRY_URL"
    
    # Tag base image
    docker tag "${PROJECT_NAME}:${VERSION}" "${REGISTRY_URL}/${PROJECT_NAME}:${VERSION}"
    docker tag "${PROJECT_NAME}:latest" "${REGISTRY_URL}/${PROJECT_NAME}:latest"
    
    # Tag agent images
    local agents=("supervisor" "threat-hunter" "incident-response" "service-orchestration" "financial-intelligence")
    
    for agent in "${agents[@]}"; do
        docker tag "${PROJECT_NAME}-${agent}:${VERSION}" "${REGISTRY_URL}/${PROJECT_NAME}-${agent}:${VERSION}"
        docker tag "${PROJECT_NAME}-${agent}:latest" "${REGISTRY_URL}/${PROJECT_NAME}-${agent}:latest"
    done
    
    log_info "Images tagged for registry"
}

# Push images to registry
push_to_registry() {
    if [ -z "$REGISTRY_URL" ]; then
        log_warn "No registry URL provided, skipping push"
        return
    fi
    
    log_info "Pushing images to registry..."
    
    # Login to ECR if using AWS ECR
    if [[ "$REGISTRY_URL" == *".amazonaws.com"* ]]; then
        log_info "Logging into AWS ECR..."
        aws ecr get-login-password --region "$AWS_REGION" | docker login --username AWS --password-stdin "$REGISTRY_URL"
    fi
    
    # Push base image
    docker push "${REGISTRY_URL}/${PROJECT_NAME}:${VERSION}"
    docker push "${REGISTRY_URL}/${PROJECT_NAME}:latest"
    
    # Push agent images
    local agents=("supervisor" "threat-hunter" "incident-response" "service-orchestration" "financial-intelligence")
    
    for agent in "${agents[@]}"; do
        docker push "${REGISTRY_URL}/${PROJECT_NAME}-${agent}:${VERSION}"
        docker push "${REGISTRY_URL}/${PROJECT_NAME}-${agent}:latest"
    done
    
    log_info "Images pushed to registry successfully"
}

# Clean up old images
cleanup_images() {
    log_info "Cleaning up old images..."
    
    # Remove dangling images
    docker image prune -f
    
    # Remove old versions (keep last 3)
    docker images "${PROJECT_NAME}" --format "table {{.Repository}}:{{.Tag}}\t{{.CreatedAt}}" | \
        tail -n +4 | \
        awk '{print $1}' | \
        xargs -r docker rmi || true
    
    log_info "Image cleanup completed"
}

# Build development image
build_dev_image() {
    log_info "Building development image..."
    docker build \
        --target development \
        --tag "${PROJECT_NAME}-dev:${VERSION}" \
        --tag "${PROJECT_NAME}-dev:latest" \
        .
    log_info "Development image built successfully"
}

# Main execution
main() {
    log_info "Starting ACSO image build process..."
    log_info "Environment: $ENVIRONMENT"
    log_info "Version: $VERSION"
    log_info "Registry: ${REGISTRY_URL:-'Not specified'}"
    
    check_docker
    
    # Build images based on environment
    if [ "$ENVIRONMENT" = "development" ]; then
        build_dev_image
    fi
    
    build_base_image
    build_agent_images
    
    # Tag and push if registry is specified
    if [ -n "$REGISTRY_URL" ]; then
        tag_for_registry
        
        # Only push if explicitly requested
        if [ "$PUSH_IMAGES" = "true" ]; then
            push_to_registry
        else
            log_info "Images tagged but not pushed. Set PUSH_IMAGES=true to push to registry."
        fi
    fi
    
    # Cleanup if requested
    if [ "$CLEANUP" = "true" ]; then
        cleanup_images
    fi
    
    log_info "ACSO image build process completed successfully!"
    
    # Display built images
    log_info "Built images:"
    docker images | grep "$PROJECT_NAME" | head -10
}

# Help function
show_help() {
    cat << EOF
ACSO Docker Image Build Script

Usage: $0 [OPTIONS]

Environment Variables:
  ECR_REGISTRY_URL    ECR registry URL (optional)
  AWS_REGION         AWS region (default: us-east-1)
  ENVIRONMENT        Environment (development/staging/production, default: development)
  VERSION            Image version tag (default: latest)
  PUSH_IMAGES        Set to 'true' to push images to registry
  CLEANUP            Set to 'true' to cleanup old images

Examples:
  # Build for development
  ./scripts/build-images.sh

  # Build and push to ECR
  ECR_REGISTRY_URL=123456789012.dkr.ecr.us-east-1.amazonaws.com/acso \\
  PUSH_IMAGES=true \\
  ./scripts/build-images.sh

  # Build specific version
  VERSION=v1.0.0 ./scripts/build-images.sh

Options:
  -h, --help         Show this help message
EOF
}

# Parse command line arguments
case "${1:-}" in
    -h|--help)
        show_help
        exit 0
        ;;
    *)
        main "$@"
        ;;
esac