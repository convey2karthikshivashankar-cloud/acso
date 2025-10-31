# ACSO Enterprise UI Deployment
param([string]$BucketName = "acso-enterprise-ui-$(Get-Random -Minimum 1000 -Maximum 9999)")

Write-Host "Deploying ACSO Enterprise UI..." -ForegroundColor Green
Write-Host "Bucket: $BucketName" -ForegroundColor Yellow

# Build frontend
Write-Host "Building frontend..." -ForegroundColor Cyan
Set-Location frontend
npm run build
if ($LASTEXITCODE -ne 0) {
    Write-Host "Build failed!" -ForegroundColor Red
    exit 1
}
Set-Location ..

# Create bucket
Write-Host "Creating S3 bucket..." -ForegroundColor Cyan
aws s3 mb s3://$BucketName --region us-east-1

# Configure website
Write-Host "Configuring website..." -ForegroundColor Cyan
'{"IndexDocument":{"Suffix":"index.html"},"ErrorDocument":{"Key":"index.html"}}' | Out-File -FilePath "config.json" -Encoding UTF8
aws s3api put-bucket-website --bucket $BucketName --website-configuration file://config.json

# Set public policy
Write-Host "Setting public policy..." -ForegroundColor Cyan
$policyJson = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@
$policyJson | Out-File -FilePath "policy.json" -Encoding UTF8
aws s3api put-bucket-policy --bucket $BucketName --policy file://policy.json

# Upload files
Write-Host "Uploading files..." -ForegroundColor Cyan
aws s3 sync frontend/dist/ s3://$BucketName --delete

# Get URL
$url = "http://$BucketName.s3-website-us-east-1.amazonaws.com"
Write-Host "Deployed successfully!" -ForegroundColor Green
Write-Host "URL: $url" -ForegroundColor Cyan

# Save deployment info
$deploymentInfo = @{
    BucketName = $BucketName
    URL = $url
    DeployedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Features = @(
        "Real-time dashboards",
        "Agent management",
        "Incident response",
        "Financial analytics",
        "Workflow designer",
        "Mobile responsive",
        "Accessibility compliant"
    )
}
$deploymentInfo | ConvertTo-Json | Out-File "deployment-info.json"

# Cleanup
Remove-Item config.json, policy.json -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "ACSO Enterprise UI is live!" -ForegroundColor Green
Write-Host "Access at: $url" -ForegroundColor White
Write-Host ""
Write-Host "Next: Run .\start-live-data-simulation.ps1 for live data" -ForegroundColor Yellow