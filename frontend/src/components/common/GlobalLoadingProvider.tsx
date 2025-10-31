import React, { createContext, useContext, useState, useCallback } from 'react';
import { Box, LinearProgress, Typography, Fade } from '@mui/material';

interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

interface GlobalLoadingContextType {
  loadingState: LoadingState;
  setLoading: (loading: boolean, message?: string, progress?: number) => void;
  setProgress: (progress: number) => void;
  setMessage: (message: string) => void;
}

const GlobalLoadingContext = createContext<GlobalLoadingContextType | undefined>(undefined);

export const useGlobalLoading = () => {
  const context = useContext(GlobalLoadingContext);
  if (!context) {
    throw new Error('useGlobalLoading must be used within a GlobalLoadingProvider');
  }
  return context;
};

interface GlobalLoadingProviderProps {
  children: React.ReactNode;
}

export const GlobalLoadingProvider: React.FC<GlobalLoadingProviderProps> = ({ children }) => {
  const [loadingState, setLoadingState] = useState<LoadingState>({
    isLoading: false,
  });

  const setLoading = useCallback((loading: boolean, message?: string, progress?: number) => {
    setLoadingState({
      isLoading: loading,
      message,
      progress,
    });
  }, []);

  const setProgress = useCallback((progress: number) => {
    setLoadingState(prev => ({
      ...prev,
      progress,
    }));
  }, []);

  const setMessage = useCallback((message: string) => {
    setLoadingState(prev => ({
      ...prev,
      message,
    }));
  }, []);

  const contextValue: GlobalLoadingContextType = {
    loadingState,
    setLoading,
    setProgress,
    setMessage,
  };

  return (
    <GlobalLoadingContext.Provider value={contextValue}>
      {children}
      <Fade in={loadingState.isLoading}>
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            zIndex: 9999,
            backgroundColor: 'rgba(255, 255, 255, 0.9)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            minHeight: '100vh',
            padding: 3,
          }}
        >
          <Box sx={{ width: '100%', maxWidth: 400, mb: 2 }}>
            <LinearProgress 
              variant={loadingState.progress !== undefined ? 'determinate' : 'indeterminate'}
              value={loadingState.progress}
              sx={{ height: 8, borderRadius: 4 }}
            />
          </Box>
          {loadingState.message && (
            <Typography variant="body1" color="text.secondary" textAlign="center">
              {loadingState.message}
            </Typography>
          )}
          {loadingState.progress !== undefined && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {Math.round(loadingState.progress)}%
            </Typography>
          )}
        </Box>
      </Fade>
    </GlobalLoadingContext.Provider>
  );
};