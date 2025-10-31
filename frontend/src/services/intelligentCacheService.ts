// Enhanced intelligent caching service with TTL and advanced features
export interface CacheEntry<T = any> {
  data: T;
  timestamp: number;
  ttl: number;
  accessCount: number;
  lastAccessed: number;
  size: number;
  tags: string[];
  priority: 'low' | 'normal' | 'high' | 'critical';
  dependencies: string[];
}

export interface CacheConfig {
  maxSize: number; // Maximum cache size in MB
  defaultTTL: number; // Default TTL in milliseconds
  maxEntries: number; // Maximum number of entries
  evictionPolicy: 'lru' | 'lfu' | 'ttl' | 'priority';
  compressionThreshold: number; // Compress entries larger than this size
  persistToStorage: boolean;
  storagePrefix: string;
}

export interface CacheStats {
  hits: number;
  misses: number;
  evictions: number;
  totalSize: number;
  entryCount: number;
  hitRate: number;
  memoryUsage: number;
}

export class IntelligentCacheService {
  private cache = new Map<string, CacheEntry>();
  private config: CacheConfig;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    evictions: 0,
    totalSize: 0,
    entryCount: 0,
    hitRate: 0,
    memoryUsage: 0,
  };
  private cleanupTimer: NodeJS.Timeout | null = null;

  constructor(config: Partial<CacheConfig> = {}) {
    this.config = {
      maxSize: 50, // 50MB default
      defaultTTL: 5 * 60 * 1000, // 5 minutes
      maxEntries: 1000,
      evictionPolicy: 'lru',
      compressionThreshold: 1024, // 1KB
      persistToStorage: true,
      storagePrefix: 'acso_cache_',
      ...config,
    };

    this.startCleanupTimer();
    this.loadFromStorage();
  }

  // Get item from cache
  get<T = any>(key: string): T | null {
    const entry = this.cache.get(key);
    
    if (!entry) {
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Check if expired
    if (this.isExpired(entry)) {
      this.delete(key);
      this.stats.misses++;
      this.updateHitRate();
      return null;
    }

    // Update access statistics
    entry.accessCount++;
    entry.lastAccessed = Date.now();
    this.stats.hits++;
    this.updateHitRate();

    return this.deserializeData(entry.data);
  }

  // Set item in cache
  set<T = any>(
    key: string,
    data: T,
    options: {
      ttl?: number;
      tags?: string[];
      priority?: CacheEntry['priority'];
      dependencies?: string[];
    } = {}
  ): void {
    const serializedData = this.serializeData(data);
    const size = this.calculateSize(serializedData);
    
    const entry: CacheEntry<T> = {
      data: serializedData,
      timestamp: Date.now(),
      ttl: options.ttl || this.config.defaultTTL,
      accessCount: 1,
      lastAccessed: Date.now(),
      size,
      tags: options.tags || [],
      priority: options.priority || 'normal',
      dependencies: options.dependencies || [],
    };

    // Check if we need to make space
    this.ensureCapacity(size);

    // Add entry
    this.cache.set(key, entry);
    this.updateStats();
    this.saveToStorage();
  }

  // Delete item from cache
  delete(key: string): boolean {
    const entry = this.cache.get(key);
    if (entry) {
      this.cache.delete(key);
      this.stats.totalSize -= entry.size;
      this.stats.entryCount--;
      this.saveToStorage();
      return true;
    }
    return false;
  }

  // Check if key exists and is not expired
  has(key: string): boolean {
    const entry = this.cache.get(key);
    if (!entry) return false;
    
    if (this.isExpired(entry)) {
      this.delete(key);
      return false;
    }
    
    return true;
  }

  // Clear entire cache
  clear(): void {
    this.cache.clear();
    this.stats = {
      hits: 0,
      misses: 0,
      evictions: 0,
      totalSize: 0,
      entryCount: 0,
      hitRate: 0,
      memoryUsage: 0,
    };
    this.clearStorage();
  }

  // Invalidate by tags
  invalidateByTags(tags: string[]): number {
    let invalidated = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.tags.some(tag => tags.includes(tag))) {
        this.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }

  // Invalidate by dependencies
  invalidateByDependencies(dependencies: string[]): number {
    let invalidated = 0;
    for (const [key, entry] of this.cache.entries()) {
      if (entry.dependencies.some(dep => dependencies.includes(dep))) {
        this.delete(key);
        invalidated++;
      }
    }
    return invalidated;
  }

  // Get cache statistics
  getStats(): CacheStats {
    this.updateMemoryUsage();
    return { ...this.stats };
  }

  // Get all keys
  keys(): string[] {
    return Array.from(this.cache.keys());
  }

  // Get cache size
  size(): number {
    return this.cache.size;
  }

  // Preload data with intelligent prefetching
  async preload(
    keys: string[],
    dataLoader: (key: string) => Promise<any>,
    options: {
      priority?: CacheEntry['priority'];
      ttl?: number;
      tags?: string[];
    } = {}
  ): Promise<void> {
    const loadPromises = keys
      .filter(key => !this.has(key))
      .map(async key => {
        try {
          const data = await dataLoader(key);
          this.set(key, data, options);
        } catch (error) {
          console.warn(`Failed to preload cache key: ${key}`, error);
        }
      });

    await Promise.allSettled(loadPromises);
  }

  // Batch operations
  setMany<T = any>(entries: Array<{
    key: string;
    data: T;
    options?: Parameters<typeof this.set>[2];
  }>): void {
    entries.forEach(({ key, data, options }) => {
      this.set(key, data, options);
    });
  }

  getMany<T = any>(keys: string[]): Record<string, T | null> {
    const result: Record<string, T | null> = {};
    keys.forEach(key => {
      result[key] = this.get<T>(key);
    });
    return result;
  }

  // Cache warming strategies
  warmCache(strategy: 'popular' | 'recent' | 'priority'): void {
    // Implementation would depend on usage patterns and data sources
    console.log(`Warming cache with strategy: ${strategy}`);
  }

  // Private methods
  private isExpired(entry: CacheEntry): boolean {
    return Date.now() - entry.timestamp > entry.ttl;
  }

  private calculateSize(data: any): number {
    try {
      return JSON.stringify(data).length * 2; // Rough estimate (2 bytes per char)
    } catch {
      return 1000; // Fallback size
    }
  }

  private ensureCapacity(newEntrySize: number): void {
    // Check total size limit
    while (this.stats.totalSize + newEntrySize > this.config.maxSize * 1024 * 1024) {
      this.evictEntry();
    }

    // Check entry count limit
    while (this.cache.size >= this.config.maxEntries) {
      this.evictEntry();
    }
  }

  private evictEntry(): void {
    let keyToEvict: string | null = null;

    switch (this.config.evictionPolicy) {
      case 'lru':
        keyToEvict = this.findLRUKey();
        break;
      case 'lfu':
        keyToEvict = this.findLFUKey();
        break;
      case 'ttl':
        keyToEvict = this.findExpiredKey();
        break;
      case 'priority':
        keyToEvict = this.findLowestPriorityKey();
        break;
    }

    if (keyToEvict) {
      this.delete(keyToEvict);
      this.stats.evictions++;
    }
  }

  private findLRUKey(): string | null {
    let oldestKey: string | null = null;
    let oldestTime = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.lastAccessed < oldestTime) {
        oldestTime = entry.lastAccessed;
        oldestKey = key;
      }
    }

    return oldestKey;
  }

  private findLFUKey(): string | null {
    let leastUsedKey: string | null = null;
    let leastCount = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      if (entry.accessCount < leastCount) {
        leastCount = entry.accessCount;
        leastUsedKey = key;
      }
    }

    return leastUsedKey;
  }

  private findExpiredKey(): string | null {
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        return key;
      }
    }
    return this.findLRUKey(); // Fallback to LRU if no expired entries
  }

  private findLowestPriorityKey(): string | null {
    const priorityOrder = { low: 0, normal: 1, high: 2, critical: 3 };
    let lowestPriorityKey: string | null = null;
    let lowestPriority = Infinity;

    for (const [key, entry] of this.cache.entries()) {
      const priority = priorityOrder[entry.priority];
      if (priority < lowestPriority) {
        lowestPriority = priority;
        lowestPriorityKey = key;
      }
    }

    return lowestPriorityKey;
  }

  private updateStats(): void {
    this.stats.entryCount = this.cache.size;
    this.stats.totalSize = Array.from(this.cache.values())
      .reduce((total, entry) => total + entry.size, 0);
  }

  private updateHitRate(): void {
    const total = this.stats.hits + this.stats.misses;
    this.stats.hitRate = total > 0 ? this.stats.hits / total : 0;
  }

  private updateMemoryUsage(): void {
    // Rough estimate of memory usage
    this.stats.memoryUsage = this.stats.totalSize + (this.cache.size * 200); // 200 bytes overhead per entry
  }

  private serializeData(data: any): any {
    // Add compression for large data if needed
    if (this.calculateSize(data) > this.config.compressionThreshold) {
      // In a real implementation, you might use a compression library
      return { compressed: true, data: JSON.stringify(data) };
    }
    return data;
  }

  private deserializeData(data: any): any {
    if (data && data.compressed) {
      return JSON.parse(data.data);
    }
    return data;
  }

  private startCleanupTimer(): void {
    this.cleanupTimer = setInterval(() => {
      this.cleanup();
    }, 60000); // Cleanup every minute
  }

  private cleanup(): void {
    const keysToDelete: string[] = [];
    
    for (const [key, entry] of this.cache.entries()) {
      if (this.isExpired(entry)) {
        keysToDelete.push(key);
      }
    }

    keysToDelete.forEach(key => this.delete(key));
    
    if (keysToDelete.length > 0) {
      console.log(`Cleaned up ${keysToDelete.length} expired cache entries`);
    }
  }

  private saveToStorage(): void {
    if (!this.config.persistToStorage || typeof localStorage === 'undefined') return;

    try {
      const cacheData = {
        entries: Array.from(this.cache.entries()),
        stats: this.stats,
        timestamp: Date.now(),
      };
      
      localStorage.setItem(
        `${this.config.storagePrefix}data`,
        JSON.stringify(cacheData)
      );
    } catch (error) {
      console.warn('Failed to save cache to storage:', error);
    }
  }

  private loadFromStorage(): void {
    if (!this.config.persistToStorage || typeof localStorage === 'undefined') return;

    try {
      const stored = localStorage.getItem(`${this.config.storagePrefix}data`);
      if (!stored) return;

      const cacheData = JSON.parse(stored);
      
      // Check if data is not too old (max 1 hour)
      if (Date.now() - cacheData.timestamp > 3600000) {
        this.clearStorage();
        return;
      }

      // Restore cache entries
      this.cache = new Map(cacheData.entries);
      this.stats = cacheData.stats;

      // Clean up expired entries
      this.cleanup();
    } catch (error) {
      console.warn('Failed to load cache from storage:', error);
      this.clearStorage();
    }
  }

  private clearStorage(): void {
    if (typeof localStorage !== 'undefined') {
      localStorage.removeItem(`${this.config.storagePrefix}data`);
    }
  }

  // Cleanup on destruction
  destroy(): void {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }
    this.saveToStorage();
  }
}

// Singleton instance
let cacheInstance: IntelligentCacheService | null = null;

export function getIntelligentCache(config?: Partial<CacheConfig>): IntelligentCacheService {
  if (!cacheInstance) {
    cacheInstance = new IntelligentCacheService(config);
  }
  return cacheInstance;
}

// Specialized cache instances for different data types
export const apiCache = new IntelligentCacheService({
  maxSize: 20,
  defaultTTL: 5 * 60 * 1000, // 5 minutes
  storagePrefix: 'acso_api_cache_',
  evictionPolicy: 'lru',
});

export const uiCache = new IntelligentCacheService({
  maxSize: 10,
  defaultTTL: 30 * 60 * 1000, // 30 minutes
  storagePrefix: 'acso_ui_cache_',
  evictionPolicy: 'lfu',
});

export const userCache = new IntelligentCacheService({
  maxSize: 5,
  defaultTTL: 60 * 60 * 1000, // 1 hour
  storagePrefix: 'acso_user_cache_',
  evictionPolicy: 'priority',
});

export default IntelligentCacheService;