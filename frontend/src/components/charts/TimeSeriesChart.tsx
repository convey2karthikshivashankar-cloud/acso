import React from 'react';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Brush,
  ReferenceLine,
  Area,
  AreaChart,
} from 'recharts';
import { useTheme } from '@mui/material';
import { BaseChart, BaseChartProps, ChartDataPoint } from './BaseChart';

export interface TimeSeriesDataPoint extends ChartDataPoint {
  timestamp: Date | string | number;
  value: number;
  series?: string;
  predicted?: boolean;
  anomaly?: boolean;
  threshold?: number;
}

export interface TimeSeriesChartProps extends Omit<BaseChartProps, 'data'> {
  data: TimeSeriesDataPoint[];
  type?: 'line' | 'area' | 'step';
  showBrush?: boolean;
  showReferenceLine?: boolean;
  referenceValue?: number;
  showPrediction?: boolean;
  showAnomalies?: boolean;
  showThreshold?: boolean;
  realTime?: boolean;
  updateInterval?: number;
  timeFormat?: string;
  valueFormat?: (value: number) => string;
  multiSeries?: boolean;
  seriesColors?: Record<string, string>;
}

export const TimeSeriesChart: React.FC<TimeSeriesChartProps> = ({
  data,
  type = 'line',
  showBrush = false,
  showReferenceLine = false,
  referenceValue,
  showPrediction = false,
  showAnomalies = false,
  showThreshold = false,
  realTime = false,
  updateInterval = 5000,
  timeFormat = 'HH:mm',
  valueFormat = (value) => value.toString(),
  multiSeries = false,
  seriesColors = {},
  config = {},
  ...baseProps
}) => {
  const theme = useTheme();
  const [realtimeData, setRealtimeData] = React.useState(data);

  // Real-time data updates
  React.useEffect(() => {
    if (!realTime) return;

    const interval = setInterval(() => {
      // Simulate real-time data updates
      setRealtimeData(prevData => {
        const newDataPoint: TimeSeriesDataPoint = {
          timestamp: new Date(),
          value: Math.random() * 100,
          series: 'default',
        };
        
        // Keep only last 100 points for performance
        const updatedData = [...prevData.slice(-99), newDataPoint];
        return updatedData;
      });
    }, updateInterval);

    return () => clearInterval(interval);
  }, [realTime, updateInterval]);

  const chartData = realTime ? realtimeData : data;

  // Process data for multi-series
  const processedData = React.useMemo(() => {
    if (!multiSeries) {
      return chartData.map(point => ({
        ...point,
        timestamp: typeof point.timestamp === 'string' ? new Date(point.timestamp).getTime() : 
                  point.timestamp instanceof Date ? point.timestamp.getTime() : point.timestamp,
      }));
    }

    // Group by timestamp for multi-series
    const grouped = chartData.reduce((acc, point) => {
      const timestamp = typeof point.timestamp === 'string' ? new Date(point.timestamp).getTime() : 
                      point.timestamp instanceof Date ? point.timestamp.getTime() : point.timestamp;
      
      if (!acc[timestamp]) {
        acc[timestamp] = { timestamp };
      }
      
      const seriesKey = point.series || 'default';
      acc[timestamp][seriesKey] = point.value;
      
      if (point.predicted) {
        acc[timestamp][`${seriesKey}_predicted`] = point.value;
      }
      
      if (point.anomaly) {
        acc[timestamp][`${seriesKey}_anomaly`] = point.value;
      }
      
      if (point.threshold !== undefined) {
        acc[timestamp][`${seriesKey}_threshold`] = point.threshold;
      }
      
      return acc;
    }, {} as Record<number, any>);

    return Object.values(grouped).sort((a, b) => a.timestamp - b.timestamp);
  }, [chartData, multiSeries]);

  // Get unique series names
  const seriesNames = React.useMemo(() => {
    if (!multiSeries) return ['value'];
    
    const names = new Set<string>();
    chartData.forEach(point => {
      names.add(point.series || 'default');
    });
    return Array.from(names);
  }, [chartData, multiSeries]);

  const formatXAxisLabel = (tickItem: any) => {
    const date = new Date(tickItem);
    return date.toLocaleTimeString([], { 
      hour: '2-digit', 
      minute: '2-digit',
      ...(timeFormat.includes('ss') && { second: '2-digit' })
    });
  };

  const formatTooltipLabel = (label: any) => {
    const date = new Date(label);
    return date.toLocaleString();
  };

  const getSeriesColor = (seriesName: string, index: number) => {
    if (seriesColors[seriesName]) {
      return seriesColors[seriesName];
    }
    
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.success.main,
    ];
    
    return colors[index % colors.length];
  };

  const renderChart = () => {
    const ChartComponent = type === 'area' ? AreaChart : LineChart;
    const DataComponent = type === 'area' ? Area : Line;

    return (
      <ResponsiveContainer width="100%" height="100%">
        <ChartComponent data={processedData}>
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme.palette.divider}
            opacity={0.5}
          />
          
          <XAxis
            dataKey="timestamp"
            type="number"
            scale="time"
            domain={['dataMin', 'dataMax']}
            tickFormatter={formatXAxisLabel}
            stroke={theme.palette.text.secondary}
          />
          
          <YAxis
            tickFormatter={valueFormat}
            stroke={theme.palette.text.secondary}
          />
          
          <Tooltip
            labelFormatter={formatTooltipLabel}
            formatter={(value: any, name: string) => [valueFormat(value), name]}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius,
            }}
          />
          
          {config.showLegend !== false && <Legend />}

          {/* Main data series */}
          {seriesNames.map((seriesName, index) => (
            <DataComponent
              key={seriesName}
              type={type === 'step' ? 'stepAfter' : 'monotone'}
              dataKey={multiSeries ? seriesName : 'value'}
              stroke={getSeriesColor(seriesName, index)}
              fill={type === 'area' ? getSeriesColor(seriesName, index) : undefined}
              fillOpacity={type === 'area' ? 0.3 : undefined}
              strokeWidth={2}
              dot={false}
              activeDot={{ r: 4, fill: getSeriesColor(seriesName, index) }}
              name={seriesName}
            />
          ))}

          {/* Predicted values */}
          {showPrediction && seriesNames.map((seriesName, index) => (
            <Line
              key={`${seriesName}_predicted`}
              type="monotone"
              dataKey={`${seriesName}_predicted`}
              stroke={getSeriesColor(seriesName, index)}
              strokeDasharray="5 5"
              strokeWidth={1}
              dot={false}
              name={`${seriesName} (Predicted)`}
            />
          ))}

          {/* Anomaly points */}
          {showAnomalies && seriesNames.map((seriesName, index) => (
            <Line
              key={`${seriesName}_anomaly`}
              type="monotone"
              dataKey={`${seriesName}_anomaly`}
              stroke={theme.palette.error.main}
              strokeWidth={0}
              dot={{ r: 6, fill: theme.palette.error.main }}
              name={`${seriesName} (Anomaly)`}
            />
          ))}

          {/* Threshold lines */}
          {showThreshold && seriesNames.map((seriesName) => (
            <Line
              key={`${seriesName}_threshold`}
              type="monotone"
              dataKey={`${seriesName}_threshold`}
              stroke={theme.palette.warning.main}
              strokeDasharray="3 3"
              strokeWidth={1}
              dot={false}
              name={`${seriesName} Threshold`}
            />
          ))}

          {/* Reference line */}
          {showReferenceLine && referenceValue !== undefined && (
            <ReferenceLine
              y={referenceValue}
              stroke={theme.palette.info.main}
              strokeDasharray="2 2"
              label="Reference"
            />
          )}

          {/* Brush for zooming */}
          {showBrush && (
            <Brush
              dataKey="timestamp"
              height={30}
              stroke={theme.palette.primary.main}
              tickFormatter={formatXAxisLabel}
            />
          )}
        </ChartComponent>
      </ResponsiveContainer>
    );
  };

  return (
    <BaseChart
      data={chartData}
      config={{
        ...config,
        title: config.title || 'Time Series Chart',
      }}
      {...baseProps}
    >
      {renderChart()}
    </BaseChart>
  );
};

export default TimeSeriesChart;