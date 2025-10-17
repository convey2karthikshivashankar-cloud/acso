import React, { Suspense, ComponentType } from 'react';
import { Box, CircularProgress, Typography, Alert } from '@mui/material';

// Enhanced loading component with better UX
export const LoadingFallback: React.FC<{ 
  message?: string; 
  size?: 'small' | 'medium' | 'large';
  fullScreen?: boolean;
}> = ({ 
  message = 'Loading...', 
  size = 'medium',
  fullScreen = false 
}) => {
  const sizeMap = {
    small: 24,
    medium: 40,
    large: 60,
  };

  return (
    <Box
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        minHeight: fullScreen ? '100vh' : '200px',
        gap: 2,
      }}
    >
      <CircularProgress size={sizeMap[size]} />
      <Typography variant="body2" color="text.secondary">
        {message}
      </Typography>
    </Box>
  );
};

// Error boundary for lazy loaded components
interface ErrorBoundaryState {
  hasError: boolean;
  error?: Error;
}

class LazyLoadErrorBoundary extends React.Component<
  React.PropsWithChildren<{ fallback?: React.ComponentType<{ error: Error; retry: () => void }> }>,
  ErrorBoundaryState
> {
  constructor(props: any) {
    super(props);
    this.state = { hasError: false };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: React.ErrorInfo) {
    console.error('Lazy loading error:', error, errorInfo);
  }

  retry = () => {
    this.setState({ hasError: false, error: undefined });
  };

  render() {
    if (this.state.hasError) {
      if (this.props.fallback) {
        const FallbackComponent = this.props.fallback;
        return <FallbackComponent error={this.state.error!} retry={this.retry} />;
      }

      return (
        <Alert 
          severity="error" 
          action={
            <button onClick={this.retry}>
              Retry
            </button>
          }
        >
          <Typography variant="h6">Failed to load component</Typography>
          <Typography variant="body2">
            {this.state.error?.message || 'An unexpected error occurred'}
          </Typography>
        </Alert>
      );
    }

    return this.props.children;
  }
}

// Enhanced lazy loading wrapper with retry logic and preloading
export function createLazyComponent<T extends ComponentType<any>>(
  importFn: () => Promise<{ default: T }>,
  options: {
    fallback?: React.ComponentType;
    errorFallback?: React.ComponentType<{ error: Error; retry: () => void }>;
    preload?: boolean;
    retryDelay?: number;
    maxRetries?: number;
  } = {}
) {
  const {
    fallback: CustomFallback,
    errorFallback,
    preload = false,
    retryDelay = 1000,
    maxRetries = 3,
  } = options;

  let importPromise: Promise<{ default: T }> | null = null;
  let retryCount = 0;

  const loadComponent = (): Promise<{ default: T }> => {
    if (!importPromise) {
      importPromise = importFn().catch((error) => {
        importPromise = null; // Reset promise on error
        
        if (retryCount < maxRetries) {
          retryCount++;
          console.warn(`Lazy loading failed, retrying (${retryCount}/${maxRetries})...`, error);
          
          return new Promise((resolve, reject) => {
            setTimeout(() => {
              loadComponent().then(resolve).catch(reject);
            }, retryDelay * retryCount);
          });
        }
        
        throw error;
      });
    }
    return importPromise;
  };

  const LazyComponent = React.lazy(loadComponent);

  // Preload if requested
  if (preload) {
    loadComponent().catch(() => {
      // Ignore preload errors
    });
  }

  const WrappedComponent: React.FC<any> = (props) => (
    <LazyLoadErrorBoundary fallback={errorFallback}>
      <Suspense fallback={CustomFallback ? <CustomFallback /> : <LoadingFallback />}>
        <LazyComponent {...props} />
      </Suspense>
    </LazyLoadErrorBoundary>
  );

  // Add preload method to component
  (WrappedComponent as any).preload = loadComponent;

  return WrappedComponent;
}

// Hook for preloading components
export function usePreloadComponent(
  preloadFn: () => Promise<any>,
  condition: boolean = true
) {
  React.useEffect(() => {
    if (condition) {
      const timer = setTimeout(() => {
        preloadFn().catch(() => {
          // Ignore preload errors
        });
      }, 100); // Small delay to avoid blocking initial render

      return () => clearTimeout(timer);
    }
  }, [preloadFn, condition]);
}

// Route-based preloading hook
export function useRoutePreloading(routes: Record<string, () => Promise<any>>) {
  const [hoveredRoute, setHoveredRoute] = React.useState<string | null>(null);

  const handleLinkHover = React.useCallback((routePath: string) => {
    setHoveredRoute(routePath);
    const preloadFn = routes[routePath];
    if (preloadFn) {
      preloadFn().catch(() => {
        // Ignore preload errors
      });
    }
  }, [routes]);

  const handleLinkLeave = React.useCallback(() => {
    setHoveredRoute(null);
  }, []);

  return {
    hoveredRoute,
    handleLinkHover,
    handleLinkLeave,
  };
}

// Component for measuring bundle sizes in development
export const BundleAnalyzer: React.FC<{ 
  componentName: string; 
  children: React.ReactNode;
}> = ({ componentName, children }) => {
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      const startTime = performance.now();
      
      return () => {
        const endTime = performance.now();
        console.log(`[Bundle] ${componentName} loaded in ${endTime - startTime}ms`);
      };
    }
  }, [componentName]);

  return <>{children}</>;
};

// Intersection Observer based lazy loading for heavy components
export function useLazyIntersection(
  ref: React.RefObject<Element>,
  options: IntersectionObserverInit = {}
) {
  const [isIntersecting, setIsIntersecting] = React.useState(false);
  const [hasIntersected, setHasIntersected] = React.useState(false);

  React.useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      {
        threshold: 0.1,
        rootMargin: '50px',
        ...options,
      }
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [ref, hasIntersected, options]);

  return { isIntersecting, hasIntersected };
}

// Lazy component wrapper with intersection observer
export const LazyIntersectionWrapper: React.FC<{
  children: React.ReactNode;
  fallback?: React.ReactNode;
  className?: string;
  style?: React.CSSProperties;
}> = ({ children, fallback, className, style }) => {
  const ref = React.useRef<HTMLDivElement>(null);
  const { hasIntersected } = useLazyIntersection(ref);

  return (
    <div ref={ref} className={className} style={style}>
      {hasIntersected ? children : (fallback || <LoadingFallback size="small" />)}
    </div>
  );
};