"""
Authentication service for ACSO API Gateway.
"""

import secrets
import hashlib
import logging
from datetime import datetime, timedelta
from typing import Optional, Dict, Any, List
import jwt
from passlib.context import CryptContext
from passlib.hash import bcrypt

from ..config import settings
from ..models.auth import (
    UserInfo, UserCreate, UserUpdate, LoginRequest, TokenPayload,
    UserRole, Permission, UserStatus, SessionInfo, AuditLog,
    get_permissions_for_roles, APIKey, APIKeyCreate
)

logger = logging.getLogger(__name__)

# Password hashing context
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthenticationError(Exception):
    """Authentication error."""
    pass


class AuthorizationError(Exception):
    """Authorization error."""
    pass


class AuthService:
    """Authentication and authorization service."""
    
    def __init__(self):
        self.secret_key = settings.security.secret_key
        self.algorithm = settings.security.algorithm
        self.access_token_expire_minutes = settings.security.access_token_expire_minutes
        self.refresh_token_expire_days = settings.security.refresh_token_expire_days
        
        # In-memory storage for demo (replace with database)
        self.users: Dict[str, Dict[str, Any]] = {}
        self.sessions: Dict[str, SessionInfo] = {}
        self.api_keys: Dict[str, APIKey] = {}
        self.audit_logs: List[AuditLog] = []
        
        # Initialize with default admin user
        self._create_default_users()
    
    def _create_default_users(self):
        """Create default users for development."""
        default_users = [
            {
                "user_id": "admin_001",
                "username": "admin",
                "email": "admin@acso.local",
                "full_name": "ACSO Administrator",
                "password": "Admin123!",
                "roles": [UserRole.ADMIN],
                "is_active": True,
                "status": UserStatus.ACTIVE
            },
            {
                "user_id": "operator_001",
                "username": "operator",
                "email": "operator@acso.local",
                "full_name": "ACSO Operator",
                "password": "Operator123!",
                "roles": [UserRole.OPERATOR],
                "is_active": True,
                "status": UserStatus.ACTIVE
            },
            {
                "user_id": "viewer_001",
                "username": "viewer",
                "email": "viewer@acso.local",
                "full_name": "ACSO Viewer",
                "password": "Viewer123!",
                "roles": [UserRole.VIEWER],
                "is_active": True,
                "status": UserStatus.ACTIVE
            }
        ]
        
        for user_data in default_users:
            password = user_data.pop("password")
            user_data["password_hash"] = self.hash_password(password)
            user_data["permissions"] = get_permissions_for_roles(user_data["roles"])
            user_data["created_at"] = datetime.utcnow()
            user_data["login_count"] = 0
            
            self.users[user_data["username"]] = user_data
            logger.info(f"Created default user: {user_data['username']}")
    
    def hash_password(self, password: str) -> str:
        """Hash a password."""
        return pwd_context.hash(password)
    
    def verify_password(self, plain_password: str, hashed_password: str) -> bool:
        """Verify a password against its hash."""
        return pwd_context.verify(plain_password, hashed_password)
    
    def create_access_token(self, user: Dict[str, Any]) -> str:
        """Create an access token for a user."""
        now = datetime.utcnow()
        expire = now + timedelta(minutes=self.access_token_expire_minutes)
        
        payload = {
            "sub": user["user_id"],
            "username": user["username"],
            "email": user["email"],
            "roles": [role.value if isinstance(role, UserRole) else role for role in user["roles"]],
            "permissions": [perm.value if isinstance(perm, Permission) else perm for perm in user["permissions"]],
            "exp": int(expire.timestamp()),
            "iat": int(now.timestamp()),
            "type": "access"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def create_refresh_token(self, user: Dict[str, Any]) -> str:
        """Create a refresh token for a user."""
        now = datetime.utcnow()
        expire = now + timedelta(days=self.refresh_token_expire_days)
        
        payload = {
            "sub": user["user_id"],
            "username": user["username"],
            "exp": int(expire.timestamp()),
            "iat": int(now.timestamp()),
            "type": "refresh"
        }
        
        return jwt.encode(payload, self.secret_key, algorithm=self.algorithm)
    
    def verify_token(self, token: str, token_type: str = "access") -> TokenPayload:
        """Verify and decode a JWT token."""
        try:
            payload = jwt.decode(token, self.secret_key, algorithms=[self.algorithm])
            
            # Check token type
            if payload.get("type") != token_type:
                raise AuthenticationError(f"Invalid token type. Expected {token_type}")
            
            return TokenPayload(**payload)
            
        except jwt.ExpiredSignatureError:
            raise AuthenticationError("Token has expired")
        except jwt.JWTError as e:
            raise AuthenticationError(f"Invalid token: {str(e)}")
    
    def authenticate_user(self, username: str, password: str, ip_address: str = "unknown") -> Optional[Dict[str, Any]]:
        """Authenticate a user with username and password."""
        user = self.users.get(username.lower())
        
        if not user:
            self._log_audit(
                user_id="unknown",
                username=username,
                action="login_failed",
                resource="auth",
                ip_address=ip_address,
                success=False,
                details={"reason": "user_not_found"}
            )
            return None
        
        if not user["is_active"] or user["status"] != UserStatus.ACTIVE:
            self._log_audit(
                user_id=user["user_id"],
                username=username,
                action="login_failed",
                resource="auth",
                ip_address=ip_address,
                success=False,
                details={"reason": "user_inactive"}
            )
            return None
        
        if not self.verify_password(password, user["password_hash"]):
            self._log_audit(
                user_id=user["user_id"],
                username=username,
                action="login_failed",
                resource="auth",
                ip_address=ip_address,
                success=False,
                details={"reason": "invalid_password"}
            )
            return None
        
        # Update login information
        user["last_login"] = datetime.utcnow()
        user["login_count"] += 1
        
        self._log_audit(
            user_id=user["user_id"],
            username=username,
            action="login_success",
            resource="auth",
            ip_address=ip_address,
            success=True
        )
        
        return user
    
    def get_user_by_id(self, user_id: str) -> Optional[Dict[str, Any]]:
        """Get user by ID."""
        for user in self.users.values():
            if user["user_id"] == user_id:
                return user
        return None
    
    def get_user_by_username(self, username: str) -> Optional[Dict[str, Any]]:
        """Get user by username."""
        return self.users.get(username.lower())
    
    def create_user(self, user_create: UserCreate, created_by: str) -> UserInfo:
        """Create a new user."""
        if self.get_user_by_username(user_create.username):
            raise ValueError(f"Username '{user_create.username}' already exists")
        
        # Check if email already exists
        for user in self.users.values():
            if user["email"] == user_create.email:
                raise ValueError(f"Email '{user_create.email}' already exists")
        
        user_id = f"user_{secrets.token_hex(8)}"
        
        user_data = {
            "user_id": user_id,
            "username": user_create.username.lower(),
            "email": user_create.email,
            "full_name": user_create.full_name,
            "password_hash": self.hash_password(user_create.password),
            "roles": user_create.roles,
            "permissions": list(set(user_create.permissions + get_permissions_for_roles(user_create.roles))),
            "is_active": user_create.is_active,
            "status": UserStatus.ACTIVE if user_create.is_active else UserStatus.INACTIVE,
            "created_at": datetime.utcnow(),
            "login_count": 0
        }
        
        self.users[user_create.username.lower()] = user_data
        
        self._log_audit(
            user_id=created_by,
            username="system",
            action="user_created",
            resource="user",
            resource_id=user_id,
            ip_address="system",
            success=True,
            details={"created_user": user_create.username}
        )
        
        return UserInfo(**user_data)
    
    def update_user(self, user_id: str, user_update: UserUpdate, updated_by: str) -> UserInfo:
        """Update a user."""
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID '{user_id}' not found")
        
        # Update fields
        if user_update.email is not None:
            # Check if email already exists for another user
            for other_user in self.users.values():
                if other_user["user_id"] != user_id and other_user["email"] == user_update.email:
                    raise ValueError(f"Email '{user_update.email}' already exists")
            user["email"] = user_update.email
        
        if user_update.full_name is not None:
            user["full_name"] = user_update.full_name
        
        if user_update.roles is not None:
            user["roles"] = user_update.roles
            # Update permissions based on new roles
            role_permissions = get_permissions_for_roles(user_update.roles)
            additional_permissions = user_update.permissions or []
            user["permissions"] = list(set(role_permissions + additional_permissions))
        elif user_update.permissions is not None:
            # Update only additional permissions, keep role-based permissions
            role_permissions = get_permissions_for_roles(user["roles"])
            user["permissions"] = list(set(role_permissions + user_update.permissions))
        
        if user_update.is_active is not None:
            user["is_active"] = user_update.is_active
            user["status"] = UserStatus.ACTIVE if user_update.is_active else UserStatus.INACTIVE
        
        user["updated_at"] = datetime.utcnow()
        
        self._log_audit(
            user_id=updated_by,
            username="system",
            action="user_updated",
            resource="user",
            resource_id=user_id,
            ip_address="system",
            success=True
        )
        
        return UserInfo(**user)
    
    def delete_user(self, user_id: str, deleted_by: str) -> bool:
        """Delete a user."""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        username = user["username"]
        del self.users[username]
        
        self._log_audit(
            user_id=deleted_by,
            username="system",
            action="user_deleted",
            resource="user",
            resource_id=user_id,
            ip_address="system",
            success=True,
            details={"deleted_user": username}
        )
        
        return True
    
    def change_password(self, user_id: str, current_password: str, new_password: str) -> bool:
        """Change user password."""
        user = self.get_user_by_id(user_id)
        if not user:
            return False
        
        if not self.verify_password(current_password, user["password_hash"]):
            return False
        
        user["password_hash"] = self.hash_password(new_password)
        user["updated_at"] = datetime.utcnow()
        
        self._log_audit(
            user_id=user_id,
            username=user["username"],
            action="password_changed",
            resource="user",
            resource_id=user_id,
            ip_address="system",
            success=True
        )
        
        return True
    
    def create_api_key(self, user_id: str, api_key_create: APIKeyCreate) -> tuple[APIKey, str]:
        """Create an API key for a user."""
        user = self.get_user_by_id(user_id)
        if not user:
            raise ValueError(f"User with ID '{user_id}' not found")
        
        # Generate API key
        key_id = f"ak_{secrets.token_hex(8)}"
        api_key = f"acso_{secrets.token_urlsafe(32)}"
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        expires_at = None
        if api_key_create.expires_in_days:
            expires_at = datetime.utcnow() + timedelta(days=api_key_create.expires_in_days)
        
        api_key_obj = APIKey(
            key_id=key_id,
            name=api_key_create.name,
            key_hash=key_hash,
            user_id=user_id,
            permissions=api_key_create.permissions,
            expires_at=expires_at,
            is_active=True,
            created_at=datetime.utcnow(),
            usage_count=0
        )
        
        self.api_keys[key_id] = api_key_obj
        
        self._log_audit(
            user_id=user_id,
            username=user["username"],
            action="api_key_created",
            resource="api_key",
            resource_id=key_id,
            ip_address="system",
            success=True
        )
        
        return api_key_obj, api_key
    
    def verify_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Verify an API key and return associated user."""
        key_hash = hashlib.sha256(api_key.encode()).hexdigest()
        
        for api_key_obj in self.api_keys.values():
            if api_key_obj.key_hash == key_hash:
                # Check if key is active
                if not api_key_obj.is_active:
                    return None
                
                # Check if key has expired
                if api_key_obj.expires_at and datetime.utcnow() > api_key_obj.expires_at:
                    return None
                
                # Update usage
                api_key_obj.last_used = datetime.utcnow()
                api_key_obj.usage_count += 1
                
                # Get associated user
                user = self.get_user_by_id(api_key_obj.user_id)
                if user and user["is_active"]:
                    # Override user permissions with API key permissions
                    user_copy = user.copy()
                    user_copy["permissions"] = api_key_obj.permissions
                    return user_copy
        
        return None
    
    def list_users(self, limit: int = 100, offset: int = 0) -> List[UserInfo]:
        """List all users."""
        users = list(self.users.values())
        users.sort(key=lambda x: x["created_at"], reverse=True)
        
        paginated_users = users[offset:offset + limit]
        return [UserInfo(**user) for user in paginated_users]
    
    def get_audit_logs(self, user_id: Optional[str] = None, limit: int = 100, offset: int = 0) -> List[AuditLog]:
        """Get audit logs."""
        logs = self.audit_logs
        
        if user_id:
            logs = [log for log in logs if log.user_id == user_id]
        
        logs.sort(key=lambda x: x.timestamp, reverse=True)
        return logs[offset:offset + limit]
    
    def _log_audit(self, user_id: str, username: str, action: str, resource: str,
                   ip_address: str, success: bool, resource_id: Optional[str] = None,
                   details: Optional[Dict[str, Any]] = None):
        """Log an audit event."""
        audit_log = AuditLog(
            log_id=f"audit_{secrets.token_hex(8)}",
            user_id=user_id,
            username=username,
            action=action,
            resource=resource,
            resource_id=resource_id,
            ip_address=ip_address,
            user_agent="system",
            timestamp=datetime.utcnow(),
            success=success,
            details=details
        )
        
        self.audit_logs.append(audit_log)
        
        # Keep only last 10000 audit logs
        if len(self.audit_logs) > 10000:
            self.audit_logs = self.audit_logs[-10000:]


# Global auth service instance
auth_service = AuthService()