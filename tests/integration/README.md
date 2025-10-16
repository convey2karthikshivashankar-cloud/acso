# ACSO Integration Tests

## Overview

This directory contains comprehensive integration tests for the ACSO (Autonomous Cyber-Security & Service Orchestrator) system. These tests validate end-to-end workflows, cross-agent communication, and human-in-the-loop processes.

## Test Structure

### Test Suites

1. **End-to-End Workflow Tests** (`test_end_to_end_workflows.py`)
   - Complete threat detection and response workflows
   - Service orchestration and automation workflows
   - Financial intelligence and optimization workflows
   - Multi-agent coordination scenarios

2. **Cross-Agent Communication Tests** (`test_cross_agent_communication.py`)
   - Message bus operations and reliability
   - Workflow coordination between agents
   - Message queue operations and persistence
   - Agent discovery and routing

3. **Human Approval Workflow Tests** (`test_human_approval_workflows.py`)
   - Basic approval request and response workflows
   - Escalation procedures for complex scenarios
   - Multi-stage approval processes
   - Conditional approvals and follow-up requirements

### Test Framework Components

- **Test Runner** (`run_integration_tests.py`) - Main orchestrator for all tests
- **Configuration** (`test_config.json`) - Test environment configuration
- **Mock Services** - Simulated external dependencies for testing

## Running Tests

### Prerequisites

```bash
# Install test dependencies
pip install -r requirements-dev.txt

# Set up test environment
export ACSO_TEST_MODE=true
export AWS_REGION=us-east-1
```

### Running All Tests

```bash
# Run complete integration test suite
python tests/integration/run_integration_tests.py

# Run with verbose output
python tests/integration/run_integration_tests.py --verbose

# Generate detailed report
python tests/integration/run_integration_tests.py --output test_results.json
```

### Running Specific Test Suites

```bash
# Run only end-to-end workflow tests
python tests/integration/run_integration_tests.py --filter end_to_end

# Run only communication tests
python tests/integration/run_integration_tests.py --filter communication

# Run only human approval tests
python tests/integration/run_integration_tests.py --filter human_approval
```

### Running Smoke Tests

```bash
# Quick smoke tests for basic functionality
python tests/integration/run_integration_tests.py --smoke-only
```

### Using Custom Configuration

```bash
# Run with custom test configuration
python tests/integration/run_integration_tests.py --config custom_config.json
```

## Test Scenarios

### Threat Detection Workflows

1. **Simple Threat Detection**
   - Basic malware detection and containment
   - Single agent coordination
   - Automated response actions

2. **Complex Multi-Agent Response**
   - Advanced persistent threat detection
   - Multiple agent coordination
   - Human approval for critical actions

3. **Uncertain Threat Analysis**
   - Low confidence threat alerts
   - Human expert escalation
   - Investigation workflow coordination

### Service Orchestration Workflows

1. **Automated Service Delivery**
   - Routine maintenance tasks
   - Patch management automation
   - System health monitoring

2. **High-Impact Service Requests**
   - Production system changes
   - Multi-stage approval process
   - Business impact assessment

3. **Emergency Response Coordination**
   - Critical system failures
   - Resource allocation decisions
   - Escalation procedures

### Financial Intelligence Workflows

1. **Cost Optimization Analysis**
   - Resource utilization assessment
   - Savings opportunity identification
   - ROI calculations

2. **Revenue Impact Analysis**
   - Service disruption cost analysis
   - Business continuity planning
   - Financial risk assessment

### Human Approval Workflows

1. **Standard Approval Process**
   - Single-stage approvals
   - Timeout handling
   - Condition verification

2. **Multi-Stage Approvals**
   - Technical, business, and executive approvals
   - Dependency management
   - Conditional approvals

3. **Escalation Procedures**
   - Policy conflict resolution
   - Expert consultation
   - Priority decision making

## Test Configuration

### Environment Variables

```bash
# Test environment configuration
ACSO_TEST_MODE=true              # Enable test mode
AWS_REGION=us-east-1             # AWS region for testing
LOG_LEVEL=INFO                   # Logging level
TEST_TIMEOUT_MULTIPLIER=1.0      # Timeout adjustment for slower systems
```

### Configuration File Options

The `test_config.json` file allows customization of:

- Agent configurations and timeouts
- Message bus settings
- Workflow coordinator parameters
- Human interface settings
- Test scenario parameters
- Performance thresholds
- Mock service configurations

### Mock Services

Integration tests use mock services to simulate external dependencies:

- **AWS Bedrock**: Mocked AI/ML service responses
- **External APIs**: Simulated third-party integrations
- **Database**: In-memory database for testing
- **Message Queues**: Local message bus implementation

## Performance Testing

### Performance Metrics

Tests measure and validate:

- **Message Latency**: Time for messages to travel between agents
- **Workflow Completion Time**: End-to-end workflow execution time
- **Agent Response Time**: Individual agent processing time
- **Approval Processing Time**: Human interface response time

### Performance Thresholds

Default performance expectations:

- Message latency: < 100ms
- Workflow completion: < 5 minutes
- Agent response: < 30 seconds
- Approval processing: < 5 seconds

### Load Testing

```bash
# Run tests with increased load
python tests/integration/run_integration_tests.py --config load_test_config.json
```

## Test Data and Scenarios

### Threat Scenarios

- **Malware Communication**: Suspicious network traffic patterns
- **Data Exfiltration**: Unusual data transfer activities
- **DDoS Attacks**: High-volume traffic anomalies
- **Insider Threats**: Abnormal user behavior patterns
- **Advanced Persistent Threats**: Complex multi-stage attacks

### Service Request Types

- **Patch Management**: Security and system updates
- **System Maintenance**: Scheduled maintenance activities
- **Configuration Changes**: System configuration updates
- **Capacity Scaling**: Resource allocation adjustments

### Financial Analysis Scenarios

- **Cost Optimization**: Resource utilization improvements
- **Revenue Analysis**: Business impact assessments
- **Budget Forecasting**: Financial planning scenarios

## Troubleshooting

### Common Issues

1. **Test Timeouts**
   ```bash
   # Increase timeout multiplier for slower systems
   export TEST_TIMEOUT_MULTIPLIER=2.0
   ```

2. **Mock Service Failures**
   ```bash
   # Check mock service configuration
   python -c "from tests.integration.mocks import verify_mocks; verify_mocks()"
   ```

3. **Agent Communication Issues**
   ```bash
   # Verify message bus connectivity
   python tests/integration/run_integration_tests.py --smoke-only
   ```

### Debug Mode

```bash
# Run tests with debug logging
LOG_LEVEL=DEBUG python tests/integration/run_integration_tests.py --verbose
```

### Test Isolation

Each test runs in isolation with:
- Fresh agent instances
- Clean message bus state
- Reset workflow coordinator
- Cleared approval queues

## Continuous Integration

### GitHub Actions Integration

```yaml
# .github/workflows/integration-tests.yml
- name: Run Integration Tests
  run: |
    python tests/integration/run_integration_tests.py --output integration_results.json
    
- name: Upload Test Results
  uses: actions/upload-artifact@v3
  with:
    name: integration-test-results
    path: integration_results.json
```

### Test Reporting

Integration tests generate detailed reports including:

- Test execution summary
- Performance metrics
- Error analysis
- Coverage information
- Workflow traces

## Contributing

### Adding New Tests

1. **Create Test File**
   ```python
   # tests/integration/test_new_feature.py
   import pytest
   from tests.integration.framework import TestFramework
   
   class TestNewFeature:
       @pytest.mark.asyncio
       async def test_new_functionality(self, test_framework):
           # Test implementation
           pass
   ```

2. **Update Test Runner**
   ```python
   # Add to run_integration_tests.py
   from test_new_feature import run_new_feature_tests
   
   test_suites["new_feature"] = {
       "name": "New Feature Tests",
       "runner": run_new_feature_tests,
       "description": "Tests for new feature functionality"
   }
   ```

3. **Update Configuration**
   ```json
   // Add to test_config.json
   "new_feature": {
       "enabled": true,
       "scenario_count": 3,
       "timeout": 60
   }
   ```

### Test Guidelines

- **Isolation**: Each test should be independent and not rely on other tests
- **Cleanup**: Always clean up resources after test completion
- **Assertions**: Use clear, descriptive assertions with meaningful error messages
- **Documentation**: Document complex test scenarios and expected behaviors
- **Performance**: Consider performance implications of test scenarios

## Support

For questions or issues with integration tests:

1. Check the troubleshooting section above
2. Review test logs for error details
3. Run smoke tests to verify basic functionality
4. Contact the development team for assistance

---

*This integration test suite is maintained alongside the ACSO system and should be updated with any changes to system functionality or architecture.*