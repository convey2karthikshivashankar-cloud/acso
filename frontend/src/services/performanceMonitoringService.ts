interface PerformanceMetric {
  name: string;
  value: number;
  timestamp: number;
  tags?: Record<string, string>;
  metadata?: Record<string, any>;
}

interface PerformanceThresholds {
  fcp: number; // First Contentful Paint
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  ttfb: number; // Time to First Byte
}

class PerformanceMonitoringService {
  private metrics: PerformanceMetric[] = [];
  private observers: Map<string, PerformanceObserver> = new Map();
  private thresholds: PerformanceThresholds = {
    fcp: 1800, // 1.8s
    lcp: 2500, // 2.5s
    fid: 100,  // 100ms
    cls: 0.1,  // 0.1
    ttfb: 600, // 600ms
  };

  private isInitialized = false;

  initialize() {
    if (this.isInitialized || typeof window === 'undefined') return;

    this.setupPerformanceObservers();
    this.trackNavigationTiming();
    this.trackResourceTiming();
    this.trackUserTiming();
    this.setupErrorTracking();
    
    this.isInitialized = true;
    console.log('Performance monitoring initialized');
  }

  private setupPerformanceObservers() {
    // Web Vitals Observer
    if ('PerformanceObserver' in window) {
      // Largest Contentful Paint
      try {
        const lcpObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          const lastEntry = entries[entries.length - 1] as any;
          
          this.recordMetric({
            name: 'lcp',
            value: lastEntry.startTime,
            timestamp: Date.now(),
            tags: { type: 'web_vital' },
            metadata: { 
              element: lastEntry.element?.tagName,
              url: lastEntry.url 
            }
          });
        });
        
        lcpObserver.observe({ entryTypes: ['largest-contentful-paint'] });
        this.observers.set('lcp', lcpObserver);
      } catch (e) {
        console.warn('LCP observer not supported');
      }

      // First Input Delay
      try {
        const fidObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: any) => {
            this.recordMetric({
              name: 'fid',
              value: entry.processingStart - entry.startTime,
              timestamp: Date.now(),
              tags: { type: 'web_vital' },
              metadata: { 
                eventType: entry.name,
                target: entry.target?.tagName 
              }
            });
          });
        });
        
        fidObserver.observe({ entryTypes: ['first-input'] });
        this.observers.set('fid', fidObserver);
      } catch (e) {
        console.warn('FID observer not supported');
      }

      // Layout Shift
      try {
        const clsObserver = new PerformanceObserver((list) => {
          let clsValue = 0;
          const entries = list.getEntries();
          
          entries.forEach((entry: any) => {
            if (!entry.hadRecentInput) {
              clsValue += entry.value;
            }
          });

          if (clsValue > 0) {
            this.recordMetric({
              name: 'cls',
              value: clsValue,
              timestamp: Date.now(),
              tags: { type: 'web_vital' }
            });
          }
        });
        
        clsObserver.observe({ entryTypes: ['layout-shift'] });
        this.observers.set('cls', clsObserver);
      } catch (e) {
        console.warn('CLS observer not supported');
      }

      // Long Tasks
      try {
        const longTaskObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.recordMetric({
              name: 'long_task',
              value: entry.duration,
              timestamp: Date.now(),
              tags: { type: 'performance' },
              metadata: { 
                startTime: entry.startTime,
                attribution: (entry as any).attribution 
              }
            });
          });
        });
        
        longTaskObserver.observe({ entryTypes: ['longtask'] });
        this.observers.set('longtask', longTaskObserver);
      } catch (e) {
        console.warn('Long task observer not supported');
      }
    }
  }

  private trackNavigationTiming() {
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
      
      if (navigationEntries.length > 0) {
        const nav = navigationEntries[0];
        
        // Time to First Byte
        const ttfb = nav.responseStart - nav.requestStart;
        this.recordMetric({
          name: 'ttfb',
          value: ttfb,
          timestamp: Date.now(),
          tags: { type: 'navigation' }
        });

        // DOM Content Loaded
        const dcl = nav.domContentLoadedEventEnd - nav.domContentLoadedEventStart;
        this.recordMetric({
          name: 'dom_content_loaded',
          value: dcl,
          timestamp: Date.now(),
          tags: { type: 'navigation' }
        });

        // Load Complete
        const loadComplete = nav.loadEventEnd - nav.loadEventStart;
        this.recordMetric({
          name: 'load_complete',
          value: loadComplete,
          timestamp: Date.now(),
          tags: { type: 'navigation' }
        });

        // DNS Lookup
        const dnsLookup = nav.domainLookupEnd - nav.domainLookupStart;
        this.recordMetric({
          name: 'dns_lookup',
          value: dnsLookup,
          timestamp: Date.now(),
          tags: { type: 'network' }
        });

        // TCP Connection
        const tcpConnection = nav.connectEnd - nav.connectStart;
        this.recordMetric({
          name: 'tcp_connection',
          value: tcpConnection,
          timestamp: Date.now(),
          tags: { type: 'network' }
        });
      }
    }
  }

  private trackResourceTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const resourceObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry: PerformanceResourceTiming) => {
            // Track slow resources
            if (entry.duration > 1000) { // Resources taking more than 1s
              this.recordMetric({
                name: 'slow_resource',
                value: entry.duration,
                timestamp: Date.now(),
                tags: { 
                  type: 'resource',
                  resource_type: entry.initiatorType 
                },
                metadata: {
                  name: entry.name,
                  size: entry.transferSize,
                  cached: entry.transferSize === 0
                }
              });
            }
          });
        });
        
        resourceObserver.observe({ entryTypes: ['resource'] });
        this.observers.set('resource', resourceObserver);
      } catch (e) {
        console.warn('Resource observer not supported');
      }
    }
  }

  private trackUserTiming() {
    if ('PerformanceObserver' in window) {
      try {
        const userTimingObserver = new PerformanceObserver((list) => {
          const entries = list.getEntries();
          entries.forEach((entry) => {
            this.recordMetric({
              name: 'user_timing',
              value: entry.duration || entry.startTime,
              timestamp: Date.now(),
              tags: { 
                type: 'user_timing',
                entry_type: entry.entryType 
              },
              metadata: {
                name: entry.name,
                detail: (entry as any).detail
              }
            });
          });
        });
        
        userTimingObserver.observe({ entryTypes: ['measure', 'mark'] });
        this.observers.set('user-timing', userTimingObserver);
      } catch (e) {
        console.warn('User timing observer not supported');
      }
    }
  }

  private setupErrorTracking() {
    // JavaScript errors
    window.addEventListener('error', (event) => {
      this.recordMetric({
        name: 'javascript_error',
        value: 1,
        timestamp: Date.now(),
        tags: { type: 'error' },
        metadata: {
          message: event.message,
          filename: event.filename,
          lineno: event.lineno,
          colno: event.colno,
          stack: event.error?.stack
        }
      });
    });

    // Unhandled promise rejections
    window.addEventListener('unhandledrejection', (event) => {
      this.recordMetric({
        name: 'unhandled_rejection',
        value: 1,
        timestamp: Date.now(),
        tags: { type: 'error' },
        metadata: {
          reason: event.reason?.toString(),
          stack: event.reason?.stack
        }
      });
    });
  }

  // Public API
  recordMetric(metric: PerformanceMetric) {
    this.metrics.push(metric);
    
    // Check thresholds and warn if exceeded
    this.checkThresholds(metric);
    
    // Send to analytics if available
    this.sendToAnalytics(metric);
    
    // Keep only last 1000 metrics to prevent memory leaks
    if (this.metrics.length > 1000) {
      this.metrics = this.metrics.slice(-1000);
    }
  }

  mark(name: string, detail?: any) {
    if ('performance' in window && 'mark' in performance) {
      performance.mark(name, { detail });
    }
  }

  measure(name: string, startMark?: string, endMark?: string) {
    if ('performance' in window && 'measure' in performance) {
      try {
        performance.measure(name, startMark, endMark);
      } catch (e) {
        console.warn(`Failed to measure ${name}:`, e);
      }
    }
  }

  // Measure component render time
  measureComponent(componentName: string) {
    const startMark = `${componentName}-start`;
    const endMark = `${componentName}-end`;
    const measureName = `${componentName}-render`;

    return {
      start: () => this.mark(startMark),
      end: () => {
        this.mark(endMark);
        this.measure(measureName, startMark, endMark);
      }
    };
  }

  // Measure async operations
  async measureAsync<T>(name: string, operation: () => Promise<T>): Promise<T> {
    const startTime = performance.now();
    
    try {
      const result = await operation();
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name: `async_${name}`,
        value: duration,
        timestamp: Date.now(),
        tags: { type: 'async_operation', status: 'success' }
      });
      
      return result;
    } catch (error) {
      const duration = performance.now() - startTime;
      
      this.recordMetric({
        name: `async_${name}`,
        value: duration,
        timestamp: Date.now(),
        tags: { type: 'async_operation', status: 'error' },
        metadata: { error: error instanceof Error ? error.message : String(error) }
      });
      
      throw error;
    }
  }

  private checkThresholds(metric: PerformanceMetric) {
    const threshold = this.thresholds[metric.name as keyof PerformanceThresholds];
    
    if (threshold && metric.value > threshold) {
      console.warn(`Performance threshold exceeded for ${metric.name}: ${metric.value}ms > ${threshold}ms`);
      
      // Record threshold violation
      this.recordMetric({
        name: 'threshold_violation',
        value: metric.value - threshold,
        timestamp: Date.now(),
        tags: { 
          type: 'threshold',
          metric_name: metric.name 
        },
        metadata: {
          threshold,
          actual: metric.value
        }
      });
    }
  }

  private sendToAnalytics(metric: PerformanceMetric) {
    // Send to Google Analytics if available
    if (window.gtag) {
      window.gtag('event', 'performance_metric', {
        event_category: 'Performance',
        event_label: metric.name,
        value: Math.round(metric.value),
        custom_map: {
          metric_type: metric.tags?.type || 'unknown'
        }
      });
    }

    // Send to custom analytics endpoint
    if (process.env.NODE_ENV === 'production') {
      // Batch and send metrics to your analytics service
      this.batchAndSendMetrics([metric]);
    }
  }

  private batchAndSendMetrics(metrics: PerformanceMetric[]) {
    // Implementation for sending metrics to your backend
    // This could be done via fetch to your analytics endpoint
    fetch('/api/analytics/performance', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({ metrics }),
    }).catch(error => {
      console.warn('Failed to send performance metrics:', error);
    });
  }

  getMetrics(filter?: { name?: string; type?: string; since?: number }) {
    let filteredMetrics = this.metrics;

    if (filter) {
      if (filter.name) {
        filteredMetrics = filteredMetrics.filter(m => m.name === filter.name);
      }
      if (filter.type) {
        filteredMetrics = filteredMetrics.filter(m => m.tags?.type === filter.type);
      }
      if (filter.since) {
        filteredMetrics = filteredMetrics.filter(m => m.timestamp >= filter.since!);
      }
    }

    return filteredMetrics;
  }

  getPerformanceSummary() {
    const now = Date.now();
    const last5Minutes = now - 5 * 60 * 1000;
    const recentMetrics = this.getMetrics({ since: last5Minutes });

    const summary = {
      totalMetrics: recentMetrics.length,
      webVitals: {
        lcp: recentMetrics.filter(m => m.name === 'lcp').pop()?.value,
        fid: recentMetrics.filter(m => m.name === 'fid').pop()?.value,
        cls: recentMetrics.filter(m => m.name === 'cls').pop()?.value,
        ttfb: recentMetrics.filter(m => m.name === 'ttfb').pop()?.value,
      },
      errors: recentMetrics.filter(m => m.tags?.type === 'error').length,
      slowResources: recentMetrics.filter(m => m.name === 'slow_resource').length,
      thresholdViolations: recentMetrics.filter(m => m.name === 'threshold_violation').length,
    };

    return summary;
  }

  destroy() {
    // Disconnect all observers
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
    
    // Clear metrics
    this.metrics = [];
    
    this.isInitialized = false;
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();

// React hook for performance monitoring
export const usePerformanceMonitoring = () => {
  const measureComponent = (componentName: string) => {
    return performanceMonitoringService.measureComponent(componentName);
  };

  const measureAsync = <T>(name: string, operation: () => Promise<T>) => {
    return performanceMonitoringService.measureAsync(name, operation);
  };

  const recordMetric = (metric: PerformanceMetric) => {
    performanceMonitoringService.recordMetric(metric);
  };

  return {
    measureComponent,
    measureAsync,
    recordMetric,
    getMetrics: performanceMonitoringService.getMetrics.bind(performanceMonitoringService),
    getSummary: performanceMonitoringService.getPerformanceSummary.bind(performanceMonitoringService),
  };
};

export default performanceMonitoringService;