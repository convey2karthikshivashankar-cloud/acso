"""
Test ACSO Authentication and Authorization System.
"""

import pytest
from fastapi.testclient import TestClient
from src.api.main import app
from src.api.services.auth_service import auth_service
from src.api.models.auth import UserCreate, UserRole, Permission

client = TestClient(app)


class TestAuthentication:
    """Test authentication functionality."""
    
    def test_login_success(self):
        """Test successful login."""
        response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert "refresh_token" in data
        assert data["token_type"] == "bearer"
        assert "user" in data
        assert data["user"]["username"] == "admin"
    
    def test_login_invalid_credentials(self):
        """Test login with invalid credentials."""
        response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "wrongpassword"
        })
        
        assert response.status_code == 401
        assert "Invalid username or password" in response.json()["detail"]
    
    def test_login_nonexistent_user(self):
        """Test login with nonexistent user."""
        response = client.post("/api/v1/auth/login", json={
            "username": "nonexistent",
            "password": "password"
        })
        
        assert response.status_code == 401
    
    def test_get_current_user(self):
        """Test getting current user information."""
        # First login to get token
        login_response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        token = login_response.json()["access_token"]
        
        # Get current user
        response = client.get("/api/v1/auth/me", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "admin"
        assert "admin" in data["roles"]
    
    def test_refresh_token(self):
        """Test token refresh."""
        # First login to get tokens
        login_response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        refresh_token = login_response.json()["refresh_token"]
        
        # Refresh token
        response = client.post("/api/v1/auth/refresh", json={
            "refresh_token": refresh_token
        })
        
        assert response.status_code == 200
        data = response.json()
        assert "access_token" in data
        assert data["token_type"] == "bearer"
    
    def test_change_password(self):
        """Test password change."""
        # First login to get token
        login_response = client.post("/api/v1/auth/login", json={
            "username": "operator",
            "password": "Operator123!"
        })
        token = login_response.json()["access_token"]
        
        # Change password
        response = client.post("/api/v1/auth/change-password", 
            json={
                "current_password": "Operator123!",
                "new_password": "NewPassword123!",
                "confirm_password": "NewPassword123!"
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        assert "Password changed successfully" in response.json()["message"]
        
        # Test login with new password
        new_login_response = client.post("/api/v1/auth/login", json={
            "username": "operator",
            "password": "NewPassword123!"
        })
        assert new_login_response.status_code == 200


class TestAuthorization:
    """Test authorization functionality."""
    
    def test_admin_access(self):
        """Test admin user can access admin endpoints."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        token = login_response.json()["access_token"]
        
        # Access admin endpoint
        response = client.get("/api/v1/auth/users", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)
    
    def test_viewer_restricted_access(self):
        """Test viewer user cannot access admin endpoints."""
        # Login as viewer
        login_response = client.post("/api/v1/auth/login", json={
            "username": "viewer",
            "password": "Viewer123!"
        })
        token = login_response.json()["access_token"]
        
        # Try to access admin endpoint
        response = client.get("/api/v1/auth/users", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 403
        assert "Permission" in response.json()["detail"]
    
    def test_unauthorized_access(self):
        """Test unauthorized access to protected endpoints."""
        response = client.get("/api/v1/auth/me")
        assert response.status_code == 401


class TestUserManagement:
    """Test user management functionality."""
    
    def test_create_user(self):
        """Test user creation by admin."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        token = login_response.json()["access_token"]
        
        # Create new user
        response = client.post("/api/v1/auth/users",
            json={
                "username": "testuser",
                "email": "test@example.com",
                "full_name": "Test User",
                "password": "TestPassword123!",
                "roles": ["viewer"]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert data["username"] == "testuser"
        assert data["email"] == "test@example.com"
    
    def test_list_users(self):
        """Test listing users."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        token = login_response.json()["access_token"]
        
        # List users
        response = client.get("/api/v1/auth/users", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        users = response.json()
        assert isinstance(users, list)
        assert len(users) >= 3  # At least the default users


class TestAPIKeys:
    """Test API key functionality."""
    
    def test_create_api_key(self):
        """Test API key creation."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        token = login_response.json()["access_token"]
        
        # Create API key
        response = client.post("/api/v1/auth/api-keys",
            json={
                "name": "Test API Key",
                "permissions": ["agents:read", "incidents:read"]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 200
        data = response.json()
        assert "api_key" in data
        assert data["api_key"].startswith("acso_")
        assert "key_info" in data
    
    def test_list_api_keys(self):
        """Test listing API keys."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        token = login_response.json()["access_token"]
        
        # List API keys
        response = client.get("/api/v1/auth/api-keys", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        assert isinstance(response.json(), list)


class TestAuditLogs:
    """Test audit logging functionality."""
    
    def test_get_audit_logs(self):
        """Test getting audit logs."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        token = login_response.json()["access_token"]
        
        # Get audit logs
        response = client.get("/api/v1/auth/audit-logs", headers={
            "Authorization": f"Bearer {token}"
        })
        
        assert response.status_code == 200
        logs = response.json()
        assert isinstance(logs, list)
        # Should have at least login events
        assert len(logs) > 0


class TestPasswordValidation:
    """Test password validation."""
    
    def test_weak_password_rejected(self):
        """Test that weak passwords are rejected."""
        # Login as admin
        login_response = client.post("/api/v1/auth/login", json={
            "username": "admin",
            "password": "Admin123!"
        })
        token = login_response.json()["access_token"]
        
        # Try to create user with weak password
        response = client.post("/api/v1/auth/users",
            json={
                "username": "weakuser",
                "email": "weak@example.com",
                "full_name": "Weak User",
                "password": "weak",  # Too weak
                "roles": ["viewer"]
            },
            headers={"Authorization": f"Bearer {token}"}
        )
        
        assert response.status_code == 422  # Validation error


if __name__ == "__main__":
    pytest.main([__file__, "-v"])