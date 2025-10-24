/**
 * Real-Time Visualization Engine
 * 
 * Provides responsive visualization components for agent activity monitoring,
 * multi-layer displays, and interactive elements with smooth animations.
 */

import {
  AgentStatus,
  AgentMessage,
  AgentDecision,
  AgentTopology,
  MessageFlowVisualization,
  DecisionVisualization,
  BusinessMetric
} from '../types/demo';
import { DEMO_CONFIG } from '../config/demoConfig';

// Visualization layer types
export type VisualizationLayer = 'overview' | 'detailed' | 'technical' | 'business';

// Animation configuration
interface AnimationConfig {
  duration: number;
  easing: string;
  delay?: number;
}

// Visualization node for network displays
export interface VisualizationNode {
  id: string;
  x: number;
  y: number;
  radius: number;
  color: string;
  label: string;
  status: 'active' | 'idle' | 'busy' | 'error';
  data: any;
  connections: string[];
}

// Visualization edge for connections
export interface VisualizationEdge {
  id: string;
  source: string;
  target: string;
  strength: number;
  color: string;
  animated: boolean;
  data: any;
}

// Real-time data point
export interface DataPoint {
  timestamp: Date;
  value: number;
  label?: string;
  metadata?: any;
}

// Visualization update event
export interface VisualizationUpdate {
  type: 'node' | 'edge' | 'data' | 'layout';
  target: string;
  changes: any;
  animation?: AnimationConfig;
}

class VisualizationEngine {
  private updateCallbacks: Map<string, Function[]> = new Map();
  private animationFrameId: number | null = null;
  private isAnimating: boolean = false;
  private dataStreams: Map<string, DataPoint[]> = new Map();
  private visualizationStates: Map<string, any> = new Map();

  constructor() {
    this.startAnimationLoop();
  }

  /**
   * Start the animation loop for smooth real-time updates
   */
  private startAnimationLoop(): void {
    const animate = () => {
      if (this.isAnimating) {
        this.processAnimationFrame();
      }
      this.animationFrameId = requestAnimationFrame(animate);
    };
    animate();
  }

  /**
   * Process animation frame updates
   */
  private processAnimationFrame(): void {
    // Update all active visualizations
    this.updateCallbacks.forEach((callbacks, visualizationId) => {
      callbacks.forEach(callback => {
        try {
          callback();
        } catch (error) {
          console.error(`Animation callback error for ${visualizationId}:`, error);
        }
      });
    });
  }

  /**
   * Register a visualization for real-time updates
   */
  public registerVisualization(
    id: string, 
    updateCallback: Function
  ): () => void {
    if (!this.updateCallbacks.has(id)) {
      this.updateCallbacks.set(id, []);
    }
    
    this.updateCallbacks.get(id)!.push(updateCallback);
    this.isAnimating = true;

    // Return cleanup function
    return () => {
      const callbacks = this.updateCallbacks.get(id);
      if (callbacks) {
        const index = callbacks.indexOf(updateCallback);
        if (index > -1) {
          callbacks.splice(index, 1);
        }
        if (callbacks.length === 0) {
          this.updateCallbacks.delete(id);
        }
      }
      
      if (this.updateCallbacks.size === 0) {
        this.isAnimating = false;
      }
    };
  }

  /**
   * Create agent topology visualization data
   */
  public createAgentTopology(agents: AgentStatus[]): AgentTopology {
    const nodes = agents.map((agent, index) => {
      const angle = (index / agents.length) * 2 * Math.PI;
      const radius = 150;
      const centerX = 200;
      const centerY = 150;
      
      return {
        id: agent.id,
        name: agent.name,
        type: agent.type,
        position: {
          x: centerX + Math.cos(angle) * radius,
          y: centerY + Math.sin(angle) * radius
        },
        status: agent.status
      };
    });

    const edges = this.generateAgentConnections(agents);

    return { nodes, edges };
  }

  /**
   * Generate connections between agents based on their interactions
   */
  private generateAgentConnections(agents: AgentStatus[]): AgentTopology['edges'] {
    const edges: AgentTopology['edges'] = [];
    
    // Create connections based on agent types and collaboration patterns
    agents.forEach(agent => {
      if (agent.type === 'supervisor') {
        // Supervisor connects to all other agents
        agents.forEach(otherAgent => {
          if (otherAgent.id !== agent.id) {
            edges.push({
              id: `${agent.id}-${otherAgent.id}`,
              source: agent.id,
              target: otherAgent.id,
              type: 'coordination',
              strength: 0.8,
              active: agent.status === 'active' || otherAgent.status === 'active'
            });
          }
        });
      } else if (agent.type === 'threat-hunter') {
        // Threat hunter connects to incident response
        const incidentAgent = agents.find(a => a.type === 'incident-response');
        if (incidentAgent) {
          edges.push({
            id: `${agent.id}-${incidentAgent.id}`,
            source: agent.id,
            target: incidentAgent.id,
            type: 'communication',
            strength: 0.9,
            active: agent.status === 'active' && incidentAgent.status === 'active'
          });
        }
      }
    });

    return edges;
  }

  /**
   * Create message flow visualization
   */
  public createMessageFlowVisualization(
    messages: AgentMessage[]
  ): MessageFlowVisualization {
    const recentMessages = messages.slice(-20); // Last 20 messages
    
    const messageFlows = recentMessages.map(message => ({
      id: message.id,
      path: [message.fromAgent, message.toAgent],
      timestamp: message.timestamp,
      type: message.type,
      active: this.isRecentMessage(message.timestamp)
    }));

    const throughput = this.calculateMessageThroughput(messages);

    return {
      messages: messageFlows,
      throughput
    };
  }

  /**
   * Check if a message is recent (within last 30 seconds)
   */
  private isRecentMessage(timestamp: Date): boolean {
    const now = new Date();
    const thirtySecondsAgo = new Date(now.getTime() - 30000);
    return timestamp > thirtySecondsAgo;
  }

  /**
   * Calculate message throughput over time
   */
  private calculateMessageThroughput(messages: AgentMessage[]): { timestamp: Date; count: number }[] {
    const throughput: { timestamp: Date; count: number }[] = [];
    const now = new Date();
    
    // Calculate throughput for last 10 minutes in 30-second intervals
    for (let i = 0; i < 20; i++) {
      const intervalStart = new Date(now.getTime() - (i + 1) * 30000);
      const intervalEnd = new Date(now.getTime() - i * 30000);
      
      const count = messages.filter(msg => 
        msg.timestamp >= intervalStart && msg.timestamp < intervalEnd
      ).length;
      
      throughput.unshift({
        timestamp: intervalEnd,
        count
      });
    }
    
    return throughput;
  }

  /**
   * Create decision visualization
   */
  public createDecisionVisualization(
    decisions: AgentDecision[]
  ): DecisionVisualization {
    const recentDecisions = decisions.slice(-15); // Last 15 decisions
    
    const decisionData = recentDecisions.map(decision => ({
      id: decision.id,
      agentId: decision.agentId,
      timestamp: decision.timestamp,
      confidence: decision.confidence,
      impact: decision.selectedOption ? 
        decision.options.find(opt => opt.id === decision.selectedOption)?.impact || 'medium' : 
        'medium',
      reasoning: decision.reasoning.split('.').slice(0, 2) // First 2 sentences
    }));

    const decisionTree = this.buildDecisionTree(recentDecisions);

    return {
      decisions: decisionData,
      decisionTree
    };
  }

  /**
   * Build decision tree structure
   */
  private buildDecisionTree(decisions: AgentDecision[]): DecisionVisualization['decisionTree'] {
    return decisions.map((decision, index) => ({
      nodeId: decision.id,
      parentId: index > 0 ? decisions[index - 1].id : undefined,
      decision: decision.context.substring(0, 50) + '...',
      outcome: decision.outcome?.success ? 'success' : 'pending',
      confidence: decision.confidence
    }));
  }

  /**
   * Add data point to a stream
   */
  public addDataPoint(streamId: string, dataPoint: DataPoint): void {
    if (!this.dataStreams.has(streamId)) {
      this.dataStreams.set(streamId, []);
    }
    
    const stream = this.dataStreams.get(streamId)!;
    stream.push(dataPoint);
    
    // Keep only last 100 points for performance
    if (stream.length > 100) {
      stream.shift();
    }
    
    // Trigger updates for this stream
    this.triggerUpdate(streamId, 'data', dataPoint);
  }

  /**
   * Get data stream
   */
  public getDataStream(streamId: string): DataPoint[] {
    return this.dataStreams.get(streamId) || [];
  }

  /**
   * Create real-time metrics visualization data
   */
  public createMetricsVisualization(metrics: BusinessMetric[]): {
    current: BusinessMetric[];
    trends: Map<string, DataPoint[]>;
    alerts: { metric: string; message: string; severity: 'low' | 'medium' | 'high' }[];
  } {
    const trends = new Map<string, DataPoint[]>();
    const alerts: { metric: string; message: string; severity: 'low' | 'medium' | 'high' }[] = [];
    
    metrics.forEach(metric => {
      // Generate trend data (simulated for demo)
      const trendData = this.generateMetricTrend(metric);
      trends.set(metric.id, trendData);
      
      // Check for alerts
      const alert = this.checkMetricAlert(metric, trendData);
      if (alert) {
        alerts.push(alert);
      }
    });
    
    return {
      current: metrics,
      trends,
      alerts
    };
  }

  /**
   * Generate trend data for a metric
   */
  private generateMetricTrend(metric: BusinessMetric): DataPoint[] {
    const points: DataPoint[] = [];
    const now = new Date();
    
    // Generate 20 data points over the last hour
    for (let i = 19; i >= 0; i--) {
      const timestamp = new Date(now.getTime() - i * 3 * 60 * 1000); // 3-minute intervals
      
      // Simulate trend based on metric category
      let value = metric.value;
      const variation = metric.value * 0.1; // 10% variation
      
      if (metric.trend === 'up') {
        value += (19 - i) * (variation / 19) + (Math.random() - 0.5) * variation * 0.2;
      } else if (metric.trend === 'down') {
        value -= (19 - i) * (variation / 19) + (Math.random() - 0.5) * variation * 0.2;
      } else {
        value += (Math.random() - 0.5) * variation * 0.3;
      }
      
      points.push({
        timestamp,
        value: Math.max(0, value),
        metadata: { original: metric.value }
      });
    }
    
    return points;
  }

  /**
   * Check if a metric should trigger an alert
   */
  private checkMetricAlert(
    metric: BusinessMetric, 
    trendData: DataPoint[]
  ): { metric: string; message: string; severity: 'low' | 'medium' | 'high' } | null {
    if (trendData.length < 5) return null;
    
    const recent = trendData.slice(-5);
    const average = recent.reduce((sum, point) => sum + point.value, 0) / recent.length;
    const deviation = Math.abs(average - metric.value) / metric.value;
    
    if (deviation > 0.3) {
      return {
        metric: metric.name,
        message: `${metric.name} has deviated ${Math.round(deviation * 100)}% from baseline`,
        severity: deviation > 0.5 ? 'high' : 'medium'
      };
    }
    
    return null;
  }

  /**
   * Trigger visualization update
   */
  private triggerUpdate(visualizationId: string, type: string, data: any): void {
    const callbacks = this.updateCallbacks.get(visualizationId);
    if (callbacks) {
      callbacks.forEach(callback => {
        try {
          callback({ type, data });
        } catch (error) {
          console.error(`Update callback error for ${visualizationId}:`, error);
        }
      });
    }
  }

  /**
   * Create animated transition configuration
   */
  public createAnimation(
    duration: number = DEMO_CONFIG.TRANSITION_DURATION,
    easing: string = 'ease-in-out',
    delay: number = 0
  ): AnimationConfig {
    return { duration, easing, delay };
  }

  /**
   * Calculate optimal layout for nodes
   */
  public calculateOptimalLayout(
    nodes: VisualizationNode[],
    edges: VisualizationEdge[],
    containerWidth: number,
    containerHeight: number
  ): { nodes: VisualizationNode[]; edges: VisualizationEdge[] } {
    // Simple force-directed layout algorithm
    const updatedNodes = [...nodes];
    const iterations = 50;
    const k = Math.sqrt((containerWidth * containerHeight) / nodes.length);
    
    for (let iter = 0; iter < iterations; iter++) {
      // Calculate repulsive forces between nodes
      for (let i = 0; i < updatedNodes.length; i++) {
        updatedNodes[i].x += (Math.random() - 0.5) * 2;
        updatedNodes[i].y += (Math.random() - 0.5) * 2;
        
        for (let j = 0; j < updatedNodes.length; j++) {
          if (i !== j) {
            const dx = updatedNodes[i].x - updatedNodes[j].x;
            const dy = updatedNodes[i].y - updatedNodes[j].y;
            const distance = Math.sqrt(dx * dx + dy * dy) || 1;
            const force = k * k / distance;
            
            updatedNodes[i].x += (dx / distance) * force * 0.1;
            updatedNodes[i].y += (dy / distance) * force * 0.1;
          }
        }
      }
      
      // Calculate attractive forces for connected nodes
      edges.forEach(edge => {
        const sourceNode = updatedNodes.find(n => n.id === edge.source);
        const targetNode = updatedNodes.find(n => n.id === edge.target);
        
        if (sourceNode && targetNode) {
          const dx = targetNode.x - sourceNode.x;
          const dy = targetNode.y - sourceNode.y;
          const distance = Math.sqrt(dx * dx + dy * dy) || 1;
          const force = (distance * distance) / k;
          
          const moveX = (dx / distance) * force * 0.1;
          const moveY = (dy / distance) * force * 0.1;
          
          sourceNode.x += moveX;
          sourceNode.y += moveY;
          targetNode.x -= moveX;
          targetNode.y -= moveY;
        }
      });
      
      // Keep nodes within bounds
      updatedNodes.forEach(node => {
        node.x = Math.max(50, Math.min(containerWidth - 50, node.x));
        node.y = Math.max(50, Math.min(containerHeight - 50, node.y));
      });
    }
    
    return { nodes: updatedNodes, edges };
  }

  /**
   * Cleanup resources
   */
  public cleanup(): void {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
    
    this.updateCallbacks.clear();
    this.dataStreams.clear();
    this.visualizationStates.clear();
    this.isAnimating = false;
  }

  /**
   * Get visualization performance metrics
   */
  public getPerformanceMetrics(): {
    activeVisualizations: number;
    dataStreams: number;
    averageUpdateRate: number;
    memoryUsage: number;
  } {
    return {
      activeVisualizations: this.updateCallbacks.size,
      dataStreams: this.dataStreams.size,
      averageUpdateRate: 60, // Assuming 60 FPS
      memoryUsage: this.calculateMemoryUsage()
    };
  }

  /**
   * Calculate approximate memory usage
   */
  private calculateMemoryUsage(): number {
    let totalPoints = 0;
    this.dataStreams.forEach(stream => {
      totalPoints += stream.length;
    });
    
    // Rough estimate: each data point ~100 bytes
    return totalPoints * 100;
  }
}

// Export singleton instance
export const visualizationEngine = new VisualizationEngine();
export default visualizationEngine;