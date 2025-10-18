"""
Error handling utilities for ACSO API Gateway.
"""

import logging
import traceback
from typing import Any, Dict, List, Optional, Union
from datetime import datetime
from fastapi import HTTPException, Request, status
from fastapi.responses import JSONResponse
from pydantic import ValidationError

from ..models.responses import (
    APIResponse, ErrorCode, ErrorDetail, APIError,
    create_error_response, create_validation_error_response
)

logger = logging.getLogger(__name__)


class ACSOException(Exception):
    """Base exception class for ACSO API."""
    
    def __init__(
        self,
        message: str,
        error_code: ErrorCode = ErrorCode.INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.status_code = status_code
        super().__init__(message)
    
    def to_api_error(self, request_id: Optional[str] = None) -> APIError:
        """Convert to APIError object."""
        return APIError(
            code=self.error_code,
            message=self.message,
            details=self.details,
            request_id=request_id
        )
    
    def to_http_exception(self) -> HTTPException:
        """Convert to FastAPI HTTPException."""
        return HTTPException(
            status_code=self.status_code,
            detail=self.message
        )


class ValidationException(ACSOException):
    """Exception for validation errors."""
    
    def __init__(
        self,
        message: str = "Validation failed",
        field_errors: Optional[List[ErrorDetail]] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.VALIDATION_ERROR,
            details=details,
            status_code=status.HTTP_422_UNPROCESSABLE_ENTITY
        )
        self.field_errors = field_errors or []


class AuthenticationException(ACSOException):
    """Exception for authentication errors."""
    
    def __init__(
        self,
        message: str = "Authentication failed",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.AUTHENTICATION_FAILED,
            details=details,
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthorizationException(ACSOException):
    """Exception for authorization errors."""
    
    def __init__(
        self,
        message: str = "Insufficient permissions",
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.INSUFFICIENT_PERMISSIONS,
            details=details,
            status_code=status.HTTP_403_FORBIDDEN
        )


class ResourceNotFoundException(ACSOException):
    """Exception for resource not found errors."""
    
    def __init__(
        self,
        resource_type: str,
        resource_id: Optional[str] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        message = f"{resource_type} not found"
        if resource_id:
            message += f" with ID: {resource_id}"
        
        super().__init__(
            message=message,
            error_code=ErrorCode.RESOURCE_NOT_FOUND,
            details=details,
            status_code=status.HTTP_404_NOT_FOUND
        )


class ResourceConflictException(ACSOException):
    """Exception for resource conflict errors."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.RESOURCE_CONFLICT,
            details=details,
            status_code=status.HTTP_409_CONFLICT
        )


class BusinessRuleException(ACSOException):
    """Exception for business rule violations."""
    
    def __init__(
        self,
        message: str,
        details: Optional[Dict[str, Any]] = None
    ):
        super().__init__(
            message=message,
            error_code=ErrorCode.BUSINESS_RULE_VIOLATION,
            details=details,
            status_code=status.HTTP_400_BAD_REQUEST
        )


class RateLimitException(ACSOException):
    """Exception for rate limit exceeded errors."""
    
    def __init__(
        self,
        message: str = "Rate limit exceeded",
        retry_after: Optional[int] = None,
        details: Optional[Dict[str, Any]] = None
    ):
        if retry_after:
            message += f". Try again in {retry_after} seconds"
            details = details or {}
            details["retry_after"] = retry_after
        
        super().__init__(
            message=message,
            error_code=ErrorCode.RATE_LIMIT_EXCEEDED,
            details=details,
            status_code=status.HTTP_429_TOO_MANY_REQUESTS
        )


class ExternalServiceException(ACSOException):
    """Exception for external service errors."""
    
    def __init__(
        self,
        service_name: str,
        message: str = "External service error",
        details: Optional[Dict[str, Any]] = None
    ):
        details = details or {}
        details["service"] = service_name
        
        super().__init__(
            message=f"{service_name}: {message}",
            error_code=ErrorCode.EXTERNAL_SERVICE_ERROR,
            details=details,
            status_code=status.HTTP_502_BAD_GATEWAY
        )


class ErrorHandler:
    """Centralized error handling utility."""
    
    @staticmethod
    def handle_pydantic_validation_error(
        error: ValidationError,
        request_id: Optional[str] = None
    ) -> APIResponse:
        """Handle Pydantic validation errors."""
        field_errors = []
        
        for err in error.errors():
            field_path = ".".join(str(loc) for loc in err["loc"])
            field_errors.append({
                "field": field_path,
                "message": err["msg"],
                "code": ErrorCode.VALIDATION_ERROR.value,
                "details": {
                    "type": err["type"],
                    "input": err.get("input")
                }
            })
        
        return create_validation_error_response(
            message="Request validation failed",
            field_errors=field_errors,
            request_id=request_id
        )
    
    @staticmethod
    def handle_acso_exception(
        error: ACSOException,
        request_id: Optional[str] = None
    ) -> APIResponse:
        """Handle ACSO custom exceptions."""
        if isinstance(error, ValidationException):
            field_errors = [
                {
                    "field": err.field,
                    "message": err.message,
                    "code": err.code.value
                }
                for err in error.field_errors
            ]
            return create_validation_error_response(
                message=error.message,
                field_errors=field_errors,
                request_id=request_id
            )
        
        return create_error_response(
            code=error.error_code,
            message=error.message,
            details=error.details,
            request_id=request_id
        )
    
    @staticmethod
    def handle_http_exception(
        error: HTTPException,
        request_id: Optional[str] = None
    ) -> APIResponse:
        """Handle FastAPI HTTP exceptions."""
        # Map HTTP status codes to error codes
        error_code_map = {
            400: ErrorCode.VALIDATION_ERROR,
            401: ErrorCode.AUTHENTICATION_FAILED,
            403: ErrorCode.INSUFFICIENT_PERMISSIONS,
            404: ErrorCode.RESOURCE_NOT_FOUND,
            409: ErrorCode.RESOURCE_CONFLICT,
            422: ErrorCode.VALIDATION_ERROR,
            429: ErrorCode.RATE_LIMIT_EXCEEDED,
            500: ErrorCode.INTERNAL_SERVER_ERROR,
            502: ErrorCode.EXTERNAL_SERVICE_ERROR,
            503: ErrorCode.SERVICE_UNAVAILABLE
        }
        
        error_code = error_code_map.get(error.status_code, ErrorCode.INTERNAL_SERVER_ERROR)
        
        return create_error_response(
            code=error_code,
            message=str(error.detail),
            request_id=request_id
        )
    
    @staticmethod
    def handle_generic_exception(
        error: Exception,
        request_id: Optional[str] = None,
        include_traceback: bool = False
    ) -> APIResponse:
        """Handle generic exceptions."""
        logger.error(f"Unhandled exception: {error}", exc_info=True)
        
        details = None
        if include_traceback:
            details = {
                "traceback": traceback.format_exc(),
                "exception_type": type(error).__name__
            }
        
        return create_error_response(
            code=ErrorCode.INTERNAL_SERVER_ERROR,
            message="An internal server error occurred",
            details=details,
            request_id=request_id
        )
    
    @staticmethod
    def create_error_response_from_exception(
        error: Exception,
        request_id: Optional[str] = None,
        include_traceback: bool = False
    ) -> APIResponse:
        """Create error response from any exception type."""
        if isinstance(error, ACSOException):
            return ErrorHandler.handle_acso_exception(error, request_id)
        elif isinstance(error, ValidationError):
            return ErrorHandler.handle_pydantic_validation_error(error, request_id)
        elif isinstance(error, HTTPException):
            return ErrorHandler.handle_http_exception(error, request_id)
        else:
            return ErrorHandler.handle_generic_exception(error, request_id, include_traceback)


# Utility functions for common error scenarios
def raise_not_found(resource_type: str, resource_id: Optional[str] = None):
    """Raise a resource not found exception."""
    raise ResourceNotFoundException(resource_type, resource_id)


def raise_validation_error(message: str, field: Optional[str] = None):
    """Raise a validation error."""
    field_errors = []
    if field:
        field_errors.append(ErrorDetail(
            code=ErrorCode.VALIDATION_ERROR,
            message=message,
            field=field
        ))
    raise ValidationException(message, field_errors)


def raise_unauthorized(message: str = "Authentication required"):
    """Raise an authentication error."""
    raise AuthenticationException(message)


def raise_forbidden(message: str = "Insufficient permissions"):
    """Raise an authorization error."""
    raise AuthorizationException(message)


def raise_conflict(message: str):
    """Raise a resource conflict error."""
    raise ResourceConflictException(message)


def raise_business_rule_violation(message: str):
    """Raise a business rule violation error."""
    raise BusinessRuleException(message)


def raise_rate_limit_exceeded(retry_after: Optional[int] = None):
    """Raise a rate limit exceeded error."""
    raise RateLimitException(retry_after=retry_after)


def raise_external_service_error(service_name: str, message: str = "Service unavailable"):
    """Raise an external service error."""
    raise ExternalServiceException(service_name, message)