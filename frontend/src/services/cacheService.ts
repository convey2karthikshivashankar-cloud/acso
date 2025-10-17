export interface CacheConfig {
  ttl: number; // Time to live in milliseconds
  maxSize: number; // Maximum number of entries
  strategy: 'lru' | 'fifo' | 'lfu'; // Cache eviction strategy
}

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  size: number;
  maxSize: number;
  hitRate: number;
  memoryUsage: number;
}

class CacheService {
  private caches = new Map<string, Map<string, CacheEntry<any>>>();
  private configs = new Map<string, CacheConfig>();
  private stats = new Map<string, CacheStats>();

  constructor() {
    this.setupDefaultCaches();
    this.startCleanupInterval();
  }

  private setupDefaultCaches() {
    // API response cache
    this.createCache('api', {
      ttl: 5 * 60 * 1000, // 5 minutes
      maxSize: 100,
      strategy: 'lru',
    });

    // Search results cache
    this.createCache('search', {
      ttl: 2 * 60 * 1000, // 2 minutes
      maxSize: 50,
      strategy: 'lru',
    });

    // User preferences cache
    this.createCache('preferences', {
      ttl: 30 * 60 * 1000, // 30 minutes
      maxSize: 20,
      strategy: 'lfu',
    });

    // Static data cache
    this.createCache('static', {
      ttl: 60 * 60 * 1000, // 1 hour
      maxSize: 200,
      strategy: 'lfu',
    });

    // Image cache
    this.createCache('images', {
      ttl: 24 * 60 * 60 * 1000, // 24 hours
      maxSize: 50,
      strategy: 'lru',
    });
  }

  createCache(name: string, config: CacheConfig): void {
    this.caches.set(name, new Map());
    this.configs.set(name, config);
    this.stats.set(name, {
      hits: 0,
      misses: 0,
      size: 0,
      maxSize: config.maxSize,
      hitRate: 0,
      memoryUsage: 0,
    });
  }

  set<T>(cacheName: string, key: string, data: T, customTtl?: number): void {
    const cache = this.caches.get(cacheName);
    const config = this.configs.get(cacheName);
    const stats = this.stats.get(cacheName);

    if (!cache || !config || !stats) {
      throw new Error(`Cache '${cacheName}' not found`);
    }

    const ttl = customTtl || config.ttl;
    const entry: CacheEntry<T> = {
      data,
      timestamp: Date.now(),
      ttl,
      accessCount: 0,
      lastAccessed: Date.now(),
    };

    // Check if we need to evict entries
    if (cache.size >= config.maxSize) {
      this.evict(cacheName);
    }

    cache.set(key, entry);
    stats.size = cache.size;
    this.updateMemoryUsage(cacheName);
  }

  get<T>(cacheName: string, key: string): T | null {
    const cache = this.caches.get(cacheName);
    const stats = this.stats.get(cacheName);

    if (!cache || !stats) {
      throw new Error(`Cache '${cacheName}' not found`);
    }

    const entry = cache.get(key);

    if (!entry) {
      stats.misses++;
      this.updateHitRate(cacheName);
      return null;
    }

    // Check if entry has expired
    if (Date.now() - entry.timestamp > entry.ttl) {
      cache.delete(key);
      stats.size = cache.size;
      stats.misses++;
      this.updateHitRate(cacheName);
      this.updateMemoryUsage(cacheName);
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    stats.hits++;
    this.updateHitRate(cacheName);

    return entry.data;
  }

  has(cacheName: string, key: string): boolean {
    return this.get(cacheName, key) !== null;
  }

  delete(cacheName: string, key: string): boolean {
    const cache = this.caches.get(cacheName);
    const stats = this.stats.get(cacheName);

    if (!cache || !stats) {
      throw new Error(`Cache '${cacheName}' not found`);
    }

    const deleted = cache.delete(key);
    if (deleted) {
      stats.size = cache.size;
      this.updateMemoryUsage(cacheName);
    }

    return deleted;
  }

  clear(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    const stats = this.stats.get(cacheName);

    if (!cache || !stats) {
      throw new Error(`Cache '${cacheName}' not found`);
    }

    cache.clear();
    stats.size = 0;
    stats.hits = 0;
    stats.misses = 0;
    stats.hitRate = 0;
    stats.memoryUsage = 0;
  }

  private evict(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    const config = this.configs.get(cacheName);

    if (!cache || !config) return;

    const entries = Array.from(cache.entries());
    let keyToEvict: string;

    switch (config.strategy) {
      case 'lru':
        // Evict least recently used
        keyToEvict = entries.reduce((oldest, [key, entry]) => {
          const oldestEntry = cache.get(oldest);
          return !oldestEntry || entry.lastAccessed < oldestEntry.lastAccessed ? key : oldest;
        }, entries[0][0]);
        break;

      case 'lfu':
        // Evict least frequently used
        keyToEvict = entries.reduce((leastUsed, [key, entry]) => {
          const leastUsedEntry = cache.get(leastUsed);
          return !leastUsedEntry || entry.accessCount < leastUsedEntry.accessCount ? key : leastUsed;
        }, entries[0][0]);
        break;

      case 'fifo':
      default:
        // Evict first in (oldest timestamp)
        keyToEvict = entries.reduce((oldest, [key, entry]) => {
          const oldestEntry = cache.get(oldest);
          return !oldestEntry || entry.timestamp < oldestEntry.timestamp ? key : oldest;
        }, entries[0][0]);
        break;
    }

    cache.delete(keyToEvict);
  }

  private updateHitRate(cacheName: string): void {
    const stats = this.stats.get(cacheName);
    if (!stats) return;

    const total = stats.hits + stats.misses;
    stats.hitRate = total > 0 ? (stats.hits / total) * 100 : 0;
  }

  private updateMemoryUsage(cacheName: string): void {
    const cache = this.caches.get(cacheName);
    const stats = this.stats.get(cacheName);

    if (!cache || !stats) return;

    // Rough estimation of memory usage
    let memoryUsage = 0;
    cache.forEach((entry, key) => {
      memoryUsage += key.length * 2; // String key size
      memoryUsage += JSON.stringify(entry.data).length * 2; // Data size estimation
      memoryUsage += 64; // Entry metadata overhead
    });

    stats.memoryUsage = memoryUsage;
  }

  private startCleanupInterval(): void {
    setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  private cleanup(): void {
    const now = Date.now();

    this.caches.forEach((cache, cacheName) => {
      const stats = this.stats.get(cacheName);
      if (!stats) return;

      const keysToDelete: string[] = [];

      cache.forEach((entry, key) => {
        if (now - entry.timestamp > entry.ttl) {
          keysToDelete.push(key);
        }
      });

      keysToDelete.forEach(key => cache.delete(key));
      
      if (keysToDelete.length > 0) {
        stats.size = cache.size;
        this.updateMemoryUsage(cacheName);
      }
    });
  }

  getStats(cacheName: string): CacheStats | null {
    return this.stats.get(cacheName) || null;
  }

  getAllStats(): Record<string, CacheStats> {
    const allStats: Record<string, CacheStats> = {};
    this.stats.forEach((stats, name) => {
      allStats[name] = { ...stats };
    });
    return allStats;
  }

  // Utility methods for common caching patterns
  async getOrSet<T>(
    cacheName: string,
    key: string,
    fetcher: () => Promise<T>,
    customTtl?: number
  ): Promise<T> {
    const cached = this.get<T>(cacheName, key);
    if (cached !== null) {
      return cached;
    }

    const data = await fetcher();
    this.set(cacheName, key, data, customTtl);
    return data;
  }

  // Batch operations
  setMany<T>(cacheName: string, entries: Array<{ key: string; data: T; ttl?: number }>): void {
    entries.forEach(({ key, data, ttl }) => {
      this.set(cacheName, key, data, ttl);
    });
  }

  getMany<T>(cacheName: string, keys: string[]): Record<string, T | null> {
    const results: Record<string, T | null> = {};
    keys.forEach(key => {
      results[key] = this.get<T>(cacheName, key);
    });
    return results;
  }

  deleteMany(cacheName: string, keys: string[]): number {
    let deletedCount = 0;
    keys.forEach(key => {
      if (this.delete(cacheName, key)) {
        deletedCount++;
      }
    });
    return deletedCount;
  }

  // Cache warming
  async warmCache<T>(
    cacheName: string,
    entries: Array<{ key: string; fetcher: () => Promise<T>; ttl?: number }>
  ): Promise<void> {
    const promises = entries.map(async ({ key, fetcher, ttl }) => {
      try {
        const data = await fetcher();
        this.set(cacheName, key, data, ttl);
      } catch (error) {
        console.warn(`Failed to warm cache for key ${key}:`, error);
      }
    });

    await Promise.allSettled(promises);
  }

  // Export/Import for persistence
  export(cacheName: string): string {
    const cache = this.caches.get(cacheName);
    const config = this.configs.get(cacheName);

    if (!cache || !config) {
      throw new Error(`Cache '${cacheName}' not found`);
    }

    const data = {
      config,
      entries: Array.from(cache.entries()),
      timestamp: Date.now(),
    };

    return JSON.stringify(data);
  }

  import(cacheName: string, data: string): void {
    try {
      const parsed = JSON.parse(data);
      const { config, entries, timestamp } = parsed;

      // Create cache if it doesn't exist
      if (!this.caches.has(cacheName)) {
        this.createCache(cacheName, config);
      }

      const cache = this.caches.get(cacheName)!;
      const now = Date.now();

      // Import non-expired entries
      entries.forEach(([key, entry]: [string, CacheEntry<any>]) => {
        if (now - entry.timestamp < entry.ttl) {
          cache.set(key, entry);
        }
      });

      const stats = this.stats.get(cacheName)!;
      stats.size = cache.size;
      this.updateMemoryUsage(cacheName);
    } catch (error) {
      throw new Error(`Failed to import cache data: ${error}`);
    }
  }
}

export const cacheService = new CacheService();