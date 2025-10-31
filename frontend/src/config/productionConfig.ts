// Production configuration for ACSO Enterprise UI
export const productionConfig = {
  // API Configuration
  api: {
    baseUrl: process.env.VITE_API_BASE_URL || 'http://localhost:3001/api',
    timeout: 30000,
    retryAttempts: 3,
    retryDelay: 1000
  },

  // WebSocket Configuration
  websocket: {
    url: process.env.VITE_WS_URL || 'ws://localhost:3001',
    reconnectInterval: 5000,
    maxReconnectAttempts: 10,
    heartbeatInterval: 30000
  },

  // Demo Data Configuration
  demo: {
    enabled: true,
    autoStart: true,
    updateInterval: 2000,
    simulateRealTime: true,
    enableNotifications: true
  },

  // Feature Flags
  features: {
    realTimeUpdates: true,
    advancedCharts: true,
    workflowDesigner: true,
    financialAnalytics: true,
    incidentManagement: true,
    agentMonitoring: true,
    mobileSupport: true,
    accessibility: true,
    darkMode: true,
    exportFunctionality: true
  },

  // Performance Configuration
  performance: {
    enableVirtualization: true,
    lazyLoadComponents: true,
    cacheTimeout: 300000, // 5 minutes
    maxCacheSize: 100,
    enableServiceWorker: true,
    compressionEnabled: true
  },

  // UI Configuration
  ui: {
    theme: 'light',
    primaryColor: '#007bff',
    secondaryColor: '#6c757d',
    animationsEnabled: true,
    transitionDuration: 300,
    showTooltips: true,
    enableKeyboardNavigation: true
  },

  // Data Refresh Intervals (in milliseconds)
  refreshIntervals: {
    dashboard: 5000,
    agents: 3000,
    incidents: 10000,
    financial: 30000,
    workflows: 5000,
    notifications: 15000
  },

  // Chart Configuration
  charts: {
    enableAnimations: true,
    defaultHeight: 400,
    enableZoom: true,
    enableExport: true,
    colorScheme: [
      '#007bff', '#28a745', '#ffc107', '#dc3545', 
      '#17a2b8', '#6f42c1', '#fd7e14', '#20c997'
    ]
  },

  // Notification Configuration
  notifications: {
    position: 'top-right',
    autoClose: 5000,
    showProgress: true,
    enableSound: false,
    maxNotifications: 5
  },

  // Security Configuration
  security: {
    enableCSP: true,
    sessionTimeout: 3600000, // 1 hour
    maxLoginAttempts: 5,
    lockoutDuration: 900000, // 15 minutes
    enableAuditLog: true
  },

  // Accessibility Configuration
  accessibility: {
    enableHighContrast: true,
    enableScreenReader: true,
    enableKeyboardNavigation: true,
    fontSize: 'medium',
    reducedMotion: false
  },

  // Mobile Configuration
  mobile: {
    enableTouchGestures: true,
    swipeThreshold: 50,
    enablePullToRefresh: true,
    adaptiveLayout: true
  },

  // Analytics Configuration
  analytics: {
    enabled: false, // Disabled for demo
    trackPageViews: false,
    trackUserInteractions: false,
    trackPerformance: false
  },

  // Error Handling
  errorHandling: {
    enableErrorBoundary: true,
    enableErrorReporting: false, // Disabled for demo
    showErrorDetails: process.env.NODE_ENV === 'development',
    maxErrorLogs: 100
  },

  // Development Configuration
  development: {
    enableDevTools: process.env.NODE_ENV === 'development',
    enableHotReload: process.env.NODE_ENV === 'development',
    showPerformanceMetrics: false,
    enableDebugMode: false
  }
};

// Environment-specific overrides
if (process.env.NODE_ENV === 'production') {
  // Production optimizations
  productionConfig.performance.enableVirtualization = true;
  productionConfig.performance.lazyLoadComponents = true;
  productionConfig.ui.animationsEnabled = true;
  productionConfig.charts.enableAnimations = true;
}

export default productionConfig;