"""
Intelligent Financial Agent for ACSO Phase 5 Agentic Demonstrations.

This module enhances the Financial Intelligence Agent with advanced ML capabilities
for predictive cost modeling, optimization strategy generation, and intelligent
recommendation ranking and prioritization.
"""

import asyncio
import random
import uuid
import numpy as np
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from dataclasses import dataclass, field
import json
import logging

from ..scenarios.intelligent_cost_optimization_engine import (
    intelligent_cost_optimization_engine,
    CostOptimizationOpportunity,
    OptimizationScenario,
    OptimizationType,
    RiskLevel
)

logger = logging.getLogger(__name__)


class PredictionConfidence(str, Enum):
    """Confidence levels for predictions."""
    VERY_LOW = "very_low"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class RecommendationStrategy(str, Enum):
    """Recommendation strategies."""
    CONSERVATIVE = "conservative"
    BALANCED = "balanced"
    AGGRESSIVE = "aggressive"
    RISK_AVERSE = "risk_averse"
    ROI_FOCUSED = "roi_focused"


@dataclass
class CostPrediction:
    """Represents a cost prediction."""
    prediction_id: str
    prediction_type: str
    time_horizon_months: int
    predicted_cost: float
    confidence_level: PredictionConfidence
    confidence_score: float
    prediction_factors: List[str]
    assumptions: List[str]
    risk_factors: List[str]
    created_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "prediction_id": self.prediction_id,
            "prediction_type": self.prediction_type,
            "time_horizon_months": self.time_horizon_months,
            "predicted_cost": self.predicted_cost,
            "confidence_level": self.confidence_level.value,
            "confidence_score": self.confidence_score,
            "prediction_factors": self.prediction_factors,
            "assumptions": self.assumptions,
            "risk_factors": self.risk_factors,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata
        }


@dataclass
class OptimizationStrategy:
    """Represents an optimization strategy."""
    strategy_id: str
    name: str
    description: str
    strategy_type: RecommendationStrategy
    target_savings_percentage: float
    implementation_timeline_months: int
    risk_tolerance: RiskLevel
    priority_opportunities: List[str]  # Opportunity IDs
    implementation_phases: List[Dict[str, Any]]
    success_probability: float
    expected_roi: float
    created_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "strategy_id": self.strategy_id,
            "name": self.name,
            "description": self.description,
            "strategy_type": self.strategy_type.value,
            "target_savings_percentage": self.target_savings_percentage,
            "implementation_timeline_months": self.implementation_timeline_months,
            "risk_tolerance": self.risk_tolerance.value,
            "priority_opportunities": self.priority_opportunities,
            "implementation_phases": self.implementation_phases,
            "success_probability": self.success_probability,
            "expected_roi": self.expected_roi,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata
        }


@dataclass
class IntelligentRecommendation:
    """Represents an intelligent recommendation."""
    recommendation_id: str
    title: str
    description: str
    recommendation_type: str
    priority_score: float
    confidence_score: float
    expected_impact: Dict[str, Any]
    implementation_effort: str
    risk_assessment: Dict[str, Any]
    supporting_data: Dict[str, Any]
    next_steps: List[str]
    success_metrics: List[str]
    created_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)
    
    def to_dict(self) -> Dict[str, Any]:
        return {
            "recommendation_id": self.recommendation_id,
            "title": self.title,
            "description": self.description,
            "recommendation_type": self.recommendation_type,
            "priority_score": self.priority_score,
            "confidence_score": self.confidence_score,
            "expected_impact": self.expected_impact,
            "implementation_effort": self.implementation_effort,
            "risk_assessment": self.risk_assessment,
            "supporting_data": self.supporting_data,
            "next_steps": self.next_steps,
            "success_metrics": self.success_metrics,
            "created_at": self.created_at.isoformat(),
            "metadata": self.metadata
        }


class IntelligentFinancialAgent:
    """
    Enhanced Financial Intelligence Agent with ML capabilities.
    
    This agent provides:
    - Predictive cost modeling and forecasting
    - Intelligent optimization strategy generation
    - Advanced recommendation ranking and prioritization
    - Risk-aware decision making
    - Continuous learning from outcomes
    """
    
    def __init__(self):
        self.agent_id = str(uuid.uuid4())
        self.agent_name = "Intelligent Financial Agent"
        self.version = "2.0.0"
        
        # ML Model placeholders (in real implementation, would load actual models)
        self.cost_prediction_model = self._initialize_cost_prediction_model()
        self.optimization_model = self._initialize_optimization_model()
        self.risk_assessment_model = self._initialize_risk_assessment_model()
        
        # Learning and adaptation
        self.historical_predictions = []
        self.recommendation_outcomes = []
        self.model_performance_metrics = {}
        
        # Configuration
        self.config = {
            "prediction_confidence_threshold": 0.7,
            "recommendation_priority_threshold": 0.6,
            "risk_tolerance_default": "medium",
            "learning_rate": 0.01,
            "model_update_frequency_days": 7
        }
        
    def _initialize_cost_prediction_model(self) -> Dict[str, Any]:
        """Initialize cost prediction model (placeholder)."""
        return {
            "model_type": "ensemble",
            "features": [
                "historical_spend",
                "growth_rate",
                "seasonality",
                "business_metrics",
                "market_conditions"
            ],
            "accuracy": 0.85,
            "last_trained": datetime.utcnow()
        }
        
    def _initialize_optimization_model(self) -> Dict[str, Any]:
        """Initialize optimization model (placeholder)."""
        return {
            "model_type": "multi_objective_optimization",
            "objectives": ["cost_reduction", "risk_minimization", "roi_maximization"],
            "constraints": ["budget_limits", "resource_constraints", "compliance_requirements"],
            "accuracy": 0.78,
            "last_trained": datetime.utcnow()
        }
        
    def _initialize_risk_assessment_model(self) -> Dict[str, Any]:
        """Initialize risk assessment model (placeholder)."""
        return {
            "model_type": "risk_classification",
            "risk_factors": [
                "implementation_complexity",
                "business_impact",
                "technical_dependencies",
                "vendor_relationships"
            ],
            "accuracy": 0.82,
            "last_trained": datetime.utcnow()
        }
        
    async def generate_cost_predictions(self, scenario_data: Dict[str, Any]) -> List[CostPrediction]:
        """Generate predictive cost models and forecasts."""
        predictions = []
        
        current_monthly_spend = scenario_data.get("current_monthly_spend", 50000)
        organization_type = scenario_data.get("organization_type", "smb")
        
        # Generate predictions for different time horizons
        time_horizons = [3, 6, 12, 24, 36]
        
        for months in time_horizons:
            prediction = await self._generate_single_prediction(
                current_monthly_spend, organization_type, months
            )
            predictions.append(prediction)
            
        logger.info(f"Generated {len(predictions)} cost predictions")
        return predictions
        
    async def _generate_single_prediction(self, current_spend: float, org_type: str, 
                                        months: int) -> CostPrediction:
        """Generate a single cost prediction."""
        # Simulate ML model prediction with realistic factors
        base_growth_rate = self._get_base_growth_rate(org_type)
        seasonality_factor = self._calculate_seasonality_factor(months)
        market_factor = random.uniform(0.95, 1.08)
        
        # Calculate predicted cost
        monthly_growth = base_growth_rate / 12
        predicted_cost = current_spend * ((1 + monthly_growth) ** months) * seasonality_factor * market_factor
        
        # Determine confidence based on time horizon and factors
        confidence_score = max(0.5, 0.95 - (months / 48))  # Decreases with time
        confidence_level = self._determine_confidence_level(confidence_score)
        
        return CostPrediction(
            prediction_id=str(uuid.uuid4()),
            prediction_type=f"{months}_month_forecast",
            time_horizon_months=months,
            predicted_cost=predicted_cost,
            confidence_level=confidence_level,
            confidence_score=confidence_score,
            prediction_factors=[
                f"Base growth rate: {base_growth_rate:.1%}",
                f"Seasonality adjustment: {seasonality_factor:.2f}",
                f"Market conditions: {market_factor:.2f}",
                "Historical spending patterns",
                "Business growth projections"
            ],
            assumptions=[
                "Current business model remains stable",
                "No major architectural changes",
                "Market conditions remain relatively stable",
                "No significant regulatory changes"
            ],
            risk_factors=[
                "Unexpected business growth or contraction",
                "Major technology shifts",
                "Economic market volatility",
                "Regulatory compliance changes"
            ],
            created_at=datetime.utcnow(),
            metadata={
                "model_version": self.cost_prediction_model["accuracy"],
                "organization_type": org_type,
                "base_monthly_spend": current_spend
            }
        )
        
    def _get_base_growth_rate(self, org_type: str) -> float:
        """Get base growth rate by organization type."""
        growth_rates = {
            "startup": random.uniform(0.15, 0.35),
            "smb": random.uniform(0.08, 0.18),
            "enterprise": random.uniform(0.05, 0.12),
            "large_enterprise": random.uniform(0.03, 0.08)
        }
        return growth_rates.get(org_type, 0.10)
        
    def _calculate_seasonality_factor(self, months: int) -> float:
        """Calculate seasonality factor based on time horizon."""
        # Simulate seasonal variations (higher costs in Q4, lower in Q1)
        current_month = datetime.utcnow().month
        target_month = (current_month + months - 1) % 12 + 1
        
        seasonal_factors = {
            1: 0.92, 2: 0.95, 3: 0.98, 4: 1.02,
            5: 1.00, 6: 1.01, 7: 0.99, 8: 1.00,
            9: 1.03, 10: 1.05, 11: 1.08, 12: 1.12
        }
        
        return seasonal_factors.get(target_month, 1.0)
        
    def _determine_confidence_level(self, score: float) -> PredictionConfidence:
        """Determine confidence level from score."""
        if score >= 0.9:
            return PredictionConfidence.VERY_HIGH
        elif score >= 0.8:
            return PredictionConfidence.HIGH
        elif score >= 0.6:
            return PredictionConfidence.MEDIUM
        elif score >= 0.4:
            return PredictionConfidence.LOW
        else:
            return PredictionConfidence.VERY_LOW
            
    async def generate_optimization_strategies(self, scenario: OptimizationScenario, 
                                             preferences: Dict[str, Any] = None) -> List[OptimizationStrategy]:
        """Generate intelligent optimization strategies."""
        if preferences is None:
            preferences = {}
            
        strategies = []
        
        # Generate different strategy types
        strategy_types = [
            RecommendationStrategy.CONSERVATIVE,
            RecommendationStrategy.BALANCED,
            RecommendationStrategy.AGGRESSIVE,
            RecommendationStrategy.ROI_FOCUSED
        ]
        
        for strategy_type in strategy_types:
            strategy = await self._generate_single_strategy(scenario, strategy_type, preferences)
            strategies.append(strategy)
            
        # Sort by expected ROI
        strategies.sort(key=lambda s: s.expected_roi, reverse=True)
        
        logger.info(f"Generated {len(strategies)} optimization strategies")
        return strategies
        
    async def _generate_single_strategy(self, scenario: OptimizationScenario, 
                                      strategy_type: RecommendationStrategy,
                                      preferences: Dict[str, Any]) -> OptimizationStrategy:
        """Generate a single optimization strategy."""
        # Filter opportunities based on strategy type
        filtered_opportunities = self._filter_opportunities_by_strategy(
            scenario.opportunities, strategy_type
        )
        
        # Calculate strategy metrics
        total_savings = sum(opp.potential_monthly_savings for opp in filtered_opportunities)
        total_implementation_cost = sum(opp.implementation_cost for opp in filtered_opportunities)
        
        target_savings_percentage = (total_savings / scenario.current_monthly_spend) * 100
        expected_roi = (total_savings * 12 - total_implementation_cost) / total_implementation_cost * 100 if total_implementation_cost > 0 else 0
        
        # Determine implementation timeline
        timeline_months = self._calculate_implementation_timeline(filtered_opportunities, strategy_type)
        
        # Calculate success probability
        success_probability = self._calculate_success_probability(filtered_opportunities, strategy_type)
        
        # Create implementation phases
        implementation_phases = self._create_implementation_phases(filtered_opportunities, timeline_months)
        
        return OptimizationStrategy(
            strategy_id=str(uuid.uuid4()),
            name=self._get_strategy_name(strategy_type),
            description=self._get_strategy_description(strategy_type, target_savings_percentage),
            strategy_type=strategy_type,
            target_savings_percentage=target_savings_percentage,
            implementation_timeline_months=timeline_months,
            risk_tolerance=self._get_strategy_risk_tolerance(strategy_type),
            priority_opportunities=[opp.opportunity_id for opp in filtered_opportunities],
            implementation_phases=implementation_phases,
            success_probability=success_probability,
            expected_roi=expected_roi,
            created_at=datetime.utcnow(),
            metadata={
                "opportunities_count": len(filtered_opportunities),
                "total_monthly_savings": total_savings,
                "total_implementation_cost": total_implementation_cost,
                "average_payback_months": np.mean([opp.payback_period_months for opp in filtered_opportunities])
            }
        )
        
    def _filter_opportunities_by_strategy(self, opportunities: List[CostOptimizationOpportunity], 
                                        strategy_type: RecommendationStrategy) -> List[CostOptimizationOpportunity]:
        """Filter opportunities based on strategy type."""
        if strategy_type == RecommendationStrategy.CONSERVATIVE:
            return [opp for opp in opportunities if opp.risk_level in [RiskLevel.LOW, RiskLevel.MEDIUM] and opp.confidence_score >= 0.8]
        elif strategy_type == RecommendationStrategy.BALANCED:
            return [opp for opp in opportunities if opp.confidence_score >= 0.7]
        elif strategy_type == RecommendationStrategy.AGGRESSIVE:
            return opportunities  # Include all opportunities
        elif strategy_type == RecommendationStrategy.ROI_FOCUSED:
            return sorted(opportunities, key=lambda opp: opp.annual_roi_percentage, reverse=True)[:6]
        else:
            return opportunities
            
    def _get_strategy_name(self, strategy_type: RecommendationStrategy) -> str:
        """Get strategy name."""
        names = {
            RecommendationStrategy.CONSERVATIVE: "Conservative Cost Optimization",
            RecommendationStrategy.BALANCED: "Balanced Optimization Approach",
            RecommendationStrategy.AGGRESSIVE: "Aggressive Cost Reduction",
            RecommendationStrategy.ROI_FOCUSED: "ROI-Maximized Strategy"
        }
        return names.get(strategy_type, "Custom Strategy")
        
    def _get_strategy_description(self, strategy_type: RecommendationStrategy, savings_percentage: float) -> str:
        """Get strategy description."""
        descriptions = {
            RecommendationStrategy.CONSERVATIVE: f"Low-risk approach targeting {savings_percentage:.1f}% cost reduction with high confidence implementations",
            RecommendationStrategy.BALANCED: f"Balanced risk-reward strategy aiming for {savings_percentage:.1f}% savings with moderate implementation complexity",
            RecommendationStrategy.AGGRESSIVE: f"High-impact strategy pursuing {savings_percentage:.1f}% cost reduction through comprehensive optimization",
            RecommendationStrategy.ROI_FOCUSED: f"ROI-optimized approach targeting {savings_percentage:.1f}% savings with maximum return on investment"
        }
        return descriptions.get(strategy_type, f"Custom strategy targeting {savings_percentage:.1f}% cost reduction")
        
    def _get_strategy_risk_tolerance(self, strategy_type: RecommendationStrategy) -> RiskLevel:
        """Get risk tolerance for strategy type."""
        risk_levels = {
            RecommendationStrategy.CONSERVATIVE: RiskLevel.LOW,
            RecommendationStrategy.BALANCED: RiskLevel.MEDIUM,
            RecommendationStrategy.AGGRESSIVE: RiskLevel.HIGH,
            RecommendationStrategy.ROI_FOCUSED: RiskLevel.MEDIUM
        }
        return risk_levels.get(strategy_type, RiskLevel.MEDIUM)
        
    def _calculate_implementation_timeline(self, opportunities: List[CostOptimizationOpportunity], 
                                         strategy_type: RecommendationStrategy) -> int:
        """Calculate implementation timeline."""
        if not opportunities:
            return 6
            
        avg_payback = np.mean([opp.payback_period_months for opp in opportunities])
        
        # Adjust based on strategy type
        multipliers = {
            RecommendationStrategy.CONSERVATIVE: 1.5,
            RecommendationStrategy.BALANCED: 1.2,
            RecommendationStrategy.AGGRESSIVE: 0.8,
            RecommendationStrategy.ROI_FOCUSED: 1.0
        }
        
        multiplier = multipliers.get(strategy_type, 1.0)
        return max(3, int(avg_payback * multiplier))
        
    def _calculate_success_probability(self, opportunities: List[CostOptimizationOpportunity], 
                                     strategy_type: RecommendationStrategy) -> float:
        """Calculate strategy success probability."""
        if not opportunities:
            return 0.5
            
        avg_confidence = np.mean([opp.confidence_score for opp in opportunities])
        
        # Adjust based on strategy complexity
        complexity_penalties = {
            RecommendationStrategy.CONSERVATIVE: 0.0,
            RecommendationStrategy.BALANCED: 0.05,
            RecommendationStrategy.AGGRESSIVE: 0.15,
            RecommendationStrategy.ROI_FOCUSED: 0.08
        }
        
        penalty = complexity_penalties.get(strategy_type, 0.1)
        return max(0.3, avg_confidence - penalty)
        
    def _create_implementation_phases(self, opportunities: List[CostOptimizationOpportunity], 
                                    timeline_months: int) -> List[Dict[str, Any]]:
        """Create implementation phases."""
        if not opportunities:
            return []
            
        # Sort opportunities by priority (ROI and confidence)
        sorted_opps = sorted(opportunities, 
                           key=lambda opp: opp.annual_roi_percentage * opp.confidence_score, 
                           reverse=True)
        
        # Divide into phases
        num_phases = min(4, max(2, timeline_months // 3))
        opps_per_phase = len(sorted_opps) // num_phases
        
        phases = []
        for i in range(num_phases):
            start_idx = i * opps_per_phase
            end_idx = start_idx + opps_per_phase if i < num_phases - 1 else len(sorted_opps)
            phase_opps = sorted_opps[start_idx:end_idx]
            
            phase_duration = timeline_months // num_phases
            phase_savings = sum(opp.potential_monthly_savings for opp in phase_opps)
            
            phases.append({
                "phase_number": i + 1,
                "name": f"Phase {i + 1}: {'Quick Wins' if i == 0 else 'Strategic Implementations' if i == num_phases - 1 else 'Core Optimizations'}",
                "duration_months": phase_duration,
                "opportunities": [opp.opportunity_id for opp in phase_opps],
                "expected_monthly_savings": phase_savings,
                "key_activities": self._get_phase_activities(phase_opps),
                "success_criteria": self._get_phase_success_criteria(phase_opps)
            })
            
        return phases
        
    def _get_phase_activities(self, opportunities: List[CostOptimizationOpportunity]) -> List[str]:
        """Get key activities for a phase."""
        activities = []
        for opp in opportunities[:3]:  # Top 3 opportunities
            activities.extend(opp.implementation_steps[:2])  # First 2 steps
        return list(set(activities))[:5]  # Unique, max 5
        
    def _get_phase_success_criteria(self, opportunities: List[CostOptimizationOpportunity]) -> List[str]:
        """Get success criteria for a phase."""
        criteria = []
        for opp in opportunities:
            criteria.extend(opp.success_metrics[:1])  # First metric
        return list(set(criteria))[:3]  # Unique, max 3
        
    async def generate_intelligent_recommendations(self, scenario: OptimizationScenario, 
                                                 strategies: List[OptimizationStrategy],
                                                 context: Dict[str, Any] = None) -> List[IntelligentRecommendation]:
        """Generate intelligent recommendations with advanced ranking."""
        if context is None:
            context = {}
            
        recommendations = []
        
        # Generate strategy recommendations
        for strategy in strategies:
            rec = await self._create_strategy_recommendation(strategy, scenario, context)
            recommendations.append(rec)
            
        # Generate opportunity-specific recommendations
        top_opportunities = sorted(scenario.opportunities, 
                                 key=lambda opp: opp.annual_roi_percentage * opp.confidence_score, 
                                 reverse=True)[:5]
        
        for opp in top_opportunities:
            rec = await self._create_opportunity_recommendation(opp, scenario, context)
            recommendations.append(rec)
            
        # Generate meta-recommendations
        meta_recs = await self._generate_meta_recommendations(scenario, strategies, context)
        recommendations.extend(meta_recs)
        
        # Sort by priority score
        recommendations.sort(key=lambda r: r.priority_score, reverse=True)
        
        logger.info(f"Generated {len(recommendations)} intelligent recommendations")
        return recommendations
        
    async def _create_strategy_recommendation(self, strategy: OptimizationStrategy, 
                                            scenario: OptimizationScenario,
                                            context: Dict[str, Any]) -> IntelligentRecommendation:
        """Create recommendation for a strategy."""
        priority_score = self._calculate_strategy_priority(strategy, context)
        
        return IntelligentRecommendation(
            recommendation_id=str(uuid.uuid4()),
            title=f"Implement {strategy.name}",
            description=f"Execute {strategy.name.lower()} to achieve {strategy.target_savings_percentage:.1f}% cost reduction",
            recommendation_type="strategy",
            priority_score=priority_score,
            confidence_score=strategy.success_probability,
            expected_impact={
                "monthly_savings": strategy.metadata.get("total_monthly_savings", 0),
                "annual_savings": strategy.metadata.get("total_monthly_savings", 0) * 12,
                "roi_percentage": strategy.expected_roi,
                "payback_months": strategy.metadata.get("average_payback_months", 0)
            },
            implementation_effort=self._determine_implementation_effort(strategy),
            risk_assessment={
                "risk_level": strategy.risk_tolerance.value,
                "success_probability": strategy.success_probability,
                "key_risks": self._identify_strategy_risks(strategy)
            },
            supporting_data={
                "opportunities_included": len(strategy.priority_opportunities),
                "implementation_phases": len(strategy.implementation_phases),
                "timeline_months": strategy.implementation_timeline_months
            },
            next_steps=[
                "Review and approve strategy",
                "Allocate implementation resources",
                "Begin Phase 1 execution",
                "Establish monitoring and tracking"
            ],
            success_metrics=[
                "Monthly cost reduction achieved",
                "Implementation timeline adherence",
                "ROI target achievement",
                "Risk mitigation effectiveness"
            ],
            created_at=datetime.utcnow(),
            metadata={
                "strategy_id": strategy.strategy_id,
                "strategy_type": strategy.strategy_type.value
            }
        )
        
    async def _create_opportunity_recommendation(self, opportunity: CostOptimizationOpportunity, 
                                               scenario: OptimizationScenario,
                                               context: Dict[str, Any]) -> IntelligentRecommendation:
        """Create recommendation for a specific opportunity."""
        priority_score = self._calculate_opportunity_priority(opportunity, context)
        
        return IntelligentRecommendation(
            recommendation_id=str(uuid.uuid4()),
            title=f"Priority Implementation: {opportunity.title}",
            description=opportunity.description,
            recommendation_type="opportunity",
            priority_score=priority_score,
            confidence_score=opportunity.confidence_score,
            expected_impact={
                "monthly_savings": opportunity.potential_monthly_savings,
                "annual_savings": opportunity.potential_monthly_savings * 12,
                "roi_percentage": opportunity.annual_roi_percentage,
                "payback_months": opportunity.payback_period_months
            },
            implementation_effort=opportunity.implementation_complexity.value,
            risk_assessment={
                "risk_level": opportunity.risk_level.value,
                "business_impact": opportunity.business_impact,
                "technical_requirements": opportunity.technical_requirements
            },
            supporting_data={
                "current_monthly_cost": opportunity.current_monthly_cost,
                "implementation_cost": opportunity.implementation_cost,
                "affected_services": opportunity.affected_services
            },
            next_steps=opportunity.implementation_steps[:3],
            success_metrics=opportunity.success_metrics,
            created_at=datetime.utcnow(),
            metadata={
                "opportunity_id": opportunity.opportunity_id,
                "optimization_type": opportunity.optimization_type.value
            }
        )
        
    async def _generate_meta_recommendations(self, scenario: OptimizationScenario, 
                                           strategies: List[OptimizationStrategy],
                                           context: Dict[str, Any]) -> List[IntelligentRecommendation]:
        """Generate meta-recommendations about the optimization process."""
        meta_recs = []
        
        # Recommendation about timing
        timing_rec = IntelligentRecommendation(
            recommendation_id=str(uuid.uuid4()),
            title="Optimal Implementation Timing",
            description="Begin cost optimization implementation during low-activity periods to minimize business impact",
            recommendation_type="timing",
            priority_score=0.75,
            confidence_score=0.85,
            expected_impact={
                "risk_reduction": "30-40%",
                "implementation_success_rate": "85-95%",
                "business_disruption": "Minimal"
            },
            implementation_effort="low",
            risk_assessment={
                "risk_level": "low",
                "key_considerations": ["Business calendar alignment", "Resource availability", "Change management"]
            },
            supporting_data={
                "optimal_start_months": ["January", "July", "September"],
                "avoid_months": ["November", "December", "March"]
            },
            next_steps=[
                "Review business calendar",
                "Identify low-activity periods",
                "Plan implementation schedule"
            ],
            success_metrics=[
                "Implementation timeline adherence",
                "Business disruption incidents",
                "Stakeholder satisfaction"
            ],
            created_at=datetime.utcnow()
        )
        meta_recs.append(timing_rec)
        
        # Recommendation about monitoring
        monitoring_rec = IntelligentRecommendation(
            recommendation_id=str(uuid.uuid4()),
            title="Enhanced Cost Monitoring Setup",
            description="Implement comprehensive cost monitoring before optimization to track progress and identify new opportunities",
            recommendation_type="monitoring",
            priority_score=0.80,
            confidence_score=0.90,
            expected_impact={
                "visibility_improvement": "90%+",
                "optimization_effectiveness": "25-35% increase",
                "ongoing_savings_identification": "Continuous"
            },
            implementation_effort="moderate",
            risk_assessment={
                "risk_level": "low",
                "key_benefits": ["Real-time tracking", "Anomaly detection", "Trend analysis"]
            },
            supporting_data={
                "monitoring_tools": ["CloudWatch", "Cost Explorer", "Third-party solutions"],
                "key_metrics": ["Daily spend", "Service utilization", "Optimization opportunities"]
            },
            next_steps=[
                "Select monitoring tools",
                "Configure dashboards",
                "Set up alerting",
                "Train team on monitoring"
            ],
            success_metrics=[
                "Monitoring coverage percentage",
                "Alert accuracy rate",
                "Time to identify new opportunities"
            ],
            created_at=datetime.utcnow()
        )
        meta_recs.append(monitoring_rec)
        
        return meta_recs
        
    def _calculate_strategy_priority(self, strategy: OptimizationStrategy, context: Dict[str, Any]) -> float:
        """Calculate priority score for a strategy."""
        # Base score from ROI and success probability
        base_score = (strategy.expected_roi / 100) * strategy.success_probability
        
        # Adjust for context preferences
        risk_preference = context.get("risk_tolerance", "medium")
        timeline_preference = context.get("timeline_preference", "balanced")
        
        # Risk adjustment
        risk_adjustments = {
            ("low", RiskLevel.LOW): 0.1,
            ("low", RiskLevel.MEDIUM): -0.05,
            ("low", RiskLevel.HIGH): -0.2,
            ("medium", RiskLevel.LOW): 0.05,
            ("medium", RiskLevel.MEDIUM): 0.0,
            ("medium", RiskLevel.HIGH): -0.1,
            ("high", RiskLevel.LOW): -0.05,
            ("high", RiskLevel.MEDIUM): 0.05,
            ("high", RiskLevel.HIGH): 0.1
        }
        
        risk_adj = risk_adjustments.get((risk_preference, strategy.risk_tolerance), 0.0)
        
        # Timeline adjustment
        timeline_adj = 0.0
        if timeline_preference == "fast" and strategy.implementation_timeline_months <= 6:
            timeline_adj = 0.1
        elif timeline_preference == "thorough" and strategy.implementation_timeline_months >= 12:
            timeline_adj = 0.1
            
        return max(0.0, min(1.0, base_score + risk_adj + timeline_adj))
        
    def _calculate_opportunity_priority(self, opportunity: CostOptimizationOpportunity, context: Dict[str, Any]) -> float:
        """Calculate priority score for an opportunity."""
        # Normalize ROI and confidence
        roi_score = min(opportunity.annual_roi_percentage / 200, 1.0)  # Cap at 200% ROI
        confidence_score = opportunity.confidence_score
        
        # Savings impact score
        savings_score = min(opportunity.potential_monthly_savings / 10000, 1.0)  # Normalize to $10k
        
        # Risk penalty
        risk_penalties = {
            RiskLevel.LOW: 0.0,
            RiskLevel.MEDIUM: 0.1,
            RiskLevel.HIGH: 0.2,
            RiskLevel.CRITICAL: 0.3
        }
        risk_penalty = risk_penalties.get(opportunity.risk_level, 0.1)
        
        # Complexity penalty
        complexity_penalties = {
            "simple": 0.0,
            "moderate": 0.05,
            "complex": 0.1,
            "very_complex": 0.15
        }
        complexity_penalty = complexity_penalties.get(opportunity.implementation_complexity.value, 0.05)
        
        base_score = (roi_score + confidence_score + savings_score) / 3
        return max(0.0, min(1.0, base_score - risk_penalty - complexity_penalty))
        
    def _determine_implementation_effort(self, strategy: OptimizationStrategy) -> str:
        """Determine implementation effort level."""
        if strategy.implementation_timeline_months <= 3:
            return "low"
        elif strategy.implementation_timeline_months <= 8:
            return "moderate"
        elif strategy.implementation_timeline_months <= 15:
            return "high"
        else:
            return "very_high"
            
    def _identify_strategy_risks(self, strategy: OptimizationStrategy) -> List[str]:
        """Identify key risks for a strategy."""
        risks = []
        
        if strategy.strategy_type == RecommendationStrategy.AGGRESSIVE:
            risks.extend([
                "High implementation complexity",
                "Potential service disruption",
                "Resource allocation challenges"
            ])
        elif strategy.strategy_type == RecommendationStrategy.CONSERVATIVE:
            risks.extend([
                "Lower than expected savings",
                "Missed optimization opportunities",
                "Slow ROI realization"
            ])
        else:
            risks.extend([
                "Implementation timeline delays",
                "Change management challenges",
                "Vendor relationship impacts"
            ])
            
        return risks[:3]  # Return top 3 risks
        
    async def learn_from_outcome(self, recommendation_id: str, outcome_data: Dict[str, Any]):
        """Learn from recommendation outcomes to improve future recommendations."""
        outcome = {
            "recommendation_id": recommendation_id,
            "outcome_data": outcome_data,
            "timestamp": datetime.utcnow(),
            "success_score": outcome_data.get("success_score", 0.5)
        }
        
        self.recommendation_outcomes.append(outcome)
        
        # Update model performance metrics
        await self._update_model_performance()
        
        logger.info(f"Learned from outcome for recommendation: {recommendation_id}")
        
    async def _update_model_performance(self):
        """Update model performance metrics based on outcomes."""
        if not self.recommendation_outcomes:
            return
            
        recent_outcomes = [o for o in self.recommendation_outcomes 
                          if (datetime.utcnow() - o["timestamp"]).days <= 30]
        
        if recent_outcomes:
            avg_success = np.mean([o["success_score"] for o in recent_outcomes])
            
            self.model_performance_metrics.update({
                "recent_success_rate": avg_success,
                "total_recommendations": len(self.recommendation_outcomes),
                "recent_recommendations": len(recent_outcomes),
                "last_updated": datetime.utcnow()
            })
            
    async def get_agent_metrics(self) -> Dict[str, Any]:
        """Get agent performance metrics."""
        return {
            "agent_id": self.agent_id,
            "agent_name": self.agent_name,
            "version": self.version,
            "model_performance": self.model_performance_metrics,
            "total_predictions": len(self.historical_predictions),
            "total_recommendations": len(self.recommendation_outcomes),
            "configuration": self.config,
            "uptime": "Active"
        }


# Global intelligent financial agent instance
intelligent_financial_agent = IntelligentFinancialAgent()