import { demoDataOrchestrator } from './demoDataOrchestrator';
import { dataSimulationService } from './dataSimulationService';
import { metricsAggregationService } from './metricsAggregationService';
import { dataVisualizationEngine } from './dataVisualizationEngine';
import { realTimeDataService } from './realTimeDataService';
import { websocketService } from './websocketService';
import { backgroundDataService } from './backgroundDataService';
import { scenarioTriggerService } from './scenarioTriggerService';
import { currentConfig } from '../config/demoEngineConfig';

export interface DemoDataState {
  isInitialized: boolean;
  isRunning: boolean;
  activeSessions: number;
  totalMetrics: number;
  lastUpdate: string;
  performance: {
    memoryUsage: number;
    cpuUsage: number;
    networkLatency: number;
  };
}

export interface DemoDataExport {
  timestamp: string;
  version: string;
  scenarios: any[];
  sessions: any[];
  metrics: any[];
  configuration: any;
}

class DemoDataIntegrationService {
  private isInitialized = false;
  private isRunning = false;
  private performanceMonitor: NodeJS.Timeout | null = null;
  private dataExportCache: Map<string, DemoDataExport> = new Map();
  private eventListeners: Map<string, Function[]> = new Map();

  constructor() {
    this.initializeEventListeners();
  }

  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      console.log('Initializing demo data integration service...');

      // Initialize core services in order
      await this.initializeCoreServices();
      
      // Set up cross-service integrations
      this.setupServiceIntegrations();
      
      // Start performance monitoring
      this.startPerformanceMonitoring();
      
      // Initialize demo scenarios
      await this.initializeDemoScenarios();
      
      this.isInitialized = true;
      this.isRunning = true;
      
      this.emit('initialized', { timestamp: new Date().toISOString() });
      console.log('Demo data integration service initialized successfully');
    } catch (error) {
      console.error('Failed to initialize demo data integration service:', error);
      throw error;
    }
  }

  private async initializeCoreServices(): Promise<void> {
    // Initialize services in dependency order
    await realTimeDataService.initialize();
    await demoDataOrchestrator.initialize();
    
    // Initialize background data services
    await backgroundDataService.initialize();
    await scenarioTriggerService.initialize();
    
    // Start data simulation
    dataSimulationService.startAllSimulations();
    
    // Initialize visualization engine
    dataVisualizationEngine.setTheme(currentConfig.visualization.theme === 'auto' ? 'default' : currentConfig.visualization.theme);
    dataVisualizationEngine.setAnimationEnabled(currentConfig.visualization.animationsEnabled);
  }

  private setupServiceIntegrations(): void {
    // Connect demo orchestrator events to real-time service
    demoDataOrchestrator.onEvent((event) => {
      this.handleDemoEvent(event);
    });

    // Connect metrics to visualization engine
    this.setupMetricsVisualizationIntegration();
    
    // Connect WebSocket events
    this.setupWebSocketIntegration();
  }

  private handleDemoEvent(event: any): void {
    // Forward demo events to real-time service
    realTimeDataService.broadcastUpdate({
      type: 'demo_event',
      data: event,
      timestamp: new Date().toISOString(),
    });

    // Update metrics based on event type
    switch (event.type) {
      case 'incident_creation':
        metricsAggregationService.addMetric('incidents.created', 1, {
          severity: event.data.severity,
          source: 'demo',
        });
        break;
      case 'workflow_execution':
        metricsAggregationService.addMetric('workflows.executed', 1, {
          status: event.data.status,
          source: 'demo',
        });
        break;
      case 'security_breach':
        metricsAggregationService.addMetric('security.breaches', 1, {
          type: event.data.type,
          severity: event.data.severity,
        });
        break;
    }

    this.emit('demo_event', event);
  }

  private setupMetricsVisualizationIntegration(): void {
    // Set up alerts for threshold breaches
    Object.entries(currentConfig.metrics.alertThresholds).forEach(([metricName, threshold]) => {
      metricsAggregationService.addAlert({
        id: `alert_${metricName}`,
        metricName,
        condition: 'greater_than',
        threshold,
        duration: 5, // 5 minutes
        severity: 'medium',
        enabled: true,
        description: `Alert when ${metricName} exceeds ${threshold}`,
      });
    });

    // Set up alert callbacks
    metricsAggregationService.setAlertCallback('alert_system.cpu.usage', (alert, value) => {
      this.handleMetricAlert('CPU Usage Alert', `CPU usage is ${value}%, exceeding threshold of ${alert.threshold}%`);
    });

    metricsAggregationService.setAlertCallback('alert_system.memory.usage', (alert, value) => {
      this.handleMetricAlert('Memory Usage Alert', `Memory usage is ${value}%, exceeding threshold of ${alert.threshold}%`);
    });
  }

  private setupWebSocketIntegration(): void {
    if (websocketService.isConnected()) {
      // Set up handlers for different message types
      websocketService.onMessage('demo_control', (message) => {
        this.handleWebSocketMessage(message);
      });
      websocketService.onMessage('metrics_request', (message) => {
        this.handleWebSocketMessage(message);
      });
      websocketService.onMessage('scenario_request', (message) => {
        this.handleWebSocketMessage(message);
      });
    }
  }

  private handleWebSocketMessage(message: any): void {
    switch (message.type) {
      case 'demo_control':
        this.handleDemoControl(message.data);
        break;
      case 'metrics_request':
        this.handleMetricsRequest(message.data);
        break;
      case 'scenario_request':
        this.handleScenarioRequest(message.data);
        break;
    }
  }

  private handleDemoControl(data: any): void {
    switch (data.action) {
      case 'start_scenario':
        if (data.scenarioId) {
          demoDataOrchestrator.startSession(data.scenarioId, data.settings);
        }
        break;
      case 'pause_session':
        if (data.sessionId) {
          demoDataOrchestrator.pauseSession(data.sessionId);
        }
        break;
      case 'resume_session':
        if (data.sessionId) {
          demoDataOrchestrator.resumeSession(data.sessionId);
        }
        break;
      case 'stop_session':
        if (data.sessionId) {
          demoDataOrchestrator.stopSession(data.sessionId);
        }
        break;
    }
  }

  private handleMetricsRequest(data: any): void {
    const metrics = metricsAggregationService.queryMetrics({
      metricName: data.metricName,
      startTime: data.startTime,
      endTime: data.endTime,
      interval: data.interval || 'minute',
      aggregation: data.aggregation || 'average',
    });

    if (websocketService.isConnected()) {
      websocketService.send({
        type: 'metrics_response',
        data: {
          requestId: data.requestId,
          metrics,
        },
      });
    }
  }

  private handleScenarioRequest(data: any): void {
    const scenarios = demoDataOrchestrator.getScenarios();
    
    if (websocketService.isConnected()) {
      websocketService.send({
        type: 'scenarios_response',
        data: {
          requestId: data.requestId,
          scenarios,
        },
      });
    }
  }

  private handleMetricAlert(title: string, message: string): void {
    const alert = {
      id: `alert_${Date.now()}`,
      title,
      message,
      severity: 'warning' as const,
      timestamp: new Date().toISOString(),
    };

    // Broadcast alert
    realTimeDataService.broadcastUpdate({
      type: 'metric_alert',
      data: alert,
      timestamp: alert.timestamp,
    });

    this.emit('metric_alert', alert);
  }

  private async initializeDemoScenarios(): Promise<void> {
    // Start a default scenario if configured
    if (currentConfig.scenarios.autoAdvanceEvents) {
      // Start with a simple system monitoring scenario
      const sessionId = demoDataOrchestrator.startSession('infrastructure-optimization', {
        playbackSpeed: currentConfig.scenarios.defaultPlaybackSpeed,
        enableNotifications: true,
        showEventMarkers: currentConfig.scenarios.enableEventMarkers,
      });
      
      console.log(`Started default demo scenario: ${sessionId}`);
    }
  }

  private startPerformanceMonitoring(): void {
    if (!currentConfig.debugging.enablePerformanceMonitoring) return;

    this.performanceMonitor = setInterval(() => {
      const performance = this.getPerformanceMetrics();
      
      // Add performance metrics
      metricsAggregationService.addMetric('demo.performance.memory', performance.memoryUsage);
      metricsAggregationService.addMetric('demo.performance.cpu', performance.cpuUsage);
      metricsAggregationService.addMetric('demo.performance.network', performance.networkLatency);
      
      this.emit('performance_update', performance);
    }, 10000); // Every 10 seconds
  }

  private getPerformanceMetrics() {
    // Simulate performance metrics (in a real implementation, use actual performance APIs)
    return {
      memoryUsage: Math.random() * 100,
      cpuUsage: Math.random() * 100,
      networkLatency: Math.random() * 100 + 10,
    };
  }

  // Public API methods
  getState(): DemoDataState {
    return {
      isInitialized: this.isInitialized,
      isRunning: this.isRunning,
      activeSessions: demoDataOrchestrator.getCurrentSessions().length,
      totalMetrics: metricsAggregationService.getMetricNames().length,
      lastUpdate: new Date().toISOString(),
      performance: this.getPerformanceMetrics(),
    };
  }

  async startDemo(scenarioId?: string): Promise<string> {
    if (!this.isInitialized) {
      await this.initialize();
    }

    const scenarios = demoDataOrchestrator.getScenarios();
    const targetScenario = scenarioId || scenarios[0]?.id;
    
    if (!targetScenario) {
      throw new Error('No scenarios available');
    }

    const sessionId = demoDataOrchestrator.startSession(targetScenario, {
      playbackSpeed: currentConfig.scenarios.defaultPlaybackSpeed,
      enableNotifications: true,
      showEventMarkers: currentConfig.scenarios.enableEventMarkers,
    });

    this.emit('demo_started', { sessionId, scenarioId: targetScenario });
    return sessionId;
  }

  stopDemo(sessionId?: string): boolean {
    if (sessionId) {
      return demoDataOrchestrator.stopSession(sessionId);
    } else {
      // Stop all active sessions
      const sessions = demoDataOrchestrator.getCurrentSessions();
      sessions.forEach(session => {
        demoDataOrchestrator.stopSession(session.id);
      });
      return true;
    }
  }

  pauseDemo(sessionId?: string): boolean {
    if (sessionId) {
      return demoDataOrchestrator.pauseSession(sessionId);
    } else {
      // Pause all active sessions
      const sessions = demoDataOrchestrator.getCurrentSessions();
      sessions.forEach(session => {
        if (session.status === 'running') {
          demoDataOrchestrator.pauseSession(session.id);
        }
      });
      return true;
    }
  }

  resumeDemo(sessionId?: string): boolean {
    if (sessionId) {
      return demoDataOrchestrator.resumeSession(sessionId);
    } else {
      // Resume all paused sessions
      const sessions = demoDataOrchestrator.getCurrentSessions();
      sessions.forEach(session => {
        if (session.status === 'paused') {
          demoDataOrchestrator.resumeSession(session.id);
        }
      });
      return true;
    }
  }

  // Data export/import
  async exportDemoData(includeMetrics = true, includeSessions = true): Promise<DemoDataExport> {
    const exportData: DemoDataExport = {
      timestamp: new Date().toISOString(),
      version: '1.0.0',
      scenarios: demoDataOrchestrator.getScenarios(),
      sessions: includeSessions ? demoDataOrchestrator.getSessions() : [],
      metrics: includeMetrics ? JSON.parse(metricsAggregationService.exportMetrics()) : [],
      configuration: currentConfig,
    };

    // Cache the export
    const exportId = `export_${Date.now()}`;
    this.dataExportCache.set(exportId, exportData);

    return exportData;
  }

  async importDemoData(data: DemoDataExport): Promise<boolean> {
    try {
      // Import scenarios
      data.scenarios.forEach(scenario => {
        demoDataOrchestrator.addScenario(scenario);
      });

      // Import metrics if available
      if (data.metrics && typeof data.metrics === 'string') {
        metricsAggregationService.importMetrics(data.metrics);
      }

      this.emit('data_imported', { timestamp: new Date().toISOString() });
      return true;
    } catch (error) {
      console.error('Failed to import demo data:', error);
      return false;
    }
  }

  // Event system
  private initializeEventListeners(): void {
    this.eventListeners.set('initialized', []);
    this.eventListeners.set('demo_started', []);
    this.eventListeners.set('demo_stopped', []);
    this.eventListeners.set('demo_event', []);
    this.eventListeners.set('metric_alert', []);
    this.eventListeners.set('performance_update', []);
    this.eventListeners.set('data_imported', []);
  }

  on(event: string, callback: Function): void {
    if (!this.eventListeners.has(event)) {
      this.eventListeners.set(event, []);
    }
    this.eventListeners.get(event)!.push(callback);
  }

  off(event: string, callback: Function): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      const index = listeners.indexOf(callback);
      if (index > -1) {
        listeners.splice(index, 1);
      }
    }
  }

  private emit(event: string, data?: any): void {
    const listeners = this.eventListeners.get(event);
    if (listeners) {
      listeners.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in event listener for ${event}:`, error);
        }
      });
    }
  }

  // Utility methods
  getAvailableScenarios() {
    return demoDataOrchestrator.getScenarios();
  }

  getActiveSessions() {
    return demoDataOrchestrator.getCurrentSessions();
  }

  getMetricsSummary() {
    const metricNames = metricsAggregationService.getMetricNames();
    return metricNames.map(name => ({
      name,
      stats: metricsAggregationService.getMetricStats(name),
    }));
  }

  getDashboards() {
    return metricsAggregationService.getDashboards();
  }

  // Cleanup
  destroy(): void {
    if (this.performanceMonitor) {
      clearInterval(this.performanceMonitor);
    }

    // Destroy all services
    demoDataOrchestrator.destroy();
    dataSimulationService.stopAllSimulations();
    metricsAggregationService.destroy();
    backgroundDataService.destroy();
    scenarioTriggerService.destroy();

    this.eventListeners.clear();
    this.dataExportCache.clear();

    this.isInitialized = false;
    this.isRunning = false;

    console.log('Demo data integration service destroyed');
  }
}

// Create and export singleton instance
export const demoDataIntegrationService = new DemoDataIntegrationService();
export default demoDataIntegrationService;