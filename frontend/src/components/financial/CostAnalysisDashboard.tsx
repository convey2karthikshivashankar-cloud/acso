import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  IconButton,
  Grid,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  DatePicker,
  Tooltip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  TablePagination,
  useTheme,
  alpha,
} from '@mui/material';
import {
  TrendingUp,
  TrendingDown,
  AttachMoney,
  Assessment,
  FilterList,
  Download,
  Refresh,
  PieChart,
  BarChart,
  Timeline,
  Warning,
  Info,
  CheckCircle,
} from '@mui/icons-material';
import { TimeSeriesChart } from '../charts/TimeSeriesChart';
import { PieChart as CustomPieChart } from '../charts/PieChart';
import { BarChart as CustomBarChart } from '../charts/BarChart';

export interface CostData {
  id: string;
  service: string;
  category: 'compute' | 'storage' | 'network' | 'security' | 'monitoring' | 'other';
  region: string;
  cost: number;
  currency: string;
  date: Date;
  tags: Record<string, string>;
  forecast?: number;
  budget?: number;
  variance?: number;
}

export interface CostBreakdown {
  category: string;
  cost: number;
  percentage: number;
  trend: 'up' | 'down' | 'stable';
  trendPercentage: number;
  services: {
    name: string;
    cost: number;
    percentage: number;
  }[];
}

export interface CostTrend {
  date: Date;
  actual: number;
  forecast: number;
  budget: number;
}

export interface CostOptimization {
  id: string;
  type: 'rightsizing' | 'reserved_instances' | 'spot_instances' | 'storage_optimization' | 'unused_resources';
  title: string;
  description: string;
  potentialSavings: number;
  effort: 'low' | 'medium' | 'high';
  impact: 'low' | 'medium' | 'high';
  status: 'identified' | 'in_progress' | 'completed' | 'dismissed';
  service: string;
  region: string;
  implementationSteps: string[];
  estimatedImplementationTime: number; // in hours
}

interface CostAnalysisDashboardProps {
  costData: CostData[];
  dateRange: {
    start: Date;
    end: Date;
  };
  onDateRangeChange?: (range: { start: Date; end: Date }) => void;
  onExportData?: (format: 'csv' | 'pdf' | 'excel') => void;
  onRefreshData?: () => void;
}

interface CostMetricsProps {
  totalCost: number;
  budgetVariance: number;
  monthlyTrend: number;
  forecastAccuracy: number;
}

interface CostBreakdownProps {
  breakdowns: CostBreakdown[];
  onDrillDown?: (category: string) => void;
}

interface CostTrendProps {
  trends: CostTrend[];
  title: string;
}

interface OptimizationRecommendationsProps {
  recommendations: CostOptimization[];
  onImplement?: (recommendationId: string) => void;
  onDismiss?: (recommendationId: string) => void;
}

const CostMetrics: React.FC<CostMetricsProps> = ({
  totalCost,
  budgetVariance,
  monthlyTrend,
  forecastAccuracy,
}) => {
  const theme = useTheme();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getVarianceColor = (variance: number) => {
    if (variance > 10) return theme.palette.error.main;
    if (variance > 5) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  const getTrendIcon = (trend: number) => {
    if (trend > 0) return <TrendingUp color="error" />;
    if (trend < 0) return <TrendingDown color="success" />;
    return <Timeline color="info" />;
  };

  const metrics = [
    {
      title: 'Total Cost',
      value: formatCurrency(totalCost),
      icon: <AttachMoney />,
      color: theme.palette.primary.main,
    },
    {
      title: 'Budget Variance',
      value: `${budgetVariance > 0 ? '+' : ''}${budgetVariance.toFixed(1)}%`,
      icon: budgetVariance > 10 ? <Warning /> : <CheckCircle />,
      color: getVarianceColor(Math.abs(budgetVariance)),
    },
    {
      title: 'Monthly Trend',
      value: `${monthlyTrend > 0 ? '+' : ''}${monthlyTrend.toFixed(1)}%`,
      icon: getTrendIcon(monthlyTrend),
      color: monthlyTrend > 0 ? theme.palette.error.main : theme.palette.success.main,
    },
    {
      title: 'Forecast Accuracy',
      value: `${forecastAccuracy.toFixed(1)}%`,
      icon: <Assessment />,
      color: forecastAccuracy > 90 ? theme.palette.success.main : theme.palette.warning.main,
    },
  ];

  return (
    <Grid container spacing={3}>
      {metrics.map((metric, index) => (
        <Grid item xs={12} sm={6} md={3} key={index}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <Box>
                  <Typography variant="h4" sx={{ color: metric.color, fontWeight: 'bold' }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {metric.title}
                  </Typography>
                </Box>
                <Box sx={{ color: metric.color }}>
                  {metric.icon}
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      ))}
    </Grid>
  );
};

const CostBreakdown: React.FC<CostBreakdownProps> = ({ breakdowns, onDrillDown }) => {
  const theme = useTheme();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getTrendIcon = (trend: 'up' | 'down' | 'stable') => {
    switch (trend) {
      case 'up':
        return <TrendingUp color="error" />;
      case 'down':
        return <TrendingDown color="success" />;
      default:
        return <Timeline color="info" />;
    }
  };

  const pieChartData = breakdowns.map(breakdown => ({
    name: breakdown.category,
    value: breakdown.cost,
    color: `hsl(${Math.random() * 360}, 70%, 50%)`,
  }));

  return (
    <Grid container spacing={3}>
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Cost Distribution" />
          <CardContent>
            <CustomPieChart
              data={pieChartData}
              height={300}
              showLegend
              showTooltip
            />
          </CardContent>
        </Card>
      </Grid>
      
      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Category Breakdown" />
          <CardContent>
            <TableContainer>
              <Table size="small">
                <TableHead>
                  <TableRow>
                    <TableCell>Category</TableCell>
                    <TableCell align="right">Cost</TableCell>
                    <TableCell align="right">%</TableCell>
                    <TableCell align="center">Trend</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {breakdowns.map((breakdown) => (
                    <TableRow
                      key={breakdown.category}
                      hover
                      onClick={() => onDrillDown?.(breakdown.category)}
                      sx={{ cursor: onDrillDown ? 'pointer' : 'default' }}
                    >
                      <TableCell>
                        <Typography variant="body2" fontWeight="medium">
                          {breakdown.category}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {formatCurrency(breakdown.cost)}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        <Typography variant="body2">
                          {breakdown.percentage.toFixed(1)}%
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 0.5 }}>
                          {getTrendIcon(breakdown.trend)}
                          <Typography variant="caption">
                            {breakdown.trendPercentage > 0 ? '+' : ''}{breakdown.trendPercentage.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );
};

const CostTrend: React.FC<CostTrendProps> = ({ trends, title }) => {
  const chartData = trends.map(trend => ({
    date: trend.date.toISOString().split('T')[0],
    actual: trend.actual,
    forecast: trend.forecast,
    budget: trend.budget,
  }));

  const series = [
    {
      name: 'Actual',
      data: chartData.map(d => ({ x: d.date, y: d.actual })),
      color: '#2196F3',
    },
    {
      name: 'Forecast',
      data: chartData.map(d => ({ x: d.date, y: d.forecast })),
      color: '#FF9800',
    },
    {
      name: 'Budget',
      data: chartData.map(d => ({ x: d.date, y: d.budget })),
      color: '#4CAF50',
    },
  ];

  return (
    <Card>
      <CardHeader title={title} />
      <CardContent>
        <TimeSeriesChart
          series={series}
          height={300}
          showLegend
          showTooltip
          yAxisLabel="Cost ($)"
        />
      </CardContent>
    </Card>
  );
};

const OptimizationRecommendations: React.FC<OptimizationRecommendationsProps> = ({
  recommendations,
  onImplement,
  onDismiss,
}) => {
  const theme = useTheme();

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const getEffortColor = (effort: CostOptimization['effort']) => {
    switch (effort) {
      case 'low':
        return theme.palette.success.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'high':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getImpactColor = (impact: CostOptimization['impact']) => {
    switch (impact) {
      case 'high':
        return theme.palette.success.main;
      case 'medium':
        return theme.palette.warning.main;
      case 'low':
        return theme.palette.error.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getTypeIcon = (type: CostOptimization['type']) => {
    // Return appropriate icons based on type
    return <Assessment />;
  };

  const totalSavings = recommendations.reduce((sum, rec) => sum + rec.potentialSavings, 0);

  return (
    <Card>
      <CardHeader
        title="Cost Optimization Recommendations"
        subheader={`${recommendations.length} recommendations • Potential savings: ${formatCurrency(totalSavings)}`}
      />
      <CardContent>
        <Grid container spacing={2}>
          {recommendations.map((recommendation) => (
            <Grid item xs={12} key={recommendation.id}>
              <Paper
                sx={{
                  p: 2,
                  border: 1,
                  borderColor: 'divider',
                  '&:hover': {
                    borderColor: 'primary.main',
                    backgroundColor: alpha(theme.palette.primary.main, 0.02),
                  },
                }}
              >
                <Box sx={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between' }}>
                  <Box sx={{ flex: 1 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                      {getTypeIcon(recommendation.type)}
                      <Typography variant="h6">{recommendation.title}</Typography>
                      <Chip
                        label={`${formatCurrency(recommendation.potentialSavings)} savings`}
                        color="success"
                        size="small"
                      />
                    </Box>
                    
                    <Typography variant="body2" color="text.secondary" gutterBottom>
                      {recommendation.description}
                    </Typography>
                    
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <Chip
                        label={`${recommendation.effort} effort`}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getEffortColor(recommendation.effort), 0.1),
                          color: getEffortColor(recommendation.effort),
                        }}
                      />
                      <Chip
                        label={`${recommendation.impact} impact`}
                        size="small"
                        sx={{
                          backgroundColor: alpha(getImpactColor(recommendation.impact), 0.1),
                          color: getImpactColor(recommendation.impact),
                        }}
                      />
                      <Chip label={recommendation.service} size="small" variant="outlined" />
                      <Chip label={recommendation.region} size="small" variant="outlined" />
                      <Typography variant="caption" color="text.secondary">
                        Est. {recommendation.estimatedImplementationTime}h to implement
                      </Typography>
                    </Box>
                  </Box>
                  
                  <Box sx={{ display: 'flex', gap: 1 }}>
                    {onImplement && recommendation.status === 'identified' && (
                      <Button
                        size="small"
                        variant="contained"
                        onClick={() => onImplement(recommendation.id)}
                      >
                        Implement
                      </Button>
                    )}
                    {onDismiss && (
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => onDismiss(recommendation.id)}
                      >
                        Dismiss
                      </Button>
                    )}
                  </Box>
                </Box>
              </Paper>
            </Grid>
          ))}
        </Grid>
        
        {recommendations.length === 0 && (
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              No optimization recommendations available
            </Typography>
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export const CostAnalysisDashboard: React.FC<CostAnalysisDashboardProps> = ({
  costData,
  dateRange,
  onDateRangeChange,
  onExportData,
  onRefreshData,
}) => {
  const [selectedCategory, setSelectedCategory] = React.useState<string>('all');
  const [selectedRegion, setSelectedRegion] = React.useState<string>('all');

  // Calculate metrics from cost data
  const totalCost = React.useMemo(() => {
    return costData.reduce((sum, item) => sum + item.cost, 0);
  }, [costData]);

  const budgetVariance = React.useMemo(() => {
    const totalBudget = costData.reduce((sum, item) => sum + (item.budget || 0), 0);
    return totalBudget > 0 ? ((totalCost - totalBudget) / totalBudget) * 100 : 0;
  }, [costData, totalCost]);

  const monthlyTrend = React.useMemo(() => {
    // Calculate month-over-month trend
    const currentMonth = new Date().getMonth();
    const currentMonthCosts = costData.filter(item => item.date.getMonth() === currentMonth);
    const previousMonthCosts = costData.filter(item => item.date.getMonth() === currentMonth - 1);
    
    const currentTotal = currentMonthCosts.reduce((sum, item) => sum + item.cost, 0);
    const previousTotal = previousMonthCosts.reduce((sum, item) => sum + item.cost, 0);
    
    return previousTotal > 0 ? ((currentTotal - previousTotal) / previousTotal) * 100 : 0;
  }, [costData]);

  const forecastAccuracy = React.useMemo(() => {
    const itemsWithForecast = costData.filter(item => item.forecast);
    if (itemsWithForecast.length === 0) return 0;
    
    const accuracy = itemsWithForecast.reduce((sum, item) => {
      const error = Math.abs(item.cost - (item.forecast || 0)) / item.cost;
      return sum + (1 - error);
    }, 0);
    
    return (accuracy / itemsWithForecast.length) * 100;
  }, [costData]);

  // Generate cost breakdowns
  const costBreakdowns: CostBreakdown[] = React.useMemo(() => {
    const categories = ['compute', 'storage', 'network', 'security', 'monitoring', 'other'];
    
    return categories.map(category => {
      const categoryData = costData.filter(item => item.category === category);
      const cost = categoryData.reduce((sum, item) => sum + item.cost, 0);
      const percentage = totalCost > 0 ? (cost / totalCost) * 100 : 0;
      
      // Mock trend calculation
      const trend: 'up' | 'down' | 'stable' = Math.random() > 0.5 ? 'up' : 'down';
      const trendPercentage = (Math.random() - 0.5) * 20;
      
      const services = categoryData.reduce((acc, item) => {
        const existing = acc.find(s => s.name === item.service);
        if (existing) {
          existing.cost += item.cost;
        } else {
          acc.push({ name: item.service, cost: item.cost, percentage: 0 });
        }
        return acc;
      }, [] as { name: string; cost: number; percentage: number }[]);
      
      // Calculate service percentages
      services.forEach(service => {
        service.percentage = cost > 0 ? (service.cost / cost) * 100 : 0;
      });
      
      return {
        category,
        cost,
        percentage,
        trend,
        trendPercentage,
        services: services.slice(0, 5), // Top 5 services
      };
    }).filter(breakdown => breakdown.cost > 0);
  }, [costData, totalCost]);

  // Generate cost trends
  const costTrends: CostTrend[] = React.useMemo(() => {
    const days = 30;
    const trends: CostTrend[] = [];
    
    for (let i = days; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);
      
      const dayData = costData.filter(item => 
        item.date.toDateString() === date.toDateString()
      );
      
      const actual = dayData.reduce((sum, item) => sum + item.cost, 0);
      const forecast = dayData.reduce((sum, item) => sum + (item.forecast || 0), 0);
      const budget = dayData.reduce((sum, item) => sum + (item.budget || 0), 0);
      
      trends.push({ date, actual, forecast, budget });
    }
    
    return trends;
  }, [costData]);

  // Mock optimization recommendations
  const optimizationRecommendations: CostOptimization[] = [
    {
      id: 'opt-1',
      type: 'rightsizing',
      title: 'Rightsize EC2 Instances',
      description: 'Several EC2 instances are underutilized and can be downsized to save costs.',
      potentialSavings: 2400,
      effort: 'low',
      impact: 'medium',
      status: 'identified',
      service: 'EC2',
      region: 'us-east-1',
      implementationSteps: [
        'Analyze instance utilization metrics',
        'Identify underutilized instances',
        'Schedule downtime for resizing',
        'Resize instances to appropriate types',
      ],
      estimatedImplementationTime: 4,
    },
    {
      id: 'opt-2',
      type: 'reserved_instances',
      title: 'Purchase Reserved Instances',
      description: 'Convert on-demand instances to reserved instances for long-term workloads.',
      potentialSavings: 8500,
      effort: 'medium',
      impact: 'high',
      status: 'identified',
      service: 'EC2',
      region: 'us-west-2',
      implementationSteps: [
        'Analyze usage patterns',
        'Calculate ROI for reserved instances',
        'Purchase appropriate reserved instances',
        'Monitor and optimize usage',
      ],
      estimatedImplementationTime: 8,
    },
  ];

  const regions = React.useMemo(() => {
    const uniqueRegions = [...new Set(costData.map(item => item.region))];
    return uniqueRegions;
  }, [costData]);

  const categories = React.useMemo(() => {
    const uniqueCategories = [...new Set(costData.map(item => item.category))];
    return uniqueCategories;
  }, [costData]);

  return (
    <Box>
      {/* Dashboard Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Cost Analysis Dashboard</Typography>
        
        <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Category</InputLabel>
            <Select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
            >
              <MenuItem value="all">All Categories</MenuItem>
              {categories.map(category => (
                <MenuItem key={category} value={category}>
                  {category.charAt(0).toUpperCase() + category.slice(1)}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <FormControl size="small" sx={{ minWidth: 120 }}>
            <InputLabel>Region</InputLabel>
            <Select
              value={selectedRegion}
              onChange={(e) => setSelectedRegion(e.target.value)}
            >
              <MenuItem value="all">All Regions</MenuItem>
              {regions.map(region => (
                <MenuItem key={region} value={region}>
                  {region}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button startIcon={<FilterList />} variant="outlined">
            More Filters
          </Button>
          
          <Button startIcon={<Refresh />} onClick={onRefreshData}>
            Refresh
          </Button>
          
          <Button startIcon={<Download />} variant="contained">
            Export
          </Button>
        </Box>
      </Box>

      {/* Cost Metrics */}
      <Box sx={{ mb: 4 }}>
        <CostMetrics
          totalCost={totalCost}
          budgetVariance={budgetVariance}
          monthlyTrend={monthlyTrend}
          forecastAccuracy={forecastAccuracy}
        />
      </Box>

      {/* Cost Trend Chart */}
      <Box sx={{ mb: 4 }}>
        <CostTrend trends={costTrends} title="Cost Trends (30 Days)" />
      </Box>

      {/* Cost Breakdown */}
      <Box sx={{ mb: 4 }}>
        <CostBreakdown
          breakdowns={costBreakdowns}
          onDrillDown={(category) => setSelectedCategory(category)}
        />
      </Box>

      {/* Optimization Recommendations */}
      <Box sx={{ mb: 4 }}>
        <OptimizationRecommendations
          recommendations={optimizationRecommendations}
          onImplement={(id) => console.log('Implement recommendation:', id)}
          onDismiss={(id) => console.log('Dismiss recommendation:', id)}
        />
      </Box>
    </Box>
  );
};