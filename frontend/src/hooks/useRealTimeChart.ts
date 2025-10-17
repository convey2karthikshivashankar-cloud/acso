import { useState, useEffect, useCallback, useRef } from 'react';
import { ChartDataPoint } from '../components/charts/BaseChart';
import { realTimeChartService, RealTimeDataSource } from '../services/realTimeChartService';

export interface UseRealTimeChartOptions {
  dataSourceId: string;
  enabled?: boolean;
  maxDataPoints?: number;
  updateInterval?: number;
  filter?: (data: ChartDataPoint) => boolean;
  transform?: (data: ChartDataPoint) => ChartDataPoint;
  onError?: (error: Error) => void;
  onConnect?: () => void;
  onDisconnect?: () => void;
}

export interface RealTimeChartState {
  data: ChartDataPoint[];
  isConnected: boolean;
  isLoading: boolean;
  error: string | null;
  lastUpdate: Date | null;
  updateCount: number;
}

export const useRealTimeChart = (options: UseRealTimeChartOptions) => {
  const {
    dataSourceId,
    enabled = true,
    maxDataPoints = 100,
    filter,
    transform,
    onError,
    onConnect,
    onDisconnect,
  } = options;

  const [state, setState] = useState<RealTimeChartState>({
    data: [],
    isConnected: false,
    isLoading: false,
    error: null,
    lastUpdate: null,
    updateCount: 0,
  });

  const subscriptionIdRef = useRef<string | null>(null);
  const mountedRef = useRef(true);

  // Data update callback
  const handleDataUpdate = useCallback((newData: ChartDataPoint[]) => {
    if (!mountedRef.current) return;

    setState(prevState => {
      let processedData = [...newData];

      // Apply max data points limit
      if (processedData.length > maxDataPoints) {
        processedData = processedData.slice(-maxDataPoints);
      }

      return {
        ...prevState,
        data: processedData,
        lastUpdate: new Date(),
        updateCount: prevState.updateCount + 1,
        isConnected: true,
        error: null,
      };
    });
  }, [maxDataPoints]);

  // Subscribe to real-time updates
  const subscribe = useCallback(() => {
    if (!enabled || subscriptionIdRef.current) return;

    setState(prevState => ({ ...prevState, isLoading: true, error: null }));

    try {
      const subscriptionId = realTimeChartService.subscribe(
        dataSourceId,
        handleDataUpdate,
        { filter, transform }
      );

      subscriptionIdRef.current = subscriptionId;

      setState(prevState => ({
        ...prevState,
        isLoading: false,
        isConnected: true,
      }));

      onConnect?.();
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      setState(prevState => ({
        ...prevState,
        isLoading: false,
        error: errorMessage,
        isConnected: false,
      }));

      onError?.(error instanceof Error ? error : new Error(errorMessage));
    }
  }, [enabled, dataSourceId, handleDataUpdate, filter, transform, onConnect, onError]);

  // Unsubscribe from updates
  const unsubscribe = useCallback(() => {
    if (subscriptionIdRef.current) {
      realTimeChartService.unsubscribe(subscriptionIdRef.current);
      subscriptionIdRef.current = null;

      setState(prevState => ({
        ...prevState,
        isConnected: false,
      }));

      onDisconnect?.();
    }
  }, [onDisconnect]);

  // Refresh data manually
  const refresh = useCallback(() => {
    const currentData = realTimeChartService.getCurrentData(dataSourceId);
    handleDataUpdate(currentData);
  }, [dataSourceId, handleDataUpdate]);

  // Clear data
  const clearData = useCallback(() => {
    setState(prevState => ({
      ...prevState,
      data: [],
      updateCount: 0,
      lastUpdate: null,
    }));
  }, []);

  // Pause/resume updates
  const pause = useCallback(() => {
    unsubscribe();
  }, [unsubscribe]);

  const resume = useCallback(() => {
    subscribe();
  }, [subscribe]);

  // Get data source statistics
  const getStats = useCallback(() => {
    return realTimeChartService.getDataSourceStats(dataSourceId);
  }, [dataSourceId]);

  // Effect to handle subscription lifecycle
  useEffect(() => {
    if (enabled) {
      subscribe();
    } else {
      unsubscribe();
    }

    return () => {
      unsubscribe();
    };
  }, [enabled, subscribe, unsubscribe]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [unsubscribe]);

  return {
    ...state,
    refresh,
    clearData,
    pause,
    resume,
    getStats,
  };
};

// Hook for managing multiple real-time chart data sources
export interface UseMultipleRealTimeChartsOptions {
  dataSources: Array<{
    id: string;
    enabled?: boolean;
    maxDataPoints?: number;
    filter?: (data: ChartDataPoint) => boolean;
    transform?: (data: ChartDataPoint) => ChartDataPoint;
  }>;
  onError?: (dataSourceId: string, error: Error) => void;
}

export const useMultipleRealTimeCharts = (options: UseMultipleRealTimeChartsOptions) => {
  const { dataSources, onError } = options;

  const [chartsState, setChartsState] = useState<Record<string, RealTimeChartState>>({});

  // Individual chart hooks
  const chartHooks = dataSources.map(dataSource =>
    useRealTimeChart({
      dataSourceId: dataSource.id,
      enabled: dataSource.enabled,
      maxDataPoints: dataSource.maxDataPoints,
      filter: dataSource.filter,
      transform: dataSource.transform,
      onError: onError ? (error) => onError(dataSource.id, error) : undefined,
    })
  );

  // Update combined state
  useEffect(() => {
    const newState: Record<string, RealTimeChartState> = {};
    
    dataSources.forEach((dataSource, index) => {
      const hook = chartHooks[index];
      newState[dataSource.id] = {
        data: hook.data,
        isConnected: hook.isConnected,
        isLoading: hook.isLoading,
        error: hook.error,
        lastUpdate: hook.lastUpdate,
        updateCount: hook.updateCount,
      };
    });

    setChartsState(newState);
  }, [dataSources, chartHooks]);

  // Combined operations
  const refreshAll = useCallback(() => {
    chartHooks.forEach(hook => hook.refresh());
  }, [chartHooks]);

  const clearAllData = useCallback(() => {
    chartHooks.forEach(hook => hook.clearData());
  }, [chartHooks]);

  const pauseAll = useCallback(() => {
    chartHooks.forEach(hook => hook.pause());
  }, [chartHooks]);

  const resumeAll = useCallback(() => {
    chartHooks.forEach(hook => hook.resume());
  }, [chartHooks]);

  // Get combined statistics
  const getAllStats = useCallback(() => {
    const stats: Record<string, any> = {};
    dataSources.forEach(dataSource => {
      const hook = chartHooks.find((_, index) => dataSources[index].id === dataSource.id);
      if (hook) {
        stats[dataSource.id] = hook.getStats();
      }
    });
    return stats;
  }, [dataSources, chartHooks]);

  // Overall connection status
  const isAnyConnected = Object.values(chartsState).some(state => state.isConnected);
  const areAllConnected = Object.values(chartsState).every(state => state.isConnected);
  const hasAnyError = Object.values(chartsState).some(state => state.error !== null);

  return {
    chartsState,
    isAnyConnected,
    areAllConnected,
    hasAnyError,
    refreshAll,
    clearAllData,
    pauseAll,
    resumeAll,
    getAllStats,
  };
};

// Hook for real-time chart performance monitoring
export const useRealTimeChartPerformance = (dataSourceId: string) => {
  const [performance, setPerformance] = useState({
    fps: 0,
    avgUpdateTime: 0,
    memoryUsage: 0,
    droppedFrames: 0,
  });

  const frameCountRef = useRef(0);
  const lastTimeRef = useRef(Date.now());
  const updateTimesRef = useRef<number[]>([]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      const deltaTime = now - lastTimeRef.current;
      
      if (deltaTime >= 1000) {
        const fps = Math.round((frameCountRef.current * 1000) / deltaTime);
        const avgUpdateTime = updateTimesRef.current.length > 0 
          ? updateTimesRef.current.reduce((a, b) => a + b, 0) / updateTimesRef.current.length
          : 0;

        setPerformance(prev => ({
          ...prev,
          fps,
          avgUpdateTime: Math.round(avgUpdateTime * 100) / 100,
          memoryUsage: (performance as any).memory?.usedJSHeapSize || 0,
        }));

        frameCountRef.current = 0;
        lastTimeRef.current = now;
        updateTimesRef.current = [];
      }
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const recordFrame = useCallback((updateTime?: number) => {
    frameCountRef.current++;
    if (updateTime !== undefined) {
      updateTimesRef.current.push(updateTime);
      if (updateTimesRef.current.length > 100) {
        updateTimesRef.current = updateTimesRef.current.slice(-50);
      }
    }
  }, []);

  return {
    performance,
    recordFrame,
  };
};