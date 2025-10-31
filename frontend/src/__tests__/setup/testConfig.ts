import '@testing-library/jest-dom';
import { configure } from '@testing-library/react';
import { server } from '../mocks/server';

// Configure testing library
configure({
  testIdAttribute: 'data-testid',
  asyncUtilTimeout: 5000,
});

// Setup MSW (Mock Service Worker)
beforeAll(() => {
  server.listen({
    onUnhandledRequest: 'warn',
  });
});

afterEach(() => {
  server.resetHandlers();
  jest.clearAllMocks();
});

afterAll(() => {
  server.close();
});

// Mock IntersectionObserver
global.IntersectionObserver = class IntersectionObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock ResizeObserver
global.ResizeObserver = class ResizeObserver {
  constructor() {}
  disconnect() {}
  observe() {}
  unobserve() {}
};

// Mock matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: jest.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: jest.fn(), // deprecated
    removeListener: jest.fn(), // deprecated
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    dispatchEvent: jest.fn(),
  })),
});

// Mock window.performance.memory for memory testing
Object.defineProperty(window.performance, 'memory', {
  writable: true,
  value: {
    usedJSHeapSize: 1000000,
    totalJSHeapSize: 2000000,
    jsHeapSizeLimit: 4000000,
  },
});

// Mock console methods to reduce noise in tests
const originalConsoleError = console.error;
const originalConsoleWarn = console.warn;

beforeEach(() => {
  console.error = jest.fn();
  console.warn = jest.fn();
});

afterEach(() => {
  console.error = originalConsoleError;
  console.warn = originalConsoleWarn;
});

// Global test utilities
declare global {
  namespace jest {
    interface Matchers<R> {
      toBeWithinRange(floor: number, ceiling: number): R;
      toHaveBeenCalledWithPartialObject(expected: any): R;
    }
  }
  
  var gc: (() => void) | undefined;
}

// Performance testing utilities
export const performanceConfig = {
  renderTimeout: 100,
  updateTimeout: 50,
  memoryThreshold: 5 * 1024 * 1024, // 5MB
  bundleSizeThreshold: 100 * 1024, // 100KB
};

// Test data generators
export const generateTestData = {
  agents: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `agent_${i}`,
    name: `Agent ${i}`,
    type: 'security',
    status: i % 2 === 0 ? 'online' : 'offline',
    health: i % 3 === 0 ? 'healthy' : i % 3 === 1 ? 'warning' : 'unhealthy',
    location: `region_${i % 5}`,
    version: 'v1.0.0',
    lastSeen: new Date().toISOString(),
    metrics: {
      cpu: Math.random() * 100,
      memory: Math.random() * 100,
      responseTime: Math.random() * 1000,
      errorRate: Math.random() * 5,
    },
    capabilities: ['threat-detection', 'incident-response'],
  })),
  
  incidents: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `incident_${i}`,
    title: `Test Incident ${i}`,
    description: `Description for incident ${i}`,
    severity: ['low', 'medium', 'high', 'critical'][i % 4],
    category: ['security', 'performance', 'availability'][i % 3],
    status: ['open', 'investigating', 'resolved'][i % 3],
    assignedTo: `user_${i % 10}`,
    createdAt: new Date(Date.now() - i * 3600000).toISOString(),
    updatedAt: new Date().toISOString(),
    tags: [`tag_${i % 5}`, `category_${i % 3}`],
    affectedSystems: [`system_${i % 8}`],
    estimatedImpact: 'Some users affected',
  })),
  
  workflows: (count: number) => Array.from({ length: count }, (_, i) => ({
    id: `workflow_${i}`,
    name: `Test Workflow ${i}`,
    template: ['incident-response', 'maintenance', 'deployment'][i % 3],
    status: ['running', 'completed', 'failed', 'paused'][i % 4],
    progress: Math.floor(Math.random() * 101),
    startedAt: new Date(Date.now() - i * 1800000).toISOString(),
    updatedAt: new Date().toISOString(),
    steps: [
      'Step 1: Initialize',
      'Step 2: Process',
      'Step 3: Validate',
      'Step 4: Complete',
    ],
    executionTime: Math.floor(Math.random() * 3600000),
    triggeredBy: i % 2 === 0 ? 'automated' : 'manual',
  })),
  
  metrics: (count: number, metricName: string) => Array.from({ length: count }, (_, i) => ({
    timestamp: new Date(Date.now() - i * 60000).toISOString(),
    value: Math.random() * 100,
    tags: { 
      source: 'test',
      metric: metricName,
      instance: `instance_${i % 5}`,
    },
    metadata: {
      unit: '%',
      aggregation: 'average',
    },
  })),
};

// Mock API responses
export const mockApiResponses = {
  success: (data: any) => ({
    ok: true,
    status: 200,
    json: () => Promise.resolve(data),
    text: () => Promise.resolve(JSON.stringify(data)),
  }),
  
  error: (message: string, status = 500) => ({
    ok: false,
    status,
    json: () => Promise.resolve({ error: message }),
    text: () => Promise.resolve(JSON.stringify({ error: message })),
  }),
  
  loading: () => new Promise(resolve => {
    setTimeout(() => resolve(mockApiResponses.success({})), 100);
  }),
};

// Test environment detection
export const isCI = process.env.CI === 'true';
export const isDebug = process.env.DEBUG === 'true';

// Conditional test skipping
export const skipInCI = isCI ? describe.skip : describe;
export const skipIfNotDebug = isDebug ? describe : describe.skip;

// Performance test helpers
export const measureRenderTime = async (renderFn: () => void) => {
  const start = performance.now();
  renderFn();
  const end = performance.now();
  return end - start;
};

export const measureMemoryUsage = () => {
  if (typeof window !== 'undefined' && window.performance && window.performance.memory) {
    return window.performance.memory.usedJSHeapSize;
  }
  return 0;
};

// Accessibility test helpers
export const axeConfig = {
  rules: {
    // Disable color-contrast rule for tests (can be flaky)
    'color-contrast': { enabled: false },
  },
};

// Custom test matchers setup
expect.extend({
  toBeWithinRange(received: number, floor: number, ceiling: number) {
    const pass = received >= floor && received <= ceiling;
    if (pass) {
      return {
        message: () =>
          `expected ${received} not to be within range ${floor} - ${ceiling}`,
        pass: true,
      };
    } else {
      return {
        message: () =>
          `expected ${received} to be within range ${floor} - ${ceiling}`,
        pass: false,
      };
    }
  },
  
  toHaveBeenCalledWithPartialObject(received: jest.Mock, expected: any) {
    const calls = received.mock.calls;
    const pass = calls.some(call => 
      call.some(arg => 
        typeof arg === 'object' && 
        Object.keys(expected).every(key => arg[key] === expected[key])
      )
    );
    
    if (pass) {
      return {
        message: () => `expected mock not to have been called with partial object`,
        pass: true,
      };
    } else {
      return {
        message: () => `expected mock to have been called with partial object`,
        pass: false,
      };
    }
  },
});