"""
Standardized API response models for ACSO API Gateway.
"""

from datetime import datetime
from typing import Generic, TypeVar, Optional, List, Dict, Any, Union
from pydantic import BaseModel, Field
from enum import Enum


# Generic type for response data
T = TypeVar('T')


class ResponseStatus(str, Enum):
    """Response status enumeration."""
    SUCCESS = "success"
    ERROR = "error"
    WARNING = "warning"
    PARTIAL = "partial"


class ErrorCode(str, Enum):
    """Standard error codes."""
    # Authentication errors
    AUTHENTICATION_FAILED = "AUTHENTICATION_FAILED"
    AUTHORIZATION_FAILED = "AUTHORIZATION_FAILED"
    TOKEN_EXPIRED = "TOKEN_EXPIRED"
    INVALID_TOKEN = "INVALID_TOKEN"
    
    # Validation errors
    VALIDATION_ERROR = "VALIDATION_ERROR"
    INVALID_INPUT = "INVALID_INPUT"
    MISSING_REQUIRED_FIELD = "MISSING_REQUIRED_FIELD"
    INVALID_FORMAT = "INVALID_FORMAT"
    
    # Resource errors
    RESOURCE_NOT_FOUND = "RESOURCE_NOT_FOUND"
    RESOURCE_ALREADY_EXISTS = "RESOURCE_ALREADY_EXISTS"
    RESOURCE_CONFLICT = "RESOURCE_CONFLICT"
    RESOURCE_LOCKED = "RESOURCE_LOCKED"
    
    # Permission errors
    INSUFFICIENT_PERMISSIONS = "INSUFFICIENT_PERMISSIONS"
    ACCESS_DENIED = "ACCESS_DENIED"
    OPERATION_NOT_ALLOWED = "OPERATION_NOT_ALLOWED"
    
    # Rate limiting
    RATE_LIMIT_EXCEEDED = "RATE_LIMIT_EXCEEDED"
    QUOTA_EXCEEDED = "QUOTA_EXCEEDED"
    
    # System errors
    INTERNAL_SERVER_ERROR = "INTERNAL_SERVER_ERROR"
    SERVICE_UNAVAILABLE = "SERVICE_UNAVAILABLE"
    TIMEOUT = "TIMEOUT"
    DATABASE_ERROR = "DATABASE_ERROR"
    EXTERNAL_SERVICE_ERROR = "EXTERNAL_SERVICE_ERROR"
    
    # Business logic errors
    BUSINESS_RULE_VIOLATION = "BUSINESS_RULE_VIOLATION"
    WORKFLOW_ERROR = "WORKFLOW_ERROR"
    AGENT_ERROR = "AGENT_ERROR"


class ErrorDetail(BaseModel):
    """Detailed error information."""
    code: ErrorCode
    message: str
    field: Optional[str] = None
    details: Optional[Dict[str, Any]] = None
    
    class Config:
        use_enum_values = True


class APIError(BaseModel):
    """API error response model."""
    code: ErrorCode
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None
    errors: Optional[List[ErrorDetail]] = None  # For validation errors
    
    class Config:
        use_enum_values = True


class PaginationMeta(BaseModel):
    """Pagination metadata."""
    page: int = Field(ge=1, description="Current page number")
    size: int = Field(ge=1, le=1000, description="Items per page")
    total: int = Field(ge=0, description="Total number of items")
    pages: int = Field(ge=0, description="Total number of pages")
    has_next: bool = Field(description="Whether there is a next page")
    has_prev: bool = Field(description="Whether there is a previous page")
    
    @classmethod
    def create(cls, page: int, size: int, total: int) -> "PaginationMeta":
        """Create pagination metadata."""
        pages = (total + size - 1) // size if total > 0 else 0
        return cls(
            page=page,
            size=size,
            total=total,
            pages=pages,
            has_next=page < pages,
            has_prev=page > 1
        )


class SortMeta(BaseModel):
    """Sorting metadata."""
    field: Optional[str] = None
    order: str = Field(default="asc", regex="^(asc|desc)$")
    
    class Config:
        use_enum_values = True


class FilterMeta(BaseModel):
    """Filtering metadata."""
    filters: Dict[str, Any] = Field(default_factory=dict)
    active_filters: int = Field(default=0, ge=0)


class ResponseMeta(BaseModel):
    """Response metadata."""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    request_id: Optional[str] = None
    execution_time: Optional[float] = Field(None, description="Execution time in seconds")
    version: str = Field(default="1.0.0", description="API version")
    pagination: Optional[PaginationMeta] = None
    sorting: Optional[SortMeta] = None
    filtering: Optional[FilterMeta] = None


class APIResponse(BaseModel, Generic[T]):
    """Generic API response model."""
    success: bool = Field(description="Whether the request was successful")
    status: ResponseStatus = Field(description="Response status")
    data: Optional[T] = Field(None, description="Response data")
    error: Optional[APIError] = Field(None, description="Error information")
    meta: ResponseMeta = Field(default_factory=ResponseMeta, description="Response metadata")
    
    class Config:
        use_enum_values = True
    
    @classmethod
    def success_response(
        cls,
        data: T,
        meta: Optional[ResponseMeta] = None,
        status: ResponseStatus = ResponseStatus.SUCCESS
    ) -> "APIResponse[T]":
        """Create a successful response."""
        return cls(
            success=True,
            status=status,
            data=data,
            meta=meta or ResponseMeta()
        )
    
    @classmethod
    def error_response(
        cls,
        error: APIError,
        status: ResponseStatus = ResponseStatus.ERROR,
        meta: Optional[ResponseMeta] = None
    ) -> "APIResponse[None]":
        """Create an error response."""
        return cls(
            success=False,
            status=status,
            error=error,
            meta=meta or ResponseMeta()
        )
    
    @classmethod
    def validation_error_response(
        cls,
        message: str,
        errors: List[ErrorDetail],
        meta: Optional[ResponseMeta] = None
    ) -> "APIResponse[None]":
        """Create a validation error response."""
        error = APIError(
            code=ErrorCode.VALIDATION_ERROR,
            message=message,
            errors=errors
        )
        return cls.error_response(error, meta=meta)


class PaginatedResponse(BaseModel, Generic[T]):
    """Paginated response model."""
    items: List[T] = Field(description="List of items")
    pagination: PaginationMeta = Field(description="Pagination metadata")
    
    @classmethod
    def create(
        cls,
        items: List[T],
        page: int,
        size: int,
        total: int
    ) -> "PaginatedResponse[T]":
        """Create a paginated response."""
        return cls(
            items=items,
            pagination=PaginationMeta.create(page, size, total)
        )


class HealthCheckResponse(BaseModel):
    """Health check response model."""
    status: str = Field(description="Overall health status")
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    version: str = Field(description="API version")
    environment: str = Field(description="Environment name")
    uptime: Optional[float] = Field(None, description="Uptime in seconds")
    components: Dict[str, Dict[str, Any]] = Field(
        default_factory=dict,
        description="Component health status"
    )
    checks: Dict[str, str] = Field(
        default_factory=dict,
        description="Health check results"
    )


class MetricsResponse(BaseModel):
    """Metrics response model."""
    timestamp: datetime = Field(default_factory=datetime.utcnow)
    application: Dict[str, Any] = Field(
        default_factory=dict,
        description="Application metrics"
    )
    system: Dict[str, Any] = Field(
        default_factory=dict,
        description="System metrics"
    )
    custom: Dict[str, Any] = Field(
        default_factory=dict,
        description="Custom metrics"
    )


class BulkOperationResult(BaseModel):
    """Bulk operation result model."""
    total: int = Field(ge=0, description="Total number of items processed")
    successful: int = Field(ge=0, description="Number of successful operations")
    failed: int = Field(ge=0, description="Number of failed operations")
    errors: List[Dict[str, Any]] = Field(
        default_factory=list,
        description="List of errors for failed operations"
    )
    
    @property
    def success_rate(self) -> float:
        """Calculate success rate."""
        if self.total == 0:
            return 0.0
        return (self.successful / self.total) * 100


class AsyncOperationResponse(BaseModel):
    """Async operation response model."""
    operation_id: str = Field(description="Unique operation identifier")
    status: str = Field(description="Operation status")
    created_at: datetime = Field(default_factory=datetime.utcnow)
    estimated_completion: Optional[datetime] = None
    progress: Optional[float] = Field(None, ge=0, le=100, description="Progress percentage")
    result_url: Optional[str] = Field(None, description="URL to check operation result")


class ValidationErrorResponse(BaseModel):
    """Validation error response model."""
    message: str = Field(description="Error message")
    errors: List[Dict[str, Any]] = Field(description="List of validation errors")
    
    @classmethod
    def from_pydantic_error(cls, validation_error) -> "ValidationErrorResponse":
        """Create validation error response from Pydantic validation error."""
        errors = []
        for error in validation_error.errors():
            errors.append({
                "field": ".".join(str(loc) for loc in error["loc"]),
                "message": error["msg"],
                "type": error["type"],
                "input": error.get("input")
            })
        
        return cls(
            message="Validation failed",
            errors=errors
        )


# Common response types
SuccessResponse = APIResponse[Dict[str, str]]
ListResponse = APIResponse[List[Dict[str, Any]]]
PaginatedListResponse = APIResponse[PaginatedResponse[Dict[str, Any]]]
BulkResponse = APIResponse[BulkOperationResult]
AsyncResponse = APIResponse[AsyncOperationResponse]


# Response factory functions
def create_success_response(
    data: Any,
    message: Optional[str] = None,
    request_id: Optional[str] = None,
    execution_time: Optional[float] = None
) -> APIResponse:
    """Create a standardized success response."""
    meta = ResponseMeta(
        request_id=request_id,
        execution_time=execution_time
    )
    
    if message:
        # If message is provided, wrap data with message
        response_data = {"message": message, "data": data} if data else {"message": message}
        return APIResponse.success_response(response_data, meta=meta)
    
    return APIResponse.success_response(data, meta=meta)


def create_error_response(
    code: ErrorCode,
    message: str,
    details: Optional[Dict[str, Any]] = None,
    request_id: Optional[str] = None,
    execution_time: Optional[float] = None
) -> APIResponse:
    """Create a standardized error response."""
    meta = ResponseMeta(
        request_id=request_id,
        execution_time=execution_time
    )
    
    error = APIError(
        code=code,
        message=message,
        details=details,
        request_id=request_id
    )
    
    return APIResponse.error_response(error, meta=meta)


def create_paginated_response(
    items: List[Any],
    page: int,
    size: int,
    total: int,
    request_id: Optional[str] = None,
    execution_time: Optional[float] = None,
    sort_field: Optional[str] = None,
    sort_order: str = "asc",
    filters: Optional[Dict[str, Any]] = None
) -> APIResponse:
    """Create a standardized paginated response."""
    paginated_data = PaginatedResponse.create(items, page, size, total)
    
    meta = ResponseMeta(
        request_id=request_id,
        execution_time=execution_time,
        pagination=paginated_data.pagination,
        sorting=SortMeta(field=sort_field, order=sort_order) if sort_field else None,
        filtering=FilterMeta(
            filters=filters or {},
            active_filters=len(filters) if filters else 0
        )
    )
    
    return APIResponse.success_response(paginated_data, meta=meta)


def create_validation_error_response(
    message: str,
    field_errors: List[Dict[str, str]],
    request_id: Optional[str] = None
) -> APIResponse:
    """Create a standardized validation error response."""
    errors = [
        ErrorDetail(
            code=ErrorCode.VALIDATION_ERROR,
            message=error["message"],
            field=error.get("field"),
            details=error.get("details")
        )
        for error in field_errors
    ]
    
    meta = ResponseMeta(request_id=request_id)
    
    return APIResponse.validation_error_response(message, errors, meta=meta)


def create_bulk_operation_response(
    total: int,
    successful: int,
    failed: int,
    errors: List[Dict[str, Any]],
    request_id: Optional[str] = None,
    execution_time: Optional[float] = None
) -> APIResponse:
    """Create a standardized bulk operation response."""
    bulk_result = BulkOperationResult(
        total=total,
        successful=successful,
        failed=failed,
        errors=errors
    )
    
    meta = ResponseMeta(
        request_id=request_id,
        execution_time=execution_time
    )
    
    status = ResponseStatus.SUCCESS if failed == 0 else ResponseStatus.PARTIAL
    
    return APIResponse.success_response(bulk_result, meta=meta, status=status)