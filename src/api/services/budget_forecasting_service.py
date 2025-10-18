"""Budget forecasting and tracking service."""

import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
import statistics
from collections import defaultdict

from ..models.financial import (
    BudgetForecast, BudgetVariance, BudgetAlert, BudgetApproval,
    ForecastModel, BudgetTrend, BudgetScenario
)
from ..websocket.manager import websocket_manager


class BudgetForecastingService:
    """Service for budget forecasting and tracking."""
    
    def __init__(self):
        self.forecasts: Dict[str, BudgetForecast] = {}
        self.variances: Dict[str, BudgetVariance] = {}
        self.alerts: List[BudgetAlert] = []
        self.approvals: Dict[str, BudgetApproval] = {}
        self.forecast_models: Dict[str, ForecastModel] = {}
        
        # Initialize with sample data
        self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        """Initialize with sample forecasting data."""
        # Sample forecast model
        model_id = str(uuid.uuid4())
        self.forecast_models[model_id] = ForecastModel(
            id=model_id,
            name="Linear Trend Model",
            description="Simple linear trend forecasting based on historical data",
            model_type="linear_regression",
            parameters={
                "lookback_months": 12,
                "seasonality": True,
                "trend_adjustment": 0.05
            },
            accuracy_metrics={
                "mape": 8.5,  # Mean Absolute Percentage Error
                "rmse": 1250.0,  # Root Mean Square Error
                "r_squared": 0.85
            },
            created_at=datetime.utcnow()
        )
        
        # Sample budget forecast
        forecast_id = str(uuid.uuid4())
        self.forecasts[forecast_id] = BudgetForecast(
            id=forecast_id,
            budget_id="sample-budget-1",
            forecast_period_start=date.today().replace(day=1),
            forecast_period_end=date.today().replace(day=1) + timedelta(days=365),
            model_id=model_id,
            predicted_spending=[
                {
                    "month": (date.today().replace(day=1) + timedelta(days=30*i)).isoformat(),
                    "predicted_amount": float(8000 + (i * 200) + (i % 3 * 500)),
                    "confidence_lower": float(7500 + (i * 180)),
                    "confidence_upper": float(8500 + (i * 220)),
                    "confidence_level": 0.85
                }
                for i in range(12)
            ],
            total_predicted_spending=Decimal("105600.00"),
            confidence_level=0.85,
            forecast_accuracy=8.5,
            created_at=datetime.utcnow()
        )
    
    async def create_forecast_model(
        self,
        name: str,
        description: str,
        model_type: str,
        parameters: Dict[str, Any],
        user_id: str
    ) -> ForecastModel:
        """Create a new forecasting model."""
        model_id = str(uuid.uuid4())
        
        model = ForecastModel(
            id=model_id,
            name=name,
            description=description,
            model_type=model_type,
            parameters=parameters,
            accuracy_metrics={},  # Will be populated after training
            created_by=user_id,
            created_at=datetime.utcnow()
        )
        
        self.forecast_models[model_id] = model
        return model
    
    async def generate_budget_forecast(
        self,
        budget_id: str,
        forecast_months: int,
        model_id: Optional[str] = None,
        historical_data: Optional[List[Dict[str, Any]]] = None
    ) -> BudgetForecast:
        """Generate budget forecast using specified model."""
        if not model_id:
            # Use default model
            model_id = list(self.forecast_models.keys())[0] if self.forecast_models else None
        
        model = self.forecast_models.get(model_id) if model_id else None
        
        # Generate sample historical data if not provided
        if not historical_data:
            historical_data = self._generate_sample_historical_data(budget_id, 12)
        
        # Apply forecasting algorithm based on model type
        if model and model.model_type == "linear_regression":
            predictions = self._linear_regression_forecast(historical_data, forecast_months, model.parameters)
        elif model and model.model_type == "seasonal_arima":
            predictions = self._seasonal_arima_forecast(historical_data, forecast_months, model.parameters)
        elif model and model.model_type == "exponential_smoothing":
            predictions = self._exponential_smoothing_forecast(historical_data, forecast_months, model.parameters)
        else:
            # Default simple trend forecast
            predictions = self._simple_trend_forecast(historical_data, forecast_months)
        
        forecast_id = str(uuid.uuid4())
        start_date = date.today().replace(day=1)
        end_date = start_date + timedelta(days=30 * forecast_months)
        
        total_predicted = sum(Decimal(str(p["predicted_amount"])) for p in predictions)
        
        forecast = BudgetForecast(
            id=forecast_id,
            budget_id=budget_id,
            forecast_period_start=start_date,
            forecast_period_end=end_date,
            model_id=model_id,
            predicted_spending=predictions,
            total_predicted_spending=total_predicted,
            confidence_level=0.85,  # Default confidence level
            forecast_accuracy=model.accuracy_metrics.get("mape", 10.0) if model else 10.0,
            created_at=datetime.utcnow()
        )
        
        self.forecasts[forecast_id] = forecast
        
        # Notify about new forecast
        await websocket_manager.broadcast_to_topic(
            "budget_forecasts",
            {
                "type": "forecast_generated",
                "forecast_id": forecast_id,
                "budget_id": budget_id,
                "total_predicted": float(total_predicted)
            }
        )
        
        return forecast
    
    def _generate_sample_historical_data(self, budget_id: str, months: int) -> List[Dict[str, Any]]:
        """Generate sample historical spending data."""
        base_amount = 8000
        data = []
        
        for i in range(months):
            month_date = date.today().replace(day=1) - timedelta(days=30 * (months - i))
            
            # Add some trend and seasonality
            trend = i * 50
            seasonal = 500 * (1 if i % 4 == 0 else 0.8)  # Q1 spike
            noise = (i % 3 - 1) * 200  # Random variation
            
            amount = base_amount + trend + seasonal + noise
            
            data.append({
                "month": month_date.isoformat(),
                "actual_spending": amount,
                "budget_amount": base_amount + trend
            })
        
        return data
    
    def _linear_regression_forecast(
        self,
        historical_data: List[Dict[str, Any]],
        forecast_months: int,
        parameters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Simple linear regression forecasting."""
        if len(historical_data) < 2:
            return self._simple_trend_forecast(historical_data, forecast_months)
        
        # Extract spending values
        spending_values = [float(d["actual_spending"]) for d in historical_data]
        
        # Calculate linear trend
        n = len(spending_values)
        x_values = list(range(n))
        
        # Simple linear regression
        x_mean = statistics.mean(x_values)
        y_mean = statistics.mean(spending_values)
        
        numerator = sum((x - x_mean) * (y - y_mean) for x, y in zip(x_values, spending_values))
        denominator = sum((x - x_mean) ** 2 for x in x_values)
        
        slope = numerator / denominator if denominator != 0 else 0
        intercept = y_mean - slope * x_mean
        
        # Generate predictions
        predictions = []
        base_date = date.today().replace(day=1)
        
        for i in range(forecast_months):
            month_date = base_date + timedelta(days=30 * i)
            x_value = n + i
            
            predicted_amount = intercept + slope * x_value
            
            # Add confidence intervals (simplified)
            confidence_range = predicted_amount * 0.15  # 15% confidence range
            
            predictions.append({
                "month": month_date.isoformat(),
                "predicted_amount": max(0, predicted_amount),
                "confidence_lower": max(0, predicted_amount - confidence_range),
                "confidence_upper": predicted_amount + confidence_range,
                "confidence_level": 0.85
            })
        
        return predictions
    
    def _seasonal_arima_forecast(
        self,
        historical_data: List[Dict[str, Any]],
        forecast_months: int,
        parameters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Simplified seasonal ARIMA forecasting."""
        # This is a simplified implementation
        # In production, you would use libraries like statsmodels
        
        spending_values = [float(d["actual_spending"]) for d in historical_data]
        
        if len(spending_values) < 12:
            return self._linear_regression_forecast(historical_data, forecast_months, parameters)
        
        # Calculate seasonal pattern (quarterly)
        seasonal_pattern = []
        for quarter in range(4):
            quarter_values = [spending_values[i] for i in range(quarter, len(spending_values), 4)]
            seasonal_pattern.append(statistics.mean(quarter_values) if quarter_values else 0)
        
        # Calculate trend
        recent_trend = (spending_values[-1] - spending_values[-4]) / 4 if len(spending_values) >= 4 else 0
        
        predictions = []
        base_date = date.today().replace(day=1)
        last_value = spending_values[-1]
        
        for i in range(forecast_months):
            month_date = base_date + timedelta(days=30 * i)
            
            # Apply trend and seasonality
            trend_component = last_value + (recent_trend * (i + 1))
            seasonal_component = seasonal_pattern[i % 4] - statistics.mean(seasonal_pattern)
            
            predicted_amount = trend_component + seasonal_component
            
            confidence_range = predicted_amount * 0.12  # 12% confidence range
            
            predictions.append({
                "month": month_date.isoformat(),
                "predicted_amount": max(0, predicted_amount),
                "confidence_lower": max(0, predicted_amount - confidence_range),
                "confidence_upper": predicted_amount + confidence_range,
                "confidence_level": 0.88
            })
        
        return predictions
    
    def _exponential_smoothing_forecast(
        self,
        historical_data: List[Dict[str, Any]],
        forecast_months: int,
        parameters: Dict[str, Any]
    ) -> List[Dict[str, Any]]:
        """Exponential smoothing forecasting."""
        spending_values = [float(d["actual_spending"]) for d in historical_data]
        
        if not spending_values:
            return self._simple_trend_forecast(historical_data, forecast_months)
        
        alpha = parameters.get("alpha", 0.3)  # Smoothing parameter
        
        # Simple exponential smoothing
        smoothed_values = [spending_values[0]]
        
        for i in range(1, len(spending_values)):
            smoothed = alpha * spending_values[i] + (1 - alpha) * smoothed_values[-1]
            smoothed_values.append(smoothed)
        
        # Forecast using last smoothed value
        last_smoothed = smoothed_values[-1]
        
        predictions = []
        base_date = date.today().replace(day=1)
        
        for i in range(forecast_months):
            month_date = base_date + timedelta(days=30 * i)
            
            # For simple exponential smoothing, forecast is constant
            predicted_amount = last_smoothed
            
            confidence_range = predicted_amount * 0.10  # 10% confidence range
            
            predictions.append({
                "month": month_date.isoformat(),
                "predicted_amount": max(0, predicted_amount),
                "confidence_lower": max(0, predicted_amount - confidence_range),
                "confidence_upper": predicted_amount + confidence_range,
                "confidence_level": 0.90
            })
        
        return predictions
    
    def _simple_trend_forecast(
        self,
        historical_data: List[Dict[str, Any]],
        forecast_months: int
    ) -> List[Dict[str, Any]]:
        """Simple trend-based forecasting."""
        if not historical_data:
            base_amount = 8000  # Default amount
        else:
            spending_values = [float(d["actual_spending"]) for d in historical_data]
            base_amount = statistics.mean(spending_values)
        
        predictions = []
        base_date = date.today().replace(day=1)
        
        for i in range(forecast_months):
            month_date = base_date + timedelta(days=30 * i)
            
            # Simple growth assumption
            predicted_amount = base_amount * (1.02 ** i)  # 2% monthly growth
            
            confidence_range = predicted_amount * 0.20  # 20% confidence range
            
            predictions.append({
                "month": month_date.isoformat(),
                "predicted_amount": predicted_amount,
                "confidence_lower": max(0, predicted_amount - confidence_range),
                "confidence_upper": predicted_amount + confidence_range,
                "confidence_level": 0.75
            })
        
        return predictions
    
    async def calculate_budget_variance(
        self,
        budget_id: str,
        actual_spending: List[Dict[str, Any]],
        forecast_id: Optional[str] = None
    ) -> BudgetVariance:
        """Calculate variance between actual and forecasted spending."""
        forecast = None
        if forecast_id:
            forecast = self.forecasts.get(forecast_id)
        
        if not forecast:
            # Find most recent forecast for this budget
            budget_forecasts = [
                f for f in self.forecasts.values()
                if f.budget_id == budget_id
            ]
            forecast = max(budget_forecasts, key=lambda x: x.created_at) if budget_forecasts else None
        
        if not forecast:
            raise ValueError(f"No forecast found for budget {budget_id}")
        
        # Calculate variances for each period
        period_variances = []
        total_actual = Decimal("0")
        total_forecast = Decimal("0")
        
        # Create lookup for actual spending by month
        actual_by_month = {
            item["month"]: Decimal(str(item["amount"]))
            for item in actual_spending
        }
        
        for prediction in forecast.predicted_spending:
            month = prediction["month"]
            predicted_amount = Decimal(str(prediction["predicted_amount"]))
            actual_amount = actual_by_month.get(month, Decimal("0"))
            
            variance_amount = actual_amount - predicted_amount
            variance_percentage = float((variance_amount / predicted_amount) * 100) if predicted_amount > 0 else 0
            
            period_variances.append({
                "month": month,
                "actual_amount": float(actual_amount),
                "predicted_amount": float(predicted_amount),
                "variance_amount": float(variance_amount),
                "variance_percentage": variance_percentage,
                "within_confidence": (
                    prediction["confidence_lower"] <= float(actual_amount) <= prediction["confidence_upper"]
                )
            })
            
            total_actual += actual_amount
            total_forecast += predicted_amount
        
        total_variance = total_actual - total_forecast
        total_variance_percentage = float((total_variance / total_forecast) * 100) if total_forecast > 0 else 0
        
        variance_id = str(uuid.uuid4())
        
        variance = BudgetVariance(
            id=variance_id,
            budget_id=budget_id,
            forecast_id=forecast.id,
            analysis_period_start=forecast.forecast_period_start,
            analysis_period_end=forecast.forecast_period_end,
            total_actual_spending=total_actual,
            total_predicted_spending=total_forecast,
            total_variance_amount=total_variance,
            total_variance_percentage=total_variance_percentage,
            period_variances=period_variances,
            accuracy_metrics={
                "mape": statistics.mean([abs(pv["variance_percentage"]) for pv in period_variances]),
                "rmse": statistics.sqrt(statistics.mean([pv["variance_amount"]**2 for pv in period_variances])),
                "within_confidence_rate": sum(1 for pv in period_variances if pv["within_confidence"]) / len(period_variances)
            },
            calculated_at=datetime.utcnow()
        )
        
        self.variances[variance_id] = variance
        return variance
    
    async def create_budget_alert(
        self,
        budget_id: str,
        alert_type: str,
        threshold_value: Decimal,
        current_value: Decimal,
        message: str,
        severity: str = "medium"
    ) -> BudgetAlert:
        """Create a budget alert."""
        alert_id = str(uuid.uuid4())
        
        alert = BudgetAlert(
            id=alert_id,
            budget_id=budget_id,
            alert_type=alert_type,
            severity=severity,
            title=f"Budget Alert: {alert_type.replace('_', ' ').title()}",
            message=message,
            threshold_value=threshold_value,
            current_value=current_value,
            created_at=datetime.utcnow()
        )
        
        self.alerts.append(alert)
        
        # Broadcast alert
        await websocket_manager.broadcast_to_topic(
            "budget_alerts",
            {
                "type": "budget_alert",
                "alert_id": alert_id,
                "budget_id": budget_id,
                "severity": severity,
                "message": message
            }
        )
        
        return alert
    
    async def check_budget_thresholds(self, budget_id: str, current_spending: Decimal, budget_amount: Decimal):
        """Check budget thresholds and create alerts if necessary."""
        utilization = (current_spending / budget_amount) * 100 if budget_amount > 0 else 0
        
        # Check various thresholds
        thresholds = [
            (80, "warning", "Budget utilization has reached 80%"),
            (90, "high", "Budget utilization has reached 90%"),
            (100, "critical", "Budget has been exceeded"),
            (110, "critical", "Budget overspend has reached 110%")
        ]
        
        for threshold, severity, message in thresholds:
            if utilization >= threshold:
                # Check if alert already exists
                existing_alert = any(
                    alert.budget_id == budget_id and
                    alert.alert_type == "threshold_breach" and
                    float(alert.threshold_value) == threshold and
                    not alert.acknowledged
                    for alert in self.alerts
                )
                
                if not existing_alert:
                    await self.create_budget_alert(
                        budget_id=budget_id,
                        alert_type="threshold_breach",
                        threshold_value=Decimal(str(threshold)),
                        current_value=Decimal(str(utilization)),
                        message=message,
                        severity=severity
                    )
    
    async def create_budget_approval_request(
        self,
        budget_id: str,
        requested_amount: Decimal,
        justification: str,
        requested_by: str,
        approvers: List[str]
    ) -> BudgetApproval:
        """Create a budget approval request."""
        approval_id = str(uuid.uuid4())
        
        approval = BudgetApproval(
            id=approval_id,
            budget_id=budget_id,
            requested_amount=requested_amount,
            justification=justification,
            requested_by=requested_by,
            approvers=approvers,
            status="pending",
            created_at=datetime.utcnow()
        )
        
        self.approvals[approval_id] = approval
        
        # Notify approvers
        await websocket_manager.broadcast_to_topic(
            "budget_approvals",
            {
                "type": "approval_requested",
                "approval_id": approval_id,
                "budget_id": budget_id,
                "requested_amount": float(requested_amount),
                "requested_by": requested_by,
                "approvers": approvers
            }
        )
        
        return approval
    
    async def process_approval(
        self,
        approval_id: str,
        approver_id: str,
        decision: str,
        comments: Optional[str] = None
    ) -> Optional[BudgetApproval]:
        """Process a budget approval decision."""
        approval = self.approvals.get(approval_id)
        if not approval or approver_id not in approval.approvers:
            return None
        
        # Add approval decision
        if not hasattr(approval, 'approval_decisions'):
            approval.approval_decisions = []
        
        approval.approval_decisions.append({
            "approver_id": approver_id,
            "decision": decision,
            "comments": comments,
            "decided_at": datetime.utcnow().isoformat()
        })
        
        # Check if all approvers have decided
        decisions = getattr(approval, 'approval_decisions', [])
        if len(decisions) >= len(approval.approvers):
            # All approvers have decided
            approved_count = sum(1 for d in decisions if d["decision"] == "approved")
            
            if approved_count == len(approval.approvers):
                approval.status = "approved"
                approval.approved_at = datetime.utcnow()
            else:
                approval.status = "rejected"
                approval.rejected_at = datetime.utcnow()
        
        return approval
    
    async def get_budget_trends(
        self,
        budget_id: str,
        period_months: int = 12
    ) -> BudgetTrend:
        """Analyze budget trends over time."""
        # This would typically query historical data
        # For now, we'll generate sample trend data
        
        trend_data = []
        base_date = date.today().replace(day=1) - timedelta(days=30 * period_months)
        
        for i in range(period_months):
            month_date = base_date + timedelta(days=30 * i)
            
            # Generate sample trend data
            base_amount = 8000
            trend = i * 100  # Growing trend
            seasonal = 500 if i % 4 == 0 else 0  # Q1 spike
            
            trend_data.append({
                "month": month_date.isoformat(),
                "actual_spending": base_amount + trend + seasonal,
                "budget_amount": base_amount + trend,
                "variance": seasonal,
                "utilization_percentage": ((base_amount + trend + seasonal) / (base_amount + trend)) * 100
            })
        
        # Calculate trend metrics
        spending_values = [item["actual_spending"] for item in trend_data]
        growth_rate = ((spending_values[-1] - spending_values[0]) / spending_values[0]) * 100 if spending_values[0] > 0 else 0
        
        trend_id = str(uuid.uuid4())
        
        return BudgetTrend(
            id=trend_id,
            budget_id=budget_id,
            analysis_period_start=base_date,
            analysis_period_end=date.today(),
            trend_data=trend_data,
            overall_trend="increasing" if growth_rate > 5 else "decreasing" if growth_rate < -5 else "stable",
            growth_rate=growth_rate,
            seasonality_detected=True,
            trend_strength=abs(growth_rate) / 100,  # Normalized trend strength
            analyzed_at=datetime.utcnow()
        )


# Global budget forecasting service instance
budget_forecasting_service = BudgetForecastingService()