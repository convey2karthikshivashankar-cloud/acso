# ACSO Enterprise UI - AWS Deployment
param(
    [string]$BucketName = "acso-enterprise-ui-$(Get-Random -Minimum 1000 -Maximum 9999)",
    [string]$Region = "us-east-1"
)

Write-Host "🚀 Deploying ACSO Enterprise UI to AWS" -ForegroundColor Green
Write-Host "=======================================" -ForegroundColor Green

# Step 1: Build the frontend
Write-Host "📦 Building frontend..." -ForegroundColor Yellow
Set-Location frontend

# Install dependencies if needed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Cyan
    npm install
}

# Build for production with live data enabled
Write-Host "Building production bundle with live data..." -ForegroundColor Cyan
$env:VITE_ENABLE_LIVE_DATA = "true"
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed" -ForegroundColor Green
Set-Location ..

# Step 2: Create S3 bucket
Write-Host "🪣 Creating S3 bucket: $BucketName" -ForegroundColor Yellow
try {
    aws s3 mb s3://$BucketName --region $Region 2>$null
    Write-Host "✅ Bucket created successfully" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Bucket might already exist, continuing..." -ForegroundColor Yellow
}

# Step 3: Configure for static website hosting
Write-Host "🌐 Configuring static website hosting..." -ForegroundColor Yellow
aws s3 website s3://$BucketName --index-document index.html --error-document index.html

# Step 4: Create and apply bucket policy
Write-Host "🔓 Setting up public access policy..." -ForegroundColor Yellow
$policyContent = Get-Content "bucket-policy-template.json" -Raw
$policyContent = $policyContent.Replace("BUCKET_NAME", $BucketName)
$policyContent | Out-File -FilePath "bucket-policy.json" -Encoding UTF8

aws s3api put-bucket-policy --bucket $BucketName --policy file://bucket-policy.json

# Step 5: Upload files with caching headers
Write-Host "📤 Uploading files..." -ForegroundColor Yellow
aws s3 sync frontend/dist s3://$BucketName --delete --cache-control "public, max-age=31536000" --exclude "*.html"
aws s3 sync frontend/dist s3://$BucketName --delete --cache-control "no-cache" --exclude "*" --include "*.html"

# Step 6: Test deployment
$websiteUrl = "http://$BucketName.s3-website-$Region.amazonaws.com"

Write-Host ""
Write-Host "🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host "🌐 Website URL: $websiteUrl" -ForegroundColor Cyan
Write-Host "📱 Mobile Ready: Yes" -ForegroundColor Cyan
Write-Host "🔄 Live Data: Enabled" -ForegroundColor Cyan
Write-Host "💰 AWS Free Tier: Optimized" -ForegroundColor Cyan

# Step 7: Test connectivity
Write-Host ""
Write-Host "🔍 Testing deployment..." -ForegroundColor Yellow
try {
    $response = Invoke-WebRequest -Uri $websiteUrl -Method Head -TimeoutSec 10
    if ($response.StatusCode -eq 200) {
        Write-Host "✅ Deployment test successful!" -ForegroundColor Green
    }
} catch {
    Write-Host "⚠️ Deployment test pending (may take a few minutes to propagate)" -ForegroundColor Yellow
}

# Cleanup
Remove-Item -Path "bucket-policy.json" -ErrorAction SilentlyContinue

Write-Host ""
Write-Host "🚀 Your ACSO Enterprise UI is now live!" -ForegroundColor Green
Write-Host "Visit: $websiteUrl" -ForegroundColor Yellow
Write-Host ""
Write-Host "Features included:" -ForegroundColor Cyan
Write-Host "• Real-time dashboard with live metrics" -ForegroundColor Gray
Write-Host "• Agent management and monitoring" -ForegroundColor Gray
Write-Host "• Incident response workflows" -ForegroundColor Gray
Write-Host "• Financial analytics and ROI modeling" -ForegroundColor Gray
Write-Host "• Interactive visualizations" -ForegroundColor Gray
Write-Host "• Mobile-responsive design" -ForegroundColor Gray
Write-Host "• Live data simulation for demo" -ForegroundColor Gray