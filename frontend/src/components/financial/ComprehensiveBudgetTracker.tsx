import React, { useState, useEffect } from 'react';
import { Line, Bar, Doughnut } from 'react-chartjs-2';
import { format, startOfMonth, endOfMonth, subMonths, addMonths } from 'date-fns';

interface BudgetCategory {
  id: string;
  name: string;
  allocated: number;
  spent: number;
  remaining: number;
  percentage: number;
  status: 'on-track' | 'warning' | 'over-budget';
  subcategories?: BudgetCategory[];
}

interface BudgetPeriod {
  id: string;
  name: string;
  startDate: Date;
  endDate: Date;
  totalBudget: number;
  totalSpent: number;
  status: 'active' | 'completed' | 'future';
}

interface Forecast {
  month: string;
  projected: number;
  actual?: number;
  variance?: number;
}

export const ComprehensiveBudgetTracker: React.FC = () => {
  const [selectedPeriod, setSelectedPeriod] = useState<string>('current');
  const [budgetCategories, setBudgetCategories] = useState<BudgetCategory[]>([]);
  const [budgetPeriods, setBudgetPeriods] = useState<BudgetPeriod[]>([]);
  const [forecasts, setForecasts] = useState<Forecast[]>([]);
  const [viewMode, setViewMode] = useState<'overview' | 'detailed' | 'forecast'>('overview');

  useEffect(() => {
    // Generate sample budget data
    const sampleCategories: BudgetCategory[] = [
      {
        id: '1',
        name: 'Security Infrastructure',
        allocated: 500000,
        spent: 425000,
        remaining: 75000,
        percentage: 85,
        status: 'warning',
        subcategories: [
          {
            id: '1a',
            name: 'SIEM Licenses',
            allocated: 200000,
            spent: 180000,
            remaining: 20000,
            percentage: 90,
            status: 'warning'
          },
          {
            id: '1b',
            name: 'Endpoint Protection',
            allocated: 150000,
            spent: 120000,
            remaining: 30000,
            percentage: 80,
            status: 'on-track'
          },
          {
            id: '1c',
            name: 'Network Security',
            allocated: 150000,
            spent: 125000,
            remaining: 25000,
            percentage: 83,
            status: 'on-track'
          }
        ]
      },
      {
        id: '2',
        name: 'Personnel & Training',
        allocated: 800000,
        spent: 600000,
        remaining: 200000,
        percentage: 75,
        status: 'on-track',
        subcategories: [
          {
            id: '2a',
            name: 'Security Team Salaries',
            allocated: 600000,
            spent: 450000,
            remaining: 150000,
            percentage: 75,
            status: 'on-track'
          },
          {
            id: '2b',
            name: 'Training & Certifications',
            allocated: 100000,
            spent: 75000,
            remaining: 25000,
            percentage: 75,
            status: 'on-track'
          },
          {
            id: '2c',
            name: 'Consulting Services',
            allocated: 100000,
            spent: 75000,
            remaining: 25000,
            percentage: 75,
            status: 'on-track'
          }
        ]
      },
      {
        id: '3',
        name: 'Incident Response',
        allocated: 200000,
        spent: 220000,
        remaining: -20000,
        percentage: 110,
        status: 'over-budget',
        subcategories: [
          {
            id: '3a',
            name: 'Emergency Response',
            allocated: 100000,
            spent: 120000,
            remaining: -20000,
            percentage: 120,
            status: 'over-budget'
          },
          {
            id: '3b',
            name: 'Forensic Analysis',
            allocated: 50000,
            spent: 45000,
            remaining: 5000,
            percentage: 90,
            status: 'on-track'
          },
          {
            id: '3c',
            name: 'Recovery Operations',
            allocated: 50000,
            spent: 55000,
            remaining: -5000,
            percentage: 110,
            status: 'over-budget'
          }
        ]
      },
      {
        id: '4',
        name: 'Compliance & Audit',
        allocated: 150000,
        spent: 90000,
        remaining: 60000,
        percentage: 60,
        status: 'on-track'
      }
    ];

    const samplePeriods: BudgetPeriod[] = [
      {
        id: 'current',
        name: 'Q4 2024',
        startDate: new Date(2024, 9, 1),
        endDate: new Date(2024, 11, 31),
        totalBudget: 1650000,
        totalSpent: 1335000,
        status: 'active'
      },
      {
        id: 'previous',
        name: 'Q3 2024',
        startDate: new Date(2024, 6, 1),
        endDate: new Date(2024, 8, 30),
        totalBudget: 1500000,
        totalSpent: 1450000,
        status: 'completed'
      },
      {
        id: 'next',
        name: 'Q1 2025',
        startDate: new Date(2025, 0, 1),
        endDate: new Date(2025, 2, 31),
        totalBudget: 1800000,
        totalSpent: 0,
        status: 'future'
      }
    ];

    const sampleForecasts: Forecast[] = [
      { month: 'Oct 2024', projected: 450000, actual: 445000, variance: -5000 },
      { month: 'Nov 2024', projected: 440000, actual: 450000, variance: 10000 },
      { month: 'Dec 2024', projected: 460000, actual: undefined },
      { month: 'Jan 2025', projected: 480000, actual: undefined },
      { month: 'Feb 2025', projected: 470000, actual: undefined },
      { month: 'Mar 2025', projected: 490000, actual: undefined }
    ];

    setBudgetCategories(sampleCategories);
    setBudgetPeriods(samplePeriods);
    setForecasts(sampleForecasts);
  }, []);

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(amount);
  };

  const getStatusColor = (status: string) => {
    const colors = {
      'on-track': 'success',
      'warning': 'warning',
      'over-budget': 'danger'
    };
    return colors[status as keyof typeof colors] || 'secondary';
  };

  const renderOverviewMode = () => {
    const totalAllocated = budgetCategories.reduce((sum, cat) => sum + cat.allocated, 0);
    const totalSpent = budgetCategories.reduce((sum, cat) => sum + cat.spent, 0);
    const totalRemaining = totalAllocated - totalSpent;

    return (
      <div>
        {/* Summary Cards */}
        <div className="row mb-4">
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h4 className="text-primary">{formatCurrency(totalAllocated)}</h4>
                <p className="card-text text-muted mb-0">Total Budget</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h4 className="text-info">{formatCurrency(totalSpent)}</h4>
                <p className="card-text text-muted mb-0">Total Spent</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h4 className={`text-${totalRemaining >= 0 ? 'success' : 'danger'}`}>
                  {formatCurrency(totalRemaining)}
                </h4>
                <p className="card-text text-muted mb-0">Remaining</p>
              </div>
            </div>
          </div>
          <div className="col-md-3">
            <div className="card text-center">
              <div className="card-body">
                <h4 className="text-secondary">
                  {Math.round((totalSpent / totalAllocated) * 100)}%
                </h4>
                <p className="card-text text-muted mb-0">Utilization</p>
              </div>
            </div>
          </div>
        </div>

        {/* Budget Categories */}
        <div className="row">
          <div className="col-md-8">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Budget Categories</h6>
              </div>
              <div className="card-body">
                {budgetCategories.map(category => (
                  <div key={category.id} className="mb-3">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <span className="fw-medium">{category.name}</span>
                      <div className="d-flex align-items-center">
                        <span className="me-2">{formatCurrency(category.spent)} / {formatCurrency(category.allocated)}</span>
                        <span className={`badge bg-${getStatusColor(category.status)}`}>
                          {category.percentage}%
                        </span>
                      </div>
                    </div>
                    <div className="progress" style={{ height: '8px' }}>
                      <div 
                        className={`progress-bar bg-${getStatusColor(category.status)}`}
                        style={{ width: `${Math.min(category.percentage, 100)}%` }}
                      ></div>
                    </div>
                    <div className="d-flex justify-content-between mt-1">
                      <small className="text-muted">
                        Remaining: {formatCurrency(category.remaining)}
                      </small>
                      <small className={`text-${category.remaining >= 0 ? 'success' : 'danger'}`}>
                        {category.remaining >= 0 ? '+' : ''}{formatCurrency(category.remaining)}
                      </small>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0">Budget Distribution</h6>
              </div>
              <div className="card-body">
                <div style={{ height: '300px' }}>
                  <Doughnut
                    data={{
                      labels: budgetCategories.map(cat => cat.name),
                      datasets: [{
                        data: budgetCategories.map(cat => cat.allocated),
                        backgroundColor: [
                          '#FF6384',
                          '#36A2EB',
                          '#FFCE56',
                          '#4BC0C0',
                          '#9966FF'
                        ]
                      }]
                    }}
                    options={{
                      responsive: true,
                      maintainAspectRatio: false,
                      plugins: {
                        legend: {
                          position: 'bottom'
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
  };

  const renderDetailedMode = () => (
    <div>
      {budgetCategories.map(category => (
        <div key={category.id} className="card mb-4">
          <div className="card-header">
            <div className="d-flex justify-content-between align-items-center">
              <h6 className="mb-0">{category.name}</h6>
              <span className={`badge bg-${getStatusColor(category.status)}`}>
                {category.status.replace('-', ' ').toUpperCase()}
              </span>
            </div>
          </div>
          <div className="card-body">
            <div className="row mb-3">
              <div className="col-md-3">
                <div className="text-center">
                  <h5 className="text-primary">{formatCurrency(category.allocated)}</h5>
                  <small className="text-muted">Allocated</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center">
                  <h5 className="text-info">{formatCurrency(category.spent)}</h5>
                  <small className="text-muted">Spent</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center">
                  <h5 className={`text-${category.remaining >= 0 ? 'success' : 'danger'}`}>
                    {formatCurrency(category.remaining)}
                  </h5>
                  <small className="text-muted">Remaining</small>
                </div>
              </div>
              <div className="col-md-3">
                <div className="text-center">
                  <h5 className="text-secondary">{category.percentage}%</h5>
                  <small className="text-muted">Utilization</small>
                </div>
              </div>
            </div>

            {category.subcategories && (
              <div>
                <h6 className="mb-3">Subcategories</h6>
                <div className="table-responsive">
                  <table className="table table-sm">
                    <thead>
                      <tr>
                        <th>Name</th>
                        <th>Allocated</th>
                        <th>Spent</th>
                        <th>Remaining</th>
                        <th>Status</th>
                        <th>Progress</th>
                      </tr>
                    </thead>
                    <tbody>
                      {category.subcategories.map(sub => (
                        <tr key={sub.id}>
                          <td>{sub.name}</td>
                          <td>{formatCurrency(sub.allocated)}</td>
                          <td>{formatCurrency(sub.spent)}</td>
                          <td className={sub.remaining >= 0 ? 'text-success' : 'text-danger'}>
                            {formatCurrency(sub.remaining)}
                          </td>
                          <td>
                            <span className={`badge bg-${getStatusColor(sub.status)}`}>
                              {sub.status}
                            </span>
                          </td>
                          <td>
                            <div className="progress" style={{ height: '20px', minWidth: '100px' }}>
                              <div 
                                className={`progress-bar bg-${getStatusColor(sub.status)}`}
                                style={{ width: `${Math.min(sub.percentage, 100)}%` }}
                              >
                                {sub.percentage}%
                              </div>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        </div>
      ))}
    </div>
  );

  const renderForecastMode = () => (
    <div>
      <div className="card mb-4">
        <div className="card-header">
          <h6 className="mb-0">Budget Forecast & Trends</h6>
        </div>
        <div className="card-body">
          <div style={{ height: '400px' }}>
            <Line
              data={{
                labels: forecasts.map(f => f.month),
                datasets: [
                  {
                    label: 'Projected',
                    data: forecasts.map(f => f.projected),
                    borderColor: '#36A2EB',
                    backgroundColor: 'rgba(54, 162, 235, 0.1)',
                    tension: 0.1
                  },
                  {
                    label: 'Actual',
                    data: forecasts.map(f => f.actual || null),
                    borderColor: '#FF6384',
                    backgroundColor: 'rgba(255, 99, 132, 0.1)',
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

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Variance Analysis</h6>
            </div>
            <div className="card-body">
              <div className="table-responsive">
                <table className="table table-sm">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Projected</th>
                      <th>Actual</th>
                      <th>Variance</th>
                    </tr>
                  </thead>
                  <tbody>
                    {forecasts.filter(f => f.actual !== undefined).map(forecast => (
                      <tr key={forecast.month}>
                        <td>{forecast.month}</td>
                        <td>{formatCurrency(forecast.projected)}</td>
                        <td>{formatCurrency(forecast.actual!)}</td>
                        <td className={forecast.variance! >= 0 ? 'text-danger' : 'text-success'}>
                          {forecast.variance! >= 0 ? '+' : ''}{formatCurrency(forecast.variance!)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Budget Alerts</h6>
            </div>
            <div className="card-body">
              <div className="alert alert-warning">
                <i className="bi bi-exclamation-triangle me-2"></i>
                <strong>Security Infrastructure</strong> is at 85% utilization
              </div>
              <div className="alert alert-danger">
                <i className="bi bi-exclamation-circle me-2"></i>
                <strong>Incident Response</strong> is over budget by {formatCurrency(20000)}
              </div>
              <div className="alert alert-info">
                <i className="bi bi-info-circle me-2"></i>
                <strong>Compliance & Audit</strong> has {formatCurrency(60000)} remaining
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="comprehensive-budget-tracker">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Budget Tracking & Analysis</h4>
        <div className="btn-group">
          <button className="btn btn-outline-primary">
            <i className="bi bi-download me-1"></i>
            Export Report
          </button>
          <button className="btn btn-primary">
            <i className="bi bi-plus-lg me-1"></i>
            Add Budget Item
          </button>
        </div>
      </div>

      {/* Period Selector */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-4">
              <label className="form-label">Budget Period</label>
              <select 
                className="form-select"
                value={selectedPeriod}
                onChange={(e) => setSelectedPeriod(e.target.value)}
              >
                {budgetPeriods.map(period => (
                  <option key={period.id} value={period.id}>
                    {period.name} ({format(period.startDate, 'MMM dd')} - {format(period.endDate, 'MMM dd, yyyy')})
                  </option>
                ))}
              </select>
            </div>
            <div className="col-md-8">
              <label className="form-label">View Mode</label>
              <div className="btn-group w-100">
                <button 
                  className={`btn ${viewMode === 'overview' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('overview')}
                >
                  <i className="bi bi-grid me-1"></i>
                  Overview
                </button>
                <button 
                  className={`btn ${viewMode === 'detailed' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('detailed')}
                >
                  <i className="bi bi-list-ul me-1"></i>
                  Detailed
                </button>
                <button 
                  className={`btn ${viewMode === 'forecast' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('forecast')}
                >
                  <i className="bi bi-graph-up me-1"></i>
                  Forecast
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'overview' && renderOverviewMode()}
      {viewMode === 'detailed' && renderDetailedMode()}
      {viewMode === 'forecast' && renderForecastMode()}
    </div>
  );
};