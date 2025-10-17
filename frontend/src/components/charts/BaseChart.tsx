import React from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Menu,
  MenuItem,
  Tooltip,
  CircularProgress,
  Alert,
  useTheme,
} from '@mui/material';
import {
  MoreVert,
  Download,
  Fullscreen,
  Refresh,
  Settings,
  ZoomIn,
  ZoomOut,
} from '@mui/icons-material';

export interface ChartDataPoint {
  timestamp: Date | string | number;
  value: number;
  category?: string;
  label?: string;
  metadata?: Record<string, any>;
}

export interface ChartConfig {
  title?: string;
  subtitle?: string;
  showLegend?: boolean;
  showTooltip?: boolean;
  showGrid?: boolean;
  showAxes?: boolean;
  interactive?: boolean;
  exportable?: boolean;
  refreshable?: boolean;
  zoomable?: boolean;
  colors?: string[];
  theme?: 'light' | 'dark';
  animation?: boolean;
  animationDuration?: number;
}

export interface BaseChartProps {
  data: ChartDataPoint[];
  config?: ChartConfig;
  loading?: boolean;
  error?: string | null;
  height?: number;
  width?: number;
  onDataPointClick?: (dataPoint: ChartDataPoint, index: number) => void;
  onExport?: (format: 'png' | 'svg' | 'pdf' | 'csv') => void;
  onRefresh?: () => void;
  onZoom?: (zoomLevel: number) => void;
  className?: string;
}

export const BaseChart: React.FC<BaseChartProps & { children: React.ReactNode }> = ({
  data,
  config = {},
  loading = false,
  error = null,
  height = 400,
  width,
  onDataPointClick,
  onExport,
  onRefresh,
  onZoom,
  className,
  children,
}) => {
  const theme = useTheme();
  const [menuAnchor, setMenuAnchor] = React.useState<HTMLElement | null>(null);
  const [zoomLevel, setZoomLevel] = React.useState(1);

  const {
    title,
    subtitle,
    exportable = true,
    refreshable = true,
    zoomable = false,
  } = config;

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMenuAnchor(event.currentTarget);
  };

  const handleMenuClose = () => {
    setMenuAnchor(null);
  };

  const handleExport = (format: 'png' | 'svg' | 'pdf' | 'csv') => {
    onExport?.(format);
    handleMenuClose();
  };

  const handleZoomIn = () => {
    const newZoom = Math.min(zoomLevel * 1.2, 3);
    setZoomLevel(newZoom);
    onZoom?.(newZoom);
  };

  const handleZoomOut = () => {
    const newZoom = Math.max(zoomLevel / 1.2, 0.5);
    setZoomLevel(newZoom);
    onZoom?.(newZoom);
  };

  const handleReset = () => {
    setZoomLevel(1);
    onZoom?.(1);
  };

  if (error) {
    return (
      <Paper sx={{ p: 2, height, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
        <Alert severity="error" sx={{ width: '100%' }}>
          <Typography variant="h6" gutterBottom>
            Chart Error
          </Typography>
          <Typography variant="body2">{error}</Typography>
        </Alert>
      </Paper>
    );
  }

  return (
    <Paper
      className={className}
      sx={{
        height,
        width,
        display: 'flex',
        flexDirection: 'column',
        position: 'relative',
        overflow: 'hidden',
      }}
    >
      {/* Chart Header */}
      {(title || subtitle) && (
        <Box sx={{ p: 2, pb: 1 }}>
          {title && (
            <Typography variant="h6" component="h3" gutterBottom>
              {title}
            </Typography>
          )}
          {subtitle && (
            <Typography variant="body2" color="text.secondary">
              {subtitle}
            </Typography>
          )}
        </Box>
      )}

      {/* Chart Controls */}
      <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
        <Box sx={{ display: 'flex', gap: 0.5 }}>
          {zoomable && (
            <>
              <Tooltip title="Zoom In">
                <IconButton size="small" onClick={handleZoomIn}>
                  <ZoomIn />
                </IconButton>
              </Tooltip>
              <Tooltip title="Zoom Out">
                <IconButton size="small" onClick={handleZoomOut}>
                  <ZoomOut />
                </IconButton>
              </Tooltip>
            </>
          )}

          {refreshable && (
            <Tooltip title="Refresh">
              <IconButton size="small" onClick={onRefresh}>
                <Refresh />
              </IconButton>
            </Tooltip>
          )}

          <Tooltip title="Chart Options">
            <IconButton size="small" onClick={handleMenuOpen}>
              <MoreVert />
            </IconButton>
          </Tooltip>
        </Box>

        <Menu
          anchorEl={menuAnchor}
          open={Boolean(menuAnchor)}
          onClose={handleMenuClose}
        >
          {exportable && [
            <MenuItem key="export-png" onClick={() => handleExport('png')}>
              <Download sx={{ mr: 1 }} />
              Export as PNG
            </MenuItem>,
            <MenuItem key="export-svg" onClick={() => handleExport('svg')}>
              <Download sx={{ mr: 1 }} />
              Export as SVG
            </MenuItem>,
            <MenuItem key="export-pdf" onClick={() => handleExport('pdf')}>
              <Download sx={{ mr: 1 }} />
              Export as PDF
            </MenuItem>,
            <MenuItem key="export-csv" onClick={() => handleExport('csv')}>
              <Download sx={{ mr: 1 }} />
              Export Data (CSV)
            </MenuItem>,
          ]}

          {zoomable && (
            <MenuItem onClick={handleReset}>
              <Settings sx={{ mr: 1 }} />
              Reset Zoom
            </MenuItem>
          )}

          <MenuItem onClick={handleMenuClose}>
            <Fullscreen sx={{ mr: 1 }} />
            Fullscreen
          </MenuItem>
        </Menu>
      </Box>

      {/* Chart Content */}
      <Box
        sx={{
          flex: 1,
          position: 'relative',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          p: 1,
        }}
      >
        {loading ? (
          <CircularProgress />
        ) : data.length === 0 ? (
          <Alert severity="info">
            <Typography variant="body2">No data available</Typography>
          </Alert>
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              transform: `scale(${zoomLevel})`,
              transformOrigin: 'center center',
              transition: 'transform 0.2s ease-in-out',
            }}
          >
            {children}
          </Box>
        )}
      </Box>
    </Paper>
  );
};

export default BaseChart;