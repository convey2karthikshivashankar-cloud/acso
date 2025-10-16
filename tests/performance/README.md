# ACSO Performance and Load Testing

## Overview

This directory contains comprehensive performance and load testing suite for the ACSO (Autonomous Cyber-Security & Service Orchestrator) system. These tests validate system performance under various load conditions, identify scalability limits, and ensure the system meets performance requirements.

## Test Structure

### Test Suites

1. **Load and Performance Tests** (`test_load_scenarios.py`)
   - High-volume operation testing
   - Throughput and response time validation
   - Resource utilization monitoring
   - Mixed workload scenarios

2. **Scalability Tests** (`test_scalability.py`)
   - Linear scalability analysis
   - Resource bottleneck identification
   - Efficiency curve calculation
   - Scaling recommendations

3. **Stress Tests** (`test_scalability.py`)
   - System breaking point identification
   - Failure mode analysis
   - Recovery capability testing
   - Maximum capacity determination

### Test Framework Components

- **Performance Test Runner** (`run_performance_tests.py`) - Main orchestrator
- **Configuration** (`performance_config.json`) - Test parameters and thresholds
- **System Monitor** - Real-time resource monitoring during tests
- **Metrics Collection** - Comprehensive performance data gathering

## Running Performance Tests

### Prerequisites

```bash
# Install performance testing dependencies
pip install -r requirements-dev.txt
pip install numpy matplotlib seaborn psutil

# Set up performance test environment
export ACSO_PERFORMANCE_MODE=true
export AWS_REGION=us-east-1
```

### Running All Performance Tests

```bash
# Run complete performance test suite
python tests/performance/run_performance_tests.py

# Run with custom configuration
python tests/performance/run_performance_tests.py --config performance_config.json

# Generate detailed report
python tests/performance/run_performance_tests.py --output performance_results.json
```

### Running Specific Test Types

```bash
# Run only load tests
python tests/performance/run_performance_tests.py --filter load

# Run only scalability tests
python tests/performance/run_performance_tests.py --filter scalability

# Quick performance validation
python tests/performance/run_performance_tests.py --quick-check
```

### Running Individual Test Modules

```bash
# Load and performance tests only
python tests/performance/test_load_scenarios.py

# Scalability and stress tests only
python tests/performance/test_scalability.py
```

## Test Scenarios

### Load Test Scenarios

1. **Threat Detection Load**
   - Concurrent threat analysis workflows
   - Various threat complexity levels
   - Multi-agent coordination under load

2. **Service Orchestration Load**
   - Automated service delivery at scale
   - Patch management operations
   - System maintenance workflows

3. **Financial Analysis Load**
   - Cost optimization calculations
   - Revenue analysis processing
   - Budget forecasting operations

4. **Mixed Workload**
   - Realistic production-like load distribution
   - 40% threat detection, 35% service orchestration, 25% financial analysis
   - Cross-agent communication patterns

### Scalability Test Scenarios

1. **Linear Scalability Analysis**
   - Gradual load increase from 5 to 1000+ users
   - Throughput vs. user count correlation
   - Resource utilization patterns

2. **Efficiency Curve Calculation**
   - Throughput per user metrics
   - Performance degradation points
   - Optimal operating ranges

3. **Bottleneck Identification**
   - CPU, memory, and I/O bottlenecks
   - Application-level constraints
   - Network and communication limits

### Stress Test Scenarios

1. **Breaking Point Analysis**
   - Maximum user capacity determination
   - System failure mode identification
   - Recovery time measurement

2. **Resource Exhaustion Testing**
   - CPU and memory limit testing
   - Network bandwidth saturation
   - Storage I/O limits

3. **Degradation Pattern Analysis**
   - Performance degradation curves
   - Error rate increase patterns
   - Response time degradation

## Performance Metrics

### Throughput Metrics

- **Operations per Second (OPS)**: Total system throughput
- **Workflow Completion Rate**: End-to-end workflow throughput
- **Message Processing Rate**: Inter-agent communication throughput
- **Agent-Specific Throughput**: Individual agent performance

### Response Time Metrics

- **Average Response Time**: Mean operation completion time
- **P95 Response Time**: 95th percentile response time
- **P99 Response Time**: 99th percentile response time
- **Workflow Duration**: End-to-end workflow completion time

### Resource Utilization Metrics

- **CPU Utilization**: Processor usage patterns
- **Memory Utilization**: RAM usage and allocation
- **Network I/O**: Data transfer rates and patterns
- **Disk I/O**: Storage access patterns

### Reliability Metrics

- **Success Rate**: Percentage of successful operations
- **Error Rate**: Failure rate under load
- **Availability**: System uptime during tests
- **Recovery Time**: Time to recover from failures

## Performance Thresholds

### Acceptable Performance Levels

```json
{
  "throughput": {
    "minimum": "10 ops/sec",
    "target": "50 ops/sec", 
    "excellent": "100+ ops/sec"
  },
  "response_time": {
    "excellent": "< 1 second",
    "good": "< 3 seconds",
    "acceptable": "< 5 seconds",
    "poor": "> 10 seconds"
  },
  "success_rate": {
    "minimum": "90%",
    "target": "95%",
    "excellent": "99%+"
  },
  "resource_utilization": {
    "cpu_warning": "70%",
    "cpu_critical": "85%",
    "memory_warning": "70%",
    "memory_critical": "85%"
  }
}
```

### Scalability Requirements

- **Linear Scalability**: 70%+ efficiency retention
- **Maximum Users**: 500+ concurrent users
- **Throughput Scaling**: Proportional to resource allocation
- **Response Time Stability**: < 2x degradation under 10x load

## Test Configuration

### Environment Variables

```bash
# Performance test configuration
ACSO_PERFORMANCE_MODE=true       # Enable performance optimizations
AWS_REGION=us-east-1             # AWS region for testing
LOG_LEVEL=WARNING                # Reduce logging overhead
PERFORMANCE_TIMEOUT_MULTIPLIER=1.0  # Timeout adjustment
```

### Configuration File Options

The `performance_config.json` file allows customization of:

- Load test parameters (users, duration, operations per second)
- Scalability test ranges and increments
- Stress test failure thresholds
- Performance thresholds and targets
- Agent-specific optimizations
- System monitoring settings

### Test Data Generation

Performance tests use configurable data generation:

- **Threat Scenarios**: Realistic threat patterns with varying complexity
- **Service Requests**: Common service orchestration tasks
- **Financial Data**: Representative financial analysis workloads
- **Load Distribution**: Configurable scenario mix ratios

## Performance Optimization

### System Optimizations

1. **Message Bus Optimizations**
   - Batch processing enabled
   - Message compression
   - Connection pooling
   - Asynchronous processing

2. **Agent Optimizations**
   - Parallel processing
   - Caching mechanisms
   - Resource pooling
   - Timeout optimizations

3. **Workflow Optimizations**
   - Parallel step execution
   - Workflow batching
   - State management optimization
   - Resource allocation efficiency

### Monitoring and Profiling

- **Real-time Monitoring**: System resource usage during tests
- **Performance Profiling**: Bottleneck identification
- **Memory Profiling**: Memory leak detection
- **Network Analysis**: Communication pattern optimization

## Interpreting Results

### Performance Report Structure

```json
{
  "summary": {
    "total_operations": 10000,
    "success_rate": 95.2,
    "avg_throughput": 45.8,
    "max_throughput": 67.3,
    "avg_response_time": 2.1,
    "p95_response_time": 4.8
  },
  "resource_utilization": {
    "avg_cpu_percent": 65.2,
    "max_cpu_percent": 78.9,
    "avg_memory_percent": 58.7,
    "max_memory_percent": 71.3
  },
  "scalability_analysis": {
    "linear_scalability_score": 78.5,
    "max_stable_users": 750,
    "saturation_point": 1200
  },
  "recommendations": [
    "CPU utilization approaching limits - consider scaling",
    "Response times acceptable across all load levels",
    "Memory usage stable - no leaks detected"
  ]
}
```

### Key Performance Indicators (KPIs)

1. **Throughput Efficiency**: Actual vs. target throughput ratio
2. **Scalability Score**: Linear scalability percentage
3. **Resource Efficiency**: Performance per resource unit
4. **Reliability Score**: Success rate under load

### Performance Analysis

- **Trend Analysis**: Performance changes across load levels
- **Bottleneck Identification**: Resource and application constraints
- **Capacity Planning**: Maximum sustainable load determination
- **Optimization Opportunities**: Performance improvement recommendations

## Troubleshooting

### Common Performance Issues

1. **Low Throughput**
   ```bash
   # Check agent processing efficiency
   # Verify message bus configuration
   # Analyze workflow coordination overhead
   ```

2. **High Response Times**
   ```bash
   # Profile individual agent performance
   # Check database query performance
   # Analyze network latency
   ```

3. **Resource Exhaustion**
   ```bash
   # Monitor CPU and memory usage patterns
   # Check for memory leaks
   # Analyze I/O bottlenecks
   ```

4. **Scalability Issues**
   ```bash
   # Identify synchronization bottlenecks
   # Check shared resource contention
   # Analyze communication overhead
   ```

### Debug Mode

```bash
# Run with detailed performance logging
LOG_LEVEL=DEBUG python tests/performance/run_performance_tests.py --verbose

# Generate detailed profiling data
python -m cProfile tests/performance/run_performance_tests.py
```

## Continuous Performance Testing

### CI/CD Integration

```yaml
# .github/workflows/performance-tests.yml
- name: Run Performance Tests
  run: |
    python tests/performance/run_performance_tests.py --quick-check --output perf_results.json
    
- name: Performance Regression Check
  run: |
    python scripts/check-performance-regression.py perf_results.json baseline.json
```

### Performance Monitoring

- **Baseline Establishment**: Initial performance benchmarks
- **Regression Detection**: Performance degradation alerts
- **Trend Analysis**: Long-term performance patterns
- **Capacity Planning**: Future scaling requirements

## Best Practices

### Test Design

- **Realistic Scenarios**: Use production-like workload patterns
- **Gradual Load Increase**: Avoid sudden load spikes
- **Sufficient Duration**: Allow system to reach steady state
- **Resource Monitoring**: Track all relevant metrics

### Performance Optimization

- **Profile Before Optimizing**: Identify actual bottlenecks
- **Measure Impact**: Validate optimization effectiveness
- **Avoid Premature Optimization**: Focus on proven bottlenecks
- **Consider Trade-offs**: Balance performance vs. complexity

### Capacity Planning

- **Plan for Growth**: Design for 3-5x current requirements
- **Monitor Trends**: Track performance over time
- **Test Regularly**: Validate performance assumptions
- **Document Limits**: Know system boundaries

## Support

For performance testing questions or issues:

1. Check the troubleshooting section above
2. Review performance test logs for error details
3. Run quick performance checks to isolate issues
4. Contact the development team for optimization guidance

---

*This performance testing suite should be run regularly to ensure the ACSO system maintains acceptable performance characteristics as it evolves.*