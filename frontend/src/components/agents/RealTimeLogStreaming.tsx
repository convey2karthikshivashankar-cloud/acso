import React, { useState, useEffect, useRef } from 'react';
import { format } from 'date-fns';

interface LogEntry {
  id: string;
  timestamp: Date;
  level: 'debug' | 'info' | 'warning' | 'error' | 'critical';
  message: string;
  source: string;
  agentId: string;
  metadata?: Record<string, any>;
}

interface LogFilter {
  levels: string[];
  sources: string[];
  searchTerm: string;
  timeRange: {
    start?: Date;
    end?: Date;
  };
}

interface RealTimeLogStreamingProps {
  agentId: string;
  onLogReceived?: (log: LogEntry) => void;
  maxLogs?: number;
  autoScroll?: boolean;
}

export const RealTimeLogStreaming: React.FC<RealTimeLogStreamingProps> = ({
  agentId,
  onLogReceived,
  maxLogs = 1000,
  autoScroll = true
}) => {
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const [filteredLogs, setFilteredLogs] = useState<LogEntry[]>([]);
  const [isConnected, setIsConnected] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [filter, setFilter] = useState<LogFilter>({
    levels: ['debug', 'info', 'warning', 'error', 'critical'],
    sources: [],
    searchTerm: '',
    timeRange: {}
  });
  
  const logContainerRef = useRef<HTMLDivElement>(null);
  const wsRef = useRef<WebSocket | null>(null);

  // WebSocket connection for real-time logs
  useEffect(() => {
    const connectWebSocket = () => {
      const wsUrl = `ws://localhost:8000/ws/agents/${agentId}/logs`;
      wsRef.current = new WebSocket(wsUrl);

      wsRef.current.onopen = () => {
        setIsConnected(true);
        console.log('Log streaming connected');
      };

      wsRef.current.onmessage = (event) => {
        if (!isPaused) {
          const logEntry: LogEntry = JSON.parse(event.data);
          logEntry.timestamp = new Date(logEntry.timestamp);
          
          setLogs(prevLogs => {
            const newLogs = [...prevLogs, logEntry];
            if (newLogs.length > maxLogs) {
              return newLogs.slice(-maxLogs);
            }
            return newLogs;
          });
          
          onLogReceived?.(logEntry);
        }
      };

      wsRef.current.onclose = () => {
        setIsConnected(false);
        console.log('Log streaming disconnected');
        
        // Attempt to reconnect after 3 seconds
        setTimeout(connectWebSocket, 3000);
      };

      wsRef.current.onerror = (error) => {
        console.error('WebSocket error:', error);
        setIsConnected(false);
      };
    };

    connectWebSocket();

    return () => {
      if (wsRef.current) {
        wsRef.current.close();
      }
    };
  }, [agentId, isPaused, maxLogs, onLogReceived]);

  // Filter logs based on current filter settings
  useEffect(() => {
    let filtered = logs;

    // Filter by log levels
    if (filter.levels.length > 0) {
      filtered = filtered.filter(log => filter.levels.includes(log.level));
    }

    // Filter by sources
    if (filter.sources.length > 0) {
      filtered = filtered.filter(log => filter.sources.includes(log.source));
    }

    // Filter by search term
    if (filter.searchTerm) {
      const searchLower = filter.searchTerm.toLowerCase();
      filtered = filtered.filter(log =>
        log.message.toLowerCase().includes(searchLower) ||
        log.source.toLowerCase().includes(searchLower)
      );
    }

    // Filter by time range
    if (filter.timeRange.start) {
      filtered = filtered.filter(log => log.timestamp >= filter.timeRange.start!);
    }
    if (filter.timeRange.end) {
      filtered = filtered.filter(log => log.timestamp <= filter.timeRange.end!);
    }

    setFilteredLogs(filtered);
  }, [logs, filter]);

  // Auto-scroll to bottom when new logs arrive
  useEffect(() => {
    if (autoScroll && logContainerRef.current) {
      logContainerRef.current.scrollTop = logContainerRef.current.scrollHeight;
    }
  }, [filteredLogs, autoScroll]);

  const getLevelColor = (level: string) => {
    const colors = {
      debug: 'text-muted',
      info: 'text-info',
      warning: 'text-warning',
      error: 'text-danger',
      critical: 'text-danger fw-bold'
    };
    return colors[level as keyof typeof colors] || 'text-muted';
  };

  const getLevelBadge = (level: string) => {
    const badges = {
      debug: 'bg-secondary',
      info: 'bg-info',
      warning: 'bg-warning',
      error: 'bg-danger',
      critical: 'bg-danger'
    };
    return badges[level as keyof typeof badges] || 'bg-secondary';
  };

  const clearLogs = () => {
    setLogs([]);
    setFilteredLogs([]);
  };

  const exportLogs = () => {
    const logText = filteredLogs.map(log => 
      `[${format(log.timestamp, 'yyyy-MM-dd HH:mm:ss')}] ${log.level.toUpperCase()} [${log.source}] ${log.message}`
    ).join('\n');
    
    const blob = new Blob([logText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `agent-${agentId}-logs-${format(new Date(), 'yyyy-MM-dd-HH-mm-ss')}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const getUniqueSources = () => {
    return Array.from(new Set(logs.map(log => log.source)));
  };

  return (
    <div className="real-time-log-streaming">
      {/* Header Controls */}
      <div className="d-flex justify-content-between align-items-center mb-3">
        <div className="d-flex align-items-center">
          <h5 className="mb-0 me-3">Real-Time Logs</h5>
          <div className="d-flex align-items-center">
            <span className={`badge ${isConnected ? 'bg-success' : 'bg-danger'} me-2`}>
              {isConnected ? 'Connected' : 'Disconnected'}
            </span>
            <span className="text-muted small">
              {filteredLogs.length} / {logs.length} logs
            </span>
          </div>
        </div>
        
        <div className="btn-group">
          <button
            className={`btn btn-sm ${isPaused ? 'btn-success' : 'btn-warning'}`}
            onClick={() => setIsPaused(!isPaused)}
          >
            <i className={`bi ${isPaused ? 'bi-play' : 'bi-pause'} me-1`}></i>
            {isPaused ? 'Resume' : 'Pause'}
          </button>
          <button
            className="btn btn-sm btn-outline-secondary"
            onClick={clearLogs}
          >
            <i className="bi bi-trash me-1"></i>
            Clear
          </button>
          <button
            className="btn btn-sm btn-outline-primary"
            onClick={exportLogs}
          >
            <i className="bi bi-download me-1"></i>
            Export
          </button>
        </div>
      </div>

      {/* Filter Controls */}
      <div className="card mb-3">
        <div className="card-body">
          <div className="row">
            <div className="col-md-3">
              <label className="form-label">Log Levels</label>
              <div className="d-flex flex-wrap gap-1">
                {['debug', 'info', 'warning', 'error', 'critical'].map(level => (
                  <div key={level} className="form-check form-check-inline">
                    <input
                      type="checkbox"
                      className="form-check-input"
                      id={`level-${level}`}
                      checked={filter.levels.includes(level)}
                      onChange={(e) => {
                        if (e.target.checked) {
                          setFilter(prev => ({
                            ...prev,
                            levels: [...prev.levels, level]
                          }));
                        } else {
                          setFilter(prev => ({
                            ...prev,
                            levels: prev.levels.filter(l => l !== level)
                          }));
                        }
                      }}
                    />
                    <label className="form-check-label" htmlFor={`level-${level}`}>
                      <span className={`badge ${getLevelBadge(level)} text-white`}>
                        {level}
                      </span>
                    </label>
                  </div>
                ))}
              </div>
            </div>
            
            <div className="col-md-3">
              <label className="form-label">Sources</label>
              <select
                className="form-select"
                multiple
                value={filter.sources}
                onChange={(e) => {
                  const selected = Array.from(e.target.selectedOptions, option => option.value);
                  setFilter(prev => ({ ...prev, sources: selected }));
                }}
              >
                {getUniqueSources().map(source => (
                  <option key={source} value={source}>
                    {source}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="col-md-6">
              <label className="form-label">Search</label>
              <input
                type="text"
                className="form-control"
                placeholder="Search logs..."
                value={filter.searchTerm}
                onChange={(e) => setFilter(prev => ({ ...prev, searchTerm: e.target.value }))}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Log Display */}
      <div className="card">
        <div className="card-body p-0">
          <div
            ref={logContainerRef}
            className="log-container"
            style={{
              height: '500px',
              overflowY: 'auto',
              fontFamily: 'monospace',
              fontSize: '12px',
              backgroundColor: '#1e1e1e',
              color: '#d4d4d4'
            }}
          >
            {filteredLogs.length === 0 ? (
              <div className="text-center text-muted p-4">
                {logs.length === 0 ? 'No logs received yet' : 'No logs match current filters'}
              </div>
            ) : (
              filteredLogs.map(log => (
                <div
                  key={log.id}
                  className="log-entry p-2 border-bottom border-dark"
                  style={{ borderBottomColor: '#333 !important' }}
                >
                  <div className="d-flex align-items-start">
                    <span className="text-muted me-2" style={{ minWidth: '140px' }}>
                      {format(log.timestamp, 'HH:mm:ss.SSS')}
                    </span>
                    <span className={`badge ${getLevelBadge(log.level)} me-2`} style={{ minWidth: '60px' }}>
                      {log.level.toUpperCase()}
                    </span>
                    <span className="text-info me-2" style={{ minWidth: '100px' }}>
                      [{log.source}]
                    </span>
                    <span className="flex-grow-1">
                      {log.message}
                    </span>
                  </div>
                  {log.metadata && Object.keys(log.metadata).length > 0 && (
                    <div className="mt-1 ms-5">
                      <details>
                        <summary className="text-muted small" style={{ cursor: 'pointer' }}>
                          Metadata
                        </summary>
                        <pre className="text-muted small mt-1">
                          {JSON.stringify(log.metadata, null, 2)}
                        </pre>
                      </details>
                    </div>
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Statistics */}
      <div className="row mt-3">
        <div className="col-md-12">
          <div className="card">
            <div className="card-body">
              <h6>Log Statistics</h6>
              <div className="row">
                {['debug', 'info', 'warning', 'error', 'critical'].map(level => {
                  const count = logs.filter(log => log.level === level).length;
                  return (
                    <div key={level} className="col">
                      <div className="text-center">
                        <div className={`h4 ${getLevelColor(level)}`}>{count}</div>
                        <div className="small text-muted">{level}</div>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};