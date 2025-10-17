import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Tabs,
  Tab,
  Button,
  Switch,
  FormControlLabel,
  Alert,
} from '@mui/material';
import {
  TimeSeriesChart,
  BarChart,
  PieChart,
  HeatMap,
  NetworkTopology,
  generateMockTimeSeriesData,
  generateMockBarData,
  generateMockPieData,
  generateMockHeatMapData,
  generateMockNetworkData,
  formatters,
} from './index';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`chart-tabpanel-${index}`}
    aria-labelledby={`chart-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const ChartLibraryExample: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [realTimeEnabled, setRealTimeEnabled] = React.useState(false);
  const [interactiveMode, setInteractiveMode] = React.useState(true);

  // Generate mock data
  const timeSeriesData = generateMockTimeSeriesData(100, ['CPU', 'Memory', 'Network'], 24 * 60 * 60 * 1000);
  const barData = generateMockBarData(['Servers', 'Databases', 'Applications', 'Services', 'Clients']);
  const pieData = generateMockPieData(['Critical', 'High', 'Medium', 'Low', 'Info']);
  const heatMapData = generateMockHeatMapData();
  const { nodes, edges } = generateMockNetworkData();

  const handleDataPointClick = (dataPoint: any, index: number) => {
    if (interactiveMode) {
      console.log('Data point clicked:', dataPoint, index);
    }
  };

  const handleExport = (format: string) => {
    console.log(`Exporting chart as ${format}`);
  };

  const handleRefresh = () => {
    console.log('Refreshing chart data');
  };

  const renderTimeSeriesExamples = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Time series charts support real-time updates, multiple series, anomaly detection, and predictions.
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="System Metrics - Line Chart" />
          <CardContent>
            <TimeSeriesChart
              data={timeSeriesData}
              type="line"
              multiSeries={true}
              showBrush={true}
              realTime={realTimeEnabled}
              updateInterval={2000}
              valueFormat={formatters.number}
              config={{
                title: 'System Performance',
                showLegend: true,
              }}
              height={300}
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Network Traffic - Area Chart" />
          <CardContent>
            <TimeSeriesChart
              data={timeSeriesData.filter(d => d.series === 'Network')}
              type="area"
              showReferenceLine={true}
              referenceValue={50}
              showAnomalies={true}
              valueFormat={(value) => formatters.bytes(value * 1024 * 1024)}
              config={{
                title: 'Network Bandwidth Usage',
                showLegend: false,
              }}
              height={300}
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader title="Multi-Series with Predictions" />
          <CardContent>
            <TimeSeriesChart
              data={timeSeriesData}
              type="line"
              multiSeries={true}
              showPrediction={true}
              showThreshold={true}
              showBrush={true}
              valueFormat={formatters.percentage}
              config={{
                title: 'Resource Utilization with Forecasting',
                showLegend: true,
              }}
              height={400}
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderBarChartExamples = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Bar charts support vertical/horizontal orientation, stacking, grouping, and value labels.
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Resource Distribution - Vertical" />
          <CardContent>
            <BarChart
              data={barData}
              orientation="vertical"
              showValues={true}
              showTarget={true}
              sortBy="value"
              sortOrder="desc"
              valueFormat={formatters.number}
              config={{
                title: 'System Resources',
                showLegend: true,
              }}
              height={300}
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Performance Comparison - Horizontal" />
          <CardContent>
            <BarChart
              data={barData}
              orientation="horizontal"
              showValues={true}
              showComparison={true}
              valueFormat={(value) => `${formatters.number(value)}%`}
              config={{
                title: 'Performance Metrics',
                showLegend: true,
              }}
              height={300}
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPieChartExamples = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Pie and donut charts support custom colors, labels, percentages, and center content.
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Alert Severity - Pie Chart" />
          <CardContent>
            <PieChart
              data={pieData}
              variant="pie"
              showLabels={true}
              showPercentages={true}
              valueFormat={formatters.number}
              config={{
                title: 'Security Alerts by Severity',
                showLegend: true,
              }}
              height={350}
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Resource Usage - Donut Chart" />
          <CardContent>
            <PieChart
              data={pieData}
              variant="donut"
              showLabels={false}
              showPercentages={true}
              groupSmallSlices={true}
              smallSliceThreshold={0.05}
              valueFormat={formatters.bytes}
              centerContent={
                <Box sx={{ textAlign: 'center' }}>
                  <Typography variant="h4">85%</Typography>
                  <Typography variant="body2" color="text.secondary">
                    Total Usage
                  </Typography>
                </Box>
              }
              config={{
                title: 'Storage Distribution',
                showLegend: true,
              }}
              height={350}
              onDataPointClick={handleDataPointClick}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderHeatMapExamples = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Heat maps visualize data density and patterns across two dimensions with color intensity.
        </Alert>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader title="Activity Heat Map" />
          <CardContent>
            <HeatMap
              data={heatMapData}
              cellSize={50}
              cellSpacing={2}
              showValues={true}
              valueFormat={formatters.number}
              colorScale={['#e3f2fd', '#2196f3', '#0d47a1']}
              tooltipFormat={(dataPoint) => 
                `Day: ${dataPoint.x}\nTime: ${dataPoint.y}\nActivity: ${formatters.number(dataPoint.value)}`
              }
              config={{
                title: 'Weekly Activity Pattern',
              }}
              height={400}
              onCellClick={(dataPoint) => console.log('Cell clicked:', dataPoint)}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderNetworkTopologyExamples = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Network topology charts visualize relationships between nodes with different layout algorithms.
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Network Infrastructure - Hierarchical" />
          <CardContent>
            <NetworkTopology
              nodes={nodes}
              edges={edges}
              layout="hierarchical"
              showLabels={true}
              showStatus={true}
              nodeSize={25}
              config={{
                title: 'Network Topology',
              }}
              height={400}
              onNodeClick={(node) => console.log('Node clicked:', node)}
              onEdgeClick={(edge) => console.log('Edge clicked:', edge)}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Service Dependencies - Circular" />
          <CardContent>
            <NetworkTopology
              nodes={nodes}
              edges={edges}
              layout="circular"
              showLabels={true}
              showStatus={true}
              showMetrics={true}
              nodeSize={20}
              selectedNodes={['server-1', 'server-2']}
              highlightedPaths={[['firewall-1', 'router-1', 'switch-1', 'server-1']]}
              config={{
                title: 'Service Dependencies',
              }}
              height={400}
              onNodeClick={(node) => console.log('Node clicked:', node)}
              onEdgeClick={(edge) => console.log('Edge clicked:', edge)}
              onExport={handleExport}
              onRefresh={handleRefresh}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Chart Library Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Comprehensive charting library with time-series, bar charts, pie charts, heat maps, and network topology visualizations.
          All charts support real-time updates, interactivity, and export functionality.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
          <FormControlLabel
            control={
              <Switch
                checked={realTimeEnabled}
                onChange={(e) => setRealTimeEnabled(e.target.checked)}
              />
            }
            label="Enable Real-time Updates"
          />
          <FormControlLabel
            control={
              <Switch
                checked={interactiveMode}
                onChange={(e) => setInteractiveMode(e.target.checked)}
              />
            }
            label="Interactive Mode"
          />
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab label="Time Series" />
          <Tab label="Bar Charts" />
          <Tab label="Pie Charts" />
          <Tab label="Heat Maps" />
          <Tab label="Network Topology" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {renderTimeSeriesExamples()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderBarChartExamples()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderPieChartExamples()}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {renderHeatMapExamples()}
      </TabPanel>

      <TabPanel value={activeTab} index={4}>
        {renderNetworkTopologyExamples()}
      </TabPanel>
    </Container>
  );
};

export default ChartLibraryExample;