import React, { createContext, useContext, useState, ReactNode } from 'react';
import { LinearProgress, Backdrop, CircularProgress, Typography, Box } from '@mui/material';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
  type: 'linear' | 'circular' | 'backdrop';
}

interface GlobalLoadingContextType {
  loadingStates: Map<string, LoadingState>;
  setLoading: (key: string, state: Partial<LoadingState> | boolean) => void;
  clearLoading: (key: string) => void;
  clearAllLoading: () => void;
  isAnyLoading: boolean;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export interface GlobalLoadingProviderProps {
  children: ReactNode;
}

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const [loadingStates, setLoadingStates] = useState<Map<string, LoadingState>>(new Map());

  const setLoading = (key: string, state: Partial<LoadingState> | boolean) => {
    setLoadingStates(prev => {
      const newStates = new Map(prev);
      
      if (typeof state === 'boolean') {
        if (state) {
          newStates.set(key, {
            isLoading: true,
            type: 'linear',
          });
        } else {
          newStates.delete(key);
        }
      } else {
        const currentState = newStates.get(key) || { isLoading: false, type: 'linear' };
        newStates.set(key, {
          ...currentState,
          ...state,
          isLoading: state.isLoading !== undefined ? state.isLoading : true,
        });
      }
      
      return newStates;
    });
  };

  const clearLoading = (key: string) => {
    setLoadingStates(prev => {
      const newStates = new Map(prev);
      newStates.delete(key);
      return newStates;
    });
  };

  const clearAllLoading = () => {
    setLoadingStates(new Map());
  };

  const isAnyLoading = loadingStates.size > 0 && Array.from(loadingStates.values()).some(state => state.isLoading);

  return (
    <GlobalLoadingContext.Provider
      value={{
        loadingStates,
        setLoading,
        clearLoading,
        clearAllLoading,
        isAnyLoading,
      }}
    >
      {children}
      <GlobalLoadingIndicators loadingStates={loadingStates} />
    </GlobalLoadingContext.Provider>
  );
};

export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

// Hook for easy loading management
export const useLoading = (key: string) => {
  const { setLoading, clearLoading, loadingStates } = useGlobalLoading();
  
  const currentState = loadingStates.get(key);
  const isLoading = currentState?.isLoading || false;
  
  const startLoading = (state?: Partial<LoadingState>) => {
    setLoading(key, { isLoading: true, ...state });
  };
  
  const stopLoading = () => {
    clearLoading(key);
  };
  
  const updateProgress = (progress: number, message?: string) => {
    setLoading(key, { progress, message });
  };
  
  return {
    isLoading,
    startLoading,
    stopLoading,
    updateProgress,
    currentState,
  };
};

interface GlobalLoadingIndicatorsProps {
  loadingStates: Map<string, LoadingState>;
}

const GlobalLoadingIndicators: React.FC<GlobalLoadingIndicatorsProps> = ({ loadingStates }) => {
  const states = Array.from(loadingStates.values());
  const linearStates = states.filter(state => state.isLoading && state.type === 'linear');
  const backdropStates = states.filter(state => state.isLoading && state.type === 'backdrop');
  
  return (
    <>
      {/* Linear progress indicators at the top */}
      {linearStates.map((state, index) => (
        <Box
          key={index}
          sx={{
            position: 'fixed',
            top: index * 4,
            left: 0,
            right: 0,
            zIndex: 9999,
          }}
        >
          <LinearProgress
            variant={state.progress !== undefined ? 'determinate' : 'indeterminate'}
            value={state.progress}
            sx={{
              height: 4,
              backgroundColor: 'rgba(0, 0, 0, 0.1)',
              '& .MuiLinearProgress-bar': {
                backgroundColor: '#1976d2',
              },
            }}
          />
          {state.message && (
            <Typography
              variant="caption"
              sx={{
                position: 'absolute',
                top: 6,
                left: 16,
                color: 'text.secondary',
                fontSize: '0.75rem',
              }}
            >
              {state.message}
            </Typography>
          )}
        </Box>
      ))}
      
      {/* Backdrop loading indicators */}
      {backdropStates.map((state, index) => (
        <Backdrop
          key={index}
          open={true}
          sx={{
            color: '#fff',
            zIndex: 9998,
            flexDirection: 'column',
            gap: 2,
          }}
        >
          <CircularProgress
            color="inherit"
            variant={state.progress !== undefined ? 'determinate' : 'indeterminate'}
            value={state.progress}
            size={60}
          />
          {state.message && (
            <Typography variant="h6" component="div">
              {state.message}
            </Typography>
          )}
          {state.progress !== undefined && (
            <Typography variant="body2" component="div">
              {Math.round(state.progress)}%
            </Typography>
          )}
        </Backdrop>
      ))}
    </>
  );
};

// Higher-order component for automatic loading management
export function withLoading<P extends object>(
  WrappedComponent: React.ComponentType<P>,
  loadingKey: string,
  options?: {
    showOnMount?: boolean;
    hideOnUnmount?: boolean;
    loadingType?: LoadingState['type'];
  }
) {
  return function LoadingWrappedComponent(props: P) {
    const { startLoading, stopLoading } = useLoading(loadingKey);
    
    React.useEffect(() => {
      if (options?.showOnMount) {
        startLoading({ type: options.loadingType || 'linear' });
      }
      
      return () => {
        if (options?.hideOnUnmount) {
          stopLoading();
        }
      };
    }, [startLoading, stopLoading]);
    
    return <WrappedComponent {...props} />;
  };
}