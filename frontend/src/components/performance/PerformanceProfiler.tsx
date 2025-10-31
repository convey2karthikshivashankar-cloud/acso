import React, { Profiler, ProfilerOnRenderCallback, ReactNode } from 'react';
import { useAppDispatch } from '../../store/hooks';
import { addPerformanceMetric } from '../../store/slices/uiSlice';

interface PerformanceProfilerProps {
  id: string;
  children: ReactNode;
  onRender?: ProfilerOnRenderCallback;
  enableProfiling?: boolean;
}

interface PerformanceMetric {
  id: string;
  phase: 'mount' | 'update';
  actualDuration: number;
  baseDuration: number;
  startTime: number;
  commitTime: number;
  interactions: Set<any>;
}

export const PerformanceProfiler: React.FC<PerformanceProfilerProps> = ({
  id,
  children,
  onRender,
  enableProfiling = process.env.NODE_ENV === 'development',
}) => {
  const dispatch = useAppDispatch();

  const handleRender: ProfilerOnRenderCallback = (
    profileId,
    phase,
    actualDuration,
    baseDuration,
    startTime,
    commitTime,
    interactions
  ) => {
    // Store performance metrics
    const metric: PerformanceMetric = {
      id: profileId,
      phase,
      actualDuration,
      baseDuration,
      startTime,
      commitTime,
      interactions,
    };

    // Dispatch to store for monitoring
    dispatch(addPerformanceMetric(metric));

    // Log slow renders in development
    if (process.env.NODE_ENV === 'development' && actualDuration > 16) {
      console.warn(`Slow render detected in ${profileId}:`, {
        phase,
        actualDuration: `${actualDuration.toFixed(2)}ms`,
        baseDuration: `${baseDuration.toFixed(2)}ms`,
        interactions: Array.from(interactions),
      });
    }

    // Call custom onRender callback if provided
    if (onRender) {
      onRender(profileId, phase, actualDuration, baseDuration, startTime, commitTime, interactions);
    }
  };

  if (!enableProfiling) {
    return <>{children}</>;
  }

  return (
    <Profiler id={id} onRender={handleRender}>
      {children}
    </Profiler>
  );
};

// Higher-order component for easier usage
export function withPerformanceProfiler<P extends object>(
  Component: React.ComponentType<P>,
  profileId?: string
) {
  const WrappedComponent = (props: P) => (
    <PerformanceProfiler id={profileId || Component.displayName || Component.name || 'Unknown'}>
      <Component {...props} />
    </PerformanceProfiler>
  );

  WrappedComponent.displayName = `withPerformanceProfiler(${Component.displayName || Component.name})`;

  return WrappedComponent;
}

// Hook for manual performance tracking
export function usePerformanceTracking() {
  const dispatch = useAppDispatch();

  const trackOperation = React.useCallback(
    async function trackOperationImpl<T>(operationName: string, operation: () => Promise<T> | T): Promise<T> {
      const startTime = performance.now();
      
      try {
        const result = await operation();
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Track the operation
        dispatch(addPerformanceMetric({
          id: operationName,
          phase: 'update',
          actualDuration: duration,
          baseDuration: duration,
          startTime,
          commitTime: endTime,
          interactions: new Set(),
        }));

        // Log slow operations
        if (duration > 100) {
          console.warn(`Slow operation detected: ${operationName} took ${duration.toFixed(2)}ms`);
        }

        return result;
      } catch (error) {
        const endTime = performance.now();
        const duration = endTime - startTime;

        // Track failed operations
        dispatch(addPerformanceMetric({
          id: `${operationName}_error`,
          phase: 'update',
          actualDuration: duration,
          baseDuration: duration,
          startTime,
          commitTime: endTime,
          interactions: new Set(),
        }));

        throw error;
      }
    },
    [dispatch]
  );

  const measureRender = React.useCallback(
    (componentName: string, renderFunction: () => ReactNode) => {
      return (
        <PerformanceProfiler id={componentName}>
          {renderFunction()}
        </PerformanceProfiler>
      );
    },
    []
  );

  return {
    trackOperation,
    measureRender,
  };
}

export default PerformanceProfiler;