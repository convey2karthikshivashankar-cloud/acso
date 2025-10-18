"""
Authentication models for ACSO API Gateway.
"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from pydantic import BaseModel, Field, EmailStr, validator
from enum import Enum


class UserRole(str, Enum):
    """User roles in the system."""
    ADMIN = "admin"
    OPERATOR = "operator"
    ANALYST = "analyst"
    VIEWER = "viewer"
    GUEST = "guest"


class Permission(str, Enum):
    """System permissions."""
    # Agent permissions
    AGENTS_VIEW = "agents:view"
    AGENTS_MANAGE = "agents:manage"
    AGENTS_CONFIGURE = "agents:configure"
    AGENTS_LOGS = "agents:logs"
    
    # Workflow permissions
    WORKFLOWS_VIEW = "workflows:view"
    WORKFLOWS_CREATE = "workflows:create"
    WORKFLOWS_EXECUTE = "workflows:execute"
    WORKFLOWS_MANAGE = "workflows:manage"
    
    # Incident permissions
    INCIDENTS_VIEW = "incidents:view"
    INCIDENTS_RESPOND = "incidents:respond"
    INCIDENTS_MANAGE = "incidents:manage"
    INCIDENTS_APPROVE = "incidents:approve"
    
    # Financial permissions
    FINANCIAL_VIEW = "financial:view"
    FINANCIAL_ANALYZE = "financial:analyze"
    FINANCIAL_MANAGE = "financial:manage"
    
    # System permissions
    SYSTEM_ADMIN = "system:admin"
    SYSTEM_MONITOR = "system:monitor"
    SYSTEM_CONFIGURE = "system:configure"
    
    # User management permissions
    USERS_VIEW = "users:view"
    USERS_MANAGE = "users:manage"
    USERS_ROLES = "users:roles"


class UserStatus(str, Enum):
    """User account status."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    SUSPENDED = "suspended"
    PENDING = "pending"
    LOCKED = "locked"


class User(BaseModel):
    """User model."""
    id: str = Field(..., description="User unique identifier")
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., min_length=1, max_length=100, description="Full name")
    role: UserRole = Field(..., description="User role")
    permissions: List[Permission] = Field(default_factory=list, description="User permissions")
    status: UserStatus = Field(default=UserStatus.ACTIVE, description="Account status")
    created_at: datetime = Field(..., description="Account creation timestamp")
    updated_at: Optional[datetime] = Field(None, description="Last update timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    login_count: int = Field(default=0, description="Total login count")
    failed_login_attempts: int = Field(default=0, description="Failed login attempts")
    password_changed_at: Optional[datetime] = Field(None, description="Password last changed")
    must_change_password: bool = Field(default=False, description="Must change password on next login")
    two_factor_enabled: bool = Field(default=False, description="Two-factor authentication enabled")
    preferences: Dict[str, Any] = Field(default_factory=dict, description="User preferences")
    metadata: Dict[str, Any] = Field(default_factory=dict, description="Additional metadata")
    
    class Config:
        use_enum_values = True


class UserCreate(BaseModel):
    """User creation request."""
    username: str = Field(..., min_length=3, max_length=50, description="Username")
    email: EmailStr = Field(..., description="User email address")
    full_name: str = Field(..., min_length=1, max_length=100, description="Full name")
    password: str = Field(..., min_length=8, max_length=128, description="Password")
    role: UserRole = Field(..., description="User role")
    permissions: Optional[List[Permission]] = Field(None, description="Custom permissions")
    send_welcome_email: bool = Field(default=True, description="Send welcome email")
    must_change_password: bool = Field(default=True, description="Must change password on first login")
    
    @validator('password')
    def validate_password(cls, v):
        """Validate password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v)
        
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError(
                'Password must contain at least one uppercase letter, '
                'one lowercase letter, one digit, and one special character'
            )
        
        return v


class UserUpdate(BaseModel):
    """User update request."""
    email: Optional[EmailStr] = Field(None, description="User email address")
    full_name: Optional[str] = Field(None, min_length=1, max_length=100, description="Full name")
    role: Optional[UserRole] = Field(None, description="User role")
    permissions: Optional[List[Permission]] = Field(None, description="Custom permissions")
    status: Optional[UserStatus] = Field(None, description="Account status")
    preferences: Optional[Dict[str, Any]] = Field(None, description="User preferences")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class PasswordChange(BaseModel):
    """Password change request."""
    current_password: str = Field(..., description="Current password")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="Confirm new password")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v)
        
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError(
                'Password must contain at least one uppercase letter, '
                'one lowercase letter, one digit, and one special character'
            )
        
        return v


class LoginRequest(BaseModel):
    """Login request."""
    username: str = Field(..., description="Username or email")
    password: str = Field(..., description="Password")
    remember_me: bool = Field(default=False, description="Remember login")
    two_factor_code: Optional[str] = Field(None, description="Two-factor authentication code")


class LoginResponse(BaseModel):
    """Login response."""
    access_token: str = Field(..., description="JWT access token")
    refresh_token: str = Field(..., description="JWT refresh token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")
    user: User = Field(..., description="User information")
    permissions: List[Permission] = Field(..., description="User permissions")
    must_change_password: bool = Field(default=False, description="Must change password")


class TokenRefreshRequest(BaseModel):
    """Token refresh request."""
    refresh_token: str = Field(..., description="Refresh token")


class TokenRefreshResponse(BaseModel):
    """Token refresh response."""
    access_token: str = Field(..., description="New JWT access token")
    token_type: str = Field(default="bearer", description="Token type")
    expires_in: int = Field(..., description="Token expiration time in seconds")


class LogoutRequest(BaseModel):
    """Logout request."""
    refresh_token: Optional[str] = Field(None, description="Refresh token to invalidate")
    logout_all_devices: bool = Field(default=False, description="Logout from all devices")


class TokenPayload(BaseModel):
    """JWT token payload."""
    sub: str = Field(..., description="Subject (user ID)")
    username: str = Field(..., description="Username")
    role: UserRole = Field(..., description="User role")
    permissions: List[Permission] = Field(..., description="User permissions")
    exp: datetime = Field(..., description="Expiration time")
    iat: datetime = Field(..., description="Issued at time")
    jti: str = Field(..., description="JWT ID")
    token_type: str = Field(..., description="Token type (access/refresh)")


class SessionInfo(BaseModel):
    """User session information."""
    session_id: str = Field(..., description="Session ID")
    user_id: str = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    ip_address: str = Field(..., description="IP address")
    user_agent: str = Field(..., description="User agent")
    created_at: datetime = Field(..., description="Session creation time")
    last_activity: datetime = Field(..., description="Last activity time")
    expires_at: datetime = Field(..., description="Session expiration time")
    is_active: bool = Field(..., description="Session active status")


class TwoFactorSetup(BaseModel):
    """Two-factor authentication setup."""
    secret_key: str = Field(..., description="TOTP secret key")
    qr_code_url: str = Field(..., description="QR code URL for setup")
    backup_codes: List[str] = Field(..., description="Backup codes")


class TwoFactorVerification(BaseModel):
    """Two-factor authentication verification."""
    code: str = Field(..., min_length=6, max_length=6, description="TOTP code")


class PasswordResetRequest(BaseModel):
    """Password reset request."""
    email: EmailStr = Field(..., description="User email address")


class PasswordResetConfirm(BaseModel):
    """Password reset confirmation."""
    token: str = Field(..., description="Reset token")
    new_password: str = Field(..., min_length=8, max_length=128, description="New password")
    confirm_password: str = Field(..., description="Confirm new password")
    
    @validator('confirm_password')
    def passwords_match(cls, v, values):
        if 'new_password' in values and v != values['new_password']:
            raise ValueError('Passwords do not match')
        return v
    
    @validator('new_password')
    def validate_new_password(cls, v):
        """Validate new password strength."""
        if len(v) < 8:
            raise ValueError('Password must be at least 8 characters long')
        
        has_upper = any(c.isupper() for c in v)
        has_lower = any(c.islower() for c in v)
        has_digit = any(c.isdigit() for c in v)
        has_special = any(c in '!@#$%^&*()_+-=[]{}|;:,.<>?' for c in v)
        
        if not (has_upper and has_lower and has_digit and has_special):
            raise ValueError(
                'Password must contain at least one uppercase letter, '
                'one lowercase letter, one digit, and one special character'
            )
        
        return v


class UserListFilters(BaseModel):
    """Filters for user listing."""
    role: Optional[UserRole] = Field(None, description="Filter by role")
    status: Optional[UserStatus] = Field(None, description="Filter by status")
    search: Optional[str] = Field(None, description="Search in username, email, or full name")
    created_after: Optional[datetime] = Field(None, description="Filter by creation date")
    created_before: Optional[datetime] = Field(None, description="Filter by creation date")
    last_login_after: Optional[datetime] = Field(None, description="Filter by last login")
    last_login_before: Optional[datetime] = Field(None, description="Filter by last login")


class UserSummary(BaseModel):
    """User summary for list views."""
    id: str = Field(..., description="User ID")
    username: str = Field(..., description="Username")
    email: str = Field(..., description="Email address")
    full_name: str = Field(..., description="Full name")
    role: UserRole = Field(..., description="User role")
    status: UserStatus = Field(..., description="Account status")
    created_at: datetime = Field(..., description="Creation timestamp")
    last_login: Optional[datetime] = Field(None, description="Last login timestamp")
    login_count: int = Field(..., description="Total login count")
    
    class Config:
        use_enum_values = True


class AuditLogEntry(BaseModel):
    """Audit log entry."""
    id: str = Field(..., description="Log entry ID")
    user_id: Optional[str] = Field(None, description="User ID")
    username: Optional[str] = Field(None, description="Username")
    action: str = Field(..., description="Action performed")
    resource_type: Optional[str] = Field(None, description="Resource type")
    resource_id: Optional[str] = Field(None, description="Resource ID")
    ip_address: str = Field(..., description="IP address")
    user_agent: Optional[str] = Field(None, description="User agent")
    timestamp: datetime = Field(..., description="Action timestamp")
    details: Dict[str, Any] = Field(default_factory=dict, description="Additional details")
    success: bool = Field(..., description="Whether action was successful")
    error_message: Optional[str] = Field(None, description="Error message if failed")


# Role-based permission mappings
ROLE_PERMISSIONS = {
    UserRole.ADMIN: [
        # All permissions
        Permission.AGENTS_VIEW,
        Permission.AGENTS_MANAGE,
        Permission.AGENTS_CONFIGURE,
        Permission.AGENTS_LOGS,
        Permission.WORKFLOWS_VIEW,
        Permission.WORKFLOWS_CREATE,
        Permission.WORKFLOWS_EXECUTE,
        Permission.WORKFLOWS_MANAGE,
        Permission.INCIDENTS_VIEW,
        Permission.INCIDENTS_RESPOND,
        Permission.INCIDENTS_MANAGE,
        Permission.INCIDENTS_APPROVE,
        Permission.FINANCIAL_VIEW,
        Permission.FINANCIAL_ANALYZE,
        Permission.FINANCIAL_MANAGE,
        Permission.SYSTEM_ADMIN,
        Permission.SYSTEM_MONITOR,
        Permission.SYSTEM_CONFIGURE,
        Permission.USERS_VIEW,
        Permission.USERS_MANAGE,
        Permission.USERS_ROLES,
    ],
    UserRole.OPERATOR: [
        Permission.AGENTS_VIEW,
        Permission.AGENTS_MANAGE,
        Permission.AGENTS_LOGS,
        Permission.WORKFLOWS_VIEW,
        Permission.WORKFLOWS_CREATE,
        Permission.WORKFLOWS_EXECUTE,
        Permission.INCIDENTS_VIEW,
        Permission.INCIDENTS_RESPOND,
        Permission.FINANCIAL_VIEW,
        Permission.SYSTEM_MONITOR,
    ],
    UserRole.ANALYST: [
        Permission.AGENTS_VIEW,
        Permission.AGENTS_LOGS,
        Permission.WORKFLOWS_VIEW,
        Permission.WORKFLOWS_CREATE,
        Permission.INCIDENTS_VIEW,
        Permission.INCIDENTS_RESPOND,
        Permission.INCIDENTS_MANAGE,
        Permission.FINANCIAL_VIEW,
        Permission.FINANCIAL_ANALYZE,
        Permission.SYSTEM_MONITOR,
    ],
    UserRole.VIEWER: [
        Permission.AGENTS_VIEW,
        Permission.WORKFLOWS_VIEW,
        Permission.INCIDENTS_VIEW,
        Permission.FINANCIAL_VIEW,
        Permission.SYSTEM_MONITOR,
    ],
    UserRole.GUEST: [
        Permission.AGENTS_VIEW,
        Permission.WORKFLOWS_VIEW,
        Permission.INCIDENTS_VIEW,
    ],
}


def get_role_permissions(role: UserRole) -> List[Permission]:
    """Get permissions for a role."""
    return ROLE_PERMISSIONS.get(role, [])


def has_permission(user_permissions: List[Permission], required_permission: Permission) -> bool:
    """Check if user has required permission."""
    return required_permission in user_permissions


def has_any_permission(user_permissions: List[Permission], required_permissions: List[Permission]) -> bool:
    """Check if user has any of the required permissions."""
    return any(perm in user_permissions for perm in required_permissions)


def has_all_permissions(user_permissions: List[Permission], required_permissions: List[Permission]) -> bool:
    """Check if user has all required permissions."""
    return all(perm in user_permissions for perm in required_permissions)