interface CacheConfig {
  maxSize: number;
  ttl: number; // Time to live in milliseconds
  enableCompression: boolean;
  enablePersistence: boolean;
}

interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  size: number;
  compressed?: boolean;
}

interface PrefetchConfig {
  enabled: boolean;
  maxConcurrent: number;
  priority: 'high' | 'normal' | 'low';
  delay: number;
}

class OptimizationService {
  private cache = new Map<string, CacheEntry<any>>();
  private cacheConfig: CacheConfig;
  private prefetchQueue: Array<{ url: string; priority: number }> = [];
  private activePrefetches = new Set<string>();
  private compressionWorker?: Worker;

  constructor(config: Partial<CacheConfig> = {}) {
    this.cacheConfig = {
      maxSize: 50 * 1024 * 1024, // 50MB
      ttl: 5 * 60 * 1000, // 5 minutes
      enableCompression: true,
      enablePersistence: true,
      ...config,
    };

    this.initializeCompression();
    this.loadPersistedCache();
    this.startCacheCleanup();
  }

  private initializeCompression(): void {
    if (this.cacheConfig.enableCompression && 'Worker' in window) {
      try {
        // Create compression worker
        const workerCode = `
          self.onmessage = function(e) {
            const { id, action, data } = e.data;
            
            if (action === 'compress') {
              try {
                const compressed = new TextEncoder().encode(JSON.stringify(data));
                self.postMessage({ id, result: compressed, success: true });
              } catch (error) {
                self.postMessage({ id, error: error.message, success: false });
              }
            } else if (action === 'decompress') {
              try {
                const decompressed = JSON.parse(new TextDecoder().decode(data));
                self.postMessage({ id, result: decompressed, success: true });
              } catch (error) {
                self.postMessage({ id, error: error.message, success: false });
              }
            }
          };
        `;
        
        const blob = new Blob([workerCode], { type: 'application/javascript' });
        this.compressionWorker = new Worker(URL.createObjectURL(blob));
      } catch (error) {
        console.warn('Failed to initialize compression worker:', error);
      }
    }
  }

  private loadPersistedCache(): void {
    if (!this.cacheConfig.enablePersistence) return;

    try {
      const persistedData = localStorage.getItem('optimization_cache');
      if (persistedData) {
        const parsed = JSON.parse(persistedData);
        const now = Date.now();
        
        Object.entries(parsed).forEach(([key, entry]: [string, any]) => {
          if (entry.timestamp + entry.ttl > now) {
            this.cache.set(key, entry);
          }
        });
      }
    } catch (error) {
      console.warn('Failed to load persisted cache:', error);
    }
  }

  private persistCache(): void {
    if (!this.cacheConfig.enablePersistence) return;

    try {
      const cacheObject = Object.fromEntries(this.cache.entries());
      localStorage.setItem('optimization_cache', JSON.stringify(cacheObject));
    } catch (error) {
      console.warn('Failed to persist cache:', error);
    }
  }

  private startCacheCleanup(): void {
    setInterval(() => {
      this.cleanupExpiredEntries();
      this.enforceMaxSize();
      this.persistCache();
    }, 60000); // Cleanup every minute
  }

  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expiredKeys: string[] = [];

    this.cache.forEach((entry, key) => {
      if (now - entry.timestamp > entry.ttl) {
        expiredKeys.push(key);
      }
    });

    expiredKeys.forEach(key => this.cache.delete(key));
  }

  private enforceMaxSize(): void {
    const currentSize = this.getCurrentCacheSize();
    if (currentSize <= this.cacheConfig.maxSize) return;

    // Sort entries by timestamp (LRU)
    const entries = Array.from(this.cache.entries()).sort(
      ([, a], [, b]) => a.timestamp - b.timestamp
    );

    let removedSize = 0;
    const targetSize = this.cacheConfig.maxSize * 0.8; // Remove to 80% of max size

    for (const [key, entry] of entries) {
      this.cache.delete(key);
      removedSize += entry.size;
      
      if (currentSize - removedSize <= targetSize) {
        break;
      }
    }
  }

  private getCurrentCacheSize(): number {
    let totalSize = 0;
    this.cache.forEach(entry => {
      totalSize += entry.size;
    });
    return totalSize;
  }

  private calculateSize(data: any): number {
    return new Blob([JSON.stringify(data)]).size;
  }

  // Cache management
  async set<T>(key: string, data: T, ttl?: number): Promise<void> {
    const entryTtl = ttl || this.cacheConfig.ttl;
    const size = this.calculateSize(data);
    
    let finalData = data;
    let compressed = false;

    // Compress large entries
    if (this.cacheConfig.enableCompression && size > 1024 && this.compressionWorker) {
      try {
        finalData = await this.compressData(data);
        compressed = true;
      } catch (error) {
        console.warn('Compression failed, storing uncompressed:', error);
      }
    }

    const entry: CacheEntry<T> = {
      data: finalData,
      timestamp: Date.now(),
      ttl: entryTtl,
      size,
      compressed,
    };

    this.cache.set(key, entry);
  }

  async get<T>(key: string): Promise<T | null> {
    const entry = this.cache.get(key);
    if (!entry) return null;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update timestamp for LRU
    entry.timestamp = Date.now();

    // Decompress if needed
    if (entry.compressed && this.compressionWorker) {
      try {
        return await this.decompressData(entry.data);
      } catch (error) {
        console.warn('Decompression failed:', error);
        this.cache.delete(key);
        return null;
      }
    }

    return entry.data;
  }

  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;

    // Check if expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return false;
    }

    return true;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
    if (this.cacheConfig.enablePersistence) {
      localStorage.removeItem('optimization_cache');
    }
  }

  private compressData(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.compressionWorker) {
        reject(new Error('Compression worker not available'));
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({ id, action: 'compress', data });
    });
  }

  private decompressData(data: any): Promise<any> {
    return new Promise((resolve, reject) => {
      if (!this.compressionWorker) {
        reject(new Error('Compression worker not available'));
        return;
      }

      const id = Math.random().toString(36).substr(2, 9);
      
      const handleMessage = (e: MessageEvent) => {
        if (e.data.id === id) {
          this.compressionWorker!.removeEventListener('message', handleMessage);
          if (e.data.success) {
            resolve(e.data.result);
          } else {
            reject(new Error(e.data.error));
          }
        }
      };

      this.compressionWorker.addEventListener('message', handleMessage);
      this.compressionWorker.postMessage({ id, action: 'decompress', data });
    });
  }

  // Prefetching
  prefetch(url: string, priority: 'high' | 'normal' | 'low' = 'normal'): void {
    if (this.activePrefetches.has(url) || this.has(url)) {
      return;
    }

    const priorityValue = { high: 3, normal: 2, low: 1 }[priority];
    
    this.prefetchQueue.push({ url, priority: priorityValue });
    this.prefetchQueue.sort((a, b) => b.priority - a.priority);
    
    this.processPrefetchQueue();
  }

  private async processPrefetchQueue(): Promise<void> {
    if (this.activePrefetches.size >= 3 || this.prefetchQueue.length === 0) {
      return;
    }

    const item = this.prefetchQueue.shift();
    if (!item) return;

    this.activePrefetches.add(item.url);

    try {
      const response = await fetch(item.url, {
        method: 'GET',
        headers: { 'Cache-Control': 'no-cache' },
      });

      if (response.ok) {
        const data = await response.json();
        await this.set(item.url, data);
      }
    } catch (error) {
      console.warn('Prefetch failed for:', item.url, error);
    } finally {
      this.activePrefetches.delete(item.url);
      // Process next item
      setTimeout(() => this.processPrefetchQueue(), 100);
    }
  }

  // Resource optimization
  optimizeImages(): void {
    const images = document.querySelectorAll('img[data-src]');
    
    const imageObserver = new IntersectionObserver((entries) => {
      entries.forEach(entry => {
        if (entry.isIntersecting) {
          const img = entry.target as HTMLImageElement;
          const src = img.dataset.src;
          
          if (src) {
            img.src = src;
            img.removeAttribute('data-src');
            imageObserver.unobserve(img);
          }
        }
      });
    }, {
      rootMargin: '50px',
    });

    images.forEach(img => imageObserver.observe(img));
  }

  // Bundle optimization
  preloadCriticalResources(): void {
    const criticalResources = [
      '/api/user/profile',
      '/api/dashboard/widgets',
      '/api/notifications/unread',
    ];

    criticalResources.forEach(resource => {
      this.prefetch(resource, 'high');
    });
  }

  // Memory optimization
  optimizeMemoryUsage(): void {
    // Clean up event listeners
    this.cleanupEventListeners();
    
    // Force garbage collection if available
    if ('gc' in window && typeof (window as any).gc === 'function') {
      (window as any).gc();
    }
    
    // Clear expired cache entries
    this.cleanupExpiredEntries();
  }

  private cleanupEventListeners(): void {
    // Remove unused event listeners
    const elements = document.querySelectorAll('[data-cleanup-listeners]');
    elements.forEach(element => {
      const clone = element.cloneNode(true);
      element.parentNode?.replaceChild(clone, element);
    });
  }

  // Performance monitoring integration
  trackCachePerformance(): {
    hitRate: number;
    size: number;
    entries: number;
  } {
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? this.cacheHits / totalRequests : 0;
    
    return {
      hitRate,
      size: this.getCurrentCacheSize(),
      entries: this.cache.size,
    };
  }

  private cacheHits = 0;
  private cacheMisses = 0;

  // Override get method to track hits/misses
  async getWithTracking<T>(key: string): Promise<T | null> {
    const result = await this.get<T>(key);
    
    if (result !== null) {
      this.cacheHits++;
    } else {
      this.cacheMisses++;
    }
    
    return result;
  }

  // Service worker integration
  registerServiceWorker(): void {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('/sw.js')
        .then(registration => {
          console.log('Service Worker registered:', registration);
          
          // Update service worker when new version is available
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            if (newWorker) {
              newWorker.addEventListener('statechange', () => {
                if (newWorker.state === 'installed' && navigator.serviceWorker.controller) {
                  // New version available
                  this.notifyNewVersionAvailable();
                }
              });
            }
          });
        })
        .catch(error => {
          console.error('Service Worker registration failed:', error);
        });
    }
  }

  private notifyNewVersionAvailable(): void {
    // Dispatch custom event for new version notification
    window.dispatchEvent(new CustomEvent('new-version-available'));
  }

  // Critical resource hints
  addResourceHints(): void {
    const head = document.head;
    
    // DNS prefetch for external domains
    const dnsPrefetchDomains = [
      'https://api.acso.com',
      'https://cdn.acso.com',
    ];
    
    dnsPrefetchDomains.forEach(domain => {
      const link = document.createElement('link');
      link.rel = 'dns-prefetch';
      link.href = domain;
      head.appendChild(link);
    });
    
    // Preconnect to critical origins
    const preconnectOrigins = [
      'https://api.acso.com',
    ];
    
    preconnectOrigins.forEach(origin => {
      const link = document.createElement('link');
      link.rel = 'preconnect';
      link.href = origin;
      head.appendChild(link);
    });
  }

  // Cleanup
  destroy(): void {
    this.clear();
    
    if (this.compressionWorker) {
      this.compressionWorker.terminate();
    }
    
    this.prefetchQueue = [];
    this.activePrefetches.clear();
  }

  // Get cache statistics
  getStats(): {
    size: number;
    entries: number;
    hitRate: number;
    memoryUsage: string;
  } {
    const size = this.getCurrentCacheSize();
    const totalRequests = this.cacheHits + this.cacheMisses;
    const hitRate = totalRequests > 0 ? (this.cacheHits / totalRequests) * 100 : 0;
    
    return {
      size,
      entries: this.cache.size,
      hitRate: Math.round(hitRate * 100) / 100,
      memoryUsage: this.formatBytes(size),
    };
  }

  private formatBytes(bytes: number): string {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  }
}

// Create singleton instance
export const optimizationService = new OptimizationService();

// React hook for optimization
export const useOptimization = () => {
  const prefetch = (url: string, priority?: 'high' | 'normal' | 'low') => {
    optimizationService.prefetch(url, priority);
  };

  const cache = {
    set: <T>(key: string, data: T, ttl?: number) => optimizationService.set(key, data, ttl),
    get: <T>(key: string) => optimizationService.getWithTracking<T>(key),
    has: (key: string) => optimizationService.has(key),
    delete: (key: string) => optimizationService.delete(key),
  };

  const getStats = () => optimizationService.getStats();

  return {
    prefetch,
    cache,
    getStats,
  };
};

export default optimizationService;