interface NetworkNode {
  id: string;
  name: string;
  type: 'supervisor' | 'agent' | 'service' | 'database' | 'gateway' | 'monitor' | 'storage';
  status: 'active' | 'inactive' | 'warning' | 'error' | 'maintenance';
  position: { x: number; y: number };
  metrics: NodeMetrics;
  metadata: NodeMetadata;
  connections: string[]; // IDs of connected nodes
}

interface NetworkConnection {
  id: string;
  source: string;
  target: string;
  type: 'primary' | 'backup' | 'monitoring' | 'data' | 'control';
  status: 'active' | 'inactive' | 'congested' | 'failed';
  metrics: ConnectionMetrics;
  bidirectional: boolean;
}

interface NodeMetrics {
  cpu: number;
  memory: number;
  disk: number;
  network: number;
  load: number;
  uptime: number; // seconds
  responseTime: number; // ms
  throughput: number; // requests/sec
  errorRate: number; // percentage
}

interface ConnectionMetrics {
  bandwidth: number; // Mbps
  utilization: number; // percentage
  latency: number; // ms
  packetLoss: number; // percentage
  jitter: number; // ms
  throughput: number; // Mbps
}

interface NodeMetadata {
  version: string;
  location: string;
  region: string;
  instanceType: string;
  tags: string[];
  lastUpdate: Date;
  capabilities: string[];
}

interface NetworkTopology {
  nodes: NetworkNode[];
  connections: NetworkConnection[];
  metadata: {
    totalNodes: number;
    activeNodes: number;
    totalConnections: number;
    activeConnections: number;
    networkHealth: number; // 0-100
    lastUpdate: Date;
  };
}

interface NetworkEvent {
  id: string;
  timestamp: Date;
  type: 'node_added' | 'node_removed' | 'node_status_change' | 'connection_added' | 'connection_removed' | 'connection_status_change' | 'topology_change';
  nodeId?: string;
  connectionId?: string;
  oldValue?: any;
  newValue?: any;
  description: string;
}

class NetworkTopologySimulator {
  private topology: NetworkTopology;
  private events: NetworkEvent[] = [];
  private simulationConfig = {
    nodeCount: 12,
    connectionDensity: 0.3, // 0-1, how connected the network is
    changeFrequency: 0.1, // probability of change per update
    failureRate: 0.05, // probability of node/connection failure
    recoveryRate: 0.3, // probability of recovery from failure
  };

  constructor() {
    this.topology = this.generateInitialTopology();
  }

  private generateInitialTopology(): NetworkTopology {
    const nodes = this.generateNodes();
    const connections = this.generateConnections(nodes);
    
    return {
      nodes,
      connections,
      metadata: {
        totalNodes: nodes.length,
        activeNodes: nodes.filter(n => n.status === 'active').length,
        totalConnections: connections.length,
        activeConnections: connections.filter(c => c.status === 'active').length,
        networkHealth: this.calculateNetworkHealth(nodes, connections),
        lastUpdate: new Date(),
      },
    };
  }

  private generateNodes(): NetworkNode[] {
    const nodes: NetworkNode[] = [];
    const nodeTypes: NetworkNode['type'][] = ['supervisor', 'agent', 'service', 'database', 'gateway', 'monitor', 'storage'];
    
    // Always start with a supervisor node
    nodes.push(this.createNode('supervisor-01', 'supervisor', { x: 0, y: 0 }));
    
    // Generate other nodes
    for (let i = 1; i < this.simulationConfig.nodeCount; i++) {
      const type = nodeTypes[Math.floor(Math.random() * (nodeTypes.length - 1)) + 1]; // Exclude supervisor
      const position = this.generateNodePosition(i, this.simulationConfig.nodeCount);
      nodes.push(this.createNode(`${type}-${String(i).padStart(2, '0')}`, type, position));
    }
    
    return nodes;
  }

  private createNode(id: string, type: NetworkNode['type'], position: { x: number; y: number }): NetworkNode {
    return {
      id,
      name: this.generateNodeName(id, type),
      type,
      status: Math.random() > 0.1 ? 'active' : this.getRandomNodeStatus(),
      position,
      metrics: this.generateNodeMetrics(type),
      metadata: this.generateNodeMetadata(type),
      connections: [],
    };
  }

  private generateNodeName(id: string, type: NetworkNode['type']): string {
    const typeNames = {
      supervisor: 'Supervisor Agent',
      agent: 'Security Agent',
      service: 'Microservice',
      database: 'Database Server',
      gateway: 'API Gateway',
      monitor: 'Monitoring Service',
      storage: 'Storage Service',
    };
    
    return `${typeNames[type]} (${id})`;
  }

  private generateNodePosition(index: number, total: number): { x: number; y: number } {
    // Arrange nodes in a circular pattern around the supervisor
    const angle = (index / (total - 1)) * 2 * Math.PI;
    const radius = 200 + Math.random() * 100; // Some variation in distance
    
    return {
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius,
    };
  }

  private generateNodeMetrics(type: NetworkNode['type']): NodeMetrics {
    const baseMetrics = {
      supervisor: { cpu: 45, memory: 60, disk: 30, network: 70, load: 65 },
      agent: { cpu: 35, memory: 45, disk: 25, network: 40, load: 50 },
      service: { cpu: 25, memory: 35, disk: 20, network: 30, load: 40 },
      database: { cpu: 60, memory: 75, disk: 80, network: 50, load: 70 },
      gateway: { cpu: 40, memory: 50, disk: 15, network: 85, load: 60 },
      monitor: { cpu: 30, memory: 40, disk: 60, network: 45, load: 35 },
      storage: { cpu: 20, memory: 30, disk: 90, network: 60, load: 45 },
    };

    const base = baseMetrics[type];
    const variation = 0.2; // 20% variation

    return {
      cpu: Math.max(0, Math.min(100, base.cpu + (Math.random() - 0.5) * base.cpu * variation)),
      memory: Math.max(0, Math.min(100, base.memory + (Math.random() - 0.5) * base.memory * variation)),
      disk: Math.max(0, Math.min(100, base.disk + (Math.random() - 0.5) * base.disk * variation)),
      network: Math.max(0, Math.min(100, base.network + (Math.random() - 0.5) * base.network * variation)),
      load: Math.max(0, Math.min(100, base.load + (Math.random() - 0.5) * base.load * variation)),
      uptime: Math.floor(Math.random() * 30 * 24 * 3600), // 0-30 days
      responseTime: Math.floor(Math.random() * 200) + 50, // 50-250ms
      throughput: Math.floor(Math.random() * 1000) + 100, // 100-1100 req/sec
      errorRate: Math.random() * 5, // 0-5%
    };
  }

  private generateNodeMetadata(type: NetworkNode['type']): NodeMetadata {
    const versions = ['2.1.0', '2.1.1', '2.2.0', '2.2.1', '2.3.0'];
    const locations = ['us-east-1a', 'us-east-1b', 'us-west-2a', 'us-west-2b', 'eu-west-1a'];
    const regions = ['us-east-1', 'us-west-2', 'eu-west-1'];
    const instanceTypes = ['t3.micro', 't3.small', 't3.medium', 'm5.large', 'c5.large'];
    
    const capabilities = {
      supervisor: ['orchestration', 'monitoring', 'coordination', 'decision-making'],
      agent: ['threat-detection', 'incident-response', 'data-collection', 'analysis'],
      service: ['api-serving', 'data-processing', 'business-logic', 'integration'],
      database: ['data-storage', 'querying', 'backup', 'replication'],
      gateway: ['routing', 'load-balancing', 'authentication', 'rate-limiting'],
      monitor: ['metrics-collection', 'alerting', 'logging', 'health-checking'],
      storage: ['file-storage', 'backup', 'archiving', 'data-retention'],
    };

    return {
      version: versions[Math.floor(Math.random() * versions.length)],
      location: locations[Math.floor(Math.random() * locations.length)],
      region: regions[Math.floor(Math.random() * regions.length)],
      instanceType: instanceTypes[Math.floor(Math.random() * instanceTypes.length)],
      tags: this.generateNodeTags(type),
      lastUpdate: new Date(Date.now() - Math.random() * 3600000), // Within last hour
      capabilities: capabilities[type] || [],
    };
  }

  private generateNodeTags(type: NetworkNode['type']): string[] {
    const commonTags = ['production', 'monitored', 'automated'];
    const typeTags = {
      supervisor: ['critical', 'orchestrator'],
      agent: ['security', 'autonomous'],
      service: ['scalable', 'stateless'],
      database: ['persistent', 'replicated'],
      gateway: ['public-facing', 'load-balanced'],
      monitor: ['observability', 'alerting'],
      storage: ['persistent', 'backed-up'],
    };

    const tags = [...commonTags];
    const specificTags = typeTags[type] || [];
    tags.push(...specificTags);

    // Add some random additional tags
    const additionalTags = ['high-availability', 'encrypted', 'compliant', 'optimized'];
    const numAdditional = Math.floor(Math.random() * 2);
    for (let i = 0; i < numAdditional; i++) {
      const tag = additionalTags[Math.floor(Math.random() * additionalTags.length)];
      if (!tags.includes(tag)) {
        tags.push(tag);
      }
    }

    return tags;
  }

  private generateConnections(nodes: NetworkNode[]): NetworkConnection[] {
    const connections: NetworkConnection[] = [];
    const supervisor = nodes.find(n => n.type === 'supervisor');
    
    if (!supervisor) return connections;

    // Connect supervisor to all other nodes
    nodes.forEach(node => {
      if (node.id !== supervisor.id) {
        const connection = this.createConnection(supervisor.id, node.id, 'primary');
        connections.push(connection);
        supervisor.connections.push(node.id);
        node.connections.push(supervisor.id);
      }
    });

    // Add inter-node connections based on connection density
    const maxConnections = (nodes.length * (nodes.length - 1)) / 2;
    const targetConnections = Math.floor(maxConnections * this.simulationConfig.connectionDensity);
    
    while (connections.length < targetConnections) {
      const source = nodes[Math.floor(Math.random() * nodes.length)];
      const target = nodes[Math.floor(Math.random() * nodes.length)];
      
      if (source.id !== target.id && !this.connectionExists(connections, source.id, target.id)) {
        const connectionType = this.getConnectionType(source.type, target.type);
        const connection = this.createConnection(source.id, target.id, connectionType);
        connections.push(connection);
        source.connections.push(target.id);
        target.connections.push(source.id);
      }
    }

    return connections;
  }

  private createConnection(sourceId: string, targetId: string, type: NetworkConnection['type']): NetworkConnection {
    return {
      id: `${sourceId}-${targetId}`,
      source: sourceId,
      target: targetId,
      type,
      status: Math.random() > 0.05 ? 'active' : this.getRandomConnectionStatus(),
      metrics: this.generateConnectionMetrics(type),
      bidirectional: true,
    };
  }

  private getConnectionType(sourceType: NetworkNode['type'], targetType: NetworkNode['type']): NetworkConnection['type'] {
    if (sourceType === 'supervisor' || targetType === 'supervisor') {
      return 'control';
    }
    if (sourceType === 'database' || targetType === 'database') {
      return 'data';
    }
    if (sourceType === 'monitor' || targetType === 'monitor') {
      return 'monitoring';
    }
    return 'primary';
  }

  private generateConnectionMetrics(type: NetworkConnection['type']): ConnectionMetrics {
    const baseMetrics = {
      primary: { bandwidth: 1000, utilization: 45, latency: 15 },
      backup: { bandwidth: 500, utilization: 10, latency: 25 },
      monitoring: { bandwidth: 100, utilization: 20, latency: 10 },
      data: { bandwidth: 10000, utilization: 60, latency: 5 },
      control: { bandwidth: 100, utilization: 30, latency: 8 },
    };

    const base = baseMetrics[type];
    const variation = 0.3;

    return {
      bandwidth: base.bandwidth,
      utilization: Math.max(0, Math.min(100, base.utilization + (Math.random() - 0.5) * base.utilization * variation)),
      latency: Math.max(1, base.latency + (Math.random() - 0.5) * base.latency * variation),
      packetLoss: Math.random() * 0.5, // 0-0.5%
      jitter: Math.random() * 5, // 0-5ms
      throughput: Math.max(0, base.bandwidth * (base.utilization / 100) + (Math.random() - 0.5) * base.bandwidth * 0.1),
    };
  }

  private connectionExists(connections: NetworkConnection[], sourceId: string, targetId: string): boolean {
    return connections.some(c => 
      (c.source === sourceId && c.target === targetId) ||
      (c.source === targetId && c.target === sourceId)
    );
  }

  private getRandomNodeStatus(): NetworkNode['status'] {
    const statuses: NetworkNode['status'][] = ['inactive', 'warning', 'error', 'maintenance'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private getRandomConnectionStatus(): NetworkConnection['status'] {
    const statuses: NetworkConnection['status'][] = ['inactive', 'congested', 'failed'];
    return statuses[Math.floor(Math.random() * statuses.length)];
  }

  private calculateNetworkHealth(nodes: NetworkNode[], connections: NetworkConnection[]): number {
    const activeNodes = nodes.filter(n => n.status === 'active').length;
    const activeConnections = connections.filter(c => c.status === 'active').length;
    
    const nodeHealth = (activeNodes / nodes.length) * 100;
    const connectionHealth = (activeConnections / connections.length) * 100;
    
    return (nodeHealth + connectionHealth) / 2;
  }

  // Public methods
  getCurrentTopology(): NetworkTopology {
    return { ...this.topology };
  }

  simulateTopologyChanges(): NetworkTopology {
    const events: NetworkEvent[] = [];

    // Update node metrics and status
    this.topology.nodes.forEach(node => {
      // Update metrics with realistic variations
      this.updateNodeMetrics(node);
      
      // Randomly change node status
      if (Math.random() < this.simulationConfig.changeFrequency) {
        const oldStatus = node.status;
        node.status = this.getNextNodeStatus(node.status);
        
        if (oldStatus !== node.status) {
          events.push({
            id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            timestamp: new Date(),
            type: 'node_status_change',
            nodeId: node.id,
            oldValue: oldStatus,
            newValue: node.status,
            description: `Node ${node.name} status changed from ${oldStatus} to ${node.status}`,
          });
        }
      }
    });

    // Update connection metrics and status
    this.topology.connections.forEach(connection => {
      this.updateConnectionMetrics(connection);
      
      if (Math.random() < this.simulationConfig.changeFrequency * 0.5) {
        const oldStatus = connection.status;
        connection.status = this.getNextConnectionStatus(connection.status);
        
        if (oldStatus !== connection.status) {
          events.push({
            id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
            timestamp: new Date(),
            type: 'connection_status_change',
            connectionId: connection.id,
            oldValue: oldStatus,
            newValue: connection.status,
            description: `Connection ${connection.id} status changed from ${oldStatus} to ${connection.status}`,
          });
        }
      }
    });

    // Occasionally add or remove nodes/connections
    if (Math.random() < 0.02) { // 2% chance
      if (Math.random() < 0.5 && this.topology.nodes.length < 20) {
        this.addRandomNode();
        events.push({
          id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          timestamp: new Date(),
          type: 'topology_change',
          description: 'New node added to topology',
        });
      } else if (this.topology.nodes.length > 5) {
        this.removeRandomNode();
        events.push({
          id: `event-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`,
          timestamp: new Date(),
          type: 'topology_change',
          description: 'Node removed from topology',
        });
      }
    }

    // Update metadata
    this.topology.metadata = {
      totalNodes: this.topology.nodes.length,
      activeNodes: this.topology.nodes.filter(n => n.status === 'active').length,
      totalConnections: this.topology.connections.length,
      activeConnections: this.topology.connections.filter(c => c.status === 'active').length,
      networkHealth: this.calculateNetworkHealth(this.topology.nodes, this.topology.connections),
      lastUpdate: new Date(),
    };

    // Store events
    this.events.push(...events);
    if (this.events.length > 100) {
      this.events = this.events.slice(-100);
    }

    return this.getCurrentTopology();
  }

  private updateNodeMetrics(node: NetworkNode): void {
    const metrics = node.metrics;
    const variation = 0.1; // 10% variation
    
    // Apply time-based patterns
    const timeVariation = this.getTimeBasedVariation();
    
    metrics.cpu = Math.max(0, Math.min(100, metrics.cpu + timeVariation * 20 + (Math.random() - 0.5) * metrics.cpu * variation));
    metrics.memory = Math.max(0, Math.min(100, metrics.memory + timeVariation * 15 + (Math.random() - 0.5) * metrics.memory * variation));
    metrics.network = Math.max(0, Math.min(100, metrics.network + timeVariation * 25 + (Math.random() - 0.5) * metrics.network * variation));
    metrics.load = Math.max(0, Math.min(100, metrics.load + timeVariation * 30 + (Math.random() - 0.5) * metrics.load * variation));
    
    // Update other metrics
    metrics.responseTime = Math.max(10, metrics.responseTime + (Math.random() - 0.5) * 50);
    metrics.throughput = Math.max(0, metrics.throughput + (Math.random() - 0.5) * 200);
    metrics.errorRate = Math.max(0, Math.min(10, metrics.errorRate + (Math.random() - 0.5) * 1));
    
    // Increment uptime if node is active
    if (node.status === 'active') {
      metrics.uptime += 5; // 5 seconds per update
    }
  }

  private updateConnectionMetrics(connection: NetworkConnection): void {
    const metrics = connection.metrics;
    const variation = 0.15;
    
    metrics.utilization = Math.max(0, Math.min(100, metrics.utilization + (Math.random() - 0.5) * metrics.utilization * variation));
    metrics.latency = Math.max(1, metrics.latency + (Math.random() - 0.5) * metrics.latency * variation);
    metrics.packetLoss = Math.max(0, Math.min(5, metrics.packetLoss + (Math.random() - 0.5) * 0.2));
    metrics.jitter = Math.max(0, metrics.jitter + (Math.random() - 0.5) * 2);
    metrics.throughput = Math.max(0, metrics.bandwidth * (metrics.utilization / 100) + (Math.random() - 0.5) * metrics.bandwidth * 0.1);
  }

  private getTimeBasedVariation(): number {
    const time = Date.now();
    const hourlyPattern = Math.sin((time % (24 * 60 * 60 * 1000)) / (24 * 60 * 60 * 1000) * 2 * Math.PI);
    return hourlyPattern * 0.3; // 30% variation based on time of day
  }

  private getNextNodeStatus(currentStatus: NetworkNode['status']): NetworkNode['status'] {
    const transitions = {
      active: Math.random() < this.simulationConfig.failureRate ? 
        ['warning', 'error', 'maintenance'][Math.floor(Math.random() * 3)] : 'active',
      warning: Math.random() < 0.3 ? 'error' : Math.random() < 0.4 ? 'active' : 'warning',
      error: Math.random() < this.simulationConfig.recoveryRate ? 'warning' : 'error',
      maintenance: Math.random() < 0.6 ? 'active' : 'maintenance',
      inactive: Math.random() < 0.4 ? 'active' : 'inactive',
    };

    return transitions[currentStatus] as NetworkNode['status'] || currentStatus;
  }

  private getNextConnectionStatus(currentStatus: NetworkConnection['status']): NetworkConnection['status'] {
    const transitions = {
      active: Math.random() < this.simulationConfig.failureRate ? 
        ['congested', 'failed'][Math.floor(Math.random() * 2)] : 'active',
      congested: Math.random() < 0.4 ? 'active' : Math.random() < 0.1 ? 'failed' : 'congested',
      failed: Math.random() < this.simulationConfig.recoveryRate ? 'active' : 'failed',
      inactive: Math.random() < 0.3 ? 'active' : 'inactive',
    };

    return transitions[currentStatus] as NetworkConnection['status'] || currentStatus;
  }

  private addRandomNode(): void {
    const nodeTypes: NetworkNode['type'][] = ['agent', 'service', 'monitor'];
    const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
    const id = `${type}-${String(this.topology.nodes.length + 1).padStart(2, '0')}`;
    const position = this.generateNodePosition(this.topology.nodes.length, this.topology.nodes.length + 1);
    
    const newNode = this.createNode(id, type, position);
    this.topology.nodes.push(newNode);
    
    // Connect to supervisor and maybe one other node
    const supervisor = this.topology.nodes.find(n => n.type === 'supervisor');
    if (supervisor) {
      const connection = this.createConnection(supervisor.id, newNode.id, 'primary');
      this.topology.connections.push(connection);
      supervisor.connections.push(newNode.id);
      newNode.connections.push(supervisor.id);
    }
  }

  private removeRandomNode(): void {
    // Don't remove supervisor
    const removableNodes = this.topology.nodes.filter(n => n.type !== 'supervisor');
    if (removableNodes.length === 0) return;
    
    const nodeToRemove = removableNodes[Math.floor(Math.random() * removableNodes.length)];
    
    // Remove connections
    this.topology.connections = this.topology.connections.filter(c => 
      c.source !== nodeToRemove.id && c.target !== nodeToRemove.id
    );
    
    // Remove from other nodes' connection lists
    this.topology.nodes.forEach(node => {
      node.connections = node.connections.filter(id => id !== nodeToRemove.id);
    });
    
    // Remove the node
    this.topology.nodes = this.topology.nodes.filter(n => n.id !== nodeToRemove.id);
  }

  getRecentEvents(count: number = 10): NetworkEvent[] {
    return this.events.slice(-count);
  }

  getNodeById(nodeId: string): NetworkNode | undefined {
    return this.topology.nodes.find(n => n.id === nodeId);
  }

  getConnectionById(connectionId: string): NetworkConnection | undefined {
    return this.topology.connections.find(c => c.id === connectionId);
  }

  getNetworkStatistics(): {
    totalNodes: number;
    nodesByType: Record<string, number>;
    nodesByStatus: Record<string, number>;
    averageConnections: number;
    networkDensity: number;
    healthScore: number;
  } {
    const nodesByType: Record<string, number> = {};
    const nodesByStatus: Record<string, number> = {};
    
    this.topology.nodes.forEach(node => {
      nodesByType[node.type] = (nodesByType[node.type] || 0) + 1;
      nodesByStatus[node.status] = (nodesByStatus[node.status] || 0) + 1;
    });
    
    const totalPossibleConnections = (this.topology.nodes.length * (this.topology.nodes.length - 1)) / 2;
    const networkDensity = this.topology.connections.length / totalPossibleConnections;
    const averageConnections = this.topology.connections.length * 2 / this.topology.nodes.length;
    
    return {
      totalNodes: this.topology.nodes.length,
      nodesByType,
      nodesByStatus,
      averageConnections,
      networkDensity,
      healthScore: this.topology.metadata.networkHealth,
    };
  }
}

export const networkTopologySimulator = new NetworkTopologySimulator();
export default networkTopologySimulator;