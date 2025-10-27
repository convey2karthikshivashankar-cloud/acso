"""
Federated Learning Engine for ACSO Enterprise.
Cross-tenant knowledge sharing with privacy-preserving algorithms.
"""
import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import uuid
import hashlib
import numpy as np
import torch
import torch.nn as nn
import torch.optim as optim
import torch.nn.functional as F
from collections import defaultdict, deque
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
import base64
from sklearn.metrics import accuracy_score, precision_score, recall_score
import pickle

class ModelType(str, Enum):
    """Types of federated learning models."""
    THREAT_CLASSIFIER = "threat_classifier"
    ANOMALY_DETECTOR = "anomaly_detector"
    RISK_PREDICTOR = "risk_predictor"
    BEHAVIOR_ANALYZER = "behavior_analyzer"
    PATTERN_RECOGNIZER = "pattern_recognizer"

class AggregationMethod(str, Enum):
    """Federated learning aggregation methods."""
    FEDERATED_AVERAGING = "federated_averaging"
    WEIGHTED_AVERAGING = "weighted_averaging"
    SECURE_AGGREGATION = "secure_aggregation"
    DIFFERENTIAL_PRIVACY = "differential_privacy"

class ParticipantStatus(str, Enum):
    """Participant status in federated learning."""
    ACTIVE = "active"
    INACTIVE = "inactive"
    TRAINING = "training"
    VALIDATING = "validating"
    SUSPENDED = "suspended"

@dataclass
class ModelUpdate:
    """Model update from a participant."""
    update_id: str
    participant_id: str
    model_type: ModelType
    round_number: int
    model_weights: bytes  # Encrypted model weights
    data_size: int
    training_loss: float
    validation_accuracy: float
    timestamp: datetime
    privacy_budget: float
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class FederatedModel:
    """Federated learning model."""
    model_id: str
    model_type: ModelType
    version: str
    global_weights: Optional[bytes]
    participants: List[str]
    aggregation_method: AggregationMethod
    privacy_level: float
    performance_metrics: Dict[str, float]
    created_at: datetime
    updated_at: datetime
    round_number: int = 0
    min_participants: int = 3
    max_participants: int = 100
    metadata: Dict[str, Any] = field(default_factory=dict)

@dataclass
class Participant:
    """Federated learning participant."""
    participant_id: str
    tenant_id: str
    status: ParticipantStatus
    models: List[str]  # Model IDs
    data_contribution: int
    privacy_budget_remaining: float
    performance_history: List[float]
    last_update: Optional[datetime]
    trust_score: float
    location: str
    metadata: Dict[str, Any] = field(default_factory=dict)c
lass ThreatClassifierModel(nn.Module):
    """Neural network for threat classification."""
    
    def __init__(self, input_size: int = 100, hidden_size: int = 64, num_classes: int = 10):
        super(ThreatClassifierModel, self).__init__()
        self.fc1 = nn.Linear(input_size, hidden_size)
        self.fc2 = nn.Linear(hidden_size, hidden_size // 2)
        self.fc3 = nn.Linear(hidden_size // 2, num_classes)
        self.dropout = nn.Dropout(0.3)
        self.batch_norm1 = nn.BatchNorm1d(hidden_size)
        self.batch_norm2 = nn.BatchNorm1d(hidden_size // 2)
    
    def forward(self, x):
        x = F.relu(self.batch_norm1(self.fc1(x)))
        x = self.dropout(x)
        x = F.relu(self.batch_norm2(self.fc2(x)))
        x = self.dropout(x)
        x = self.fc3(x)
        return F.log_softmax(x, dim=1)

class AnomalyDetectorModel(nn.Module):
    """Neural network for anomaly detection."""
    
    def __init__(self, input_size: int = 50, hidden_size: int = 32):
        super(AnomalyDetectorModel, self).__init__()
        self.encoder = nn.Sequential(
            nn.Linear(input_size, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, hidden_size // 2),
            nn.ReLU(),
            nn.Linear(hidden_size // 2, hidden_size // 4)
        )
        
        self.decoder = nn.Sequential(
            nn.Linear(hidden_size // 4, hidden_size // 2),
            nn.ReLU(),
            nn.Linear(hidden_size // 2, hidden_size),
            nn.ReLU(),
            nn.Linear(hidden_size, input_size)
        )
    
    def forward(self, x):
        encoded = self.encoder(x)
        decoded = self.decoder(encoded)
        return decoded

class PrivacyPreservingAggregator:
    """Privacy-preserving aggregation for federated learning."""
    
    def __init__(self, privacy_budget: float = 1.0):
        self.privacy_budget = privacy_budget
        self.noise_multiplier = 1.0
        self.clipping_threshold = 1.0
        self.logger = logging.getLogger(__name__)
    
    def aggregate_with_differential_privacy(
        self,
        model_updates: List[ModelUpdate],
        global_model: nn.Module
    ) -> Tuple[Dict[str, torch.Tensor], float]:
        """Aggregate model updates with differential privacy."""
        try:
            if not model_updates:
                return {}, 0.0
            
            # Decrypt and load model weights
            decrypted_weights = []
            total_data_size = 0
            
            for update in model_updates:
                weights = self._decrypt_model_weights(update.model_weights)
                if weights:
                    decrypted_weights.append(weights)
                    total_data_size += update.data_size
            
            if not decrypted_weights:
                return {}, 0.0
            
            # Apply gradient clipping
            clipped_weights = []
            for weights in decrypted_weights:
                clipped = self._clip_gradients(weights, self.clipping_threshold)
                clipped_weights.append(clipped)
            
            # Compute weighted average
            aggregated_weights = {}
            for param_name in clipped_weights[0].keys():
                param_sum = torch.zeros_like(clipped_weights[0][param_name])
                weight_sum = 0.0
                
                for i, weights in enumerate(clipped_weights):
                    data_weight = model_updates[i].data_size / total_data_size
                    param_sum += weights[param_name] * data_weight
                    weight_sum += data_weight
                
                # Add differential privacy noise
                noise_scale = self.noise_multiplier * self.clipping_threshold / len(model_updates)
                noise = torch.normal(0, noise_scale, size=param_sum.shape)
                
                aggregated_weights[param_name] = param_sum / weight_sum + noise
            
            # Calculate privacy cost
            privacy_cost = self._calculate_privacy_cost(len(model_updates))
            
            return aggregated_weights, privacy_cost
            
        except Exception as e:
            self.logger.error(f"Failed to aggregate with differential privacy: {e}")
            return {}, 0.0
    
    def aggregate_with_secure_aggregation(
        self,
        model_updates: List[ModelUpdate],
        global_model: nn.Module
    ) -> Dict[str, torch.Tensor]:
        """Aggregate model updates using secure aggregation."""
        try:
            if not model_updates:
                return {}
            
            # Simplified secure aggregation (in production would use cryptographic protocols)
            decrypted_weights = []
            total_data_size = 0
            
            for update in model_updates:
                weights = self._decrypt_model_weights(update.model_weights)
                if weights:
                    decrypted_weights.append(weights)
                    total_data_size += update.data_size
            
            if not decrypted_weights:
                return {}
            
            # Weighted averaging based on data size
            aggregated_weights = {}
            for param_name in decrypted_weights[0].keys():
                param_sum = torch.zeros_like(decrypted_weights[0][param_name])
                
                for i, weights in enumerate(decrypted_weights):
                    data_weight = model_updates[i].data_size / total_data_size
                    param_sum += weights[param_name] * data_weight
                
                aggregated_weights[param_name] = param_sum
            
            return aggregated_weights
            
        except Exception as e:
            self.logger.error(f"Failed to aggregate with secure aggregation: {e}")
            return {}
    
    def _decrypt_model_weights(self, encrypted_weights: bytes) -> Optional[Dict[str, torch.Tensor]]:
        """Decrypt model weights."""
        try:
            # In production, this would use proper decryption
            # For now, assume weights are pickled and base64 encoded
            decoded_weights = base64.b64decode(encrypted_weights)
            weights = pickle.loads(decoded_weights)
            return weights
        except Exception as e:
            self.logger.error(f"Failed to decrypt model weights: {e}")
            return None
    
    def _clip_gradients(
        self,
        weights: Dict[str, torch.Tensor],
        threshold: float
    ) -> Dict[str, torch.Tensor]:
        """Apply gradient clipping for privacy."""
        try:
            clipped_weights = {}
            for param_name, param_tensor in weights.items():
                # Calculate L2 norm
                param_norm = torch.norm(param_tensor, p=2)
                
                # Clip if necessary
                if param_norm > threshold:
                    clipped_weights[param_name] = param_tensor * (threshold / param_norm)
                else:
                    clipped_weights[param_name] = param_tensor
            
            return clipped_weights
            
        except Exception as e:
            self.logger.error(f"Failed to clip gradients: {e}")
            return weights
    
    def _calculate_privacy_cost(self, num_participants: int) -> float:
        """Calculate privacy cost for differential privacy."""
        try:
            # Simplified privacy accounting
            epsilon = 1.0 / (num_participants * self.noise_multiplier)
            return epsilon
        except Exception as e:
            self.logger.error(f"Failed to calculate privacy cost: {e}")
            return 0.1

class FederatedLearningEngine:
    """
    Federated Learning Engine for cross-tenant knowledge sharing.
    
    Features:
    - Privacy-preserving learning algorithms
    - Secure model aggregation
    - Differential privacy protection
    - Model versioning and rollback
    - Performance monitoring and optimization
    - Multi-tenant coordination
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Core components
        self.models: Dict[str, FederatedModel] = {}
        self.participants: Dict[str, Participant] = {}
        self.model_updates: Dict[str, List[ModelUpdate]] = defaultdict(list)
        
        # Privacy and security
        self.aggregator = PrivacyPreservingAggregator()
        self.encryption_key: Optional[bytes] = None
        
        # Model instances
        self.model_instances: Dict[str, nn.Module] = {}
        
        # Training coordination
        self.training_rounds: Dict[str, int] = defaultdict(int)
        self.round_participants: Dict[str, List[str]] = defaultdict(list)
        
        # Performance tracking
        self.performance_history: Dict[str, List[Dict[str, float]]] = defaultdict(list)
        
        # Background tasks
        self.processing_tasks: List[asyncio.Task] = []
        self.system_active = False
    
    async def initialize(self) -> None:
        """Initialize the federated learning engine."""
        try:
            self.logger.info("Initializing Federated Learning Engine")
            
            # Generate encryption key
            self._generate_encryption_key()
            
            # Initialize default models
            await self._initialize_default_models()
            
            # Load participants
            await self._load_participants()
            
            # Start background processing
            self.system_active = True
            self.processing_tasks = [
                asyncio.create_task(self._training_coordinator()),
                asyncio.create_task(self._model_aggregator()),
                asyncio.create_task(self._performance_monitor()),
                asyncio.create_task(self._privacy_auditor())
            ]
            
            self.logger.info("Federated Learning Engine initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Federated Learning Engine: {e}")
            raise
    
    async def shutdown(self) -> None:
        """Shutdown the federated learning engine."""
        try:
            self.logger.info("Shutting down Federated Learning Engine")
            
            self.system_active = False
            
            # Cancel background tasks
            for task in self.processing_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            # Save model states
            await self._save_model_states()
            
            self.logger.info("Federated Learning Engine shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
    
    async def register_participant(
        self,
        tenant_id: str,
        participant_config: Dict[str, Any]
    ) -> str:
        """Register a new participant in federated learning."""
        try:
            participant_id = str(uuid.uuid4())
            
            participant = Participant(
                participant_id=participant_id,
                tenant_id=tenant_id,
                status=ParticipantStatus.ACTIVE,
                models=[],
                data_contribution=participant_config.get("data_size", 0),
                privacy_budget_remaining=participant_config.get("privacy_budget", 10.0),
                performance_history=[],
                last_update=None,
                trust_score=participant_config.get("initial_trust_score", 0.8),
                location=participant_config.get("location", "unknown")
            )
            
            self.participants[participant_id] = participant
            
            self.logger.info(f"Registered participant: {participant_id} for tenant: {tenant_id}")
            return participant_id
            
        except Exception as e:
            self.logger.error(f"Failed to register participant: {e}")
            raise
    
    async def join_model_training(
        self,
        participant_id: str,
        model_id: str
    ) -> bool:
        """Join a participant to model training."""
        try:
            participant = self.participants.get(participant_id)
            model = self.models.get(model_id)
            
            if not participant or not model:
                return False
            
            # Check eligibility
            if (len(model.participants) >= model.max_participants or
                participant.privacy_budget_remaining < 1.0 or
                participant.trust_score < 0.5):
                return False
            
            # Add participant to model
            if participant_id not in model.participants:
                model.participants.append(participant_id)
                participant.models.append(model_id)
                
                self.logger.info(f"Participant {participant_id} joined model {model_id}")
                return True
            
            return False
            
        except Exception as e:
            self.logger.error(f"Failed to join model training: {e}")
            return False
    
    async def submit_model_update(
        self,
        participant_id: str,
        model_id: str,
        model_weights: Dict[str, torch.Tensor],
        training_metrics: Dict[str, float]
    ) -> str:
        """Submit a model update from a participant."""
        try:
            participant = self.participants.get(participant_id)
            model = self.models.get(model_id)
            
            if not participant or not model or participant_id not in model.participants:
                raise ValueError("Invalid participant or model")
            
            # Encrypt model weights
            encrypted_weights = self._encrypt_model_weights(model_weights)
            
            # Create model update
            update = ModelUpdate(
                update_id=str(uuid.uuid4()),
                participant_id=participant_id,
                model_type=model.model_type,
                round_number=model.round_number,
                model_weights=encrypted_weights,
                data_size=training_metrics.get("data_size", 0),
                training_loss=training_metrics.get("training_loss", 0.0),
                validation_accuracy=training_metrics.get("validation_accuracy", 0.0),
                timestamp=datetime.utcnow(),
                privacy_budget=training_metrics.get("privacy_cost", 0.1)
            )
            
            # Store update
            self.model_updates[model_id].append(update)
            
            # Update participant state
            participant.last_update = datetime.utcnow()
            participant.privacy_budget_remaining -= update.privacy_budget
            participant.performance_history.append(update.validation_accuracy)
            
            # Keep only last 10 performance scores
            if len(participant.performance_history) > 10:
                participant.performance_history = participant.performance_history[-10:]
            
            self.logger.info(f"Received model update from participant {participant_id}")
            return update.update_id
            
        except Exception as e:
            self.logger.error(f"Failed to submit model update: {e}")
            raise
    
    async def get_global_model(
        self,
        model_id: str,
        participant_id: str
    ) -> Optional[Dict[str, torch.Tensor]]:
        """Get the latest global model for a participant."""
        try:
            participant = self.participants.get(participant_id)
            model = self.models.get(model_id)
            
            if not participant or not model or participant_id not in model.participants:
                return None
            
            if not model.global_weights:
                return None
            
            # Decrypt global model weights
            global_weights = self._decrypt_model_weights(model.global_weights)
            
            self.logger.info(f"Provided global model {model_id} to participant {participant_id}")
            return global_weights
            
        except Exception as e:
            self.logger.error(f"Failed to get global model: {e}")
            return None
    
    async def get_model_performance(self, model_id: str) -> Dict[str, Any]:
        """Get performance metrics for a federated model."""
        try:
            model = self.models.get(model_id)
            if not model:
                return {"error": "Model not found"}
            
            # Get recent performance history
            recent_performance = self.performance_history[model_id][-10:]  # Last 10 rounds
            
            if not recent_performance:
                return {"message": "No performance data available"}
            
            # Calculate metrics
            avg_accuracy = np.mean([p.get("accuracy", 0) for p in recent_performance])
            avg_loss = np.mean([p.get("loss", 0) for p in recent_performance])
            
            # Participant statistics
            active_participants = len([
                p for p in self.participants.values()
                if p.participant_id in model.participants and p.status == ParticipantStatus.ACTIVE
            ])
            
            return {
                "model_id": model_id,
                "model_type": model.model_type.value,
                "version": model.version,
                "round_number": model.round_number,
                "participants": {
                    "total": len(model.participants),
                    "active": active_participants,
                    "max": model.max_participants
                },
                "performance": {
                    "average_accuracy": round(avg_accuracy, 4),
                    "average_loss": round(avg_loss, 4),
                    "latest_accuracy": recent_performance[-1].get("accuracy", 0) if recent_performance else 0,
                    "improvement_trend": self._calculate_improvement_trend(recent_performance)
                },
                "privacy": {
                    "aggregation_method": model.aggregation_method.value,
                    "privacy_level": model.privacy_level
                },
                "updated_at": model.updated_at.isoformat()
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get model performance: {e}")
            return {"error": str(e)}
    
    async def get_federated_analytics(
        self,
        time_period_days: int = 30
    ) -> Dict[str, Any]:
        """Get federated learning analytics."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=time_period_days)
            
            # Model statistics
            total_models = len(self.models)
            active_models = len([
                m for m in self.models.values()
                if len(m.participants) >= m.min_participants
            ])
            
            # Participant statistics
            total_participants = len(self.participants)
            active_participants = len([
                p for p in self.participants.values()
                if p.status == ParticipantStatus.ACTIVE
            ])
            
            # Training statistics
            total_updates = sum(len(updates) for updates in self.model_updates.values())
            recent_updates = 0
            
            for updates in self.model_updates.values():
                recent_updates += len([
                    u for u in updates
                    if start_date <= u.timestamp <= end_date
                ])
            
            # Privacy statistics
            avg_privacy_budget = np.mean([
                p.privacy_budget_remaining for p in self.participants.values()
            ]) if self.participants else 0
            
            # Performance trends
            model_performance = {}
            for model_id, model in self.models.items():
                recent_perf = self.performance_history[model_id][-5:]  # Last 5 rounds
                if recent_perf:
                    model_performance[model_id] = {
                        "accuracy": np.mean([p.get("accuracy", 0) for p in recent_perf]),
                        "rounds": len(self.performance_history[model_id])
                    }
            
            return {
                "period": {
                    "start_date": start_date.isoformat(),
                    "end_date": end_date.isoformat(),
                    "days": time_period_days
                },
                "overview": {
                    "total_models": total_models,
                    "active_models": active_models,
                    "total_participants": total_participants,
                    "active_participants": active_participants,
                    "total_updates": total_updates,
                    "recent_updates": recent_updates
                },
                "privacy": {
                    "average_privacy_budget_remaining": round(avg_privacy_budget, 2),
                    "privacy_preserving_methods": list(set(m.aggregation_method.value for m in self.models.values()))
                },
                "model_performance": model_performance,
                "system_health": {
                    "update_frequency": recent_updates / time_period_days if time_period_days > 0 else 0,
                    "participant_retention": active_participants / total_participants if total_participants > 0 else 0
                }
            }
            
        except Exception as e:
            self.logger.error(f"Failed to get federated analytics: {e}")
            return {"error": str(e)}    

    # Private methods
    def _generate_encryption_key(self) -> None:
        """Generate encryption key for model weights."""
        try:
            password = b"federated_learning_acso_2024"
            salt = b"fl_salt_2024"
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=salt,
                iterations=100000,
            )
            self.encryption_key = base64.urlsafe_b64encode(kdf.derive(password))
            
        except Exception as e:
            self.logger.error(f"Failed to generate encryption key: {e}")
    
    async def _initialize_default_models(self) -> None:
        """Initialize default federated learning models."""
        try:
            # Threat classifier model
            threat_model = FederatedModel(
                model_id="threat_classifier_v1",
                model_type=ModelType.THREAT_CLASSIFIER,
                version="1.0",
                global_weights=None,
                participants=[],
                aggregation_method=AggregationMethod.DIFFERENTIAL_PRIVACY,
                privacy_level=0.8,
                performance_metrics={"accuracy": 0.0, "loss": 0.0},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                min_participants=3,
                max_participants=50
            )
            
            # Anomaly detector model
            anomaly_model = FederatedModel(
                model_id="anomaly_detector_v1",
                model_type=ModelType.ANOMALY_DETECTOR,
                version="1.0",
                global_weights=None,
                participants=[],
                aggregation_method=AggregationMethod.SECURE_AGGREGATION,
                privacy_level=0.9,
                performance_metrics={"accuracy": 0.0, "loss": 0.0},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                min_participants=2,
                max_participants=30
            )
            
            # Risk predictor model
            risk_model = FederatedModel(
                model_id="risk_predictor_v1",
                model_type=ModelType.RISK_PREDICTOR,
                version="1.0",
                global_weights=None,
                participants=[],
                aggregation_method=AggregationMethod.WEIGHTED_AVERAGING,
                privacy_level=0.7,
                performance_metrics={"accuracy": 0.0, "loss": 0.0},
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow(),
                min_participants=4,
                max_participants=40
            )
            
            # Store models
            self.models[threat_model.model_id] = threat_model
            self.models[anomaly_model.model_id] = anomaly_model
            self.models[risk_model.model_id] = risk_model
            
            # Initialize model instances
            self.model_instances[threat_model.model_id] = ThreatClassifierModel()
            self.model_instances[anomaly_model.model_id] = AnomalyDetectorModel()
            self.model_instances[risk_model.model_id] = ThreatClassifierModel(input_size=80, num_classes=5)
            
            self.logger.info("Initialized default federated learning models")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize default models: {e}")
    
    async def _load_participants(self) -> None:
        """Load existing participants."""
        try:
            # In production, this would load from persistent storage
            # For now, create sample participants
            sample_participants = [
                {
                    "tenant_id": "tenant_001",
                    "data_size": 1000,
                    "privacy_budget": 15.0,
                    "trust_score": 0.9,
                    "location": "us-east-1"
                },
                {
                    "tenant_id": "tenant_002", 
                    "data_size": 1500,
                    "privacy_budget": 12.0,
                    "trust_score": 0.85,
                    "location": "eu-west-1"
                },
                {
                    "tenant_id": "tenant_003",
                    "data_size": 800,
                    "privacy_budget": 10.0,
                    "trust_score": 0.8,
                    "location": "ap-southeast-1"
                }
            ]
            
            for participant_config in sample_participants:
                await self.register_participant(
                    participant_config["tenant_id"],
                    participant_config
                )
            
            self.logger.info(f"Loaded {len(sample_participants)} sample participants")
            
        except Exception as e:
            self.logger.error(f"Failed to load participants: {e}")
    
    def _encrypt_model_weights(self, weights: Dict[str, torch.Tensor]) -> bytes:
        """Encrypt model weights for secure transmission."""
        try:
            # Convert tensors to serializable format
            serializable_weights = {
                name: tensor.detach().cpu().numpy().tolist()
                for name, tensor in weights.items()
            }
            
            # Serialize weights
            serialized_weights = pickle.dumps(serializable_weights)
            
            # Encrypt (simplified - in production would use proper encryption)
            encrypted_weights = base64.b64encode(serialized_weights)
            
            return encrypted_weights
            
        except Exception as e:
            self.logger.error(f"Failed to encrypt model weights: {e}")
            return b""
    
    def _decrypt_model_weights(self, encrypted_weights: bytes) -> Optional[Dict[str, torch.Tensor]]:
        """Decrypt model weights."""
        try:
            # Decrypt (simplified)
            serialized_weights = base64.b64decode(encrypted_weights)
            
            # Deserialize
            weights_data = pickle.loads(serialized_weights)
            
            # Convert back to tensors
            weights = {
                name: torch.tensor(data, dtype=torch.float32)
                for name, data in weights_data.items()
            }
            
            return weights
            
        except Exception as e:
            self.logger.error(f"Failed to decrypt model weights: {e}")
            return None
    
    def _calculate_improvement_trend(self, performance_history: List[Dict[str, float]]) -> str:
        """Calculate performance improvement trend."""
        try:
            if len(performance_history) < 2:
                return "insufficient_data"
            
            accuracies = [p.get("accuracy", 0) for p in performance_history]
            
            # Simple trend calculation
            recent_avg = np.mean(accuracies[-3:])  # Last 3 rounds
            earlier_avg = np.mean(accuracies[:-3]) if len(accuracies) > 3 else accuracies[0]
            
            if recent_avg > earlier_avg + 0.01:
                return "improving"
            elif recent_avg < earlier_avg - 0.01:
                return "declining"
            else:
                return "stable"
                
        except Exception as e:
            self.logger.error(f"Failed to calculate improvement trend: {e}")
            return "unknown"
    
    async def _save_model_states(self) -> None:
        """Save model states to persistent storage."""
        try:
            # In production, this would save to database or file system
            self.logger.info("Model states saved")
            
        except Exception as e:
            self.logger.error(f"Failed to save model states: {e}")
    
    # Background task methods
    async def _training_coordinator(self) -> None:
        """Coordinate federated training rounds."""
        while self.system_active:
            try:
                for model_id, model in self.models.items():
                    # Check if enough participants are ready
                    ready_participants = [
                        p_id for p_id in model.participants
                        if (self.participants[p_id].status == ParticipantStatus.ACTIVE and
                            self.participants[p_id].privacy_budget_remaining > 1.0)
                    ]
                    
                    if len(ready_participants) >= model.min_participants:
                        # Check if enough updates received for current round
                        current_round_updates = [
                            update for update in self.model_updates[model_id]
                            if update.round_number == model.round_number
                        ]
                        
                        if len(current_round_updates) >= len(ready_participants) * 0.7:  # 70% participation
                            # Trigger aggregation
                            await self._trigger_model_aggregation(model_id)
                
                await asyncio.sleep(300)  # Check every 5 minutes
                
            except Exception as e:
                self.logger.error(f"Error in training coordinator: {e}")
                await asyncio.sleep(600)
    
    async def _model_aggregator(self) -> None:
        """Aggregate model updates from participants."""
        while self.system_active:
            try:
                # Process pending aggregations
                for model_id in list(self.models.keys()):
                    await self._process_model_aggregation(model_id)
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Error in model aggregator: {e}")
                await asyncio.sleep(300)
    
    async def _trigger_model_aggregation(self, model_id: str) -> None:
        """Trigger aggregation for a specific model."""
        try:
            model = self.models[model_id]
            current_round_updates = [
                update for update in self.model_updates[model_id]
                if update.round_number == model.round_number
            ]
            
            if not current_round_updates:
                return
            
            self.logger.info(f"Triggering aggregation for model {model_id}, round {model.round_number}")
            
            # Perform aggregation based on method
            if model.aggregation_method == AggregationMethod.DIFFERENTIAL_PRIVACY:
                aggregated_weights, privacy_cost = self.aggregator.aggregate_with_differential_privacy(
                    current_round_updates, self.model_instances[model_id]
                )
            elif model.aggregation_method == AggregationMethod.SECURE_AGGREGATION:
                aggregated_weights = self.aggregator.aggregate_with_secure_aggregation(
                    current_round_updates, self.model_instances[model_id]
                )
                privacy_cost = 0.0
            else:  # Weighted averaging
                aggregated_weights = await self._weighted_averaging_aggregation(current_round_updates)
                privacy_cost = 0.0
            
            if aggregated_weights:
                # Update global model
                encrypted_global_weights = self._encrypt_model_weights(aggregated_weights)
                model.global_weights = encrypted_global_weights
                model.updated_at = datetime.utcnow()
                model.round_number += 1
                
                # Update model instance
                model_instance = self.model_instances[model_id]
                model_instance.load_state_dict(aggregated_weights)
                
                # Calculate performance metrics
                avg_accuracy = np.mean([update.validation_accuracy for update in current_round_updates])
                avg_loss = np.mean([update.training_loss for update in current_round_updates])
                
                model.performance_metrics = {
                    "accuracy": avg_accuracy,
                    "loss": avg_loss
                }
                
                # Store performance history
                self.performance_history[model_id].append({
                    "round": model.round_number - 1,
                    "accuracy": avg_accuracy,
                    "loss": avg_loss,
                    "participants": len(current_round_updates),
                    "privacy_cost": privacy_cost,
                    "timestamp": datetime.utcnow().isoformat()
                })
                
                self.logger.info(f"Aggregation completed for model {model_id}")
            
        except Exception as e:
            self.logger.error(f"Failed to trigger model aggregation: {e}")
    
    async def _process_model_aggregation(self, model_id: str) -> None:
        """Process model aggregation if conditions are met."""
        try:
            model = self.models[model_id]
            
            # Check if aggregation is needed
            current_round_updates = [
                update for update in self.model_updates[model_id]
                if update.round_number == model.round_number
            ]
            
            # Minimum updates threshold
            min_updates = max(2, len(model.participants) // 2)
            
            if len(current_round_updates) >= min_updates:
                # Check if enough time has passed since last update
                if current_round_updates:
                    latest_update = max(current_round_updates, key=lambda u: u.timestamp)
                    time_since_update = (datetime.utcnow() - latest_update.timestamp).total_seconds()
                    
                    # Wait at least 5 minutes for more updates
                    if time_since_update > 300:
                        await self._trigger_model_aggregation(model_id)
            
        except Exception as e:
            self.logger.error(f"Failed to process model aggregation: {e}")
    
    async def _weighted_averaging_aggregation(
        self,
        model_updates: List[ModelUpdate]
    ) -> Dict[str, torch.Tensor]:
        """Perform weighted averaging aggregation."""
        try:
            if not model_updates:
                return {}
            
            # Decrypt all model weights
            decrypted_weights = []
            weights_list = []
            
            total_data_size = sum(update.data_size for update in model_updates)
            
            for update in model_updates:
                weights = self._decrypt_model_weights(update.model_weights)
                if weights:
                    decrypted_weights.append(weights)
                    weights_list.append(update.data_size / total_data_size)
            
            if not decrypted_weights:
                return {}
            
            # Weighted average
            aggregated_weights = {}
            for param_name in decrypted_weights[0].keys():
                weighted_sum = torch.zeros_like(decrypted_weights[0][param_name])
                
                for i, weights in enumerate(decrypted_weights):
                    weighted_sum += weights[param_name] * weights_list[i]
                
                aggregated_weights[param_name] = weighted_sum
            
            return aggregated_weights
            
        except Exception as e:
            self.logger.error(f"Failed weighted averaging aggregation: {e}")
            return {}
    
    async def _performance_monitor(self) -> None:
        """Monitor federated learning performance."""
        while self.system_active:
            try:
                # Update participant trust scores based on performance
                for participant_id, participant in self.participants.items():
                    if participant.performance_history:
                        recent_performance = participant.performance_history[-5:]  # Last 5 updates
                        avg_performance = np.mean(recent_performance)
                        
                        # Update trust score based on performance
                        if avg_performance > 0.8:
                            participant.trust_score = min(1.0, participant.trust_score + 0.01)
                        elif avg_performance < 0.6:
                            participant.trust_score = max(0.0, participant.trust_score - 0.02)
                
                # Check for inactive participants
                current_time = datetime.utcnow()
                for participant in self.participants.values():
                    if (participant.last_update and
                        (current_time - participant.last_update).total_seconds() > 86400):  # 24 hours
                        participant.status = ParticipantStatus.INACTIVE
                
                await asyncio.sleep(3600)  # Update hourly
                
            except Exception as e:
                self.logger.error(f"Error in performance monitor: {e}")
                await asyncio.sleep(1800)
    
    async def _privacy_auditor(self) -> None:
        """Audit privacy compliance and budget usage."""
        while self.system_active:
            try:
                # Check privacy budget depletion
                for participant in self.participants.values():
                    if participant.privacy_budget_remaining < 1.0:
                        participant.status = ParticipantStatus.SUSPENDED
                        self.logger.warning(f"Participant {participant.participant_id} suspended due to privacy budget depletion")
                
                # Audit aggregation methods for privacy compliance
                for model_id, model in self.models.items():
                    recent_updates = self.model_updates[model_id][-10:]  # Last 10 updates
                    if recent_updates:
                        avg_privacy_cost = np.mean([update.privacy_budget for update in recent_updates])
                        
                        # Adjust privacy level if needed
                        if avg_privacy_cost > 1.0:
                            model.privacy_level = min(1.0, model.privacy_level + 0.1)
                
                await asyncio.sleep(7200)  # Audit every 2 hours
                
            except Exception as e:
                self.logger.error(f"Error in privacy auditor: {e}")
                await asyncio.sleep(3600)