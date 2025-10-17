import React from 'react';
import { createLazyComponent, LoadingFallback } from '../utils/lazyLoading';

// Custom loading components for different sections
const DashboardLoading = () => (
  <LoadingFallback message="Loading Dashboard..." size="large" fullScreen />
);

const AgentLoading = () => (
  <LoadingFallback message="Loading Agent Management..." size="medium" />
);

const WorkflowLoading = () => (
  <LoadingFallback message="Loading Workflow Designer..." size="medium" />
);

const IncidentLoading = () => (
  <LoadingFallback message="Loading Incident Management..." size="medium" />
);

const ChartsLoading = () => (
  <LoadingFallback message="Loading Charts..." size="medium" />
);

// Lazy loaded page components with route-based code splitting
export const LazyDashboard = createLazyComponent(
  () => import('../pages/Dashboard'),
  {
    fallback: DashboardLoading,
    preload: true, // Preload dashboard as it's likely the first page
  }
);

export const LazyLogin = createLazyComponent(
  () => import('../pages/Login'),
  {
    fallback: () => <LoadingFallback message="Loading Login..." />,
  }
);

// Agent Management Routes
export const LazyAgentOverview = createLazyComponent(
  () => import('../components/agents/AgentOverview'),
  {
    fallback: AgentLoading,
  }
);

export const LazyAgentConfiguration = createLazyComponent(
  () => import('../components/agents/AgentConfigurationManager'),
  {
    fallback: AgentLoading,
  }
);

export const LazyAgentLogViewer = createLazyComponent(
  () => import('../components/agents/AgentLogViewer'),
  {
    fallback: AgentLoading,
  }
);

export const LazyAgentDiagnostics = createLazyComponent(
  () => import('../components/agents/AgentDiagnostics'),
  {
    fallback: AgentLoading,
  }
);

// Workflow Management Routes
export const LazyWorkflowDesigner = createLazyComponent(
  () => import('../components/workflow/WorkflowDesigner'),
  {
    fallback: WorkflowLoading,
  }
);

export const LazyWorkflowExecutionMonitor = createLazyComponent(
  () => import('../components/workflow/WorkflowExecutionMonitor'),
  {
    fallback: WorkflowLoading,
  }
);

export const LazyWorkflowTemplateManager = createLazyComponent(
  () => import('../components/workflow/WorkflowTemplateManager'),
  {
    fallback: WorkflowLoading,
  }
);

// Incident Management Routes
export const LazyIncidentManagementDashboard = createLazyComponent(
  () => import('../components/incidents/IncidentManagementDashboard'),
  {
    fallback: IncidentLoading,
  }
);

// Dashboard Components (lazy loaded for better performance)
export const LazyDashboardCustomizer = createLazyComponent(
  () => import('../components/dashboard/DashboardCustomizer'),
  {
    fallback: () => <LoadingFallback message="Loading Customizer..." />,
  }
);

export const LazyEnhancedDashboard = createLazyComponent(
  () => import('../components/dashboard/EnhancedDashboard'),
  {
    fallback: DashboardLoading,
  }
);

export const LazyRoleBasedDashboard = createLazyComponent(
  () => import('../components/dashboard/RoleBasedDashboard'),
  {
    fallback: DashboardLoading,
  }
);

// Chart Components (heavy components that benefit from lazy loading)
export const LazyTimeSeriesChart = createLazyComponent(
  () => import('../components/charts/TimeSeriesChart'),
  {
    fallback: ChartsLoading,
  }
);

export const LazyNetworkTopology = createLazyComponent(
  () => import('../components/charts/NetworkTopology'),
  {
    fallback: ChartsLoading,
  }
);

export const LazyHeatMap = createLazyComponent(
  () => import('../components/charts/HeatMap'),
  {
    fallback: ChartsLoading,
  }
);

export const LazyInteractiveChart = createLazyComponent(
  () => import('../components/charts/InteractiveChart'),
  {
    fallback: ChartsLoading,
  }
);

export const LazyRealTimeChart = createLazyComponent(
  () => import('../components/charts/RealTimeChart'),
  {
    fallback: ChartsLoading,
  }
);

// Example Components (loaded on demand)
export const LazyDashboardExample = createLazyComponent(
  () => import('../components/dashboard/DashboardExample'),
  {
    fallback: () => <LoadingFallback message="Loading Example..." />,
  }
);

export const LazyAgentManagementExample = createLazyComponent(
  () => import('../components/agents/AgentManagementExample'),
  {
    fallback: () => <LoadingFallback message="Loading Example..." />,
  }
);

export const LazyChartLibraryExample = createLazyComponent(
  () => import('../components/charts/ChartLibraryExample'),
  {
    fallback: () => <LoadingFallback message="Loading Example..." />,
  }
);

export const LazyResponsiveLayoutExample = createLazyComponent(
  () => import('../components/examples/ResponsiveLayoutExample'),
  {
    fallback: () => <LoadingFallback message="Loading Example..." />,
  }
);

// Heavy utility components
export const LazyBulkConfigurationManager = createLazyComponent(
  () => import('../components/agents/BulkConfigurationManager'),
  {
    fallback: AgentLoading,
  }
);

export const LazyConfigurationVersioning = createLazyComponent(
  () => import('../components/agents/ConfigurationVersioning'),
  {
    fallback: AgentLoading,
  }
);

// Preload functions for route-based preloading
export const preloadRoutes = {
  '/dashboard': () => LazyDashboard.preload(),
  '/agents': () => LazyAgentOverview.preload(),
  '/agents/configuration': () => LazyAgentConfiguration.preload(),
  '/agents/logs': () => LazyAgentLogViewer.preload(),
  '/agents/diagnostics': () => LazyAgentDiagnostics.preload(),
  '/workflows': () => LazyWorkflowDesigner.preload(),
  '/workflows/monitor': () => LazyWorkflowExecutionMonitor.preload(),
  '/workflows/templates': () => LazyWorkflowTemplateManager.preload(),
  '/incidents': () => LazyIncidentManagementDashboard.preload(),
  '/charts': () => LazyTimeSeriesChart.preload(),
};

// Route configuration with lazy loading
export const lazyRouteConfig = [
  {
    path: '/',
    component: LazyDashboard,
    preload: true,
  },
  {
    path: '/login',
    component: LazyLogin,
    preload: false,
  },
  {
    path: '/dashboard',
    component: LazyDashboard,
    preload: true,
  },
  {
    path: '/agents',
    component: LazyAgentOverview,
    preload: false,
  },
  {
    path: '/agents/configuration',
    component: LazyAgentConfiguration,
    preload: false,
  },
  {
    path: '/agents/logs',
    component: LazyAgentLogViewer,
    preload: false,
  },
  {
    path: '/agents/diagnostics',
    component: LazyAgentDiagnostics,
    preload: false,
  },
  {
    path: '/workflows',
    component: LazyWorkflowDesigner,
    preload: false,
  },
  {
    path: '/workflows/monitor',
    component: LazyWorkflowExecutionMonitor,
    preload: false,
  },
  {
    path: '/workflows/templates',
    component: LazyWorkflowTemplateManager,
    preload: false,
  },
  {
    path: '/incidents',
    component: LazyIncidentManagementDashboard,
    preload: false,
  },
];

// Preload critical routes on app initialization
export const preloadCriticalRoutes = () => {
  // Preload dashboard and login as they're most commonly accessed
  LazyDashboard.preload();
  
  // Preload other routes based on user role or usage patterns
  setTimeout(() => {
    LazyAgentOverview.preload();
  }, 2000);
  
  setTimeout(() => {
    LazyIncidentManagementDashboard.preload();
  }, 4000);
};