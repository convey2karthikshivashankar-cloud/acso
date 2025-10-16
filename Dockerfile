# Multi-stage Dockerfile for ACSO Prototype
FROM python:3.11-slim as base

# Set environment variables
ENV PYTHONUNBUFFERED=1 \
    PYTHONDONTWRITEBYTECODE=1 \
    PIP_NO_CACHE_DIR=1 \
    PIP_DISABLE_PIP_VERSION_CHECK=1

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Create app directory
WORKDIR /app

# Copy requirements first for better caching
COPY requirements.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements.txt

# Development stage
FROM base as development

# Install development dependencies
COPY requirements-dev.txt .
RUN pip install --no-cache-dir -r requirements-dev.txt

# Copy source code
COPY . .

# Set development environment
ENV ENVIRONMENT=development
ENV DEBUG=true

# Expose port for development server
EXPOSE 8000

# Command for development
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--reload"]

# Production stage
FROM base as production

# Create non-root user
RUN groupadd -r acso && useradd -r -g acso acso

# Copy source code
COPY --chown=acso:acso src/ ./src/
COPY --chown=acso:acso config/ ./config/
COPY --chown=acso:acso *.py ./

# Set production environment
ENV ENVIRONMENT=production
ENV DEBUG=false

# Switch to non-root user
USER acso

# Health check
HEALTHCHECK --interval=30s --timeout=10s --start-period=5s --retries=3 \
    CMD curl -f http://localhost:8000/health || exit 1

# Expose port
EXPOSE 8000

# Command for production
CMD ["python", "-m", "uvicorn", "src.main:app", "--host", "0.0.0.0", "--port", "8000", "--workers", "4"]

# Agent-specific stages
FROM production as supervisor-agent

ENV AGENT_TYPE=supervisor
ENV AGENT_ID=supervisor-001

CMD ["python", "-m", "src.agents.supervisor_agent"]

FROM production as threat-hunter-agent

ENV AGENT_TYPE=threat-hunter
ENV AGENT_ID=threat-hunter-001

CMD ["python", "-m", "src.agents.threat_hunter_agent"]

FROM production as incident-response-agent

ENV AGENT_TYPE=incident-response
ENV AGENT_ID=incident-response-001

CMD ["python", "-m", "src.agents.incident_response_agent"]

FROM production as service-orchestration-agent

ENV AGENT_TYPE=service-orchestration
ENV AGENT_ID=service-orchestration-001

CMD ["python", "-m", "src.agents.service_orchestration_agent"]

FROM production as financial-intelligence-agent

ENV AGENT_TYPE=financial-intelligence
ENV AGENT_ID=financial-intelligence-001

CMD ["python", "-m", "src.agents.financial_intelligence_agent"]