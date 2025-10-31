import { format, subDays, subHours, subMinutes } from 'date-fns';

export interface DataPoint {
  timestamp: string;
  value: number;
  label?: string;
  category?: string;
  metadata?: Record<string, any>;
}

export interface TimeSeriesData {
  id: string;
  name: string;
  data: DataPoint[];
  color?: string;
  type?: 'line' | 'area' | 'bar' | 'scatter';
}

export interface MetricCard {
  id: string;
  title: string;
  value: number | string;
  previousValue?: number | string;
  change?: number;
  changeType?: 'increase' | 'decrease' | 'neutral';
  format?: 'number' | 'percentage' | 'currency' | 'bytes' | 'duration';
  icon?: string;
  color?: string;
  trend?: DataPoint[];
  status?: 'healthy' | 'warning' | 'critical';
}

export interface VisualizationTheme {
  colors: {
    primary: string[];
    secondary: string[];
    success: string[];
    warning: string[];
    error: string[];
    info: string[];
  };
  fonts: {
    family: string;
    size: {
      small: number;
      medium: number;
      large: number;
    };
  };
}

class DataVisualizationEngine {
  private themes: Map<string, VisualizationTheme> = new Map();
  private currentTheme: string = 'default';
  private animationEnabled: boolean = true;

  constructor() {
    this.initializeThemes();
  }

  private initializeThemes(): void {
    this.themes.set('default', {
      colors: {
        primary: ['#1976d2', '#1565c0', '#0d47a1', '#42a5f5', '#64b5f6'],
        secondary: ['#dc004e', '#c51162', '#ad1457', '#f06292', '#f48fb1'],
        success: ['#2e7d32', '#1b5e20', '#388e3c', '#66bb6a', '#81c784'],
        warning: ['#f57c00', '#e65100', '#ff9800', '#ffb74d', '#ffcc02'],
        error: ['#d32f2f', '#c62828', '#f44336', '#ef5350', '#e57373'],
        info: ['#0288d1', '#0277bd', '#03a9f4', '#29b6f6', '#4fc3f7'],
      },
      fonts: {
        family: 'Roboto, Arial, sans-serif',
        size: {
          small: 12,
          medium: 14,
          large: 16,
        },
      },
    });

    this.themes.set('dark', {
      colors: {
        primary: ['#90caf9', '#64b5f6', '#42a5f5', '#2196f3', '#1976d2'],
        secondary: ['#f48fb1', '#f06292', '#ec407a', '#e91e63', '#c2185b'],
        success: ['#a5d6a7', '#81c784', '#66bb6a', '#4caf50', '#388e3c'],
        warning: ['#ffcc02', '#ffb74d', '#ff9800', '#f57c00', '#e65100'],
        error: ['#ef5350', '#f44336', '#e53935', '#d32f2f', '#c62828'],
        info: ['#4fc3f7', '#29b6f6', '#03a9f4', '#0288d1', '#0277bd'],
      },
      fonts: {
        family: 'Roboto, Arial, sans-serif',
        size: {
          small: 12,
          medium: 14,
          large: 16,
        },
      },
    });
  }

  setTheme(themeName: string): void {
    if (this.themes.has(themeName)) {
      this.currentTheme = themeName;
    }
  }

  getCurrentTheme(): VisualizationTheme {
    return this.themes.get(this.currentTheme) || this.themes.get('default')!;
  }

  setAnimationEnabled(enabled: boolean): void {
    this.animationEnabled = enabled;
  }

  generateTimeSeriesData(
    startDate: Date,
    endDate: Date,
    interval: 'minute' | 'hour' | 'day',
    baseValue: number = 100,
    volatility: number = 0.1
  ): DataPoint[] {
    const data: DataPoint[] = [];
    let currentDate = new Date(startDate);
    let currentValue = baseValue;

    while (currentDate <= endDate) {
      const randomChange = (Math.random() - 0.5) * 2 * volatility * baseValue;
      currentValue += randomChange;
      currentValue = Math.max(0, currentValue);

      data.push({
        timestamp: currentDate.toISOString(),
        value: Math.round(currentValue * 100) / 100,
      });

      switch (interval) {
        case 'minute':
          currentDate = subMinutes(currentDate, -1);
          break;
        case 'hour':
          currentDate = subHours(currentDate, -1);
          break;
        case 'day':
          currentDate = subDays(currentDate, -1);
          break;
      }
    }

    return data;
  }

  generateMetricCards(count: number = 6): MetricCard[] {
    const metrics = [
      {
        title: 'Active Agents',
        format: 'number' as const,
        icon: 'agents',
        baseValue: 45,
        volatility: 0.1,
      },
      {
        title: 'System Health',
        format: 'percentage' as const,
        icon: 'health',
        baseValue: 98.5,
        volatility: 0.02,
      },
      {
        title: 'Response Time',
        format: 'duration' as const,
        icon: 'speed',
        baseValue: 125,
        volatility: 0.3,
      },
      {
        title: 'Cost Savings',
        format: 'currency' as const,
        icon: 'savings',
        baseValue: 15420,
        volatility: 0.15,
      },
    ];

    return metrics.slice(0, count).map((metric, index) => {
      const currentValue = metric.baseValue * (1 + (Math.random() - 0.5) * metric.volatility);
      const previousValue = metric.baseValue * (1 + (Math.random() - 0.5) * metric.volatility);
      const change = ((currentValue - previousValue) / previousValue) * 100;
      
      const trendData = this.generateTimeSeriesData(
        subHours(new Date(), 24),
        new Date(),
        'hour',
        metric.baseValue,
        metric.volatility * 0.5
      );

      return {
        id: `metric_${index}`,
        title: metric.title,
        value: Math.round(currentValue * 100) / 100,
        previousValue: Math.round(previousValue * 100) / 100,
        change: Math.round(change * 100) / 100,
        changeType: change > 0 ? 'increase' : change < 0 ? 'decrease' : 'neutral',
        format: metric.format,
        icon: metric.icon,
        trend: trendData,
        status: currentValue > metric.baseValue * 0.9 ? 'healthy' : 
                currentValue > metric.baseValue * 0.7 ? 'warning' : 'critical',
      };
    });
  }

  formatValue(value: number | string, format: MetricCard['format']): string {
    if (typeof value === 'string') return value;
    
    switch (format) {
      case 'number':
        return value.toLocaleString();
      case 'percentage':
        return `${value.toFixed(1)}%`;
      case 'currency':
        return new Intl.NumberFormat('en-US', {
          style: 'currency',
          currency: 'USD',
        }).format(value);
      case 'bytes':
        const units = ['B', 'KB', 'MB', 'GB', 'TB'];
        let size = value;
        let unitIndex = 0;
        while (size >= 1024 && unitIndex < units.length - 1) {
          size /= 1024;
          unitIndex++;
        }
        return `${size.toFixed(1)} ${units[unitIndex]}`;
      case 'duration':
        if (value < 1000) return `${value.toFixed(0)}ms`;
        if (value < 60000) return `${(value / 1000).toFixed(1)}s`;
        return `${(value / 60000).toFixed(1)}m`;
      default:
        return value.toString();
    }
  }

  getColorPalette(category: keyof VisualizationTheme['colors'], count: number = 5): string[] {
    const theme = this.getCurrentTheme();
    const colors = theme.colors[category];
    
    if (count <= colors.length) {
      return colors.slice(0, count);
    }
    
    const result = [...colors];
    while (result.length < count) {
      const baseColor = colors[result.length % colors.length];
      result.push(baseColor);
    }
    
    return result;
  }
}

export const dataVisualizationEngine = new DataVisualizationEngine();
export default dataVisualizationEngine;