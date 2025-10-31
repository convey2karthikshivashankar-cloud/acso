import { EventEmitter } from 'events';
import { getWebSocketManager } from './websocketManager';
import { getIntelligentCache } from './intelligentCacheService';

// Stream configuration
export interface StreamConfig {
  name: string;
  source: string;
  bufferSize: number;
  flushInterval: number;
  compression: boolean;
  aggregation?: {
    enabled: boolean;
    windowSize: number;
    functions: Array<'avg' | 'sum' | 'min' | 'max' | 'count'>;
  };
  filtering?: {
    enabled: boolean;
    conditions: Array<{
      field: string;
      operator: 'eq' | 'ne' | 'gt' | 'lt' | 'gte' | 'lte' | 'in' | 'contains';
      value: any;
    }>;
  };
}

// Stream data point
export interface DataPoint {
  timestamp: number;
  value: any;
  metadata?: Record<string, any>;
  tags?: string[];
}

// Stream statistics
export interface StreamStats {
  totalPoints: number;
  pointsPerSecond: number;
  bufferUtilization: number;
  lastFlush: number;
  errors: number;
  aggregatedPoints: number;
  filteredPoints: number;
}

// Data stream class
export class DataStream extends EventEmitter {
  private config: StreamConfig;
  private buffer: DataPoint[] = [];
  private stats: StreamStats = {
    totalPoints: 0,
    pointsPerSecond: 0,
    bufferUtilization: 0,
    lastFlush: 0,
    errors: 0,
    aggregatedPoints: 0,
    filteredPoints: 0,
  };
  private flushTimer: NodeJS.Timeout | null = null;
  private rateTimer: NodeJS.Timeout | null = null;
  private lastSecondCount = 0;

  constructor(config: StreamConfig) {
    super();
    this.config = config;
    this.startTimers();
  }

  // Add data point to stream
  addPoint(value: any, metadata?: Record<string, any>, tags?: string[]): void {
    const point: DataPoint = {
      timestamp: Date.now(),
      value,
      metadata,
      tags,
    };

    // Apply filtering if enabled
    if (this.config.filtering?.enabled && !this.passesFilter(point)) {
      this.stats.filteredPoints++;
      return;
    }

    this.buffer.push(point);
    this.stats.totalPoints++;
    this.lastSecondCount++;

    // Update buffer utilization
    this.stats.bufferUtilization = this.buffer.length / this.config.bufferSize;

    // Emit point event
    this.emit('point', point);

    // Flush if buffer is full
    if (this.buffer.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  // Flush buffer
  flush(): void {
    if (this.buffer.length === 0) return;

    const points = [...this.buffer];
    this.buffer = [];

    // Apply aggregation if enabled
    const processedPoints = this.config.aggregation?.enabled 
      ? this.aggregatePoints(points)
      : points;

    // Emit flush event
    this.emit('flush', processedPoints);
    this.stats.lastFlush = Date.now();
    this.stats.bufferUtilization = 0;

    if (this.config.aggregation?.enabled) {
      this.stats.aggregatedPoints += processedPoints.length;
    }
  }

  // Get stream statistics
  getStats(): StreamStats {
    return { ...this.stats };
  }

  // Clear buffer and reset stats
  clear(): void {
    this.buffer = [];
    this.stats = {
      totalPoints: 0,
      pointsPerSecond: 0,
      bufferUtilization: 0,
      lastFlush: 0,
      errors: 0,
      aggregatedPoints: 0,
      filteredPoints: 0,
    };
  }

  // Stop the stream
  stop(): void {
    this.flush(); // Final flush
    this.clearTimers();
    this.removeAllListeners();
  }

  // Private methods
  private passesFilter(point: DataPoint): boolean {
    if (!this.config.filtering?.conditions) return true;

    return this.config.filtering.conditions.every(condition => {
      const fieldValue = this.getFieldValue(point, condition.field);
      return this.evaluateCondition(fieldValue, condition.operator, condition.value);
    });
  }

  private getFieldValue(point: DataPoint, field: string): any {
    const parts = field.split('.');
    let value: any = point;
    
    for (const part of parts) {
      value = value?.[part];
    }
    
    return value;
  }

  private evaluateCondition(fieldValue: any, operator: string, conditionValue: any): boolean {
    switch (operator) {
      case 'eq': return fieldValue === conditionValue;
      case 'ne': return fieldValue !== conditionValue;
      case 'gt': return fieldValue > conditionValue;
      case 'lt': return fieldValue < conditionValue;
      case 'gte': return fieldValue >= conditionValue;
      case 'lte': return fieldValue <= conditionValue;
      case 'in': return Array.isArray(conditionValue) && conditionValue.includes(fieldValue);
      case 'contains': return String(fieldValue).includes(String(conditionValue));
      default: return true;
    }
  }

  private aggregatePoints(points: DataPoint[]): DataPoint[] {
    if (!this.config.aggregation || points.length === 0) return points;

    const { windowSize, functions } = this.config.aggregation;
    const windows = this.groupPointsByWindow(points, windowSize);
    
    return windows.map(window => {
      const aggregatedValue: Record<string, any> = {};
      
      functions.forEach(func => {
        const values = window.map(p => typeof p.value === 'number' ? p.value : 0);
        
        switch (func) {
          case 'avg':
            aggregatedValue[func] = values.reduce((sum, val) => sum + val, 0) / values.length;
            break;
          case 'sum':
            aggregatedValue[func] = values.reduce((sum, val) => sum + val, 0);
            break;
          case 'min':
            aggregatedValue[func] = Math.min(...values);
            break;
          case 'max':
            aggregatedValue[func] = Math.max(...values);
            break;
          case 'count':
            aggregatedValue[func] = values.length;
            break;
        }
      });

      return {
        timestamp: window[0].timestamp,
        value: aggregatedValue,
        metadata: { aggregated: true, windowSize, pointCount: window.length },
      };
    });
  }

  private groupPointsByWindow(points: DataPoint[], windowSize: number): DataPoint[][] {
    const windows: DataPoint[][] = [];
    let currentWindow: DataPoint[] = [];
    let windowStart = points[0]?.timestamp || Date.now();

    for (const point of points) {
      if (point.timestamp - windowStart >= windowSize) {
        if (currentWindow.length > 0) {
          windows.push(currentWindow);
        }
        currentWindow = [point];
        windowStart = point.timestamp;
      } else {
        currentWindow.push(point);
      }
    }

    if (currentWindow.length > 0) {
      windows.push(currentWindow);
    }

    return windows;
  }

  private startTimers(): void {
    // Flush timer
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);

    // Rate calculation timer
    this.rateTimer = setInterval(() => {
      this.stats.pointsPerSecond = this.lastSecondCount;
      this.lastSecondCount = 0;
    }, 1000);
  }

  private clearTimers(): void {
    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }
    if (this.rateTimer) {
      clearInterval(this.rateTimer);
      this.rateTimer = null;
    }
  }
}

// Data streaming service
export class DataStreamingService {
  private streams = new Map<string, DataStream>();
  private wsManager = getWebSocketManager();
  private cache = getIntelligentCache();

  // Create a new data stream
  createStream(config: StreamConfig): DataStream {
    if (this.streams.has(config.name)) {
      throw new Error(`Stream ${config.name} already exists`);
    }

    const stream = new DataStream(config);
    this.streams.set(config.name, stream);

    // Set up WebSocket forwarding if source is 'websocket'
    if (config.source === 'websocket') {
      this.setupWebSocketForwarding(stream, config.name);
    }

    // Set up caching for stream data
    this.setupStreamCaching(stream, config.name);

    console.log(`Created data stream: ${config.name}`);
    return stream;
  }

  // Get existing stream
  getStream(name: string): DataStream | null {
    return this.streams.get(name) || null;
  }

  // Remove stream
  removeStream(name: string): boolean {
    const stream = this.streams.get(name);
    if (stream) {
      stream.stop();
      this.streams.delete(name);
      console.log(`Removed data stream: ${name}`);
      return true;
    }
    return false;
  }

  // Get all stream names
  getStreamNames(): string[] {
    return Array.from(this.streams.keys());
  }

  // Get aggregated statistics for all streams
  getAllStats(): Record<string, StreamStats> {
    const stats: Record<string, StreamStats> = {};
    for (const [name, stream] of this.streams.entries()) {
      stats[name] = stream.getStats();
    }
    return stats;
  }

  // Create predefined streams for ACSO data
  createACSOStreams(): void {
    // Agent metrics stream
    this.createStream({
      name: 'agent_metrics',
      source: 'websocket',
      bufferSize: 100,
      flushInterval: 5000,
      compression: true,
      aggregation: {
        enabled: true,
        windowSize: 10000, // 10 seconds
        functions: ['avg', 'max', 'count'],
      },
    });

    // Incident events stream
    this.createStream({
      name: 'incident_events',
      source: 'websocket',
      bufferSize: 50,
      flushInterval: 2000,
      compression: false,
      filtering: {
        enabled: true,
        conditions: [
          { field: 'severity', operator: 'in', value: ['high', 'critical'] },
        ],
      },
    });

    // System performance stream
    this.createStream({
      name: 'system_performance',
      source: 'websocket',
      bufferSize: 200,
      flushInterval: 1000,
      compression: true,
      aggregation: {
        enabled: true,
        windowSize: 5000, // 5 seconds
        functions: ['avg', 'min', 'max'],
      },
    });

    // Financial metrics stream
    this.createStream({
      name: 'financial_metrics',
      source: 'websocket',
      bufferSize: 20,
      flushInterval: 10000,
      compression: false,
    });

    // Network topology stream
    this.createStream({
      name: 'network_topology',
      source: 'websocket',
      bufferSize: 30,
      flushInterval: 5000,
      compression: true,
    });
  }

  // Private methods
  private setupWebSocketForwarding(stream: DataStream, streamName: string): void {
    // Subscribe to WebSocket messages for this stream
    this.wsManager.subscribe(`stream_${streamName}`, (data: any) => {
      stream.addPoint(data.value, data.metadata, data.tags);
    });
  }

  private setupStreamCaching(stream: DataStream, streamName: string): void {
    // Cache flushed data points
    stream.on('flush', (points: DataPoint[]) => {
      const cacheKey = `stream_${streamName}_latest`;
      this.cache.set(cacheKey, points, {
        ttl: 60000, // 1 minute
        tags: ['stream', streamName],
        priority: 'normal',
      });
    });
  }
}

// Singleton instance
let streamingServiceInstance: DataStreamingService | null = null;

export function getDataStreamingService(): DataStreamingService {
  if (!streamingServiceInstance) {
    streamingServiceInstance = new DataStreamingService();
  }
  return streamingServiceInstance;
}

// Utility functions for common streaming patterns
export const streamUtils = {
  // Create a time-series data point
  createTimeSeriesPoint: (value: number, metadata?: Record<string, any>) => ({
    timestamp: Date.now(),
    value,
    metadata,
  }),

  // Create a metric data point
  createMetricPoint: (name: string, value: number, unit?: string, tags?: string[]) => ({
    timestamp: Date.now(),
    value: { name, value, unit },
    tags,
  }),

  // Create an event data point
  createEventPoint: (type: string, data: any, severity?: string) => ({
    timestamp: Date.now(),
    value: { type, data, severity },
    metadata: { event: true },
  }),

  // Batch process data points
  batchProcess: (points: DataPoint[], batchSize: number, processor: (batch: DataPoint[]) => void) => {
    for (let i = 0; i < points.length; i += batchSize) {
      const batch = points.slice(i, i + batchSize);
      processor(batch);
    }
  },
};

export default DataStreamingService;