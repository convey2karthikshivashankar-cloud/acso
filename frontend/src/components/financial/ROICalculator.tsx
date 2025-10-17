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
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Chip,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  Tooltip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  useTheme,
  alpha,
} from '@mui/material';
import {
  Calculate,
  TrendingUp,
  Assessment,
  Save,
  Share,
  Download,
  Info,
  ExpandMore,
  PlayArrow,
  Refresh,
  CompareArrows,
} from '@mui/icons-material';
import { TimeSeriesChart } from '../charts/TimeSeriesChart';
import { BarChart } from '../charts/BarChart';

export interface ROIScenario {
  id: string;
  name: string;
  description: string;
  parameters: {
    initialInvestment: number;
    implementationCost: number;
    annualOperatingCost: number;
    annualSavings: number;
    revenueIncrease: number;
    timeHorizon: number; // in years
    discountRate: number; // percentage
    riskFactor: number; // percentage
  };
  results?: {
    roi: number;
    npv: number;
    paybackPeriod: number;
    irr: number;
    totalBenefit: number;
    totalCost: number;
  };
  createdAt: Date;
  updatedAt: Date;
}

export interface SensitivityAnalysis {
  parameter: string;
  baseValue: number;
  variations: {
    change: number; // percentage change
    roi: number;
    npv: number;
  }[];
}

interface ROICalculatorProps {
  scenarios: ROIScenario[];
  onSaveScenario?: (scenario: Omit<ROIScenario, 'id' | 'createdAt' | 'updatedAt'>) => void;
  onUpdateScenario?: (scenarioId: string, scenario: Partial<ROIScenario>) => void;
  onDeleteScenario?: (scenarioId: string) => void;
  onExportResults?: (scenarioId: string, format: 'pdf' | 'excel') => void;
}

interface ScenarioBuilderProps {
  scenario: ROIScenario;
  onParameterChange: (parameter: string, value: number) => void;
  onCalculate: () => void;
  calculating: boolean;
}

interface ResultsDisplayProps {
  scenario: ROIScenario;
  onExport?: (format: 'pdf' | 'excel') => void;
}

interface SensitivityAnalysisProps {
  scenario: ROIScenario;
  analysis: SensitivityAnalysis[];
}

interface ScenarioComparisonProps {
  scenarios: ROIScenario[];
  selectedScenarios: string[];
  onSelectionChange: (scenarioIds: string[]) => void;
}

const ScenarioBuilder: React.FC<ScenarioBuilderProps> = ({
  scenario,
  onParameterChange,
  onCalculate,
  calculating,
}) => {
  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const parameters = [
    {
      key: 'initialInvestment',
      label: 'Initial Investment',
      value: scenario.parameters.initialInvestment,
      min: 0,
      max: 10000000,
      step: 10000,
      format: formatCurrency,
      description: 'Upfront capital investment required',
    },
    {
      key: 'implementationCost',
      label: 'Implementation Cost',
      value: scenario.parameters.implementationCost,
      min: 0,
      max: 5000000,
      step: 5000,
      format: formatCurrency,
      description: 'One-time cost for implementation and setup',
    },
    {
      key: 'annualOperatingCost',
      label: 'Annual Operating Cost',
      value: scenario.parameters.annualOperatingCost,
      min: 0,
      max: 2000000,
      step: 5000,
      format: formatCurrency,
      description: 'Recurring annual costs for operation and maintenance',
    },
    {
      key: 'annualSavings',
      label: 'Annual Cost Savings',
      value: scenario.parameters.annualSavings,
      min: 0,
      max: 5000000,
      step: 10000,
      format: formatCurrency,
      description: 'Expected annual cost reductions',
    },
    {
      key: 'revenueIncrease',
      label: 'Annual Revenue Increase',
      value: scenario.parameters.revenueIncrease,
      min: 0,
      max: 10000000,
      step: 10000,
      format: formatCurrency,
      description: 'Expected annual revenue growth',
    },
    {
      key: 'timeHorizon',
      label: 'Time Horizon (Years)',
      value: scenario.parameters.timeHorizon,
      min: 1,
      max: 10,
      step: 1,
      format: (value: number) => `${value} years`,
      description: 'Analysis period in years',
    },
    {
      key: 'discountRate',
      label: 'Discount Rate (%)',
      value: scenario.parameters.discountRate,
      min: 0,
      max: 20,
      step: 0.5,
      format: (value: number) => `${value}%`,
      description: 'Cost of capital or required rate of return',
    },
    {
      key: 'riskFactor',
      label: 'Risk Factor (%)',
      value: scenario.parameters.riskFactor,
      min: 0,
      max: 50,
      step: 1,
      format: (value: number) => `${value}%`,
      description: 'Risk adjustment factor for uncertainty',
    },
  ];

  return (
    <Card>
      <CardHeader
        title="Scenario Parameters"
        action={
          <Button
            variant="contained"
            startIcon={<Calculate />}
            onClick={onCalculate}
            disabled={calculating}
          >
            {calculating ? 'Calculating...' : 'Calculate ROI'}
          </Button>
        }
      />
      <CardContent>
        <Grid container spacing={3}>
          {parameters.map((param) => (
            <Grid item xs={12} md={6} key={param.key}>
              <Box sx={{ mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <Typography variant="subtitle2">{param.label}</Typography>
                  <Tooltip title={param.description}>
                    <IconButton size="small">
                      <Info fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Box>
                
                <TextField
                  fullWidth
                  type="number"
                  value={param.value}
                  onChange={(e) => onParameterChange(param.key, parseFloat(e.target.value) || 0)}
                  inputProps={{
                    min: param.min,
                    max: param.max,
                    step: param.step,
                  }}
                  size="small"
                />
                
                <Box sx={{ mt: 1, px: 1 }}>
                  <Slider
                    value={param.value}
                    onChange={(_, value) => onParameterChange(param.key, value as number)}
                    min={param.min}
                    max={param.max}
                    step={param.step}
                    valueLabelDisplay="auto"
                    valueLabelFormat={param.format}
                  />
                </Box>
                
                <Typography variant="caption" color="text.secondary">
                  Current: {param.format(param.value)}
                </Typography>
              </Box>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

const ResultsDisplay: React.FC<ResultsDisplayProps> = ({ scenario, onExport }) => {
  const theme = useTheme();

  if (!scenario.results) {
    return (
      <Card>
        <CardContent>
          <Box sx={{ textAlign: 'center', py: 4 }}>
            <Typography variant="body1" color="text.secondary">
              Click "Calculate ROI" to see results
            </Typography>
          </Box>
        </CardContent>
      </Card>
    );
  }

  const { results, parameters } = scenario;

  const formatCurrency = (value: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(value);
  };

  const formatPercentage = (value: number) => {
    return `${value.toFixed(1)}%`;
  };

  const getROIColor = (roi: number) => {
    if (roi > 20) return theme.palette.success.main;
    if (roi > 10) return theme.palette.warning.main;
    return theme.palette.error.main;
  };

  // Generate cash flow projection
  const cashFlowData = [];
  for (let year = 0; year <= parameters.timeHorizon; year++) {
    const initialCost = year === 0 ? -(parameters.initialInvestment + parameters.implementationCost) : 0;
    const annualBenefit = year > 0 ? (parameters.annualSavings + parameters.revenueIncrease - parameters.annualOperatingCost) : 0;
    const cumulativeCashFlow = year === 0 ? initialCost : 
      (cashFlowData[year - 1]?.cumulative || 0) + annualBenefit;

    cashFlowData.push({
      year,
      annual: year === 0 ? initialCost : annualBenefit,
      cumulative: cumulativeCashFlow,
    });
  }

  const chartSeries = [
    {
      name: 'Annual Cash Flow',
      data: cashFlowData.map(d => ({ x: `Year ${d.year}`, y: d.annual })),
      color: theme.palette.primary.main,
    },
    {
      name: 'Cumulative Cash Flow',
      data: cashFlowData.map(d => ({ x: `Year ${d.year}`, y: d.cumulative })),
      color: theme.palette.secondary.main,
    },
  ];

  const keyMetrics = [
    {
      label: 'ROI',
      value: formatPercentage(results.roi),
      color: getROIColor(results.roi),
      description: 'Return on Investment',
    },
    {
      label: 'NPV',
      value: formatCurrency(results.npv),
      color: results.npv > 0 ? theme.palette.success.main : theme.palette.error.main,
      description: 'Net Present Value',
    },
    {
      label: 'Payback Period',
      value: `${results.paybackPeriod.toFixed(1)} years`,
      color: results.paybackPeriod < 3 ? theme.palette.success.main : theme.palette.warning.main,
      description: 'Time to recover initial investment',
    },
    {
      label: 'IRR',
      value: formatPercentage(results.irr),
      color: results.irr > parameters.discountRate ? theme.palette.success.main : theme.palette.error.main,
      description: 'Internal Rate of Return',
    },
  ];

  return (
    <Box>
      {/* Key Metrics */}
      <Card sx={{ mb: 3 }}>
        <CardHeader
          title="ROI Analysis Results"
          action={
            onExport && (
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button startIcon={<Download />} onClick={() => onExport('pdf')}>
                  PDF
                </Button>
                <Button startIcon={<Download />} onClick={() => onExport('excel')}>
                  Excel
                </Button>
              </Box>
            )
          }
        />
        <CardContent>
          <Grid container spacing={3}>
            {keyMetrics.map((metric, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Paper
                  sx={{
                    p: 2,
                    textAlign: 'center',
                    borderLeft: `4px solid ${metric.color}`,
                  }}
                >
                  <Typography variant="h4" sx={{ color: metric.color, fontWeight: 'bold' }}>
                    {metric.value}
                  </Typography>
                  <Typography variant="body2" color="text.secondary">
                    {metric.label}
                  </Typography>
                  <Tooltip title={metric.description}>
                    <IconButton size="small">
                      <Info fontSize="small" />
                    </IconButton>
                  </Tooltip>
                </Paper>
              </Grid>
            ))}
          </Grid>
        </CardContent>
      </Card>

      {/* Cash Flow Chart */}
      <Card sx={{ mb: 3 }}>
        <CardHeader title="Cash Flow Projection" />
        <CardContent>
          <BarChart
            data={chartSeries[0].data}
            height={300}
            showLegend
            showTooltip
            yAxisLabel="Cash Flow ($)"
          />
        </CardContent>
      </Card>

      {/* Detailed Breakdown */}
      <Card>
        <CardHeader title="Financial Breakdown" />
        <CardContent>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Category</TableCell>
                  <TableCell align="right">Amount</TableCell>
                  <TableCell>Description</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                <TableRow>
                  <TableCell><strong>Total Investment</strong></TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(results.totalCost)}</strong>
                  </TableCell>
                  <TableCell>Initial investment + implementation costs</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell><strong>Total Benefits</strong></TableCell>
                  <TableCell align="right">
                    <strong>{formatCurrency(results.totalBenefit)}</strong>
                  </TableCell>
                  <TableCell>Cumulative savings + revenue over {parameters.timeHorizon} years</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Initial Investment</TableCell>
                  <TableCell align="right">{formatCurrency(parameters.initialInvestment)}</TableCell>
                  <TableCell>Upfront capital investment</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Implementation Cost</TableCell>
                  <TableCell align="right">{formatCurrency(parameters.implementationCost)}</TableCell>
                  <TableCell>One-time setup and implementation</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Annual Operating Cost</TableCell>
                  <TableCell align="right">{formatCurrency(parameters.annualOperatingCost)}</TableCell>
                  <TableCell>Recurring operational expenses</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Annual Savings</TableCell>
                  <TableCell align="right">{formatCurrency(parameters.annualSavings)}</TableCell>
                  <TableCell>Expected annual cost reductions</TableCell>
                </TableRow>
                <TableRow>
                  <TableCell>Annual Revenue Increase</TableCell>
                  <TableCell align="right">{formatCurrency(parameters.revenueIncrease)}</TableCell>
                  <TableCell>Expected annual revenue growth</TableCell>
                </TableRow>
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>
    </Box>
  );
};

const SensitivityAnalysis: React.FC<SensitivityAnalysisProps> = ({ scenario, analysis }) => {
  const theme = useTheme();

  if (!scenario.results) {
    return null;
  }

  const chartData = analysis.map(item => ({
    parameter: item.parameter,
    data: item.variations.map(v => ({
      x: `${v.change > 0 ? '+' : ''}${v.change}%`,
      y: v.roi,
    })),
  }));

  return (
    <Card>
      <CardHeader title="Sensitivity Analysis" />
      <CardContent>
        <Typography variant="body2" color="text.secondary" gutterBottom>
          Impact of parameter changes on ROI
        </Typography>
        
        <Grid container spacing={3}>
          {analysis.map((item, index) => (
            <Grid item xs={12} md={6} key={index}>
              <Paper sx={{ p: 2 }}>
                <Typography variant="h6" gutterBottom>
                  {item.parameter}
                </Typography>
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  Base value: {item.parameter.includes('Rate') || item.parameter.includes('Factor') ? 
                    `${item.baseValue}%` : 
                    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD' }).format(item.baseValue)
                  }
                </Typography>
                
                <TableContainer>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell>Change</TableCell>
                        <TableCell align="right">ROI</TableCell>
                        <TableCell align="right">NPV</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {item.variations.map((variation, vIndex) => (
                        <TableRow key={vIndex}>
                          <TableCell>
                            <Chip
                              label={`${variation.change > 0 ? '+' : ''}${variation.change}%`}
                              size="small"
                              color={variation.change > 0 ? 'success' : variation.change < 0 ? 'error' : 'default'}
                            />
                          </TableCell>
                          <TableCell align="right">
                            {variation.roi.toFixed(1)}%
                          </TableCell>
                          <TableCell align="right">
                            {new Intl.NumberFormat('en-US', { 
                              style: 'currency', 
                              currency: 'USD',
                              minimumFractionDigits: 0,
                              maximumFractionDigits: 0,
                            }).format(variation.npv)}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              </Paper>
            </Grid>
          ))}
        </Grid>
      </CardContent>
    </Card>
  );
};

const ScenarioComparison: React.FC<ScenarioComparisonProps> = ({
  scenarios,
  selectedScenarios,
  onSelectionChange,
}) => {
  const selectedScenarioData = scenarios.filter(s => selectedScenarios.includes(s.id) && s.results);

  const comparisonData = selectedScenarioData.map(scenario => ({
    name: scenario.name,
    roi: scenario.results!.roi,
    npv: scenario.results!.npv,
    payback: scenario.results!.paybackPeriod,
    irr: scenario.results!.irr,
  }));

  return (
    <Card>
      <CardHeader title="Scenario Comparison" />
      <CardContent>
        <Box sx={{ mb: 3 }}>
          <Typography variant="body2" color="text.secondary" gutterBottom>
            Select scenarios to compare:
          </Typography>
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {scenarios.filter(s => s.results).map(scenario => (
              <Chip
                key={scenario.id}
                label={scenario.name}
                clickable
                color={selectedScenarios.includes(scenario.id) ? 'primary' : 'default'}
                onClick={() => {
                  const newSelection = selectedScenarios.includes(scenario.id)
                    ? selectedScenarios.filter(id => id !== scenario.id)
                    : [...selectedScenarios, scenario.id];
                  onSelectionChange(newSelection);
                }}
              />
            ))}
          </Box>
        </Box>

        {selectedScenarioData.length > 0 && (
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell>Scenario</TableCell>
                  <TableCell align="right">ROI</TableCell>
                  <TableCell align="right">NPV</TableCell>
                  <TableCell align="right">Payback Period</TableCell>
                  <TableCell align="right">IRR</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {selectedScenarioData.map(scenario => (
                  <TableRow key={scenario.id}>
                    <TableCell>{scenario.name}</TableCell>
                    <TableCell align="right">{scenario.results!.roi.toFixed(1)}%</TableCell>
                    <TableCell align="right">
                      {new Intl.NumberFormat('en-US', { 
                        style: 'currency', 
                        currency: 'USD',
                        minimumFractionDigits: 0,
                        maximumFractionDigits: 0,
                      }).format(scenario.results!.npv)}
                    </TableCell>
                    <TableCell align="right">{scenario.results!.paybackPeriod.toFixed(1)} years</TableCell>
                    <TableCell align="right">{scenario.results!.irr.toFixed(1)}%</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        )}
      </CardContent>
    </Card>
  );
};

export const ROICalculator: React.FC<ROICalculatorProps> = ({
  scenarios,
  onSaveScenario,
  onUpdateScenario,
  onDeleteScenario,
  onExportResults,
}) => {
  const [currentScenario, setCurrentScenario] = React.useState<ROIScenario>(() => {
    if (scenarios.length > 0) {
      return scenarios[0];
    }
    
    return {
      id: 'new',
      name: 'New Scenario',
      description: 'ROI analysis scenario',
      parameters: {
        initialInvestment: 500000,
        implementationCost: 100000,
        annualOperatingCost: 50000,
        annualSavings: 200000,
        revenueIncrease: 150000,
        timeHorizon: 5,
        discountRate: 8,
        riskFactor: 10,
      },
      createdAt: new Date(),
      updatedAt: new Date(),
    };
  });

  const [calculating, setCalculating] = React.useState(false);
  const [saveDialogOpen, setSaveDialogOpen] = React.useState(false);
  const [scenarioName, setScenarioName] = React.useState('');
  const [scenarioDescription, setScenarioDescription] = React.useState('');
  const [selectedComparison, setSelectedComparison] = React.useState<string[]>([]);

  const handleParameterChange = (parameter: string, value: number) => {
    setCurrentScenario(prev => ({
      ...prev,
      parameters: {
        ...prev.parameters,
        [parameter]: value,
      },
      results: undefined, // Clear results when parameters change
    }));
  };

  const calculateROI = async () => {
    setCalculating(true);
    
    // Simulate calculation delay
    await new Promise(resolve => setTimeout(resolve, 1000));
    
    const { parameters } = currentScenario;
    
    // Calculate ROI metrics
    const totalInitialCost = parameters.initialInvestment + parameters.implementationCost;
    const annualNetBenefit = parameters.annualSavings + parameters.revenueIncrease - parameters.annualOperatingCost;
    const totalBenefit = annualNetBenefit * parameters.timeHorizon;
    const totalCost = totalInitialCost + (parameters.annualOperatingCost * parameters.timeHorizon);
    
    // ROI calculation
    const roi = ((totalBenefit - totalCost) / totalCost) * 100;
    
    // NPV calculation
    let npv = -totalInitialCost;
    for (let year = 1; year <= parameters.timeHorizon; year++) {
      npv += annualNetBenefit / Math.pow(1 + parameters.discountRate / 100, year);
    }
    
    // Payback period calculation
    let cumulativeCashFlow = -totalInitialCost;
    let paybackPeriod = 0;
    for (let year = 1; year <= parameters.timeHorizon; year++) {
      cumulativeCashFlow += annualNetBenefit;
      if (cumulativeCashFlow >= 0 && paybackPeriod === 0) {
        paybackPeriod = year - 1 + (Math.abs(cumulativeCashFlow - annualNetBenefit) / annualNetBenefit);
        break;
      }
    }
    if (paybackPeriod === 0) paybackPeriod = parameters.timeHorizon;
    
    // IRR calculation (simplified approximation)
    const irr = ((Math.pow(totalBenefit / totalCost, 1 / parameters.timeHorizon) - 1) * 100);
    
    const results = {
      roi,
      npv,
      paybackPeriod,
      irr,
      totalBenefit,
      totalCost,
    };
    
    setCurrentScenario(prev => ({
      ...prev,
      results,
      updatedAt: new Date(),
    }));
    
    setCalculating(false);
  };

  const handleSaveScenario = () => {
    if (scenarioName.trim() && onSaveScenario) {
      onSaveScenario({
        name: scenarioName,
        description: scenarioDescription,
        parameters: currentScenario.parameters,
        results: currentScenario.results,
      });
      setSaveDialogOpen(false);
      setScenarioName('');
      setScenarioDescription('');
    }
  };

  // Generate sensitivity analysis
  const sensitivityAnalysis: SensitivityAnalysis[] = React.useMemo(() => {
    if (!currentScenario.results) return [];
    
    const parameters = [
      { key: 'initialInvestment', label: 'Initial Investment', baseValue: currentScenario.parameters.initialInvestment },
      { key: 'annualSavings', label: 'Annual Savings', baseValue: currentScenario.parameters.annualSavings },
      { key: 'revenueIncrease', label: 'Revenue Increase', baseValue: currentScenario.parameters.revenueIncrease },
      { key: 'discountRate', label: 'Discount Rate', baseValue: currentScenario.parameters.discountRate },
    ];
    
    return parameters.map(param => {
      const variations = [-20, -10, 0, 10, 20].map(change => {
        const newValue = param.baseValue * (1 + change / 100);
        const testScenario = {
          ...currentScenario.parameters,
          [param.key]: newValue,
        };
        
        // Simplified ROI calculation for sensitivity
        const totalInitialCost = testScenario.initialInvestment + testScenario.implementationCost;
        const annualNetBenefit = testScenario.annualSavings + testScenario.revenueIncrease - testScenario.annualOperatingCost;
        const totalBenefit = annualNetBenefit * testScenario.timeHorizon;
        const totalCost = totalInitialCost + (testScenario.annualOperatingCost * testScenario.timeHorizon);
        const roi = ((totalBenefit - totalCost) / totalCost) * 100;
        
        let npv = -totalInitialCost;
        for (let year = 1; year <= testScenario.timeHorizon; year++) {
          npv += annualNetBenefit / Math.pow(1 + testScenario.discountRate / 100, year);
        }
        
        return { change, roi, npv };
      });
      
      return {
        parameter: param.label,
        baseValue: param.baseValue,
        variations,
      };
    });
  }, [currentScenario]);

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 3 }}>
        <Typography variant="h4">ROI Calculator</Typography>
        
        <Box sx={{ display: 'flex', gap: 2 }}>
          <FormControl size="small" sx={{ minWidth: 200 }}>
            <InputLabel>Select Scenario</InputLabel>
            <Select
              value={currentScenario.id}
              onChange={(e) => {
                const scenario = scenarios.find(s => s.id === e.target.value);
                if (scenario) {
                  setCurrentScenario(scenario);
                }
              }}
            >
              <MenuItem value="new">New Scenario</MenuItem>
              {scenarios.map(scenario => (
                <MenuItem key={scenario.id} value={scenario.id}>
                  {scenario.name}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          
          <Button
            startIcon={<Save />}
            variant="outlined"
            onClick={() => setSaveDialogOpen(true)}
            disabled={!currentScenario.results}
          >
            Save Scenario
          </Button>
        </Box>
      </Box>

      {/* Scenario Builder */}
      <Box sx={{ mb: 4 }}>
        <ScenarioBuilder
          scenario={currentScenario}
          onParameterChange={handleParameterChange}
          onCalculate={calculateROI}
          calculating={calculating}
        />
      </Box>

      {/* Results Display */}
      <Box sx={{ mb: 4 }}>
        <ResultsDisplay
          scenario={currentScenario}
          onExport={(format) => onExportResults?.(currentScenario.id, format)}
        />
      </Box>

      {/* Sensitivity Analysis */}
      {currentScenario.results && (
        <Box sx={{ mb: 4 }}>
          <SensitivityAnalysis
            scenario={currentScenario}
            analysis={sensitivityAnalysis}
          />
        </Box>
      )}

      {/* Scenario Comparison */}
      {scenarios.length > 0 && (
        <Box sx={{ mb: 4 }}>
          <ScenarioComparison
            scenarios={scenarios}
            selectedScenarios={selectedComparison}
            onSelectionChange={setSelectedComparison}
          />
        </Box>
      )}

      {/* Save Scenario Dialog */}
      <Dialog open={saveDialogOpen} onClose={() => setSaveDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Save Scenario</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Scenario Name"
            value={scenarioName}
            onChange={(e) => setScenarioName(e.target.value)}
            sx={{ mb: 2, mt: 1 }}
          />
          <TextField
            fullWidth
            label="Description"
            value={scenarioDescription}
            onChange={(e) => setScenarioDescription(e.target.value)}
            multiline
            rows={3}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSaveDialogOpen(false)}>Cancel</Button>
          <Button
            onClick={handleSaveScenario}
            variant="contained"
            disabled={!scenarioName.trim()}
          >
            Save
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};