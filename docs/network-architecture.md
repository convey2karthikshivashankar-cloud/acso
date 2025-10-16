# ACSO Network Architecture

## Overview

This document describes the network architecture for the ACSO (Autonomous Cyber-Security & Service Orchestrator) system, including VPC configuration, security groups, network access control lists (NACLs), and connectivity patterns.

## Table of Contents

1. [VPC Architecture](#vpc-architecture)
2. [Subnet Design](#subnet-design)
3. [Security Groups](#security-groups)
4. [Network ACLs](#network-acls)
5. [Load Balancing](#load-balancing)
6. [DNS Configuration](#dns-configuration)
7. [Network Monitoring](#network-monitoring)
8. [Security Considerations](#security-considerations)

## VPC Architecture

### Primary VPC Configuration

The ACSO system is deployed in a dedicated VPC with the following specifications:

```yaml
VPC Configuration:
  CIDR Block: 10.0.0.0/16
  Region: us-east-1 (configurable)
  Availability Zones: 3 (minimum for high availability)
  DNS Hostnames: Enabled
  DNS Resolution: Enabled
  Tenancy: Default
```

### Multi-AZ Deployment

```
┌─────────────────────────────────────────────────────────────┐
│                    ACSO VPC (10.0.0.0/16)                  │
├─────────────────────────────────────────────────────────────┤
│  AZ-1a              AZ-1b              AZ-1c               │
│ ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│ │Public Subnet│   │Public Subnet│   │Public Subnet│        │
│ │10.0.1.0/24  │   │10.0.2.0/24  │   │10.0.3.0/24  │        │
│ └─────────────┘   └─────────────┘   └─────────────┘        │
│ ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│ │Private Sub  │   │Private Sub  │   │Private Sub  │        │
│ │10.0.11.0/24 │   │10.0.12.0/24 │   │10.0.13.0/24 │        │
│ └─────────────┘   └─────────────┘   └─────────────┘        │
│ ┌─────────────┐   ┌─────────────┐   ┌─────────────┐        │
│ │Database Sub │   │Database Sub │   │Database Sub │        │
│ │10.0.21.0/24 │   │10.0.22.0/24 │   │10.0.23.0/24 │        │
│ └─────────────┘   └─────────────┘   └─────────────┘        │
└─────────────────────────────────────────────────────────────┘
```

## Subnet Design

### Public Subnets

**Purpose**: Internet-facing components (ALB, NAT Gateways, Bastion hosts)

```yaml
Public Subnets:
  - Name: acso-public-1a
    CIDR: 10.0.1.0/24
    AZ: us-east-1a
    Route Table: Public Route Table
    
  - Name: acso-public-1b
    CIDR: 10.0.2.0/24
    AZ: us-east-1b
    Route Table: Public Route Table
    
  - Name: acso-public-1c
    CIDR: 10.0.3.0/24
    AZ: us-east-1c
    Route Table: Public Route Table
```

**Public Route Table:**
```yaml
Routes:
  - Destination: 0.0.0.0/0
    Target: Internet Gateway
  - Destination: 10.0.0.0/16
    Target: Local
```

### Private Subnets

**Purpose**: Application components (ECS tasks, Lambda functions, Bedrock agents)

```yaml
Private Subnets:
  - Name: acso-private-1a
    CIDR: 10.0.11.0/24
    AZ: us-east-1a
    Route Table: Private Route Table 1a
    
  - Name: acso-private-1b
    CIDR: 10.0.12.0/24
    AZ: us-east-1b
    Route Table: Private Route Table 1b
    
  - Name: acso-private-1c
    CIDR: 10.0.13.0/24
    AZ: us-east-1c
    Route Table: Private Route Table 1c
```

**Private Route Tables:**
```yaml
Routes (per AZ):
  - Destination: 0.0.0.0/0
    Target: NAT Gateway (in corresponding public subnet)
  - Destination: 10.0.0.0/16
    Target: Local
```

### Database Subnets

**Purpose**: Database and persistent storage components

```yaml
Database Subnets:
  - Name: acso-db-1a
    CIDR: 10.0.21.0/24
    AZ: us-east-1a
    Route Table: Database Route Table
    
  - Name: acso-db-1b
    CIDR: 10.0.22.0/24
    AZ: us-east-1b
    Route Table: Database Route Table
    
  - Name: acso-db-1c
    CIDR: 10.0.23.0/24
    AZ: us-east-1c
    Route Table: Database Route Table
```

**Database Route Table:**
```yaml
Routes:
  - Destination: 10.0.0.0/16
    Target: Local
  # No internet access for database subnets
```

## Security Groups

### Application Load Balancer Security Group

```yaml
Name: acso-alb-sg
Description: Security group for ACSO Application Load Balancer

Inbound Rules:
  - Protocol: HTTPS (443)
    Source: 0.0.0.0/0
    Description: HTTPS traffic from internet
    
  - Protocol: HTTP (80)
    Source: 0.0.0.0/0
    Description: HTTP traffic (redirect to HTTPS)

Outbound Rules:
  - Protocol: All Traffic
    Destination: acso-app-sg
    Description: Forward to application instances
```

### Application Security Group

```yaml
Name: acso-app-sg
Description: Security group for ACSO application components

Inbound Rules:
  - Protocol: HTTP (8080)
    Source: acso-alb-sg
    Description: Traffic from load balancer
    
  - Protocol: HTTPS (8443)
    Source: acso-alb-sg
    Description: Secure traffic from load balancer
    
  - Protocol: Custom TCP (9090)
    Source: acso-monitoring-sg
    Description: Metrics collection
    
  - Protocol: SSH (22)
    Source: acso-bastion-sg
    Description: SSH access from bastion

Outbound Rules:
  - Protocol: HTTPS (443)
    Destination: 0.0.0.0/0
    Description: AWS API calls and external integrations
    
  - Protocol: Custom TCP (5432)
    Destination: acso-db-sg
    Description: Database connections
    
  - Protocol: Custom TCP (6379)
    Destination: acso-cache-sg
    Description: Redis cache connections
```

### Database Security Group

```yaml
Name: acso-db-sg
Description: Security group for ACSO database components

Inbound Rules:
  - Protocol: PostgreSQL (5432)
    Source: acso-app-sg
    Description: Database access from applications
    
  - Protocol: PostgreSQL (5432)
    Source: acso-bastion-sg
    Description: Database access from bastion for maintenance

Outbound Rules:
  - Protocol: All Traffic
    Destination: 0.0.0.0/0
    Description: Outbound for updates and replication
```

### Cache Security Group

```yaml
Name: acso-cache-sg
Description: Security group for Redis cache

Inbound Rules:
  - Protocol: Redis (6379)
    Source: acso-app-sg
    Description: Cache access from applications

Outbound Rules:
  - Protocol: All Traffic
    Destination: 0.0.0.0/0
    Description: Outbound for replication and updates
```

### Bastion Security Group

```yaml
Name: acso-bastion-sg
Description: Security group for bastion host

Inbound Rules:
  - Protocol: SSH (22)
    Source: [Admin IP Ranges]
    Description: SSH access from admin networks
    
  - Protocol: RDP (3389)
    Source: [Admin IP Ranges]
    Description: RDP access for Windows bastion

Outbound Rules:
  - Protocol: SSH (22)
    Destination: acso-app-sg
    Description: SSH to application instances
    
  - Protocol: PostgreSQL (5432)
    Destination: acso-db-sg
    Description: Database administration
    
  - Protocol: HTTPS (443)
    Destination: 0.0.0.0/0
    Description: Internet access for updates
```

### Monitoring Security Group

```yaml
Name: acso-monitoring-sg
Description: Security group for monitoring components

Inbound Rules:
  - Protocol: HTTP (3000)
    Source: acso-alb-sg
    Description: Grafana dashboard access
    
  - Protocol: Custom TCP (9090)
    Source: acso-app-sg
    Description: Prometheus metrics collection

Outbound Rules:
  - Protocol: Custom TCP (9090)
    Destination: acso-app-sg
    Description: Scrape metrics from applications
    
  - Protocol: HTTPS (443)
    Destination: 0.0.0.0/0
    Description: CloudWatch API access
```

## Network ACLs

### Public Subnet NACL

```yaml
Name: acso-public-nacl
Associated Subnets: Public subnets

Inbound Rules:
  - Rule: 100
    Protocol: HTTP (80)
    Source: 0.0.0.0/0
    Action: ALLOW
    
  - Rule: 110
    Protocol: HTTPS (443)
    Source: 0.0.0.0/0
    Action: ALLOW
    
  - Rule: 120
    Protocol: SSH (22)
    Source: [Admin CIDR blocks]
    Action: ALLOW
    
  - Rule: 130
    Protocol: Custom TCP (1024-65535)
    Source: 0.0.0.0/0
    Action: ALLOW
    Description: Return traffic

Outbound Rules:
  - Rule: 100
    Protocol: All Traffic
    Destination: 0.0.0.0/0
    Action: ALLOW
```

### Private Subnet NACL

```yaml
Name: acso-private-nacl
Associated Subnets: Private subnets

Inbound Rules:
  - Rule: 100
    Protocol: HTTP (80)
    Source: 10.0.0.0/16
    Action: ALLOW
    
  - Rule: 110
    Protocol: HTTPS (443)
    Source: 10.0.0.0/16
    Action: ALLOW
    
  - Rule: 120
    Protocol: Custom TCP (8080-8443)
    Source: 10.0.0.0/16
    Action: ALLOW
    
  - Rule: 130
    Protocol: SSH (22)
    Source: 10.0.1.0/24
    Action: ALLOW
    Description: SSH from public subnet (bastion)
    
  - Rule: 140
    Protocol: Custom TCP (1024-65535)
    Source: 0.0.0.0/0
    Action: ALLOW
    Description: Return traffic

Outbound Rules:
  - Rule: 100
    Protocol: All Traffic
    Destination: 0.0.0.0/0
    Action: ALLOW
```

### Database Subnet NACL

```yaml
Name: acso-db-nacl
Associated Subnets: Database subnets

Inbound Rules:
  - Rule: 100
    Protocol: PostgreSQL (5432)
    Source: 10.0.11.0/24
    Action: ALLOW
    Description: From private subnet 1a
    
  - Rule: 110
    Protocol: PostgreSQL (5432)
    Source: 10.0.12.0/24
    Action: ALLOW
    Description: From private subnet 1b
    
  - Rule: 120
    Protocol: PostgreSQL (5432)
    Source: 10.0.13.0/24
    Action: ALLOW
    Description: From private subnet 1c
    
  - Rule: 130
    Protocol: Custom TCP (1024-65535)
    Source: 10.0.0.0/16
    Action: ALLOW
    Description: Return traffic

Outbound Rules:
  - Rule: 100
    Protocol: Custom TCP (1024-65535)
    Destination: 10.0.0.0/16
    Action: ALLOW
    Description: Return traffic to VPC
```

## Load Balancing

### Application Load Balancer Configuration

```yaml
Name: acso-alb
Type: Application Load Balancer
Scheme: Internet-facing
IP Address Type: IPv4

Subnets:
  - acso-public-1a
  - acso-public-1b
  - acso-public-1c

Security Groups:
  - acso-alb-sg

Listeners:
  - Port: 80
    Protocol: HTTP
    Default Action: Redirect to HTTPS
    
  - Port: 443
    Protocol: HTTPS
    SSL Certificate: ACM Certificate
    Default Action: Forward to target group

Target Groups:
  - Name: acso-app-tg
    Protocol: HTTP
    Port: 8080
    Health Check:
      Path: /health
      Interval: 30 seconds
      Timeout: 5 seconds
      Healthy Threshold: 2
      Unhealthy Threshold: 3
```

### Network Load Balancer (Internal)

```yaml
Name: acso-internal-nlb
Type: Network Load Balancer
Scheme: Internal
IP Address Type: IPv4

Subnets:
  - acso-private-1a
  - acso-private-1b
  - acso-private-1c

Listeners:
  - Port: 9090
    Protocol: TCP
    Default Action: Forward to monitoring target group

Target Groups:
  - Name: acso-monitoring-tg
    Protocol: TCP
    Port: 9090
    Health Check:
      Protocol: HTTP
      Path: /metrics
      Port: 9090
```

## DNS Configuration

### Route 53 Configuration

```yaml
Hosted Zone: acso.example.com
Type: Private Hosted Zone
VPC Association: ACSO VPC

DNS Records:
  - Name: api.acso.example.com
    Type: A
    Alias: acso-alb
    
  - Name: monitoring.acso.example.com
    Type: A
    Alias: acso-internal-nlb
    
  - Name: db.acso.example.com
    Type: CNAME
    Value: acso-rds-cluster.cluster-xyz.us-east-1.rds.amazonaws.com
```

### Service Discovery

```yaml
Service Discovery Namespace: acso.local
Type: DNS

Services:
  - Name: supervisor-agent
    DNS Name: supervisor-agent.acso.local
    Health Check: Custom
    
  - Name: threat-hunter
    DNS Name: threat-hunter.acso.local
    Health Check: Custom
    
  - Name: incident-response
    DNS Name: incident-response.acso.local
    Health Check: Custom
    
  - Name: service-orchestration
    DNS Name: service-orchestration.acso.local
    Health Check: Custom
    
  - Name: financial-intelligence
    DNS Name: financial-intelligence.acso.local
    Health Check: Custom
```

## Network Monitoring

### VPC Flow Logs

```yaml
Configuration:
  Resource Type: VPC
  Resource ID: vpc-acso-main
  Traffic Type: ALL
  Destination: CloudWatch Logs
  Log Group: /aws/vpc/flowlogs
  IAM Role: VPCFlowLogsRole

Log Format:
  - version
  - account-id
  - interface-id
  - srcaddr
  - dstaddr
  - srcport
  - dstport
  - protocol
  - packets
  - bytes
  - windowstart
  - windowend
  - action
```

### Network Insights

```yaml
Network Insights Paths:
  - Name: internet-to-alb
    Source: Internet Gateway
    Destination: ALB
    Protocol: HTTPS
    
  - Name: alb-to-app
    Source: ALB
    Destination: ECS Service
    Protocol: HTTP
    
  - Name: app-to-db
    Source: ECS Service
    Destination: RDS Cluster
    Protocol: PostgreSQL
```

### CloudWatch Network Metrics

```yaml
Custom Metrics:
  - NetworkPacketsIn
  - NetworkPacketsOut
  - NetworkBytesIn
  - NetworkBytesOut
  - NetworkLatency
  - ConnectionCount
  - ActiveConnections
  - FailedConnections

Alarms:
  - High Network Utilization (>80%)
  - Connection Failures (>5%)
  - High Latency (>100ms)
  - Unusual Traffic Patterns
```

## Security Considerations

### Network Segmentation

1. **Three-Tier Architecture**
   - Public tier: Load balancers and NAT gateways
   - Private tier: Application components
   - Database tier: Data storage with no internet access

2. **Micro-segmentation**
   - Separate security groups for each component type
   - Principle of least privilege for network access
   - Regular security group audits

### Traffic Encryption

1. **In-Transit Encryption**
   - TLS 1.3 for all HTTPS traffic
   - SSL termination at load balancer
   - Internal traffic encryption between services

2. **VPN Connectivity**
   - Site-to-site VPN for on-premises integration
   - Client VPN for remote administrative access
   - AWS PrivateLink for AWS service connectivity

### Network Access Control

1. **Bastion Host Strategy**
   - Centralized access point for administrative tasks
   - Multi-factor authentication required
   - Session logging and monitoring

2. **API Gateway Integration**
   - Rate limiting and throttling
   - API key management
   - Request/response logging

### Compliance and Auditing

1. **Network Compliance**
   - Regular security group reviews
   - NACL effectiveness testing
   - Penetration testing quarterly

2. **Audit Logging**
   - VPC Flow Logs for all traffic
   - CloudTrail for API calls
   - Config Rules for compliance monitoring

## Disaster Recovery Network Design

### Multi-Region Setup

```yaml
Primary Region: us-east-1
Secondary Region: us-west-2

Cross-Region Connectivity:
  - VPC Peering between regions
  - Route 53 health checks for failover
  - Cross-region replication for databases
  - S3 cross-region replication for backups
```

### Failover Procedures

1. **Automated Failover**
   - Route 53 health checks trigger DNS failover
   - Application Load Balancer health checks
   - Auto Scaling Group replacements

2. **Manual Failover**
   - Update Route 53 records
   - Scale up secondary region resources
   - Redirect traffic to backup systems

## Network Performance Optimization

### Bandwidth Optimization

1. **Enhanced Networking**
   - SR-IOV for EC2 instances
   - Placement groups for low latency
   - Dedicated tenancy for sensitive workloads

2. **Content Delivery**
   - CloudFront for static content
   - S3 Transfer Acceleration
   - Regional edge caches

### Latency Reduction

1. **Geographic Distribution**
   - Multi-AZ deployment
   - Regional failover capabilities
   - Edge location utilization

2. **Connection Optimization**
   - Connection pooling
   - Keep-alive connections
   - HTTP/2 support

---

*This network architecture document is maintained as part of the ACSO system documentation. For updates and changes, refer to the infrastructure as code templates and deployment guides.*