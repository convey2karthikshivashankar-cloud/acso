Write-Host "ACSO Demo Verification" -ForegroundColor Green

# Get account ID
$accountId = aws sts get-caller-identity --query Account --output text
Write-Host "Account ID: $accountId"

# Check stack status
$stackStatus = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].StackStatus" --output text
Write-Host "Stack Status: $stackStatus"

# Get bucket name
$bucketName = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text
Write-Host "S3 Bucket: $bucketName"

# Get frontend URL
$frontendUrl = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text
Write-Host "Frontend URL: $frontendUrl"

# Upload frontend if exists
if (Test-Path "frontend/dist") {
    Write-Host "Uploading frontend..."
    aws s3 sync frontend/dist/ "s3://$bucketName/" --delete
    Write-Host "Upload complete!"
} else {
    Write-Host "Frontend dist folder not found"
}

Write-Host "Demo is ready at: $frontendUrl" -ForegroundColor Green