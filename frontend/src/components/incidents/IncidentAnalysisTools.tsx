import React, { useState, useEffect } from 'react';
import { format, subHours } from 'date-fns';
import { Line, Bar } from 'react-chartjs-2';

interface TimelineEvent {
  id: string;
  timestamp: Date;
  type: 'detection' | 'escalation' | 'action' | 'resolution';
  description: string;
  actor: string;
  metadata?: Record<string, any>;
}

interface Evidence {
  id: string;
  type: 'log' | 'screenshot' | 'document' | 'network_capture';
  name: string;
  description: string;
  uploadedAt: Date;
  uploadedBy: string;
  fileSize: number;
  url: string;
}

interface AnalysisPattern {
  id: string;
  name: string;
  description: string;
  confidence: number;
  indicators: string[];
  recommendations: string[];
}

interface IncidentAnalysisToolsProps {
  incidentId: string;
}

export const IncidentAnalysisTools: React.FC<IncidentAnalysisToolsProps> = ({
  incidentId
}) => {
  const [timeline, setTimeline] = useState<TimelineEvent[]>([]);
  const [evidence, setEvidence] = useState<Evidence[]>([]);
  const [patterns, setPatterns] = useState<AnalysisPattern[]>([]);
  const [selectedTab, setSelectedTab] = useState<'timeline' | 'evidence' | 'patterns' | 'analysis'>('timeline');
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  useEffect(() => {
    // Generate sample timeline events
    const sampleTimeline: TimelineEvent[] = [
      {
        id: '1',
        timestamp: subHours(new Date(), 4),
        type: 'detection',
        description: 'Anomalous network traffic detected from IP 192.168.1.100',
        actor: 'Security Monitor',
        metadata: { sourceIP: '192.168.1.100', protocol: 'TCP', port: 443 }
      },
      {
        id: '2',
        timestamp: subHours(new Date(), 3.5),
        type: 'escalation',
        description: 'Alert escalated to security team due to high severity',
        actor: 'Alert System'
      },
      {
        id: '3',
        timestamp: subHours(new Date(), 3),
        type: 'action',
        description: 'Security analyst began investigation',
        actor: 'John Doe'
      },
      {
        id: '4',
        timestamp: subHours(new Date(), 2.5),
        type: 'action',
        description: 'Blocked suspicious IP address at firewall',
        actor: 'John Doe',
        metadata: { action: 'block', target: '192.168.1.100' }
      },
      {
        id: '5',
        timestamp: subHours(new Date(), 1),
        type: 'resolution',
        description: 'Threat contained and systems secured',
        actor: 'Security Team'
      }
    ];

    const sampleEvidence: Evidence[] = [
      {
        id: '1',
        type: 'log',
        name: 'firewall_logs_2024.txt',
        description: 'Firewall logs showing suspicious traffic patterns',
        uploadedAt: subHours(new Date(), 2),
        uploadedBy: 'John Doe',
        fileSize: 2048576,
        url: '/evidence/firewall_logs_2024.txt'
      },
      {
        id: '2',
        type: 'screenshot',
        name: 'network_monitoring_dashboard.png',
        description: 'Screenshot of network monitoring dashboard during incident',
        uploadedAt: subHours(new Date(), 1.5),
        uploadedBy: 'Jane Smith',
        fileSize: 1024000,
        url: '/evidence/network_monitoring_dashboard.png'
      },
      {
        id: '3',
        type: 'network_capture',
        name: 'suspicious_traffic.pcap',
        description: 'Network packet capture of suspicious traffic',
        uploadedAt: subHours(new Date(), 1),
        uploadedBy: 'Security Team',
        fileSize: 5242880,
        url: '/evidence/suspicious_traffic.pcap'
      }
    ];

    const samplePatterns: AnalysisPattern[] = [
      {
        id: '1',
        name: 'Brute Force Attack Pattern',
        description: 'Multiple failed login attempts from single IP address',
        confidence: 0.85,
        indicators: ['Multiple failed logins', 'Single source IP', 'Short time window'],
        recommendations: ['Block source IP', 'Enable account lockout', 'Monitor for similar patterns']
      },
      {
        id: '2',
        name: 'Data Exfiltration Attempt',
        description: 'Unusual outbound data transfer patterns detected',
        confidence: 0.72,
        indicators: ['Large data transfers', 'Unusual destination', 'Off-hours activity'],
        recommendations: ['Monitor data flows', 'Review access permissions', 'Implement DLP controls']
      }
    ];

    setTimeline(sampleTimeline);
    setEvidence(sampleEvidence);
    setPatterns(samplePatterns);
  }, [incidentId]);

  const runAutomatedAnalysis = async () => {
    setIsAnalyzing(true);
    
    // Simulate AI analysis
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Add new pattern based on analysis
    const newPattern: AnalysisPattern = {
      id: Date.now().toString(),
      name: 'Advanced Persistent Threat (APT)',
      description: 'Sophisticated attack pattern with multiple stages detected',
      confidence: 0.68,
      indicators: ['Multi-stage attack', 'Lateral movement', 'Persistence mechanisms'],
      recommendations: ['Full system scan', 'Threat hunting', 'Update security policies']
    };
    
    setPatterns(prev => [newPattern, ...prev]);
    setIsAnalyzing(false);
  };

  const getEventIcon = (type: string) => {
    const icons = {
      detection: 'bi-search',
      escalation: 'bi-arrow-up-circle',
      action: 'bi-gear',
      resolution: 'bi-check-circle'
    };
    return icons[type as keyof typeof icons] || 'bi-circle';
  };

  const getEventColor = (type: string) => {
    const colors = {
      detection: 'warning',
      escalation: 'danger',
      action: 'primary',
      resolution: 'success'
    };
    return colors[type as keyof typeof colors] || 'secondary';
  };

  const getEvidenceIcon = (type: string) => {
    const icons = {
      log: 'bi-file-text',
      screenshot: 'bi-image',
      document: 'bi-file-earmark',
      network_capture: 'bi-diagram-3'
    };
    return icons[type as keyof typeof icons] || 'bi-file';
  };

  const formatFileSize = (bytes: number) => {
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    if (bytes === 0) return '0 Bytes';
    const i = Math.floor(Math.log(bytes) / Math.log(1024));
    return Math.round(bytes / Math.pow(1024, i) * 100) / 100 + ' ' + sizes[i];
  };

  const renderTimeline = () => (
    <div className="timeline-container">
      <div className="timeline">
        {timeline.map((event, index) => (
          <div key={event.id} className="timeline-item">
            <div className={`timeline-marker bg-${getEventColor(event.type)}`}>
              <i className={`${getEventIcon(event.type)} text-white`}></i>
            </div>
            <div className="timeline-content">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <h6 className="mb-0">{event.description}</h6>
                    <span className={`badge bg-${getEventColor(event.type)}`}>
                      {event.type}
                    </span>
                  </div>
                  <div className="d-flex justify-content-between align-items-center">
                    <small className="text-muted">
                      <i className="bi bi-person me-1"></i>
                      {event.actor}
                    </small>
                    <small className="text-muted">
                      {format(event.timestamp, 'MMM dd, HH:mm:ss')}
                    </small>
                  </div>
                  {event.metadata && (
                    <div className="mt-2">
                      <details>
                        <summary className="small text-muted" style={{ cursor: 'pointer' }}>
                          Additional Details
                        </summary>
                        <pre className="small mt-1 bg-light p-2 rounded">
                          {JSON.stringify(event.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderEvidence = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6>Evidence Collection</h6>
        <button className="btn btn-primary btn-sm">
          <i className="bi bi-plus-lg me-1"></i>
          Add Evidence
        </button>
      </div>
      
      <div className="row">
        {evidence.map(item => (
          <div key={item.id} className="col-md-6 mb-3">
            <div className="card">
              <div className="card-body">
                <div className="d-flex align-items-start">
                  <div className="me-3">
                    <i className={`${getEvidenceIcon(item.type)} display-6 text-muted`}></i>
                  </div>
                  <div className="flex-grow-1">
                    <h6 className="mb-1">{item.name}</h6>
                    <p className="text-muted small mb-2">{item.description}</p>
                    <div className="d-flex justify-content-between align-items-center">
                      <div className="small text-muted">
                        <div>Size: {formatFileSize(item.fileSize)}</div>
                        <div>By: {item.uploadedBy}</div>
                        <div>{format(item.uploadedAt, 'MMM dd, HH:mm')}</div>
                      </div>
                      <div className="btn-group btn-group-sm">
                        <button className="btn btn-outline-primary">
                          <i className="bi bi-eye"></i>
                        </button>
                        <button className="btn btn-outline-secondary">
                          <i className="bi bi-download"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderPatterns = () => (
    <div>
      <div className="d-flex justify-content-between align-items-center mb-3">
        <h6>Attack Patterns & Analysis</h6>
        <button
          className="btn btn-primary btn-sm"
          onClick={runAutomatedAnalysis}
          disabled={isAnalyzing}
        >
          {isAnalyzing ? (
            <>
              <span className="spinner-border spinner-border-sm me-1"></span>
              Analyzing...
            </>
          ) : (
            <>
              <i className="bi bi-cpu me-1"></i>
              Run AI Analysis
            </>
          )}
        </button>
      </div>
      
      {patterns.map(pattern => (
        <div key={pattern.id} className="card mb-3">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-start mb-2">
              <h6 className="mb-0">{pattern.name}</h6>
              <div className="d-flex align-items-center">
                <span className="me-2 small text-muted">Confidence:</span>
                <div className="progress" style={{ width: '100px', height: '20px' }}>
                  <div
                    className={`progress-bar ${
                      pattern.confidence > 0.8 ? 'bg-success' :
                      pattern.confidence > 0.6 ? 'bg-warning' : 'bg-danger'
                    }`}
                    style={{ width: `${pattern.confidence * 100}%` }}
                  >
                    {Math.round(pattern.confidence * 100)}%
                  </div>
                </div>
              </div>
            </div>
            
            <p className="text-muted mb-3">{pattern.description}</p>
            
            <div className="row">
              <div className="col-md-6">
                <h6 className="small">Indicators</h6>
                <ul className="list-unstyled">
                  {pattern.indicators.map((indicator, index) => (
                    <li key={index} className="small">
                      <i className="bi bi-check-circle text-success me-1"></i>
                      {indicator}
                    </li>
                  ))}
                </ul>
              </div>
              <div className="col-md-6">
                <h6 className="small">Recommendations</h6>
                <ul className="list-unstyled">
                  {pattern.recommendations.map((rec, index) => (
                    <li key={index} className="small">
                      <i className="bi bi-arrow-right text-primary me-1"></i>
                      {rec}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );

  const renderAnalysis = () => (
    <div>
      <h6 className="mb-3">Incident Analysis Dashboard</h6>
      
      <div className="row mb-4">
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Event Timeline Distribution</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '200px' }}>
                <Bar
                  data={{
                    labels: ['Detection', 'Escalation', 'Action', 'Resolution'],
                    datasets: [{
                      label: 'Events',
                      data: [
                        timeline.filter(e => e.type === 'detection').length,
                        timeline.filter(e => e.type === 'escalation').length,
                        timeline.filter(e => e.type === 'action').length,
                        timeline.filter(e => e.type === 'resolution').length
                      ],
                      backgroundColor: ['#ffc107', '#dc3545', '#0d6efd', '#198754']
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        
        <div className="col-md-6">
          <div className="card">
            <div className="card-header">
              <h6 className="mb-0">Pattern Confidence Levels</h6>
            </div>
            <div className="card-body">
              <div style={{ height: '200px' }}>
                <Bar
                  data={{
                    labels: patterns.map(p => p.name.substring(0, 15) + '...'),
                    datasets: [{
                      label: 'Confidence',
                      data: patterns.map(p => p.confidence * 100),
                      backgroundColor: patterns.map(p => 
                        p.confidence > 0.8 ? '#198754' :
                        p.confidence > 0.6 ? '#ffc107' : '#dc3545'
                      )
                    }]
                  }}
                  options={{
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: { legend: { display: false } },
                    scales: { y: { max: 100 } }
                  }}
                />
              </div>
            </div>
          </div>
        </div>
      </div>
      
      <div className="card">
        <div className="card-header">
          <h6 className="mb-0">Analysis Summary</h6>
        </div>
        <div className="card-body">
          <div className="row">
            <div className="col-md-3 text-center">
              <h4 className="text-primary">{timeline.length}</h4>
              <p className="text-muted mb-0">Total Events</p>
            </div>
            <div className="col-md-3 text-center">
              <h4 className="text-success">{evidence.length}</h4>
              <p className="text-muted mb-0">Evidence Items</p>
            </div>
            <div className="col-md-3 text-center">
              <h4 className="text-warning">{patterns.length}</h4>
              <p className="text-muted mb-0">Patterns Detected</p>
            </div>
            <div className="col-md-3 text-center">
              <h4 className="text-info">
                {Math.round(patterns.reduce((acc, p) => acc + p.confidence, 0) / patterns.length * 100)}%
              </h4>
              <p className="text-muted mb-0">Avg Confidence</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="incident-analysis-tools">
      {/* Navigation Tabs */}
      <ul className="nav nav-tabs mb-4">
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'timeline' ? 'active' : ''}`}
            onClick={() => setSelectedTab('timeline')}
          >
            <i className="bi bi-clock-history me-1"></i>
            Timeline
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'evidence' ? 'active' : ''}`}
            onClick={() => setSelectedTab('evidence')}
          >
            <i className="bi bi-folder me-1"></i>
            Evidence
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'patterns' ? 'active' : ''}`}
            onClick={() => setSelectedTab('patterns')}
          >
            <i className="bi bi-diagram-3 me-1"></i>
            Patterns
          </button>
        </li>
        <li className="nav-item">
          <button
            className={`nav-link ${selectedTab === 'analysis' ? 'active' : ''}`}
            onClick={() => setSelectedTab('analysis')}
          >
            <i className="bi bi-graph-up me-1"></i>
            Analysis
          </button>
        </li>
      </ul>

      {/* Tab Content */}
      <div className="tab-content">
        {selectedTab === 'timeline' && renderTimeline()}
        {selectedTab === 'evidence' && renderEvidence()}
        {selectedTab === 'patterns' && renderPatterns()}
        {selectedTab === 'analysis' && renderAnalysis()}
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