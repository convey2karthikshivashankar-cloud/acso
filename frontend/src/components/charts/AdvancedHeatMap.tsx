import React, { useState, useEffect, useMemo, useRef } from 'react';
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
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Card,
  CardContent,
  Tooltip,
  Switch,
  FormControlLabel,
  Chip,
} from '@mui/material';
import {
  Settings,
  Fullscreen,
  FullscreenExit,
  Download,
  Refresh,
  ZoomIn,
  ZoomOut,
  ZoomOutMap,
  Palette,
  GridOn,
  GridOff,
} from '@mui/icons-material';

// Heat map data point
export interface HeatMapDataPoint {
  x: number;
  y: number;
  value: number;
  label?: string;
  metadata?: Record<string, any>;
}

// Color scheme types
export type ColorScheme = 'viridis' | 'plasma' | 'inferno' | 'magma' | 'cool' | 'warm' | 'rainbow' | 'threat';

// Aggregation functions
export type AggregationFunction = 'sum' | 'avg' | 'max' | 'min' | 'count';

// Props interface
export interface AdvancedHeatMapProps {
  data: HeatMapDataPoint[];
  width?: number;
  height?: number;
  cellSize?: number;
  colorScheme?: ColorScheme;
  showGrid?: boolean;
  showLabels?: boolean;
  showTooltips?: boolean;
  aggregationFunction?: AggregationFunction;
  minValue?: number;
  maxValue?: number;
  enableZoom?: boolean;
  enableExport?: boolean;
  realTime?: boolean;
  updateInterval?: number;
  onCellClick?: (point: HeatMapDataPoint) => void;
  onCellHover?: (point: HeatMapDataPoint | null) => void;
}

export const AdvancedHeatMap: React.FC<AdvancedHeatMapProps> = ({
  data,
  width = 800,
  height = 600,
  cellSize = 20,
  colorScheme = 'viridis',
  showGrid = true,
  showLabels = false,
  showTooltips = true,
  aggregationFunction = 'sum',
  minValue,
  maxValue,
  enableZoom = true,
  enableExport = true,
  realTime = false,
  updateInterval = 1000,
  onCellClick,
  onCellHover,
}) => {
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [currentColorScheme, setCurrentColorScheme] = useState<ColorScheme>(colorScheme);
  const [currentCellSize, setCurrentCellSize] = useState(cellSize);
  const [showCurrentGrid, setShowCurrentGrid] = useState(showGrid);
  const [showCurrentLabels, setShowCurrentLabels] = useState(showLabels);
  const [hoveredCell, setHoveredCell] = useState<HeatMapDataPoint | null>(null);
  const [selectedCells, setSelectedCells] = useState<HeatMapDataPoint[]>([]);
  const [opacity, setOpacity] = useState(0.8);
  const [threshold, setThreshold] = useState(0);

  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Color schemes
  const colorSchemes: Record<ColorScheme, (value: number) => string> = {
    viridis: (value: number) => {
      const colors = ['#440154', '#482777', '#3f4a8a', '#31678e', '#26838f', '#1f9d8a', '#6cce5a', '#b6de2b', '#fee825'];
      const index = Math.floor(value * (colors.length - 1));
      return colors[Math.min(index, colors.length - 1)];
    },
    plasma: (value: number) => {
      const colors = ['#0c0786', '#40039c', '#6a00a7', '#8f0da4', '#b12a90', '#cc4778', '#e16462', '#f2844b', '#fca636', '#fcce25'];
      const index = Math.floor(value * (colors.length - 1));
      return colors[Math.min(index, colors.length - 1)];
    },
    inferno: (value: number) => {
      const colors = ['#000003', '#1b0c41', '#4a0c6b', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#f7d03c', '#fcffa4'];
      const index = Math.floor(value * (colors.length - 1));
      return colors[Math.min(index, colors.length - 1)];
    },
    magma: (value: number) => {
      const colors = ['#000003', '#0f0e3c', '#2f1b69', '#56147d', '#781c6d', '#a52c60', '#cf4446', '#ed6925', '#fb9b06', '#fcffa4'];
      const index = Math.floor(value * (colors.length - 1));
      return colors[Math.min(index, colors.length - 1)];
    },
    cool: (value: number) => {
      const r = Math.floor(value * 255);
      const g = Math.floor((1 - value) * 255);
      return `rgb(${r}, ${g}, 255)`;
    },
    warm: (value: number) => {
      const r = 255;
      const g = Math.floor(value * 255);
      const b = Math.floor((1 - value) * 255);
      return `rgb(${r}, ${g}, ${b})`;
    },
    rainbow: (value: number) => {
      const hue = value * 360;
      return `hsl(${hue}, 100%, 50%)`;
    },
    threat: (value: number) => {
      if (value < 0.3) return '#4CAF50'; // Green - Low threat
      if (value < 0.6) return '#FF9800'; // Orange - Medium threat
      if (value < 0.8) return '#FF5722'; // Red-Orange - High threat
      return '#F44336'; // Red - Critical threat
    },
  };

  // Process and aggregate data
  const processedData = useMemo(() => {
    if (!data || data.length === 0) return [];

    // Group data by x,y coordinates
    const grouped = new Map<string, HeatMapDataPoint[]>();
    
    data.forEach(point => {
      const key = `${point.x},${point.y}`;
      if (!grouped.has(key)) {
        grouped.set(key, []);
      }
      grouped.get(key)!.push(point);
    });

    // Aggregate values for each cell
    const aggregated: HeatMapDataPoint[] = [];
    
    grouped.forEach((points, key) => {
      const [x, y] = key.split(',').map(Number);
      let aggregatedValue: number;

      switch (aggregationFunction) {
        case 'sum':
          aggregatedValue = points.reduce((sum, p) => sum + p.value, 0);
          break;
        case 'avg':
          aggregatedValue = points.reduce((sum, p) => sum + p.value, 0) / points.length;
          break;
        case 'max':
          aggregatedValue = Math.max(...points.map(p => p.value));
          break;
        case 'min':
          aggregatedValue = Math.min(...points.map(p => p.value));
          break;
        case 'count':
          aggregatedValue = points.length;
          break;
        default:
          aggregatedValue = points[0].value;
      }

      aggregated.push({
        x,
        y,
        value: aggregatedValue,
        label: points[0].label,
        metadata: points[0].metadata,
      });
    });

    return aggregated;
  }, [data, aggregationFunction]);

  // Calculate value range
  const valueRange = useMemo(() => {
    if (processedData.length === 0) return { min: 0, max: 1 };
    
    const values = processedData.map(d => d.value);
    return {
      min: minValue !== undefined ? minValue : Math.min(...values),
      max: maxValue !== undefined ? maxValue : Math.max(...values),
    };
  }, [processedData, minValue, maxValue]);

  // Normalize value to 0-1 range
  const normalizeValue = (value: number): number => {
    if (valueRange.max === valueRange.min) return 0;
    return Math.max(0, Math.min(1, (value - valueRange.min) / (valueRange.max - valueRange.min)));
  };

  // Get grid dimensions
  const gridDimensions = useMemo(() => {
    if (processedData.length === 0) return { rows: 0, cols: 0, maxX: 0, maxY: 0, minX: 0, minY: 0 };
    
    const xValues = processedData.map(d => d.x);
    const yValues = processedData.map(d => d.y);
    
    const minX = Math.min(...xValues);
    const maxX = Math.max(...xValues);
    const minY = Math.min(...yValues);
    const maxY = Math.max(...yValues);
    
    return {
      minX,
      maxX,
      minY,
      maxY,
      cols: maxX - minX + 1,
      rows: maxY - minY + 1,
    };
  }, [processedData]);

  // Handle zoom
  const handleZoom = (factor: number) => {
    setZoom(prev => Math.max(0.1, Math.min(5, prev * factor)));
  };

  // Reset view
  const resetView = () => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  };

  // Handle cell click
  const handleCellClick = (point: HeatMapDataPoint) => {
    setSelectedCells(prev => {
      const exists = prev.find(p => p.x === point.x && p.y === point.y);
      if (exists) {
        return prev.filter(p => !(p.x === point.x && p.y === point.y));
      } else {
        return [...prev, point];
      }
    });
    onCellClick?.(point);
  };

  // Handle cell hover
  const handleCellHover = (point: HeatMapDataPoint | null) => {
    setHoveredCell(point);
    onCellHover?.(point);
  };

  // Export functionality
  const handleExport = (format: 'png' | 'csv') => {
    if (format === 'csv') {
      const csvContent = [
        ['X', 'Y', 'Value', 'Label'].join(','),
        ...processedData.map(point => [
          point.x,
          point.y,
          point.value,
          point.label || '',
        ].join(',')),
      ].join('\n');

      const blob = new Blob([csvContent], { type: 'text/csv' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'heatmap-data.csv';
      a.click();
      URL.revokeObjectURL(url);
    } else if (format === 'png' && canvasRef.current) {
      const link = document.createElement('a');
      link.download = 'heatmap.png';
      link.href = canvasRef.current.toDataURL();
      link.click();
    }
  };

  // Render heat map on canvas
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    canvas.width = width * zoom;
    canvas.height = height * zoom;
    ctx.scale(zoom, zoom);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw cells
    processedData.forEach(point => {
      if (point.value < threshold) return;

      const normalizedValue = normalizeValue(point.value);
      const color = colorSchemes[currentColorScheme](normalizedValue);
      
      const x = (point.x - gridDimensions.minX) * currentCellSize;
      const y = (point.y - gridDimensions.minY) * currentCellSize;

      // Check if cell is selected
      const isSelected = selectedCells.some(p => p.x === point.x && p.y === point.y);
      const isHovered = hoveredCell?.x === point.x && hoveredCell?.y === point.y;

      // Draw cell
      ctx.globalAlpha = opacity;
      ctx.fillStyle = color;
      ctx.fillRect(x, y, currentCellSize, currentCellSize);

      // Draw selection/hover border
      if (isSelected || isHovered) {
        ctx.globalAlpha = 1;
        ctx.strokeStyle = isSelected ? '#FFD700' : '#FFF';
        ctx.lineWidth = 2;
        ctx.strokeRect(x, y, currentCellSize, currentCellSize);
      }

      // Draw grid
      if (showCurrentGrid) {
        ctx.globalAlpha = 0.3;
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.strokeRect(x, y, currentCellSize, currentCellSize);
      }

      // Draw labels
      if (showCurrentLabels && (point.label || point.value)) {
        ctx.globalAlpha = 1;
        ctx.fillStyle = '#000';
        ctx.font = '10px Arial';
        ctx.textAlign = 'center';
        ctx.fillText(
          point.label || point.value.toFixed(1),
          x + currentCellSize / 2,
          y + currentCellSize / 2 + 3
        );
      }
    });

    ctx.globalAlpha = 1;
  }, [
    processedData,
    currentColorScheme,
    currentCellSize,
    showCurrentGrid,
    showCurrentLabels,
    selectedCells,
    hoveredCell,
    opacity,
    threshold,
    zoom,
    width,
    height,
    gridDimensions,
    valueRange,
  ]);

  // Handle canvas mouse events
  const handleCanvasMouseMove = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    const cellX = Math.floor(x / currentCellSize) + gridDimensions.minX;
    const cellY = Math.floor(y / currentCellSize) + gridDimensions.minY;

    const point = processedData.find(p => p.x === cellX && p.y === cellY);
    handleCellHover(point || null);
  };

  const handleCanvasClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const rect = canvas.getBoundingClientRect();
    const x = (event.clientX - rect.left) / zoom;
    const y = (event.clientY - rect.top) / zoom;

    const cellX = Math.floor(x / currentCellSize) + gridDimensions.minX;
    const cellY = Math.floor(y / currentCellSize) + gridDimensions.minY;

    const point = processedData.find(p => p.x === cellX && p.y === cellY);
    if (point) {
      handleCellClick(point);
    }
  };

  return (
    <Box ref={containerRef} sx={{ width: '100%', height: isFullscreen ? '100vh' : 'auto' }}>
      <Paper sx={{ p: 2 }}>
        {/* Toolbar */}
        <Toolbar sx={{ px: 0, minHeight: '48px !important' }}>
          <Typography variant="h6" sx={{ flexGrow: 1 }}>
            Advanced Heat Map
          </Typography>

          {/* Color Scheme Selector */}
          <FormControl size="small" sx={{ mr: 2, minWidth: 120 }}>
            <InputLabel>Color Scheme</InputLabel>
            <Select
              value={currentColorScheme}
              label="Color Scheme"
              onChange={(e) => setCurrentColorScheme(e.target.value as ColorScheme)}
            >
              <MenuItem value="viridis">Viridis</MenuItem>
              <MenuItem value="plasma">Plasma</MenuItem>
              <MenuItem value="inferno">Inferno</MenuItem>
              <MenuItem value="magma">Magma</MenuItem>
              <MenuItem value="cool">Cool</MenuItem>
              <MenuItem value="warm">Warm</MenuItem>
              <MenuItem value="rainbow">Rainbow</MenuItem>
              <MenuItem value="threat">Threat</MenuItem>
            </Select>
          </FormControl>

          {/* Zoom Controls */}
          {enableZoom && (
            <ButtonGroup size="small" sx={{ mr: 2 }}>
              <IconButton onClick={() => handleZoom(1.2)} title="Zoom In">
                <ZoomIn />
              </IconButton>
              <IconButton onClick={() => handleZoom(0.8)} title="Zoom Out">
                <ZoomOut />
              </IconButton>
              <IconButton onClick={resetView} title="Reset View">
                <ZoomOutMap />
              </IconButton>
            </ButtonGroup>
          )}

          {/* Grid Toggle */}
          <IconButton
            onClick={() => setShowCurrentGrid(!showCurrentGrid)}
            color={showCurrentGrid ? 'primary' : 'default'}
          >
            {showCurrentGrid ? <GridOn /> : <GridOff />}
          </IconButton>

          {/* Export */}
          {enableExport && (
            <ButtonGroup size="small" sx={{ mr: 2 }}>
              <Button
                startIcon={<Download />}
                onClick={() => handleExport('csv')}
              >
                CSV
              </Button>
              <Button
                startIcon={<Download />}
                onClick={() => handleExport('png')}
              >
                PNG
              </Button>
            </ButtonGroup>
          )}

          {/* Settings */}
          <IconButton onClick={() => setSettingsOpen(true)}>
            <Settings />
          </IconButton>

          {/* Fullscreen */}
          <IconButton onClick={() => setIsFullscreen(!isFullscreen)}>
            {isFullscreen ? <FullscreenExit /> : <Fullscreen />}
          </IconButton>
        </Toolbar>

        {/* Statistics */}
        <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
          <Chip label={`Cells: ${processedData.length}`} size="small" />
          <Chip label={`Range: ${valueRange.min.toFixed(2)} - ${valueRange.max.toFixed(2)}`} size="small" />
          <Chip label={`Selected: ${selectedCells.length}`} size="small" />
          {hoveredCell && (
            <Chip
              label={`Hovered: (${hoveredCell.x}, ${hoveredCell.y}) = ${hoveredCell.value.toFixed(2)}`}
              size="small"
              color="primary"
            />
          )}
        </Box>

        {/* Canvas Container */}
        <Box sx={{ 
          border: 1, 
          borderColor: 'divider', 
          borderRadius: 1, 
          overflow: 'auto',
          maxHeight: isFullscreen ? 'calc(100vh - 300px)' : '600px',
        }}>
          <canvas
            ref={canvasRef}
            style={{ cursor: 'crosshair', display: 'block' }}
            onMouseMove={handleCanvasMouseMove}
            onClick={handleCanvasClick}
            onMouseLeave={() => handleCellHover(null)}
          />
        </Box>

        {/* Color Legend */}
        <Box sx={{ mt: 2, display: 'flex', alignItems: 'center', gap: 2 }}>
          <Typography variant="body2">Value Range:</Typography>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography variant="caption">{valueRange.min.toFixed(2)}</Typography>
            <Box sx={{ width: 200, height: 20, display: 'flex' }}>
              {Array.from({ length: 20 }, (_, i) => (
                <Box
                  key={i}
                  sx={{
                    width: 10,
                    height: 20,
                    backgroundColor: colorSchemes[currentColorScheme](i / 19),
                  }}
                />
              ))}
            </Box>
            <Typography variant="caption">{valueRange.max.toFixed(2)}</Typography>
          </Box>
        </Box>

        {/* Tooltip */}
        {showTooltips && hoveredCell && (
          <Card sx={{ position: 'absolute', zIndex: 1000, pointerEvents: 'none' }}>
            <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
              <Typography variant="body2">
                Position: ({hoveredCell.x}, {hoveredCell.y})
              </Typography>
              <Typography variant="body2">
                Value: {hoveredCell.value.toFixed(3)}
              </Typography>
              {hoveredCell.label && (
                <Typography variant="body2">
                  Label: {hoveredCell.label}
                </Typography>
              )}
              {hoveredCell.metadata && (
                <Box>
                  {Object.entries(hoveredCell.metadata).map(([key, value]) => (
                    <Typography key={key} variant="caption" display="block">
                      {key}: {String(value)}
                    </Typography>
                  ))}
                </Box>
              )}
            </CardContent>
          </Card>
        )}

        {/* Settings Dialog */}
        <Dialog open={settingsOpen} onClose={() => setSettingsOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle>Heat Map Settings</DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'grid', gap: 3, mt: 2 }}>
              <Box>
                <Typography gutterBottom>Cell Size</Typography>
                <Slider
                  value={currentCellSize}
                  onChange={(_, value) => setCurrentCellSize(value as number)}
                  min={5}
                  max={50}
                  step={1}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box>
                <Typography gutterBottom>Opacity</Typography>
                <Slider
                  value={opacity}
                  onChange={(_, value) => setOpacity(value as number)}
                  min={0.1}
                  max={1}
                  step={0.1}
                  valueLabelDisplay="auto"
                />
              </Box>

              <Box>
                <Typography gutterBottom>Threshold</Typography>
                <Slider
                  value={threshold}
                  onChange={(_, value) => setThreshold(value as number)}
                  min={valueRange.min}
                  max={valueRange.max}
                  step={(valueRange.max - valueRange.min) / 100}
                  valueLabelDisplay="auto"
                />
              </Box>

              <FormControlLabel
                control={
                  <Switch
                    checked={showCurrentLabels}
                    onChange={(e) => setShowCurrentLabels(e.target.checked)}
                  />
                }
                label="Show Labels"
              />
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

export default AdvancedHeatMap;