import { dataSimulationService } from './dataSimulationService';
import { realTimeDataService } from './realTimeDataService';
import { metricsAggregationService } from './metricsAggregationService';
import { dataVisualizationEngine } from './dataVisualizationEngine';
import { websocketService } from './websocketService';

export interface DemoScenario {
  id: string;
  name: string;
  description: string;
  duration: number; // in seconds
  events: DemoEvent[];
  metrics: string[];
  tags: string[];
}

export interface DemoEvent {
  id: string;
  type: 'metric_spike' | 'incident_creation' | 'agent_failure' | 'workflow_execution' | 'cost_alert' | 'security_breach';
  timestamp: number; // offset from scenario start in seconds
  data: any;
  description: string;
}

export interface DemoSession {
  id: string;
  scenarioId: string;
  startTime: string;
  endTime?: string;
  status: 'running' | 'paused' | 'completed' | 'failed';
  currentEventIndex: number;
  participants: string[];
  settings: DemoSettings;
}

export interface DemoSettings {
  autoPlay: boolean;
  playbackSpeed: number; // 1.0 = real-time, 2.0 = 2x speed, etc.
  enableNotifications: boolean;
  enableSounds: boolean;
  showEventMarkers: boolean;
  recordSession: boolean;
}

export interface DemoMetrics {
  sessionsCount: number;
  totalDuration: number;
  averageSessionDuration: number;
  popularScenarios: Array<{ scenarioId: string; count: number }>;
  userEngagement: {
    averageInteractions: number;
    completionRate: number;
    dropoffPoints: Array<{ eventIndex: number; count: number }>;
  };
}

class DemoDataOrchestrator {
  private scenarios: Map<string, DemoScenario> = new Map();
  private sessions: Map<string, DemoSession> = new Map();
  private activeTimers: Map<string, NodeJS.Timeout> = new Map();
  private eventCallbacks: Map<string, (event: DemoEvent) => void> = new Map();
  private sessionCallbacks: Map<string, (session: DemoSession) => void> = new Map();
  private isInitialized = false;

  constructor() {
    this.initializeDefaultScenarios();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Initialize dependent services
      await realTimeDataService.initialize();
      
      // Start data simulation
      dataSimulationService.startAllSimulations();
      
      // Initialize metrics collection
      this.startMetricsCollection();
      
      this.isInitialized = true;
      console.log('Demo data orchestrator initialized');
    } catch (error) {
      console.error('Failed to initialize demo data orchestrator:', error);
      throw error;
    }
  }

  private initializeDefaultScenarios(): void {
    // Cyber Attack Response Scenario
    this.scenarios.set('cyber-attack-response', {
      id: 'cyber-attack-response',
      name: 'Cyber Attack Response',
      description: 'Simulates a sophisticated cyber attack and automated response',
      duration: 300, // 5 minutes
      events: [
        {
          id: 'initial-breach',
          type: 'security_breach',
          timestamp: 30,
          description: 'Suspicious network activity detected',
          data: {
            severity: 'medium',
            source: '192.168.1.100',
            type: 'port_scan',
          },
        },
        {
          id: 'escalation',
          type: 'security_breach',
          timestamp: 90,
          description: 'Malware detected on endpoint',
          data: {
            severity: 'high',
            source: 'workstation-42',
            type: 'malware',
          },
        },
        {
          id: 'containment',
          type: 'workflow_execution',
          timestamp: 120,
          description: 'Automated containment workflow initiated',
          data: {
            workflowId: 'containment-protocol-1',
            status: 'running',
          },
        },
        {
          id: 'resolution',
          type: 'workflow_execution',
          timestamp: 240,
          description: 'Threat neutralized and systems restored',
          data: {
            workflowId: 'containment-protocol-1',
            status: 'completed',
          },
        },
      ],
      metrics: [
        'security.threats.detected',
        'security.incidents.active',
        'system.cpu.usage',
        'network.traffic.anomalies',
      ],
      tags: ['security', 'incident-response', 'automation'],
    });

    // Infrastructure Optimization Scenario
    this.scenarios.set('infrastructure-optimization', {
      id: 'infrastructure-optimization',
      name: 'Infrastructure Optimization',
      description: 'Demonstrates AI-driven infrastructure cost optimization',
      duration: 240, // 4 minutes
      events: [
        {
          id: 'cost-spike',
          type: 'cost_alert',
          timestamp: 20,
          description: 'Unusual cost increase detected',
          data: {
            service: 'compute-instances',
            increase: 35,
            threshold: 20,
          },
        },
        {
          id: 'analysis-start',
          type: 'workflow_execution',
          timestamp: 45,
          description: 'Cost analysis workflow initiated',
          data: {
            workflowId: 'cost-optimization-1',
            status: 'running',
          },
        },
        {
          id: 'recommendations',
          type: 'workflow_execution',
          timestamp: 120,
          description: 'Optimization recommendations generated',
          data: {
            workflowId: 'cost-optimization-1',
            recommendations: [
              'Resize 3 over-provisioned instances',
              'Schedule non-critical workloads',
              'Implement auto-scaling policies',
            ],
          },
        },
        {
          id: 'implementation',
          type: 'workflow_execution',
          timestamp: 180,
          description: 'Optimization changes applied',
          data: {
            workflowId: 'cost-optimization-1',
            status: 'completed',
            savings: 2840,
          },
        },
      ],
      metrics: [
        'financial.cost.total',
        'financial.savings.total',
        'system.cpu.usage',
        'system.memory.usage',
      ],
      tags: ['cost-optimization', 'ai-driven', 'infrastructure'],
    });

    // Multi-Agent Coordination Scenario
    this.scenarios.set('multi-agent-coordination', {
      id: 'multi-agent-coordination',
      name: 'Multi-Agent Coordination',
      description: 'Shows complex coordination between multiple AI agents',
      duration: 360, // 6 minutes
      events: [
        {
          id: 'complex-incident',
          type: 'incident_creation',
          timestamp: 15,
          description: 'Complex multi-system incident detected',
          data: {
            severity: 'critical',
            affectedSystems: ['database', 'api-gateway', 'cache'],
          },
        },
        {
          id: 'agent-coordination',
          type: 'workflow_execution',
          timestamp: 30,
          description: 'Multiple agents coordinating response',
          data: {
            agents: ['database-agent', 'network-agent', 'security-agent'],
            coordinationMode: 'collaborative',
          },
        },
        {
          id: 'parallel-actions',
          type: 'workflow_execution',
          timestamp: 90,
          description: 'Parallel remediation actions executed',
          data: {
            actions: [
              'Database failover initiated',
              'Traffic rerouted through backup gateway',
              'Cache cluster rebuilt',
            ],
          },
        },
        {
          id: 'system-recovery',
          type: 'workflow_execution',
          timestamp: 240,
          description: 'All systems restored to normal operation',
          data: {
            recoveryTime: '4 minutes 15 seconds',
            automationRate: 95,
          },
        },
      ],
      metrics: [
        'agents.active.count',
        'agents.coordination.efficiency',
        'incidents.resolution.time',
        'system.availability',
      ],
      tags: ['multi-agent', 'coordination', 'incident-response'],
    });
  }

  private startMetricsCollection(): void {
    // Start collecting demo metrics
    setInterval(() => {
      // System metrics
      metricsAggregationService.addMetric('system.cpu.usage', Math.random() * 100);
      metricsAggregationService.addMetric('system.memory.usage', Math.random() * 100);
      metricsAggregationService.addMetric('system.network.in', Math.random() * 1000);
      metricsAggregationService.addMetric('system.network.out', Math.random() * 800);
      
      // Agent metrics
      metricsAggregationService.addMetric('agents.active.count', Math.floor(Math.random() * 20) + 30);
      metricsAggregationService.addMetric('agents.response.time', Math.random() * 500 + 50);
      
      // Financial metrics
      metricsAggregationService.addMetric('financial.cost.total', Math.random() * 10000 + 50000);
      metricsAggregationService.addMetric('financial.savings.total', Math.random() * 5000 + 15000);
    }, 5000);
  }

  // Scenario management
  getScenarios(): DemoScenario[] {
    return Array.from(this.scenarios.values());
  }

  getScenario(scenarioId: string): DemoScenario | undefined {
    return this.scenarios.get(scenarioId);
  }

  addScenario(scenario: DemoScenario): void {
    this.scenarios.set(scenario.id, scenario);
  }

  updateScenario(scenarioId: string, updates: Partial<DemoScenario>): boolean {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) return false;

    Object.assign(scenario, updates);
    return true;
  }

  deleteScenario(scenarioId: string): boolean {
    return this.scenarios.delete(scenarioId);
  }

  // Session management
  startSession(scenarioId: string, settings: Partial<DemoSettings> = {}): string {
    const scenario = this.scenarios.get(scenarioId);
    if (!scenario) {
      throw new Error(`Scenario ${scenarioId} not found`);
    }

    const sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const session: DemoSession = {
      id: sessionId,
      scenarioId,
      startTime: new Date().toISOString(),
      status: 'running',
      currentEventIndex: 0,
      participants: [],
      settings: {
        autoPlay: true,
        playbackSpeed: 1.0,
        enableNotifications: true,
        enableSounds: false,
        showEventMarkers: true,
        recordSession: true,
        ...settings,
      },
    };

    this.sessions.set(sessionId, session);
    this.scheduleEvents(sessionId);
    
    // Notify session callbacks
    this.sessionCallbacks.forEach(callback => callback(session));
    
    console.log(`Demo session ${sessionId} started for scenario ${scenarioId}`);
    return sessionId;
  }

  pauseSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'running') return false;

    session.status = 'paused';
    
    // Clear any pending timers
    const timer = this.activeTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(sessionId);
    }

    this.sessionCallbacks.forEach(callback => callback(session));
    return true;
  }

  resumeSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session || session.status !== 'paused') return false;

    session.status = 'running';
    this.scheduleEvents(sessionId);
    
    this.sessionCallbacks.forEach(callback => callback(session));
    return true;
  }

  stopSession(sessionId: string): boolean {
    const session = this.sessions.get(sessionId);
    if (!session) return false;

    session.status = 'completed';
    session.endTime = new Date().toISOString();
    
    // Clear any pending timers
    const timer = this.activeTimers.get(sessionId);
    if (timer) {
      clearTimeout(timer);
      this.activeTimers.delete(sessionId);
    }

    this.sessionCallbacks.forEach(callback => callback(session));
    return true;
  }

  getSession(sessionId: string): DemoSession | undefined {
    return this.sessions.get(sessionId);
  }

  getSessions(): DemoSession[] {
    return Array.from(this.sessions.values());
  }

  getCurrentSessions(): DemoSession[] {
    return Array.from(this.sessions.values()).filter(session => 
      session.status === 'running' || session.status === 'paused'
    );
  }

  private scheduleEvents(sessionId: string): void {
    const session = this.sessions.get(sessionId);
    if (!session) return;

    const scenario = this.scenarios.get(session.scenarioId);
    if (!scenario) return;

    const nextEvent = scenario.events[session.currentEventIndex];
    if (!nextEvent) {
      // No more events, complete the session
      this.stopSession(sessionId);
      return;
    }

    const delay = (nextEvent.timestamp * 1000) / session.settings.playbackSpeed;
    
    const timer = setTimeout(() => {
      this.executeEvent(sessionId, nextEvent);
      session.currentEventIndex++;
      
      // Schedule next event
      if (session.status === 'running') {
        this.scheduleEvents(sessionId);
      }
    }, delay);

    this.activeTimers.set(sessionId, timer);
  }

  private executeEvent(sessionId: string, event: DemoEvent): void {
    console.log(`Executing event ${event.id}: ${event.description}`);
    
    // Execute event based on type
    switch (event.type) {
      case 'metric_spike':
        this.simulateMetricSpike(event.data);
        break;
      case 'incident_creation':
        this.simulateIncidentCreation(event.data);
        break;
      case 'agent_failure':
        this.simulateAgentFailure(event.data);
        break;
      case 'workflow_execution':
        this.simulateWorkflowExecution(event.data);
        break;
      case 'cost_alert':
        this.simulateCostAlert(event.data);
        break;
      case 'security_breach':
        this.simulateSecurityBreach(event.data);
        break;
    }

    // Notify event callbacks
    this.eventCallbacks.forEach(callback => callback(event));
    
    // Send real-time update
    if (websocketService.isConnected()) {
      websocketService.send({
        type: 'demo_event',
        data: {
          sessionId,
          event,
          timestamp: new Date().toISOString(),
        },
      });
    }
  }

  private simulateMetricSpike(data: any): void {
    const metricName = data.metric || 'system.cpu.usage';
    const spikeValue = data.value || 95;
    metricsAggregationService.addMetric(metricName, spikeValue, { source: 'demo_spike' });
  }

  private simulateIncidentCreation(data: any): void {
    const incident = {
      id: `incident_${Date.now()}`,
      title: data.title || 'Demo Incident',
      severity: data.severity || 'medium',
      status: 'open',
      createdAt: new Date().toISOString(),
      ...data,
    };
    
    // Send incident update
    realTimeDataService.simulateIncidentUpdate(incident);
  }

  private simulateAgentFailure(data: any): void {
    const agentId = data.agentId || 'agent_001';
    const failureType = data.type || 'connection_timeout';
    
    // Send agent failure update
    realTimeDataService.simulateAgentUpdate({
      id: agentId,
      status: 'failed',
      lastError: failureType,
      updatedAt: new Date().toISOString(),
    });
  }

  private simulateWorkflowExecution(data: any): void {
    const workflow = {
      id: data.workflowId || `workflow_${Date.now()}`,
      name: data.name || 'Demo Workflow',
      status: data.status || 'running',
      progress: data.progress || Math.floor(Math.random() * 100),
      startedAt: new Date().toISOString(),
      ...data,
    };
    
    // Send workflow update
    realTimeDataService.simulateWorkflowUpdate(workflow);
  }

  private simulateCostAlert(data: any): void {
    const alert = {
      id: `cost_alert_${Date.now()}`,
      type: 'cost_threshold_exceeded',
      severity: data.severity || 'warning',
      message: data.message || 'Cost threshold exceeded',
      service: data.service || 'compute-instances',
      currentCost: data.currentCost || 1500,
      threshold: data.threshold || 1000,
      createdAt: new Date().toISOString(),
      ...data,
    };
    
    // Add cost metric
    metricsAggregationService.addMetric('financial.cost.alert', alert.currentCost, {
      service: alert.service,
      severity: alert.severity,
    });
  }

  private simulateSecurityBreach(data: any): void {
    const breach = {
      id: `security_breach_${Date.now()}`,
      type: data.type || 'unauthorized_access',
      severity: data.severity || 'high',
      source: data.source || 'unknown',
      description: data.description || 'Security breach detected',
      detectedAt: new Date().toISOString(),
      ...data,
    };
    
    // Add security metrics
    metricsAggregationService.addMetric('security.threats.detected', 1, {
      type: breach.type,
      severity: breach.severity,
    });
    
    // Create incident if severity is high
    if (breach.severity === 'high' || breach.severity === 'critical') {
      this.simulateIncidentCreation({
        title: `Security Breach: ${breach.type}`,
        severity: breach.severity,
        source: breach.source,
        type: 'security',
      });
    }
  }

  // Event callbacks
  onEvent(callback: (event: DemoEvent) => void): void {
    const callbackId = `callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.eventCallbacks.set(callbackId, callback);
  }

  onSessionUpdate(callback: (session: DemoSession) => void): void {
    const callbackId = `session_callback_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    this.sessionCallbacks.set(callbackId, callback);
  }

  // Cleanup
  destroy(): void {
    // Stop all active sessions
    this.sessions.forEach((_, sessionId) => {
      this.stopSession(sessionId);
    });

    // Clear all timers
    this.activeTimers.forEach(timer => clearTimeout(timer));
    this.activeTimers.clear();

    // Clear callbacks
    this.eventCallbacks.clear();
    this.sessionCallbacks.clear();

    // Clear data
    this.scenarios.clear();
    this.sessions.clear();

    console.log('Demo data orchestrator destroyed');
  }
}

// Create and export singleton instance
export const demoDataOrchestrator = new DemoDataOrchestrator();
export default demoDataOrchestrator;