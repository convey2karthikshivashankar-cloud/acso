// Live Data Service for real-time updates
import productionConfig from '../config/productionConfig';

export interface LiveDataConnection {
  connect(): void;
  disconnect(): void;
  subscribe(type: string, callback: (data: any) => void): void;
  unsubscribe(type: string): void;
  isConnected(): boolean;
}

class LiveDataService implements LiveDataConnection {
  private ws: WebSocket | null = null;
  private subscribers: Map<string, Set<(data: any) => void>> = new Map();
  private reconnectAttempts = 0;
  private reconnectTimer: NodeJS.Timeout | null = null;
  private heartbeatTimer: NodeJS.Timeout | null = null;

  connect(): void {
    if (this.ws?.readyState === WebSocket.OPEN) {
      return;
    }

    try {
      this.ws = new WebSocket(productionConfig.websocket.url);
      
      this.ws.onopen = () => {
        console.log('🔗 Connected to live data stream');
        this.reconnectAttempts = 0;
        this.startHeartbeat();
      };

      this.ws.onmessage = (event) => {
        try {
          const message = JSON.parse(event.data);
          this.handleMessage(message);
        } catch (error) {
          console.error('Failed to parse WebSocket message:', error);
        }
      };

      this.ws.onclose = () => {
        console.log('🔌 Disconnected from live data stream');
        this.stopHeartbeat();
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error('WebSocket error:', error);
      };
    } catch (error) {
      console.error('Failed to connect to WebSocket:', error);
      this.scheduleReconnect();
    }
  }

  disconnect(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    
    this.stopHeartbeat();
    
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
  }

  subscribe(type: string, callback: (data: any) => void): void {
    if (!this.subscribers.has(type)) {
      this.subscribers.set(type, new Set());
    }
    this.subscribers.get(type)!.add(callback);
  }

  unsubscribe(type: string): void {
    this.subscribers.delete(type);
  }

  isConnected(): boolean {
    return this.ws?.readyState === WebSocket.OPEN;
  }

  private handleMessage(message: any): void {
    const { type, data } = message;
    const callbacks = this.subscribers.get(type);
    
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback(data);
        } catch (error) {
          console.error(`Error in callback for ${type}:`, error);
        }
      });
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectAttempts >= productionConfig.websocket.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = productionConfig.websocket.reconnectInterval * this.reconnectAttempts;
    
    console.log(`Reconnecting in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    this.reconnectTimer = setTimeout(() => {
      this.connect();
    }, delay);
  }

  private startHeartbeat(): void {
    this.heartbeatTimer = setInterval(() => {
      if (this.ws?.readyState === WebSocket.OPEN) {
        this.ws.send(JSON.stringify({ type: 'ping' }));
      }
    }, productionConfig.websocket.heartbeatInterval);
  }

  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }
}

// Singleton instance
export const liveDataService = new LiveDataService();

// Auto-connect if demo mode is enabled
if (productionConfig.demo.enabled && productionConfig.demo.autoStart) {
  // Connect after a short delay to allow the app to initialize
  setTimeout(() => {
    liveDataService.connect();
  }, 1000);
}

// React hook for using live data
import { useState, useEffect } from 'react';

export function useLiveData<T>(type: string, initialData?: T): T | undefined {
  const [data, setData] = useState<T | undefined>(initialData);

  useEffect(() => {
    const handleData = (newData: T) => {
      setData(newData);
    };

    liveDataService.subscribe(type, handleData);

    return () => {
      liveDataService.unsubscribe(type);
    };
  }, [type]);

  return data;
}

// Fallback data service for when WebSocket is not available
export class FallbackDataService {
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  startPolling(type: string, callback: (data: any) => void, interval: number = 5000): void {
    if (this.intervals.has(type)) {
      return;
    }

    const poll = async () => {
      try {
        const response = await fetch(`${productionConfig.api.baseUrl}/${type}`);
        if (response.ok) {
          const data = await response.json();
          callback(data);
        }
      } catch (error) {
        console.error(`Failed to fetch ${type}:`, error);
      }
    };

    // Initial fetch
    poll();

    // Set up polling
    const timer = setInterval(poll, interval);
    this.intervals.set(type, timer);
  }

  stopPolling(type: string): void {
    const timer = this.intervals.get(type);
    if (timer) {
      clearInterval(timer);
      this.intervals.delete(type);
    }
  }

  stopAllPolling(): void {
    this.intervals.forEach((timer) => clearInterval(timer));
    this.intervals.clear();
  }
}

export const fallbackDataService = new FallbackDataService();