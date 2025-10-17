// Base Chart Components
export { BaseChart } from './BaseChart';
export type { 
  BaseChartProps, 
  ChartDataPoint, 
  ChartConfig 
} from './BaseChart';

// Time Series Charts
export { TimeSeriesChart } from './TimeSeriesChart';
export type { 
  TimeSeriesChartProps, 
  TimeSeriesDataPoint 
} from './TimeSeriesChart';

// Bar Charts
export { BarChart } from './BarChart';
export type { 
  BarChartProps, 
  BarChartDataPoint 
} from './BarChart';

// Pie Charts
export { PieChart } from './PieChart';
export type { 
  PieChartProps, 
  PieChartDataPoint 
} from './PieChart';

// Heat Maps
export { HeatMap } from './HeatMap';
export type { 
  HeatMapProps, 
  HeatMapDataPoint 
} from './HeatMap';

// Network Topology
export { NetworkTopology } from './NetworkTopology';
export type { 
  NetworkTopologyProps, 
  NetworkNode, 
  NetworkEdge 
} from './NetworkTopology';

// Real-Time Charts
export { RealTimeChart } from './RealTimeChart';
export type { RealTimeChartProps } from './RealTimeChart';

// Interactive Features
export { InteractiveChart } from './InteractiveChart';
export type { 
  InteractiveChartProps, 
  DrillDownLevel, 
  ChartFilter, 
  InteractionState 
} from './InteractiveChart';

export { ChartExportDialog, ChartExporter } from './ChartExport';
export type { ExportOptions, ExportDialogProps } from './ChartExport';

export {
  chartLinkingManager,
  useChartLinking,
  createFilterLink,
  createHighlightLink,
  createZoomLink,
  createBrushLink,
} from './ChartLinking';
export type { 
  ChartLinkDefinition, 
  ChartLinkEvent, 
  LinkedChartState 
} from './ChartLinking';

// Examples
export { ChartLibraryExample } from './ChartLibraryExample';
export { RealTimeChartExample } from './RealTimeChartExample';
export { InteractiveVisualizationExample } from './InteractiveVisualizationExample';

// Chart utilities and helpers
export const generateMockTimeSeriesData = (
  points: number = 50,
  series: string[] = ['default'],
  timeRange: number = 24 * 60 * 60 * 1000 // 24 hours in ms
) => {
  const data = [];
  const now = Date.now();
  const interval = timeRange / points;

  for (let i = 0; i < points; i++) {
    const timestamp = new Date(now - timeRange + (i * interval));
    
    series.forEach(seriesName => {
      data.push({
        timestamp,
        value: Math.random() * 100 + Math.sin(i * 0.1) * 20,
        series: seriesName,
        category: seriesName,
      });
    });
  }

  return data;
};

export const generateMockBarData = (categories: string[] = ['A', 'B', 'C', 'D', 'E']) => {
  return categories.map(category => ({
    category,
    value: Math.random() * 100,
    target: Math.random() * 120,
    comparison: Math.random() * 80,
    timestamp: new Date(),
  }));
};

export const generateMockPieData = (categories: string[] = ['Category A', 'Category B', 'Category C', 'Category D']) => {
  return categories.map(category => ({
    category,
    value: Math.random() * 100 + 10,
    timestamp: new Date(),
  }));
};

export const generateMockHeatMapData = (
  xLabels: string[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'],
  yLabels: string[] = ['00:00', '06:00', '12:00', '18:00']
) => {
  const data = [];
  
  xLabels.forEach(x => {
    yLabels.forEach(y => {
      data.push({
        x,
        y,
        value: Math.random() * 100,
      });
    });
  });

  return data;
};

export const generateMockNetworkData = () => {
  const nodes = [
    { id: 'firewall-1', label: 'Firewall', type: 'firewall' as const, status: 'online' as const },
    { id: 'router-1', label: 'Router 1', type: 'router' as const, status: 'online' as const },
    { id: 'switch-1', label: 'Switch 1', type: 'switch' as const, status: 'online' as const },
    { id: 'switch-2', label: 'Switch 2', type: 'switch' as const, status: 'warning' as const },
    { id: 'server-1', label: 'Web Server', type: 'server' as const, status: 'online' as const },
    { id: 'server-2', label: 'DB Server', type: 'database' as const, status: 'online' as const },
    { id: 'client-1', label: 'Client 1', type: 'client' as const, status: 'online' as const },
    { id: 'client-2', label: 'Client 2', type: 'client' as const, status: 'offline' as const },
  ];

  const edges = [
    { id: 'e1', source: 'firewall-1', target: 'router-1', type: 'connection' as const, status: 'active' as const },
    { id: 'e2', source: 'router-1', target: 'switch-1', type: 'connection' as const, status: 'active' as const },
    { id: 'e3', source: 'router-1', target: 'switch-2', type: 'connection' as const, status: 'active' as const },
    { id: 'e4', source: 'switch-1', target: 'server-1', type: 'connection' as const, status: 'active' as const },
    { id: 'e5', source: 'switch-1', target: 'server-2', type: 'connection' as const, status: 'active' as const },
    { id: 'e6', source: 'switch-2', target: 'client-1', type: 'connection' as const, status: 'active' as const },
    { id: 'e7', source: 'switch-2', target: 'client-2', type: 'connection' as const, status: 'inactive' as const },
    { id: 'e8', source: 'server-1', target: 'server-2', type: 'data_flow' as const, status: 'active' as const },
  ];

  return { nodes, edges };
};

// Chart color palettes
export const chartColorPalettes = {
  default: [
    '#1976d2', '#dc004e', '#9c27b0', '#673ab7', '#3f51b5',
    '#2196f3', '#03a9f4', '#00bcd4', '#009688', '#4caf50',
    '#8bc34a', '#cddc39', '#ffeb3b', '#ffc107', '#ff9800',
    '#ff5722', '#795548', '#9e9e9e', '#607d8b'
  ],
  
  status: {
    success: '#4caf50',
    warning: '#ff9800',
    error: '#f44336',
    info: '#2196f3',
    neutral: '#9e9e9e',
  },
  
  categorical: [
    '#e3f2fd', '#bbdefb', '#90caf9', '#64b5f6', '#42a5f5',
    '#2196f3', '#1e88e5', '#1976d2', '#1565c0', '#0d47a1'
  ],
  
  sequential: [
    '#f3e5f5', '#e1bee7', '#ce93d8', '#ba68c8', '#ab47bc',
    '#9c27b0', '#8e24aa', '#7b1fa2', '#6a1b9a', '#4a148c'
  ],
  
  diverging: [
    '#d32f2f', '#f44336', '#ff5722', '#ff9800', '#ffc107',
    '#ffeb3b', '#cddc39', '#8bc34a', '#4caf50', '#2e7d32'
  ],
};

// Chart formatting utilities
export const formatters = {
  number: (value: number, decimals: number = 0) => {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value);
  },
  
  currency: (value: number, currency: string = 'USD') => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
    }).format(value);
  },
  
  percentage: (value: number, decimals: number = 1) => {
    return new Intl.NumberFormat('en-US', {
      style: 'percent',
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
    }).format(value / 100);
  },
  
  bytes: (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  },
  
  duration: (milliseconds: number) => {
    const seconds = Math.floor(milliseconds / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);
    
    if (days > 0) return `${days}d ${hours % 24}h`;
    if (hours > 0) return `${hours}h ${minutes % 60}m`;
    if (minutes > 0) return `${minutes}m ${seconds % 60}s`;
    return `${seconds}s`;
  },
};