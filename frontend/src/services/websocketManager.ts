// Browser-compatible EventEmitter
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function) {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  emit(event: string, ...args: any[]) {
    if (this.events[event]) {
      this.events[event].forEach(listener => listener(...args));
    }
  }

  off(event: string, listener: Function) {
    if (this.events[event]) {
      this.events[event] = this.events[event].filter(l => l !== listener);
    }
  }
}

// WebSocket connection states
export enum ConnectionState {
  DISCONNECTED = 'disconnected',
  CONNECTING = 'connecting',
  CONNECTED = 'connected',
  RECONNECTING = 'reconnecting',
  ERROR = 'error',
}

// WebSocket message types
export interface WebSocketMessage {
  type: string;
  payload: any;
  timestamp: number;
  id?: string;
}

// WebSocket configuration
export interface WebSocketConfig {
  url: string;
  protocols?: string[];
  reconnectInterval: number;
  maxReconnectAttempts: number;
  heartbeatInterval: number;
  messageTimeout: number;
  enableCompression: boolean;
  enableLogging: boolean;
}

// Connection statistics
export interface ConnectionStats {
  connectTime: number;
  reconnectCount: number;
  messagesSent: number;
  messagesReceived: number;
  bytesTransferred: number;
  lastHeartbeat: number;
  latency: number;
}

// Advanced WebSocket Manager
export class WebSocketManager extends EventEmitter {
  private ws: WebSocket | null = null;
  private config: WebSocketConfig;
  private state: ConnectionState = ConnectionState.DISCONNECTED;
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;
  private messageQueue: WebSocketMessage[] = [];
  private pendingMessages = new Map<string, { resolve: Function; reject: Function; timeout: NodeJS.Timeout }>();
  private stats: ConnectionStats = {
    connectTime: 0,
    reconnectCount: 0,
    messagesSent: 0,
    messagesReceived: 0,
    bytesTransferred: 0,
    lastHeartbeat: 0,
    latency: 0,
  };

  constructor(config: WebSocketConfig) {
    super();
    this.config = config;
    this.setupEventHandlers();
  }

  // Connect to WebSocket server
  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      if (this.state === ConnectionState.CONNECTED) {
        resolve();
        return;
      }

      this.setState(ConnectionState.CONNECTING);
      this.log('Attempting to connect to WebSocket server');

      try {
        this.ws = new WebSocket(this.config.url, this.config.protocols);
        this.setupWebSocketHandlers(resolve, reject);
      } catch (error) {
        this.log('Failed to create WebSocket connection:', error);
        this.setState(ConnectionState.ERROR);
        reject(error);
      }
    });
  }

  // Disconnect from WebSocket server
  disconnect(): void {
    this.log('Disconnecting from WebSocket server');
    this.setState(ConnectionState.DISCONNECTED);
    this.clearTimers();
    this.clearPendingMessages();
    
    if (this.ws) {
      this.ws.close(1000, 'Client disconnect');
      this.ws = null;
    }
  }

  // Send message with optional response handling
  send<T = any>(type: string, payload: any, expectResponse = false): Promise<T> {
    const message: WebSocketMessage = {
      type,
      payload,
      timestamp: Date.now(),
      id: expectResponse ? this.generateMessageId() : undefined,
    };

    return new Promise((resolve, reject) => {
      if (this.state !== ConnectionState.CONNECTED) {
        this.queueMessage(message);
        if (expectResponse) {
          reject(new Error('WebSocket not connected'));
        } else {
          resolve(undefined as T);
        }
        return;
      }

      try {
        const messageStr = JSON.stringify(message);
        this.ws!.send(messageStr);
        this.stats.messagesSent++;
        this.stats.bytesTransferred += messageStr.length;
        this.log('Sent message:', message);

        if (expectResponse && message.id) {
          const timeout = setTimeout(() => {
            this.pendingMessages.delete(message.id!);
            reject(new Error(`Message timeout: ${type}`));
          }, this.config.messageTimeout);

          this.pendingMessages.set(message.id, { resolve, reject, timeout });
        } else {
          resolve(undefined as T);
        }
      } catch (error) {
        this.log('Failed to send message:', error);
        reject(error);
      }
    });
  }

  // Send heartbeat/ping
  ping(): Promise<number> {
    const startTime = Date.now();
    return this.send('ping', { timestamp: startTime }, true)
      .then(() => {
        const latency = Date.now() - startTime;
        this.stats.latency = latency;
        this.stats.lastHeartbeat = Date.now();
        return latency;
      });
  }

  // Get current connection state
  getState(): ConnectionState {
    return this.state;
  }

  // Get connection statistics
  getStats(): ConnectionStats {
    return { ...this.stats };
  }

  // Check if connected
  isConnected(): boolean {
    return this.state === ConnectionState.CONNECTED && this.ws?.readyState === WebSocket.OPEN;
  }

  // Subscribe to specific message types
  subscribe(messageType: string, handler: (payload: any) => void): () => void {
    const eventName = `message:${messageType}`;
    this.on(eventName, handler);
    return () => this.off(eventName, handler);
  }

  // Private methods
  private setupEventHandlers(): void {
    // Handle visibility change for connection management
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', () => {
        if (document.hidden) {
          this.log('Page hidden, pausing heartbeat');
          this.clearHeartbeat();
        } else {
          this.log('Page visible, resuming heartbeat');
          this.startHeartbeat();
        }
      });
    }

    // Handle online/offline events
    if (typeof window !== 'undefined') {
      window.addEventListener('online', () => {
        this.log('Network online, attempting reconnection');
        if (this.state === ConnectionState.DISCONNECTED) {
          this.connect();
        }
      });

      window.addEventListener('offline', () => {
        this.log('Network offline');
        this.setState(ConnectionState.ERROR);
      });
    }
  }

  private setupWebSocketHandlers(resolve: Function, reject: Function): void {
    if (!this.ws) return;

    this.ws.onopen = () => {
      this.log('WebSocket connected successfully');
      this.setState(ConnectionState.CONNECTED);
      this.stats.connectTime = Date.now();
      this.reconnectAttempts = 0;
      this.startHeartbeat();
      this.processMessageQueue();
      resolve();
    };

    this.ws.onmessage = (event) => {
      try {
        const message: WebSocketMessage = JSON.parse(event.data);
        this.handleIncomingMessage(message);
        this.stats.messagesReceived++;
        this.stats.bytesTransferred += event.data.length;
      } catch (error) {
        this.log('Failed to parse incoming message:', error);
      }
    };

    this.ws.onclose = (event) => {
      this.log('WebSocket connection closed:', event.code, event.reason);
      this.clearTimers();
      
      if (event.code !== 1000 && this.state !== ConnectionState.DISCONNECTED) {
        this.handleReconnection();
      } else {
        this.setState(ConnectionState.DISCONNECTED);
      }
    };

    this.ws.onerror = (error) => {
      this.log('WebSocket error:', error);
      this.setState(ConnectionState.ERROR);
      reject(error);
    };
  }

  private handleIncomingMessage(message: WebSocketMessage): void {
    this.log('Received message:', message);

    // Handle response to pending message
    if (message.id && this.pendingMessages.has(message.id)) {
      const pending = this.pendingMessages.get(message.id)!;
      clearTimeout(pending.timeout);
      this.pendingMessages.delete(message.id);
      pending.resolve(message.payload);
      return;
    }

    // Handle heartbeat response
    if (message.type === 'pong') {
      this.stats.lastHeartbeat = Date.now();
      return;
    }

    // Emit message event
    this.emit('message', message);
    this.emit(`message:${message.type}`, message.payload);
  }

  private handleReconnection(): void {
    if (this.reconnectAttempts >= this.config.maxReconnectAttempts) {
      this.log('Max reconnection attempts reached');
      this.setState(ConnectionState.ERROR);
      this.emit('maxReconnectAttemptsReached');
      return;
    }

    this.setState(ConnectionState.RECONNECTING);
    this.reconnectAttempts++;
    this.stats.reconnectCount++;

    const delay = Math.min(
      this.config.reconnectInterval * Math.pow(2, this.reconnectAttempts - 1),
      30000 // Max 30 seconds
    );

    this.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);

    this.reconnectTimer = setTimeout(() => {
      this.connect().catch((error) => {
        this.log('Reconnection failed:', error);
        this.handleReconnection();
      });
    }, delay);
  }

  private startHeartbeat(): void {
    this.clearHeartbeat();
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.ping().catch((error) => {
          this.log('Heartbeat failed:', error);
        });
      }
    }, this.config.heartbeatInterval);
  }

  private clearHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  private clearTimers(): void {
    this.clearHeartbeat();
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
  }

  private clearPendingMessages(): void {
    this.pendingMessages.forEach(({ reject, timeout }) => {
      clearTimeout(timeout);
      reject(new Error('Connection closed'));
    });
    this.pendingMessages.clear();
  }

  private queueMessage(message: WebSocketMessage): void {
    this.messageQueue.push(message);
    this.log('Message queued:', message);
  }

  private processMessageQueue(): void {
    while (this.messageQueue.length > 0 && this.isConnected()) {
      const message = this.messageQueue.shift()!;
      this.send(message.type, message.payload).catch((error) => {
        this.log('Failed to send queued message:', error);
      });
    }
  }

  private setState(newState: ConnectionState): void {
    if (this.state !== newState) {
      const oldState = this.state;
      this.state = newState;
      this.log(`State changed: ${oldState} -> ${newState}`);
      this.emit('stateChange', { oldState, newState });
    }
  }

  private generateMessageId(): string {
    return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  }

  private log(...args: any[]): void {
    if (this.config.enableLogging) {
      console.log('[WebSocketManager]', ...args);
    }
  }
}

// Default configuration
export const defaultWebSocketConfig: WebSocketConfig = {
  url: process.env.REACT_APP_WS_URL || 'ws://localhost:8000/ws',
  reconnectInterval: 1000,
  maxReconnectAttempts: 10,
  heartbeatInterval: 30000,
  messageTimeout: 10000,
  enableCompression: true,
  enableLogging: process.env.NODE_ENV === 'development',
};

// Singleton instance
let wsManagerInstance: WebSocketManager | null = null;

export function getWebSocketManager(config?: Partial<WebSocketConfig>): WebSocketManager {
  if (!wsManagerInstance) {
    wsManagerInstance = new WebSocketManager({ ...defaultWebSocketConfig, ...config });
  }
  return wsManagerInstance;
}

export default WebSocketManager;