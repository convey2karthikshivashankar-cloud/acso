"""
ML-Powered Cost Analysis System for ACSO Enterprise.
Pattern recognition in spending with anomaly detection and predictive forecasting.
"""
import asyncio
import logging
import numpy as np
import pandas as pd
import torch
import torch.nn as nn
import torch.optim as optim
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
from collections import defaultdict, deque
from sklearn.ensemble import IsolationForest, RandomForestRegressor
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.cluster import KMeans, DBSCAN
from sklearn.decomposition import PCA
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import boto3
from botocore.exceptions import ClientError

class CostCategory(str, Enum):
    """Cost categories for analysis."""
    COMPUTE = "compute"
    STORAGE = "storage"
    NETWORK = "network"
    DATABASE = "database"
    SECURITY = "security"
    MONITORING = "monitoring"
    BACKUP = "backup"
    LICENSING = "licensing"
    SUPPORT = "support"
    THIRD_PARTY = "third_party"

class AnomalyType(str, Enum):
    """Types of cost anomalies."""
    SPIKE = "spike"
    DRIFT = "drift"
    SEASONAL = "seasonal"
    OUTLIER = "outlier"
    PATTERN_BREAK = "pattern_break"

class ForecastHorizon(str, Enum):
    """Forecast time horizons."""
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

@dataclass
class CostDataPoint:
    """Individual cost data point."""
    data_point_id: str
    tenant_id: str
    timestamp: datetime
    cost_category: CostCategory
    amount: float
    currency: str
    resource_id: Optional[str]
    service_name: str
    region: str
    tags: Dict[str, str]
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CostAnomaly:
    """Detected cost anomaly."""
    anomaly_id: str
    tenant_id: str
    detected_at: datetime
    anomaly_type: AnomalyType
    cost_category: CostCategory
    severity: float  # 0-1 scale
    expected_cost: float
    actual_cost: float
    deviation_percentage: float
    affected_resources: List[str]
    root_cause_analysis: Dict[str, Any]
    recommendations: List[str]
    confidence: float

@dataclass
class CostForecast:
    """Cost forecast result."""
    forecast_id: str
    tenant_id: str
    generated_at: datetime
    forecast_horizon: ForecastHorizon
    cost_category: CostCategory
    predictions: List[Dict[str, Any]]  # timestamp, predicted_cost, confidence_interval
    model_accuracy: float
    trend_analysis: Dict[str, Any]
    seasonal_patterns: Dict[str, Any]
    assumptions: List[str]

@dataclass
class SpendingPattern:
    """Identified spending pattern."""
    pattern_id: str
    tenant_id: str
    pattern_type: str
    cost_categories: List[CostCategory]
    frequency: str
    average_amount: float
    variance: float
    seasonality: Optional[Dict[str, Any]]
    trend: str  # increasing, decreasing, stable
    confidence: float
    first_observed: datetime
    last_observed: datetime

class LSTMCostPredictor(nn.Module):
    """LSTM neural network for cost prediction."""
    
    def __init__(self, input_size: int = 10, hidden_size: int = 128, num_layers: int = 2, output_size: int = 1):
        super(LSTMCostPredictor, self).__init__()
        self.hidden_size = hidden_size
        self.num_layers = num_layers
        
        self.lstm = nn.LSTM(input_size, hidden_size, num_layers, batch_first=True, dropout=0.2)
        self.attention = nn.MultiheadAttention(hidden_size, num_heads=8, dropout=0.1)
        self.fc1 = nn.Linear(hidden_size, hidden_size // 2)
        self.fc2 = nn.Linear(hidden_size // 2, output_size)
        self.dropout = nn.Dropout(0.2)
        self.relu = nn.ReLU()
        
    def forward(self, x):
        # LSTM layer
        lstm_out, (hidden, cell) = self.lstm(x)
        
        # Attention mechanism
        attn_out, _ = self.attention(lstm_out, lstm_out, lstm_out)
        
        # Use the last output
        out = attn_out[:, -1, :]
        out = self.dropout(out)
        out = self.relu(self.fc1(out))
        out = self.dropout(out)
        out = self.fc2(out)
        
        return out

class CostAnomalyDetector(nn.Module):
    """Autoencoder for cost anomaly detection."""
    
    def __init__(self, input_size: int = 20, encoding_dim: int = 8):
        super(CostAnomalyDetector, self).__init__()
        
        # Encoder
        self.encoder = nn.Sequential(
            nn.Linear(input_size, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, encoding_dim),
            nn.ReLU()
        )
        
        # Decoder
        self.decoder = nn.Sequential(
            nn.Linear(encoding_dim, 32),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(32, 64),
            nn.ReLU(),
            nn.Dropout(0.2),
            nn.Linear(64, input_size),
            nn.Sigmoid()
        )
        
    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

class MLCostAnalyzer:
    """
    ML-Powered Cost Analysis System with comprehensive financial intelligence.
    
    Features:
    - Pattern recognition in spending using ML clustering and classification
    - Anomaly detection for cost optimization using autoencoders and isolation forests
    - Predictive cost forecasting with LSTM networks and time series analysis
    - Real-time cost monitoring and alerting
    - Root cause analysis for cost anomalies
    - Automated optimization recommendations
    - Multi-tenant cost attribution and analysis
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Core data structures
        self.cost_data: Dict[str, List[CostDataPoint]] = defaultdict(list)
        self.anomalies: Dict[str, List[CostAnomaly]] = defaultdict(list)
        self.forecasts: Dict[str, List[CostForecast]] = defaultdict(list)
        self.spending_patterns: Dict[str, List[SpendingPattern]] = defaultdict(list)
        
        # ML Models
        self.lstm_predictors: Dict[str, LSTMCostPredictor] = {}
        self.anomaly_detectors: Dict[str, CostAnomalyDetector] = {}
        self.isolation_forests: Dict[str, IsolationForest] = {}
        self.clustering_models: Dict[str, KMeans] = {}
        self.scalers: Dict[str, StandardScaler] = {}
        
        # AWS Integration
        self.ce_client = None
        self.cloudwatch_client = None
        
        # Configuration
        self.anomaly_threshold = 0.05  # 5% deviation threshold
        self.forecast_accuracy_threshold = 0.8
        self.pattern_confidence_threshold = 0.7
        self.max_data_points = 100000  # Per tenant
        
        # Processing queues
        self.cost_data_queue: asyncio.Queue = asyncio.Queue()
        self.analysis_queue: asyncio.Queue = asyncio.Queue()
        
        # Background tasks
        self.processing_tasks: List[asyncio.Task] = []
        self.system_active = False
    
    async def initialize(self, aws_region: str = "us-east-1") -> None:
        """Initialize the ML cost analyzer."""
        try:
            self.logger.info("Initializing ML Cost Analyzer")
            
            # Initialize AWS clients
            self.ce_client = boto3.client('ce', region_name=aws_region)
            self.cloudwatch_client = boto3.client('cloudwatch', region_name=aws_region)
            
            # Initialize ML models
            await self._initialize_models()
            
            # Load historical data
            await self._load_historical_data()
            
            # Start background processing
            self.system_active = True
            self.processing_tasks = [
                asyncio.create_task(self._cost_data_processor()),
                asyncio.create_task(self._anomaly_detector()),
                asyncio.create_task(self._pattern_analyzer()),
                asyncio.create_task(self._forecast_generator()),
                asyncio.create_task(self._model_trainer())
            ]
            
            self.logger.info("ML Cost Analyzer initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize ML Cost Analyzer: {e}")
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the cost analyzer."""
        try:
            self.logger.info("Shutting down ML Cost Analyzer")
            
            self.system_active = False
            
            # Cancel background tasks
            for task in self.processing_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            # Save models
            await self._save_models()
            
            self.logger.info("ML Cost Analyzer shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
    
    async def ingest_cost_data(
        self,
        tenant_id: str,
        cost_data: List[CostDataPoint]
    ) -> None:
        """Ingest cost data for analysis."""
        try:
            # Add to queue for processing
            for data_point in cost_data:
                await self.cost_data_queue.put((tenant_id, data_point))
            
            self.logger.debug(f"Ingested {len(cost_data)} cost data points for tenant {tenant_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to ingest cost data: {e}")
    
    async def detect_cost_anomalies(
        self,
        tenant_id: str,
        time_window_hours: int = 24,
        cost_categories: Optional[List[CostCategory]] = None
    ) -> List[CostAnomaly]:
        """Detect cost anomalies for a tenant."""
        try:
            self.logger.info(f"Detecting cost anomalies for tenant: {tenant_id}")
            
            # Get recent cost data
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(hours=time_window_hours)
            
            recent_data = [
                dp for dp in self.cost_data[tenant_id]
                if start_time <= dp.timestamp <= end_time
            ]
            
            if not recent_data:
                return []
            
            # Filter by cost categories if specified
            if cost_categories:
                recent_data = [dp for dp in recent_data if dp.cost_category in cost_categories]
            
            anomalies = []
            
            # Group by cost category for analysis
            category_data = defaultdict(list)
            for dp in recent_data:
                category_data[dp.cost_category].append(dp)
            
            for category, data_points in category_data.items():
                if len(data_points) < 5:  # Need minimum data points
                    continue
                
                # Detect anomalies using multiple methods
                category_anomalies = await self._detect_category_anomalies(
                    tenant_id, category, data_points
                )
                anomalies.extend(category_anomalies)
            
            # Store detected anomalies
            self.anomalies[tenant_id].extend(anomalies)
            
            # Keep only recent anomalies
            cutoff_time = datetime.utcnow() - timedelta(days=30)
            self.anomalies[tenant_id] = [
                a for a in self.anomalies[tenant_id]
                if a.detected_at >= cutoff_time
            ]
            
            self.logger.info(f"Detected {len(anomalies)} cost anomalies for tenant {tenant_id}")
            return anomalies
            
        except Exception as e:
            self.logger.error(f"Failed to detect cost anomalies: {e}")
            return []
    
    async def generate_cost_forecast(
        self,
        tenant_id: str,
        forecast_horizon: ForecastHorizon,
        cost_category: Optional[CostCategory] = None,
        forecast_days: int = 30
    ) -> List[CostForecast]:
        """Generate cost forecasts for a tenant."""
        try:
            self.logger.info(f"Generating cost forecast for tenant: {tenant_id}")
            
            forecasts = []
            
            # Determine categories to forecast
            if cost_category:
                categories = [cost_category]
            else:
                categories = list(CostCategory)
            
            for category in categories:
                # Get historical data for this category
                historical_data = [
                    dp for dp in self.cost_data[tenant_id]
                    if dp.cost_category == category
                ]
                
                if len(historical_data) < 30:  # Need minimum historical data
                    continue
                
                # Generate forecast
                forecast = await self._generate_category_forecast(
                    tenant_id, category, historical_data, forecast_horizon, forecast_days
                )
                
                if forecast:
                    forecasts.append(forecast)
            
            # Store forecasts
            self.forecasts[tenant_id].extend(forecasts)
            
            # Keep only recent forecasts
            cutoff_time = datetime.utcnow() - timedelta(days=90)
            self.forecasts[tenant_id] = [
                f for f in self.forecasts[tenant_id]
                if f.generated_at >= cutoff_time
            ]
            
            self.logger.info(f"Generated {len(forecasts)} cost forecasts for tenant {tenant_id}")
            return forecasts
            
        except Exception as e:
            self.logger.error(f"Failed to generate cost forecast: {e}")
            return []
    
    async def analyze_spending_patterns(
        self,
        tenant_id: str,
        analysis_period_days: int = 90
    ) -> List[SpendingPattern]:
        """Analyze spending patterns for a tenant."""
        try:
            self.logger.info(f"Analyzing spending patterns for tenant: {tenant_id}")
            
            # Get historical data
            end_time = datetime.utcnow()
            start_time = end_time - timedelta(days=analysis_period_days)
            
            historical_data = [
                dp for dp in self.cost_data[tenant_id]
                if start_time <= dp.timestamp <= end_time
            ]
            
            if len(historical_data) < 50:  # Need minimum data for pattern analysis
                return []
            
            patterns = []
            
            # Analyze patterns by cost category
            category_data = defaultdict(list)
            for dp in historical_data:
                category_data[dp.cost_category].append(dp)
            
            for category, data_points in category_data.items():
                if len(data_points) < 20:
                    continue
                
                # Detect patterns in this category
                category_patterns = await self._detect_spending_patterns(
                    tenant_id, category, data_points
                )
                patterns.extend(category_patterns)
            
            # Detect cross-category patterns
            cross_patterns = await self._detect_cross_category_patterns(
                tenant_id, historical_data
            )
            patterns.extend(cross_patterns)
            
            # Store patterns
            self.spending_patterns[tenant_id] = patterns
            
            self.logger.info(f"Identified {len(patterns)} spending patterns for tenant {tenant_id}")
            return patterns
            
        except Exception as e:
            self.logger.error(f"Failed to analyze spending patterns: {e}")
            return []
    
    async def get_cost_optimization_recommendations(
        self,
        tenant_id: str,
        focus_categories: Optional[List[CostCategory]] = None
    ) -> Dict[str, Any]:
        """Get ML-powered cost optimization recommendations."""
        try:
            # Analyze recent anomalies
            recent_anomalies = [
                a for a in self.anomalies[tenant_id]
                if (datetime.utcnow() - a.detected_at).days <= 7
            ]
            
            # Analyze spending patterns
            patterns = self.spending_patterns.get(tenant_id, [])
            
            # Get recent forecasts
            recent_forecasts = [
                f for f in self.forecasts[tenant_id]
                if (datetime.utcnow() - f.generated_at).days <= 7
            ]
            
            recommendations = {
                "tenant_id": tenant_id,
                "generated_at": datetime.utcnow().isoformat(),
                "anomaly_based_recommendations": [],
                "pattern_based_recommendations": [],
                "forecast_based_recommendations": [],
                "priority_actions": [],
                "potential_savings": 0.0
            }
            
            # Anomaly-based recommendations
            for anomaly in recent_anomalies:
                if anomaly.severity > 0.7:  # High severity anomalies
                    rec = {
                        "type": "anomaly_mitigation",
                        "category": anomaly.cost_category.value,
                        "description": f"Address {anomaly.anomaly_type.value} in {anomaly.cost_category.value}",
                        "potential_savings": abs(anomaly.actual_cost - anomaly.expected_cost),
                        "confidence": anomaly.confidence,
                        "actions": anomaly.recommendations
                    }
                    recommendations["anomaly_based_recommendations"].append(rec)
                    recommendations["potential_savings"] += rec["potential_savings"]
            
            # Pattern-based recommendations
            for pattern in patterns:
                if pattern.trend == "increasing" and pattern.confidence > 0.8:
                    rec = {
                        "type": "trend_optimization",
                        "categories": [cat.value for cat in pattern.cost_categories],
                        "description": f"Optimize increasing trend in {pattern.pattern_type}",
                        "potential_savings": pattern.average_amount * 0.15,  # Estimate 15% savings
                        "confidence": pattern.confidence,
                        "actions": await self._generate_pattern_recommendations(pattern)
                    }
                    recommendations["pattern_based_recommendations"].append(rec)
                    recommendations["potential_savings"] += rec["potential_savings"]
            
            # Forecast-based recommendations
            for forecast in recent_forecasts:
                if forecast.model_accuracy > 0.8:
                    # Check for predicted cost increases
                    future_costs = [p["predicted_cost"] for p in forecast.predictions]
                    if len(future_costs) > 1 and future_costs[-1] > future_costs[0] * 1.2:  # 20% increase
                        rec = {
                            "type": "proactive_optimization",
                            "category": forecast.cost_category.value,
                            "description": f"Proactively optimize before predicted cost increase",
                            "potential_savings": (future_costs[-1] - future_costs[0]) * 0.3,
                            "confidence": forecast.model_accuracy,
                            "actions": await self._generate_forecast_recommendations(forecast)
                        }
                        recommendations["forecast_based_recommendations"].append(rec)
                        recommendations["potential_savings"] += rec["potential_savings"]
            
            # Prioritize recommendations
            all_recs = (
                recommendations["anomaly_based_recommendations"] +
                recommendations["pattern_based_recommendations"] +
                recommendations["forecast_based_recommendations"]
            )
            
            # Sort by potential savings and confidence
            priority_recs = sorted(
                all_recs,
                key=lambda x: x["potential_savings"] * x["confidence"],
                reverse=True
            )
            
            recommendations["priority_actions"] = priority_recs[:5]  # Top 5 recommendations
            
            return recommendations
            
        except Exception as e:
            self.logger.error(f"Failed to get cost optimization recommendations: {e}")
            return {"error": str(e)}
    
    async def get_cost_analytics(
        self,
        tenant_id: str,
        time_period_days: int = 30
    ) -> Dict[str, Any]:
        """Get comprehensive cost analytics."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=time_period_days)
            
            # Filter data for the period
            period_data = [
                dp for dp in self.cost_data[tenant_id]
                if start_date <= dp.timestamp <= end_date
            ]
            
            if not period_data:
                return {"message": "No cost data found for the specified period"}
            
            # Calculate basic metrics
            total_cost = sum(dp.amount for dp in period_data)
            avg_daily_cost = total_cost / time_period_days
            
            # Cost by category
            category_costs = defaultdict(float)
            for dp in period_data:
                category_costs[dp.cost_category.value] += dp.amount
            
            # Cost by service
            service_costs = defaultdict(float)
            for dp in period_data:
                service_costs[dp.service_name] += dp.amount
            
            # Cost by region
            region_costs = defaultdict(float)
            for dp in period_data:
                region_costs[dp.region] += dp.amount
            
            # Trend analysis
            daily_costs = defaultdict(float)
            for dp in period_data:
                day = dp.timestamp.date()
                daily_costs[day] += dp.amount
            
            # Calculate trend
            sorted_days = sorted(daily_costs.keys())
            if len(sorted_days) >= 7:
                recent_avg = np.mean([daily_costs[day] for day in sorted_days[-7:]])
                older_avg = np.mean([daily_costs[day] for day in sorted_days[:7]])
                trend_percentage = ((recent_avg - older_avg) / older_avg) * 100 if older_avg > 0 else 0
            else:
                trend_percentage = 0
            
            # Anomaly summary
            recent_anomalies = [
                a for a in self.anomalies[tenant_id]
                if start_date <= a.detected_at <= end_date
            ]
            
            anomaly_impact = sum(
                abs(a.actual_cost - a.expected_cost) for a in recent_anomalies
            )
            
            return {
                "tenant_id": tenant_id,
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": time_period_days
                },
                "overview": {
                    "total_cost": total_cost,
                    "average_daily_cost": avg_daily_cost,
                    "trend_percentage": trend_percentage,
                    "anomaly_count": len(recent_anomalies),
                    "anomaly_impact": anomaly_impact
                },
                "breakdown": {
                    "by_category": dict(category_costs),
                    "by_service": dict(sorted(service_costs.items(), key=lambda x: x[1], reverse=True)[:10]),
                    "by_region": dict(region_costs)
                },
                "daily_trend": {
                    str(day): cost for day, cost in sorted(daily_costs.items())
                },
                "ml_insights": {
                    "patterns_identified": len(self.spending_patterns.get(tenant_id, [])),
                    "forecast_accuracy": self._get_average_forecast_accuracy(tenant_id),
                    "anomaly_detection_rate": len(recent_anomalies) / max(len(period_data) / 100, 1)
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get cost analytics: {e}")
            return {"error": str(e)}    

    # Private methods
    async def _initialize_models(self) -> None:
        """Initialize ML models."""
        try:
            # Initialize default models for common categories
            for category in CostCategory:
                # LSTM predictor
                self.lstm_predictors[category.value] = LSTMCostPredictor()
                
                # Anomaly detector
                self.anomaly_detectors[category.value] = CostAnomalyDetector()
                
                # Isolation forest
                self.isolation_forests[category.value] = IsolationForest(
                    contamination=0.1,
                    random_state=42
                )
                
                # Clustering model
                self.clustering_models[category.value] = KMeans(
                    n_clusters=5,
                    random_state=42
                )
                
                # Scaler
                self.scalers[category.value] = StandardScaler()
            
            self.logger.info("Initialized ML models")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize models: {e}")
    
    async def _load_historical_data(self) -> None:
        """Load historical cost data."""
        try:
            # In production, this would load from AWS Cost Explorer or database
            self.logger.info("Historical data loading not implemented - starting fresh")
            
        except Exception as e:
            self.logger.error(f"Failed to load historical data: {e}")
    
    async def _detect_category_anomalies(
        self,
        tenant_id: str,
        category: CostCategory,
        data_points: List[CostDataPoint]
    ) -> List[CostAnomaly]:
        """Detect anomalies in a specific cost category."""
        try:
            anomalies = []
            
            # Prepare data for analysis
            df = pd.DataFrame([
                {
                    'timestamp': dp.timestamp,
                    'amount': dp.amount,
                    'service': dp.service_name,
                    'region': dp.region
                }
                for dp in data_points
            ])
            
            # Time-based anomaly detection
            df = df.sort_values('timestamp')
            df['hour'] = df['timestamp'].dt.hour
            df['day_of_week'] = df['timestamp'].dt.dayofweek
            
            # Statistical anomaly detection
            mean_cost = df['amount'].mean()
            std_cost = df['amount'].std()
            threshold = mean_cost + 3 * std_cost  # 3-sigma rule
            
            statistical_anomalies = df[df['amount'] > threshold]
            
            for _, row in statistical_anomalies.iterrows():
                anomaly = CostAnomaly(
                    anomaly_id=str(uuid.uuid4()),
                    tenant_id=tenant_id,
                    detected_at=datetime.utcnow(),
                    anomaly_type=AnomalyType.SPIKE,
                    cost_category=category,
                    severity=min((row['amount'] - mean_cost) / (3 * std_cost), 1.0),
                    expected_cost=mean_cost,
                    actual_cost=row['amount'],
                    deviation_percentage=((row['amount'] - mean_cost) / mean_cost) * 100,
                    affected_resources=[],
                    root_cause_analysis={
                        "method": "statistical",
                        "threshold": threshold,
                        "service": row['service'],
                        "region": row['region']
                    },
                    recommendations=[
                        f"Investigate {row['service']} usage in {row['region']}",
                        "Check for resource scaling events",
                        "Review service configuration"
                    ],
                    confidence=0.8
                )
                anomalies.append(anomaly)
            
            # ML-based anomaly detection using isolation forest
            if len(df) >= 10:
                features = df[['amount', 'hour', 'day_of_week']].values
                
                if category.value in self.isolation_forests:
                    isolation_forest = self.isolation_forests[category.value]
                    
                    # Fit and predict
                    outliers = isolation_forest.fit_predict(features)
                    anomaly_scores = isolation_forest.decision_function(features)
                    
                    for i, (is_outlier, score) in enumerate(zip(outliers, anomaly_scores)):
                        if is_outlier == -1:  # Anomaly detected
                            row = df.iloc[i]
                            anomaly = CostAnomaly(
                                anomaly_id=str(uuid.uuid4()),
                                tenant_id=tenant_id,
                                detected_at=datetime.utcnow(),
                                anomaly_type=AnomalyType.OUTLIER,
                                cost_category=category,
                                severity=min(abs(score) / 2.0, 1.0),
                                expected_cost=mean_cost,
                                actual_cost=row['amount'],
                                deviation_percentage=((row['amount'] - mean_cost) / mean_cost) * 100,
                                affected_resources=[],
                                root_cause_analysis={
                                    "method": "isolation_forest",
                                    "anomaly_score": score,
                                    "service": row['service'],
                                    "region": row['region']
                                },
                                recommendations=[
                                    "Investigate unusual spending pattern",
                                    "Check for configuration changes",
                                    "Review resource utilization"
                                ],
                                confidence=min(abs(score), 0.95)
                            )
                            anomalies.append(anomaly)
            
            return anomalies
            
        except Exception as e:
            self.logger.error(f"Failed to detect category anomalies: {e}")
            return []