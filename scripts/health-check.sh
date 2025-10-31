#!/bin/bash
# ACSO Demo Health Check Script - Bash Version
# Comprehensive health monitoring for the ACSO demo environment

# Set default values
STACK_NAME="acso-demo"
REGION="us-east-1"
VERBOSE=false
QUICK_CHECK=false
EXPORT_REPORT=false
FIX_ISSUES=false

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
    --verbose)
      VERBOSE=true
      shift
      ;;
    --quick)
      QUICK_CHECK=true
      shift
      ;;
    --export-report)
      EXPORT_REPORT=true
      shift
      ;;
    --fix-issues)
      FIX_ISSUES=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --stack-name NAME        CloudFormation stack name (default: acso-demo)"
      echo "  --region REGION          AWS region (default: us-east-1)"
      echo "  --verbose                Enable verbose output"
      echo "  --quick                  Run quick health check only"
      echo "  --export-report          Export health report to JSON file"
      echo "  --fix-issues             Attempt to fix detected issues"
      echo "  --help                   Show this help message"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      exit 1
      ;;
  esac
done

# Global variables for tracking
TOTAL_CHECKS=0
PASSED_CHECKS=0
FAILED_CHECKS=0
WARNING_CHECKS=0
HEALTH_ISSUES=()

# Logging functions
log_info() {
    echo -e "${CYAN}ℹ️  $1${NC}"
}

log_success() {
    echo -e "${GREEN}✅ $1${NC}"
    ((PASSED_CHECKS++))
}

log_warning() {
    echo -e "${YELLOW}⚠️  $1${NC}"
    ((WARNING_CHECKS++))
}

log_error() {
    echo -e "${RED}❌ $1${NC}"
    ((FAILED_CHECKS++))
    HEALTH_ISSUES+=("$1")
}

log_verbose() {
    if [ "$VERBOSE" = true ]; then
        echo -e "${NC}   $1${NC}"
    fi
}

log_check() {
    ((TOTAL_CHECKS++))
    echo -e "${BLUE}🔍 $1${NC}"
}

# Start health check
echo -e "${GREEN}🏥 ACSO Demo Health Check${NC}"
echo "=========================="
log_info "Stack: $STACK_NAME | Region: $REGION"
echo

# Function to check AWS prerequisites
check_aws_prerequisites() {
    log_check "Checking AWS prerequisites..."
    
    # Check AWS CLI
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not installed"
        return 1
    fi
    log_verbose "AWS CLI found: $(aws --version 2>&1)"
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured"
        return 1
    fi
    
    local identity=$(aws sts get-caller-identity --output json 2>/dev/null)
    local account_id=$(echo "$identity" | grep -o '"Account":"[^"]*' | cut -d'"' -f4)
    local arn=$(echo "$identity" | grep -o '"Arn":"[^"]*' | cut -d'"' -f4)
    
    log_success "AWS credentials valid"
    log_verbose "Account ID: $account_id"
    log_verbose "Identity: $arn"
    
    return 0
}

# Function to check CloudFormation stack
check_cloudformation_stack() {
    log_check "Checking CloudFormation stack status..."
    
    local stack_status
    if stack_status=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].StackStatus" \
        --output text \
        --region "$REGION" 2>/dev/null); then
        
        case "$stack_status" in
            "CREATE_COMPLETE"|"UPDATE_COMPLETE")
                log_success "CloudFormation stack is healthy ($stack_status)"
                ;;
            "CREATE_IN_PROGRESS"|"UPDATE_IN_PROGRESS")
                log_warning "CloudFormation stack is updating ($stack_status)"
                ;;
            "ROLLBACK_COMPLETE"|"UPDATE_ROLLBACK_COMPLETE")
                log_warning "CloudFormation stack rolled back ($stack_status)"
                ;;
            *)
                log_error "CloudFormation stack in problematic state: $stack_status"
                return 1
                ;;
        esac
    else
        log_error "CloudFormation stack '$STACK_NAME' not found"
        return 1
    fi
    
    # Check stack outputs
    local outputs
    if outputs=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs" \
        --output json \
        --region "$REGION" 2>/dev/null); then
        
        local output_count=$(echo "$outputs" | grep -c '"OutputKey"' || echo "0")
        log_verbose "Stack outputs available: $output_count"
        
        if [ "$output_count" -eq 0 ]; then
            log_warning "No stack outputs found"
        fi
    fi
    
    return 0
}

# Function to check S3 bucket
check_s3_bucket() {
    log_check "Checking S3 bucket health..."
    
    local bucket_name
    if bucket_name=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
        --output text \
        --region "$REGION" 2>/dev/null); then
        
        if [ -n "$bucket_name" ] && [ "$bucket_name" != "None" ]; then
            # Check bucket exists and is accessible
            if aws s3 ls "s3://$bucket_name/" &> /dev/null; then
                log_success "S3 bucket '$bucket_name' is accessible"
                
                # Check bucket contents
                local object_count=$(aws s3 ls "s3://$bucket_name/" --recursive | wc -l)
                log_verbose "S3 objects: $object_count"
                
                if [ "$object_count" -eq 0 ]; then
                    log_warning "S3 bucket is empty - frontend may not be deployed"
                fi
                
                # Check bucket website configuration
                if aws s3api get-bucket-website --bucket "$bucket_name" &> /dev/null; then
                    log_verbose "S3 website hosting enabled"
                else
                    log_warning "S3 website hosting not configured"
                fi
            else
                log_error "S3 bucket '$bucket_name' is not accessible"
                return 1
            fi
        else
            log_error "S3 bucket name not found in stack outputs"
            return 1
        fi
    else
        log_error "Could not retrieve S3 bucket information"
        return 1
    fi
    
    return 0
}

# Function to check CloudFront distribution
check_cloudfront_distribution() {
    log_check "Checking CloudFront distribution..."
    
    local distribution_id
    if distribution_id=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
        --output text \
        --region "$REGION" 2>/dev/null); then
        
        if [ -n "$distribution_id" ] && [ "$distribution_id" != "None" ]; then
            # Check distribution status
            local dist_status
            if dist_status=$(aws cloudfront get-distribution \
                --id "$distribution_id" \
                --query "Distribution.Status" \
                --output text 2>/dev/null); then
                
                case "$dist_status" in
                    "Deployed")
                        log_success "CloudFront distribution is deployed"
                        ;;
                    "InProgress")
                        log_warning "CloudFront distribution deployment in progress"
                        ;;
                    *)
                        log_warning "CloudFront distribution status: $dist_status"
                        ;;
                esac
                
                # Get distribution domain
                local domain_name
                if domain_name=$(aws cloudfront get-distribution \
                    --id "$distribution_id" \
                    --query "Distribution.DomainName" \
                    --output text 2>/dev/null); then
                    log_verbose "CloudFront domain: $domain_name"
                fi
            else
                log_error "Could not get CloudFront distribution status"
                return 1
            fi
        else
            log_error "CloudFront distribution ID not found"
            return 1
        fi
    else
        log_error "Could not retrieve CloudFront information"
        return 1
    fi
    
    return 0
}

# Function to check frontend accessibility
check_frontend_accessibility() {
    log_check "Checking frontend accessibility..."
    
    local frontend_url
    if frontend_url=$(aws cloudformation describe-stacks \
        --stack-name "$STACK_NAME" \
        --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" \
        --output text \
        --region "$REGION" 2>/dev/null); then
        
        if [ -n "$frontend_url" ] && [ "$frontend_url" != "None" ]; then
            log_verbose "Testing URL: $frontend_url"
            
            # Test HTTP response
            local http_status
            if http_status=$(curl -I "$frontend_url" --max-time 30 --silent --write-out "%{http_code}" --output /dev/null 2>/dev/null); then
                case "$http_status" in
                    "200")
                        log_success "Frontend is accessible (HTTP $http_status)"
                        ;;
                    "403"|"404")
                        log_warning "Frontend returned HTTP $http_status - may still be deploying"
                        ;;
                    *)
                        log_warning "Frontend returned HTTP $http_status"
                        ;;
                esac
            else
                log_warning "Frontend accessibility test failed - may still be propagating"
            fi
            
            # Test HTTPS redirect
            local https_url="${frontend_url/http:/https:}"
            if [ "$https_url" != "$frontend_url" ]; then
                if curl -I "$https_url" --max-time 15 --silent &> /dev/null; then
                    log_verbose "HTTPS redirect working"
                fi
            fi
        else
            log_error "Frontend URL not found in stack outputs"
            return 1
        fi
    else
        log_error "Could not retrieve frontend URL"
        return 1
    fi
    
    return 0
}

# Function to check Bedrock agents
check_bedrock_agents() {
    if [ "$QUICK_CHECK" = true ]; then
        return 0
    fi
    
    log_check "Checking Bedrock agents..."
    
    # List agents
    local agents_result
    if agents_result=$(aws bedrock-agent list-agents --region "$REGION" --output json 2>/dev/null); then
        local demo_agents
        demo_agents=$(echo "$agents_result" | grep -c "acso.*demo" || echo "0")
        
        if [ "$demo_agents" -gt 0 ]; then
            log_success "Found $demo_agents Bedrock demo agents"
            
            # Check agent statuses
            echo "$agents_result" | grep -o '"agentId":"[^"]*"' | while read -r agent_line; do
                local agent_id=$(echo "$agent_line" | cut -d'"' -f4)
                if [ -n "$agent_id" ]; then
                    local agent_status
                    if agent_status=$(aws bedrock-agent get-agent \
                        --agent-id "$agent_id" \
                        --query "agent.agentStatus" \
                        --output text \
                        --region "$REGION" 2>/dev/null); then
                        log_verbose "Agent $agent_id: $agent_status"
                    fi
                fi
            done
        else
            log_warning "No Bedrock demo agents found"
        fi
    else
        log_warning "Could not list Bedrock agents - service may not be available in region"
    fi
    
    return 0
}

# Function to check budget and costs
check_budget_status() {
    if [ "$QUICK_CHECK" = true ]; then
        return 0
    fi
    
    log_check "Checking budget and cost status..."
    
    local account_id
    if account_id=$(aws sts get-caller-identity --query Account --output text 2>/dev/null); then
        # Check budgets
        if aws budgets describe-budgets --account-id "$account_id" --output json &> /dev/null; then
            local demo_budgets
            demo_budgets=$(aws budgets describe-budgets --account-id "$account_id" --output json 2>/dev/null | grep -c "ACSO-Demo" || echo "0")
            
            if [ "$demo_budgets" -gt 0 ]; then
                log_success "Budget monitoring is configured"
            else
                log_warning "No demo budget found"
            fi
        else
            log_warning "Could not access budget information"
        fi
        
        # Quick cost check
        local end_date=$(date +%Y-%m-%d)
        local start_date=$(date -d "7 days ago" +%Y-%m-%d 2>/dev/null || date -v-7d +%Y-%m-%d 2>/dev/null || echo "2024-01-01")
        
        if aws ce get-cost-and-usage \
            --time-period Start="$start_date",End="$end_date" \
            --granularity DAILY \
            --metrics BlendedCost \
            --output json &> /dev/null; then
            log_verbose "Cost Explorer data available"
        else
            log_verbose "Cost Explorer data not yet available"
        fi
    fi
    
    return 0
}

# Function to check system dependencies
check_system_dependencies() {
    if [ "$QUICK_CHECK" = true ]; then
        return 0
    fi
    
    log_check "Checking system dependencies..."
    
    # Check required tools
    local tools=("curl" "jq" "bc")
    for tool in "${tools[@]}"; do
        if command -v "$tool" &> /dev/null; then
            log_verbose "$tool: available"
        else
            log_warning "$tool: not available (optional)"
        fi
    done
    
    # Check Node.js and npm (for frontend development)
    if command -v node &> /dev/null; then
        local node_version=$(node --version)
        log_verbose "Node.js: $node_version"
    else
        log_verbose "Node.js: not available (needed for frontend development)"
    fi
    
    # Check Python (for backend development)
    local python_cmd="python"
    if command -v python3 &> /dev/null; then
        python_cmd="python3"
    fi
    
    if command -v "$python_cmd" &> /dev/null; then
        local python_version=$($python_cmd --version)
        log_verbose "Python: $python_version"
    else
        log_verbose "Python: not available (needed for backend development)"
    fi
    
    log_success "System dependencies checked"
    return 0
}

# Function to attempt fixes for common issues
attempt_fixes() {
    if [ "$FIX_ISSUES" = false ] || [ ${#HEALTH_ISSUES[@]} -eq 0 ]; then
        return 0
    fi
    
    echo
    log_info "Attempting to fix detected issues..."
    
    for issue in "${HEALTH_ISSUES[@]}"; do
        case "$issue" in
            *"S3 bucket is empty"*)
                log_info "Attempting to redeploy frontend..."
                if [ -d "frontend/dist" ]; then
                    local bucket_name=$(aws cloudformation describe-stacks \
                        --stack-name "$STACK_NAME" \
                        --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" \
                        --output text \
                        --region "$REGION" 2>/dev/null)
                    
                    if [ -n "$bucket_name" ] && [ "$bucket_name" != "None" ]; then
                        if aws s3 sync frontend/dist/ "s3://$bucket_name/" --delete --region "$REGION"; then
                            log_success "Frontend redeployed to S3"
                        else
                            log_error "Failed to redeploy frontend"
                        fi
                    fi
                fi
                ;;
            *"CloudFront"*)
                log_info "Invalidating CloudFront cache..."
                local distribution_id=$(aws cloudformation describe-stacks \
                    --stack-name "$STACK_NAME" \
                    --query "Stacks[0].Outputs[?OutputKey=='CloudFrontDistributionId'].OutputValue" \
                    --output text \
                    --region "$REGION" 2>/dev/null)
                
                if [ -n "$distribution_id" ] && [ "$distribution_id" != "None" ]; then
                    if aws cloudfront create-invalidation --distribution-id "$distribution_id" --paths "/*" --region "$REGION" &> /dev/null; then
                        log_success "CloudFront cache invalidated"
                    else
                        log_warning "Failed to invalidate CloudFront cache"
                    fi
                fi
                ;;
        esac
    done
}

# Function to export health report
export_health_report() {
    if [ "$EXPORT_REPORT" = false ]; then
        return
    fi
    
    local report_file="acso-demo-health-report-$(date +%Y%m%d-%H%M%S).json"
    
    cat > "$report_file" << EOF
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%SZ)",
  "stack_name": "$STACK_NAME",
  "region": "$REGION",
  "summary": {
    "total_checks": $TOTAL_CHECKS,
    "passed": $PASSED_CHECKS,
    "warnings": $WARNING_CHECKS,
    "failed": $FAILED_CHECKS
  },
  "health_score": $(echo "scale=2; ($PASSED_CHECKS / $TOTAL_CHECKS) * 100" | bc -l 2>/dev/null || echo "0"),
  "issues": [
$(printf '    "%s"' "${HEALTH_ISSUES[@]}" | sed 's/$/,/' | sed '$s/,$//')
  ]
}
EOF
    
    log_success "Health report exported to: $report_file"
}

# Function to show health summary
show_health_summary() {
    echo
    echo "================================="
    echo -e "${GREEN}🏥 Health Check Summary${NC}"
    echo "================================="
    
    local health_score=$(echo "scale=1; ($PASSED_CHECKS / $TOTAL_CHECKS) * 100" | bc -l 2>/dev/null || echo "0")
    
    echo "Total Checks: $TOTAL_CHECKS"
    echo -e "Passed: ${GREEN}$PASSED_CHECKS${NC}"
    echo -e "Warnings: ${YELLOW}$WARNING_CHECKS${NC}"
    echo -e "Failed: ${RED}$FAILED_CHECKS${NC}"
    echo
    echo -e "Health Score: ${CYAN}$(printf "%.1f" "$health_score")%${NC}"
    
    if (( $(echo "$health_score >= 90" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "Status: ${GREEN}EXCELLENT${NC}"
    elif (( $(echo "$health_score >= 75" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "Status: ${GREEN}GOOD${NC}"
    elif (( $(echo "$health_score >= 60" | bc -l 2>/dev/null || echo "0") )); then
        echo -e "Status: ${YELLOW}FAIR${NC}"
    else
        echo -e "Status: ${RED}POOR${NC}"
    fi
    
    if [ ${#HEALTH_ISSUES[@]} -gt 0 ]; then
        echo
        echo -e "${RED}Issues Found:${NC}"
        for issue in "${HEALTH_ISSUES[@]}"; do
            echo "  • $issue"
        done
        
        if [ "$FIX_ISSUES" = false ]; then
            echo
            echo -e "${CYAN}💡 Run with --fix-issues to attempt automatic fixes${NC}"
        fi
    fi
    
    echo
    echo -e "${CYAN}📋 Quick Commands:${NC}"
    echo "  Quick check: $0 --quick"
    echo "  Verbose output: $0 --verbose"
    echo "  Export report: $0 --export-report"
    echo "  Fix issues: $0 --fix-issues"
}

# Main execution
main() {
    check_aws_prerequisites || exit 1
    check_cloudformation_stack
    check_s3_bucket
    check_cloudfront_distribution
    check_frontend_accessibility
    check_bedrock_agents
    check_budget_status
    check_system_dependencies
    
    attempt_fixes
    export_health_report
    show_health_summary
}

# Run main function
main "$@"