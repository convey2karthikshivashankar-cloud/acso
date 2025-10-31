# Get ACSO Demo deployment information
Write-Host "Getting ACSO Demo deployment information..." -ForegroundColor Cyan

# Get AWS Account ID
$accountId = aws sts get-caller-identity --query Account --output text
Write-Host "AWS Account ID: $accountId" -ForegroundColor Yellow

# Construct bucket name based on our CloudFormation template
$bucketName = "acso-demo-frontend-$accountId"
Write-Host "Expected S3 Bucket: $bucketName" -ForegroundColor Yellow

# Test if bucket exists
$bucketExists = aws s3 ls "s3://$bucketName" 2>$null
if ($LASTEXITCODE -eq 0) {
    Write-Host "✅ S3 bucket exists and is accessible" -ForegroundColor Green
    
    # Upload frontend
    Write-Host "🚀 Uploading frontend to S3..." -ForegroundColor Cyan
    aws s3 sync frontend/dist/ "s3://$bucketName/" --delete --region us-east-1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend uploaded successfully!" -ForegroundColor Green
        
        # Try to get CloudFront URL
        Write-Host "🌐 Getting CloudFront URL..." -ForegroundColor Cyan
        $cfUrl = aws cloudformation describe-stacks --stack-name acso-demo --region us-east-1 --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text 2>$null
        
        if ($cfUrl -and $cfUrl -ne "None") {
            Write-Host "🎉 Your ACSO Demo is ready!" -ForegroundColor Green
            Write-Host "URL: $cfUrl" -ForegroundColor White
        } else {
            Write-Host "⏳ CloudFront distribution is still propagating..." -ForegroundColor Yellow
            Write-Host "Your demo will be available shortly at the CloudFront URL" -ForegroundColor Gray
        }
    } else {
        Write-Host "❌ Failed to upload frontend" -ForegroundColor Red
    }
} else {
    Write-Host "❌ S3 bucket not accessible: $bucketName" -ForegroundColor Red
    Write-Host "Checking CloudFormation stack status..." -ForegroundColor Yellow
    aws cloudformation describe-stacks --stack-name acso-demo --region us-east-1 --query "Stacks[0].StackStatus" --output text
}