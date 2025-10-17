import React from 'react';
import {
  Speed,
  Timeline,
  List as ListIcon,
  TableChart,
  Assessment,
  Security,
  MonetizationOn,
  People,
  Storage,
  NetworkCheck,
  Notifications,
  Dashboard as DashboardIcon,
} from '@mui/icons-material';

// Import all widget types
import { 
  SingleMetricWidget, 
  MultiMetricWidget,
  SystemHealthMetricWidget,
  PerformanceMetricWidget,
  SecurityMetricWidget,
} from './MetricWidgets';
import {
  ChartWidget,
  SystemMetricsChartWidget,
  ThreatDetectionChartWidget,
  PerformanceRadarWidget,
} from './ChartWidgets';
import {
  ListWidget,
  TableWidget,
  ActivityListWidget,
  AgentStatusTableWidget,
} from './ListTableWidgets';

export interface WidgetDefinition {
  id: string;
  name: string;
  description: string;
  category: 'metrics' | 'charts' | 'lists' | 'tables' | 'custom';
  icon: React.ReactNode;
  component: React.ComponentType<any>;
  defaultProps?: Record<string, any>;
  defaultSize: {
    w: number;
    h: number;
    minW?: number;
    minH?: number;
    maxW?: number;
    maxH?: number;
  };
  configurable?: boolean;
  configSchema?: Array<{
    key: string;
    label: string;
    type: 'text' | 'number' | 'boolean' | 'select' | 'color';
    options?: Array<{ value: any; label: string }>;
    default?: any;
  }>;
  permissions?: string[];
  tags?: string[];
}

// Widget Registry - Central registry of all available widgets
export class WidgetRegistry {
  private static widgets: Map<string, WidgetDefinition> = new Map();

  static register(definition: WidgetDefinition) {
    this.widgets.set(definition.id, definition);
  }

  static get(id: string): WidgetDefinition | undefined {
    return this.widgets.get(id);
  }

  static getAll(): WidgetDefinition[] {
    return Array.from(this.widgets.values());
  }

  static getByCategory(category: string): WidgetDefinition[] {
    return this.getAll().filter(widget => widget.category === category);
  }

  static getByTags(tags: string[]): WidgetDefinition[] {
    return this.getAll().filter(widget => 
      widget.tags?.some(tag => tags.includes(tag))
    );
  }

  static search(query: string): WidgetDefinition[] {
    const lowerQuery = query.toLowerCase();
    return this.getAll().filter(widget =>
      widget.name.toLowerCase().includes(lowerQuery) ||
      widget.description.toLowerCase().includes(lowerQuery) ||
      widget.tags?.some(tag => tag.toLowerCase().includes(lowerQuery))
    );
  }
}

// Register all available widgets
const registerWidgets = () => {
  // Metric Widgets
  WidgetRegistry.register({
    id: 'single-metric',
    name: 'Single Metric',
    description: 'Display a single key performance indicator with trend',
    category: 'metrics',
    icon: <Speed />,
    component: SingleMetricWidget,
    defaultSize: { w: 3, h: 3, minW: 2, minH: 2 },
    configurable: true,
    configSchema: [
      { key: 'title', label: 'Title', type: 'text', default: 'Metric' },
      { key: 'showProgress', label: 'Show Progress', type: 'boolean', default: false },
      { key: 'showTrend', label: 'Show Trend', type: 'boolean', default: true },
      { key: 'size', label: 'Size', type: 'select', options: [
        { value: 'small', label: 'Small' },
        { value: 'medium', label: 'Medium' },
        { value: 'large', label: 'Large' },
      ], default: 'medium' },
    ],
    tags: ['metric', 'kpi', 'performance'],
  });

  WidgetRegistry.register({
    id: 'multi-metric',
    name: 'Multi Metric',
    description: 'Display multiple metrics in a grid or list layout',
    category: 'metrics',
    icon: <Assessment />,
    component: MultiMetricWidget,
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
    configurable: true,
    configSchema: [
      { key: 'title', label: 'Title', type: 'text', default: 'Metrics' },
      { key: 'layout', label: 'Layout', type: 'select', options: [
        { value: 'grid', label: 'Grid' },
        { value: 'list', label: 'List' },
        { value: 'compact', label: 'Compact' },
      ], default: 'grid' },
      { key: 'columns', label: 'Columns', type: 'number', default: 2 },
    ],
    tags: ['metrics', 'dashboard', 'overview'],
  });

  WidgetRegistry.register({
    id: 'system-health-metric',
    name: 'System Health',
    description: 'Pre-configured system health metrics widget',
    category: 'metrics',
    icon: <Speed />,
    component: SystemHealthMetricWidget,
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
    configurable: false,
    tags: ['system', 'health', 'monitoring'],
  });

  WidgetRegistry.register({
    id: 'performance-metric',
    name: 'Performance Metrics',
    description: 'Pre-configured performance metrics widget',
    category: 'metrics',
    icon: <Timeline />,
    component: PerformanceMetricWidget,
    defaultSize: { w: 4, h: 3, minW: 3, minH: 2 },
    configurable: false,
    tags: ['performance', 'monitoring', 'system'],
  });

  WidgetRegistry.register({
    id: 'security-metric',
    name: 'Security Incidents',
    description: 'Security incident tracking metric',
    category: 'metrics',
    icon: <Security />,
    component: SecurityMetricWidget,
    defaultSize: { w: 3, h: 3, minW: 2, minH: 2 },
    configurable: false,
    tags: ['security', 'incidents', 'monitoring'],
  });

  // Chart Widgets
  WidgetRegistry.register({
    id: 'chart',
    name: 'Chart',
    description: 'Customizable chart widget with multiple visualization types',
    category: 'charts',
    icon: <Timeline />,
    component: ChartWidget,
    defaultSize: { w: 6, h: 4, minW: 4, minH: 3 },
    configurable: true,
    configSchema: [
      { key: 'title', label: 'Title', type: 'text', default: 'Chart' },
      { key: 'chartType', label: 'Chart Type', type: 'select', options: [
        { value: 'line', label: 'Line Chart' },
        { value: 'area', label: 'Area Chart' },
        { value: 'bar', label: 'Bar Chart' },
        { value: 'pie', label: 'Pie Chart' },
        { value: 'scatter', label: 'Scatter Plot' },
        { value: 'radar', label: 'Radar Chart' },
      ], default: 'line' },
      { key: 'showGrid', label: 'Show Grid', type: 'boolean', default: true },
      { key: 'showLegend', label: 'Show Legend', type: 'boolean', default: true },
    ],
    tags: ['chart', 'visualization', 'data'],
  });

  WidgetRegistry.register({
    id: 'system-metrics-chart',
    name: 'System Metrics Chart',
    description: 'Time-series chart showing system resource usage',
    category: 'charts',
    icon: <Timeline />,
    component: SystemMetricsChartWidget,
    defaultSize: { w: 6, h: 4, minW: 4, minH: 3 },
    configurable: false,
    tags: ['system', 'metrics', 'time-series'],
  });

  WidgetRegistry.register({
    id: 'threat-detection-chart',
    name: 'Threat Detection',
    description: 'Bar chart showing threat detection statistics',
    category: 'charts',
    icon: <Security />,
    component: ThreatDetectionChartWidget,
    defaultSize: { w: 6, h: 4, minW: 4, minH: 3 },
    configurable: false,
    tags: ['security', 'threats', 'detection'],
  });

  WidgetRegistry.register({
    id: 'performance-radar',
    name: 'Performance Radar',
    description: 'Radar chart showing performance metrics comparison',
    category: 'charts',
    icon: <Assessment />,
    component: PerformanceRadarWidget,
    defaultSize: { w: 4, h: 4, minW: 3, minH: 3 },
    configurable: false,
    tags: ['performance', 'radar', 'comparison'],
  });

  // List Widgets
  WidgetRegistry.register({
    id: 'list',
    name: 'List',
    description: 'Customizable list widget with search and filtering',
    category: 'lists',
    icon: <ListIcon />,
    component: ListWidget,
    defaultSize: { w: 4, h: 5, minW: 3, minH: 4 },
    configurable: true,
    configSchema: [
      { key: 'title', label: 'Title', type: 'text', default: 'List' },
      { key: 'searchable', label: 'Searchable', type: 'boolean', default: true },
      { key: 'filterable', label: 'Filterable', type: 'boolean', default: true },
      { key: 'paginated', label: 'Paginated', type: 'boolean', default: true },
      { key: 'itemsPerPage', label: 'Items Per Page', type: 'number', default: 10 },
      { key: 'dense', label: 'Dense Layout', type: 'boolean', default: false },
    ],
    tags: ['list', 'data', 'filtering'],
  });

  WidgetRegistry.register({
    id: 'activity-list',
    name: 'Activity Feed',
    description: 'Recent system activities and events',
    category: 'lists',
    icon: <Notifications />,
    component: ActivityListWidget,
    defaultSize: { w: 4, h: 5, minW: 3, minH: 4 },
    configurable: false,
    tags: ['activity', 'events', 'feed'],
  });

  // Table Widgets
  WidgetRegistry.register({
    id: 'table',
    name: 'Data Table',
    description: 'Advanced data table with sorting, filtering, and export',
    category: 'tables',
    icon: <TableChart />,
    component: TableWidget,
    defaultSize: { w: 8, h: 5, minW: 6, minH: 4 },
    configurable: true,
    configSchema: [
      { key: 'title', label: 'Title', type: 'text', default: 'Data Table' },
      { key: 'searchable', label: 'Searchable', type: 'boolean', default: true },
      { key: 'filterable', label: 'Filterable', type: 'boolean', default: true },
      { key: 'selectable', label: 'Selectable Rows', type: 'boolean', default: false },
      { key: 'exportable', label: 'Exportable', type: 'boolean', default: false },
      { key: 'dense', label: 'Dense Layout', type: 'boolean', default: false },
    ],
    tags: ['table', 'data', 'export'],
  });

  WidgetRegistry.register({
    id: 'agent-status-table',
    name: 'Agent Status Table',
    description: 'Table showing ACSO agent status and metrics',
    category: 'tables',
    icon: <DashboardIcon />,
    component: AgentStatusTableWidget,
    defaultSize: { w: 8, h: 5, minW: 6, minH: 4 },
    configurable: false,
    tags: ['agents', 'status', 'monitoring'],
  });
};

// Initialize widget registry
registerWidgets();

// Widget Factory - Creates widget instances
export class WidgetFactory {
  static createWidget(
    widgetId: string,
    instanceId: string,
    props: Record<string, any> = {}
  ) {
    const definition = WidgetRegistry.get(widgetId);
    if (!definition) {
      throw new Error(`Widget type '${widgetId}' not found in registry`);
    }

    const WidgetComponent = definition.component;
    const mergedProps = {
      ...definition.defaultProps,
      ...props,
      id: instanceId,
    };

    return {
      id: instanceId,
      type: widgetId,
      title: mergedProps.title || definition.name,
      component: WidgetComponent,
      props: mergedProps,
      layout: {
        x: 0,
        y: 0,
        w: definition.defaultSize.w,
        h: definition.defaultSize.h,
        minW: definition.defaultSize.minW,
        minH: definition.defaultSize.minH,
        maxW: definition.defaultSize.maxW,
        maxH: definition.defaultSize.maxH,
      },
      config: {
        allowResize: true,
        allowRemove: true,
        allowFullscreen: true,
        refreshInterval: 60,
      },
    };
  }

  static getAvailableWidgets(
    category?: string,
    tags?: string[],
    permissions?: string[]
  ): WidgetDefinition[] {
    let widgets = WidgetRegistry.getAll();

    if (category) {
      widgets = widgets.filter(widget => widget.category === category);
    }

    if (tags && tags.length > 0) {
      widgets = widgets.filter(widget =>
        widget.tags?.some(tag => tags.includes(tag))
      );
    }

    if (permissions && permissions.length > 0) {
      widgets = widgets.filter(widget =>
        !widget.permissions || 
        widget.permissions.some(permission => permissions.includes(permission))
      );
    }

    return widgets;
  }

  static searchWidgets(query: string): WidgetDefinition[] {
    return WidgetRegistry.search(query);
  }
}

// Widget Configuration Helper
export class WidgetConfigHelper {
  static getConfigSchema(widgetId: string) {
    const definition = WidgetRegistry.get(widgetId);
    return definition?.configSchema || [];
  }

  static validateConfig(widgetId: string, config: Record<string, any>) {
    const schema = this.getConfigSchema(widgetId);
    const errors: string[] = [];

    schema.forEach(field => {
      const value = config[field.key];
      
      if (field.type === 'number' && typeof value !== 'number') {
        errors.push(`${field.label} must be a number`);
      }
      
      if (field.type === 'boolean' && typeof value !== 'boolean') {
        errors.push(`${field.label} must be a boolean`);
      }
      
      if (field.options && !field.options.some(option => option.value === value)) {
        errors.push(`${field.label} must be one of: ${field.options.map(o => o.label).join(', ')}`);
      }
    });

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  static getDefaultConfig(widgetId: string) {
    const schema = this.getConfigSchema(widgetId);
    const config: Record<string, any> = {};

    schema.forEach(field => {
      if (field.default !== undefined) {
        config[field.key] = field.default;
      }
    });

    return config;
  }
}

export default WidgetRegistry;