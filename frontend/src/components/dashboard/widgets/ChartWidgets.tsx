import React from 'react';
import {
  Box,
  Typography,
  FormControl,
  Select,
  MenuItem,
  IconButton,
  Tooltip,
  useTheme,
} from '@mui/material';
import {
  Timeline,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart,
  Fullscreen,
} from '@mui/icons-material';
import {
  LineChart,
  Line,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  Legend,
  ResponsiveContainer,
  ScatterChart,
  Scatter,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  Radar,
  ComposedChart,
} from 'recharts';
import { FunctionalWidget } from './BaseWidget';

export interface ChartDataPoint {
  [key: string]: any;
  timestamp?: string | number;
  date?: string;
  name?: string;
}

export interface ChartSeries {
  dataKey: string;
  name: string;
  color?: string;
  type?: 'line' | 'area' | 'bar';
  yAxisId?: string;
}

export interface ChartWidgetProps {
  id: string;
  title?: string;
  subtitle?: string;
  data: ChartDataPoint[];
  series: ChartSeries[];
  chartType: 'line' | 'area' | 'bar' | 'pie' | 'scatter' | 'radar' | 'composed';
  xAxisKey?: string;
  showGrid?: boolean;
  showLegend?: boolean;
  showTooltip?: boolean;
  allowTypeChange?: boolean;
  height?: number;
  colors?: string[];
  onRefresh?: () => void;
  refreshInterval?: number;
  autoRefresh?: boolean;
}

const defaultColors = [
  '#8884d8', '#82ca9d', '#ffc658', '#ff7300', '#00ff00',
  '#0088fe', '#00c49f', '#ffbb28', '#ff8042', '#8dd1e1'
];

export const ChartWidget: React.FC<ChartWidgetProps> = ({
  id,
  title,
  subtitle,
  data,
  series,
  chartType: initialChartType,
  xAxisKey = 'timestamp',
  showGrid = true,
  showLegend = true,
  showTooltip = true,
  allowTypeChange = true,
  height = 300,
  colors = defaultColors,
  onRefresh,
  refreshInterval,
  autoRefresh = false,
}) => {
  const theme = useTheme();
  const [chartType, setChartType] = React.useState(initialChartType);
  const [isFullscreen, setIsFullscreen] = React.useState(false);

  const loadData = async () => {
    // Simulate API call - replace with actual data fetching
    return new Promise(resolve => {
      setTimeout(() => {
        resolve({ data, series });
      }, 500);
    });
  };

  const getSeriesColor = (index: number, seriesColor?: string) => {
    return seriesColor || colors[index % colors.length];
  };

  const renderLineChart = (chartData: ChartDataPoint[], chartSeries: ChartSeries[]) => (
    <LineChart data={chartData}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis 
        dataKey={xAxisKey} 
        tick={{ fontSize: 12 }}
        tickFormatter={(value) => {
          if (typeof value === 'string' && value.includes(':')) {
            return value; // Time format
          }
          return value;
        }}
      />
      <YAxis tick={{ fontSize: 12 }} />
      {showTooltip && <RechartsTooltip />}
      {showLegend && <Legend />}
      {chartSeries.map((series, index) => (
        <Line
          key={series.dataKey}
          type="monotone"
          dataKey={series.dataKey}
          stroke={getSeriesColor(index, series.color)}
          strokeWidth={2}
          dot={{ r: 4 }}
          activeDot={{ r: 6 }}
          name={series.name}
        />
      ))}
    </LineChart>
  );

  const renderAreaChart = (chartData: ChartDataPoint[], chartSeries: ChartSeries[]) => (
    <AreaChart data={chartData}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      {showTooltip && <RechartsTooltip />}
      {showLegend && <Legend />}
      {chartSeries.map((series, index) => (
        <Area
          key={series.dataKey}
          type="monotone"
          dataKey={series.dataKey}
          stackId="1"
          stroke={getSeriesColor(index, series.color)}
          fill={getSeriesColor(index, series.color)}
          fillOpacity={0.6}
          name={series.name}
        />
      ))}
    </AreaChart>
  );

  const renderBarChart = (chartData: ChartDataPoint[], chartSeries: ChartSeries[]) => (
    <BarChart data={chartData}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      {showTooltip && <RechartsTooltip />}
      {showLegend && <Legend />}
      {chartSeries.map((series, index) => (
        <Bar
          key={series.dataKey}
          dataKey={series.dataKey}
          fill={getSeriesColor(index, series.color)}
          name={series.name}
        />
      ))}
    </BarChart>
  );

  const renderPieChart = (chartData: ChartDataPoint[], chartSeries: ChartSeries[]) => {
    const pieData = chartData.map((item, index) => ({
      name: item.name || item[xAxisKey] || `Item ${index + 1}`,
      value: item[chartSeries[0]?.dataKey] || 0,
      fill: getSeriesColor(index),
    }));

    return (
      <PieChart>
        <Pie
          data={pieData}
          cx="50%"
          cy="50%"
          labelLine={false}
          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
          outerRadius={80}
          fill="#8884d8"
          dataKey="value"
        >
          {pieData.map((entry, index) => (
            <Cell key={`cell-${index}`} fill={entry.fill} />
          ))}
        </Pie>
        {showTooltip && <RechartsTooltip />}
        {showLegend && <Legend />}
      </PieChart>
    );
  };

  const renderScatterChart = (chartData: ChartDataPoint[], chartSeries: ChartSeries[]) => (
    <ScatterChart data={chartData}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      {showTooltip && <RechartsTooltip />}
      {showLegend && <Legend />}
      {chartSeries.map((series, index) => (
        <Scatter
          key={series.dataKey}
          dataKey={series.dataKey}
          fill={getSeriesColor(index, series.color)}
          name={series.name}
        />
      ))}
    </ScatterChart>
  );

  const renderRadarChart = (chartData: ChartDataPoint[], chartSeries: ChartSeries[]) => (
    <RadarChart data={chartData}>
      <PolarGrid />
      <PolarAngleAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
      <PolarRadiusAxis tick={{ fontSize: 12 }} />
      {showTooltip && <RechartsTooltip />}
      {showLegend && <Legend />}
      {chartSeries.map((series, index) => (
        <Radar
          key={series.dataKey}
          dataKey={series.dataKey}
          stroke={getSeriesColor(index, series.color)}
          fill={getSeriesColor(index, series.color)}
          fillOpacity={0.3}
          name={series.name}
        />
      ))}
    </RadarChart>
  );

  const renderComposedChart = (chartData: ChartDataPoint[], chartSeries: ChartSeries[]) => (
    <ComposedChart data={chartData}>
      {showGrid && <CartesianGrid strokeDasharray="3 3" />}
      <XAxis dataKey={xAxisKey} tick={{ fontSize: 12 }} />
      <YAxis tick={{ fontSize: 12 }} />
      {showTooltip && <RechartsTooltip />}
      {showLegend && <Legend />}
      {chartSeries.map((series, index) => {
        const color = getSeriesColor(index, series.color);
        switch (series.type) {
          case 'area':
            return (
              <Area
                key={series.dataKey}
                type="monotone"
                dataKey={series.dataKey}
                fill={color}
                stroke={color}
                fillOpacity={0.3}
                name={series.name}
              />
            );
          case 'bar':
            return (
              <Bar
                key={series.dataKey}
                dataKey={series.dataKey}
                fill={color}
                name={series.name}
              />
            );
          default:
            return (
              <Line
                key={series.dataKey}
                type="monotone"
                dataKey={series.dataKey}
                stroke={color}
                strokeWidth={2}
                dot={{ r: 4 }}
                name={series.name}
              />
            );
        }
      })}
    </ComposedChart>
  );

  const renderChart = (chartData: ChartDataPoint[], chartSeries: ChartSeries[]) => {
    switch (chartType) {
      case 'area':
        return renderAreaChart(chartData, chartSeries);
      case 'bar':
        return renderBarChart(chartData, chartSeries);
      case 'pie':
        return renderPieChart(chartData, chartSeries);
      case 'scatter':
        return renderScatterChart(chartData, chartSeries);
      case 'radar':
        return renderRadarChart(chartData, chartSeries);
      case 'composed':
        return renderComposedChart(chartData, chartSeries);
      default:
        return renderLineChart(chartData, chartSeries);
    }
  };

  const getChartIcon = (type: string) => {
    switch (type) {
      case 'area':
      case 'line':
        return <ShowChart />;
      case 'bar':
        return <BarChartIcon />;
      case 'pie':
        return <PieChartIcon />;
      default:
        return <Timeline />;
    }
  };

  const renderHeaderActions = () => (
    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
      {allowTypeChange && (
        <FormControl size="small" sx={{ minWidth: 120 }}>
          <Select
            value={chartType}
            onChange={(e) => setChartType(e.target.value as any)}
            displayEmpty
          >
            <MenuItem value="line">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShowChart fontSize="small" />
                Line
              </Box>
            </MenuItem>
            <MenuItem value="area">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <ShowChart fontSize="small" />
                Area
              </Box>
            </MenuItem>
            <MenuItem value="bar">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <BarChartIcon fontSize="small" />
                Bar
              </Box>
            </MenuItem>
            <MenuItem value="pie">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <PieChartIcon fontSize="small" />
                Pie
              </Box>
            </MenuItem>
            <MenuItem value="scatter">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline fontSize="small" />
                Scatter
              </Box>
            </MenuItem>
            <MenuItem value="radar">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline fontSize="small" />
                Radar
              </Box>
            </MenuItem>
            <MenuItem value="composed">
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Timeline fontSize="small" />
                Composed
              </Box>
            </MenuItem>
          </Select>
        </FormControl>
      )}
      
      <Tooltip title="Fullscreen">
        <IconButton
          size="small"
          onClick={() => setIsFullscreen(!isFullscreen)}
        >
          <Fullscreen />
        </IconButton>
      </Tooltip>
    </Box>
  );

  const renderContent = ({ data: widgetData }: { data: any }) => {
    const { data: chartData, series: chartSeries } = widgetData || { data, series };
    
    return (
      <Box
        sx={{
          height: isFullscreen ? '100vh' : height,
          width: '100%',
          p: 2,
          ...(isFullscreen && {
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: theme.zIndex.modal,
            backgroundColor: 'background.paper',
          }),
        }}
      >
        {isFullscreen && (
          <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
            <Typography variant="h5">{title}</Typography>
            {renderHeaderActions()}
          </Box>
        )}
        
        <ResponsiveContainer width="100%" height="100%">
          {renderChart(chartData, chartSeries)}
        </ResponsiveContainer>
      </Box>
    );
  };

  return (
    <FunctionalWidget
      id={id}
      title={!isFullscreen ? title : undefined}
      subtitle={subtitle}
      loadData={loadData}
      renderContent={renderContent}
      refreshInterval={refreshInterval}
      autoRefresh={autoRefresh}
      onRefresh={onRefresh}
      sx={{
        ...(isFullscreen && {
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          zIndex: theme.zIndex.modal,
        }),
      }}
    />
  );
};

// Predefined chart widgets for common use cases
export const SystemMetricsChartWidget: React.FC<{ id: string }> = ({ id }) => {
  const generateTimeSeriesData = () => {
    const now = new Date();
    return Array.from({ length: 24 }, (_, i) => {
      const time = new Date(now.getTime() - (23 - i) * 60 * 60 * 1000);
      return {
        timestamp: time.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        cpu: Math.floor(Math.random() * 40) + 30,
        memory: Math.floor(Math.random() * 30) + 50,
        network: Math.floor(Math.random() * 50) + 20,
      };
    });
  };

  return (
    <ChartWidget
      id={id}
      title="System Metrics Over Time"
      data={generateTimeSeriesData()}
      series={[
        { dataKey: 'cpu', name: 'CPU Usage (%)', color: '#8884d8' },
        { dataKey: 'memory', name: 'Memory Usage (%)', color: '#82ca9d' },
        { dataKey: 'network', name: 'Network Usage (%)', color: '#ffc658' },
      ]}
      chartType="line"
      xAxisKey="timestamp"
      autoRefresh={true}
      refreshInterval={30}
    />
  );
};

export const ThreatDetectionChartWidget: React.FC<{ id: string }> = ({ id }) => {
  const generateThreatData = () => {
    const categories = ['Malware', 'Phishing', 'DDoS', 'Intrusion', 'Data Breach'];
    return categories.map(category => ({
      name: category,
      detected: Math.floor(Math.random() * 50) + 10,
      blocked: Math.floor(Math.random() * 45) + 5,
    }));
  };

  return (
    <ChartWidget
      id={id}
      title="Threat Detection Summary"
      data={generateThreatData()}
      series={[
        { dataKey: 'detected', name: 'Detected', color: '#ff7300', type: 'bar' },
        { dataKey: 'blocked', name: 'Blocked', color: '#00ff00', type: 'bar' },
      ]}
      chartType="bar"
      xAxisKey="name"
      autoRefresh={true}
      refreshInterval={60}
    />
  );
};

export const PerformanceRadarWidget: React.FC<{ id: string }> = ({ id }) => {
  const performanceData = [
    {
      metric: 'Response Time',
      current: 85,
      target: 90,
    },
    {
      metric: 'Throughput',
      current: 92,
      target: 95,
    },
    {
      metric: 'Availability',
      current: 99,
      target: 99.9,
    },
    {
      metric: 'Error Rate',
      current: 95, // Inverted: lower is better
      target: 98,
    },
    {
      metric: 'Security',
      current: 88,
      target: 95,
    },
  ];

  return (
    <ChartWidget
      id={id}
      title="Performance Radar"
      data={performanceData}
      series={[
        { dataKey: 'current', name: 'Current', color: '#8884d8' },
        { dataKey: 'target', name: 'Target', color: '#82ca9d' },
      ]}
      chartType="radar"
      xAxisKey="metric"
      allowTypeChange={false}
      autoRefresh={true}
      refreshInterval={120}
    />
  );
};