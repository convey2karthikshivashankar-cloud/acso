import React from 'react';
import { Box, useTheme, Tooltip, Typography } from '@mui/material';
import { BaseChart, BaseChartProps } from './BaseChart';

export interface HeatMapDataPoint {
  x: string | number;
  y: string | number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

export interface HeatMapProps extends Omit<BaseChartProps, 'data'> {
  data: HeatMapDataPoint[];
  xLabels?: string[];
  yLabels?: string[];
  colorScale?: string[];
  minValue?: number;
  maxValue?: number;
  cellSize?: number;
  cellSpacing?: number;
  showValues?: boolean;
  valueFormat?: (value: number) => string;
  tooltipFormat?: (dataPoint: HeatMapDataPoint) => string;
  onCellClick?: (dataPoint: HeatMapDataPoint) => void;
  onCellHover?: (dataPoint: HeatMapDataPoint | null) => void;
}

export const HeatMap: React.FC<HeatMapProps> = ({
  data,
  xLabels,
  yLabels,
  colorScale,
  minValue,
  maxValue,
  cellSize = 40,
  cellSpacing = 2,
  showValues = false,
  valueFormat = (value) => value.toString(),
  tooltipFormat,
  onCellClick,
  onCellHover,
  config = {},
  ...baseProps
}) => {
  const theme = useTheme();
  const [hoveredCell, setHoveredCell] = React.useState<HeatMapDataPoint | null>(null);
  const [mousePosition, setMousePosition] = React.useState({ x: 0, y: 0 });

  // Calculate value range
  const { min, max } = React.useMemo(() => {
    const values = data.map(d => d.value);
    return {
      min: minValue ?? Math.min(...values),
      max: maxValue ?? Math.max(...values),
    };
  }, [data, minValue, maxValue]);

  // Default color scale
  const defaultColorScale = [
    theme.palette.primary.light,
    theme.palette.primary.main,
    theme.palette.primary.dark,
  ];

  const colors = colorScale || defaultColorScale;

  // Get unique x and y values
  const { uniqueX, uniqueY } = React.useMemo(() => {
    const xSet = new Set(data.map(d => d.x));
    const ySet = new Set(data.map(d => d.y));
    
    return {
      uniqueX: xLabels || Array.from(xSet).sort(),
      uniqueY: yLabels || Array.from(ySet).sort(),
    };
  }, [data, xLabels, yLabels]);

  // Create data matrix
  const dataMatrix = React.useMemo(() => {
    const matrix: (HeatMapDataPoint | null)[][] = [];
    
    uniqueY.forEach((y, yIndex) => {
      matrix[yIndex] = [];
      uniqueX.forEach((x, xIndex) => {
        const dataPoint = data.find(d => d.x === x && d.y === y);
        matrix[yIndex][xIndex] = dataPoint || null;
      });
    });
    
    return matrix;
  }, [data, uniqueX, uniqueY]);

  // Get color for value
  const getColor = (value: number) => {
    if (min === max) return colors[0];
    
    const normalizedValue = (value - min) / (max - min);
    const colorIndex = Math.floor(normalizedValue * (colors.length - 1));
    const clampedIndex = Math.max(0, Math.min(colors.length - 1, colorIndex));
    
    // Interpolate between colors if needed
    if (colorIndex < colors.length - 1 && normalizedValue * (colors.length - 1) % 1 !== 0) {
      const ratio = (normalizedValue * (colors.length - 1)) % 1;
      const color1 = colors[clampedIndex];
      const color2 = colors[clampedIndex + 1];
      
      // Simple color interpolation (this could be enhanced with proper color space interpolation)
      return color1; // For now, just return the base color
    }
    
    return colors[clampedIndex];
  };

  const handleCellMouseEnter = (dataPoint: HeatMapDataPoint, event: React.MouseEvent) => {
    setHoveredCell(dataPoint);
    setMousePosition({ x: event.clientX, y: event.clientY });
    onCellHover?.(dataPoint);
  };

  const handleCellMouseLeave = () => {
    setHoveredCell(null);
    onCellHover?.(null);
  };

  const handleCellClick = (dataPoint: HeatMapDataPoint) => {
    onCellClick?.(dataPoint);
  };

  const renderTooltip = () => {
    if (!hoveredCell) return null;

    const tooltipContent = tooltipFormat 
      ? tooltipFormat(hoveredCell)
      : `X: ${hoveredCell.x}\nY: ${hoveredCell.y}\nValue: ${valueFormat(hoveredCell.value)}`;

    return (
      <Box
        sx={{
          position: 'fixed',
          left: mousePosition.x + 10,
          top: mousePosition.y - 10,
          backgroundColor: theme.palette.background.paper,
          border: `1px solid ${theme.palette.divider}`,
          borderRadius: 1,
          padding: 1,
          boxShadow: theme.shadows[4],
          zIndex: 1000,
          pointerEvents: 'none',
          whiteSpace: 'pre-line',
        }}
      >
        <Typography variant="body2">
          {tooltipContent}
        </Typography>
      </Box>
    );
  };

  const renderHeatMap = () => {
    const totalWidth = uniqueX.length * (cellSize + cellSpacing) - cellSpacing;
    const totalHeight = uniqueY.length * (cellSize + cellSpacing) - cellSpacing;

    return (
      <Box
        sx={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          width: '100%',
          height: '100%',
          position: 'relative',
        }}
      >
        {/* Y-axis labels */}
        <Box sx={{ display: 'flex', alignItems: 'flex-start' }}>
          <Box
            sx={{
              display: 'flex',
              flexDirection: 'column',
              justifyContent: 'space-around',
              height: totalHeight,
              marginRight: 2,
              paddingTop: `${cellSize / 2}px`,
            }}
          >
            {uniqueY.map((label, index) => (
              <Typography
                key={index}
                variant="body2"
                sx={{
                  height: cellSize,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'flex-end',
                  marginBottom: index < uniqueY.length - 1 ? `${cellSpacing}px` : 0,
                }}
              >
                {label}
              </Typography>
            ))}
          </Box>

          {/* Heat map grid */}
          <Box>
            <svg width={totalWidth} height={totalHeight}>
              {dataMatrix.map((row, yIndex) =>
                row.map((dataPoint, xIndex) => {
                  const x = xIndex * (cellSize + cellSpacing);
                  const y = yIndex * (cellSize + cellSpacing);
                  
                  if (!dataPoint) {
                    return (
                      <rect
                        key={`${xIndex}-${yIndex}`}
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        fill={theme.palette.grey[200]}
                        stroke={theme.palette.divider}
                        strokeWidth={1}
                      />
                    );
                  }

                  return (
                    <g key={`${xIndex}-${yIndex}`}>
                      <rect
                        x={x}
                        y={y}
                        width={cellSize}
                        height={cellSize}
                        fill={getColor(dataPoint.value)}
                        stroke={theme.palette.divider}
                        strokeWidth={1}
                        style={{ cursor: onCellClick ? 'pointer' : 'default' }}
                        onMouseEnter={(e) => handleCellMouseEnter(dataPoint, e as any)}
                        onMouseLeave={handleCellMouseLeave}
                        onClick={() => handleCellClick(dataPoint)}
                      />
                      {showValues && (
                        <text
                          x={x + cellSize / 2}
                          y={y + cellSize / 2}
                          textAnchor="middle"
                          dominantBaseline="middle"
                          fill={theme.palette.getContrastText(getColor(dataPoint.value))}
                          fontSize={Math.min(12, cellSize / 3)}
                        >
                          {valueFormat(dataPoint.value)}
                        </text>
                      )}
                    </g>
                  );
                })
              )}
            </svg>

            {/* X-axis labels */}
            <Box
              sx={{
                display: 'flex',
                justifyContent: 'space-around',
                width: totalWidth,
                marginTop: 1,
              }}
            >
              {uniqueX.map((label, index) => (
                <Typography
                  key={index}
                  variant="body2"
                  sx={{
                    width: cellSize,
                    textAlign: 'center',
                    marginLeft: index > 0 ? `${cellSpacing}px` : 0,
                  }}
                >
                  {label}
                </Typography>
              ))}
            </Box>
          </Box>
        </Box>

        {/* Color scale legend */}
        <Box
          sx={{
            display: 'flex',
            alignItems: 'center',
            marginTop: 3,
            gap: 1,
          }}
        >
          <Typography variant="body2">{valueFormat(min)}</Typography>
          <Box sx={{ display: 'flex', height: 20 }}>
            {colors.map((color, index) => (
              <Box
                key={index}
                sx={{
                  width: 20,
                  height: 20,
                  backgroundColor: color,
                  border: `1px solid ${theme.palette.divider}`,
                }}
              />
            ))}
          </Box>
          <Typography variant="body2">{valueFormat(max)}</Typography>
        </Box>

        {renderTooltip()}
      </Box>
    );
  };

  return (
    <BaseChart
      data={data}
      config={{
        ...config,
        title: config.title || 'Heat Map',
      }}
      {...baseProps}
    >
      {renderHeatMap()}
    </BaseChart>
  );
};

export default HeatMap;