# ACSO AWS Deployment Checklist

## Phase 4: Production Deployment Readiness

This checklist ensures your ACSO system is ready for AWS deployment.

## Pre-Deployment Checklist

### ✅ AWS Account Setup
- [ ] AWS Account with billing enabled
- [ ] AWS CLI installed and configured (`aws --version`)
- [ ] AWS credentials configured (`aws sts get-caller-identity`)
- [ ] Appropriate IAM permissions for deployment
- [ ] Bedrock access enabled in target region
- [ ] Service quotas checked (ECS, ECR, RDS limits)

### ✅ Local Environment
- [ ] Docker Desktop installed and running
- [ ] PowerShell 5.1+ (Windows) or Bash (Linux/Mac)
- [ ] Git repository access
- [ ] Internet connectivity for image pulls/pushes

### ✅ Code Preparation
- [ ] Latest code pulled from repository
- [ ] All Phase 3a integration tasks completed
- [ ] No uncommitted changes in working directory
- [ ] Version tagged (v3.0.0-phase3a)

## Deployment Options

### Option 1: Full Production Deployment
**Estimated Cost**: $800-1500/month
**Use Case**: Production workloads, high availability

```powershell
# Full deployment
.\scripts\setup-secrets.ps1 -Environment production
.\scripts\deploy-to-aws.ps1 -Environment production
```

### Option 2: Development Deployment
**Estimated Cost**: $150-300/month
**Use Case**: Development, testing, staging

```powershell
# Development deployment
.\scripts\setup-secrets.ps1 -Environment development
.\scripts\deploy-to-aws.ps1 -Environment development
```

### Option 3: Free Tier Deployment
**Estimated Cost**: $0-50/month
**Use Case**: Learning, proof of concept, minimal testing

```powershell
# Free tier optimization and deployment
.\scripts\free-tier-optimizer.ps1
.\scripts\deploy-free-tier.ps1
```

## Step-by-Step Deployment

### Step 1: Choose Deployment Type
- [ ] Review cost estimates above
- [ ] Select appropriate deployment option
- [ ] Verify AWS region selection (default: us-east-1)

### Step 2: Pre-Deployment Validation
```powershell
# Verify prerequisites
aws sts get-caller-identity
docker --version
git status

# Check Bedrock access
aws bedrock list-foundation-models --region us-east-1
```

### Step 3: Set Up Secrets
```powershell
# Create AWS secrets (choose your environment)
.\scripts\setup-secrets.ps1 -Environment development -AwsRegion us-east-1
```

### Step 4: Deploy Infrastructure
```powershell
# Deploy infrastructure first
.\scripts\deploy-to-aws.ps1 -Action infrastructure-only -Environment development
```

### Step 5: Build and Deploy Services
```powershell
# Build and deploy all services
.\scripts\deploy-to-aws.ps1 -Action deploy -Environment development
```

### Step 6: Verify Deployment
```powershell
# Run health checks
.\scripts\health-check.ps1 -Environment development
```

## Post-Deployment Checklist

### ✅ System Verification
- [ ] All ECS services running
- [ ] API endpoints responding
- [ ] WebSocket connections working
- [ ] Database connectivity verified
- [ ] CloudWatch logs flowing
- [ ] No critical errors in logs

### ✅ Security Configuration
- [ ] Security groups properly configured
- [ ] Secrets properly stored in AWS Secrets Manager
- [ ] IAM roles follow least privilege
- [ ] Encryption enabled for data at rest
- [ ] SSL/TLS configured for web traffic

### ✅ Monitoring Setup
- [ ] CloudWatch dashboards created
- [ ] Alarms configured for critical metrics
- [ ] Log retention policies set
- [ ] Cost monitoring enabled
- [ ] Performance baselines established

### ✅ Access Configuration
- [ ] Load balancer DNS name documented
- [ ] Admin user created
- [ ] Initial agent configurations set
- [ ] Test workflows created and verified

## Troubleshooting Common Issues

### Issue: ECS Tasks Not Starting
**Symptoms**: Tasks in PENDING or STOPPED state
**Solutions**:
- Check CloudWatch logs for error messages
- Verify security group allows required ports
- Ensure secrets are accessible
- Check resource limits (CPU/memory)

### Issue: Database Connection Failures
**Symptoms**: API returns database connection errors
**Solutions**:
- Verify RDS instance is running
- Check security group rules for database access
- Validate database credentials in secrets
- Ensure VPC configuration allows connectivity

### Issue: High Costs
**Symptoms**: Unexpected AWS charges
**Solutions**:
- Review CloudWatch cost dashboard
- Check for unused resources
- Consider Free Tier deployment for development
- Implement auto-scaling policies
- Use Spot instances where appropriate

### Issue: Performance Problems
**Symptoms**: Slow response times, timeouts
**Solutions**:
- Check CloudWatch metrics for resource utilization
- Scale up ECS services if needed
- Optimize database queries
- Review network latency
- Consider caching strategies

## Rollback Procedures

### Emergency Rollback
If deployment fails or causes issues:

```powershell
# Stop all services
aws ecs update-service --cluster acso-development-cluster --service acso-api-server --desired-count 0

# Rollback to previous image version
aws ecs update-service --cluster acso-development-cluster --service acso-api-server --task-definition acso-api-server:PREVIOUS_REVISION

# Restore from backup if needed
aws rds restore-db-instance-from-db-snapshot --db-instance-identifier acso-development-db-restored --db-snapshot-identifier BACKUP_SNAPSHOT_ID
```

### Planned Rollback
For planned rollbacks during maintenance:

1. Scale down services gracefully
2. Create database backup
3. Update task definitions to previous version
4. Scale services back up
5. Verify functionality

## Maintenance Schedule

### Daily
- [ ] Check CloudWatch alarms
- [ ] Review error logs
- [ ] Monitor resource utilization

### Weekly
- [ ] Review security logs
- [ ] Check for software updates
- [ ] Validate backup integrity
- [ ] Review cost reports

### Monthly
- [ ] Update container images
- [ ] Rotate secrets and credentials
- [ ] Review and optimize costs
- [ ] Performance tuning
- [ ] Security assessment

### Quarterly
- [ ] Disaster recovery testing
- [ ] Full security audit
- [ ] Capacity planning review
- [ ] Architecture optimization

## Support Resources

### AWS Documentation
- [ECS Best Practices](https://docs.aws.amazon.com/AmazonECS/latest/bestpracticesguide/)
- [RDS Security](https://docs.aws.amazon.com/AmazonRDS/latest/UserGuide/UsingWithRDS.html)
- [CloudWatch Monitoring](https://docs.aws.amazon.com/AmazonCloudWatch/latest/monitoring/)

### ACSO Documentation
- [Deployment Guide](docs/deployment-guide.md)
- [System Architecture](docs/system-architecture.md)
- [Troubleshooting Guide](docs/troubleshooting-guide.md)

### Emergency Contacts
- AWS Support: [AWS Support Center](https://console.aws.amazon.com/support/)
- ACSO Team: [Create GitHub Issue](https://github.com/your-org/acso/issues)

---

**Remember**: Always test deployments in a development environment before deploying to production!