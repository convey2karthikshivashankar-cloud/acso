# ACSO Deployment Troubleshooting Guide

## Common Issues and Solutions

### 1. "Frontend directory not found" Error

**Problem**: The deployment script can't find the frontend directory.

**Solution**:
```bash
# Make sure you're in the project root directory
cd /path/to/acso

# Verify the directory structure
ls -la
# You should see: frontend/, scripts/, src/, etc.

# Run the deployment script from the root
./scripts/quick-demo-deploy.sh
```

**Alternative**: If you're in the scripts directory:
```bash
cd ..  # Go back to project root
./scripts/quick-demo-deploy.sh
```

### 2. "npm install failed" Error

**Problem**: Frontend dependencies can't be installed.

**Solutions**:
```bash
# Check Node.js version (requires 18+)
node --version

# Clear npm cache
npm cache clean --force

# Try manual installation
cd frontend
npm install
npm run build
cd ..
./scripts/quick-demo-deploy.sh --skip-build
```

### 3. "AWS credentials not configured" Error

**Problem**: AWS CLI is not configured properly.

**Solutions**:
```bash
# Configure AWS CLI
aws configure

# Or set environment variables
export AWS_ACCESS_KEY_ID=your_access_key
export AWS_SECRET_ACCESS_KEY=your_secret_key
export AWS_DEFAULT_REGION=us-east-1

# Test credentials
aws sts get-caller-identity
```

### 4. "CloudFormation deployment failed" Error

**Problem**: Infrastructure deployment failed.

**Solutions**:
```bash
# Check CloudFormation events
aws cloudformation describe-stack-events --stack-name acso-demo

# Delete failed stack and retry
aws cloudformation delete-stack --stack-name acso-demo
aws cloudformation wait stack-delete-complete --stack-name acso-demo
./scripts/quick-demo-deploy.sh

# Use different stack name
./scripts/quick-demo-deploy.sh --stack-name acso-demo-2
```

### 5. "Bedrock not available in region" Error

**Problem**: Amazon Bedrock is not available in the selected region.

**Solutions**:
```bash
# Use a Bedrock-supported region
./scripts/quick-demo-deploy.sh --region us-east-1
# or
./scripts/quick-demo-deploy.sh --region us-west-2
```

### 6. "Permission denied" Errors

**Problem**: Insufficient AWS permissions.

**Required Permissions**:
- CloudFormation: Full access
- S3: Full access
- CloudFront: Full access
- IAM: Create/manage roles
- Bedrock: Full access
- Budgets: Create budgets

**Solution**: Attach the following AWS managed policies to your user:
- `PowerUserAccess` (recommended for demo)
- Or specific policies: `AmazonS3FullAccess`, `CloudFrontFullAccess`, `AmazonBedrockFullAccess`, etc.

### 7. "Frontend build failed" Error

**Problem**: TypeScript or build errors in the frontend.

**Solutions**:
```bash
# Check for TypeScript errors
cd frontend
npm run type-check

# Fix linting issues
npm run lint:fix

# Try building manually
npm run build

# Skip build if needed
cd ..
./scripts/quick-demo-deploy.sh --skip-build
```

### 8. Cost Concerns

**Problem**: Worried about AWS costs.

**Solutions**:
```bash
# Set a lower budget limit
./scripts/quick-demo-deploy.sh --budget-limit 50

# Monitor costs
./scripts/monitor-demo-costs.sh

# Clean up resources when done
aws cloudformation delete-stack --stack-name acso-demo
```

## Directory Structure Verification

Your project should look like this:
```
acso/
├── frontend/
│   ├── src/
│   ├── package.json
│   └── ...
├── scripts/
│   ├── quick-demo-deploy.sh
│   └── ...
├── src/
├── docs/
├── README.md
└── ...
```

## Getting Help

1. **Check the logs**: The script provides verbose output with `--verbose` flag
2. **Run health checks**: Use `./scripts/health-check.sh` after deployment
3. **Monitor costs**: Use `./scripts/monitor-demo-costs.sh`
4. **Clean up**: Delete the CloudFormation stack when done

## Manual Deployment Steps

If the automated script fails, you can deploy manually:

1. **Build Frontend**:
```bash
cd frontend
npm install
npm run build
cd ..
```

2. **Deploy Infrastructure**:
```bash
aws cloudformation deploy \
  --template-file infrastructure/cloudformation/acso-demo-infrastructure.yaml \
  --stack-name acso-demo \
  --capabilities CAPABILITY_IAM CAPABILITY_NAMED_IAM
```

3. **Upload Frontend**:
```bash
# Get bucket name from CloudFormation outputs
BUCKET=$(aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text)
aws s3 sync frontend/dist/ s3://$BUCKET/
```

4. **Test Deployment**:
```bash
# Get frontend URL
aws cloudformation describe-stacks --stack-name acso-demo --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text
```