/**
 * Threat Scenario Generator
 * 
 * Generates realistic cybersecurity threat scenarios with dynamic threat injection,
 * network topology simulation, and threat propagation modeling.
 */

import { DEMO_CONFIG } from '../config/demoConfig';

// Threat types and classifications
export type ThreatType = 
  | 'apt' // Advanced Persistent Threat
  | 'malware' 
  | 'phishing'
  | 'ddos'
  | 'insider-threat'
  | 'ransomware'
  | 'data-breach'
  | 'privilege-escalation'
  | 'lateral-movement'
  | 'exfiltration';

export type ThreatSeverity = 'low' | 'medium' | 'high' | 'critical';

export type NetworkNodeType = 
  | 'server'
  | 'workstation'
  | 'database'
  | 'firewall'
  | 'router'
  | 'switch'
  | 'endpoint'
  | 'cloud-service'
  | 'iot-device';

// Network topology interfaces
export interface NetworkNode {
  id: string;
  name: string;
  type: NetworkNodeType;
  ipAddress: string;
  subnet: string;
  position: { x: number; y: number };
  status: 'healthy' | 'compromised' | 'suspicious' | 'offline';
  vulnerabilities: Vulnerability[];
  connections: string[]; // Connected node IDs
  services: NetworkService[];
  securityLevel: number; // 0-100
  criticality: 'low' | 'medium' | 'high' | 'critical';
  lastActivity: Date;
  metadata: {
    os?: string;
    version?: string;
    department?: string;
    owner?: string;
    description?: string;
  };
}

export interface NetworkConnection {
  id: string;
  sourceId: string;
  targetId: string;
  type: 'ethernet' | 'wifi' | 'vpn' | 'internet' | 'internal';
  bandwidth: number; // Mbps
  latency: number; // ms
  status: 'active' | 'inactive' | 'compromised';
  traffic: NetworkTraffic[];
  securityProtocols: string[];
}

export interface NetworkService {
  id: string;
  name: string;
  port: number;
  protocol: 'tcp' | 'udp' | 'http' | 'https' | 'ssh' | 'ftp' | 'smtp';
  status: 'running' | 'stopped' | 'compromised';
  version: string;
  vulnerabilities: string[];
}

export interface NetworkTraffic {
  id: string;
  timestamp: Date;
  sourceIp: string;
  targetIp: string;
  port: number;
  protocol: string;
  bytes: number;
  packets: number;
  flags: string[];
  suspicious: boolean;
  threatIndicators: string[];
}

export interface Vulnerability {
  id: string;
  cveId?: string;
  name: string;
  description: string;
  severity: ThreatSeverity;
  cvssScore: number;
  exploitAvailable: boolean;
  patchAvailable: boolean;
  discoveredDate: Date;
  category: string;
}

// Threat scenario interfaces
export interface ThreatScenario {
  id: string;
  name: string;
  description: string;
  type: ThreatType;
  severity: ThreatSeverity;
  duration: number; // minutes
  phases: ThreatPhase[];
  targetNodes: string[];
  attackVector: string;
  objectives: string[];
  indicators: ThreatIndicator[];
  mitigations: string[];
  businessImpact: BusinessImpact;
  timeline: ThreatEvent[];
}

export interface ThreatPhase {
  id: string;
  name: string;
  description: string;
  duration: number; // minutes
  actions: ThreatAction[];
  successCriteria: string[];
  detectionProbability: number; // 0-1
}

export interface ThreatAction {
  id: string;
  type: 'reconnaissance' | 'initial-access' | 'execution' | 'persistence' | 'privilege-escalation' | 'defense-evasion' | 'credential-access' | 'discovery' | 'lateral-movement' | 'collection' | 'exfiltration' | 'impact';
  description: string;
  targetNodeId: string;
  technique: string;
  duration: number; // seconds
  successProbability: number; // 0-1
  detectionSignatures: string[];
  artifacts: string[];
}

export interface ThreatIndicator {
  id: string;
  type: 'ioc' | 'ttp' | 'behavioral' | 'network' | 'file' | 'registry';
  value: string;
  description: string;
  confidence: number; // 0-1
  severity: ThreatSeverity;
  firstSeen: Date;
  lastSeen: Date;
  sources: string[];
}

export interface ThreatEvent {
  id: string;
  timestamp: Date;
  type: 'detection' | 'action' | 'escalation' | 'containment' | 'mitigation';
  description: string;
  nodeId?: string;
  severity: ThreatSeverity;
  confidence: number;
  evidence: string[];
  response?: string;
}

export interface BusinessImpact {
  financialLoss: number;
  downtime: number; // minutes
  dataCompromised: number; // records
  reputationDamage: 'low' | 'medium' | 'high';
  complianceViolations: string[];
  recoveryTime: number; // hours
  affectedSystems: string[];
}

// Network topology generator
class NetworkTopologyGenerator {
  private nodeCounter = 0;
  private connectionCounter = 0;

  /**
   * Generate a realistic enterprise network topology
   */
  generateEnterpriseNetwork(size: 'small' | 'medium' | 'large' = 'medium'): {
    nodes: NetworkNode[];
    connections: NetworkConnection[];
  } {
    const nodeCount = {
      small: 15,
      medium: 30,
      large: 50
    }[size];

    const nodes: NetworkNode[] = [];
    const connections: NetworkConnection[] = [];

    // Create core infrastructure
    const coreNodes = this.createCoreInfrastructure();
    nodes.push(...coreNodes);

    // Create departmental networks
    const deptNodes = this.createDepartmentalNetworks(nodeCount - coreNodes.length);
    nodes.push(...deptNodes);

    // Create connections
    const networkConnections = this.createNetworkConnections(nodes);
    connections.push(...networkConnections);

    // Position nodes for visualization
    this.positionNodes(nodes);

    return { nodes, connections };
  }

  private createCoreInfrastructure(): NetworkNode[] {
    const nodes: NetworkNode[] = [];

    // Internet gateway
    nodes.push(this.createNode({
      name: 'Internet Gateway',
      type: 'router',
      subnet: '0.0.0.0/0',
      criticality: 'critical',
      securityLevel: 85,
      department: 'Infrastructure'
    }));

    // Main firewall
    nodes.push(this.createNode({
      name: 'Main Firewall',
      type: 'firewall',
      subnet: '10.0.0.0/24',
      criticality: 'critical',
      securityLevel: 95,
      department: 'Security'
    }));

    // Core switches
    nodes.push(this.createNode({
      name: 'Core Switch 1',
      type: 'switch',
      subnet: '10.0.1.0/24',
      criticality: 'high',
      securityLevel: 80,
      department: 'Infrastructure'
    }));

    // Domain controller
    nodes.push(this.createNode({
      name: 'Domain Controller',
      type: 'server',
      subnet: '10.0.1.0/24',
      criticality: 'critical',
      securityLevel: 90,
      department: 'IT',
      os: 'Windows Server 2019'
    }));

    // Database server
    nodes.push(this.createNode({
      name: 'Database Server',
      type: 'database',
      subnet: '10.0.2.0/24',
      criticality: 'critical',
      securityLevel: 85,
      department: 'IT',
      os: 'Linux'
    }));

    // Web server
    nodes.push(this.createNode({
      name: 'Web Server',
      type: 'server',
      subnet: '10.0.3.0/24',
      criticality: 'high',
      securityLevel: 75,
      department: 'IT',
      os: 'Linux'
    }));

    return nodes;
  }

  private createDepartmentalNetworks(count: number): NetworkNode[] {
    const nodes: NetworkNode[] = [];
    const departments = ['HR', 'Finance', 'Engineering', 'Sales', 'Marketing', 'Operations'];
    const nodeTypes: NetworkNodeType[] = ['workstation', 'server', 'endpoint', 'iot-device'];

    for (let i = 0; i < count; i++) {
      const dept = departments[i % departments.length];
      const type = nodeTypes[Math.floor(Math.random() * nodeTypes.length)];
      
      nodes.push(this.createNode({
        name: `${dept}-${type}-${Math.floor(i / departments.length) + 1}`,
        type,
        subnet: `10.${Math.floor(i / 10) + 10}.${(i % 10) * 10}.0/24`,
        criticality: this.getRandomCriticality(),
        securityLevel: Math.floor(Math.random() * 40) + 60, // 60-100
        department: dept,
        os: type === 'workstation' ? 'Windows 10' : type === 'server' ? 'Linux' : undefined
      }));
    }

    return nodes;
  }

  private createNode(config: {
    name: string;
    type: NetworkNodeType;
    subnet: string;
    criticality: 'low' | 'medium' | 'high' | 'critical';
    securityLevel: number;
    department: string;
    os?: string;
  }): NetworkNode {
    const id = `node-${++this.nodeCounter}`;
    const ipAddress = this.generateIpAddress(config.subnet);

    return {
      id,
      name: config.name,
      type: config.type,
      ipAddress,
      subnet: config.subnet,
      position: { x: 0, y: 0 }, // Will be set later
      status: 'healthy',
      vulnerabilities: this.generateVulnerabilities(config.type),
      connections: [],
      services: this.generateServices(config.type),
      securityLevel: config.securityLevel,
      criticality: config.criticality,
      lastActivity: new Date(),
      metadata: {
        os: config.os,
        department: config.department,
        description: `${config.type} in ${config.department} department`
      }
    };
  }

  private createNetworkConnections(nodes: NetworkNode[]): NetworkConnection[] {
    const connections: NetworkConnection[] = [];
    
    // Connect core infrastructure
    const coreNodes = nodes.filter(n => 
      ['router', 'firewall', 'switch'].includes(n.type) || 
      n.name.includes('Domain Controller')
    );

    for (let i = 0; i < coreNodes.length - 1; i++) {
      connections.push(this.createConnection(coreNodes[i], coreNodes[i + 1], 'ethernet'));
    }

    // Connect departmental nodes to switches
    const switches = nodes.filter(n => n.type === 'switch');
    const otherNodes = nodes.filter(n => !coreNodes.includes(n) && n.type !== 'switch');

    otherNodes.forEach((node, index) => {
      const switchNode = switches[index % switches.length] || switches[0];
      if (switchNode) {
        connections.push(this.createConnection(switchNode, node, 'ethernet'));
      }
    });

    return connections;
  }

  private createConnection(
    source: NetworkNode, 
    target: NetworkNode, 
    type: NetworkConnection['type']
  ): NetworkConnection {
    const id = `conn-${++this.connectionCounter}`;
    
    // Update node connections
    source.connections.push(target.id);
    target.connections.push(source.id);

    return {
      id,
      sourceId: source.id,
      targetId: target.id,
      type,
      bandwidth: this.getConnectionBandwidth(type),
      latency: Math.floor(Math.random() * 10) + 1,
      status: 'active',
      traffic: [],
      securityProtocols: ['TLS', 'IPSec']
    };
  }

  private positionNodes(nodes: NetworkNode[]): void {
    const centerX = 400;
    const centerY = 300;
    const radius = 200;

    nodes.forEach((node, index) => {
      const angle = (index / nodes.length) * 2 * Math.PI;
      const layerRadius = node.type === 'router' || node.type === 'firewall' ? 
        radius * 0.3 : 
        node.type === 'switch' || node.type === 'server' ? 
          radius * 0.6 : 
          radius;

      node.position = {
        x: centerX + Math.cos(angle) * layerRadius,
        y: centerY + Math.sin(angle) * layerRadius
      };
    });
  }

  private generateIpAddress(subnet: string): string {
    const [network] = subnet.split('/');
    const parts = network.split('.');
    const lastOctet = Math.floor(Math.random() * 254) + 1;
    return `${parts[0]}.${parts[1]}.${parts[2]}.${lastOctet}`;
  }

  private generateVulnerabilities(nodeType: NetworkNodeType): Vulnerability[] {
    const vulnerabilities: Vulnerability[] = [];
    const vulnCount = Math.floor(Math.random() * 3) + 1;

    const commonVulns = [
      {
        name: 'Outdated Software',
        description: 'System running outdated software with known vulnerabilities',
        category: 'Software',
        cvssScore: 7.5
      },
      {
        name: 'Weak Authentication',
        description: 'Weak or default authentication credentials',
        category: 'Authentication',
        cvssScore: 8.1
      },
      {
        name: 'Unpatched OS',
        description: 'Operating system missing critical security patches',
        category: 'Operating System',
        cvssScore: 9.0
      },
      {
        name: 'Open Ports',
        description: 'Unnecessary network ports exposed to potential attackers',
        category: 'Network',
        cvssScore: 6.5
      }
    ];

    for (let i = 0; i < vulnCount; i++) {
      const vuln = commonVulns[Math.floor(Math.random() * commonVulns.length)];
      vulnerabilities.push({
        id: `vuln-${Date.now()}-${i}`,
        cveId: `CVE-2024-${Math.floor(Math.random() * 9999).toString().padStart(4, '0')}`,
        name: vuln.name,
        description: vuln.description,
        severity: this.cvssToSeverity(vuln.cvssScore),
        cvssScore: vuln.cvssScore,
        exploitAvailable: Math.random() > 0.7,
        patchAvailable: Math.random() > 0.3,
        discoveredDate: new Date(Date.now() - Math.random() * 30 * 24 * 60 * 60 * 1000),
        category: vuln.category
      });
    }

    return vulnerabilities;
  }

  private generateServices(nodeType: NetworkNodeType): NetworkService[] {
    const services: NetworkService[] = [];
    
    const serviceTemplates = {
      server: [
        { name: 'SSH', port: 22, protocol: 'ssh' as const },
        { name: 'HTTP', port: 80, protocol: 'http' as const },
        { name: 'HTTPS', port: 443, protocol: 'https' as const }
      ],
      workstation: [
        { name: 'RDP', port: 3389, protocol: 'tcp' as const },
        { name: 'SMB', port: 445, protocol: 'tcp' as const }
      ],
      database: [
        { name: 'MySQL', port: 3306, protocol: 'tcp' as const },
        { name: 'SSH', port: 22, protocol: 'ssh' as const }
      ],
      firewall: [
        { name: 'HTTPS Management', port: 443, protocol: 'https' as const }
      ]
    };

    const templates = serviceTemplates[nodeType as keyof typeof serviceTemplates] || [];
    
    templates.forEach((template, index) => {
      services.push({
        id: `service-${Date.now()}-${index}`,
        name: template.name,
        port: template.port,
        protocol: template.protocol,
        status: 'running',
        version: `${Math.floor(Math.random() * 5) + 1}.${Math.floor(Math.random() * 10)}`,
        vulnerabilities: Math.random() > 0.7 ? ['CVE-2024-0001'] : []
      });
    });

    return services;
  }

  private getRandomCriticality(): 'low' | 'medium' | 'high' | 'critical' {
    const rand = Math.random();
    if (rand < 0.1) return 'critical';
    if (rand < 0.3) return 'high';
    if (rand < 0.7) return 'medium';
    return 'low';
  }

  private getConnectionBandwidth(type: NetworkConnection['type']): number {
    switch (type) {
      case 'ethernet': return 1000; // 1 Gbps
      case 'wifi': return 300; // 300 Mbps
      case 'vpn': return 100; // 100 Mbps
      case 'internet': return 500; // 500 Mbps
      default: return 100;
    }
  }

  private cvssToSeverity(score: number): ThreatSeverity {
    if (score >= 9.0) return 'critical';
    if (score >= 7.0) return 'high';
    if (score >= 4.0) return 'medium';
    return 'low';
  }
}

// Threat scenario generator
class ThreatScenarioGenerator {
  private scenarioCounter = 0;

  /**
   * Generate a realistic threat scenario
   */
  generateThreatScenario(
    type: ThreatType,
    networkNodes: NetworkNode[],
    complexity: 'simple' | 'moderate' | 'complex' = 'moderate'
  ): ThreatScenario {
    const scenarioTemplates = this.getScenarioTemplates();
    const template = scenarioTemplates[type];
    
    if (!template) {
      throw new Error(`Unknown threat type: ${type}`);
    }

    const targetNodes = this.selectTargetNodes(networkNodes, type, complexity);
    const phases = this.generateThreatPhases(type, targetNodes, complexity);
    const timeline = this.generateThreatTimeline(phases);

    return {
      id: `scenario-${++this.scenarioCounter}`,
      name: template.name,
      description: template.description,
      type,
      severity: template.severity,
      duration: this.calculateScenarioDuration(complexity),
      phases,
      targetNodes: targetNodes.map(n => n.id),
      attackVector: template.attackVector,
      objectives: template.objectives,
      indicators: this.generateThreatIndicators(type, targetNodes),
      mitigations: template.mitigations,
      businessImpact: this.calculateBusinessImpact(type, targetNodes),
      timeline
    };
  }

  private getScenarioTemplates() {
    return {
      'apt': {
        name: 'Advanced Persistent Threat Campaign',
        description: 'Sophisticated, multi-stage attack by nation-state actors targeting sensitive data',
        severity: 'critical' as ThreatSeverity,
        attackVector: 'Spear-phishing email with malicious attachment',
        objectives: ['Data exfiltration', 'Persistent access', 'Intelligence gathering'],
        mitigations: ['Email filtering', 'Endpoint detection', 'Network segmentation', 'User training']
      },
      'ransomware': {
        name: 'Ransomware Attack',
        description: 'Malicious software that encrypts files and demands payment for decryption',
        severity: 'critical' as ThreatSeverity,
        attackVector: 'Malicious email attachment or compromised RDP',
        objectives: ['File encryption', 'Payment extortion', 'Business disruption'],
        mitigations: ['Backup systems', 'Endpoint protection', 'Network isolation', 'Patch management']
      },
      'malware': {
        name: 'Malware Infection',
        description: 'Malicious software designed to damage or gain unauthorized access to systems',
        severity: 'high' as ThreatSeverity,
        attackVector: 'Drive-by download or infected USB device',
        objectives: ['System compromise', 'Data theft', 'Botnet recruitment'],
        mitigations: ['Antivirus software', 'Application whitelisting', 'User education', 'USB restrictions']
      },
      'phishing': {
        name: 'Phishing Campaign',
        description: 'Social engineering attack to steal credentials or install malware',
        severity: 'medium' as ThreatSeverity,
        attackVector: 'Fraudulent emails mimicking legitimate organizations',
        objectives: ['Credential theft', 'Initial access', 'Financial fraud'],
        mitigations: ['Email security', 'User training', 'Multi-factor authentication', 'Domain monitoring']
      },
      'ddos': {
        name: 'Distributed Denial of Service',
        description: 'Coordinated attack to overwhelm systems and disrupt services',
        severity: 'high' as ThreatSeverity,
        attackVector: 'Botnet-coordinated traffic flood',
        objectives: ['Service disruption', 'Business impact', 'Distraction for other attacks'],
        mitigations: ['DDoS protection', 'Traffic filtering', 'Load balancing', 'Incident response']
      },
      'insider-threat': {
        name: 'Insider Threat',
        description: 'Malicious or negligent actions by authorized users',
        severity: 'high' as ThreatSeverity,
        attackVector: 'Abuse of legitimate access privileges',
        objectives: ['Data theft', 'Sabotage', 'Competitive advantage'],
        mitigations: ['Access controls', 'Monitoring', 'Background checks', 'Separation of duties']
      },
      'data-breach': {
        name: 'Data Breach',
        description: 'Unauthorized access and exfiltration of sensitive information',
        severity: 'critical' as ThreatSeverity,
        attackVector: 'Multiple vectors including web application vulnerabilities',
        objectives: ['Sensitive data access', 'Data exfiltration', 'Identity theft'],
        mitigations: ['Data encryption', 'Access controls', 'Vulnerability management', 'Data loss prevention']
      },
      'privilege-escalation': {
        name: 'Privilege Escalation Attack',
        description: 'Gaining higher-level permissions than initially granted',
        severity: 'high' as ThreatSeverity,
        attackVector: 'Exploitation of system vulnerabilities or misconfigurations',
        objectives: ['Administrative access', 'System control', 'Lateral movement'],
        mitigations: ['Least privilege', 'Patch management', 'System hardening', 'Privilege monitoring']
      },
      'lateral-movement': {
        name: 'Lateral Movement',
        description: 'Moving through network to access additional systems',
        severity: 'high' as ThreatSeverity,
        attackVector: 'Compromised credentials or system vulnerabilities',
        objectives: ['Network exploration', 'Asset discovery', 'Target identification'],
        mitigations: ['Network segmentation', 'Monitoring', 'Zero trust', 'Credential management']
      },
      'exfiltration': {
        name: 'Data Exfiltration',
        description: 'Unauthorized transfer of data from target systems',
        severity: 'critical' as ThreatSeverity,
        attackVector: 'Various methods including encrypted channels',
        objectives: ['Data theft', 'Intellectual property', 'Customer information'],
        mitigations: ['Data loss prevention', 'Network monitoring', 'Encryption', 'Access controls']
      }
    };
  }

  private selectTargetNodes(
    nodes: NetworkNode[], 
    threatType: ThreatType, 
    complexity: 'simple' | 'moderate' | 'complex'
  ): NetworkNode[] {
    const targetCount = {
      simple: 1,
      moderate: 3,
      complex: 5
    }[complexity];

    // Prioritize high-value targets based on threat type
    const priorityTypes: NetworkNodeType[] = {
      'apt': ['server', 'database', 'workstation'],
      'ransomware': ['server', 'database', 'workstation'],
      'malware': ['workstation', 'endpoint'],
      'phishing': ['workstation'],
      'ddos': ['server', 'firewall', 'router'],
      'insider-threat': ['database', 'server'],
      'data-breach': ['database', 'server'],
      'privilege-escalation': ['server', 'workstation'],
      'lateral-movement': ['workstation', 'server'],
      'exfiltration': ['database', 'server']
    }[threatType] || ['workstation'];

    const candidates = nodes.filter(n => priorityTypes.includes(n.type));
    const selected = candidates
      .sort((a, b) => {
        // Prioritize by criticality and vulnerability count
        const scoreA = (a.criticality === 'critical' ? 4 : a.criticality === 'high' ? 3 : a.criticality === 'medium' ? 2 : 1) + a.vulnerabilities.length;
        const scoreB = (b.criticality === 'critical' ? 4 : b.criticality === 'high' ? 3 : b.criticality === 'medium' ? 2 : 1) + b.vulnerabilities.length;
        return scoreB - scoreA;
      })
      .slice(0, targetCount);

    return selected.length > 0 ? selected : [nodes[0]]; // Fallback to first node
  }

  private generateThreatPhases(
    type: ThreatType,
    targetNodes: NetworkNode[],
    complexity: 'simple' | 'moderate' | 'complex'
  ): ThreatPhase[] {
    const phaseTemplates = {
      simple: ['Initial Access', 'Impact'],
      moderate: ['Reconnaissance', 'Initial Access', 'Execution', 'Impact'],
      complex: ['Reconnaissance', 'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation', 'Lateral Movement', 'Exfiltration', 'Impact']
    };

    const phaseNames = phaseTemplates[complexity];
    const phases: ThreatPhase[] = [];

    phaseNames.forEach((name, index) => {
      phases.push({
        id: `phase-${index + 1}`,
        name,
        description: this.getPhaseDescription(name, type),
        duration: Math.floor(Math.random() * 30) + 10, // 10-40 minutes
        actions: this.generateThreatActions(name, targetNodes),
        successCriteria: this.getPhaseSuccessCriteria(name),
        detectionProbability: this.getDetectionProbability(name, type)
      });
    });

    return phases;
  }

  private generateThreatActions(phaseName: string, targetNodes: NetworkNode[]): ThreatAction[] {
    const actions: ThreatAction[] = [];
    const actionCount = Math.floor(Math.random() * 3) + 1;

    for (let i = 0; i < actionCount; i++) {
      const targetNode = targetNodes[Math.floor(Math.random() * targetNodes.length)];
      
      actions.push({
        id: `action-${Date.now()}-${i}`,
        type: this.getActionType(phaseName),
        description: this.getActionDescription(phaseName, targetNode),
        targetNodeId: targetNode.id,
        technique: this.getActionTechnique(phaseName),
        duration: Math.floor(Math.random() * 300) + 60, // 1-5 minutes
        successProbability: Math.random() * 0.4 + 0.6, // 60-100%
        detectionSignatures: this.getDetectionSignatures(phaseName),
        artifacts: this.getActionArtifacts(phaseName)
      });
    }

    return actions;
  }

  private generateThreatIndicators(type: ThreatType, targetNodes: NetworkNode[]): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];
    const indicatorCount = Math.floor(Math.random() * 5) + 3;

    const indicatorTemplates = [
      {
        type: 'ioc' as const,
        value: '192.168.1.100',
        description: 'Suspicious IP address communicating with compromised systems'
      },
      {
        type: 'file' as const,
        value: 'malware.exe',
        description: 'Malicious executable detected on target system'
      },
      {
        type: 'network' as const,
        value: 'TCP:443 -> external',
        description: 'Unusual outbound HTTPS traffic to external servers'
      },
      {
        type: 'behavioral' as const,
        value: 'privilege-escalation-attempt',
        description: 'Multiple failed privilege escalation attempts detected'
      }
    ];

    for (let i = 0; i < indicatorCount; i++) {
      const template = indicatorTemplates[Math.floor(Math.random() * indicatorTemplates.length)];
      
      indicators.push({
        id: `indicator-${Date.now()}-${i}`,
        type: template.type,
        value: template.value,
        description: template.description,
        confidence: Math.random() * 0.3 + 0.7, // 70-100%
        severity: this.getRandomSeverity(),
        firstSeen: new Date(Date.now() - Math.random() * 24 * 60 * 60 * 1000),
        lastSeen: new Date(),
        sources: ['SIEM', 'EDR', 'Network Monitor']
      });
    }

    return indicators;
  }

  private generateThreatTimeline(phases: ThreatPhase[]): ThreatEvent[] {
    const events: ThreatEvent[] = [];
    let currentTime = new Date();

    phases.forEach(phase => {
      phase.actions.forEach(action => {
        // Detection event
        if (Math.random() < phase.detectionProbability) {
          events.push({
            id: `event-${Date.now()}-${events.length}`,
            timestamp: new Date(currentTime.getTime() + Math.random() * action.duration * 1000),
            type: 'detection',
            description: `Suspicious activity detected: ${action.description}`,
            nodeId: action.targetNodeId,
            severity: this.getRandomSeverity(),
            confidence: Math.random() * 0.3 + 0.7,
            evidence: action.detectionSignatures,
            response: 'Alert generated and sent to security team'
          });
        }

        // Action event
        events.push({
          id: `event-${Date.now()}-${events.length}`,
          timestamp: new Date(currentTime.getTime() + action.duration * 1000),
          type: 'action',
          description: action.description,
          nodeId: action.targetNodeId,
          severity: this.getRandomSeverity(),
          confidence: action.successProbability,
          evidence: action.artifacts
        });

        currentTime = new Date(currentTime.getTime() + action.duration * 1000);
      });
    });

    return events.sort((a, b) => a.timestamp.getTime() - b.timestamp.getTime());
  }

  private calculateBusinessImpact(type: ThreatType, targetNodes: NetworkNode[]): BusinessImpact {
    const baseImpact = {
      'apt': { financial: 500000, downtime: 240, data: 10000, reputation: 'high' as const },
      'ransomware': { financial: 200000, downtime: 480, data: 5000, reputation: 'high' as const },
      'malware': { financial: 50000, downtime: 120, data: 1000, reputation: 'medium' as const },
      'phishing': { financial: 25000, downtime: 60, data: 500, reputation: 'medium' as const },
      'ddos': { financial: 100000, downtime: 180, data: 0, reputation: 'medium' as const },
      'insider-threat': { financial: 300000, downtime: 120, data: 8000, reputation: 'high' as const },
      'data-breach': { financial: 400000, downtime: 180, data: 15000, reputation: 'high' as const },
      'privilege-escalation': { financial: 75000, downtime: 90, data: 2000, reputation: 'medium' as const },
      'lateral-movement': { financial: 100000, downtime: 120, data: 3000, reputation: 'medium' as const },
      'exfiltration': { financial: 350000, downtime: 60, data: 12000, reputation: 'high' as const }
    }[type] || { financial: 50000, downtime: 60, data: 1000, reputation: 'low' as const };

    // Scale impact based on target criticality
    const criticalityMultiplier = targetNodes.reduce((sum, node) => {
      const multiplier = node.criticality === 'critical' ? 2 : node.criticality === 'high' ? 1.5 : 1;
      return sum + multiplier;
    }, 0) / targetNodes.length;

    return {
      financialLoss: Math.floor(baseImpact.financial * criticalityMultiplier),
      downtime: Math.floor(baseImpact.downtime * criticalityMultiplier),
      dataCompromised: Math.floor(baseImpact.data * criticalityMultiplier),
      reputationDamage: baseImpact.reputation,
      complianceViolations: type === 'data-breach' ? ['GDPR', 'HIPAA'] : [],
      recoveryTime: Math.floor(baseImpact.downtime * criticalityMultiplier / 60),
      affectedSystems: targetNodes.map(n => n.name)
    };
  }

  // Helper methods
  private calculateScenarioDuration(complexity: 'simple' | 'moderate' | 'complex'): number {
    const baseDuration = { simple: 30, moderate: 60, complex: 120 }[complexity];
    return baseDuration + Math.floor(Math.random() * 30);
  }

  private getPhaseDescription(phaseName: string, type: ThreatType): string {
    const descriptions = {
      'Reconnaissance': 'Gathering information about target systems and network topology',
      'Initial Access': 'Gaining initial foothold in the target environment',
      'Execution': 'Running malicious code on target systems',
      'Persistence': 'Establishing mechanisms to maintain access',
      'Privilege Escalation': 'Gaining higher-level permissions',
      'Lateral Movement': 'Moving through the network to access additional systems',
      'Exfiltration': 'Stealing and transferring sensitive data',
      'Impact': 'Achieving final objectives and causing damage'
    };
    return descriptions[phaseName as keyof typeof descriptions] || 'Unknown phase';
  }

  private getActionType(phaseName: string): ThreatAction['type'] {
    const typeMap = {
      'Reconnaissance': 'reconnaissance',
      'Initial Access': 'initial-access',
      'Execution': 'execution',
      'Persistence': 'persistence',
      'Privilege Escalation': 'privilege-escalation',
      'Lateral Movement': 'lateral-movement',
      'Exfiltration': 'exfiltration',
      'Impact': 'impact'
    };
    return (typeMap[phaseName as keyof typeof typeMap] || 'execution') as ThreatAction['type'];
  }

  private getActionDescription(phaseName: string, targetNode: NetworkNode): string {
    return `${phaseName} activity targeting ${targetNode.name} (${targetNode.ipAddress})`;
  }

  private getActionTechnique(phaseName: string): string {
    const techniques = {
      'Reconnaissance': 'Network scanning and enumeration',
      'Initial Access': 'Spear-phishing email',
      'Execution': 'PowerShell script execution',
      'Persistence': 'Registry modification',
      'Privilege Escalation': 'Token impersonation',
      'Lateral Movement': 'Pass-the-hash attack',
      'Exfiltration': 'HTTPS data transfer',
      'Impact': 'File encryption'
    };
    return techniques[phaseName as keyof typeof techniques] || 'Unknown technique';
  }

  private getDetectionSignatures(phaseName: string): string[] {
    const signatures = {
      'Reconnaissance': ['Port scan detected', 'DNS enumeration'],
      'Initial Access': ['Suspicious email attachment', 'Macro execution'],
      'Execution': ['PowerShell execution', 'Process creation'],
      'Persistence': ['Registry modification', 'Scheduled task creation'],
      'Privilege Escalation': ['Token manipulation', 'Service creation'],
      'Lateral Movement': ['SMB authentication', 'Remote execution'],
      'Exfiltration': ['Large data transfer', 'Encrypted communication'],
      'Impact': ['File modification', 'Encryption activity']
    };
    return signatures[phaseName as keyof typeof signatures] || ['Unknown signature'];
  }

  private getActionArtifacts(phaseName: string): string[] {
    const artifacts = {
      'Reconnaissance': ['Network scan logs', 'DNS queries'],
      'Initial Access': ['Email headers', 'Attachment hash'],
      'Execution': ['Process logs', 'Command line'],
      'Persistence': ['Registry entries', 'File system changes'],
      'Privilege Escalation': ['Token logs', 'Service logs'],
      'Lateral Movement': ['Authentication logs', 'Network connections'],
      'Exfiltration': ['Network traffic', 'File access logs'],
      'Impact': ['File system changes', 'Encryption keys']
    };
    return artifacts[phaseName as keyof typeof artifacts] || ['Unknown artifact'];
  }

  private getPhaseSuccessCriteria(phaseName: string): string[] {
    const criteria = {
      'Reconnaissance': ['Target systems identified', 'Network topology mapped'],
      'Initial Access': ['Foothold established', 'Initial system compromised'],
      'Execution': ['Malicious code executed', 'System control gained'],
      'Persistence': ['Backdoor installed', 'Persistent access established'],
      'Privilege Escalation': ['Administrative privileges obtained', 'System access elevated'],
      'Lateral Movement': ['Additional systems compromised', 'Network traversal successful'],
      'Exfiltration': ['Sensitive data accessed', 'Data successfully transferred'],
      'Impact': ['Primary objectives achieved', 'Target damage inflicted']
    };
    return criteria[phaseName as keyof typeof criteria] || ['Unknown criteria'];
  }

  private getDetectionProbability(phaseName: string, type: ThreatType): number {
    const baseProbability = {
      'Reconnaissance': 0.3,
      'Initial Access': 0.5,
      'Execution': 0.7,
      'Persistence': 0.6,
      'Privilege Escalation': 0.8,
      'Lateral Movement': 0.7,
      'Exfiltration': 0.9,
      'Impact': 0.95
    }[phaseName] || 0.5;

    // Adjust based on threat sophistication
    const sophisticationModifier = type === 'apt' ? -0.2 : type === 'phishing' ? 0.1 : 0;
    
    return Math.max(0.1, Math.min(0.95, baseProbability + sophisticationModifier));
  }

  private getRandomSeverity(): ThreatSeverity {
    const rand = Math.random();
    if (rand < 0.1) return 'critical';
    if (rand < 0.3) return 'high';
    if (rand < 0.7) return 'medium';
    return 'low';
  }
}

// Export instances
export const networkTopologyGenerator = new NetworkTopologyGenerator();
export const threatScenarioGenerator = new ThreatScenarioGenerator();

// Export types for use in other modules
export type {
  NetworkNode,
  NetworkConnection,
  NetworkService,
  NetworkTraffic,
  Vulnerability,
  ThreatScenario,
  ThreatPhase,
  ThreatAction,
  ThreatIndicator,
  ThreatEvent,
  BusinessImpact
};