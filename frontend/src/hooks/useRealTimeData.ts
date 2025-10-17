import { useEffect, useState, useCallback, useRef } from 'react';
import { websocketService } from '../services/websocketService';

interface UseRealTimeDataOptions {
  enabled?: boolean;
  onConnect?: () => void;
  onDisconnect?: () => void;
  onError?: (error: any) => void;
}

export const useRealTimeData = (options: UseRealTimeDataOptions = {}) => {
  const { enabled = true, onConnect, onDisconnect, onError } = options;
  const [isConnected, setIsConnected] = useState(false);
  const [connectionState, setConnectionState] = useState<string>('disconnected');
  const [error, setError] = useState<string | null>(null);
  const connectAttempted = useRef(false);

  const connect = useCallback(async () => {
    if (!enabled || connectAttempted.current) return;
    
    try {
      connectAttempted.current = true;
      await websocketService.connect();
      setIsConnected(true);
      setConnectionState('connected');
      setError(null);
      onConnect?.();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Connection failed';
      setError(errorMessage);
      setIsConnected(false);
      setConnectionState('error');
      onError?.(err);
      connectAttempted.current = false;
    }
  }, [enabled, onConnect, onError]);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
    setIsConnected(false);
    setConnectionState('disconnected');
    connectAttempted.current = false;
    onDisconnect?.();
  }, [onDisconnect]);

  const reconnect = useCallback(() => {
    disconnect();
    setTimeout(connect, 1000);
  }, [connect, disconnect]);

  useEffect(() => {
    if (enabled) {
      connect();
    }

    return () => {
      if (enabled) {
        disconnect();
      }
    };
  }, [enabled]);

  // Monitor connection status
  useEffect(() => {
    const checkStatus = () => {
      const connected = websocketService.isSocketConnected();
      const state = websocketService.getConnectionState();
      
      setIsConnected(connected);
      setConnectionState(state);
    };

    const interval = setInterval(checkStatus, 5000);
    return () => clearInterval(interval);
  }, []);

  return {
    isConnected,
    connectionState,
    error,
    connect,
    disconnect,
    reconnect,
  };
};

// Hook for subscribing to specific events
export const useRealTimeSubscription = <T = any>(
  event: string,
  callback: (data: T) => void,
  deps: any[] = []
) => {
  useEffect(() => {
    const unsubscribe = websocketService.subscribe(event, callback);
    return unsubscribe;
  }, [event, ...deps]);
};

// Hook for agent status updates
export const useAgentStatusUpdates = (callback: (data: any) => void) => {
  useRealTimeSubscription('agent_status', callback);
};

// Hook for workflow updates
export const useWorkflowUpdates = (callback: (data: any) => void) => {
  useRealTimeSubscription('workflow_update', callback);
};

// Hook for incident updates
export const useIncidentUpdates = (callback: (data: any) => void) => {
  useRealTimeSubscription('incident_update', callback);
};

// Hook for system alerts
export const useSystemAlerts = (callback: (data: any) => void) => {
  useRealTimeSubscription('system_alert', callback);
};

// Hook for real-time metrics
export const useRealTimeMetrics = (callback: (data: any) => void) => {
  useRealTimeSubscription('metrics_update', callback);
};

// Hook for joining/leaving rooms
export const useRealTimeRoom = (roomName: string, enabled: boolean = true) => {
  useEffect(() => {
    if (enabled && websocketService.isSocketConnected()) {
      websocketService.joinRoom(roomName);
      
      return () => {
        websocketService.leaveRoom(roomName);
      };
    }
  }, [roomName, enabled]);
};

// Hook for emitting events
export const useRealTimeEmit = () => {
  const emit = useCallback((event: string, data?: any) => {
    websocketService.emit(event, data);
  }, []);

  return { emit };
};