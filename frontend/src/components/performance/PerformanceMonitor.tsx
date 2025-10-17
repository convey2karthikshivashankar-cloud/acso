import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Grid,
  LinearProgress,
  Chip,
  Alert,
  AlertTitle,
  Button,
  IconButton,
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
  Paper,
  useTheme,
} from '@mui/material';
import {
  Speed,
  Memory,
  NetworkCheck,
  Warning,
  CheckCircle,
  Error,
  Info,
  Refresh,
  Download,
  Timeline,
  Assessment,
} from '@mui/icons-material';
import { performanceMonitoringService, PerformanceMetrics, PerformanceBudget, PerformanceAlert } from '../../services/performanceMonitoringService';

interface PerformanceMonitorProps {
  autoRefresh?: boolean;
  refreshInterval?: number;
}

interface MetricCardProps {
  title: string;
  value: number;
  unit: string;
  budget?: number;
  warning?: number;
  icon: React.ReactNode;
  description: string;
}

interface BudgetStatusProps {
  budgets: PerformanceBudget[];
}

interface AlertsPanelProps {
  alerts: PerformanceAlert[];
  onClearAlerts: () => void;
}

const MetricCard: React.FC<MetricCardProps> = ({
  title,
  value,
  unit,
  budget,
  warning,
  icon,
  description,
}) => {
  const theme = useTheme();

  const getStatus = () => {
    if (!budget) return 'good';
    if (value > budget) return 'exceeded';
    if (warning && value > warning) return 'warning';
    return 'good';
  };

  const getStatusColor = () => {
    const status = getStatus();
    switch (status) {
      case 'exceeded':
        return theme.palette.error.main;
      case 'warning':
        return theme.palette.warning.main;
      default:
        return theme.palette.success.main;
    }
  };

  const getProgress = () => {
    if (!budget) return 0;
    return Math.min((value / budget) * 100, 100);
  };

  return (
    <Card>
      <CardContent>
        <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
          <Box sx={{ color: getStatusColor(), mr: 1 }}>
            {icon}
          </Box>
          <Typography variant="h6">{title}</Typography>
        </Box>
        
        <Typography variant="h4" sx={{ color: getStatusColor(), fontWeight: 'bold', mb: 1 }}>
          {value.toFixed(value < 1 ? 3 : 0)}{unit}
        </Typography>
        
        {budget && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="caption">Budget: {budget}{unit}</Typography>
              <Typography variant="caption">{getProgress().toFixed(0)}%</Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={getProgress()}
              sx={{
                height: 6,
                borderRadius: 3,
                '& .MuiLinearProgress-bar': {
                  backgroundColor: getStatusColor(),
                },
              }}
            />
          </Box>
        )}
        
        <Typography variant="body2" color="text.secondary">
          {description}
        </Typography>
      </CardContent>
    </Card>
  );
};

const BudgetStatus: React.FC<BudgetStatusProps> = ({ budgets }) => {
  const getStatusIcon = (status: PerformanceBudget['status']) => {
    switch (status) {
      case 'exceeded':
        return <Error color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      default:
        return <CheckCircle color="success" />;
    }
  };

  const getStatusColor = (status: PerformanceBudget['status']) => {
    switch (status) {
      case 'exceeded':
        return 'error';
      case 'warning':
        return 'warning';
      default:
        return 'success';
    }
  };

  return (
    <Card>
      <CardHeader title="Performance Budgets" />
      <CardContent>
        <TableContainer>
          <Table size="small">
            <TableHead>
              <TableRow>
                <TableCell>Metric</TableCell>
                <TableCell align="right">Current</TableCell>
                <TableCell align="right">Budget</TableCell>
                <TableCell align="center">Status</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {budgets.map((budget) => (
                <TableRow key={budget.metric}>
                  <TableCell>{budget.metric.toUpperCase()}</TableCell>
                  <TableCell align="right">
                    {budget.current.toFixed(budget.current < 1 ? 3 : 0)}
                  </TableCell>
                  <TableCell align="right">
                    {budget.budget.toFixed(budget.budget < 1 ? 3 : 0)}
                  </TableCell>
                  <TableCell align="center">
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 1 }}>
                      {getStatusIcon(budget.status)}
                      <Chip
                        label={budget.status}
                        size="small"
                        color={getStatusColor(budget.status) as any}
                      />
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
      </CardContent>
    </Card>
  );
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onClearAlerts }) => {
  const getSeverityColor = (severity: PerformanceAlert['severity']) => {
    switch (severity) {
      case 'critical':
        return 'error';
      case 'high':
        return 'error';
      case 'medium':
        return 'warning';
      default:
        return 'info';
    }
  };

  if (alerts.length === 0) {
    return (
      <Card>
        <CardHeader title="Performance Alerts" />
        <CardContent>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <CheckCircle color="success" />
            <Typography variant="body2">No performance alerts</Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader
        title={`Performance Alerts (${alerts.length})`}
        action={
          <Button size="small" onClick={onClearAlerts}>
            Clear All
          </Button>
        }
      />
      <CardContent>
        {alerts.map((alert) => (
          <Alert
            key={alert.id}
            severity={getSeverityColor(alert.severity)}
            sx={{ mb: 1 }}
          >
            <AlertTitle>{alert.metric.toUpperCase()} Alert</AlertTitle>
            {alert.message}
            <Typography variant="caption" display="block" sx={{ mt: 1 }}>
              {alert.timestamp.toLocaleString()}
            </Typography>
          </Alert>
        ))}
      </CardContent>
    </Card>
  );
};

export const PerformanceMonitor: React.FC<PerformanceMonitorProps> = ({
  autoRefresh = true,
  refreshInterval = 5000,
}) => {
  const [metrics, setMetrics] = React.useState<PerformanceMetrics | null>(null);
  const [budgets, setBudgets] = React.useState<PerformanceBudget[]>([]);
  const [alerts, setAlerts] = React.useState<PerformanceAlert[]>([]);
  const [reportDialogOpen, setReportDialogOpen] = React.useState(false);
  const [performanceReport, setPerformanceReport] = React.useState<any>(null);

  const refreshData = React.useCallback(() => {
    const currentMetrics = performanceMonitoringService.getMetrics();
    const currentBudgets = performanceMonitoringService.getBudgets();
    const currentAlerts = performanceMonitoringService.getAlerts();

    setMetrics(currentMetrics);
    setBudgets(currentBudgets);
    setAlerts(currentAlerts);
  }, []);

  React.useEffect(() => {
    refreshData();

    if (autoRefresh) {
      const interval = setInterval(refreshData, refreshInterval);
      return () => clearInterval(interval);
    }
  }, [autoRefresh, refreshInterval, refreshData]);

  const handleClearAlerts = () => {
    performanceMonitoringService.clearAlerts();
    setAlerts([]);
  };

  const handleGenerateReport = () => {
    const report = performanceMonitoringService.generateReport();
    setPerformanceReport(report);
    setReportDialogOpen(true);
  };

  const handleExportData = () => {
    const data = performanceMonitoringService.exportData();
    const blob = new Blob([data], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `performance-data-${new Date().toISOString()}.json`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  if (!metrics) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <Typography>Loading performance metrics...</Typography>
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Performance Monitor</Typography>
        
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button startIcon={<Refresh />} onClick={refreshData}>
            Refresh
          </Button>
          <Button startIcon={<Assessment />} onClick={handleGenerateReport}>
            Generate Report
          </Button>
          <Button startIcon={<Download />} onClick={handleExportData}>
            Export Data
          </Button>
        </Box>
      </Box>

      {/* Core Web Vitals */}
      <Typography variant="h6" gutterBottom>
        Core Web Vitals
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="LCP"
            value={metrics.lcp || 0}
            unit="ms"
            budget={2500}
            warning={2000}
            icon={<Speed />}
            description="Largest Contentful Paint - measures loading performance"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="FID"
            value={metrics.fid || 0}
            unit="ms"
            budget={100}
            warning={75}
            icon={<Timeline />}
            description="First Input Delay - measures interactivity"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={4}>
          <MetricCard
            title="CLS"
            value={metrics.cls || 0}
            unit=""
            budget={0.1}
            warning={0.05}
            icon={<Assessment />}
            description="Cumulative Layout Shift - measures visual stability"
          />
        </Grid>
      </Grid>

      {/* Additional Metrics */}
      <Typography variant="h6" gutterBottom>
        Additional Metrics
      </Typography>
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="FCP"
            value={metrics.fcp || 0}
            unit="ms"
            budget={1800}
            warning={1500}
            icon={<Speed />}
            description="First Contentful Paint"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="TTFB"
            value={metrics.ttfb || 0}
            unit="ms"
            budget={800}
            warning={600}
            icon={<NetworkCheck />}
            description="Time to First Byte"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Page Load"
            value={metrics.pageLoadTime || 0}
            unit="ms"
            budget={3000}
            warning={2500}
            icon={<Timeline />}
            description="Total page load time"
          />
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <MetricCard
            title="Memory"
            value={metrics.memoryUsage ? (metrics.memoryUsage.used / 1024 / 1024) : 0}
            unit="MB"
            icon={<Memory />}
            description="JavaScript heap memory usage"
          />
        </Grid>
      </Grid>

      {/* Budget Status and Alerts */}
      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <BudgetStatus budgets={budgets} />
        </Grid>
        
        <Grid item xs={12} md={4}>
          <AlertsPanel alerts={alerts} onClearAlerts={handleClearAlerts} />
        </Grid>
      </Grid>

      {/* Performance Report Dialog */}
      <Dialog
        open={reportDialogOpen}
        onClose={() => setReportDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Performance Report</DialogTitle>
        <DialogContent>
          {performanceReport && (
            <Box>
              <Box sx={{ mb: 3 }}>
                <Typography variant="h6" gutterBottom>
                  Performance Score: {performanceReport.score}/100
                </Typography>
                <LinearProgress
                  variant="determinate"
                  value={performanceReport.score}
                  sx={{ height: 8, borderRadius: 4 }}
                />
              </Box>

              <Typography variant="h6" gutterBottom>
                Recommendations
              </Typography>
              {performanceReport.recommendations.length > 0 ? (
                <Box component="ul" sx={{ pl: 2 }}>
                  {performanceReport.recommendations.map((rec: string, index: number) => (
                    <Typography component="li" key={index} variant="body2" sx={{ mb: 1 }}>
                      {rec}
                    </Typography>
                  ))}
                </Box>
              ) : (
                <Typography variant="body2" color="text.secondary">
                  No recommendations at this time. Performance is within acceptable limits.
                </Typography>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setReportDialogOpen(false)}>Close</Button>
          <Button
            onClick={() => {
              const data = JSON.stringify(performanceReport, null, 2);
              const blob = new Blob([data], { type: 'application/json' });
              const url = URL.createObjectURL(blob);
              const a = document.createElement('a');
              a.href = url;
              a.download = `performance-report-${new Date().toISOString()}.json`;
              document.body.appendChild(a);
              a.click();
              document.body.removeChild(a);
              URL.revokeObjectURL(url);
            }}
            variant="contained"
          >
            Export Report
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};