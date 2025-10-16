# ACSO Troubleshooting Guide

## Overview

This guide provides comprehensive troubleshooting procedures for the ACSO (Autonomous Cyber-Security & Service Orchestrator) system. It covers common issues, diagnostic procedures, and resolution steps for various system components.

## Quick Reference

### Emergency Commands

```bash
# Check overall system health
python scripts/smoke-tests.py --environment production

# View service status
./scripts/deploy-to-ecs.sh status

# Emergency rollback
ENVIRONMENT=production ./scripts/deploy-to-ecs.sh rollback

# View recent errors
aws logs filter-log-events \
  --log-group-name "/aws/acso/production/agents" \
  --start-time $(date -d '1 hour ago' +%s)000 \
  --filter-pattern "ERROR OR FATAL"
```

### Common Log Locations

- **Application Logs**: `/aws/acso/{environment}/agents`
- **ECS Logs**: AWS ECS Console → Service → Logs tab
- **Infrastructure Logs**: CloudFormation/CDK deployment logs
- **CI/CD Logs**: GitHub Actions workflow logs

## Deployment Issues

### Issue: Deployment Fails with "Service Not Found"

**Symptoms:**
- Deployment script reports service not found
- ECS console shows no services in cluster

**Diagnosis:**
```bash
# Check if cluster exists
aws ecs describe-clusters --clusters acso-production-cluster

# List all clusters
aws ecs list-clusters

# Check CloudFormation stack status
aws cloudformation describe-stacks --stack-name acso-production-infrastructure
```

**Resolution:**
1. **If cluster doesn't exist:**
   ```bash
   # Deploy infrastructure first
   cd infrastructure/cdk
   cdk deploy AcsoStack --parameters Environment=production
   ```

2. **If cluster exists but services don't:**
   ```bash
   # Create services
   ENVIRONMENT=production ./scripts/deploy-to-ecs.sh
   ```

### Issue: Container Image Pull Failures

**Symptoms:**
- Tasks fail to start
- ECS events show "CannotPullContainerError"
- Service remains in "PENDING" state

**Diagnosis:**
```bash
# Check ECR repository exists
aws ecr describe-repositories --repository-names acso-supervisor

# Check image exists
aws ecr list-images --repository-name acso-supervisor

# Check IAM permissions
aws iam get-role-policy --role-name acso-production-execution-role --policy-name ECRAccessPolicy
```

**Resolution:**
1. **Build and push images:**
   ```bash
   # Build all images
   ./scripts/build-images.sh
   
   # Or build specific image
   docker build -t acso-supervisor --target supervisor-agent .
   docker tag acso-supervisor:latest $ECR_REGISTRY/acso-supervisor:latest
   docker push $ECR_REGISTRY/acso-supervisor:latest
   ```

2. **Fix IAM permissions:**
   ```bash
   # Attach ECR policy to execution role
   aws iam attach-role-policy \
     --role-name acso-production-execution-role \
     --policy-arn arn:aws:iam::aws:policy/AmazonEC2ContainerRegistryReadOnly
   ```

### Issue: Task Definition Registration Fails

**Symptoms:**
- Deployment script fails at task definition step
- Error: "Invalid parameter" or "Malformed task definition"

**Diagnosis:**
```bash
# Validate task definition JSON
cat /tmp/supervisor-task-definition.json | jq .

# Check IAM role ARNs exist
aws iam get-role --role-name acso-production-execution-role
```

**Resolution:**
1. **Fix JSON syntax:**
   ```bash
   # Validate JSON format
   python -m json.tool /tmp/supervisor-task-definition.json
   ```

2. **Verify IAM roles:**
   ```bash
   # Create missing execution role
   aws iam create-role \
     --role-name acso-production-execution-role \
     --assume-role-policy-document file://ecs-task-execution-role-policy.json
   ```

## Agent Communication Issues

### Issue: Agents Cannot Communicate with Bedrock

**Symptoms:**
- Agents fail to start
- Logs show "BedrockConnectionError"
- Authentication failures in logs

**Diagnosis:**
```bash
# Test Bedrock connectivity
aws bedrock list-foundation-models --region us-east-1

# Check agent logs
aws logs filter-log-events \
  --log-group-name "/aws/acso/production/agents" \
  --filter-pattern "bedrock OR authentication"

# Verify IAM permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:role/acso-production-task-role \
  --action-names bedrock:InvokeModel \
  --resource-arns "*"
```

**Resolution:**
1. **Enable Bedrock access:**
   ```bash
   # Check Bedrock service availability
   aws bedrock list-foundation-models --region us-east-1
   
   # If not available, request access through AWS Console
   ```

2. **Fix IAM permissions:**
   ```bash
   # Add Bedrock permissions to task role
   aws iam put-role-policy \
     --role-name acso-production-task-role \
     --policy-name BedrockAccess \
     --policy-document file://bedrock-policy.json
   ```

### Issue: Inter-Agent Communication Failures

**Symptoms:**
- Supervisor cannot reach sub-agents
- Timeout errors in logs
- Workflow failures

**Diagnosis:**
```bash
# Check service discovery
aws ecs list-services --cluster acso-production-cluster

# Check network configuration
aws ec2 describe-security-groups --filters "Name=group-name,Values=*acso*"

# Test connectivity between services
aws ecs execute-command \
  --cluster acso-production-cluster \
  --task TASK-ID \
  --container supervisor-agent \
  --interactive \
  --command "/bin/bash"
```

**Resolution:**
1. **Fix security groups:**
   ```bash
   # Allow communication between agents
   aws ec2 authorize-security-group-ingress \
     --group-id sg-12345678 \
     --protocol tcp \
     --port 8000 \
     --source-group sg-12345678
   ```

2. **Update service discovery:**
   ```bash
   # Restart services to refresh discovery
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --force-new-deployment
   ```

## Performance Issues

### Issue: High CPU Utilization

**Symptoms:**
- CPU metrics > 80%
- Slow response times
- Task restarts due to resource limits

**Diagnosis:**
```bash
# Check CPU metrics
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name CPUUtilization \
  --dimensions Name=ServiceName,Value=acso-production-supervisor \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum

# Check application logs for performance issues
aws logs filter-log-events \
  --log-group-name "/aws/acso/production/agents" \
  --filter-pattern "slow OR timeout OR performance"

# Check for resource-intensive operations
aws logs filter-log-events \
  --log-group-name "/aws/acso/production/agents" \
  --filter-pattern "processing OR analysis OR computation"
```

**Resolution:**
1. **Scale up resources:**
   ```bash
   # Increase CPU allocation
   aws ecs register-task-definition \
     --family acso-production-supervisor \
     --cpu 1024 \
     --memory 2048 \
     --container-definitions file://updated-container-def.json
   
   # Update service
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --task-definition acso-production-supervisor:LATEST
   ```

2. **Scale out instances:**
   ```bash
   # Increase desired count
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --desired-count 3
   ```

### Issue: Memory Leaks

**Symptoms:**
- Memory utilization continuously increasing
- Out of memory errors
- Container restarts

**Diagnosis:**
```bash
# Check memory trends
aws cloudwatch get-metric-statistics \
  --namespace AWS/ECS \
  --metric-name MemoryUtilization \
  --dimensions Name=ServiceName,Value=acso-production-supervisor \
  --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 3600 \
  --statistics Average,Maximum

# Check for memory-related errors
aws logs filter-log-events \
  --log-group-name "/aws/acso/production/agents" \
  --filter-pattern "memory OR heap OR OutOfMemory"

# Monitor memory usage in real-time
aws ecs execute-command \
  --cluster acso-production-cluster \
  --task TASK-ID \
  --container supervisor-agent \
  --interactive \
  --command "top"
```

**Resolution:**
1. **Immediate fix - restart service:**
   ```bash
   # Force new deployment to clear memory
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --force-new-deployment
   ```

2. **Long-term fix - increase memory:**
   ```bash
   # Update task definition with more memory
   aws ecs register-task-definition \
     --family acso-production-supervisor \
     --cpu 1024 \
     --memory 4096 \
     --container-definitions file://updated-container-def.json
   ```

### Issue: Database Connection Issues

**Symptoms:**
- Connection timeout errors
- "Too many connections" errors
- Slow database queries

**Diagnosis:**
```bash
# Check database connections
aws rds describe-db-instances --db-instance-identifier acso-production-db

# Check connection pool metrics
aws logs filter-log-events \
  --log-group-name "/aws/acso/production/agents" \
  --filter-pattern "connection OR database OR pool"

# Monitor database performance
aws cloudwatch get-metric-statistics \
  --namespace AWS/RDS \
  --metric-name DatabaseConnections \
  --dimensions Name=DBInstanceIdentifier,Value=acso-production-db \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Average,Maximum
```

**Resolution:**
1. **Optimize connection pooling:**
   ```bash
   # Update connection pool configuration
   aws ssm put-parameter \
     --name "/acso/production/database/max_connections" \
     --value "20" \
     --overwrite
   
   # Restart services to apply changes
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --force-new-deployment
   ```

2. **Scale database:**
   ```bash
   # Modify RDS instance class
   aws rds modify-db-instance \
     --db-instance-identifier acso-production-db \
     --db-instance-class db.t3.large \
     --apply-immediately
   ```

## Security Issues

### Issue: Authentication Failures

**Symptoms:**
- "Access Denied" errors
- Authentication timeout errors
- IAM permission errors

**Diagnosis:**
```bash
# Check IAM role policies
aws iam list-attached-role-policies --role-name acso-production-task-role

# Check inline policies
aws iam list-role-policies --role-name acso-production-task-role

# Test specific permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:role/acso-production-task-role \
  --action-names s3:GetObject \
  --resource-arns "arn:aws:s3:::acso-production-bucket/*"

# Check CloudTrail for denied actions
aws logs filter-log-events \
  --log-group-name "CloudTrail/AcsoAuditLog" \
  --filter-pattern "AccessDenied OR Denied"
```

**Resolution:**
1. **Fix IAM permissions:**
   ```bash
   # Add missing permissions
   aws iam put-role-policy \
     --role-name acso-production-task-role \
     --policy-name AdditionalPermissions \
     --policy-document file://additional-permissions.json
   ```

2. **Update trust relationships:**
   ```bash
   # Update assume role policy
   aws iam update-assume-role-policy \
     --role-name acso-production-task-role \
     --policy-document file://trust-policy.json
   ```

### Issue: Network Security Violations

**Symptoms:**
- Connection refused errors
- Security group violations
- Network timeout errors

**Diagnosis:**
```bash
# Check security groups
aws ec2 describe-security-groups --filters "Name=group-name,Values=*acso*"

# Check VPC configuration
aws ec2 describe-vpcs --filters "Name=tag:Name,Values=*acso*"

# Check network ACLs
aws ec2 describe-network-acls --filters "Name=vpc-id,Values=vpc-12345678"

# Test connectivity
aws ecs execute-command \
  --cluster acso-production-cluster \
  --task TASK-ID \
  --container supervisor-agent \
  --interactive \
  --command "telnet target-service 8000"
```

**Resolution:**
1. **Update security groups:**
   ```bash
   # Allow required ports
   aws ec2 authorize-security-group-ingress \
     --group-id sg-12345678 \
     --protocol tcp \
     --port 8000 \
     --source-group sg-87654321
   ```

2. **Fix network routing:**
   ```bash
   # Check route tables
   aws ec2 describe-route-tables --filters "Name=vpc-id,Values=vpc-12345678"
   
   # Update routes if necessary
   aws ec2 create-route \
     --route-table-id rtb-12345678 \
     --destination-cidr-block 10.0.0.0/16 \
     --gateway-id igw-12345678
   ```

## Monitoring and Alerting Issues

### Issue: Missing Metrics

**Symptoms:**
- CloudWatch dashboards show no data
- Alerts not triggering
- Monitoring gaps

**Diagnosis:**
```bash
# Check CloudWatch agent status
aws logs describe-log-groups --log-group-name-prefix "/aws/acso"

# Check metric filters
aws logs describe-metric-filters --log-group-name "/aws/acso/production/agents"

# Test metric publishing
aws cloudwatch put-metric-data \
  --namespace "ACSO/Test" \
  --metric-data MetricName=TestMetric,Value=1,Unit=Count
```

**Resolution:**
1. **Fix log group configuration:**
   ```bash
   # Create missing log groups
   aws logs create-log-group \
     --log-group-name "/aws/acso/production/agents"
   
   # Set retention policy
   aws logs put-retention-policy \
     --log-group-name "/aws/acso/production/agents" \
     --retention-in-days 30
   ```

2. **Update metric filters:**
   ```bash
   # Create metric filter for errors
   aws logs put-metric-filter \
     --log-group-name "/aws/acso/production/agents" \
     --filter-name "ErrorCount" \
     --filter-pattern "ERROR" \
     --metric-transformations \
       metricName=ErrorCount,metricNamespace=ACSO/Errors,metricValue=1
   ```

### Issue: Alert Fatigue

**Symptoms:**
- Too many false positive alerts
- Important alerts being ignored
- Alert noise

**Diagnosis:**
```bash
# Review alarm history
aws cloudwatch describe-alarm-history --alarm-name "ACSO-HighCPU"

# Check alarm thresholds
aws cloudwatch describe-alarms --alarm-names "ACSO-HighCPU" "ACSO-HighMemory"

# Analyze alert patterns
aws logs filter-log-events \
  --log-group-name "/aws/cloudwatch/alarms" \
  --filter-pattern "ALARM"
```

**Resolution:**
1. **Tune alert thresholds:**
   ```bash
   # Update alarm threshold
   aws cloudwatch put-metric-alarm \
     --alarm-name "ACSO-HighCPU" \
     --alarm-description "High CPU utilization" \
     --metric-name CPUUtilization \
     --namespace AWS/ECS \
     --statistic Average \
     --period 300 \
     --threshold 85 \
     --comparison-operator GreaterThanThreshold \
     --evaluation-periods 3
   ```

2. **Implement alert suppression:**
   ```bash
   # Create composite alarm
   aws cloudwatch put-composite-alarm \
     --alarm-name "ACSO-SystemHealth" \
     --alarm-description "Overall system health" \
     --alarm-rule "(ALARM('ACSO-HighCPU') OR ALARM('ACSO-HighMemory')) AND NOT ALARM('ACSO-Maintenance')"
   ```

## Data and Storage Issues

### Issue: Log Retention Problems

**Symptoms:**
- Logs disappearing too quickly
- Storage costs too high
- Compliance issues

**Diagnosis:**
```bash
# Check log group retention settings
aws logs describe-log-groups --log-group-name-prefix "/aws/acso"

# Check log group sizes
aws logs describe-log-groups \
  --log-group-name-prefix "/aws/acso" \
  --query 'logGroups[*].{Name:logGroupName,Size:storedBytes,Retention:retentionInDays}'
```

**Resolution:**
1. **Adjust retention policies:**
   ```bash
   # Set appropriate retention
   aws logs put-retention-policy \
     --log-group-name "/aws/acso/production/agents" \
     --retention-in-days 90
   ```

2. **Implement log archiving:**
   ```bash
   # Create export task to S3
   aws logs create-export-task \
     --log-group-name "/aws/acso/production/agents" \
     --from $(date -d '30 days ago' +%s)000 \
     --to $(date -d '1 day ago' +%s)000 \
     --destination "acso-log-archive-bucket"
   ```

### Issue: Configuration Drift

**Symptoms:**
- Inconsistent behavior across environments
- Configuration not matching expected values
- Manual changes overriding automation

**Diagnosis:**
```bash
# Check current configuration
aws ssm get-parameters-by-path --path "/acso/production" --recursive

# Compare with expected configuration
diff expected-config.json <(aws ssm get-parameters-by-path --path "/acso/production" --recursive --output json)

# Check CloudFormation drift
aws cloudformation detect-stack-drift --stack-name acso-production-infrastructure
```

**Resolution:**
1. **Reset configuration:**
   ```bash
   # Delete drifted parameters
   aws ssm delete-parameter --name "/acso/production/incorrect-param"
   
   # Restore from infrastructure as code
   cd infrastructure/cdk
   cdk deploy --require-approval never
   ```

2. **Implement drift detection:**
   ```bash
   # Create drift detection alarm
   aws cloudwatch put-metric-alarm \
     --alarm-name "ACSO-ConfigurationDrift" \
     --alarm-description "Configuration drift detected" \
     --metric-name DriftDetectionStatus \
     --namespace AWS/CloudFormation \
     --statistic Maximum \
     --period 3600 \
     --threshold 1 \
     --comparison-operator GreaterThanOrEqualToThreshold \
     --evaluation-periods 1
   ```

## Recovery Procedures

### Complete System Recovery

**When to Use:** Total system failure, data corruption, major security breach

**Steps:**

1. **Assess Damage:**
   ```bash
   # Check all services
   aws ecs describe-services --cluster acso-production-cluster
   
   # Check infrastructure
   aws cloudformation describe-stacks --stack-name acso-production-infrastructure
   
   # Check data integrity
   python scripts/data-integrity-check.py --environment production
   ```

2. **Activate DR Site:**
   ```bash
   # Failover to DR region
   AWS_REGION=us-west-2 ./scripts/emergency-failover.sh
   ```

3. **Restore from Backup:**
   ```bash
   # Restore latest backup
   ./scripts/restore-from-backup.sh --environment production --backup-id latest
   ```

4. **Validate Recovery:**
   ```bash
   # Run full validation
   python scripts/production-validation.py --environment production
   ```

### Partial Service Recovery

**When to Use:** Single agent failure, partial data loss

**Steps:**

1. **Isolate Problem:**
   ```bash
   # Stop affected service
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --desired-count 0
   ```

2. **Restore Service:**
   ```bash
   # Deploy clean version
   ENVIRONMENT=production ./scripts/deploy-to-ecs.sh
   ```

3. **Verify Recovery:**
   ```bash
   # Test specific service
   python scripts/service-validation.py --service supervisor --environment production
   ```

## Escalation Procedures

### When to Escalate

- **Immediate Escalation:**
  - Complete system outage
  - Security breach
  - Data loss
  - Customer-facing service down

- **Standard Escalation:**
  - Performance degradation > 30 minutes
  - Partial service failure
  - Monitoring system failure

- **Scheduled Escalation:**
  - Recurring issues
  - Capacity planning concerns
  - Security vulnerabilities

### Escalation Contacts

1. **Level 1 - On-Call Engineer**
   - Initial response and basic troubleshooting
   - Available 24/7

2. **Level 2 - Development Team Lead**
   - Complex technical issues
   - Code-related problems

3. **Level 3 - Engineering Manager**
   - Resource allocation decisions
   - Cross-team coordination

4. **Level 4 - CTO/VP Engineering**
   - Business impact decisions
   - External communication

### Information to Gather Before Escalating

- **System Status:**
  ```bash
  # Generate system report
  ./scripts/generate-system-report.sh --environment production
  ```

- **Error Logs:**
  ```bash
  # Collect recent errors
  aws logs filter-log-events \
    --log-group-name "/aws/acso/production/agents" \
    --start-time $(date -d '2 hours ago' +%s)000 \
    --filter-pattern "ERROR OR FATAL"
  ```

- **Performance Metrics:**
  ```bash
  # Get performance snapshot
  python scripts/performance-snapshot.py --environment production
  ```

- **Timeline of Events:**
  - When did the issue start?
  - What changed recently?
  - What troubleshooting steps were taken?

---

*This troubleshooting guide should be updated regularly based on new issues encountered and lessons learned from incident responses.*