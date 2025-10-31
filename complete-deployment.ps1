Write-Host "🎉 ACSO Demo Deployment Completion" -ForegroundColor Green
Write-Host "===================================" -ForegroundColor Green

# Get deployment info
$accountId = aws sts get-caller-identity --query Account --output text
$bucketName = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text
$frontendUrl = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text
$s3WebsiteUrl = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].Outputs[?OutputKey=='S3WebsiteUrl'].OutputValue" --output text

Write-Host "✅ AWS Account: $accountId" -ForegroundColor Cyan
Write-Host "✅ S3 Bucket: $bucketName" -ForegroundColor Cyan
Write-Host "✅ CloudFront URL: $frontendUrl" -ForegroundColor Cyan
Write-Host "✅ S3 Website URL: $s3WebsiteUrl" -ForegroundColor Cyan

# Upload frontend
if (Test-Path "frontend/dist/index.html") {
    Write-Host "`n🚀 Uploading frontend files..." -ForegroundColor Yellow
    aws s3 sync frontend/dist/ "s3://$bucketName/" --delete
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "✅ Frontend uploaded successfully!" -ForegroundColor Green
        
        Write-Host "`n🌐 Your ACSO Demo is now live!" -ForegroundColor Green
        Write-Host "Primary URL: $frontendUrl" -ForegroundColor White
        Write-Host "Backup URL: $s3WebsiteUrl" -ForegroundColor Gray
        
        Write-Host "`n📋 Demo Features Available:" -ForegroundColor Yellow
        Write-Host "• Professional landing page with ACSO branding" -ForegroundColor White
        Write-Host "• Infrastructure status confirmation" -ForegroundColor White
        Write-Host "• Feature overview and roadmap" -ForegroundColor White
        Write-Host "• AWS Free Tier optimized deployment" -ForegroundColor White
        
        Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
        Write-Host "1. Visit the demo URL above" -ForegroundColor White
        Write-Host "2. The full React frontend will be deployed next" -ForegroundColor White
        Write-Host "3. Bedrock AI agents will be configured for demos" -ForegroundColor White
        Write-Host "4. Monitor costs with AWS Cost Explorer" -ForegroundColor White
        
    } else {
        Write-Host "❌ Frontend upload failed" -ForegroundColor Red
    }
} else {
    Write-Host "❌ Frontend files not found at frontend/dist/" -ForegroundColor Red
}

Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green