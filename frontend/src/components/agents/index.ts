// Agent Management Components
export { AgentOverview } from './AgentOverview';
export type { Agent, AgentOverviewProps } from './AgentOverview';

export { AgentTopology } from './AgentTopology';
export type { AgentConnection, AgentTopologyProps } from './AgentTopology';

export { AgentMetrics } from './AgentMetrics';
export type { AgentMetric, AgentMetricsProps } from './AgentMetrics';

// Agent utilities and helpers
export const generateMockAgents = (): Agent[] => [
  {
    id: 'supervisor-001',
    name: 'Supervisor Agent',
    type: 'supervisor',
    status: 'online',
    health: {
      score: 95,
      cpu: 25,
      memory: 45,
      disk: 60,
      network: 30,
    },
    performance: {
      tasksCompleted: 1250,
      averageResponseTime: 150,
      successRate: 98.5,
      uptime: 86400 * 7, // 7 days
    },
    lastHeartbeat: new Date(Date.now() - 30000), // 30 seconds ago
    version: '2.1.0',
    location: 'us-east-1',
    tags: ['primary', 'coordinator', 'high-priority'],
    metadata: {
      instanceType: 'm5.large',
      region: 'us-east-1',
      availabilityZone: 'us-east-1a',
    },
  },
  {
    id: 'threat-hunter-001',
    name: 'Threat Hunter Alpha',
    type: 'threat_hunter',
    status: 'online',
    health: {
      score: 88,
      cpu: 65,
      memory: 70,
      disk: 45,
      network: 55,
    },
    performance: {
      tasksCompleted: 890,
      averageResponseTime: 320,
      successRate: 94.2,
      uptime: 86400 * 5, // 5 days
    },
    lastHeartbeat: new Date(Date.now() - 15000), // 15 seconds ago
    version: '2.0.8',
    location: 'us-west-2',
    tags: ['security', 'ml-enabled', 'threat-detection'],
    metadata: {
      instanceType: 'c5.xlarge',
      region: 'us-west-2',
      availabilityZone: 'us-west-2b',
    },
  },
  {
    id: 'threat-hunter-002',
    name: 'Threat Hunter Beta',
    type: 'threat_hunter',
    status: 'warning',
    health: {
      score: 72,
      cpu: 85,
      memory: 90,
      disk: 55,
      network: 40,
    },
    performance: {
      tasksCompleted: 654,
      averageResponseTime: 450,
      successRate: 89.1,
      uptime: 86400 * 3, // 3 days
    },
    lastHeartbeat: new Date(Date.now() - 120000), // 2 minutes ago
    version: '2.0.7',
    location: 'eu-west-1',
    tags: ['security', 'backup', 'high-load'],
    metadata: {
      instanceType: 'c5.large',
      region: 'eu-west-1',
      availabilityZone: 'eu-west-1c',
    },
  },
  {
    id: 'incident-response-001',
    name: 'Incident Response Unit',
    type: 'incident_response',
    status: 'online',
    health: {
      score: 92,
      cpu: 35,
      memory: 55,
      disk: 40,
      network: 45,
    },
    performance: {
      tasksCompleted: 445,
      averageResponseTime: 200,
      successRate: 96.8,
      uptime: 86400 * 10, // 10 days
    },
    lastHeartbeat: new Date(Date.now() - 45000), // 45 seconds ago
    version: '2.1.1',
    location: 'us-east-1',
    tags: ['incident', 'response', 'automation'],
    metadata: {
      instanceType: 'm5.medium',
      region: 'us-east-1',
      availabilityZone: 'us-east-1b',
    },
  },
  {
    id: 'service-orchestration-001',
    name: 'Service Orchestrator',
    type: 'service_orchestration',
    status: 'online',
    health: {
      score: 85,
      cpu: 50,
      memory: 65,
      disk: 70,
      network: 60,
    },
    performance: {
      tasksCompleted: 2100,
      averageResponseTime: 180,
      successRate: 97.3,
      uptime: 86400 * 12, // 12 days
    },
    lastHeartbeat: new Date(Date.now() - 20000), // 20 seconds ago
    version: '2.0.9',
    location: 'us-west-1',
    tags: ['orchestration', 'workflow', 'automation'],
    metadata: {
      instanceType: 'm5.large',
      region: 'us-west-1',
      availabilityZone: 'us-west-1a',
    },
  },
  {
    id: 'financial-intelligence-001',
    name: 'Financial Intelligence Agent',
    type: 'financial_intelligence',
    status: 'online',
    health: {
      score: 90,
      cpu: 40,
      memory: 50,
      disk: 35,
      network: 25,
    },
    performance: {
      tasksCompleted: 780,
      averageResponseTime: 250,
      successRate: 95.7,
      uptime: 86400 * 8, // 8 days
    },
    lastHeartbeat: new Date(Date.now() - 60000), // 1 minute ago
    version: '2.1.0',
    location: 'us-east-2',
    tags: ['financial', 'analytics', 'reporting'],
    metadata: {
      instanceType: 'm5.medium',
      region: 'us-east-2',
      availabilityZone: 'us-east-2a',
    },
  },
  {
    id: 'service-orchestration-002',
    name: 'Backup Orchestrator',
    type: 'service_orchestration',
    status: 'maintenance',
    health: {
      score: 0,
      cpu: 0,
      memory: 0,
      disk: 0,
      network: 0,
    },
    performance: {
      tasksCompleted: 1450,
      averageResponseTime: 190,
      successRate: 96.1,
      uptime: 0, // Currently down for maintenance
    },
    lastHeartbeat: new Date(Date.now() - 300000), // 5 minutes ago
    version: '2.0.8',
    location: 'us-west-1',
    tags: ['orchestration', 'backup', 'maintenance'],
    metadata: {
      instanceType: 'm5.medium',
      region: 'us-west-1',
      availabilityZone: 'us-west-1b',
    },
  },
];

export const generateMockAgentConnections = (): AgentConnection[] => [
  {
    id: 'conn-001',
    sourceAgentId: 'supervisor-001',
    targetAgentId: 'threat-hunter-001',
    type: 'supervision',
    status: 'active',
    bandwidth: 150,
    latency: 25,
    messageCount: 1250,
    lastActivity: new Date(Date.now() - 10000),
  },
  {
    id: 'conn-002',
    sourceAgentId: 'supervisor-001',
    targetAgentId: 'threat-hunter-002',
    type: 'supervision',
    status: 'active',
    bandwidth: 120,
    latency: 45,
    messageCount: 890,
    lastActivity: new Date(Date.now() - 30000),
  },
  {
    id: 'conn-003',
    sourceAgentId: 'supervisor-001',
    targetAgentId: 'incident-response-001',
    type: 'supervision',
    status: 'active',
    bandwidth: 80,
    latency: 15,
    messageCount: 445,
    lastActivity: new Date(Date.now() - 5000),
  },
  {
    id: 'conn-004',
    sourceAgentId: 'supervisor-001',
    targetAgentId: 'service-orchestration-001',
    type: 'supervision',
    status: 'active',
    bandwidth: 200,
    latency: 20,
    messageCount: 2100,
    lastActivity: new Date(Date.now() - 8000),
  },
  {
    id: 'conn-005',
    sourceAgentId: 'supervisor-001',
    targetAgentId: 'financial-intelligence-001',
    type: 'supervision',
    status: 'active',
    bandwidth: 90,
    latency: 30,
    messageCount: 780,
    lastActivity: new Date(Date.now() - 15000),
  },
  {
    id: 'conn-006',
    sourceAgentId: 'threat-hunter-001',
    targetAgentId: 'incident-response-001',
    type: 'data_flow',
    status: 'active',
    bandwidth: 300,
    latency: 12,
    messageCount: 650,
    lastActivity: new Date(Date.now() - 3000),
  },
  {
    id: 'conn-007',
    sourceAgentId: 'threat-hunter-002',
    targetAgentId: 'incident-response-001',
    type: 'data_flow',
    status: 'active',
    bandwidth: 250,
    latency: 18,
    messageCount: 420,
    lastActivity: new Date(Date.now() - 7000),
  },
  {
    id: 'conn-008',
    sourceAgentId: 'incident-response-001',
    targetAgentId: 'service-orchestration-001',
    type: 'communication',
    status: 'active',
    bandwidth: 180,
    latency: 22,
    messageCount: 380,
    lastActivity: new Date(Date.now() - 12000),
  },
  {
    id: 'conn-009',
    sourceAgentId: 'service-orchestration-001',
    targetAgentId: 'financial-intelligence-001',
    type: 'data_flow',
    status: 'active',
    bandwidth: 100,
    latency: 35,
    messageCount: 290,
    lastActivity: new Date(Date.now() - 20000),
  },
  {
    id: 'conn-010',
    sourceAgentId: 'supervisor-001',
    targetAgentId: 'service-orchestration-002',
    type: 'supervision',
    status: 'inactive',
    bandwidth: 0,
    latency: 0,
    messageCount: 0,
    lastActivity: new Date(Date.now() - 300000),
  },
];

export const generateMockAgentMetrics = (agents: Agent[], hours: number = 24): AgentMetric[] => {
  const metrics: AgentMetric[] = [];
  const now = Date.now();
  const interval = (hours * 60 * 60 * 1000) / 100; // 100 data points

  for (let i = 0; i < 100; i++) {
    const timestamp = new Date(now - (hours * 60 * 60 * 1000) + (i * interval));
    
    agents.forEach(agent => {
      if (agent.status === 'maintenance') return; // Skip maintenance agents
      
      const baseVariation = Math.sin(i * 0.1) * 10;
      const randomVariation = (Math.random() - 0.5) * 20;
      
      metrics.push({
        timestamp,
        agentId: agent.id,
        agentName: agent.name,
        cpu: Math.max(0, Math.min(100, agent.health.cpu + baseVariation + randomVariation)),
        memory: Math.max(0, Math.min(100, agent.health.memory + baseVariation + randomVariation)),
        disk: Math.max(0, Math.min(100, agent.health.disk + (randomVariation * 0.5))),
        network: Math.max(0, Math.min(100, agent.health.network + baseVariation + randomVariation)),
        tasksCompleted: Math.max(0, Math.floor(agent.performance.tasksCompleted / 100 + Math.random() * 10)),
        tasksActive: Math.max(0, Math.floor(Math.random() * 5)),
        responseTime: Math.max(50, agent.performance.averageResponseTime + (randomVariation * 2)),
        errorRate: Math.max(0, Math.min(10, (100 - agent.performance.successRate) + (randomVariation * 0.1))),
        uptime: agent.performance.uptime + (i * interval / 1000),
      });
    });
  }

  return metrics;
};

// Agent status utilities
export const getAgentStatusSummary = (agents: Agent[]) => {
  const summary = {
    total: agents.length,
    online: 0,
    offline: 0,
    warning: 0,
    error: 0,
    maintenance: 0,
    avgHealth: 0,
    totalTasks: 0,
    avgResponseTime: 0,
  };

  agents.forEach(agent => {
    summary[agent.status]++;
    summary.avgHealth += agent.health.score;
    summary.totalTasks += agent.performance.tasksCompleted;
    summary.avgResponseTime += agent.performance.averageResponseTime;
  });

  if (agents.length > 0) {
    summary.avgHealth = Math.round(summary.avgHealth / agents.length);
    summary.avgResponseTime = Math.round(summary.avgResponseTime / agents.length);
  }

  return summary;
};

export const getAgentsByType = (agents: Agent[]) => {
  const byType: Record<string, Agent[]> = {};
  
  agents.forEach(agent => {
    if (!byType[agent.type]) {
      byType[agent.type] = [];
    }
    byType[agent.type].push(agent);
  });

  return byType;
};

export const getAgentsByStatus = (agents: Agent[]) => {
  const byStatus: Record<string, Agent[]> = {};
  
  agents.forEach(agent => {
    if (!byStatus[agent.status]) {
      byStatus[agent.status] = [];
    }
    byStatus[agent.status].push(agent);
  });

  return byStatus;
};

export const getAgentsByLocation = (agents: Agent[]) => {
  const byLocation: Record<string, Agent[]> = {};
  
  agents.forEach(agent => {
    if (!byLocation[agent.location]) {
      byLocation[agent.location] = [];
    }
    byLocation[agent.location].push(agent);
  });

  return byLocation;
};/
/ Configuration Management Components
export { AgentConfigurationManager } from './AgentConfigurationManager';
export { ConfigurationVersioning } from './ConfigurationVersioning';
export { BulkConfigurationManager } from './BulkConfigurationManager';

// Configuration Management Types
export type { 
  AgentConfiguration, 
  ConfigurationTemplate, 
  ConfigurationValidationResult 
} from './AgentConfigurationManager';
export type { 
  ConfigurationVersion, 
  ConfigurationComparison 
} from './ConfigurationVersioning';
export type { 
  BulkOperation, 
  BulkOperationResult 
} from './BulkConfigurationManager';//
 Log Viewer and Diagnostics Components
export { AgentLogViewer } from './AgentLogViewer';
export { AgentDiagnostics } from './AgentDiagnostics';

// Log Viewer and Diagnostics Types
export type { LogEntry, LogFilter } from './AgentLogViewer';
export type { DiagnosticTest, SystemMetrics } from './AgentDiagnostics';