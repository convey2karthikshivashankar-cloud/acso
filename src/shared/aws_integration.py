"""
AWS service integrations for ACSO agents.
"""

import boto3
import json
import logging
from typing import Dict, Any, Optional, List
from botocore.exceptions import ClientError, BotoCoreError

from config.settings import settings


class BedrockAgentCoreClient:
    """Client for Amazon Bedrock AgentCore integration."""
    
    def __init__(self):
        self.session = boto3.Session()
        self.bedrock_client = self.session.client(
            'bedrock-agent-runtime',
            region_name=settings.aws.region
        )
        self.bedrock_agent_client = self.session.client(
            'bedrock-agent',
            region_name=settings.aws.region
        )
        self.logger = logging.getLogger(__name__)
        
    async def invoke_agent(self, agent_id: str, session_id: str, input_text: str) -> Dict[str, Any]:
        """Invoke a Bedrock agent with input text."""
        try:
            response = self.bedrock_client.invoke_agent(
                agentId=agent_id,
                agentAliasId='TSTALIASID',  # Test alias for prototype
                sessionId=session_id,
                inputText=input_text
            )
            
            # Process streaming response
            result = ""
            for event in response['completion']:
                if 'chunk' in event:
                    chunk = event['chunk']
                    if 'bytes' in chunk:
                        result += chunk['bytes'].decode('utf-8')
                        
            return {
                "success": True,
                "result": result,
                "session_id": session_id
            }
            
        except ClientError as e:
            self.logger.error(f"Bedrock agent invocation failed: {e}")
            return {
                "success": False,
                "error": str(e),
                "session_id": session_id
            }
            
    async def create_agent_session(self, agent_id: str) -> str:
        """Create a new agent session."""
        import uuid
        return str(uuid.uuid4())
        
    async def get_agent_status(self, agent_id: str) -> Dict[str, Any]:
        """Get the status of a Bedrock agent."""
        try:
            response = self.bedrock_agent_client.get_agent(agentId=agent_id)
            return {
                "success": True,
                "status": response['agent']['agentStatus'],
                "agent_name": response['agent']['agentName']
            }
        except ClientError as e:
            self.logger.error(f"Failed to get agent status: {e}")
            return {
                "success": False,
                "error": str(e)
            }


class CloudWatchLogger:
    """CloudWatch logging integration."""
    
    def __init__(self):
        self.session = boto3.Session()
        self.logs_client = self.session.client(
            'logs',
            region_name=settings.aws.region
        )
        self.log_group = settings.aws.cloudwatch_log_group
        self.logger = logging.getLogger(__name__)
        
    async def create_log_group_if_not_exists(self):
        """Create CloudWatch log group if it doesn't exist."""
        try:
            self.logs_client.create_log_group(logGroupName=self.log_group)
        except ClientError as e:
            if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                self.logger.error(f"Failed to create log group: {e}")
                
    async def log_agent_activity(self, agent_id: str, activity: str, details: Dict[str, Any]):
        """Log agent activity to CloudWatch."""
        try:
            log_stream = f"{agent_id}-{activity}"
            
            # Create log stream if it doesn't exist
            try:
                self.logs_client.create_log_stream(
                    logGroupName=self.log_group,
                    logStreamName=log_stream
                )
            except ClientError as e:
                if e.response['Error']['Code'] != 'ResourceAlreadyExistsException':
                    raise
                    
            # Put log event
            import time
            timestamp = int(time.time() * 1000)
            
            log_event = {
                'timestamp': timestamp,
                'message': json.dumps({
                    'agent_id': agent_id,
                    'activity': activity,
                    'details': details,
                    'level': 'INFO'
                })
            }
            
            self.logs_client.put_log_events(
                logGroupName=self.log_group,
                logStreamName=log_stream,
                logEvents=[log_event]
            )
            
        except Exception as e:
            self.logger.error(f"Failed to log to CloudWatch: {e}")


class CloudWatchMetrics:
    """CloudWatch metrics integration."""
    
    def __init__(self):
        self.session = boto3.Session()
        self.cloudwatch = self.session.client(
            'cloudwatch',
            region_name=settings.aws.region
        )
        self.namespace = settings.aws.metrics_namespace
        self.logger = logging.getLogger(__name__)
        
    async def put_metric(self, metric_name: str, value: float, unit: str = 'Count', 
                        dimensions: Optional[Dict[str, str]] = None):
        """Put a metric to CloudWatch."""
        try:
            metric_data = {
                'MetricName': metric_name,
                'Value': value,
                'Unit': unit
            }
            
            if dimensions:
                metric_data['Dimensions'] = [
                    {'Name': k, 'Value': v} for k, v in dimensions.items()
                ]
                
            self.cloudwatch.put_metric_data(
                Namespace=self.namespace,
                MetricData=[metric_data]
            )
            
        except Exception as e:
            self.logger.error(f"Failed to put metric: {e}")
            
    async def put_agent_metrics(self, agent_id: str, metrics: Dict[str, float]):
        """Put multiple agent metrics."""
        dimensions = {'AgentId': agent_id}
        
        for metric_name, value in metrics.items():
            await self.put_metric(
                metric_name=metric_name,
                value=value,
                dimensions=dimensions
            )


class IAMSecurityManager:
    """IAM and security management for agents."""
    
    def __init__(self):
        self.session = boto3.Session()
        self.iam_client = self.session.client('iam', region_name=settings.aws.region)
        self.sts_client = self.session.client('sts', region_name=settings.aws.region)
        self.logger = logging.getLogger(__name__)
        
    async def validate_agent_permissions(self, agent_id: str, action: str) -> bool:
        """Validate that an agent has permissions for a specific action."""
        try:
            # Get current identity
            identity = self.sts_client.get_caller_identity()
            
            # In a real implementation, this would check specific IAM policies
            # For the prototype, we'll implement basic validation
            allowed_actions = {
                'supervisor': ['*'],  # Supervisor has broad permissions
                'threat-hunter': ['logs:*', 'guardduty:*', 'cloudtrail:*'],
                'incident-response': ['ec2:*', 'iam:*', 'ssm:*'],
                'service-orchestration': ['ssm:*', 'lambda:*'],
                'financial-intelligence': ['quicksight:*', 'cost-explorer:*']
            }
            
            agent_type = agent_id.split('-')[0]  # Extract agent type from ID
            agent_permissions = allowed_actions.get(agent_type, [])
            
            # Check if action is allowed
            for permission in agent_permissions:
                if permission == '*' or action.startswith(permission.replace('*', '')):
                    return True
                    
            return False
            
        except Exception as e:
            self.logger.error(f"Permission validation failed: {e}")
            return False
            
    async def assume_agent_role(self, agent_id: str) -> Optional[Dict[str, str]]:
        """Assume IAM role for agent execution."""
        if not settings.aws.agent_execution_role_arn:
            return None
            
        try:
            response = self.sts_client.assume_role(
                RoleArn=settings.aws.agent_execution_role_arn,
                RoleSessionName=f"acso-agent-{agent_id}",
                DurationSeconds=3600
            )
            
            credentials = response['Credentials']
            return {
                'AccessKeyId': credentials['AccessKeyId'],
                'SecretAccessKey': credentials['SecretAccessKey'],
                'SessionToken': credentials['SessionToken']
            }
            
        except Exception as e:
            self.logger.error(f"Failed to assume role: {e}")
            return None


class KMSEncryption:
    """KMS encryption/decryption for sensitive data."""
    
    def __init__(self):
        self.session = boto3.Session()
        self.kms_client = self.session.client('kms', region_name=settings.aws.region)
        self.key_id = settings.aws.kms_key_id
        self.logger = logging.getLogger(__name__)
        
    async def encrypt_data(self, plaintext: str) -> Optional[str]:
        """Encrypt data using KMS."""
        if not self.key_id:
            return plaintext  # No encryption if no key configured
            
        try:
            response = self.kms_client.encrypt(
                KeyId=self.key_id,
                Plaintext=plaintext.encode('utf-8')
            )
            
            import base64
            return base64.b64encode(response['CiphertextBlob']).decode('utf-8')
            
        except Exception as e:
            self.logger.error(f"Encryption failed: {e}")
            return None
            
    async def decrypt_data(self, ciphertext: str) -> Optional[str]:
        """Decrypt data using KMS."""
        if not self.key_id:
            return ciphertext  # No decryption if no key configured
            
        try:
            import base64
            ciphertext_blob = base64.b64decode(ciphertext.encode('utf-8'))
            
            response = self.kms_client.decrypt(CiphertextBlob=ciphertext_blob)
            return response['Plaintext'].decode('utf-8')
            
        except Exception as e:
            self.logger.error(f"Decryption failed: {e}")
            return None


# Global AWS service instances
bedrock_client = BedrockAgentCoreClient()
cloudwatch_logger = CloudWatchLogger()
cloudwatch_metrics = CloudWatchMetrics()
iam_security = IAMSecurityManager()
kms_encryption = KMSEncryption()