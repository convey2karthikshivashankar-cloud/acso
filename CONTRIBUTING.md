# Contributing to ACSO

Thank you for your interest in contributing to ACSO! This document provides guidelines and information for contributors.

## Code of Conduct

By participating in this project, you agree to abide by our Code of Conduct. Please be respectful and constructive in all interactions.

## Getting Started

### Prerequisites

- Python 3.8 or higher
- AWS Account with Bedrock access
- Git
- Docker (optional, for containerized development)

### Development Environment Setup

1. **Fork and clone the repository**
   ```bash
   git clone https://github.com/your-username/acso.git
   cd acso
   ```

2. **Create a virtual environment**
   ```bash
   python -m venv venv
   source venv/bin/activate  # On Windows: venv\Scripts\activate
   ```

3. **Install development dependencies**
   ```bash
   pip install -r requirements.txt
   pip install -r requirements-dev.txt
   ```

4. **Set up pre-commit hooks**
   ```bash
   pre-commit install
   ```

## Development Workflow

### Branching Strategy

- `main` - Production-ready code
- `develop` - Integration branch for features
- `feature/*` - Feature development branches
- `hotfix/*` - Critical bug fixes
- `release/*` - Release preparation branches

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/your-feature-name
   ```

2. **Make your changes**
   - Follow the coding standards (see below)
   - Add tests for new functionality
   - Update documentation as needed

3. **Test your changes**
   ```bash
   # Run unit tests
   pytest tests/

   # Run integration tests
   python tests/integration/run_integration_tests.py

   # Run linting
   flake8 src/ config/
   black --check src/ config/
   mypy src/ config/
   ```

4. **Commit your changes**
   ```bash
   git add .
   git commit -m "feat: add new feature description"
   ```

5. **Push and create a pull request**
   ```bash
   git push origin feature/your-feature-name
   ```

## Coding Standards

### Python Style Guide

- Follow [PEP 8](https://www.python.org/dev/peps/pep-0008/)
- Use [Black](https://black.readthedocs.io/) for code formatting
- Use [Flake8](https://flake8.pycqa.org/) for linting
- Use [MyPy](http://mypy-lang.org/) for type checking

### Code Organization

```
src/
├── agents/          # Agent implementations
├── shared/          # Shared utilities and libraries
└── main.py         # Application entry point

tests/
├── unit/           # Unit tests
├── integration/    # Integration tests
└── performance/    # Performance tests

docs/               # Documentation
config/             # Configuration files
infrastructure/     # Infrastructure as Code
```

### Naming Conventions

- **Files**: `snake_case.py`
- **Classes**: `PascalCase`
- **Functions/Variables**: `snake_case`
- **Constants**: `UPPER_SNAKE_CASE`
- **Private members**: `_leading_underscore`

### Documentation

- Use docstrings for all public functions and classes
- Follow [Google Style](https://google.github.io/styleguide/pyguide.html#38-comments-and-docstrings) docstring format
- Update relevant documentation in `docs/` directory

Example docstring:
```python
def analyze_threat(self, threat_data: Dict[str, Any]) -> ThreatAnalysis:
    """Analyze threat data and return risk assessment.
    
    Args:
        threat_data: Dictionary containing threat information including
            source, indicators, and metadata.
    
    Returns:
        ThreatAnalysis object containing risk score, confidence level,
        and recommended actions.
    
    Raises:
        ValidationError: If threat_data is invalid or incomplete.
        AnalysisError: If threat analysis fails.
    """
```

## Testing Guidelines

### Test Structure

- **Unit Tests**: Test individual functions and classes in isolation
- **Integration Tests**: Test component interactions and workflows
- **Performance Tests**: Test system performance and scalability

### Writing Tests

```python
import pytest
from unittest.mock import Mock, patch
from src.agents.threat_hunter_agent import ThreatHunterAgent

class TestThreatHunterAgent:
    def setup_method(self):
        """Set up test fixtures before each test method."""
        self.agent = ThreatHunterAgent()
    
    def test_analyze_threat_valid_input(self):
        """Test threat analysis with valid input data."""
        threat_data = {
            "source": "192.168.1.100",
            "indicators": ["malware_hash"],
            "timestamp": "2024-01-15T10:30:00Z"
        }
        
        result = self.agent.analyze_threat(threat_data)
        
        assert result.risk_score > 0
        assert result.confidence_level >= 0.5
    
    @patch('src.agents.threat_hunter_agent.external_api_call')
    def test_analyze_threat_api_failure(self, mock_api):
        """Test threat analysis when external API fails."""
        mock_api.side_effect = ConnectionError("API unavailable")
        
        with pytest.raises(AnalysisError):
            self.agent.analyze_threat({"source": "test"})
```

### Test Coverage

- Maintain minimum 80% test coverage
- Focus on critical paths and edge cases
- Include both positive and negative test cases

## Pull Request Process

### Before Submitting

- [ ] All tests pass
- [ ] Code follows style guidelines
- [ ] Documentation is updated
- [ ] Commit messages follow conventional format
- [ ] No merge conflicts with main branch

### PR Description Template

```markdown
## Description
Brief description of changes made.

## Type of Change
- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Testing
- [ ] Unit tests added/updated
- [ ] Integration tests added/updated
- [ ] Manual testing completed

## Checklist
- [ ] Code follows project style guidelines
- [ ] Self-review completed
- [ ] Documentation updated
- [ ] Tests added for new functionality
```

### Review Process

1. **Automated Checks**: CI pipeline runs tests and quality checks
2. **Code Review**: At least one maintainer reviews the code
3. **Testing**: Changes are tested in staging environment
4. **Approval**: Maintainer approves and merges the PR

## Commit Message Format

Use [Conventional Commits](https://www.conventionalcommits.org/) format:

```
<type>[optional scope]: <description>

[optional body]

[optional footer(s)]
```

### Types

- `feat`: New feature
- `fix`: Bug fix
- `docs`: Documentation changes
- `style`: Code style changes (formatting, etc.)
- `refactor`: Code refactoring
- `test`: Adding or updating tests
- `chore`: Maintenance tasks

### Examples

```
feat(agents): add threat correlation algorithm
fix(api): resolve authentication timeout issue
docs: update deployment guide for AWS CDK
test(integration): add end-to-end workflow tests
```

## Issue Reporting

### Bug Reports

Use the bug report template and include:

- **Environment**: OS, Python version, AWS region
- **Steps to Reproduce**: Clear, numbered steps
- **Expected Behavior**: What should happen
- **Actual Behavior**: What actually happens
- **Logs**: Relevant error messages or logs
- **Screenshots**: If applicable

### Feature Requests

Use the feature request template and include:

- **Problem Statement**: What problem does this solve?
- **Proposed Solution**: How should it work?
- **Alternatives**: Other solutions considered
- **Additional Context**: Use cases, examples, etc.

## Security

### Reporting Security Issues

**Do not report security vulnerabilities through public GitHub issues.**

Instead, email security@acso-project.org with:
- Description of the vulnerability
- Steps to reproduce
- Potential impact
- Suggested fix (if any)

### Security Guidelines

- Never commit secrets, API keys, or credentials
- Use environment variables for sensitive configuration
- Follow AWS security best practices
- Implement proper input validation
- Use secure communication protocols

## Documentation

### Types of Documentation

- **Code Documentation**: Docstrings and inline comments
- **User Documentation**: User guides and tutorials
- **API Documentation**: REST API reference
- **Architecture Documentation**: System design and decisions

### Documentation Standards

- Write clear, concise documentation
- Include code examples where appropriate
- Keep documentation up-to-date with code changes
- Use proper markdown formatting

## Release Process

### Versioning

We use [Semantic Versioning](https://semver.org/):
- **MAJOR**: Breaking changes
- **MINOR**: New features (backward compatible)
- **PATCH**: Bug fixes (backward compatible)

### Release Checklist

- [ ] All tests pass
- [ ] Documentation updated
- [ ] CHANGELOG.md updated
- [ ] Version bumped in relevant files
- [ ] Release notes prepared
- [ ] Security review completed

## Getting Help

### Resources

- **Documentation**: [docs/](docs/)
- **GitHub Discussions**: For questions and general discussion
- **GitHub Issues**: For bug reports and feature requests
- **Email**: maintainers@acso-project.org

### Community

- Be respectful and inclusive
- Help others learn and contribute
- Share knowledge and best practices
- Provide constructive feedback

## Recognition

Contributors are recognized in:
- CONTRIBUTORS.md file
- Release notes
- Project documentation
- Annual contributor highlights

Thank you for contributing to ACSO! 🚀