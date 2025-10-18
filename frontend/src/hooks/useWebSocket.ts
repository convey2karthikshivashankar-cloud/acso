import { useEffect, useCallback, useRef } from 'react';
import { useSelector, useDispatch } from 'react-redux';
import { RootState } from '../store';
import { websocketService, WebSocketMessage, WebSocketSubscription } from '../services/websocketService';
import { agentsApi } from '../store/api/agentsApi';

export interface UseWebSocketOptions {
  autoConnect?: boolean;
  reconnectOnAuth?: boolean;
}

export interface UseWebSocketReturn {
  isConnected: boolean;
  connectionId: string | null;
  connect: () => void;
  disconnect: () => void;
  subscribe: (topic: string, filters?: Record<string, any>, permissions?: string[]) => void;
  unsubscribe: (topic: string) => void;
  send: (message: WebSocketMessage) => boolean;
}

export function useWebSocket(options: UseWebSocketOptions = {}): UseWebSocketReturn {
  const { autoConnect = true, reconnectOnAuth = true } = options;
  
  const dispatch = useDispatch();
  const isAuthenticated = useSelector((state: RootState) => state.auth.isAuthenticated);
  const token = useSelector((state: RootState) => state.auth.token);
  
  const isConnectedRef = useRef(false);
  const connectionIdRef = useRef<string | null>(null);

  // Connection handlers
  const handleConnection = useCallback((connected: boolean) => {
    isConnectedRef.current = connected;
    
    if (connected) {
      connectionIdRef.current = websocketService.getConnectionId();
      console.log('WebSocket connected:', connectionIdRef.current);
    } else {
      connectionIdRef.current = null;
      console.log('WebSocket disconnected');
    }
  }, []);

  const handleError = useCallback((error: Event) => {
    console.error('WebSocket error:', error);
  }, []);

  // Message handlers for different topics
  const handleAgentStatusUpdate = useCallback((message: WebSocketMessage) => {
    if (message.type === 'broadcast' && message.data.topic === 'agents.status') {
      // Invalidate agents cache to trigger refetch
      dispatch(agentsApi.util.invalidateTags(['Agent']));
    }
  }, [dispatch]);

  const handleWorkflowUpdate = useCallback((message: WebSocketMessage) => {
    if (message.type === 'broadcast' && message.data.topic === 'workflows.status') {
      // Handle workflow updates
      console.log('Workflow update:', message.data);
    }
  }, []);

  const handleIncidentUpdate = useCallback((message: WebSocketMessage) => {
    if (message.type === 'broadcast' && message.data.topic === 'incidents.status') {
      // Handle incident updates
      console.log('Incident update:', message.data);
    }
  }, []);

  const handleSystemAlert = useCallback((message: WebSocketMessage) => {
    if (message.type === 'broadcast' && message.data.topic === 'system.alerts') {
      // Handle system alerts
      console.log('System alert:', message.data);
      // You could dispatch a notification action here
    }
  }, []);

  // Setup WebSocket connection and handlers
  useEffect(() => {
    if (!isAuthenticated || !token) {
      websocketService.disconnect();
      return;
    }

    // Register event handlers
    const unsubscribeConnection = websocketService.onConnection(handleConnection);
    const unsubscribeError = websocketService.onError(handleError);
    
    // Register message handlers
    const unsubscribeAgentStatus = websocketService.onMessage('broadcast', handleAgentStatusUpdate);
    const unsubscribeWorkflow = websocketService.onMessage('broadcast', handleWorkflowUpdate);
    const unsubscribeIncident = websocketService.onMessage('broadcast', handleIncidentUpdate);
    const unsubscribeSystemAlert = websocketService.onMessage('broadcast', handleSystemAlert);

    // Auto-connect if enabled
    if (autoConnect) {
      websocketService.connect();
    }

    // Cleanup function
    return () => {
      unsubscribeConnection();
      unsubscribeError();
      unsubscribeAgentStatus();
      unsubscribeWorkflow();
      unsubscribeIncident();
      unsubscribeSystemAlert();
      
      if (!reconnectOnAuth) {
        websocketService.disconnect();
      }
    };
  }, [
    isAuthenticated,
    token,
    autoConnect,
    reconnectOnAuth,
    handleConnection,
    handleError,
    handleAgentStatusUpdate,
    handleWorkflowUpdate,
    handleIncidentUpdate,
    handleSystemAlert
  ]);

  // Public API
  const connect = useCallback(() => {
    websocketService.connect();
  }, []);

  const disconnect = useCallback(() => {
    websocketService.disconnect();
  }, []);

  const subscribe = useCallback((topic: string, filters?: Record<string, any>, permissions?: string[]) => {
    websocketService.subscribe(topic, filters, permissions);
  }, []);

  const unsubscribe = useCallback((topic: string) => {
    websocketService.unsubscribe(topic);
  }, []);

  const send = useCallback((message: WebSocketMessage) => {
    return websocketService.send(message);
  }, []);

  return {
    isConnected: isConnectedRef.current,
    connectionId: connectionIdRef.current,
    connect,
    disconnect,
    subscribe,
    unsubscribe,
    send,
  };
}

// Hook for subscribing to specific topics
export function useWebSocketSubscription(
  topic: string,
  handler: (message: WebSocketMessage) => void,
  filters?: Record<string, any>,
  permissions?: string[]
) {
  const { subscribe, unsubscribe } = useWebSocket();

  useEffect(() => {
    // Subscribe to topic
    subscribe(topic, filters, permissions);

    // Register message handler
    const unsubscribeHandler = websocketService.onMessage('broadcast', (message) => {
      if (message.data.topic === topic) {
        handler(message);
      }
    });

    // Cleanup
    return () => {
      unsubscribe(topic);
      unsubscribeHandler();
    };
  }, [topic, handler, filters, permissions, subscribe, unsubscribe]);
}

// Hook for agent status updates
export function useAgentStatusUpdates() {
  const dispatch = useDispatch();

  useWebSocketSubscription(
    'agents.status',
    useCallback((message: WebSocketMessage) => {
      // Invalidate agents cache to trigger refetch
      dispatch(agentsApi.util.invalidateTags(['Agent']));
      
      // You could also update specific agent data directly
      const agentData = message.data.payload;
      if (agentData && agentData.id) {
        dispatch(agentsApi.util.updateQueryData('getAgent', agentData.id, (draft) => {
          Object.assign(draft, agentData);
        }));
      }
    }, [dispatch])
  );
}

// Hook for system alerts
export function useSystemAlerts(onAlert?: (alert: any) => void) {
  useWebSocketSubscription(
    'system.alerts',
    useCallback((message: WebSocketMessage) => {
      const alert = message.data.payload;
      console.log('System alert received:', alert);
      
      if (onAlert) {
        onAlert(alert);
      }
    }, [onAlert])
  );
}

// Hook for workflow updates
export function useWorkflowUpdates(onUpdate?: (workflow: any) => void) {
  useWebSocketSubscription(
    'workflows.status',
    useCallback((message: WebSocketMessage) => {
      const workflow = message.data.payload;
      console.log('Workflow update received:', workflow);
      
      if (onUpdate) {
        onUpdate(workflow);
      }
    }, [onUpdate])
  );
}

// Hook for incident updates
export function useIncidentUpdates(onUpdate?: (incident: any) => void) {
  useWebSocketSubscription(
    'incidents.status',
    useCallback((message: WebSocketMessage) => {
      const incident = message.data.payload;
      console.log('Incident update received:', incident);
      
      if (onUpdate) {
        onUpdate(incident);
      }
    }, [onUpdate])
  );
}