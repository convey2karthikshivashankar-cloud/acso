import { useEffect, useCallback } from 'react';
import { useAppDispatch, useAppSelector } from '../store/hooks';
import { useWebSocket } from './useWebSocket';
import { 
  handleWebSocketMessage,
  setWebSocketConnected,
  addWebSocketSubscription,
  removeWebSocketSubscription,
  clearRealTimeData,
  type AgentWebSocketMessage
} from '../store/slices/agentsSlice';
import { agentsApi } from '../store/api/agentsApi';

/**
 * Hook for integrating WebSocket with Redux state management
 * Handles real-time updates for agents and other system components
 */
export const useWebSocketIntegration = () => {
  const dispatch = useAppDispatch();
  const { token } = useAppSelector(state => state.auth);
  const { wsConnected, wsSubscriptions } = useAppSelector(state => state.agents);
  
  // WebSocket connection with authentication
  const {
    isConnected,
    lastMessage,
    sendMessage,
    subscribe,
    unsubscribe,
  } = useWebSocket({
    url: '/api/ws',
    token,
    reconnectAttempts: 5,
    reconnectInterval: 3000,
  });

  // Update Redux state when WebSocket connection changes
  useEffect(() => {
    dispatch(setWebSocketConnected(isConnected));
  }, [isConnected, dispatch]);

  // Handle incoming WebSocket messages
  useEffect(() => {
    if (lastMessage) {
      try {
        const message = JSON.parse(lastMessage);
        
        // Handle different message types
        switch (message.type) {
          case 'agent_status_update':
          case 'agent_metrics_update':
          case 'agent_log_entry':
          case 'agent_task_update':
            // Update Redux state with real-time data
            dispatch(handleWebSocketMessage(message as AgentWebSocketMessage));
            
            // Invalidate relevant RTK Query cache
            if (message.type === 'agent_status_update') {
              dispatch(agentsApi.util.invalidateTags([
                { type: 'Agent', id: message.data.agent_id },
                'Agent'
              ]));
            }
            break;
            
          case 'system_alert':
            // Handle system-wide alerts
            // Could dispatch to notifications slice
            break;
            
          case 'workflow_update':
            // Handle workflow updates
            break;
            
          case 'incident_update':
            // Handle incident updates
            break;
            
          default:
            console.log('Unhandled WebSocket message type:', message.type);
        }
      } catch (error) {
        console.error('Failed to parse WebSocket message:', error);
      }
    }
  }, [lastMessage, dispatch]);

  // Subscribe to agent-related topics when connected
  useEffect(() => {
    if (isConnected) {
      // Subscribe to essential agent topics
      const agentTopics = [
        'agents.status',
        'agents.metrics',
        'agents.logs',
        'agents.tasks',
        'system.alerts',
      ];

      agentTopics.forEach(topic => {
        if (!wsSubscriptions.includes(topic)) {
          subscribe(topic, {
            permissions: ['agents:view'], // Required permission
          });
          dispatch(addWebSocketSubscription(topic));
        }
      });
    }
  }, [isConnected, subscribe, wsSubscriptions, dispatch]);

  // Cleanup subscriptions on unmount
  useEffect(() => {
    return () => {
      wsSubscriptions.forEach(topic => {
        unsubscribe(topic);
        dispatch(removeWebSocketSubscription(topic));
      });
    };
  }, []);

  // Subscribe to specific agent updates
  const subscribeToAgent = useCallback((agentId: string) => {
    if (isConnected) {
      const agentTopic = `agents.${agentId}`;
      subscribe(agentTopic, {
        filters: { agent_id: agentId },
        permissions: ['agents:view'],
      });
      dispatch(addWebSocketSubscription(agentTopic));
    }
  }, [isConnected, subscribe, dispatch]);

  // Unsubscribe from specific agent updates
  const unsubscribeFromAgent = useCallback((agentId: string) => {
    const agentTopic = `agents.${agentId}`;
    unsubscribe(agentTopic);
    dispatch(removeWebSocketSubscription(agentTopic));
    dispatch(clearRealTimeData(agentId));
  }, [unsubscribe, dispatch]);

  // Send agent command via WebSocket
  const sendAgentCommand = useCallback((agentId: string, command: string, params?: any) => {
    if (isConnected) {
      sendMessage({
        type: 'agent_command',
        data: {
          agent_id: agentId,
          command,
          parameters: params || {},
        },
      });
    }
  }, [isConnected, sendMessage]);

  // Subscribe to system-wide topics
  const subscribeToSystemTopic = useCallback((topic: string, permissions?: string[]) => {
    if (isConnected) {
      subscribe(topic, {
        permissions: permissions || ['system:monitor'],
      });
      dispatch(addWebSocketSubscription(topic));
    }
  }, [isConnected, subscribe, dispatch]);

  // Unsubscribe from system topic
  const unsubscribeFromSystemTopic = useCallback((topic: string) => {
    unsubscribe(topic);
    dispatch(removeWebSocketSubscription(topic));
  }, [unsubscribe, dispatch]);

  return {
    isConnected: wsConnected,
    subscribeToAgent,
    unsubscribeFromAgent,
    sendAgentCommand,
    subscribeToSystemTopic,
    unsubscribeFromSystemTopic,
    subscriptions: wsSubscriptions,
  };
};

/**
 * Hook for agent-specific WebSocket integration
 * Automatically subscribes to updates for a specific agent
 */
export const useAgentWebSocket = (agentId: string | null) => {
  const { subscribeToAgent, unsubscribeFromAgent, isConnected } = useWebSocketIntegration();
  const realTimeUpdates = useAppSelector(state => 
    agentId ? state.agents.realTimeUpdates[agentId] : null
  );

  useEffect(() => {
    if (agentId && isConnected) {
      subscribeToAgent(agentId);
      
      return () => {
        unsubscribeFromAgent(agentId);
      };
    }
  }, [agentId, isConnected, subscribeToAgent, unsubscribeFromAgent]);

  return {
    isConnected,
    realTimeData: realTimeUpdates,
    hasRecentUpdate: realTimeUpdates ? 
      (Date.now() - new Date(realTimeUpdates.lastUpdate).getTime()) < 30000 : false,
  };
};

/**
 * Hook for bulk agent operations with WebSocket feedback
 */
export const useBulkAgentOperations = () => {
  const dispatch = useAppDispatch();
  const { sendAgentCommand, isConnected } = useWebSocketIntegration();
  const { selectedAgents, operation, inProgress } = useAppSelector(
    state => state.agents.bulkOperations
  );

  const executeBulkOperation = useCallback(async (
    operation: 'start' | 'stop' | 'restart' | 'delete',
    agentIds: string[]
  ) => {
    if (!isConnected || inProgress) return;

    dispatch({
      type: 'agents/setBulkOperation',
      payload: { operation, inProgress: true },
    });

    try {
      // Send commands via WebSocket for real-time feedback
      const promises = agentIds.map(agentId => 
        sendAgentCommand(agentId, operation)
      );

      await Promise.allSettled(promises);
    } finally {
      dispatch({
        type: 'agents/setBulkOperation',
        payload: { operation: null, inProgress: false },
      });
    }
  }, [isConnected, inProgress, sendAgentCommand, dispatch]);

  return {
    selectedAgents,
    currentOperation: operation,
    inProgress,
    executeBulkOperation,
    isConnected,
  };
};