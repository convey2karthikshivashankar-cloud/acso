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
} from '@mui/material';
import {
  Timeline,
  Speed,
  NetworkCheck,
  Storage,
  Security,
} from '@mui/icons-material';
import { RealTimeChart } from './RealTimeChart';
import { TimeSeriesChart } from './TimeSeriesChart';
import { BarChart } from './BarChart';
import { 
  realTimeChartService, 
  createMockDataSource, 
  generateMockRealTimeData 
} from '../../services/realTimeChartService';
import { useMultipleRealTimeCharts } from '../../hooks/useRealTimeChart';
import { formatters } from './index';

interface TabPanelProps {
  children?: React.ReactNode;
  index: number;
  value: number;
}

const TabPanel: React.FC<TabPanelProps> = ({ children, value, index, ...other }) => (
  <div
    role="tabpanel"
    hidden={value !== index}
    id={`realtime-tabpanel-${index}`}
    aria-labelledby={`realtime-tab-${index}`}
    {...other}
  >
    {value === index && <Box sx={{ p: 3 }}>{children}</Box>}
  </div>
);

export const RealTimeChartExample: React.FC = () => {
  const [activeTab, setActiveTab] = React.useState(0);
  const [mockDataEnabled, setMockDataEnabled] = React.useState(true);
  const [performanceMode, setPerformanceMode] = React.useState(false);

  // Mock data sources
  const dataSources = React.useMemo(() => [
    createMockDataSource('system-metrics', 'System Metrics', 'metrics'),
    createMockDataSource('network-traffic', 'Network Traffic', 'metrics'),
    createMockDataSource('security-events', 'Security Events', 'events'),
    createMockDataSource('application-logs', 'Application Logs', 'logs'),
  ], []);

  // Multiple real-time charts hook
  const {
    chartsState,
    isAnyConnected,
    areAllConnected,
    hasAnyError,
    refreshAll,
    clearAllData,
    pauseAll,
    resumeAll,
  } = useMultipleRealTimeCharts({
    dataSources: dataSources.map(ds => ({
      id: ds.id,
      enabled: mockDataEnabled,
      maxDataPoints: 200,
    })),
    onError: (dataSourceId, error) => {
      console.error(`Error in data source ${dataSourceId}:`, error);
    },
  });

  // Setup mock data generation
  React.useEffect(() => {
    if (!mockDataEnabled) return;

    // Register mock data sources
    dataSources.forEach(dataSource => {
      realTimeChartService.registerDataSource(dataSource);
    });

    // Start mock data generation
    const intervals = dataSources.map(dataSource => {
      return setInterval(() => {
        const mockData = generateMockRealTimeData(
          dataSource.name.includes('Metrics') ? 'metrics' :
          dataSource.name.includes('Events') ? 'events' : 'logs'
        );
        
        // Simulate data updates by directly adding to service
        mockData.forEach(dataPoint => {
          (realTimeChartService as any).addDataPoint(dataSource.id, dataPoint);
        });
      }, dataSource.updateInterval || 2000);
    });

    return () => {
      intervals.forEach(clearInterval);
      dataSources.forEach(dataSource => {
        realTimeChartService.unregisterDataSource(dataSource.id);
      });
    };
  }, [mockDataEnabled, dataSources]);

  const renderSystemMetrics = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Real-time system metrics with live updates, performance monitoring, and connection status.
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader 
            title="CPU & Memory Usage" 
            action={
              <Chip 
                icon={<Speed />}
                label={chartsState['system-metrics']?.isConnected ? 'Live' : 'Offline'}
                color={chartsState['system-metrics']?.isConnected ? 'success' : 'default'}
                size="small"
              />
            }
          />
          <CardContent>
            <RealTimeChart
              dataSourceId="system-metrics"
              type="line"
              multiSeries={true}
              showBrush={false}
              showControls={true}
              showStatus={true}
              showPerformance={performanceMode}
              maxDataPoints={100}
              valueFormat={formatters.percentage}
              config={{
                title: 'System Resources',
                showLegend: true,
              }}
              height={300}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader 
            title="Network Traffic" 
            action={
              <Chip 
                icon={<NetworkCheck />}
                label={chartsState['network-traffic']?.isConnected ? 'Live' : 'Offline'}
                color={chartsState['network-traffic']?.isConnected ? 'success' : 'default'}
                size="small"
              />
            }
          />
          <CardContent>
            <RealTimeChart
              dataSourceId="network-traffic"
              type="area"
              showReferenceLine={true}
              referenceValue={500}
              showControls={true}
              showStatus={true}
              showPerformance={performanceMode}
              maxDataPoints={150}
              valueFormat={(value) => formatters.bytes(value * 1024 * 1024)}
              config={{
                title: 'Network Bandwidth',
                showLegend: false,
              }}
              height={300}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="Multi-Source Dashboard" 
            action={
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip 
                  label={`${Object.values(chartsState).filter(s => s.isConnected).length}/${Object.keys(chartsState).length} Connected`}
                  color={areAllConnected ? 'success' : isAnyConnected ? 'warning' : 'error'}
                  size="small"
                />
              </Box>
            }
          />
          <CardContent>
            <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
              <Button onClick={refreshAll} variant="outlined" size="small">
                Refresh All
              </Button>
              <Button onClick={clearAllData} variant="outlined" size="small">
                Clear All
              </Button>
              <Button onClick={pauseAll} variant="outlined" size="small">
                Pause All
              </Button>
              <Button onClick={resumeAll} variant="outlined" size="small">
                Resume All
              </Button>
            </Box>

            <Grid container spacing={2}>
              {Object.entries(chartsState).map(([dataSourceId, state]) => (
                <Grid item xs={12} sm={6} md={3} key={dataSourceId}>
                  <Card variant="outlined">
                    <CardContent sx={{ p: 2 }}>
                      <Typography variant="subtitle2" gutterBottom>
                        {dataSourceId.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </Typography>
                      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
                        <Chip
                          label={state.isConnected ? 'Connected' : 'Disconnected'}
                          color={state.isConnected ? 'success' : 'default'}
                          size="small"
                        />
                        <Typography variant="caption" color="text.secondary">
                          {state.data.length} data points
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {state.updateCount} updates
                        </Typography>
                        {state.lastUpdate && (
                          <Typography variant="caption" color="text.secondary">
                            Last: {state.lastUpdate.toLocaleTimeString()}
                          </Typography>
                        )}
                      </Box>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderSecurityEvents = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Real-time security event monitoring with anomaly detection and alert classification.
        </Alert>
      </Grid>

      <Grid item xs={12} md={8}>
        <Card>
          <CardHeader 
            title="Security Events Timeline" 
            action={
              <Chip 
                icon={<Security />}
                label={chartsState['security-events']?.isConnected ? 'Monitoring' : 'Offline'}
                color={chartsState['security-events']?.isConnected ? 'success' : 'default'}
                size="small"
              />
            }
          />
          <CardContent>
            <RealTimeChart
              dataSourceId="security-events"
              type="step"
              showAnomalies={true}
              showThreshold={true}
              showControls={true}
              showStatus={true}
              maxDataPoints={200}
              valueFormat={formatters.number}
              config={{
                title: 'Security Event Count',
                showLegend: true,
              }}
              height={350}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={4}>
        <Card>
          <CardHeader title="Event Distribution" />
          <CardContent>
            <BarChart
              data={[
                { category: 'Critical', value: 5, timestamp: new Date() },
                { category: 'High', value: 12, timestamp: new Date() },
                { category: 'Medium', value: 28, timestamp: new Date() },
                { category: 'Low', value: 45, timestamp: new Date() },
                { category: 'Info', value: 67, timestamp: new Date() },
              ]}
              orientation="horizontal"
              showValues={true}
              sortBy="value"
              sortOrder="desc"
              valueFormat={formatters.number}
              categoryColors={{
                'Critical': '#f44336',
                'High': '#ff9800',
                'Medium': '#ffc107',
                'Low': '#4caf50',
                'Info': '#2196f3',
              }}
              config={{
                title: 'Event Severity',
                showLegend: false,
              }}
              height={350}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderApplicationLogs = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="info" sx={{ mb: 2 }}>
          Real-time application log monitoring with request tracking and error detection.
        </Alert>
      </Grid>

      <Grid item xs={12}>
        <Card>
          <CardHeader 
            title="Application Request Rate" 
            action={
              <Chip 
                icon={<Storage />}
                label={chartsState['application-logs']?.isConnected ? 'Streaming' : 'Offline'}
                color={chartsState['application-logs']?.isConnected ? 'success' : 'default'}
                size="small"
              />
            }
          />
          <CardContent>
            <RealTimeChart
              dataSourceId="application-logs"
              type="area"
              showBrush={true}
              showReferenceLine={true}
              referenceValue={50}
              showControls={true}
              showStatus={true}
              showPerformance={performanceMode}
              maxDataPoints={300}
              valueFormat={(value) => `${formatters.number(value)} req/s`}
              config={{
                title: 'Request Rate Over Time',
                showLegend: false,
              }}
              height={400}
            />
          </CardContent>
        </Card>
      </Grid>
    </Grid>
  );

  const renderPerformanceDemo = () => (
    <Grid container spacing={3}>
      <Grid item xs={12}>
        <Alert severity="warning" sx={{ mb: 2 }}>
          High-frequency real-time updates for performance testing. Monitor FPS and update times.
        </Alert>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="High-Frequency Updates (100ms)" />
          <CardContent>
            <RealTimeChart
              dataSourceId="system-metrics"
              dataSource={{
                ...dataSources[0],
                updateInterval: 100, // Very fast updates
              }}
              type="line"
              showControls={true}
              showStatus={true}
              showPerformance={true}
              maxDataPoints={500}
              updateThreshold={8} // ~120fps
              valueFormat={formatters.number}
              config={{
                title: 'High-Frequency Data',
                showLegend: false,
              }}
              height={300}
            />
          </CardContent>
        </Card>
      </Grid>

      <Grid item xs={12} md={6}>
        <Card>
          <CardHeader title="Large Dataset (1000 points)" />
          <CardContent>
            <RealTimeChart
              dataSourceId="network-traffic"
              type="area"
              showControls={true}
              showStatus={true}
              showPerformance={true}
              maxDataPoints={1000} // Large dataset
              valueFormat={formatters.bytes}
              config={{
                title: 'Large Dataset Rendering',
                showLegend: false,
              }}
              height={300}
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
          Real-Time Chart Demo
        </Typography>
        <Typography variant="body1" color="text.secondary" paragraph>
          Interactive real-time charting with WebSocket, polling, and Server-Sent Events support.
          Features live data streaming, performance monitoring, and connection management.
        </Typography>

        <Box sx={{ display: 'flex', gap: 2, mb: 3, flexWrap: 'wrap' }}>
          <FormControlLabel
            control={
              <Switch
                checked={mockDataEnabled}
                onChange={(e) => setMockDataEnabled(e.target.checked)}
              />
            }
            label="Enable Mock Data"
          />
          <FormControlLabel
            control={
              <Switch
                checked={performanceMode}
                onChange={(e) => setPerformanceMode(e.target.checked)}
              />
            }
            label="Show Performance Metrics"
          />
          
          <Divider orientation="vertical" flexItem />
          
          <Chip
            icon={<Timeline />}
            label={`${Object.values(chartsState).filter(s => s.isConnected).length} Active Connections`}
            color={isAnyConnected ? 'success' : 'default'}
          />
          
          {hasAnyError && (
            <Chip
              label="Connection Errors"
              color="error"
            />
          )}
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 3 }}>
        <Tabs
          value={activeTab}
          onChange={(_, newValue) => setActiveTab(newValue)}
          variant="scrollable"
          scrollButtons="auto"
        >
          <Tab icon={<Speed />} label="System Metrics" />
          <Tab icon={<Security />} label="Security Events" />
          <Tab icon={<Storage />} label="Application Logs" />
          <Tab icon={<NetworkCheck />} label="Performance Test" />
        </Tabs>
      </Box>

      <TabPanel value={activeTab} index={0}>
        {renderSystemMetrics()}
      </TabPanel>

      <TabPanel value={activeTab} index={1}>
        {renderSecurityEvents()}
      </TabPanel>

      <TabPanel value={activeTab} index={2}>
        {renderApplicationLogs()}
      </TabPanel>

      <TabPanel value={activeTab} index={3}>
        {renderPerformanceDemo()}
      </TabPanel>
    </Container>
  );
};

export default RealTimeChartExample;