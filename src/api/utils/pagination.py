"""
Pagination and filtering utilities for ACSO API Gateway.
"""

from typing import Any, Dict, List, Optional, Type, TypeVar, Generic, Callable
from datetime import datetime, date
from pydantic import BaseModel, Field
from enum import Enum

from ..models.responses import PaginationMeta, SortMeta, FilterMeta

T = TypeVar('T')


class SortOrder(str, Enum):
    """Sort order enumeration."""
    ASC = "asc"
    DESC = "desc"


class FilterOperator(str, Enum):
    """Filter operator enumeration."""
    EQUALS = "eq"
    NOT_EQUALS = "ne"
    GREATER_THAN = "gt"
    GREATER_THAN_OR_EQUAL = "gte"
    LESS_THAN = "lt"
    LESS_THAN_OR_EQUAL = "lte"
    CONTAINS = "contains"
    STARTS_WITH = "starts_with"
    ENDS_WITH = "ends_with"
    IN = "in"
    NOT_IN = "not_in"
    IS_NULL = "is_null"
    IS_NOT_NULL = "is_not_null"
    BETWEEN = "between"
    REGEX = "regex"


class PaginationParams(BaseModel):
    """Pagination parameters model."""
    page: int = Field(default=1, ge=1, description="Page number (1-based)")
    size: int = Field(default=20, ge=1, le=1000, description="Items per page")
    
    @property
    def offset(self) -> int:
        """Calculate offset for database queries."""
        return (self.page - 1) * self.size
    
    @property
    def limit(self) -> int:
        """Get limit for database queries."""
        return self.size


class SortParams(BaseModel):
    """Sorting parameters model."""
    sort_by: Optional[str] = Field(None, description="Field to sort by")
    sort_order: SortOrder = Field(default=SortOrder.ASC, description="Sort order")
    
    def to_sort_meta(self) -> SortMeta:
        """Convert to SortMeta."""
        return SortMeta(field=self.sort_by, order=self.sort_order.value)


class FilterParam(BaseModel):
    """Individual filter parameter."""
    field: str = Field(description="Field name to filter on")
    operator: FilterOperator = Field(description="Filter operator")
    value: Any = Field(description="Filter value")
    
    def apply_filter(self, item: Dict[str, Any]) -> bool:
        """Apply filter to a dictionary item."""
        field_value = self._get_nested_value(item, self.field)
        
        if self.operator == FilterOperator.EQUALS:
            return field_value == self.value
        elif self.operator == FilterOperator.NOT_EQUALS:
            return field_value != self.value
        elif self.operator == FilterOperator.GREATER_THAN:
            return field_value > self.value
        elif self.operator == FilterOperator.GREATER_THAN_OR_EQUAL:
            return field_value >= self.value
        elif self.operator == FilterOperator.LESS_THAN:
            return field_value < self.value
        elif self.operator == FilterOperator.LESS_THAN_OR_EQUAL:
            return field_value <= self.value
        elif self.operator == FilterOperator.CONTAINS:
            return str(self.value).lower() in str(field_value).lower()
        elif self.operator == FilterOperator.STARTS_WITH:
            return str(field_value).lower().startswith(str(self.value).lower())
        elif self.operator == FilterOperator.ENDS_WITH:
            return str(field_value).lower().endswith(str(self.value).lower())
        elif self.operator == FilterOperator.IN:
            return field_value in self.value
        elif self.operator == FilterOperator.NOT_IN:
            return field_value not in self.value
        elif self.operator == FilterOperator.IS_NULL:
            return field_value is None
        elif self.operator == FilterOperator.IS_NOT_NULL:
            return field_value is not None
        elif self.operator == FilterOperator.BETWEEN:
            return self.value[0] <= field_value <= self.value[1]
        elif self.operator == FilterOperator.REGEX:
            import re
            return bool(re.search(str(self.value), str(field_value), re.IGNORECASE))
        
        return True
    
    def _get_nested_value(self, item: Dict[str, Any], field_path: str) -> Any:
        """Get nested value from dictionary using dot notation."""
        keys = field_path.split('.')
        value = item
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        return value


class FilterParams(BaseModel):
    """Filtering parameters model."""
    filters: List[FilterParam] = Field(default_factory=list, description="List of filters")
    
    def apply_filters(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply all filters to a list of items."""
        filtered_items = items
        
        for filter_param in self.filters:
            filtered_items = [
                item for item in filtered_items
                if filter_param.apply_filter(item)
            ]
        
        return filtered_items
    
    def to_filter_meta(self) -> FilterMeta:
        """Convert to FilterMeta."""
        filter_dict = {}
        for filter_param in self.filters:
            filter_dict[filter_param.field] = {
                "operator": filter_param.operator.value,
                "value": filter_param.value
            }
        
        return FilterMeta(
            filters=filter_dict,
            active_filters=len(self.filters)
        )


class SearchParams(BaseModel):
    """Search parameters model."""
    query: Optional[str] = Field(None, description="Search query")
    fields: List[str] = Field(default_factory=list, description="Fields to search in")
    
    def apply_search(self, items: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Apply search to a list of items."""
        if not self.query:
            return items
        
        query_lower = self.query.lower()
        search_fields = self.fields if self.fields else []
        
        filtered_items = []
        for item in items:
            if self._item_matches_search(item, query_lower, search_fields):
                filtered_items.append(item)
        
        return filtered_items
    
    def _item_matches_search(self, item: Dict[str, Any], query: str, fields: List[str]) -> bool:
        """Check if item matches search query."""
        if not fields:
            # Search in all string fields
            return self._search_all_fields(item, query)
        
        # Search in specific fields
        for field in fields:
            field_value = self._get_nested_value(item, field)
            if field_value and query in str(field_value).lower():
                return True
        
        return False
    
    def _search_all_fields(self, item: Dict[str, Any], query: str) -> bool:
        """Search in all fields of an item."""
        for value in item.values():
            if isinstance(value, str) and query in value.lower():
                return True
            elif isinstance(value, dict):
                if self._search_all_fields(value, query):
                    return True
        return False
    
    def _get_nested_value(self, item: Dict[str, Any], field_path: str) -> Any:
        """Get nested value from dictionary using dot notation."""
        keys = field_path.split('.')
        value = item
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        return value


class QueryParams(BaseModel):
    """Combined query parameters model."""
    pagination: PaginationParams = Field(default_factory=PaginationParams)
    sorting: SortParams = Field(default_factory=SortParams)
    filtering: FilterParams = Field(default_factory=FilterParams)
    search: SearchParams = Field(default_factory=SearchParams)


class Paginator(Generic[T]):
    """Generic paginator class."""
    
    def __init__(self, items: List[T], page: int = 1, size: int = 20):
        self.items = items
        self.page = max(1, page)
        self.size = max(1, min(size, 1000))  # Cap at 1000 items per page
        self.total = len(items)
        self.pages = (self.total + self.size - 1) // self.size if self.total > 0 else 0
    
    @property
    def offset(self) -> int:
        """Calculate offset."""
        return (self.page - 1) * self.size
    
    @property
    def has_next(self) -> bool:
        """Check if there's a next page."""
        return self.page < self.pages
    
    @property
    def has_prev(self) -> bool:
        """Check if there's a previous page."""
        return self.page > 1
    
    @property
    def page_items(self) -> List[T]:
        """Get items for current page."""
        start = self.offset
        end = start + self.size
        return self.items[start:end]
    
    def get_pagination_meta(self) -> PaginationMeta:
        """Get pagination metadata."""
        return PaginationMeta(
            page=self.page,
            size=self.size,
            total=self.total,
            pages=self.pages,
            has_next=self.has_next,
            has_prev=self.has_prev
        )


class Sorter:
    """Utility class for sorting operations."""
    
    @staticmethod
    def sort_items(
        items: List[Dict[str, Any]],
        sort_by: Optional[str] = None,
        sort_order: SortOrder = SortOrder.ASC,
        custom_sort_func: Optional[Callable] = None
    ) -> List[Dict[str, Any]]:
        """Sort items by specified field and order."""
        if not sort_by and not custom_sort_func:
            return items
        
        if custom_sort_func:
            return sorted(items, key=custom_sort_func, reverse=(sort_order == SortOrder.DESC))
        
        def get_sort_key(item: Dict[str, Any]) -> Any:
            """Get sort key from item."""
            value = Sorter._get_nested_value(item, sort_by)
            
            # Handle None values (put them at the end)
            if value is None:
                return '' if sort_order == SortOrder.ASC else 'zzz'
            
            # Handle different data types
            if isinstance(value, (datetime, date)):
                return value
            elif isinstance(value, (int, float)):
                return value
            else:
                return str(value).lower()
        
        return sorted(items, key=get_sort_key, reverse=(sort_order == SortOrder.DESC))
    
    @staticmethod
    def _get_nested_value(item: Dict[str, Any], field_path: str) -> Any:
        """Get nested value from dictionary using dot notation."""
        keys = field_path.split('.')
        value = item
        
        for key in keys:
            if isinstance(value, dict) and key in value:
                value = value[key]
            else:
                return None
        
        return value


class QueryProcessor:
    """Process query parameters and apply to data."""
    
    def __init__(self, allowed_sort_fields: List[str] = None, allowed_filter_fields: List[str] = None):
        self.allowed_sort_fields = allowed_sort_fields or []
        self.allowed_filter_fields = allowed_filter_fields or []
    
    def process_query(
        self,
        items: List[Dict[str, Any]],
        query_params: QueryParams
    ) -> tuple[List[Dict[str, Any]], PaginationMeta, SortMeta, FilterMeta]:
        """Process query parameters and return filtered, sorted, paginated results."""
        
        # Apply search
        filtered_items = query_params.search.apply_search(items)
        
        # Apply filters
        filtered_items = query_params.filtering.apply_filters(filtered_items)
        
        # Apply sorting
        if query_params.sorting.sort_by:
            if not self.allowed_sort_fields or query_params.sorting.sort_by in self.allowed_sort_fields:
                filtered_items = Sorter.sort_items(
                    filtered_items,
                    query_params.sorting.sort_by,
                    query_params.sorting.sort_order
                )
        
        # Apply pagination
        paginator = Paginator(filtered_items, query_params.pagination.page, query_params.pagination.size)
        
        return (
            paginator.page_items,
            paginator.get_pagination_meta(),
            query_params.sorting.to_sort_meta(),
            query_params.filtering.to_filter_meta()
        )


# Utility functions for common query operations
def create_pagination_params(page: int = 1, size: int = 20) -> PaginationParams:
    """Create pagination parameters with validation."""
    return PaginationParams(page=max(1, page), size=max(1, min(size, 1000)))


def create_sort_params(sort_by: Optional[str] = None, sort_order: str = "asc") -> SortParams:
    """Create sort parameters with validation."""
    order = SortOrder.ASC if sort_order.lower() == "asc" else SortOrder.DESC
    return SortParams(sort_by=sort_by, sort_order=order)


def create_filter_params(filters: List[Dict[str, Any]]) -> FilterParams:
    """Create filter parameters from list of filter dictionaries."""
    filter_objects = []
    for filter_dict in filters:
        filter_objects.append(FilterParam(**filter_dict))
    return FilterParams(filters=filter_objects)


def create_search_params(query: Optional[str] = None, fields: List[str] = None) -> SearchParams:
    """Create search parameters."""
    return SearchParams(query=query, fields=fields or [])


def paginate_items(items: List[T], page: int, size: int) -> tuple[List[T], PaginationMeta]:
    """Simple pagination utility function."""
    paginator = Paginator(items, page, size)
    return paginator.page_items, paginator.get_pagination_meta()