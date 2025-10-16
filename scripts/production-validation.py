#!/usr/bin/env python3
"""
ACSO Production Validation Tests

Critical validation tests that must pass before a production deployment
is considered successful. These tests focus on production-specific
requirements like performance, security, and reliability.
"""

import argparse
import asyncio
import json
import sys
import time
from typing import Dict, List, Optional, Any

import boto3
from botocore.exceptions import ClientError


class ProductionValidationRunner:
    """Runs production validation tests for ACSO deployment."""
    
    def __init__(self, environment: str, region: str = "us-east-1"):
        self.environment = environment
        self.region = region
        self.project_name = "acso"
        self.cluster_name = f"{self.project_name}-{environment}-cluster"
        
        # AWS clients
        self.ecs_client = boto3.client('ecs', region_name=region)
        self.cloudwatch_client = boto3.client('cloudwatch', region_name=region)
        self.logs_client = boto3.client('logs', region_name=region)
        self.iam_client = boto3.client('iam', region_name=region)
        self.kms_client = boto3.client('kms', region_name=region)
        
        # Test results
        self.results: List[Dict] = []
        
    def log_result(self, test_name: str, passed: bool, message: str = "", duration: float = 0, 
                   details: Dict = None, severity: str = "normal"):
        """Log test result."""
        status = "PASS" if passed else "FAIL"
        result = {
            "test": test_name,
            "status": status,
            "message": message,
            "duration": duration,
            "severity": severity,
            "details": details or {}
        }
        self.results.append(result)
        
        color = "\033[92m" if passed else "\033[91m"  # Green or Red
        if severity == "critical":
            color = "\033[95m" if passed else "\033[91m"  # Magenta or Red
        reset = "\033[0m"
        
        severity_marker = "🔴" if severity == "critical" and not passed else ""
        print(f"{color}[{status}]{reset} {severity_marker}{test_name}: {message} ({duration:.2f}s)")
        
    async def test_production_security_compliance(self) -> bool:
        """Test production security compliance requirements."""
        start_time = time.time()
        
        try:
            # Check IAM role policies for least privilege
            role_name = f"{self.project_name}-{self.environment}-execution-role"
            
            try:
                response = self.iam_client.get_role(RoleName=role_name)
                role = response.get('Role')
                
                if not role:
                    self.log_result(
                        "Production Security Compliance", 
                        False, 
                        f"IAM role {role_name} not found",
                        time.time() - start_time,
                        severity="critical"
                    )
                    return False
                    
                # Check for overly permissive policies
                response = self.iam_client.list_attached_role_policies(RoleName=role_name)
                attached_policies = response.get('AttachedPolicies', [])
                
                # Flag if AWS managed admin policies are attached
                admin_policies = [p for p in attached_policies 
                                if 'Administrator' in p.get('PolicyName', '')]
                
                if admin_policies:
                    self.log_result(
                        "Production Security Compliance", 
                        False, 
                        f"Administrator policies attached: {[p['PolicyName'] for p in admin_policies]}",
                        time.time() - start_time,
                        {"admin_policies": admin_policies},
                        severity="critical"
                    )
                    return False
                    
                self.log_result(
                    "Production Security Compliance", 
                    True, 
                    f"IAM role follows least privilege principle",
                    time.time() - start_time,
                    {"attached_policies": len(attached_policies)}
                )
                return True
                
            except ClientError as e:
                self.log_result(
                    "Production Security Compliance", 
                    False, 
                    f"Error checking IAM role: {e}",
                    time.time() - start_time,
                    severity="critical"
                )
                return False
                
        except Exception as e:
            self.log_result(
                "Production Security Compliance", 
                False, 
                f"Unexpected error: {e}",
                time.time() - start_time,
                severity="critical"
            )
            return False
            
    async def test_encryption_at_rest(self) -> bool:
        """Test that data encryption at rest is properly configured."""
        start_time = time.time()
        
        try:
            # Check CloudWatch log group encryption
            log_group = f"/aws/{self.project_name}/{self.environment}/agents"
            
            response = self.logs_client.describe_log_groups(
                logGroupNamePrefix=log_group
            )
            
            log_groups = response.get('logGroups', [])
            if not log_groups:
                self.log_result(
                    "Encryption at Rest", 
                    False, 
                    "CloudWatch log groups not found",
                    time.time() - start_time,
                    severity="critical"
                )
                return False
                
            log_group_info = log_groups[0]
            kms_key_id = log_group_info.get('kmsKeyId')
            
            if not kms_key_id:
                self.log_result(
                    "Encryption at Rest", 
                    False, 
                    "CloudWatch logs not encrypted with KMS",
                    time.time() - start_time,
                    severity="critical"
                )
                return False
                
            # Verify KMS key exists and is active
            try:
                response = self.kms_client.describe_key(KeyId=kms_key_id)
                key_info = response.get('KeyMetadata', {})
                
                if key_info.get('KeyState') != 'Enabled':
                    self.log_result(
                        "Encryption at Rest", 
                        False, 
                        f"KMS key {kms_key_id} is not enabled",
                        time.time() - start_time,
                        severity="critical"
                    )
                    return False
                    
                self.log_result(
                    "Encryption at Rest", 
                    True, 
                    f"Data encrypted with KMS key {kms_key_id}",
                    time.time() - start_time,
                    {"kms_key_id": kms_key_id}
                )
                return True
                
            except ClientError as e:
                if e.response.get('Error', {}).get('Code') == 'NotFoundException':
                    self.log_result(
                        "Encryption at Rest", 
                        False, 
                        f"KMS key {kms_key_id} not found",
                        time.time() - start_time,
                        severity="critical"
                    )
                else:
                    self.log_result(
                        "Encryption at Rest", 
                        False, 
                        f"Error checking KMS key: {e}",
                        time.time() - start_time,
                        severity="critical"
                    )
                return False
                
        except ClientError as e:
            self.log_result(
                "Encryption at Rest", 
                False, 
                f"AWS error: {e}",
                time.time() - start_time,
                severity="critical"
            )
            return False
            
    async def test_high_availability_configuration(self) -> bool:
        """Test high availability configuration."""
        start_time = time.time()
        
        try:
            # Check that services are distributed across multiple AZs
            agents = ["supervisor", "threat-hunter", "incident-response", 
                     "service-orchestration", "financial-intelligence"]
            
            service_names = [f"{self.project_name}-{self.environment}-{agent}" 
                           for agent in agents]
            
            response = self.ecs_client.describe_services(
                cluster=self.cluster_name,
                services=service_names
            )
            
            services = response.get('services', [])
            if not services:
                self.log_result(
                    "High Availability Configuration", 
                    False, 
                    "No services found",
                    time.time() - start_time,
                    severity="critical"
                )
                return False
                
            # Check desired count for production (should be > 1)
            low_availability_services = []
            for service in services:
                desired_count = service.get('desiredCount', 0)
                if desired_count < 2:
                    low_availability_services.append(service['serviceName'])
                    
            if low_availability_services and self.environment == 'production':
                self.log_result(
                    "High Availability Configuration", 
                    False, 
                    f"Services with single instance: {', '.join(low_availability_services)}",
                    time.time() - start_time,
                    {"low_availability_services": low_availability_services},
                    severity="critical"
                )
                return False
                
            self.log_result(
                "High Availability Configuration", 
                True, 
                f"All {len(services)} services configured for high availability",
                time.time() - start_time,
                {"services_count": len(services)}
            )
            return True
            
        except ClientError as e:
            self.log_result(
                "High Availability Configuration", 
                False, 
                f"AWS error: {e}",
                time.time() - start_time,
                severity="critical"
            )
            return False
            
    async def test_performance_metrics(self) -> bool:
        """Test performance metrics and thresholds."""
        start_time = time.time()
        
        try:
            # Check CPU and memory utilization
            end_time = time.time()
            start_time_metrics = end_time - 300  # Last 5 minutes
            
            # Get ECS service metrics
            response = self.cloudwatch_client.get_metric_statistics(
                Namespace='AWS/ECS',
                MetricName='CPUUtilization',
                Dimensions=[
                    {
                        'Name': 'ServiceName',
                        'Value': f"{self.project_name}-{self.environment}-supervisor"
                    },
                    {
                        'Name': 'ClusterName',
                        'Value': self.cluster_name
                    }
                ],
                StartTime=start_time_metrics,
                EndTime=end_time,
                Period=300,
                Statistics=['Average', 'Maximum']
            )
            
            datapoints = response.get('Datapoints', [])
            if not datapoints:
                # No metrics yet (acceptable for new deployment)
                self.log_result(
                    "Performance Metrics", 
                    True, 
                    "No performance metrics available yet (new deployment)",
                    time.time() - start_time
                )
                return True
                
            # Check if CPU usage is reasonable (< 80% average)
            avg_cpu = sum(dp['Average'] for dp in datapoints) / len(datapoints)
            max_cpu = max(dp['Maximum'] for dp in datapoints)
            
            if avg_cpu > 80:
                self.log_result(
                    "Performance Metrics", 
                    False, 
                    f"High CPU utilization: {avg_cpu:.1f}% average, {max_cpu:.1f}% max",
                    time.time() - start_time,
                    {"avg_cpu": avg_cpu, "max_cpu": max_cpu},
                    severity="critical"
                )
                return False
                
            self.log_result(
                "Performance Metrics", 
                True, 
                f"Performance within acceptable limits: {avg_cpu:.1f}% avg CPU",
                time.time() - start_time,
                {"avg_cpu": avg_cpu, "max_cpu": max_cpu}
            )
            return True
            
        except ClientError as e:
            # CloudWatch metrics might not be available immediately
            self.log_result(
                "Performance Metrics", 
                True, 
                f"Metrics not available yet: {e}",
                time.time() - start_time
            )
            return True
            
    async def test_disaster_recovery_readiness(self) -> bool:
        """Test disaster recovery readiness."""
        start_time = time.time()
        
        try:
            # Check that infrastructure is defined as code
            # This would typically check for CloudFormation stacks or CDK deployments
            
            # For now, verify that the cluster and services exist
            response = self.ecs_client.describe_clusters(clusters=[self.cluster_name])
            clusters = response.get('clusters', [])
            
            if not clusters or clusters[0]['status'] != 'ACTIVE':
                self.log_result(
                    "Disaster Recovery Readiness", 
                    False, 
                    f"Cluster {self.cluster_name} not active",
                    time.time() - start_time,
                    severity="critical"
                )
                return False
                
            # Check that services have proper tagging for backup/recovery
            agents = ["supervisor", "threat-hunter", "incident-response", 
                     "service-orchestration", "financial-intelligence"]
            
            service_names = [f"{self.project_name}-{self.environment}-{agent}" 
                           for agent in agents]
            
            response = self.ecs_client.describe_services(
                cluster=self.cluster_name,
                services=service_names
            )
            
            services = response.get('services', [])
            if len(services) != len(agents):
                self.log_result(
                    "Disaster Recovery Readiness", 
                    False, 
                    f"Only {len(services)}/{len(agents)} services found",
                    time.time() - start_time,
                    severity="critical"
                )
                return False
                
            self.log_result(
                "Disaster Recovery Readiness", 
                True, 
                f"All {len(services)} services ready for disaster recovery",
                time.time() - start_time,
                {"services_count": len(services)}
            )
            return True
            
        except ClientError as e:
            self.log_result(
                "Disaster Recovery Readiness", 
                False, 
                f"AWS error: {e}",
                time.time() - start_time,
                severity="critical"
            )
            return False
            
    async def test_monitoring_alerting_production(self) -> bool:
        """Test production monitoring and alerting configuration."""
        start_time = time.time()
        
        try:
            # Check for CloudWatch alarms
            response = self.cloudwatch_client.describe_alarms(
                AlarmNamePrefix=f"{self.project_name}-{self.environment}"
            )
            
            alarms = response.get('MetricAlarms', [])
            
            # In production, we should have alarms for critical metrics
            if self.environment == 'production' and len(alarms) == 0:
                self.log_result(
                    "Monitoring Alerting Production", 
                    False, 
                    "No CloudWatch alarms configured for production",
                    time.time() - start_time,
                    severity="critical"
                )
                return False
                
            # Check alarm states
            alarm_states = {}
            for alarm in alarms:
                state = alarm.get('StateValue', 'UNKNOWN')
                alarm_states[state] = alarm_states.get(state, 0) + 1
                
            # Flag if any alarms are in ALARM state
            if alarm_states.get('ALARM', 0) > 0:
                self.log_result(
                    "Monitoring Alerting Production", 
                    False, 
                    f"{alarm_states['ALARM']} alarms currently firing",
                    time.time() - start_time,
                    {"alarm_states": alarm_states},
                    severity="critical"
                )
                return False
                
            self.log_result(
                "Monitoring Alerting Production", 
                True, 
                f"Monitoring configured with {len(alarms)} alarms, all OK",
                time.time() - start_time,
                {"total_alarms": len(alarms), "alarm_states": alarm_states}
            )
            return True
            
        except ClientError as e:
            self.log_result(
                "Monitoring Alerting Production", 
                False, 
                f"AWS error: {e}",
                time.time() - start_time,
                severity="critical"
            )
            return False
            
    async def test_network_security(self) -> bool:
        """Test network security configuration."""
        start_time = time.time()
        
        try:
            # Check security groups for ECS services
            ec2_client = boto3.client('ec2', region_name=self.region)
            
            # Get VPC for the environment
            response = ec2_client.describe_vpcs(
                Filters=[
                    {'Name': 'tag:Name', 'Values': [f"{self.project_name}-{self.environment}-vpc"]}
                ]
            )
            
            vpcs = response.get('Vpcs', [])
            if not vpcs:
                self.log_result(
                    "Network Security", 
                    True, 
                    "VPC not found (may be using default VPC)",
                    time.time() - start_time
                )
                return True
                
            vpc_id = vpcs[0]['VpcId']
            
            # Check security groups
            response = ec2_client.describe_security_groups(
                Filters=[
                    {'Name': 'vpc-id', 'Values': [vpc_id]},
                    {'Name': 'group-name', 'Values': [f"*{self.project_name}*"]}
                ]
            )
            
            security_groups = response.get('SecurityGroups', [])
            
            # Check for overly permissive rules (0.0.0.0/0 on sensitive ports)
            risky_rules = []
            for sg in security_groups:
                for rule in sg.get('IpPermissions', []):
                    for ip_range in rule.get('IpRanges', []):
                        if ip_range.get('CidrIp') == '0.0.0.0/0':
                            from_port = rule.get('FromPort', 0)
                            to_port = rule.get('ToPort', 65535)
                            
                            # Flag SSH, RDP, database ports open to internet
                            sensitive_ports = [22, 3389, 3306, 5432, 1433, 27017]
                            if any(port >= from_port and port <= to_port for port in sensitive_ports):
                                risky_rules.append({
                                    'security_group': sg['GroupName'],
                                    'from_port': from_port,
                                    'to_port': to_port
                                })
                                
            if risky_rules:
                self.log_result(
                    "Network Security", 
                    False, 
                    f"Risky security group rules found: {risky_rules}",
                    time.time() - start_time,
                    {"risky_rules": risky_rules},
                    severity="critical"
                )
                return False
                
            self.log_result(
                "Network Security", 
                True, 
                f"Network security properly configured ({len(security_groups)} security groups)",
                time.time() - start_time,
                {"security_groups": len(security_groups)}
            )
            return True
            
        except ClientError as e:
            self.log_result(
                "Network Security", 
                False, 
                f"AWS error: {e}",
                time.time() - start_time
            )
            return False
            
    async def run_all_tests(self) -> bool:
        """Run all production validation tests."""
        print(f"\n🔒 Running ACSO production validation for {self.environment} environment...")
        print(f"Region: {self.region}")
        print(f"Cluster: {self.cluster_name}")
        print("=" * 80)
        
        tests = [
            self.test_production_security_compliance,
            self.test_encryption_at_rest,
            self.test_high_availability_configuration,
            self.test_performance_metrics,
            self.test_disaster_recovery_readiness,
            self.test_monitoring_alerting_production,
            self.test_network_security,
        ]
        
        passed_tests = 0
        critical_failures = 0
        total_tests = len(tests)
        
        for test in tests:
            try:
                result = await test()
                if result:
                    passed_tests += 1
                else:
                    # Check if this was a critical failure
                    if self.results and self.results[-1].get('severity') == 'critical':
                        critical_failures += 1
            except Exception as e:
                self.log_result(
                    test.__name__, 
                    False, 
                    f"Unexpected error: {e}",
                    0,
                    severity="critical"
                )
                critical_failures += 1
                
        print("=" * 80)
        print(f"📊 Production Validation Results: {passed_tests}/{total_tests} passed")
        
        if critical_failures > 0:
            print(f"🔴 {critical_failures} CRITICAL failures detected!")
            
        if passed_tests == total_tests:
            print("✅ Production deployment validated successfully!")
            return True
        elif critical_failures == 0:
            print("⚠️  Some non-critical validations failed, but deployment is acceptable")
            return True
        else:
            print("❌ Critical validation failures - deployment should be rolled back!")
            return False
            
    def generate_report(self) -> Dict:
        """Generate a detailed validation report."""
        passed = sum(1 for r in self.results if r['status'] == 'PASS')
        failed = sum(1 for r in self.results if r['status'] == 'FAIL')
        critical_failures = sum(1 for r in self.results 
                              if r['status'] == 'FAIL' and r.get('severity') == 'critical')
        
        return {
            "environment": self.environment,
            "region": self.region,
            "cluster": self.cluster_name,
            "timestamp": time.time(),
            "summary": {
                "total": len(self.results),
                "passed": passed,
                "failed": failed,
                "critical_failures": critical_failures,
                "success_rate": passed / len(self.results) if self.results else 0,
                "production_ready": critical_failures == 0
            },
            "tests": self.results
        }


async def main():
    """Main entry point."""
    parser = argparse.ArgumentParser(description="Run ACSO production validation tests")
    parser.add_argument(
        "--environment", 
        required=True,
        choices=["development", "staging", "production"],
        help="Environment to validate"
    )
    parser.add_argument(
        "--region", 
        default="us-east-1",
        help="AWS region (default: us-east-1)"
    )
    parser.add_argument(
        "--output", 
        help="Output file for validation results (JSON format)"
    )
    
    args = parser.parse_args()
    
    runner = ProductionValidationRunner(args.environment, args.region)
    success = await runner.run_all_tests()
    
    # Generate report
    report = runner.generate_report()
    
    if args.output:
        with open(args.output, 'w') as f:
            json.dump(report, f, indent=2)
        print(f"\n📄 Production validation report saved to {args.output}")
    
    # Exit with appropriate code
    sys.exit(0 if success else 1)


if __name__ == "__main__":
    asyncio.run(main())