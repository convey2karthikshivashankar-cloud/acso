import { setupServer } from 'msw/node';
import { rest } from 'msw';
import { generateTestData } from '../setup/testConfig';

// Mock API handlers
const handlers = [
  // Agents API
  rest.get('/api/agents', (req, res, ctx) => {
    const agents = generateTestData.agents(10);
    return res(ctx.json({ agents, total: agents.length }));
  }),

  rest.get('/api/agents/:id', (req, res, ctx) => {
    const { id } = req.params;
    const agent = generateTestData.agents(1)[0];
    agent.id = id as string;
    return res(ctx.json(agent));
  }),

  rest.put('/api/agents/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json({ id, message: 'Agent updated successfully' }));
  }),

  rest.post('/api/agents/:id/restart', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json({ id, message: 'Agent restart initiated' }));
  }),

  // Incidents API
  rest.get('/api/incidents', (req, res, ctx) => {
    const incidents = generateTestData.incidents(15);
    return res(ctx.json({ incidents, total: incidents.length }));
  }),

  rest.get('/api/incidents/:id', (req, res, ctx) => {
    const { id } = req.params;
    const incident = generateTestData.incidents(1)[0];
    incident.id = id as string;
    return res(ctx.json(incident));
  }),

  rest.post('/api/incidents', (req, res, ctx) => {
    const newIncident = generateTestData.incidents(1)[0];
    return res(ctx.status(201), ctx.json(newIncident));
  }),

  rest.put('/api/incidents/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json({ id, message: 'Incident updated successfully' }));
  }),

  // Workflows API
  rest.get('/api/workflows', (req, res, ctx) => {
    const workflows = generateTestData.workflows(8);
    return res(ctx.json({ workflows, total: workflows.length }));
  }),

  rest.get('/api/workflows/:id', (req, res, ctx) => {
    const { id } = req.params;
    const workflow = generateTestData.workflows(1)[0];
    workflow.id = id as string;
    return res(ctx.json(workflow));
  }),

  rest.post('/api/workflows', (req, res, ctx) => {
    const newWorkflow = generateTestData.workflows(1)[0];
    return res(ctx.status(201), ctx.json(newWorkflow));
  }),

  rest.post('/api/workflows/:id/start', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json({ id, status: 'running', message: 'Workflow started' }));
  }),

  rest.post('/api/workflows/:id/stop', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json({ id, status: 'stopped', message: 'Workflow stopped' }));
  }),

  // Metrics API
  rest.get('/api/metrics', (req, res, ctx) => {
    const metricName = req.url.searchParams.get('metric') || 'system.cpu.usage';
    const count = parseInt(req.url.searchParams.get('limit') || '100');
    const metrics = generateTestData.metrics(count, metricName);
    return res(ctx.json({ metrics, total: metrics.length }));
  }),

  rest.post('/api/metrics', (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ message: 'Metric added successfully' }));
  }),

  rest.get('/api/metrics/names', (req, res, ctx) => {
    const metricNames = [
      'system.cpu.usage',
      'system.memory.usage',
      'system.disk.usage',
      'network.throughput',
      'security.threats.detected',
      'security.incidents.count',
      'performance.response.time',
      'financial.cost.total',
      'financial.cost.compute',
      'financial.cost.storage',
    ];
    return res(ctx.json(metricNames));
  }),

  // Dashboard API
  rest.get('/api/dashboard/widgets', (req, res, ctx) => {
    const widgets = [
      {
        id: 'system-health',
        type: 'metric',
        title: 'System Health',
        data: { value: 85, unit: '%', trend: 'up' },
        position: { x: 0, y: 0, w: 2, h: 1 },
      },
      {
        id: 'active-incidents',
        type: 'counter',
        title: 'Active Incidents',
        data: { count: 3, change: -1 },
        position: { x: 2, y: 0, w: 2, h: 1 },
      },
      {
        id: 'agent-status',
        type: 'chart',
        title: 'Agent Status',
        data: {
          online: 8,
          offline: 2,
          warning: 1,
        },
        position: { x: 0, y: 1, w: 4, h: 2 },
      },
      {
        id: 'performance-metrics',
        type: 'timeseries',
        title: 'Performance Metrics',
        data: generateTestData.metrics(50, 'system.cpu.usage'),
        position: { x: 4, y: 0, w: 4, h: 3 },
      },
    ];
    return res(ctx.json(widgets));
  }),

  rest.post('/api/dashboard/widgets', (req, res, ctx) => {
    return res(ctx.status(201), ctx.json({ message: 'Widget created successfully' }));
  }),

  rest.put('/api/dashboard/widgets/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json({ id, message: 'Widget updated successfully' }));
  }),

  rest.delete('/api/dashboard/widgets/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json({ id, message: 'Widget deleted successfully' }));
  }),

  // Authentication API
  rest.post('/api/auth/login', (req, res, ctx) => {
    return res(
      ctx.json({
        token: 'mock-jwt-token',
        user: {
          id: 'user_1',
          email: 'test@example.com',
          name: 'Test User',
          role: 'admin',
        },
      })
    );
  }),

  rest.post('/api/auth/logout', (req, res, ctx) => {
    return res(ctx.json({ message: 'Logged out successfully' }));
  }),

  rest.get('/api/auth/me', (req, res, ctx) => {
    const authHeader = req.headers.get('Authorization');
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      return res(ctx.status(401), ctx.json({ error: 'Unauthorized' }));
    }

    return res(
      ctx.json({
        id: 'user_1',
        email: 'test@example.com',
        name: 'Test User',
        role: 'admin',
      })
    );
  }),

  // Financial API
  rest.get('/api/financial/roi', (req, res, ctx) => {
    return res(
      ctx.json({
        totalROI: 245.5,
        monthlyROI: 20.4,
        projectedAnnualROI: 280.0,
        breakdown: {
          costSavings: 150000,
          revenueIncrease: 95500,
          totalInvestment: 100000,
        },
      })
    );
  }),

  rest.get('/api/financial/costs', (req, res, ctx) => {
    return res(
      ctx.json({
        totalCost: 45000,
        monthlyCost: 3750,
        breakdown: {
          compute: 25000,
          storage: 8000,
          network: 5000,
          licenses: 7000,
        },
        trend: 'decreasing',
      })
    );
  }),

  // Demo API
  rest.get('/api/demo/scenarios', (req, res, ctx) => {
    const scenarios = [
      {
        id: 'cyber-attack-response',
        name: 'Cyber Attack Response',
        description: 'Simulates a coordinated cyber attack and automated response',
        duration: 300,
        complexity: 'high',
      },
      {
        id: 'system-maintenance',
        name: 'System Maintenance',
        description: 'Demonstrates automated system maintenance workflows',
        duration: 180,
        complexity: 'medium',
      },
      {
        id: 'cost-optimization',
        name: 'Cost Optimization',
        description: 'Shows intelligent cost optimization in action',
        duration: 240,
        complexity: 'medium',
      },
    ];
    return res(ctx.json(scenarios));
  }),

  rest.post('/api/demo/sessions', (req, res, ctx) => {
    return res(
      ctx.status(201),
      ctx.json({
        sessionId: 'session_' + Date.now(),
        status: 'running',
        startTime: new Date().toISOString(),
      })
    );
  }),

  rest.get('/api/demo/sessions/:id', (req, res, ctx) => {
    const { id } = req.params;
    return res(
      ctx.json({
        id,
        status: 'running',
        progress: 45,
        currentEvent: 'Threat Detection',
        startTime: new Date(Date.now() - 120000).toISOString(),
      })
    );
  }),

  rest.post('/api/demo/sessions/:id/stop', (req, res, ctx) => {
    const { id } = req.params;
    return res(ctx.json({ id, status: 'stopped' }));
  }),

  // Error simulation endpoints
  rest.get('/api/error/500', (req, res, ctx) => {
    return res(ctx.status(500), ctx.json({ error: 'Internal Server Error' }));
  }),

  rest.get('/api/error/404', (req, res, ctx) => {
    return res(ctx.status(404), ctx.json({ error: 'Not Found' }));
  }),

  rest.get('/api/error/timeout', (req, res, ctx) => {
    // Simulate timeout by delaying response
    return res(ctx.delay(10000), ctx.json({ message: 'This will timeout' }));
  }),

  // Slow response simulation
  rest.get('/api/slow', (req, res, ctx) => {
    return res(ctx.delay(2000), ctx.json({ message: 'Slow response' }));
  }),
];

// Create server instance
export const server = setupServer(...handlers);

// Export handlers for individual test customization
export { handlers };

// Helper functions for test-specific mocking
export const mockApiError = (endpoint: string, status: number, message: string) => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.status(status), ctx.json({ error: message }));
    })
  );
};

export const mockApiSuccess = (endpoint: string, data: any) => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.json(data));
    })
  );
};

export const mockApiDelay = (endpoint: string, delay: number, data: any = {}) => {
  server.use(
    rest.get(endpoint, (req, res, ctx) => {
      return res(ctx.delay(delay), ctx.json(data));
    })
  );
};

// WebSocket mock for real-time testing
export const mockWebSocketConnection = () => {
  const mockWebSocket = {
    send: jest.fn(),
    close: jest.fn(),
    addEventListener: jest.fn(),
    removeEventListener: jest.fn(),
    readyState: WebSocket.OPEN,
  };

  // Mock WebSocket constructor
  (global as any).WebSocket = jest.fn(() => mockWebSocket);

  return mockWebSocket;
};

// Utility to simulate real-time events
export const simulateWebSocketMessage = (mockWs: any, data: any) => {
  const messageEvent = new MessageEvent('message', {
    data: JSON.stringify(data),
  });
  
  // Trigger message event listeners
  if (mockWs.addEventListener.mock.calls.length > 0) {
    const messageHandlers = mockWs.addEventListener.mock.calls
      .filter(([event]: [string]) => event === 'message')
      .map(([, handler]: [string, Function]) => handler);
    
    messageHandlers.forEach(handler => handler(messageEvent));
  }
};