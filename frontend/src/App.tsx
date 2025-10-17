import React, { Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { CircularProgress, Box } from '@mui/material';
import { Helmet } from 'react-helmet-async';

import { ThemeProvider } from './components/theme/ThemeProvider';
import { AppLayout } from './components/layout/AppLayout';
import { ProtectedRoute } from './components/auth/ProtectedRoute';
import { useAppSelector } from './store/hooks';
import { 
  LazyDashboard, 
  LazyLogin,
  LazyAgentOverview,
  LazyWorkflowDesigner,
  LazyIncidentManagementDashboard,
  preloadCriticalRoutes 
} from './routes/LazyRoutes';
import { LoadingFallback } from './utils/lazyLoading';
import { useAdaptiveLoading, useMemoryAwareLoading } from './hooks/useCodeSplitting';

// Loading component
const LoadingSpinner: React.FC = () => (
  <Box
    display="flex"
    justifyContent="center"
    alignItems="center"
    minHeight="100vh"
  >
    <CircularProgress />
  </Box>
);

const App: React.FC = () => {
  const isAuthenticated = useAppSelector((state) => state.auth.isAuthenticated);
  const isLoading = useAppSelector((state) => state.auth.isLoading);
  const { getLoadingStrategy } = useAdaptiveLoading();
  const { shouldLimitLoading } = useMemoryAwareLoading();

  React.useEffect(() => {
    // Initialize performance monitoring and preloading
    if (process.env.NODE_ENV === 'development') {
      console.log('Loading strategy:', getLoadingStrategy());
      console.log('Memory limiting:', shouldLimitLoading());
    }

    // Preload critical routes based on network conditions
    const strategy = getLoadingStrategy();
    if (strategy === 'aggressive' && !shouldLimitLoading()) {
      preloadCriticalRoutes();
    }
  }, [getLoadingStrategy, shouldLimitLoading]);

  if (isLoading) {
    return <LoadingFallback message="Initializing Application..." size="large" fullScreen />;
  }

  return (
    <ThemeProvider>
      <Helmet>
        <title>ACSO - Autonomous Cyber-Security & Service Orchestrator</title>
        <meta 
          name="description" 
          content="State-of-the-art UI for autonomous IT management and security operations" 
        />
      </Helmet>
      
      <Suspense fallback={<LoadingFallback message="Loading Application..." size="large" fullScreen />}>
        <Routes>
          {/* Public Routes */}
          <Route 
            path="/login" 
            element={
              isAuthenticated ? <Navigate to="/dashboard" replace /> : <LazyLogin />
            } 
          />
          
          {/* Protected Routes with Layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Suspense fallback={<LoadingFallback message="Loading Page..." />}>
                    <Routes>
                      <Route path="/dashboard/*" element={<LazyDashboard />} />
                      <Route path="/agents/*" element={<LazyAgentOverview />} />
                      <Route path="/workflows/*" element={<LazyWorkflowDesigner />} />
                      <Route path="/incidents/*" element={<LazyIncidentManagementDashboard />} />
                      <Route path="/financial/*" element={<div>Financial Intelligence - Coming Soon</div>} />
                      <Route path="/search" element={<div>Global Search - Coming Soon</div>} />
                      <Route path="/admin/*" element={<div>Administration - Coming Soon</div>} />
                      <Route path="/profile" element={<div>Profile - Coming Soon</div>} />
                      <Route path="/settings" element={<div>Settings - Coming Soon</div>} />
                      <Route path="/help" element={<div>Help - Coming Soon</div>} />
                      <Route path="/notifications" element={<div>Notifications - Coming Soon</div>} />
                      <Route path="/" element={<Navigate to="/dashboard" replace />} />
                      <Route path="*" element={<div>Page Not Found</div>} />
                    </Routes>
                  </Suspense>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </Suspense>
    </ThemeProvider>
  );
};

export default App;