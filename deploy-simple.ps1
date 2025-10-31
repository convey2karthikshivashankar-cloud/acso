# ACSO Enterprise UI - Simple AWS Deployment
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

# Build for production
Write-Host "Building production bundle..." -ForegroundColor Cyan
npm run build:demo

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Build failed!" -ForegroundColor Red
    exit 1
}

Write-Host "✅ Build completed" -ForegroundColor Green
Set-Location ..

# Step 2: Create S3 bucket
Write-Host "🪣 Creating S3 bucket: $BucketName" -ForegroundColor Yellow
try {
    aws s3 mb s3://$BucketName --region $Region
    Write-Host "✅ Bucket created" -ForegroundColor Green
} catch {
    Write-Host "⚠️ Bucket creation failed or already exists" -ForegroundColor Yellow
}

# Step 3: Configure for static website
Write-Host "🌐 Configuring static website..." -ForegroundColor Yellow
aws s3 website s3://$BucketName --index-document index.html --error-document index.html

# Step 4: Set public read policy
Write-Host "🔓 Setting public access..." -ForegroundColor Yellow
$policy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "PublicReadGetObject",
      "Effect": "Allow",
      "Principal": "*",
      "Action": "s3:GetObject",
      "Resource": "arn:aws:s3:::$BucketName/*"
    }
  ]
}
"@

$policy | Out-File -FilePath "policy.json" -Encoding UTF8
aws s3api put-bucket-policy --bucket $BucketName --policy file://policy.json

# Step 5: Upload files
Write-Host "📤 Uploading files..." -ForegroundColor Yellow
aws s3 sync frontend/dist s3://$BucketName --delete

# Step 6: Get website URL
$websiteUrl = "http://$BucketName.s3-website-$Region.amazonaws.com"

Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "========================" -ForegroundColor Green
Write-Host "🌐 Website URL: $websiteUrl" -ForegroundColor Cyan
Write-Host "📱 Mobile Ready: Yes" -ForegroundColor Cyan
Write-Host "🔄 Live Data: Enabled" -ForegroundColor Cyan

# Cleanup
Remove-Item -Path "policy.json" -ErrorAction SilentlyContinue

Write-Host "`n🚀 Your ACSO Enterprise UI is now live!" -ForegroundColor Green
Write-Host "Visit: $websiteUrl" -ForegroundColor Yellow