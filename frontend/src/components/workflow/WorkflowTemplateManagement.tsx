import React, { useState, useEffect } from 'react';
import { format, addDays, addWeeks, addMonths } from 'date-fns';

interface WorkflowTemplate {
  id: string;
  name: string;
  description: string;
  category: string;
  version: string;
  author: string;
  tags: string[];
  isPublic: boolean;
  usageCount: number;
  rating: number;
  createdAt: Date;
  updatedAt: Date;
  thumbnail?: string;
  complexity: 'simple' | 'medium' | 'complex';
  estimatedDuration: number; // in minutes
}

interface ScheduledWorkflow {
  id: string;
  templateId: string;
  templateName: string;
  name: string;
  schedule: {
    type: 'once' | 'recurring';
    cronExpression?: string;
    startDate: Date;
    endDate?: Date;
    timezone: string;
  };
  parameters: Record<string, any>;
  isActive: boolean;
  lastRun?: Date;
  nextRun?: Date;
  runCount: number;
  successCount: number;
  failureCount: number;
}

interface WorkflowDependency {
  id: string;
  name: string;
  type: 'workflow' | 'condition' | 'time';
  config: Record<string, any>;
}

export const WorkflowTemplateManagement: React.FC = () => {
  const [templates, setTemplates] = useState<WorkflowTemplate[]>([]);
  const [scheduledWorkflows, setScheduledWorkflows] = useState<ScheduledWorkflow[]>([]);
  const [selectedTab, setSelectedTab] = useState<'templates' | 'scheduled' | 'dependencies'>('templates');
  const [filterCategory, setFilterCategory] = useState<string>('all');
  const [filterComplexity, setFilterComplexity] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState<string>('');
  const [sortBy, setSortBy] = useState<'name' | 'created' | 'usage' | 'rating'>('name');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [showScheduleModal, setShowScheduleModal] = useState(false);
  const [selectedTemplate, setSelectedTemplate] = useState<WorkflowTemplate | null>(null);

  useEffect(() => {
    // Generate sample template data
    const sampleTemplates: WorkflowTemplate[] = [
      {
        id: '1',
        name: 'Incident Response Automation',
        description: 'Automated incident detection, analysis, and initial response workflow',
        category: 'Security',
        version: '2.1',
        author: 'Security Team',
        tags: ['incident', 'security', 'automation', 'response'],
        isPublic: true,
        usageCount: 156,
        rating: 4.8,
        createdAt: new Date(2024, 0, 15),
        updatedAt: new Date(2024, 9, 20),
        complexity: 'medium',
        estimatedDuration: 45
      },
      {
        id: '2',
        name: 'Vulnerability Assessment',
        description: 'Comprehensive vulnerability scanning and reporting workflow',
        category: 'Security',
        version: '1.5',
        author: 'DevSecOps Team',
        tags: ['vulnerability', 'scanning', 'assessment', 'reporting'],
        isPublic: true,
        usageCount: 89,
        rating: 4.6,
        createdAt: new Date(2024, 1, 10),
        updatedAt: new Date(2024, 8, 15),
        complexity: 'complex',
        estimatedDuration: 120
      },
      {
        id: '3',
        name: 'User Onboarding',
        description: 'Automated user account creation and access provisioning',
        category: 'HR',
        version: '3.0',
        author: 'IT Operations',
        tags: ['onboarding', 'user', 'access', 'provisioning'],
        isPublic: false,
        usageCount: 234,
        rating: 4.9,
        createdAt: new Date(2024, 2, 5),
        updatedAt: new Date(2024, 10, 1),
        complexity: 'simple',
        estimatedDuration: 15
      },
      {
        id: '4',
        name: 'Compliance Audit',
        description: 'Automated compliance checking and audit trail generation',
        category: 'Compliance',
        version: '1.8',
        author: 'Compliance Team',
        tags: ['compliance', 'audit', 'reporting', 'governance'],
        isPublic: true,
        usageCount: 67,
        rating: 4.4,
        createdAt: new Date(2024, 3, 20),
        updatedAt: new Date(2024, 9, 10),
        complexity: 'complex',
        estimatedDuration: 90
      },
      {
        id: '5',
        name: 'Backup Verification',
        description: 'Automated backup integrity checking and notification workflow',
        category: 'Operations',
        version: '2.3',
        author: 'Infrastructure Team',
        tags: ['backup', 'verification', 'integrity', 'monitoring'],
        isPublic: true,
        usageCount: 145,
        rating: 4.7,
        createdAt: new Date(2024, 4, 12),
        updatedAt: new Date(2024, 10, 5),
        complexity: 'medium',
        estimatedDuration: 30
      }
    ];

    const sampleScheduledWorkflows: ScheduledWorkflow[] = [
      {
        id: '1',
        templateId: '2',
        templateName: 'Vulnerability Assessment',
        name: 'Weekly Security Scan',
        schedule: {
          type: 'recurring',
          cronExpression: '0 2 * * 1',
          startDate: new Date(2024, 0, 1),
          timezone: 'UTC'
        },
        parameters: { scanType: 'full', targets: ['production'] },
        isActive: true,
        lastRun: new Date(2024, 10, 25),
        nextRun: addWeeks(new Date(), 1),
        runCount: 45,
        successCount: 43,
        failureCount: 2
      },
      {
        id: '2',
        templateId: '4',
        templateName: 'Compliance Audit',
        name: 'Monthly Compliance Check',
        schedule: {
          type: 'recurring',
          cronExpression: '0 0 1 * *',
          startDate: new Date(2024, 0, 1),
          timezone: 'UTC'
        },
        parameters: { auditType: 'full', departments: ['all'] },
        isActive: true,
        lastRun: new Date(2024, 10, 1),
        nextRun: addMonths(new Date(), 1),
        runCount: 11,
        successCount: 11,
        failureCount: 0
      },
      {
        id: '3',
        templateId: '5',
        templateName: 'Backup Verification',
        name: 'Daily Backup Check',
        schedule: {
          type: 'recurring',
          cronExpression: '0 6 * * *',
          startDate: new Date(2024, 0, 1),
          timezone: 'UTC'
        },
        parameters: { backupType: 'incremental' },
        isActive: true,
        lastRun: new Date(),
        nextRun: addDays(new Date(), 1),
        runCount: 305,
        successCount: 298,
        failureCount: 7
      }
    ];

    setTemplates(sampleTemplates);
    setScheduledWorkflows(sampleScheduledWorkflows);
  }, []);

  const getComplexityColor = (complexity: string) => {
    const colors = {
      simple: 'success',
      medium: 'warning',
      complex: 'danger'
    };
    return colors[complexity as keyof typeof colors] || 'secondary';
  };

  const getCategoryIcon = (category: string) => {
    const icons = {
      Security: 'bi-shield-check',
      HR: 'bi-people',
      Compliance: 'bi-clipboard-check',
      Operations: 'bi-gear',
      Finance: 'bi-currency-dollar'
    };
    return icons[category as keyof typeof icons] || 'bi-folder';
  };

  const filteredTemplates = templates.filter(template => {
    if (filterCategory !== 'all' && template.category !== filterCategory) return false;
    if (filterComplexity !== 'all' && template.complexity !== filterComplexity) return false;
    if (searchTerm && !template.name.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !template.description.toLowerCase().includes(searchTerm.toLowerCase()) &&
        !template.tags.some(tag => tag.toLowerCase().includes(searchTerm.toLowerCase()))) return false;
    return true;
  }).sort((a, b) => {
    let comparison = 0;
    switch (sortBy) {
      case 'name':
        comparison = a.name.localeCompare(b.name);
        break;
      case 'created':
        comparison = a.createdAt.getTime() - b.createdAt.getTime();
        break;
      case 'usage':
        comparison = a.usageCount - b.usageCount;
        break;
      case 'rating':
        comparison = a.rating - b.rating;
        break;
    }
    return sortOrder === 'desc' ? -comparison : comparison;
  });

  const renderTemplateCard = (template: WorkflowTemplate) => (
    <div key={template.id} className="col-md-6 col-lg-4 mb-4">
      <div className="card h-100">
        <div className="card-header d-flex justify-content-between align-items-start">
          <div className="d-flex align-items-center">
            <i className={`${getCategoryIcon(template.category)} me-2 text-primary`}></i>
            <div>
              <h6 className="mb-0">{template.name}</h6>
              <small className="text-muted">v{template.version}</small>
            </div>
          </div>
          <div className="d-flex align-items-center">
            <span className={`badge bg-${getComplexityColor(template.complexity)} me-1`}>
              {template.complexity}
            </span>
            {!template.isPublic && (
              <i className="bi bi-lock text-muted" title="Private"></i>
            )}
          </div>
        </div>
        <div className="card-body">
          <p className="card-text small text-muted mb-3">{template.description}</p>
          
          <div className="mb-3">
            {template.tags.slice(0, 3).map(tag => (
              <span key={tag} className="badge bg-light text-dark me-1 small">
                {tag}
              </span>
            ))}
            {template.tags.length > 3 && (
              <span className="small text-muted">+{template.tags.length - 3} more</span>
            )}
          </div>

          <div className="row small text-muted mb-3">
            <div className="col-6">
              <i className="bi bi-person me-1"></i>
              {template.author}
            </div>
            <div className="col-6">
              <i className="bi bi-clock me-1"></i>
              {template.estimatedDuration}m
            </div>
          </div>

          <div className="d-flex justify-content-between align-items-center mb-3">
            <div className="d-flex align-items-center">
              <div className="text-warning me-1">
                {'★'.repeat(Math.floor(template.rating))}
                {'☆'.repeat(5 - Math.floor(template.rating))}
              </div>
              <small className="text-muted">({template.rating})</small>
            </div>
            <small className="text-muted">
              <i className="bi bi-play-circle me-1"></i>
              {template.usageCount} runs
            </small>
          </div>
        </div>
        <div className="card-footer">
          <div className="btn-group w-100">
            <button 
              className="btn btn-outline-primary btn-sm"
              onClick={() => {
                setSelectedTemplate(template);
                setShowScheduleModal(true);
              }}
            >
              <i className="bi bi-calendar-plus me-1"></i>
              Schedule
            </button>
            <button className="btn btn-outline-secondary btn-sm">
              <i className="bi bi-eye me-1"></i>
              Preview
            </button>
            <button className="btn btn-primary btn-sm">
              <i className="bi bi-play me-1"></i>
              Run
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  const renderScheduledWorkflows = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h6>Scheduled Workflows</h6>
        <button 
          className="btn btn-primary btn-sm"
          onClick={() => setShowScheduleModal(true)}
        >
          <i className="bi bi-plus-lg me-1"></i>
          Schedule Workflow
        </button>
      </div>

      <div className="table-responsive">
        <table className="table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Template</th>
              <th>Schedule</th>
              <th>Status</th>
              <th>Last Run</th>
              <th>Next Run</th>
              <th>Success Rate</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {scheduledWorkflows.map(workflow => (
              <tr key={workflow.id}>
                <td>
                  <strong>{workflow.name}</strong>
                </td>
                <td>
                  <small className="text-muted">{workflow.templateName}</small>
                </td>
                <td>
                  <div>
                    <span className="badge bg-info">{workflow.schedule.type}</span>
                    {workflow.schedule.cronExpression && (
                      <div className="small text-muted mt-1">
                        <code>{workflow.schedule.cronExpression}</code>
                      </div>
                    )}
                  </div>
                </td>
                <td>
                  <span className={`badge bg-${workflow.isActive ? 'success' : 'secondary'}`}>
                    {workflow.isActive ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td>
                  {workflow.lastRun ? (
                    <div>
                      <div>{format(workflow.lastRun, 'MMM dd, yyyy')}</div>
                      <small className="text-muted">{format(workflow.lastRun, 'HH:mm')}</small>
                    </div>
                  ) : (
                    <span className="text-muted">Never</span>
                  )}
                </td>
                <td>
                  {workflow.nextRun ? (
                    <div>
                      <div>{format(workflow.nextRun, 'MMM dd, yyyy')}</div>
                      <small className="text-muted">{format(workflow.nextRun, 'HH:mm')}</small>
                    </div>
                  ) : (
                    <span className="text-muted">Not scheduled</span>
                  )}
                </td>
                <td>
                  <div className="d-flex align-items-center">
                    <div className="progress me-2" style={{ width: '60px', height: '20px' }}>
                      <div 
                        className="progress-bar bg-success"
                        style={{ width: `${(workflow.successCount / workflow.runCount) * 100}%` }}
                      ></div>
                    </div>
                    <small>
                      {Math.round((workflow.successCount / workflow.runCount) * 100)}%
                    </small>
                  </div>
                  <small className="text-muted">
                    {workflow.successCount}/{workflow.runCount} runs
                  </small>
                </td>
                <td>
                  <div className="btn-group btn-group-sm">
                    <button className="btn btn-outline-primary" title="Edit">
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      className={`btn btn-outline-${workflow.isActive ? 'warning' : 'success'}`}
                      title={workflow.isActive ? 'Pause' : 'Resume'}
                    >
                      <i className={`bi bi-${workflow.isActive ? 'pause' : 'play'}`}></i>
                    </button>
                    <button className="btn btn-outline-danger" title="Delete">
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );

  const renderDependencies = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h6>Workflow Dependencies & Orchestration</h6>
        <button className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-1"></i>
          Add Dependency
        </button>
      </div>

      <div className="row">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Dependency Graph</h6>
            </div>
            <div className="card-body">
              <div className="text-center py-5">
                <i className="bi bi-diagram-3 display-4 text-muted"></i>
                <p className="text-muted mt-3">Dependency visualization will be displayed here</p>
              </div>
            </div>
          </div>
        </div>
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Orchestration Rules</h6>
            </div>
            <div className="card-body">
              <div className="list-group list-group-flush">
                <div className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">Security Scan → Compliance Check</h6>
                      <p className="mb-1 small text-muted">
                        Run compliance audit after successful security scan
                      </p>
                    </div>
                    <span className="badge bg-success">Active</span>
                  </div>
                </div>
                <div className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">Backup Verification → Alert</h6>
                      <p className="mb-1 small text-muted">
                        Send alert if backup verification fails
                      </p>
                    </div>
                    <span className="badge bg-success">Active</span>
                  </div>
                </div>
                <div className="list-group-item">
                  <div className="d-flex justify-content-between align-items-start">
                    <div>
                      <h6 className="mb-1">Incident Response → Escalation</h6>
                      <p className="mb-1 small text-muted">
                        Escalate to management if incident not resolved in 2 hours
                      </p>
                    </div>
                    <span className="badge bg-warning">Pending</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="workflow-template-management">
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h4>Workflow Template Management</h4>
        <button 
          className="btn btn-primary"
          onClick={() => setShowCreateModal(true)}
        >
          <i className="bi bi-plus-lg me-1"></i>
          Create Template
        </button>
      </div>

      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'templates' ? 'active' : ''}`}
            onClick={() => setSelectedTab('templates')}
          >
            <i className="bi bi-collection me-1"></i>
            Templates ({templates.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'scheduled' ? 'active' : ''}`}
            onClick={() => setSelectedTab('scheduled')}
          >
            <i className="bi bi-calendar-event me-1"></i>
            Scheduled ({scheduledWorkflows.length})
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'dependencies' ? 'active' : ''}`}
            onClick={() => setSelectedTab('dependencies')}
          >
            <i className="bi bi-diagram-3 me-1"></i>
            Dependencies
          </button>
        </li>
      </ul>

      {/* Templates Tab */}
      {selectedTab === 'templates' && (
        <div>
          {/* Filters and Search */}
          <div className="card mb-4">
            <div className="card-body">
              <div className="row align-items-center">
                <div className="col-md-3">
                  <input
                    type="text"
                    className="form-control"
                    placeholder="Search templates..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                  />
                </div>
                <div className="col-md-2">
                  <select 
                    className="form-select"
                    value={filterCategory}
                    onChange={(e) => setFilterCategory(e.target.value)}
                  >
                    <option value="all">All Categories</option>
                    <option value="Security">Security</option>
                    <option value="HR">HR</option>
                    <option value="Compliance">Compliance</option>
                    <option value="Operations">Operations</option>
                    <option value="Finance">Finance</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <select 
                    className="form-select"
                    value={filterComplexity}
                    onChange={(e) => setFilterComplexity(e.target.value)}
                  >
                    <option value="all">All Complexity</option>
                    <option value="simple">Simple</option>
                    <option value="medium">Medium</option>
                    <option value="complex">Complex</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <select 
                    className="form-select"
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value as any)}
                  >
                    <option value="name">Name</option>
                    <option value="created">Created Date</option>
                    <option value="usage">Usage Count</option>
                    <option value="rating">Rating</option>
                  </select>
                </div>
                <div className="col-md-2">
                  <select 
                    className="form-select"
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value as any)}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
                <div className="col-md-1">
                  <button className="btn btn-outline-secondary w-100">
                    <i className="bi bi-arrow-clockwise"></i>
                  </button>
                </div>
              </div>
            </div>
          </div>

          {/* Template Grid */}
          <div className="row">
            {filteredTemplates.map(renderTemplateCard)}
          </div>

          {filteredTemplates.length === 0 && (
            <div className="text-center py-5">
              <i className="bi bi-search display-4 text-muted"></i>
              <p className="text-muted mt-3">No templates found matching your criteria</p>
            </div>
          )}
        </div>
      )}

      {/* Scheduled Tab */}
      {selectedTab === 'scheduled' && renderScheduledWorkflows()}

      {/* Dependencies Tab */}
      {selectedTab === 'dependencies' && renderDependencies()}

      {/* Schedule Modal */}
      {showScheduleModal && (
        <div className="modal show d-block" style={{ backgroundColor: 'rgba(0,0,0,0.5)' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Schedule Workflow</h5>
                <button 
                  className="btn-close"
                  onClick={() => setShowScheduleModal(false)}
                ></button>
              </div>
              <div className="modal-body">
                <form>
                  <div className="mb-3">
                    <label className="form-label">Workflow Name</label>
                    <input type="text" className="form-control" placeholder="Enter workflow name" />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Template</label>
                    <select className="form-select">
                      {templates.map(template => (
                        <option key={template.id} value={template.id}>
                          {template.name} (v{template.version})
                        </option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Schedule Type</label>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="scheduleType" id="once" />
                      <label className="form-check-label" htmlFor="once">Run Once</label>
                    </div>
                    <div className="form-check">
                      <input className="form-check-input" type="radio" name="scheduleType" id="recurring" defaultChecked />
                      <label className="form-check-label" htmlFor="recurring">Recurring</label>
                    </div>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Cron Expression</label>
                    <input type="text" className="form-control" placeholder="0 2 * * 1" />
                    <div className="form-text">
                      Examples: "0 2 * * 1" (Every Monday at 2 AM), "0 0 1 * *" (First day of every month)
                    </div>
                  </div>

                  <div className="row">
                    <div className="col-md-6">
                      <label className="form-label">Start Date</label>
                      <input type="datetime-local" className="form-control" />
                    </div>
                    <div className="col-md-6">
                      <label className="form-label">End Date (Optional)</label>
                      <input type="datetime-local" className="form-control" />
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button 
                  className="btn btn-secondary"
                  onClick={() => setShowScheduleModal(false)}
                >
                  Cancel
                </button>
                <button className="btn btn-primary">
                  Schedule Workflow
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};