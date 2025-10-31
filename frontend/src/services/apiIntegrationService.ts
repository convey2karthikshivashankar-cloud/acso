import { APIResponseCache } from './cacheOptimizationService';

interface APIConfig {
  baseURL: string;
  timeout: number;
  retryAttempts: number;
  retryDelay: number;
  enableCache: boolean;
  enableLogging: boolean;
}

interface RequestConfig {
  method: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';
  headers?: Record<string, string>;
  body?: any;
  cache?: boolean;
  cacheTTL?: number;
  retry?: boolean;
  timeout?: number;
}

interface APIResponse<T> {
  data: T;
  status: number;
  statusText: string;
  headers: Record<string, string>;
  cached: boolean;
}

export class APIIntegrationService {
  private config: APIConfig;
  private cache: APIResponseCache;
  private requestInterceptors: Array<(config: RequestConfig) => RequestConfig> = [];
  private responseInterceptors: Array<(response: APIResponse<any>) => APIResponse<any>> = [];
  private errorInterceptors: Array<(error: Error) => Error | void> = [];

  constructor(config: Partial<APIConfig> = {}) {
    this.config = {
      baseURL: process.env.REACT_APP_API_BASE_URL || 'http://localhost:8000',
      timeout: 30000,
      retryAttempts: 3,
      retryDelay: 1000,
      enableCache: true,
      enableLogging: process.env.NODE_ENV === 'development',
      ...config
    };

    this.cache = new APIResponseCache({
      maxSize: 500,
      defaultTTL: 5 * 60 * 1000 // 5 minutes
    });
  }

  // Request interceptor
  addRequestInterceptor(interceptor: (config: RequestConfig) => RequestConfig): void {
    this.requestInterceptors.push(interceptor);
  }

  // Response interceptor
  addResponseInterceptor(interceptor: (response: APIResponse<any>) => APIResponse<any>): void {
    this.responseInterceptors.push(interceptor);
  }

  // Error interceptor
  addErrorInterceptor(interceptor: (error: Error) => Error | void): void {
    this.errorInterceptors.push(interceptor);
  }

  // Main request method
  async request<T>(endpoint: string, config: RequestConfig = { method: 'GET' }): Promise<APIResponse<T>> {
    const url = `${this.config.baseURL}${endpoint}`;
    const cacheKey = this.generateCacheKey(url, config);

    // Apply request interceptors
    let processedConfig = { ...config };
    for (const interceptor of this.requestInterceptors) {
      processedConfig = interceptor(processedConfig);
    }

    // Check cache first
    if (this.config.enableCache && processedConfig.cache !== false && processedConfig.method === 'GET') {
      const cachedResponse = await this.cache.get(cacheKey);
      if (cachedResponse) {
        this.log('Cache hit', { url, cacheKey });
        return { ...cachedResponse, cached: true };
      }
    }

    // Execute request with retry logic
    let lastError: Error | null = null;
    const maxAttempts = processedConfig.retry !== false ? this.config.retryAttempts : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        const response = await this.executeRequest<T>(url, processedConfig);
        
        // Apply response interceptors
        let processedResponse = response;
        for (const interceptor of this.responseInterceptors) {
          processedResponse = interceptor(processedResponse);
        }

        // Cache successful responses
        if (this.config.enableCache && processedConfig.cache !== false && processedConfig.method === 'GET') {
          await this.cache.set(cacheKey, processedResponse, processedConfig.cacheTTL);
        }

        this.log('Request successful', { url, attempt, status: response.status });
        return processedResponse;

      } catch (error) {
        lastError = error as Error;
        
        // Apply error interceptors
        for (const interceptor of this.errorInterceptors) {
          const result = interceptor(lastError);
          if (result) {
            lastError = result;
          }
        }

        this.log('Request failed', { url, attempt, error: lastError.message });

        // Don't retry on client errors (4xx)
        if (this.isClientError(lastError)) {
          break;
        }

        // Wait before retry
        if (attempt < maxAttempts) {
          await this.delay(this.config.retryDelay * attempt);
        }
      }
    }

    throw lastError;
  }

  private async executeRequest<T>(url: string, config: RequestConfig): Promise<APIResponse<T>> {
    const controller = new AbortController();
    const timeout = config.timeout || this.config.timeout;

    const timeoutId = setTimeout(() => {
      controller.abort();
    }, timeout);

    try {
      const headers = {
        'Content-Type': 'application/json',
        ...config.headers
      };

      // Add authentication header if available
      const token = localStorage.getItem('auth_token');
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
      }

      const fetchConfig: RequestInit = {
        method: config.method,
        headers,
        signal: controller.signal
      };

      if (config.body && config.method !== 'GET') {
        fetchConfig.body = JSON.stringify(config.body);
      }

      const response = await fetch(url, fetchConfig);
      
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();
      const responseHeaders: Record<string, string> = {};
      
      response.headers.forEach((value, key) => {
        responseHeaders[key] = value;
      });

      return {
        data,
        status: response.status,
        statusText: response.statusText,
        headers: responseHeaders,
        cached: false
      };

    } finally {
      clearTimeout(timeoutId);
    }
  }

  // Convenience methods
  async get<T>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'GET' });
  }

  async post<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'POST', body: data });
  }

  async put<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PUT', body: data });
  }

  async patch<T>(endpoint: string, data?: any, config?: Omit<RequestConfig, 'method' | 'body'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'PATCH', body: data });
  }

  async delete<T>(endpoint: string, config?: Omit<RequestConfig, 'method'>): Promise<APIResponse<T>> {
    return this.request<T>(endpoint, { ...config, method: 'DELETE' });
  }

  // Utility methods
  private generateCacheKey(url: string, config: RequestConfig): string {
    const key = `${config.method}:${url}`;
    if (config.body) {
      return `${key}:${JSON.stringify(config.body)}`;
    }
    return key;
  }

  private isClientError(error: Error): boolean {
    const message = error.message;
    return message.includes('HTTP 4') || message.includes('400') || message.includes('401') || 
           message.includes('403') || message.includes('404');
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  private log(message: string, data?: any): void {
    if (this.config.enableLogging) {
      console.log(`[API] ${message}`, data);
    }
  }

  // Health check
  async healthCheck(): Promise<boolean> {
    try {
      const response = await this.get('/health');
      return response.status === 200;
    } catch {
      return false;
    }
  }

  // Clear cache
  clearCache(): void {
    this.cache.clear();
  }

  // Get cache stats
  getCacheStats() {
    return this.cache.getStats();
  }
}

// Real-time synchronization service
export class RealTimeSyncService {
  private ws: WebSocket | null = null;
  private reconnectAttempts = 0;
  private maxReconnectAttempts = 5;
  private reconnectDelay = 1000;
  private subscribers = new Map<string, Set<(data: any) => void>>();
  private isConnected = false;

  constructor(private wsUrl: string) {}

  connect(): Promise<void> {
    return new Promise((resolve, reject) => {
      try {
        this.ws = new WebSocket(this.wsUrl);

        this.ws.onopen = () => {
          this.isConnected = true;
          this.reconnectAttempts = 0;
          console.log('WebSocket connected');
          resolve();
        };

        this.ws.onmessage = (event) => {
          try {
            const message = JSON.parse(event.data);
            this.handleMessage(message);
          } catch (error) {
            console.error('Error parsing WebSocket message:', error);
          }
        };

        this.ws.onclose = () => {
          this.isConnected = false;
          console.log('WebSocket disconnected');
          this.attemptReconnect();
        };

        this.ws.onerror = (error) => {
          console.error('WebSocket error:', error);
          reject(error);
        };

      } catch (error) {
        reject(error);
      }
    });
  }

  private handleMessage(message: { type: string; channel: string; data: any }): void {
    const { type, channel, data } = message;
    
    if (type === 'data' && this.subscribers.has(channel)) {
      const channelSubscribers = this.subscribers.get(channel)!;
      channelSubscribers.forEach(callback => callback(data));
    }
  }

  subscribe(channel: string, callback: (data: any) => void): () => void {
    if (!this.subscribers.has(channel)) {
      this.subscribers.set(channel, new Set());
    }
    
    this.subscribers.get(channel)!.add(callback);
    
    // Send subscription message
    if (this.isConnected && this.ws) {
      this.ws.send(JSON.stringify({ type: 'subscribe', channel }));
    }

    // Return unsubscribe function
    return () => {
      const channelSubscribers = this.subscribers.get(channel);
      if (channelSubscribers) {
        channelSubscribers.delete(callback);
        if (channelSubscribers.size === 0) {
          this.subscribers.delete(channel);
          // Send unsubscribe message
          if (this.isConnected && this.ws) {
            this.ws.send(JSON.stringify({ type: 'unsubscribe', channel }));
          }
        }
      }
    };
  }

  private attemptReconnect(): void {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error('Max reconnection attempts reached');
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);
    
    console.log(`Attempting to reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`);
    
    setTimeout(() => {
      this.connect().catch(() => {
        // Reconnection failed, will try again
      });
    }, delay);
  }

  disconnect(): void {
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.isConnected = false;
    this.subscribers.clear();
  }

  getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

// Error handling service
export class APIErrorHandler {
  private static instance: APIErrorHandler;
  private errorHandlers = new Map<number, (error: Error) => void>();

  static getInstance(): APIErrorHandler {
    if (!APIErrorHandler.instance) {
      APIErrorHandler.instance = new APIErrorHandler();
    }
    return APIErrorHandler.instance;
  }

  registerErrorHandler(statusCode: number, handler: (error: Error) => void): void {
    this.errorHandlers.set(statusCode, handler);
  }

  handleError(error: Error): void {
    const statusMatch = error.message.match(/HTTP (\d+):/);
    if (statusMatch) {
      const statusCode = parseInt(statusMatch[1]);
      const handler = this.errorHandlers.get(statusCode);
      if (handler) {
        handler(error);
        return;
      }
    }

    // Default error handling
    console.error('Unhandled API error:', error);
    
    // Show user-friendly error message
    this.showErrorNotification(this.getErrorMessage(error));
  }

  private getErrorMessage(error: Error): string {
    if (error.message.includes('HTTP 401')) {
      return 'Authentication required. Please log in again.';
    }
    if (error.message.includes('HTTP 403')) {
      return 'You do not have permission to perform this action.';
    }
    if (error.message.includes('HTTP 404')) {
      return 'The requested resource was not found.';
    }
    if (error.message.includes('HTTP 500')) {
      return 'Server error. Please try again later.';
    }
    if (error.message.includes('NetworkError') || error.message.includes('fetch')) {
      return 'Network error. Please check your connection.';
    }
    
    return 'An unexpected error occurred. Please try again.';
  }

  private showErrorNotification(message: string): void {
    // This would integrate with your notification system
    console.error(message);
  }
}

// Initialize default API service
export const apiService = new APIIntegrationService();

// Setup default error handling
const errorHandler = APIErrorHandler.getInstance();
errorHandler.registerErrorHandler(401, () => {
  // Redirect to login
  window.location.href = '/login';
});

apiService.addErrorInterceptor((error) => {
  errorHandler.handleError(error);
  return error;
});

// Setup default request interceptors
apiService.addRequestInterceptor((config) => {
  // Add request ID for tracking
  const requestId = Math.random().toString(36).substr(2, 9);
  return {
    ...config,
    headers: {
      ...config.headers,
      'X-Request-ID': requestId
    }
  };
});

// Setup default response interceptors
apiService.addResponseInterceptor((response) => {
  // Log response time if available
  const responseTime = response.headers['x-response-time'];
  if (responseTime) {
    console.log(`Response time: ${responseTime}ms`);
  }
  
  return response;
});