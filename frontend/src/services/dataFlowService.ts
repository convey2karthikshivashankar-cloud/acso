import { apiService, RealTimeSyncService } from './apiIntegrationService';
import { store } from '../store';

interface DataFlowConfig {
  enableRealTime: boolean;
  syncInterval: number;
  batchSize: number;
  enableOptimisticUpdates: boolean;
}

interface SyncOperation {
  id: string;
  type: 'create' | 'update' | 'delete';
  entity: string;
  data: any;
  timestamp: number;
  status: 'pending' | 'syncing' | 'completed' | 'failed';
  retryCount: number;
}

export class DataFlowService {
  private static instance: DataFlowService;
  private config: DataFlowConfig;
  private realTimeSync: RealTimeSyncService;
  private pendingOperations: Map<string, SyncOperation> = new Map();
  private syncQueue: SyncOperation[] = [];
  private isSyncing = false;

  private constructor() {
    this.config = {
      enableRealTime: true,
      syncInterval: 30000, // 30 seconds
      batchSize: 10,
      enableOptimisticUpdates: true
    };

    const wsUrl = process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws';
    this.realTimeSync = new RealTimeSyncService(wsUrl);
    
    this.initializeRealTimeSync();
    this.startPeriodicSync();
  }

  static getInstance(): DataFlowService {
    if (!DataFlowService.instance) {
      DataFlowService.instance = new DataFlowService();
    }
    return DataFlowService.instance;
  }

  private async initializeRealTimeSync(): Promise<void> {
    if (!this.config.enableRealTime) return;

    try {
      await this.realTimeSync.connect();
      
      // Subscribe to data updates
      this.realTimeSync.subscribe('agents', (data) => {
        store.dispatch({ type: 'agents/updateFromRealTime', payload: data });
      });

      this.realTimeSync.subscribe('incidents', (data) => {
        store.dispatch({ type: 'incidents/updateFromRealTime', payload: data });
      });

      this.realTimeSync.subscribe('financial', (data) => {
        store.dispatch({ type: 'financial/updateFromRealTime', payload: data });
      });

      this.realTimeSync.subscribe('workflows', (data) => {
        store.dispatch({ type: 'workflows/updateFromRealTime', payload: data });
      });

    } catch (error) {
      console.error('Failed to initialize real-time sync:', error);
    }
  }

  // Agent data flow
  async fetchAgents(filters?: any): Promise<any[]> {
    try {
      const response = await apiService.get('/api/agents', {
        cache: true,
        cacheTTL: 2 * 60 * 1000 // 2 minutes
      });
      
      store.dispatch({ type: 'agents/setAgents', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch agents:', error);
      throw error;
    }
  }

  async updateAgent(agentId: string, data: any): Promise<any> {
    const operation: SyncOperation = {
      id: `agent-${agentId}-${Date.now()}`,
      type: 'update',
      entity: 'agent',
      data: { id: agentId, ...data },
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    // Optimistic update
    if (this.config.enableOptimisticUpdates) {
      store.dispatch({ 
        type: 'agents/updateAgent', 
        payload: { id: agentId, ...data } 
      });
    }

    return this.queueOperation(operation);
  }

  // Incident data flow
  async fetchIncidents(filters?: any): Promise<any[]> {
    try {
      const response = await apiService.get('/api/incidents', {
        cache: true,
        cacheTTL: 1 * 60 * 1000 // 1 minute
      });
      
      store.dispatch({ type: 'incidents/setIncidents', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch incidents:', error);
      throw error;
    }
  }

  async createIncident(data: any): Promise<any> {
    const operation: SyncOperation = {
      id: `incident-create-${Date.now()}`,
      type: 'create',
      entity: 'incident',
      data,
      timestamp: Date.now(),
      status: 'pending',
      retryCount: 0
    };

    // Optimistic update
    if (this.config.enableOptimisticUpdates) {
      const tempId = `temp-${Date.now()}`;
      store.dispatch({ 
        type: 'incidents/addIncident', 
        payload: { id: tempId, ...data, status: 'creating' } 
      });
    }

    return this.queueOperation(operation);
  }

  // Financial data flow
  async fetchFinancialData(timeRange?: string): Promise<any> {
    try {
      const response = await apiService.get(`/api/financial/dashboard`, {
        cache: true,
        cacheTTL: 5 * 60 * 1000 // 5 minutes
      });
      
      store.dispatch({ type: 'financial/setDashboardData', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch financial data:', error);
      throw error;
    }
  }

  async calculateROI(scenario: any): Promise<any> {
    try {
      const response = await apiService.post('/api/financial/roi/calculate', scenario);
      return response.data;
    } catch (error) {
      console.error('Failed to calculate ROI:', error);
      throw error;
    }
  }

  // Workflow data flow
  async fetchWorkflows(): Promise<any[]> {
    try {
      const response = await apiService.get('/api/workflows', {
        cache: true,
        cacheTTL: 3 * 60 * 1000 // 3 minutes
      });
      
      store.dispatch({ type: 'workflows/setWorkflows', payload: response.data });
      return response.data;
    } catch (error) {
      console.error('Failed to fetch workflows:', error);
      throw error;
    }
  }

  async executeWorkflow(workflowId: string, parameters?: any): Promise<any> {
    try {
      const response = await apiService.post(`/api/workflows/${workflowId}/execute`, parameters);
      
      // Update workflow status
      store.dispatch({ 
        type: 'workflows/updateWorkflowStatus', 
        payload: { id: workflowId, status: 'running', executionId: response.data.executionId } 
      });
      
      return response.data;
    } catch (error) {
      console.error('Failed to execute workflow:', error);
      throw error;
    }
  }

  // Operation queue management
  private async queueOperation(operation: SyncOperation): Promise<any> {
    this.pendingOperations.set(operation.id, operation);
    this.syncQueue.push(operation);
    
    if (!this.isSyncing) {
      return this.processSyncQueue();
    }
    
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const op = this.pendingOperations.get(operation.id);
        if (op) {
          if (op.status === 'completed') {
            resolve(op.data);
          } else if (op.status === 'failed') {
            reject(new Error('Operation failed'));
          } else {
            setTimeout(checkStatus, 100);
          }
        }
      };
      checkStatus();
    });
  }

  private async processSyncQueue(): Promise<void> {
    if (this.isSyncing || this.syncQueue.length === 0) return;

    this.isSyncing = true;

    try {
      const batch = this.syncQueue.splice(0, this.config.batchSize);
      
      for (const operation of batch) {
        await this.executeOperation(operation);
      }
    } finally {
      this.isSyncing = false;
      
      // Process remaining operations
      if (this.syncQueue.length > 0) {
        setTimeout(() => this.processSyncQueue(), 100);
      }
    }
  }

  private async executeOperation(operation: SyncOperation): Promise<void> {
    operation.status = 'syncing';
    
    try {
      let response;
      const endpoint = this.getEndpointForEntity(operation.entity);
      
      switch (operation.type) {
        case 'create':
          response = await apiService.post(endpoint, operation.data);
          break;
        case 'update':
          response = await apiService.put(`${endpoint}/${operation.data.id}`, operation.data);
          break;
        case 'delete':
          response = await apiService.delete(`${endpoint}/${operation.data.id}`);
          break;
      }
      
      operation.status = 'completed';
      operation.data = response?.data || operation.data;
      
      // Update store with server response
      this.updateStoreFromOperation(operation);
      
    } catch (error) {
      operation.status = 'failed';
      operation.retryCount++;
      
      // Retry logic
      if (operation.retryCount < 3) {
        operation.status = 'pending';
        this.syncQueue.push(operation);
      } else {
        // Revert optimistic update
        this.revertOptimisticUpdate(operation);
      }
      
      console.error('Operation failed:', error);
    }
  }

  private getEndpointForEntity(entity: string): string {
    const endpoints = {
      agent: '/api/agents',
      incident: '/api/incidents',
      workflow: '/api/workflows',
      financial: '/api/financial'
    };
    return endpoints[entity as keyof typeof endpoints] || `/api/${entity}s`;
  }

  private updateStoreFromOperation(operation: SyncOperation): void {
    switch (operation.entity) {
      case 'agent':
        if (operation.type === 'update') {
          store.dispatch({ type: 'agents/updateAgent', payload: operation.data });
        }
        break;
      case 'incident':
        if (operation.type === 'create') {
          store.dispatch({ type: 'incidents/addIncident', payload: operation.data });
        }
        break;
      // Add other entities as needed
    }
  }

  private revertOptimisticUpdate(operation: SyncOperation): void {
    switch (operation.entity) {
      case 'agent':
        store.dispatch({ type: 'agents/revertUpdate', payload: operation.data.id });
        break;
      case 'incident':
        if (operation.type === 'create') {
          store.dispatch({ type: 'incidents/removeIncident', payload: operation.data.id });
        }
        break;
      // Add other entities as needed
    }
  }

  private startPeriodicSync(): void {
    setInterval(() => {
      this.syncPendingOperations();
    }, this.config.syncInterval);
  }

  private async syncPendingOperations(): Promise<void> {
    const pendingOps = Array.from(this.pendingOperations.values())
      .filter(op => op.status === 'failed' && op.retryCount < 3);
    
    for (const operation of pendingOps) {
      operation.status = 'pending';
      this.syncQueue.push(operation);
    }
    
    if (pendingOps.length > 0 && !this.isSyncing) {
      this.processSyncQueue();
    }
  }

  // Health check and monitoring
  async checkDataFlowHealth(): Promise<{
    apiHealth: boolean;
    realTimeHealth: boolean;
    pendingOperations: number;
    failedOperations: number;
  }> {
    const apiHealth = await apiService.healthCheck();
    const realTimeHealth = this.realTimeSync.getConnectionStatus();
    
    const pendingOps = Array.from(this.pendingOperations.values());
    const pendingCount = pendingOps.filter(op => op.status === 'pending' || op.status === 'syncing').length;
    const failedCount = pendingOps.filter(op => op.status === 'failed').length;
    
    return {
      apiHealth,
      realTimeHealth,
      pendingOperations: pendingCount,
      failedOperations: failedCount
    };
  }

  // Configuration
  updateConfig(newConfig: Partial<DataFlowConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }

  // Cleanup
  destroy(): void {
    this.realTimeSync.disconnect();
    this.pendingOperations.clear();
    this.syncQueue = [];
  }
}

// Export singleton instance
export const dataFlowService = DataFlowService.getInstance();