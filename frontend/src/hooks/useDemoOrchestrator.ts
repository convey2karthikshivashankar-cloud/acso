/**
 * Demo Orchestrator Hook
 * 
 * React hook for managing demo orchestrator state and providing
 * a clean interface for components to interact with demos.
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import {
  DemoScenario,
  DemoSession,
  DemoState,
  DemoEvent,
  DemoCheckpoint,
  AgentStatus,
  AgentMessage,
  AgentDecision,
  BusinessMetric,
  ScenarioCustomization,
  DemoAnalytics
} from '../types/demo';
import demoOrchestrator from '../services/demoOrchestrator';

interface UseDemoOrchestratorOptions {
  autoUpdateInterval?: number;
  enableAnalytics?: boolean;
}

interface UseDemoOrchestratorReturn {
  // State
  scenarios: DemoScenario[];
  currentSession: DemoSession | null;
  demoState: DemoState;
  agents: AgentStatus[];
  messages: AgentMessage[];
  decisions: AgentDecision[];
  metrics: BusinessMetric[];
  
  // Actions
  startDemo: (scenarioId: string, customization?: Partial<ScenarioCustomization>) => Promise<DemoSession>;
  pauseDemo: () => Promise<void>;
  resumeDemo: () => Promise<void>;
  stopDemo: () => Promise<void>;
  resetDemo: () => Promise<void>;
  setSpeed: (speed: number) => void;
  jumpToEvent: (eventId: string) => Promise<void>;
  
  // Event handlers
  onDemoStarted: (callback: (data: { scenario: DemoScenario; session: DemoSession }) => void) => () => void;
  onDemoEvent: (callback: (data: { session: DemoSession; event: DemoEvent }) => void) => () => void;
  onDemoCompleted: (callback: (data: { session: DemoSession; analytics: DemoAnalytics }) => void) => () => void;
  onAgentAction: (callback: (data: { session: DemoSession; agent: AgentStatus; action: string }) => void) => () => void;
  onMetricsUpdated: (callback: (data: { session: DemoSession; metrics: BusinessMetric[] }) => void) => () => void;
  
  // Utilities
  isRunning: boolean;
  isPaused: boolean;
  isIdle: boolean;
  progress: number;
  timeRemaining: number;
  formatTime: (seconds: number) => string;
}

export const useDemoOrchestrator = (options: UseDemoOrchestratorOptions = {}): UseDemoOrchestratorReturn => {
  const {
    autoUpdateInterval = 1000,
    enableAnalytics = true
  } = options;

  // State
  const [scenarios, setScenarios] = useState<DemoScenario[]>([]);
  const [currentSession, setCurrentSession] = useState<DemoSession | null>(null);
  const [demoState, setDemoState] = useState<DemoState>({
    scenario: null,
    status: 'idle',
    currentEventIndex: 0,
    elapsedTime: 0,
    speed: 1.0,
    checkpoints: []
  });
  const [agents, setAgents] = useState<AgentStatus[]>([]);
  const [messages, setMessages] = useState<AgentMessage[]>([]);
  const [decisions, setDecisions] = useState<AgentDecision[]>([]);
  const [metrics, setMetrics] = useState<BusinessMetric[]>([]);

  // Refs for cleanup
  const eventListenersRef = useRef<Array<() => void>>([]);
  const updateIntervalRef = useRef<number | null>(null);

  // Initialize scenarios on mount
  useEffect(() => {
    const availableScenarios = demoOrchestrator.getAvailableScenarios();
    setScenarios(availableScenarios);
  }, []);

  // Set up auto-update interval
  useEffect(() => {
    if (autoUpdateInterval > 0) {
      updateIntervalRef.current = window.setInterval(() => {
        setDemoState(demoOrchestrator.getDemoState());
        setCurrentSession(demoOrchestrator.getCurrentSession());
        setAgents(demoOrchestrator.getAgents());
        setMessages(demoOrchestrator.getMessages());
        setDecisions(demoOrchestrator.getDecisions());
        setMetrics(demoOrchestrator.getMetrics());
      }, autoUpdateInterval);
    }

    return () => {
      if (updateIntervalRef.current) {
        window.clearInterval(updateIntervalRef.current);
      }
    };
  }, [autoUpdateInterval]);

  // Cleanup event listeners on unmount
  useEffect(() => {
    return () => {
      eventListenersRef.current.forEach(cleanup => cleanup());
    };
  }, []);

  // Actions
  const startDemo = useCallback(async (
    scenarioId: string, 
    customization?: Partial<ScenarioCustomization>
  ): Promise<DemoSession> => {
    try {
      const session = await demoOrchestrator.startDemo(scenarioId, customization);
      setCurrentSession(session);
      return session;
    } catch (error) {
      console.error('Failed to start demo:', error);
      throw error;
    }
  }, []);

  const pauseDemo = useCallback(async (): Promise<void> => {
    try {
      const controls = demoOrchestrator.getControls();
      await controls.pause();
    } catch (error) {
      console.error('Failed to pause demo:', error);
      throw error;
    }
  }, []);

  const resumeDemo = useCallback(async (): Promise<void> => {
    try {
      const controls = demoOrchestrator.getControls();
      await controls.resume();
    } catch (error) {
      console.error('Failed to resume demo:', error);
      throw error;
    }
  }, []);

  const stopDemo = useCallback(async (): Promise<void> => {
    try {
      const controls = demoOrchestrator.getControls();
      await controls.stop();
      setCurrentSession(null);
    } catch (error) {
      console.error('Failed to stop demo:', error);
      throw error;
    }
  }, []);

  const resetDemo = useCallback(async (): Promise<void> => {
    try {
      const controls = demoOrchestrator.getControls();
      await controls.reset();
      setCurrentSession(null);
      setAgents([]);
      setMessages([]);
      setDecisions([]);
      setMetrics([]);
    } catch (error) {
      console.error('Failed to reset demo:', error);
      throw error;
    }
  }, []);

  const setSpeed = useCallback((speed: number): void => {
    const controls = demoOrchestrator.getControls();
    controls.setSpeed(speed);
  }, []);

  const jumpToEvent = useCallback(async (eventId: string): Promise<void> => {
    try {
      const controls = demoOrchestrator.getControls();
      await controls.jumpToEvent(eventId);
    } catch (error) {
      console.error('Failed to jump to event:', error);
      throw error;
    }
  }, []);

  // Event handler creators
  const onDemoStarted = useCallback((
    callback: (data: { scenario: DemoScenario; session: DemoSession }) => void
  ) => {
    const handler = (data: { scenario: DemoScenario; session: DemoSession }) => {
      setCurrentSession(data.session);
      callback(data);
    };
    
    demoOrchestrator.on('demo:started', handler);
    
    const cleanup = () => {
      demoOrchestrator.off('demo:started', handler);
    };
    
    eventListenersRef.current.push(cleanup);
    return cleanup;
  }, []);

  const onDemoEvent = useCallback((
    callback: (data: { session: DemoSession; event: DemoEvent }) => void
  ) => {
    const handler = (data: { session: DemoSession; event: DemoEvent }) => {
      callback(data);
    };
    
    demoOrchestrator.on('demo:event', handler);
    
    const cleanup = () => {
      demoOrchestrator.off('demo:event', handler);
    };
    
    eventListenersRef.current.push(cleanup);
    return cleanup;
  }, []);

  const onDemoCompleted = useCallback((
    callback: (data: { session: DemoSession; analytics: DemoAnalytics }) => void
  ) => {
    const handler = (data: { session: DemoSession; analytics: DemoAnalytics }) => {
      callback(data);
    };
    
    demoOrchestrator.on('demo:completed', handler);
    
    const cleanup = () => {
      demoOrchestrator.off('demo:completed', handler);
    };
    
    eventListenersRef.current.push(cleanup);
    return cleanup;
  }, []);

  const onAgentAction = useCallback((
    callback: (data: { session: DemoSession; agent: AgentStatus; action: string }) => void
  ) => {
    const handler = (data: { session: DemoSession; agent: AgentStatus; action: string }) => {
      setAgents(prev => prev.map(agent => 
        agent.id === data.agent.id ? data.agent : agent
      ));
      callback(data);
    };
    
    demoOrchestrator.on('agent:action', handler);
    
    const cleanup = () => {
      demoOrchestrator.off('agent:action', handler);
    };
    
    eventListenersRef.current.push(cleanup);
    return cleanup;
  }, []);

  const onMetricsUpdated = useCallback((
    callback: (data: { session: DemoSession; metrics: BusinessMetric[] }) => void
  ) => {
    const handler = (data: { session: DemoSession; metrics: BusinessMetric[] }) => {
      setMetrics(data.metrics);
      callback(data);
    };
    
    demoOrchestrator.on('metrics:updated', handler);
    
    const cleanup = () => {
      demoOrchestrator.off('metrics:updated', handler);
    };
    
    eventListenersRef.current.push(cleanup);
    return cleanup;
  }, []);

  // Computed values
  const isRunning = demoState.status === 'running';
  const isPaused = demoState.status === 'paused';
  const isIdle = demoState.status === 'idle';
  
  const progress = demoState.scenario 
    ? (demoState.elapsedTime / demoState.scenario.duration) * 100 
    : 0;
    
  const timeRemaining = demoState.scenario 
    ? Math.max(0, demoState.scenario.duration - demoState.elapsedTime)
    : 0;

  // Utility functions
  const formatTime = useCallback((seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  }, []);

  return {
    // State
    scenarios,
    currentSession,
    demoState,
    agents,
    messages,
    decisions,
    metrics,
    
    // Actions
    startDemo,
    pauseDemo,
    resumeDemo,
    stopDemo,
    resetDemo,
    setSpeed,
    jumpToEvent,
    
    // Event handlers
    onDemoStarted,
    onDemoEvent,
    onDemoCompleted,
    onAgentAction,
    onMetricsUpdated,
    
    // Utilities
    isRunning,
    isPaused,
    isIdle,
    progress,
    timeRemaining,
    formatTime
  };
};

export default useDemoOrchestrator;