"""
Security and access control system for ACSO.
"""

import asyncio
import json
import hashlib
import hmac
import time
import uuid
import base64
import secrets
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from enum import Enum
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes
import ssl
import certifi

from config.settings import settingsclass E
ncryptionType(str, Enum):
    """Types of encryption supported."""
    AES_256_GCM = "aes_256_gcm"
    FERNET = "fernet"
    RSA_2048 = "rsa_2048"
    RSA_4096 = "rsa_4096"


class SecurityLevel(str, Enum):
    """Security levels for different data types."""
    PUBLIC = "public"
    INTERNAL = "internal"
    CONFIDENTIAL = "confidential"
    RESTRICTED = "restricted"
    TOP_SECRET = "top_secret"


class DataEncryptionManager:
    """Manages data encryption and decryption operations."""
    
    def __init__(self):
        self.encryption_keys = {}
        self.key_rotation_schedule = {}
        self.encryption_algorithms = self._initialize_encryption_algorithms()
        
    def _initialize_encryption_algorithms(self) -> Dict[str, Any]:
        """Initialize encryption algorithms and configurations."""
        return {
            EncryptionType.FERNET: {
                "key_size": 32,
                "algorithm": "AES-128",
                "mode": "CBC",
                "use_case": "general_purpose"
            },
            EncryptionType.AES_256_GCM: {
                "key_size": 32,
                "algorithm": "AES-256",
                "mode": "GCM",
                "use_case": "high_security"
            },
            EncryptionType.RSA_2048: {
                "key_size": 2048,
                "algorithm": "RSA",
                "use_case": "key_exchange"
            },
            EncryptionType.RSA_4096: {
                "key_size": 4096,
                "algorithm": "RSA",
                "use_case": "high_security_key_exchange"
            }
        }
        
    async def generate_encryption_key(self, encryption_type: EncryptionType, 
                                    key_id: Optional[str] = None) -> str:
        """Generate a new encryption key."""
        try:
            if not key_id:
                key_id = str(uuid.uuid4())
                
            if encryption_type == EncryptionType.FERNET:
                key = Fernet.generate_key()
                key_data = {
                    "key": key.decode('utf-8'),
                    "type": encryption_type,
                    "created_at": datetime.utcnow().isoformat(),
                    "algorithm": "Fernet"
                }
                
            elif encryption_type == EncryptionType.AES_256_GCM:
                key = secrets.token_bytes(32)  # 256 bits
                key_data = {
                    "key": base64.b64encode(key).decode('utf-8'),
                    "type": encryption_type,
                    "created_at": datetime.utcnow().isoformat(),
                    "algorithm": "AES-256-GCM"
                }
                
            elif encryption_type in [EncryptionType.RSA_2048, EncryptionType.RSA_4096]:
                key_size = 2048 if encryption_type == EncryptionType.RSA_2048 else 4096
                private_key = rsa.generate_private_key(
                    public_exponent=65537,
                    key_size=key_size
                )
                
                # Serialize private key
                private_pem = private_key.private_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PrivateFormat.PKCS8,
                    encryption_algorithm=serialization.NoEncryption()
                )
                
                # Serialize public key
                public_key = private_key.public_key()
                public_pem = public_key.public_bytes(
                    encoding=serialization.Encoding.PEM,
                    format=serialization.PublicFormat.SubjectPublicKeyInfo
                )
                
                key_data = {
                    "private_key": private_pem.decode('utf-8'),
                    "public_key": public_pem.decode('utf-8'),
                    "type": encryption_type,
                    "created_at": datetime.utcnow().isoformat(),
                    "algorithm": f"RSA-{key_size}"
                }
                
            else:
                raise ValueError(f"Unsupported encryption type: {encryption_type}")
                
            # Store key
            self.encryption_keys[key_id] = key_data
            
            # Schedule key rotation
            rotation_interval = timedelta(days=90)  # Rotate every 90 days
            self.key_rotation_schedule[key_id] = datetime.utcnow() + rotation_interval
            
            return key_id
            
        except Exception as e:
            raise Exception(f"Key generation failed: {e}")
            
    async def encrypt_data(self, data: str, key_id: str, 
                         additional_data: Optional[bytes] = None) -> Dict[str, Any]:
        """Encrypt data using the specified key."""
        try:
            if key_id not in self.encryption_keys:
                raise ValueError(f"Key {key_id} not found")
                
            key_data = self.encryption_keys[key_id]
            encryption_type = EncryptionType(key_data["type"])
            
            if encryption_type == EncryptionType.FERNET:
                fernet_key = key_data["key"].encode('utf-8')
                f = Fernet(fernet_key)
                encrypted_data = f.encrypt(data.encode('utf-8'))
                
                return {
                    "encrypted_data": base64.b64encode(encrypted_data).decode('utf-8'),
                    "encryption_type": encryption_type.value,
                    "key_id": key_id,
                    "algorithm": "Fernet"
                }
                
            elif encryption_type == EncryptionType.AES_256_GCM:
                key = base64.b64decode(key_data["key"])
                
                # Generate random IV
                iv = secrets.token_bytes(12)  # 96 bits for GCM
                
                # Create cipher
                cipher = Cipher(algorithms.AES(key), modes.GCM(iv))
                encryptor = cipher.encryptor()
                
                # Add additional authenticated data if provided
                if additional_data:
                    encryptor.authenticate_additional_data(additional_data)
                    
                # Encrypt data
                ciphertext = encryptor.update(data.encode('utf-8')) + encryptor.finalize()
                
                return {
                    "encrypted_data": base64.b64encode(ciphertext).decode('utf-8'),
                    "iv": base64.b64encode(iv).decode('utf-8'),
                    "tag": base64.b64encode(encryptor.tag).decode('utf-8'),
                    "encryption_type": encryption_type.value,
                    "key_id": key_id,
                    "algorithm": "AES-256-GCM"
                }
                
            elif encryption_type in [EncryptionType.RSA_2048, EncryptionType.RSA_4096]:
                # Load public key for encryption
                public_key_pem = key_data["public_key"].encode('utf-8')
                public_key = serialization.load_pem_public_key(public_key_pem)
                
                # RSA can only encrypt small amounts of data
                # For larger data, use hybrid encryption (RSA + AES)
                if len(data.encode('utf-8')) > 190:  # RSA-2048 limit minus padding
                    return await self._hybrid_encrypt(data, public_key, key_id, encryption_type)
                else:
                    encrypted_data = public_key.encrypt(
                        data.encode('utf-8'),
                        padding.OAEP(
                            mgf=padding.MGF1(algorithm=hashes.SHA256()),
                            algorithm=hashes.SHA256(),
                            label=None
                        )
                    )
                    
                    return {
                        "encrypted_data": base64.b64encode(encrypted_data).decode('utf-8'),
                        "encryption_type": encryption_type.value,
                        "key_id": key_id,
                        "algorithm": key_data["algorithm"]
                    }
                    
            else:
                raise ValueError(f"Unsupported encryption type: {encryption_type}")
                
        except Exception as e:
            raise Exception(f"Encryption failed: {e}")
            
    async def decrypt_data(self, encrypted_data_info: Dict[str, Any]) -> str:
        """Decrypt data using the stored key information."""
        try:
            key_id = encrypted_data_info["key_id"]
            encryption_type = EncryptionType(encrypted_data_info["encryption_type"])
            
            if key_id not in self.encryption_keys:
                raise ValueError(f"Key {key_id} not found")
                
            key_data = self.encryption_keys[key_id]
            
            if encryption_type == EncryptionType.FERNET:
                fernet_key = key_data["key"].encode('utf-8')
                f = Fernet(fernet_key)
                encrypted_bytes = base64.b64decode(encrypted_data_info["encrypted_data"])
                decrypted_data = f.decrypt(encrypted_bytes)
                
                return decrypted_data.decode('utf-8')
                
            elif encryption_type == EncryptionType.AES_256_GCM:
                key = base64.b64decode(key_data["key"])
                iv = base64.b64decode(encrypted_data_info["iv"])
                tag = base64.b64decode(encrypted_data_info["tag"])
                ciphertext = base64.b64decode(encrypted_data_info["encrypted_data"])
                
                # Create cipher
                cipher = Cipher(algorithms.AES(key), modes.GCM(iv, tag))
                decryptor = cipher.decryptor()
                
                # Decrypt data
                decrypted_data = decryptor.update(ciphertext) + decryptor.finalize()
                
                return decrypted_data.decode('utf-8')
                
            elif encryption_type in [EncryptionType.RSA_2048, EncryptionType.RSA_4096]:
                # Load private key for decryption
                private_key_pem = key_data["private_key"].encode('utf-8')
                private_key = serialization.load_pem_private_key(private_key_pem, password=None)
                
                # Check if this is hybrid encryption
                if "aes_key" in encrypted_data_info:
                    return await self._hybrid_decrypt(encrypted_data_info, private_key)
                else:
                    encrypted_bytes = base64.b64decode(encrypted_data_info["encrypted_data"])
                    decrypted_data = private_key.decrypt(
                        encrypted_bytes,
                        padding.OAEP(
                            mgf=padding.MGF1(algorithm=hashes.SHA256()),
                            algorithm=hashes.SHA256(),
                            label=None
                        )
                    )
                    
                    return decrypted_data.decode('utf-8')
                    
            else:
                raise ValueError(f"Unsupported encryption type: {encryption_type}")
                
        except Exception as e:
            raise Exception(f"Decryption failed: {e}")
            
    async def _hybrid_encrypt(self, data: str, public_key, key_id: str, 
                            encryption_type: EncryptionType) -> Dict[str, Any]:
        """Perform hybrid encryption (RSA + AES) for large data."""
        try:
            # Generate random AES key
            aes_key = secrets.token_bytes(32)  # 256 bits
            
            # Encrypt data with AES
            iv = secrets.token_bytes(12)  # 96 bits for GCM
            cipher = Cipher(algorithms.AES(aes_key), modes.GCM(iv))
            encryptor = cipher.encryptor()
            ciphertext = encryptor.update(data.encode('utf-8')) + encryptor.finalize()
            
            # Encrypt AES key with RSA
            encrypted_aes_key = public_key.encrypt(
                aes_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            return {
                "encrypted_data": base64.b64encode(ciphertext).decode('utf-8'),
                "aes_key": base64.b64encode(encrypted_aes_key).decode('utf-8'),
                "iv": base64.b64encode(iv).decode('utf-8'),
                "tag": base64.b64encode(encryptor.tag).decode('utf-8'),
                "encryption_type": encryption_type.value,
                "key_id": key_id,
                "algorithm": "RSA+AES-256-GCM"
            }
            
        except Exception as e:
            raise Exception(f"Hybrid encryption failed: {e}")
            
    async def _hybrid_decrypt(self, encrypted_data_info: Dict[str, Any], private_key) -> str:
        """Perform hybrid decryption (RSA + AES) for large data."""
        try:
            # Decrypt AES key with RSA
            encrypted_aes_key = base64.b64decode(encrypted_data_info["aes_key"])
            aes_key = private_key.decrypt(
                encrypted_aes_key,
                padding.OAEP(
                    mgf=padding.MGF1(algorithm=hashes.SHA256()),
                    algorithm=hashes.SHA256(),
                    label=None
                )
            )
            
            # Decrypt data with AES
            iv = base64.b64decode(encrypted_data_info["iv"])
            tag = base64.b64decode(encrypted_data_info["tag"])
            ciphertext = base64.b64decode(encrypted_data_info["encrypted_data"])
            
            cipher = Cipher(algorithms.AES(aes_key), modes.GCM(iv, tag))
            decryptor = cipher.decryptor()
            decrypted_data = decryptor.update(ciphertext) + decryptor.finalize()
            
            return decrypted_data.decode('utf-8')
            
        except Exception as e:
            raise Exception(f"Hybrid decryption failed: {e}")
            
    async def rotate_key(self, key_id: str) -> str:
        """Rotate an encryption key."""
        try:
            if key_id not in self.encryption_keys:
                raise ValueError(f"Key {key_id} not found")
                
            old_key_data = self.encryption_keys[key_id]
            encryption_type = EncryptionType(old_key_data["type"])
            
            # Generate new key
            new_key_id = await self.generate_encryption_key(encryption_type)
            
            # Mark old key for deprecation
            old_key_data["status"] = "deprecated"
            old_key_data["deprecated_at"] = datetime.utcnow().isoformat()
            old_key_data["replacement_key"] = new_key_id
            
            return new_key_id
            
        except Exception as e:
            raise Exception(f"Key rotation failed: {e}")
            
    async def get_key_info(self, key_id: str) -> Dict[str, Any]:
        """Get information about an encryption key."""
        if key_id not in self.encryption_keys:
            raise ValueError(f"Key {key_id} not found")
            
        key_data = self.encryption_keys[key_id].copy()
        
        # Remove sensitive key material from info
        if "key" in key_data:
            del key_data["key"]
        if "private_key" in key_data:
            del key_data["private_key"]
            
        return key_data
        
    async def list_keys(self) -> List[Dict[str, Any]]:
        """List all encryption keys (without sensitive data)."""
        keys_info = []
        
        for key_id, key_data in self.encryption_keys.items():
            key_info = key_data.copy()
            
            # Remove sensitive key material
            if "key" in key_info:
                del key_info["key"]
            if "private_key" in key_info:
                del key_info["private_key"]
                
            key_info["key_id"] = key_id
            keys_info.append(key_info)
            
        return keys_infoclass Sec
ureCommunicationManager:
    """Manages secure communication between ACSO components."""
    
    def __init__(self):
        self.tls_contexts = {}
        self.api_keys = {}
        self.session_tokens = {}
        self.communication_keys = {}
        self.message_integrity_keys = {}
        
    async def initialize_secure_communication(self) -> None:
        """Initialize secure communication infrastructure."""
        try:
            # Create TLS context for secure connections
            await self._create_tls_context()
            
            # Generate communication keys
            await self._generate_communication_keys()
            
            # Initialize API key management
            await self._initialize_api_keys()
            
            print("Secure communication initialized successfully")
            
        except Exception as e:
            raise Exception(f"Secure communication initialization failed: {e}")
            
    async def _create_tls_context(self) -> None:
        """Create TLS context for secure connections."""
        try:
            # Create SSL context for client connections
            client_context = ssl.create_default_context(cafile=certifi.where())
            client_context.check_hostname = True
            client_context.verify_mode = ssl.CERT_REQUIRED
            
            # Create SSL context for server connections
            server_context = ssl.create_default_context(ssl.Purpose.CLIENT_AUTH)
            
            # Configure security settings
            client_context.minimum_version = ssl.TLSVersion.TLSv1_2
            server_context.minimum_version = ssl.TLSVersion.TLSv1_2
            
            # Disable weak ciphers
            client_context.set_ciphers('ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS')
            server_context.set_ciphers('ECDHE+AESGCM:ECDHE+CHACHA20:DHE+AESGCM:DHE+CHACHA20:!aNULL:!MD5:!DSS')
            
            self.tls_contexts = {
                "client": client_context,
                "server": server_context
            }
            
        except Exception as e:
            raise Exception(f"TLS context creation failed: {e}")
            
    async def _generate_communication_keys(self) -> None:
        """Generate keys for secure inter-agent communication."""
        try:
            encryption_manager = DataEncryptionManager()
            
            # Generate symmetric key for fast communication encryption
            comm_key_id = await encryption_manager.generate_encryption_key(EncryptionType.AES_256_GCM)
            self.communication_keys["symmetric"] = comm_key_id
            
            # Generate asymmetric keys for key exchange
            rsa_key_id = await encryption_manager.generate_encryption_key(EncryptionType.RSA_2048)
            self.communication_keys["asymmetric"] = rsa_key_id
            
            # Generate HMAC keys for message integrity
            hmac_key = secrets.token_bytes(32)
            self.message_integrity_keys["hmac"] = base64.b64encode(hmac_key).decode('utf-8')
            
        except Exception as e:
            raise Exception(f"Communication key generation failed: {e}")
            
    async def _initialize_api_keys(self) -> None:
        """Initialize API key management."""
        try:
            # Generate master API key for system components
            master_key = secrets.token_urlsafe(32)
            self.api_keys["master"] = {
                "key": master_key,
                "created_at": datetime.utcnow().isoformat(),
                "permissions": ["system_admin"],
                "expires_at": (datetime.utcnow() + timedelta(days=365)).isoformat()
            }
            
            # Generate agent-specific API keys
            agent_types = ["supervisor", "threat-hunter", "incident-response", 
                          "service-orchestration", "financial-intelligence"]
            
            for agent_type in agent_types:
                agent_key = secrets.token_urlsafe(24)
                self.api_keys[f"{agent_type}_key"] = {
                    "key": agent_key,
                    "agent_type": agent_type,
                    "created_at": datetime.utcnow().isoformat(),
                    "permissions": [f"{agent_type}_operations"],
                    "expires_at": (datetime.utcnow() + timedelta(days=90)).isoformat()
                }
                
        except Exception as e:
            raise Exception(f"API key initialization failed: {e}")
            
    async def encrypt_message(self, message: str, recipient_id: str) -> Dict[str, Any]:
        """Encrypt a message for secure transmission."""
        try:
            encryption_manager = DataEncryptionManager()
            
            # Use symmetric encryption for performance
            comm_key_id = self.communication_keys.get("symmetric")
            if not comm_key_id:
                raise ValueError("Communication encryption key not available")
                
            # Add message metadata
            message_data = {
                "content": message,
                "sender_id": "system",
                "recipient_id": recipient_id,
                "timestamp": datetime.utcnow().isoformat(),
                "message_id": str(uuid.uuid4())
            }
            
            # Encrypt message
            encrypted_data = await encryption_manager.encrypt_data(
                json.dumps(message_data), 
                comm_key_id
            )
            
            # Add message integrity check
            integrity_signature = await self._sign_message(encrypted_data)
            encrypted_data["integrity_signature"] = integrity_signature
            
            return encrypted_data
            
        except Exception as e:
            raise Exception(f"Message encryption failed: {e}")
            
    async def decrypt_message(self, encrypted_message: Dict[str, Any]) -> Dict[str, Any]:
        """Decrypt a received message."""
        try:
            encryption_manager = DataEncryptionManager()
            
            # Verify message integrity
            if not await self._verify_message_integrity(encrypted_message):
                raise ValueError("Message integrity verification failed")
                
            # Remove integrity signature for decryption
            message_to_decrypt = encrypted_message.copy()
            del message_to_decrypt["integrity_signature"]
            
            # Decrypt message
            decrypted_json = await encryption_manager.decrypt_data(message_to_decrypt)
            message_data = json.loads(decrypted_json)
            
            # Verify message freshness (prevent replay attacks)
            message_time = datetime.fromisoformat(message_data["timestamp"])
            if (datetime.utcnow() - message_time).total_seconds() > 300:  # 5 minutes
                raise ValueError("Message too old, possible replay attack")
                
            return message_data
            
        except Exception as e:
            raise Exception(f"Message decryption failed: {e}")
            
    async def _sign_message(self, message_data: Dict[str, Any]) -> str:
        """Create HMAC signature for message integrity."""
        try:
            hmac_key = base64.b64decode(self.message_integrity_keys["hmac"])
            
            # Create message hash
            message_bytes = json.dumps(message_data, sort_keys=True).encode('utf-8')
            signature = hmac.new(hmac_key, message_bytes, hashlib.sha256).hexdigest()
            
            return signature
            
        except Exception as e:
            raise Exception(f"Message signing failed: {e}")
            
    async def _verify_message_integrity(self, message_data: Dict[str, Any]) -> bool:
        """Verify HMAC signature for message integrity."""
        try:
            if "integrity_signature" not in message_data:
                return False
                
            received_signature = message_data["integrity_signature"]
            
            # Recreate signature
            message_copy = message_data.copy()
            del message_copy["integrity_signature"]
            expected_signature = await self._sign_message(message_copy)
            
            # Use constant-time comparison to prevent timing attacks
            return hmac.compare_digest(received_signature, expected_signature)
            
        except Exception as e:
            return False
            
    async def generate_session_token(self, agent_id: str, permissions: List[str]) -> str:
        """Generate a secure session token for an agent."""
        try:
            token_data = {
                "agent_id": agent_id,
                "permissions": permissions,
                "issued_at": datetime.utcnow().isoformat(),
                "expires_at": (datetime.utcnow() + timedelta(hours=8)).isoformat(),
                "token_id": str(uuid.uuid4())
            }
            
            # Create JWT-like token (simplified)
            token_payload = base64.b64encode(json.dumps(token_data).encode('utf-8')).decode('utf-8')
            
            # Sign token
            hmac_key = base64.b64decode(self.message_integrity_keys["hmac"])
            signature = hmac.new(hmac_key, token_payload.encode('utf-8'), hashlib.sha256).hexdigest()
            
            session_token = f"{token_payload}.{signature}"
            
            # Store token
            self.session_tokens[token_data["token_id"]] = token_data
            
            return session_token
            
        except Exception as e:
            raise Exception(f"Session token generation failed: {e}")
            
    async def validate_session_token(self, token: str) -> Optional[Dict[str, Any]]:
        """Validate a session token."""
        try:
            # Parse token
            parts = token.split('.')
            if len(parts) != 2:
                return None
                
            token_payload, signature = parts
            
            # Verify signature
            hmac_key = base64.b64decode(self.message_integrity_keys["hmac"])
            expected_signature = hmac.new(hmac_key, token_payload.encode('utf-8'), hashlib.sha256).hexdigest()
            
            if not hmac.compare_digest(signature, expected_signature):
                return None
                
            # Decode payload
            token_data = json.loads(base64.b64decode(token_payload).decode('utf-8'))
            
            # Check expiration
            expires_at = datetime.fromisoformat(token_data["expires_at"])
            if datetime.utcnow() > expires_at:
                return None
                
            return token_data
            
        except Exception as e:
            return None
            
    async def validate_api_key(self, api_key: str) -> Optional[Dict[str, Any]]:
        """Validate an API key."""
        try:
            for key_name, key_data in self.api_keys.items():
                if key_data["key"] == api_key:
                    # Check expiration
                    expires_at = datetime.fromisoformat(key_data["expires_at"])
                    if datetime.utcnow() > expires_at:
                        return None
                        
                    return key_data
                    
            return None
            
        except Exception as e:
            return None
            
    async def create_secure_connection_config(self, endpoint: str) -> Dict[str, Any]:
        """Create configuration for secure connections."""
        try:
            return {
                "endpoint": endpoint,
                "tls_context": self.tls_contexts["client"],
                "verify_ssl": True,
                "timeout": 30,
                "headers": {
                    "User-Agent": "ACSO-Agent/1.0",
                    "Accept": "application/json",
                    "Content-Type": "application/json"
                },
                "ssl_context": self.tls_contexts["client"]
            }
            
        except Exception as e:
            raise Exception(f"Secure connection config creation failed: {e}")


class DataClassificationManager:
    """Manages data classification and security policies."""
    
    def __init__(self):
        self.classification_rules = self._initialize_classification_rules()
        self.security_policies = self._initialize_security_policies()
        
    def _initialize_classification_rules(self) -> Dict[str, Dict[str, Any]]:
        """Initialize data classification rules."""
        return {
            "agent_communications": {
                "security_level": SecurityLevel.CONFIDENTIAL,
                "encryption_required": True,
                "encryption_type": EncryptionType.AES_256_GCM,
                "retention_days": 90
            },
            "task_data": {
                "security_level": SecurityLevel.INTERNAL,
                "encryption_required": True,
                "encryption_type": EncryptionType.FERNET,
                "retention_days": 365
            },
            "incident_data": {
                "security_level": SecurityLevel.CONFIDENTIAL,
                "encryption_required": True,
                "encryption_type": EncryptionType.AES_256_GCM,
                "retention_days": 2555  # 7 years
            },
            "financial_data": {
                "security_level": SecurityLevel.RESTRICTED,
                "encryption_required": True,
                "encryption_type": EncryptionType.AES_256_GCM,
                "retention_days": 2555  # 7 years
            },
            "system_logs": {
                "security_level": SecurityLevel.INTERNAL,
                "encryption_required": False,
                "retention_days": 365
            },
            "user_credentials": {
                "security_level": SecurityLevel.TOP_SECRET,
                "encryption_required": True,
                "encryption_type": EncryptionType.AES_256_GCM,
                "retention_days": 90
            }
        }
        
    def _initialize_security_policies(self) -> Dict[str, Dict[str, Any]]:
        """Initialize security policies by classification level."""
        return {
            SecurityLevel.PUBLIC: {
                "encryption_required": False,
                "access_logging": False,
                "approval_required": False
            },
            SecurityLevel.INTERNAL: {
                "encryption_required": False,
                "access_logging": True,
                "approval_required": False,
                "min_key_size": 128
            },
            SecurityLevel.CONFIDENTIAL: {
                "encryption_required": True,
                "access_logging": True,
                "approval_required": False,
                "min_key_size": 256,
                "key_rotation_days": 90
            },
            SecurityLevel.RESTRICTED: {
                "encryption_required": True,
                "access_logging": True,
                "approval_required": True,
                "min_key_size": 256,
                "key_rotation_days": 30,
                "multi_factor_auth": True
            },
            SecurityLevel.TOP_SECRET: {
                "encryption_required": True,
                "access_logging": True,
                "approval_required": True,
                "min_key_size": 256,
                "key_rotation_days": 7,
                "multi_factor_auth": True,
                "air_gapped_storage": True
            }
        }
        
    def classify_data(self, data_type: str, content: str) -> Dict[str, Any]:
        """Classify data and return security requirements."""
        try:
            # Get classification rules
            rules = self.classification_rules.get(data_type, {
                "security_level": SecurityLevel.INTERNAL,
                "encryption_required": True,
                "encryption_type": EncryptionType.FERNET,
                "retention_days": 365
            })
            
            # Get security policy
            security_level = rules["security_level"]
            policy = self.security_policies[security_level]
            
            # Combine rules and policy
            classification = {
                "data_type": data_type,
                "security_level": security_level.value,
                "classification_rules": rules,
                "security_policy": policy,
                "classified_at": datetime.utcnow().isoformat()
            }
            
            return classification
            
        except Exception as e:
            # Default to high security on error
            return {
                "data_type": data_type,
                "security_level": SecurityLevel.CONFIDENTIAL.value,
                "encryption_required": True,
                "error": str(e)
            }
            
    def get_encryption_requirements(self, data_type: str) -> Dict[str, Any]:
        """Get encryption requirements for a data type."""
        classification = self.classify_data(data_type, "")
        
        rules = classification.get("classification_rules", {})
        policy = classification.get("security_policy", {})
        
        return {
            "encryption_required": rules.get("encryption_required", True),
            "encryption_type": rules.get("encryption_type", EncryptionType.AES_256_GCM),
            "min_key_size": policy.get("min_key_size", 256),
            "key_rotation_days": policy.get("key_rotation_days", 90)
        }


# Global security instances
data_encryption_manager = DataEncryptionManager()
secure_communication_manager = SecureCommunicationManager()
data_classification_manager = DataClassificationManager()


async def initialize_security_system() -> None:
    """Initialize the complete security system."""
    try:
        # Initialize secure communication
        await secure_communication_manager.initialize_secure_communication()
        
        # Generate default encryption keys
        await data_encryption_manager.generate_encryption_key(EncryptionType.FERNET, "default_fernet")
        await data_encryption_manager.generate_encryption_key(EncryptionType.AES_256_GCM, "default_aes")
        
        print("Security system initialized successfully")
        
    except Exception as e:
        print(f"Security system initialization failed: {e}")
        raise


async def encrypt_sensitive_data(data: str, data_type: str) -> Dict[str, Any]:
    """Encrypt sensitive data based on classification."""
    try:
        # Get encryption requirements
        requirements = data_classification_manager.get_encryption_requirements(data_type)
        
        if not requirements["encryption_required"]:
            return {"data": data, "encrypted": False}
            
        # Select appropriate key
        encryption_type = requirements["encryption_type"]
        if encryption_type == EncryptionType.FERNET:
            key_id = "default_fernet"
        else:
            key_id = "default_aes"
            
        # Encrypt data
        encrypted_data = await data_encryption_manager.encrypt_data(data, key_id)
        encrypted_data["data_type"] = data_type
        encrypted_data["encrypted"] = True
        
        return encrypted_data
        
    except Exception as e:
        raise Exception(f"Data encryption failed: {e}")


async def decrypt_sensitive_data(encrypted_data: Dict[str, Any]) -> str:
    """Decrypt sensitive data."""
    try:
        if not encrypted_data.get("encrypted", False):
            return encrypted_data.get("data", "")
            
        return await data_encryption_manager.decrypt_data(encrypted_data)
        
    except Exception as e:
        raise Exception(f"Data decryption failed: {e}")