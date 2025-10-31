import { config } from '../config/productionConfig';

interface ErrorReport {
  message: string;
  stack?: string;
  url: string;
  lineNumber?: number;
  columnNumber?: number;
  timestamp: number;
  userAgent: string;
  userId?: string;
  sessionId: string;
  buildVersion: string;
  environment: string;
}

interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface AnalyticsEvent {
  event: string;
  properties: Record<string, any>;
  timestamp: number;
  userId?: string;
  sessionId: string;
}

export class MonitoringService {
  private static instance: MonitoringService;
  private sessionId: string;
  private userId?: string;
  private buildVersion: string;
  private errorQueue: ErrorReport[] = [];
  private metricsQueue: PerformanceMetric[] = [];
  private analyticsQueue: AnalyticsEvent[] = [];
  private flushInterval: NodeJS.Timeout | null = null;

  private constructor() {
    this.sessionId = this.generateSessionId();
    this.buildVersion = process.env.REACT_APP_BUILD_VERSION || 'unknown';
    this.setupErrorHandling();
    this.setupPerformanceMonitoring();
    this.startFlushTimer();
  }

  static getInstance(): MonitoringService {
    if (!MonitoringService.instance) {
      MonitoringService.instance = new MonitoringService();
    }
    return MonitoringService.instance;
  }

  setUserId(userId: string): void {
    this.userId = userId;
  }

  // Error reporting
  private setupErrorHandling(): void {
    if (!config.enableErrorReporting) return;

    // Global error handler
    window.addEventListener('error', (event) => {
      this.reportError({
        message: event.message,
        stack: event.error?.stack,
        url: event.filename,
        lineNumber: event.lineno,
        columnNumber: event.colno,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        userId: this.userId,
        sessionId: this.sessionId,
        buildVersion: this.buildVersion,
        environment: process.env.NODE_ENV || 'development'
      });
    });

    // Unhandled promise rejection handler
    window.addEventListener('unhandledrejection', (event) => {
      this.reportError({
        message: `Unhandled Promise Rejection: ${event.reason}`,
        stack: event.reason?.stack,
        url: window.location.href,
        timestamp: Date.now(),
        userAgent: navigator.userAgent,
        userId: this.userId,
        sessionId: this.sessionId,
        buildVersion: this.buildVersion,
        environment: process.env.NODE_ENV || 'development'
      });
    });
  }

  reportError(error: Partial<ErrorReport>): void {
    if (!config.enableErrorReporting) return;

    const errorReport: ErrorReport = {
      message: error.message || 'Unknown error',
      stack: error.stack,
      url: error.url || window.location.href,
      lineNumber: error.lineNumber,
      columnNumber: error.columnNumber,
      timestamp: error.timestamp || Date.now(),
      userAgent: navigator.userAgent,
      userId: this.userId,
      sessionId: this.sessionId,
      buildVersion: this.buildVersion,
      environment: process.env.NODE_ENV || 'development'
    };

    this.errorQueue.push(errorReport);
    this.log('error', 'Error reported:', errorReport);
  }

  // Performance monitoring
  private setupPerformanceMonitoring(): void {
    if (!config.enablePerformanceMonitoring) return;

    // Monitor navigation timing
    window.addEventListener('load', () => {
      setTimeout(() => {
        const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
        if (navigation) {
          this.recordMetric('page_load_time', navigation.loadEventEnd - navigation.fetchStart);
          this.recordMetric('dom_content_loaded', navigation.domContentLoadedEventEnd - navigation.fetchStart);
          this.recordMetric('first_byte', navigation.responseStart - navigation.fetchStart);
        }
      }, 0);
    });

    // Monitor paint timing
    const paintObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry) => {
        this.recordMetric(entry.name.replace('-', '_'), entry.startTime);
      });
    });
    paintObserver.observe({ entryTypes: ['paint'] });

    // Monitor largest contentful paint
    const lcpObserver = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordMetric('largest_contentful_paint', lastEntry.startTime);
    });
    lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });

    // Monitor cumulative layout shift
    let clsValue = 0;
    const clsObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach((entry: any) => {
        if (!entry.hadRecentInput) {
          clsValue += entry.value;
        }
      });
      this.recordMetric('cumulative_layout_shift', clsValue);
    });
    clsObserver.observe({ entryTypes: ['layout-shift'] });

    // Monitor memory usage (if available)
    if ('memory' in performance) {
      setInterval(() => {
        const memory = (performance as any).memory;
        this.recordMetric('memory_used', memory.usedJSHeapSize);
        this.recordMetric('memory_total', memory.totalJSHeapSize);
      }, 30000); // Every 30 seconds
    }
  }

  recordMetric(name: string, value: number, tags?: Record<string, string>): void {
    if (!config.enablePerformanceMonitoring) return;

    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags
    };

    this.metricsQueue.push(metric);
    this.log('debug', 'Metric recorded:', metric);
  }

  // Analytics
  trackEvent(event: string, properties: Record<string, any> = {}): void {
    if (!config.enableAnalytics) return;

    const analyticsEvent: AnalyticsEvent = {
      event,
      properties: {
        ...properties,
        url: window.location.href,
        referrer: document.referrer,
        buildVersion: this.buildVersion,
        environment: process.env.NODE_ENV || 'development'
      },
      timestamp: Date.now(),
      userId: this.userId,
      sessionId: this.sessionId
    };

    this.analyticsQueue.push(analyticsEvent);
    this.log('debug', 'Event tracked:', analyticsEvent);
  }

  // Page view tracking
  trackPageView(page: string, title?: string): void {
    this.trackEvent('page_view', {
      page,
      title: title || document.title,
      timestamp: Date.now()
    });
  }

  // User interaction tracking
  trackUserInteraction(action: string, element: string, properties?: Record<string, any>): void {
    this.trackEvent('user_interaction', {
      action,
      element,
      ...properties
    });
  }

  // Feature usage tracking
  trackFeatureUsage(feature: string, properties?: Record<string, any>): void {
    this.trackEvent('feature_usage', {
      feature,
      ...properties
    });
  }

  // Data flushing
  private startFlushTimer(): void {
    this.flushInterval = setInterval(() => {
      this.flush();
    }, 30000); // Flush every 30 seconds
  }

  private async flush(): Promise<void> {
    const promises: Promise<void>[] = [];

    if (this.errorQueue.length > 0) {
      promises.push(this.flushErrors());
    }

    if (this.metricsQueue.length > 0) {
      promises.push(this.flushMetrics());
    }

    if (this.analyticsQueue.length > 0) {
      promises.push(this.flushAnalytics());
    }

    await Promise.allSettled(promises);
  }

  private async flushErrors(): Promise<void> {
    const errors = [...this.errorQueue];
    this.errorQueue = [];

    try {
      await fetch(`${config.apiBaseUrl}/api/monitoring/errors`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ errors })
      });
    } catch (error) {
      // Re-queue errors if sending failed
      this.errorQueue.unshift(...errors);
      this.log('error', 'Failed to send error reports:', error);
    }
  }

  private async flushMetrics(): Promise<void> {
    const metrics = [...this.metricsQueue];
    this.metricsQueue = [];

    try {
      await fetch(`${config.apiBaseUrl}/api/monitoring/metrics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ metrics })
      });
    } catch (error) {
      // Re-queue metrics if sending failed
      this.metricsQueue.unshift(...metrics);
      this.log('error', 'Failed to send metrics:', error);
    }
  }

  private async flushAnalytics(): Promise<void> {
    const events = [...this.analyticsQueue];
    this.analyticsQueue = [];

    try {
      await fetch(`${config.apiBaseUrl}/api/monitoring/analytics`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ events })
      });
    } catch (error) {
      // Re-queue events if sending failed
      this.analyticsQueue.unshift(...events);
      this.log('error', 'Failed to send analytics:', error);
    }
  }

  // Utility methods
  private generateSessionId(): string {
    return `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(level: string, message: string, data?: any): void {
    const logLevels = ['error', 'warn', 'info', 'debug'];
    const currentLevelIndex = logLevels.indexOf(config.logLevel);
    const messageLevelIndex = logLevels.indexOf(level);

    if (messageLevelIndex <= currentLevelIndex) {
      console[level as keyof Console](message, data);
    }
  }

  // Health check
  getHealthStatus(): {
    errorQueueSize: number;
    metricsQueueSize: number;
    analyticsQueueSize: number;
    sessionId: string;
    userId?: string;
  } {
    return {
      errorQueueSize: this.errorQueue.length,
      metricsQueueSize: this.metricsQueue.length,
      analyticsQueueSize: this.analyticsQueue.length,
      sessionId: this.sessionId,
      userId: this.userId
    };
  }

  // Cleanup
  destroy(): void {
    if (this.flushInterval) {
      clearInterval(this.flushInterval);
    }
    this.flush(); // Final flush
  }
}

// Export singleton instance
export const monitoringService = MonitoringService.getInstance();

// React hook for tracking
export const useAnalytics = () => {
  const trackEvent = (event: string, properties?: Record<string, any>) => {
    monitoringService.trackEvent(event, properties);
  };

  const trackPageView = (page: string, title?: string) => {
    monitoringService.trackPageView(page, title);
  };

  const trackFeatureUsage = (feature: string, properties?: Record<string, any>) => {
    monitoringService.trackFeatureUsage(feature, properties);
  };

  return {
    trackEvent,
    trackPageView,
    trackFeatureUsage
  };
};