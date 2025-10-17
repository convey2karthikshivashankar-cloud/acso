import React from 'react';
import {
  PieChart as RechartsPieChart,
  Pie,
  Cell,
  ResponsiveContainer,
  Tooltip,
  Legend,
  LabelList,
} from 'recharts';
import { useTheme, Box, Typography } from '@mui/material';
import { BaseChart, BaseChartProps, ChartDataPoint } from './BaseChart';

export interface PieChartDataPoint extends ChartDataPoint {
  category: string;
  value: number;
  color?: string;
  label?: string;
  percentage?: number;
}

export interface PieChartProps extends Omit<BaseChartProps, 'data'> {
  data: PieChartDataPoint[];
  variant?: 'pie' | 'donut';
  showLabels?: boolean;
  showPercentages?: boolean;
  showValues?: boolean;
  innerRadius?: number;
  outerRadius?: number;
  startAngle?: number;
  endAngle?: number;
  minAngle?: number;
  categoryColors?: Record<string, string>;
  valueFormat?: (value: number) => string;
  centerContent?: React.ReactNode;
  sortBy?: 'value' | 'category' | 'none';
  sortOrder?: 'asc' | 'desc';
  maxSlices?: number;
  groupSmallSlices?: boolean;
  smallSliceThreshold?: number;
}

export const PieChart: React.FC<PieChartProps> = ({
  data,
  variant = 'pie',
  showLabels = true,
  showPercentages = true,
  showValues = false,
  innerRadius,
  outerRadius,
  startAngle = 0,
  endAngle = 360,
  minAngle = 6,
  categoryColors = {},
  valueFormat = (value) => value.toString(),
  centerContent,
  sortBy = 'value',
  sortOrder = 'desc',
  maxSlices,
  groupSmallSlices = true,
  smallSliceThreshold = 0.02, // 2%
  config = {},
  ...baseProps
}) => {
  const theme = useTheme();

  // Process data
  const processedData = React.useMemo(() => {
    let workingData = [...data];
    
    // Calculate total for percentages
    const total = workingData.reduce((sum, item) => sum + item.value, 0);
    
    // Add percentages
    workingData = workingData.map(item => ({
      ...item,
      percentage: (item.value / total) * 100,
    }));

    // Group small slices if enabled
    if (groupSmallSlices && smallSliceThreshold > 0) {
      const smallSlices = workingData.filter(item => (item.percentage || 0) < smallSliceThreshold * 100);
      const largeSlices = workingData.filter(item => (item.percentage || 0) >= smallSliceThreshold * 100);
      
      if (smallSlices.length > 1) {
        const othersValue = smallSlices.reduce((sum, item) => sum + item.value, 0);
        const othersPercentage = smallSlices.reduce((sum, item) => sum + (item.percentage || 0), 0);
        
        workingData = [
          ...largeSlices,
          {
            category: 'Others',
            value: othersValue,
            percentage: othersPercentage,
            color: theme.palette.grey[400],
            timestamp: new Date(),
          },
        ];
      }
    }

    // Apply sorting
    if (sortBy !== 'none') {
      workingData.sort((a, b) => {
        let aValue: any, bValue: any;
        
        switch (sortBy) {
          case 'value':
            aValue = a.value;
            bValue = b.value;
            break;
          case 'category':
            aValue = a.category;
            bValue = b.category;
            break;
          default:
            return 0;
        }

        if (typeof aValue === 'string' && typeof bValue === 'string') {
          return sortOrder === 'asc' ? aValue.localeCompare(bValue) : bValue.localeCompare(aValue);
        }

        return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
      });
    }

    // Limit number of slices if specified
    if (maxSlices && workingData.length > maxSlices) {
      const topSlices = workingData.slice(0, maxSlices - 1);
      const remainingSlices = workingData.slice(maxSlices - 1);
      
      if (remainingSlices.length > 0) {
        const othersValue = remainingSlices.reduce((sum, item) => sum + item.value, 0);
        const othersPercentage = remainingSlices.reduce((sum, item) => sum + (item.percentage || 0), 0);
        
        workingData = [
          ...topSlices,
          {
            category: 'Others',
            value: othersValue,
            percentage: othersPercentage,
            color: theme.palette.grey[400],
            timestamp: new Date(),
          },
        ];
      }
    }

    return workingData;
  }, [data, sortBy, sortOrder, maxSlices, groupSmallSlices, smallSliceThreshold, theme.palette.grey]);

  const getSliceColor = (dataPoint: PieChartDataPoint, index: number) => {
    if (dataPoint.color) return dataPoint.color;
    if (categoryColors[dataPoint.category]) return categoryColors[dataPoint.category];
    
    const colors = [
      theme.palette.primary.main,
      theme.palette.secondary.main,
      theme.palette.error.main,
      theme.palette.warning.main,
      theme.palette.info.main,
      theme.palette.success.main,
      theme.palette.primary.light,
      theme.palette.secondary.light,
      theme.palette.error.light,
      theme.palette.warning.light,
      theme.palette.info.light,
      theme.palette.success.light,
    ];
    
    return colors[index % colors.length];
  };

  const renderCustomLabel = (entry: any) => {
    const { cx, cy, midAngle, innerRadius, outerRadius, value, category, percentage } = entry;
    
    const RADIAN = Math.PI / 180;
    const radius = innerRadius + (outerRadius - innerRadius) * 0.5;
    const x = cx + radius * Math.cos(-midAngle * RADIAN);
    const y = cy + radius * Math.sin(-midAngle * RADIAN);

    let labelText = category;
    if (showPercentages && showValues) {
      labelText = `${category}\n${percentage.toFixed(1)}% (${valueFormat(value)})`;
    } else if (showPercentages) {
      labelText = `${category}\n${percentage.toFixed(1)}%`;
    } else if (showValues) {
      labelText = `${category}\n${valueFormat(value)}`;
    }

    return (
      <text
        x={x}
        y={y}
        fill={theme.palette.text.primary}
        textAnchor={x > cx ? 'start' : 'end'}
        dominantBaseline="central"
        fontSize={12}
      >
        {labelText.split('\n').map((line, index) => (
          <tspan key={index} x={x} dy={index === 0 ? 0 : 14}>
            {line}
          </tspan>
        ))}
      </text>
    );
  };

  const renderCenterContent = () => {
    if (!centerContent && variant !== 'donut') return null;

    const total = processedData.reduce((sum, item) => sum + item.value, 0);

    return (
      <Box
        sx={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          pointerEvents: 'none',
        }}
      >
        {centerContent || (
          <>
            <Typography variant="h4" component="div" color="text.primary">
              {valueFormat(total)}
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Total
            </Typography>
          </>
        )}
      </Box>
    );
  };

  const renderChart = () => {
    const defaultInnerRadius = variant === 'donut' ? 60 : 0;
    const defaultOuterRadius = 120;

    return (
      <Box sx={{ position: 'relative', width: '100%', height: '100%' }}>
        <ResponsiveContainer width="100%" height="100%">
          <RechartsPieChart>
            <Pie
              data={processedData}
              cx="50%"
              cy="50%"
              startAngle={startAngle}
              endAngle={endAngle}
              innerRadius={innerRadius ?? defaultInnerRadius}
              outerRadius={outerRadius ?? defaultOuterRadius}
              paddingAngle={1}
              dataKey="value"
              minAngle={minAngle}
            >
              {processedData.map((entry, index) => (
                <Cell 
                  key={`cell-${index}`} 
                  fill={getSliceColor(entry, index)}
                  stroke={theme.palette.background.paper}
                  strokeWidth={2}
                />
              ))}
              {showLabels && (
                <LabelList content={renderCustomLabel} />
              )}
            </Pie>
            
            <Tooltip
              formatter={(value: any, name: string) => [valueFormat(value), name]}
              contentStyle={{
                backgroundColor: theme.palette.background.paper,
                border: `1px solid ${theme.palette.divider}`,
                borderRadius: theme.shape.borderRadius,
              }}
            />
            
            {config.showLegend !== false && (
              <Legend
                verticalAlign="bottom"
                height={36}
                formatter={(value, entry: any) => (
                  <span style={{ color: entry.color }}>
                    {value} ({entry.payload.percentage?.toFixed(1)}%)
                  </span>
                )}
              />
            )}
          </RechartsPieChart>
        </ResponsiveContainer>
        
        {renderCenterContent()}
      </Box>
    );
  };

  return (
    <BaseChart
      data={processedData}
      config={{
        ...config,
        title: config.title || `${variant === 'donut' ? 'Donut' : 'Pie'} Chart`,
      }}
      {...baseProps}
    >
      {renderChart()}
    </BaseChart>
  );
};

export default PieChart;