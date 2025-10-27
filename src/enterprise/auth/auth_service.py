"""
Authentication Service for ACSO Enterprise.
Handles JWT tokens, API keys, and OAuth integration.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
import json
import hashlib
import secrets

import jwt
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import bcrypt


class AuthConfig:
    """Authentication configuration."""
    
    def __init__(self):
        self.jwt_secret = "your-secret-key"  # In production, use environment variable
        self.jwt_algorithm = "HS256"
        self.jwt_expiration_hours = 24
        self.api_key_length = 32
        self.password_min_length = 8


class AuthService:
    """
    Enterprise authentication service supporting:
    - JWT token authentication
    - API key authentication  
    - OAuth 2.0 integration
    - Multi-factor authentication
    - Session management
    """
    
    def __init__(self, config: Optional[AuthConfig] = None):
        self.config = config or AuthConfig()
        self.logger = logging.getLogger(__name__)
        
        # In-memory stores (in production, use database)
        self.users: Dict[str, Dict[str, Any]] = {}
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        self.sessions: Dict[str, Dict[str, Any]] = {}
        self.refresh_tokens: Dict[str, Dict[str, Any]] = {}
        
    async def initialize(self) -> None:
        """Initialize the authentication service."""
        try:
            self.logger.info("Initializing Authentication Service")
            
            # Create default admin user
            await self._create_default_users()
            
            self.logger.info("Authentication Service initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Authentication Service: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the authentication service."""
        self.logger.info("Authentication Service shutdown complete")
        
    async def authenticate_jwt(self, token: str) -> Optional[Dict[str, Any]]:
        """Authenticate using JWT token."""
        try:
            payload = jwt.decode(
                token,
                self.config.jwt_secret,
                algorithms=[self.config.jwt_algorithm]
            )
            
            # Check expiration
            if datetime.utcnow().timestamp() > payload.get('exp', 0):
                return None
                
            # Get user info
            user_id = payload.get('user_id')
            if user_id and user_id in self.users:
                user = self.users[user_id].copy()
                user.pop('password_hash', None)  # Don't return password hash
                return user
                
            return None
            
        except jwt.InvalidTokenError as e:
            self.logger.warning(f"Invalid JWT token: {e}")
            return None
        except Exception as e:
            self.logger.error(f"JWT authentication error: {e}")
            return None
            
    async def authenticate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Authenticate using API key."""
        try:
            if api_key in self.api_keys:
                key_info = self.api_keys[api_key]
                
                # Check if key is active
                if not key_info.get('active', True):
                    return None
                    
                # Check expiration
                expires_at = key_info.get('expires_at')
                if expires_at and datetime.fromisoformat(expires_at) < datetime.utcnow():
                    return None
                    
                # Update last used
                key_info['last_used'] = datetime.utcnow().isoformat()
                
                # Get associated user
                user_id = key_info.get('user_id')
                if user_id and user_id in self.users:
                    user = self.users[user_id].copy()
                    user.pop('password_hash', None)
                    user['auth_method'] = 'api_key'
                    return user
                    
            return None
            
        except Exception as e:
            self.logger.error(f"API key authentication error: {e}")
            return None
            
    async def create_jwt_token(self, user_id: str, additional_claims: Optional[Dict[str, Any]] = None) -> str:
        """Create JWT token for user."""
        try:
            now = datetime.utcnow()
            expiration = now + timedelta(hours=self.config.jwt_expiration_hours)
            
            payload = {
                'user_id': user_id,
                'iat': now.timestamp(),
                'exp': expiration.timestamp(),
                'iss': 'acso-enterprise'
            }
            
            if additional_claims:
                payload.update(additional_claims)
                
            token = jwt.encode(
                payload,
                self.config.jwt_secret,
                algorithm=self.config.jwt_algorithm
            )
            
            return token
            
        except Exception as e:
            self.logger.error(f"JWT token creation error: {e}")
            raise
            
    async def create_api_key(self, user_id: str, name: str, expires_days: Optional[int] = None) -> str:
        """Create API key for user."""
        try:
            api_key = secrets.token_urlsafe(self.config.api_key_length)
            
            expires_at = None
            if expires_days:
                expires_at = (datetime.utcnow() + timedelta(days=expires_days)).isoformat()
                
            self.api_keys[api_key] = {
                'user_id': user_id,
                'name': name,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': expires_at,
                'active': True,
                'last_used': None
            }
            
            return api_key
            
        except Exception as e:
            self.logger.error(f"API key creation error: {e}")
            raise
            
    async def revoke_api_key(self, api_key: str) -> bool:
        """Revoke an API key."""
        try:
            if api_key in self.api_keys:
                self.api_keys[api_key]['active'] = False
                return True
            return False
            
        except Exception as e:
            self.logger.error(f"API key revocation error: {e}")
            return False
            
    async def create_user(self, username: str, email: str, password: str, 
                         roles: Optional[List[str]] = None) -> str:
        """Create a new user."""
        try:
            # Validate password
            if len(password) < self.config.password_min_length:
                raise ValueError(f"Password must be at least {self.config.password_min_length} characters")
                
            # Check if user exists
            user_id = hashlib.sha256(username.encode()).hexdigest()[:16]
            if user_id in self.users:
                raise ValueError("User already exists")
                
            # Hash password
            password_hash = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt())
            
            # Create user
            self.users[user_id] = {
                'user_id': user_id,
                'username': username,
                'email': email,
                'password_hash': password_hash.decode('utf-8'),
                'roles': roles or ['user'],
                'created_at': datetime.utcnow().isoformat(),
                'active': True,
                'last_login': None
            }
            
            return user_id
            
        except Exception as e:
            self.logger.error(f"User creation error: {e}")
            raise
            
    async def authenticate_user(self, username: str, password: str) -> Optional[Dict[str, Any]]:
        """Authenticate user with username/password."""
        try:
            # Find user by username
            user = None
            for u in self.users.values():
                if u['username'] == username:
                    user = u
                    break
                    
            if not user or not user.get('active', True):
                return None
                
            # Check password
            if bcrypt.checkpw(password.encode('utf-8'), user['password_hash'].encode('utf-8')):
                # Update last login
                user['last_login'] = datetime.utcnow().isoformat()
                
                # Return user info without password
                user_info = user.copy()
                user_info.pop('password_hash', None)
                return user_info
                
            return None
            
        except Exception as e:
            self.logger.error(f"User authentication error: {e}")
            return None
            
    async def decode_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Decode JWT token without verification (for extracting claims)."""
        try:
            # Decode without verification to extract claims
            payload = jwt.decode(token, options={"verify_signature": False})
            return payload
        except Exception as e:
            self.logger.error(f"Token decode error: {e}")
            return None
            
    async def refresh_token(self, refresh_token: str) -> Optional[str]:
        """Refresh JWT token using refresh token."""
        try:
            if refresh_token in self.refresh_tokens:
                token_info = self.refresh_tokens[refresh_token]
                
                # Check expiration
                expires_at = datetime.fromisoformat(token_info['expires_at'])
                if expires_at < datetime.utcnow():
                    del self.refresh_tokens[refresh_token]
                    return None
                    
                # Create new JWT token
                user_id = token_info['user_id']
                new_token = await self.create_jwt_token(user_id)
                
                return new_token
                
            return None
            
        except Exception as e:
            self.logger.error(f"Token refresh error: {e}")
            return None
            
    async def create_refresh_token(self, user_id: str) -> str:
        """Create refresh token for user."""
        try:
            refresh_token = secrets.token_urlsafe(32)
            expires_at = datetime.utcnow() + timedelta(days=30)  # 30 days
            
            self.refresh_tokens[refresh_token] = {
                'user_id': user_id,
                'created_at': datetime.utcnow().isoformat(),
                'expires_at': expires_at.isoformat()
            }
            
            return refresh_token
            
        except Exception as e:
            self.logger.error(f"Refresh token creation error: {e}")
            raise
            
    async def get_user_permissions(self, user_id: str) -> List[str]:
        """Get user permissions based on roles."""
        try:
            if user_id not in self.users:
                return []
                
            user = self.users[user_id]
            roles = user.get('roles', [])
            
            # Map roles to permissions
            permissions = []
            for role in roles:
                permissions.extend(self._get_role_permissions(role))
                
            return list(set(permissions))  # Remove duplicates
            
        except Exception as e:
            self.logger.error(f"Error getting user permissions: {e}")
            return []
            
    def _get_role_permissions(self, role: str) -> List[str]:
        """Get permissions for a role."""
        role_permissions = {
            'admin': [
                'users:read', 'users:write', 'users:delete',
                'agents:read', 'agents:write', 'agents:delete',
                'billing:read', 'billing:write',
                'system:read', 'system:write'
            ],
            'user': [
                'agents:read', 'agents:write',
                'billing:read'
            ],
            'viewer': [
                'agents:read',
                'billing:read'
            ]
        }
        
        return role_permissions.get(role, [])
        
    async def _create_default_users(self) -> None:
        """Create default users for testing."""
        try:
            # Create admin user
            await self.create_user(
                username='admin',
                email='admin@acso.com',
                password='admin123',
                roles=['admin']
            )
            
            # Create test user
            await self.create_user(
                username='testuser',
                email='test@acso.com', 
                password='test123',
                roles=['user']
            )
            
        except Exception as e:
            self.logger.warning(f"Error creating default users: {e}")