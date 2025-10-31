import React, { useState, useEffect } from 'react';
import { format, subDays } from 'date-fns';

interface Incident {
  id: string;
  title: string;
  description: string;
  severity: 'low' | 'medium' | 'high' | 'critical';
  status: 'open' | 'investigating' | 'resolved' | 'closed';
  category: 'security' | 'performance' | 'availability' | 'data';
  assignee?: string;
  reporter: string;
  createdAt: Date;
  updatedAt: Date;
  resolvedAt?: Date;
  tags: string[];
  affectedSystems: string[];
  priority: number;
}

interface IncidentDashboardProps {
  onIncidentSelect?: (incident: Incident) => void;
  onIncidentCreate?: () => void;
}

type ViewMode = 'kanban' | 'table' | 'timeline';

export const IncidentDashboard: React.FC<IncidentDashboardProps> = ({
  onIncidentSelect,
  onIncidentCreate
}) => {
  const [incidents, setIncidents] = useState<Incident[]>([]);
  const [viewMode, setViewMode] = useState<ViewMode>('kanban');
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [filterSeverity, setFilterSeverity] = useState<string>('all');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [sortBy, setSortBy] = useState<'createdAt' | 'updatedAt' | 'priority'>('createdAt');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  // Generate sample incidents
  useEffect(() => {
    const sampleIncidents: Incident[] = [
      {
        id: '1',
        title: 'Database Connection Timeout',
        description: 'Multiple users reporting slow response times and connection timeouts to the main database.',
        severity: 'high',
        status: 'investigating',
        category: 'performance',
        assignee: 'John Doe',
        reporter: 'System Monitor',
        createdAt: subDays(new Date(), 1),
        updatedAt: new Date(),
        tags: ['database', 'performance', 'timeout'],
        affectedSystems: ['Database Server', 'Web Application'],
        priority: 1
      },
      {
        id: '2',
        title: 'Suspicious Login Attempts',
        description: 'Detected multiple failed login attempts from unusual IP addresses.',
        severity: 'critical',
        status: 'open',
        category: 'security',
        reporter: 'Security Scanner',
        createdAt: subDays(new Date(), 0.5),
        updatedAt: subDays(new Date(), 0.2),
        tags: ['security', 'authentication', 'brute-force'],
        affectedSystems: ['Authentication Service', 'User Portal'],
        priority: 1
      },
      {
        id: '3',
        title: 'API Rate Limit Exceeded',
        description: 'Third-party API integration hitting rate limits causing service degradation.',
        severity: 'medium',
        status: 'resolved',
        category: 'availability',
        assignee: 'Jane Smith',
        reporter: 'API Monitor',
        createdAt: subDays(new Date(), 2),
        updatedAt: subDays(new Date(), 1),
        resolvedAt: subDays(new Date(), 1),
        tags: ['api', 'rate-limit', 'integration'],
        affectedSystems: ['External API', 'Integration Service'],
        priority: 2
      },
      {
        id: '4',
        title: 'Data Synchronization Error',
        description: 'Customer data not syncing properly between systems.',
        severity: 'medium',
        status: 'investigating',
        category: 'data',
        assignee: 'Bob Johnson',
        reporter: 'Data Team',
        createdAt: subDays(new Date(), 3),
        updatedAt: subDays(new Date(), 0.5),
        tags: ['data', 'synchronization', 'customer'],
        affectedSystems: ['CRM System', 'Data Warehouse'],
        priority: 3
      },
      {
        id: '5',
        title: 'SSL Certificate Expiring',
        description: 'SSL certificate for main domain expires in 7 days.',
        severity: 'low',
        status: 'open',
        category: 'security',
        reporter: 'Certificate Monitor',
        createdAt: subDays(new Date(), 7),
        updatedAt: subDays(new Date(), 7),
        tags: ['ssl', 'certificate', 'expiration'],
        affectedSystems: ['Web Server', 'Load Balancer'],
        priority: 4
      }
    ];
    
    setIncidents(sampleIncidents);
  }, []);

  const getSeverityColor = (severity: string) => {
    const colors = {
      low: 'success',
      medium: 'warning',
      high: 'danger',
      critical: 'danger'
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

  const getCategoryIcon = (category: string) => {
    const icons = {
      security: 'bi-shield-exclamation',
      performance: 'bi-speedometer2',
      availability: 'bi-server',
      data: 'bi-database'
    };
    return icons[category as keyof typeof icons] || 'bi-exclamation-circle';
  };

  const filteredIncidents = incidents.filter(incident => {
    const matchesStatus = filterStatus === 'all' || incident.status === filterStatus;
    const matchesSeverity = filterSeverity === 'all' || incident.severity === filterSeverity;
    const matchesCategory = filterCategory === 'all' || incident.category === filterCategory;
    const matchesSearch = !searchTerm || 
      incident.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
      incident.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()));
    
    return matchesStatus && matchesSeverity && matchesCategory && matchesSearch;
  }).sort((a, b) => {
    const aValue = a[sortBy];
    const bValue = b[sortBy];
    
    if (sortBy === 'priority') {
      return sortOrder === 'asc' ? aValue - bValue : bValue - aValue;
    } else {
      const aTime = aValue instanceof Date ? aValue.getTime() : 0;
      const bTime = bValue instanceof Date ? bValue.getTime() : 0;
      return sortOrder === 'asc' ? aTime - bTime : bTime - aTime;
    }
  });

  const getIncidentsByStatus = () => {
    const statuses = ['open', 'investigating', 'resolved', 'closed'];
    return statuses.map(status => ({
      status,
      incidents: filteredIncidents.filter(incident => incident.status === status)
    }));
  };

  const renderKanbanView = () => {
    const columns = getIncidentsByStatus();
    
    return (
      <div className="row">
        {columns.map(({ status, incidents: statusIncidents }) => (
          <div key={status} className="col-md-3">
            <div className="card">
              <div className="card-header">
                <h6 className="mb-0 d-flex justify-content-between align-items-center">
                  <span className="text-capitalize">{status}</span>
                  <span className={`badge bg-${getStatusColor(status)}`}>
                    {statusIncidents.length}
                  </span>
                </h6>
              </div>
              <div className="card-body p-2" style={{ minHeight: '400px' }}>
                {statusIncidents.map(incident => (
                  <div
                    key={incident.id}
                    className="card mb-2 cursor-pointer"
                    onClick={() => onIncidentSelect?.(incident)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className="card-body p-2">
                      <div className="d-flex justify-content-between align-items-start mb-2">
                        <span className={`badge bg-${getSeverityColor(incident.severity)} text-white`}>
                          {incident.severity}
                        </span>
                        <i className={`${getCategoryIcon(incident.category)} text-muted`}></i>
                      </div>
                      <h6 className="card-title small mb-1">{incident.title}</h6>
                      <p className="card-text small text-muted mb-2">
                        {incident.description.substring(0, 80)}...
                      </p>
                      <div className="d-flex justify-content-between align-items-center">
                        <small className="text-muted">
                          {format(incident.createdAt, 'MMM dd')}
                        </small>
                        {incident.assignee && (
                          <small className="text-primary">
                            {incident.assignee.split(' ').map(n => n[0]).join('')}
                          </small>
                        )}
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

  const renderTableView = () => {
    return (
      <div className="card">
        <div className="card-body p-0">
          <div className="table-responsive">
            <table className="table table-hover mb-0">
              <thead className="table-light">
                <tr>
                  <th>ID</th>
                  <th>Title</th>
                  <th>Severity</th>
                  <th>Status</th>
                  <th>Category</th>
                  <th>Assignee</th>
                  <th>Created</th>
                  <th>Updated</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {filteredIncidents.map(incident => (
                  <tr
                    key={incident.id}
                    onClick={() => onIncidentSelect?.(incident)}
                    style={{ cursor: 'pointer' }}
                  >
                    <td>#{incident.id}</td>
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
                    <td>
                      <i className={`${getCategoryIcon(incident.category)} me-1`}></i>
                      {incident.category}
                    </td>
                    <td>{incident.assignee || 'Unassigned'}</td>
                    <td>{format(incident.createdAt, 'MMM dd, HH:mm')}</td>
                    <td>{format(incident.updatedAt, 'MMM dd, HH:mm')}</td>
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
        </div>
      </div>
    );
  };

  const renderTimelineView = () => {
    return (
      <div className="card">
        <div className="card-body">
          <div className="timeline">
            {filteredIncidents.map((incident, index) => (
              <div key={incident.id} className="timeline-item">
                <div className="timeline-marker">
                  <i className={`${getCategoryIcon(incident.category)} text-${getSeverityColor(incident.severity)}`}></i>
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
                      <div className="d-flex justify-content-between align-items-center">
                        <div className="small text-muted">
                          <i className="bi bi-person me-1"></i>
                          {incident.assignee || 'Unassigned'}
                        </div>
                        <div className="small text-muted">
                          {format(incident.createdAt, 'MMM dd, yyyy HH:mm')}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="incident-dashboard">
      {/* Header */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h4 className="mb-0">Incident Management</h4>
          <p className="text-muted mb-0">Monitor and manage security incidents</p>
        </div>
        <button
          className="btn btn-primary"
          onClick={onIncidentCreate}
        >
          <i className="bi bi-plus-lg me-2"></i>
          Create Incident
        </button>
      </div>

      {/* Statistics Cards */}
      <div className="row mb-4">
        {[
          { label: 'Open', count: incidents.filter(i => i.status === 'open').length, color: 'danger' },
          { label: 'Investigating', count: incidents.filter(i => i.status === 'investigating').length, color: 'warning' },
          { label: 'Resolved', count: incidents.filter(i => i.status === 'resolved').length, color: 'success' },
          { label: 'Critical', count: incidents.filter(i => i.severity === 'critical').length, color: 'danger' }
        ].map(({ label, count, color }) => (
          <div key={label} className="col-md-3">
            <div className="card">
              <div className="card-body text-center">
                <h3 className={`text-${color} mb-1`}>{count}</h3>
                <p className="text-muted mb-0">{label}</p>
              </div>
            </div>
          </div>
        ))}
      </div>

      {/* Filters and Controls */}
      <div className="card mb-4">
        <div className="card-body">
          <div className="row align-items-center">
            <div className="col-md-2">
              <label className="form-label">View Mode</label>
              <div className="btn-group w-100" role="group">
                <input
                  type="radio"
                  className="btn-check"
                  name="viewMode"
                  id="kanban"
                  checked={viewMode === 'kanban'}
                  onChange={() => setViewMode('kanban')}
                />
                <label className="btn btn-outline-primary" htmlFor="kanban">
                  <i className="bi bi-kanban"></i>
                </label>
                
                <input
                  type="radio"
                  className="btn-check"
                  name="viewMode"
                  id="table"
                  checked={viewMode === 'table'}
                  onChange={() => setViewMode('table')}
                />
                <label className="btn btn-outline-primary" htmlFor="table">
                  <i className="bi bi-table"></i>
                </label>
                
                <input
                  type="radio"
                  className="btn-check"
                  name="viewMode"
                  id="timeline"
                  checked={viewMode === 'timeline'}
                  onChange={() => setViewMode('timeline')}
                />
                <label className="btn btn-outline-primary" htmlFor="timeline">
                  <i className="bi bi-clock-history"></i>
                </label>
              </div>
            </div>
            
            <div className="col-md-2">
              <label className="form-label">Status</label>
              <select
                className="form-select"
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
              <label className="form-label">Severity</label>
              <select
                className="form-select"
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
              <label className="form-label">Category</label>
              <select
                className="form-select"
                value={filterCategory}
                onChange={(e) => setFilterCategory(e.target.value)}
              >
                <option value="all">All Categories</option>
                <option value="security">Security</option>
                <option value="performance">Performance</option>
                <option value="availability">Availability</option>
                <option value="data">Data</option>
              </select>
            </div>
            
            <div className="col-md-4">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search incidents..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      {viewMode === 'kanban' && renderKanbanView()}
      {viewMode === 'table' && renderTableView()}
      {viewMode === 'timeline' && renderTimelineView()}

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
          background: white;
          border: 2px solid #dee2e6;
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