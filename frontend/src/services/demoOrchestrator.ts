/**
 * Demo Orchestrator Service
 * 
 * Core service for managing UI-driven agentic AI demonstrations.
 * Handles scenario lifecycle, agent coordination, and real-time state management.
 */

// Custom EventEmitter implementation for browser compatibility
class EventEmitter {
  private events: { [key: string]: Function[] } = {};

  on(event: string, listener: Function): void {
    if (!this.events[event]) {
      this.events[event] = [];
    }
    this.events[event].push(listener);
  }

  off(event: string, listener: Function): void {
    if (!this.events[event]) return;
    this.events[event] = this.events[event].filter(l => l !== listener);
  }

  emit(event: string, ...args: any[]): void {
    if (!this.events[event]) return;
    this.events[event].forEach(listener => listener(...args));
  }
}
import {
  DemoScenario,
  DemoSession,
  DemoState,
  DemoStatus,
  DemoEvent,
  DemoCheckpoint,
  DemoControls,
  DemoOrchestratorEvents,
  ScenarioCustomization,
  AgentStatus,
  AgentMessage,
  AgentDecision,
  BusinessMetric,
  DemoAnalytics,
  AudienceType
} from '../types/demo';
import agentSimulator from './agentSimulator';

class DemoOrchestratorService extends EventEmitter {
  private currentSession: DemoSession | null = null;
  private demoState: DemoState = {
    scenario: null,
    status: 'idle',
    currentEventIndex: 0,
    elapsedTime: 0,
    speed: 1.0,
    checkpoints: []
  };
  private eventTimer: number | null = null;
  private startTime: Date | null = null;
  private agents: Map<string, AgentStatus> = new Map();
  private messages: AgentMessage[] = [];
  private decisions: AgentDecision[] = [];
  private metrics: BusinessMetric[] = [];

  constructor() {
    super();
    this.initializeAgents();
  }

  /**
   * Initialize default agent statuses
   */
  private initializeAgents(): void {
    const defaultAgents: AgentStatus[] = [
      {
        id: 'supervisor',
        name: 'Supervisor Agent',
        type: 'supervisor',
        status: 'idle',
        performance: {
          tasksCompleted: 0,
          averageResponseTime: 0,
          successRate: 100
        },
        capabilities: ['coordination', 'task-delegation', 'decision-making', 'escalation'],
        workload: 0
      },
      {
        id: 'threat-hunter',
        name: 'Threat Hunter Agent',
        type: 'threat-hunter',
        status: 'idle',
        performance: {
          tasksCompleted: 0,
          averageResponseTime: 0,
          successRate: 100
        },
        capabilities: ['threat-detection', 'pattern-analysis', 'risk-assessment', 'proactive-hunting'],
        workload: 0
      },
      {
        id: 'incident-response',
        name: 'Incident Response Agent',
        type: 'incident-response',
        status: 'idle',
        performance: {
          tasksCompleted: 0,
          averageResponseTime: 0,
          successRate: 100
        },
        capabilities: ['containment', 'forensics', 'remediation', 'evidence-collection'],
        workload: 0
      },
      {
        id: 'financial-intelligence',
        name: 'Financial Intelligence Agent',
        type: 'financial-intelligence',
        status: 'idle',
        performance: {
          tasksCompleted: 0,
          averageResponseTime: 0,
          successRate: 100
        },
        capabilities: ['cost-analysis', 'optimization', 'roi-calculation', 'forecasting'],
        workload: 0
      },
      {
        id: 'service-orchestration',
        name: 'Service Orchestration Agent',
        type: 'service-orchestration',
        status: 'idle',
        performance: {
          tasksCompleted: 0,
          averageResponseTime: 0,
          successRate: 100
        },
        capabilities: ['workflow-management', 'automation', 'integration', 'monitoring'],
        workload: 0
      }
    ];

    defaultAgents.forEach(agent => {
      this.agents.set(agent.id, agent);
      // Initialize agent in simulator
      agentSimulator.initializeAgent(agent);
    });
  }

  /**
   * Get available demo scenarios
   */
  public getAvailableScenarios(): DemoScenario[] {
    return [
      {
        id: 'autonomous-threat-response-basic',
        type: 'autonomous-threat-response',
        name: 'Autonomous Threat Response - Basic',
        description: 'Demonstrates AI agents detecting and responding to a security threat autonomously',
        duration: 300, // 5 minutes
        difficulty: 'basic',
        targetAudience: ['executive', 'security', 'technical'],
        keyCapabilities: ['threat-detection', 'autonomous-response', 'multi-agent-coordination'],
        businessMetrics: [
          {
            id: 'response-time',
            name: 'Response Time',
            category: 'performance',
            value: 2,
            unit: 'minutes',
            trend: 'down',
            description: 'Time from threat detection to containment'
          },
          {
            id: 'cost-savings',
            name: 'Cost Savings',
            category: 'cost-savings',
            value: 50000,
            unit: 'USD',
            trend: 'up',
            description: 'Estimated cost savings vs manual response'
          }
        ],
        events: [],
        customization: {
          parameters: {
            threatType: 'apt',
            severity: 'high',
            networkSize: 'medium'
          },
          audienceSpecific: {
            executive: {
              emphasis: ['cost-savings', 'risk-reduction', 'business-continuity'],
              metrics: ['roi', 'efficiency'],
              narrative: 'Focus on business impact and competitive advantage'
            },
            technical: {
              emphasis: ['agent-coordination', 'decision-making', 'automation'],
              metrics: ['performance', 'accuracy'],
              narrative: 'Deep dive into technical capabilities and architecture'
            },
            security: {
              emphasis: ['threat-detection', 'response-speed', 'forensics'],
              metrics: ['risk-reduction', 'performance'],
              narrative: 'Highlight security effectiveness and compliance'
            },
            financial: {
              emphasis: ['cost-optimization', 'roi', 'resource-efficiency'],
              metrics: ['cost-savings', 'roi'],
              narrative: 'Demonstrate financial benefits and optimization'
            },
            operational: {
              emphasis: ['automation', 'efficiency', 'reliability'],
              metrics: ['efficiency', 'performance'],
              narrative: 'Show operational improvements and scalability'
            }
          },
          businessContext: {}
        }
      },
      {
        id: 'intelligent-cost-optimization-basic',
        type: 'intelligent-cost-optimization',
        name: 'Intelligent Cost Optimization - Basic',
        description: 'Shows AI agents identifying and implementing cost optimizations automatically',
        duration: 240, // 4 minutes
        difficulty: 'basic',
        targetAudience: ['executive', 'financial', 'operational'],
        keyCapabilities: ['cost-analysis', 'optimization-recommendations', 'automated-implementation'],
        businessMetrics: [
          {
            id: 'monthly-savings',
            name: 'Monthly Savings',
            category: 'cost-savings',
            value: 25000,
            unit: 'USD',
            trend: 'up',
            description: 'Monthly cost savings from AI optimization'
          },
          {
            id: 'roi-percentage',
            name: 'ROI',
            category: 'roi',
            value: 450,
            unit: '%',
            trend: 'up',
            description: 'Return on investment within 12 months'
          }
        ],
        events: [],
        customization: {
          parameters: {
            optimizationType: 'infrastructure',
            savingsTarget: 20,
            riskTolerance: 'medium'
          },
          audienceSpecific: {
            executive: {
              emphasis: ['roi', 'competitive-advantage', 'scalability'],
              metrics: ['roi', 'cost-savings'],
              narrative: 'Strategic value and market positioning'
            },
            financial: {
              emphasis: ['cost-reduction', 'budget-optimization', 'forecasting'],
              metrics: ['cost-savings', 'roi'],
              narrative: 'Financial impact and budget management'
            },
            operational: {
              emphasis: ['efficiency', 'automation', 'resource-optimization'],
              metrics: ['efficiency', 'performance'],
              narrative: 'Operational excellence and process improvement'
            },
            technical: {
              emphasis: ['automation', 'integration', 'monitoring'],
              metrics: ['performance', 'efficiency'],
              narrative: 'Technical implementation and capabilities'
            },
            security: {
              emphasis: ['risk-assessment', 'compliance', 'governance'],
              metrics: ['risk-reduction', 'performance'],
              narrative: 'Security and compliance considerations'
            }
          },
          businessContext: {}
        }
      }
      // Additional scenarios would be added here
    ];
  }

  /**
   * Start a demo scenario
   */
  public async startDemo(
    scenarioId: string, 
    customization?: Partial<ScenarioCustomization>,
    userId: string = 'demo-user'
  ): Promise<DemoSession> {
    if (this.currentSession && this.demoState.status === 'running') {
      throw new Error('A demo is already running. Stop the current demo before starting a new one.');
    }

    const scenario = this.getAvailableScenarios().find(s => s.id === scenarioId);
    if (!scenario) {
      throw new Error(`Scenario not found: ${scenarioId}`);
    }

    // Apply customization
    const finalScenario = {
      ...scenario,
      customization: {
        ...scenario.customization,
        ...customization
      }
    };

    // Generate demo events based on scenario type
    finalScenario.events = this.generateDemoEvents(finalScenario);

    // Create demo session
    this.currentSession = {
      id: `demo-${Date.now()}-${Math.random().toString(36).substring(2, 11)}`,
      userId,
      scenario: finalScenario,
      startTime: new Date(),
      status: 'starting',
      customization: finalScenario.customization,
      analytics: {
        engagementScore: 0,
        completionRate: 0,
        interactionCount: 0,
        timeSpent: 0,
        keyMoments: []
      }
    };

    // Reset demo state
    this.demoState = {
      scenario: finalScenario,
      status: 'starting',
      currentEventIndex: 0,
      elapsedTime: 0,
      speed: 1.0,
      checkpoints: []
    };

    // Reset agents and data
    this.resetAgents();
    this.messages = [];
    this.decisions = [];
    this.metrics = [...finalScenario.businessMetrics];

    // Create initial checkpoint
    this.createCheckpoint('Demo Started', 'Initial state at demo start');

    // Start the demo
    this.startTime = new Date();
    this.demoState.status = 'running';
    this.currentSession.status = 'running';

    // Emit start event
    this.emit('demo:started', { 
      scenario: finalScenario, 
      session: this.currentSession 
    });

    // Start event processing
    this.processNextEvent();

    return this.currentSession;
  }

  /**
   * Generate demo events based on scenario type
   */
  private generateDemoEvents(scenario: DemoScenario): DemoEvent[] {
    switch (scenario.type) {
      case 'autonomous-threat-response':
        return this.generateThreatResponseEvents(scenario);
      case 'intelligent-cost-optimization':
        return this.generateCostOptimizationEvents(scenario);
      default:
        return [];
    }
  }

  /**
   * Generate threat response demo events
   */
  private generateThreatResponseEvents(scenario: DemoScenario): DemoEvent[] {
    return [
      {
        id: 'threat-detected',
        timestamp: 5,
        type: 'system-event',
        title: 'Threat Detected',
        description: 'Suspicious network activity detected by monitoring systems',
        data: {
          threatType: 'apt',
          severity: 'high',
          sourceIP: '192.168.1.100',
          targetSystems: ['web-server-01', 'database-01']
        }
      },
      {
        id: 'threat-hunter-activated',
        timestamp: 7,
        type: 'agent-action',
        title: 'Threat Hunter Agent Activated',
        description: 'Threat Hunter Agent begins analysis of detected anomaly',
        agentId: 'threat-hunter',
        data: {
          analysisType: 'pattern-matching',
          confidence: 0.85
        },
        dependencies: ['threat-detected']
      },
      {
        id: 'threat-classified',
        timestamp: 15,
        type: 'agent-action',
        title: 'Threat Classified',
        description: 'Threat Hunter Agent classifies threat as Advanced Persistent Threat',
        agentId: 'threat-hunter',
        data: {
          classification: 'APT',
          confidence: 0.92,
          riskScore: 8.5
        },
        dependencies: ['threat-hunter-activated']
      },
      {
        id: 'supervisor-coordination',
        timestamp: 18,
        type: 'agent-action',
        title: 'Supervisor Coordinates Response',
        description: 'Supervisor Agent coordinates multi-agent response strategy',
        agentId: 'supervisor',
        data: {
          strategy: 'immediate-containment',
          assignedAgents: ['incident-response', 'threat-hunter']
        },
        dependencies: ['threat-classified']
      },
      {
        id: 'containment-initiated',
        timestamp: 25,
        type: 'agent-action',
        title: 'Containment Initiated',
        description: 'Incident Response Agent begins containment procedures',
        agentId: 'incident-response',
        data: {
          actions: ['isolate-systems', 'block-traffic', 'preserve-evidence'],
          estimatedTime: 120
        },
        dependencies: ['supervisor-coordination']
      },
      {
        id: 'threat-contained',
        timestamp: 60,
        type: 'milestone',
        title: 'Threat Successfully Contained',
        description: 'All affected systems isolated, threat neutralized',
        data: {
          containmentTime: 55,
          systemsAffected: 2,
          dataCompromised: false
        },
        dependencies: ['containment-initiated']
      },
      {
        id: 'forensics-analysis',
        timestamp: 90,
        type: 'agent-action',
        title: 'Forensics Analysis Complete',
        description: 'Detailed forensics analysis reveals attack vector and impact',
        agentId: 'incident-response',
        data: {
          attackVector: 'spear-phishing',
          impactAssessment: 'minimal',
          evidenceCollected: true
        },
        dependencies: ['threat-contained']
      },
      {
        id: 'roi-calculation',
        timestamp: 120,
        type: 'agent-action',
        title: 'ROI Impact Calculated',
        description: 'Financial Intelligence Agent calculates cost savings vs manual response',
        agentId: 'financial-intelligence',
        data: {
          manualResponseCost: 75000,
          automatedResponseCost: 1500,
          timeSaved: 240, // minutes
          costSavings: 73500
        },
        dependencies: ['forensics-analysis']
      },
      {
        id: 'demo-complete',
        timestamp: 150,
        type: 'milestone',
        title: 'Demo Complete',
        description: 'Autonomous threat response demonstration completed successfully',
        data: {
          totalTime: 150,
          agentsInvolved: 4,
          businessImpact: 'significant-cost-savings'
        },
        dependencies: ['roi-calculation']
      }
    ];
  }

  /**
   * Generate cost optimization demo events
   */
  private generateCostOptimizationEvents(scenario: DemoScenario): DemoEvent[] {
    return [
      {
        id: 'analysis-started',
        timestamp: 3,
        type: 'agent-action',
        title: 'Cost Analysis Started',
        description: 'Financial Intelligence Agent begins comprehensive cost analysis',
        agentId: 'financial-intelligence',
        data: {
          analysisScope: 'infrastructure',
          timeframe: '12-months',
          dataPoints: 15000
        }
      },
      {
        id: 'opportunities-identified',
        timestamp: 20,
        type: 'agent-action',
        title: 'Optimization Opportunities Identified',
        description: 'Multiple cost optimization opportunities discovered',
        agentId: 'financial-intelligence',
        data: {
          opportunities: [
            { type: 'resource-rightsizing', savings: 15000, confidence: 0.95 },
            { type: 'unused-resources', savings: 8000, confidence: 0.98 },
            { type: 'scheduling-optimization', savings: 5000, confidence: 0.87 }
          ],
          totalSavings: 28000
        },
        dependencies: ['analysis-started']
      },
      {
        id: 'risk-assessment',
        timestamp: 35,
        type: 'agent-action',
        title: 'Risk Assessment Complete',
        description: 'Supervisor Agent assesses implementation risks',
        agentId: 'supervisor',
        data: {
          riskLevel: 'low',
          mitigationStrategies: ['gradual-rollout', 'monitoring', 'rollback-plan'],
          approvalRequired: false
        },
        dependencies: ['opportunities-identified']
      },
      {
        id: 'implementation-started',
        timestamp: 45,
        type: 'agent-action',
        title: 'Implementation Started',
        description: 'Service Orchestration Agent begins implementing optimizations',
        agentId: 'service-orchestration',
        data: {
          phase: 'resource-rightsizing',
          estimatedDuration: 60,
          systemsAffected: 12
        },
        dependencies: ['risk-assessment']
      },
      {
        id: 'optimization-complete',
        timestamp: 120,
        type: 'milestone',
        title: 'Optimization Implementation Complete',
        description: 'All cost optimizations successfully implemented',
        data: {
          implementationTime: 75,
          actualSavings: 26500,
          efficiencyGain: 0.23
        },
        dependencies: ['implementation-started']
      },
      {
        id: 'roi-projection',
        timestamp: 140,
        type: 'agent-action',
        title: 'ROI Projection Generated',
        description: 'Financial Intelligence Agent projects long-term ROI',
        agentId: 'financial-intelligence',
        data: {
          monthlyRecurringSavings: 26500,
          annualSavings: 318000,
          roi: 450, // percentage
          paybackPeriod: 2.1 // months
        },
        dependencies: ['optimization-complete']
      },
      {
        id: 'demo-complete',
        timestamp: 160,
        type: 'milestone',
        title: 'Demo Complete',
        description: 'Cost optimization demonstration completed successfully',
        data: {
          totalTime: 160,
          savingsAchieved: 26500,
          roiDemonstrated: 450
        },
        dependencies: ['roi-projection']
      }
    ];
  }

  /**
   * Process the next event in the demo sequence
   */
  private processNextEvent(): void {
    if (!this.currentSession || this.demoState.status !== 'running') {
      return;
    }

    const scenario = this.demoState.scenario;
    if (!scenario || this.demoState.currentEventIndex >= scenario.events.length) {
      this.completeDemo();
      return;
    }

    const currentEvent = scenario.events[this.demoState.currentEventIndex];
    const timeUntilEvent = (currentEvent.timestamp - this.demoState.elapsedTime) * 1000 / this.demoState.speed;

    if (timeUntilEvent <= 0) {
      // Execute the event immediately
      this.executeEvent(currentEvent);
      this.demoState.currentEventIndex++;
      this.processNextEvent();
    } else {
      // Schedule the event
      this.eventTimer = window.setTimeout(() => {
        this.executeEvent(currentEvent);
        this.demoState.currentEventIndex++;
        this.processNextEvent();
      }, timeUntilEvent);
    }
  }

  /**
   * Execute a demo event
   */
  private executeEvent(event: DemoEvent): void {
    if (!this.currentSession) return;

    // Update elapsed time
    this.demoState.elapsedTime = event.timestamp;

    // Process event based on type
    switch (event.type) {
      case 'agent-action':
        this.processAgentAction(event);
        break;
      case 'system-event':
        this.processSystemEvent(event);
        break;
      case 'milestone':
        this.processMilestone(event);
        break;
    }

    // Emit event
    this.emit('demo:event', { 
      session: this.currentSession, 
      event 
    });

    // Update analytics
    this.currentSession.analytics.interactionCount++;
    this.currentSession.analytics.keyMoments.push({
      eventId: event.id,
      timestamp: event.timestamp,
      userAction: 'event-observed'
    });
  }

  /**
   * Process agent action event
   */
  private processAgentAction(event: DemoEvent): void {
    if (!event.agentId) return;

    const agent = this.agents.get(event.agentId);
    if (!agent) return;

    // Update agent status
    agent.status = 'active';
    agent.currentTask = event.title;
    agent.workload = Math.min(100, agent.workload + 20);
    agent.performance.tasksCompleted++;

    // Trigger agent simulator behavior
    agentSimulator.simulateAgentBehavior(event.agentId, event.type, event.data);

    // Create agent decision if applicable
    if (event.data.confidence) {
      const decision: AgentDecision = {
        id: `decision-${Date.now()}`,
        agentId: event.agentId,
        timestamp: new Date(),
        context: event.description,
        options: [
          {
            id: 'selected',
            description: event.title,
            confidence: event.data.confidence,
            risk: event.data.riskScore || 0.3,
            impact: event.data.impact || 'positive'
          }
        ],
        selectedOption: 'selected',
        reasoning: event.description,
        confidence: event.data.confidence
      };
      this.decisions.push(decision);
      
      this.emit('agent:decision', { 
        session: this.currentSession!, 
        decision 
      });
    }

    // Emit agent action
    this.emit('agent:action', { 
      session: this.currentSession!, 
      agent, 
      action: event.title 
    });
  }

  /**
   * Process system event
   */
  private processSystemEvent(event: DemoEvent): void {
    // System events typically trigger agent responses
    // Update relevant metrics or system state
    if (event.data.threatType) {
      // Update security metrics
      this.updateMetric('threats-detected', 1);
    }
  }

  /**
   * Process milestone event
   */
  private processMilestone(event: DemoEvent): void {
    // Create checkpoint for milestone
    this.createCheckpoint(event.title, event.description);
    
    // Update completion metrics
    if (event.data.costSavings) {
      this.updateMetric('cost-savings', event.data.costSavings);
    }
    if (event.data.roi) {
      this.updateMetric('roi-percentage', event.data.roi);
    }
  }

  /**
   * Update a business metric
   */
  private updateMetric(metricId: string, value: number): void {
    const metric = this.metrics.find(m => m.id === metricId);
    if (metric) {
      metric.value = value;
      this.emit('metrics:updated', { 
        session: this.currentSession!, 
        metrics: this.metrics 
      });
    }
  }

  /**
   * Create a checkpoint
   */
  private createCheckpoint(title: string, description: string): void {
    const checkpoint: DemoCheckpoint = {
      id: `checkpoint-${Date.now()}`,
      timestamp: this.demoState.elapsedTime,
      eventIndex: this.demoState.currentEventIndex,
      state: {
        agents: Array.from(this.agents.values()),
        messages: [...this.messages],
        decisions: [...this.decisions],
        metrics: [...this.metrics]
      },
      description: `${title}: ${description}`
    };

    this.demoState.checkpoints.push(checkpoint);
    
    this.emit('demo:checkpoint', { 
      session: this.currentSession!, 
      checkpoint 
    });
  }

  /**
   * Complete the demo
   */
  private completeDemo(): void {
    if (!this.currentSession) return;

    this.demoState.status = 'completed';
    this.currentSession.status = 'completed';
    this.currentSession.endTime = new Date();

    // Calculate final analytics
    const totalTime = this.currentSession.endTime.getTime() - this.currentSession.startTime.getTime();
    this.currentSession.analytics.timeSpent = totalTime / 1000;
    this.currentSession.analytics.completionRate = 100;
    this.currentSession.analytics.engagementScore = Math.min(100, 
      (this.currentSession.analytics.interactionCount / this.demoState.scenario!.events.length) * 100
    );

    // Reset agent statuses
    this.resetAgents();

    this.emit('demo:completed', { 
      session: this.currentSession, 
      analytics: this.currentSession.analytics 
    });
  }

  /**
   * Reset all agents to idle state
   */
  private resetAgents(): void {
    this.agents.forEach(agent => {
      agent.status = 'idle';
      agent.currentTask = undefined;
      agent.workload = 0;
    });
    
    // Reset agent simulator
    agentSimulator.cleanup();
  }

  /**
   * Get demo controls
   */
  public getControls(): DemoControls {
    return {
      start: async () => {
        throw new Error('Use startDemo() method instead');
      },
      pause: async () => {
        if (this.demoState.status === 'running') {
          this.demoState.status = 'paused';
          if (this.currentSession) {
            this.currentSession.status = 'paused';
          }
          if (this.eventTimer) {
            window.clearTimeout(this.eventTimer);
            this.eventTimer = null;
          }
          this.emit('demo:paused', { session: this.currentSession! });
        }
      },
      resume: async () => {
        if (this.demoState.status === 'paused') {
          this.demoState.status = 'running';
          if (this.currentSession) {
            this.currentSession.status = 'running';
          }
          this.processNextEvent();
          this.emit('demo:resumed', { session: this.currentSession! });
        }
      },
      reset: async () => {
        if (this.eventTimer) {
          window.clearTimeout(this.eventTimer);
          this.eventTimer = null;
        }
        this.demoState = {
          scenario: null,
          status: 'idle',
          currentEventIndex: 0,
          elapsedTime: 0,
          speed: 1.0,
          checkpoints: []
        };
        this.currentSession = null;
        this.resetAgents();
        this.messages = [];
        this.decisions = [];
        this.metrics = [];
      },
stop: async () => {
        if (this.eventTimer) {
          window.clearTimeout(this.eventTimer);
          this.eventTimer = null;
        }
        const reason = 'User stopped demo';
        this.demoState.status = 'idle';
        if (this.currentSession) {
          this.currentSession.status = 'completed';
          this.currentSession.endTime = new Date();
        }
        this.emit('demo:stopped', { session: this.currentSession!, reason });
        this.resetAgents();
      },
      setSpeed: (speed: number) => {
        this.demoState.speed = Math.max(0.1, Math.min(5.0, speed));
      },
      jumpToEvent: async (eventId: string) => {
        if (!this.demoState.scenario) return;
        
        const eventIndex = this.demoState.scenario.events.findIndex(e => e.id === eventId);
        if (eventIndex >= 0) {
          this.demoState.currentEventIndex = eventIndex;
          this.demoState.elapsedTime = this.demoState.scenario.events[eventIndex].timestamp;
          
          if (this.demoState.status === 'running') {
            if (this.eventTimer) {
              window.clearTimeout(this.eventTimer);
            }
            this.processNextEvent();
          }
        }
      }
    };
  }

  /**
   * Get current demo state
   */
  public getDemoState(): DemoState {
    return { ...this.demoState };
  }

  /**
   * Get current session
   */
  public getCurrentSession(): DemoSession | null {
    return this.currentSession;
  }

  /**
   * Get current agents
   */
  public getAgents(): AgentStatus[] {
    return Array.from(this.agents.values());
  }

  /**
   * Get agent messages
   */
  public getMessages(): AgentMessage[] {
    // Combine orchestrator messages with simulator messages
    const simulatorMessages = agentSimulator.getMessageQueue();
    return [...this.messages, ...simulatorMessages];
  }

  /**
   * Get agent decisions
   */
  public getDecisions(): AgentDecision[] {
    // Combine orchestrator decisions with simulator decisions
    const simulatorDecisions = agentSimulator.getDecisionQueue();
    return [...this.decisions, ...simulatorDecisions];
  }

  /**
   * Get current metrics
   */
  public getMetrics(): BusinessMetric[] {
    return [...this.metrics];
  }
}

// Export singleton instance
export const demoOrchestrator = new DemoOrchestratorService();
export default demoOrchestrator;