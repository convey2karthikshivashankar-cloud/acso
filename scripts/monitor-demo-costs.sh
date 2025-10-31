#!/bin/bash
# ACSO Demo Cost Monitoring Script - Bash Version
# Monitors AWS costs and usage for the demo environment

# Set default values
STACK_NAME="acso-demo"
REGION="us-east-1"
BUDGET_LIMIT=100
SHOW_DETAILS=false
ALERTS_ONLY=false
EXPORT_REPORT=false

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
    --budget-limit)
      BUDGET_LIMIT="$2"
      shift 2
      ;;
    --show-details)
      SHOW_DETAILS=true
      shift
      ;;
    --alerts-only)
      ALERTS_ONLY=true
      shift
      ;;
    --export-report)
      EXPORT_REPORT=true
      shift
      ;;
    --help)
      echo "Usage: $0 [OPTIONS]"
      echo "Options:"
      echo "  --stack-name NAME        CloudFormation stack name (default: acso-demo)"
      echo "  --region REGION          AWS region (default: us-east-1)"
      echo "  --budget-limit AMOUNT    Budget limit in USD (default: 100)"
      echo "  --show-details           Show detailed cost breakdown"
      echo "  --alerts-only            Show only cost alerts"
      echo "  --export-report          Export cost report to JSON file"
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
    echo -e "${CYAN}💰 $1${NC}"
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

log_alert() {
    echo -e "${RED}🚨 $1${NC}"
}

log_medium() {
    echo -e "${YELLOW}⚠️  $1${NC}"
}

log_low() {
    echo -e "${BLUE}💡 $1${NC}"
}

# Start monitoring
echo -e "${GREEN}💰 ACSO Demo Cost Monitor${NC}"
echo "========================="

# Function to get current costs
get_current_costs() {
    log_info "Retrieving current costs..."
    
    local end_date=$(date +%Y-%m-%d)
    local start_date=$(date -d "30 days ago" +%Y-%m-%d 2>/dev/null || date -v-30d +%Y-%m-%d 2>/dev/null || echo "2024-01-01")
    
    local cost_data
    if cost_data=$(aws ce get-cost-and-usage \
        --time-period Start="$start_date",End="$end_date" \
        --granularity MONTHLY \
        --metrics BlendedCost \
        --group-by Type=DIMENSION,Key=SERVICE \
        --output json 2>/dev/null); then
        echo "$cost_data"
    else
        log_warning "Failed to retrieve cost data"
        echo ""
    fi
}

# Function to get budget status
get_budget_status() {
    log_info "Checking budget status..."
    
    local account_id
    if account_id=$(aws sts get-caller-identity --query Account --output text 2>/dev/null); then
        local budgets
        if budgets=$(aws budgets describe-budgets --account-id "$account_id" --output json 2>/dev/null); then
            echo "$budgets" | grep -A 20 "ACSO-Demo" || echo ""
        else
            log_warning "Failed to retrieve budget information"
            echo ""
        fi
    else
        log_warning "Could not get account ID"
        echo ""
    fi
}

# Function to estimate demo session costs
get_demo_session_estimate() {
    log_info "Estimating demo session costs..."
    
    # Bedrock Claude 3 Haiku pricing (approximate)
    local input_token_cost=0.00025  # $0.25 per 1K tokens
    local output_token_cost=0.00125 # $1.25 per 1K tokens
    
    echo
    echo -e "${CYAN}💡 Estimated costs per demo scenario:${NC}"
    
    # Threat Detection scenario
    local threat_input=2000
    local threat_output=1500
    local threat_cost=$(echo "scale=4; ($threat_input/1000)*$input_token_cost + ($threat_output/1000)*$output_token_cost" | bc -l 2>/dev/null || echo "1.25")
    echo "  Threat Detection: \$$(printf "%.2f" "$threat_cost")"
    
    # Incident Response scenario
    local incident_input=3000
    local incident_output=2000
    local incident_cost=$(echo "scale=4; ($incident_input/1000)*$input_token_cost + ($incident_output/1000)*$output_token_cost" | bc -l 2>/dev/null || echo "3.25")
    echo "  Incident Response: \$$(printf "%.2f" "$incident_cost")"
    
    # Financial Analysis scenario
    local financial_input=1500
    local financial_output=1000
    local financial_cost=$(echo "scale=4; ($financial_input/1000)*$input_token_cost + ($financial_output/1000)*$output_token_cost" | bc -l 2>/dev/null || echo "1.63")
    echo "  Financial Analysis: \$$(printf "%.2f" "$financial_cost")"
    
    # Multi-Agent Coordination scenario
    local multi_input=4000
    local multi_output=3000
    local multi_cost=$(echo "scale=4; ($multi_input/1000)*$input_token_cost + ($multi_output/1000)*$output_token_cost" | bc -l 2>/dev/null || echo "4.75")
    echo "  Multi-Agent Coordination: \$$(printf "%.2f" "$multi_cost")"
    
    echo
    echo -e "${CYAN}📊 Additional AWS service costs:${NC}"
    echo "  CloudFront: \$0.01-0.05 per demo session"
    echo "  S3 Storage: \$0.001-0.01 per month"
    echo "  CloudFormation: Free (within limits)"
    echo "  CloudWatch: \$0.01-0.10 per month"
    
    local total_per_session=$(echo "scale=2; $threat_cost + $incident_cost + $financial_cost + $multi_cost + 0.10" | bc -l 2>/dev/null || echo "10.00")
    echo
    echo -e "${GREEN}💰 Total estimated cost per complete demo session: \$$(printf "%.2f" "$total_per_session")${NC}"
}

# Function to analyze cost trends
analyze_cost_trends() {
    log_info "Analyzing cost trends..."
    
    local cost_data=$(get_current_costs)
    if [ -z "$cost_data" ]; then
        log_warning "No cost data available for trend analysis"
        return
    fi
    
    echo
    echo -e "${CYAN}📈 Cost Analysis:${NC}"
    
    # Extract total cost (simplified parsing)
    local total_cost=$(echo "$cost_data" | grep -o '"Amount":"[0-9.]*"' | head -1 | grep -o '[0-9.]*' || echo "0.00")
    
    if (( $(echo "$total_cost > 0" | bc -l 2>/dev/null || echo "0") )); then
        echo "  Current month spending: \$$total_cost"
        
        # Calculate percentage of budget used
        local budget_percentage=$(echo "scale=2; ($total_cost / $BUDGET_LIMIT) * 100" | bc -l 2>/dev/null || echo "0")
        echo "  Budget utilization: $(printf "%.1f" "$budget_percentage")%"
        
        # Provide alerts based on spending
        if (( $(echo "$budget_percentage > 80" | bc -l 2>/dev/null || echo "0") )); then
            log_alert "HIGH: Budget utilization above 80%"
        elif (( $(echo "$budget_percentage > 60" | bc -l 2>/dev/null || echo "0") )); then
            log_medium "MEDIUM: Budget utilization above 60%"
        else
            log_low "LOW: Budget utilization within normal range"
        fi
    else
        echo "  No significant costs detected this month"
        log_success "Spending is minimal"
    fi
}

# Function to show service breakdown
show_service_breakdown() {
    if [ "$SHOW_DETAILS" = false ]; then
        return
    fi
    
    log_info "Service cost breakdown..."
    
    local cost_data=$(get_current_costs)
    if [ -z "$cost_data" ]; then
        log_warning "No detailed cost data available"
        return
    fi
    
    echo
    echo -e "${CYAN}🔍 Service Breakdown:${NC}"
    
    # Parse and display service costs (simplified)
    echo "$cost_data" | grep -o '"Key":"[^"]*".*"Amount":"[0-9.]*"' | while read -r line; do
        local service=$(echo "$line" | grep -o '"Key":"[^"]*"' | cut -d'"' -f4)
        local amount=$(echo "$line" | grep -o '"Amount":"[0-9.]*"' | cut -d'"' -f4)
        if [ -n "$service" ] && [ -n "$amount" ] && (( $(echo "$amount > 0.01" | bc -l 2>/dev/null || echo "0") )); then
            printf "  %-20s \$%s\n" "$service:" "$amount"
        fi
    done
}

# Function to export cost report
export_cost_report() {
    if [ "$EXPORT_REPORT" = false ]; then
        return
    fi
    
    log_info "Exporting cost report..."
    
    local report_file="acso-demo-cost-report-$(date +%Y%m%d-%H%M%S).json"
    local cost_data=$(get_current_costs)
    
    if [ -n "$cost_data" ]; then
        echo "$cost_data" > "$report_file"
        log_success "Cost report exported to: $report_file"
    else
        log_warning "No cost data to export"
    fi
}

# Function to provide cost optimization recommendations
show_optimization_tips() {
    echo
    log_info "Cost optimization recommendations:"
    echo
    echo -e "${CYAN}💡 Optimization Tips:${NC}"
    echo "  1. Run demos during business hours to minimize idle time"
    echo "  2. Use shorter demo sessions (15-20 minutes) to reduce token usage"
    echo "  3. Clean up demo data regularly to minimize storage costs"
    echo "  4. Monitor CloudFront cache hit ratios for efficiency"
    echo "  5. Consider using Bedrock's cheaper models for non-critical demos"
    echo "  6. Set up CloudWatch alarms for automatic cost alerts"
    echo "  7. Use AWS Cost Anomaly Detection for unusual spending patterns"
    echo
    echo -e "${CYAN}🎯 Free Tier Optimization:${NC}"
    echo "  • Bedrock: 20K input + 20K output tokens free per month"
    echo "  • CloudFront: 1TB data transfer + 10M requests free"
    echo "  • S3: 5GB storage + 20K GET requests free"
    echo "  • CloudWatch: 10 custom metrics + 1M API requests free"
}

# Function to check for cost alerts
check_cost_alerts() {
    local cost_data=$(get_current_costs)
    local alerts_found=false
    
    if [ -n "$cost_data" ]; then
        local total_cost=$(echo "$cost_data" | grep -o '"Amount":"[0-9.]*"' | head -1 | grep -o '[0-9.]*' || echo "0.00")
        local budget_percentage=$(echo "scale=2; ($total_cost / $BUDGET_LIMIT) * 100" | bc -l 2>/dev/null || echo "0")
        
        if (( $(echo "$budget_percentage > 90" | bc -l 2>/dev/null || echo "0") )); then
            log_alert "CRITICAL: Budget utilization above 90% (\$$total_cost / \$$BUDGET_LIMIT)"
            alerts_found=true
        elif (( $(echo "$budget_percentage > 75" | bc -l 2>/dev/null || echo "0") )); then
            log_alert "WARNING: Budget utilization above 75% (\$$total_cost / \$$BUDGET_LIMIT)"
            alerts_found=true
        fi
        
        # Check for unusual service costs
        if (( $(echo "$total_cost > 50" | bc -l 2>/dev/null || echo "0") )); then
            log_alert "UNUSUAL: High spending detected - investigate service usage"
            alerts_found=true
        fi
    fi
    
    if [ "$alerts_found" = false ]; then
        if [ "$ALERTS_ONLY" = true ]; then
            log_success "No cost alerts detected"
        fi
    fi
}

# Main execution
main() {
    # Check AWS CLI availability
    if ! command -v aws &> /dev/null; then
        log_error "AWS CLI not found. Please install AWS CLI v2.0+"
        exit 1
    fi
    
    # Check AWS credentials
    if ! aws sts get-caller-identity &> /dev/null; then
        log_error "AWS credentials not configured. Run 'aws configure'"
        exit 1
    fi
    
    # Show only alerts if requested
    if [ "$ALERTS_ONLY" = true ]; then
        check_cost_alerts
        return
    fi
    
    # Full monitoring report
    get_demo_session_estimate
    analyze_cost_trends
    show_service_breakdown
    check_cost_alerts
    export_cost_report
    show_optimization_tips
    
    echo
    log_success "Cost monitoring complete!"
    echo
    echo -e "${CYAN}📋 Quick Commands:${NC}"
    echo "  Monitor alerts only: $0 --alerts-only"
    echo "  Show detailed breakdown: $0 --show-details"
    echo "  Export cost report: $0 --export-report"
    echo "  Set custom budget: $0 --budget-limit 50"
}

# Run main function
main "$@"