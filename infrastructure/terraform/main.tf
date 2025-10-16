# ACSO Infrastructure with Terraform

terraform {
  required_version = ">= 1.0"
  required_providers {
    aws = {
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }
  }
}

provider "aws" {
  region = var.aws_region
  
  default_tags {
    tags = {
      Project     = var.project_name
      Environment = var.environment
      ManagedBy   = "terraform"
    }
  }
}

# Variables
variable "aws_region" {
  description = "AWS region"
  type        = string
  default     = "us-east-1"
}

variable "environment" {
  description = "Environment name"
  type        = string
  default     = "development"
  
  validation {
    condition     = contains(["development", "staging", "production"], var.environment)
    error_message = "Environment must be development, staging, or production."
  }
}

variable "project_name" {
  description = "Project name"
  type        = string
  default     = "acso"
}

variable "bedrock_model_id" {
  description = "Bedrock model ID for AI agents"
  type        = string
  default     = "anthropic.claude-3-sonnet-20240229-v1:0"
}

# Data sources
data "aws_caller_identity" "current" {}
data "aws_availability_zones" "available" {
  state = "available"
}

# IAM Role for ACSO Execution
resource "aws_iam_role" "acso_execution_role" {
  name = "${var.project_name}-${var.environment}-execution-role"
  
  assume_role_policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Action = "sts:AssumeRole"
        Effect = "Allow"
        Principal = {
          Service = [
            "lambda.amazonaws.com",
            "bedrock.amazonaws.com", 
            "ecs-tasks.amazonaws.com"
          ]
        }
      }
    ]
  })
}

# IAM Policies
resource "aws_iam_role_policy_attachment" "lambda_basic_execution" {
  role       = aws_iam_role.acso_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
}

resource "aws_iam_role_policy_attachment" "cloudwatch_logs_full_access" {
  role       = aws_iam_role.acso_execution_role.name
  policy_arn = "arn:aws:iam::aws:policy/CloudWatchLogsFullAccess"
}

resource "aws_iam_role_policy" "bedrock_access" {
  name = "ACSOBedrockAccess"
  role = aws_iam_role.acso_execution_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "bedrock:InvokeModel",
          "bedrock:InvokeAgent",
          "bedrock:CreateAgent", 
          "bedrock:UpdateAgent",
          "bedrock:GetAgent",
          "bedrock:ListAgents"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_iam_role_policy" "cloudwatch_access" {
  name = "ACSOCloudWatchAccess"
  role = aws_iam_role.acso_execution_role.id
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Effect = "Allow"
        Action = [
          "logs:CreateLogGroup",
          "logs:CreateLogStream",
          "logs:PutLogEvents", 
          "logs:DescribeLogGroups",
          "logs:DescribeLogStreams",
          "cloudwatch:PutMetricData",
          "cloudwatch:GetMetricStatistics"
        ]
        Resource = "*"
      }
    ]
  })
}

# KMS Key for Encryption
resource "aws_kms_key" "acso_kms_key" {
  description             = "ACSO encryption key"
  deletion_window_in_days = var.environment == "production" ? 30 : 7
  
  policy = jsonencode({
    Version = "2012-10-17"
    Statement = [
      {
        Sid    = "Enable IAM User Permissions"
        Effect = "Allow"
        Principal = {
          AWS = "arn:aws:iam::${data.aws_caller_identity.current.account_id}:root"
        }
        Action   = "kms:*"
        Resource = "*"
      },
      {
        Sid    = "Allow ACSO services"
        Effect = "Allow"
        Principal = {
          AWS = aws_iam_role.acso_execution_role.arn
        }
        Action = [
          "kms:Encrypt",
          "kms:Decrypt", 
          "kms:ReEncrypt*",
          "kms:GenerateDataKey*",
          "kms:DescribeKey"
        ]
        Resource = "*"
      }
    ]
  })
}

resource "aws_kms_alias" "acso_kms_key_alias" {
  name          = "alias/${var.project_name}-${var.environment}-key"
  target_key_id = aws_kms_key.acso_kms_key.key_id
}

# CloudWatch Log Group
resource "aws_cloudwatch_log_group" "acso_log_group" {
  name              = "/aws/${var.project_name}/${var.environment}/agents"
  retention_in_days = 30
  kms_key_id        = aws_kms_key.acso_kms_key.arn
}

# S3 Bucket for Artifacts
resource "aws_s3_bucket" "acso_artifacts_bucket" {
  bucket = "${var.project_name}-${var.environment}-artifacts-${data.aws_caller_identity.current.account_id}"
}

resource "aws_s3_bucket_encryption_configuration" "acso_artifacts_bucket_encryption" {
  bucket = aws_s3_bucket.acso_artifacts_bucket.id
  
  rule {
    apply_server_side_encryption_by_default {
      kms_master_key_id = aws_kms_key.acso_kms_key.arn
      sse_algorithm     = "aws:kms"
    }
  }
}

resource "aws_s3_bucket_public_access_block" "acso_artifacts_bucket_pab" {
  bucket = aws_s3_bucket.acso_artifacts_bucket.id
  
  block_public_acls       = true
  block_public_policy     = true
  ignore_public_acls      = true
  restrict_public_buckets = true
}

resource "aws_s3_bucket_versioning" "acso_artifacts_bucket_versioning" {
  bucket = aws_s3_bucket.acso_artifacts_bucket.id
  versioning_configuration {
    status = "Enabled"
  }
}

# DynamoDB Table for Agent State
resource "aws_dynamodb_table" "acso_agent_state_table" {
  name           = "${var.project_name}-${var.environment}-agent-state"
  billing_mode   = "PAY_PER_REQUEST"
  hash_key       = "agent_id"
  range_key      = "timestamp"
  
  attribute {
    name = "agent_id"
    type = "S"
  }
  
  attribute {
    name = "timestamp"
    type = "S"
  }
  
  stream_enabled   = true
  stream_view_type = "NEW_AND_OLD_IMAGES"
  
  point_in_time_recovery {
    enabled = true
  }
  
  server_side_encryption {
    enabled     = true
    kms_key_arn = aws_kms_key.acso_kms_key.arn
  }
}

# SQS Queues
resource "aws_sqs_queue" "acso_task_dlq" {
  name                      = "${var.project_name}-${var.environment}-tasks-dlq"
  message_retention_seconds = 1209600  # 14 days
  kms_master_key_id        = aws_kms_key.acso_kms_key.key_id
}

resource "aws_sqs_queue" "acso_task_queue" {
  name                      = "${var.project_name}-${var.environment}-tasks"
  visibility_timeout_seconds = 300
  message_retention_seconds = 1209600  # 14 days
  kms_master_key_id        = aws_kms_key.acso_kms_key.key_id
  
  redrive_policy = jsonencode({
    deadLetterTargetArn = aws_sqs_queue.acso_task_dlq.arn
    maxReceiveCount     = 3
  })
}

# EventBridge Event Bus
resource "aws_cloudwatch_event_bus" "acso_event_bus" {
  name = "${var.project_name}-${var.environment}-events"
}

# VPC and Networking
resource "aws_vpc" "acso_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-vpc"
  }
}

resource "aws_subnet" "acso_private_subnet_1" {
  vpc_id            = aws_vpc.acso_vpc.id
  cidr_block        = "10.0.1.0/24"
  availability_zone = data.aws_availability_zones.available.names[0]
  
  tags = {
    Name = "${var.project_name}-${var.environment}-private-subnet-1"
  }
}

resource "aws_subnet" "acso_private_subnet_2" {
  vpc_id            = aws_vpc.acso_vpc.id
  cidr_block        = "10.0.2.0/24"
  availability_zone = data.aws_availability_zones.available.names[1]
  
  tags = {
    Name = "${var.project_name}-${var.environment}-private-subnet-2"
  }
}

resource "aws_subnet" "acso_public_subnet_1" {
  vpc_id                  = aws_vpc.acso_vpc.id
  cidr_block              = "10.0.101.0/24"
  availability_zone       = data.aws_availability_zones.available.names[0]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-public-subnet-1"
  }
}

resource "aws_subnet" "acso_public_subnet_2" {
  vpc_id                  = aws_vpc.acso_vpc.id
  cidr_block              = "10.0.102.0/24"
  availability_zone       = data.aws_availability_zones.available.names[1]
  map_public_ip_on_launch = true
  
  tags = {
    Name = "${var.project_name}-${var.environment}-public-subnet-2"
  }
}

# Internet Gateway
resource "aws_internet_gateway" "acso_igw" {
  vpc_id = aws_vpc.acso_vpc.id
  
  tags = {
    Name = "${var.project_name}-${var.environment}-igw"
  }
}

# NAT Gateway
resource "aws_eip" "acso_nat_eip" {
  domain = "vpc"
  
  tags = {
    Name = "${var.project_name}-${var.environment}-nat-eip"
  }
}

resource "aws_nat_gateway" "acso_nat_gateway" {
  allocation_id = aws_eip.acso_nat_eip.id
  subnet_id     = aws_subnet.acso_public_subnet_1.id
  
  tags = {
    Name = "${var.project_name}-${var.environment}-nat-gateway"
  }
  
  depends_on = [aws_internet_gateway.acso_igw]
}

# Route Tables
resource "aws_route_table" "acso_public_rt" {
  vpc_id = aws_vpc.acso_vpc.id
  
  route {
    cidr_block = "0.0.0.0/0"
    gateway_id = aws_internet_gateway.acso_igw.id
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-public-rt"
  }
}

resource "aws_route_table" "acso_private_rt" {
  vpc_id = aws_vpc.acso_vpc.id
  
  route {
    cidr_block     = "0.0.0.0/0"
    nat_gateway_id = aws_nat_gateway.acso_nat_gateway.id
  }
  
  tags = {
    Name = "${var.project_name}-${var.environment}-private-rt"
  }
}

# Route Table Associations
resource "aws_route_table_association" "acso_public_rta_1" {
  subnet_id      = aws_subnet.acso_public_subnet_1.id
  route_table_id = aws_route_table.acso_public_rt.id
}

resource "aws_route_table_association" "acso_public_rta_2" {
  subnet_id      = aws_subnet.acso_public_subnet_2.id
  route_table_id = aws_route_table.acso_public_rt.id
}

resource "aws_route_table_association" "acso_private_rta_1" {
  subnet_id      = aws_subnet.acso_private_subnet_1.id
  route_table_id = aws_route_table.acso_private_rt.id
}

resource "aws_route_table_association" "acso_private_rta_2" {
  subnet_id      = aws_subnet.acso_private_subnet_2.id
  route_table_id = aws_route_table.acso_private_rt.id
}

# ECR Repository
resource "aws_ecr_repository" "acso_repository" {
  name                 = "${var.project_name}-${var.environment}"
  image_tag_mutability = "MUTABLE"
  
  image_scanning_configuration {
    scan_on_push = true
  }
  
  lifecycle_policy {
    policy = jsonencode({
      rules = [
        {
          rulePriority = 1
          description  = "Keep only 10 images"
          selection = {
            tagStatus   = "any"
            countType   = "imageCountMoreThan"
            countNumber = 10
          }
          action = {
            type = "expire"
          }
        }
      ]
    })
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "acso_cluster" {
  name = "${var.project_name}-${var.environment}-cluster"
  
  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# API Gateway
resource "aws_api_gateway_rest_api" "acso_api_gateway" {
  name        = "${var.project_name}-${var.environment}-api"
  description = "ACSO API Gateway"
  
  endpoint_configuration {
    types = ["REGIONAL"]
  }
}

# Outputs
output "execution_role_arn" {
  description = "ARN of the ACSO execution role"
  value       = aws_iam_role.acso_execution_role.arn
}

output "kms_key_id" {
  description = "KMS Key ID for ACSO encryption"
  value       = aws_kms_key.acso_kms_key.key_id
}

output "log_group_name" {
  description = "CloudWatch Log Group for ACSO"
  value       = aws_cloudwatch_log_group.acso_log_group.name
}

output "artifacts_bucket" {
  description = "S3 Bucket for ACSO artifacts"
  value       = aws_s3_bucket.acso_artifacts_bucket.bucket
}

output "agent_state_table" {
  description = "DynamoDB table for agent state"
  value       = aws_dynamodb_table.acso_agent_state_table.name
}

output "task_queue_url" {
  description = "SQS Queue URL for tasks"
  value       = aws_sqs_queue.acso_task_queue.url
}

output "vpc_id" {
  description = "VPC ID for ACSO"
  value       = aws_vpc.acso_vpc.id
}

output "private_subnet_ids" {
  description = "Private subnet IDs"
  value       = [aws_subnet.acso_private_subnet_1.id, aws_subnet.acso_private_subnet_2.id]
}

output "ecr_repository_url" {
  description = "ECR Repository URL for ACSO images"
  value       = aws_ecr_repository.acso_repository.repository_url
}

output "ecs_cluster_name" {
  description = "ECS Cluster name for ACSO"
  value       = aws_ecs_cluster.acso_cluster.name
}

output "api_gateway_url" {
  description = "API Gateway URL for ACSO"
  value       = aws_api_gateway_rest_api.acso_api_gateway.execution_arn
}