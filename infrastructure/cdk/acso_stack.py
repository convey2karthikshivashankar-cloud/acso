"""
AWS CDK Stack for ACSO Infrastructure
"""

from aws_cdk import (
    Stack,
    Duration,
    RemovalPolicy,
    aws_iam as iam,
    aws_kms as kms,
    aws_logs as logs,
    aws_s3 as s3,
    aws_dynamodb as dynamodb,
    aws_events as events,
    aws_sqs as sqs,
    aws_apigateway as apigateway,
    aws_ec2 as ec2,
    aws_ecs as ecs,
    aws_ecr as ecr,
    aws_lambda as lambda_,
    aws_bedrock as bedrock,
    CfnOutput
)
from constructs import Construct


class ACSOStack(Stack):
    """CDK Stack for ACSO infrastructure."""

    def __init__(self, scope: Construct, construct_id: str, 
                 environment: str = "development", **kwargs) -> None:
        super().__init__(scope, construct_id, **kwargs)
        
        self.environment = environment
        self.project_name = "acso"
        
        # Create core infrastructure
        self._create_iam_roles()
        self._create_encryption_key()
        self._create_logging()
        self._create_storage()
        self._create_messaging()
        self._create_networking()
        self._create_container_infrastructure()
        self._create_api_gateway()
        
    def _create_iam_roles(self):
        """Create IAM roles and policies."""
        
        # ACSO Execution Role
        self.execution_role = iam.Role(
            self, "ACSOExecutionRole",
            role_name=f"{self.project_name}-{self.environment}-execution-role",
            assumed_by=iam.CompositePrincipal(
                iam.ServicePrincipal("lambda.amazonaws.com"),
                iam.ServicePrincipal("bedrock.amazonaws.com"),
                iam.ServicePrincipal("ecs-tasks.amazonaws.com")
            ),
            managed_policies=[
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "service-role/AWSLambdaBasicExecutionRole"
                ),
                iam.ManagedPolicy.from_aws_managed_policy_name(
                    "CloudWatchLogsFullAccess"
                )
            ]
        )
        
        # Bedrock permissions
        self.execution_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "bedrock:InvokeModel",
                    "bedrock:InvokeAgent", 
                    "bedrock:CreateAgent",
                    "bedrock:UpdateAgent",
                    "bedrock:GetAgent",
                    "bedrock:ListAgents"
                ],
                resources=["*"]
            )
        )
        
        # CloudWatch permissions
        self.execution_role.add_to_policy(
            iam.PolicyStatement(
                effect=iam.Effect.ALLOW,
                actions=[
                    "logs:CreateLogGroup",
                    "logs:CreateLogStream", 
                    "logs:PutLogEvents",
                    "logs:DescribeLogGroups",
                    "logs:DescribeLogStreams",
                    "cloudwatch:PutMetricData",
                    "cloudwatch:GetMetricStatistics"
                ],
                resources=["*"]
            )
        )
        
    def _create_encryption_key(self):
        """Create KMS encryption key."""
        
        self.kms_key = kms.Key(
            self, "ACSOKMSKey",
            description="ACSO encryption key",
            removal_policy=RemovalPolicy.DESTROY if self.environment == "development" else RemovalPolicy.RETAIN
        )
        
        # Grant access to execution role
        self.kms_key.grant_encrypt_decrypt(self.execution_role)
        
        # Create alias
        self.kms_key_alias = kms.Alias(
            self, "ACSOKMSKeyAlias",
            alias_name=f"alias/{self.project_name}-{self.environment}-key",
            target_key=self.kms_key
        )
        
    def _create_logging(self):
        """Create CloudWatch log groups."""
        
        self.log_group = logs.LogGroup(
            self, "ACSOLogGroup",
            log_group_name=f"/aws/{self.project_name}/{self.environment}/agents",
            retention=logs.RetentionDays.ONE_MONTH,
            removal_policy=RemovalPolicy.DESTROY
        )
        
    def _create_storage(self):
        """Create S3 buckets and DynamoDB tables."""
        
        # S3 Bucket for artifacts
        self.artifacts_bucket = s3.Bucket(
            self, "ACSOArtifactsBucket",
            bucket_name=f"{self.project_name}-{self.environment}-artifacts-{self.account}",
            encryption=s3.BucketEncryption.KMS,
            encryption_key=self.kms_key,
            block_public_access=s3.BlockPublicAccess.BLOCK_ALL,
            versioned=True,
            removal_policy=RemovalPolicy.DESTROY if self.environment == "development" else RemovalPolicy.RETAIN
        )
        
        # DynamoDB table for agent state
        self.agent_state_table = dynamodb.Table(
            self, "ACSOAgentStateTable",
            table_name=f"{self.project_name}-{self.environment}-agent-state",
            partition_key=dynamodb.Attribute(
                name="agent_id",
                type=dynamodb.AttributeType.STRING
            ),
            sort_key=dynamodb.Attribute(
                name="timestamp", 
                type=dynamodb.AttributeType.STRING
            ),
            billing_mode=dynamodb.BillingMode.PAY_PER_REQUEST,
            stream=dynamodb.StreamViewType.NEW_AND_OLD_IMAGES,
            point_in_time_recovery=True,
            encryption=dynamodb.TableEncryption.CUSTOMER_MANAGED,
            encryption_key=self.kms_key,
            removal_policy=RemovalPolicy.DESTROY if self.environment == "development" else RemovalPolicy.RETAIN
        )
        
        # Grant access to execution role
        self.agent_state_table.grant_read_write_data(self.execution_role)
        
    def _create_messaging(self):
        """Create SQS queues and EventBridge."""
        
        # Dead letter queue
        self.task_dlq = sqs.Queue(
            self, "ACSOTaskDLQ",
            queue_name=f"{self.project_name}-{self.environment}-tasks-dlq",
            retention_period=Duration.days(14),
            encryption=sqs.QueueEncryption.KMS,
            encryption_master_key=self.kms_key
        )
        
        # Main task queue
        self.task_queue = sqs.Queue(
            self, "ACSOTaskQueue", 
            queue_name=f"{self.project_name}-{self.environment}-tasks",
            visibility_timeout=Duration.minutes(5),
            retention_period=Duration.days(14),
            encryption=sqs.QueueEncryption.KMS,
            encryption_master_key=self.kms_key,
            dead_letter_queue=sqs.DeadLetterQueue(
                max_receive_count=3,
                queue=self.task_dlq
            )
        )
        
        # Grant access to execution role
        self.task_queue.grant_send_messages(self.execution_role)
        self.task_queue.grant_consume_messages(self.execution_role)
        
        # EventBridge for agent communication
        self.event_bus = events.EventBus(
            self, "ACSOEventBus",
            event_bus_name=f"{self.project_name}-{self.environment}-events"
        )
        
    def _create_networking(self):
        """Create VPC and networking components."""
        
        # VPC
        self.vpc = ec2.Vpc(
            self, "ACSOVPC",
            ip_addresses=ec2.IpAddresses.cidr("10.0.0.0/16"),
            max_azs=2,
            subnet_configuration=[
                ec2.SubnetConfiguration(
                    name="Private",
                    subnet_type=ec2.SubnetType.PRIVATE_WITH_EGRESS,
                    cidr_mask=24
                ),
                ec2.SubnetConfiguration(
                    name="Public", 
                    subnet_type=ec2.SubnetType.PUBLIC,
                    cidr_mask=24
                )
            ],
            enable_dns_hostnames=True,
            enable_dns_support=True
        )
        
        # Security group for ACSO services
        self.security_group = ec2.SecurityGroup(
            self, "ACSOSecurityGroup",
            vpc=self.vpc,
            description="Security group for ACSO services",
            allow_all_outbound=True
        )
        
        # VPC Endpoints for AWS services
        self.vpc.add_interface_endpoint(
            "BedrockEndpoint",
            service=ec2.InterfaceVpcEndpointAwsService.BEDROCK
        )
        
        self.vpc.add_interface_endpoint(
            "CloudWatchLogsEndpoint", 
            service=ec2.InterfaceVpcEndpointAwsService.CLOUDWATCH_LOGS
        )
        
    def _create_container_infrastructure(self):
        """Create ECS cluster and ECR repositories."""
        
        # ECR Repository for ACSO images
        self.ecr_repository = ecr.Repository(
            self, "ACSORepository",
            repository_name=f"{self.project_name}-{self.environment}",
            image_scan_on_push=True,
            lifecycle_rules=[
                ecr.LifecycleRule(
                    max_image_count=10,
                    rule_priority=1,
                    description="Keep only 10 images"
                )
            ],
            removal_policy=RemovalPolicy.DESTROY
        )
        
        # ECS Cluster
        self.ecs_cluster = ecs.Cluster(
            self, "ACSOCluster",
            cluster_name=f"{self.project_name}-{self.environment}-cluster",
            vpc=self.vpc,
            container_insights=True
        )
        
        # Task Definition for ACSO agents
        self.task_definition = ecs.FargateTaskDefinition(
            self, "ACSOTaskDefinition",
            family=f"{self.project_name}-{self.environment}-agents",
            cpu=512,
            memory_limit_mib=1024,
            execution_role=self.execution_role,
            task_role=self.execution_role
        )
        
    def _create_api_gateway(self):
        """Create API Gateway for external integration."""
        
        self.api_gateway = apigateway.RestApi(
            self, "ACSOApiGateway",
            rest_api_name=f"{self.project_name}-{self.environment}-api",
            description="ACSO API Gateway",
            endpoint_configuration=apigateway.EndpointConfiguration(
                types=[apigateway.EndpointType.REGIONAL]
            ),
            default_cors_preflight_options=apigateway.CorsOptions(
                allow_origins=apigateway.Cors.ALL_ORIGINS,
                allow_methods=apigateway.Cors.ALL_METHODS,
                allow_headers=["Content-Type", "Authorization"]
            )
        )
        
        # Create outputs
        self._create_outputs()
        
    def _create_outputs(self):
        """Create CloudFormation outputs."""
        
        CfnOutput(
            self, "ExecutionRoleArn",
            value=self.execution_role.role_arn,
            description="ARN of the ACSO execution role",
            export_name=f"{self.project_name}-{self.environment}-execution-role-arn"
        )
        
        CfnOutput(
            self, "KMSKeyId", 
            value=self.kms_key.key_id,
            description="KMS Key ID for ACSO encryption",
            export_name=f"{self.project_name}-{self.environment}-kms-key-id"
        )
        
        CfnOutput(
            self, "LogGroupName",
            value=self.log_group.log_group_name,
            description="CloudWatch Log Group for ACSO",
            export_name=f"{self.project_name}-{self.environment}-log-group"
        )
        
        CfnOutput(
            self, "ArtifactsBucket",
            value=self.artifacts_bucket.bucket_name,
            description="S3 Bucket for ACSO artifacts", 
            export_name=f"{self.project_name}-{self.environment}-artifacts-bucket"
        )
        
        CfnOutput(
            self, "AgentStateTable",
            value=self.agent_state_table.table_name,
            description="DynamoDB table for agent state",
            export_name=f"{self.project_name}-{self.environment}-agent-state-table"
        )
        
        CfnOutput(
            self, "TaskQueueUrl",
            value=self.task_queue.queue_url,
            description="SQS Queue URL for tasks",
            export_name=f"{self.project_name}-{self.environment}-task-queue-url"
        )
        
        CfnOutput(
            self, "VPCId",
            value=self.vpc.vpc_id,
            description="VPC ID for ACSO",
            export_name=f"{self.project_name}-{self.environment}-vpc-id"
        )
        
        CfnOutput(
            self, "ECRRepositoryUri",
            value=self.ecr_repository.repository_uri,
            description="ECR Repository URI for ACSO images",
            export_name=f"{self.project_name}-{self.environment}-ecr-uri"
        )
        
        CfnOutput(
            self, "ECSClusterName",
            value=self.ecs_cluster.cluster_name,
            description="ECS Cluster name for ACSO",
            export_name=f"{self.project_name}-{self.environment}-ecs-cluster"
        )
        
        CfnOutput(
            self, "ApiGatewayUrl",
            value=self.api_gateway.url,
            description="API Gateway URL for ACSO",
            export_name=f"{self.project_name}-{self.environment}-api-url"
        )