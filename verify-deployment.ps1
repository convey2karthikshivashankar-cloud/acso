#!/usr/bin/env powershell

Write-Host "🔍 ACSO Demo Deployment Verification" -ForegroundColor Green
Write-Host "====================================" -ForegroundColor Green

# Get account ID
try {
    $accountId = aws sts get-caller-identity --query Account --output text
    Write-Host "✅ AWS Account ID: $accountId" -ForegroundColor Cyan
} catch {
    Write-Host "❌ Failed to get AWS account ID" -ForegroundColor Red
    exit 1
}

# Check CloudFormation stack
Write-Host "`n📋 Checking CloudFormation Stack..." -ForegroundColor Yellow
try {
    $stackStatus = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].StackStatus" --output text
    Write-Host "Stack Status: $stackStatus" -ForegroundColor Cyan
    
    if ($stackStatus -eq "CREATE_COMPLETE" -or $stackStatus -eq "UPDATE_COMPLETE") {
        Write-Host "✅ CloudFormation stack is healthy" -ForegroundColor Green
        
        # Get outputs
        Write-Host "`n📤 Stack Outputs:" -ForegroundColor Yellow
        $outputs = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
        
        foreach ($output in $outputs) {
            Write-Host "$($output.OutputKey): $($output.OutputValue)" -ForegroundColor White
        }
        
        # Get S3 bucket name
        $bucketName = ($outputs | Where-Object { $_.OutputKey -eq "S3BucketName" }).OutputValue
        $frontendUrl = ($outputs | Where-Object { $_.OutputKey -eq "FrontendUrl" }).OutputValue
        
        if ($bucketName) {
            Write-Host "`n🪣 Checking S3 Bucket: $bucketName" -ForegroundColor Yellow
            
            # Test bucket access
            $bucketTest = aws s3 ls "s3://$bucketName" 2>$null
            if ($LASTEXITCODE -eq 0) {
                Write-Host "✅ S3 bucket is accessible" -ForegroundColor Green
                
                # Upload frontend if dist folder exists
                if (Test-Path "frontend/dist") {
                    Write-Host "`n🚀 Uploading frontend..." -ForegroundColor Yellow
                    aws s3 sync frontend/dist/ "s3://$bucketName/" --delete
                    
                    if ($LASTEXITCODE -eq 0) {
                        Write-Host "✅ Frontend uploaded successfully!" -ForegroundColor Green
                    } else {
                        Write-Host "❌ Frontend upload failed" -ForegroundColor Red
                    }
                } else {
                    Write-Host "⚠️ Frontend dist folder not found" -ForegroundColor Yellow
                }
            } else {
                Write-Host "❌ S3 bucket not accessible" -ForegroundColor Red
            }
        }
        
        if ($frontendUrl) {
            Write-Host "`n🌐 Frontend URL: $frontendUrl" -ForegroundColor Green
            Write-Host "Your ACSO demo is ready!" -ForegroundColor Green
        }
        
    } else {
        Write-Host "❌ CloudFormation stack is not healthy: $stackStatus" -ForegroundColor Red
    }
    
} catch {
    Write-Host "❌ Failed to check CloudFormation stack" -ForegroundColor Red
    Write-Host $_.Exception.Message -ForegroundColor Red
}

Write-Host "`n🎯 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Access your demo at the Frontend URL above" -ForegroundColor White
Write-Host "2. Navigate to the 'Agentic AI Demos' section" -ForegroundColor White
Write-Host "3. Try the threat detection scenarios" -ForegroundColor White
Write-Host "4. Monitor costs with: aws budgets describe-budgets" -ForegroundColor White