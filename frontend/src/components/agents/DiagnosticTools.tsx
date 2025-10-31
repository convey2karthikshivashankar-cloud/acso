import React, { useState, useEffect } from 'react';
import { format } from 'date-fns';

interface DiagnosticTest {
  id: string;
  name: string;
  description: string;
  category: 'connectivity' | 'performance' | 'configuration' | 'security';
  severity: 'low' | 'medium' | 'high';
  estimatedDuration: number; // in seconds
  autoRun?: boolean;
}

interface DiagnosticResult {
  testId: string;
  status: 'running' | 'passed' | 'failed' | 'warning';
  message: string;
  details?: string;
  timestamp: Date;
  duration: number;
  recommendations?: string[];
}

interface DiagnosticToolsProps {
  agentId: string;
  onTestComplete?: (result: DiagnosticResult) => void;
}

const availableTests: DiagnosticTest[] = [
  {
    id: 'connectivity-check',
    name: 'Connectivity Check',
    description: 'Verify network connectivity to required services',
    category: 'connectivity',
    severity: 'high',
    estimatedDuration: 10,
    autoRun: true
  },
  {
    id: 'api-endpoints',
    name: 'API Endpoints Test',
    description: 'Test all configured API endpoints for availability',
    category: 'connectivity',
    severity: 'high',
    estimatedDuration: 15
  },
  {
    id: 'performance-benchmark',
    name: 'Performance Benchmark',
    description: 'Run performance tests to measure agent capabilities',
    category: 'performance',
    severity: 'medium',
    estimatedDuration: 30
  },
  {
    id: 'memory-usage',
    name: 'Memory Usage Analysis',
    description: 'Analyze memory usage patterns and detect leaks',
    category: 'performance',
    severity: 'medium',
    estimatedDuration: 20
  },
  {
    id: 'config-validation',
    name: 'Configuration Validation',
    description: 'Validate agent configuration against schema',
    category: 'configuration',
    severity: 'high',
    estimatedDuration: 5
  },
  {
    id: 'dependency-check',
    name: 'Dependency Check',
    description: 'Verify all required dependencies are available',
    category: 'configuration',
    severity: 'high',
    estimatedDuration: 8
  },
  {
    id: 'security-scan',
    name: 'Security Scan',
    description: 'Scan for security vulnerabilities and misconfigurations',
    category: 'security',
    severity: 'high',
    estimatedDuration: 45
  },
  {
    id: 'certificate-check',
    name: 'Certificate Validation',
    description: 'Check SSL/TLS certificates for validity and expiration',
    category: 'security',
    severity: 'medium',
    estimatedDuration: 12
  }
];

export const DiagnosticTools: React.FC<DiagnosticToolsProps> = ({
  agentId,
  onTestComplete
}) => {
  const [results, setResults] = useState<DiagnosticResult[]>([]);
  const [runningTests, setRunningTests] = useState<Set<string>>(new Set());
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [autoRunEnabled, setAutoRunEnabled] = useState(true);

  // Auto-run tests on component mount
  useEffect(() => {
    if (autoRunEnabled) {
      const autoRunTests = availableTests.filter(test => test.autoRun);
      autoRunTests.forEach(test => runTest(test));
    }
  }, [agentId, autoRunEnabled]);

  const runTest = async (test: DiagnosticTest) => {
    if (runningTests.has(test.id)) return;

    setRunningTests(prev => new Set(prev).add(test.id));
    
    const startTime = Date.now();
    
    // Simulate test execution
    try {
      await new Promise(resolve => setTimeout(resolve, test.estimatedDuration * 100)); // Faster for demo
      
      const duration = Date.now() - startTime;
      const success = Math.random() > 0.3; // 70% success rate for demo
      
      const result: DiagnosticResult = {
        testId: test.id,
        status: success ? 'passed' : (Math.random() > 0.5 ? 'failed' : 'warning'),
        message: generateTestMessage(test, success),
        details: generateTestDetails(test, success),
        timestamp: new Date(),
        duration,
        recommendations: success ? undefined : generateRecommendations(test)
      };
      
      setResults(prev => {
        const filtered = prev.filter(r => r.testId !== test.id);
        return [result, ...filtered];
      });
      
      onTestComplete?.(result);
      
    } catch (error) {
      const result: DiagnosticResult = {
        testId: test.id,
        status: 'failed',
        message: `Test failed with error: ${error}`,
        timestamp: new Date(),
        duration: Date.now() - startTime
      };
      
      setResults(prev => {
        const filtered = prev.filter(r => r.testId !== test.id);
        return [result, ...filtered];
      });
    } finally {
      setRunningTests(prev => {
        const newSet = new Set(prev);
        newSet.delete(test.id);
        return newSet;
      });
    }
  };

  const generateTestMessage = (test: DiagnosticTest, success: boolean) => {
    if (success) {
      const messages = {
        'connectivity-check': 'All network connections are healthy',
        'api-endpoints': 'All API endpoints are responding correctly',
        'performance-benchmark': 'Performance metrics are within acceptable ranges',
        'memory-usage': 'Memory usage is optimal',
        'config-validation': 'Configuration is valid and complete',
        'dependency-check': 'All dependencies are available and up to date',
        'security-scan': 'No security vulnerabilities detected',
        'certificate-check': 'All certificates are valid and not expiring soon'
      };
      return messages[test.id as keyof typeof messages] || 'Test completed successfully';
    } else {
      const messages = {
        'connectivity-check': 'Network connectivity issues detected',
        'api-endpoints': 'Some API endpoints are not responding',
        'performance-benchmark': 'Performance issues detected',
        'memory-usage': 'High memory usage or potential memory leak',
        'config-validation': 'Configuration validation failed',
        'dependency-check': 'Missing or outdated dependencies found',
        'security-scan': 'Security vulnerabilities detected',
        'certificate-check': 'Certificate issues found'
      };
      return messages[test.id as keyof typeof messages] || 'Test failed';
    }
  };

  const generateTestDetails = (test: DiagnosticTest, success: boolean) => {
    if (success) {
      return `${test.name} completed successfully. All checks passed.`;
    } else {
      const details = {
        'connectivity-check': 'Failed to connect to external service at api.example.com:443. Connection timeout after 5 seconds.',
        'api-endpoints': 'Endpoint /api/v1/health returned 503 Service Unavailable. Response time: 2.3s (expected < 1s).',
        'performance-benchmark': 'CPU usage peaked at 95% during test. Memory allocation rate: 150MB/s (threshold: 100MB/s).',
        'memory-usage': 'Memory usage increased by 45MB during 5-minute observation period without corresponding deallocation.',
        'config-validation': 'Invalid configuration value for "max_connections": expected integer, got string "unlimited".',
        'dependency-check': 'Package "security-scanner" version 2.1.0 is outdated. Latest version: 2.3.1.',
        'security-scan': 'Found 2 medium-severity vulnerabilities: CVE-2023-1234, CVE-2023-5678.',
        'certificate-check': 'SSL certificate for api.example.com expires in 15 days (2024-01-15).'
      };
      return details[test.id as keyof typeof details] || 'Test failed with unknown error.';
    }
  };

  const generateRecommendations = (test: DiagnosticTest) => {
    const recommendations = {
      'connectivity-check': [
        'Check network configuration and firewall rules',
        'Verify DNS resolution for external services',
        'Test connectivity from different network locations'
      ],
      'api-endpoints': [
        'Check API service status and logs',
        'Verify authentication credentials',
        'Consider implementing circuit breaker pattern'
      ],
      'performance-benchmark': [
        'Review resource allocation and limits',
        'Optimize algorithms and data structures',
        'Consider horizontal scaling'
      ],
      'memory-usage': [
        'Review memory allocation patterns',
        'Implement proper garbage collection',
        'Check for memory leaks in long-running processes'
      ],
      'config-validation': [
        'Review configuration schema and values',
        'Update configuration to match expected format',
        'Implement configuration validation on startup'
      ],
      'dependency-check': [
        'Update outdated dependencies',
        'Review security advisories for dependencies',
        'Implement automated dependency scanning'
      ],
      'security-scan': [
        'Apply security patches immediately',
        'Review and update security policies',
        'Implement additional security controls'
      ],
      'certificate-check': [
        'Renew expiring certificates',
        'Implement automated certificate renewal',
        'Set up certificate expiration monitoring'
      ]
    };
    return recommendations[test.id as keyof typeof recommendations] || ['Review test results and take appropriate action'];
  };

  const runAllTests = () => {
    const testsToRun = selectedCategory === 'all' 
      ? availableTests 
      : availableTests.filter(test => test.category === selectedCategory);
    
    testsToRun.forEach(test => runTest(test));
  };

  const getStatusIcon = (status: DiagnosticResult['status']) => {
    const icons = {
      running: 'bi-arrow-clockwise spin',
      passed: 'bi-check-circle-fill text-success',
      failed: 'bi-x-circle-fill text-danger',
      warning: 'bi-exclamation-triangle-fill text-warning'
    };
    return icons[status];
  };

  const getCategoryIcon = (category: DiagnosticTest['category']) => {
    const icons = {
      connectivity: 'bi-wifi',
      performance: 'bi-speedometer2',
      configuration: 'bi-gear',
      security: 'bi-shield-check'
    };
    return icons[category];
  };

  const getSeverityBadge = (severity: DiagnosticTest['severity']) => {
    const badges = {
      low: 'bg-info',
      medium: 'bg-warning',
      high: 'bg-danger'
    };
    return badges[severity];
  };

  const filteredTests = selectedCategory === 'all' 
    ? availableTests 
    : availableTests.filter(test => test.category === selectedCategory);

  return (
    <div className="diagnostic-tools">
      {/* Header Controls */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <div>
          <h5 className="mb-0">Diagnostic Tools</h5>
          <p className="text-muted mb-0">Run diagnostic tests to identify and troubleshoot issues</p>
        </div>
        <div className="d-flex gap-2">
          <div className="form-check">
            <input
              type="checkbox"
              className="form-check-input"
              id="autoRun"
              checked={autoRunEnabled}
              onChange={(e) => setAutoRunEnabled(e.target.checked)}
            />
            <label className="form-check-label" htmlFor="autoRun">
              Auto-run tests
            </label>
          </div>
          <button
            className="btn btn-primary"
            onClick={runAllTests}
            disabled={runningTests.size > 0}
          >
            {runningTests.size > 0 ? (
              <>
                <span className="spinner-border spinner-border-sm me-2" />
                Running Tests...
              </>
            ) : (
              <>
                <i className="bi bi-play-fill me-2"></i>
                Run All Tests
              </>
            )}
          </button>
        </div>
      </div>

      {/* Category Filter */}
      <div className="mb-4">
        <div className="btn-group" role="group">
          <input
            type="radio"
            className="btn-check"
            name="category"
            id="category-all"
            checked={selectedCategory === 'all'}
            onChange={() => setSelectedCategory('all')}
          />
          <label className="btn btn-outline-primary" htmlFor="category-all">
            All Tests
          </label>
          
          {['connectivity', 'performance', 'configuration', 'security'].map(category => (
            <React.Fragment key={category}>
              <input
                type="radio"
                className="btn-check"
                name="category"
                id={`category-${category}`}
                checked={selectedCategory === category}
                onChange={() => setSelectedCategory(category)}
              />
              <label className="btn btn-outline-primary" htmlFor={`category-${category}`}>
                <i className={`${getCategoryIcon(category as DiagnosticTest['category'])} me-1`}></i>
                {category.charAt(0).toUpperCase() + category.slice(1)}
              </label>
            </React.Fragment>
          ))}
        </div>
      </div>

      {/* Test Results Summary */}
      {results.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card">
              <div className="card-body">
                <h6>Test Results Summary</h6>
                <div className="row">
                  {['passed', 'warning', 'failed'].map(status => {
                    const count = results.filter(r => r.status === status).length;
                    const color = status === 'passed' ? 'success' : status === 'warning' ? 'warning' : 'danger';
                    return (
                      <div key={status} className="col-md-4">
                        <div className="text-center">
                          <div className={`h3 text-${color}`}>{count}</div>
                          <div className="small text-muted">{status.toUpperCase()}</div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Available Tests */}
      <div className="row">
        {filteredTests.map(test => {
          const isRunning = runningTests.has(test.id);
          const result = results.find(r => r.testId === test.id);
          
          return (
            <div key={test.id} className="col-md-6 mb-3">
              <div className="card">
                <div className="card-body">
                  <div className="d-flex justify-content-between align-items-start mb-2">
                    <div className="flex-grow-1">
                      <div className="d-flex align-items-center mb-1">
                        <i className={`${getCategoryIcon(test.category)} me-2`}></i>
                        <h6 className="mb-0">{test.name}</h6>
                        <span className={`badge ${getSeverityBadge(test.severity)} ms-2`}>
                          {test.severity}
                        </span>
                      </div>
                      <p className="text-muted small mb-2">{test.description}</p>
                      <div className="small text-muted">
                        Estimated duration: {test.estimatedDuration}s
                      </div>
                    </div>
                    
                    <div className="text-end">
                      {result && (
                        <div className="mb-2">
                          <i className={getStatusIcon(result.status)}></i>
                        </div>
                      )}
                      <button
                        className="btn btn-sm btn-outline-primary"
                        onClick={() => runTest(test)}
                        disabled={isRunning}
                      >
                        {isRunning ? (
                          <span className="spinner-border spinner-border-sm" />
                        ) : (
                          <i className="bi bi-play"></i>
                        )}
                      </button>
                    </div>
                  </div>
                  
                  {result && (
                    <div className="mt-3 pt-3 border-top">
                      <div className="d-flex justify-content-between align-items-center mb-2">
                        <strong className={`text-${
                          result.status === 'passed' ? 'success' : 
                          result.status === 'warning' ? 'warning' : 'danger'
                        }`}>
                          {result.message}
                        </strong>
                        <small className="text-muted">
                          {format(result.timestamp, 'HH:mm:ss')}
                        </small>
                      </div>
                      
                      {result.details && (
                        <div className="small text-muted mb-2">
                          {result.details}
                        </div>
                      )}
                      
                      {result.recommendations && (
                        <div className="mt-2">
                          <strong className="small">Recommendations:</strong>
                          <ul className="small mb-0 mt-1">
                            {result.recommendations.map((rec, index) => (
                              <li key={index}>{rec}</li>
                            ))}
                          </ul>
                        </div>
                      )}
                      
                      <div className="small text-muted mt-2">
                        Duration: {result.duration}ms
                      </div>
                    </div>
                  )}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};