Write-Host "Building ACSO Frontend" -ForegroundColor Green

Set-Location frontend

# Try to build
Write-Host "Running npm run build..."
npm run build

# Check result
if (Test-Path "dist") {
    Write-Host "Build directory exists"
    Get-ChildItem "dist"
} else {
    Write-Host "No dist directory found"
}

Set-Location ..