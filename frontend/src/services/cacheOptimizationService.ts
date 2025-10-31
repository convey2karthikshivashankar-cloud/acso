interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

interface CacheConfig {
  maxSize: number;
  defaultTTL: number;
  cleanupInterval: number;
  strategy: 'LRU' | 'LFU' | 'FIFO';
}

export class OptimizedCache<T> {
  private cache = new Map<string, CacheEntry<T>>();
  private config: CacheConfig;
  private cleanupTimer?: NodeJS.Timeout;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 1000,
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      cleanupInterval: 60 * 1000, // 1 minute
      strategy: 'LRU',
      ...config
    };

    this.startCleanup();
  }

  set(key: string, data: T, ttl?: number): void {
    const now = Date.now();
    const entry: CacheEntry<T> = {
      data,
      timestamp: now,
      ttl: ttl || this.config.defaultTTL,
      accessCount: 0,
      lastAccessed: now
    };

    // Check if we need to evict entries
    if (this.cache.size >= this.config.maxSize) {
      this.evict();
    }

    this.cache.set(key, entry);
  }

  get(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      return null;
    }

    const now = Date.now();
    
    // Check if entry has expired
    if (now - entry.timestamp > entry.ttl) {
      this.cache.delete(key);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = now;

    return entry.data;
  }

  has(key: string): boolean {
    return this.get(key) !== null;
  }

  delete(key: string): boolean {
    return this.cache.delete(key);
  }

  clear(): void {
    this.cache.clear();
  }

  private evict(): void {
    if (this.cache.size === 0) return;

    let keyToEvict: string;

    switch (this.config.strategy) {
      case 'LRU':
        keyToEvict = this.findLRUKey();
        break;
      case 'LFU':
        keyToEvict = this.findLFUKey();
        break;
      case 'FIFO':
        keyToEvict = this.findFIFOKey();
        break;
      default:
        keyToEvict = this.cache.keys().next().value;
    }

    this.cache.delete(keyToEvict);
  }

  private findLRUKey(): string {
    let oldestKey = '';
    let oldestTime = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private findLFUKey(): string {
    let leastUsedKey = '';
    let leastCount = Infinity;

    for (const [key, entry] of this.cache) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  private findFIFOKey(): string {
    let oldestKey = '';
    let oldestTimestamp = Date.now();

    for (const [key, entry] of this.cache) {
      if (entry.timestamp < oldestTimestamp) {
        oldestTimestamp = entry.timestamp;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private startCleanup(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, this.config.cleanupInterval);
  }

  private cleanup(): void {
    const now = Date.now();
    const keysToDelete: string[] = [];

    for (const [key, entry] of this.cache) {
      if (now - entry.timestamp > entry.ttl) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.cache.delete(key));
  }

  getStats() {
    return {
      size: this.cache.size,
      maxSize: this.config.maxSize,
      strategy: this.config.strategy,
      entries: Array.from(this.cache.entries()).map(([key, entry]) => ({
        key,
        size: JSON.stringify(entry.data).length,
        accessCount: entry.accessCount,
        age: Date.now() - entry.timestamp,
        ttl: entry.ttl
      }))
    };
  }

  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.clear();
  }
}

// API Response Cache with compression
export class APIResponseCache {
  private cache: OptimizedCache<string>;
  private compressionEnabled: boolean;

  constructor(config?: Partial<CacheConfig>, enableCompression = true) {
    this.cache = new OptimizedCache(config);
    this.compressionEnabled = enableCompression;
  }

  async set(key: string, data: any, ttl?: number): Promise<void> {
    let serializedData = JSON.stringify(data);
    
    if (this.compressionEnabled && serializedData.length > 1024) {
      // In a real implementation, you'd use a compression library like pako
      serializedData = this.compress(serializedData);
    }
    
    this.cache.set(key, serializedData, ttl);
  }

  async get(key: string): Promise<any | null> {
    const cachedData = this.cache.get(key);
    
    if (!cachedData) {
      return null;
    }

    try {
      let data = cachedData;
      
      if (this.compressionEnabled && this.isCompressed(data)) {
        data = this.decompress(data);
      }
      
      return JSON.parse(data);
    } catch (error) {
      console.error('Error parsing cached data:', error);
      this.cache.delete(key);
      return null;
    }
  }

  private compress(data: string): string {
    // Simplified compression - in production use a proper compression library
    return `compressed:${btoa(data)}`;
  }

  private decompress(data: string): string {
    // Simplified decompression
    return atob(data.replace('compressed:', ''));
  }

  private isCompressed(data: string): boolean {
    return data.startsWith('compressed:');
  }

  clear(): void {
    this.cache.clear();
  }

  getStats() {
    return this.cache.getStats();
  }
}

// Memory usage monitor
export class MemoryMonitor {
  private static instance: MemoryMonitor;
  private observers: ((usage: any) => void)[] = [];
  private monitoringInterval?: NodeJS.Timeout;

  static getInstance(): MemoryMonitor {
    if (!MemoryMonitor.instance) {
      MemoryMonitor.instance = new MemoryMonitor();
    }
    return MemoryMonitor.instance;
  }

  startMonitoring(interval = 5000): void {
    this.monitoringInterval = setInterval(() => {
      const usage = this.getMemoryUsage();
      this.observers.forEach(observer => observer(usage));
    }, interval);
  }

  stopMonitoring(): void {
    if (this.monitoringInterval) {
      clearInterval(this.monitoringInterval);
    }
  }

  getMemoryUsage() {
    if ('memory' in performance) {
      return {
        usedJSHeapSize: (performance as any).memory.usedJSHeapSize,
        totalJSHeapSize: (performance as any).memory.totalJSHeapSize,
        jsHeapSizeLimit: (performance as any).memory.jsHeapSizeLimit,
        timestamp: Date.now()
      };
    }
    return null;
  }

  subscribe(observer: (usage: any) => void): () => void {
    this.observers.push(observer);
    return () => {
      const index = this.observers.indexOf(observer);
      if (index > -1) {
        this.observers.splice(index, 1);
      }
    };
  }
}