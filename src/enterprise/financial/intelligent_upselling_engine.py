"""
Intelligent Upselling Recommendation System for ACSO Enterprise.
ML-powered recommendation engine with timing optimization and A/B testing.
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
from sklearn.ensemble import RandomForestClassifier, GradientBoostingRegressor
from sklearn.cluster import KMeans
from sklearn.preprocessing import StandardScaler, LabelEncoder
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, precision_score, recall_score, f1_score
import scipy.stats as stats
from scipy.optimize import minimize
import warnings
warnings.filterwarnings('ignore')

class RecommendationType(str, Enum):
    """Types of upselling recommendations."""
    FEATURE_UPGRADE = "feature_upgrade"
    CAPACITY_INCREASE = "capacity_increase"
    PREMIUM_SUPPORT = "premium_support"
    ADDITIONAL_MODULES = "additional_modules"
    ENTERPRISE_FEATURES = "enterprise_features"
    PROFESSIONAL_SERVICES = "professional_services"
    TRAINING_CERTIFICATION = "training_certification"
    EXTENDED_WARRANTY = "extended_warranty"

class RecommendationPriority(str, Enum):
    """Priority levels for recommendations."""
    CRITICAL = "critical"
    HIGH = "high"
    MEDIUM = "medium"
    LOW = "low"

class CustomerSegment(str, Enum):
    """Customer segmentation categories."""
    ENTERPRISE = "enterprise"
    MID_MARKET = "mid_market"
    SMALL_BUSINESS = "small_business"
    STARTUP = "startup"
    GOVERNMENT = "government"
    EDUCATION = "education"

class RecommendationStatus(str, Enum):
    """Status of recommendations."""
    PENDING = "pending"
    PRESENTED = "presented"
    ACCEPTED = "accepted"
    DECLINED = "declined"
    EXPIRED = "expired"

@dataclass
class UsagePattern:
    """Customer usage pattern data."""
    customer_id: str
    feature_usage: Dict[str, float]  # Feature name -> usage percentage
    capacity_utilization: Dict[str, float]  # Resource -> utilization percentage
    support_tickets: int
    login_frequency: float
    session_duration: float
    api_calls_per_day: int
    data_volume_gb: float
    user_count: int
    integration_count: int
    custom_workflows: int
    advanced_features_used: List[str]
    timestamp: datetime
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class CustomerProfile:
    """Comprehensive customer profile."""
    customer_id: str
    tenant_id: str
    company_name: str
    industry: str
    company_size: int
    segment: CustomerSegment
    subscription_tier: str
    monthly_revenue: float
    contract_start_date: datetime
    contract_end_date: datetime
    payment_history: List[Dict[str, Any]]
    usage_patterns: List[UsagePattern]
    support_satisfaction: float
    churn_risk_score: float
    expansion_potential: float
    decision_makers: List[Dict[str, str]]
    technology_stack: List[str]
    compliance_requirements: List[str]
    geographic_region: str
    preferred_communication: str
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class UpsellOpportunity:
    """Identified upselling opportunity."""
    opportunity_id: str
    customer_id: str
    recommendation_type: RecommendationType
    product_service: str
    description: str
    business_justification: str
    estimated_value: float
    probability_score: float
    priority: RecommendationPriority
    optimal_timing: datetime
    expiration_date: datetime
    required_approvers: List[str]
    supporting_data: Dict[str, Any]
    competitive_analysis: Dict[str, Any]
    roi_projection: Dict[str, float]
    implementation_timeline: str
    success_metrics: List[str]
    created_at: datetime
    status: RecommendationStatus = RecommendationStatus.PENDING
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ABTestVariant:
    """A/B test variant configuration."""
    variant_id: str
    name: str
    description: str
    recommendation_strategy: str
    timing_algorithm: str
    presentation_format: str
    incentive_structure: Dict[str, Any]
    target_segment: Optional[CustomerSegment]
    weight: float  # Traffic allocation percentage
    success_metrics: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class ABTestResult:
    """A/B test results and analysis."""
    test_id: str
    variant_results: Dict[str, Dict[str, float]]
    statistical_significance: Dict[str, float]
    confidence_intervals: Dict[str, Tuple[float, float]]
    winner: Optional[str]
    lift: Dict[str, float]
    sample_sizes: Dict[str, int]
    test_duration_days: int
    conclusions: List[str]
    recommendations: List[str]
    metadata: Dict[str, Any] = field(default_factory=dict)

class CustomerSegmentationEngine:
    """ML-powered customer segmentation engine."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.segmentation_model = KMeans(n_clusters=6, random_state=42)
        self.scaler = StandardScaler()
        self.feature_columns = [
            'monthly_revenue', 'user_count', 'api_calls_per_day', 
            'data_volume_gb', 'support_tickets', 'session_duration',
            'feature_usage_avg', 'capacity_utilization_avg'
        ]
        self.is_trained = False
    
    def prepare_features(self, customers: List[CustomerProfile]) -> pd.DataFrame:
        """Prepare features for segmentation."""
        try:
            data = []
            for customer in customers:
                if not customer.usage_patterns:
                    continue
                
                latest_usage = customer.usage_patterns[-1]
                
                # Calculate aggregated metrics
                feature_usage_avg = np.mean(list(latest_usage.feature_usage.values())) if latest_usage.feature_usage else 0
                capacity_utilization_avg = np.mean(list(latest_usage.capacity_utilization.values())) if latest_usage.capacity_utilization else 0
                
                row = {
                    'customer_id': customer.customer_id,
                    'monthly_revenue': customer.monthly_revenue,
                    'user_count': latest_usage.user_count,
                    'api_calls_per_day': latest_usage.api_calls_per_day,
                    'data_volume_gb': latest_usage.data_volume_gb,
                    'support_tickets': latest_usage.support_tickets,
                    'session_duration': latest_usage.session_duration,
                    'feature_usage_avg': feature_usage_avg,
                    'capacity_utilization_avg': capacity_utilization_avg
                }
                data.append(row)
            
            return pd.DataFrame(data)
        except Exception as e:
            self.logger.error(f"Failed to prepare segmentation features: {e}")
            return pd.DataFrame()
    
    def train_segmentation_model(self, customers: List[CustomerProfile]) -> bool:
        """Train the customer segmentation model."""
        try:
            df = self.prepare_features(customers)
            if df.empty:
                return False
            
            # Prepare features for training
            X = df[self.feature_columns].fillna(0)
            
            # Scale features
            X_scaled = self.scaler.fit_transform(X)
            
            # Train clustering model
            self.segmentation_model.fit(X_scaled)
            self.is_trained = True
            
            self.logger.info("Customer segmentation model trained successfully")
            return True
        except Exception as e:
            self.logger.error(f"Failed to train segmentation model: {e}")
            return False
    
    def predict_segment(self, customer: CustomerProfile) -> int:
        """Predict customer segment."""
        try:
            if not self.is_trained:
                return 0
            
            df = self.prepare_features([customer])
            if df.empty:
                return 0
            
            X = df[self.feature_columns].fillna(0)
            X_scaled = self.scaler.transform(X)
            
            return self.segmentation_model.predict(X_scaled)[0]
        except Exception as e:
            self.logger.error(f"Failed to predict customer segment: {e}")
            return 0

class RecommendationEngine:
    """Core recommendation engine using ML algorithms."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.propensity_model = RandomForestClassifier(n_estimators=100, random_state=42)
        self.value_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.timing_model = GradientBoostingRegressor(n_estimators=100, random_state=42)
        self.scaler = StandardScaler()
        self.label_encoders = {}
        self.is_trained = False
        
        # Feature importance tracking
        self.feature_importance = {}
        self.model_performance = {}
    
    def prepare_training_data(self, 
                            customers: List[CustomerProfile],
                            historical_opportunities: List[UpsellOpportunity]) -> Tuple[pd.DataFrame, pd.DataFrame, pd.DataFrame]:
        """Prepare training data for ML models."""
        try:
            training_data = []
            
            for customer in customers:
                if not customer.usage_patterns:
                    continue
                
                latest_usage = customer.usage_patterns[-1]
                
                # Find historical opportunities for this customer
                customer_opportunities = [
                    opp for opp in historical_opportunities 
                    if opp.customer_id == customer.customer_id
                ]
                
                # Create training examples
                for opp in customer_opportunities:
                    row = self._create_feature_row(customer, latest_usage, opp)
                    training_data.append(row)
            
            if not training_data:
                return pd.DataFrame(), pd.DataFrame(), pd.DataFrame()
            
            df = pd.DataFrame(training_data)
            
            # Separate features and targets
            feature_cols = [col for col in df.columns if not col.startswith('target_')]
            
            X = df[feature_cols]
            y_propensity = df['target_accepted']
            y_value = df['target_value']
            y_timing = df['target_days_to_decision']
            
            return X, y_propensity, y_value, y_timing
        except Exception as e:
            self.logger.error(f"Failed to prepare training data: {e}")
            return pd.DataFrame(), pd.DataFrame(), pd.DataFrame(), pd.DataFrame()
    
    def _create_feature_row(self, customer: CustomerProfile, usage: UsagePattern, opportunity: UpsellOpportunity) -> Dict[str, Any]:
        """Create feature row for training."""
        try:
            # Calculate derived features
            contract_age_days = (datetime.utcnow() - customer.contract_start_date).days
            contract_remaining_days = (customer.contract_end_date - datetime.utcnow()).days
            
            feature_usage_avg = np.mean(list(usage.feature_usage.values())) if usage.feature_usage else 0
            capacity_utilization_avg = np.mean(list(usage.capacity_utilization.values())) if usage.capacity_utilization else 0
            
            # Advanced features used ratio
            advanced_features_ratio = len(usage.advanced_features_used) / max(len(usage.feature_usage), 1)
            
            row = {
                # Customer features
                'monthly_revenue': customer.monthly_revenue,
                'company_size': customer.company_size,
                'contract_age_days': contract_age_days,
                'contract_remaining_days': contract_remaining_days,
                'churn_risk_score': customer.churn_risk_score,
                'expansion_potential': customer.expansion_potential,
                'support_satisfaction': customer.support_satisfaction,
                
                # Usage features
                'user_count': usage.user_count,
                'api_calls_per_day': usage.api_calls_per_day,
                'data_volume_gb': usage.data_volume_gb,
                'support_tickets': usage.support_tickets,
                'login_frequency': usage.login_frequency,
                'session_duration': usage.session_duration,
                'integration_count': usage.integration_count,
                'custom_workflows': usage.custom_workflows,
                'feature_usage_avg': feature_usage_avg,
                'capacity_utilization_avg': capacity_utilization_avg,
                'advanced_features_ratio': advanced_features_ratio,
                
                # Categorical features (will be encoded)
                'industry': customer.industry,
                'segment': customer.segment.value,
                'subscription_tier': customer.subscription_tier,
                'recommendation_type': opportunity.recommendation_type.value,
                'geographic_region': customer.geographic_region,
                
                # Targets
                'target_accepted': 1 if opportunity.status == RecommendationStatus.ACCEPTED else 0,
                'target_value': opportunity.estimated_value,
                'target_days_to_decision': (opportunity.created_at - customer.contract_start_date).days
            }
            
            return row
        except Exception as e:
            self.logger.error(f"Failed to create feature row: {e}")
            return {}
    
    def train_models(self, customers: List[CustomerProfile], historical_opportunities: List[UpsellOpportunity]) -> bool:
        """Train all ML models."""
        try:
            X, y_propensity, y_value, y_timing = self.prepare_training_data(customers, historical_opportunities)
            
            if X.empty:
                self.logger.warning("No training data available")
                return False
            
            # Encode categorical features
            categorical_cols = ['industry', 'segment', 'subscription_tier', 'recommendation_type', 'geographic_region']
            
            for col in categorical_cols:
                if col in X.columns:
                    le = LabelEncoder()
                    X[col] = le.fit_transform(X[col].astype(str))
                    self.label_encoders[col] = le
            
            # Scale numerical features
            X_scaled = self.scaler.fit_transform(X)
            
            # Split data for validation
            X_train, X_test, y_prop_train, y_prop_test = train_test_split(
                X_scaled, y_propensity, test_size=0.2, random_state=42
            )
            
            # Train propensity model
            self.propensity_model.fit(X_train, y_prop_train)
            prop_pred = self.propensity_model.predict(X_test)
            
            # Train value model (only on accepted opportunities)
            accepted_mask = y_propensity == 1
            if accepted_mask.sum() > 10:  # Need minimum samples
                X_value = X_scaled[accepted_mask]
                y_value_filtered = y_value[accepted_mask]
                
                X_val_train, X_val_test, y_val_train, y_val_test = train_test_split(
                    X_value, y_value_filtered, test_size=0.2, random_state=42
                )
                
                self.value_model.fit(X_val_train, y_val_train)
                val_pred = self.value_model.predict(X_val_test)
                
                # Store value model performance
                self.model_performance['value_r2'] = self.value_model.score(X_val_test, y_val_test)
            
            # Train timing model
            self.timing_model.fit(X_train, y_timing[y_propensity.index[:len(X_train)]])
            
            # Store model performance
            self.model_performance['propensity_accuracy'] = accuracy_score(y_prop_test, prop_pred)
            self.model_performance['propensity_precision'] = precision_score(y_prop_test, prop_pred, average='weighted')
            self.model_performance['propensity_recall'] = recall_score(y_prop_test, prop_pred, average='weighted')
            self.model_performance['propensity_f1'] = f1_score(y_prop_test, prop_pred, average='weighted')
            
            # Store feature importance
            feature_names = X.columns.tolist()
            self.feature_importance['propensity'] = dict(zip(feature_names, self.propensity_model.feature_importances_))
            self.feature_importance['value'] = dict(zip(feature_names, self.value_model.feature_importances_))
            self.feature_importance['timing'] = dict(zip(feature_names, self.timing_model.feature_importances_))
            
            self.is_trained = True
            self.logger.info("Recommendation models trained successfully")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to train recommendation models: {e}")
            return False
    
    def predict_opportunity(self, customer: CustomerProfile, recommendation_type: RecommendationType) -> Dict[str, float]:
        """Predict opportunity metrics for a customer and recommendation type."""
        try:
            if not self.is_trained:
                return {'propensity': 0.5, 'value': 0.0, 'timing_days': 30}
            
            # Create feature row
            if not customer.usage_patterns:
                return {'propensity': 0.5, 'value': 0.0, 'timing_days': 30}
            
            latest_usage = customer.usage_patterns[-1]
            
            # Create dummy opportunity for feature extraction
            dummy_opportunity = UpsellOpportunity(
                opportunity_id="dummy",
                customer_id=customer.customer_id,
                recommendation_type=recommendation_type,
                product_service="dummy",
                description="dummy",
                business_justification="dummy",
                estimated_value=0,
                probability_score=0,
                priority=RecommendationPriority.MEDIUM,
                optimal_timing=datetime.utcnow(),
                expiration_date=datetime.utcnow(),
                required_approvers=[],
                supporting_data={},
                competitive_analysis={},
                roi_projection={},
                implementation_timeline="dummy",
                success_metrics=[],
                created_at=datetime.utcnow()
            )
            
            feature_row = self._create_feature_row(customer, latest_usage, dummy_opportunity)
            
            # Remove target columns
            feature_row = {k: v for k, v in feature_row.items() if not k.startswith('target_')}
            
            # Create DataFrame
            X = pd.DataFrame([feature_row])
            
            # Encode categorical features
            categorical_cols = ['industry', 'segment', 'subscription_tier', 'recommendation_type', 'geographic_region']
            
            for col in categorical_cols:
                if col in X.columns and col in self.label_encoders:
                    try:
                        X[col] = self.label_encoders[col].transform(X[col].astype(str))
                    except ValueError:
                        # Handle unseen categories
                        X[col] = 0
            
            # Scale features
            X_scaled = self.scaler.transform(X)
            
            # Make predictions
            propensity = self.propensity_model.predict_proba(X_scaled)[0][1]  # Probability of acceptance
            value = max(0, self.value_model.predict(X_scaled)[0])
            timing_days = max(1, self.timing_model.predict(X_scaled)[0])
            
            return {
                'propensity': propensity,
                'value': value,
                'timing_days': timing_days
            }
            
        except Exception as e:
            self.logger.error(f"Failed to predict opportunity: {e}")
            return {'propensity': 0.5, 'value': 0.0, 'timing_days': 30}

class TimingOptimizer:
    """Optimize timing for upselling recommendations."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.optimal_timing_rules = self._initialize_timing_rules()
    
    def _initialize_timing_rules(self) -> Dict[str, Dict[str, Any]]:
        """Initialize timing optimization rules."""
        return {
            'contract_renewal': {
                'optimal_window_days': 90,  # 90 days before renewal
                'weight': 0.3
            },
            'usage_spike': {
                'threshold_increase': 0.2,  # 20% usage increase
                'window_days': 14,
                'weight': 0.25
            },
            'support_satisfaction': {
                'min_score': 4.0,  # Out of 5
                'weight': 0.2
            },
            'business_quarter': {
                'preferred_months': [3, 6, 9, 12],  # End of quarters
                'weight': 0.15
            },
            'competitive_events': {
                'avoid_periods': [],  # To be populated with competitor events
                'weight': 0.1
            }
        }
    
    def calculate_optimal_timing(self, customer: CustomerProfile, recommendation_type: RecommendationType) -> datetime:
        """Calculate optimal timing for a recommendation."""
        try:
            base_date = datetime.utcnow()
            timing_scores = []
            
            # Evaluate next 180 days
            for days_ahead in range(0, 181, 7):  # Weekly intervals
                candidate_date = base_date + timedelta(days=days_ahead)
                score = self._calculate_timing_score(customer, candidate_date, recommendation_type)
                timing_scores.append((candidate_date, score))
            
            # Find date with highest score
            optimal_date, best_score = max(timing_scores, key=lambda x: x[1])
            
            return optimal_date
            
        except Exception as e:
            self.logger.error(f"Failed to calculate optimal timing: {e}")
            return datetime.utcnow() + timedelta(days=30)  # Default to 30 days
    
    def _calculate_timing_score(self, customer: CustomerProfile, candidate_date: datetime, recommendation_type: RecommendationType) -> float:
        """Calculate timing score for a specific date."""
        try:
            score = 0.0
            
            # Contract renewal timing
            days_to_renewal = (customer.contract_end_date - candidate_date).days
            if 0 < days_to_renewal <= self.optimal_timing_rules['contract_renewal']['optimal_window_days']:
                renewal_score = 1.0 - (days_to_renewal / self.optimal_timing_rules['contract_renewal']['optimal_window_days'])
                score += renewal_score * self.optimal_timing_rules['contract_renewal']['weight']
            
            # Usage trend analysis
            if len(customer.usage_patterns) >= 2:
                recent_usage = customer.usage_patterns[-1]
                previous_usage = customer.usage_patterns[-2]
                
                # Calculate usage increase
                recent_avg = np.mean(list(recent_usage.capacity_utilization.values())) if recent_usage.capacity_utilization else 0
                previous_avg = np.mean(list(previous_usage.capacity_utilization.values())) if previous_usage.capacity_utilization else 0
                
                if previous_avg > 0:
                    usage_increase = (recent_avg - previous_avg) / previous_avg
                    if usage_increase >= self.optimal_timing_rules['usage_spike']['threshold_increase']:
                        score += self.optimal_timing_rules['usage_spike']['weight']
            
            # Support satisfaction
            if customer.support_satisfaction >= self.optimal_timing_rules['support_satisfaction']['min_score']:
                score += self.optimal_timing_rules['support_satisfaction']['weight']
            
            # Business quarter timing
            if candidate_date.month in self.optimal_timing_rules['business_quarter']['preferred_months']:
                # Prefer last 2 weeks of quarter
                days_in_month = (candidate_date.replace(month=candidate_date.month % 12 + 1, day=1) - timedelta(days=1)).day
                if candidate_date.day > days_in_month - 14:
                    score += self.optimal_timing_rules['business_quarter']['weight']
            
            # Avoid weekends and holidays
            if candidate_date.weekday() < 5:  # Monday = 0, Friday = 4
                score += 0.1
            
            return score
            
        except Exception as e:
            self.logger.error(f"Failed to calculate timing score: {e}")
            return 0.0

class ABTestingFramework:
    """A/B testing framework for recommendation strategies."""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.active_tests = {}
        self.test_results = {}
        self.traffic_allocator = {}
    
    def create_ab_test(self, 
                      test_name: str,
                      variants: List[ABTestVariant],
                      target_customers: List[str],
                      duration_days: int = 30) -> str:
        """Create a new A/B test."""
        try:
            test_id = str(uuid.uuid4())
            
            # Validate traffic allocation
            total_weight = sum(variant.weight for variant in variants)
            if abs(total_weight - 1.0) > 0.01:
                raise ValueError("Variant weights must sum to 1.0")
            
            test_config = {
                'test_id': test_id,
                'name': test_name,
                'variants': {v.variant_id: v for v in variants},
                'target_customers': set(target_customers),
                'start_date': datetime.utcnow(),
                'end_date': datetime.utcnow() + timedelta(days=duration_days),
                'customer_assignments': {},
                'results': defaultdict(lambda: defaultdict(list))
            }
            
            self.active_tests[test_id] = test_config
            
            # Initialize traffic allocator
            self.traffic_allocator[test_id] = self._create_traffic_allocator(variants)
            
            self.logger.info(f"Created A/B test: {test_name} ({test_id})")
            return test_id
            
        except Exception as e:
            self.logger.error(f"Failed to create A/B test: {e}")
            return ""
    
    def _create_traffic_allocator(self, variants: List[ABTestVariant]) -> Dict[str, Tuple[float, float]]:
        """Create traffic allocation ranges for variants."""
        allocator = {}
        cumulative_weight = 0.0
        
        for variant in variants:
            start_range = cumulative_weight
            end_range = cumulative_weight + variant.weight
            allocator[variant.variant_id] = (start_range, end_range)
            cumulative_weight = end_range
        
        return allocator
    
    def assign_customer_to_variant(self, test_id: str, customer_id: str) -> Optional[str]:
        """Assign customer to a test variant."""
        try:
            if test_id not in self.active_tests:
                return None
            
            test_config = self.active_tests[test_id]
            
            # Check if customer is in target group
            if customer_id not in test_config['target_customers']:
                return None
            
            # Check if already assigned
            if customer_id in test_config['customer_assignments']:
                return test_config['customer_assignments'][customer_id]
            
            # Assign based on hash for consistency
            import hashlib
            hash_value = int(hashlib.md5(f"{test_id}_{customer_id}".encode()).hexdigest(), 16)
            random_value = (hash_value % 10000) / 10000.0  # 0.0 to 1.0
            
            # Find matching variant
            allocator = self.traffic_allocator[test_id]
            for variant_id, (start, end) in allocator.items():
                if start <= random_value < end:
                    test_config['customer_assignments'][customer_id] = variant_id
                    return variant_id
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to assign customer to variant: {e}")
            return None
    
    def record_test_event(self, test_id: str, customer_id: str, event_type: str, value: float = 1.0):
        """Record an event for A/B test analysis."""
        try:
            if test_id not in self.active_tests:
                return
            
            test_config = self.active_tests[test_id]
            variant_id = test_config['customer_assignments'].get(customer_id)
            
            if variant_id:
                test_config['results'][variant_id][event_type].append(value)
                
        except Exception as e:
            self.logger.error(f"Failed to record test event: {e}")
    
    def analyze_test_results(self, test_id: str) -> Optional[ABTestResult]:
        """Analyze A/B test results."""
        try:
            if test_id not in self.active_tests:
                return None
            
            test_config = self.active_tests[test_id]
            results = test_config['results']
            
            if not results:
                return None
            
            # Calculate metrics for each variant
            variant_metrics = {}
            for variant_id, events in results.items():
                metrics = {}
                for event_type, values in events.items():
                    if values:
                        metrics[f"{event_type}_mean"] = np.mean(values)
                        metrics[f"{event_type}_count"] = len(values)
                        metrics[f"{event_type}_sum"] = sum(values)
                
                variant_metrics[variant_id] = metrics
            
            # Statistical significance testing
            significance_results = {}
            confidence_intervals = {}
            
            variant_ids = list(variant_metrics.keys())
            if len(variant_ids) >= 2:
                control_variant = variant_ids[0]  # First variant as control
                
                for variant_id in variant_ids[1:]:
                    # Compare conversion rates (assuming binary events)
                    control_conversions = results[control_variant].get('conversion', [])
                    test_conversions = results[variant_id].get('conversion', [])
                    
                    if control_conversions and test_conversions:
                        # Two-proportion z-test
                        control_rate = np.mean(control_conversions)
                        test_rate = np.mean(test_conversions)
                        
                        n1, n2 = len(control_conversions), len(test_conversions)
                        p_pooled = (sum(control_conversions) + sum(test_conversions)) / (n1 + n2)
                        
                        se = np.sqrt(p_pooled * (1 - p_pooled) * (1/n1 + 1/n2))
                        z_score = (test_rate - control_rate) / se if se > 0 else 0
                        p_value = 2 * (1 - stats.norm.cdf(abs(z_score)))
                        
                        significance_results[f"{control_variant}_vs_{variant_id}"] = p_value
                        
                        # Confidence interval for difference
                        margin_error = 1.96 * se  # 95% CI
                        diff = test_rate - control_rate
                        confidence_intervals[f"{control_variant}_vs_{variant_id}"] = (
                            diff - margin_error, diff + margin_error
                        )
            
            # Determine winner
            winner = None
            if variant_metrics:
                # Simple winner selection based on conversion rate
                conversion_rates = {}
                for variant_id, metrics in variant_metrics.items():
                    conversion_rates[variant_id] = metrics.get('conversion_mean', 0)
                
                if conversion_rates:
                    winner = max(conversion_rates.items(), key=lambda x: x[1])[0]
            
            # Calculate lift
            lift_results = {}
            if winner and len(variant_metrics) > 1:
                winner_rate = variant_metrics[winner].get('conversion_mean', 0)
                for variant_id, metrics in variant_metrics.items():
                    if variant_id != winner:
                        variant_rate = metrics.get('conversion_mean', 0)
                        if variant_rate > 0:
                            lift_results[variant_id] = ((winner_rate - variant_rate) / variant_rate) * 100
            
            # Sample sizes
            sample_sizes = {}
            for variant_id, metrics in variant_metrics.items():
                sample_sizes[variant_id] = metrics.get('conversion_count', 0)
            
            test_duration = (datetime.utcnow() - test_config['start_date']).days
            
            return ABTestResult(
                test_id=test_id,
                variant_results=variant_metrics,
                statistical_significance=significance_results,
                confidence_intervals=confidence_intervals,
                winner=winner,
                lift=lift_results,
                sample_sizes=sample_sizes,
                test_duration_days=test_duration,
                conclusions=[],  # To be filled based on results
                recommendations=[]  # To be filled based on results
            )
            
        except Exception as e:
            self.logger.error(f"Failed to analyze test results: {e}")
            return None

class IntelligentUpsellingEngine:
    """
    Main intelligent upselling recommendation system.
    Features:
    - ML-powered customer segmentation and propensity modeling
    - Usage pattern analysis and opportunity identification
    - Timing optimization for maximum conversion
    - A/B testing framework for strategy optimization
    - Real-time recommendation generation and tracking
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Core components
        self.segmentation_engine = CustomerSegmentationEngine()
        self.recommendation_engine = RecommendationEngine()
        self.timing_optimizer = TimingOptimizer()
        self.ab_testing = ABTestingFramework()
        
        # Data storage
        self.customer_profiles: Dict[str, CustomerProfile] = {}
        self.opportunities: Dict[str, UpsellOpportunity] = {}
        self.historical_opportunities: List[UpsellOpportunity] = []
        
        # Configuration
        self.recommendation_rules = self._initialize_recommendation_rules()
        self.business_rules = self._initialize_business_rules()
        
        # Performance tracking
        self.performance_metrics = defaultdict(list)
        self.recommendation_history = deque(maxlen=10000)
        
        # Background tasks
        self.processing_tasks: List[asyncio.Task] = []
        self.system_active = False
    
    async def initialize(self) -> None:
        """Initialize the upselling engine."""
        try:
            self.logger.info("Initializing Intelligent Upselling Engine")
            
            # Load historical data
            await self._load_historical_data()
            
            # Train ML models
            if self.customer_profiles and self.historical_opportunities:
                customers = list(self.customer_profiles.values())
                
                # Train segmentation model
                self.segmentation_engine.train_segmentation_model(customers)
                
                # Train recommendation models
                self.recommendation_engine.train_models(customers, self.historical_opportunities)
            
            # Start background processing
            self.system_active = True
            self.processing_tasks = [
                asyncio.create_task(self._opportunity_scanner()),
                asyncio.create_task(self._model_retrainer()),
                asyncio.create_task(self._performance_monitor())
            ]
            
            self.logger.info("Intelligent Upselling Engine initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize upselling engine: {e}")
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the upselling engine."""
        try:
            self.logger.info("Shutting down Intelligent Upselling Engine")
            self.system_active = False
            
            # Cancel background tasks
            for task in self.processing_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            self.logger.info("Intelligent Upselling Engine shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
    
    async def generate_recommendations(self, customer_id: str, limit: int = 5) -> List[UpsellOpportunity]:
        """Generate upselling recommendations for a customer."""
        try:
            customer = self.customer_profiles.get(customer_id)
            if not customer:
                self.logger.warning(f"Customer not found: {customer_id}")
                return []
            
            recommendations = []
            
            # Generate recommendations for each type
            for rec_type in RecommendationType:
                opportunity = await self._generate_opportunity(customer, rec_type)
                if opportunity and opportunity.probability_score > 0.3:  # Minimum threshold
                    recommendations.append(opportunity)
            
            # Sort by priority and probability
            recommendations.sort(key=lambda x: (x.priority.value, -x.probability_score))
            
            # Apply business rules filtering
            filtered_recommendations = self._apply_business_rules(customer, recommendations)
            
            # Limit results
            final_recommendations = filtered_recommendations[:limit]
            
            # Store recommendations
            for rec in final_recommendations:
                self.opportunities[rec.opportunity_id] = rec
                self.recommendation_history.append({
                    'customer_id': customer_id,
                    'opportunity_id': rec.opportunity_id,
                    'recommendation_type': rec.recommendation_type.value,
                    'probability_score': rec.probability_score,
                    'estimated_value': rec.estimated_value,
                    'generated_at': datetime.utcnow()
                })
            
            self.logger.info(f"Generated {len(final_recommendations)} recommendations for customer {customer_id}")
            return final_recommendations
            
        except Exception as e:
            self.logger.error(f"Failed to generate recommendations for customer {customer_id}: {e}")
            return []    

    async def _generate_opportunity(self, customer: CustomerProfile, rec_type: RecommendationType) -> Optional[UpsellOpportunity]:
        """Generate a specific upselling opportunity."""
        try:
            # Get ML predictions
            predictions = self.recommendation_engine.predict_opportunity(customer, rec_type)
            
            if predictions['propensity'] < 0.2:  # Too low probability
                return None
            
            # Calculate optimal timing
            optimal_timing = self.timing_optimizer.calculate_optimal_timing(customer, rec_type)
            
            # Generate opportunity details based on type
            opportunity_details = self._generate_opportunity_details(customer, rec_type, predictions)
            
            if not opportunity_details:
                return None
            
            # Create opportunity
            opportunity = UpsellOpportunity(
                opportunity_id=str(uuid.uuid4()),
                customer_id=customer.customer_id,
                recommendation_type=rec_type,
                product_service=opportunity_details['product_service'],
                description=opportunity_details['description'],
                business_justification=opportunity_details['business_justification'],
                estimated_value=predictions['value'],
                probability_score=predictions['propensity'],
                priority=self._calculate_priority(predictions['propensity'], predictions['value']),
                optimal_timing=optimal_timing,
                expiration_date=optimal_timing + timedelta(days=30),
                required_approvers=opportunity_details['required_approvers'],
                supporting_data=opportunity_details['supporting_data'],
                competitive_analysis=opportunity_details['competitive_analysis'],
                roi_projection=opportunity_details['roi_projection'],
                implementation_timeline=opportunity_details['implementation_timeline'],
                success_metrics=opportunity_details['success_metrics'],
                created_at=datetime.utcnow()
            )
            
            return opportunity
            
        except Exception as e:
            self.logger.error(f"Failed to generate opportunity: {e}")
            return None
    
    def _generate_opportunity_details(self, customer: CustomerProfile, rec_type: RecommendationType, predictions: Dict[str, float]) -> Optional[Dict[str, Any]]:
        """Generate detailed opportunity information based on type."""
        try:
            if not customer.usage_patterns:
                return None
            
            latest_usage = customer.usage_patterns[-1]
            
            if rec_type == RecommendationType.FEATURE_UPGRADE:
                return self._generate_feature_upgrade_details(customer, latest_usage, predictions)
            elif rec_type == RecommendationType.CAPACITY_INCREASE:
                return self._generate_capacity_increase_details(customer, latest_usage, predictions)
            elif rec_type == RecommendationType.PREMIUM_SUPPORT:
                return self._generate_premium_support_details(customer, latest_usage, predictions)
            elif rec_type == RecommendationType.ADDITIONAL_MODULES:
                return self._generate_additional_modules_details(customer, latest_usage, predictions)
            elif rec_type == RecommendationType.ENTERPRISE_FEATURES:
                return self._generate_enterprise_features_details(customer, latest_usage, predictions)
            elif rec_type == RecommendationType.PROFESSIONAL_SERVICES:
                return self._generate_professional_services_details(customer, latest_usage, predictions)
            elif rec_type == RecommendationType.TRAINING_CERTIFICATION:
                return self._generate_training_certification_details(customer, latest_usage, predictions)
            elif rec_type == RecommendationType.EXTENDED_WARRANTY:
                return self._generate_extended_warranty_details(customer, latest_usage, predictions)
            
            return None
            
        except Exception as e:
            self.logger.error(f"Failed to generate opportunity details: {e}")
            return None
    
    def _generate_feature_upgrade_details(self, customer: CustomerProfile, usage: UsagePattern, predictions: Dict[str, float]) -> Dict[str, Any]:
        """Generate feature upgrade opportunity details."""
        # Analyze which features are heavily used
        high_usage_features = [
            feature for feature, usage_pct in usage.feature_usage.items()
            if usage_pct > 0.8
        ]
        
        return {
            'product_service': 'Advanced Feature Package',
            'description': f'Upgrade to premium features based on high usage of {", ".join(high_usage_features[:3])}',
            'business_justification': f'Current feature utilization at {np.mean(list(usage.feature_usage.values())):.1%} indicates readiness for advanced capabilities',
            'required_approvers': ['IT Director', 'Finance Manager'],
            'supporting_data': {
                'current_feature_usage': usage.feature_usage,
                'usage_trend': 'increasing',
                'user_feedback': 'positive'
            },
            'competitive_analysis': {
                'competitor_offerings': ['Advanced Analytics', 'Custom Workflows', 'API Access'],
                'our_advantage': 'Integrated platform with seamless upgrade path'
            },
            'roi_projection': {
                'efficiency_gain': 0.25,
                'time_savings_hours_per_month': 40,
                'payback_period_months': 6
            },
            'implementation_timeline': '2-4 weeks',
            'success_metrics': ['Feature adoption rate', 'User satisfaction', 'Productivity metrics']
        }
    
    def _generate_capacity_increase_details(self, customer: CustomerProfile, usage: UsagePattern, predictions: Dict[str, float]) -> Dict[str, Any]:
        """Generate capacity increase opportunity details."""
        avg_utilization = np.mean(list(usage.capacity_utilization.values())) if usage.capacity_utilization else 0
        
        return {
            'product_service': 'Capacity Expansion Package',
            'description': f'Increase system capacity to handle growing data volume ({usage.data_volume_gb:.1f}GB) and user base ({usage.user_count} users)',
            'business_justification': f'Current capacity utilization at {avg_utilization:.1%} approaching recommended limits',
            'required_approvers': ['IT Director', 'Operations Manager'],
            'supporting_data': {
                'current_utilization': usage.capacity_utilization,
                'growth_rate': '15% monthly',
                'performance_impact': 'response time degradation observed'
            },
            'competitive_analysis': {
                'competitor_offerings': ['Elastic scaling', 'Premium tiers'],
                'our_advantage': 'Predictable pricing with performance guarantees'
            },
            'roi_projection': {
                'performance_improvement': 0.3,
                'downtime_reduction': 0.8,
                'payback_period_months': 4
            },
            'implementation_timeline': '1-2 weeks',
            'success_metrics': ['System performance', 'User satisfaction', 'Uptime metrics']
        }
    
    def _generate_premium_support_details(self, customer: CustomerProfile, usage: UsagePattern, predictions: Dict[str, float]) -> Dict[str, Any]:
        """Generate premium support opportunity details."""
        return {
            'product_service': 'Premium Support Package',
            'description': f'Upgrade to 24/7 premium support with dedicated account management',
            'business_justification': f'Current support ticket volume ({usage.support_tickets}) and business criticality warrant premium service',
            'required_approvers': ['IT Director', 'Finance Manager'],
            'supporting_data': {
                'current_support_tickets': usage.support_tickets,
                'resolution_time_improvement': '60% faster',
                'dedicated_support_manager': True
            },
            'competitive_analysis': {
                'competitor_offerings': ['Standard support', 'Email-only support'],
                'our_advantage': 'Proactive monitoring and dedicated resources'
            },
            'roi_projection': {
                'downtime_reduction': 0.7,
                'productivity_gain': 0.2,
                'payback_period_months': 3
            },
            'implementation_timeline': 'Immediate',
            'success_metrics': ['Response time', 'Resolution time', 'Customer satisfaction']
        }
    
    def _generate_additional_modules_details(self, customer: CustomerProfile, usage: UsagePattern, predictions: Dict[str, float]) -> Dict[str, Any]:
        """Generate additional modules opportunity details."""
        return {
            'product_service': 'Additional Security Modules',
            'description': 'Add advanced threat detection and compliance modules to enhance security posture',
            'business_justification': f'Industry ({customer.industry}) compliance requirements and security best practices',
            'required_approvers': ['CISO', 'IT Director', 'Compliance Officer'],
            'supporting_data': {
                'compliance_requirements': customer.compliance_requirements,
                'security_gaps': ['Advanced threat detection', 'Compliance reporting'],
                'industry_benchmarks': 'Above average security investment needed'
            },
            'competitive_analysis': {
                'competitor_offerings': ['Basic security', 'Third-party integrations'],
                'our_advantage': 'Native integration with existing platform'
            },
            'roi_projection': {
                'risk_reduction': 0.6,
                'compliance_cost_savings': 50000,
                'payback_period_months': 8
            },
            'implementation_timeline': '4-6 weeks',
            'success_metrics': ['Security incidents', 'Compliance score', 'Audit results']
        }
    
    def _generate_enterprise_features_details(self, customer: CustomerProfile, usage: UsagePattern, predictions: Dict[str, float]) -> Dict[str, Any]:
        """Generate enterprise features opportunity details."""
        return {
            'product_service': 'Enterprise Feature Suite',
            'description': 'Unlock enterprise-grade features including advanced analytics, custom branding, and SSO',
            'business_justification': f'Company size ({customer.company_size} employees) and growth trajectory warrant enterprise capabilities',
            'required_approvers': ['CTO', 'Finance Director'],
            'supporting_data': {
                'company_growth': '25% YoY',
                'enterprise_readiness_score': 0.85,
                'feature_requests': ['SSO', 'Custom branding', 'Advanced reporting']
            },
            'competitive_analysis': {
                'competitor_offerings': ['Limited enterprise features', 'Separate enterprise products'],
                'our_advantage': 'Seamless upgrade path with unified platform'
            },
            'roi_projection': {
                'operational_efficiency': 0.3,
                'brand_value_increase': 100000,
                'payback_period_months': 12
            },
            'implementation_timeline': '6-8 weeks',
            'success_metrics': ['Feature adoption', 'User productivity', 'Brand consistency']
        }
    
    def _generate_professional_services_details(self, customer: CustomerProfile, usage: UsagePattern, predictions: Dict[str, float]) -> Dict[str, Any]:
        """Generate professional services opportunity details."""
        return {
            'product_service': 'Professional Services Package',
            'description': 'Custom implementation and optimization services to maximize platform value',
            'business_justification': f'Complex workflows ({usage.custom_workflows}) and integrations ({usage.integration_count}) require expert guidance',
            'required_approvers': ['IT Director', 'Project Manager'],
            'supporting_data': {
                'implementation_complexity': 'high',
                'time_to_value_improvement': '50% faster',
                'success_rate_with_services': '95%'
            },
            'competitive_analysis': {
                'competitor_offerings': ['Self-service only', 'Limited consulting'],
                'our_advantage': 'Deep platform expertise and proven methodologies'
            },
            'roi_projection': {
                'implementation_time_savings': 0.4,
                'success_probability_increase': 0.3,
                'payback_period_months': 6
            },
            'implementation_timeline': '8-12 weeks',
            'success_metrics': ['Implementation success', 'Time to value', 'User adoption']
        }
    
    def _generate_training_certification_details(self, customer: CustomerProfile, usage: UsagePattern, predictions: Dict[str, float]) -> Dict[str, Any]:
        """Generate training and certification opportunity details."""
        return {
            'product_service': 'Training and Certification Program',
            'description': 'Comprehensive training program to maximize user proficiency and platform adoption',
            'business_justification': f'User count ({usage.user_count}) and feature complexity require structured training approach',
            'required_approvers': ['HR Director', 'IT Director'],
            'supporting_data': {
                'current_user_proficiency': 'intermediate',
                'training_roi': '300% within 6 months',
                'certification_value': 'Industry recognized credentials'
            },
            'competitive_analysis': {
                'competitor_offerings': ['Basic documentation', 'Video tutorials'],
                'our_advantage': 'Hands-on training with certification pathway'
            },
            'roi_projection': {
                'productivity_increase': 0.4,
                'support_ticket_reduction': 0.5,
                'payback_period_months': 4
            },
            'implementation_timeline': '4-6 weeks',
            'success_metrics': ['Certification completion', 'User proficiency scores', 'Support ticket volume']
        }
    
    def _generate_extended_warranty_details(self, customer: CustomerProfile, usage: UsagePattern, predictions: Dict[str, float]) -> Dict[str, Any]:
        """Generate extended warranty opportunity details."""
        return {
            'product_service': 'Extended Warranty and Maintenance',
            'description': 'Extended warranty coverage with proactive maintenance and priority support',
            'business_justification': f'Business critical usage and contract value ({customer.monthly_revenue * 12:.0f} annually) warrant extended protection',
            'required_approvers': ['Finance Director', 'Risk Manager'],
            'supporting_data': {
                'system_criticality': 'high',
                'downtime_cost': f'${customer.monthly_revenue * 0.1:.0f} per hour',
                'warranty_claims_history': 'low risk profile'
            },
            'competitive_analysis': {
                'competitor_offerings': ['Standard warranty only', 'Third-party maintenance'],
                'our_advantage': 'Comprehensive coverage with OEM support'
            },
            'roi_projection': {
                'risk_mitigation_value': customer.monthly_revenue * 2,
                'maintenance_cost_savings': 0.3,
                'payback_period_months': 18
            },
            'implementation_timeline': '1-2 weeks',
            'success_metrics': ['System uptime', 'Maintenance costs', 'Issue resolution time']
        }
    
    def _calculate_priority(self, propensity: float, value: float) -> RecommendationPriority:
        """Calculate recommendation priority based on propensity and value."""
        try:
            # Weighted score combining propensity and value
            normalized_value = min(value / 100000, 1.0)  # Normalize to $100k
            priority_score = (propensity * 0.6) + (normalized_value * 0.4)
            
            if priority_score >= 0.8:
                return RecommendationPriority.CRITICAL
            elif priority_score >= 0.6:
                return RecommendationPriority.HIGH
            elif priority_score >= 0.4:
                return RecommendationPriority.MEDIUM
            else:
                return RecommendationPriority.LOW
                
        except Exception as e:
            self.logger.error(f"Failed to calculate priority: {e}")
            return RecommendationPriority.MEDIUM
    
    def _apply_business_rules(self, customer: CustomerProfile, recommendations: List[UpsellOpportunity]) -> List[UpsellOpportunity]:
        """Apply business rules to filter recommendations."""
        try:
            filtered = []
            
            for rec in recommendations:
                # Rule 1: Don't recommend if customer has high churn risk
                if customer.churn_risk_score > 0.7 and rec.estimated_value > 50000:
                    continue
                
                # Rule 2: Limit recommendations near contract end
                days_to_renewal = (customer.contract_end_date - datetime.utcnow()).days
                if days_to_renewal < 30 and rec.recommendation_type != RecommendationType.PREMIUM_SUPPORT:
                    continue
                
                # Rule 3: Don't recommend capacity increase if utilization is low
                if rec.recommendation_type == RecommendationType.CAPACITY_INCREASE:
                    if customer.usage_patterns:
                        latest_usage = customer.usage_patterns[-1]
                        avg_utilization = np.mean(list(latest_usage.capacity_utilization.values())) if latest_usage.capacity_utilization else 0
                        if avg_utilization < 0.6:  # Less than 60% utilization
                            continue
                
                # Rule 4: Segment-specific rules
                if customer.segment == CustomerSegment.STARTUP and rec.estimated_value > 25000:
                    continue
                
                # Rule 5: Industry-specific compliance requirements
                if customer.industry in ['healthcare', 'finance'] and rec.recommendation_type == RecommendationType.ADDITIONAL_MODULES:
                    # Boost priority for compliance-related recommendations
                    rec.priority = RecommendationPriority.HIGH
                
                filtered.append(rec)
            
            return filtered
            
        except Exception as e:
            self.logger.error(f"Failed to apply business rules: {e}")
            return recommendations
    
    async def update_customer_profile(self, customer_profile: CustomerProfile) -> None:
        """Update customer profile and trigger recommendation refresh."""
        try:
            self.customer_profiles[customer_profile.customer_id] = customer_profile
            
            # Trigger recommendation refresh if significant changes
            if self._should_refresh_recommendations(customer_profile):
                await self.generate_recommendations(customer_profile.customer_id)
            
        except Exception as e:
            self.logger.error(f"Failed to update customer profile: {e}")
    
    def _should_refresh_recommendations(self, customer: CustomerProfile) -> bool:
        """Determine if recommendations should be refreshed."""
        try:
            # Check if there are existing recommendations
            existing_recs = [
                opp for opp in self.opportunities.values()
                if opp.customer_id == customer.customer_id and opp.status == RecommendationStatus.PENDING
            ]
            
            if not existing_recs:
                return True
            
            # Check for significant usage changes
            if len(customer.usage_patterns) >= 2:
                current = customer.usage_patterns[-1]
                previous = customer.usage_patterns[-2]
                
                # Check for significant capacity utilization change
                current_util = np.mean(list(current.capacity_utilization.values())) if current.capacity_utilization else 0
                previous_util = np.mean(list(previous.capacity_utilization.values())) if previous.capacity_utilization else 0
                
                if abs(current_util - previous_util) > 0.2:  # 20% change
                    return True
                
                # Check for significant user count change
                if abs(current.user_count - previous.user_count) / max(previous.user_count, 1) > 0.3:  # 30% change
                    return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to check refresh criteria: {e}")
            return False
    
    async def record_recommendation_outcome(self, opportunity_id: str, outcome: RecommendationStatus, value: Optional[float] = None) -> None:
        """Record the outcome of a recommendation."""
        try:
            if opportunity_id not in self.opportunities:
                self.logger.warning(f"Opportunity not found: {opportunity_id}")
                return
            
            opportunity = self.opportunities[opportunity_id]
            opportunity.status = outcome
            
            # Update historical data
            self.historical_opportunities.append(opportunity)
            
            # Record for A/B testing if applicable
            for test_id in self.ab_testing.active_tests:
                self.ab_testing.record_test_event(
                    test_id, 
                    opportunity.customer_id, 
                    'conversion', 
                    1.0 if outcome == RecommendationStatus.ACCEPTED else 0.0
                )
                
                if value and outcome == RecommendationStatus.ACCEPTED:
                    self.ab_testing.record_test_event(test_id, opportunity.customer_id, 'revenue', value)
            
            # Update performance metrics
            self.performance_metrics['outcomes'].append({
                'opportunity_id': opportunity_id,
                'outcome': outcome.value,
                'value': value,
                'recorded_at': datetime.utcnow()
            })
            
            self.logger.info(f"Recorded outcome for opportunity {opportunity_id}: {outcome.value}")
            
        except Exception as e:
            self.logger.error(f"Failed to record recommendation outcome: {e}")
    
    async def get_recommendation_analytics(self, time_period_days: int = 30) -> Dict[str, Any]:
        """Get analytics on recommendation performance."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=time_period_days)
            
            # Filter recent recommendations
            recent_recs = [
                rec for rec in self.recommendation_history
                if start_date <= rec['generated_at'] <= end_date
            ]
            
            if not recent_recs:
                return {"message": "No recommendations found for the specified period"}
            
            # Calculate metrics
            total_recommendations = len(recent_recs)
            
            # Conversion metrics
            outcomes = [opp.status for opp in self.opportunities.values() 
                       if opp.created_at >= start_date and opp.status != RecommendationStatus.PENDING]
            
            conversion_rate = len([o for o in outcomes if o == RecommendationStatus.ACCEPTED]) / max(len(outcomes), 1)
            
            # Revenue metrics
            accepted_opportunities = [
                opp for opp in self.opportunities.values()
                if opp.created_at >= start_date and opp.status == RecommendationStatus.ACCEPTED
            ]
            
            total_revenue = sum(opp.estimated_value for opp in accepted_opportunities)
            avg_deal_size = total_revenue / max(len(accepted_opportunities), 1)
            
            # Recommendation type distribution
            type_distribution = defaultdict(int)
            for rec in recent_recs:
                type_distribution[rec['recommendation_type']] += 1
            
            # Priority distribution
            priority_distribution = defaultdict(int)
            for opp in self.opportunities.values():
                if opp.created_at >= start_date:
                    priority_distribution[opp.priority.value] += 1
            
            # Model performance
            model_performance = self.recommendation_engine.model_performance
            
            return {
                'period': {
                    'start_date': start_date.isoformat(),
                    'end_date': end_date.isoformat(),
                    'days': time_period_days
                },
                'overview': {
                    'total_recommendations': total_recommendations,
                    'conversion_rate': conversion_rate,
                    'total_revenue': total_revenue,
                    'average_deal_size': avg_deal_size,
                    'recommendations_per_day': total_recommendations / time_period_days
                },
                'distributions': {
                    'recommendation_types': dict(type_distribution),
                    'priorities': dict(priority_distribution)
                },
                'model_performance': model_performance,
                'top_performing_types': self._get_top_performing_types(start_date)
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get recommendation analytics: {e}")
            return {"error": str(e)}
    
    def _get_top_performing_types(self, start_date: datetime) -> List[Dict[str, Any]]:
        """Get top performing recommendation types."""
        try:
            type_performance = defaultdict(lambda: {'count': 0, 'accepted': 0, 'revenue': 0})
            
            for opp in self.opportunities.values():
                if opp.created_at >= start_date:
                    rec_type = opp.recommendation_type.value
                    type_performance[rec_type]['count'] += 1
                    
                    if opp.status == RecommendationStatus.ACCEPTED:
                        type_performance[rec_type]['accepted'] += 1
                        type_performance[rec_type]['revenue'] += opp.estimated_value
            
            # Calculate conversion rates and sort
            performance_list = []
            for rec_type, metrics in type_performance.items():
                if metrics['count'] > 0:
                    conversion_rate = metrics['accepted'] / metrics['count']
                    avg_revenue = metrics['revenue'] / max(metrics['accepted'], 1)
                    
                    performance_list.append({
                        'recommendation_type': rec_type,
                        'conversion_rate': conversion_rate,
                        'total_revenue': metrics['revenue'],
                        'average_revenue': avg_revenue,
                        'total_count': metrics['count']
                    })
            
            # Sort by total revenue
            performance_list.sort(key=lambda x: x['total_revenue'], reverse=True)
            return performance_list[:5]  # Top 5
            
        except Exception as e:
            self.logger.error(f"Failed to get top performing types: {e}")
            return []
    
    def _initialize_recommendation_rules(self) -> Dict[str, Any]:
        """Initialize recommendation generation rules."""
        return {
            'min_propensity_threshold': 0.3,
            'max_recommendations_per_customer': 5,
            'recommendation_refresh_days': 7,
            'expiration_days': 30,
            'priority_weights': {
                'propensity': 0.6,
                'value': 0.4
            }
        }
    
    def _initialize_business_rules(self) -> Dict[str, Any]:
        """Initialize business rules for filtering."""
        return {
            'churn_risk_threshold': 0.7,
            'contract_end_buffer_days': 30,
            'min_utilization_for_capacity': 0.6,
            'startup_max_value': 25000,
            'compliance_industries': ['healthcare', 'finance', 'government']
        }
    
    async def _load_historical_data(self) -> None:
        """Load historical customer and opportunity data."""
        try:
            # In production, this would load from database
            # For now, create sample data
            
            # Sample customer profile
            sample_customer = CustomerProfile(
                customer_id="cust_001",
                tenant_id="tenant_001",
                company_name="TechCorp Solutions",
                industry="technology",
                company_size=250,
                segment=CustomerSegment.MID_MARKET,
                subscription_tier="professional",
                monthly_revenue=15000.0,
                contract_start_date=datetime.utcnow() - timedelta(days=180),
                contract_end_date=datetime.utcnow() + timedelta(days=185),
                payment_history=[],
                usage_patterns=[
                    UsagePattern(
                        customer_id="cust_001",
                        feature_usage={"threat_detection": 0.85, "incident_response": 0.72, "reporting": 0.91},
                        capacity_utilization={"cpu": 0.78, "memory": 0.82, "storage": 0.65},
                        support_tickets=3,
                        login_frequency=4.2,
                        session_duration=45.5,
                        api_calls_per_day=1250,
                        data_volume_gb=125.5,
                        user_count=45,
                        integration_count=8,
                        custom_workflows=12,
                        advanced_features_used=["custom_rules", "api_integration", "advanced_reporting"],
                        timestamp=datetime.utcnow()
                    )
                ],
                support_satisfaction=4.2,
                churn_risk_score=0.25,
                expansion_potential=0.78,
                decision_makers=[
                    {"name": "John Smith", "role": "CTO"},
                    {"name": "Sarah Johnson", "role": "IT Director"}
                ],
                technology_stack=["AWS", "Kubernetes", "Python"],
                compliance_requirements=["SOC2", "ISO27001"],
                geographic_region="North America",
                preferred_communication="email"
            )
            
            self.customer_profiles[sample_customer.customer_id] = sample_customer
            
            # Sample historical opportunities
            sample_opportunity = UpsellOpportunity(
                opportunity_id="opp_001",
                customer_id="cust_001",
                recommendation_type=RecommendationType.FEATURE_UPGRADE,
                product_service="Advanced Analytics Package",
                description="Upgrade to advanced analytics and reporting features",
                business_justification="High usage of reporting features indicates readiness for advanced capabilities",
                estimated_value=25000.0,
                probability_score=0.75,
                priority=RecommendationPriority.HIGH,
                optimal_timing=datetime.utcnow() + timedelta(days=14),
                expiration_date=datetime.utcnow() + timedelta(days=44),
                required_approvers=["CTO", "Finance Director"],
                supporting_data={},
                competitive_analysis={},
                roi_projection={},
                implementation_timeline="4-6 weeks",
                success_metrics=["Feature adoption", "User satisfaction"],
                created_at=datetime.utcnow() - timedelta(days=30),
                status=RecommendationStatus.ACCEPTED
            )
            
            self.historical_opportunities.append(sample_opportunity)
            
            self.logger.info("Loaded sample historical data")
            
        except Exception as e:
            self.logger.error(f"Failed to load historical data: {e}")
    
    async def _opportunity_scanner(self) -> None:
        """Background task to scan for new opportunities."""
        try:
            while self.system_active:
                await asyncio.sleep(3600)  # Check every hour
                
                # Scan all customers for new opportunities
                for customer_id in self.customer_profiles:
                    try:
                        await self.generate_recommendations(customer_id, limit=3)
                    except Exception as e:
                        self.logger.error(f"Failed to scan opportunities for {customer_id}: {e}")
                
                self.logger.info("Completed opportunity scan")
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Opportunity scanner error: {e}")
    
    async def _model_retrainer(self) -> None:
        """Background task to retrain ML models."""
        try:
            while self.system_active:
                await asyncio.sleep(86400)  # Retrain daily
                
                if len(self.historical_opportunities) >= 50:  # Minimum data requirement
                    customers = list(self.customer_profiles.values())
                    
                    # Retrain segmentation model
                    self.segmentation_engine.train_segmentation_model(customers)
                    
                    # Retrain recommendation models
                    self.recommendation_engine.train_models(customers, self.historical_opportunities)
                    
                    self.logger.info("ML models retrained successfully")
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Model retrainer error: {e}")
    
    async def _performance_monitor(self) -> None:
        """Background task to monitor system performance."""
        try:
            while self.system_active:
                await asyncio.sleep(1800)  # Check every 30 minutes
                
                # Monitor recommendation generation rate
                recent_recs = [
                    rec for rec in self.recommendation_history
                    if (datetime.utcnow() - rec['generated_at']).total_seconds() < 3600
                ]
                
                self.performance_metrics['recommendations_per_hour'].append(len(recent_recs))
                
                # Monitor conversion rates
                recent_outcomes = [
                    opp for opp in self.opportunities.values()
                    if (datetime.utcnow() - opp.created_at).total_seconds() < 86400  # Last 24 hours
                ]
                
                if recent_outcomes:
                    accepted = len([opp for opp in recent_outcomes if opp.status == RecommendationStatus.ACCEPTED])
                    conversion_rate = accepted / len(recent_outcomes)
                    self.performance_metrics['daily_conversion_rate'].append(conversion_rate)
                
                # Keep only recent performance data
                for metric in self.performance_metrics:
                    if len(self.performance_metrics[metric]) > 168:  # 1 week of hourly data
                        self.performance_metrics[metric] = self.performance_metrics[metric][-168:]
                
        except asyncio.CancelledError:
            pass
        except Exception as e:
            self.logger.error(f"Performance monitor error: {e}")


# Example usage and testing
async def main():
    """Example usage of the Intelligent Upselling Engine."""
    engine = IntelligentUpsellingEngine()
    
    try:
        await engine.initialize()
        
        # Generate recommendations for sample customer
        print("Generating upselling recommendations...")
        recommendations = await engine.generate_recommendations("cust_001", limit=3)
        
        print(f"\n=== Generated {len(recommendations)} Recommendations ===")
        for i, rec in enumerate(recommendations, 1):
            print(f"\n{i}. {rec.product_service}")
            print(f"   Type: {rec.recommendation_type.value}")
            print(f"   Priority: {rec.priority.value}")
            print(f"   Probability: {rec.probability_score:.2%}")
            print(f"   Estimated Value: ${rec.estimated_value:,.2f}")
            print(f"   Optimal Timing: {rec.optimal_timing.strftime('%Y-%m-%d')}")
            print(f"   Description: {rec.description}")
            print(f"   Business Justification: {rec.business_justification}")
        
        # Simulate recommendation outcome
        if recommendations:
            await engine.record_recommendation_outcome(
                recommendations[0].opportunity_id,
                RecommendationStatus.ACCEPTED,
                recommendations[0].estimated_value
            )
            print(f"\nRecorded acceptance of recommendation: {recommendations[0].product_service}")
        
        # Get analytics
        print(f"\n=== Recommendation Analytics ===")
        analytics = await engine.get_recommendation_analytics(time_period_days=30)
        
        if "error" not in analytics:
            print(f"Total Recommendations: {analytics['overview']['total_recommendations']}")
            print(f"Conversion Rate: {analytics['overview']['conversion_rate']:.2%}")
            print(f"Total Revenue: ${analytics['overview']['total_revenue']:,.2f}")
            print(f"Average Deal Size: ${analytics['overview']['average_deal_size']:,.2f}")
            
            print(f"\nRecommendation Types:")
            for rec_type, count in analytics['distributions']['recommendation_types'].items():
                print(f"  {rec_type}: {count}")
        
        # Create A/B test
        print(f"\n=== A/B Testing Framework ===")
        variants = [
            ABTestVariant(
                variant_id="control",
                name="Standard Recommendations",
                description="Current recommendation algorithm",
                recommendation_strategy="standard",
                timing_algorithm="default",
                presentation_format="email",
                incentive_structure={},
                target_segment=None,
                weight=0.5,
                success_metrics=["conversion_rate", "revenue"]
            ),
            ABTestVariant(
                variant_id="treatment",
                name="Enhanced Recommendations",
                description="ML-enhanced with timing optimization",
                recommendation_strategy="ml_enhanced",
                timing_algorithm="optimized",
                presentation_format="in_app",
                incentive_structure={"discount": 0.1},
                target_segment=None,
                weight=0.5,
                success_metrics=["conversion_rate", "revenue"]
            )
        ]
        
        test_id = engine.ab_testing.create_ab_test(
            "Recommendation Strategy Test",
            variants,
            ["cust_001"],
            duration_days=30
        )
        
        if test_id:
            print(f"Created A/B test: {test_id}")
            
            # Assign customer to variant
            variant = engine.ab_testing.assign_customer_to_variant(test_id, "cust_001")
            print(f"Customer assigned to variant: {variant}")
        
    except Exception as e:
        print(f"Error in upselling engine example: {e}")
    
    finally:
        await engine.shutdown()


if __name__ == "__main__":
    asyncio.run(main())