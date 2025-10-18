"""
Financial data models for ACSO API Gateway.
"""

from datetime import datetime, date
from typing import List, Optional, Dict, Any, Union
from pydantic import BaseModel, Field, validator
from enum import Enum
from decimal import Decimal


class CostGranularity(str, Enum):
    """Cost data granularity options."""
    HOURLY = "hourly"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"


class CostDimension(str, Enum):
    """Cost breakdown dimensions."""
    SERVICE = "service"
    REGION = "region"
    ACCOUNT = "account"
    TAG = "tag"
    RESOURCE_TYPE = "resource_type"
    DEPARTMENT = "department"
    PROJECT = "project"


class BudgetStatus(str, Enum):
    """Budget status values."""
    UNDER_BUDGET = "under_budget"
    ON_TRACK = "on_track"
    OVER_BUDGET = "over_budget"
    EXCEEDED = "exceeded"


class ForecastModel(str, Enum):
    """Forecasting model types."""
    LINEAR = "linear"
    EXPONENTIAL = "exponential"
    SEASONAL = "seasonal"
    ARIMA = "arima"
    MACHINE_LEARNING = "ml"


class CostData(BaseModel):
    """Cost data point."""
    date: date = Field(..., description="Date of the cost data")
    amount: Decimal = Field(..., description="Cost amount")
    currency: str = Field(default="USD", description="Currency code")
    service: Optional[str] = Field(None, description="Service name")
    region: Optional[str] = Field(None, description="Region")
    account_id: Optional[str] = Field(None, description="Account ID")
    tags: Dict[str, str] = Field(default_factory=dict, description="Resource tags")
    usage_quantity: Optional[float] = Field(None, description="Usage quantity")
    usage_unit: Optional[str] = Field(None, description="Usage unit")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class CostBreakdown(BaseModel):
    """Cost breakdown by dimension."""
    dimension_value: str = Field(..., description="Value of the dimension")
    amount: Decimal = Field(..., description="Cost amount")
    percentage: float = Field(..., description="Percentage of total cost")
    currency: str = Field(default="USD", description="Currency code")
    change_from_previous: Optional[float] = Field(None, description="Change from previous period")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class BudgetData(BaseModel):
    """Budget information."""
    id: str = Field(..., description="Budget ID")
    name: str = Field(..., description="Budget name")
    department: str = Field(..., description="Department")
    period_start: date = Field(..., description="Budget period start")
    period_end: date = Field(..., description="Budget period end")
    allocated_amount: Decimal = Field(..., description="Allocated budget amount")
    spent_amount: Decimal = Field(..., description="Amount spent")
    remaining_amount: Decimal = Field(..., description="Remaining budget")
    utilization_percentage: float = Field(..., description="Budget utilization percentage")
    status: BudgetStatus = Field(..., description="Budget status")
    currency: str = Field(default="USD", description="Currency code")
    alerts_enabled: bool = Field(default=True, description="Whether alerts are enabled")
    alert_thresholds: List[float] = Field(default_factory=lambda: [50.0, 80.0, 100.0], description="Alert thresholds")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class ForecastData(BaseModel):
    """Financial forecast data."""
    date: date = Field(..., description="Forecast date")
    predicted_amount: Decimal = Field(..., description="Predicted cost amount")
    confidence_lower: Decimal = Field(..., description="Lower confidence bound")
    confidence_upper: Decimal = Field(..., description="Upper confidence bound")
    confidence_level: float = Field(..., description="Confidence level")
    model_used: ForecastModel = Field(..., description="Forecasting model used")
    currency: str = Field(default="USD", description="Currency code")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class ROICalculation(BaseModel):
    """ROI calculation input."""
    investment_amount: Decimal = Field(..., description="Initial investment amount")
    benefits: List[Dict[str, Any]] = Field(..., description="List of benefits over time")
    time_period_months: int = Field(..., description="Time period in months")
    discount_rate: float = Field(default=0.05, description="Discount rate for NPV calculation")
    currency: str = Field(default="USD", description="Currency code")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class ROIResults(BaseModel):
    """ROI calculation results."""
    roi_percentage: float = Field(..., description="ROI as percentage")
    net_present_value: Decimal = Field(..., description="Net Present Value")
    payback_period_months: Optional[float] = Field(None, description="Payback period in months")
    internal_rate_of_return: Optional[float] = Field(None, description="Internal Rate of Return")
    total_benefits: Decimal = Field(..., description="Total benefits")
    total_costs: Decimal = Field(..., description="Total costs")
    break_even_point: Optional[date] = Field(None, description="Break-even date")
    currency: str = Field(default="USD", description="Currency code")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class CostOptimizationRecommendation(BaseModel):
    """Cost optimization recommendation."""
    id: str = Field(..., description="Recommendation ID")
    title: str = Field(..., description="Recommendation title")
    description: str = Field(..., description="Detailed description")
    category: str = Field(..., description="Recommendation category")
    potential_savings: Decimal = Field(..., description="Potential cost savings")
    implementation_effort: str = Field(..., description="Implementation effort level")
    priority: str = Field(..., description="Priority level")
    affected_resources: List[str] = Field(default_factory=list, description="Affected resources")
    implementation_steps: List[str] = Field(default_factory=list, description="Implementation steps")
    risks: List[str] = Field(default_factory=list, description="Associated risks")
    currency: str = Field(default="USD", description="Currency code")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class FinancialAlert(BaseModel):
    """Financial alert."""
    id: str = Field(..., description="Alert ID")
    type: str = Field(..., description="Alert type")
    severity: str = Field(..., description="Alert severity")
    title: str = Field(..., description="Alert title")
    message: str = Field(..., description="Alert message")
    threshold_value: Optional[Decimal] = Field(None, description="Threshold value")
    current_value: Optional[Decimal] = Field(None, description="Current value")
    budget_id: Optional[str] = Field(None, description="Related budget ID")
    created_at: datetime = Field(..., description="Alert creation time")
    acknowledged: bool = Field(default=False, description="Whether alert is acknowledged")
    acknowledged_by: Optional[str] = Field(None, description="User who acknowledged")
    acknowledged_at: Optional[datetime] = Field(None, description="Acknowledgment time")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class FinancialReport(BaseModel):
    """Financial report."""
    id: str = Field(..., description="Report ID")
    title: str = Field(..., description="Report title")
    report_type: str = Field(..., description="Report type")
    period_start: date = Field(..., description="Report period start")
    period_end: date = Field(..., description="Report period end")
    generated_at: datetime = Field(..., description="Report generation time")
    generated_by: str = Field(..., description="User who generated report")
    summary: Dict[str, Any] = Field(..., description="Report summary")
    sections: List[Dict[str, Any]] = Field(..., description="Report sections")
    charts: List[Dict[str, Any]] = Field(default_factory=list, description="Chart data")
    recommendations: List[str] = Field(default_factory=list, description="Recommendations")
    currency: str = Field(default="USD", description="Currency code")


class CostAllocation(BaseModel):
    """Cost allocation rule."""
    id: str = Field(..., description="Allocation rule ID")
    name: str = Field(..., description="Rule name")
    description: Optional[str] = Field(None, description="Rule description")
    source_filters: Dict[str, Any] = Field(..., description="Source cost filters")
    allocation_method: str = Field(..., description="Allocation method")
    allocation_targets: List[Dict[str, Any]] = Field(..., description="Allocation targets")
    enabled: bool = Field(default=True, description="Whether rule is enabled")
    created_at: datetime = Field(..., description="Creation time")
    created_by: str = Field(..., description="Creator user ID")


class FinancialMetrics(BaseModel):
    """Financial metrics summary."""
    total_cost: Decimal = Field(..., description="Total cost")
    monthly_cost: Decimal = Field(..., description="Monthly cost")
    daily_cost: Decimal = Field(..., description="Daily cost")
    cost_trend: str = Field(..., description="Cost trend direction")
    budget_utilization: float = Field(..., description="Overall budget utilization")
    top_cost_services: List[Dict[str, Any]] = Field(..., description="Top cost services")
    cost_by_region: Dict[str, Decimal] = Field(..., description="Cost by region")
    optimization_opportunities: int = Field(..., description="Number of optimization opportunities")
    potential_savings: Decimal = Field(..., description="Total potential savings")
    currency: str = Field(default="USD", description="Currency code")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


# Request Models

class CostDataRequest(BaseModel):
    """Request for cost data."""
    start_date: date = Field(..., description="Start date")
    end_date: date = Field(..., description="End date")
    granularity: CostGranularity = Field(default=CostGranularity.DAILY, description="Data granularity")
    services: Optional[List[str]] = Field(None, description="Service filters")
    regions: Optional[List[str]] = Field(None, description="Region filters")
    accounts: Optional[List[str]] = Field(None, description="Account filters")
    tags: Optional[Dict[str, str]] = Field(None, description="Tag filters")


class BudgetCreateRequest(BaseModel):
    """Request to create a budget."""
    name: str = Field(..., min_length=1, max_length=100, description="Budget name")
    description: Optional[str] = Field(None, max_length=500, description="Budget description")
    department: str = Field(..., description="Department")
    period_start: date = Field(..., description="Budget period start")
    period_end: date = Field(..., description="Budget period end")
    allocated_amount: Decimal = Field(..., gt=0, description="Allocated budget amount")
    currency: str = Field(default="USD", description="Currency code")
    alert_thresholds: Optional[List[float]] = Field(None, description="Alert thresholds")


class BudgetUpdateRequest(BaseModel):
    """Request to update a budget."""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="Budget name")
    description: Optional[str] = Field(None, max_length=500, description="Budget description")
    allocated_amount: Optional[Decimal] = Field(None, gt=0, description="Allocated budget amount")
    alert_thresholds: Optional[List[float]] = Field(None, description="Alert thresholds")
    alerts_enabled: Optional[bool] = Field(None, description="Whether alerts are enabled")


class ForecastRequest(BaseModel):
    """Request for financial forecast."""
    start_date: date = Field(..., description="Forecast start date")
    end_date: date = Field(..., description="Forecast end date")
    model: ForecastModel = Field(default=ForecastModel.LINEAR, description="Forecasting model")
    confidence_level: float = Field(default=0.95, ge=0.5, le=0.99, description="Confidence level")
    historical_months: int = Field(default=12, ge=3, le=36, description="Historical data months")
    filters: Optional[Dict[str, Any]] = Field(None, description="Data filters")


class ReportGenerationRequest(BaseModel):
    """Request to generate financial report."""
    report_type: str = Field(..., description="Report type")
    title: Optional[str] = Field(None, description="Custom report title")
    period_start: date = Field(..., description="Report period start")
    period_end: date = Field(..., description="Report period end")
    include_charts: bool = Field(default=True, description="Include charts in report")
    include_recommendations: bool = Field(default=True, description="Include recommendations")
    filters: Optional[Dict[str, Any]] = Field(None, description="Report filters")
    format: str = Field(default="json", description="Report format")


class CostAllocationRequest(BaseModel):
    """Request to create cost allocation rule."""
    name: str = Field(..., min_length=1, max_length=100, description="Rule name")
    description: Optional[str] = Field(None, max_length=500, description="Rule description")
    source_filters: Dict[str, Any] = Field(..., description="Source cost filters")
    allocation_method: str = Field(..., description="Allocation method")
    allocation_targets: List[Dict[str, Any]] = Field(..., description="Allocation targets")


# Response Models

class CostDataResponse(BaseModel):
    """Response containing cost data."""
    data: List[CostData] = Field(..., description="Cost data points")
    total_amount: Decimal = Field(..., description="Total cost amount")
    period_start: date = Field(..., description="Period start date")
    period_end: date = Field(..., description="Period end date")
    currency: str = Field(..., description="Currency code")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }


class BudgetSummary(BaseModel):
    """Budget summary for list views."""
    id: str = Field(..., description="Budget ID")
    name: str = Field(..., description="Budget name")
    department: str = Field(..., description="Department")
    allocated_amount: Decimal = Field(..., description="Allocated amount")
    spent_amount: Decimal = Field(..., description="Spent amount")
    utilization_percentage: float = Field(..., description="Utilization percentage")
    status: BudgetStatus = Field(..., description="Budget status")
    period_start: date = Field(..., description="Period start")
    period_end: date = Field(..., description="Period end")
    currency: str = Field(..., description="Currency code")
    
    class Config:
        json_encoders = {
            Decimal: lambda v: float(v)
        }
        use_enum_values = True


class FinancialDashboard(BaseModel):
    """Financial dashboard data."""
    metrics: FinancialMetrics = Field(..., description="Key financial metrics")
    recent_alerts: List[FinancialAlert] = Field(..., description="Recent alerts")
    budget_status: List[BudgetSummary] = Field(..., description="Budget status summary")
    cost_trends: List[Dict[str, Any]] = Field(..., description="Cost trend data")
    optimization_summary: Dict[str, Any] = Field(..., description="Optimization summary")
    generated_at: datetime = Field(..., description="Dashboard generation time")