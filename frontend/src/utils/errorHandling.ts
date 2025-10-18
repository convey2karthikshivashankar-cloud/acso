import { SerializedError } from '@reduxjs/toolkit';
import { FetchBaseQueryError } from '@reduxjs/toolkit/query';

// Error types
export interface APIError {
  code: string;
  message: string;
  requestId?: string;
  status?: number;
  timestamp: string;
  details?: any;
}

export interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
  errorInfo: any;
}

// Error classification
export enum ErrorSeverity {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum ErrorCategory {
  NETWORK = 'network',
  AUTHENTICATION = 'authentication',
  AUTHORIZATION = 'authorization',
  VALIDATION = 'validation',
  SERVER = 'server',
  CLIENT = 'client',
  UNKNOWN = 'unknown'
}

export interface ClassifiedError {
  originalError: any;
  category: ErrorCategory;
  severity: ErrorSeverity;
  message: string;
  userMessage: string;
  code: string;
  retryable: boolean;
  timestamp: string;
}

// Error classification logic
export function classifyError(error: any): ClassifiedError {
  const timestamp = new Date().toISOString();
  
  // Handle RTK Query errors
  if (isRTKQueryError(error)) {
    return classifyRTKQueryError(error, timestamp);
  }
  
  // Handle API client errors
  if (isAPIError(error)) {
    return classifyAPIError(error, timestamp);
  }
  
  // Handle network errors
  if (isNetworkError(error)) {
    return {
      originalError: error,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      message: error.message || 'Network error occurred',
      userMessage: 'Unable to connect to the server. Please check your internet connection.',
      code: 'NETWORK_ERROR',
      retryable: true,
      timestamp
    };
  }
  
  // Handle JavaScript errors
  if (error instanceof Error) {
    return {
      originalError: error,
      category: ErrorCategory.CLIENT,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: 'An unexpected error occurred. Please try again.',
      code: 'CLIENT_ERROR',
      retryable: false,
      timestamp
    };
  }
  
  // Unknown error
  return {
    originalError: error,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    message: String(error),
    userMessage: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    retryable: false,
    timestamp
  };
}

function classifyRTKQueryError(error: FetchBaseQueryError | SerializedError, timestamp: string): ClassifiedError {
  if ('status' in error) {
    const status = error.status;
    
    if (status === 401) {
      return {
        originalError: error,
        category: ErrorCategory.AUTHENTICATION,
        severity: ErrorSeverity.HIGH,
        message: 'Authentication failed',
        userMessage: 'Your session has expired. Please log in again.',
        code: 'AUTH_EXPIRED',
        retryable: false,
        timestamp
      };
    }
    
    if (status === 403) {
      return {
        originalError: error,
        category: ErrorCategory.AUTHORIZATION,
        severity: ErrorSeverity.HIGH,
        message: 'Access denied',
        userMessage: 'You do not have permission to perform this action.',
        code: 'ACCESS_DENIED',
        retryable: false,
        timestamp
      };
    }
    
    if (status === 404) {
      return {
        originalError: error,
        category: ErrorCategory.CLIENT,
        severity: ErrorSeverity.MEDIUM,
        message: 'Resource not found',
        userMessage: 'The requested resource was not found.',
        code: 'NOT_FOUND',
        retryable: false,
        timestamp
      };
    }
    
    if (status >= 400 && status < 500) {
      return {
        originalError: error,
        category: ErrorCategory.VALIDATION,
        severity: ErrorSeverity.MEDIUM,
        message: 'Client error',
        userMessage: 'There was an issue with your request. Please check your input and try again.',
        code: 'CLIENT_ERROR',
        retryable: false,
        timestamp
      };
    }
    
    if (status >= 500) {
      return {
        originalError: error,
        category: ErrorCategory.SERVER,
        severity: ErrorSeverity.HIGH,
        message: 'Server error',
        userMessage: 'The server is experiencing issues. Please try again later.',
        code: 'SERVER_ERROR',
        retryable: true,
        timestamp
      };
    }
    
    if (status === 'FETCH_ERROR') {
      return {
        originalError: error,
        category: ErrorCategory.NETWORK,
        severity: ErrorSeverity.HIGH,
        message: 'Network error',
        userMessage: 'Unable to connect to the server. Please check your internet connection.',
        code: 'NETWORK_ERROR',
        retryable: true,
        timestamp
      };
    }
  }
  
  return {
    originalError: error,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    message: error.message || 'Unknown error',
    userMessage: 'An unexpected error occurred. Please try again.',
    code: 'UNKNOWN_ERROR',
    retryable: false,
    timestamp
  };
}

function classifyAPIError(error: APIError, timestamp: string): ClassifiedError {
  const status = error.status || 0;
  
  if (status === 401 || error.code === 'AUTH_EXPIRED') {
    return {
      originalError: error,
      category: ErrorCategory.AUTHENTICATION,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      userMessage: 'Your session has expired. Please log in again.',
      code: error.code,
      retryable: false,
      timestamp
    };
  }
  
  if (status === 403 || error.code === 'ACCESS_DENIED') {
    return {
      originalError: error,
      category: ErrorCategory.AUTHORIZATION,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      userMessage: 'You do not have permission to perform this action.',
      code: error.code,
      retryable: false,
      timestamp
    };
  }
  
  if (status >= 400 && status < 500) {
    return {
      originalError: error,
      category: ErrorCategory.VALIDATION,
      severity: ErrorSeverity.MEDIUM,
      message: error.message,
      userMessage: error.message || 'There was an issue with your request.',
      code: error.code,
      retryable: false,
      timestamp
    };
  }
  
  if (status >= 500 || error.code === 'SERVER_ERROR') {
    return {
      originalError: error,
      category: ErrorCategory.SERVER,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      userMessage: 'The server is experiencing issues. Please try again later.',
      code: error.code,
      retryable: true,
      timestamp
    };
  }
  
  if (error.code === 'NETWORK_ERROR') {
    return {
      originalError: error,
      category: ErrorCategory.NETWORK,
      severity: ErrorSeverity.HIGH,
      message: error.message,
      userMessage: 'Unable to connect to the server. Please check your internet connection.',
      code: error.code,
      retryable: true,
      timestamp
    };
  }
  
  return {
    originalError: error,
    category: ErrorCategory.UNKNOWN,
    severity: ErrorSeverity.MEDIUM,
    message: error.message,
    userMessage: error.message || 'An unexpected error occurred.',
    code: error.code,
    retryable: false,
    timestamp
  };
}

// Type guards
function isRTKQueryError(error: any): error is FetchBaseQueryError | SerializedError {
  return error && (
    ('status' in error) ||
    ('name' in error && 'message' in error)
  );
}

function isAPIError(error: any): error is APIError {
  return error && 
    typeof error === 'object' &&
    'code' in error &&
    'message' in error &&
    'timestamp' in error;
}

function isNetworkError(error: any): boolean {
  return error &&
    (error.code === 'NETWORK_ERROR' ||
     error.name === 'NetworkError' ||
     error.message?.includes('fetch') ||
     error.message?.includes('network'));
}

// Error reporting
export interface ErrorReport {
  error: ClassifiedError;
  context: {
    url: string;
    userAgent: string;
    timestamp: string;
    userId?: string;
    sessionId?: string;
    buildVersion?: string;
  };
  stackTrace?: string;
}

export function createErrorReport(error: ClassifiedError, additionalContext?: any): ErrorReport {
  return {
    error,
    context: {
      url: window.location.href,
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      buildVersion: import.meta.env?.VITE_BUILD_VERSION,
      ...additionalContext
    },
    stackTrace: error.originalError?.stack
  };
}

// Error logging service
class ErrorLogger {
  private logs: ErrorReport[] = [];
  private maxLogs = 100;

  log(error: ClassifiedError, context?: any): void {
    const report = createErrorReport(error, context);
    
    // Add to local logs
    this.logs.unshift(report);
    if (this.logs.length > this.maxLogs) {
      this.logs = this.logs.slice(0, this.maxLogs);
    }
    
    // Log to console in development
    if (import.meta.env?.DEV) {
      console.group(`🚨 ${error.severity.toUpperCase()} Error: ${error.code}`);
      console.error('Message:', error.message);
      console.error('User Message:', error.userMessage);
      console.error('Category:', error.category);
      console.error('Retryable:', error.retryable);
      console.error('Original Error:', error.originalError);
      console.error('Context:', report.context);
      if (report.stackTrace) {
        console.error('Stack Trace:', report.stackTrace);
      }
      console.groupEnd();
    }
    
    // Send to external logging service in production
    if (!import.meta.env?.DEV && error.severity === ErrorSeverity.CRITICAL) {
      this.sendToExternalService(report);
    }
  }

  private async sendToExternalService(report: ErrorReport): Promise<void> {
    try {
      // In a real implementation, send to your logging service
      // await fetch('/api/errors', {
      //   method: 'POST',
      //   headers: { 'Content-Type': 'application/json' },
      //   body: JSON.stringify(report)
      // });
      console.log('Would send error report to external service:', report);
    } catch (error) {
      console.error('Failed to send error report:', error);
    }
  }

  getLogs(): ErrorReport[] {
    return [...this.logs];
  }

  clearLogs(): void {
    this.logs = [];
  }
}

export const errorLogger = new ErrorLogger();

// Retry mechanism
export interface RetryOptions {
  maxAttempts: number;
  baseDelay: number;
  maxDelay: number;
  backoffFactor: number;
  retryCondition?: (error: any) => boolean;
}

export const defaultRetryOptions: RetryOptions = {
  maxAttempts: 3,
  baseDelay: 1000,
  maxDelay: 10000,
  backoffFactor: 2,
  retryCondition: (error: any) => {
    const classified = classifyError(error);
    return classified.retryable;
  }
};

export async function withRetry<T>(
  operation: () => Promise<T>,
  options: Partial<RetryOptions> = {}
): Promise<T> {
  const config = { ...defaultRetryOptions, ...options };
  let lastError: any;
  
  for (let attempt = 1; attempt <= config.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error;
      
      // Don't retry if condition fails
      if (config.retryCondition && !config.retryCondition(error)) {
        throw error;
      }
      
      // Don't retry on last attempt
      if (attempt === config.maxAttempts) {
        break;
      }
      
      // Calculate delay with exponential backoff
      const delay = Math.min(
        config.baseDelay * Math.pow(config.backoffFactor, attempt - 1),
        config.maxDelay
      );
      
      // Add jitter to prevent thundering herd
      const jitteredDelay = delay + Math.random() * 1000;
      
      console.log(`Retrying operation in ${jitteredDelay}ms (attempt ${attempt}/${config.maxAttempts})`);
      await new Promise(resolve => setTimeout(resolve, jitteredDelay));
    }
  }
  
  throw lastError;
}

// Offline detection
export class OfflineDetector {
  private isOnline = navigator.onLine;
  private listeners: Set<(online: boolean) => void> = new Set();

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
  }

  private handleOnline = () => {
    this.isOnline = true;
    this.notifyListeners(true);
  };

  private handleOffline = () => {
    this.isOnline = false;
    this.notifyListeners(false);
  };

  private notifyListeners(online: boolean) {
    this.listeners.forEach(listener => {
      try {
        listener(online);
      } catch (error) {
        console.error('Error in offline detector listener:', error);
      }
    });
  }

  getStatus(): boolean {
    return this.isOnline;
  }

  onStatusChange(listener: (online: boolean) => void): () => void {
    this.listeners.add(listener);
    
    // Return unsubscribe function
    return () => {
      this.listeners.delete(listener);
    };
  }

  destroy() {
    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }
}

export const offlineDetector = new OfflineDetector();

// Error boundary helpers
export function getErrorBoundaryFallback(error: Error, errorInfo: any) {
  const classified = classifyError(error);
  
  return {
    title: getErrorTitle(classified),
    message: classified.userMessage,
    canRetry: classified.retryable,
    severity: classified.severity,
    details: import.meta.env?.DEV ? {
      error: error.message,
      stack: error.stack,
      errorInfo
    } : undefined
  };
}

function getErrorTitle(error: ClassifiedError): string {
  switch (error.category) {
    case ErrorCategory.NETWORK:
      return 'Connection Problem';
    case ErrorCategory.AUTHENTICATION:
      return 'Authentication Required';
    case ErrorCategory.AUTHORIZATION:
      return 'Access Denied';
    case ErrorCategory.VALIDATION:
      return 'Invalid Request';
    case ErrorCategory.SERVER:
      return 'Server Error';
    case ErrorCategory.CLIENT:
      return 'Application Error';
    default:
      return 'Unexpected Error';
  }
}

// Global error handler
export function setupGlobalErrorHandling() {
  // Handle unhandled promise rejections
  window.addEventListener('unhandledrejection', (event) => {
    const error = classifyError(event.reason);
    errorLogger.log(error, { type: 'unhandledrejection' });
    
    // Prevent default browser behavior for critical errors
    if (error.severity === ErrorSeverity.CRITICAL) {
      event.preventDefault();
    }
  });

  // Handle uncaught errors
  window.addEventListener('error', (event) => {
    const error = classifyError(event.error || new Error(event.message));
    errorLogger.log(error, { 
      type: 'uncaughterror',
      filename: event.filename,
      lineno: event.lineno,
      colno: event.colno
    });
  });
}

// Initialize global error handling
if (typeof window !== 'undefined') {
  setupGlobalErrorHandling();
}