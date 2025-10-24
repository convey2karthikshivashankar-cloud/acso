/**
 * Threat Detection Engine
 * 
 * Advanced threat detection system with ML-based pattern recognition,
 * behavioral analysis, and real-time threat scoring.
 */

import {
  NetworkNode,
  NetworkTraffic,
  ThreatIndicator,
  ThreatEvent,
  ThreatSeverity,
  Vulnerability
} from './threatScenarioGenerator';
import { DEMO_CONFIG } from '../config/demoConfig';

// Detection rule types
export type DetectionRuleType = 
  | 'signature' 
  | 'behavioral' 
  | 'anomaly' 
  | 'heuristic' 
  | 'ml-based'
  | 'correlation';

// Detection confidence levels
export type ConfidenceLevel = 'low' | 'medium' | 'high' | 'critical';

// Threat detection interfaces
export interface DetectionRule {
  id: string;
  name: string;
  type: DetectionRuleType;
  description: string;
  severity: ThreatSeverity;
  confidence: number; // 0-1
  pattern: string | RegExp;
  conditions: DetectionCondition[];
  actions: DetectionAction[];
  enabled: boolean;
  lastUpdated: Date;
  metadata: {
    author?: string;
    version?: string;
    references?: string[];
    mitreTactics?: string[];
    mitreId?: string;
  };
}

export interface DetectionCondition {
  field: string;
  operator: 'equals' | 'contains' | 'matches' | 'greater_than' | 'less_than' | 'in_range';
  value: any;
  weight: number; // Contribution to overall confidence
}

export interface DetectionAction {
  type: 'alert' | 'block' | 'quarantine' | 'investigate' | 'escalate';
  parameters: Record<string, any>;
  priority: 'low' | 'medium' | 'high' | 'critical';
}

export interface ThreatDetection {
  id: string;
  timestamp: Date;
  ruleId: string;
  ruleName: string;
  nodeId: string;
  severity: ThreatSeverity;
  confidence: number;
  score: number; // Risk score 0-100
  description: string;
  evidence: DetectionEvidence[];
  indicators: ThreatIndicator[];
  recommendations: string[];
  status: 'new' | 'investigating' | 'confirmed' | 'false_positive' | 'resolved';
  assignedTo?: string;
  tags: string[];
}

export interface DetectionEvidence {
  type: 'network' | 'process' | 'file' | 'registry' | 'memory' | 'behavioral';
  source: string;
  timestamp: Date;
  data: any;
  relevance: number; // 0-1
  description: string;
}

export interface BehavioralProfile {
  nodeId: string;
  baseline: {
    networkTraffic: NetworkTrafficBaseline;
    processActivity: ProcessActivityBaseline;
    fileAccess: FileAccessBaseline;
    loginPatterns: LoginPatternBaseline;
  };
  currentActivity: {
    networkTraffic: NetworkTrafficActivity;
    processActivity: ProcessActivityActivity;
    fileAccess: FileAccessActivity;
    loginPatterns: LoginPatternActivity;
  };
  anomalyScore: number; // 0-100
  lastUpdated: Date;
}

export interface NetworkTrafficBaseline {
  avgBytesPerHour: number;
  avgConnectionsPerHour: number;
  commonPorts: number[];
  commonDestinations: string[];
  peakHours: number[];
  protocolDistribution: Record<string, number>;
}

export interface NetworkTrafficActivity {
  currentBytesPerHour: number;
  currentConnectionsPerHour: number;
  activePorts: number[];
  activeDestinations: string[];
  currentHour: number;
  protocolDistribution: Record<string, number>;
  suspiciousConnections: string[];
}

export interface ProcessActivityBaseline {
  commonProcesses: string[];
  avgCpuUsage: number;
  avgMemoryUsage: number;
  processStartTimes: Record<string, number[]>;
  parentChildRelationships: Record<string, string[]>;
}

export interface ProcessActivityActivity {
  currentProcesses: string[];
  currentCpuUsage: number;
  currentMemoryUsage: number;
  newProcesses: string[];
  suspiciousProcesses: string[];
  unusualParentChild: Array<{ parent: string; child: string }>;
}

export interface FileAccessBaseline {
  commonDirectories: string[];
  fileAccessPatterns: Record<string, number>;
  avgFilesAccessedPerHour: number;
  commonFileTypes: string[];
}

export interface FileAccessActivity {
  currentDirectories: string[];
  currentFileAccess: Record<string, number>;
  currentFilesAccessedPerHour: number;
  currentFileTypes: string[];
  suspiciousFileAccess: string[];
  encryptionActivity: boolean;
}

export interface LoginPatternBaseline {
  commonLoginTimes: number[];
  commonLoginSources: string[];
  avgSessionDuration: number;
  failedLoginRate: number;
}

export interface LoginPatternActivity {
  currentLoginTime: number;
  currentLoginSource: string;
  currentSessionDuration: number;
  recentFailedLogins: number;
  suspiciousLoginAttempts: boolean;
}

export interface MLModel {
  id: string;
  name: string;
  type: 'anomaly_detection' | 'classification' | 'clustering' | 'time_series';
  version: string;
  accuracy: number;
  lastTrained: Date;
  features: string[];
  parameters: Record<string, any>;
  enabled: boolean;
}

export interface ThreatIntelligence {
  indicators: ThreatIndicator[];
  feeds: ThreatFeed[];
  reputation: ReputationData[];
  signatures: DetectionRule[];
  lastUpdated: Date;
}

export interface ThreatFeed {
  id: string;
  name: string;
  source: string;
  type: 'ioc' | 'signature' | 'reputation' | 'behavioral';
  updateFrequency: number; // minutes
  lastUpdate: Date;
  enabled: boolean;
  reliability: number; // 0-1
}

export interface ReputationData {
  indicator: string;
  type: 'ip' | 'domain' | 'url' | 'hash' | 'email';
  reputation: 'malicious' | 'suspicious' | 'unknown' | 'benign';
  confidence: number;
  sources: string[];
  firstSeen: Date;
  lastSeen: Date;
}

// Threat Detection Engine Implementation
class ThreatDetectionEngine {
  private detectionRules: Map<string, DetectionRule> = new Map();
  private behavioralProfiles: Map<string, BehavioralProfile> = new Map();
  private mlModels: Map<string, MLModel> = new Map();
  private threatIntelligence: ThreatIntelligence;
  private detectionHistory: ThreatDetection[] = [];
  private isRunning = false;

  constructor() {
    this.threatIntelligence = {
      indicators: [],
      feeds: [],
      reputation: [],
      signatures: [],
      lastUpdated: new Date()
    };
    
    this.initializeDefaultRules();
    this.initializeMLModels();
  }

  /**
   * Initialize default detection rules
   */
  private initializeDefaultRules(): void {
    const defaultRules: DetectionRule[] = [
      {
        id: 'rule-001',
        name: 'Suspicious Network Traffic',
        type: 'behavioral',
        description: 'Detects unusual network traffic patterns indicating potential data exfiltration',
        severity: 'high',
        confidence: 0.85,
        pattern: 'network_anomaly',
        conditions: [
          { field: 'bytes_per_hour', operator: 'greater_than', value: 1000000, weight: 0.4 },
          { field: 'connection_count', operator: 'greater_than', value: 100, weight: 0.3 },
          { field: 'external_connections', operator: 'greater_than', value: 10, weight: 0.3 }
        ],
        actions: [
          { type: 'alert', parameters: { priority: 'high' }, priority: 'high' },
          { type: 'investigate', parameters: { auto_collect_evidence: true }, priority: 'medium' }
        ],
        enabled: true,
        lastUpdated: new Date(),
        metadata: {
          author: 'ACSO Threat Detection',
          version: '1.0',
          mitreTactics: ['TA0010'], // Exfiltration
          mitreId: 'T1041'
        }
      },
      {
        id: 'rule-002',
        name: 'Malware Process Detection',
        type: 'signature',
        description: 'Identifies known malware processes and suspicious executable behavior',
        severity: 'critical',
        confidence: 0.95,
        pattern: /malware|trojan|backdoor|keylogger/i,
        conditions: [
          { field: 'process_name', operator: 'matches', value: /malware|trojan|backdoor/i, weight: 0.6 },
          { field: 'unsigned_executable', operator: 'equals', value: true, weight: 0.2 },
          { field: 'network_connections', operator: 'greater_than', value: 5, weight: 0.2 }
        ],
        actions: [
          { type: 'alert', parameters: { priority: 'critical' }, priority: 'critical' },
          { type: 'quarantine', parameters: { isolate_process: true }, priority: 'high' },
          { type: 'escalate', parameters: { notify_soc: true }, priority: 'high' }
        ],
        enabled: true,
        lastUpdated: new Date(),
        metadata: {
          author: 'ACSO Threat Detection',
          version: '1.0',
          mitreTactics: ['TA0002', 'TA0003'], // Execution, Persistence
          mitreId: 'T1055'
        }
      },
      {
        id: 'rule-003',
        name: 'Privilege Escalation Attempt',
        type: 'heuristic',
        description: 'Detects attempts to escalate privileges or gain unauthorized access',
        severity: 'high',
        confidence: 0.80,
        pattern: 'privilege_escalation',
        conditions: [
          { field: 'failed_login_attempts', operator: 'greater_than', value: 5, weight: 0.3 },
          { field: 'admin_access_attempts', operator: 'greater_than', value: 3, weight: 0.4 },
          { field: 'unusual_login_time', operator: 'equals', value: true, weight: 0.3 }
        ],
        actions: [
          { type: 'alert', parameters: { priority: 'high' }, priority: 'high' },
          { type: 'block', parameters: { block_user: true, duration: 3600 }, priority: 'medium' }
        ],
        enabled: true,
        lastUpdated: new Date(),
        metadata: {
          author: 'ACSO Threat Detection',
          version: '1.0',
          mitreTactics: ['TA0004'], // Privilege Escalation
          mitreId: 'T1068'
        }
      },
      {
        id: 'rule-004',
        name: 'Lateral Movement Detection',
        type: 'correlation',
        description: 'Identifies lateral movement patterns across network nodes',
        severity: 'high',
        confidence: 0.75,
        pattern: 'lateral_movement',
        conditions: [
          { field: 'cross_node_connections', operator: 'greater_than', value: 3, weight: 0.4 },
          { field: 'credential_reuse', operator: 'equals', value: true, weight: 0.3 },
          { field: 'time_window', operator: 'less_than', value: 3600, weight: 0.3 }
        ],
        actions: [
          { type: 'alert', parameters: { priority: 'high' }, priority: 'high' },
          { type: 'investigate', parameters: { trace_connections: true }, priority: 'medium' }
        ],
        enabled: true,
        lastUpdated: new Date(),
        metadata: {
          author: 'ACSO Threat Detection',
          version: '1.0',
          mitreTactics: ['TA0008'], // Lateral Movement
          mitreId: 'T1021'
        }
      },
      {
        id: 'rule-005',
        name: 'Data Exfiltration Pattern',
        type: 'ml-based',
        description: 'ML-based detection of data exfiltration patterns and anomalous data transfers',
        severity: 'critical',
        confidence: 0.88,
        pattern: 'data_exfiltration_ml',
        conditions: [
          { field: 'data_volume_anomaly', operator: 'greater_than', value: 0.8, weight: 0.5 },
          { field: 'encryption_activity', operator: 'equals', value: true, weight: 0.3 },
          { field: 'external_transfer', operator: 'equals', value: true, weight: 0.2 }
        ],
        actions: [
          { type: 'alert', parameters: { priority: 'critical' }, priority: 'critical' },
          { type: 'block', parameters: { block_network: true }, priority: 'high' },
          { type: 'escalate', parameters: { immediate_response: true }, priority: 'critical' }
        ],
        enabled: true,
        lastUpdated: new Date(),
        metadata: {
          author: 'ACSO Threat Detection',
          version: '1.0',
          mitreTactics: ['TA0010'], // Exfiltration
          mitreId: 'T1041'
        }
      }
    ];

    defaultRules.forEach(rule => {
      this.detectionRules.set(rule.id, rule);
    });
  }

  /**
   * Initialize ML models for threat detection
   */
  private initializeMLModels(): void {
    const models: MLModel[] = [
      {
        id: 'anomaly-detector-v1',
        name: 'Network Anomaly Detector',
        type: 'anomaly_detection',
        version: '1.2.3',
        accuracy: 0.92,
        lastTrained: new Date(Date.now() - 7 * 24 * 60 * 60 * 1000), // 7 days ago
        features: ['bytes_per_hour', 'connection_count', 'port_diversity', 'protocol_distribution'],
        parameters: {
          threshold: 0.8,
          window_size: 3600,
          sensitivity: 0.7
        },
        enabled: true
      },
      {
        id: 'malware-classifier-v2',
        name: 'Malware Classification Model',
        type: 'classification',
        version: '2.1.0',
        accuracy: 0.96,
        lastTrained: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        features: ['file_hash', 'file_size', 'entropy', 'pe_characteristics', 'behavior_patterns'],
        parameters: {
          confidence_threshold: 0.85,
          feature_importance: {
            file_hash: 0.3,
            behavior_patterns: 0.4,
            pe_characteristics: 0.3
          }
        },
        enabled: true
      },
      {
        id: 'behavioral-analyzer-v1',
        name: 'Behavioral Pattern Analyzer',
        type: 'clustering',
        version: '1.0.5',
        accuracy: 0.89,
        lastTrained: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000), // 5 days ago
        features: ['login_patterns', 'file_access', 'network_behavior', 'process_activity'],
        parameters: {
          cluster_count: 10,
          deviation_threshold: 2.5,
          learning_rate: 0.01
        },
        enabled: true
      }
    ];

    models.forEach(model => {
      this.mlModels.set(model.id, model);
    });
  }

  /**
   * Start the threat detection engine
   */
  public start(): void {
    this.isRunning = true;
    console.log('Threat Detection Engine started');
  }

  /**
   * Stop the threat detection engine
   */
  public stop(): void {
    this.isRunning = false;
    console.log('Threat Detection Engine stopped');
  }

  /**
   * Analyze network node for threats
   */
  public analyzeNode(node: NetworkNode, traffic: NetworkTraffic[]): ThreatDetection[] {
    if (!this.isRunning) return [];

    const detections: ThreatDetection[] = [];
    
    // Update behavioral profile
    this.updateBehavioralProfile(node, traffic);
    
    // Run detection rules
    for (const rule of this.detectionRules.values()) {
      if (!rule.enabled) continue;
      
      const detection = this.evaluateRule(rule, node, traffic);
      if (detection) {
        detections.push(detection);
      }
    }
    
    // Run ML-based detection
    const mlDetections = this.runMLDetection(node, traffic);
    detections.push(...mlDetections);
    
    // Store detections
    detections.forEach(detection => {
      this.detectionHistory.push(detection);
    });
    
    // Keep only recent detections
    this.detectionHistory = this.detectionHistory
      .filter(d => Date.now() - d.timestamp.getTime() < 24 * 60 * 60 * 1000) // Last 24 hours
      .slice(-1000); // Keep last 1000 detections
    
    return detections;
  }

  /**
   * Update behavioral profile for a node
   */
  private updateBehavioralProfile(node: NetworkNode, traffic: NetworkTraffic[]): void {
    let profile = this.behavioralProfiles.get(node.id);
    
    if (!profile) {
      profile = this.createInitialProfile(node);
      this.behavioralProfiles.set(node.id, profile);
    }
    
    // Update current activity
    profile.currentActivity = this.calculateCurrentActivity(node, traffic);
    
    // Calculate anomaly score
    profile.anomalyScore = this.calculateAnomalyScore(profile);
    
    profile.lastUpdated = new Date();
  }

  /**
   * Create initial behavioral profile
   */
  private createInitialProfile(node: NetworkNode): BehavioralProfile {
    return {
      nodeId: node.id,
      baseline: {
        networkTraffic: {
          avgBytesPerHour: Math.random() * 1000000 + 100000,
          avgConnectionsPerHour: Math.random() * 50 + 10,
          commonPorts: [80, 443, 22, 3389],
          commonDestinations: ['internal-server-1', 'external-api'],
          peakHours: [9, 10, 11, 14, 15, 16],
          protocolDistribution: { 'TCP': 0.7, 'UDP': 0.2, 'ICMP': 0.1 }
        },
        processActivity: {
          commonProcesses: ['explorer.exe', 'chrome.exe', 'outlook.exe'],
          avgCpuUsage: Math.random() * 30 + 10,
          avgMemoryUsage: Math.random() * 4000 + 2000,
          processStartTimes: {},
          parentChildRelationships: {}
        },
        fileAccess: {
          commonDirectories: ['C:\\Users', 'C:\\Program Files', 'D:\\Data'],
          fileAccessPatterns: {},
          avgFilesAccessedPerHour: Math.random() * 100 + 20,
          commonFileTypes: ['.docx', '.xlsx', '.pdf', '.txt']
        },
        loginPatterns: {
          commonLoginTimes: [8, 9, 13, 14],
          commonLoginSources: ['192.168.1.100', '10.0.1.50'],
          avgSessionDuration: Math.random() * 28800 + 14400, // 4-12 hours
          failedLoginRate: Math.random() * 0.05 // 0-5%
        }
      },
      currentActivity: {
        networkTraffic: {
          currentBytesPerHour: 0,
          currentConnectionsPerHour: 0,
          activePorts: [],
          activeDestinations: [],
          currentHour: new Date().getHours(),
          protocolDistribution: {},
          suspiciousConnections: []
        },
        processActivity: {
          currentProcesses: [],
          currentCpuUsage: 0,
          currentMemoryUsage: 0,
          newProcesses: [],
          suspiciousProcesses: [],
          unusualParentChild: []
        },
        fileAccess: {
          currentDirectories: [],
          currentFileAccess: {},
          currentFilesAccessedPerHour: 0,
          currentFileTypes: [],
          suspiciousFileAccess: [],
          encryptionActivity: false
        },
        loginPatterns: {
          currentLoginTime: new Date().getHours(),
          currentLoginSource: '',
          currentSessionDuration: 0,
          recentFailedLogins: 0,
          suspiciousLoginAttempts: false
        }
      },
      anomalyScore: 0,
      lastUpdated: new Date()
    };
  }

  /**
   * Calculate current activity metrics
   */
  private calculateCurrentActivity(node: NetworkNode, traffic: NetworkTraffic[]): BehavioralProfile['currentActivity'] {
    const now = new Date();
    const hourAgo = new Date(now.getTime() - 60 * 60 * 1000);
    
    const recentTraffic = traffic.filter(t => t.timestamp >= hourAgo);
    
    return {
      networkTraffic: {
        currentBytesPerHour: recentTraffic.reduce((sum, t) => sum + t.bytes, 0),
        currentConnectionsPerHour: recentTraffic.length,
        activePorts: [...new Set(recentTraffic.map(t => t.port))],
        activeDestinations: [...new Set(recentTraffic.map(t => t.targetIp))],
        currentHour: now.getHours(),
        protocolDistribution: this.calculateProtocolDistribution(recentTraffic),
        suspiciousConnections: recentTraffic.filter(t => t.suspicious).map(t => t.targetIp)
      },
      processActivity: {
        currentProcesses: this.generateCurrentProcesses(),
        currentCpuUsage: Math.random() * 50 + 10,
        currentMemoryUsage: Math.random() * 6000 + 2000,
        newProcesses: this.generateNewProcesses(),
        suspiciousProcesses: this.generateSuspiciousProcesses(),
        unusualParentChild: []
      },
      fileAccess: {
        currentDirectories: ['C:\\Users\\Current', 'D:\\Work'],
        currentFileAccess: {},
        currentFilesAccessedPerHour: Math.random() * 150 + 50,
        currentFileTypes: ['.docx', '.xlsx', '.pdf'],
        suspiciousFileAccess: [],
        encryptionActivity: Math.random() < 0.1 // 10% chance
      },
      loginPatterns: {
        currentLoginTime: now.getHours(),
        currentLoginSource: node.ipAddress,
        currentSessionDuration: Math.random() * 14400 + 3600, // 1-5 hours
        recentFailedLogins: Math.floor(Math.random() * 3),
        suspiciousLoginAttempts: Math.random() < 0.05 // 5% chance
      }
    };
  }

  /**
   * Calculate anomaly score based on behavioral profile
   */
  private calculateAnomalyScore(profile: BehavioralProfile): number {
    let score = 0;
    let factors = 0;

    // Network traffic anomalies
    const trafficRatio = profile.currentActivity.networkTraffic.currentBytesPerHour / 
                        profile.baseline.networkTraffic.avgBytesPerHour;
    if (trafficRatio > 2 || trafficRatio < 0.1) {
      score += 25;
    }
    factors++;

    // Connection anomalies
    const connectionRatio = profile.currentActivity.networkTraffic.currentConnectionsPerHour / 
                           profile.baseline.networkTraffic.avgConnectionsPerHour;
    if (connectionRatio > 3 || connectionRatio < 0.1) {
      score += 20;
    }
    factors++;

    // Suspicious connections
    if (profile.currentActivity.networkTraffic.suspiciousConnections.length > 0) {
      score += 30;
    }
    factors++;

    // Process anomalies
    if (profile.currentActivity.processActivity.suspiciousProcesses.length > 0) {
      score += 35;
    }
    factors++;

    // Login anomalies
    if (profile.currentActivity.loginPatterns.suspiciousLoginAttempts) {
      score += 25;
    }
    factors++;

    // File access anomalies
    if (profile.currentActivity.fileAccess.encryptionActivity) {
      score += 15;
    }
    factors++;

    return Math.min(100, score / factors);
  }

  /**
   * Evaluate detection rule against node data
   */
  private evaluateRule(rule: DetectionRule, node: NetworkNode, traffic: NetworkTraffic[]): ThreatDetection | null {
    const profile = this.behavioralProfiles.get(node.id);
    if (!profile) return null;

    let totalScore = 0;
    let totalWeight = 0;
    const evidence: DetectionEvidence[] = [];

    // Evaluate conditions
    for (const condition of rule.conditions) {
      const { matches, value } = this.evaluateCondition(condition, node, profile, traffic);
      
      if (matches) {
        totalScore += condition.weight;
        evidence.push({
          type: 'behavioral',
          source: rule.name,
          timestamp: new Date(),
          data: { field: condition.field, value, expected: condition.value },
          relevance: condition.weight,
          description: `Condition ${condition.field} ${condition.operator} ${condition.value} matched with value ${value}`
        });
      }
      
      totalWeight += condition.weight;
    }

    const confidence = totalWeight > 0 ? totalScore / totalWeight : 0;
    
    // Check if detection threshold is met
    if (confidence >= 0.6) { // 60% threshold
      return {
        id: `detection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ruleId: rule.id,
        ruleName: rule.name,
        nodeId: node.id,
        severity: rule.severity,
        confidence: confidence * rule.confidence,
        score: Math.min(100, confidence * 100),
        description: `${rule.description} (Confidence: ${Math.round(confidence * 100)}%)`,
        evidence,
        indicators: this.generateThreatIndicators(rule, node, evidence),
        recommendations: this.generateRecommendations(rule, confidence),
        status: 'new',
        tags: [rule.type, rule.severity, ...(rule.metadata.mitreTactics || [])]
      };
    }

    return null;
  }

  /**
   * Evaluate individual detection condition
   */
  private evaluateCondition(
    condition: DetectionCondition, 
    node: NetworkNode, 
    profile: BehavioralProfile, 
    traffic: NetworkTraffic[]
  ): { matches: boolean; value: any } {
    let value: any;

    // Extract value based on field
    switch (condition.field) {
      case 'bytes_per_hour':
        value = profile.currentActivity.networkTraffic.currentBytesPerHour;
        break;
      case 'connection_count':
        value = profile.currentActivity.networkTraffic.currentConnectionsPerHour;
        break;
      case 'external_connections':
        value = profile.currentActivity.networkTraffic.suspiciousConnections.length;
        break;
      case 'process_name':
        value = profile.currentActivity.processActivity.currentProcesses.join(',');
        break;
      case 'unsigned_executable':
        value = profile.currentActivity.processActivity.suspiciousProcesses.length > 0;
        break;
      case 'network_connections':
        value = profile.currentActivity.networkTraffic.activePorts.length;
        break;
      case 'failed_login_attempts':
        value = profile.currentActivity.loginPatterns.recentFailedLogins;
        break;
      case 'admin_access_attempts':
        value = Math.floor(Math.random() * 5); // Simulated
        break;
      case 'unusual_login_time':
        value = !profile.baseline.loginPatterns.commonLoginTimes.includes(
          profile.currentActivity.loginPatterns.currentLoginTime
        );
        break;
      case 'cross_node_connections':
        value = Math.floor(Math.random() * 5); // Simulated
        break;
      case 'credential_reuse':
        value = Math.random() < 0.3; // 30% chance
        break;
      case 'time_window':
        value = 1800; // 30 minutes
        break;
      case 'data_volume_anomaly':
        value = profile.anomalyScore / 100;
        break;
      case 'encryption_activity':
        value = profile.currentActivity.fileAccess.encryptionActivity;
        break;
      case 'external_transfer':
        value = profile.currentActivity.networkTraffic.suspiciousConnections.length > 0;
        break;
      default:
        value = null;
    }

    // Evaluate condition
    let matches = false;
    switch (condition.operator) {
      case 'equals':
        matches = value === condition.value;
        break;
      case 'contains':
        matches = typeof value === 'string' && value.includes(condition.value);
        break;
      case 'matches':
        matches = condition.value instanceof RegExp ? 
          condition.value.test(String(value)) : 
          String(value).includes(String(condition.value));
        break;
      case 'greater_than':
        matches = Number(value) > Number(condition.value);
        break;
      case 'less_than':
        matches = Number(value) < Number(condition.value);
        break;
      case 'in_range':
        if (Array.isArray(condition.value) && condition.value.length === 2) {
          matches = Number(value) >= condition.value[0] && Number(value) <= condition.value[1];
        }
        break;
    }

    return { matches, value };
  }

  /**
   * Run ML-based threat detection
   */
  private runMLDetection(node: NetworkNode, traffic: NetworkTraffic[]): ThreatDetection[] {
    const detections: ThreatDetection[] = [];
    const profile = this.behavioralProfiles.get(node.id);
    
    if (!profile) return detections;

    // Anomaly detection
    if (profile.anomalyScore > 70) {
      detections.push({
        id: `ml-detection-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
        timestamp: new Date(),
        ruleId: 'ml-anomaly-detector',
        ruleName: 'ML Anomaly Detection',
        nodeId: node.id,
        severity: profile.anomalyScore > 90 ? 'critical' : 'high',
        confidence: profile.anomalyScore / 100,
        score: profile.anomalyScore,
        description: `ML-based anomaly detection identified unusual behavior patterns (Score: ${Math.round(profile.anomalyScore)})`,
        evidence: [{
          type: 'behavioral',
          source: 'ML Anomaly Detector',
          timestamp: new Date(),
          data: { anomalyScore: profile.anomalyScore, baseline: profile.baseline },
          relevance: 0.9,
          description: 'Behavioral pattern significantly deviates from established baseline'
        }],
        indicators: [],
        recommendations: [
          'Investigate recent user activity',
          'Check for unauthorized access',
          'Review network connections',
          'Analyze process execution history'
        ],
        status: 'new',
        tags: ['ml-based', 'anomaly', 'behavioral']
      });
    }

    return detections;
  }

  /**
   * Generate threat indicators from detection
   */
  private generateThreatIndicators(rule: DetectionRule, node: NetworkNode, evidence: DetectionEvidence[]): ThreatIndicator[] {
    const indicators: ThreatIndicator[] = [];

    // Generate IP indicator if network-related
    if (rule.type === 'behavioral' || rule.type === 'correlation') {
      indicators.push({
        id: `indicator-${Date.now()}-ip`,
        type: 'network',
        value: node.ipAddress,
        description: `Suspicious activity detected from IP address ${node.ipAddress}`,
        confidence: 0.8,
        severity: rule.severity,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sources: [rule.name]
      });
    }

    // Generate process indicators if process-related
    if (rule.name.toLowerCase().includes('process') || rule.name.toLowerCase().includes('malware')) {
      indicators.push({
        id: `indicator-${Date.now()}-process`,
        type: 'behavioral',
        value: 'suspicious_process_execution',
        description: 'Suspicious process execution patterns detected',
        confidence: 0.75,
        severity: rule.severity,
        firstSeen: new Date(),
        lastSeen: new Date(),
        sources: [rule.name]
      });
    }

    return indicators;
  }

  /**
   * Generate recommendations based on detection
   */
  private generateRecommendations(rule: DetectionRule, confidence: number): string[] {
    const recommendations: string[] = [];

    if (confidence > 0.8) {
      recommendations.push('Immediate investigation required');
      recommendations.push('Consider isolating affected system');
    }

    if (rule.severity === 'critical') {
      recommendations.push('Escalate to security team immediately');
      recommendations.push('Activate incident response procedures');
    }

    if (rule.type === 'behavioral') {
      recommendations.push('Review user behavior patterns');
      recommendations.push('Check for unauthorized access');
    }

    if (rule.type === 'signature') {
      recommendations.push('Update antivirus signatures');
      recommendations.push('Scan for additional malware');
    }

    return recommendations;
  }

  // Utility methods for generating simulated data
  private calculateProtocolDistribution(traffic: NetworkTraffic[]): Record<string, number> {
    const distribution: Record<string, number> = {};
    const total = traffic.length;
    
    if (total === 0) return distribution;

    traffic.forEach(t => {
      distribution[t.protocol] = (distribution[t.protocol] || 0) + 1;
    });

    Object.keys(distribution).forEach(protocol => {
      distribution[protocol] = distribution[protocol] / total;
    });

    return distribution;
  }

  private generateCurrentProcesses(): string[] {
    const processes = ['explorer.exe', 'chrome.exe', 'outlook.exe', 'winword.exe', 'excel.exe'];
    return processes.filter(() => Math.random() > 0.3);
  }

  private generateNewProcesses(): string[] {
    const newProcesses = ['notepad.exe', 'calc.exe', 'cmd.exe'];
    return newProcesses.filter(() => Math.random() > 0.8);
  }

  private generateSuspiciousProcesses(): string[] {
    if (Math.random() < 0.1) { // 10% chance
      return ['suspicious.exe', 'malware.tmp'];
    }
    return [];
  }

  /**
   * Get detection statistics
   */
  public getDetectionStats(): {
    totalDetections: number;
    criticalDetections: number;
    highDetections: number;
    mediumDetections: number;
    lowDetections: number;
    falsePositiveRate: number;
    averageConfidence: number;
  } {
    const total = this.detectionHistory.length;
    const critical = this.detectionHistory.filter(d => d.severity === 'critical').length;
    const high = this.detectionHistory.filter(d => d.severity === 'high').length;
    const medium = this.detectionHistory.filter(d => d.severity === 'medium').length;
    const low = this.detectionHistory.filter(d => d.severity === 'low').length;
    
    const falsePositives = this.detectionHistory.filter(d => d.status === 'false_positive').length;
    const falsePositiveRate = total > 0 ? falsePositives / total : 0;
    
    const avgConfidence = total > 0 ? 
      this.detectionHistory.reduce((sum, d) => sum + d.confidence, 0) / total : 0;

    return {
      totalDetections: total,
      criticalDetections: critical,
      highDetections: high,
      mediumDetections: medium,
      lowDetections: low,
      falsePositiveRate,
      averageConfidence: avgConfidence
    };
  }

  /**
   * Get recent detections
   */
  public getRecentDetections(limit: number = 50): ThreatDetection[] {
    return this.detectionHistory
      .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
      .slice(0, limit);
  }

  /**
   * Update detection status
   */
  public updateDetectionStatus(detectionId: string, status: ThreatDetection['status']): boolean {
    const detection = this.detectionHistory.find(d => d.id === detectionId);
    if (detection) {
      detection.status = status;
      return true;
    }
    return false;
  }

  /**
   * Get detection rules
   */
  public getDetectionRules(): DetectionRule[] {
    return Array.from(this.detectionRules.values());
  }

  /**
   * Add or update detection rule
   */
  public updateDetectionRule(rule: DetectionRule): void {
    this.detectionRules.set(rule.id, rule);
  }

  /**
   * Get ML models
   */
  public getMLModels(): MLModel[] {
    return Array.from(this.mlModels.values());
  }
}

// Export singleton instance
export const threatDetectionEngine = new ThreatDetectionEngine();

export default threatDetectionEngine;