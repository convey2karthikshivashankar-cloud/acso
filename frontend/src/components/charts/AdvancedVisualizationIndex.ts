// Advanced Data Visualization Components
export { default as AdvancedTimeSeriesChart } from './AdvancedTimeSeriesChart';
export type { 
  AdvancedTimeSeriesChartProps, 
  TimeSeriesDataPoint, 
  TimeSeriesConfig 
} from './AdvancedTimeSeriesChart';

export { default as AdvancedNetworkTopology } from './AdvancedNetworkTopology';
export type { 
  AdvancedNetworkTopologyProps, 
  NetworkNode, 
  NetworkEdge, 
  LayoutAlgorithm 
} from './AdvancedNetworkTopology';

export { default as AdvancedHeatMap } from './AdvancedHeatMap';
export type { 
  AdvancedHeatMapProps, 
  HeatMapDataPoint, 
  ColorScheme, 
  AggregationFunction 
} from './AdvancedHeatMap';

export { default as DrillDownChart } from './DrillDownChart';
export type { 
  DrillDownChartProps, 
  DrillDownLevel, 
  DrillDownDataPoint, 
  ChartType 
} from './DrillDownChart';

// Chart Export Service
export { default as ChartExportService, exportUtils } from '../../services/chartExportService';
export type { 
  ExportFormat, 
  ExportOptions, 
  ChartExportData, 
  ExportResult 
} from '../../services/chartExportService';

// Re-export existing chart components for completeness
export { default as BaseChart } from './BaseChart';
export { default as TimeSeriesChart } from './TimeSeriesChart';
export { default as BarChart } from './BarChart';
export { default as PieChart } from './PieChart';
export { default as HeatMap } from './HeatMap';
export { default as NetworkTopology } from './NetworkTopology';
export { default as InteractiveChart } from './InteractiveChart';
export { default as RealTimeChart } from './RealTimeChart';
export { default as ChartExport } from './ChartExport';
export { default as ChartLinking } from './ChartLinking';

// Utility functions for advanced visualizations
export const visualizationUtils = {
  // Generate sample time series data
  generateTimeSeriesData: (
    points: number = 100,
    series: number = 1,
    startDate: Date = new Date(Date.now() - 24 * 60 * 60 * 1000)
  ) => {
    const data = [];
    const interval = (24 * 60 * 60 * 1000) / points; // 24 hours divided by points
    
    for (let i = 0; i < points; i++) {
      const timestamp = startDate.getTime() + (i * interval);
      const point: any = {
        timestamp,
        date: new Date(timestamp).toISOString(),
      };
      
      for (let s = 0; s < series; s++) {
        point[`series_${s}`] = Math.random() * 100 + Math.sin(i / 10) * 20;
      }
      
      data.push(point);
    }
    
    return data;
  },

  // Generate sample network topology data
  generateNetworkData: (nodeCount: number = 20, edgeCount: number = 30) => {
    const nodeTypes = ['server', 'router', 'switch', 'firewall', 'endpoint', 'cloud', 'database'];
    const statuses = ['online', 'offline', 'warning', 'critical'];
    const edgeTypes = ['ethernet', 'wifi', 'vpn', 'internet', 'internal'];
    const edgeStatuses = ['active', 'inactive', 'congested', 'error'];

    const nodes = Array.from({ length: nodeCount }, (_, i) => ({
      id: `node_${i}`,
      label: `Node ${i + 1}`,
      type: nodeTypes[Math.floor(Math.random() * nodeTypes.length)] as any,
      status: statuses[Math.floor(Math.random() * statuses.length)] as any,
      size: 15 + Math.random() * 15,
      metadata: {
        cpu: Math.floor(Math.random() * 100),
        memory: Math.floor(Math.random() * 100),
        uptime: Math.floor(Math.random() * 365),
      },
    }));

    const edges = Array.from({ length: Math.min(edgeCount, nodeCount * (nodeCount - 1) / 2) }, (_, i) => {
      const sourceIndex = Math.floor(Math.random() * nodeCount);
      let targetIndex = Math.floor(Math.random() * nodeCount);
      while (targetIndex === sourceIndex) {
        targetIndex = Math.floor(Math.random() * nodeCount);
      }

      return {
        id: `edge_${i}`,
        source: nodes[sourceIndex].id,
        target: nodes[targetIndex].id,
        type: edgeTypes[Math.floor(Math.random() * edgeTypes.length)] as any,
        status: edgeStatuses[Math.floor(Math.random() * edgeStatuses.length)] as any,
        bandwidth: Math.floor(Math.random() * 1000) + 10,
        latency: Math.floor(Math.random() * 100) + 1,
        utilization: Math.random() * 100,
        animated: Math.random() > 0.7,
      };
    });

    return { nodes, edges };
  },

  // Generate sample heat map data
  generateHeatMapData: (width: number = 20, height: number = 15) => {
    const data = [];
    
    for (let x = 0; x < width; x++) {
      for (let y = 0; y < height; y++) {
        // Create some interesting patterns
        const centerX = width / 2;
        const centerY = height / 2;
        const distance = Math.sqrt((x - centerX) ** 2 + (y - centerY) ** 2);
        const noise = Math.random() * 0.3;
        const pattern = Math.sin(x / 3) * Math.cos(y / 3);
        const value = Math.max(0, 1 - distance / Math.max(centerX, centerY) + pattern * 0.3 + noise);
        
        data.push({
          x,
          y,
          value: value * 100,
          label: `Cell (${x}, ${y})`,
          metadata: {
            category: Math.random() > 0.5 ? 'A' : 'B',
            priority: Math.floor(Math.random() * 5) + 1,
          },
        });
      }
    }
    
    return data;
  },

  // Generate sample drill-down data
  generateDrillDownData: () => {
    const levels = [
      {
        id: 'root',
        name: 'Global Overview',
        data: [
          {
            id: 'region_na',
            name: 'North America',
            value: 45000,
            trend: 'up' as const,
            trendValue: 12.5,
            drillable: true,
            color: '#2196F3',
          },
          {
            id: 'region_eu',
            name: 'Europe',
            value: 38000,
            trend: 'stable' as const,
            trendValue: 0.8,
            drillable: true,
            color: '#4CAF50',
          },
          {
            id: 'region_asia',
            name: 'Asia Pacific',
            value: 52000,
            trend: 'up' as const,
            trendValue: 18.2,
            drillable: true,
            color: '#FF9800',
          },
        ],
      },
      {
        id: 'region_na',
        name: 'North America Details',
        parentId: 'root',
        data: [
          {
            id: 'country_us',
            name: 'United States',
            value: 35000,
            trend: 'up' as const,
            trendValue: 15.2,
            drillable: true,
          },
          {
            id: 'country_ca',
            name: 'Canada',
            value: 8000,
            trend: 'up' as const,
            trendValue: 8.5,
            drillable: true,
          },
          {
            id: 'country_mx',
            name: 'Mexico',
            value: 2000,
            trend: 'down' as const,
            trendValue: -2.1,
            drillable: false,
          },
        ],
      },
      {
        id: 'region_eu',
        name: 'Europe Details',
        parentId: 'root',
        data: [
          {
            id: 'country_de',
            name: 'Germany',
            value: 15000,
            trend: 'up' as const,
            trendValue: 3.2,
            drillable: false,
          },
          {
            id: 'country_fr',
            name: 'France',
            value: 12000,
            trend: 'stable' as const,
            trendValue: 0.5,
            drillable: false,
          },
          {
            id: 'country_uk',
            name: 'United Kingdom',
            value: 11000,
            trend: 'down' as const,
            trendValue: -1.8,
            drillable: false,
          },
        ],
      },
      {
        id: 'region_asia',
        name: 'Asia Pacific Details',
        parentId: 'root',
        data: [
          {
            id: 'country_jp',
            name: 'Japan',
            value: 20000,
            trend: 'up' as const,
            trendValue: 12.8,
            drillable: false,
          },
          {
            id: 'country_cn',
            name: 'China',
            value: 25000,
            trend: 'up' as const,
            trendValue: 22.5,
            drillable: false,
          },
          {
            id: 'country_au',
            name: 'Australia',
            value: 7000,
            trend: 'up' as const,
            trendValue: 8.9,
            drillable: false,
          },
        ],
      },
    ];

    return levels;
  },

  // Color palette generators
  generateColorPalette: (count: number, scheme: 'categorical' | 'sequential' | 'diverging' = 'categorical') => {
    switch (scheme) {
      case 'categorical':
        return Array.from({ length: count }, (_, i) => 
          `hsl(${(i * 360) / count}, 70%, 50%)`
        );
      case 'sequential':
        return Array.from({ length: count }, (_, i) => 
          `hsl(220, 70%, ${20 + (i * 60) / count}%)`
        );
      case 'diverging':
        return Array.from({ length: count }, (_, i) => {
          const hue = i < count / 2 ? 220 : 0; // Blue to Red
          const lightness = 30 + (Math.abs(i - count / 2) * 40) / (count / 2);
          return `hsl(${hue}, 70%, ${lightness}%)`;
        });
      default:
        return Array.from({ length: count }, () => '#8884d8');
    }
  },

  // Data transformation utilities
  aggregateData: (data: any[], groupBy: string, aggregateField: string, aggregateFunction: 'sum' | 'avg' | 'count' = 'sum') => {
    const grouped = data.reduce((acc, item) => {
      const key = item[groupBy];
      if (!acc[key]) {
        acc[key] = [];
      }
      acc[key].push(item);
      return acc;
    }, {} as Record<string, any[]>);

    return Object.entries(grouped).map(([key, items]) => {
      let value: number;
      switch (aggregateFunction) {
        case 'sum':
          value = items.reduce((sum, item) => sum + (item[aggregateField] || 0), 0);
          break;
        case 'avg':
          value = items.reduce((sum, item) => sum + (item[aggregateField] || 0), 0) / items.length;
          break;
        case 'count':
          value = items.length;
          break;
        default:
          value = 0;
      }
      
      return {
        name: key,
        value,
        count: items.length,
        items,
      };
    });
  },

  // Time series data smoothing
  smoothTimeSeriesData: (data: any[], field: string, windowSize: number = 5) => {
    return data.map((point, index) => {
      const start = Math.max(0, index - Math.floor(windowSize / 2));
      const end = Math.min(data.length, index + Math.ceil(windowSize / 2));
      const window = data.slice(start, end);
      const smoothedValue = window.reduce((sum, p) => sum + (p[field] || 0), 0) / window.length;
      
      return {
        ...point,
        [`${field}_smoothed`]: smoothedValue,
      };
    });
  },
};

// Export all utilities and components
export default {
  AdvancedTimeSeriesChart,
  AdvancedNetworkTopology,
  AdvancedHeatMap,
  DrillDownChart,
  ChartExportService,
  visualizationUtils,
  exportUtils,
};