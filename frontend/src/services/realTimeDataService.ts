import { websocketService, WebSocketMessage } from './websocketService';
import { store } from '../store';

export interface RealTimeDataSubscription {
  id: string;
  topic: string;
  filters?: Record<string, any>;
  callback: (data: any) => void;
  errorCallback?: (error: Error) => void;
  active: boolean;
  lastUpdate?: Date;
  updateCount: number;
}

export interface DataSyncOptions {
  enableBatching?: boolean;
  batchSize?: number;
  batchTimeout?: number;
  enableCompression?: boolean;
  enableDelta?: boolean;
  retryOnError?: boolean;
  maxRetries?: number;
}

export interface RealTimeMetrics {
  totalSubscriptions: number;
  activeSubscriptions: number;
  messagesReceived: number;
  messagesPerSecond: number;
  averageLatency: number;
  errorCount: number;
  lastError?: string;
  connectionUptime: number;
}

class RealTimeDataService {
  private subscriptions: Map<string, RealTimeDataSubscription> = new Map();
  private messageQueue: WebSocketMessage[] = [];
  private batchTimeout: NodeJS.Timeout | null = null;
  private metrics: RealTimeMetrics = {
    totalSubscriptions: 0,
    activeSubscriptions: 0,
    messagesReceived: 0,
    messagesPerSecond: 0,
    averageLatency: 0,
    errorCount: 0,
    connectionUptime: 0,
  };
  private latencyMeasurements: number[] = [];
  private messageTimestamps: number[] = [];
  private connectionStartTime: number = 0;
  private metricsInterval: NodeJS.Timeout | null = null;

  private defaultOptions: DataSyncOptions = {
    enableBatching: true,
    batchSize: 10,
    batchTimeout: 100,
    enableCompression: false,
    enableDelta: true,
    retryOnError: true,
    maxRetries: 3,
  };

  constructor() {
    this.initializeWebSocketHandlers();
    this.startMetricsCollection();
  }

  private initializeWebSocketHandlers(): void {
    // Handle connection events
    websocketService.onConnection((connected) => {
      if (connected) {
        this.connectionStartTime = Date.now();
        this.reactivateSubscriptions();
      } else {
        this.deactivateAllSubscriptions();
      }
    });

    // Handle real-time data messages
    websocketService.onMessage('data_update', this.handleDataUpdate.bind(this));
    websocketService.onMessage('data_batch', this.handleDataBatch.bind(this));
    websocketService.onMessage('data_delta', this.handleDataDelta.bind(this));
    websocketService.onMessage('subscription_error', this.handleSubscriptionError.bind(this));
    websocketService.onMessage('subscription_confirmed', this.handleSubscriptionConfirmed.bind(this));
  }

  private startMetricsCollection(): void {
    this.metricsInterval = setInterval(() => {
      this.updateMetrics();
    }, 1000);
  }

  private updateMetrics(): void {
    const now = Date.now();
    
    // Calculate messages per second
    this.messageTimestamps = this.messageTimestamps.filter(
      timestamp => now - timestamp < 1000
    );
    this.metrics.messagesPerSecond = this.messageTimestamps.length;

    // Calculate average latency
    if (this.latencyMeasurements.length > 0) {
      this.metrics.averageLatency = 
        this.latencyMeasurements.reduce((sum, latency) => sum + latency, 0) / 
        this.latencyMeasurements.length;
      
      // Keep only recent measurements
      if (this.latencyMeasurements.length > 100) {
        this.latencyMeasurements = this.latencyMeasurements.slice(-50);
      }
    }

    // Update connection uptime
    if (this.connectionStartTime > 0) {
      this.metrics.connectionUptime = now - this.connectionStartTime;
    }

    // Update subscription counts
    this.metrics.totalSubscriptions = this.subscriptions.size;
    this.metrics.activeSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.active).length;
  }

  // Public API methods

  subscribe(
    topic: string,
    callback: (data: any) => void,
    options?: {
      filters?: Record<string, any>;
      errorCallback?: (error: Error) => void;
      id?: string;
    }
  ): string {
    const subscriptionId = options?.id || `${topic}_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    const subscription: RealTimeDataSubscription = {
      id: subscriptionId,
      topic,
      filters: options?.filters,
      callback,
      errorCallback: options?.errorCallback,
      active: false,
      updateCount: 0,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Subscribe via WebSocket if connected
    if (websocketService.isConnected()) {
      this.activateSubscription(subscriptionId);
    }

    return subscriptionId;
  }

  unsubscribe(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    // Unsubscribe via WebSocket if active
    if (subscription.active) {
      websocketService.unsubscribe(subscription.topic);
    }

    this.subscriptions.delete(subscriptionId);
    return true;
  }

  unsubscribeFromTopic(topic: string): number {
    let count = 0;
    for (const [id, subscription] of this.subscriptions.entries()) {
      if (subscription.topic === topic) {
        this.unsubscribe(id);
        count++;
      }
    }
    return count;
  }

  updateSubscriptionFilters(subscriptionId: string, filters: Record<string, any>): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return false;
    }

    subscription.filters = filters;

    // Resubscribe with new filters if active
    if (subscription.active) {
      this.deactivateSubscription(subscriptionId);
      this.activateSubscription(subscriptionId);
    }

    return true;
  }

  pauseSubscription(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || !subscription.active) {
      return false;
    }

    this.deactivateSubscription(subscriptionId);
    return true;
  }

  resumeSubscription(subscriptionId: string): boolean {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription || subscription.active) {
      return false;
    }

    if (websocketService.isConnected()) {
      this.activateSubscription(subscriptionId);
      return true;
    }

    return false;
  }

  // Batch operations
  subscribeToMultiple(
    subscriptions: Array<{
      topic: string;
      callback: (data: any) => void;
      filters?: Record<string, any>;
      errorCallback?: (error: Error) => void;
    }>
  ): string[] {
    return subscriptions.map(sub => 
      this.subscribe(sub.topic, sub.callback, {
        filters: sub.filters,
        errorCallback: sub.errorCallback,
      })
    );
  }

  unsubscribeMultiple(subscriptionIds: string[]): number {
    let count = 0;
    subscriptionIds.forEach(id => {
      if (this.unsubscribe(id)) {
        count++;
      }
    });
    return count;
  }

  // Data publishing
  publishData(topic: string, data: any, options?: {
    target?: string;
    broadcast?: boolean;
    persistent?: boolean;
  }): boolean {
    return websocketService.send({
      type: 'publish_data',
      data: {
        topic,
        payload: data,
        target: options?.target,
        broadcast: options?.broadcast ?? true,
        persistent: options?.persistent ?? false,
      },
    });
  }

  // Request-response pattern
  requestData(
    topic: string,
    query?: Record<string, any>,
    timeout: number = 5000
  ): Promise<any> {
    return new Promise((resolve, reject) => {
      const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const unsubscribe = websocketService.onMessage('data_response', (message) => {
        if (message.data.request_id === requestId) {
          unsubscribe();
          clearTimeout(timeoutHandle);
          
          if (message.data.error) {
            reject(new Error(message.data.error));
          } else {
            resolve(message.data.payload);
          }
        }
      });

      const timeoutHandle = setTimeout(() => {
        unsubscribe();
        reject(new Error('Request timeout'));
      }, timeout);

      websocketService.send({
        type: 'data_request',
        data: {
          topic,
          query: query || {},
        },
        request_id: requestId,
      });
    });
  }

  // Private methods

  private activateSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    websocketService.subscribe(
      subscription.topic,
      subscription.filters,
      [] // permissions - could be added based on user roles
    );

    subscription.active = true;
  }

  private deactivateSubscription(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (!subscription) {
      return;
    }

    websocketService.unsubscribe(subscription.topic);
    subscription.active = false;
  }

  private reactivateSubscriptions(): void {
    for (const subscriptionId of this.subscriptions.keys()) {
      this.activateSubscription(subscriptionId);
    }
  }

  private deactivateAllSubscriptions(): void {
    for (const subscription of this.subscriptions.values()) {
      subscription.active = false;
    }
  }

  // Message handlers

  private handleDataUpdate(message: WebSocketMessage): void {
    const { topic, payload, timestamp } = message.data;
    
    this.recordMessageReceived(timestamp);
    
    // Find subscriptions for this topic
    for (const subscription of this.subscriptions.values()) {
      if (subscription.topic === topic && subscription.active) {
        try {
          subscription.callback(payload);
          subscription.updateCount++;
          subscription.lastUpdate = new Date();
        } catch (error) {
          console.error(`Error in subscription callback for topic ${topic}:`, error);
          this.metrics.errorCount++;
          
          if (subscription.errorCallback) {
            subscription.errorCallback(error as Error);
          }
        }
      }
    }
  }

  private handleDataBatch(message: WebSocketMessage): void {
    const { updates } = message.data;
    
    if (Array.isArray(updates)) {
      updates.forEach(update => {
        this.handleDataUpdate({
          type: 'data_update',
          data: update,
        });
      });
    }
  }

  private handleDataDelta(message: WebSocketMessage): void {
    const { topic, delta, timestamp } = message.data;
    
    this.recordMessageReceived(timestamp);
    
    // Apply delta to existing data
    // This would require maintaining state, which could be added based on needs
    console.log('Delta update received for topic:', topic, delta);
  }

  private handleSubscriptionError(message: WebSocketMessage): void {
    const { topic, error } = message.data;
    
    this.metrics.errorCount++;
    this.metrics.lastError = error;
    
    // Notify relevant subscriptions
    for (const subscription of this.subscriptions.values()) {
      if (subscription.topic === topic && subscription.errorCallback) {
        subscription.errorCallback(new Error(error));
      }
    }
  }

  private handleSubscriptionConfirmed(message: WebSocketMessage): void {
    const { topic } = message.data;
    console.log('Subscription confirmed for topic:', topic);
  }

  private recordMessageReceived(timestamp?: string): void {
    const now = Date.now();
    this.messageTimestamps.push(now);
    this.metrics.messagesReceived++;
    
    // Calculate latency if timestamp provided
    if (timestamp) {
      const messageTime = new Date(timestamp).getTime();
      const latency = now - messageTime;
      if (latency >= 0 && latency < 60000) { // Reasonable latency range
        this.latencyMeasurements.push(latency);
      }
    }
  }

  // Utility methods

  getSubscriptions(): RealTimeDataSubscription[] {
    return Array.from(this.subscriptions.values());
  }

  getSubscription(subscriptionId: string): RealTimeDataSubscription | undefined {
    return this.subscriptions.get(subscriptionId);
  }

  getSubscriptionsByTopic(topic: string): RealTimeDataSubscription[] {
    return Array.from(this.subscriptions.values())
      .filter(sub => sub.topic === topic);
  }

  getMetrics(): RealTimeMetrics {
    return { ...this.metrics };
  }

  clearMetrics(): void {
    this.metrics = {
      totalSubscriptions: this.subscriptions.size,
      activeSubscriptions: Array.from(this.subscriptions.values())
        .filter(sub => sub.active).length,
      messagesReceived: 0,
      messagesPerSecond: 0,
      averageLatency: 0,
      errorCount: 0,
      connectionUptime: this.connectionStartTime > 0 ? Date.now() - this.connectionStartTime : 0,
    };
    this.latencyMeasurements = [];
    this.messageTimestamps = [];
  }

  // Configuration
  updateOptions(options: Partial<DataSyncOptions>): void {
    this.defaultOptions = { ...this.defaultOptions, ...options };
  }

  getOptions(): DataSyncOptions {
    return { ...this.defaultOptions };
  }

  // Cleanup
  destroy(): void {
    // Unsubscribe from all topics
    for (const subscriptionId of this.subscriptions.keys()) {
      this.unsubscribe(subscriptionId);
    }

    // Clear intervals
    if (this.batchTimeout) {
      clearTimeout(this.batchTimeout);
    }
    
    if (this.metricsInterval) {
      clearInterval(this.metricsInterval);
    }
  }
}

// Create and export singleton instance
export const realTimeDataService = new RealTimeDataService();
export default realTimeDataService;