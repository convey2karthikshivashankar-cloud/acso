import React from 'react';
import {
  Box,
  Container,
  Typography,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  Switch,
  FormControlLabel,
  Alert,
  Tabs,
  Tab,
  Chip,
  Divider,
  Paper,
} from '@mui/material';
import {
  Interactive,
  Link,
  FilterList,
  ZoomIn,
  GetApp,
  Timeline,
} from '@mui/icons-material';
import { InteractiveChart, DrillDownLevel, ChartFilter } from './InteractiveChart';
import { TimeSeriesChart } from './TimeSeriesChart';
import { BarChart } from './BarChart';
import { PieChart } from './PieChart';
import { ChartExportDialog, ExportOptions, ChartExporter } from './ChartExport';
import {
  chartLinkingManager,
  createFilterLink,
  createHighlightLink,
  createZoomLink,
  useChartLinking,
} from './ChartLinking';
import {
  generateMockTimeSeriesData,
  generateMockBarData,
  generateMockPieData,
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
    id={`interactive-tabpanel-${index}`}
    aria-labelledby={`interactive-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const InteractiveVisualizationExample: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [interactionsEnabled, setInteractionsEnabled] = React.useState(true);
  const [linkingEnabled, setLinkingEnabled] = React.useState(true);
  const [exportDialogOpen, setExportDialogOpen] = React.useState(false);
  const [selectedChartForExport, setSelectedChartForExport] = React.useState<string>('');

  // Mock data
  const timeSeriesData = generateMockTimeSeriesData(100, ['CPU', 'Memory', 'Disk'], 24 * 60 * 60 * 1000);
  const barData = generateMockBarData(['Web Servers', 'Database', 'Cache', 'Load Balancer', 'API Gateway']);
  const pieData = generateMockPieData(['Critical', 'High', 'Medium', 'Low', 'Info']);

  // Drill-down levels
  const drillDownLevels: DrillDownLevel[] = [
    { id: 'server', name: 'By Server', dataKey: 'server', aggregation: 'avg' },
    { id: 'service', name: 'By Service', dataKey: 'service', parentKey: 'server', aggregation: 'sum' },
    { id: 'endpoint', name: 'By Endpoint', dataKey: 'endpoint', parentKey: 'service', aggregation: 'count' },
  ];

  // Available filters
  const availableFilters: ChartFilter[] = [
    {
      id: 'high-cpu',
      field: 'value',
      operator: 'greater',
      value: 80,
      label: 'High CPU (>80%)',
      active: false,
    },
    {
      id: 'critical-alerts',
      field: 'category',
      operator: 'equals',
      value: 'Critical',
      label: 'Critical Alerts Only',
      active: false,
    },
    {
      id: 'last-hour',
      field: 'timestamp',
      operator: 'greater',
      value: new Date(Date.now() - 60 * 60 * 1000),
      label: 'Last Hour',
      active: false,
    },
  ];

  // Chart linking hooks
  const systemMetricsLinking = useChartLinking('system-metrics-chart');
  const serverStatusLinking = useChartLinking('server-status-chart');
  const alertsLinking = useChartLinking('alerts-chart');

  // Setup chart links
  React.useEffect(() => {
    if (linkingEnabled) {
      // Create links between charts
      const links = [
        createFilterLink('system-metrics-chart', 'server-status-chart', { category: 'server' }),
        createHighlightLink('server-status-chart', 'alerts-chart', { category: 'server' }),
        createZoomLink('system-metrics-chart', 'alerts-chart', { timestamp: 'timestamp' }),
      ];

      links.forEach(link => chartLinkingManager.registerLink(link));

      return () => {
        links.forEach(link => chartLinkingManager.unregisterLink(link.id));
      };
    }
  }, [linkingEnabled]);

  const handleExportChart = async (chartId: string) => {
    setSelectedChartForExport(chartId);
    setExportDialogOpen(true);
  };

  const handleExport = async (options: ExportOptions) => {
    const chartElement = document.getElementById(selectedChartForExport);
    if (chartElement) {
      await ChartExporter.exportChart(chartElement, options);
    }
  };

  const renderDrillDownDemo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Click on data points to drill down through different levels of detail. Use the drill-down path to navigate back up.
        </Alert>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader 
            title="System Performance - Drill Down Demo"
            action={
              <Button
                startIcon={<GetApp />}
                onClick={() => handleExportChart('drill-down-chart')}
                size="small"
              >
                Export
              </Button>
            }
          />
          <CardContent>
            <InteractiveChart
              chartId="drill-down-chart"
              data={timeSeriesData}
              enableDrillDown={interactionsEnabled}
              enableSelection={interactionsEnabled}
              enableZoom={interactionsEnabled}
              enableBookmarks={interactionsEnabled}
              drillDownLevels={drillDownLevels}
              availableFilters={availableFilters}
              onDrillDown={(level, dataPoint) => {
                console.log('Drill down:', level, dataPoint);
              }}
              onSelection={(selected) => {
                console.log('Selection:', selected);
              }}
              config={{
                title: 'Interactive System Metrics',
                showLegend: true,
              }}
              height={400}
            >
              <TimeSeriesChart
                id="drill-down-chart"
                data={timeSeriesData}
                type="line"
                multiSeries={true}
                valueFormat={formatters.percentage}
                height={400}
              />
            </InteractiveChart>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Interaction Controls" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={interactionsEnabled}
                    onChange={(e) => setInteractionsEnabled(e.target.checked)}
                  />
                }
                label="Enable Interactions"
              />

              <Divider />

              <Typography variant="subtitle2">Available Actions:</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip icon={<Interactive />} label="Click to Select" size="small" />
                <Chip icon={<ZoomIn />} label="Zoom Controls" size="small" />
                <Chip icon={<FilterList />} label="Apply Filters" size="small" />
                <Chip icon={<Timeline />} label="Drill Down Levels" size="small" />
              </Box>

              <Divider />

              <Typography variant="subtitle2">Drill-Down Path:</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                {drillDownLevels.map((level, index) => (
                  <Typography key={level.id} variant="caption" color="text.secondary">
                    {index + 1}. {level.name}
                  </Typography>
                ))}
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderCrossFilterDemo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Select data in one chart to filter related data in other charts. Charts are linked through common dimensions.
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader 
            title="System Metrics"
            action={
              <Chip 
                icon={<Link />}
                label={linkingEnabled ? 'Linked' : 'Unlinked'}
                color={linkingEnabled ? 'success' : 'default'}
                size="small"
              />
            }
          />
          <CardContent>
            <InteractiveChart
              chartId="system-metrics-chart"
              data={timeSeriesData}
              enableCrossFilter={linkingEnabled}
              enableSelection={interactionsEnabled}
              linkedCharts={['server-status-chart', 'alerts-chart']}
              onSelection={(selected) => {
                if (linkingEnabled) {
                  systemMetricsLinking.emitEvent('selection', { selected });
                }
              }}
              config={{
                title: 'CPU & Memory Usage',
                showLegend: true,
              }}
              height={300}
            >
              <TimeSeriesChart
                id="system-metrics-chart"
                data={timeSeriesData.filter(d => ['CPU', 'Memory'].includes(d.series || ''))}
                type="area"
                multiSeries={true}
                valueFormat={formatters.percentage}
                height={300}
              />
            </InteractiveChart>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Server Status" />
          <CardContent>
            <InteractiveChart
              chartId="server-status-chart"
              data={barData}
              enableCrossFilter={linkingEnabled}
              enableSelection={interactionsEnabled}
              linkedCharts={['system-metrics-chart', 'alerts-chart']}
              onSelection={(selected) => {
                if (linkingEnabled) {
                  serverStatusLinking.emitEvent('selection', { selected });
                }
              }}
              config={{
                title: 'Server Resource Usage',
                showLegend: false,
              }}
              height={300}
            >
              <BarChart
                id="server-status-chart"
                data={barData}
                orientation="vertical"
                showValues={true}
                valueFormat={formatters.percentage}
                height={300}
              />
            </InteractiveChart>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Alert Distribution" />
          <CardContent>
            <InteractiveChart
              chartId="alerts-chart"
              data={pieData}
              enableCrossFilter={linkingEnabled}
              enableSelection={interactionsEnabled}
              linkedCharts={['system-metrics-chart', 'server-status-chart']}
              onSelection={(selected) => {
                if (linkingEnabled) {
                  alertsLinking.emitEvent('selection', { selected });
                }
              }}
              config={{
                title: 'Alert Severity',
                showLegend: true,
              }}
              height={300}
            >
              <PieChart
                id="alerts-chart"
                data={pieData}
                variant="donut"
                showPercentages={true}
                height={300}
              />
            </InteractiveChart>
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Linking Controls" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <FormControlLabel
                control={
                  <Switch
                    checked={linkingEnabled}
                    onChange={(e) => setLinkingEnabled(e.target.checked)}
                  />
                }
                label="Enable Chart Linking"
              />

              <Divider />

              <Typography variant="subtitle2">Active Links:</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip label="Metrics → Server Status (Filter)" size="small" color="primary" />
                <Chip label="Server Status → Alerts (Highlight)" size="small" color="secondary" />
                <Chip label="Metrics → Alerts (Zoom)" size="small" color="info" />
              </Box>

              <Divider />

              <Typography variant="subtitle2">Linking Stats:</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  Charts: 3 registered
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Links: {linkingEnabled ? '3 active' : '0 active'}
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderExportDemo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Export charts in various formats including PNG, SVG, PDF, CSV, and JSON with customizable options.
        </Alert>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader 
            title="Exportable Chart"
            action={
              <Button
                startIcon={<GetApp />}
                onClick={() => handleExportChart('export-demo-chart')}
                variant="contained"
              >
                Export Chart
              </Button>
            }
          />
          <CardContent>
            <TimeSeriesChart
              id="export-demo-chart"
              data={timeSeriesData}
              type="line"
              multiSeries={true}
              showBrush={true}
              valueFormat={formatters.number}
              config={{
                title: 'Multi-Series Performance Data',
                showLegend: true,
              }}
              height={400}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Export Options" />
          <CardContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
              <Typography variant="subtitle2">Available Formats:</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                <Chip label="PNG - Raster Image" size="small" />
                <Chip label="SVG - Vector Image" size="small" />
                <Chip label="PDF - Document" size="small" />
                <Chip label="CSV - Data Only" size="small" />
                <Chip label="JSON - Structured Data" size="small" />
              </Box>

              <Divider />

              <Typography variant="subtitle2">Export Features:</Typography>
              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                <Typography variant="caption" color="text.secondary">
                  • Customizable dimensions
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Quality settings
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Background color
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Metadata inclusion
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  • Compression options
                </Typography>
              </Box>
            </Box>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  return (
    <Container maxWidth={false} sx={{ py: 3 }}>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h3" gutterBottom>
          Interactive Visualization Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Advanced interactive features including drill-down, cross-filtering, chart linking, 
          bookmarks, and multi-format export capabilities.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                checked={interactionsEnabled}
                onChange={(e) => setInteractionsEnabled(e.target.checked)}
              />
            }
            label="Enable Interactions"
          />
          <FormControlLabel
            control={
              <Switch
                checked={linkingEnabled}
                onChange={(e) => setLinkingEnabled(e.target.checked)}
              />
            }
            label="Enable Chart Linking"
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
          <Tab icon={<Interactive />} label="Drill Down" />
          <Tab icon={<Link />} label="Cross Filtering" />
          <Tab icon={<GetApp />} label="Export Options" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {renderDrillDownDemo()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderCrossFilterDemo()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderExportDemo()}
      </TabPanel>

      {/* Export Dialog */}
      <ChartExportDialog
        open={exportDialogOpen}
        onClose={() => setExportDialogOpen(false)}
        onExport={handleExport}
        chartTitle="Interactive Chart"
        availableFormats={['png', 'svg', 'pdf', 'csv', 'json']}
      />
    </Container>
  );
};

export default InteractiveVisualizationExample;