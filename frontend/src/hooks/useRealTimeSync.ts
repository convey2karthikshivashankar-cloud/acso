import { useState, useEffect, useCallback, useRef } from 'react';
import { getRealTimeSyncService, SubscriptionConfig, SyncEvent } from '../services/realTimeSyncService';
import { getIntelligentCache } from '../services/intelligentCacheService';

// Hook options
export interface UseRealTimeSyncOptions {
  entity: string;
  filters?: Record<string, any>;
  realTime?: boolean;
  cacheKey?: string;
  cacheTTL?: number;
  autoSync?: boolean;
  onUpdate?: (data: any) => void;
  onError?: (error: Error) => void;
}

// Hook return type
export interface UseRealTimeSyncReturn<T> {
  data: T | null;
  loading: boolean;
  error: Error | null;
  connected: boolean;
  lastUpdate: number | null;
  subscribe: () => void;
  unsubscribe: () => void;
  refresh: () => Promise<void>;
  syncToServer: (changes: Partial<T>) => Promise<void>;
}

// Main hook for real-time data synchronization
export function useRealTimeSync<T = any>(
  options: UseRealTimeSyncOptions
): UseRealTimeSyncReturn<T> {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const [connected, setConnected] = useState(false);
  const [lastUpdate, setLastUpdate] = useState<number | null>(null);
  
  const syncService = useRef(getRealTimeSyncService());
  const cache = useRef(getIntelligentCache());
  const unsubscribeRef = useRef<(() => void) | null>(null);
  const isSubscribed = useRef(false);

  // Initialize sync service
  useEffect(() => {
    const initializeSync = async () => {
      try {
        await syncService.current.initialize();
        setConnected(true);
        setError(null);
      } catch (err) {
        setError(err as Error);
        setConnected(false);
      }
    };

    initializeSync();
  }, []);

  // Load cached data on mount
  useEffect(() => {
    if (options.cacheKey) {
      const cachedData = cache.current.get<T>(options.cacheKey);
      if (cachedData) {
        setData(cachedData);
        setLastUpdate(Date.now());
      }
    }
  }, [options.cacheKey]);

  // Subscribe to real-time updates
  const subscribe = useCallback(() => {
    if (isSubscribed.current || !connected) return;

    const subscriptionConfig: SubscriptionConfig = {
      entity: options.entity,
      filters: options.filters,
      realTime: options.realTime !== false,
    };

    unsubscribeRef.current = syncService.current.subscribe(subscriptionConfig);
    isSubscribed.current = true;

    // Listen for sync events
    const handleSyncEvent = (event: CustomEvent<SyncEvent>) => {
      const syncEvent = event.detail;
      
      if (syncEvent.entity === options.entity) {
        setData(syncEvent.data);
        setLastUpdate(syncEvent.timestamp);
        
        // Cache the updated data
        if (options.cacheKey) {
          cache.current.set(options.cacheKey, syncEvent.data, {
            ttl: options.cacheTTL,
            tags: [options.entity],
          });
        }

        // Call update callback
        if (options.onUpdate) {
          options.onUpdate(syncEvent.data);
        }
      }
    };

    if (typeof window !== 'undefined') {
      window.addEventListener('realtime-sync', handleSyncEvent as EventListener);
      
      // Store cleanup function
      const originalUnsubscribe = unsubscribeRef.current;
      unsubscribeRef.current = () => {
        originalUnsubscribe?.();
        window.removeEventListener('realtime-sync', handleSyncEvent as EventListener);
        isSubscribed.current = false;
      };
    }
  }, [connected, options.entity, options.filters, options.realTime, options.cacheKey, options.cacheTTL, options.onUpdate]);

  // Unsubscribe from real-time updates
  const unsubscribe = useCallback(() => {
    if (unsubscribeRef.current) {
      unsubscribeRef.current();
      unsubscribeRef.current = null;
      isSubscribed.current = false;
    }
  }, []);

  // Refresh data from server
  const refresh = useCallback(async () => {
    if (!connected) return;

    setLoading(true);
    setError(null);

    try {
      const freshData = await syncService.current.requestFullSync(options.entity, options.filters);
      setData(freshData);
      setLastUpdate(Date.now());

      // Cache the fresh data
      if (options.cacheKey) {
        cache.current.set(options.cacheKey, freshData, {
          ttl: options.cacheTTL,
          tags: [options.entity],
        });
      }
    } catch (err) {
      const error = err as Error;
      setError(error);
      if (options.onError) {
        options.onError(error);
      }
    } finally {
      setLoading(false);
    }
  }, [connected, options.entity, options.filters, options.cacheKey, options.cacheTTL, options.onError]);

  // Sync local changes to server
  const syncToServer = useCallback(async (changes: Partial<T>) => {
    if (!connected) {
      throw new Error('Not connected to sync service');
    }

    const syncEvent: SyncEvent = {
      entity: options.entity,
      action: 'update',
      data: changes,
      timestamp: Date.now(),
    };

    await syncService.current.syncToServer(syncEvent);
  }, [connected, options.entity]);

  // Auto-subscribe if enabled
  useEffect(() => {
    if (options.autoSync !== false && connected) {
      subscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [options.autoSync, connected, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    data,
    loading,
    error,
    connected,
    lastUpdate,
    subscribe,
    unsubscribe,
    refresh,
    syncToServer,
  };
}

// Specialized hooks for different entities
export function useAgentSync(agentId?: string, options: Partial<UseRealTimeSyncOptions> = {}) {
  return useRealTimeSync({
    entity: 'agents',
    filters: agentId ? { id: agentId } : undefined,
    cacheKey: agentId ? `agent_${agentId}` : 'agents_all',
    cacheTTL: 5 * 60 * 1000, // 5 minutes
    ...options,
  });
}

export function useIncidentSync(incidentId?: string, options: Partial<UseRealTimeSyncOptions> = {}) {
  return useRealTimeSync({
    entity: 'incidents',
    filters: incidentId ? { id: incidentId } : undefined,
    cacheKey: incidentId ? `incident_${incidentId}` : 'incidents_all',
    cacheTTL: 2 * 60 * 1000, // 2 minutes
    ...options,
  });
}

export function useMetricsSync(metricType?: string, options: Partial<UseRealTimeSyncOptions> = {}) {
  return useRealTimeSync({
    entity: 'metrics',
    filters: metricType ? { type: metricType } : undefined,
    cacheKey: metricType ? `metrics_${metricType}` : 'metrics_all',
    cacheTTL: 30 * 1000, // 30 seconds for metrics
    ...options,
  });
}

// Hook for connection status monitoring
export function useConnectionStatus() {
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [stats, setStats] = useState<any>({});

  useEffect(() => {
    const syncService = getRealTimeSyncService();
    
    // Monitor connection status
    const updateStatus = () => {
      const wsManager = (syncService as any).wsManager;
      if (wsManager) {
        setIsConnected(wsManager.isConnected());
        setConnectionState(wsManager.getState());
        setStats(wsManager.getStats());
      }
    };

    // Initial status
    updateStatus();

    // Update status periodically
    const interval = setInterval(updateStatus, 1000);

    return () => {
      clearInterval(interval);
    };
  }, []);

  return {
    isConnected,
    connectionState,
    stats,
  };
}

// Hook for batch operations
export function useBatchSync<T = any>(entity: string) {
  const [operations, setOperations] = useState<Array<{ action: string; data: any }>>([]);
  const [processing, setProcessing] = useState(false);
  const syncService = useRef(getRealTimeSyncService());

  const addOperation = useCallback((action: string, data: any) => {
    setOperations(prev => [...prev, { action, data }]);
  }, []);

  const clearOperations = useCallback(() => {
    setOperations([]);
  }, []);

  const executeBatch = useCallback(async () => {
    if (operations.length === 0) return;

    setProcessing(true);
    try {
      const batchPromises = operations.map(op => 
        syncService.current.syncToServer({
          entity,
          action: op.action as any,
          data: op.data,
          timestamp: Date.now(),
        })
      );

      await Promise.all(batchPromises);
      setOperations([]);
    } catch (error) {
      console.error('Batch sync failed:', error);
      throw error;
    } finally {
      setProcessing(false);
    }
  }, [entity, operations]);

  return {
    operations,
    processing,
    addOperation,
    clearOperations,
    executeBatch,
  };
}

export default useRealTimeSync;