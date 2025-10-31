import { store } from '../store';

export interface WebSocketMessage {
  type: string;
  data: Record<string, any>;
  timestamp?: string;
  source?: string;
  target?: string;
  request_id?: string;
}

export interface WebSocketSubscription {
  topic: string;
  filters?: Record<string, any>;
  permissions?: string[];
}

export interface WebSocketConnectionInfo {
  connection_id: string;
  user_id: string;
  username: string;
  connected_at: string;
  last_activity: string;
  message_count: number;
  subscription_count: number;
}

type MessageHandler = (message: WebSocketMessage) => void;
type ConnectionHandler = (connected: boolean) => void;
type ErrorHandler = (error: Event) => void;

class WebSocketService {
  private ws: WebSocket | null = null;
  private baseURL: string;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 10;
  private reconnectDelay = 1000;
  private maxReconnectDelay = 30000;
  private heartbeatInterval: NodeJS.Timeout | null = null;
  private connectionId: string | null = null;
  private isConnecting = false;
  private shouldReconnect = true;
  private connectionState: 'disconnected' | 'connecting' | 'connected' | 'reconnecting' = 'disconnected';
  private lastHeartbeat: number = 0;
  private heartbeatTimeout: NodeJS.Timeout | null = null;

  // Event handlers
  private messageHandlers: Map<string, Set<MessageHandler>> = new Map();
  private connectionHandlers: Set<ConnectionHandler> = new Set();
  private errorHandlers: Set<ErrorHandler> = new Set();

  // Subscriptions
  private subscriptions: Map<string, WebSocketSubscription> = new Map();
  private pendingSubscriptions: WebSocketSubscription[] = [];

  constructor() {
    this.baseURL = this.getWebSocketURL();
    
    // Listen for auth changes
    window.addEventListener('auth:logout', () => {
      this.disconnect();
    });

    // Listen for page visibility changes
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible' && !this.isConnected()) {
        this.connect();
      }
    });

    // Listen for online/offline events
    window.addEventListener('online', () => {
      if (!this.isConnected()) {
        this.connect();
      }
    });

    window.addEventListener('offline', () => {
      this.disconnect();
    });
  }

  private getWebSocketURL(): string {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const host = window.location.host;
    const apiPath = (import.meta as any).env?.VITE_API_BASE_URL || '/api';
    return `${protocol}//${host}${apiPath}/ws`;
  }

  private getAuthToken(): string | null {
    const state = store.getState();
    return state.auth.token;
  }

  async connect(): Promise<void> {
    if (this.isConnecting || this.isConnected()) {
      return;
    }

    const token = this.getAuthToken();
    if (!token) {
      console.warn('WebSocket: No auth token available');
      return;
    }

    this.isConnecting = true;
    this.shouldReconnect = true;

    try {
      const wsUrl = `${this.baseURL}?token=${encodeURIComponent(token)}`;
      this.ws = new WebSocket(wsUrl);

      this.ws.onopen = this.handleOpen.bind(this);
      this.ws.onmessage = this.handleMessage.bind(this);
      this.ws.onclose = this.handleClose.bind(this);
      this.ws.onerror = this.handleError.bind(this);

    } catch (error) {
      console.error('WebSocket connection failed:', error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    this.shouldReconnect = false;
    this.isConnecting = false;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }

    this.connectionId = null;
    this.reconnectAttempts = 0;
    this.notifyConnectionHandlers(false);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleOpen(_event: Event): void {
    console.log('WebSocket connected');
    this.isConnecting = false;
    this.reconnectAttempts = 0;
    
    // Start heartbeat
    this.startHeartbeat();
    
    // Resubscribe to topics
    this.resubscribeToTopics();
    
    this.notifyConnectionHandlers(true);
  }

  private handleMessage(event: MessageEvent): void {
    try {
      const message: WebSocketMessage = JSON.parse(event.data);
      
      // Handle system messages
      if (message.type === 'connected') {
        this.connectionId = message.data.connection_id;
        console.log('WebSocket connection established:', this.connectionId);
      } else if (message.type === 'pong') {
        // Heartbeat response - no action needed
      } else if (message.type === 'error') {
        console.error('WebSocket server error:', message.data);
        this.notifyErrorHandlers(new Event('server-error'));
      } else if (message.type === 'subscribed') {
        console.log('Subscribed to topic:', message.data.topic);
      } else if (message.type === 'unsubscribed') {
        console.log('Unsubscribed from topic:', message.data.topic);
      } else {
        // Handle application messages
        this.notifyMessageHandlers(message.type, message);
      }
      
    } catch (error) {
      console.error('Failed to parse WebSocket message:', error);
    }
  }

  private handleClose(event: CloseEvent): void {
    console.log('WebSocket disconnected:', event.code, event.reason);
    this.isConnecting = false;
    this.ws = null;
    this.connectionId = null;

    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
      this.heartbeatInterval = null;
    }

    this.notifyConnectionHandlers(false);

    // Attempt to reconnect if not intentionally closed
    if (this.shouldReconnect && event.code !== 1000) {
      this.scheduleReconnect();
    }
  }

  private handleError(event: Event): void {
    console.error('WebSocket error:', event);
    this.notifyErrorHandlers(event);
  }

  private scheduleReconnect(): void {
    if (!this.shouldReconnect || this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.warn('WebSocket: Max reconnection attempts reached');
      return;
    }

    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts);
    this.reconnectAttempts++;

    console.log(`WebSocket: Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      if (this.shouldReconnect && !this.isConnected()) {
        this.connect();
      }
    }, delay);
  }

  private startHeartbeat(): void {
    if (this.heartbeatInterval) {
      clearInterval(this.heartbeatInterval);
    }

    this.heartbeatInterval = setInterval(() => {
      if (this.isConnected()) {
        this.send({
          type: 'ping',
          data: { timestamp: new Date().toISOString() }
        });
      }
    }, 30000); // Send ping every 30 seconds
  }

  private resubscribeToTopics(): void {
    // Resubscribe to existing subscriptions
    for (const subscription of this.subscriptions.values()) {
      this.subscribeToTopic(subscription);
    }

    // Subscribe to pending subscriptions
    for (const subscription of this.pendingSubscriptions) {
      this.subscribeToTopic(subscription);
    }
    this.pendingSubscriptions = [];
  }

  // Public API methods

  send(message: WebSocketMessage): boolean {
    if (!this.isConnected()) {
      console.warn('WebSocket: Cannot send message - not connected');
      return false;
    }

    try {
      // Add timestamp if not present
      if (!message.timestamp) {
        message.timestamp = new Date().toISOString();
      }

      this.ws!.send(JSON.stringify(message));
      return true;
    } catch (error) {
      console.error('Failed to send WebSocket message:', error);
      return false;
    }
  }

  subscribe(topic: string, filters?: Record<string, any>, permissions?: string[]): void {
    const subscription: WebSocketSubscription = {
      topic,
      filters,
      permissions
    };

    this.subscriptions.set(topic, subscription);

    if (this.isConnected()) {
      this.subscribeToTopic(subscription);
    } else {
      this.pendingSubscriptions.push(subscription);
    }
  }

  unsubscribe(topic: string): void {
    this.subscriptions.delete(topic);

    if (this.isConnected()) {
      this.send({
        type: 'unsubscribe',
        data: { topic }
      });
    }
  }

  private subscribeToTopic(subscription: WebSocketSubscription): void {
    this.send({
      type: 'subscribe',
      data: {
        topic: subscription.topic,
        filters: subscription.filters || {},
        permissions: subscription.permissions || []
      }
    });
  }

  // Event handler management

  onMessage(messageType: string, handler: MessageHandler): () => void {
    if (!this.messageHandlers.has(messageType)) {
      this.messageHandlers.set(messageType, new Set());
    }
    
    this.messageHandlers.get(messageType)!.add(handler);

    // Return unsubscribe function
    return () => {
      const handlers = this.messageHandlers.get(messageType);
      if (handlers) {
        handlers.delete(handler);
        if (handlers.size === 0) {
          this.messageHandlers.delete(messageType);
        }
      }
    };
  }

  onConnection(handler: ConnectionHandler): () => void {
    this.connectionHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.connectionHandlers.delete(handler);
    };
  }

  onError(handler: ErrorHandler): () => void {
    this.errorHandlers.add(handler);

    // Return unsubscribe function
    return () => {
      this.errorHandlers.delete(handler);
    };
  }

  private notifyMessageHandlers(messageType: string, message: WebSocketMessage): void {
    const handlers = this.messageHandlers.get(messageType);
    if (handlers) {
      handlers.forEach(handler => {
        try {
          handler(message);
        } catch (error) {
          console.error('Error in message handler:', error);
        }
      });
    }
  }

  private notifyConnectionHandlers(connected: boolean): void {
    this.connectionHandlers.forEach(handler => {
      try {
        handler(connected);
      } catch (error) {
        console.error('Error in connection handler:', error);
      }
    });
  }

  private notifyErrorHandlers(event: Event): void {
    this.errorHandlers.forEach(handler => {
      try {
        handler(event);
      } catch (error) {
        console.error('Error in error handler:', error);
      }
    });
  }

  // Utility methods

  getConnectionInfo(): Promise<WebSocketConnectionInfo | null> {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        resolve(null);
        return;
      }

      const requestId = `info_${Date.now()}`;
      
      const unsubscribe = this.onMessage('connection_info', (message) => {
        if (message.data.request_id === requestId) {
          unsubscribe();
          resolve(message.data.info);
        }
      });

      this.send({
        type: 'get_connection_info',
        data: {},
        request_id: requestId
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        resolve(null);
      }, 5000);
    });
  }

  getSubscriptions(): Promise<WebSocketSubscription[]> {
    return new Promise((resolve) => {
      if (!this.isConnected()) {
        resolve([]);
        return;
      }

      const requestId = `subs_${Date.now()}`;
      
      const unsubscribe = this.onMessage('subscriptions', (message) => {
        if (message.data.request_id === requestId) {
          unsubscribe();
          resolve(message.data.subscriptions);
        }
      });

      this.send({
        type: 'get_subscriptions',
        data: {},
        request_id: requestId
      });

      // Timeout after 5 seconds
      setTimeout(() => {
        unsubscribe();
        resolve([]);
      }, 5000);
    });
  }

  // Configuration methods

  setMaxReconnectAttempts(attempts: number): void {
    this.maxReconnectAttempts = attempts;
  }

  setReconnectDelay(delay: number): void {
    this.reconnectDelay = delay;
  }

  // Status methods

  getConnectionId(): string | null {
    return this.connectionId;
  }

  getReadyState(): number {
    return this.ws?.readyState ?? WebSocket.CLOSED;
  }

  getReconnectAttempts(): number {
    return this.reconnectAttempts;
  }

  isSocketConnected(): boolean {
    return this.isConnected();
  }

  getConnectionState(): string {
    if (this.isConnecting) return 'connecting';
    if (this.isConnected()) return 'connected';
    if (this.reconnectAttempts > 0) return 'reconnecting';
    return 'disconnected';
  }

  // Room management methods
  joinRoom(roomName: string): void {
    this.send({
      type: 'join_room',
      data: { room: roomName }
    });
  }

  leaveRoom(roomName: string): void {
    this.send({
      type: 'leave_room',
      data: { room: roomName }
    });
  }

  // Event emission
  emit(event: string, data?: any): void {
    this.send({
      type: 'event',
      data: {
        event,
        payload: data
      }
    });
  }
}

// Create and export singleton instance
export const websocketService = new WebSocketService();
export default websocketService;