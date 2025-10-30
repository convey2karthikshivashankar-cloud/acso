import { Agent, AgentConnection, AgentMetric } from '../components/agents';
import { Incident } from '../components/incidents';

export interface SimulationConfig {
  agentCount: number;
  incidentFrequency: number; // incidents per hour
  dataUpdateInterval: number; // milliseconds
  networkComplexity: 'simple' | 'moderate' | 'complex';
  simulationDuration: number; // minutes, 0 for infinite
  realisticVariation: boolean;
  enableAnomalies: boolean;
  anomalyFrequency: number; // anomalies per hour
}

export interface FinancialData {
  timestamp: Date;
  totalCosts: number;
  savings: number;
  roi: number;
  costBreakdown: {
    infrastructure: number;
    personnel: number;
    licensing: number;
    maintenance: number;
  };
  benefits: {
    timesSaved: number;
    incidentsAvoided: number;
    efficiencyGains: number;
  };
}

export interface NetworkTopologyData {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  metrics: {
    totalNodes: number;
    activeConnections: number;
    averageLatency: number;
    throughput: number;
  };
}

export interface NetworkNode {
  id: string;
  type: 'agent' | 'service' | 'database' | 'external';
  name: string;
  status: 'active' | 'inactive' | 'warning' | 'error';
  position: { x: number; y: number };
  metrics: {
    cpu: number;
    memory: number;
    network: number;
  };
}

export interface NetworkConnection {
  id: string;
  source: string;
  target: string;
  type: 'data' | 'control' | 'monitoring';
  status: 'active' | 'inactive' | 'congested';
  metrics: {
    bandwidth: number;
    latency: number;
    packetLoss: number;
  };
}

class DataSimulationService {
  private config: SimulationConfig;
  private isRunning: boolean = false;
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private agents: Agent[] = [];
  private incidents: Incident[] = [];
  private financialHistory: FinancialData[] = [];
  private networkTopology: NetworkTopologyData | null = null;
  
  // Event callbacks
  private onAgentUpdate?: (agents: Agent[]) => void;
  private onIncidentUpdate?: (incidents: Incident[]) => void;
  private onFinancialUpdate?: (data: FinancialData) => void;
  private onNetworkUpdate?: (topology: NetworkTopologyData) => void;
  private onMetricsUpdate?: (metrics: AgentMetric[]) => void;

  constructor(config: Partial<SimulationConfig> = {}) {
    this.config = {
      agentCount: 6,
      incidentFrequency: 2,
      dataUpdateInterval: 5000,
      networkComplexity: 'moderate',
      simulationDuration: 0,
      realisticVariation: true,
      enableAnomalies: true,
      anomalyFrequency: 0.5,
      ...config,
    };
  }

  // Configuration methods
  updateConfig(newConfig: Partial<SimulationConfig>) {
    this.config = { ...this.config, ...newConfig };
    if (this.isRunning) {
      this.restart();
    }
  }

  getConfig(): SimulationConfig {
    return { ...this.config };
  }

  // Event subscription methods
  onAgentsUpdated(callback: (agents: Agent[]) => void) {
    this.onAgentUpdate = callback;
  }

  onIncidentsUpdated(callback: (incidents: Incident[]) => void) {
    this.onIncidentUpdate = callback;
  }

  onFinancialDataUpdated(callback: (data: FinancialData) => void) {
    this.onFinancialUpdate = callback;
  }

  onNetworkTopologyUpdated(callback: (topology: NetworkTopologyData) => void) {
    this.onNetworkUpdate = callback;
  }

  onMetricsUpdated(callback: (metrics: AgentMetric[]) => void) {
    this.onMetricsUpdate = callback;
  }

  // Simulation control methods
  start() {
    if (this.isRunning) return;
    
    this.isRunning = true;
    this.initializeData();
    this.startSimulationLoops();
    
    console.log('Data simulation started with config:', this.config);
  }

  stop() {
    if (!this.isRunning) return;
    
    this.isRunning = false;
    this.intervals.forEach(interval => clearInterval(interval));
    this.intervals.clear();
    
    console.log('Data simulation stopped');
  }

  restart() {
    this.stop();
    setTimeout(() => this.start(), 100);
  }

  // Data initialization
  private initializeData() {
    this.agents = this.generateInitialAgents();
    this.incidents = this.generateInitialIncidents();
    this.networkTopology = this.generateNetworkTopology();
    this.financialHistory = this.generateFinancialHistory();
    
    // Trigger initial callbacks
    this.onAgentUpdate?.(this.agents);
    this.onIncidentUpdate?.(this.incidents);
    this.onNetworkUpdate?.(this.networkTopology);
    if (this.financialHistory.length > 0) {
      this.onFinancialUpdate?.(this.financialHistory[this.financialHistory.length - 1]);
    }
  }

  // Simulation loops
  private startSimulationLoops() {
    // Agent metrics update
    const agentInterval = setInterval(() => {
      this.updateAgentMetrics();
      this.onAgentUpdate?.(this.agents);
      
      const metrics = this.generateAgentMetrics();
      this.onMetricsUpdate?.(metrics);
    }, this.config.dataUpdateInterval);
    this.intervals.set('agents', agentInterval);

    // Incident simulation
    const incidentInterval = setInterval(() => {
      this.simulateIncidents();
      this.onIncidentUpdate?.(this.incidents);
    }, 60000 / this.config.incidentFrequency); // Convert frequency to interval
    this.intervals.set('incidents', incidentInterval);

    // Financial data update
    const financialInterval = setInterval(() => {
      const newData = this.generateFinancialData();
      this.financialHistory.push(newData);
      
      // Keep only last 100 entries
      if (this.financialHistory.length > 100) {
        this.financialHistory = this.financialHistory.slice(-100);
      }
      
      this.onFinancialUpdate?.(newData);
    }, this.config.dataUpdateInterval * 2);
    this.intervals.set('financial', financialInterval);

    // Network topology update
    const networkInterval = setInterval(() => {
      this.updateNetworkTopology();
      this.onNetworkUpdate?.(this.networkTopology!);
    }, this.config.dataUpdateInterval * 3);
    this.intervals.set('network', networkInterval);

    // Auto-stop if duration is set
    if (this.config.simulationDuration > 0) {
      setTimeout(() => {
        this.stop();
      }, this.config.simulationDuration * 60 * 1000);
    }
  }

  // Agent generation and updates
  private generateInitialAgents(): Agent[] {
    const agentTypes: Agent['type'][] = [
      'supervisor',
      'threat_hunter',
      'incident_response',
      'service_orchestration',
      'financial_intelligence',
    ];

    const agents: Agent[] = [];
    
    for (let i = 0; i < this.config.agentCount; i++) {
      const type = agentTypes[i % agentTypes.length];
      const agent: Agent = {
        id: `agent-${i + 1}`,
        name: `${type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())} ${Math.floor(i / agentTypes.length) + 1}`,
        type,
        status: this.randomChoice(['online', 'online', 'online', 'warning', 'offline']),
        health: {
          score: this.randomBetween(70, 100),
          cpu: this.randomBetween(10, 80),
          memory: this.randomBetween(20, 90),
          disk: this.randomBetween(30, 70),
          network: this.randomBetween(5, 60),
        },
        performance: {
          tasksCompleted: this.randomBetween(100, 2000),
          averageResponseTime: this.randomBetween(50, 500),
          successRate: this.randomBetween(85, 99.5),
          uptime: this.randomBetween(86400, 86400 * 30), // 1-30 days
        },
        lastHeartbeat: new Date(Date.now() - this.randomBetween(1000, 60000)),
        version: `2.${this.randomBetween(0, 2)}.${this.randomBetween(0, 10)}`,
        location: this.randomChoice(['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1']),
        tags: this.generateAgentTags(type),
        metadata: {
          instanceType: this.randomChoice(['t3.medium', 'm5.large', 'c5.xlarge']),
          region: this.randomChoice(['us-east-1', 'us-west-2', 'eu-west-1']),
          availabilityZone: 'a',
        },
      };
      agents.push(agent);
    }

    return agents;
  }

  private updateAgentMetrics() {
    this.agents.forEach(agent => {
      if (agent.status === 'maintenance') return;

      // Simulate realistic metric changes
      const variation = this.config.realisticVariation ? this.randomBetween(-5, 5) : 0;
      
      agent.health.cpu = Math.max(0, Math.min(100, agent.health.cpu + variation));
      agent.health.memory = Math.max(0, Math.min(100, agent.health.memory + variation));
      agent.health.network = Math.max(0, Math.min(100, agent.health.network + variation));
      
      // Update health score based on metrics
      agent.health.score = Math.round(
        (100 - agent.health.cpu * 0.3 - agent.health.memory * 0.4 - agent.health.network * 0.3)
      );

      // Update performance metrics
      agent.performance.tasksCompleted += this.randomBetween(0, 5);
      agent.performance.averageResponseTime += this.randomBetween(-10, 10);
      agent.performance.averageResponseTime = Math.max(50, agent.performance.averageResponseTime);

      // Update status based on health
      if (agent.health.score < 60) {
        agent.status = 'error';
      } else if (agent.health.score < 80) {
        agent.status = 'warning';
      } else {
        agent.status = 'online';
      }

      agent.lastHeartbeat = new Date();
    });
  }

  private generateAgentMetrics(): AgentMetric[] {
    const metrics: AgentMetric[] = [];
    const now = new Date();

    this.agents.forEach(agent => {
      if (agent.status === 'maintenance') return;

      metrics.push({
        timestamp: now,
        agentId: agent.id,
        agentName: agent.name,
        cpu: agent.health.cpu,
        memory: agent.health.memory,
        disk: agent.health.disk,
        network: agent.health.network,
        tasksCompleted: this.randomBetween(0, 10),
        tasksActive: this.randomBetween(0, 5),
        responseTime: agent.performance.averageResponseTime,
        errorRate: 100 - agent.performance.successRate,
        uptime: agent.performance.uptime,
      });
    });

    return metrics;
  }

  // Incident simulation
  private generateInitialIncidents(): Incident[] {
    const incidents: Incident[] = [];
    const incidentTypes = [
      'Malware Detection',
      'Unauthorized Access Attempt',
      'Network Anomaly',
      'Data Exfiltration Alert',
      'System Performance Degradation',
    ];

    for (let i = 0; i < 3; i++) {
      const incident: Incident = {
        id: `incident-${Date.now()}-${i}`,
        title: incidentTypes[i % incidentTypes.length],
        severity: this.randomChoice(['low', 'medium', 'high', 'critical']),
        status: this.randomChoice(['open', 'investigating', 'resolved']),
        assignee: {
          id: `user-${i + 1}`,
          name: `Analyst ${i + 1}`,
          email: `analyst${i + 1}@acso.com`,
          role: 'security_analyst',
        },
        timeline: [],
        evidence: [],
        collaborators: [],
        tags: ['automated', 'ai-detected'],
        createdAt: new Date(Date.now() - this.randomBetween(3600000, 86400000)),
        updatedAt: new Date(),
      };
      incidents.push(incident);
    }

    return incidents;
  }

  private simulateIncidents() {
    // Randomly create new incidents
    if (Math.random() < 0.3) {
      const newIncident = this.generateRandomIncident();
      this.incidents.unshift(newIncident);
      
      // Keep only last 20 incidents
      if (this.incidents.length > 20) {
        this.incidents = this.incidents.slice(0, 20);
      }
    }

    // Update existing incidents
    this.incidents.forEach(incident => {
      if (incident.status === 'open' && Math.random() < 0.2) {
        incident.status = 'investigating';
        incident.updatedAt = new Date();
      } else if (incident.status === 'investigating' && Math.random() < 0.1) {
        incident.status = 'resolved';
        incident.updatedAt = new Date();
      }
    });
  }

  private generateRandomIncident(): Incident {
    const types = [
      'Suspicious Network Activity',
      'Failed Login Attempts',
      'Malware Signature Match',
      'Unusual Data Access Pattern',
      'System Resource Exhaustion',
      'Certificate Expiration Warning',
      'Unauthorized API Access',
    ];

    return {
      id: `incident-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      title: this.randomChoice(types),
      severity: this.randomChoice(['low', 'medium', 'high', 'critical']),
      status: 'open',
      assignee: {
        id: `user-${this.randomBetween(1, 5)}`,
        name: `Analyst ${this.randomBetween(1, 5)}`,
        email: `analyst@acso.com`,
        role: 'security_analyst',
      },
      timeline: [],
      evidence: [],
      collaborators: [],
      tags: ['automated', 'real-time'],
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  }

  // Financial data simulation
  private generateFinancialHistory(): FinancialData[] {
    const history: FinancialData[] = [];
    const now = Date.now();
    
    for (let i = 30; i >= 0; i--) {
      const timestamp = new Date(now - i * 24 * 60 * 60 * 1000);
      history.push(this.generateFinancialDataForDate(timestamp));
    }
    
    return history;
  }

  private generateFinancialData(): FinancialData {
    return this.generateFinancialDataForDate(new Date());
  }

  private generateFinancialDataForDate(timestamp: Date): FinancialData {
    const baseCosts = 50000;
    const variation = this.config.realisticVariation ? this.randomBetween(-5000, 5000) : 0;
    
    const infrastructure = baseCosts * 0.4 + variation;
    const personnel = baseCosts * 0.35;
    const licensing = baseCosts * 0.15;
    const maintenance = baseCosts * 0.1;
    
    const totalCosts = infrastructure + personnel + licensing + maintenance;
    const savings = this.randomBetween(15000, 25000);
    const roi = ((savings - totalCosts) / totalCosts) * 100;

    return {
      timestamp,
      totalCosts,
      savings,
      roi,
      costBreakdown: {
        infrastructure,
        personnel,
        licensing,
        maintenance,
      },
      benefits: {
        timesSaved: this.randomBetween(100, 200),
        incidentsAvoided: this.randomBetween(5, 15),
        efficiencyGains: this.randomBetween(20, 40),
      },
    };
  }

  // Network topology simulation
  private generateNetworkTopology(): NetworkTopologyData {
    const nodes: NetworkNode[] = [];
    const connections: NetworkConnection[] = [];

    // Add agent nodes
    this.agents.forEach((agent, index) => {
      nodes.push({
        id: agent.id,
        type: 'agent',
        name: agent.name,
        status: agent.status,
        position: {
          x: 100 + (index % 3) * 200,
          y: 100 + Math.floor(index / 3) * 150,
        },
        metrics: {
          cpu: agent.health.cpu,
          memory: agent.health.memory,
          network: agent.health.network,
        },
      });
    });

    // Add service nodes
    const services = ['Database', 'API Gateway', 'Message Queue', 'Log Aggregator'];
    services.forEach((service, index) => {
      nodes.push({
        id: `service-${index}`,
        type: 'service',
        name: service,
        status: this.randomChoice(['active', 'active', 'warning']),
        position: {
          x: 400 + index * 150,
          y: 300,
        },
        metrics: {
          cpu: this.randomBetween(20, 80),
          memory: this.randomBetween(30, 90),
          network: this.randomBetween(10, 70),
        },
      });
    });

    // Generate connections
    nodes.forEach(node => {
      if (node.type === 'agent') {
        // Connect agents to services
        const serviceConnections = this.randomBetween(1, 3);
        for (let i = 0; i < serviceConnections; i++) {
          const targetService = nodes.find(n => n.type === 'service' && Math.random() < 0.5);
          if (targetService) {
            connections.push({
              id: `conn-${node.id}-${targetService.id}`,
              source: node.id,
              target: targetService.id,
              type: 'data',
              status: this.randomChoice(['active', 'active', 'congested']),
              metrics: {
                bandwidth: this.randomBetween(10, 100),
                latency: this.randomBetween(5, 50),
                packetLoss: this.randomBetween(0, 2),
              },
            });
          }
        }
      }
    });

    return {
      nodes,
      connections,
      metrics: {
        totalNodes: nodes.length,
        activeConnections: connections.filter(c => c.status === 'active').length,
        averageLatency: connections.reduce((sum, c) => sum + c.metrics.latency, 0) / connections.length,
        throughput: connections.reduce((sum, c) => sum + c.metrics.bandwidth, 0),
      },
    };
  }

  private updateNetworkTopology() {
    if (!this.networkTopology) return;

    // Update node metrics
    this.networkTopology.nodes.forEach(node => {
      if (node.type === 'agent') {
        const agent = this.agents.find(a => a.id === node.id);
        if (agent) {
          node.status = agent.status;
          node.metrics = {
            cpu: agent.health.cpu,
            memory: agent.health.memory,
            network: agent.health.network,
          };
        }
      } else {
        // Update service metrics
        const variation = this.randomBetween(-5, 5);
        node.metrics.cpu = Math.max(0, Math.min(100, node.metrics.cpu + variation));
        node.metrics.memory = Math.max(0, Math.min(100, node.metrics.memory + variation));
        node.metrics.network = Math.max(0, Math.min(100, node.metrics.network + variation));
      }
    });

    // Update connection metrics
    this.networkTopology.connections.forEach(connection => {
      const variation = this.randomBetween(-2, 2);
      connection.metrics.latency = Math.max(1, connection.metrics.latency + variation);
      connection.metrics.bandwidth = Math.max(1, connection.metrics.bandwidth + variation);
      connection.metrics.packetLoss = Math.max(0, Math.min(5, connection.metrics.packetLoss + variation * 0.1));
    });

    // Update overall metrics
    this.networkTopology.metrics = {
      totalNodes: this.networkTopology.nodes.length,
      activeConnections: this.networkTopology.connections.filter(c => c.status === 'active').length,
      averageLatency: this.networkTopology.connections.reduce((sum, c) => sum + c.metrics.latency, 0) / this.networkTopology.connections.length,
      throughput: this.networkTopology.connections.reduce((sum, c) => sum + c.metrics.bandwidth, 0),
    };
  }

  // Utility methods
  private randomBetween(min: number, max: number): number {
    return Math.random() * (max - min) + min;
  }

  private randomChoice<T>(array: T[]): T {
    return array[Math.floor(Math.random() * array.length)];
  }

  private generateAgentTags(type: Agent['type']): string[] {
    const baseTags = ['automated', 'ai-powered'];
    const typeTags: Record<Agent['type'], string[]> = {
      supervisor: ['coordinator', 'primary'],
      threat_hunter: ['security', 'ml-enabled'],
      incident_response: ['response', 'automation'],
      service_orchestration: ['orchestration', 'workflow'],
      financial_intelligence: ['financial', 'analytics'],
    };
    
    return [...baseTags, ...typeTags[type]];
  }

  // Public data access methods
  getCurrentAgents(): Agent[] {
    return [...this.agents];
  }

  getCurrentIncidents(): Incident[] {
    return [...this.incidents];
  }

  getFinancialHistory(): FinancialData[] {
    return [...this.financialHistory];
  }

  getCurrentNetworkTopology(): NetworkTopologyData | null {
    return this.networkTopology ? { ...this.networkTopology } : null;
  }

  getSimulationStatus() {
    return {
      isRunning: this.isRunning,
      config: this.config,
      dataPoints: {
        agents: this.agents.length,
        incidents: this.incidents.length,
        financialHistory: this.financialHistory.length,
        networkNodes: this.networkTopology?.nodes.length || 0,
      },
    };
  }
}

// Export singleton instance
export const dataSimulationService = new DataSimulationService();
export default dataSimulationService;