"""ROI modeling and calculation service."""

import uuid
from datetime import datetime, date, timedelta
from typing import Dict, List, Optional, Any, Tuple
from decimal import Decimal
import json

from ..models.financial import (
    ROIModel, ROIScenario, ROICalculation, SensitivityAnalysis,
    ROIVisualizationData, ROIComparison
)
from ..websocket.manager import websocket_manager


class ROIModelingService:
    """Service for ROI calculations and modeling."""
    
    def __init__(self):
        self.models: Dict[str, ROIModel] = {}
        self.scenarios: Dict[str, ROIScenario] = {}
        self.calculations: Dict[str, ROICalculation] = {}
        
        # Initialize with sample data
        self._initialize_sample_data()
    
    def _initialize_sample_data(self):
        """Initialize with sample ROI models and scenarios."""
        # Sample ROI model
        model_id = str(uuid.uuid4())
        self.models[model_id] = ROIModel(
            id=model_id,
            name="ACSO Implementation ROI",
            description="ROI model for ACSO multi-agent system implementation",
            investment_amount=Decimal("500000.00"),
            time_horizon_months=36,
            discount_rate=0.08,
            benefits=[
                {
                    "name": "Reduced Security Incidents",
                    "monthly_value": Decimal("25000.00"),
                    "confidence": 0.85,
                    "category": "cost_savings"
                },
                {
                    "name": "Increased Operational Efficiency",
                    "monthly_value": Decimal("15000.00"),
                    "confidence": 0.90,
                    "category": "productivity"
                },
                {
                    "name": "Premium Service Revenue",
                    "monthly_value": Decimal("30000.00"),
                    "confidence": 0.75,
                    "category": "revenue"
                }
            ],
            costs=[
                {
                    "name": "Initial Implementation",
                    "amount": Decimal("300000.00"),
                    "timing": "upfront",
                    "category": "implementation"
                },
                {
                    "name": "Monthly Operations",
                    "amount": Decimal("8000.00"),
                    "timing": "monthly",
                    "category": "operations"
                }
            ],
            assumptions=[
                "Security incidents reduced by 60%",
                "Operational efficiency improved by 35%",
                "Premium pricing achieved for 40% of services"
            ],
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        # Sample scenario
        scenario_id = str(uuid.uuid4())
        self.scenarios[scenario_id] = ROIScenario(
            id=scenario_id,
            model_id=model_id,
            name="Conservative Scenario",
            description="Conservative estimates with 20% reduction in benefits",
            adjustments={
                "benefit_multiplier": 0.8,
                "cost_multiplier": 1.1,
                "time_to_value_months": 6
            },
            created_at=datetime.utcnow()
        )
    
    async def create_roi_model(
        self,
        name: str,
        description: str,
        investment_amount: Decimal,
        time_horizon_months: int,
        discount_rate: float,
        benefits: List[Dict[str, Any]],
        costs: List[Dict[str, Any]],
        assumptions: List[str],
        user_id: str
    ) -> ROIModel:
        """Create a new ROI model."""
        model_id = str(uuid.uuid4())
        
        model = ROIModel(
            id=model_id,
            name=name,
            description=description,
            investment_amount=investment_amount,
            time_horizon_months=time_horizon_months,
            discount_rate=discount_rate,
            benefits=benefits,
            costs=costs,
            assumptions=assumptions,
            created_by=user_id,
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        
        self.models[model_id] = model
        
        # Notify about model creation
        await websocket_manager.broadcast_to_topic(
            "roi_updates",
            {
                "type": "model_created",
                "model_id": model_id,
                "name": name,
                "created_by": user_id
            }
        )
        
        return model
    
    async def create_scenario(
        self,
        model_id: str,
        name: str,
        description: str,
        adjustments: Dict[str, Any],
        user_id: str
    ) -> Optional[ROIScenario]:
        """Create a new ROI scenario."""
        if model_id not in self.models:
            return None
        
        scenario_id = str(uuid.uuid4())
        
        scenario = ROIScenario(
            id=scenario_id,
            model_id=model_id,
            name=name,
            description=description,
            adjustments=adjustments,
            created_by=user_id,
            created_at=datetime.utcnow()
        )
        
        self.scenarios[scenario_id] = scenario
        return scenario
    
    async def calculate_roi(
        self,
        model_id: str,
        scenario_id: Optional[str] = None
    ) -> Optional[ROICalculation]:
        """Calculate ROI for a model and optional scenario."""
        model = self.models.get(model_id)
        if not model:
            return None
        
        scenario = None
        if scenario_id:
            scenario = self.scenarios.get(scenario_id)
            if not scenario or scenario.model_id != model_id:
                return None
        
        # Apply scenario adjustments if provided
        benefits = model.benefits.copy()
        costs = model.costs.copy()
        time_horizon = model.time_horizon_months
        
        if scenario:
            # Apply benefit multiplier
            benefit_multiplier = scenario.adjustments.get("benefit_multiplier", 1.0)
            for benefit in benefits:
                benefit["monthly_value"] = Decimal(str(
                    float(benefit["monthly_value"]) * benefit_multiplier
                ))
            
            # Apply cost multiplier
            cost_multiplier = scenario.adjustments.get("cost_multiplier", 1.0)
            for cost in costs:
                cost["amount"] = Decimal(str(
                    float(cost["amount"]) * cost_multiplier
                ))
            
            # Adjust time to value
            time_to_value = scenario.adjustments.get("time_to_value_months", 0)
        else:
            time_to_value = 0
        
        # Calculate monthly cash flows
        monthly_cash_flows = []
        cumulative_cash_flow = Decimal("0")
        
        # Initial investment
        initial_investment = model.investment_amount
        for cost in costs:
            if cost.get("timing") == "upfront":
                initial_investment += cost["amount"]
        
        cumulative_cash_flow -= initial_investment
        
        # Monthly calculations
        monthly_discount_rate = model.discount_rate / 12
        
        for month in range(1, time_horizon + 1):
            monthly_benefit = Decimal("0")
            monthly_cost = Decimal("0")
            
            # Calculate benefits (start after time_to_value)
            if month > time_to_value:
                for benefit in benefits:
                    monthly_benefit += benefit["monthly_value"]
            
            # Calculate ongoing costs
            for cost in costs:
                if cost.get("timing") == "monthly":
                    monthly_cost += cost["amount"]
            
            net_monthly_flow = monthly_benefit - monthly_cost
            
            # Apply discount factor
            discount_factor = (1 + monthly_discount_rate) ** month
            discounted_flow = net_monthly_flow / Decimal(str(discount_factor))
            
            cumulative_cash_flow += net_monthly_flow
            
            monthly_cash_flows.append({
                "month": month,
                "gross_benefit": float(monthly_benefit),
                "costs": float(monthly_cost),
                "net_flow": float(net_monthly_flow),
                "discounted_flow": float(discounted_flow),
                "cumulative_flow": float(cumulative_cash_flow)
            })
        
        # Calculate key metrics
        total_benefits = sum(flow["gross_benefit"] for flow in monthly_cash_flows)
        total_costs = float(initial_investment) + sum(flow["costs"] for flow in monthly_cash_flows)
        
        # NPV calculation
        npv = sum(Decimal(str(flow["discounted_flow"])) for flow in monthly_cash_flows) - initial_investment
        
        # ROI percentage
        roi_percentage = ((total_benefits - total_costs) / total_costs) * 100 if total_costs > 0 else 0
        
        # Payback period
        payback_period = None
        for flow in monthly_cash_flows:
            if flow["cumulative_flow"] >= 0:
                payback_period = flow["month"]
                break
        
        # IRR calculation (simplified approximation)
        irr = None
        if npv > 0 and payback_period:
            # Simplified IRR calculation
            annual_return = total_benefits / total_costs
            years = time_horizon / 12
            irr = (annual_return ** (1 / years) - 1) * 100 if years > 0 else 0
        
        calculation_id = str(uuid.uuid4())
        
        calculation = ROICalculation(
            id=calculation_id,
            model_id=model_id,
            scenario_id=scenario_id,
            roi_percentage=roi_percentage,
            net_present_value=float(npv),
            payback_period_months=payback_period,
            internal_rate_of_return=irr,
            total_benefits=total_benefits,
            total_costs=total_costs,
            monthly_cash_flows=monthly_cash_flows,
            break_even_month=payback_period,
            calculated_at=datetime.utcnow()
        )
        
        self.calculations[calculation_id] = calculation
        return calculation
    
    async def perform_sensitivity_analysis(
        self,
        model_id: str,
        variables: List[str],
        variance_range: float = 0.2
    ) -> Optional[SensitivityAnalysis]:
        """Perform sensitivity analysis on ROI model variables."""
        model = self.models.get(model_id)
        if not model:
            return None
        
        base_calculation = await self.calculate_roi(model_id)
        if not base_calculation:
            return None
        
        analysis_results = []
        
        for variable in variables:
            variable_results = []
            
            # Test different variance levels
            for variance in [-variance_range, -variance_range/2, 0, variance_range/2, variance_range]:
                # Create temporary scenario with variance
                temp_scenario_id = str(uuid.uuid4())
                adjustments = {}
                
                if variable == "benefits":
                    adjustments["benefit_multiplier"] = 1 + variance
                elif variable == "costs":
                    adjustments["cost_multiplier"] = 1 + variance
                elif variable == "discount_rate":
                    # Adjust discount rate directly in model copy
                    pass  # Simplified for this implementation
                
                temp_scenario = ROIScenario(
                    id=temp_scenario_id,
                    model_id=model_id,
                    name=f"Sensitivity Test {variable} {variance:.1%}",
                    description="Temporary scenario for sensitivity analysis",
                    adjustments=adjustments,
                    created_at=datetime.utcnow()
                )
                
                self.scenarios[temp_scenario_id] = temp_scenario
                
                # Calculate ROI with variance
                varied_calculation = await self.calculate_roi(model_id, temp_scenario_id)
                
                if varied_calculation:
                    variable_results.append({
                        "variance": variance,
                        "roi_percentage": varied_calculation.roi_percentage,
                        "npv": varied_calculation.net_present_value,
                        "payback_period": varied_calculation.payback_period_months
                    })
                
                # Clean up temporary scenario
                del self.scenarios[temp_scenario_id]
            
            analysis_results.append({
                "variable": variable,
                "base_value": getattr(base_calculation, "roi_percentage", 0),
                "sensitivity_data": variable_results
            })
        
        analysis_id = str(uuid.uuid4())
        
        analysis = SensitivityAnalysis(
            id=analysis_id,
            model_id=model_id,
            variables_analyzed=variables,
            variance_range=variance_range,
            base_roi=base_calculation.roi_percentage,
            sensitivity_results=analysis_results,
            most_sensitive_variable=max(
                analysis_results,
                key=lambda x: max(abs(r["roi_percentage"] - base_calculation.roi_percentage) 
                                for r in x["sensitivity_data"])
            )["variable"] if analysis_results else None,
            performed_at=datetime.utcnow()
        )
        
        return analysis
    
    async def get_visualization_data(
        self,
        model_id: str,
        scenario_ids: Optional[List[str]] = None
    ) -> Optional[ROIVisualizationData]:
        """Get data for ROI visualization charts."""
        model = self.models.get(model_id)
        if not model:
            return None
        
        # Base calculation
        base_calculation = await self.calculate_roi(model_id)
        if not base_calculation:
            return None
        
        scenario_calculations = []
        if scenario_ids:
            for scenario_id in scenario_ids:
                calc = await self.calculate_roi(model_id, scenario_id)
                if calc:
                    scenario_calculations.append(calc)
        
        # Prepare chart data
        cash_flow_chart = {
            "type": "line",
            "title": "Monthly Cash Flow",
            "data": [
                {
                    "month": flow["month"],
                    "net_flow": flow["net_flow"],
                    "cumulative_flow": flow["cumulative_flow"]
                }
                for flow in base_calculation.monthly_cash_flows
            ]
        }
        
        roi_comparison_chart = {
            "type": "bar",
            "title": "ROI Comparison",
            "data": [
                {
                    "scenario": "Base Case",
                    "roi": base_calculation.roi_percentage,
                    "npv": base_calculation.net_present_value
                }
            ] + [
                {
                    "scenario": f"Scenario {i+1}",
                    "roi": calc.roi_percentage,
                    "npv": calc.net_present_value
                }
                for i, calc in enumerate(scenario_calculations)
            ]
        }
        
        payback_analysis = {
            "type": "waterfall",
            "title": "Payback Analysis",
            "data": [
                {
                    "category": "Initial Investment",
                    "value": -float(model.investment_amount)
                },
                {
                    "category": "Monthly Benefits",
                    "value": base_calculation.total_benefits
                },
                {
                    "category": "Operating Costs",
                    "value": -(base_calculation.total_costs - float(model.investment_amount))
                }
            ]
        }
        
        return ROIVisualizationData(
            model_id=model_id,
            charts=[cash_flow_chart, roi_comparison_chart, payback_analysis],
            key_metrics={
                "roi_percentage": base_calculation.roi_percentage,
                "npv": base_calculation.net_present_value,
                "payback_months": base_calculation.payback_period_months,
                "irr": base_calculation.internal_rate_of_return
            },
            generated_at=datetime.utcnow()
        )
    
    async def compare_models(
        self,
        model_ids: List[str]
    ) -> Optional[ROIComparison]:
        """Compare multiple ROI models."""
        models = []
        calculations = []
        
        for model_id in model_ids:
            model = self.models.get(model_id)
            if model:
                models.append(model)
                calc = await self.calculate_roi(model_id)
                if calc:
                    calculations.append(calc)
        
        if not models or not calculations:
            return None
        
        # Create comparison data
        comparison_data = []
        for model, calc in zip(models, calculations):
            comparison_data.append({
                "model_id": model.id,
                "model_name": model.name,
                "investment": float(model.investment_amount),
                "roi_percentage": calc.roi_percentage,
                "npv": calc.net_present_value,
                "payback_months": calc.payback_period_months,
                "irr": calc.internal_rate_of_return,
                "risk_score": self._calculate_risk_score(model, calc)
            })
        
        # Rank models by ROI
        ranked_models = sorted(
            comparison_data,
            key=lambda x: x["roi_percentage"],
            reverse=True
        )
        
        comparison_id = str(uuid.uuid4())
        
        return ROIComparison(
            id=comparison_id,
            model_ids=model_ids,
            comparison_data=comparison_data,
            ranked_models=ranked_models,
            best_model_id=ranked_models[0]["model_id"] if ranked_models else None,
            comparison_criteria=["roi_percentage", "npv", "payback_months", "risk_score"],
            performed_at=datetime.utcnow()
        )
    
    def _calculate_risk_score(self, model: ROIModel, calculation: ROICalculation) -> float:
        """Calculate a simple risk score for the model."""
        # Simplified risk calculation based on various factors
        risk_factors = []
        
        # Payback period risk
        if calculation.payback_period_months:
            if calculation.payback_period_months > 24:
                risk_factors.append(0.3)
            elif calculation.payback_period_months > 12:
                risk_factors.append(0.2)
            else:
                risk_factors.append(0.1)
        else:
            risk_factors.append(0.5)  # High risk if no payback
        
        # Investment size risk
        if model.investment_amount > Decimal("1000000"):
            risk_factors.append(0.3)
        elif model.investment_amount > Decimal("500000"):
            risk_factors.append(0.2)
        else:
            risk_factors.append(0.1)
        
        # Time horizon risk
        if model.time_horizon_months > 36:
            risk_factors.append(0.2)
        else:
            risk_factors.append(0.1)
        
        return sum(risk_factors) / len(risk_factors) if risk_factors else 0.5
    
    async def get_model_list(self, user_id: Optional[str] = None) -> List[Dict[str, Any]]:
        """Get list of ROI models."""
        model_list = []
        
        for model in self.models.values():
            if user_id and hasattr(model, 'created_by') and model.created_by != user_id:
                continue
            
            # Get latest calculation if available
            latest_calc = None
            for calc in self.calculations.values():
                if calc.model_id == model.id:
                    if not latest_calc or calc.calculated_at > latest_calc.calculated_at:
                        latest_calc = calc
            
            model_summary = {
                "id": model.id,
                "name": model.name,
                "description": model.description,
                "investment_amount": float(model.investment_amount),
                "time_horizon_months": model.time_horizon_months,
                "created_at": model.created_at.isoformat(),
                "updated_at": model.updated_at.isoformat()
            }
            
            if latest_calc:
                model_summary.update({
                    "latest_roi": latest_calc.roi_percentage,
                    "latest_npv": latest_calc.net_present_value,
                    "payback_months": latest_calc.payback_period_months
                })
            
            model_list.append(model_summary)
        
        return model_list
    
    async def delete_model(self, model_id: str, user_id: str) -> bool:
        """Delete an ROI model and associated data."""
        model = self.models.get(model_id)
        if not model:
            return False
        
        # Check permissions (simplified)
        if hasattr(model, 'created_by') and model.created_by != user_id:
            return False
        
        # Delete associated scenarios and calculations
        scenarios_to_delete = [
            scenario_id for scenario_id, scenario in self.scenarios.items()
            if scenario.model_id == model_id
        ]
        
        calculations_to_delete = [
            calc_id for calc_id, calc in self.calculations.items()
            if calc.model_id == model_id
        ]
        
        for scenario_id in scenarios_to_delete:
            del self.scenarios[scenario_id]
        
        for calc_id in calculations_to_delete:
            del self.calculations[calc_id]
        
        # Delete the model
        del self.models[model_id]
        
        # Notify about deletion
        await websocket_manager.broadcast_to_topic(
            "roi_updates",
            {
                "type": "model_deleted",
                "model_id": model_id,
                "deleted_by": user_id
            }
        )
        
        return True


# Global ROI modeling service instance
roi_modeling_service = ROIModelingService()