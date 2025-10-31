Write-Host "Creating additional ACSO Bedrock agents" -ForegroundColor Green

# Create Incident Response Agent
Write-Host "Creating Incident Response Agent..."
try {
    $incidentAgent = aws bedrock-agent create-agent --agent-name "acso-incident-responder" --foundation-model "anthropic.claude-3-haiku-20240307-v1:0" --instruction "You are an intelligent incident response coordinator for cybersecurity incidents. Coordinate response activities, manage containment, and guide investigation processes." --region us-east-1 --output json
    Write-Host "Incident Response Agent created successfully"
    Write-Host $incidentAgent
} catch {
    Write-Host "Failed to create Incident Response Agent: $_"
}

# Create Financial Intelligence Agent
Write-Host "Creating Financial Intelligence Agent..."
try {
    $financialAgent = aws bedrock-agent create-agent --agent-name "acso-financial-intelligence" --foundation-model "anthropic.claude-3-haiku-20240307-v1:0" --instruction "You are a financial intelligence agent specializing in MSP business optimization, cost analysis, ROI modeling, and revenue optimization for cybersecurity services." --region us-east-1 --output json
    Write-Host "Financial Intelligence Agent created successfully"
    Write-Host $financialAgent
} catch {
    Write-Host "Failed to create Financial Intelligence Agent: $_"
}

Write-Host "Agent creation completed"