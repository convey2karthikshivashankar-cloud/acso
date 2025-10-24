# ACSO Demo System - Quick Start Script
# This script sets up and starts the ACSO demo system automatically

param(
    [switch]$Setup,
    [switch]$Frontend,
    [switch]$Backend,
    [switch]$Full,
    [switch]$Production,
    [string]$Port = "5173",
    [string]$ApiPort = "8000"
)

# Colors for output
$Red = "Red"
$Green = "Green"
$Yellow = "Yellow"
$Blue = "Cyan"

function Write-ColorOutput($ForegroundColor, $Message) {
    Write-Host $Message -ForegroundColor $ForegroundColor
}

function Test-Command($Command) {
    try {
        Get-Command $Command -ErrorAction Stop | Out-Null
        return $true
    }
    catch {
        return $false
    }
}

function Show-Header {
    Write-ColorOutput $Blue @"
╔══════════════════════════════════════════════════════════════╗
║                    ACSO Demo System                          ║
║              Quick Start & Deployment Script                 ║
╚══════════════════════════════════════════════════════════════╝
"@
}

function Test-Prerequisites {
    Write-ColorOutput $Yellow "Checking prerequisites..."
    
    $allGood = $true
    
    # Check Node.js
    if (Test-Command "node") {
        $nodeVersion = node --version
        Write-ColorOutput $Green "✓ Node.js found: $nodeVersion"
    } else {
        Write-ColorOutput $Red "✗ Node.js not found. Please install Node.js 18+ from https://nodejs.org"
        $allGood = $false
    }
    
    # Check Python
    if (Test-Command "python") {
        $pythonVersion = python --version
        Write-ColorOutput $Green "✓ Python found: $pythonVersion"
    } else {
        Write-ColorOutput $Red "✗ Python not found. Please install Python 3.8+ from https://python.org"
        $allGood = $false
    }
    
    # Check npm
    if (Test-Command "npm") {
        $npmVersion = npm --version
        Write-ColorOutput $Green "✓ npm found: v$npmVersion"
    } else {
        Write-ColorOutput $Red "✗ npm not found. Please install Node.js which includes npm"
        $allGood = $false
    }
    
    # Check pip
    if (Test-Command "pip") {
        Write-ColorOutput $Green "✓ pip found"
    } else {
        Write-ColorOutput $Red "✗ pip not found. Please ensure Python is properly installed"
        $allGood = $false
    }
    
    return $allGood
}

function Setup-Environment {
    Write-ColorOutput $Yellow "Setting up environment..."
    
    # Create .env file if it doesn't exist
    if (-not (Test-Path ".env")) {
        Write-ColorOutput $Yellow "Creating .env file..."
        @"
# API Configuration
API_HOST=localhost
API_PORT=$ApiPort
DEBUG=true

# Demo Configuration
DEMO_MODE=true
DEMO_DATA_REFRESH_INTERVAL=5000

# Security
SECRET_KEY=demo-secret-key-change-in-production
JWT_SECRET=demo-jwt-secret-change-in-production
"@ | Out-File -FilePath ".env" -Encoding UTF8
        Write-ColorOutput $Green "✓ .env file created"
    } else {
        Write-ColorOutput $Green "✓ .env file already exists"
    }
    
    # Create frontend .env.local
    if (-not (Test-Path "frontend/.env.local")) {
        Write-ColorOutput $Yellow "Creating frontend environment file..."
        New-Item -ItemType Directory -Force -Path "frontend" | Out-Null
        @"
VITE_API_URL=http://localhost:$ApiPort
VITE_DEMO_MODE=true
"@ | Out-File -FilePath "frontend/.env.local" -Encoding UTF8
        Write-ColorOutput $Green "✓ Frontend .env.local created"
    } else {
        Write-ColorOutput $Green "✓ Frontend .env.local already exists"
    }
}

function Install-Dependencies {
    Write-ColorOutput $Yellow "Installing dependencies..."
    
    # Install frontend dependencies
    if (Test-Path "frontend/package.json") {
        Write-ColorOutput $Yellow "Installing frontend dependencies..."
        Set-Location "frontend"
        npm install
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput $Green "✓ Frontend dependencies installed"
        } else {
            Write-ColorOutput $Red "✗ Failed to install frontend dependencies"
            Set-Location ".."
            return $false
        }
        Set-Location ".."
    }
    
    # Install backend dependencies
    if (Test-Path "requirements-api.txt") {
        Write-ColorOutput $Yellow "Installing backend dependencies..."
        pip install -r requirements-api.txt
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput $Green "✓ Backend dependencies installed"
        } else {
            Write-ColorOutput $Red "✗ Failed to install backend dependencies"
            return $false
        }
    }
    
    return $true
}

function Start-Frontend {
    Write-ColorOutput $Yellow "Starting frontend development server..."
    
    if (-not (Test-Path "frontend")) {
        Write-ColorOutput $Red "✗ Frontend directory not found"
        return
    }
    
    Set-Location "frontend"
    
    if ($Production) {
        Write-ColorOutput $Yellow "Building for production..."
        npm run build
        if ($LASTEXITCODE -eq 0) {
            Write-ColorOutput $Green "✓ Frontend built successfully"
            Write-ColorOutput $Yellow "Starting production preview..."
            npm run preview -- --port $Port
        } else {
            Write-ColorOutput $Red "✗ Frontend build failed"
        }
    } else {
        Write-ColorOutput $Yellow "Starting development server on port $Port..."
        npm run dev -- --port $Port
    }
    
    Set-Location ".."
}

function Start-Backend {
    Write-ColorOutput $Yellow "Starting backend API server..."
    
    if (-not (Test-Path "src/api")) {
        Write-ColorOutput $Red "✗ Backend API directory not found"
        return
    }
    
    Set-Location "src/api"
    
    if ($Production) {
        Write-ColorOutput $Yellow "Starting production server..."
        python run.py --host 0.0.0.0 --port $ApiPort --production
    } else {
        Write-ColorOutput $Yellow "Starting development server on port $ApiPort..."
        python run.py --host localhost --port $ApiPort --debug
    }
    
    Set-Location "../.."
}

function Start-FullSystem {
    Write-ColorOutput $Yellow "Starting full demo system..."
    
    # Start backend in background
    Write-ColorOutput $Yellow "Starting backend server..."
    $backendJob = Start-Job -ScriptBlock {
        param($ApiPort)
        Set-Location $using:PWD
        Set-Location "src/api"
        python run.py --host localhost --port $ApiPort --debug
    } -ArgumentList $ApiPort
    
    # Wait a moment for backend to start
    Start-Sleep -Seconds 3
    
    # Check if backend started successfully
    try {
        $response = Invoke-WebRequest -Uri "http://localhost:$ApiPort/health" -TimeoutSec 5 -ErrorAction Stop
        Write-ColorOutput $Green "✓ Backend server started successfully"
    } catch {
        Write-ColorOutput $Yellow "⚠ Backend server may still be starting..."
    }
    
    # Start frontend
    Write-ColorOutput $Yellow "Starting frontend server..."
    Set-Location "frontend"
    npm run dev -- --port $Port
    
    # Cleanup
    Write-ColorOutput $Yellow "Stopping background services..."
    Stop-Job $backendJob -ErrorAction SilentlyContinue
    Remove-Job $backendJob -ErrorAction SilentlyContinue
    Set-Location ".."
}

function Show-AccessInfo {
    Write-ColorOutput $Blue @"

╔══════════════════════════════════════════════════════════════╗
║                     Access Information                       ║
╠══════════════════════════════════════════════════════════════╣
║  Frontend Application: http://localhost:$Port                    ║
║  Backend API:         http://localhost:$ApiPort                    ║
║  API Documentation:   http://localhost:$ApiPort/docs               ║
║                                                              ║
║  Demo Features:                                              ║
║  • Threat Scenario Demo                                      ║
║  • Agent Management Dashboard                                ║
║  • Interactive Visualizations                                ║
║  • Real-time Metrics                                         ║
╚══════════════════════════════════════════════════════════════╝

"@
}

function Show-Usage {
    Write-ColorOutput $Blue @"
Usage: .\scripts\start-demo.ps1 [OPTIONS]

Options:
  -Setup          Setup environment and install dependencies only
  -Frontend       Start frontend development server only
  -Backend        Start backend API server only  
  -Full           Start both frontend and backend servers
  -Production     Use production build/settings
  -Port <port>    Frontend port (default: 5173)
  -ApiPort <port> Backend API port (default: 8000)

Examples:
  .\scripts\start-demo.ps1 -Setup                    # Setup only
  .\scripts\start-demo.ps1 -Frontend                 # Frontend only
  .\scripts\start-demo.ps1 -Backend                  # Backend only
  .\scripts\start-demo.ps1 -Full                     # Both services
  .\scripts\start-demo.ps1 -Full -Production         # Production mode
  .\scripts\start-demo.ps1 -Frontend -Port 3000      # Custom port

"@
}

# Main execution
Show-Header

# Check if no parameters provided
if (-not ($Setup -or $Frontend -or $Backend -or $Full)) {
    Show-Usage
    exit 0
}

# Test prerequisites
if (-not (Test-Prerequisites)) {
    Write-ColorOutput $Red "Prerequisites not met. Please install required software and try again."
    exit 1
}

# Setup environment if requested or if running full setup
if ($Setup -or $Full) {
    Setup-Environment
    
    if (-not (Install-Dependencies)) {
        Write-ColorOutput $Red "Failed to install dependencies. Please check the errors above."
        exit 1
    }
    
    if ($Setup) {
        Write-ColorOutput $Green "✓ Setup completed successfully!"
        Write-ColorOutput $Yellow "You can now run the demo with: .\scripts\start-demo.ps1 -Full"
        exit 0
    }
}

# Start services based on parameters
try {
    if ($Frontend) {
        Start-Frontend
    } elseif ($Backend) {
        Start-Backend
    } elseif ($Full) {
        Show-AccessInfo
        Start-FullSystem
    }
} catch {
    Write-ColorOutput $Red "An error occurred: $($_.Exception.Message)"
    exit 1
} finally {
    Write-ColorOutput $Yellow "Demo system stopped."
}