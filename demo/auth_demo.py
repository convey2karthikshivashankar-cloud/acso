#!/usr/bin/env python3
"""
ACSO Authentication System Demo
"""

import sys
import asyncio
from pathlib import Path

# Add project root to path
project_root = Path(__file__).parent.parent
sys.path.insert(0, str(project_root))

from src.api.services.auth_service import auth_service
from src.api.models.auth import UserCreate, UserRole, Permission, APIKeyCreate


async def demo_authentication():
    """Demonstrate authentication functionality."""
    print("🔐 ACSO Authentication System Demo")
    print("=" * 50)
    
    # Test user authentication
    print("\n1. Testing User Authentication")
    print("-" * 30)
    
    # Test valid login
    user = auth_service.authenticate_user("admin", "Admin123!", "127.0.0.1")
    if user:
        print(f"✅ Admin login successful: {user['username']}")
        print(f"   Roles: {user['roles']}")
        print(f"   Permissions: {len(user['permissions'])} permissions")
    else:
        print("❌ Admin login failed")
    
    # Test invalid login
    user = auth_service.authenticate_user("admin", "wrongpassword", "127.0.0.1")
    if user:
        print("❌ Invalid login should have failed")
    else:
        print("✅ Invalid login correctly rejected")
    
    # Test JWT token creation and verification
    print("\n2. Testing JWT Tokens")
    print("-" * 30)
    
    admin_user = auth_service.get_user_by_username("admin")
    if admin_user:
        # Create access token
        access_token = auth_service.create_access_token(admin_user)
        print(f"✅ Access token created: {access_token[:50]}...")
        
        # Verify token
        try:
            payload = auth_service.verify_token(access_token, "access")
            print(f"✅ Token verified for user: {payload.username}")
        except Exception as e:
            print(f"❌ Token verification failed: {e}")
        
        # Create refresh token
        refresh_token = auth_service.create_refresh_token(admin_user)
        print(f"✅ Refresh token created: {refresh_token[:50]}...")
    
    # Test user management
    print("\n3. Testing User Management")
    print("-" * 30)
    
    try:
        # Create a new user
        new_user_data = UserCreate(
            username="demouser",
            email="demo@acso.local",
            full_name="Demo User",
            password="DemoPassword123!",
            roles=[UserRole.ANALYST],
            permissions=[Permission.INCIDENTS_READ, Permission.WORKFLOWS_READ]
        )
        
        new_user = auth_service.create_user(new_user_data, "admin_001")
        print(f"✅ User created: {new_user.username}")
        print(f"   Email: {new_user.email}")
        print(f"   Roles: {new_user.roles}")
        
        # List users
        users = auth_service.list_users(limit=10)
        print(f"✅ Total users in system: {len(users)}")
        
    except ValueError as e:
        print(f"⚠️  User creation failed (might already exist): {e}")
    
    # Test API key functionality
    print("\n4. Testing API Keys")
    print("-" * 30)
    
    try:
        api_key_create = APIKeyCreate(
            name="Demo API Key",
            permissions=[Permission.AGENTS_READ, Permission.INCIDENTS_READ],
            expires_in_days=30
        )
        
        api_key_obj, api_key = auth_service.create_api_key("admin_001", api_key_create)
        print(f"✅ API key created: {api_key}")
        print(f"   Key ID: {api_key_obj.key_id}")
        print(f"   Permissions: {api_key_obj.permissions}")
        
        # Test API key authentication
        api_user = auth_service.verify_api_key(api_key)
        if api_user:
            print(f"✅ API key authentication successful for: {api_user['username']}")
        else:
            print("❌ API key authentication failed")
            
    except Exception as e:
        print(f"❌ API key test failed: {e}")
    
    # Test role-based permissions
    print("\n5. Testing Role-Based Permissions")
    print("-" * 30)
    
    # Test different user roles
    test_users = ["admin", "operator", "viewer"]
    
    for username in test_users:
        user = auth_service.get_user_by_username(username)
        if user:
            print(f"👤 {username.upper()}:")
            print(f"   Roles: {user['roles']}")
            print(f"   Permissions: {len(user['permissions'])} total")
            
            # Test specific permissions
            from src.api.models.auth import has_permission
            test_permissions = [
                "agents:write",
                "users:admin",
                "system:admin"
            ]
            
            for perm in test_permissions:
                has_perm = has_permission(user['permissions'], perm)
                status = "✅" if has_perm else "❌"
                print(f"   {status} {perm}")
    
    # Test audit logging
    print("\n6. Testing Audit Logs")
    print("-" * 30)
    
    audit_logs = auth_service.get_audit_logs(limit=5)
    print(f"✅ Retrieved {len(audit_logs)} recent audit log entries:")
    
    for log in audit_logs[:3]:  # Show first 3
        print(f"   📝 {log.timestamp.strftime('%H:%M:%S')} - {log.username}: {log.action}")
        if log.details:
            print(f"      Details: {log.details}")
    
    print("\n🎉 Authentication system demo completed!")
    print("=" * 50)


if __name__ == "__main__":
    asyncio.run(demo_authentication())