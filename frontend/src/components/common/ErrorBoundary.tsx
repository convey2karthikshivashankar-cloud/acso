import React, { Component, ErrorInfo, ReactNode } from 'react';
import { classifyError, getErrorBoundaryFallback, errorLogger } from '../../utils/errorHandling';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, errorInfo: ErrorInfo) => ReactNode;
  onError?: (error: Error, errorInfo: ErrorInfo) => void;
  resetOnPropsChange?: boolean;
  resetKeys?: Array<string | number>;
}

interface State {
  hasError: boolean;
  error: Error | null;
  errorInfo: ErrorInfo | null;
  errorId: string | null;
}

export class ErrorBoundary extends Component<Props, State> {
  private resetTimeoutId: number | null = null;
  private retryCount: number = 0;
  private maxRetries: number = 3;

  constructor(props: Props) {
    super(props);
    this.state = {
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    };
  }

  static getDerivedStateFromError(error: Error): Partial<State> {
    return {
      hasError: true,
      error,
      errorId: `error_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`,
    };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    this.setState({ errorInfo });

    // Log the error
    const classified = classifyError(error);
    errorLogger.log(classified, {
      componentStack: errorInfo.componentStack,
      errorBoundary: true,
    });

    // Call custom error handler
    if (this.props.onError) {
      this.props.onError(error, errorInfo);
    }

    // Auto-reset for retryable errors
    if (classified.retryable) {
      this.scheduleReset();
    }
  }

  componentDidUpdate(prevProps: Props) {
    const { resetOnPropsChange, resetKeys } = this.props;
    const { hasError } = this.state;

    if (hasError && prevProps.children !== this.props.children) {
      if (resetOnPropsChange) {
        this.resetErrorBoundary();
      }
    }

    if (hasError && resetKeys) {
      const prevResetKeys = prevProps.resetKeys || [];
      const hasResetKeyChanged = resetKeys.some(
        (key, index) => key !== prevResetKeys[index]
      );

      if (hasResetKeyChanged) {
        this.resetErrorBoundary();
      }
    }
  }

  componentWillUnmount() {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
    }
  }

  scheduleReset = () => {
    // Reset after 5 seconds for retryable errors
    this.resetTimeoutId = window.setTimeout(() => {
      this.resetErrorBoundary();
    }, 5000);
  };

  resetErrorBoundary = () => {
    if (this.resetTimeoutId) {
      clearTimeout(this.resetTimeoutId);
      this.resetTimeoutId = null;
    }

    this.retryCount++;
    this.setState({
      hasError: false,
      error: null,
      errorInfo: null,
      errorId: null,
    });
  };

  handleRetry = () => {
    if (this.retryCount < this.maxRetries) {
      this.resetErrorBoundary();
    }
  };

  handleReload = () => {
    window.location.reload();
  };

  render() {
    const { hasError, error, errorInfo } = this.state;
    const { children, fallback } = this.props;

    if (hasError && error) {
      if (fallback) {
        return fallback(error, errorInfo!);
      }

      return (
        <DefaultErrorFallback 
          error={error} 
          errorInfo={errorInfo!} 
          onReset={this.resetErrorBoundary}
          onRetry={this.handleRetry}
          onReload={this.handleReload}
          canRetry={this.retryCount < this.maxRetries}
          retryCount={this.retryCount}
        />
      );
    }

    return children;
  }
}

interface DefaultErrorFallbackProps {
  error: Error;
  errorInfo: ErrorInfo;
  onReset: () => void;
  onRetry: () => void;
  onReload: () => void;
  canRetry: boolean;
  retryCount: number;
}

function DefaultErrorFallback({ 
  error, 
  errorInfo, 
  onReset, 
  onRetry, 
  onReload, 
  canRetry, 
  retryCount 
}: DefaultErrorFallbackProps) {
  const fallbackData = getErrorBoundaryFallback(error, errorInfo);

  return (
    <div className="error-boundary">
      <div className="error-boundary__container">
        <div className="error-boundary__icon">⚠️</div>
        <h2 className="error-boundary__title">Something went wrong</h2>
        <p className="error-boundary__message">{fallbackData.message}</p>
        
        {retryCount > 0 && (
          <p className="error-boundary__retry-info">
            Retry attempts: {retryCount}/3
          </p>
        )}
        
        <div className="error-boundary__actions">
          {canRetry && (
            <button 
              className="error-boundary__button error-boundary__button--primary"
              onClick={onRetry}
            >
              Try Again
            </button>
          )}
          <button 
            className="error-boundary__button error-boundary__button--secondary"
            onClick={onReset}
          >
            Reset Component
          </button>
          <button 
            className="error-boundary__button error-boundary__button--tertiary"
            onClick={onReload}
          >
            Reload Page
          </button>
        </div>
        
        <details className="error-boundary__details">
          <summary>Technical Details</summary>
          <pre className="error-boundary__stack">
            {error.stack}
          </pre>
        </details>
      </div>
    </div>
  );
}

// Higher-order component for easier usage
export function withErrorBoundary<P extends object>(
  Component: React.ComponentType<P>,
  errorBoundaryProps?: Omit<Props, 'children'>
) {
  const WrappedComponent = (props: P) => (
    <ErrorBoundary {...errorBoundaryProps}>
      <Component {...props} />
    </ErrorBoundary>
  );

  WrappedComponent.displayName = `withErrorBoundary(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for error boundary reset
export function useErrorBoundary() {
  const [error, setError] = React.useState<Error | null>(null);

  const resetError = React.useCallback(() => {
    setError(null);
  }, []);

  const captureError = React.useCallback((error: Error) => {
    setError(error);
  }, []);

  React.useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);

  return {
    captureError,
    resetError,
  };
}

export default ErrorBoundary;