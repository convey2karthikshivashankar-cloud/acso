"""
Test ACSO API Gateway setup and basic functionality.
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app

client = TestClient(app)


def test_root_endpoint():
    """Test the root endpoint."""
    response = client.get("/")
    assert response.status_code == 200
    data = response.json()
    assert "name" in data
    assert "version" in data
    assert data["name"] == "ACSO API Gateway"


def test_health_endpoint():
    """Test the health check endpoint."""
    response = client.get("/health")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] in ["healthy", "degraded"]
    assert "timestamp" in data
    assert "version" in data
    assert "components" in data


def test_readiness_endpoint():
    """Test the readiness check endpoint."""
    response = client.get("/ready")
    assert response.status_code == 200
    data = response.json()
    assert data["status"] == "ready"
    assert "checks" in data


def test_metrics_endpoint():
    """Test the metrics endpoint."""
    response = client.get("/metrics")
    assert response.status_code == 200
    data = response.json()
    assert "timestamp" in data
    assert "application" in data
    assert "websocket" in data
    assert "system" in data


def test_cors_headers():
    """Test CORS headers are present."""
    response = client.options("/")
    assert response.status_code == 200
    # CORS headers should be present
    assert "access-control-allow-origin" in response.headers


def test_security_headers():
    """Test security headers are present."""
    response = client.get("/")
    assert response.status_code == 200
    
    # Check for security headers
    security_headers = [
        "x-content-type-options",
        "x-frame-options", 
        "x-xss-protection",
        "strict-transport-security",
        "referrer-policy",
        "content-security-policy"
    ]
    
    for header in security_headers:
        assert header in response.headers


def test_request_id_header():
    """Test that request ID header is added."""
    response = client.get("/")
    assert response.status_code == 200
    assert "x-request-id" in response.headers


def test_rate_limit_headers():
    """Test that rate limit headers are added."""
    response = client.get("/")
    assert response.status_code == 200
    assert "x-ratelimit-limit" in response.headers
    assert "x-ratelimit-remaining" in response.headers


def test_api_documentation():
    """Test API documentation endpoints."""
    # Test OpenAPI schema
    response = client.get("/openapi.json")
    assert response.status_code == 200
    data = response.json()
    assert "openapi" in data
    assert "info" in data
    
    # Test Swagger UI (if enabled)
    response = client.get("/docs")
    # Should either return 200 (docs enabled) or 404 (docs disabled in production)
    assert response.status_code in [200, 404]


def test_invalid_endpoint():
    """Test handling of invalid endpoints."""
    response = client.get("/invalid-endpoint")
    assert response.status_code == 404


def test_method_not_allowed():
    """Test handling of invalid HTTP methods."""
    response = client.post("/")  # Root only accepts GET
    assert response.status_code == 405


@pytest.mark.asyncio
async def test_websocket_connection():
    """Test WebSocket connection (basic)."""
    with client.websocket_connect("/ws/test_user") as websocket:
        # Should receive connection confirmation
        data = websocket.receive_json()
        assert data["type"] == "connection_established"
        assert "connection_id" in data
        
        # Send ping
        websocket.send_json({"type": "ping"})
        
        # Should receive pong
        data = websocket.receive_json()
        assert data["type"] == "pong"


def test_configuration_loading():
    """Test that configuration is loaded correctly."""
    from src.api.config import settings
    
    assert settings.title == "ACSO API Gateway"
    assert settings.version == "1.0.0"
    assert settings.api_prefix == "/api/v1"
    assert isinstance(settings.debug, bool)
    assert isinstance(settings.port, int)


if __name__ == "__main__":
    pytest.main([__file__, "-v"])