interface IncidentScenario {
  id: string;
  title: string;
  description: string;
  type: 'security' | 'performance' | 'availability' | 'compliance' | 'operational';
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'contained' | 'resolved' | 'closed';
  priority: number;
  tags: string[];
  affectedSystems: string[];
  timeline: IncidentEvent[];
  indicators: ThreatIndicator[];
  impact: IncidentImpact;
  response: ResponseAction[];
  metadata: Record<string, any>;
  createdAt: Date;
  updatedAt: Date;
}

interface IncidentEvent {
  id: string;
  timestamp: Date;
  type: 'detection' | 'escalation' | 'action' | 'update' | 'resolution';
  title: string;
  description: string;
  actor: string;
  automated: boolean;
  severity?: 'low' | 'medium' | 'high' | 'critical';
}

interface ThreatIndicator {
  id: string;
  type: 'network' | 'file' | 'process' | 'registry' | 'behavior' | 'reputation';
  value: string;
  confidence: number;
  source: string;
  firstSeen: Date;
  lastSeen: Date;
  count: number;
}

interface IncidentImpact {
  businessImpact: 'none' | 'low' | 'medium' | 'high' | 'critical';
  affectedUsers: number;
  estimatedCost: number;
  downtime: number; // minutes
  dataAtRisk: number; // GB
  complianceRisk: boolean;
  reputationRisk: 'low' | 'medium' | 'high';
}

interface ResponseAction {
  id: string;
  type: 'containment' | 'eradication' | 'recovery' | 'investigation' | 'communication';
  title: string;
  description: string;
  status: 'pending' | 'in_progress' | 'completed' | 'failed';
  assignedTo: string;
  priority: number;
  estimatedTime: number; // minutes
  actualTime?: number;
  dependencies: string[];
  createdAt: Date;
  completedAt?: Date;
}

class IncidentScenarioGenerator {
  private scenarioTemplates: Record<string, any> = {
    apt_campaign: {
      title: 'Advanced Persistent Threat Campaign',
      description: 'Sophisticated multi-stage attack with lateral movement and data exfiltration',
      type: 'security',
      severity: 'critical',
      tags: ['apt', 'lateral-movement', 'data-exfiltration', 'persistent'],
      indicators: [
        { type: 'network', value: 'suspicious-domain.com', confidence: 0.9 },
        { type: 'file', value: 'malicious.exe', confidence: 0.95 },
        { type: 'behavior', value: 'privilege-escalation', confidence: 0.85 },
      ],
      impact: {
        businessImpact: 'critical',
        affectedUsers: 500,
        estimatedCost: 250000,
        downtime: 120,
        dataAtRisk: 1000,
        complianceRisk: true,
        reputationRisk: 'high',
      },
    },
    ransomware_attack: {
      title: 'Ransomware Encryption Attack',
      description: 'Widespread file encryption with ransom demand',
      type: 'security',
      severity: 'critical',
      tags: ['ransomware', 'encryption', 'extortion', 'business-disruption'],
      indicators: [
        { type: 'file', value: 'ransom-note.txt', confidence: 1.0 },
        { type: 'behavior', value: 'mass-file-encryption', confidence: 0.98 },
        { type: 'network', value: 'tor-payment-site.onion', confidence: 0.9 },
      ],
      impact: {
        businessImpact: 'critical',
        affectedUsers: 1200,
        estimatedCost: 500000,
        downtime: 480,
        dataAtRisk: 5000,
        complianceRisk: true,
        reputationRisk: 'high',
      },
    },
    phishing_campaign: {
      title: 'Targeted Phishing Campaign',
      description: 'Credential harvesting attack targeting executive staff',
      type: 'security',
      severity: 'high',
      tags: ['phishing', 'credential-theft', 'social-engineering', 'targeted'],
      indicators: [
        { type: 'reputation', value: 'phishing-domain.net', confidence: 0.92 },
        { type: 'behavior', value: 'credential-submission', confidence: 0.88 },
        { type: 'network', value: 'suspicious-login-attempts', confidence: 0.85 },
      ],
      impact: {
        businessImpact: 'high',
        affectedUsers: 50,
        estimatedCost: 75000,
        downtime: 30,
        dataAtRisk: 100,
        complianceRisk: false,
        reputationRisk: 'medium',
      },
    },
    ddos_attack: {
      title: 'Distributed Denial of Service Attack',
      description: 'Large-scale traffic flood targeting public services',
      type: 'availability',
      severity: 'high',
      tags: ['ddos', 'availability', 'traffic-flood', 'service-disruption'],
      indicators: [
        { type: 'network', value: 'traffic-spike-anomaly', confidence: 0.95 },
        { type: 'behavior', value: 'connection-exhaustion', confidence: 0.9 },
        { type: 'network', value: 'botnet-traffic-pattern', confidence: 0.87 },
      ],
      impact: {
        businessImpact: 'high',
        affectedUsers: 10000,
        estimatedCost: 150000,
        downtime: 180,
        dataAtRisk: 0,
        complianceRisk: false,
        reputationRisk: 'medium',
      },
    },
    insider_threat: {
      title: 'Insider Data Exfiltration',
      description: 'Authorized user accessing and exfiltrating sensitive data',
      type: 'security',
      severity: 'high',
      tags: ['insider-threat', 'data-exfiltration', 'privilege-abuse', 'unauthorized-access'],
      indicators: [
        { type: 'behavior', value: 'unusual-data-access', confidence: 0.8 },
        { type: 'behavior', value: 'large-data-transfer', confidence: 0.85 },
        { type: 'behavior', value: 'off-hours-activity', confidence: 0.75 },
      ],
      impact: {
        businessImpact: 'high',
        affectedUsers: 0,
        estimatedCost: 200000,
        downtime: 0,
        dataAtRisk: 2000,
        complianceRisk: true,
        reputationRisk: 'high',
      },
    },
    system_outage: {
      title: 'Critical System Outage',
      description: 'Database server failure causing service disruption',
      type: 'availability',
      severity: 'high',
      tags: ['outage', 'database', 'service-disruption', 'hardware-failure'],
      indicators: [
        { type: 'behavior', value: 'database-connection-failure', confidence: 1.0 },
        { type: 'behavior', value: 'service-unavailable', confidence: 1.0 },
        { type: 'behavior', value: 'error-rate-spike', confidence: 0.95 },
      ],
      impact: {
        businessImpact: 'high',
        affectedUsers: 5000,
        estimatedCost: 100000,
        downtime: 240,
        dataAtRisk: 0,
        complianceRisk: false,
        reputationRisk: 'medium',
      },
    },
    compliance_violation: {
      title: 'Data Privacy Compliance Violation',
      description: 'Unauthorized access to personally identifiable information',
      type: 'compliance',
      severity: 'medium',
      tags: ['compliance', 'privacy', 'pii', 'unauthorized-access', 'gdpr'],
      indicators: [
        { type: 'behavior', value: 'pii-access-violation', confidence: 0.9 },
        { type: 'behavior', value: 'audit-log-anomaly', confidence: 0.85 },
        { type: 'behavior', value: 'policy-violation', confidence: 0.8 },
      ],
      impact: {
        businessImpact: 'medium',
        affectedUsers: 1000,
        estimatedCost: 50000,
        downtime: 0,
        dataAtRisk: 500,
        complianceRisk: true,
        reputationRisk: 'medium',
      },
    },
  };

  generateScenario(scenarioType?: string): IncidentScenario {
    const availableTypes = Object.keys(this.scenarioTemplates);
    const selectedType = scenarioType || availableTypes[Math.floor(Math.random() * availableTypes.length)];
    const template = this.scenarioTemplates[selectedType];

    if (!template) {
      throw new Error(`Unknown scenario type: ${scenarioType}`);
    }

    const scenario: IncidentScenario = {
      id: this.generateIncidentId(),
      title: template.title,
      description: template.description,
      type: template.type,
      severity: template.severity,
      status: 'open',
      priority: this.calculatePriority(template.severity, template.type),
      tags: [...template.tags],
      affectedSystems: this.generateAffectedSystems(template.type),
      timeline: this.generateTimeline(),
      indicators: this.generateIndicators(template.indicators),
      impact: { ...template.impact },
      response: this.generateResponseActions(template.type, template.severity),
      metadata: this.generateMetadata(selectedType),
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    return scenario;
  }

  generateMultipleScenarios(count: number): IncidentScenario[] {
    const scenarios: IncidentScenario[] = [];
    const types = Object.keys(this.scenarioTemplates);

    for (let i = 0; i < count; i++) {
      const type = types[Math.floor(Math.random() * types.length)];
      scenarios.push(this.generateScenario(type));
    }

    return scenarios;
  }

  private generateIncidentId(): string {
    const timestamp = Date.now().toString(36);
    const random = Math.random().toString(36).substring(2, 8);
    return `INC-${timestamp}-${random}`.toUpperCase();
  }

  private calculatePriority(severity: string, type: string): number {
    const severityWeight = {
      low: 1,
      medium: 2,
      high: 3,
      critical: 4,
    };

    const typeWeight = {
      security: 1.5,
      availability: 1.3,
      compliance: 1.2,
      performance: 1.0,
      operational: 0.8,
    };

    return Math.round(
      (severityWeight[severity as keyof typeof severityWeight] || 1) *
      (typeWeight[type as keyof typeof typeWeight] || 1) * 10
    );
  }

  private generateAffectedSystems(type: string): string[] {
    const systemsByType = {
      security: ['web-server-01', 'db-server-02', 'file-server-03', 'workstation-101'],
      availability: ['load-balancer-01', 'web-server-01', 'web-server-02', 'db-server-01'],
      compliance: ['db-server-02', 'file-server-03', 'backup-server-01'],
      performance: ['web-server-01', 'db-server-01', 'cache-server-01'],
      operational: ['monitoring-server-01', 'log-server-01', 'backup-server-01'],
    };

    const systems = systemsByType[type as keyof typeof systemsByType] || systemsByType.security;
    const count = Math.floor(Math.random() * 3) + 1;
    
    return systems.slice(0, count);
  }

  private generateTimeline(): IncidentEvent[] {
    const events: IncidentEvent[] = [];
    const baseTime = Date.now() - (Math.random() * 3600000); // Within last hour

    const eventTemplates = [
      { type: 'detection', title: 'Initial Detection', description: 'Automated monitoring system detected anomalous activity' },
      { type: 'escalation', title: 'Alert Escalated', description: 'Incident escalated to security team for investigation' },
      { type: 'action', title: 'Investigation Started', description: 'Security analyst began detailed investigation' },
      { type: 'action', title: 'Containment Initiated', description: 'Immediate containment measures implemented' },
      { type: 'update', title: 'Status Update', description: 'Incident status updated with current findings' },
    ];

    eventTemplates.forEach((template, index) => {
      events.push({
        id: `event-${index + 1}`,
        timestamp: new Date(baseTime + index * (Math.random() * 600000)), // 10 min intervals
        type: template.type as any,
        title: template.title,
        description: template.description,
        actor: index === 0 ? 'System' : `Analyst-${Math.floor(Math.random() * 3) + 1}`,
        automated: index === 0,
        severity: index === 0 ? 'medium' : undefined,
      });
    });

    return events;
  }

  private generateIndicators(templateIndicators: any[]): ThreatIndicator[] {
    return templateIndicators.map((template, index) => ({
      id: `indicator-${index + 1}`,
      type: template.type,
      value: template.value,
      confidence: template.confidence,
      source: this.getRandomSource(),
      firstSeen: new Date(Date.now() - Math.random() * 3600000),
      lastSeen: new Date(Date.now() - Math.random() * 600000),
      count: Math.floor(Math.random() * 50) + 1,
    }));
  }

  private generateResponseActions(type: string, severity: string): ResponseAction[] {
    const actionsByType = {
      security: [
        { type: 'containment', title: 'Isolate Affected Systems', description: 'Disconnect compromised systems from network' },
        { type: 'investigation', title: 'Forensic Analysis', description: 'Collect and analyze digital evidence' },
        { type: 'eradication', title: 'Remove Threat', description: 'Eliminate malicious artifacts and backdoors' },
        { type: 'recovery', title: 'Restore Services', description: 'Safely restore systems to normal operation' },
      ],
      availability: [
        { type: 'investigation', title: 'Root Cause Analysis', description: 'Identify cause of service disruption' },
        { type: 'recovery', title: 'Service Restoration', description: 'Restore affected services to normal operation' },
        { type: 'containment', title: 'Traffic Redirection', description: 'Redirect traffic to backup systems' },
      ],
      compliance: [
        { type: 'investigation', title: 'Compliance Assessment', description: 'Assess extent of compliance violation' },
        { type: 'containment', title: 'Access Restriction', description: 'Restrict access to sensitive data' },
        { type: 'communication', title: 'Regulatory Notification', description: 'Notify relevant regulatory bodies' },
      ],
    };

    const actions = actionsByType[type as keyof typeof actionsByType] || actionsByType.security;
    
    return actions.map((action, index) => ({
      id: `action-${index + 1}`,
      type: action.type as any,
      title: action.title,
      description: action.description,
      status: this.getRandomActionStatus(),
      assignedTo: `Analyst-${Math.floor(Math.random() * 5) + 1}`,
      priority: Math.floor(Math.random() * 5) + 1,
      estimatedTime: Math.floor(Math.random() * 240) + 30, // 30-270 minutes
      dependencies: index > 0 ? [`action-${index}`] : [],
      createdAt: new Date(),
    }));
  }

  private generateMetadata(scenarioType: string): Record<string, any> {
    return {
      scenarioType,
      generatedAt: new Date().toISOString(),
      version: '1.0',
      source: 'simulation',
      confidence: Math.random() * 0.3 + 0.7, // 70-100%
      riskScore: Math.floor(Math.random() * 40) + 60, // 60-100
      mitreTactics: this.getRandomMitreTactics(),
      geolocation: this.getRandomGeolocation(),
    };
  }

  private getRandomSource(): string {
    const sources = [
      'SIEM', 'EDR', 'Network Monitor', 'Threat Intelligence',
      'User Report', 'Automated Scanner', 'Log Analysis', 'Honeypot'
    ];
    return sources[Math.floor(Math.random() * sources.length)];
  }

  private getRandomActionStatus(): ResponseAction['status'] {
    const statuses: ResponseAction['status'][] = ['pending', 'in_progress', 'completed', 'failed'];
    const weights = [0.3, 0.4, 0.25, 0.05];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random < cumulative) {
        return statuses[i];
      }
    }
    
    return 'pending';
  }

  private getRandomMitreTactics(): string[] {
    const tactics = [
      'Initial Access', 'Execution', 'Persistence', 'Privilege Escalation',
      'Defense Evasion', 'Credential Access', 'Discovery', 'Lateral Movement',
      'Collection', 'Command and Control', 'Exfiltration', 'Impact'
    ];
    
    const count = Math.floor(Math.random() * 4) + 1;
    const selected = [];
    
    for (let i = 0; i < count; i++) {
      const tactic = tactics[Math.floor(Math.random() * tactics.length)];
      if (!selected.includes(tactic)) {
        selected.push(tactic);
      }
    }
    
    return selected;
  }

  private getRandomGeolocation(): { country: string; city: string; coordinates: [number, number] } {
    const locations = [
      { country: 'United States', city: 'New York', coordinates: [40.7128, -74.0060] as [number, number] },
      { country: 'China', city: 'Beijing', coordinates: [39.9042, 116.4074] as [number, number] },
      { country: 'Russia', city: 'Moscow', coordinates: [55.7558, 37.6176] as [number, number] },
      { country: 'Germany', city: 'Berlin', coordinates: [52.5200, 13.4050] as [number, number] },
      { country: 'United Kingdom', city: 'London', coordinates: [51.5074, -0.1278] as [number, number] },
    ];
    
    return locations[Math.floor(Math.random() * locations.length)];
  }

  // Scenario evolution methods
  evolveScenario(scenario: IncidentScenario): IncidentScenario {
    const evolved = { ...scenario };
    
    // Add new timeline event
    const newEvent = this.generateTimelineEvent(scenario.status);
    evolved.timeline.push(newEvent);
    
    // Update status based on timeline
    evolved.status = this.getNextStatus(scenario.status);
    evolved.updatedAt = new Date();
    
    // Update response actions
    evolved.response = evolved.response.map(action => {
      if (action.status === 'in_progress' && Math.random() < 0.3) {
        return {
          ...action,
          status: 'completed',
          completedAt: new Date(),
          actualTime: action.estimatedTime + Math.floor((Math.random() - 0.5) * 60),
        };
      }
      return action;
    });
    
    return evolved;
  }

  private generateTimelineEvent(currentStatus: string): IncidentEvent {
    const eventsByStatus = {
      open: [
        { title: 'Investigation Progress', description: 'Additional evidence collected and analyzed' },
        { title: 'Scope Expansion', description: 'Investigation scope expanded based on new findings' },
      ],
      investigating: [
        { title: 'Containment Progress', description: 'Containment measures showing positive results' },
        { title: 'Evidence Analysis', description: 'Forensic analysis reveals attack methodology' },
      ],
      contained: [
        { title: 'Eradication Started', description: 'Beginning threat eradication procedures' },
        { title: 'System Hardening', description: 'Implementing additional security measures' },
      ],
      resolved: [
        { title: 'Monitoring Phase', description: 'Continuous monitoring for any residual activity' },
        { title: 'Documentation Update', description: 'Incident documentation updated with final details' },
      ],
    };

    const events = eventsByStatus[currentStatus as keyof typeof eventsByStatus] || eventsByStatus.open;
    const event = events[Math.floor(Math.random() * events.length)];

    return {
      id: `event-${Date.now()}`,
      timestamp: new Date(),
      type: 'update',
      title: event.title,
      description: event.description,
      actor: `Analyst-${Math.floor(Math.random() * 3) + 1}`,
      automated: false,
    };
  }

  private getNextStatus(currentStatus: string): IncidentScenario['status'] {
    const statusProgression = {
      open: 'investigating',
      investigating: Math.random() < 0.7 ? 'contained' : 'investigating',
      contained: Math.random() < 0.8 ? 'resolved' : 'contained',
      resolved: Math.random() < 0.9 ? 'closed' : 'resolved',
      closed: 'closed',
    };

    return statusProgression[currentStatus as keyof typeof statusProgression] as IncidentScenario['status'] || currentStatus as IncidentScenario['status'];
  }
}

export const incidentScenarioGenerator = new IncidentScenarioGenerator();
export default incidentScenarioGenerator;