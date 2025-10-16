# ACSO CI/CD Pipeline Documentation

## Overview

The ACSO (Autonomous Cyber-Security & Service Orchestrator) project uses a comprehensive CI/CD pipeline built with GitHub Actions to ensure reliable, secure, and automated deployments across multiple environments.

## Pipeline Architecture

### Environments

- **Development**: Triggered on pushes to `develop` branch
- **Staging**: Triggered on pushes to `main` branch  
- **Production**: Triggered on GitHub releases

### Pipeline Stages

1. **Code Quality & Testing**
   - Code formatting check (Black)
   - Linting (Flake8)
   - Type checking (MyPy)
   - Security scanning (Bandit)
   - Unit tests with coverage (pytest)

2. **Build & Package**
   - Docker image building for all agents
   - Multi-stage builds for optimization
   - Push to Amazon ECR
   - Image tagging and versioning

3. **Deploy**
   - Environment-specific deployments
   - ECS service updates
   - Health checks and validation

4. **Validation**
   - Smoke tests (basic functionality)
   - Integration tests (end-to-end workflows)
   - Production validation (security & performance)

5. **Rollback** (on failure)
   - Automatic rollback to previous version
   - Service restoration
   - Notification of rollback

## Configuration

### Required Secrets

Configure these secrets in your GitHub repository:

```
AWS_ACCESS_KEY_ID       # AWS access key for deployment
AWS_SECRET_ACCESS_KEY   # AWS secret key for deployment
ECR_REGISTRY           # ECR registry URL (optional, auto-detected)
```

### Environment Variables

```yaml
PROJECT_NAME: acso
AWS_REGION: us-east-1
PYTHON_VERSION: '3.11'
```

## Test Scripts

### Smoke Tests (`scripts/smoke-tests.py`)

Basic health checks that verify core system functionality:

- ECS cluster existence and status
- Service running status
- CloudWatch logs configuration
- Bedrock connectivity
- Agent health endpoints

**Usage:**
```bash
python scripts/smoke-tests.py --environment development
python scripts/smoke-tests.py --environment staging --output smoke-results.json
```

### Integration Tests (`scripts/integration-tests.py`)

Comprehensive tests that validate end-to-end workflows:

- Supervisor agent coordination
- Threat detection workflow
- Service orchestration workflow
- Financial intelligence workflow
- Inter-agent communication
- Human approval workflow
- Monitoring and alerting
- Security and access control

**Usage:**
```bash
python scripts/integration-tests.py --environment staging
python scripts/integration-tests.py --environment production --output integration-results.json
```

### Production Validation (`scripts/production-validation.py`)

Critical validation tests for production deployments:

- Security compliance (IAM policies, least privilege)
- Encryption at rest (KMS configuration)
- High availability configuration
- Performance metrics and thresholds
- Disaster recovery readiness
- Monitoring and alerting configuration
- Network security (security groups, VPC)

**Usage:**
```bash
python scripts/production-validation.py --environment production
python scripts/production-validation.py --environment production --output validation-results.json
```

## Deployment Process

### Development Deployment

1. Push code to `develop` branch
2. Pipeline runs tests and builds images
3. Deploys to development environment
4. Runs smoke tests
5. Reports results

### Staging Deployment

1. Push code to `main` branch
2. Pipeline runs full test suite
3. Builds and tags images
4. Deploys to staging environment
5. Runs integration tests
6. Validates deployment

### Production Deployment

1. Create GitHub release
2. Pipeline builds production images
3. Deploys to production environment
4. Runs comprehensive validation tests
5. Monitors deployment health
6. Sends deployment notifications

## Rollback Process

If any deployment fails:

1. Pipeline automatically detects failure
2. Identifies the environment that failed
3. Rolls back to previous task definition
4. Waits for services to stabilize
5. Validates rollback success
6. Notifies team of rollback

**Manual Rollback:**
```bash
ENVIRONMENT=production ./scripts/deploy-to-ecs.sh rollback
```

## Monitoring and Observability

### Pipeline Monitoring

- GitHub Actions workflow status
- Test result artifacts
- Coverage reports
- Security scan results

### Deployment Monitoring

- ECS service health
- CloudWatch metrics
- Application logs
- Performance metrics

### Alerting

- Failed deployments
- Test failures
- Security issues
- Performance degradation

## Best Practices

### Code Quality

- All code must pass formatting checks (Black)
- Linting errors must be resolved (Flake8)
- Type hints required (MyPy)
- Security issues must be addressed (Bandit)
- Minimum 80% test coverage

### Security

- Secrets stored in GitHub Secrets
- IAM roles follow least privilege
- All data encrypted at rest
- Network security properly configured
- Regular security scanning

### Deployment

- Infrastructure as Code (CDK/CloudFormation)
- Blue-green deployments for zero downtime
- Automated rollback on failure
- Comprehensive validation testing
- Environment-specific configurations

## Troubleshooting

### Common Issues

**Build Failures:**
- Check code formatting and linting
- Verify all tests pass locally
- Review dependency conflicts

**Deployment Failures:**
- Verify AWS credentials and permissions
- Check ECS cluster and service status
- Review CloudWatch logs for errors

**Test Failures:**
- Check AWS service availability
- Verify environment configuration
- Review test logs for specific errors

### Debug Commands

```bash
# Check service status
./scripts/deploy-to-ecs.sh status

# View recent logs
aws logs tail /aws/acso/production/agents --follow

# Check ECS service events
aws ecs describe-services --cluster acso-production-cluster --services acso-production-supervisor
```

## Pipeline Metrics

### Success Metrics

- Deployment success rate
- Test pass rate
- Time to deployment
- Rollback frequency

### Quality Metrics

- Code coverage percentage
- Security scan results
- Performance benchmarks
- Error rates

## Future Enhancements

- [ ] Canary deployments
- [ ] A/B testing framework
- [ ] Performance regression testing
- [ ] Automated security compliance checks
- [ ] Multi-region deployment support
- [ ] Advanced monitoring and alerting
- [ ] Chaos engineering integration

## Support

For pipeline issues or questions:

1. Check GitHub Actions logs
2. Review CloudWatch logs
3. Consult this documentation
4. Contact the development team

---

*This documentation is maintained alongside the CI/CD pipeline and should be updated with any changes to the deployment process.*