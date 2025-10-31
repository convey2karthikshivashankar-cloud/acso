// Performance optimization utilities
export class PerformanceOptimizer {
  private static instance: PerformanceOptimizer;
  private observers: Map<string, IntersectionObserver> = new Map();
  private loadedChunks: Set<string> = new Set();

  static getInstance(): PerformanceOptimizer {
    if (!PerformanceOptimizer.instance) {
      PerformanceOptimizer.instance = new PerformanceOptimizer();
    }
    return PerformanceOptimizer.instance;
  }

  // Lazy loading with intersection observer
  observeElement(element: Element, callback: () => void, options?: IntersectionObserverInit): void {
    const observer = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          callback();
          observer.unobserve(entry.target);
        }
      });
    }, { threshold: 0.1, ...options });

    observer.observe(element);
    this.observers.set(element.id || Math.random().toString(), observer);
  }

  // Preload critical resources
  preloadResource(url: string, type: 'script' | 'style' | 'image' | 'font'): void {
    const link = document.createElement('link');
    link.rel = 'preload';
    link.href = url;
    
    switch (type) {
      case 'script':
        link.as = 'script';
        break;
      case 'style':
        link.as = 'style';
        break;
      case 'image':
        link.as = 'image';
        break;
      case 'font':
        link.as = 'font';
        link.crossOrigin = 'anonymous';
        break;
    }
    
    document.head.appendChild(link);
  }

  // Bundle splitting helper
  async loadChunk(chunkName: string): Promise<any> {
    if (this.loadedChunks.has(chunkName)) {
      return Promise.resolve();
    }

    try {
      const module = await import(/* webpackChunkName: "[request]" */ `../chunks/${chunkName}`);
      this.loadedChunks.add(chunkName);
      return module;
    } catch (error) {
      console.error(`Failed to load chunk: ${chunkName}`, error);
      throw error;
    }
  }

  // Memory cleanup
  cleanup(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers.clear();
  }
}

// Virtual scrolling utility
export class VirtualScrollManager {
  private container: HTMLElement;
  private itemHeight: number;
  private visibleCount: number;
  private totalCount: number;
  private scrollTop: number = 0;
  private renderCallback: (startIndex: number, endIndex: number) => void;

  constructor(
    container: HTMLElement,
    itemHeight: number,
    visibleCount: number,
    totalCount: number,
    renderCallback: (startIndex: number, endIndex: number) => void
  ) {
    this.container = container;
    this.itemHeight = itemHeight;
    this.visibleCount = visibleCount;
    this.totalCount = totalCount;
    this.renderCallback = renderCallback;
    
    this.setupScrollListener();
  }

  private setupScrollListener(): void {
    this.container.addEventListener('scroll', this.handleScroll.bind(this));
  }

  private handleScroll(): void {
    this.scrollTop = this.container.scrollTop;
    this.updateVisibleItems();
  }

  private updateVisibleItems(): void {
    const startIndex = Math.floor(this.scrollTop / this.itemHeight);
    const endIndex = Math.min(startIndex + this.visibleCount, this.totalCount);
    
    this.renderCallback(startIndex, endIndex);
  }

  updateTotalCount(newCount: number): void {
    this.totalCount = newCount;
    this.updateVisibleItems();
  }

  scrollToIndex(index: number): void {
    const scrollTop = index * this.itemHeight;
    this.container.scrollTop = scrollTop;
  }

  destroy(): void {
    this.container.removeEventListener('scroll', this.handleScroll.bind(this));
  }
}

// Image optimization
export const optimizeImage = (src: string, options: {
  width?: number;
  height?: number;
  quality?: number;
  format?: 'webp' | 'avif' | 'jpeg' | 'png';
} = {}): string => {
  const { width, height, quality = 80, format = 'webp' } = options;
  
  // In a real implementation, this would integrate with an image optimization service
  const params = new URLSearchParams();
  if (width) params.append('w', width.toString());
  if (height) params.append('h', height.toString());
  params.append('q', quality.toString());
  params.append('f', format);
  
  return `${src}?${params.toString()}`;
};

// Performance monitoring
export class PerformanceMonitor {
  private metrics: Map<string, number[]> = new Map();
  private observers: PerformanceObserver[] = [];

  startMonitoring(): void {
    // Monitor navigation timing
    if ('performance' in window && 'getEntriesByType' in performance) {
      const navigationEntries = performance.getEntriesByType('navigation');
      navigationEntries.forEach(entry => {
        console.log('Navigation timing:', entry);
      });
    }

    // Monitor resource timing
    const resourceObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'resource') {
          this.recordMetric('resource_load_time', entry.duration);
        }
      });
    });
    resourceObserver.observe({ entryTypes: ['resource'] });
    this.observers.push(resourceObserver);

    // Monitor paint timing
    const paintObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        this.recordMetric(entry.name, entry.startTime);
      });
    });
    paintObserver.observe({ entryTypes: ['paint'] });
    this.observers.push(paintObserver);

    // Monitor layout shifts
    const layoutShiftObserver = new PerformanceObserver((list) => {
      list.getEntries().forEach(entry => {
        if (entry.entryType === 'layout-shift' && !(entry as any).hadRecentInput) {
          this.recordMetric('cumulative_layout_shift', (entry as any).value);
        }
      });
    });
    layoutShiftObserver.observe({ entryTypes: ['layout-shift'] });
    this.observers.push(layoutShiftObserver);
  }

  recordMetric(name: string, value: number): void {
    if (!this.metrics.has(name)) {
      this.metrics.set(name, []);
    }
    this.metrics.get(name)!.push(value);
  }

  getMetrics(): Record<string, { avg: number; min: number; max: number; count: number }> {
    const result: Record<string, { avg: number; min: number; max: number; count: number }> = {};
    
    this.metrics.forEach((values, name) => {
      result[name] = {
        avg: values.reduce((sum, val) => sum + val, 0) / values.length,
        min: Math.min(...values),
        max: Math.max(...values),
        count: values.length
      };
    });
    
    return result;
  }

  stopMonitoring(): void {
    this.observers.forEach(observer => observer.disconnect());
    this.observers = [];
  }
}

// Bundle analyzer helper
export const analyzeBundleSize = (): void => {
  if (process.env.NODE_ENV === 'development') {
    import('webpack-bundle-analyzer').then(({ BundleAnalyzerPlugin }) => {
      console.log('Bundle analysis available in development mode');
    }).catch(() => {
      console.log('Bundle analyzer not available');
    });
  }
};

// Tree shaking helper
export const dynamicImport = async <T>(
  importFn: () => Promise<{ default: T }>,
  fallback?: T
): Promise<T> => {
  try {
    const module = await importFn();
    return module.default;
  } catch (error) {
    console.error('Dynamic import failed:', error);
    if (fallback) {
      return fallback;
    }
    throw error;
  }
};