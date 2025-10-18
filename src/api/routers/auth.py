"""
Authentication router for ACSO API Gateway.
"""

from fastapi import APIRouter, Depends, HTTPException, status, Request
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List
from datetime import datetime

from ..models.responses import APIResponse
from ..models.auth import (
    LoginRequest, LoginResponse, TokenRefreshRequest, TokenRefreshResponse,
    LogoutRequest, User, UserCreate, UserUpdate, PasswordChange,
    TwoFactorSetup, TwoFactorVerification, UserListFilters, UserSummary,
    Permission
)
from ..services.auth_service import AuthService
from ..dependencies import get_current_user, require_permission
from ..utils.errors import AuthenticationException, ValidationException

router = APIRouter()
security = HTTPBearer()

# Initialize auth service
auth_service = AuthService()


def get_client_info(request: Request) -> tuple[str, str]:
    """Extract client IP and user agent from request."""
    ip_address = request.client.host if request.client else "unknown"
    user_agent = request.headers.get("user-agent", "unknown")
    return ip_address, user_agent


@router.post("/login", response_model=APIResponse[LoginResponse])
async def login(login_request: LoginRequest, request: Request):
    """Authenticate user and return access token."""
    try:
        ip_address, user_agent = get_client_info(request)
        login_response = await auth_service.authenticate_user(
            login_request, ip_address, user_agent
        )
        
        return APIResponse(
            success=True,
            data=login_response,
            message="Login successful"
        )
    except AuthenticationException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/refresh", response_model=APIResponse[TokenRefreshResponse])
async def refresh_token(refresh_request: TokenRefreshRequest):
    """Refresh access token using refresh token."""
    try:
        refresh_response = await auth_service.refresh_token(refresh_request)
        
        return APIResponse(
            success=True,
            data=refresh_response,
            message="Token refreshed successfully"
        )
    except AuthenticationException as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )


@router.post("/logout", response_model=APIResponse[dict])
async def logout(
    logout_request: LogoutRequest,
    current_user: User = Depends(get_current_user)
):
    """Logout user and invalidate tokens."""
    await auth_service.logout_user(
        current_user.id,
        logout_request.refresh_token,
        logout_request.logout_all_devices
    )
    
    return APIResponse(
        success=True,
        data={"message": "Logged out successfully"},
        message="Logout successful"
    )


@router.get("/me", response_model=APIResponse[User])
async def get_current_user_info(current_user: User = Depends(get_current_user)):
    """Get current user information."""
    return APIResponse(
        success=True,
        data=current_user,
        message="User information retrieved successfully"
    )


@router.post("/change-password", response_model=APIResponse[dict])
async def change_password(
    password_change: PasswordChange,
    current_user: User = Depends(get_current_user)
):
    """Change user password."""
    try:
        await auth_service.change_password(current_user.id, password_change)
        
        return APIResponse(
            success=True,
            data={"message": "Password changed successfully"},
            message="Password changed successfully"
        )
    except AuthenticationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/setup-2fa", response_model=APIResponse[TwoFactorSetup])
async def setup_two_factor_auth(current_user: User = Depends(get_current_user)):
    """Set up two-factor authentication."""
    setup_info = await auth_service.setup_two_factor(current_user.id)
    
    return APIResponse(
        success=True,
        data=setup_info,
        message="Two-factor authentication setup initiated"
    )


@router.post("/verify-2fa", response_model=APIResponse[dict])
async def verify_two_factor_auth(
    verification: TwoFactorVerification,
    current_user: User = Depends(get_current_user)
):
    """Verify and enable two-factor authentication."""
    success = await auth_service.verify_two_factor(current_user.id, verification)
    
    if success:
        return APIResponse(
            success=True,
            data={"message": "Two-factor authentication enabled successfully"},
            message="Two-factor authentication enabled"
        )
    else:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid verification code"
        )


# User management endpoints (admin only)

@router.post("/users", response_model=APIResponse[User])
async def create_user(
    user_create: UserCreate,
    current_user: User = Depends(require_permission(Permission.USERS_MANAGE))
):
    """Create a new user."""
    try:
        new_user = await auth_service.create_user(user_create, current_user.id)
        
        return APIResponse(
            success=True,
            data=new_user,
            message="User created successfully"
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/users", response_model=APIResponse[List[UserSummary]])
async def list_users(
    role: Optional[str] = None,
    status: Optional[str] = None,
    search: Optional[str] = None,
    limit: int = 100,
    offset: int = 0,
    current_user: User = Depends(require_permission(Permission.USERS_VIEW))
):
    """List users with optional filtering."""
    filters = UserListFilters(
        role=role,
        status=status,
        search=search
    )
    
    users, total = await auth_service.list_users(filters, limit, offset)
    
    return APIResponse(
        success=True,
        data=users,
        message=f"Retrieved {len(users)} users",
        metadata={"total": total, "limit": limit, "offset": offset}
    )


@router.get("/users/{user_id}", response_model=APIResponse[User])
async def get_user(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.USERS_VIEW))
):
    """Get user by ID."""
    user = auth_service.users.get(user_id)
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    return APIResponse(
        success=True,
        data=user,
        message="User retrieved successfully"
    )


@router.put("/users/{user_id}", response_model=APIResponse[User])
async def update_user(
    user_id: str,
    user_update: UserUpdate,
    current_user: User = Depends(require_permission(Permission.USERS_MANAGE))
):
    """Update user."""
    try:
        updated_user = await auth_service.update_user(user_id, user_update, current_user.id)
        
        return APIResponse(
            success=True,
            data=updated_user,
            message="User updated successfully"
        )
    except ValidationException as e:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.delete("/users/{user_id}", response_model=APIResponse[dict])
async def delete_user(
    user_id: str,
    current_user: User = Depends(require_permission(Permission.USERS_MANAGE))
):
    """Delete user."""
    if user_id == current_user.id:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cannot delete your own account"
        )
    
    if user_id not in auth_service.users:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    del auth_service.users[user_id]
    
    return APIResponse(
        success=True,
        data={"message": "User deleted successfully"},
        message="User deleted successfully"
    )