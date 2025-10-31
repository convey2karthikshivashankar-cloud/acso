import React, { useState, useEffect } from 'react';
import { format, subDays, subHours } from 'date-fns';
import { Bar, Line, Doughnut } from 'react-chartjs-2';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'critical' | 'high' | 'medium' | 'low';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  assignee: string;
  reporter: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  tags: string[];
  affectedSystems: string[];
  estimatedImpact: number;
  category: string;
}

interface IncidentMetrics {
  totalIncidents: number;
  openIncidents: number;
  criticalIncidents: number;
  averageResolutionTime: number;
  mttr: number; // Mean Time To Resolution
  mtbf: number; // Mean Time Between Failures
}

export const ComprehensiveIncidentDashboard: React.FC = () => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [metrics, setMetrics] = useState<IncidentMetrics | null>(null);
  const [viewMode, setViewMode] = useState<'kanban' | 'table' | 'timeline'>('kanban');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterAssignee, setFilterAssignee] = useState<string>('all');
  const [sortBy, setSortBy] = useState<'created' | 'severity' | 'status'>('created');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    // Generate sample incident data
    const sampleIncidents: Incident[] = [
      {
        id: '1',
        title: 'Database Connection Timeout',
        description: 'Multiple users reporting slow response times and connection timeouts',
        severity: 'critical',
        status: 'investigating',
        assignee: 'John Doe',
        reporter: 'System Monitor',
        createdAt: subHours(new Date(), 2),
        updatedAt: subHours(new Date(), 1),
        tags: ['database', 'performance', 'timeout'],
        affectedSystems: ['User Database', 'API Gateway'],
        estimatedImpact: 85,
        category: 'Infrastructure'
      },
      {
        id: '2',
        title: 'Suspicious Login Attempts',
        description: 'Detected multiple failed login attempts from unusual IP addresses',
        severity: 'high',
        status: 'open',
        assignee: 'Jane Smith',
        reporter: 'Security Scanner',
        createdAt: subHours(new Date(), 4),
        updatedAt: subHours(new Date(), 3),
        tags: ['security', 'authentication', 'brute-force'],
        affectedSystems: ['Authentication Service'],
        estimatedImpact: 60,
        category: 'Security'
      },
      {
        id: '3',
        title: 'API Rate Limit Exceeded',
        description: 'Third-party API calls are being rate limited, affecting data synchronization',
        severity: 'medium',
        status: 'resolved',
        assignee: 'Mike Johnson',
        reporter: 'API Monitor',
        createdAt: subHours(new Date(), 8),
        updatedAt: subHours(new Date(), 6),
        resolvedAt: subHours(new Date(), 6),
        tags: ['api', 'rate-limit', 'integration'],
        affectedSystems: ['Data Sync Service'],
        estimatedImpact: 30,
        category: 'Integration'
      },
      {
        id: '4',
        title: 'Disk Space Warning',
        description: 'Server disk usage has exceeded 85% threshold',
        severity: 'medium',
        status: 'investigating',
        assignee: 'Sarah Wilson',
        reporter: 'System Monitor',
        createdAt: subHours(new Date(), 12),
        updatedAt: subHours(new Date(), 10),
        tags: ['storage', 'capacity', 'server'],
        affectedSystems: ['Application Server'],
        estimatedImpact: 40,
        category: 'Infrastructure'
      },
      {
        id: '5',
        title: 'Email Service Outage',
        description: 'Email notifications are not being delivered to users',
        severity: 'high',
        status: 'closed',
        assignee: 'Tom Brown',
        reporter: 'User Report',
        createdAt: subDays(new Date(), 1),
        updatedAt: subDays(new Date(), 1),
        resolvedAt: subHours(new Date(), 18),
        tags: ['email', 'notifications', 'service'],
        affectedSystems: ['Email Service'],
        estimatedImpact: 70,
        category: 'Communication'
      }
    ];

    const sampleMetrics: IncidentMetrics = {
      totalIncidents: sampleIncidents.length,
      openIncidents: sampleIncidents.filter(i => i.status === 'open' || i.status === 'investigating').length,
      criticalIncidents: sampleIncidents.filter(i => i.severity === 'critical').length,
      averageResolutionTime: 4.5, // hours
      mttr: 3.2, // hours
      mtbf: 168 // hours (1 week)
    };

    setIncidents(sampleIncidents);
    setMetrics(sampleMetrics);
  }, []);

  const getSeverityColor = (severity: string) => {
    const colors = {
      critical: 'danger',
      high: 'warning',
      medium: 'info',
      low: 'secondary'
    };
    return colors[severity as keyof typeof colors] || 'secondary';
  };

  const getStatusColor = (status: string) => {
    const colors = {
      open: 'danger',
      investigating: 'warning',
      resolved: 'success',
      closed: 'secondary'
    };
    return colors[status as keyof typeof colors] || 'secondary';
  };

  const filteredIncidents = incidents.filter(incident => {
    if (filterSeverity !== 'all' && incident.severity !== filterSeverity) return false;
    if (filterStatus !== 'all' && incident.status !== filterStatus) return false;
    if (filterAssignee !== 'all' && incident.assignee !== filterAssignee) return false;
    return true;
  }).sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'created':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'severity':
        const severityOrder = { critical: 4, high: 3, medium: 2, low: 1 };
        comparison = severityOrder[a.severity] - severityOrder[b.severity];
        break;
      case 'status':
        comparison = a.status.localeCompare(b.status);
        break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const renderKanbanView = () => {
    const columns = [
      { key: 'open', title: 'Open', incidents: filteredIncidents.filter(i => i.status === 'open') },
      { key: 'investigating', title: 'Investigating', incidents: filteredIncidents.filter(i => i.status === 'investigating') },
      { key: 'resolved', title: 'Resolved', incidents: filteredIncidents.filter(i => i.status === 'resolved') },
      { key: 'closed', title: 'Closed', incidents: filteredIncidents.filter(i => i.status === 'closed') }
    ];

    return (
      <div className="row">
        {columns.map(column => (
          <div key={column.key} className="col-md-3">
            <div className="card h-100">
              <div className="card-header d-flex justify-content-between align-items-center">
                <h6 className="mb-0">{column.title}</h6>
                <span className="badge bg-secondary">{column.incidents.length}</span>
              </div>
              <div className="card-body p-2" style={{ maxHeight: '600px', overflowY: 'auto' }}>
                {column.incidents.map(incident => (
                  <div key={incident.id} className="card mb-2 shadow-sm">
                    <div className="card-body p-3">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <h6 className="card-title mb-0 small">{incident.title}</h6>
                        <span className={`badge bg-${getSeverityColor(incident.severity)}`}>
                          {incident.severity}
                        </span>
                      </div>
                      <p className="card-text small text-muted mb-2">
                        {incident.description.substring(0, 80)}...
                      </p>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          <i className="bi bi-person me-1"></i>
                          {incident.assignee}
                        </small>
                        <small className="text-muted">
                          {format(incident.createdAt, 'MMM dd, HH:mm')}
                        </small>
                      </div>
                      <div className="mt-2">
                        {incident.tags.slice(0, 2).map(tag => (
                          <span key={tag} className="badge bg-light text-dark me-1 small">
                            {tag}
                          </span>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        ))}
      </div>
    );
  };

  const renderTableView = () => (
    <div className="table-responsive">
      <table className="table table-hover">
        <thead>
          <tr>
            <th>ID</th>
            <th>Title</th>
            <th>Severity</th>
            <th>Status</th>
            <th>Assignee</th>
            <th>Created</th>
            <th>Impact</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {filteredIncidents.map(incident => (
            <tr key={incident.id}>
              <td>
                <code>{incident.id}</code>
              </td>
              <td>
                <div>
                  <strong>{incident.title}</strong>
                  <div className="small text-muted">
                    {incident.description.substring(0, 60)}...
                  </div>
                </div>
              </td>
              <td>
                <span className={`badge bg-${getSeverityColor(incident.severity)}`}>
                  {incident.severity}
                </span>
              </td>
              <td>
                <span className={`badge bg-${getStatusColor(incident.status)}`}>
                  {incident.status}
                </span>
              </td>
              <td>{incident.assignee}</td>
              <td>
                <div>{format(incident.createdAt, 'MMM dd, yyyy')}</div>
                <div className="small text-muted">{format(incident.createdAt, 'HH:mm')}</div>
              </td>
              <td>
                <div className="progress" style={{ height: '20px' }}>
                  <div 
                    className={`progress-bar bg-${incident.estimatedImpact > 70 ? 'danger' : incident.estimatedImpact > 40 ? 'warning' : 'success'}`}
                    style={{ width: `${incident.estimatedImpact}%` }}
                  >
                    {incident.estimatedImpact}%
                  </div>
                </div>
              </td>
              <td>
                <div className="btn-group btn-group-sm">
                  <button className="btn btn-outline-primary">
                    <i className="bi bi-eye"></i>
                  </button>
                  <button className="btn btn-outline-secondary">
                    <i className="bi bi-pencil"></i>
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );

  const renderTimelineView = () => (
    <div className="timeline-container">
      <div className="timeline">
        {filteredIncidents.map((incident, index) => (
          <div key={incident.id} className="timeline-item">
            <div className={`timeline-marker bg-${getSeverityColor(incident.severity)}`}>
              <i className="bi bi-exclamation-triangle text-white"></i>
            </div>
            <div className="timeline-content">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="mb-0">{incident.title}</h6>
                    <div>
                      <span className={`badge bg-${getSeverityColor(incident.severity)} me-1`}>
                        {incident.severity}
                      </span>
                      <span className={`badge bg-${getStatusColor(incident.status)}`}>
                        {incident.status}
                      </span>
                    </div>
                  </div>
                  <p className="text-muted mb-2">{incident.description}</p>
                  <div className="row">
                    <div className="col-md-6">
                      <small className="text-muted">
                        <i className="bi bi-person me-1"></i>
                        Assigned to: {incident.assignee}
                      </small>
                    </div>
                    <div className="col-md-6 text-end">
                      <small className="text-muted">
                        {format(incident.createdAt, 'MMM dd, yyyy HH:mm')}
                      </small>
                    </div>
                  </div>
                  <div className="mt-2">
                    {incident.tags.map(tag => (
                      <span key={tag} className="badge bg-light text-dark me-1">
                        {tag}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderMetricsCards = () => {
    if (!metrics) return null;

    return (
      <div className="row mb-4">
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="text-primary">{metrics.totalIncidents}</h4>
              <p className="card-text small text-muted mb-0">Total Incidents</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="text-danger">{metrics.openIncidents}</h4>
              <p className="card-text small text-muted mb-0">Open Incidents</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="text-warning">{metrics.criticalIncidents}</h4>
              <p className="card-text small text-muted mb-0">Critical</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="text-info">{metrics.averageResolutionTime}h</h4>
              <p className="card-text small text-muted mb-0">Avg Resolution</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="text-success">{metrics.mttr}h</h4>
              <p className="card-text small text-muted mb-0">MTTR</p>
            </div>
          </div>
        </div>
        <div className="col-md-2">
          <div className="card text-center">
            <div className="card-body">
              <h4 className="text-secondary">{metrics.mtbf}h</h4>
              <p className="card-text small text-muted mb-0">MTBF</p>
            </div>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="comprehensive-incident-dashboard">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Incident Management Dashboard</h4>
        <button className="btn btn-primary">
          <i className="bi bi-plus-lg me-1"></i>
          New Incident
        </button>
      </div>

      {renderMetricsCards()}

      {/* Filters and Controls */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-2">
              <label className="form-label small">View Mode</label>
              <div className="btn-group w-100">
                <button 
                  className={`btn btn-sm ${viewMode === 'kanban' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('kanban')}
                >
                  <i className="bi bi-kanban"></i>
                </button>
                <button 
                  className={`btn btn-sm ${viewMode === 'table' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('table')}
                >
                  <i className="bi bi-table"></i>
                </button>
                <button 
                  className={`btn btn-sm ${viewMode === 'timeline' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setViewMode('timeline')}
                >
                  <i className="bi bi-clock-history"></i>
                </button>
              </div>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Severity</label>
              <select 
                className="form-select form-select-sm"
                value={filterSeverity}
                onChange={(e) => setFilterSeverity(e.target.value)}
              >
                <option value="all">All Severities</option>
                <option value="critical">Critical</option>
                <option value="high">High</option>
                <option value="medium">Medium</option>
                <option value="low">Low</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Status</label>
              <select 
                className="form-select form-select-sm"
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value)}
              >
                <option value="all">All Statuses</option>
                <option value="open">Open</option>
                <option value="investigating">Investigating</option>
                <option value="resolved">Resolved</option>
                <option value="closed">Closed</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Assignee</label>
              <select 
                className="form-select form-select-sm"
                value={filterAssignee}
                onChange={(e) => setFilterAssignee(e.target.value)}
              >
                <option value="all">All Assignees</option>
                <option value="John Doe">John Doe</option>
                <option value="Jane Smith">Jane Smith</option>
                <option value="Mike Johnson">Mike Johnson</option>
                <option value="Sarah Wilson">Sarah Wilson</option>
                <option value="Tom Brown">Tom Brown</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Sort By</label>
              <select 
                className="form-select form-select-sm"
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as any)}
              >
                <option value="created">Created Date</option>
                <option value="severity">Severity</option>
                <option value="status">Status</option>
              </select>
            </div>
            <div className="col-md-2">
              <label className="form-label small">Order</label>
              <select 
                className="form-select form-select-sm"
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value as any)}
              >
                <option value="desc">Descending</option>
                <option value="asc">Ascending</option>
              </select>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="incident-content">
        {viewMode === 'kanban' && renderKanbanView()}
        {viewMode === 'table' && renderTableView()}
        {viewMode === 'timeline' && renderTimelineView()}
      </div>

      {/* Custom Styles */}
      <style jsx>{`
        .timeline {
          position: relative;
          padding-left: 30px;
        }
        .timeline::before {
          content: '';
          position: absolute;
          left: 15px;
          top: 0;
          bottom: 0;
          width: 2px;
          background: #dee2e6;
        }
        .timeline-item {
          position: relative;
          margin-bottom: 20px;
        }
        .timeline-marker {
          position: absolute;
          left: -22px;
          top: 10px;
          width: 30px;
          height: 30px;
          border-radius: 50%;
          display: flex;
          align-items: center;
          justify-content: center;
        }
        .timeline-content {
          margin-left: 20px;
        }
      `}</style>
    </div>
  );
};