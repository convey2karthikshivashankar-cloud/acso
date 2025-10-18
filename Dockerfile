# Multi-stage Dockerfile for ACSO deployment

# Base Python image
FROM python:3.11-slim as base

# Set working directory
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y \
    gcc \
    g++ \
    curl \
    git \
    && rm -rf /var/lib/apt/lists/*

# Copy requirements
COPY requirements-api.txt .

# Install Python dependencies
RUN pip install --no-cache-dir -r requirements-api.txt

# Copy source code
COPY src/ ./src/
COPY config/ ./config/
COPY .env.example .env

# Create logs directory
RUN mkdir -p logs

# API Server Stage
FROM base as api-server
EXPOSE 8000
CMD ["python", "-m", "uvicorn", "src.api.main:app", "--host", "0.0.0.0", "--port", "8000"]

# Supervisor Agent Stage
FROM base as supervisor-agent
ENV AGENT_TYPE=supervisor
CMD ["python", "-m", "src.agents.supervisor_agent"]

# Threat Hunter Agent Stage
FROM base as threat-hunter-agent
ENV AGENT_TYPE=threat-hunter
CMD ["python", "-m", "src.agents.threat_hunter_agent"]

# Incident Response Agent Stage
FROM base as incident-response-agent
ENV AGENT_TYPE=incident-response
CMD ["python", "-m", "src.agents.incident_response_agent"]

# Service Orchestration Agent Stage
FROM base as service-orchestration-agent
ENV AGENT_TYPE=service-orchestration
CMD ["python", "-m", "src.agents.service_orchestration_agent"]

# Financial Intelligence Agent Stage
FROM base as financial-intelligence-agent
ENV AGENT_TYPE=financial-intelligence
CMD ["python", "-m", "src.agents.financial_intelligence_agent"]

# Frontend Build Stage
FROM node:18-alpine as frontend-builder

WORKDIR /app/frontend

# Copy package files
COPY frontend/package*.json ./

# Install dependencies
RUN npm ci

# Copy frontend source
COPY frontend/ ./

# Build frontend
RUN npm run build

# Frontend Serve Stage
FROM nginx:alpine as frontend-server

# Copy built frontend
COPY --from=frontend-builder /app/frontend/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx/nginx.conf /etc/nginx/nginx.conf

EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]

# Development Stage (for local development)
FROM base as development
COPY frontend/ ./frontend/
RUN pip install --no-cache-dir pytest pytest-asyncio httpx
CMD ["python", "-m", "src.api.main"]