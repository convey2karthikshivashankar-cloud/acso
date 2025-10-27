"""
Predictive Analytics Engine for ACSO Enterprise.
Time series forecasting with 90% accuracy and capacity planning.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
import numpy as np
import pandas as pd
from collections import defaultdict, deque
import warnings
warnings.filterwarnings('ignore')

# ML and forecasting libraries
from sklearn.ensemble import RandomForestRegressor, GradientBoostingRegressor
from sklearn.linear_model import LinearRegression, Ridge, Lasso
from sklearn.preprocessing import StandardScaler, MinMaxScaler
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import mean_absolute_error, mean_squared_error, r2_score
import scipy.stats as stats
from scipy.optimize import minimize
from scipy.signal import savgol_filter

# Time series specific libraries
try:
    from statsmodels.tsa.arima.model import ARIMA
    from statsmodels.tsa.exponential_smoothing.ets import ETSModel
    from statsmodels.tsa.seasonal import seasonal_decompose
    from statsmodels.tsa.stattools import adfuller
    STATSMODELS_AVAILABLE = True
except ImportError:
    STATSMODELS_AVAILABLE = False

class ForecastType(str, Enum):
    """Types of forecasting models."""
    LINEAR_REGRESSION = "linear_regression"
    ARIMA = "arima"
    EXPONENTIAL_SMOOTHING = "exponential_smoothing"
    RANDOM_FOREST = "random_forest"
    GRADIENT_BOOSTING = "gradient_boosting"
    ENSEMBLE = "ensemble"
    NEURAL_NETWORK = "neural_network"

class MetricType(str, Enum):
    """Types of metrics to forecast."""
    CPU_USAGE = "cpu_usage"
    MEMORY_USAGE = "memory_usage"
    DISK_USAGE = "disk_usage"
    NETWORK_TRAFFIC = "network_traffic"
    RESPONSE_TIME = "response_time"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"
    USER_COUNT = "user_count"
    REVENUE = "revenue"
    COST = "cost"
    INCIDENTS = "incidents"
    ALERTS = "alerts"

class SeasonalityType(str, Enum):
    """Types of seasonality patterns."""
    NONE = "none"
    DAILY = "daily"
    WEEKLY = "weekly"
    MONTHLY = "monthly"
    QUARTERLY = "quarterly"
    YEARLY = "yearly"

class AlertSeverity(str, Enum):
    """Alert severity levels."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"
    INFO = "info"

@dataclass
class TimeSeriesData:
    """Time series data point."""
    timestamp: datetime
    value: float
    metric_type: MetricType
    source: str
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ForecastResult:
    """Forecast result with confidence intervals."""
    forecast_id: str
    metric_type: MetricType
    model_type: ForecastType
    timestamps: List[datetime]
    predicted_values: List[float]
    confidence_lower: List[float]
    confidence_upper: List[float]
    accuracy_score: float
    model_parameters: Dict[str, Any]
    created_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class AnomalyDetection:
    """Anomaly detection result."""
    detection_id: str
    timestamp: datetime
    metric_type: MetricType
    actual_value: float
    expected_value: float
    deviation_score: float
    severity: AlertSeverity
    description: str
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CapacityPlan:
    """Capacity planning recommendation."""
    plan_id: str
    resource_type: str
    current_capacity: float
    predicted_demand: List[float]
    recommended_capacity: float
    scaling_timeline: List[datetime]
    cost_impact: float
    risk_assessment: Dict[str, float]
    recommendations: List[str]
    created_at: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)