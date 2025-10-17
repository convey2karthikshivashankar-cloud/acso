import React from 'react';
import {
  Box,
  Card,
  CardContent,
  CardHeader,
  Typography,
  Button,
  TextField,
  Grid,
  LinearProgress,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Tooltip,
  Alert,
  AlertTitle,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Add,
  Edit,
  Delete,
  Warning,
  CheckCircle,
  TrendingUp,
  TrendingDown,
  Assessment,
  Notifications,
  Download,
  Upload,
  Refresh,
  Timeline,
} from '@mui/icons-material';
import { TimeSeriesChart } from '../charts/TimeSeriesChart';
import { PieChart } from '../charts/PieChart';

export interface Budget {
  id: string;
  name: string;
  description: string;
  category: string;
  department: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  period: {
    start: Date;
    end: Date;
    type: 'monthly' | 'quarterly' | 'annual';
  };
  amount: number;
  currency: string;
  spent: number;
  committed: number;
  forecast: number;
  status: 'active' | 'exceeded' | 'warning' | 'completed';
  alerts: {
    threshold: number; // percentage
    enabled: boolean;
    recipients: string[];
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface BudgetAlert {
  id: string;
  budgetId: string;
  type: 'threshold' | 'exceeded' | 'forecast_exceeded';
  severity: 'info' | 'warning' | 'error';
  message: string;
  timestamp: Date;
  acknowledged: boolean;
}

export interface BudgetForecast {
  budgetId: string;
  projectedSpend: number;
  confidence: number;
  factors: {
    historical: number;
    seasonal: number;
    trending: number;
  };
  recommendations: string[];
}

interface BudgetTrackerProps {
  budgets: Budget[];
  alerts: BudgetAlert[];
  forecasts: BudgetForecast[];
  onCreateBudget?: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateBudget?: (budgetId: string, budget: Partial<Budget>) => void;
  onDeleteBudget?: (budgetId: string) => void;
  onAcknowledgeAlert?: (alertId: string) => void;
  onExportData?: (format: 'csv' | 'excel' | 'pdf') => void;
}

interface BudgetCardProps {
  budget: Budget;
  forecast?: BudgetForecast;
  onEdit?: (budget: Budget) => void;
  onDelete?: (budgetId: string) => void;
}

interface BudgetFormProps {
  budget?: Budget;
  open: boolean;
  onClose: () => void;
  onSave: (budget: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => void;
}

interface AlertsPanelProps {
  alerts: BudgetAlert[];
  onAcknowledge?: (alertId: string) => void;
}

const BudgetCard: React.FC<BudgetCardProps> = ({ budget, forecast, onEdit, onDelete }) => {
  const theme = useTheme();

  const utilizationPercentage = budget.amount > 0 ? (budget.spent / budget.amount) * 100 : 0;
  const commitmentPercentage = budget.amount > 0 ? (budget.committed / budget.amount) * 100 : 0;
  const forecastPercentage = budget.amount > 0 && forecast ? (forecast.projectedSpend / budget.amount) * 100 : 0;

  const getStatusColor = (status: Budget['status']) => {
    switch (status) {
      case 'active':
        return theme.palette.success.main;
      case 'warning':
        return theme.palette.warning.main;
      case 'exceeded':
        return theme.palette.error.main;
      case 'completed':
        return theme.palette.info.main;
      default:
        return theme.palette.grey[500];
    }
  };

  const getUtilizationColor = (percentage: number) => {
    if (percentage > 100) return theme.palette.error.main;
    if (percentage > 80) return theme.palette.warning.main;
    return theme.palette.success.main;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: budget.currency || 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  const remaining = budget.amount - budget.spent;
  const daysRemaining = Math.ceil((budget.period.end.getTime() - Date.now()) / (1000 * 60 * 60 * 24));

  return (
    <Card
      sx={{
        borderLeft: `4px solid ${getStatusColor(budget.status)}`,
        '&:hover': {
          boxShadow: theme.shadows[4],
        },
      }}
    >
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
            <Typography variant="h6">{budget.name}</Typography>
            <Box sx={{ display: 'flex', gap: 1 }}>
              <Chip
                label={budget.status.toUpperCase()}
                size="small"
                sx={{
                  backgroundColor: alpha(getStatusColor(budget.status), 0.1),
                  color: getStatusColor(budget.status),
                }}
              />
              {onEdit && (
                <IconButton size="small" onClick={() => onEdit(budget)}>
                  <Edit />
                </IconButton>
              )}
              {onDelete && (
                <IconButton size="small" onClick={() => onDelete(budget.id)}>
                  <Delete />
                </IconButton>
              )}
            </Box>
          </Box>
        }
        subheader={
          <Box>
            <Typography variant="body2" color="text.secondary">
              {budget.category} • {budget.department}
            </Typography>
            <Typography variant="caption" color="text.secondary">
              {budget.period.start.toLocaleDateString()} - {budget.period.end.toLocaleDateString()}
            </Typography>
          </Box>
        }
      />
      
      <CardContent>
        {/* Budget Overview */}
        <Grid container spacing={2} sx={{ mb: 3 }}>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Total Budget
            </Typography>
            <Typography variant="h5" fontWeight="bold">
              {formatCurrency(budget.amount)}
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="body2" color="text.secondary">
              Remaining
            </Typography>
            <Typography
              variant="h5"
              fontWeight="bold"
              sx={{ color: remaining < 0 ? theme.palette.error.main : theme.palette.success.main }}
            >
              {formatCurrency(remaining)}
            </Typography>
          </Grid>
        </Grid>

        {/* Utilization Progress */}
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
            <Typography variant="body2">Spent</Typography>
            <Typography variant="body2" fontWeight="bold">
              {formatCurrency(budget.spent)} ({utilizationPercentage.toFixed(1)}%)
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={Math.min(utilizationPercentage, 100)}
            sx={{
              height: 8,
              borderRadius: 4,
              '& .MuiLinearProgress-bar': {
                backgroundColor: getUtilizationColor(utilizationPercentage),
              },
            }}
          />
        </Box>

        {/* Committed Amount */}
        {budget.committed > 0 && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Committed</Typography>
              <Typography variant="body2">
                {formatCurrency(budget.committed)} ({commitmentPercentage.toFixed(1)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(commitmentPercentage, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.info.main, 0.2),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: theme.palette.info.main,
                },
              }}
            />
          </Box>
        )}

        {/* Forecast */}
        {forecast && (
          <Box sx={{ mb: 2 }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
              <Typography variant="body2">Forecast</Typography>
              <Typography variant="body2">
                {formatCurrency(forecast.projectedSpend)} ({forecastPercentage.toFixed(1)}%)
              </Typography>
            </Box>
            <LinearProgress
              variant="determinate"
              value={Math.min(forecastPercentage, 100)}
              sx={{
                height: 6,
                borderRadius: 3,
                backgroundColor: alpha(theme.palette.warning.main, 0.2),
                '& .MuiLinearProgress-bar': {
                  backgroundColor: theme.palette.warning.main,
                },
              }}
            />
            <Typography variant="caption" color="text.secondary">
              Confidence: {(forecast.confidence * 100).toFixed(0)}%
            </Typography>
          </Box>
        )}

        {/* Key Metrics */}
        <Grid container spacing={2}>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Days Remaining
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {daysRemaining > 0 ? daysRemaining : 0} days
            </Typography>
          </Grid>
          <Grid item xs={6}>
            <Typography variant="caption" color="text.secondary">
              Owner
            </Typography>
            <Typography variant="body2" fontWeight="bold">
              {budget.owner.name}
            </Typography>
          </Grid>
        </Grid>

        {/* Alerts */}
        {utilizationPercentage > budget.alerts.threshold && (
          <Alert severity="warning" sx={{ mt: 2 }}>
            <AlertTitle>Budget Alert</AlertTitle>
            Budget utilization has exceeded {budget.alerts.threshold}% threshold
          </Alert>
        )}

        {forecast && forecastPercentage > 100 && (
          <Alert severity="error" sx={{ mt: 2 }}>
            <AlertTitle>Forecast Warning</AlertTitle>
            Projected spend will exceed budget by {formatCurrency(forecast.projectedSpend - budget.amount)}
          </Alert>
        )}
      </CardContent>
    </Card>
  );
};

const BudgetForm: React.FC<BudgetFormProps> = ({ budget, open, onClose, onSave }) => {
  const [formData, setFormData] = React.useState({
    name: budget?.name || '',
    description: budget?.description || '',
    category: budget?.category || '',
    department: budget?.department || '',
    amount: budget?.amount || 0,
    currency: budget?.currency || 'USD',
    periodType: budget?.period.type || 'monthly' as const,
    periodStart: budget?.period.start ? budget.period.start.toISOString().split('T')[0] : '',
    periodEnd: budget?.period.end ? budget.period.end.toISOString().split('T')[0] : '',
    alertThreshold: budget?.alerts.threshold || 80,
    alertEnabled: budget?.alerts.enabled || true,
    ownerName: budget?.owner.name || '',
    ownerEmail: budget?.owner.email || '',
  });

  const handleSubmit = () => {
    if (formData.name && formData.amount > 0 && formData.periodStart && formData.periodEnd) {
      onSave({
        name: formData.name,
        description: formData.description,
        category: formData.category,
        department: formData.department,
        owner: {
          id: budget?.owner.id || 'current-user',
          name: formData.ownerName,
          email: formData.ownerEmail,
        },
        period: {
          start: new Date(formData.periodStart),
          end: new Date(formData.periodEnd),
          type: formData.periodType,
        },
        amount: formData.amount,
        currency: formData.currency,
        spent: budget?.spent || 0,
        committed: budget?.committed || 0,
        forecast: budget?.forecast || 0,
        status: budget?.status || 'active',
        alerts: {
          threshold: formData.alertThreshold,
          enabled: formData.alertEnabled,
          recipients: budget?.alerts.recipients || [],
        },
      });
      onClose();
    }
  };

  return (
    <Dialog open={open} onClose={onClose} maxWidth="md" fullWidth>
      <DialogTitle>{budget ? 'Edit Budget' : 'Create Budget'}</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 1 }}>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Budget Name"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Category"
              value={formData.category}
              onChange={(e) => setFormData({ ...formData, category: e.target.value })}
            />
          </Grid>
          <Grid item xs={12}>
            <TextField
              fullWidth
              label="Description"
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              multiline
              rows={2}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Department"
              value={formData.department}
              onChange={(e) => setFormData({ ...formData, department: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="number"
              label="Budget Amount"
              value={formData.amount}
              onChange={(e) => setFormData({ ...formData, amount: parseFloat(e.target.value) || 0 })}
              required
            />
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Currency</InputLabel>
              <Select
                value={formData.currency}
                onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              >
                <MenuItem value="USD">USD</MenuItem>
                <MenuItem value="EUR">EUR</MenuItem>
                <MenuItem value="GBP">GBP</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <FormControl fullWidth>
              <InputLabel>Period Type</InputLabel>
              <Select
                value={formData.periodType}
                onChange={(e) => setFormData({ ...formData, periodType: e.target.value as any })}
              >
                <MenuItem value="monthly">Monthly</MenuItem>
                <MenuItem value="quarterly">Quarterly</MenuItem>
                <MenuItem value="annual">Annual</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={4}>
            <TextField
              fullWidth
              type="number"
              label="Alert Threshold (%)"
              value={formData.alertThreshold}
              onChange={(e) => setFormData({ ...formData, alertThreshold: parseFloat(e.target.value) || 80 })}
              inputProps={{ min: 0, max: 100 }}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Period Start"
              value={formData.periodStart}
              onChange={(e) => setFormData({ ...formData, periodStart: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              type="date"
              label="Period End"
              value={formData.periodEnd}
              onChange={(e) => setFormData({ ...formData, periodEnd: e.target.value })}
              InputLabelProps={{ shrink: true }}
              required
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Owner Name"
              value={formData.ownerName}
              onChange={(e) => setFormData({ ...formData, ownerName: e.target.value })}
            />
          </Grid>
          <Grid item xs={12} sm={6}>
            <TextField
              fullWidth
              label="Owner Email"
              type="email"
              value={formData.ownerEmail}
              onChange={(e) => setFormData({ ...formData, ownerEmail: e.target.value })}
            />
          </Grid>
        </Grid>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Cancel</Button>
        <Button
          onClick={handleSubmit}
          variant="contained"
          disabled={!formData.name || formData.amount <= 0 || !formData.periodStart || !formData.periodEnd}
        >
          {budget ? 'Update' : 'Create'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

const AlertsPanel: React.FC<AlertsPanelProps> = ({ alerts, onAcknowledge }) => {
  const getSeverityIcon = (severity: BudgetAlert['severity']) => {
    switch (severity) {
      case 'error':
        return <Warning color="error" />;
      case 'warning':
        return <Warning color="warning" />;
      default:
        return <CheckCircle color="info" />;
    }
  };

  const unacknowledgedAlerts = alerts.filter(alert => !alert.acknowledged);

  return (
    <Card>
      <CardHeader
        title={
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Notifications />
            <Typography variant="h6">Budget Alerts</Typography>
            {unacknowledgedAlerts.length > 0 && (
              <Chip
                label={unacknowledgedAlerts.length}
                color="error"
                size="small"
              />
            )}
          </Box>
        }
      />
      <CardContent>
        {alerts.length === 0 ? (
          <Typography variant="body2" color="text.secondary">
            No alerts at this time
          </Typography>
        ) : (
          <Box>
            {alerts.map((alert) => (
              <Alert
                key={alert.id}
                severity={alert.severity}
                sx={{ mb: 1 }}
                action={
                  !alert.acknowledged && onAcknowledge && (
                    <Button
                      size="small"
                      onClick={() => onAcknowledge(alert.id)}
                    >
                      Acknowledge
                    </Button>
                  )
                }
              >
                <Box>
                  <Typography variant="body2">{alert.message}</Typography>
                  <Typography variant="caption" color="text.secondary">
                    {alert.timestamp.toLocaleString()}
                  </Typography>
                </Box>
              </Alert>
            ))}
          </Box>
        )}
      </CardContent>
    </Card>
  );
};

export const BudgetTracker: React.FC<BudgetTrackerProps> = ({
  budgets,
  alerts,
  forecasts,
  onCreateBudget,
  onUpdateBudget,
  onDeleteBudget,
  onAcknowledgeAlert,
  onExportData,
}) => {
  const [formOpen, setFormOpen] = React.useState(false);
  const [editingBudget, setEditingBudget] = React.useState<Budget | undefined>();
  const [filterCategory, setFilterCategory] = React.useState<string>('all');
  const [filterStatus, setFilterStatus] = React.useState<string>('all');

  const handleCreateBudget = (budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
    onCreateBudget?.(budgetData);
    setFormOpen(false);
  };

  const handleEditBudget = (budget: Budget) => {
    setEditingBudget(budget);
    setFormOpen(true);
  };

  const handleUpdateBudget = (budgetData: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>) => {
    if (editingBudget) {
      onUpdateBudget?.(editingBudget.id, budgetData);
    }
    setEditingBudget(undefined);
    setFormOpen(false);
  };

  const handleCloseForm = () => {
    setEditingBudget(undefined);
    setFormOpen(false);
  };

  // Filter budgets
  const filteredBudgets = React.useMemo(() => {
    return budgets.filter(budget => {
      const categoryMatch = filterCategory === 'all' || budget.category === filterCategory;
      const statusMatch = filterStatus === 'all' || budget.status === filterStatus;
      return categoryMatch && statusMatch;
    });
  }, [budgets, filterCategory, filterStatus]);

  // Calculate summary metrics
  const summaryMetrics = React.useMemo(() => {
    const totalBudget = budgets.reduce((sum, budget) => sum + budget.amount, 0);
    const totalSpent = budgets.reduce((sum, budget) => sum + budget.spent, 0);
    const totalCommitted = budgets.reduce((sum, budget) => sum + budget.committed, 0);
    const utilizationRate = totalBudget > 0 ? (totalSpent / totalBudget) * 100 : 0;

    return {
      totalBudget,
      totalSpent,
      totalCommitted,
      utilizationRate,
      budgetsAtRisk: budgets.filter(b => b.status === 'warning' || b.status === 'exceeded').length,
    };
  }, [budgets]);

  // Get unique categories and statuses for filters
  const categories = React.useMemo(() => {
    return [...new Set(budgets.map(budget => budget.category))];
  }, [budgets]);

  const statuses = React.useMemo(() => {
    return [...new Set(budgets.map(budget => budget.status))];
  }, [budgets]);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">Budget Tracker</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <Button startIcon={<Refresh />} variant="outlined">
            Refresh
          </Button>
          <Button startIcon={<Download />} variant="outlined">
            Export
          </Button>
          <Button
            startIcon={<Add />}
            variant="contained"
            onClick={() => setFormOpen(true)}
          >
            Create Budget
          </Button>
        </Box>
      </Box>

      {/* Summary Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="primary" fontWeight="bold">
                {formatCurrency(summaryMetrics.totalBudget)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Budget
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="success.main" fontWeight="bold">
                {formatCurrency(summaryMetrics.totalSpent)}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Total Spent
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="warning.main" fontWeight="bold">
                {summaryMetrics.utilizationRate.toFixed(1)}%
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Utilization Rate
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h4" color="error.main" fontWeight="bold">
                {summaryMetrics.budgetsAtRisk}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                Budgets at Risk
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Filters and Alerts */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} md={8}>
          <Box sx={{ display: 'flex', gap: 2, alignItems: 'center' }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Category</InputLabel>
              <Select
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <MenuItem value="all">All Categories</MenuItem>
                {categories.map(category => (
                  <MenuItem key={category} value={category}>
                    {category}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Status</InputLabel>
              <Select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <MenuItem value="all">All Statuses</MenuItem>
                {statuses.map(status => (
                  <MenuItem key={status} value={status}>
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            <Typography variant="body2" color="text.secondary">
              Showing {filteredBudgets.length} of {budgets.length} budgets
            </Typography>
          </Box>
        </Grid>
        
        <Grid item xs={12} md={4}>
          <AlertsPanel
            alerts={alerts}
            onAcknowledge={onAcknowledgeAlert}
          />
        </Grid>
      </Grid>

      {/* Budget Cards */}
      <Grid container spacing={3}>
        {filteredBudgets.map((budget) => {
          const forecast = forecasts.find(f => f.budgetId === budget.id);
          return (
            <Grid item xs={12} md={6} lg={4} key={budget.id}>
              <BudgetCard
                budget={budget}
                forecast={forecast}
                onEdit={handleEditBudget}
                onDelete={onDeleteBudget}
              />
            </Grid>
          );
        })}
      </Grid>

      {filteredBudgets.length === 0 && (
        <Box sx={{ textAlign: 'center', py: 4 }}>
          <Typography variant="body1" color="text.secondary">
            No budgets found matching the current filters
          </Typography>
          <Button
            variant="outlined"
            startIcon={<Add />}
            sx={{ mt: 2 }}
            onClick={() => setFormOpen(true)}
          >
            Create Your First Budget
          </Button>
        </Box>
      )}

      {/* Budget Form Dialog */}
      <BudgetForm
        budget={editingBudget}
        open={formOpen}
        onClose={handleCloseForm}
        onSave={editingBudget ? handleUpdateBudget : handleCreateBudget}
      />
    </Box>
  );
};