import React, { useState, useEffect } from 'react';
import { Line, Doughnut, Bar } from 'react-chartjs-2';
import { format, subHours, subMinutes } from 'date-fns';

interface HealthMetric {
  timestamp: Date;
  cpuUsage: number;
  memoryUsage: number;
  diskUsage: number;
  networkIn: number;
  networkOut: number;
  responseTime: number;
  errorRate: number;
  throughput: number;
}

interface HealthAlert {
  id: string;
  type: 'warning' | 'critical';
  metric: string;
  message: string;
  timestamp: Date;
  threshold: number;
  currentValue: number;
}

interface AgentHealthMonitoringProps {
  agentId: string;
  refreshInterval?: number;
  timeRange?: '1h' | '6h' | '24h' | '7d';
}

export const AgentHealthMonitoring: React.FC<AgentHealthMonitoringProps> = ({
  agentId,
  refreshInterval = 30000, // 30 seconds
  timeRange = '1h'
}) => {
  const [metrics, setMetrics] = useState<HealthMetric[]>([]);
  const [currentMetrics, setCurrentMetrics] = useState<HealthMetric | null>(null);
  const [alerts, setAlerts] = useState<HealthAlert[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedMetric, setSelectedMetric] = useState<string>('cpuUsage');

  // Simulate real-time metrics data
  useEffect(() => {
    const generateMetric = (): HealthMetric => ({
      timestamp: new Date(),
      cpuUsage: Math.random() * 100,
      memoryUsage: Math.random() * 100,
      diskUsage: 20 + Math.random() * 60,
      networkIn: Math.random() * 1000,
      networkOut: Math.random() * 800,
      responseTime: 50 + Math.random() * 200,
      errorRate: Math.random() * 5,
      throughput: 100 + Math.random() * 500
    });

    // Generate initial historical data
    const now = new Date();
    const initialMetrics: HealthMetric[] = [];
    
    for (let i = 60; i >= 0; i--) {
      initialMetrics.push({
        ...generateMetric(),
        timestamp: subMinutes(now, i)
      });
    }
    
    setMetrics(initialMetrics);
    setCurrentMetrics(initialMetrics[initialMetrics.length - 1]);
    setIsLoading(false);

    // Set up real-time updates
    const interval = setInterval(() => {
      const newMetric = generateMetric();
      
      setMetrics(prev => {
        const updated = [...prev, newMetric];
        // Keep only last 100 data points
        return updated.slice(-100);
      });
      
      setCurrentMetrics(newMetric);
      
      // Check for alerts
      checkForAlerts(newMetric);
    }, refreshInterval);

    return () => clearInterval(interval);
  }, [agentId, refreshInterval]);

  const checkForAlerts = (metric: HealthMetric) => {
    const newAlerts: HealthAlert[] = [];
    
    // CPU usage alert
    if (metric.cpuUsage > 80) {
      newAlerts.push({
        id: `cpu-${Date.now()}`,
        type: metric.cpuUsage > 90 ? 'critical' : 'warning',
        metric: 'CPU Usage',
        message: `High CPU usage detected: ${metric.cpuUsage.toFixed(1)}%`,
        timestamp: metric.timestamp,
        threshold: 80,
        currentValue: metric.cpuUsage
      });
    }
    
    // Memory usage alert
    if (metric.memoryUsage > 85) {
      newAlerts.push({
        id: `memory-${Date.now()}`,
        type: metric.memoryUsage > 95 ? 'critical' : 'warning',
        metric: 'Memory Usage',
        message: `High memory usage detected: ${metric.memoryUsage.toFixed(1)}%`,
        timestamp: metric.timestamp,
        threshold: 85,
        currentValue: metric.memoryUsage
      });
    }
    
    // Response time alert
    if (metric.responseTime > 200) {
      newAlerts.push({
        id: `response-${Date.now()}`,
        type: metric.responseTime > 300 ? 'critical' : 'warning',
        metric: 'Response Time',
        message: `High response time detected: ${metric.responseTime.toFixed(0)}ms`,
        timestamp: metric.timestamp,
        threshold: 200,
        currentValue: metric.responseTime
      });
    }
    
    if (newAlerts.length > 0) {
      setAlerts(prev => [...newAlerts, ...prev].slice(0, 50)); // Keep last 50 alerts
    }
  };

  const getMetricChartData = (metricKey: keyof HealthMetric) => {
    const data = metrics.map(m => ({
      x: m.timestamp,
      y: typeof m[metricKey] === 'number' ? m[metricKey] : 0
    }));

    return {
      datasets: [{
        label: getMetricLabel(metricKey),
        data,
        borderColor: getMetricColor(metricKey),
        backgroundColor: getMetricColor(metricKey, 0.1),
        tension: 0.4,
        fill: true
      }]
    };
  };

  const getMetricLabel = (metricKey: string) => {
    const labels = {
      cpuUsage: 'CPU Usage (%)',
      memoryUsage: 'Memory Usage (%)',
      diskUsage: 'Disk Usage (%)',
      networkIn: 'Network In (KB/s)',
      networkOut: 'Network Out (KB/s)',
      responseTime: 'Response Time (ms)',
      errorRate: 'Error Rate (%)',
      throughput: 'Throughput (req/s)'
    };
    return labels[metricKey as keyof typeof labels] || metricKey;
  };

  const getMetricColor = (metricKey: string, alpha = 1) => {
    const colors = {
      cpuUsage: `rgba(255, 99, 132, ${alpha})`,
      memoryUsage: `rgba(54, 162, 235, ${alpha})`,
      diskUsage: `rgba(255, 205, 86, ${alpha})`,
      networkIn: `rgba(75, 192, 192, ${alpha})`,
      networkOut: `rgba(153, 102, 255, ${alpha})`,
      responseTime: `rgba(255, 159, 64, ${alpha})`,
      errorRate: `rgba(255, 99, 132, ${alpha})`,
      throughput: `rgba(54, 162, 235, ${alpha})`
    };
    return colors[metricKey as keyof typeof colors] || `rgba(128, 128, 128, ${alpha})`;
  };

  const getHealthStatus = () => {
    if (!currentMetrics) return 'unknown';
    
    const criticalAlerts = alerts.filter(a => a.type === 'critical').length;
    const warningAlerts = alerts.filter(a => a.type === 'warning').length;
    
    if (criticalAlerts > 0) return 'critical';
    if (warningAlerts > 0) return 'warning';
    return 'healthy';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      healthy: 'success',
      warning: 'warning',
      critical: 'danger',
      unknown: 'secondary'
    };
    return colors[status as keyof typeof colors] || 'secondary';
  };

  const chartOptions = {
    responsive: true,
    maintainAspectRatio: false,
    scales: {
      x: {
        type: 'time' as const,
        time: {
          displayFormats: {
            minute: 'HH:mm',
            hour: 'HH:mm'
          }
        }
      },
      y: {
        beginAtZero: true
      }
    },
    plugins: {
      legend: {
        display: false
      }
    }
  };

  if (isLoading) {
    return (
      <div className="text-center py-4">
        <div className="spinner-border" role="status">
          <span className="visually-hidden">Loading...</span>
        </div>
        <p className="mt-2">Loading health metrics...</p>
      </div>
    );
  }

  return (
    <div className="agent-health-monitoring">
      {/* Health Status Overview */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-center">
                <div>
                  <h5 className="card-title mb-0">Agent Health Status</h5>
                  <p className="text-muted mb-0">Real-time monitoring for Agent {agentId}</p>
                </div>
                <div className="text-end">
                  <span className={`badge bg-${getStatusColor(getHealthStatus())} fs-6`}>
                    {getHealthStatus().toUpperCase()}
                  </span>
                  <div className="small text-muted mt-1">
                    Last updated: {currentMetrics ? format(currentMetrics.timestamp, 'HH:mm:ss') : 'N/A'}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Current Metrics Cards */}
      <div className="row mb-4">
        {currentMetrics && [
          { key: 'cpuUsage', label: 'CPU Usage', unit: '%', icon: 'bi-cpu' },
          { key: 'memoryUsage', label: 'Memory Usage', unit: '%', icon: 'bi-memory' },
          { key: 'diskUsage', label: 'Disk Usage', unit: '%', icon: 'bi-hdd' },
          { key: 'responseTime', label: 'Response Time', unit: 'ms', icon: 'bi-speedometer2' }
        ].map(({ key, label, unit, icon }) => {
          const value = currentMetrics[key as keyof HealthMetric] as number;
          const isHigh = key === 'responseTime' ? value > 200 : value > 80;
          
          return (
            <div key={key} className="col-md-3 mb-3">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-center">
                    <div>
                      <h6 className="card-title text-muted mb-1">{label}</h6>
                      <h4 className={`mb-0 ${isHigh ? 'text-danger' : 'text-success'}`}>
                        {value.toFixed(1)}{unit}
                      </h4>
                    </div>
                    <i className={`${icon} display-6 text-muted`}></i>
                  </div>
                </div>
              </div>
            </div>
          );
        })}
      </div>

      {/* Metric Selection and Chart */}
      <div className="row mb-4">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <div className="d-flex justify-content-between align-items-center">
                <h6 className="mb-0">Metric Trends</h6>
                <select
                  className="form-select form-select-sm"
                  style={{ width: 'auto' }}
                  value={selectedMetric}
                  onChange={(e) => setSelectedMetric(e.target.value)}
                >
                  <option value="cpuUsage">CPU Usage</option>
                  <option value="memoryUsage">Memory Usage</option>
                  <option value="diskUsage">Disk Usage</option>
                  <option value="responseTime">Response Time</option>
                  <option value="throughput">Throughput</option>
                  <option value="errorRate">Error Rate</option>
                </select>
              </div>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <Line
                  data={getMetricChartData(selectedMetric as keyof HealthMetric)}
                  options={chartOptions}
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Alerts */}
      <div className="row">
        <div className="col-12">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Recent Alerts</h6>
            </div>
            <div className="card-body">
              {alerts.length === 0 ? (
                <div className="text-center text-muted py-3">
                  <i className="bi bi-check-circle display-4"></i>
                  <p className="mt-2">No alerts - All systems operating normally</p>
                </div>
              ) : (
                <div className="list-group list-group-flush">
                  {alerts.slice(0, 10).map(alert => (
                    <div key={alert.id} className="list-group-item d-flex justify-content-between align-items-start">
                      <div className="ms-2 me-auto">
                        <div className="d-flex align-items-center">
                          <span className={`badge bg-${alert.type === 'critical' ? 'danger' : 'warning'} me-2`}>
                            {alert.type.toUpperCase()}
                          </span>
                          <strong>{alert.metric}</strong>
                        </div>
                        <p className="mb-1">{alert.message}</p>
                        <small className="text-muted">
                          {format(alert.timestamp, 'MMM dd, HH:mm:ss')}
                        </small>
                      </div>
                      <div className="text-end">
                        <div className="small text-muted">
                          Threshold: {alert.threshold}
                        </div>
                        <div className="small">
                          Current: <strong>{alert.currentValue.toFixed(1)}</strong>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};