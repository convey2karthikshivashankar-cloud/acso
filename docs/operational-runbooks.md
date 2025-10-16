# ACSO Operational Runbooks

## Overview

This document contains operational procedures for managing the ACSO (Autonomous Cyber-Security & Service Orchestrator) system in production. These runbooks provide step-by-step instructions for common operational tasks, incident response, and system maintenance.

## Table of Contents

1. [System Health Monitoring](#system-health-monitoring)
2. [Agent Management](#agent-management)
3. [Incident Response](#incident-response)
4. [Performance Optimization](#performance-optimization)
5. [Backup and Recovery](#backup-and-recovery)
6. [Security Operations](#security-operations)
7. [Maintenance Procedures](#maintenance-procedures)
8. [Emergency Procedures](#emergency-procedures)

## System Health Monitoring

### Daily Health Check

**Frequency**: Daily (automated via monitoring)
**Duration**: 5-10 minutes
**Prerequisites**: AWS CLI access, monitoring dashboard access

#### Steps:

1. **Check Overall System Status**
   ```bash
   # Check all ECS services
   aws ecs describe-services \
     --cluster acso-production-cluster \
     --services $(aws ecs list-services --cluster acso-production-cluster --query 'serviceArns[]' --output text)
   ```

2. **Verify Agent Health**
   ```bash
   # Run automated health checks
   python scripts/smoke-tests.py --environment production
   ```

3. **Review Key Metrics**
   ```bash
   # Check CPU utilization
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name CPUUtilization \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Average
   ```

4. **Check Error Rates**
   ```bash
   # Review error logs from last 24 hours
   aws logs filter-log-events \
     --log-group-name "/aws/acso/production/agents" \
     --start-time $(date -d '24 hours ago' +%s)000 \
     --filter-pattern "ERROR"
   ```

#### Success Criteria:
- All services running with desired count
- CPU utilization < 70%
- Memory utilization < 80%
- Error rate < 1%

#### Escalation:
If any criteria fail, follow [Incident Response](#incident-response) procedures.

### Weekly Performance Review

**Frequency**: Weekly
**Duration**: 30-45 minutes
**Prerequisites**: CloudWatch access, performance baseline data

#### Steps:

1. **Generate Performance Report**
   ```bash
   # Run comprehensive performance analysis
   python scripts/performance-analysis.py --environment production --days 7
   ```

2. **Review Trends**
   - CPU and memory utilization trends
   - Response time percentiles
   - Error rate trends
   - Agent communication latency

3. **Capacity Planning**
   - Analyze growth patterns
   - Predict scaling needs
   - Review auto-scaling policies

4. **Document Findings**
   - Update performance baseline
   - Note any anomalies
   - Recommend optimizations

## Agent Management

### Restarting Individual Agents

**When to Use**: Agent unresponsive, memory leaks, configuration changes
**Duration**: 5-10 minutes
**Impact**: Temporary service interruption for specific agent

#### Steps:

1. **Identify Problem Agent**
   ```bash
   # Check agent status
   aws ecs describe-services \
     --cluster acso-production-cluster \
     --services acso-production-supervisor
   ```

2. **Graceful Restart**
   ```bash
   # Update service to force new deployment
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --force-new-deployment
   ```

3. **Monitor Restart**
   ```bash
   # Watch service stabilization
   aws ecs wait services-stable \
     --cluster acso-production-cluster \
     --services acso-production-supervisor
   ```

4. **Verify Health**
   ```bash
   # Check agent logs
   aws logs tail /aws/acso/production/agents --follow --filter-pattern "supervisor"
   ```

### Scaling Agents

**When to Use**: High load, performance degradation, capacity planning
**Duration**: 10-15 minutes
**Impact**: Improved performance, increased costs

#### Manual Scaling:

```bash
# Scale supervisor agent to 3 instances
aws ecs update-service \
  --cluster acso-production-cluster \
  --service acso-production-supervisor \
  --desired-count 3
```

#### Auto-scaling Configuration:

```bash
# Update auto-scaling policy
aws application-autoscaling put-scaling-policy \
  --service-namespace ecs \
  --resource-id service/acso-production-cluster/acso-production-supervisor \
  --scalable-dimension ecs:service:DesiredCount \
  --policy-name acso-supervisor-scale-up \
  --policy-type StepScaling \
  --step-scaling-policy-configuration file://scale-up-policy.json
```

### Agent Configuration Updates

**When to Use**: Configuration changes, feature flags, parameter updates
**Duration**: 15-20 minutes
**Impact**: Service restart required

#### Steps:

1. **Update Configuration**
   ```bash
   # Update SSM parameter
   aws ssm put-parameter \
     --name "/acso/production/supervisor/config" \
     --value "new-configuration-value" \
     --overwrite
   ```

2. **Deploy Configuration**
   ```bash
   # Force service update to pick up new config
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --force-new-deployment
   ```

3. **Validate Changes**
   ```bash
   # Check agent logs for configuration loading
   aws logs filter-log-events \
     --log-group-name "/aws/acso/production/agents" \
     --filter-pattern "Configuration loaded"
   ```

## Incident Response

### High CPU Utilization

**Trigger**: CPU > 80% for 10 minutes
**Severity**: Medium
**Response Time**: 15 minutes

#### Investigation Steps:

1. **Identify Affected Services**
   ```bash
   # Check CPU metrics for all services
   for service in supervisor threat-hunter incident-response service-orchestration financial-intelligence; do
     echo "Checking $service..."
     aws cloudwatch get-metric-statistics \
       --namespace AWS/ECS \
       --metric-name CPUUtilization \
       --dimensions Name=ServiceName,Value=acso-production-$service \
       --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
       --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
       --period 300 \
       --statistics Maximum
   done
   ```

2. **Check for Resource Contention**
   ```bash
   # Review memory utilization
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name MemoryUtilization \
     --dimensions Name=ServiceName,Value=acso-production-supervisor \
     --start-time $(date -u -d '30 minutes ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Maximum
   ```

3. **Analyze Application Logs**
   ```bash
   # Look for performance-related errors
   aws logs filter-log-events \
     --log-group-name "/aws/acso/production/agents" \
     --start-time $(date -d '1 hour ago' +%s)000 \
     --filter-pattern "timeout OR slow OR performance"
   ```

#### Mitigation Actions:

1. **Immediate Relief**
   ```bash
   # Scale up affected service
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --desired-count 2
   ```

2. **Resource Optimization**
   ```bash
   # Update task definition with more CPU
   aws ecs register-task-definition \
     --family acso-production-supervisor \
     --cpu 1024 \
     --memory 2048 \
     --container-definitions file://updated-container-def.json
   ```

### Service Unavailable

**Trigger**: Service health check failures
**Severity**: High
**Response Time**: 5 minutes

#### Investigation Steps:

1. **Check Service Status**
   ```bash
   # Get service details
   aws ecs describe-services \
     --cluster acso-production-cluster \
     --services acso-production-supervisor \
     --query 'services[0].{Status:status,Running:runningCount,Desired:desiredCount,Events:events[0:5]}'
   ```

2. **Check Task Health**
   ```bash
   # List running tasks
   aws ecs list-tasks \
     --cluster acso-production-cluster \
     --service-name acso-production-supervisor
   
   # Describe task details
   aws ecs describe-tasks \
     --cluster acso-production-cluster \
     --tasks [TASK-ARN]
   ```

3. **Review Application Logs**
   ```bash
   # Check recent error logs
   aws logs filter-log-events \
     --log-group-name "/aws/acso/production/agents" \
     --start-time $(date -d '15 minutes ago' +%s)000 \
     --filter-pattern "FATAL OR CRITICAL OR startup"
   ```

#### Mitigation Actions:

1. **Restart Service**
   ```bash
   # Force new deployment
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --force-new-deployment
   ```

2. **Rollback if Necessary**
   ```bash
   # Rollback to previous version
   ENVIRONMENT=production ./scripts/deploy-to-ecs.sh rollback
   ```

### Memory Leak Detection

**Trigger**: Memory utilization increasing over time
**Severity**: Medium
**Response Time**: 30 minutes

#### Investigation Steps:

1. **Analyze Memory Trends**
   ```bash
   # Get memory utilization over 24 hours
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ECS \
     --metric-name MemoryUtilization \
     --dimensions Name=ServiceName,Value=acso-production-supervisor \
     --start-time $(date -u -d '24 hours ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 3600 \
     --statistics Average,Maximum
   ```

2. **Check Application Metrics**
   ```bash
   # Look for memory-related log entries
   aws logs filter-log-events \
     --log-group-name "/aws/acso/production/agents" \
     --start-time $(date -d '6 hours ago' +%s)000 \
     --filter-pattern "memory OR heap OR garbage"
   ```

#### Mitigation Actions:

1. **Restart Affected Services**
   ```bash
   # Restart service to clear memory
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --force-new-deployment
   ```

2. **Implement Monitoring**
   ```bash
   # Create memory alarm
   aws cloudwatch put-metric-alarm \
     --alarm-name "ACSO-MemoryLeak-Supervisor" \
     --alarm-description "Potential memory leak in supervisor" \
     --metric-name MemoryUtilization \
     --namespace AWS/ECS \
     --statistic Average \
     --period 3600 \
     --threshold 85 \
     --comparison-operator GreaterThanThreshold \
     --evaluation-periods 3
   ```

## Performance Optimization

### Database Query Optimization

**When to Use**: Slow response times, high database CPU
**Duration**: 1-2 hours
**Prerequisites**: Database access, query analysis tools

#### Steps:

1. **Identify Slow Queries**
   ```bash
   # Check application logs for slow queries
   aws logs filter-log-events \
     --log-group-name "/aws/acso/production/agents" \
     --filter-pattern "slow query OR timeout"
   ```

2. **Analyze Query Performance**
   ```bash
   # Review database performance metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/RDS \
     --metric-name DatabaseConnections \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Average
   ```

3. **Implement Optimizations**
   - Add database indexes
   - Optimize query patterns
   - Implement caching
   - Update connection pooling

### Cache Optimization

**When to Use**: High response times, repeated data access patterns
**Duration**: 30-60 minutes

#### Steps:

1. **Analyze Cache Hit Rates**
   ```bash
   # Check cache performance metrics
   aws cloudwatch get-metric-statistics \
     --namespace AWS/ElastiCache \
     --metric-name CacheHitRate \
     --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
     --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
     --period 300 \
     --statistics Average
   ```

2. **Optimize Cache Configuration**
   - Adjust TTL values
   - Implement cache warming
   - Optimize cache key strategies

## Backup and Recovery

### Daily Backup Verification

**Frequency**: Daily (automated)
**Duration**: 10 minutes

#### Steps:

1. **Verify Backup Completion**
   ```bash
   # Check backup job status
   aws backup describe-backup-job \
     --backup-job-id [BACKUP-JOB-ID]
   ```

2. **Test Backup Integrity**
   ```bash
   # Verify backup files
   aws s3 ls s3://acso-production-backups/$(date +%Y/%m/%d)/
   ```

3. **Document Backup Status**
   - Update backup log
   - Note any failures
   - Verify retention policies

### Disaster Recovery Test

**Frequency**: Quarterly
**Duration**: 4-6 hours
**Prerequisites**: DR environment, backup data

#### Steps:

1. **Prepare DR Environment**
   ```bash
   # Deploy to DR region
   AWS_REGION=us-west-2 ENVIRONMENT=production ./scripts/deploy-to-ecs.sh
   ```

2. **Restore Data**
   ```bash
   # Restore from backup
   aws s3 sync s3://acso-production-backups/latest s3://acso-dr-restore
   ```

3. **Validate Recovery**
   ```bash
   # Run validation tests
   python scripts/production-validation.py --environment production --region us-west-2
   ```

4. **Document Results**
   - Recovery time objective (RTO)
   - Recovery point objective (RPO)
   - Issues encountered
   - Improvement recommendations

## Security Operations

### Security Patch Management

**Frequency**: Monthly or as needed
**Duration**: 2-4 hours
**Impact**: Service restart required

#### Steps:

1. **Review Security Updates**
   ```bash
   # Check for security updates
   docker run --rm -v $(pwd):/app python:3.11-slim pip-audit
   ```

2. **Test Updates**
   ```bash
   # Deploy to staging first
   ENVIRONMENT=staging ./scripts/deploy-to-ecs.sh
   
   # Run security validation
   python scripts/security-validation.py --environment staging
   ```

3. **Deploy to Production**
   ```bash
   # Deploy updates to production
   ENVIRONMENT=production ./scripts/deploy-to-ecs.sh
   ```

### Access Review

**Frequency**: Quarterly
**Duration**: 2-3 hours

#### Steps:

1. **Review IAM Policies**
   ```bash
   # List all ACSO-related roles
   aws iam list-roles --query 'Roles[?contains(RoleName, `acso`)]'
   ```

2. **Audit Permissions**
   ```bash
   # Check role policies
   aws iam list-attached-role-policies --role-name acso-production-execution-role
   ```

3. **Update Access Controls**
   - Remove unused permissions
   - Update role policies
   - Review cross-account access

## Maintenance Procedures

### Scheduled Maintenance Window

**Frequency**: Monthly
**Duration**: 2-3 hours
**Maintenance Window**: Sunday 2:00-5:00 AM UTC

#### Pre-Maintenance Checklist:

- [ ] Notify stakeholders
- [ ] Create backup
- [ ] Prepare rollback plan
- [ ] Test in staging environment

#### Maintenance Steps:

1. **System Backup**
   ```bash
   # Create full system backup
   ./scripts/create-backup.sh --environment production --type full
   ```

2. **Apply Updates**
   ```bash
   # Update infrastructure
   cd infrastructure/cdk
   cdk deploy --require-approval never
   
   # Update applications
   ENVIRONMENT=production ./scripts/deploy-to-ecs.sh
   ```

3. **Validation**
   ```bash
   # Run comprehensive tests
   python scripts/production-validation.py --environment production
   ```

4. **Post-Maintenance Verification**
   ```bash
   # Monitor system for 30 minutes
   python scripts/post-maintenance-monitoring.py --duration 30
   ```

## Emergency Procedures

### Complete System Outage

**Severity**: Critical
**Response Time**: Immediate

#### Immediate Actions:

1. **Assess Scope**
   ```bash
   # Check all services
   aws ecs describe-services --cluster acso-production-cluster
   ```

2. **Activate Incident Response**
   - Notify on-call team
   - Create incident ticket
   - Start incident bridge

3. **Implement Emergency Measures**
   ```bash
   # Activate DR site if necessary
   AWS_REGION=us-west-2 ./scripts/emergency-failover.sh
   ```

### Data Breach Response

**Severity**: Critical
**Response Time**: Immediate

#### Immediate Actions:

1. **Isolate Affected Systems**
   ```bash
   # Stop affected services
   aws ecs update-service \
     --cluster acso-production-cluster \
     --service acso-production-supervisor \
     --desired-count 0
   ```

2. **Preserve Evidence**
   ```bash
   # Create forensic backup
   ./scripts/forensic-backup.sh --environment production
   ```

3. **Notify Stakeholders**
   - Security team
   - Legal team
   - Compliance team
   - Customers (if required)

### Rollback Procedures

**When to Use**: Failed deployment, critical bugs, security issues
**Duration**: 10-15 minutes

#### Steps:

1. **Immediate Rollback**
   ```bash
   # Automated rollback
   ENVIRONMENT=production ./scripts/deploy-to-ecs.sh rollback
   ```

2. **Verify Rollback**
   ```bash
   # Check service status
   aws ecs describe-services --cluster acso-production-cluster
   
   # Run smoke tests
   python scripts/smoke-tests.py --environment production
   ```

3. **Post-Rollback Actions**
   - Document incident
   - Analyze root cause
   - Plan remediation

## Contact Information

### Emergency Contacts

- **On-Call Engineer**: [Phone/Slack]
- **Development Team Lead**: [Contact Info]
- **AWS Support**: [Support Case URL]
- **Security Team**: [Contact Info]

### Escalation Matrix

1. **Level 1**: On-call engineer
2. **Level 2**: Development team lead
3. **Level 3**: Engineering manager
4. **Level 4**: CTO/VP Engineering

---

*These runbooks should be reviewed and updated quarterly or after any major system changes.*