import { Agent, AgentStatus } from '../types/api';

interface SimulationConfig {
  agentCount: number;
  incidentFrequency: number;
  dataUpdateInterval: number;
  networkComplexity: 'simple' | 'moderate' | 'complex';
  simulationDuration: number;
  realisticVariation: boolean;
}

interface SimulatedMetric {
  timestamp: Date;
  value: number;
  trend: 'up' | 'down' | 'stable';
}

interface ThreatScenario {
  id: string;
  type: 'apt' | 'malware' | 'phishing' | 'ddos' | 'insider' | 'ransomware';
  severity: 'low' | 'medium' | 'high' | 'critical';
  description: string;
  indicators: string[];
  affectedAssets: string[];
  timeline: Array<{
    timestamp: Date;
    event: string;
    details: string;
  }>;
}

interface MarketTrend {
  sector: string;
  trend: 'bullish' | 'bearish' | 'neutral';
  volatility: number;
  confidence: number;
}

class DataSimulationService {
  private config: SimulationConfig = {
    agentCount: 8,
    incidentFrequency: 0.1,
    dataUpdateInterval: 5000,
    networkComplexity: 'moderate',
    simulationDuration: 0, // 0 = infinite
    realisticVariation: true,
  };

  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private simulatedData: Map<string, any> = new Map();
  private isRunning = false;

  constructor(config?: Partial<SimulationConfig>) {
    if (config) {
      this.config = { ...this.config, ...config };
    }
  }

  // Start all simulations
  startAllSimulations(): void {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.startAgentMetricsSimulation();
    this.startIncidentSimulation();
    this.startFinancialDataSimulation();
    this.startNetworkTopologySimulation();
    this.startThreatScenarioSimulation();
    this.startWorkflowSimulation();
    this.startSystemMetricsSimulation();
  }

  // Stop all simulations
  stopAllSimulations(): void {
    this.intervals.forEach((interval) => {
      clearInterval(interval);
    });
    this.intervals.clear();
    this.isRunning = false;
  }

  // Configure simulation parameters
  configureSimulationParameters(params: Partial<SimulationConfig>): void {
    this.config = { ...this.config, ...params };
    
    // Restart simulations with new config if running
    if (this.isRunning) {
      this.stopAllSimulations();
      this.startAllSimulations();
    }
  }

  // Generate realistic agent metrics
  startAgentMetricsSimulation(): void {
    const intervalId = setInterval(() => {
      const agents = this.generateAgentMetrics();
      this.simulatedData.set('agents', agents);
      
      // Emit update event
      this.emitDataUpdate('agents', agents);
    }, this.config.dataUpdateInterval);

    this.intervals.set('agentMetrics', intervalId);
  }

  // Generate incident data
  startIncidentSimulation(): void {
    const intervalId = setInterval(() => {
      const shouldGenerateIncident = Math.random() < this.config.incidentFrequency;
      
      if (shouldGenerateIncident) {
        const incident = this.generateIncident();
        const existingIncidents = this.simulatedData.get('incidents') || [];
        const updatedIncidents = [incident, ...existingIncidents].slice(0, 50); // Keep last 50
        
        this.simulatedData.set('incidents', updatedIncidents);
        this.emitDataUpdate('incidents', updatedIncidents);
      }
    }, this.config.dataUpdateInterval * 2); // Less frequent than metrics

    this.intervals.set('incidents', intervalId);
  }

  // Generate financial data
  startFinancialDataSimulation(): void {
    const intervalId = setInterval(() => {
      const financialData = this.generateFinancialData();
      this.simulatedData.set('financial', financialData);
      this.emitDataUpdate('financial', financialData);
    }, this.config.dataUpdateInterval * 6); // Even less frequent

    this.intervals.set('financial', intervalId);
  }

  // Generate network topology changes
  startNetworkTopologySimulation(): void {
    const intervalId = setInterval(() => {
      const topology = this.generateNetworkTopology();
      this.simulatedData.set('topology', topology);
      this.emitDataUpdate('topology', topology);
    }, this.config.dataUpdateInterval * 4);

    this.intervals.set('topology', intervalId);
  }

  // Generate realistic agent metrics
  private generateAgentMetrics(): Agent[] {
    const agents: Agent[] = [];
    const baseTime = Date.now();

    for (let i = 0; i < this.config.agentCount; i++) {
      const agentId = `agent-${i + 1}`;
      const agentTypes = ['threat_hunter', 'incident_response', 'financial_intelligence', 'service_orchestration'];
      const agentType = agentTypes[i % agentTypes.length];
      
      // Generate realistic metrics with trends
      const cpuBase = 30 + Math.random() * 40;
      const memoryBase = 40 + Math.random() * 35;
      const networkBase = 10 + Math.random() * 20;
      
      // Add realistic variation
      const cpuVariation = this.config.realisticVariation ? (Math.sin(baseTime / 60000) * 10) : 0;
      const memoryVariation = this.config.realisticVariation ? (Math.cos(baseTime / 45000) * 8) : 0;
      
      const agent: Agent = {
        id: agentId,
        name: `${agentType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ${i + 1}`,
        type: agentType as any,
        status: this.getRandomStatus(),
        health: {
          score: Math.max(60, Math.min(100, 85 + (Math.random() - 0.5) * 20)),
          cpu: Math.max(0, Math.min(100, cpuBase + cpuVariation + (Math.random() - 0.5) * 10)),
          memory: Math.max(0, Math.min(100, memoryBase + memoryVariation + (Math.random() - 0.5) * 8)),
          disk: Math.max(0, Math.min(100, 45 + (Math.random() - 0.5) * 15)),
          network: Math.max(0, Math.min(100, networkBase + (Math.random() - 0.5) * 5)),
        },
        performance: {
          tasksCompleted: Math.floor(500 + Math.random() * 1000),
          averageResponseTime: Math.floor(100 + Math.random() * 300),
          successRate: Math.max(85, Math.min(100, 95 + (Math.random() - 0.5) * 10)),
          uptime: Math.floor(86400 * (1 + Math.random() * 30)), // 1-30 days
        },
        lastHeartbeat: new Date(baseTime - Math.random() * 60000), // Within last minute
        version: `2.${Math.floor(Math.random() * 3)}.${Math.floor(Math.random() * 10)}`,
        location: this.getRandomLocation(),
        tags: this.getRandomTags(agentType),
        metadata: {
          instanceType: this.getRandomInstanceType(),
          region: this.getRandomRegion(),
          availabilityZone: this.getRandomAZ(),
        },
      };

      agents.push(agent);
    }

    return agents;
  }

  // Generate incident data
  private generateIncident() {
    const incidentTypes = [
      'Suspicious Network Activity',
      'Malware Detection',
      'Unauthorized Access Attempt',
      'Data Exfiltration Alert',
      'System Anomaly',
      'Security Policy Violation',
    ];

    const severities = ['low', 'medium', 'high', 'critical'];
    const sources = ['Threat Hunter', 'Network Monitor', 'File Scanner', 'Access Control'];

    return {
      id: `incident-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type: incidentTypes[Math.floor(Math.random() * incidentTypes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      source: sources[Math.floor(Math.random() * sources.length)],
      timestamp: new Date(),
      status: 'open',
      description: 'Automated incident generated for demonstration purposes',
      affectedSystems: Math.floor(1 + Math.random() * 5),
    };
  }

  // Generate financial data
  private generateFinancialData() {
    const baseTime = Date.now();
    const monthlyTrend = Math.sin(baseTime / (30 * 24 * 60 * 60 * 1000)) * 0.1;
    
    return {
      totalCosts: {
        current: Math.floor(50000 + monthlyTrend * 10000 + (Math.random() - 0.5) * 5000),
        previous: Math.floor(48000 + (Math.random() - 0.5) * 3000),
        trend: monthlyTrend > 0 ? 'up' : 'down',
      },
      roi: {
        current: Math.max(15, Math.min(35, 25 + monthlyTrend * 5 + (Math.random() - 0.5) * 3)),
        target: 30,
        trend: monthlyTrend > 0 ? 'up' : 'down',
      },
      savings: {
        automated: Math.floor(15000 + (Math.random() - 0.5) * 3000),
        efficiency: Math.floor(8000 + (Math.random() - 0.5) * 2000),
        prevention: Math.floor(25000 + (Math.random() - 0.5) * 5000),
      },
      timestamp: new Date(),
    };
  }

  // Generate network topology
  private generateNetworkTopology() {
    const nodeCount = this.config.networkComplexity === 'simple' ? 5 : 
                     this.config.networkComplexity === 'moderate' ? 8 : 12;
    
    const nodes = [];
    const connections = [];

    // Generate nodes
    for (let i = 0; i < nodeCount; i++) {
      nodes.push({
        id: `node-${i}`,
        type: i === 0 ? 'supervisor' : ['agent', 'service', 'database'][Math.floor(Math.random() * 3)],
        status: Math.random() > 0.1 ? 'active' : 'inactive',
        load: Math.random() * 100,
        connections: Math.floor(Math.random() * 5) + 1,
      });
    }

    // Generate connections
    for (let i = 1; i < nodeCount; i++) {
      connections.push({
        source: 'node-0', // Supervisor connects to all
        target: `node-${i}`,
        strength: Math.random() * 100,
        latency: Math.floor(Math.random() * 50) + 10,
      });
    }

    // Add some inter-node connections
    for (let i = 0; i < Math.floor(nodeCount / 2); i++) {
      const source = Math.floor(Math.random() * nodeCount);
      const target = Math.floor(Math.random() * nodeCount);
      if (source !== target) {
        connections.push({
          source: `node-${source}`,
          target: `node-${target}`,
          strength: Math.random() * 80,
          latency: Math.floor(Math.random() * 30) + 5,
        });
      }
    }

    return { nodes, connections, timestamp: new Date() };
  }

  // Generate threat scenarios
  startThreatScenarioSimulation(): void {
    const intervalId = setInterval(() => {
      const shouldGenerateScenario = Math.random() < 0.05; // 5% chance every interval
      
      if (shouldGenerateScenario) {
        const scenario = this.generateThreatScenario();
        const existingScenarios = this.simulatedData.get('threatScenarios') || [];
        const updatedScenarios = [scenario, ...existingScenarios].slice(0, 20);
        
        this.simulatedData.set('threatScenarios', updatedScenarios);
        this.emitDataUpdate('threatScenarios', updatedScenarios);
      }
    }, this.config.dataUpdateInterval * 3);

    this.intervals.set('threatScenarios', intervalId);
  }

  // Generate workflow data
  startWorkflowSimulation(): void {
    const intervalId = setInterval(() => {
      const workflows = this.generateWorkflowData();
      this.simulatedData.set('workflows', workflows);
      this.emitDataUpdate('workflows', workflows);
    }, this.config.dataUpdateInterval * 2);

    this.intervals.set('workflows', intervalId);
  }

  // Generate system metrics
  startSystemMetricsSimulation(): void {
    const intervalId = setInterval(() => {
      const metrics = this.generateSystemMetrics();
      this.simulatedData.set('systemMetrics', metrics);
      this.emitDataUpdate('systemMetrics', metrics);
    }, this.config.dataUpdateInterval);

    this.intervals.set('systemMetrics', intervalId);
  }

  // Generate threat scenario
  private generateThreatScenario(): ThreatScenario {
    const threatTypes: ThreatScenario['type'][] = ['apt', 'malware', 'phishing', 'ddos', 'insider', 'ransomware'];
    const severities: ThreatScenario['severity'][] = ['low', 'medium', 'high', 'critical'];
    
    const type = threatTypes[Math.floor(Math.random() * threatTypes.length)];
    const severity = severities[Math.floor(Math.random() * severities.length)];
    
    const scenarios = {
      apt: {
        description: 'Advanced Persistent Threat detected with lateral movement patterns',
        indicators: ['Unusual network traffic', 'Privilege escalation attempts', 'Data staging activities'],
      },
      malware: {
        description: 'Malicious software detected on endpoint systems',
        indicators: ['Suspicious file execution', 'Registry modifications', 'Network callbacks'],
      },
      phishing: {
        description: 'Phishing campaign targeting user credentials',
        indicators: ['Suspicious email attachments', 'Credential harvesting attempts', 'Domain spoofing'],
      },
      ddos: {
        description: 'Distributed Denial of Service attack in progress',
        indicators: ['Traffic volume spike', 'Connection exhaustion', 'Service degradation'],
      },
      insider: {
        description: 'Insider threat activity detected',
        indicators: ['Unusual access patterns', 'Data exfiltration attempts', 'Policy violations'],
      },
      ransomware: {
        description: 'Ransomware encryption activity detected',
        indicators: ['File encryption patterns', 'Ransom note deployment', 'System lockdown'],
      },
    };

    const scenario = scenarios[type];
    const affectedAssets = this.generateAffectedAssets();
    const timeline = this.generateThreatTimeline();

    return {
      id: `threat-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      type,
      severity,
      description: scenario.description,
      indicators: scenario.indicators,
      affectedAssets,
      timeline,
    };
  }

  // Generate workflow data
  private generateWorkflowData() {
    const workflows = [];
    const workflowTypes = [
      'Incident Response',
      'Patch Deployment',
      'Security Scan',
      'Backup Verification',
      'Compliance Check',
      'Performance Optimization',
    ];

    for (let i = 0; i < 5; i++) {
      const type = workflowTypes[Math.floor(Math.random() * workflowTypes.length)];
      const status = this.getRandomWorkflowStatus();
      const progress = status === 'completed' ? 100 : 
                     status === 'failed' ? Math.floor(Math.random() * 80) :
                     Math.floor(Math.random() * 90) + 10;

      workflows.push({
        id: `workflow-${i + 1}`,
        name: `${type} - ${new Date().toLocaleDateString()}`,
        type,
        status,
        progress,
        startTime: new Date(Date.now() - Math.random() * 3600000), // Within last hour
        estimatedCompletion: new Date(Date.now() + Math.random() * 1800000), // Next 30 min
        steps: this.generateWorkflowSteps(type),
        assignedAgent: `agent-${Math.floor(Math.random() * this.config.agentCount) + 1}`,
      });
    }

    return workflows;
  }

  // Generate system metrics
  private generateSystemMetrics() {
    const baseTime = Date.now();
    const hourlyPattern = Math.sin((baseTime % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000) * 2 * Math.PI);
    
    return {
      cpu: {
        current: Math.max(10, Math.min(90, 45 + hourlyPattern * 15 + (Math.random() - 0.5) * 10)),
        average: 42,
        peak: 78,
        trend: hourlyPattern > 0 ? 'up' : 'down',
      },
      memory: {
        current: Math.max(20, Math.min(85, 55 + hourlyPattern * 10 + (Math.random() - 0.5) * 8)),
        average: 52,
        peak: 71,
        trend: hourlyPattern > 0.2 ? 'up' : hourlyPattern < -0.2 ? 'down' : 'stable',
      },
      network: {
        inbound: Math.max(0, 100 + hourlyPattern * 50 + (Math.random() - 0.5) * 30), // Mbps
        outbound: Math.max(0, 80 + hourlyPattern * 40 + (Math.random() - 0.5) * 25),
        latency: Math.max(1, 15 + (Math.random() - 0.5) * 10), // ms
        packetLoss: Math.max(0, Math.min(5, 0.1 + Math.random() * 0.5)), // %
      },
      storage: {
        used: Math.max(30, Math.min(90, 65 + (Math.random() - 0.5) * 5)),
        available: 2048, // GB
        iops: Math.floor(1000 + Math.random() * 500),
        throughput: Math.floor(100 + Math.random() * 200), // MB/s
      },
      agents: {
        total: this.config.agentCount,
        online: Math.floor(this.config.agentCount * (0.85 + Math.random() * 0.1)),
        busy: Math.floor(this.config.agentCount * (0.3 + Math.random() * 0.2)),
        errors: Math.floor(Math.random() * 2),
      },
      incidents: {
        open: Math.floor(Math.random() * 8) + 2,
        resolved: Math.floor(Math.random() * 15) + 5,
        critical: Math.floor(Math.random() * 3),
      },
      timestamp: new Date(),
    };
  }

  private generateAffectedAssets(): string[] {
    const assets = [
      'web-server-01', 'db-server-02', 'file-server-03', 'mail-server-01',
      'workstation-101', 'workstation-102', 'firewall-01', 'router-01',
      'switch-01', 'backup-server-01', 'monitoring-server-01', 'dns-server-01'
    ];
    
    const count = Math.floor(Math.random() * 4) + 1;
    const selected = [];
    
    for (let i = 0; i < count; i++) {
      const asset = assets[Math.floor(Math.random() * assets.length)];
      if (!selected.includes(asset)) {
        selected.push(asset);
      }
    }
    
    return selected;
  }

  private generateThreatTimeline() {
    const events = [
      'Initial detection',
      'Alert triggered',
      'Investigation started',
      'Containment initiated',
      'Evidence collected',
      'Threat neutralized',
    ];
    
    const timeline = [];
    const baseTime = Date.now() - (Math.random() * 3600000); // Within last hour
    
    for (let i = 0; i < Math.min(events.length, Math.floor(Math.random() * 4) + 2); i++) {
      timeline.push({
        timestamp: new Date(baseTime + i * (Math.random() * 600000)), // 10 min intervals
        event: events[i],
        details: `Automated ${events[i].toLowerCase()} process executed`,
      });
    }
    
    return timeline;
  }

  private getRandomWorkflowStatus() {
    const statuses = ['running', 'completed', 'failed', 'paused', 'pending'];
    const weights = [0.3, 0.4, 0.1, 0.1, 0.1];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return statuses[i];
      }
    }
    
    return 'running';
  }

  private generateWorkflowSteps(workflowType: string) {
    const stepTemplates = {
      'Incident Response': [
        'Detect and analyze threat',
        'Contain affected systems',
        'Eradicate threat',
        'Recover systems',
        'Document lessons learned',
      ],
      'Patch Deployment': [
        'Download patches',
        'Test in staging',
        'Schedule deployment',
        'Deploy to production',
        'Verify installation',
      ],
      'Security Scan': [
        'Initialize scan',
        'Vulnerability assessment',
        'Generate report',
        'Prioritize findings',
        'Create remediation plan',
      ],
      'Backup Verification': [
        'Check backup integrity',
        'Verify data consistency',
        'Test restore process',
        'Update backup logs',
        'Generate status report',
      ],
      'Compliance Check': [
        'Gather compliance data',
        'Run compliance tests',
        'Generate compliance report',
        'Identify gaps',
        'Create remediation plan',
      ],
      'Performance Optimization': [
        'Analyze performance metrics',
        'Identify bottlenecks',
        'Implement optimizations',
        'Test improvements',
        'Monitor results',
      ],
    };

    const steps = stepTemplates[workflowType as keyof typeof stepTemplates] || stepTemplates['Incident Response'];
    
    return steps.map((step, index) => ({
      id: index + 1,
      name: step,
      status: index < Math.floor(Math.random() * steps.length) ? 'completed' : 'pending',
      duration: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
    }));
  }

  // Helper methods
  private getRandomStatus(): AgentStatus {
    const statuses: AgentStatus[] = ['online', 'offline', 'warning', 'error', 'maintenance'];
    const weights = [0.7, 0.05, 0.15, 0.05, 0.05]; // Mostly online
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return statuses[i];
      }
    }
    
    return 'online';
  }

  private getRandomLocation() {
    const locations = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1', 'us-central-1'];
    return locations[Math.floor(Math.random() * locations.length)];
  }

  private getRandomTags(agentType: string) {
    const baseTags = [agentType.replace('_', '-')];
    const additionalTags = ['production', 'monitoring', 'security', 'automated', 'ml-enabled'];
    
    const numAdditional = Math.floor(Math.random() * 3) + 1;
    const selectedTags = [...baseTags];
    
    for (let i = 0; i < numAdditional; i++) {
      const tag = additionalTags[Math.floor(Math.random() * additionalTags.length)];
      if (!selectedTags.includes(tag)) {
        selectedTags.push(tag);
      }
    }
    
    return selectedTags;
  }

  private getRandomInstanceType() {
    const types = ['t3.micro', 't3.small', 't3.medium', 'm5.large', 'c5.large', 'c5.xlarge'];
    return types[Math.floor(Math.random() * types.length)];
  }

  private getRandomRegion() {
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'];
    return regions[Math.floor(Math.random() * regions.length)];
  }

  private getRandomAZ() {
    const azs = ['a', 'b', 'c'];
    return azs[Math.floor(Math.random() * azs.length)];
  }

  // Event emission for real-time updates
  private emitDataUpdate(type: string, data: any) {
    // In a real implementation, this would emit WebSocket events
    // For now, we'll use custom events
    const event = new CustomEvent('dataSimulationUpdate', {
      detail: { type, data, timestamp: new Date() }
    });
    window.dispatchEvent(event);
  }

  // Public methods to get current data
  getSimulatedData(type: string) {
    return this.simulatedData.get(type);
  }

  getAllSimulatedData() {
    const result: Record<string, any> = {};
    this.simulatedData.forEach((value, key) => {
      result[key] = value;
    });
    return result;
  }

  isSimulationRunning() {
    return this.isRunning;
  }

  getConfig() {
    return { ...this.config };
  }
}

// Export singleton instance
export const dataSimulationService = new DataSimulationService();
export default dataSimulationService;