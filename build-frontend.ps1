Write-Host "🏗️ Building ACSO React Frontend" -ForegroundColor Green

# Change to frontend directory
Set-Location frontend

# Check if node_modules exists
if (!(Test-Path "node_modules")) {
    Write-Host "📦 Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Clean dist directory
if (Test-Path "dist") {
    Remove-Item -Recurse -Force "dist"
}

# Build the application
Write-Host "🔨 Building React application..." -ForegroundColor Yellow
npm run build

# Check if build was successful
if (Test-Path "dist/index.html") {
    Write-Host "✅ Build completed successfully!" -ForegroundColor Green
    
    # List built files
    Write-Host "📁 Built files:" -ForegroundColor Cyan
    Get-ChildItem -Recurse "dist" | Select-Object Name, Length
    
    # Get S3 bucket name
    $bucketName = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].Outputs[?OutputKey=='S3BucketName'].OutputValue" --output text
    
    if ($bucketName -and $bucketName -ne "None") {
        Write-Host "🚀 Uploading to S3: $bucketName" -ForegroundColor Yellow
        aws s3 sync dist/ "s3://$bucketName/" --delete
        
        if ($LASTEXITCODE -eq 0) {
            Write-Host "✅ Frontend deployed successfully!" -ForegroundColor Green
            
            # Get CloudFront URL
            $frontendUrl = aws cloudformation describe-stacks --stack-name acso-demo-stack --query "Stacks[0].Outputs[?OutputKey=='FrontendUrl'].OutputValue" --output text
            Write-Host "🌐 Your ACSO demo is live at: $frontendUrl" -ForegroundColor Green
        } else {
            Write-Host "❌ Upload failed" -ForegroundColor Red
        }
    } else {
        Write-Host "⚠️ Could not get S3 bucket name" -ForegroundColor Yellow
    }
} else {
    Write-Host "Build failed - no dist/index.html found" -ForegroundColor Red
}

# Return to original directory
Set-Location ..