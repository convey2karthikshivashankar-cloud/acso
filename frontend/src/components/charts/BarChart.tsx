import React from 'react';
import {
  BarChart as RechartsBarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  Cell,
  LabelList,
} from 'recharts';
import { useTheme } from '@mui/material';
import { BaseChart, BaseChartProps, ChartDataPoint } from './BaseChart';

export interface BarChartDataPoint extends ChartDataPoint {
  category: string;
  value: number;
  target?: number;
  comparison?: number;
  color?: string;
  label?: string;
}

export interface BarChartProps extends Omit<BaseChartProps, 'data'> {
  data: BarChartDataPoint[];
  orientation?: 'vertical' | 'horizontal';
  stacked?: boolean;
  grouped?: boolean;
  showValues?: boolean;
  showTarget?: boolean;
  showComparison?: boolean;
  sortBy?: 'value' | 'category' | 'none';
  sortOrder?: 'asc' | 'desc';
  maxBars?: number;
  barSize?: number;
  categoryColors?: Record<string, string>;
  valueFormat?: (value: number) => string;
  categoryFormat?: (category: string) => string;
}

export const BarChart: React.FC<BarChartProps> = ({
  data,
  orientation = 'vertical',
  stacked = false,
  grouped = false,
  showValues = false,
  showTarget = false,
  showComparison = false,
  sortBy = 'none',
  sortOrder = 'desc',
  maxBars,
  barSize,
  categoryColors = {},
  valueFormat = (value) => value.toString(),
  categoryFormat = (category) => category,
  config = {},
  ...baseProps
}) => {
  const theme = useTheme();

  // Process and sort data
  const processedData = React.useMemo(() => {
    let sortedData = [...data];

    // Apply sorting
    if (sortBy !== 'none') {
      sortedData.sort((a, b) => {
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

    // Limit number of bars if specified
    if (maxBars && sortedData.length > maxBars) {
      sortedData = sortedData.slice(0, maxBars);
    }

    return sortedData;
  }, [data, sortBy, sortOrder, maxBars]);

  // Get unique categories for grouped charts
  const categories = React.useMemo(() => {
    if (!grouped) return [];
    return Array.from(new Set(processedData.map(d => d.category)));
  }, [processedData, grouped]);

  const getBarColor = (dataPoint: BarChartDataPoint, index: number) => {
    if (dataPoint.color) return dataPoint.color;
    if (categoryColors[dataPoint.category]) return categoryColors[dataPoint.category];
    
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

  const renderCustomLabel = (props: any) => {
    const { x, y, width, height, value } = props;
    
    if (orientation === 'horizontal') {
      return (
        <text
          x={x + width + 5}
          y={y + height / 2}
          fill={theme.palette.text.primary}
          textAnchor="start"
          dominantBaseline="middle"
          fontSize={12}
        >
          {valueFormat(value)}
        </text>
      );
    } else {
      return (
        <text
          x={x + width / 2}
          y={y - 5}
          fill={theme.palette.text.primary}
          textAnchor="middle"
          dominantBaseline="bottom"
          fontSize={12}
        >
          {valueFormat(value)}
        </text>
      );
    }
  };

  const renderChart = () => {
    const isHorizontal = orientation === 'horizontal';

    return (
      <ResponsiveContainer width="100%" height="100%">
        <RechartsBarChart
          data={processedData}
          layout={isHorizontal ? 'horizontal' : 'vertical'}
          margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
        >
          <CartesianGrid 
            strokeDasharray="3 3" 
            stroke={theme.palette.divider}
            opacity={0.5}
          />
          
          {isHorizontal ? (
            <>
              <XAxis 
                type="number" 
                tickFormatter={valueFormat}
                stroke={theme.palette.text.secondary}
              />
              <YAxis 
                type="category" 
                dataKey="category"
                tickFormatter={categoryFormat}
                stroke={theme.palette.text.secondary}
                width={100}
              />
            </>
          ) : (
            <>
              <XAxis 
                dataKey="category"
                tickFormatter={categoryFormat}
                stroke={theme.palette.text.secondary}
                angle={-45}
                textAnchor="end"
                height={60}
              />
              <YAxis 
                tickFormatter={valueFormat}
                stroke={theme.palette.text.secondary}
              />
            </>
          )}
          
          <Tooltip
            formatter={(value: any, name: string) => [valueFormat(value), name]}
            labelFormatter={categoryFormat}
            contentStyle={{
              backgroundColor: theme.palette.background.paper,
              border: `1px solid ${theme.palette.divider}`,
              borderRadius: theme.shape.borderRadius,
            }}
          />
          
          {config.showLegend !== false && <Legend />}

          {/* Main bars */}
          <Bar
            dataKey="value"
            name="Value"
            maxBarSize={barSize}
            radius={[2, 2, 0, 0]}
          >
            {processedData.map((entry, index) => (
              <Cell key={`cell-${index}`} fill={getBarColor(entry, index)} />
            ))}
            {showValues && <LabelList content={renderCustomLabel} />}
          </Bar>

          {/* Target bars */}
          {showTarget && (
            <Bar
              dataKey="target"
              name="Target"
              fill={theme.palette.info.main}
              fillOpacity={0.6}
              maxBarSize={barSize}
            />
          )}

          {/* Comparison bars */}
          {showComparison && (
            <Bar
              dataKey="comparison"
              name="Comparison"
              fill={theme.palette.warning.main}
              fillOpacity={0.6}
              maxBarSize={barSize}
            />
          )}
        </RechartsBarChart>
      </ResponsiveContainer>
    );
  };

  return (
    <BaseChart
      data={processedData}
      config={{
        ...config,
        title: config.title || 'Bar Chart',
      }}
      {...baseProps}
    >
      {renderChart()}
    </BaseChart>
  );
};

export default BarChart;