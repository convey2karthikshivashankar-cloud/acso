import React, { Suspense, lazy } from 'react';
import {
  BrowserRouter,
  Routes,
  Route,
  Navigate,
  useLocation,
  useNavigate,
} from 'react-router-dom';
import { Box, LinearProgress } from '@mui/material';
import { ErrorBoundary, PageErrorBoundary } from '../components/common/ErrorBoundary';
import { ProtectedRoute } from '../components/auth/ProtectedRoute';
import { AppLayout } from '../components/layout/AppLayout';
import { useAuth } from '../hooks/useAuth';
import { useGlobalLoading } from '../components/common/GlobalLoadingProvider';

// Lazy load pages for better performance
const Dashboard = lazy(() => import('../pages/Dashboard'));
const Login = lazy(() => import('../pages/Login'));
const AgentsPage = lazy(() => import('../pages/AgentsPage'));
const IncidentsPage = lazy(() => import('../pages/IncidentsPage'));
const WorkflowsPage = lazy(() => import('../pages/WorkflowsPage'));
const FinancialPage = lazy(() => import('../pages/FinancialPage'));
const SettingsPage = lazy(() => import('../pages/SettingsPage'));
const ProfilePage = lazy(() => import('../pages/ProfilePage'));
const DemoPage = lazy(() => import('../pages/DemoPage'));
const ReportsPage = lazy(() => import('../pages/ReportsPage'));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// Route configuration
export interface RouteConfig {
  path: string;
  element: React.ComponentType;
  protected?: boolean;
  roles?: string[];
  title?: string;
  description?: string;
  breadcrumb?: string;
  icon?: string;
  hidden?: boolean;
  children?: RouteConfig[];
}

export const routeConfig: RouteConfig[] = [
  {
    path: '/',
    element: Dashboard,
    protected: true,
    title: 'Dashboard',
    description: 'System overview and key metrics',
    breadcrumb: 'Dashboard',
    icon: 'dashboard',
  },
  {
    path: '/agents',
    element: AgentsPage,
    protected: true,
    title: 'Agents',
    description: 'Manage and monitor ACSO agents',
    breadcrumb: 'Agents',
    icon: 'smart_toy',
  },
  {
    path: '/incidents',
    element: IncidentsPage,
    protected: true,
    title: 'Incidents',
    description: 'Security incident management',
    breadcrumb: 'Incidents',
    icon: 'warning',
  },
  {
    path: '/workflows',
    element: WorkflowsPage,
    protected: true,
    title: 'Workflows',
    description: 'Automated workflow management',
    breadcrumb: 'Workflows',
    icon: 'account_tree',
  },
  {
    path: '/financial',
    element: FinancialPage,
    protected: true,
    title: 'Financial',
    description: 'Cost analysis and ROI tracking',
    breadcrumb: 'Financial',
    icon: 'attach_money',
  },
  {
    path: '/reports',
    element: ReportsPage,
    protected: true,
    title: 'Reports',
    description: 'Analytics and reporting',
    breadcrumb: 'Reports',
    icon: 'assessment',
  },
  {
    path: '/demo',
    element: DemoPage,
    protected: true,
    title: 'Demo',
    description: 'Interactive system demonstrations',
    breadcrumb: 'Demo',
    icon: 'play_circle',
  },
  {
    path: '/settings',
    element: SettingsPage,
    protected: true,
    title: 'Settings',
    description: 'System configuration and preferences',
    breadcrumb: 'Settings',
    icon: 'settings',
  },
  {
    path: '/profile',
    element: ProfilePage,
    protected: true,
    title: 'Profile',
    description: 'User profile and account settings',
    breadcrumb: 'Profile',
    icon: 'person',
    hidden: true,
  },
  {
    path: '/login',
    element: Login,
    protected: false,
    title: 'Login',
    description: 'Sign in to ACSO',
    hidden: true,
  },
];

// Loading fallback component
const RouteLoadingFallback: React.FC<{ route?: string }> = ({ route }) => {
  return (
    <Box sx={{ width: '100%', position: 'fixed', top: 0, left: 0, zIndex: 9999 }}>
      <LinearProgress 
        sx={{ 
          height: 3,
          '& .MuiLinearProgress-bar': {
            transition: 'transform 0.4s ease-in-out',
          },
        }} 
      />
    </Box>
  );
};

// Route analytics and tracking
const RouteTracker: React.FC = () => {
  const location = useLocation();
  const { user } = useAuth();

  React.useEffect(() => {
    // Track route changes for analytics
    const routeData = {
      path: location.pathname,
      search: location.search,
      hash: location.hash,
      timestamp: new Date().toISOString(),
      userId: user?.id,
    };

    // In development, log route changes
    if (process.env.NODE_ENV === 'development') {
      console.log('📍 Route changed:', routeData);
    }

    // TODO: Send to analytics service
    // analyticsService.trackPageView(routeData);
  }, [location, user]);

  return null;
};

// Route title and meta management
const RouteMetaManager: React.FC = () => {
  const location = useLocation();

  React.useEffect(() => {
    const currentRoute = routeConfig.find(route => {
      if (route.path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(route.path);
    });

    if (currentRoute) {
      // Update document title
      document.title = `${currentRoute.title} - ACSO Enterprise`;
      
      // Update meta description
      const metaDescription = document.querySelector('meta[name="description"]');
      if (metaDescription && currentRoute.description) {
        metaDescription.setAttribute('content', currentRoute.description);
      }
    }
  }, [location]);

  return null;
};

// Main router component
export const AppRouter: React.FC = () => {
  const { isAuthenticated, isLoading } = useAuth();

  if (isLoading) {
    return <RouteLoadingFallback route="auth" />;
  }

  return (
    <BrowserRouter>
      <PageErrorBoundary>
        <RouteTracker />
        <RouteMetaManager />
        
        <Routes>
          {/* Public routes */}
          <Route
            path="/login"
            element={
              <Suspense fallback={<RouteLoadingFallback route="login" />}>
                <Login />
              </Suspense>
            }
          />
          
          {/* Protected routes with layout */}
          <Route
            path="/*"
            element={
              <ProtectedRoute>
                <AppLayout>
                  <Suspense fallback={<RouteLoadingFallback />}>
                    <Routes>
                      {/* Dashboard */}
                      <Route index element={<Dashboard />} />
                      
                      {/* Main application routes */}
                      <Route path="agents/*" element={<AgentsPage />} />
                      <Route path="incidents/*" element={<IncidentsPage />} />
                      <Route path="workflows/*" element={<WorkflowsPage />} />
                      <Route path="financial/*" element={<FinancialPage />} />
                      <Route path="reports/*" element={<ReportsPage />} />
                      <Route path="demo/*" element={<DemoPage />} />
                      <Route path="settings/*" element={<SettingsPage />} />
                      <Route path="profile" element={<ProfilePage />} />
                      
                      {/* Redirects */}
                      <Route path="dashboard" element={<Navigate to="/" replace />} />
                      
                      {/* 404 */}
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </Suspense>
                </AppLayout>
              </ProtectedRoute>
            }
          />
        </Routes>
      </PageErrorBoundary>
    </BrowserRouter>
  );
};

// Hook to get current route information
export const useCurrentRoute = () => {
  const location = useLocation();
  
  const currentRoute = React.useMemo(() => {
    return routeConfig.find(route => {
      if (route.path === '/') {
        return location.pathname === '/';
      }
      return location.pathname.startsWith(route.path);
    });
  }, [location.pathname]);

  return currentRoute;
};

// Hook for programmatic navigation with loading states
export const useAppNavigation = () => {
  const navigate = useNavigate();
  const { showLoading, hideLoading } = useGlobalLoading();

  const navigateWithLoading = React.useCallback(
    (to: string, options?: { replace?: boolean; state?: any }) => {
      const loadingId = showLoading('Navigating...');
      
      // Small delay to show loading state
      setTimeout(() => {
        navigate(to, options);
        hideLoading(loadingId);
      }, 100);
    },
    [navigate, showLoading, hideLoading]
  );

  return {
    navigate: navigateWithLoading,
    navigateImmediate: navigate,
  };
};

// Route guard hook
export const useRouteGuard = () => {
  const { user, hasPermission } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  React.useEffect(() => {
    const currentRoute = routeConfig.find(route => 
      location.pathname.startsWith(route.path)
    );

    if (currentRoute?.roles && currentRoute.roles.length > 0) {
      const hasRequiredRole = currentRoute.roles.some(role => 
        hasPermission(role)
      );

      if (!hasRequiredRole) {
        console.warn(`Access denied to ${currentRoute.path}. Required roles:`, currentRoute.roles);
        navigate('/', { replace: true });
      }
    }
  }, [location, user, hasPermission, navigate]);
};

// Export route utilities
export const getRouteByPath = (path: string): RouteConfig | undefined => {
  return routeConfig.find(route => route.path === path);
};

export const getVisibleRoutes = (): RouteConfig[] => {
  return routeConfig.filter(route => !route.hidden);
};

export const getBreadcrumbs = (pathname: string): Array<{ label: string; path: string }> => {
  const segments = pathname.split('/').filter(Boolean);
  const breadcrumbs: Array<{ label: string; path: string }> = [];
  
  let currentPath = '';
  
  segments.forEach(segment => {
    currentPath += `/${segment}`;
    const route = getRouteByPath(currentPath);
    
    if (route && route.breadcrumb) {
      breadcrumbs.push({
        label: route.breadcrumb,
        path: currentPath,
      });
    } else {
      // Fallback to segment name
      breadcrumbs.push({
        label: segment.charAt(0).toUpperCase() + segment.slice(1),
        path: currentPath,
      });
    }
  });
  
  return breadcrumbs;
};

export default AppRouter;