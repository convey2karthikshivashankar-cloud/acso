"""
ACSO Enterprise Framework - ML Cost Analyzer Example

This module demonstrates the usage of the ML-powered cost analysis system
with realistic scenarios and integration examples.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Any
import json

from .ml_cost_analyzer import (
    MLCostAnalyzer, CostDataPoint, CostCategory, 
    OptimizationType, CostAnomaly, OptimizationOpportunity
)

logger = logging.getLogger(__name__)

class CostAnalyzerDemo:
    """Demonstration of ML Cost Analyzer capabilities."""
    
    def __init__(self):
        """Initialize the demo with sample configuration."""
        self.config = {
            'aws_region': 'us-east-1',
            'analysis_window_days': 90,
            'forecast_horizon_days': 30,
            'anomaly_threshold': 0.1,
            'optimization_confidence_threshold': 0.7
        }
        
        self.analyzer = MLCostAnalyzer(self.config)
    
    async def run_complete_demo(self) -> Dict[str, Any]:
        """Run a complete demonstration of all ML Cost Analyzer features."""
        try:
            logger.info("Starting ML Cost Analyzer demonstration")
            
            # Initialize the analyzer
            await self.analyzer.initialize_models()
            
            # Generate sample cost data
            sample_data = await self._generate_sample_cost_data()
            
            # Collect and analyze cost data
            await self.analyzer.collect_cost_data(
                start_date=datetime.now() - timedelta(days=90),
                end_date=datetime.now()
            )
            
            # Add sample data to analyzer
            self.analyzer.cost_data.extend(sample_data)
            
            # Train models
            anomaly_accuracy = await self.analyzer.train_anomaly_detection_model()
            forecast_mape = await self.analyzer.train_forecast_model()
            
            # Detect anomalies
            anomalies = await self.analyzer.detect_cost_anomalies(sample_data[-30:])
            
            # Generate cost forecast
            forecast = await self.analyzer.generate_cost_forecast(
                forecast_days=30,
                categories=[CostCategory.COMPUTE, CostCategory.STORAGE, CostCategory.DATABASE]
            )
            
            # Identify optimization opportunities
            opportunities = await self.analyzer.identify_optimization_opportunities(
                analysis_period_days=30
            )
            
            # Generate comprehensive report
            optimization_report = await self.analyzer.generate_optimization_report(opportunities)
            
            # Get model performance metrics
            performance_metrics = await self.analyzer.get_model_performance_metrics()
            
            # Compile demo results
            demo_results = {
                'demo_timestamp': datetime.now().isoformat(),
                'model_training': {
                    'anomaly_detection_accuracy': anomaly_accuracy,
                    'forecast_mape': forecast_mape,
                    'training_data_points': len(self.analyzer.cost_data)
                },
                'anomaly_detection': {
                    'anomalies_detected': len(anomalies),
                    'anomalies': [self._serialize_anomaly(a) for a in anomalies[:5]]  # Top 5
                },
                'cost_forecast': {
                    'forecast_period_days': forecast.forecast_period.days,
                    'predicted_costs': {k.value: v for k, v in forecast.predicted_costs.items()},
                    'confidence_intervals': {
                        k.value: {'lower': ci[0], 'upper': ci[1]} 
                        for k, ci in forecast.confidence_intervals.items()
                    },
                    'accuracy_score': forecast.accuracy_score
                },
                'optimization_opportunities': {
                    'total_opportunities': len(opportunities),
                    'total_potential_savings': sum(opp.potential_savings for opp in opportunities),
                    'high_confidence_opportunities': len([opp for opp in opportunities if opp.confidence > 0.8]),
                    'top_opportunities': [self._serialize_opportunity(opp) for opp in opportunities[:5]]
                },
                'optimization_report': optimization_report,
                'performance_metrics': performance_metrics
            }
            
            logger.info("ML Cost Analyzer demonstration completed successfully")
            return demo_results
            
        except Exception as e:
            logger.error(f"Demo failed: {e}")
            raise
    
    async def _generate_sample_cost_data(self) -> List[CostDataPoint]:
        """Generate realistic sample cost data for demonstration."""
        sample_data = []
        base_date = datetime.now() - timedelta(days=90)
        
        # Define sample resources with different patterns
        resources = [
            {
                'id': 'i-1234567890abcdef0',
                'type': 'Amazon Elastic Compute Cloud - Compute',
                'category': CostCategory.COMPUTE,
                'base_cost': 100.0,
                'utilization_pattern': 'normal'  # Normal usage
            },
            {
                'id': 'i-0987654321fedcba0',
                'type': 'Amazon Elastic Compute Cloud - Compute',
                'category': CostCategory.COMPUTE,
                'base_cost': 150.0,
                'utilization_pattern': 'underutilized'  # Under-utilized
            },
            {
                'id': 'vol-1234567890abcdef0',
                'type': 'Amazon Elastic Block Store',
                'category': CostCategory.STORAGE,
                'base_cost': 50.0,
                'utilization_pattern': 'low_access'  # Low access storage
            },
            {
                'id': 'db-instance-1',
                'type': 'Amazon Relational Database Service',
                'category': CostCategory.DATABASE,
                'base_cost': 200.0,
                'utilization_pattern': 'consistent'  # Good for reserved instances
            },
            {
                'id': 'unused-resource-1',
                'type': 'Amazon Elastic Compute Cloud - Compute',
                'category': CostCategory.COMPUTE,
                'base_cost': 75.0,
                'utilization_pattern': 'unused'  # Unused resource
            }
        ]
        
        # Generate 90 days of data
        for day in range(90):
            current_date = base_date + timedelta(days=day)
            
            for resource in resources:
                # Generate cost based on pattern
                daily_cost = self._generate_daily_cost(resource, current_date, day)
                usage_metrics = self._generate_usage_metrics(resource, current_date, day)
                
                data_point = CostDataPoint(
                    timestamp=current_date,
                    category=resource['category'],
                    resource_id=resource['id'],
                    resource_type=resource['type'],
                    cost=daily_cost,
                    usage_metrics=usage_metrics,
                    tags={
                        'environment': 'production',
                        'team': 'platform',
                        'project': 'acso-demo'
                    },
                    metadata={
                        'pattern': resource['utilization_pattern'],
                        'base_cost': resource['base_cost']
                    }
                )
                
                sample_data.append(data_point)
        
        logger.info(f"Generated {len(sample_data)} sample cost data points")
        return sample_data
    
    def _generate_daily_cost(self, resource: Dict[str, Any], date: datetime, day: int) -> float:
        """Generate daily cost based on resource pattern."""
        base_cost = resource['base_cost']
        pattern = resource['utilization_pattern']
        
        # Add some randomness
        import random
        random.seed(day + hash(resource['id']))
        
        if pattern == 'normal':
            # Normal usage with some variation
            variation = random.uniform(0.8, 1.2)
            # Add weekend reduction
            if date.weekday() >= 5:
                variation *= 0.7
            return base_cost * variation
            
        elif pattern == 'underutilized':
            # Consistently low usage
            variation = random.uniform(0.3, 0.6)
            return base_cost * variation
            
        elif pattern == 'low_access':
            # Storage with low access
            variation = random.uniform(0.9, 1.1)
            return base_cost * variation
            
        elif pattern == 'consistent':
            # Very consistent usage (good for reserved instances)
            variation = random.uniform(0.95, 1.05)
            return base_cost * variation
            
        elif pattern == 'unused':
            # Unused resource with minimal cost
            return base_cost * 0.1  # Just storage/allocation costs
            
        else:
            return base_cost
    
    def _generate_usage_metrics(self, resource: Dict[str, Any], date: datetime, day: int) -> Dict[str, float]:
        """Generate usage metrics based on resource pattern."""
        pattern = resource['utilization_pattern']
        
        import random
        random.seed(day + hash(resource['id']) + 1000)
        
        if resource['category'] == CostCategory.COMPUTE:
            if pattern == 'normal':
                return {
                    'CPUUtilization': random.uniform(40, 80),
                    'NetworkIn': random.uniform(1000, 5000),
                    'NetworkOut': random.uniform(500, 2000)
                }
            elif pattern == 'underutilized':
                return {
                    'CPUUtilization': random.uniform(5, 25),
                    'NetworkIn': random.uniform(100, 500),
                    'NetworkOut': random.uniform(50, 200)
                }
            elif pattern == 'unused':
                return {
                    'CPUUtilization': random.uniform(0, 5),
                    'NetworkIn': random.uniform(0, 50),
                    'NetworkOut': random.uniform(0, 25)
                }
                
        elif resource['category'] == CostCategory.STORAGE:
            if pattern == 'low_access':
                return {
                    'VolumeReadOps': random.uniform(0, 10),
                    'VolumeWriteOps': random.uniform(0, 5)
                }
            else:
                return {
                    'VolumeReadOps': random.uniform(100, 1000),
                    'VolumeWriteOps': random.uniform(50, 500)
                }
                
        elif resource['category'] == CostCategory.DATABASE:
            if pattern == 'consistent':
                return {
                    'CPUUtilization': random.uniform(45, 55),
                    'DatabaseConnections': random.uniform(20, 30)
                }
            else:
                return {
                    'CPUUtilization': random.uniform(20, 80),
                    'DatabaseConnections': random.uniform(5, 50)
                }
        
        return {}
    
    def _serialize_anomaly(self, anomaly: CostAnomaly) -> Dict[str, Any]:
        """Serialize anomaly for JSON output."""
        return {
            'timestamp': anomaly.timestamp.isoformat(),
            'category': anomaly.category.value,
            'resource_id': anomaly.resource_id,
            'expected_cost': anomaly.expected_cost,
            'actual_cost': anomaly.actual_cost,
            'anomaly_score': anomaly.anomaly_score,
            'confidence': anomaly.confidence,
            'description': anomaly.description,
            'potential_causes': anomaly.potential_causes
        }
    
    def _serialize_opportunity(self, opportunity: OptimizationOpportunity) -> Dict[str, Any]:
        """Serialize optimization opportunity for JSON output."""
        return {
            'opportunity_id': opportunity.opportunity_id,
            'type': opportunity.type.value,
            'category': opportunity.category.value,
            'resource_id': opportunity.resource_id,
            'current_cost': opportunity.current_cost,
            'potential_savings': opportunity.potential_savings,
            'confidence': opportunity.confidence,
            'implementation_effort': opportunity.implementation_effort,
            'risk_level': opportunity.risk_level,
            'description': opportunity.description,
            'action_plan': opportunity.action_plan,
            'estimated_implementation_time_days': opportunity.estimated_implementation_time.days,
            'prerequisites': opportunity.prerequisites
        }

async def run_cost_analyzer_demo():
    """Run the complete ML Cost Analyzer demonstration."""
    demo = CostAnalyzerDemo()
    results = await demo.run_complete_demo()
    
    # Pretty print results
    print("\n" + "="*80)
    print("ACSO ENTERPRISE FRAMEWORK - ML COST ANALYZER DEMO RESULTS")
    print("="*80)
    
    print(f"\nDemo completed at: {results['demo_timestamp']}")
    
    print(f"\n📊 MODEL TRAINING RESULTS:")
    print(f"  • Anomaly Detection Accuracy: {results['model_training']['anomaly_detection_accuracy']:.3f}")
    print(f"  • Forecast MAPE: {results['model_training']['forecast_mape']:.3f}")
    print(f"  • Training Data Points: {results['model_training']['training_data_points']:,}")
    
    print(f"\n🚨 ANOMALY DETECTION:")
    print(f"  • Anomalies Detected: {results['anomaly_detection']['anomalies_detected']}")
    for i, anomaly in enumerate(results['anomaly_detection']['anomalies'], 1):
        print(f"  {i}. {anomaly['resource_id']}: ${anomaly['actual_cost']:.2f} vs ${anomaly['expected_cost']:.2f} expected")
        print(f"     Confidence: {anomaly['confidence']:.2f} | {anomaly['description']}")
    
    print(f"\n📈 COST FORECAST (30 days):")
    total_forecast = sum(results['cost_forecast']['predicted_costs'].values())
    print(f"  • Total Predicted Cost: ${total_forecast:,.2f}")
    print(f"  • Forecast Accuracy: {results['cost_forecast']['accuracy_score']:.3f}")
    for category, cost in results['cost_forecast']['predicted_costs'].items():
        ci = results['cost_forecast']['confidence_intervals'][category]
        print(f"  • {category.title()}: ${cost:,.2f} (${ci['lower']:,.2f} - ${ci['upper']:,.2f})")
    
    print(f"\n💰 OPTIMIZATION OPPORTUNITIES:")
    opt_data = results['optimization_opportunities']
    print(f"  • Total Opportunities: {opt_data['total_opportunities']}")
    print(f"  • Total Potential Savings: ${opt_data['total_potential_savings']:,.2f}")
    print(f"  • High Confidence Opportunities: {opt_data['high_confidence_opportunities']}")
    
    print(f"\n🎯 TOP OPTIMIZATION RECOMMENDATIONS:")
    for i, opp in enumerate(opt_data['top_opportunities'], 1):
        print(f"  {i}. {opp['type'].replace('_', ' ').title()} - {opp['resource_id']}")
        print(f"     Potential Savings: ${opp['potential_savings']:,.2f} | Confidence: {opp['confidence']:.2f}")
        print(f"     Effort: {opp['implementation_effort']} | Risk: {opp['risk_level']}")
        print(f"     {opp['description']}")
    
    print(f"\n📋 OPTIMIZATION SUMMARY:")
    summary = results['optimization_report']['summary']
    print(f"  • Potential Savings Percentage: {summary['potential_savings_percentage']:.1f}%")
    print(f"  • Low Effort Opportunities: {summary['low_effort_opportunities']}")
    print(f"  • High Confidence Opportunities: {summary['high_confidence_opportunities']}")
    
    print(f"\n🔧 MODEL PERFORMANCE:")
    perf = results['performance_metrics']
    print(f"  • Anomaly Detection Accuracy: {perf['anomaly_detection_accuracy']:.3f}")
    print(f"  • Forecast Accuracy: {perf['forecast_accuracy']:.3f}")
    print(f"  • Optimization Success Rate: {perf['optimization_success_rate']:.3f}")
    print(f"  • Total Data Points: {perf['total_cost_data_points']:,}")
    
    print("\n" + "="*80)
    print("Demo completed successfully! 🎉")
    print("="*80)
    
    return results

if __name__ == "__main__":
    # Run the demo
    asyncio.run(run_cost_analyzer_demo())