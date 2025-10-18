# ACSO AWS Deployment Guide

## Phase 4: Production Deployment to AWS

This guide provides step-by-step instructions for deploying the ACSO (Autonomous Cyber-Security & Service Orchestrator) system to AWS.

## Prerequisites

### 1. AWS Account Setup
- AWS Account with appropriate permissions
- AWS CLI installed and configured
- Docker installed and running
- Git repository access

### 2. Required AWS Permissions
Your AWS user/role needs the following permissions:
- ECS Full Access
- ECR Full Access
- CloudFormation Full Access
- IAM permissions for role creation
- Secrets Manager Full Access
- RDS permissions
- ElastiCache permissions
- CloudWatch Logs permissions
- Bedrock permissions

### 3. Local Environment
- PowerShell 5.1+ (Windows) or Bash (Linux/Mac)
- Docker Desktop
- Git
- AWS CLI v2

## Deployment Steps

### Step 1: Verify Prerequisites

```powershell
# Check AWS CLI
aws --version

# Check Docker
docker --version

# Verify AWS credentials
aws sts get-caller-identity

# Check if you can access Bedrock
aws bedrock list-foundation-models --region us-east-1
```

### Step 2: Clone and Prepare Repository

```powershell
# Navigate to your ACSO directory
cd C:\code\acso\acso

# Ensure you're on the latest version
git pull origin main

# Verify you have the v3.0.0-phase3a tag
git tag --list | Select-String "v3.0.0"
```

### Step 3: Set Up AWS Secrets

```powershell
# Run the secrets setup script
.\scripts\setup-secrets.ps1 -Environment development -AwsRegion us-east-1
```

This script will create the following secrets in AWS Secrets Manager:
- Database password
- JWT secret key
- Redis password
- Bedrock model configuration

### Step 4: Deploy Infrastructure

```powershell
# Deploy only the infrastructure first
.\scripts\deploy-to-aws.ps1 -Action infrastructure-only -Environment development -AwsRegion us-east-1
```

This will create:
- VPC and networking components
- ECS cluster
- RDS database
- ElastiCache Redis cluster
- IAM roles and policies
- CloudWatch log groups
- S3 buckets for artifacts

### Step 5: Build and Push Container Images

```powershell
# Build and push all container images to ECR
.\scripts\deploy-to-aws.ps1 -Action build-only -Environment development -AwsRegion us-east-1
```

This will:
- Create ECR repositories
- Build Docker images for all services
- Push images to ECR with proper tags

### Step 6: Deploy Services

```powershell
# Deploy the complete system
.\scripts\deploy-to-aws.ps1 -Action deploy -Environment development -AwsRegion us-east-1
```

This will:
- Deploy all ECS services
- Configure load balancers
- Set up service discovery
- Configure auto-scaling

### Step 7: Verify Deployment

```powershell
# Run comprehensive health checks
.\scripts\health-check.ps1 -Environment development -AwsRegion us-east-1
```

## Post-Deployment Configuration

### 1. Access the System

After successful deployment, you can access ACSO through:

- **Web Interface**: `https://your-alb-dns-name`
- **API Endpoints**: `https://your-alb-dns-name/api`
- **WebSocket**: `wss://your-alb-dns-name/ws`

### 2. Initial Setup

1. **Create Admin User**: Use the API to create the first admin user
2. **Configure Agents**: Set up agent configurations through the web interface
3. **Test Workflows**: Create and test basic workflows
4. **Monitor Logs**: Check CloudWatch logs for any issues

### 3. Security Configuration

1. **Update Security Groups**: Restrict access to necessary ports only
2. **Configure WAF**: Set up AWS WAF rules for additional protection
3. **Enable GuardDuty**: Enable AWS GuardDuty for threat detection
4. **Set up CloudTrail**: Enable CloudTrail for audit logging

## Monitoring and Maintenance

### CloudWatch Dashboards

The deployment creates CloudWatch dashboards for:
- ECS service metrics
- Application performance metrics
- Database performance
- Redis performance
- Custom business metrics

### Alerts and Notifications

Set up CloudWatch alarms for:
- High CPU/memory usage
- Service failures
- Database connection issues
- API error rates

### Log Management

Logs are centralized in CloudWatch Logs:
- `/aws/acso/development/agents` - Agent logs
- `/aws/ecs/acso-api-server` - API server logs
- `/aws/rds/instance/acso-development-db/error` - Database logs

## Scaling Configuration

### Auto Scaling

The deployment includes auto-scaling policies:
- **Target CPU Utilization**: 70%
- **Scale Up Cooldown**: 5 minutes
- **Scale Down Cooldown**: 5 minutes
- **Min Capacity**: 1 task per service
- **Max Capacity**: 10 tasks per service

### Manual Scaling

To manually scale services:

```powershell
# Scale API server to 3 tasks
aws ecs update-service --cluster acso-development-cluster --service acso-api-server --desired-count 3
```

## Troubleshooting

### Common Issues

1. **Service Won't Start**
   - Check CloudWatch logs
   - Verify secrets are accessible
   - Check security group rules

2. **Database Connection Issues**
   - Verify RDS instance is running
   - Check security group rules
   - Verify secrets contain correct credentials

3. **High Memory Usage**
   - Check for memory leaks in logs
   - Consider increasing task memory
   - Review agent configurations

### Debugging Commands

```powershell
# Check ECS service status
aws ecs describe-services --cluster acso-development-cluster --services acso-api-server

# View recent logs
aws logs tail /aws/acso/development/agents --follow

# Check task health
aws ecs describe-tasks --cluster acso-development-cluster --tasks task-id

# Connect to running container
aws ecs execute-command --cluster acso-development-cluster --task task-id --container acso-api-server --interactive --command "/bin/bash"
```

## Backup and Disaster Recovery

### Automated Backups

- **RDS**: Automated backups with 7-day retention
- **Configuration**: Stored in S3 with versioning
- **Secrets**: Managed by AWS Secrets Manager with automatic rotation

### Manual Backup

```powershell
# Create manual RDS snapshot
aws rds create-db-snapshot --db-instance-identifier acso-development-db --db-snapshot-identifier acso-manual-backup-$(Get-Date -Format "yyyyMMdd-HHmmss")

# Export configuration
aws s3 cp config/ s3://acso-development-artifacts-123456789/backups/config/ --recursive
```

## Cost Optimization

### Development Environment (FREE TIER OPTIMIZED)

Estimated monthly cost: $0-50 (within free tier limits)
- ECS Fargate: $0 (within free tier - 20GB-hours per month)
- RDS t3.micro: $0 (within free tier - 750 hours per month)
- ElastiCache t3.micro: $0 (within free tier - 750 hours per month)
- Data transfer: $0-5 (1GB free per month)
- CloudWatch: $0-5 (basic monitoring free)
- Bedrock usage: $0-100 (your allocated budget)

### Production Environment

Estimated monthly cost: $800-1500
- ECS Fargate: $300-600
- RDS r5.large: $200-400
- ElastiCache r5.large: $150-300
- Load Balancer: $20-30
- Data transfer: $50-100
- CloudWatch: $20-50

### Cost Reduction Tips

1. Use Spot instances for non-critical workloads
2. Schedule development environment shutdown
3. Use Reserved Instances for predictable workloads
4. Monitor and optimize data transfer costs
5. Use S3 Intelligent Tiering for artifacts

## Security Best Practices

1. **Network Security**
   - Use private subnets for all services
   - Implement least-privilege security groups
   - Enable VPC Flow Logs

2. **Data Protection**
   - Enable encryption at rest for all data stores
   - Use KMS for key management
   - Implement proper backup encryption

3. **Access Control**
   - Use IAM roles instead of access keys
   - Implement least-privilege policies
   - Enable MFA for administrative access

4. **Monitoring**
   - Enable CloudTrail for all API calls
   - Set up GuardDuty for threat detection
   - Monitor for unusual access patterns

## Support and Maintenance

### Regular Maintenance Tasks

1. **Weekly**
   - Review CloudWatch metrics
   - Check for security updates
   - Verify backup integrity

2. **Monthly**
   - Update container images
   - Review and rotate secrets
   - Analyze cost reports

3. **Quarterly**
   - Security assessment
   - Performance optimization
   - Disaster recovery testing

### Getting Help

1. Check CloudWatch logs first
2. Review this deployment guide
3. Check AWS service health dashboard
4. Contact your AWS support team if needed

## Next Steps

After successful deployment:

1. **Phase 3b Implementation**: Implement remaining integration tasks (7-11)
2. **Custom Workflows**: Create organization-specific workflows
3. **Integration**: Connect with existing security tools
4. **Training**: Train team members on ACSO usage
5. **Optimization**: Fine-tune performance and costs

---

**Note**: This deployment guide assumes a development environment. For production deployments, additional considerations for high availability, disaster recovery, and security hardening should be implemented.