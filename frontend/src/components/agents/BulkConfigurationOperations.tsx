import React, { useState, useEffect } from 'react';
import { Agent } from '../../types';

interface BulkOperation {
  id: string;
  type: 'update' | 'restart' | 'deploy' | 'rollback';
  name: string;
  description: string;
  icon: string;
  requiresConfirmation: boolean;
}

interface BulkConfigurationOperationsProps {
  selectedAgents: Agent[];
  onOperationExecute: (operation: BulkOperation, agents: Agent[], config?: any) => Promise<void>;
  onSelectionClear: () => void;
  availableOperations?: BulkOperation[];
}

const defaultOperations: BulkOperation[] = [
  {
    id: 'update-config',
    type: 'update',
    name: 'Update Configuration',
    description: 'Apply configuration changes to selected agents',
    icon: 'bi-gear',
    requiresConfirmation: true
  },
  {
    id: 'restart-agents',
    type: 'restart',
    name: 'Restart Agents',
    description: 'Restart all selected agents',
    icon: 'bi-arrow-clockwise',
    requiresConfirmation: true
  },
  {
    id: 'deploy-config',
    type: 'deploy',
    name: 'Deploy Configuration',
    description: 'Deploy new configuration to selected agents',
    icon: 'bi-cloud-upload',
    requiresConfirmation: true
  },
  {
    id: 'rollback-config',
    type: 'rollback',
    name: 'Rollback Configuration',
    description: 'Rollback to previous configuration version',
    icon: 'bi-arrow-counterclockwise',
    requiresConfirmation: true
  }
];

export const BulkConfigurationOperations: React.FC<BulkConfigurationOperationsProps> = ({
  selectedAgents,
  onOperationExecute,
  onSelectionClear,
  availableOperations = defaultOperations
}) => {
  const [selectedOperation, setSelectedOperation] = useState<BulkOperation | null>(null);
  const [showConfirmation, setShowConfirmation] = useState(false);
  const [isExecuting, setIsExecuting] = useState(false);
  const [executionProgress, setExecutionProgress] = useState<{
    completed: number;
    total: number;
    currentAgent?: string;
    errors: string[];
  }>({ completed: 0, total: 0, errors: [] });
  const [bulkConfiguration, setBulkConfiguration] = useState<Record<string, any>>({});

  const handleOperationSelect = (operation: BulkOperation) => {
    setSelectedOperation(operation);
    if (operation.requiresConfirmation) {
      setShowConfirmation(true);
    } else {
      executeOperation(operation);
    }
  };

  const executeOperation = async (operation: BulkOperation) => {
    setIsExecuting(true);
    setExecutionProgress({ completed: 0, total: selectedAgents.length, errors: [] });
    
    try {
      await onOperationExecute(operation, selectedAgents, bulkConfiguration);
    } catch (error) {
      console.error('Bulk operation failed:', error);
    } finally {
      setIsExecuting(false);
      setShowConfirmation(false);
      setSelectedOperation(null);
    }
  };

  const getAgentsByType = () => {
    const agentTypes = selectedAgents.reduce((acc, agent) => {
      acc[agent.type] = (acc[agent.type] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(agentTypes).map(([type, count]) => ({
      type,
      count
    }));
  };

  const getAgentsByStatus = () => {
    const agentStatuses = selectedAgents.reduce((acc, agent) => {
      acc[agent.status] = (acc[agent.status] || 0) + 1;
      return acc;
    }, {} as Record<string, number>);
    
    return Object.entries(agentStatuses).map(([status, count]) => ({
      status,
      count
    }));
  };

  if (selectedAgents.length === 0) {
    return (
      <div className="bulk-operations-empty text-center text-muted py-4">
        <i className="bi bi-check2-square display-4"></i>
        <p className="mt-2">Select agents to perform bulk operations</p>
      </div>
    );
  }

  return (
    <div className="bulk-configuration-operations">
      <div className="card">
        <div className="card-header">
          <div className="d-flex justify-content-between align-items-center">
            <h5 className="mb-0">
              Bulk Operations
              <span className="badge bg-primary ms-2">{selectedAgents.length} selected</span>
            </h5>
            <button
              className="btn btn-outline-secondary btn-sm"
              onClick={onSelectionClear}
            >
              Clear Selection
            </button>
          </div>
        </div>
        
        <div className="card-body">
          {/* Selection Summary */}
          <div className="selection-summary mb-4">
            <h6>Selected Agents Summary</h6>
            <div className="row">
              <div className="col-md-6">
                <h6 className="text-muted small">By Type</h6>
                {getAgentsByType().map(({ type, count }) => (
                  <div key={type} className="d-flex justify-content-between">
                    <span>{type}:</span>
                    <span className="badge bg-secondary">{count}</span>
                  </div>
                ))}
              </div>
              <div className="col-md-6">
                <h6 className="text-muted small">By Status</h6>
                {getAgentsByStatus().map(({ status, count }) => (
                  <div key={status} className="d-flex justify-content-between">
                    <span>{status}:</span>
                    <span className={`badge ${
                      status === 'active' ? 'bg-success' :
                      status === 'inactive' ? 'bg-danger' :
                      status === 'warning' ? 'bg-warning' : 'bg-secondary'
                    }`}>
                      {count}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Bulk Configuration Form */}
          {selectedOperation?.type === 'update' && (
            <div className="bulk-config-form mb-4">
              <h6>Bulk Configuration Update</h6>
              <div className="row">
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Log Level</label>
                    <select
                      className="form-select"
                      value={bulkConfiguration.logLevel || ''}
                      onChange={(e) => setBulkConfiguration(prev => ({
                        ...prev,
                        logLevel: e.target.value
                      }))}
                    >
                      <option value="">Keep Current</option>
                      <option value="debug">Debug</option>
                      <option value="info">Info</option>
                      <option value="warning">Warning</option>
                      <option value="error">Error</option>
                    </select>
                  </div>
                </div>
                <div className="col-md-6">
                  <div className="mb-3">
                    <label className="form-label">Monitoring Interval (seconds)</label>
                    <input
                      type="number"
                      className="form-control"
                      value={bulkConfiguration.monitoringInterval || ''}
                      onChange={(e) => setBulkConfiguration(prev => ({
                        ...prev,
                        monitoringInterval: parseInt(e.target.value) || undefined
                      }))}
                      placeholder="Keep current"
                    />
                  </div>
                </div>
              </div>
              <div className="mb-3">
                <div className="form-check">
                  <input
                    type="checkbox"
                    className="form-check-input"
                    id="enableMetrics"
                    checked={bulkConfiguration.enableMetrics || false}
                    onChange={(e) => setBulkConfiguration(prev => ({
                      ...prev,
                      enableMetrics: e.target.checked
                    }))}
                  />
                  <label className="form-check-label" htmlFor="enableMetrics">
                    Enable Enhanced Metrics Collection
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* Operation Buttons */}
          <div className="operations-grid">
            <div className="row">
              {availableOperations.map(operation => (
                <div key={operation.id} className="col-md-6 mb-3">
                  <button
                    className="btn btn-outline-primary w-100 h-100 d-flex flex-column align-items-center justify-content-center p-3"
                    onClick={() => handleOperationSelect(operation)}
                    disabled={isExecuting}
                  >
                    <i className={`${operation.icon} display-6 mb-2`}></i>
                    <h6 className="mb-1">{operation.name}</h6>
                    <small className="text-muted text-center">
                      {operation.description}
                    </small>
                  </button>
                </div>
              ))}
            </div>
          </div>

          {/* Execution Progress */}
          {isExecuting && (
            <div className="execution-progress mt-4">
              <h6>Executing Operation...</h6>
              <div className="progress mb-2">
                <div
                  className="progress-bar"
                  role="progressbar"
                  style={{ width: `${(executionProgress.completed / executionProgress.total) * 100}%` }}
                >
                  {executionProgress.completed} / {executionProgress.total}
                </div>
              </div>
              {executionProgress.currentAgent && (
                <small className="text-muted">
                  Processing: {executionProgress.currentAgent}
                </small>
              )}
              {executionProgress.errors.length > 0 && (
                <div className="alert alert-warning mt-2">
                  <h6>Errors encountered:</h6>
                  <ul className="mb-0">
                    {executionProgress.errors.map((error, index) => (
                      <li key={index}>{error}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmation && selectedOperation && (
        <div className="modal fade show d-block" tabIndex={-1}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Confirm Bulk Operation</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowConfirmation(false)}
                ></button>
              </div>
              <div className="modal-body">
                <div className="alert alert-warning">
                  <i className="bi bi-exclamation-triangle me-2"></i>
                  You are about to perform <strong>{selectedOperation.name}</strong> on{' '}
                  <strong>{selectedAgents.length}</strong> agent(s).
                </div>
                
                <p>{selectedOperation.description}</p>
                
                <h6>Affected Agents:</h6>
                <div className="list-group list-group-flush max-height-200 overflow-auto">
                  {selectedAgents.map(agent => (
                    <div key={agent.id} className="list-group-item d-flex justify-content-between align-items-center">
                      <div>
                        <strong>{agent.name}</strong>
                        <br />
                        <small className="text-muted">{agent.type} - {agent.status}</small>
                      </div>
                      <span className={`badge ${
                        agent.status === 'active' ? 'bg-success' :
                        agent.status === 'inactive' ? 'bg-danger' :
                        'bg-warning'
                      }`}>
                        {agent.status}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowConfirmation(false)}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={() => executeOperation(selectedOperation)}
                >
                  <i className={`${selectedOperation.icon} me-2`}></i>
                  Execute Operation
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};