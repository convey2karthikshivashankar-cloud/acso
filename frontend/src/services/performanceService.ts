interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
}

interface WebVital {
  name: 'CLS' | 'FID' | 'FCP' | 'LCP' | 'TTFB';
  value: number;
  rating: 'good' | 'needs-improvement' | 'poor';
  timestamp: number;
}

interface PerformanceConfig {
  enableRUM: boolean;
  enableWebVitals: boolean;
  enableResourceTiming: boolean;
  enableUserTiming: boolean;
  sampleRate: number;
  endpoint?: string;
  bufferSize: number;
  flushInterval: number;
}

class PerformanceService {
  private config: PerformanceConfig;
  private metrics: PerformanceMetric[] = [];
  private webVitals: WebVital[] = [];
  private observer: PerformanceObserver | null = null;
  private flushTimer: NodeJS.Timeout | null = null;
  private isInitialized = false;

  constructor(config: Partial<PerformanceConfig> = {}) {
    this.config = {
      enableRUM: true,
      enableWebVitals: true,
      enableResourceTiming: true,
      enableUserTiming: true,
      sampleRate: 1.0,
      bufferSize: 100,
      flushInterval: 30000, // 30 seconds
      ...config,
    };
  }

  initialize(): void {
    if (this.isInitialized || typeof window === 'undefined') {
      return;
    }

    // Sample rate check
    if (Math.random() > this.config.sampleRate) {
      return;
    }

    this.isInitialized = true;

    if (this.config.enableWebVitals) {
      this.initializeWebVitals();
    }

    if (this.config.enableResourceTiming || this.config.enableUserTiming) {
      this.initializePerformanceObserver();
    }

    // Start periodic flushing
    this.startPeriodicFlush();

    // Flush on page unload
    window.addEventListener('beforeunload', () => {
      this.flush();
    });

    // Flush on visibility change
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') {
        this.flush();
      }
    });
  }

  private initializeWebVitals(): void {
    // Core Web Vitals measurement
    this.measureCLS();
    this.measureFID();
    this.measureFCP();
    this.measureLCP();
    this.measureTTFB();
  }

  private measureCLS(): void {
    let clsValue = 0;
    let clsEntries: LayoutShift[] = [];

    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries() as LayoutShift[]) {
        if (!entry.hadRecentInput) {
          clsEntries.push(entry);
          clsValue += entry.value;
        }
      }

      this.recordWebVital('CLS', clsValue);
    });

    observer.observe({ type: 'layout-shift', buffered: true });
  }

  private measureFID(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-input') {
          const fid = entry.processingStart - entry.startTime;
          this.recordWebVital('FID', fid);
          observer.disconnect();
        }
      }
    });

    observer.observe({ type: 'first-input', buffered: true });
  }

  private measureFCP(): void {
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.recordWebVital('FCP', entry.startTime);
          observer.disconnect();
        }
      }
    });

    observer.observe({ type: 'paint', buffered: true });
  }

  private measureLCP(): void {
    const observer = new PerformanceObserver((list) => {
      const entries = list.getEntries();
      const lastEntry = entries[entries.length - 1];
      this.recordWebVital('LCP', lastEntry.startTime);
    });

    observer.observe({ type: 'largest-contentful-paint', buffered: true });
  }

  private measureTTFB(): void {
    const navigationEntry = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming;
    if (navigationEntry) {
      const ttfb = navigationEntry.responseStart - navigationEntry.requestStart;
      this.recordWebVital('TTFB', ttfb);
    }
  }

  private recordWebVital(name: WebVital['name'], value: number): void {
    const rating = this.getWebVitalRating(name, value);
    
    const webVital: WebVital = {
      name,
      value,
      rating,
      timestamp: Date.now(),
    };

    this.webVitals.push(webVital);
    this.recordMetric(`web_vital_${name.toLowerCase()}`, value, { rating });
  }

  private getWebVitalRating(name: WebVital['name'], value: number): WebVital['rating'] {
    const thresholds = {
      CLS: { good: 0.1, poor: 0.25 },
      FID: { good: 100, poor: 300 },
      FCP: { good: 1800, poor: 3000 },
      LCP: { good: 2500, poor: 4000 },
      TTFB: { good: 800, poor: 1800 },
    };

    const threshold = thresholds[name];
    if (value <= threshold.good) return 'good';
    if (value <= threshold.poor) return 'needs-improvement';
    return 'poor';
  }

  private initializePerformanceObserver(): void {
    if (!('PerformanceObserver' in window)) {
      return;
    }

    this.observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        this.processPerformanceEntry(entry);
      }
    });

    const entryTypes = [];
    if (this.config.enableResourceTiming) {
      entryTypes.push('resource');
    }
    if (this.config.enableUserTiming) {
      entryTypes.push('measure', 'mark');
    }

    if (entryTypes.length > 0) {
      this.observer.observe({ entryTypes });
    }
  }

  private processPerformanceEntry(entry: PerformanceEntry): void {
    switch (entry.entryType) {
      case 'resource':
        this.processResourceEntry(entry as PerformanceResourceTiming);
        break;
      case 'measure':
      case 'mark':
        this.processUserTimingEntry(entry);
        break;
    }
  }

  private processResourceEntry(entry: PerformanceResourceTiming): void {
    const duration = entry.responseEnd - entry.startTime;
    const size = entry.transferSize || 0;
    
    this.recordMetric('resource_load_time', duration, {
      resource_type: this.getResourceType(entry.name),
      resource_name: this.getResourceName(entry.name),
    });

    if (size > 0) {
      this.recordMetric('resource_size', size, {
        resource_type: this.getResourceType(entry.name),
        resource_name: this.getResourceName(entry.name),
      });
    }

    // Track slow resources
    if (duration > 1000) {
      this.recordMetric('slow_resource', 1, {
        resource_name: entry.name,
        duration: duration.toString(),
      });
    }
  }

  private processUserTimingEntry(entry: PerformanceEntry): void {
    this.recordMetric(`user_timing_${entry.entryType}`, entry.duration || 0, {
      name: entry.name,
    });
  }

  private getResourceType(url: string): string {
    if (url.includes('.js')) return 'script';
    if (url.includes('.css')) return 'stylesheet';
    if (url.match(/\\.(png|jpg|jpeg|gif|svg|webp)$/)) return 'image';
    if (url.includes('/api/')) return 'api';
    return 'other';
  }

  private getResourceName(url: string): string {
    try {
      const urlObj = new URL(url);
      return urlObj.pathname.split('/').pop() || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  recordMetric(name: string, value: number, tags: Record<string, string> = {}): void {
    const metric: PerformanceMetric = {
      name,
      value,
      timestamp: Date.now(),
      tags: {
        ...tags,
        page: window.location.pathname,
        user_agent: navigator.userAgent,
      },
    };

    this.metrics.push(metric);

    // Auto-flush if buffer is full
    if (this.metrics.length >= this.config.bufferSize) {
      this.flush();
    }
  }

  // Custom timing measurements
  startTiming(name: string): void {
    performance.mark(`${name}_start`);
  }

  endTiming(name: string): number {
    const endMark = `${name}_end`;
    performance.mark(endMark);
    
    const measureName = `${name}_duration`;
    performance.measure(measureName, `${name}_start`, endMark);
    
    const measure = performance.getEntriesByName(measureName)[0];
    const duration = measure.duration;
    
    this.recordMetric('custom_timing', duration, { operation: name });
    
    // Clean up marks and measures
    performance.clearMarks(`${name}_start`);
    performance.clearMarks(endMark);
    performance.clearMeasures(measureName);
    
    return duration;
  }

  // Component performance tracking
  trackComponentRender(componentName: string, renderTime: number): void {
    this.recordMetric('component_render_time', renderTime, {
      component: componentName,
    });

    // Track slow components
    if (renderTime > 16) { // 60fps threshold
      this.recordMetric('slow_component_render', 1, {
        component: componentName,
        render_time: renderTime.toString(),
      });
    }
  }

  // API call tracking
  trackApiCall(endpoint: string, method: string, duration: number, status: number): void {
    this.recordMetric('api_call_duration', duration, {
      endpoint,
      method,
      status: status.toString(),
    });

    // Track API errors
    if (status >= 400) {
      this.recordMetric('api_error', 1, {
        endpoint,
        method,
        status: status.toString(),
      });
    }

    // Track slow API calls
    if (duration > 2000) {
      this.recordMetric('slow_api_call', 1, {
        endpoint,
        duration: duration.toString(),
      });
    }
  }

  // Memory usage tracking
  trackMemoryUsage(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      
      this.recordMetric('memory_used', memory.usedJSHeapSize);
      this.recordMetric('memory_total', memory.totalJSHeapSize);
      this.recordMetric('memory_limit', memory.jsHeapSizeLimit);
      
      const usagePercentage = (memory.usedJSHeapSize / memory.jsHeapSizeLimit) * 100;
      this.recordMetric('memory_usage_percentage', usagePercentage);
      
      // Alert on high memory usage
      if (usagePercentage > 80) {
        this.recordMetric('high_memory_usage', 1, {
          percentage: usagePercentage.toString(),
        });
      }
    }
  }

  // Error tracking
  trackError(error: Error, context?: Record<string, string>): void {
    this.recordMetric('javascript_error', 1, {
      error_name: error.name,
      error_message: error.message,
      stack_trace: error.stack?.substring(0, 500) || '',
      ...context,
    });
  }

  // User interaction tracking
  trackUserInteraction(action: string, target: string, duration?: number): void {
    const tags: Record<string, string> = {
      action,
      target,
    };

    if (duration !== undefined) {
      tags.duration = duration.toString();
    }

    this.recordMetric('user_interaction', 1, tags);
  }

  // Bundle size tracking
  trackBundleSize(bundleName: string, size: number): void {
    this.recordMetric('bundle_size', size, {
      bundle: bundleName,
    });
  }

  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush();
    }, this.config.flushInterval);
  }

  private async flush(): Promise<void> {
    if (this.metrics.length === 0 && this.webVitals.length === 0) {
      return;
    }

    const payload = {
      metrics: [...this.metrics],
      webVitals: [...this.webVitals],
      timestamp: Date.now(),
      session: this.getSessionId(),
      page: window.location.href,
    };

    // Clear buffers
    this.metrics = [];
    this.webVitals = [];

    try {
      if (this.config.endpoint) {
        await this.sendToEndpoint(payload);
      } else {
        // Fallback to console logging in development
        if (process.env.NODE_ENV === 'development') {
          console.group('Performance Metrics');
          console.table(payload.metrics);
          console.table(payload.webVitals);
          console.groupEnd();
        }
      }
    } catch (error) {
      console.error('Failed to send performance metrics:', error);
      
      // Re-add metrics to buffer for retry
      this.metrics.unshift(...payload.metrics);
      this.webVitals.unshift(...payload.webVitals);
    }
  }

  private async sendToEndpoint(payload: any): Promise<void> {
    const response = await fetch(this.config.endpoint!, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }
  }

  private getSessionId(): string {
    let sessionId = sessionStorage.getItem('performance_session_id');
    if (!sessionId) {
      sessionId = `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      sessionStorage.setItem('performance_session_id', sessionId);
    }
    return sessionId;
  }

  // Get current metrics for debugging
  getMetrics(): PerformanceMetric[] {
    return [...this.metrics];
  }

  getWebVitals(): WebVital[] {
    return [...this.webVitals];
  }

  // Performance summary
  getPerformanceSummary(): {
    webVitals: Record<string, WebVital>;
    slowResources: PerformanceMetric[];
    apiErrors: PerformanceMetric[];
    memoryUsage?: number;
  } {
    const webVitalsMap: Record<string, WebVital> = {};
    this.webVitals.forEach(vital => {
      webVitalsMap[vital.name] = vital;
    });

    const slowResources = this.metrics.filter(m => m.name === 'slow_resource');
    const apiErrors = this.metrics.filter(m => m.name === 'api_error');
    
    const memoryMetrics = this.metrics.filter(m => m.name === 'memory_usage_percentage');
    const memoryUsage = memoryMetrics.length > 0 ? memoryMetrics[memoryMetrics.length - 1].value : undefined;

    return {
      webVitals: webVitalsMap,
      slowResources,
      apiErrors,
      memoryUsage,
    };
  }

  destroy(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }

    if (this.flushTimer) {
      clearInterval(this.flushTimer);
      this.flushTimer = null;
    }

    // Final flush
    this.flush();

    this.isInitialized = false;
  }
}

// Create singleton instance
export const performanceService = new PerformanceService();

// React hook for performance tracking
export const usePerformanceTracking = () => {
  const trackComponentRender = (componentName: string, renderTime: number) => {
    performanceService.trackComponentRender(componentName, renderTime);
  };

  const trackUserInteraction = (action: string, target: string, duration?: number) => {
    performanceService.trackUserInteraction(action, target, duration);
  };

  const startTiming = (name: string) => {
    performanceService.startTiming(name);
  };

  const endTiming = (name: string) => {
    return performanceService.endTiming(name);
  };

  const trackError = (error: Error, context?: Record<string, string>) => {
    performanceService.trackError(error, context);
  };

  return {
    trackComponentRender,
    trackUserInteraction,
    startTiming,
    endTiming,
    trackError,
  };
};

// Higher-order component for automatic performance tracking
export const withPerformanceTracking = <P extends object>(
  WrappedComponent: React.ComponentType<P>,
  componentName?: string
) => {
  const displayName = componentName || WrappedComponent.displayName || WrappedComponent.name || 'Component';

  return React.forwardRef<any, P>((props, ref) => {
    const renderStartTime = React.useRef<number>();

    React.useLayoutEffect(() => {
      renderStartTime.current = performance.now();
    });

    React.useLayoutEffect(() => {
      if (renderStartTime.current) {
        const renderTime = performance.now() - renderStartTime.current;
        performanceService.trackComponentRender(displayName, renderTime);
      }
    });

    return React.createElement(WrappedComponent, { ...props, ref });
  });
};

export default performanceService;