// Production configuration management
export interface EnvironmentConfig {
  apiBaseUrl: string;
  wsUrl: string;
  enableAnalytics: boolean;
  enableErrorReporting: boolean;
  enablePerformanceMonitoring: boolean;
  logLevel: 'error' | 'warn' | 'info' | 'debug';
  cacheConfig: {
    maxSize: number;
    defaultTTL: number;
  };
  featureFlags: Record<string, boolean>;
}

const environments: Record<string, EnvironmentConfig> = {
  development: {
    apiBaseUrl: 'http://localhost:8000',
    wsUrl: 'ws://localhost:8000/ws',
    enableAnalytics: false,
    enableErrorReporting: false,
    enablePerformanceMonitoring: true,
    logLevel: 'debug',
    cacheConfig: {
      maxSize: 100,
      defaultTTL: 60000 // 1 minute
    },
    featureFlags: {
      advancedCharts: true,
      realTimeSync: true,
      betaFeatures: true
    }
  },
  staging: {
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'https://api-staging.acso.com',
    wsUrl: process.env.REACT_APP_WS_URL || 'wss://ws-staging.acso.com',
    enableAnalytics: true,
    enableErrorReporting: true,
    enablePerformanceMonitoring: true,
    logLevel: 'info',
    cacheConfig: {
      maxSize: 500,
      defaultTTL: 300000 // 5 minutes
    },
    featureFlags: {
      advancedCharts: true,
      realTimeSync: true,
      betaFeatures: true
    }
  },
  production: {
    apiBaseUrl: process.env.REACT_APP_API_BASE_URL || 'https://api.acso.com',
    wsUrl: process.env.REACT_APP_WS_URL || 'wss://ws.acso.com',
    enableAnalytics: true,
    enableErrorReporting: true,
    enablePerformanceMonitoring: true,
    logLevel: 'error',
    cacheConfig: {
      maxSize: 1000,
      defaultTTL: 600000 // 10 minutes
    },
    featureFlags: {
      advancedCharts: true,
      realTimeSync: true,
      betaFeatures: false
    }
  }
};

export const getEnvironmentConfig = (): EnvironmentConfig => {
  const env = process.env.NODE_ENV || 'development';
  return environments[env] || environments.development;
};

export const config = getEnvironmentConfig();

// Feature flag helper
export const isFeatureEnabled = (feature: string): boolean => {
  return config.featureFlags[feature] || false;
};

// Environment helpers
export const isDevelopment = () => process.env.NODE_ENV === 'development';
export const isProduction = () => process.env.NODE_ENV === 'production';
export const isStaging = () => process.env.NODE_ENV === 'staging';