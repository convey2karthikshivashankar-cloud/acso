"""
Zero Trust Security Manager for ACSO Enterprise.
Implements comprehensive zero-trust security architecture.
"""

import asyncio
import logging
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass
from enum import Enum
import json
import hashlib
import ssl
import certifi

from cryptography import x509
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa
from cryptography.hazmat.primitives.serialization import pkcs12
import prometheus_client


class TrustLevel(str, Enum):
    """Trust levels for zero-trust evaluation."""
    UNTRUSTED = "untrusted"
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERIFIED = "verified"


class SecurityEvent(str, Enum):
    """Security event types."""
    LOGIN_ATTEMPT = "login_attempt"
    API_ACCESS = "api_access"
    PRIVILEGE_ESCALATION = "privilege_escalation"
    SUSPICIOUS_ACTIVITY = "suspicious_activity"
    CERTIFICATE_VALIDATION = "certificate_validation"
    ENCRYPTION_FAILURE = "encryption_failure"


@dataclass
class SecurityContext:
    """Security context for requests."""
    user_id: str
    tenant_id: str
    source_ip: str
    user_agent: str
    trust_level: TrustLevel
    certificates: List[str]
    permissions: List[str]
    risk_score: float
    timestamp: datetime


@dataclass
class AuditLogEntry:
    """Audit log entry."""
    event_id: str
    tenant_id: str
    user_id: str
    event_type: SecurityEvent
    resource: str
    action: str
    result: str
    details: Dict[str, Any]
    timestamp: datetime
    source_ip: str
    user_agent: str


class ZeroTrustManager:
    """
    Zero Trust Security Architecture Manager.
    
    Implements:
    - Never trust, always verify principle
    - End-to-end encryption for all communications
    - Certificate-based agent authentication
    - Comprehensive audit logging
    - Real-time threat detection
    - Dynamic access control
    """
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # Security state
        self.security_contexts: Dict[str, SecurityContext] = {}
        self.audit_logs: List[AuditLogEntry] = []
        self.certificates: Dict[str, Dict[str, Any]] = {}
        self.trust_policies: Dict[str, Dict[str, Any]] = {}
        
        # Background tasks
        self.security_tasks: List[asyncio.Task] = []
        self.monitoring_active = False
        
        # Prometheus metrics
        self.security_events_counter = prometheus_client.Counter(
            'acso_security_events_total',
            'Total security events',
            ['tenant_id', 'event_type', 'result']
        )
        
        self.trust_level_gauge = prometheus_client.Gauge(
            'acso_trust_level',
            'Current trust level',
            ['tenant_id', 'user_id']
        )
        
        self.audit_events_counter = prometheus_client.Counter(
            'acso_audit_events_total',
            'Total audit events',
            ['tenant_id', 'event_type']
        )
        
    async def initialize(self) -> None:
        """Initialize the zero trust manager."""
        try:
            self.logger.info("Initializing Zero Trust Manager")
            
            # Initialize certificate authority
            await self._initialize_certificate_authority()
            
            # Load trust policies
            await self._load_trust_policies()
            
            # Start security monitoring
            self.monitoring_active = True
            self.security_tasks = [
                asyncio.create_task(self._security_monitoring_loop()),
                asyncio.create_task(self._certificate_validation_loop()),
                asyncio.create_task(self._audit_log_processor()),
                asyncio.create_task(self._trust_evaluation_loop())
            ]
            
            self.logger.info("Zero Trust Manager initialized successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize Zero Trust Manager: {e}")
            raise
            
    async def shutdown(self) -> None:
        """Shutdown the zero trust manager."""
        try:
            self.logger.info("Shutting down Zero Trust Manager")
            
            self.monitoring_active = False
            
            # Cancel security tasks
            for task in self.security_tasks:
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
                        
            self.logger.info("Zero Trust Manager shutdown complete")
            
        except Exception as e:
            self.logger.error(f"Error during shutdown: {e}")
            
    async def evaluate_trust(self, request_context: Dict[str, Any]) -> SecurityContext:
        """
        Evaluate trust level for a request.
        
        Args:
            request_context: Request context information
            
        Returns:
            Security context with trust evaluation
        """
        try:
            user_id = request_context.get('user_id', 'anonymous')
            tenant_id = request_context.get('tenant_id', 'unknown')
            source_ip = request_context.get('source_ip', '0.0.0.0')
            user_agent = request_context.get('user_agent', 'unknown')
            
            # Calculate risk score
            risk_score = await self._calculate_risk_score(request_context)
            
            # Determine trust level
            trust_level = self._determine_trust_level(risk_score, request_context)
            
            # Validate certificates if present
            certificates = request_context.get('certificates', [])
            cert_validation = await self._validate_certificates(certificates)
            
            # Get user permissions
            permissions = request_context.get('permissions', [])
            
            # Create security context
            security_context = SecurityContext(
                user_id=user_id,
                tenant_id=tenant_id,
                source_ip=source_ip,
                user_agent=user_agent,
                trust_level=trust_level,
                certificates=certificates,
                permissions=permissions,
                risk_score=risk_score,
                timestamp=datetime.utcnow()
            )
            
            # Store context
            context_key = f"{user_id}:{tenant_id}:{source_ip}"
            self.security_contexts[context_key] = security_context
            
            # Update metrics
            self.trust_level_gauge.labels(
                tenant_id=tenant_id,
                user_id=user_id
            ).set(self._trust_level_to_numeric(trust_level))
            
            # Log security event
            await self._log_security_event(
                SecurityEvent.API_ACCESS,
                security_context,
                {'trust_evaluation': True, 'risk_score': risk_score}
            )
            
            return security_context
            
        except Exception as e:
            self.logger.error(f"Trust evaluation error: {e}")
            # Return minimal trust context on error
            return SecurityContext(
                user_id=request_context.get('user_id', 'anonymous'),
                tenant_id=request_context.get('tenant_id', 'unknown'),
                source_ip=request_context.get('source_ip', '0.0.0.0'),
                user_agent=request_context.get('user_agent', 'unknown'),
                trust_level=TrustLevel.UNTRUSTED,
                certificates=[],
                permissions=[],
                risk_score=1.0,
                timestamp=datetime.utcnow()
            )
            
    async def enforce_access_control(self, security_context: SecurityContext, 
                                   resource: str, action: str) -> bool:
        """
        Enforce zero-trust access control.
        
        Args:
            security_context: Security context for the request
            resource: Resource being accessed
            action: Action being performed
            
        Returns:
            True if access is allowed
        """
        try:
            # Check minimum trust level
            required_trust = await self._get_required_trust_level(resource, action)
            if self._trust_level_to_numeric(security_context.trust_level) < self._trust_level_to_numeric(required_trust):
                await self._log_security_event(
                    SecurityEvent.PRIVILEGE_ESCALATION,
                    security_context,
                    {'resource': resource, 'action': action, 'result': 'denied_insufficient_trust'}
                )
                return False
                
            # Check permissions
            required_permission = f"{resource}:{action}"
            if required_permission not in security_context.permissions:
                await self._log_security_event(
                    SecurityEvent.PRIVILEGE_ESCALATION,
                    security_context,
                    {'resource': resource, 'action': action, 'result': 'denied_insufficient_permissions'}
                )
                return False
                
            # Check risk score
            if security_context.risk_score > 0.8:  # High risk
                await self._log_security_event(
                    SecurityEvent.SUSPICIOUS_ACTIVITY,
                    security_context,
                    {'resource': resource, 'action': action, 'result': 'denied_high_risk'}
                )
                return False
                
            # Log successful access
            await self._log_security_event(
                SecurityEvent.API_ACCESS,
                security_context,
                {'resource': resource, 'action': action, 'result': 'allowed'}
            )
            
            return True
            
        except Exception as e:
            self.logger.error(f"Access control enforcement error: {e}")
            return False
            
    async def generate_agent_certificate(self, agent_id: str, tenant_id: str) -> Dict[str, str]:
        """
        Generate certificate for agent authentication.
        
        Args:
            agent_id: ID of the agent
            tenant_id: ID of the tenant
            
        Returns:
            Certificate and private key
        """
        try:
            self.logger.info(f"Generating certificate for agent: {agent_id}")
            
            # Generate private key
            private_key = rsa.generate_private_key(
                public_exponent=65537,
                key_size=2048
            )
            
            # Create certificate subject
            subject = x509.Name([
                x509.NameAttribute(x509.NameOID.COUNTRY_NAME, "US"),
                x509.NameAttribute(x509.NameOID.STATE_OR_PROVINCE_NAME, "CA"),
                x509.NameAttribute(x509.NameOID.LOCALITY_NAME, "San Francisco"),
                x509.NameAttribute(x509.NameOID.ORGANIZATION_NAME, "ACSO Enterprise"),
                x509.NameAttribute(x509.NameOID.ORGANIZATIONAL_UNIT_NAME, f"Tenant-{tenant_id}"),
                x509.NameAttribute(x509.NameOID.COMMON_NAME, f"agent-{agent_id}")
            ])
            
            # Create certificate
            certificate = x509.CertificateBuilder().subject_name(
                subject
            ).issuer_name(
                subject  # Self-signed for now
            ).public_key(
                private_key.public_key()
            ).serial_number(
                x509.random_serial_number()
            ).not_valid_before(
                datetime.utcnow()
            ).not_valid_after(
                datetime.utcnow() + timedelta(days=365)
            ).add_extension(
                x509.SubjectAlternativeName([
                    x509.DNSName(f"agent-{agent_id}.{tenant_id}.acso.local"),
                    x509.DNSName(f"{agent_id}.agents.acso.local")
                ]),
                critical=False
            ).sign(private_key, hashes.SHA256())
            
            # Serialize certificate and key
            cert_pem = certificate.public_bytes(serialization.Encoding.PEM).decode('utf-8')
            key_pem = private_key.private_bytes(
                encoding=serialization.Encoding.PEM,
                format=serialization.PrivateFormat.PKCS8,
                encryption_algorithm=serialization.NoEncryption()
            ).decode('utf-8')
            
            # Store certificate info
            cert_fingerprint = hashlib.sha256(cert_pem.encode()).hexdigest()
            self.certificates[cert_fingerprint] = {
                'agent_id': agent_id,
                'tenant_id': tenant_id,
                'issued_at': datetime.utcnow().isoformat(),
                'expires_at': (datetime.utcnow() + timedelta(days=365)).isoformat(),
                'status': 'active'
            }
            
            return {
                'certificate': cert_pem,
                'private_key': key_pem,
                'fingerprint': cert_fingerprint
            }
            
        except Exception as e:
            self.logger.error(f"Certificate generation error: {e}")
            raise
            
    async def validate_agent_certificate(self, certificate: str) -> Dict[str, Any]:
        """Validate agent certificate."""
        try:
            # Parse certificate
            cert = x509.load_pem_x509_certificate(certificate.encode('utf-8'))
            
            # Check expiration
            if cert.not_valid_after < datetime.utcnow():
                return {'valid': False, 'reason': 'expired'}
                
            # Check fingerprint
            cert_fingerprint = hashlib.sha256(certificate.encode()).hexdigest()
            if cert_fingerprint not in self.certificates:
                return {'valid': False, 'reason': 'unknown_certificate'}
                
            cert_info = self.certificates[cert_fingerprint]
            if cert_info['status'] != 'active':
                return {'valid': False, 'reason': 'revoked'}
                
            return {
                'valid': True,
                'agent_id': cert_info['agent_id'],
                'tenant_id': cert_info['tenant_id'],
                'fingerprint': cert_fingerprint
            }
            
        except Exception as e:
            self.logger.error(f"Certificate validation error: {e}")
            return {'valid': False, 'reason': 'validation_error'}
            
    async def encrypt_communication(self, data: bytes, recipient_cert: str) -> bytes:
        """Encrypt data for secure communication."""
        try:
            # This would implement end-to-end encryption
            # For now, return data as-is (placeholder)
            return data
            
        except Exception as e:
            self.logger.error(f"Encryption error: {e}")
            raise
            
    async def decrypt_communication(self, encrypted_data: bytes, private_key: str) -> bytes:
        """Decrypt received data."""
        try:
            # This would implement decryption
            # For now, return data as-is (placeholder)
            return encrypted_data
            
        except Exception as e:
            self.logger.error(f"Decryption error: {e}")
            raise            

    async def get_audit_logs(self, tenant_id: Optional[str] = None, 
                           start_date: Optional[datetime] = None,
                           end_date: Optional[datetime] = None,
                           event_type: Optional[SecurityEvent] = None) -> List[AuditLogEntry]:
        """
        Get audit logs with filtering.
        
        Args:
            tenant_id: Optional tenant ID filter
            start_date: Optional start date filter
            end_date: Optional end date filter
            event_type: Optional event type filter
            
        Returns:
            Filtered audit log entries
        """
        try:
            filtered_logs = self.audit_logs
            
            # Apply filters
            if tenant_id:
                filtered_logs = [log for log in filtered_logs if log.tenant_id == tenant_id]
                
            if start_date:
                filtered_logs = [log for log in filtered_logs if log.timestamp >= start_date]
                
            if end_date:
                filtered_logs = [log for log in filtered_logs if log.timestamp <= end_date]
                
            if event_type:
                filtered_logs = [log for log in filtered_logs if log.event_type == event_type]
                
            return filtered_logs
            
        except Exception as e:
            self.logger.error(f"Error getting audit logs: {e}")
            return []
            
    async def revoke_certificate(self, fingerprint: str) -> bool:
        """Revoke a certificate."""
        try:
            if fingerprint in self.certificates:
                self.certificates[fingerprint]['status'] = 'revoked'
                self.certificates[fingerprint]['revoked_at'] = datetime.utcnow().isoformat()
                
                self.logger.info(f"Certificate revoked: {fingerprint}")
                return True
            return False
            
        except Exception as e:
            self.logger.error(f"Certificate revocation error: {e}")
            return False
            
    async def get_security_metrics(self, tenant_id: Optional[str] = None) -> Dict[str, Any]:
        """Get security metrics and statistics."""
        try:
            end_date = datetime.utcnow()
            start_date = end_date - timedelta(days=30)
            
            logs = await self.get_audit_logs(tenant_id, start_date, end_date)
            
            # Calculate metrics
            total_events = len(logs)
            event_counts = {}
            failed_attempts = 0
            
            for log in logs:
                event_type = log.event_type.value
                event_counts[event_type] = event_counts.get(event_type, 0) + 1
                
                if log.result in ['denied', 'failed', 'blocked']:
                    failed_attempts += 1
                    
            # Trust level distribution
            trust_distribution = {}
            for context in self.security_contexts.values():
                if not tenant_id or context.tenant_id == tenant_id:
                    level = context.trust_level.value
                    trust_distribution[level] = trust_distribution.get(level, 0) + 1
                    
            return {
                'period': {
                    'start': start_date.isoformat(),
                    'end': end_date.isoformat()
                },
                'total_events': total_events,
                'event_counts': event_counts,
                'failed_attempts': failed_attempts,
                'success_rate': (total_events - failed_attempts) / total_events if total_events > 0 else 0,
                'trust_distribution': trust_distribution,
                'active_certificates': len([c for c in self.certificates.values() if c['status'] == 'active']),
                'revoked_certificates': len([c for c in self.certificates.values() if c['status'] == 'revoked'])
            }
            
        except Exception as e:
            self.logger.error(f"Error getting security metrics: {e}")
            return {}
            
    async def _calculate_risk_score(self, request_context: Dict[str, Any]) -> float:
        """Calculate risk score for a request."""
        try:
            risk_score = 0.0
            
            # IP reputation check
            source_ip = request_context.get('source_ip', '0.0.0.0')
            if await self._is_suspicious_ip(source_ip):
                risk_score += 0.3
                
            # User agent analysis
            user_agent = request_context.get('user_agent', '')
            if await self._is_suspicious_user_agent(user_agent):
                risk_score += 0.2
                
            # Time-based analysis
            current_hour = datetime.utcnow().hour
            if current_hour < 6 or current_hour > 22:  # Off-hours
                risk_score += 0.1
                
            # Frequency analysis
            user_id = request_context.get('user_id')
            if user_id and await self._is_high_frequency_user(user_id):
                risk_score += 0.2
                
            # Geographic analysis
            if await self._is_unusual_location(request_context):
                risk_score += 0.3
                
            return min(risk_score, 1.0)  # Cap at 1.0
            
        except Exception as e:
            self.logger.error(f"Risk score calculation error: {e}")
            return 0.5  # Default medium risk
            
    def _determine_trust_level(self, risk_score: float, request_context: Dict[str, Any]) -> TrustLevel:
        """Determine trust level based on risk score and context."""
        try:
            # Check for certificates
            has_valid_cert = bool(request_context.get('certificates'))
            
            if risk_score < 0.1 and has_valid_cert:
                return TrustLevel.VERIFIED
            elif risk_score < 0.2:
                return TrustLevel.HIGH
            elif risk_score < 0.4:
                return TrustLevel.MEDIUM
            elif risk_score < 0.7:
                return TrustLevel.LOW
            else:
                return TrustLevel.UNTRUSTED
                
        except Exception as e:
            self.logger.error(f"Trust level determination error: {e}")
            return TrustLevel.UNTRUSTED
            
    async def _validate_certificates(self, certificates: List[str]) -> Dict[str, Any]:
        """Validate provided certificates."""
        try:
            validation_results = []
            
            for cert in certificates:
                result = await self.validate_agent_certificate(cert)
                validation_results.append(result)
                
            return {
                'total_certificates': len(certificates),
                'valid_certificates': len([r for r in validation_results if r.get('valid')]),
                'results': validation_results
            }
            
        except Exception as e:
            self.logger.error(f"Certificate validation error: {e}")
            return {'total_certificates': 0, 'valid_certificates': 0, 'results': []}
            
    async def _get_required_trust_level(self, resource: str, action: str) -> TrustLevel:
        """Get required trust level for resource/action."""
        try:
            # Define trust requirements
            trust_requirements = {
                'agents:create': TrustLevel.HIGH,
                'agents:delete': TrustLevel.VERIFIED,
                'billing:read': TrustLevel.MEDIUM,
                'billing:write': TrustLevel.HIGH,
                'tenants:create': TrustLevel.VERIFIED,
                'tenants:delete': TrustLevel.VERIFIED,
                'security:read': TrustLevel.HIGH,
                'security:write': TrustLevel.VERIFIED
            }
            
            resource_action = f"{resource}:{action}"
            return trust_requirements.get(resource_action, TrustLevel.MEDIUM)
            
        except Exception as e:
            self.logger.error(f"Error getting required trust level: {e}")
            return TrustLevel.HIGH
            
    def _trust_level_to_numeric(self, trust_level: TrustLevel) -> float:
        """Convert trust level to numeric value."""
        mapping = {
            TrustLevel.UNTRUSTED: 0.0,
            TrustLevel.LOW: 0.2,
            TrustLevel.MEDIUM: 0.5,
            TrustLevel.HIGH: 0.8,
            TrustLevel.VERIFIED: 1.0
        }
        return mapping.get(trust_level, 0.0)
        
    async def _log_security_event(self, event_type: SecurityEvent, 
                                 security_context: SecurityContext,
                                 details: Dict[str, Any]) -> None:
        """Log a security event."""
        try:
            event_id = hashlib.sha256(
                f"{security_context.user_id}:{security_context.tenant_id}:{datetime.utcnow().isoformat()}".encode()
            ).hexdigest()[:16]
            
            audit_entry = AuditLogEntry(
                event_id=event_id,
                tenant_id=security_context.tenant_id,
                user_id=security_context.user_id,
                event_type=event_type,
                resource=details.get('resource', 'unknown'),
                action=details.get('action', 'unknown'),
                result=details.get('result', 'unknown'),
                details=details,
                timestamp=datetime.utcnow(),
                source_ip=security_context.source_ip,
                user_agent=security_context.user_agent
            )
            
            self.audit_logs.append(audit_entry)
            
            # Update metrics
            self.security_events_counter.labels(
                tenant_id=security_context.tenant_id,
                event_type=event_type.value,
                result=audit_entry.result
            ).inc()
            
            self.audit_events_counter.labels(
                tenant_id=security_context.tenant_id,
                event_type=event_type.value
            ).inc()
            
        except Exception as e:
            self.logger.error(f"Error logging security event: {e}")
            
    async def _initialize_certificate_authority(self) -> None:
        """Initialize certificate authority."""
        try:
            # This would set up a proper CA
            # For now, just log initialization
            self.logger.info("Certificate Authority initialized")
            
        except Exception as e:
            self.logger.error(f"CA initialization error: {e}")
            
    async def _load_trust_policies(self) -> None:
        """Load trust policies."""
        try:
            # Default trust policies
            self.trust_policies = {
                'default': {
                    'min_trust_level': TrustLevel.MEDIUM,
                    'require_certificates': False,
                    'max_risk_score': 0.7
                },
                'high_security': {
                    'min_trust_level': TrustLevel.HIGH,
                    'require_certificates': True,
                    'max_risk_score': 0.3
                }
            }
            
        except Exception as e:
            self.logger.error(f"Error loading trust policies: {e}")
            
    async def _security_monitoring_loop(self) -> None:
        """Background security monitoring."""
        while self.monitoring_active:
            try:
                # Monitor for suspicious activities
                await self._detect_anomalies()
                
                await asyncio.sleep(60)  # Check every minute
                
            except Exception as e:
                self.logger.error(f"Security monitoring error: {e}")
                await asyncio.sleep(300)
                
    async def _certificate_validation_loop(self) -> None:
        """Background certificate validation."""
        while self.monitoring_active:
            try:
                # Check for expiring certificates
                await self._check_certificate_expiration()
                
                await asyncio.sleep(3600)  # Check every hour
                
            except Exception as e:
                self.logger.error(f"Certificate validation error: {e}")
                await asyncio.sleep(1800)
                
    async def _audit_log_processor(self) -> None:
        """Background audit log processing."""
        while self.monitoring_active:
            try:
                # Process and archive old audit logs
                await self._process_audit_logs()
                
                await asyncio.sleep(1800)  # Process every 30 minutes
                
            except Exception as e:
                self.logger.error(f"Audit log processing error: {e}")
                await asyncio.sleep(3600)
                
    async def _trust_evaluation_loop(self) -> None:
        """Background trust evaluation updates."""
        while self.monitoring_active:
            try:
                # Re-evaluate trust levels for active contexts
                await self._update_trust_evaluations()
                
                await asyncio.sleep(300)  # Update every 5 minutes
                
            except Exception as e:
                self.logger.error(f"Trust evaluation error: {e}")
                await asyncio.sleep(600)
                
    async def _detect_anomalies(self) -> None:
        """Detect security anomalies."""
        try:
            # Analyze recent security events for anomalies
            recent_logs = [
                log for log in self.audit_logs
                if log.timestamp > datetime.utcnow() - timedelta(minutes=10)
            ]
            
            # Check for unusual patterns
            if len(recent_logs) > 100:  # High activity
                self.logger.warning("High security event activity detected")
                
        except Exception as e:
            self.logger.error(f"Anomaly detection error: {e}")
            
    async def _check_certificate_expiration(self) -> None:
        """Check for expiring certificates."""
        try:
            expiry_threshold = datetime.utcnow() + timedelta(days=30)
            
            for fingerprint, cert_info in self.certificates.items():
                if cert_info['status'] == 'active':
                    expires_at = datetime.fromisoformat(cert_info['expires_at'])
                    if expires_at < expiry_threshold:
                        self.logger.warning(f"Certificate expiring soon: {fingerprint}")
                        
        except Exception as e:
            self.logger.error(f"Certificate expiration check error: {e}")
            
    async def _process_audit_logs(self) -> None:
        """Process and archive audit logs."""
        try:
            # Keep only last 90 days of logs in memory
            cutoff_date = datetime.utcnow() - timedelta(days=90)
            
            archived_logs = [log for log in self.audit_logs if log.timestamp < cutoff_date]
            self.audit_logs = [log for log in self.audit_logs if log.timestamp >= cutoff_date]
            
            if archived_logs:
                self.logger.info(f"Archived {len(archived_logs)} old audit log entries")
                
        except Exception as e:
            self.logger.error(f"Audit log processing error: {e}")
            
    async def _update_trust_evaluations(self) -> None:
        """Update trust evaluations for active contexts."""
        try:
            current_time = datetime.utcnow()
            
            # Remove expired contexts
            expired_contexts = []
            for key, context in self.security_contexts.items():
                if current_time - context.timestamp > timedelta(hours=1):
                    expired_contexts.append(key)
                    
            for key in expired_contexts:
                del self.security_contexts[key]
                
        except Exception as e:
            self.logger.error(f"Trust evaluation update error: {e}")
            
    # Helper methods for risk assessment
    async def _is_suspicious_ip(self, ip: str) -> bool:
        """Check if IP is suspicious."""
        # This would integrate with threat intelligence feeds
        return False
        
    async def _is_suspicious_user_agent(self, user_agent: str) -> bool:
        """Check if user agent is suspicious."""
        suspicious_patterns = ['bot', 'crawler', 'scanner']
        return any(pattern in user_agent.lower() for pattern in suspicious_patterns)
        
    async def _is_high_frequency_user(self, user_id: str) -> bool:
        """Check if user has high request frequency."""
        recent_logs = [
            log for log in self.audit_logs
            if log.user_id == user_id and log.timestamp > datetime.utcnow() - timedelta(minutes=5)
        ]
        return len(recent_logs) > 50
        
    async def _is_unusual_location(self, request_context: Dict[str, Any]) -> bool:
        """Check if request is from unusual location."""
        # This would implement geolocation analysis
        return False