"""
Advanced ROI Calculation Engine for ACSO Enterprise.
Provides comprehensive ROI analysis including NPV, IRR, payback analysis, and scenario modeling.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, field
from enum import Enum
import json
import numpy as np
import pandas as pd
from scipy.optimize import fsolve
from scipy.stats import norm
import math


class ROIMetric(str, Enum):
    """Types of ROI metrics."""
    SIMPLE_ROI = "simple_roi"
    NPV = "npv"
    IRR = "irr"
    PAYBACK_PERIOD = "payback_period"
    DISCOUNTED_PAYBACK = "discounted_payback"
    PROFITABILITY_INDEX = "profitability_index"
    MODIFIED_IRR = "modified_irr"


class ScenarioType(str, Enum):
    """Types of scenario analysis."""
    BEST_CASE = "best_case"
    WORST_CASE = "worst_case"
    MOST_LIKELY = "most_likely"
    MONTE_CARLO = "monte_carlo"


@dataclass
class CashFlow:
    """Cash flow data point."""
    period: int
    date: datetime
    inflow: float
    outflow: float
    net_flow: float
    description: str = ""
    category: str = ""


@dataclass
class Investment:
    """Investment details."""
    investment_id: str
    name: str
    initial_cost: float
    ongoing_costs: List[float]
    expected_benefits: List[float]
    discount_rate: float
    time_horizon: int  # months
    risk_factor: float = 1.0
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class ROIAnalysis:
    """Comprehensive ROI analysis result."""
    investment_id: str
    analysis_date: datetime
    metrics: Dict[ROIMetric, float]
    cash_flows: List[CashFlow]
    scenarios: Dict[ScenarioType, Dict[str, float]]
    sensitivity_analysis: Dict[str, Dict[str, float]]
    recommendations: List[str]
    confidence_level: float
    risk_assessment: Dict[str, Any]


@dataclass
class ScenarioParameters:
    """Parameters for scenario modeling."""
    benefit_variance: float = 0.2  # 20% variance
    cost_variance: float = 0.15    # 15% variance
    discount_rate_range: Tuple[float, float] = (0.08, 0.12)
    market_conditions: Dict[str, float] = field(default_factory=dict)


class AdvancedROICalculator:
    """
    Advanced ROI calculation engine with comprehensive financial analysis.
    
    Features:
    - Multiple ROI metrics (NPV, IRR, Payback Period, etc.)
    - Scenario modeling and sensitivity analysis
    - Monte Carlo simulation for risk assessment
    - Real-time ROI tracking and alerts
    - Comparative investment analysis
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Analysis storage
        self.investments: Dict[str, Investment] = {}
        self.analyses: Dict[str, ROIAnalysis] = {}
        self.market_data: Dict[str, Any] = {}
        
        # Configuration
        self.default_discount_rate = 0.10  # 10%
        self.default_risk_free_rate = 0.03  # 3%
        self.monte_carlo_iterations = 10000
        
        # Background tasks
        self.roi_tasks: List[asyncio.Task] = []
        self.tracking_active = False
        
    async def initialize(self) -> None:
        """Initialize the ROI calculator."""
        try:
            self.logger.info("Initializing Advanced ROI Calculator")
            
            # Load market data
            await self._load_market_data()
            
            # Start background tracking
            self.tracking_active = True
            self.roi_tasks = [
                asyncio.create_task(self._roi_tracking_loop()),
                asyncio.create_task(self._market_data_update_loop())
            ]
            
            self.logger.info("Advanced ROI Calculator initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Advanced ROI Calculator: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the ROI calculator."""
        try:
            self.logger.info("Shutting down Advanced ROI Calculator")
            
            self.tracking_active = False
            
            # Cancel background tasks
            for task in self.roi_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                        
            self.logger.info("Advanced ROI Calculator shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    async def create_investment(
        self,
        name: str,
        initial_cost: float,
        expected_benefits: List[float],
        ongoing_costs: Optional[List[float]] = None,
        discount_rate: Optional[float] = None,
        metadata: Optional[Dict[str, Any]] = None
    ) -> str:
        """
        Create a new investment for ROI analysis.
        
        Args:
            name: Investment name
            initial_cost: Initial investment cost
            expected_benefits: Expected benefits per period
            ongoing_costs: Ongoing costs per period
            discount_rate: Discount rate for NPV calculation
            metadata: Additional investment metadata
            
        Returns:
            Investment ID
        """
        try:
            investment_id = f"inv_{int(datetime.utcnow().timestamp())}"
            
            if ongoing_costs is None:
                ongoing_costs = [0.0] * len(expected_benefits)
            elif len(ongoing_costs) < len(expected_benefits):
                # Extend ongoing costs to match benefits length
                ongoing_costs.extend([ongoing_costs[-1]] * (len(expected_benefits) - len(ongoing_costs)))
                
            investment = Investment(
                investment_id=investment_id,
                name=name,
                initial_cost=initial_cost,
                ongoing_costs=ongoing_costs,
                expected_benefits=expected_benefits,
                discount_rate=discount_rate or self.default_discount_rate,
                time_horizon=len(expected_benefits),
                metadata=metadata or {}
            )
            
            self.investments[investment_id] = investment
            
            self.logger.info(f"Created investment: {name} (ID: {investment_id})")
            
            return investment_id
            
        except Exception as e:
            self.logger.error(f"Failed to create investment: {e}")
            raise
            
    async def calculate_comprehensive_roi(
        self,
        investment_id: str,
        scenario_params: Optional[ScenarioParameters] = None
    ) -> ROIAnalysis:
        """
        Calculate comprehensive ROI analysis for an investment.
        
        Args:
            investment_id: ID of the investment
            scenario_params: Parameters for scenario modeling
            
        Returns:
            Comprehensive ROI analysis
        """
        try:
            if investment_id not in self.investments:
                raise ValueError(f"Investment {investment_id} not found")
                
            investment = self.investments[investment_id]
            scenario_params = scenario_params or ScenarioParameters()
            
            self.logger.info(f"Calculating comprehensive ROI for investment: {investment.name}")
            
            # Generate cash flows
            cash_flows = await self._generate_cash_flows(investment)
            
            # Calculate all ROI metrics
            metrics = await self._calculate_all_metrics(investment, cash_flows)
            
            # Perform scenario analysis
            scenarios = await self._perform_scenario_analysis(investment, scenario_params)
            
            # Conduct sensitivity analysis
            sensitivity_analysis = await self._conduct_sensitivity_analysis(investment)
            
            # Generate recommendations
            recommendations = await self._generate_recommendations(investment, metrics, scenarios)
            
            # Assess risk
            risk_assessment = await self._assess_investment_risk(investment, scenarios)
            
            # Calculate confidence level
            confidence_level = await self._calculate_confidence_level(investment, scenarios)
            
            analysis = ROIAnalysis(
                investment_id=investment_id,
                analysis_date=datetime.utcnow(),
                metrics=metrics,
                cash_flows=cash_flows,
                scenarios=scenarios,
                sensitivity_analysis=sensitivity_analysis,
                recommendations=recommendations,
                confidence_level=confidence_level,
                risk_assessment=risk_assessment
            )
            
            # Store analysis
            self.analyses[investment_id] = analysis
            
            self.logger.info(f"Completed ROI analysis for investment: {investment.name}")
            
            return analysis
            
        except Exception as e:
            self.logger.error(f"Failed to calculate comprehensive ROI: {e}")
            raise
            
    async def calculate_npv(
        self,
        cash_flows: List[float],
        discount_rate: float,
        initial_investment: float
    ) -> float:
        """
        Calculate Net Present Value (NPV).
        
        Args:
            cash_flows: List of cash flows
            discount_rate: Discount rate
            initial_investment: Initial investment amount
            
        Returns:
            NPV value
        """
        try:
            npv = -initial_investment
            
            for period, cash_flow in enumerate(cash_flows, 1):
                present_value = cash_flow / ((1 + discount_rate) ** period)
                npv += present_value
                
            return npv
            
        except Exception as e:
            self.logger.error(f"Failed to calculate NPV: {e}")
            return 0.0
            
    async def calculate_irr(
        self,
        cash_flows: List[float],
        initial_investment: float,
        max_iterations: int = 1000
    ) -> Optional[float]:
        """
        Calculate Internal Rate of Return (IRR).
        
        Args:
            cash_flows: List of cash flows
            initial_investment: Initial investment amount
            max_iterations: Maximum iterations for calculation
            
        Returns:
            IRR value or None if calculation fails
        """
        try:
            # Prepare cash flow array (including initial investment)
            all_cash_flows = [-initial_investment] + cash_flows
            
            # Define NPV function for IRR calculation
            def npv_function(rate):
                return sum(cf / ((1 + rate) ** i) for i, cf in enumerate(all_cash_flows))
                
            # Use numerical method to find IRR
            try:
                irr = fsolve(npv_function, 0.1)[0]  # Start with 10% guess
                
                # Validate result
                if abs(npv_function(irr)) < 1e-6 and -1 < irr < 10:  # Reasonable IRR range
                    return irr
                else:
                    return None
                    
            except:
                return None
                
        except Exception as e:
            self.logger.error(f"Failed to calculate IRR: {e}")
            return None
            
    async def calculate_payback_period(
        self,
        cash_flows: List[float],
        initial_investment: float,
        discounted: bool = False,
        discount_rate: float = 0.0
    ) -> Optional[float]:
        """
        Calculate payback period.
        
        Args:
            cash_flows: List of cash flows
            initial_investment: Initial investment amount
            discounted: Whether to use discounted payback period
            discount_rate: Discount rate for discounted payback
            
        Returns:
            Payback period in years or None if not achieved
        """
        try:
            cumulative_cash_flow = 0.0
            
            for period, cash_flow in enumerate(cash_flows, 1):
                if discounted:
                    present_value = cash_flow / ((1 + discount_rate) ** period)
                    cumulative_cash_flow += present_value
                else:
                    cumulative_cash_flow += cash_flow
                    
                if cumulative_cash_flow >= initial_investment:
                    # Interpolate to get exact payback period
                    if period == 1:
                        return period
                    else:
                        previous_cumulative = cumulative_cash_flow - (
                            cash_flow / ((1 + discount_rate) ** period) if discounted else cash_flow
                        )
                        remaining = initial_investment - previous_cumulative
                        current_flow = cash_flow / ((1 + discount_rate) ** period) if discounted else cash_flow
                        
                        if current_flow > 0:
                            fraction = remaining / current_flow
                            return period - 1 + fraction
                        else:
                            return period
                            
            return None  # Payback not achieved within time horizon
            
        except Exception as e:
            self.logger.error(f"Failed to calculate payback period: {e}")
            return None
            
    async def calculate_profitability_index(
        self,
        cash_flows: List[float],
        discount_rate: float,
        initial_investment: float
    ) -> float:
        """
        Calculate Profitability Index (PI).
        
        Args:
            cash_flows: List of cash flows
            discount_rate: Discount rate
            initial_investment: Initial investment amount
            
        Returns:
            Profitability Index
        """
        try:
            present_value_of_benefits = 0.0
            
            for period, cash_flow in enumerate(cash_flows, 1):
                present_value = cash_flow / ((1 + discount_rate) ** period)
                present_value_of_benefits += present_value
                
            if initial_investment > 0:
                return present_value_of_benefits / initial_investment
            else:
                return 0.0
                
        except Exception as e:
            self.logger.error(f"Failed to calculate profitability index: {e}")
            return 0.0
            
    async def perform_monte_carlo_analysis(
        self,
        investment_id: str,
        iterations: int = 10000,
        scenario_params: Optional[ScenarioParameters] = None
    ) -> Dict[str, Any]:
        """
        Perform Monte Carlo simulation for risk analysis.
        
        Args:
            investment_id: ID of the investment
            iterations: Number of simulation iterations
            scenario_params: Parameters for scenario modeling
            
        Returns:
            Monte Carlo analysis results
        """
        try:
            if investment_id not in self.investments:
                raise ValueError(f"Investment {investment_id} not found")
                
            investment = self.investments[investment_id]
            scenario_params = scenario_params or ScenarioParameters()
            
            self.logger.info(f"Performing Monte Carlo analysis for investment: {investment.name}")
            
            npv_results = []
            irr_results = []
            
            for _ in range(iterations):
                # Generate random variations
                varied_benefits = []
                varied_costs = []
                
                for benefit in investment.expected_benefits:
                    # Apply random variation to benefits
                    variation = np.random.normal(1.0, scenario_params.benefit_variance)
                    varied_benefits.append(benefit * variation)
                    
                for cost in investment.ongoing_costs:
                    # Apply random variation to costs
                    variation = np.random.normal(1.0, scenario_params.cost_variance)
                    varied_costs.append(cost * variation)
                    
                # Calculate net cash flows
                net_cash_flows = [
                    benefit - cost for benefit, cost in zip(varied_benefits, varied_costs)
                ]
                
                # Random discount rate
                min_rate, max_rate = scenario_params.discount_rate_range
                discount_rate = np.random.uniform(min_rate, max_rate)
                
                # Calculate NPV for this iteration
                npv = await self.calculate_npv(net_cash_flows, discount_rate, investment.initial_cost)
                npv_results.append(npv)
                
                # Calculate IRR for this iteration
                irr = await self.calculate_irr(net_cash_flows, investment.initial_cost)
                if irr is not None:
                    irr_results.append(irr)
                    
            # Calculate statistics
            npv_mean = np.mean(npv_results)
            npv_std = np.std(npv_results)
            npv_percentiles = np.percentile(npv_results, [5, 25, 50, 75, 95])
            
            irr_mean = np.mean(irr_results) if irr_results else 0
            irr_std = np.std(irr_results) if irr_results else 0
            irr_percentiles = np.percentile(irr_results, [5, 25, 50, 75, 95]) if irr_results else [0] * 5
            
            # Calculate probability of positive NPV
            positive_npv_count = sum(1 for npv in npv_results if npv > 0)
            probability_positive_npv = positive_npv_count / len(npv_results)
            
            return {
                "iterations": iterations,
                "npv_statistics": {
                    "mean": npv_mean,
                    "std": npv_std,
                    "percentiles": {
                        "5th": npv_percentiles[0],
                        "25th": npv_percentiles[1],
                        "50th": npv_percentiles[2],
                        "75th": npv_percentiles[3],
                        "95th": npv_percentiles[4]
                    }
                },
                "irr_statistics": {
                    "mean": irr_mean,
                    "std": irr_std,
                    "percentiles": {
                        "5th": irr_percentiles[0],
                        "25th": irr_percentiles[1],
                        "50th": irr_percentiles[2],
                        "75th": irr_percentiles[3],
                        "95th": irr_percentiles[4]
                    }
                },
                "probability_positive_npv": probability_positive_npv,
                "risk_metrics": {
                    "value_at_risk_5": npv_percentiles[0],
                    "expected_shortfall": np.mean([npv for npv in npv_results if npv <= npv_percentiles[0]]),
                    "coefficient_of_variation": npv_std / abs(npv_mean) if npv_mean != 0 else float('inf')
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to perform Monte Carlo analysis: {e}")
            return {}
            
    async def compare_investments(
        self,
        investment_ids: List[str],
        comparison_metrics: Optional[List[ROIMetric]] = None
    ) -> Dict[str, Any]:
        """
        Compare multiple investments across various metrics.
        
        Args:
            investment_ids: List of investment IDs to compare
            comparison_metrics: Metrics to use for comparison
            
        Returns:
            Investment comparison results
        """
        try:
            if not investment_ids:
                return {"error": "No investments provided for comparison"}
                
            comparison_metrics = comparison_metrics or [
                ROIMetric.NPV, ROIMetric.IRR, ROIMetric.PAYBACK_PERIOD, ROIMetric.PROFITABILITY_INDEX
            ]
            
            self.logger.info(f"Comparing {len(investment_ids)} investments")
            
            comparison_results = {}
            
            # Calculate metrics for each investment
            for investment_id in investment_ids:
                if investment_id not in self.investments:
                    continue
                    
                investment = self.investments[investment_id]
                
                # Get or calculate analysis
                if investment_id in self.analyses:
                    analysis = self.analyses[investment_id]
                else:
                    analysis = await self.calculate_comprehensive_roi(investment_id)
                    
                comparison_results[investment_id] = {
                    "name": investment.name,
                    "initial_cost": investment.initial_cost,
                    "time_horizon": investment.time_horizon,
                    "metrics": {metric.value: analysis.metrics.get(metric, 0) for metric in comparison_metrics},
                    "confidence_level": analysis.confidence_level,
                    "risk_score": analysis.risk_assessment.get("overall_risk_score", 0.5)
                }
                
            # Rank investments by each metric
            rankings = {}
            for metric in comparison_metrics:
                metric_values = [
                    (inv_id, data["metrics"][metric.value])
                    for inv_id, data in comparison_results.items()
                    if metric.value in data["metrics"]
                ]
                
                # Sort based on metric (higher is better for most metrics)
                reverse_sort = metric not in [ROIMetric.PAYBACK_PERIOD, ROIMetric.DISCOUNTED_PAYBACK]
                sorted_investments = sorted(metric_values, key=lambda x: x[1], reverse=reverse_sort)
                
                rankings[metric.value] = [
                    {"investment_id": inv_id, "value": value, "rank": rank + 1}
                    for rank, (inv_id, value) in enumerate(sorted_investments)
                ]
                
            # Calculate overall score
            overall_scores = {}
            for investment_id in comparison_results:
                score = 0
                weight_sum = 0
                
                for metric in comparison_metrics:
                    metric_ranking = next(
                        (item for item in rankings[metric.value] if item["investment_id"] == investment_id),
                        None
                    )
                    
                    if metric_ranking:
                        # Weight by inverse rank (lower rank = higher score)
                        weight = 1.0
                        score += weight * (len(investment_ids) - metric_ranking["rank"] + 1)
                        weight_sum += weight
                        
                overall_scores[investment_id] = score / weight_sum if weight_sum > 0 else 0
                
            # Sort by overall score
            sorted_overall = sorted(overall_scores.items(), key=lambda x: x[1], reverse=True)
            
            return {
                "comparison_date": datetime.utcnow().isoformat(),
                "investments_compared": len(investment_ids),
                "comparison_metrics": [metric.value for metric in comparison_metrics],
                "detailed_results": comparison_results,
                "rankings_by_metric": rankings,
                "overall_ranking": [
                    {
                        "rank": rank + 1,
                        "investment_id": inv_id,
                        "name": comparison_results[inv_id]["name"],
                        "overall_score": score
                    }
                    for rank, (inv_id, score) in enumerate(sorted_overall)
                ],
                "recommendations": await self._generate_comparison_recommendations(comparison_results, sorted_overall)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to compare investments: {e}")
            return {"error": str(e)}
            
    async def track_roi_performance(
        self,
        investment_id: str,
        actual_cash_flows: List[float],
        periods_elapsed: int
    ) -> Dict[str, Any]:
        """
        Track actual ROI performance against projections.
        
        Args:
            investment_id: ID of the investment
            actual_cash_flows: Actual cash flows realized
            periods_elapsed: Number of periods that have elapsed
            
        Returns:
            Performance tracking results
        """
        try:
            if investment_id not in self.investments:
                raise ValueError(f"Investment {investment_id} not found")
                
            investment = self.investments[investment_id]
            
            # Get original projections
            if investment_id in self.analyses:
                original_analysis = self.analyses[investment_id]
            else:
                original_analysis = await self.calculate_comprehensive_roi(investment_id)
                
            # Calculate performance metrics
            projected_cash_flows = [
                cf.net_flow for cf in original_analysis.cash_flows[:periods_elapsed]
            ]
            
            # Variance analysis
            variances = []
            for i, (actual, projected) in enumerate(zip(actual_cash_flows, projected_cash_flows)):
                variance = actual - projected
                variance_pct = (variance / projected * 100) if projected != 0 else 0
                
                variances.append({
                    "period": i + 1,
                    "actual": actual,
                    "projected": projected,
                    "variance": variance,
                    "variance_percentage": variance_pct
                })
                
            # Calculate updated projections
            remaining_periods = investment.time_horizon - periods_elapsed
            if remaining_periods > 0:
                # Adjust remaining projections based on performance
                performance_factor = sum(actual_cash_flows) / sum(projected_cash_flows) if sum(projected_cash_flows) != 0 else 1.0
                
                updated_projections = []
                for i in range(periods_elapsed, investment.time_horizon):
                    original_projection = investment.expected_benefits[i] - investment.ongoing_costs[i]
                    adjusted_projection = original_projection * performance_factor
                    updated_projections.append(adjusted_projection)
                    
                # Calculate updated ROI metrics
                all_cash_flows = actual_cash_flows + updated_projections
                updated_npv = await self.calculate_npv(all_cash_flows, investment.discount_rate, investment.initial_cost)
                updated_irr = await self.calculate_irr(all_cash_flows, investment.initial_cost)
                
            else:
                updated_projections = []
                updated_npv = await self.calculate_npv(actual_cash_flows, investment.discount_rate, investment.initial_cost)
                updated_irr = await self.calculate_irr(actual_cash_flows, investment.initial_cost)
                
            # Performance assessment
            total_actual = sum(actual_cash_flows)
            total_projected = sum(projected_cash_flows)
            overall_performance = (total_actual / total_projected - 1) * 100 if total_projected != 0 else 0
            
            performance_status = "on_track"
            if overall_performance > 10:
                performance_status = "exceeding"
            elif overall_performance < -10:
                performance_status = "underperforming"
                
            return {
                "investment_id": investment_id,
                "tracking_date": datetime.utcnow().isoformat(),
                "periods_elapsed": periods_elapsed,
                "remaining_periods": remaining_periods,
                "variance_analysis": variances,
                "performance_summary": {
                    "total_actual": total_actual,
                    "total_projected": total_projected,
                    "overall_performance_pct": overall_performance,
                    "status": performance_status
                },
                "updated_metrics": {
                    "npv": updated_npv,
                    "irr": updated_irr,
                    "original_npv": original_analysis.metrics.get(ROIMetric.NPV, 0),
                    "original_irr": original_analysis.metrics.get(ROIMetric.IRR, 0)
                },
                "updated_projections": updated_projections,
                "recommendations": await self._generate_tracking_recommendations(
                    performance_status, overall_performance, variances
                )
            }
            
        except Exception as e:
            self.logger.error(f"Failed to track ROI performance: {e}")
            return {"error": str(e)}
            
    async def _generate_cash_flows(self, investment: Investment) -> List[CashFlow]:
        """Generate cash flow projections for an investment."""
        try:
            cash_flows = []
            
            # Initial investment (period 0)
            cash_flows.append(CashFlow(
                period=0,
                date=datetime.utcnow(),
                inflow=0.0,
                outflow=investment.initial_cost,
                net_flow=-investment.initial_cost,
                description="Initial investment",
                category="capital_expenditure"
            ))
            
            # Ongoing cash flows
            for period in range(investment.time_horizon):
                period_date = datetime.utcnow() + timedelta(days=30 * (period + 1))  # Monthly periods
                
                benefit = investment.expected_benefits[period] if period < len(investment.expected_benefits) else 0
                cost = investment.ongoing_costs[period] if period < len(investment.ongoing_costs) else 0
                
                cash_flows.append(CashFlow(
                    period=period + 1,
                    date=period_date,
                    inflow=benefit,
                    outflow=cost,
                    net_flow=benefit - cost,
                    description=f"Period {period + 1} operations",
                    category="operational"
                ))
                
            return cash_flows
            
        except Exception as e:
            self.logger.error(f"Failed to generate cash flows: {e}")
            return []
            
    async def _calculate_all_metrics(
        self,
        investment: Investment,
        cash_flows: List[CashFlow]
    ) -> Dict[ROIMetric, float]:
        """Calculate all ROI metrics for an investment."""
        try:
            metrics = {}
            
            # Extract net cash flows (excluding initial investment)
            net_cash_flows = [cf.net_flow for cf in cash_flows[1:]]  # Skip initial investment
            
            # Simple ROI
            total_benefits = sum(investment.expected_benefits)
            total_costs = investment.initial_cost + sum(investment.ongoing_costs)
            simple_roi = ((total_benefits - total_costs) / total_costs) * 100 if total_costs > 0 else 0
            metrics[ROIMetric.SIMPLE_ROI] = simple_roi
            
            # NPV
            npv = await self.calculate_npv(net_cash_flows, investment.discount_rate, investment.initial_cost)
            metrics[ROIMetric.NPV] = npv
            
            # IRR
            irr = await self.calculate_irr(net_cash_flows, investment.initial_cost)
            metrics[ROIMetric.IRR] = irr * 100 if irr is not None else 0  # Convert to percentage
            
            # Payback Period
            payback = await self.calculate_payback_period(net_cash_flows, investment.initial_cost)
            metrics[ROIMetric.PAYBACK_PERIOD] = payback if payback is not None else float('inf')
            
            # Discounted Payback Period
            discounted_payback = await self.calculate_payback_period(
                net_cash_flows, investment.initial_cost, discounted=True, discount_rate=investment.discount_rate
            )
            metrics[ROIMetric.DISCOUNTED_PAYBACK] = discounted_payback if discounted_payback is not None else float('inf')
            
            # Profitability Index
            pi = await self.calculate_profitability_index(net_cash_flows, investment.discount_rate, investment.initial_cost)
            metrics[ROIMetric.PROFITABILITY_INDEX] = pi
            
            # Modified IRR (using reinvestment rate)
            reinvestment_rate = investment.discount_rate
            mirr = await self._calculate_modified_irr(net_cash_flows, investment.initial_cost, reinvestment_rate)
            metrics[ROIMetric.MODIFIED_IRR] = mirr * 100 if mirr is not None else 0
            
            return metrics
            
        except Exception as e:
            self.logger.error(f"Failed to calculate all metrics: {e}")
            return {}
            
    async def _calculate_modified_irr(
        self,
        cash_flows: List[float],
        initial_investment: float,
        reinvestment_rate: float
    ) -> Optional[float]:
        """Calculate Modified Internal Rate of Return (MIRR)."""
        try:
            if not cash_flows or initial_investment <= 0:
                return None
                
            # Separate positive and negative cash flows
            positive_flows = []
            negative_flows = []
            
            for i, cf in enumerate(cash_flows):
                if cf > 0:
                    positive_flows.append((i + 1, cf))
                elif cf < 0:
                    negative_flows.append((i + 1, cf))
                    
            if not positive_flows:
                return None
                
            # Calculate future value of positive cash flows
            n = len(cash_flows)
            fv_positive = sum(cf * ((1 + reinvestment_rate) ** (n - period)) for period, cf in positive_flows)
            
            # Calculate present value of negative cash flows
            pv_negative = initial_investment + sum(cf / ((1 + reinvestment_rate) ** period) for period, cf in negative_flows)
            
            if pv_negative <= 0:
                return None
                
            # Calculate MIRR
            mirr = (fv_positive / pv_negative) ** (1 / n) - 1
            
            return mirr
            
        except Exception as e:
            self.logger.error(f"Failed to calculate MIRR: {e}")
            return None
            
    async def _perform_scenario_analysis(
        self,
        investment: Investment,
        scenario_params: ScenarioParameters
    ) -> Dict[ScenarioType, Dict[str, float]]:
        """Perform scenario analysis for different market conditions."""
        try:
            scenarios = {}
            
            # Best case scenario
            best_case_benefits = [b * (1 + scenario_params.benefit_variance) for b in investment.expected_benefits]
            best_case_costs = [c * (1 - scenario_params.cost_variance) for c in investment.ongoing_costs]
            best_case_flows = [b - c for b, c in zip(best_case_benefits, best_case_costs)]
            
            best_npv = await self.calculate_npv(best_case_flows, investment.discount_rate * 0.8, investment.initial_cost)
            best_irr = await self.calculate_irr(best_case_flows, investment.initial_cost)
            
            scenarios[ScenarioType.BEST_CASE] = {
                "npv": best_npv,
                "irr": best_irr * 100 if best_irr else 0,
                "total_return": sum(best_case_flows)
            }
            
            # Worst case scenario
            worst_case_benefits = [b * (1 - scenario_params.benefit_variance) for b in investment.expected_benefits]
            worst_case_costs = [c * (1 + scenario_params.cost_variance) for c in investment.ongoing_costs]
            worst_case_flows = [b - c for b, c in zip(worst_case_benefits, worst_case_costs)]
            
            worst_npv = await self.calculate_npv(worst_case_flows, investment.discount_rate * 1.2, investment.initial_cost)
            worst_irr = await self.calculate_irr(worst_case_flows, investment.initial_cost)
            
            scenarios[ScenarioType.WORST_CASE] = {
                "npv": worst_npv,
                "irr": worst_irr * 100 if worst_irr else 0,
                "total_return": sum(worst_case_flows)
            }
            
            # Most likely scenario (base case)
            base_flows = [b - c for b, c in zip(investment.expected_benefits, investment.ongoing_costs)]
            base_npv = await self.calculate_npv(base_flows, investment.discount_rate, investment.initial_cost)
            base_irr = await self.calculate_irr(base_flows, investment.initial_cost)
            
            scenarios[ScenarioType.MOST_LIKELY] = {
                "npv": base_npv,
                "irr": base_irr * 100 if base_irr else 0,
                "total_return": sum(base_flows)
            }
            
            # Monte Carlo scenario
            monte_carlo_results = await self.perform_monte_carlo_analysis(
                investment.investment_id, self.monte_carlo_iterations, scenario_params
            )
            
            if monte_carlo_results:
                scenarios[ScenarioType.MONTE_CARLO] = {
                    "npv": monte_carlo_results["npv_statistics"]["mean"],
                    "irr": monte_carlo_results["irr_statistics"]["mean"],
                    "probability_positive": monte_carlo_results["probability_positive_npv"],
                    "value_at_risk": monte_carlo_results["risk_metrics"]["value_at_risk_5"]
                }
                
            return scenarios
            
        except Exception as e:
            self.logger.error(f"Failed to perform scenario analysis: {e}")
            return {}
            
    async def _conduct_sensitivity_analysis(self, investment: Investment) -> Dict[str, Dict[str, float]]:
        """Conduct sensitivity analysis for key variables."""
        try:
            sensitivity_results = {}
            
            # Base case NPV
            base_flows = [b - c for b, c in zip(investment.expected_benefits, investment.ongoing_costs)]
            base_npv = await self.calculate_npv(base_flows, investment.discount_rate, investment.initial_cost)
            
            # Sensitivity to discount rate
            discount_rates = [investment.discount_rate * (1 + delta) for delta in [-0.2, -0.1, 0.1, 0.2]]
            discount_sensitivities = []
            
            for rate in discount_rates:
                npv = await self.calculate_npv(base_flows, rate, investment.initial_cost)
                sensitivity = ((npv - base_npv) / base_npv * 100) if base_npv != 0 else 0
                discount_sensitivities.append(sensitivity)
                
            sensitivity_results["discount_rate"] = {
                "changes": [-20, -10, 10, 20],  # Percentage changes
                "npv_impacts": discount_sensitivities
            }
            
            # Sensitivity to benefits
            benefit_changes = [-0.2, -0.1, 0.1, 0.2]
            benefit_sensitivities = []
            
            for change in benefit_changes:
                adjusted_benefits = [b * (1 + change) for b in investment.expected_benefits]
                adjusted_flows = [b - c for b, c in zip(adjusted_benefits, investment.ongoing_costs)]
                npv = await self.calculate_npv(adjusted_flows, investment.discount_rate, investment.initial_cost)
                sensitivity = ((npv - base_npv) / base_npv * 100) if base_npv != 0 else 0
                benefit_sensitivities.append(sensitivity)
                
            sensitivity_results["benefits"] = {
                "changes": [-20, -10, 10, 20],
                "npv_impacts": benefit_sensitivities
            }
            
            # Sensitivity to costs
            cost_changes = [-0.2, -0.1, 0.1, 0.2]
            cost_sensitivities = []
            
            for change in cost_changes:
                adjusted_costs = [c * (1 + change) for c in investment.ongoing_costs]
                adjusted_flows = [b - c for b, c in zip(investment.expected_benefits, adjusted_costs)]
                npv = await self.calculate_npv(adjusted_flows, investment.discount_rate, investment.initial_cost)
                sensitivity = ((npv - base_npv) / base_npv * 100) if base_npv != 0 else 0
                cost_sensitivities.append(sensitivity)
                
            sensitivity_results["costs"] = {
                "changes": [-20, -10, 10, 20],
                "npv_impacts": cost_sensitivities
            }
            
            return sensitivity_results
            
        except Exception as e:
            self.logger.error(f"Failed to conduct sensitivity analysis: {e}")
            return {}
            
    async def _generate_recommendations(
        self,
        investment: Investment,
        metrics: Dict[ROIMetric, float],
        scenarios: Dict[ScenarioType, Dict[str, float]]
    ) -> List[str]:
        """Generate investment recommendations based on analysis."""
        try:
            recommendations = []
            
            # NPV-based recommendations
            npv = metrics.get(ROIMetric.NPV, 0)
            if npv > 0:
                recommendations.append(f"Investment shows positive NPV of ${npv:,.2f}, indicating value creation")
            else:
                recommendations.append(f"Investment shows negative NPV of ${npv:,.2f}, consider alternatives")
                
            # IRR-based recommendations
            irr = metrics.get(ROIMetric.IRR, 0)
            if irr > investment.discount_rate * 100:
                recommendations.append(f"IRR of {irr:.2f}% exceeds required return of {investment.discount_rate*100:.2f}%")
            else:
                recommendations.append(f"IRR of {irr:.2f}% is below required return, investment may not be attractive")
                
            # Payback period recommendations
            payback = metrics.get(ROIMetric.PAYBACK_PERIOD, float('inf'))
            if payback != float('inf'):
                if payback <= 2:
                    recommendations.append(f"Short payback period of {payback:.1f} years indicates quick recovery")
                elif payback <= 5:
                    recommendations.append(f"Moderate payback period of {payback:.1f} years is acceptable")
                else:
                    recommendations.append(f"Long payback period of {payback:.1f} years may indicate higher risk")
            else:
                recommendations.append("Investment does not pay back within the analysis period")
                
            # Risk-based recommendations
            if ScenarioType.MONTE_CARLO in scenarios:
                mc_results = scenarios[ScenarioType.MONTE_CARLO]
                prob_positive = mc_results.get("probability_positive", 0)
                
                if prob_positive > 0.8:
                    recommendations.append(f"High probability ({prob_positive:.1%}) of positive returns indicates low risk")
                elif prob_positive > 0.6:
                    recommendations.append(f"Moderate probability ({prob_positive:.1%}) of positive returns")
                else:
                    recommendations.append(f"Low probability ({prob_positive:.1%}) of positive returns indicates high risk")
                    
            # Scenario-based recommendations
            if ScenarioType.WORST_CASE in scenarios and ScenarioType.BEST_CASE in scenarios:
                worst_npv = scenarios[ScenarioType.WORST_CASE]["npv"]
                best_npv = scenarios[ScenarioType.BEST_CASE]["npv"]
                
                if worst_npv > 0:
                    recommendations.append("Investment remains profitable even in worst-case scenario")
                else:
                    recommendations.append("Investment becomes unprofitable in worst-case scenario - consider risk mitigation")
                    
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Failed to generate recommendations: {e}")
            return []
            
    async def _assess_investment_risk(
        self,
        investment: Investment,
        scenarios: Dict[ScenarioType, Dict[str, float]]
    ) -> Dict[str, Any]:
        """Assess overall investment risk."""
        try:
            risk_factors = []
            risk_score = 0.5  # Base risk score
            
            # Market risk assessment
            if investment.metadata.get("market_volatility", "medium") == "high":
                risk_factors.append("High market volatility")
                risk_score += 0.1
                
            # Technology risk
            if investment.metadata.get("technology_maturity", "mature") == "emerging":
                risk_factors.append("Emerging technology risk")
                risk_score += 0.15
                
            # Regulatory risk
            if investment.metadata.get("regulatory_environment", "stable") == "changing":
                risk_factors.append("Changing regulatory environment")
                risk_score += 0.1
                
            # Financial risk based on scenarios
            if ScenarioType.WORST_CASE in scenarios and ScenarioType.BEST_CASE in scenarios:
                worst_npv = scenarios[ScenarioType.WORST_CASE]["npv"]
                best_npv = scenarios[ScenarioType.BEST_CASE]["npv"]
                
                npv_range = best_npv - worst_npv
                if npv_range > investment.initial_cost:
                    risk_factors.append("High NPV volatility")
                    risk_score += 0.1
                    
            # Payback period risk
            if investment.time_horizon > 60:  # More than 5 years
                risk_factors.append("Long investment horizon")
                risk_score += 0.05
                
            # Concentration risk
            if len(investment.expected_benefits) < 12:  # Less than 1 year of cash flows
                risk_factors.append("Short cash flow projection period")
                risk_score += 0.1
                
            # Cap risk score at 1.0
            risk_score = min(risk_score, 1.0)
            
            # Risk category
            if risk_score < 0.3:
                risk_category = "Low"
            elif risk_score < 0.6:
                risk_category = "Medium"
            elif risk_score < 0.8:
                risk_category = "High"
            else:
                risk_category = "Very High"
                
            return {
                "overall_risk_score": risk_score,
                "risk_category": risk_category,
                "risk_factors": risk_factors,
                "mitigation_strategies": await self._generate_risk_mitigation_strategies(risk_factors)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to assess investment risk: {e}")
            return {"overall_risk_score": 0.5, "risk_category": "Medium", "risk_factors": []}
            
    async def _generate_risk_mitigation_strategies(self, risk_factors: List[str]) -> List[str]:
        """Generate risk mitigation strategies based on identified risks."""
        strategies = []
        
        for factor in risk_factors:
            if "volatility" in factor.lower():
                strategies.append("Consider hedging strategies or diversification")
            elif "technology" in factor.lower():
                strategies.append("Implement phased rollout and technology validation")
            elif "regulatory" in factor.lower():
                strategies.append("Monitor regulatory changes and maintain compliance flexibility")
            elif "horizon" in factor.lower():
                strategies.append("Implement milestone-based reviews and exit strategies")
            elif "cash flow" in factor.lower():
                strategies.append("Extend analysis period and validate assumptions")
                
        if not strategies:
            strategies.append("Regular monitoring and periodic reassessment recommended")
            
        return strategies
        
    async def _calculate_confidence_level(
        self,
        investment: Investment,
        scenarios: Dict[ScenarioType, Dict[str, float]]
    ) -> float:
        """Calculate confidence level in the analysis."""
        try:
            confidence = 0.5  # Base confidence
            
            # Data quality factors
            if len(investment.expected_benefits) >= 12:  # At least 1 year of projections
                confidence += 0.1
                
            if len(investment.expected_benefits) >= 36:  # At least 3 years of projections
                confidence += 0.1
                
            # Scenario analysis completeness
            if len(scenarios) >= 3:
                confidence += 0.1
                
            # Monte Carlo analysis availability
            if ScenarioType.MONTE_CARLO in scenarios:
                confidence += 0.15
                
            # Metadata completeness
            metadata_fields = ["market_volatility", "technology_maturity", "regulatory_environment"]
            metadata_completeness = sum(1 for field in metadata_fields if field in investment.metadata) / len(metadata_fields)
            confidence += metadata_completeness * 0.15
            
            return min(confidence, 1.0)
            
        except Exception as e:
            self.logger.error(f"Failed to calculate confidence level: {e}")
            return 0.5
            
    async def _generate_comparison_recommendations(
        self,
        comparison_results: Dict[str, Any],
        sorted_overall: List[Tuple[str, float]]
    ) -> List[str]:
        """Generate recommendations for investment comparison."""
        try:
            recommendations = []
            
            if not sorted_overall:
                return ["No investments available for comparison"]
                
            # Top performer
            top_investment_id = sorted_overall[0][0]
            top_investment = comparison_results[top_investment_id]
            recommendations.append(f"Top performer: {top_investment['name']} with highest overall score")
            
            # Risk-adjusted recommendations
            low_risk_investments = [
                (inv_id, data) for inv_id, data in comparison_results.items()
                if data["risk_score"] < 0.4
            ]
            
            if low_risk_investments:
                best_low_risk = min(low_risk_investments, key=lambda x: x[1]["risk_score"])
                recommendations.append(f"Lowest risk option: {best_low_risk[1]['name']}")
                
            # Budget considerations
            investments_by_cost = sorted(
                comparison_results.items(),
                key=lambda x: x[1]["initial_cost"]
            )
            
            cheapest = investments_by_cost[0][1]
            recommendations.append(f"Most cost-effective: {cheapest['name']} with lowest initial cost")
            
            # Diversification recommendation
            if len(comparison_results) > 1:
                recommendations.append("Consider portfolio diversification across multiple investments")
                
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Failed to generate comparison recommendations: {e}")
            return []
            
    async def _generate_tracking_recommendations(
        self,
        performance_status: str,
        overall_performance: float,
        variances: List[Dict[str, Any]]
    ) -> List[str]:
        """Generate recommendations based on performance tracking."""
        try:
            recommendations = []
            
            if performance_status == "exceeding":
                recommendations.append("Investment is exceeding expectations - consider scaling similar investments")
                recommendations.append("Review success factors for application to other projects")
            elif performance_status == "underperforming":
                recommendations.append("Investment is underperforming - investigate root causes")
                recommendations.append("Consider corrective actions or early exit strategies")
            else:
                recommendations.append("Investment is performing as expected - continue monitoring")
                
            # Variance-based recommendations
            high_variance_periods = [v for v in variances if abs(v["variance_percentage"]) > 20]
            
            if high_variance_periods:
                recommendations.append(f"High variance detected in {len(high_variance_periods)} periods - review assumptions")
                
            # Trend analysis
            if len(variances) >= 3:
                recent_variances = [v["variance_percentage"] for v in variances[-3:]]
                if all(v < -10 for v in recent_variances):
                    recommendations.append("Declining performance trend - immediate attention required")
                elif all(v > 10 for v in recent_variances):
                    recommendations.append("Improving performance trend - consider acceleration opportunities")
                    
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Failed to generate tracking recommendations: {e}")
            return []
            
    async def _load_market_data(self) -> None:
        """Load market data for analysis."""
        try:
            # In production, this would load from external data sources
            self.market_data = {
                "risk_free_rate": 0.03,
                "market_volatility": 0.15,
                "inflation_rate": 0.025,
                "sector_multiples": {
                    "technology": 1.2,
                    "healthcare": 1.1,
                    "finance": 0.9,
                    "manufacturing": 0.8
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to load market data: {e}")
            
    # Background task methods
    async def _roi_tracking_loop(self) -> None:
        """Background ROI tracking and alerts."""
        while self.tracking_active:
            try:
                # Check for ROI alerts and updates
                await self._check_roi_alerts()
                
                await asyncio.sleep(3600)  # Check every hour
                
            except Exception as e:
                self.logger.error(f"Error in ROI tracking: {e}")
                await asyncio.sleep(1800)
                
    async def _market_data_update_loop(self) -> None:
        """Background market data updates."""
        while self.tracking_active:
            try:
                # Update market data
                await self._load_market_data()
                
                await asyncio.sleep(86400)  # Update daily
                
            except Exception as e:
                self.logger.error(f"Error updating market data: {e}")
                await asyncio.sleep(43200)
                
    async def _check_roi_alerts(self) -> None:
        """Check for ROI-related alerts."""
        try:
            # In production, this would check for various alert conditions
            # and send notifications
            pass
            
        except Exception as e:
            self.logger.error(f"Failed to check ROI alerts: {e}")    async
 def _calculate_base_metrics(self, investment: Investment) -> Dict[ROIMetric, float]:
        """Calculate base ROI metrics for an investment."""
        try:
            metrics = {}
            
            # Calculate NPV
            npv = await self._calculate_npv(investment)
            metrics[ROIMetric.NET_PRESENT_VALUE] = npv
            
            # Calculate IRR
            irr = await self._calculate_irr(investment)
            metrics[ROIMetric.INTERNAL_RATE_RETURN] = irr
            
            # Calculate Payback Period
            payback = await self._calculate_payback_period(investment)
            metrics[ROIMetric.PAYBACK_PERIOD] = payback
            
            # Calculate Discounted Payback Period
            discounted_payback = await self._calculate_discounted_payback_period(investment)
            metrics[ROIMetric.DISCOUNTED_PAYBACK] = discounted_payback
            
            # Calculate Profitability Index
            pi = await self._calculate_profitability_index(investment)
            metrics[ROIMetric.PROFITABILITY_INDEX] = pi
            
            # Calculate Simple ROI
            roi = await self._calculate_simple_roi(investment)
            metrics[ROIMetric.RETURN_ON_INVESTMENT] = roi
            
            # Calculate Modified IRR
            mirr = await self._calculate_modified_irr(investment)
            metrics[ROIMetric.MODIFIED_IRR] = mirr
            
            # Calculate Equivalent Annual Annuity
            eaa = await self._calculate_equivalent_annual_annuity(investment)
            metrics[ROIMetric.EQUIVALENT_ANNUAL_ANNUITY] = eaa
            
            return metrics
        except Exception as e:
            self.logger.error(f"Failed to calculate base metrics: {e}")
            return {}
    
    async def _calculate_npv(self, investment: Investment) -> float:
        """Calculate Net Present Value."""
        try:
            npv = -investment.initial_investment  # Initial investment is negative cash flow
            
            for cf in investment.cash_flows:
                discounted_value = cf.net_flow / ((1 + investment.discount_rate) ** cf.period)
                npv += discounted_value
            
            return npv
        except Exception as e:
            self.logger.error(f"Failed to calculate NPV: {e}")
            return 0.0
    
    async def _calculate_irr(self, investment: Investment) -> float:
        """Calculate Internal Rate of Return using Newton-Raphson method."""
        try:
            # Prepare cash flows including initial investment
            cash_flows = [-investment.initial_investment]
            periods = [0]
            
            for cf in investment.cash_flows:
                cash_flows.append(cf.net_flow)
                periods.append(cf.period)
            
            # Use scipy to find IRR
            def npv_function(rate):
                return sum(cf / ((1 + rate) ** period) for cf, period in zip(cash_flows, periods))
            
            try:
                # Find the rate where NPV = 0
                irr_result = optimize.fsolve(npv_function, 0.1)[0]
                return irr_result if abs(npv_function(irr_result)) < 1e-6 else 0.0
            except:
                # Fallback to manual calculation
                return await self._calculate_irr_manual(cash_flows, periods)
        except Exception as e:
            self.logger.error(f"Failed to calculate IRR: {e}")
            return 0.0
    
    async def _calculate_irr_manual(self, cash_flows: List[float], periods: List[int]) -> float:
        """Manual IRR calculation using bisection method."""
        try:
            def npv_at_rate(rate):
                return sum(cf / ((1 + rate) ** period) for cf, period in zip(cash_flows, periods))
            
            # Bisection method
            low_rate, high_rate = -0.99, 10.0
            tolerance = 1e-6
            max_iterations = 1000
            
            for _ in range(max_iterations):
                mid_rate = (low_rate + high_rate) / 2
                npv_mid = npv_at_rate(mid_rate)
                
                if abs(npv_mid) < tolerance:
                    return mid_rate
                
                if npv_at_rate(low_rate) * npv_mid < 0:
                    high_rate = mid_rate
                else:
                    low_rate = mid_rate
            
            return (low_rate + high_rate) / 2
        except Exception as e:
            self.logger.error(f"Failed manual IRR calculation: {e}")
            return 0.0
    
    async def _calculate_payback_period(self, investment: Investment) -> float:
        """Calculate simple payback period."""
        try:
            cumulative_cash_flow = -investment.initial_investment
            
            for cf in sorted(investment.cash_flows, key=lambda x: x.period):
                cumulative_cash_flow += cf.net_flow
                if cumulative_cash_flow >= 0:
                    # Linear interpolation for fractional period
                    previous_cumulative = cumulative_cash_flow - cf.net_flow
                    fraction = abs(previous_cumulative) / cf.net_flow
                    return cf.period - 1 + fraction
            
            # If payback never occurs, return a large number
            return float('inf')
        except Exception as e:
            self.logger.error(f"Failed to calculate payback period: {e}")
            return float('inf')
    
    async def _calculate_discounted_payback_period(self, investment: Investment) -> float:
        """Calculate discounted payback period."""
        try:
            cumulative_discounted_cash_flow = -investment.initial_investment
            
            for cf in sorted(investment.cash_flows, key=lambda x: x.period):
                discounted_cf = cf.net_flow / ((1 + investment.discount_rate) ** cf.period)
                cumulative_discounted_cash_flow += discounted_cf
                
                if cumulative_discounted_cash_flow >= 0:
                    # Linear interpolation for fractional period
                    previous_cumulative = cumulative_discounted_cash_flow - discounted_cf
                    fraction = abs(previous_cumulative) / discounted_cf
                    return cf.period - 1 + fraction
            
            return float('inf')
        except Exception as e:
            self.logger.error(f"Failed to calculate discounted payback period: {e}")
            return float('inf')
    
    async def _calculate_profitability_index(self, investment: Investment) -> float:
        """Calculate Profitability Index."""
        try:
            present_value_inflows = 0.0
            
            for cf in investment.cash_flows:
                discounted_value = cf.net_flow / ((1 + investment.discount_rate) ** cf.period)
                present_value_inflows += discounted_value
            
            if investment.initial_investment == 0:
                return float('inf') if present_value_inflows > 0 else 0.0
            
            return present_value_inflows / investment.initial_investment
        except Exception as e:
            self.logger.error(f"Failed to calculate profitability index: {e}")
            return 0.0
    
    async def _calculate_simple_roi(self, investment: Investment) -> float:
        """Calculate simple Return on Investment."""
        try:
            total_returns = sum(cf.net_flow for cf in investment.cash_flows)
            
            if investment.initial_investment == 0:
                return float('inf') if total_returns > 0 else 0.0
            
            return (total_returns - investment.initial_investment) / investment.initial_investment
        except Exception as e:
            self.logger.error(f"Failed to calculate simple ROI: {e}")
            return 0.0
    
    async def _calculate_modified_irr(self, investment: Investment) -> float:
        """Calculate Modified Internal Rate of Return."""
        try:
            # Separate positive and negative cash flows
            positive_flows = []
            negative_flows = []
            
            for cf in investment.cash_flows:
                if cf.net_flow > 0:
                    positive_flows.append((cf.net_flow, cf.period))
                else:
                    negative_flows.append((cf.net_flow, cf.period))
            
            # Calculate future value of positive cash flows
            reinvestment_rate = investment.discount_rate
            final_period = max(cf.period for cf in investment.cash_flows) if investment.cash_flows else 1
            
            fv_positive = sum(
                cf * ((1 + reinvestment_rate) ** (final_period - period))
                for cf, period in positive_flows
            )
            
            # Calculate present value of negative cash flows (including initial investment)
            pv_negative = investment.initial_investment + sum(
                abs(cf) / ((1 + investment.discount_rate) ** period)
                for cf, period in negative_flows
            )
            
            if pv_negative == 0:
                return float('inf') if fv_positive > 0 else 0.0
            
            # Calculate MIRR
            mirr = (fv_positive / pv_negative) ** (1 / final_period) - 1
            return mirr
        except Exception as e:
            self.logger.error(f"Failed to calculate MIRR: {e}")
            return 0.0
    
    async def _calculate_equivalent_annual_annuity(self, investment: Investment) -> float:
        """Calculate Equivalent Annual Annuity."""
        try:
            npv = await self._calculate_npv(investment)
            
            if not investment.cash_flows:
                return 0.0
            
            project_life = max(cf.period for cf in investment.cash_flows)
            
            if investment.discount_rate == 0:
                return npv / project_life
            
            # Calculate annuity factor
            annuity_factor = (1 - (1 + investment.discount_rate) ** (-project_life)) / investment.discount_rate
            
            return npv / annuity_factor
        except Exception as e:
            self.logger.error(f"Failed to calculate EAA: {e}")
            return 0.0
    
    async def _perform_scenario_analysis(self, investment: Investment) -> Dict[ScenarioType, Dict[ROIMetric, float]]:
        """Perform scenario analysis on the investment."""
        try:
            scenarios = {}
            
            for scenario_type, params in self.default_scenarios.items():
                # Create modified investment for scenario
                scenario_investment = await self._create_scenario_investment(investment, params)
                
                # Calculate metrics for scenario
                scenario_metrics = await self._calculate_base_metrics(scenario_investment)
                scenarios[scenario_type] = scenario_metrics
            
            return scenarios
        except Exception as e:
            self.logger.error(f"Failed to perform scenario analysis: {e}")
            return {}
    
    async def _create_scenario_investment(
        self, 
        base_investment: Investment, 
        scenario_params: ScenarioParameters
    ) -> Investment:
        """Create a modified investment based on scenario parameters."""
        try:
            # Create modified cash flows
            modified_cash_flows = []
            for cf in base_investment.cash_flows:
                modified_cf = CashFlow(
                    period=int(cf.period * scenario_params.timeline_multiplier),
                    date=cf.date,
                    inflow=cf.inflow * scenario_params.revenue_multiplier,
                    outflow=cf.outflow * scenario_params.cost_multiplier,
                    net_flow=0,  # Will be recalculated
                    description=f"{scenario_params.scenario_type.value}: {cf.description}",
                    category=cf.category,
                    confidence=cf.confidence * scenario_params.probability
                )
                modified_cf.net_flow = modified_cf.inflow - modified_cf.outflow
                modified_cash_flows.append(modified_cf)
            
            # Create scenario investment
            scenario_investment = Investment(
                investment_id=f"{base_investment.investment_id}_{scenario_params.scenario_type.value}",
                name=f"{base_investment.name} - {scenario_params.scenario_type.value}",
                description=f"{base_investment.description} ({scenario_params.description})",
                initial_investment=base_investment.initial_investment,
                cash_flows=modified_cash_flows,
                discount_rate=base_investment.discount_rate * scenario_params.risk_adjustment,
                risk_level=base_investment.risk_level,
                investment_type=base_investment.investment_type,
                start_date=base_investment.start_date,
                end_date=base_investment.end_date,
                currency=base_investment.currency
            )
            
            return scenario_investment
        except Exception as e:
            self.logger.error(f"Failed to create scenario investment: {e}")
            return base_investment
    
    async def _perform_sensitivity_analysis(
        self, 
        investment: Investment, 
        base_metrics: Dict[ROIMetric, float]
    ) -> Dict[str, Dict[str, float]]:
        """Perform sensitivity analysis on key variables."""
        try:
            sensitivity_ranges = {
                "revenue": (-0.3, 0.3),  # -30% to +30%
                "costs": (-0.3, 0.3),
                "discount_rate": (-0.2, 0.2),  # -20% to +20%
                "initial_investment": (-0.2, 0.2)
            }
            
            base_npv = base_metrics.get(ROIMetric.NET_PRESENT_VALUE, 0.0)
            
            return self.sensitivity_analyzer.perform_sensitivity_analysis(
                investment, base_npv, sensitivity_ranges
            )
        except Exception as e:
            self.logger.error(f"Failed to perform sensitivity analysis: {e}")
            return {}
    
    async def _assess_investment_risk(self, investment: Investment) -> Dict[str, float]:
        """Assess investment risk factors."""
        try:
            risk_factors = {}
            
            # Market risk based on investment type
            market_risk_multipliers = {
                "technology_enhancement": 1.2,
                "infrastructure": 0.8,
                "security": 1.0,
                "process_improvement": 0.9,
                "expansion": 1.3
            }
            
            base_market_risk = market_risk_multipliers.get(investment.investment_type, 1.0)
            risk_factors["market_risk"] = base_market_risk
            
            # Liquidity risk based on payback period
            payback_period = await self._calculate_payback_period(investment)
            if payback_period == float('inf'):
                liquidity_risk = 1.0
            else:
                liquidity_risk = min(1.0, payback_period / 5.0)  # Normalize to 5 years
            risk_factors["liquidity_risk"] = liquidity_risk
            
            # Concentration risk based on cash flow distribution
            cash_flow_values = [abs(cf.net_flow) for cf in investment.cash_flows]
            if cash_flow_values:
                concentration_risk = np.std(cash_flow_values) / np.mean(cash_flow_values)
            else:
                concentration_risk = 0.0
            risk_factors["concentration_risk"] = min(1.0, concentration_risk)
            
            # Overall risk level mapping
            risk_level_scores = {
                RiskLevel.VERY_LOW: 0.2,
                RiskLevel.LOW: 0.4,
                RiskLevel.MEDIUM: 0.6,
                RiskLevel.HIGH: 0.8,
                RiskLevel.VERY_HIGH: 1.0
            }
            risk_factors["overall_risk"] = risk_level_scores.get(investment.risk_level, 0.6)
            
            # Calculate composite risk score
            risk_factors["composite_risk"] = (
                risk_factors["market_risk"] * 0.3 +
                risk_factors["liquidity_risk"] * 0.25 +
                risk_factors["concentration_risk"] * 0.2 +
                risk_factors["overall_risk"] * 0.25
            )
            
            return risk_factors
        except Exception as e:
            self.logger.error(f"Failed to assess investment risk: {e}")
            return {}
    
    async def _perform_monte_carlo_analysis(self, investment: Investment) -> Dict[ROIMetric, Tuple[float, float]]:
        """Perform Monte Carlo simulation for confidence intervals."""
        try:
            # Define volatility parameters
            volatility_params = {
                "revenue_volatility": 0.15,  # 15% standard deviation
                "cost_volatility": 0.20,     # 20% standard deviation
            }
            
            # Generate simulated cash flows
            simulated_cash_flows = self.monte_carlo.simulate_cash_flows(
                investment.cash_flows, volatility_params
            )
            
            if not simulated_cash_flows:
                return {}
            
            # Calculate metrics for each simulation
            simulation_results = {}
            for metric in ROIMetric:
                simulation_results[metric] = []
            
            for sim_flows in simulated_cash_flows:
                sim_investment = Investment(
                    investment_id=f"{investment.investment_id}_sim",
                    name=investment.name,
                    description=investment.description,
                    initial_investment=investment.initial_investment,
                    cash_flows=sim_flows,
                    discount_rate=investment.discount_rate,
                    risk_level=investment.risk_level,
                    investment_type=investment.investment_type,
                    start_date=investment.start_date,
                    end_date=investment.end_date
                )
                
                sim_metrics = await self._calculate_base_metrics(sim_investment)
                for metric, value in sim_metrics.items():
                    simulation_results[metric].append(value)
            
            # Calculate confidence intervals (5th and 95th percentiles)
            confidence_intervals = {}
            for metric, values in simulation_results.items():
                if values:
                    stats = self.monte_carlo.calculate_simulation_statistics(values)
                    confidence_intervals[metric] = (
                        stats.get("percentile_5", 0.0),
                        stats.get("percentile_95", 0.0)
                    )
            
            return confidence_intervals
        except Exception as e:
            self.logger.error(f"Failed to perform Monte Carlo analysis: {e}")
            return {}
    
    async def _generate_recommendations(
        self,
        investment: Investment,
        base_metrics: Dict[ROIMetric, float],
        scenarios: Dict[ScenarioType, Dict[ROIMetric, float]],
        risk_assessment: Dict[str, float]
    ) -> List[str]:
        """Generate investment recommendations based on analysis."""
        try:
            recommendations = []
            
            # NPV-based recommendations
            npv = base_metrics.get(ROIMetric.NET_PRESENT_VALUE, 0.0)
            if npv > 0:
                recommendations.append(f"✅ Positive NPV of ${npv:,.2f} indicates value creation")
            else:
                recommendations.append(f"⚠️ Negative NPV of ${npv:,.2f} suggests value destruction")
            
            # IRR-based recommendations
            irr = base_metrics.get(ROIMetric.INTERNAL_RATE_RETURN, 0.0)
            if irr > investment.discount_rate:
                recommendations.append(f"✅ IRR of {irr:.2%} exceeds discount rate of {investment.discount_rate:.2%}")
            else:
                recommendations.append(f"⚠️ IRR of {irr:.2%} below discount rate - consider alternatives")
            
            # Payback period recommendations
            payback = base_metrics.get(ROIMetric.PAYBACK_PERIOD, float('inf'))
            if payback != float('inf'):
                if payback <= 2:
                    recommendations.append(f"✅ Quick payback period of {payback:.1f} years")
                elif payback <= 5:
                    recommendations.append(f"📊 Moderate payback period of {payback:.1f} years")
                else:
                    recommendations.append(f"⚠️ Long payback period of {payback:.1f} years increases risk")
            else:
                recommendations.append("❌ Investment may never pay back - high risk")
            
            # Risk-based recommendations
            composite_risk = risk_assessment.get("composite_risk", 0.5)
            if composite_risk < 0.3:
                recommendations.append("✅ Low risk profile suitable for conservative portfolios")
            elif composite_risk < 0.7:
                recommendations.append("📊 Moderate risk - ensure proper diversification")
            else:
                recommendations.append("⚠️ High risk investment - consider risk mitigation strategies")
            
            # Scenario analysis recommendations
            if scenarios:
                best_case_npv = scenarios.get(ScenarioType.BEST_CASE, {}).get(ROIMetric.NET_PRESENT_VALUE, 0)
                worst_case_npv = scenarios.get(ScenarioType.WORST_CASE, {}).get(ROIMetric.NET_PRESENT_VALUE, 0)
                
                if worst_case_npv > 0:
                    recommendations.append("✅ Positive NPV even in worst-case scenario")
                elif best_case_npv > npv * 2:
                    recommendations.append("📊 High upside potential but consider downside protection")
                
                if abs(worst_case_npv - best_case_npv) > abs(npv):
                    recommendations.append("⚠️ High scenario sensitivity - monitor key assumptions closely")
            
            # Profitability Index recommendations
            pi = base_metrics.get(ROIMetric.PROFITABILITY_INDEX, 0.0)
            if pi > 1.5:
                recommendations.append("✅ High profitability index indicates excellent value per dollar invested")
            elif pi > 1.0:
                recommendations.append("📊 Profitability index above 1.0 - creates value")
            else:
                recommendations.append("❌ Profitability index below 1.0 - destroys value")
            
            return recommendations
        except Exception as e:
            self.logger.error(f"Failed to generate recommendations: {e}")
            return ["⚠️ Unable to generate recommendations due to analysis error"]
    
    async def _get_or_calculate_analysis(self, investment: Investment) -> ROIAnalysis:
        """Get existing analysis or calculate new one."""
        try:
            # Look for existing analysis
            for analysis in self.analyses.values():
                if analysis.investment_id == investment.investment_id:
                    # Check if analysis is recent (within 1 hour)
                    if (datetime.utcnow() - analysis.calculated_at).total_seconds() < 3600:
                        return analysis
            
            # Calculate new analysis
            return await self.calculate_comprehensive_roi(investment)
        except Exception as e:
            self.logger.error(f"Failed to get or calculate analysis: {e}")
            raise
    
    async def _calculate_investment_rankings(
        self,
        comparison_data: Dict[str, Any],
        metrics: List[ROIMetric]
    ) -> Dict[str, Dict[str, int]]:
        """Calculate investment rankings across metrics."""
        try:
            rankings = {}
            
            for metric in metrics:
                # Extract values for this metric
                metric_values = []
                for inv_id, data in comparison_data.items():
                    value = data["metrics"].get(metric.value, 0.0)
                    metric_values.append((inv_id, value))
                
                # Sort by value (descending for most metrics)
                reverse_sort = metric != ROIMetric.PAYBACK_PERIOD  # Payback period: lower is better
                sorted_values = sorted(metric_values, key=lambda x: x[1], reverse=reverse_sort)
                
                # Assign rankings
                for rank, (inv_id, value) in enumerate(sorted_values, 1):
                    if inv_id not in rankings:
                        rankings[inv_id] = {}
                    rankings[inv_id][metric.value] = rank
            
            # Calculate overall ranking (average of all metric rankings)
            for inv_id in rankings:
                avg_rank = sum(rankings[inv_id].values()) / len(rankings[inv_id])
                rankings[inv_id]["overall"] = avg_rank
            
            return rankings
        except Exception as e:
            self.logger.error(f"Failed to calculate investment rankings: {e}")
            return {}
    
    async def _generate_comparison_insights(
        self,
        comparison_data: Dict[str, Any],
        rankings: Dict[str, Dict[str, int]]
    ) -> List[str]:
        """Generate insights from investment comparison."""
        try:
            insights = []
            
            if not comparison_data:
                return ["No investments to compare"]
            
            # Find best performing investment overall
            best_investment = min(rankings.items(), key=lambda x: x[1].get("overall", float('inf')))
            best_inv_id, best_rankings = best_investment
            best_inv_data = comparison_data[best_inv_id]
            
            insights.append(f"🏆 Top performer: {best_inv_data['name']} (Overall rank: {best_rankings['overall']:.1f})")
            
            # NPV insights
            npv_values = [(inv_id, data["metrics"].get("net_present_value", 0)) 
                         for inv_id, data in comparison_data.items()]
            npv_values.sort(key=lambda x: x[1], reverse=True)
            
            if npv_values:
                best_npv_id, best_npv = npv_values[0]
                best_npv_name = comparison_data[best_npv_id]["name"]
                insights.append(f"💰 Highest NPV: {best_npv_name} (${best_npv:,.2f})")
            
            # Risk insights
            risk_levels = defaultdict(list)
            for inv_id, data in comparison_data.items():
                risk_level = data["risk_level"]
                risk_levels[risk_level].append((inv_id, data["name"]))
            
            if risk_levels:
                insights.append(f"📊 Risk distribution: {dict([(k, len(v)) for k, v in risk_levels.items()])}")
            
            # Investment size insights
            investments_by_size = sorted(
                [(inv_id, data["initial_investment"], data["name"]) 
                 for inv_id, data in comparison_data.items()],
                key=lambda x: x[1], reverse=True
            )
            
            if investments_by_size:
                largest_inv = investments_by_size[0]
                smallest_inv = investments_by_size[-1]
                insights.append(f"💼 Investment range: ${smallest_inv[1]:,.0f} to ${largest_inv[1]:,.0f}")
            
            # ROI efficiency insights
            roi_efficiency = []
            for inv_id, data in comparison_data.items():
                npv = data["metrics"].get("net_present_value", 0)
                initial_investment = data["initial_investment"]
                if initial_investment > 0:
                    efficiency = npv / initial_investment
                    roi_efficiency.append((inv_id, efficiency, data["name"]))
            
            if roi_efficiency:
                roi_efficiency.sort(key=lambda x: x[1], reverse=True)
                most_efficient = roi_efficiency[0]
                insights.append(f"⚡ Most efficient: {most_efficient[2]} ({most_efficient[1]:.2f} NPV per $ invested)")
            
            return insights
        except Exception as e:
            self.logger.error(f"Failed to generate comparison insights: {e}")
            return ["Unable to generate insights due to analysis error"]
    
    async def _solve_portfolio_optimization(
        self,
        investments_data: List[Dict[str, Any]],
        budget_constraint: float,
        risk_tolerance: RiskLevel,
        optimization_objective: str
    ) -> Dict[str, Any]:
        """Solve portfolio optimization problem."""
        try:
            if not investments_data:
                return {"error": "No investments provided"}
            
            # Extract investment characteristics
            investment_costs = []
            investment_npvs = []
            investment_risks = []
            investment_names = []
            
            for inv_data in investments_data:
                investment = inv_data["investment"]
                analysis = inv_data["analysis"]
                
                investment_costs.append(investment.initial_investment)
                investment_npvs.append(analysis.metrics.get(ROIMetric.NET_PRESENT_VALUE, 0.0))
                investment_risks.append(analysis.risk_assessment.get("composite_risk", 0.5))
                investment_names.append(investment.name)
            
            # Convert to numpy arrays
            costs = np.array(investment_costs)
            npvs = np.array(investment_npvs)
            risks = np.array(investment_risks)
            
            # Risk tolerance mapping
            risk_tolerance_limits = {
                RiskLevel.VERY_LOW: 0.2,
                RiskLevel.LOW: 0.4,
                RiskLevel.MEDIUM: 0.6,
                RiskLevel.HIGH: 0.8,
                RiskLevel.VERY_HIGH: 1.0
            }
            max_risk = risk_tolerance_limits.get(risk_tolerance, 0.6)
            
            # Optimization using linear programming (simplified)
            n_investments = len(investments_data)
            
            if optimization_objective == "maximize_npv":
                # Maximize NPV subject to budget and risk constraints
                selected_investments = []
                remaining_budget = budget_constraint
                
                # Sort by NPV/cost ratio (efficiency)
                efficiency_ratios = []
                for i in range(n_investments):
                    if costs[i] > 0 and risks[i] <= max_risk:
                        efficiency = npvs[i] / costs[i]
                        efficiency_ratios.append((i, efficiency, costs[i], npvs[i]))
                
                # Sort by efficiency (descending)
                efficiency_ratios.sort(key=lambda x: x[1], reverse=True)
                
                # Greedy selection
                total_npv = 0.0
                total_cost = 0.0
                
                for i, efficiency, cost, npv in efficiency_ratios:
                    if cost <= remaining_budget:
                        selected_investments.append({
                            "investment_id": investments_data[i]["investment_id"],
                            "name": investment_names[i],
                            "cost": cost,
                            "npv": npv,
                            "efficiency": efficiency,
                            "risk": risks[i]
                        })
                        remaining_budget -= cost
                        total_npv += npv
                        total_cost += cost
                
                return {
                    "optimization_objective": optimization_objective,
                    "budget_constraint": budget_constraint,
                    "risk_tolerance": risk_tolerance.value,
                    "selected_investments": selected_investments,
                    "total_cost": total_cost,
                    "total_npv": total_npv,
                    "remaining_budget": remaining_budget,
                    "portfolio_efficiency": total_npv / total_cost if total_cost > 0 else 0.0,
                    "number_of_investments": len(selected_investments)
                }
            
            else:
                return {"error": f"Unsupported optimization objective: {optimization_objective}"}
        
        except Exception as e:
            self.logger.error(f"Failed to solve portfolio optimization: {e}")
            return {"error": str(e)}
    
    def _calculate_calculation_trend(self, recent_calculations: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Calculate trend in ROI calculations."""
        try:
            if len(recent_calculations) < 2:
                return {"trend": "insufficient_data"}
            
            # Sort by date
            sorted_calcs = sorted(recent_calculations, key=lambda x: x["calculated_at"])
            
            # Calculate daily calculation counts
            daily_counts = defaultdict(int)
            for calc in sorted_calcs:
                date_key = calc["calculated_at"].date()
                daily_counts[date_key] += 1
            
            # Calculate trend
            dates = sorted(daily_counts.keys())
            counts = [daily_counts[date] for date in dates]
            
            if len(counts) >= 2:
                # Simple linear regression
                x = np.arange(len(counts))
                slope = np.polyfit(x, counts, 1)[0]
                
                trend_direction = "increasing" if slope > 0.1 else "decreasing" if slope < -0.1 else "stable"
                
                return {
                    "trend": trend_direction,
                    "slope": slope,
                    "average_daily_calculations": np.mean(counts),
                    "peak_day": dates[np.argmax(counts)].isoformat(),
                    "peak_count": max(counts)
                }
            
            return {"trend": "stable", "average_daily_calculations": np.mean(counts)}
        except Exception as e:
            self.logger.error(f"Failed to calculate calculation trend: {e}")
            return {"trend": "error"}
    
    def _calculate_performance_improvement(self) -> Dict[str, float]:
        """Calculate performance improvement metrics."""
        try:
            if len(self.calculation_history) < 10:
                return {"improvement": "insufficient_data"}
            
            # Compare recent vs older calculations
            recent_calcs = list(self.calculation_history)[-50:]  # Last 50 calculations
            older_calcs = list(self.calculation_history)[-100:-50]  # Previous 50 calculations
            
            if not older_calcs:
                return {"improvement": "insufficient_historical_data"}
            
            # Calculate average NPV improvement
            recent_npvs = [
                calc["metrics"].get(ROIMetric.NET_PRESENT_VALUE, 0) 
                for calc in recent_calcs
                if calc["metrics"].get(ROIMetric.NET_PRESENT_VALUE) is not None
            ]
            
            older_npvs = [
                calc["metrics"].get(ROIMetric.NET_PRESENT_VALUE, 0) 
                for calc in older_calcs
                if calc["metrics"].get(ROIMetric.NET_PRESENT_VALUE) is not None
            ]
            
            if recent_npvs and older_npvs:
                recent_avg_npv = np.mean(recent_npvs)
                older_avg_npv = np.mean(older_npvs)
                
                npv_improvement = ((recent_avg_npv - older_avg_npv) / abs(older_avg_npv)) * 100 if older_avg_npv != 0 else 0
                
                return {
                    "npv_improvement_percent": npv_improvement,
                    "recent_average_npv": recent_avg_npv,
                    "historical_average_npv": older_avg_npv,
                    "sample_size_recent": len(recent_npvs),
                    "sample_size_historical": len(older_npvs)
                }
            
            return {"improvement": "insufficient_npv_data"}
        except Exception as e:
            self.logger.error(f"Failed to calculate performance improvement: {e}")
            return {"improvement": "error"}
    
    async def _performance_monitor(self) -> None:
        """Background task to monitor ROI calculation performance."""
        try:
            while self.system_active:
                await asyncio.sleep(300)  # Check every 5 minutes
                
                # Monitor calculation frequency
                recent_calcs = [
                    calc for calc in self.calculation_history
                    if (datetime.utcnow() - calc["calculated_at"]).total_seconds() < 3600
                ]
                
                self.performance_metrics["calculations_per_hour"].append(len(recent_calcs))
                
                # Monitor average calculation time (would need to be tracked)
                # Monitor memory usage, etc.
                
                # Keep only recent performance data
                if len(self.performance_metrics["calculations_per_hour"]) > 288:  # 24 hours of 5-min intervals
                    self.performance_metrics["calculations_per_hour"] = \
                        self.performance_metrics["calculations_per_hour"][-288:]
        
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Performance monitor error: {e}")
    
    async def _model_updater(self) -> None:
        """Background task to update calculation models and parameters."""
        try:
            while self.system_active:
                await asyncio.sleep(3600)  # Check every hour
                
                # Update risk-free rate (would fetch from external source)
                # Update market risk premiums
                # Retrain ML models if applicable
                # Update scenario parameters based on market conditions
                
                self.logger.info("Model parameters updated")
        
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Model updater error: {e}")


# Example usage and testing
async def main():
    """Example usage of the Advanced ROI Calculator."""
    calculator = AdvancedROICalculator()
    
    try:
        await calculator.initialize()
        
        # Create sample investment
        sample_investment = Investment(
            investment_id="acso_security_upgrade_2024",
            name="ACSO Security Platform Upgrade",
            description="Investment in advanced threat detection and automated response capabilities",
            initial_investment=750000.0,
            cash_flows=[
                CashFlow(1, datetime.utcnow() + timedelta(days=90), 200000, 75000, 125000, "Q1 Revenue Increase", "revenue"),
                CashFlow(2, datetime.utcnow() + timedelta(days=180), 275000, 85000, 190000, "Q2 Revenue Increase", "revenue"),
                CashFlow(3, datetime.utcnow() + timedelta(days=270), 350000, 95000, 255000, "Q3 Revenue Increase", "revenue"),
                CashFlow(4, datetime.utcnow() + timedelta(days=360), 425000, 105000, 320000, "Q4 Revenue Increase", "revenue"),
                CashFlow(5, datetime.utcnow() + timedelta(days=450), 500000, 115000, 385000, "Year 2 Revenue", "revenue")
            ],
            discount_rate=0.12,  # 12% discount rate
            risk_level=RiskLevel.MEDIUM,
            investment_type="security_enhancement",
            start_date=datetime.utcnow(),
            end_date=datetime.utcnow() + timedelta(days=730)
        )
        
        # Calculate comprehensive ROI analysis
        print("Calculating comprehensive ROI analysis...")
        analysis = await calculator.calculate_comprehensive_roi(
            sample_investment,
            include_scenarios=True,
            include_sensitivity=True,
            include_monte_carlo=True
        )
        
        # Display results
        print(f"\n=== ROI Analysis Results for {sample_investment.name} ===")
        print(f"Analysis ID: {analysis.analysis_id}")
        print(f"Calculated at: {analysis.calculated_at}")
        
        print(f"\n--- Base Metrics ---")
        for metric, value in analysis.metrics.items():
            if metric == ROIMetric.NET_PRESENT_VALUE:
                print(f"NPV: ${value:,.2f}")
            elif metric == ROIMetric.INTERNAL_RATE_RETURN:
                print(f"IRR: {value:.2%}")
            elif metric == ROIMetric.PAYBACK_PERIOD:
                if value != float('inf'):
                    print(f"Payback Period: {value:.1f} years")
                else:
                    print("Payback Period: Never")
            elif metric == ROIMetric.PROFITABILITY_INDEX:
                print(f"Profitability Index: {value:.2f}")
            elif metric == ROIMetric.RETURN_ON_INVESTMENT:
                print(f"ROI: {value:.2%}")
        
        print(f"\n--- Risk Assessment ---")
        for risk_type, score in analysis.risk_assessment.items():
            print(f"{risk_type.replace('_', ' ').title()}: {score:.2f}")
        
        print(f"\n--- Recommendations ---")
        for i, recommendation in enumerate(analysis.recommendations, 1):
            print(f"{i}. {recommendation}")
        
        print(f"\n--- Scenario Analysis ---")
        for scenario_type, metrics in analysis.scenarios.items():
            npv = metrics.get(ROIMetric.NET_PRESENT_VALUE, 0)
            irr = metrics.get(ROIMetric.INTERNAL_RATE_RETURN, 0)
            print(f"{scenario_type.value}: NPV=${npv:,.2f}, IRR={irr:.2%}")
        
        # Test portfolio optimization
        print(f"\n=== Portfolio Optimization ===")
        portfolio_result = await calculator.optimize_portfolio(
            [sample_investment.investment_id],
            budget_constraint=1000000.0,
            risk_tolerance=RiskLevel.MEDIUM,
            optimization_objective="maximize_npv"
        )
        
        if "error" not in portfolio_result:
            print(f"Selected investments: {len(portfolio_result['selected_investments'])}")
            print(f"Total cost: ${portfolio_result['total_cost']:,.2f}")
            print(f"Total NPV: ${portfolio_result['total_npv']:,.2f}")
            print(f"Portfolio efficiency: {portfolio_result['portfolio_efficiency']:.2f}")
        
        # Get analytics
        print(f"\n=== ROI Analytics ===")
        analytics = await calculator.get_roi_analytics(time_period_days=30)
        if "error" not in analytics:
            print(f"Total calculations: {analytics['overview']['total_calculations']}")
            print(f"Unique investments: {analytics['overview']['unique_investments']}")
            print(f"Calculation frequency: {analytics['overview']['calculation_frequency']:.2f} per day")
        
    except Exception as e:
        print(f"Error in ROI calculation example: {e}")
    
    finally:
        await calculator.shutdown()


if __name__ == "__main__":
    asyncio.run(main())