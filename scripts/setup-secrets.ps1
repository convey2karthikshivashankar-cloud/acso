# ACSO AWS Secrets Setup Script
# This script creates the necessary secrets in AWS Secrets Manager

param(
    [Parameter(Mandatory=$false)]
    [string]$Environment = "development",
    
    [Parameter(Mandatory=$false)]
    [string]$AwsRegion = "us-east-1"
)

$ErrorActionPreference = "Stop"

function Write-Info {
    param([string]$Message)
    Write-Host "[INFO] $Message" -ForegroundColor Blue
}

function Write-Success {
    param([string]$Message)
    Write-Host "[SUCCESS] $Message" -ForegroundColor Green
}

function Write-Error {
    param([string]$Message)
    Write-Host "[ERROR] $Message" -ForegroundColor Red
}

function New-RandomPassword {
    param([int]$Length = 32)
    
    $chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789!@#$%^&*"
    $password = ""
    
    for ($i = 0; $i -lt $Length; $i++) {
        $password += $chars[(Get-Random -Maximum $chars.Length)]
    }
    
    return $password
}

function New-Secret {
    param(
        [string]$SecretName,
        [string]$SecretValue,
        [string]$Description
    )
    
    try {
        # Check if secret exists
        aws secretsmanager describe-secret --secret-id $SecretName --region $AwsRegion | Out-Null
        Write-Info "Secret $SecretName already exists, updating..."
        
        aws secretsmanager update-secret `
            --secret-id $SecretName `
            --secret-string $SecretValue `
            --region $AwsRegion | Out-Null
            
        Write-Success "Updated secret: $SecretName"
    }
    catch {
        Write-Info "Creating new secret: $SecretName"
        
        aws secretsmanager create-secret `
            --name $SecretName `
            --description $Description `
            --secret-string $SecretValue `
            --region $AwsRegion | Out-Null
            
        Write-Success "Created secret: $SecretName"
    }
}

# Main execution
Write-Info "Setting up AWS Secrets Manager secrets for ACSO..."
Write-Info "Environment: $Environment"
Write-Info "Region: $AwsRegion"

# Generate random passwords and keys
$dbPassword = New-RandomPassword -Length 32
$jwtSecret = New-RandomPassword -Length 64
$redisPassword = New-RandomPassword -Length 32

# Create secrets
$secrets = @{
    "acso/$Environment/db-password" = @{
        value = $dbPassword
        description = "Database password for ACSO $Environment environment"
    }
    "acso/$Environment/jwt-secret" = @{
        value = $jwtSecret
        description = "JWT secret key for ACSO $Environment environment"
    }
    "acso/$Environment/redis-password" = @{
        value = $redisPassword
        description = "Redis password for ACSO $Environment environment"
    }
    "acso/$Environment/bedrock-model-id" = @{
        value = "anthropic.claude-3-sonnet-20240229-v1:0"
        description = "Bedrock model ID for ACSO $Environment environment"
    }
}

foreach ($secretName in $secrets.Keys) {
    $secret = $secrets[$secretName]
    New-Secret -SecretName $secretName -SecretValue $secret.value -Description $secret.description
}

# Create a master configuration secret with all connection strings
$masterConfig = @{
    database_url = "postgresql://acso:$dbPassword@acso-$Environment-db.cluster-xxx.rds.amazonaws.com:5432/acso"
    redis_url = "redis://:$redisPassword@acso-$Environment-redis.xxx.cache.amazonaws.com:6379"
    jwt_secret = $jwtSecret
    bedrock_model_id = "anthropic.claude-3-sonnet-20240229-v1:0"
} | ConvertTo-Json

New-Secret `
    -SecretName "acso/$Environment/config" `
    -SecretValue $masterConfig `
    -Description "Master configuration for ACSO $Environment environment"

Write-Success "All secrets have been created successfully!"
Write-Info "Secrets created:"
Write-Info "  - acso/$Environment/db-password"
Write-Info "  - acso/$Environment/jwt-secret"
Write-Info "  - acso/$Environment/redis-password"
Write-Info "  - acso/$Environment/bedrock-model-id"
Write-Info "  - acso/$Environment/config"

Write-Info "You can now proceed with the deployment."