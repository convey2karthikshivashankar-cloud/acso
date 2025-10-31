export interface DemoEngineConfig {
  simulation: {
    enabled: boolean;
    updateInterval: number;
    dataRetentionPeriod: number;
    maxConcurrentSessions: number;
    autoCleanup: boolean;
  };
  
  visualization: {
    theme: 'light' | 'dark' | 'auto';
    animationsEnabled: boolean;
    realTimeUpdates: boolean;
    chartRefreshRate: number;
    maxDataPoints: number;
  };
  
  metrics: {
    aggregationInterval: number;
    retentionPeriod: number;
    alertThresholds: Record<string, number>;
    enablePredictiveAnalytics: boolean;
  };
  
  scenarios: {
    defaultPlaybackSpeed: number;
    enableEventMarkers: boolean;
    autoAdvanceEvents: boolean;
    pauseOnUserInteraction: boolean;
  };
  
  networking: {
    websocketReconnectAttempts: number;
    websocketReconnectDelay: number;
    apiTimeout: number;
    enableOfflineMode: boolean;
  };
  
  performance: {
    enableVirtualization: boolean;
    lazyLoadComponents: boolean;
    debounceInterval: number;
    maxRenderItems: number;
  };
  
  accessibility: {
    enableScreenReader: boolean;
    highContrastMode: boolean;
    reducedMotion: boolean;
    keyboardNavigation: boolean;
  };
  
  debugging: {
    enableConsoleLogging: boolean;
    enablePerformanceMonitoring: boolean;
    logLevel: 'debug' | 'info' | 'warn' | 'error';
    enableErrorReporting: boolean;
  };
}

export const defaultDemoEngineConfig: DemoEngineConfig = {
  simulation: {
    enabled: true,
    updateInterval: 1000,
    dataRetentionPeriod: 24 * 60 * 60 * 1000,
    maxConcurrentSessions: 10,
    autoCleanup: true,
  },
  
  visualization: {
    theme: 'auto',
    animationsEnabled: true,
    realTimeUpdates: true,
    chartRefreshRate: 2000,
    maxDataPoints: 1000,
  },
  
  metrics: {
    aggregationInterval: 5000,
    retentionPeriod: 7 * 24 * 60 * 60 * 1000,
    alertThresholds: {
      'system.cpu.usage': 80,
      'system.memory.usage': 85,
      'agents.response.time': 1000,
      'financial.cost.total': 100000,
      'security.threats.detected': 5,
    },
    enablePredictiveAnalytics: true,
  },
  
  scenarios: {
    defaultPlaybackSpeed: 1.0,
    enableEventMarkers: true,
    autoAdvanceEvents: true,
    pauseOnUserInteraction: false,
  },
  
  networking: {
    websocketReconnectAttempts: 5,
    websocketReconnectDelay: 3000,
    apiTimeout: 10000,
    enableOfflineMode: true,
  },
  
  performance: {
    enableVirtualization: true,
    lazyLoadComponents: true,
    debounceInterval: 300,
    maxRenderItems: 100,
  },
  
  accessibility: {
    enableScreenReader: false,
    highContrastMode: false,
    reducedMotion: false,
    keyboardNavigation: true,
  },
  
  debugging: {
    enableConsoleLogging: process.env.NODE_ENV === 'development',
    enablePerformanceMonitoring: process.env.NODE_ENV === 'development',
    logLevel: process.env.NODE_ENV === 'development' ? 'debug' : 'warn',
    enableErrorReporting: process.env.NODE_ENV === 'production',
  },
};

export function getDemoEngineConfig(): DemoEngineConfig {
  return defaultDemoEngineConfig;
}

export const currentConfig = getDemoEngineConfig();