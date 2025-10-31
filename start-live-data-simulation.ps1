# ACSO Live Data Simulation Service
# Starts background services to generate realistic live data for demo purposes

param(
    [int]$Port = 3001,
    [string]$Environment = "demo"
)

Write-Host "🎭 Starting ACSO Live Data Simulation..." -ForegroundColor Green
Write-Host "Port: $Port" -ForegroundColor Yellow
Write-Host "Environment: $Environment" -ForegroundColor Yellow

# Step 1: Create the live data simulation server
Write-Host "`n📊 Creating live data simulation server..." -ForegroundColor Cyan

$simulationServer = @'
const express = require('express');
const cors = require('cors');
const WebSocket = require('ws');
const http = require('http');

const app = express();
const server = http.createServer(app);
const wss = new WebSocket.Server({ server });

app.use(cors());
app.use(express.json());

// Data generators
class LiveDataSimulator {
    constructor() {
        this.agents = this.generateAgents();
        this.incidents = this.generateIncidents();
        this.financialData = this.generateFinancialData();
        this.workflows = this.generateWorkflows();
        this.clients = new Set();
        
        // Start simulation loops
        this.startAgentSimulation();
        this.startIncidentSimulation();
        this.startFinancialSimulation();
        this.startWorkflowSimulation();
    }

    generateAgents() {
        const statuses = ['online', 'offline', 'warning', 'error'];
        const types = ['threat-hunter', 'incident-responder', 'vulnerability-scanner', 'compliance-checker'];
        const locations = ['US-East', 'US-West', 'EU-Central', 'Asia-Pacific'];
        
        return Array.from({ length: 25 }, (_, i) => ({
            id: `agent-${i + 1}`,
            name: `ACSO Agent ${i + 1}`,
            type: types[Math.floor(Math.random() * types.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            location: locations[Math.floor(Math.random() * locations.length)],
            cpu: Math.random() * 100,
            memory: Math.random() * 100,
            lastSeen: new Date(),
            threatsDetected: Math.floor(Math.random() * 50),
            incidentsHandled: Math.floor(Math.random() * 20),
            uptime: Math.random() * 100
        }));
    }

    generateIncidents() {
        const severities = ['critical', 'high', 'medium', 'low'];
        const statuses = ['open', 'investigating', 'resolved', 'closed'];
        const types = ['malware', 'phishing', 'data-breach', 'ddos', 'insider-threat'];
        
        return Array.from({ length: 15 }, (_, i) => ({
            id: `incident-${i + 1}`,
            title: `Security Incident ${i + 1}`,
            severity: severities[Math.floor(Math.random() * severities.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            type: types[Math.floor(Math.random() * types.length)],
            assignee: `Analyst ${Math.floor(Math.random() * 5) + 1}`,
            createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 60 * 60 * 1000),
            affectedSystems: Math.floor(Math.random() * 10) + 1,
            estimatedImpact: Math.random() * 100
        }));
    }

    generateFinancialData() {
        return {
            totalBudget: 2500000,
            spent: 1850000 + Math.random() * 100000,
            roi: 285 + Math.random() * 50,
            costPerIncident: 1200 + Math.random() * 300,
            savings: 450000 + Math.random() * 50000,
            monthlyTrend: Array.from({ length: 12 }, () => ({
                month: new Date(),
                revenue: 200000 + Math.random() * 50000,
                costs: 150000 + Math.random() * 30000
            }))
        };
    }

    generateWorkflows() {
        const statuses = ['running', 'completed', 'failed', 'pending'];
        const types = ['incident-response', 'threat-hunting', 'compliance-check', 'backup-verification'];
        
        return Array.from({ length: 10 }, (_, i) => ({
            id: `workflow-${i + 1}`,
            name: `Workflow ${i + 1}`,
            type: types[Math.floor(Math.random() * types.length)],
            status: statuses[Math.floor(Math.random() * statuses.length)],
            progress: Math.random() * 100,
            startedAt: new Date(Date.now() - Math.random() * 2 * 60 * 60 * 1000),
            estimatedCompletion: new Date(Date.now() + Math.random() * 60 * 60 * 1000)
        }));
    }

    startAgentSimulation() {
        setInterval(() => {
            // Update agent metrics
            this.agents.forEach(agent => {
                agent.cpu = Math.max(0, Math.min(100, agent.cpu + (Math.random() - 0.5) * 10));
                agent.memory = Math.max(0, Math.min(100, agent.memory + (Math.random() - 0.5) * 5));
                
                // Occasionally change status
                if (Math.random() < 0.05) {
                    const statuses = ['online', 'offline', 'warning', 'error'];
                    agent.status = statuses[Math.floor(Math.random() * statuses.length)];
                }
                
                // Update threat detection
                if (Math.random() < 0.1) {
                    agent.threatsDetected += Math.floor(Math.random() * 3);
                }
            });
            
            this.broadcast('agents', this.agents);
        }, 2000);
    }

    startIncidentSimulation() {
        setInterval(() => {
            // Update incident statuses
            this.incidents.forEach(incident => {
                if (Math.random() < 0.1) {
                    const statuses = ['open', 'investigating', 'resolved', 'closed'];
                    incident.status = statuses[Math.floor(Math.random() * statuses.length)];
                }
            });
            
            // Occasionally add new incident
            if (Math.random() < 0.05) {
                const newIncident = {
                    id: `incident-${Date.now()}`,
                    title: `New Security Alert`,
                    severity: ['critical', 'high', 'medium', 'low'][Math.floor(Math.random() * 4)],
                    status: 'open',
                    type: ['malware', 'phishing', 'data-breach'][Math.floor(Math.random() * 3)],
                    assignee: `Analyst ${Math.floor(Math.random() * 5) + 1}`,
                    createdAt: new Date(),
                    affectedSystems: Math.floor(Math.random() * 5) + 1,
                    estimatedImpact: Math.random() * 100
                };
                this.incidents.unshift(newIncident);
                if (this.incidents.length > 20) this.incidents.pop();
            }
            
            this.broadcast('incidents', this.incidents);
        }, 5000);
    }

    startFinancialSimulation() {
        setInterval(() => {
            // Update financial metrics
            this.financialData.spent += Math.random() * 1000;
            this.financialData.roi += (Math.random() - 0.5) * 2;
            this.financialData.costPerIncident += (Math.random() - 0.5) * 50;
            this.financialData.savings += Math.random() * 500;
            
            this.broadcast('financial', this.financialData);
        }, 10000);
    }

    startWorkflowSimulation() {
        setInterval(() => {
            // Update workflow progress
            this.workflows.forEach(workflow => {
                if (workflow.status === 'running') {
                    workflow.progress = Math.min(100, workflow.progress + Math.random() * 5);
                    if (workflow.progress >= 100) {
                        workflow.status = Math.random() < 0.9 ? 'completed' : 'failed';
                    }
                }
            });
            
            // Start new workflows occasionally
            if (Math.random() < 0.1) {
                const pendingWorkflows = this.workflows.filter(w => w.status === 'pending');
                if (pendingWorkflows.length > 0) {
                    pendingWorkflows[0].status = 'running';
                    pendingWorkflows[0].startedAt = new Date();
                }
            }
            
            this.broadcast('workflows', this.workflows);
        }, 3000);
    }

    broadcast(type, data) {
        const message = JSON.stringify({ type, data, timestamp: new Date() });
        this.clients.forEach(client => {
            if (client.readyState === WebSocket.OPEN) {
                client.send(message);
            }
        });
    }
}

const simulator = new LiveDataSimulator();

// WebSocket connection handling
wss.on('connection', (ws) => {
    console.log('Client connected to live data stream');
    simulator.clients.add(ws);
    
    // Send initial data
    ws.send(JSON.stringify({ type: 'agents', data: simulator.agents, timestamp: new Date() }));
    ws.send(JSON.stringify({ type: 'incidents', data: simulator.incidents, timestamp: new Date() }));
    ws.send(JSON.stringify({ type: 'financial', data: simulator.financialData, timestamp: new Date() }));
    ws.send(JSON.stringify({ type: 'workflows', data: simulator.workflows, timestamp: new Date() }));
    
    ws.on('close', () => {
        console.log('Client disconnected from live data stream');
        simulator.clients.delete(ws);
    });
});

// REST API endpoints
app.get('/api/agents', (req, res) => {
    res.json(simulator.agents);
});

app.get('/api/incidents', (req, res) => {
    res.json(simulator.incidents);
});

app.get('/api/financial', (req, res) => {
    res.json(simulator.financialData);
});

app.get('/api/workflows', (req, res) => {
    res.json(simulator.workflows);
});

app.get('/api/health', (req, res) => {
    res.json({ 
        status: 'healthy', 
        uptime: process.uptime(),
        connectedClients: simulator.clients.size,
        timestamp: new Date()
    });
});

const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
    console.log(`🎭 ACSO Live Data Simulation running on port ${PORT}`);
    console.log(`📊 WebSocket endpoint: ws://localhost:${PORT}`);
    console.log(`🔗 REST API: http://localhost:${PORT}/api`);
    console.log(`❤️ Health check: http://localhost:${PORT}/api/health`);
});
'@

# Create simulation directory and files
if (!(Test-Path "simulation")) {
    New-Item -ItemType Directory -Path "simulation"
}

$simulationServer | Out-File -FilePath "simulation/server.js" -Encoding UTF8

# Create package.json for simulation server
$packageJson = @'
{
  "name": "acso-live-data-simulation",
  "version": "1.0.0",
  "description": "Live data simulation service for ACSO Enterprise UI",
  "main": "server.js",
  "scripts": {
    "start": "node server.js",
    "dev": "nodemon server.js"
  },
  "dependencies": {
    "express": "^4.18.2",
    "cors": "^2.8.5",
    "ws": "^8.14.2"
  },
  "devDependencies": {
    "nodemon": "^3.0.1"
  }
}
'@

$packageJson | Out-File -FilePath "simulation/package.json" -Encoding UTF8

# Step 2: Install dependencies and start simulation
Write-Host "`n📦 Installing simulation dependencies..." -ForegroundColor Cyan
Set-Location simulation

# Check if Node.js is available
try {
    $nodeVersion = node --version
    Write-Host "✅ Node.js version: $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "❌ Node.js not found! Please install Node.js to run live data simulation." -ForegroundColor Red
    Write-Host "Download from: https://nodejs.org/" -ForegroundColor Yellow
    Set-Location ..
    exit 1
}

# Install dependencies
npm install

if ($LASTEXITCODE -ne 0) {
    Write-Host "❌ Failed to install simulation dependencies!" -ForegroundColor Red
    Set-Location ..
    exit 1
}

Set-Location ..

Write-Host "`n🎭 Live Data Simulation Setup Complete!" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host "To start the simulation server:" -ForegroundColor Cyan
Write-Host "  cd simulation" -ForegroundColor White
Write-Host "  npm start" -ForegroundColor White
Write-Host "" -ForegroundColor White
Write-Host "Simulation Features:" -ForegroundColor Cyan
Write-Host "  • Real-time agent metrics updates" -ForegroundColor White
Write-Host "  • Dynamic incident creation and status changes" -ForegroundColor White
Write-Host "  • Live financial data fluctuations" -ForegroundColor White
Write-Host "  • Workflow progress simulation" -ForegroundColor White
Write-Host "  • WebSocket streaming for real-time updates" -ForegroundColor White
Write-Host "  • REST API endpoints for data access" -ForegroundColor White

# Create startup script
$startupScript = @'
@echo off
echo Starting ACSO Live Data Simulation...
cd simulation
npm start
'@

$startupScript | Out-File -FilePath "start-simulation.bat" -Encoding ASCII

Write-Host "`n💡 Quick start: Run 'start-simulation.bat' to launch the simulation server" -ForegroundColor Yellow