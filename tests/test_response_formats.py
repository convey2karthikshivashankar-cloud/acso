"""
Test standardized API response formats.
"""

import pytest
from datetime import datetime
from fastapi.testclient import TestClient
from pydantic import ValidationError

from src.api.models.responses import (
    APIResponse, ErrorCode, ErrorDetail, PaginationMeta,
    create_success_response, create_error_response,
    create_paginated_response, create_validation_error_response
)
from src.api.utils.pagination import (
    PaginationParams, SortParams, FilterParams,
    Paginator, create_pagination_params
)
from src.api.utils.validation import ValidationUtils, RequestValidator
from src.api.utils.errors import (
    ACSOException, ValidationException, ResourceNotFoundException,
    ErrorHandler, raise_not_found, raise_validation_error
)


class TestAPIResponse:
    """Test APIResponse model."""
    
    def test_success_response_creation(self):
        """Test creating a success response."""
        data = {"message": "Operation successful", "id": "123"}
        response = APIResponse.success_response(data)
        
        assert response.success is True
        assert response.status == "success"
        assert response.data == data
        assert response.error is None
        assert response.meta is not None
        assert isinstance(response.meta.timestamp, datetime)
    
    def test_error_response_creation(self):
        """Test creating an error response."""
        error = ErrorDetail(
            code=ErrorCode.VALIDATION_ERROR,
            message="Invalid input",
            field="username"
        )
        response = APIResponse.error_response(error)
        
        assert response.success is False
        assert response.status == "error"
        assert response.data is None
        assert response.error is not None
        assert response.error.code == ErrorCode.VALIDATION_ERROR
        assert response.error.message == "Invalid input"
    
    def test_validation_error_response(self):
        """Test creating a validation error response."""
        errors = [
            ErrorDetail(
                code=ErrorCode.VALIDATION_ERROR,
                message="Field is required",
                field="username"
            ),
            ErrorDetail(
                code=ErrorCode.VALIDATION_ERROR,
                message="Invalid format",
                field="email"
            )
        ]
        response = APIResponse.validation_error_response("Validation failed", errors)
        
        assert response.success is False
        assert response.status == "error"
        assert response.error.code == ErrorCode.VALIDATION_ERROR
        assert len(response.error.errors) == 2


class TestPaginationMeta:
    """Test PaginationMeta model."""
    
    def test_pagination_meta_creation(self):
        """Test creating pagination metadata."""
        meta = PaginationMeta.create(page=2, size=10, total=25)
        
        assert meta.page == 2
        assert meta.size == 10
        assert meta.total == 25
        assert meta.pages == 3
        assert meta.has_next is True
        assert meta.has_prev is True
    
    def test_pagination_meta_first_page(self):
        """Test pagination metadata for first page."""
        meta = PaginationMeta.create(page=1, size=10, total=25)
        
        assert meta.has_next is True
        assert meta.has_prev is False
    
    def test_pagination_meta_last_page(self):
        """Test pagination metadata for last page."""
        meta = PaginationMeta.create(page=3, size=10, total=25)
        
        assert meta.has_next is False
        assert meta.has_prev is True
    
    def test_pagination_meta_empty_results(self):
        """Test pagination metadata with no results."""
        meta = PaginationMeta.create(page=1, size=10, total=0)
        
        assert meta.pages == 0
        assert meta.has_next is False
        assert meta.has_prev is False


class TestResponseFactoryFunctions:
    """Test response factory functions."""
    
    def test_create_success_response(self):
        """Test create_success_response function."""
        data = {"id": "123", "name": "Test"}
        response = create_success_response(
            data=data,
            message="Success",
            request_id="req_123"
        )
        
        assert response.success is True
        assert response.data["message"] == "Success"
        assert response.data["data"] == data
        assert response.meta.request_id == "req_123"
    
    def test_create_error_response(self):
        """Test create_error_response function."""
        response = create_error_response(
            code=ErrorCode.RESOURCE_NOT_FOUND,
            message="User not found",
            request_id="req_123"
        )
        
        assert response.success is False
        assert response.error.code == ErrorCode.RESOURCE_NOT_FOUND
        assert response.error.message == "User not found"
        assert response.meta.request_id == "req_123"
    
    def test_create_paginated_response(self):
        """Test create_paginated_response function."""
        items = [{"id": i, "name": f"Item {i}"} for i in range(1, 6)]
        response = create_paginated_response(
            items=items,
            page=1,
            size=5,
            total=20,
            request_id="req_123"
        )
        
        assert response.success is True
        assert len(response.data["items"]) == 5
        assert response.data["pagination"]["total"] == 20
        assert response.data["pagination"]["pages"] == 4
        assert response.meta.request_id == "req_123"


class TestPaginationUtils:
    """Test pagination utilities."""
    
    def test_pagination_params(self):
        """Test PaginationParams model."""
        params = PaginationParams(page=2, size=10)
        
        assert params.page == 2
        assert params.size == 10
        assert params.offset == 10
        assert params.limit == 10
    
    def test_pagination_params_validation(self):
        """Test PaginationParams validation."""
        # Test minimum values
        params = PaginationParams(page=0, size=0)
        assert params.page == 1  # Should be corrected to minimum
        assert params.size == 1   # Should be corrected to minimum
        
        # Test maximum size
        params = PaginationParams(page=1, size=2000)
        assert params.size == 1000  # Should be capped at maximum
    
    def test_paginator(self):
        """Test Paginator class."""
        items = list(range(1, 26))  # 25 items
        paginator = Paginator(items, page=2, size=10)
        
        assert paginator.total == 25
        assert paginator.pages == 3
        assert paginator.has_next is True
        assert paginator.has_prev is True
        assert len(paginator.page_items) == 10
        assert paginator.page_items[0] == 11  # Second page starts at item 11
    
    def test_create_pagination_params(self):
        """Test create_pagination_params utility function."""
        params = create_pagination_params(page=2, size=50)
        
        assert params.page == 2
        assert params.size == 50
        
        # Test with invalid values
        params = create_pagination_params(page=-1, size=2000)
        assert params.page == 1
        assert params.size == 1000


class TestValidationUtils:
    """Test validation utilities."""
    
    def test_email_validation(self):
        """Test email validation."""
        assert ValidationUtils.validate_email_address("test@example.com") is True
        assert ValidationUtils.validate_email_address("invalid-email") is False
        assert ValidationUtils.validate_email_address("test@") is False
    
    def test_username_validation(self):
        """Test username validation."""
        assert ValidationUtils.validate_username("valid_user123") is True
        assert ValidationUtils.validate_username("ab") is False  # Too short
        assert ValidationUtils.validate_username("user@invalid") is False  # Invalid chars
    
    def test_password_strength(self):
        """Test password strength validation."""
        strong_password = "StrongPass123!"
        weak_password = "weak"
        
        strong_checks = ValidationUtils.validate_password_strength(strong_password)
        weak_checks = ValidationUtils.validate_password_strength(weak_password)
        
        assert ValidationUtils.is_strong_password(strong_password) is True
        assert ValidationUtils.is_strong_password(weak_password) is False
        
        assert strong_checks["length"] is True
        assert strong_checks["uppercase"] is True
        assert strong_checks["lowercase"] is True
        assert strong_checks["digit"] is True
        assert strong_checks["special"] is True
        
        assert weak_checks["length"] is False
    
    def test_request_validator(self):
        """Test RequestValidator utilities."""
        # Test pagination validation
        errors = RequestValidator.validate_pagination_params(0, 0)
        assert len(errors) == 2
        assert any("Page must be greater than 0" in error.message for error in errors)
        assert any("Size must be greater than 0" in error.message for error in errors)
        
        # Test sort validation
        errors = RequestValidator.validate_sort_params("invalid_field", "invalid_order", ["valid_field"])
        assert len(errors) == 2
        
        # Test filter validation
        errors = RequestValidator.validate_filter_params(
            {"invalid_field": "value"}, 
            {"valid_field": str}
        )
        assert len(errors) == 1
        assert "not allowed" in errors[0].message


class TestErrorHandling:
    """Test error handling utilities."""
    
    def test_acso_exception(self):
        """Test ACSOException base class."""
        exception = ACSOException(
            message="Test error",
            error_code=ErrorCode.VALIDATION_ERROR,
            details={"field": "username"}
        )
        
        assert exception.message == "Test error"
        assert exception.error_code == ErrorCode.VALIDATION_ERROR
        assert exception.details["field"] == "username"
        
        # Test conversion to API error
        api_error = exception.to_api_error("req_123")
        assert api_error.code == ErrorCode.VALIDATION_ERROR
        assert api_error.message == "Test error"
        assert api_error.request_id == "req_123"
    
    def test_validation_exception(self):
        """Test ValidationException."""
        field_errors = [
            ErrorDetail(
                code=ErrorCode.VALIDATION_ERROR,
                message="Required field",
                field="username"
            )
        ]
        exception = ValidationException("Validation failed", field_errors)
        
        assert exception.error_code == ErrorCode.VALIDATION_ERROR
        assert len(exception.field_errors) == 1
        assert exception.field_errors[0].field == "username"
    
    def test_resource_not_found_exception(self):
        """Test ResourceNotFoundException."""
        exception = ResourceNotFoundException("User", "123")
        
        assert "User not found with ID: 123" in exception.message
        assert exception.error_code == ErrorCode.RESOURCE_NOT_FOUND
    
    def test_error_handler_pydantic_validation(self):
        """Test ErrorHandler with Pydantic validation errors."""
        # This would typically come from a Pydantic model validation failure
        # For testing, we'll simulate the error structure
        class TestModel:
            def __init__(self):
                pass
        
        # Test the error handler directly
        response = create_validation_error_response(
            message="Validation failed",
            field_errors=[
                {
                    "field": "username",
                    "message": "Field required",
                    "code": ErrorCode.VALIDATION_ERROR.value
                }
            ]
        )
        
        assert response.success is False
        assert "Validation failed" in response.error.message
    
    def test_utility_functions(self):
        """Test error utility functions."""
        # Test raise_not_found
        with pytest.raises(ResourceNotFoundException) as exc_info:
            raise_not_found("User", "123")
        
        assert "User not found with ID: 123" in str(exc_info.value)
        
        # Test raise_validation_error
        with pytest.raises(ValidationException) as exc_info:
            raise_validation_error("Invalid input", "username")
        
        assert exc_info.value.message == "Invalid input"
        assert len(exc_info.value.field_errors) == 1
        assert exc_info.value.field_errors[0].field == "username"


class TestIntegration:
    """Test integration between different components."""
    
    def test_complete_workflow(self):
        """Test a complete workflow from validation to response."""
        # Simulate a paginated API endpoint workflow
        
        # 1. Validate pagination parameters
        page, size = 1, 10
        pagination_errors = RequestValidator.validate_pagination_params(page, size)
        assert len(pagination_errors) == 0
        
        # 2. Create pagination params
        pagination = create_pagination_params(page, size)
        assert pagination.page == 1
        assert pagination.size == 10
        
        # 3. Simulate data retrieval and pagination
        all_items = [{"id": i, "name": f"Item {i}"} for i in range(1, 26)]
        paginator = Paginator(all_items, page, size)
        
        # 4. Create paginated response
        response = create_paginated_response(
            items=paginator.page_items,
            page=page,
            size=size,
            total=paginator.total,
            request_id="test_req_123"
        )
        
        # 5. Verify response structure
        assert response.success is True
        assert len(response.data["items"]) == 10
        assert response.data["pagination"]["total"] == 25
        assert response.data["pagination"]["has_next"] is True
        assert response.meta.request_id == "test_req_123"


if __name__ == "__main__":
    pytest.main([__file__, "-v"])