import React, { Suspense, useEffect, useState } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation, useNavigate } from 'react-router-dom';
import { ErrorBoundary } from '../common/ErrorBoundary';
import { useGlobalLoading } from '../common/GlobalLoadingProvider';
import { useAppSelector } from '../../store/hooks';
import { ProtectedRoute } from '../auth/ProtectedRoute';
import { Box, LinearProgress } from '@mui/material';

// Lazy load pages for code splitting
const Dashboard = React.lazy(() => import('../../pages/Dashboard'));
const Login = React.lazy(() => import('../../pages/Login'));
const AgentsPage = React.lazy(() => import('../../pages/AgentsPage'));
const IncidentsPage = React.lazy(() => import('../../pages/IncidentsPage'));
const WorkflowsPage = React.lazy(() => import('../../pages/WorkflowsPage'));
const FinancialPage = React.lazy(() => import('../../pages/FinancialPage'));
const SettingsPage = React.lazy(() => import('../../pages/SettingsPage'));
const DemoPage = React.lazy(() => import('../../pages/DemoPage'));
const NotFoundPage = React.lazy(() => import('../../pages/NotFoundPage'));

// Route configuration with metadata
interface RouteConfig {
  path: string;
  element: React.ComponentType;
  protected: boolean;
  title: string;
  description?: string;
  permissions?: string[];
  preload?: boolean;
  analytics?: {
    category: string;
    action: string;
  };
}

const routes: RouteConfig[] = [
  {
    path: '/',
    element: Dashboard,
    protected: true,
    title: 'Dashboard - ACSO',
    description: 'System overview and real-time monitoring',
    preload: true,
    analytics: { category: 'Navigation', action: 'Dashboard View' }
  },
  {
    path: '/login',
    element: Login,
    protected: false,
    title: 'Login - ACSO',
    description: 'Sign in to your ACSO account'
  },
  {
    path: '/agents',
    element: AgentsPage,
    protected: true,
    title: 'Agents - ACSO',
    description: 'Manage and monitor ACSO agents',
    permissions: ['agents:read'],
    analytics: { category: 'Navigation', action: 'Agents View' }
  },
  {
    path: '/incidents',
    element: IncidentsPage,
    protected: true,
    title: 'Incidents - ACSO',
    description: 'Incident management and response',
    permissions: ['incidents:read'],
    analytics: { category: 'Navigation', action: 'Incidents View' }
  },
  {
    path: '/workflows',
    element: WorkflowsPage,
    protected: true,
    title: 'Workflows - ACSO',
    description: 'Automated workflow management',
    permissions: ['workflows:read'],
    analytics: { category: 'Navigation', action: 'Workflows View' }
  },
  {
    path: '/financial',
    element: FinancialPage,
    protected: true,
    title: 'Financial Analytics - ACSO',
    description: 'ROI analysis and cost optimization',
    permissions: ['financial:read'],
    analytics: { category: 'Navigation', action: 'Financial View' }
  },
  {
    path: '/demo',
    element: DemoPage,
    protected: true,
    title: 'Demo - ACSO',
    description: 'Interactive system demonstrations',
    analytics: { category: 'Navigation', action: 'Demo View' }
  },
  {
    path: '/settings',
    element: SettingsPage,
    protected: true,
    title: 'Settings - ACSO',
    description: 'System configuration and preferences',
    permissions: ['settings:read'],
    analytics: { category: 'Navigation', action: 'Settings View' }
  }
];

// Loading fallback component
const RouteLoadingFallback: React.FC<{ route?: string }> = ({ route }) => (
  <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
    <LinearProgress />
  </Box>
);

// Route analytics and performance tracking
const RouteTracker: React.FC = () => {
  const location = useLocation();
  const [navigationStart, setNavigationStart] = useState<number>(0);

  useEffect(() => {
    const startTime = performance.now();
    setNavigationStart(startTime);

    // Find route config for current path
    const currentRoute = routes.find(route => 
      route.path === location.pathname || 
      (route.path !== '/' && location.pathname.startsWith(route.path))
    );

    if (currentRoute) {
      // Update document title
      document.title = currentRoute.title;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && currentRoute.description) {
        metaDescription.setAttribute('content', currentRoute.description);
      }

      // Track analytics
      if (currentRoute.analytics && window.gtag) {
        window.gtag('event', currentRoute.analytics.action, {
          event_category: currentRoute.analytics.category,
          page_path: location.pathname,
        });
      }
    }

    // Track page view
    if (window.gtag) {
      window.gtag('config', 'GA_MEASUREMENT_ID', {
        page_path: location.pathname,
      });
    }

    return () => {
      // Track navigation performance
      const navigationEnd = performance.now();
      const navigationTime = navigationEnd - startTime;
      
      if (window.gtag) {
        window.gtag('event', 'timing_complete', {
          name: 'page_load_time',
          value: Math.round(navigationTime),
          event_category: 'Navigation Performance',
        });
      }

      console.log(`Navigation to ${location.pathname} took ${navigationTime.toFixed(2)}ms`);
    };
  }, [location.pathname, navigationStart]);

  return null;
};

// Route preloader for performance optimization
const RoutePreloader: React.FC = () => {
  useEffect(() => {
    // Preload critical routes
    const preloadRoutes = routes.filter(route => route.preload);
    
    preloadRoutes.forEach(route => {
      // Preload the component
      route.element;
    });
  }, []);

  return null;
};

// Enhanced route component with error boundary and analytics
const EnhancedRoute: React.FC<{
  config: RouteConfig;
  children: React.ReactNode;
}> = ({ config, children }) => {
  const navigate = useNavigate();

  const handleError = (error: Error, errorInfo: React.ErrorInfo) => {
    console.error(`Route error in ${config.path}:`, error, errorInfo);
    
    // Track error in analytics
    if (window.gtag) {
      window.gtag('event', 'exception', {
        description: `Route Error: ${config.path} - ${error.message}`,
        fatal: false,
      });
    }
  };

  const handleRetry = () => {
    // Retry by navigating to the same route
    navigate(config.path, { replace: true });
  };

  return (
    <ErrorBoundary
      onError={handleError}
      level="page"
      fallback={(error, errorInfo) => (
        <Box
          display="flex"
          flexDirection="column"
          alignItems="center"
          justifyContent="center"
          minHeight="100vh"
          p={3}
        >
          <h1>Page Error</h1>
          <p>Failed to load {config.title}</p>
          <button onClick={handleRetry}>Retry</button>
        </Box>
      )}
    >
      {children}
    </ErrorBoundary>
  );
};

// Main router component
export const EnhancedRouter: React.FC = () => {
  const isAuthenticated = useAppSelector(state => state.auth.isAuthenticated);

  return (
    <BrowserRouter>
      <RouteTracker />
      <RoutePreloader />
      
      <Routes>
        {routes.map((routeConfig) => {
          const RouteComponent = routeConfig.element;
          
          const routeElement = (
            <EnhancedRoute config={routeConfig}>
              <Suspense fallback={<RouteLoadingFallback route={routeConfig.path} />}>
                <RouteComponent />
              </Suspense>
            </EnhancedRoute>
          );

          if (routeConfig.protected) {
            return (
              <Route
                key={routeConfig.path}
                path={routeConfig.path}
                element={
                  <ProtectedRoute permissions={routeConfig.permissions}>
                    {routeElement}
                  </ProtectedRoute>
                }
              />
            );
          }

          return (
            <Route
              key={routeConfig.path}
              path={routeConfig.path}
              element={routeElement}
            />
          );
        })}

        {/* Redirect authenticated users from login to dashboard */}
        <Route
          path="/login"
          element={
            isAuthenticated ? (
              <Navigate to="/" replace />
            ) : (
              <Suspense fallback={<RouteLoadingFallback />}>
                <Login />
              </Suspense>
            )
          }
        />

        {/* Catch-all route for 404 */}
        <Route
          path="*"
          element={
            <Suspense fallback={<RouteLoadingFallback />}>
              <NotFoundPage />
            </Suspense>
          }
        />
      </Routes>
    </BrowserRouter>
  );
};

// Hook for programmatic navigation with analytics
export const useEnhancedNavigation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  const navigateWithAnalytics = (
    to: string, 
    options?: { 
      replace?: boolean; 
      state?: any;
      analytics?: {
        category: string;
        action: string;
        label?: string;
      };
    }
  ) => {
    // Track navigation event
    if (options?.analytics && window.gtag) {
      window.gtag('event', options.analytics.action, {
        event_category: options.analytics.category,
        event_label: options.analytics.label || to,
        from_page: location.pathname,
        to_page: to,
      });
    }

    navigate(to, options);
  };

  return {
    navigate: navigateWithAnalytics,
    location,
  };
};

// Hook for route metadata
export const useRouteMetadata = () => {
  const location = useLocation();
  
  const currentRoute = routes.find(route => 
    route.path === location.pathname || 
    (route.path !== '/' && location.pathname.startsWith(route.path))
  );

  return {
    title: currentRoute?.title || 'ACSO',
    description: currentRoute?.description,
    permissions: currentRoute?.permissions || [],
    analytics: currentRoute?.analytics,
  };
};

export default EnhancedRouter;