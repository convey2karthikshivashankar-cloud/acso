import { format, subDays, subHours, subMinutes, startOfDay, startOfHour, startOfMinute } from 'date-fns';

export interface MetricValue {
  timestamp: string;
  value: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

export interface AggregatedMetric {
  timestamp: string;
  count: number;
  sum: number;
  average: number;
  min: number;
  max: number;
  median: number;
  percentile95: number;
  percentile99: number;
  standardDeviation: number;
  tags?: Record<string, string>;
}

export interface MetricQuery {
  metricName: string;
  startTime: string;
  endTime: string;
  interval: 'minute' | 'hour' | 'day';
  aggregation: 'sum' | 'average' | 'min' | 'max' | 'count' | 'percentile';
  percentile?: number;
  tags?: Record<string, string>;
  groupBy?: string[];
}

export interface MetricAlert {
  id: string;
  metricName: string;
  condition: 'greater_than' | 'less_than' | 'equals' | 'not_equals';
  threshold: number;
  duration: number; // in minutes
  severity: 'low' | 'medium' | 'high' | 'critical';
  enabled: boolean;
  lastTriggered?: string;
  description?: string;
}

class MetricsAggregationService {
  private metrics: Map<string, MetricValue[]> = new Map();
  private aggregatedCache: Map<string, AggregatedMetric[]> = new Map();
  private alerts: Map<string, MetricAlert> = new Map();
  private alertCallbacks: Map<string, (alert: MetricAlert, value: number) => void> = new Map();

  addMetric(metricName: string, value: number, tags?: Record<string, string>, metadata?: Record<string, any>): void {
    const metric: MetricValue = {
      timestamp: new Date().toISOString(),
      value,
      tags,
      metadata,
    };

    if (!this.metrics.has(metricName)) {
      this.metrics.set(metricName, []);
    }

    this.metrics.get(metricName)!.push(metric);
    this.checkAlerts(metricName, value);
  }

  queryMetrics(query: MetricQuery): AggregatedMetric[] {
    const rawMetrics = this.getMetrics(query.metricName, query.startTime, query.endTime);
    const grouped = this.groupByInterval(rawMetrics, query.interval);
    
    const aggregated = Array.from(grouped.entries()).map(([timestamp, values]) => {
      return this.aggregateValues(timestamp, values);
    });

    return aggregated.sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  private getMetrics(metricName: string, startTime?: string, endTime?: string): MetricValue[] {
    const metrics = this.metrics.get(metricName) || [];
    
    if (!startTime && !endTime) {
      return [...metrics];
    }

    const start = startTime ? new Date(startTime) : new Date(0);
    const end = endTime ? new Date(endTime) : new Date();

    return metrics.filter(metric => {
      const timestamp = new Date(metric.timestamp);
      return timestamp >= start && timestamp <= end;
    });
  }

  private groupByInterval(metrics: MetricValue[], interval: 'minute' | 'hour' | 'day'): Map<string, MetricValue[]> {
    const grouped = new Map<string, MetricValue[]>();

    metrics.forEach(metric => {
      const date = new Date(metric.timestamp);
      let intervalStart: Date;

      switch (interval) {
        case 'minute':
          intervalStart = startOfMinute(date);
          break;
        case 'hour':
          intervalStart = startOfHour(date);
          break;
        case 'day':
          intervalStart = startOfDay(date);
          break;
      }

      const key = intervalStart.toISOString();
      
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      
      grouped.get(key)!.push(metric);
    });

    return grouped;
  }

  private aggregateValues(timestamp: string, values: MetricValue[]): AggregatedMetric {
    if (values.length === 0) {
      return {
        timestamp,
        count: 0,
        sum: 0,
        average: 0,
        min: 0,
        max: 0,
        median: 0,
        percentile95: 0,
        percentile99: 0,
        standardDeviation: 0,
      };
    }

    const nums = values.map(v => v.value).sort((a, b) => a - b);
    const sum = nums.reduce((acc, val) => acc + val, 0);
    const average = sum / nums.length;

    return {
      timestamp,
      count: nums.length,
      sum,
      average,
      min: nums[0],
      max: nums[nums.length - 1],
      median: this.calculatePercentile(nums, 50),
      percentile95: this.calculatePercentile(nums, 95),
      percentile99: this.calculatePercentile(nums, 99),
      standardDeviation: this.calculateStandardDeviation(nums, average),
    };
  }

  private calculatePercentile(sortedValues: number[], percentile: number): number {
    if (sortedValues.length === 0) return 0;
    
    const index = (percentile / 100) * (sortedValues.length - 1);
    const lower = Math.floor(index);
    const upper = Math.ceil(index);
    
    if (lower === upper) {
      return sortedValues[lower];
    }
    
    const weight = index - lower;
    return sortedValues[lower] * (1 - weight) + sortedValues[upper] * weight;
  }

  private calculateStandardDeviation(values: number[], mean: number): number {
    if (values.length === 0) return 0;
    
    const squaredDifferences = values.map(value => Math.pow(value - mean, 2));
    const avgSquaredDiff = squaredDifferences.reduce((acc, val) => acc + val, 0) / values.length;
    return Math.sqrt(avgSquaredDiff);
  }

  addAlert(alert: MetricAlert): void {
    this.alerts.set(alert.id, alert);
  }

  setAlertCallback(alertId: string, callback: (alert: MetricAlert, value: number) => void): void {
    this.alertCallbacks.set(alertId, callback);
  }

  private checkAlerts(metricName: string, value: number): void {
    this.alerts.forEach(alert => {
      if (alert.metricName !== metricName || !alert.enabled) return;

      let triggered = false;
      
      switch (alert.condition) {
        case 'greater_than':
          triggered = value > alert.threshold;
          break;
        case 'less_than':
          triggered = value < alert.threshold;
          break;
        case 'equals':
          triggered = value === alert.threshold;
          break;
        case 'not_equals':
          triggered = value !== alert.threshold;
          break;
      }

      if (triggered) {
        alert.lastTriggered = new Date().toISOString();
        
        const callback = this.alertCallbacks.get(alert.id);
        if (callback) {
          callback(alert, value);
        }
      }
    });
  }

  getMetricNames(): string[] {
    return Array.from(this.metrics.keys());
  }

  getMetricStats(metricName: string): { count: number; latestValue?: number; latestTimestamp?: string } {
    const metrics = this.metrics.get(metricName) || [];
    const latest = metrics[metrics.length - 1];
    
    return {
      count: metrics.length,
      latestValue: latest?.value,
      latestTimestamp: latest?.timestamp,
    };
  }

  exportMetrics(): string {
    return JSON.stringify({
      metrics: Object.fromEntries(this.metrics),
      alerts: Array.from(this.alerts.values()),
      exportedAt: new Date().toISOString(),
    }, null, 2);
  }

  importMetrics(data: string): boolean {
    try {
      const parsed = JSON.parse(data);
      
      if (parsed.metrics) {
        Object.entries(parsed.metrics).forEach(([name, values]) => {
          this.metrics.set(name, values as MetricValue[]);
        });
      }
      
      if (parsed.alerts) {
        parsed.alerts.forEach((alert: MetricAlert) => {
          this.alerts.set(alert.id, alert);
        });
      }
      
      return true;
    } catch (error) {
      console.error('Failed to import metrics:', error);
      return false;
    }
  }

  getDashboards(): any[] {
    return []; // Placeholder for dashboard functionality
  }

  destroy(): void {
    this.metrics.clear();
    this.aggregatedCache.clear();
    this.alerts.clear();
    this.alertCallbacks.clear();
  }
}

export const metricsAggregationService = new MetricsAggregationService();
export default metricsAggregationService;