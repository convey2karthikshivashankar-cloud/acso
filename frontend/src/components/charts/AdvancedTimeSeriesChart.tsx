import React, { useState, useEffect, useRef, useMemo } from 'react';
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
  ReferenceArea,
  Area,
  AreaChart,
} from 'recharts';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Toolbar,
  ButtonGroup,
  Button,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
  Timeline,
  ShowChart,
  BarChart as BarChartIcon,
  Settings,
  Download,
  Fullscreen,
  FullscreenExit,
} from '@mui/icons-material';

// Data point interface
export interface TimeSeriesDataPoint {
  timestamp: number;
  date: string;
  value: number;
  [key: string]: any;
}

// Chart configuration
export interface TimeSeriesConfig {
  title: string;
  yAxisLabel: string;
  color: string;
  strokeWidth: number;
  showDots: boolean;
  showArea: boolean;
  areaOpacity: number;
  smoothCurve: boolean;
}

// Props interface
export interface AdvancedTimeSeriesChartProps {
  data: TimeSeriesDataPoint[];
  configs: TimeSeriesConfig[];
  height?: number;
  enableZoom?: boolean;
  enablePan?: boolean;
  enableBrush?: boolean;
  enableExport?: boolean;
  enableFullscreen?: boolean;
  realTime?: boolean;
  updateInterval?: number;
  onDataPointClick?: (point: TimeSeriesDataPoint) => void;
  onZoomChange?: (domain: [number, number]) => void;
}

export const AdvancedTimeSeriesChart: React.FC<AdvancedTimeSeriesChartProps> = ({
  data,
  configs,
  height = 400,
  enableZoom = true,
  enablePan = true,
  enableBrush = true,
  enableExport = true,
  enableFullscreen = true,
  realTime = false,
  updateInterval = 1000,
  onDataPointClick,
  onZoomChange,
}) => {
  const [zoomDomain, setZoomDomain] = useState<[number, number] | null>(null);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [chartType, setChartType] = useState<'line' | 'area' | 'bar'>('line');
  const [selectedSeries, setSelectedSeries] = useState<string[]>(
    configs.map((_, index) => `series_${index}`)
  );
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [brushDomain, setBrushDomain] = useState<[number, number] | null>(null);
  const [isSelecting, setIsSelecting] = useState(false);
  const [selectionArea, setSelectionArea] = useState<{
    x1: number;
    x2: number;
    y1: number;
    y2: number;
  } | null>(null);

  const chartRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Process data for visualization
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    return data.map(point => ({
      ...point,
      timestamp: new Date(point.timestamp).getTime(),
      formattedDate: new Date(point.timestamp).toLocaleString(),
    }));
  }, [data]);

  // Filter data based on zoom domain
  const filteredData = useMemo(() => {
    if (!zoomDomain) return processedData;
    
    return processedData.filter(
      point => point.timestamp >= zoomDomain[0] && point.timestamp <= zoomDomain[1]
    );
  }, [processedData, zoomDomain]);

  // Handle zoom
  const handleZoom = (factor: number) => {
    if (!processedData.length) return;

    const currentDomain = zoomDomain || [
      processedData[0].timestamp,
      processedData[processedData.length - 1].timestamp,
    ];

    const center = (currentDomain[0] + currentDomain[1]) / 2;
    const range = (currentDomain[1] - currentDomain[0]) / factor;

    const newDomain: [number, number] = [
      Math.max(processedData[0].timestamp, center - range / 2),
      Math.min(processedData[processedData.length - 1].timestamp, center + range / 2),
    ];

    setZoomDomain(newDomain);
    onZoomChange?.(newDomain);
  };

  // Reset zoom
  const resetZoom = () => {
    setZoomDomain(null);
    setBrushDomain(null);
    onZoomChange?.(null as any);
  };

  // Handle brush change
  const handleBrushChange = (brushData: any) => {
    if (brushData && brushData.startIndex !== undefined && brushData.endIndex !== undefined) {
      const startTime = processedData[brushData.startIndex]?.timestamp;
      const endTime = processedData[brushData.endIndex]?.timestamp;
      
      if (startTime && endTime) {
        const newDomain: [number, number] = [startTime, endTime];
        setBrushDomain(newDomain);
        setZoomDomain(newDomain);
        onZoomChange?.(newDomain);
      }
    }
  };

  // Handle mouse events for selection
  const handleMouseDown = (e: any) => {
    if (!enableZoom || !e) return;
    
    setIsSelecting(true);
    setSelectionArea({
      x1: e.activeLabel,
      x2: e.activeLabel,
      y1: e.activePayload?.[0]?.value || 0,
      y2: e.activePayload?.[0]?.value || 0,
    });
  };

  const handleMouseMove = (e: any) => {
    if (!isSelecting || !selectionArea || !e) return;

    setSelectionArea(prev => prev ? {
      ...prev,
      x2: e.activeLabel,
      y2: e.activePayload?.[0]?.value || prev.y2,
    } : null);
  };

  const handleMouseUp = () => {
    if (!isSelecting || !selectionArea) return;

    // Apply zoom based on selection
    if (Math.abs(selectionArea.x2 - selectionArea.x1) > 0) {
      const newDomain: [number, number] = [
        Math.min(selectionArea.x1, selectionArea.x2),
        Math.max(selectionArea.x1, selectionArea.x2),
      ];
      setZoomDomain(newDomain);
      onZoomChange?.(newDomain);
    }

    setIsSelecting(false);
    setSelectionArea(null);
  };

  // Export functionality
  const handleExport = (format: 'png' | 'svg' | 'csv') => {
    if (format === 'csv') {
      const csvContent = [
        ['Timestamp', 'Date', ...configs.map(config => config.title)].join(','),
        ...filteredData.map(point => [
          point.timestamp,
          point.date,
          ...configs.map((_, index) => point[`series_${index}`] || point.value),
        ].join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'chart-data.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else {
      // For PNG/SVG export, we'd need to use a library like html2canvas
      console.log(`Export as ${format} - implementation needed`);
    }
  };

  // Toggle fullscreen
  const toggleFullscreen = () => {
    if (!isFullscreen && containerRef.current) {
      containerRef.current.requestFullscreen?.();
    } else if (document.fullscreenElement) {
      document.exitFullscreen?.();
    }
    setIsFullscreen(!isFullscreen);
  };

  // Custom tooltip
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    return (
      <Paper sx={{ p: 2, maxWidth: 300 }}>
        <Typography variant="subtitle2" gutterBottom>
          {new Date(label).toLocaleString()}
        </Typography>
        {payload.map((entry: any, index: number) => (
          <Box key={index} display="flex" alignItems="center" gap={1}>
            <Box
              width={12}
              height={12}
              bgcolor={entry.color}
              borderRadius="50%"
            />
            <Typography variant="body2">
              {entry.name}: {entry.value?.toLocaleString()}
            </Typography>
          </Box>
        ))}
      </Paper>
    );
  };

  // Render chart based on type
  const renderChart = () => {
    const commonProps = {
      data: filteredData,
      onMouseDown: handleMouseDown,
      onMouseMove: handleMouseMove,
      onMouseUp: handleMouseUp,
      onClick: onDataPointClick,
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={zoomDomain || ['dataMin', 'dataMax']}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {configs.map((config, index) => (
              <Area
                key={index}
                type={config.smoothCurve ? 'monotone' : 'linear'}
                dataKey={`series_${index}`}
                stroke={config.color}
                fill={config.color}
                fillOpacity={config.areaOpacity}
                strokeWidth={config.strokeWidth}
                dot={config.showDots}
              />
            ))}
            {selectionArea && (
              <ReferenceArea
                x1={selectionArea.x1}
                x2={selectionArea.x2}
                strokeOpacity={0.3}
                fillOpacity={0.1}
              />
            )}
          </AreaChart>
        );

      case 'line':
      default:
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" />
            <XAxis
              dataKey="timestamp"
              type="number"
              scale="time"
              domain={zoomDomain || ['dataMin', 'dataMax']}
              tickFormatter={(value) => new Date(value).toLocaleDateString()}
            />
            <YAxis />
            <Tooltip content={<CustomTooltip />} />
            <Legend />
            {configs.map((config, index) => (
              <Line
                key={index}
                type={config.smoothCurve ? 'monotone' : 'linear'}
                dataKey={`series_${index}`}
                stroke={config.color}
                strokeWidth={config.strokeWidth}
                dot={config.showDots}
                connectNulls={false}
              />
            ))}
            {selectionArea && (
              <ReferenceArea
                x1={selectionArea.x1}
                x2={selectionArea.x2}
                strokeOpacity={0.3}
                fillOpacity={0.1}
              />
            )}
          </LineChart>
        );
    }
  };

  return (
    <Box ref={containerRef} sx={{ width: '100%', height: isFullscreen ? '100vh' : 'auto' }}>
      <Paper sx={{ p: 2 }}>
        {/* Toolbar */}
        <Toolbar sx={{ px: 0, minHeight: '48px !important' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Advanced Time Series Chart
          </Typography>

          {/* Chart Type Selector */}
          <ButtonGroup size="small" sx={{ mr: 2 }}>
            <Button
              variant={chartType === 'line' ? 'contained' : 'outlined'}
              onClick={() => setChartType('line')}
              startIcon={<ShowChart />}
            >
              Line
            </Button>
            <Button
              variant={chartType === 'area' ? 'contained' : 'outlined'}
              onClick={() => setChartType('area')}
              startIcon={<Timeline />}
            >
              Area
            </Button>
          </ButtonGroup>

          {/* Zoom Controls */}
          {enableZoom && (
            <ButtonGroup size="small" sx={{ mr: 2 }}>
              <IconButton onClick={() => handleZoom(2)} title="Zoom In">
                <ZoomIn />
              </IconButton>
              <IconButton onClick={() => handleZoom(0.5)} title="Zoom Out">
                <ZoomOut />
              </IconButton>
              <IconButton onClick={resetZoom} title="Reset Zoom">
                <ZoomOutMap />
              </IconButton>
            </ButtonGroup>
          )}

          {/* Export Controls */}
          {enableExport && (
            <ButtonGroup size="small" sx={{ mr: 2 }}>
              <Button
                startIcon={<Download />}
                onClick={() => handleExport('csv')}
              >
                CSV
              </Button>
            </ButtonGroup>
          )}

          {/* Settings */}
          <IconButton onClick={() => setSettingsOpen(true)}>
            <Settings />
          </IconButton>

          {/* Fullscreen */}
          {enableFullscreen && (
            <IconButton onClick={toggleFullscreen}>
              {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
            </IconButton>
          )}
        </Toolbar>

        {/* Series Selection */}
        <Box sx={{ mb: 2, display: 'flex', flexWrap: 'wrap', gap: 1 }}>
          {configs.map((config, index) => (
            <Chip
              key={index}
              label={config.title}
              color={selectedSeries.includes(`series_${index}`) ? 'primary' : 'default'}
              onClick={() => {
                const seriesId = `series_${index}`;
                setSelectedSeries(prev =>
                  prev.includes(seriesId)
                    ? prev.filter(id => id !== seriesId)
                    : [...prev, seriesId]
                );
              }}
              sx={{ bgcolor: config.color, color: 'white' }}
            />
          ))}
        </Box>

        {/* Chart Container */}
        <Box ref={chartRef} sx={{ width: '100%', height: isFullscreen ? 'calc(100vh - 200px)' : height }}>
          <ResponsiveContainer width="100%" height="100%">
            {renderChart()}
          </ResponsiveContainer>
        </Box>

        {/* Brush for navigation */}
        {enableBrush && processedData.length > 0 && (
          <Box sx={{ mt: 2, height: 60 }}>
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={processedData}>
                <Line
                  type="monotone"
                  dataKey="value"
                  stroke="#8884d8"
                  strokeWidth={1}
                  dot={false}
                />
                <Brush
                  dataKey="timestamp"
                  height={30}
                  stroke="#8884d8"
                  onChange={handleBrushChange}
                  tickFormatter={(value) => new Date(value).toLocaleDateString()}
                />
              </LineChart>
            </ResponsiveContainer>
          </Box>
        )}

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="md" fullWidth>
          <DialogTitle>Chart Settings</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 3, mt: 2 }}>
              {configs.map((config, index) => (
                <Box key={index} sx={{ p: 2, border: 1, borderColor: 'divider', borderRadius: 1 }}>
                  <Typography variant="subtitle1" gutterBottom>
                    Series {index + 1}: {config.title}
                  </Typography>
                  
                  <Box sx={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 2, mt: 2 }}>
                    <FormControl size="small">
                      <InputLabel>Stroke Width</InputLabel>
                      <Select value={config.strokeWidth} label="Stroke Width">
                        <MenuItem value={1}>1px</MenuItem>
                        <MenuItem value={2}>2px</MenuItem>
                        <MenuItem value={3}>3px</MenuItem>
                        <MenuItem value={4}>4px</MenuItem>
                      </Select>
                    </FormControl>

                    <Box>
                      <Typography gutterBottom>Area Opacity</Typography>
                      <Slider
                        value={config.areaOpacity}
                        min={0}
                        max={1}
                        step={0.1}
                        valueLabelDisplay="auto"
                      />
                    </Box>
                  </Box>
                </Box>
              ))}
            </Box>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setSettingsOpen(false)}>Close</Button>
          </DialogActions>
        </Dialog>
      </Paper>
    </Box>
  );
};

export default AdvancedTimeSeriesChart;