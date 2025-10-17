import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Grid,
  TextField,
  Button,
  Slider,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  ExpandMore as ExpandMoreIcon,
  Calculate as CalculateIcon,
  TrendingUp as TrendingUpIcon,
  Assessment as AssessmentIcon,
  Save as SaveIcon,
  Share as ShareIcon,
  Download as DownloadIcon,
  Info as InfoIcon,
} from '@mui/icons-material';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar, PieChart, Pie, Cell } from 'recharts';

interface ROIScenario {
  id: string;
  name: string;
  description: string;
  parameters: ROIParameters;
  results?: ROIResults;
}

interface ROIParameters {
  // Investment parameters
  initialInvestment: number;
  implementationCost: number;
  trainingCost: number;
  maintenanceCost: number;
  
  // Benefit parameters
  laborSavings: number;
  efficiencyGains: number;
  errorReduction: number;
  complianceSavings: number;
  
  // Time parameters
  timeHorizon: number; // years
  implementationTime: number; // months
  
  // Risk parameters
  riskFactor: number; // 0-1
  confidenceLevel: number; // 0-1
  
  // Market parameters
  inflationRate: number;
  discountRate: number;
  growthRate: number;
}

interface ROIResults {
  totalInvestment: number;
  totalBenefits: number;
  netPresentValue: number;
  roi: number;
  paybackPeriod: number;
  breakEvenPoint: number;
  yearlyBreakdown: Array<{
    year: number;
    investment: number;
    benefits: number;
    cumulativeROI: number;
    netCashFlow: number;
  }>;
  sensitivityAnalysis: {
    parameter: string;
    impact: number;
  }[];
  riskAdjustedROI: number;
  confidenceInterval: {
    lower: number;
    upper: number;
  };
}

const defaultParameters: ROIParameters = {
  initialInvestment: 100000,
  implementationCost: 50000,
  trainingCost: 25000,
  maintenanceCost: 20000,
  laborSavings: 80000,
  efficiencyGains: 60000,
  errorReduction: 40000,
  complianceSavings: 30000,
  timeHorizon: 5,
  implementationTime: 6,
  riskFactor: 0.2,
  confidenceLevel: 0.8,
  inflationRate: 0.03,
  discountRate: 0.08,
  growthRate: 0.05,
};

const ROIModelingEngine: React.FC = () => {
  const [scenarios, setScenarios] = useState<ROIScenario[]>([
    {
      id: 'base',
      name: 'Base Case',
      description: 'Conservative estimates with standard assumptions',
      parameters: defaultParameters,
    },
    {
      id: 'optimistic',
      name: 'Optimistic Case',
      description: 'Best-case scenario with maximum benefits',
      parameters: {
        ...defaultParameters,
        laborSavings: 120000,
        efficiencyGains: 90000,
        errorReduction: 60000,
        riskFactor: 0.1,
      },
    },
    {
      id: 'pessimistic',
      name: 'Pessimistic Case',
      description: 'Worst-case scenario with conservative benefits',
      parameters: {
        ...defaultParameters,
        laborSavings: 50000,
        efficiencyGains: 30000,
        errorReduction: 20000,
        riskFactor: 0.4,
      },
    },
  ]);

  const [activeScenario, setActiveScenario] = useState('base');
  const [activeTab, setActiveTab] = useState(0);
  const [showSensitivity, setShowSensitivity] = useState(false);

  const currentScenario = scenarios.find(s => s.id === activeScenario) || scenarios[0];

  // Calculate ROI results
  const calculateROI = (parameters: ROIParameters): ROIResults => {
    const {
      initialInvestment,
      implementationCost,
      trainingCost,
      maintenanceCost,
      laborSavings,
      efficiencyGains,
      errorReduction,
      complianceSavings,
      timeHorizon,
      implementationTime,
      riskFactor,
      confidenceLevel,
      inflationRate,
      discountRate,
      growthRate,
    } = parameters;

    const totalInvestment = initialInvestment + implementationCost + trainingCost;
    const annualBenefits = laborSavings + efficiencyGains + errorReduction + complianceSavings;
    const annualCosts = maintenanceCost;

    // Calculate yearly breakdown
    const yearlyBreakdown = [];
    let cumulativeInvestment = totalInvestment;
    let cumulativeBenefits = 0;
    let cumulativeNetCashFlow = -totalInvestment;

    for (let year = 1; year <= timeHorizon; year++) {
      // Apply growth and inflation
      const yearlyBenefits = annualBenefits * Math.pow(1 + growthRate, year - 1);
      const yearlyCosts = annualCosts * Math.pow(1 + inflationRate, year - 1);
      const netBenefits = yearlyBenefits - yearlyCosts;

      // Discount to present value
      const discountFactor = Math.pow(1 + discountRate, year);
      const presentValueBenefits = netBenefits / discountFactor;

      cumulativeBenefits += presentValueBenefits;
      cumulativeNetCashFlow += netBenefits;

      const cumulativeROI = cumulativeBenefits > 0 ? 
        ((cumulativeBenefits - totalInvestment) / totalInvestment) * 100 : 
        -100;

      yearlyBreakdown.push({
        year,
        investment: year === 1 ? totalInvestment : yearlyCosts,
        benefits: netBenefits,
        cumulativeROI,
        netCashFlow: cumulativeNetCashFlow,
      });
    }

    const totalBenefits = cumulativeBenefits;
    const netPresentValue = totalBenefits - totalInvestment;
    const roi = (netPresentValue / totalInvestment) * 100;

    // Calculate payback period
    let paybackPeriod = 0;
    let cumulativeCashFlow = -totalInvestment;
    for (const year of yearlyBreakdown) {
      cumulativeCashFlow += year.benefits;
      if (cumulativeCashFlow >= 0 && paybackPeriod === 0) {
        paybackPeriod = year.year;
        break;
      }
    }

    // Sensitivity analysis
    const sensitivityAnalysis = [
      { parameter: 'Labor Savings', impact: calculateSensitivity(parameters, 'laborSavings', 0.1) },
      { parameter: 'Efficiency Gains', impact: calculateSensitivity(parameters, 'efficiencyGains', 0.1) },
      { parameter: 'Initial Investment', impact: calculateSensitivity(parameters, 'initialInvestment', 0.1) },
      { parameter: 'Discount Rate', impact: calculateSensitivity(parameters, 'discountRate', 0.01) },
      { parameter: 'Growth Rate', impact: calculateSensitivity(parameters, 'growthRate', 0.01) },
    ];

    // Risk adjustment
    const riskAdjustedROI = roi * (1 - riskFactor);

    // Confidence interval (simplified)
    const standardError = roi * 0.2; // Assume 20% standard error
    const confidenceMultiplier = confidenceLevel === 0.95 ? 1.96 : 1.64; // 95% or 90%
    const confidenceInterval = {
      lower: riskAdjustedROI - (confidenceMultiplier * standardError),
      upper: riskAdjustedROI + (confidenceMultiplier * standardError),
    };

    return {
      totalInvestment,
      totalBenefits,
      netPresentValue,
      roi,
      paybackPeriod,
      breakEvenPoint: paybackPeriod,
      yearlyBreakdown,
      sensitivityAnalysis,
      riskAdjustedROI,
      confidenceInterval,
    };
  };

  const calculateSensitivity = (baseParams: ROIParameters, parameter: keyof ROIParameters, change: number): number => {
    const baseROI = calculateROI(baseParams).roi;
    const modifiedParams = { ...baseParams, [parameter]: (baseParams[parameter] as number) * (1 + change) };
    const modifiedROI = calculateROI(modifiedParams).roi;
    return ((modifiedROI - baseROI) / baseROI) * 100;
  };

  // Calculate results for all scenarios
  const scenariosWithResults = useMemo(() => {
    return scenarios.map(scenario => ({
      ...scenario,
      results: calculateROI(scenario.parameters),
    }));
  }, [scenarios]);

  const updateScenarioParameter = (scenarioId: string, parameter: keyof ROIParameters, value: number) => {
    setScenarios(prev => prev.map(scenario => 
      scenario.id === scenarioId 
        ? { ...scenario, parameters: { ...scenario.parameters, [parameter]: value } }
        : scenario
    ));
  };

  const addScenario = () => {
    const newScenario: ROIScenario = {
      id: `scenario_${Date.now()}`,
      name: `Scenario ${scenarios.length + 1}`,
      description: 'Custom scenario',
      parameters: { ...defaultParameters },
    };
    setScenarios(prev => [...prev, newScenario]);
    setActiveScenario(newScenario.id);
  };

  const deleteScenario = (scenarioId: string) => {
    if (scenarios.length <= 1) return;
    setScenarios(prev => prev.filter(s => s.id !== scenarioId));
    if (activeScenario === scenarioId) {
      setActiveScenario(scenarios[0].id);
    }
  };

  const exportResults = () => {
    const data = scenariosWithResults.map(scenario => ({
      name: scenario.name,
      roi: scenario.results?.roi,
      npv: scenario.results?.netPresentValue,
      paybackPeriod: scenario.results?.paybackPeriod,
    }));
    
    const csv = [
      'Scenario,ROI (%),NPV ($),Payback Period (years)',
      ...data.map(row => `${row.name},${row.roi?.toFixed(2)},${row.npv?.toFixed(0)},${row.paybackPeriod}`)
    ].join('\n');
    
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'roi-analysis.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const currentResults = currentScenario.results || calculateROI(currentScenario.parameters);

  const comparisonData = scenariosWithResults.map(scenario => ({
    name: scenario.name,
    roi: scenario.results?.roi || 0,
    npv: scenario.results?.netPresentValue || 0,
    payback: scenario.results?.paybackPeriod || 0,
  }));

  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884D8'];

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4" component="h1" sx={{ display: 'flex', alignItems: 'center' }}>
          <CalculateIcon sx={{ mr: 1 }} />
          ROI Modeling Engine
        </Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<SaveIcon />}
            sx={{ mr: 1 }}
          >
            Save Model
          </Button>
          <Button
            variant="outlined"
            startIcon={<ShareIcon />}
            sx={{ mr: 1 }}
          >
            Share
          </Button>
          <Button
            variant="outlined"
            startIcon={<DownloadIcon />}
            onClick={exportResults}
          >
            Export
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Scenario Selection */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6">Scenarios</Typography>
                <Button variant="outlined" size="small" onClick={addScenario}>
                  Add Scenario
                </Button>
              </Box>
              <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
                {scenarios.map(scenario => (
                  <Chip
                    key={scenario.id}
                    label={scenario.name}
                    onClick={() => setActiveScenario(scenario.id)}
                    onDelete={scenarios.length > 1 ? () => deleteScenario(scenario.id) : undefined}
                    color={activeScenario === scenario.id ? 'primary' : 'default'}
                    variant={activeScenario === scenario.id ? 'filled' : 'outlined'}
                  />
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Main Content */}
        <Grid item xs={12}>
          <Card>
            <CardContent>
              <Tabs value={activeTab} onChange={(_, newValue) => setActiveTab(newValue)}>
                <Tab label="Parameters" />
                <Tab label="Results" />
                <Tab label="Analysis" />
                <Tab label="Comparison" />
              </Tabs>

              {/* Parameters Tab */}
              {activeTab === 0 && (
                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={3}>
                    {/* Investment Parameters */}
                    <Grid item xs={12} md={6}>
                      <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h6">Investment Parameters</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Initial Investment ($)"
                                type="number"
                                value={currentScenario.parameters.initialInvestment}
                                onChange={(e) => updateScenarioParameter(
                                  activeScenario, 
                                  'initialInvestment', 
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Implementation Cost ($)"
                                type="number"
                                value={currentScenario.parameters.implementationCost}
                                onChange={(e) => updateScenarioParameter(
                                  activeScenario, 
                                  'implementationCost', 
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Training Cost ($)"
                                type="number"
                                value={currentScenario.parameters.trainingCost}
                                onChange={(e) => updateScenarioParameter(
                                  activeScenario, 
                                  'trainingCost', 
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Annual Maintenance Cost ($)"
                                type="number"
                                value={currentScenario.parameters.maintenanceCost}
                                onChange={(e) => updateScenarioParameter(
                                  activeScenario, 
                                  'maintenanceCost', 
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </Grid>
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    </Grid>

                    {/* Benefit Parameters */}
                    <Grid item xs={12} md={6}>
                      <Accordion defaultExpanded>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h6">Benefit Parameters</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={2}>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Annual Labor Savings ($)"
                                type="number"
                                value={currentScenario.parameters.laborSavings}
                                onChange={(e) => updateScenarioParameter(
                                  activeScenario, 
                                  'laborSavings', 
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Annual Efficiency Gains ($)"
                                type="number"
                                value={currentScenario.parameters.efficiencyGains}
                                onChange={(e) => updateScenarioParameter(
                                  activeScenario, 
                                  'efficiencyGains', 
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Annual Error Reduction Savings ($)"
                                type="number"
                                value={currentScenario.parameters.errorReduction}
                                onChange={(e) => updateScenarioParameter(
                                  activeScenario, 
                                  'errorReduction', 
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </Grid>
                            <Grid item xs={12}>
                              <TextField
                                fullWidth
                                label="Annual Compliance Savings ($)"
                                type="number"
                                value={currentScenario.parameters.complianceSavings}
                                onChange={(e) => updateScenarioParameter(
                                  activeScenario, 
                                  'complianceSavings', 
                                  parseFloat(e.target.value) || 0
                                )}
                              />
                            </Grid>
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    </Grid>

                    {/* Time and Risk Parameters */}
                    <Grid item xs={12}>
                      <Accordion>
                        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
                          <Typography variant="h6">Time and Risk Parameters</Typography>
                        </AccordionSummary>
                        <AccordionDetails>
                          <Grid container spacing={3}>
                            <Grid item xs={12} md={4}>
                              <Typography gutterBottom>Time Horizon: {currentScenario.parameters.timeHorizon} years</Typography>
                              <Slider
                                value={currentScenario.parameters.timeHorizon}
                                onChange={(_, value) => updateScenarioParameter(activeScenario, 'timeHorizon', value as number)}
                                min={1}
                                max={10}
                                marks
                                valueLabelDisplay="auto"
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography gutterBottom>Risk Factor: {(currentScenario.parameters.riskFactor * 100).toFixed(0)}%</Typography>
                              <Slider
                                value={currentScenario.parameters.riskFactor}
                                onChange={(_, value) => updateScenarioParameter(activeScenario, 'riskFactor', value as number)}
                                min={0}
                                max={1}
                                step={0.05}
                                marks
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${(value * 100).toFixed(0)}%`}
                              />
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Typography gutterBottom>Discount Rate: {(currentScenario.parameters.discountRate * 100).toFixed(1)}%</Typography>
                              <Slider
                                value={currentScenario.parameters.discountRate}
                                onChange={(_, value) => updateScenarioParameter(activeScenario, 'discountRate', value as number)}
                                min={0.01}
                                max={0.20}
                                step={0.005}
                                marks
                                valueLabelDisplay="auto"
                                valueLabelFormat={(value) => `${(value * 100).toFixed(1)}%`}
                              />
                            </Grid>
                          </Grid>
                        </AccordionDetails>
                      </Accordion>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Results Tab */}
              {activeTab === 1 && (
                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={3}>
                    {/* Key Metrics */}
                    <Grid item xs={12}>
                      <Grid container spacing={2}>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center' }}>
                              <Typography variant="h4" color="primary">
                                {currentResults.roi.toFixed(1)}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                ROI
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center' }}>
                              <Typography variant="h4" color="success.main">
                                ${(currentResults.netPresentValue / 1000).toFixed(0)}K
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                NPV
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center' }}>
                              <Typography variant="h4" color="info.main">
                                {currentResults.paybackPeriod.toFixed(1)}
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Payback (years)
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                        <Grid item xs={12} sm={6} md={3}>
                          <Card variant="outlined">
                            <CardContent sx={{ textAlign: 'center' }}>
                              <Typography variant="h4" color="warning.main">
                                {currentResults.riskAdjustedROI.toFixed(1)}%
                              </Typography>
                              <Typography variant="body2" color="text.secondary">
                                Risk-Adjusted ROI
                              </Typography>
                            </CardContent>
                          </Card>
                        </Grid>
                      </Grid>
                    </Grid>

                    {/* Cash Flow Chart */}
                    <Grid item xs={12} md={8}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Cash Flow Projection
                          </Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <LineChart data={currentResults.yearlyBreakdown}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="year" />
                              <YAxis />
                              <RechartsTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                              <Legend />
                              <Line type="monotone" dataKey="benefits" stroke="#8884d8" name="Annual Benefits" />
                              <Line type="monotone" dataKey="netCashFlow" stroke="#82ca9d" name="Cumulative Cash Flow" />
                            </LineChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* ROI Breakdown */}
                    <Grid item xs={12} md={4}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Investment Breakdown
                          </Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                              <Pie
                                data={[
                                  { name: 'Initial Investment', value: currentScenario.parameters.initialInvestment },
                                  { name: 'Implementation', value: currentScenario.parameters.implementationCost },
                                  { name: 'Training', value: currentScenario.parameters.trainingCost },
                                ]}
                                cx="50%"
                                cy="50%"
                                outerRadius={80}
                                fill="#8884d8"
                                dataKey="value"
                                label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                              >
                                {[0, 1, 2].map((entry, index) => (
                                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                ))}
                              </Pie>
                              <RechartsTooltip formatter={(value: number) => [`$${value.toLocaleString()}`, '']} />
                            </PieChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Yearly Breakdown Table */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Yearly Breakdown
                          </Typography>
                          <TableContainer>
                            <Table size="small">
                              <TableHead>
                                <TableRow>
                                  <TableCell>Year</TableCell>
                                  <TableCell align="right">Investment</TableCell>
                                  <TableCell align="right">Benefits</TableCell>
                                  <TableCell align="right">Net Cash Flow</TableCell>
                                  <TableCell align="right">Cumulative ROI</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {currentResults.yearlyBreakdown.map((row) => (
                                  <TableRow key={row.year}>
                                    <TableCell>{row.year}</TableCell>
                                    <TableCell align="right">${row.investment.toLocaleString()}</TableCell>
                                    <TableCell align="right">${row.benefits.toLocaleString()}</TableCell>
                                    <TableCell align="right">${row.netCashFlow.toLocaleString()}</TableCell>
                                    <TableCell align="right">
                                      <Chip
                                        label={`${row.cumulativeROI.toFixed(1)}%`}
                                        color={row.cumulativeROI > 0 ? 'success' : 'error'}
                                        size="small"
                                      />
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
                </Box>
              )}

              {/* Analysis Tab */}
              {activeTab === 2 && (
                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={3}>
                    {/* Sensitivity Analysis */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Sensitivity Analysis
                          </Typography>
                          <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={currentResults.sensitivityAnalysis}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="parameter" />
                              <YAxis />
                              <RechartsTooltip formatter={(value: number) => [`${value.toFixed(2)}%`, 'Impact']} />
                              <Bar dataKey="impact" fill="#8884d8" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Risk Analysis */}
                    <Grid item xs={12} md={6}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Risk Analysis
                          </Typography>
                          <Box sx={{ mb: 2 }}>
                            <Typography variant="body2" gutterBottom>
                              Risk-Adjusted ROI: {currentResults.riskAdjustedROI.toFixed(1)}%
                            </Typography>
                            <Typography variant="body2" gutterBottom>
                              Confidence Interval ({(currentScenario.parameters.confidenceLevel * 100).toFixed(0)}%):
                            </Typography>
                            <Typography variant="body2">
                              {currentResults.confidenceInterval.lower.toFixed(1)}% - {currentResults.confidenceInterval.upper.toFixed(1)}%
                            </Typography>
                          </Box>
                          <Alert severity="info">
                            <Typography variant="body2">
                              The risk factor of {(currentScenario.parameters.riskFactor * 100).toFixed(0)}% 
                              reduces the base ROI from {currentResults.roi.toFixed(1)}% to {currentResults.riskAdjustedROI.toFixed(1)}%.
                            </Typography>
                          </Alert>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Key Insights */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Key Insights
                          </Typography>
                          <Grid container spacing={2}>
                            <Grid item xs={12} md={4}>
                              <Alert severity={currentResults.roi > 20 ? 'success' : currentResults.roi > 10 ? 'warning' : 'error'}>
                                <Typography variant="subtitle2">ROI Assessment</Typography>
                                <Typography variant="body2">
                                  {currentResults.roi > 20 ? 'Excellent' : currentResults.roi > 10 ? 'Good' : 'Poor'} ROI of {currentResults.roi.toFixed(1)}%
                                </Typography>
                              </Alert>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Alert severity={currentResults.paybackPeriod < 2 ? 'success' : currentResults.paybackPeriod < 4 ? 'warning' : 'error'}>
                                <Typography variant="subtitle2">Payback Period</Typography>
                                <Typography variant="body2">
                                  {currentResults.paybackPeriod < 2 ? 'Fast' : currentResults.paybackPeriod < 4 ? 'Moderate' : 'Slow'} payback in {currentResults.paybackPeriod.toFixed(1)} years
                                </Typography>
                              </Alert>
                            </Grid>
                            <Grid item xs={12} md={4}>
                              <Alert severity={currentResults.netPresentValue > 0 ? 'success' : 'error'}>
                                <Typography variant="subtitle2">Net Present Value</Typography>
                                <Typography variant="body2">
                                  {currentResults.netPresentValue > 0 ? 'Positive' : 'Negative'} NPV of ${currentResults.netPresentValue.toLocaleString()}
                                </Typography>
                              </Alert>
                            </Grid>
                          </Grid>
                        </CardContent>
                      </Card>
                    </Grid>
                  </Grid>
                </Box>
              )}

              {/* Comparison Tab */}
              {activeTab === 3 && (
                <Box sx={{ mt: 3 }}>
                  <Grid container spacing={3}>
                    {/* Scenario Comparison Chart */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Scenario Comparison
                          </Typography>
                          <ResponsiveContainer width="100%" height={400}>
                            <BarChart data={comparisonData}>
                              <CartesianGrid strokeDasharray="3 3" />
                              <XAxis dataKey="name" />
                              <YAxis />
                              <RechartsTooltip />
                              <Legend />
                              <Bar dataKey="roi" fill="#8884d8" name="ROI (%)" />
                              <Bar dataKey="payback" fill="#82ca9d" name="Payback Period (years)" />
                            </BarChart>
                          </ResponsiveContainer>
                        </CardContent>
                      </Card>
                    </Grid>

                    {/* Comparison Table */}
                    <Grid item xs={12}>
                      <Card variant="outlined">
                        <CardContent>
                          <Typography variant="h6" gutterBottom>
                            Detailed Comparison
                          </Typography>
                          <TableContainer>
                            <Table>
                              <TableHead>
                                <TableRow>
                                  <TableCell>Scenario</TableCell>
                                  <TableCell align="right">ROI (%)</TableCell>
                                  <TableCell align="right">NPV ($)</TableCell>
                                  <TableCell align="right">Payback (years)</TableCell>
                                  <TableCell align="right">Risk-Adjusted ROI (%)</TableCell>
                                </TableRow>
                              </TableHead>
                              <TableBody>
                                {scenariosWithResults.map((scenario) => (
                                  <TableRow key={scenario.id}>
                                    <TableCell>
                                      <Box>
                                        <Typography variant="subtitle2">{scenario.name}</Typography>
                                        <Typography variant="caption" color="text.secondary">
                                          {scenario.description}
                                        </Typography>
                                      </Box>
                                    </TableCell>
                                    <TableCell align="right">
                                      <Chip
                                        label={`${scenario.results?.roi.toFixed(1)}%`}
                                        color={(scenario.results?.roi || 0) > 15 ? 'success' : 'default'}
                                        size="small"
                                      />
                                    </TableCell>
                                    <TableCell align="right">
                                      ${scenario.results?.netPresentValue.toLocaleString()}
                                    </TableCell>
                                    <TableCell align="right">
                                      {scenario.results?.paybackPeriod.toFixed(1)}
                                    </TableCell>
                                    <TableCell align="right">
                                      {scenario.results?.riskAdjustedROI.toFixed(1)}%
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
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ROIModelingEngine;