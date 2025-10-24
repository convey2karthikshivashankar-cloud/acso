/**
 * Real-Time Metrics Dashboard
 * 
 * Displays live business metrics with animated gauges, trend indicators,
 * and interactive drill-down capabilities.
 */

import React, { useState, useEffect, useRef, useMemo } from 'react';
import {
  Box,
  Grid,
  Paper,
  Typography,
  Card,
  CardContent,
  CardHeader,
  IconButton,
  Tooltip,
  Chip,
  LinearProgress,
  CircularProgress,
  Avatar,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Fade,
  Zoom,
  Slide
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  TrendingFlat,
  AttachMoney,
  Security,
  Speed,
  Assessment,
  Warning,
  CheckCircle,
  Error,
  Info,
  Refresh,
  Fullscreen,
  Timeline
} from '@mui/icons-material';
import { useTheme } from '@mui/material/styles';
import { BusinessMetric, AgentStatus } from '../../types/demo';
import { visualizationEngine } from '../../services/visualizationEngine';

interface RealTimeMetricsDashboardProps {
  metrics: BusinessMetric[];
  agents: AgentStatus[];
  isRunning?: boolean;
  height?: number;
  compact?: boolean;
  onMetricClick?: (metric: BusinessMetric) => void;
}

interface MetricCardProps {
  metric: BusinessMetric;
  animated?: boolean;
  compact?: boolean;
  onClick?: () => void;
}

interface GaugeProps {
  value: number;
  max: number;
  label: string;
  color: string;
  size?: number;
  animated?: boolean;
}

const AnimatedGauge: React.FC<GaugeProps> = ({
  value,
  max,
  label,
  color,
  size = 120,
  animated = true
}) => {
  const [displayValue, setDisplayValue] = useState(0);
  const animationRef = useRef<number>();

  useEffect(() => {
    if (!animated) {
      setDisplayValue(value);
      return;
    }

    const startValue = displayValue;
    const endValue = value;
    const duration = 1000; // 1 second
    const startTime = Date.now();

    const animate = () => {
      const elapsed = Date.now() - startTime;
      const progress = Math.min(elapsed / duration, 1);
      
      // Easing function (ease-out)
      const easeOut = 1 - Math.pow(1 - progress, 3);
      const currentValue = startValue + (endValue - startValue) * easeOut;
      
      setDisplayValue(currentValue);

      if (progress < 1) {
        animationRef.current = requestAnimationFrame(animate);
      }
    };

    animate();

    return () => {
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [value, animated]);

  const percentage = Math.min((displayValue / max) * 100, 100);
  const circumference = 2 * Math.PI * (size / 2 - 10);
  const strokeDasharray = circumference;
  const strokeDashoffset = circumference - (percentage / 100) * circumference;

  return (
    <Box sx={{ position: 'relative', display: 'inline-flex' }}>
      <svg width={size} height={size}>
        {/* Background circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          stroke="#e0e0e0"
          strokeWidth="8"
          fill="transparent"
        />
        {/* Progress circle */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={size / 2 - 10}
          stroke={color}
          strokeWidth="8"
          fill="transparent"
          strokeDasharray={strokeDasharray}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          style={{
            transition: animated ? 'stroke-dashoffset 0.3s ease-in-out' : 'none',
            transform: 'rotate(-90deg)',
            transformOrigin: '50% 50%'
          }}
        />
      </svg>
      <Box
        sx={{
          position: 'absolute',
          top: 0,
          left: 0,
          bottom: 0,
          right: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center'
        }}
      >
        <Typography variant="h6" component="div" color="text.primary">
          {Math.round(displayValue)}
        </Typography>
        <Typography variant="caption" color="text.secondary">
          {label}
        </Typography>
      </Box>
    </Box>
  );
};

const MetricCard: React.FC<MetricCardProps> = ({
  metric,
  animated = true,
  compact = false,
  onClick
}) => {
  const theme = useTheme();
  const [isHovered, setIsHovered] = useState(false);

  const getMetricIcon = (category: string) => {
    switch (category) {
      case 'cost-savings': return <AttachMoney />;
      case 'security': return <Security />;
      case 'performance': return <Speed />;
      case 'efficiency': return <Assessment />;
      default: return <Info />;
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'success': return <CheckCircle color="success" />;
      case 'warning': return <Warning color="warning" />;
      case 'error': return <Error color="error" />;
      default: return <Info color="info" />;
    }
  };

  const getTrendIcon = (trend?: string) => {
    switch (trend) {
      case 'up': return <TrendingUp color="success" />;
      case 'down': return <TrendingDown color="error" />;
      default: return <TrendingFlat color="action" />;
    }
  };

  const getMetricColor = (category: string): string => {
    switch (category) {
      case 'cost-savings': return theme.palette.success.main;
      case 'security': return theme.palette.error.main;
      case 'performance': return theme.palette.primary.main;
      case 'efficiency': return theme.palette.info.main;
      default: return theme.palette.grey[500];
    }
  };

  const formatValue = (value: string | number): string => {
    if (typeof value === 'number') {
      if (value >= 1000000) {
        return `${(value / 1000000).toFixed(1)}M`;
      } else if (value >= 1000) {
        return `${(value / 1000).toFixed(1)}K`;
      }
      return value.toString();
    }
    return value;
  };

  return (
    <Zoom in={true} timeout={animated ? 500 : 0}>
      <Card
        sx={{
          height: compact ? 120 : 200,
          cursor: onClick ? 'pointer' : 'default',
          transition: 'all 0.3s ease',
          transform: isHovered ? 'translateY(-4px)' : 'translateY(0)',
          boxShadow: isHovered ? theme.shadows[8] : theme.shadows[2],
          '&:hover': {
            boxShadow: theme.shadows[8]
          }
        }}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
        onClick={onClick}
      >
        <CardHeader
          avatar={
            <Avatar sx={{ bgcolor: getMetricColor(metric.category) }}>
              {getMetricIcon(metric.category)}
            </Avatar>
          }
          title={
            <Typography variant={compact ? "body2" : "h6"} noWrap>
              {metric.name}
            </Typography>
          }
          subheader={metric.category}
          action={
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              {getTrendIcon(metric.trend)}
              {getStatusIcon(metric.status)}
            </Box>
          }
          sx={{ pb: compact ? 1 : 2 }}
        />
        
        <CardContent sx={{ pt: 0 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            {compact ? (
              <Box>
                <Typography variant="h5" color="primary">
                  {formatValue(metric.value)}
                </Typography>
                {metric.changePercent && (
                  <Typography
                    variant="caption"
                    color={metric.trend === 'up' ? 'success.main' : metric.trend === 'down' ? 'error.main' : 'text.secondary'}
                  >
                    {metric.changePercent > 0 ? '+' : ''}{metric.changePercent}%
                  </Typography>
                )}
              </Box>
            ) : (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <AnimatedGauge
                  value={typeof metric.value === 'number' ? metric.value : 0}
                  max={metric.target || (typeof metric.value === 'number' ? metric.value * 1.5 : 100)}
                  label={metric.unit || ''}
                  color={getMetricColor(metric.category)}
                  size={80}
                  animated={animated}
                />
                
                <Box>
                  <Typography variant="h4" color="primary">
                    {formatValue(metric.value)}
                  </Typography>
                  {metric.target && (
                    <Typography variant="body2" color="text.secondary">
                      Target: {formatValue(metric.target)}
                    </Typography>
                  )}
                  {metric.changePercent && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Typography
                        variant="body2"
                        color={metric.trend === 'up' ? 'success.main' : metric.trend === 'down' ? 'error.main' : 'text.secondary'}
                      >
                        {metric.changePercent > 0 ? '+' : ''}{metric.changePercent}%
                      </Typography>
                      <Typography variant="caption" color="text.secondary">
                        vs last period
                      </Typography>
                    </Box>
                  )}
                </Box>
              </Box>
            )}
          </Box>
          
          {!compact && metric.description && (
            <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
              {metric.description}
            </Typography>
          )}
        </CardContent>
      </Card>
    </Zoom>
  );
};

const RealTimeMetricsDashboard: React.FC<RealTimeMetricsDashboardProps> = ({
  metrics,
  agents,
  isRunning = false,
  height = 600,
  compact = false,
  onMetricClick
}) => {
  const theme = useTheme();
  const [animationEnabled, setAnimationEnabled] = useState(true);

  // Subscribe to visualization engine updates
  useEffect(() => {
    const unsubscribe = visualizationEngine.subscribe('business-metrics', (stream) => {
      // Trigger re-render when metrics update
    });

    return unsubscribe;
  }, []);

  // Update visualization engine with current metrics
  useEffect(() => {
    visualizationEngine.updateBusinessMetrics(metrics);
  }, [metrics]);

  // Categorize metrics
  const categorizedMetrics = useMemo(() => {
    const categories = {
      'cost-savings': metrics.filter(m => m.category === 'cost-savings'),
      'performance': metrics.filter(m => m.category === 'performance'),
      'security': metrics.filter(m => m.category === 'security'),
      'efficiency': metrics.filter(m => m.category === 'efficiency'),
      'compliance': metrics.filter(m => m.category === 'compliance')
    };

    return categories;
  }, [metrics]);

  // Calculate summary statistics
  const summaryStats = useMemo(() => {
    const totalMetrics = metrics.length;
    const alertMetrics = metrics.filter(m => m.status === 'alert').length;
    const successMetrics = metrics.filter(m => m.status === 'success').length;
    const warningMetrics = metrics.filter(m => m.status === 'warning').length;

    const avgValue = metrics.reduce((sum, m) => {
      const value = typeof m.value === 'number' ? m.value : 0;
      return sum + value;
    }, 0) / totalMetrics || 0;

    return {
      total: totalMetrics,
      alerts: alertMetrics,
      success: successMetrics,
      warnings: warningMetrics,
      average: avgValue
    };
  }, [metrics]);

  const renderCategorySection = (categoryName: string, categoryMetrics: BusinessMetric[]) => {
    if (categoryMetrics.length === 0) return null;

    return (
      <Box key={categoryName} sx={{ mb: 3 }}>
        <Typography variant="h6" gutterBottom sx={{ textTransform: 'capitalize' }}>
          {categoryName.replace('-', ' ')} ({categoryMetrics.length})
        </Typography>
        <Grid container spacing={2}>
          {categoryMetrics.map((metric, index) => (
            <Grid item xs={12} sm={compact ? 12 : 6} md={compact ? 6 : 4} key={metric.id}>
              <Slide
                in={true}
                direction="up"
                timeout={animationEnabled ? 300 + index * 100 : 0}
              >
                <div>
                  <MetricCard
                    metric={metric}
                    animated={animationEnabled && isRunning}
                    compact={compact}
                    onClick={() => onMetricClick?.(metric)}
                  />
                </div>
              </Slide>
            </Grid>
          ))}
        </Grid>
      </Box>
    );
  };

  return (
    <Box sx={{ height, overflow: 'auto' }}>
      {/* Summary Header */}
      <Paper elevation={1} sx={{ p: 2, mb: 2 }}>
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Typography variant="h6">
            Business Metrics Dashboard
          </Typography>
          
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <Chip
              icon={<Assessment />}
              label={`${summaryStats.total} Metrics`}
              size="small"
              variant="outlined"
            />
            
            {summaryStats.alerts > 0 && (
              <Chip
                icon={<Error />}
                label={`${summaryStats.alerts} Alerts`}
                size="small"
                color="error"
              />
            )}
            
            {summaryStats.warnings > 0 && (
              <Chip
                icon={<Warning />}
                label={`${summaryStats.warnings} Warnings`}
                size="small"
                color="warning"
              />
            )}
            
            <Chip
              icon={<CheckCircle />}
              label={`${summaryStats.success} Healthy`}
              size="small"
              color="success"
            />

            <Tooltip title="Toggle Animations">
              <IconButton
                onClick={() => setAnimationEnabled(!animationEnabled)}
                color={animationEnabled ? 'primary' : 'default'}
                size="small"
              >
                <Timeline />
              </IconButton>
            </Tooltip>
          </Box>
        </Box>
      </Paper>

      {/* Metrics by Category */}
      <Box sx={{ px: 1 }}>
        {Object.entries(categorizedMetrics).map(([category, categoryMetrics]) =>
          renderCategorySection(category, categoryMetrics)
        )}
        
        {metrics.length === 0 && (
          <Paper sx={{ p: 4, textAlign: 'center' }}>
            <Assessment sx={{ fontSize: 64, color: 'text.secondary', mb: 2 }} />
            <Typography variant="h6" color="text.secondary" gutterBottom>
              No Metrics Available
            </Typography>
            <Typography variant="body2" color="text.secondary">
              Metrics will appear here when the demo is running
            </Typography>
          </Paper>
        )}
      </Box>
    </Box>
  );
};

export default RealTimeMetricsDashboard;