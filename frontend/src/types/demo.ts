/**
 * Demo Types and Interfaces
 * 
 * Defines the core types for the UI-driven agentic AI demonstration system.
 * These types support scenario management, agent coordination, and real-time visualization.
 */

export type DemoScenarioType = 
  | 'autonomous-threat-response'
  | 'intelligent-cost-optimization'
  | 'multi-agent-workflow-orchestration'
  | 'predictive-incident-prevention'
  | 'adaptive-learning-optimization';

export type DemoStatus = 'idle' | 'starting' | 'running' | 'paused' | 'completed' | 'error';

export type DemoDifficulty = 'basic' | 'intermediate' | 'advanced';

export type AudienceType = 'executive' | 'technical' | 'financial' | 'operational' | 'security';

export interface DemoScenario {
  id: string;
  type: DemoScenarioType;
  name: string;
  description: string;
  duration: number; // in seconds
  difficulty: DemoDifficulty;
  targetAudience: AudienceType[];
  keyCapabilities: string[];
  businessMetrics: BusinessMetric[];
  events: DemoEvent[];
  customization: ScenarioCustomization;
}

export interface DemoEvent {
  id: string;
  timestamp: number; // relative to demo start in seconds
  type: 'agent-action' | 'user-interaction' | 'system-event' | 'milestone';
  title: string;
  description: string;
  agentId?: string;
  data: Record<string, any>;
  dependencies?: string[]; // event IDs this event depends on
  triggers?: string[]; // event IDs this event triggers
}

export interface ScenarioCustomization {
  parameters: Record<string, any>;
  audienceSpecific: Record<AudienceType, {
    emphasis: string[];
    metrics: string[];
    narrative: string;
  }>;
  businessContext: {
    industry?: string;
    companySize?: string;
    currentChallenges?: string[];
  };
}

export interface BusinessMetric {
  id: string;
  name: string;
  category: 'roi' | 'efficiency' | 'cost-savings' | 'risk-reduction' | 'performance';
  value: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  description: string;
  calculation?: string;
}

export interface DemoControls {
  start: () => Promise<void>;
  pause: () => Promise<void>;
  resume: () => Promise<void>;
  reset: () => Promise<void>;
  stop: () => Promise<void>;
  setSpeed: (speed: number) => void;
  jumpToEvent: (eventId: string) => Promise<void>;
}

export interface DemoState {
  scenario: DemoScenario | null;
  status: DemoStatus;
  currentEventIndex: number;
  elapsedTime: number;
  speed: number; // 1.0 = normal speed, 2.0 = 2x speed, etc.
  checkpoints: DemoCheckpoint[];
  error?: string;
}

export interface DemoCheckpoint {
  id: string;
  timestamp: number;
  eventIndex: number;
  state: Record<string, any>;
  description: string;
}

export interface DemoSession {
  id: string;
  userId: string;
  scenario: DemoScenario;
  startTime: Date;
  endTime?: Date;
  status: DemoStatus;
  customization: ScenarioCustomization;
  analytics: DemoAnalytics;
}

export interface DemoAnalytics {
  engagementScore: number;
  completionRate: number;
  interactionCount: number;
  timeSpent: number;
  keyMoments: {
    eventId: string;
    timestamp: number;
    userAction: string;
  }[];
  feedback?: {
    rating: number;
    comments: string;
    followUpInterest: boolean;
  };
}

// Agent-related types for demo simulation
export interface AgentStatus {
  id: string;
  name: string;
  type: 'supervisor' | 'threat-hunter' | 'incident-response' | 'financial-intelligence' | 'service-orchestration';
  status: 'idle' | 'active' | 'busy' | 'error';
  currentTask?: string;
  performance: {
    tasksCompleted: number;
    averageResponseTime: number;
    successRate: number;
  };
  capabilities: string[];
  workload: number; // 0-100 percentage
}

export interface AgentMessage {
  id: string;
  fromAgent: string;
  toAgent: string;
  timestamp: Date;
  type: 'request' | 'response' | 'notification' | 'coordination';
  content: string;
  data?: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface AgentDecision {
  id: string;
  agentId: string;
  timestamp: Date;
  context: string;
  options: {
    id: string;
    description: string;
    confidence: number;
    risk: number;
    impact: string;
  }[];
  selectedOption: string;
  reasoning: string;
  confidence: number;
  outcome?: {
    success: boolean;
    actualImpact: string;
    learnings: string[];
  };
}

export interface AgentPerformanceMetrics {
  responseTime: {
    average: number;
    p95: number;
    trend: number[];
  };
  accuracy: {
    current: number;
    historical: number[];
  };
  efficiency: {
    tasksPerHour: number;
    resourceUtilization: number;
  };
  collaboration: {
    messagesExchanged: number;
    coordinationSuccess: number;
  };
}

// Visualization types
export interface AgentTopology {
  nodes: {
    id: string;
    name: string;
    type: string;
    position: { x: number; y: number };
    status: string;
  }[];
  edges: {
    id: string;
    source: string;
    target: string;
    type: 'communication' | 'coordination' | 'dependency';
    strength: number;
    active: boolean;
  }[];
}

export interface MessageFlowVisualization {
  messages: {
    id: string;
    path: string[];
    timestamp: Date;
    type: string;
    active: boolean;
  }[];
  throughput: {
    timestamp: Date;
    count: number;
  }[];
}

export interface DecisionVisualization {
  decisions: {
    id: string;
    agentId: string;
    timestamp: Date;
    confidence: number;
    impact: string;
    reasoning: string[];
  }[];
  decisionTree: {
    nodeId: string;
    parentId?: string;
    decision: string;
    outcome: string;
    confidence: number;
  }[];
}

// ROI and Business Impact types
export interface ROICalculation {
  timeframe: 'monthly' | 'quarterly' | 'annually';
  investment: {
    initial: number;
    ongoing: number;
    total: number;
  };
  returns: {
    costSavings: number;
    efficiencyGains: number;
    riskReduction: number;
    revenueIncrease: number;
    total: number;
  };
  roi: {
    percentage: number;
    paybackPeriod: number; // in months
    npv: number;
    irr: number;
  };
  projections: {
    year1: number;
    year2: number;
    year3: number;
  };
}

export interface CostSavingsMetrics {
  categories: {
    name: string;
    current: number;
    optimized: number;
    savings: number;
    percentage: number;
  }[];
  timeline: {
    date: Date;
    cumulative: number;
    monthly: number;
  }[];
  breakdown: {
    labor: number;
    infrastructure: number;
    operational: number;
    risk: number;
  };
}

export interface EfficiencyMetrics {
  timeReduction: {
    process: string;
    before: number;
    after: number;
    improvement: number;
  }[];
  resourceOptimization: {
    resource: string;
    utilization: number;
    capacity: number;
    efficiency: number;
  }[];
  errorReduction: {
    category: string;
    baseline: number;
    current: number;
    reduction: number;
  }[];
}

export interface RiskReductionMetrics {
  threatsBlocked: {
    type: string;
    count: number;
    severity: 'low' | 'medium' | 'high' | 'critical';
    potentialImpact: number;
  }[];
  incidentsPrevented: {
    category: string;
    count: number;
    averageCost: number;
    totalSavings: number;
  }[];
  complianceImprovement: {
    framework: string;
    score: number;
    improvement: number;
    riskReduction: number;
  }[];
}

export interface FutureValueProjections {
  scenarios: {
    name: string;
    probability: number;
    value: number;
    timeline: number; // months
    assumptions: string[];
  }[];
  scalability: {
    clientGrowth: number[];
    valuePerClient: number[];
    totalValue: number[];
  };
  marketImpact: {
    competitiveAdvantage: number;
    marketShare: number;
    premiumPricing: number;
  };
}

// Demo orchestrator events
export interface DemoOrchestratorEvents {
  'demo:started': { scenario: DemoScenario; session: DemoSession };
  'demo:paused': { session: DemoSession };
  'demo:resumed': { session: DemoSession };
  'demo:stopped': { session: DemoSession; reason: string };
  'demo:completed': { session: DemoSession; analytics: DemoAnalytics };
  'demo:error': { session: DemoSession; error: string };
  'demo:event': { session: DemoSession; event: DemoEvent };
  'demo:checkpoint': { session: DemoSession; checkpoint: DemoCheckpoint };
  'agent:action': { session: DemoSession; agent: AgentStatus; action: string };
  'agent:message': { session: DemoSession; message: AgentMessage };
  'agent:decision': { session: DemoSession; decision: AgentDecision };
  'metrics:updated': { session: DemoSession; metrics: BusinessMetric[] };
}