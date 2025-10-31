# ACSO Enterprise UI Deployment Script
# Deploys the full-featured React app to AWS S3 with CloudFront

param(
    [string]$BucketName = "acso-enterprise-ui-$(Get-Random -Minimum 1000 -Maximum 9999)",
    [string]$Region = "us-east-1"
)

Write-Host "🚀 Starting ACSO Enterprise UI Deployment..." -ForegroundColor Green
Write-Host "Bucket: $BucketName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

# Step 1: Build the production frontend
Write-Host "`n📦 Building production frontend..." -ForegroundColor Cyan
Set-Location frontend

# Install dependencies if needed
if (!(Test-Path "node_modules")) {
    Write-Host "Installing dependencies..." -ForegroundColor Yellow
    npm install
}

# Build for production
Write-Host "Building optimized production bundle..." -ForegroundColor Yellow
npm run build

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Frontend build failed!" -ForegroundColor Red
    exit 1
}

Set-Location ..

# Step 2: Create S3 bucket
Write-Host "`n🪣 Creating S3 bucket..." -ForegroundColor Cyan
try {
    aws s3 mb s3://$BucketName --region $Region
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Failed to create S3 bucket!" -ForegroundColor Red
        exit 1
    }
} catch {
    Write-Host "❌ Error creating bucket: $_" -ForegroundColor Red
    exit 1
}

# Step 3: Configure bucket for static website hosting
Write-Host "`n🌐 Configuring static website hosting..." -ForegroundColor Cyan
$websiteConfig = @"
{
    "IndexDocument": {
        "Suffix": "index.html"
    },
    "ErrorDocument": {
        "Key": "index.html"
    }
}
"@

$websiteConfig | Out-File -FilePath "website-config.json" -Encoding UTF8
aws s3api put-bucket-website --bucket $BucketName --website-configuration file://website-config.json

# Step 4: Set bucket policy for public read access
Write-Host "`n🔓 Setting bucket policy..." -ForegroundColor Cyan
$bucketPolicy = @"
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

$bucketPolicy | Out-File -FilePath "bucket-policy.json" -Encoding UTF8
aws s3api put-bucket-policy --bucket $BucketName --policy file://bucket-policy.json

# Step 5: Upload frontend files
Write-Host "`n📤 Uploading frontend files..." -ForegroundColor Cyan
aws s3 sync frontend/dist/ s3://$BucketName --delete --cache-control "max-age=31536000" --exclude "*.html"
aws s3 sync frontend/dist/ s3://$BucketName --delete --cache-control "no-cache" --include "*.html"

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to upload files!" -ForegroundColor Red
    exit 1
}

# Step 6: Create CloudFront distribution for better performance
Write-Host "`n☁️ Creating CloudFront distribution..." -ForegroundColor Cyan
$distributionConfig = @"
{
    "CallerReference": "acso-enterprise-$(Get-Date -Format 'yyyyMMddHHmmss')",
    "Comment": "ACSO Enterprise UI Distribution",
    "DefaultCacheBehavior": {
        "TargetOriginId": "$BucketName-origin",
        "ViewerProtocolPolicy": "redirect-to-https",
        "TrustedSigners": {
            "Enabled": false,
            "Quantity": 0
        },
        "ForwardedValues": {
            "QueryString": false,
            "Cookies": {
                "Forward": "none"
            }
        },
        "MinTTL": 0,
        "DefaultTTL": 86400,
        "MaxTTL": 31536000,
        "Compress": true
    },
    "Origins": {
        "Quantity": 1,
        "Items": [
            {
                "Id": "$BucketName-origin",
                "DomainName": "$BucketName.s3-website-$Region.amazonaws.com",
                "CustomOriginConfig": {
                    "HTTPPort": 80,
                    "HTTPSPort": 443,
                    "OriginProtocolPolicy": "http-only"
                }
            }
        ]
    },
    "Enabled": true,
    "DefaultRootObject": "index.html",
    "CustomErrorResponses": {
        "Quantity": 1,
        "Items": [
            {
                "ErrorCode": 404,
                "ResponsePagePath": "/index.html",
                "ResponseCode": "200",
                "ErrorCachingMinTTL": 300
            }
        ]
    },
    "PriceClass": "PriceClass_100"
}
"@

$distributionConfig | Out-File -FilePath "cloudfront-config.json" -Encoding UTF8
$distribution = aws cloudfront create-distribution --distribution-config file://cloudfront-config.json | ConvertFrom-Json

if ($LASTEXITCODE -ne 0) {
    Write-Host "⚠️ CloudFront distribution creation failed, but S3 hosting is still available" -ForegroundColor Yellow
    $cloudfrontUrl = "Not created"
} else {
    $cloudfrontUrl = "https://$($distribution.Distribution.DomainName)"
    Write-Host "✅ CloudFront distribution created: $cloudfrontUrl" -ForegroundColor Green
}

# Step 7: Get website URLs
$s3Url = "http://$BucketName.s3-website-$Region.amazonaws.com"

Write-Host "`n🎉 Deployment Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "S3 Website URL: $s3Url" -ForegroundColor Cyan
Write-Host "CloudFront URL: $cloudfrontUrl" -ForegroundColor Cyan
Write-Host "Bucket Name: $BucketName" -ForegroundColor Yellow
Write-Host "Region: $Region" -ForegroundColor Yellow

# Step 8: Save deployment info
$deploymentInfo = @{
    BucketName = $BucketName
    Region = $Region
    S3Url = $s3Url
    CloudFrontUrl = $cloudfrontUrl
    DeployedAt = Get-Date -Format "yyyy-MM-dd HH:mm:ss"
    Features = @(
        "Real-time dashboards with live data simulation",
        "Advanced agent management and monitoring",
        "Comprehensive incident response workflows",
        "Financial analytics with ROI modeling",
        "Visual workflow designer",
        "Mobile responsive design",
        "Accessibility compliant (WCAG 2.1 AA)"
    )
}

$deploymentInfo | ConvertTo-Json -Depth 3 | Out-File -FilePath "ENTERPRISE_DEPLOYMENT_INFO.json" -Encoding UTF8

Write-Host "`n📋 Deployment information saved to ENTERPRISE_DEPLOYMENT_INFO.json" -ForegroundColor Green

# Cleanup temporary files
Remove-Item -Path "website-config.json", "bucket-policy.json", "cloudfront-config.json" -ErrorAction SilentlyContinue

Write-Host "`n🔗 Access your ACSO Enterprise UI at:" -ForegroundColor Green
Write-Host "   $s3Url" -ForegroundColor White
if ($cloudfrontUrl -ne "Not created") {
    Write-Host "   $cloudfrontUrl (recommended - faster)" -ForegroundColor White
}

Write-Host "`n✨ Features available in this deployment:" -ForegroundColor Cyan
$deploymentInfo.Features | ForEach-Object { Write-Host "   • $_" -ForegroundColor White }