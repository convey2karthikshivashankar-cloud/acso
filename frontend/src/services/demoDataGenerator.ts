/**
 * Demo Data Generator Service
 * 
 * Generates realistic synthetic data for ACSO demo scenarios including
 * agents, threats, financial data, incidents, and business metrics.
 */

import {
  AgentStatus,
  AgentMessage,
  AgentDecision,
  BusinessMetric,
  DemoEvent,
  ThreatEvent,
  FinancialData,
  IncidentData,
  WorkflowTask
} from '../types/demo';
import { DEMO_CONFIG } from '../config/demoConfig';

// Data generation templates and patterns
interface DataTemplate {
  id: string;
  name: string;
  category: string;
  probability: number;
  variations: any[];
}

interface ScenarioContext {
  industry: string;
  companySize: 'small' | 'medium' | 'large' | 'enterprise';
  riskProfile: 'low' | 'medium' | 'high';
  maturityLevel: 'basic' | 'intermediate' | 'advanced';
  focusAreas: string[];
}

class DemoDataGenerator {
  private agentNames: Record<string, string[]> = {
    'supervisor': ['ACSO-Supervisor', 'Central-Command', 'Master-Orchestrator'],
    'threat-hunter': ['ThreatHawk', 'CyberSentinel', 'SecurityScout', 'ThreatTracker'],
    'incident-response': ['ResponseBot', 'IncidentGuard', 'CrisisManager', 'EmergencyAI'],
    'financial-intelligence': ['FinanceWiz', 'CostOptimizer', 'BudgetBot', 'ROI-Analyzer'],
    'service-orchestration': ['ServiceMaster', 'WorkflowBot', 'TaskCoordinator', 'ProcessAI']
  };

  private threatTypes: ThreatEvent['type'][] = [
    'malware', 'phishing', 'apt', 'insider-threat', 'ddos', 
    'data-breach', 'ransomware', 'vulnerability', 'suspicious-activity'
  ];

  private businessMetricCategories = [
    'cost-savings', 'performance', 'security', 'efficiency', 'compliance'
  ];

  private incidentTypes = [
    'security-breach', 'system-outage', 'performance-degradation', 
    'compliance-violation', 'data-loss', 'service-disruption'
  ];

  private messageTemplates: Record<string, string[]> = {
    'threat-detection': [
      'Suspicious network activity detected on subnet {subnet}',
      'Anomalous login patterns identified for user {user}',
      'Potential malware signature found in file {file}',
      'Unusual data transfer volume detected from {source}'
    ],
    'incident-response': [
      'Initiating containment procedures for incident {id}',
      'Escalating to human oversight due to {reason}',
      'Evidence collection completed for {target}',
      'Remediation actions deployed successfully'
    ],
    'financial-analysis': [
      'Cost optimization opportunity identified: {opportunity}',
      'Budget variance detected in {department}: {variance}%',
      'ROI projection updated for {project}: {roi}%',
      'Resource utilization anomaly in {service}: {utilization}%'
    ],
    'coordination': [
      'Task delegation updated: {task} assigned to {agent}',
      'Workflow milestone reached: {milestone}',
      'Resource allocation optimized for {workload}',
      'Performance metrics updated: {metric} improved by {improvement}%'
    ]
  };

  private currentContext: ScenarioContext = {
    industry: 'technology',
    companySize: 'medium',
    riskProfile: 'medium',
    maturityLevel: 'intermediate',
    focusAreas: ['security', 'cost-optimization']
  };

  /**
   * Set scenario context for data generation
   */
  public setScenarioContext(context: Partial<ScenarioContext>): void {
    this.currentContext = { ...this.currentContext, ...context };
  }

  /**
   * Generate realistic agent status data
   */
  public generateAgentStatus(count: number = 5): AgentStatus[] {
    const agentTypes = Object.keys(this.agentNames);
    const agents: AgentStatus[] = [];

    agentTypes.forEach((type, index) => {
      if (index < count) {
        const names = this.agentNames[type];
        const name = names[Math.floor(Math.random() * names.length)];
        
        agents.push({
          id: `agent-${type}-${Date.now()}-${index}`,
          name,
          type: type as AgentStatus['type'],
          status: this.generateAgentStatusValue(),
          workload: this.generateWorkload(),
          performance: this.generatePerformanceMetrics(),
          capabilities: this.generateCapabilities(type),
          lastActivity: new Date(Date.now() - Math.random() * 300000), // Last 5 minutes
          uptime: 95 + Math.random() * 5, // 95-100%
          version: `v${Math.floor(Math.random() * 3) + 1}.${Math.floor(Math.random() * 10)}.${Math.floor(Math.random() * 10)}`
        });
      }
    });

    return agents;
  }

  /**
   * Generate agent messages with realistic content
   */
  public generateAgentMessages(agents: AgentStatus[], count: number = 20): AgentMessage[] {
    const messages: AgentMessage[] = [];
    const messageTypes = Object.keys(this.messageTemplates);

    for (let i = 0; i < count; i++) {
      const fromAgent = agents[Math.floor(Math.random() * agents.length)];
      const toAgent = agents[Math.floor(Math.random() * agents.length)];
      
      if (fromAgent.id === toAgent.id) continue;

      const messageType = messageTypes[Math.floor(Math.random() * messageTypes.length)];
      const templates = this.messageTemplates[messageType];
      const template = templates[Math.floor(Math.random() * templates.length)];
      
      messages.push({
        id: `msg-${Date.now()}-${i}`,
        fromAgent: fromAgent.id,
        toAgent: toAgent.id,
        type: this.getMessageTypeFromTemplate(messageType),
        content: this.fillMessageTemplate(template),
        priority: this.generateMessagePriority(),
        timestamp: new Date(Date.now() - Math.random() * 600000), // Last 10 minutes
        metadata: {
          scenario: messageType,
          confidence: Math.random() * 0.4 + 0.6, // 60-100%
          tags: this.generateMessageTags(messageType)
        }
      });
    }

    return messages.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate agent decisions with reasoning
   */
  public generateAgentDecisions(agents: AgentStatus[], count: number = 10): AgentDecision[] {
    const decisions: AgentDecision[] = [];
    const decisionTypes = [
      'threat-containment', 'resource-allocation', 'escalation', 
      'optimization', 'investigation', 'remediation'
    ];

    for (let i = 0; i < count; i++) {
      const agent = agents[Math.floor(Math.random() * agents.length)];
      const decisionType = decisionTypes[Math.floor(Math.random() * decisionTypes.length)];
      
      decisions.push({
        id: `decision-${Date.now()}-${i}`,
        agentId: agent.id,
        type: decisionType,
        description: this.generateDecisionDescription(decisionType),
        reasoning: this.generateDecisionReasoning(decisionType),
        confidence: Math.random() * 0.4 + 0.6, // 60-100%
        options: this.generateDecisionOptions(decisionType),
        selectedOption: `option-${Math.floor(Math.random() * 3) + 1}`,
        timestamp: new Date(Date.now() - Math.random() * 900000), // Last 15 minutes
        impact: this.generateDecisionImpact(),
        metadata: {
          riskLevel: this.generateRiskLevel(),
          businessValue: Math.random() * 100000 + 10000, // $10K-$110K
          timeToImplement: Math.random() * 24 + 1 // 1-24 hours
        }
      });
    }

    return decisions.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  /**
   * Generate business metrics with trends
   */
  public generateBusinessMetrics(count: number = 15): BusinessMetric[] {
    const metrics: BusinessMetric[] = [];

    this.businessMetricCategories.forEach(category => {
      const categoryMetrics = this.getMetricsForCategory(category);
      
      categoryMetrics.forEach((metricTemplate, index) => {
        if (metrics.length < count) {
          metrics.push({
            id: `metric-${category}-${index}`,
            name: metricTemplate.name,
            category,
            value: this.generateMetricValue(metricTemplate),
            unit: metricTemplate.unit,
            target: metricTemplate.target,
            trend: this.generateTrend(),
            changePercent: (Math.random() - 0.5) * 40, // -20% to +20%
            status: this.generateMetricStatus(),
            description: metricTemplate.description,
            timestamp: new Date(),
            impact: this.generateBusinessImpact(),
            metadata: {
              source: 'ACSO-Analytics',
              confidence: Math.random() * 0.3 + 0.7, // 70-100%
              historicalData: this.generateHistoricalData(30)
            }
          });
        }
      });
    });

    return metrics;
  }

  /**
   * Generate threat events for security scenarios
   */
  public generateThreatEvents(count: number = 8): ThreatEvent[] {
    const threats: ThreatEvent[] = [];

    for (let i = 0; i < count; i++) {
      const threatType = this.threatTypes[Math.floor(Math.random() * this.threatTypes.length)];
      
      threats.push({
        id: `threat-${Date.now()}-${i}`,
        type: threatType,
        severity: this.generateSeverity(),
        source: this.generateThreatSource(),
        target: this.generateThreatTarget(),
        description: this.generateThreatDescription(threatType),
        detectedAt: new Date(Date.now() - Math.random() * 3600000), // Last hour
        status: this.generateThreatStatus(),
        confidence: Math.random() * 0.4 + 0.6, // 60-100%
        impact: {
          financial: Math.random() * 500000 + 50000, // $50K-$550K
          operational: this.generateOperationalImpact(),
          reputation: this.generateReputationImpact()
        },
        mitigationSteps: this.generateMitigationSteps(threatType),
        metadata: {
          attackVector: this.generateAttackVector(threatType),
          indicators: this.generateThreatIndicators(threatType),
          relatedThreats: []
        }
      });
    }

    return threats.sort((a, b) => b.detectedAt.getTime() - a.detectedAt.getTime());
  }

  /**
   * Generate financial data for cost optimization scenarios
   */
  public generateFinancialData(): FinancialData {
    const departments = ['IT', 'Security', 'Operations', 'Development', 'Support'];
    const services = ['AWS', 'Azure', 'Monitoring', 'Security Tools', 'Licenses'];
    
    return {
      totalBudget: 2000000 + Math.random() * 3000000, // $2M-$5M
      currentSpend: 0, // Will be calculated from breakdown
      projectedSpend: 0, // Will be calculated
      departmentBreakdown: departments.map(dept => ({
        department: dept,
        budget: 200000 + Math.random() * 800000, // $200K-$1M
        spent: 0, // Will be calculated
        projected: 0, // Will be calculated
        variance: (Math.random() - 0.5) * 30 // -15% to +15%
      })),
      serviceBreakdown: services.map(service => ({
        service,
        monthlyCost: 5000 + Math.random() * 45000, // $5K-$50K
        trend: this.generateTrend(),
        optimizationPotential: Math.random() * 30 + 5 // 5-35%
      })),
      optimizationOpportunities: this.generateOptimizationOpportunities(),
      roi: {
        currentROI: Math.random() * 200 + 100, // 100-300%
        projectedROI: Math.random() * 300 + 200, // 200-500%
        paybackPeriod: Math.random() * 12 + 3 // 3-15 months
      },
      timestamp: new Date()
    };
  }

  /**
   * Generate incident data for response scenarios
   */
  public generateIncidentData(count: number = 5): IncidentData[] {
    const incidents: IncidentData[] = [];

    for (let i = 0; i < count; i++) {
      const incidentType = this.incidentTypes[Math.floor(Math.random() * this.incidentTypes.length)];
      
      incidents.push({
        id: `incident-${Date.now()}-${i}`,
        title: this.generateIncidentTitle(incidentType),
        type: incidentType,
        severity: this.generateSeverity(),
        status: this.generateIncidentStatus(),
        description: this.generateIncidentDescription(incidentType),
        createdAt: new Date(Date.now() - Math.random() * 7200000), // Last 2 hours
        updatedAt: new Date(Date.now() - Math.random() * 1800000), // Last 30 minutes
        assignedTo: `agent-${Math.floor(Math.random() * 5)}`,
        affectedSystems: this.generateAffectedSystems(),
        timeline: this.generateIncidentTimeline(),
        resolution: this.generateResolutionSteps(incidentType),
        impact: {
          usersAffected: Math.floor(Math.random() * 10000) + 100,
          downtime: Math.random() * 120 + 5, // 5-125 minutes
          financialImpact: Math.random() * 100000 + 5000 // $5K-$105K
        },
        metadata: {
          rootCause: this.generateRootCause(incidentType),
          preventionMeasures: this.generatePreventionMeasures(incidentType),
          lessonsLearned: []
        }
      });
    }

    return incidents.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Generate workflow tasks for orchestration scenarios
   */
  public generateWorkflowTasks(count: number = 12): WorkflowTask[] {
    const tasks: WorkflowTask[] = [];
    const taskTypes = ['security-scan', 'backup', 'update', 'monitoring', 'optimization', 'compliance'];

    for (let i = 0; i < count; i++) {
      const taskType = taskTypes[Math.floor(Math.random() * taskTypes.length)];
      
      tasks.push({
        id: `task-${Date.now()}-${i}`,
        name: this.generateTaskName(taskType),
        type: taskType,
        status: this.generateTaskStatus(),
        priority: this.generateMessagePriority(),
        assignedAgent: `agent-${Math.floor(Math.random() * 5)}`,
        estimatedDuration: Math.random() * 240 + 15, // 15-255 minutes
        actualDuration: Math.random() * 180 + 10, // 10-190 minutes
        progress: Math.random() * 100,
        dependencies: this.generateTaskDependencies(i),
        createdAt: new Date(Date.now() - Math.random() * 86400000), // Last 24 hours
        startedAt: new Date(Date.now() - Math.random() * 43200000), // Last 12 hours
        completedAt: Math.random() > 0.3 ? new Date(Date.now() - Math.random() * 21600000) : undefined, // Last 6 hours
        metadata: {
          complexity: this.generateComplexity(),
          resourceRequirements: this.generateResourceRequirements(),
          businessValue: Math.random() * 50000 + 1000 // $1K-$51K
        }
      });
    }

    return tasks.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());
  }

  /**
   * Generate demo events for timeline visualization
   */
  public generateDemoEvents(count: number = 25): DemoEvent[] {
    const events: DemoEvent[] = [];
    const eventTypes = ['agent-action', 'decision', 'alert', 'optimization', 'collaboration'];

    for (let i = 0; i < count; i++) {
      const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
      
      events.push({
        id: `event-${Date.now()}-${i}`,
        type: eventType,
        title: this.generateEventTitle(eventType),
        description: this.generateEventDescription(eventType),
        timestamp: new Date(Date.now() - Math.random() * 3600000), // Last hour
        severity: this.generateSeverity(),
        agentId: `agent-${Math.floor(Math.random() * 5)}`,
        category: this.getEventCategory(eventType),
        metadata: {
          duration: Math.random() * 300 + 10, // 10-310 seconds
          impact: this.generateEventImpact(),
          relatedEvents: []
        }
      });
    }

    return events.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
  }

  // Private helper methods for data generation

  private generateAgentStatusValue(): AgentStatus['status'] {
    const statuses: AgentStatus['status'][] = ['active', 'idle', 'busy', 'error'];
    const weights = [0.6, 0.2, 0.15, 0.05]; // Mostly active
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return statuses[i];
      }
    }
    
    return 'active';
  }

  private generateWorkload(): number {
    // Generate realistic workload distribution
    const random = Math.random();
    if (random < 0.3) return Math.random() * 30; // Low workload
    if (random < 0.7) return Math.random() * 40 + 30; // Medium workload
    return Math.random() * 30 + 70; // High workload
  }

  private generatePerformanceMetrics(): AgentStatus['performance'] {
    return {
      tasksCompleted: Math.floor(Math.random() * 100) + 20,
      successRate: Math.random() * 20 + 80, // 80-100%
      averageResponseTime: Math.random() * 2000 + 100, // 100-2100ms
      errorRate: Math.random() * 5, // 0-5%
      throughput: Math.random() * 50 + 10 // 10-60 tasks/hour
    };
  }

  private generateCapabilities(agentType: string): string[] {
    const capabilityMap: Record<string, string[]> = {
      'supervisor': ['coordination', 'decision-making', 'resource-allocation', 'monitoring'],
      'threat-hunter': ['threat-detection', 'pattern-analysis', 'risk-assessment', 'investigation'],
      'incident-response': ['containment', 'remediation', 'forensics', 'escalation'],
      'financial-intelligence': ['cost-analysis', 'optimization', 'forecasting', 'roi-calculation'],
      'service-orchestration': ['workflow-management', 'task-allocation', 'automation', 'integration']
    };
    
    return capabilityMap[agentType] || ['general-purpose'];
  }

  private getMessageTypeFromTemplate(templateType: string): AgentMessage['type'] {
    const typeMap: Record<string, AgentMessage['type']> = {
      'threat-detection': 'alert',
      'incident-response': 'action',
      'financial-analysis': 'analysis',
      'coordination': 'coordination'
    };
    
    return typeMap[templateType] || 'info';
  }

  private fillMessageTemplate(template: string): string {
    const placeholders: Record<string, string[]> = {
      '{subnet}': ['192.168.1.0/24', '10.0.0.0/16', '172.16.0.0/12'],
      '{user}': ['admin', 'jdoe', 'service-account', 'backup-user'],
      '{file}': ['suspicious.exe', 'malware.dll', 'trojan.bat', 'virus.scr'],
      '{source}': ['workstation-42', 'server-db01', 'laptop-sales03'],
      '{id}': ['INC-2024-001', 'SEC-2024-042', 'OPS-2024-123'],
      '{reason}': ['high severity', 'multiple systems affected', 'potential data breach'],
      '{target}': ['database server', 'web application', 'email system'],
      '{opportunity}': ['unused licenses', 'oversized instances', 'redundant services'],
      '{department}': ['IT', 'Sales', 'Marketing', 'Finance'],
      '{variance}': ['15', '23', '8', '31'],
      '{project}': ['cloud migration', 'security upgrade', 'automation initiative'],
      '{roi}': ['245', '180', '320', '156'],
      '{service}': ['EC2 instances', 'RDS databases', 'S3 storage'],
      '{utilization}': ['85', '92', '67', '78'],
      '{task}': ['security scan', 'backup job', 'system update'],
      '{agent}': ['ThreatHawk', 'ResponseBot', 'ServiceMaster'],
      '{milestone}': ['Phase 1 complete', 'Testing passed', 'Deployment ready'],
      '{workload}': ['high priority tasks', 'routine maintenance', 'emergency response'],
      '{metric}': ['response time', 'throughput', 'error rate'],
      '{improvement}': ['25', '18', '42', '33']
    };

    let result = template;
    Object.entries(placeholders).forEach(([placeholder, values]) => {
      if (result.includes(placeholder)) {
        const value = values[Math.floor(Math.random() * values.length)];
        result = result.replace(placeholder, value);
      }
    });

    return result;
  }

  private generateMessagePriority(): AgentMessage['priority'] {
    const priorities: AgentMessage['priority'][] = ['low', 'medium', 'high', 'critical'];
    const weights = [0.4, 0.35, 0.2, 0.05];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < priorities.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return priorities[i];
      }
    }
    
    return 'medium';
  }

  private generateMessageTags(messageType: string): string[] {
    const tagMap: Record<string, string[]> = {
      'threat-detection': ['security', 'detection', 'analysis'],
      'incident-response': ['incident', 'response', 'containment'],
      'financial-analysis': ['finance', 'optimization', 'analysis'],
      'coordination': ['workflow', 'coordination', 'management']
    };
    
    return tagMap[messageType] || ['general'];
  }

  private generateDecisionDescription(type: string): string {
    const descriptions: Record<string, string[]> = {
      'threat-containment': [
        'Isolate compromised system from network',
        'Block suspicious IP addresses',
        'Quarantine malicious files',
        'Disable affected user accounts'
      ],
      'resource-allocation': [
        'Redistribute workload across agents',
        'Scale up processing capacity',
        'Prioritize critical tasks',
        'Allocate additional resources'
      ],
      'escalation': [
        'Escalate to human oversight',
        'Notify security team',
        'Trigger emergency response',
        'Request additional permissions'
      ],
      'optimization': [
        'Optimize resource utilization',
        'Implement cost-saving measures',
        'Streamline workflow processes',
        'Automate manual tasks'
      ]
    };
    
    const options = descriptions[type] || ['Make strategic decision'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateDecisionReasoning(type: string): string {
    const reasoning: Record<string, string[]> = {
      'threat-containment': [
        'High confidence threat detected with potential for lateral movement',
        'Anomalous behavior patterns indicate active compromise',
        'Multiple security indicators suggest coordinated attack'
      ],
      'resource-allocation': [
        'Current workload exceeds optimal capacity thresholds',
        'Performance metrics indicate resource constraints',
        'Predictive analysis suggests increased demand'
      ],
      'escalation': [
        'Situation complexity exceeds automated response capabilities',
        'Potential business impact requires human judgment',
        'Regulatory compliance considerations need review'
      ],
      'optimization': [
        'Analysis reveals significant efficiency opportunities',
        'Cost-benefit analysis shows positive ROI potential',
        'Performance data indicates optimization potential'
      ]
    };
    
    const options = reasoning[type] || ['Based on current analysis and historical patterns'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateDecisionOptions(type: string): AgentDecision['options'] {
    return [
      {
        id: 'option-1',
        name: 'Conservative Approach',
        description: 'Lower risk, moderate impact solution',
        confidence: Math.random() * 0.3 + 0.7,
        estimatedImpact: 'medium',
        riskLevel: 'low'
      },
      {
        id: 'option-2',
        name: 'Balanced Approach',
        description: 'Moderate risk, high impact solution',
        confidence: Math.random() * 0.2 + 0.8,
        estimatedImpact: 'high',
        riskLevel: 'medium'
      },
      {
        id: 'option-3',
        name: 'Aggressive Approach',
        description: 'Higher risk, maximum impact solution',
        confidence: Math.random() * 0.4 + 0.6,
        estimatedImpact: 'very-high',
        riskLevel: 'high'
      }
    ];
  }

  private generateDecisionImpact(): AgentDecision['impact'] {
    return {
      financial: Math.random() * 100000 + 5000, // $5K-$105K
      operational: ['improved efficiency', 'reduced downtime', 'enhanced security'][Math.floor(Math.random() * 3)],
      strategic: ['competitive advantage', 'risk mitigation', 'process optimization'][Math.floor(Math.random() * 3)]
    };
  }

  private generateRiskLevel(): 'low' | 'medium' | 'high' | 'critical' {
    const levels: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
    const weights = [0.4, 0.35, 0.2, 0.05];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < levels.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return levels[i];
      }
    }
    
    return 'medium';
  }

  private getMetricsForCategory(category: string) {
    const metricTemplates: Record<string, any[]> = {
      'cost-savings': [
        { name: 'Monthly Cost Reduction', unit: '$', target: 50000, description: 'Total monthly cost savings achieved' },
        { name: 'License Optimization', unit: '%', target: 25, description: 'Percentage of unused licenses recovered' },
        { name: 'Resource Efficiency', unit: '%', target: 80, description: 'Overall resource utilization improvement' }
      ],
      'performance': [
        { name: 'Response Time', unit: 'ms', target: 500, description: 'Average system response time' },
        { name: 'Throughput', unit: 'req/s', target: 1000, description: 'Requests processed per second' },
        { name: 'Uptime', unit: '%', target: 99.9, description: 'System availability percentage' }
      ],
      'security': [
        { name: 'Threat Detection Rate', unit: '%', target: 95, description: 'Percentage of threats detected' },
        { name: 'Incident Response Time', unit: 'min', target: 15, description: 'Average time to respond to incidents' },
        { name: 'Vulnerability Score', unit: 'score', target: 8.5, description: 'Overall security posture score' }
      ],
      'efficiency': [
        { name: 'Automation Rate', unit: '%', target: 70, description: 'Percentage of tasks automated' },
        { name: 'Error Rate', unit: '%', target: 2, description: 'System error rate' },
        { name: 'Task Completion', unit: '%', target: 95, description: 'Percentage of tasks completed successfully' }
      ],
      'compliance': [
        { name: 'Compliance Score', unit: '%', target: 98, description: 'Overall compliance rating' },
        { name: 'Audit Readiness', unit: 'days', target: 1, description: 'Time to audit readiness' },
        { name: 'Policy Adherence', unit: '%', target: 100, description: 'Policy compliance rate' }
      ]
    };
    
    return metricTemplates[category] || [];
  }

  private generateMetricValue(template: any): number {
    const baseValue = template.target || 100;
    const variance = 0.2; // ±20% variance
    return baseValue * (1 + (Math.random() - 0.5) * variance);
  }

  private generateTrend(): 'up' | 'down' | 'stable' {
    const trends: ('up' | 'down' | 'stable')[] = ['up', 'down', 'stable'];
    const weights = [0.5, 0.2, 0.3]; // Mostly positive trends
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < trends.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return trends[i];
      }
    }
    
    return 'stable';
  }

  private generateMetricStatus(): BusinessMetric['status'] {
    const statuses: BusinessMetric['status'][] = ['success', 'warning', 'error', 'info'];
    const weights = [0.6, 0.25, 0.1, 0.05];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return statuses[i];
      }
    }
    
    return 'info';
  }

  private generateBusinessImpact(): BusinessMetric['impact'] {
    const impacts = ['low', 'medium', 'high', 'critical'];
    return impacts[Math.floor(Math.random() * impacts.length)] as BusinessMetric['impact'];
  }

  private generateHistoricalData(days: number): number[] {
    const data: number[] = [];
    let baseValue = 100;
    
    for (let i = 0; i < days; i++) {
      baseValue += (Math.random() - 0.5) * 10; // Random walk
      data.push(Math.max(0, baseValue));
    }
    
    return data;
  }

  private generateSeverity(): 'low' | 'medium' | 'high' | 'critical' {
    const severities: ('low' | 'medium' | 'high' | 'critical')[] = ['low', 'medium', 'high', 'critical'];
    const weights = [0.3, 0.4, 0.25, 0.05];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < severities.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return severities[i];
      }
    }
    
    return 'medium';
  }

  // Additional helper methods would continue here...
  // For brevity, I'll include a few more key methods

  private generateThreatSource(): string {
    const sources = [
      'External IP: 192.168.1.100',
      'Internal User: jdoe@company.com',
      'Unknown Origin',
      'Automated Scanner',
      'Compromised Account'
    ];
    return sources[Math.floor(Math.random() * sources.length)];
  }

  private generateThreatTarget(): string {
    const targets = [
      'Database Server (db-prod-01)',
      'Web Application (app-server-02)',
      'Email System (exchange-01)',
      'File Server (fs-shared-01)',
      'Domain Controller (dc-primary)'
    ];
    return targets[Math.floor(Math.random() * targets.length)];
  }

  private generateThreatDescription(type: string): string {
    const descriptions: Record<string, string[]> = {
      'malware': [
        'Suspicious executable detected with known malware signatures',
        'Trojan horse attempting to establish backdoor access',
        'Ransomware encryption patterns identified'
      ],
      'phishing': [
        'Suspicious email with malicious attachments detected',
        'Credential harvesting attempt via fake login page',
        'Social engineering attack targeting executives'
      ],
      'apt': [
        'Advanced persistent threat with lateral movement detected',
        'Sophisticated attack campaign with multiple vectors',
        'State-sponsored threat actor indicators identified'
      ]
    };
    
    const options = descriptions[type] || ['Security threat detected'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateThreatStatus(): ThreatEvent['status'] {
    const statuses: ThreatEvent['status'][] = ['detected', 'investigating', 'contained', 'resolved'];
    const weights = [0.2, 0.3, 0.3, 0.2];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return statuses[i];
      }
    }
    
    return 'detected';
  }

  private generateOperationalImpact(): string {
    const impacts = [
      'Service disruption possible',
      'Data integrity at risk',
      'System performance degraded',
      'User access compromised',
      'Business continuity threatened'
    ];
    return impacts[Math.floor(Math.random() * impacts.length)];
  }

  private generateReputationImpact(): string {
    const impacts = [
      'Customer trust at risk',
      'Brand reputation threatened',
      'Regulatory scrutiny possible',
      'Media attention likely',
      'Competitive disadvantage'
    ];
    return impacts[Math.floor(Math.random() * impacts.length)];
  }

  private generateMitigationSteps(threatType: string): string[] {
    const steps: Record<string, string[]> = {
      'malware': [
        'Isolate infected systems',
        'Run full antivirus scan',
        'Update security signatures',
        'Monitor for lateral movement'
      ],
      'phishing': [
        'Block sender domains',
        'Educate affected users',
        'Reset compromised credentials',
        'Implement additional email filters'
      ],
      'apt': [
        'Activate incident response team',
        'Preserve forensic evidence',
        'Implement network segmentation',
        'Coordinate with threat intelligence'
      ]
    };
    
    return steps[threatType] || ['Implement standard security measures'];
  }

  private generateAttackVector(threatType: string): string {
    const vectors: Record<string, string[]> = {
      'malware': ['Email attachment', 'Drive-by download', 'USB device', 'Network share'],
      'phishing': ['Email', 'SMS', 'Social media', 'Phone call'],
      'apt': ['Spear phishing', 'Watering hole', 'Supply chain', 'Zero-day exploit']
    };
    
    const options = vectors[threatType] || ['Unknown'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateThreatIndicators(threatType: string): string[] {
    const indicators: Record<string, string[]> = {
      'malware': ['Suspicious process execution', 'Unusual network traffic', 'File system changes'],
      'phishing': ['Suspicious email headers', 'Fake domain registration', 'Credential harvesting'],
      'apt': ['Command and control traffic', 'Lateral movement', 'Data exfiltration']
    };
    
    return indicators[threatType] || ['General suspicious activity'];
  }

  private generateOptimizationOpportunities() {
    return [
      {
        category: 'Infrastructure',
        opportunity: 'Right-size EC2 instances',
        potentialSavings: Math.random() * 50000 + 10000,
        effort: 'Low',
        timeline: '1-2 weeks'
      },
      {
        category: 'Licensing',
        opportunity: 'Consolidate software licenses',
        potentialSavings: Math.random() * 30000 + 5000,
        effort: 'Medium',
        timeline: '2-4 weeks'
      },
      {
        category: 'Automation',
        opportunity: 'Automate manual processes',
        potentialSavings: Math.random() * 80000 + 20000,
        effort: 'High',
        timeline: '2-3 months'
      }
    ];
  }

  // Continue with remaining helper methods...
  private generateIncidentTitle(type: string): string {
    const titles: Record<string, string[]> = {
      'security-breach': ['Unauthorized Access Detected', 'Data Breach Alert', 'Security Perimeter Compromised'],
      'system-outage': ['Critical System Down', 'Service Unavailable', 'Infrastructure Failure'],
      'performance-degradation': ['System Performance Issues', 'Slow Response Times', 'Capacity Exceeded']
    };
    
    const options = titles[type] || ['System Incident'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateIncidentDescription(type: string): string {
    const descriptions: Record<string, string[]> = {
      'security-breach': [
        'Unauthorized access attempt detected on critical systems',
        'Potential data exfiltration in progress',
        'Security controls bypassed by unknown actor'
      ],
      'system-outage': [
        'Primary database server experiencing connectivity issues',
        'Load balancer failure causing service disruption',
        'Network infrastructure experiencing widespread outage'
      ]
    };
    
    const options = descriptions[type] || ['System incident requiring attention'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateIncidentStatus(): IncidentData['status'] {
    const statuses: IncidentData['status'][] = ['open', 'investigating', 'in-progress', 'resolved', 'closed'];
    const weights = [0.1, 0.2, 0.3, 0.3, 0.1];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return statuses[i];
      }
    }
    
    return 'open';
  }

  private generateAffectedSystems(): string[] {
    const systems = [
      'Web Application Server',
      'Database Cluster',
      'Email System',
      'File Storage',
      'Authentication Service',
      'Monitoring System'
    ];
    
    const count = Math.floor(Math.random() * 3) + 1;
    const selected = [];
    
    for (let i = 0; i < count; i++) {
      const system = systems[Math.floor(Math.random() * systems.length)];
      if (!selected.includes(system)) {
        selected.push(system);
      }
    }
    
    return selected;
  }

  private generateIncidentTimeline(): Array<{ timestamp: Date; event: string; actor: string }> {
    const events = [
      'Incident detected by monitoring system',
      'Alert sent to on-call engineer',
      'Initial investigation started',
      'Root cause identified',
      'Mitigation measures implemented',
      'Service restored',
      'Post-incident review scheduled'
    ];
    
    const timeline = [];
    const baseTime = Date.now() - 7200000; // 2 hours ago
    
    events.forEach((event, index) => {
      timeline.push({
        timestamp: new Date(baseTime + (index * 300000)), // 5 minutes apart
        event,
        actor: index === 0 ? 'System' : `Agent-${Math.floor(Math.random() * 3) + 1}`
      });
    });
    
    return timeline;
  }

  private generateResolutionSteps(type: string): string[] {
    const steps: Record<string, string[]> = {
      'security-breach': [
        'Isolate affected systems',
        'Change all credentials',
        'Patch security vulnerabilities',
        'Implement additional monitoring'
      ],
      'system-outage': [
        'Restart failed services',
        'Verify system integrity',
        'Monitor performance metrics',
        'Update documentation'
      ]
    };
    
    return steps[type] || ['Implement standard resolution procedures'];
  }

  private generateRootCause(type: string): string {
    const causes: Record<string, string[]> = {
      'security-breach': ['Unpatched vulnerability', 'Weak credentials', 'Social engineering'],
      'system-outage': ['Hardware failure', 'Software bug', 'Network connectivity'],
      'performance-degradation': ['Resource exhaustion', 'Database locks', 'Memory leak']
    };
    
    const options = causes[type] || ['Under investigation'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generatePreventionMeasures(type: string): string[] {
    const measures: Record<string, string[]> = {
      'security-breach': [
        'Implement multi-factor authentication',
        'Regular security training',
        'Automated vulnerability scanning'
      ],
      'system-outage': [
        'Redundant system architecture',
        'Proactive monitoring',
        'Regular maintenance windows'
      ]
    };
    
    return measures[type] || ['Implement best practices'];
  }

  private generateTaskName(type: string): string {
    const names: Record<string, string[]> = {
      'security-scan': ['Vulnerability Assessment', 'Security Audit', 'Penetration Test'],
      'backup': ['Database Backup', 'System Snapshot', 'Configuration Backup'],
      'update': ['Security Patch', 'Software Update', 'System Upgrade'],
      'monitoring': ['Health Check', 'Performance Monitor', 'Log Analysis'],
      'optimization': ['Resource Optimization', 'Performance Tuning', 'Cost Analysis'],
      'compliance': ['Compliance Audit', 'Policy Review', 'Regulatory Check']
    };
    
    const options = names[type] || ['System Task'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateTaskStatus(): WorkflowTask['status'] {
    const statuses: WorkflowTask['status'][] = ['pending', 'running', 'completed', 'failed', 'cancelled'];
    const weights = [0.2, 0.3, 0.4, 0.05, 0.05];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < statuses.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return statuses[i];
      }
    }
    
    return 'pending';
  }

  private generateTaskDependencies(taskIndex: number): string[] {
    if (taskIndex === 0) return [];
    
    const dependencyCount = Math.floor(Math.random() * 2); // 0-1 dependencies
    const dependencies = [];
    
    for (let i = 0; i < dependencyCount; i++) {
      const depIndex = Math.floor(Math.random() * taskIndex);
      dependencies.push(`task-${Date.now()}-${depIndex}`);
    }
    
    return dependencies;
  }

  private generateComplexity(): 'low' | 'medium' | 'high' {
    const complexities: ('low' | 'medium' | 'high')[] = ['low', 'medium', 'high'];
    const weights = [0.4, 0.4, 0.2];
    
    const random = Math.random();
    let cumulative = 0;
    
    for (let i = 0; i < complexities.length; i++) {
      cumulative += weights[i];
      if (random <= cumulative) {
        return complexities[i];
      }
    }
    
    return 'medium';
  }

  private generateResourceRequirements(): { cpu: number; memory: number; storage: number } {
    return {
      cpu: Math.random() * 80 + 10, // 10-90%
      memory: Math.random() * 70 + 20, // 20-90%
      storage: Math.random() * 50 + 5 // 5-55%
    };
  }

  private generateEventTitle(type: string): string {
    const titles: Record<string, string[]> = {
      'agent-action': ['Agent Task Completed', 'Automated Response Executed', 'System Action Performed'],
      'decision': ['Decision Made', 'Strategy Selected', 'Option Chosen'],
      'alert': ['System Alert', 'Warning Issued', 'Notification Sent'],
      'optimization': ['Optimization Applied', 'Performance Improved', 'Efficiency Enhanced'],
      'collaboration': ['Agent Coordination', 'Task Delegation', 'Information Shared']
    };
    
    const options = titles[type] || ['System Event'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private generateEventDescription(type: string): string {
    const descriptions: Record<string, string[]> = {
      'agent-action': [
        'Automated security scan completed successfully',
        'System optimization task executed',
        'Preventive maintenance performed'
      ],
      'decision': [
        'AI agent selected optimal response strategy',
        'Risk assessment completed with recommendation',
        'Resource allocation decision finalized'
      ],
      'alert': [
        'Anomaly detected in system behavior',
        'Threshold exceeded for performance metric',
        'Security event requires attention'
      ]
    };
    
    const options = descriptions[type] || ['System event occurred'];
    return options[Math.floor(Math.random() * options.length)];
  }

  private getEventCategory(type: string): string {
    const categories: Record<string, string> = {
      'agent-action': 'automation',
      'decision': 'intelligence',
      'alert': 'monitoring',
      'optimization': 'performance',
      'collaboration': 'coordination'
    };
    
    return categories[type] || 'general';
  }

  private generateEventImpact(): { scope: string; severity: string; duration: number } {
    const scopes = ['local', 'department', 'organization', 'external'];
    const severities = ['minimal', 'moderate', 'significant', 'critical'];
    
    return {
      scope: scopes[Math.floor(Math.random() * scopes.length)],
      severity: severities[Math.floor(Math.random() * severities.length)],
      duration: Math.random() * 3600 + 60 // 1 minute to 1 hour
    };
  }
}

// Export singleton instance
export const demoDataGenerator = new DemoDataGenerator();
export default demoDataGenerator;