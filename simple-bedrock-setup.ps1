Write-Host "Setting up Bedrock AI Agents" -ForegroundColor Green

# Check Bedrock availability
Write-Host "Checking Bedrock service..."
try {
    $models = aws bedrock list-foundation-models --region us-east-1 --output json
    Write-Host "Bedrock service is available"
} catch {
    Write-Host "Bedrock service check failed: $_"
}

# Get account info
$accountId = aws sts get-caller-identity --query Account --output text
Write-Host "Account ID: $accountId"

# Try to create a simple agent
Write-Host "Attempting to create threat detection agent..."
try {
    $result = aws bedrock-agent create-agent --agent-name "acso-threat-detector-demo" --foundation-model "anthropic.claude-3-haiku-20240307-v1:0" --instruction "You are a cybersecurity threat detection agent." --region us-east-1 --output json
    Write-Host "Agent creation result: $result"
} catch {
    Write-Host "Agent creation failed: $_"
}

Write-Host "Bedrock setup attempt completed"