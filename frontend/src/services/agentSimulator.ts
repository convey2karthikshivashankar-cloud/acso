/**
 * Agent Simulation Framework
 * 
 * Provides realistic agent behavior simulation with decision-making logic,
 * inter-agent communication, and performance modeling for demo scenarios.
 */

import {
  AgentStatus,
  AgentMessage,
  AgentDecision,
  AgentPerformanceMetrics,
  DemoEvent,
  DemoSession
} from '../types/demo';
import { DEMO_CONFIG } from '../config/demoConfig';

// Agent behavior patterns
interface AgentBehaviorPattern {
  id: string;
  name: string;
  triggers: string[];
  actions: AgentAction[];
  probability: number;
  cooldown: number; // milliseconds
}

interface AgentAction {
  type: 'message' | 'decision' | 'task' | 'escalation';
  target?: string; // agent ID for messages
  content: string;
  duration: number; // milliseconds
  confidence: number;
  impact: 'low' | 'medium' | 'high' | 'critical';
}

interface AgentPersonality {
  decisionSpeed: number; // 0.1 to 2.0 multiplier
  riskTolerance: number; // 0.0 to 1.0
  collaborationStyle: 'proactive' | 'reactive' | 'analytical';
  communicationFrequency: number; // messages per minute
  learningRate: number; // how quickly agent adapts
}

interface AgentMemory {
  recentEvents: DemoEvent[];
  pastDecisions: AgentDecision[];
  performanceHistory: number[];
  collaborationHistory: Map<string, number>; // agent ID -> success rate
}

class AgentSimulator {
  private agents: Map<string, AgentStatus> = new Map();
  private agentPersonalities: Map<string, AgentPersonality> = new Map();
  private agentMemories: Map<string, AgentMemory> = new Map();
  private behaviorPatterns: Map<string, AgentBehaviorPattern[]> = new Map();
  private activeTimers: Map<string, number> = new Map();
  private messageQueue: AgentMessage[] = [];
  private decisionQueue: AgentDecision[] = [];
  
  constructor() {
    this.initializeBehaviorPatterns();
  }

  /**
   * Initialize behavior patterns for different agent types
   */
  private initializeBehaviorPatterns(): void {
    // Threat Hunter Agent Patterns
    this.behaviorPatterns.set('threat-hunter', [
      {
        id: 'proactive-scan',
        name: 'Proactive Threat Scanning',
        triggers: ['system-idle', 'scheduled-scan'],
        actions: [
          {
            type: 'task',
            content: 'Initiating proactive threat scan across network endpoints',
            duration: 15000,
            confidence: 0.9,
            impact: 'medium'
          }
        ],
        probability: 0.8,
        cooldown: 30000
      },
      {
        id: 'threat-analysis',
        name: 'Threat Pattern Analysis',
        triggers: ['anomaly-detected', 'threat-indicator'],
        actions: [
          {
            type: 'decision',
            content: 'Analyzing threat patterns and determining risk level',
            duration: 8000,
            confidence: 0.85,
            impact: 'high'
          },
          {
            type: 'message',
            target: 'supervisor',
            content: 'Threat analysis complete. Confidence level: HIGH. Recommend immediate containment.',
            duration: 2000,
            confidence: 0.92,
            impact: 'critical'
          }
        ],
        probability: 0.95,
        cooldown: 5000
      }
    ]);

    // Incident Response Agent Patterns
    this.behaviorPatterns.set('incident-response', [
      {
        id: 'containment-protocol',
        name: 'Automated Containment',
        triggers: ['threat-confirmed', 'escalation-received'],
        actions: [
          {
            type: 'task',
            content: 'Executing containment protocol: isolating affected systems',
            duration: 12000,
            confidence: 0.88,
            impact: 'critical'
          },
          {
            type: 'message',
            target: 'threat-hunter',
            content: 'Containment in progress. Need forensic analysis on isolated systems.',
            duration: 3000,
            confidence: 0.9,
            impact: 'high'
          }
        ],
        probability: 0.98,
        cooldown: 10000
      },
      {
        id: 'evidence-collection',
        name: 'Digital Forensics',
        triggers: ['containment-complete', 'forensics-request'],
        actions: [
          {
            type: 'task',
            content: 'Collecting digital evidence and preserving attack artifacts',
            duration: 20000,
            confidence: 0.95,
            impact: 'medium'
          }
        ],
        probability: 0.9,
        cooldown: 15000
      }
    ]);

    // Financial Intelligence Agent Patterns
    this.behaviorPatterns.set('financial-intelligence', [
      {
        id: 'cost-analysis',
        name: 'Real-time Cost Analysis',
        triggers: ['spending-anomaly', 'optimization-request'],
        actions: [
          {
            type: 'decision',
            content: 'Analyzing spending patterns and identifying optimization opportunities',
            duration: 10000,
            confidence: 0.87,
            impact: 'medium'
          },
          {
            type: 'message',
            target: 'supervisor',
            content: 'Cost optimization opportunities identified. Projected savings: $25,000/month',
            duration: 2500,
            confidence: 0.91,
            impact: 'high'
          }
        ],
        probability: 0.85,
        cooldown: 20000
      }
    ]);

    // Supervisor Agent Patterns
    this.behaviorPatterns.set('supervisor', [
      {
        id: 'coordination',
        name: 'Multi-Agent Coordination',
        triggers: ['complex-incident', 'resource-conflict'],
        actions: [
          {
            type: 'decision',
            content: 'Coordinating multi-agent response and resource allocation',
            duration: 5000,
            confidence: 0.93,
            impact: 'critical'
          },
          {
            type: 'message',
            target: 'incident-response',
            content: 'Priority assignment: CRITICAL. Allocating additional resources.',
            duration: 2000,
            confidence: 0.95,
            impact: 'critical'
          }
        ],
        probability: 0.92,
        cooldown: 8000
      }
    ]);

    // Service Orchestration Agent Patterns
    this.behaviorPatterns.set('service-orchestration', [
      {
        id: 'workflow-optimization',
        name: 'Workflow Optimization',
        triggers: ['efficiency-review', 'bottleneck-detected'],
        actions: [
          {
            type: 'task',
            content: 'Optimizing workflow processes and eliminating bottlenecks',
            duration: 15000,
            confidence: 0.84,
            impact: 'medium'
          }
        ],
        probability: 0.78,
        cooldown: 25000
      }
    ]);
  }

  /**
   * Initialize agent with personality and memory
   */
  public initializeAgent(agent: AgentStatus): void {
    this.agents.set(agent.id, agent);
    
    // Generate personality based on agent type
    const personality = this.generateAgentPersonality(agent.type);
    this.agentPersonalities.set(agent.id, personality);
    
    // Initialize memory
    const memory: AgentMemory = {
      recentEvents: [],
      pastDecisions: [],
      performanceHistory: [100], // Start with 100% performance
      collaborationHistory: new Map()
    };
    this.agentMemories.set(agent.id, memory);
  }

  /**
   * Generate personality traits for an agent based on type
   */
  private generateAgentPersonality(agentType: string): AgentPersonality {
    const basePersonalities: Record<string, Partial<AgentPersonality>> = {
      'threat-hunter': {
        decisionSpeed: 1.2,
        riskTolerance: 0.3,
        collaborationStyle: 'proactive',
        communicationFrequency: 8,
        learningRate: 0.85
      },
      'incident-response': {
        decisionSpeed: 1.8,
        riskTolerance: 0.2,
        collaborationStyle: 'reactive',
        communicationFrequency: 12,
        learningRate: 0.9
      },
      'financial-intelligence': {
        decisionSpeed: 0.8,
        riskTolerance: 0.6,
        collaborationStyle: 'analytical',
        communicationFrequency: 4,
        learningRate: 0.75
      },
      'supervisor': {
        decisionSpeed: 1.0,
        riskTolerance: 0.4,
        collaborationStyle: 'proactive',
        communicationFrequency: 15,
        learningRate: 0.95
      },
      'service-orchestration': {
        decisionSpeed: 1.1,
        riskTolerance: 0.5,
        collaborationStyle: 'analytical',
        communicationFrequency: 6,
        learningRate: 0.8
      }
    };

    const base = basePersonalities[agentType] || {};
    
    return {
      decisionSpeed: base.decisionSpeed || 1.0,
      riskTolerance: base.riskTolerance || 0.5,
      collaborationStyle: base.collaborationStyle || 'reactive',
      communicationFrequency: base.communicationFrequency || 5,
      learningRate: base.learningRate || 0.8
    };
  }

  /**
   * Simulate agent behavior based on triggers and events
   */
  public simulateAgentBehavior(
    agentId: string, 
    trigger: string, 
    context?: any
  ): void {
    const agent = this.agents.get(agentId);
    const personality = this.agentPersonalities.get(agentId);
    const patterns = this.behaviorPatterns.get(agent?.type || '');
    
    if (!agent || !personality || !patterns) return;

    // Find matching behavior patterns
    const matchingPatterns = patterns.filter(pattern => 
      pattern.triggers.includes(trigger)
    );

    matchingPatterns.forEach(pattern => {
      // Check probability and cooldown
      if (Math.random() < pattern.probability && !this.isOnCooldown(agentId, pattern.id)) {
        this.executeAgentActions(agentId, pattern.actions, personality);
        this.setCooldown(agentId, pattern.id, pattern.cooldown);
      }
    });
  }

  /**
   * Execute agent actions with realistic timing and behavior
   */
  private executeAgentActions(
    agentId: string, 
    actions: AgentAction[], 
    personality: AgentPersonality
  ): void {
    let delay = 0;

    actions.forEach((action, index) => {
      const adjustedDelay = delay + (action.duration * (2 - personality.decisionSpeed));
      
      const timer = window.setTimeout(() => {
        this.executeAction(agentId, action, personality);
      }, adjustedDelay);

      this.activeTimers.set(`${agentId}-${index}`, timer);
      delay = adjustedDelay;
    });
  }

  /**
   * Execute a single agent action
   */
  private executeAction(
    agentId: string, 
    action: AgentAction, 
    personality: AgentPersonality
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Update agent status
    agent.status = 'active';
    agent.currentTask = action.content;
    agent.workload = Math.min(100, agent.workload + 15);

    switch (action.type) {
      case 'message':
        this.createAgentMessage(agentId, action, personality);
        break;
      case 'decision':
        this.createAgentDecision(agentId, action, personality);
        break;
      case 'task':
        this.executeAgentTask(agentId, action, personality);
        break;
      case 'escalation':
        this.handleEscalation(agentId, action, personality);
        break;
    }

    // Update performance metrics
    this.updateAgentPerformance(agentId, action);
  }

  /**
   * Create an agent message
   */
  private createAgentMessage(
    fromAgentId: string, 
    action: AgentAction, 
    personality: AgentPersonality
  ): void {
    const message: AgentMessage = {
      id: `msg-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      fromAgent: fromAgentId,
      toAgent: action.target || 'supervisor',
      timestamp: new Date(),
      type: this.determineMessageType(action.impact),
      content: action.content,
      data: {
        confidence: action.confidence,
        impact: action.impact,
        personality: personality.collaborationStyle
      },
      priority: this.mapImpactToPriority(action.impact)
    };

    this.messageQueue.push(message);
    
    // Simulate message processing delay
    window.setTimeout(() => {
      this.processMessage(message);
    }, 500 + Math.random() * 1000);
  }

  /**
   * Create an agent decision
   */
  private createAgentDecision(
    agentId: string, 
    action: AgentAction, 
    personality: AgentPersonality
  ): void {
    const decision: AgentDecision = {
      id: `decision-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`,
      agentId,
      timestamp: new Date(),
      context: action.content,
      options: this.generateDecisionOptions(action, personality),
      selectedOption: 'primary',
      reasoning: this.generateDecisionReasoning(action, personality),
      confidence: this.adjustConfidenceByPersonality(action.confidence, personality)
    };

    this.decisionQueue.push(decision);
    
    // Update agent memory
    const memory = this.agentMemories.get(agentId);
    if (memory) {
      memory.pastDecisions.push(decision);
      if (memory.pastDecisions.length > 10) {
        memory.pastDecisions.shift();
      }
    }
  }

  /**
   * Execute an agent task
   */
  private executeAgentTask(
    agentId: string, 
    action: AgentAction, 
    personality: AgentPersonality
  ): void {
    const agent = this.agents.get(agentId);
    if (!agent) return;

    // Simulate task execution
    agent.performance.tasksCompleted++;
    agent.performance.averageResponseTime = this.calculateAverageResponseTime(
      agent.performance.averageResponseTime,
      action.duration * (2 - personality.decisionSpeed)
    );

    // Task completion callback
    window.setTimeout(() => {
      agent.status = 'idle';
      agent.currentTask = undefined;
      agent.workload = Math.max(0, agent.workload - 20);
    }, action.duration);
  }

  /**
   * Handle escalation
   */
  private handleEscalation(
    agentId: string, 
    action: AgentAction, 
    personality: AgentPersonality
  ): void {
    // Create escalation message to supervisor
    this.createAgentMessage(agentId, {
      ...action,
      type: 'message',
      target: 'supervisor'
    }, personality);
  }

  /**
   * Process inter-agent message
   */
  private processMessage(message: AgentMessage): void {
    const targetAgent = this.agents.get(message.toAgent);
    if (!targetAgent) return;

    // Simulate message processing and potential response
    const shouldRespond = Math.random() < 0.7; // 70% chance of response
    
    if (shouldRespond) {
      window.setTimeout(() => {
        this.simulateAgentBehavior(
          message.toAgent, 
          'message-received', 
          { originalMessage: message }
        );
      }, 1000 + Math.random() * 3000);
    }
  }

  /**
   * Update agent performance metrics
   */
  private updateAgentPerformance(agentId: string, action: AgentAction): void {
    const agent = this.agents.get(agentId);
    const memory = this.agentMemories.get(agentId);
    
    if (!agent || !memory) return;

    // Calculate performance score based on action success
    const performanceScore = this.calculatePerformanceScore(action);
    memory.performanceHistory.push(performanceScore);
    
    if (memory.performanceHistory.length > 20) {
      memory.performanceHistory.shift();
    }

    // Update success rate
    const averagePerformance = memory.performanceHistory.reduce((a, b) => a + b, 0) / memory.performanceHistory.length;
    agent.performance.successRate = Math.round(averagePerformance);
  }

  /**
   * Generate decision options based on action and personality
   */
  private generateDecisionOptions(
    action: AgentAction, 
    personality: AgentPersonality
  ): AgentDecision['options'] {
    const baseOptions = [
      {
        id: 'primary',
        description: action.content,
        confidence: action.confidence,
        risk: this.calculateRisk(action.impact, personality.riskTolerance),
        impact: action.impact
      }
    ];

    // Add alternative options based on personality
    if (personality.collaborationStyle === 'analytical') {
      baseOptions.push({
        id: 'alternative',
        description: 'Conduct additional analysis before proceeding',
        confidence: action.confidence * 0.8,
        risk: this.calculateRisk(action.impact, personality.riskTolerance) * 0.6,
        impact: action.impact
      });
    }

    return baseOptions;
  }

  /**
   * Generate decision reasoning
   */
  private generateDecisionReasoning(
    action: AgentAction, 
    personality: AgentPersonality
  ): string {
    const reasoningTemplates = {
      'proactive': 'Based on proactive analysis and current threat landscape',
      'reactive': 'In response to immediate indicators and established protocols',
      'analytical': 'Following comprehensive data analysis and risk assessment'
    };

    return reasoningTemplates[personality.collaborationStyle] + '. ' + 
           `Confidence level: ${Math.round(action.confidence * 100)}%`;
  }

  /**
   * Utility methods
   */
  private isOnCooldown(agentId: string, patternId: string): boolean {
    // Implementation for cooldown tracking
    return false; // Simplified for demo
  }

  private setCooldown(agentId: string, patternId: string, duration: number): void {
    // Implementation for setting cooldown
  }

  private determineMessageType(impact: string): AgentMessage['type'] {
    switch (impact) {
      case 'critical': return 'coordination';
      case 'high': return 'request';
      case 'medium': return 'notification';
      default: return 'response';
    }
  }

  private mapImpactToPriority(impact: string): AgentMessage['priority'] {
    switch (impact) {
      case 'critical': return 'critical';
      case 'high': return 'high';
      case 'medium': return 'medium';
      default: return 'low';
    }
  }

  private adjustConfidenceByPersonality(
    baseConfidence: number, 
    personality: AgentPersonality
  ): number {
    // Analytical agents are more conservative with confidence
    if (personality.collaborationStyle === 'analytical') {
      return baseConfidence * 0.9;
    }
    return baseConfidence;
  }

  private calculateAverageResponseTime(current: number, newTime: number): number {
    return (current + newTime) / 2;
  }

  private calculatePerformanceScore(action: AgentAction): number {
    // Base score with some randomness to simulate real-world variance
    const baseScore = 85 + Math.random() * 15;
    
    // Adjust based on action impact
    const impactMultiplier = {
      'low': 0.95,
      'medium': 1.0,
      'high': 1.05,
      'critical': 1.1
    }[action.impact] || 1.0;

    return Math.min(100, baseScore * impactMultiplier);
  }

  private calculateRisk(impact: string, riskTolerance: number): number {
    const baseRisk = {
      'low': 0.2,
      'medium': 0.4,
      'high': 0.7,
      'critical': 0.9
    }[impact] || 0.5;

    return baseRisk * (1 - riskTolerance * 0.3);
  }

  /**
   * Public methods for demo orchestrator integration
   */
  public getMessageQueue(): AgentMessage[] {
    return [...this.messageQueue];
  }

  public getDecisionQueue(): AgentDecision[] {
    return [...this.decisionQueue];
  }

  public clearQueues(): void {
    this.messageQueue = [];
    this.decisionQueue = [];
  }

  public getAgentMemory(agentId: string): AgentMemory | undefined {
    return this.agentMemories.get(agentId);
  }

  public cleanup(): void {
    // Clear all active timers
    this.activeTimers.forEach(timer => window.clearTimeout(timer));
    this.activeTimers.clear();
    
    // Clear queues
    this.clearQueues();
    
    // Reset agent states
    this.agents.forEach(agent => {
      agent.status = 'idle';
      agent.currentTask = undefined;
      agent.workload = 0;
    });
  }
}

// Export singleton instance
export const agentSimulator = new AgentSimulator();
export default agentSimulator;