/**
 * Demo Configuration
 * 
 * Configuration settings for the demo orchestration system.
 */

export const DEMO_CONFIG = {
  // Default demo settings
  DEFAULT_SPEED: 1.0,
  MIN_SPEED: 0.1,
  MAX_SPEED: 5.0,
  
  // Update intervals (in milliseconds)
  STATE_UPDATE_INTERVAL: 1000,
  METRICS_UPDATE_INTERVAL: 2000,
  AGENT_UPDATE_INTERVAL: 500,
  
  // Demo timeouts
  MAX_DEMO_DURATION: 1800, // 30 minutes
  EVENT_TIMEOUT: 30000, // 30 seconds
  
  // UI settings
  MAX_RECENT_EVENTS: 10,
  MAX_AGENT_MESSAGES: 50,
  MAX_DECISIONS_HISTORY: 25,
  
  // Animation settings
  TRANSITION_DURATION: 300,
  FADE_DURATION: 200,
  
  // Business metrics
  DEFAULT_ROI_TIMEFRAME: 12, // months
  COST_SAVINGS_MULTIPLIER: 1.2,
  EFFICIENCY_BASELINE: 100,
  
  // Agent simulation
  AGENT_RESPONSE_DELAY: {
    MIN: 1000,
    MAX: 5000
  },
  DECISION_CONFIDENCE_THRESHOLD: 0.8,
  
  // Demo scenarios
  SCENARIO_CATEGORIES: [
    'autonomous-threat-response',
    'intelligent-cost-optimization', 
    'multi-agent-workflow-orchestration',
    'predictive-incident-prevention',
    'adaptive-learning-optimization'
  ] as const,
  
  // Audience types
  AUDIENCE_TYPES: [
    'executive',
    'technical', 
    'financial',
    'operational',
    'security'
  ] as const,
  
  // Demo difficulties
  DIFFICULTY_LEVELS: [
    'basic',
    'intermediate',
    'advanced'
  ] as const
};

export type DemoConfigType = typeof DEMO_CONFIG;
export default DEMO_CONFIG;