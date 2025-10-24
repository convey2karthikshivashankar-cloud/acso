# ACSO Demo System - Build, Deploy & Run Guide

This guide provides step-by-step instructions to build, deploy, and run the ACSO Agentic AI Demo system that has been developed so far.

## System Overview

The current demo system includes:
- **Frontend**: React/TypeScript application with Material-UI
- **Backend API**: FastAPI Python application
- **Demo Components**: Interactive threat detection and response demonstrations
- **Agent Simulators**: Autonomous threat hunting and incident response agents

## Prerequisites

### Required Software
- **Node.js** (v18 or higher) - for frontend development
- **Python** (v3.8 or higher) - for backend API
- **Git** - for version control
- **VS Code** (recommended) - with Kiro IDE extension

### System Requirements
- **RAM**: 8GB minimum, 16GB recommended
- **Storage**: 5GB free space
- **OS**: Windows 10/11, macOS, or Linux
- **Browser**: Chrome, Firefox, Safari, or Edge (latest versions)

## Quick Start (Development Mode)

### 1. Install Dependencies

#### Frontend Dependencies
```bash
# Navigate to frontend directory
cd frontend

# Install Node.js dependencies
npm install
```

#### Backend Dependencies
```bash
# Navigate to project root
cd ..

# Install Python dependencies
pip install -r requirements-api.txt
```

### 2. Start the Demo System

#### Option A: Start Both Services Simultaneously
```bash
# From project root - start both frontend and backend
npm run dev:all
```

#### Option B: Start Services Separately

**Terminal 1 - Backend API:**
```bash
# Start FastAPI backend
cd src/api
python run.py
```

**Terminal 2 - Frontend:**
```bash
# Start React frontend
cd frontend
npm run dev
```

### 3. Access the Demo

- **Frontend Application**: http://localhost:5173
- **Backend API**: http://localhost:8000
- **API Documentation**: http://localhost:8000/docs

## Detailed Setup Instructions

### Step 1: Environment Setup

#### 1.1 Clone and Navigate to Project
```bash
# If not already in the project directory
git status  # Verify you're in the ACSO project root
```

#### 1.2 Create Environment Configuration
```bash
# Copy environment template
copy .env.example .env

# Edit .env file with your configuration
notepad .env
```

**Required Environment Variables:**
```env
# API Configuration
API_HOST=localhost
API_PORT=8000
DEBUG=true

# Demo Configuration
DEMO_MODE=true
DEMO_DATA_REFRESH_INTERVAL=5000

# Security (for production)
SECRET_KEY=your-secret-key-here
JWT_SECRET=your-jwt-secret-here
```

### Step 2: Frontend Setup

#### 2.1 Install Frontend Dependencies
```bash
cd frontend
npm install
```

#### 2.2 Configure Frontend Environment
```bash
# Create frontend environment file
echo VITE_API_URL=http://localhost:8000 > .env.local
echo VITE_DEMO_MODE=true >> .env.local
```

#### 2.3 Build Frontend (Optional - for production)
```bash
# Development build
npm run build:dev

# Production build
npm run build
```

### Step 3: Backend Setup

#### 3.1 Install Backend Dependencies
```bash
cd ..  # Back to project root
pip install -r requirements-api.txt
```

#### 3.2 Initialize Database (if needed)
```bash
# Initialize demo database
python -c "from src.api.models import init_db; init_db()"
```

#### 3.3 Start Backend Services
```bash
# Start API server
cd src/api
python run.py
```

### Step 4: Demo Data Setup

#### 4.1 Generate Sample Data
```bash
# Run demo data generator
python demo/run_demo.py --setup-data
```

#### 4.2 Verify Demo Components
```bash
# Test agent simulators
python -c "from frontend.src.services.agentSimulator import agentSimulator; print('Agents initialized:', len(agentSimulator.getAgents()))"
```

## Running Specific Demo Scenarios

### Threat Detection Demo
```bash
# Start threat scenario demo
cd demo
python run_agentic_demo.py --scenario threat_detection
```

### Multi-Agent Coordination Demo
```bash
# Start coordination demo
python run_agentic_demo.py --scenario multi_agent_coordination
```

### Financial Intelligence Demo
```bash
# Start financial demo
python run_agentic_demo.py --scenario financial_intelligence
```

## Production Deployment

### Option 1: Docker Deployment

#### 1.1 Build Docker Images
```bash
# Build all services
docker-compose build
```

#### 1.2 Start Production Stack
```bash
# Start all services
docker-compose up -d
```

#### 1.3 Verify Deployment
```bash
# Check service status
docker-compose ps

# View logs
docker-compose logs -f
```

### Option 2: Manual Production Setup

#### 2.1 Build Frontend for Production
```bash
cd frontend
npm run build
npm run preview  # Test production build locally
```

#### 2.2 Configure Production Backend
```bash
# Set production environment
set ENVIRONMENT=production
set DEBUG=false

# Start with production settings
cd src/api
python run.py --host 0.0.0.0 --port 8000
```

#### 2.3 Serve Frontend (using nginx or similar)
```bash
# Copy build files to web server
copy frontend/dist/* /var/www/acso-demo/

# Configure nginx (example)
# Edit /etc/nginx/sites-available/acso-demo
```

## Accessing Demo Features

### 1. Main Dashboard
- **URL**: http://localhost:5173
- **Features**: Overview of all demo components
- **Navigation**: Use the sidebar to access different demo scenarios

### 2. Threat Scenario Demo
- **URL**: http://localhost:5173/demo/threat-scenarios
- **Features**: 
  - Network topology visualization
  - Real-time threat detection
  - Autonomous response simulation
  - Agent coordination display

### 3. Agent Management
- **URL**: http://localhost:5173/demo/agents
- **Features**:
  - Threat Hunter Agent interface
  - Incident Response Agent dashboard
  - Agent performance metrics
  - Communication flow visualization

### 4. Interactive Visualizations
- **URL**: http://localhost:5173/demo/visualizations
- **Features**:
  - Real-time metrics dashboard
  - Interactive network topology
  - Business impact calculations
  - ROI modeling tools

## Demo Controls and Features

### Starting a Demo Session
1. Navigate to the demo page
2. Select demo type (Threat Detection, Financial Intelligence, etc.)
3. Configure parameters (network size, threat type, complexity)
4. Click "Start Demo" to begin simulation

### Demo Controls
- **Play/Pause**: Control demo progression
- **Speed Control**: Adjust simulation speed (0.5x to 5x)
- **Reset**: Restart demo with new parameters
- **Export**: Save demo results and metrics

### Monitoring Features
- **Real-time Metrics**: Live performance indicators
- **Agent Status**: Current agent activities and workload
- **Threat Timeline**: Chronological event tracking
- **Business Impact**: Financial and operational impact calculations

## Troubleshooting

### Common Issues

#### Frontend Won't Start
```bash
# Clear node modules and reinstall
cd frontend
rmdir /s node_modules
del package-lock.json
npm install
npm run dev
```

#### Backend API Errors
```bash
# Check Python dependencies
pip list | findstr fastapi
pip install --upgrade fastapi uvicorn

# Restart with debug mode
cd src/api
python run.py --debug
```

#### Port Conflicts
```bash
# Check what's using ports
netstat -ano | findstr :5173
netstat -ano | findstr :8000

# Kill processes if needed
taskkill /PID <process_id> /F
```

#### Demo Data Issues
```bash
# Regenerate demo data
python demo/run_demo.py --reset-data
python demo/run_demo.py --setup-data
```

### Performance Optimization

#### Frontend Performance
```bash
# Enable production optimizations
cd frontend
npm run build
npm run preview
```

#### Backend Performance
```bash
# Use production ASGI server
pip install gunicorn
cd src/api
gunicorn main:app -w 4 -k uvicorn.workers.UvicornWorker
```

## Development Workflow

### Making Changes

#### Frontend Changes
```bash
cd frontend
# Make your changes to src/ files
# Hot reload will automatically update the browser
```

#### Backend Changes
```bash
cd src/api
# Make your changes to Python files
# Restart the server to see changes
python run.py
```

### Testing Changes
```bash
# Run frontend tests
cd frontend
npm test

# Run backend tests
cd ..
python -m pytest tests/
```

## Monitoring and Logs

### Application Logs
- **Frontend**: Browser developer console (F12)
- **Backend**: Terminal output where API server is running
- **Demo Logs**: `demo/logs/` directory

### Performance Monitoring
- **Frontend**: React DevTools browser extension
- **Backend**: FastAPI automatic metrics at `/metrics`
- **System**: Task Manager or Activity Monitor

### Health Checks
```bash
# Check frontend health
curl http://localhost:5173

# Check backend health
curl http://localhost:8000/health

# Check demo services
curl http://localhost:8000/demo/status
```

## Security Considerations

### Development Environment
- Default credentials are used for demo purposes
- CORS is enabled for localhost development
- Debug mode provides detailed error information

### Production Environment
- Change all default passwords and secrets
- Configure proper CORS settings
- Disable debug mode
- Use HTTPS for all communications
- Implement proper authentication and authorization

## Next Steps

After successfully running the demo system:

1. **Explore Demo Scenarios**: Try different threat types and network configurations
2. **Customize Parameters**: Adjust agent behavior and simulation settings
3. **Monitor Performance**: Use built-in metrics to understand system behavior
4. **Extend Functionality**: Add new demo scenarios or agent capabilities
5. **Integration Testing**: Test with real data sources and external systems

## Support and Resources

### Documentation
- **API Documentation**: http://localhost:8000/docs
- **Component Library**: Frontend Storybook (if configured)
- **Architecture Guide**: `docs/system-architecture.md`

### Getting Help
- Check the troubleshooting section above
- Review application logs for error details
- Consult the project documentation in the `docs/` directory
- Use the browser developer tools for frontend debugging

---

**Note**: This guide covers the current implementation. As new features are added to the demo system, this guide will be updated accordingly.