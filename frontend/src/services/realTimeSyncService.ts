import { WebSocketManager, getWebSocketManager, WebSocketMessage } from './websocketManager';
import { store } from '../store';

// Sync event types
export interface SyncEvent {
  entity: string;
  action: 'create' | 'update' | 'delete' | 'bulk_update';
  data: any;
  timestamp: number;
  userId?: string;
  version?: number;
}

// Subscription configuration
export interface SubscriptionConfig {
  entity: string;
  filters?: Record<string, any>;
  realTime: boolean;
  batchSize?: number;
  batchInterval?: number;
}

// Data synchronization manager
export class RealTimeSyncService {
  private wsManager: WebSocketManager;
  private subscriptions = new Map<string, SubscriptionConfig>();
  private syncQueue: SyncEvent[] = [];
  private batchTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(wsManager?: WebSocketManager) {
    this.wsManager = wsManager || getWebSocketManager();
    this.setupEventHandlers();
  }

  // Initialize the sync service
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      await this.wsManager.connect();
      this.isInitialized = true;
      console.log('RealTimeSyncService initialized successfully');
    } catch (error) {
      console.error('Failed to initialize RealTimeSyncService:', error);
      throw error;
    }
  }

  // Subscribe to entity updates
  subscribe(config: SubscriptionConfig): () => void {
    const subscriptionId = this.generateSubscriptionId(config);
    this.subscriptions.set(subscriptionId, config);

    // Send subscription request to server
    this.wsManager.send('subscribe', {
      subscriptionId,
      entity: config.entity,
      filters: config.filters,
      realTime: config.realTime,
    });

    console.log('Subscribed to entity updates:', config);

    // Return unsubscribe function
    return () => {
      this.unsubscribe(subscriptionId);
    };
  }

  // Unsubscribe from entity updates
  unsubscribe(subscriptionId: string): void {
    if (this.subscriptions.has(subscriptionId)) {
      this.subscriptions.delete(subscriptionId);
      this.wsManager.send('unsubscribe', { subscriptionId });
      console.log('Unsubscribed from entity updates:', subscriptionId);
    }
  }

  // Sync local changes to server
  syncToServer(event: SyncEvent): Promise<void> {
    return this.wsManager.send('sync_event', event);
  }

  // Request full sync for entity
  requestFullSync(entity: string, filters?: Record<string, any>): Promise<any[]> {
    return this.wsManager.send('full_sync', { entity, filters }, true);
  }

  // Get sync statistics
  getSyncStats(): any {
    return {
      subscriptions: this.subscriptions.size,
      queuedEvents: this.syncQueue.length,
      wsStats: this.wsManager.getStats(),
    };
  }

  // Private methods
  private setupEventHandlers(): void {
    // Handle incoming sync events
    this.wsManager.subscribe('sync_event', (event: SyncEvent) => {
      this.handleIncomingSyncEvent(event);
    });

    // Handle bulk sync events
    this.wsManager.subscribe('bulk_sync', (events: SyncEvent[]) => {
      events.forEach(event => this.handleIncomingSyncEvent(event));
    });

    // Handle full sync response
    this.wsManager.subscribe('full_sync_response', (data: { entity: string; items: any[] }) => {
      this.handleFullSyncResponse(data);
    });

    // Handle connection state changes
    this.wsManager.on('stateChange', ({ newState }) => {
      if (newState === 'connected') {
        this.reestablishSubscriptions();
      }
    });
  }

  private handleIncomingSyncEvent(event: SyncEvent): void {
    console.log('Received sync event:', event);

    // Dispatch to Redux store based on entity and action
    const actionType = this.getReduxActionType(event.entity, event.action);
    
    if (actionType) {
      store.dispatch({
        type: actionType,
        payload: event.data,
        meta: {
          sync: true,
          timestamp: event.timestamp,
          version: event.version,
        },
      });
    }

    // Emit custom event for components to listen to
    this.emitSyncEvent(event);
  }

  private handleFullSyncResponse(data: { entity: string; items: any[] }): void {
    console.log('Received full sync response:', data);

    // Dispatch bulk update to Redux store
    const actionType = this.getReduxActionType(data.entity, 'bulk_update');
    
    if (actionType) {
      store.dispatch({
        type: actionType,
        payload: data.items,
        meta: {
          sync: true,
          fullSync: true,
          timestamp: Date.now(),
        },
      });
    }
  }

  private getReduxActionType(entity: string, action: string): string | null {
    // Map entity and action to Redux action types
    const actionMap: Record<string, Record<string, string>> = {
      agents: {
        create: 'agents/addAgent',
        update: 'agents/updateAgent',
        delete: 'agents/removeAgent',
        bulk_update: 'agents/setAgents',
      },
      incidents: {
        create: 'incidents/addIncident',
        update: 'incidents/updateIncident',
        delete: 'incidents/removeIncident',
        bulk_update: 'incidents/setIncidents',
      },
      metrics: {
        create: 'metrics/addMetric',
        update: 'metrics/updateMetric',
        delete: 'metrics/removeMetric',
        bulk_update: 'metrics/setMetrics',
      },
      notifications: {
        create: 'notifications/addNotification',
        update: 'notifications/updateNotification',
        delete: 'notifications/removeNotification',
        bulk_update: 'notifications/setNotifications',
      },
    };

    return actionMap[entity]?.[action] || null;
  }

  private emitSyncEvent(event: SyncEvent): void {
    // Create custom event for components to listen to
    if (typeof window !== 'undefined') {
      const customEvent = new CustomEvent('realtime-sync', {
        detail: event,
      });
      window.dispatchEvent(customEvent);
    }
  }

  private reestablishSubscriptions(): void {
    console.log('Reestablishing subscriptions after reconnection');
    
    for (const [subscriptionId, config] of this.subscriptions.entries()) {
      this.wsManager.send('subscribe', {
        subscriptionId,
        entity: config.entity,
        filters: config.filters,
        realTime: config.realTime,
      });
    }
  }

  private generateSubscriptionId(config: SubscriptionConfig): string {
    const configStr = JSON.stringify({
      entity: config.entity,
      filters: config.filters,
    });
    return `sub_${btoa(configStr).replace(/[^a-zA-Z0-9]/g, '')}`;
  }
}

// Entity-specific sync services
export class AgentSyncService {
  private syncService: RealTimeSyncService;

  constructor(syncService: RealTimeSyncService) {
    this.syncService = syncService;
  }

  subscribeToAgents(filters?: Record<string, any>): () => void {
    return this.syncService.subscribe({
      entity: 'agents',
      filters,
      realTime: true,
    });
  }

  syncAgentUpdate(agentId: string, changes: any): Promise<void> {
    return this.syncService.syncToServer({
      entity: 'agents',
      action: 'update',
      data: { id: agentId, ...changes },
      timestamp: Date.now(),
    });
  }

  requestAgentSync(): Promise<any[]> {
    return this.syncService.requestFullSync('agents');
  }
}

export class IncidentSyncService {
  private syncService: RealTimeSyncService;

  constructor(syncService: RealTimeSyncService) {
    this.syncService = syncService;
  }

  subscribeToIncidents(filters?: Record<string, any>): () => void {
    return this.syncService.subscribe({
      entity: 'incidents',
      filters,
      realTime: true,
    });
  }

  syncIncidentUpdate(incidentId: string, changes: any): Promise<void> {
    return this.syncService.syncToServer({
      entity: 'incidents',
      action: 'update',
      data: { id: incidentId, ...changes },
      timestamp: Date.now(),
    });
  }

  requestIncidentSync(): Promise<any[]> {
    return this.syncService.requestFullSync('incidents');
  }
}

export class MetricsSyncService {
  private syncService: RealTimeSyncService;

  constructor(syncService: RealTimeSyncService) {
    this.syncService = syncService;
  }

  subscribeToMetrics(filters?: Record<string, any>): () => void {
    return this.syncService.subscribe({
      entity: 'metrics',
      filters,
      realTime: true,
    });
  }

  syncMetricUpdate(metricId: string, value: any): Promise<void> {
    return this.syncService.syncToServer({
      entity: 'metrics',
      action: 'update',
      data: { id: metricId, value, timestamp: Date.now() },
      timestamp: Date.now(),
    });
  }

  requestMetricsSync(): Promise<any[]> {
    return this.syncService.requestFullSync('metrics');
  }
}

// Singleton instances
let syncServiceInstance: RealTimeSyncService | null = null;
let agentSyncInstance: AgentSyncService | null = null;
let incidentSyncInstance: IncidentSyncService | null = null;
let metricsSyncInstance: MetricsSyncService | null = null;

export function getRealTimeSyncService(): RealTimeSyncService {
  if (!syncServiceInstance) {
    syncServiceInstance = new RealTimeSyncService();
  }
  return syncServiceInstance;
}

export function getAgentSyncService(): AgentSyncService {
  if (!agentSyncInstance) {
    agentSyncInstance = new AgentSyncService(getRealTimeSyncService());
  }
  return agentSyncInstance;
}

export function getIncidentSyncService(): IncidentSyncService {
  if (!incidentSyncInstance) {
    incidentSyncInstance = new IncidentSyncService(getRealTimeSyncService());
  }
  return incidentSyncInstance;
}

export function getMetricsSyncService(): MetricsSyncService {
  if (!metricsSyncInstance) {
    metricsSyncInstance = new MetricsSyncService(getRealTimeSyncService());
  }
  return metricsSyncInstance;
}

export default RealTimeSyncService;