# AWS Permissions and IAM Configuration

## Overview

This document outlines the required AWS IAM permissions, roles, and policies for the ACSO system. It follows the principle of least privilege to ensure security while providing necessary access for system operations.

## IAM Roles

### 1. ECS Execution Role

**Role Name**: `acso-{environment}-execution-role`
**Purpose**: Allows ECS to pull container images and write logs

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

**Attached Policies**:
- `AmazonECSTaskExecutionRolePolicy` (AWS Managed)
- Custom ECR access policy
- Custom CloudWatch logs policy

### 2. ECS Task Role

**Role Name**: `acso-{environment}-task-role`
**Purpose**: Provides runtime permissions for ACSO agents

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "ecs-tasks.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

### 3. Bedrock Agent Role

**Role Name**: `acso-{environment}-bedrock-role`
**Purpose**: Allows agents to interact with Amazon Bedrock services

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "bedrock.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
```

## IAM Policies

### 1. Bedrock Access Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "BedrockModelAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock:InvokeModel",
        "bedrock:InvokeModelWithResponseStream",
        "bedrock:ListFoundationModels",
        "bedrock:GetFoundationModel"
      ],
      "Resource": [
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-sonnet-20240229-v1:0",
        "arn:aws:bedrock:*::foundation-model/anthropic.claude-3-haiku-20240307-v1:0"
      ]
    },
    {
      "Sid": "BedrockAgentCoreAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock-agent:InvokeAgent",
        "bedrock-agent:GetAgent",
        "bedrock-agent:ListAgents",
        "bedrock-agent:CreateAgentSession",
        "bedrock-agent:DeleteAgentSession"
      ],
      "Resource": [
        "arn:aws:bedrock-agent:*:*:agent/*",
        "arn:aws:bedrock-agent:*:*:agent-session/*"
      ]
    },
    {
      "Sid": "BedrockMemoryAccess",
      "Effect": "Allow",
      "Action": [
        "bedrock-agent:GetMemory",
        "bedrock-agent:PutMemory",
        "bedrock-agent:DeleteMemory",
        "bedrock-agent:ListMemories"
      ],
      "Resource": [
        "arn:aws:bedrock-agent:*:*:memory/*"
      ]
    }
  ]
}
```

### 2. Systems Manager Access Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "SSMParameterAccess",
      "Effect": "Allow",
      "Action": [
        "ssm:GetParameter",
        "ssm:GetParameters",
        "ssm:GetParametersByPath"
      ],
      "Resource": [
        "arn:aws:ssm:*:*:parameter/acso/*"
      ]
    },
    {
      "Sid": "SSMCommandAccess",
      "Effect": "Allow",
      "Action": [
        "ssm:SendCommand",
        "ssm:GetCommandInvocation",
        "ssm:DescribeInstanceInformation",
        "ssm:ListCommandInvocations"
      ],
      "Resource": [
        "arn:aws:ssm:*:*:document/AWS-RunShellScript",
        "arn:aws:ssm:*:*:document/AWS-RunPowerShellScript",
        "arn:aws:ec2:*:*:instance/*"
      ],
      "Condition": {
        "StringEquals": {
          "ssm:ResourceTag/Environment": ["${aws:RequestedRegion}"]
        }
      }
    }
  ]
}
```

### 3. CloudWatch Access Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "CloudWatchLogsAccess",
      "Effect": "Allow",
      "Action": [
        "logs:CreateLogGroup",
        "logs:CreateLogStream",
        "logs:PutLogEvents",
        "logs:DescribeLogGroups",
        "logs:DescribeLogStreams"
      ],
      "Resource": [
        "arn:aws:logs:*:*:log-group:/aws/acso/*"
      ]
    },
    {
      "Sid": "CloudWatchMetricsAccess",
      "Effect": "Allow",
      "Action": [
        "cloudwatch:PutMetricData",
        "cloudwatch:GetMetricStatistics",
        "cloudwatch:ListMetrics"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "cloudwatch:namespace": ["ACSO/*", "AWS/ECS"]
        }
      }
    }
  ]
}
```

### 4. S3 Access Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "S3BucketAccess",
      "Effect": "Allow",
      "Action": [
        "s3:ListBucket",
        "s3:GetBucketLocation"
      ],
      "Resource": [
        "arn:aws:s3:::acso-*-data",
        "arn:aws:s3:::acso-*-backups",
        "arn:aws:s3:::acso-*-logs"
      ]
    },
    {
      "Sid": "S3ObjectAccess",
      "Effect": "Allow",
      "Action": [
        "s3:GetObject",
        "s3:PutObject",
        "s3:DeleteObject"
      ],
      "Resource": [
        "arn:aws:s3:::acso-*-data/*",
        "arn:aws:s3:::acso-*-backups/*",
        "arn:aws:s3:::acso-*-logs/*"
      ]
    }
  ]
}
```

### 5. KMS Access Policy

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "KMSKeyAccess",
      "Effect": "Allow",
      "Action": [
        "kms:Encrypt",
        "kms:Decrypt",
        "kms:ReEncrypt*",
        "kms:GenerateDataKey*",
        "kms:DescribeKey"
      ],
      "Resource": [
        "arn:aws:kms:*:*:key/*"
      ],
      "Condition": {
        "StringEquals": {
          "kms:ViaService": [
            "s3.*.amazonaws.com",
            "logs.*.amazonaws.com",
            "rds.*.amazonaws.com"
          ]
        }
      }
    }
  ]
}
```

### 6. GuardDuty Access Policy (Threat Hunter Agent)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "GuardDutyReadAccess",
      "Effect": "Allow",
      "Action": [
        "guardduty:GetDetector",
        "guardduty:ListDetectors",
        "guardduty:GetFindings",
        "guardduty:ListFindings",
        "guardduty:GetFindingsStatistics"
      ],
      "Resource": "*"
    },
    {
      "Sid": "CloudTrailReadAccess",
      "Effect": "Allow",
      "Action": [
        "cloudtrail:LookupEvents",
        "cloudtrail:GetTrailStatus",
        "cloudtrail:DescribeTrails"
      ],
      "Resource": "*"
    }
  ]
}
```

### 7. EC2 Access Policy (Incident Response Agent)

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "EC2InstanceControl",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeInstances",
        "ec2:StopInstances",
        "ec2:StartInstances",
        "ec2:RebootInstances",
        "ec2:TerminateInstances"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/Environment": ["production", "staging", "development"]
        }
      }
    },
    {
      "Sid": "SecurityGroupControl",
      "Effect": "Allow",
      "Action": [
        "ec2:DescribeSecurityGroups",
        "ec2:AuthorizeSecurityGroupIngress",
        "ec2:RevokeSecurityGroupIngress",
        "ec2:AuthorizeSecurityGroupEgress",
        "ec2:RevokeSecurityGroupEgress"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "ec2:ResourceTag/ManagedBy": ["ACSO"]
        }
      }
    }
  ]
}
```

## Service-Linked Roles

### ECS Service-Linked Role

AWS automatically creates this role when needed:
- **Role Name**: `AWSServiceRoleForECS`
- **Purpose**: Allows ECS to manage load balancers, security groups, and other resources

### Application Auto Scaling Service-Linked Role

- **Role Name**: `AWSServiceRoleForApplicationAutoScaling_ECSService`
- **Purpose**: Allows Application Auto Scaling to scale ECS services

## Cross-Account Access (if applicable)

### Cross-Account Role for DR

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "AWS": "arn:aws:iam::PRODUCTION-ACCOUNT:root"
      },
      "Action": "sts:AssumeRole",
      "Condition": {
        "StringEquals": {
          "sts:ExternalId": "acso-dr-access-key"
        }
      }
    }
  ]
}
```

## Permission Boundaries

### Developer Permission Boundary

```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowedServices",
      "Effect": "Allow",
      "Action": [
        "ecs:*",
        "ecr:*",
        "logs:*",
        "cloudwatch:*",
        "ssm:GetParameter*",
        "s3:GetObject",
        "s3:PutObject"
      ],
      "Resource": "*"
    },
    {
      "Sid": "DenyDestructiveActions",
      "Effect": "Deny",
      "Action": [
        "ecs:DeleteCluster",
        "ecs:DeleteService",
        "rds:DeleteDBInstance",
        "s3:DeleteBucket"
      ],
      "Resource": "*",
      "Condition": {
        "StringEquals": {
          "aws:RequestedRegion": ["us-east-1", "us-west-2"]
        }
      }
    }
  ]
}
```

## Security Best Practices

### 1. Principle of Least Privilege

- Grant only the minimum permissions required
- Use resource-specific ARNs where possible
- Implement condition statements to restrict access

### 2. Regular Permission Audits

```bash
# Audit IAM roles and policies
aws iam list-roles --query 'Roles[?contains(RoleName, `acso`)]'

# Check unused permissions
aws iam generate-service-last-accessed-details \
  --arn arn:aws:iam::ACCOUNT:role/acso-production-task-role
```

### 3. Rotation and Monitoring

- Rotate access keys regularly (if any are used)
- Monitor IAM usage with CloudTrail
- Set up alerts for privilege escalation attempts

### 4. Environment Separation

- Use separate roles for each environment
- Implement cross-environment access restrictions
- Use resource tags for fine-grained control

## Deployment Commands

### Create IAM Roles and Policies

```bash
# Create execution role
aws iam create-role \
  --role-name acso-production-execution-role \
  --assume-role-policy-document file://ecs-execution-trust-policy.json

# Attach managed policy
aws iam attach-role-policy \
  --role-name acso-production-execution-role \
  --policy-arn arn:aws:iam::aws:policy/service-role/AmazonECSTaskExecutionRolePolicy

# Create custom policy
aws iam create-policy \
  --policy-name AcsoBedrockAccess \
  --policy-document file://bedrock-access-policy.json

# Attach custom policy
aws iam attach-role-policy \
  --role-name acso-production-task-role \
  --policy-arn arn:aws:iam::ACCOUNT:policy/AcsoBedrockAccess
```

### Validate Permissions

```bash
# Test specific permissions
aws iam simulate-principal-policy \
  --policy-source-arn arn:aws:iam::ACCOUNT:role/acso-production-task-role \
  --action-names bedrock:InvokeModel \
  --resource-arns "*"

# Check effective permissions
aws iam get-account-authorization-details \
  --filter Role \
  --query 'Roles[?RoleName==`acso-production-task-role`]'
```

## Troubleshooting Permission Issues

### Common Permission Errors

1. **Access Denied for Bedrock**
   ```bash
   # Check Bedrock permissions
   aws iam list-attached-role-policies --role-name acso-production-task-role
   aws bedrock list-foundation-models --region us-east-1
   ```

2. **ECS Task Launch Failures**
   ```bash
   # Check execution role permissions
   aws iam get-role --role-name acso-production-execution-role
   aws ecr get-login-token --region us-east-1
   ```

3. **CloudWatch Logging Issues**
   ```bash
   # Check log group permissions
   aws logs describe-log-groups --log-group-name-prefix "/aws/acso"
   aws iam simulate-principal-policy \
     --policy-source-arn arn:aws:iam::ACCOUNT:role/acso-production-execution-role \
     --action-names logs:CreateLogStream,logs:PutLogEvents \
     --resource-arns "arn:aws:logs:*:*:log-group:/aws/acso/*"
   ```

## Compliance Considerations

### SOC 2 Compliance

- Implement least privilege access
- Regular access reviews and audits
- Proper segregation of duties
- Audit trail for all permission changes

### GDPR Compliance

- Data access controls
- Right to be forgotten implementation
- Data processing limitations
- Cross-border data transfer restrictions

### Industry-Specific Requirements

- Healthcare (HIPAA): Additional encryption and access controls
- Financial (PCI DSS): Enhanced monitoring and restrictions
- Government (FedRAMP): Additional security controls and auditing

---

*This permissions document should be reviewed quarterly and updated whenever new AWS services are integrated or security requirements change.*