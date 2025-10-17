import { useState, useEffect, useCallback, useRef } from 'react';

// Hook for managing dynamic imports with loading states
export function useDynamicImport<T>(
  importFn: () => Promise<T>,
  dependencies: any[] = []
) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);
  const mountedRef = useRef(true);

  const load = useCallback(async () => {
    if (!mountedRef.current) return;
    
    setLoading(true);
    setError(null);
    
    try {
      const result = await importFn();
      if (mountedRef.current) {
        setData(result);
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err instanceof Error ? err : new Error('Import failed'));
      }
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, dependencies);

  useEffect(() => {
    load();
  }, [load]);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const retry = useCallback(() => {
    load();
  }, [load]);

  return { data, loading, error, retry };
}

// Hook for preloading components based on user interaction
export function useComponentPreloader() {
  const preloadedComponents = useRef(new Set<string>());
  const preloadPromises = useRef(new Map<string, Promise<any>>());

  const preload = useCallback((
    key: string, 
    importFn: () => Promise<any>,
    force: boolean = false
  ) => {
    if (!force && preloadedComponents.current.has(key)) {
      return preloadPromises.current.get(key);
    }

    const promise = importFn().catch((error) => {
      console.warn(`Failed to preload component ${key}:`, error);
      preloadedComponents.current.delete(key);
      preloadPromises.current.delete(key);
      throw error;
    });

    preloadedComponents.current.add(key);
    preloadPromises.current.set(key, promise);
    
    return promise;
  }, []);

  const isPreloaded = useCallback((key: string) => {
    return preloadedComponents.current.has(key);
  }, []);

  const clearPreloaded = useCallback((key?: string) => {
    if (key) {
      preloadedComponents.current.delete(key);
      preloadPromises.current.delete(key);
    } else {
      preloadedComponents.current.clear();
      preloadPromises.current.clear();
    }
  }, []);

  return { preload, isPreloaded, clearPreloaded };
}

// Hook for intelligent route preloading based on user behavior
export function useIntelligentPreloading() {
  const [userBehavior, setUserBehavior] = useState({
    hoveredRoutes: new Set<string>(),
    visitedRoutes: new Set<string>(),
    timeSpentOnRoutes: new Map<string, number>(),
  });

  const trackRouteHover = useCallback((route: string) => {
    setUserBehavior(prev => ({
      ...prev,
      hoveredRoutes: new Set([...prev.hoveredRoutes, route]),
    }));
  }, []);

  const trackRouteVisit = useCallback((route: string, timeSpent: number) => {
    setUserBehavior(prev => ({
      ...prev,
      visitedRoutes: new Set([...prev.visitedRoutes, route]),
      timeSpentOnRoutes: new Map([...prev.timeSpentOnRoutes, [route, timeSpent]]),
    }));
  }, []);

  const getPriorityRoutes = useCallback(() => {
    const { hoveredRoutes, visitedRoutes, timeSpentOnRoutes } = userBehavior;
    
    // Calculate priority based on user behavior
    const routePriorities = new Map<string, number>();
    
    // Routes that were hovered get base priority
    hoveredRoutes.forEach(route => {
      routePriorities.set(route, (routePriorities.get(route) || 0) + 1);
    });
    
    // Routes that were visited get higher priority
    visitedRoutes.forEach(route => {
      routePriorities.set(route, (routePriorities.get(route) || 0) + 3);
    });
    
    // Routes with more time spent get even higher priority
    timeSpentOnRoutes.forEach((time, route) => {
      const timeBonus = Math.min(time / 10000, 5); // Max 5 points for time
      routePriorities.set(route, (routePriorities.get(route) || 0) + timeBonus);
    });
    
    return Array.from(routePriorities.entries())
      .sort(([, a], [, b]) => b - a)
      .map(([route]) => route);
  }, [userBehavior]);

  return {
    trackRouteHover,
    trackRouteVisit,
    getPriorityRoutes,
    userBehavior,
  };
}

// Hook for bundle size monitoring in development
export function useBundleMonitoring() {
  const bundleMetrics = useRef(new Map<string, {
    loadTime: number;
    size?: number;
    timestamp: number;
  }>());

  const recordBundleLoad = useCallback((
    bundleName: string, 
    loadTime: number, 
    size?: number
  ) => {
    if (process.env.NODE_ENV === 'development') {
      bundleMetrics.current.set(bundleName, {
        loadTime,
        size,
        timestamp: Date.now(),
      });
      
      console.group(`[Bundle Metrics] ${bundleName}`);
      console.log(`Load time: ${loadTime.toFixed(2)}ms`);
      if (size) {
        console.log(`Size: ${(size / 1024).toFixed(2)}KB`);
      }
      console.groupEnd();
    }
  }, []);

  const getBundleMetrics = useCallback(() => {
    return Array.from(bundleMetrics.current.entries()).map(([name, metrics]) => ({
      name,
      ...metrics,
    }));
  }, []);

  const clearMetrics = useCallback(() => {
    bundleMetrics.current.clear();
  }, []);

  return {
    recordBundleLoad,
    getBundleMetrics,
    clearMetrics,
  };
}

// Hook for adaptive loading based on network conditions
export function useAdaptiveLoading() {
  const [networkInfo, setNetworkInfo] = useState({
    effectiveType: '4g',
    downlink: 10,
    rtt: 100,
    saveData: false,
  });

  useEffect(() => {
    if ('connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkInfo = () => {
        setNetworkInfo({
          effectiveType: connection.effectiveType || '4g',
          downlink: connection.downlink || 10,
          rtt: connection.rtt || 100,
          saveData: connection.saveData || false,
        });
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);

      return () => {
        connection.removeEventListener('change', updateNetworkInfo);
      };
    }
  }, []);

  const shouldPreload = useCallback((priority: 'low' | 'medium' | 'high' = 'medium') => {
    const { effectiveType, saveData, downlink } = networkInfo;
    
    // Don't preload if user has data saver enabled
    if (saveData) return false;
    
    // Adjust preloading based on network conditions
    switch (effectiveType) {
      case 'slow-2g':
      case '2g':
        return priority === 'high';
      case '3g':
        return priority !== 'low';
      case '4g':
      default:
        return downlink > 1.5; // Only preload on decent 4G
    }
  }, [networkInfo]);

  const getLoadingStrategy = useCallback(() => {
    const { effectiveType, saveData } = networkInfo;
    
    if (saveData || effectiveType === 'slow-2g' || effectiveType === '2g') {
      return 'minimal'; // Load only essential components
    } else if (effectiveType === '3g') {
      return 'progressive'; // Load components as needed
    } else {
      return 'aggressive'; // Preload likely-needed components
    }
  }, [networkInfo]);

  return {
    networkInfo,
    shouldPreload,
    getLoadingStrategy,
  };
}

// Hook for memory-aware component loading
export function useMemoryAwareLoading() {
  const [memoryInfo, setMemoryInfo] = useState({
    usedJSHeapSize: 0,
    totalJSHeapSize: 0,
    jsHeapSizeLimit: 0,
  });

  useEffect(() => {
    if ('memory' in performance) {
      const updateMemoryInfo = () => {
        const memory = (performance as any).memory;
        setMemoryInfo({
          usedJSHeapSize: memory.usedJSHeapSize,
          totalJSHeapSize: memory.totalJSHeapSize,
          jsHeapSizeLimit: memory.jsHeapSizeLimit,
        });
      };

      updateMemoryInfo();
      const interval = setInterval(updateMemoryInfo, 5000);

      return () => clearInterval(interval);
    }
  }, []);

  const getMemoryPressure = useCallback(() => {
    const { usedJSHeapSize, jsHeapSizeLimit } = memoryInfo;
    if (jsHeapSizeLimit === 0) return 'unknown';
    
    const usage = usedJSHeapSize / jsHeapSizeLimit;
    
    if (usage > 0.9) return 'critical';
    if (usage > 0.7) return 'high';
    if (usage > 0.5) return 'medium';
    return 'low';
  }, [memoryInfo]);

  const shouldLimitLoading = useCallback(() => {
    const pressure = getMemoryPressure();
    return pressure === 'critical' || pressure === 'high';
  }, [getMemoryPressure]);

  return {
    memoryInfo,
    getMemoryPressure,
    shouldLimitLoading,
  };
}