import { demoDataOrchestrator } from './demoDataOrchestrator';
import { metricsAggregationService } from './metricsAggregationService';
import { dataSimulationService } from './dataSimulationService';
import { realTimeDataService } from './realTimeDataService';
import { currentConfig } from '../config/demoEngineConfig';

export interface BackgroundDataConfig {
  enabled: boolean;
  updateInterval: number;
  seedDataEnabled: boolean;
  continuousUpdatesEnabled: boolean;
  scenarioTriggersEnabled: boolean;
  variationPatterns: {
    enabled: boolean;
    intensity: 'low' | 'medium' | 'high';
    frequency: number;
  };
}

export interface SeedDataOptions {
  agents: {
    count: number;
    types: string[];
    locations: string[];
  };
  incidents: {
    count: number;
    severities: string[];
    categories: string[];
  };
  workflows: {
    count: number;
    templates: string[];
    statuses: string[];
  };
  metrics: {
    historyDays: number;
    dataPoints: number;
    categories: string[];
  };
}

export interface DataVariationPattern {
  id: string;
  name: string;
  description: string;
  targetMetrics: string[];
  pattern: 'sine' | 'random' | 'spike' | 'trend' | 'seasonal';
  intensity: number;
  frequency: number;
  duration: number;
  enabled: boolean;
}

class BackgroundDataService {
  private config: BackgroundDataConfig = {
    enabled: true,
    updateInterval: 5000,
    seedDataEnabled: true,
    continuousUpdatesEnabled: true,
    scenarioTriggersEnabled: true,
    variationPatterns: {
      enabled: true,
      intensity: 'medium',
      frequency: 30000, // 30 seconds
    },
  };

  private updateTimer: NodeJS.Timeout | null = null;
  private variationTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private isRunning = false;
  private variationPatterns: Map<string, DataVariationPattern> = new Map();

  constructor() {
    this.initializeVariationPatterns();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing background data service...');

      // Initialize seed data if enabled
      if (this.config.seedDataEnabled) {
        await this.populateSeedData();
      }

      // Start continuous updates if enabled
      if (this.config.continuousUpdatesEnabled) {
        this.startContinuousUpdates();
      }

      // Start variation patterns if enabled
      if (this.config.variationPatterns.enabled) {
        this.startVariationPatterns();
      }

      this.isInitialized = true;
      this.isRunning = true;
      console.log('Background data service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize background data service:', error);
      throw error;
    }
  }

  private async populateSeedData(): Promise<void> {
    console.log('Populating seed data...');

    const seedOptions: SeedDataOptions = {
      agents: {
        count: 25,
        types: ['security', 'monitoring', 'automation', 'analysis', 'response'],
        locations: ['us-east-1', 'us-west-2', 'eu-west-1', 'ap-southeast-1'],
      },
      incidents: {
        count: 15,
        severities: ['low', 'medium', 'high', 'critical'],
        categories: ['security', 'performance', 'availability', 'compliance'],
      },
      workflows: {
        count: 20,
        templates: ['incident-response', 'security-scan', 'backup', 'maintenance'],
        statuses: ['active', 'completed', 'failed', 'pending'],
      },
      metrics: {
        historyDays: 7,
        dataPoints: 1000,
        categories: ['system', 'security', 'financial', 'performance'],
      },
    };

    // Populate agent data
    await this.populateAgentData(seedOptions.agents);

    // Populate incident data
    await this.populateIncidentData(seedOptions.incidents);

    // Populate workflow data
    await this.populateWorkflowData(seedOptions.workflows);

    // Populate historical metrics
    await this.populateHistoricalMetrics(seedOptions.metrics);

    console.log('Seed data population completed');
  }

  private async populateAgentData(options: SeedDataOptions['agents']): Promise<void> {
    const agents = [];

    for (let i = 0; i < options.count; i++) {
      const agent = {
        id: `agent_${String(i).padStart(3, '0')}`,
        name: `Agent ${i + 1}`,
        type: options.types[Math.floor(Math.random() * options.types.length)],
        location: options.locations[Math.floor(Math.random() * options.locations.length)],
        status: Math.random() > 0.1 ? 'online' : 'offline',
        health: Math.random() > 0.2 ? 'healthy' : Math.random() > 0.5 ? 'warning' : 'critical',
        version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`,
        lastSeen: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        metrics: {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          responseTime: Math.random() * 1000 + 50,
          errorRate: Math.random() * 5,
        },
        capabilities: this.generateAgentCapabilities(options.types[Math.floor(Math.random() * options.types.length)]),
      };

      agents.push(agent);

      // Simulate agent status update
      realTimeDataService.simulateAgentUpdate(agent);
    }

    console.log(`Generated ${agents.length} agents`);
  }

  private async populateIncidentData(options: SeedDataOptions['incidents']): Promise<void> {
    const incidents = [];

    for (let i = 0; i < options.count; i++) {
      const severity = options.severities[Math.floor(Math.random() * options.severities.length)];
      const category = options.categories[Math.floor(Math.random() * options.categories.length)];
      
      const incident = {
        id: `incident_${String(i).padStart(3, '0')}`,
        title: this.generateIncidentTitle(category, severity),
        description: this.generateIncidentDescription(category),
        severity,
        category,
        status: Math.random() > 0.3 ? 'open' : Math.random() > 0.5 ? 'investigating' : 'resolved',
        assignedTo: `user_${Math.floor(Math.random() * 10) + 1}`,
        createdAt: new Date(Date.now() - Math.random() * 7 * 24 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        tags: this.generateIncidentTags(category),
        affectedSystems: this.generateAffectedSystems(),
        estimatedImpact: this.calculateEstimatedImpact(severity),
      };

      incidents.push(incident);

      // Simulate incident update
      realTimeDataService.simulateIncidentUpdate(incident);
    }

    console.log(`Generated ${incidents.length} incidents`);
  }

  private async populateWorkflowData(options: SeedDataOptions['workflows']): Promise<void> {
    const workflows = [];

    for (let i = 0; i < options.count; i++) {
      const template = options.templates[Math.floor(Math.random() * options.templates.length)];
      const status = options.statuses[Math.floor(Math.random() * options.statuses.length)];
      
      const workflow = {
        id: `workflow_${String(i).padStart(3, '0')}`,
        name: this.generateWorkflowName(template),
        template,
        status,
        progress: status === 'completed' ? 100 : status === 'failed' ? Math.random() * 80 : Math.random() * 100,
        startedAt: new Date(Date.now() - Math.random() * 24 * 3600000).toISOString(),
        updatedAt: new Date(Date.now() - Math.random() * 3600000).toISOString(),
        steps: this.generateWorkflowSteps(template),
        executionTime: Math.random() * 3600000, // Up to 1 hour
        triggeredBy: Math.random() > 0.5 ? 'manual' : 'automated',
      };

      workflows.push(workflow);

      // Simulate workflow update
      realTimeDataService.simulateWorkflowUpdate(workflow);
    }

    console.log(`Generated ${workflows.length} workflows`);
  }

  private async populateHistoricalMetrics(options: SeedDataOptions['metrics']): Promise<void> {
    const endTime = new Date();
    const startTime = new Date(endTime.getTime() - options.historyDays * 24 * 3600000);
    
    const metricNames = [
      'system.cpu.usage',
      'system.memory.usage',
      'system.disk.usage',
      'system.network.in',
      'system.network.out',
      'agents.active.count',
      'agents.response.time',
      'security.threats.detected',
      'security.incidents.active',
      'financial.cost.total',
      'financial.savings.total',
      'performance.response.time',
      'performance.throughput',
    ];

    for (const metricName of metricNames) {
      const dataPoints = [];
      const interval = (endTime.getTime() - startTime.getTime()) / options.dataPoints;
      
      let baseValue = this.getBaseValueForMetric(metricName);
      
      for (let i = 0; i < options.dataPoints; i++) {
        const timestamp = new Date(startTime.getTime() + i * interval);
        
        // Add some realistic variation
        const variation = (Math.random() - 0.5) * 0.2 * baseValue;
        let value = Math.max(0, baseValue + variation);
        
        // Add daily patterns for some metrics
        if (metricName.includes('cpu') || metricName.includes('memory')) {
          const hourOfDay = timestamp.getHours();
          const dailyMultiplier = 0.7 + 0.3 * Math.sin((hourOfDay - 6) * Math.PI / 12);
          value *= dailyMultiplier;
        }

        metricsAggregationService.addMetric(metricName, value, {
          source: 'seed_data',
          timestamp: timestamp.toISOString(),
        });
      }
    }

    console.log(`Generated historical data for ${metricNames.length} metrics`);
  }

  private startContinuousUpdates(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
    }

    this.updateTimer = setInterval(() => {
      this.performContinuousUpdate();
    }, this.config.updateInterval);

    console.log(`Started continuous updates with ${this.config.updateInterval}ms interval`);
  }

  private performContinuousUpdate(): void {
    // Update system metrics
    this.updateSystemMetrics();
    
    // Update agent statuses
    this.updateAgentStatuses();
    
    // Update financial metrics
    this.updateFinancialMetrics();
    
    // Randomly trigger events
    this.triggerRandomEvents();
  }

  private updateSystemMetrics(): void {
    const metrics = [
      { name: 'system.cpu.usage', value: Math.random() * 100 },
      { name: 'system.memory.usage', value: Math.random() * 100 },
      { name: 'system.disk.usage', value: 60 + Math.random() * 30 },
      { name: 'system.network.in', value: Math.random() * 1000 },
      { name: 'system.network.out', value: Math.random() * 800 },
      { name: 'performance.response.time', value: Math.random() * 500 + 50 },
      { name: 'performance.throughput', value: Math.random() * 10000 + 1000 },
    ];

    metrics.forEach(metric => {
      metricsAggregationService.addMetric(metric.name, metric.value, {
        source: 'continuous_update',
      });
    });
  }

  private updateAgentStatuses(): void {
    // Randomly update some agent statuses
    if (Math.random() < 0.1) { // 10% chance
      const agentId = `agent_${String(Math.floor(Math.random() * 25)).padStart(3, '0')}`;
      const statuses = ['online', 'offline', 'maintenance'];
      const healths = ['healthy', 'warning', 'critical'];
      
      realTimeDataService.simulateAgentUpdate({
        id: agentId,
        status: statuses[Math.floor(Math.random() * statuses.length)],
        health: healths[Math.floor(Math.random() * healths.length)],
        lastSeen: new Date().toISOString(),
        metrics: {
          cpu: Math.random() * 100,
          memory: Math.random() * 100,
          responseTime: Math.random() * 1000 + 50,
          errorRate: Math.random() * 5,
        },
      });
    }
  }

  private updateFinancialMetrics(): void {
    const currentHour = new Date().getHours();
    
    // Business hours have different patterns
    const isBusinessHours = currentHour >= 9 && currentHour <= 17;
    const multiplier = isBusinessHours ? 1.2 : 0.8;
    
    metricsAggregationService.addMetric('financial.cost.total', 
      (50000 + Math.random() * 10000) * multiplier, {
      source: 'continuous_update',
    });
    
    metricsAggregationService.addMetric('financial.savings.total', 
      (15000 + Math.random() * 5000) * multiplier, {
      source: 'continuous_update',
    });
  }

  private triggerRandomEvents(): void {
    // Randomly trigger incidents (low probability)
    if (Math.random() < 0.01) { // 1% chance
      this.triggerRandomIncident();
    }
    
    // Randomly trigger workflow executions
    if (Math.random() < 0.05) { // 5% chance
      this.triggerRandomWorkflow();
    }
    
    // Randomly trigger security events
    if (Math.random() < 0.02) { // 2% chance
      this.triggerSecurityEvent();
    }
  }

  private triggerRandomIncident(): void {
    const severities = ['low', 'medium', 'high', 'critical'];
    const categories = ['security', 'performance', 'availability', 'compliance'];
    
    const severity = severities[Math.floor(Math.random() * severities.length)];
    const category = categories[Math.floor(Math.random() * categories.length)];
    
    const incident = {
      id: `incident_${Date.now()}`,
      title: this.generateIncidentTitle(category, severity),
      description: this.generateIncidentDescription(category),
      severity,
      category,
      status: 'open',
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      tags: this.generateIncidentTags(category),
    };

    realTimeDataService.simulateIncidentUpdate(incident);
    console.log(`Triggered random incident: ${incident.title}`);
  }

  private triggerRandomWorkflow(): void {
    const templates = ['incident-response', 'security-scan', 'backup', 'maintenance'];
    const template = templates[Math.floor(Math.random() * templates.length)];
    
    const workflow = {
      id: `workflow_${Date.now()}`,
      name: this.generateWorkflowName(template),
      template,
      status: 'running',
      progress: 0,
      startedAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      triggeredBy: 'automated',
    };

    realTimeDataService.simulateWorkflowUpdate(workflow);
    console.log(`Triggered random workflow: ${workflow.name}`);
  }

  private triggerSecurityEvent(): void {
    const eventTypes = ['threat_detected', 'vulnerability_found', 'suspicious_activity', 'policy_violation'];
    const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
    
    metricsAggregationService.addMetric('security.threats.detected', 1, {
      source: 'security_event',
      type: eventType,
      severity: Math.random() > 0.7 ? 'high' : 'medium',
    });

    console.log(`Triggered security event: ${eventType}`);
  }

  private initializeVariationPatterns(): void {
    const patterns: DataVariationPattern[] = [
      {
        id: 'business_hours_cpu',
        name: 'Business Hours CPU Pattern',
        description: 'Higher CPU usage during business hours',
        targetMetrics: ['system.cpu.usage'],
        pattern: 'sine',
        intensity: 0.3,
        frequency: 24 * 3600000, // 24 hours
        duration: -1, // Continuous
        enabled: true,
      },
      {
        id: 'weekly_incident_spike',
        name: 'Weekly Incident Spike',
        description: 'Higher incident rate on Mondays',
        targetMetrics: ['security.incidents.active'],
        pattern: 'spike',
        intensity: 0.5,
        frequency: 7 * 24 * 3600000, // 7 days
        duration: 4 * 3600000, // 4 hours
        enabled: true,
      },
      {
        id: 'random_performance_variation',
        name: 'Random Performance Variation',
        description: 'Random variations in performance metrics',
        targetMetrics: ['performance.response.time', 'performance.throughput'],
        pattern: 'random',
        intensity: 0.2,
        frequency: 300000, // 5 minutes
        duration: 60000, // 1 minute
        enabled: true,
      },
    ];

    patterns.forEach(pattern => {
      this.variationPatterns.set(pattern.id, pattern);
    });
  }

  private startVariationPatterns(): void {
    if (this.variationTimer) {
      clearInterval(this.variationTimer);
    }

    this.variationTimer = setInterval(() => {
      this.applyVariationPatterns();
    }, this.config.variationPatterns.frequency);

    console.log('Started variation patterns');
  }

  private applyVariationPatterns(): void {
    this.variationPatterns.forEach(pattern => {
      if (!pattern.enabled) return;

      pattern.targetMetrics.forEach(metricName => {
        const variation = this.calculatePatternVariation(pattern);
        const baseValue = this.getBaseValueForMetric(metricName);
        const adjustedValue = Math.max(0, baseValue * (1 + variation));

        metricsAggregationService.addMetric(metricName, adjustedValue, {
          source: 'variation_pattern',
          pattern: pattern.id,
        });
      });
    });
  }

  private calculatePatternVariation(pattern: DataVariationPattern): number {
    const now = Date.now();
    
    switch (pattern.pattern) {
      case 'sine':
        const sinePhase = (now % pattern.frequency) / pattern.frequency * 2 * Math.PI;
        return Math.sin(sinePhase) * pattern.intensity;
      
      case 'random':
        return (Math.random() - 0.5) * 2 * pattern.intensity;
      
      case 'spike':
        const spikePhase = (now % pattern.frequency) / pattern.frequency;
        return spikePhase < 0.1 ? pattern.intensity : 0; // Spike for 10% of the cycle
      
      case 'trend':
        const trendPhase = (now % pattern.frequency) / pattern.frequency;
        return trendPhase * pattern.intensity;
      
      case 'seasonal':
        const seasonalPhase = (now % pattern.frequency) / pattern.frequency * 2 * Math.PI;
        return Math.sin(seasonalPhase) * pattern.intensity * 0.5 + 
               Math.sin(seasonalPhase * 4) * pattern.intensity * 0.3;
      
      default:
        return 0;
    }
  }

  // Helper methods for generating realistic data
  private generateAgentCapabilities(type: string): string[] {
    const capabilityMap: Record<string, string[]> = {
      security: ['threat-detection', 'vulnerability-scanning', 'incident-response', 'forensics'],
      monitoring: ['metrics-collection', 'log-analysis', 'alerting', 'reporting'],
      automation: ['workflow-execution', 'task-scheduling', 'integration', 'orchestration'],
      analysis: ['data-analysis', 'pattern-recognition', 'prediction', 'optimization'],
      response: ['incident-handling', 'remediation', 'communication', 'escalation'],
    };
    
    return capabilityMap[type] || ['general-purpose'];
  }

  private generateIncidentTitle(category: string, severity: string): string {
    const titleTemplates: Record<string, string[]> = {
      security: [
        'Suspicious network activity detected',
        'Malware found on endpoint',
        'Unauthorized access attempt',
        'Data exfiltration suspected',
        'Phishing email campaign detected',
      ],
      performance: [
        'High CPU usage on server',
        'Database query timeout',
        'Network latency spike',
        'Memory leak detected',
        'Disk space running low',
      ],
      availability: [
        'Service outage reported',
        'Database connection failure',
        'Load balancer not responding',
        'API endpoint unreachable',
        'Backup system failure',
      ],
      compliance: [
        'Policy violation detected',
        'Audit log anomaly',
        'Unauthorized configuration change',
        'Data retention policy breach',
        'Access control violation',
      ],
    };

    const templates = titleTemplates[category] || ['Generic incident'];
    const title = templates[Math.floor(Math.random() * templates.length)];
    return `[${severity.toUpperCase()}] ${title}`;
  }

  private generateIncidentDescription(category: string): string {
    const descriptions: Record<string, string[]> = {
      security: [
        'Automated security monitoring detected unusual network traffic patterns.',
        'Endpoint protection system identified potential malware activity.',
        'Multiple failed authentication attempts from suspicious IP addresses.',
        'Data loss prevention system flagged potential data exfiltration.',
      ],
      performance: [
        'System monitoring detected performance degradation in critical services.',
        'Database performance metrics exceeded acceptable thresholds.',
        'Network monitoring identified latency issues affecting user experience.',
        'Resource utilization monitoring detected potential bottlenecks.',
      ],
      availability: [
        'Service health checks failed for critical system components.',
        'Automated monitoring detected service unavailability.',
        'Load balancer health checks reporting backend failures.',
        'System redundancy checks identified single points of failure.',
      ],
      compliance: [
        'Compliance monitoring detected policy violations requiring investigation.',
        'Audit trail analysis identified unauthorized system changes.',
        'Data governance checks found potential regulatory compliance issues.',
        'Access control monitoring detected privilege escalation attempts.',
      ],
    };

    const categoryDescriptions = descriptions[category] || ['Generic incident description'];
    return categoryDescriptions[Math.floor(Math.random() * categoryDescriptions.length)];
  }

  private generateIncidentTags(category: string): string[] {
    const tagMap: Record<string, string[]> = {
      security: ['security', 'threat', 'investigation', 'urgent'],
      performance: ['performance', 'optimization', 'monitoring', 'capacity'],
      availability: ['availability', 'outage', 'service', 'critical'],
      compliance: ['compliance', 'audit', 'policy', 'governance'],
    };

    return tagMap[category] || ['general'];
  }

  private generateAffectedSystems(): string[] {
    const systems = ['web-server', 'database', 'api-gateway', 'load-balancer', 'cache', 'storage'];
    const count = Math.floor(Math.random() * 3) + 1;
    const shuffled = systems.sort(() => 0.5 - Math.random());
    return shuffled.slice(0, count);
  }

  private calculateEstimatedImpact(severity: string): string {
    const impactMap: Record<string, string[]> = {
      low: ['Minimal user impact', 'No service disruption', 'Monitoring required'],
      medium: ['Some users affected', 'Degraded performance', 'Workaround available'],
      high: ['Significant user impact', 'Service partially unavailable', 'Immediate attention required'],
      critical: ['All users affected', 'Complete service outage', 'Emergency response activated'],
    };

    const impacts = impactMap[severity] || ['Unknown impact'];
    return impacts[Math.floor(Math.random() * impacts.length)];
  }

  private generateWorkflowName(template: string): string {
    const nameMap: Record<string, string[]> = {
      'incident-response': [
        'Security Incident Response',
        'Critical System Recovery',
        'Emergency Response Protocol',
        'Incident Investigation Workflow',
      ],
      'security-scan': [
        'Vulnerability Assessment',
        'Security Compliance Check',
        'Threat Detection Scan',
        'Security Audit Workflow',
      ],
      backup: [
        'System Backup Process',
        'Data Backup Verification',
        'Disaster Recovery Backup',
        'Automated Backup Workflow',
      ],
      maintenance: [
        'System Maintenance Window',
        'Scheduled Maintenance Task',
        'Preventive Maintenance Check',
        'System Update Workflow',
      ],
    };

    const names = nameMap[template] || ['Generic Workflow'];
    return names[Math.floor(Math.random() * names.length)];
  }

  private generateWorkflowSteps(template: string): string[] {
    const stepsMap: Record<string, string[]> = {
      'incident-response': [
        'Incident Detection',
        'Initial Assessment',
        'Team Notification',
        'Investigation',
        'Containment',
        'Resolution',
        'Post-Incident Review',
      ],
      'security-scan': [
        'Scan Initialization',
        'Target Discovery',
        'Vulnerability Detection',
        'Risk Assessment',
        'Report Generation',
        'Remediation Planning',
      ],
      backup: [
        'Backup Preparation',
        'Data Collection',
        'Compression',
        'Transfer to Storage',
        'Verification',
        'Cleanup',
      ],
      maintenance: [
        'Pre-maintenance Check',
        'Service Shutdown',
        'Maintenance Tasks',
        'Testing',
        'Service Restart',
        'Post-maintenance Verification',
      ],
    };

    return stepsMap[template] || ['Generic Step'];
  }

  private getBaseValueForMetric(metricName: string): number {
    const baseValues: Record<string, number> = {
      'system.cpu.usage': 45,
      'system.memory.usage': 60,
      'system.disk.usage': 70,
      'system.network.in': 500,
      'system.network.out': 300,
      'agents.active.count': 20,
      'agents.response.time': 150,
      'security.threats.detected': 2,
      'security.incidents.active': 5,
      'financial.cost.total': 55000,
      'financial.savings.total': 18000,
      'performance.response.time': 200,
      'performance.throughput': 5000,
    };

    return baseValues[metricName] || 100;
  }

  // Public API methods
  updateConfig(newConfig: Partial<BackgroundDataConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      // Restart services with new config
      this.stop();
      this.initialize();
    }
  }

  getConfig(): BackgroundDataConfig {
    return { ...this.config };
  }

  getVariationPatterns(): DataVariationPattern[] {
    return Array.from(this.variationPatterns.values());
  }

  updateVariationPattern(patternId: string, updates: Partial<DataVariationPattern>): boolean {
    const pattern = this.variationPatterns.get(patternId);
    if (!pattern) return false;

    Object.assign(pattern, updates);
    return true;
  }

  addVariationPattern(pattern: DataVariationPattern): void {
    this.variationPatterns.set(pattern.id, pattern);
  }

  removeVariationPattern(patternId: string): boolean {
    return this.variationPatterns.delete(patternId);
  }

  async repopulateSeedData(): Promise<void> {
    console.log('Repopulating seed data...');
    await this.populateSeedData();
  }

  getStatus(): {
    isInitialized: boolean;
    isRunning: boolean;
    config: BackgroundDataConfig;
    activePatterns: number;
  } {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      config: this.config,
      activePatterns: Array.from(this.variationPatterns.values()).filter(p => p.enabled).length,
    };
  }

  stop(): void {
    if (this.updateTimer) {
      clearInterval(this.updateTimer);
      this.updateTimer = null;
    }

    if (this.variationTimer) {
      clearInterval(this.variationTimer);
      this.variationTimer = null;
    }

    this.isRunning = false;
    console.log('Background data service stopped');
  }

  destroy(): void {
    this.stop();
    this.variationPatterns.clear();
    this.isInitialized = false;
    console.log('Background data service destroyed');
  }
}

// Create and export singleton instance
export const backgroundDataService = new BackgroundDataService();
export default backgroundDataService;