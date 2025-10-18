"""
Validation utilities for ACSO API Gateway.
"""

import re
from typing import Any, Dict, List, Optional, Union, Type
from datetime import datetime, date
from pydantic import BaseModel, ValidationError, validator
from email_validator import validate_email, EmailNotValidError

from ..models.responses import ErrorDetail, ErrorCode


class ValidationUtils:
    """Utility class for common validation operations."""
    
    # Common regex patterns
    USERNAME_PATTERN = re.compile(r'^[a-zA-Z0-9_.-]{3,50}$')
    PASSWORD_PATTERN = re.compile(r'^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[@$!%*?&])[A-Za-z\d@$!%*?&]{8,128}$')
    PHONE_PATTERN = re.compile(r'^\+?1?\d{9,15}$')
    UUID_PATTERN = re.compile(r'^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$', re.I)
    SLUG_PATTERN = re.compile(r'^[a-z0-9]+(?:-[a-z0-9]+)*$')
    
    @staticmethod
    def validate_email_address(email: str) -> bool:
        """Validate email address format."""
        try:
            validate_email(email)
            return True
        except EmailNotValidError:
            return False
    
    @staticmethod
    def validate_username(username: str) -> bool:
        """Validate username format."""
        return bool(ValidationUtils.USERNAME_PATTERN.match(username))
    
    @staticmethod
    def validate_password_strength(password: str) -> Dict[str, bool]:
        """Validate password strength and return detailed results."""
        return {
            'length': len(password) >= 8,
            'uppercase': bool(re.search(r'[A-Z]', password)),
            'lowercase': bool(re.search(r'[a-z]', password)),
            'digit': bool(re.search(r'\d', password)),
            'special': bool(re.search(r'[@$!%*?&]', password)),
            'no_whitespace': ' ' not in password,
            'max_length': len(password) <= 128
        }
    
    @staticmethod
    def is_strong_password(password: str) -> bool:
        """Check if password meets strength requirements."""
        checks = ValidationUtils.validate_password_strength(password)
        return all(checks.values())
    
    @staticmethod
    def validate_phone_number(phone: str) -> bool:
        """Validate phone number format."""
        return bool(ValidationUtils.PHONE_PATTERN.match(phone))
    
    @staticmethod
    def validate_uuid(uuid_string: str) -> bool:
        """Validate UUID format."""
        return bool(ValidationUtils.UUID_PATTERN.match(uuid_string))
    
    @staticmethod
    def validate_slug(slug: str) -> bool:
        """Validate URL slug format."""
        return bool(ValidationUtils.SLUG_PATTERN.match(slug))
    
    @staticmethod
    def validate_date_range(start_date: date, end_date: date) -> bool:
        """Validate that start date is before end date."""
        return start_date <= end_date
    
    @staticmethod
    def validate_datetime_range(start_datetime: datetime, end_datetime: datetime) -> bool:
        """Validate that start datetime is before end datetime."""
        return start_datetime <= end_datetime
    
    @staticmethod
    def validate_positive_number(value: Union[int, float]) -> bool:
        """Validate that number is positive."""
        return value > 0
    
    @staticmethod
    def validate_non_negative_number(value: Union[int, float]) -> bool:
        """Validate that number is non-negative."""
        return value >= 0
    
    @staticmethod
    def validate_percentage(value: Union[int, float]) -> bool:
        """Validate that value is a valid percentage (0-100)."""
        return 0 <= value <= 100
    
    @staticmethod
    def validate_json_object(value: Any) -> bool:
        """Validate that value is a valid JSON object."""
        try:
            import json
            json.dumps(value)
            return True
        except (TypeError, ValueError):
            return False
    
    @staticmethod
    def sanitize_string(value: str, max_length: Optional[int] = None) -> str:
        """Sanitize string input."""
        # Remove leading/trailing whitespace
        sanitized = value.strip()
        
        # Remove null bytes
        sanitized = sanitized.replace('\x00', '')
        
        # Truncate if max_length specified
        if max_length and len(sanitized) > max_length:
            sanitized = sanitized[:max_length]
        
        return sanitized
    
    @staticmethod
    def validate_file_extension(filename: str, allowed_extensions: List[str]) -> bool:
        """Validate file extension."""
        if '.' not in filename:
            return False
        
        extension = filename.rsplit('.', 1)[1].lower()
        return extension in [ext.lower() for ext in allowed_extensions]
    
    @staticmethod
    def validate_file_size(file_size: int, max_size_mb: int) -> bool:
        """Validate file size."""
        max_size_bytes = max_size_mb * 1024 * 1024
        return file_size <= max_size_bytes


class RequestValidator:
    """Request validation utilities."""
    
    @staticmethod
    def validate_pagination_params(page: int, size: int, max_size: int = 1000) -> List[ErrorDetail]:
        """Validate pagination parameters."""
        errors = []
        
        if page < 1:
            errors.append(ErrorDetail(
                code=ErrorCode.VALIDATION_ERROR,
                message="Page must be greater than 0",
                field="page"
            ))
        
        if size < 1:
            errors.append(ErrorDetail(
                code=ErrorCode.VALIDATION_ERROR,
                message="Size must be greater than 0",
                field="size"
            ))
        
        if size > max_size:
            errors.append(ErrorDetail(
                code=ErrorCode.VALIDATION_ERROR,
                message=f"Size must not exceed {max_size}",
                field="size"
            ))
        
        return errors
    
    @staticmethod
    def validate_sort_params(sort_by: Optional[str], sort_order: str, allowed_fields: List[str]) -> List[ErrorDetail]:
        """Validate sorting parameters."""
        errors = []
        
        if sort_order not in ['asc', 'desc']:
            errors.append(ErrorDetail(
                code=ErrorCode.VALIDATION_ERROR,
                message="Sort order must be 'asc' or 'desc'",
                field="sort_order"
            ))
        
        if sort_by and sort_by not in allowed_fields:
            errors.append(ErrorDetail(
                code=ErrorCode.VALIDATION_ERROR,
                message=f"Sort field must be one of: {', '.join(allowed_fields)}",
                field="sort_by"
            ))
        
        return errors
    
    @staticmethod
    def validate_filter_params(filters: Dict[str, Any], allowed_filters: Dict[str, Type]) -> List[ErrorDetail]:
        """Validate filter parameters."""
        errors = []
        
        for field, value in filters.items():
            if field not in allowed_filters:
                errors.append(ErrorDetail(
                    code=ErrorCode.VALIDATION_ERROR,
                    message=f"Filter field '{field}' is not allowed",
                    field=f"filters.{field}"
                ))
                continue
            
            expected_type = allowed_filters[field]
            if not isinstance(value, expected_type):
                errors.append(ErrorDetail(
                    code=ErrorCode.VALIDATION_ERROR,
                    message=f"Filter field '{field}' must be of type {expected_type.__name__}",
                    field=f"filters.{field}"
                ))
        
        return errors
    
    @staticmethod
    def validate_date_range_params(start_date: Optional[str], end_date: Optional[str]) -> List[ErrorDetail]:
        """Validate date range parameters."""
        errors = []
        
        if start_date and end_date:
            try:
                start = datetime.fromisoformat(start_date.replace('Z', '+00:00'))
                end = datetime.fromisoformat(end_date.replace('Z', '+00:00'))
                
                if start > end:
                    errors.append(ErrorDetail(
                        code=ErrorCode.VALIDATION_ERROR,
                        message="Start date must be before end date",
                        field="date_range"
                    ))
            except ValueError as e:
                errors.append(ErrorDetail(
                    code=ErrorCode.VALIDATION_ERROR,
                    message="Invalid date format. Use ISO 8601 format",
                    field="date_range",
                    details={"error": str(e)}
                ))
        
        return errors


class ModelValidator:
    """Model validation utilities."""
    
    @staticmethod
    def validate_model(model_class: Type[BaseModel], data: Dict[str, Any]) -> tuple[Optional[BaseModel], List[ErrorDetail]]:
        """Validate data against a Pydantic model."""
        try:
            model_instance = model_class(**data)
            return model_instance, []
        except ValidationError as e:
            errors = []
            for error in e.errors():
                field_path = '.'.join(str(loc) for loc in error['loc'])
                errors.append(ErrorDetail(
                    code=ErrorCode.VALIDATION_ERROR,
                    message=error['msg'],
                    field=field_path,
                    details={
                        'type': error['type'],
                        'input': error.get('input')
                    }
                ))
            return None, errors
    
    @staticmethod
    def validate_partial_update(model_class: Type[BaseModel], data: Dict[str, Any], exclude_fields: List[str] = None) -> tuple[Optional[Dict[str, Any]], List[ErrorDetail]]:
        """Validate partial update data."""
        exclude_fields = exclude_fields or []
        
        # Create a copy of the model with all fields optional for partial updates
        try:
            # Filter out excluded fields
            filtered_data = {k: v for k, v in data.items() if k not in exclude_fields}
            
            # Validate only provided fields
            model_instance = model_class(**filtered_data)
            return filtered_data, []
        except ValidationError as e:
            errors = []
            for error in e.errors():
                field_path = '.'.join(str(loc) for loc in error['loc'])
                errors.append(ErrorDetail(
                    code=ErrorCode.VALIDATION_ERROR,
                    message=error['msg'],
                    field=field_path,
                    details={
                        'type': error['type'],
                        'input': error.get('input')
                    }
                ))
            return None, errors


class BusinessRuleValidator:
    """Business rule validation utilities."""
    
    @staticmethod
    def validate_unique_constraint(value: Any, existing_values: List[Any], field_name: str) -> List[ErrorDetail]:
        """Validate uniqueness constraint."""
        errors = []
        if value in existing_values:
            errors.append(ErrorDetail(
                code=ErrorCode.RESOURCE_ALREADY_EXISTS,
                message=f"{field_name} already exists",
                field=field_name
            ))
        return errors
    
    @staticmethod
    def validate_foreign_key_constraint(value: Any, valid_values: List[Any], field_name: str) -> List[ErrorDetail]:
        """Validate foreign key constraint."""
        errors = []
        if value not in valid_values:
            errors.append(ErrorDetail(
                code=ErrorCode.RESOURCE_NOT_FOUND,
                message=f"Referenced {field_name} does not exist",
                field=field_name
            ))
        return errors
    
    @staticmethod
    def validate_business_rule(condition: bool, message: str, field_name: Optional[str] = None) -> List[ErrorDetail]:
        """Validate a custom business rule."""
        errors = []
        if not condition:
            errors.append(ErrorDetail(
                code=ErrorCode.BUSINESS_RULE_VIOLATION,
                message=message,
                field=field_name
            ))
        return errors


# Custom Pydantic validators
def validate_strong_password(cls, v):
    """Pydantic validator for strong passwords."""
    if not ValidationUtils.is_strong_password(v):
        raise ValueError('Password must contain at least 8 characters with uppercase, lowercase, digit, and special character')
    return v


def validate_username_format(cls, v):
    """Pydantic validator for username format."""
    if not ValidationUtils.validate_username(v):
        raise ValueError('Username must be 3-50 characters long and contain only letters, numbers, dots, hyphens, and underscores')
    return v


def validate_email_format(cls, v):
    """Pydantic validator for email format."""
    if not ValidationUtils.validate_email_address(v):
        raise ValueError('Invalid email address format')
    return v


def validate_phone_format(cls, v):
    """Pydantic validator for phone number format."""
    if v and not ValidationUtils.validate_phone_number(v):
        raise ValueError('Invalid phone number format')
    return v


def validate_positive_number(cls, v):
    """Pydantic validator for positive numbers."""
    if not ValidationUtils.validate_positive_number(v):
        raise ValueError('Value must be positive')
    return v


def validate_percentage(cls, v):
    """Pydantic validator for percentage values."""
    if not ValidationUtils.validate_percentage(v):
        raise ValueError('Value must be between 0 and 100')
    return v