import { ChartDataPoint } from '../components/charts/BaseChart';

export interface RealTimeDataSource {
  id: string;
  name: string;
  type: 'websocket' | 'polling' | 'sse';
  endpoint: string;
  updateInterval?: number;
  maxDataPoints?: number;
  bufferSize?: number;
  compression?: boolean;
}

export interface RealTimeSubscription {
  id: string;
  dataSourceId: string;
  callback: (data: ChartDataPoint[]) => void;
  filter?: (data: ChartDataPoint) => boolean;
  transform?: (data: ChartDataPoint) => ChartDataPoint;
  active: boolean;
}

export interface DataBuffer {
  data: ChartDataPoint[];
  maxSize: number;
  lastUpdate: Date;
  updateCount: number;
}

export class RealTimeChartService {
  private static instance: RealTimeChartService;
  private dataSources: Map<string, RealTimeDataSource> = new Map();
  private subscriptions: Map<string, RealTimeSubscription> = new Map();
  private dataBuffers: Map<string, DataBuffer> = new Map();
  private websockets: Map<string, WebSocket> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();
  private eventSources: Map<string, EventSource> = new Map();

  static getInstance(): RealTimeChartService {
    if (!RealTimeChartService.instance) {
      RealTimeChartService.instance = new RealTimeChartService();
    }
    return RealTimeChartService.instance;
  }

  // Register a data source
  registerDataSource(dataSource: RealTimeDataSource): void {
    this.dataSources.set(dataSource.id, dataSource);
    
    // Initialize data buffer
    this.dataBuffers.set(dataSource.id, {
      data: [],
      maxSize: dataSource.maxDataPoints || 1000,
      lastUpdate: new Date(),
      updateCount: 0,
    });

    // Start the data source based on type
    this.startDataSource(dataSource);
  }

  // Unregister a data source
  unregisterDataSource(dataSourceId: string): void {
    this.stopDataSource(dataSourceId);
    this.dataSources.delete(dataSourceId);
    this.dataBuffers.delete(dataSourceId);
  }

  // Subscribe to real-time updates
  subscribe(
    dataSourceId: string,
    callback: (data: ChartDataPoint[]) => void,
    options?: {
      filter?: (data: ChartDataPoint) => boolean;
      transform?: (data: ChartDataPoint) => ChartDataPoint;
    }
  ): string {
    const subscriptionId = `sub-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`;
    
    const subscription: RealTimeSubscription = {
      id: subscriptionId,
      dataSourceId,
      callback,
      filter: options?.filter,
      transform: options?.transform,
      active: true,
    };

    this.subscriptions.set(subscriptionId, subscription);

    // Send current buffered data to new subscriber
    const buffer = this.dataBuffers.get(dataSourceId);
    if (buffer && buffer.data.length > 0) {
      callback(buffer.data);
    }

    return subscriptionId;
  }

  // Unsubscribe from updates
  unsubscribe(subscriptionId: string): void {
    const subscription = this.subscriptions.get(subscriptionId);
    if (subscription) {
      subscription.active = false;
      this.subscriptions.delete(subscriptionId);
    }
  }

  // Get current data from buffer
  getCurrentData(dataSourceId: string): ChartDataPoint[] {
    const buffer = this.dataBuffers.get(dataSourceId);
    return buffer ? [...buffer.data] : [];
  }

  // Add data point to buffer and notify subscribers
  private addDataPoint(dataSourceId: string, dataPoint: ChartDataPoint): void {
    const buffer = this.dataBuffers.get(dataSourceId);
    if (!buffer) return;

    // Add to buffer
    buffer.data.push(dataPoint);
    buffer.lastUpdate = new Date();
    buffer.updateCount++;

    // Maintain buffer size
    if (buffer.data.length > buffer.maxSize) {
      buffer.data = buffer.data.slice(-buffer.maxSize);
    }

    // Notify subscribers
    this.notifySubscribers(dataSourceId, [dataPoint]);
  }

  // Add multiple data points
  private addDataPoints(dataSourceId: string, dataPoints: ChartDataPoint[]): void {
    const buffer = this.dataBuffers.get(dataSourceId);
    if (!buffer) return;

    // Add to buffer
    buffer.data.push(...dataPoints);
    buffer.lastUpdate = new Date();
    buffer.updateCount += dataPoints.length;

    // Maintain buffer size
    if (buffer.data.length > buffer.maxSize) {
      buffer.data = buffer.data.slice(-buffer.maxSize);
    }

    // Notify subscribers
    this.notifySubscribers(dataSourceId, dataPoints);
  }

  // Notify all subscribers of a data source
  private notifySubscribers(dataSourceId: string, newData: ChartDataPoint[]): void {
    const relevantSubscriptions = Array.from(this.subscriptions.values())
      .filter(sub => sub.dataSourceId === dataSourceId && sub.active);

    relevantSubscriptions.forEach(subscription => {
      try {
        let processedData = newData;

        // Apply filter if provided
        if (subscription.filter) {
          processedData = processedData.filter(subscription.filter);
        }

        // Apply transform if provided
        if (subscription.transform) {
          processedData = processedData.map(subscription.transform);
        }

        // Get full buffer data for callback
        const buffer = this.dataBuffers.get(dataSourceId);
        if (buffer) {
          subscription.callback(buffer.data);
        }
      } catch (error) {
        console.error('Error notifying subscriber:', error);
      }
    });
  }

  // Start a data source based on its type
  private startDataSource(dataSource: RealTimeDataSource): void {
    switch (dataSource.type) {
      case 'websocket':
        this.startWebSocketSource(dataSource);
        break;
      case 'polling':
        this.startPollingSource(dataSource);
        break;
      case 'sse':
        this.startServerSentEventsSource(dataSource);
        break;
    }
  }

  // Stop a data source
  private stopDataSource(dataSourceId: string): void {
    // Close WebSocket
    const ws = this.websockets.get(dataSourceId);
    if (ws) {
      ws.close();
      this.websockets.delete(dataSourceId);
    }

    // Clear polling interval
    const interval = this.intervals.get(dataSourceId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(dataSourceId);
    }

    // Close EventSource
    const eventSource = this.eventSources.get(dataSourceId);
    if (eventSource) {
      eventSource.close();
      this.eventSources.delete(dataSourceId);
    }
  }

  // Start WebSocket data source
  private startWebSocketSource(dataSource: RealTimeDataSource): void {
    const ws = new WebSocket(dataSource.endpoint);
    
    ws.onopen = () => {
      console.log(`WebSocket connected: ${dataSource.name}`);
    };

    ws.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (Array.isArray(data)) {
          this.addDataPoints(dataSource.id, data);
        } else {
          this.addDataPoint(dataSource.id, data);
        }
      } catch (error) {
        console.error('Error parsing WebSocket data:', error);
      }
    };

    ws.onerror = (error) => {
      console.error(`WebSocket error for ${dataSource.name}:`, error);
    };

    ws.onclose = () => {
      console.log(`WebSocket closed: ${dataSource.name}`);
      // Attempt to reconnect after 5 seconds
      setTimeout(() => {
        if (this.dataSources.has(dataSource.id)) {
          this.startWebSocketSource(dataSource);
        }
      }, 5000);
    };

    this.websockets.set(dataSource.id, ws);
  }

  // Start polling data source
  private startPollingSource(dataSource: RealTimeDataSource): void {
    const interval = setInterval(async () => {
      try {
        const response = await fetch(dataSource.endpoint);
        const data = await response.json();
        
        if (Array.isArray(data)) {
          this.addDataPoints(dataSource.id, data);
        } else {
          this.addDataPoint(dataSource.id, data);
        }
      } catch (error) {
        console.error(`Polling error for ${dataSource.name}:`, error);
      }
    }, dataSource.updateInterval || 5000);

    this.intervals.set(dataSource.id, interval);
  }

  // Start Server-Sent Events data source
  private startServerSentEventsSource(dataSource: RealTimeDataSource): void {
    const eventSource = new EventSource(dataSource.endpoint);
    
    eventSource.onopen = () => {
      console.log(`SSE connected: ${dataSource.name}`);
    };

    eventSource.onmessage = (event) => {
      try {
        const data = JSON.parse(event.data);
        
        if (Array.isArray(data)) {
          this.addDataPoints(dataSource.id, data);
        } else {
          this.addDataPoint(dataSource.id, data);
        }
      } catch (error) {
        console.error('Error parsing SSE data:', error);
      }
    };

    eventSource.onerror = (error) => {
      console.error(`SSE error for ${dataSource.name}:`, error);
    };

    this.eventSources.set(dataSource.id, eventSource);
  }

  // Get statistics for a data source
  getDataSourceStats(dataSourceId: string): {
    bufferSize: number;
    maxBufferSize: number;
    lastUpdate: Date;
    updateCount: number;
    subscriberCount: number;
  } | null {
    const buffer = this.dataBuffers.get(dataSourceId);
    if (!buffer) return null;

    const subscriberCount = Array.from(this.subscriptions.values())
      .filter(sub => sub.dataSourceId === dataSourceId && sub.active).length;

    return {
      bufferSize: buffer.data.length,
      maxBufferSize: buffer.maxSize,
      lastUpdate: buffer.lastUpdate,
      updateCount: buffer.updateCount,
      subscriberCount,
    };
  }

  // Clear buffer for a data source
  clearBuffer(dataSourceId: string): void {
    const buffer = this.dataBuffers.get(dataSourceId);
    if (buffer) {
      buffer.data = [];
      buffer.updateCount = 0;
    }
  }

  // Pause/resume data source
  pauseDataSource(dataSourceId: string): void {
    this.stopDataSource(dataSourceId);
  }

  resumeDataSource(dataSourceId: string): void {
    const dataSource = this.dataSources.get(dataSourceId);
    if (dataSource) {
      this.startDataSource(dataSource);
    }
  }

  // Cleanup all resources
  cleanup(): void {
    // Stop all data sources
    for (const dataSourceId of this.dataSources.keys()) {
      this.stopDataSource(dataSourceId);
    }

    // Clear all data
    this.dataSources.clear();
    this.subscriptions.clear();
    this.dataBuffers.clear();
    this.websockets.clear();
    this.intervals.clear();
    this.eventSources.clear();
  }
}

// Export singleton instance
export const realTimeChartService = RealTimeChartService.getInstance();

// Mock data generators for development
export const createMockDataSource = (
  id: string,
  name: string,
  type: 'metrics' | 'events' | 'logs' = 'metrics'
): RealTimeDataSource => ({
  id,
  name,
  type: 'polling',
  endpoint: `/api/mock/${type}/${id}`,
  updateInterval: 2000,
  maxDataPoints: 500,
});

export const generateMockRealTimeData = (type: 'metrics' | 'events' | 'logs' = 'metrics'): ChartDataPoint[] => {
  const now = Date.now();
  const dataPoints: ChartDataPoint[] = [];

  switch (type) {
    case 'metrics':
      dataPoints.push({
        timestamp: now,
        value: Math.random() * 100,
        category: 'cpu',
        metadata: { unit: 'percentage' },
      });
      dataPoints.push({
        timestamp: now,
        value: Math.random() * 100,
        category: 'memory',
        metadata: { unit: 'percentage' },
      });
      dataPoints.push({
        timestamp: now,
        value: Math.random() * 1000,
        category: 'network',
        metadata: { unit: 'mbps' },
      });
      break;

    case 'events':
      dataPoints.push({
        timestamp: now,
        value: Math.floor(Math.random() * 10),
        category: Math.random() > 0.8 ? 'error' : Math.random() > 0.6 ? 'warning' : 'info',
        metadata: { source: 'application' },
      });
      break;

    case 'logs':
      dataPoints.push({
        timestamp: now,
        value: Math.floor(Math.random() * 100),
        category: 'requests',
        metadata: { endpoint: '/api/data' },
      });
      break;
  }

  return dataPoints;
};