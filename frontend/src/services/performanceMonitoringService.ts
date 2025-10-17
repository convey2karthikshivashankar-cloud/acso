export interface PerformanceMetrics {
  // Core Web Vitals
  lcp: number; // Largest Contentful Paint
  fid: number; // First Input Delay
  cls: number; // Cumulative Layout Shift
  fcp: number; // First Contentful Paint
  ttfb: number; // Time to First Byte
  
  // Custom metrics
  pageLoadTime: number;
  domContentLoaded: number;
  resourceLoadTime: number;
  jsExecutionTime: number;
  renderTime: number;
  
  // User experience metrics
  timeToInteractive: number;
  totalBlockingTime: number;
  speedIndex: number;
  
  // Memory and resource usage
  memoryUsage: {
    used: number;
    total: number;
    limit: number;
  };
  
  // Network metrics
  connectionType: string;
  effectiveType: string;
  downlink: number;
  rtt: number;
}

export interface PerformanceAlert {
  id: string;
  type: 'threshold' | 'regression' | 'anomaly';
  metric: keyof PerformanceMetrics;
  value: number;
  threshold: number;
  severity: 'low' | 'medium' | 'high' | 'critical';
  message: string;
  timestamp: Date;
  url: string;
  userAgent: string;
}

export interface PerformanceBudget {
  metric: keyof PerformanceMetrics;
  budget: number;
  warning: number;
  current: number;
  status: 'good' | 'warning' | 'exceeded';
}

class PerformanceMonitoringService {
  private observer: PerformanceObserver | null = null;
  private metrics: Partial<PerformanceMetrics> = {};
  private alerts: PerformanceAlert[] = [];
  private budgets: PerformanceBudget[] = [];
  private isMonitoring = false;

  constructor() {
    this.initializeBudgets();
    this.startMonitoring();
  }

  private initializeBudgets() {
    this.budgets = [
      { metric: 'lcp', budget: 2500, warning: 2000, current: 0, status: 'good' },
      { metric: 'fid', budget: 100, warning: 75, current: 0, status: 'good' },
      { metric: 'cls', budget: 0.1, warning: 0.05, current: 0, status: 'good' },
      { metric: 'fcp', budget: 1800, warning: 1500, current: 0, status: 'good' },
      { metric: 'ttfb', budget: 800, warning: 600, current: 0, status: 'good' },
      { metric: 'pageLoadTime', budget: 3000, warning: 2500, current: 0, status: 'good' },
    ];
  }

  startMonitoring(): void {
    if (this.isMonitoring || typeof window === 'undefined') return;

    this.isMonitoring = true;
    this.observeWebVitals();
    this.observeNavigation();
    this.observeResources();
    this.observeMemory();
    this.observeNetwork();
    this.setupErrorTracking();
  }

  stopMonitoring(): void {
    if (this.observer) {
      this.observer.disconnect();
      this.observer = null;
    }
    this.isMonitoring = false;
  }

  private observeWebVitals(): void {
    if (!('PerformanceObserver' in window)) return;

    // Observe Core Web Vitals
    const observer = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        switch (entry.entryType) {
          case 'largest-contentful-paint':
            this.updateMetric('lcp', entry.startTime);
            break;
          case 'first-input':
            this.updateMetric('fid', (entry as any).processingStart - entry.startTime);
            break;
          case 'layout-shift':
            if (!(entry as any).hadRecentInput) {
              this.updateMetric('cls', (this.metrics.cls || 0) + (entry as any).value);
            }
            break;
        }
      }
    });

    try {
      observer.observe({ entryTypes: ['largest-contentful-paint', 'first-input', 'layout-shift'] });
      this.observer = observer;
    } catch (error) {
      console.warn('Performance Observer not supported:', error);
    }

    // Observe paint metrics
    const paintObserver = new PerformanceObserver((list) => {
      for (const entry of list.getEntries()) {
        if (entry.name === 'first-contentful-paint') {
          this.updateMetric('fcp', entry.startTime);
        }
      }
    });

    try {
      paintObserver.observe({ entryTypes: ['paint'] });
    } catch (error) {
      console.warn('Paint observer not supported:', error);
    }
  }

  private observeNavigation(): void {
    if (!('PerformanceNavigationTiming' in window)) return;

    const navigationEntries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[];
    if (navigationEntries.length > 0) {
      const nav = navigationEntries[0];
      
      this.updateMetric('ttfb', nav.responseStart - nav.requestStart);
      this.updateMetric('domContentLoaded', nav.domContentLoadedEventEnd - nav.navigationStart);
      this.updateMetric('pageLoadTime', nav.loadEventEnd - nav.navigationStart);
      this.updateMetric('renderTime', nav.domComplete - nav.domLoading);
    }
  }

  private observeResources(): void {
    const resourceObserver = new PerformanceObserver((list) => {
      let totalResourceTime = 0;
      let jsExecutionTime = 0;

      for (const entry of list.getEntries()) {
        const resource = entry as PerformanceResourceTiming;
        totalResourceTime += resource.responseEnd - resource.startTime;

        if (resource.name.includes('.js')) {
          jsExecutionTime += resource.responseEnd - resource.startTime;
        }
      }

      this.updateMetric('resourceLoadTime', totalResourceTime);
      this.updateMetric('jsExecutionTime', jsExecutionTime);
    });

    try {
      resourceObserver.observe({ entryTypes: ['resource'] });
    } catch (error) {
      console.warn('Resource observer not supported:', error);
    }
  }

  private observeMemory(): void {
    if ('memory' in performance) {
      const memory = (performance as any).memory;
      this.updateMetric('memoryUsage', {
        used: memory.usedJSHeapSize,
        total: memory.totalJSHeapSize,
        limit: memory.jsHeapSizeLimit,
      });
    }
  }

  private observeNetwork(): void {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      this.metrics.connectionType = connection.type || 'unknown';
      this.metrics.effectiveType = connection.effectiveType || 'unknown';
      this.metrics.downlink = connection.downlink || 0;
      this.metrics.rtt = connection.rtt || 0;
    }
  }

  private setupErrorTracking(): void {
    window.addEventListener('error', (event) => {
      this.trackError({
        type: 'javascript',
        message: event.message,
        filename: event.filename,
        lineno: event.lineno,
        colno: event.colno,
        stack: event.error?.stack,
        timestamp: new Date(),
      });
    });

    window.addEventListener('unhandledrejection', (event) => {
      this.trackError({
        type: 'promise',
        message: event.reason?.message || 'Unhandled promise rejection',
        stack: event.reason?.stack,
        timestamp: new Date(),
      });
    });
  }

  private updateMetric(key: keyof PerformanceMetrics, value: any): void {
    this.metrics[key] = value;
    this.checkBudgets(key, value);
    this.checkAlerts(key, value);
  }

  private checkBudgets(metric: keyof PerformanceMetrics, value: number): void {
    const budget = this.budgets.find(b => b.metric === metric);
    if (!budget || typeof value !== 'number') return;

    budget.current = value;
    
    if (value > budget.budget) {
      budget.status = 'exceeded';
    } else if (value > budget.warning) {
      budget.status = 'warning';
    } else {
      budget.status = 'good';
    }
  }

  private checkAlerts(metric: keyof PerformanceMetrics, value: number): void {
    const budget = this.budgets.find(b => b.metric === metric);
    if (!budget || typeof value !== 'number') return;

    if (value > budget.budget) {
      const alert: PerformanceAlert = {
        id: Date.now().toString(),
        type: 'threshold',
        metric,
        value,
        threshold: budget.budget,
        severity: value > budget.budget * 1.5 ? 'critical' : 'high',
        message: `${metric} exceeded budget: ${value.toFixed(2)}ms > ${budget.budget}ms`,
        timestamp: new Date(),
        url: window.location.href,
        userAgent: navigator.userAgent,
      };
      
      this.alerts.push(alert);
      this.sendAlert(alert);
    }
  }

  private sendAlert(alert: PerformanceAlert): void {
    // In a real implementation, this would send to monitoring service
    console.warn('Performance Alert:', alert);
    
    // Could integrate with services like Sentry, DataDog, etc.
    if (window.gtag) {
      window.gtag('event', 'performance_alert', {
        metric: alert.metric,
        value: alert.value,
        severity: alert.severity,
      });
    }
  }

  private trackError(error: any): void {
    // Track JavaScript errors for performance impact analysis
    console.error('Performance Error Tracked:', error);
  }

  getMetrics(): PerformanceMetrics {
    return { ...this.metrics } as PerformanceMetrics;
  }

  getBudgets(): PerformanceBudget[] {
    return [...this.budgets];
  }

  getAlerts(): PerformanceAlert[] {
    return [...this.alerts];
  }

  clearAlerts(): void {
    this.alerts = [];
  }

  // Custom timing measurement
  mark(name: string): void {
    if ('mark' in performance) {
      performance.mark(name);
    }
  }

  measure(name: string, startMark: string, endMark?: string): number {
    if ('measure' in performance) {
      performance.measure(name, startMark, endMark);
      const measures = performance.getEntriesByName(name, 'measure');
      return measures.length > 0 ? measures[measures.length - 1].duration : 0;
    }
    return 0;
  }

  // Track custom user interactions
  trackUserTiming(action: string, duration: number): void {
    this.updateMetric('timeToInteractive', duration);
    
    // Send to analytics
    if (window.gtag) {
      window.gtag('event', 'user_timing', {
        action,
        duration,
        timestamp: Date.now(),
      });
    }
  }

  // Generate performance report
  generateReport(): {
    metrics: PerformanceMetrics;
    budgets: PerformanceBudget[];
    alerts: PerformanceAlert[];
    recommendations: string[];
    score: number;
  } {
    const metrics = this.getMetrics();
    const budgets = this.getBudgets();
    const alerts = this.getAlerts();
    
    const recommendations: string[] = [];
    let score = 100;

    // Analyze metrics and generate recommendations
    budgets.forEach(budget => {
      if (budget.status === 'exceeded') {
        score -= 20;
        recommendations.push(`Optimize ${budget.metric}: current ${budget.current.toFixed(2)} exceeds budget ${budget.budget}`);
      } else if (budget.status === 'warning') {
        score -= 10;
        recommendations.push(`Monitor ${budget.metric}: approaching budget limit`);
      }
    });

    // Additional recommendations based on metrics
    if (metrics.memoryUsage && metrics.memoryUsage.used > metrics.memoryUsage.total * 0.8) {
      recommendations.push('High memory usage detected - consider optimizing component lifecycle');
    }

    if (metrics.jsExecutionTime > 1000) {
      recommendations.push('JavaScript execution time is high - consider code splitting');
    }

    return {
      metrics,
      budgets,
      alerts,
      recommendations,
      score: Math.max(0, score),
    };
  }

  // Export data for external analysis
  exportData(): string {
    return JSON.stringify({
      metrics: this.getMetrics(),
      budgets: this.getBudgets(),
      alerts: this.getAlerts(),
      timestamp: new Date().toISOString(),
      url: window.location.href,
      userAgent: navigator.userAgent,
    }, null, 2);
  }
}

export const performanceMonitoringService = new PerformanceMonitoringService();