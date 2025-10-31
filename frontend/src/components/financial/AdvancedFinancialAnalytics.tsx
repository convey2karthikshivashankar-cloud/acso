import React, { useState, useEffect } from 'react';
import { Line, Bar, Radar, Scatter } from 'react-chartjs-2';
import { format, subMonths, startOfMonth, endOfMonth } from 'date-fns';

interface FinancialKPI {
  id: string;
  name: string;
  value: number;
  target: number;
  unit: string;
  trend: 'up' | 'down' | 'stable';
  change: number;
  category: 'revenue' | 'cost' | 'efficiency' | 'roi';
}

interface BenchmarkData {
  metric: string;
  ourValue: number;
  industryAverage: number;
  topQuartile: number;
  unit: string;
}

interface CustomMetric {
  id: string;
  name: string;
  formula: string;
  value: number;
  description: string;
}

interface ReportTemplate {
  id: string;
  name: string;
  description: string;
  frequency: 'daily' | 'weekly' | 'monthly' | 'quarterly';
  recipients: string[];
  lastGenerated?: Date;
  nextScheduled?: Date;
}

export const AdvancedFinancialAnalytics: React.FC = () => {
  const [kpis, setKpis] = useState<FinancialKPI[]>([]);
  const [benchmarks, setBenchmarks] = useState<BenchmarkData[]>([]);
  const [customMetrics, setCustomMetrics] = useState<CustomMetric[]>([]);
  const [reportTemplates, setReportTemplates] = useState<ReportTemplate[]>([]);
  const [selectedTab, setSelectedTab] = useState<'dashboard' | 'benchmarks' | 'custom' | 'reports'>('dashboard');
  const [dateRange, setDateRange] = useState<'1m' | '3m' | '6m' | '1y'>('3m');

  useEffect(() => {
    // Generate sample KPI data
    const sampleKPIs: FinancialKPI[] = [
      {
        id: '1',
        name: 'Total Revenue',
        value: 2450000,
        target: 2500000,
        unit: 'USD',
        trend: 'up',
        change: 12.5,
        category: 'revenue'
      },
      {
        id: '2',
        name: 'Operating Costs',
        value: 1850000,
        target: 1800000,
        unit: 'USD',
        trend: 'up',
        change: 8.2,
        category: 'cost'
      },
      {
        id: '3',
        name: 'Gross Margin',
        value: 24.5,
        target: 25.0,
        unit: '%',
        trend: 'down',
        change: -2.1,
        category: 'efficiency'
      },
      {
        id: '4',
        name: 'ROI',
        value: 32.4,
        target: 30.0,
        unit: '%',
        trend: 'up',
        change: 15.8,
        category: 'roi'
      },
      {
        id: '5',
        name: 'Cost per Incident',
        value: 1250,
        target: 1000,
        unit: 'USD',
        trend: 'down',
        change: -18.5,
        category: 'efficiency'
      },
      {
        id: '6',
        name: 'Security Investment ROI',
        value: 285,
        target: 250,
        unit: '%',
        trend: 'up',
        change: 22.3,
        category: 'roi'
      }
    ];

    const sampleBenchmarks: BenchmarkData[] = [
      {
        metric: 'Security Budget as % of IT Budget',
        ourValue: 15.2,
        industryAverage: 12.8,
        topQuartile: 18.5,
        unit: '%'
      },
      {
        metric: 'Mean Time to Resolution (MTTR)',
        ourValue: 3.2,
        industryAverage: 4.8,
        topQuartile: 2.1,
        unit: 'hours'
      },
      {
        metric: 'Cost per Security Event',
        ourValue: 850,
        industryAverage: 1200,
        topQuartile: 650,
        unit: 'USD'
      },
      {
        metric: 'Security Training Hours per Employee',
        ourValue: 12,
        industryAverage: 8,
        topQuartile: 16,
        unit: 'hours'
      },
      {
        metric: 'Compliance Score',
        ourValue: 94,
        industryAverage: 87,
        topQuartile: 96,
        unit: '%'
      }
    ];

    const sampleCustomMetrics: CustomMetric[] = [
      {
        id: '1',
        name: 'Security Efficiency Index',
        formula: '(Threats Detected / Security Spend) * 1000',
        value: 2.34,
        description: 'Measures the efficiency of security investments in threat detection'
      },
      {
        id: '2',
        name: 'Incident Cost Ratio',
        formula: 'Total Incident Costs / Total Revenue * 100',
        value: 0.85,
        description: 'Percentage of revenue spent on incident response and recovery'
      },
      {
        id: '3',
        name: 'Prevention ROI',
        formula: '(Prevented Losses - Prevention Costs) / Prevention Costs * 100',
        value: 340,
        description: 'Return on investment for preventive security measures'
      }
    ];

    const sampleReportTemplates: ReportTemplate[] = [
      {
        id: '1',
        name: 'Executive Security Dashboard',
        description: 'High-level security metrics and KPIs for executive team',
        frequency: 'monthly',
        recipients: ['ceo@company.com', 'cfo@company.com', 'ciso@company.com'],
        lastGenerated: subMonths(new Date(), 1),
        nextScheduled: new Date()
      },
      {
        id: '2',
        name: 'Financial Performance Report',
        description: 'Detailed financial analysis of security investments and returns',
        frequency: 'quarterly',
        recipients: ['finance@company.com', 'security@company.com'],
        lastGenerated: subMonths(new Date(), 3),
        nextScheduled: new Date()
      },
      {
        id: '3',
        name: 'Compliance Cost Analysis',
        description: 'Analysis of compliance-related costs and efficiency metrics',
        frequency: 'monthly',
        recipients: ['compliance@company.com', 'audit@company.com'],
        lastGenerated: subMonths(new Date(), 1),
        nextScheduled: new Date()
      }
    ];

    setKpis(sampleKPIs);
    setBenchmarks(sampleBenchmarks);
    setCustomMetrics(sampleCustomMetrics);
    setReportTemplates(sampleReportTemplates);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const formatNumber = (value: number, unit: string) => {
    if (unit === 'USD') {
      return formatCurrency(value);
    } else if (unit === '%') {
      return `${value.toFixed(1)}%`;
    } else {
      return `${value.toLocaleString()} ${unit}`;
    }
  };

  const getTrendIcon = (trend: string) => {
    const icons = {
      up: 'bi-arrow-up text-success',
      down: 'bi-arrow-down text-danger',
      stable: 'bi-arrow-right text-warning'
    };
    return icons[trend as keyof typeof icons] || 'bi-arrow-right text-secondary';
  };

  const renderDashboard = () => (
    <div>
      {/* KPI Cards */}
      <div className="row mb-4">
        {kpis.map(kpi => (
          <div key={kpi.id} className="col-md-4 mb-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex justify-content-between align-items-start mb-2">
                  <h6 className="card-title mb-0">{kpi.name}</h6>
                  <span className={`badge bg-${kpi.category === 'revenue' ? 'success' : kpi.category === 'cost' ? 'danger' : kpi.category === 'efficiency' ? 'info' : 'primary'}`}>
                    {kpi.category}
                  </span>
                </div>
                <div className="d-flex justify-content-between align-items-end">
                  <div>
                    <h4 className="mb-0">{formatNumber(kpi.value, kpi.unit)}</h4>
                    <small className="text-muted">Target: {formatNumber(kpi.target, kpi.unit)}</small>
                  </div>
                  <div className="text-end">
                    <div className={`d-flex align-items-center ${kpi.change >= 0 ? 'text-success' : 'text-danger'}`}>
                      <i className={getTrendIcon(kpi.trend)}></i>
                      <span className="ms-1 small">{Math.abs(kpi.change)}%</span>
                    </div>
                  </div>
                </div>
                <div className="progress mt-2" style={{ height: '4px' }}>
                  <div 
                    className={`progress-bar bg-${kpi.value >= kpi.target ? 'success' : 'warning'}`}
                    style={{ width: `${Math.min((kpi.value / kpi.target) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Charts */}
      <div className="row">
        <div className="col-md-8">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Financial Trends</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <Line
                  data={{
                    labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun'],
                    datasets: [
                      {
                        label: 'Revenue',
                        data: [2100000, 2200000, 2300000, 2350000, 2400000, 2450000],
                        borderColor: '#28a745',
                        backgroundColor: 'rgba(40, 167, 69, 0.1)',
                        tension: 0.1
                      },
                      {
                        label: 'Costs',
                        data: [1600000, 1650000, 1700000, 1750000, 1800000, 1850000],
                        borderColor: '#dc3545',
                        backgroundColor: 'rgba(220, 53, 69, 0.1)',
                        tension: 0.1
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top'
                      }
                    },
                    scales: {
                      y: {
                        beginAtZero: true,
                        ticks: {
                          callback: function(value) {
                            return formatCurrency(value as number);
                          }
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-4">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">KPI Performance</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '300px' }}>
                <Radar
                  data={{
                    labels: kpis.map(kpi => kpi.name),
                    datasets: [{
                      label: 'Current',
                      data: kpis.map(kpi => (kpi.value / kpi.target) * 100),
                      backgroundColor: 'rgba(54, 162, 235, 0.2)',
                      borderColor: 'rgba(54, 162, 235, 1)',
                      pointBackgroundColor: 'rgba(54, 162, 235, 1)',
                    }, {
                      label: 'Target',
                      data: kpis.map(() => 100),
                      backgroundColor: 'rgba(255, 99, 132, 0.2)',
                      borderColor: 'rgba(255, 99, 132, 1)',
                      pointBackgroundColor: 'rgba(255, 99, 132, 1)',
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'bottom'
                      }
                    },
                    scales: {
                      r: {
                        beginAtZero: true,
                        max: 150
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderBenchmarks = () => (
    <div>
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">Industry Benchmarks</h6>
        </div>
        <div className="card-body">
          <div className="table-responsive">
            <table className="table">
              <thead>
                <tr>
                  <th>Metric</th>
                  <th>Our Value</th>
                  <th>Industry Average</th>
                  <th>Top Quartile</th>
                  <th>Performance</th>
                  <th>Gap Analysis</th>
                </tr>
              </thead>
              <tbody>
                {benchmarks.map((benchmark, index) => {
                  const vsIndustry = benchmark.ourValue - benchmark.industryAverage;
                  const vsTopQuartile = benchmark.ourValue - benchmark.topQuartile;
                  const isGoodMetric = benchmark.metric.includes('Score') || benchmark.metric.includes('Hours');
                  
                  return (
                    <tr key={index}>
                      <td>{benchmark.metric}</td>
                      <td>
                        <strong>{formatNumber(benchmark.ourValue, benchmark.unit)}</strong>
                      </td>
                      <td>{formatNumber(benchmark.industryAverage, benchmark.unit)}</td>
                      <td>{formatNumber(benchmark.topQuartile, benchmark.unit)}</td>
                      <td>
                        <div className="d-flex align-items-center">
                          {((isGoodMetric && vsIndustry > 0) || (!isGoodMetric && vsIndustry < 0)) ? (
                            <i className="bi bi-arrow-up text-success me-1"></i>
                          ) : (
                            <i className="bi bi-arrow-down text-danger me-1"></i>
                          )}
                          <span className={((isGoodMetric && vsIndustry > 0) || (!isGoodMetric && vsIndustry < 0)) ? 'text-success' : 'text-danger'}>
                            {Math.abs(vsIndustry).toFixed(1)} {benchmark.unit}
                          </span>
                        </div>
                      </td>
                      <td>
                        <div className="progress" style={{ height: '20px', minWidth: '100px' }}>
                          <div 
                            className={`progress-bar ${((isGoodMetric && vsTopQuartile >= 0) || (!isGoodMetric && vsTopQuartile <= 0)) ? 'bg-success' : 'bg-warning'}`}
                            style={{ 
                              width: `${Math.min(Math.abs(vsTopQuartile / benchmark.topQuartile) * 100, 100)}%` 
                            }}
                          >
                            {((isGoodMetric && vsTopQuartile >= 0) || (!isGoodMetric && vsTopQuartile <= 0)) ? 'Above' : 'Below'}
                          </div>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      <div className="row mt-4">
        <div className="col-md-12">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Benchmark Comparison Chart</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '400px' }}>
                <Bar
                  data={{
                    labels: benchmarks.map(b => b.metric),
                    datasets: [
                      {
                        label: 'Our Value',
                        data: benchmarks.map(b => b.ourValue),
                        backgroundColor: 'rgba(54, 162, 235, 0.8)'
                      },
                      {
                        label: 'Industry Average',
                        data: benchmarks.map(b => b.industryAverage),
                        backgroundColor: 'rgba(255, 206, 86, 0.8)'
                      },
                      {
                        label: 'Top Quartile',
                        data: benchmarks.map(b => b.topQuartile),
                        backgroundColor: 'rgba(75, 192, 192, 0.8)'
                      }
                    ]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                      legend: {
                        position: 'top'
                      }
                    },
                    scales: {
                      x: {
                        ticks: {
                          maxRotation: 45
                        }
                      }
                    }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderCustomMetrics = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h6>Custom Financial Metrics</h6>
        <button className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-1"></i>
          Create Metric
        </button>
      </div>

      <div className="row">
        {customMetrics.map(metric => (
          <div key={metric.id} className="col-md-4 mb-3">
            <div className="card">
              <div className="card-body">
                <h6 className="card-title">{metric.name}</h6>
                <h4 className="text-primary mb-2">{metric.value.toFixed(2)}</h4>
                <p className="card-text small text-muted mb-2">{metric.description}</p>
                <div className="bg-light p-2 rounded">
                  <small className="text-muted">Formula:</small>
                  <code className="d-block small">{metric.formula}</code>
                </div>
                <div className="mt-2">
                  <button className="btn btn-outline-primary btn-sm me-1">
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button className="btn btn-outline-secondary btn-sm">
                    <i className="bi bi-graph-up"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderReports = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h6>Automated Financial Reports</h6>
        <button className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-1"></i>
          Create Report Template
        </button>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Report Name</th>
              <th>Description</th>
              <th>Frequency</th>
              <th>Recipients</th>
              <th>Last Generated</th>
              <th>Next Scheduled</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {reportTemplates.map(template => (
              <tr key={template.id}>
                <td>
                  <strong>{template.name}</strong>
                </td>
                <td>
                  <small className="text-muted">{template.description}</small>
                </td>
                <td>
                  <span className="badge bg-info">{template.frequency}</span>
                </td>
                <td>
                  <small>{template.recipients.length} recipients</small>
                </td>
                <td>
                  {template.lastGenerated ? format(template.lastGenerated, 'MMM dd, yyyy') : 'Never'}
                </td>
                <td>
                  {template.nextScheduled ? format(template.nextScheduled, 'MMM dd, yyyy') : 'Not scheduled'}
                </td>
                <td>
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-primary" title="Generate Now">
                      <i className="bi bi-play-fill"></i>
                    </button>
                    <button className="btn btn-outline-secondary" title="Edit">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button className="btn btn-outline-info" title="Preview">
                      <i className="bi bi-eye"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <div className="row mt-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Report Generation Statistics</h6>
            </div>
            <div className="card-body">
              <div className="row text-center">
                <div className="col-4">
                  <h4 className="text-primary">{reportTemplates.length}</h4>
                  <small className="text-muted">Active Templates</small>
                </div>
                <div className="col-4">
                  <h4 className="text-success">24</h4>
                  <small className="text-muted">Reports This Month</small>
                </div>
                <div className="col-4">
                  <h4 className="text-info">156</h4>
                  <small className="text-muted">Total Recipients</small>
                </div>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Export Options</h6>
            </div>
            <div className="card-body">
              <div className="d-grid gap-2">
                <button className="btn btn-outline-primary">
                  <i className="bi bi-file-earmark-pdf me-2"></i>
                  Export to PDF
                </button>
                <button className="btn btn-outline-success">
                  <i className="bi bi-file-earmark-excel me-2"></i>
                  Export to Excel
                </button>
                <button className="btn btn-outline-info">
                  <i className="bi bi-cloud-download me-2"></i>
                  Export to Cloud Storage
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="advanced-financial-analytics">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Advanced Financial Analytics</h4>
        <div className="btn-group">
          <button className="btn btn-outline-secondary">
            <i className="bi bi-arrow-clockwise me-1"></i>
            Refresh Data
          </button>
          <button className="btn btn-outline-primary">
            <i className="bi bi-gear me-1"></i>
            Settings
          </button>
        </div>
      </div>

      {/* Date Range Selector */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-6">
              <label className="form-label">Analysis Period</label>
              <div className="btn-group">
                {(['1m', '3m', '6m', '1y'] as const).map(period => (
                  <button
                    key={period}
                    className={`btn ${dateRange === period ? 'btn-primary' : 'btn-outline-primary'}`}
                    onClick={() => setDateRange(period)}
                  >
                    {period === '1m' ? '1 Month' : period === '3m' ? '3 Months' : period === '6m' ? '6 Months' : '1 Year'}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'dashboard' ? 'active' : ''}`}
            onClick={() => setSelectedTab('dashboard')}
          >
            <i className="bi bi-speedometer2 me-1"></i>
            Dashboard
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'benchmarks' ? 'active' : ''}`}
            onClick={() => setSelectedTab('benchmarks')}
          >
            <i className="bi bi-bar-chart me-1"></i>
            Benchmarks
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'custom' ? 'active' : ''}`}
            onClick={() => setSelectedTab('custom')}
          >
            <i className="bi bi-calculator me-1"></i>
            Custom Metrics
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'reports' ? 'active' : ''}`}
            onClick={() => setSelectedTab('reports')}
          >
            <i className="bi bi-file-earmark-text me-1"></i>
            Reports
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {selectedTab === 'dashboard' && renderDashboard()}
        {selectedTab === 'benchmarks' && renderBenchmarks()}
        {selectedTab === 'custom' && renderCustomMetrics()}
        {selectedTab === 'reports' && renderReports()}
      </div>
    </div>
  );
};