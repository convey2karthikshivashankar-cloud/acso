"""
Financial intelligence API endpoints.
"""

from typing import List, Optional, Dict, Any
from datetime import datetime, date
from fastapi import APIRouter, HTTPException, Depends, Query

from ..models.financial import (
    CostData, CostBreakdown, ROICalculation, ROIResults, BudgetData, 
    ForecastData, CostDataRequest, BudgetCreateRequest, BudgetUpdateRequest,
    ForecastRequest, ReportGenerationRequest, CostAllocationRequest,
    FinancialMetrics, FinancialAlert, FinancialReport, CostOptimizationRecommendation,
    BudgetSummary, FinancialDashboard
)
from ..models.responses import APIResponse, PaginatedResponse
from ..dependencies import get_current_user
from ..services.financial_service import financial_service
from ...shared.coordination import system_coordinator

router = APIRouter()

@router.get("/costs", response_model=APIResponse[List[CostData]])
async def get_cost_data(
    start_date: date = Query(..., description="Start date for cost data"),
    end_date: date = Query(..., description="End date for cost data"),
    granularity: str = Query("daily", description="Data granularity (hourly, daily, weekly, monthly)"),
    services: Optional[List[str]] = Query(None, description="Filter by services"),
    regions: Optional[List[str]] = Query(None, description="Filter by regions"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get cost data with optional filtering."""
    try:
        filters = {}
        if services:
            filters["services"] = services
        if regions:
            filters["regions"] = regions
            
        cost_data = await financial_service.get_cost_data(
            start_date=start_date,
            end_date=end_date,
            filters=filters
        )
        
        return APIResponse(
            success=True,
            data=cost_data,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/costs/breakdown", response_model=APIResponse[List[CostBreakdown]])
async def get_cost_breakdown(
    date: date = Query(..., description="Date for cost breakdown"),
    dimension: str = Query(..., description="Breakdown dimension (service, region, tag, account)"),
    limit: int = Query(10, description="Maximum number of items to return"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get cost breakdown by specified dimension."""
    try:
        breakdown = await system_coordinator.get_cost_breakdown(
            date=date,
            dimension=dimension,
            limit=limit
        )
        
        return APIResponse(
            success=True,
            data=breakdown,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/roi/calculate", response_model=APIResponse[ROIResults])
async def calculate_roi(
    calculation: ROICalculation,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Calculate ROI based on investment and benefits."""
    try:
        results = await system_coordinator.calculate_roi(calculation.dict())
        
        return APIResponse(
            success=True,
            data=results,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/budget", response_model=APIResponse[List[BudgetData]])
async def get_budget_data(
    year: Optional[int] = Query(None, description="Filter by year"),
    month: Optional[int] = Query(None, description="Filter by month"),
    department: Optional[str] = Query(None, description="Filter by department"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get budget data with optional filtering."""
    try:
        budget_data = await system_coordinator.get_budget_data(
            year=year,
            month=month,
            department=department
        )
        
        return APIResponse(
            success=True,
            data=budget_data,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/forecast", response_model=APIResponse[List[ForecastData]])
async def get_forecast(
    start_date: date = Query(..., description="Forecast start date"),
    end_date: date = Query(..., description="Forecast end date"),
    model: str = Query("linear", description="Forecasting model (linear, exponential, seasonal)"),
    confidence: float = Query(0.95, description="Confidence level"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get financial forecast data."""
    try:
        forecast = await system_coordinator.get_financial_forecast(
            start_date=start_date,
            end_date=end_date,
            model=model,
            confidence=confidence
        )
        
        return APIResponse(
            success=True,
            data=forecast,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/optimization", response_model=APIResponse[List[Dict[str, Any]]])
async def get_optimization_recommendations(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get cost optimization recommendations."""
    try:
        recommendations = await system_coordinator.get_cost_optimization_recommendations()
        
        return APIResponse(
            success=True,
            data=recommendations,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/reports/{report_type}", response_model=APIResponse[Dict[str, Any]])
async def generate_financial_report(
    report_type: str,
    start_date: date = Query(..., description="Report start date"),
    end_date: date = Query(..., description="Report end date"),
    format: str = Query("json", description="Report format (json, pdf, excel)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate financial reports."""
    try:
        report = await system_coordinator.generate_financial_report(
            report_type=report_type,
            start_date=start_date,
            end_date=end_date,
            format=format,
            user_id=current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=report,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# En
hanced Financial Endpoints

@router.get("/dashboard", response_model=APIResponse[FinancialDashboard])
async def get_financial_dashboard(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get comprehensive financial dashboard data."""
    try:
        dashboard = await financial_service.get_financial_dashboard(current_user["user_id"])
        
        return APIResponse(
            success=True,
            data=dashboard,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/metrics", response_model=APIResponse[FinancialMetrics])
async def get_financial_metrics(
    period_days: int = Query(30, ge=1, le=365, description="Period in days"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get key financial metrics."""
    try:
        metrics = await financial_service.get_financial_metrics(period_days)
        
        return APIResponse(
            success=True,
            data=metrics,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/budgets", response_model=APIResponse[List[BudgetSummary]])
async def get_budgets(
    department: Optional[str] = Query(None, description="Filter by department"),
    status: Optional[str] = Query(None, description="Filter by status"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get budget summaries."""
    try:
        budgets = await financial_service.get_budget_summaries(
            department=department,
            status=status
        )
        
        return APIResponse(
            success=True,
            data=budgets,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/budgets", response_model=APIResponse[BudgetData])
async def create_budget(
    budget_request: BudgetCreateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new budget."""
    try:
        budget = await financial_service.create_budget(
            name=budget_request.name,
            department=budget_request.department,
            period_start=budget_request.period_start,
            period_end=budget_request.period_end,
            allocated_amount=budget_request.allocated_amount,
            user_id=current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=budget,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.put("/budgets/{budget_id}", response_model=APIResponse[BudgetData])
async def update_budget(
    budget_id: str,
    budget_request: BudgetUpdateRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update an existing budget."""
    try:
        budget = await system_coordinator.update_budget(
            budget_id,
            budget_request.dict(exclude_unset=True),
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=budget,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/alerts", response_model=APIResponse[List[FinancialAlert]])
async def get_financial_alerts(
    severity: Optional[str] = Query(None, description="Filter by severity"),
    acknowledged: Optional[bool] = Query(None, description="Filter by acknowledgment status"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get financial alerts."""
    try:
        alerts = await system_coordinator.get_financial_alerts(
            severity=severity,
            acknowledged=acknowledged
        )
        
        return APIResponse(
            success=True,
            data=alerts,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/alerts/{alert_id}/acknowledge", response_model=APIResponse[Dict[str, str]])
async def acknowledge_alert(
    alert_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Acknowledge a financial alert."""
    try:
        result = await system_coordinator.acknowledge_financial_alert(
            alert_id,
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.get("/optimization/recommendations", response_model=APIResponse[List[CostOptimizationRecommendation]])
async def get_optimization_recommendations(
    category: Optional[str] = Query(None, description="Filter by category"),
    priority: Optional[str] = Query(None, description="Filter by priority"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get detailed cost optimization recommendations."""
    try:
        recommendations = await system_coordinator.get_detailed_optimization_recommendations(
            category=category,
            priority=priority
        )
        
        return APIResponse(
            success=True,
            data=recommendations,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/allocation-rules", response_model=APIResponse[Dict[str, str]])
async def create_cost_allocation_rule(
    allocation_request: CostAllocationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create cost allocation rule."""
    try:
        result = await system_coordinator.create_cost_allocation_rule(
            allocation_request.dict(),
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))

@router.post("/reports/custom", response_model=APIResponse[FinancialReport])
async def generate_custom_report(
    report_request: ReportGenerationRequest,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate custom financial report."""
    try:
        report = await system_coordinator.generate_custom_financial_report(
            report_request.dict(),
            current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=report,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
@r
outer.get("/cost-aggregation", response_model=APIResponse[Dict[str, Any]])
async def get_cost_aggregation(
    start_date: date = Query(..., description="Start date for aggregation"),
    end_date: date = Query(..., description="End date for aggregation"),
    group_by: str = Query("service", description="Group by dimension (service, region, account, tag)"),
    aggregation: str = Query("sum", description="Aggregation function (sum, avg, max, min)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get aggregated cost data by specified dimensions."""
    try:
        cost_data = await financial_service.get_cost_data(start_date, end_date)
        
        # Perform aggregation
        aggregated = {}
        for cost in cost_data:
            if group_by == "service":
                key = cost.service or "unknown"
            elif group_by == "region":
                key = cost.region or "unknown"
            elif group_by == "account":
                key = cost.account_id or "unknown"
            else:
                key = "total"
            
            if key not in aggregated:
                aggregated[key] = []
            aggregated[key].append(float(cost.amount))
        
        # Apply aggregation function
        result = {}
        for key, values in aggregated.items():
            if aggregation == "sum":
                result[key] = sum(values)
            elif aggregation == "avg":
                result[key] = sum(values) / len(values) if values else 0
            elif aggregation == "max":
                result[key] = max(values) if values else 0
            elif aggregation == "min":
                result[key] = min(values) if values else 0
        
        return APIResponse(
            success=True,
            data={
                "aggregation": result,
                "total": sum(result.values()),
                "group_by": group_by,
                "aggregation_function": aggregation,
                "period": {"start": start_date.isoformat(), "end": end_date.isoformat()}
            },
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/cost-trends", response_model=APIResponse[Dict[str, Any]])
async def get_cost_trends(
    period_days: int = Query(30, ge=7, le=365, description="Analysis period in days"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get cost trend analysis."""
    try:
        trends = await financial_service.analyze_cost_trends(period_days)
        
        return APIResponse(
            success=True,
            data=trends,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/forecasts", response_model=APIResponse[List[Dict[str, Any]]])
async def get_cost_forecasts(
    start_date: date = Query(..., description="Forecast start date"),
    end_date: date = Query(..., description="Forecast end date"),
    model_type: str = Query("linear", description="Forecasting model type"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get cost forecasts."""
    try:
        forecasts = await financial_service.forecast_costs(start_date, end_date, model_type)
        
        return APIResponse(
            success=True,
            data=forecasts,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/roi-analysis", response_model=APIResponse[Dict[str, Any]])
async def perform_roi_analysis(
    investment_amount: float = Query(..., description="Investment amount"),
    benefits: List[Dict[str, Any]] = Query(..., description="List of benefits with amounts and months"),
    time_period_months: int = Query(..., description="Analysis time period in months"),
    discount_rate: float = Query(0.05, description="Discount rate for NPV calculation"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Perform comprehensive ROI analysis."""
    try:
        from decimal import Decimal
        
        roi_results = await financial_service.calculate_roi(
            Decimal(str(investment_amount)),
            benefits,
            time_period_months,
            discount_rate
        )
        
        return APIResponse(
            success=True,
            data=roi_results,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/budget-spending", response_model=APIResponse[Dict[str, str]])
async def update_budget_spending(
    budget_id: str,
    amount: float = Query(..., description="Spending amount"),
    description: str = Query(..., description="Spending description"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Update budget spending."""
    try:
        from decimal import Decimal
        
        success = await financial_service.update_budget_spending(
            budget_id,
            Decimal(str(amount)),
            description
        )
        
        if not success:
            raise HTTPException(status_code=404, detail="Budget not found")
        
        return APIResponse(
            success=True,
            data={"message": "Budget spending updated successfully"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/budget-alerts", response_model=APIResponse[List[FinancialAlert]])
async def check_budget_alerts(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Check and retrieve budget alerts."""
    try:
        await financial_service.check_budget_alerts()
        
        # Get recent unacknowledged alerts
        alerts = [alert for alert in financial_service.alerts if not alert.acknowledged]
        
        return APIResponse(
            success=True,
            data=alerts,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
# ROI Mod
eling Endpoints
from ..services.roi_modeling_service import roi_modeling_service

@router.post("/roi-scenarios", response_model=APIResponse[Dict[str, Any]])
async def create_roi_scenario(
    name: str = Query(..., description="Scenario name"),
    description: str = Query(..., description="Scenario description"),
    investment_amount: float = Query(..., description="Investment amount"),
    benefits: List[Dict[str, Any]] = Query(..., description="List of benefits"),
    time_period_months: int = Query(..., description="Time period in months"),
    discount_rate: float = Query(0.05, description="Discount rate"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create a new ROI scenario."""
    try:
        from decimal import Decimal
        
        scenario = await roi_modeling_service.create_roi_scenario(
            name=name,
            description=description,
            investment_amount=Decimal(str(investment_amount)),
            benefits=benefits,
            time_period_months=time_period_months,
            discount_rate=discount_rate,
            user_id=current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=scenario,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roi-scenarios", response_model=APIResponse[List[Dict[str, Any]]])
async def list_roi_scenarios(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List ROI scenarios for the current user."""
    try:
        scenarios = await roi_modeling_service.list_scenarios(current_user["user_id"])
        
        return APIResponse(
            success=True,
            data=scenarios,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/roi-scenarios/{scenario_id}", response_model=APIResponse[Dict[str, Any]])
async def get_roi_scenario(
    scenario_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific ROI scenario."""
    try:
        scenario = await roi_modeling_service.get_scenario(scenario_id)
        if not scenario:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        return APIResponse(
            success=True,
            data=scenario,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/roi-scenarios/{scenario_id}/calculate", response_model=APIResponse[Dict[str, Any]])
async def recalculate_roi_scenario(
    scenario_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Recalculate ROI for a scenario."""
    try:
        roi_results = await roi_modeling_service.calculate_scenario_roi(scenario_id)
        
        return APIResponse(
            success=True,
            data=roi_results,
            timestamp=datetime.utcnow()
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/roi-scenarios/compare", response_model=APIResponse[Dict[str, Any]])
async def compare_roi_scenarios(
    scenario_ids: List[str] = Query(..., description="List of scenario IDs to compare"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Compare multiple ROI scenarios."""
    try:
        comparison = await roi_modeling_service.compare_scenarios(scenario_ids)
        
        return APIResponse(
            success=True,
            data=comparison,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/roi-scenarios/{scenario_id}/monte-carlo", response_model=APIResponse[Dict[str, Any]])
async def run_monte_carlo_simulation(
    scenario_id: str,
    iterations: int = Query(1000, description="Number of simulation iterations"),
    investment_uncertainty: float = Query(0.1, description="Investment uncertainty range"),
    benefit_uncertainty: float = Query(0.2, description="Benefit uncertainty range"),
    rate_uncertainty: float = Query(0.02, description="Discount rate uncertainty range"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Run Monte Carlo simulation for ROI scenario."""
    try:
        uncertainty_ranges = {
            "investment": investment_uncertainty,
            "benefits": benefit_uncertainty,
            "discount_rate": rate_uncertainty
        }
        
        simulation_results = await roi_modeling_service.create_monte_carlo_simulation(
            scenario_id=scenario_id,
            iterations=iterations,
            uncertainty_ranges=uncertainty_ranges
        )
        
        return APIResponse(
            success=True,
            data=simulation_results,
            timestamp=datetime.utcnow()
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/roi-scenarios/{scenario_id}", response_model=APIResponse[Dict[str, str]])
async def delete_roi_scenario(
    scenario_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a ROI scenario."""
    try:
        success = await roi_modeling_service.delete_scenario(scenario_id)
        if not success:
            raise HTTPException(status_code=404, detail="Scenario not found")
        
        return APIResponse(
            success=True,
            data={"message": "Scenario deleted successfully"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))# Budge
t Forecasting Endpoints
from ..services.budget_forecasting_service import budget_forecasting_service

@router.post("/budgets/{budget_id}/track-spending", response_model=APIResponse[Dict[str, Any]])
async def track_budget_spending(
    budget_id: str,
    actual_spending: float = Query(..., description="Actual spending amount"),
    period_date: date = Query(..., description="Period date"),
    category: Optional[str] = Query(None, description="Spending category"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Track actual spending against budget."""
    try:
        from decimal import Decimal
        
        tracking_result = await budget_forecasting_service.track_budget_vs_actual(
            budget_id=budget_id,
            actual_spending=Decimal(str(actual_spending)),
            period_date=period_date,
            category=category
        )
        
        return APIResponse(
            success=True,
            data=tracking_result,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/budgets/{budget_id}/forecast", response_model=APIResponse[List[Dict[str, Any]]])
async def get_budget_forecast(
    budget_id: str,
    forecast_periods: int = Query(12, description="Number of periods to forecast"),
    model_type: str = Query("linear", description="Forecasting model (linear, seasonal, exponential)"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate budget forecast."""
    try:
        forecast = await budget_forecasting_service.generate_budget_forecast(
            budget_id=budget_id,
            forecast_periods=forecast_periods,
            model_type=model_type
        )
        
        return APIResponse(
            success=True,
            data=forecast,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/budgets/{budget_id}/alert-system", response_model=APIResponse[Dict[str, Any]])
async def create_budget_alert_system(
    budget_id: str,
    alert_thresholds: List[float] = Query(..., description="Alert threshold percentages"),
    notification_channels: List[str] = Query(..., description="Notification channels"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create budget alert system."""
    try:
        alert_system = await budget_forecasting_service.create_budget_alert_system(
            budget_id=budget_id,
            alert_thresholds=alert_thresholds,
            notification_channels=notification_channels
        )
        
        return APIResponse(
            success=True,
            data=alert_system,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/budgets/{budget_id}/threshold-check", response_model=APIResponse[List[Dict[str, Any]]])
async def check_budget_thresholds(
    budget_id: str,
    current_utilization: float = Query(..., description="Current budget utilization percentage"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Check budget threshold alerts."""
    try:
        alerts = await budget_forecasting_service.check_budget_thresholds(
            budget_id=budget_id,
            current_utilization=current_utilization
        )
        
        return APIResponse(
            success=True,
            data=alerts,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/budgets/{budget_id}/approval-workflow", response_model=APIResponse[Dict[str, Any]])
async def create_budget_approval_workflow(
    budget_id: str,
    approval_levels: List[Dict[str, Any]] = Query(..., description="Approval levels configuration"),
    auto_approval_threshold: Optional[float] = Query(None, description="Auto-approval threshold"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Create budget approval workflow."""
    try:
        from decimal import Decimal
        
        auto_threshold = Decimal(str(auto_approval_threshold)) if auto_approval_threshold else None
        
        workflow = await budget_forecasting_service.create_budget_approval_workflow(
            budget_id=budget_id,
            approval_levels=approval_levels,
            auto_approval_threshold=auto_threshold
        )
        
        return APIResponse(
            success=True,
            data=workflow,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/budget-approvals/{workflow_id}/request", response_model=APIResponse[Dict[str, Any]])
async def request_budget_approval(
    workflow_id: str,
    request_amount: float = Query(..., description="Requested amount"),
    justification: str = Query(..., description="Justification for the request"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Request budget approval."""
    try:
        from decimal import Decimal
        
        approval_result = await budget_forecasting_service.process_budget_approval_request(
            workflow_id=workflow_id,
            request_amount=Decimal(str(request_amount)),
            requester_id=current_user["user_id"],
            justification=justification
        )
        
        return APIResponse(
            success=True,
            data=approval_result,
            timestamp=datetime.utcnow()
        )
    except ValueError as e:
        raise HTTPException(status_code=404, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/budgets/{budget_id}/performance", response_model=APIResponse[Dict[str, Any]])
async def get_budget_performance_metrics(
    budget_id: str,
    period_start: date = Query(..., description="Performance analysis start date"),
    period_end: date = Query(..., description="Performance analysis end date"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get budget performance metrics."""
    try:
        metrics = await budget_forecasting_service.get_budget_performance_metrics(
            budget_id=budget_id,
            period_start=period_start,
            period_end=period_end
        )
        
        return APIResponse(
            success=True,
            data=metrics,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))# Financi
al Reporting Endpoints
from ..services.financial_reporting_service import financial_reporting_service

@router.post("/reports/generate", response_model=APIResponse[Dict[str, Any]])
async def generate_financial_report(
    report_type: str = Query(..., description="Type of report to generate"),
    period_start: date = Query(..., description="Report period start date"),
    period_end: date = Query(..., description="Report period end date"),
    template_id: Optional[str] = Query(None, description="Report template ID"),
    filters: Optional[Dict[str, Any]] = Query(None, description="Report filters"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Generate a financial report."""
    try:
        report = await financial_reporting_service.generate_report(
            report_type=report_type,
            period_start=period_start,
            period_end=period_end,
            filters=filters,
            template_id=template_id,
            user_id=current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=report,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports", response_model=APIResponse[List[Dict[str, Any]]])
async def list_financial_reports(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """List available financial reports."""
    try:
        reports = await financial_reporting_service.list_reports(current_user["user_id"])
        
        return APIResponse(
            success=True,
            data=reports,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/{report_id}", response_model=APIResponse[Dict[str, Any]])
async def get_financial_report(
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get a specific financial report."""
    try:
        report = await financial_reporting_service.get_report(report_id)
        if not report:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return APIResponse(
            success=True,
            data=report,
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports/{report_id}/export", response_model=APIResponse[Dict[str, Any]])
async def export_financial_report(
    report_id: str,
    export_format: str = Query("json", description="Export format (json, csv, excel, pdf)"),
    include_charts: bool = Query(True, description="Include chart data in export"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Export a financial report in specified format."""
    try:
        export_result = await financial_reporting_service.export_report(
            report_id=report_id,
            export_format=export_format,
            include_charts=include_charts
        )
        
        return APIResponse(
            success=True,
            data=export_result,
            timestamp=datetime.utcnow()
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.post("/reports/schedule", response_model=APIResponse[Dict[str, Any]])
async def schedule_financial_report(
    report_config: Dict[str, Any] = Query(..., description="Report configuration"),
    schedule: Dict[str, Any] = Query(..., description="Schedule configuration"),
    recipients: List[str] = Query(..., description="Report recipients"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Schedule a recurring financial report."""
    try:
        scheduled_report = await financial_reporting_service.schedule_report(
            report_config=report_config,
            schedule=schedule,
            recipients=recipients,
            user_id=current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=scheduled_report,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.delete("/reports/{report_id}", response_model=APIResponse[Dict[str, str]])
async def delete_financial_report(
    report_id: str,
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Delete a financial report."""
    try:
        success = await financial_reporting_service.delete_report(report_id)
        if not success:
            raise HTTPException(status_code=404, detail="Report not found")
        
        return APIResponse(
            success=True,
            data={"message": "Report deleted successfully"},
            timestamp=datetime.utcnow()
        )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/reports/templates", response_model=APIResponse[Dict[str, Any]])
async def get_report_templates(
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get available report templates."""
    try:
        templates = financial_reporting_service.report_templates
        
        return APIResponse(
            success=True,
            data=templates,
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@router.get("/dashboard-data", response_model=APIResponse[Dict[str, Any]])
async def get_financial_dashboard_data(
    period_days: int = Query(30, description="Dashboard data period in days"),
    current_user: Dict[str, Any] = Depends(get_current_user)
):
    """Get financial dashboard data for visualization."""
    try:
        end_date = date.today()
        start_date = end_date - timedelta(days=period_days)
        
        dashboard_report = await financial_reporting_service.generate_report(
            report_type="executive_dashboard",
            period_start=start_date,
            period_end=end_date,
            user_id=current_user["user_id"]
        )
        
        return APIResponse(
            success=True,
            data=dashboard_report["data"],
            timestamp=datetime.utcnow()
        )
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))