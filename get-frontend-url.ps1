Write-Host "🌐 Getting ACSO Demo Frontend URLs" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green

# Method 1: Check if we have a CloudFormation stack with outputs
Write-Host "`n📋 Checking CloudFormation stack..." -ForegroundColor Yellow
try {
    $stackOutputs = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].Outputs" --output json 2>$null | ConvertFrom-Json
    if ($stackOutputs) {
        Write-Host "✅ CloudFormation stack found with outputs:" -ForegroundColor Green
        foreach ($output in $stackOutputs) {
            Write-Host "  $($output.OutputKey): $($output.OutputValue)" -ForegroundColor Cyan
        }
    }
} catch {
    Write-Host "⚠️ No CloudFormation stack outputs found" -ForegroundColor Yellow
}

# Method 2: Check S3 buckets for ACSO demo
Write-Host "`n🪣 Checking S3 buckets..." -ForegroundColor Yellow
try {
    $buckets = aws s3 ls | Select-String "acso"
    if ($buckets) {
        Write-Host "✅ Found ACSO S3 buckets:" -ForegroundColor Green
        $buckets | ForEach-Object {
            $bucketName = ($_ -split '\s+')[-1]
            Write-Host "  📁 $bucketName" -ForegroundColor Cyan
            
            # Generate S3 website URL
            $region = "us-east-1"  # Default region
            $websiteUrl = "http://$bucketName.s3-website-$region.amazonaws.com"
            Write-Host "  🌐 Website URL: $websiteUrl" -ForegroundColor White
            
            # Generate direct S3 URL
            $directUrl = "https://$bucketName.s3.amazonaws.com/index.html"
            Write-Host "  📄 Direct URL: $directUrl" -ForegroundColor White
        }
    } else {
        Write-Host "❌ No ACSO S3 buckets found" -ForegroundColor Red
    }
} catch {
    Write-Host "❌ Error checking S3 buckets: $_" -ForegroundColor Red
}

# Method 3: Get account ID and construct likely URLs
Write-Host "`n🔑 Getting account information..." -ForegroundColor Yellow
try {
    $accountId = aws sts get-caller-identity --query Account --output text
    Write-Host "✅ AWS Account ID: $accountId" -ForegroundColor Green
    
    # Construct likely bucket names
    $likelyBuckets = @(
        "acso-demo-bucket",
        "acso-demo-frontend-$accountId",
        "acso-demo-frontend-$accountId-us-east-1"
    )
    
    Write-Host "`n🎯 Likely frontend URLs:" -ForegroundColor Yellow
    foreach ($bucket in $likelyBuckets) {
        Write-Host "  🌐 http://$bucket.s3-website-us-east-1.amazonaws.com" -ForegroundColor Cyan
        Write-Host "  📄 https://$bucket.s3.amazonaws.com/index.html" -ForegroundColor Gray
    }
} catch {
    Write-Host "❌ Error getting account info: $_" -ForegroundColor Red
}

Write-Host "`n🚀 Quick Access Commands:" -ForegroundColor Green
Write-Host "=================================" -ForegroundColor Green
Write-Host "# Test if bucket exists and get URL:" -ForegroundColor Gray
Write-Host "aws s3 ls s3://acso-demo-bucket" -ForegroundColor White
Write-Host "# Open in browser (if bucket exists):" -ForegroundColor Gray
Write-Host "start http://acso-demo-bucket.s3-website-us-east-1.amazonaws.com" -ForegroundColor White

Write-Host "`n💡 Next Steps:" -ForegroundColor Yellow
Write-Host "1. Try the URLs listed above in your browser" -ForegroundColor White
Write-Host "2. If none work, check AWS Console > S3 for bucket details" -ForegroundColor White
Write-Host "3. Verify bucket has website hosting enabled" -ForegroundColor White