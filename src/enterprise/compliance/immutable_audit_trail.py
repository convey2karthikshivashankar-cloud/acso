"""
ACSO Enterprise Framework - Immutable Audit Trail System

This module implements blockchain-based audit logging with comprehensive activity tracking
and tamper-proof evidence collection for compliance and governance.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Union
from dataclasses import dataclass, field
from enum import Enum
import json
import hashlib
import uuid
from abc import ABC, abstractmethod
import boto3
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend

logger = logging.getLogger(__name__)

class AuditEventType(Enum):
    """Types of audit events."""
    USER_LOGIN = "user_login"
    USER_LOGOUT = "user_logout"
    DATA_ACCESS = "data_access"
    DATA_MODIFICATION = "data_modification"
    SYSTEM_CONFIGURATION = "system_configuration"
    PERMISSION_CHANGE = "permission_change"
    AGENT_ACTION = "agent_action"
    API_CALL = "api_call"
    FILE_ACCESS = "file_access"
    SECURITY_EVENT = "security_event"
    COMPLIANCE_EVENT = "compliance_event"
    ADMIN_ACTION = "admin_action"

class AuditSeverity(Enum):
    """Audit event severity levels."""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"

class ComplianceFramework(Enum):
    """Supported compliance frameworks."""
    SOX = "sox"
    GDPR = "gdpr"
    HIPAA = "hipaa"
    PCI_DSS = "pci_dss"
    ISO_27001 = "iso_27001"
    NIST = "nist"

@dataclass
class AuditEvent:
    """Immutable audit event structure."""
    event_id: str
    event_type: AuditEventType
    timestamp: datetime
    user_id: str
    session_id: str
    tenant_id: str
    resource_type: str
    resource_id: str
    action: str
    outcome: str  # success, failure, partial
    severity: AuditSeverity
    source_ip: str
    user_agent: str
    details: Dict[str, Any] = field(default_factory=dict)
    compliance_tags: List[ComplianceFramework] = field(default_factory=list)
    risk_score: float = 0.0
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert audit event to dictionary."""
        return {
            'event_id': self.event_id,
            'event_type': self.event_type.value,
            'timestamp': self.timestamp.isoformat(),
            'user_id': self.user_id,
            'session_id': self.session_id,
            'tenant_id': self.tenant_id,
            'resource_type': self.resource_type,
            'resource_id': self.resource_id,
            'action': self.action,
            'outcome': self.outcome,
            'severity': self.severity.value,
            'source_ip': self.source_ip,
            'user_agent': self.user_agent,
            'details': self.details,
            'compliance_tags': [tag.value for tag in self.compliance_tags],
            'risk_score': self.risk_score
        }
    
    def calculate_hash(self) -> str:
        """Calculate cryptographic hash of the event."""
        event_data = json.dumps(self.to_dict(), sort_keys=True)
        return hashlib.sha256(event_data.encode()).hexdigest()

@dataclass
class AuditBlock:
    """Blockchain block containing audit events."""
    block_id: str
    block_number: int
    timestamp: datetime
    previous_hash: str
    events: List[AuditEvent]
    merkle_root: str
    nonce: int = 0
    hash: str = ""
    
    def calculate_merkle_root(self) -> str:
        """Calculate Merkle root of all events in the block."""
        if not self.events:
            return hashlib.sha256(b"").hexdigest()
        
        hashes = [event.calculate_hash() for event in self.events]
        
        while len(hashes) > 1:
            next_level = []
            for i in range(0, len(hashes), 2):
                if i + 1 < len(hashes):
                    combined = hashes[i] + hashes[i + 1]
                else:
                    combined = hashes[i] + hashes[i]
                next_level.append(hashlib.sha256(combined.encode()).hexdigest())
            hashes = next_level
        
        return hashes[0]
    
    def calculate_hash(self) -> str:
        """Calculate block hash."""
        block_data = {
            'block_id': self.block_id,
            'block_number': self.block_number,
            'timestamp': self.timestamp.isoformat(),
            'previous_hash': self.previous_hash,
            'merkle_root': self.merkle_root,
            'nonce': self.nonce
        }
        block_string = json.dumps(block_data, sort_keys=True)
        return hashlib.sha256(block_string.encode()).hexdigest()
    
    def mine_block(self, difficulty: int = 4) -> None:
        """Mine the block with proof of work."""
        target = "0" * difficulty
        
        while not self.hash.startswith(target):
            self.nonce += 1
            self.hash = self.calculate_hash()
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert block to dictionary."""
        return {
            'block_id': self.block_id,
            'block_number': self.block_number,
            'timestamp': self.timestamp.isoformat(),
            'previous_hash': self.previous_hash,
            'merkle_root': self.merkle_root,
            'nonce': self.nonce,
            'hash': self.hash,
            'events': [event.to_dict() for event in self.events]
        }

class CryptographicSigner:
    """Handles cryptographic signing of audit events."""
    
    def __init__(self):
        """Initialize cryptographic signer."""
        self.private_key = None
        self.public_key = None
        self._generate_key_pair()
    
    def _generate_key_pair(self) -> None:
        """Generate RSA key pair for signing."""
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=2048,
            backend=default_backend()
        )
        self.public_key = self.private_key.public_key()
    
    def sign_event(self, event: AuditEvent) -> str:
        """Sign an audit event."""
        event_hash = event.calculate_hash()
        signature = self.private_key.sign(
            event_hash.encode(),
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        return signature.hex()
    
    def verify_signature(self, event: AuditEvent, signature: str) -> bool:
        """Verify event signature."""
        try:
            event_hash = event.calculate_hash()
            self.public_key.verify(
                bytes.fromhex(signature),
                event_hash.encode(),
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            return True
        except Exception:
            return False
    
    def get_public_key_pem(self) -> str:
        """Get public key in PEM format."""
        pem = self.public_key.serialize(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        return pem.decode()

class AuditStorage(ABC):
    """Abstract audit storage interface."""
    
    @abstractmethod
    async def store_block(self, block: AuditBlock) -> bool:
        """Store audit block."""
        pass
    
    @abstractmethod
    async def get_block(self, block_id: str) -> Optional[AuditBlock]:
        """Get audit block by ID."""
        pass
    
    @abstractmethod
    async def get_latest_block(self) -> Optional[AuditBlock]:
        """Get the latest block in the chain."""
        pass
    
    @abstractmethod
    async def get_blocks_by_range(self, start_block: int, end_block: int) -> List[AuditBlock]:
        """Get blocks in a range."""
        pass

class DynamoDBAuditStorage(AuditStorage):
    """DynamoDB-based audit storage."""
    
    def __init__(self, table_name: str, region: str = 'us-east-1'):
        """Initialize DynamoDB storage."""
        self.table_name = table_name
        self.dynamodb = boto3.resource('dynamodb', region_name=region)
        self.table = self.dynamodb.Table(table_name)
    
    async def store_block(self, block: AuditBlock) -> bool:
        """Store audit block in DynamoDB."""
        try:
            item = {
                'block_id': block.block_id,
                'block_number': block.block_number,
                'timestamp': block.timestamp.isoformat(),
                'block_data': json.dumps(block.to_dict()),
                'hash': block.hash,
                'event_count': len(block.events)
            }
            
            self.table.put_item(Item=item)
            return True
            
        except Exception as e:
            logger.error(f"Failed to store block in DynamoDB: {e}")
            return False
    
    async def get_block(self, block_id: str) -> Optional[AuditBlock]:
        """Get audit block from DynamoDB."""
        try:
            response = self.table.get_item(Key={'block_id': block_id})
            
            if 'Item' not in response:
                return None
            
            item = response['Item']
            block_data = json.loads(item['block_data'])
            
            # Reconstruct block
            events = [
                AuditEvent(
                    event_id=e['event_id'],
                    event_type=AuditEventType(e['event_type']),
                    timestamp=datetime.fromisoformat(e['timestamp']),
                    user_id=e['user_id'],
                    session_id=e['session_id'],
                    tenant_id=e['tenant_id'],
                    resource_type=e['resource_type'],
                    resource_id=e['resource_id'],
                    action=e['action'],
                    outcome=e['outcome'],
                    severity=AuditSeverity(e['severity']),
                    source_ip=e['source_ip'],
                    user_agent=e['user_agent'],
                    details=e['details'],
                    compliance_tags=[ComplianceFramework(tag) for tag in e['compliance_tags']],
                    risk_score=e['risk_score']
                )
                for e in block_data['events']
            ]
            
            block = AuditBlock(
                block_id=block_data['block_id'],
                block_number=block_data['block_number'],
                timestamp=datetime.fromisoformat(block_data['timestamp']),
                previous_hash=block_data['previous_hash'],
                events=events,
                merkle_root=block_data['merkle_root'],
                nonce=block_data['nonce'],
                hash=block_data['hash']
            )
            
            return block
            
        except Exception as e:
            logger.error(f"Failed to get block from DynamoDB: {e}")
            return None
    
    async def get_latest_block(self) -> Optional[AuditBlock]:
        """Get the latest block."""
        try:
            response = self.table.scan(
                ProjectionExpression='block_id, block_number',
                Select='SPECIFIC_ATTRIBUTES'
            )
            
            if not response['Items']:
                return None
            
            # Find block with highest block number
            latest_item = max(response['Items'], key=lambda x: x['block_number'])
            return await self.get_block(latest_item['block_id'])
            
        except Exception as e:
            logger.error(f"Failed to get latest block: {e}")
            return None
    
    async def get_blocks_by_range(self, start_block: int, end_block: int) -> List[AuditBlock]:
        """Get blocks in a range."""
        try:
            response = self.table.scan(
                FilterExpression='block_number BETWEEN :start AND :end',
                ExpressionAttributeValues={
                    ':start': start_block,
                    ':end': end_block
                }
            )
            
            blocks = []
            for item in response['Items']:
                block = await self.get_block(item['block_id'])
                if block:
                    blocks.append(block)
            
            return sorted(blocks, key=lambda x: x.block_number)
            
        except Exception as e:
            logger.error(f"Failed to get blocks by range: {e}")
            return []

class ImmutableAuditTrail:
    """
    Main immutable audit trail system using blockchain technology.
    
    Provides tamper-proof audit logging with cryptographic verification,
    comprehensive activity tracking, and compliance framework support.
    """
    
    def __init__(self, config: Dict[str, Any]):
        """Initialize immutable audit trail."""
        self.config = config
        self.storage = self._create_storage()
        self.signer = CryptographicSigner()
        
        # Blockchain parameters
        self.block_size = config.get('block_size', 100)
        self.mining_difficulty = config.get('mining_difficulty', 4)
        
        # Current block being built
        self.current_block: Optional[AuditBlock] = None
        self.pending_events: List[AuditEvent] = []
        
        # Metrics
        self.metrics = {
            'events_logged': 0,
            'blocks_created': 0,
            'verification_checks': 0,
            'integrity_violations': 0
        }
        
        logger.info("Immutable Audit Trail initialized")
    
    def _create_storage(self) -> AuditStorage:
        """Create audit storage based on configuration."""
        storage_type = self.config.get('storage', {}).get('type', 'dynamodb')
        
        if storage_type == 'dynamodb':
            return DynamoDBAuditStorage(
                table_name=self.config['storage']['table_name'],
                region=self.config['storage'].get('region', 'us-east-1')
            )
        else:
            raise ValueError(f"Unsupported storage type: {storage_type}")
    
    async def log_event(self, event: AuditEvent) -> str:
        """Log an audit event to the immutable trail."""
        try:
            # Add event to pending list
            self.pending_events.append(event)
            self.metrics['events_logged'] += 1
            
            # Check if we need to create a new block
            if len(self.pending_events) >= self.block_size:
                await self._create_block()
            
            logger.debug(f"Logged audit event: {event.event_id}")
            return event.event_id
            
        except Exception as e:
            logger.error(f"Failed to log audit event: {e}")
            raise
    
    async def _create_block(self) -> None:
        """Create a new block from pending events."""
        if not self.pending_events:
            return
        
        try:
            # Get previous block hash
            latest_block = await self.storage.get_latest_block()
            previous_hash = latest_block.hash if latest_block else "0" * 64
            block_number = latest_block.block_number + 1 if latest_block else 0
            
            # Create new block
            block = AuditBlock(
                block_id=str(uuid.uuid4()),
                block_number=block_number,
                timestamp=datetime.now(),
                previous_hash=previous_hash,
                events=self.pending_events.copy(),
                merkle_root=""
            )
            
            # Calculate Merkle root
            block.merkle_root = block.calculate_merkle_root()
            
            # Mine the block
            block.mine_block(self.mining_difficulty)
            
            # Store the block
            success = await self.storage.store_block(block)
            
            if success:
                self.pending_events.clear()
                self.metrics['blocks_created'] += 1
                logger.info(f"Created audit block: {block.block_id}")
            else:
                logger.error(f"Failed to store audit block: {block.block_id}")
                
        except Exception as e:
            logger.error(f"Failed to create audit block: {e}")
            raise
    
    async def verify_chain_integrity(self) -> Dict[str, Any]:
        """Verify the integrity of the entire audit chain."""
        try:
            self.metrics['verification_checks'] += 1
            
            # Get latest block to determine chain length
            latest_block = await self.storage.get_latest_block()
            if not latest_block:
                return {'valid': True, 'blocks_verified': 0, 'issues': []}
            
            # Verify all blocks
            issues = []
            blocks_verified = 0
            
            for block_num in range(latest_block.block_number + 1):
                blocks = await self.storage.get_blocks_by_range(block_num, block_num)
                
                if not blocks:
                    issues.append(f"Missing block {block_num}")
                    continue
                
                block = blocks[0]
                
                # Verify block hash
                calculated_hash = block.calculate_hash()
                if calculated_hash != block.hash:
                    issues.append(f"Block {block_num} hash mismatch")
                    self.metrics['integrity_violations'] += 1
                
                # Verify Merkle root
                calculated_merkle = block.calculate_merkle_root()
                if calculated_merkle != block.merkle_root:
                    issues.append(f"Block {block_num} Merkle root mismatch")
                    self.metrics['integrity_violations'] += 1
                
                # Verify previous hash linkage
                if block_num > 0:
                    prev_blocks = await self.storage.get_blocks_by_range(block_num - 1, block_num - 1)
                    if prev_blocks and prev_blocks[0].hash != block.previous_hash:
                        issues.append(f"Block {block_num} previous hash mismatch")
                        self.metrics['integrity_violations'] += 1
                
                blocks_verified += 1
            
            return {
                'valid': len(issues) == 0,
                'blocks_verified': blocks_verified,
                'issues': issues,
                'verification_timestamp': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to verify chain integrity: {e}")
            return {'valid': False, 'error': str(e)}
    
    async def search_events(self, 
                          criteria: Dict[str, Any],
                          start_time: Optional[datetime] = None,
                          end_time: Optional[datetime] = None) -> List[AuditEvent]:
        """Search audit events based on criteria."""
        try:
            # Get latest block to determine search range
            latest_block = await self.storage.get_latest_block()
            if not latest_block:
                return []
            
            # Search through all blocks
            matching_events = []
            
            for block_num in range(latest_block.block_number + 1):
                blocks = await self.storage.get_blocks_by_range(block_num, block_num)
                
                if not blocks:
                    continue
                
                block = blocks[0]
                
                for event in block.events:
                    # Time range filter
                    if start_time and event.timestamp < start_time:
                        continue
                    if end_time and event.timestamp > end_time:
                        continue
                    
                    # Criteria matching
                    if self._event_matches_criteria(event, criteria):
                        matching_events.append(event)
            
            return matching_events
            
        except Exception as e:
            logger.error(f"Failed to search events: {e}")
            return []
    
    def _event_matches_criteria(self, event: AuditEvent, criteria: Dict[str, Any]) -> bool:
        """Check if event matches search criteria."""
        for key, value in criteria.items():
            if key == 'event_type' and event.event_type.value != value:
                return False
            elif key == 'user_id' and event.user_id != value:
                return False
            elif key == 'tenant_id' and event.tenant_id != value:
                return False
            elif key == 'resource_type' and event.resource_type != value:
                return False
            elif key == 'action' and event.action != value:
                return False
            elif key == 'severity' and event.severity.value != value:
                return False
            elif key == 'outcome' and event.outcome != value:
                return False
            elif key == 'compliance_framework':
                if not any(tag.value == value for tag in event.compliance_tags):
                    return False
        
        return True
    
    async def generate_compliance_report(self, 
                                       framework: ComplianceFramework,
                                       start_time: datetime,
                                       end_time: datetime) -> Dict[str, Any]:
        """Generate compliance report for specific framework."""
        try:
            # Search for events tagged with the compliance framework
            events = await self.search_events(
                {'compliance_framework': framework.value},
                start_time,
                end_time
            )
            
            # Analyze events by type
            event_summary = {}
            risk_events = []
            
            for event in events:
                event_type = event.event_type.value
                if event_type not in event_summary:
                    event_summary[event_type] = {'count': 0, 'failures': 0}
                
                event_summary[event_type]['count'] += 1
                
                if event.outcome == 'failure':
                    event_summary[event_type]['failures'] += 1
                
                if event.risk_score > 7.0:  # High risk threshold
                    risk_events.append({
                        'event_id': event.event_id,
                        'timestamp': event.timestamp.isoformat(),
                        'event_type': event.event_type.value,
                        'risk_score': event.risk_score,
                        'user_id': event.user_id,
                        'action': event.action
                    })
            
            return {
                'framework': framework.value,
                'report_period': {
                    'start': start_time.isoformat(),
                    'end': end_time.isoformat()
                },
                'total_events': len(events),
                'event_summary': event_summary,
                'high_risk_events': risk_events,
                'compliance_score': self._calculate_compliance_score(events),
                'generated_at': datetime.now().isoformat()
            }
            
        except Exception as e:
            logger.error(f"Failed to generate compliance report: {e}")
            return {'error': str(e)}
    
    def _calculate_compliance_score(self, events: List[AuditEvent]) -> float:
        """Calculate compliance score based on events."""
        if not events:
            return 100.0
        
        total_events = len(events)
        failure_events = len([e for e in events if e.outcome == 'failure'])
        high_risk_events = len([e for e in events if e.risk_score > 7.0])
        
        # Simple scoring algorithm
        failure_penalty = (failure_events / total_events) * 30
        risk_penalty = (high_risk_events / total_events) * 20
        
        score = max(0, 100 - failure_penalty - risk_penalty)
        return round(score, 2)
    
    async def export_evidence_package(self, 
                                    case_id: str,
                                    event_ids: List[str]) -> Dict[str, Any]:
        """Export tamper-proof evidence package for legal/audit purposes."""
        try:
            evidence_events = []
            
            # Collect specified events
            for event_id in event_ids:
                # Search for the event across all blocks
                events = await self.search_events({'event_id': event_id})
                if events:
                    evidence_events.extend(events)
            
            # Create evidence package
            package = {
                'case_id': case_id,
                'export_timestamp': datetime.now().isoformat(),
                'events': [event.to_dict() for event in evidence_events],
                'chain_verification': await self.verify_chain_integrity(),
                'digital_signatures': {},
                'public_key': self.signer.get_public_key_pem()
            }
            
            # Sign each event
            for event in evidence_events:
                signature = self.signer.sign_event(event)
                package['digital_signatures'][event.event_id] = signature
            
            # Calculate package hash
            package_data = json.dumps(package, sort_keys=True)
            package['package_hash'] = hashlib.sha256(package_data.encode()).hexdigest()
            
            return package
            
        except Exception as e:
            logger.error(f"Failed to export evidence package: {e}")
            return {'error': str(e)}
    
    def get_metrics(self) -> Dict[str, Any]:
        """Get audit trail metrics."""
        return {
            **self.metrics,
            'pending_events': len(self.pending_events),
            'block_size_limit': self.block_size,
            'mining_difficulty': self.mining_difficulty
        }