import React, { useState, useCallback, useMemo } from 'react';
import {
  Box,
  Paper,
  Typography,
  IconButton,
  Toolbar,
  Breadcrumbs,
  Link,
  Button,
  Card,
  CardContent,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Chip,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
} from '@mui/material';
import {
  ArrowBack,
  KeyboardArrowRight,
  TrendingUp,
  TrendingDown,
  Remove,
  Info,
  TableChart,
  BarChart as BarChartIcon,
  PieChart as PieChartIcon,
  ShowChart,
} from '@mui/icons-material';
import {
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
  TreeMap,
} from 'recharts';

// Drill-down level interface
export interface DrillDownLevel {
  id: string;
  name: string;
  data: DrillDownDataPoint[];
  parentId?: string;
  metadata?: Record<string, any>;
}

// Data point interface
export interface DrillDownDataPoint {
  id: string;
  name: string;
  value: number;
  children?: DrillDownDataPoint[];
  color?: string;
  trend?: 'up' | 'down' | 'stable';
  trendValue?: number;
  metadata?: Record<string, any>;
  drillable?: boolean;
}

// Chart types
export type ChartType = 'bar' | 'pie' | 'line' | 'treemap' | 'table';

// Props interface
export interface DrillDownChartProps {
  levels: DrillDownLevel[];
  initialLevelId?: string;
  chartType?: ChartType;
  height?: number;
  enableExport?: boolean;
  showTrends?: boolean;
  showMetadata?: boolean;
  onDrillDown?: (levelId: string, dataPoint: DrillDownDataPoint) => void;
  onLevelChange?: (levelId: string) => void;
}

export const DrillDownChart: React.FC<DrillDownChartProps> = ({
  levels,
  initialLevelId,
  chartType = 'bar',
  height = 400,
  enableExport = true,
  showTrends = true,
  showMetadata = false,
  onDrillDown,
  onLevelChange,
}) => {
  const [currentLevelId, setCurrentLevelId] = useState(initialLevelId || levels[0]?.id);
  const [navigationHistory, setNavigationHistory] = useState<string[]>([currentLevelId]);
  const [selectedDataPoint, setSelectedDataPoint] = useState<DrillDownDataPoint | null>(null);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [currentChartType, setCurrentChartType] = useState<ChartType>(chartType);

  // Get current level
  const currentLevel = useMemo(() => {
    return levels.find(level => level.id === currentLevelId);
  }, [levels, currentLevelId]);

  // Get breadcrumb path
  const breadcrumbPath = useMemo(() => {
    const path: DrillDownLevel[] = [];
    let currentId = currentLevelId;
    
    while (currentId) {
      const level = levels.find(l => l.id === currentId);
      if (level) {
        path.unshift(level);
        currentId = level.parentId || '';
      } else {
        break;
      }
    }
    
    return path;
  }, [levels, currentLevelId]);

  // Handle drill down
  const handleDrillDown = useCallback((dataPoint: DrillDownDataPoint) => {
    if (!dataPoint.drillable) return;

    // Find child level
    const childLevel = levels.find(level => level.parentId === currentLevelId);
    if (childLevel) {
      setCurrentLevelId(childLevel.id);
      setNavigationHistory(prev => [...prev, childLevel.id]);
      onDrillDown?.(childLevel.id, dataPoint);
      onLevelChange?.(childLevel.id);
    }
  }, [currentLevelId, levels, onDrillDown, onLevelChange]);

  // Handle navigation
  const navigateToLevel = useCallback((levelId: string) => {
    setCurrentLevelId(levelId);
    const levelIndex = navigationHistory.indexOf(levelId);
    if (levelIndex !== -1) {
      setNavigationHistory(prev => prev.slice(0, levelIndex + 1));
    }
    onLevelChange?.(levelId);
  }, [navigationHistory, onLevelChange]);

  // Handle back navigation
  const handleBack = useCallback(() => {
    if (navigationHistory.length > 1) {
      const newHistory = navigationHistory.slice(0, -1);
      const previousLevelId = newHistory[newHistory.length - 1];
      setCurrentLevelId(previousLevelId);
      setNavigationHistory(newHistory);
      onLevelChange?.(previousLevelId);
    }
  }, [navigationHistory, onLevelChange]);

  // Show data point details
  const showDetails = useCallback((dataPoint: DrillDownDataPoint) => {
    setSelectedDataPoint(dataPoint);
    setDetailsOpen(true);
  }, []);

  // Get trend icon
  const getTrendIcon = (trend?: string, trendValue?: number) => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="success" />;
      case 'down':
        return <TrendingDown color="error" />;
      default:
        return <Remove color="disabled" />;
    }
  };

  // Custom tooltip for charts
  const CustomTooltip = ({ active, payload, label }: any) => {
    if (!active || !payload || !payload.length) return null;

    const data = payload[0].payload;
    return (
      <Paper sx={{ p: 2, maxWidth: 300 }}>
        <Typography variant="subtitle2" gutterBottom>
          {label || data.name}
        </Typography>
        <Typography variant="body2">
          Value: {payload[0].value?.toLocaleString()}
        </Typography>
        {showTrends && data.trend && (
          <Box display="flex" alignItems="center" gap={1} mt={1}>
            {getTrendIcon(data.trend, data.trendValue)}
            <Typography variant="caption">
              {data.trendValue ? `${data.trendValue > 0 ? '+' : ''}${data.trendValue.toFixed(1)}%` : 'No change'}
            </Typography>
          </Box>
        )}
        {data.drillable && (
          <Typography variant="caption" color="primary" display="block" mt={1}>
            Click to drill down
          </Typography>
        )}
      </Paper>
    );
  };

  // Render bar chart
  const renderBarChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <BarChart data={currentLevel?.data || []}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Bar
          dataKey="value"
          fill="#8884d8"
          onClick={handleDrillDown}
          style={{ cursor: 'pointer' }}
        />
      </BarChart>
    </ResponsiveContainer>
  );

  // Render pie chart
  const renderPieChart = () => {
    const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8', '#82CA9D'];
    
    return (
      <ResponsiveContainer width="100%" height={height}>
        <PieChart>
          <Pie
            data={currentLevel?.data || []}
            cx="50%"
            cy="50%"
            labelLine={false}
            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
            outerRadius={80}
            fill="#8884d8"
            dataKey="value"
            onClick={(data) => handleDrillDown(data)}
            style={{ cursor: 'pointer' }}
          >
            {(currentLevel?.data || []).map((entry, index) => (
              <Cell key={`cell-${index}`} fill={entry.color || COLORS[index % COLORS.length]} />
            ))}
          </Pie>
          <Tooltip content={<CustomTooltip />} />
        </PieChart>
      </ResponsiveContainer>
    );
  };

  // Render line chart
  const renderLineChart = () => (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={currentLevel?.data || []}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip content={<CustomTooltip />} />
        <Legend />
        <Line
          type="monotone"
          dataKey="value"
          stroke="#8884d8"
          strokeWidth={2}
          dot={{ r: 6, cursor: 'pointer' }}
          onClick={handleDrillDown}
        />
      </LineChart>
    </ResponsiveContainer>
  );

  // Render treemap
  const renderTreeMap = () => (
    <ResponsiveContainer width="100%" height={height}>
      <TreeMap
        data={currentLevel?.data || []}
        dataKey="value"
        ratio={4/3}
        stroke="#fff"
        fill="#8884d8"
        onClick={handleDrillDown}
        style={{ cursor: 'pointer' }}
      />
    </ResponsiveContainer>
  );

  // Render table
  const renderTable = () => (
    <TableContainer component={Paper} sx={{ maxHeight: height }}>
      <Table stickyHeader>
        <TableHead>
          <TableRow>
            <TableCell>Name</TableCell>
            <TableCell align="right">Value</TableCell>
            {showTrends && <TableCell align="center">Trend</TableCell>}
            <TableCell align="center">Actions</TableCell>
          </TableRow>
        </TableHead>
        <TableBody>
          {(currentLevel?.data || []).map((row) => (
            <TableRow key={row.id} hover>
              <TableCell component="th" scope="row">
                {row.name}
              </TableCell>
              <TableCell align="right">
                {row.value.toLocaleString()}
              </TableCell>
              {showTrends && (
                <TableCell align="center">
                  <Box display="flex" alignItems="center" justifyContent="center" gap={1}>
                    {getTrendIcon(row.trend, row.trendValue)}
                    {row.trendValue && (
                      <Typography variant="caption">
                        {row.trendValue > 0 ? '+' : ''}{row.trendValue.toFixed(1)}%
                      </Typography>
                    )}
                  </Box>
                </TableCell>
              )}
              <TableCell align="center">
                <Box display="flex" gap={1} justifyContent="center">
                  {row.drillable && (
                    <Button
                      size="small"
                      onClick={() => handleDrillDown(row)}
                      startIcon={<KeyboardArrowRight />}
                    >
                      Drill Down
                    </Button>
                  )}
                  <IconButton size="small" onClick={() => showDetails(row)}>
                    <Info />
                  </IconButton>
                </Box>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );

  // Render chart based on type
  const renderChart = () => {
    switch (currentChartType) {
      case 'bar':
        return renderBarChart();
      case 'pie':
        return renderPieChart();
      case 'line':
        return renderLineChart();
      case 'treemap':
        return renderTreeMap();
      case 'table':
        return renderTable();
      default:
        return renderBarChart();
    }
  };

  if (!currentLevel) {
    return (
      <Paper sx={{ p: 2 }}>
        <Typography>No data available</Typography>
      </Paper>
    );
  }

  return (
    <Paper sx={{ p: 2 }}>
      {/* Toolbar */}
      <Toolbar sx={{ px: 0, minHeight: '48px !important' }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, flexGrow: 1 }}>
          {navigationHistory.length > 1 && (
            <IconButton onClick={handleBack}>
              <ArrowBack />
            </IconButton>
          )}
          
          <Typography variant="h6">
            {currentLevel.name}
          </Typography>
        </Box>

        {/* Chart Type Selector */}
        <Box sx={{ display: 'flex', gap: 1, mr: 2 }}>
          <IconButton
            color={currentChartType === 'bar' ? 'primary' : 'default'}
            onClick={() => setCurrentChartType('bar')}
          >
            <BarChartIcon />
          </IconButton>
          <IconButton
            color={currentChartType === 'pie' ? 'primary' : 'default'}
            onClick={() => setCurrentChartType('pie')}
          >
            <PieChartIcon />
          </IconButton>
          <IconButton
            color={currentChartType === 'line' ? 'primary' : 'default'}
            onClick={() => setCurrentChartType('line')}
          >
            <ShowChart />
          </IconButton>
          <IconButton
            color={currentChartType === 'table' ? 'primary' : 'default'}
            onClick={() => setCurrentChartType('table')}
          >
            <TableChart />
          </IconButton>
        </Box>
      </Toolbar>

      {/* Breadcrumbs */}
      <Breadcrumbs separator={<KeyboardArrowRight />} sx={{ mb: 2 }}>
        {breadcrumbPath.map((level, index) => (
          <Link
            key={level.id}
            color={index === breadcrumbPath.length - 1 ? 'text.primary' : 'inherit'}
            href="#"
            onClick={(e) => {
              e.preventDefault();
              if (index < breadcrumbPath.length - 1) {
                navigateToLevel(level.id);
              }
            }}
            sx={{ cursor: index < breadcrumbPath.length - 1 ? 'pointer' : 'default' }}
          >
            {level.name}
          </Link>
        ))}
      </Breadcrumbs>

      {/* Summary Statistics */}
      <Box sx={{ mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap' }}>
        <Chip
          label={`Total Items: ${currentLevel.data.length}`}
          size="small"
        />
        <Chip
          label={`Total Value: ${currentLevel.data.reduce((sum, item) => sum + item.value, 0).toLocaleString()}`}
          size="small"
        />
        <Chip
          label={`Drillable: ${currentLevel.data.filter(item => item.drillable).length}`}
          size="small"
        />
      </Box>

      {/* Chart */}
      <Box sx={{ width: '100%', height: height + 50 }}>
        {renderChart()}
      </Box>

      {/* Metadata */}
      {showMetadata && currentLevel.metadata && (
        <Card sx={{ mt: 2 }}>
          <CardContent>
            <Typography variant="subtitle2" gutterBottom>
              Level Metadata
            </Typography>
            <List dense>
              {Object.entries(currentLevel.metadata).map(([key, value]) => (
                <ListItem key={key}>
                  <ListItemText
                    primary={key}
                    secondary={String(value)}
                  />
                </ListItem>
              ))}
            </List>
          </CardContent>
        </Card>
      )}

      {/* Details Dialog */}
      <Dialog
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>
          {selectedDataPoint?.name} - Details
        </DialogTitle>
        <DialogContent>
          {selectedDataPoint && (
            <Box sx={{ mt: 2 }}>
              <Typography variant="h6" gutterBottom>
                Value: {selectedDataPoint.value.toLocaleString()}
              </Typography>
              
              {showTrends && selectedDataPoint.trend && (
                <Box display="flex" alignItems="center" gap={1} mb={2}>
                  {getTrendIcon(selectedDataPoint.trend, selectedDataPoint.trendValue)}
                  <Typography>
                    Trend: {selectedDataPoint.trend}
                    {selectedDataPoint.trendValue && (
                      ` (${selectedDataPoint.trendValue > 0 ? '+' : ''}${selectedDataPoint.trendValue.toFixed(1)}%)`
                    )}
                  </Typography>
                </Box>
              )}

              {selectedDataPoint.metadata && (
                <>
                  <Typography variant="subtitle1" gutterBottom>
                    Metadata
                  </Typography>
                  <List>
                    {Object.entries(selectedDataPoint.metadata).map(([key, value]) => (
                      <ListItem key={key}>
                        <ListItemText
                          primary={key}
                          secondary={String(value)}
                        />
                      </ListItem>
                    ))}
                  </List>
                </>
              )}

              {selectedDataPoint.drillable && (
                <Box mt={2}>
                  <Button
                    variant="contained"
                    onClick={() => {
                      handleDrillDown(selectedDataPoint);
                      setDetailsOpen(false);
                    }}
                    startIcon={<KeyboardArrowRight />}
                  >
                    Drill Down to Details
                  </Button>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Paper>
  );
};

export default DrillDownChart;