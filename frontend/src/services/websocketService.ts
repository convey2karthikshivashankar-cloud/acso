import { io, Socket } from 'socket.io-client';
import { store } from '../store';
import { addNotification } from '../store/slices/notificationSlice';
import { WebSocketMessage, WebSocketConfig } from '../types';

class WebSocketService {
  private socket: Socket | null = null;
  private config: WebSocketConfig;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectInterval = 1000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private subscriptions = new Map<string, Set<(data: any) => void>>();
  private isConnected = false;

  constructor() {
    this.config = {
      url: (import.meta as any).env?.VITE_WS_URL || 'ws://localhost:3001',
      reconnectAttempts: 5,
      reconnectInterval: 1000,
      heartbeatInterval: 30000,
    };
  }

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        // Get auth token from store
        const state = store.getState();
        const token = state.auth.token;

        this.socket = io(this.config.url, {
          auth: {
            token,
          },
          transports: ['websocket', 'polling'],
          timeout: 20000,
          forceNew: true,
        });

        this.setupEventHandlers();

        this.socket.on('connect', () => {
          console.log('WebSocket connected');
          this.isConnected = true;
          this.reconnectAttempts = 0;
          this.startHeartbeat();
          resolve();
        });

        this.socket.on('connect_error', (error) => {
          console.error('WebSocket connection error:', error);
          this.isConnected = false;
          reject(error);
        });

      } catch (error) {
        console.error('Failed to initialize WebSocket:', error);
        reject(error);
      }
    });
  }

  disconnect(): void {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = null;
    }
    
    this.isConnected = false;
    this.stopHeartbeat();
    this.subscriptions.clear();
  }

  private setupEventHandlers(): void {
    if (!this.socket) return;

    // Connection events
    this.socket.on('disconnect', (reason) => {
      console.log('WebSocket disconnected:', reason);
      this.isConnected = false;
      this.stopHeartbeat();
      
      if (reason === 'io server disconnect') {
        // Server initiated disconnect, don't reconnect
        return;
      }
      
      this.handleReconnection();
    });

    this.socket.on('reconnect', (attemptNumber) => {
      console.log('WebSocket reconnected after', attemptNumber, 'attempts');
      this.isConnected = true;
      this.reconnectAttempts = 0;
      this.startHeartbeat();
    });

    this.socket.on('reconnect_error', (error) => {
      console.error('WebSocket reconnection error:', error);
      this.handleReconnectionError();
    });

    // Data events
    this.socket.on('message', (message: WebSocketMessage) => {
      this.handleMessage(message);
    });

    // Specific event types
    this.socket.on('notification', (data) => {
      store.dispatch(addNotification(data));
    });

    this.socket.on('agent_status_update', (data) => {
      this.notifySubscribers('agent_status', data);
    });

    this.socket.on('workflow_update', (data) => {
      this.notifySubscribers('workflow_update', data);
    });

    this.socket.on('incident_update', (data) => {
      this.notifySubscribers('incident_update', data);
    });

    this.socket.on('system_alert', (data) => {
      this.notifySubscribers('system_alert', data);
      
      // Also add as notification
      store.dispatch(addNotification({
        type: 'system',
        title: 'System Alert',
        message: data.message,
        severity: data.severity || 'warning',
      }));
    });

    // Heartbeat
    this.socket.on('pong', () => {
      // Server responded to ping
    });
  }

  private handleMessage(message: WebSocketMessage): void {
    try {
      console.log('Received WebSocket message:', message);
      
      // Notify subscribers for this message type
      this.notifySubscribers(message.type, message.payload);
      
      // Handle specific message types
      switch (message.type) {
        case 'data_update':
          this.handleDataUpdate(message.payload);
          break;
        case 'real_time_metrics':
          this.handleMetricsUpdate(message.payload);
          break;
        case 'user_session_update':
          this.handleSessionUpdate(message.payload);
          break;
        default:
          console.log('Unhandled message type:', message.type);
      }
    } catch (error) {
      console.error('Error handling WebSocket message:', error);
    }
  }

  private handleDataUpdate(data: any): void {
    // Handle real-time data updates
    // This could update RTK Query cache or dispatch actions
    console.log('Data update received:', data);
  }

  private handleMetricsUpdate(metrics: any): void {
    // Handle real-time metrics updates
    this.notifySubscribers('metrics_update', metrics);
  }

  private handleSessionUpdate(sessionData: any): void {
    // Handle user session updates
    if (sessionData.action === 'logout') {
      store.dispatch({ type: 'auth/logout' });
    }
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts < this.maxReconnectAttempts) {
      this.reconnectAttempts++;
      const delay = this.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1);
      
      console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
      
      setTimeout(() => {
        if (this.socket) {
          this.socket.connect();
        }
      }, delay);
    } else {
      console.error('Max reconnection attempts reached');
      this.notifySubscribers('connection_failed', {
        message: 'Failed to reconnect to server',
      });
    }
  }

  private handleReconnectionError(): void {
    console.error('Reconnection failed');
  }

  private startHeartbeat(): void {
    this.stopHeartbeat();
    
    this.heartbeatInterval = setInterval(() => {
      if (this.socket && this.isConnected) {
        this.socket.emit('ping');
      }
    }, this.config.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }
  }

  // Subscription management
  subscribe(event: string, callback: (data: any) => void): () => void {
    if (!this.subscriptions.has(event)) {
      this.subscriptions.set(event, new Set());
    }
    
    this.subscriptions.get(event)!.add(callback);
    
    // Return unsubscribe function
    return () => {
      const callbacks = this.subscriptions.get(event);
      if (callbacks) {
        callbacks.delete(callback);
        if (callbacks.size === 0) {
          this.subscriptions.delete(event);
        }
      }
    };
  }

  private notifySubscribers(event: string, data: any): void {
    const callbacks = this.subscriptions.get(event);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error('Error in WebSocket callback:', error);
        }
      });
    }
  }

  // Public methods
  emit(event: string, data?: any): void {
    if (this.socket && this.isConnected) {
      this.socket.emit(event, data);
    } else {
      console.warn('WebSocket not connected, cannot emit event:', event);
    }
  }

  joinRoom(room: string): void {
    this.emit('join_room', { room });
  }

  leaveRoom(room: string): void {
    this.emit('leave_room', { room });
  }

  // Status methods
  isSocketConnected(): boolean {
    return this.isConnected && this.socket?.connected === true;
  }

  getConnectionState(): string {
    if (!this.socket) return 'disconnected';
    if (this.socket.connected) return 'connected';
    if (this.socket.connecting) return 'connecting';
    return 'disconnected';
  }

  // Configuration
  updateConfig(newConfig: Partial<WebSocketConfig>): void {
    this.config = { ...this.config, ...newConfig };
  }
}

// Create singleton instance
export const websocketService = new WebSocketService();

// React hook for WebSocket subscriptions
export const useWebSocket = (event: string, callback: (data: any) => void, deps: any[] = []) => {
  const { useEffect } = require('react');
  
  useEffect(() => {
    const unsubscribe = websocketService.subscribe(event, callback);
    return unsubscribe;
  }, deps);
};

// React hook for WebSocket connection status
export const useWebSocketStatus = () => {
  const { useState, useEffect } = require('react');
  const [isConnected, setIsConnected] = useState(websocketService.isSocketConnected());
  const [connectionState, setConnectionState] = useState(websocketService.getConnectionState());

  useEffect(() => {
    const checkStatus = () => {
      setIsConnected(websocketService.isSocketConnected());
      setConnectionState(websocketService.getConnectionState());
    };

    const unsubscribeConnect = websocketService.subscribe('connect', checkStatus);
    const unsubscribeDisconnect = websocketService.subscribe('disconnect', checkStatus);
    const unsubscribeError = websocketService.subscribe('connection_failed', checkStatus);

    // Check status periodically
    const interval = setInterval(checkStatus, 5000);

    return () => {
      unsubscribeConnect();
      unsubscribeDisconnect();
      unsubscribeError();
      clearInterval(interval);
    };
  }, []);

  return { isConnected, connectionState };
};