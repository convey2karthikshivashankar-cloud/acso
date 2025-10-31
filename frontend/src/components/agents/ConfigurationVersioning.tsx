import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface ConfigurationVersion {
  id: string;
  version: string;
  timestamp: Date;
  author: string;
  description: string;
  configuration: Record<string, any>;
  status: 'active' | 'archived' | 'draft';
  changesSummary: {
    added: string[];
    modified: string[];
    removed: string[];
  };
}

interface ConfigurationVersioningProps {
  agentId: string;
  versions: ConfigurationVersion[];
  currentVersion: string;
  onVersionSelect: (version: ConfigurationVersion) => void;
  onVersionRestore: (version: ConfigurationVersion) => void;
  onVersionCompare: (version1: ConfigurationVersion, version2: ConfigurationVersion) => void;
  onVersionDelete: (version: ConfigurationVersion) => void;
  canEdit?: boolean;
}

export const ConfigurationVersioning: React.FC<ConfigurationVersioningProps> = ({
  agentId,
  versions,
  currentVersion,
  onVersionSelect,
  onVersionRestore,
  onVersionCompare,
  onVersionDelete,
  canEdit = true
}) => {
  const [selectedVersions, setSelectedVersions] = useState<string[]>([]);
  const [showDiff, setShowDiff] = useState(false);
  const [expandedVersion, setExpandedVersion] = useState<string | null>(null);

  const handleVersionSelect = (versionId: string) => {
    if (selectedVersions.includes(versionId)) {
      setSelectedVersions(prev => prev.filter(id => id !== versionId));
    } else if (selectedVersions.length < 2) {
      setSelectedVersions(prev => [...prev, versionId]);
    } else {
      setSelectedVersions([versionId]);
    }
  };

  const handleCompare = () => {
    if (selectedVersions.length === 2) {
      const version1 = versions.find(v => v.id === selectedVersions[0]);
      const version2 = versions.find(v => v.id === selectedVersions[1]);
      if (version1 && version2) {
        onVersionCompare(version1, version2);
        setShowDiff(true);
      }
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      active: 'bg-success',
      archived: 'bg-secondary',
      draft: 'bg-warning'
    };
    return badges[status as keyof typeof badges] || 'bg-secondary';
  };

  const getChangesBadge = (changes: ConfigurationVersion['changesSummary']) => {
    const totalChanges = changes.added.length + changes.modified.length + changes.removed.length;
    if (totalChanges === 0) return null;
    
    return (
      <span className="badge bg-info ms-2">
        {totalChanges} change{totalChanges !== 1 ? 's' : ''}
      </span>
    );
  };

  const renderConfigurationDiff = (config1: Record<string, any>, config2: Record<string, any>) => {
    const allKeys = new Set([...Object.keys(config1), ...Object.keys(config2)]);
    
    return (
      <div className="configuration-diff">
        {Array.from(allKeys).map(key => {
          const value1 = config1[key];
          const value2 = config2[key];
          const isChanged = JSON.stringify(value1) !== JSON.stringify(value2);
          const isAdded = !(key in config1) && (key in config2);
          const isRemoved = (key in config1) && !(key in config2);
          
          let className = '';
          if (isAdded) className = 'text-success';
          else if (isRemoved) className = 'text-danger';
          else if (isChanged) className = 'text-warning';
          
          return (
            <div key={key} className={`diff-line ${className}`}>
              <strong>{key}:</strong>
              {isRemoved ? (
                <span className="ms-2 text-decoration-line-through">
                  {JSON.stringify(value1)}
                </span>
              ) : isAdded ? (
                <span className="ms-2">
                  {JSON.stringify(value2)}
                </span>
              ) : isChanged ? (
                <span className="ms-2">
                  <span className="text-decoration-line-through text-muted">
                    {JSON.stringify(value1)}
                  </span>
                  {' → '}
                  <span>{JSON.stringify(value2)}</span>
                </span>
              ) : (
                <span className="ms-2 text-muted">
                  {JSON.stringify(value1)}
                </span>
              )}
            </div>
          );
        })}
      </div>
    );
  };

  return (
    <div className="configuration-versioning">
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h5>Configuration Versions</h5>
        <div>
          {selectedVersions.length === 2 && (
            <button
              className="btn btn-outline-primary btn-sm me-2"
              onClick={handleCompare}
            >
              Compare Versions
            </button>
          )}
          <span className="text-muted">
            {selectedVersions.length > 0 && `${selectedVersions.length} selected`}
          </span>
        </div>
      </div>

      <div className="versions-list">
        {versions.map(version => (
          <div
            key={version.id}
            className={`card mb-2 ${selectedVersions.includes(version.id) ? 'border-primary' : ''}`}
          >
            <div className="card-body">
              <div className="d-flex justify-content-between align-items-start">
                <div className="flex-grow-1">
                  <div className="d-flex align-items-center mb-2">
                    <input
                      type="checkbox"
                      className="form-check-input me-2"
                      checked={selectedVersions.includes(version.id)}
                      onChange={() => handleVersionSelect(version.id)}
                    />
                    <h6 className="mb-0">
                      Version {version.version}
                      {version.version === currentVersion && (
                        <span className="badge bg-primary ms-2">Current</span>
                      )}
                      <span className={`badge ${getStatusBadge(version.status)} ms-2`}>
                        {version.status}
                      </span>
                      {getChangesBadge(version.changesSummary)}
                    </h6>
                  </div>
                  
                  <div className="text-muted small mb-2">
                    <span className="me-3">
                      <i className="bi bi-calendar me-1"></i>
                      {format(version.timestamp, 'MMM dd, yyyy HH:mm')}
                    </span>
                    <span className="me-3">
                      <i className="bi bi-person me-1"></i>
                      {version.author}
                    </span>
                  </div>
                  
                  <p className="mb-2">{version.description}</p>
                  
                  {version.changesSummary && (
                    <div className="changes-summary">
                      {version.changesSummary.added.length > 0 && (
                        <span className="badge bg-success me-1">
                          +{version.changesSummary.added.length} added
                        </span>
                      )}
                      {version.changesSummary.modified.length > 0 && (
                        <span className="badge bg-warning me-1">
                          ~{version.changesSummary.modified.length} modified
                        </span>
                      )}
                      {version.changesSummary.removed.length > 0 && (
                        <span className="badge bg-danger me-1">
                          -{version.changesSummary.removed.length} removed
                        </span>
                      )}
                    </div>
                  )}
                </div>
                
                <div className="dropdown">
                  <button
                    className="btn btn-outline-secondary btn-sm dropdown-toggle"
                    type="button"
                    data-bs-toggle="dropdown"
                  >
                    Actions
                  </button>
                  <ul className="dropdown-menu">
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => onVersionSelect(version)}
                      >
                        <i className="bi bi-eye me-2"></i>
                        View Details
                      </button>
                    </li>
                    {canEdit && version.version !== currentVersion && (
                      <li>
                        <button
                          className="dropdown-item"
                          onClick={() => onVersionRestore(version)}
                        >
                          <i className="bi bi-arrow-clockwise me-2"></i>
                          Restore Version
                        </button>
                      </li>
                    )}
                    <li>
                      <button
                        className="dropdown-item"
                        onClick={() => setExpandedVersion(
                          expandedVersion === version.id ? null : version.id
                        )}
                      >
                        <i className="bi bi-code me-2"></i>
                        {expandedVersion === version.id ? 'Hide' : 'Show'} Configuration
                      </button>
                    </li>
                    {canEdit && version.status !== 'active' && (
                      <>
                        <li><hr className="dropdown-divider" /></li>
                        <li>
                          <button
                            className="dropdown-item text-danger"
                            onClick={() => onVersionDelete(version)}
                          >
                            <i className="bi bi-trash me-2"></i>
                            Delete Version
                          </button>
                        </li>
                      </>
                    )}
                  </ul>
                </div>
              </div>
              
              {expandedVersion === version.id && (
                <div className="mt-3">
                  <hr />
                  <h6>Configuration Details</h6>
                  <pre className="bg-light p-3 rounded">
                    {JSON.stringify(version.configuration, null, 2)}
                  </pre>
                </div>
              )}
            </div>
          </div>
        ))}
      </div>

      {versions.length === 0 && (
        <div className="text-center text-muted py-4">
          <i className="bi bi-clock-history display-4"></i>
          <p className="mt-2">No configuration versions found</p>
        </div>
      )}

      {/* Comparison Modal */}
      {showDiff && selectedVersions.length === 2 && (
        <div className="modal fade show d-block" tabIndex={-1}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header">
                <h5 className="modal-title">Configuration Comparison</h5>
                <button
                  type="button"
                  className="btn-close"
                  onClick={() => setShowDiff(false)}
                ></button>
              </div>
              <div className="modal-body">
                {(() => {
                  const version1 = versions.find(v => v.id === selectedVersions[0]);
                  const version2 = versions.find(v => v.id === selectedVersions[1]);
                  
                  if (!version1 || !version2) return null;
                  
                  return (
                    <div>
                      <div className="row mb-3">
                        <div className="col-6">
                          <h6>Version {version1.version}</h6>
                          <small className="text-muted">
                            {format(version1.timestamp, 'MMM dd, yyyy HH:mm')}
                          </small>
                        </div>
                        <div className="col-6">
                          <h6>Version {version2.version}</h6>
                          <small className="text-muted">
                            {format(version2.timestamp, 'MMM dd, yyyy HH:mm')}
                          </small>
                        </div>
                      </div>
                      
                      <div className="configuration-comparison">
                        {renderConfigurationDiff(version1.configuration, version2.configuration)}
                      </div>
                    </div>
                  );
                })()}
              </div>
              <div className="modal-footer">
                <button
                  type="button"
                  className="btn btn-secondary"
                  onClick={() => setShowDiff(false)}
                >
                  Close
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};