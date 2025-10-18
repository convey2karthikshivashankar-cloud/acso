"""
Dependencies for ACSO API Gateway.
"""

from fastapi import Depends, HTTPException, status, Query
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from typing import Optional, List, Dict, Any, Callable
import jwt

from .models.auth import User, TokenPayload, Permission
from .services.auth_service import AuthService
from .utils.errors import AuthenticationException, AuthorizationException
from .config import get_settings

security = HTTPBearer()
settings = get_settings()

# Initialize auth service
auth_service = AuthService()


async def get_current_user(credentials: HTTPAuthorizationCredentials = Depends(security)) -> User:
    """Get current authenticated user from JWT token."""
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        # Verify token
        token_payload = await auth_service.verify_token(credentials.credentials)
        
        # Get user
        user = auth_service.users.get(token_payload.sub)
        if not user or user.status.value != "active":
            raise credentials_exception
        
        return user
        
    except AuthenticationException:
        raise credentials_exception
    except Exception:
        raise credentials_exception


async def get_admin_user(current_user: User = Depends(get_current_user)) -> User:
    """Require admin user."""
    if current_user.role.value != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin access required"
        )
    return current_user


def require_permission(required_permission: Permission) -> Callable:
    """Dependency factory for requiring specific permission."""
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        try:
            await auth_service.require_permission(current_user.id, required_permission)
            return current_user
        except AuthorizationException as e:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=str(e)
            )
    
    return permission_checker


def require_permissions(required_permissions: List[Permission]) -> Callable:
    """Dependency factory for requiring multiple permissions."""
    async def permission_checker(current_user: User = Depends(get_current_user)) -> User:
        for permission in required_permissions:
            try:
                await auth_service.require_permission(current_user.id, permission)
            except AuthorizationException as e:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail=str(e)
                )
        return current_user
    
    return permission_checker


def require_roles(required_roles: List[str]) -> Callable:
    """Dependency factory for requiring specific roles."""
    async def role_checker(current_user: User = Depends(get_current_user)) -> User:
        if current_user.role.value not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Required roles: {', '.join(required_roles)}"
            )
        
        return current_user
    
    return role_checker


async def get_pagination_params(
    page: int = Query(1, ge=1, description="Page number"),
    size: int = Query(20, ge=1, le=100, description="Page size")
) -> Dict[str, int]:
    """Get pagination parameters."""
    return {
        "page": page,
        "size": size,
        "offset": (page - 1) * size
    }


async def get_optional_user(
    credentials: Optional[HTTPAuthorizationCredentials] = Depends(HTTPBearer(auto_error=False))
) -> Optional[User]:
    """Get current user if authenticated, otherwise None."""
    if not credentials:
        return None
    
    try:
        token_payload = await auth_service.verify_token(credentials.credentials)
        user = auth_service.users.get(token_payload.sub)
        
        if user and user.status.value == "active":
            return user
        
    except Exception:
        pass
    
    return None