import React from 'react';
import { DashboardTemplate } from './DashboardLayoutEngine';
import { UserRole } from './RoleBasedDashboard';

// Predefined dashboard templates for each role
export const createRoleDashboardTemplates = (): DashboardTemplate[] => [
  // System Administrator Dashboard
  {
    id: 'admin-overview',
    name: 'System Overview',
    description: 'Comprehensive system administration dashboard',
    role: 'admin',
    isDefault: true,
    layouts: {
      lg: [
        { i: 'system-health', x: 0, y: 0, w: 6, h: 4 },
        { i: 'agent-status', x: 6, y: 0, w: 6, h: 4 },
        { i: 'user-activity', x: 0, y: 4, w: 4, h: 4 },
        { i: 'system-metrics', x: 4, y: 4, w: 4, h: 4 },
        { i: 'recent-incidents', x: 8, y: 4, w: 4, h: 4 },
        { i: 'performance-trends', x: 0, y: 8, w: 12, h: 4 },
      ],
      md: [
        { i: 'system-health', x: 0, y: 0, w: 6, h: 4 },
        { i: 'agent-status', x: 6, y: 0, w: 6, h: 4 },
        { i: 'user-activity', x: 0, y: 4, w: 6, h: 4 },
        { i: 'system-metrics', x: 6, y: 4, w: 6, h: 4 },
        { i: 'recent-incidents', x: 0, y: 8, w: 12, h: 4 },
        { i: 'performance-trends', x: 0, y: 12, w: 12, h: 4 },
      ],
      sm: [
        { i: 'system-health', x: 0, y: 0, w: 12, h: 4 },
        { i: 'agent-status', x: 0, y: 4, w: 12, h: 4 },
        { i: 'user-activity', x: 0, y: 8, w: 12, h: 4 },
        { i: 'system-metrics', x: 0, y: 12, w: 12, h: 4 },
        { i: 'recent-incidents', x: 0, y: 16, w: 12, h: 4 },
        { i: 'performance-trends', x: 0, y: 20, w: 12, h: 4 },
      ],
    },
    widgets: [
      {
        id: 'system-health',
        type: 'system-health-metric',
        title: 'System Health',
        dataSource: 'system/health',
        configuration: {
          showDetails: true,
          refreshInterval: 30000,
        },
      },
      {
        id: 'agent-status',
        type: 'agent-status-table',
        title: 'Agent Status',
        dataSource: 'agents/status',
        configuration: {
          showInactive: true,
          groupByType: true,
        },
      },
      {
        id: 'user-activity',
        type: 'activity-list',
        title: 'User Activity',
        dataSource: 'users/activity',
        configuration: {
          limit: 10,
          showDetails: true,
        },
      },
      {
        id: 'system-metrics',
        type: 'performance-metric',
        title: 'System Performance',
        dataSource: 'system/metrics',
        configuration: {
          metrics: ['cpu', 'memory', 'disk', 'network'],
        },
      },
      {
        id: 'recent-incidents',
        type: 'incident-list',
        title: 'Recent Incidents',
        dataSource: 'incidents/recent',
        configuration: {
          limit: 5,
          severityFilter: ['high', 'critical'],
        },
      },
      {
        id: 'performance-trends',
        type: 'system-metrics-chart',
        title: 'Performance Trends',
        dataSource: 'system/metrics/trends',
        configuration: {
          timeRange: '24h',
          metrics: ['response_time', 'throughput', 'error_rate'],
        },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Security Analyst Dashboard
  {
    id: 'security-overview',
    name: 'Security Overview',
    description: 'Security monitoring and threat detection dashboard',
    role: 'security',
    isDefault: true,
    layouts: {
      lg: [
        { i: 'threat-level', x: 0, y: 0, w: 3, h: 3 },
        { i: 'active-threats', x: 3, y: 0, w: 3, h: 3 },
        { i: 'incidents-today', x: 6, y: 0, w: 3, h: 3 },
        { i: 'security-score', x: 9, y: 0, w: 3, h: 3 },
        { i: 'threat-detection', x: 0, y: 3, w: 8, h: 5 },
        { i: 'incident-timeline', x: 8, y: 3, w: 4, h: 5 },
        { i: 'vulnerability-scan', x: 0, y: 8, w: 6, h: 4 },
        { i: 'security-events', x: 6, y: 8, w: 6, h: 4 },
      ],
      md: [
        { i: 'threat-level', x: 0, y: 0, w: 3, h: 3 },
        { i: 'active-threats', x: 3, y: 0, w: 3, h: 3 },
        { i: 'incidents-today', x: 6, y: 0, w: 3, h: 3 },
        { i: 'security-score', x: 9, y: 0, w: 3, h: 3 },
        { i: 'threat-detection', x: 0, y: 3, w: 12, h: 5 },
        { i: 'incident-timeline', x: 0, y: 8, w: 6, h: 5 },
        { i: 'vulnerability-scan', x: 6, y: 8, w: 6, h: 5 },
        { i: 'security-events', x: 0, y: 13, w: 12, h: 4 },
      ],
      sm: [
        { i: 'threat-level', x: 0, y: 0, w: 6, h: 3 },
        { i: 'active-threats', x: 6, y: 0, w: 6, h: 3 },
        { i: 'incidents-today', x: 0, y: 3, w: 6, h: 3 },
        { i: 'security-score', x: 6, y: 3, w: 6, h: 3 },
        { i: 'threat-detection', x: 0, y: 6, w: 12, h: 5 },
        { i: 'incident-timeline', x: 0, y: 11, w: 12, h: 5 },
        { i: 'vulnerability-scan', x: 0, y: 16, w: 12, h: 4 },
        { i: 'security-events', x: 0, y: 20, w: 12, h: 4 },
      ],
    },
    widgets: [
      {
        id: 'threat-level',
        type: 'security-metric',
        title: 'Threat Level',
        dataSource: 'security/threat-level',
        configuration: {
          showTrend: true,
          alertThreshold: 'high',
        },
      },
      {
        id: 'active-threats',
        type: 'security-metric',
        title: 'Active Threats',
        dataSource: 'security/active-threats',
        configuration: {
          showCount: true,
          groupBySeverity: true,
        },
      },
      {
        id: 'incidents-today',
        type: 'security-metric',
        title: 'Incidents Today',
        dataSource: 'incidents/today',
        configuration: {
          showComparison: true,
          comparisonPeriod: 'yesterday',
        },
      },
      {
        id: 'security-score',
        type: 'security-metric',
        title: 'Security Score',
        dataSource: 'security/score',
        configuration: {
          showGauge: true,
          maxScore: 100,
        },
      },
      {
        id: 'threat-detection',
        type: 'threat-detection-chart',
        title: 'Threat Detection Timeline',
        dataSource: 'security/threats/timeline',
        configuration: {
          timeRange: '24h',
          groupBy: 'type',
        },
      },
      {
        id: 'incident-timeline',
        type: 'activity-list',
        title: 'Incident Timeline',
        dataSource: 'incidents/timeline',
        configuration: {
          limit: 15,
          showSeverity: true,
        },
      },
      {
        id: 'vulnerability-scan',
        type: 'chart',
        title: 'Vulnerability Scan Results',
        dataSource: 'security/vulnerabilities',
        configuration: {
          chartType: 'donut',
          groupBy: 'severity',
        },
      },
      {
        id: 'security-events',
        type: 'table',
        title: 'Security Events',
        dataSource: 'security/events',
        configuration: {
          columns: ['timestamp', 'type', 'severity', 'source', 'status'],
          sortBy: 'timestamp',
          sortOrder: 'desc',
        },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Operations Manager Dashboard
  {
    id: 'operations-overview',
    name: 'Operations Overview',
    description: 'System operations and workflow management dashboard',
    role: 'operations',
    isDefault: true,
    layouts: {
      lg: [
        { i: 'system-status', x: 0, y: 0, w: 3, h: 3 },
        { i: 'active-workflows', x: 3, y: 0, w: 3, h: 3 },
        { i: 'agent-health', x: 6, y: 0, w: 3, h: 3 },
        { i: 'response-time', x: 9, y: 0, w: 3, h: 3 },
        { i: 'workflow-status', x: 0, y: 3, w: 8, h: 5 },
        { i: 'agent-performance', x: 8, y: 3, w: 4, h: 5 },
        { i: 'system-resources', x: 0, y: 8, w: 6, h: 4 },
        { i: 'operation-logs', x: 6, y: 8, w: 6, h: 4 },
      ],
      md: [
        { i: 'system-status', x: 0, y: 0, w: 3, h: 3 },
        { i: 'active-workflows', x: 3, y: 0, w: 3, h: 3 },
        { i: 'agent-health', x: 6, y: 0, w: 3, h: 3 },
        { i: 'response-time', x: 9, y: 0, w: 3, h: 3 },
        { i: 'workflow-status', x: 0, y: 3, w: 12, h: 5 },
        { i: 'agent-performance', x: 0, y: 8, w: 6, h: 5 },
        { i: 'system-resources', x: 6, y: 8, w: 6, h: 5 },
        { i: 'operation-logs', x: 0, y: 13, w: 12, h: 4 },
      ],
      sm: [
        { i: 'system-status', x: 0, y: 0, w: 6, h: 3 },
        { i: 'active-workflows', x: 6, y: 0, w: 6, h: 3 },
        { i: 'agent-health', x: 0, y: 3, w: 6, h: 3 },
        { i: 'response-time', x: 6, y: 3, w: 6, h: 3 },
        { i: 'workflow-status', x: 0, y: 6, w: 12, h: 5 },
        { i: 'agent-performance', x: 0, y: 11, w: 12, h: 5 },
        { i: 'system-resources', x: 0, y: 16, w: 12, h: 4 },
        { i: 'operation-logs', x: 0, y: 20, w: 12, h: 4 },
      ],
    },
    widgets: [
      {
        id: 'system-status',
        type: 'system-health-metric',
        title: 'System Status',
        dataSource: 'system/status',
        configuration: {
          showUptime: true,
          showServices: true,
        },
      },
      {
        id: 'active-workflows',
        type: 'performance-metric',
        title: 'Active Workflows',
        dataSource: 'workflows/active',
        configuration: {
          showCount: true,
          showTrend: true,
        },
      },
      {
        id: 'agent-health',
        type: 'performance-metric',
        title: 'Agent Health',
        dataSource: 'agents/health',
        configuration: {
          showPercentage: true,
          healthyThreshold: 95,
        },
      },
      {
        id: 'response-time',
        type: 'performance-metric',
        title: 'Avg Response Time',
        dataSource: 'system/response-time',
        configuration: {
          unit: 'ms',
          showTrend: true,
        },
      },
      {
        id: 'workflow-status',
        type: 'system-metrics-chart',
        title: 'Workflow Execution Status',
        dataSource: 'workflows/status',
        configuration: {
          chartType: 'area',
          timeRange: '12h',
          groupBy: 'status',
        },
      },
      {
        id: 'agent-performance',
        type: 'agent-status-table',
        title: 'Agent Performance',
        dataSource: 'agents/performance',
        configuration: {
          showMetrics: true,
          sortBy: 'performance',
        },
      },
      {
        id: 'system-resources',
        type: 'system-metrics-chart',
        title: 'System Resources',
        dataSource: 'system/resources',
        configuration: {
          metrics: ['cpu', 'memory', 'disk'],
          chartType: 'line',
        },
      },
      {
        id: 'operation-logs',
        type: 'activity-list',
        title: 'Operation Logs',
        dataSource: 'operations/logs',
        configuration: {
          limit: 20,
          showLevel: true,
        },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Financial Analyst Dashboard
  {
    id: 'financial-overview',
    name: 'Financial Overview',
    description: 'Cost analysis and financial intelligence dashboard',
    role: 'financial',
    isDefault: true,
    layouts: {
      lg: [
        { i: 'total-cost', x: 0, y: 0, w: 3, h: 3 },
        { i: 'monthly-savings', x: 3, y: 0, w: 3, h: 3 },
        { i: 'roi-metric', x: 6, y: 0, w: 3, h: 3 },
        { i: 'budget-status', x: 9, y: 0, w: 3, h: 3 },
        { i: 'cost-trends', x: 0, y: 3, w: 8, h: 5 },
        { i: 'cost-breakdown', x: 8, y: 3, w: 4, h: 5 },
        { i: 'savings-opportunities', x: 0, y: 8, w: 6, h: 4 },
        { i: 'budget-tracking', x: 6, y: 8, w: 6, h: 4 },
      ],
      md: [
        { i: 'total-cost', x: 0, y: 0, w: 3, h: 3 },
        { i: 'monthly-savings', x: 3, y: 0, w: 3, h: 3 },
        { i: 'roi-metric', x: 6, y: 0, w: 3, h: 3 },
        { i: 'budget-status', x: 9, y: 0, w: 3, h: 3 },
        { i: 'cost-trends', x: 0, y: 3, w: 12, h: 5 },
        { i: 'cost-breakdown', x: 0, y: 8, w: 6, h: 5 },
        { i: 'savings-opportunities', x: 6, y: 8, w: 6, h: 5 },
        { i: 'budget-tracking', x: 0, y: 13, w: 12, h: 4 },
      ],
      sm: [
        { i: 'total-cost', x: 0, y: 0, w: 6, h: 3 },
        { i: 'monthly-savings', x: 6, y: 0, w: 6, h: 3 },
        { i: 'roi-metric', x: 0, y: 3, w: 6, h: 3 },
        { i: 'budget-status', x: 6, y: 3, w: 6, h: 3 },
        { i: 'cost-trends', x: 0, y: 6, w: 12, h: 5 },
        { i: 'cost-breakdown', x: 0, y: 11, w: 12, h: 5 },
        { i: 'savings-opportunities', x: 0, y: 16, w: 12, h: 4 },
        { i: 'budget-tracking', x: 0, y: 20, w: 12, h: 4 },
      ],
    },
    widgets: [
      {
        id: 'total-cost',
        type: 'single-metric',
        title: 'Total Monthly Cost',
        dataSource: 'financial/total-cost',
        configuration: {
          format: 'currency',
          showTrend: true,
          comparisonPeriod: 'previous-month',
        },
      },
      {
        id: 'monthly-savings',
        type: 'single-metric',
        title: 'Monthly Savings',
        dataSource: 'financial/savings',
        configuration: {
          format: 'currency',
          showPercentage: true,
        },
      },
      {
        id: 'roi-metric',
        type: 'single-metric',
        title: 'ROI',
        dataSource: 'financial/roi',
        configuration: {
          format: 'percentage',
          showTrend: true,
        },
      },
      {
        id: 'budget-status',
        type: 'single-metric',
        title: 'Budget Utilization',
        dataSource: 'financial/budget-status',
        configuration: {
          format: 'percentage',
          showGauge: true,
          alertThreshold: 90,
        },
      },
      {
        id: 'cost-trends',
        type: 'chart',
        title: 'Cost Trends',
        dataSource: 'financial/cost-trends',
        configuration: {
          chartType: 'line',
          timeRange: '6m',
          groupBy: 'service',
        },
      },
      {
        id: 'cost-breakdown',
        type: 'chart',
        title: 'Cost Breakdown',
        dataSource: 'financial/cost-breakdown',
        configuration: {
          chartType: 'donut',
          groupBy: 'category',
        },
      },
      {
        id: 'savings-opportunities',
        type: 'table',
        title: 'Savings Opportunities',
        dataSource: 'financial/savings-opportunities',
        configuration: {
          columns: ['service', 'current_cost', 'potential_savings', 'recommendation'],
          sortBy: 'potential_savings',
          sortOrder: 'desc',
        },
      },
      {
        id: 'budget-tracking',
        type: 'chart',
        title: 'Budget vs Actual',
        dataSource: 'financial/budget-tracking',
        configuration: {
          chartType: 'bar',
          showComparison: true,
        },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Data Analyst Dashboard
  {
    id: 'analytics-overview',
    name: 'Analytics Overview',
    description: 'Data analysis and reporting dashboard',
    role: 'analyst',
    isDefault: true,
    layouts: {
      lg: [
        { i: 'data-quality', x: 0, y: 0, w: 3, h: 3 },
        { i: 'processing-rate', x: 3, y: 0, w: 3, h: 3 },
        { i: 'insights-generated', x: 6, y: 0, w: 3, h: 3 },
        { i: 'accuracy-score', x: 9, y: 0, w: 3, h: 3 },
        { i: 'data-pipeline', x: 0, y: 3, w: 8, h: 5 },
        { i: 'model-performance', x: 8, y: 3, w: 4, h: 5 },
        { i: 'trend-analysis', x: 0, y: 8, w: 6, h: 4 },
        { i: 'anomaly-detection', x: 6, y: 8, w: 6, h: 4 },
      ],
      md: [
        { i: 'data-quality', x: 0, y: 0, w: 3, h: 3 },
        { i: 'processing-rate', x: 3, y: 0, w: 3, h: 3 },
        { i: 'insights-generated', x: 6, y: 0, w: 3, h: 3 },
        { i: 'accuracy-score', x: 9, y: 0, w: 3, h: 3 },
        { i: 'data-pipeline', x: 0, y: 3, w: 12, h: 5 },
        { i: 'model-performance', x: 0, y: 8, w: 6, h: 5 },
        { i: 'trend-analysis', x: 6, y: 8, w: 6, h: 5 },
        { i: 'anomaly-detection', x: 0, y: 13, w: 12, h: 4 },
      ],
      sm: [
        { i: 'data-quality', x: 0, y: 0, w: 6, h: 3 },
        { i: 'processing-rate', x: 6, y: 0, w: 6, h: 3 },
        { i: 'insights-generated', x: 0, y: 3, w: 6, h: 3 },
        { i: 'accuracy-score', x: 6, y: 3, w: 6, h: 3 },
        { i: 'data-pipeline', x: 0, y: 6, w: 12, h: 5 },
        { i: 'model-performance', x: 0, y: 11, w: 12, h: 5 },
        { i: 'trend-analysis', x: 0, y: 16, w: 12, h: 4 },
        { i: 'anomaly-detection', x: 0, y: 20, w: 12, h: 4 },
      ],
    },
    widgets: [
      {
        id: 'data-quality',
        type: 'multi-metric',
        title: 'Data Quality',
        dataSource: 'analytics/data-quality',
        configuration: {
          metrics: ['completeness', 'accuracy', 'consistency'],
          showGauge: true,
        },
      },
      {
        id: 'processing-rate',
        type: 'performance-metric',
        title: 'Processing Rate',
        dataSource: 'analytics/processing-rate',
        configuration: {
          unit: 'records/sec',
          showTrend: true,
        },
      },
      {
        id: 'insights-generated',
        type: 'single-metric',
        title: 'Insights Generated',
        dataSource: 'analytics/insights',
        configuration: {
          showCount: true,
          timeRange: '24h',
        },
      },
      {
        id: 'accuracy-score',
        type: 'single-metric',
        title: 'Model Accuracy',
        dataSource: 'analytics/accuracy',
        configuration: {
          format: 'percentage',
          showGauge: true,
        },
      },
      {
        id: 'data-pipeline',
        type: 'chart',
        title: 'Data Pipeline Flow',
        dataSource: 'analytics/pipeline',
        configuration: {
          chartType: 'sankey',
          showFlow: true,
        },
      },
      {
        id: 'model-performance',
        type: 'performance-radar',
        title: 'Model Performance',
        dataSource: 'analytics/model-performance',
        configuration: {
          metrics: ['precision', 'recall', 'f1_score', 'accuracy'],
        },
      },
      {
        id: 'trend-analysis',
        type: 'chart',
        title: 'Trend Analysis',
        dataSource: 'analytics/trends',
        configuration: {
          chartType: 'line',
          timeRange: '30d',
          showPrediction: true,
        },
      },
      {
        id: 'anomaly-detection',
        type: 'table',
        title: 'Anomaly Detection',
        dataSource: 'analytics/anomalies',
        configuration: {
          columns: ['timestamp', 'type', 'severity', 'confidence', 'description'],
          sortBy: 'timestamp',
          sortOrder: 'desc',
        },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },

  // Viewer Dashboard (Read-only)
  {
    id: 'viewer-overview',
    name: 'System Overview',
    description: 'Read-only system overview dashboard',
    role: 'viewer',
    isDefault: true,
    layouts: {
      lg: [
        { i: 'system-status', x: 0, y: 0, w: 4, h: 3 },
        { i: 'key-metrics', x: 4, y: 0, w: 4, h: 3 },
        { i: 'recent-activity', x: 8, y: 0, w: 4, h: 3 },
        { i: 'performance-overview', x: 0, y: 3, w: 12, h: 5 },
        { i: 'summary-stats', x: 0, y: 8, w: 12, h: 4 },
      ],
      md: [
        { i: 'system-status', x: 0, y: 0, w: 6, h: 3 },
        { i: 'key-metrics', x: 6, y: 0, w: 6, h: 3 },
        { i: 'recent-activity', x: 0, y: 3, w: 12, h: 3 },
        { i: 'performance-overview', x: 0, y: 6, w: 12, h: 5 },
        { i: 'summary-stats', x: 0, y: 11, w: 12, h: 4 },
      ],
      sm: [
        { i: 'system-status', x: 0, y: 0, w: 12, h: 3 },
        { i: 'key-metrics', x: 0, y: 3, w: 12, h: 3 },
        { i: 'recent-activity', x: 0, y: 6, w: 12, h: 3 },
        { i: 'performance-overview', x: 0, y: 9, w: 12, h: 5 },
        { i: 'summary-stats', x: 0, y: 14, w: 12, h: 4 },
      ],
    },
    widgets: [
      {
        id: 'system-status',
        type: 'single-metric',
        title: 'System Status',
        dataSource: 'system/status',
        configuration: {
          readonly: true,
          showStatus: true,
        },
      },
      {
        id: 'key-metrics',
        type: 'multi-metric',
        title: 'Key Metrics',
        dataSource: 'system/key-metrics',
        configuration: {
          readonly: true,
          metrics: ['uptime', 'response_time', 'throughput'],
        },
      },
      {
        id: 'recent-activity',
        type: 'list',
        title: 'Recent Activity',
        dataSource: 'system/activity',
        configuration: {
          readonly: true,
          limit: 10,
        },
      },
      {
        id: 'performance-overview',
        type: 'chart',
        title: 'Performance Overview',
        dataSource: 'system/performance',
        configuration: {
          readonly: true,
          chartType: 'area',
          timeRange: '24h',
        },
      },
      {
        id: 'summary-stats',
        type: 'table',
        title: 'Summary Statistics',
        dataSource: 'system/summary',
        configuration: {
          readonly: true,
          columns: ['metric', 'current', 'average', 'trend'],
        },
      },
    ],
    createdAt: new Date(),
    updatedAt: new Date(),
  },
];

// Helper function to get default dashboard for a role
export const getDefaultDashboardForRole = (role: string): DashboardTemplate | undefined => {
  const templates = createRoleDashboardTemplates();
  return templates.find(template => template.role === role && template.isDefault);
};

// Helper function to get all dashboards for a role
export const getDashboardsForRole = (role: string): DashboardTemplate[] => {
  const templates = createRoleDashboardTemplates();
  return templates.filter(template => template.role === role || !template.role);
};

// Helper function to validate dashboard permissions for a role
export const validateDashboardPermissions = (
  dashboard: DashboardTemplate,
  userRole: UserRole
): boolean => {
  // Admin can access all dashboards
  if (userRole.permissions.includes('*')) return true;
  
  // Check if dashboard is for user's role
  if (dashboard.role === userRole.id) return true;
  
  // Check if dashboard is public (no role specified)
  if (!dashboard.role) return true;
  
  return false;
};