"""
ACSO Enterprise Framework - ML Cost Analyzer Integration

This module provides integration points for the ML Cost Analyzer with other
enterprise framework components including agents, APIs, and reporting systems.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
import json

from .ml_cost_analyzer import MLCostAnalyzer, CostCategory, OptimizationType
from .advanced_roi_calculator import AdvancedROICalculator
from .intelligent_upselling_engine import IntelligentUpsellingEngine

logger = logging.getLogger(__name__)

@dataclass
class CostOptimizationAlert:
    """Alert for cost optimization opportunities."""
    alert_id: str
    severity: str  # LOW, MEDIUM, HIGH, CRITICAL
    title: str
    description: str
    potential_savings: float
    confidence: float
    recommended_actions: List[str]
    created_at: datetime
    expires_at: Optional[datetime] = None

@dataclass
class CostAnalysisReport:
    """Comprehensive cost analysis report."""
    report_id: str
    tenant_id: str
    generated_at: datetime
    period_start: datetime
    period_end: datetime
    total_cost: float
    cost_breakdown: Dict[str, float]
    anomalies_detected: int
    optimization_opportunities: int
    potential_savings: float
    forecast_accuracy: float
    recommendations: List[Dict[str, Any]]

class CostAnalyzerIntegration:
    """
    Integration layer for ML Cost Analyzer with ACSO Enterprise Framework.
    
    Provides unified interface for cost analysis, optimization, and reporting
    across the enterprise platform.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize the integration layer."""
        self.config = config
        self.cost_analyzer = MLCostAnalyzer(config.get('cost_analyzer', {}))
        self.roi_calculator = AdvancedROICalculator(config.get('roi_calculator', {}))
        self.upselling_engine = IntelligentUpsellingEngine(config.get('upselling', {}))
        
        # Integration components
        self.alert_handlers = []
        self.report_subscribers = []
        self.optimization_callbacks = []
        
        logger.info("Cost Analyzer Integration initialized")
    
    async def initialize(self) -> None:
        """Initialize all integrated components."""
        try:
            await self.cost_analyzer.initialize_models()
            await self.roi_calculator.initialize()
            await self.upselling_engine.initialize()
            
            logger.info("All cost analysis components initialized")
            
        except Exception as e:
            logger.error(f"Failed to initialize cost analyzer integration: {e}")
            raise
    
    async def perform_comprehensive_cost_analysis(self, 
                                                tenant_id: str,
                                                analysis_period_days: int = 30) -> CostAnalysisReport:
        """
        Perform comprehensive cost analysis for a tenant.
        
        Args:
            tenant_id: Tenant identifier
            analysis_period_days: Period to analyze
            
        Returns:
            Comprehensive cost analysis report
        """
        try:
            logger.info(f"Starting comprehensive cost analysis for tenant {tenant_id}")
            
            # Define analysis period
            end_date = datetime.now()
            start_date = end_date - timedelta(days=analysis_period_days)
            
            # Collect cost data
            cost_data = await self.cost_analyzer.collect_cost_data(
                start_date=start_date,
                end_date=end_date
            )
            
            # Filter data for tenant (in multi-tenant scenario)
            tenant_cost_data = [
                dp for dp in cost_data 
                if dp.tags.get('tenant_id') == tenant_id
            ]
            
            if not tenant_cost_data:
                logger.warning(f"No cost data found for tenant {tenant_id}")
                return self._create_empty_report(tenant_id, start_date, end_date)
            
            # Detect anomalies
            anomalies = await self.cost_analyzer.detect_cost_anomalies(tenant_cost_data)
            
            # Identify optimization opportunities
            opportunities = await self.cost_analyzer.identify_optimization_opportunities(
                analysis_period_days=analysis_period_days
            )
            
            # Generate cost forecast
            forecast = await self.cost_analyzer.generate_cost_forecast(
                forecast_days=30,
                categories=list(CostCategory)
            )
            
            # Calculate total costs and breakdown
            total_cost = sum(dp.cost for dp in tenant_cost_data)
            cost_breakdown = {}
            for category in CostCategory:
                category_cost = sum(
                    dp.cost for dp in tenant_cost_data 
                    if dp.category == category
                )
                if category_cost > 0:
                    cost_breakdown[category.value] = category_cost
            
            # Generate recommendations
            recommendations = await self._generate_integrated_recommendations(
                tenant_id, anomalies, opportunities, forecast
            )
            
            # Create comprehensive report
            report = CostAnalysisReport(
                report_id=f"cost_analysis_{tenant_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                tenant_id=tenant_id,
                generated_at=datetime.now(),
                period_start=start_date,
                period_end=end_date,
                total_cost=total_cost,
                cost_breakdown=cost_breakdown,
                anomalies_detected=len(anomalies),
                optimization_opportunities=len(opportunities),
                potential_savings=sum(opp.potential_savings for opp in opportunities),
                forecast_accuracy=forecast.accuracy_score,
                recommendations=recommendations
            )
            
            # Notify subscribers
            await self._notify_report_subscribers(report)
            
            # Generate alerts for critical issues
            await self._generate_cost_alerts(tenant_id, anomalies, opportunities)
            
            logger.info(f"Comprehensive cost analysis completed for tenant {tenant_id}")
            return report
            
        except Exception as e:
            logger.error(f"Failed to perform comprehensive cost analysis: {e}")
            raise
    
    async def _generate_integrated_recommendations(self,
                                                 tenant_id: str,
                                                 anomalies: List[Any],
                                                 opportunities: List[Any],
                                                 forecast: Any) -> List[Dict[str, Any]]:
        """Generate integrated recommendations combining all analysis results."""
        recommendations = []
        
        # Anomaly-based recommendations
        for anomaly in anomalies[:5]:  # Top 5 anomalies
            recommendations.append({
                'type': 'anomaly_investigation',
                'priority': 'HIGH' if anomaly.confidence > 0.8 else 'MEDIUM',
                'title': f"Investigate Cost Anomaly - {anomaly.resource_id}",
                'description': anomaly.description,
                'impact': f"${anomaly.actual_cost - anomaly.expected_cost:.2f} unexpected cost",
                'actions': [
                    "Review resource usage patterns",
                    "Check for configuration changes",
                    "Validate billing accuracy"
                ] + anomaly.potential_causes,
                'estimated_effort': '2-4 hours',
                'category': anomaly.category.value
            })
        
        # Optimization-based recommendations
        high_value_opportunities = [
            opp for opp in opportunities 
            if opp.potential_savings > 100 and opp.confidence > 0.7
        ]
        
        for opp in high_value_opportunities[:10]:  # Top 10 opportunities
            recommendations.append({
                'type': 'cost_optimization',
                'priority': self._calculate_optimization_priority(opp),
                'title': f"{opp.type.value.replace('_', ' ').title()} - {opp.resource_id}",
                'description': opp.description,
                'impact': f"${opp.potential_savings:.2f} potential savings",
                'actions': opp.action_plan,
                'estimated_effort': f"{opp.estimated_implementation_time.days} days",
                'category': opp.category.value,
                'confidence': opp.confidence,
                'risk_level': opp.risk_level
            })
        
        # Forecast-based recommendations
        total_forecast = sum(forecast.predicted_costs.values())
        if total_forecast > 0:
            # Check for categories with high growth
            for category, predicted_cost in forecast.predicted_costs.items():
                if predicted_cost > 1000:  # Significant cost category
                    ci_upper = forecast.confidence_intervals[category][1]
                    if ci_upper > predicted_cost * 1.2:  # High uncertainty
                        recommendations.append({
                            'type': 'forecast_monitoring',
                            'priority': 'MEDIUM',
                            'title': f"Monitor {category.value.title()} Cost Growth",
                            'description': f"Predicted {category.value} costs show high uncertainty",
                            'impact': f"${ci_upper - predicted_cost:.2f} potential cost variance",
                            'actions': [
                                f"Set up alerts for {category.value} cost spikes",
                                "Review resource scaling policies",
                                "Consider budget caps or limits"
                            ],
                            'estimated_effort': '1-2 hours',
                            'category': category.value
                        })
        
        # ROI-based recommendations (integrate with ROI calculator)
        try:
            roi_opportunities = await self._identify_roi_opportunities(tenant_id, opportunities)
            recommendations.extend(roi_opportunities)
        except Exception as e:
            logger.warning(f"Failed to generate ROI recommendations: {e}")
        
        # Upselling recommendations (integrate with upselling engine)
        try:
            upsell_opportunities = await self._identify_upsell_opportunities(tenant_id)
            recommendations.extend(upsell_opportunities)
        except Exception as e:
            logger.warning(f"Failed to generate upselling recommendations: {e}")
        
        # Sort by priority and potential impact
        priority_order = {'CRITICAL': 0, 'HIGH': 1, 'MEDIUM': 2, 'LOW': 3}
        recommendations.sort(key=lambda x: (
            priority_order.get(x['priority'], 4),
            -float(x.get('impact', '0').replace('$', '').replace(' potential savings', '').replace(' unexpected cost', '').replace(' potential cost variance', '').split()[0])
        ))
        
        return recommendations
    
    def _calculate_optimization_priority(self, opportunity: Any) -> str:
        """Calculate priority for optimization opportunity."""
        if opportunity.potential_savings > 1000 and opportunity.confidence > 0.9:
            return 'CRITICAL'
        elif opportunity.potential_savings > 500 and opportunity.confidence > 0.8:
            return 'HIGH'
        elif opportunity.potential_savings > 100 and opportunity.confidence > 0.6:
            return 'MEDIUM'
        else:
            return 'LOW'
    
    async def _identify_roi_opportunities(self, 
                                        tenant_id: str, 
                                        optimization_opportunities: List[Any]) -> List[Dict[str, Any]]:
        """Identify ROI-focused opportunities using the ROI calculator."""
        roi_recommendations = []
        
        # Group opportunities by type for ROI analysis
        investment_scenarios = {}
        for opp in optimization_opportunities:
            if opp.type not in investment_scenarios:
                investment_scenarios[opp.type] = []
            investment_scenarios[opp.type].append(opp)
        
        # Analyze ROI for each scenario type
        for opt_type, opportunities in investment_scenarios.items():
            total_investment = sum(opp.current_cost * 0.1 for opp in opportunities)  # Assume 10% implementation cost
            total_savings = sum(opp.potential_savings for opp in opportunities)
            
            if total_investment > 0 and total_savings > total_investment:
                # Calculate simple ROI
                roi_percentage = ((total_savings - total_investment) / total_investment) * 100
                payback_months = (total_investment / (total_savings / 12)) if total_savings > 0 else float('inf')
                
                if roi_percentage > 50 and payback_months < 12:  # Good ROI opportunity
                    roi_recommendations.append({
                        'type': 'roi_investment',
                        'priority': 'HIGH' if roi_percentage > 100 else 'MEDIUM',
                        'title': f"High ROI Investment - {opt_type.value.replace('_', ' ').title()}",
                        'description': f"Implementing {len(opportunities)} {opt_type.value} optimizations",
                        'impact': f"{roi_percentage:.0f}% ROI, {payback_months:.1f} month payback",
                        'actions': [
                            f"Prioritize {opt_type.value} optimization projects",
                            "Allocate budget for implementation",
                            "Track ROI metrics post-implementation"
                        ],
                        'estimated_effort': f"{len(opportunities) * 3} days",
                        'category': 'financial_optimization'
                    })
        
        return roi_recommendations
    
    async def _identify_upsell_opportunities(self, tenant_id: str) -> List[Dict[str, Any]]:
        """Identify upselling opportunities using the upselling engine."""
        upsell_recommendations = []
        
        try:
            # This would integrate with the actual upselling engine
            # For now, we'll create sample recommendations based on cost patterns
            
            # Example: High compute usage suggests premium support upsell
            upsell_recommendations.append({
                'type': 'upsell_opportunity',
                'priority': 'MEDIUM',
                'title': 'Premium Support Upgrade Opportunity',
                'description': 'High resource usage indicates need for premium support',
                'impact': '$500/month additional revenue potential',
                'actions': [
                    'Contact customer success team',
                    'Prepare premium support proposal',
                    'Schedule upgrade discussion'
                ],
                'estimated_effort': '2-3 days',
                'category': 'revenue_optimization'
            })
            
        except Exception as e:
            logger.warning(f"Failed to identify upsell opportunities: {e}")
        
        return upsell_recommendations
    
    async def _generate_cost_alerts(self, 
                                  tenant_id: str, 
                                  anomalies: List[Any], 
                                  opportunities: List[Any]) -> None:
        """Generate cost optimization alerts."""
        alerts = []
        
        # Critical anomaly alerts
        critical_anomalies = [a for a in anomalies if a.confidence > 0.9 and a.actual_cost > a.expected_cost * 2]
        for anomaly in critical_anomalies:
            alert = CostOptimizationAlert(
                alert_id=f"anomaly_{anomaly.resource_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
                severity='CRITICAL',
                title=f"Critical Cost Anomaly Detected",
                description=f"Resource {anomaly.resource_id} cost is {anomaly.actual_cost/anomaly.expected_cost:.1f}x higher than expected",
                potential_savings=anomaly.actual_cost - anomaly.expected_cost,
                confidence=anomaly.confidence,
                recommended_actions=[
                    "Immediate investigation required",
                    "Check for resource misconfiguration",
                    "Review recent changes"
                ],
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(hours=24)
            )
            alerts.append(alert)
        
        # High-value optimization alerts
        high_value_opportunities = [opp for opp in opportunities if opp.potential_savings > 500]
        for opp in high_value_opportunities[:3]:  # Top 3
            alert = CostOptimizationAlert(
                alert_id=f"optimization_{opp.opportunity_id}",
                severity='HIGH',
                title=f"High-Value Optimization Opportunity",
                description=f"{opp.type.value.replace('_', ' ').title()} opportunity for {opp.resource_id}",
                potential_savings=opp.potential_savings,
                confidence=opp.confidence,
                recommended_actions=opp.action_plan[:3],  # Top 3 actions
                created_at=datetime.now(),
                expires_at=datetime.now() + timedelta(days=7)
            )
            alerts.append(alert)
        
        # Send alerts to handlers
        for alert in alerts:
            await self._send_alert(tenant_id, alert)
    
    async def _send_alert(self, tenant_id: str, alert: CostOptimizationAlert) -> None:
        """Send alert to registered handlers."""
        for handler in self.alert_handlers:
            try:
                await handler(tenant_id, alert)
            except Exception as e:
                logger.error(f"Alert handler failed: {e}")
    
    async def _notify_report_subscribers(self, report: CostAnalysisReport) -> None:
        """Notify report subscribers."""
        for subscriber in self.report_subscribers:
            try:
                await subscriber(report)
            except Exception as e:
                logger.error(f"Report subscriber failed: {e}")
    
    def _create_empty_report(self, 
                           tenant_id: str, 
                           start_date: datetime, 
                           end_date: datetime) -> CostAnalysisReport:
        """Create empty report when no data is available."""
        return CostAnalysisReport(
            report_id=f"empty_report_{tenant_id}_{datetime.now().strftime('%Y%m%d_%H%M%S')}",
            tenant_id=tenant_id,
            generated_at=datetime.now(),
            period_start=start_date,
            period_end=end_date,
            total_cost=0.0,
            cost_breakdown={},
            anomalies_detected=0,
            optimization_opportunities=0,
            potential_savings=0.0,
            forecast_accuracy=0.0,
            recommendations=[{
                'type': 'data_collection',
                'priority': 'HIGH',
                'title': 'Set Up Cost Data Collection',
                'description': 'No cost data available for analysis',
                'impact': 'Enable cost optimization capabilities',
                'actions': [
                    'Configure cost data sources',
                    'Set up billing integrations',
                    'Enable usage tracking'
                ],
                'estimated_effort': '1-2 days',
                'category': 'setup'
            }]
        )
    
    # Integration methods for external systems
    
    def register_alert_handler(self, handler) -> None:
        """Register an alert handler function."""
        self.alert_handlers.append(handler)
    
    def register_report_subscriber(self, subscriber) -> None:
        """Register a report subscriber function."""
        self.report_subscribers.append(subscriber)
    
    def register_optimization_callback(self, callback) -> None:
        """Register an optimization callback function."""
        self.optimization_callbacks.append(callback)
    
    async def get_tenant_cost_summary(self, tenant_id: str) -> Dict[str, Any]:
        """Get quick cost summary for a tenant."""
        try:
            # Get recent cost data (last 7 days)
            end_date = datetime.now()
            start_date = end_date - timedelta(days=7)
            
            cost_data = await self.cost_analyzer.collect_cost_data(start_date, end_date)
            tenant_data = [dp for dp in cost_data if dp.tags.get('tenant_id') == tenant_id]
            
            if not tenant_data:
                return {'total_cost': 0, 'daily_average': 0, 'trend': 'no_data'}
            
            total_cost = sum(dp.cost for dp in tenant_data)
            daily_average = total_cost / 7
            
            # Simple trend calculation
            first_half = sum(dp.cost for dp in tenant_data[:len(tenant_data)//2])
            second_half = sum(dp.cost for dp in tenant_data[len(tenant_data)//2:])
            
            if second_half > first_half * 1.1:
                trend = 'increasing'
            elif second_half < first_half * 0.9:
                trend = 'decreasing'
            else:
                trend = 'stable'
            
            return {
                'total_cost': total_cost,
                'daily_average': daily_average,
                'trend': trend,
                'data_points': len(tenant_data)
            }
            
        except Exception as e:
            logger.error(f"Failed to get tenant cost summary: {e}")
            return {'error': str(e)}
    
    async def trigger_optimization_analysis(self, tenant_id: str) -> Dict[str, Any]:
        """Trigger on-demand optimization analysis for a tenant."""
        try:
            logger.info(f"Triggering optimization analysis for tenant {tenant_id}")
            
            # Perform comprehensive analysis
            report = await self.perform_comprehensive_cost_analysis(tenant_id)
            
            # Execute optimization callbacks
            for callback in self.optimization_callbacks:
                try:
                    await callback(tenant_id, report)
                except Exception as e:
                    logger.error(f"Optimization callback failed: {e}")
            
            return {
                'status': 'completed',
                'report_id': report.report_id,
                'total_savings_identified': report.potential_savings,
                'recommendations_count': len(report.recommendations)
            }
            
        except Exception as e:
            logger.error(f"Failed to trigger optimization analysis: {e}")
            return {'status': 'failed', 'error': str(e)}