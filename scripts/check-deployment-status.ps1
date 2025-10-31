# ACSO Deployment Status Checker
# This script checks the CloudFormation deployment status and uploads frontend when ready

param(
    [string]$StackName = "acso-demo",
    [string]$Region = "us-east-1"
)

Write-Host "🔍 Checking ACSO Demo deployment status..." -ForegroundColor Cyan

try {
    # Check stack status
    $stackStatus = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].StackStatus" --output text 2>$null
    
    if ($LASTEXITCODE -ne 0) {
        Write-Host "❌ Stack not found or AWS CLI error" -ForegroundColor Red
        exit 1
    }
    
    Write-Host "📊 Stack Status: $stackStatus" -ForegroundColor Yellow
    
    switch ($stackStatus) {
        "CREATE_COMPLETE" {
            Write-Host "✅ Infrastructure deployment completed successfully!" -ForegroundColor Green
            
            # Get stack outputs
            Write-Host "📋 Getting deployment information..." -ForegroundColor Cyan
            $outputs = aws cloudformation describe-stacks --stack-name $StackName --region $Region --query "Stacks[0].Outputs" --output json | ConvertFrom-Json
            
            foreach ($output in $outputs) {
                Write-Host "  $($output.OutputKey): $($output.OutputValue)" -ForegroundColor White
            }
            
            # Get S3 bucket name for frontend upload
            $bucketName = ($outputs | Where-Object { $_.OutputKey -eq "S3BucketName" }).OutputValue
            $frontendUrl = ($outputs | Where-Object { $_.OutputKey -eq "FrontendUrl" }).OutputValue
            
            if ($bucketName) {
                Write-Host "`n🚀 Ready to upload frontend to S3..." -ForegroundColor Green
                Write-Host "Run this command to upload the frontend:" -ForegroundColor Yellow
                Write-Host "aws s3 sync frontend/dist/ s3://$bucketName/ --delete --region $Region" -ForegroundColor White
                
                if ($frontendUrl) {
                    Write-Host "`n🌐 Your demo will be available at:" -ForegroundColor Green
                    Write-Host "$frontendUrl" -ForegroundColor White
                }
            }
        }
        "CREATE_IN_PROGRESS" {
            Write-Host "⏳ Infrastructure is still being created..." -ForegroundColor Yellow
            Write-Host "This usually takes 5-10 minutes. Please wait..." -ForegroundColor Gray
        }
        "CREATE_FAILED" {
            Write-Host "❌ Infrastructure deployment failed!" -ForegroundColor Red
            Write-Host "Checking recent events..." -ForegroundColor Yellow
            aws cloudformation describe-stack-events --stack-name $StackName --region $Region --max-items 5 --query "StackEvents[?ResourceStatus=='CREATE_FAILED'].[LogicalResourceId,ResourceStatusReason]" --output table
        }
        "ROLLBACK_IN_PROGRESS" {
            Write-Host "🔄 Stack is rolling back due to errors..." -ForegroundColor Red
        }
        "ROLLBACK_COMPLETE" {
            Write-Host "❌ Stack creation failed and was rolled back" -ForegroundColor Red
            Write-Host "Check the CloudFormation console for details" -ForegroundColor Yellow
        }
        default {
            Write-Host "ℹ️  Stack status: $stackStatus" -ForegroundColor Blue
        }
    }
    
} catch {
    Write-Host "❌ Error checking deployment status: $($_.Exception.Message)" -ForegroundColor Red
}

Write-Host "`n💡 To monitor deployment progress, run:" -ForegroundColor Cyan
Write-Host "aws cloudformation describe-stack-events --stack-name $StackName --region $Region --max-items 10" -ForegroundColor White