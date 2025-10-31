Write-Host "🤖 Setting up Amazon Bedrock AI Agents for ACSO" -ForegroundColor Green
Write-Host "=================================================" -ForegroundColor Green

# Check if Bedrock is available in the region
$region = "us-east-1"
Write-Host "🌍 Using region: $region" -ForegroundColor Cyan

# Get account ID
$accountId = aws sts get-caller-identity --query Account --output text
Write-Host "🔑 AWS Account: $accountId" -ForegroundColor Cyan

# Check Bedrock model availability
Write-Host "`n📋 Checking available Bedrock models..." -ForegroundColor Yellow
try {
    $models = aws bedrock list-foundation-models --region $region --output json | ConvertFrom-Json
    $claudeModels = $models.modelSummaries | Where-Object { $_.modelName -like "*Claude*" }
    
    if ($claudeModels.Count -gt 0) {
        Write-Host "✅ Found $($claudeModels.Count) Claude models available" -ForegroundColor Green
        $selectedModel = $claudeModels[0].modelId
        Write-Host "🎯 Using model: $selectedModel" -ForegroundColor Cyan
    } else {
        Write-Host "⚠️ No Claude models found, using default" -ForegroundColor Yellow
        $selectedModel = "anthropic.claude-3-haiku-20240307-v1:0"
    }
} catch {
    Write-Host "⚠️ Could not list models, using default" -ForegroundColor Yellow
    $selectedModel = "anthropic.claude-3-haiku-20240307-v1:0"
}

# Create IAM role for Bedrock agents if it doesn't exist
Write-Host "`n🔐 Setting up IAM role for Bedrock agents..." -ForegroundColor Yellow
$roleName = "ACSObedrock-agent-role"

try {
    $existingRole = aws iam get-role --role-name $roleName --output json 2>$null | ConvertFrom-Json
    if ($existingRole) {
        Write-Host "✅ IAM role already exists: $($existingRole.Role.Arn)" -ForegroundColor Green
        $roleArn = $existingRole.Role.Arn
    }
} catch {
    Write-Host "📝 Creating new IAM role..." -ForegroundColor Yellow
    
    # Create trust policy
    $trustPolicy = @{
        Version = "2012-10-17"
        Statement = @(
            @{
                Effect = "Allow"
                Principal = @{
                    Service = "bedrock.amazonaws.com"
                }
                Action = "sts:AssumeRole"
            }
        )
    } | ConvertTo-Json -Depth 10
    
    # Create the role
    $newRole = aws iam create-role --role-name $roleName --assume-role-policy-document $trustPolicy --output json | ConvertFrom-Json
    $roleArn = $newRole.Role.Arn
    
    # Attach necessary policies
    aws iam attach-role-policy --role-name $roleName --policy-arn "arn:aws:iam::aws:policy/AmazonBedrockFullAccess"
    
    Write-Host "✅ Created IAM role: $roleArn" -ForegroundColor Green
}

# Create Threat Detection Agent
Write-Host "`n🛡️ Creating Threat Detection Agent..." -ForegroundColor Yellow
$threatAgentName = "acso-threat-detector"
$threatInstruction = "You are an advanced cybersecurity threat detection agent for the ACSO system. Your primary responsibilities include:

1. THREAT ANALYSIS: Analyze security events, network traffic patterns, system logs, and behavioral anomalies to identify potential threats including APTs, malware, insider threats, and zero-day exploits.

2. RISK ASSESSMENT: Provide detailed threat assessments with risk scores (1-10), impact analysis, and confidence levels for each detected threat.

3. THREAT INTELLIGENCE: Correlate findings with known threat intelligence feeds, IOCs, and attack patterns to provide context and attribution.

4. RECOMMENDATIONS: Suggest immediate containment actions, investigation steps, and long-term security improvements.

5. COLLABORATION: Work with incident response agents to coordinate threat response activities and share critical findings.

Always provide structured responses with clear threat classifications, evidence, and actionable recommendations. Focus on accuracy and minimize false positives while maintaining high detection sensitivity for advanced threats."

try {
    $threatAgent = aws bedrock-agent create-agent --agent-name $threatAgentName --foundation-model $selectedModel --instruction $threatInstruction --agent-resource-role-arn $roleArn --region $region --output json | ConvertFrom-Json
    Write-Host "✅ Threat Detection Agent created: $($threatAgent.agent.agentId)" -ForegroundColor Green
    $threatAgentId = $threatAgent.agent.agentId
} catch {
    Write-Host "⚠️ Failed to create Threat Detection Agent: $($_.Exception.Message)" -ForegroundColor Yellow
    $threatAgentId = $null
}

# Create Incident Response Agent
Write-Host "`n🚨 Creating Incident Response Agent..." -ForegroundColor Yellow
$incidentAgentName = "acso-incident-responder"
$incidentInstruction = "You are an intelligent incident response coordination agent for the ACSO system. Your core responsibilities include:

1. INCIDENT COORDINATION: Orchestrate comprehensive incident response activities, manage response timelines, and coordinate between technical teams and stakeholders.

2. CONTAINMENT STRATEGIES: Recommend and implement immediate containment measures to prevent threat spread while preserving evidence for investigation.

3. INVESTIGATION MANAGEMENT: Guide forensic analysis, evidence collection, and root cause analysis to understand attack vectors and impact scope.

4. COMMUNICATION: Provide clear, timely updates to stakeholders including technical teams, management, and external parties as required.

5. REMEDIATION PLANNING: Develop comprehensive remediation strategies including system recovery, security improvements, and lessons learned integration.

6. COMPLIANCE: Ensure incident response activities meet regulatory requirements and industry standards.

Always maintain detailed incident documentation, provide clear status updates, and focus on minimizing business impact while ensuring thorough investigation and recovery."

try {
    $incidentAgent = aws bedrock-agent create-agent --agent-name $incidentAgentName --foundation-model $selectedModel --instruction $incidentInstruction --agent-resource-role-arn $roleArn --region $region --output json | ConvertFrom-Json
    Write-Host "✅ Incident Response Agent created: $($incidentAgent.agent.agentId)" -ForegroundColor Green
    $incidentAgentId = $incidentAgent.agent.agentId
} catch {
    Write-Host "⚠️ Failed to create Incident Response Agent: $($_.Exception.Message)" -ForegroundColor Yellow
    $incidentAgentId = $null
}

# Create Financial Intelligence Agent
Write-Host "`n💰 Creating Financial Intelligence Agent..." -ForegroundColor Yellow
$financialAgentName = "acso-financial-intelligence"
$financialInstruction = "You are a financial intelligence and optimization agent for the ACSO system, specializing in MSP business optimization. Your key responsibilities include:

1. COST ANALYSIS: Analyze operational costs, security tool expenses, and resource utilization to identify optimization opportunities.

2. ROI MODELING: Calculate return on investment for security initiatives, automation projects, and service improvements.

3. PRICING OPTIMIZATION: Recommend optimal pricing strategies for MSP services based on value delivery, market positioning, and cost structures.

4. REVENUE INTELLIGENCE: Identify upselling opportunities, service expansion possibilities, and premium service offerings.

5. BUDGET FORECASTING: Provide accurate budget forecasts for security operations, tool licensing, and staffing requirements.

6. PERFORMANCE METRICS: Track and analyze key financial KPIs including profit margins, customer acquisition costs, and lifetime value.

Always provide data-driven recommendations with clear financial justifications, risk assessments, and implementation timelines. Focus on maximizing profitability while maintaining service quality."

try {
    $financialAgent = aws bedrock-agent create-agent --agent-name $financialAgentName --foundation-model $selectedModel --instruction $financialInstruction --agent-resource-role-arn $roleArn --region $region --output json | ConvertFrom-Json
    Write-Host "✅ Financial Intelligence Agent created: $($financialAgent.agent.agentId)" -ForegroundColor Green
    $financialAgentId = $financialAgent.agent.agentId
} catch {
    Write-Host "⚠️ Failed to create Financial Intelligence Agent: $($_.Exception.Message)" -ForegroundColor Yellow
    $financialAgentId = $null
}

# Save agent configuration
Write-Host "`n💾 Saving agent configuration..." -ForegroundColor Yellow
$agentConfig = @{
    region = $region
    accountId = $accountId
    model = $selectedModel
    roleArn = $roleArn
    agents = @{
        threatDetection = @{
            name = $threatAgentName
            id = $threatAgentId
            status = if ($threatAgentId) { "created" } else { "failed" }
        }
        incidentResponse = @{
            name = $incidentAgentName
            id = $incidentAgentId
            status = if ($incidentAgentId) { "created" } else { "failed" }
        }
        financialIntelligence = @{
            name = $financialAgentName
            id = $financialAgentId
            status = if ($financialAgentId) { "created" } else { "failed" }
        }
    }
    createdAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
}

$agentConfig | ConvertTo-Json -Depth 10 | Out-File -FilePath "bedrock-agents-config.json" -Encoding UTF8

Write-Host "`n🎉 Bedrock Agents Setup Complete!" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "Configuration saved to: bedrock-agents-config.json" -ForegroundColor Cyan

if ($threatAgentId -or $incidentAgentId -or $financialAgentId) {
    Write-Host "`n✅ Successfully created agents:" -ForegroundColor Green
    if ($threatAgentId) { Write-Host "  🛡️ Threat Detection: $threatAgentId" -ForegroundColor White }
    if ($incidentAgentId) { Write-Host "  🚨 Incident Response: $incidentAgentId" -ForegroundColor White }
    if ($financialAgentId) { Write-Host "  💰 Financial Intelligence: $financialAgentId" -ForegroundColor White }
    
    Write-Host "`n🚀 Next Steps:" -ForegroundColor Yellow
    Write-Host "1. Agents need to be prepared before use (this can take a few minutes)" -ForegroundColor White
    Write-Host "2. Test agents with sample scenarios" -ForegroundColor White
    Write-Host "3. Integrate agents with the frontend demo" -ForegroundColor White
    Write-Host "4. Configure agent collaboration workflows" -ForegroundColor White
} else {
    Write-Host "`n⚠️ No agents were created successfully" -ForegroundColor Yellow
    Write-Host "Check AWS permissions and Bedrock service availability" -ForegroundColor White
}