import { Middleware } from '@reduxjs/toolkit';
import { WebSocketManager } from '../../services/websocketManager';
import { ConnectionStatusIndicator } from '../../components/realtime/ConnectionStatusIndicator';

interface WebSocketAction {
  type: string;
  payload?: any;
  meta?: {
    websocket?: {
      channel?: string;
      subscribe?: boolean;
      unsubscribe?: boolean;
    };
  };
}

export const websocketMiddleware: Middleware = (store) => {
  const wsManager = WebSocketManager.getInstance();
  
  return (next) => (action: WebSocketAction) => {
    const { meta } = action;
    
    if (meta?.websocket) {
      const { channel, subscribe, unsubscribe } = meta.websocket;
      
      if (subscribe && channel) {
        wsManager.subscribe(channel, (data) => {
          store.dispatch({
            type: `${action.type}_RECEIVED`,
            payload: data
          });
        });
      }
      
      if (unsubscribe && channel) {
        wsManager.unsubscribe(channel);
      }
    }
    
    return next(action);
  };
};

// WebSocket action creators
export const websocketActions = {
  connect: () => ({
    type: 'WEBSOCKET_CONNECT'
  }),
  
  disconnect: () => ({
    type: 'WEBSOCKET_DISCONNECT'
  }),
  
  subscribe: (channel: string) => ({
    type: 'WEBSOCKET_SUBSCRIBE',
    meta: {
      websocket: {
        channel,
        subscribe: true
      }
    }
  }),
  
  unsubscribe: (channel: string) => ({
    type: 'WEBSOCKET_UNSUBSCRIBE',
    meta: {
      websocket: {
        channel,
        unsubscribe: true
      }
    }
  })
};