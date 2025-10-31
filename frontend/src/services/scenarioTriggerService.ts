import { demoDataOrchestrator } from './demoDataOrchestrator';
import { backgroundDataService } from './backgroundDataService';
import { metricsAggregationService } from './metricsAggregationService';
import { realTimeDataService } from './realTimeDataService';

export interface ScenarioTrigger {
  id: string;
  name: string;
  description: string;
  enabled: boolean;
  conditions: TriggerCondition[];
  actions: TriggerAction[];
  cooldownPeriod: number; // in milliseconds
  lastTriggered?: string;
  triggerCount: number;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface TriggerCondition {
  type: 'metric_threshold' | 'time_based' | 'event_based' | 'random';
  metricName?: string;
  operator?: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold?: number;
  timePattern?: string; // cron-like pattern
  eventType?: string;
  probability?: number; // for random triggers (0-1)
}

export interface TriggerAction {
  type: 'start_scenario' | 'create_incident' | 'trigger_workflow' | 'send_alert' | 'modify_metric';
  scenarioId?: string;
  incidentData?: any;
  workflowData?: any;
  alertData?: any;
  metricData?: {
    name: string;
    value: number;
    duration?: number;
  };
}

export interface ScenarioTriggerConfig {
  enabled: boolean;
  checkInterval: number;
  maxConcurrentScenarios: number;
  enableRandomTriggers: boolean;
  randomTriggerProbability: number;
}

class ScenarioTriggerService {
  private triggers: Map<string, ScenarioTrigger> = new Map();
  private config: ScenarioTriggerConfig = {
    enabled: true,
    checkInterval: 10000, // 10 seconds
    maxConcurrentScenarios: 3,
    enableRandomTriggers: true,
    randomTriggerProbability: 0.05, // 5% chance per check
  };
  
  private checkTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;
  private isRunning = false;
  private activeTriggers: Set<string> = new Set();

  constructor() {
    this.initializeDefaultTriggers();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing scenario trigger service...');

      if (this.config.enabled) {
        this.startTriggerChecking();
      }

      this.isInitialized = true;
      this.isRunning = true;
      console.log('Scenario trigger service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize scenario trigger service:', error);
      throw error;
    }
  }

  private initializeDefaultTriggers(): void {
    const defaultTriggers: ScenarioTrigger[] = [
      {
        id: 'high_cpu_incident',
        name: 'High CPU Usage Incident',
        description: 'Triggers security incident when CPU usage exceeds 90%',
        enabled: true,
        conditions: [
          {
            type: 'metric_threshold',
            metricName: 'system.cpu.usage',
            operator: 'greater_than',
            threshold: 90,
          },
        ],
        actions: [
          {
            type: 'create_incident',
            incidentData: {
              title: 'High CPU Usage Detected',
              severity: 'high',
              category: 'performance',
              description: 'System CPU usage has exceeded critical threshold',
            },
          },
          {
            type: 'trigger_workflow',
            workflowData: {
              template: 'performance-investigation',
              name: 'CPU Usage Investigation',
              priority: 'high',
            },
          },
        ],
        cooldownPeriod: 300000, // 5 minutes
        triggerCount: 0,
        priority: 'high',
      },
      {
        id: 'security_threat_scenario',
        name: 'Security Threat Scenario',
        description: 'Triggers cyber attack scenario during business hours',
        enabled: true,
        conditions: [
          {
            type: 'time_based',
            timePattern: '0 9-17 * * 1-5', // Business hours, weekdays
          },
          {
            type: 'random',
            probability: 0.1, // 10% chance when time condition is met
          },
        ],
        actions: [
          {
            type: 'start_scenario',
            scenarioId: 'cyber-attack-response',
          },
        ],
        cooldownPeriod: 3600000, // 1 hour
        triggerCount: 0,
        priority: 'critical',
      },
      {
        id: 'cost_optimization_trigger',
        name: 'Cost Optimization Trigger',
        description: 'Triggers cost optimization scenario when costs spike',
        enabled: true,
        conditions: [
          {
            type: 'metric_threshold',
            metricName: 'financial.cost.total',
            operator: 'greater_than',
            threshold: 70000,
          },
        ],
        actions: [
          {
            type: 'start_scenario',
            scenarioId: 'infrastructure-optimization',
          },
          {
            type: 'send_alert',
            alertData: {
              title: 'Cost Threshold Exceeded',
              message: 'Monthly costs have exceeded the defined threshold',
              severity: 'warning',
              category: 'financial',
            },
          },
        ],
        cooldownPeriod: 1800000, // 30 minutes
        triggerCount: 0,
        priority: 'medium',
      },
      {
        id: 'multi_agent_coordination',
        name: 'Multi-Agent Coordination Trigger',
        description: 'Triggers multi-agent scenario when multiple incidents are active',
        enabled: true,
        conditions: [
          {
            type: 'metric_threshold',
            metricName: 'security.incidents.active',
            operator: 'greater_than',
            threshold: 3,
          },
        ],
        actions: [
          {
            type: 'start_scenario',
            scenarioId: 'multi-agent-coordination',
          },
        ],
        cooldownPeriod: 2700000, // 45 minutes
        triggerCount: 0,
        priority: 'high',
      },
      {
        id: 'random_maintenance_workflow',
        name: 'Random Maintenance Workflow',
        description: 'Randomly triggers maintenance workflows',
        enabled: true,
        conditions: [
          {
            type: 'random',
            probability: 0.02, // 2% chance per check
          },
        ],
        actions: [
          {
            type: 'trigger_workflow',
            workflowData: {
              template: 'maintenance',
              name: 'Scheduled System Maintenance',
              priority: 'low',
            },
          },
        ],
        cooldownPeriod: 1800000, // 30 minutes
        triggerCount: 0,
        priority: 'low',
      },
      {
        id: 'performance_degradation',
        name: 'Performance Degradation Response',
        description: 'Triggers response when performance metrics degrade',
        enabled: true,
        conditions: [
          {
            type: 'metric_threshold',
            metricName: 'performance.response.time',
            operator: 'greater_than',
            threshold: 1000,
          },
        ],
        actions: [
          {
            type: 'create_incident',
            incidentData: {
              title: 'Performance Degradation Detected',
              severity: 'medium',
              category: 'performance',
              description: 'System response time has exceeded acceptable limits',
            },
          },
          {
            type: 'modify_metric',
            metricData: {
              name: 'system.cpu.usage',
              value: 85,
              duration: 300000, // 5 minutes
            },
          },
        ],
        cooldownPeriod: 600000, // 10 minutes
        triggerCount: 0,
        priority: 'medium',
      },
    ];

    defaultTriggers.forEach(trigger => {
      this.triggers.set(trigger.id, trigger);
    });

    console.log(`Initialized ${defaultTriggers.length} default triggers`);
  }

  private startTriggerChecking(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
    }

    this.checkTimer = setInterval(() => {
      this.checkTriggers();
    }, this.config.checkInterval);

    console.log(`Started trigger checking with ${this.config.checkInterval}ms interval`);
  }

  private async checkTriggers(): Promise<void> {
    const enabledTriggers = Array.from(this.triggers.values()).filter(t => t.enabled);
    
    for (const trigger of enabledTriggers) {
      try {
        if (await this.shouldTrigger(trigger)) {
          await this.executeTrigger(trigger);
        }
      } catch (error) {
        console.error(`Error checking trigger ${trigger.id}:`, error);
      }
    }
  }

  private async shouldTrigger(trigger: ScenarioTrigger): Promise<boolean> {
    // Check cooldown period
    if (trigger.lastTriggered) {
      const timeSinceLastTrigger = Date.now() - new Date(trigger.lastTriggered).getTime();
      if (timeSinceLastTrigger < trigger.cooldownPeriod) {
        return false;
      }
    }

    // Check if we're at max concurrent scenarios
    const currentSessions = demoDataOrchestrator.getCurrentSessions();
    if (currentSessions.length >= this.config.maxConcurrentScenarios) {
      return false;
    }

    // Check all conditions
    for (const condition of trigger.conditions) {
      if (!(await this.checkCondition(condition))) {
        return false;
      }
    }

    return true;
  }

  private async checkCondition(condition: TriggerCondition): Promise<boolean> {
    switch (condition.type) {
      case 'metric_threshold':
        return this.checkMetricThreshold(condition);
      
      case 'time_based':
        return this.checkTimePattern(condition);
      
      case 'event_based':
        return this.checkEventCondition(condition);
      
      case 'random':
        return Math.random() < (condition.probability || 0.1);
      
      default:
        return false;
    }
  }

  private checkMetricThreshold(condition: TriggerCondition): boolean {
    if (!condition.metricName || !condition.operator || condition.threshold === undefined) {
      return false;
    }

    const metricStats = metricsAggregationService.getMetricStats(condition.metricName);
    if (!metricStats.latestValue) {
      return false;
    }

    const value = metricStats.latestValue;
    const threshold = condition.threshold;

    switch (condition.operator) {
      case 'greater_than':
        return value > threshold;
      case 'less_than':
        return value < threshold;
      case 'equals':
        return Math.abs(value - threshold) < 0.01;
      case 'not_equals':
        return Math.abs(value - threshold) >= 0.01;
      default:
        return false;
    }
  }

  private checkTimePattern(condition: TriggerCondition): boolean {
    if (!condition.timePattern) return false;

    // Simple time pattern checking (in a real implementation, use a cron library)
    const now = new Date();
    const hour = now.getHours();
    const dayOfWeek = now.getDay(); // 0 = Sunday, 1 = Monday, etc.
    
    // Parse simple pattern like "0 9-17 * * 1-5"
    const parts = condition.timePattern.split(' ');
    if (parts.length >= 5) {
      const hourPattern = parts[1];
      const dayPattern = parts[4];
      
      // Check hour range (e.g., "9-17")
      if (hourPattern.includes('-')) {
        const [startHour, endHour] = hourPattern.split('-').map(Number);
        if (hour < startHour || hour > endHour) {
          return false;
        }
      }
      
      // Check day range (e.g., "1-5" for weekdays)
      if (dayPattern.includes('-')) {
        const [startDay, endDay] = dayPattern.split('-').map(Number);
        if (dayOfWeek < startDay || dayOfWeek > endDay) {
          return false;
        }
      }
    }

    return true;
  }

  private checkEventCondition(_condition: TriggerCondition): boolean {
    // In a real implementation, this would check for specific events
    // For now, we'll use a simple random check
    return Math.random() < 0.1;
  }

  private async executeTrigger(trigger: ScenarioTrigger): Promise<void> {
    console.log(`Executing trigger: ${trigger.name}`);
    
    this.activeTriggers.add(trigger.id);
    trigger.lastTriggered = new Date().toISOString();
    trigger.triggerCount++;

    try {
      for (const action of trigger.actions) {
        await this.executeAction(action, trigger);
      }
    } catch (error) {
      console.error(`Error executing trigger ${trigger.id}:`, error);
    } finally {
      this.activeTriggers.delete(trigger.id);
    }
  }

  private async executeAction(action: TriggerAction, trigger: ScenarioTrigger): Promise<void> {
    switch (action.type) {
      case 'start_scenario':
        if (action.scenarioId) {
          const sessionId = demoDataOrchestrator.startSession(action.scenarioId, {
            playbackSpeed: 1.0,
            enableNotifications: true,
            showEventMarkers: true,
          });
          console.log(`Started scenario ${action.scenarioId} with session ${sessionId}`);
        }
        break;

      case 'create_incident':
        if (action.incidentData) {
          const incident = {
            id: `incident_${Date.now()}`,
            ...action.incidentData,
            createdAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            triggeredBy: trigger.id,
          };
          realTimeDataService.simulateIncidentUpdate(incident);
          console.log(`Created incident: ${incident.title}`);
        }
        break;

      case 'trigger_workflow':
        if (action.workflowData) {
          const workflow = {
            id: `workflow_${Date.now()}`,
            ...action.workflowData,
            status: 'running',
            progress: 0,
            startedAt: new Date().toISOString(),
            updatedAt: new Date().toISOString(),
            triggeredBy: trigger.id,
          };
          realTimeDataService.simulateWorkflowUpdate(workflow);
          console.log(`Triggered workflow: ${workflow.name}`);
        }
        break;

      case 'send_alert':
        if (action.alertData) {
          const alert = {
            id: `alert_${Date.now()}`,
            ...action.alertData,
            timestamp: new Date().toISOString(),
            triggeredBy: trigger.id,
          };
          realTimeDataService.broadcastUpdate({
            type: 'system_alert',
            data: alert,
            timestamp: alert.timestamp,
          });
          console.log(`Sent alert: ${alert.title}`);
        }
        break;

      case 'modify_metric':
        if (action.metricData) {
          const { name, value, duration } = action.metricData;
          metricsAggregationService.addMetric(name, value, {
            source: 'trigger_action',
            triggerId: trigger.id,
          });
          
          // If duration is specified, schedule a reset
          if (duration) {
            setTimeout(() => {
              const baseValue = this.getBaseValueForMetric(name);
              metricsAggregationService.addMetric(name, baseValue, {
                source: 'trigger_reset',
                triggerId: trigger.id,
              });
            }, duration);
          }
          
          console.log(`Modified metric ${name} to ${value}`);
        }
        break;

      default:
        console.warn(`Unknown action type: ${action.type}`);
    }
  }

  private getBaseValueForMetric(metricName: string): number {
    // This should match the base values from backgroundDataService
    const baseValues: Record<string, number> = {
      'system.cpu.usage': 45,
      'system.memory.usage': 60,
      'system.disk.usage': 70,
      'performance.response.time': 200,
      'financial.cost.total': 55000,
    };

    return baseValues[metricName] || 50;
  }

  // Public API methods
  getTriggers(): ScenarioTrigger[] {
    return Array.from(this.triggers.values());
  }

  getTrigger(triggerId: string): ScenarioTrigger | undefined {
    return this.triggers.get(triggerId);
  }

  addTrigger(trigger: ScenarioTrigger): void {
    this.triggers.set(trigger.id, trigger);
    console.log(`Added trigger: ${trigger.name}`);
  }

  updateTrigger(triggerId: string, updates: Partial<ScenarioTrigger>): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    Object.assign(trigger, updates);
    console.log(`Updated trigger: ${trigger.name}`);
    return true;
  }

  removeTrigger(triggerId: string): boolean {
    const removed = this.triggers.delete(triggerId);
    if (removed) {
      console.log(`Removed trigger: ${triggerId}`);
    }
    return removed;
  }

  enableTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    trigger.enabled = true;
    console.log(`Enabled trigger: ${trigger.name}`);
    return true;
  }

  disableTrigger(triggerId: string): boolean {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    trigger.enabled = false;
    console.log(`Disabled trigger: ${trigger.name}`);
    return true;
  }

  getActiveTriggers(): string[] {
    return Array.from(this.activeTriggers);
  }

  getTriggerStats(): {
    total: number;
    enabled: number;
    active: number;
    totalTriggerCount: number;
  } {
    const triggers = Array.from(this.triggers.values());
    return {
      total: triggers.length,
      enabled: triggers.filter(t => t.enabled).length,
      active: this.activeTriggers.size,
      totalTriggerCount: triggers.reduce((sum, t) => sum + t.triggerCount, 0),
    };
  }

  updateConfig(newConfig: Partial<ScenarioTriggerConfig>): void {
    this.config = { ...this.config, ...newConfig };
    
    if (this.isRunning) {
      // Restart with new config
      this.stop();
      this.initialize();
    }
  }

  getConfig(): ScenarioTriggerConfig {
    return { ...this.config };
  }

  async manualTrigger(triggerId: string): Promise<boolean> {
    const trigger = this.triggers.get(triggerId);
    if (!trigger) return false;

    try {
      await this.executeTrigger(trigger);
      console.log(`Manually triggered: ${trigger.name}`);
      return true;
    } catch (error) {
      console.error(`Failed to manually trigger ${triggerId}:`, error);
      return false;
    }
  }

  getStatus() {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      config: this.config,
      stats: this.getTriggerStats(),
    };
  }

  stop(): void {
    if (this.checkTimer) {
      clearInterval(this.checkTimer);
      this.checkTimer = null;
    }

    this.isRunning = false;
    console.log('Scenario trigger service stopped');
  }

  destroy(): void {
    this.stop();
    this.triggers.clear();
    this.activeTriggers.clear();
    this.isInitialized = false;
    console.log('Scenario trigger service destroyed');
  }
}

// Create and export singleton instance
export const scenarioTriggerService = new ScenarioTriggerService();
export default scenarioTriggerService;